import * as THREE from 'three';
import { PHYSICS } from '@bojo-dojo/common';

const PLAYER_COLORS = [
  0xe74c3c, // red
  0x3498db, // blue
  0x2ecc71, // green
  0xf39c12, // orange
  0x9b59b6, // purple
  0x1abc9c, // teal
];

/**
 * Visible player marker — colored cylinder with sphere head.
 * Identifiable at distance.
 */
export class PlayerMarker {
  readonly mesh: THREE.Group;
  readonly playerId: string;

  constructor(scene: THREE.Scene, playerId: string, colorIndex: number) {
    this.playerId = playerId;
    this.mesh = new THREE.Group();

    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body cylinder
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(
        PHYSICS.PLAYER_HITBOX_RADIUS * 0.7,
        PHYSICS.PLAYER_HITBOX_RADIUS * 0.8,
        PHYSICS.PLAYER_HITBOX_HEIGHT * 0.75,
        8
      ),
      mat
    );
    body.position.y = PHYSICS.PLAYER_HITBOX_HEIGHT * 0.375;
    this.mesh.add(body);

    // Head sphere
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(PHYSICS.PLAYER_HITBOX_RADIUS * 0.5, 8, 6),
      mat
    );
    head.position.y = PHYSICS.PLAYER_HITBOX_HEIGHT * 0.85;
    this.mesh.add(head);

    scene.add(this.mesh);
  }

  /** Set position (base/feet position on terrain). */
  setPosition(x: number, y: number, z: number) {
    this.mesh.position.set(x, y, z);
  }

  /** Remove from scene. */
  dispose() {
    this.mesh.parent?.remove(this.mesh);
  }
}
