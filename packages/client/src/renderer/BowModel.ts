import * as THREE from 'three';

/**
 * First-person bow model — Minecraft-style, attached to camera.
 * Chunky wood limbs with dark grip and visible string.
 * Positioned lower-right of view. Animates string pull-back with draw force.
 * Includes idle sway and recoil on fire.
 */
export class BowModel {
  readonly group: THREE.Group;
  private stringLine: THREE.Line;
  private stringPositions: Float32Array;
  private topLimb: THREE.Mesh;
  private bottomLimb: THREE.Mesh;

  // Rest and drawn string anchor positions (local to group)
  private stringDrawnMidZ = 0.12; // positive Z = toward player

  // Idle sway
  private swayTime = 0;
  private readonly restPos = new THREE.Vector3(0.28, -0.15, -0.45);
  private readonly restRot = new THREE.Euler(0, -0.1, -0.05);

  // Recoil
  private recoilProgress = 1; // 1 = no recoil, 0 = peak recoil
  private static readonly RECOIL_DURATION = 0.35;

  private onResize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    // In portrait (aspect < 1), pull the bow inward so it stays on screen
    this.restPos.x = aspect < 1 ? 0.12 : 0.28;
    this.restPos.y = aspect < 1 ? -0.22 : -0.15;
  };

  constructor(camera: THREE.Camera) {
    this.group = new THREE.Group();
    // Render on top of all scene geometry (standard FPS viewmodel technique)
    this.group.renderOrder = 999;

    const woodColor = 0x8B5E3C;
    const darkWood = 0x5C3A1E;
    // depthTest: false ensures the bow is never occluded by terrain/objects
    const limbMat = new THREE.MeshLambertMaterial({ color: woodColor, depthTest: false });

    // Central grip — chunky rectangular block
    const gripMat = new THREE.MeshLambertMaterial({ color: darkWood, depthTest: false });
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.14, 0.06),
      gripMat
    );
    grip.frustumCulled = false;
    grip.renderOrder = 999;
    this.group.add(grip);

    // Top limb — wide enough to be clearly visible on mobile
    this.topLimb = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.04),
      limbMat
    );
    this.topLimb.position.set(0, 0.18, -0.02);
    this.topLimb.rotation.x = 0.12;
    this.topLimb.frustumCulled = false;
    this.topLimb.renderOrder = 999;
    this.group.add(this.topLimb);

    // Bottom limb
    this.bottomLimb = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.04),
      limbMat
    );
    this.bottomLimb.position.set(0, -0.18, -0.02);
    this.bottomLimb.rotation.x = -0.12;
    this.bottomLimb.frustumCulled = false;
    this.bottomLimb.renderOrder = 999;
    this.group.add(this.bottomLimb);

    // Limb tips — small dark wood caps
    const tipMat = new THREE.MeshLambertMaterial({ color: darkWood, depthTest: false });
    const topTip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.035), tipMat);
    topTip.position.set(0, 0.12, 0); // centered on limb end
    topTip.frustumCulled = false;
    topTip.renderOrder = 999;
    this.topLimb.add(topTip);

    const bottomTip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.035), tipMat);
    bottomTip.position.set(0, -0.12, 0); // centered on limb end
    bottomTip.frustumCulled = false;
    bottomTip.renderOrder = 999;
    this.bottomLimb.add(bottomTip);

    // String — line from top limb tip to bottom limb tip, passing through a midpoint
    this.stringPositions = new Float32Array([
      0, 0.3, 0.03,     // top anchor (player-facing side)
      0, 0, 0,           // mid (pulls toward player when drawing)
      0, -0.3, 0.03,    // bottom anchor (player-facing side)
    ]);
    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.BufferAttribute(this.stringPositions, 3));
    const stringMat = new THREE.LineBasicMaterial({ color: 0x2a1a0a, linewidth: 2, depthTest: false });
    this.stringLine = new THREE.Line(stringGeo, stringMat);
    this.stringLine.frustumCulled = false;
    this.stringLine.renderOrder = 999;
    this.group.add(this.stringLine);

    // Position the bow in first-person view (lower-right, Minecraft style)
    this.onResize(); // set initial position based on current aspect ratio
    this.group.position.copy(this.restPos);
    this.group.rotation.copy(this.restRot);

    camera.add(this.group);
    window.addEventListener('resize', this.onResize);
  }

  /**
   * Update bow draw animation.
   * @param force 0 = rest, 1 = fully drawn
   */
  setDrawForce(force: number) {
    const pullZ = this.stringDrawnMidZ * force;
    this.stringPositions[5] = pullZ;
    this.stringLine.geometry.attributes.position.needsUpdate = true;

    // On draw, limb tips bend further toward the player (same direction as string pull)
    const bend = force * 0.20;
    this.topLimb.rotation.x = 0.12 + bend;
    this.bottomLimb.rotation.x = -0.12 - bend;
  }

  /** Trigger recoil animation (call on arrow fire). */
  fireRecoil() {
    this.recoilProgress = 0;
  }

  /** Per-frame update: idle sway + recoil recovery. */
  update(dt: number) {
    this.swayTime += dt;

    // Idle sway — gentle figure-eight
    const swayX = Math.sin(this.swayTime * 1.1) * 0.003;
    const swayY = Math.sin(this.swayTime * 0.8) * 0.002;

    // Recoil — quick upward kick then ease back
    let recoilY = 0;
    let recoilZ = 0;
    let recoilRotX = 0;
    if (this.recoilProgress < 1) {
      this.recoilProgress = Math.min(1, this.recoilProgress + dt / BowModel.RECOIL_DURATION);
      const t = this.recoilProgress;
      const ease = 1 - (1 - t) * (1 - t) * (1 - t);
      recoilY = 0.04 * (1 - ease);
      recoilZ = 0.03 * (1 - ease);
      recoilRotX = -0.15 * (1 - ease);
    }

    this.group.position.set(
      this.restPos.x + swayX,
      this.restPos.y + swayY + recoilY,
      this.restPos.z + recoilZ,
    );
    this.group.rotation.set(
      this.restRot.x + recoilRotX,
      this.restRot.y,
      this.restRot.z,
    );
  }

  /** Show/hide the bow. */
  setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.group.parent?.remove(this.group);
    this.stringLine.geometry.dispose();
  }
}
