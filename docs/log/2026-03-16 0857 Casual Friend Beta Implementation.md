# 2026-03-16 0857 Casual Friend Beta Implementation

## TL;DR
- What changed: Implemented the core casual friend-beta feature set across `common`, `server`, and `client`, including authoritative match snapshots, shared world generation, obstacle-aware spawns, pickups, teleport/fletching/zone/spectator flows, anonymous landed arrows, rematch/new-map flow, and matching HUD/rendering updates.
- Why: The goal was to move the project from a prototype toward a shareable 2-4 player casual web game with cleaner authority boundaries and a complete match loop.
- What didn't work: Playwright was reusing stale local dev servers on port `5173`, which hid the real state of the code and caused false failures; lobby overlay hide/show timing also had a delayed-hide race.
- Next: Run real phone playtests, tune balance/readability, and add more adversarial multiplayer/server tests.

---

## Full notes

- Added shared world-layout generation in `packages/common` so spawns, obstacle exclusions, pickups, and zone config come from one source of truth.
- Updated spawn generation to account for openness and reserved spawn-clearance radius so trees/rocks do not spawn right next to players.
- Expanded shared network/message types for authoritative `MATCH_STATE`, pickups, fletching, teleport, zone updates, spectator view sync, and landed-arrow state.
- Reworked server room state and loop so rounds, scores, player inventories, teleports, shields, fletching, spectating, disconnect grace, and zone state are authoritative.
- Updated the server to broadcast reconnect-safe match snapshots, anonymous landed arrows, teleport/pickup/fletch events, and rematch/new-map state.
- Reworked the client game flow so multiplayer reconstructs from match snapshots instead of relying on loose local assumptions.
- Added pickup markers, zone ring, richer HUD actions/status, shield visualization, landed-arrow rendering, and spectator camera cycling.
- Fixed LAN/dev socket protocol selection and stabilized reconnect identity with a persistent client ID.
- Fixed a lobby screen timer race where a delayed hide could clobber a later show.
- Changed Playwright to use dedicated test ports (`4173` and `21999`) so tests do not accidentally reuse stale local dev servers.
- Verification completed:
- `pnpm test`
- `pnpm build`
- `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
- `pnpm --filter @bojo-dojo/common exec tsc --noEmit`
