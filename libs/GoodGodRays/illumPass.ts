import { Pass, Resizable } from 'postprocessing';
import * as THREE from 'three';

import { getBlueNoiseTexture } from './bluenoise';
//import GodraysFragmentShader from './godrays.frag';
//import GodraysVertexShader from './godrays.vert';
import type { GodraysPassParams } from './index';

export const GODRAYS_RESOLUTION_SCALE = 1 / 2;


const GodraysFragmentShader = `
varying vec2 vUv;

uniform sampler2D sceneDepth;
uniform sampler2D blueNoise;
uniform vec3 lightPos;
uniform vec3 cameraPos;
uniform vec2 resolution;
uniform mat4 lightCameraProjectionMatrix;
uniform mat4 lightCameraMatrixWorldInverse;
uniform mat4 cameraProjectionMatrixInv;
uniform mat4 cameraMatrixWorld;
uniform sampler2D shadowMap;
uniform vec2 noiseResolution;
uniform float mapSize;
uniform float lightCameraNear;
uniform float lightCameraFar;
uniform float density;
uniform float maxDensity;
uniform float distanceAttenuation;
uniform vec3[6] fNormals;
uniform float[6] fConstants;
uniform float raymarchSteps;

#include <packing>

vec3 WorldPosFromDepth(float depth, vec2 coord) {
  float z = depth * 2.0 - 1.0;
  vec4 clipSpacePosition = vec4(coord * 2.0 - 1.0, z, 1.0);
  vec4 viewSpacePosition = cameraProjectionMatrixInv * clipSpacePosition;
  // Perspective division
  viewSpacePosition /= viewSpacePosition.w;
  vec4 worldSpacePosition = cameraMatrixWorld * viewSpacePosition;
  return worldSpacePosition.xyz;
}

float linearize_depth(float d,float zNear,float zFar) {
  return zNear * zFar / (zFar + d * (zNear - zFar));
}

/**
 * Converts angle between light and a world position to a coordinate
 * in a point light cube shadow map
 */
vec2 cubeToUV( vec3 v, float texelSizeY ) {
  // Number of texels to avoid at the edge of each square
  vec3 absV = abs( v );
  // Intersect unit cube
  float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
  absV *= scaleToCube;
  // Apply scale to avoid seams
  // two texels less per square (one texel will do for NEAREST)
  v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
  // Unwrap
  // space: -1 ... 1 range for each square
  //
  // #X##        dim    := ( 4 , 2 )
  //  # #        center := ( 1 , 1 )
  vec2 planar = v.xy;
  float almostATexel = 1.5 * texelSizeY;
  float almostOne = 1.0 - almostATexel;
  if ( absV.z >= almostOne ) {
    if ( v.z > 0.0 )
      planar.x = 4.0 - v.x;
  } else if ( absV.x >= almostOne ) {
    float signX = sign( v.x );
    planar.x = v.z * signX + 2.0 * signX;
  } else if ( absV.y >= almostOne ) {
    float signY = sign( v.y );
    planar.x = v.x + 2.0 * signY + 2.0;
    planar.y = v.z * signY - 2.0;
  }
  // Transform to UV space
  // scale := 0.5 / dim
  // translate := ( center + 0.5 ) / dim
  return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
}

vec3 projectToShadowMap(vec3 worldPos) {
  vec4 lightSpacePos = lightCameraProjectionMatrix * lightCameraMatrixWorldInverse * vec4(worldPos, 1.0);
  lightSpacePos /= lightSpacePos.w;
  lightSpacePos = lightSpacePos * 0.5 + 0.5;
  return lightSpacePos.xyz;
}

vec2 inShadow(vec3 worldPos) {
  #if defined(IS_POINT_LIGHT)
    float texelSizeY = 1.0 / (mapSize * 2.0);
    vec2 shadowMapUV = cubeToUV(normalize(worldPos - lightPos), texelSizeY);
  #elif defined(IS_DIRECTIONAL_LIGHT)
    vec3 shadowMapUV = projectToShadowMap(worldPos);
    if (shadowMapUV.x < 0.0 || shadowMapUV.x > 1.0 || shadowMapUV.y < 0.0 || shadowMapUV.y > 1.0 || shadowMapUV.z < 0.0 || shadowMapUV.z > 1.0) {
      return vec2(1.0, 0.0);
    }
  #endif

  vec4 packedDepth = texture2D(shadowMap, shadowMapUV.xy);
  float depth = unpackRGBAToDepth(packedDepth);
  depth = lightCameraNear + (lightCameraFar - lightCameraNear) * depth;
  #if defined(IS_POINT_LIGHT)
    float lightDist = distance(worldPos, lightPos);
  #elif defined(IS_DIRECTIONAL_LIGHT)
    float lightDist = (lightCameraNear + (lightCameraFar - lightCameraNear) * shadowMapUV.z);
  #endif
  #if defined(IS_POINT_LIGHT)
      float difference = lightDist - depth;
  #elif defined(IS_DIRECTIONAL_LIGHT)
      float difference = lightDist - depth;
  #endif
  return vec2(float(difference > 0.0), lightDist);
}

float sdPlane(vec3 p, vec3 n, float h) {
  // n must be normalized
  return dot(p, n) + h;
}

void main() {
  float depth = texture2D(sceneDepth, vUv).x;

  vec3 worldPos = WorldPosFromDepth(depth, vUv);
  // vec2 tempUV = projectToShadowMap(worldPos);
  // if (tempUV.x < 0.0 || tempUV.x > 1.0 || tempUV.y < 0.0 || tempUV.y > 1.0) {
  //   gl_FragColor = vec4(0.0);
  //   return;
  // }
  // gl_FragColor = vec4(tempUV, 0.0, 1.0);
  // return;
  float inBoxDist = -10000.0;
  for (int i = 0; i < 6; i++) {
    inBoxDist = max(inBoxDist, sdPlane(cameraPos, fNormals[i], fConstants[i]));
  }
  bool inBox = false;
  if (inBoxDist < 0.0) {
    inBox = true;
  }
  vec3 startPos = cameraPos;
  if (inBox) {
    for(int i = 0; i < 6; i++) {
      if (sdPlane(worldPos, fNormals[i], fConstants[i]) > 0.0) {
        vec3 direction = normalize(worldPos - cameraPos);
        float denom = dot(fNormals[i], direction);
        float t = -(dot(cameraPos, fNormals[i]) + fConstants[i]) / denom;
        worldPos = cameraPos + t * direction;
      }
    }
  } else {
    vec3 direction = normalize(worldPos - cameraPos);
    float minT = 10000.0;
    for (int i = 0; i < 6; i++) {
      float denom = dot(fNormals[i], direction);
      float t = -(dot(cameraPos, fNormals[i]) + fConstants[i]) / denom;
      if (t < minT && t > 0.0) {
        minT = t;
      }
    }
    if (minT == 10000.0) {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      return;
    } else {
      startPos = cameraPos + (minT + 0.001) * direction;
    }
    float endInBoxDist = -10000.0;
    for (int i = 0; i < 6; i++) {
      endInBoxDist = max(endInBoxDist, sdPlane(worldPos, fNormals[i], fConstants[i]));
    }
    bool endInBox = false;
    if (endInBoxDist < 0.0) {
      endInBox = true;
    }
    if (!endInBox) {
      float minT = 10000.0;
      for (int i = 0; i < 6; i++) {
        if (sdPlane(worldPos, fNormals[i], fConstants[i]) > 0.0) {
          float denom = dot(fNormals[i], direction);
          float t = -(dot(startPos, fNormals[i]) + fConstants[i]) / denom;
          if (t < minT && t > 0.0) {
            minT = t;
          }
        }
      }

      if (minT < distance(worldPos, startPos)) {
        worldPos = startPos + minT * direction;
      }
    }
  }
  float illum = 0.0;

  vec4 blueNoiseSample = texture2D(blueNoise, vUv * (resolution / noiseResolution));
  // int samples = int(round(raymarchSteps + 8. * blueNoiseSample.x));
  float samplesFloat = round(raymarchSteps + ((raymarchSteps / 8.) + 2.) * blueNoiseSample.x);
  int samples = int(samplesFloat);
  for (int i = 0; i < samples; i++) {
    vec3 samplePos = mix(startPos, worldPos, float(i) / samplesFloat);
    vec2 shadowInfo = inShadow(samplePos);
    float shadowAmount = (1.0 - shadowInfo.x);
    illum += shadowAmount * (distance(startPos, worldPos) * density) * pow(1.0 - shadowInfo.y / lightCameraFar, distanceAttenuation);// * exp(-distanceAttenuation * shadowInfo.y);
  }
  illum /= samplesFloat;
  gl_FragColor = vec4(vec3(clamp((1.0 - exp(-illum)), 0.0, maxDensity)), depth);
}`;

