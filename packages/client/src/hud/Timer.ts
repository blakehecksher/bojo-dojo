import { PACING } from '@bojo-dojo/common';

/**
 * Round timer display — top-center.
 * Pulses red when time is low.
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
      transition: 'color 0.3s, text-shadow 0.3s',
    });

    // Inject pulse keyframe if not present
    if (!document.getElementById('timer-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'timer-pulse-style';
      style.textContent = `@keyframes timer-pulse {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.12); }
      }`;
      document.head.appendChild(style);
    }

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

    if (this.remaining <= 10) {
      this.el.style.color = '#ff4444';
      this.el.style.textShadow = '0 0 8px rgba(255, 68, 68, 0.5), 1px 1px 3px rgba(0,0,0,0.8)';
      this.el.style.animation = 'timer-pulse 0.6s ease-in-out infinite';
    } else if (this.remaining <= 15) {
      this.el.style.color = '#ff4444';
      this.el.style.textShadow = '1px 1px 3px rgba(0,0,0,0.8)';
      this.el.style.animation = 'none';
    } else {
      this.el.style.color = '#ffffff';
      this.el.style.textShadow = '1px 1px 3px rgba(0,0,0,0.8)';
      this.el.style.animation = 'none';
    }
  }

  show() { this.el.style.display = ''; }
  hide() { this.el.style.display = 'none'; }

  dispose() {
    this.stop();
    this.el.remove();
  }
}
