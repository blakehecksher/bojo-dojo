import type { Vec3, HeightmapData } from '@bojo-dojo/common';
import {
  computeTrajectory, forceToSpeed, checkTrajectoryHits, sampleHeight,
} from '@bojo-dojo/common';
import type { HitResult } from '@bojo-dojo/common';
import type { PlayerInfo } from './Room';

/**
 * Server-authoritative hit validation.
 * Computes the full trajectory and checks against all player hitboxes.
 */
export function validateArrowHit(
  origin: Vec3,
  direction: Vec3,
  force: number,
  shooterId: string,
  players: Map<string, PlayerInfo>,
  spawns: Record<string, Vec3>,
  heightmap: HeightmapData,
): { hit: HitResult | null; landingPosition: Vec3 } {
  const speed = forceToSpeed(force);

  const trajectory = computeTrajectory(origin, direction, speed, {
    getTerrainHeight: (x, z) => sampleHeight(heightmap, x, z),
  });

  // Build player list (only alive players)
  const targetPlayers: Array<{ id: string; position: Vec3 }> = [];
  for (const [id, info] of players) {
    if (id === shooterId || !info.alive) continue;
    const pos = spawns[id];
    if (pos) targetPlayers.push({ id, position: pos });
  }

  const hit = checkTrajectoryHits(trajectory, targetPlayers, shooterId);

  // Landing position is the last point in trajectory
  const lastPoint = trajectory[trajectory.length - 1];
  const landingPosition = lastPoint.position;

  return { hit, landingPosition };
}
