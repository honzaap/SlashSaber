import * as THREE from "three";
import { Obstacle, SlicedPiece } from "./Obstacle";
import GameState from "./GameState";
import EnvironmentManager from "./EnvironmentManager";
import { ObstaclePlacement } from "../enums/ObstaclePlacement";
import { OBSTACLE_TEMPLTES, SPARK_ASSET } from "../../constants";
import { SliceDirection } from "../enums/SliceDirection";
import { Rarity } from "../enums/Rarity";
import ParticleSystem, { Alpha, Body, Color, Emitter, Gravity, Life, Mass, Position, RadialVelocity, RandomDrift, Rate, Scale, Span, SphereZone, SpriteRenderer, Vector3D, ease } from "three-nebula";

type ObstacleTemplate = {
    asset : string,
    placement : ObstaclePlacement,
    model : THREE.Object3D,
    animation: THREE.AnimationClip,
    sliceDirection : THREE.Vector2 | undefined,
    rarity : Rarity,
}

export default class ObstacleManager {

    private static instance : ObstacleManager;

    private gameState : GameState;
    private environmentManager : EnvironmentManager;

    private obstacles : Obstacle[] = [];
    private slicedPieces : SlicedPiece[] = [];

    private obstacleTemplates : ObstacleTemplate[] = []; 

    private readonly maxObstacles = 17;
    private readonly minObstacleDistance = 2.3;
    private readonly maxObstacleDistance = 2.80;
    private readonly rarities : string[] = [];
    private lastPlacement = ObstaclePlacement.LEFT;

    // How long was a given obstacle placement NOT used
    private lastPlacementUsage : { [placement: string]: number } = { };

    private particleSystem = new ParticleSystem();
    private particleSprite = new THREE.Sprite();
    private readonly particleHooks = { onStart : () => {}, onUpdate : () => {}, onEnd : () => {} };

    private constructor() { 
        this.gameState = GameState.getInstance();
        this.environmentManager = EnvironmentManager.getInstance();
        let loadedObstacles = 0;

        for(const template of OBSTACLE_TEMPLTES) {
            this.gameState.loadGLTF(`./assets/obstacles/${template.asset}`, (gltf) => {
                const model = gltf.scene.children[0];
                
                this.obstacleTemplates.push({...template, sliceDirection: template.sliceDirection ?? SliceDirection.ANY,
                    rarity: template.rarity ?? Rarity.COMMON, model, animation: gltf.animations[0]});
                loadedObstacles++;
                if(loadedObstacles === OBSTACLE_TEMPLTES.length) {
                    this.gameState.addLogicHandler(this.update);
                }
            });
        }

        for(const key of Object.keys(ObstaclePlacement)) {
            this.lastPlacementUsage[key] = 0;
        }

        for(const key of Object.keys(Rarity).filter(k => Number.isNaN(parseFloat(k)))) {
            this.rarities.push(key);
        }
        
        this.initParticles();
    }

    public static getInstance() {
        if(!this.instance) this.instance = new ObstacleManager();
        return this.instance;
    }

    public getObstacles() : Obstacle[] {
        return this.obstacles;
    }

    public reset() {
        this.lastPlacement = ObstaclePlacement.LEFT;
        for(const key of Object.keys(ObstaclePlacement)) {
            this.lastPlacementUsage[key] = 0;
        }

        for(const obstacle of this.obstacles) {
            obstacle.remove();
        }

        for(const slicedPiece of this.slicedPieces) {
            this.gameState.sceneRemove(slicedPiece.model);
            this.gameState.worldRemove(slicedPiece.body);
        }

        this.slicedPieces = [];
        this.obstacles = [];
    }

