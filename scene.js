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
    let sword = new THREE.Object3D();
    loader.load("./assets/katana.glb", (obj) => {
        sword = obj.scene;
        sword.position.set(0, 1.3, -4.15);
        sword.up = new THREE.Vector3(0, 0, 1);
        scene.add(sword);
    });
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3);
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const testPlane = new THREE.Mesh(planeGeometry);
    testPlane.position.set(0, 0, -3.9);
    scene.add(testPlane);

    const raycaster = new THREE.Raycaster();
    const intersectPoint = new THREE.Vector3();
    const swordMouse = new THREE.Vector2(0, 0);
    let prevIntersect = null;

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
        //swordMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        //swordMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        swordMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        swordMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(swordMouse, camera);

        if(prevIntersect == null) {
            prevIntersect = new THREE.Vector3(0, 0, 0);
            raycaster.ray.intersectPlane(plane, prevIntersect); 
        } 
        else prevIntersect.copy(intersectPoint);

        raycaster.ray.intersectPlane(plane, intersectPoint);
        const deltaI = new THREE.Vector3(intersectPoint.x - prevIntersect.x, intersectPoint.y - prevIntersect.y, 0);

        //sword.position.x += deltaI.x / 50;
        //sword.position.y += deltaI.y / 50;
        sword.position.x = intersectPoint.x / 50;
        sword.position.y = 1.3 + intersectPoint.y / 50;
        sword.lookAt(intersectPoint);
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

    // Create walls
    let pos = {x: -40, z: -20};
    for(let i = 0; i < 4; i++) {
        const wallGeometry = new THREE.PlaneGeometry(40, 20);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.rotation.y = i * Math.PI / 2;
        wall.position.set(i % 2 == 0 ? 0 : pos.x, 10, i % 2 == 1 ? 0 : pos.z)
        pos.x += 20;
        pos.z += 20;
        setShadow(wall, false, true);
        scene.add(wall)
    }
 
    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const cube = new THREE.Mesh(geometry, wallMaterial);
    cube.position.set(0, 1, 0);
    setShadow(cube, true, false);
    scene.add(cube);
    

    // Render and animate animated environment
    let mixer;
    const updateMixer = (delta) => {
        if (mixer) mixer.update(delta);
    };
    //mixer = new THREE.AnimationMixer(envAnimated);

    return updateMixer;
}