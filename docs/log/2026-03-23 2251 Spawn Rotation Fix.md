# 2026-03-23 2251 Spawn Rotation Fix

## TL;DR
- What changed: Multiplayer now rotates players through a larger spawn pool instead of reshuffling only `playerCount` spawns; two-player worlds now generate extra spawn slots.
- Why: Friend matches only had two spawn points in a two-player room, and round restarts were random reassignment rather than an actual cycle.
- What didn't work: `apply_patch` would not update `packages/common/src/world/layout.ts`, so that file had to be edited via elevated PowerShell. In-sandbox Vite build also hit `spawn EPERM` and had to be rerun outside the sandbox.
- Next: Redeploy PartyKit so live multiplayer uses the new server/common code, then test a real two-player room across several rounds.

---

## Full notes

- Added shared spawn-pool sizing so the world generator can create more spawn points than active players.
- Kept pickup counts tied to active player count, not total spawn slots, so two-player matches do not accidentally inherit four-player pickup density.
- Replaced server-side round-start spawn shuffling with a rotating window over a shuffled spawn pool.
- Added a lightweight Playwright assertion that a two-player offline world now has more than two spawn slots available.
- Verified with:
  - `pnpm.cmd --filter @bojo-dojo/common exec tsc --noEmit`
  - `pnpm.cmd --filter @bojo-dojo/server exec tsc --noEmit`
  - `pnpm.cmd --filter @bojo-dojo/client exec tsc --noEmit`
  - `pnpm.cmd --filter @bojo-dojo/client build` (outside sandbox after `spawn EPERM`)
