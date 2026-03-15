import type { RoomState } from './Room';

/**
 * GameLoop — manages round timer on the server.
 * Sends TIMER_SYNC periodically and triggers round end on timeout.
 */
export class GameLoop {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private syncCounter = 0;

  constructor(
    private room: RoomState,
    private broadcast: (msg: object) => void,
  ) {}

  /** Start the round timer. */
  start() {
    this.syncCounter = 0;

    this.tickInterval = setInterval(() => {
      if (this.room.phase !== 'playing') {
        this.stop();
        return;
      }

      this.room.roundTimeRemaining--;
      this.syncCounter++;

      // Send TIMER_SYNC every 10 seconds
      if (this.syncCounter % 10 === 0) {
        this.broadcast({
          type: 'TIMER_SYNC',
          remainingSeconds: this.room.roundTimeRemaining,
        });
      }

      // Round time expired
      if (this.room.roundTimeRemaining <= 0) {
        this.stop();
        // Time up — draw (no winner)
        const matchOver = this.room.endRound(null);
        this.broadcast({
          type: 'ROUND_END',
          winnerId: null,
          scores: { ...this.room.scores },
        });

        if (matchOver) {
          this.broadcast({
            type: 'MATCH_OVER',
            winnerId: null,
            scores: { ...this.room.scores },
          });
        } else {
          // Auto-start next round after delay
          setTimeout(() => {
            if (this.room.players.size >= 2) {
              this.room.startRound();
              this.broadcast({
                type: 'ROUND_START',
                roundNumber: this.room.currentRound,
              });
              this.start();
            }
          }, 3000);
        }
      }
    }, 1000);
  }

  /** Stop the timer. */
  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  dispose() {
    this.stop();
  }
}
