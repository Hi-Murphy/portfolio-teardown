# Tasks: S15 Engine Timing & Events (E1, E2, E4, E5, E8)

**Input:** `rfc.md` (approved, §13 Gate 1: all defaults + R1–R10), `spec.md`, `plan.md` in `.specify/features/engine-timing/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1): `codex exec -p deepseek -C <worktree> -s danger-full-access "<prompt>" < /dev/null`.
- The **sandbox is off** for every task: the checks build with Turbopack, run vitest on loopback or launch Chromium, and the Codex sandbox blocks all three. The prompt limits writes to the task worktree and `/tmp/s15-checks`.
- Before each phase group's first dispatch, probe the executor: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`.
- A DeepSeek 402 means the executor is *unavailable*, not that it failed. Pause, report, and offer three choices: top-up, orchestrator on "go", or split.

**Escalation (kickoff Hard Rule 11, RFC R9):**
- Tier 1.5 (OpenRouter) is **DORMANT**: skipped, and the skip is recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage (`$CLAUDE_CONFIG_DIR/usage/usage.json`, flagged if ≥ 90%), then finishes the task personally on "go".
- Each report states the finishing tier and any skip.
- A failing `RESEAL-LIST-OK`, `ALLOWED-PATHS-OK` or `SURFACES-S2S4S7-OK` guard is never "fixed" by widening the guard. It is a STOP and an escalation with evidence.

**Hard STOPs inside tasks (no workaround):**
- an S13 or S14 I-03 original test goes red (Hard Rule 6);
- a hold boundary moves by more than 16.7 ms (Hard Rule 7);
- an S4-split or S7 file would need to change (Q1);
- a seal tag push is rejected.

**Usage pacing:** at ≥ 85% of the 5h window, no new task starts. Finish and commit the current task, tick the ledger, report, then STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s15-engine-timing`, on branch `task/s15-engine-timing-tNNN`. The orchestrator reviews it, re-runs the check, and merges it back with `--no-ff`. A worktree is removed only after its merge (global rule).

**Evidence doctrine (kickoff Hard Rule 10):** every claim attaches a machine artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`). Browser logs carry a header with the command, target, Chromium version, CPU throttling and commit. Budgets come from `tools/perf/src/budgets.ts` and are never changed.

