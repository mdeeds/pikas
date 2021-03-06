import * as THREE from "three";
import Ammo from "ammojs-typed";
import { InstancedObject } from "./instancedObject";
import { Assets } from "./assets";

export class Pika {
  private btV1: Ammo.btVector3;
  private btV2: Ammo.btVector3;
  private btV3: Ammo.btVector3;
  private btTx: Ammo.btTransform;
  private btQ: Ammo.btQuaternion;
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private physicsObject: Ammo.btRigidBody;
  private dummy = new THREE.Object3D();
  private instanceId: number;

  constructor(position: THREE.Vector3, private ammo: typeof Ammo,
    private physicsWorld: Ammo.btDiscreteDynamicsWorld,
    private instanced: InstancedObject) {
    this.btV1 = new this.ammo.btVector3();
    this.btV2 = new this.ammo.btVector3();
    this.btV3 = new this.ammo.btVector3();
    this.btTx = new this.ammo.btTransform();
    this.btQ = new this.ammo.btQuaternion(1, 0, 0, 0);
    this.dummy.position.copy(position);
    this.dummy.rotateY(Math.PI / 2);
    this.dummy.updateMatrix();
    // this.dummy.updateMatrixWorld();
    this.addToPhysics();
    this.instanceId = this.instanced.addInstance(this.dummy.matrix);
  }

  public getMatrix(): THREE.Matrix4 {
    this.dummy.updateMatrixWorld();
    return this.dummy.matrixWorld;
  }

  public getObject3D(): THREE.Object3D {
    return this.dummy;
  }

  // rotation is a vector in the direction of the axis of rotation.
  // Length of the vector is the rate of rotation in radians per second.
  public setTorque(rotation: THREE.Vector3) {
    this.btV1.setValue(rotation.x, rotation.y, rotation.z);
    this.btV1.op_mul(0.003);
    this.physicsObject.applyTorque(this.btV1);
  }

  public step(elapsedS: number) {
    this.instanced.setMatrixAt(this.instanceId, this.dummy.matrix);
    // TODO: Also confirm that Pika is touching the ground.
    const force = 1.2 * Math.cos(elapsedS * 4 * Math.PI);
    if (force > 0) {
      this.v1.set(0, force * 0.1, force);
      this.v1.applyMatrix4(this.dummy.matrixWorld);
      this.dummy.getWorldPosition(this.v2);
      this.v1.sub(this.v2);
      this.btV1.setValue(this.v1.x, this.v1.y, this.v1.z);
      this.btV1.op_mul(0.02);
      this.physicsObject.applyCentralForce(this.btV1);
    }
  }

  // Forward is in the positive Z direction.
  private static kRadius = 0.05;
  private static kLength = 0.20;

  private addToPhysics() {
    // Capsule
    const capsule = new this.ammo.btCapsuleShapeZ(Pika.kRadius, Pika.kLength);
    const outerShell = new this.ammo.btCompoundShape();
    this.btTx.setIdentity();
    this.btV1.setValue(0, Pika.kRadius, 0);
    this.btTx.setOrigin(this.btV1);
    outerShell.addChildShape(this.btTx, capsule);

    outerShell.setMargin(0.01);
    const outerBody =
      Assets.makeRigidBody(this.dummy, this.ammo, outerShell, 0.002/*kg*/);
    this.physicsWorld.addRigidBody(outerBody);

    this.physicsObject = outerBody;
    this.dummy.userData['physicsObject'] = outerBody;
  }
}