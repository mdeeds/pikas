import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Assets {
  public static async loadMesh(model: string): Promise<GLTF> {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(`models/${model}.gltf`, (gltf) => {
        resolve(gltf);
      });
    });
  }

  public static recieveShadow(model: THREE.Object3D) {
    model.receiveShadow = true;
    for (const c of model.children) {
      this.recieveShadow(c);
    }
  }
  public static castShadow(model: THREE.Object3D) {
    model.castShadow = true;
    for (const c of model.children) {
      this.castShadow(c);
    }
  }
}