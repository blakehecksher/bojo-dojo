# 2026-03-15 1600 Phase1 Implementation

## TL;DR
- What changed: Built entire Phase 1 from scratch — pnpm monorepo with common/client/server packages, all gameplay mechanics, networking
- Why: Implementing the game spec (docs/spec.md) Phase 1 — Playable Core
- What didn't work: N/A (greenfield, no prior code)
- Next: PWA/deployment (Chunk 8), real sound effects, playtesting on phone

---

## Full notes

### Chunk 1 — Scaffolding + Terrain
- pnpm workspace with 3 packages: common, client, server
- Vite + TypeScript + Three.js client
- Seeded Simplex noise terrain (100x100 grid, 200m x 200m)
- Flat-shaded mesh with elevation-based vertex colors
- InstancedMesh trees (cone+cylinder) and rocks (dodecahedron)
- Swipe camera (0.3 deg/px, YXZ euler order)

### Chunk 2 — Input + HUD
- InputManager with pointer ID claim system for multi-touch
- Thumbstick (bottom-left, 15 deg/sec, 15% dead zone)
- Pull slider (right side, bottom 20% cancel zone)
- HUD: crosshair, arrow counter, timer, inventory slots

### Chunk 3 — Bow + Shooting
- Ballistic trajectory computation (shared in common)
- First-person bow model with string draw animation
- Trajectory preview line (30% of arc, dashed)
- Arrow model with flight animation + terrain sticking

### Chunk 4 — Spawns + Hit Detection
- Farthest-point spawn sampling with slope filter + LOS validation
- Trajectory-vs-cylinder hit detection
- Player markers (colored cylinder + sphere)
- Round lifecycle (90s timer, hit/timeout end conditions)
- Round end screen overlay

### Chunk 5 — Audio
- Web Audio API with mobile unlock
- Placeholder sine tone generation
- Distance-based volume attenuation
- Wired to bow draw/release/arrow land events

### Chunk 6+7 — Networking
- PartyKit server (Party class with onConnect/onMessage/onClose)
- Room state management, server-authoritative hit validation
- GameLoop with round timer and TIMER_SYNC
- Client GameConnection (WebSocket, JSON messages)
- Menu screen (create/join), Lobby screen (room code, player list)
- Game.ts orchestrator: menu -> lobby -> playing state machine
- Offline single-player mode as default
