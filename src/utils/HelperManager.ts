import * as THREE from "three";
import GUIManager from "./GUIManager";
import GameState from "../models/GameState";
import { OBB } from "three/examples/jsm/math/OBB.js";

export default class HelperManager {
    private logicHandlers : ((delta : number) => void)[];

    constructor() {
        this.logicHandlers = [];
        const gameState = GameState.getInstance();
        gameState.addLogicHandler((delta : number) => { this.update(delta); });
    }

    public createSwordHelper(sword : THREE.Object3D, swordBB : OBB) {
        // Main sword helper
        const gameState = GameState.getInstance();
        const scene = gameState.getScene();

        const size = new THREE.Vector3();
        swordBB.getSize(size);

        const swordHelper = new THREE.Object3D();
        const shMesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial());
        shMesh.material.wireframe = true;
        const rotation = new THREE.Euler();
        const matrix = new THREE.Matrix4();
        matrix.setFromMatrix3(swordBB.rotation);
        rotation.setFromRotationMatrix(matrix);
        swordHelper.up = new THREE.Vector3(0, 0, 1);
        swordHelper.add(shMesh);
        swordHelper.position.copy(swordBB.center);
        swordHelper.rotation.copy(rotation);
        scene.add(swordHelper);
        swordHelper.visible = false;

        // Contact points helpers
        let i = 0;
        for(const point of sword.userData.contactPoints) {
            point.material = new THREE.MeshStandardMaterial({color: 0xff00ff * i});
            point.geometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
            point.visible = false;
            i++;
        }

        // Trail point helper
        sword.userData.trailPoint.material = new THREE.MeshStandardMaterial({color: 0xffff00});
        sword.userData.trailPoint.geometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        sword.userData.trailPoint.visible = false;

        const update = () => {
            swordHelper.position.copy(swordBB.center);
            const rotation = new THREE.Euler();
            const matrix = new THREE.Matrix4();
            matrix.setFromMatrix3(swordBB.rotation);
            rotation.setFromRotationMatrix(matrix);
            swordHelper.rotation.copy(rotation);
        };

        this.logicHandlers.push(update);

        GUIManager.registerSwordHelpers(sword, swordHelper);
    }

    public update(delta : number) {
        for(const handler of this.logicHandlers) {
            handler(delta);
        }
    }
}