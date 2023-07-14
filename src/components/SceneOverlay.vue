<template>
    <span class="current-score" :class="{show: hidden, offset: !hidden && paused}">
        <span class="text">Your current score: </span>
        {{ prettifyScore(currentScore) }} pts
    </span>
    <div class="overlay-container" :class="{fade: overlayState === 1, hide: overlayState === 2}">
        <v-toolbar class="navbar" height="72">
            <button class="btn-logo" @click="$emit('switch')">
                <img src="/logo_white.svg" alt="Slash Saber logo" class="logo">
            </button>
            <div class="score">
                <p>Your highest score: <span class="highlight">7,500 pts</span></p>
                <p>Your last score: <span class="highlight">4,200 pts</span></p>
            </div>
            <div class="options">
                <v-menu :close-on-content-click="false" location="bottom end" :offset="[10, 10]">
                    <template v-slot:activator="{ props }">
                        <v-btn density="comfortable" icon="mdi-cog" v-bind="props"/>
                    </template>
                    <div class="menu-options">
                        <p class="title">Settings</p>
                        <div class="form-group">
                            <v-text-field
                                v-model="settings.name"
                                label="Username"
                                hide-details="auto"
                                color="rgb(182, 227, 196)"
                                ></v-text-field>
                        </div>
                        <div class="form-group">
                            <v-slider
                                v-model="settings.sensitivity" label="Sensitivity"
                                color="#70A480" track-color="#fff"
                                step="0.1"
                                min="1.0" max="2.0"
                                style="margin: 0; margin-right: 20px;"
                            ></v-slider>
                            <span class="sensitivity-value">{{  settings.sensitivity }}</span>
                        </div>
                        <div class="form-group">
                            <div style="flex-grow: 1;">
                                <v-select
                                    v-model="settings.graphicsPreset"
                                    label="Graphics"
                                    color="rgb(182, 227, 196)"
                                    :items="graphicsOptions"
                                    :disabled="paused"
                                    ></v-select>
                                <span v-if="paused" class="disabled-helper">Disabled while in-game</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="shadows">Enable shadows</label>
                            <input v-model="settings.enableShadows" id="shadows" class="checkbox" type="checkbox">
                        </div>
                        <div class="form-group">
                            <label for="shadows">Lock FPS to 60</label>
                            <input v-model="settings.lockFps" id="shadows" class="checkbox" type="checkbox">
                        </div>
                    </div>
                </v-menu>
                <v-tooltip :text="settings.muteSound ? 'Enable volume' : 'Disable volume'" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" density="comfortable" @click="settings.muteSound = !settings.muteSound"
                        :icon="settings.muteSound ? 'mdi-volume-off' : 'mdi-volume-high'" />
                    </template>
                </v-tooltip>
                <v-tooltip :text="fullscreen ? 'Minimize' : 'Go fullscreen'" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn @click="$emit('toggleFullscreen')" v-bind="props" density="comfortable" 
                        :icon="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" />
                    </template>
                </v-tooltip>
                <v-tooltip :text="props.settings.showCursor ? 'Hide cursor in-game' : 'Show cursor in-game'" location="bottom left">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" density="comfortable"  @click="settings.showCursor = !settings.showCursor"
                        :icon="settings.showCursor ? 'mdi-cursor-default-outline' : 'mdi-sword'" />
                    </template>
                </v-tooltip>
            </div>
        </v-toolbar>
        <div class="buttons">
            <ButtonSlash :text="paused ? 'Resume Game' : 'Start Slashing'" @click="$emit('start')"/>
            <ButtonSlash v-if="paused" :alt="true" text="Reset Run" @click="$emit('reset')"/>
        </div>
        <div class="your-sword">
            <SwordMenu />
        </div>
        <div class="leaderboard">
            <LeaderBoard compact="true" />
        </div>
        <p v-if="paused" class="paused-text">Paused</p>
        <div class="bottom">
            <v-tooltip text="Slash Saber is open-source!" location="top left">
                <template v-slot:activator="{ props }">
                    <v-btn href="https://github.com/honzaap/SlashSaber" target="_blank" @click="$emit('toggleCursor')" v-bind="props" density="compact" 
                    icon="mdi-github" color="rgba(0, 0, 0, 0)" />
                </template>
            </v-tooltip>
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import ButtonSlash from "./ButtonSlash.vue";
import LeaderBoard from "./LeaderBoard.vue";
import SwordMenu from "./SwordMenu.vue";
import { ref } from "vue";
import { GraphicsPreset } from "../game/enums/GraphicsPresset";
import { Settings } from "../game/models/Settings";
import { reactive } from "vue";

