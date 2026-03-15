import * as THREE from 'three';
import { INPUT } from '@bojo-dojo/common';
import type { InputHandler } from './InputManager';

const DEG2RAD = Math.PI / 180;

/**
 * Swipe-to-look camera controller.
 * Implements InputHandler — registered as lowest priority so it catches
 * any pointer not claimed by thumbstick or pull slider.
 * Full 360 horizontal, +/-90 vertical.
 */
export class SwipeCamera implements InputHandler {
  name = 'swipe-camera';

  private yaw = 0;
  private pitch = 0;
  private lastX = 0;
  private lastY = 0;
  private sensitivity = INPUT.SWIPE_SENSITIVITY * DEG2RAD;
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(private camera: THREE.Camera) {}

  /** Always accepts — this is the fallback handler. */
  hitTest(_x: number, _y: number): boolean {
    return true;
  }

  onPointerDown(e: PointerEvent) {
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onPointerMove(e: PointerEvent) {
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
    // nothing to do
  }

  /** Apply a fine-aim delta (from thumbstick), in radians per frame. */
  applyDelta(dyaw: number, dpitch: number) {
    this.yaw += dyaw;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch + dpitch));
    this.applyToCamera();
  }

  private applyToCamera() {
    this.euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
  }
}
