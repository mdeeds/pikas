import * as THREE from "three";
import Ammo from "ammojs-typed";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Pika } from "./pika";

export class Game {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private physicsWorld: Ammo.btDiscreteDynamicsWorld;
  private pikas: Pika[] = [];

  private constructor(private ammo: typeof Ammo) {
    this.renderer = new THREE.WebGLRenderer();

    this.scene = new THREE.Scene();

    this.setUpCamera();
    this.setUpLight();
    this.setUpPhysics();
    this.setUpTank();

    this.setUpRenderer();
    this.setUpAnimation();
  }

  static async make(): Promise<Game> {
    return new Promise<Game>((resolve) => {
      Ammo().then((lib) => {
        resolve(new Game(lib));
      });
    })
  }

  private setUpPhysics() {
    // Physics configuration
    const collisionConfiguration =
      new this.ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.ammo.btCollisionDispatcher(
      collisionConfiguration);
    const broadphase = new this.ammo.btDbvtBroadphase();
    const solver = new this.ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new this.ammo.btDiscreteDynamicsWorld(
      dispatcher, broadphase,
      solver, collisionConfiguration);
    this.physicsWorld.setGravity(new this.ammo.btVector3(0, -9.8, 0));
  }

  private setUpCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, /*near=*/0.1,
      /*far=*/100);
    this.camera.position.set(0, 1.7, 3);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  private setUpLight() {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 50;
    light.shadow.camera.far = 120;
    light.position.set(50, 100, 0);
    light.target.position.set(0, 0, 0);
    this.scene.add(light);

    const ambient = new THREE.AmbientLight(0xddddff, 0.2);
    this.scene.add(ambient);
  }

  private setUpRenderer() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    this.renderer.xr.enabled = true;
  }

  private addPika() {
    const pika = new Pika(new THREE.Vector3(
      0.01 * (Math.random() - 0.5), 0.5, 0.01 * (Math.random() - 0.5)),
      this.ammo, this.physicsWorld);
    this.scene.add(pika);
    this.pikas.push(pika);
  }

  private setUpAnimation() {
    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      if (clock.elapsedTime > this.pikas.length && this.pikas.length < 100) {
        this.addPika();
      }

      this.physicsWorld.stepSimulation(deltaS, /*substeps=*/4);
      for (const p of this.pikas) {
        p.updatePositionFromPhysics();
      }
      this.renderer.render(this.scene, this.camera);
    })
  }

  private addPlane(normal: Ammo.btVector3, offset: number) {
    const shape = new this.ammo.btStaticPlaneShape(normal, offset)
    const ammoTransform = new this.ammo.btTransform();
    ammoTransform.setIdentity();
    const mass = 0;  // Zero mass tells Ammo that this object does not move.
    const localInertia = new this.ammo.btVector3(0, 0, 0);
    const motionState = new this.ammo.btDefaultMotionState(ammoTransform);
    shape.calculateLocalInertia(mass, localInertia);
    const body = new this.ammo.btRigidBody(
      new this.ammo.btRigidBodyConstructionInfo(
        mass, motionState, shape, localInertia));
    body.setRestitution(0.8);
    // body.setLinearVelocity(new this.ammo.btVector3(0, 0, 0));
    this.physicsWorld.addRigidBody(body);
  }

  private setUpTank() {
    this.addPlane(new this.ammo.btVector3(0, 1, 0), 0);
    this.addPlane(new this.ammo.btVector3(-1, 0, 0), -10);
    this.addPlane(new this.ammo.btVector3(1, 0, 0), -10);
    this.addPlane(new this.ammo.btVector3(0, 0, -1), -0.5);
    this.addPlane(new this.ammo.btVector3(0, 0, 1), -0.5);


    let floorGeometry = new THREE.BoxGeometry(5, 0.01, 1);
    let floorMesh = new THREE.Mesh(floorGeometry,
      new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.5 }));
    floorMesh.receiveShadow = true;
    floorMesh.position.set(0, -0.01, 0);
    this.scene.add(floorMesh);

  }
}