# Tasks: S11.8 Hero-Only Eager

**Input:** `rfc.md` (approved at Gate 1: all §9 defaults, the six-path E1/E2 list in §4; refinements R1–R8 in §11), `spec.md`, `plan.md` in `.specify/features/hero-eager/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`).

- The **sandbox is off** for every task that builds, serves or launches Chromium (loopback is blocked in the Codex sandbox).
- Writes are limited to the task worktree and `/tmp/s118-checks`.
- Before each dispatch wave, probe with `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: pause, report, and offer top-up / orchestrator on "go" / split.
- **CI-side steps** (push, PR, reruns, artifact download) are done by the orchestrator, never by the executor.

**Escalation (kickoff Hard Rule 10):**

- Tier 1.5 is **DORMANT**, so it is skipped and recorded per task.
- If tier 1 is stuck ×2 on a task, the orchestrator executes it personally and reports the current 5h usage at the next STOP. It never takes over automatically on a single failure.
- Each ledger row states the finishing tier.

**Usage pacing:**

- Murphy states "5h: N%" at gates (Gate 1: 16 %).
- At ≥ 85 % of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s11.8-hero-eager` on branch `task/s11.8-hero-eager-tNNN`. The orchestrator reviews it and merges it back with `--no-ff`. The worktree is removed only after its merge (global rule).

**Measurement tasks (local A/B in T005–T011):**

- They run on the merged slice branch, one at a time, so the CPU is quiet. The host stays plugged in.
- **Local numbers are labelled "local emulation" and never decide an AC.** Binding numbers come only from qualified CI attempts (RFC D1).

**Evidence doctrine (kickoff Hard Rule 9):**

