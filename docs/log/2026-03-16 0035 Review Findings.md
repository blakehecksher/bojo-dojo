# 2026-03-16 0035 Review Findings

## TL;DR
- What changed: Reviewed the current implementation against `docs/spec.md`, `docs/BOJO_DOJO_PHASE1_PLAN.md`, and the active code paths; updated project state with the resulting issues.
- Why: The project was ready for a higher-level sanity check before more polish or Phase 2 work.
- What didn't work: No code fixes were applied in this session; the gaps remain open.
- Next: Prioritize server-side shot validation/ammo, anonymous arrow landing handling, and LAN mobile dev connectivity.

---

## Full notes

Build and test status during review:
- `pnpm test` passed with 26/26 Playwright tests.
- `pnpm build` passed.

Highest-signal findings from the review:
- The server recomputes trajectories, but it still trusts the client for shot origin, shot direction, shot force, and whether the player still has arrows. That does not meet the spec's "server-authoritative to prevent cheating" bar.
- The server broadcasts `ARROW_LANDED`, but the client does not handle it. Remote arrows are instead recreated from `ARROW_FIRED`, which preserves shooter identity and misses the spec's anonymous landed-arrow behavior.
- The PartyKit client wrapper only uses `ws://` when the host starts with `localhost`. Local-network mobile playtesting through a LAN IP would incorrectly switch to `wss://`, which conflicts with the documented phone-testing workflow.
- Spawn generation currently filters slope and edge distance, but obstacle placement is generated later with no reservation around the chosen spawns. That leaves a path for trees or rocks to overlap a spawn.
- Project intent is currently split: `docs/decisions.md` and the phase plan still describe a 30fps cap, while the implementation and state doc now describe 60fps as the target.

Test coverage gaps noted during review:
- Multiplayer tests verify that arrows appear on the remote client, but not that anonymous landed arrows are handled correctly.
- Gameplay tests only require spawn distance `> 3`, which is much weaker than the intended spawn-distance behavior.
- There is no coverage for malicious or invalid `ARROW_FIRED` payloads.
