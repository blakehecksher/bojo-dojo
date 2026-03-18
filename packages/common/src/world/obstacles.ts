import type { CircleArea, HeightmapData, ObstacleLayout, TerrainParams } from '../types.js';
import { mulberry32 } from '../terrain/noise.js';
import { sampleHeight } from '../terrain/heightmap.js';

function insideAnyExclusion(x: number, z: number, exclusions: CircleArea[]): boolean {
  return exclusions.some((area) => {
    const dx = x - area.x;
    const dz = z - area.z;
    return dx * dx + dz * dz < area.radius * area.radius;
  });
}

export function generateObstacleLayout(
  seed: number,
  heightmap: HeightmapData,
  params: TerrainParams,
  exclusions: CircleArea[] = [],
): ObstacleLayout {
  const rng = mulberry32(seed + 999);
  const area = params.mapSize * params.mapSize;
  const numTrees = Math.floor(area * params.treeDensity);
  const numRocks = Math.floor(area * params.rockDensity);
  const halfSize = params.mapSize / 2;
  const edgeBuffer = 10;

  const trees: ObstacleLayout['trees'] = [];
  const rocks: ObstacleLayout['rocks'] = [];

  for (let i = 0; i < numTrees * 6 && trees.length < numTrees; i++) {
    const x = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);
    const z = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);
    if (Math.abs(x) > halfSize - edgeBuffer || Math.abs(z) > halfSize - edgeBuffer) continue;
    if (insideAnyExclusion(x, z, exclusions)) continue;

    const widthScale = 0.6 + rng() * 0.8;
    const heightScale = 0.5 + rng() * 1.5;
    trees.push({
      x,
      y: sampleHeight(heightmap, x, z),
      z,
      scale: widthScale,
      heightScale,
      rotation: rng() * Math.PI * 2,
    });
  }

  for (let i = 0; i < numRocks * 6 && rocks.length < numRocks; i++) {
    const x = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);
    const z = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);
    if (Math.abs(x) > halfSize - edgeBuffer || Math.abs(z) > halfSize - edgeBuffer) continue;
    if (insideAnyExclusion(x, z, exclusions)) continue;

    rocks.push({
      x,
      y: sampleHeight(heightmap, x, z),
      z,
      scale: 0.4 + rng() * 0.8,
      rotation: rng() * Math.PI * 2,
      tiltX: (rng() - 0.5) * 0.3,
    });
  }

  return { trees, rocks };
}
