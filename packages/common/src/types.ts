// --- Math types ---

export interface Vec3 {
  x: number;
  y: number;
  z: number;
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

// --- Network message types ---

export type ClientMessage =
  | { type: 'CREATE_ROOM'; displayName: string }
  | { type: 'JOIN_ROOM'; roomCode: string; displayName: string }
  | { type: 'START_MATCH' }
  | { type: 'ARROW_FIRED'; origin: Vec3; direction: Vec3; force: number }
  | { type: 'FLETCH_START' }
  | { type: 'FLETCH_COMPLETE' };

export type ServerMessage =
  | { type: 'ROOM_JOINED'; playerId: string; players: Array<{ id: string; displayName: string }>; isHost: boolean; roomCode: string }
  | { type: 'PLAYER_JOINED'; playerId: string; displayName: string }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'MAP_SEED'; seed: number; playerCount: number }
  | { type: 'SPAWN_ASSIGNMENT'; spawns: Record<string, Vec3> }
  | { type: 'ROUND_START'; roundNumber: number }
  | { type: 'TIMER_SYNC'; remainingSeconds: number }
  | { type: 'ARROW_FIRED'; playerId: string; origin: Vec3; direction: Vec3; force: number }
  | { type: 'ARROW_LANDED'; arrowId: string; position: Vec3 }
  | { type: 'PLAYER_HIT'; targetId: string; arrowId: string }
  | { type: 'ROUND_END'; winnerId: string | null; scores: Record<string, number> }
  | { type: 'MATCH_OVER'; winnerId: string; scores: Record<string, number> };

// --- Obstacle placement ---

export interface ObstacleInstance {
  x: number;
  z: number;
  y: number;       // terrain height at this point
  scale: number;   // random size variation
  rotation: number; // y-axis rotation
}
