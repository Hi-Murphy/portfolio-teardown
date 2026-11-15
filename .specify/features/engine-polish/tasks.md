# Tasks: S14 Engine & Hero Polish (six parked defects)

**Input:** `rfc.md` (approved, §14 Gate 1: all defaults + R1–R5), `spec.md`, `plan.md` in `.specify/features/engine-polish/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1): `codex exec -p deepseek -C <worktree> -s danger-full-access "<prompt>" < /dev/null`.
- The **sandbox is off** for every task: the checks build with Turbopack, run vitest on loopback or launch Chromium, and the Codex sandbox blocks all three. The prompt limits writes to the task worktree and `/tmp/s14-checks`.
- Before each phase group's first dispatch, probe the executor: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`.
- A DeepSeek 402 means the executor is *unavailable*, not that it failed. Pause, report, and offer three choices: top-up, orchestrator on "go", or split.

**Escalation (kickoff Hard Rule 9):**
- Tier 1.5 (OpenRouter) is **DORMANT**: skipped, and the skip is recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage (`$CLAUDE_CONFIG_DIR/usage/usage.json`, flagged if ≥ 90%). It executes the task personally only on Murphy's "go".
- Each report states the finishing tier and any skip.
- A failing `ALLOWED-PATHS-OK`, `RESEAL-LIST-OK` or `SURFACES-S2S4S7-OK` guard is never "fixed" by widening the guard. It is a STOP and an escalation with evidence (Hard Rules 2 and 4).

**Usage pacing:** at ≥ 85% of the 5h window, no new task starts. Finish and commit the current task, tick the ledger, report, then STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s14-engine-polish`, on branch `task/s14-engine-polish-tNNN`. The orchestrator reviews it, re-runs the check, and merges it back with `--no-ff`; that merge keeps the fix SHAs that serve as seal bases reachable. A worktree is removed only after its merge (global rule).

**Evidence doctrine (kickoff Hard Rule 8):** every claim attaches a machine artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`). Screenshots and perf bundles carry `meta.json`, or a header line with command, target, browser version and commit. Budgets come from `tools/perf/src/budgets.ts` and are never changed.

