# State
_Last updated: 2026-03-15_1600_

## Current focus
Phase 1 — Playable Core implementation complete. All 7 implementation chunks built and type-checking clean.

## What's working
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
- Chunk 8: PWA manifest, GitHub Pages deployment, polish items

## Known issues
- No real sound effects yet (uses generated sine tones as placeholders)
- PartyKit server not yet deployed (dev-only on localhost:1999)
- No PWA manifest or service worker yet
- Vertex color randomization in TerrainMesh uses Math.random() (visual only, not gameplay-affecting)

## Next actions
1. Add PWA manifest + service worker (vite-plugin-pwa)
2. Deploy frontend to GitHub Pages, server to PartyKit
3. Add orientation lock + fullscreen on game start
4. Source real sound effects (Blake's responsibility per spec)
5. Playtest on real phone — tune input sensitivity, terrain params, arrow physics

## How to verify
1. `cd packages/client && pnpm dev` — opens Vite dev server
2. Open on phone via LAN IP in landscape
3. See procedural terrain with trees/rocks
4. Swipe to look, thumbstick to fine-aim
5. Pull slider to draw bow, see trajectory preview, release to fire
6. Find enemy marker, hit it, see "Hit!" screen
7. For multiplayer: also run `cd packages/server && npx partykit dev`

## Recent logs
- docs/log/2026-03-15 1600 Phase1 Implementation.md — Initial implementation of all Phase 1 chunks
