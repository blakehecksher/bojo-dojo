# AGENTS.md

This file tells you how to work in this project. Read it first, every session.

---

## On a fresh project (no state.md yet)

1. Check for `docs/spec.md`. If it exists, read it — that's the directional intent of the project.
2. Create `docs/state.md` using the format below.
3. Create an initial log file in `docs/log/` named with the current`YYYY-MM-DD HHMM Kickoff.md`.
4. Begin work.

## On an existing project

1. Read `docs/state.md` — current focus, what's working, what's next.
2. Read `docs/decisions.md` — don't re-litigate what's already been decided.
3. Only open a log file if `state.md` links you to one.

---

## state.md format

Keep it to one page. Rewrite it (don't append) at the end of every session.

```
# State
_Last updated: YYYY-MM-DD_HHMM

## Current focus


## What's working


## In progress


## Known issues


## Next actions
1.
2.
3.

## How to verify


## Recent logs
- docs/log/YYYY-MM-DD HHMM Subject.md — one line summary
```

---

## Log format

One file per session. Name it `YYYY-MM-DD HHMM Subject.md`. Never edit old logs.

```
# YYYY-MM-DD HHMM Subject

## TL;DR
- What changed:
- Why:
- What didn't work:
- Next:

---

## Full notes

```

---

## Rules

- Small, targeted changes. No drive-by refactors.
- If something's broken but out of scope, add it to Known Issues in `state.md`. Don't silently fix it.
- If you're about to do something irreversible, say so first.
- When in doubt about intent, check `docs/spec.md` or ask.

## End of every session

- [ ] Rewrite `docs/state.md`
- [ ] Write a new log file in `docs/log/`
- [ ] Leave the project in a runnable state, or note explicitly that it isn't
