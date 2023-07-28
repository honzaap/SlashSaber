import { GraphicsPreset } from "../enums/GraphicsPresset";
import EnvironmentManager from "./EnvironmentManager";
import GameState from "./GameState";
import * as THREE from "three";

type EnvironmentSetTemplate = {
    assets: {
        asset : string,
        maxNumber : number,
        offset : number,
        spawnLight? : boolean,
    }[]
    transition?: number,
    notInitial?: boolean,
};

export default class EnvironmentSet {

    public isActive = false;
    public transition = 0;
    public notInitial = false;
    public lastUsed = 0;

    private isFullyLoaded = false;
    private logicHandlers : ((delta : number) => boolean)[] = [];
    private environmentPieces : EnvironmentPiece[] = [];

    private gameState : GameState;

    public constructor(template : EnvironmentSetTemplate)  {
        this.transition = template.transition ?? 0;
        this.notInitial = template.notInitial ?? false;
        this.gameState = GameState.getInstance();
        let loadedPieces = 0;
        const textureLoader = new THREE.TextureLoader();

        for(const pieceTemplate of template.assets) {
            this.gameState.loadGLTF(`./assets/${pieceTemplate.asset}`, (gltf) => {
                gltf.scene.traverse(obj => {
                    if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial && obj.material.roughness <= 0.4) {
                        const texture = textureLoader.load("./assets/blade_envmap.jpeg");
                        texture.mapping = THREE.EquirectangularReflectionMapping;
                        obj.material.envMap = texture;
                    }
                });

                const model = gltf.scene;
                const piece = new EnvironmentPiece(model, pieceTemplate.maxNumber, pieceTemplate.offset, pieceTemplate.spawnLight);
                this.environmentPieces.push(piece);
                this.setupMovingPieces(piece);

                loadedPieces++;
                this.isFullyLoaded = loadedPieces === template.assets.length;
            });
        }
    }

    public update(delta : number) : boolean {
        if(!this.isFullyLoaded) return true;

        let hasPiece = false;
        for(const handler of this.logicHandlers) {
            hasPiece = handler(delta) || hasPiece;
        }

        return hasPiece;
    }

    public setAsNext() {
        for(const piece of this.environmentPieces) {
            piece.initialPosition = new THREE.Vector3(0, 0, -65);
        }
        /*
        let loadedPieces = 0;
        let waitTime = 0;
        for(const piece of this.environmentPieces) {
            for(let i = piece.activeInstances(); i < piece.maxNumber; i++) {
                // ONI SE NECACHUJOU? ZKUSIT ONAFTERRENDRE PRO KAŽDEJ ENV PIECE
                setTimeout(() => {
                    console.log(waitTime);
                    piece.activateNewInstance();
                    if(i === piece.maxNumber -1) loadedPieces++;
                
                    if(loadedPieces === this.environmentPieces.length) {
                    }
                }, waitTime);
                
                waitTime += 1000;
            }
        }*/
        this.isActive = true;
    }

    public reset() {
        this.isActive = false;
        for(const piece of this.environmentPieces) {
            for(const instance of piece.instancePool) {
                instance.visible = false;
                instance.userData.visible = false;
            }
            piece.initialPosition = null;
            piece.initialPosition = new THREE.Vector3(0, 0, 0);
        }
    }
    
    public updateSettings() {
        for(const piece of this.environmentPieces) {
            piece.updateSettings();
        }
    }

    private setupMovingPieces(piece : EnvironmentPiece) : void {
        const despawnPosition = 10;

        const updateLoop = (delta : number) => {
            // Activate new environment piece
            if(piece.activeInstances() < piece.maxNumber && this.isActive) {
                piece.activateNewInstance();
            }

            // Move asset and remove any that are out of camera sight
            for(const instance of piece.instancePool) {
                instance.position.z += this.gameState.movingSpeed * delta;
                if(instance.position.z >= despawnPosition) {
                    instance.visible = false;
                    instance.userData.visible = false;
                }
            }

            return piece.activeInstances() > 0;
        };

        this.logicHandlers.push(updateLoop);
    }
}