    private update = (delta : number) : void => {
        for(const obstacle of this.obstacles) {
            obstacle.update(delta);
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
            const lastPosition = this.obstacles[this.obstacles.length -1]?.getPosition() ?? new THREE.Vector3(0, 0, -8);
            let newPosition = lastPosition.z - (Math.random() * (this.maxObstacleDistance - this.minObstacleDistance) + this.minObstacleDistance);

            if(this.environmentManager.activeTransition?.isActive) {
                const bounds = this.environmentManager.activeTransition.getBounds();
                const min = bounds.min.z - 2;
                const max = bounds.max.z + 5;
                if(newPosition >= min && newPosition <= max) {
                    newPosition = min - this.minObstacleDistance;
                }
            }

            if(newPosition >= -50) {
                const template = this.getNewTemplate();
                const newInstance = template.model.clone(true);
                newInstance.position.z = newPosition;
                this.obstacles.push(new Obstacle(newInstance, template.placement, template.sliceDirection ?? SliceDirection.ANY, template.animation));
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

        this.slicedPieces.push(slicedPiece);

        // Remove sliced piece after 2 seconds
        setTimeout(() => {
            this.gameState.sceneRemove(slicedPiece.model);
            this.gameState.worldRemove(slicedPiece.body);
            this.slicedPieces.splice(0, 1);
        }, 2000);
    }

    public playParticles(position : THREE.Vector3, sliceDirection : THREE.Vector3) {
        sliceDirection.negate();
        sliceDirection.z = 2;
        const emitter = new Emitter();
        position.z += 0.2;
        emitter.setRate(new Rate(new Span(2, 3), new Span(0.0, 0.0)))
            .addInitializers([
                new Body(this.particleSprite),
                new Mass(4),
                new Life(0.4, 0.5),
                new Position(new SphereZone(0, 0, 0, 0.7)),
                new RadialVelocity(8, new Vector3D(sliceDirection.x * 30, sliceDirection.y * 30, sliceDirection.z * 30), 1),
            ])
            .addBehaviours([
                new RandomDrift(8, 8, 12, .06),
                new Gravity(1.0),
                new Color(new THREE.Color(0xff241c), new THREE.Color(0xffac1c), Infinity, ease.easeOutSine),
                new Alpha(1, 0.4),
                new Scale(0.1, 0.07),
            ])
            .setPosition(position).emit(0.15, 0.15);

        this.particleSystem.addEmitter(emitter).emit(this.particleHooks);
    }

    private initParticles() {
        const map = this.gameState.loadTexture(`./assets/${SPARK_ASSET}`);
        const material = new THREE.SpriteMaterial({
            map,
            color: 0xff0000,
            blending: THREE.AdditiveBlending,
            fog: true,
        });
        this.particleSprite = new THREE.Sprite(material);

        this.particleSystem.addRenderer(new SpriteRenderer(this.gameState.getScene(), THREE));
            
        this.gameState.addLogicHandler((d) => {
            if(this.particleSystem.canUpdate) this.particleSystem.update(d);
        });
    }

    // Get new obstacle template to spawn
    private getNewTemplate() : ObstacleTemplate {
        let filtered = this.obstacleTemplates.filter(t => t.placement !== this.lastPlacement);
        const random = Math.random();
        
        for(const key of this.rarities) {
            const rarity = Rarity[key as keyof typeof Rarity]; // I Fucking hate TypeScript
            if(random <= rarity) {
                const rarityFiltered = filtered.filter(t => t.rarity === rarity);
                if(rarityFiltered.length > 0) filtered = rarityFiltered;
            }
        }
        
        // Make sure that every placement is frequently used
        const underUsed = filtered.find(t => this.lastPlacementUsage[t.placement] >= 5);
        const result = underUsed ?? filtered[Math.floor(Math.random() * filtered.length)];
        this.lastPlacement = result.placement;
        this.updateLastPlacements();

        return result;
    }

    private updateLastPlacements() {
        for(const key of Object.keys(ObstaclePlacement)) {
            this.lastPlacementUsage[key] += 1;
        }

        this.lastPlacementUsage[this.lastPlacement] = 0;
    }
}