import type { Vec3 } from '../types.js';
import type { TrajectoryPoint } from './trajectory.js';
import { PHYSICS } from '../constants.js';

export interface HitResult {
  targetId: string;
  hitPoint: Vec3;
  hitTime: number;
}

/**
 * Check if a trajectory hits any player (modeled as cylinders).
 * Returns the first hit, or null if no hit.
 *
 * Players are cylinders: center at (px, py + height/2, pz), radius, height.
 */
export function checkTrajectoryHits(
  trajectory: TrajectoryPoint[],
  players: Array<{ id: string; position: Vec3 }>,
  shooterId: string,
  options?: {
    playerRadius?: number;
    playerHeight?: number;
    arrowRadius?: number;
  }
): HitResult | null {
  const pRadius = (options?.playerRadius ?? PHYSICS.PLAYER_HITBOX_RADIUS)
    + (options?.arrowRadius ?? PHYSICS.ARROW_HITBOX_RADIUS);
  const pHeight = options?.playerHeight ?? PHYSICS.PLAYER_HITBOX_HEIGHT;

  // Check each segment of the trajectory against each player
  for (let i = 0; i < trajectory.length - 1; i++) {
    const p0 = trajectory[i].position;
    const p1 = trajectory[i + 1].position;

    for (const player of players) {
      if (player.id === shooterId) continue;

      const px = player.position.x;
      const py = player.position.y; // base of cylinder (feet)
      const pz = player.position.z;

      // Check if segment intersects the cylinder
      if (segmentHitsCylinder(p0, p1, px, py, pz, pRadius, pHeight)) {
        // Approximate hit point as midpoint of the segment
        return {
          targetId: player.id,
          hitPoint: {
            x: (p0.x + p1.x) / 2,
            y: (p0.y + p1.y) / 2,
            z: (p0.z + p1.z) / 2,
          },
          hitTime: (trajectory[i].time + trajectory[i + 1].time) / 2,
        };
      }
    }
  }

  return null;
}

/**
 * Test if a line segment from a to b intersects a cylinder.
 * Cylinder is axis-aligned (Y axis), base at (cx, cy, cz), radius r, height h.
 */
function segmentHitsCylinder(
  a: Vec3, b: Vec3,
  cx: number, cy: number, cz: number,
  r: number, h: number,
): boolean {
  // Project segment onto XZ plane for 2D circle test
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const fx = a.x - cx;
  const fz = a.z - cz;

  const A = dx * dx + dz * dz;
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;

  let discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);

  // Check both intersection points
  for (const sign of [-1, 1]) {
    const t = (-B + sign * discriminant) / (2 * A);
    if (t >= 0 && t <= 1) {
      // Check Y range at this t
      const dy = b.y - a.y;
      const hitY = a.y + dy * t;
      if (hitY >= cy && hitY <= cy + h) {
        return true;
      }
    }
  }

  // Also check if segment is entirely inside the cylinder
  const inCircleA = fx * fx + fz * fz <= r * r;
  const ex = b.x - cx;
  const ez = b.z - cz;
  const inCircleB = ex * ex + ez * ez <= r * r;
  if (inCircleA && a.y >= cy && a.y <= cy + h) return true;
  if (inCircleB && b.y >= cy && b.y <= cy + h) return true;

  return false;
}
