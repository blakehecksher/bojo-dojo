# Smarter Bots and Random Spawns
_2026-03-23_

## What changed

### Bot AI overhaul
Replaced the single flat BotBrain with a personality-driven system. Three archetypes cycle through a 6-bot showcase match (2 of each):

- **Berserker** — fast aim tracking (0.5 rad/tick), wide spread, short fire delays, prioritizes nearest target
- **Marksman** — slow deliberate tracking (0.12 rad/tick), tight spread, long delays, prioritizes weak/threatened targets, high first-shot miss rate creating back-and-forth exchanges
- **Survivor** — medium tracking, threat-reactive, teleports proactively when aimed at, prioritizes whoever is shooting at them

Key behavior improvements:
- **Gradual aim tracking** — bots visibly lock onto targets over multiple ticks instead of instant snap-aiming
- **Threat detection** — bots check enemy viewYaw/viewPitch to detect when they're being aimed at
- **Weighted target selection** — scores targets by distance, threat level, and shield status instead of always nearest
- **Intentional first-shot misses** — creates exciting near-miss exchanges before kills land
- **Strategic teleporting** — Survivors flee threats, all bots avoid teleporting near enemies, pick spawn farthest from threat
- **Victory celebrations** — brief view spin after kills
- **Varied scanning** — jittery scan with direction reversals instead of constant metronome rotation
- **300ms tick rate** (was 500ms) for smoother aim tracking visuals

### Spawn randomization
- Replaced farthest-point sampling with uniform random selection from all candidates meeting minimum distance
- Reduced min distances: 35m base (was 80), +3m per extra player (was 10) — 6 players now 47m min on a 250m map
- Reduced worldWidth cap from 0.55 to 0.3
- Expanded center bias pool from 16 to 25% of candidates
- 50% chance of cluster spawns: one pair of players placed 20-50m apart for early duels
- LOS replacement pass unchanged

## Files changed
- `packages/server/src/bot/BotPersonality.ts` — NEW: personality interface + 3 presets
- `packages/server/src/bot/BotBrain.ts` — full rewrite with personality-driven behavior
- `packages/server/src/bot/BotManager.ts` — personality assignment, notifyKill(), 300ms tick
- `packages/server/src/bot/ShowcaseManager.ts` — kill notification hook
- `packages/common/src/constants.ts` — reduced spawn distance constants
- `packages/common/src/terrain/spawn.ts` — uniform random selection + cluster mechanic

## Deployed
Server redeployed via `partykit deploy`. Common package changes affect client-side spawn generation too — local dev picks it up via workspace link.
