import * as THREE from "three";
import Ammo from "ammojs-typed";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Pika } from "./pika";
import { InstancedObject } from "./instancedObject";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Flock } from "./flock";

export class Game {
  public static kMaxPikas = 100;
  private dolly: THREE.Group;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private physicsWorld: Ammo.btDiscreteDynamicsWorld;
  private pikas: Pika[] = [];
  private flock = new Flock();
  private pikaMeshes: InstancedObject;
  private keysDown = new Set<string>();

  private constructor(private ammo: typeof Ammo) {
    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.setUp();
  }

  static async make(): Promise<Game> {
    return new Promise<Game>((resolve) => {
      Ammo().then((lib) => {
        resolve(new Game(lib));
      });
    })
  }

  private async setUp() {
    await this.setUpMeshes();
    this.setUpCamera();
    this.setUpLight();
    this.setUpPhysics();
    this.setUpTank();
    this.setUpRenderer();
    this.setUpAnimation();
    this.setUpKeyboard();
  }

  private async setUpMeshes(): Promise<void> {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load('models/pika.gltf', (gltf) => {
        this.pikaMeshes = new InstancedObject(gltf.scene, Game.kMaxPikas);
        this.scene.add(this.pikaMeshes);
        resolve();
      }
      );
    });
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
    this.dolly = new THREE.Group();
    this.dolly.position.set(0, 0, 3);
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, /*near=*/0.1,
      /*far=*/100);
    this.camera.position.set(0, 1.7, 0);
    this.dolly.add(this.camera);
    this.scene.add(this.dolly);
    this.camera.lookAt(0, 0, 0);
  }

  private setUpLight() {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 5;
    light.shadow.camera.far = 1000;
    light.position.set(50, 100, 0);
    light.target.position.set(0, 0, 0);
    this.scene.add(light);

    // const ambient = new THREE.AmbientLight(0xddddff, 0.2);
    // this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x99ddff, 0xffbb99, 0.5);
    this.scene.add(hemi);

    this.scene.background = new THREE.Color(0x99ddff);
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
      -9.5, 0.75, 0.01 * (Math.random() - 0.5)),
      this.ammo, this.physicsWorld, this.pikaMeshes);
    this.pikas.push(pika);
    this.flock.add(pika);
  }

  private v1 = new THREE.Vector3();
  private animationLoop() {
    const deltaS = this.clock.getDelta();
    if (this.clock.elapsedTime > this.pikas.length &&
      this.pikas.length < Game.kMaxPikas) {
      this.addPika();
    }

    this.physicsWorld.stepSimulation(deltaS, /*substeps=*/10);
    for (const p of this.pikas) {
      p.updatePositionFromPhysics(this.clock.elapsedTime);
    }
    this.flock.update();
    this.v1.set(0, 0, 0);
    if (this.keysDown.has('ArrowRight')) {
      this.v1.x += deltaS * 1.5;
    }
    if (this.keysDown.has('ArrowLeft')) {
      this.v1.x -= deltaS * 1.5;
    }
    this.dolly.position.add(this.v1);

    this.renderer.render(this.scene, this.camera);
  }

  private setUpAnimation() {
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(
      (function (self: Game) {
        return function () { self.animationLoop(); }
      })(this));
  }

  private setUpKeyboard() {
    const body = document.querySelector('body');
    body.addEventListener('keydown', (ev) => { this.keysDown.add(ev.code); });
    body.addEventListener('keyup', (ev) => { this.keysDown.delete(ev.code); });
  }

  private addPlane(normal: Ammo.btVector3, offset: number) {
    const shape = new this.ammo.btStaticPlaneShape(normal, offset)
    shape.setMargin(0.01);
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

    let floorGeometry = new THREE.BoxGeometry(20, 0.01, 1);
    let floorMesh = new THREE.Mesh(floorGeometry,
      new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.5 }));
    floorMesh.receiveShadow = true;
    floorMesh.position.set(0, -0.03, 0);
    this.scene.add(floorMesh);

  }
}