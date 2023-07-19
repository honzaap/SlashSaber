import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import ObstacleManager from "./ObstacleManager";
import EnvironmentManager from "./EnvironmentManager";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Settings } from "./Settings";
import { GraphicsPreset } from "../enums/GraphicsPresset";
import { EVENTS } from "../../constants";

// Singleton class
export default class GameState {

    public movingSpeed = 0;
    public mouse = new THREE.Vector2(-1, -1);
    public distanceTravelled = 0;
    public score = 0;
    public halted = false; // The render process and clock stopped completely
    public started = false;
    public lives = 3;
    public settings = new Settings();

    private static instance : GameState;
    private scene : THREE.Scene;
    private world : CANNON.World;
    private loader : GLTFLoader;

    private clock = new THREE.Clock();

    private readonly fixedTimeStep = 1.0 / 60.0; 
    private readonly maxMovingSpeed = 5.35;

    private moving = false;

    // Array of functions that are called in every frame
    private logicHandlers : ((delta : number) => void)[];

    // Dictionary with string key and list of callback functions
    private events : { [key: string] : (() => void)[] } = {};

    private constructor() {
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.logicHandlers = [];

        const loadingManager = new THREE.LoadingManager(() => {
            this.dispatchEvent(EVENTS.load);
        });

        this.loader = new GLTFLoader(loadingManager);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/libs/draco/");
        this.loader.setDRACOLoader(dracoLoader);

    }

    public static getInstance() {
        if(!this.instance) this.instance = new GameState();
        return this.instance;
    }

    public startGame() {
        this.moving = true;
        this.halted = false;
        this.started = true;
        this.clock.start();
        this.dispatchEvent(EVENTS.start);
    }

    public haltGame() {
        this.halted = true;
        this.clock.running  = false;
        this.dispatchEvent(EVENTS.halt);
    }

    // Reset the current run
    public reset() {
        this.moving = false;
        this.movingSpeed = 0;
        this.distanceTravelled = 0;
        this.started = false;
        this.halted = false;
        this.mouse.set(-1, -1);
        this.lives = 3;
        ObstacleManager.getInstance().reset();
        EnvironmentManager.getInstance().reset();
    }

    public gotHit() {
        this.lives--;
        this.dispatchEvent(EVENTS.hit);
        if(this.lives <= 0) {
            this.moving = false;
            this.movingSpeed = 0;
            this.dispatchEvent(EVENTS.died);
        }
    }

    public addScore(amount : number) {
        this.score += amount;
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
        this.score += this.movingSpeed * delta;
        if(this.movingSpeed < this.maxMovingSpeed && this.moving) {
            this.movingSpeed = Math.min(this.movingSpeed + delta * (this.maxMovingSpeed - this.movingSpeed + 1), this.maxMovingSpeed);
        }
    }

    public loadGLTF(path : string, callback : (model : GLTF) => void) {
        this.loader.load(path, callback);
    }

    public updateSettings(settings : Settings) {
        this.settings.enableShadows = settings.enableShadows ?? true;
        this.settings.graphicsPreset = settings.graphicsPreset ?? GraphicsPreset.HIGH;
        this.settings.lockFps = settings.lockFps ?? false;
        this.settings.muteSound = settings.muteSound ?? false;
        this.settings.name = settings.name;
        this.settings.sensitivity = settings.sensitivity ?? 1;
        this.settings.showCursor = settings.showCursor ?? false;

        this.dispatchEvent(EVENTS.settingsChanged);
    }

    public addEventListener(event : string, callback : (() => void)) {
        this.events[event] = this.events[event] ? [...this.events[event], callback] : [callback];
    }

    public dispatchEvent(event : string) {
        const callbacks = this.events[event];
        if(!callbacks) return;

        for(const callback of callbacks) {
            callback();
        }
    }
}