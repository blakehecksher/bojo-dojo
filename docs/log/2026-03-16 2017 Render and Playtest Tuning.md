# 2026-03-16 2017 Render and Playtest Tuning

## TL;DR
- What changed: Tuned the game for easier playtesting by shrinking the map, giving players 7 teleport arrows, fixing bow bend direction, hiding the duplicate top-left ammo counter, and improving spawn-view/render fallback handling.
- Why: Manual testing reported a black-looking world on spawn, the map felt too large for quick iteration, teleport testing was too slow with one arrow, and the duplicated ammo UI was noisy.
- What didn't work: A temporary verification run that executed `pnpm test` and `pnpm build` in parallel created false Playwright failures; rerunning tests on their own passed cleanly.
- Next: Validate the render/spawn fix on phones and then tune the temporary test-heavy map/teleport settings back toward final casual defaults.

---

## Full notes

- Added explicit renderer color space, sky-color scene background, and stronger ambient/hemisphere lighting so the world has a visible fallback even if sky/terrain rendering is not ideal on a device.
- Updated local camera handling so incoming `MATCH_STATE` snapshots do not keep snapping the player back to stale server positions; camera snaps now happen for spawn/round-transition/teleport style events instead.
- Added spawn-facing orientation so players start aimed toward useful space instead of whatever the default camera quaternion happened to be.
- Reduced the base map size and per-player map scaling to make short playtest matches easier to read and traverse.
- Increased `TELEPORT_ARROWS_PER_ROUND` to 7 for direct teleport testing.
- Reversed the bow limb bend direction so the draw animation reads correctly.
- Hid the top-left arrow counter and left the bottom inventory bar as the visible ammo UI.
- Verification completed:
- `pnpm test`
- `pnpm build`
- `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
- `pnpm --filter @bojo-dojo/common exec tsc --noEmit`
