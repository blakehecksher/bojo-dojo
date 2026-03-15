import { PACING } from '@bojo-dojo/common';

/**
 * Round timer display — top-center.
 */
export class Timer {
  private el: HTMLDivElement;
  private remaining: number;
  private intervalId: number | null = null;

  constructor(parent: HTMLElement) {
    this.remaining = PACING.BASE_ROUND_TIME;

    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '22px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
    });
    this.render();
    parent.appendChild(this.el);
  }

  /** Start the countdown timer. */
  start(seconds?: number) {
    if (seconds !== undefined) this.remaining = seconds;
    this.stop();
    this.intervalId = window.setInterval(() => {
      this.remaining = Math.max(0, this.remaining - 1);
      this.render();
    }, 1000);
  }

  /** Stop the timer without resetting. */
  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Set remaining seconds (e.g., from server TIMER_SYNC). */
  sync(seconds: number) {
    this.remaining = Math.max(0, seconds);
    this.render();
  }

  private render() {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    this.el.textContent = `${m}:${String(s).padStart(2, '0')}`;

    // Flash red when low
    if (this.remaining <= 15) {
      this.el.style.color = '#ff4444';
    } else {
      this.el.style.color = '#ffffff';
    }
  }

  dispose() {
    this.stop();
    this.el.remove();
  }
}
