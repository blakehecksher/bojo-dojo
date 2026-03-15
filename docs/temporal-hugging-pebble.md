# Bojo Dojo — Phase 1 Implementation Plan

## Context

Bojo Dojo is a mobile-first multiplayer archery duel — players spawn at fixed positions on procedurally generated terrain and eliminate each other with bow and arrow. No movement, just aim, shoot, and read the battlefield. This is a greenfield project with zero existing code — only a detailed spec (`docs/spec.md`) and project workflow docs exist.

Phase 1 ("Playable Core") gets two players into a room, onto the same generated map, shooting arrows at each other on their phones. Everything is built with Three.js primitives, WebSocket networking, and HTML overlay HUD.

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
          Connection.ts     # WebSocket client, JSON messages, auto-reconnect
          RoomManager.ts    # Create/join room, lobby state
        screens/
          MenuScreen.ts     # Create / Join buttons
          LobbyScreen.ts    # Room code, player list, start button
          RoundEndScreen.ts # Round result overlay

    server/                 # WebSocket relay + server-authoritative hit detection
      src/
        index.ts            # HTTP + WebSocket server (port 3001)
        Room.ts             # Room state: players, seed, heightmap, spawns, scores
        RoomManager.ts      # Create/join/leave, room code registry
        GameLoop.ts         # Round timer, TIMER_SYNC, round-end detection
        HitValidator.ts     # Trajectory computation + hit check on ARROW_FIRED
        MessageRouter.ts    # JSON parse, dispatch by message type
        Player.ts           # Per-connection state (id, name, ws, room ref)