**Format & rules (every task):**
- **Start of every check:** `set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing`.
- **End of every check:** `bash $F/guards.sh` (from T001 on), then `pnpm typecheck && pnpm lint && pnpm test`.
- **Build:** tasks that read `apps/web/out` run `pnpm build` first; tasks that read `out-fixtures` run `pnpm build:fixtures` first.
- **Test-first (Hard Rule 3):** each fix task first commits the red test alone, with the failing output saved as `T<NNN>-log-red.txt` (non-zero exit). Only then does it commit the fix, with `T<NNN>-log-green.txt`.
- **No literals:** no motion or colour literals, and no product strings outside content modules.
- **Never touch:** `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, S2/S4/S7 paths, the 21 S3 tool files, or any sealed file not on `approved-xploder-src.txt`.
- **Commits:** message prefix `S15/TNNN:`, ending with the attribution line. Run `gitleaks dir` on new prose and evidence before each commit. Stage-boundary commits on the slice branch use `S15/stage-N:`.
- **Re-seal tasks** follow plan.md "Re-seal procedure", including the pushed tag. Its name and SHA go in the ledger.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA | Seal tag |
|---|---|---|---|---|---|
| T001 | ☑ (10 guards OK, AC1 PENDING 3 hits; negative controls FAIL SURFACES-S2S4S7 + RESEAL-LIST + ALLOWED-PATHS; holds 5 runs, self-compare PASS; pause sweep: 1–2 settles while paused in every mid-tween cell; pause-freeze 40/40 cells on target phase, non-zero diffs in most (today's pause is not a freeze); settle-once: hero zoomin ×4 and turn ×4/×6 show a mid-tween label reveal (AC3 browser red); E8 pooled ×4 median 50.0 ms both projects → NO-CACHE on the threshold, context only) | 1 (Flash, sandbox off, 2 dispatches: attempt 2 fixed instrument defects found in review); orchestrator fixed the allowed-paths regex and the settle-once / settle-timing definitions, re-ran both | evidence/T001-* | ff1789c | — |
| T002 | ☑ (red: suite fails to import; green 8/8; S5 re-sealed, frozen-surface 6/6; full suite xploder 651, web 273 + 6 skipped, perf 303) | 1 (Flash, sandbox off, 1 dispatch); orchestrator pushed the tag | evidence/T002-log-{red,green,reseal}.txt | 60823c9 (fix 12cc065) | `seal/s5-12cc065` (pushed) |
| T003 | ☑ (red 4/4 fail; green 4/4; 5 unchanged scene suites 41/41; Scene.tsx only) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T003-log-{red,green,reseal}.txt | 06a91cc (fix d4efeaf) | `seal/s6-d4efeaf` (pushed) |
| T004 | ☑ (red 4/4 fail; green 4/4; S13 originals byte-identical, 33/33 green on the new clock) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T004-log-{red,green,s13-reproof,reseal}.txt | 83bd930 (fix 1ff1d01) | `seal/s5-1ff1d01` (pushed) |
| T005 | ☑ (red 2/3 fail: no `at`, held paused frame emits; green 3/3; unchanged overlay/scene suites green; stopped correctly at ALLOWED-PATHS for two jsdom tests needing `at: 0` → orchestrator allow-listed them, RFC R11) | 1 (Flash, sandbox off, 1 dispatch) + orchestrator (R11 guard edit, full suite) | evidence/T005-log-{red,green,reseal}.txt | 96e5c54 (fix 2c9187d) | `seal/s6-2c9187d` (pushed) |
| T006 | ☑ (red: AC1 scan 1 hit PanelLayer:394, viewer-clock dom red; R7 scanner green on arrival with negative controls; green 13/13 + dom 12/12; AC1 scan → only src/time/clock.ts; AC1-SCAN-OK hard; build green; hero + draws probe PASS) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T006-log-{red,green,ac1-scan,reseal,g2-site-probe}.txt | 472e950 (fix 74394e9) | `seal/s5-s8-74394e9` (pushed) |
| T007 | ☑ (attempt 1 stopped correctly: S5 viewer-handle + S7 viewer-panels tests expect pause() → tour paused → R12; attempt 2: red 6/6 + dom 2/2 → green; sealed tests byte-identical and green; S7 untouched; engine:probe 2 orchestrator runs PASS (executor saw one earlier timeout, recorded)) | 1 (Flash, sandbox off, 2 dispatches; the first was a correct STOP, not a failure) | evidence/T007-log-{red,green,callers,engine-probe,engine-probe-orchestrator,reseal}.txt | 62dfeaa (fix 5d3abdb) | `seal/s5-s8-5d3abdb` (pushed) |
| T008 | ☑ (red 5/6 fail; green 6/6: frameloop never while paused, poses byte-identical at +0.5 s/+3 s, 0 settles, one repaint on resize, restore on resume, one settle after the tween end; regression suites 40/40) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T008-log-{red,green,reseal}.txt | merge on slice branch (fix ea61882) | `seal/s6-ea61882` (pushed) |
| T009 | ☑ (red 4/7 fail; green xploder-dom 19/19; second sweep, no-getAnimations guard; build green) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T009-log-{red,green,reseal}.txt | merge on slice branch (fix 07b22cd) | `seal/s8-07b22cd` (pushed) |
| T010 | ☑ (red 2/27 fail; green 27/27; hero-loop.ts unchanged; S14 I-03 originals byte-identical + 4 fake-clock twins green; pause-freeze 40/40 cells: 0 px at +1f/+0.5 s/+3 s, 0 settles while paused, latency ≤ 2.3 ms, resume landing consistent within one frame (implied explode end 1186–1203 ms for every offset); HOLDS PASS, max delta 4.4 ms; reduced-motion + hero + draws PASS) | 1 (Flash, sandbox off, 1 dispatch); orchestrator verified the I-03 bodies and the resume landing | evidence/T010-*, T010-log-pause-review.md | 712b995 | — |
| T011 | ☑ (red 12/23 fail; green; signature removed; phase on settled; stopped correctly on 3 rules → orchestrator: R15 approves the view-offset test edit, diagnosed the hero turn-start one-frame flash (pre-existing, R14 → T011b) and an instrument timing error (settle-once now times frames at DOM read); holds → see T011b analysis) | 1 (Flash, sandbox off, 1 dispatch) + orchestrator (diagnosis, instrument fix) | evidence/T011-log-{red,green,reseal,settle-once,holds,turn-flash}.*, T011-log-holds-run{1..5}.txt | 1e07278 (fix 8506837) | `seal/s6-8506837` (pushed) |
| T011b | ☑ (R14: moving in the same commit as a target/turn/zoom change; red dom 5 cases → green; turn-start flash gone (first turn frame 0 labels); settle-once 22/22 ONCE at CPU ×4/×6; pause-freeze 10/10 0 px / 0 settles; site-probe hero/draws/reduced-motion/cls PASS; holds: boundaries ±3.3 ms, one label-duration median +17.6 ms in this set, pooled 10 runs PASS max +14.95 ms, frame-level shift exactly 1 frame (explode 33.3 → 16.7 ms) → Murphy accepted at G4 (defaults)) | 1 (Flash, sandbox off, 1 dispatch) + orchestrator (holds pooling, frame-level timing) | evidence/T011b-log-{red,green,reseal,turn-frames,settle-once,holds,holds-analysis,e8-x1,site-probe}.*, T011b-log-holds-run{1..5}.txt | fa68bae (fix b8c7c49) | `seal/s8-b8c7c49` (pushed) |
| T012 | ☑ (red: emitter module missing, dom 5/6 fail; green emitter 7/7, dom events 6/6, xploder-dom 30/30; Scene no longer gets onSettled; engine:probe PASS) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T012-log-{red,green,reseal}.txt | merge on slice branch (fix 8f27462) | `seal/s8-8f27462` (pushed) |
| T013 | ☑ (red 7/58 fail → green 58/58; site-probe waits on xploder:ready → first xploder:settled → structure; eager-probe ready-event vs attribute ≤ 0.2 ms, settledAtMs, rest window only grows; site:probe --ci PASS, eager:probe live-loop ×2 PASS, engine:probe PASS; TIMEOUT-NOT-RAISED-OK; event log: ready first and once per route, 1 settled per motion with the right phase on both projects (8/8 ONCE), / 6 settles + 2 tour ends per loop) | 1 (Flash, sandbox off, 1 dispatch) + orchestrator (event-log per-motion check, re-run) | evidence/T013-log-{red,green,probes,event-order}.* | 6f46047 | — |
| T014 | ☑ (final head 9df0a02, 412×823 mobile, ×1/×4/×6, 10 runs × 3 motions × 2 projects, 0 invalid; binding event-anchored pooled ×4 median 50.0 ms both projects → NO-CACHE; like-for-like with base (attributes) 50.0 → 33.3 ms; zoom is the slowest motion (×4 83–100 ms event-anchored); placement self time not attributable in the minified export → task time reported) | orchestrator | evidence/T014-log-e8-{timing,timing-attributes,decision}.* | this commit | — |
| T015 | n/a — T014 NO-CACHE; place.ts unchanged | — | evidence/T015-log-skipped.txt | — | n/a |
| T016 | ☐ | | | | — |
| T017 | ☐ | | | | — |

---

## Phase G1 — Baselines + clock (STOP after T002)

### T001 [US6] Guards, approved list, scripts, every baseline on `8c410f3` (R8)

- **Seam:** branch ↔ frozen surfaces and the no-drive-by fence; base export ↔ every "before" number.
- **Files:**
  - `guards.sh` (the plan.md block), `approved-xploder-src.txt` (plan.md "Approved sealed edits", as `packages/xploder/...` paths), `seal-tag.sh` (plan.md re-seal step 4).
  - Scripts:
    - `pause-freeze.mjs`: the RFC §5.3 matrix, with `--phases`, `--viewports` and `--cpu`; hero-figure screenshots at +1 frame / +0.5 s / +3 s, a pixel diff, a settle count from a `MutationObserver` on the label and lettering elements plus `xploder:settled` when present, freeze latency and resume landing.
    - `settle-once.mjs` (RFC §6.3).
    - `event-log.mjs` (RFC §7.2).
    - `settle-timing.mjs` (RFC §8).
    - `holds-compare.mjs`: reads `storyboard-timing.mjs` outputs (`SUMMARY_JSON`) for base runs and new runs, and prints per-boundary medians with deltas and a PASS/FAIL at ±16.7 ms.
    - Each script degrades to the attribute signals on base, where no events exist, and says so in its header.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  bash $F/guards.sh | tee $E/T001-log-guard.txt          # all OK; AC1-SCAN reports PENDING
  # negative controls: one S7 file, one S4-split file, one unapproved S5 file, one unrelated app file
  printf ' ' >> packages/xploder/src/panel/state.ts; printf ' ' >> packages/xploder/src/react/scene/CameraRig.tsx
  printf ' ' >> packages/xploder/src/interaction/pointer.ts; printf ' ' >> apps/web/components/project-card.tsx
  if bash $F/guards.sh > /tmp/s15-checks/t001-neg.txt 2>&1; then echo NEG-CONTROL-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/panel/state.ts packages/xploder/src/react/scene/CameraRig.tsx packages/xploder/src/interaction/pointer.ts apps/web/components/project-card.tsx
  grep FAIL /tmp/s15-checks/t001-neg.txt | tee -a $E/T001-log-guard.txt   # expect SURFACES-S2S4S7, RESEAL-LIST, ALLOWED-PATHS
  git ls-remote --tags origin 'seal/*' | tee $E/T001-log-seal-tags-base.txt   # 4 existing tags
  # base export
  git worktree add --detach /tmp/s15-base 8c410f3
  (cd /tmp/s15-base && pnpm install --frozen-lockfile && pnpm build)
  rm -rf /tmp/s15-checks/base-out && cp -R /tmp/s15-base/apps/web/out /tmp/s15-checks/base-out
  git worktree remove --force /tmp/s15-base
  pnpm serve:out --dir /tmp/s15-checks/base-out --port 4615 & SERVE=$!; sleep 3
  for i in 1 2 3 4 5; do node .specify/features/engine-polish/storyboard-timing.mjs $PWD http://127.0.0.1:4615 > $E/T001-log-holds-base-run$i.txt; done
  node .specify/features/engine-polish/tour-timing.mjs $PWD http://127.0.0.1:4615 > $E/T001-log-tour-timing-base.txt
  node .specify/features/engine-polish/pause-events.mjs $PWD http://127.0.0.1:4615 > $E/T001-log-pause-events-base.md   # expect 1 settle while paused (S14 contract)
  node $F/pause-freeze.mjs $PWD http://127.0.0.1:4615 > $E/T001-log-pause-freeze-base.md                          # expect non-zero diffs (today's pause is not a freeze)
  node $F/settle-once.mjs $PWD http://127.0.0.1:4615 --cpu 4,6 > $E/T001-log-settle-once-base.md
  node $F/settle-timing.mjs $PWD http://127.0.0.1:4615 --cpu 1,4,6 > $E/T001-log-e8-base.md
  kill $SERVE
  cp $F/evidence/RFC-log-ac1-scan-base.txt $E/T001-log-ac1-scan-base.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `T001-log-guard.txt` (all OK, plus the three negative-control FAILs) · `T001-log-seal-tags-base.txt` · `T001-log-holds-base-run{1..5}.txt` · `T001-log-tour-timing-base.txt` · `T001-log-pause-events-base.md` · `T001-log-pause-freeze-base.md` · `T001-log-settle-once-base.md` · `T001-log-e8-base.md` · `T001-log-ac1-scan-base.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; the negative controls show the guards bite).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: base `8c410f3`).

