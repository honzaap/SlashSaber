import { ObstaclePlacement } from "./game/enums/ObstaclePlacement";
import { SliceDirection } from "./game/enums/SliceDirection";

export const GUI_ENABLED = false;

export const BLOOM_LAYER = 2;

export const ROOM_TRANSITION_ASSET = "room_transition.glb";

export const EVENTS = {
    load: "onAfterLoad",
    start: "onAfterStart",
    halt: "onAfterHalt",
    hit: "onAfterHit",
    settingsChanged: "onAfterSettingsChanged",
};

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
    {
        asset: "bamboo_protectedT_left_3.glb",
        placement: ObstaclePlacement.LEFT,
        sliceDirection: SliceDirection.TOP,
    },
    {
        asset: "bamboo_protectedT_right_3.glb",
        placement: ObstaclePlacement.RIGHT,
        sliceDirection: SliceDirection.TOP,
    },
    {
        asset: "bamboo_protectedL_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.LEFT,
    },
    {
        asset: "bamboo_protectedL_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.LEFT,
    },
    {
        asset: "bamboo_protectedR_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.RIGHT,
    },
    {
        asset: "bamboo_protectedR_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.RIGHT,
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
            asset: "floor_2.glb",
            maxNumber: 10,
            offset: 0,
        },
        {
            asset: "right_wall_2.glb",
            maxNumber: 7,
            offset: 0,
        },
        {
            asset: "left_wall_2.glb",
            maxNumber: 7,
            offset: -0.05,
        },
        {
            asset: "roof_2.glb",
            maxNumber: 19,
            offset: 0,
        },
        {
            asset: "lamp_2.glb",
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