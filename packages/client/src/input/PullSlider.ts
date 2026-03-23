import { INPUT } from '@bojo-dojo/common';
import type { InputHandler } from './InputManager';

export type PullSliderCallback = (force: number) => void;

/**
 * Pull slider — right side of screen.
 * A visible handle sits at the top of a track. Drag it down to draw the bow.
 * Release to fire. Top 20% of travel = cancel zone (too light a pull).
 */
export class PullSlider implements InputHandler {
  name = 'pull-slider';

  /** Current draw force 0..1. 0 = not drawing. */
  force = 0;

  private container: HTMLDivElement;
  private track: HTMLDivElement;
  private fill: HTMLDivElement;
  private handle: HTMLDivElement;
  private cancelLine: HTMLDivElement;

  private activePointer: number | null = null;
  private trackTop = 0;
  private trackHeight = 0;

  private onDrawStart?: () => void;
  private onDrawChange?: PullSliderCallback;
  private onFire?: PullSliderCallback;
  private onCancel?: () => void;

  // Hit zone
  private zoneLeft = 0;

  constructor(private hudElement: HTMLElement) {
    // Container — right side, vertically centered
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '48px',
      height: '220px',
      pointerEvents: 'none',
      zIndex: '10',
    });

    // Track background
    this.track = document.createElement('div');
    Object.assign(this.track.style, {
      position: 'absolute',
      width: '10px',
      height: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: '5px',
      background: 'rgba(255, 255, 255, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    });
    this.container.appendChild(this.track);

    // Cancel zone line (top 20% — light pull = cancel)
    this.cancelLine = document.createElement('div');
    Object.assign(this.cancelLine.style, {
      position: 'absolute',
      width: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      top: '20%',
      height: '0',
      borderTop: '1px dashed rgba(255, 100, 100, 0.35)',
    });
    this.container.appendChild(this.cancelLine);

    // Fill (shows draw amount — fills from top down as handle is pulled)
    this.fill = document.createElement('div');
    Object.assign(this.fill.style, {
      position: 'absolute',
      width: '10px',
      height: '0%',
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: '5px',
      background: 'rgba(255, 200, 50, 0.5)',
    });
    this.container.appendChild(this.fill);

    // Handle — always visible at top of track, grab and pull down
    this.handle = document.createElement('div');
    Object.assign(this.handle.style, {
      position: 'absolute',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.35)',
      border: '2px solid rgba(255, 255, 255, 0.6)',
      left: '50%',
      top: '0',
      transform: 'translate(-50%, -50%)',
      transition: 'box-shadow 0.15s, background 0.15s',
    });
    this.container.appendChild(this.handle);

    // Arrow icon inside handle — visual cue to pull down
    const arrow = document.createElement('div');
    Object.assign(arrow.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '0',
      height: '0',
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: '8px solid rgba(255, 255, 255, 0.7)',
    });
    this.handle.appendChild(arrow);

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
    // Measure track position for accurate mapping
    const rect = this.container.getBoundingClientRect();
    this.trackTop = rect.top;
    this.trackHeight = rect.height;
    this.force = 0;
    // Highlight handle as active
    this.handle.style.background = 'rgba(255, 255, 255, 0.55)';
    this.onDrawStart?.();
  }

  onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this.activePointer) return;

    // Map pointer Y to force: top of track = 0, bottom = 1
    const relY = e.clientY - this.trackTop;
    const raw = Math.max(0, Math.min(1, relY / this.trackHeight));
    this.force = raw;

    // Fill from top down
    this.fill.style.height = `${raw * 100}%`;

    // Color shifts from yellow to red at high draw
    const r = 255;
    const g = Math.round(200 * (1 - raw * 0.6));
    const b = Math.round(50 * (1 - raw));
    this.fill.style.background = `rgba(${r}, ${g}, ${b}, 0.5)`;

    // Move handle to match pointer
    this.handle.style.top = `${raw * 100}%`;

    // Glow at high force
    this.handle.style.boxShadow = raw > 0.4
      ? `0 0 ${6 + raw * 14}px rgba(${r}, ${g}, ${b}, ${raw * 0.5})`
      : 'none';

    this.onDrawChange?.(raw);
  }

  onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.activePointer) return;

    const fireForce = this.force;
    const inCancelZone = fireForce < INPUT.PULL_SLIDER_CANCEL_ZONE;

    // Reset — snap handle back to top
    this.activePointer = null;
    this.force = 0;
    this.fill.style.height = '0%';
    this.handle.style.top = '0';
    this.handle.style.background = 'rgba(255, 255, 255, 0.35)';
    this.handle.style.boxShadow = 'none';

    if (inCancelZone) {
      this.onCancel?.();
    } else {
      this.onFire?.(fireForce);
    }
  }

  setVisible(visible: boolean) {
    this.container.style.display = visible ? '' : 'none';
  }

  dispose() {
    window.removeEventListener('resize', this.updateZone);
    this.container.remove();
  }
}
