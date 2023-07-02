import * as THREE from "three";
import GameState from "./GameState";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from "three-csg-ts";
import * as CANNON from "cannon-es";

export class Obstacle {
    
    private model = new THREE.Object3D();
    private boundingBox : THREE.Box3;

    private gameState : GameState;

    private swordCollisionPoint : THREE.Vector3 | null = null;
    private swordCollided = false;

    private readonly despawnPosition = 5;

    constructor(model : THREE.Object3D) {
        this.gameState = GameState.getInstance();
        this.model = model;

        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.model);
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

    public updateBoundingBox() : void {
        this.model.updateMatrix();
        this.model.updateMatrixWorld();
        // TODO : compute bounding box differently?
        const bb = (<THREE.Mesh> this.model ).geometry.boundingBox;
        this.boundingBox.copy(bb ?? new THREE.Box3()).applyMatrix4(this.model.matrixWorld);
    }

    // Test collisions against sword bounding box
    // Returns initial collision point, if collision with this object ended just now
    public swordCollide(swordBB : OBB, contactPoint : THREE.Object3D) : THREE.Vector3 | null {
        if(swordBB.intersectsBox3(this.boundingBox) && !this.swordCollided) { // Collision occured
            const worldPos = new THREE.Vector3();
            contactPoint.getWorldPosition(worldPos);
            this.swordCollisionPoint = worldPos;
            this.swordCollided = true;
        }
        else if(!swordBB.intersectsBox3(this.boundingBox) && this.swordCollided === true) { // Stopped colliding
            this.swordCollided = false;
            return this.swordCollisionPoint;
        }

        return null;
    }

    public sliceObstacle(slicePlane : THREE.Mesh, slicePlaneFlipped : THREE.Mesh, sliceDirection : THREE.Vector3, sliceForce = 1) {
        // The piece that gets sliced off
        const slicedPiece = CSG.subtract(<THREE.Mesh> this.model, slicePlane);
        slicedPiece.updateMatrix();
        slicedPiece.updateMatrixWorld();

        // Rest of the obstacle mesh without the piece that got sliced off 
        const slicedObstacle = CSG.subtract(<THREE.Mesh> this.model, slicePlaneFlipped);

        const box3 = new THREE.Box3().setFromObject(slicedPiece);
        const size = new THREE.Vector3();
        box3.getSize(size);

        // The result of the CSG operation has pivot in the same location as the main mesh
        // This resets it to the center of the mesh 
        const boundingBox = new  THREE.Box3();
        boundingBox.setFromObject(slicedPiece);

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

        this.gameState.worldAdd(slicedPieceBody);

        slicedPiece.position.copy(middle);

        slicedPieceBody.applyLocalImpulse(new CANNON.Vec3(sliceDirection.x * sliceForce, sliceDirection.y * sliceForce, sliceDirection.z * sliceForce), new CANNON.Vec3(0, 0, 0));

        const res2BB = new THREE.Box3();
        res2BB.setFromObject(slicedObstacle);

        this.gameState.sceneRemove(this.model);

        this.model = slicedObstacle;

        this.gameState.sceneAdd(slicedPiece);
        this.gameState.sceneAdd(this.model);

        return new SlicedPiece(slicedPiece, slicedPieceBody);
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