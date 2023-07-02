import GameState from "./GameState";
import * as THREE from "three";

type EnvironmentSetTemplate = {
    asset : string,
    maxNumber : number,
    offset : number,
};

export default class EnvironmentSet {

    public isActive = false;
    
    private isFullyLoaded = false;
    private logicHandlers : ((delta : number) => boolean)[] = [];
    private environmentPieces : EnvironmentPiece[] = [];

    private gameState : GameState;

    public constructor(environmentSetTemplate : EnvironmentSetTemplate[])  { // TODO : remove any
        this.gameState = GameState.getInstance();
        let loadedPieces = 0;

        for(const pieceTemplate of environmentSetTemplate) {
            this.gameState.loadGLTF(`./assets/${pieceTemplate.asset}`, (gltf) => {
                const piece = new EnvironmentPiece(gltf.scene, pieceTemplate.maxNumber, pieceTemplate.offset);
                this.environmentPieces.push(piece);
                this.setShadow(gltf.scene, true, true);
                this.modifyObjectMaterial(gltf.scene);
                this.generateMovingPiece(piece);
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

    private generateMovingPiece(piece : EnvironmentPiece) : void {
        const instances : THREE.Object3D[] = [];
        const despawnPosition = 10;

        const updateLoop = (delta : number) => {
            // Generate new environment piece
            if(instances.length < piece.maxNumber && this.isActive) {
                const newPosition = new THREE.Vector3();
                if(piece.initialPosition) {
                    newPosition.copy(piece.initialPosition);
                    piece.initialPosition = null;
                }
                else {
                    newPosition.copy(instances[instances.length -1]?.position ?? new THREE.Vector3(0, 0, 7));
                    newPosition.z = newPosition.z - piece.size.z - piece.offset;
                }

                if(newPosition.z >= -65) {
                    console.log("env piece");
                    const newInstance = piece.model.clone(true);
                    newInstance.position.z = newPosition.z;
                    
                    instances.push(newInstance);
                    this.gameState.sceneAdd(newInstance);
                }
            }

            // Move asset and remove any that are out of camera sight
            for(const instance of instances) {
                instance.position.z += this.gameState.movingSpeed * delta;
                if(instance.position.z >= despawnPosition) {
                    this.gameState.sceneRemove(instance);
                    instances.splice(instances.findIndex(i => i.uuid === instance.uuid), 1);
                }
            }

            return instances.length > 0;
        };

        this.logicHandlers.push(updateLoop);
    }

    // Set shadows on given object to given settings
    private setShadow(obj : THREE.Object3D, cast = false, receive = false) {
        obj.castShadow = cast;
        obj.receiveShadow = receive;
        if (obj?.children != null) {
            for (const child of obj.children) {
                this.setShadow(child, cast, receive);
            }
        }
    }

    // Looks through materials of given object and its children, then modifies it however necessary
    private modifyObjectMaterial(obj : THREE.Object3D) {
        if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            if(obj.material?.emissiveIntensity > 1) { 
                // Generate point light on an emissive material (used for lamps)
                obj.material.emissiveIntensity = 1;
                const pointLight = new THREE.PointLight(0xffffff, 7.2, 0, 2);
                pointLight.position.y = -1.4;
                pointLight.castShadow = false;
                //obj.add(pointLight); // TODO: Causes LAG?
            }
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
                this.modifyObjectMaterial(child);
            }
        }
    }
}

class EnvironmentPiece{
    public model : THREE.Object3D;
    public maxNumber: number;
    public offset : number;
    public size = new THREE.Vector3();
    public initialPosition : THREE.Vector3 | null = null;

    public constructor(model : THREE.Object3D, maxNumber : number, offset : number) {
        this.model = model;
        this.maxNumber = maxNumber;
        this.offset = offset;
        const box3 = new THREE.Box3().setFromObject(this.model);
        box3.getSize(this.size);
    }
}
