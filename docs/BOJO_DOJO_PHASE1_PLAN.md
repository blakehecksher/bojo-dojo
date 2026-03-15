# Bojo Dojo — Phase 1 Implementation Plan

## Context

Bojo Dojo is a mobile-first multiplayer archery duel — players spawn at fixed positions on procedurally generated terrain and eliminate each other with bow and arrow. No movement, just aim, shoot, and read the battlefield. This is a greenfield project with zero existing code — only a detailed spec (`docs/spec.md`) and project workflow docs exist.

Phase 1 ("Playable Core") gets two players into a room, onto the same generated map, shooting arrows at each other on their phones. Everything is built with Three.js primitives, PartyKit networking, and HTML overlay HUD.

---

## Project Structure

pnpm monorepo with 3 packages:

```
bojo-dojo/
  package.json              # pnpm workspace root
  pnpm-workspace.yaml
  tsconfig.base.json

  packages/
    common/                 # Shared deterministic logic (types, physics, terrain gen)
      src/
        types.ts            # Message types (discriminated unions), Vec3, game state types
        constants.ts        # All tuning params from spec (physics, terrain, pacing)
        physics/
          trajectory.ts     # Ballistic arc computation (used by client preview + server validation)
          hit-detection.ts  # Trajectory-vs-cylinder intersection
        terrain/
          noise.ts          # Seeded Simplex wrapper (deterministic PRNG)
          heightmap.ts      # Heightmap generation from seed + params
          spawn.ts          # Farthest-point sampling, slope filter, LOS validation

    client/                 # Three.js renderer, input, HUD, networking client
      index.html            # Entry point with landscape viewport meta
      vite.config.ts
      public/audio/         # Placeholder sound files
      src/
        main.ts             # Init renderer, game loop, wire everything
        game/
          Game.ts           # State machine: MENU -> LOBBY -> PLAYING -> ROUND_END
          Round.ts          # Single round lifecycle (timer, arrow count, win condition)
        renderer/
          SceneManager.ts   # Three.js scene/camera/renderer, 30fps cap, resize
          TerrainMesh.ts    # Heightmap -> flat-shaded mesh with elevation vertex colors
          SkyBox.ts         # Gradient sky background
          ObstaclePlacer.ts # InstancedMesh trees (cone+cylinder) and rocks (dodecahedron)
          BowModel.ts       # First-person bow group (camera child), animates with draw
          ArrowModel.ts     # Arrow mesh, flight animation along trajectory, sticks on land
          PlayerMarker.ts   # Enemy player visual (colored cylinder + sphere head)
          TrajectoryLine.ts # Dashed line showing 30% of predicted arc
        input/
          InputManager.ts   # Pointer ID claim system for multi-touch routing
          SwipeCamera.ts    # Center-screen drag -> camera rotation
          Thumbstick.ts     # Left-side virtual stick -> fine aim (15 deg/sec max)
          PullSlider.ts     # Right-side vertical drag -> bow draw force, fire on release
        hud/
          HUD.ts            # HTML overlay container
          Crosshair.ts      # Centered crosshair
          ArrowCounter.ts   # Arrow count display
          Timer.ts          # Round timer
          InventorySlots.ts # Bottom-center slots
        audio/
          AudioManager.ts   # Web Audio API, preload, distance-based volume
        network/
          PartySocket.ts    # PartyKit client connection, JSON messages, auto-reconnect
          RoomManager.ts    # Create/join room, lobby state
        screens/
          MenuScreen.ts     # Create / Join buttons
          LobbyScreen.ts    # Room code, player list, start button
          RoundEndScreen.ts # Round result overlay

    server/                 # PartyKit server — room logic + hit detection
      partykit.json         # PartyKit config (main entry, compatibility flags)
      src/
        server.ts           # Party class: onConnect, onMessage, onClose
        Room.ts             # Room state: players, seed, heightmap, spawns, scores
        GameLoop.ts         # Round timer, TIMER_SYNC, round-end detection
        HitValidator.ts     # Trajectory computation + hit check on ARROW_FIRED
```

