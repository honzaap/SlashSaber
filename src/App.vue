<template>
    <Scene ref="scene" v-if="screen === 'scene'" @switch="switchPage"/>
</template>

<script setup lang="ts">
import Scene from "./pages/Scene.vue";
import { ref } from "vue";

// Load last page from localStorage
const lastScreen = "scene"; //localStorage.getItem("lastScreen") ?? "landingPage";

const screen = ref(lastScreen);
const overlayLP = ref(false);

function switchPage(page : string) {
    if(page === "landingPage") {
        overlayLP.value = true;        
    }
    else {
        screen.value = page;
        overlayLP.value = false;
    }

    localStorage.setItem("lastScreen", page);
}

</script>

<style>

</style>