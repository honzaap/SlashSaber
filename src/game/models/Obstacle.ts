import * as THREE from "three";
import GameState from "./GameState";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from "three-csg-ts";
import * as CANNON from "cannon-es";
import { ObstaclePlacement } from "../enums/ObstaclePlacement";
import { SliceDirection } from "../enums/SliceDirection";

export class Obstacle {
    
    private model = new THREE.Object3D();
    private obstacleModel = new THREE.Mesh();
    private boundingBox = new THREE.Box3();
    private placement : ObstaclePlacement;
    private sliceDirection : THREE.Vector2;

    private gameState : GameState;

    private swordCollisionPoint : THREE.Vector3 | null = null;
    private swordCollided = false;

    private readonly despawnPosition = 3;

    private hide = false;
    public slashed = false;

    private mixer : THREE.AnimationMixer | null = null;
    private animationAction : THREE.AnimationAction | null = null;

    constructor(model : THREE.Object3D, placement : ObstaclePlacement, sliceDirection : THREE.Vector2, animation : THREE.AnimationClip | null = null) {
        this.gameState = GameState.getInstance();
        this.model = model;
        this.placement = placement;
        this.sliceDirection = sliceDirection;
        
        if(animation) {
            this.mixer = new THREE.AnimationMixer(this.model);
            this.mixer.timeScale = 1.5;
            this.animationAction = this.mixer.clipAction(animation);
            this.animationAction.setLoop(THREE.LoopOnce, 1);
            this.animationAction.clampWhenFinished = true;
        }
        model.traverse(obj => {
            if(obj.name.startsWith("Obstacle")){
                this.obstacleModel = obj as THREE.Mesh;
                this.boundingBox.setFromObject(this.obstacleModel);
            }
        });
    }

    // Move along z coordinate by given number
    // Returns true if the obstacle moved out of bounds (position is over despawnPosition)
    public moveBy(z : number) : boolean {
        this.model.position.z += z;
        if(this.model.position.z >= this.despawnPosition) {
            this.gameState.sceneRemove(this.model);
            return true;
        }


        return false;
    }

    public getPosition() : THREE.Vector3 {
        return this.model.position;
    }

    public getPlacement() {
        return this.placement;
    }

    public getCenter() {
        const result = new THREE.Vector3();
        this.boundingBox.getCenter(result);
        return result;
    }

    public update(delta : number) : void {
        this.model.updateMatrix();
        this.model.updateMatrixWorld();
        this.obstacleModel.updateMatrix();
        this.obstacleModel.updateMatrixWorld();
        const bb = this.obstacleModel.geometry.boundingBox;
        this.boundingBox.copy(bb ?? new THREE.Box3()).applyMatrix4(this.obstacleModel.matrixWorld);

        if(this.hide) { // TODO : make prettier
            if(this.placement === ObstaclePlacement.RIGHT) {
                this.model.position.x += 0.02;
            }
            else if(this.placement === ObstaclePlacement.LEFT) {
                this.model.position.x -= 0.02;
            }
            else {
                this.model.position.y -= 0.02;
            }
        }

        // Play obstacle animation once it gets close enough
        this.mixer?.update(delta);
        if(this.animationAction && this.model.position.z >= -10) {
            this.animationAction.play();
        }

        if(this.model.position.z >= -0.5 && !this.slashed) {
            this.gameState.gotHit();
            this.slashed = true;
            this.hide = true;
        }
    }

    // Test collisions against sword bounding box
    // Returns initial collision point, if collision with this object ended just now
    public swordCollide(swordBB : OBB, contactPoint : THREE.Object3D) : THREE.Vector3 | null {
        if(this.model.position.z >= -1.5) return null;
        if(swordBB.intersectsBox3(this.boundingBox) && !this.swordCollided) { // Collision occured
            const worldPos = new THREE.Vector3();
            contactPoint.getWorldPosition(worldPos);
            this.swordCollisionPoint = worldPos;
            this.swordCollided = true;
            //const test = new Audio("/sounds/slice_init.wav");
            //test.volume = 0.6;
            //test.play();
        }
        else if(!swordBB.intersectsBox3(this.boundingBox) && this.swordCollided === true) { // Stopped colliding
            this.swordCollided = false;
            return this.swordCollisionPoint;
        }

        return null;
    }

