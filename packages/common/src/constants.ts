import type { TerrainParams } from './types.js';

// --- Arrow Physics ---
export const PHYSICS = {
  MIN_ARROW_SPEED: 20,    // m/s — gentle lob
  MAX_ARROW_SPEED: 80,    // m/s — full draw
  GRAVITY: 9.8,           // m/s^2
  ARROW_HITBOX_RADIUS: 0.3,
  PLAYER_HITBOX_RADIUS: 0.6,
  PLAYER_HITBOX_HEIGHT: 1.8,
  PICKUP_HITBOX_RADIUS: 1.1,
  PICKUP_HITBOX_HEIGHT: 1.4,
  TRAJECTORY_PREVIEW_FRACTION: 0.4,
  TRAJECTORY_DT: 1 / 60,
} as const;

// --- Input & Controls ---
export const INPUT = {
  SWIPE_SENSITIVITY: 0.3,
  THUMBSTICK_MAX_SPEED: 15,
  THUMBSTICK_DEAD_ZONE: 0.15,
  PULL_SLIDER_RANGE: 200,
  PULL_SLIDER_CANCEL_ZONE: 0.2,
} as const;

// --- Terrain ---
export const TERRAIN_BASE: TerrainParams = {
  mapSize: 150,
  resolution: 100,
  maxElevation: 30,
  noiseOctaves: 4,
  primaryFrequency: 0.01,
  treeDensity: 0.004,
  rockDensity: 0.003,
} as const;

export const TERRAIN_SCALING = {
  SIZE_PER_EXTRA_PLAYER: 25,
  MAX_BETA_PLAYERS: 4,
} as const;

// --- Spawn & Placement ---
export const SPAWN = {
  MIN_DISTANCE_2P: 80,
  MIN_DISTANCE_PER_EXTRA_PLAYER: 10,
  MAX_SLOPE: 15,
  EDGE_BUFFER: 20,
  PLAYER_EYE_HEIGHT: 1.6,
  CLEAR_RADIUS: 8,
  OPENNESS_SAMPLE_RADIUS: 10,
  OPENNESS_MAX_RELIEF: 5,
  MAX_GENERATION_RETRIES: 8,
} as const;

export const PICKUPS = {
  BASE_ARROW_BUNDLE_COUNT: 0,
  BASE_SHIELD_COUNT: 4,
  BASE_TELEPORT_COUNT: 0,
  MIN_DISTANCE_FROM_SPAWN: 18,
  MIN_DISTANCE_BETWEEN_PICKUPS: 16,
  ARROW_BUNDLE_GAIN: 3,
} as const;

// --- Round Pacing ---
export const PACING = {
  BASE_ROUND_TIME: 150,
  TIME_PER_EXTRA_PLAYER: 15,
  ZONE_ACTIVATION: 0.7,       // elapsed fraction
  ZONE_FINAL_RADIUS_FRACTION: 0.45,
  ZONE_OUTSIDE_GRACE: 15,
  STARTING_ARROWS: 7,
  TELEPORT_ARROWS_PER_ROUND: 7,
  ROUNDS_TO_WIN: 3,
  FLETCH_DURATION_SECONDS: 2,
  FLETCH_ARROWS_GAINED: 1,
} as const;
