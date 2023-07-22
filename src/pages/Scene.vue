<template>
    <div class="container">
        <LoadingScreen :isLoading="loading"/>
        <SceneOverlay :fullscreen="fullscreen" :settings="settings" :lives="lives"
            :currentScore="currentScore" :hidden="hideOverlay" :paused="paused"
            @switch="switchPage" @start="startGame" @reset="resetRun" 
            @toggleFullscreen="toggleFullscreen" @updateSettings="updateSettings"/>
        <GameOverScreen v-if="died" :died="died" :score="currentScore" @reset="resetRun"/>
        <canvas :class="{'no-cursor' : !settings.showCursor}" ref="canvas" id="canvas"></canvas>
        <div :class="{anim: hitAnim}" class="hit-marker"></div>
    </div>
</template>

<script setup lang="ts">
/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import GUIManager from "../game/utils/GUIManager.ts";
import Sword from "../game/models/Sword.ts";
import GameState from "../game/models/GameState.ts";
import { onMounted, ref, reactive } from "vue";
import { createRenderer, resizeRenderer, setupEnvironment, setupLighting, setupObstacles, setupPhysicsEnvironment } from "../game/scene";
import LoadingScreen from "../components/LoadingScreen.vue";
import SceneOverlay from "../components/SceneOverlay.vue";
import GameOverScreen from "../components/GameOverScreen.vue";
import { Settings } from "../game/models/Settings";
import { EVENTS } from "../constants";

const emit = defineEmits(["switch"]);

const canvas = ref(null);
const loading = ref(true);
const paused = ref(false);
const died = ref(false);
const hideOverlay = ref(false);
const currentScore = ref(0);
const lives = ref(3);
const settings = reactive(new Settings());
const fullscreen = ref(false);
const hitAnim = ref(false);

const gameState = GameState.getInstance();
let sword : Sword;
let camera : THREE.PerspectiveCamera;

async function createScene() {
    if(canvas.value == null) return;

    // Create scene
    camera = createCamera();
    const renderer = createRenderer(camera, canvas.value as HTMLCanvasElement);

    setupLighting();

    setupEnvironment();

    setupPhysicsEnvironment();

    sword = new Sword();

    createControls(camera);

    setupObstacles();

    let dt = gameState.settings.lockFps ? 1000 / 60 : 1000 / 144;
    let timeTarget = 0;

    const scene = gameState.getScene();

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        if(gameState.halted) return;
        renderer.info.reset();
        if(Date.now() >= timeTarget){
            gameState.update();

            GUIManager.updateStats();

            renderer.render(scene, camera);
            timeTarget += dt;
            if(Date.now() >= timeTarget){
                timeTarget = Date.now();
            }
        }
    }
    requestAnimationFrame(animate);

    // Resize renderer when window size changes
    window.onresize = () => {
        resizeRenderer(renderer);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    };

    gameState.addEventListener(EVENTS.settingsChanged, () => {
        dt = gameState.settings.lockFps ? 1000 / 60 : 1;
    });

    // Cache every object in the scene by forcibly rendering it
    gameState.addEventListener(EVENTS.ready, () => {
        function setAllCulled(obj : THREE.Object3D, culled : boolean) {
            obj.frustumCulled = culled;
            obj.children.forEach(child => setAllCulled(child, culled));
        }

        setAllCulled(scene, false);
        renderer.render(scene, camera);
        setAllCulled(scene, true);
        renderer.compile(scene, camera);

        gameState.dispatchEvent(EVENTS.load);
    });
}

// Create and cofigure camera and return it
function createCamera() {
    const camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.6,
        60,
    );
    camera.position.set(0, 1.2, 0);
    camera.lookAt(0, 0.5, -5);

    return camera;
}

