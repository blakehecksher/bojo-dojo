import type { TerrainParams } from './types.js';

// --- Arrow Physics ---
export const PHYSICS = {
  MIN_ARROW_SPEED: 20,    // m/s — gentle lob ~15m
  MAX_ARROW_SPEED: 80,    // m/s — full draw ~120m
  GRAVITY: 9.8,           // m/s^2
  ARROW_HITBOX_RADIUS: 0.3,
  PLAYER_HITBOX_RADIUS: 0.5,
  PLAYER_HITBOX_HEIGHT: 1.8,
  TRAJECTORY_PREVIEW_FRACTION: 0.3,
  TRAJECTORY_DT: 1 / 60,  // simulation timestep
} as const;

// --- Input & Controls ---
export const INPUT = {
  SWIPE_SENSITIVITY: 0.3,       // degrees per pixel
  THUMBSTICK_MAX_SPEED: 15,     // degrees per second
  THUMBSTICK_DEAD_ZONE: 0.15,   // fraction of stick radius
  PULL_SLIDER_RANGE: 200,       // px drag for full draw
  PULL_SLIDER_CANCEL_ZONE: 0.2, // bottom 20% = cancel
} as const;

// --- Terrain ---
export const TERRAIN_BASE: TerrainParams = {
  mapSize: 200,             // 200m x 200m for 2 players
  resolution: 100,          // 100x100 vertex grid (1 vertex per 2m)
  maxElevation: 30,         // 30m delta
  noiseOctaves: 4,
  primaryFrequency: 0.01,
  treeDensity: 0.01,        // ~1 per 100m^2
  rockDensity: 0.005,       // ~1 per 200m^2
} as const;

// --- Spawn & Placement ---
export const SPAWN = {
  MIN_DISTANCE_2P: 80,      // meters
  MAX_SLOPE: 15,            // degrees
  EDGE_BUFFER: 20,          // meters from map border
  PLAYER_EYE_HEIGHT: 1.6,   // meters above terrain
} as const;

// --- Round Pacing ---
export const PACING = {
  BASE_ROUND_TIME: 90,         // seconds
  TIME_PER_EXTRA_PLAYER: 15,   // seconds
  ZONE_ACTIVATION: 0.6,        // fraction of round time
  STARTING_ARROWS: 5,
  TELEPORT_ARROWS_PER_ROUND: 1,
  ROUNDS_TO_WIN: 3,
} as const;
