/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from 'three-csg-ts';
import { FENCE_ASSET, GROUND_ASSET, SIDE_BAMBOOS_ASSET, SIDE_BAMBOOS_FAR_ASSET, SIDE_BAMBOOS_MID_ASSET, SIDE_GRASS_ASSET, SIDE_GROUND_ASSET } from "./constants";

// Global GLTF loader
const loader = new GLTFLoader();

// Global mouse coordinates
let mouse = {
    x: undefined,
    y: undefined
};
let swordMouse = new THREE.Vector2();
let intersectMouse = new THREE.Vector2();
let sword = new THREE.Object3D();
let swordBB = new OBB();
let swordHelper = new THREE.Mesh();
const cubes = [];
const slicedCubes = [];

export function createScene() {
    // Create scene
    const scene = new THREE.Scene();
    const camera = createCamera();
    const renderer = createRenderer(scene, camera);

    setupLighting(scene);

    const updateMixer = setupEnvironment(scene);

    createSword(scene);

    createControls(camera);

    const composer = setupPostProcessing(scene, camera, renderer);

    const clock = new THREE.Clock();

    // Animation loop
    function animate() {
        const delta = clock.getDelta();

        updateMixer(delta);

        handleCollisions(scene);

        // Move sliced pieces 
        for(const cube of slicedCubes) {
            cube.position.x += cube.userData.normal.x * delta * 2;
            cube.position.y += cube.userData.normal.y * delta * 2;
            cube.position.z += cube.userData.normal.z * delta * 2;
        }

        composer.render();
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / 60);
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
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        400,
    );
    camera.position.set(0, 1.2, 0);
    camera.lookAt(0, 0.5, 5);

    return camera;
}

// Create sword model, bounding box and helper
function createSword(scene) {
    loader.load("./assets/katana.glb", (obj) => {
        sword = obj.scene;
        sword.position.set(0, 0.7, 0.85);
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
            const phMesh = new THREE.BoxGeometry(0, 0, 0);
            const pH = new THREE.Mesh(phMesh);
            sword.add(pH);
            pH.position.z = size.z * i;
            pH.position.y = size.y / 2;
            sword.userData.contactPoints.push(pH);
        }

        // Setup helper
        const swordHelperGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const shMesh = new THREE.Mesh(swordHelperGeometry, new THREE.MeshBasicMaterial());
        swordHelper = new THREE.Object3D();
        shMesh.material.wireframe = true;
        shMesh.position.set(0, 0, sword.userData.size.z / 2);
        swordHelper.up = new THREE.Vector3(0, 0, 1);
        swordHelper.add(shMesh);

        //scene.add(swordHelper);
        scene.add(sword);
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
    if(mouse.x == undefined && mouse.y == undefined) {
        delta.x = window.innerWidth / 2 - e.offsetX;
        delta.y = window.innerHeight / 2 - e.offsetY;
    }
    else {
        delta.x = mouse.x - e.offsetX;
        delta.y = mouse.y - e.offsetY;
    }
    mouse = {x: e.offsetX, y: e.offsetY};
    camera.rotation.y -= delta.x / 5000;
    camera.rotation.x -= delta.y / 5000;
}

// Take mouse event as input and handle sword controls - position, rotatio, bounding box etc
function controlSword(e) {
    const prevMouse = new THREE.Vector2();
    prevMouse.copy(swordMouse);
    swordMouse.x = (e.offsetX / window.innerWidth) * 2 - 1;
    swordMouse.y = -(e.offsetY / window.innerHeight) * 2 + 1;
    const deltaI = new THREE.Vector2(swordMouse.x - prevMouse.x, swordMouse.y - prevMouse.y);
    intersectMouse.x = Math.max(Math.min(intersectMouse.x + deltaI.x * 3.5, 1), -1);
    intersectMouse.y = Math.max(Math.min(intersectMouse.y + deltaI.y * 3.5, 1), -1);

    // Calculate which way the blade is facing
    const p = intersectMouse.x / Math.sqrt(Math.pow(intersectMouse.x, 2) + Math.pow(intersectMouse.y, 2));
    const beta = Math.asin(p);
    let alpha = -THREE.MathUtils.radToDeg(beta);
    if(intersectMouse.y >= 0) alpha = 180 + THREE.MathUtils.radToDeg(beta);

    sword.position.x = 0;
    sword.position.y = 0.7;
    sword.rotation.x = THREE.MathUtils.degToRad(swordMouse.y * -70);
    sword.rotation.y = THREE.MathUtils.degToRad(swordMouse.x * -90);
    sword.rotation.z = THREE.MathUtils.degToRad(alpha); 
}

// Create and configure renderer and return it
function createRenderer(scene, camera) {
    const renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true,
        depth: true,
        canvas: document.querySelector("#canvas"),
    });

    renderer.localClippingEnabled = true;

    resizeRenderer(renderer);

    renderer.render(scene, camera);
    //renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return renderer;
}