### T002 [US1] Clock module + fake-clock suite (S5) → re-seal S5 + tag

- **Seam:** host time ↔ engine time (RFC §3, R1).
- **Files:**
  - **Red commit:** `packages/xploder/test/clock.test.ts`, the 8 cases of RFC §3.3. Red: the module is missing.
  - **Fix commit:** `src/time/clock.ts`, `src/time/fake.ts`; exports in `src/react/index.ts` and `test/fixtures/index.ts`.
  - **Re-seal commit:** `frozen-surface.s5.paths` (+ `src/time`, + `test/clock.test.ts`), the generator, the manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S15 at <sha>: src/time/clock.ts + src/time/fake.ts — one injectable, pausable engine clock, the only host-time reader (E1) + test/clock.test.ts; see .specify/features/engine-timing/evidence/T002-log-green.txt.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed|Cannot find' $E/T002-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/clock.test.ts --reporter verbose 2>&1 | tee $E/T002-log-green.txt
  grep -rnE 'performance\.now\(|Date\.now\(|setTimeout\(' packages/xploder/src/time | tee -a $E/T002-log-green.txt   # only browserHost in clock.ts
  bash packages/xploder/test/frozen-surface.generate-s5.sh | tee $E/T002-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T002-log-reseal.txt
  bash $F/seal-tag.sh s5 <fix sha> | tee -a $E/T002-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `T002-log-red.txt` · `T002-log-green.txt` · `T002-log-reseal.txt` (incl. the `ls-remote` line for the tag).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the suite log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q5; `src/time` sealed in S5).

