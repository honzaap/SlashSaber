import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

// Singleton class
export default class GameState {

    public movingSpeed = 0;
    public mouse = new THREE.Vector2(-1, -1);
    public distanceTravelled = 0;
    public paused = false; // TODO : rename to something else (this pauses the entire render process, not just movement)

    private static instance : GameState;
    private scene : THREE.Scene;
    private world : CANNON.World;
    private loader : GLTFLoader;

    private clock = new THREE.Clock();


    private readonly fixedTimeStep = 1.0 / 60.0; 

    // Array of functions that are called in every frame
    private logicHandlers : ((delta : number) => void)[];

    private constructor() {
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.logicHandlers = [];

        const loadingManager = new THREE.LoadingManager(() => {
            const loadingScreen = document.getElementById("loadingScreen");
            loadingScreen?.classList.add("fade");
            setTimeout(() => {
                loadingScreen?.classList.add("hide");
            }, 1000);
        });

        this.loader = new GLTFLoader(loadingManager);
    }

    public static getInstance() {
        if(!this.instance) this.instance = new GameState();
        return this.instance;
    }

    public startGame() {
        this.movingSpeed = 3.5;
        this.paused = false;
        this.clock.start();
    }

    public pauseGame() {
        this.movingSpeed = 0;
        this.paused = true;
        this.clock.running = false;
    }

    public sceneAdd(object : THREE.Object3D) : void {
        this.scene.add(object);
    }

    public sceneRemove(object : THREE.Object3D) : void {
        this.scene.remove(object);
    }

    public sceneTraverse(callback : (object : THREE.Object3D<THREE.Event>) => void) : void {
        this.scene.traverse(callback);
    }

    public worldAdd(body : CANNON.Body) : void {
        this.world.addBody(body);
    }

    public worldRemove(body : CANNON.Body) : void {
        this.world.removeBody(body);
    }

    public getScene() : THREE.Scene {
        return this.scene;
    }

    public addLogicHandler(handler : (delta : number) => void) {
        this.logicHandlers.push(handler);
    }

    public update() {
        const delta = this.clock.getDelta();
        this.world.step(this.fixedTimeStep, delta, 3);
        for(const handler of this.logicHandlers) {
            handler(delta);
        }
        this.distanceTravelled += this.movingSpeed * delta;
    }

    public loadGLTF(path : string, callback : (model : GLTF) => void) {
        this.loader.load(path, callback);
    }
}