**Format & rules (every task):**
- **Start of every check:** `set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence`.
- **End of every check:** `bash .specify/features/engine-polish/guards.sh` (from T001 on), then `pnpm typecheck && pnpm lint && pnpm test`.
- **Build:** tasks that read `apps/web/out` run `pnpm build` first. Tasks that read `out-fixtures` run `pnpm build:fixtures` first.
- **Test-first (Hard Rule 3):** each fix task commits the red test alone first, with the failing output saved as `T<NNN>-log-red.txt` (non-zero exit). Only then does it commit the fix with `T<NNN>-log-green.txt`.
- **No literals:** no motion or colour literals, and no product strings outside content modules.
- **Never touch:** `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, S2/S4/S7 paths, the 21 S3 tool files, or any sealed file not in `approved-xploder-src.txt`.
- **Commits:** message prefix `S14/TNNN:`, ending with the attribution line. Run `gitleaks dir` on new prose and evidence before each commit. Stage-boundary commits on the slice branch use `S14/stage-N:`.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (8 guards OK; negative controls FAIL SURFACES-S2S4S7 + RESEAL-LIST + ALLOWED-PATHS; parity 8 shots; tour 2×5 runs (medians 11 204.8 / 12 804.4 ms); Clock warnings 3/3 routes; pause: settle ≤ 1 in 16/16 (3 cells settled before Pause), resume wait ≈ 1.41 s; overlap 10 hits, all `tags` mode; corner marks shift at 390×740 + 360×740 stalled) | 1 (Flash, sandbox off); orchestrator applied C4 to guards/approved list | evidence/T001-log-* | e252b71 |
| T002 | ☑ (red: unit 3/5 fail, viewer 5/7 fail; green: 5/5 + 7/7, sealed suites 71/71, jsdom suites 11/11; only S5/S8 frozen-surface red until T003) | 1 (Flash, sandbox off); orchestrator re-ran checks, split red/fix commits | evidence/T002-log-{red,green}.txt | b29d54a (fix edde9d0) |
| T003 | ☑ (S5 + S8 re-sealed at edde9d0, frozen-surface 6/6, xploder 640/640; S7 probe 93/93 and S8 a11y 75/75 identical to base; browser VERDICT PASS in 4 cells: hover-B → highlight B + selected A, left-B → selected A, A's tint = B's within 6/255) | orchestrator (re-seal) + 1 (Flash, browser evidence; B = 2.4 instead of 2.2 because 2.2's label ink skews the 5×5 sample) | evidence/T003-* | this merge |
| T004 | ☑ (red: FAIL hero-marks-stable-390x740 + 360x740, bottom marks 710 → 791.78, 1 shift each; fix: BlueprintSheet moved after content; green: 16 CLS cells 0.000000 + 3 mark checks PASS; parity 8 shots 0 px; perf 303/303, xploder 640/640, web 269 + 2 skipped) | 1 (Flash, sandbox off); orchestrator split red/fix commits | evidence/T004-log-{red,green,parity,diff,guard}.txt | edb7531 |
| T005 | ☑ (attempt 1 stopped correctly at red: a 2 s per-chunk delay mounted the button 6.2 s after both walks — orchestrator's stress design flaw, recorded in T005-log-red-timing.txt; attempt 2 gate design: red reproduces CI exactly (backward list gains hero:pause, loses skip); orchestrator re-verified red with the exact red-commit file; fix = 2 calls to waitForHeroSettled; 5 local runs: 16 CLS cells 0.000000 + 3 mark checks + 13 drill checks PASS ×5; corner marks identical at 390×844/390×740; TIMEOUT-NOT-RAISED-OK) | 1 (Flash, sandbox off; 2 dispatches, the first stopped by design not failure); orchestrator split red/fix commits | evidence/T005-* | this merge |
| T006 | ☑ (red 7/20 fail, incl. the S11.9 "fresh wait" test rewritten to the remaining-time contract; orchestrator re-verified red against the old hero-loop.ts; green 20/20; browser: settle count = 1 in all 14 mid-explode cells (2 cells settled before Pause, reported midExplode=false), frames equal while paused 16/16, resume within ±5.2 ms of the remaining time (was a 1.43 s dead wait); reduced-motion 8/8) | 1 (Flash, sandbox off); orchestrator split red/fix commits | evidence/T006-* | 4664fd9 |
| T007 | ☑ (sweep 4 160 cells: red 956 offending (first: fixture C 768×720 zoom 1.25); green 0; equivalence: every non-dimension placement deep-equal in all 4 160 cells; red commit = test + `export` keyword only, orchestrator re-verified the assertion red) | 1 (Flash, sandbox off); orchestrator split red/fix commits | evidence/T007-log-{red,green}.txt | 9db9069 (fix b5a4713) |
| T008 | ☑ (S6 re-sealed at b5a4713, frozen-surface 6/6, xploder 642/642; browser matrix 32 cells: TOTAL HITS 0 (was 10, all in tags mode); every moved note placed elsewhere, none newly hidden; 390 2×/3× notes hidden as before; no columns-mode hit) | orchestrator (re-seal) + 1 (Flash, browser matrix + 8 screenshots) | evidence/T008-* | this merge |
| T009 | ☑ (red: warn-spy test fails on R3F 9.8.2; patch: Timer-backed store clock in the 3 dist builds, `patchedDependencies` in pnpm-workspace.yaml; lockfile minimised by the orchestrator to patch entries only; xploder 643/643 with 0 "THREE.Clock" in output; console 0/0/0 on 3 routes; parity 8/8 at 0 px; tour 15/15 boundaries within ±1.7 ms, totals +0.1/+1.1 ms; NO-NEW-DEPS-OK) | 1 (Flash, sandbox off); orchestrator minimised the lockfile, split red/fix commits | evidence/T009-* | this merge |
| T010 | ☐ | | | |
| T011 | ☐ | | | |
| T012 | ☐ | | | |

---

## Phase G1 — Baselines + I-09 (STOP after T003)

### T001 [US7] Guards + every baseline on `a9edbfc` (R1)

- **Seam:** branch ↔ frozen surfaces and the no-drive-by fence; base export ↔ every "before" number.
- **Files:**
  - `guards.sh`: the plan.md block.
  - `approved-xploder-src.txt`: 4 sources + 3 new sealed tests, as `packages/xploder/...` paths.
  - Feature scripts, built on `rfc-repro/` and taking a base-URL argument:
    - `tour-timing.mjs`: per project, first flow, 5 runs; logs `performance.now()` of every `data-xploder-tour-step` change from Play to `ended`, plus the per-run total;
    - `pause-events.mjs`: the `pause-sweep` matrix plus an event-count column and frames at Pause + 0.5 / 1.5 / 3.5 s;
    - `overlap-matrix.mjs`: the `note-overlap` matrix plus `/` and a `data-xploder-callouts` column (R3);
    - `corner-marks.mjs`: the four mark boxes at first paint and after settle, for a given base URL and viewport list.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence; F=.specify/features/engine-polish
  bash $F/guards.sh | tee $E/T001-log-guard.txt
  # negative controls: one S7 file, one unapproved S5 file, one unrelated app file
  printf ' ' >> packages/xploder/src/panel/state.ts; printf ' ' >> packages/xploder/src/interaction/pointer.ts; printf ' ' >> apps/web/components/project-card.tsx
  if bash $F/guards.sh > /tmp/s14-checks/t001-neg.txt 2>&1; then echo NEG-CONTROL-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/panel/state.ts packages/xploder/src/interaction/pointer.ts apps/web/components/project-card.tsx
  grep FAIL /tmp/s14-checks/t001-neg.txt | tee -a $E/T001-log-guard.txt   # expect SURFACES-S2S4S7, RESEAL-LIST, ALLOWED-PATHS
  # base export (a9edbfc) + fixtures
  git worktree add --detach /tmp/s14-base a9edbfc
  (cd /tmp/s14-base && pnpm install --frozen-lockfile && pnpm build && pnpm build:fixtures)
  rm -rf /tmp/s14-checks/base-out && cp -R /tmp/s14-base/apps/web/out /tmp/s14-checks/base-out
  rm -rf /tmp/s14-checks/base-out-fixtures && cp -R /tmp/s14-base/apps/web/out-fixtures /tmp/s14-checks/base-out-fixtures
  git worktree remove --force /tmp/s14-base
  pnpm perf:parity --serve /tmp/s14-checks/base-out --write /tmp/s14-checks/parity-base | tee $E/T001-log-parity-base.txt
  pnpm serve:out --dir /tmp/s14-checks/base-out --port 4614 & SERVE=$!; sleep 3
  node $F/tour-timing.mjs $PWD http://127.0.0.1:4614 > $E/T001-log-tour-timing-base.txt
  node $F/rfc-repro/console-warnings.mjs $PWD http://127.0.0.1:4614 > $E/T001-log-console-base.txt
  node $F/pause-events.mjs $PWD http://127.0.0.1:4614 > $E/T001-log-pause-events-base.txt
  node $F/overlap-matrix.mjs $PWD http://127.0.0.1:4614 > $E/T001-log-overlap-base.txt
  kill $SERVE
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `T001-log-guard.txt` (all OK + the three negative-control FAILs) · `T001-log-parity-base.txt` · `T001-log-tour-timing-base.txt` (2 projects × 5 runs) · `T001-log-console-base.txt` (3 warnings) · `T001-log-pause-events-base.txt` · `T001-log-overlap-base.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; the negative controls show the guards bite).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: base `a9edbfc`).

