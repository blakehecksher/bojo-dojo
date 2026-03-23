# State
_Last updated: 2026-03-23_

## Current focus
AI bot players implemented. Showcase attract mode plays behind the menu screen. Spectate button lets users watch fullscreen. UI cleanup in progress for menu/spectate transitions.

## What's working
- Multiplayer: create/join rooms, share links, auto-rejoin, disconnect grace period (10s)
- AI bots: server-side BotBrain with LOS targeting, inverse ballistics solver, aim spread, teleport repositioning
- Showcase room: lazy bot match (6 bots) runs only when spectators connected, auto-restarts rounds/matches
- Client attract mode: bot match renders behind frosted-glass menu, Spectate button for fullscreen orbital view
- Showcase scoreboard: color dots with round wins, visible only during spectate
- Teleport arrows now hit/kill players they pass through
- Player limit raised from 4 to 6
- Minimap with topographic contour lines, player position, arrow trails, debug mode (F3)
- Spectator mode with bird's-eye orbit camera after elimination
- Bow model with correct draw animation (limbs bend toward player on draw)
- Shield glow overlay, unlimited ammo
- Deferred arrow hit timing — hits register at trajectory intersection, not on landing
- Lobby UX: how-to-play tips, name/color/code labels, share link
- Offline practice mode
- Builds and type-checks cleanly

## In progress
- Menu/spectate UI polish: hiding gameplay elements (bow, thumbstick, minimap) when on menu screen

## Known issues
- Playwright is too heavy on this machine — use `tsc --noEmit` and `pnpm build` for verification
- Build emits a >500 kB client chunk warning
- Vite HMR doesn't always cleanly swap modules — hard refresh sometimes needed

## Deployment workflow
**IMPORTANT:** The client `.env` points to a deployed PartyKit server (`bojo-dojo.blakehecksher.partykit.dev`). After ANY change to server or common packages, you MUST redeploy:

```
pnpm --filter @bojo-dojo/server exec partykit deploy
```

Client is tested locally with `pnpm dev` (vite). Do not deploy client unless explicitly asked.

## Next actions
1. Verify menu/spectate UI cleanup on phone (thumbstick, bow, minimap hidden on menu)
2. Consider bot difficulty settings or behavior variety
3. Polish: bot name labels visible in spectate, kill feed

## How to verify
1. `pnpm --filter @bojo-dojo/client exec tsc --noEmit`
2. `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
3. `pnpm --filter @bojo-dojo/server exec partykit deploy` (if server/common changed)
4. `pnpm dev` — open on phone, verify bot match behind menu, spectate mode works, no stray UI elements

## Recent logs
- docs/log/2026-03-23 AI Bot Players.md — Bot AI, showcase attract mode, spectate view, teleport kill fix, 6-player support
- docs/log/2026-03-23 Playtest Polish and Bow Fix.md — Minimap, spectator mode, bow fix, deferred hit timing, UI/UX polish
- docs/log/2026-03-17 Debug Terrain Loading.md — Diagnosed terrain failure as stale deployed server, fixed worldKey race condition
