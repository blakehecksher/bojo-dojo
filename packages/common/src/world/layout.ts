import { PACING, PICKUPS, SPAWN, TERRAIN_BASE, TERRAIN_SCALING } from '../constants.js';
import type {
  CircleArea,
  HeightmapData,
  PickupState,
  TerrainParams,
  WorldLayout,
  ZoneState,
} from '../types.js';
import { generateHeightmap, getSlopeAt, sampleHeight } from '../terrain/heightmap.js';
import { mulberry32 } from '../terrain/noise.js';
import { generateSpawnPoints, getSpawnPoolSize } from '../terrain/spawn.js';
import { generateObstacleLayout } from './obstacles.js';

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function getPickupCounts(playerCount: number) {
  const extras = Math.max(0, Math.min(playerCount, TERRAIN_SCALING.MAX_BETA_PLAYERS) - 2);
  return {
    arrowBundles: PICKUPS.BASE_ARROW_BUNDLE_COUNT + extras,
    shields: PICKUPS.BASE_SHIELD_COUNT,
    teleports: PICKUPS.BASE_TELEPORT_COUNT,
  };
}

function createZoneConfig(heightmap: HeightmapData) {
  const rng = mulberry32(
    heightmap.width * 17 + heightmap.depth * 31 + Math.round(heightmap.worldWidth * 10),
  );
  const maxOffset = heightmap.worldWidth * 0.12;
  return {
    center: {
      x: (rng() - 0.5) * maxOffset * 2,
      y: 0,
      z: (rng() - 0.5) * maxOffset * 2,
    },
    initialRadius: heightmap.worldWidth * 0.38,
    finalRadius: heightmap.worldWidth * PACING.ZONE_FINAL_RADIUS_FRACTION * 0.5,
    activationElapsedFraction: PACING.ZONE_ACTIVATION,
    outsideGraceSeconds: PACING.ZONE_OUTSIDE_GRACE,
  };
}