### T002 [US1] I-09 red → green (S5 + S8 edits)

- **Seam:** open detail panel ↔ engine emphasis (RFC §3.1).
- **Files:**
  - **Red commit:** `packages/xploder/test/emphasis-selected.test.ts` (`emphasisTargets` with `selected`, plus `useEmphasisDriver` through the test renderer as `emphasis-scene.test.tsx` does: both instance colours lit) and `apps/web/test/xploder-dom/viewer-selected.dom.test.tsx` (C4: jsdom, the `a11y-panel-focus.dom.test.tsx` harness mounting the real `TeardownViewer`; pointer inputs through `viewer.onPointerInput`; panels opened through the navigator proxy or `panelsMetadataOf(panels).dispatch`; reads `data-xploder-highlight` and `data-xploder-selected` (R6) on the wrapper). Cases:
    - (a) A open + B hovered → A and B lit;
    - (b) B left → A lit;
    - (c) close with the pointer elsewhere → none;
    - (d) close by clicking A while A is hovered → A lit;
    - (e) keyboard focus on A's proxy while open → A lit;
    - (f) Escape → focus back on A's proxy → A lit;
    - (g) `data-xploder-highlight` right after a mouse open = A (S7 contract).
  - **Fix commit:** `src/interaction/emphasis.ts`, `src/react/scene/Emphasis.tsx`, `src/react/TeardownViewer.tsx`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence
  grep -Eq 'FAIL|failed' $E/T002-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/emphasis-selected.test.ts --reporter verbose 2>&1 | tee $E/T002-log-green.txt
  pnpm --filter web exec vitest run test/xploder-dom/viewer-selected.dom.test.tsx --reporter verbose 2>&1 | tee -a $E/T002-log-green.txt
  pnpm --filter web exec vitest run test/xploder-dom   # the existing jsdom suites stay green
  pnpm --filter xploder exec vitest run test/emphasis.test.ts test/emphasis-scene.test.tsx test/pointer.test.ts test/viewer-panels.test.tsx test/viewer-handle.test.tsx   # sealed suites unchanged and green
  git diff --stat a9edbfc -- packages/xploder/src | tee -a $E/T002-log-green.txt   # exactly the 3 approved files
  pnpm typecheck && pnpm lint && pnpm test   # frozen-surface S5/S8 red is expected here until T003; all else green
  ```
- **Evidence:** `T002-log-red.txt` (fails at (b), plus `selected` ignored) · `T002-log-green.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet (default: the browser evidence follows in T003).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC §3.1 as approved).

