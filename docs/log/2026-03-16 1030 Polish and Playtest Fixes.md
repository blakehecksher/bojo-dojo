# 2026-03-16 1030 Polish and Playtest Fixes

## TL;DR
- What changed: Major visual/feel polish pass, then iterative fixes from mobile playtesting
- Why: Game felt clunky — 30fps, no animations, dead controls, invisible bow on mobile, backwards pull slider, hard-to-see trajectory
- What didn't work: Camera momentum was a bad idea for a precision aiming game (removed after playtest). Bow was invisible on mobile due to depth buffer precision and portrait aspect ratio pushing it off-screen.
- Next: Server-authority gaps (shot validation, ammo enforcement), spec alignment items from review

---

## Full notes

### Polish pass (first batch)
- **60 FPS**: Removed 30fps throttle, render loop at native refresh rate
- **Antialiasing**: Enabled on WebGLRenderer
- **Tone mapping**: ACES filmic at 1.1 exposure
- **Bow model**: Added idle sway (figure-eight) and fire recoil (upward kick with cubic ease-out)
- **Crosshair**: Shrinks and glows warm gold during bow draw
- **Arrow trails**: 12-segment fading trail during flight, fades after landing
- **Player markers**: Idle bob animation, white flash on hit before hiding
- **Screen transitions**: All screens fade in/out with 0.3s transitions
- **Button states**: Hover/active with scale, background shift, glow on all buttons
- **Round end**: Title scales in with spring overshoot
- **Arrow counter**: Pops on decrement, yellow at 2 remaining, red at 0
- **Timer**: Pulses and glows red at ≤10 seconds
- **Thumbstick**: Spring snap-back animation on release
- **Audio**: All placeholder tones regenerated with harmonics, noise, and shaped envelopes

### Playtest feedback fixes
- **Pull slider redesign**: Old design had no visible affordance. New design has always-visible handle at top of track with down-arrow icon. Drag down to draw, fill follows top-to-bottom, snaps back on release.
- **Trajectory preview**: Changed from faint dashed line to solid white line (0.8 opacity) with gold dot markers every 5th point for depth perception.
- **Camera momentum removed**: Was causing aim drift after finger release. Camera now stops precisely. Precision > cinematic feel for an aiming game.
- **Bow rendering on mobile**: Three fixes layered:
  1. Made geometry 2-3x chunkier (limbs 0.04 wide, grip 0.05)
  2. Added `depthTest: false` + `renderOrder: 999` on all bow meshes (standard FPS viewmodel technique — prevents mobile depth buffer precision issues)
  3. Added aspect-ratio-aware positioning — in portrait mode (aspect < 1), bow shifts inward (x: 0.28→0.12) and lower (y: -0.15→-0.22) so it stays on screen
- **Bow orientation fixed**: String and draw direction were backwards. String anchors moved to player-facing side (+Z), draw pulls toward player instead of away.

### Files changed
- `packages/client/src/renderer/SceneManager.ts` — 60fps, AA, tone mapping
- `packages/client/src/renderer/BowModel.ts` — chunkier, depthTest off, renderOrder, portrait positioning, orientation fix
- `packages/client/src/renderer/ArrowModel.ts` — trail system
- `packages/client/src/renderer/TrajectoryLine.ts` — solid line + dot markers
- `packages/client/src/renderer/PlayerMarker.ts` — idle bob, hit flash
- `packages/client/src/input/SwipeCamera.ts` — removed momentum
- `packages/client/src/input/PullSlider.ts` — complete UX redesign
- `packages/client/src/input/Thumbstick.ts` — snap-back animation
- `packages/client/src/hud/Crosshair.ts` — draw feedback
- `packages/client/src/hud/ArrowCounter.ts` — pop, color warnings
- `packages/client/src/hud/Timer.ts` — pulse animation
- `packages/client/src/screens/MenuScreen.ts` — transitions, button states
- `packages/client/src/screens/LobbyScreen.ts` — transitions, button states
- `packages/client/src/screens/RoundEndScreen.ts` — scale-in animation
- `packages/client/src/audio/AudioManager.ts` — richer tones, ui-click
- `packages/client/src/game/Game.ts` — wiring for all the above
