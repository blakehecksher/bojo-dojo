import * as THREE from 'three';
import { INPUT } from '@bojo-dojo/common';
import type { InputHandler } from './InputManager';

const DEG2RAD = Math.PI / 180;

export class SwipeCamera implements InputHandler {
  name = 'swipe-camera';

  private yaw = 0;
  private pitch = 0;
  private lastX = 0;
  private lastY = 0;
  private sensitivity = INPUT.SWIPE_SENSITIVITY * DEG2RAD;
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private enabled = true;
  private forcedPitchOffset = 0;

  // --- Screen shake (impact / recoil juice) ---
  private trauma = 0;          // 0..1, decays over time
  private shakePitch = 0;
  private shakeYaw = 0;
  private shakeRoll = 0;

  constructor(private camera: THREE.Camera) {}

  /** Add screen-shake energy. amount ~0.2 = light recoil, ~0.7 = heavy hit. */
  addTrauma(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Advance shake decay and recompute shake offsets. Call every frame. */
  updateShake(dt: number) {
    if (this.trauma <= 0) {
      if (this.shakePitch !== 0 || this.shakeYaw !== 0 || this.shakeRoll !== 0) {
        this.shakePitch = this.shakeYaw = this.shakeRoll = 0;
        this.applyToCamera();
      }
      return;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    // Shake magnitude scales with trauma^2 for a punchy, fast-settling feel.
    const mag = this.trauma * this.trauma;
    this.shakePitch = (Math.random() * 2 - 1) * mag * 0.06;
    this.shakeYaw = (Math.random() * 2 - 1) * mag * 0.05;
    this.shakeRoll = (Math.random() * 2 - 1) * mag * 0.10;
    this.applyToCamera();
  }

  hitTest(_x: number, _y: number): boolean {
    return true;
  }

  onPointerDown(e: PointerEvent) {
    if (!this.enabled) return;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onPointerMove(e: PointerEvent) {
    if (!this.enabled) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    this.applyToCamera();
  }

  onPointerUp(_e: PointerEvent) {
    // Precise stop on release.
  }

  applyDelta(dyaw: number, dpitch: number) {
    if (!this.enabled) return;
    this.yaw += dyaw;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch + dpitch));
    this.applyToCamera();
  }

  update() {
    // Reserved for compatibility with the game loop.
  }

  getAngles() {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  setLook(yaw: number, pitch: number) {
    this.yaw = yaw;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    this.applyToCamera();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setForcedPitchOffset(offset: number) {
    this.forcedPitchOffset = offset;
    this.applyToCamera();
  }

  private applyToCamera() {
    this.euler.set(
      this.pitch + this.forcedPitchOffset + this.shakePitch,
      this.yaw + this.shakeYaw,
      this.shakeRoll,
      'YXZ',
    );
    this.camera.quaternion.setFromEuler(this.euler);
  }
}