### T003 [US1, US7] I-09 re-seal S5 + S8, browser evidence

- **Seam:** S5/S8 manifests ↔ T002's fix SHA; real browser ↔ AC1.
- **Files:**
  - `packages/xploder/test/frozen-surface.generate-s5.sh` / `-s8.sh` (`base=<T002 fix sha>`, notes);
  - `frozen-surface.s5.paths` (+ `test/emphasis-selected.test.ts`); `.s8.paths` unchanged (C4);
  - the regenerated manifests and `frozen-surface.test.ts` (`base`, `note`).
  - Note texts: `Re-sealed in S14 at <sha>: src/interaction/emphasis.ts + src/react/scene/Emphasis.tsx — optional selected emphasis input lit alongside highlight (I-09) + test/emphasis-selected.test.ts; see .specify/features/engine-polish/evidence/T003-log-reseal.txt.` (S5) and `… src/react/TeardownViewer.tsx — the open detail panel is the selected emphasis; open/close highlight sync keeps hover and keyboard focus; data-xploder-selected (I-09); see …` (S8).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence
  bash packages/xploder/test/frozen-surface.generate-s5.sh && bash packages/xploder/test/frozen-surface.generate-s8.sh | tee $E/T003-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T003-log-reseal.txt
  pnpm build && pnpm build:fixtures
  pnpm serve:out --dir apps/web/out-fixtures --port 4199 & FX=$!; sleep 3
  pnpm engine:probe http://127.0.0.1:4199/ --scope s7 --out /tmp/s14-checks/t003-s7 | tee $E/T003-log-engine-probe-s7.txt
  pnpm a11y:probe http://127.0.0.1:4199/ --out /tmp/s14-checks/t003-s8 | tee $E/T003-log-a11y-probe.txt
  kill $FX
  pnpm serve:out --port 4614 & SERVE=$!; sleep 3
  node .specify/features/engine-polish/rfc-repro/i09.mjs $PWD | tee $E/T003-log-i09-browser.txt   # leave B → highlight null, panel open, A lit (screens)
  # screenshots: desktop 1440 + mobile 390 (tap), light + dark, states "B hovered" and "B left" → 8 PNGs + a pixel check that A's slab colour = the hover tint
  kill $SERVE
  bash .specify/features/engine-polish/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `T003-log-reseal.txt` · `T003-log-engine-probe-s7.txt`, `T003-log-a11y-probe.txt` (PASS, same check counts as base) · `T003-log-i09-browser.txt` · `T003-screenshot-i09-{desktop,mobile}-{light,dark}-{hover-b,left-b}.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: on `/projects/websocket-inspector`, click a tile, hover another, then move off. Both tiles light while hovering; the first stays lit after (default: the screenshots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: re-seal list §9.1 as approved).

**STOP (G1).** Report: red/green, re-seal SHAs, probe parity, screenshots, tier per task.

---

## Phase G2 — I-10 (STOP after T005)

### T004 [US2] Corner marks: red under stalled HTML → DOM-order fix

- **Seam:** the HTML stream ↔ the hero's first paint (RFC §4.3).
- **Files:**
  - **Red commit:** `tools/perf/src/site-probe.ts`:
    - an in-process stall proxy (new constant `HERO_STALL_MS`);
    - a first-paint mark sampler via `addInitScript`;
    - `waitForHeroSettled` + its exported pure predicate;
    - checks `hero-marks-stable-{390x844,390x740,360x740}` inside `runClsGroup`.
  - `tools/perf/test/site-probe.test.ts`: predicate cases for every RFC §4.2 row, and mark-box comparison at 0 px tolerance.
  - **Fix commit:** `apps/web/components/home/hero-section.tsx`, where `<BlueprintSheet />` moves to directly after the content `div`. No class or prop changes.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence
  grep -E 'FAIL hero-marks-stable-(390x740|360x740)' $E/T004-log-red.txt && echo RED-RECORDED   # 390x844 passes on macOS (not content-bound)
  pnpm --filter perf-tools exec vitest run test/site-probe.test.ts
  pnpm build
  pnpm site:probe --serve apps/web/out --group cls --out /tmp/s14-checks/t004-cls | tee $E/T004-log-green.txt
  pnpm perf:parity --serve apps/web/out --compare /tmp/s14-checks/parity-base | tee $E/T004-log-parity.txt   # 0 px on all 8 shots
  git diff a9edbfc -- apps/web/components/home/hero-section.tsx | tee $E/T004-log-diff.txt   # a pure move
  bash .specify/features/engine-polish/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `T004-log-red.txt` · `T004-log-green.txt` · `T004-log-parity.txt` · `T004-log-diff.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: parity shows 0 px; the hero looks identical).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q7 DOM-order fix).

