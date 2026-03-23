# 2026-03-23 Playtest Polish and Bow Fix

## TL;DR
- What changed: Major playtest overhaul — minimap, spectator mode, bow model fix, shield glow, unlimited ammo, deferred hit timing, UI/UX polish, terrain edge fix
- Why: Live playtesting revealed bugs (arrow hit timing, player count display, round transition race condition) and UX gaps (no map awareness, no spectator experience, confusing lobby)
- What didn't work: Initial bow 180-degree Z rotation broke string alignment; had to fix draw animation direction instead. Player count formats like "3 of 2" confused users. Round 1 hint was immediately hidden by syncHudState.
- Next: AI bot players (server-side virtual players for spectator-only matches)

---

## Full notes

### New features
- **Minimap** (top-left): topographic contour lines via marching squares, player dot with direction indicator, arrow trail visualization (yellow arc + orange landing dot, 3s fade). F3 toggles debug mode showing all players.
- **Spectator mode**: Bird's-eye orbit camera after elimination with yaw + pitch control. Status banner shows alive count. Pull slider and inventory hidden during spectating.
- **Shield glow**: Full-viewport blue inset box-shadow overlay, fades in/out with 0.4s transition when shield is active.
- **Unlimited ammo**: Removed ammo checks from server, inventory slots and fletch button hidden from HUD.

### Bug fixes
- **Arrow hit timing (server)**: Split arrow effects into two timeouts — hit at `hitTime`, landing effects at `flightTimeMs`. Previously hits only registered when arrow hit the ground.
- **Arrow hit timing (offline)**: Deferred offline hit detection using `setTimeout(hitTime * 1000)` to match server behavior.
- **Round transition race condition**: Captured `firedInRound` number; stale arrow timeouts from previous round are now ignored.
- **Dead shooter guard removed**: Arrows fired before death now correctly kill targets.
- **Player count display**: Simplified from "X of Y alive" to "X alive" (playing) / "X players" (lobby). Tap to toggle room code display.
- **Round 1 hint persistence**: Added `hintUntil` timestamp guard so syncHudState doesn't immediately hide the first-round tip.

### Bow model fixes
- Fixed draw animation: limbs were starting bent and straightening on draw (backwards). Now limbs start with slight curve at rest and bend toward player on draw.
- Parented tip caps to limb meshes so they rotate together during draw.
- Aligned tip positions to sit flush on limb ends.

### UI/UX improvements
- **Lobby**: Added "How to Play" card with 5 bulleted tips, labels for name/color/code inputs, renamed "Join" to "Join Game".
- **Menu**: Added tagline "Aim. Shoot. Teleport. Last archer standing wins."
- **Thumbstick**: Separated visual radius (56px) from functional radius (70px), repositioned to bottom-left corner.
- **Terrain**: Removed edge falloff that was clamping map edges to low elevation.
- **Pickups**: More shields (4), removed arrow/teleport pickups from map.
- **Player connectivity**: Added `connected` field to PlayerPublicState, 10s disconnect grace period.

### Deployment
- Server redeployed to `bojo-dojo.blakehecksher.partykit.dev`
- All changes merged to main via PR
