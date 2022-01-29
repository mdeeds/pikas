import * as THREE from "three";
import Ammo from "ammojs-typed";
import { Assets } from "./assets";

export class Level {
  public static async load(scene: THREE.Object3D,
    physicsWorld: Ammo.btDiscreteDynamicsWorld,
    levelName: string) {
    const gltf = await Assets.loadMesh(levelName);
    scene.add(gltf.scene);

  }
}