// Set's the renderers size to current window size
function resizeRenderer(renderer) {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Configure postprocessing and return composer
function setupPostProcessing(scene, camera, renderer) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    return composer;
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

// Create and configure lighting in the scene
function setupLighting(scene) {
    // Ambient lighting
   /* const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Directional lighting and shadows
    const directionLight = new THREE.DirectionalLight(0xa0a0a2);
    directionLight.position.set(4, 8, 3);
    directionLight.castShadow = true;
    directionLight.shadow.mapSize.x = 2048;
    directionLight.shadow.mapSize.y = 2048;
    directionLight.shadow.camera.near = 0;
    directionLight.shadow.camera.far = 150.0;
    directionLight.shadow.camera.right = 75;
    directionLight.shadow.camera.left = -75;
    directionLight.shadow.camera.top = 75;
    directionLight.shadow.camera.bottom = -75;
    scene.add(directionLight);*/
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(- 1, 1.75, 1);
    dirLight.position.multiplyScalar(30);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;

    const d = 50;

    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;

    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = - 0.0001;
}

// Create and setup anything environment-related (things with which the user doesn't interact)
function setupEnvironment(scene) {
    //const sceneBackground = new THREE.Color(0x002412); //0x101218
    //scene.background = sceneBackground;
    //scene.fog = new THREE.Fog(0x002412, 10, 15);
    scene.background = new THREE.Color().setHSL(0.6, 1, 0.8);
    scene.fog = new THREE.Fog(scene.background, 1, 28);

    setInterval(() => {
        //const col = Math.random() * 0xffffff;
        //scene.fog = new THREE.Fog(col, 5, 15);
        //scene.background = new THREE.Color(col);
        //console.log(col);
    }, 3000);

    const movingSpeed = 3;

    // Setup moving environment
    const updateGrounds = generateMovingAsset(GROUND_ASSET, 30, 0.08, movingSpeed, false, true);
    const updateFences = generateMovingAsset(FENCE_ASSET, 20, 0.08, movingSpeed, true, false);
    const updateSideGrounds = generateMovingAsset(SIDE_GROUND_ASSET, 10, 0, movingSpeed, false, true);
    const updateSideBamboos = generateMovingAsset(SIDE_BAMBOOS_ASSET, 10, 0, movingSpeed, true, false);
    const updateSideBamboosMid = generateMovingAsset(SIDE_BAMBOOS_MID_ASSET, 10, 0, movingSpeed, true, false);
    const updateSideBamboosFar = generateMovingAsset(SIDE_BAMBOOS_FAR_ASSET, 10, 0, movingSpeed, true, false);
    const updateSideGrass = generateMovingAsset(SIDE_GRASS_ASSET, 30, 0, movingSpeed, true, false);

    // Create static environment
    const planeGeometry = new THREE.PlaneGeometry(50, 5);
    const sideWall1 = new THREE.Mesh(planeGeometry, new THREE.MeshLambertMaterial({color: 0x8C9F50}));
    sideWall1.position.set(-3, 0.4, 10)
    sideWall1.rotation.y = THREE.MathUtils.degToRad(90);
    //scene.add(sideWall1);

    const sideWall2 = sideWall1.clone();
    sideWall2.position.x = 3;
    sideWall2.rotation.y = THREE.MathUtils.degToRad(-90);
    //scene.add(sideWall2);

    const endWall = sideWall1.clone();
    endWall.position.z = 25;
    endWall.rotation.y = THREE.MathUtils.degToRad(180);
    //scene.add(endWall);

    const groundPlane = new THREE.Mesh(planeGeometry, new THREE.MeshLambertMaterial({color: 0x000000}));
    groundPlane.rotation.set(THREE.MathUtils.degToRad(270), 0, THREE.MathUtils.degToRad(90));
    groundPlane.position.y = -0.1;
    scene.add(groundPlane);


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
        cube.position.set(0, 1, 10);
        setShadow(cube, true, false);
        scene.add(cube);
        cubeBB.setFromObject(cube);
        cubes.push({cube, cubeBB});
        setTimeout(spawnCubes, 1500);
    }

    spawnCubes();*/

    // Render and animate animated environment, move with objects and make them despawn when out of range
    let mixer;
    const updateMixer = (delta) => {
        if (mixer) mixer.update(delta);
        /*for(const {cube} of cubes) {
            cube.position.z -= 2.8 * delta;
        }*/

        updateGrounds(scene, delta);
        updateFences(scene, delta);
        updateSideGrounds(scene, delta);
        updateSideBamboos(scene, delta);
        updateSideBamboosMid(scene, delta);
        updateSideBamboosFar(scene, delta);
        updateSideGrass(scene, delta);
    };
    //mixer = new THREE.AnimationMixer(envAnimated);

    return updateMixer;
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
        originalInstance = instance;
    });

    const updateLoop = (scene, delta) => {
        // Generate asset
        if(originalInstance != null) {
            if(instances.length < maxNumber) {
                const newInstance = originalInstance.clone(true);
                const newPosition = instances[instances.length -1]?.position ?? new THREE.Vector3();
                const box3 = new THREE.Box3().setFromObject(newInstance);
                const size = new THREE.Vector3();
                box3.getSize(size);
                newInstance.position.z = newPosition.z + size.z + offset;
                instances.push(newInstance);
                scene.add(newInstance);
            }
        }

        // Move asset and remove any that are out of camera sight
        for(const instance of instances) {
            instance.position.z -= speed * delta;
            if(instance.position.z <= -4) {
                scene.remove(instance);
                instances.splice(instances.findIndex(i => i.uuid === instance.uuid), 1);
            }
        }
    }

    return updateLoop;
}

