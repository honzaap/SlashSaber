import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CSG } from "three-csg-ts";
import TrailRenderer from "../libs/TrailRenderer.ts";
import GameState from "./GameState.ts";
import HelperManager from "../utils/HelperManager.ts";
import * as CANNON from "cannon-es";

export default class Sword extends THREE.Object3D {

    private mouse = new THREE.Vector2();
    private mouseDirection = new THREE.Vector2();

    private gameState : GameState;

    private model = new THREE.Object3D();
    private boundingBox = new OBB();

    //private body : CANNON.Body;

    // Create sword model, bounding box and helper
    constructor() {
        super();
        this.gameState = GameState.getInstance();

        this.gameState.loadGLTF("./assets/katana.glb", (obj) => {
            this.model = obj.scene;
            this.model.position.set(0, 0.65, -0.80);
            this.model.up = new THREE.Vector3(0, 0, 1);

            // Get model size
            const box3 = new THREE.Box3().setFromObject(this.model);
            let size = new THREE.Vector3();
            box3.getSize(size);
            size.x /= 2.5;
            size.y /= 2.5;

            this.model.userData.size = size; // TODO : Move everything from userData to class
            this.boundingBox = new OBB(new THREE.Vector3(), this.model.userData.size);

            // Setup collision body
            /*this.body = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Box(new CANNON.Vec3(0, 0, 0)),
            });*/

            // Setup contact points
            this.model.userData.contactPoints = [];
            for(let i = 0; i < 2; i++) {
                const pointGeo = new THREE.BoxGeometry(0.0, 0.0, 0.0);
                const point = new THREE.Mesh(pointGeo);
                this.model.add(point);
                point.position.z = size.z * -i;
                point.position.y = size.y / 2;
                this.model.userData.contactPoints.push(point);
            }

            // Setup a point for the trail to follow
            const tpGeo = new THREE.BoxGeometry(0.0, 0.0, 0.0);
            const tp = new THREE.Mesh(tpGeo);
            this.model.add(tp);
            tp.position.z = -size.z + 0.2;
            tp.position.y = size.y + 0.1;
            this.model.userData.trailPoint = tp;

            this.model.layers.toggle(2);
            this.model.traverse((obj) => {
                if(obj.parent?.name === "Blade")
                obj.layers.toggle(2);
            });

            this.gameState.sceneAdd(this.model);

            this.gameState.addLogicHandler(this.handleCollisions);
            this.createSwordTrail(this.model);

            const helperManager = new HelperManager();
            helperManager.createSwordHelper(this.model);
        });
    }

    // Take mouse event as input and handle sword controls - position, rotatio, bounding box etc
    public move(e : MouseEvent) {
        const prevMouse = new THREE.Vector2();
        prevMouse.copy(this.mouse);
        this.mouse.x = (e.offsetX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.offsetY / window.innerHeight) * 2 + 1;
        const deltaI = new THREE.Vector2(this.mouse.x - prevMouse.x, this.mouse.y - prevMouse.y);
        this.mouseDirection.x = Math.max(Math.min(this.mouseDirection.x + deltaI.x * 3.5, 1), -1);
        this.mouseDirection.y = Math.max(Math.min(this.mouseDirection.y + deltaI.y * 3.5, 1), -1);

        // Calculate which way the blade is facing
        const p = this.mouseDirection.x / Math.sqrt(Math.pow(this.mouseDirection.x, 2) + Math.pow(this.mouseDirection.y, 2));
        const beta = Math.asin(p);
        let alpha = THREE.MathUtils.radToDeg(beta);
        if(this.mouseDirection.y >= 0) alpha = -180 - THREE.MathUtils.radToDeg(beta);

        this.model.position.x = 0;
        this.model.position.y = 0.7;
        this.model.rotation.x = THREE.MathUtils.degToRad(this.mouse.y * 70);
        this.model.rotation.y = THREE.MathUtils.degToRad(this.mouse.x * -90);
        this.model.rotation.z = THREE.MathUtils.degToRad(alpha); 
    }

