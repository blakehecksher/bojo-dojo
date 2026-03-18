# 2026-03-16 2116 Terrain Visibility Fallback

## TL;DR
- What changed: Switched the terrain mesh to an unlit, double-sided material and kept the simpler spawn orientation logic.
- Why: The remaining symptom strongly suggested either the terrain mesh was not visible under current rendering conditions or the device was not handling the lit terrain path reliably.
- What didn't work: Trying to use full Playwright runs during this debugging loop was too expensive and produced more noise than signal.
- Next: Retest on the target device. If the terrain is still absent, stop adjusting renderer cosmetics and inspect runtime world-init state directly.

---

## Full notes

- Updated `packages/client/src/renderer/TerrainMesh.ts` to use `MeshBasicMaterial` with vertex colors and `DoubleSide`.
- Kept the simpler fixed spawn look direction from the prior pass.
- Verified only lightweight checks:
- `pnpm build`
- `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
- `pnpm --filter @bojo-dojo/common exec tsc --noEmit`
- Did not run Playwright as the primary verifier for this pass.
