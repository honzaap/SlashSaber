import * as THREE from "three";
import * as CANNON from "cannon-es";
import GameState from "../game/models/GameState.ts";
import ObstacleManager from "../game/models/ObstacleManager.ts";
import EnvironmentManager from "../game/models/EnvironmentManager.ts";
import { EVENTS } from "../constants.ts";
import { GraphicsPreset } from "./enums/GraphicsPresset.ts";

const gameState = GameState.getInstance();

// Create and configure renderer and return it
export function createRenderer(camera : THREE.Camera, canvas : HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true,
        depth: true,
        canvas: canvas,
    });

    renderer.localClippingEnabled = true;
    
    resizeRenderer(renderer);

    renderer.render(gameState.getScene(), camera);
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.useLegacyLights = false;
    renderer.setClearColor(0x000000);

    return renderer;
}

// Set's the renderers size to current window size
export function resizeRenderer(renderer : THREE.WebGLRenderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create and configure lighting in the scene
export function setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xe5e7ff, 0xd2b156, 1.55);
    hemiLight.position.set(0, 10, 0);
    gameState.sceneAdd(hemiLight);

    gameState.addEventListener(EVENTS.settingsChanged, () => {
        if(gameState.settings.graphicsPreset === GraphicsPreset.LOW) {
            hemiLight.intensity = 2.25;
        }
        else {
            hemiLight.intensity = 1.55;
        }
    });
}

// Create and setup anything environment-related
export function setupEnvironment() {
    const scene = gameState.getScene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(scene.background, 40, 65);

    // Setup moving environment
    EnvironmentManager.getInstance();

    // Setup static environment
    const blackMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
    const planeGeometry = new THREE.PlaneGeometry(8, 60);
    const worldGround = new THREE.Mesh(planeGeometry, blackMaterial);
    worldGround.rotation.x = THREE.MathUtils.degToRad(-90);
    worldGround.position.z = -30;
    worldGround.position.y = -1;
    worldGround.matrixAutoUpdate = false;
    gameState.sceneAdd(worldGround);

    const worldRoof = new THREE.Mesh(planeGeometry, blackMaterial);
    worldRoof.rotation.x = THREE.MathUtils.degToRad(90);
    worldRoof.position.z = -30;
    worldRoof.position.y = 4;
    worldRoof.matrixAutoUpdate = false;
    gameState.sceneAdd(worldRoof);
}

// Adds static ground and walls to physics world
export function setupPhysicsEnvironment() {
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        position: new CANNON.Vec3(0, -0.95, 0),
    });
    groundBody.type = CANNON.Body.STATIC;
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    gameState.worldAdd(groundBody);
    
    const wallBody1 = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        position: new CANNON.Vec3(2.5, 0, 0),
    });
    wallBody1.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    gameState.worldAdd(wallBody1);
    
    const wallBody2 = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        position: new CANNON.Vec3(-2.5, 0, 0),
    });
    wallBody2.quaternion.setFromEuler(0, Math.PI / 2, 0);
    gameState.worldAdd(wallBody2);
}

export function setupObstacles() {
    ObstacleManager.getInstance();
}