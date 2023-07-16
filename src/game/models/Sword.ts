import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import TrailRenderer from "../libs/TrailRenderer.ts";
import GameState from "./GameState.ts";
import HelperManager from "../utils/HelperManager.ts";
import ObstacleManager from "./ObstacleManager.ts";
import { BLOOM_LAYER, EVENTS } from "../../constants.ts";
import { ObstaclePlacement } from "../enums/ObstaclePlacement.ts";

export default class Sword {

    private mouse = new THREE.Vector2();
    private lastMouse = new THREE.Vector2(0, 0);
    private mouseDirection = new THREE.Vector2();
    private deltaI = new THREE.Vector2();   
    private prevMouse = new THREE.Vector2();

    private gameState : GameState;
    private obstacleManager : ObstacleManager;

    private model = new THREE.Object3D();
    private boundingBox = new OBB();
    private bladeMesh = new THREE.Object3D();
    private bladeSize = new THREE.Vector3();

    private contactPointBlade = new THREE.Object3D();
    private contactPointHilt = new THREE.Object3D();
    private trailPoint = new THREE.Object3D();

    private sensitivity : number;

    // Create sword model, bounding box and helper
    constructor() {
        this.gameState = GameState.getInstance();
        this.obstacleManager = ObstacleManager.getInstance();
        const textureLoader = new THREE.TextureLoader();
        this.sensitivity = this.gameState.settings.sensitivity;

        this.gameState.loadGLTF("./assets/katana_test.glb", (obj) => {
            this.model = obj.scene;
            this.model.position.set(0, 0.65, -0.80);
            this.model.up = new THREE.Vector3(0, 0, 1);

            this.model.traverse((obj : THREE.Object3D) => {
                if(obj.name === "Blade") {
                    // Set bloom to blade mesh // TODO : Remove
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
                if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial && obj.material.roughness <= 0.4) {
                    // Do not ask me under any circumstances why is this image the envmap for the blade
                    const texture = textureLoader.load("./assets/blade_envmap.jpeg");
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    obj.material.envMap = texture;
                }
            });

            // Get model size
            const box3 = new THREE.Box3().setFromObject(this.model);
            const size = new THREE.Vector3();
            box3.getSize(size);
            size.x /= 2.5;
            size.y /= 2.5;

            // Setup contact points
            const cpGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
            this.contactPointBlade = new THREE.Mesh(cpGeo, new THREE.MeshStandardMaterial({color: 0xff00ff}));
            this.contactPointBlade.position.set(0, size.y / 2, size.z * -1);
            this.contactPointHilt = new THREE.Mesh(cpGeo, new THREE.MeshStandardMaterial({color: 0x000000}));
            this.contactPointHilt.position.set(0, size.y / 2, 0);

            // Setup a point for the trail to follow
            const tpGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
            this.trailPoint = new THREE.Mesh(tpGeo, new THREE.MeshStandardMaterial({color: 0xffff00}));
            this.trailPoint.position.set(0, size.y + 0.1, -size.z + 0.2);

            this.model.add(this.contactPointBlade);
            this.model.add(this.contactPointHilt);
            this.model.add(this.trailPoint);

            this.gameState.sceneAdd(this.model);
            this.gameState.addLogicHandler(this.handleCollisions);

            this.createSwordTrail();

            const helperManager = new HelperManager();
            helperManager.createSwordHelper(this, this.boundingBox);

            this.setTrailPointVisibility(false);
            this.setTrailPointVisibility(false);
        });

        this.gameState.addEventListener(EVENTS.settingsChanged, () => {
            this.sensitivity = this.gameState.settings.sensitivity;
        });
    }