    // Update bounding boxes, handle collisions with sword and other objects
    public handleCollisions = () => {
        const cutForce = 3; // How much force should be applied to pieces that get cut off
        
        // Update sword bounding box
        const matrix = new THREE.Matrix4();
        const rotation = new THREE.Euler();
        rotation.copy(this.model.rotation);
        
        matrix.makeRotationFromEuler(rotation);
        const position = new THREE.Vector3();
        position.copy(this.model.position);
        if(this.model.userData.size) {
            const matrix3 = new THREE.Matrix3();
            matrix3.setFromMatrix4(matrix);
            this.boundingBox.set(position, this.model.userData.size, matrix3);
        }

        // Update obstacles bounding boxes
        /*for(const {obstacle, obstacleBB} of obstacles) {
            obstacleBB.copy(obstacle.geometry.boundingBox).applyMatrix4(obstacle.matrixWorld);
        }*/

        // Check this.model collisions with objects
        /*for(const {obstacle, obstacleBB} of obstacles) {
            if(this.boundingBox.intersectsBox3(obstacleBB) && obstacle.userData.collided !== true) { // Collision occured
                const point = this.model.userData.contactPoints[1];
                let worldPos = new THREE.Vector3();
                point.getWorldPosition(worldPos);
                obstacle.userData.collisionPoint = worldPos;
                obstacle.userData.collided = true;
            }
            else if(!this.boundingBox.intersectsBox3(obstacleBB) && obstacle.userData.collided === true) { // Stopped colliding
                obstacle.userData.collided = false;

                const col1 = new THREE.Vector3();
                const col2 = new THREE.Vector3();
                col1.copy(obstacle.userData.collisionPoint);
                this.model.userData.contactPoints[1].getWorldPosition(col2);
                const cutDirection = new THREE.Vector3(col2.x - col1.x, col2.y - col1.y, col2.z - col1.z);

                const points : THREE.Vector3[] = [obstacle.userData.collisionPoint];
                for(const point of sword.userData.contactPoints ?? []) { // Go through each contact point on the sword
                    const worldPos = new THREE.Vector3();
                    point.getWorldPosition(worldPos);
                    points.push(worldPos);
                }
                obstacle.userData.collisionPoints = null;

                // Generate a plane, which cuts through the object
                const plane = new THREE.Plane(new THREE.Vector3(0.0, 0.0, 0.0));
                plane.setFromCoplanarPoints(points[0], points[1], points[2]);

                obstacle.updateMatrix();
                obstacle.updateMatrixWorld();

                const geometry = new THREE.PlaneGeometry(10, 10);
                const planeMesh = new THREE.Mesh(geometry);
                const planeMesh2 = new THREE.Mesh(geometry);

                // Points to tell, if the normal is facing the obstacle or not
                const v1 = new THREE.Vector3();
                const v2 = new THREE.Vector3();
                v1.copy(points[0]).add(plane.normal);
                v2.copy(points[0]).sub(plane.normal);

                // Create 2 planes, one with flipped normal to correctly clip both sides
                // planeMesh is the one that leaves behind a cut piece with physics
                if(v1.distanceTo(obstacle.position) > v2.distanceTo(obstacle.position)) {
                    planeMesh.position.copy(plane.normal);
                    planeMesh.position.multiplyScalar(-plane.constant);
                    planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                    planeMesh.userData.normal = new THREE.Vector3();
                    planeMesh.userData.normal.copy(plane.normal);

                    plane.negate();

                    planeMesh2.position.copy(plane.normal);
                    planeMesh2.position.multiplyScalar(-plane.constant);
                    planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                    planeMesh2.userData.normal = new THREE.Vector3();
                    planeMesh2.userData.normal.copy(plane.normal);
                }
                else {
                    planeMesh2.position.copy(plane.normal);
                    planeMesh2.position.multiplyScalar(-plane.constant);
                    planeMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                    planeMesh2.userData.normal = new THREE.Vector3();
                    planeMesh2.userData.normal.copy(plane.normal);

                    plane.negate();

                    planeMesh.position.copy(plane.normal);
                    planeMesh.position.multiplyScalar(-plane.constant);
                    planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
                    planeMesh.userData.normal = new THREE.Vector3();
                    planeMesh.userData.normal.copy(plane.normal);
                }

                // Update plane matrices
                planeMesh.updateMatrix();
                planeMesh2.updateMatrix();

                // Cut through object (CSG)
                const res = CSG.subtract(obstacle, planeMesh); // TODO : Maybe name it something better that "res"
                res.updateMatrix();
                res.updateMatrixWorld();

                const res2 = CSG.subtract(obstacle, planeMesh2);

                const box3 = new THREE.Box3().setFromObject(res);
                const size = new THREE.Vector3();
                box3.getSize(size);

                // The result of the CSG operation has the pivot in the same location as the main mesh, this resets it to center
                const boundingBox = new  THREE.Box3();
                boundingBox.setFromObject(res);

                const middle = new THREE.Vector3();
                const g = res.geometry;
            
                g.computeBoundingBox();

                if(g.boundingBox) {
                    middle.x = (g.boundingBox.max.x + g.boundingBox.min.x) / 2;
                    middle.y = (g.boundingBox.max.y + g.boundingBox.min.y) / 2;
                    middle.z = (g.boundingBox.max.z + g.boundingBox.min.z) / 2;
                }
            
                res.localToWorld(middle);

                res.geometry.center();
                res.updateMatrix();
                res.updateMatrixWorld();

                const cutPieceBody = new CANNON.Body({
                    mass: Math.max(8 * size.x * size.y * size.z, 0.3),
                    shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
                    position: new CANNON.Vec3(middle.x, middle.y, middle.z),
                });

                cutPieceBody.updateMassProperties();
                cutPieceBody.aabbNeedsUpdate = true;
                this.gameState.worldAdd(cutPieceBody);

                res.userData.body = cutPieceBody;
                res.position.copy(middle);

                cutPieceBody.applyLocalImpulse(new CANNON.Vec3(cutDirection.x * cutForce, cutDirection.y * cutForce, cutDirection.z * cutForce), new CANNON.Vec3(0, 0, 0));

                const res2BB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
                res2BB.setFromObject(res2);

                this.gameState.sceneAdd(res);
                this.gameState.sceneAdd(res2);
                this.gameState.sceneRemove(obstacle);
                //slicedObstacles.push(res);
                //obstacles[obstacles.findIndex(c => c.obstacle.uuid === obstacle.uuid)] = { obstacle: res2, obstacleBB: res2BB };

                // Remove cut piece after 2 seconds
                setTimeout(() => {
                    this.gameState.sceneRemove(res);
                    this.gameState.worldRemove(cutPieceBody);
                    //slicedObstacles.splice(slicedObstacles.findIndex(i => i.uuid === res.uuid), 1);
                }, 2000);
        
                //gameState.movingSpeed = 0; // DEBUG
            }
        }*/
    }

