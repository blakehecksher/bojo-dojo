import type { ArrowType, HeightmapData, PickupState, Vec3 } from '@bojo-dojo/common';
import {
  checkTrajectoryHits,
  checkTrajectoryPickupHits,
  computeTrajectory,
  forceToSpeed,
  sampleHeight,
} from '@bojo-dojo/common';
import type { HitResult } from '@bojo-dojo/common';
import type { PlayerInfo } from './Room';

export function validateArrowResolution(
  origin: Vec3,
  direction: Vec3,
  force: number,
  shooterId: string,
  arrowType: ArrowType,
  players: Map<string, PlayerInfo>,
  pickups: PickupState[],
  heightmap: HeightmapData,
): {
  trajectory: ReturnType<typeof computeTrajectory>;
  playerHit: HitResult | null;
  pickupHit: HitResult | null;
  landingPosition: Vec3;
  arrowType: ArrowType;
} {
  const trajectory = computeTrajectory(origin, direction, forceToSpeed(force), {
    getTerrainHeight: (x, z) => sampleHeight(heightmap, x, z),
  });

  const activePlayers = [...players.values()]
    .filter((player) => player.id !== shooterId && player.alive)
    .map((player) => ({ id: player.id, position: player.position }));

  const activePickups = pickups
    .filter((pickup) => pickup.active)
    .map((pickup) => ({ id: pickup.id, position: pickup.position }));

  const playerHit = arrowType === 'normal'
    ? checkTrajectoryHits(trajectory, activePlayers, shooterId)
    : null;
  const pickupHit = checkTrajectoryPickupHits(trajectory, activePickups);
  const landingPosition = trajectory[trajectory.length - 1].position;

  return {
    trajectory,
    playerHit,
    pickupHit,
    landingPosition,
    arrowType,
  };
}
