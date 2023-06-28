import * as THREE from "three";
import Obstacle from "./Obstacle";
import GameState from "./GameState";

export default class ObstacleManager {

    private static instance : ObstacleManager;

    private gameState : GameState;

    private obstacles : Obstacle[] = [];
    private slicedObstacles : THREE.Object3D[] = []; // TODO : make sliced obstacle class?

    private obstacleModels : THREE.Object3D[] = []; // TODO : store models differently

    private readonly maxObstacles = 10;
    private readonly obstacleDistance = 10;

    private constructor() { 
        this.gameState = GameState.getInstance();

        this.gameState.loadGLTF("./assets/obstacle_test.glb", (gltf) => {
            const instance = gltf.scene.children[0]; // TODO : this might break
            this.obstacleModels.push(instance);
        });

        this.gameState.addLogicHandler(this.update);
    }

    public static getInstance() {
        if(!this.instance) this.instance = new ObstacleManager();
        return this.instance;
    }

    public getObstacles() : Obstacle[] {
        return this.obstacles;
    }

    private update = (delta : number) : void => {
        for(const obstacle of this.obstacles) {
            obstacle.updateBoundingBox();
            if(obstacle.moveBy(this.gameState.movingSpeed * delta)) {
                this.obstacles.splice(this.obstacles.findIndex(o => o === obstacle), 1);
            }
        }

        // Update physics
        for(const slicedPiece of this.slicedObstacles) {
            const slicedPieceBody = slicedPiece.userData.body;
            slicedPieceBody.position.z += this.gameState.movingSpeed * delta;
            slicedPiece.position.set(slicedPieceBody.position.x, slicedPieceBody.position.y, slicedPieceBody.position.z);
            slicedPiece.quaternion.set(slicedPieceBody.quaternion.x, slicedPieceBody.quaternion.y, slicedPieceBody.quaternion.z, slicedPieceBody.quaternion.w);
        }

        // Make sure that there are 'maxObstacles' of obstacles in the scene at all times
        if(this.obstacles.length < this.maxObstacles) {
            const model = this.obstacleModels[0]; // TODO : take model randomly or something
            if(model != null) {
                const newInstance = model.clone(true);
                const newPosition = this.obstacles[this.obstacles.length -1]?.getPosition() ?? new THREE.Vector3(0, 0, 0);
                newInstance.position.z = newPosition.z - this.obstacleDistance; // TODO : randomize a bit

                this.obstacles.push(new Obstacle(newInstance));
                this.gameState.sceneAdd(newInstance);
            }
        }
    };

    public sliceObstacle(obstacle : Obstacle, coplanarPoints : THREE.Vector3[], sliceDirection : THREE.Vector3, sliceForce = 1) {
        // Generate a plane, which slices through the object
        const plane = new THREE.Plane(new THREE.Vector3(0.0, 0.0, 0.0));
        plane.setFromCoplanarPoints(coplanarPoints[0], coplanarPoints[1], coplanarPoints[2]);

        const geometry = new THREE.PlaneGeometry(10, 10);
        const planeMesh = new THREE.Mesh(geometry);
        const planeMesh2 = new THREE.Mesh(geometry);

        // Points to tell, if the normal is facing the obstacle or not
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        v1.copy(coplanarPoints[0]).add(plane.normal);
        v2.copy(coplanarPoints[0]).sub(plane.normal);

        // Create 2 planes, one with flipped normal to correctly clip both sides
        // planeMesh is the one that leaves behind a sliced piece with physics
        const position = obstacle.getPosition();
        if(v1.distanceTo(position) > v2.distanceTo(position)) {
            planeMesh.position.copy(plane.normal);
            planeMesh.position.multiplyScalar(-plane.constant);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);

            plane.negate();

            planeMesh2.position.copy(plane.normal);
            planeMesh2.position.multiplyScalar(-plane.constant);
            planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
        }
        else {
            planeMesh2.position.copy(plane.normal);
            planeMesh2.position.multiplyScalar(-plane.constant);
            planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);

            plane.negate();

            planeMesh.position.copy(plane.normal);
            planeMesh.position.multiplyScalar(-plane.constant);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
        }

        // Update plane matrices
        planeMesh.updateMatrix();
        planeMesh2.updateMatrix();

        const slicedPiece = obstacle.sliceObstacle(planeMesh, planeMesh2, sliceDirection, sliceForce);

        this.slicedObstacles.push(slicedPiece);

        // Remove sliced piece after 2 seconds
        setTimeout(() => {
            this.gameState.sceneRemove(slicedPiece);
            this.gameState.worldRemove(slicedPiece.userData.body);
            this.slicedObstacles.splice(this.slicedObstacles.findIndex(i => i.uuid === slicedPiece.uuid), 1);
        }, 2000);

        //gameState.movingSpeed = 0; // DEBUG
    }
}