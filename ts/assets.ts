import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Ammo from "ammojs-typed";
import * as THREE from "three";

export class Assets {
  public static async loadMesh(model: string): Promise<GLTF> {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(`models/${model}.gltf`, (gltf) => {
        resolve(gltf);
      });
    });
  }

  private static logNamesInternal(object: THREE.Object3D, prefix: string) {
    console.log(`${prefix}${object.name}`);
    for (const c of object.children) {
      this.logNamesInternal(c, ' ' + prefix);
    }
  }

  public static logNames(model: THREE.Object3D) {
    Assets.logNamesInternal(model, '');
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

  private static addGeometryToShape(geometry: THREE.BufferGeometry,
    transform: THREE.Matrix4,
    mesh: Ammo.btTriangleMesh, ammo: typeof Ammo) {
    let numInward = 0;
    let numOutward = 0;
    const positionAttribute = geometry.attributes.position;
    if (!geometry.index) {
      throw new Error("Must have index.");
    }
    const index = geometry.index;
    for (var i = 0; i < index.count / 3; i++) {
      const vertexAIndex = index.getX(i * 3);
      const vertexBIndex = index.getX(i * 3 + 1);
      const vertexCIndex = index.getX(i * 3 + 2);
      const a = new THREE.Vector3();
      a.fromBufferAttribute(positionAttribute, vertexAIndex);
      a.applyMatrix4(transform);
      const b = new THREE.Vector3();
      b.fromBufferAttribute(positionAttribute, vertexBIndex);
      b.applyMatrix4(transform);
      const c = new THREE.Vector3();
      c.fromBufferAttribute(positionAttribute, vertexCIndex);
      c.applyMatrix4(transform);
      mesh.addTriangle(
        new ammo.btVector3(a.x, a.y, a.z),
        new ammo.btVector3(b.x, b.y, b.z),
        new ammo.btVector3(c.x, c.y, c.z),
        false
      );
      b.sub(a);
      c.sub(a);
      b.cross(c);
      let direction = a.dot(b);
      if (direction > 0) {
        ++numOutward;
      } else {
        ++numInward;
      }
    }
  }

  private static addToShapeFromObject(object: THREE.Object3D,
    mesh: Ammo.btTriangleMesh, ammo: typeof Ammo) {
    Assets.logNamesInternal(object, 'A:')
    if (object instanceof THREE.Mesh) {
      object.updateMatrix();
      const matrix = new THREE.Matrix4();
      matrix.copy(object.matrix);
      let o = object.parent;
      while (o) {
        o.updateMatrix();
        matrix.premultiply(o.matrix);
        o = o.parent;
      }
      const geometry: THREE.BufferGeometry = object.geometry;
      Assets.addGeometryToShape(geometry, matrix, mesh, ammo);
    }
    for (const c of object.children) {
      Assets.addToShapeFromObject(c, mesh, ammo);
    }
  }

  public static createShapeFromObject(object: THREE.Object3D, ammo: typeof Ammo)
    : Ammo.btTriangleMesh {
    const mesh: Ammo.btTriangleMesh = new ammo.btTriangleMesh(true, true);
    this.addToShapeFromObject(object, mesh, ammo);
    return mesh;
  }

  private static signedVolumeOfTriangle(
    p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
    return p1.dot(p2.cross(p3)) / 6.0;
  }

  private static getVolumeOfGeometry(geometry: THREE.BufferGeometry) {
    if (!geometry.index) {
      throw new Error("Must be indexed.");
    }
    const index = geometry.index;
    const position = geometry.attributes.position;
    const triangleCount = geometry.index.count / 3;
    let sum = 0;
    const p1 = new THREE.Vector3(),
      p2 = new THREE.Vector3(),
      p3 = new THREE.Vector3();
    for (let i = 0; i < triangleCount; i++) {
      p1.fromBufferAttribute(position, index.getX(i * 3 + 0));
      p2.fromBufferAttribute(position, index.getX(i * 3 + 1));
      p3.fromBufferAttribute(position, index.getX(i * 3 + 2));
      sum += Assets.signedVolumeOfTriangle(p1, p2, p3);
    }
    return sum * 1000;  // Convert from cubic meters to liters
  }

  private static getVolumeOfObject(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) {
      return Assets.getVolumeOfGeometry(object.geometry);
    } else {
      let total = 0;
      for (const c of object.children) {
        total += this.getVolumeOfObject(c);
      }
      console.error("Not implemented.");
      return total;
    }
  }

  public static annotatePhysicsObject(
    object: THREE.Object3D, density: number, ammo: typeof Ammo,
    physicsWorld: Ammo.btDiscreteDynamicsWorld) {
    const btMesh = Assets.createShapeFromObject(object, ammo);
    const volume = Assets.getVolumeOfObject(object);
    const radius = Math.pow(volume / (4 / 3 * Math.PI), 1 / 3) / 10;
    console.log(`Radius: ${radius}`);
    const shape = (density === 0) ?
      new ammo.btBvhTriangleMeshShape(btMesh, true, true) :
      new ammo.btSphereShape(radius);
    shape.setMargin(0.01);
    const mass = density * volume;
    console.log(`Volume: ${volume}; Mass: ${mass}`);
    const body = Assets.makeRigidBody(object, ammo, shape, mass);
    physicsWorld.addRigidBody(body);
    object.userData['physicsObject'] = body;
  }

  public static makeRigidBody(
    object: THREE.Object3D, ammo: typeof Ammo,
    shape: Ammo.btSphereShape | Ammo.btBvhTriangleMeshShape | Ammo.btBoxShape,
    mass: number): Ammo.btRigidBody {

    const btTx = new ammo.btTransform();
    const btQ = new ammo.btQuaternion(0, 0, 0, 0);
    const btV1 = new ammo.btVector3();

    btTx.setIdentity();
    btV1.setValue(
      object.position.x,
      object.position.y,
      object.position.z);
    btTx.setOrigin(btV1);
    btQ.setValue(
      object.quaternion.x,
      object.quaternion.y,
      object.quaternion.z,
      object.quaternion.w);
    btTx.setRotation(btQ);
    const motionState = new ammo.btDefaultMotionState(btTx);
    btV1.setValue(0, 0, 0);
    shape.calculateLocalInertia(mass, btV1);
    const body = new ammo.btRigidBody(
      new ammo.btRigidBodyConstructionInfo(
        mass, motionState, shape, btV1));
    body.setActivationState(4);  // Disable deactivation
    body.activate(true);
    body.setFriction(0.3);
    body.setRestitution(0.1);

    return body;
  }


}