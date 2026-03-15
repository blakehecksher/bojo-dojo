import { PACING } from '@bojo-dojo/common';

export type RoundState = 'waiting' | 'active' | 'ended';
export type RoundEndReason = 'hit' | 'timeout' | 'none';

/**
 * Single round lifecycle — manages timer and win condition.
 */
export class Round {
  state: RoundState = 'waiting';
  remaining: number = PACING.BASE_ROUND_TIME;
  endReason: RoundEndReason = 'none';

  private intervalId: number | null = null;
  private onTick?: (remaining: number) => void;
  private onEnd?: (reason: RoundEndReason) => void;

  constructor(options: {
    onTick?: (remaining: number) => void;
    onEnd?: (reason: RoundEndReason) => void;
  }) {
    this.onTick = options.onTick;
    this.onEnd = options.onEnd;
  }

  start(seconds?: number) {
    this.remaining = seconds ?? PACING.BASE_ROUND_TIME;
    this.state = 'active';
    this.endReason = 'none';

    this.intervalId = window.setInterval(() => {
      this.remaining = Math.max(0, this.remaining - 1);
      this.onTick?.(this.remaining);

      if (this.remaining <= 0) {
        this.end('timeout');
      }
    }, 1000);
  }

  /** End the round (called on hit or timeout). */
  end(reason: RoundEndReason) {
    if (this.state !== 'active') return;
    this.state = 'ended';
    this.endReason = reason;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.onEnd?.(reason);
  }

  dispose() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }
}
