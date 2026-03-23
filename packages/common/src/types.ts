// --- Math types ---

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CircleArea {
  x: number;
  z: number;
  radius: number;
}

// --- Heightmap ---

export interface HeightmapData {
  /** Float32Array of height values, row-major (z * width + x) */
  heights: Float32Array;
  width: number;
  depth: number;
  /** World-space size in meters */
  worldWidth: number;
  worldDepth: number;
}

// --- Terrain generation params ---

export interface TerrainParams {
  mapSize: number;       // width/depth in meters (square maps)
  resolution: number;    // vertices per axis
  maxElevation: number;
  noiseOctaves: number;
  primaryFrequency: number;
  treeDensity: number;   // per m^2
  rockDensity: number;   // per m^2
}

// --- World layout ---

export interface ObstaclePlacement {
  x: number;
  y: number;
  z: number;
  scale: number;
  heightScale?: number;
  rotation: number;
  tiltX?: number;
}

export interface ObstacleLayout {
  trees: ObstaclePlacement[];
  rocks: ObstaclePlacement[];
}

export type PickupType = 'shield' | 'arrow-bundle' | 'teleport-arrow';
export type ArrowType = 'normal' | 'teleport';
export type RoomPhase = 'lobby' | 'playing' | 'between_rounds' | 'match_over';

export interface PickupState {
  id: string;
  type: PickupType;
  position: Vec3;
  active: boolean;
}

export interface ZoneConfig {
  center: Vec3;
  initialRadius: number;
  finalRadius: number;
  activationElapsedFraction: number;
  outsideGraceSeconds: number;
}

export interface ZoneState extends ZoneConfig {
  active: boolean;
  currentRadius: number;
}

export interface LandedArrowState {
  id: string;
  position: Vec3;
  isTeleport: boolean;
}

export interface WorldLayout {
  seed: number;
  terrain: TerrainParams;
  spawnClearRadius: number;
  spawns: Vec3[];
  obstacles: ObstacleLayout;
  pickups: PickupState[];
  zone: ZoneConfig;
}

export interface PlayerPublicState {
  id: string;
  displayName: string;
  colorIndex: number;
  alive: boolean;
  spectating: boolean;
  connected: boolean;
  hasShield: boolean;
  arrows: number;
  teleportArrows: number;
  isFletching: boolean;
  position: Vec3;
  viewYaw: number;
  viewPitch: number;
  zoneGraceRemaining: number | null;
}

export interface MatchState {
  roomCode: string;
  phase: RoomPhase;
  currentRound: number;
  roundTimeRemaining: number;
  scores: Record<string, number>;
  playerLimit: number;
  players: PlayerPublicState[];
  world: WorldLayout | null;
  zone: ZoneState | null;
  landedArrows: LandedArrowState[];
}

// --- Network message types ---

export type ClientMessage =
  | { type: 'CREATE_ROOM'; displayName: string }
  | { type: 'JOIN_ROOM'; roomCode: string; displayName: string }
  | { type: 'START_MATCH' }
  | { type: 'START_NEW_MAP' }
  | { type: 'ARROW_FIRED'; direction: Vec3; force: number; arrowType: ArrowType }
  | { type: 'FLETCH_START' }
  | { type: 'FLETCH_CANCEL' }
  | { type: 'PLAYER_VIEW'; yaw: number; pitch: number }
  | { type: 'REQUEST_MATCH_STATE' };

export type ServerMessage =
  | { type: 'ROOM_JOINED'; playerId: string; players: Array<{ id: string; displayName: string }>; isHost: boolean; roomCode: string }
  | { type: 'MATCH_STATE'; state: MatchState }
  | { type: 'ROOM_LOCKED'; reason: string }
  | { type: 'PLAYER_JOINED'; playerId: string; displayName: string }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'ROUND_START'; roundNumber: number }
  | { type: 'TIMER_SYNC'; remainingSeconds: number }
  | { type: 'ARROW_FIRED'; origin: Vec3; direction: Vec3; force: number; arrowType: ArrowType }
  | { type: 'ARROW_LANDED'; arrowId: string; position: Vec3; isTeleport: boolean }
  | { type: 'PLAYER_HIT'; targetId: string; arrowId: string; blockedByShield: boolean }
  | { type: 'ROUND_END'; winnerId: string | null; scores: Record<string, number> }
  | { type: 'MATCH_OVER'; winnerId: string; scores: Record<string, number> }
  | { type: 'FLETCH_START'; playerId: string; durationSeconds: number }
  | { type: 'FLETCH_COMPLETE'; playerId: string; arrows: number }
  | { type: 'PLAYER_TELEPORT'; playerId: string; position: Vec3; remainingTeleports: number }
  | { type: 'PICKUP_ACQUIRED'; playerId: string; pickupId: string; pickupType: PickupType; arrows: number; teleportArrows: number; hasShield: boolean }
  | { type: 'ZONE_UPDATE'; zone: ZoneState }
  | { type: 'ZONE_WARNING'; playerId: string; remainingSeconds: number }
  | { type: 'PLAYER_VIEW'; playerId: string; yaw: number; pitch: number };
