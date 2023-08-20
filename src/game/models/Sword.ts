import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import TrailRenderer from "../libs/TrailRenderer.ts";
import GameState from "./GameState.ts";
import ObstacleManager from "./ObstacleManager.ts";
import { ENVMAP_ASSET, EVENTS, SWORD_PRESETS } from "../../constants.ts";

export default class Sword {

    private mouse = new THREE.Vector2();
    private lastMouse = new THREE.Vector2(0, 0);
    private mouseDirection = new THREE.Vector2();
    private deltaI = new THREE.Vector2();   
    private prevMouse = new THREE.Vector2();
    private speed = 0;

    private gameState : GameState;
    private obstacleManager : ObstacleManager;

    private model = new THREE.Object3D();
    private boundingBox = new OBB();
    private bladeMesh = new THREE.Object3D();
    private bladeSize = new THREE.Vector3();
    private sliceDirectionUsage = [0, 0, 0, 0, 0, 0, 0, 0];

    private contactPointBlade = new THREE.Object3D();
    private contactPointHilt = new THREE.Object3D();
    private trailPoint = new THREE.Object3D();

    private trail : TrailRenderer | undefined;

    private sensitivity : number;

    private scoreMultiplier = 1.0;
    private readonly scoreBase = 10;
    private readonly maxSpeedMultiplier = 1.55;
    private readonly speedMultiplierStart = 7000;
    //private readonly variationMultiplierStart = 3;

    // Create sword model, bounding box and helper
    constructor() {
        this.gameState = GameState.getInstance();
        this.obstacleManager = ObstacleManager.getInstance();
        this.sensitivity = this.gameState.settings.sensitivity;
        this.model.position.set(0, 0.65, -0.80);
        this.model.up = new THREE.Vector3(0, 0, 1);
        this.gameState.sceneAdd(this.model);
        this.gameState.addLogicHandler(this.handleCollisions);
        this.scoreMultiplier = this.gameState.settings.rushMode ? 1.25 : 0.75;

        this.gameState.addEventListener(EVENTS.settingsChanged, () => {
            this.sensitivity = this.gameState.settings.sensitivity;
            this.scoreMultiplier = this.gameState.settings.rushMode ? 1.25 : 0.75;
        });

        this.gameState.addEventListener(EVENTS.swordChanged, () => {
            this.loadModel();
        });
        
        this.loadModel();
    }

    public loadModel() {
        // Clear model
        while (this.model.children.length > 0) {
            const object = this.model.children.pop();
            if(object) object.parent = null;
        }
        this.model.clear();

        const hideGuard = SWORD_PRESETS.find(p => p.name === this.gameState.settings.guardModel)?.hideGuard;

        const components = [
            { name: "blade", value: this.gameState.settings.bladeModel },
            ... hideGuard ? [] : [{ name: "guard", value: this.gameState.settings.guardModel }],
            { name: "hilt", value: this.gameState.settings.hiltModel },
        ];

        // Check if components are valid
        for(const component of components) {
            const preset = SWORD_PRESETS.find(p => p.name.toLowerCase() === component.value.toLocaleLowerCase());
            if(!preset) {
                component.value = "Default";
            }
        }

        let loadedComponents = 0;

        for(const component of components) {
            this.gameState.loadGLTF(`/3d_assets/swords/${component.name}_${component.value.toLowerCase()}.glb`, (gltf) => {
                gltf.scene.traverse((obj : THREE.Object3D) => {
                    if(obj.name === "Blade") {
                        // Get blade mesh and size
                        const bounds = new THREE.Box3();
                        bounds.setFromObject(obj);
                        bounds.getSize(this.bladeSize);
                        this.bladeSize.multiplyScalar(0.5);
                        
                        this.bladeMesh = obj;
                        this.boundingBox = new OBB(new THREE.Vector3(), this.bladeSize);
                    }
                    
                    if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial && obj.material.roughness <= 0.4) {
                        const texture = this.gameState.loadTexture(ENVMAP_ASSET);
                        texture.mapping = THREE.EquirectangularReflectionMapping;
                        obj.material.envMap = texture;
                    }
                });
                    
                this.model.add(gltf.scene);
                loadedComponents++;

                if(loadedComponents === components.length) {
                    // Get model size
                    const box3 = new THREE.Box3().setFromObject(this.model);
                    const size = new THREE.Vector3();
                    box3.getSize(size);
                    size.x /= 2.5;
                    size.y /= 2.5;
        
                    // Setup contact points
                    const cpGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
                    this.contactPointBlade = new THREE.Mesh(cpGeo);
                    this.contactPointBlade.position.set(0, size.y / 2, size.z * -1);
                    this.contactPointHilt = new THREE.Mesh(cpGeo);
                    this.contactPointHilt.position.set(0, size.y / 2, 0);
        
                    // Setup a point for the trail to follow
                    const tpGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
                    this.trailPoint = this.trailPoint ?? new THREE.Mesh(tpGeo);
                    this.trailPoint.position.set(0, size.y + 0.1, -size.z + 0.2);
                    
                    this.model.add(this.contactPointBlade);
                    this.model.add(this.contactPointHilt);
                    this.model.add(this.trailPoint);

                    this.trailPoint.visible = false;
                    this.contactPointBlade.visible = false;
                    this.contactPointHilt.visible = false;
        
                    //this.gameState.sceneAdd(this.model);
        
                    if(!this.trail?.isActive) {
                        this.createSwordTrail();
                    }
                    else {
                        this.updateSwordTrail();
                    }
                }
            });
        }

