import * as THREE from "three";
import { Obstacle, SlicedPiece } from "./Obstacle";
import GameState from "./GameState";
import EnvironmentManager from "./EnvironmentManager";

export default class ObstacleManager {

    private static instance : ObstacleManager;

    private gameState : GameState;
    private environmentManager : EnvironmentManager;

    private obstacles : Obstacle[] = [];
    private slicedPieces : SlicedPiece[] = [];

    private obstacleModels : THREE.Object3D[] = []; // TODO : store models differently

    private readonly maxObstacles = 10;
    private readonly obstacleDistance = 10;

    private constructor() { 
        this.gameState = GameState.getInstance();
        this.environmentManager = EnvironmentManager.getInstance();

        this.gameState.loadGLTF("./assets/obstacle_test.glb", (gltf) => {
            // The obstacle needs a THREE.Mesh instance for CSG
            const instance = gltf.scene.children[0];
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
        for(const slicedPiece of this.slicedPieces) {
            slicedPiece.body.position.z += this.gameState.movingSpeed * delta;
            slicedPiece.model.position.set(slicedPiece.body.position.x, slicedPiece.body.position.y, slicedPiece.body.position.z);
            slicedPiece.model.quaternion.set(slicedPiece.body.quaternion.x, slicedPiece.body.quaternion.y, slicedPiece.body.quaternion.z, slicedPiece.body.quaternion.w);
        }

        // Make sure that there are 'maxObstacles' of obstacles in the scene at all times
        if(this.obstacles.length < this.maxObstacles) {
            const model = this.obstacleModels[0]; // TODO : take model randomly or something
            if(model != null) {
                const lastPosition = this.obstacles[this.obstacles.length -1]?.getPosition() ?? new THREE.Vector3(0, 0, 0);
                let newPosition = lastPosition.z - this.obstacleDistance; // TODO : randomize a bit

                if(this.environmentManager.transition?.isActive) {
                    const bounds = this.environmentManager.transition.getBounds();
                    const min = bounds.min.z;
                    const max = bounds.max.z + 5;
                    if(newPosition >= min && newPosition <= max) {
                        newPosition = min - this.obstacleDistance;
                    }
                }

                if(newPosition >= -50) {
                    const newInstance = model.clone(true);
                    newInstance.position.z = newPosition;
                    this.obstacles.push(new Obstacle(newInstance));
                    this.gameState.sceneAdd(newInstance);
                }
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

        this.slicedPieces.push(slicedPiece);

        // Remove sliced piece after 2 seconds
        setTimeout(() => {
            this.gameState.sceneRemove(slicedPiece.model);
            this.gameState.worldRemove(slicedPiece.body);
            this.slicedPieces.splice(0, 1);
        }, 2000);
    }
}