# 2026-06-19 1200 Game Juice Pass

## TL;DR
- What changed: Added a full game-feel/"oomph" layer — impact effects on kills, screen feedback (vignette/hitmarker/kill banner), haptics, camera shake, bloom post-processing, ambient + combat audio, flat-shaded terrain, player name labels, and a sun in the sky.
- Why: Game worked but felt flat — the satisfying moments (kills, hits) had no payoff. Notably, the `ShardBurst`/`RingPulse` effect classes already existed in `asset-lab/` but were never wired into the live game.
- What didn't work: First build failed — `prototypePalette` is `as const`, so the effect constructors' default color params narrowed to literal types and rejected other palette colors. Fixed by annotating those params as `number`.
- Next: real SFX files; redeploy server for multiplayer kill credit; phone playtest for bloom perf + shake tuning.

---

## Full notes

### New files
- `packages/client/src/renderer/HitEffects.ts` — pools `RingPulsePrototype` + `ShardBurstPrototype`, adds their groups to the scene once, exposes `playDeath(pos)` / `playShieldBreak(pos)` and `update(dt)`.
- `packages/client/src/hud/CombatFeedback.ts` — DOM overlay: red damage vignette, center hitmarker (X), punch-in kill banner. CSS-transition driven, fire-and-forget.

### Changed
- `SceneManager.ts` — added `EffectComposer` with `RenderPass` → `UnrealBloomPass` (strength 0.55, radius 0.45, threshold 0.82) → `OutputPass`; render loop + resize now go through the composer.
- `SwipeCamera.ts` — `addTrauma(amount)` + `updateShake(dt)`; shake is pitch/yaw/roll offset scaled by trauma², decays fast. Applied only in the gameplay branch (spectator/showcase set the camera directly).
- `AudioManager.ts` — new sounds `ambient` (seamless wind loop), `kill` (rising triad sting), `hurt` (low crunch), `hitmarker` (crisp tick); `startAmbient()`/`stopAmbient()`. Ambient starts on first audio-unlock tap.
- `TerrainMesh.ts` — `flatShading: true`, removed per-vertex random color jitter → clean faceted bands.
- `SkyBox.ts` — added sun disc + warm halo to the fragment shader, aligned to the directional light direction.
- `PlayerMarker.ts` — optional `displayName` + `setName()`; canvas-texture sprite label above the head (depth-test off so it reads through terrain).
- `Game.ts` — instantiate `HitEffects`; frame loop calls `hitEffects.update` + `swipeCamera.updateShake`; `handlePlayerHit` rewritten to take `attackerId` and route victim feedback (vignette/shake/hurt/haptic) vs attacker feedback (hitmarker/kill banner/sting/haptic) + play 3D effects; recoil shake + buzz on fire (online + offline); offline enemy kill now triggers full feedback; markers created with names.
- `common/src/types.ts`, `server/src/server.ts`, `server/src/bot/ShowcaseManager.ts` — `PLAYER_HIT` now includes `attackerId` (the shooter), so the client can credit hitmarkers/kills correctly in multiplayer.
- `asset-lab/PrototypeEffects.ts` — annotated constructor `color` params as `number` (fix for the `as const` literal-narrowing build error).

### Deliberately NOT changed
- Gameplay tuning in `constants.ts`. Per the user, unlimited teleport arrows / normal arrows / shields is intentional and feels right after playtesting — the limited-resource spec doesn't match how people actually play. Left as-is.

### Verification
- `tsc --noEmit` green for common, server, client.
- `pnpm --filter @bojo-dojo/client build` succeeds (only the pre-existing >500 kB chunk warning).
