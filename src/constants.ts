import { ObstaclePlacement } from "./game/enums/ObstaclePlacement";
import { Rarity } from "./game/enums/Rarity";
import { SliceDirection } from "./game/enums/SliceDirection";

export const ROOM_TRANSITION_ASSETS = ["room_transition.glb", "room_transition_2.glb"];

export const SPARK_ASSET = "spark_texture.png";

// Do not ask me under any circumstances why is this image the envmap for the blade
export const ENVMAP_ASSET = "./assets/blade_envmap.jpeg";

export const EVENTS = {
    load: "onAfterLoad",
    ready: "onAfterReady",
    start: "onAfterStart",
    halt: "onAfterHalt",
    hit: "onAfterHit",
    died: "onAfterDeath",
    settingsChanged: "onAfterSettingsChanged",
    swordChanged: "onAfterSwordChanged",
    addScore: "onAddScore",
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
                asset: "set_1_floor.glb",
                maxNumber: 10,
                offset: 0,
            },
            {
                asset: "set_1_wall_R.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "set_1_wall_L.glb",
                maxNumber: 7,
                offset: -0.05,
            },
            {
                asset: "set_1_roof.glb",
                maxNumber: 19,
                offset: 0,
            },
            {
                asset: "set_1_wall_U.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "set_1_lamp.glb",
                maxNumber: 10,
                offset: 7,
                spawnLight: true,
            },
        ],
    },
    {
        assets: [
            {
                asset: "set_2_floor.glb",
                maxNumber: 10,
                offset: 0,
            },
            {
                asset: "set_2_wall_R.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "set_2_wall_L.glb",
                maxNumber: 7,
                offset: -0.05,
            },
            {
                asset: "set_2_roof.glb",
                maxNumber: 19,
                offset: 0,
            },
            {
                asset: "set_2_lamp.glb",
                maxNumber: 10,
                offset: 7,
                spawnLight: true,
            },
        ],
    },
    {
        assets: [
            {
                asset: "set_3_floor.glb",
                maxNumber: 10,
                offset: 0,
            },
            {
                asset: "set_3_wall_R.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "set_3_wall_L.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "set_3_wall_U.glb",
                maxNumber: 7,
                offset: 0,
            },
            {
                asset: "set_3_roof.glb",
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