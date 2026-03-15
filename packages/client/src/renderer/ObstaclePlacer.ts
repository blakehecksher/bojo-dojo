import * as THREE from 'three';
import type { HeightmapData, TerrainParams } from '@bojo-dojo/common';
import { mulberry32, sampleHeight } from '@bojo-dojo/common';

// --- Tree geometry (shared) ---
function createTreeGeometry(): { trunk: THREE.CylinderGeometry; canopy: THREE.ConeGeometry } {
  return {
    trunk: new THREE.CylinderGeometry(0.15, 0.2, 1.5, 5),
    canopy: new THREE.ConeGeometry(1.2, 2.5, 6),
  };
}

// --- Rock geometry (shared) ---
function createRockGeometry(): THREE.DodecahedronGeometry {
  return new THREE.DodecahedronGeometry(1, 0);
}

/**
 * Places trees and rocks on the terrain using seeded random sampling.
 * Returns a group containing InstancedMeshes for performance.
 */
export function placeObstacles(
  seed: number,
  heightmap: HeightmapData,
  params: TerrainParams
): THREE.Group {
  const group = new THREE.Group();
  const rng = mulberry32(seed + 999); // offset seed so obstacles differ from terrain

  const area = params.mapSize * params.mapSize;
  const numTrees = Math.floor(area * params.treeDensity);
  const numRocks = Math.floor(area * params.rockDensity);
  const halfSize = params.mapSize / 2;
  const edgeBuffer = 10; // keep obstacles away from very edge

  // --- Trees (InstancedMesh for trunks and canopies) ---
  const treeGeo = createTreeGeometry();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e, flatShading: true });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2d6b30, flatShading: true });

  const trunkMesh = new THREE.InstancedMesh(treeGeo.trunk, trunkMat, numTrees);
  const canopyMesh = new THREE.InstancedMesh(treeGeo.canopy, canopyMat, numTrees);

  const mat4 = new THREE.Matrix4();
  let treeCount = 0;

  for (let i = 0; i < numTrees * 3 && treeCount < numTrees; i++) {
    const wx = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);
    const wz = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);

    // Skip if too close to edge
    if (Math.abs(wx) > halfSize - edgeBuffer || Math.abs(wz) > halfSize - edgeBuffer) continue;

    const h = sampleHeight(heightmap, wx, wz);
    const scale = 0.8 + rng() * 0.6; // 0.8 to 1.4
    const rotY = rng() * Math.PI * 2;

    // Trunk
    mat4.makeRotationY(rotY);
    mat4.setPosition(wx, h + 0.75 * scale, wz);
    mat4.scale(new THREE.Vector3(scale, scale, scale));
    trunkMesh.setMatrixAt(treeCount, mat4);

    // Canopy (sits on top of trunk)
    mat4.makeRotationY(rotY);
    mat4.setPosition(wx, h + 2.5 * scale, wz);
    mat4.scale(new THREE.Vector3(scale, scale, scale));
    canopyMesh.setMatrixAt(treeCount, mat4);

    // Vary canopy color slightly per instance
    const g = 0.42 + rng() * 0.15;
    canopyMesh.setColorAt(treeCount, new THREE.Color(0.18, g, 0.19));

    treeCount++;
  }

  trunkMesh.count = treeCount;
  canopyMesh.count = treeCount;
  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;

  group.add(trunkMesh);
  group.add(canopyMesh);

  // --- Rocks (InstancedMesh) ---
  const rockGeo = createRockGeometry();
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x808080, flatShading: true });
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, numRocks);

  let rockCount = 0;

  for (let i = 0; i < numRocks * 3 && rockCount < numRocks; i++) {
    const wx = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);
    const wz = (rng() - 0.5) * (params.mapSize - edgeBuffer * 2);

    if (Math.abs(wx) > halfSize - edgeBuffer || Math.abs(wz) > halfSize - edgeBuffer) continue;

    const h = sampleHeight(heightmap, wx, wz);
    const scale = 0.4 + rng() * 0.8; // 0.4 to 1.2
    const rotY = rng() * Math.PI * 2;
    const rotX = (rng() - 0.5) * 0.3; // slight tilt

    mat4.makeRotationFromEuler(new THREE.Euler(rotX, rotY, 0));
    mat4.setPosition(wx, h + scale * 0.4, wz);
    mat4.scale(new THREE.Vector3(scale * 1.2, scale * 0.7, scale));
    rockMesh.setMatrixAt(rockCount, mat4);

    // Vary rock color: grey to brownish
    const shade = 0.4 + rng() * 0.25;
    rockMesh.setColorAt(rockCount, new THREE.Color(shade, shade * 0.9, shade * 0.8));
    rockCount++;
  }

  rockMesh.count = rockCount;
  rockMesh.instanceMatrix.needsUpdate = true;
  if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;

  group.add(rockMesh);

  return group;
}
