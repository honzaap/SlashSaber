import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { MIX_FRAGMENT_SHADER, MIX_VERTEX_SHADER } from "../constants";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as postprocessing from "postprocessing";
import { GodraysPass } from "../game/libs/GoodGodRays";
import GUIManager from "../game/utils/GUIManager.ts";
import * as CANNON from "cannon-es";
import GameState from "../game/models/GameState.ts";
import ObstacleManager from "../game/models/ObstacleManager.ts";
import EnvironmentManager from "../game/models/EnvironmentManager.ts";

const gameState = GameState.getInstance();

// Create and configure renderer and return it
export function createRenderer(camera : THREE.Camera, canvas : HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: false,
        depth: true,
        canvas: canvas,
    });

    renderer.localClippingEnabled = true;
    
    resizeRenderer(renderer);

    renderer.render(gameState.getScene(), camera);
    renderer.shadowMap.enabled = true; // TODO: Causes LAG?
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true; // ?
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.toneMappingExposure = 1.16;
    renderer.useLegacyLights = false;
    renderer.setClearColor(0x000000);

    return renderer;
}

// Set's the renderers size to current window size
export function resizeRenderer(renderer : THREE.WebGLRenderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Configure postprocessing and return composer
export function setupPostProcessing(camera : THREE.Camera, renderer : THREE.WebGLRenderer) {
    const renderScene = new RenderPass(gameState.getScene(), camera);
    renderScene.clearColor = new THREE.Color(0, 0, 0);
    renderScene.clearAlpha = 1;

    // Bloom
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.25;
    bloomPass.strength = 0.5;
    bloomPass.radius = 1.2;

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const composer = new postprocessing.EffectComposer(renderer, {multisampling: 8}); // TODO: Causes LAG?

    // God rays
    const grLight = new THREE.DirectionalLight(0xffffff, 0.3);
    grLight.castShadow = true;
    grLight.shadow.mapSize.width = 1024;
    grLight.shadow.mapSize.height = 1024;
    grLight.shadow.camera.updateProjectionMatrix();
    grLight.shadow.autoUpdate = true;
    grLight.position.set(-18, 9, -10);
    grLight.target.position.set(20, -5, 6);
    grLight.target.updateMatrixWorld();
    grLight.shadow.camera.near = 0.1;
    grLight.shadow.camera.far = 35;
    grLight.shadow.camera.left = -38;
    grLight.shadow.camera.right = 5;
    grLight.shadow.camera.top = 5;
    grLight.shadow.camera.bottom = -8;
    //gameState.sceneAdd(grLight.target);
    //gameState.sceneAdd(grLight);

    const godraysPass = new GodraysPass(grLight, camera as THREE.PerspectiveCamera, {
        density: 0.03,
        maxDensity: 0.1,
        distanceAttenuation: 2,
        color: new THREE.Color(0xffffff),
        edgeStrength: 2,
        edgeRadius: 2,
        raymarchSteps: 60,
        blur: { variance: 0.1, kernelSize: postprocessing.KernelSize.SMALL },
    });

    const mixPass = new postprocessing.ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: MIX_VERTEX_SHADER,
            fragmentShader: MIX_FRAGMENT_SHADER,
            defines: {}
        }), "baseTexture"
    );
    mixPass.needsSwap = true;

    const renderPass = new postprocessing.RenderPass(gameState.getScene(), camera);

    composer.addPass(renderPass);
    composer.addPass(mixPass);
    composer.addPass(godraysPass);
    composer.addPass(new postprocessing.EffectPass(camera));

    GUIManager.registerPostprocessing(bloomPass);

    return {composer, bloomComposer};
}

// Create and configure lighting in the scene
export function setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xe5e7ff, 0xd2b156, 1.25);
    hemiLight.position.set(0, 10, 0);
    gameState.sceneAdd(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.position.set(-18, 9, -10);
    dirLight.target.position.set(20, -5, 0);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -38;
    dirLight.shadow.camera.right = 0;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -8;
    gameState.sceneAdd(dirLight);

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