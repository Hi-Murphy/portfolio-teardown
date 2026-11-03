# Tasks: S11.6 Staged Canvas Mount

**Input:** `rfc.md` (approved at Gate 1: all §7 defaults; refinements R1–R9 in §9), `spec.md`, `plan.md` in `.specify/features/staged-canvas-mount/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`).
- The **sandbox is off** for every task. Each check needs loopback (Turbopack build, `serveDir`, Chromium), which the Codex sandbox blocks.
- Writes are limited to the task worktree and `/tmp/s116-checks`.
- Before each dispatch wave, probe with `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: pause, report, and offer top-up / orchestrator on "go" / split.

**Escalation (kickoff Hard Rule 8):**
- Tier 1.5 is **DORMANT**, so it is skipped and recorded per task.
- If tier 1 is stuck ×2 on a task, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes personally on Murphy's "go".
- Each ledger row states the finishing tier.

**Usage pacing:**
- Murphy states "5h: N%" at gates (Gate 1: 0%; G1: 47%; G2: 80%).
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s11.6-staged-canvas-mount` on branch `task/s11.6-staged-canvas-mount-tNNN`. The orchestrator reviews it and merges it back with `--no-ff`. The worktree is removed only after its merge (global rule).

**Measurement tasks (T004–T009, T010 local part):**
- They run on the merged slice branch, one worktree at a time, so the CPU is quiet: no parallel builds, browsers or other measurement.
- The host stays plugged in. `benchmarkIndex` is recorded per run.

