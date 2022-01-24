import * as THREE from "three";
import Ammo from "ammojs-typed";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export class Pika extends THREE.Group {
  private btV1: Ammo.btVector3;
  private btV2: Ammo.btVector3;
  private btV3: Ammo.btVector3;
  private btTx: Ammo.btTransform;
  private btQ: Ammo.btQuaternion;

  constructor(position: THREE.Vector3, private ammo: typeof Ammo,
    private physicsWorld: Ammo.btDiscreteDynamicsWorld) {
    super();
    this.btV1 = new this.ammo.btVector3();
    this.btV2 = new this.ammo.btVector3();
    this.btV3 = new this.ammo.btVector3();
    this.btTx = new this.ammo.btTransform();
    this.btQ = new this.ammo.btQuaternion(1, 0, 0, 0);
    this.position.copy(position);
    this.rotateY(Math.PI / 2);
    this.setGeometry();
    this.addToPhysics();
  }

  public updatePositionFromPhysics(elapsedS: number) {
    const physicsObject = this.userData['physicsObject'] as Ammo.btRigidBody;
    // Set position and rotation to match Physics.
    const worldTransform = physicsObject.getWorldTransform();
    const position = worldTransform.getOrigin();
    this.position.set(position.x(), position.y(), position.z());
    const rotation = worldTransform.getRotation();
    this.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
    this.updateMatrixWorld();

    // Apply force if neccessary (i.e. walking)
    const velocity = physicsObject.getLinearVelocity().length()
    if (velocity < 0.5) {
      // TODO: Also confirm that Pika is touching the ground.
      const force = 0.2 * (Math.cos(elapsedS * 8) + 1);
      const forward = new THREE.Vector3(0, force * 0.1, force);
      forward.applyMatrix4(this.matrixWorld);
      this.btV1.setValue(forward.x, forward.y, forward.z);
      physicsObject.applyCentralForce(this.btV1);
    }

    const rotationalVelocity = physicsObject.getAngularVelocity();
    rotationalVelocity.op_mul(0.5);
    physicsObject.setAngularVelocity(rotationalVelocity);
    // const pikaAngVelocity = new THREE.Vector3(
    //   rotationalVelocity.x(), rotationalVelocity.y(), rotationalVelocity.z());

    const worldUp = new THREE.Vector3(0, 1, 0);
    const pikaUp = new THREE.Vector3(0, 1, 0);
    pikaUp.applyMatrix4(this.matrixWorld);
    pikaUp.cross(worldUp);
    pikaUp.multiplyScalar(0.02);
    this.btV1.setValue(pikaUp.x, pikaUp.y, pikaUp.z);
    physicsObject.applyLocalTorque(this.btV1);
  }

  // Forward is in the positive Z direction.
  private static kRadius = 0.05;
  private static kLength = 0.20;
  private static kDenseRadius = 0.03;

  private setGeometry() {
    {  // Body
      let ballGeometry: THREE.BufferGeometry =
        new THREE.IcosahedronBufferGeometry(Pika.kRadius, 3);
      ballGeometry.scale(1, 1, Pika.kLength / (2 * Pika.kRadius));
      ballGeometry.translate(0, 0, 0);
      ballGeometry = BufferGeometryUtils.mergeVertices(ballGeometry, 0.001);
      ballGeometry.computeVertexNormals();
      const ballMesh = new THREE.Mesh(ballGeometry,
        new THREE.MeshStandardMaterial({ color: 0xffdd33, roughness: 0.5 }));
      ballMesh.castShadow = true;
      ballMesh.receiveShadow = true;
      this.add(ballMesh);
    }
    {  // Head
      let ballGeometry: THREE.BufferGeometry =
        new THREE.IcosahedronBufferGeometry(Pika.kRadius, 3);
      ballGeometry.translate(0, Pika.kRadius / 2, Pika.kLength / 2);
      ballGeometry = BufferGeometryUtils.mergeVertices(ballGeometry, 0.001);
      ballGeometry.computeVertexNormals();
      const ballMesh = new THREE.Mesh(ballGeometry,
        new THREE.MeshStandardMaterial({ color: 0xffdd33, roughness: 0.5 }));
      ballMesh.castShadow = true;
      ballMesh.receiveShadow = true;
      this.add(ballMesh);
    }
  }

  private addToPhysics() {
    const outerShell = new this.ammo.btSphereShape(Pika.kRadius);

    this.btV1.setValue(1, 1, Pika.kLength / (2 * Pika.kRadius));
    outerShell.setLocalScaling(this.btV1);
    // const innerShell = new this.ammo.btSphereShape(Pika.kDenseRadius);
    // const innerShell = new this.ammo.btBoxShape(new this.ammo.btVector3(
    //   Pika.kDenseRadius, Pika.kDenseRadius, 2 * Pika.kDenseRadius));

    // const innerBody =
    //   this.makeRigidBody(innerShell, Pika.kDenseRadius, 0.100/*g*/,
    //     -(Pika.kRadius - Pika.kDenseRadius), Pika.kDenseRadius);
    const outerBody =
      this.makeRigidBody(outerShell, Pika.kRadius, 0.050/*g*/, 0, 0);

    // const constraint = new this.ammo.btFixedConstraint(innerBody, outerBody,
    //   innerBody.getWorldTransform(), outerBody.getWorldTransform());

    // this.physicsWorld.addConstraint(constraint, true);
    // this.physicsWorld.addRigidBody(innerBody);

    this.physicsWorld.addRigidBody(outerBody);

    this.userData['physicsObject'] = outerBody;
  }

  private makeRigidBody(shape: Ammo.btSphereShape, radius: number,
    mass: number, offsetY: number, offsetZ: number): Ammo.btRigidBody {
    this.btTx.setIdentity();
    this.btV1.setValue(
      this.position.x, this.position.y + offsetY, this.position.z + offsetZ);
    this.btTx.setOrigin(this.btV1);
    this.btQ.setValue(this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w);
    this.btTx.setRotation(this.btQ);
    const motionState = new this.ammo.btDefaultMotionState(this.btTx);
    this.btV1.setValue(0, 0, 0);
    shape.calculateLocalInertia(mass, this.btV1);
    const body = new this.ammo.btRigidBody(
      new this.ammo.btRigidBodyConstructionInfo(
        mass, motionState, shape, this.btV1));
    body.setRestitution(0.8);
    return body;
  }

}