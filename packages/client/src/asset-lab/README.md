# Asset Lab

This folder is intentionally not wired into the live game.

Purpose:
- Prototype primitive art assets without touching the current gameplay loop.
- Keep visual iteration isolated until a batch is ready to migrate.
- Let code-driven assets compile under the real client toolchain before integration.

Current contents:
- `PrototypeBow.ts` - first-person bow prototype with draw animation hooks
- `PrototypePickups.ts` - shield, arrow bundle, and teleport pickup prototypes
- `PrototypeProps.ts` - environment and spawn/readability prop prototypes
- `PrototypeEffects.ts` - trail, pulse, and shard effect prototypes
- `PrototypePlayerKit.ts` - distant player totems, shielded variant, and victory marker prototypes
- `PrototypeArenaSet.ts` - zone beacon, dojo gate, and target dummy prototypes
- `PrototypeUi.ts` - HUD and menu component prototypes using isolated DOM helpers
- `PrototypeShowcase.ts` - animates and arranges asset-lab prototypes together for future inspection
- `palette.ts` - shared art-direction colors for the prototypes

Migration plan later:
1. Move stable 3D assets into `packages/client/src/renderer` or `packages/client/src/assets`
2. Move stable HUD assets into `packages/client/src/hud`
3. Put file-based assets such as audio, textures, icons, and sprites in `packages/client/public/assets`

Rule for now:
- Nothing in this folder should be imported by runtime code until we explicitly decide to integrate it.
