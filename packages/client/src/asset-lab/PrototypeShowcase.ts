import * as THREE from 'three';
import { prototypePalette } from './palette';
import { createPrototypeBow } from './PrototypeBow';
import { ArrowTrailPrototype, RingPulsePrototype, ShardBurstPrototype } from './PrototypeEffects';
import {
  createArrowBundlePickupPrototype,
  createShieldPickupPrototype,
  createTeleportPickupPrototype,
} from './PrototypePickups';
import {
  createBoulderClusterPrototype,
  createSpawnTotemPrototype,
  createStoneLanternPrototype,
  createTreePrototype,
} from './PrototypeProps';
import {
  createPlayerTotemPrototype,
  createShieldedPlayerPrototype,
  createVictoryMarkerPrototype,
} from './PrototypePlayerKit';
import {
  createDojoGatePrototype,
  createTargetDummyPrototype,
  createZoneBeaconPrototype,
} from './PrototypeArenaSet';

interface FloatingAsset {
  object: THREE.Object3D;
  baseY: number;
  amplitude: number;
  speed: number;
  spin: number;
}

export class AssetShowcaseRig {
  readonly group = new THREE.Group();

  private bowRig = createPrototypeBow();
  private arrowTrail = new ArrowTrailPrototype(10, prototypePalette.ember);
  private pulse = new RingPulsePrototype(prototypePalette.teleport, 3, 0.8);
  private shieldBurst = new ShardBurstPrototype(prototypePalette.shieldGlow, 10, 0.8);
  private floatingAssets: FloatingAsset[] = [];
  private elapsed = 0;
  private nextPulseAt = 0;
  private nextBurstAt = 1.2;

  constructor() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 24),
      new THREE.MeshLambertMaterial({
        color: prototypePalette.stoneDark,
        flatShading: true,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    this.group.add(floor);

    this.placeRow([
      this.wrapFloating(this.bowRig.group, -6.4, 1.4, 0, 0.18, 1.8, 0.28),
      this.wrapFloating(createShieldPickupPrototype(), -3.9, 0.5, 0, 0.14, 1.4, 0.5),
      this.wrapFloating(createArrowBundlePickupPrototype(), -2.4, 0.5, 0, 0.12, 1.2, 0.42),
      this.wrapFloating(createTeleportPickupPrototype(), -0.9, 0.5, 0, 0.16, 1.6, 0.6),
    ]);

    this.placeRow([
      this.wrapStatic(createTreePrototype(), 1.2, 0, -1.2, 0.22),
      this.wrapStatic(createStoneLanternPrototype(), 2.9, 0, -1.1, -0.16),
      this.wrapStatic(createBoulderClusterPrototype(), 4.4, 0, -1.2, 0.28),
      this.wrapStatic(createSpawnTotemPrototype(), 6.1, 0, -1.1, 0.18),
    ]);

    this.placeRow([
      this.wrapStatic(createPlayerTotemPrototype(), -2.2, 0, 2.8, 0.16),
      this.wrapStatic(createShieldedPlayerPrototype(prototypePalette.bannerRed), 0.1, 0, 2.8, -0.12),
      this.wrapFloating(createVictoryMarkerPrototype(), 0.1, 2.14, 2.8, 0.08, 1.8, 0.75),
      this.wrapStatic(createZoneBeaconPrototype(), 2.7, 0, 2.8, 0.12),
      this.wrapStatic(createDojoGatePrototype(), 5.4, 0, 2.8, 0.06),
      this.wrapStatic(createTargetDummyPrototype(), 7.7, 0, 2.8, -0.24),
    ]);

    this.group.add(this.arrowTrail.line);
    this.group.add(this.pulse.group);
    this.group.add(this.shieldBurst.group);

    this.pulse.group.position.set(-0.9, 0.58, 0);
    this.shieldBurst.group.position.set(0.1, 1.1, 2.8);
  }

  update(dt: number) {
    this.elapsed += dt;

    this.bowRig.setDrawAmount((Math.sin(this.elapsed * 1.5) + 1) * 0.5);

    this.floatingAssets.forEach((asset) => {
      asset.object.position.y = asset.baseY + Math.sin(this.elapsed * asset.speed) * asset.amplitude;
      asset.object.rotation.y += dt * asset.spin;
    });

    if (this.elapsed >= this.nextPulseAt) {
      this.pulse.restart();
      this.nextPulseAt = this.elapsed + 1.9;
    }
    this.pulse.update(dt);

    if (this.elapsed >= this.nextBurstAt) {
      this.shieldBurst.restart();
      this.nextBurstAt = this.elapsed + 2.8;
    }
    this.shieldBurst.update(dt);

    this.updateTrail();
  }

  private updateTrail() {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index < 10; index++) {
      const t = index / 9;
      const x = THREE.MathUtils.lerp(6.9, 8.0, t);
      const z = THREE.MathUtils.lerp(1.7, 2.55, t);
      const y = 1.2 + Math.sin(t * Math.PI) * 0.6 + Math.sin(this.elapsed * 2.5 + t * 3) * 0.05;
      points.push(new THREE.Vector3(x, y, z));
    }
    this.arrowTrail.setPoints(points);
  }

  private placeRow(objects: THREE.Object3D[]) {
    objects.forEach((object) => this.group.add(object));
  }

  private wrapFloating(
    object: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    amplitude: number,
    speed: number,
    spin: number
  ): THREE.Object3D {
    object.position.set(x, y, z);
    this.floatingAssets.push({
      object,
      baseY: y,
      amplitude,
      speed,
      spin,
    });
    return object;
  }

  private wrapStatic(object: THREE.Object3D, x: number, y: number, z: number, yaw: number): THREE.Object3D {
    object.position.set(x, y, z);
    object.rotation.y = yaw;
    return object;
  }
}