const GodraysVertexShader = `
varying vec2 vUv;

void main() {
	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;


interface GodRaysDefines {
  IS_POINT_LIGHT?: string;
  IS_DIRECTIONAL_LIGHT?: string;
}

class GodraysMaterial extends THREE.ShaderMaterial {
  constructor(light: THREE.PointLight | THREE.DirectionalLight) {
    const uniforms = {
      density: { value: 1 / 128 },
      maxDensity: { value: 0.5 },
      distanceAttenuation: { value: 2 },
      sceneDepth: { value: null },
      lightPos: { value: new THREE.Vector3(0, 0, 0) },
      cameraPos: { value: new THREE.Vector3(0, 0, 0) },
      resolution: { value: new THREE.Vector2(1, 1) },
      lightCameraProjectionMatrix: { value: new THREE.Matrix4() },
      lightCameraMatrixWorldInverse: { value: new THREE.Matrix4() },
      cameraProjectionMatrixInv: { value: new THREE.Matrix4() },
      cameraMatrixWorld: { value: new THREE.Matrix4() },
      shadowMap: { value: null },
      mapSize: { value: 1 },
      lightCameraNear: { value: 0.1 },
      lightCameraFar: { value: 1000 },
      blueNoise: { value: null as THREE.Texture | null },
      noiseResolution: { value: new THREE.Vector2(1, 1) },
      fNormals: { value: [] },
      fConstants: { value: [] },
      raymarchSteps: { value: 60 },
    };

    const defines: GodRaysDefines = {};
    if (light instanceof THREE.PointLight || (light as any).isPointLight) {
      defines.IS_POINT_LIGHT = '';
    } else if (light instanceof THREE.DirectionalLight || (light as any).isDirectionalLight) {
      defines.IS_DIRECTIONAL_LIGHT = '';
    }

    super({
      name: 'GodraysMaterial',
      uniforms,
      fragmentShader: GodraysFragmentShader,
      vertexShader: GodraysVertexShader,
      defines,
    });

    getBlueNoiseTexture().then(blueNoiseTexture => {
      uniforms.blueNoise.value = blueNoiseTexture;
      uniforms.noiseResolution.value.set(
        blueNoiseTexture.image.width,
        blueNoiseTexture.image.height
      );
    });
  }
}

export interface GodraysIllumPassProps {
  light: THREE.PointLight | THREE.DirectionalLight;
  camera: THREE.Camera;
}

export class GodraysIllumPass extends Pass implements Resizable {
  private material: GodraysMaterial;
  private shadowMapSet = false;
  private props: GodraysIllumPassProps;
  private lastParams: GodraysPassParams;
  private lightWorldPos = new THREE.Vector3();

  constructor(props: GodraysIllumPassProps, params: GodraysPassParams) {
    super('GodraysPass');

    this.props = props;
    this.lastParams = params;
    this.material = new GodraysMaterial(props.light);

    this.updateUniforms(props, params);

    this.fullscreenMaterial = this.material;
  }

  override setSize(width: number, height: number): void {
    this.material.uniforms.resolution.value.set(
      Math.ceil(width * GODRAYS_RESOLUTION_SCALE),
      Math.ceil(height * GODRAYS_RESOLUTION_SCALE)
    );
  }

  override render(
    renderer: THREE.WebGLRenderer,
    _inputBuffer: THREE.WebGLRenderTarget,
    outputBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number | undefined,
    _stencilTest?: boolean | undefined
  ): void {
    if (!this.shadowMapSet && this.props.light.shadow.map?.texture) {
      this.updateUniforms(this.props, this.lastParams);
      this.shadowMapSet = true;
    }
    this.updateLightPosition(this.props);
    renderer.setRenderTarget(outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  override setDepthTexture(
    depthTexture: THREE.Texture,
    depthPacking?: THREE.DepthPackingStrategies | undefined
  ): void {
    this.material.uniforms.sceneDepth.value = depthTexture;
    if (depthPacking && depthPacking !== THREE.BasicDepthPacking) {
      throw new Error('Only BasicDepthPacking is supported');
    }
  }

  private updateLightPosition({ light }: GodraysIllumPassProps) {
    light.getWorldPosition(this.lightWorldPos);
  }

  public updateUniforms({ light, camera }: GodraysIllumPassProps, params: GodraysPassParams): void {
    const shadow = light.shadow;
    if (!shadow) {
      throw new Error('Light used for godrays must have shadow');
    }

    const shadowMap = shadow.map?.texture ?? null;
    const mapSize = shadow.map?.height ?? 1;

    const uniforms = this.material.uniforms;
    uniforms.density.value = params.density;
    uniforms.maxDensity.value = params.maxDensity;
    uniforms.lightPos.value = this.lightWorldPos;
    uniforms.cameraPos.value = camera.position;
    uniforms.lightCameraProjectionMatrix.value = light.shadow.camera.projectionMatrix;
    uniforms.lightCameraMatrixWorldInverse.value = light.shadow.camera.matrixWorldInverse;
    uniforms.cameraProjectionMatrixInv.value = camera.projectionMatrixInverse;
    uniforms.cameraMatrixWorld.value = camera.matrixWorld;
    uniforms.shadowMap.value = shadowMap;
    uniforms.mapSize.value = mapSize;
    uniforms.lightCameraNear.value = shadow?.camera.near ?? 0.1;
    uniforms.lightCameraFar.value = shadow?.camera.far ?? 1000;
    uniforms.density.value = params.density;
    uniforms.maxDensity.value = params.maxDensity;
    uniforms.distanceAttenuation.value = params.distanceAttenuation;
    uniforms.raymarchSteps.value = params.raymarchSteps;

    if (light instanceof THREE.PointLight || (light as any).isPointLight) {
      const planes:any[] = [];
      const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
      ];
      for (const direction of directions) {
        planes.push(
          new THREE.Plane().setFromNormalAndCoplanarPoint(
            direction,
            light.position
              .clone()
              .add(direction.clone().multiplyScalar(uniforms.lightCameraFar.value))
          )
        );
      }
      uniforms.fNormals.value = planes.map(x => x.normal.clone());
      uniforms.fConstants.value = planes.map(x => x.constant);
    } else if (light instanceof THREE.DirectionalLight || (light as any).isDirectionalLight) {
      const frustum = new THREE.Frustum();
      frustum.setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          light.shadow.camera.projectionMatrix,
          light.shadow.camera.matrixWorldInverse
        )
      );
      uniforms.fNormals.value = frustum.planes.map(x => x.normal.clone().multiplyScalar(-1));
      uniforms.fConstants.value = frustum.planes.map(x => x.constant * -1);
    }
  }
}
