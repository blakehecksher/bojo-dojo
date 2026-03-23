import type { HeightmapData, Vec3 } from '@bojo-dojo/common';
import { hasLineOfSight, SPAWN } from '@bojo-dojo/common';
import type { PlayerInfo } from '../Room';
import { computeFiringSolution, applyAimSpread } from './ballistics';

export interface BotAction {
  type: 'fire' | 'look' | 'idle';
  direction?: Vec3;
  force?: number;
  arrowType?: 'normal' | 'teleport';
  yaw?: number;
  pitch?: number;
}

const AIM_SPREAD_DEG = 2;
const MIN_FIRE_DELAY_TICKS = 1;   // 0.5s at 500ms tick
const MAX_FIRE_DELAY_TICKS = 4;   // 2s
const BLIND_TICKS_BEFORE_TELEPORT = 6; // 3s with no visible target
const TELEPORT_COOLDOWN_TICKS = 30;    // 15s between teleports
const SCAN_SPEED = 0.3; // radians per tick

export class BotBrain {
  private blindTicks = 0;
  private fireDelayRemaining = 0;
  private currentTarget: string | null = null;
  private scanYaw = Math.random() * Math.PI * 2;
  private ticksSinceTeleport = TELEPORT_COOLDOWN_TICKS; // start ready to teleport
  private hasEverFired = false;

  constructor(
    readonly botId: string,
  ) {}

  tick(
    bot: PlayerInfo,
    allPlayers: Map<string, PlayerInfo>,
    heightmap: HeightmapData,
    spawns: Vec3[],
  ): BotAction {
    if (!bot.alive) return { type: 'idle' };

    // Find alive enemies
    const aliveEnemies = [...allPlayers.values()].filter(
      (p) => p.id !== this.botId && p.alive,
    );

    const visibleTargets: { player: PlayerInfo; dist: number }[] = [];
    for (const enemy of aliveEnemies) {
      if (hasLineOfSight(heightmap, bot.position, enemy.position)) {
        const dx = enemy.position.x - bot.position.x;
        const dz = enemy.position.z - bot.position.z;
        visibleTargets.push({ player: enemy, dist: Math.sqrt(dx * dx + dz * dz) });
      }
    }

    this.ticksSinceTeleport++;

    if (visibleTargets.length === 0) {
      this.blindTicks++;
      this.currentTarget = null;
      this.fireDelayRemaining = 0;

      // Teleport immediately on first tick if no targets visible, or after blind timeout
      const shouldTeleport = (!this.hasEverFired && this.ticksSinceTeleport >= TELEPORT_COOLDOWN_TICKS)
        || (this.blindTicks >= BLIND_TICKS_BEFORE_TELEPORT
          && this.ticksSinceTeleport >= TELEPORT_COOLDOWN_TICKS);
      if (shouldTeleport) {
        this.blindTicks = 0;
        this.ticksSinceTeleport = 0;

        const targetSpawn = spawns[Math.floor(Math.random() * spawns.length)];
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
      }

      // Scan around by slowly rotating
      this.scanYaw += SCAN_SPEED * (Math.random() > 0.5 ? 1 : -1);
      return { type: 'look', yaw: this.scanYaw, pitch: 0 };
    }

    // Has visible targets — pick nearest
    this.blindTicks = 0;
    visibleTargets.sort((a, b) => a.dist - b.dist);
    const target = visibleTargets[0].player;

    // Look at target
    const dx = target.position.x - bot.position.x;
    const dz = target.position.z - bot.position.z;
    const dy = (target.position.y + SPAWN.PLAYER_EYE_HEIGHT * 0.5) -
               (bot.position.y + SPAWN.PLAYER_EYE_HEIGHT);
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const yaw = Math.atan2(-dx, -dz); // match game's coordinate system
    const pitch = Math.atan2(dy, horizontalDist);

    // If this is a new target, start aim delay
    if (this.currentTarget !== target.id) {
      this.currentTarget = target.id;
      this.fireDelayRemaining = MIN_FIRE_DELAY_TICKS +
        Math.floor(Math.random() * (MAX_FIRE_DELAY_TICKS - MIN_FIRE_DELAY_TICKS + 1));
    }

    if (this.fireDelayRemaining > 0) {
      this.fireDelayRemaining--;
      return { type: 'look', yaw, pitch };
    }

    // Fire!
    const solution = computeFiringSolution(bot.position, target.position, heightmap);
    if (!solution) {
      // Can see them but can't compute a shot — keep looking
      return { type: 'look', yaw, pitch };
    }

    // Apply aim spread and reset delay for next shot
    const spreadDirection = applyAimSpread(solution.direction, AIM_SPREAD_DEG);
    this.fireDelayRemaining = MIN_FIRE_DELAY_TICKS +
      Math.floor(Math.random() * (MAX_FIRE_DELAY_TICKS - MIN_FIRE_DELAY_TICKS + 1));
    this.hasEverFired = true;

    return {
      type: 'fire',
      direction: spreadDirection,
      force: solution.force,
      arrowType: 'normal',
    };
  }
}