        this.gameState.addEventListener(EVENTS.load, () => {
            this.trailPoint.visible = false;
            this.contactPointBlade.visible = false;
            this.contactPointHilt.visible = false;
        });
    }

    // Take mouse event as input and handle sword controls - position, rotatio, bounding box etc
    public move(e : MouseEvent | TouchEvent) {
        this.prevMouse.copy(this.mouse);
        let isTouch = false;
        if(e instanceof MouseEvent) {
            this.mouse.x = (e.offsetX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.offsetY / window.innerHeight) * 2 + 1;
        }
        else if(e instanceof TouchEvent) {
            isTouch = true;
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

        const touchFactorX = isTouch ? 1.5 : 1;
        const touchFactorY = isTouch ? 3 : 1;
        this.model.position.x = 0;
        this.model.position.y = 0.7;
        this.model.rotation.x = THREE.MathUtils.degToRad((this.lastMouse.y - this.deltaI.y * this.sensitivity * touchFactorY) * -70);
        this.model.rotation.y = THREE.MathUtils.degToRad((this.lastMouse.x - this.deltaI.x * this.sensitivity * touchFactorX) * 90);
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
               
                // Check, whether the obstacle can be sliced from this direction, if not, generate particle sparks
                if(!obstacle.canSlice(sliceDirection)) {
                    const sparkPosition = obstacle.getCenter();
                    this.obstacleManager.playParticles(sparkPosition, sliceDirection);
                    if(!obstacle.slashed) {
                        this.gameState.gotHit();
                    }

                    obstacle.slashed = true;

                    setTimeout(() => {
                        obstacle.hideObstacle();
                    }, 300);
                    
                    return;
                }

                // Use contact points as coplanar points
                const points : THREE.Vector3[] = [collisionPoint, new THREE.Vector3(), new THREE.Vector3()];
                this.contactPointHilt.getWorldPosition(points[1]);
                this.contactPointBlade.getWorldPosition(points[2]);
                
                this.obstacleManager.sliceObstacle(obstacle, points, sliceDirection, sliceForce);
                
                // Calculate score and add it to gamestate
                const normalized = this.normalizeSliceDirection(sliceDirection);
                this.sliceDirectionUsage = this.sliceDirectionUsage.map((dir : number, i : number) => {
                    return Math.max(dir + (normalized === i ? 2 : -1), 0);
                });
                const speedMultiplier = Math.min(Math.max(this.speed / this.speedMultiplierStart, 1), this.maxSpeedMultiplier);
                const slicedTimesMultiplier = 1 + obstacle.slicedTimes * 0.3;

                // It doesn't really work too well... 
                //let variationMultiplier = 1; // Multiplier below 1 for overused slicing directions
                //if(this.sliceDirectionUsage[normalized] > this.variationMultiplierStart) {
                //    variationMultiplier = 1 / (this.sliceDirectionUsage[normalized] - this.variationMultiplierStart);
                //}
        
                const score = this.scoreBase * speedMultiplier * slicedTimesMultiplier * this.scoreMultiplier;// * variationMultiplier;
                this.gameState.addScore(score);
            }
        }
    };

    public reset() {
        this.mouse.set(0, 0);
        this.mouseDirection.set(0, 0);
        this.model.rotation.set(0, 0, 0 );
        this.lastMouse.set(0, 0);
        this.prevMouse.set(0, 0);
        this.deltaI.set(0, 0);
        this.sliceDirectionUsage = [0, 0, 0, 0, 0, 0, 0, 0];
        this.speed = 0;
    }

    private normalizeSliceDirection(sliceDirection : THREE.Vector3) {
        const normalized = new THREE.Vector2(sliceDirection.x, sliceDirection.y);
        normalized.normalize();
        return (Math.round(8 * normalized.angle() / (2 * Math.PI) + 8 ) % 8);
    }

    private updateSwordTrail() {
        if(this.trail == null) return;

        const preset = SWORD_PRESETS.find(p => p.name === this.gameState.settings.bladeModel);
        if(!preset) return;

        // Convert preset color to Vector3 
        const color1 = new THREE.Color(preset.color1);
        const color2 = new THREE.Color(preset.color2);

        const material = this.trail.material;

        material.uniforms.headColor.value.set(color1.r, color1.g, color1.b, 0);
        material.uniforms.tailColor.value.set(color2.r, color2.g, color2.b, 0);
    }

    // Create sword trail
    private createSwordTrail() {
        const speedToShowTrail = 7000;
        const fadeOutFactor = 1.0;
        const fadeInFactor = 2.5;
        const maxOpacity = 0.35;

        let lastUpdate = performance.now();
        let opacityGoingUp = false;
        const prevMouse = new THREE.Vector2(-1, -1);

        this.trail = new TrailRenderer(this.gameState.getScene(), false);

        const material = TrailRenderer.createBaseMaterial();

        //material.uniforms.headColor.value.set(0.84, 0.85, 1, 0.0);
        //material.uniforms.tailColor.value.set(0.64, 0.65, 1, 0.0);

        //material.uniforms.headColor.value.w = 0;
        //material.uniforms.tailColor.value.w = 0;
        
        const trailLength = 20;
        
        const headGeometry = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.205, 2.3)];
        headGeometry.push();
        
        this.trail.initialize(material, trailLength, false, 0, headGeometry, this.trailPoint);
        this.updateSwordTrail();
        this.trail.activate();
        this.trail.advance();
        
        const updateTrail = (delta : number) => {
            if(this.trail == null || !this.trail.isActive) return;

            // Update trail mesh
            const time = performance.now();
            if (time - lastUpdate > 10) {
                this.trail.advance();
                lastUpdate = time;
            } 
            else {
                this.trail.updateHead();
            }

            // Update trail opacity
            if(prevMouse.x !== -1 ) {
                const distance = Math.sqrt(Math.pow(prevMouse.x - this.gameState.mouse.x, 2) + Math.pow(prevMouse.y - this.gameState.mouse.y, 2));
                this.speed = distance / delta;

                if(this.speed > speedToShowTrail && this.trail.material.uniforms.headColor.value.w < maxOpacity) {
                    opacityGoingUp = true;
                }

                if(opacityGoingUp) {
                    this.trail.material.uniforms.headColor.value.w += fadeInFactor * delta; 
                    if(this.trail.material.uniforms.headColor.value.w >= maxOpacity) {
                        opacityGoingUp = false;
                    }
                }
                else { 
                    this.trail.material.uniforms.headColor.value.w = Math.max(this.trail.material.uniforms.headColor.value.w - fadeOutFactor * delta, 0);
                }
            }

            prevMouse.x = this.gameState.mouse.x;
            prevMouse.y = this.gameState.mouse.y;
        };

        this.gameState.addLogicHandler(updateTrail);
    }
}