const emit = defineEmits(["switch", "start", "reset", "toggleFullscreen", "updateSettings"]);
const props = defineProps<{hidden : boolean, paused : boolean, currentScore : number, fullscreen : boolean, settings : Settings}>();

const overlayState = ref(-1);
const settings = reactive(props.settings);

const graphicsOptions = Object.values(GraphicsPreset);

watch(() => props.settings, () => {
    settings.replace(props.settings);
});

watch(settings, () => {
    emit("updateSettings", settings);
});

watch(() => props.hidden, () => {
    if(props.hidden) {
        if(overlayState.value === -1) {
            overlayState.value = 1;
            setTimeout(() => {
                overlayState.value = 2;
            }, 500);
        }
        else {
            overlayState.value = 2;
        }
    }
    else {
        overlayState.value = 0;
    }
});

function prettifyScore(score : number) {
    return Math.floor(score).toLocaleString("en-US");
}

</script>

<style scoped lang="scss">
.current-score {
    display: flex;
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    -webkit-user-drag: none;
    -moz-user-drag: none;
    z-index: 5;
    transition: top 300ms ease;
    font-size: 25px;
    font-weight: 400;
    font-family: "Bree serif";
    text-shadow: 0 4px rgba(#000, 0.25);

    .text {
        display: block;
        width: 0;
        transition: width 350ms ease, opacity 200ms ease;
        overflow: hidden;
        white-space: nowrap;
        opacity: 0;
    }

    &.show {
        top: 10px;
    }

    &.offset {
        top: 80px;
        font-size: 22px;

        .text {
            width: 200px;
            opacity: 1;
        }
    }
}

.overlay-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
    background-color: rgba(#000, 0.6);
    backdrop-filter: blur(8px);
    transition: opacity 500ms ease;

    &.fade {
        opacity: 0;
    }

    &.hide {
        display: none;
    }
}

.navbar {
    position: relative;
    padding: 20px 26px;
    background-color: transparent;
    color: #fff;

    .btn-logo {
        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        max-width: 160px;
        height: 100%;
    }

    .score {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        font-weight: 400;

        .highlight {
            color: var(--primary);
        }
    }

    .options {
        display: flex;
        height: 100%;
        align-items: flex-start;
        gap: 15px;
    }
}

.buttons {
    display: flex;
    position: absolute;
    left: 50%;
    top: 50%;
    flex-direction: column;
    gap: 50px;
    transform: translateX(-50%);
}

.your-sword {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
}

.leaderboard {
    position: absolute;
    right: 30px;
    top: 40%;
    transform: translateY(-50%);
}

.menu-options {
    min-width: 320px;
    background-color: rgba(#000, 0.3);
    color: #fff;
    padding: 12px 15px 20px;
    backdrop-filter: blur(6px);
    border: 2px solid #fff;

    .title {
        text-align: center;
        font-size: 20px;
    }

    .form-group {
        display: flex;
        width: 100%;
        justify-content: space-between;
        padding: 0 10px;
        margin: 20px 0;

        label {
            display: flex;
            align-items: center;
            flex-grow: 1;
        }

        .v-input {
            flex-grow: 1;
        }

        .checkbox {
            appearance: none;
            display: flex;
            width: 1.75em;
            height: 1.75em;
            border: 2px solid #fff;
            margin-right: 10px;
            cursor: pointer;

            &:checked {
                background-image: url("/icons/check.svg");
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                background-size: cover;
                background-color: rgba(#fff, 0.1);
            }

            &:target {
                transform: sclae(0.9);
            }
        }
    }
}

.paused-text {
    position: absolute;
    left: 50%;
    top: 25%;
    transform: translate(-50%, -50%);
    margin: 0;
    font-size: 168px;
    font-family: "Bree serif";
    font-weight: 400;
    color: rgba(#fff, 0.05);
    letter-spacing: 5px;
    user-select: none;
    -webkit-user-drag: none;
    -moz-user-drag: none;
}

.bottom {
    position: absolute;
    right: 20px;
    bottom: 20px;
    color: #fff;

    .v-btn {
        color: #fff;
    }
}

.disabled-helper {
    font-size: 12px;
    color: rgba(#fff, 0.5);
}

.sensitivity-value {
    flex-basis: 25px;
    text-align: right;
}

</style>