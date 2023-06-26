import * as THREE from "three";
import * as CANNON from "cannon-es";

// Singleton class
export default class GameState {

    public movingSpeed = 3.5;
    public mouse = new THREE.Vector2(-1, -1);

    private static instance : GameState;
    private scene : THREE.Scene;
    private world : CANNON.World;

    private readonly fixedTimeStep = 1.0 / 60.0; 

    // Array of functions that are called in every frame
    private logicHandlers : LogicHandlerFunction[];

    private constructor() {
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.logicHandlers = [];
    }

    public static getInstance() {
        if(!this.instance) this.instance = new GameState();
        return this.instance;
    }

    public sceneAdd(object : THREE.Object3D) : void {
        this.scene.add(object);
    }

    public sceneRemove(object : THREE.Object3D) : void {
        this.scene.remove(object);
    }

    public sceneTraverse(callback : (object : THREE.Object3D<THREE.Event>) => any) : void {
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

    public addLogicHandler(handler : LogicHandlerFunction) {
        this.logicHandlers.push(handler);
    }

    public update(delta : number) {
        this.world.step(this.fixedTimeStep, delta, 3);
        for(const handler of this.logicHandlers) {
            handler(delta);
        }
    }
}

type LogicHandlerFunction = (delta : number) => void;