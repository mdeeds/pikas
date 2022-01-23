import * as THREE from "three";
import Ammo from "ammojs-typed";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export class Pika extends THREE.Group {
  constructor(position: THREE.Vector3, private ammo: typeof Ammo,
    private physicsWorld: Ammo.btDiscreteDynamicsWorld) {
    super();
    this.position.copy(position);
    this.setGeometry();
    this.addToPhysics();
  }

  public updatePositionFromPhysics() {
    const physicsObject = this.userData['physicsObject'] as Ammo.btRigidBody;
    const worldTransform = physicsObject.getWorldTransform();
    const position = worldTransform.getOrigin();
    this.position.set(position.x(), position.y(), position.z());
    const rotation = worldTransform.getRotation();
    this.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
  }

  // Forward is in the positive Z direction.
  private static kRadius = 0.05;
  private static kLength = 0.20;
  private static kDenseRadius = 0.03;

  private setGeometry() {
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

  private addToPhysics() {
    const outerShell = new this.ammo.btSphereShape(Pika.kRadius);

    outerShell.setLocalScaling(
      new this.ammo.btVector3(1, 1, Pika.kLength / (2 * Pika.kRadius)));
    // const innerShell = new this.ammo.btSphereShape(Pika.kDenseRadius);
    const innerShell = new this.ammo.btBoxShape(new this.ammo.btVector3(
      Pika.kDenseRadius, Pika.kDenseRadius, 2 * Pika.kDenseRadius));

    const innerBody =
      this.makeRigidBody(innerShell, Pika.kDenseRadius, 0.100/*g*/);
    const outerBody =
      this.makeRigidBody(outerShell, Pika.kRadius, 0.050/*g*/);

    const constraint = new this.ammo.btFixedConstraint(innerBody, outerBody,
      innerBody.getWorldTransform(), outerBody.getWorldTransform());

    this.physicsWorld.addConstraint(constraint, true);
    this.physicsWorld.addRigidBody(innerBody);
    this.physicsWorld.addRigidBody(outerBody);

    this.userData['physicsObject'] = outerBody;
  }

  private makeRigidBody(shape: Ammo.btSphereShape, radius: number, mass: number): Ammo.btRigidBody {
    const ammoTransform = new this.ammo.btTransform();
    ammoTransform.setIdentity();
    ammoTransform.setOrigin(new this.ammo.btVector3(
      this.position.x, this.position.y, this.position.z));
    const localInertia = new this.ammo.btVector3(0, 0, 0);
    const motionState = new this.ammo.btDefaultMotionState(ammoTransform);
    shape.calculateLocalInertia(mass, localInertia);
    const body = new this.ammo.btRigidBody(
      new this.ammo.btRigidBodyConstructionInfo(
        mass, motionState, shape, localInertia));
    body.setRestitution(0.8);
    return body;
  }

}