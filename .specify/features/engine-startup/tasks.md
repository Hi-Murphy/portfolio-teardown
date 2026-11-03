# Tasks: S11.5 Engine Startup Performance

**Input:** `rfc.md` (approved, §9 Gate 1: all defaults + R1–R8, C1), `spec.md`, `plan.md` in `.specify/features/engine-startup/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`).
- The **sandbox is off** for every task. Each check needs loopback (Turbopack build, `serveDir`, Chromium), which the Codex sandbox blocks.
- Writes are limited to the task worktree and `/tmp/s115-checks`.
- Before each dispatch wave, probe with `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: pause, report, and offer top-up / orchestrator on "go" / split.

**Escalation (kickoff Hard Rule 8):**
- Tier 1.5 is **DORMANT**, so it is skipped and recorded per task.
- If tier 1 is stuck ×2 on a task, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes personally on Murphy's "go".
- Each ledger row states the finishing tier.

**Usage pacing:**
- Murphy states "5h: N%" at gates (Gate 1: 62%).
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s11.5-engine-startup` on branch `task/s11.5-engine-startup-tNNN`. The orchestrator reviews it and merges it back with `--no-ff`. The worktree is removed only after its merge (global rule).

**Measurement tasks (T006, T007, T009–T014, T016):**
- They run **after** the merge, on the merged slice branch, in one worktree at a time, so the CPU is quiet: no parallel builds or browsers.
- The host stays plugged in. `benchmarkIndex` is recorded per run.

