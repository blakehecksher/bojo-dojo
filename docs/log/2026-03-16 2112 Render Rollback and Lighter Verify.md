# 2026-03-16 2112 Render Rollback and Lighter Verify

## TL;DR
- What changed: Backed out the forced blue clear-color background, simplified spawn orientation to a fixed slight-downward look, and kept the requested playtest tweaks (smaller map, 7 teleport arrows, corrected bow bend, hidden top-left ammo counter).
- Why: The broader render/camera response to the black-screen report was too speculative and made it harder to reason about the actual problem.
- What didn't work: Repeated full Playwright runs were too heavy for this machine and added noise while debugging the render issue.
- Next: Manually verify terrain visibility on the actual device before making any more renderer-level guesses.

---

## Full notes

- Removed the scene-wide blue background so the renderer is not masking missing-world symptoms with a fake sky color.
- Replaced the spawn-camera `lookAt` approach with a simpler fixed slight-downward orientation plus XZ-facing yaw. This is easier to reason about and avoids height-dependent sky-looking spawns.
- Kept the user-requested gameplay/UI changes:
- smaller map size
- 7 teleport arrows per round for testing
- corrected bow bend direction
- top-left ammo display hidden
- Limited verification to lightweight checks:
- `pnpm build`
- `pnpm --filter @bojo-dojo/server exec tsc --noEmit`
- `pnpm --filter @bojo-dojo/common exec tsc --noEmit`
- Deliberately did not treat Playwright as authoritative in this pass because it was causing the local machine to crawl.