- Every number attaches its artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`).
- Every measurement is 2 runs (Lighthouse: 2 invocations × median of 3), median reported, raws published. A spread above 20 % → flagged, repeated once, all runs kept.
- No secrets: `gitleaks dir` on new prose and evidence before each commit.

**Format & rules (every task):**

- Every check starts with `set -euo pipefail; F=.specify/features/hero-eager; mkdir -p /tmp/s118-checks $F/evidence`.
- Every check ends with `bash $F/guards.sh` (from T001 on) and `pnpm typecheck && pnpm lint && pnpm test`. Tasks that touch product code or measure also run `pnpm build`.
- No motion or colour literals; no numeric timeouts in app or library code. No product strings outside `apps/web/content/*`.
- **Never touch:**
  - `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**` (reading `websocket-inspector.json` in a test is allowed);
  - **any `packages/xploder/src` path not in `$F/g1-approved.txt`**; an approved path only in its own lever task, and only when its trigger holds;
  - any sealed test (`packages/xploder/test/*.paths` entries);
  - dev/fixture routes, `apps/web/test/xploder-dom/**`;
  - `ci.yml`, `perf.yml`, `eager-3d.yml`, `eager-load.yml`, `tools/perf/src/budgets.ts`;
  - any `apps/web` path not in `$F/app-touch.txt`;
  - `apps/web/components/workbench/**` (the project route keeps its gate; brief non-goal).
- **No product commit before T004 is committed** (Hard Rule 3, `BASELINE-FIRST-OK`). T001–T003 touch only `tools/perf`, the new workflow and the feature dir.
- **One lever per commit, each with an A/B.** A lever commit and its re-seal commit land in the **same** task merge (`XPLODER-SRC-OK`).
- **Visual change = STOP (kickoff Hard Rule 7):** every product task runs the parity compare. Any differing pixel stops the task and is reported with the diff mask.
- Measuring commands that may legitimately exit non-zero on a verdict (`perf:lighthouse`, `fps:engine`, `eager:probe`, `perf:parity` drift) run as `cmd || echo "exit $? (verdict recorded)"`, and the verdict is read from the JSON. In product tasks, a parity diff stays a STOP.
- Commit message prefix: `S11.8/TNNN:`, ending with the attribution lines. Stage-boundary commits use `S11.8/stage-3:`.

**Routes:** `home` = `/`, `project` = `/projects/websocket-inspector`.

**Local A/B protocol (lever tasks), via `$F/lever-block.sh`, written in T004:** "before" = the previous accepted state's `evidence/<TID>-ab/` (for T005: `T004-ab/`).

- Hero-eager build:
  - `perf:lighthouse / --cpu-multiplier $M` ×2, plus `--profile` ×1 → `perf:attribution`;
  - `fps:engine --scenario load --route / --no-build --frames trace-only --cpu 1 --names` ×2, plus `--cpu 4` ×2 (informational);
  - `eager:probe /` ×2 (live), `/ --reduced-motion` ×2, `project --expect gated` ×2;
  - `perf:parity --no-engage --route home --compare` (post-eager, 0 px);
  - the reveal-sequence probe (`perf:startup --route / --engage none --attribute --runs 2`);
  - bytes vs `0fcd243` eager.
- Gated build:
  - `perf:parity --compare` (both routes, engaged, 0 px);
  - `site:probe --group draws --group hero` (R6);
  - `perf:lighthouse project --cpu-multiplier $M` ×2 (drift indicator);
  - bytes vs `0fcd243` gated.
- `node $F/ab-table.mjs <before> <after>`: medians, spreads, the keep-rule verdict, and **the first-content-frame task's self-time split** (placement / model / program setup / GC / other).

**Keep rule:** Δ (home eager simulated TBT, the first-content-frame task's observed ms, or a named-exception ms) > the larger run spread of the two states, **and** every non-goal check passes. Otherwise revert and record "no measurable win".

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ 21 guards OK; 7 uncommitted + 1 committed negative controls bite (incl. G1-list edit); pre-slice bytes gated total 1,582,126 raw / 459,309 gz = S11.7 T013 manifest (`cmp`); budget 0.5 % = 2,296 B gz | 1 (Flash) + orchestrator review (paths-list guard tightened; total raw INFO in s11.8 mode; committed control) | evidence/T001-log-guard.txt, T001-log-bytes.txt | e902c12 |
| T002 | ☑ `--names`/`--caps` (timestamp containment, D-P2), `--rule s11.8 [--reproduce]` (S11.7 T014 fixtures: home FAIL ×2, project gated in band, REPRODUCED; default + s11.7 outputs golden), `--expect gated` bites (FAIL on build:eager, PASS gated), `parity --route`; local named run: compile = first content frame (one task), constructor `getContext` | 1 (Flash) + orchestrator review (D-P3: recorder-mode clock fix) | evidence/T002-log-harness.txt | 9676464 |
| T003 | ☑ `hero-eager.yml` (mirrors eager-load.yml; `--no-build`; post-T005 steps guarded by `EAGER_BUILD`); local dry run OK | 1 (Flash) | evidence/T003-log-workflow.txt | cdcc5c9 |
| T004 | ☑ **AC1 REPRODUCED** on `41774295096-1-s2` (index 1,964–2,349.5; home eager 219.25 / gated 90 ms); s1 corroborates (205 / 87.5); s3 not slow-class. GL SwiftShader/Vulkan. Eager-only tasks named: E2 = R3F commit → `ViewScroll` mount sync (160/32.3 ms, TBT 110) → **E2 go**; E1 = first content frame (program setup `getProgramInfoLog` 22 %) + placement (merged in s1: 161/40.1, TBT 111; separate 37–39 ms task host-native) → E1c triggered. AC2 caps: ctor 15.805, compile = first frame 34.651 ms; unnamed max 39 ms; dropped 3/4 (> 2). Project gated 88.5 (s2) / 94.5 (s1, outside band, unmodified product). Local M 16.4 | 1 (Flash: artifacts, tables, caps, local baseline) + orchestrator (CI, D-P4 tool fixes, §4–§6/§10, D-P6) | evidence/T004-log-baseline.md | 4c5a381 |
| T005 | ☑ A1: `__XP_EAGER_HERO__` define; hero gates on `__XP_EAGER_3D__ \|\| __XP_EAGER_HERO__`; workbench untouched. Project `--expect gated` 2/2, home live 2/2, parity 0 px (4 + 8), bytes PASS (hero-eager vs main eager: total gz +147 B, home initial +137 B) | 1 (Flash) | evidence/T005-log-a1.md, T005-ab/ | 0e1e464 |
| T006 | ☑ kept (D-P7): E1a output-identical placement — oracle 2,030 cases / 0 mismatches; fixture-set 13.5 → 0.46 ms; local placement task 32.1/32.6 ms → none ≥ 16.7 ms; local sim. TBT −27.5 ms (inside spread, not claimed); parity 0 px, draws 2, CLS 0, sequence OK, bytes PASS (hero-eager total gz +512 B). Re-sealed S6 at 057d89a. Triggers after: E1b met (model chunk 12–16 %), E1c met (program setup 16–44 %), E1d not met (local 175 < 185) | 1 (Flash) + orchestrator (keep decision, commits, re-seal) | evidence/T006-log-e1a-ab.md, T006-log-oracle-pre.txt, T006-ab/ | c897ce9 |
| T007 | ↺ measured and reverted (D-P8): trigger met, identity 16/16, parity 0 px; model self time 5.13 → 3.88 ms inside spread 1.46; adjacent task Δ 0.944 vs spread 0.902 (noise floor); sim. TBT −13 inside spread. `model.ts` untouched | 1 (Flash) + orchestrator (decision) | evidence/T007-log-e1b-ab.md, T007-ab-reverted/ | e11e8b7 |
| T008 | ↺ measured and reverted (D-P9): split worked at `--cpu 1` (first frame 11.1 → 3.0 ms) but at `--cpu 4` the compile task grew to 46.3/44.2 ms vs the 33.3/34.0 ms pre-lever task (+36 %, AC2 cap risk); sim. TBT unchanged. `Stats.tsx` untouched | 1 (Flash) + orchestrator (decision) | evidence/T008-log-e1c-ab.md, T008-ab-reverted/ | 4826c8b |
| T009 | ↺ measured and reverted (D-P8): trigger met by the letter (slow-host first frame ~132 ms sim; projection 191.75 > 185); the overlay model did not leave the first-content-frame task at `--cpu 4` (7.79 → 8.48 ms inside it), target Δ 1.23 inside spread 3.31; parity 0 px. `BlueprintOverlay.tsx` untouched | 1 (Flash) + orchestrator (decision) | evidence/T009-log-e1d-ab.md, T009-ab-reverted/ | 6ce084e |
| T010 | ☑ E1 final local state = A1 + E1a. vs T004 (local emulation): sim. TBT 221.5 → 193.7 ms (inside spread 62.3), placement task gone at `--cpu 4`, probes PASS, parity 0 px, bytes PASS (hero-eager total gz +512 B / 2,295 budget; gated +364 B). E2 go restated | 1 (Flash) | evidence/T010-log-before-after.md, T010-ab/ | e393048 |
| T011 | ↺ measured and reverted (D-P11): target commit task 37.0 → 34.6 ms inside spread 4.35; scroll extent 0 at ready on both routes, so the nested re-render does not occur; parity 0 px, first-frame offset identical; pre-draw `loading` moved rAF 1 → 2. Both files untouched | 1 (Flash) + orchestrator (decision) | evidence/T011-log-e2-ab.md, T011-ab-reverted/ | 895b3ec |
| T012 | ☑ **AC3 PASS 2/2** on run 42378433209 (head da757d2, first push after the final state): s1 (index 2,132–2,386.5) eager 175.5 / gated 85 ms, perf 0.98, rule (a); s3 (2,224.5–2,334.5) 157.75 / 83.5 ms, perf 0.98, rule (a); distinct runners; s2 fast, not counted. Informational same-code attempts (b7b065e, e4c1136): 147–161 ms, all pass. **AC5 PASS** (home live 4/4 ≤ 579 ms ready, reduce 4/4, project gated 4/4; project gated TBT 90.5 / 83.5 in band). **AC2 NOT MET:** unnamed max 40–47 ms ≤ 50 PASS; caps s1 PASS (median), s3 renderer-constructor 16.18 > 15.81; dropped frames 3/3 on both (> 2). Verdict: retire `/` on Murphy's word | 1 (Flash: tables) + orchestrator (CI, qualification, row correction) | evidence/T012-log-{ac2,ac3,ac5,verdict}.md | MERGE |
| T013 | ☐ | | | |
| T013b | ☐ (only on "retire") | | | |

## Stage-3 amendments (orchestrator)

- **D-P1 (review, T001):** `xploder_test_ok` no longer allows `frozen-surface*.paths` edits; `bundle-scopes --budget s11.8` budgets total **gzip** only (raw INFO), per AC4. S11.7's `--budget` mode unchanged.
- **D-P2 (pre-dispatch, T002):** `--names` identifies the three named tasks by **timestamp containment**, not by minified frame names. In `--names` mode only, the load init script records `performance.now()` at (1) the first `getContext('webgl2'|'webgl')` on a **connected** canvas (the R3F canvas; `hasWebgl()`'s probe canvas is detached) → `renderer-constructor`, (2) the first `linkProgram` call on a WebGL(2) context → `program-compile`, (3) the existing `readyMs` → `first-content-frame`. Each timestamp is mapped onto the trace clock with the existing load mark, and the top-level task containing it gets the name. V8 samples (the profiler category) supply each named / long task's `topFunctions`. The default init script and report are byte-identical.
- **D-P3 (review, T002):** recorder-mode `--names` anchored the hooks with the recorder-start mark but the load timestamp. Each load measurement now returns its own `traceOriginUs`; both frame modes name the same tasks.
- **D-P4 (AC1 run 41774295096, tool defects):** (1) `--rule s11.8` required eager/project summaries, contrary to R5; project eager is now an optional group (a partial group is still an error). (2) The `**AC1:**` line required two deciding attempts; AC1 needs one, so the first qualifying attempt in time order decides. (3) `perf:host` meta carries no timestamp, so attempt order fell back to file mtimes. `hero-eager.yml` now stamps `startedAt` into `host-meta.json`; for run 41774295096 the order is taken from the GitHub jobs API (`startedAt`: s2 04:37:09Z, s3 04:37:09Z, s1 04:37:19Z) → **the AC1 attempt is `41774295096-1-s2`**; `s1` (also slow-class, also reproduced) is corroborating; `s3` does not qualify (max index 2,603.5).
- **D-P5 (AC1 finding, harness):** in the host-native named runs the first-content-frame task holds program setup + the draw (`getProgramInfoLog` 22 %), and a separate 37–39 ms unnamed task follows it; `--names` listed unnamed tasks only above 50 ms, so that task had no attribution. `--names` now lists every unnamed task ≥ 16.7 ms with its top functions (the AC2 gate, `unnamedMaxMs` vs 50 ms, is unchanged). The binding AC1 attribution stays the profiled Lighthouse runs of s2 and s1.
- **D-P6 (review, T004):** (1) check-script `cmd && echo OK` lines are not fatal under `set -e`; T004's check now exits on each failed condition (and on any open orchestrator section); later checks follow the same `|| { echo X; exit 1; }` form. (2) `lever-block.sh`: local emulation `M` = 16.4 (T004 §9; 18.5 missed the s2 target by 26 %); the `--cpu 4` load runs also carry `--names` (local `--cpu 1` tasks are too small to split); `BEFORE` = the most recent earlier `T0NN-ab` (skipped levers leave none; T010 compares against T004); evidence copies exclude full LHRs, devtools logs and traces (they stay in `/tmp/s118-checks/<tid>`). (3) `ab-table.mjs` splits the first-content-frame task and every unnamed task ≥ 16.7 ms within 120 ms **on either side** (the E2 commit precedes it, the placement task follows), for both `--cpu 1` and `--cpu 4`.
- **D-P7 (keep rule, T006):** when the profile shows a lever's target as a separate task adjacent to the first content frame (AC1 §4: placement is merged in some runs, adjacent in others; the E2 commit precedes the frame), the keep rule's "first-content-frame task's observed ms" reads as **that targeted task's observed ms** (`ab-table.mjs` neighbour rows). E1a is kept on its placement task (32.1/32.6 ms → none ≥ 16.7 ms; spread 0.41 ms); local simulated TBT (−27.5 ms) is inside the emulation spread and not claimed.
- **D-P8 (keep rule, T007):** a lever is kept only if its **own target** moves beyond the larger spread; a task-level delta at the noise floor (here 0.944 vs 0.902 ms) with the target's self time inside its spread is "no measurable win". E1b reverted; `model.ts` untouched.
- **D-P9 (T008):** E1c reverted. `compileAsync` split the compile out of the first frame at `--cpu 1`, but at `--cpu 4` the separate compile task (46.3/44.2 ms) is larger than the whole pre-lever first-frame task (33.3/34.0 ms): it would breach AC2's `program-compile` cap (baseline + 5 %) and does not move TBT. `Stats.tsx` untouched.
- **D-P10 (CI, PR head e4c1136):** `build (typecheck, lint, test, build)` failed: `overlay-place-equivalence.test.ts` timed out at 180 s on the runner (≈ 70 s locally; the eager oracle dominates). The 2,000 seeded random layouts are kept, but each is bounded to 1–16 hulls and 4–16 labels (was 1–24 / 4–30); the fixtures and edge cases (incl. look-ahead and node-limit paths) are unchanged. Local run 32 s, still 0 mismatches. No source change.
- **D-P11 (T011):** E2 reverted. At ready the scroll extent is 0 on both routes, so the mount `sync` never calls `onExtent` and the nested re-render E2 removes does not happen; AC1's E2 task is the R3F scene-mount commit itself (with `sync` as its top self-time frame). Target Δ 2.36 ms inside spread 4.35 ms; the pre-draw `loading` state moved one rAF. `ViewScroll.tsx` / `TeardownViewer.tsx` untouched.

---

## Phase Baseline — guards, harness, workflow, AC1 (STOP after T004)

### T001 [US5] Guards, G1 list, app allowlist, byte-budget helper, pre-slice byte baseline

- **Seam:** the branch ↔ the frozen surfaces, the G1 list and the app allowlist; the build output ↔ the AC4 budget.
- **Files:**
  - `$F/guards.sh` (plan.md "Guards", every guard spelled out, helpers copied from `staged-canvas-mount/guards.sh` plus the S5 generator in `reseal_note_ok`);
  - `$F/g1-approved.txt`: the six RFC §4 paths, one per line, header comment `# G1 2026-11-04 (Murphy: "defaults. approved")`. Its sha256 is written into `guards.sh` as `G1_SHA`;
  - `$F/approved-xploder-src.txt`: header comment only;
  - `$F/app-touch.txt`: the five `apps/web` paths in plan.md;
  - `$F/s2.paths`, `$F/s4.paths`, copied from `staged-canvas-mount/`;
  - `$F/bundle-scopes.mjs`, copied from `eager-load/` plus `--budget s11.8` (plan.md "Bytes"; the S11.7 `--budget` mode kept as is).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; mkdir -p /tmp/s118-checks $F/evidence
  bash $F/guards.sh | tee /tmp/s118-checks/t001.txt
  # negative controls: each must make guards.sh exit 1 with the named FAIL line
  for f in packages/xploder/src/overlay/place.ts packages/xploder/src/index.ts packages/xploder/test/overlay-place.test.ts \
           apps/web/components/workbench/workbench-loader.tsx .github/workflows/eager-load.yml tools/perf/src/budgets.ts $F/g1-approved.txt; do
    printf ' ' >> $f
    if bash $F/guards.sh > /tmp/s118-checks/t001-neg.txt 2>&1; then echo "NEG-CONTROL-FAILED $f"; exit 1; fi
    git checkout -- $f; echo "neg $f: $(grep FAIL /tmp/s118-checks/t001-neg.txt | tr '\n' ' ')" | tee -a /tmp/s118-checks/t001.txt
  done
  # pre-slice byte baseline, both builds (product = 0fcd243 = S11.7 final)
  git diff --quiet 0fcd243 -- apps packages && echo PRODUCT-IS-BASE | tee -a /tmp/s118-checks/t001.txt
  pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write $F/evidence/T001-log-bundle-gated.json && rm -rf /tmp/s118-checks/base-gated && cp -R apps/web/out /tmp/s118-checks/base-gated
  pnpm build:eager && pnpm bundle:manifest --out-dir apps/web/out --write $F/evidence/T001-log-bundle-eager.json && rm -rf /tmp/s118-checks/base-eager && cp -R apps/web/out /tmp/s118-checks/base-eager
  for b in gated eager; do
    node $F/bundle-scopes.mjs $F/evidence/T001-log-bundle-$b.json /tmp/s118-checks/base-$b | tee -a /tmp/s118-checks/t001.txt
    node $F/bundle-scopes.mjs --budget s11.8 $F/evidence/T001-log-bundle-$b.json /tmp/s118-checks/base-$b $F/evidence/T001-log-bundle-$b.json /tmp/s118-checks/base-$b && echo "BUDGET-SELF-OK $b" | tee -a /tmp/s118-checks/t001.txt
  done
  cmp $F/evidence/T001-log-bundle-gated.json .specify/features/eager-load/evidence/T013-log-bundle-gated.json && echo BYTES-MATCH-S117-FINAL | tee -a /tmp/s118-checks/t001.txt || echo "bytes differ from S11.7 T013 (recorded)" | tee -a /tmp/s118-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:**
  - `evidence/T001-log-guard.txt`: all guards OK, plus the 7 uncommitted negative controls. Expected FAIL lines, in order:
    1. `XPLODER-SRC` + `SURFACE-S6`;
    2. `XPLODER-SRC` + `SURFACE-S2`;
    3. `SEALED-TESTS` + `XPLODER-TEST` + `SURFACE-S6`;
    4. `APP-TOUCH`;
    5. `CI-JOBS`;
    6. `BUDGETS`;
    7. `G1-LIST`.

    An 8th control proves `BASELINE-FIRST`. On a throwaway branch `t001-neg`, commit a one-byte change to an allowlisted app file with no T004 anchor; `guards.sh` must print `FAIL BASELINE-FIRST`. Then delete the branch.
  - `T001-log-bundle-{gated,eager}.json`;
  - `T001-log-bytes.txt` (the local pre-slice table, both builds, the 0.5 % total-gzip budget in bytes per build).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; each guard is shown to bite, including an edit to the G1 list itself).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: plan "Guards", RFC §4.2).

### T002 [US2, US3, US4] Harness: `--names`, `--rule s11.8`, `--expect gated`, `parity --route`

- **Seam:** the load trace ↔ the named exceptions; attempt summaries ↔ the `/`-only rule and the AC1 bands; a zero-interaction project load ↔ "still gated"; the parity capture ↔ one route.
- **Files** (plan.md "Harness", every default byte-identical):
  - `tools/perf/src/cli/fps-engine.ts`: `--names`, `--caps <json>`;
  - `tools/perf/src/cpu-profile.ts`: `samplesInWindow`;
  - `tools/perf/src/cli/eager-verdict.ts`: `--rule s11.8 [--reproduce]`;
  - `tools/perf/src/eager-probe.ts` + `src/cli/eager-probe.ts`: `--expect live|gated`;
  - `tools/perf/src/cli/parity.ts`: `--route home|project`;
  - tests (additive): `test/fps-engine-load.test.ts` (synthetic trace fixtures with `ProfileChunk`s for the three names), `test/cpu-profile.test.ts`, `test/eager-verdict.test.ts` (golden: S11.7 T014 summaries copied to `test/fixtures/eager-verdict-s117/`; the default and `--rule s11.7` outputs are captured from the **unchanged** tool in the task's first commit and must stay byte-identical after the change; `--rule s11.8` on the same fixtures → `/` FAIL on s1 and s3, project gated in band, `--reproduce` → REPRODUCED on both), `test/eager-probe.test.ts`, `test/parity.test.ts`.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; mkdir -p /tmp/s118-checks
  git diff --quiet 0fcd243 -- tools/perf/test/fps-engine.test.ts tools/perf/test/fps-engine-startup.test.ts && echo EXISTING-FPS-TESTS-UNMODIFIED | tee /tmp/s118-checks/t002.txt
  pnpm --filter perf-tools exec vitest run test/fps-engine-load.test.ts test/cpu-profile.test.ts test/eager-verdict.test.ts test/eager-probe.test.ts test/parity.test.ts --reporter verbose 2>&1 | tee -a /tmp/s118-checks/t002.txt
  ! grep -nE '\b(mouse|keyboard|touchscreen)\.|\.(hover|focus|click|tap)\(|dispatchEvent|scrollIntoView' tools/perf/src/eager-probe.ts tools/perf/src/cli/eager-probe.ts && echo PROBE-NO-INPUT-APIS | tee -a /tmp/s118-checks/t002.txt
  pnpm build:eager
  pnpm fps:engine --scenario load --route / --no-build --frames trace-only --cpu 1 --names --out /tmp/s118-checks/t002-names || echo "exit $? (verdict recorded)"
  node -e 'const fs=require("fs");const d="/tmp/s118-checks/t002-names";const r=JSON.parse(fs.readFileSync(d+"/"+fs.readdirSync(d).find(f=>f.endsWith(".json"))));const n=r.namedExceptions;for(const k of ["renderer-constructor","program-compile","first-content-frame"]){if(!n||!(k in n))throw new Error("missing "+k)}console.log("NAMES-OK",JSON.stringify(n),"unnamedMax",r.unnamedMaxMs)' | tee -a /tmp/s118-checks/t002.txt
  pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --expect gated --runs 1 --out /tmp/s118-checks/t002-gated || echo "exit $? (expected FAIL on build:eager: both routes eager)"
  pnpm build && pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --expect gated --runs 1 --out /tmp/s118-checks/t002-gated-ok
  pnpm perf:parity --serve apps/web/out --route home --write /tmp/s118-checks/t002-parity-home && ls /tmp/s118-checks/t002-parity-home | tee -a /tmp/s118-checks/t002.txt
  bash $F/guards.sh | tee -a /tmp/s118-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-harness.txt`. It holds:
  - the tests;
  - the golden lines;
  - one local `--names` run (tool check only, labelled "local, not binding"), stating whether the profiler category produced `ProfileChunk` events;
  - both `--expect gated` probes (FAIL on `build:eager`, PASS on the gated build), which prove the probe bites.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D2, Q4/Q5; R3–R5).

### T003 [US2] Workflow `hero-eager.yml`

- **Seam:** one PR push ↔ three slow-class-candidate attempts with the full measurement set.
- **Files:** `.github/workflows/hero-eager.yml` (plan.md "Workflow"; `EAGER_BUILD: build:eager`; the "after T005" steps guarded by `if: env.EAGER_BUILD == 'build:eager-hero'`).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; mkdir -p /tmp/s118-checks
  node -e 'const y=require("fs").readFileSync(".github/workflows/hero-eager.yml","utf8");for(const s of ["task/s11.8-hero-eager","--cpu 1 --names","--frames recorder","--expect gated","--rule s11.8 --reproduce","shard: [1, 2, 3]","EAGER_BUILD"])if(!y.includes(s))throw new Error("missing "+s);console.log("WORKFLOW-SHAPE-OK")' | tee /tmp/s118-checks/t003.txt
  # dry run of the measuring block on a workflow-shaped local dir (S11.7 D-P1 lesson): every command the workflow calls exists and parses its flags
  E=/tmp/s118-checks/t003-wf; rm -rf $E; mkdir -p $E
  pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write $E/gated-manifest.json
  (node tools/perf/src/cli/serve.ts --port 4320 & echo $! > /tmp/s118-checks/srv.pid); sleep 2
  pnpm perf:lighthouse http://127.0.0.1:4320/ --out $E/gated-home-r1 || echo "exit $? (verdict recorded)"
  kill "$(cat /tmp/s118-checks/srv.pid)"
  node tools/perf/src/cli/eager-verdict.ts --rule s11.8 --dir $E > /tmp/s118-checks/t003-verdict.txt 2>&1 || echo "exit $? (incomplete dir expected)"
  head -5 /tmp/s118-checks/t003-verdict.txt | tee -a /tmp/s118-checks/t003.txt
  bash $F/guards.sh | tee -a /tmp/s118-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-workflow.txt` (the shape check + the local dry run).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the workflow runs only on this branch and is not a required check).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q7; the push + draft PR is approved by Q10).

### T004 [US2] AC1: reproduction + attribution on one slow-class attempt (orchestrator: CI; executor: tables + local baseline)

- **Seam:** the unmodified product on a slow-class runner ↔ AC1's bands, the E1/E2 task naming, and the AC2 caps.
- **Steps (orchestrator):**
  1. `git diff --quiet 0fcd243 -- apps packages` (the product is still the base).
  2. `git push -u origin task/s11.8-hero-eager`; `gh pr create --draft` (title `S11.8: hero-only eager`; body = summary + evidence pointers + the attribution lines).
  3. Wait for `perf: hero-eager` (3 shards).
  4. Qualification table from each shard's summaries; `gh run rerun <id>` until **one** shard qualifies (cap 10 attempts; past the cap → STOP + escalate with the index log).
  5. **Reproduction:** read `eager-verdict --rule s11.8 --reproduce` from the qualifying shard.
     - **NOT REPRODUCED** → **STOP + re-baseline** (Hard Rule 3): report the index + TBT values against the bands, and rerun only for a new attempt (a new VM), never to "get a better number". Each further attempt counts against the cap.
     - **REPRODUCED** → continue.
  6. Download the qualifying shard's full artifact, plus the summaries + meta of the non-qualifying ones.
- **Steps (executor, on the downloaded artifact):**
  1. Sanitise and copy into `evidence/`:
     - `T004-host-meta-att<id>.json`;
     - `T004-lighthouse-summary-ci-{gated,eager}-home-r{1,2}-att<id>.json`, `…-gated-project-r{1,2}-att<id>.json`;
     - `T004-trace-{gated,eager}-home-att<id>.json.gz` (profiled);
     - `T004-per-task-{gated,eager}-home-att<id>.{json,md}`;
     - `T004-fps-load-home-{trace-only,recorder}-cpu1-r{1,2}-att<id>.json`, `T004-fps-load-home-trace-only-cpu4-r{1,2}-att<id>.json`;
     - `T004-eager-probe-home-{normal,reduce}-r{1,2}-att<id>.json` + deadline shots;
     - `T004-log-bundle-{gated,eager}-ci.json`;
     - `T004-verdict-s11.8-att<id>.md`.
  2. **`T004-ac2-caps.json`:** `{ "renderer-constructor": 1.05 × median, "program-compile": 1.05 × median, "first-content-frame": 1.05 × median }` from the two `trace-only --cpu 1 --names` runs (Q4: at baseline, the compile and the first frame are expected to be one task; if they are separate, each keeps its own median).
  3. **Local baselines at the base product:**
     - `perf:parity --write` on the gated build → `T004-screenshot-gated-*` (8 shots, engaged) + manifest;
     - `perf:parity --no-engage --route home --write` on `build:eager` → `T004-screenshot-eager-home-*` (4 shots) + manifest;
     - **local-emulation drift re-check:** home eager simulated TBT at `M = 18.5` vs the attempt's; if the mean absolute Δ is > 25 %, one refinement of `M` (table + chosen `M`);
     - write `$F/lever-block.sh` (the "Local A/B protocol" above) and `$F/ab-table.mjs`; run the block once at the base → `$F/evidence/T004-ab/` (the "before" of T005).
  4. Write `evidence/T004-log-baseline.md`. **This file name is the `BASELINE-FIRST-OK` anchor.** It holds:
     1. the qualification table (every attempt, index min/median/max, runner name, counted or not) and the GL backend;
     2. **the reproduction check:** home eager / gated two-invocation means vs [188.33, 231.00] / [74.48, 94.60] → REPRODUCED;
     3. project gated TBT vs [78.85, 91.35] (informational drift indicator at AC1);
     4. **the per-task table:** every task > 50 ms simulated on `/` eager and gated, with observed ms, TBT share, URL → chunk → module, and top functions resolved to source by hand (S11.7 D-P2 method);
     5. **E1 naming:** the first-content-frame task's self-time split (placement / overlay model / program setup / GC / other) → **the E1b, E1c and E1d trigger readings** (RFC §4);
     6. **E2 naming:** whether a `ViewScroll` `sync` / `setScrollExtentPx` re-render task > 50 ms simulated sits inside FCP→TTI → **E2 go or skip**;
     7. **the AC2 baseline at host-native:** each named exception (median + raws), `unnamedMaxMs`, dropped frames (trace-only; the recorder in its own column, "excluded from AC2: harness rAF recorder"), the `--cpu 4` informational row, and the caps;
     8. AC5 baselines; bytes (the CI manifests `cmp` against T001's);
     9. the local drift table + `M`;
     10. **the confirmed lever plan:** E1a, then which of E1b/E1c/E1d/E2 are expected to trigger, with the reading behind each.
  5. In the same commit: `hero-eager.yml` gains `--caps $F/evidence/T004-ac2-caps.json` on the named-mode step (plan.md "Workflow").
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager
  git diff --quiet 0fcd243 -- apps packages && echo PRODUCT-IS-BASE | tee /tmp/s118-checks/t004.txt
  test -s $F/evidence/T004-log-baseline.md || { echo NO-BASELINE-LOG; exit 1; }
  grep -q 'REPRODUCED' $F/evidence/T004-log-baseline.md || { echo NOT-REPRODUCED; exit 1; }
  if grep -q 'NOT REPRODUCED' $F/evidence/T004-log-baseline.md; then echo NOT-REPRODUCED; exit 1; fi
  if grep -q 'ORCHESTRATOR: written at review' $F/evidence/T004-log-baseline.md; then echo SECTIONS-OPEN; exit 1; fi
  grep -Eq 'E2 (go|skip)' $F/evidence/T004-log-baseline.md || { echo E2-NOT-DECIDED; exit 1; }
  echo E2-DECIDED | tee -a /tmp/s118-checks/t004.txt
  node -e 'const c=require(process.argv[1]);for(const k of ["renderer-constructor","program-compile","first-content-frame"])if(!(c[k]>0))throw new Error("cap "+k);console.log("CAPS-OK",JSON.stringify(c))' $PWD/$F/evidence/T004-ac2-caps.json | tee -a /tmp/s118-checks/t004.txt
  test "$(ls $F/evidence/T004-trace-*.json.gz | wc -l)" -eq 2 && test "$(ls $F/evidence/T004-per-task-*.json | wc -l)" -eq 2 && echo ARTIFACTS-OK | tee -a /tmp/s118-checks/t004.txt
  bash $F/guards.sh | tee -a /tmp/s118-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **→ STOP (baseline).** The orchestrator presents the reproduction, the per-task table (E1 split), the E2 go/skip, the AC2 caps and the expected triggers.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T004-log-baseline.md` §2: the numbers really are inside the S11.7 bands.
  2. §5/§6: does the first-content-frame split match the RFC's static read (placement-dominated)? Is the E2 call right?
  3. §7: the AC2 caps you'll be held to.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" (or feedback) for the E1 group (default: the lever plan in §10 of the log).
  2. Current 5h usage (default: proceed if < 85 %).

---

## Phase E1 — hero-only flag + first-content-frame levers (STOP after T010)

### T005 [US1] A1: hero-only eager flag

- **Seam:** the build define ↔ which route boots without interaction.
- **Files:**
  - `apps/web/next.config.ts`, `apps/web/eager-3d.d.ts`, `apps/web/components/hero/hero-live.tsx`, `apps/web/test/eager-flag.test.ts`, `apps/web/test/eager-hero.test.tsx` (new) (plan.md "A1");
  - root `package.json` (`build:eager-hero`);
  - `.github/workflows/hero-eager.yml` (`EAGER_BUILD: build:eager-hero`).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; T=t005; mkdir -p /tmp/s118-checks
  pnpm --filter web exec vitest run test/eager-flag.test.ts test/eager-hero.test.tsx test/eager-guards.test.tsx --reporter verbose 2>&1 | tee /tmp/s118-checks/t005.txt
  git diff --quiet 0fcd243 -- apps/web/components/workbench && echo WORKBENCH-UNTOUCHED | tee -a /tmp/s118-checks/t005.txt
  pnpm build:eager-hero
  pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --expect gated --runs 2 --out /tmp/s118-checks/t005-project-gated
  pnpm eager:probe --serve apps/web/out --route / --runs 2 --out /tmp/s118-checks/t005-home
  source $F/lever-block.sh            # bytes both pairs, parity, probes, draws, hero group on gated
  bash $F/guards.sh | tee -a /tmp/s118-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-a1.md` holds the tests, `WORKBENCH-UNTOUCHED`, the probe JSON (project gated 2/2, home live 2/2), bytes (expected Δ ≈ 0 on both pairs), parity 0 px, and the A/B table, which is informational because A1 is not a lever.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm build:eager-hero && pnpm serve:out`, then open `/` without touching anything: the live view appears. Open the project page: the poster stays until you interact.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC §5 A1).

### T006 [US3] E1a: output-identical placement search (`overlay/place.ts`) + S6 re-seal

- **Seam:** `placeLabels`'s inputs ↔ its exact output; the first-content-frame task ↔ its placement cost.
- **Files:**
  - `packages/xploder/test/oracles/place-s11.7.ts` (new, verbatim, R7) + `test/overlay-place-equivalence.test.ts` (new). **Commit 1**, on the unchanged `place.ts`: the test passes;
  - `packages/xploder/src/overlay/place.ts`. **Commit 2 = the lever** (plan.md "E1a" steps 2–3; step 3 only on its trigger, as its own commit + A/B);
  - the re-seal files (plan.md "Re-seal procedure"). **Commit 3.**
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; T=t006; mkdir -p /tmp/s118-checks
  diff <(git show 0fcd243:packages/xploder/src/overlay/place.ts | sed "s#'\.\./#'../../src/#; s#'\./#'../../src/overlay/#") packages/xploder/test/oracles/place-s11.7.ts && echo ORACLE-VERBATIM | tee /tmp/s118-checks/t006.txt
  git diff --quiet 0fcd243 -- packages/xploder/test/overlay-place.test.ts && echo SEALED-PLACE-TEST-UNCHANGED | tee -a /tmp/s118-checks/t006.txt
  pnpm --filter xploder exec vitest run test/overlay-place-equivalence.test.ts test/overlay-place.test.ts test/overlay-model.test.ts test/overlay-columns.test.ts test/overlay-titleblock.test.ts test/frozen-surface.test.ts --reporter verbose 2>&1 | tee -a /tmp/s118-checks/t006.txt
  grep -E 'seed|cases|median' /tmp/s118-checks/t006.txt | tee -a /tmp/s118-checks/t006.txt
  pnpm build:eager-hero
  source $F/lever-block.sh            # A/B vs T005-ab, keep rule, parity 0 px, draws, CLS, sequence, bytes
  bash $F/guards.sh | tee -a /tmp/s118-checks/t006.txt          # XPLODER-SRC-OK lists place.ts; RESEAL-NOTE-OK
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T006-OK
  ```
- **Evidence:**
  - `evidence/T006-log-e1a-ab.md`:
    - the equivalence result (seed, case count, 0 mismatches);
    - the informational timing;
    - the A/B table: home eager simulated TBT, the first-content-frame observed ms + its self-time split before/after, named exceptions at `--cpu 1`, dropped frames;
    - parity, bytes, the keep-rule verdict;
    - **the E1b/E1c/E1d trigger readings on the after-profile**;
  - `evidence/T006-ab/`;
  - `evidence/T006-log-reseal.txt` (the generator diff, the regenerated manifest diff, the test literal diff, the `approved-xploder-src.txt` line).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `T006-log-e1a-ab.md`: 0 mismatches, and the before/after first-content-frame split.
  2. The re-seal note text in `frozen-surface.generate-s6.sh`.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: E1a is required and approved at G1). A parity diff or a keep-rule miss is a STOP with evidence.

### T007 [US3] E1b: label-list index maps (`overlay/model.ts`), conditional

- **Seam:** `overlayBaseModel`'s inputs ↔ its exact output; the overlay-model share of the first-content-frame task.
- **Trigger:** T006's after-profile shows `model.ts` frames ≥ 5 % of the first-content-frame task self time. **Not met → skip:** record the reading in `T007-log-skip.md` and leave `model.ts` untouched.
- **Files (if triggered):**
  - `packages/xploder/test/oracles/model-s11.7.ts` + `test/overlay-model-equivalence.test.ts` (commit 1);
  - `packages/xploder/src/overlay/model.ts` (commit 2: the lever, plan.md "E1b");
  - the S6 re-seal (commit 3: appended note).
- **Check (if triggered):** the same shape as T006, with `overlay-model-equivalence.test.ts` and the sealed `overlay-model.test.ts` unchanged, `source $F/lever-block.sh` vs `T006-ab`, and guards.
- **Evidence:** `evidence/T007-log-e1b-ab.md` + `T007-ab/` + `T007-log-reseal.txt`, **or** `T007-log-skip.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the trigger reading is quoted from the T006 profile).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the RFC §4 trigger decides).

### T008 [US3] E1c: program setup before the first draw (`react/scene/Stats.tsx`), conditional

- **Seam:** three's program compile ↔ the first-content-frame task; the first drawn frame ↔ `data-xploder-ready`.
- **Trigger:** the AC1 attribution shows three program setup ≥ 5 % of the first-content-frame task, **or** after T006/T007 that task is still > 12.5 ms observed on the slow-host scale (T004 drift ratio). **Not met → skip** with the reading.
- **Files (if triggered):**
  - `packages/xploder/src/react/scene/Stats.tsx` + `packages/xploder/test/stats-compile.test.tsx` (new) (the lever, plan.md "E1c");
  - the S2/S4 re-seal (`frozen-surface.generate.sh`, its manifest, `frozen-surface.test.ts` literals).
- **Check (if triggered):**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; T=t008; mkdir -p /tmp/s118-checks
  pnpm --filter xploder exec vitest run test/stats-compile.test.tsx test/scene.test.tsx test/frozen-surface.test.ts --reporter verbose 2>&1 | tee /tmp/s118-checks/t008.txt
  pnpm build:eager-hero
  source $F/lever-block.sh            # incl. the sequence probe: ready in the first instanced-draw rAF; draws = 2
  pnpm fps:engine --scenario load --route / --no-build --frames trace-only --cpu 1 --names --out /tmp/s118-checks/t008-names-r1 || echo "exit $? (verdict recorded)"
  node -e 'const fs=require("fs");const d="/tmp/s118-checks/t008-names-r1";const r=JSON.parse(fs.readFileSync(d+"/"+fs.readdirSync(d).find(f=>f.endsWith(".json"))));const n=r.names.filter(t=>t.name.includes("program-compile")||t.name.includes("first-content-frame"));console.log("SPLIT",JSON.stringify(n.map(t=>[t.name,t.durMs])))' | tee -a /tmp/s118-checks/t008.txt
  bash $F/guards.sh | tee -a /tmp/s118-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-e1c-ab.md` holds:
  - the A/B;
  - whether `KHR_parallel_shader_compile` was present (local and, later, runner via host meta);
  - the compile / first-frame task split;
  - the program-count check (or "unavailable", stated);
  - sequence, parity, bytes.

  Plus `T008-ab/` + `T008-log-reseal.txt`, **or** `T008-log-skip.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. If it ran: the reveal-sequence row (ready still flips in the first drawn frame) and parity 0 px.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the RFC §4 trigger decides; a recompile → revert as "no measurable win").

### T009 [US3] E1d: overlay model one task later on the first settle (`react/overlay/BlueprintOverlay.tsx`), conditional, last resort

- **Seam:** the overlay model ↔ the first-content-frame task; the overlay fade ↔ its model.
- **Trigger:** after T006–T008, the first-content-frame task still contributes > 50 ms simulated **and** the projected `/` eager TBT is > 185 ms (plan.md "E1d"). **Not met → skip** with the projection arithmetic.
- **Files (if triggered):** `packages/xploder/src/react/overlay/BlueprintOverlay.tsx` + a new `packages/xploder/test/overlay-first-settle.test.tsx` (the first settle is deferred one task, later settles are synchronous, the fade starts after the model) + the S6 re-seal.
- **Check (if triggered):** the same shape as T006, plus the existing `blueprint-scene.test.tsx` unchanged and passing, and the reveal-sequence probe.
- **Evidence:** `evidence/T009-log-e1d-ab.md` + `T009-ab/` + `T009-log-reseal.txt`, **or** `T009-log-skip.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. If it ran: optional, on `pnpm build:eager-hero && pnpm serve:out`, check that the labels' fade-in on `/` looks as before.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the trigger decides).

### T010 [US5] Final local state for E1

- **Seam:** the accepted E1 state ↔ every non-goal and the byte budget.
- **Steps (executor):**
  1. `source $F/lever-block.sh` on the merged state vs `T004-ab`.
  2. `evidence/T010-log-before-after.md`: per lever kept, skipped or reverted (with its evidence file); home eager TBT, the first-content-frame task and named exceptions, dropped frames, AC5 times, bytes (both pairs, raw + gzip, Δ vs `0fcd243`).
  3. Restate T004's E2 go/skip.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; T=t010
  source $F/lever-block.sh
  for b in gated eager; do test -s /tmp/s118-checks/t010/bytes-$b.txt && grep -q PASS /tmp/s118-checks/t010/bytes-$b.txt; done && echo BYTES-PASS | tee /tmp/s118-checks/t010.txt
  test -s $F/evidence/T010-log-before-after.md
  bash $F/guards.sh | tee -a /tmp/s118-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T010-OK
  ```
- **→ STOP (E1).** Folded into this STOP if T004 said "E2 skip".
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `T010-log-before-after.md`: the local movement on the first-content-frame task (local emulation, not binding).
  2. `git diff 0fcd243 --stat -- packages/xploder`: only approved files + their re-seal files + new tests.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" (or feedback) for E2 (if triggered) or for the verdict (default: proceed).
  2. Current 5h usage (default: proceed if < 85 %).

---

## Phase E2 — conditional (STOP after T011 only if it ran)

### T011 [US3] E2: no nested re-render at mount (`ViewScroll.tsx` + `TeardownViewer.tsx`), conditional, expected skip

- **Seam:** the R3F scene-mount commit ↔ the scroll-extent re-render; the first frame's view offset.
- **Trigger:** T004 §6 = "E2 go". **Otherwise skip:** `T011-log-skip.md` quotes T004's table excerpt, and both files stay untouched.
- **Files (if triggered):**
  - `packages/xploder/src/react/scene/ViewScroll.tsx`, `packages/xploder/src/react/TeardownViewer.tsx` (plan.md "E2") + a new `packages/xploder/test/view-scroll-mount.test.tsx` (mount writes the spacer + `scrollTop` with no synchronous re-render; later changes unchanged);
  - the S5 + S8 re-seals.
- **Check (if triggered):** the same shape as T006, plus the sealed `view-scroll.test.tsx` and `viewer-handle.test.tsx` unchanged and passing, `engine:probe` (scroll group), the sequence probe (equal `data-xploder-scroll-extent` and view offset at ready), and parity 0 px.
- **Evidence:** `evidence/T011-log-e2-ab.md` + `T011-ab/` + `T011-log-reseal.txt`, **or** `T011-log-skip.md`.
- **→ STOP (E2)** if it ran.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. If it ran: optional, on `/`, scroll the drawing with the keyboard (Up/Down, Page Up/Down): it behaves as before.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for the verdict (default: proceed).

---

## Phase Verdict (STOP after T012)

### T012 [US1, US3, US4] Two slow-class attempts on the final state; AC2, AC3, AC5; AC6 branch (orchestrator: CI; executor: tables)

- **Seam:** the final product on two independent slow-class runners ↔ AC2/AC3/AC5 and the one-cycle verdict.
- **Steps (orchestrator):**
  1. Push the final state (the PR head). Record the product tree SHA (`git rev-parse HEAD:apps HEAD:packages`).
  2. Wait for `hero-eager` (3 shards); rerun until **two** qualifying attempts with distinct runner names exist (cap 10; past the cap → STOP + escalate).
  3. The first two qualifying attempts in time order decide. Download their full artifacts, plus the summaries + meta of the others.
- **Steps (executor):**
  1. `eager-verdict --rule s11.8 --dir …` over all attempts → `evidence/T012-log-ac3.md`.
  2. `evidence/T012-log-ac2.md`: per deciding attempt, named mode `trace-only --cpu 1 --names`, r1 / r2 / median:
     - each named exception vs its cap (individually);
     - `unnamedMaxMs` vs 50;
     - dropped frames vs 2;
     - the recorder in a separate column headed "excluded from AC2: harness rAF recorder";
     - `--cpu 4` informational.
  3. `evidence/T012-log-ac5.md`: per deciding attempt, both runs:
     - `/` normal (deadline times, trusted-event count, fade, non-blank);
     - `/` reduce (canvas absent);
     - project `--expect gated` (canvas absent, 0 events);
     - the project gated TBT vs [78.85, 91.35].
  4. `evidence/T012-log-verdict.md`, the AC6 branch:
     - **fail** → "verdict: D-19 permanent for both routes". The hero-eager flag stays default-off (`FLAG-DEFAULT-OK`), the per-attempt numbers + remaining attribution are published, the slice closes, and there is no further round;
     - **pass ×2** → "verdict: retire `/` on Murphy's word", with the numbers.
  5. The before/after vs T004: the same protocol on different attempts, with the same-attempt eager − gated as the tie-breaker.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager
  for f in T012-log-ac2.md T012-log-ac3.md T012-log-ac5.md T012-log-verdict.md; do test -s $F/evidence/$f; done
  grep -Eq 'AC3 (PASS|FAIL)' $F/evidence/T012-log-ac3.md && grep -Eq 'verdict: (D-19 permanent for both routes|retire `/` on Murphy)' $F/evidence/T012-log-verdict.md && echo VERDICT-RECORDED
  test "$(ls $F/evidence/T012-host-meta-att*.json | wc -l)" -ge 2 && echo ATTEMPTS-OK
  bash $F/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T012-OK
  ```
- **→ STOP (verdict).**
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T012-log-verdict.md` and the PR's checks tab.
  2. `T012-log-ac2.md`: each named exception against its own cap.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for CI/surfaces (default: proceed).
  2. **If AC3 passed twice:** "retire" or "keep" (default: keep until you say "retire", Q8).

---

## Phase CI and surfaces (STOP after T013)

### T013 [US5] Guards, CI green, re-seal diff, AC1–AC7 self-check

- **Seam:** the PR head ↔ every required check and the frozen surfaces.
- **Steps (orchestrator):**
  1. `gh pr checks <pr>` until settled.
  2. Required: `seo: meta + og`, both axe jobs, the perf gates, typecheck/lint/format, build, gitleaks.
  3. A red check → diagnose, fix in a task (never rerun until green; one rerun only for infra exits 3/4).
- **Steps (executor):**
  1. `evidence/T013-log-guard.txt`: `guards.sh` output.
  2. `evidence/T013-log-reseal-diff.txt`: `git diff 0fcd243 --stat -- packages/xploder` + `git diff 0fcd243 -- packages/xploder/src` (only approved files), the note sentences, `approved-xploder-src.txt`.
  3. `evidence/T013-log-frozen-diffs.txt`: each surface diff (empty except the approved files), the workflows (`ci`, `perf`, `eager-3d`, `eager-load` empty; `hero-eager.yml` added).
  4. `evidence/T013-log-parity.txt` + `T013-log-drawcalls.txt`: home post-eager + both-route rest parity 0 px, draws = 2, CLS 0 (Lighthouse + load scenario).
  5. `evidence/T013-ci-run.txt`: the run URL + `gh pr checks` output.
  6. `evidence/AC-selfcheck.md`: the end-contract table:
     - the reproduced baseline;
     - per-task before/after;
     - named-exception caps;
     - the no-bulk-task log;
     - named-mode dropped frames;
     - the two verdict attempts;
     - bytes;
     - the zero-interaction 2.5 s probe;
     - project gated TBT ±5 %;
     - parity + draws + CLS;
     - the CI run;
     - the re-seal diff;
     - each AC met / not met, with its evidence file;
     - the finishing tier per task.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager
  bash $F/guards.sh | tee $F/evidence/T013-log-guard.txt
  test -z "$(git diff --name-only 0fcd243 -- packages/xploder/src | grep -vxFf <(grep -v '^#' $F/approved-xploder-src.txt | sed 's/ *#.*//'))" && echo SRC-SUBSET-OK
  test -s $F/evidence/AC-selfcheck.md && test -s $F/evidence/T013-ci-run.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T013-OK
  ```
- **→ STOP (end-contract).** Murphy validates and signals "S11.8 done" outside the agent's view. Merge only on "merge".
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/AC-selfcheck.md`.
  2. The PR diff for `packages/xploder`: only approved files, each with an S11.8 re-seal note.
  3. Optional: on the Vercel preview, `/` (gated by default unless retired) and the project page look unchanged.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" when satisfied (default: the PR stays a draft until then).

