# S13 revision 1 of 2 — tour clock last-step race (S5 frozen surface)

## Context

AC1 requires "the guided tour runs to completion". In T005 the tour intermittently stayed `playing` on its last step and never reached `ended` (jev-toolkit ~1/8 under the probe; websocket-inspector 3/16 on the **base export `3b829d0`**, so the defect predates S13). Root cause and proof: `T005-log-tour-stall-rootcause.md`. The defect is in `packages/xploder/src/react/useTourClock.ts`, listed in `packages/xploder/test/frozen-surface.s5.paths`; the S13 brief forbids engine changes and requires frozen surfaces S2–S8 to be empty.

## Decision

Murphy chose **option A** on 2026-11-14 ("go A"): fix the clock now and re-seal S5, with this note for Merlin. This is **S13 revision 1 of 2**, pending Merlin's vault log. AC1–AC7 are unchanged; AC7's "frozen surfaces S2–S8 empty" is read as in S10 revision 1 (Q16): empty except the authorised, re-sealed change named here.

## Exact behaviour change (allowed scope)

- `packages/xploder/src/react/useTourClock.ts`: when the effect finds that the tour position at "now" has already left the reducer's state (the last boundary has passed, so `positionAt` reports a different status), it dispatches `{ type: 'tick', now }` instead of returning without a timer. No other behaviour changes: same beat, same reducer, same timers for every other step.
- New regression test `packages/xploder/test/tour-clock-boundary.test.tsx` (red before the fix, green after), added to `frozen-surface.s5.paths`.
- `frozen-surface.generate-s5.sh` base moves to the fix commit **`51d3fa7`**; `frozen-surface.s5.manifest.json` is regenerated with its note extended, and the S5 base/note assertion in `frozen-surface.test.ts` is updated to match (the S11.9 re-seal did the same). S2–S4, S6, S7 and S8 manifests are untouched.
- **Keep `task/s13-jev-content` on origin after the squash merge:** `51d3fa7` must stay reachable for `frozen-surface.generate-s5.sh` (as `task/s11.9-home-composition` keeps `3aee8fc`).

## Not changed

`src/interaction/tour.ts` (reducer), motion tokens, the engine scene, panels, theme, every app file.
