# 2026-03-15 1830 Chunk8 Deploy Session

## TL;DR
- What changed: Completed Chunk 8 (PWA, polish, deployment config), deployed to GitHub Pages + PartyKit
- Why: Get the game hosted so Blake can share it and playtest with others
- What didn't work: PartyKit deploy failed on Windows due to spaces in path ("Bojo Dojo") — fixed by upgrading partykit 0.0.111 → 0.0.115. GitHub Actions re-run failed due to duplicate artifact name — fixed with empty commit for fresh workflow run.
- Next: The multiplayer UX has major gaps — see below

---

## Full notes

### What was built (Chunk 8)
- Fullscreen + landscape orientation lock on first tap
- Visibility change handling (pause/resume render loop + round timer)
- Loading screen during terrain generation
- Share link button in lobby (copies `?room=CODE` URL)
- URL `?room=` param pre-fills join code in menu
- PWA manifest + service worker (vite-plugin-pwa)
- GitHub Actions deploy workflow
- Playwright tests: 17 total (4 new)

### Deployment
- **GitHub Pages**: live at https://blakehecksher.github.io/bojo-dojo/
- **PartyKit server**: deployed at bojo-dojo.blakehecksher.partykit.dev
- `PARTYKIT_HOST` repo variable set so client builds point to deployed server

### Critical multiplayer UX gaps
The networking *code* exists (GameConnection, MenuScreen Create/Join, LobbyScreen, PartyKit server) but the **player-facing flow is broken**:

1. **No way to reach the menu from gameplay.** `main.ts` calls `game.startOffline()` immediately, which hides the menu. There's no "Menu" button or navigation back from offline play. The menu screen exists but is inaccessible.

2. **The multiplayer flow (if you could reach it) would be:**
   - Player A taps "Create Game" → generates room code → connects to PartyKit → Lobby shows code + share button
   - Player A shares link (or code) with Player B
   - Player B opens link (or enters code + taps "Join")
   - Both see each other in lobby player list
   - Host taps "Start Match" → server sends MAP_SEED + SPAWN_ASSIGNMENT → both clients generate same terrain → ROUND_START → play

3. **Missing pieces for that flow to actually work well:**
   - A menu button/icon on the game HUD so players can access Create/Join
   - A "back to menu" option on round end (currently just restarts offline)
   - Visual/audio feedback when players connect to the lobby
   - Any indication that the server connection is alive or failed
   - Error handling if the PartyKit server is unreachable
   - The lobby "Start Match" button only appears for the host — non-host just sees "Waiting for host..." with no other context

4. **Untested in production:** The networking path has never been tested against the deployed PartyKit server. It was built against `localhost:1999` only.

---

## What needs to happen next (for the next agent)

### Priority 1: Make multiplayer reachable
The game boots into offline single-player (`main.ts` calls `game.startOffline()`) and there is **no UI to get to the menu**. Fix this:

- **Add a menu button to the HUD** (e.g. hamburger icon or "Menu" text button, top-right). Tapping it should call `game.showMenu()` which shows the MenuScreen with Create/Join options. The HUD is in `packages/client/src/hud/HUD.ts`.
- **Add "Menu" option on the round end screen** — currently `RoundEndScreen` only offers tap-to-restart (loops `startOfflineRound()`). Add a second button like "Main Menu" that calls `game.showMenu()`. See `packages/client/src/screens/RoundEndScreen.ts`.
- **When returning to menu from gameplay**, clean up the current game state (stop round timer, clear terrain, hide HUD gameplay elements). The `showMenu()` method in `packages/client/src/game/Game.ts` may need to be extended.

### Priority 2: Test and fix the multiplayer flow end-to-end
The networking code was built but never tested against the deployed PartyKit server. The intended flow:

1. Player A opens site → taps Menu → taps "Create Game" → `GameConnection.connect()` in `packages/client/src/network/PartySocket.ts` opens WebSocket to `bojo-dojo.blakehecksher.partykit.dev`
2. Server (`packages/server/src/server.ts`) handles `onConnect`, sends `ROOM_JOINED`
3. Lobby shows room code + share button (copies URL with `?room=CODE`)
4. Player B opens shared URL → code is pre-filled in join input → taps "Join"
5. Server broadcasts `PLAYER_JOINED` → lobby updates player list
6. Host taps "Start Match" → server generates seed, runs spawn algorithm, sends `MAP_SEED` + `SPAWN_ASSIGNMENT`
7. Both clients generate identical terrain → `ROUND_START` → play
8. Arrows: client sends `ARROW_FIRED` → server validates hit via `HitValidator.ts` → broadcasts `PLAYER_HIT` or `ARROW_LANDED`

**Expect bugs here.** This path has never run against the real server. Common issues to watch for: WebSocket URL construction, CORS, message serialization, timing of MAP_SEED vs SPAWN_ASSIGNMENT, terrain generation determinism across clients.

### Priority 3: Connection state feedback
- Show "Connecting..." while WebSocket is opening
- Show error if connection fails (wrong URL, server down, network issues)
- Handle disconnects gracefully during gameplay

### Key files
- `packages/client/src/game/Game.ts` — central orchestrator, all state transitions (590+ lines)
- `packages/client/src/network/PartySocket.ts` — WebSocket client wrapper
- `packages/client/src/screens/MenuScreen.ts` — Create/Join UI
- `packages/client/src/screens/LobbyScreen.ts` — room code, player list, share button, start button
- `packages/client/src/screens/RoundEndScreen.ts` — round result overlay
- `packages/client/src/hud/HUD.ts` — HUD overlay container
- `packages/server/src/server.ts` — PartyKit server (onConnect, onMessage, onClose)
- `packages/server/src/Room.ts` — server-side room state
- `packages/common/src/types.ts` — all message type definitions

### Development status
- **Phase 1 (Chunks 1-8): Complete and deployed.**
- **Phase 2 plan exists** in `docs/BOJO_DOJO_PHASE1_PLAN.md` (overview only) and `docs/spec.md` (full spec). Phase 2 features: fletching, teleport arrows, shrinking zone, spectator mode, first-to-3 scoring, 3-6 player support, pickup system. These should NOT be started until multiplayer actually works.
- **Deployment**: push to `main` auto-deploys client to GitHub Pages. PartyKit server redeploys via `cd packages/server && npx partykit deploy`.
