import EnvironmentManager from "./EnvironmentManager";
import GameState from "./GameState";
import * as THREE from "three";

type EnvironmentSetTemplate = {
    asset : string,
    maxNumber : number,
    offset : number,
    spawnLight? : boolean,
};

export default class EnvironmentSet {

    public isActive = false;
    
    private isFullyLoaded = false;
    private logicHandlers : ((delta : number) => boolean)[] = [];
    private environmentPieces : EnvironmentPiece[] = [];

    private gameState : GameState;

    public constructor(environmentSetTemplate : EnvironmentSetTemplate[])  {
        this.gameState = GameState.getInstance();
        let loadedPieces = 0;

        for(const pieceTemplate of environmentSetTemplate) {
            this.gameState.loadGLTF(`./assets/${pieceTemplate.asset}`, (gltf) => {
                const model = gltf.scene;
                const piece = new EnvironmentPiece(model, pieceTemplate.maxNumber, pieceTemplate.offset, pieceTemplate.spawnLight);
                this.environmentPieces.push(piece);
                this.modifyModel(model);
                this.setupMovingPieces(piece);

                loadedPieces++;
                this.isFullyLoaded = loadedPieces === environmentSetTemplate.length;
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
        this.isActive = true;
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
                }
            }

            return piece.activeInstances() > 0;
        };

        this.logicHandlers.push(updateLoop);
    }

    // Looks through given object and its children, then modifies it however necessary
    private modifyModel(obj : THREE.Object3D) {
        obj.receiveShadow = true;
        obj.castShadow = true;
        if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            // Good for performace, doesn't look really good
            //obj.material = new THREE.MeshLambertMaterial({ color: obj.material.color, opacity: obj.material.opacity, reflectivity: 0 });
            if(obj.material?.opacity < 1) { 
                // Make objects visible, but still able to pass light and godrays
                obj.castShadow = false;
                obj.receiveShadow = false;
                obj.material.emissive = new THREE.Color(0xbeb979);
                obj.material.emissiveIntensity = 0.8;
                obj.material.opacity = 1;
                obj.material.depthWrite = false;
            }
        }
        if (obj?.children != null) {
            for (const child of obj.children) {
                this.modifyModel(child);
            }
        }
    }
}

class EnvironmentPiece{
    public maxNumber: number;
    public offset : number;
    public spawnLight : boolean;
    public size = new THREE.Vector3();
    public initialPosition : THREE.Vector3 | null = null;
    public instancePool : THREE.Object3D[] = [];

    public constructor(model : THREE.Object3D, maxNumber : number, offset : number, spawnLight = false) {
        const gameState = GameState.getInstance();
        this.maxNumber = maxNumber;
        this.offset = offset;
        this.spawnLight = spawnLight;
        const box3 = new THREE.Box3().setFromObject(model);
        box3.getSize(this.size);


        // Populate piece pool with instances 
        for(let i = 0; i < this.maxNumber; i++) {
            const instance = model.clone(true);
            instance.visible = false;
            instance.position.set(0, 0, 7);
            gameState.sceneAdd(instance);
            this.instancePool.push(instance);
        }
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

        if(this.spawnLight) {
            const availableLight = EnvironmentManager.getInstance().getAvailableLight();

            if(availableLight) {
                availableLight.userData.isActive = true;
                availableLight.intensity = availableLight.userData.activeIntensity;
                availableLight.position.copy(newPosition);
                availableLight.position.y = 2.4;
            }
        }
    }

    private getAvailableInstance() {
        return this.instancePool.find(i => !i.visible);
    }

    public activeInstances() {
        return this.instancePool.filter(i => i.visible).length;
    }

    private getFurthestActiveInstance() {
        let furthest = this.instancePool[0];
        for(const instance of this.instancePool) {
            if(instance.position.z < furthest.position.z) {
                furthest = instance;
            }
        }

        return furthest;
    }
}
