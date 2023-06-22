/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from "three-csg-ts";
import { FLOOR_ASSET, LAMP_ASSET, LEFT_WALL_ASSET, RIGHT_WALL_ASSET, ROOF_ASSET, UPPER_WALL_ASSET } from "./constants";
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import * as postprocessing from "postprocessing";
import TrailRenderer from "./libs/TrailRenderer";
import { GodraysPass } from "./libs/GoodGodRays";

// Global GLTF loader
const loader = new GLTFLoader();

// Global mouse coordinates
let mouse = new THREE.Vector2(-1, -1);
let swordMouse = new THREE.Vector2();
let mouseDirection = new THREE.Vector2();
let sword = new THREE.Object3D();
let swordBB = new OBB();
const swordHelper = new THREE.Object3D();
const cubes = []; // Only for debug
const slicedCubes = []; // Only for debug
const gui = new GUI();
const movingSpeed = 3.5;

// Array of functions that are called in given order every frame
const logicHandlers = [];

export function createScene() {
    // Create scene
    const scene = new THREE.Scene();
    const camera = createCamera();
    const renderer = createRenderer(scene, camera);

    setupLighting(scene);

    setupEnvironment(scene);

    createSword(scene);

    createControls(camera);

    const {composer, bloomComposer} = setupPostProcessing(scene, camera, renderer);

    const clock = new THREE.Clock();

    const stats = new Stats();
    document.body.appendChild(stats.dom);

    const dt = 1000 / 60;
    let timeTarget = 0;

    // Animation loop
    function animate() {
        if(Date.now() >= timeTarget){
            const delta = clock.getDelta();

            for(const handler of logicHandlers) {
                handler({delta, scene});
            }

            // Move sliced pieces | TODO: remove this and update pieces in separate function
            for(const cube of slicedCubes) {
                cube.position.x += cube.userData.normal.x * delta * 2;
                cube.position.y += cube.userData.normal.y * delta * 2;
                cube.position.z += cube.userData.normal.z * delta * 2;
            }

            // TODO: Make this thing prettier, maybe move it out of here or smth
            scene.traverse(darkenNonBloomed);
            bloomComposer.render();
            scene.traverse(restoreMaterial);
            composer.render();

            timeTarget += dt;
            if(Date.now() >= timeTarget){
                timeTarget = Date.now();
            }

            stats.update();
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

    return { scene };
}

// Create and cofigure camera and return it
function createCamera() {
    const camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.1,
        400,
    );
    camera.position.set(0, 1.2, 0);
    camera.lookAt(0, 0.5, -5);

    return camera;
}

// Create sword model, bounding box and helper
function createSword(scene) {
    loader.load("./assets/katana.glb", (obj) => {
        sword = obj.scene;
        sword.position.set(0, 0.7, -0.85);
        sword.up = new THREE.Vector3(0, 0, 1);

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

        // Setup helper
        const swordHelperGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const shMesh = new THREE.Mesh(swordHelperGeometry, new THREE.MeshBasicMaterial());
        shMesh.material.wireframe = true;
        shMesh.position.set(0, 0, -sword.userData.size.z / 2);
        swordHelper.up = new THREE.Vector3(0, 0, 1);
        swordHelper.add(shMesh);
        //scene.add(swordHelper);

        sword.layers.toggle(2);
        sword.traverse((obj) => { // TODO: Make this shit better
            if(obj.parent?.name === "Blade")
            obj.layers.toggle(2);
        });

        scene.add(sword);

        logicHandlers.push(handleCollisions);
    });

    createSwordTrail(scene);
}

// Create sword trail
function createSwordTrail(scene) {
    const speedToShowTrail = 7000;
    const fadeOutFactor = 1;
    const fadeInFactor = 2;
    const maxOpacity = 0.2;

    const headGeometry = [];
    headGeometry.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.205, 2.3));

    const trail = new TrailRenderer(scene, false);

    const material = TrailRenderer.createBaseMaterial();	

	material.uniforms.headColor.value.set(0.84, 0.85,1, 0.2);
    material.uniforms.tailColor.value.set(0.64, 0.65, 1, 0.0);

    const trailLength = 20;

    trail.initialize(material, trailLength, false, 0, headGeometry, sword);

    let lastUpdate = performance.now();
    let opacityGoingUp = false;
    const prevMouse = new THREE.Vector2(-1, -1);

    logicHandlers.push(({ delta }) => {
        if(sword.userData.trailPoint && !trail.isActive) {
            trail.targetObject = sword.userData.trailPoint;
            trail.activate();
        }

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
            const distance = Math.sqrt(Math.pow(prevMouse.x - mouse.x, 2) + Math.pow(prevMouse.y - mouse.y, 2));
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

        prevMouse.x = mouse.x;
        prevMouse.y = mouse.y;
    });
}

