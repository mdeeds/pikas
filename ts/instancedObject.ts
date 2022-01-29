import * as THREE from "three";

export class InstancedObject extends THREE.Object3D {
  private meshes: THREE.InstancedMesh[] = [];
  private instanceCount = 0;

  constructor(source: THREE.Object3D, readonly maxInstanceCount: number) {
    super();
    this.buildInstancedMeshes(source);
  }

  private buildInstancedMeshes(source: THREE.Object3D) {
    if (source instanceof THREE.Mesh) {
      this.addMesh(source);
    } else {
      for (const child of source.children) {
        this.buildInstancedMeshes(child);
      }
    }
  }

  private addMesh(mesh: THREE.Mesh) {
    const matrix = new THREE.Matrix4();
    mesh.updateMatrix();
    matrix.copy(mesh.matrix);
    let o = mesh.parent;
    while (o) {
      console.log(o.name);
      o.updateMatrix();
      matrix.premultiply(o.matrix);
      o = o.parent;
    }
    mesh.geometry.applyMatrix4(matrix);
    const instanced = new THREE.InstancedMesh(
      mesh.geometry, mesh.material, this.maxInstanceCount);
    instanced.receiveShadow = true;
    instanced.castShadow = true;
    this.meshes.push(instanced);
    this.add(instanced);
  }

  public addInstance(matrix: THREE.Matrix4): number {
    if (this.instanceCount >= this.maxInstanceCount) {
      throw new Error("Too many instances!");
    }
    for (const m of this.meshes) {
      m.setMatrixAt(this.instanceCount, matrix);
      m.instanceMatrix.needsUpdate = true;
    }
    ++this.instanceCount;
    return (this.instanceCount - 1);
  }

  public setMatrixAt(i: number, matrix: THREE.Matrix4) {
    for (const m of this.meshes) {
      m.setMatrixAt(i, matrix);
      m.instanceMatrix.needsUpdate = true;
    }
  }
}