import * as THREE from "three";
import { Pika } from "./pika";

class Boid {
  readonly tip = new THREE.Vector3();
  readonly tail = new THREE.Vector3();
  readonly heading = new THREE.Vector3();
  constructor(public pika: Pika) {
    this.setTipAndTail();
  }
  public setTipAndTail() {
    this.tip.set(0, 0, Flock.kRadius);
    this.tip.applyMatrix4(this.pika.getMatrix());
    this.tail.set(0, 0, -Flock.kRadius);
    this.tail.applyMatrix4(this.pika.getMatrix());
    this.heading.copy(this.tip);
    this.heading.sub(this.tail);
    this.heading.normalize();
  }
}

export class Flock {
  static kRadius = 0.4;
  static kSearchRadius = 2.0;

  static kCohesion = 0.05;
  static kAlignment = 0.2;

  private boids: Boid[] = [];

  constructor() { }

  public add(o: Pika) {
    this.boids.push(new Boid(o));
  }

  public update() {
    const d = new THREE.Vector3();
    const f = new THREE.Vector3();
    const o = new THREE.Vector3();
    for (const b of this.boids) {
      b.setTipAndTail();
    }
    for (const current of this.boids) {
      const totalRotation = new THREE.Vector3(0, 0, 0);
      for (const other of this.boids) {
        if (other === current) {
          continue;
        }
        d.copy(other.tail);
        d.sub(current.tip);
        const distance = d.length();
        if (distance > Flock.kSearchRadius) {
          continue;
        }
        // Steer toward tail
        d.normalize();  // d is now pointing at the tail
        f.set(0, 0, 1);
        f.applyMatrix4(current.pika.getMatrix());
        o.set(0, 0, 0);
        o.applyMatrix4(current.pika.getMatrix());
        f.sub(o);  // f is now the "forward" vector
        f.cross(d); // f is now the vector to rotate around
        // Scale cohesion inversely with distance.

        f.setLength((distance - Flock.kRadius) * (distance - Flock.kSearchRadius));
        f.multiplyScalar(Flock.kCohesion);
        totalRotation.add(f);

        // Alignment
        if (distance * 2 > Flock.kRadius) {
          d.copy(current.heading);
          d.cross(other.heading);
          d.multiplyScalar(1 / (distance + 0.05));
          d.multiplyScalar(Flock.kAlignment);
          totalRotation.add(f);
        }
      }
      // current.pika.setTorque(totalRotation);
    }
  }
}