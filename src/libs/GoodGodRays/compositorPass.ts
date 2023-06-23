import { Pass, Resizable } from 'postprocessing';
import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';

//import GodraysCompositorFragmentShader from './compositor.frag';
//import GodraysCompositorVertexShader from './compositor.vert';
import type { GodraysPassParams } from './index';

const GodraysCompositorFragmentShader = `
#include <common>

uniform sampler2D godrays;
uniform sampler2D sceneDiffuse;
uniform sampler2D sceneDepth;
uniform float edgeStrength;
uniform float edgeRadius;
uniform vec2 resolution;
uniform float near;
uniform float far;
uniform vec3 color;
varying vec2 vUv;

#define DITHERING
#include <dithering_pars_fragment>

float linearize_depth (float d, float zNear, float zFar) {
  return zNear * zFar / (zFar + d * (zNear - zFar));
}

void main() {
  float rawDepth = texture2D(sceneDepth, vUv).x;
  float correctDepth = linearize_depth(rawDepth, near, far);

  vec2 pushDir = vec2(0.0);
  float count = 0.0;
  for (float x = -edgeRadius; x <= edgeRadius; x++) {
    for (float y = -edgeRadius; y <= edgeRadius; y++) {
      vec2 sampleUv = (vUv * resolution + vec2(x, y)) / resolution;
      // float sampleDepth = linearize_depth(texture2D(sceneDepth, sampleUv).x, near, far);
      float sampleDepth = texelFetch(sceneDepth, ivec2(sampleUv * resolution), 0).x;
      sampleDepth = linearize_depth(sampleDepth, near, far);
      if (abs(sampleDepth - correctDepth) < 0.05 * correctDepth) {
        pushDir += vec2(x, y);
        count += 1.0;
      }
    }
  }

  if (count == 0.0) {
    count = 1.0;
  }

  pushDir /= count;
  pushDir = normalize(pushDir);
  vec2 sampleUv = length(pushDir) > 0.0 ? vUv + edgeStrength * (pushDir / resolution) : vUv;
  float bestChoice = texture2D(godrays, sampleUv).x;

  vec3 diffuse = texture2D(sceneDiffuse, vUv).rgb;
  gl_FragColor = vec4(mix(diffuse, color, bestChoice), 1.0);

  #include <dithering_fragment>
}

`;

const GodraysCompositorVertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

interface GodraysCompositorMaterialProps {
  godrays: THREE.Texture;
  edgeStrength: number;
  edgeRadius: number;
  color: THREE.Color;
  camera: THREE.PerspectiveCamera;
}

export class GodraysCompositorMaterial extends THREE.ShaderMaterial implements Resizable {
  constructor({
    godrays,
    edgeStrength,
    edgeRadius,
    color,
    camera,
  }: GodraysCompositorMaterialProps) {
    const uniforms = {
      godrays: { value: godrays },
      sceneDiffuse: { value: null },
      sceneDepth: { value: null },
      edgeStrength: { value: edgeStrength },
      edgeRadius: { value: edgeRadius },
      near: { value: 0.1 },
      far: { value: 1000.0 },
      color: { value: color },
      resolution: { value: new THREE.Vector2(1, 1) },
    };

    super({
      name: 'GodraysCompositorMaterial',
      uniforms,
      depthWrite: false,
      depthTest: false,
      fragmentShader: GodraysCompositorFragmentShader,
      vertexShader: GodraysCompositorVertexShader,
    });

    this.updateUniforms(edgeStrength, edgeRadius, color, camera.near, camera.far);
  }

  public updateUniforms(
    edgeStrength: number,
    edgeRadius: number,
    color: THREE.Color,
    near: number,
    far: number
  ): void {
    this.uniforms.edgeStrength.value = edgeStrength;
    this.uniforms.edgeRadius.value = edgeRadius;
    this.uniforms.color.value = color;
    this.uniforms.near.value = near;
    this.uniforms.far.value = far;
  }

  setSize(width: number, height: number): void {
    this.uniforms.resolution.value.set(width, height);
  }
}

export class GodraysCompositorPass extends Pass {
  sceneCamera: PerspectiveCamera;
  constructor(props: GodraysCompositorMaterialProps) {
    super('GodraysCompositorPass');
    this.fullscreenMaterial = new GodraysCompositorMaterial(props);
    this.sceneCamera = props.camera;
  }

  public updateUniforms(params: GodraysPassParams): void {
    (this.fullscreenMaterial as GodraysCompositorMaterial).updateUniforms(
      params.edgeStrength,
      params.edgeRadius,
      params.color,
      this.sceneCamera.near,
      this.sceneCamera.far
    );
  }

  override render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    outputBuffer: THREE.WebGLRenderTarget | null,
    _deltaTime?: number | undefined,
    _stencilTest?: boolean | undefined
  ): void {
    (this.fullscreenMaterial as GodraysCompositorMaterial).uniforms.sceneDiffuse.value =
      inputBuffer.texture;
    renderer.setRenderTarget(outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  override setDepthTexture(
    depthTexture: THREE.Texture,
    depthPacking?: THREE.DepthPackingStrategies | undefined
  ): void {
    if (depthPacking && depthPacking !== THREE.BasicDepthPacking) {
      throw new Error('Only BasicDepthPacking is supported');
    }
    (this.fullscreenMaterial as GodraysCompositorMaterial).uniforms.sceneDepth.value = depthTexture;
  }

  override setSize(width: number, height: number): void {
    (this.fullscreenMaterial as GodraysCompositorMaterial).setSize(width, height);
  }
}
