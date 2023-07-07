import { ObstaclePlacement } from "./game/enums/ObstaclePlacement";

export const GUI_ENABLED = true;

export const BLOOM_LAYER = 2;

export const ROOM_TRANSITION_ASSET = "room_transition.glb";


export const OBSTACLE_TEMPLTES = [
    {
        asset: "bamboo_mid_1.glb",
        placement: ObstaclePlacement.BOTTOM,
    },
    {
        asset: "bamboo_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
    },
    {
        asset: "bamboo_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
    },
    {
        asset: "bamboo_mid_7.glb",
        placement: ObstaclePlacement.BOTTOM,
    },
    {
        asset: "bamboo_right_3.glb",
        placement: ObstaclePlacement.RIGHT,
    },
    {
        asset: "bamboo_left_3.glb",
        placement: ObstaclePlacement.LEFT,
    },
];

// TODO : add cast/receive shadow prop
export const ENVIRONMENT_SET_TEMPLATES = [
    [
        {
            asset: "floor.glb",
            maxNumber: 10,
            offset: 0,
        },
        {
            asset: "right_wall.glb",
            maxNumber: 7,
            offset: 0,
        },
        {
            asset: "left_wall.glb",
            maxNumber: 7,
            offset: -0.05,
        },
        {
            asset: "roof.glb",
            maxNumber: 19,
            offset: 0,
        },
        {
            asset: "wall_upper.glb",
            maxNumber: 7,
            offset: 0,
        },
        {
            asset: "lamp.glb",
            maxNumber: 10,
            offset: 7,
            spawnLight: true,
        },
    ],
    [
        {
            asset: "floor_test.glb",
            maxNumber: 10,
            offset: 0,
        },
        {
            asset: "right_wall_test.glb",
            maxNumber: 7,
            offset: 0,
        },
        {
            asset: "left_wall_test.glb",
            maxNumber: 7,
            offset: -0.05,
        },
        {
            asset: "roof.glb",
            maxNumber: 20,
            offset: 0,
        },
        {
            asset: "wall_upper_test.glb",
            maxNumber: 7,
            offset: 0,
        },
        {
            asset: "lamp_test.glb",
            maxNumber: 10,
            offset: 7,
            spawnLight: true,
        },
    ],
];

// Shaders

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