import type * as Party from 'partykit/server';
import { RoomState } from './Room';
import { GameLoop } from './GameLoop';
import { validateArrowHit } from './HitValidator';

let arrowCounter = 0;

/**
 * Bojo Dojo PartyKit server.
 * Each room is an isolated party instance with its own state.
 */
export default class BojoDojo implements Party.Server {
  private room: RoomState;
  private gameLoop: GameLoop;

  constructor(readonly party: Party.Party) {
    this.room = new RoomState();
    this.gameLoop = new GameLoop(this.room, (msg) => this.broadcastJson(msg));
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Parse display name from URL query string
    const url = new URL(ctx.request.url);
    const displayName = url.searchParams.get('name') || `Player ${this.room.players.size + 1}`;

    const player = this.room.addPlayer(conn.id, displayName);

    // Tell the new player their ID and current player list
    this.sendJson(conn, {
      type: 'ROOM_JOINED',
      playerId: conn.id,
      players: this.room.playerList().map((id) => {
        const p = this.room.players.get(id)!;
        return { id: p.id, displayName: p.displayName };
      }),
      isHost: this.room.hostId === conn.id,
      roomCode: this.party.id,
    });

    // Tell everyone else about the new player
    this.broadcastJson(
      { type: 'PLAYER_JOINED', playerId: conn.id, displayName },
      [conn.id],
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'START_MATCH':
        this.handleStartMatch(sender);
        break;

      case 'ARROW_FIRED':
        this.handleArrowFired(sender, msg);
        break;
    }
  }

  onClose(conn: Party.Connection) {
    const isEmpty = this.room.removePlayer(conn.id);

    if (isEmpty) {
      this.gameLoop.stop();
      return;
    }

    this.broadcastJson({ type: 'PLAYER_LEFT', playerId: conn.id });

    // If in a round and only one player alive, end the round
    if (this.room.phase === 'playing') {
      const alive = [...this.room.players.values()].filter((p) => p.alive);
      if (alive.length <= 1) {
        const winnerId = alive.length === 1 ? alive[0].id : null;
        this.gameLoop.stop();
        const matchOver = this.room.endRound(winnerId);
        this.broadcastJson({
          type: 'ROUND_END',
          winnerId,
          scores: { ...this.room.scores },
        });
        if (matchOver && winnerId) {
          this.broadcastJson({
            type: 'MATCH_OVER',
            winnerId,
            scores: { ...this.room.scores },
          });
        }
      }
    }
  }

  // --- Handlers ---

  private handleStartMatch(sender: Party.Connection) {
    // Only host can start
    if (sender.id !== this.room.hostId) return;
    if (this.room.players.size < 2) return;
    if (this.room.phase !== 'lobby') return;

    this.room.initMatch();

    // Send seed so all clients generate identical terrain
    this.broadcastJson({
      type: 'MAP_SEED',
      seed: this.room.seed,
      playerCount: this.room.players.size,
    });

    // Send spawn assignments
    this.broadcastJson({
      type: 'SPAWN_ASSIGNMENT',
      spawns: this.room.spawns,
    });

    // Start first round
    this.room.startRound();
    this.broadcastJson({
      type: 'ROUND_START',
      roundNumber: this.room.currentRound,
    });

    this.gameLoop.start();
  }

  private handleArrowFired(sender: Party.Connection, msg: Record<string, unknown>) {
    if (this.room.phase !== 'playing') return;

    const player = this.room.players.get(sender.id);
    if (!player || !player.alive) return;

    const origin = msg.origin as { x: number; y: number; z: number };
    const direction = msg.direction as { x: number; y: number; z: number };
    const force = msg.force as number;

    if (!origin || !direction || typeof force !== 'number') return;

    // Server-authoritative hit validation
    const { hit, landingPosition } = validateArrowHit(
      origin,
      direction,
      force,
      sender.id,
      this.room.players,
      this.room.spawns,
      this.room.heightmap!,
    );

    const arrowId = `arrow-${++arrowCounter}`;

    // Relay the arrow to all OTHER clients (sender already animated locally)
    this.broadcastJson(
      {
        type: 'ARROW_FIRED',
        playerId: sender.id,
        origin,
        direction,
        force,
      },
      [sender.id],
    );

    // Broadcast anonymous landing position to all
    this.broadcastJson({
      type: 'ARROW_LANDED',
      arrowId,
      position: landingPosition,
    });

    // Handle hit
    if (hit) {
      const winnerId = this.room.killPlayer(hit.targetId);

      this.broadcastJson({
        type: 'PLAYER_HIT',
        targetId: hit.targetId,
        arrowId,
      });

      if (winnerId !== null) {
        // Round over
        this.gameLoop.stop();
        const matchOver = this.room.endRound(winnerId);

        this.broadcastJson({
          type: 'ROUND_END',
          winnerId,
          scores: { ...this.room.scores },
        });

        if (matchOver) {
          this.broadcastJson({
            type: 'MATCH_OVER',
            winnerId,
            scores: { ...this.room.scores },
          });
        } else {
          // Auto-start next round after delay
          setTimeout(() => {
            if (this.room.players.size >= 2) {
              this.room.startRound();
              this.broadcastJson({
                type: 'ROUND_START',
                roundNumber: this.room.currentRound,
              });
              this.gameLoop.start();
            }
          }, 3000);
        }
      }
    }
  }

  // --- Helpers ---

  private sendJson(conn: Party.Connection, data: object) {
    conn.send(JSON.stringify(data));
  }

  private broadcastJson(data: object, exclude?: string[]) {
    const json = JSON.stringify(data);
    for (const conn of this.party.getConnections()) {
      if (exclude && exclude.includes(conn.id)) continue;
      conn.send(json);
    }
  }
}
