<template>
    <Scene ref="scene" v-if="screen === 'scene'" @switch="switchPage"/>
    <LandingPage v-if="screen === 'landingPage' || overlayLP" :overlay="overlayLP" @switch="switchPage"/>
</template>

<script setup lang="ts">
import Scene from "./pages/Scene.vue";
import { ref } from "vue";
import LandingPage from "./pages/LandingPage.vue";

const screen = ref("scene");
const overlayLP = ref(false);

function switchPage(page : string) {
    if(page === "landingPage") {
        overlayLP.value = true;        
    }
    else {
        screen.value = page;
        overlayLP.value = false;
    }
}

</script>

<style>

</style>