// Update bounding boxes, handle collisions with sword and other objects
function handleCollisions(scene) {
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
            //cube.material = new THREE.MeshLambertMaterial({color: 0xff0000});
            for(const point of sword.userData.contactPoints ?? []) { // Go through each contact point on the sword
                let worldPos = new THREE.Vector3();
                point.getWorldPosition(worldPos);
                cube.userData.collisionPoints = cube.userData.collisionPoints == null ? [worldPos] : [...cube.userData.collisionPoints, worldPos];
            }
            cube.userData.collided = true;
        }
        else if(!swordBB.intersectsBox3(cubeBB) && cube.userData.collided === true) { // Stopped colliding
            //cube.material = new THREE.MeshLambertMaterial({color:  0x98f055});
            cube.userData.collided = false;
            let worldPos = new THREE.Vector3();
            sword.userData.contactPoints[1].getWorldPosition(worldPos);

            const points = [...cube.userData.collisionPoints, worldPos];
            cube.userData.collisionPoints = null;

            // Generate a plane, which cuts through the object
            const plane = new THREE.Plane(new THREE.Vector3(0.0, 0.0, 0.0));
            plane.setFromCoplanarPoints(...points);

            // Generate plane helper
            const planeHelper = new THREE.PlaneHelper(plane, 5);
            //scene.add(planeHelper);

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