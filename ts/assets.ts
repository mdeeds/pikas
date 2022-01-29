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


}