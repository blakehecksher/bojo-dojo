import * as THREE from 'three';
import { prototypePalette } from './palette';

export class ArrowTrailPrototype {
  readonly line: THREE.Line;
  private positions: Float32Array;

  constructor(segmentCount = 8, color = prototypePalette.ember) {
    this.positions = new Float32Array(segmentCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.75,
      })
    );
    this.line.frustumCulled = false;
  }

  setPoints(points: readonly THREE.Vector3[]) {
    const attribute = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const count = attribute.count;
    const fallback = points.length > 0 ? points[points.length - 1] : new THREE.Vector3();

    for (let index = 0; index < count; index++) {
      const point = points[index] ?? fallback;
      this.positions[index * 3] = point.x;
      this.positions[index * 3 + 1] = point.y;
      this.positions[index * 3 + 2] = point.z;
    }

    attribute.needsUpdate = true;
  }
}

export class RingPulsePrototype {
  readonly group = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private duration: number;
  private elapsed = 0;
  private active = false;

  constructor(color = prototypePalette.teleport, ringCount = 3, duration = 0.55) {
    this.duration = duration;

    for (let index = 0; index < ringCount; index++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.04, 6, 20),
        new THREE.MeshLambertMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.28,
          transparent: true,
          opacity: 0,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      this.group.add(ring);
      this.rings.push(ring);
    }
  }

  restart(position?: THREE.Vector3) {
    this.elapsed = 0;
    this.active = true;
    if (position) {
      this.group.position.copy(position);
    }

    this.rings.forEach((ring) => {
      ring.visible = true;
      ring.scale.setScalar(0.4);
      const material = ring.material as THREE.MeshLambertMaterial;
      material.opacity = 0.85;
    });
  }

  update(dt: number): boolean {
    if (!this.active) {
      return false;
    }

    this.elapsed += dt;
    const baseProgress = this.elapsed / this.duration;

    this.rings.forEach((ring, index) => {
      const progress = baseProgress - index * 0.14;
      if (progress <= 0 || progress >= 1) {
        ring.visible = false;
        return;
      }

      ring.visible = true;
      const scale = THREE.MathUtils.lerp(0.45, 1.7, progress);
      ring.scale.setScalar(scale);
      ring.position.y = THREE.MathUtils.lerp(0, 0.24, progress);

      const material = ring.material as THREE.MeshLambertMaterial;
      material.opacity = 1 - progress;
    });

    if (baseProgress >= 1 + this.rings.length * 0.14) {
      this.active = false;
      return false;
    }

    return true;
  }
}

export class ShardBurstPrototype {
  readonly group = new THREE.Group();
  private shards: THREE.Mesh[] = [];
  private velocities: THREE.Vector3[] = [];
  private spins: THREE.Vector3[] = [];
  private duration: number;
  private elapsed = 0;
  private active = false;

  constructor(color = prototypePalette.shieldGlow, shardCount = 10, duration = 0.6) {
    this.duration = duration;

    for (let index = 0; index < shardCount; index++) {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.04, 0.02),
        new THREE.MeshLambertMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0,
        })
      );
      shard.visible = false;
      this.group.add(shard);
      this.shards.push(shard);
      this.velocities.push(new THREE.Vector3());
      this.spins.push(new THREE.Vector3());
    }
  }

  restart(position?: THREE.Vector3) {
    this.elapsed = 0;
    this.active = true;
    if (position) {
      this.group.position.copy(position);
    }

    this.shards.forEach((shard, index) => {
      const angle = (Math.PI * 2 * index) / this.shards.length + Math.random() * 0.2;
      const lift = 0.8 + Math.random() * 0.7;
      const speed = 1.2 + Math.random() * 0.9;

      this.velocities[index].set(Math.cos(angle) * speed, lift, Math.sin(angle) * speed);
      this.spins[index].set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

      shard.visible = true;
      shard.position.set(0, 0, 0);
      shard.rotation.set(Math.random(), Math.random(), Math.random());
      shard.scale.setScalar(1);

      const material = shard.material as THREE.MeshLambertMaterial;
      material.opacity = 0.9;
    });
  }

  update(dt: number): boolean {
    if (!this.active) {
      return false;
    }

    this.elapsed += dt;
    const progress = this.elapsed / this.duration;

    this.shards.forEach((shard, index) => {
      if (!shard.visible) {
        return;
      }

      this.velocities[index].y -= 4.8 * dt;
      shard.position.addScaledVector(this.velocities[index], dt);
      shard.rotation.x += this.spins[index].x * dt;
      shard.rotation.y += this.spins[index].y * dt;
      shard.rotation.z += this.spins[index].z * dt;
      shard.scale.setScalar(THREE.MathUtils.lerp(1, 0.25, progress));

      const material = shard.material as THREE.MeshLambertMaterial;
      material.opacity = Math.max(0, 1 - progress);
    });

    if (progress >= 1) {
      this.active = false;
      this.shards.forEach((shard) => {
        shard.visible = false;
      });
      return false;
    }

    return true;
  }
}
