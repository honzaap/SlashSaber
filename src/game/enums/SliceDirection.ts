import * as THREE from "three";

export class SliceDirection {
    public static readonly ANY = new THREE.Vector2(0, 0);
    public static readonly TOP = new THREE.Vector2(0, -1);
    public static readonly BOTTOM = new THREE.Vector2(0, 1);
    public static readonly LEFT = new THREE.Vector2(1, 0);
    public static readonly RIGHT = new THREE.Vector2(-1, 0);

    private constructor() {}
}