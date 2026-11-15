# S15 AC self-check (AC1–AC6)

**Head:** `3b721fe` + T016/T017 evidence · **PR:** #26 (draft) · **Base:** `8c410f3` · **Date:** 2026-11-15 · **Revision counter:** 0 of 2

| AC | Verdict | Key numbers | Evidence |
|---|---|---|---|
| **AC1 one clock source** | **MET** | The scan finds 1 hit, `src/time/clock.ts`, down from 3 hits at base. The fake-clock suite passes 8/8. The `no-real-timers` scanner covers every xploder test plus the app hero test, with negative controls; it passes, and `AC1-SCAN-OK` is a hard guard. | `T001-log-ac1-scan-base.txt`, `T006-log-ac1-scan.txt`, `T002-log-{red,green}.txt`, `T006-log-{red,green}.txt` |
| **AC2 pause is a freeze** | **MET** | 40/40 cells at 1440×900 and 390×844, CPU ×1 and ×4, covering implode, explode at 4 points, zoom, capture step/draw, inspect and turn: 0 px difference at +1 frame vs +0.5 s vs +3 s, and 0 settles while paused. Freeze within ≤ 2.3 ms of the click. On Play the explode ends at the same time (1186–1203 ms) whatever the pause offset, so there is no jump and no restart. Re-checked after E4: 10/10 at 0 px / 0 settles. The S14 I-03 originals are byte-identical and green, with 4 fake-clock twins. The S13 originals are byte-identical and green. The reduced-motion group passes 8/8. | `T010-log-pause-freeze.md`, `T010-log-pause-review.md`, `T010-screenshot-pause-*`, `T010-log-i03-reproof.txt`, `T004-log-s13-reproof.txt`, `T011b-log-green.txt`, `T010-log-reduced-motion.txt`, base: `T001-log-pause-freeze-base.md` |
| **AC3 settle is state, not signatures** | **MET** | Forced duplicate frames mid-tween (explode, turn, zoom): 0 settles until the end, then exactly 1 (it failed before, per the Stage 1 repro). In the browser at CPU ×4 and ×6, on both projects and the hero: 22/22 ONCE, with 0 label reveals in any mid-tween frame. Base had a hero zoom-in/turn reveal. The turn-start one-frame flash is gone (R14). The frame signature is removed. | `RFC-log-dup-frame-repro.txt`, `T011-log-{red,green}.txt`, `T011b-log-settle-once.md`, `T011-screenshot-settle-*`, `T011-log-turn-flash.txt` → `T011b-log-turn-frames.txt`, base: `T001-log-settle-once-base.md` |
| **AC4 events** | **MET** | Emitter rules 7/7 and DOM events 6/6. In the browser, `ready` fires first and once per route. Each scripted motion gives 1 `settled` with the right phase (8/8 on the projects); the hero gives 6 settles and 2 tour ends per loop. `site-probe` waits for ready → first settled → loop button; `eager-probe` ready-event vs attribute differ by ≤ 0.2 ms; `settledAtMs` is recorded. All S14 checks are green: `site:probe --ci`, `eager:probe` live-loop ×2, `engine:probe`. | `T012-log-{red,green}.txt`, `T013-log-{green,probes,event-order}.*` |
| **AC5 phone measurement, cache only by number** | **MET (no cache)** | Mobile 412×823, CPU ×1/×4/×6, both projects, 10 runs × 3 motions. The pooled median at CPU ×4 is 50.0 ms timed from the settle event and 33.3 ms with the same method as base (base 50.0 ms). Both are ≤ 50 ms, so the decision is NO-CACHE and `place.ts` is unchanged. Placement self time can't be attributed in the minified export, so task time is reported. | `T014-log-e8-{timing,timing-attributes,decision}.*`, `T015-log-skipped.txt`, base: `T001-log-e8-base.md` |
| **AC6 gates and seals** | **MET** | CI 11/11 green, including all 7 required contexts. Lighthouse mobile: `/` 0.99 / 1.00, `/projects` 1.00 / 1.00, `/projects/jev-toolkit` 1.00 / 1.00, and `/projects/websocket-inspector` also 1.00 / 1.00. CLS 0 in every run. axe 0 serious, 0 critical. Weight 0.47 MB on `/` (mobile). 2 draw calls (hero and both projects). Eager hero PASS with zero interaction. 10 re-seals, each with a pushed tag. S2/S4, S3 and S7 diffs are empty, and 10/10 guards pass. | `T016-ci.txt`, `T016-ci-required-contexts.json`, `T016-log-gates.md`, `T016-log-seal-tags.txt`, `T017-log-surfaces.txt` |

