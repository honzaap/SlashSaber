import * as THREE from "three";
import GUIManager from "../game/utils/GUIManager.ts";
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // TODO : keep at basic if not necessary
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    //renderer.toneMapping = THREE.LinearToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    //renderer.toneMappingExposure = 1.16;
    renderer.useLegacyLights = false;
    renderer.setClearColor(0x000000);

    const updateShadows = () => {
        renderer.shadowMap.enabled = gameState.settings.enableShadows;
        gameState.sceneTraverse(obj => {
            if(obj instanceof THREE.DirectionalLight || obj instanceof THREE.PointLight) {
                obj.shadow.map?.dispose();
                //obj.shadow.map = null;
                obj.shadow.needsUpdate = true;
            }
            else if(obj instanceof THREE.Mesh && obj.material) {
                obj.material.needsUpdate = true;
            }
        });
    };

    gameState.addEventListener(EVENTS.settingsChanged, updateShadows);
    gameState.addEventListener(EVENTS.load, updateShadows);

    return renderer;
}

// Set's the renderers size to current window size
export function resizeRenderer(renderer : THREE.WebGLRenderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create and configure lighting in the scene
export function setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xe5e7ff, 0xd2b156, 1.45);
    //const hemiLight = new THREE.HemisphereLight(0xe5e7ff, 0xe5e7ff, 1.25);
    hemiLight.position.set(0, 10, 0);
    gameState.sceneAdd(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    //dirLight.position.set(-18, 9, -10);
    dirLight.target.position.set(2, -15, 0);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -38;
    dirLight.shadow.camera.right = 0;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -8;
    //gameState.sceneAdd(dirLight);

    gameState.addEventListener(EVENTS.settingsChanged, () => {
        if(gameState.settings.graphicsPreset === GraphicsPreset.LOW) {
            hemiLight.intensity = 2.25;
        }
        else {
            hemiLight.intensity = 1.25;
        }
    });

    GUIManager.registerLighting(hemiLight);
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

    GUIManager.registerEnvironment();
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