**STOP (G1).** Report the guards, the baselines (today's pause shows 1 settle and non-zero diffs), the clock suite red/green, and tag 1.

---

## Phase G2 — Consumers (STOP after T006)

### T003 [US1] Scene on the clock: explode → camera → emphasis (S6) → re-seal S6 + tag

- **Seam:** `Scene` ↔ `Slabs` / `CameraRig` / `useEmphasisDriver` (RFC §4 steps 2–4).
- **Files:**
  - **Red commit:** `test/scene-clock.test.tsx`, three blocks written in order: explode, camera, emphasis (RFC §4). Red: `Scene` has no `clock` prop.
  - **Fix commit:** `src/react/scene/Scene.tsx` (`clock?` prop, `clockFromNow` for `now`, default `createEngineClock()`; `defaultNow` removed). **No** edit to `Slabs.tsx`, `CameraRig.tsx`, `Emphasis.tsx`, `explode.ts` or `camera.ts`.
  - **Re-seal:** S6 (+ `test/scene-clock.test.tsx`). Note: `… src/react/scene/Scene.tsx — every tween samples the injected engine clock (E1: explode, camera, emphasis) …`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T003-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/scene-clock.test.tsx --reporter verbose 2>&1 | tee $E/T003-log-green.txt
  pnpm --filter xploder exec vitest run test/scene.test.tsx test/camera-zoom.test.tsx test/emphasis-scene.test.tsx test/overlay-projector.test.tsx test/blueprint-scene.test.tsx   # unchanged suites green
  git diff --stat 8c410f3 -- packages/xploder/src | tee -a $E/T003-log-green.txt   # Scene.tsx only (+ src/time from T002)
  # re-seal S6 + tag (plan.md procedure) → $E/T003-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `T003-log-red.txt` · `T003-log-green.txt` · `T003-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q1; no S4-split file).

### T004 [US1, US2] Tour on the clock; the viewer owns the clock (S5) → re-seal S5 + tag

- **Seam:** viewer ↔ tour clock (RFC §4 step 5, R1).
- **Files:**
  - **Red commit:** `test/tour-clock-engine.test.tsx`: the three S13 cases on `createFakeClock()` with **no** Vitest timers, plus "boundaries at k × tourBeat of clock time" and "`viewer.clock` is the clock passed in". Red: `viewer.clock` is undefined.
  - **Fix commit:** `src/react/useTeardownViewer.ts` (`clock?` option, `clockFromNow` through a ref, `viewer.clock` reader) and `src/react/useTourClock.ts` (`clock.schedule(delay, tick, timestamp)`).
  - **Re-seal:** S5 (+ `test/tour-clock-engine.test.tsx`). Note: `… useTeardownViewer.ts + useTourClock.ts — the viewer owns the engine clock; tour boundaries on clock.schedule (E1) …`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T004-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/tour-clock-engine.test.tsx --reporter verbose 2>&1 | tee $E/T004-log-green.txt
  # S13 re-proof: originals byte-identical and green on the new clock (Hard Rule 6)
  git diff --quiet 8c410f3 -- packages/xploder/test/tour-clock-boundary.test.tsx packages/xploder/test/tour-clock.test.tsx && echo S13-TESTS-UNCHANGED | tee $E/T004-log-s13-reproof.txt
  pnpm --filter xploder exec vitest run test/tour-clock-boundary.test.tsx test/tour-clock.test.tsx test/viewer-handle.test.tsx test/viewer-panels.test.tsx test/tour.test.ts --reporter verbose 2>&1 | tee -a $E/T004-log-s13-reproof.txt
  # re-seal S5 + tag → $E/T004-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **STOP rule:** any original S13 case red → STOP (Hard Rule 6).
- **Evidence:** `T004-log-red.txt` · `T004-log-green.txt` · `T004-log-s13-reproof.txt` · `T004-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the S13 re-proof log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T005 [US1, US2] Overlay on the clock (S6) → re-seal S6 + tag

- **Seam:** `OverlayProjector` ↔ clock (RFC §4 step 6).
- **Files:**
  - **Red commit:** `test/overlay-clock.test.tsx`: `settled.at` equals the fake-clock time of the settling frame; a paused clock over 10 rendered frames gives 0 events (the C4 held-frame case included).
  - **Fix commit:** `src/react/scene/OverlayProjector.tsx` (`clock` prop, `at`, silent while paused) and `Scene.tsx` (passes the clock). `OverlayEvent` gains `at` (additive).
  - **Re-seal:** S6 (+ the test). Note: `… OverlayProjector.tsx — overlay events stamped in engine time; none while the clock is paused (E1) …`.
- **Check:** as T003, with `test/overlay-clock.test.tsx` and the unchanged `overlay-projector.test.tsx` green → `T005-log-{red,green,reseal}.txt`.
- **Evidence:** `T005-log-red.txt` · `T005-log-green.txt` · `T005-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T006 [US1] Viewer plumbing, `hostNow`, AC1 scanners (S8 + S5) → re-seal S5 + S8 + tag

- **Seam:** `TeardownViewer` ↔ `Scene`; xploder source ↔ host time (RFC §4 step 7, Q6, R5, R7).
- **Files:**
  - **Red commit:**
    - `test/no-time-reads.test.ts` (red: 3 hits);
    - `test/no-real-timers.test.ts` over the animation-test list (RFC §10 AC1 row), with the R7 rule and a negative control;
    - `apps/web/test/xploder-dom/viewer-clock.dom.test.tsx` (R5: `Canvas` pass-through, `Scene` stub capturing props; red: no `clock` prop).
  - **Fix commit:** `src/react/TeardownViewer.tsx` (`<Scene clock={viewerMetadataOf(viewer).clock}>`) and `src/react/panel/PanelLayer.tsx` (`hostNow()`).
  - **Re-seal:** S8 + S5 (S5 gets the two scanner tests). Tag `seal/s5-s8-<sha>`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T006-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/no-time-reads.test.ts test/no-real-timers.test.ts --reporter verbose 2>&1 | tee $E/T006-log-green.txt
  pnpm --filter web exec vitest run test/xploder-dom --reporter verbose 2>&1 | tee -a $E/T006-log-green.txt
  { echo "# command: grep -rnE 'performance\.now\(|Date\.now\(' packages/xploder/src"; grep -rnE 'performance\.now\(|Date\.now\(' packages/xploder/src; } | tee $E/T006-log-ac1-scan.txt   # only src/time/clock.ts
  # re-seal S5 + S8 + tag → $E/T006-log-reseal.txt
  bash $F/guards.sh   # AC1-SCAN-OK is a hard guard from here on
  pnpm build && pnpm --filter web exec vitest run && pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `T006-log-red.txt` · `T006-log-green.txt` (incl. the negative control) · `T006-log-ac1-scan.txt` (base 3 → 1, the clock) · `T006-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: open `/projects/jev-toolkit` on the branch build. Everything moves as before (default: the unchanged suites; nothing visible changes in G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

**STOP (G2).** Report: four consumer proofs, the S13 re-proof, the AC1 scan at 0, tags 2–5.

---

## Phase G3 — Pause/resume (STOP after T010)

### T007 [US2] `pause()` / `resume()` / `pauseTour()` with every caller (S5 + S8 + app) → re-seal S5 + S8 + tag

- **Seam:** viewer actions ↔ the clock and every tour-pause caller (RFC §5.1, R2, R3).
- **Files:**
  - **Red commit:** `test/viewer-pause.test.tsx` (fake clock):
    - pause mid-step 3 s → step and `positionAt` frozen, the boundary fires `remaining` after resume;
    - `pauseTour()` = the old reducer path;
    - `viewer.paused`;
    - pause/resume idempotent.
    - `apps/web/test/xploder-dom/viewer-pause.dom.test.tsx`: a slab tour command "pause" and the case-study auto-pause still give tour `paused` with the clock running.
  - **Fix commit:**
    - `src/react/useTeardownViewer.ts`;
    - `src/react/TeardownViewer.tsx` (adapter for `executeTourCommand`, case-study auto-pause → `pauseTour`);
    - `apps/web/components/workbench/workbench-client.tsx`, `apps/web/app/dev/engine/engine-playground.tsx`, the `hero-stage.tsx` watchdog and `pauseTour` mapping (rename only, no freeze wiring yet);
    - `apps/web/test/home-hero-loop.test.tsx` stage mocks (R3).
  - **Re-seal:** S5 (+ `viewer-pause.test.tsx`) + S8. Tag `seal/s5-s8-<sha>`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T007-log-red.txt && echo RED-RECORDED
  grep -rnE '\.pause\(\)' packages/xploder/src apps/web/components apps/web/app | tee $E/T007-log-callers.txt   # every remaining call is the scene freeze by intent
  pnpm --filter xploder exec vitest run test/viewer-pause.test.tsx test/viewer-panels.test.tsx test/panel-tour-click.test.ts --reporter verbose 2>&1 | tee $E/T007-log-green.txt
  pnpm --filter web exec vitest run test/xploder-dom test/home-hero-loop.test.tsx --reporter verbose 2>&1 | tee -a $E/T007-log-green.txt
  git diff --quiet 8c410f3 -- packages/xploder/src/react/panel/executeTourCommand.ts && echo S7-UNTOUCHED | tee -a $E/T007-log-green.txt
  # re-seal S5 + S8 + tag → $E/T007-log-reseal.txt
  pnpm build && pnpm build:fixtures
  pnpm serve:out --dir apps/web/out-fixtures --port 4199 & FX=$!; sleep 3
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s15-checks/t007-engine | tee $E/T007-log-engine-probe.txt   # tour groups identical to base
  kill $FX
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `T007-log-red.txt` · `T007-log-callers.txt` · `T007-log-green.txt` · `T007-log-engine-probe.txt` · `T007-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: on a project page, play the tour and press its Pause. It pauses the tour only, as before, and hover still lights tiles (default: the jsdom and engine-probe logs).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q2).

