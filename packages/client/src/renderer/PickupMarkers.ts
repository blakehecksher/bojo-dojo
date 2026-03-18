import * as THREE from 'three';
import type { PickupState } from '@bojo-dojo/common';

class PickupMarker {
  readonly mesh: THREE.Group;
  readonly id: string;
  readonly type: PickupState['type'];
  private baseY = 0;
  private time = Math.random() * Math.PI * 2;

  constructor(scene: THREE.Scene, pickup: PickupState) {
    this.id = pickup.id;
    this.type = pickup.type;
    this.mesh = new THREE.Group();

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.3, 6),
      new THREE.MeshLambertMaterial({ color: 0x40362f, flatShading: true }),
    );
    pedestal.position.y = 0.15;
    this.mesh.add(pedestal);

    let visual: THREE.Object3D;
    if (pickup.type === 'shield') {
      visual = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 12, 10),
        new THREE.MeshBasicMaterial({
          color: 0x66d8ff,
          transparent: true,
          opacity: 0.45,
        }),
      );
    } else if (pickup.type === 'teleport-arrow') {
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4),
        new THREE.MeshLambertMaterial({ color: 0xf5d08a }),
      );
      shaft.rotation.z = Math.PI / 2;
      arrow.add(shaft);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.18, 4),
        new THREE.MeshLambertMaterial({ color: 0x4fd3ff }),
      );
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 0.45;
      arrow.add(tip);
      visual = arrow;
    } else {
      const quiver = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.55, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x7c4a28 }),
      );
      quiver.add(body);
      for (let i = 0; i < 3; i++) {
        const arrow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4),
          new THREE.MeshLambertMaterial({ color: 0xd8c49a }),
        );
        arrow.position.set(-0.12 + i * 0.12, 0.35, 0);
        quiver.add(arrow);
      }
      visual = quiver;
    }

    visual.position.y = 0.7;
    this.mesh.add(visual);
    scene.add(this.mesh);
    this.setPosition(pickup.position.x, pickup.position.y, pickup.position.z);
    this.mesh.visible = pickup.active;
  }

  setPosition(x: number, y: number, z: number) {
    this.baseY = y;
    this.mesh.position.set(x, y, z);
  }

  setActive(active: boolean) {
    this.mesh.visible = active;
  }

  update(dt: number) {
    if (!this.mesh.visible) return;
    this.time += dt;
    const bob = Math.sin(this.time * 1.8) * 0.15;
    this.mesh.position.y = this.baseY + bob;
    this.mesh.rotation.y += dt * 0.7;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
  }
}

export class PickupMarkers {
  private markers = new Map<string, PickupMarker>();

  constructor(private scene: THREE.Scene) {}

  sync(pickups: PickupState[]) {
    const activeIds = new Set(pickups.map((pickup) => pickup.id));

    for (const pickup of pickups) {
      let marker = this.markers.get(pickup.id);
      if (!marker) {
        marker = new PickupMarker(this.scene, pickup);
        this.markers.set(pickup.id, marker);
      }
      marker.setPosition(pickup.position.x, pickup.position.y, pickup.position.z);
      marker.setActive(pickup.active);
    }

    for (const [id, marker] of this.markers) {
      if (activeIds.has(id)) continue;
      marker.dispose();
      this.markers.delete(id);
    }
  }

  update(dt: number) {
    for (const marker of this.markers.values()) {
      marker.update(dt);
    }
  }

  dispose() {
    for (const marker of this.markers.values()) {
      marker.dispose();
    }
    this.markers.clear();
  }
}
