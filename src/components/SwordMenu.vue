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
                    <small class="disabled-text" v-if="paused">Disabled while in-game</small>
                    <v-window-item value="sets">
                        <v-item-group :disabled="paused" @update:model-value="updateSet" v-model="swordSet" class="items-list" :class="{disabled: paused}" selected-class="item-selected">
                            <v-item :value="set.name" v-for="set in SWORD_PRESETS" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <span class="title">{{ set.name }}</span>
                                    <img :src="`/swords/set_${set.name.toLowerCase()}.png`" :alt="set.name">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                    <v-window-item value="blade">
                        <v-item-group :disabled="paused" v-model="settings.bladeModel" mandatory="force" class="items-list" :class="{disabled: paused}" selected-class="item-selected">
                            <v-item :value="set.name" v-for="set in SWORD_PRESETS" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <span class="title">{{ set.name }}</span>
                                    <img :src="`/swords/blade_${set.name.toLowerCase()}.png`" :alt="set.name">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                    <v-window-item value="guard">
                        <v-item-group :disabled="paused" v-model="settings.guardModel" mandatory="force" class="items-list" :class="{disabled: paused}" selected-class="item-selected">
                            <v-item :value="set.name" v-for="set in SWORD_PRESETS" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <span class="title">{{ set.name }}</span>
                                    <img :src="`/swords/guard_${set.name.toLowerCase()}.png`" :alt="set.name">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                    <v-window-item value="hilt">
                        <v-item-group :disabled="paused" v-model="settings.hiltModel" mandatory="force" class="items-list" :class="{disabled: paused}" selected-class="item-selected">
                            <v-item :value="set.name" v-for="set in SWORD_PRESETS" v-slot="{ selectedClass, toggle }" selected-class="item-selected">
                                <v-card class="sword-item" :class="selectedClass" @click="toggle">
                                    <span class="title">{{ set.name }}</span>
                                    <img :src="`/swords/hilt_${set.name.toLowerCase()}.png`" :alt="set.name">
                                </v-card>
                            </v-item>
                        </v-item-group>
                    </v-window-item>
                </v-window>
            </v-card-text>
        </v-card>
        <div class="selected-items">
            <div class="item">
                <img :src="`/swords/blade_${settings.bladeModel.toLowerCase()}.png`" alt="Blade" />
            </div>
            <div class="item">
                <img :src="`/swords/guard_${settings.guardModel.toLowerCase()}.png`" alt="Guard" />
            </div>
            <div class="item">
                <img :src="`/swords/hilt_${settings.hiltModel.toLowerCase()}.png`" alt="Hilt" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { SWORD_PRESETS } from "../constants";
import { Settings } from "../game/models/Settings";
import { watch } from "vue";
import { reactive } from "vue";
import { computed } from "vue";

const isFullSet = computed(() => {
    return props.settings.bladeModel === props.settings.guardModel && props.settings.bladeModel === props.settings.hiltModel;
});

const props = defineProps<{settings : Settings, paused : boolean}>();

const tab = ref("sets");
const swordSet = ref(isFullSet.value ? props.settings.bladeModel : null);

const settings = reactive(props.settings);

watch(() => props.settings, () => {
    settings.replace(props.settings);
});

watch(settings, () => {
    swordSet.value = isFullSet.value ? props.settings.bladeModel : null;
});

const updateSet = (e : string) => {
    settings.bladeModel = e;
    settings.guardModel = e;
    settings.hiltModel = e;
};

</script>

<style scoped lang="scss">
.disabled-text {
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(#000, 0.6);
}

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

        &.disabled {
            pointer-events: none;
            filter: saturate(0.5);
            opacity: 0.8;
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

@media (max-width: 1400px) {
    .sword-menu { 
        .items-list {
            padding-left: 0;
            padding-right: 0;
            gap: 10px;
        } 
    }
}

@media (max-width: 1200px) {
    .sword-menu { 
        .items-list {
            .sword-item {
                flex-basis: 40%;
            }
        } 
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
    gap: 1.1vw;

    .item {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 70px;
        height: 70px;
        border: 3px solid var(--primary);
        background-color: rgb(255 255 255 / 43%);
        backdrop-filter: blur(3px);
        padding: 3px;

        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            user-select: none;
            -webkit-user-drag: none;
            -webkit-user-select: none;
        }
    }
}

.title {
    position: absolute;
    top: 0;
    color: #000;
    font-weight: 400;
    text-shadow: 0px 0px 2px #fff;
    z-index: 2;
}
</style>