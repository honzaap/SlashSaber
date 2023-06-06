/*
 *  Things that handle all the 3D stuff
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBB } from 'three/examples/jsm/math/OBB.js';

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
                cube.material = new THREE.MeshLambertMaterial({color: 0xff0000});
                for(const point of sword.userData.contactPoints ?? []) { // Go through each contact point on the sword
                    let worldPos = new THREE.Vector3();
                    point.getWorldPosition(worldPos);
                    if(cubeBB.containsPoint(worldPos)) { // Check if objects collides with given point
                        console.log("contains")
                        const cphGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                        const cpH = new THREE.Mesh(cphGeo);
                        cpH.position.copy(worldPos);
                        scene.add(cpH);    
                        cube.userData.collided = true;
                        cube.userData.collisionPoint = point;
                        break;
                    }
                }
            }
            else if(!swordBB.intersectsBox3(cubeBB) && cube.userData.collided === true) { // Stopped colliding
                cube.material = new THREE.MeshLambertMaterial({color:  0x98f055});
                cube.userData.collided = false;
                const cphGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                const cpH = new THREE.Mesh(cphGeo);
                cube.userData.collisionPoint.getWorldPosition(cpH.position);
                scene.add(cpH);    

                // Generate a plane, which cuts through the object
                const plane = new THREE.Plane( new THREE.Vector3(0.75, 0.3, 0.1 ), 0);
                //const helper = new THREE.PlaneHelper(plane, 8, 0xffff00);
                const phGeo = new THREE.PlaneGeometry(10, 10);
                const phMat = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
                const pH = new THREE.Mesh(phGeo, phMat);
                pH.position.copy(cube.position);
                //pH.position.copy(plane.normal);
                //pH.position.multiplyScalar(-plane.constant);
                pH.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                scene.add(pH); 
                //scene.add(helper);
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

// Create sword model, bounding box and helper
function createSword(scene) {
    loader.load("./assets/katana.glb", (obj) => {
        sword = obj.scene;
        console.log(sword);
        sword.position.set(0, 1.3, -4.15);
        sword.up = new THREE.Vector3(0, 0, 1);

        // Get model size
        const box3 = new THREE.Box3().setFromObject(sword);
        let size = new THREE.Vector3();
        box3.getSize(size);
        size.x /= 2;
        size.y /= 2;

        sword.userData.size = size;
        swordBB = new OBB(new THREE.Vector3(), sword.userData.size);

        // Setup contact points
        sword.userData.contactPoints = [];
        for(let i = 1; i < 11; i++) {
            const phMesh = new THREE.BoxGeometry(0.03, 0.03, 0.03);
            const pH = new THREE.Mesh(phMesh);
            sword.add(pH);
            pH.position.z = size.z / 10 * i;
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

        scene.add(swordHelper);
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
    sword.position.y = 1.3;
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
    //scene.add(ground);

    // Cube
    const spawnCubes = () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const cube = new THREE.Mesh(geometry, wallMaterial);
        const cubeBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        cube.position.set(2, 1, -1);
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
            //cube.cube.position.z -= 0.8 * delta;
        }
    };
    //mixer = new THREE.AnimationMixer(envAnimated);

    return updateMixer;
}