import type { HeightmapData, Vec3 } from '../types.js';
import { SPAWN } from '../constants.js';
import { sampleHeight, getSlopeAt } from './heightmap.js';
import { mulberry32 } from './noise.js';

function dist2D(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function hasOpenNearbyGround(heightmap: HeightmapData, x: number, z: number): boolean {
  const sampleRadius = SPAWN.OPENNESS_SAMPLE_RADIUS;
  const baseHeight = sampleHeight(heightmap, x, z);
  const offsets = [
    [sampleRadius, 0],
    [-sampleRadius, 0],
    [0, sampleRadius],
    [0, -sampleRadius],
    [sampleRadius * 0.7, sampleRadius * 0.7],
    [-sampleRadius * 0.7, sampleRadius * 0.7],
    [sampleRadius * 0.7, -sampleRadius * 0.7],
    [-sampleRadius * 0.7, -sampleRadius * 0.7],
  ];

  let maxRelief = 0;
  for (const [dx, dz] of offsets) {
    maxRelief = Math.max(maxRelief, Math.abs(sampleHeight(heightmap, x + dx, z + dz) - baseHeight));
  }

  return maxRelief <= SPAWN.OPENNESS_MAX_RELIEF;
}

function getMinimumSpawnDistance(heightmap: HeightmapData, playerCount: number): number {
  const extras = Math.max(0, playerCount - 2);
  return Math.min(
    heightmap.worldWidth * 0.3,
    SPAWN.MIN_DISTANCE_2P + extras * SPAWN.MIN_DISTANCE_PER_EXTRA_PLAYER,
  );
}

export function hasLineOfSight(heightmap: HeightmapData, a: Vec3, b: Vec3): boolean {
  const eyeHeight = SPAWN.PLAYER_EYE_HEIGHT;
  const steps = 50;

  for (let t = 0; t <= 1; t += 1 / steps) {
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const terrainH = sampleHeight(heightmap, x, z);
    const losH = (a.y + eyeHeight) + ((b.y + eyeHeight) - (a.y + eyeHeight)) * t;
    if (terrainH > losH) return false;
  }

  return true;
}

function findNonLOSCandidate(
  heightmap: HeightmapData,
  candidates: Vec3[],
  selected: Vec3[],
  replaceIndex: number,
  minDistance: number,
): Vec3 | null {
  for (const candidate of candidates) {
    const tooClose = selected.some((spawn, index) => (
      index !== replaceIndex && dist2D(candidate, spawn) < minDistance
    ));
    if (tooClose) continue;

    const hasLOS = selected.some((spawn, index) => (
      index !== replaceIndex && hasLineOfSight(heightmap, candidate, spawn)
    ));
    if (!hasLOS) return candidate;
  }

  return null;
}

function fallbackSpawns(heightmap: HeightmapData, count: number): Vec3[] {
  const spawns: Vec3[] = [];
  const r = heightmap.worldWidth * 0.3;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = sampleHeight(heightmap, x, z);
    spawns.push({ x, y, z });
  }
  return spawns;
}

/**
 * Generate spawn points for N players on the given heightmap.
 * Uses farthest-point sampling with slope, edge, openness, and LOS checks.
 */
export function generateSpawnPoints(
  seed: number,
  heightmap: HeightmapData,
  playerCount: number,
): Vec3[] {
  const rng = mulberry32(seed + 12345);
  const { worldWidth, worldDepth, width, depth } = heightmap;
  const halfW = worldWidth / 2;
  const halfD = worldDepth / 2;
  const minDistance = getMinimumSpawnDistance(heightmap, playerCount);

  const candidates: Vec3[] = [];
  const step = 8;

  for (let wx = -halfW + SPAWN.EDGE_BUFFER; wx <= halfW - SPAWN.EDGE_BUFFER; wx += step) {
    for (let wz = -halfD + SPAWN.EDGE_BUFFER; wz <= halfD - SPAWN.EDGE_BUFFER; wz += step) {
      const gx = ((wx + halfW) / worldWidth) * (width - 1);
      const gz = ((wz + halfD) / worldDepth) * (depth - 1);
      const slope = getSlopeAt(heightmap, gx, gz);
      if (slope > SPAWN.MAX_SLOPE) continue;
      if (!hasOpenNearbyGround(heightmap, wx, wz)) continue;
      candidates.push({ x: wx, y: sampleHeight(heightmap, wx, wz), z: wz });
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  if (candidates.length < playerCount) {
    return fallbackSpawns(heightmap, playerCount);
  }

  const selected: Vec3[] = [];

  // Expanded center bias pool — first spawn can be further from center for variety
  const centerBias = [...candidates].sort((a, b) => dist2D(a, { x: 0, z: 0 }) - dist2D(b, { x: 0, z: 0 }));
  const centerPoolSize = Math.max(16, Math.floor(centerBias.length * 0.25));
  selected.push(centerBias[Math.floor(rng() * Math.min(centerPoolSize, centerBias.length))]);

  // Weighted random selection — farther candidates mildly preferred but not guaranteed
  for (let playerIndex = 1; playerIndex < playerCount; playerIndex++) {
    const validCandidates: { index: number; minDist: number }[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      let candidateMinDist = Infinity;

      for (const spawn of selected) {
        candidateMinDist = Math.min(candidateMinDist, dist2D(candidate, spawn));
      }

      if (candidateMinDist >= minDistance) {
        validCandidates.push({ index: i, minDist: candidateMinDist });
      }
    }

    if (validCandidates.length > 0) {
      // Uniform random from all valid candidates — no bias toward farther points
      const pick = validCandidates[Math.floor(rng() * validCandidates.length)];
      selected.push(candidates[pick.index]);
    }
  }

  if (selected.length < playerCount) {
    return fallbackSpawns(heightmap, playerCount);
  }

  // Optional cluster: 50% chance to pull one spawn closer to another for early action
  if (rng() < 0.5 && selected.length >= 3) {
    const clusterBase = Math.floor(rng() * selected.length);
    const clusterTarget = (clusterBase + 1) % selected.length;
    const halfMin = minDistance * 0.5;

    // Find a valid candidate 20-50m from the base spawn
    const nearCandidates = candidates.filter((c) => {
      const d = dist2D(c, selected[clusterBase]);
      if (d < 20 || d > 50) return false;
      // Must still be reasonably far from all other spawns
      return selected.every((s, i) => i === clusterTarget || dist2D(c, s) >= halfMin);
    });

    if (nearCandidates.length > 0) {
      selected[clusterTarget] = nearCandidates[Math.floor(rng() * nearCandidates.length)];
    }
  }

  // LOS replacement pass — swap spawns that can see each other if possible
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      if (!hasLineOfSight(heightmap, selected[i], selected[j])) continue;
      const replacement = findNonLOSCandidate(heightmap, candidates, selected, j, minDistance * 0.8);
      if (replacement) {
        selected[j] = replacement;
      }
    }
  }

  return selected;
}