### T005 [US2] Drill waits for the settled hero; 5 local runs; corner-mark table

- **Seam:** drill tab walk ↔ hero tab stops (RFC §4.1–4.2).
- **Files:** `tools/perf/src/site-probe.ts`.
  - **Red commit:** a drill stress in `runDrillGroup`. Lazy `.js` requests that start after hydration are delayed by the new constant `DRILL_LATE_CHUNK_MS` (2000), so the loop button mounts after the structure is read. That reproduces the CI race deterministically.
  - **Fix commit:** `waitForHeroSettled(page)` before `readDrillStructure`, and in `probeCell` after `activateHomeLive` for `/`. `SETTLE_MS` and all existing timeouts are unchanged (R4).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence; F=.specify/features/engine-polish
  grep -E 'FAIL drill-shift-tab-reverses' $E/T005-log-red.txt && echo RED-RECORDED
  pnpm build
  for i in 1 2 3 4 5; do pnpm site:probe --serve apps/web/out --group drill,cls --out /tmp/s14-checks/t005-run$i | tee $E/T005-log-run$i.txt; done
  node -e '/* summarise: 16 CLS cells + 3 mark checks × 5 runs, drill verdicts */' > $E/T005-log-cls-drill-5runs.md
  pnpm serve:out --port 4614 & SERVE=$!; sleep 3
  node $F/corner-marks.mjs $PWD http://127.0.0.1:4614 390x844,390x740 | tee $E/T005-log-corner-marks.md   # first paint vs after reveal, stalled + direct
  kill $SERVE
  bash $F/guards.sh   # TIMEOUT-NOT-RAISED-OK must print
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `T005-log-red.txt` · `T005-log-run{1..5}.txt` · `T005-log-cls-drill-5runs.md` (table: cell × run → total, plus drill pass per run) · `T005-log-corner-marks.md` (x, y, w, h for the 4 marks, before and after reveal; identical).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the 5-run table; the CI 5 runs come in T011).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q8; the CI attempts are triggered in T011 as a measurement).

