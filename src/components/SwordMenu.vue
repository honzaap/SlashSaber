<template>
    <h2>Your sword</h2>
    <div class="menu-container">
        <v-card class="sword-menu">
            <v-tabs :show-arrows="false" :hide-slider="true" v-model="tab" bg-color="#fff" color="#70A480" :grow="true" selected-class="tab-active">
                <v-tab size="large" variant="flat" value="sets">Sets</v-tab>
                <v-tab size="large" variant="flat" value="blade">Blade</v-tab>
                <v-tab size="large" variant="flat" value="guard">Guard</v-tab>
                <v-tab size="large" variant="flat" value="hilt">Hilt</v-tab>
            </v-tabs>
            <v-card-text>
                <v-window v-model="tab">
                    <v-window-item value="sets">
                        <v-item-group mandatory="force" class="items-list" selected-class="item-selected">
                            <v-item v-for="set in sets" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <img src="/swords/set_default.png" :alt="set">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                    <v-window-item value="blade">
                        <v-item-group mandatory="force" class="items-list" selected-class="item-selected">
                            <v-item v-for="blade in blades" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <img src="/swords/blade_default.png" :alt="blade">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                    <v-window-item value="guard">
                        <v-item-group mandatory="force" class="items-list" selected-class="item-selected">
                            <v-item v-for="guard in guards" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <img src="/swords/guard_default.png" :alt="guard">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                    <v-window-item value="hilt">
                        <v-item-group mandatory="force" class="items-list" selected-class="item-selected">
                            <v-item v-for="hilt in hilts" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <img src="/swords/hilt_default.png" :alt="hilt">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                </v-window>
            </v-card-text>
        </v-card>
        <div class="selected-items">
            <div class="item"></div>
            <div class="item"></div>
            <div class="item"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const tab = ref("sets");

const sets = ["Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1", "Set #1"];
const blades = ["Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1", "Blade #1"];
const guards = ["Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1", "Guard #1"];
const hilts = ["Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1", "Hilt #1"];

</script>

<style scoped lang="scss">
h2 {
    font-family: "Bree serif";
    font-size: 30px;
    font-weight: 400;
    letter-spacing: 3px;
    margin-bottom: 6px;
}

.menu-container {
    position: relative;
}

.sword-menu {
    max-width: 460px;
    position: relative;
    width: 30vw;

    .v-tabs {
        position: relative;

        &::before {
            content: "";
            display: block;
            position: absolute;
            left: 10px;
            bottom: 0;
            right: 10px;
            height: 2px;
            background-color: var(--primary);
        }
    }

    .tab-active {
        color: #fff;
    }

    .v-tab.v-tab {
        transition: color 150ms ease;
        margin-left: -2px;
        background-color: transparent;

        &::before {
            content: "";
            display: block;
            position: absolute;
            height: 60%;
            width: 2px;
            background-color: var(--primary);
            top: 50%;
            left: -2px;
            transform: translateY(-50%);
        }

        &.tab-active {
            &::before {
                opacity: 0;
            }
        
            & + .v-tab::before {
                opacity: 0;
            }
        }
    }

    .items-list {
        display: flex;
        gap: 18px;
        max-height: 400px;
        flex-wrap: wrap;
        overflow-y: scroll;
        justify-content: center;
        padding: 15px 25px 30px;
        -ms-overflow-style: none;
        scrollbar-width: none;

        .sword-item {
            display: flex;
            justify-content: center;
            align-items: center;
            max-width: 125px;
            height: 125px;
            flex-basis: 30%;
            flex-grow: 1;
            flex-shrink: 1;
            background-color: rgba(#000, 0.03);
            cursor: pointer;
            transition: background-color 300ms ease;
            overflow: hidden;
            box-shadow: none;
            border-bottom: 2px solid rgba(#000, 0.25);
            padding: 4px;

            img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                transition: transform 300ms cubic-bezier(0.06, 0.52, 0.76, 1.23);
                -webkit-user-drag: none;
                -webkit-user-select: none;    
                -moz-user-select: none;
                user-select: none;
            }

            &:hover {
                img {
                    transform: scale(1.35);
                }
            }

            &.item-selected {
                background-color: rgba(#70A480, 0.31);
                border-color: var(--primary);
            }
        }
        
        &::-webkit-scrollbar {
            width: 0;
        }
    }

    &::after {
            content: "";
            display: block;
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(transparent 85%, #fff 97%);
            z-index: 4;
            pointer-events: none;
        }
}

.selected-items {
    display: flex;
    position: absolute;
    top: 48px;
    right: 0;
    transform: translateX(100%);
    padding-left: 16px;
    flex-direction: column;
    gap: 10px;

    .item {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 70px;
        height: 70px;
        border: 3px solid var(--primary);
        background-color: rgba(#fff, 0.22);
        backdrop-filter: blur(3px);

        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }
}
</style>