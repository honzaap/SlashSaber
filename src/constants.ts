import { ObstaclePlacement } from "./game/enums/ObstaclePlacement";
import { Rarity } from "./game/enums/Rarity";
import { SliceDirection } from "./game/enums/SliceDirection";

export const GUI_ENABLED = false;

export const BLOOM_LAYER = 2;

export const ROOM_TRANSITION_ASSETS = ["room_transition.glb", "room_transition_2.glb"];

export const EVENTS = {
    load: "onAfterLoad",
    ready: "onAfterReady",
    start: "onAfterStart",
    halt: "onAfterHalt",
    hit: "onAfterHit",
    died: "onAfterDeath",
    settingsChanged: "onAfterSettingsChanged",
    swordChanged: "onAfterSwordChanged",
};

export const SPARK_ASSET = "spark_texture.png";

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
        rarity: Rarity.RARE,
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
        rarity: Rarity.UNCOMMON,
    },
    {
        asset: "bamboo_protectedT_right_3.glb",
        placement: ObstaclePlacement.RIGHT,
        sliceDirection: SliceDirection.TOP,
        rarity: Rarity.UNCOMMON,
    },
    {
        asset: "bamboo_protectedL_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.LEFT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedL_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.LEFT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedR_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.RIGHT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedR_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.RIGHT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedT_left_3.glb",
        placement: ObstaclePlacement.LEFT,
        sliceDirection: SliceDirection.TOP,
        rarity: Rarity.UNCOMMON,
    },
    {
        asset: "bamboo_protectedT_right_3.glb",
        placement: ObstaclePlacement.RIGHT,
        sliceDirection: SliceDirection.TOP,
        rarity: Rarity.UNCOMMON,
    },
    {
        asset: "bamboo_protectedL_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.LEFT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedL_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.LEFT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedR_mid_3.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.RIGHT,
        rarity: Rarity.RARE,
    },
    {
        asset: "bamboo_protectedR_mid_5.glb",
        placement: ObstaclePlacement.BOTTOM,
        sliceDirection : SliceDirection.RIGHT,
        rarity: Rarity.RARE,
    },
];

export const ENVIRONMENT_SET_TEMPLATES = [
    {
        assets: [
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
    },
    {
        assets: [
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
    },
    {
        assets: [
            {
                asset: "floor_3.glb",
                maxNumber: 10,
                offset: 0,
            },
            {
                asset: "right_wall_3.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "left_wall_3.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "wall_upper_3.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "roof_3.glb",
                maxNumber: 19,
                offset: 0,
                spawnLight: true,
            },
        ],
        transition: 1,
        notInitial: true,
    }
];

export const SWORD_PRESETS = [
    {
        name: "Default",
        color1: "rgb(157, 208, 227)",
        color2: "rgb(207, 221, 227)",
    },
    {
        name: "Thunder",
        color1: "#E6B748", 
        color2: "#76EEF5",
    },
    {
        name: "Beast",
        color1: "#84DBF2",
        color2: "#F0F5F5",
        hideGuard: true,
    },
    {
        name: "Mist",
        color1: "rgb(167, 219, 215)",
        color2: "rgb(121, 165, 181)",
    },
    {
        name: "Water",
        color1: "#26C1FC",
        color2: "#A6F6F8",
    },
    {
        name: "Flame",
        color1: "#EB502D",
        color2: "#FDEA00",
    },
    {
        name: "Wind",
        color1: "#9ACA9E",
        color2: "#FFFFFF",
    },
    
    {
        name: "Love",
        color1: "#E15A9A",
        color2: "#89CFFF",
    },
    {
        name: "Insect",
        color1: "#E99B97",
        color2: "#8D60D5",
    },/*
    {
        name: "Serpent",
        color1: "#2BA086",
        color2: "#F5E061",
    },
   
    {
        name: "Demon",
        color1: "#b04fff",
        color2: "#08d18e",
    },*/
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