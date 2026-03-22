import * as THREE from 'three';
import type { TrajectoryPoint } from '@bojo-dojo/common';
import { ARROW_VISUAL } from './arrowVisualConfig';

// Shared geometries (created once, reused across all arrows)
let shaftGeo: THREE.CylinderGeometry | null = null;
let headGeo: THREE.ConeGeometry | null = null;

function getSharedGeometry() {
  if (!shaftGeo) {
    shaftGeo = new THREE.CylinderGeometry(
      ARROW_VISUAL.SHAFT_RADIUS,
      ARROW_VISUAL.SHAFT_RADIUS,
      ARROW_VISUAL.SHAFT_LENGTH,
      ARROW_VISUAL.SHAFT_SEGMENTS,
    );
    shaftGeo.rotateX(Math.PI / 2); // align along Z axis
  }
  if (!headGeo) {
    headGeo = new THREE.ConeGeometry(
      ARROW_VISUAL.HEAD_RADIUS,
      ARROW_VISUAL.HEAD_LENGTH,
      ARROW_VISUAL.HEAD_SEGMENTS,
    );
    headGeo.rotateX(Math.PI / 2); // tip points along +Z
    headGeo.translate(0, 0, ARROW_VISUAL.SHAFT_LENGTH / 2 + ARROW_VISUAL.HEAD_LENGTH / 2);
  }
  return { shaftGeo, headGeo };
}

const shaftMat = new THREE.MeshLambertMaterial({ color: ARROW_VISUAL.SHAFT_COLOR_REMOTE });
const headMat = new THREE.MeshLambertMaterial({ color: ARROW_VISUAL.HEAD_COLOR });

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

  // Glow sprite for long-range visibility
  private glow: THREE.Sprite | null = null;

  /** If true, this is the local player's arrow (subtly tinted). */
  isOwn: boolean;

  constructor(scene: THREE.Scene, isOwn = false) {
    this.isOwn = isOwn;
    this.scene = scene;
    const { shaftGeo: sg, headGeo: hg } = getSharedGeometry();

    const shaft = new THREE.Mesh(sg, isOwn
      ? new THREE.MeshLambertMaterial({ color: ARROW_VISUAL.SHAFT_COLOR_LOCAL })
      : shaftMat
    );
    const head = new THREE.Mesh(hg, headMat);

    this.mesh = new THREE.Group();
    this.mesh.add(shaft);
    this.mesh.add(head);
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Glow sprite for in-flight visibility
    if (ARROW_VISUAL.GLOW_ENABLED) {
      const spriteMat = new THREE.SpriteMaterial({
        color: ARROW_VISUAL.GLOW_COLOR,
        transparent: true,
        opacity: ARROW_VISUAL.GLOW_OPACITY,
        depthWrite: false,
      });
      this.glow = new THREE.Sprite(spriteMat);
      this.glow.scale.set(ARROW_VISUAL.GLOW_SIZE, ARROW_VISUAL.GLOW_SIZE, 1);
      this.glow.visible = false;
      scene.add(this.glow);
    }

    // Trail geometry — pre-allocate positions and colors
    this.trailPositions = new Float32Array(ARROW_VISUAL.TRAIL_LENGTH * 3);
    this.trailColors = new Float32Array(ARROW_VISUAL.TRAIL_LENGTH * 4);
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
    this.mesh.scale.setScalar(ARROW_VISUAL.FLIGHT_SCALE);
    this.setFromPoint(trajectory[0]);

    if (this.glow) this.glow.visible = true;

    // Initialize trail
    this.trailHead = 0;
    this.trailFading = false;
    this.trailOpacity = 1;
    const p = trajectory[0].position;
    for (let i = 0; i < ARROW_VISUAL.TRAIL_LENGTH; i++) {
      this.trailPositions[i * 3] = p.x;
      this.trailPositions[i * 3 + 1] = p.y;
      this.trailPositions[i * 3 + 2] = p.z;
      const a = 1 - i / ARROW_VISUAL.TRAIL_LENGTH;
      this.trailColors[i * 4] = ARROW_VISUAL.TRAIL_COLOR_R;
      this.trailColors[i * 4 + 1] = ARROW_VISUAL.TRAIL_COLOR_G;
      this.trailColors[i * 4 + 2] = ARROW_VISUAL.TRAIL_COLOR_B;
      this.trailColors[i * 4 + 3] = a * ARROW_VISUAL.TRAIL_MAX_OPACITY;
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
    this.mesh.scale.setScalar(1); // landed arrows use normal scale
    // Angle downward as if stuck
    this.mesh.rotation.set(-0.5, Math.random() * Math.PI * 2, 0);
    this.mesh.visible = true;
    this.flying = false;
    if (this.glow) this.glow.visible = false;
  }

  /**
   * Update arrow flight animation. Call each frame.
   * Returns true if still flying, false if landed.
   */
  update(dt: number): boolean {
    // Fade trail after landing
    if (this.trailFading && this.trail) {
      this.trailOpacity -= dt * ARROW_VISUAL.TRAIL_FADE_SPEED;
      if (this.trailOpacity <= 0) {
        this.scene.remove(this.trail);
        this.trail.geometry.dispose();
        this.trail = null;
        this.trailFading = false;
      } else {
        for (let i = 0; i < ARROW_VISUAL.TRAIL_LENGTH; i++) {
          const baseA = 1 - i / ARROW_VISUAL.TRAIL_LENGTH;
          this.trailColors[i * 4 + 3] = baseA * ARROW_VISUAL.TRAIL_MAX_OPACITY * this.trailOpacity;
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
      this.mesh.scale.setScalar(1); // revert to normal scale on landing
      this.setFromPoint(traj[traj.length - 1]);
      this.onLand?.(this.mesh.position.clone());
      // Start trail fade
      this.trailFading = true;
      if (this.glow) this.glow.visible = false;
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

    // Sync glow sprite to arrow position
    if (this.glow) {
      this.glow.position.set(px, py, pz);
    }

    // Update trail — shift positions down, put new point at head
    this.updateTrail(px, py, pz);

    return true;
  }

  private updateTrail(x: number, y: number, z: number) {
    if (!this.trail) return;

    // Shift all positions back by one slot
    for (let i = ARROW_VISUAL.TRAIL_LENGTH - 1; i > 0; i--) {
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
    if (this.glow) {
      this.glow.parent?.remove(this.glow);
      (this.glow.material as THREE.SpriteMaterial).dispose();
    }
  }
}