### T008 [US2] Frame gate (S6) → re-seal S6 + tag

- **Seam:** clock pause ↔ R3F frame loop (RFC §5.2 item 2, R4).
- **Files:**
  - **Red commit:** `test/scene-pause.test.tsx` (fake clock): pause mid-explode / mid-turn / mid-zoom / mid-emphasis, advance 0.5 s and 3 s while rendering frames:
    - `progress`, the camera matrix and the lift are byte-identical;
    - 0 `settled` events;
    - frameloop `never` while paused;
    - a resize while paused gives exactly one identical-pose repaint;
    - after resume, the first sample equals the paused sample, and `settled` arrives once at `pauseAt + remaining`.
  - **Fix commit:** `src/react/scene/Scene.tsx` (`<ClockGate>`).
  - **Re-seal:** S6 (+ the test).
- **Check:** red/green + `scene.test.tsx`, `scene-clock.test.tsx`, `overlay-*.test.tsx` green → `T008-log-{red,green,reseal}.txt`.
- **Evidence:** `T008-log-red.txt` · `T008-log-green.txt` · `T008-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q3).

### T009 [US2] DOM motion freeze + `data-xploder-clock` (S8) → re-seal S8 + tag

- **Seam:** clock pause ↔ WAAPI/CSS animations in the viewer (RFC §5.2 item 5, C5, R6).
- **Files:**
  - **Red commit:** extend `apps/web/test/xploder-dom/viewer-pause.dom.test.tsx`, giving the wrapper a stub `getAnimations` that returns fake animations:
    - pause → each running animation is `pause()`d, and a second sweep runs on the next rAF;
    - resume → `play()`;
    - `data-xploder-clock` is `paused` / `running`;
    - no `getAnimations` → no throw.
  - **Fix commit:** `src/react/TeardownViewer.tsx`.
  - **Re-seal:** S8. Note: `… TeardownViewer.tsx — viewer animations paused and resumed with the engine clock; data-xploder-clock (E2) …`.
- **Check:** red/green + `pnpm --filter web exec vitest run test/xploder-dom` → `T009-log-{red,green,reseal}.txt`.
- **Evidence:** `T009-log-red.txt` · `T009-log-green.txt` · `T009-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T010 [US2] Hero uses the freeze; I-03 re-proof; browser freeze matrix

