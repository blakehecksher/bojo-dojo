import * as THREE from 'three';
import type { TrajectoryPoint } from '@bojo-dojo/common';

const SHAFT_LENGTH = 0.6;
const SHAFT_RADIUS = 0.015;
const HEAD_RADIUS = 0.035;
const HEAD_LENGTH = 0.08;

// Shared geometries (created once)
let shaftGeo: THREE.CylinderGeometry | null = null;
let headGeo: THREE.ConeGeometry | null = null;

function getSharedGeometry() {
  if (!shaftGeo) {
    shaftGeo = new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_LENGTH, 4);
    shaftGeo.rotateX(Math.PI / 2); // align along Z axis
  }
  if (!headGeo) {
    headGeo = new THREE.ConeGeometry(HEAD_RADIUS, HEAD_LENGTH, 4);
    headGeo.rotateX(-Math.PI / 2); // point along +Z
    headGeo.translate(0, 0, SHAFT_LENGTH / 2 + HEAD_LENGTH / 2);
  }
  return { shaftGeo, headGeo };
}

const shaftMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
const headMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

/**
 * A single arrow in the world. Can animate along a trajectory then stick on landing.
 */
export class ArrowModel {
  readonly mesh: THREE.Group;
  private trajectory: TrajectoryPoint[] | null = null;
  private currentIndex = 0;
  private elapsed = 0;
  private flying = false;
  private onLand?: (position: THREE.Vector3) => void;

  /** If true, this is the local player's arrow (subtly tinted). */
  isOwn: boolean;

  constructor(scene: THREE.Scene, isOwn = false) {
    this.isOwn = isOwn;
    const { shaftGeo: sg, headGeo: hg } = getSharedGeometry();

    const shaft = new THREE.Mesh(sg, isOwn
      ? new THREE.MeshLambertMaterial({ color: 0x9B8365 })
      : shaftMat
    );
    const head = new THREE.Mesh(hg, headMat);

    this.mesh = new THREE.Group();
    this.mesh.add(shaft);
    this.mesh.add(head);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /**
   * Launch the arrow along a precomputed trajectory.
   */
  launch(trajectory: TrajectoryPoint[], onLand?: (pos: THREE.Vector3) => void) {
    this.trajectory = trajectory;
    this.currentIndex = 0;
    this.elapsed = 0;
    this.flying = true;
    this.onLand = onLand;
    this.mesh.visible = true;
    this.setFromPoint(trajectory[0]);
  }

  /**
   * Place the arrow at a specific position, stuck in the ground.
   * Used for remote arrows arriving via ARROW_LANDED.
   */
  placeAt(x: number, y: number, z: number) {
    this.mesh.position.set(x, y, z);
    // Angle downward as if stuck
    this.mesh.rotation.set(-0.5, Math.random() * Math.PI * 2, 0);
    this.mesh.visible = true;
    this.flying = false;
  }

  /**
   * Update arrow flight animation. Call each frame.
   * Returns true if still flying, false if landed.
   */
  update(dt: number): boolean {
    if (!this.flying || !this.trajectory) return false;

    this.elapsed += dt;

    // Advance through trajectory points
    while (
      this.currentIndex < this.trajectory.length - 1 &&
      this.trajectory[this.currentIndex + 1].time <= this.elapsed
    ) {
      this.currentIndex++;
    }

    const traj = this.trajectory;
    const i = this.currentIndex;

    if (i >= traj.length - 1) {
      // Landed
      this.flying = false;
      this.setFromPoint(traj[traj.length - 1]);
      this.onLand?.(this.mesh.position.clone());
      return false;
    }

    // Interpolate between current and next point
    const p0 = traj[i];
    const p1 = traj[i + 1];
    const segDt = p1.time - p0.time;
    const t = segDt > 0 ? (this.elapsed - p0.time) / segDt : 0;

    this.mesh.position.set(
      p0.position.x + (p1.position.x - p0.position.x) * t,
      p0.position.y + (p1.position.y - p0.position.y) * t,
      p0.position.z + (p1.position.z - p0.position.z) * t,
    );

    // Orient arrow along velocity direction
    const vel = p0.velocity;
    const dir = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
    this.mesh.lookAt(
      this.mesh.position.x + dir.x,
      this.mesh.position.y + dir.y,
      this.mesh.position.z + dir.z,
    );

    return true;
  }

  private setFromPoint(point: TrajectoryPoint) {
    this.mesh.position.set(point.position.x, point.position.y, point.position.z);
    const vel = point.velocity;
    const dir = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
    this.mesh.lookAt(
      this.mesh.position.x + dir.x,
      this.mesh.position.y + dir.y,
      this.mesh.position.z + dir.z,
    );
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
  }
}
