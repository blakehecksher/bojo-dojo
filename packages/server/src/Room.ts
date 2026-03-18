import type {
  HeightmapData,
  LandedArrowState,
  MatchState,
  PickupState,
  PlayerPublicState,
  RoomPhase,
  Vec3,
  WorldLayout,
  ZoneState,
} from '@bojo-dojo/common';
import {
  clonePickups,
  generateWorldLayout,
  getDefaultZoneState,
  PACING,
  sampleHeight,
} from '@bojo-dojo/common';

export interface PlayerInfo {
  id: string;
  connId: string | null;
  displayName: string;
  colorIndex: number;
  alive: boolean;
  spectating: boolean;
  hasShield: boolean;
  arrows: number;
  teleportArrows: number;
  isFletching: boolean;
  fletchEndsAt: number | null;
  position: Vec3;
  spawnIndex: number;
  viewYaw: number;
  viewPitch: number;
  zoneOutsideSince: number | null;
  disconnectDeadline: number | null;
}

const DISCONNECT_GRACE_MS = 10_000;

function zeroVec3(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

export class RoomState {
  phase: RoomPhase = 'lobby';
  players = new Map<string, PlayerInfo>();
  hostId: string | null = null;

  playerLimit = 4;
  world: WorldLayout | null = null;
  heightmap: HeightmapData | null = null;
  pickups: PickupState[] = [];
  zone: ZoneState | null = null;
  landedArrows: LandedArrowState[] = [];

  scores: Record<string, number> = {};
  currentRound = 0;
  roundTimeRemaining = 0;
  spawnAssignments: Record<string, Vec3> = {};

  addOrReconnectPlayer(id: string, connId: string, displayName: string, colorIndex = 0) {
    const existing = this.players.get(id);
    if (existing) {
      existing.connId = connId;
      existing.displayName = displayName || existing.displayName;
      existing.colorIndex = colorIndex;
      existing.disconnectDeadline = null;
      return { player: existing, isReconnect: true };
    }

    const player: PlayerInfo = {
      id,
      connId,
      displayName,
      colorIndex,
      alive: false,
      spectating: false,
      hasShield: false,
      arrows: PACING.STARTING_ARROWS,
      teleportArrows: PACING.TELEPORT_ARROWS_PER_ROUND,
      isFletching: false,
      fletchEndsAt: null,
      position: zeroVec3(),
      spawnIndex: this.players.size,
      viewYaw: 0,
      viewPitch: 0,
      zoneOutsideSince: null,
      disconnectDeadline: null,
    };

    this.players.set(id, player);
    if (!this.hostId) this.hostId = id;
    this.scores[id] = this.scores[id] ?? 0;
    return { player, isReconnect: false };
  }

  removeConnection(connId: string): { playerId: string | null; removed: boolean; isEmpty: boolean } {
    const player = [...this.players.values()].find((entry) => entry.connId === connId);
    if (!player) {
      return { playerId: null, removed: false, isEmpty: this.players.size === 0 };
    }

    player.connId = null;

    if (this.phase === 'lobby' || this.phase === 'match_over') {
      this.players.delete(player.id);
      delete this.scores[player.id];
      delete this.spawnAssignments[player.id];
      if (this.hostId === player.id) {
        const next = this.players.keys().next();
        this.hostId = next.done ? null : next.value;
      }
      return { playerId: player.id, removed: true, isEmpty: this.players.size === 0 };
    }

    player.disconnectDeadline = Date.now() + DISCONNECT_GRACE_MS;
    return { playerId: player.id, removed: false, isEmpty: false };
  }

  canJoinActiveMatch(id: string): boolean {
    if (this.phase === 'lobby' || this.phase === 'match_over') return true;
    return this.players.has(id);
  }

  initMatch(newWorld: boolean) {
    if (newWorld || !this.world || !this.heightmap) {
      const seed = Math.floor(Math.random() * 2147483647);
      const generated = generateWorldLayout(seed, this.players.size);
      this.world = generated.layout;
      this.heightmap = generated.heightmap;
    }

    const playerIds = [...this.players.keys()];
    this.spawnAssignments = {};
    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const spawn = this.world!.spawns[i % this.world!.spawns.length];
      this.spawnAssignments[playerId] = { ...spawn };
      const player = this.players.get(playerId)!;
      player.spawnIndex = i;
      player.position = { ...spawn };
    }

    this.pickups = clonePickups(this.world!.pickups);
    this.zone = getDefaultZoneState(this.world!);
    this.landedArrows = [];
    this.currentRound = 0;

    for (const playerId of playerIds) {
      this.scores[playerId] = 0;
    }
  }

  startRound() {
    this.currentRound++;
    this.phase = 'playing';
    const extraPlayers = Math.max(0, this.players.size - 2);
    this.roundTimeRemaining =
      PACING.BASE_ROUND_TIME + extraPlayers * PACING.TIME_PER_EXTRA_PLAYER;

    this.pickups = clonePickups(this.world?.pickups ?? []);
    this.zone = this.world ? getDefaultZoneState(this.world) : null;
    this.landedArrows = [];

    // Shuffle spawn assignments each round so positions vary
    if (this.world) {
      const playerIds = [...this.players.keys()];
      const spawns = [...this.world.spawns];
      // Fisher-Yates shuffle
      for (let i = spawns.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [spawns[i], spawns[j]] = [spawns[j], spawns[i]];
      }
      for (let i = 0; i < playerIds.length; i++) {
        this.spawnAssignments[playerIds[i]] = { ...spawns[i % spawns.length] };
      }
    }

    for (const player of this.players.values()) {
      player.alive = true;
      player.spectating = false;
      player.hasShield = false;
      player.arrows = PACING.STARTING_ARROWS;
      player.teleportArrows = PACING.TELEPORT_ARROWS_PER_ROUND;
      player.isFletching = false;
      player.fletchEndsAt = null;
      player.zoneOutsideSince = null;
      player.disconnectDeadline = null;
      player.position = { ...this.spawnAssignments[player.id] };
    }
  }

  startRematch(reuseWorld: boolean) {
    this.phase = 'lobby';
    this.initMatch(!reuseWorld);
    this.startRound();
  }

  addLandedArrow(arrow: LandedArrowState) {
    this.landedArrows.push(arrow);
  }

  getPlayer(id: string) {
    return this.players.get(id) ?? null;
  }

  getPlayerByConnection(connId: string) {
    return [...this.players.values()].find((player) => player.connId === connId) ?? null;
  }

  getConnectedPlayerIds(): string[] {
    return [...this.players.values()].filter((player) => player.connId).map((player) => player.id);
  }

  getAlivePlayers(): PlayerInfo[] {
    return [...this.players.values()].filter((player) => player.alive);
  }

  aliveCount(): number {
    return this.getAlivePlayers().length;
  }

  setPlayerView(id: string, yaw: number, pitch: number) {
    const player = this.players.get(id);
    if (!player) return;
    player.viewYaw = yaw;
    player.viewPitch = pitch;
  }

  validateFire(id: string, arrowType: 'normal' | 'teleport'): { ok: boolean; reason?: string } {
    const player = this.players.get(id);
    if (!player || !player.alive || player.spectating) return { ok: false, reason: 'not-active' };
    if (player.isFletching) return { ok: false, reason: 'fletching' };

    if (arrowType === 'teleport') {
      if (player.teleportArrows <= 0) return { ok: false, reason: 'no-teleport-arrows' };
    } else if (player.arrows <= 0) {
      return { ok: false, reason: 'no-arrows' };
    }

    return { ok: true };
  }

  consumeShot(id: string, arrowType: 'normal' | 'teleport') {
    const player = this.players.get(id);
    if (!player) return;
    if (arrowType === 'teleport') {
      player.teleportArrows = Math.max(0, player.teleportArrows - 1);
    } else {
      player.arrows = Math.max(0, player.arrows - 1);
    }
  }

  startFletching(id: string, now = Date.now()): { ok: boolean; durationSeconds?: number } {
    const player = this.players.get(id);
    if (!player || !player.alive || player.spectating || player.isFletching) {
      return { ok: false };
    }

    player.isFletching = true;
    player.fletchEndsAt = now + PACING.FLETCH_DURATION_SECONDS * 1000;
    return { ok: true, durationSeconds: PACING.FLETCH_DURATION_SECONDS };
  }

  cancelFletching(id: string) {
    const player = this.players.get(id);
    if (!player) return;
    player.isFletching = false;
    player.fletchEndsAt = null;
  }

  completeDueFletches(now = Date.now()): PlayerInfo[] {
    const completed: PlayerInfo[] = [];
    for (const player of this.players.values()) {
      if (!player.isFletching || !player.fletchEndsAt || player.fletchEndsAt > now) continue;
      player.isFletching = false;
      player.fletchEndsAt = null;
      player.arrows += PACING.FLETCH_ARROWS_GAINED;
      completed.push(player);
    }
    return completed;
  }

  setZoneState(zone: ZoneState) {
    this.zone = { ...zone, center: { ...zone.center } };
  }

  updateZoneGrace(now = Date.now()) {
    if (!this.zone || !this.zone.active) return [];

    const deaths: string[] = [];
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const dx = player.position.x - this.zone.center.x;
      const dz = player.position.z - this.zone.center.z;
      const inside = Math.sqrt(dx * dx + dz * dz) <= this.zone.currentRadius;
      if (inside) {
        player.zoneOutsideSince = null;
        continue;
      }

      if (!player.zoneOutsideSince) {
        player.zoneOutsideSince = now;
        continue;
      }

      const elapsed = now - player.zoneOutsideSince;
      if (elapsed >= this.zone.outsideGraceSeconds * 1000) {
        deaths.push(player.id);
      }
    }

    return deaths;
  }

  zoneGraceRemaining(playerId: string, now = Date.now()): number | null {
    const player = this.players.get(playerId);
    if (!player?.zoneOutsideSince || !this.zone) return null;
    return Math.max(
      0,
      this.zone.outsideGraceSeconds - Math.floor((now - player.zoneOutsideSince) / 1000),
    );
  }

  applyPickup(playerId: string, pickupId: string): PickupState | null {
    const player = this.players.get(playerId);
    const pickup = this.pickups.find((entry) => entry.id === pickupId && entry.active);
    if (!player || !pickup) return null;

    pickup.active = false;
    if (pickup.type === 'shield') {
      player.hasShield = true;
    } else if (pickup.type === 'arrow-bundle') {
      player.arrows += 3;
    } else if (pickup.type === 'teleport-arrow') {
      player.teleportArrows += 1;
    }

    return pickup;
  }

  teleportPlayer(playerId: string, position: Vec3) {
    const player = this.players.get(playerId);
    if (!player) return null;

    // Clamp teleport position to map bounds
    const clamped = this.clampToMapBounds(position);
    player.position = clamped;
    player.zoneOutsideSince = null;
    return player;
  }

  private clampToMapBounds(position: Vec3): Vec3 {
    if (!this.world || !this.heightmap) return { ...position };
    const half = this.world.terrain.mapSize / 2;
    const buffer = 5;
    const x = Math.max(-half + buffer, Math.min(half - buffer, position.x));
    const z = Math.max(-half + buffer, Math.min(half - buffer, position.z));
    const y = sampleHeight(this.heightmap, x, z);
    return { x, y, z };
  }

  absorbOrKillPlayer(targetId: string): { killed: boolean; blockedByShield: boolean; winnerId: string | null } {
    const player = this.players.get(targetId);
    if (!player || !player.alive) {
      return { killed: false, blockedByShield: false, winnerId: null };
    }

    if (player.hasShield) {
      player.hasShield = false;
      return { killed: false, blockedByShield: true, winnerId: null };
    }

    player.alive = false;
    player.spectating = true;
    player.isFletching = false;
    player.fletchEndsAt = null;

    const alive = this.getAlivePlayers();
    return {
      killed: true,
      blockedByShield: false,
      winnerId: alive.length <= 1 ? (alive[0]?.id ?? null) : null,
    };
  }

  killPlayerImmediately(targetId: string): string | null {
    const player = this.players.get(targetId);
    if (!player || !player.alive) return null;

    player.alive = false;
    player.spectating = true;
    player.isFletching = false;
    player.fletchEndsAt = null;
    player.zoneOutsideSince = null;

    const alive = this.getAlivePlayers();
    return alive.length <= 1 ? (alive[0]?.id ?? null) : null;
  }

  forceKillDisconnected(now = Date.now()): string[] {
    const killed: string[] = [];
    for (const player of this.players.values()) {
      if (!player.alive || !player.disconnectDeadline) continue;
      if (player.disconnectDeadline > now) continue;
      player.alive = false;
      player.spectating = true;
      player.disconnectDeadline = null;
      killed.push(player.id);
    }
    return killed;
  }

  endRound(winnerId: string | null): boolean {
    this.phase = 'between_rounds';
    if (winnerId) {
      this.scores[winnerId] = (this.scores[winnerId] ?? 0) + 1;
      if (this.scores[winnerId] >= PACING.ROUNDS_TO_WIN) {
        this.phase = 'match_over';
        return true;
      }
    }
    return false;
  }

  getPublicPlayers(now = Date.now()): PlayerPublicState[] {
    return [...this.players.values()].map((player) => ({
      id: player.id,
      displayName: player.displayName,
      colorIndex: player.colorIndex,
      alive: player.alive,
      spectating: player.spectating,
      hasShield: player.hasShield,
      arrows: player.arrows,
      teleportArrows: player.teleportArrows,
      isFletching: player.isFletching,
      position: { ...player.position },
      viewYaw: player.viewYaw,
      viewPitch: player.viewPitch,
      zoneGraceRemaining: this.zoneGraceRemaining(player.id, now),
    }));
  }

  toMatchState(roomCode: string, now = Date.now()): MatchState {
    return {
      roomCode,
      phase: this.phase,
      currentRound: this.currentRound,
      roundTimeRemaining: this.roundTimeRemaining,
      scores: { ...this.scores },
      playerLimit: this.playerLimit,
      players: this.getPublicPlayers(now),
      world: this.world
        ? {
            ...this.world,
            terrain: { ...this.world.terrain },
            spawns: this.world.spawns.map((spawn) => ({ ...spawn })),
            pickups: clonePickups(this.pickups),
            obstacles: {
              trees: this.world.obstacles.trees.map((tree) => ({ ...tree })),
              rocks: this.world.obstacles.rocks.map((rock) => ({ ...rock })),
            },
            zone: { ...this.world.zone, center: { ...this.world.zone.center } },
          }
        : null,
      zone: this.zone ? { ...this.zone, center: { ...this.zone.center } } : null,
      landedArrows: this.landedArrows.map((arrow) => ({
        ...arrow,
        position: { ...arrow.position },
      })),
    };
  }
}