**STOP (G2).** Report: red/green for both halves, the 5-run table, the coordinates, the guard proof that no timeout was raised.

---

## Phase G3 — I-03 (STOP after T006)

### T006 [US3] Resume from the remaining time; settle-count lock

- **Seam:** hero storyboard timer ↔ Pause/Play (RFC §5, R5).
- **Files:**
  - **Red commit:** `apps/web/test/home-hero-loop.test.tsx`, new cases with a fake `schedule`/`cancel`/`now`:
    - pause 400 ms into explode, resume after 5 s → next phase scheduled at 1000 ms (red: 1400);
    - same for implode, turn and the zoom settle;
    - pause in a tour phase → unchanged (green before and after).
  - **Fix commit:** `apps/web/components/hero/hero-loop.ts` (optional `now`, `startedAt`, `elapsed`, remaining-time `resumePending`).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence; F=.specify/features/engine-polish
  grep -Eq 'FAIL|failed' $E/T006-log-red.txt && echo RED-RECORDED
  pnpm --filter web exec vitest run test/home-hero-loop.test.tsx --reporter verbose 2>&1 | tee $E/T006-log-green.txt
  pnpm build
  pnpm serve:out --port 4614 & SERVE=$!; sleep 3
  node $F/pause-events.mjs $PWD http://127.0.0.1:4614 | tee $E/T006-log-pause-events.md   # 16 cells: count = 1; frames equal; next phase within one frame of the remaining time
  kill $SERVE
  pnpm site:probe --serve apps/web/out --group reduced-motion --out /tmp/s14-checks/t006-rm | tee $E/T006-log-reduced-motion.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `T006-log-red.txt` · `T006-log-green.txt` · `T006-log-pause-events.md` (event count per cell, frame-equality verdicts, before-vs-after resume delay against T001) · `T006-screenshot-i03-pause-{a,b,c}.png` · `T006-log-reduced-motion.txt`.
- **STOP rule:** if any cell shows a count ≠ 1, do not fix it here. STOP and report: the fix would be in S6 `OverlayProjector`, outside the re-seal list (SR3.2).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: on `/`, press Pause during the explode, wait, then press Play. The story carries on without a long still pause (default: the event log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q3 as approved).

**STOP (G3).**

---

## Phase G4 — I-05 (STOP after T008)

### T007 [US4] Note avoids plate layer names (S6), red → green + equivalence

