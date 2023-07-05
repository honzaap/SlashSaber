<template>
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
                        <p class="title">Graphics</p>
                        <div class="form-group">
                            <label for="test1">Lorem ipsum</label>
                            <input id="test1" class="checkbox" type="checkbox">
                        </div>
                        <div class="form-group">
                            <label for="test2">Dolor</label>
                            <input id="test2" class="checkbox" type="checkbox">
                        </div>
                        <div class="form-group">
                            <label for="test3">Sit amet</label>
                            <input id="test2" class="checkbox" type="checkbox">
                        </div>
                    </div>
                </v-menu>
                <v-tooltip text="Enable volume" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" density="comfortable" icon="mdi-volume-off" />
                    </template>
                </v-tooltip>
                <v-tooltip text="Go fullscreen" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" density="comfortable" icon="mdi-fullscreen" />
                    </template>
                </v-tooltip>
                <v-tooltip text="Show cursor in-game" location="bottom left">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" density="comfortable" icon="mdi-cursor-default-outline" />
                    </template>
                </v-tooltip>
            </div>
        </v-toolbar>
        <div class="start-btn">
            <ButtonSlash text="Start Slashing" @click="$emit('start')"/>
        </div>
        <div class="your-sword">
            <SwordMenu />
        </div>
        <div class="leaderboard">
            <LeaderBoard compact="true" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import ButtonSlash from "./ButtonSlash.vue";
import LeaderBoard from "./LeaderBoard.vue";
import SwordMenu from "./SwordMenu.vue";
import { ref } from "vue";

defineEmits(["switch", "start"]);
const props = defineProps(["hidden"]);

const overlayState = ref(-1);

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

</script>

<style scoped lang="scss">
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

.start-btn {
    position: absolute;
    left: 50%;
    top: 50%;
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
        margin: 12px 0;

        label {
            display: flex;
            align-items: center;
            flex-grow: 1;
        }

        .v-input {
            flex-grow: 0;
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

</style>