```

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

---

## Implementation Chunks

### Chunk 1: Scaffolding + Terrain on Screen
**Goal:** Open a URL on phone, see procedurally generated 3D terrain, swipe to look around.

- Init pnpm workspace, `package.json` files, `tsconfig.json` files
- Vite setup for client with landscape viewport meta, full-viewport CSS, `touch-action: none`
- `common/terrain/noise.ts` — seeded Simplex wrapper
- `common/terrain/heightmap.ts` — 100x100 Float32Array from seed
- `common/constants.ts` — terrain + physics tuning params
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
- `client/input/Thumbstick.ts` — HTML overlay circle, dead zone 15%, outputs aim delta
- `client/input/PullSlider.ts` — vertical track, drag-down draws, release fires, bottom 20% cancel zone
- Refine `SwipeCamera.ts` to only handle unclaimed center touches
- `client/hud/HUD.ts` — overlay container with pointer-events routing
- `client/hud/Crosshair.ts`, `ArrowCounter.ts`, `Timer.ts`, `InventorySlots.ts`

**Test:** Thumbstick fine-aims, pull slider gives visual feedback, swipe rotates camera, all work simultaneously via multi-touch.

---

### Chunk 3: Bow + Shooting (Single-Player, Local)
**Goal:** Draw bow, see trajectory preview, fire arrow, watch it arc and stick into terrain.

- `common/physics/trajectory.ts` — ballistic arc function (origin, direction, speed, gravity -> Vec3 array)
- `client/renderer/BowModel.ts` — camera-child group, string animates with draw force
- `client/renderer/TrajectoryLine.ts` — dashed THREE.Line showing 30% of arc, updates per frame while drawing
- `client/renderer/ArrowModel.ts` — shaft + head primitives, flight animation, sticks on landing
- Wire PullSlider fire -> compute trajectory -> spawn arrow -> animate -> land
- Arrow count: start at 5, decrement on fire, block at 0

**Test:** Draw bow on phone, see trajectory preview, adjust aim while drawing, release, arrow flies and sticks. Five shots then empty.

---

### Chunk 4: Spawns + Player Markers + Hit Detection (Local)
**Goal:** Dummy enemy on map, shoot it and trigger kill.

- `common/terrain/spawn.ts` — farthest-point sampling with slope filter + LOS validation
- `common/physics/hit-detection.ts` — trajectory-vs-cylinder intersection
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
- Placeholder audio files in `public/audio/`
- Wire: draw -> bow-draw sound, release -> bow-release, land -> arrow-land (distance-scaled), near-miss -> arrow-whiz

**Test:** Hear draw, twang, thud (louder nearby, quieter far).

*Can run in parallel with Chunks 4-6.*

---

### Chunk 6: WebSocket Server + Room System
**Goal:** Two phones join the same room, see each other on the same terrain.

- `server/src/index.ts` — HTTP + WS server on 3001
- `server/src/Player.ts`, `RoomManager.ts`, `Room.ts`, `MessageRouter.ts`
- Room: generate seed, run spawn algorithm, assign spawns
- `client/network/Connection.ts` — WS client, JSON, reconnect
- `client/network/RoomManager.ts` — create/join room
- `client/screens/MenuScreen.ts` — Create / Join buttons
- `client/screens/LobbyScreen.ts` — room code, player list, start button
- Vite proxy `/ws` to localhost:3001
- Flow: Menu -> Create/Join -> Lobby -> Start -> MAP_SEED + SPAWN_ASSIGNMENT -> both clients generate same terrain

**Test:** Two phones, create room, join with code, start, both see same terrain with each other's player marker.

---

### Chunk 7: Networked Shooting + Server-Authoritative Hits
**Goal:** Full networked gameplay — shoot arrows others see, server validates kills, scoring works.

- `server/src/HitValidator.ts` — on ARROW_FIRED: compute trajectory, check player intersections, check terrain intersection, broadcast ARROW_LANDED (anonymized) and PLAYER_HIT if applicable
- `server/src/GameLoop.ts` — round timer with TIMER_SYNC every 10s, round-end detection, first-to-3 match lifecycle
- Client handles: ARROW_LANDED (spawn arrow at position), PLAYER_HIT (death/kill), ROUND_END (scores), ROUND_START (reset)
- Server relays ARROW_FIRED to other clients (not sender) — they animate locally from same params

**Test:** Two phones play a full best-of-5 match. Arrows visible to both players. Hits confirmed by server. Scores tracked. Match winner declared.

---

### Chunk 8: PWA + Polish
**Goal:** Installable, handles edge cases, feels like a real game.

- `manifest.json` — name, icons, display: "fullscreen", orientation: "landscape"
- Service worker via `vite-plugin-pwa`
- `screen.orientation.lock('landscape')` with fallback
- Fullscreen request on game start
- Visibility change handling (pause on background)
- WebSocket reconnect mid-round
- Loading screen during terrain gen
- Share button in lobby (copy room link to clipboard)
- Performance audit: frame times, instanced mesh optimization

**Test:** Add to home screen, opens fullscreen landscape, complete a match smoothly at 30fps.

---

## Dependency Graph

```
Chunk 1 (Terrain)
  -> Chunk 2 (Input + HUD)
    -> Chunk 3 (Bow + Shooting)
      -> Chunk 4 (Spawns + Hits)  ── Chunk 5 (Audio, parallel)
        -> Chunk 6 (Server + Rooms)
          -> Chunk 7 (Networked Play)
            -> Chunk 8 (PWA + Polish)
```

## Verification

After each chunk, test on a real phone in landscape:
- **Chunk 1:** See terrain, swipe to look around
- **Chunk 2:** Multi-touch thumbstick + slider + swipe
- **Chunk 3:** Fire arrows, see them fly and land
- **Chunk 4:** Hit the dummy enemy target
- **Chunk 5:** Hear bow/arrow sounds
- **Chunk 6:** Two devices join same room, see same map
- **Chunk 7:** Two devices play a full match
- **Chunk 8:** PWA install, fullscreen, stable performance

Run `pnpm dev` for client (Vite), `pnpm dev` for server (tsx watch). Test on phone via local network IP or ngrok.
