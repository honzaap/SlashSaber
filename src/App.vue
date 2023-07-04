<template>
    <LandingPage v-if="screen === 'landingPage'" @switch="switchPage"/>
    <Scene v-if="screen === 'scene'" @switch="switchPage"/>
</template>

<script setup lang="ts">
import Scene from "./pages/Scene.vue";
import { ref } from "vue";
import LandingPage from "./pages/LandingPage.vue";

const screen = ref("landingPage");

function switchPage(page : string) {
    screen.value = page;
}

</script>