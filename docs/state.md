# State
_Last updated: 2026-03-17_

## Current focus
Multiplayer is working on target device. Ready for gameplay polish and feature work.

## What's working
- Multiplayer terrain loads and renders correctly on phone
- Offline mode works correctly
- Match snapshots, reconnect/rematch flow, pickups, fletching, teleport, spectator, and zone systems are implemented
- Playtest tuning: smaller map, 7 teleport arrows for testing, corrected bow bend direction, hidden top-left ammo counter
- Builds and type-checks cleanly

## In progress
- Debug overlay is still active (remove once stable)

## Known issues
- Playwright is too heavy on this machine — use `tsc --noEmit` and `pnpm build` for verification
- Teleport arrow count is temporarily inflated for testing
- Build emits a >500 kB client chunk warning

## Deployment workflow
**IMPORTANT:** The client `.env` points to a deployed PartyKit server (`bojo-dojo.blakehecksher.partykit.dev`). After ANY change to server or common packages, you MUST redeploy:

```
pnpm --filter @bojo-dojo/server exec partykit deploy
```

Without this, the deployed server runs stale code and the client/server protocols will mismatch. This was the root cause of the "terrain won't load" bug — the old server sent `MAP_SEED` + `SPAWN_ASSIGNMENT` but the new client expected `MATCH_STATE` with embedded world data.

To use a local server instead, comment out `VITE_PARTYKIT_HOST` in `packages/client/.env` and run `pnpm dev:server` alongside `pnpm dev`.

## How to verify
1. `pnpm build`
2. `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
3. `pnpm --filter @bojo-dojo/common exec tsc --noEmit`
4. `pnpm --filter @bojo-dojo/server exec partykit deploy` (if server/common changed)
5. Manual: open on phone, create game, join with second device, confirm terrain loads

## Recent logs
- docs/log/2026-03-17 Debug Terrain Loading.md - Diagnosed terrain failure as stale deployed server, fixed worldKey race condition, added debug overlay, redeployed
- docs/log/2026-03-16 2120 Pause After Terrain Failure.md
- docs/log/2026-03-16 2116 Terrain Visibility Fallback.md
- docs/log/2026-03-16 2112 Render Rollback and Lighter Verify.md
