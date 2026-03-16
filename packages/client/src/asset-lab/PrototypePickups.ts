import * as THREE from 'three';
import { prototypePalette } from './palette';

export function createShieldPickupPrototype(): THREE.Group {
  const group = createPedestal(prototypePalette.shieldGlow);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.38, 0),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.shield,
      emissive: prototypePalette.shield,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.72,
    })
  );
  core.position.y = 0.82;
  group.add(core);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.05, 6, 18),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.shieldGlow,
      emissive: prototypePalette.shieldGlow,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.7,
    })
  );
  halo.position.y = 0.82;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  for (let index = 0; index < 4; index++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.03),
      new THREE.MeshLambertMaterial({
        color: prototypePalette.shieldGlow,
        emissive: prototypePalette.shieldGlow,
        emissiveIntensity: 0.25,
        flatShading: true,
      })
    );
    const angle = (Math.PI / 2) * index;
    fin.position.set(Math.cos(angle) * 0.48, 0.82, Math.sin(angle) * 0.48);
    fin.lookAt(0, 0.82, 0);
    group.add(fin);
  }

  return group;
}

export function createArrowBundlePickupPrototype(): THREE.Group {
  const group = createPedestal(prototypePalette.gold);

  const quiver = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.42, 6),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.woodDark,
      flatShading: true,
    })
  );
  quiver.position.set(0, 0.55, 0);
  group.add(quiver);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.025, 5, 12),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.wrap,
      flatShading: true,
    })
  );
  band.position.set(0, 0.62, 0);
  band.rotation.x = Math.PI / 2;
  group.add(band);

  const arrowOffsets = [
    new THREE.Vector3(0, 0.86, 0),
    new THREE.Vector3(0.07, 0.83, 0.03),
    new THREE.Vector3(-0.06, 0.81, -0.02),
  ];
  const arrowRotations = [0, 0.18, -0.16];

  arrowOffsets.forEach((offset, index) => {
    const arrow = createPickupArrow();
    arrow.position.copy(offset);
    arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.z = arrowRotations[index];
    group.add(arrow);
  });

  return group;
}

export function createTeleportPickupPrototype(): THREE.Group {
  const group = createPedestal(prototypePalette.teleport);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.055, 6, 18),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.teleport,
      emissive: prototypePalette.teleport,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.82,
    })
  );
  ring.position.y = 0.72;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.teleportGlow,
      emissive: prototypePalette.teleportGlow,
      emissiveIntensity: 0.45,
      flatShading: true,
    })
  );
  crystal.position.set(0, 0.72, 0);
  group.add(crystal);

  const arrow = createPickupArrow();
  arrow.position.set(0, 0.82, 0);
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.z = Math.PI * 0.5;
  group.add(arrow);

  return group;
}

function createPedestal(accentColor: number): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.56, 0.18, 6),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.stoneDark,
      flatShading: true,
    })
  );
  group.add(base);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.42, 6),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.stoneMid,
      flatShading: true,
    })
  );
  column.position.y = 0.28;
  group.add(column);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.4, 0.08, 6),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.stoneLight,
      flatShading: true,
    })
  );
  top.position.y = 0.52;
  group.add(top);

  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.03, 5, 12),
    new THREE.MeshLambertMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.18,
      flatShading: true,
    })
  );
  accent.position.y = 0.56;
  accent.rotation.x = Math.PI / 2;
  group.add(accent);

  return group;
}

function createPickupArrow(): THREE.Group {
  const group = new THREE.Group();

  const shaftGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.44, 5);
  const tipGeometry = new THREE.ConeGeometry(0.032, 0.08, 4);

  const shaft = new THREE.Mesh(
    shaftGeometry,
    new THREE.MeshLambertMaterial({
      color: prototypePalette.wrap,
      flatShading: true,
    })
  );

  const tip = new THREE.Mesh(
    tipGeometry,
    new THREE.MeshLambertMaterial({
      color: prototypePalette.ink,
      flatShading: true,
    })
  );
  tip.position.y = 0.26;

  group.add(shaft);
  group.add(tip);

  for (let index = 0; index < 3; index++) {
    const feather = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.06, 0.04),
      new THREE.MeshLambertMaterial({
        color: prototypePalette.arrowFeather,
        flatShading: true,
      })
    );
    feather.position.set(0, -0.18, 0);
    feather.rotation.y = (Math.PI * 2 * index) / 3;
    group.add(feather);
  }

  return group;
}
