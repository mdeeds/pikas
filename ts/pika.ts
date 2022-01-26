import * as THREE from "three";
import Ammo from "ammojs-typed";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export class Pika extends THREE.Group {
  private btV1: Ammo.btVector3;
  private btV2: Ammo.btVector3;
  private btV3: Ammo.btVector3;
  private btTx: Ammo.btTransform;
  private btQ: Ammo.btQuaternion;
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();

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
      const force = 0.5 * (Math.cos(elapsedS * 4 * Math.PI) + 1);
      this.v1.set(0, force * 0.1, force);
      this.v1.applyMatrix4(this.matrixWorld);
      this.getWorldPosition(this.v2);
      this.v1.sub(this.v2);
      this.btV1.setValue(this.v1.x, this.v1.y, this.v1.z);
      physicsObject.setLinearVelocity(this.btV1);
    }
  }

  // Forward is in the positive Z direction.
  private static kRadius = 0.05;
  private static kLength = 0.20;
  private static kDenseRadius = 0.005;

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
    // Capsule
    const capsule = new this.ammo.btCapsuleShapeZ(Pika.kRadius, Pika.kLength);
    const outerShell = new this.ammo.btCompoundShape();
    this.btTx.setIdentity();
    this.btV1.setValue(0, Pika.kRadius, 0);
    this.btTx.setOrigin(this.btV1);
    outerShell.addChildShape(this.btTx, capsule);

    outerShell.setMargin(0.01);
    const outerBody =
      this.makeRigidBody(outerShell, 0.002/*kg*/, 0, 0);
    outerBody.setFriction(0.9);
    outerBody.setRestitution(0.1);
    this.physicsWorld.addRigidBody(outerBody);

    this.userData['physicsObject'] = outerBody;
  }

  private makeRigidBody(shape: Ammo.btSphereShape | Ammo.btBvhTriangleMeshShape,
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