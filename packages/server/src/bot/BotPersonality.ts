export interface BotPersonality {
  name: string;

  // Aiming — how fast the bot tracks toward a target (radians per tick)
  aimSpeedRadPerTick: number;
  // Base accuracy spread in degrees
  aimSpreadDeg: number;

  // Fire timing (ticks at 300ms each)
  minFireDelayTicks: number;
  maxFireDelayTicks: number;
  burstCooldownTicks: number;

  // Intentional miss — creates exciting near-misses and back-and-forth exchanges
  missChanceFirst: number;       // probability on first shot at a target (0-1)
  missChanceLater: number;       // probability on subsequent shots
  intentionalMissSpreadDeg: number;

  // Target selection weights (higher = more preference)
  targetWeightNearest: number;
  targetWeightThreat: number;    // enemy aiming at this bot
  targetWeightWeak: number;      // enemy without shield

  // Teleport behavior
  blindTicksBeforeTeleport: number;  // how long blind before teleporting
  teleportCooldownTicks: number;
  threatTeleport: boolean;           // teleport when threatened even if not blind

  // Scanning
  baseScanSpeed: number;         // radians per tick when scanning
  scanJitter: number;            // random multiplier range (0-1)

  // Post-kill celebration
  celebrationChance: number;     // probability of victory spin after kill
  celebrationTicks: number;      // how many ticks to spin
}

/** Fast shots, wide spread, prioritizes nearest target */
export const BERSERKER: BotPersonality = {
  name: 'Berserker',
  aimSpeedRadPerTick: 0.5,
  aimSpreadDeg: 3.5,
  minFireDelayTicks: 1,
  maxFireDelayTicks: 2,
  burstCooldownTicks: 2,
  missChanceFirst: 0.15,
  missChanceLater: 0.05,
  intentionalMissSpreadDeg: 10,
  targetWeightNearest: 5,
  targetWeightThreat: 1,
  targetWeightWeak: 1,
  blindTicksBeforeTeleport: 10,  // 3s — patient, waits it out
  teleportCooldownTicks: 50,     // 15s
  threatTeleport: false,
  baseScanSpeed: 0.4,
  scanJitter: 0.3,
  celebrationChance: 0.8,
  celebrationTicks: 3,
};

/** Patient, precise, waits for the perfect shot */
export const MARKSMAN: BotPersonality = {
  name: 'Marksman',
  aimSpeedRadPerTick: 0.12,
  aimSpreadDeg: 1.0,
  minFireDelayTicks: 4,
  maxFireDelayTicks: 7,
  burstCooldownTicks: 5,
  missChanceFirst: 0.4,
  missChanceLater: 0.1,
  intentionalMissSpreadDeg: 8,
  targetWeightNearest: 2,
  targetWeightThreat: 3,
  targetWeightWeak: 4,
  blindTicksBeforeTeleport: 7,   // 2.1s — repositions at moderate pace
  teleportCooldownTicks: 35,     // 10.5s
  threatTeleport: false,
  baseScanSpeed: 0.2,
  scanJitter: 0.2,
  celebrationChance: 0.3,
  celebrationTicks: 2,
};

/** Reactive, prioritizes threats, teleports to safety */
export const SURVIVOR: BotPersonality = {
  name: 'Survivor',
  aimSpeedRadPerTick: 0.3,
  aimSpreadDeg: 2.5,
  minFireDelayTicks: 2,
  maxFireDelayTicks: 4,
  burstCooldownTicks: 3,
  missChanceFirst: 0.25,
  missChanceLater: 0.15,
  intentionalMissSpreadDeg: 10,
  targetWeightNearest: 2,
  targetWeightThreat: 5,
  targetWeightWeak: 1,
  blindTicksBeforeTeleport: 5,   // 1.5s — quick to reposition
  teleportCooldownTicks: 25,     // 7.5s
  threatTeleport: true,          // teleports when someone aims at them
  baseScanSpeed: 0.3,
  scanJitter: 0.5,
  celebrationChance: 0.5,
  celebrationTicks: 4,
};

export const ALL_PERSONALITIES: BotPersonality[] = [BERSERKER, MARKSMAN, SURVIVOR];
