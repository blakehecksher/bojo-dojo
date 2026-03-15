import type { Vec3, HeightmapData } from '@bojo-dojo/common';
import {
  generateHeightmap, generateSpawnPoints,
  TERRAIN_BASE, PACING,
} from '@bojo-dojo/common';

export type RoomPhase = 'lobby' | 'playing' | 'between_rounds' | 'match_over';

export interface PlayerInfo {
  id: string;
  displayName: string;
  alive: boolean;
  hasShield: boolean;
}

/**
 * Room game state — manages players, seed, spawns, scores, round lifecycle.
 */
export class RoomState {
  phase: RoomPhase = 'lobby';
  players = new Map<string, PlayerInfo>();
  hostId: string | null = null;

  seed = 0;
  heightmap: HeightmapData | null = null;
  spawns: Record<string, Vec3> = {};

  scores: Record<string, number> = {};
  currentRound = 0;
  roundTimeRemaining = 0;

  /** Add a player to the room. First player becomes host. */
  addPlayer(id: string, displayName: string): PlayerInfo {
    const info: PlayerInfo = { id, displayName, alive: true, hasShield: false };
    this.players.set(id, info);
    if (!this.hostId) this.hostId = id;
    if (!this.scores[id]) this.scores[id] = 0;
    return info;
  }

  /** Remove a player. Returns true if room is now empty. */
  removePlayer(id: string): boolean {
    this.players.delete(id);
    delete this.scores[id];
    delete this.spawns[id];

    if (this.hostId === id) {
      // Assign new host
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }

    return this.players.size === 0;
  }

  /** Initialize game: generate seed, terrain, spawn points. */
  initMatch() {
    this.seed = Math.floor(Math.random() * 2147483647);
    this.heightmap = generateHeightmap(this.seed, TERRAIN_BASE);

    const playerIds = [...this.players.keys()];
    const spawnPoints = generateSpawnPoints(this.seed, this.heightmap, playerIds.length);

    this.spawns = {};
    for (let i = 0; i < playerIds.length; i++) {
      this.spawns[playerIds[i]] = spawnPoints[i];
      this.scores[playerIds[i]] = 0;
    }

    this.currentRound = 0;
  }

  /** Start a new round. */
  startRound() {
    this.currentRound++;
    this.phase = 'playing';

    const extraPlayers = Math.max(0, this.players.size - 2);
    this.roundTimeRemaining =
      PACING.BASE_ROUND_TIME + extraPlayers * PACING.TIME_PER_EXTRA_PLAYER;

    // Reset all players to alive
    for (const p of this.players.values()) {
      p.alive = true;
      p.hasShield = false;
    }
  }

  /** Mark a player as dead. Returns the winner ID if round should end, null otherwise. */
  killPlayer(targetId: string): string | null {
    const target = this.players.get(targetId);
    if (!target) return null;
    target.alive = false;

    // Check if only one player is alive
    const alive = [...this.players.values()].filter((p) => p.alive);
    if (alive.length <= 1) {
      return alive.length === 1 ? alive[0].id : null;
    }
    return null; // round continues
  }

  /** End the current round. Returns true if match is over. */
  endRound(winnerId: string | null): boolean {
    this.phase = 'between_rounds';

    if (winnerId) {
      this.scores[winnerId] = (this.scores[winnerId] || 0) + 1;
      if (this.scores[winnerId] >= PACING.ROUNDS_TO_WIN) {
        this.phase = 'match_over';
        return true;
      }
    }

    return false;
  }

  /** Get number of alive players. */
  aliveCount(): number {
    return [...this.players.values()].filter((p) => p.alive).length;
  }

  /** Get player IDs list. */
  playerList(): string[] {
    return [...this.players.keys()];
  }
}
