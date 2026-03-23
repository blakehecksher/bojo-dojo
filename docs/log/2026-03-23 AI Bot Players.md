# 2026-03-23 AI Bot Players

## TL;DR
- What changed: Added server-side AI bots with showcase attract mode behind the menu screen
- Why: Game needs something engaging on first load; bot matches create an "attract mode" and let users spectate before joining
- What didn't work: Safe spawn filtering (>30m from enemies) broke bot combat; reverted to simple random spawns since teleport-arrow-kills fix handles overlapping. Scoreboard visibility required multiple iterations due to showcaseMode being true on menu screen.
- Next: Verify menu/spectate UI cleanup on phone, consider bot difficulty tuning

---

## Full notes

### Bot AI system (server)
- `BotBrain.ts`: 500ms tick loop — scan enemies via LOS, pick nearest visible, compute firing solution, apply 2deg aim spread, fire after 0.5-2s delay. Teleports to random spawn if blind for 3s+. Fires teleport immediately on first tick if no targets visible.
- `ballistics.ts`: Inverse ballistics solver — tries force 0.4-1.0, uses closed-form projectile equation, prefers flat shots, verifies via trajectory simulation.
- `BotManager.ts`: Manages multiple BotBrain instances, 500ms tick interval.
- `botNames.ts`: 15 archery-themed names (Robin Hood, Legolas, etc.) with shuffle picker.

### Showcase system (server)
- `ShowcaseManager.ts`: Self-contained bot match with own RoomState/GameLoop/BotManager. Lazy lifecycle — created on first spectator, destroyed when last leaves. Auto-restarts rounds (3s) and matches (5s). Default 6 bots.
- `server.ts`: Special handling for room ID "showcase" — spectator-only connections, no player creation.

### Client changes
- `Game.ts`: Separate `showcaseConnection` + `applyShowcaseState()` that renders without touching game phase/screens. Spectate button hides menu, enables orbital camera + thumbstick, shows minimap + scoreboard.
- `MenuScreen.ts`: Frosted glass effect (backdrop-filter blur), Spectate/Back buttons, `isHidden()` method.
- `ShowcaseScoreboard.ts`: Color dots with round win counts, top-right, only visible during spectate.

### Bug fixes
- Teleport arrows now hit/kill players (HitValidator.ts + offline mode)
- Player limit raised from 4 to 6 (constants.ts, Room.ts, server.ts)
- Menu screen hides gameplay UI (bow, thumbstick, minimap, crosshair, inventory, timer)

### Iterations on UI
- Back to Menu button: moved from top-left to bottom-center, then to top of screen. Wrapped in flex container to fix hover-scale conflict.
- Spectating banner: moved to bottom of screen to avoid thumbstick overlap.
- Scoreboard: required `menuScreen.isHidden()` check since `showcaseMode` is true even on menu.
