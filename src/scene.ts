/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from "three-csg-ts";
import { FLOOR_ASSET, LAMP_ASSET, LEFT_WALL_ASSET, MIX_FRAGMENT_SHADER, MIX_VERTEX_SHADER, RIGHT_WALL_ASSET, ROOF_ASSET, UPPER_WALL_ASSET } from "./constants";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as postprocessing from "postprocessing";
import TrailRenderer from "./libs/TrailRenderer.ts";
import { GodraysPass } from "./libs/GoodGodRays";
import GUIManager from "./utils/GUIManager.ts";
import HelperManager from "./utils/HelperManager.ts";
import * as CANNON from "cannon-es";
import Sword from "./models/Sword.ts";
import GameState from "./models/GameState.ts";

// Define global GameState
const gameState = GameState.getInstance();

// Global GLTF loader
const loader = new GLTFLoader();

// Global mouse coordinates
let swordMouse = new THREE.Vector2();
let mouseDirection = new THREE.Vector2();
let sword : Sword = new THREE.Object3D();
let swordBB = new OBB();
const cubes : any[] = []; // Only for debug
const slicedCubes : any[] = []; // Only for debug

const helperManager = new HelperManager();

export function createScene() {
    // Create scene
    const camera = createCamera();
    const renderer = createRenderer(camera);

    gameState.addLogicHandler((delta : number) => { helperManager.update(delta) });

    setupLighting();

    setupEnvironment();

    setupPhysicsEnvironment();

    createSword();

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

            // Update physics
            for(const cutPiece of slicedCubes) {
                const cutPieceBody = cutPiece.userData.body;
                cutPieceBody.position.z += gameState.movingSpeed * delta;
                cutPiece.position.set(cutPieceBody.position.x, cutPieceBody.position.y, cutPieceBody.position.z);
                cutPiece.quaternion.set(cutPieceBody.quaternion.x, cutPieceBody.quaternion.y, cutPieceBody.quaternion.z, cutPieceBody.quaternion.w);
            }

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

// Create sword model, bounding box and helper
function createSword() {
    loader.load("./assets/katana.glb", (obj) => {
        sword = obj.scene as Sword;
        sword.position.set(0, 0.65, -0.80);
        sword.up = new THREE.Vector3(0, 0, 1);

        sword.traverse(obj => {
            if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
                obj.material.flatShading = true;
            }
        })

        // Get model size
        const box3 = new THREE.Box3().setFromObject(sword);
        let size = new THREE.Vector3();
        box3.getSize(size);
        size.x /= 2.5;
        size.y /= 2.5;

        sword.userData.size = size;
        swordBB = new OBB(new THREE.Vector3(), sword.userData.size);

        // Setup contact points
        sword.userData.contactPoints = [];
        for(let i = 0; i < 2; i++) {
            const pointGeo = new THREE.BoxGeometry(0.0, 0.0, 0.0);
            const point = new THREE.Mesh(pointGeo);
            sword.add(point);
            point.position.z = size.z * -i;
            point.position.y = size.y / 2;
            sword.userData.contactPoints.push(point);
        }

        // Setup a point for the trail to follow
        const tpGeo = new THREE.BoxGeometry(0.0, 0.0, 0.0);
        const tp = new THREE.Mesh(tpGeo);
        sword.add(tp);
        tp.position.z = -size.z + 0.2;
        tp.position.y = size.y + 0.1;
        sword.userData.trailPoint = tp;

        sword.layers.toggle(2);
        sword.traverse((obj) => {
            if(obj.parent?.name === "Blade")
            obj.layers.toggle(2);
        });

        gameState.sceneAdd(sword);

        gameState.addLogicHandler(handleCollisions);
        createSwordTrail(sword);
        helperManager.createSwordHelper(sword, size);
    });

}

