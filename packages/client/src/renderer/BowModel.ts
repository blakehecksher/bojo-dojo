import * as THREE from 'three';

/**
 * First-person bow model — Minecraft-style, attached to camera.
 * Wood-colored rectangular prisms for limbs, dark line for string.
 * Positioned lower-right of view. Animates string pull-back with draw force.
 */
export class BowModel {
  readonly group: THREE.Group;
  private stringLine: THREE.Line;
  private stringPositions: Float32Array;
  private topLimb: THREE.Mesh;
  private bottomLimb: THREE.Mesh;

  // Rest and drawn string anchor positions (local to group)
  private stringRestMidY = 0;
  private stringDrawnMidZ = -0.12;

  constructor(camera: THREE.Camera) {
    this.group = new THREE.Group();

    const woodColor = 0x8B5E3C;
    const darkWood = 0x5C3A1E;
    const limbMat = new THREE.MeshLambertMaterial({ color: woodColor });

    // Bow body — slight curve approximated by 3 segments
    // Central grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.12, 0.025),
      new THREE.MeshLambertMaterial({ color: darkWood })
    );
    this.group.add(grip);

    // Top limb — angled slightly forward
    this.topLimb = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.2, 0.02),
      limbMat
    );
    this.topLimb.position.set(0, 0.16, -0.01);
    this.topLimb.rotation.x = -0.15;
    this.group.add(this.topLimb);

    // Bottom limb — angled slightly forward
    this.bottomLimb = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.2, 0.02),
      limbMat
    );
    this.bottomLimb.position.set(0, -0.16, -0.01);
    this.bottomLimb.rotation.x = 0.15;
    this.group.add(this.bottomLimb);

    // String — line from top limb tip to bottom limb tip, passing through a midpoint
    this.stringPositions = new Float32Array([
      0, 0.26, -0.03,    // top anchor
      0, 0, 0,             // mid (pulled back when drawing)
      0, -0.26, -0.03,   // bottom anchor
    ]);
    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.BufferAttribute(this.stringPositions, 3));
    const stringMat = new THREE.LineBasicMaterial({ color: 0x3a2a1a, linewidth: 2 });
    this.stringLine = new THREE.Line(stringGeo, stringMat);
    this.group.add(this.stringLine);

    // Position the bow in first-person view (lower-right, Minecraft style)
    this.group.position.set(0.25, -0.18, -0.4);
    this.group.rotation.set(0, -0.1, -0.05);

    camera.add(this.group);
  }

  /**
   * Update bow draw animation.
   * @param force 0 = rest, 1 = fully drawn
   */
  setDrawForce(force: number) {
    // Pull string midpoint back toward camera
    const pullZ = this.stringDrawnMidZ * force;
    this.stringPositions[5] = pullZ; // mid-Z
    this.stringLine.geometry.attributes.position.needsUpdate = true;

    // Limbs bend inward slightly when drawn
    const bend = force * 0.12;
    this.topLimb.rotation.x = -0.15 - bend;
    this.bottomLimb.rotation.x = 0.15 + bend;
  }

  /** Show/hide the bow. */
  setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.stringLine.geometry.dispose();
  }
}
