import { PACING } from '@bojo-dojo/common';
import type { ZoneState } from '@bojo-dojo/common';
import type { PlayerInfo, RoomState } from './Room';

export class GameLoop {
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private room: RoomState,
    private callbacks: {
      broadcast: (msg: object) => void;
      broadcastState: () => void;
      onRoundResolved: (winnerId: string | null) => void;
    },
  ) {}

  private getRoundDurationSeconds() {
    return PACING.BASE_ROUND_TIME + Math.max(0, this.room.players.size - 2) * PACING.TIME_PER_EXTRA_PLAYER;
  }

  private computeZoneState(): ZoneState | null {
    if (!this.room.zone || !this.room.world) return null;

    const totalSeconds = this.getRoundDurationSeconds();
    const elapsedFraction = 1 - this.room.roundTimeRemaining / totalSeconds;
    const activation = this.room.world.zone.activationElapsedFraction;
    const active = elapsedFraction >= activation;
    if (!active) {
      return {
        ...this.room.zone,
        active: false,
        currentRadius: this.room.world.zone.initialRadius,
      };
    }

    const progress = Math.min(1, (elapsedFraction - activation) / Math.max(0.001, 1 - activation));
    const currentRadius = this.room.world.zone.initialRadius
      + (this.room.world.zone.finalRadius - this.room.world.zone.initialRadius) * progress;

    return {
      ...this.room.zone,
      active: true,
      currentRadius,
    };
  }

  private resolveIfRoundEnded(winnerId: string | null): boolean {
    if (winnerId === undefined) return false;
    this.stop();
    this.callbacks.onRoundResolved(winnerId);
    return true;
  }

  start() {
    this.stop();

    this.tickInterval = setInterval(() => {
      if (this.room.phase !== 'playing') {
        this.stop();
        return;
      }

      const now = Date.now();
      const stateDirty = { value: false };

      const finishedFletches = this.room.completeDueFletches(now);
      for (const player of finishedFletches) {
        this.callbacks.broadcast({
          type: 'FLETCH_COMPLETE',
          playerId: player.id,
          arrows: player.arrows,
        });
        stateDirty.value = true;
      }

      const disconnectedDeaths = this.room.forceKillDisconnected(now);
      if (disconnectedDeaths.length > 0) {
        stateDirty.value = true;
        const alive = this.room.getAlivePlayers();
        if (alive.length <= 1) {
          this.callbacks.broadcastState();
          this.resolveIfRoundEnded(alive[0]?.id ?? null);
          return;
        }
      }

      this.room.roundTimeRemaining = Math.max(0, this.room.roundTimeRemaining - 1);
      this.callbacks.broadcast({
        type: 'TIMER_SYNC',
        remainingSeconds: this.room.roundTimeRemaining,
      });

      // Zone ring closing mechanic disabled for now
      // const zone = this.computeZoneState();
      // if (zone) { ... }

      if (this.room.roundTimeRemaining <= 0) {
        this.callbacks.broadcastState();
        this.resolveIfRoundEnded(null);
        return;
      }

      if (stateDirty.value) {
        this.callbacks.broadcastState();
      }
    }, 1000);
  }

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