## Holds (Hard Rule 7)

- **Accepted by Murphy at G4** (defaults).
- **Final 5-run set (T016):** every phase boundary is within ±3.3 ms. The tour step boundaries, 2 projects × 5 runs, are within ±1 ms (`VERDICT PASS`).
- **Label-visible durations:** labels appear exactly one frame earlier by design (E4). In the final 5-run set, the 390×844 `explodedLabelsMs` median is +17.3 ms, 0.6 ms over a frame, as in T011b (+17.6 ms). This is reported, not hidden.
- **Pooled:** across all 15 post-E4 runs every metric passes, with `explodedLabelsMs` at +15.3 ms (`T016-log-holds-pooled.md`, `T011b-log-holds-analysis.md`).

## Re-seals and tags

Each is `seal/<surfaces>-<fix sha>`, pushed in the same session as its re-seal:

| # | Task | Surfaces | Tag |
|---|---|---|---|
| 1 | T002 | S5 | `seal/s5-12cc065` |
| 2 | T003 | S6 | `seal/s6-d4efeaf` |
| 3 | T004 | S5 | `seal/s5-1ff1d01` |
| 4 | T005 | S6 | `seal/s6-2c9187d` |
| 5 | T006 | S5 + S8 | `seal/s5-s8-74394e9` |
| 6 | T007 | S5 + S8 | `seal/s5-s8-5d3abdb` |
| 7 | T008 | S6 | `seal/s6-ea61882` |
| 8 | T009 | S8 | `seal/s8-07b22cd` |
| 9 | T011 | S6 | `seal/s6-8506837` |
| 10 | T011b | S8 | `seal/s8-b8c7c49` |
| 11 | T012 | S8 | `seal/s8-8f27462` |

The written plan expected 10 re-seals; there are 11 because R14 added T011b. The bases in force are S2/S4 `3aee8fc` (unchanged), S5 `5d3abdb`, S6 `8506837`, S7 `5b22987` (unchanged) and S8 `8f27462`.

## Refinements beyond the approved RFC

Each is recorded in `rfc.md` §13; none changes an AC.

- **R11:** two jsdom tests gain `at: 0`.
- **R12:** `pause()` also pauses a playing tour, so the S7 test contract holds; `pauseTour()` keeps project pages unchanged.
- **R13:** the hero clock reaches the leader through the showcase context.
- **R14:** "moving" is sent in the same commit as a target/turn/zoom change.
- **R15:** one S6 test drives its zoom through the rig.

**Visible behaviour changes:**
- Pause freezes the hero immediately (the goal).
- Labels appear one frame sooner after motion.
- Keyboard zoom on project pages hides labels for about 2 frames instead of leaving them on the old pose.

## Tiers

| Task | Who finished it |
|---|---|
| T002–T013 | Flash (tier 1), first or second dispatch. T001, T007 and T011 each had one correct STOP or rework, never two failures. |
| T001, T005, T011, T013 | Orchestrator corrections to instruments and guards |
| T014, T016, T017 | Orchestrator |
| Tier 1.5 | Dormant; skipped |

## Needs Murphy's hands

1. Optional: on the PR preview, pause and play the home hero in each phase, on phone and desktop, in both palettes.
2. "merge" when satisfied. Nothing is merged without your word.
