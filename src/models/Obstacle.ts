import * as THREE from "three";
import GameState from "./GameState";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from "three-csg-ts";
import * as CANNON from "cannon-es";

export default class Obstacle {
    
    private model = new THREE.Object3D();
    private boundingBox : THREE.Box3;

    private gameState : GameState;

    private swordCollisionPoint : THREE.Vector3 | null = null;
    private swordCollided = false;

    private readonly despawnPosition = 5;

    constructor(model : THREE.Object3D) {
        this.gameState = GameState.getInstance();
        this.model = model;

        this.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
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

    public cutObstacle(cutPlane : THREE.Mesh, cutPlaneFlipped : THREE.Mesh, cutDirection : THREE.Vector3, cutForce = 1) {
        // The piece that gets cut off
        const cutPiece = CSG.subtract(<THREE.Mesh> this.model, cutPlane);
        cutPiece.updateMatrix();
        cutPiece.updateMatrixWorld();

        // Rest of the obstacle mesh without the piece that got cut off 
        const cutObstacle = CSG.subtract(<THREE.Mesh> this.model, cutPlaneFlipped);

        const box3 = new THREE.Box3().setFromObject(cutPiece);
        const size = new THREE.Vector3();
        box3.getSize(size);

        // The result of the CSG operation has pivot in the same location as the main mesh
        // This resets it to the center of the mesh 
        const boundingBox = new  THREE.Box3();
        boundingBox.setFromObject(cutPiece);

        const middle = new THREE.Vector3();
        const g = cutPiece.geometry;
    
        g.computeBoundingBox();

        if(g.boundingBox) {
            middle.x = (g.boundingBox.max.x + g.boundingBox.min.x) / 2;
            middle.y = (g.boundingBox.max.y + g.boundingBox.min.y) / 2;
            middle.z = (g.boundingBox.max.z + g.boundingBox.min.z) / 2;
        }
    
        cutPiece.localToWorld(middle);

        cutPiece.geometry.center();
        cutPiece.updateMatrix();
        cutPiece.updateMatrixWorld();

        const cutPieceBody = new CANNON.Body({
            mass: Math.max(8 * size.x * size.y * size.z, 0.3),
            shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
            position: new CANNON.Vec3(middle.x, middle.y, middle.z),
        });

        cutPieceBody.updateMassProperties();
        cutPieceBody.aabbNeedsUpdate = true;
        this.gameState.worldAdd(cutPieceBody);

        cutPiece.userData.body = cutPieceBody;
        cutPiece.position.copy(middle);

        cutPieceBody.applyLocalImpulse(new CANNON.Vec3(cutDirection.x * cutForce, cutDirection.y * cutForce, cutDirection.z * cutForce), new CANNON.Vec3(0, 0, 0));

        const res2BB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        res2BB.setFromObject(cutObstacle);

        this.gameState.sceneRemove(this.model);

        this.model = cutObstacle;

        this.gameState.sceneAdd(cutPiece);
        this.gameState.sceneAdd(this.model);

        return cutPiece;
    }
}