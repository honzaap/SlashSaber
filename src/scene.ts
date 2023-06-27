/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { FLOOR_ASSET, LAMP_ASSET, LEFT_WALL_ASSET, MIX_FRAGMENT_SHADER, MIX_VERTEX_SHADER, RIGHT_WALL_ASSET, ROOF_ASSET, UPPER_WALL_ASSET } from "./constants";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as postprocessing from "postprocessing";
import { GodraysPass } from "./libs/GoodGodRays";
import GUIManager from "./utils/GUIManager.ts";
import * as CANNON from "cannon-es";
import Sword from "./models/Sword.ts";
import GameState from "./models/GameState.ts";
import ObstacleManager from "./models/ObstacleManager.ts";

// Define global GameState
const gameState = GameState.getInstance();
let obstacleManager : ObstacleManager;

let sword : Sword;

export function createScene() {
    // Create scene
    const camera = createCamera();
    const renderer = createRenderer(camera);

    setupLighting();

    setupEnvironment();

    setupPhysicsEnvironment();

    sword = new Sword();

    createControls(camera);

    setupObstacles();

    const { composer, bloomComposer } = setupPostProcessing(camera, renderer);

    const clock = new THREE.Clock();

    const dt = 1000 / 60;
    let timeTarget = 0;

    // Animation loop
    function animate() {
        if(Date.now() >= timeTarget){
            const delta = clock.getDelta();

           

            gameState.update(delta);

            GUIManager.updateStats();

            render(composer, bloomComposer);

            timeTarget += dt;
            if(Date.now() >= timeTarget){
                timeTarget = Date.now();
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    // Resize renderer when window size changes
    window.onresize = () => {
        resizeRenderer(renderer);
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

    document.onmousemove = (e) => {
        e.preventDefault();

        controlCamera(e, camera);
        sword.move(e);
    }
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

// Create and configure renderer and return it
function createRenderer(camera : THREE.Camera) {
    const renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: false,
        depth: true,
        canvas: document.getElementsByTagName("canvas")[0],
    });

    renderer.localClippingEnabled = true;
    
    resizeRenderer(renderer);

    renderer.render(gameState.getScene(), camera);
    renderer.shadowMap.enabled = true; // TODO: Causes LAG?
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true; // ?
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    //renderer.setPixelRatio(window.devicePixelRatio * 1.5); // TODO: Causes LAG?
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.toneMappingExposure = 1.16;
    renderer.useLegacyLights = false;
    renderer.setClearColor(0x000000);

    return renderer;
}

// Set's the renderers size to current window size
function resizeRenderer(renderer : THREE.WebGLRenderer) {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Configure postprocessing and return composer
function setupPostProcessing(camera : THREE.Camera, renderer : THREE.WebGLRenderer) {
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

    const godraysPass = new GodraysPass(grLight, <THREE.PerspectiveCamera> camera, {
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
        }), 'baseTexture'
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

// Set shadows on given object to given settings
function setShadow(obj : THREE.Object3D, cast = false, receive = false) {
    obj.castShadow = cast;
    obj.receiveShadow = receive;
    if (obj?.children != null) {
        for (const child of obj.children) {
            setShadow(child, cast, receive);
        }
    }
}

// Looks through materials of given object and its children, then modifies it however necessary
function modifyObjectMaterial(obj : THREE.Object3D) {
    if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        if(obj.material?.emissiveIntensity > 1) { 
            // Generate point light on an emissive material (used for lamps)
            obj.material.emissiveIntensity = 1;
            const pointLight = new THREE.PointLight(0xffffff, 7.2, 0, 2);
            pointLight.position.y = -1.4;
            pointLight.castShadow = false;
            obj.add(pointLight); // TODO: Causes LAG?
        }
        if(obj.material?.opacity < 1) { 
            // Make objects visible, but still able to pass light and godrays
            obj.castShadow = false;
            obj.receiveShadow = false;
            obj.material.emissive = new THREE.Color(0xbeb979);
            obj.material.emissiveIntensity = 0.8;
            obj.material.opacity = 1;
            obj.material.depthWrite = false;
        }
    }
    if (obj?.children != null) {
        for (const child of obj.children) {
            modifyObjectMaterial(child);
        }
    }
}

// Create and configure lighting in the scene
function setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xe5e7ff, 0xd2b156, 1);
    hemiLight.position.set(0, 10, 0);
    gameState.sceneAdd(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.userData.isUsed = false;
    dirLight.position.set(-18, 9, -10);
    dirLight.target.position.set(20, -5, 0);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -38;
    dirLight.shadow.camera.right = 0;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -8;
    dirLight.frustumCulled = false;
    gameState.sceneAdd(dirLight);

    GUIManager.registerLighting(hemiLight);
}

// Create and setup anything environment-related
function setupEnvironment() {
    const scene = gameState.getScene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(scene.background, 40, 65);

    // Setup moving environment
    const updateFloors = generateMovingAsset(FLOOR_ASSET, 15, 0, true, true);
    const updateLeftWalls = generateMovingAsset(LEFT_WALL_ASSET, 7, -0.05, true, true);
    const updateRightWalls = generateMovingAsset(RIGHT_WALL_ASSET, 7, 0, true, true);
    const updateUpperWalls = generateMovingAsset(UPPER_WALL_ASSET, 7, 0, true, true);
    const updateRoofs = generateMovingAsset(ROOF_ASSET, 20, 0, true, true);
    const updateLamps = generateMovingAsset(LAMP_ASSET, 10, 7, true, true);

    // Setup static environment
    const blackMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
    const planeGeometry = new THREE.PlaneGeometry(8, 60);
    const worldGround = new THREE.Mesh(planeGeometry, blackMaterial);
    worldGround.rotation.x = THREE.MathUtils.degToRad(-90);
    worldGround.position.z = -30;
    worldGround.position.y = -1;
    gameState.sceneAdd(worldGround);

    const worldRoof = new THREE.Mesh(planeGeometry, blackMaterial);
    worldRoof.rotation.x = THREE.MathUtils.degToRad(90);
    worldRoof.position.z = -30;
    worldRoof.position.y = 4;
    gameState.sceneAdd(worldRoof);

    // Render environment, move objects and make them despawn when out of range
    const updateEnvironment = (delta : number) => {

        updateFloors(delta);
        updateLeftWalls(delta);
        updateRightWalls(delta);
        updateUpperWalls(delta);
        updateRoofs(delta);
        updateLamps(delta);
    }

    gameState.addLogicHandler(updateEnvironment);

    GUIManager.registerEnvironment();
}

// Adds static ground and walls to physics world
function setupPhysicsEnvironment() {
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
    });
    groundBody.type = CANNON.Body.STATIC;
    groundBody.mass = 0;
    groundBody.updateMassProperties();
    groundBody.aabbNeedsUpdate = true;
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, -0.95, 0);
    gameState.worldAdd(groundBody);
    
    const wallBody1 = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
    });
    wallBody1.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    wallBody1.position.set(2.5, 0, 0);
    gameState.worldAdd(wallBody1);
    
    const wallBody2 = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    wallBody2.quaternion.setFromEuler(0, Math.PI / 2, 0);
    wallBody2.position.set(-2.5, 0, 0);
    gameState.worldAdd(wallBody2);
}

