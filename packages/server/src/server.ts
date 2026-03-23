import type * as Party from 'partykit/server';
import { SPAWN } from '@bojo-dojo/common';
import type { ArrowType, ClientMessage, Vec3 } from '@bojo-dojo/common';
import { GameLoop } from './GameLoop';
import { validateArrowResolution } from './HitValidator';
import { RoomState } from './Room';
import { ShowcaseManager } from './bot/ShowcaseManager';

let arrowCounter = 0;

function normalizeDirection(direction: { x: number; y: number; z: number }) {
  const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
  if (!Number.isFinite(len) || len <= 0.0001) return null;
  return {
    x: direction.x / len,
    y: direction.y / len,
    z: direction.z / len,
  };
}

export default class BojoDojo implements Party.Server {
  private room: RoomState;
  private gameLoop: GameLoop;
  private showcaseManager: ShowcaseManager | null = null;
  private showcaseSpectators = new Set<string>();

  constructor(readonly party: Party.Party) {
    this.room = new RoomState();
    this.gameLoop = new GameLoop(this.room, {
      broadcast: (msg) => this.broadcastJson(msg),
      broadcastState: () => this.broadcastMatchState(),
      onRoundResolved: (winnerId) => this.handleRoundResolved(winnerId),
    });
  }

  private isShowcaseRoom(): boolean {
    return this.party.id === 'showcase';
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    if (this.isShowcaseRoom()) {
      return this.handleShowcaseConnect(conn);
    }

    const url = new URL(ctx.request.url);
    const displayName = url.searchParams.get('name') || `Player ${this.room.players.size + 1}`;
    const clientId = url.searchParams.get('clientId') || conn.id;
    const colorIndex = Math.max(0, Math.min(5, parseInt(url.searchParams.get('color') || '0', 10) || 0));

    if (!this.room.canJoinActiveMatch(clientId)) {
      this.sendJson(conn, {
        type: 'ROOM_LOCKED',
        reason: 'Match in progress. Rejoin when the next match starts.',
      });
      conn.close();
      return;
    }

    const { player, isReconnect } = this.room.addOrReconnectPlayer(clientId, conn.id, displayName, colorIndex);

    this.sendJson(conn, {
      type: 'ROOM_JOINED',
      playerId: player.id,
      players: [...this.room.players.values()].map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
      })),
      isHost: this.room.hostId === player.id,
      roomCode: this.party.id,
    });

    if (!isReconnect) {
      this.broadcastJson(
        { type: 'PLAYER_JOINED', playerId: player.id, displayName: player.displayName },
        [conn.id],
      );
    }

    this.sendJson(conn, {
      type: 'MATCH_STATE',
      state: this.room.toMatchState(this.party.id),
    });
  }

  onMessage(message: string, sender: Party.Connection) {
    if (this.isShowcaseRoom()) {
      return this.handleShowcaseMessage(message, sender);
    }

    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'START_MATCH':
        this.handleStartMatch(sender, false);
        break;
      case 'START_NEW_MAP':
        this.handleStartMatch(sender, true);
        break;
      case 'ARROW_FIRED':
        this.handleArrowFired(sender, msg);
        break;
      case 'FLETCH_START':
        this.handleFletchStart(sender);
        break;
      case 'FLETCH_CANCEL':
        this.handleFletchCancel(sender);
        break;
      case 'PLAYER_VIEW':
        this.handlePlayerView(sender, msg.yaw, msg.pitch);
        break;
      case 'REQUEST_MATCH_STATE':
        this.sendJson(sender, {
          type: 'MATCH_STATE',
          state: this.room.toMatchState(this.party.id),
        });
        break;
    }
  }

  onClose(conn: Party.Connection) {
    if (this.isShowcaseRoom()) {
      return this.handleShowcaseClose(conn);
    }

    const result = this.room.removeConnection(conn.id);
    if (result.isEmpty) {
      this.gameLoop.stop();
      return;
    }

    if (result.removed && result.playerId) {
      this.broadcastJson({ type: 'PLAYER_LEFT', playerId: result.playerId });
    }

    this.broadcastMatchState();
  }

  // --- Showcase room handlers ---

  private handleShowcaseConnect(conn: Party.Connection) {
    this.showcaseSpectators.add(conn.id);

    if (!this.showcaseManager) {
      this.showcaseManager = new ShowcaseManager((msg) => {
        const json = JSON.stringify(msg);
        for (const c of this.party.getConnections()) {
          if (this.showcaseSpectators.has(c.id)) {
            c.send(json);
          }
        }
      });
      this.showcaseManager.start();
    }

    this.sendJson(conn, {
      type: 'MATCH_STATE',
      state: this.showcaseManager.getMatchState(),
    });
  }

  private handleShowcaseMessage(message: string, sender: Party.Connection) {
    try {
      const msg = JSON.parse(message) as ClientMessage;
      if (msg.type === 'REQUEST_MATCH_STATE' && this.showcaseManager) {
        this.sendJson(sender, {
          type: 'MATCH_STATE',
          state: this.showcaseManager.getMatchState(),
        });
      }
    } catch {
      // ignore
    }
  }

  private handleShowcaseClose(conn: Party.Connection) {
    this.showcaseSpectators.delete(conn.id);
    if (this.showcaseSpectators.size === 0 && this.showcaseManager) {
      this.showcaseManager.stop();
      this.showcaseManager = null;
    }
  }

  // --- Normal game handlers ---

  private handleStartMatch(sender: Party.Connection, forceNewWorld: boolean) {
    const player = this.room.getPlayerByConnection(sender.id);
    if (!player || player.id !== this.room.hostId) return;
    if (this.room.players.size < 2) return;
    if (this.room.phase === 'playing') return;

    if (this.room.phase === 'lobby') {
      this.room.initMatch(forceNewWorld);
      this.room.startRound();
    } else if (this.room.phase === 'match_over') {
      this.room.startRematch(!forceNewWorld);
    } else {
      return;
    }

    this.broadcastJson({
      type: 'ROUND_START',
      roundNumber: this.room.currentRound,
    });
    this.broadcastMatchState();
    this.gameLoop.start();
  }

  private handleArrowFired(
    sender: Party.Connection,
    msg: Extract<ClientMessage, { type: 'ARROW_FIRED' }>,
  ) {
    const player = this.room.getPlayerByConnection(sender.id);
    if (!player) return;

    const direction = normalizeDirection(msg.direction);
    if (!direction) return;

    const arrowType: ArrowType = msg.arrowType === 'teleport' ? 'teleport' : 'normal';
    const force = Math.max(0.2, Math.min(1, Number(msg.force) || 0));

    this.processArrowFire(player.id, direction, force, arrowType, sender.id);
  }

  /**
   * Shared arrow-processing logic used by both real players and bots.
   * excludeConnId is the connection to exclude from the ARROW_FIRED broadcast
   * (the sender already shows their own arrow locally). Null for bots.
   */
  processArrowFire(
    playerId: string,
    direction: Vec3,
    force: number,
    arrowType: ArrowType,
    excludeConnId?: string,
  ) {
    if (this.room.phase !== 'playing' || !this.room.heightmap) return;

    const fireValidation = this.room.validateFire(playerId, arrowType);
    if (!fireValidation.ok) return;

    const player = this.room.getPlayer(playerId);
    if (!player) return;

    const origin = {
      x: player.position.x,
      y: player.position.y + SPAWN.PLAYER_EYE_HEIGHT,
      z: player.position.z,
    };

    this.room.consumeShot(playerId, arrowType);

    const { trajectory, playerHit, pickupHit, landingPosition } = validateArrowResolution(
      origin,
      direction,
      force,
      playerId,
      arrowType,
      this.room.players,
      this.room.pickups,
      this.room.heightmap,
    );

    const arrowId = `arrow-${++arrowCounter}`;
    const flightTimeMs = Math.max(100, (trajectory[trajectory.length - 1].time) * 1000);
    const firedInRound = this.room.currentRound;

    // Broadcast ARROW_FIRED immediately so animations start
    this.broadcastJson(
      {
        type: 'ARROW_FIRED',
        origin,
        direction,
        force,
        arrowType,
      },
      excludeConnId ? [excludeConnId] : undefined,
    );

    // Apply player hit at the moment the arrow reaches the target, not when it lands
    if (playerHit) {
      const hitDelayMs = Math.max(50, playerHit.hitTime * 1000);
      setTimeout(() => {
        if (this.room.phase !== 'playing' || this.room.currentRound !== firedInRound) return;

        const result = this.room.absorbOrKillPlayer(playerHit.targetId);
        this.broadcastJson({
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
    }

    // Delay landing effects (arrow stuck in ground, pickups, teleport) until arrow lands
    setTimeout(() => {
      if (this.room.phase !== 'playing' || this.room.currentRound !== firedInRound) return;

      this.room.addLandedArrow({
        id: arrowId,
        position: { ...landingPosition },
        isTeleport: arrowType === 'teleport',
      });
      this.broadcastJson({
        type: 'ARROW_LANDED',
        arrowId,
        position: landingPosition,
        isTeleport: arrowType === 'teleport',
      });

      if (pickupHit) {
        const pickup = this.room.applyPickup(playerId, pickupHit.targetId);
        if (pickup) {
          const shooter = this.room.getPlayer(playerId)!;
          this.broadcastJson({
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
            this.broadcastJson({
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
  }

  /**
   * Shared player view update used by both real players and bots.
   */
  processPlayerView(playerId: string, yaw: number, pitch: number, excludeConnId?: string) {
    this.room.setPlayerView(playerId, yaw, pitch);
    this.broadcastJson(
      {
        type: 'PLAYER_VIEW',
        playerId,
        yaw,
        pitch,
      },
      excludeConnId ? [excludeConnId] : undefined,
    );
  }

  private handleFletchStart(sender: Party.Connection) {
    const player = this.room.getPlayerByConnection(sender.id);
    if (!player) return;

    const result = this.room.startFletching(player.id);
    if (!result.ok || !result.durationSeconds) return;

    this.broadcastJson({
      type: 'FLETCH_START',
      playerId: player.id,
      durationSeconds: result.durationSeconds,
    });
    this.broadcastMatchState();
  }

  private handleFletchCancel(sender: Party.Connection) {
    const player = this.room.getPlayerByConnection(sender.id);
    if (!player) return;
    this.room.cancelFletching(player.id);
    this.broadcastMatchState();
  }

  private handlePlayerView(sender: Party.Connection, yaw: number, pitch: number) {
    const player = this.room.getPlayerByConnection(sender.id);
    if (!player) return;
    this.processPlayerView(player.id, yaw, pitch, sender.id);
  }

  private handleRoundResolved(winnerId: string | null) {
    this.gameLoop.stop();
    const matchOver = this.room.endRound(winnerId);

    this.broadcastJson({
      type: 'ROUND_END',
      winnerId,
      scores: { ...this.room.scores },
    });
    this.broadcastMatchState();

    if (matchOver && winnerId) {
      this.broadcastJson({
        type: 'MATCH_OVER',
        winnerId,
        scores: { ...this.room.scores },
      });
      return;
    }

    setTimeout(() => {
      if (this.room.players.size < 2 || this.room.phase !== 'between_rounds') return;
      this.room.startRound();
      this.broadcastJson({
        type: 'ROUND_START',
        roundNumber: this.room.currentRound,
      });
      this.broadcastMatchState();
      this.gameLoop.start();
    }, 3000);
  }

  private sendJson(conn: Party.Connection, data: object) {
    conn.send(JSON.stringify(data));
  }

  private broadcastJson(data: object, excludeConnIds?: string[]) {
    const json = JSON.stringify(data);
    for (const conn of this.party.getConnections()) {
      if (excludeConnIds?.includes(conn.id)) continue;
      conn.send(json);
    }
  }

  private broadcastMatchState() {
    this.broadcastJson({
      type: 'MATCH_STATE',
      state: this.room.toMatchState(this.party.id),
    });
  }
}
