import * as THREE from 'three';
import { prototypePalette } from './palette';

export interface PrototypeBowRig {
  group: THREE.Group;
  setDrawAmount(amount: number): void;
}

export function createPrototypeBow(): PrototypeBowRig {
  const group = new THREE.Group();

  const darkWood = new THREE.MeshLambertMaterial({
    color: prototypePalette.woodDark,
    flatShading: true,
  });
  const midWood = new THREE.MeshLambertMaterial({
    color: prototypePalette.woodMid,
    flatShading: true,
  });
  const lightWood = new THREE.MeshLambertMaterial({
    color: prototypePalette.woodLight,
    flatShading: true,
  });
  const wrapMaterial = new THREE.MeshLambertMaterial({
    color: prototypePalette.wrap,
    flatShading: true,
  });
  const stringMaterial = new THREE.LineBasicMaterial({ color: prototypePalette.ink });

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.035), darkWood);
  group.add(grip);

  const gripWrap = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.08, 0.038), wrapMaterial);
  group.add(gripWrap);

  const topInner = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.16, 0.026), midWood);
  topInner.position.set(0, 0.1, -0.006);
  group.add(topInner);

  const topOuter = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.02), lightWood);
  topOuter.position.set(0, 0.25, -0.03);
  group.add(topOuter);

  const bottomInner = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.16, 0.026), midWood);
  bottomInner.position.set(0, -0.1, -0.006);
  group.add(bottomInner);

  const bottomOuter = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.02), lightWood);
  bottomOuter.position.set(0, -0.25, -0.03);
  group.add(bottomOuter);

  const charm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.012), wrapMaterial);
  charm.position.set(-0.012, -0.12, 0.03);
  group.add(charm);

  const stringPositions = new Float32Array([
    0, 0.33, -0.05,
    0, 0, -0.01,
    0, -0.33, -0.05,
  ]);
  const stringGeometry = new THREE.BufferGeometry();
  stringGeometry.setAttribute('position', new THREE.BufferAttribute(stringPositions, 3));
  const string = new THREE.Line(stringGeometry, stringMaterial);
  group.add(string);

  const guideArrow = createGuideArrow();
  guideArrow.position.set(0.008, 0, -0.025);
  group.add(guideArrow);

  group.position.set(0.29, -0.18, -0.45);
  group.rotation.set(0.05, -0.14, -0.06);

  const setDrawAmount = (amount: number) => {
    const clamped = THREE.MathUtils.clamp(amount, 0, 1);
    const bend = clamped * 0.12;

    topInner.rotation.x = -0.14 - bend;
    topOuter.rotation.x = -0.3 - bend * 1.2;
    bottomInner.rotation.x = 0.14 + bend;
    bottomOuter.rotation.x = 0.3 + bend * 1.2;

    stringPositions[5] = THREE.MathUtils.lerp(-0.01, -0.2, clamped);
    string.geometry.attributes.position.needsUpdate = true;

    guideArrow.position.x = THREE.MathUtils.lerp(0.008, 0.016, clamped);
    guideArrow.position.z = THREE.MathUtils.lerp(-0.025, -0.18, clamped);
    guideArrow.rotation.z = THREE.MathUtils.lerp(0.01, 0.035, clamped);

    group.rotation.z = THREE.MathUtils.lerp(-0.06, -0.11, clamped);
  };

  setDrawAmount(0);

  return { group, setDrawAmount };
}

function createGuideArrow(): THREE.Group {
  const group = new THREE.Group();

  const shaftGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5);
  shaftGeometry.rotateX(Math.PI / 2);

  const tipGeometry = new THREE.ConeGeometry(0.03, 0.08, 4);
  tipGeometry.rotateX(-Math.PI / 2);
  tipGeometry.translate(0, 0, 0.25);

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

  group.add(shaft);
  group.add(tip);

  for (let index = 0; index < 3; index++) {
    const feather = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.055, 0.05),
      new THREE.MeshLambertMaterial({
        color: prototypePalette.arrowFeather,
        flatShading: true,
      })
    );
    feather.position.set(0, 0, -0.16);
    feather.rotation.z = (Math.PI * 2 * index) / 3;
    group.add(feather);
  }

  return group;
}