- **Seam:** S6 overlay placement ↔ S7 plate lettering (RFC §6).
- **Files:**
  - **Red commit:** `packages/xploder/test/overlay-note-clear.test.ts`. Cases: the package fixtures A/B/C, plus the two real projects read **read-only** from `.specify/content/{websocket-inspector,jev-toolkit}.json` with the package's own parser and fixture registry (no string is copied into the test; if parsing needs a tech id the fixture registry lacks, the test strips `tech` before parsing, since layout ignores it). The real projects are the cases T001 proved to overlap, so they carry the red. Zoom 1 / 1.953125 / 3, widths 390 / 1440. Asserts: the note rect ∩ every `layerLetteringModel` quad = ∅ (SAT, 0 px).
  - **Fix commit:** `src/overlay/model.ts`, plus an equivalence block in the same test file. It copies the pre-fix `tagsModel` placement call and asserts every non-dimension placement is deep-equal.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence
  grep -Eq 'FAIL|failed' $E/T007-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/overlay-note-clear.test.ts --reporter verbose 2>&1 | tee $E/T007-log-green.txt
  pnpm --filter xploder exec vitest run test/overlay-place.test.ts test/overlay-model.test.ts test/overlay-place-equivalence.test.ts test/overlay-columns.test.ts   # sealed suites green
  git diff --stat a9edbfc -- packages/xploder/src/lettering   # empty (S7 imported, not edited)
  pnpm typecheck && pnpm lint && pnpm test   # frozen-surface S6 red is expected until T008
  ```
- **Evidence:** `T007-log-red.txt` · `T007-log-green.txt` (including equivalence).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q5, Q6).

### T008 [US4, US7] I-05 re-seal S6 + browser rectangle matrix

- **Files:**
  - `frozen-surface.generate-s6.sh` (`base=<T007 fix sha>`);
  - `frozen-surface.s6.paths` (+ `test/overlay-note-clear.test.ts`);
  - the manifest and `frozen-surface.test.ts`.
  - Note: `Re-sealed in S14 at <sha>: src/overlay/model.ts — dimension notes avoid the plate layer-name quads; every other placement output-identical (I-05) + test/overlay-note-clear.test.ts; see .specify/features/engine-polish/evidence/T008-log-rects.md.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence; F=.specify/features/engine-polish
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee $E/T008-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T008-log-reseal.txt
  pnpm build && pnpm serve:out --port 4614 & SERVE=$!; sleep 5
  node $F/overlap-matrix.mjs $PWD http://127.0.0.1:4614 | tee $E/T008-log-rects.md   # every cell: note polygon, all layer-name polygons, callout mode, verdict; 0 hits
  kill $SERVE
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **STOP rule (R3):** a hit in `columns` mode → STOP and ask (would need `overlay/columns.ts`).
- **Evidence:** `T008-log-reseal.txt` · `T008-log-rects.md` (before = `T001-log-overlap-base.txt`) · `T008-screenshot-i05-{1440,390}-{light,dark}-{1x,2x,3x}.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: zoom in twice on a project page. "5 layers" no longer covers a layer name (default: the rectangle table + screenshots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

**STOP (G4).**

---

## Phase G5 — I-04 (STOP after T009)

### T009 [US5] Timer-backed R3F store clock (pnpm patch)

- **Seam:** R3F store ↔ `three` deprecation warning (RFC §7).
- **Files:**
  - **Red commit:** `packages/xploder/test/no-clock-warning.test.tsx` (mounts the smallest `@react-three/test-renderer` root, spies on `console.warn`, expects 0 messages containing `THREE.Clock`).
  - **Fix commit:** `patches/@react-three__fiber@9.8.2.patch`, `pnpm-workspace.yaml` (`patchedDependencies`), `pnpm-lock.yaml`.
- **Order:** the baselines already exist (T001). Red → `pnpm patch @react-three/fiber@9.8.2` → edit the three `dist/events-*.js` → `pnpm patch-commit` → `pnpm install --frozen-lockfile` → green.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence; F=.specify/features/engine-polish
  grep -Eq 'FAIL|failed' $E/T009-log-red.txt && echo RED-RECORDED
  rm -rf node_modules && pnpm install --frozen-lockfile
  grep -c 'new THREE.*Clock()' node_modules/.pnpm/@react-three+fiber@9.8.2*/node_modules/@react-three/fiber/dist/events-*.js | tee $E/T009-log-patch.txt   # 0 per file
  pnpm --filter xploder exec vitest run test/no-clock-warning.test.tsx --reporter verbose 2>&1 | tee $E/T009-log-green.txt
  pnpm build
  pnpm perf:parity --serve apps/web/out --compare /tmp/s14-checks/parity-base | tee $E/T009-log-parity.txt   # 0 px
  pnpm serve:out --port 4614 & SERVE=$!; sleep 3
  node $F/rfc-repro/console-warnings.mjs $PWD http://127.0.0.1:4614 | tee $E/T009-log-console.txt   # 0 on 3 routes
  node $F/tour-timing.mjs $PWD http://127.0.0.1:4614 > /tmp/s14-checks/t009-tour.txt
  kill $SERVE
  node $F/tour-timing.mjs --compare $E/T001-log-tour-timing-base.txt /tmp/s14-checks/t009-tour.txt | tee $E/T009-log-tour-parity.md   # every boundary and total within ±16.7 ms of the base median
  bash $F/guards.sh   # NO-NEW-DEPS-OK must print
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
- **Evidence:** `T009-log-red.txt` · `T009-log-patch.txt` · `T009-log-green.txt` · `T009-log-console.txt` · `T009-log-tour-parity.md` · `T009-log-parity.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: open DevTools on `/`. No `THREE.Clock` warning (default: the console log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q4; no upstream issue is filed by the agent).

