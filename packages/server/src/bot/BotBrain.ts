import type { HeightmapData, Vec3 } from '@bojo-dojo/common';
import { hasLineOfSight, SPAWN } from '@bojo-dojo/common';
import type { PlayerInfo } from '../Room';
import { computeFiringSolution, applyAimSpread } from './ballistics';
import type { BotPersonality } from './BotPersonality';

export interface BotAction {
  type: 'fire' | 'look' | 'idle';
  direction?: Vec3;
  force?: number;
  arrowType?: 'normal' | 'teleport';
  yaw?: number;
  pitch?: number;
}

/** Angle threshold (radians) — aim must be this close to target before firing */
const AIM_LOCK_THRESHOLD_RAD = 4 * (Math.PI / 180); // ~4 degrees

/** Cone half-angle (radians) for detecting if an enemy is aiming at us */
const THREAT_CONE_RAD = 20 * (Math.PI / 180);

/** Minimum distance to any alive enemy when choosing teleport destination */
const TELEPORT_SAFE_DISTANCE = 20;

export class BotBrain {
  // Smooth aim state
  private currentAimYaw: number;
  private currentAimPitch = 0;

  // Target tracking
  private currentTarget: string | null = null;
  private shotsAtCurrentTarget = 0;
  private fireDelayRemaining = 0;

  // Blind / teleport state
  private blindTicks = 0;
  private ticksSinceTeleport: number;
  private hasEverFired = false;

  // Scanning
  private scanDirection = 1;

  // Celebration
  private celebrationTicksRemaining = 0;

  // Threat tracking
  private threatId: string | null = null;

  constructor(
    readonly botId: string,
    private personality: BotPersonality,
  ) {
    this.currentAimYaw = Math.random() * Math.PI * 2;
    this.ticksSinceTeleport = personality.teleportCooldownTicks; // start ready
  }

  /** Called by BotManager when this bot gets a kill */
  notifyKill() {
    if (Math.random() < this.personality.celebrationChance) {
      this.celebrationTicksRemaining = this.personality.celebrationTicks;
    }
  }