    // Create sword trail
    private createSwordTrail(sword : THREE.Object3D) {
        const speedToShowTrail = 7000;
        const fadeOutFactor = 1;
        const fadeInFactor = 2;
        const maxOpacity = 0.2;

        const headGeometry = [];
        headGeometry.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.205, 2.3));

        const trail = new TrailRenderer(this.gameState.getScene(), false);

        const material = TrailRenderer.createBaseMaterial();

        material.uniforms.headColor.value.set(0.84, 0.85,1, 0.2);
        material.uniforms.tailColor.value.set(0.64, 0.65, 1, 0.0);

        const trailLength = 20;

        trail.initialize(material, trailLength, false, 0, headGeometry, sword.userData.trailPoint);
        trail.activate();
        trail.advance();

        let lastUpdate = performance.now();
        let opacityGoingUp = false;
        const prevMouse = new THREE.Vector2(-1, -1);

        const updateTrail = (delta : number) => {
            // Update trail mesh
            const time = performance.now();
            if (time - lastUpdate > 10) {
                trail.advance();
                lastUpdate = time;
            } 
            else {
                trail.updateHead();
            }

            // Update trail opacity
            if(prevMouse.x !== -1 ) {
                const distance = Math.sqrt(Math.pow(prevMouse.x - this.gameState.mouse.x, 2) + Math.pow(prevMouse.y - this.gameState.mouse.y, 2));
                const speed = distance / delta;

                if(speed > speedToShowTrail && trail.material.uniforms.headColor.value.w < 0.2) {
                    opacityGoingUp = true;
                }

                if(opacityGoingUp) {
                    trail.material.uniforms.headColor.value.w += fadeInFactor * delta; 
                    if(trail.material.uniforms.headColor.value.w >= maxOpacity) {
                        opacityGoingUp = false;
                    }
                }
                else { 
                    trail.material.uniforms.headColor.value.w = Math.max(trail.material.uniforms.headColor.value.w - fadeOutFactor * delta, 0);
                }
            }

            prevMouse.x = this.gameState.mouse.x;
            prevMouse.y = this.gameState.mouse.y;
        }

        this.gameState.addLogicHandler(updateTrail);
    }
}