### What changed from raw WebSocket to PartyKit

PartyKit provides room management, connection handling, and message routing out of the box. Each PartyKit "room" is an isolated server instance with its own state — no need to manually manage a room registry, connection lifecycle, or message dispatch.

- **Removed:** `index.ts` (HTTP + WS server boilerplate), `RoomManager.ts` (PartyKit handles room creation/joining via URL path), `MessageRouter.ts` (message dispatch is just a switch in `onMessage`), `Player.ts` (connection state tracked by PartyKit's `Connection` objects)
- **Kept:** `Room.ts` (game state logic), `GameLoop.ts` (round timing), `HitValidator.ts` (server-authoritative hit detection)
- **Added:** `partykit.json` (config), `server.ts` (single Party class entry point)

The Party class in `server.ts` looks roughly like:

```typescript
import type { Party, Connection } from "partykit/server";

export default class BojoDojo implements Party {
  room: RoomState;

  onConnect(conn: Connection) { /* assign player, send seed + spawn */ }
  onMessage(message: string, sender: Connection) { /* switch on type, validate, broadcast */ }
  onClose(conn: Connection) { /* remove player, check round state */ }
}
```

Client connects via `PartySocket` (PartyKit's client library — drop-in WebSocket replacement with auto-reconnect and room ID in URL path):

```typescript
import PartySocket from "partysocket";

const socket = new PartySocket({
  host: PARTYKIT_HOST,
  room: roomCode,
});
```

Room creation is implicit — connecting to a room ID that doesn't exist creates it. Joining is connecting to the same room ID. No custom handshake needed.

---

## Key Architecture Decisions

1. **Common package for determinism** — terrain gen and trajectory math live in `common/` so client and server produce identical results from the same seed
2. **HTML overlay HUD** — not WebGL text. Simpler, standard CSS, reliable touch zones
3. **Pointer ID claim for multi-touch** — each `pointerId` assigned to one handler (thumbstick, slider, or swipe) on `pointerdown`, preventing conflicts
4. **Optimistic local + server-authoritative** — client animates arrow immediately on fire; server independently computes trajectory and decides hit/miss
5. **JSON messages** — messages are tiny (<200 bytes), debuggability beats binary encoding overhead
6. **30fps cap** — no continuous movement, 60fps wastes battery for zero gameplay benefit
7. **InstancedMesh for obstacles** — one draw call for all trees, one for all rocks, critical for mobile GPU
8. **Seeded PRNG everywhere** — `simplex-noise` with mulberry32 PRNG, no `Math.random()` in deterministic paths
9. **PartyKit for networking** — managed WebSocket rooms on Cloudflare edge. No custom server infrastructure, no NAT/STUN issues, free tier covers friends-playing-together scale

---

## Implementation Chunks

### Chunk 1: Scaffolding + Terrain on Screen
**Goal:** Open a URL on phone, see procedurally generated 3D terrain, swipe to look around.

- Init pnpm workspace, `package.json` files, `tsconfig.json` files
- Vite setup for client with landscape viewport meta, full-viewport CSS, `touch-action: none`
- `common/terrain/noise.ts` — seeded Simplex wrapper
- `common/terrain/heightmap.ts` — 100x100 Float32Array from seed
- `common/constants.ts` — terrain + physics tuning params (use values from spec Tuning Parameters section)
- `client/renderer/SceneManager.ts` — Three.js boilerplate, camera (FOV ~70), lights, 30fps loop
- `client/renderer/TerrainMesh.ts` — heightmap to flat-shaded PlaneGeometry with elevation vertex colors
- `client/renderer/SkyBox.ts` — gradient sky
- `client/renderer/ObstaclePlacer.ts` — InstancedMesh trees + rocks via seeded Poisson-ish placement
- `client/input/SwipeCamera.ts` — basic touch drag rotates camera
- Wire in `main.ts`

**Test:** Phone landscape, see green hills + trees + rocks, swipe 360 degrees.

---

### Chunk 2: Input System + HUD
**Goal:** Full multi-touch input (thumbstick + pull slider + swipe camera) and basic HUD elements.

- `client/input/InputManager.ts` — pointer ID claim/dispatch system
- `client/input/Thumbstick.ts` — HTML overlay circle, dead zone 15%, outputs aim delta (max 15°/sec)
- `client/input/PullSlider.ts` — vertical track, drag-down draws, release fires, bottom 20% cancel zone
- Refine `SwipeCamera.ts` to only handle unclaimed center touches (0.3°/px sensitivity)
- `client/hud/HUD.ts` — overlay container with pointer-events routing
- `client/hud/Crosshair.ts`, `ArrowCounter.ts`, `Timer.ts`, `InventorySlots.ts`

**Test:** Thumbstick fine-aims, pull slider gives visual feedback, swipe rotates camera, all work simultaneously via multi-touch.

---

### Chunk 3: Bow + Shooting (Single-Player, Local)
**Goal:** Draw bow, see trajectory preview, fire arrow, watch it arc and stick into terrain.

- `common/physics/trajectory.ts` — ballistic arc function (origin, direction, speed, gravity -> Vec3 array). Min speed 20 m/s, max 80 m/s, gravity 9.8 m/s²
- `client/renderer/BowModel.ts` — camera-child group, Minecraft-style placement, string animates with draw force
- `client/renderer/TrajectoryLine.ts` — dashed THREE.Line showing 30% of arc, updates per frame while drawing
- `client/renderer/ArrowModel.ts` — shaft + head primitives, flight animation, sticks on landing (0.3m arrow hitbox radius)
- Wire PullSlider fire -> compute trajectory -> spawn arrow -> animate -> land
- Arrow count: start at 5, decrement on fire, block at 0

**Test:** Draw bow on phone, see trajectory preview, adjust aim while drawing, release, arrow flies and sticks. Five shots then empty.

---

### Chunk 4: Spawns + Player Markers + Hit Detection (Local)
**Goal:** Dummy enemy on map, shoot it and trigger kill.

- `common/terrain/spawn.ts` — farthest-point sampling with slope filter (max 15°) + LOS validation via heightmap raycast. Min spawn distance ~80m for 2-player map, 20m edge buffer
- `common/physics/hit-detection.ts` — trajectory-vs-cylinder intersection (0.5m radius, 1.8m height player hitbox)
- `client/renderer/PlayerMarker.ts` — colored cylinder + sphere, placed at spawn
- Place camera at spawn[0], dummy at spawn[1]
- Local hit detection on fire -> "HIT!" feedback
- `client/game/Round.ts` — 90s timer, detects hit or timeout
- `client/screens/RoundEndScreen.ts` — overlay with result

**Test:** Spawn, find enemy pillar, aim and hit it, see victory screen. Timer counts down.

---

### Chunk 5: Audio
**Goal:** Bow and arrow sounds with distance-based volume.

- `client/audio/AudioManager.ts` — Web Audio API, preload buffers, `play(id, {position?, listener?})`, distance attenuation, mobile audio unlock on first gesture
- Placeholder audio files in `public/audio/` (stub with generated tones or silent files — real sounds sourced by Blake later, see spec External Dependencies section)
- Wire: draw -> bow-draw sound, release -> bow-release, land -> arrow-land (distance-scaled), near-miss -> arrow-whiz

**Test:** Hear draw, twang, thud (louder nearby, quieter far).

*Can run in parallel with Chunks 4-6.*

---

### Chunk 6: PartyKit Server + Room System
**Goal:** Two phones join the same room, see each other on the same generated terrain.

- `server/partykit.json` — config with entry point
- `server/src/server.ts` — Party class with `onConnect`, `onMessage`, `onClose`
- `server/src/Room.ts` — room state: players map, seed, heightmap cache, spawn assignments, scores
- `onConnect`: assign player ID, if room not started store connection. On lobby start: generate seed, run spawn algorithm from `common/terrain/spawn.ts`, broadcast MAP_SEED + SPAWN_ASSIGNMENT to all clients
- `client/network/PartySocket.ts` — PartyKit client connection (`partysocket` package), JSON messaging
- `client/network/RoomManager.ts` — create room (generate code, connect to room ID), join room (enter code, connect)
- `client/screens/MenuScreen.ts` — Create / Join buttons
- `client/screens/LobbyScreen.ts` — room code display, player list, start button (host only)
- Flow: Menu -> Create/Join -> Lobby -> Start -> MAP_SEED + SPAWN_ASSIGNMENT -> both clients generate same terrain
- Dev workflow: `npx partykit dev` for server, `pnpm dev` for Vite client, test on phone via local network IP or ngrok

**Test:** Two phones, create room, join with code, start, both see same terrain with each other's player marker.

---

### Chunk 7: Networked Shooting + Server-Authoritative Hits
**Goal:** Full networked gameplay — shoot arrows others see, server validates kills, scoring works.

- `server/src/HitValidator.ts` — on ARROW_FIRED: compute trajectory using `common/physics/trajectory.ts`, check player intersections using `common/physics/hit-detection.ts`, check terrain intersection, broadcast ARROW_LANDED (anonymized — no playerId) and PLAYER_HIT if applicable
- `server/src/GameLoop.ts` — round timer with TIMER_SYNC every 10s, round-end detection (one player left or timeout), first-to-3 match lifecycle, ROUND_START / ROUND_END broadcasts
- Client handles: ARROW_LANDED (spawn anonymous arrow at position), PLAYER_HIT (death/kill feedback), ROUND_END (scores overlay), ROUND_START (reset state)
- Server relays ARROW_FIRED to other clients (not sender) — they animate arrow flight locally from same params
- Time-expired with multiple alive = draw, no points

**Test:** Two phones play a full best-of-3 match. Arrows visible to both players. Hits confirmed by server. Scores tracked. Match winner declared.

---

### Chunk 8: Deployment + PWA + Polish
**Goal:** Deployed, installable, handles edge cases, feels like a real game.

- **GitHub Pages deployment:** Vite build outputs to `dist/`, GitHub Actions workflow builds and deploys to Pages on push to main
- **PartyKit deployment:** `npx partykit deploy` — deploys server to Cloudflare edge. Client config switches `PARTYKIT_HOST` between `localhost:1999` (dev) and deployed PartyKit URL (prod) via Vite env vars
- `manifest.json` — name, icons, display: "fullscreen", orientation: "landscape"
- Service worker via `vite-plugin-pwa`
- `screen.orientation.lock('landscape')` with fallback
- Fullscreen request on game start
- Visibility change handling (pause on background)
- PartySocket auto-reconnect handles mid-round disconnects
- Loading screen during terrain gen
- Share button in lobby (copy room link to clipboard — link format: `https://<github-pages-url>?room=<code>`)
- Performance audit: frame times, instanced mesh optimization

**Test:** Access deployed GitHub Pages URL on phone, add to home screen, opens fullscreen landscape, create room, share link, friend joins, complete a match smoothly at 30fps.

---

## Dependency Graph

```
Chunk 1 (Terrain)
  -> Chunk 2 (Input + HUD)
    -> Chunk 3 (Bow + Shooting)
      -> Chunk 4 (Spawns + Hits)  ── Chunk 5 (Audio, parallel)
        -> Chunk 6 (PartyKit + Rooms)
          -> Chunk 7 (Networked Play)
            -> Chunk 8 (Deploy + PWA + Polish)
```

## Verification

After each chunk, test on a real phone in landscape:
- **Chunk 1:** See terrain, swipe to look around
- **Chunk 2:** Multi-touch thumbstick + slider + swipe
- **Chunk 3:** Fire arrows, see them fly and land
- **Chunk 4:** Hit the dummy enemy target
- **Chunk 5:** Hear bow/arrow sounds
- **Chunk 6:** Two devices join same room, see same map
- **Chunk 7:** Two devices play a full best-of-3 match
- **Chunk 8:** Deployed to GitHub Pages + PartyKit, PWA install, fullscreen, stable performance

Dev workflow: `npx partykit dev` for server (port 1999), `pnpm dev` for Vite client. Test on phone via local network IP or ngrok.
