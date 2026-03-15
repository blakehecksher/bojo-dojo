# 2026-03-15 1630 Playwright Setup

## TL;DR
- What changed: Added Playwright test infrastructure; 13 tests all green on first run
- Why: Enable automated playtesting during development to catch regressions and verify gameplay behaviour without requiring a phone
- What didn't work: First `heightmap` test used `resolution` property that doesn't exist on `HeightmapData` (has `width`/`depth` instead) — fixed immediately
- Next: Expand tests as new features ship; add test run to CI when deploying

---

## Full notes

### What was added

**`playwright.config.ts`** (root):
- Targets `http://localhost:5173` (Vite dev server)
- `webServer` config auto-starts `pnpm dev` before tests; `reuseExistingServer: true` so dev server already running is reused
- Runs Chromium with `--use-gl=egl` for WebGL support in headless mode
- Sequential test execution (`fullyParallel: false`) — game state is stateful

**`tests/smoke.test.ts`** (5 tests):
- Page title check
- Canvas present and non-zero sized
- `#hud` element attached
- `window.__game` exists and `phase === 'offline'` after load
- No uncaught JS errors on load

**`tests/gameplay.test.ts`** (8 tests):
- Round starts active with correct arrow count (5)
- Arrow counter displays "5" in DOM text
- Firing an arrow via simulated pointer events (pointerdown → pointermove → pointerup on right-25% of canvas) decrements arrow counter
- Enemy player marker exists in Three.js scene
- Heightmap dimensions are correct (100×100 per TERRAIN_BASE)
- Spawn points are ≥80m apart (MIN_DISTANCE_2P)
- Menu shows BOJO DOJO title and Create Game button when opened
- Menu name input has default "Player NNN" value

### Key design notes
- `window.__game` is exposed by `main.ts` for debugging — this is the hook Playwright uses to introspect all internal state
- Pull slider hit test: `x > window.innerWidth * 0.75`. At 1280×720 viewport, that's x > 960. Tests use x=1128 (88%).
- TypeScript `private` fields are runtime-accessible — `g.hud.arrowCounter.count` works fine in `page.evaluate()`

### How to run
```bash
pnpm test          # headless, fast
pnpm test:ui       # Playwright UI mode — step through tests visually
```
