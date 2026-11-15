# S14 Engine & Hero Polish: AC1–AC7 self-check

**Branch:** `task/s14-engine-polish` · **PR:** #25 (draft) · **Head checked:** `600a314` (code), evidence commits on top · **Base:** `a9edbfc` · **Date:** 2026-11-15 · **Revision counter:** 0 of 2 (unused)

Verdicts are the orchestrator's reading of machine evidence. Murphy's hands-on validation is still pending and decides "S14 done".

| AC | Verdict | Evidence |
|---|---|---|
| **AC1 (I-09)** | **MET** | <ul><li>Unit and driver tests red → green: `T002-log-{red,green}.txt` (unit 3/5 red → 5/5; viewer jsdom 5/7 red → 7/7, covering all four AC1 clauses plus close-while-hovered, Escape-to-proxy and the S7 open contract).</li><li>Browser, in 4 cells (desktop/phone × light/dark): hover-B shows `highlight=B`, `selected=A`; after leaving B, `selected=A`; A's tint equals B's within 6/255. See `T003-log-i09-browser.txt` and `T003-screenshot-i09-*` (8 PNGs).</li><li>S7 and S8 probes are identical to base: 93/93 and 75/75 (`T003-log-engine-probe-s7.txt`, `T003-log-a11y-probe.txt`).</li></ul> |
| **AC2 (I-10)** | **MET** | <ul><li>**Five CI attempts** (Linux, the flake's host): 0 CLS in all 16 cells × 5, hero-marks 3 × 5 PASS, drill 13 × 5 PASS (`T011-log-ci-site-probe-5runs.md`). Five local runs are equally clean (`T005-log-cls-drill-5runs.md`).</li><li>Corner marks at 390 px are identical before and after reveal, with coordinates listed (`T005-log-corner-marks.md`). Before the fix, under a stalled stream, the bottom marks moved from y 710 → 791.78 (`T001-log-corner-marks-base.md`, `T004-log-red.txt`).</li><li>The probe waits on the settled signal (`waitForHeroSettled`), and `TIMEOUT-NOT-RAISED-OK` holds on every guard run.</li></ul> |
| **AC3 (I-03)** | **MET** | <ul><li>Event count = 1 in all 14 mid-explode cells; 2 cells had settled before Pause and are reported, not hidden.</li><li>Frames are identical while paused in 16/16 cells.</li><li>Resume lands within ±5.2 ms of the remaining step time; before the fix there was a 1.43 s dead wait. Sources: `T006-log-pause-events.md`, `T006-screenshot-i03-pause-{a,b,c}.png`, `T001-log-pause-events-base.txt`.</li><li>Unit tests red 7/20 → green 20/20 (`T006-log-{red,green}.txt`).</li><li>Reduced motion: 8/8 (`T006-log-reduced-motion.txt`).</li></ul> |
| **AC4 (I-05)** | **MET** | <ul><li>Unit sweep over 4,160 cells: 956 overlapping before the fix, 0 after, and every other placement is identical (`T007-log-{red,green}.txt`).</li><li>Browser, in 32 cells (1×/2×/3× and hero-zoom, light/dark, 390/1440, both projects plus `/`): TOTAL HITS 0, down from 10, with every rectangle listed (`T008-log-rects.md`) and 8 screenshots.</li></ul> |
| **AC5 (I-04)** | **MET** | <ul><li>Console: 0 `THREE.Clock` warnings on 3 routes, down from 1 each (`T009-log-console.txt` vs `T001-log-console-base.txt`).</li><li>Tour: 15/15 step boundaries within ±1.7 ms of the base median, totals +0.1 / +1.1 ms; the bound is ±16.7 ms (`T009-log-tour-parity.md`).</li><li>Parity: 8/8 shots at 0 px (`T009-log-parity.txt`).</li><li>The warn-spy test goes red → green (`T009-log-{red,green}.txt`).</li></ul> |
| **AC6 (I-08)** | **MET on the PR; "gone from main" completes at merge** | <ul><li>The three files are deleted in `600a314` (`T010-log-i08-commit.txt`).</li><li>On PR #25, all **seven** required contexts are completed + success, there are 0 stale-workflow runs, and none is "expected" without a run (`T010-ci-required-contexts.json`, verdict PASS).</li><li>"Gone from `main`" is checked with `git ls-tree origin/main .github/workflows` after Murphy's merge.</li></ul> |
| **AC7 (gates)** | **MET** | <ul><li>Full CI is green, 11/11 checks (`T011-ci.txt`).</li><li>Lighthouse mobile 1.00 / 1.00 on `/`, `/projects`, `/projects/jev-toolkit` and `/projects/websocket-inspector`, with CLS 0.</li><li>Weight ≤ 0.50 MB per route against a 3 MB budget.</li><li>2 draw calls on hero and project routes; the eager hero is intact (hero group 8/8, `eager:probe` live-loop 2/2), see `T011-log-gates.md` and `T011-log-local-gates.txt`.</li><li>Re-seals: S5 + S8 at `edde9d0`, S6 at `b5a4713`, each note naming file, reason and evidence. The S2/S4/S7 manifests and paths are byte-identical, and the 21 S3 tool files are unchanged (`guards.sh`, `T012-log-surfaces.txt`).</li></ul> |

## Re-seals (written reasons, in the manifests)

- **S5 @ `edde9d0`:** `src/interaction/emphasis.ts` + `src/react/scene/Emphasis.tsx`. Optional `selected` emphasis input lit alongside `highlight` (I-09), plus `test/emphasis-selected.test.ts`.
- **S8 @ `edde9d0`:** `src/react/TeardownViewer.tsx`. The open detail panel is the selected emphasis; open/close highlight sync keeps hover and keyboard focus; `data-xploder-selected` (I-09).
- **S6 @ `b5a4713`:** `src/overlay/model.ts`. Dimension notes avoid the plate layer-name quads; every other placement is output-identical (I-05), plus `test/overlay-note-clear.test.ts`.
- **Seal bases:** `edde9d0` and `b5a4713` are reachable only through `origin/task/s14-engine-polish`, so **keep that branch after the squash merge**.

## Corrections and refinements recorded during the slice

- **C1:** the `THREE.Clock` warning came from react-three-fiber, not xploder, so it was fixed with a pnpm patch.
- **C2:** I-03's settle count was already 1, so the fix targeted resume-from-remaining-time.
- **C3:** `Emphasis.tsx` was added to the I-09 re-seal list; Murphy approved it at G1.
- **C4:** the viewer test lives under `apps/web` jsdom.
- **R1–R6:** see `rfc.md` §14.
- **T005 attempt 1:** stopped correctly at red because of the orchestrator's stress design (`T005-log-red-timing.txt`).
- **T009:** the orchestrator cut the lockfile change down to the patch entries only.

## Tier per task

| Task | Finished by |
|---|---|
| T001 | Flash (tier 1); orchestrator applied C4 to the guards |
| T002 | Flash |
| T003 | orchestrator (re-seal) + Flash (browser evidence) |
| T004 | Flash |
| T005 | Flash (2 dispatches; the first stopped by design) |
| T006 | Flash |
| T007 | Flash |
| T008 | orchestrator (re-seal) + Flash (browser matrix) |
| T009 | Flash; orchestrator minimised the lockfile |
| T010–T012 | orchestrator (Hard Rule 5; CI) |

Tier 1.5 was dormant for every task (skip recorded). No task failed twice, so no escalation pause was triggered.

## Needs Murphy's hands

1. Validate on the preview <https://portfolio-teardown-git-task-s14-engine-polish-murphy-3c4d.vercel.app>: I-09 hover, I-05 zoom, I-03 pause/play, the console (both palettes, phone + desktop).
2. Say "merge" when satisfied. After merge, keep `task/s14-engine-polish` on origin.
3. Optional: an upstream note to react-three-fiber about `THREE.Clock` → `Timer`. Outward-facing, so the agent has not done it.
