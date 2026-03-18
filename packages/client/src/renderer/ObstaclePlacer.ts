import * as THREE from 'three';
import type { ObstacleLayout } from '@bojo-dojo/common';

function createTreeGeometry(): { trunk: THREE.CylinderGeometry; canopy: THREE.ConeGeometry } {
  return {
    trunk: new THREE.CylinderGeometry(0.15, 0.2, 1.5, 5),
    canopy: new THREE.ConeGeometry(1.2, 2.5, 6),
  };
}

function createRockGeometry(): THREE.DodecahedronGeometry {
  return new THREE.DodecahedronGeometry(1, 0);
}

export function placeObstacles(layout: ObstacleLayout): THREE.Group {
  const group = new THREE.Group();
  const treeGeo = createTreeGeometry();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e, flatShading: true });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2d6b30, flatShading: true });
  const rockGeo = createRockGeometry();
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x808080, flatShading: true });

  const trunkMesh = new THREE.InstancedMesh(treeGeo.trunk, trunkMat, Math.max(1, layout.trees.length));
  const canopyMesh = new THREE.InstancedMesh(treeGeo.canopy, canopyMat, Math.max(1, layout.trees.length));
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, layout.rocks.length));
  const mat4 = new THREE.Matrix4();

  layout.trees.forEach((tree, index) => {
    const hs = tree.heightScale ?? tree.scale;
    mat4.makeRotationY(tree.rotation);
    mat4.setPosition(tree.x, tree.y + 0.75 * hs, tree.z);
    mat4.scale(new THREE.Vector3(tree.scale, hs, tree.scale));
    trunkMesh.setMatrixAt(index, mat4);

    mat4.makeRotationY(tree.rotation);
    mat4.setPosition(tree.x, tree.y + 2.5 * hs, tree.z);
    mat4.scale(new THREE.Vector3(tree.scale, hs, tree.scale));
    canopyMesh.setMatrixAt(index, mat4);

    const green = 0.42 + (index % 5) * 0.03;
    canopyMesh.setColorAt(index, new THREE.Color(0.18, green, 0.19));
  });

  trunkMesh.count = layout.trees.length;
  canopyMesh.count = layout.trees.length;
  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
  trunkMesh.castShadow = true;
  canopyMesh.castShadow = true;
  canopyMesh.receiveShadow = true;

  layout.rocks.forEach((rock, index) => {
    mat4.makeRotationFromEuler(new THREE.Euler(rock.tiltX ?? 0, rock.rotation, 0));
    mat4.setPosition(rock.x, rock.y + rock.scale * 0.4, rock.z);
    mat4.scale(new THREE.Vector3(rock.scale * 1.2, rock.scale * 0.7, rock.scale));
    rockMesh.setMatrixAt(index, mat4);

    const shade = 0.4 + (index % 4) * 0.06;
    rockMesh.setColorAt(index, new THREE.Color(shade, shade * 0.9, shade * 0.8));
  });

  rockMesh.count = layout.rocks.length;
  rockMesh.instanceMatrix.needsUpdate = true;
  if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;

  group.add(trunkMesh);
  group.add(canopyMesh);
  group.add(rockMesh);

  return group;
}
