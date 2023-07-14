import * as THREE from "three";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import GameState from "../models/GameState";
import Sword from "../models/Sword";
import { GUI_ENABLED } from "../../constants";

export default class GUIManager {

    private static gui : GUI;
    private static stats : Stats;

    private constructor() { }

    private static getGUI() {
        if(!GUI_ENABLED) return;
        if(GUIManager.gui) return GUIManager.gui;

        // Create stats only when the whole GUI is accessed
        GUIManager.stats = new Stats();
        document.body.appendChild(GUIManager.stats.dom);

        GUIManager.gui = new GUI();

        return GUIManager.gui;
    } 

    public static updateStats() {
        GUIManager.stats?.update();
    }

    public static registerLighting(hemiLight : THREE.HemisphereLight) : void {
        const params = {
            sky: 0xe5e7ff,
            ground: 0xd2b156,
            intensity: 1.75
        };

        const g = GUIManager.getGUI();
        if(!g) return;
        const gui = g.addFolder("Hemisphere Light");
        gui.close();
        gui.addColor(params, "sky").onChange(function(value : number) { hemiLight.color  = new THREE.Color(value); });
        gui.addColor(params, "ground").onChange(function(value : number) { hemiLight.groundColor  = new THREE.Color(value); });
        gui.add(hemiLight, "intensity", 0, 7);
    }

    public static registerEnvironment() : void {
        const gameState = GameState.getInstance();
        const scene = gameState.getScene();
        
        const g = GUIManager.getGUI();
        if(!g) return;
        const gui = g.addFolder("World Settings");
        gui.close();

        const params = {
            background: "#000000",
            near: 40,
            far: 65
        };

        gui.addColor(params, "background").onChange(function(value : THREE.Color) {
            scene.background = value;
            scene.fog  = new THREE.Fog(value, params.near, params.far);
        });
        gui.add(params, "near", 20, 100).onChange(function(value : number) { scene.fog = new THREE.Fog(scene.background as THREE.Color ?? new THREE.Color(0x000000), value, params.far); });
        gui.add(params, "far", 20, 100).onChange(function(value : number) { scene.fog = new THREE.Fog(scene.background as THREE.Color ?? new THREE.Color(0x000000), params.near, value); });
    }

    public static registerSwordHelpers(sword : Sword, swordHelper : THREE.Object3D) {
        const g = GUIManager.getGUI();
        if(!g) return;
        const gui = g.addFolder("Sword hepers");
        gui.close();

        const params = {
            boundingBox: false,
            contactPoints: false,
            trailPoint: false,
        };

        gui.add(params, "boundingBox").onChange(function(value : boolean) {
            swordHelper.visible = value;
        });
        gui.add(params, "contactPoints").onChange(function(value : boolean) {
            sword.setContactPointVisibility(value);
        });
        gui.add(params, "trailPoint").onChange(function(value : boolean) {
            sword.setTrailPointVisibility(value);
        });
    }
}