**STOP (G5).**

---

## Phase G6 — I-08 + PR + gates (final STOP after T012)

### T010 [US6] Remove the stale workflows; open the draft PR

- **Tier:** orchestrator (Hard Rule 5).
- **Files:** delete `.github/workflows/{eager-3d,eager-load,hero-eager}.yml`; add `required-contexts.sh` (feature dir).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s14-checks .specify/features/engine-polish/evidence; E=.specify/features/engine-polish/evidence
  git show --stat --format=%H HEAD | tee $E/T010-log-i08-commit.txt   # exactly three deletions
  git push -u origin task/s14-engine-polish   # SSH; on rejection → STOP, hand to Murphy with this command
  gh pr create --draft --base main --title "S14: engine & hero polish (I-09/I-10/I-03/I-05/I-04/I-08)" --body-file /tmp/s14-checks/pr-body.md
  # wait for the checks to complete, then:
  bash .specify/features/engine-polish/required-contexts.sh <pr> | tee $E/T010-ci-required-contexts.json   # 7 present + completed; 0 expected-without-run; removed names absent
  ```
- **Evidence:** `T010-log-i08-commit.txt` · `T010-ci-required-contexts.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: the PR's Checks tab shows no eager-3d / eager-load / hero-eager jobs (default: the JSON).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Only if the push is rejected: run the printed push command yourself (default: not needed, SSH push).

### T011 [US2, US7] Five CI attempts of the site probe; full gate matrix

- **Tier:** orchestrator.
- **Steps:**
  - On the final head, run `gh run rerun <run> --job <a11y: axe (production routes) job id>` four more times. That gives five attempts in total, all recorded whatever they show (Q8).
  - Collect `site-probe/cls.json` + `drill.json` from each attempt's artifact.
  - The gates:
    - CI required 7 green;
    - Lighthouse ≥ 95/95 on `/`, `/projects` and `/projects/jev-toolkit`;
    - weight < 3 MB;
    - axe 0/0;
    - local `site:probe --group draws,hero` (2 draw calls, eager reveal with zero input);
    - `eager:probe --serve apps/web/out --route / --expect live-loop`.
- **Evidence:** `T011-log-ci-site-probe-5runs.md` (16 cells + 3 mark checks × 5, drill × 5) · `T011-ci.txt` (run URLs, check list) · `T011-log-gates.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the 5-run table + CI links).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the reruns are a measurement, per Q8).

### T012 [US7] AC1–AC7 self-check

- **Tier:** orchestrator.
- **Files:** `evidence/AC-selfcheck.md` (verdict + evidence links per AC; re-seal SHAs and notes; the S2/S3/S4/S7 empty-diff output; the tier table from the ledger; items needing Murphy's hands); `T012-log-surfaces.txt` (`guards.sh` + frozen-surface tests).
- **Check:** `bash .specify/features/engine-polish/guards.sh | tee $E/T012-log-surfaces.txt && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The hover (I-09), the zoomed note (I-05) and pause/play on the hero (I-03), on the PR preview, in both palettes, phone and desktop. This is non-blocking; you said you would give feedback later.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" when satisfied (default: wait; no merge without your word).
  2. Keep `task/s14-engine-polish` on origin after the squash merge (default: yes; it holds the S5/S6/S8 seal bases).

**STOP (final).** Murphy validates and signals "S14 done" outside the agent's view.
