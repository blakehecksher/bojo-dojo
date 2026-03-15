# State
_Last updated: 2026-03-15_1800_

## Current focus
Phase 1 complete — all 8 chunks built. Chunk 8 (PWA, polish, deployment config) just finished. Awaiting GitHub Pages + PartyKit deployment.

## What's working
- Playwright test suite (17 tests, 16 green, 1 flaky) — `pnpm test` or `pnpm test:ui`
  - Smoke: page load, canvas, HUD, no JS errors, theme-color, loading screen
  - Gameplay: round state, arrow counter, fire-via-pointer-sim, spawn distance, menu, URL room code, lobby share button
- PWA manifest + service worker (vite-plugin-pwa, auto-update)
- Fullscreen + landscape orientation lock on first tap
- Loading screen during terrain generation
- Visibility change handling (pause/resume render loop + round timer)
- Share link button in lobby (copies URL with ?room=CODE)
- URL ?room=XXXX pre-fills join code in menu
- GitHub Actions deploy workflow (.github/workflows/deploy.yml)
- Procedural terrain generation (seeded Simplex noise, flat-shaded, elevation vertex colors)
- Trees and rocks via InstancedMesh (seeded Poisson placement)
- Swipe camera (360 horizontal, +/-90 vertical)
- Virtual thumbstick (fine aim, 15 deg/sec, dead zone)
- Pull slider (bow draw, cancel zone, fire on release)
- First-person bow model with draw animation
- Trajectory preview (30% of arc, dashed line)
- Arrow flight animation along ballistic arc
- Arrow sticks in terrain on landing
- Spawn point generation (farthest-point sampling, slope filter, LOS validation)
- Player markers (colored cylinder + sphere)
- Hit detection (trajectory vs cylinder intersection)
- Round timer with countdown
- Round end screen with tap-to-restart
- Audio system with placeholder tones (distance-based volume)
- PartyKit server with room management, server-authoritative hit detection
- Client networking (GameConnection, menu/lobby screens)
- Game state machine (menu -> lobby -> playing, plus offline single-player)

## In progress
- Deploying to GitHub Pages + PartyKit

## Known issues
- No real sound effects yet (uses generated sine tones as placeholders)
- PartyKit server not yet deployed (dev-only on localhost:1999)
- Spawn distance test occasionally flaky (algorithm relaxes minimum distance as fallback)
- Vertex color randomization in TerrainMesh uses Math.random() (visual only, not gameplay-affecting)

## Next actions
1. Deploy frontend to GitHub Pages (enable Pages in repo settings, set source to GitHub Actions)
2. Deploy PartyKit server (`cd packages/server && npx partykit deploy`)
3. Set PARTYKIT_HOST repo variable in GitHub to deployed PartyKit URL
4. Source real sound effects (Blake's responsibility per spec)
5. Playtest on real phones with friends — tune input sensitivity, terrain, arrow physics
6. Begin Phase 2 (fletching, teleport arrows, shrinking zone, spectator mode, scoring, pickups)

## How to verify
1. `pnpm dev` — opens Vite dev server
2. Open on phone via LAN IP in landscape
3. First tap triggers fullscreen + landscape orientation lock
4. Loading screen shows during terrain generation
5. See procedural terrain with trees/rocks
6. Swipe to look, thumbstick to fine-aim
7. Pull slider to draw bow, see trajectory preview, release to fire
8. Find enemy marker, hit it, see "Hit!" screen
9. For multiplayer: also run `cd packages/server && npx partykit dev`
10. Tab away and back — round timer pauses and resumes

## Recent logs
- docs/log/2026-03-15 1800 Chunk8 PWA Polish Deploy.md — Chunk 8: PWA, polish, deployment config
- docs/log/2026-03-15 1630 Playwright Setup.md — Added Playwright; 13 smoke + gameplay tests all green
- docs/log/2026-03-15 1600 Phase1 Implementation.md — Initial implementation of all Phase 1 chunks