  tick(
    bot: PlayerInfo,
    allPlayers: Map<string, PlayerInfo>,
    heightmap: HeightmapData,
    spawns: Vec3[],
  ): BotAction {
    if (!bot.alive) return { type: 'idle' };

    this.ticksSinceTeleport++;

    // --- Celebration spin ---
    if (this.celebrationTicksRemaining > 0) {
      this.celebrationTicksRemaining--;
      this.currentAimYaw += 0.5;
      return { type: 'look', yaw: this.currentAimYaw, pitch: 0 };
    }

    // --- Gather intelligence ---
    const aliveEnemies = [...allPlayers.values()].filter(
      (p) => p.id !== this.botId && p.alive,
    );

    // Build visible targets list
    const visibleTargets: { player: PlayerInfo; dist: number }[] = [];
    for (const enemy of aliveEnemies) {
      if (hasLineOfSight(heightmap, bot.position, enemy.position)) {
        const dx = enemy.position.x - bot.position.x;
        const dz = enemy.position.z - bot.position.z;
        visibleTargets.push({ player: enemy, dist: Math.sqrt(dx * dx + dz * dz) });
      }
    }

    // Detect threats — enemies whose view direction points at us
    this.threatId = null;
    for (const enemy of aliveEnemies) {
      if (this.isAimingAtUs(enemy, bot)) {
        this.threatId = enemy.id;
        break; // one threat is enough to act on
      }
    }

    // --- No visible targets ---
    if (visibleTargets.length === 0) {
      this.blindTicks++;
      this.currentTarget = null;
      this.fireDelayRemaining = 0;
      this.shotsAtCurrentTarget = 0;

      // Threat-reactive teleport (Survivors)
      if (
        this.personality.threatTeleport &&
        this.threatId &&
        this.ticksSinceTeleport >= this.personality.teleportCooldownTicks
      ) {
        return this.tryTeleport(bot, spawns, heightmap, aliveEnemies);
      }

      // Blind timeout teleport
      const shouldTeleport =
        (!this.hasEverFired && this.ticksSinceTeleport >= this.personality.teleportCooldownTicks) ||
        (this.blindTicks >= this.personality.blindTicksBeforeTeleport &&
          this.ticksSinceTeleport >= this.personality.teleportCooldownTicks);

      if (shouldTeleport) {
        return this.tryTeleport(bot, spawns, heightmap, aliveEnemies);
      }

      // Varied scanning
      const jitter = 1 + (Math.random() - 0.5) * this.personality.scanJitter;
      // Occasionally reverse scan direction
      if (Math.random() < 0.05) this.scanDirection *= -1;
      this.currentAimYaw += this.personality.baseScanSpeed * jitter * this.scanDirection;
      return { type: 'look', yaw: this.currentAimYaw, pitch: 0 };
    }

    // --- Has visible targets ---
    this.blindTicks = 0;

    // Score and select target
    const target = this.selectTarget(visibleTargets, bot);

    // Compute desired aim direction
    const dx = target.position.x - bot.position.x;
    const dz = target.position.z - bot.position.z;
    const dy =
      target.position.y +
      SPAWN.PLAYER_EYE_HEIGHT * 0.5 -
      (bot.position.y + SPAWN.PLAYER_EYE_HEIGHT);
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.atan2(dy, horizontalDist);

    // If this is a new target, reset fire delay
    if (this.currentTarget !== target.id) {
      this.currentTarget = target.id;
      this.shotsAtCurrentTarget = 0;
      this.fireDelayRemaining =
        this.personality.minFireDelayTicks +
        Math.floor(
          Math.random() *
            (this.personality.maxFireDelayTicks - this.personality.minFireDelayTicks + 1),
        );
    }

    // --- Gradual aim tracking ---
    const aimSpeed = this.personality.aimSpeedRadPerTick;
    this.currentAimYaw = lerpAngle(this.currentAimYaw, targetYaw, aimSpeed);
    this.currentAimPitch = lerpAngle(this.currentAimPitch, targetPitch, aimSpeed);

    // Check if aim is close enough to fire
    const yawError = Math.abs(angleDiff(this.currentAimYaw, targetYaw));
    const pitchError = Math.abs(angleDiff(this.currentAimPitch, targetPitch));
    const aimReady = yawError < AIM_LOCK_THRESHOLD_RAD && pitchError < AIM_LOCK_THRESHOLD_RAD;

    // Still tracking — always emit look
    if (this.fireDelayRemaining > 0) {
      this.fireDelayRemaining--;
      return { type: 'look', yaw: this.currentAimYaw, pitch: this.currentAimPitch };
    }

    if (!aimReady) {
      return { type: 'look', yaw: this.currentAimYaw, pitch: this.currentAimPitch };
    }

    // --- Fire decision ---
    const solution = computeFiringSolution(bot.position, target.position, heightmap);
    if (!solution) {
      return { type: 'look', yaw: this.currentAimYaw, pitch: this.currentAimPitch };
    }

    // Intentional miss check
    const missChance =
      this.shotsAtCurrentTarget === 0
        ? this.personality.missChanceFirst
        : this.personality.missChanceLater;
    const intentionalMiss = Math.random() < missChance;

    const spreadDeg = intentionalMiss
      ? this.personality.aimSpreadDeg + this.personality.intentionalMissSpreadDeg
      : this.personality.aimSpreadDeg;

    const spreadDirection = applyAimSpread(solution.direction, spreadDeg);

    // Set cooldown for next shot
    this.fireDelayRemaining =
      this.personality.burstCooldownTicks +
      Math.floor(Math.random() * 2); // small random jitter
    this.shotsAtCurrentTarget++;
    this.hasEverFired = true;

    return {
      type: 'fire',
      direction: spreadDirection,
      force: solution.force,
      arrowType: 'normal',
    };
  }

  // --- Private helpers ---

