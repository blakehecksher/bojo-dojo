import * as THREE from 'three';
import type { HeightmapData } from '@bojo-dojo/common';

// Earth-tone color palette for elevation-based vertex coloring
const COLOR_LOW = new THREE.Color(0x4a7c3f);   // green valley
const COLOR_MID = new THREE.Color(0x8b7d3c);   // olive/brown mid
const COLOR_HIGH = new THREE.Color(0x9e9076);   // tan/grey ridge

/**
 * Creates a terrain mesh from a heightmap.
 * Vertices are positioned in world space centered at origin.
 */
export function createTerrainMesh(heightmap: HeightmapData): THREE.Mesh {
  const { heights, width, depth, worldWidth, worldDepth } = heightmap;

  const geometry = new THREE.PlaneGeometry(
    worldWidth,
    worldDepth,
    width - 1,
    depth - 1
  );

  // PlaneGeometry is created in XY plane — rotate to XZ (ground plane)
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const tmpColor = new THREE.Color();

  // Find height range for color mapping
  let minH = Infinity;
  let maxH = -Infinity;
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] < minH) minH = heights[i];
    if (heights[i] > maxH) maxH = heights[i];
  }
  const hRange = maxH - minH || 1;

  // Apply heights and compute vertex colors
  for (let i = 0; i < positions.count; i++) {
    // PlaneGeometry vertices are ordered row by row (x varies fastest)
    // After rotateX(-PI/2), Y is up, X is right, Z is forward
    const ix = i % width;
    const iz = Math.floor(i / width);
    const h = heights[iz * width + ix];

    // Set Y to height value
    positions.setY(i, h);

    // Color based on normalized height
    const t = (h - minH) / hRange;
    if (t < 0.4) {
      tmpColor.copy(COLOR_LOW).lerp(COLOR_MID, t / 0.4);
    } else {
      tmpColor.copy(COLOR_MID).lerp(COLOR_HIGH, (t - 0.4) / 0.6);
    }
    // Add slight random variation per vertex for visual interest
    tmpColor.r += (Math.random() - 0.5) * 0.03;
    tmpColor.g += (Math.random() - 0.5) * 0.03;
    tmpColor.b += (Math.random() - 0.5) * 0.02;

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  return mesh;
}
