import type { HeightmapData, Vec3 } from '@bojo-dojo/common';
import { PHYSICS, SPAWN, computeTrajectory, forceToSpeed, sampleHeight } from '@bojo-dojo/common';

export interface FiringSolution {
  direction: Vec3;
  force: number;
}

/**
 * Solve the inverse ballistics problem: given a shooter origin and target position,
 * find the direction and force needed to hit the target.
 *
 * Tries multiple force levels and picks the lowest-force solution with a valid
 * (terrain-unobstructed) trajectory. Returns null if no solution exists.
 */
export function computeFiringSolution(
  shooterPos: Vec3,
  targetPos: Vec3,
  heightmap: HeightmapData,
): FiringSolution | null {
  const origin = {
    x: shooterPos.x,
    y: shooterPos.y + SPAWN.PLAYER_EYE_HEIGHT,
    z: shooterPos.z,
  };
  // Aim at center-mass of target (half player height)
  const targetY = targetPos.y + PHYSICS.PLAYER_HITBOX_HEIGHT * 0.5;

  const dx = targetPos.x - origin.x;
  const dz = targetPos.z - origin.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  if (horizontalDist < 1) return null; // Too close

  const dy = targetY - origin.y;
  const g = PHYSICS.GRAVITY;

  // Horizontal aim direction (unit vector in XZ plane)
  const hx = dx / horizontalDist;
  const hz = dz / horizontalDist;

  // Try force values from 0.4 to 1.0
  for (let force = 0.4; force <= 1.01; force += 0.1) {
    const speed = forceToSpeed(force);
    const v2 = speed * speed;
    const v4 = v2 * v2;

    // Projectile equation: tan(theta) = (v^2 - sqrt(v^4 - g*(g*d^2 + 2*dy*v^2))) / (g*d)
    const discriminant = v4 - g * (g * horizontalDist * horizontalDist + 2 * dy * v2);
    if (discriminant < 0) continue; // No real solution at this speed

    // Prefer lower arc (minus sign) for flatter, faster shots
    const sqrtDisc = Math.sqrt(discriminant);
    const tanTheta = (v2 - sqrtDisc) / (g * horizontalDist);
    const theta = Math.atan(tanTheta);

    // Build 3D direction vector
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const direction: Vec3 = {
      x: hx * cosTheta,
      y: sinTheta,
      z: hz * cosTheta,
    };

    // Verify by simulating the trajectory and checking for terrain occlusion
    const trajectory = computeTrajectory(origin, direction, speed, {
      getTerrainHeight: (x, z) => sampleHeight(heightmap, x, z),
    });

    // Check if trajectory lands near the target
    const landing = trajectory[trajectory.length - 1].position;
    const landDx = landing.x - targetPos.x;
    const landDz = landing.z - targetPos.z;
    const landDist = Math.sqrt(landDx * landDx + landDz * landDz);

    // Accept if landing is within a reasonable radius of target
    // (accounts for the arrow passing through the target area)
    if (landDist < PHYSICS.PLAYER_HITBOX_RADIUS + PHYSICS.ARROW_HITBOX_RADIUS + 2) {
      return { direction, force: Math.min(1, force) };
    }

    // Also check if any trajectory point passes close to target
    // (arrow may fly through target before landing)
    for (const point of trajectory) {
      const pdx = point.position.x - targetPos.x;
      const pdy = point.position.y - targetY;
      const pdz = point.position.z - targetPos.z;
      const dist2D = Math.sqrt(pdx * pdx + pdz * pdz);
      if (dist2D < PHYSICS.PLAYER_HITBOX_RADIUS + PHYSICS.ARROW_HITBOX_RADIUS + 1
        && Math.abs(pdy) < PHYSICS.PLAYER_HITBOX_HEIGHT) {
        return { direction, force: Math.min(1, force) };
      }
    }
  }

  return null;
}

/**
 * Apply random angular spread to a direction vector.
 * spreadDeg is the maximum spread in degrees.
 */
export function applyAimSpread(direction: Vec3, spreadDeg: number): Vec3 {
  const spreadRad = (spreadDeg * Math.PI) / 180;
  const yawOffset = (Math.random() - 0.5) * 2 * spreadRad;
  const pitchOffset = (Math.random() - 0.5) * 2 * spreadRad;

  // Rotate around Y axis (yaw)
  const cosY = Math.cos(yawOffset);
  const sinY = Math.sin(yawOffset);
  let x = direction.x * cosY + direction.z * sinY;
  const z = -direction.x * sinY + direction.z * cosY;

  // Rotate around horizontal axis (pitch) — approximate by adjusting y
  const cosP = Math.cos(pitchOffset);
  const sinP = Math.sin(pitchOffset);
  const y = direction.y * cosP + Math.sqrt(x * x + z * z) * sinP;
  x = x * cosP;

  // Renormalize
  const len = Math.sqrt(x * x + y * y + z * z);
  return { x: x / len, y: y / len, z: z / len };
}
