import type { ArrowType, MatchState, Vec3 } from '@bojo-dojo/common';
import { SPAWN } from '@bojo-dojo/common';
import { GameLoop } from '../GameLoop';
import { validateArrowResolution } from '../HitValidator';
import { RoomState } from '../Room';
import type { BotAction } from './BotBrain';
import { BotManager } from './BotManager';

let showcaseArrowCounter = 0;

function normalizeDirection(direction: Vec3): Vec3 | null {
  const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
  if (!Number.isFinite(len) || len <= 0.0001) return null;
  return { x: direction.x / len, y: direction.y / len, z: direction.z / len };
}

/**
 * Self-contained bot match that runs independently of the main PartyKit room.
 * Created lazily when the first spectator connects; destroyed when the last leaves.
 */
export class ShowcaseManager {
  private room: RoomState;
  private gameLoop: GameLoop;
  private botManager: BotManager;
  private pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
  private autoRestartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private broadcastFn: (msg: object) => void) {
    this.room = new RoomState();
    this.gameLoop = new GameLoop(this.room, {
      broadcast: (msg) => this.broadcastFn(msg),
      broadcastState: () => this.broadcastMatchState(),
      onRoundResolved: (winnerId) => this.handleRoundResolved(winnerId),
    });
    this.botManager = new BotManager(this.room, (botId, action) => {
      this.processBotAction(botId, action);
    });
  }

  start(botCount = 6) {
    this.cleanup();

    this.botManager.addBots(botCount);
    this.room.initMatch(true);
    this.room.startRound();

    this.broadcastFn({
      type: 'ROUND_START',
      roundNumber: this.room.currentRound,
    });
    this.broadcastMatchState();
    this.gameLoop.start();
    this.botManager.start();
  }

  stop() {
    this.cleanup();
  }

  getMatchState(): MatchState {
    return this.room.toMatchState('showcase');
  }

  private cleanup() {
    this.botManager.stop();
    this.gameLoop.stop();
    for (const t of this.pendingTimeouts) clearTimeout(t);
    this.pendingTimeouts = [];
    if (this.autoRestartTimeout) {
      clearTimeout(this.autoRestartTimeout);
      this.autoRestartTimeout = null;
    }
    this.botManager.removeAllBots();
  }

  private handleRoundResolved(winnerId: string | null) {
    this.gameLoop.stop();
    this.botManager.stop();
    const matchOver = this.room.endRound(winnerId);

    this.broadcastFn({
      type: 'ROUND_END',
      winnerId,
      scores: { ...this.room.scores },
    });
    this.broadcastMatchState();

    if (matchOver && winnerId) {
      this.broadcastFn({
        type: 'MATCH_OVER',
        winnerId,
        scores: { ...this.room.scores },
      });

      // Auto-restart with fresh bots after 5 seconds
      this.autoRestartTimeout = setTimeout(() => {
        this.autoRestartTimeout = null;
        this.start();
      }, 5000);
      return;
    }

    // Auto-start next round after 3 seconds
    this.autoRestartTimeout = setTimeout(() => {
      this.autoRestartTimeout = null;
      if (this.room.phase !== 'between_rounds') return;
      this.room.startRound();
      this.broadcastFn({
        type: 'ROUND_START',
        roundNumber: this.room.currentRound,
      });
      this.broadcastMatchState();
      this.gameLoop.start();
      this.botManager.start();
    }, 3000);
  }

  private processBotAction(botId: string, action: BotAction) {
    switch (action.type) {
      case 'fire':
        if (action.direction && action.force != null) {
          this.processArrowFire(
            botId,
            action.direction,
            action.force,
            action.arrowType ?? 'normal',
          );
        }
        break;
      case 'look':
        if (action.yaw != null && action.pitch != null) {
          this.room.setPlayerView(botId, action.yaw, action.pitch);
          this.broadcastFn({
            type: 'PLAYER_VIEW',
            playerId: botId,
            yaw: action.yaw,
            pitch: action.pitch,
          });
        }
        break;
    }
  }

  private processArrowFire(
    playerId: string,
    direction: Vec3,
    force: number,
    arrowType: ArrowType,
  ) {
    if (this.room.phase !== 'playing' || !this.room.heightmap) return;

    const normalizedDir = normalizeDirection(direction);
    if (!normalizedDir) return;

    const fireValidation = this.room.validateFire(playerId, arrowType);
    if (!fireValidation.ok) return;

    const player = this.room.getPlayer(playerId);
    if (!player) return;

    const clampedForce = Math.max(0.2, Math.min(1, force));
    const origin = {
      x: player.position.x,
      y: player.position.y + SPAWN.PLAYER_EYE_HEIGHT,
      z: player.position.z,
    };

    this.room.consumeShot(playerId, arrowType);

    const { trajectory, playerHit, pickupHit, landingPosition } = validateArrowResolution(
      origin,
      normalizedDir,
      clampedForce,
      playerId,
      arrowType,
      this.room.players,
      this.room.pickups,
      this.room.heightmap,
    );

    const arrowId = `showcase-arrow-${++showcaseArrowCounter}`;
    const flightTimeMs = Math.max(100, trajectory[trajectory.length - 1].time * 1000);
    const firedInRound = this.room.currentRound;

    this.broadcastFn({
      type: 'ARROW_FIRED',
      origin,
      direction: normalizedDir,
      force: clampedForce,
      arrowType,
    });

    if (playerHit) {
      const hitDelayMs = Math.max(50, playerHit.hitTime * 1000);
      const hitTimeout = setTimeout(() => {
        if (this.room.phase !== 'playing' || this.room.currentRound !== firedInRound) return;

        const result = this.room.absorbOrKillPlayer(playerHit.targetId);
        // Notify the shooting bot of its kill so it can celebrate
        if (!result.blockedByShield) {
          this.botManager.notifyKill(playerId);
        }
        this.broadcastFn({
          type: 'PLAYER_HIT',
          targetId: playerHit.targetId,
          arrowId,
          blockedByShield: result.blockedByShield,
        });
        this.broadcastMatchState();

        if (result.winnerId !== null) {
          this.handleRoundResolved(result.winnerId);
        }
      }, hitDelayMs);
      this.pendingTimeouts.push(hitTimeout);
    }

    const landTimeout = setTimeout(() => {
      if (this.room.phase !== 'playing' || this.room.currentRound !== firedInRound) return;

      this.room.addLandedArrow({
        id: arrowId,
        position: { ...landingPosition },
        isTeleport: arrowType === 'teleport',
      });
      this.broadcastFn({
        type: 'ARROW_LANDED',
        arrowId,
        position: landingPosition,
        isTeleport: arrowType === 'teleport',
      });

      if (pickupHit) {
        const pickup = this.room.applyPickup(playerId, pickupHit.targetId);
        if (pickup) {
          const shooter = this.room.getPlayer(playerId)!;
          this.broadcastFn({
            type: 'PICKUP_ACQUIRED',
            playerId: shooter.id,
            pickupId: pickup.id,
            pickupType: pickup.type,
            arrows: shooter.arrows,
            teleportArrows: shooter.teleportArrows,
            hasShield: shooter.hasShield,
          });
        }
      }

      if (arrowType === 'teleport') {
        const teleporter = this.room.getPlayer(playerId);
        if (teleporter?.alive) {
          const teleported = this.room.teleportPlayer(playerId, landingPosition);
          if (teleported) {
            this.broadcastFn({
              type: 'PLAYER_TELEPORT',
              playerId: teleported.id,
              position: teleported.position,
              remainingTeleports: teleported.teleportArrows,
            });
          }
        }
      }

      if (!playerHit) {
        this.broadcastMatchState();
      }
    }, flightTimeMs);
    this.pendingTimeouts.push(landTimeout);
  }

  private broadcastMatchState() {
    this.broadcastFn({
      type: 'MATCH_STATE',
      state: this.room.toMatchState('showcase'),
    });
  }
}
