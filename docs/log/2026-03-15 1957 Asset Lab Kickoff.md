# 2026-03-15 1957 Asset Lab Kickoff

## TL;DR
- What changed: Added `packages/client/src/asset-lab` with isolated primitive asset prototypes, shared palette, and migration notes.
- Why: Visual polish work needed to continue without disturbing the current gameplay and multiplayer development cycle.
- What didn't work: Sandboxed `pnpm.cmd build` failed with a `spawn EPERM` during Vite config bundling, so unrestricted build verification was required.
- Next: Decide which prototype batch to migrate first and wire it into the live renderer in a separate session.

---

## Full notes

- Created an isolated `asset-lab` folder under the client source tree and kept it completely disconnected from runtime imports.
- Added first-pass primitive prototypes for a bow rig, pickups, environment props, and simple effects.
- Added a shared color palette so the prototypes stay visually coherent while they are still in quarantine.
- Documented the purpose of the folder and the intended migration path in `packages/client/src/asset-lab/README.md`.
- Verified the new files with `pnpm.cmd --filter client exec tsc --noEmit`.
- Verified end-to-end build success with unrestricted `pnpm.cmd build`.
- Left the existing gameplay, menu, and spawn-related working tree changes untouched.
