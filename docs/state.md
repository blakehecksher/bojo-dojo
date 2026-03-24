# State
_Last updated: 2026-03-23_2251

## Current focus
Multiplayer spawn behavior now uses a larger spawn pool and rotates through it per round. Live PartyKit deployment still needs to be refreshed before friend matches see the fix.

## What's working
- Multiplayer room flow: create/join rooms, share links, auto-rejoin, disconnect grace period (10s)
- Match worlds now generate extra spawn slots for small player counts (2-player matches no longer only have 2 total spawn points)
- Server round start now rotates players through the spawn pool instead of random reassignment to the same small set
- AI bots/showcase mode, spectator orbit, minimap, bow/shield polish, teleport-hit behavior, and current HUD/menu functionality remain intact
- `pnpm.cmd --filter @bojo-dojo/common exec tsc --noEmit`
- `pnpm.cmd --filter @bojo-dojo/server exec tsc --noEmit`
- `pnpm.cmd --filter @bojo-dojo/client exec tsc --noEmit`
- `pnpm.cmd --filter @bojo-dojo/client build`

## In progress
- Menu/spectate UI polish on phone
- Redeploy pending for server/common changes from this session

## Known issues
- Client `.env` targets deployed PartyKit (`bojo-dojo.blakehecksher.partykit.dev`), so server/common fixes are not live until redeployed
- Playwright is still too heavy on this machine for routine verification
- Client build still warns about a >500 kB chunk

## Next actions
1. Run `pnpm --filter @bojo-dojo/server exec partykit deploy`
2. Playtest a real two-player room and confirm spawn assignments move through more than two locations across rounds
3. Continue phone UI cleanup for menu/spectate mode

## How to verify
1. `pnpm.cmd --filter @bojo-dojo/common exec tsc --noEmit`
2. `pnpm.cmd --filter @bojo-dojo/server exec tsc --noEmit`
3. `pnpm.cmd --filter @bojo-dojo/client exec tsc --noEmit`
4. `pnpm.cmd --filter @bojo-dojo/client build`
5. `pnpm --filter @bojo-dojo/server exec partykit deploy`
6. Create a 2-player multiplayer room, play several rounds, and verify spawns rotate through more than two match locations before repeating

## Recent logs
- docs/log/2026-03-23 2251 Spawn Rotation Fix.md — Added spawn pool generation and round-to-round spawn rotation for multiplayer
- docs/log/2026-03-23 Smarter Bots and Random Spawns.md — Bot personality system, gradual aim tracking, threat detection, randomized spawns with cluster mechanic
- docs/log/2026-03-23 AI Bot Players.md — Bot AI, showcase attract mode, spectate view, teleport kill fix, 6-player support