// Create and configure camera and sword controls
function createControls(camera) {

    document.onmousemove = (e) => {
        e.preventDefault();

        controlCamera(e, camera);
        controlSword(e);
    }
}

// Take mouse event and camera as input and handle controls for the camera
function controlCamera(e, camera) {
    const delta = new THREE.Vector2();

    if(mouse.x === -1 && mouse.y === -1) {
        delta.x = window.innerWidth / 2 - e.offsetX;
        delta.y = window.innerHeight / 2 - e.offsetY;
    }
    else {
        delta.x = mouse.x - e.offsetX;
        delta.y = mouse.y - e.offsetY;
    }

    mouse.x = e.offsetX;
    mouse.y = e.offsetY;

    camera.rotation.y += delta.x / 5000;
    camera.rotation.x += delta.y / 5000;
}

// Take mouse event as input and handle sword controls - position, rotatio, bounding box etc
function controlSword(e) {
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
function createRenderer(scene, camera) {
    const renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: false,
        depth: true,
        canvas: document.querySelector("#canvas"),
    });

    renderer.localClippingEnabled = true;
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    
    resizeRenderer(renderer);

    renderer.render(scene, camera);
    renderer.shadowMap.enabled = true; // TODO: Causes LAG?
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true; //?
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.setPixelRatio(window.devicePixelRatio * 1.5); // TODO: Causes LAG?
    renderer.toneMappingExposure = 1.16;
    renderer.useLegacyLights = false;
    renderer.setClearColor(0x000000);

    return renderer;
}

// Set's the renderers size to current window size
function resizeRenderer(renderer) {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Configure postprocessing and return composer
function setupPostProcessing(scene, camera, renderer) {
    const renderScene = new RenderPass(scene, camera);
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

    const gui_bloom = gui.addFolder("Bloom Effect");
    gui_bloom.close();
    gui_bloom.add(bloomPass, 'threshold', 0, 2);
    gui_bloom.add(bloomPass, 'strength', 0, 2);
    gui_bloom.add(bloomPass, 'radius', 0.0, 2);

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

    //scene.add(grLight.target);
    //scene.add(grLight);

    const godraysPass = new GodraysPass(grLight, camera, {
        density: 0.03,
        maxDensity: 0.1,
        distanceAttenuation: 2,
        color: new THREE.Color(0xffffff).getHex(),
        edgeStrength: 2,
        edgeRadius: 2,
        raymarchSteps: 60,
        enableBlur: true,
        blurVariance: 0.1,
        blurKernelSize: postprocessing.KernelSize.MEDIUM,
    });

    const mixPass = new postprocessing.ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
            defines: {}
        }), 'baseTexture'
    );
    mixPass.needsSwap = true;

    const renderPass = new postprocessing.RenderPass(scene, camera);

    composer.addPass(renderPass);
    composer.addPass(mixPass);
    composer.addPass(godraysPass);
    composer.addPass(new postprocessing.EffectPass(camera));

    return {composer, bloomComposer};
}

// Set shadows on given object to given settings
function setShadow(obj, cast = false, receive = false) {
    obj.castShadow = cast;
    obj.receiveShadow = receive;
    if (obj?.children != null) {
        for (const child of obj.children) {
            setShadow(child, cast, receive);
        }
    }
}

function generateLightOnEmission(obj) {
    if(obj.material?.emissiveIntensity > 1) {
        obj.material.emissiveIntensity = 1;
        const pointLight = new THREE.PointLight(0xffffff, 7.2, 0, 2);
        pointLight.position.y = -1.4;
        pointLight.castShadow = false;
        obj.add(pointLight); // TODO: Causes LAG?
    }
    if(obj.material?.opacity < 1) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.material.emissive = new THREE.Color(0xbeb979);
        obj.material.emissiveIntensity = 0.8;
        obj.material.opacity = 1;
        obj.material.depthWrite = false;
    }
    if (obj?.children != null) {
        for (const child of obj.children) {
            generateLightOnEmission(child);
        }
    }
}

