import { INPUT } from '@bojo-dojo/common';
import type { InputHandler } from './InputManager';

export type PullSliderCallback = (force: number) => void;

/**
 * Pull slider — right side of screen.
 * Drag down to draw bow, release to fire.
 * Bottom 20% of slider travel = cancel zone (no fire on release).
 */
export class PullSlider implements InputHandler {
  name = 'pull-slider';

  /** Current draw force 0..1. 0 = not drawing. */
  force = 0;

  private container: HTMLDivElement;
  private track: HTMLDivElement;
  private fill: HTMLDivElement;
  private handle: HTMLDivElement;

  private activePointer: number | null = null;
  private startY = 0;

  private onDrawStart?: () => void;
  private onDrawChange?: PullSliderCallback;
  private onFire?: PullSliderCallback;
  private onCancel?: () => void;

  // Hit zone
  private zoneLeft = 0;

  constructor(private hudElement: HTMLElement) {
    // Container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      right: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '40px',
      height: '200px',
      pointerEvents: 'none',
      zIndex: '10',
    });

    // Track background
    this.track = document.createElement('div');
    Object.assign(this.track.style, {
      position: 'absolute',
      width: '8px',
      height: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: '4px',
      background: 'rgba(255, 255, 255, 0.2)',
    });
    this.container.appendChild(this.track);

    // Fill (shows draw amount, fills from bottom up)
    this.fill = document.createElement('div');
    Object.assign(this.fill.style, {
      position: 'absolute',
      width: '8px',
      height: '0%',
      bottom: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: '4px',
      background: 'rgba(255, 200, 50, 0.6)',
      transition: 'none',
    });
    this.container.appendChild(this.fill);

    // Cancel zone indicator (bottom 20%)
    const cancelZone = document.createElement('div');
    Object.assign(cancelZone.style, {
      position: 'absolute',
      width: '100%',
      height: '20%',
      bottom: '0',
      borderRadius: '0 0 4px 4px',
      borderTop: '1px dashed rgba(255, 100, 100, 0.4)',
    });
    this.container.appendChild(cancelZone);

    // Handle
    this.handle = document.createElement('div');
    Object.assign(this.handle.style, {
      position: 'absolute',
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.5)',
      border: '2px solid rgba(255, 255, 255, 0.7)',
      left: '50%',
      top: '0',
      transform: 'translate(-50%, -50%)',
      display: 'none',
    });
    this.container.appendChild(this.handle);

    hudElement.appendChild(this.container);

    this.updateZone();
    window.addEventListener('resize', this.updateZone);
  }

  /** Set callbacks for pull slider events. */
  on(events: {
    onDrawStart?: () => void;
    onDrawChange?: PullSliderCallback;
    onFire?: PullSliderCallback;
    onCancel?: () => void;
  }) {
    this.onDrawStart = events.onDrawStart;
    this.onDrawChange = events.onDrawChange;
    this.onFire = events.onFire;
    this.onCancel = events.onCancel;
  }

  private updateZone = () => {
    // Hit zone: right 25% of screen
    this.zoneLeft = window.innerWidth * 0.75;
  };

  hitTest(x: number, _y: number): boolean {
    return x > this.zoneLeft;
  }

  onPointerDown(e: PointerEvent) {
    this.activePointer = e.pointerId;
    this.startY = e.clientY;
    this.force = 0;
    this.handle.style.display = 'block';
    this.onDrawStart?.();
  }

  onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this.activePointer) return;

    // Drag downward = increase draw force
    const dy = e.clientY - this.startY;
    const raw = Math.max(0, Math.min(1, dy / INPUT.PULL_SLIDER_RANGE));
    this.force = raw;

    // Update visuals
    this.fill.style.height = `${raw * 100}%`;
    // Color shifts from yellow to red at high draw
    const r = Math.round(255);
    const g = Math.round(200 * (1 - raw * 0.6));
    const b = Math.round(50 * (1 - raw));
    this.fill.style.background = `rgba(${r}, ${g}, ${b}, 0.6)`;

    // Position handle
    const trackRect = this.container.getBoundingClientRect();
    const handleY = trackRect.height * (1 - raw);
    this.handle.style.top = `${handleY}px`;

    this.onDrawChange?.(raw);
  }

  onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.activePointer) return;

    const fireForce = this.force;
    const inCancelZone = fireForce < INPUT.PULL_SLIDER_CANCEL_ZONE;

    // Reset
    this.activePointer = null;
    this.force = 0;
    this.fill.style.height = '0%';
    this.handle.style.display = 'none';

    if (inCancelZone) {
      this.onCancel?.();
    } else {
      this.onFire?.(fireForce);
    }
  }

  dispose() {
    window.removeEventListener('resize', this.updateZone);
    this.container.remove();
  }
}
