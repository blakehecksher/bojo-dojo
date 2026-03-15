# 2026-03-15 1800 Chunk8 PWA Polish Deploy

## TL;DR
- What changed: Chunk 8 — PWA manifest, service worker, fullscreen/orientation lock, loading screen, visibility handling, lobby share button, URL room code, GitHub Actions deploy workflow
- Why: Make the game installable, polished, and deployable to GitHub Pages
- What didn't work: N/A
- Next: Enable GitHub Pages in repo settings, deploy PartyKit server, playtest with friends

---

## Full notes

### Orientation lock + fullscreen
- First pointerdown handler now also calls `requestFullscreen({ navigationUI: 'hide' })` and `screen.orientation.lock('landscape')`
- Both wrapped in `.catch(() => {})` for unsupported browsers/desktop

### Visibility change handling
- `Round.ts`: added `pause()` (clears interval) and `resume()` (restarts from stored remaining)
- `SceneManager.ts`: added `pause()` (stops animation loop) and `resume()` (restarts it)
- `Game.ts`: `visibilitychange` listener pauses/resumes both on tab hide/show

### Loading screen
- New `LoadingScreen.ts` — black overlay with CSS spinner and "Generating terrain..." text
- Shown before `generateHeightmap()` + `initGameWorld()`, hidden after
- Both `startOffline()` and `initGameWorld()` made async with `setTimeout(0)` yield

### Share button in lobby
- `LobbyScreen.ts`: "Share Link" button copies full URL with `?room=CODE`
- Shows "Copied!" feedback for 2 seconds

### URL room code detection
- `MenuScreen.ts`: new `setJoinCode(code)` method
- `Game.ts`: reads `?room=` URL param on init, pre-fills join code input

### PWA
- Installed `vite-plugin-pwa` as devDep
- `vite.config.ts`: VitePWA plugin with fullscreen/landscape manifest, autoUpdate service worker
- SVG placeholder icons (192x192, 512x512) in `public/icons/`
- `base: './'` for GitHub Pages subdirectory compatibility
- Build produces `manifest.webmanifest`, `sw.js`, `workbox-*.js`

### GitHub Actions
- `.github/workflows/deploy.yml`: builds client, deploys to GitHub Pages
- `PARTYKIT_HOST` read from repo variable for production builds
- Root `package.json`: added `packageManager: pnpm@10.32.1`

### Tests
- 4 new Playwright tests (17 total): theme-color meta, loading screen, URL room code, lobby share button
- 16 pass, 1 pre-existing flaky (spawn distance)