function buildPickupCandidates(
  heightmap: HeightmapData,
  terrain: TerrainParams,
  spawns: WorldLayout['spawns'],
  exclusions: CircleArea[],
) {
  const candidates: Array<PickupState & { score: number }> = [];
  const half = terrain.mapSize / 2;
  const step = 12;

  for (let x = -half + SPAWN.EDGE_BUFFER; x <= half - SPAWN.EDGE_BUFFER; x += step) {
    for (let z = -half + SPAWN.EDGE_BUFFER; z <= half - SPAWN.EDGE_BUFFER; z += step) {
      if (exclusions.some((area) => distance2D({ x, z }, area) < area.radius + PICKUPS.MIN_DISTANCE_FROM_SPAWN)) {
        continue;
      }

      const gx = ((x + half) / terrain.mapSize) * (heightmap.width - 1);
      const gz = ((z + half) / terrain.mapSize) * (heightmap.depth - 1);
      const slope = getSlopeAt(heightmap, gx, gz);
      if (slope > SPAWN.MAX_SLOPE + 4) continue;

      const y = sampleHeight(heightmap, x, z);
      const reliefSamples = [
        sampleHeight(heightmap, x + 8, z),
        sampleHeight(heightmap, x - 8, z),
        sampleHeight(heightmap, x, z + 8),
        sampleHeight(heightmap, x, z - 8),
      ];
      const relief = Math.max(...reliefSamples.map((value) => Math.abs(value - y)));
      const spawnDistance = Math.min(...spawns.map((spawn) => distance2D({ x, z }, spawn)));
      const score = y * 0.4 + spawnDistance * 0.3 - relief * 2;

      candidates.push({
        id: '',
        type: 'arrow-bundle',
        position: { x, y, z },
        active: true,
        score,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function takePickupCandidate(
  candidates: Array<PickupState & { score: number }>,
  chosen: PickupState[],
  type: PickupState['type'],
  preferHighScore: boolean,
  idPrefix: string,
  count: number,
) {
  const ordered = preferHighScore ? candidates : [...candidates].reverse();
  for (const candidate of ordered) {
    if (chosen.length >= count) break;
    if (chosen.some((pickup) => distance2D(pickup.position, candidate.position) < PICKUPS.MIN_DISTANCE_BETWEEN_PICKUPS)) {
      continue;
    }
    chosen.push({
      id: `${idPrefix}-${chosen.length + 1}`,
      type,
      position: candidate.position,
      active: true,
    });
  }
}

function generatePickupLayout(
  heightmap: HeightmapData,
  terrain: TerrainParams,
  spawns: WorldLayout['spawns'],
  exclusions: CircleArea[],
  playerCount: number,
): PickupState[] {
  const candidates = buildPickupCandidates(heightmap, terrain, spawns, exclusions);
  const counts = getPickupCounts(playerCount);
  const pickups: PickupState[] = [];

  takePickupCandidate(candidates, pickups, 'shield', true, 'shield', counts.shields);
  takePickupCandidate(candidates, pickups, 'teleport-arrow', true, 'teleport', counts.shields + counts.teleports);
  takePickupCandidate(candidates, pickups, 'arrow-bundle', false, 'bundle', counts.shields + counts.teleports + counts.arrowBundles);

  return pickups;
}

export function getTerrainParamsForPlayerCount(playerCount: number): TerrainParams {
  const extras = Math.max(0, Math.min(playerCount, TERRAIN_SCALING.MAX_BETA_PLAYERS) - 2);
  return {
    ...TERRAIN_BASE,
    mapSize: TERRAIN_BASE.mapSize + extras * TERRAIN_SCALING.SIZE_PER_EXTRA_PLAYER,
  };
}

export function getDefaultZoneState(world: WorldLayout): ZoneState {
  return {
    ...world.zone,
    active: false,
    currentRadius: world.zone.initialRadius,
  };
}

export function clonePickups(pickups: PickupState[]): PickupState[] {
  return pickups.map((pickup) => ({
    ...pickup,
    position: { ...pickup.position },
  }));
}

export function generateWorldLayout(seed: number, playerCount: number): {
  heightmap: HeightmapData;
  layout: WorldLayout;
} {
  const terrain = getTerrainParamsForPlayerCount(playerCount);
  const spawnCount = getSpawnPoolSize(playerCount);

  for (let attempt = 0; attempt < SPAWN.MAX_GENERATION_RETRIES; attempt++) {
    const attemptSeed = seed + attempt * 7919;
    const heightmap = generateHeightmap(attemptSeed, terrain);
    const spawns = generateSpawnPoints(attemptSeed, heightmap, playerCount, spawnCount);
    const exclusions = spawns.map((spawn) => ({
      x: spawn.x,
      z: spawn.z,
      radius: SPAWN.CLEAR_RADIUS,
    }));
    const obstacles = generateObstacleLayout(attemptSeed, heightmap, terrain, exclusions);
    const pickups = generatePickupLayout(heightmap, terrain, spawns, exclusions, playerCount);

    if (spawns.length === spawnCount && pickups.length > 0) {
      return {
        heightmap,
        layout: {
          seed: attemptSeed,
          terrain,
          spawnClearRadius: SPAWN.CLEAR_RADIUS,
          spawns,
          obstacles,
          pickups,
          zone: createZoneConfig(heightmap),
        },
      };
    }
  }

  const heightmap = generateHeightmap(seed, terrain);
  const spawns = generateSpawnPoints(seed, heightmap, playerCount, spawnCount);
  const exclusions = spawns.map((spawn) => ({
    x: spawn.x,
    z: spawn.z,
    radius: SPAWN.CLEAR_RADIUS,
  }));

  return {
    heightmap,
    layout: {
      seed,
      terrain,
      spawnClearRadius: SPAWN.CLEAR_RADIUS,
      spawns,
      obstacles: generateObstacleLayout(seed, heightmap, terrain, exclusions),
      pickups: generatePickupLayout(heightmap, terrain, spawns, exclusions, playerCount),
      zone: createZoneConfig(heightmap),
    },
  };
}
