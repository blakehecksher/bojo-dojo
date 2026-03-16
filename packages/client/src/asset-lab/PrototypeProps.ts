import * as THREE from 'three';
import { prototypePalette } from './palette';

export function createTreePrototype(): THREE.Group {
  const group = new THREE.Group();

  const trunkMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.woodDark,
    flatShading: true,
  });
  const leafMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.leafMid,
    flatShading: true,
  });
  const leafLightMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.leafLight,
    flatShading: true,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.9, 6), trunkMaterial);
  trunk.position.y = 0.95;
  group.add(trunk);

  const canopyLow = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.45, 7), leafMaterial);
  canopyLow.position.y = 2.0;
  group.add(canopyLow);

  const canopyMid = new THREE.Mesh(new THREE.ConeGeometry(0.76, 1.2, 7), leafLightMaterial);
  canopyMid.position.y = 2.62;
  group.add(canopyMid);

  const canopyTop = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 7), leafMaterial);
  canopyTop.position.y = 3.18;
  group.add(canopyTop);

  return group;
}

export function createBoulderClusterPrototype(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({
    color: prototypePalette.stoneMid,
    flatShading: true,
  });

  const positions = [
    new THREE.Vector3(0, 0.36, 0),
    new THREE.Vector3(0.48, 0.22, 0.08),
    new THREE.Vector3(-0.42, 0.18, -0.2),
    new THREE.Vector3(0.08, 0.14, -0.44),
  ];
  const scales = [
    new THREE.Vector3(1.2, 0.9, 1.1),
    new THREE.Vector3(0.7, 0.6, 0.65),
    new THREE.Vector3(0.8, 0.55, 0.7),
    new THREE.Vector3(0.55, 0.42, 0.5),
  ];

  positions.forEach((position, index) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), material);
    rock.position.copy(position);
    rock.scale.copy(scales[index]);
    rock.rotation.set(index * 0.18, index * 0.46, index * 0.12);
    group.add(rock);
  });

  return group;
}

export function createStoneLanternPrototype(): THREE.Group {
  const group = new THREE.Group();

  const stoneDark = new THREE.MeshLambertMaterial({
    color: prototypePalette.stoneDark,
    flatShading: true,
  });
  const stoneLight = new THREE.MeshLambertMaterial({
    color: prototypePalette.stoneLight,
    flatShading: true,
  });
  const glowMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.ember,
    emissive: prototypePalette.ember,
    emissiveIntensity: 0.35,
    flatShading: true,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.14, 6), stoneDark);
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), stoneLight);
  pillar.position.y = 0.52;
  group.add(pillar);

  const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.46), stoneDark);
  chamber.position.y = 1.12;
  group.add(chamber);

  const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), glowMaterial);
  windowGlow.position.y = 1.12;
  group.add(windowGlow);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 4), stoneLight);
  roof.position.y = 1.44;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  return group;
}

export function createSpawnTotemPrototype(bannerColor = prototypePalette.bannerBlue): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.6, 0.18, 6),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.stoneDark,
      flatShading: true,
    })
  );
  group.add(base);

  const column = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 1.3, 0.22),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.stoneMid,
      flatShading: true,
    })
  );
  column.position.y = 0.74;
  group.add(column);

  const crest = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.gold,
      emissive: prototypePalette.gold,
      emissiveIntensity: 0.16,
      flatShading: true,
    })
  );
  crest.position.y = 1.56;
  group.add(crest);

  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.6, 0.42),
    new THREE.MeshLambertMaterial({
      color: bannerColor,
      flatShading: true,
    })
  );
  banner.position.set(0.2, 1.0, 0);
  group.add(banner);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.03, 5, 16),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.teleportGlow,
      emissive: prototypePalette.teleportGlow,
      emissiveIntensity: 0.24,
      flatShading: true,
    })
  );
  halo.position.y = 1.56;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  return group;
}
