# State
_Last updated: 2026-03-15_2117_

## Current focus
Multiplayer is locally reachable and test-covered, but it still needs a production cleanup pass around debug spawn settings. In parallel, the isolated `asset-lab` now covers primitive 3D, UI, and showcase prototypes without touching runtime code.

## What's working
- Deployed frontend and PartyKit server
- Game now starts at the menu, with multiplayer reachable and offline practice available from there
- HUD menu button, lobby connection state feedback, and bow rendering fixes exist in the working tree
- Playwright coverage includes multiplayer flow tests and is reported green in the latest local session log
- Isolated asset-lab prototypes compile and build cleanly while staying disconnected from the live game
- Asset lab now includes bow, pickups, props, effects, player kits, arena props, UI prototypes, and a showcase rig

## In progress
- Local multiplayer/menu changes are ahead of the last deployed state and need production validation
- `DEBUG_CLOSE_SPAWN` is still enabled for multiplayer testing and must be reviewed before production deploy
- Asset lab continues to expand, but no prototype batch has been migrated into runtime yet

## Known issues
- Debug close spawn is a testing aid and should not ship enabled
- Asset lab is intentionally not integrated into runtime yet
- Placeholder gameplay audio is still in use
- Build still emits the existing >500 kB chunk-size warning

## Next actions
1. Revert or review `DEBUG_CLOSE_SPAWN` and validate multiplayer against the deployed server with production-like spawn behavior.
2. Choose the first asset-lab integration batch, likely bow, player/readability assets, and combat effects.
3. Hold Phase 2 feature work until multiplayer is stable under real playtesting.

## How to verify
1. `pnpm dev`
2. Confirm the game starts at the menu and `Practice (Offline)` still works.
3. Create or join a multiplayer room and confirm lobby status feedback appears.
4. `pnpm test`
5. `pnpm build`
6. `packages\client\node_modules\.bin\tsc.cmd -p packages\client\tsconfig.json --noEmit`

## Recent logs
- docs/log/2026-03-15 2117 Asset Lab Expansion.md - Expanded the isolated asset lab with player, arena, UI, and showcase prototypes
- docs/log/2026-03-15 2100 Multiplayer UX Session.md - Made multiplayer reachable, added connection feedback, and built multiplayer Playwright coverage
- docs/log/2026-03-15 1957 Asset Lab Kickoff.md - Created isolated primitive asset workspace with no runtime integration
- docs/log/2026-03-15 1830 Chunk8 Deploy Session.md - Deployed, identified multiplayer UX gaps