// TODO : finish this comment because I have no idea what will this function do 
function setupObstacles() {
    obstacleManager = ObstacleManager.getInstance();
}

// Generate a moving environment from given asset, max number, offset between instances, and given shadow preset
// Returns update function
function generateMovingAsset(asset : string, maxNumber = 30, offset = 0.08, castShadow = true, receiveShadow = false) {
    const instances : THREE.Object3D[] = [];
    const despawnPosition = 10;
    let originalInstance : THREE.Object3D;

    // Create instance
    gameState.loadGLTF(`./assets/${asset}`, function (gltf) {
        const instance = gltf.scene;
        instance.position.set(0, 0, 0);
        setShadow(gltf.scene, castShadow, receiveShadow);
        modifyObjectMaterial(gltf.scene);
        originalInstance = instance;
    });

    const updateLoop = (delta : number) => {
        // Generate asset
        if(originalInstance != null) {
            if(instances.length < maxNumber) {
                const newInstance = originalInstance.clone(true);
                const newPosition = instances[instances.length -1]?.position ?? new THREE.Vector3(0, 0, 7);
                const box3 = new THREE.Box3().setFromObject(newInstance);
                const size = new THREE.Vector3();
                box3.getSize(size);
                newInstance.position.z = newPosition.z - size.z - offset;
                
                instances.push(newInstance);
                gameState.sceneAdd(newInstance);
            }
        }

        // Move asset and remove any that are out of camera sight
        for(const instance of instances) {
            instance.position.z += gameState.movingSpeed * delta;
            if(instance.position.z >= despawnPosition) {
                gameState.sceneRemove(instance);
                instances.splice(instances.findIndex(i => i.uuid === instance.uuid), 1);
            }
        }
    }

    return updateLoop;
}

// Render the scene
function render(composer : postprocessing.EffectComposer, bloomComposer : EffectComposer) {
    const materials : any = {};
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(2);
    const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });

    function darkenNonBloomed(obj : THREE.Object3D) {
        if (obj instanceof THREE.Mesh  && bloomLayer.test(obj.layers) === false) {
            materials[obj.uuid] = obj.material;
            obj.material = darkMaterial;
        }
    }

    function restoreMaterial(obj : THREE.Object3D) {
        if (obj instanceof THREE.Mesh && materials[obj.uuid]) {
            obj.material = materials[ obj.uuid ];
            delete materials[obj.uuid];
        }
    }

    gameState.sceneTraverse(darkenNonBloomed);
    bloomComposer.render();
    gameState.sceneTraverse(restoreMaterial);
    composer.render();
}