    // Take mouse event as input and handle sword controls - position, rotatio, bounding box etc
    public move(e : MouseEvent | TouchEvent) {
        this.prevMouse.copy(this.mouse);

        if(e instanceof MouseEvent) {
            this.mouse.x = (e.offsetX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.offsetY / window.innerHeight) * 2 + 1;
        }
        else if(e instanceof TouchEvent) {
            const touch = e.targetTouches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }

        this.deltaI.set(this.mouse.x - this.prevMouse.x, this.mouse.y - this.prevMouse.y);
        this.mouseDirection.x = Math.max(Math.min(this.mouseDirection.x + this.deltaI.x * 5.5, 1), -1);
        this.mouseDirection.y = Math.max(Math.min(this.mouseDirection.y + this.deltaI.y * 5.5, 1), -1);

        // Calculate which way the blade is facing
        const p = this.mouseDirection.x / Math.sqrt(Math.pow(this.mouseDirection.x, 2) + Math.pow(this.mouseDirection.y, 2));
        const beta = Math.asin(p);
        let alpha = THREE.MathUtils.radToDeg(beta);
        if(this.mouseDirection.y >= 0) alpha = -180 - THREE.MathUtils.radToDeg(beta);

        this.model.position.x = 0;
        this.model.position.y = 0.7;
        this.model.rotation.x = THREE.MathUtils.degToRad((this.lastMouse.y - this.deltaI.y * this.sensitivity) * -70);
        this.model.rotation.y = THREE.MathUtils.degToRad((this.lastMouse.x - this.deltaI.x * this.sensitivity) * 90);
        this.model.rotation.z = THREE.MathUtils.degToRad(alpha); 

        this.lastMouse.set(this.lastMouse.x - this.deltaI.x * this.sensitivity, this.lastMouse.y - this.deltaI.y * this.sensitivity);
    }

    // Update bounding boxes, handle collisions with sword and other objects
    public handleCollisions = () => {
        const sliceForce = 3; // How much force should be applied to pieces that get sliced off

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

        // Check bounding box collision with obstacles
        for(const obstacle of this.obstacleManager.getObstacles()) {
            const collisionPoint = obstacle.swordCollide(this.boundingBox, this.contactPointBlade);
            if(collisionPoint != null) {
                const col1 = new THREE.Vector3();
                const col2 = new THREE.Vector3();
                col1.copy(collisionPoint);
                this.contactPointBlade.getWorldPosition(col2);
                const sliceDirection = new THREE.Vector3(col2.x - col1.x, col2.y - col1.y, col2.z - col1.z);
               
                // Check, whether the obstacle can be sliced from this direction
                if(!obstacle.canSlice(sliceDirection)) {
                    const sparkPosition = obstacle.getCenter();
                    /*const sparkPosition = new THREE.Vector3();
                    const bladePosition = new THREE.Vector3();
                    sparkPosition.copy(obstacle.getPosition());
                    this.contactPointBlade.getWorldPosition(bladePosition);
                    if(obstacle.getPlacement() === ObstaclePlacement.BOTTOM) {
                        sparkPosition.y = bladePosition.y;
                    }
                    else {
                        sparkPosition.x = bladePosition.x;
                    }*/

                    this.obstacleManager.playParticles(sparkPosition, sliceDirection);
                    return;
                }

                // Use contact points as coplanar points
                const points : THREE.Vector3[] = [collisionPoint, new THREE.Vector3(), new THREE.Vector3()];
                this.contactPointHilt.getWorldPosition(points[1]);
                this.contactPointBlade.getWorldPosition(points[2]);

                this.obstacleManager.sliceObstacle(obstacle, points, sliceDirection, sliceForce);
            }
        }
    };

    public reset() {
        this.mouse.set(0, 0);
        this.mouseDirection.set(0, 0);
        this.model.rotation.set(0, 0, 0 );
    }

    // Create sword trail
    private createSwordTrail() {
        const speedToShowTrail = 7000;
        const fadeOutFactor = 1.2;
        const fadeInFactor = 2.5;
        const maxOpacity = 0.35;

        const headGeometry = [];
        headGeometry.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.205, 2.3));

        const trail = new TrailRenderer(this.gameState.getScene(), false);

        const material = TrailRenderer.createBaseMaterial();

        material.uniforms.headColor.value.set(0.84, 0.85, 1, 0.0);
        material.uniforms.tailColor.value.set(0.64, 0.65, 1, 0.0);

        material.uniforms.headColor.value.w = 0;
        material.uniforms.tailColor.value.w = 0;


        const trailLength = 20;

        trail.initialize(material, trailLength, false, 0, headGeometry, this.trailPoint);
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

                if(speed > speedToShowTrail && trail.material.uniforms.headColor.value.w < maxOpacity) {
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

    public setContactPointVisibility(visible : boolean) {
        this.contactPointBlade.visible = visible;
        this.contactPointHilt.visible = visible;
    }

    public setTrailPointVisibility(visible : boolean) {
        this.trailPoint.visible = visible;
    }
}