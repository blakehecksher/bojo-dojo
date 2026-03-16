import * as THREE from 'three';
import { prototypePalette } from './palette';

export function createZoneBeaconPrototype(): THREE.Group {
  const group = new THREE.Group();

  const stoneMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.stoneDark,
    flatShading: true,
  });
  const glowMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.zoneWarning,
    emissive: prototypePalette.zoneWarning,
    emissiveIntensity: 0.35,
    flatShading: true,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.64, 0.2, 6), stoneMaterial);
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.4, 0.24), stoneMaterial);
  pillar.position.y = 0.8;
  group.add(pillar);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glowMaterial);
  crystal.position.y = 1.68;
  group.add(crystal);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.04, 6, 24),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.zoneWarning,
      emissive: prototypePalette.zoneWarning,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8,
    })
  );
  ring.position.y = 1.12;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  return group;
}

export function createDojoGatePrototype(): THREE.Group {
  const group = new THREE.Group();

  const woodMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.woodDark,
    flatShading: true,
  });
  const accentMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.bannerRed,
    flatShading: true,
  });

  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.24), woodMaterial);
  leftPost.position.set(-0.95, 1.1, 0);
  group.add(leftPost);

  const rightPost = leftPost.clone();
  rightPost.position.x = 0.95;
  group.add(rightPost);

  const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.18, 0.28), woodMaterial);
  lowerBeam.position.y = 1.96;
  group.add(lowerBeam);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 0.34), woodMaterial);
  topBeam.position.y = 2.24;
  group.add(topBeam);

  const capLeft = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.3), woodMaterial);
  capLeft.position.set(-1.12, 2.34, 0);
  group.add(capLeft);

  const capRight = capLeft.clone();
  capRight.position.x = 1.12;
  group.add(capRight);

  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.04), accentMaterial);
  tag.position.set(0, 1.66, 0.16);
  group.add(tag);

  return group;
}

export function createTargetDummyPrototype(): THREE.Group {
  const group = new THREE.Group();

  const postMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.woodMid,
    flatShading: true,
  });
  const strawMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.paper,
    flatShading: true,
  });
  const accentMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.bannerRed,
    flatShading: true,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.18, 6), postMaterial);
  group.add(base);

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), postMaterial);
  post.position.y = 0.84;
  group.add(post);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.72, 10), strawMaterial);
  torso.position.y = 1.3;
  torso.rotation.z = Math.PI / 2;
  group.add(torso);

  const bullseyeOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 20), accentMaterial);
  bullseyeOuter.position.set(0, 1.3, 0.2);
  bullseyeOuter.rotation.z = Math.PI / 2;
  group.add(bullseyeOuter);

  const bullseyeInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.uiText,
      flatShading: true,
    })
  );
  bullseyeInner.position.set(0, 1.3, 0.22);
  bullseyeInner.rotation.z = Math.PI / 2;
  group.add(bullseyeInner);

  return group;
}