### T013b [US4] A2: retire the gate for `/` only (only on Murphy's "retire" after AC3 ×2)

- **Seam:** the default build ↔ D-19 amended (home eager, project gated).
- **Files:**
  - `apps/web/next.config.ts`: `__XP_EAGER_HERO__ = process.env.NEXT_PUBLIC_GATED_HERO !== '1'`;
  - `apps/web/test/eager-flag.test.ts`, `eager-hero.test.tsx`: the default is now eager for the hero, `NEXT_PUBLIC_GATED_HERO=1` restores the gate, and the workbench is still gated;
  - `$F/guards.sh`: `FLAG-DEFAULT-OK` → checks the new default and that `__XP_EAGER_3D__` is still opt-in, with an RFC §11 note;
  - root `package.json`: `build:eager-hero` kept as an alias of the default.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/hero-eager; T=t013b
  pnpm build && pnpm eager:probe --serve apps/web/out --route / --runs 2 --out /tmp/s118-checks/t013b-home
  pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --expect gated --runs 2 --out /tmp/s118-checks/t013b-project
  (node tools/perf/src/cli/serve.ts --port 4320 & echo $! > /tmp/s118-checks/srv.pid); sleep 2
  pnpm perf:lighthouse http://127.0.0.1:4320/ || echo "exit $? (verdict recorded)"   # default build perf gate re-run
  kill "$(cat /tmp/s118-checks/srv.pid)"
  pnpm site:probe --serve apps/web/out --group draws 2>&1 | tail -3
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T013b-OK
  ```
  The CI perf gates re-run on the PR head.
- **Evidence:** `evidence/T013b-log-retire.md` (the probes, the perf gates, the D-19 amendment text for Murphy's vault).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The Vercel preview: `/` shows the live teardown with no interaction, and the project page still waits for interaction.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "retire" (this task exists only on that word), then "merge".
