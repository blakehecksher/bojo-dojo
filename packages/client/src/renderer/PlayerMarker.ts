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
 * Identifiable at distance. Subtle idle bob, flash on hit.
 */
export class PlayerMarker {
  readonly mesh: THREE.Group;
  readonly playerId: string;

  private baseY = 0;
  private bobTime = 0;
  private bodyMat: THREE.MeshLambertMaterial;
  private headMat: THREE.MeshLambertMaterial;
  private originalColor: number;
  private flashTimer = 0;
  private shieldMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, playerId: string, colorIndex: number) {
    this.playerId = playerId;
    this.mesh = new THREE.Group();

    this.originalColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    this.bodyMat = new THREE.MeshLambertMaterial({ color: this.originalColor });
    this.headMat = new THREE.MeshLambertMaterial({ color: this.originalColor });

    // Body cylinder
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(
        PHYSICS.PLAYER_HITBOX_RADIUS * 0.7,
        PHYSICS.PLAYER_HITBOX_RADIUS * 0.8,
        PHYSICS.PLAYER_HITBOX_HEIGHT * 0.75,
        8
      ),
      this.bodyMat
    );
    body.position.y = PHYSICS.PLAYER_HITBOX_HEIGHT * 0.375;
    body.castShadow = true;
    this.mesh.add(body);

    // Head sphere
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(PHYSICS.PLAYER_HITBOX_RADIUS * 0.5, 8, 6),
      this.headMat
    );
    head.position.y = PHYSICS.PLAYER_HITBOX_HEIGHT * 0.85;
    head.castShadow = true;
    this.mesh.add(head);

    // Randomize bob phase per player so they don't sync
    this.bobTime = Math.random() * Math.PI * 2;

    scene.add(this.mesh);

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(PHYSICS.PLAYER_HITBOX_RADIUS * 1.35, 12, 10),
      new THREE.MeshBasicMaterial({
        color: 0x6ecbff,
        transparent: true,
        opacity: 0.22,
      }),
    );
    this.shieldMesh.position.y = PHYSICS.PLAYER_HITBOX_HEIGHT * 0.55;
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);
  }

  /** Set position (base/feet position on terrain). */
  setPosition(x: number, y: number, z: number) {
    this.baseY = y;
    this.mesh.position.set(x, y, z);
  }

  /** Per-frame update: idle bob + hit flash recovery. */
  update(dt: number) {
    if (!this.mesh.visible) return;

    // Idle bob
    this.bobTime += dt;
    const bob = Math.sin(this.bobTime * 1.5) * 0.05;
    this.mesh.position.y = this.baseY + bob;

    // Hit flash recovery
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      // Flash white then fade back
      const t = Math.max(0, this.flashTimer / 0.3);
      const flashColor = new THREE.Color(this.originalColor).lerp(new THREE.Color(0xffffff), t);
      this.bodyMat.color.copy(flashColor);
      this.headMat.color.copy(flashColor);
      if (this.flashTimer <= 0) {
        this.bodyMat.color.setHex(this.originalColor);
        this.headMat.color.setHex(this.originalColor);
      }
    }
  }

  /** Flash white on hit (before hiding). */
  flashHit() {
    this.flashTimer = 0.3;
  }

  setShield(active: boolean) {
    this.shieldMesh.visible = active;
  }

  /** Remove from scene. */
  dispose() {
    this.mesh.parent?.remove(this.mesh);
  }
}
