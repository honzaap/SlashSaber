import * as THREE from "three";
import GUIManager from "./GUIManager";

export default class HelperManager {
    private scene : THREE.Scene | undefined;
    private logicHandlers : Function[];

    constructor() {
        this.logicHandlers = [];
    }

    setScene(scene : THREE.Scene) {
        this.scene = scene
    }

    public createSwordHelper(sword : THREE.Object3D, size : THREE.Vector3) {
        // Main sword helper
        const swordHelper = new THREE.Object3D();
        const shMesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial());
        shMesh.material.wireframe = true;
        shMesh.position.set(0, 0, -sword.userData.size.z / 2);
        swordHelper.up = new THREE.Vector3(0, 0, 1);
        swordHelper.add(shMesh);
        this.scene?.add(swordHelper);
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
            const matrix = new THREE.Matrix4();
            const rotation = new THREE.Euler();

            rotation.copy(sword.rotation);
            matrix.makeRotationFromEuler(rotation);

            const position = new THREE.Vector3();
            position.copy(sword.position);

            swordHelper.position.copy(position);
            swordHelper.setRotationFromMatrix(matrix);
        }

        this.logicHandlers.push(update);


        GUIManager.registerSwordHelpers(sword, swordHelper);
    }

    public update(delta : number) {
        for(const handler of this.logicHandlers) {
            handler(delta);
        }
    }
}