// Create and configure camera and sword controls
function createControls(camera : THREE.Camera) {
    if(canvas.value == null) return;
    
    (canvas.value as HTMLCanvasElement).onmousemove = (e) => {
        e.preventDefault();

        controlCamera(e, camera);
        sword.move(e);
    };

    (canvas.value as HTMLCanvasElement).ontouchmove = (e) => {
        sword.move(e);
    };

    // Minimal camera sway // TODO : make this prettier or move somewhere out of here
    const initialPos = new THREE.Vector3();
    initialPos.copy(camera.position);
    const swayAmount = 0.03;
    const swaySpeed = 0.02;
    let swayDir = -1;

    const shakePos = new THREE.Vector3();
    shakePos.copy(camera.position);
    shakePos.z += 0.55;
    let shaking = true;
    let shakeDir = 1;

    gameState.addLogicHandler((delta) => {
        camera.position.y += swayDir * delta * swaySpeed;
        if(camera.position.y >= initialPos.y + swayAmount || camera.position.y <= initialPos.y - swayAmount) {
            camera.position.y = initialPos.y + swayAmount * swayDir;
            swayDir *= -1;
        }

        if(shaking) {
            if(shakeDir === 1) {
                camera.position.lerp(shakePos, 0.25);
                if(camera.position.z >= shakePos.z - 0.05) {
                    shakeDir *= -1;
                }
            }
            else {
                camera.position.lerp(initialPos, 0.2);
                if(camera.position.z <= initialPos.z + 0.05) {
                    shakeDir *= -1;
                    shaking = false;
                }
            }
        }
    });

    gameState.addEventListener(EVENTS.hit, () => {
        shaking = true;
        hitAnim.value = true;
        lives.value--;
        setTimeout(() => {
            hitAnim.value = false;
        }, 400);
    });
}

// Take mouse event and camera as input and handle controls for the camera
function controlCamera(e : MouseEvent, camera : THREE.Camera) {
    const delta = new THREE.Vector2();

    if(gameState.mouse.x === -1 && gameState.mouse.y === -1) {
        delta.x = window.innerWidth / 2 - e.offsetX;
        delta.y = window.innerHeight / 2 - e.offsetY;
    }
    else {
        delta.x = gameState.mouse.x - e.offsetX;
        delta.y = gameState.mouse.y - e.offsetY;
    }

    gameState.mouse.x = e.offsetX;
    gameState.mouse.y = e.offsetY;

    camera.rotation.y += delta.x / 5000;
    camera.rotation.x += delta.y / 5000;
}

onMounted(() => {
    loadSettings();
    setTimeout(() => { 
        createScene();
    }, 100);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible"){
            gameState.haltGame();
            if(died.value) {
                return;
            }
            hideOverlay.value = false;
        }
    });

    window.addEventListener("keyup", (e : KeyboardEvent) => {
        if(e.key === "Escape") {
            fullscreen.value = false;
            if(died.value) {
                return;
            }
            if(gameState.started && gameState.halted) { // Resume game from pause
                gameState.startGame();
                hideOverlay.value = true;
            }
            else if(gameState.started && !gameState.halted) { // Pause game
                gameState.haltGame();
                hideOverlay.value = false;
            }
        }
        else if(e.key === "F11") {
            fullscreen.value = !fullscreen.value;
        }
    });

    let scoreInterval : number | null;

    gameState.addEventListener(EVENTS.load, () => {
        loading.value = false;
    });

    gameState.addEventListener(EVENTS.start, () => {
        paused.value = false;
        scoreInterval = setInterval(updateScore, 100);
    });

    gameState.addEventListener(EVENTS.halt, () => {
        if(!gameState.started) return;
        paused.value = true;
        if(scoreInterval) {
            clearInterval(scoreInterval);
        }
    });

    gameState.addEventListener(EVENTS.died, () => {
        died.value = true;
        setTimeout(() => {
            gameState.haltGame();
        }, 700);
    });
});

function startGame() {
    hideOverlay.value = true;
    gameState.startGame();
}

function switchPage() {
    emit("switch", "landingPage");
}

function resetRun() {
    gameState.reset();
    sword.reset();
    camera.lookAt(0, 0.5, -5);
    lives.value = 3;
    paused.value = false;
    died.value = false;
    hideOverlay.value = false;
}

function updateScore() {
    currentScore.value = gameState.score;
}

function toggleFullscreen() {
    fullscreen.value = !fullscreen.value;
    if(fullscreen.value) {
        document.body.requestFullscreen();
    }
    else {
        document.exitFullscreen();
    }
}

// Update settings in GameState and save them to localStorage
function updateSettings(newSettings : Settings) {
    gameState.updateSettings(newSettings);

    localStorage.setItem("slash_saber_settings", JSON.stringify(gameState.settings));
}

// Load settings from localStorage 
function loadSettings() {
    const settingsJson = localStorage.getItem("slash_saber_settings");
    if(!settingsJson) return;

    const loadedSettings = JSON.parse(settingsJson) as Settings;
    gameState.updateSettings(loadedSettings);

    settings.replace(loadedSettings);
}

</script>

<style scoped lang="scss">
.container {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
}

.no-cursor {
    cursor: none;
}

.hit-marker {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: rgba(#e84631, 0.12);
    opacity: 0;
    pointer-events: none;

    &.anim {
        animation: hit-marker 350ms ease forwards;
    }
}

@keyframes hit-marker {
    0% {
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}
</style>