    public sliceObstacle(slicePlane : THREE.Mesh, slicePlaneFlipped : THREE.Mesh, sliceDirection : THREE.Vector3, sliceForce = 1) {
        this.slashed = true;

        const localPos = this.obstacleModel.position;
        this.obstacleModel.matrix.copy(this.obstacleModel.matrixWorld);

        const csgSP = CSG.fromMesh(this.obstacleModel);
        const csgPlane = CSG.fromMesh(slicePlane);
        const csgPlaneFlipped = CSG.fromMesh(slicePlaneFlipped);

        const slicedPiece = csgSP.subtract(csgPlane).toMesh(this.obstacleModel.matrix, this.obstacleModel.material);
        const slicedObstacle = csgSP.subtract(csgPlaneFlipped).toMesh(this.obstacleModel.matrix, this.obstacleModel.material);

        // The piece that gets sliced off
        //const slicedPiece = CSG.subtract(this.obstacleModel, slicePlane);
        slicedPiece.updateMatrix();
        slicedPiece.updateMatrixWorld();

        // Rest of the obstacle mesh without the piece that got sliced off 
        //const slicedObstacle = CSG.subtract(this.obstacleModel, slicePlaneFlipped);
        slicedObstacle.updateMatrix();
        slicedObstacle.updateMatrixWorld();

        const box3 = new THREE.Box3().setFromObject(slicedPiece);
        const size = new THREE.Vector3();
        box3.getSize(size);

        // The result of the CSG operation has pivot in the same location as the main mesh
        // This resets it to the center of the mesh 
        const middle = new THREE.Vector3();
        const g = slicedPiece.geometry;
    
        g.computeBoundingBox();

        if(g.boundingBox) {
            middle.x = (g.boundingBox.max.x + g.boundingBox.min.x) / 2;
            middle.y = (g.boundingBox.max.y + g.boundingBox.min.y) / 2;
            middle.z = (g.boundingBox.max.z + g.boundingBox.min.z) / 2;
        }
    
        slicedPiece.localToWorld(middle);

        slicedPiece.geometry.center();
        slicedPiece.updateMatrix();
        slicedPiece.updateMatrixWorld();

        const slicedPieceBody = new CANNON.Body({
            mass: Math.max(8 * size.x * size.y * size.z, 0.3),
            shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
            position: new CANNON.Vec3(middle.x, middle.y, middle.z),
        });

        /*let played = false;
        slicedPieceBody.addEventListener("collide", () => {
            if(!played) {
                played = true;
                const test = new Audio(`/sounds/bamboo_collide_${Math.floor(Math.random() * 3 + 1)}.ogg`);
                test.volume = 0.1;
                test.play();
            }
        });*/

        this.gameState.worldAdd(slicedPieceBody);

        slicedPiece.position.copy(middle);

        slicedPieceBody.applyLocalImpulse(new CANNON.Vec3(sliceDirection.x * sliceForce, sliceDirection.y * sliceForce, sliceDirection.z * sliceForce - slicedPieceBody.mass * 5), new CANNON.Vec3(0, 0, 0));

        this.model.remove(this.obstacleModel);
        
        this.obstacleModel = slicedObstacle;

        this.gameState.sceneAdd(slicedPiece);
        this.model.add(this.obstacleModel);

        this.obstacleModel.position.copy(localPos);

        if(!this.hide) {
            setTimeout(() => {
                this.hideObstacle();
            }, 300);
        }

        return new SlicedPiece(slicedPiece, slicedPieceBody);
    }

    public hideObstacle() {
        this.hide = true;
        this.slashed = true;
        if(this.animationAction && this.mixer) {
            this.animationAction.timeScale = -1.5;
            this.animationAction.play();
            this.animationAction.paused = false;
            this.animationAction.setLoop(THREE.LoopOnce, 1);  
        }
    }

    public canSlice(sliceVector : THREE.Vector3) {
        if(this.sliceDirection === SliceDirection.ANY) return true;

        const result = new THREE.Vector2(sliceVector.x * this.sliceDirection.x, sliceVector.y * this.sliceDirection.y);

        return result.x >= 0 && result.y >= 0;
    }

    public remove() {
        this.gameState.sceneRemove(this.model);
    }
}

export class SlicedPiece {
    public model : THREE.Object3D;
    public body : CANNON.Body;
    
    constructor(model : THREE.Object3D, body : CANNON.Body) {
        this.model = model;
        this.body = body;
    }
}