- **Seam:** hero storyboard / labels ↔ the viewer clock (RFC §5.2 item 6, C6, Q10).
- **Files:**
  - **Red commit:** in `apps/web/test/home-hero-loop.test.tsx`:
    - four fake-clock twins of the I-03 cases (implode, mid-explode, mid-turn, tour-end hold), with `schedule`/`now` from `createFakeClock()`;
    - a stage test: a user pause calls `viewer.actions.pause()` **before** `controller.pause()`, and resume runs in reverse;
    - the storyboard schedules on `viewer.clock`.
  - **Fix commit:** `hero-stage.tsx` (clock-backed `schedule`/`cancel`/`now`, freeze-first order, figure sweep) and `hero-leader.tsx` (label waits on the clock via the showcase context). `hero-loop.ts` is **not** edited.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T010-log-red.txt && echo RED-RECORDED
  git diff --quiet 8c410f3 -- apps/web/components/hero/hero-loop.ts && echo HERO-LOOP-UNCHANGED | tee $E/T010-log-i03-reproof.txt
  pnpm --filter web exec vitest run test/home-hero-loop.test.tsx --reporter verbose 2>&1 | tee -a $E/T010-log-i03-reproof.txt   # 8 originals + 4 twins green
  pnpm build
  pnpm serve:out --port 4616 & SERVE=$!; sleep 3
  node $F/pause-freeze.mjs $PWD http://127.0.0.1:4616 --cpu 1,4 | tee $E/T010-log-pause-freeze.md   # every cell: 0 px, 0 settles, latency ≤ 1 frame, resume at remaining ± 1 frame
  for i in 1 2 3 4 5; do node .specify/features/engine-polish/storyboard-timing.mjs $PWD http://127.0.0.1:4616 > /tmp/s15-checks/t010-holds-run$i.txt; done
  kill $SERVE
  node $F/holds-compare.mjs $E/T001-log-holds-base-run*.txt -- /tmp/s15-checks/t010-holds-run*.txt | tee $E/T010-log-holds.md   # every boundary within ±16.7 ms
  pnpm site:probe --serve apps/web/out --group reduced-motion,hero --out /tmp/s15-checks/t010-rm | tee $E/T010-log-reduced-motion.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T010-OK
  ```
- **STOP rules:** an I-03 original red; a hold > 16.7 ms; any matrix cell with a pixel diff or a settle → STOP and report the cell (no workaround).
- **Evidence:** `T010-log-red.txt` · `T010-log-i03-reproof.txt` · `T010-log-pause-freeze.md` · `T010-screenshot-pause-<phase>-<vp>-{p1f,p05,p3}.png` · `T010-log-holds.md` · `T010-log-reduced-motion.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: on `/`, press Pause during the explode, during the zoom and during the tour. Everything stops at once, and Play carries on from the same picture (default: the matrix screenshots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q10, Q11).

**STOP (G3).** Report: the freeze matrix (before vs after), the I-03 and S13 re-proofs, holds, tags 6–8.

---

## Phase G4 — Settle state (STOP after T011)

