# State
_Last updated: 2026-03-23_

## Current focus
Playtest polish complete. Game is stable with minimap, spectator mode, and corrected bow mechanics. Ready for AI bot players.

## What's working
- Multiplayer: create/join rooms, share links, auto-rejoin, disconnect grace period (10s)
- Minimap with topographic contour lines, player position, arrow trails, debug mode (F3)
- Spectator mode with bird's-eye orbit camera after elimination
- Bow model with correct draw animation (limbs bend toward player on draw)
- Shield glow overlay, unlimited ammo (no inventory/fletch UI)
- Deferred arrow hit timing (server + offline) — hits register at trajectory intersection, not on landing
- Round-boundary guards prevent stale arrows affecting new rounds
- Lobby UX: how-to-play tips, name/color/code labels, share link
- Terrain generation without edge falloff
- Offline practice mode with deferred hit timing
- Builds and type-checks cleanly

## In progress
Nothing — clean state, ready for next feature.

## Known issues
- Playwright is too heavy on this machine — use `tsc --noEmit` and `pnpm build` for verification
- Build emits a >500 kB client chunk warning
- Teleport arrow toggle button visible but teleport pickup spawns are disabled (teleport arrows still work via toggle)

## Deployment workflow
**IMPORTANT:** The client `.env` points to a deployed PartyKit server (`bojo-dojo.blakehecksher.partykit.dev`). After ANY change to server or common packages, you MUST redeploy:

```
pnpm --filter @bojo-dojo/server exec partykit deploy
```

Without this, the deployed server runs stale code and the client/server protocols will mismatch.

To use a local server instead, comment out `VITE_PARTYKIT_HOST` in `packages/client/.env` and run `pnpm dev:server` alongside `pnpm dev`.

## Next actions
1. AI bot players — server-side virtual players that navigate, aim, and fire using existing trajectory system
2. Host can add 1-3 bots from lobby
3. Bot-only spectator matches

## How to verify
1. `pnpm build`
2. `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
3. `pnpm --filter @bojo-dojo/common exec tsc --noEmit`
4. `pnpm --filter @bojo-dojo/server exec partykit deploy` (if server/common changed)
5. Manual: open on phone, create game, join with second device, confirm terrain loads and gameplay works

## Recent logs
- docs/log/2026-03-23 Playtest Polish and Bow Fix.md — Minimap, spectator mode, bow fix, deferred hit timing, UI/UX polish, unlimited ammo
- docs/log/2026-03-17 Debug Terrain Loading.md — Diagnosed terrain failure as stale deployed server, fixed worldKey race condition
- docs/log/2026-03-16 2120 Pause After Terrain Failure.md
- docs/log/2026-03-16 2116 Terrain Visibility Fallback.md
