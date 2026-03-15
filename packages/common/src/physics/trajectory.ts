import type { Vec3 } from '../types.js';
import { PHYSICS } from '../constants.js';

export interface TrajectoryPoint {
  position: Vec3;
  velocity: Vec3;
  time: number;
}

/**
 * Compute a ballistic trajectory from origin in a given direction at a given speed.
 * Returns an array of points at fixed time steps until the arrow goes below minY
 * or maxTime is exceeded.
 *
 * Deterministic: same inputs = same output on any platform.
 */
export function computeTrajectory(
  origin: Vec3,
  direction: Vec3,
  speed: number,
  options?: {
    gravity?: number;
    dt?: number;
    maxTime?: number;
    /** Callback to check terrain height at (x, z). If arrow y < terrain y, stop. */
    getTerrainHeight?: (x: number, z: number) => number;
  }
): TrajectoryPoint[] {
  const gravity = options?.gravity ?? PHYSICS.GRAVITY;
  const dt = options?.dt ?? PHYSICS.TRAJECTORY_DT;
  const maxTime = options?.maxTime ?? 10; // 10 seconds max flight

  // Normalize direction
  const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
  const dx = direction.x / len;
  const dy = direction.y / len;
  const dz = direction.z / len;

  // Initial velocity
  const vx = dx * speed;
  let vy = dy * speed;
  const vz = dz * speed;

  let x = origin.x;
  let y = origin.y;
  let z = origin.z;
  let t = 0;

  const points: TrajectoryPoint[] = [
    { position: { x, y, z }, velocity: { x: vx, y: vy, z: vz }, time: 0 },
  ];

  while (t < maxTime) {
    t += dt;
    x += vx * dt;
    vy -= gravity * dt;
    y += vy * dt;
    z += vz * dt;

    points.push({
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
      time: t,
    });

    // Check terrain collision
    if (options?.getTerrainHeight) {
      const terrainY = options.getTerrainHeight(x, z);
      if (y <= terrainY) {
        // Snap to terrain surface
        points[points.length - 1].position.y = terrainY;
        break;
      }
    }

    // Below sea level with no terrain check — stop at y < -10
    if (!options?.getTerrainHeight && y < -10) break;
  }

  return points;
}

/**
 * Map a force value (0..1) to arrow speed (m/s).
 */
export function forceToSpeed(force: number): number {
  return PHYSICS.MIN_ARROW_SPEED + force * (PHYSICS.MAX_ARROW_SPEED - PHYSICS.MIN_ARROW_SPEED);
}

/**
 * Get the preview portion of a trajectory (first N% of points).
 */
export function getPreviewPoints(
  trajectory: TrajectoryPoint[],
  fraction: number = PHYSICS.TRAJECTORY_PREVIEW_FRACTION
): Vec3[] {
  const count = Math.max(2, Math.ceil(trajectory.length * fraction));
  return trajectory.slice(0, count).map((p) => p.position);
}