### T011 [US3] Settled from tween state; phase on the event (S6) → re-seal S6 + tag

- **Seam:** tweens' rest state ↔ overlay settle (RFC §6, R10).
- **Files:**
  - **Red commit:** `test/overlay-settle-state.test.tsx`:
    - the C4 repro promoted: hold 1, 2 and 5 frames mid-explode, mid-turn and mid-zoom → 0 settles until the end, then exactly 1;
    - settle in the rest frame, with `at` = the tween end;
    - a discrete change (resize, reduced-motion turn) → `moving` and `settled` in the same frame;
    - phase precedence (explode > zoom > turn; the initial rest gives the explode state);
    - the pure `restState` cases.
    - `test/overlay-projector.test.tsx` turn-test assertion moved (RFC §6.2). Red: today it settles at 0.2 s.
  - **Fix commit:** `src/react/scene/OverlayProjector.tsx` (rest key, at-rest predicate, `phase`, signature removed) and `Scene.tsx` (rest inputs, azimuth ref).
  - **Re-seal:** S6 (+ the test). Note: `… OverlayProjector.tsx + Scene.tsx — settled from the tweens' rest state at clock time; frame signature removed; settle phase (E4) …`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T011-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/overlay-settle-state.test.tsx test/overlay-projector.test.tsx test/overlay-clock.test.tsx test/scene-pause.test.tsx --reporter verbose 2>&1 | tee $E/T011-log-green.txt
  ! grep -n 'signatureOf' packages/xploder/src/react/scene/OverlayProjector.tsx && echo SIGNATURE-REMOVED | tee -a $E/T011-log-green.txt
  # re-seal S6 + tag → $E/T011-log-reseal.txt
  pnpm build
  pnpm serve:out --port 4616 & SERVE=$!; sleep 3
  node $F/settle-once.mjs $PWD http://127.0.0.1:4616 --cpu 4,6 | tee $E/T011-log-settle-once.md   # 1 settle + 1 reveal per motion; 0 labels mid-tween
  for i in 1 2 3 4 5; do node .specify/features/engine-polish/storyboard-timing.mjs $PWD http://127.0.0.1:4616 > /tmp/s15-checks/t011-holds-run$i.txt; done
  kill $SERVE
  node $F/holds-compare.mjs $E/T001-log-holds-base-run*.txt -- /tmp/s15-checks/t011-holds-run*.txt | tee $E/T011-log-holds.md   # labels ≈ one frame earlier, within ±16.7 ms
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T011-OK
  ```
- **Evidence:** `T011-log-red.txt` · `T011-log-green.txt` · `T011-log-settle-once.md` (before = `T001-log-settle-once-base.md`) · `T011-screenshot-settle-<motion>-{25,50,75}.png` · `T011-log-holds.md` · `T011-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, later: with Chrome DevTools CPU 6× slowdown, explode and zoom a project. Labels appear once at the end, never mid-motion (default: the event log + captures).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q12).

**STOP (G4).**

---

## Phase G5 — Events (STOP after T013)

### T012 [US4] Events emitter + wiring + DOM mirror (S8) → re-seal S8 + tag

- **Seam:** overlay settle / first frame / tour status ↔ public events (RFC §7.1).
- **Files:**
  - **Red commit:**
    - `test/viewer-events.test.ts`: emitter tests for ready-first buffering, once per transition, tour-ended after a same-frame settle, and nothing while paused;
    - `apps/web/test/xploder-dom/viewer-events.dom.test.tsx`: callbacks and `CustomEvent`s fire once per transition, a tour end once, and a `pauseTour()` is not an end.
  - **Fix commit:** `src/react/events.ts` (new) and `src/react/TeardownViewer.tsx` (props `onReady`, `onSettled(phase)` (widened, re-sourced), `onTourEnded`; TSDoc with the order; DOM mirror).
  - **Re-seal:** S8 (+ `src/react/events.ts`, + `test/viewer-events.test.ts` in `.s8.paths`).
- **Check:** red/green + `pnpm --filter web exec vitest run test/xploder-dom` + `engine-playground` typecheck → `T012-log-{red,green,reseal}.txt`.
- **Evidence:** `T012-log-red.txt` · `T012-log-green.txt` · `T012-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q8).

### T013 [US4, US6] Probes on events; browser event log; S14 checks

- **Seam:** probes ↔ viewer events (RFC §7.2).
- **Files:**
  - **Red commit:** `tools/perf/test/site-probe.test.ts` and `eager-probe.test.ts`: the waits resolve on the recorded events (an injected event log); `readyAtMs` cross-check fails when the event and the attribute differ by more than a frame. Red: the functions are missing.
  - **Fix commit:** `tools/perf/src/site-probe.ts` (`waitForHeroSettled`) and `tools/perf/src/eager-probe.ts` (`readyAtMs`, `settledAtMs`, rest wait). No constant changes value.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  grep -Eq 'FAIL|failed' $E/T013-log-red.txt && echo RED-RECORDED
  pnpm --filter perf-tools exec vitest run test/site-probe.test.ts test/eager-probe.test.ts --reporter verbose 2>&1 | tee $E/T013-log-green.txt
  pnpm build && pnpm build:fixtures
  pnpm site:probe --serve apps/web/out --ci --out /tmp/s15-checks/t013-site | tee $E/T013-log-probes.txt
  for i in 1 2; do pnpm eager:probe --serve apps/web/out --route / --expect live-loop --out /tmp/s15-checks/t013-eager$i | tee -a $E/T013-log-probes.txt; done
  pnpm serve:out --dir apps/web/out-fixtures --port 4199 & FX=$!; sleep 3
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s15-checks/t013-engine | tee -a $E/T013-log-probes.txt
  kill $FX
  pnpm serve:out --port 4616 & SERVE=$!; sleep 3
  node $F/event-log.mjs $PWD http://127.0.0.1:4616 | tee $E/T013-log-event-order.md   # one hero loop + a scripted run on both projects: every count = 1; order as documented
  kill $SERVE
  bash $F/guards.sh   # TIMEOUT-NOT-RAISED-OK must print
  pnpm typecheck && pnpm lint && pnpm test && echo T013-OK
  ```
