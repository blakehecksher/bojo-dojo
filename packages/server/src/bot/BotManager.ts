import type { Vec3 } from '@bojo-dojo/common';
import type { RoomState } from '../Room';
import type { BotAction } from './BotBrain';
import { BotBrain } from './BotBrain';
import { ALL_PERSONALITIES } from './BotPersonality';
import { pickBotNames } from './botNames';

export type BotActionHandler = (botId: string, action: BotAction) => void;

export class BotManager {
  private brains = new Map<string, BotBrain>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private botCounter = 0;

  constructor(
    private room: RoomState,
    private onAction: BotActionHandler,
  ) {}

  addBot(colorIndex: number, name?: string): string {
    const id = `bot-${++this.botCounter}-${Date.now()}`;
    const displayName = name ?? `Bot ${this.botCounter}`;
    this.room.addBotPlayer(id, displayName, colorIndex);
    // Cycle through personalities so a 6-bot match gets 2 of each type
    const personality = ALL_PERSONALITIES[(this.botCounter - 1) % ALL_PERSONALITIES.length];
    this.brains.set(id, new BotBrain(id, personality));
    return id;
  }

  addBots(count: number): string[] {
    const names = pickBotNames(count);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.addBot(i % 6, names[i]));
    }
    return ids;
  }

  start() {
    this.stop();
    this.tickInterval = setInterval(() => this.tick(), 300);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /** Notify a bot brain that it scored a kill (triggers celebration) */
  notifyKill(botId: string) {
    const brain = this.brains.get(botId);
    if (brain) brain.notifyKill();
  }

  removeAllBots() {
    this.stop();
    for (const id of this.brains.keys()) {
      this.room.players.delete(id);
      delete this.room.scores[id];
      delete this.room.spawnAssignments[id];
    }
    this.brains.clear();
  }

  getBotIds(): string[] {
    return [...this.brains.keys()];
  }

  hasBots(): boolean {
    return this.brains.size > 0;
  }

  private tick() {
    if (this.room.phase !== 'playing' || !this.room.heightmap) return;

    const spawns: Vec3[] = this.room.world?.spawns ?? [];

    for (const [botId, brain] of this.brains) {
      const bot = this.room.getPlayer(botId);
      if (!bot) continue;

      const action = brain.tick(bot, this.room.players, this.room.heightmap, spawns);
      if (action.type !== 'idle') {
        this.onAction(botId, action);
      }
    }
  }
}
