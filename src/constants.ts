export const FLOOR_ASSET = "floor.glb";

export const RIGHT_WALL_ASSET = "right_wall.glb";

export const LEFT_WALL_ASSET = "left_wall.glb";

export const ROOF_ASSET = "roof.glb";

export const UPPER_WALL_ASSET = "wall_upper.glb";

export const LAMP_ASSET = "lamp.glb";

export const MIX_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

export const MIX_FRAGMENT_SHADER = `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
}
`;

export const BLOOM_LAYER = 2;