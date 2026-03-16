import * as THREE from 'three';
import { prototypePalette } from './palette';

export function createPlayerTotemPrototype(
  primaryColor: number = prototypePalette.bannerBlue,
  accentColor: number = prototypePalette.gold
): THREE.Group {
  const group = new THREE.Group();

  const stoneMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.stoneDark,
    flatShading: true,
  });
  const bodyMaterial = new THREE.MeshLambertMaterial({
    color: primaryColor,
    flatShading: true,
  });
  const accentMaterial = new THREE.MeshLambertMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.08,
    flatShading: true,
  });
  const wrapMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.wrap,
    flatShading: true,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.16, 6), stoneMaterial);
  group.add(base);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.24), stoneMaterial);
  legs.position.y = 0.34;
  group.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.74, 0.28), bodyMaterial);
  torso.position.y = 0.92;
  group.add(torso);

  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.3), accentMaterial);
  sash.position.set(0.08, 0.92, 0.02);
  sash.rotation.z = -0.16;
  group.add(sash);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.24), stoneMaterial);
  shoulders.position.y = 1.28;
  group.add(shoulders);

  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), wrapMaterial);
  head.position.y = 1.68;
  group.add(head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), stoneMaterial);
  brow.position.set(0, 1.73, 0.14);
  group.add(brow);

  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), accentMaterial);
  eyeLeft.position.set(-0.07, 1.66, 0.18);
  group.add(eyeLeft);

  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.07;
  group.add(eyeRight);

  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.34, 6), stoneMaterial);
  quiver.position.set(-0.2, 1.02, -0.12);
  quiver.rotation.z = 0.24;
  quiver.rotation.x = 0.26;
  group.add(quiver);

  const arrowOffsets = [
    new THREE.Vector3(-0.23, 1.18, -0.07),
    new THREE.Vector3(-0.18, 1.2, -0.16),
    new THREE.Vector3(-0.12, 1.16, -0.12),
  ];
  arrowOffsets.forEach((offset, index) => {
    const arrow = createBackArrow();
    arrow.position.copy(offset);
    arrow.rotation.x = -0.4;
    arrow.rotation.z = -0.22 + index * 0.08;
    group.add(arrow);
  });

  return group;
}

export function createShieldedPlayerPrototype(
  primaryColor: number = prototypePalette.bannerBlue,
  accentColor: number = prototypePalette.gold
): THREE.Group {
  const group = createPlayerTotemPrototype(primaryColor, accentColor);

  const shieldCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.82, 0),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.shield,
      emissive: prototypePalette.shield,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.26,
    })
  );
  shieldCore.position.y = 0.92;
  group.add(shieldCore);

  const shieldRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.035, 6, 18),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.shieldGlow,
      emissive: prototypePalette.shieldGlow,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.66,
    })
  );
  shieldRing.position.y = 0.92;
  shieldRing.rotation.x = Math.PI / 2;
  group.add(shieldRing);

  return group;
}

export function createVictoryMarkerPrototype(): THREE.Group {
  const group = new THREE.Group();

  const crownMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.gold,
    emissive: prototypePalette.gold,
    emissiveIntensity: 0.18,
    flatShading: true,
  });

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.08, 6), crownMaterial);
  group.add(band);

  for (let index = 0; index < 5; index++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), crownMaterial);
    const angle = (Math.PI * 2 * index) / 5;
    spike.position.set(Math.cos(angle) * 0.2, 0.12, Math.sin(angle) * 0.2);
    spike.lookAt(0, 0.42, 0);
    group.add(spike);
  }

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.teleportGlow,
      emissive: prototypePalette.teleportGlow,
      emissiveIntensity: 0.3,
      flatShading: true,
    })
  );
  gem.position.y = 0.3;
  group.add(gem);

  return group;
}

function createBackArrow(): THREE.Group {
  const group = new THREE.Group();

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.3, 5),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.paper,
      flatShading: true,
    })
  );
  group.add(shaft);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.024, 0.06, 4),
    new THREE.MeshLambertMaterial({
      color: prototypePalette.ink,
      flatShading: true,
    })
  );
  tip.position.y = 0.18;
  group.add(tip);

  return group;
}

