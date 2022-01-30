import * as THREE from "three";
import Ammo from "ammojs-typed";
import { Assets } from "./assets";

export class Level {
  public static async load(scene: THREE.Object3D,
    physicsWorld: Ammo.btDiscreteDynamicsWorld,
    ammo: typeof Ammo, movingObjects: THREE.Object3D[],
    levelName: string) {
    const gltf = await Assets.loadMesh(levelName);
    Assets.logNames(gltf.scene);
    Assets.recieveShadow(gltf.scene);
    Assets.castShadow(gltf.scene);

    Level.ripObjects(gltf.scene, ammo, scene, physicsWorld, movingObjects);

    scene.add(gltf.scene);
  }

  private static ripObjects(object: THREE.Object3D, ammo: typeof Ammo,
    scene: THREE.Object3D, physicsWorld: Ammo.btDiscreteDynamicsWorld,
    movingObjects: THREE.Object3D[]): THREE.Object3D {
    if (object.name.startsWith('s-')) {
      // Static object
      console.log(`Static: ${object.name}`);
      Assets.annotatePhysicsObject(object, 0.0, ammo, physicsWorld);
    } else if (object.name.startsWith('p-')) {
      // Passive object
      console.log(`Passive: ${object.name}`);
      Assets.annotatePhysicsObject(object, 0.001, ammo, physicsWorld);
      // object.parent.remove(object);
      movingObjects.push(object);
      return object;
    } else {
      console.log(`Recursing: ${object.name}`);
      const liveObjects: THREE.Object3D[] = [];
      for (const c of object.children) {
        const o = Level.ripObjects(c, ammo, scene, physicsWorld, movingObjects);
        if (o) {
          liveObjects.push(o);
        }
      }
      // We do this here so we don't mess up the collection while we
      // are iterating through it.
      for (const o of liveObjects) {
        scene.add(o);
      }
    }
    return null;
  }
}