import * as THREE from 'three';
import { RingPulsePrototype, ShardBurstPrototype } from '../asset-lab/PrototypeEffects';
import { prototypePalette } from '../asset-lab/palette';

/**
 * HitEffects — pooled particle/ring effects for impacts, kills, and shield breaks.
 *
 * The juicy effect classes already existed in asset-lab but were never wired into
 * the live game. This manager owns small pools of them, adds their groups to the
 * scene once, and exposes simple fire-and-forget triggers.
 */
export class HitEffects {
  private deathRings: RingPulsePrototype[] = [];
  private bursts: ShardBurstPrototype[] = [];
  private active = new Set<{ update(dt: number): boolean }>();

  constructor(scene: THREE.Scene, poolSize = 6) {
    for (let i = 0; i < poolSize; i++) {
      const ring = new RingPulsePrototype(prototypePalette.ember, 3, 0.6);
      scene.add(ring.group);
      this.deathRings.push(ring);

      const burst = new ShardBurstPrototype(prototypePalette.shieldGlow, 12, 0.7);
      scene.add(burst.group);
      this.bursts.push(burst);
    }
  }

  private nextRing(): RingPulsePrototype {
    // Reuse the least-recently-active ring (simple round-robin via shift/push).
    const ring = this.deathRings.shift()!;
    this.deathRings.push(ring);
    return ring;
  }

  private nextBurst(color: number): ShardBurstPrototype {
    const burst = this.bursts.shift()!;
    this.bursts.push(burst);
    burst.group.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
      mat.color.setHex(color);
      mat.emissive.setHex(color);
    });
    return burst;
  }

  /** Elimination: shockwave ring + golden shard burst at the player position. */
  playDeath(position: THREE.Vector3) {
    const ring = this.nextRing();
    ring.restart(position.clone());
    this.active.add(ring);

    const burst = this.nextBurst(prototypePalette.ember);
    burst.restart(position.clone().setY(position.y + 1.0));
    this.active.add(burst);
  }

  /** Shield absorbed a hit: blue crystalline shard burst. */
  playShieldBreak(position: THREE.Vector3) {
    const burst = this.nextBurst(prototypePalette.shieldGlow);
    burst.restart(position.clone().setY(position.y + 1.0));
    this.active.add(burst);
  }

  update(dt: number) {
    for (const effect of this.active) {
      if (!effect.update(dt)) this.active.delete(effect);
    }
  }
}
