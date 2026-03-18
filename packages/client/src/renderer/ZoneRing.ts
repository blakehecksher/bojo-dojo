import * as THREE from 'three';
import type { ZoneState } from '@bojo-dojo/common';

export class ZoneRing {
  private mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 45, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x8de0ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(zone: ZoneState | null) {
    if (!zone) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = zone.active;
    this.mesh.position.set(zone.center.x, 22.5, zone.center.z);
    this.mesh.scale.set(zone.currentRadius, 1, zone.currentRadius);
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