// Create and configure lighting in the scene
function setupLighting(scene) {
    const hemiLight = new THREE.HemisphereLight(0xe5e7ff, 0xd2b156, 1,925);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

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
    scene.add(dirLight);

    // Lihgting GUI
    const params = {
        sky: 0xe5e7ff,
        ground: 0xd2b156,
        intensity: 1.75
    }

    const gui_hemiLight = gui.addFolder('Hemisphere Light');
    gui_hemiLight.close();
    gui_hemiLight.addColor(params, 'sky').onChange(function(value) { hemiLight.color  = new THREE.Color(value); });
    gui_hemiLight.addColor(params, 'ground').onChange(function(value) { hemiLight.groundColor  = new THREE.Color(value); });
    gui_hemiLight.add(hemiLight, "intensity", 0, 7)
}

// Create and setup anything environment-related
function setupEnvironment(scene) {
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(scene.background, 40, 65);

    // Fog GUI
    const gui_bg = gui.addFolder("World Settings");
    gui_bg.close();

    const params = {
        background: '#000000',
        size: 0.027,
        near: 40,
        far: 65
    };

    gui_bg.addColor(params, 'background').onChange(function(value) {
        scene.background.set(value);
        scene.fog  = new THREE.Fog(value, params.near, params.far);
    });
    gui_bg.add(params, 'size', 0, 0.1).onChange(function(value) { scene.fog = new THREE.Fog(scene.background, params.near, params.far); });
    gui_bg.add(params, 'near', 20, 100).onChange(function(value) { scene.fog = new THREE.Fog(scene.background, value, params.far); });
    gui_bg.add(params, 'far', 20, 100).onChange(function(value) { scene.fog = new THREE.Fog(scene.background, params.near, value); });

    // Setup moving environment
    const updateFloors = generateMovingAsset(FLOOR_ASSET, 15, 0, movingSpeed, true, true);
    const updateLeftWalls = generateMovingAsset(LEFT_WALL_ASSET, 7, -0.05, movingSpeed, true, true);
    const updateRightWalls = generateMovingAsset(RIGHT_WALL_ASSET, 7, 0, movingSpeed, true, true);
    const updateUpperWalls = generateMovingAsset(UPPER_WALL_ASSET, 7, 0, movingSpeed, true, true);
    const updateRoofs = generateMovingAsset(ROOF_ASSET, 20, 0, movingSpeed, true, true);
    const updateLamps = generateMovingAsset(LAMP_ASSET, 10, 7, movingSpeed, true, true);

    // Setup static environment
    const blackMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
    const planeGeometry = new THREE.PlaneGeometry(8, 60);
    const worldGround = new THREE.Mesh(planeGeometry, blackMaterial);
    worldGround.rotation.x = THREE.MathUtils.degToRad(-90);
    worldGround.position.z = -30;
    worldGround.position.y = -1;
    scene.add(worldGround);

    const worldRoof = new THREE.Mesh(planeGeometry, blackMaterial);
    worldRoof.rotation.x = THREE.MathUtils.degToRad(90);
    worldRoof.position.z = -30;
    worldRoof.position.y = 4;
    scene.add(worldRoof);

    // Cube
    /*const spawnCubes = () => {
        let geometry
        if(Math.random() > 0.5) {
            const rnd = Math.random() * (1 - 0.75) + 0.75;
            geometry = new THREE.BoxGeometry(0.35 * rnd, 2 * rnd, 0.35 * rnd);
        }
        else {
            const rnd = Math.random() * (1 - 0.75) + 0.75;
            geometry = new THREE.BoxGeometry(2 * rnd, 0.35 * rnd, 0.35 * rnd);
        }
        const cube = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x98f055}));
        const cubeBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        cube.position.set(0, 1, -10);
        setShadow(cube, true, false);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        cubeBB.setFromObject(cube);
        cubes.push({cube, cubeBB});
        setTimeout(spawnCubes, 1500);
    }

    spawnCubes();*/

    // Render and animate animated environment, move with objects and make them despawn when out of range
    let mixer;
    logicHandlers.push(({ delta, scene }) => {
        if (mixer) mixer.update(delta);
        for(const {cube} of cubes) {
            cube.position.z += movingSpeed * delta;
        }

        updateFloors(scene, delta);
        updateLeftWalls(scene, delta);
        updateRightWalls(scene, delta);
        updateUpperWalls(scene, delta);
        updateRoofs(scene, delta);
        updateLamps(scene, delta);
    });
    //mixer = new THREE.AnimationMixer(envAnimated);
}

