import type { Vec3 } from '../types.js';
import type { TrajectoryPoint } from './trajectory.js';
import { PHYSICS } from '../constants.js';

export interface HitResult {
  targetId: string;
  hitPoint: Vec3;
  hitTime: number;
}

function segmentHitsCylinder(
  a: Vec3,
  b: Vec3,
  cx: number,
  cy: number,
  cz: number,
  r: number,
  h: number,
): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const fx = a.x - cx;
  const fz = a.z - cz;
  const A = dx * dx + dz * dz;
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;

  if (A === 0) {
    return fx * fx + fz * fz <= r * r && a.y >= cy && a.y <= cy + h;
  }

  let discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);

  for (const sign of [-1, 1] as const) {
    const t = (-B + sign * discriminant) / (2 * A);
    if (t < 0 || t > 1) continue;
    const hitY = a.y + (b.y - a.y) * t;
    if (hitY >= cy && hitY <= cy + h) return true;
  }

  const endInside = [
    { x: a.x, y: a.y, z: a.z },
    { x: b.x, y: b.y, z: b.z },
  ].some((point) => {
    const px = point.x - cx;
    const pz = point.z - cz;
    return px * px + pz * pz <= r * r && point.y >= cy && point.y <= cy + h;
  });

  return endInside;
}

export function findFirstTrajectoryCollision(
  trajectory: TrajectoryPoint[],
  targets: Array<{ id: string; position: Vec3 }>,
  options?: {
    radius?: number;
    height?: number;
    arrowRadius?: number;
  },
): HitResult | null {
  const radius = (options?.radius ?? PHYSICS.PLAYER_HITBOX_RADIUS)
    + (options?.arrowRadius ?? PHYSICS.ARROW_HITBOX_RADIUS);
  const height = options?.height ?? PHYSICS.PLAYER_HITBOX_HEIGHT;

  for (let i = 0; i < trajectory.length - 1; i++) {
    const p0 = trajectory[i].position;
    const p1 = trajectory[i + 1].position;

    for (const target of targets) {
      if (!segmentHitsCylinder(p0, p1, target.position.x, target.position.y, target.position.z, radius, height)) {
        continue;
      }

      return {
        targetId: target.id,
        hitPoint: {
          x: (p0.x + p1.x) * 0.5,
          y: (p0.y + p1.y) * 0.5,
          z: (p0.z + p1.z) * 0.5,
        },
        hitTime: (trajectory[i].time + trajectory[i + 1].time) * 0.5,
      };
    }
  }

  return null;
}

/**
 * Check if a trajectory hits any player (modeled as cylinders).
 */
export function checkTrajectoryHits(
  trajectory: TrajectoryPoint[],
  players: Array<{ id: string; position: Vec3 }>,
  shooterId: string,
  options?: {
    playerRadius?: number;
    playerHeight?: number;
    arrowRadius?: number;
  },
): HitResult | null {
  return findFirstTrajectoryCollision(
    trajectory,
    players.filter((player) => player.id !== shooterId),
    {
      radius: options?.playerRadius,
      height: options?.playerHeight,
      arrowRadius: options?.arrowRadius,
    },
  );
}

export function checkTrajectoryPickupHits(
  trajectory: TrajectoryPoint[],
  pickups: Array<{ id: string; position: Vec3 }>,
): HitResult | null {
  return findFirstTrajectoryCollision(trajectory, pickups, {
    radius: PHYSICS.PICKUP_HITBOX_RADIUS,
    height: PHYSICS.PICKUP_HITBOX_HEIGHT,
    arrowRadius: 0,
  });
}
