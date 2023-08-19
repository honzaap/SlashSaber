<template>
    <div class="go-overlay" :class="{show: died}">
        <h2>Game Over</h2>
        <p class="score">Your score: <span class="highlight">{{ prettifyScore(score)}}</span></p>
        <div class="username-container" v-if="noUsername">
            <p>To include your score in the leaderboard, enter your username:</p>
            <v-text-field
                v-model="settings.username"
                hide-details="auto"
                color="rgb(182, 227, 196)"
                ></v-text-field>
        </div>
        <ButtonSlash :disable="disable" text="Try Again" @click="$emit('reset')"/>
    </div>
</template>

<script setup lang="ts">
import ButtonSlash from "./ButtonSlash.vue";
import { prettifyScore } from "../helpers";
import { ref } from "vue";

const props = defineProps(["died", "score", "settings"]);
defineEmits(["reset"]);

const disable = ref(true);
const noUsername = ref(!props.settings.username);

setTimeout(() => {
    disable.value = false;
}, 700);

</script>

<style scoped lang="scss">
.go-overlay {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding-bottom: 15%;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
    z-index: 4;
    backdrop-filter: blur(6px);
    background-color: rgba(#000, 0.6);
    animation: fade-in 500ms ease forwards;
}

@keyframes fade-in {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
}

h2 {
    position: relative;
    font-family: "Bree serif";
    font-size: 48px;
    font-weight: 400;
    letter-spacing: 3px;

    &::after {
        content: "";
        display: block;
        position: absolute;
        left: -30px;
        top: 55%;
        width: 0;
        height: 2px;
        background-color: #e0e0e0;
        border-radius: 50px;
        box-shadow: 0 0 3px 0 #000;
        z-index: -1;
        animation: title-slash 1000ms cubic-bezier(0.22, 0.82, 0.79, 0.91) 700ms forwards
    }
}

@keyframes title-slash {
    0% {
        width: 0;
    }
    50% {
        width: calc(100% + 60px);
        left: -30px;
    }
    100% {
        width: 0px;
        left: calc(100% + 30px);
    }
}

.score {
    font-size: 24px;
    font-weight: 500;
    margin-bottom: 60px;

    .highlight {
        margin-left: 5px;
        color: var(--primary);
    }
}
</style>