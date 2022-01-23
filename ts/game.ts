import * as THREE from "three";
import Ammo from "ammojs-typed";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BufferGeometry } from "three";

export class Game {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  private constructor(private ammo: typeof Ammo) {
    this.renderer = new THREE.WebGLRenderer();

    this.setUpCamera();

    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    let ballGeometry: BufferGeometry =
      new THREE.IcosahedronBufferGeometry(0.5, 3);
    ballGeometry = BufferGeometryUtils.mergeVertices(ballGeometry, 0.001);
    ballGeometry.computeVertexNormals();
    const ballMesh = new THREE.Mesh(ballGeometry,
      new THREE.MeshStandardMaterial({ color: 0xffdd33, roughness: 0.5 }));
    ballMesh.position.set(0, 0.5, 0);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    this.scene.add(ballMesh);

    let floorGeometry = new THREE.BoxGeometry(5, 0.01, 1);
    let floorMesh = new THREE.Mesh(floorGeometry,
      new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.5 }));
    floorMesh.receiveShadow = true;
    floorMesh.position.set(0, -0.1, 0);
    this.scene.add(floorMesh);

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

  private setUpCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, /*near=*/0.1,
      /*far=*/100);
    this.camera.position.set(0, 1.7, 3);
    this.camera.lookAt(0, 0, 0);
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

  private setUpAnimation() {
    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const deltaS = clock.getDelta();
      this.renderer.render(this.scene, this.camera);
    })
  }
}