// Create sword trail
function createSwordTrail(sword : THREE.Object3D) {
    const speedToShowTrail = 7000;
    const fadeOutFactor = 1;
    const fadeInFactor = 2;
    const maxOpacity = 0.2;

    const headGeometry = [];
    headGeometry.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.205, 2.3));

    const trail = new TrailRenderer(gameState.getScene(), false);

    const material = TrailRenderer.createBaseMaterial();

    material.uniforms.headColor.value.set(0.84, 0.85,1, 0.2);
    material.uniforms.tailColor.value.set(0.64, 0.65, 1, 0.0);

    const trailLength = 20;

    trail.initialize(material, trailLength, false, 0, headGeometry, sword.userData.trailPoint);
    trail.activate();
    trail.advance();

    let lastUpdate = performance.now();
    let opacityGoingUp = false;
    const prevMouse = new THREE.Vector2(-1, -1);

    const updateTrail = (delta : number) => {
        // Update trail mesh
        const time = performance.now();
        if (time - lastUpdate > 10) {
            trail.advance();
            lastUpdate = time;
        } 
        else {
            trail.updateHead();
        }

        // Update trail opacity
        if(prevMouse.x !== -1 ) {
            const distance = Math.sqrt(Math.pow(prevMouse.x - gameState.mouse.x, 2) + Math.pow(prevMouse.y - gameState.mouse.y, 2));
            const speed = distance / delta;

            if(speed > speedToShowTrail && trail.material.uniforms.headColor.value.w < 0.2) {
                opacityGoingUp = true;
            }

            if(opacityGoingUp) {
                trail.material.uniforms.headColor.value.w += fadeInFactor * delta; 
                if(trail.material.uniforms.headColor.value.w >= maxOpacity) {
                    opacityGoingUp = false;
                }
            }
            else { 
                trail.material.uniforms.headColor.value.w = Math.max(trail.material.uniforms.headColor.value.w - fadeOutFactor * delta, 0);
            }
        }

        prevMouse.x = gameState.mouse.x;
        prevMouse.y = gameState.mouse.y;
    }

    gameState.addLogicHandler(updateTrail);
}

