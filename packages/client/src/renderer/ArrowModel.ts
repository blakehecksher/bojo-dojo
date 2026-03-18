import * as THREE from 'three';
import type { TrajectoryPoint } from '@bojo-dojo/common';

const SHAFT_LENGTH = 0.9;
const SHAFT_RADIUS = 0.035;
const HEAD_RADIUS = 0.07;
const HEAD_LENGTH = 0.14;

// Trail settings
const TRAIL_LENGTH = 24; // number of trail segments
const TRAIL_FADE_SPEED = 2; // opacity decay per second after landing

// Shared geometries (created once)
let shaftGeo: THREE.CylinderGeometry | null = null;
let headGeo: THREE.ConeGeometry | null = null;

function getSharedGeometry() {
  if (!shaftGeo) {
    shaftGeo = new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_LENGTH, 6);
    shaftGeo.rotateX(Math.PI / 2); // align along Z axis
  }
  if (!headGeo) {
    headGeo = new THREE.ConeGeometry(HEAD_RADIUS, HEAD_LENGTH, 6);
    headGeo.rotateX(Math.PI / 2); // tip points along +Z (direction of travel)
    headGeo.translate(0, 0, SHAFT_LENGTH / 2 + HEAD_LENGTH / 2);
  }
  return { shaftGeo, headGeo };
}

const shaftMat = new THREE.MeshLambertMaterial({ color: 0xc8a86e });
const headMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

/**
 * A single arrow in the world. Can animate along a trajectory then stick on landing.
 * Includes a fading trail during flight.
 */
export class ArrowModel {
  readonly mesh: THREE.Group;
  private trajectory: TrajectoryPoint[] | null = null;
  private currentIndex = 0;
  private elapsed = 0;
  private flying = false;
  private onLand?: (position: THREE.Vector3) => void;

  // Trail
  private trail: THREE.Line | null = null;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailHead = 0;
  private trailFading = false;
  private trailOpacity = 1;
  private scene: THREE.Scene;

  /** If true, this is the local player's arrow (subtly tinted). */
  isOwn: boolean;

  constructor(scene: THREE.Scene, isOwn = false) {
    this.isOwn = isOwn;
    this.scene = scene;
    const { shaftGeo: sg, headGeo: hg } = getSharedGeometry();

    const shaft = new THREE.Mesh(sg, isOwn
      ? new THREE.MeshLambertMaterial({ color: 0xddb870 })
      : shaftMat
    );
    const head = new THREE.Mesh(hg, headMat);

    this.mesh = new THREE.Group();
    this.mesh.add(shaft);
    this.mesh.add(head);
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Trail geometry — pre-allocate positions and colors
    this.trailPositions = new Float32Array(TRAIL_LENGTH * 3);
    this.trailColors = new Float32Array(TRAIL_LENGTH * 4);
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

    // Initialize trail
    this.trailHead = 0;
    this.trailFading = false;
    this.trailOpacity = 1;
    const p = trajectory[0].position;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailPositions[i * 3] = p.x;
      this.trailPositions[i * 3 + 1] = p.y;
      this.trailPositions[i * 3 + 2] = p.z;
      // Color: bright white-yellow, fading alpha along trail
      const a = 1 - i / TRAIL_LENGTH;
      this.trailColors[i * 4] = 1;
      this.trailColors[i * 4 + 1] = 0.95;
      this.trailColors[i * 4 + 2] = 0.6;
      this.trailColors[i * 4 + 3] = a * 0.8;
    }

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 4));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    this.trail = new THREE.Line(trailGeo, trailMat);
    this.scene.add(this.trail);
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
    // Fade trail after landing
    if (this.trailFading && this.trail) {
      this.trailOpacity -= dt * TRAIL_FADE_SPEED;
      if (this.trailOpacity <= 0) {
        this.scene.remove(this.trail);
        this.trail.geometry.dispose();
        this.trail = null;
        this.trailFading = false;
      } else {
        for (let i = 0; i < TRAIL_LENGTH; i++) {
          const baseA = 1 - i / TRAIL_LENGTH;
          this.trailColors[i * 4 + 3] = baseA * 0.8 * this.trailOpacity;
        }
        this.trail.geometry.attributes.color.needsUpdate = true;
      }
    }

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
      // Start trail fade
      this.trailFading = true;
      return false;
    }

    // Interpolate between current and next point
    const p0 = traj[i];
    const p1 = traj[i + 1];
    const segDt = p1.time - p0.time;
    const t = segDt > 0 ? (this.elapsed - p0.time) / segDt : 0;

    const px = p0.position.x + (p1.position.x - p0.position.x) * t;
    const py = p0.position.y + (p1.position.y - p0.position.y) * t;
    const pz = p0.position.z + (p1.position.z - p0.position.z) * t;

    this.mesh.position.set(px, py, pz);

    // Orient arrow along velocity direction
    const vel = p0.velocity;
    const dir = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
    this.mesh.lookAt(px + dir.x, py + dir.y, pz + dir.z);

    // Update trail — shift positions down, put new point at head
    this.updateTrail(px, py, pz);

    return true;
  }

  private updateTrail(x: number, y: number, z: number) {
    if (!this.trail) return;

    // Shift all positions back by one slot
    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3];
      this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1];
      this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2];
    }
    // New head position
    this.trailPositions[0] = x;
    this.trailPositions[1] = y;
    this.trailPositions[2] = z;

    this.trail.geometry.attributes.position.needsUpdate = true;
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
    if (this.trail) {
      this.trail.parent?.remove(this.trail);
      this.trail.geometry.dispose();
    }
  }
}
