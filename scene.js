/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Flow } from 'three/examples/jsm/modifiers/CurveModifier.js';

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
let swordBB = new THREE.Box3();
const cubes = [];

export function createScene() {
    // Create scene
    const scene = new THREE.Scene();
    const camera = createCamera();
    const renderer = createRenderer(scene, camera);

    setupLighting(scene);

    const updateMixer = setupEnvironment(scene);

    const controls = createControls(camera, scene);

    const composer = setupPostProcessing(scene, camera, renderer);

    const clock = new THREE.Clock();

    // Animation loop
    function animate() {
        const delta = clock.getDelta();

        updateMixer(delta);

        // Update sword bounding box
        swordBB.setFromObject(sword);

        // Update cubes bounding boxes
        for(const {cube, cubeBB} of cubes) {
            cubeBB.copy(cube.geometry.boundingBox).applyMatrix4(cube.matrixWorld);
        }

        // Check sword collisions with objects
        for(const {cube, cubeBB} of cubes) {
            if(swordBB.intersectsBox(cubeBB)) {
                cube.material = new THREE.MeshLambertMaterial({color: 0xff0000});
            }
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
    camera.position.set(0, 1.8, -5);
    camera.lookAt(0, 1.8, 0);

    return camera;
}

// Create and configure camera and sword controls
function createControls(camera, scene) {
    loader.load("./assets/katana.glb", (obj) => {
        sword = obj.scene;
        console.log(sword);
        sword.position.set(0, 1.3, -4.15);
        sword.up = new THREE.Vector3(0, 0, 1);
        swordBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        swordBB.setFromObject(sword);
        const helper = new THREE.Box3Helper(swordBB);
        scene.add(helper);
        console.log(swordBB)
        scene.add(sword);
    });

    //const dot = document.createElement("div");
    //dot.style.position = "absolute";
    //dot.style.pointerEvents = "none";
    //dot.style.width = "5px";
    //dot.style.height = "5px";
    //dot.style.backgroundColor = "red";
    //document.body.appendChild(dot);

    document.onmousemove = (e) => {
        e.preventDefault();

        // Camera controls
        const delta = {x: 0, y: 0};
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

        // Sword controls
        const prevMouse = new THREE.Vector2();
        prevMouse.copy(swordMouse);
        swordMouse.x = (e.offsetX / window.innerWidth) * 2 - 1;
        swordMouse.y = -(e.offsetY / window.innerHeight) * 2 + 1;
        const deltaI = new THREE.Vector2(swordMouse.x - prevMouse.x, swordMouse.y - prevMouse.y);
        intersectMouse.x = Math.max(Math.min(intersectMouse.x + deltaI.x * 3.5, 1), -1);
        intersectMouse.y = Math.max(Math.min(intersectMouse.y + deltaI.y * 3.5, 1), -1);

        //dot.style.top = `${Math.min(window.innerHeight / 2 - intersectMouse.y * window.innerHeight / 2, window.innerHeight - 10)}px`;
        //dot.style.left = `${Math.min(window.innerWidth / 2 + intersectMouse.x * window.innerWidth / 2, window.innerWidth - 10)}px`;

        const p = intersectMouse.x / Math.sqrt(Math.pow(intersectMouse.x, 2) + Math.pow(intersectMouse.y, 2));
        const beta = Math.asin(p);
        let alpha = -THREE.MathUtils.radToDeg(beta);
        if(intersectMouse.y >= 0) alpha = 180 + THREE.MathUtils.radToDeg(beta);

        sword.position.x = 0;
        sword.position.y = 1.3;
        sword.rotation.x = THREE.MathUtils.degToRad(swordMouse.y * -70);
        sword.rotation.y = THREE.MathUtils.degToRad(swordMouse.x * -90);
        sword.rotation.z = THREE.MathUtils.degToRad(alpha); 
    }
}

// Create and configure renderer and return it
function createRenderer(scene, camera) {
    const renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true,
        depth: true,
        canvas: document.querySelector("#canvas"),
    });

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
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
    scene.add(directionLight);
}

// Create and setup anything environment-related
function setupEnvironment(scene) {
    const sceneBackground = new THREE.Color(0x101218);
    scene.background = sceneBackground;

    const groundMaterial = new THREE.MeshLambertMaterial({color: 0xffffff}); 
    const wallMaterial = new THREE.MeshLambertMaterial({color: 0x98f055}); 
  
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x -= Math.PI / 2;
    setShadow(ground, false, true);
    scene.add(ground);

    // Cube
    const spawnCubes = () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const cube = new THREE.Mesh(geometry, wallMaterial);
        const cubeBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        cube.position.set(0, 1, 0);
        setShadow(cube, true, false);
        scene.add(cube);
        cubeBB.setFromObject(cube);
        cubes.push({cube, cubeBB});
        setTimeout(spawnCubes, 5000);
    }

    spawnCubes();

    // Render and animate animated environment
    let mixer;
    const updateMixer = (delta) => {
        if (mixer) mixer.update(delta);
        for(const cube of cubes) {
            cube.cube.position.z -= 0.8 * delta;
        }
    };
    //mixer = new THREE.AnimationMixer(envAnimated);

    return updateMixer;
}