- **Evidence:** `T013-log-red.txt` · `T013-log-green.txt` · `T013-log-probes.txt` · `T013-log-event-order.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the probe and event logs).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

**STOP (G5).**

---

## Phase G6 — Phone measurement (STOP after T014 / T015)

### T014 [US5] Placement/settle timing table at CPU ×1/×4/×6, both projects; decision

- **Seam:** label placement cost ↔ the G1 threshold (RFC §8).
- **Tier:** orchestrator (browser measurement), with Flash allowed for the script run.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s15-checks .specify/features/engine-timing/evidence; E=.specify/features/engine-timing/evidence; F=.specify/features/engine-timing
  pnpm build
  pnpm serve:out --port 4616 & SERVE=$!; sleep 3
  node $F/settle-timing.mjs $PWD http://127.0.0.1:4616 --cpu 1,4,6 --runs 10 | tee $E/T014-log-e8-timing.md
  kill $SERVE
  node $F/settle-timing.mjs --decide $E/T014-log-e8-timing.md --cpu 4 --threshold-ms 50 | tee $E/T014-log-e8-decision.txt   # prints CACHE or NO-CACHE with both medians
  ```
- **Evidence:** `T014-log-e8-timing.md` (project × CPU × motion → median / p95 / max of settle delay, placement self time and task time; plus meta) · `T014-log-e8-decision.txt` · context: `T001-log-e8-base.md`.
- **Decision:** `NO-CACHE` → T015 is recorded as n/a; the table is the deliverable (AC5). `CACHE` → T015.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the decision line (default: no action).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the 50 ms threshold at CPU ×4, either project).

### T015 [US5] *(conditional)* Output-identical placement cache (S6) → re-seal S6 + tag

- **Runs only if** T014 prints `CACHE`.
- **Files:**
  - **Red commit:** an equivalence test over the S11.8 oracle corpus plus the real settle frames captured by T014, asserting 0 differing coordinates between cached and uncached placement, and a hit-rate assertion (red: no cache).
  - **Fix commit:** `src/overlay/place.ts`.
  - **Re-seal:** S6. Then re-run T014's measurement into `T015-log-e8-after.md`.
- **Evidence:** `T015-log-{red,green,reseal}.txt` · `T015-log-e8-after.md`, or `T015-log-skipped.txt` with T014's decision line.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

**STOP (G6).**

---

## Phase G7 — Gates and seals (final STOP after T017)

### T016 [US6] PR, CI, gate matrix, holds re-run, tag list

- **Tier:** orchestrator.
- **Steps:**
  1. `git push -u origin task/s15-engine-timing`.
  2. `gh pr create --draft --base main --title "S15: engine timing & events (E1/E2/E4/E5/E8)" --body-file /tmp/s15-checks/pr-body.md`.
  3. Wait for CI, then collect:
     - the seven required contexts green (`../engine-polish/required-contexts.sh <pr>`);
     - Lighthouse ≥ 95/95 on `/`, `/projects` and `/projects/jev-toolkit`;
     - CLS 0; axe 0/0; weight < 3 MB;
     - local `site:probe --group draws,hero` (2 draw calls, eager reveal with zero input);
     - `eager:probe --expect live-loop` ×2.
  4. The final holds and tour timing (5 runs) against T001.
  5. `git ls-remote --tags origin 'seal/*'`, with every manifest base matched.
- **Evidence:** `T016-ci.txt` (run URLs, check list) · `T016-ci-required-contexts.json` · `T016-log-gates.md` · `T016-log-holds.md` · `T016-log-tour-timing.md` · `T016-log-seal-tags.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. On the PR preview: pause and play the home hero in each phase, on phone and desktop, in both palettes (non-blocking).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Only if a push is rejected: run the printed command (default: not needed, SSH push).

### T017 [US6] AC1–AC6 self-check

- **Tier:** orchestrator.
- **Files:** `evidence/AC-selfcheck.md`, containing:
  - the verdict and evidence links per AC;
  - the clock scan and the fake-clock suite;
  - pause frame identity at +0.5 s / +3 s with zero settles;
  - the settle-once logs;
  - event order and frequency;
  - the timing table ×3 CPU profiles with the cache decision;
  - the gate matrix;
  - every re-seal SHA, note and tag;
  - the S3/S4/S7 empty-diff output;
  - the tier table from the ledger;
  - the items needing Murphy's hands.
  - Plus `T017-log-surfaces.txt` (`guards.sh` + frozen-surface tests).
- **Check:** `bash $F/guards.sh | tee $E/T017-log-surfaces.txt && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The hero pause and play (every phase), a project tour pause (unchanged) and slow-CPU label behaviour, on the preview. This is non-blocking; you test later.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" when satisfied (default: wait; no merge without your word).

**STOP (final).** Murphy validates and signals "S15 done" outside the agent's view.