**Evidence doctrine (kickoff Hard Rule 7):**
- Every number attaches its artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`).
- Every measurement is 2 runs, median + both raw values. A spread above 20 % → flagged, the pair repeated, all runs kept.
- Perf claims use the dropped-frames / long-task style only. Budgets are never changed.

**Format & rules (every task):**
- Every check starts with `set -euo pipefail; mkdir -p /tmp/s115-checks .specify/features/engine-startup/evidence`.
- Every check ends with `bash .specify/features/engine-startup/guards.sh` (from T001 on) and `pnpm typecheck && pnpm lint && pnpm test`. Tasks that touch `apps/web` or measure also run `pnpm build`.
- No motion or colour literals. No product strings outside `apps/web/content/*`.
- Never touch `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, dev/fixture routes, the S8 perf tools, `ci.yml`/`perf.yml`, or any frozen xploder path except the files in `approved-xploder-src.txt`.
- **No product change before T006 is committed** (Hard Rule 3). T001–T005 touch only `tools/perf`, the feature dir and root scripts.
- Commit message prefix: `S11.5/TNNN:`, ending with the attribution lines. Run `gitleaks dir` on new prose and evidence before committing.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (14 guards + PARTITION-OK; 4 negative controls fail XPLODER-SRC + S2/S4/S6/S8) | 1 (Flash, sandbox off) | evidence/T001-log-guard.txt | af5b004 |
| T002 | ☑ (pure phase model; 9 synthetic fixtures; attributed ≤ cost invariant) | 1 (Flash) ×2: orchestrator review revision (top-level tasks, GL window, exclusive accounting) | evidence/T002-log-startup-model.txt | 23b569c |
| T003 | ☑ (3 paths run; P5 on connected canvas, hasWebgl probe = probeContexts; P3 from timed Turbopack factories) | 1 (Flash) ×2: orchestrator review revision (P4 < 0 / P2 = 0 defects); orchestrator merge-conflict resolution + merged re-check | evidence/T003-log-startup-cli.txt | 1a67538 |
| T004 | ☑ (startup scenario; explode unchanged; fps-engine.test.ts unmodified) | 1 (Flash) ×2: orchestrator review revision (toplevel category missing → vacuous long tasks; guard added) | evidence/T004-log-fps-startup.txt | 9ba7878 |
| T005 | ☑ (8 shots; same build twice → 0 px on all 8) | 1 (Flash, sandbox off); guards re-run by orchestrator after T001 merge | evidence/T005-log-parity-tool.txt | 17b72e9 |
| T006 | ☑ (AC1 baseline: cost 317 / 376 / 392 ms home-move / project-move / project-click; max long task 103 / 134 / 141 ms; 2–7 dropped frames; P3 module eval dominant; P7 2–3 ms; KHR_parallel present; ANGLE Metal M4) | 1 (Flash, measurements + tables) + orchestrator (task breakdown + interpretation) | evidence/T006-* | a08f0a5 |
| T007 | ⊘ skipped (G1 decision: L2 has no measurable payoff on this host, P7 = 2.3–3.0 ms < run spread; T006 evidence) | — | evidence/T006-log-baseline-profile.md | — |
| T008 | ⊘ skipped (no S6 file touched → no re-seal) | — | — | — |
| T009 | ☑ kept (3D chunk −201,716 B raw / −48,631 B gz; project/move P3 −22.4 ms; max long task −21…−28 ms; parity 0 px; draws 2) | 1 (Flash); literal check blocked by 2 plan defects (D-P1, D-P2), remainder run and passed | evidence/T009-log-l4-ab.md | c9aea35 |
| T010 | ☑ kept (max long task 113→57 ms project / 80→61 ms hero; cost −34…−49 ms; blocking −75…−90 %; initial JS −25 / −4,406 B vs T006; parity 0 px; AC2 still fails: one 56–62 ms mount task) | 1 (Flash) ×3: 2 orchestrator-review revisions (initial-JS regression), final 45 B fix by orchestrator; long-task attribution by orchestrator | evidence/T010-log-l3-ab.md, T010-log-longtask-profile.txt | cc1c89f |
| T011 | ⊘ skipped (G2 decision; orchestrator judgement): the remaining AC2 blocker is the Canvas-mount task, which L1 cannot move; L1 would only shift 24–33 ms eval tasks pre-engagement and make non-engaging visitors download ~1 MB — asked at the G2 STOP | — | evidence/T010-log-longtask-profile.txt | — |
| T012 | ⊘ skipped (G1 decision) | — | — | — |
| T013 | ☑ (cost −13.4 % project move / −13.4 % click / −1.5 % home protocol pair, −10.3 % home extra pair; AC3 < 40 % → shortfall clause with ceiling; AC5 dominant = L3, LOO −29…−31 ms cost / −55 ms max long task on project paths) | 1 (Flash, measurements + tables); orchestrator home noise pair | evidence/T013-log-before-after.md | 806fe37 |
| T014 | ☑ AC2 FAIL all paths (one 56–71 ms Canvas-mount task, 1–7 dropped frames) → escalated; AC4 PASS (parity 0 px ×8, draws 2, CLS 0, bytes ≤ T006 raw + gzip) | 1 (Flash); orchestrator gzip-method correction | evidence/T014-log-ac2.md, T014-log-bundle-diff.txt | de7a417 |
| T015 | ☑ (flag off: initial chunks byte-identical to T014, 0 B; eager: no-touch 3D ready ≈ 190 ms on both routes; default stays gated) | 1 (Flash) ×2: orchestrator-review revision (inline process.env left a runtime lookup → compiler.define bare constant) | evidence/T015-log-flag.txt | e42dc30 |
| T016 | ☑ LOCAL: eager perf 1.00 / TBT 2–3 ms / CLS 0 on both routes (3D load captured: +238 / +279 KB) → local verdict "recommend retiring D-19" | 1 (Flash); orchestrator capture check | evidence/T016-log-eager-local.md | 9ac9bbc |
| T017 | ☑ AC6 verdict **keep the gate** (CI runner: eager home perf 0.955 / TBT 248.5 ms; eager project perf 0.89 / TBT 441.5 ms; gated 0.995–1.00 / TBT 88–97 ms); local passes (T016) | 1 (Flash: workflow + verdict CLI); orchestrator: push, draft PR #17, CI artifact + verdict | evidence/T017-log-eager-verdict.md, T017-ci-run.txt | d753931 (+ evidence commit) |
| T018 | ☑ (14 guards OK; S2/S4–S8 diffs empty, xploder diff empty, no re-seal needed; 12/12 checks green on e92c55c; AC-selfcheck.md) | 1 (Flash, evidence logs) + orchestrator (self-check, 2nd eager-3d run confirmation) | evidence/T018-*, AC-selfcheck.md | (this merge) |

## G2 amendments (orchestrator, after G1 "all defaults. go")

- **D-P1 (plan defect, T009):** `bundle:manifest --diff` is S11's "no new JS file" rule. It flags content-hash renames (exit 6) even when bytes shrink. AC4's bundle rule is **bytes ≤ baseline per scope** (initial JS per route, total JS; raw + gzip). From T010 on, checks compare byte totals of two manifests with `node -e` over `--write` outputs, and `--diff` output is kept as information only.
- **D-P2 (plan defect, T009):** `pnpm a11y:axe:site` needs `--serve apps/web/out`.
- **T010 scope (G1-approved "L3 + staged module evaluation"):**
  - New `apps/web/build/stage-3d.ts` exports `STAGES_3D = [() => import('three'), () => import('@react-three/fiber')]`. It holds bare dynamic imports only and **no three/R3F API use**. It lives outside the scanner roots, like the L4 shim (R4).
  - A new test asserts the file holds only those `import()` calls and that it is imported only by `components/interaction-gate.ts`.
  - `interaction-gate.ts`: `loadStaged(stages, signal)` runs `await stage(); await yieldToMain();` per stage and honours abort.
  - `hero-live.tsx`: `loadStaged(STAGES_3D)` → `import('./hero-stage')` → `yieldToMain()` → `startTransition(setHeroStage)`.
  - `workbench-loader.tsx`: `start()` keeps the click feedback (aria-busy + label) **synchronous**, then `loadStaged` → `import('./workbench-client')` (the same specifier as the `next/dynamic` loader, so it is warm) → `yieldToMain()` → `startTransition(() => setMounted(true))`.
  - **A/B "before"** = T009's after-runs (same host). Add one attributed project/move run and the T006 task-breakdown dump for the after state. The "app post-first-frame work" bucket is reported, not changed, in T010.

---

## Phase G1 — Baseline (STOP after T006)

### T001 [US5] Guards, S2/S4 subset lists, approved-file list

- **Seam:** branch ↔ frozen surfaces.
- **Files:**
  - `.specify/features/engine-startup/guards.sh` (plan.md "Guards", `S4BASE=92a8d24`, `S6BASE=f65b13c`);
  - `s2.paths`, `s4.paths` (plan.md lists);
  - `approved-xploder-src.txt` (a header comment only, so the approved list is empty).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks .specify/features/engine-startup/evidence
  F=.specify/features/engine-startup
  # subset lists partition the combined S2/S4 manifest paths exactly
  diff <(cat $F/s2.paths $F/s4.paths | sed '/^$/d' | sort) <(sed '/^$/d' packages/xploder/test/frozen-surface.paths | sort) && echo PARTITION-OK | tee /tmp/s115-checks/t001.txt
  bash $F/guards.sh | tee -a /tmp/s115-checks/t001.txt
  for f in packages/xploder/src/index.ts packages/xploder/src/engine/camera.ts packages/xploder/src/react/scene/Scene.tsx packages/xploder/src/react/TeardownViewer.tsx; do
    printf ' ' >> $f
    if bash $F/guards.sh > /tmp/s115-checks/t001-neg.txt 2>&1; then echo "NEG-CONTROL-FAILED $f"; exit 1; fi
    git checkout -- $f; echo "neg $f: $(grep FAIL /tmp/s115-checks/t001-neg.txt | tr '\n' ' ')" | tee -a /tmp/s115-checks/t001.txt
  done
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt`. All guards OK, `PARTITION-OK`, and the 4 negative controls, which must show `FAIL XPLODER-SRC` plus `SURFACE-S2`, `S4`, `S6` and `S8` respectively.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the negative controls show each guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: S01-created `package.json`/`src/index.ts`/`motion/index.ts` count as S2, the stricter side).

### T002 [US2] `startup.ts`: trace → StartupReport (pure)

- **Seam:** Chromium trace events + GL spans ↔ the D1 phase model.
- **Files:**
  - `tools/perf/src/startup.ts` (plan.md "Harness/startup.ts");
  - `tools/perf/test/startup.test.ts`;
  - `tools/perf/test/fixtures/startup-*.json`: synthetic traces covering a baseline-like startup, a pre-engagement warm task (must count in cost), a long task at 51 ms vs 50 ms (boundary), a missing GL span set (clean run → phases P5–P9 `null`, cost still computed), and an unrelated task outside the window (excluded).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm --filter perf-tools exec vitest run test/startup.test.ts --reporter verbose 2>&1 | tee /tmp/s115-checks/t002.txt
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-startup-model.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the fixtures encode the D1 definitions you approved).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D1 as approved).

### T003 [US2] `perf:startup` CLI + GL attribution init script

- **Seam:** the browser (mobile profile, 4× CPU, engagement) ↔ `startup.ts`.
- **Files:**
  - `tools/perf/src/startup-attribution.ts`, `tools/perf/src/cli/startup-profile.ts`;
  - root script `"perf:startup": "node tools/perf/src/cli/startup-profile.ts"`;
  - init-script tests in `startup.test.ts` (jsdom + fake GL prototypes: spans, per-rAF draw counts, the extension list).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm perf:startup --help >/dev/null && echo HELP-OK | tee /tmp/s115-checks/t003.txt
  pnpm build
  for kind in "" "--attribute"; do
    pnpm perf:startup --serve apps/web/out --route /projects/websocket-inspector --engage move --runs 1 $kind --out /tmp/s115-checks/t003$kind 2>&1 | tee -a /tmp/s115-checks/t003.txt
  done
  node -e 'const r=require("/tmp/s115-checks/t003--attribute/summary.json");for(const p of ["P3","P4","P7","P9"]) if(r.median.phases[p]==null) throw new Error("missing "+p);console.log("PHASES-OK")' | tee -a /tmp/s115-checks/t003.txt
  # observer overhead: ready+layout-shift observers on vs off, 1 run each (recorded, not gated)
  pnpm perf:startup --serve apps/web/out --route /projects/websocket-inspector --runs 1 --no-observers --out /tmp/s115-checks/t003-noobs | tee -a /tmp/s115-checks/t003.txt
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Note:** these smoke runs run on unmodified product code. They are **not** the AC1 baseline (T006), and their numbers are not reported as results.
- **Evidence:** `evidence/T003-log-startup-cli.txt`. It holds the help output, the smoke exit codes, the phase presence, and the observer overhead Δ.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: `--no-observers` exists only to measure the observers' overhead).

### T004 [US1] `fps-engine --scenario startup`

- **Seam:** the existing fps-engine harness ↔ the production export + engagement (AC2's named harness).
- **Files:**
  - `tools/perf/src/cli/fps-engine.ts` (additive scenario, plan.md);
  - `tools/perf/test/fps-engine-startup.test.ts`.
  - The existing `fps-engine.test.ts` is **unmodified**.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  git diff --quiet HEAD -- tools/perf/test/fps-engine.test.ts && echo FPS-ENGINE-TEST-UNCHANGED | tee /tmp/s115-checks/t004.txt
  pnpm --filter perf-tools exec vitest run test/fps-engine.test.ts test/fps-engine-startup.test.ts --reporter verbose 2>&1 | tee -a /tmp/s115-checks/t004.txt
  pnpm build
  pnpm fps:engine --scenario startup --route / --engage move --no-build --out /tmp/s115-checks/t004-hero 2>&1 | tee -a /tmp/s115-checks/t004.txt || true
  pnpm fps:engine --scenario explode --out /tmp/s115-checks/t004-explode 2>&1 | tail -5 | tee -a /tmp/s115-checks/t004.txt   # regression: still works
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Note:** the startup smoke run may fail AC2 (exit 6). That is expected on the baseline, and the check records it without failing.
- **Evidence:** `evidence/T004-log-fps-startup.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the explode scenario still runs).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: liveness is n/a for `startup`, as stated in the report).

### T005 [US3] Parity tool: `png.ts` + `perf:parity`

- **Seam:** the rest-state DOM/canvas ↔ the pixel-identity comparison.
- **Files:**
  - `tools/perf/src/png.ts`, `tools/perf/src/cli/parity.ts`;
  - root script `"perf:parity": "node tools/perf/src/cli/parity.ts"`;
  - `tools/perf/test/png.test.ts` (filters 0–4, RGB/RGBA, a known-pixel round trip with `zlib` encode);
  - `tools/perf/test/parity.test.ts` (compare identical → 0, a one-pixel change → 1, a size mismatch → error).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm --filter perf-tools exec vitest run test/png.test.ts test/parity.test.ts --reporter verbose 2>&1 | tee /tmp/s115-checks/t005.txt
  pnpm build
  pnpm perf:parity --serve apps/web/out --write /tmp/s115-checks/t005-a | tee -a /tmp/s115-checks/t005.txt
  pnpm perf:parity --serve apps/web/out --compare /tmp/s115-checks/t005-a --out /tmp/s115-checks/t005-b | tee -a /tmp/s115-checks/t005.txt   # determinism: same build → 0 px
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Decision gate:** if the same build doesn't give 0 differing pixels across two captures (nondeterministic rest state), STOP and escalate with the diff masks. AC4 cannot be proven with a nondeterministic capture.
- **Evidence:** `evidence/T005-log-parity-tool.txt` (unit output, 8 shots × 2 captures → 0 px each).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; you see the shots at G1 in T006).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: viewport shots, rest state per plan.md).

### T006 [US2] **AC1 baseline profile** + AC2/AC4/AC6 references (before any lever)

- **Seam:** the unmodified product ↔ every reference number the slice compares against.
- **Runs:** on the merged slice branch (T001–T005 only; `git diff 92a8d24 -- apps/web packages/xploder` must be empty), one quiet host.
  1. `perf:startup` clean ×2 and attributed ×2 for each of: `/` move, project move, project click (`--keep-trace` on run 1 of each).
  2. `fps:engine --scenario startup` ×2 per path.
  3. `perf:parity --write` → `evidence/T006-screenshot-*.png` (8) + `T006-log-parity-baseline.json`.
  4. `bundle:manifest --write evidence/T006-log-bundle-before.json`.
  5. `engine:probe` (draw-call groups).
  6. `perf:lighthouse` ×2 per route on the default (gated) build: the TBT reference for L1/AC6.
- **Files:** `evidence/T006-log-baseline-profile.md`, the AC1 report:
  - the phase table P0–P9 (median of 2, both raws), main-thread cost, long tasks, blocking, dropped frames;
  - textures count + ms, `KHR_parallel_shader_compile` present yes/no, the renderer string, `benchmarkIndex`;
  - the D4 hypothesis vs measured table, and the **recommended lever order** with the AC3 ceiling estimate (the share of cost in frozen S7/S8 mount + context creation).
  - Also: `T006-startup-*.json`, `T006-trace-*.json.gz`, `T006-fps-startup-*.json`, `T006-lighthouse-summary-*.json`, `T006-meta.json`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  git diff --quiet 92a8d24 -- apps/web packages/xploder && echo PRODUCT-UNCHANGED | tee /tmp/s115-checks/t006.txt
  E=.specify/features/engine-startup/evidence
  ls $E/T006-trace-*.json.gz $E/T006-startup-*.json $E/T006-screenshot-*.png $E/T006-log-bundle-before.json | tee -a /tmp/s115-checks/t006.txt
  test "$(ls $E/T006-screenshot-*.png | wc -l)" -eq 8
  grep -E '^\| P(2|3|4|6|7|8) ' $E/T006-log-baseline-profile.md | tee -a /tmp/s115-checks/t006.txt   # AC1 phases present
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Trace sanitizing:** before committing, the harness's sanitizer strips `file://` and absolute paths. `grep -c "/Users/" trace` must be 0. Q6 applies: traces above 5 MB gzipped are trimmed to the window + the D3 categories.
- **Evidence:** as listed. **This commit must precede every lever commit** (AC1).
- **WHAT MURPHY SHOULD TEST/VALIDATE (G1 STOP):**
  1. Read `T006-log-baseline-profile.md`: is the phase split plausible, and does it match your ≈ 0.4–0.6 s S10 note?
  2. Look at the 8 baseline screenshots: is this the rest state you expect?
  3. Confirm the lever order the profile recommends (it may differ from RFC D5).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for G2 with the recommended lever order (default: the order in the report).
  2. If `KHR_parallel_shader_compile` is absent in headless Chromium: choose (a) drop L2, (b) measure the no-extension `compileAsync` variant (it moves the link issue earlier; the stall may shrink), or (c) add one informational headed GPU run. Default: (b).
  3. If the AC3 ceiling estimate is below 40 %: acknowledge that AC3 will close via its documented-shortfall clause (default: proceed and document).
  4. Current 5h usage.

---

## Phase G2 — Levers (STOP after T014)

**A/B protocol (every lever task):** `perf:startup` clean ×2 for the 3 paths, on the state just before the lever (the previous merge SHA, rebuilt) and just after. The task log publishes Δ cost, Δ max long task, Δ blocking, the run spread and the **keep/revert decision** (plan.md "Levers"). Parity (`--compare evidence/T006-…`) and draw calls are run on every kept lever. A non-zero parity diff is a **STOP** (Hard Rule 5).

### T007 [US1] L2: precompiled blueprint material (`Scene.tsx`, S6)

- **Seam:** R3F scene mount ↔ the GL program link.
- **Files:**
  - `packages/xploder/src/react/scene/Scene.tsx` (plan.md "L2");
  - `packages/xploder/test/scene-precompile.test.tsx`;
  - `approved-xploder-src.txt` += `packages/xploder/src/react/scene/Scene.tsx`;
  - `guards.sh` temporarily excludes `Scene.tsx` from `SURFACE-S6` until T008 (one `:(exclude)` pathspec, removed in T008).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm --filter xploder exec vitest run test/scene-precompile.test.tsx test/blueprint-scene.test.tsx test/scene.test.tsx --reporter verbose 2>&1 | tee /tmp/s115-checks/t007.txt
  pnpm build
  # A/B vs the pre-lever merge (plan "A/B protocol"); attributed run asserts program counts unchanged
  pnpm perf:startup --serve apps/web/out --route /projects/websocket-inspector --attribute --runs 1 --out /tmp/s115-checks/t007-attr
  node -e 'const r=require("/tmp/s115-checks/t007-attr/summary.json"), b=require("./.specify/features/engine-startup/evidence/T006-startup-project-move-attributed-r1.json"); for (const k of ["createProgram","linkProgram"]) if (r.median.glCounts[k]!==b.glCounts[k]) throw new Error(k); console.log("PROGRAMS-UNCHANGED")' | tee -a /tmp/s115-checks/t007.txt
  pnpm perf:parity --serve apps/web/out --compare .specify/features/engine-startup/evidence --out /tmp/s115-checks/t007-parity | tee -a /tmp/s115-checks/t007.txt
  pnpm engine:probe 2>&1 | grep -E 'draw-calls' | tee -a /tmp/s115-checks/t007.txt
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t007.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-l2-ab.md` (A/B table + keep/revert), `T007-startup-*.json`, `T007-log-parity.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm dev` in Orca's browser on the project route, then move the pointer. The teardown appears exactly as before (no empty canvas flash).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the keep rule decides; a revert is recorded and the S6 seal then stays at `f65b13c`).

### T008 [US5] S6 re-seal for L2 (only if T007 kept)

- **Seam:** the S6 manifest ↔ the changed `Scene.tsx`.
- **Files:**
  - `packages/xploder/test/frozen-surface.generate-s6.sh` (base + note), `frozen-surface.s6.manifest.json` (regenerated), `frozen-surface.test.ts` (S6 base/note expectations);
  - `guards.sh` (`S6BASE=<T007 merge SHA>`, exclusion removed).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee /tmp/s115-checks/t008.txt
  git diff -U0 -- packages/xploder/test/frozen-surface.s6.manifest.json | tee -a /tmp/s115-checks/t008.txt
  test "$(git diff -U0 -- packages/xploder/test/frozen-surface.s6.manifest.json | grep -cE '^\+ ')" -eq 3   # base, note, Scene.tsx hash
  git diff -U0 -- packages/xploder/test/frozen-surface.s6.manifest.json | grep -E '^\+ ' | grep -q 'src/react/scene/Scene.tsx'
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts 2>&1 | tee -a /tmp/s115-checks/t008.txt
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-reseal.txt` (generator output + manifest diff + test).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the manifest diff shows exactly base, note and one hash).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: note wording per plan.md "Re-seal").

### T009 [US1] L4: import trimming (app-level `three` alias)

- **Seam:** the bundler's resolution of `three` ↔ the 3D chunk contents.
- **Step 1 (decision gate):** a throwaway alias spike. If `turbopack.resolveAlias` cannot exact-match bare `three` (the shim's `three/src/*` imports must resolve normally), **drop L4**: record it in the log and the ledger, and tick the task as "dropped (gate)".
- **Files:**
  - `apps/web/build/three-surface.ts`, `apps/web/next.config.ts` (alias);
  - `apps/web/test/three-surface.test.ts` (plan.md "L4": coverage, referenced-only-by-config, single `REVISION`).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm build
  pnpm --filter web exec vitest run test/three-surface.test.ts test/package-consumer.test.ts test/prod-imports.test.ts --reporter verbose 2>&1 | tee /tmp/s115-checks/t009.txt
  pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s115-checks/t009-bundle.json
  pnpm bundle:manifest --diff .specify/features/engine-startup/evidence/T006-log-bundle-before.json /tmp/s115-checks/t009-bundle.json | tee -a /tmp/s115-checks/t009.txt
  # A/B (plan protocol) + parity + draw calls + both axe jobs locally
  pnpm perf:parity --serve apps/web/out --compare .specify/features/engine-startup/evidence --out /tmp/s115-checks/t009-parity | tee -a /tmp/s115-checks/t009.txt
  pnpm a11y:axe:site 2>&1 | tail -3 | tee -a /tmp/s115-checks/t009.txt
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t009.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-l4-ab.md` (gate result, bytes before/after raw + gzip, A/B, keep/revert), `T009-log-bundle-diff.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm dev`, then the project route (tour, panels, zoom). Everything behaves as before.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the keep rule; R4 placement outside scanner roots as approved).

### T010 [US1] L3: split init (`startTransition` + `yieldToMain`)

- **Seam:** chunk resolution ↔ React mount scheduling (hero + workbench, incl. the click path).
- **Files:**
  - `apps/web/components/interaction-gate.ts` (`yieldToMain`), `hero/hero-live.tsx`, `workbench/workbench-loader.tsx`;
  - `apps/web/test/interaction-gate.test.ts` (`yieldToMain` with and without `scheduler.yield`).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm --filter web exec vitest run test/interaction-gate.test.ts test/no-motion-literals.test.ts test/site-motion-matrix.test.ts --reporter verbose 2>&1 | tee /tmp/s115-checks/t010.txt
  pnpm build
  # A/B (plan protocol) with emphasis on max long task; fps-startup x1 per path for an AC2 reading
  for p in "/ move" "/projects/websocket-inspector move" "/projects/websocket-inspector click"; do set -- $p
    pnpm fps:engine --scenario startup --route $1 --engage $2 --no-build --out /tmp/s115-checks/t010-fps-$2$(echo $1 | tr / _) || true; done
  pnpm perf:parity --serve apps/web/out --compare .specify/features/engine-startup/evidence --out /tmp/s115-checks/t010-parity | tee -a /tmp/s115-checks/t010.txt
  pnpm site:probe --serve apps/web/out 2>&1 | tail -5 | tee -a /tmp/s115-checks/t010.txt   # S10 behaviour (gate, reveal, click label) unchanged
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T010-OK
  ```
- **Evidence:** `evidence/T010-log-l3-ab.md`, `T010-fps-startup-*.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: on the project route, click "Explore 3D". The label switches to "Loading 3D…" immediately, as before.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the keep rule).

### T011 [US1] L1: idle warm (CONDITIONAL: only if AC2 still fails after T010)

- **Seam:** post-load idle time ↔ the 3D module evaluation.
- **Skip rule:** if T010's fps-startup shows `pass` on all 3 paths, tick "skipped (AC2 met)" with T010's evidence.
- **Files:** `apps/web/components/interaction-gate.ts` (`warmModules(signal, loaders[])`), `hero/hero-live.tsx`, `workbench/workbench-loader.tsx`, plus tests in `interaction-gate.test.ts`.
- **Check:** the A/B protocol. Each warm slice must be ≤ 50 ms in the attributed trace. `perf:lighthouse` ×2 per route on the gated build: perf ≥ 95, and TBT not above the T006 reference + spread. Also fps-startup ×1 per path, parity, guards, and `pnpm typecheck && pnpm lint && pnpm test`.
- **Evidence:** `evidence/T011-log-l1-ab.md`, `T011-lighthouse-summary-*.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: reject L1 if any slice > 50 ms or TBT regresses).

### T012 [US1] L5: overlay model cache (CONDITIONAL: only if T006 shows the overlay model ≥ 10 % of P4)

- **Seam:** the S6 overlay model ↔ mount-time renders.
- **Skip rule:** below the threshold → tick "skipped (T006: X %)".
- **Files:** `packages/xploder/src/overlay/model.ts` **or** `src/react/overlay/BlueprintOverlay.tsx` (one file), plus a new test. `approved-xploder-src.txt` += that file, then an S6 re-seal exactly as in T008 (the manifest diff = base, note and that hash).
- **Check:** the A/B protocol + parity + the S6 tests + the re-seal checks of T008 + guards + `pnpm typecheck && pnpm lint && pnpm test`.
- **Evidence:** `evidence/T012-log-l5-ab.md`, `T012-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm dev`, then the overlay callouts and the tour trail. They look as before.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the keep rule).

### T013 [US2] Before/after table + leave-one-out (AC3, AC5)

- **Seam:** the AC1 baseline ↔ the final lever state.
- **Runs:** `perf:startup` clean ×2 + attributed ×2 per path on the final state. Then the **leave-one-out**: in a throwaway worktree, `git revert --no-commit` the dominant lever's commit(s), build, and run clean ×2 per path. The worktree is removed without merging, since its branch carries nothing to keep.
- **Files:**
  - `evidence/T013-log-before-after.md`:
    - cost, max long task, blocking, dropped frames and per-phase, baseline vs final (median + raws), and the % change;
    - **AC3 verdict** (≥ 40 %, or the documented ceiling + reason in numbers);
    - **per-lever contribution** (incremental Δ from T007/T009/T010/T011/T012 + the leave-one-out Δ), and the **AC5 dominant lever**.
  - `T013-startup-*.json`, `T013-trace-*.json.gz` (final, Q6).
- **Check:** files present, the table's medians are recomputed from the JSONs by a `node -e` assertion, then guards + `pnpm typecheck && pnpm lint && pnpm test`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the before/after table and the AC5 attribution.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the verdicts as computed).

### T014 [US1, US3] Final AC2 + AC4 verification

- **Seam:** the final state ↔ AC2 and AC4 as stated.
- **Runs:**
  - `fps:engine --scenario startup` ×2 per path (3 paths);
  - `perf:parity --compare evidence/` (8 shots) → `T014-screenshot-*.png`;
  - `engine:probe` draw calls + the GL counter (2 per content frame, both routes);
  - CLS (harness + `perf:lighthouse` ×2 per route, gated build);
  - `bundle:manifest --write evidence/T014-log-bundle-final.json`, then `--diff T006 → final` (initial per route + total, raw + gzip).
- **Files:** `evidence/T014-log-ac2.md` (per path: dropped frames, max long task, pass), `T014-log-parity.txt`, `T014-log-drawcalls.txt`, `T014-log-bundle-final.json`, `T014-log-bundle-diff.txt`, `T014-lighthouse-summary-*.json`.
- **Check:** every pass flag holds, or the task STOPs and escalates per Hard Rule 2 with the evidence. Then guards + `pnpm typecheck && pnpm lint && pnpm test`.
- **WHAT MURPHY SHOULD TEST/VALIDATE (G2 STOP):**
  1. Compare 2–3 of the T014 screenshots with T006 (they are identical by the RGBA check).
  2. Optional: `pnpm build && pnpm serve:out` in Orca's browser, both routes, light/dark.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for G3.
  2. If AC2 fails on any path: choose escalate-as-blocked (default) or authorise the conditional L1 if it was skipped.
  3. Current 5h usage.

---

## Phase G3 — Eager-hydration experiment (STOP after T017)

### T015 [US4] `NEXT_PUBLIC_EAGER_3D` flag (`waitForStartup`)

- **Seam:** the build env ↔ the hero/workbench start trigger.
- **Files:**
  - `apps/web/components/interaction-gate.ts` (`waitForLoad`, `waitForStartup`), `hero/hero-live.tsx`, `workbench/workbench-loader.tsx`;
  - `apps/web/test/interaction-gate.test.ts` (eager: no interaction needed; default: interaction needed; reduced motion/saveData still skip; the click path is unchanged);
  - root script `build:eager`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  pnpm --filter web exec vitest run test/interaction-gate.test.ts test/no-motion-literals.test.ts --reporter verbose 2>&1 | tee /tmp/s115-checks/t015.txt
  pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s115-checks/t015-flag-off.json
  pnpm bundle:manifest --diff .specify/features/engine-startup/evidence/T014-log-bundle-final.json /tmp/s115-checks/t015-flag-off.json | tee -a /tmp/s115-checks/t015.txt   # initial JS ≤ pre-flag
  pnpm build:eager && test -d apps/web/out && echo EAGER-BUILD-OK | tee -a /tmp/s115-checks/t015.txt
  pnpm site:probe --serve apps/web/out 2>&1 | tail -5 | tee -a /tmp/s115-checks/t015.txt || true   # informational under eager
  pnpm build && pnpm site:probe --serve apps/web/out 2>&1 | tail -5 | tee -a /tmp/s115-checks/t015.txt   # default build: S10 behaviour intact
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t015.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T015-OK
  ```
- **Note:** "flag-off vs pre-flag" compares against T014's committed final manifest (`evidence/T014-log-bundle-final.json`). No stash or checkout of older states is needed.
- **Evidence:** `evidence/T015-log-flag.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm build:eager && pnpm serve:out`, open `/` and don't touch anything. The hero 3D appears on its own.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the flag name `NEXT_PUBLIC_EAGER_3D`, off, never set on Vercel).

### T016 [US4] Local eager Lighthouse (both routes)

- **Seam:** the eager build ↔ the mobile Lighthouse gate.
- **Runs:** `pnpm build:eager && pnpm serve:out --port 4320`, then `perf:lighthouse` ×2 per route (each a median of 3), plus the same on the default build as the reference.
- **Files:** `evidence/T016-lighthouse-summary-eager-{home,project}-r{1,2}.json`, `T016-lighthouse-summary-gated-*.json`, `T016-log-eager-local.md` (perf, TBT, LCP, CLS, `benchmarkIndex` per run, medians).
- **Check:** the files exist and the medians are recomputed by a `node -e` assertion. Then guards + `pnpm typecheck && pnpm lint && pnpm test`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the table).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T017 [US4] CI-runner measurement (`eager-3d.yml`) + AC6 verdict

- **Seam:** the CI runner (the slower host where S10 failed) ↔ the eager build.
- **Files:** `.github/workflows/eager-3d.yml` (plan.md "Eager flag"), `evidence/T017-log-eager-verdict.md` (runner + local tables, verdict per spec US4 #2), `T017-ci-run.txt` (run URL + log excerpt).
- **Needs:** the branch **pushed** and a **draft PR** opened against `main` (the orchestrator does this; outward-facing, approved under G3 below).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  gh run list --workflow eager-3d.yml --branch task/s11.5-engine-startup --limit 1 --json databaseId,conclusion,url | tee /tmp/s115-checks/t017.txt
  gh run download <id> -n eager-3d -D /tmp/s115-checks/t017-artifact && ls /tmp/s115-checks/t017-artifact | tee -a /tmp/s115-checks/t017.txt
  grep -E '^\*\*Verdict:\*\* (recommend retiring D-19|keep the gate)' .specify/features/engine-startup/evidence/T017-log-eager-verdict.md
  bash .specify/features/engine-startup/guards.sh | tee -a /tmp/s115-checks/t017.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T017-OK
  ```
- **Evidence:** as listed, plus the runner summaries copied as `T017-lighthouse-summary-eager-ci-*.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE (G3 STOP):**
  1. Read the AC6 verdict and its numbers.
  2. Decide later, outside this slice, whether to retire D-19.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK to push the branch and open a **draft PR** at T017 (default: yes, which AC7's CI needs anyway).
  2. Keep `eager-3d.yml` after the slice? (default: keep it as measurement-only until your D-19 decision, then remove it).
  3. Current 5h usage.

---

## Phase G4 — Re-seal / CI (STOP after T018)

### T018 [US5] Final guards, re-seal proof, CI green, AC self-check

- **Seam:** the whole branch ↔ AC7 and the end-contract.
- **Files:**
  - `evidence/T018-log-guard.txt`;
  - `T018-log-reseal.txt` (every manifest diff `92a8d24..HEAD`; S2/S5/S7/S8 empty; S6 = base/note/approved hashes only; S4 empty or S4-only hashes);
  - `T018-ci-run.txt` (PR checks list: every required check incl. `seo: meta + og`, `perf: fps calibration`, both axe jobs; run URLs);
  - `AC-selfcheck.md` (AC1–AC7 table with artifacts; the finishing tier per task; anything needing Murphy's hands).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s115-checks
  bash .specify/features/engine-startup/guards.sh | tee .specify/features/engine-startup/evidence/T018-log-guard.txt
  git diff --name-only 92a8d24 -- packages/xploder/src packages/xploder/package.json | tee -a /tmp/s115-checks/t018.txt
  gh pr checks --required 2>&1 | tee .specify/features/engine-startup/evidence/T018-ci-run.txt
  ! grep -E '\bfail|pending' .specify/features/engine-startup/evidence/T018-ci-run.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T018-OK
  ```
- **WHAT MURPHY SHOULD TEST/VALIDATE (end-contract):**
  1. `AC-selfcheck.md`: each AC row against its artifacts.
  2. The PR's CI page: all green.
  3. Your final validation, then "merge" (merge only on your word).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Final validation and the merge go (default: none; the PR stays open until you say "merge").
  2. Nothing else.
