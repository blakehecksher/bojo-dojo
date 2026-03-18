# 2026-03-17 Debug Terrain Loading

## TL;DR
- What changed: Diagnosed and fixed the multiplayer "black screen / no terrain" bug. Root cause was a protocol mismatch between the deployed server (old committed code) and the client (new uncommitted Codex changes). Also fixed a worldKey race condition, added a debug overlay, and added a sky-blue scene background.
- Why: The client `.env` points to a deployed PartyKit server. Codex rewrote the server protocol (old: `MAP_SEED` + `SPAWN_ASSIGNMENT`, new: `MATCH_STATE` with embedded `WorldLayout`) but never redeployed. The client was speaking a language the server didn't understand.
- What didn't work: Previous debugging sessions (by Codex) guessed at renderer/material/camera issues for hours without inspecting runtime state. The actual problem was never rendering-related.
- Next: Remove debug overlay once stable. Continue with gameplay polish and feature work.

---

## Full notes

### The bug
Both players saw a blue/black screen with only the bow visible. Could swipe the camera but couldn't fire arrows. Offline mode worked fine.

### Diagnosis
Added a runtime debug overlay showing phase, worldKey, heightmap, camera position, scene object count, match state, and received message types. The overlay revealed:
- `ms:null` — no MATCH_STATE was ever processed
- Message types received included `MAP_SEED` and `SPAWN_ASSIGNMENT` — these are from the OLD server protocol (Phase 1 code)
- The new client expected `MATCH_STATE` with a full `WorldLayout` object

### Root cause
`packages/client/.env` sets `VITE_PARTYKIT_HOST=bojo-dojo.blakehecksher.partykit.dev`, so the client always connects to the deployed PartyKit server. Codex's changes rewrote the entire server protocol but were never committed or deployed. The deployed server was still running the last committed code.

### Fixes applied
1. **Redeployed server** — `partykit deploy` pushed the current server code
2. **Fixed worldKey race condition** — `worldKey` was previously set BEFORE terrain creation in `initGameWorld`. If terrain creation threw, the key was already set and all future MATCH_STATE messages would skip world creation. Now `worldKey` is only set after all scene objects succeed.
3. **Added debug overlay** — Small green-text panel at bottom-left showing runtime state. Essential for phone debugging without dev tools.
4. **Added sky-blue scene background** — Makes it immediately obvious whether the scene renders vs terrain is missing (blue = scene works, black = renderer issue)
5. **Added MATCH_STATE retry loop** — Requests match state every second (up to 10 attempts) after ROUND_START, instead of a single 250ms attempt
6. **Documented deployment workflow** in `docs/state.md` — after any server/common change, must run `partykit deploy`

### Lesson learned
Always check whether deployed code matches local code before debugging rendering issues. A runtime diagnostic overlay is worth more than any number of blind code changes.
