import type { HeightmapData, Vec3 } from '../types.js';
import { SPAWN } from '../constants.js';
import { sampleHeight, getSlopeAt } from './heightmap.js';
import { mulberry32 } from './noise.js';

/**
 * Generate spawn points for N players on the given heightmap.
 * Uses farthest-point sampling with slope filtering and LOS validation.
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
  const buffer = SPAWN.EDGE_BUFFER;
  const cellSize = worldWidth / (width - 1);

  // Generate candidate grid positions
  const candidates: Vec3[] = [];
  const step = 10; // sample every 10 meters
  for (let wx = -halfW + buffer; wx <= halfW - buffer; wx += step) {
    for (let wz = -halfD + buffer; wz <= halfD - buffer; wz += step) {
      // Convert to grid coords for slope check
      const gx = ((wx + halfW) / worldWidth) * (width - 1);
      const gz = ((wz + halfD) / worldDepth) * (depth - 1);
      const slope = getSlopeAt(heightmap, gx, gz);

      if (slope <= SPAWN.MAX_SLOPE) {
        const h = sampleHeight(heightmap, wx, wz);
        candidates.push({ x: wx, y: h, z: wz });
      }
    }
  }

  // Shuffle candidates for randomness
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  if (candidates.length < playerCount) {
    // Fallback: just spread evenly
    return fallbackSpawns(heightmap, playerCount);
  }

  // DEBUG: spawn players 5m apart for testing visibility
  const DEBUG_CLOSE_SPAWN = false;

  // Farthest-point sampling
  const selected: Vec3[] = [];

  // Pick first spawn near-ish center but not exactly center
  const first = candidates[Math.floor(rng() * Math.min(20, candidates.length))];
  selected.push(first);

  if (DEBUG_CLOSE_SPAWN) {
    // Place all other players 5m from the first and return immediately
    // (skip LOS validation which would move them far away)
    for (let p = 1; p < playerCount; p++) {
      const angle = (p / (playerCount - 1)) * Math.PI * 2 * rng();
      const nx = first.x + Math.cos(angle) * 5;
      const nz = first.z + Math.sin(angle) * 5;
      const ny = sampleHeight(heightmap, nx, nz);
      selected.push({ x: nx, y: ny, z: nz });
    }
    return selected;
  } else {
  for (let p = 1; p < playerCount; p++) {
    let bestIdx = -1;
    let bestMinDist = -1;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];

      // Skip if too close to any already-selected
      let minDist = Infinity;
      for (const s of selected) {
        const d = dist2D(c, s);
        if (d < minDist) minDist = d;
      }

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(candidates[bestIdx]);
    }
  }
  }

  // LOS validation: ensure no two spawns have direct line of sight
  // If LOS exists, try swapping with nearby candidates (best-effort)
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      if (hasLineOfSight(heightmap, selected[i], selected[j])) {
        // Try to replace j with a candidate that doesn't have LOS to any selected
        const replacement = findNonLOSCandidate(
          heightmap, candidates, selected, j
        );
        if (replacement) {
          selected[j] = replacement;
        }
        // If no replacement found, accept it (best-effort per spec)
      }
    }
  }

  return selected;
}

/**
 * Check if two points have direct line of sight across the heightmap.
 * Steps along the line and checks if terrain blocks the view.
 */
function hasLineOfSight(heightmap: HeightmapData, a: Vec3, b: Vec3): boolean {
  const eyeHeight = SPAWN.PLAYER_EYE_HEIGHT;
  const steps = 50;

  for (let t = 0; t <= 1; t += 1 / steps) {
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const terrainH = sampleHeight(heightmap, x, z);

    // Line-of-sight height at this point
    const losH = (a.y + eyeHeight) + ((b.y + eyeHeight) - (a.y + eyeHeight)) * t;

    if (terrainH > losH) {
      return false; // Terrain blocks view
    }
  }

  return true; // Unobstructed
}

function findNonLOSCandidate(
  heightmap: HeightmapData,
  candidates: Vec3[],
  selected: Vec3[],
  replaceIndex: number,
): Vec3 | null {
  const minDist = SPAWN.MIN_DISTANCE_2P * 0.5; // relaxed minimum for replacement

  for (const c of candidates) {
    // Must be far enough from other selected points
    let tooClose = false;
    for (let i = 0; i < selected.length; i++) {
      if (i === replaceIndex) continue;
      if (dist2D(c, selected[i]) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // Must not have LOS to any other selected point
    let hasLOS = false;
    for (let i = 0; i < selected.length; i++) {
      if (i === replaceIndex) continue;
      if (hasLineOfSight(heightmap, c, selected[i])) {
        hasLOS = true;
        break;
      }
    }
    if (!hasLOS) return c;
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

function dist2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