// Generate a moving environment from given asset, max number, offset between instances, given speed and given shadow preset
// Returns update function
function generateMovingAsset(asset, maxNumber = 30, offset = 0.08, speed = 2, castShadow = true, receiveShadow = false) {
    const instances = [];
    let originalInstance = undefined;

    // Create instance
    loader.load(`./assets/${asset}`, function (gltf) {
        const instance = gltf.scene;
        instance.position.set(0, 0, 0);
        setShadow(gltf.scene, castShadow, receiveShadow);
        generateLightOnEmission(gltf.scene);
        originalInstance = instance;
    });

    const updateLoop = (scene, delta) => {
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
                scene.add(newInstance);
            }
        }

        // Move asset and remove any that are out of camera sight
        for(const instance of instances) {
            instance.position.z += speed * delta;
            if(instance.position.z >= 10) { // TODO: Change for some constant
                scene.remove(instance);
                instances.splice(instances.findIndex(i => i.uuid === instance.uuid), 1);
            }
        }
    }

    return updateLoop;
}

// Update bounding boxes, handle collisions with sword and other objects
function handleCollisions({scene}) {
    // Update sword bounding box
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Euler();
    rotation.copy(sword.rotation);
    
    matrix.makeRotationFromEuler(rotation);
    const position = new THREE.Vector3();
    position.copy(sword.position);
    if(sword.userData.size) {
        swordBB.set(position, sword.userData.size, matrix);
    }

    // Update sword bounding box helper
    swordHelper.position.copy(position);
    swordHelper.setRotationFromMatrix(matrix);

    // Update cubes bounding boxes
    for(const {cube, cubeBB} of cubes) {
        cubeBB.copy(cube.geometry.boundingBox).applyMatrix4(cube.matrixWorld);
    }

    // Check sword collisions with objects
    for(const {cube, cubeBB} of cubes) {
        if(swordBB.intersectsBox3(cubeBB) && cube.userData.collided !== true) { // Collision occured
            for(const point of sword.userData.contactPoints ?? []) { // Go through each contact point on the sword
                let worldPos = new THREE.Vector3();
                point.getWorldPosition(worldPos);
                cube.userData.collisionPoints = cube.userData.collisionPoints == null ? [worldPos] : [...cube.userData.collisionPoints, worldPos];
            }
            cube.userData.collided = true;
        }
        else if(!swordBB.intersectsBox3(cubeBB) && cube.userData.collided === true) { // Stopped colliding
            cube.userData.collided = false;
            let worldPos = new THREE.Vector3();
            sword.userData.trailPoint.getWorldPosition(worldPos);

            const points = [...cube.userData.collisionPoints, worldPos];
            cube.userData.collisionPoints = null;

            // Generate a plane, which cuts through the object
            const plane = new THREE.Plane(new THREE.Vector3(0.0, 0.0, 0.0));
            plane.setFromCoplanarPoints(...points);

            // Create 2 planes, one with flipped normal to correctly clip both sides
            const geometry = new THREE.PlaneGeometry(10, 10);
            const planeMesh = new THREE.Mesh(geometry);
            planeMesh.position.copy(plane.normal);
            planeMesh.position.multiplyScalar(-plane.constant);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
            planeMesh.userData.normal = new THREE.Vector3();
            planeMesh.userData.normal.copy(plane.normal);

            plane.negate();

            const planeMesh2 = new THREE.Mesh(geometry);
            planeMesh2.position.copy(plane.normal);
            planeMesh2.position.multiplyScalar(-plane.constant);
            planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
            planeMesh2.userData.normal = new THREE.Vector3();
            planeMesh2.userData.normal.copy(plane.normal);

            // Update cube and plane matrices
            cube.updateMatrix();
            planeMesh.updateMatrix();
            planeMesh2.updateMatrix();

            // Cut through object (CSG)
            const res = CSG.subtract(cube, planeMesh);
            res.material = new THREE.MeshLambertMaterial({color:  0x98f055});
            res.userData.normal = planeMesh.userData.normal;
            scene.add(res);
            slicedCubes.push(res);

            const res2 = CSG.subtract(cube, planeMesh2);
            res2.material = new THREE.MeshLambertMaterial({color:  0x98f055});
            res2.userData.normal = planeMesh2.userData.normal;
            scene.add(res2);
            slicedCubes.push(res2);

            scene.remove(cube);
            cubes.splice(cubes.findIndex(c => c.cube.uuid === cube.uuid), 1);
        }
    }
}

// Variables and methods used for selective bloom effect
const materials = {};
const bloomLayer = new THREE.Layers();
bloomLayer.set(2);
const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });

function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
        obj.material = materials[ obj.uuid ];
        delete materials[obj.uuid];
    }
}