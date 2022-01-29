import * as THREE from "three";
import Ammo from "ammojs-typed";
import { Assets } from "./assets";

export class Level {
  public static async load(scene: THREE.Object3D,
    physicsWorld: Ammo.btDiscreteDynamicsWorld,
    levelName: string) {
    const gltf = await Assets.loadMesh(levelName);
    Assets.recieveShadow(gltf.scene);
    Assets.castShadow(gltf.scene);
    scene.add(gltf.scene);
  }
}