// Create and configure camera and sword controls
function createControls(camera : THREE.Camera) {

    document.onmousemove = (e) => {
        e.preventDefault();

        controlCamera(e, camera);
        controlSword(e);
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

// Take mouse event as input and handle sword controls - position, rotatio, bounding box etc
function controlSword(e : MouseEvent) {
    const prevMouse = new THREE.Vector2();
    prevMouse.copy(swordMouse);
    swordMouse.x = (e.offsetX / window.innerWidth) * 2 - 1;
    swordMouse.y = -(e.offsetY / window.innerHeight) * 2 + 1;
    const deltaI = new THREE.Vector2(swordMouse.x - prevMouse.x, swordMouse.y - prevMouse.y);
    mouseDirection.x = Math.max(Math.min(mouseDirection.x + deltaI.x * 3.5, 1), -1);
    mouseDirection.y = Math.max(Math.min(mouseDirection.y + deltaI.y * 3.5, 1), -1);

    // Calculate which way the blade is facing
    const p = mouseDirection.x / Math.sqrt(Math.pow(mouseDirection.x, 2) + Math.pow(mouseDirection.y, 2));
    const beta = Math.asin(p);
    let alpha = THREE.MathUtils.radToDeg(beta);
    if(mouseDirection.y >= 0) alpha = -180 - THREE.MathUtils.radToDeg(beta);

    sword.position.x = 0;
    sword.position.y = 0.7;
    sword.rotation.x = THREE.MathUtils.degToRad(swordMouse.y * 70);
    sword.rotation.y = THREE.MathUtils.degToRad(swordMouse.x * -90);
    sword.rotation.z = THREE.MathUtils.degToRad(alpha); 
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
    const despawnPosition = 5;
    const maxNumber = 10;
    const distance = 10;
    let originalInstance : THREE.Object3D;

    // Create instance
    loader.load(`./assets/obstacle_test.glb`, function (gltf) {
        const instance = gltf.scene.children[0]; // TODO : this might break
        originalInstance = instance;
    });

    const updateObstacles = (delta : number) => {
        if(originalInstance != null) {
            if(cubes.length < maxNumber) {
                const newInstance = originalInstance.clone(true);
                const newPosition = cubes[cubes.length -1]?.cube.position ?? new THREE.Vector3(0, 0, 0);
                const box3 = new THREE.Box3().setFromObject(newInstance);
                const size = new THREE.Vector3();
                box3.getSize(size);
                newInstance.position.z = newPosition.z - distance; // TODO : randomize a bit

                const cubeBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
                cubeBB.setFromObject(newInstance);

                cubes.push({ cube: newInstance, cubeBB });
                gameState.sceneAdd(newInstance);
            }
        }

        for(const { cube } of cubes) {
            cube.position.z += gameState.movingSpeed * delta;
            if(cube.position.z >= despawnPosition) {
                gameState.sceneRemove(cube);
                cubes.splice(cubes.findIndex(c => c.cube.uuid === cube.uuid), 1);
            }
        }
    }

    gameState.addLogicHandler(updateObstacles);
}

// Generate a moving environment from given asset, max number, offset between instances, and given shadow preset
// Returns update function
function generateMovingAsset(asset : string, maxNumber = 30, offset = 0.08, castShadow = true, receiveShadow = false) {
    const instances : THREE.Object3D[] = [];
    const despawnPosition = 10;
    let originalInstance : THREE.Object3D;

    // Create instance
    loader.load(`./assets/${asset}`, function (gltf) {
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

// Update bounding boxes, handle collisions with sword and other objects
function handleCollisions() {
    const cutForce = 3; // How much force should be applied to pieces that get cut off
    
    // Update sword bounding box
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Euler();
    rotation.copy(sword.rotation);
    
    matrix.makeRotationFromEuler(rotation);
    const position = new THREE.Vector3();
    position.copy(sword.position);
    if(sword.userData.size) {
        const matrix3 = new THREE.Matrix3();
        matrix3.setFromMatrix4(matrix);
        swordBB.set(position, sword.userData.size, matrix3);
    }

    // Update cubes bounding boxes
    for(const {cube, cubeBB} of cubes) {
        cubeBB.copy(cube.geometry.boundingBox).applyMatrix4(cube.matrixWorld);
    }

    // Check sword collisions with objects
    for(const {cube, cubeBB} of cubes) {
        if(swordBB.intersectsBox3(cubeBB) && cube.userData.collided !== true) { // Collision occured
            const point = sword.userData.contactPoints[1];
            let worldPos = new THREE.Vector3();
            point.getWorldPosition(worldPos);
            cube.userData.collisionPoint = worldPos;
            cube.userData.collided = true;
        }
        else if(!swordBB.intersectsBox3(cubeBB) && cube.userData.collided === true) { // Stopped colliding
            cube.userData.collided = false;

            const col1 = new THREE.Vector3();
            const col2 = new THREE.Vector3();
            col1.copy(cube.userData.collisionPoint);
            sword.userData.contactPoints[1].getWorldPosition(col2);
            const cutDirection = new THREE.Vector3(col2.x - col1.x, col2.y - col1.y, col2.z - col1.z);

            const points : THREE.Vector3[] = [cube.userData.collisionPoint];
            for(const point of sword.userData.contactPoints ?? []) { // Go through each contact point on the sword
                const worldPos = new THREE.Vector3();
                point.getWorldPosition(worldPos);
                points.push(worldPos);
            }
            cube.userData.collisionPoints = null;

            // Generate a plane, which cuts through the object
            const plane = new THREE.Plane(new THREE.Vector3(0.0, 0.0, 0.0));
            plane.setFromCoplanarPoints(points[0], points[1], points[2]);

            cube.updateMatrix();
            cube.updateMatrixWorld();

            const geometry = new THREE.PlaneGeometry(10, 10);
            const planeMesh = new THREE.Mesh(geometry);
            const planeMesh2 = new THREE.Mesh(geometry);

            // Points to tell, if the normal is facing the obstacle or not
            const v1 = new THREE.Vector3();
            const v2 = new THREE.Vector3();
            v1.copy(points[0]).add(plane.normal);
            v2.copy(points[0]).sub(plane.normal);

            // Create 2 planes, one with flipped normal to correctly clip both sides
            // planeMesh is the one that leaves behind a cut piece with physics
            if(v1.distanceTo(cube.position) > v2.distanceTo(cube.position)) {
                planeMesh.position.copy(plane.normal);
                planeMesh.position.multiplyScalar(-plane.constant);
                planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                planeMesh.userData.normal = new THREE.Vector3();
                planeMesh.userData.normal.copy(plane.normal);

                plane.negate();

                planeMesh2.position.copy(plane.normal);
                planeMesh2.position.multiplyScalar(-plane.constant);
                planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                planeMesh2.userData.normal = new THREE.Vector3();
                planeMesh2.userData.normal.copy(plane.normal);
            }
            else {
                planeMesh2.position.copy(plane.normal);
                planeMesh2.position.multiplyScalar(-plane.constant);
                planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                planeMesh2.userData.normal = new THREE.Vector3();
                planeMesh2.userData.normal.copy(plane.normal);

                plane.negate();

                planeMesh.position.copy(plane.normal);
                planeMesh.position.multiplyScalar(-plane.constant);
                planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                planeMesh.userData.normal = new THREE.Vector3();
                planeMesh.userData.normal.copy(plane.normal);
            }

            // Update plane matrices
            planeMesh.updateMatrix();
            planeMesh2.updateMatrix();

            // Cut through object (CSG)
            const res = CSG.subtract(cube, planeMesh); // TODO : Maybe name it something better that "res"
            res.updateMatrix();
            res.updateMatrixWorld();

            const res2 = CSG.subtract(cube, planeMesh2);

            const box3 = new THREE.Box3().setFromObject(res);
            const size = new THREE.Vector3();
            box3.getSize(size);

            // The result of the CSG operation has the pivot in the same location as the main mesh, this resets it to center
            const boundingBox = new  THREE.Box3();
            boundingBox.setFromObject(res);

            const middle = new THREE.Vector3();
            const g = res.geometry;
        
            g.computeBoundingBox();

            if(g.boundingBox) {
                middle.x = (g.boundingBox.max.x + g.boundingBox.min.x) / 2;
                middle.y = (g.boundingBox.max.y + g.boundingBox.min.y) / 2;
                middle.z = (g.boundingBox.max.z + g.boundingBox.min.z) / 2;
            }
        
            res.localToWorld(middle);

            res.geometry.center();
            res.updateMatrix();
            res.updateMatrixWorld();

            const cutPieceBody = new CANNON.Body({
                mass: Math.max(8 * size.x * size.y * size.z, 0.3),
                shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
                position: new CANNON.Vec3(middle.x, middle.y, middle.z),
            });

            cutPieceBody.updateMassProperties();
            cutPieceBody.aabbNeedsUpdate = true;
            gameState.worldAdd(cutPieceBody);

            res.userData.body = cutPieceBody;
            res.position.copy(middle);

            cutPieceBody.applyLocalImpulse(new CANNON.Vec3(cutDirection.x * cutForce, cutDirection.y * cutForce, cutDirection.z * cutForce), new CANNON.Vec3(0, 0, 0));

            const res2BB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
            res2BB.setFromObject(res2);

            gameState.sceneAdd(res);
            gameState.sceneAdd(res2);
            gameState.sceneRemove(cube);
            slicedCubes.push(res);
            cubes[cubes.findIndex(c => c.cube.uuid === cube.uuid)] = { cube: res2, cubeBB: res2BB };

            // Remove cut piece after 2 seconds
            setTimeout(() => {
                gameState.sceneRemove(res);
                gameState.worldRemove(cutPieceBody);
                slicedCubes.splice(slicedCubes.findIndex(i => i.uuid === res.uuid), 1);
            }, 2000);
       
            gameState.movingSpeed = 0; // DEBUG
        }
    }
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