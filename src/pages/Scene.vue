<template>
    <div class="container">
        <LoadingScreen :isLoading="loading"/>
        <SceneOverlay :currentScore="currentScore" :hidden="hideOverlay" @switch="switchPage" @start="startGame" :paused="paused" @reset="resetRun"/>
        <canvas ref="canvas" id="canvas"></canvas>
    </div>
</template>

<script setup lang="ts">
/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
//import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
//import { BLOOM_LAYER } from "../constants";
//import * as postprocessing from "postprocessing";
import GUIManager from "../game/utils/GUIManager.ts";
import Sword from "../game/models/Sword.ts";
import GameState from "../game/models/GameState.ts";
import { onMounted, ref } from "vue";
import { createRenderer, resizeRenderer, setupEnvironment, setupLighting, setupObstacles, setupPhysicsEnvironment, setupPostProcessing } from "../game/scene";
import LoadingScreen from "../components/LoadingScreen.vue";
import SceneOverlay from "../components/SceneOverlay.vue";

const emit = defineEmits(["switch"]);

const canvas = ref(null);
const loading = ref(true);
const paused = ref(false);
const hideOverlay = ref(false);
const currentScore = ref(0);

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

    const { composer, bloomComposer } = setupPostProcessing(camera, renderer);

    const dt = 1000 / 300;
    let timeTarget = 0;

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        if(gameState.halted) return;
        renderer.info.reset();
        if(Date.now() >= timeTarget){
            gameState.update();

            GUIManager.updateStats();

            //render(composer); //, bloomComposer);
            composer.render();

            timeTarget += dt;
            if(Date.now() >= timeTarget){
                timeTarget = Date.now();
            }
        }
    }
    animate();

    // Resize renderer when window size changes
    window.onresize = () => {
        resizeRenderer(renderer);
        composer.setSize(window.innerWidth, window.innerHeight);
        bloomComposer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    };
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

    // Minimal camea sway
    const initialPosition = camera.position.y;
    const swayAmount = 0.03;
    const swaySpeed = 0.02;
    let swayDir = -1;

    gameState.addLogicHandler((delta) => {
        camera.position.y += swayDir * delta * swaySpeed;
        if(camera.position.y >= initialPosition + swayAmount || camera.position.y <= initialPosition - swayAmount) {
            camera.position.y = initialPosition + swayAmount * swayDir;
            swayDir *= -1;
        }
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

// Render the scene
/*function render(composer : postprocessing.EffectComposer) {//, bloomComposer : EffectComposer) {
    //const materials : { [name : string] : THREE.Material } = {};
    //const bloomLayer = new THREE.Layers();
    //bloomLayer.set(BLOOM_LAYER);
    //const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });

    //function darkenNonBloomed(obj : THREE.Object3D) {
    //    if (obj instanceof THREE.Mesh  && bloomLayer.test(obj.layers) === false) {
    //        materials[obj.uuid] = obj.material;
    //        obj.material = darkMaterial;
    //    }
    //}

    //function restoreMaterial(obj : THREE.Object3D) {
    //    if (obj instanceof THREE.Mesh && materials[obj.uuid]) {
    //        obj.material = materials[ obj.uuid ];
    //        delete materials[obj.uuid];
    //    }
    //}

    //gameState.sceneTraverse(darkenNonBloomed);
    //bloomComposer.render();
    //gameState.sceneTraverse(restoreMaterial);
    composer.render();
}*/

onMounted(() => {
    setTimeout(() => { 
        createScene();
    }, 100);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible"){
            gameState.haltGame();
            hideOverlay.value = false;
        }
    });

    document.addEventListener("keyup", (e : KeyboardEvent) => {
        if(e.key === "Escape") {
            if(gameState.started && gameState.halted) { // Resume game from pause
                gameState.startGame();
                hideOverlay.value = true;
            }
            else if(gameState.started && !gameState.halted) { // Pause game
                gameState.haltGame();
                hideOverlay.value = false;
            }
        }
    });

    let scoreInterval : number | null;

    gameState.onAfterLoad = () => {
        loading.value = false;
    };

    gameState.onAfterStart = () => {
        paused.value = false;
        scoreInterval = setInterval(updateScore, 100);
    };

    gameState.onAfterHalt = () => {
        paused.value = true;
        if(scoreInterval) {
            clearInterval(scoreInterval);
        }
    };
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
    paused.value = false;
}

function updateScore() {
    currentScore.value = gameState.distanceTravelled;
}

</script>

<style scoped lang="scss">
.container {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}
</style>
