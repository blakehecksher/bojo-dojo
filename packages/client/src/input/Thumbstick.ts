import { INPUT } from '@bojo-dojo/common';
import type { InputHandler } from './InputManager';

const STICK_RADIUS = 70;     // px — functional radius (touch travel distance)
const VISUAL_RADIUS = 56;   // px — visible outer ring radius
const KNOB_RADIUS = 22;      // px — inner knob radius
const DEAD_ZONE = INPUT.THUMBSTICK_DEAD_ZONE; // fraction

/**
 * Virtual thumbstick for fine aim.
 * Positioned at bottom-left of screen.
 * Outputs normalized (dx, dy) in [-1, 1] with dead zone applied.
 */
export class Thumbstick implements InputHandler {
  name = 'thumbstick';

  // Current normalized output
  dx = 0;
  dy = 0;

  private container: HTMLDivElement;
  private knob: HTMLDivElement;
  private activePointer: number | null = null;
  private centerX = 0;
  private centerY = 0;

  // Hit zone (bottom-left quarter of screen)
  private zoneRight = 0;
  private zoneTop = 0;

  constructor(private hudElement: HTMLElement) {
    // Container (outer ring)
    this.container = document.createElement('div');
    const visualOffset = STICK_RADIUS - VISUAL_RADIUS;
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: `${50 + visualOffset}px`,
      left: `${18 + visualOffset}px`,
      width: `${VISUAL_RADIUS * 2}px`,
      height: `${VISUAL_RADIUS * 2}px`,
      borderRadius: '50%',
      border: '2px solid rgba(255, 255, 255, 0.4)',
      background: 'rgba(255, 255, 255, 0.08)',
      pointerEvents: 'none',
      zIndex: '10',
    });

    // Knob (inner circle)
    this.knob = document.createElement('div');
    Object.assign(this.knob.style, {
      position: 'absolute',
      width: `${KNOB_RADIUS * 2}px`,
      height: `${KNOB_RADIUS * 2}px`,
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.5)',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    });
    this.container.appendChild(this.knob);
    hudElement.appendChild(this.container);

    this.updateZone();
    window.addEventListener('resize', this.updateZone);
  }

  private updateZone = () => {
    // Hit zone: tight area around stick (bottom-left corner)
    this.zoneRight = window.innerWidth * 0.25;
    this.zoneTop = window.innerHeight * 0.60;
  };

  hitTest(x: number, y: number): boolean {
    return x < this.zoneRight && y > this.zoneTop;
  }

  onPointerDown(e: PointerEvent) {
    this.activePointer = e.pointerId;
    const rect = this.container.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.updateStick(e.clientX, e.clientY);
  }

  onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this.activePointer) return;
    this.updateStick(e.clientX, e.clientY);
  }

  onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.dx = 0;
    this.dy = 0;
    // Smooth snap-back with overshoot
    this.knob.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.knob.style.transform = 'translate(-50%, -50%)';
    setTimeout(() => { this.knob.style.transition = 'none'; }, 200);
  }

  private updateStick(px: number, py: number) {
    let offX = px - this.centerX;
    let offY = py - this.centerY;

    // Clamp to circle
    const dist = Math.sqrt(offX * offX + offY * offY);
    const maxDist = STICK_RADIUS;
    if (dist > maxDist) {
      offX = (offX / dist) * maxDist;
      offY = (offY / dist) * maxDist;
    }

    // Normalized [-1, 1]
    const nx = offX / maxDist;
    const ny = offY / maxDist;

    // Apply dead zone
    const mag = Math.sqrt(nx * nx + ny * ny);
    if (mag < DEAD_ZONE) {
      this.dx = 0;
      this.dy = 0;
    } else {
      // Rescale so output starts at 0 right after dead zone
      const scale = (mag - DEAD_ZONE) / (1 - DEAD_ZONE) / mag;
      let outX = nx * scale;
      let outY = ny * scale;

      // Weight cardinal directions: reduce diagonal movement while keeping
      // cardinal (up/down/left/right) at full speed.
      // cardinality = 1 when perfectly cardinal, 0 when at 45 degrees
      const ax = Math.abs(outX);
      const ay = Math.abs(outY);
      const maxAx = Math.max(ax, ay);
      if (maxAx > 0.001) {
        const cardinality = Math.abs(ax - ay) / maxAx; // 0 = diagonal, 1 = cardinal
        const diagonalDampen = 0.55 + 0.45 * cardinality; // 0.55 at diagonal, 1.0 at cardinal
        outX *= diagonalDampen;
        outY *= diagonalDampen;
      }

      this.dx = outX;
      this.dy = outY;
    }

    // Move knob visual — scale to fit within smaller visual ring
    const visualScale = VISUAL_RADIUS / STICK_RADIUS;
    const visualX = offX * visualScale;
    const visualY = offY * visualScale;
    this.knob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
  }

  setVisible(visible: boolean) {
    this.container.style.display = visible ? '' : 'none';
  }

  dispose() {
    window.removeEventListener('resize', this.updateZone);
    this.container.remove();
  }
}
