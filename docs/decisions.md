# Decisions

One entry per decision. Format: **what**, why, date. Exists to prevent re-litigating.

---

**PartyKit instead of raw WebSocket server.** PartyKit provides room management, connection lifecycle, and edge deployment out of the box. Eliminates need for custom RoomManager, MessageRouter, Player wrappers. 2026-03-15.

**pnpm monorepo with common/client/server packages.** Shared deterministic code (terrain gen, physics) must produce identical results on both client and server. Workspace references make this clean. 2026-03-15.

**HTML overlay HUD instead of WebGL UI.** HTML/CSS is dramatically simpler for text, buttons, and touch input zones. Touch event handling on canvas overlays is more reliable than Three.js raycasting for UI. 2026-03-15.

**Pointer ID claim system for multi-touch.** Each pointerdown is offered to handlers in priority order; first match wins that pointer for all subsequent events. Prevents thumbstick/slider/swipe conflicts. 2026-03-15.

**30fps cap.** Game has no continuous movement. 60fps wastes mobile battery for zero gameplay benefit. 2026-03-15.

**InstancedMesh for trees and rocks.** Hundreds of obstacles need to be one draw call each (trunks, canopies, rocks) for mobile GPU performance. 2026-03-15.

**JSON messages, not binary.** Messages are <200 bytes. JSON is debuggable and the serialization overhead is negligible at this message volume. 2026-03-15.

**Offline single-player as default mode.** Game boots into offline practice immediately. Menu screen provides path to networked play. Better first-load experience than staring at a lobby. 2026-03-15.
