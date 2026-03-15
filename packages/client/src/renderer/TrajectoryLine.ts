import * as THREE from 'three';
import type { Vec3 } from '@bojo-dojo/common';

const MAX_POINTS = 200;

/**
 * Dashed line showing the predicted trajectory preview (30% of arc).
 * Updated every frame while the bow is being drawn.
 */
export class TrajectoryLine {
  readonly line: THREE.Line;
  private positions: Float32Array;
  private geometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_POINTS * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setDrawRange(0, 0);

    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      opacity: 0.5,
      transparent: true,
      dashSize: 0.8,
      gapSize: 0.4,
    });

    this.line = new THREE.Line(this.geometry, material);
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
  }

  /** Update the trajectory preview with new points. */
  update(points: Vec3[]) {
    const count = Math.min(points.length, MAX_POINTS);
    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = points[i].x;
      this.positions[i * 3 + 1] = points[i].y;
      this.positions[i * 3 + 2] = points[i].z;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
    this.line.computeLineDistances(); // needed for dashes
    this.line.visible = count > 1;
  }

  /** Hide the trajectory line. */
  hide() {
    this.line.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.line.parent?.remove(this.line);
    this.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}
