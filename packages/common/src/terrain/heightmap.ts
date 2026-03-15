import type { HeightmapData, TerrainParams } from '../types.js';
import { createSeededNoise } from './noise.js';

/**
 * Generates a heightmap from a seed and terrain parameters.
 * Deterministic: same seed + params = identical heightmap on any platform.
 */
export function generateHeightmap(seed: number, params: TerrainParams): HeightmapData {
  const { resolution, maxElevation, noiseOctaves, primaryFrequency } = params;
  const noise2D = createSeededNoise(seed);
  const heights = new Float32Array(resolution * resolution);

  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      // Normalize coordinates to [0, 1] range, then scale by frequency
      const nx = x / resolution;
      const nz = z / resolution;

      let amplitude = 1;
      let frequency = primaryFrequency * resolution; // scale frequency to vertex space
      let value = 0;
      let maxAmplitude = 0;

      // Layered octaves for natural terrain detail
      for (let octave = 0; octave < noiseOctaves; octave++) {
        value += amplitude * noise2D(nx * frequency, nz * frequency);
        maxAmplitude += amplitude;
        amplitude *= 0.5;      // each octave half as strong
        frequency *= 2;        // each octave double frequency
      }

      // Normalize to [0, 1]
      value = (value / maxAmplitude + 1) / 2;

      // Edge falloff: push edges toward 0 to prevent terrain cliffs at map border
      const edgeX = Math.min(x, resolution - 1 - x) / (resolution * 0.15);
      const edgeZ = Math.min(z, resolution - 1 - z) / (resolution * 0.15);
      const edgeFactor = Math.min(1, Math.min(edgeX, edgeZ));
      value *= edgeFactor;

      heights[z * resolution + x] = value * maxElevation;
    }
  }

  return {
    heights,
    width: resolution,
    depth: resolution,
    worldWidth: params.mapSize,
    worldDepth: params.mapSize,
  };
}

/**
 * Sample height at world coordinates (x, z) with bilinear interpolation.
 */
export function sampleHeight(heightmap: HeightmapData, worldX: number, worldZ: number): number {
  const { heights, width, depth, worldWidth, worldDepth } = heightmap;

  // Convert world coords to heightmap grid coords
  const gx = ((worldX + worldWidth / 2) / worldWidth) * (width - 1);
  const gz = ((worldZ + worldDepth / 2) / worldDepth) * (depth - 1);

  // Clamp to valid range
  const x0 = Math.max(0, Math.min(width - 2, Math.floor(gx)));
  const z0 = Math.max(0, Math.min(depth - 2, Math.floor(gz)));
  const x1 = x0 + 1;
  const z1 = z0 + 1;

  const fx = gx - x0;
  const fz = gz - z0;

  // Bilinear interpolation
  const h00 = heights[z0 * width + x0];
  const h10 = heights[z0 * width + x1];
  const h01 = heights[z1 * width + x0];
  const h11 = heights[z1 * width + x1];

  return (
    h00 * (1 - fx) * (1 - fz) +
    h10 * fx * (1 - fz) +
    h01 * (1 - fx) * fz +
    h11 * fx * fz
  );
}

/**
 * Compute slope in degrees at a heightmap grid position.
 */
export function getSlopeAt(heightmap: HeightmapData, gx: number, gz: number): number {
  const { heights, width, depth, worldWidth } = heightmap;
  const cellSize = worldWidth / (width - 1);

  const x = Math.max(1, Math.min(width - 2, Math.round(gx)));
  const z = Math.max(1, Math.min(depth - 2, Math.round(gz)));

  const hL = heights[z * width + (x - 1)];
  const hR = heights[z * width + (x + 1)];
  const hD = heights[(z - 1) * width + x];
  const hU = heights[(z + 1) * width + x];

  const dx = (hR - hL) / (2 * cellSize);
  const dz = (hU - hD) / (2 * cellSize);

  return Math.atan(Math.sqrt(dx * dx + dz * dz)) * (180 / Math.PI);
}