class EnvironmentPiece{
    public maxNumber: number;
    public offset : number;
    public spawnLight : boolean;
    public size = new THREE.Vector3();
    public initialPosition : THREE.Vector3 | null = null;
    public instancePool : THREE.Object3D[] = [];
    
    private model : THREE.Object3D;
    private gameState : GameState;

    public constructor(model : THREE.Object3D, maxNumber : number, offset : number, spawnLight = false) {
        this.gameState = GameState.getInstance();
        this.model = model;
        this.maxNumber = maxNumber;
        this.offset = offset;
        this.spawnLight = spawnLight;
        const box3 = new THREE.Box3().setFromObject(model);
        box3.getSize(this.size);
        this.modifyModel(this.model);

        this.populateInstacePool();
    }

    public activateNewInstance() {
        const newPosition = new THREE.Vector3();
        if(this.initialPosition) {
            newPosition.copy(this.initialPosition);
            this.initialPosition = null;
        }
        else {
            newPosition.copy(this.getFurthestActiveInstance().position);
            newPosition.z = newPosition.z - this.size.z - this.offset;
        }

        if(newPosition.z < -65) return;

        const newInstance = this.getAvailableInstance();

        if(!newInstance) return;

        newInstance.position.z = newPosition.z;
        newInstance.visible = true;
        newInstance.userData.visible = true;

        if(this.spawnLight) {
            const availableLight = EnvironmentManager.getInstance().getAvailableLight();

            if(availableLight) {
                const pos = newInstance.children[0]?.position;
                newPosition.y = pos?.y ? pos.y - 0.3 : 2.6;
                newPosition.z += pos?.z ? pos.z : 0;
                availableLight.activate(newPosition);
            }
        }
    }

    public activeInstances() {
        return this.instancePool.filter(i => i.userData.visible).length;
    }

    public updateSettings() {
        this.modifyModel(this.model);
        for(const instance of this.instancePool) {
            this.gameState.sceneRemove(instance);
        }

        this.populateInstacePool();
    }

    // Populate piece pool with instances 
    private populateInstacePool() {
        this.instancePool = [];
        for(let i = 0; i < this.maxNumber; i++) {
            const instance = this.model.clone(true);
            instance.visible = false;
            instance.userData.visible = false;
            instance.position.set(0, 0, 7);
            this.gameState.sceneAdd(instance);
            this.instancePool.push(instance);
        }
    }

    private getAvailableInstance() {
        return this.instancePool.find(i => !i.userData.visible);
    }

    private getFurthestActiveInstance() {
        let furthest = this.instancePool[0];
        for(const instance of this.instancePool.filter(i => i.userData.visible)) {
            if(instance.position.z < furthest.position.z) {
                furthest = instance;
            }
        }

        return furthest;
    }

    // Looks through given object and its children, then modifies it however necessary
    private modifyModel(obj : THREE.Object3D) {
        obj.receiveShadow = true;
        obj.castShadow =  true;
        if(obj instanceof THREE.Mesh && (obj.material instanceof THREE.MeshStandardMaterial || obj.material instanceof THREE.MeshLambertMaterial)) {
            if(this.gameState.settings.graphicsPreset === GraphicsPreset.LOW && obj.userData.hasLowMaterial !== true) {
                obj.userData.origMaterial = obj.material;
                obj.userData.hasLowMaterial = true;
                obj.material = new THREE.MeshLambertMaterial({ color: obj.material.color, opacity: obj.material.opacity, reflectivity: 1.0 });
                obj.material.needsUpdate = true;
            }
            else if(this.gameState.settings.graphicsPreset === GraphicsPreset.HIGH && obj.userData.hasLowMaterial) {
                obj.userData.hasLowMaterial = false;
                obj.material = obj.userData.origMaterial;
                obj.material.needsUpdate = true;
            }
            /*if(obj.material?.opacity < 1) { 
                // Make objects visible, but still able to pass light and godrays
                obj.castShadow = false;
                obj.receiveShadow = false;
                obj.material.emissive = new THREE.Color(0xbeb979);
                obj.material.emissiveIntensity = 0.8;
                obj.material.opacity = 1;
                obj.material.depthWrite = false;
                obj.material.transparent = false;
            }*/
        }
        if (obj?.children != null) {
            for (const child of obj.children) {
                this.modifyModel(child);
            }
        }
    }
}
