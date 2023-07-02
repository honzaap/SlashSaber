import GameState from "./GameState";
import EnvironmentSet from "./EnvironmentSet";
import { ENVIRONMENT_SET_TEMPLATES, ROOM_TRANSITION_ASSET } from "../constants";
import * as THREE from "three";

export default class EnvironmentManager {

    private static instance : EnvironmentManager;

    private gameState : GameState;

    private environmentSets : EnvironmentSet[] = [];
    private activeSet : EnvironmentSet;
    private nextActiveSet : EnvironmentSet;
    private transition = new THREE.Object3D();

    private transitionMixer : THREE.AnimationMixer | null = null;
    private transitionActive = false;

    private pointLightPool : THREE.PointLight[] = [];

    private constructor() {
        this.gameState = GameState.getInstance();
        for(const template of ENVIRONMENT_SET_TEMPLATES) {
            const environmentSet = new EnvironmentSet(template);
            this.environmentSets.push(environmentSet);
        }

        this.activeSet = this.environmentSets[0];
        this.nextActiveSet = this.environmentSets[1];

        this.activeSet.isActive = true;
        this.nextActiveSet.isActive = false;

        this.gameState.addLogicHandler(this.update);

        // Generate pool of point lights that can be used for lamps 
        for(let i = 0; i < 10; i++) {
            const pointLight = new THREE.PointLight(0xffffff, 0, 0, 2);
            pointLight.castShadow = false;
            pointLight.userData.activeIntensity = 7.2;
            this.pointLightPool.push(pointLight);
            this.gameState.sceneAdd(pointLight);
        }

        // TODO : only for debug, remove later
        setTimeout(() => {
            this.makeTransition();
        }, 3000);

        this.setupTransition();
    }

    public static getInstance() : EnvironmentManager {
        if(this.instance == null) this.instance = new EnvironmentManager();
        return this.instance;
    }

    public getAvailableLight() : THREE.PointLight | undefined {
        return this.pointLightPool.find(l => l.userData.isActive !== true);
    }

    private update = (delta : number) => {
        if(!this.activeSet.update(delta)) {
            this.activeSet.isActive = false;
            this.activeSet = this.nextActiveSet;
            this.activeSet.isActive = true;
            this.nextActiveSet = this.environmentSets.filter(set => set !== this.activeSet)[0];
            setTimeout(() => {
                this.makeTransition();
            }, 10000);
        }

        this.nextActiveSet.update(delta);

        if(this.transitionActive) {
            this.transitionMixer?.update(delta);
            this.transition.position.z += this.gameState.movingSpeed * delta;
            for(const child of this.transition.children) {
                if(child.userData.animation && child.userData.inAnimation !== true) {
                    const position = new THREE.Vector3();
                    child.getWorldPosition(position);
                    if(position.z >= -5) {
                        child.userData.inAnimation = true;
                        child.userData.animation.play();
                    }
                }
            }

            if(this.transition.position.z >= 20) {
                this.transitionActive = false;
                this.transition.visible = false;
            }
        }

        for(const light of this.pointLightPool) {
            if(light.userData.isActive) {
                light.position.z += this.gameState.movingSpeed * delta;
                if(light.position.z >= 10) {
                    light.userData.isActive = false;
                    light.intensity = 0;
                }
            }
        }
    };

    private makeTransition() {
        console.log("transition");
        this.activeSet.isActive = false;
        this.nextActiveSet.setAsNext();
        this.transition.position.z = -65;
        this.transitionActive = true;
        this.transition.visible = true;
        for(const child of this.transition.children) {
            if(child.userData.animation) {
                child.userData.animation.stop();
                child.userData.inAnimation = false;
            }
        }
    }

    private setupTransition() {
        this.gameState.loadGLTF(`/assets/${ROOM_TRANSITION_ASSET}`, (gltf) => {
            const transition = gltf.scene;
            transition.visible = false;

            this.transitionMixer = new THREE.AnimationMixer(transition);
            this.transitionMixer.timeScale = 0.5;

            for(const child of transition.children) {
                const clip = gltf.animations.find(c => c.name === child.name);
                if(!clip) continue;
                const animation = this.transitionMixer.clipAction(clip);
                animation.setLoop(THREE.LoopOnce, 1);
                animation.clampWhenFinished = true;
                child.userData.animation = animation;
            }

            this.gameState.sceneAdd(transition);
            this.transition = transition;
        });
    }
}