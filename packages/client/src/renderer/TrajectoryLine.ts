import * as THREE from 'three';
import type { Vec3 } from '@bojo-dojo/common';

const MAX_POINTS = 200;

/**
 * Bright, visible trajectory preview (30% of arc).
 * Solid line with dot markers at intervals for depth perception.
 */
export class TrajectoryLine {
  readonly line: THREE.Line;
  private positions: Float32Array;
  private geometry: THREE.BufferGeometry;
  private dots: THREE.Points;
  private dotPositions: Float32Array;
  private dotGeometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_POINTS * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setDrawRange(0, 0);

    // Solid bright line — high contrast for readability
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.8,
      transparent: true,
    });

    this.line = new THREE.Line(this.geometry, material);
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);

    // Dot markers along the path for depth perception
    this.dotPositions = new Float32Array(MAX_POINTS * 3);
    this.dotGeometry = new THREE.BufferGeometry();
    this.dotGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.dotPositions, 3)
    );
    this.dotGeometry.setDrawRange(0, 0);

    const dotMaterial = new THREE.PointsMaterial({
      color: 0xffc832,
      size: 0.4,
      opacity: 0.9,
      transparent: true,
      sizeAttenuation: true,
    });

    this.dots = new THREE.Points(this.dotGeometry, dotMaterial);
    this.dots.frustumCulled = false;
    this.dots.visible = false;
    scene.add(this.dots);
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
    this.line.visible = count > 1;

    // Place dots every 5th point for depth cues
    let dotCount = 0;
    for (let i = 0; i < count; i += 5) {
      this.dotPositions[dotCount * 3] = points[i].x;
      this.dotPositions[dotCount * 3 + 1] = points[i].y;
      this.dotPositions[dotCount * 3 + 2] = points[i].z;
      dotCount++;
    }
    this.dotGeometry.attributes.position.needsUpdate = true;
    this.dotGeometry.setDrawRange(0, dotCount);
    this.dots.visible = dotCount > 0;
  }

  /** Hide the trajectory line. */
  hide() {
    this.line.visible = false;
    this.dots.visible = false;
    this.geometry.setDrawRange(0, 0);
    this.dotGeometry.setDrawRange(0, 0);
  }

  dispose() {
    this.line.parent?.remove(this.line);
    this.dots.parent?.remove(this.dots);
    this.geometry.dispose();
    this.dotGeometry.dispose();
    (this.line.material as THREE.Material).dispose();
    (this.dots.material as THREE.Material).dispose();
  }
}