  private selectTarget(
    visibleTargets: { player: PlayerInfo; dist: number }[],
    bot: PlayerInfo,
  ): PlayerInfo {
    const p = this.personality;
    let bestScore = -Infinity;
    let bestTarget = visibleTargets[0].player;

    // Normalize distances for scoring (invert so closer = higher)
    const maxDist = Math.max(...visibleTargets.map((t) => t.dist), 1);

    for (const { player, dist } of visibleTargets) {
      let score = 0;
      score += p.targetWeightNearest * (1 - dist / maxDist);
      score += p.targetWeightThreat * (this.isAimingAtUs(player, bot) ? 1 : 0);
      score += p.targetWeightWeak * (player.hasShield ? 0 : 1);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = player;
      }
    }

    return bestTarget;
  }

  private isAimingAtUs(enemy: PlayerInfo, bot: PlayerInfo): boolean {
    // Compute direction from enemy to us
    const dx = bot.position.x - enemy.position.x;
    const dz = bot.position.z - enemy.position.z;
    const angleToUs = Math.atan2(-dx, -dz);

    // Compare with enemy's view yaw
    const yawDiff = Math.abs(angleDiff(enemy.viewYaw, angleToUs));
    return yawDiff < THREAT_CONE_RAD;
  }

  private tryTeleport(
    bot: PlayerInfo,
    spawns: Vec3[],
    heightmap: HeightmapData,
    aliveEnemies: PlayerInfo[],
  ): BotAction {
    this.blindTicks = 0;
    this.ticksSinceTeleport = 0;

    // Pick best teleport destination
    const targetSpawn = this.pickTeleportTarget(bot, spawns, aliveEnemies);
    if (!targetSpawn) {
      // Fallback: scan
      this.currentAimYaw += this.personality.baseScanSpeed * this.scanDirection;
      return { type: 'look', yaw: this.currentAimYaw, pitch: 0 };
    }

    const solution = computeFiringSolution(bot.position, targetSpawn, heightmap);
    if (solution) {
      this.hasEverFired = true;
      return {
        type: 'fire',
        direction: solution.direction,
        force: solution.force,
        arrowType: 'teleport',
      };
    }

    // Can't compute a teleport trajectory — scan instead
    this.currentAimYaw += this.personality.baseScanSpeed * this.scanDirection;
    return { type: 'look', yaw: this.currentAimYaw, pitch: 0 };
  }

  private pickTeleportTarget(
    bot: PlayerInfo,
    spawns: Vec3[],
    aliveEnemies: PlayerInfo[],
  ): Vec3 | null {
    // Filter to safe spawns (far enough from enemies)
    const safeSpawns = spawns.filter((spawn) => {
      const dx = spawn.x - bot.position.x;
      const dz = spawn.z - bot.position.z;
      const selfDist = Math.sqrt(dx * dx + dz * dz);
      if (selfDist < 10) return false; // don't teleport to own position

      return aliveEnemies.every((enemy) => {
        const ex = spawn.x - enemy.position.x;
        const ez = spawn.z - enemy.position.z;
        return Math.sqrt(ex * ex + ez * ez) >= TELEPORT_SAFE_DISTANCE;
      });
    });

    const candidates = safeSpawns.length > 0 ? safeSpawns : spawns;

    if (this.threatId) {
      // Defensive: pick spawn farthest from threat
      const threat = aliveEnemies.find((e) => e.id === this.threatId);
      if (threat) {
        let bestSpawn: Vec3 | null = null;
        let bestDist = -1;
        for (const spawn of candidates) {
          const dx = spawn.x - threat.position.x;
          const dz = spawn.z - threat.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d > bestDist) {
            bestDist = d;
            bestSpawn = spawn;
          }
        }
        return bestSpawn;
      }
    }

    // Default: random spawn from candidates
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }
}

// --- Utility functions ---

/** Compute shortest signed angle difference (result in -PI..PI) */
function angleDiff(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Move `current` toward `target` by at most `maxStep` radians */
function lerpAngle(current: number, target: number, maxStep: number): number {
  const diff = angleDiff(current, target);
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}