**Evidence doctrine (kickoff Hard Rule 7):**
- Every number attaches its artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`).
- Every measurement is 2 runs, median (= mean of 2) + both raws. A spread above 20 % → flagged, the pair repeated, all runs kept.
- Perf claims use the dropped-frames / long-task style only. Budgets are never changed.

**Format & rules (every task):**
- Every check starts with `set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks $F/evidence`.
- Every check ends with `bash $F/guards.sh` (from T001 on) and `pnpm typecheck && pnpm lint && pnpm test`. Tasks that touch product code or measure also run `pnpm build`.
- No motion or colour literals; no numeric timeouts in xploder code. No product strings outside `apps/web/content/*`.
- Never touch:
  - `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`;
  - dev/fixture routes, `apps/web/test/xploder-dom/**`;
  - the S8 perf tools, any workflow file;
  - any sealed test file;
  - any frozen xploder path except the files in `approved-xploder-src.txt`.
- **No `packages/xploder/src` change before T004 is committed** (Hard Rule 3, `REBASELINE-FIRST-OK`). T001–T003 touch only `tools/perf` and the feature dir.
- **Visual change = STOP (Hard Rule 5):** every lever task runs the 8-shot parity compare. Any differing pixel stops the task and is reported with the diff mask.
- Commit message prefix: `S11.6/TNNN:`, ending with the attribution lines. Run `gitleaks dir` on new prose and evidence before committing.

**Paths (used in checks):**

| Label | Route | Engagement |
|---|---|---|
| `home-move` | `/` | `move` |
| `project-move` | `/projects/websocket-inspector` | `move` |
| `project-click` | `/projects/websocket-inspector` | `click` |

**A/B protocol (lever tasks):** `perf:startup` clean ×2 and `fps:engine --scenario startup` ×2, on all three paths. The "before" is the previous accepted state's after-runs (for T005: T004's re-baseline). Keep rule: Δ (max long task, dropped frames, blocking ms or cost) > the larger run spread of the two states. Otherwise revert and record "no measurable win".

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (17 guards + PARTITION-OK; 6 negative controls bite; four-scope bytes reproduce S11.5 T014 exactly) | 1 (Flash); check re-run by orchestrator after plan defect D-P1 | evidence/T001-log-guard.txt | b835614 |
| T002 | ☑ (droppedFrameTimes = droppedFrames; tasksOver16ms via shared `findTasksOver`; fps-engine.test.ts unmodified) | 1 (Flash) ×2: orchestrator review revision (duplicated task selection, window bound); D-P2 found | evidence/T002-log-fps-timeline.txt | c608f82 |
| T003 | ☑ (`--cpu-profile` with native-aware attribution; sequence: ready.raf = firstInstancedDraw.raf) | 1 (Flash) ×2: orchestrator review revision (url-less samples dropped); 1 re-dispatch after API stream disconnect (not counted); evidence note corrected by orchestrator | evidence/T003-log-profile-sequence.txt | ec3e1b6 |
| T004 | ☑ AC1 re-baseline: max long task 57.7 / 56.9 / 54.2 ms (fps, home-move / project-move / project-click), dropped 1 / 6 / 6.5, cost 268 / 317 / 328 ms; no drift (parity 0 px vs T014, bytes identical); chain mount → first frame → post-frame commit holds every drop | 1 (Flash: measurements + tables) + orchestrator (task identity, §7 interpretation, lever order) | evidence/T004-log-rebaseline.md, T004-log-task-identity.txt | 607e919 |
| T005 | ☑ kept L1: long tasks 0 on all paths (max 57.7/56.9/54.2 → 0 ms); dropped frames 1→2 / 6→6 / 6.5→5.5; time to first content +2 / +10 / +15 ms (D-P3 fix; first pass was +275–285 ms); parity 0 px; bytes +722 raw / +307 gz (lazy scope; project initial gz +2) | 1 (Flash) ×2: orchestrator review revision (300 ms Suspense retry throttle, D-P3); frame diagnosis by orchestrator | evidence/T005-log-l1-ab.md, T005-log-frame-diagnosis.md | 992bd43 |
| T006 | ☑ kept L4 (keep rule met only by project-move cost −3.2 ms vs 1.5 ms spread; long tasks stay 0; dropped frames 2→1.5 / 6→5 / 5.5→5.5 within spread; first content −0.4 / −9.2 ms project, home +28.5 within its 47.9 ms pair spread); bytes +766 raw / +311 gz total; some drops fall outside any > 16.7 ms task | 1 (Flash) | evidence/T006-log-l4-ab.md | (this merge) |
| T007 | ⊘ skipped (evidence): program setup inside the first-frame task is ≈ 4–6 ms (T004 §3: `acquireProgram` 1.2, `setup` 1.7, `getParameters` 1.1 ms, plus uniforms) of a ≈ 32 ms task. Removing all of it leaves ≈ 26–28 ms, still above one frame, so no dropped frame moves under the AC2 harness (T005-log-frame-diagnosis.md). The rest of the frame (three render + overlay projection) must stay in the first content frame (AC4) | — | evidence/T004-log-rebaseline.md §3, T006-log-l4-ab.md §7 | — |
| T007b | ↺ measured and reverted (keep rule: no metric beyond spread; project-move cost +4.7 ms; dropped frames 1.5→1 / 5→5.5 / 5.5→5, all within spread; only `setPhase` feeds the post-frame commit). Lever + re-seal reverted, evidence kept | 1 (Flash); revert by orchestrator | evidence/T007b-log-l5-ab.md | 7dbfebf |
| T008 | ⊘ skipped (G1 decision; T004 §4/§7: probe in a < 50 ms task with no frame pending, no drop) | — | evidence/T004-log-rebaseline.md §7 | — |
| T008b | ☑ kept: vs T006 −477 B raw / −175 B gz total, behaviour within spread (long tasks 0, parity 0 px, AC4 sequence holds); residual vs T004: lazy/total +289 raw / +136 gz, project initial gz +2 (chunk-hash names) | 1 (Flash) | evidence/T008b-log-bytes.md | (this merge) |
| T009 | ☑ final (L1 + L4 + compaction): max long task 0 ms on all paths (T004: 57.7/56.9/54.2); dropped frames 2 / 5.5 / 5.5 (T004: 1 / 6 / 6.5) → **AC2 FAIL** (long-task half met, dropped-frame half not); parity 0 px ×8, draws 2, CLS 0; bytes vs T004: total/lazy +289 raw / +136 gz, project initial gz +2 → **AC3 byte clause FAIL**; AC4 PASS; first content +5.6 / +8.8 / +8.0 ms | 1 (Flash) | evidence/T009-log-before-after.md, T009-log-ac2.md, T009-log-bytes.txt, T009-log-ready-reveal.md | 2324a3a |
| T010 | ☑ (`runs[].longTasks` from the LHR long-tasks audit, additive; eager-verdict prints the top 5) LOCAL eager: perf 1.00 / TBT 0.75 ms home, 1.00 / 1 ms project, CLS 0 (informational) | 1 (Flash); commit by orchestrator | evidence/T010-log-eager-local.md | (this merge) |
| T011 | ☑ **AC5 verdict: keep the gate.** Run 1 (fast runner, index ≈ 3,900): eager 1.00 / 71.5 ms home, 0.99 / 106 ms project, pass. Run 2 (slow runner, index ≈ 2,200, S11.5's host class): 0.95 / 260 ms, 0.87 / 506 ms, fail. All other PR checks green | orchestrator (push, draft PR #18, runs, verdict) | evidence/T011-log-eager-verdict.md, T011-ci-run.txt | (this commit) |
| T012 | ☐ | | | |

## Stage-3 amendments (orchestrator)

- **D-P1 (plan defect, T001):** `pnpm bundle:manifest` requires `--out-dir <out>`. Every check now calls `pnpm bundle:manifest --out-dir apps/web/out --write <file>`. Found by tier 1 in T001: the check stopped with exit 2 before `bundle-scopes.mjs` ran.
- **D-P3 (review finding, T005):**
  - **Finding:** an async `gl` factory makes R3F suspend a null `useGate` subtree. When the factory settles, React retries that subtree on a *retry lane*, and React 19.3 throttles retry commits to 300 ms after the most recent fallback commit (`react-dom` `globalMostRecentFallbackTime + 300`).
  - **Effect:** the first content frame moved +275–285 ms after engagement on all paths (T005 first pass, `firstFrame − t0`).
  - **Rule from now on:** every lever A/B also reports **time to first content frame** (`firstFrame − t0` from the clean `perf:startup` runs). A lever must not delay it beyond the run spread without Murphy's explicit OK. That would be a behaviour change (non-goal), even though `data-xploder-ready` keeps its meaning.
  - **L1 fix:** a default-lane re-render of the viewer when the factory settles. This is not throttled, and it re-runs R3F's Canvas layout effect, which then renders the root.
- **D-P2 (plan defect, T002):** `pnpm fps:engine --scenario startup` exits 6 when the startup verdict fails, which is expected for every pre-lever state. Every check therefore runs it as `pnpm fps:engine … || echo "fps-engine exit $? (verdict recorded)"`, and the verdict is read from the JSON. Same for `pnpm perf:lighthouse` (gated or eager runs may fail a budget) and `pnpm perf:parity --compare` in T004's drift check (a drift diff is recorded, not fatal). In lever tasks a parity diff stays a STOP.

---

## Phase G1 — Re-baseline (STOP after T004)

### T001 [US5] Guards, subset lists, approved list, bytes-per-scope helper

- **Seam:** branch ↔ frozen surfaces; build output ↔ AC3 byte scopes.
- **Files:**
  - `$F/guards.sh` (plan.md "Guards", every guard spelled out; `SEALED-TESTS-OK` = the `test/*` entries of all five `*.paths` files);
  - `$F/s2.paths`, `$F/s4.paths` (copied byte-for-byte from `.specify/features/engine-startup/`);
  - `$F/approved-xploder-src.txt` (a header comment only, so the approved list is empty);
  - `$F/bundle-scopes.mjs` (plan.md "Bytes").
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks $F/evidence
  diff <(cat $F/s2.paths $F/s4.paths | sed '/^$/d' | sort) <(sed '/^$/d' packages/xploder/test/frozen-surface.paths | sort) && echo PARTITION-OK | tee /tmp/s116-checks/t001.txt
  bash $F/guards.sh | tee -a /tmp/s116-checks/t001.txt
  # negative controls: each must make guards.sh exit 1 with the named FAIL line
  for f in packages/xploder/src/index.ts packages/xploder/src/react/scene/Stats.tsx packages/xploder/src/react/scene/Emphasis.tsx \
           packages/xploder/src/react/scene/Slabs.tsx packages/xploder/src/react/a11y/webgl.ts packages/xploder/test/view-scroll.test.tsx; do
    printf ' ' >> $f
    if bash $F/guards.sh > /tmp/s116-checks/t001-neg.txt 2>&1; then echo "NEG-CONTROL-FAILED $f"; exit 1; fi
    git checkout -- $f; echo "neg $f: $(grep FAIL /tmp/s116-checks/t001-neg.txt | tr '\n' ' ')" | tee -a /tmp/s116-checks/t001.txt
  done
  pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s116-checks/t001-manifest.json
  node $F/bundle-scopes.mjs /tmp/s116-checks/t001-manifest.json apps/web/out | tee -a /tmp/s116-checks/t001.txt
  node $F/bundle-scopes.mjs /tmp/s116-checks/t001-manifest.json apps/web/out /tmp/s116-checks/t001-manifest.json apps/web/out && echo SCOPES-SELF-OK | tee -a /tmp/s116-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt`. All guards OK, `PARTITION-OK`, 6 negative controls (expected: `XPLODER-SRC` + `SURFACE-S2`; `XPLODER-SRC` + `SURFACE-S4`; `XPLODER-SRC` + `SURFACE-S5`; `XPLODER-SRC` + `SURFACE-S6`; `XPLODER-SRC` + `SURFACE-S8`; `SEALED-TESTS` + `SURFACE-S5`), and the four-scope table. Its total must reproduce S11.5 T014's 1,581,558 B raw.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the negative controls show each guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the RFC D8 guard set).

### T002 [US1, US2] Dropped-frame timeline in `fps-engine --scenario startup`

- **Seam:** the kept trace ↔ which tasks frames drop behind.
- **Files:**
  - `tools/perf/src/fps.ts`: additive export `droppedFrameTimesFromTrace`;
  - `tools/perf/src/cli/fps-engine.ts`: startup report + `droppedFrameTimes`, `tasksOver16ms`;
  - `tools/perf/test/fps-engine-startup.test.ts`: new cases (count = `droppedFrames` invariant; the 16.7 ms boundary; explode/tour reports have neither field).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks
  git diff --quiet HEAD -- tools/perf/test/fps-engine.test.ts && echo FPS-ENGINE-TEST-UNMODIFIED | tee /tmp/s116-checks/t002.txt
  pnpm --filter perf-tools exec vitest run test/fps-engine-startup.test.ts test/fps-engine.test.ts test/fps.test.ts --reporter verbose 2>&1 | tee -a /tmp/s116-checks/t002.txt
  pnpm build
  pnpm fps:engine --scenario startup --route /projects/websocket-inspector --engage move --no-build --out /tmp/s116-checks/t002
  node -e 'const r=require(require("fs").readdirSync("/tmp/s116-checks/t002").filter(f=>f.endsWith(".json")).map(f=>"/tmp/s116-checks/t002/"+f)[0]);if(r.droppedFrameTimes.length!==r.droppedFrames)throw new Error("count mismatch");console.log("TIMELINE-OK",r.droppedFrames,r.tasksOver16ms.length)' | tee -a /tmp/s116-checks/t002.txt
  bash $F/guards.sh | tee -a /tmp/s116-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-fps-timeline.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; one real run shows times = count).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D2.2).

### T003 [US2, US3] `perf:startup --cpu-profile` + ready/reveal sequence

- **Seam:** CDP sampled profile ↔ per-task attribution; attributed init script ↔ the AC4 sequence.
- **Files:**
  - `tools/perf/src/cpu-profile.ts` (new, pure) + `tools/perf/test/cpu-profile.test.ts` (synthetic profile: 2 tasks above 16.7 ms, 1 below; chunk/function self-time sums ≤ task duration);
  - `tools/perf/src/cli/startup-profile.ts`: `--cpu-profile`, run kind `profiled`;
  - `tools/perf/src/startup-attribution.ts` + `startup.ts`: `sequence` (attributed runs only, `null` in clean runs);
  - `tools/perf/test/startup.test.ts`: new cases (jsdom: fake instanced draw + ready flip + two live-state changes → the expected `{t, raf}` records).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks
  pnpm --filter perf-tools exec vitest run test/cpu-profile.test.ts test/startup.test.ts --reporter verbose 2>&1 | tee /tmp/s116-checks/t003.txt
  pnpm build
  for kind in "" "--attribute" "--cpu-profile"; do
    pnpm perf:startup --serve apps/web/out --route /projects/websocket-inspector --engage move --runs 1 $kind --out /tmp/s116-checks/t003$kind 2>&1 | tail -3 | tee -a /tmp/s116-checks/t003.txt
  done
  node -e '
    const a=require("/tmp/s116-checks/t003--attribute/summary.json").runs[0];
    const s=a.sequence; if(!s||s.ready.raf!==s.firstInstancedDraw.raf) throw new Error("sequence "+JSON.stringify(s));
    const c=require("/tmp/s116-checks/t003/summary.json").runs[0]; if(c.sequence!==null) throw new Error("clean run has sequence");
    console.log("SEQUENCE-OK", s.liveStates.map(x=>x.value).join(">"));' | tee -a /tmp/s116-checks/t003.txt
  ls /tmp/s116-checks/t003--cpu-profile | grep -q cpuprofile-summary && echo PROFILE-OK | tee -a /tmp/s116-checks/t003.txt
  bash $F/guards.sh | tee -a /tmp/s116-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
  (If `summary.json`'s shape differs, the executor adapts the field paths to the existing writer and records the paths used. The assertions themselves must not change.)
- **Evidence:** `evidence/T003-log-profile-sequence.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log shows the hero/workbench live-state order captured from a real run).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D2.1, D2.3).

### T004 [US2] **AC1 re-baseline** of S11.5's final state

- **Seam:** the unmodified product (`B` = `05e4e16`, product = `66a021f`) ↔ every "before" in this slice.
- **Preconditions:** T001–T003 merged. `git diff --quiet 66a021f -- apps/web packages` holds (logged).
- **Runs** (quiet host, one at a time):
  1. `pnpm build`;
  2. per path (`home-move`, `project-move`, `project-click`):
     - `perf:startup --runs 2 --keep-trace` (clean);
     - `perf:startup --attribute --runs 2 --keep-trace`;
     - `perf:startup --cpu-profile --runs 2 --keep-trace`;
     - `fps:engine --scenario startup --no-build`, run twice;
  3. `perf:parity --serve apps/web/out --write` → `evidence/T004-screenshot-*.png` (8 shots) + `evidence/T004-log-parity-baseline.json`. Then `--compare` against S11.5's T014 shots (drift check, logged).
     - **`--compare` resolves shots by the `screenshot-<id>.png` suffix and refuses ambiguity.** So every compare runs against a single-set directory, never against an evidence dir that holds several sets.
     - Drift: `/tmp/s116-checks/s115-shots` = `T014-screenshot-*` + `T006-log-parity-baseline.json` from `engine-startup/evidence`.
     - Slice baseline: `/tmp/s116-checks/baseline-shots` = `T004-screenshot-*` + `T004-log-parity-baseline.json`, rebuilt by each lever task from the committed evidence;
  4. `site:probe --serve apps/web/out --group draws`, and `engine:probe --scope s4` on the fixture export (as in S11.5 T014);
  5. `bundle:manifest --out-dir apps/web/out --write $F/evidence/T004-log-bundle.json` + `bundle-scopes.mjs` → `evidence/T004-log-bytes.txt`;
  6. gated `perf:lighthouse` ×2 on both routes;
  7. `site:probe --group hero`.
- **Files:** evidence only, plus the ledger:
  - `evidence/T004-log-rebaseline.md`. **This file name is the `REBASELINE-FIRST-OK` anchor.** It holds:
    1. the per-path table: max long task, long tasks, dropped frames, blocking ms, cost (medians + raws);
    2. the drift table vs S11.5 T013/T014 (> 20 % flagged);
    3. the **long-task anatomy**: the per-task CPU attribution of every task above 16.7 ms, with the chunk → stage map;
    4. the **dropped-frame timeline**: each dropped frame → the task it follows;
    5. the AC4 sequence per path;
    6. bytes, draws, CLS;
    7. **the confirmed lever order with the reason** (which levers the numbers justify, and which are pre-skipped with evidence);
  - `evidence/T004-startup-*.json`, `T004-fps-startup-*.json`, `T004-cpuprofile-summary-*.json`;
  - `evidence/T004-trace-<path>-{clean,attributed}-r1.json.gz` (6 traces; a trace above 5 MB gz is trimmed to the window + categories, and the full one is kept in `.evidence/`);
  - `T004-lighthouse-summary-gated-*.json`, `T004-meta.json`.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks
  git diff --quiet 66a021f -- apps/web packages && echo PRODUCT-IS-S11.5-FINAL | tee /tmp/s116-checks/t004.txt
  test -s $F/evidence/T004-log-rebaseline.md && ls $F/evidence/T004-trace-*.json.gz | wc -l | tee -a /tmp/s116-checks/t004.txt   # expect 6
  for p in home-move project-move project-click; do ls $F/evidence/T004-fps-startup-$p-r{1,2}.json $F/evidence/T004-startup-$p-clean-r{1,2}.json >/dev/null; done && echo ARTIFACTS-OK | tee -a /tmp/s116-checks/t004.txt
  test "$(ls $F/evidence/T004-screenshot-*.png | wc -l)" -eq 8 && echo SHOTS-OK | tee -a /tmp/s116-checks/t004.txt
  bash $F/guards.sh | tee -a /tmp/s116-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **→ STOP G1.** The orchestrator presents the re-baseline, the drift, the anatomy, the dropped-frame timeline and the confirmed lever order.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T004-log-rebaseline.md`: do the numbers match your expectation from S11.5 (56–69 ms, 1–7 dropped frames), or is drift flagged?
  2. The confirmed lever order and any pre-skips.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" (or feedback) for G2 (default: the lever order in the log).
  2. Current 5h usage (default: proceed if < 85 %).

---

## Phase G2 — Staging levers (STOP after T009)

### T005 [US1] L1 — renderer in its own idle slice (`TeardownViewer.tsx`, S8)

- **Seam:** R3F `Canvas` ↔ an async `gl` factory.
- **Files:**
  - `packages/xploder/src/react/TeardownViewer.tsx`: the plan's yield helpers + `createStagedRenderer` (L1 form: `idleSlice()` then construct and return) + `gl={createStagedRenderer}`;
  - `packages/xploder/test/staged-mount.test.tsx` (new; plan.md L1 cases 1–5);
  - `$F/approved-xploder-src.txt` gains `packages/xploder/src/react/TeardownViewer.tsx`;
  - **second commit:** the S8 re-seal (plan.md "Re-seal"; reason: "async renderer factory: WebGLRenderer construction in its own idle slice (S11.6 L1)").
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks
  pnpm --filter xploder exec vitest run test/staged-mount.test.tsx test/frozen-surface.test.ts --reporter verbose 2>&1 | tee /tmp/s116-checks/t005.txt
  pnpm build
  # A/B (before = T004), all three paths, 2 runs each
  for p in "home / move" "project /projects/websocket-inspector move" "project /projects/websocket-inspector click"; do set -- $p
    pnpm perf:startup --serve apps/web/out --route $2 --engage $3 --runs 2 --out /tmp/s116-checks/t005/$1-$3
    for r in 1 2; do pnpm fps:engine --scenario startup --route $2 --engage $3 --no-build --out /tmp/s116-checks/t005/fps-$1-$3-r$r; done
  done
  rm -rf /tmp/s116-checks/baseline-shots && mkdir -p /tmp/s116-checks/baseline-shots && cp $F/evidence/T004-screenshot-*.png $F/evidence/T004-log-parity-baseline.json /tmp/s116-checks/baseline-shots/
  pnpm perf:parity --serve apps/web/out --compare /tmp/s116-checks/baseline-shots 2>&1 | tee -a /tmp/s116-checks/t005.txt      # must be 0 px on all 8 (Hard Rule 5)
  pnpm site:probe --serve apps/web/out --group draws --group hero 2>&1 | tail -5 | tee -a /tmp/s116-checks/t005.txt
  pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s116-checks/t005-manifest.json
  node $F/bundle-scopes.mjs $F/evidence/T004-log-bundle.json /tmp/s116-checks/base-out /tmp/s116-checks/t005-manifest.json apps/web/out | tee -a /tmp/s116-checks/t005.txt || echo BYTES-GREW-RECORDED
  bash $F/guards.sh | tee -a /tmp/s116-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
  - `bundle-scopes` growth is recorded here, not yet fatal. T009 is the AC3 bytes gate, and offsets may come from later levers.
  - `bundle-scopes.mjs` needs both `out` dirs for gzip. The "before" uses the T004 manifest plus a rebuild of `B` in `/tmp/s116-checks/base-out` (the executor builds it once and reuses it in T005–T009).
- **Evidence:** `evidence/T005-log-l1-ab.md`: the A/B table, the keep decision, the long-task anatomy after (`tasksOver16ms`), parity, draws, hero probe, byte deltas. Plus `T005-startup-*.json`, `T005-fps-startup-*.json`, `T005-log-reseal-s8.txt` (manifest diff = `base`, `note`, the `TeardownViewer.tsx` hash).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm build && pnpm serve:out`, open `/projects/websocket-inspector` in the Orca browser, move the pointer, and confirm the teardown appears as before.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: keep or revert per the A/B keep rule).

### T006 [US1] L4 — configuration in its own task (`TeardownViewer.tsx`, S8)

- **Seam:** factory resolution ↔ R3F `apply` (camera, `setPixelRatio`/`setSize`).
- **Files:**
  - `TeardownViewer.tsx`: `await nextTask()` after construction (plan.md L4);
  - `staged-mount.test.tsx`: + the "pending one more task" case;
  - **second commit:** the S8 re-seal at the new sha (cumulative note: "+ R3F configuration in the next task (S11.6 L4)").
- **Check:** T005's check with `t006` paths. The A/B "before" = T005's after-runs.
- **Evidence:** `evidence/T006-log-l4-ab.md` (+ JSONs, `T006-log-reseal-s8.txt`). The log ends with **"remaining blockers"**: tasks above 50 ms; dropped frames with the task each follows; slices above ≈ 27 ms tied to a frame. These decide T007/T008 (plan stop rule).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: T007/T008 run only if "remaining blockers" names them).

### T007 [US1] L2 — first-frame-only staged scene mount (`Scene.tsx`, S6) — CONDITIONAL

- **Runs only if** T006's "remaining blockers" ties a blocker to the scene mount. Otherwise the ledger records `⊘ skipped (T006 evidence)`.
- **Seam:** `Scene` first mount ↔ `RenderHold` / Stats / PickBridge ordering.
- **Files:**
  - `Scene.tsx`: the optional internal `stage` prop, steps, `RenderHold`, `invalidate()` at `STATS_STEP`, PickBridge after the first `onStats` (plan.md L2). Step groups follow the T004/T006 anatomy;
  - `TeardownViewer.tsx`: `stage={nextTask}`;
  - `staged-mount.test.tsx`: + L2 cases 1–5;
  - `approved-xploder-src.txt` gains `packages/xploder/src/react/scene/Scene.tsx`;
  - **re-seal commits:** S6 (reason: "staged first mount behind RenderHold; Stats last, PickBridge after the first content frame (S11.6 L2)") and S8 again (`stage` wiring).
- **Check:** T005's check with `t007` paths, plus:
  ```sh
  git diff --quiet 05e4e16 -- packages/xploder/test/scene.test.tsx packages/xploder/test/view-scroll.test.tsx packages/xploder/test/pick-scene.test.tsx \
    packages/xploder/test/emphasis-scene.test.tsx packages/xploder/test/blueprint-scene.test.tsx packages/xploder/test/overlay-projector.test.tsx \
    && echo SEALED-SCENE-TESTS-UNMODIFIED | tee -a /tmp/s116-checks/t007.txt
  ```
  Then the attributed `perf:startup` ×1 on both routes, with the AC4 sequence assertion vs T004.
- **Evidence:** `evidence/T007-log-l2-ab.md` (+ JSONs, `T007-log-reseal-s6.txt`, `T007-log-reseal-s8.txt`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: on the hero, the overlay lettering appears together with the teardown, not a frame later (Orca browser, `pnpm serve:out`).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the step grouping in the log).

### T007b [US1] L5 — post-first-frame commit as a transition (`TeardownViewer.tsx`, S8) — CONDITIONAL (G1-approved)

- **Runs only if** the T006 (or T007) state still shows dropped frames inside the post-frame commit (T004 §7.2 task e). Otherwise `⊘ skipped (evidence)`.
- **Seam:** first-frame callbacks (`onPhase`, `onScrollExtent`) ↔ React update priority.
- **Files:**
  - `TeardownViewer.tsx`: `setPhase` and `setScrollExtentPx` are called inside `startTransition`, so React time-slices the resulting viewer re-render. The `data-xploder-state` attribute write in `onPhase` stays synchronous. Nothing else changes;
  - `staged-mount.test.tsx`: + a case asserting both updates go through a transition (spy on `startTransition` or a React act/lanes check);
  - **re-seal commit:** S8, cumulative note "+ frame-driven viewer state updates as transitions (S11.6 L5)".
- **Check:** T005's check with `t007b` paths, plus the attributed `perf:startup` ×1 on both routes with the AC4 sequence assertion vs T004.
- **Evidence:** `evidence/T007b-log-l5-ab.md` (+ JSONs, `T007b-log-reseal-s8.txt`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: the overlay title block and lettering still appear with the teardown (Orca browser).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (approved at G1).

### T008 [US1] L3 — cheaper `hasWebgl()` probe (`a11y/webgl.ts`, S8) — CONDITIONAL

- **Runs only if** T004/T006 evidence puts the probe in a task above 50 ms or next to a dropped frame. Otherwise `⊘ skipped (evidence)`.
- **Seam:** WebGL availability ↔ the S8 a11y fallback.
- **Files:**
  - `webgl.ts`: 1×1 canvas + `{ antialias: false, depth: false, stencil: false }` (plan.md L3);
  - `staged-mount.test.tsx`: + probe cases;
  - `approved-xploder-src.txt` gains `packages/xploder/src/react/a11y/webgl.ts`;
  - **re-seal commit:** S8, cumulative note.
- **Check:** T005's check with `t008` paths, plus `pnpm a11y:axe:site --serve apps/web/out` (the fallback path stays covered by the unmodified xploder-dom tests).
- **Evidence:** `evidence/T008-log-l3-ab.md` (+ JSONs, `T008-log-reseal-s8.txt`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T008b [US3] Lever code compaction for AC3 bytes (`TeardownViewer.tsx`, S8) — added in G2

- **Why:** after T006, the lazy and total scopes are +766 B raw / +311 B gzip over S11.5 final. AC3 needs ≤ in every scope.
- **Change:** same behaviour, less code.
  - One `nextTask()` helper: `scheduler.yield()`, else a macrotask without a numeric delay. No `requestIdleCallback` path: rIC starved in T005 and was already bypassed in Chromium.
  - The D-P3 settle re-render as a `useReducer` bump called after the factory resolves. React schedules it in a later task, so it lands after R3F's `apply`, and React ignores updates after unmount, so no mounted flag is needed.
  - `createStagedRenderer` stays the module export for tests.
- **Tests:** `staged-mount.test.tsx` adapts to the new shape (same assertions: constructor args, construction after a yield, config after one more task, re-render after settle, rejection to the boundary).
- **Check:** bytes vs T004 (`bundle-scopes.mjs`, all four scopes, raw + gzip), plus a behaviour A/B vs T006 (clean ×2 + fps ×2 on 3 paths, attributed ×1 with the AC4 sequence, parity 0 px, draws, hero). Keep if bytes shrink and no metric regresses beyond spread.
- **Commits:** the lever-style commit + S8 re-seal.
- **Evidence:** `evidence/T008b-log-bytes.md`.

### T009 [US1, US3] Final AC2/AC3/AC4 + before/after table

- **Seam:** the final lever state ↔ the AC1 re-baseline.
- **Runs:** the full T004 run set on the final state (clean, attributed, profiled, fps ×2 per path; 8-shot compare; draws; bytes; gated Lighthouse ×2; hero probe).
- **Files (evidence):**
  - `evidence/T009-log-before-after.md` (Deliverable 3): per path and per lever, max long task / long tasks / dropped frames / blocking ms / cost, medians + raws, before (T004) vs each kept lever vs final;
  - `T009-log-ac2.md`: the AC2 verdict per path, with the timeline;
  - `T009-log-parity.txt` + `T009-screenshot-*`;
  - `T009-log-drawcalls.txt`;
  - `T009-log-bytes.txt`: four scopes, raw + gzip, vs T004. **This is AC3's byte gate.** Growth → offset task proposed, or STOP + escalate;
  - `T009-log-ready-reveal.md` (AC4: sequence before/after on both routes + hero probe);
  - JSONs and 6 final traces.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks
  node -e 'for (const p of ["home-move","project-move","project-click"]) for (const r of [1,2]) {
    const j=require(process.argv[1]+"/T009-fps-startup-"+p+"-r"+r+".json");
    console.log(p,r,"dropped",j.droppedFrames,"maxLT",j.maxLongTaskMs,j.verdict.pass?"PASS":"FAIL"); }' $F/evidence | tee /tmp/s116-checks/t009.txt
  grep -q "differing pixels: 0" $F/evidence/T009-log-parity.txt || grep -q '"differingPixels": 0' $F/evidence/T009-log-parity.txt
  node $F/bundle-scopes.mjs $F/evidence/T004-log-bundle.json /tmp/s116-checks/base-out $F/evidence/T009-log-bundle.json apps/web/out | tee -a /tmp/s116-checks/t009.txt
  bash $F/guards.sh | tee -a /tmp/s116-checks/t009.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
  An AC2 FAIL is not a task failure: it is recorded and escalated at the STOP (RFC Q10). A parity diff or a byte growth without an offset **is** a STOP.
- **→ STOP G2.**
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T009-log-before-after.md` and `T009-log-ac2.md` (AC2 verdict per path).
  2. Optional visual check in the Orca browser, both routes, light + dark.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for G3, including the push + draft PR (pre-approved at Gate 1, Q15; default: proceed).
  2. If AC2 is blocked: accept the escalation as recorded (default) or request a brief revision.

---

## Phase G3 — Eager-hydration re-run (STOP after T011)

### T010 [US4] Lighthouse long-task attribution + local eager numbers

- **Seam:** LHR `long-tasks` audit ↔ the eager verdict.
- **Files:**
  - `tools/perf/src/lighthouse.ts`: `runs[].longTasks`;
  - `tools/perf/src/cli/eager-verdict.ts`: prints the top 5;
  - additive cases in `lighthouse.test.ts`, `eager-verdict.test.ts`;
  - evidence `T010-lighthouse-summary-eager-{home,project}-r{1,2}.json`, `T010-log-eager-local.md`.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount; mkdir -p /tmp/s116-checks
  pnpm --filter perf-tools exec vitest run test/lighthouse.test.ts test/eager-verdict.test.ts --reporter verbose 2>&1 | tee /tmp/s116-checks/t010.txt
  pnpm build:eager && (pnpm serve:out --port 4320 & echo $! > /tmp/s116-checks/srv.pid)
  for r in 1 2; do pnpm perf:lighthouse http://127.0.0.1:4320/ --out /tmp/s116-checks/t010/eager-home-r$r || true
                   pnpm perf:lighthouse http://127.0.0.1:4320/projects/websocket-inspector --out /tmp/s116-checks/t010/eager-project-r$r || true; done
  kill "$(cat /tmp/s116-checks/srv.pid)"
  node tools/perf/src/cli/eager-verdict.ts --dir /tmp/s116-checks/t010 | tee -a /tmp/s116-checks/t010.txt
  pnpm build && bash $F/guards.sh | tee -a /tmp/s116-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T010-OK
  ```
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the local table; the runner decides).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T011 [US4] Draft PR, two runner runs, AC5 verdict (orchestrator)

- **Seam:** `eager-3d.yml` on the runner ↔ the AC5 rule.
- **Steps:**
  1. `git push -u origin task/s11.6-staged-canvas-mount`;
  2. `gh pr create --draft` (title `S11.6: staged canvas mount`; body = summary + evidence pointers + the attribution lines);
  3. wait for `perf: eager-3d (measurement)`;
  4. `gh run rerun <id>` for run 2;
  5. download both `eager-3d` artifacts → `evidence/T011-lighthouse-summary-ci-{gated,eager}-{home,project}-r{1,2}[-run2].json`;
  6. run `eager-verdict` on each → `T011-log-eager-verdict-ci-tables.md`.
- **Files:** `evidence/T011-log-eager-verdict.md`: the verdict per AC5 on both runs, the long-task attribution, the comparison with S11.5 T017. Plus `T011-ci-run.txt` (run URLs, head SHA).
- **Check:** both runs have 8 summaries each, `eager-verdict` exits 0, and the verdict line is present in the log; then `guards.sh`.
- **→ STOP G3.**
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T011-log-eager-verdict.md` (and the PR's checks tab).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for G4 (default: proceed).
  2. If the verdict is "retire": confirm that retiring D-19 is a separate follow-up after merge (default, RFC Q18).

---

## Phase G4 — Re-seal / CI (STOP after T012)

### T012 [US5] Re-seal audit, guards, CI green, AC1–AC6 self-check

- **Seam:** the whole branch ↔ AC6 + the end-contract.
- **Files (evidence):**
  - `T012-log-reseal.txt`, holding:
    - each manifest's diff vs `B`: only approved-file hashes, `base` and `note` change;
    - S2/S4/S5/S7 manifests byte-identical;
    - each generator note names S11.6 + the file + the reason;
  - `T012-log-guard.txt` (all guards OK);
  - `T012-log-frozen-diffs.txt`: `git diff --stat 05e4e16` for the S2/S5/S7 path sets (empty) and for S4/S6/S8 (approved files only);
  - `T012-ci-run.txt`: every check on the PR head green, including `seo: meta + og`, `perf: fps calibration`, both axe jobs, `perf: eager-3d (measurement)`;
  - `evidence/AC-selfcheck.md`: the AC1–AC6 table with artifacts, plus the per-task finishing tier.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/staged-canvas-mount
  bash $F/guards.sh | tee $F/evidence/T012-log-guard.txt
  test "$(git diff --name-only 05e4e16 -- packages/xploder/src | sort)" = "$(grep -v '^#' $F/approved-xploder-src.txt | sed '/^$/d' | sort)" && echo XPLODER-SRC-EXACT
  gh pr checks --required && gh pr checks | tee $F/evidence/T012-ci-run.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T012-OK
  ```
- **→ STOP (end-contract).** AC1–AC6 self-check table + "needs Murphy's hands" list.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation of the draft PR, then "merge" (the orchestrator merges only on your word).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" or feedback.
  2. If AC5 = retire: "go" for the D-19 follow-up (default: ask after merge).
