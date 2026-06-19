# State
_Last updated: 2026-06-19_1200

## Current focus
"Oomph" / game-feel pass — wiring in impact juice that was missing. Combat now has hit/kill effects, screen feedback, haptics, bloom, ambient audio, and stylized terrain. Multiplayer kill feedback depends on a server redeploy (new `attackerId` field).

## What's working
- 3D hit effects: `HitEffects` manager pools the previously-unused `ShardBurstPrototype` + `RingPulsePrototype` and plays them on every kill (gold burst + shockwave) and shield break (blue shards) — in online, offline, and showcase modes
- Screen feedback (`hud/CombatFeedback.ts`): red damage vignette when hit, hitmarker on landing a shot, punch-in "ELIMINATED <name>" kill banner
- Haptics via `navigator.vibrate` on fire / hit / kill / getting hit
- Camera screen-shake on `SwipeCamera` (`addTrauma`/`updateShake`): light recoil on fire, heavy shake when hit
- Bloom post-processing (`EffectComposer` + `UnrealBloomPass` + `OutputPass`) in `SceneManager` — makes arrow glow, teleport, shields, and effects pop
- Audio: ambient wind bed (loops, starts on first tap), plus kill sting, hurt, and hitmarker tones (still procedural placeholders)
- Terrain: `flatShading` + removed per-vertex color jitter for a clean faceted low-poly look
- Floating player name labels above heads; sun disc + halo in the sky shader
- Server `PLAYER_HIT` now carries `attackerId` (used for client-side hitmarker/kill credit)
- Build green: `tsc --noEmit` for common/server/client + `client build`

## In progress
- Nothing mid-edit; pass is complete and builds.

## Known issues
- **Multiplayer kill/hitmarker feedback needs a server redeploy** — `attackerId` on `PLAYER_HIT` is a server/common change. Offline mode shows full juice without deploy.
- Audio is still synthesized placeholders. Real SFX files (freesound/mixkit) are the next big perceived-quality jump; `AudioManager.load()` already supports dropping them in.
- Bloom + pixelRatio 2 untested on a real phone for perf/battery — may need to lower bloom strength or cap pixel ratio if it drops frames.
- Client build still warns about a >500 kB chunk (pre-existing).
- Playwright still too heavy on this machine; verify via tsc/build only.

## Next actions
1. Drop in real SFX files and wire `AudioManager.load()` calls (bow, impact, whiz, kill, hurt, ambient).
2. `pnpm --filter @bojo-dojo/server exec partykit deploy` so multiplayer gets `attackerId` (kill feed / hitmarker).
3. Playtest on a real phone — check bloom perf and shake intensity; tune `addTrauma` amounts / bloom strength if needed.

## How to verify
1. `pnpm.cmd --filter @bojo-dojo/common exec tsc --noEmit`
2. `pnpm.cmd --filter @bojo-dojo/server exec tsc --noEmit`
3. `pnpm.cmd --filter @bojo-dojo/client exec tsc --noEmit`
4. `pnpm.cmd --filter @bojo-dojo/client build`
5. Run client, play offline: fire (feel recoil shake + buzz), hit the rival (hitmarker + kill banner + gold burst + ring + kill sting)
6. For multiplayer kill feedback: deploy server first, then test a 2-player room

## Recent logs
- docs/log/2026-06-19 1200 Game Juice Pass.md — Impact effects, screen feedback, haptics, bloom, ambient audio, flat-shaded terrain, name labels, sun
- docs/log/2026-03-23 2251 Spawn Rotation Fix.md — Added spawn pool generation and round-to-round spawn rotation for multiplayer
- docs/log/2026-03-23 Smarter Bots and Random Spawns.md — Bot personality system, gradual aim tracking, threat detection, randomized spawns with cluster mechanic
- docs/log/2026-03-23 AI Bot Players.md — Bot AI, showcase attract mode, spectate view, teleport kill fix, 6-player support
