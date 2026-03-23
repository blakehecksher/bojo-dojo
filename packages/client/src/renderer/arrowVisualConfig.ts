/**
 * Arrow visual configuration — tweak these values to adjust
 * how arrows look in-flight and when landed.
 *
 * All sizes are in meters. Colors are hex numbers.
 */
export const ARROW_VISUAL = {
  // --- Shaft ---
  SHAFT_LENGTH: 1.4,
  SHAFT_RADIUS: 0.06,
  SHAFT_SEGMENTS: 6,

  // --- Arrowhead ---
  HEAD_LENGTH: 0.22,
  HEAD_RADIUS: 0.12,
  HEAD_SEGMENTS: 6,

  // --- In-flight scale multiplier (makes arrows bigger while airborne) ---
  FLIGHT_SCALE: 2.5,

  // --- Colors ---
  SHAFT_COLOR_REMOTE: 0xc8a86e,
  SHAFT_COLOR_LOCAL: 0xddb870,
  HEAD_COLOR: 0x333333,

  // --- Trail ---
  TRAIL_LENGTH: 32,
  TRAIL_FADE_SPEED: 2,
  TRAIL_COLOR_R: 1.0,
  TRAIL_COLOR_G: 0.95,
  TRAIL_COLOR_B: 0.6,
  TRAIL_MAX_OPACITY: 0.85,

  // --- Glow sprite (emissive disc behind the arrowhead for long-range visibility) ---
  GLOW_ENABLED: true,
  GLOW_SIZE: 1.8,
  GLOW_COLOR: 0xffee88,
  GLOW_OPACITY: 0.45,
} as const;
