# 2026-03-16 1000 Playtest Feedback Fixes

## TL;DR
- What changed: Fixed four issues from mobile playtesting — bow not visible, pull slider backwards, trajectory hard to see, camera momentum imprecise
- Why: User tested on phone and reported specific UX problems
- What didn't work: Everything went cleanly, all 26 tests pass
- Next: Server-authority gaps (shot validation, ammo enforcement) and spec alignment items from review

---

## Full notes

### Bow rendering fix
- Bow limbs were 0.015m wide — essentially invisible on a phone screen
- Made geometry 2-3x chunkier: limbs now 0.04 wide, grip 0.05 wide
- Added dark wood tip caps at limb ends for visual definition
- Set `frustumCulled = false` on all bow meshes to prevent mobile clipping
- Adjusted rest position slightly (0.28, -0.15, -0.45) for better screen presence

### Pull slider redesign
- Old: Handle only appeared on touch, no visual cue that slider exists
- New: Handle always visible at top of track with downward-arrow icon inside
- Drag handle down to draw — fill follows from top to bottom
- Cancel zone line at 20% from top (light pull = cancel)
- Handle glows and changes color as force increases
- Snaps back to top on release

### Trajectory preview visibility
- Old: Dashed white line at 0.5 opacity — hard to read against sky/terrain
- New: Solid white line at 0.8 opacity (no dashes, clearer path)
- Added gold dot markers (0.4m size with attenuation) every 5th point for depth perception
- Much easier to judge arc and distance

### Camera momentum removed
- Old: Camera continued drifting after finger release with 0.92 decay factor
- New: Camera stops precisely where you release — critical for an aiming game
- Removed `update()` method from SwipeCamera and the frame loop call

### Files changed
- `packages/client/src/renderer/BowModel.ts` — chunkier geometry, frustumCulled off
- `packages/client/src/input/PullSlider.ts` — complete UX redesign
- `packages/client/src/renderer/TrajectoryLine.ts` — solid line + dot markers
- `packages/client/src/input/SwipeCamera.ts` — removed momentum system
- `packages/client/src/game/Game.ts` — removed swipeCamera.update() call
