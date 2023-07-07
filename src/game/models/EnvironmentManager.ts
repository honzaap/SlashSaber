import GameState from "./GameState";
import EnvironmentSet from "./EnvironmentSet";
import { ENVIRONMENT_SET_TEMPLATES, ROOM_TRANSITION_ASSET } from "../../constants";
import * as THREE from "three";

export default class EnvironmentManager {

    public transition : Transition | null = null;

    private static instance : EnvironmentManager;

    private gameState : GameState;

    private environmentSets : EnvironmentSet[] = [];
    private activeSet : EnvironmentSet;
    private nextActiveSet : EnvironmentSet;

    private pointLightPool : PoolLight[] = [];
    private readonly maxPointLights = 10; // TODO : Graphics settings

    private lastTransitionDistance = 0;

    private constructor() {
        this.gameState = GameState.getInstance();
        for(const template of ENVIRONMENT_SET_TEMPLATES) {
            const environmentSet = new EnvironmentSet(template);
            this.environmentSets.push(environmentSet);
        }

        this.activeSet = this.environmentSets[0];
        this.nextActiveSet = this.environmentSets[1];

        this.setupInitialSet();

        this.gameState.addLogicHandler(this.update);

        // Generate pool of point lights that can be used for lamps 
        for(let i = 0; i < this.maxPointLights; i++) {
            const pointLight = new THREE.PointLight(0xffffff, 0, 0, 2);
            pointLight.castShadow = false;
            this.pointLightPool.push(new PoolLight(pointLight, 5.2));
            this.gameState.sceneAdd(pointLight);
        }

        this.setupTransition();
    }

    public static getInstance() : EnvironmentManager {
        if(this.instance == null) this.instance = new EnvironmentManager();
        return this.instance;
    }

    // Get first available light in the pool
    public getAvailableLight() : PoolLight | undefined {
        return this.pointLightPool.find(l => l.isActive !== true);
    }

    public reset() {
        for(const set of this.environmentSets) {
            set.reset();
        }
        this.setupInitialSet();
        this.lastTransitionDistance = 0;
        this.transition?.reset();
    }

    private update = (delta : number) => {
        // Switch between sets
        if(!this.activeSet.update(delta)) {
            this.activeSet.isActive = false;
            this.activeSet = this.nextActiveSet;
            this.activeSet.isActive = true;
            this.nextActiveSet = this.environmentSets.filter(set => set !== this.activeSet)[0];
        }

        this.nextActiveSet.update(delta);

        // Update and play transition animations
        if(this.transition?.isActive) {
            this.transition.update(delta);
        }

        // Move lights in the light pool
        for(const light of this.pointLightPool) {
            if(light.isActive) {
                light.moveBy(this.gameState.movingSpeed * delta);
            }
        }

        if(this.gameState.distanceTravelled - this.lastTransitionDistance > 30) { // TODO : change for some variable
            this.makeTransition();
            const end = Math.abs(this.transition?.getBounds().min.z ?? 0);
            this.lastTransitionDistance = this.gameState.distanceTravelled + end;
        }
    };

    // Start the transition between 2 environment sets
    private makeTransition() {
        this.activeSet.isActive = false;
        this.nextActiveSet.setAsNext();
        this.transition?.activate();
    }

    // Load transition model and setup animations
    private setupTransition() {
        this.gameState.loadGLTF(`/assets/${ROOM_TRANSITION_ASSET}`, (gltf) => {
            this.transition = new Transition(gltf.scene, gltf.animations);
        });
    }

    private setupInitialSet() {
        this.activeSet = this.environmentSets[0]; // TODO : choose randomly
        this.nextActiveSet = this.environmentSets[1]; // TODO : choose randomly

        this.activeSet.isActive = true;
        this.nextActiveSet.isActive = false;
    }
}

class PoolLight {
    public isActive : boolean;
  
    private light : THREE.Light;
    private activeIntesitiy : number;

    constructor(light : THREE.Light, activeIntesity : number) {
        this.light = light;
        this.activeIntesitiy = activeIntesity;
        this.isActive = false;
    }

    public activate(position : THREE.Vector3) {
        this.light.intensity = this.activeIntesitiy;
        this.isActive = true;
        this.light.position.copy(position);
    }

    public deactivate() {
        this.light.intensity = 0;
        this.isActive = false;
    }

    public moveBy(z : number) {
        this.light.position.z += z;
        if(this.light.position.z >= 10) {
            this.deactivate();
        }
    }
}

class Transition {
    public isActive = false;

    private gameState : GameState;

    private model = new THREE.Object3D();
    private mixer : THREE.AnimationMixer;
    private animations : TransitionAnimation[] = [];

    private bounds = new THREE.Box3();
    private size = new THREE.Vector3();

    constructor(model : THREE.Object3D, animations : THREE.AnimationClip[]) {
        this.gameState = GameState.getInstance();

        this.mixer = new THREE.AnimationMixer(model);
        this.mixer.timeScale = 0.5;

        for(const child of model.children) {
            const clip = animations.find(c => c.name === child.name);
            if(!clip) continue;
            const animation = this.mixer.clipAction(clip);
            animation.setLoop(THREE.LoopOnce, 1);
            animation.clampWhenFinished = true;
            this.animations.push(new TransitionAnimation(child, animation));
        }

        this.model = model;

        this.gameState.sceneAdd(this.model);
        setTimeout(() => {
            model.visible = false;
        }, 20);

        this.bounds.setFromObject(model);
        this.bounds.getSize(this.size);
    }

    public getBounds() {
        this.bounds.setFromObject(this.model);
        return this.bounds;
    }

    public getSize() {
        return this.size;
    }

    // Makes transition visible and resets animations
    public activate() {
        this.isActive = true;
        this.model.position.z = -65; // TODO : calculate/constant
        this.model.visible = true;
        for(const animation of this.animations) {
            animation.action.stop();
            animation.isActive = false;
        }
    }

    // Update animation mixer, start animations when necessary
    public update(delta : number) {
        this.mixer.update(delta);
        this.model.position.z += this.gameState.movingSpeed * delta;
        for(const animation of this.animations) {
            const position = new THREE.Vector3();
            animation.model.getWorldPosition(position);
            if(position.z >= -5) { // TODO : calculate/constant
                animation.isActive = true;
                animation.action.play();
            }
        }

        if(this.model.position.z >= 20) { // TODO : calculate
            this.isActive = false;
            this.model.visible = false;
        }
    }

    public reset() {
        this.isActive = false;
        this.model.visible = false;
    }
}

class TransitionAnimation {
    public model : THREE.Object3D;
    public action : THREE.AnimationAction;
    public isActive = false;

    constructor(model : THREE.Object3D, action : THREE.AnimationAction) {
        this.model = model;
        this.action = action;
    }
}