import * as THREE from "three";
import Ammo from "ammojs-typed";

import { Assets } from "./assets";

export type Side = 'left' | 'right';

export class Hand {
  readonly gamepad: Gamepad;
  private grip: THREE.Group;

  constructor(readonly side: Side, renderer: THREE.WebGLRenderer,
    private scene: THREE.Object3D, private ammo: typeof Ammo,
    private physicsWorld: Ammo.btDiscreteDynamicsWorld,
    kinematicObjects: THREE.Object3D[]) {
    const index = (side == 'left') ? 0 : 1;
    this.grip = renderer.xr.getControllerGrip(index);
    const pads = window.navigator.getGamepads();
    if (pads.length > index) {
      this.gamepad = pads[index];
    }
    this.setUpMeshes();
    this.setUpPhysics(kinematicObjects);
  }

  private setUpMeshes() {
    const handGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.20);
    const handMesh = new THREE.Mesh(handGeometry,
      new THREE.MeshStandardMaterial(
        { color: 'orange', roughness: 0.9 }));

    this.grip.add(handMesh);
    this.scene.add(this.grip);
  }

  private setUpPhysics(kinematicObjects: THREE.Object3D[]) {
    const halfWidths = new this.ammo.btVector3(0.075, 0.01, 0.10);
    const shape = new this.ammo.btBoxShape(halfWidths);
    const body = Assets.makeRigidBody(this.grip, this.ammo, shape, 0);

    // https://pybullet.org/Bullet/BulletFull/btCollisionObject_8h_source.html
    // CF_KINEMATIC_OBJECT= 2,
    body.setCollisionFlags(body.getCollisionFlags() | 2);
    this.physicsWorld.addRigidBody(body);
    kinematicObjects.push(this.grip);
    this.grip.userData['physicsObject'] = body;
  }
}