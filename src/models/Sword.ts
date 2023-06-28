import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import TrailRenderer from "../libs/TrailRenderer.ts";
import GameState from "./GameState.ts";
import HelperManager from "../utils/HelperManager.ts";
import ObstacleManager from "./ObstacleManager.ts";
import { BLOOM_LAYER } from "../constants.ts";

export default class Sword {

    private mouse = new THREE.Vector2();
    private mouseDirection = new THREE.Vector2();

    private gameState : GameState;
    private obstacleManager : ObstacleManager;

    private model = new THREE.Object3D();
    private boundingBox = new OBB();
    private bladeMesh : THREE.Object3D;
    private bladeSize = new THREE.Vector3();

    // Create sword model, bounding box and helper
    constructor() {
        this.gameState = GameState.getInstance();
        this.obstacleManager = ObstacleManager.getInstance();
        this.bladeMesh = new THREE.Object3D();

        this.gameState.loadGLTF("./assets/katana.glb", (obj) => {
            this.model = obj.scene;
            this.model.position.set(0, 0.65, -0.80);
            this.model.up = new THREE.Vector3(0, 0, 1);

            console.log(this.model);

            this.model.traverse((obj : THREE.Object3D) => {
                if(obj.name === "Blade") {
                    // Set bloom to blade mesh
                    for(const mesh of obj.children) {
                        mesh.layers.toggle(BLOOM_LAYER);
                    }

                    // Get blade mesh and size
                    const bounds = new THREE.Box3();
                    bounds.setFromObject(obj);
                    bounds.getSize(this.bladeSize);
                    this.bladeSize.multiplyScalar(0.5);

                    this.bladeMesh = obj;
                    this.boundingBox = new OBB(new THREE.Vector3(), this.bladeSize);
                }
            });

            // Get model size
            const box3 = new THREE.Box3().setFromObject(this.model);
            const size = new THREE.Vector3();
            box3.getSize(size);
            size.x /= 2.5;
            size.y /= 2.5;

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

            this.gameState.sceneAdd(this.model);

            this.gameState.addLogicHandler(this.handleCollisions);
            this.createSwordTrail(this.model);

            const helperManager = new HelperManager();
            helperManager.createSwordHelper(this.model, this.boundingBox);
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
        const matrix4 = new THREE.Matrix4();
        const rotation = new THREE.Euler();
        rotation.copy(this.model.rotation);
        matrix4.makeRotationFromEuler(rotation);
        const matrix3 = new THREE.Matrix3();
        matrix3.setFromMatrix4(matrix4);

        const bounds = new THREE.Box3();
        bounds.setFromObject(this.bladeMesh);
        const center = new THREE.Vector3((bounds.max.x + bounds.min.x) / 2, (bounds.max.y + bounds.min.y) / 2, (bounds.max.z + bounds.min.z) / 2);
        this.boundingBox.set(center, this.bladeSize, matrix3);

        // Check this.model collisions with objects
        for(const obstacle of this.obstacleManager.getObstacles()) {
            const collisionPoint = obstacle.swordCollide(this.boundingBox, this.model.userData.contactPoints[1]); // TODO : userdata x
            if(collisionPoint != null) {
                const col1 = new THREE.Vector3();
                const col2 = new THREE.Vector3();
                col1.copy(collisionPoint);
                this.model.userData.contactPoints[1].getWorldPosition(col2);
                const cutDirection = new THREE.Vector3(col2.x - col1.x, col2.y - col1.y, col2.z - col1.z);

                const points : THREE.Vector3[] = [collisionPoint];
                for(const point of this.model.userData.contactPoints ?? []) { // Go through each contact point on the sword
                    const worldPos = new THREE.Vector3();
                    point.getWorldPosition(worldPos);
                    points.push(worldPos);
                }

                this.obstacleManager.cutObstacle(obstacle, points, cutDirection, cutForce);
            }
        }
    };

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
        };

        this.gameState.addLogicHandler(updateTrail);
    }
}