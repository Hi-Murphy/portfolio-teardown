# Tasks: S11.7 Eager Load Path

**Input:** `rfc.md` (approved at Gate 1: all §7 defaults; refinements R1–R10 in §9), `spec.md`, `plan.md` in `.specify/features/eager-load/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`).
- The **sandbox is off** for every task that builds, serves or launches Chromium (loopback is blocked in the Codex sandbox).
- Writes are limited to the task worktree and `/tmp/s117-checks`.
- Before each dispatch wave, probe with `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: pause, report, and offer top-up / orchestrator on "go" / split.
- **CI-side steps** (push, PR, reruns, artifact download) are done by the orchestrator, never by the executor.

**Escalation (kickoff Hard Rule 9):**
- Tier 1.5 is **DORMANT**, so it is skipped and recorded per task.
- If tier 1 is stuck ×2 on a task, the orchestrator executes it personally and reports the current 5h usage at the next STOP.
- Each ledger row states the finishing tier.

**Usage pacing:**
- Murphy states "5h: N%" at gates (Gate 1: 58%).
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s11.7-eager-load` on branch `task/s11.7-eager-load-tNNN`. The orchestrator reviews it and merges it back with `--no-ff`. The worktree is removed only after its merge (global rule).

**Measurement tasks (local A/B in T007–T013):**
- They run on the merged slice branch, one at a time, so the CPU is quiet. The host stays plugged in.
- **Local numbers are labelled "local emulation" and never decide an AC.** Binding numbers come only from qualified CI attempts (RFC D1).

**Evidence doctrine (kickoff Hard Rule 8):**
- Every number attaches its artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`).
- Every measurement is 2 runs (Lighthouse: 2 invocations × median of 3), median reported, raws published. A spread above 20 % → flagged, repeated, all runs kept.
- No secrets: `gitleaks dir` on new prose and evidence before each commit.

**Format & rules (every task):**
- Every check starts with `set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks $F/evidence`.
- Every check ends with `bash $F/guards.sh` (from T001 on) and `pnpm typecheck && pnpm lint && pnpm test`. Tasks that touch product code or measure also run `pnpm build`.
- No motion or colour literals; no numeric timeouts in app code. No product strings outside `apps/web/content/*`.
- **Never touch:**
  - `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`;
  - **anything under `packages/xploder`** (no exception at freeze; `XPLODER-EMPTY-OK`);
  - dev/fixture routes, `apps/web/test/xploder-dom/**`;
  - `ci.yml`, `perf.yml`, `eager-3d.yml`, `tools/perf/src/budgets.ts`;
  - any `apps/web` path not in `$F/app-touch.txt`.
- **No app change before T006 is committed** (Hard Rule 3, `BASELINE-FIRST-OK`). T001–T005 touch only `tools/perf`, `package.json` scripts, the new workflow and the feature dir.
- **Visual change = STOP (Hard Rule 7):** every lever task runs the 8-shot parity compare. Any differing pixel stops the task and is reported with the diff mask.
- Measuring commands that may legitimately exit non-zero on a verdict (`perf:lighthouse`, `fps:engine`, `eager:probe`, `perf:parity` drift) run as `cmd || echo "exit $? (verdict recorded)"`, and the verdict is read from the JSON (S11.6 D-P2). In lever tasks a parity diff stays a STOP.
- Commit message prefix: `S11.7/TNNN:`, ending with the attribution lines.

**Routes:** `home` = `/`, `project` = `/projects/websocket-inspector`.

**Local A/B protocol (lever tasks):** on the eager build, the "before" is the previous accepted state's after-runs (for T007: the T006 local runs).
- `perf:lighthouse --gl swiftshader --cpu-multiplier $M` (M from T006's drift table) ×2 per route, plus `--profile` ×1 per route → `perf:attribution`;
- `fps:engine --scenario load --no-build` ×2 per route (trace-only, 4×);
- `eager:probe --runs 2` per route (native, informational locally).

**Keep rule:** Δ (eager simulated TBT, the targeted task's observed ms, max long task, or dropped frames) > the larger run spread of the two states. Otherwise revert and record "no measurable win".

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (11 guards; 5 negative controls bite incl. committed BASELINE-FIRST control; pre-slice bytes: gated total 1,581,847 raw / 459,233 gz = S11.6 final) | 1 (Flash) | evidence/T001-log-guard.txt, T001-log-bytes.txt | 72bc211 |
| T002 | ☑ (`--profile` keeps trace + V8 samples; `--gl swiftshader`, `--cpu-multiplier`; attribution with served-chunk snippets + 3-frame stacks; URL-less matching) — local emulation smoke: project eager 634 ms observed task = `hasWebgl()` first context under SwiftShader (informational, not binding) | 1 (Flash) ×2: orchestrator review revision (D-P2) | evidence/T002-log-attribution-tool.txt | 72afd4e |
| T003 | ☑ (`fps:engine --scenario load --frames trace-only\|recorder`, recorder marked non-gated; `perf:startup --engage none`; existing fps tests unmodified) | 1 (Flash) | evidence/T003-log-load-harness.txt | ff9bc72 |
| T004 | ☑ (`eager:probe`; `eager-verdict --rule s11.7`, default output golden = S11.6 byte-for-byte; `perf:parity --no-engage`) — local: project reduce 0/2 (RFC F4 confirmed pre-baseline) | 1 (Flash) | evidence/T004-log-probe-verdict-tools.txt | aa59034 |
| T005 | ☑ (`perf:host`: local 4,354 ANGLE Metal / SwiftShader variant; `eager-load.yml` 3 shards) + orchestrator fix D-P1 | 1 (Flash) + orchestrator (D-P1) | evidence/T005-log-host-workflow.txt | 9f7280c |
| T006 | ☑ AC1 baseline on `41734234159-1-s3` (24 LH runs, index 2,114–2,351; s1/s2 fast, not counted). GL = SwiftShader/Vulkan (F2 clear). Eager−gated TBT +137 home / +288 project. ≈200 ms react-dom tasks named: P13 first content frame + lettering placement (project), H10 R3F commit → camera-fit layout effect (home), both engine-owned. App-reachable: xploder + three module evaluation. AC2 baseline 93–117 ms max task, 11–13 dropped (blocked, §8.3). AC5 revealed ≤ 627 ms; F4 confirmed. Local emulation: native GL, M = 18.5 | 1 (Flash: copy, local baselines, drift, scripts) + orchestrator (CI, §4, §8) | evidence/T006-log-baseline.md | adfe955 |
| T007 | ☐ | | | |
| T008 | ☐ | | | |
| T009 | ☐ | | | |
| T010 | ☐ | | | |
| T011 | ⊘ skipped (G1: real-time separation already exists; Lantern collapses gaps — T006 §8.1.6) | — | evidence/T006-log-baseline.md §5, §8 | — |
| T012 | ⊘ skipped (G1: no app-component hydration task > 12.5 ms observed — T006 §4.1) | — | evidence/T006-log-baseline.md §4.1 | — |
| T013 | ☐ | | | |
| T014 | ☐ | | | |
| T015 | ☐ | | | |
| T015b | ☐ (only on Murphy's "retire") | | | |

## Stage-3 amendments (orchestrator)

- **D-P1 (review finding, T005):** the workflow called `pnpm eager-verdict`, which is not a root script. It now calls `node tools/perf/src/cli/eager-verdict.ts` as `eager-3d.yml` does, and passes `--out-dir apps/web/out` to `perf:attribution` (D-P2). Verified locally on a workflow-shaped directory: the default and `--rule s11.7` outputs parse correctly, and S11.6's run-2 summaries yield AC3 FAIL.
- **D-P3 (G1 decision):** T010 (L3a) runs **before** T008 (L1). L3a also stages the xploder graph through `apps/web/build/xploder-stage-{a,b}.ts`. L3b is pre-skipped: there is no TBT effect, and AC5 has ≈ 1.9 s of headroom. The A/B "before" of each lever is the previous accepted lever's after-run directory (`/tmp/s117-checks/<tid>/`, copied to `evidence/<TID>-ab/` without traces).
- **D-P4 (review finding, T007):** the eager-probe poster locator assumed a live layer, which the project route does not have before the workbench boots. The locator now falls back to the stage/hero poster (tool fix). The executor's DOM marker on the loader was reverted. The T007 check reads `r.atDeadline.canvasCount` (the probe schema), not `r.canvas.present`.
- **D-P2 (review finding, T002):** minified frames (`(anonymous)`) cannot meet AC1's "named by function". `perf:attribution --out-dir` now records, for each hot frame, its callFrame line:column, a 120-character snippet from the served chunk, and its parent/grandparent frames. URL-less Lighthouse long tasks are matched to URL-less `RunTask`s (±25 %, chronological), with a `loose` ±50 % fallback. The AC1 log resolves each snippet to its source function by hand (Turbopack production chunks carry no module paths or source maps).

---

## Phase G1 — Baselines (STOP after T006)

### T001 [US5] Guards, app allowlist, byte-budget helper, pre-slice byte baseline

- **Seam:** the branch ↔ the frozen surfaces and the app allowlist; the build output ↔ the AC4 budget.
- **Files:**
  - `$F/guards.sh` (plan.md "Guards", every guard spelled out);
  - `$F/app-touch.txt` (plan.md "Source code", the `apps/web` paths only, one per line; `build/three-stage-a.ts` … `-c.ts` listed explicitly);
  - `$F/bundle-scopes.mjs` (copied from `staged-canvas-mount/`, plus `--budget`, plan.md "Bytes").
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks $F/evidence
  bash $F/guards.sh | tee /tmp/s117-checks/t001.txt
  # negative controls: each must make guards.sh exit 1 with the named FAIL line
  for f in packages/xploder/src/index.ts apps/web/components/site-nav.tsx .github/workflows/eager-3d.yml tools/perf/src/budgets.ts; do
    printf ' ' >> $f
    if bash $F/guards.sh > /tmp/s117-checks/t001-neg.txt 2>&1; then echo "NEG-CONTROL-FAILED $f"; exit 1; fi
    git checkout -- $f; echo "neg $f: $(grep FAIL /tmp/s117-checks/t001-neg.txt | tr '\n' ' ')" | tee -a /tmp/s117-checks/t001.txt
  done
  # pre-slice byte baseline, both builds (product = 7833b28)
  git diff --quiet 7833b28 -- apps packages && echo PRODUCT-IS-BASE | tee -a /tmp/s117-checks/t001.txt
  pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write $F/evidence/T001-log-bundle-gated.json && rm -rf /tmp/s117-checks/base-gated && cp -R apps/web/out /tmp/s117-checks/base-gated
  pnpm build:eager && pnpm bundle:manifest --out-dir apps/web/out --write $F/evidence/T001-log-bundle-eager.json && rm -rf /tmp/s117-checks/base-eager && cp -R apps/web/out /tmp/s117-checks/base-eager
  for b in gated eager; do
    node $F/bundle-scopes.mjs $F/evidence/T001-log-bundle-$b.json /tmp/s117-checks/base-$b | tee -a /tmp/s117-checks/t001.txt
    node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-$b.json /tmp/s117-checks/base-$b $F/evidence/T001-log-bundle-$b.json /tmp/s117-checks/base-$b && echo "BUDGET-SELF-OK $b" | tee -a /tmp/s117-checks/t001.txt
  done
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:**
  - `evidence/T001-log-guard.txt`: all guards OK, plus the 4 uncommitted negative controls. Expected FAIL lines, in order:
    1. `XPLODER-EMPTY`;
    2. `APP-TOUCH` (`site-nav.tsx` is not in the allowlist);
    3. `CI-JOBS`;
    4. `BUDGETS`.

    A 5th control proves `BASELINE-FIRST`. On a throwaway branch `t001-neg`, commit a one-byte change to an allowlisted app file with no T006 anchor; `guards.sh` must print `FAIL BASELINE-FIRST`. Then delete the branch. If an app commit exists and the anchor does not, the guard fails.
  - `T001-log-bundle-{gated,eager}.json`;
  - `T001-log-bytes.txt` (local pre-slice table, both builds).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; each guard is shown to bite).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D10 + plan "Guards").

### T002 [US2] Profiled Lighthouse, emulation flags, per-task attribution

- **Seam:** the Lighthouse run ↔ the trace it scored; LHR long tasks ↔ observed tasks ↔ functions and modules.
- **Files:**
  - `tools/perf/src/lighthouse.ts`, `src/browser.ts`, `src/cli/lighthouse-gate.ts`: `--profile`, `--cpu-multiplier`, `--gl swiftshader` (plan.md "Profiled Lighthouse");
  - `tools/perf/src/lh-attribution.ts` + `src/cli/attribution.ts` (new);
  - `package.json`: script `perf:attribution`;
  - `tools/perf/test/lighthouse.test.ts` (additive), `test/attribution.test.ts` (new, synthetic trace + LHR fixtures in `test/fixtures/`).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks
  pnpm --filter perf-tools exec vitest run test/lighthouse.test.ts test/attribution.test.ts --reporter verbose 2>&1 | tee /tmp/s117-checks/t002.txt
  pnpm build:eager && (pnpm serve:out --port 4321 & echo $! > /tmp/s117-checks/srv.pid); sleep 2
  pnpm perf:lighthouse http://127.0.0.1:4321/projects/websocket-inspector --profile --gl swiftshader --out /tmp/s117-checks/t002-lh || echo "exit $? (verdict recorded)"
  ls /tmp/s117-checks/t002-lh/*.trace.json.gz >/dev/null && echo TRACE-KEPT | tee -a /tmp/s117-checks/t002.txt
  pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s117-checks/t002-manifest.json
  pnpm perf:attribution --lhr /tmp/s117-checks/t002-lh/lighthouse-run-0.json --trace /tmp/s117-checks/t002-lh/lighthouse-run-0.trace.json.gz \
    --manifest /tmp/s117-checks/t002-manifest.json --out /tmp/s117-checks/t002-attr | tee -a /tmp/s117-checks/t002.txt
  node -e 'const t=require("/tmp/s117-checks/t002-attr/per-task.json");if(!Array.isArray(t.tasks)||!("lantern" in t))throw new Error("shape");console.log("ATTR-SHAPE-OK",t.tasks.length,t.source)' | tee -a /tmp/s117-checks/t002.txt
  kill "$(cat /tmp/s117-checks/srv.pid)"
  bash $F/guards.sh | tee -a /tmp/s117-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-attribution-tool.txt`. It holds:
  - the tests;
  - one local run, labelled "local emulation, tool check only";
  - whether the profiler category produced `ProfileChunk` events (`source: lighthouse-profile` or the fallback note).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D2.1–D2.2, D5; R2 fallback).

### T003 [US3] Load scenario with named frame modes; `perf:startup --engage none`

- **Seam:** an eager page load with no engagement ↔ the AC2 harness; the trace ↔ the cross-check attribution.
- **Files:**
  - `tools/perf/src/cli/fps-engine.ts` + `src/fps.ts`: `--scenario load`, `--frames trace-only|recorder`, `--cpu` (plan.md "Load scenario");
  - `tools/perf/src/cli/startup-profile.ts` (+ `startup.ts` if needed): `--engage none`;
  - `tools/perf/test/fps-engine-load.test.ts` (new), `test/startup.test.ts` (additive).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks
  git diff --quiet HEAD -- tools/perf/test/fps-engine.test.ts tools/perf/test/fps-engine-startup.test.ts && echo EXISTING-FPS-TESTS-UNMODIFIED | tee /tmp/s117-checks/t003.txt
  pnpm --filter perf-tools exec vitest run test/fps-engine-load.test.ts test/fps-engine.test.ts test/fps-engine-startup.test.ts test/startup.test.ts --reporter verbose 2>&1 | tee -a /tmp/s117-checks/t003.txt
  pnpm build:eager
  for m in trace-only recorder; do pnpm fps:engine --scenario load --route / --frames $m --no-build --out /tmp/s117-checks/t003-$m || echo "exit $? (verdict recorded)"; done
  node -e 'const fs=require("fs");for(const m of ["trace-only","recorder"]){const d="/tmp/s117-checks/t003-"+m;const r=JSON.parse(fs.readFileSync(d+"/"+fs.readdirSync(d).find(f=>f.endsWith(".json"))));if(!r.mounted)throw new Error("not mounted");if((m==="recorder")===r.verdict.gated)throw new Error("gating flag");console.log("LOAD-OK",m,r.maxLongTaskMs,r.droppedFrames)}' | tee -a /tmp/s117-checks/t003.txt
  pnpm perf:startup --serve apps/web/out --route / --engage none --cpu-profile --runs 1 --out /tmp/s117-checks/t003-startup | tail -3 | tee -a /tmp/s117-checks/t003.txt
  bash $F/guards.sh | tee -a /tmp/s117-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-load-harness.txt`. It holds the tests, the unmodified-tests line and one local run per mode (tool check only).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; the recorder report carries the exclusion sentence).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D2.3, Q7 = 4×).

### T004 [US1, US4] `eager:probe` and `eager-verdict --rule s11.7`

- **Seam:** a zero-interaction load ↔ the AC5 deadline checks; attempt summaries ↔ the AC3 rule.
- **Files:**
  - `tools/perf/src/eager-probe.ts` + `src/cli/eager-probe.ts` (new; plan.md "`eager:probe`");
  - `tools/perf/src/cli/eager-verdict.ts`: `--rule s11.7` (plan.md; the default output is golden-tested);
  - `tools/perf/src/cli/parity.ts`: additive `--no-engage`, for post-eager shots. It waits for `data-xploder-ready` + `exploded` settled + 2 rAF without any input; the default (engaged) path is byte-identical (R10);
  - `package.json`: script `eager:probe`;
  - `tools/perf/test/eager-probe.test.ts` (new), `test/eager-verdict.test.ts` (additive; golden fixture from S11.6 T011 run-2 summaries copied into `test/fixtures/eager-verdict-s116/`).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks
  pnpm --filter perf-tools exec vitest run test/eager-probe.test.ts test/eager-verdict.test.ts test/parity.test.ts --reporter verbose 2>&1 | tee /tmp/s117-checks/t004.txt
  ! grep -n 'mouse' <(git diff HEAD -- tools/perf/src/cli/parity.ts | grep '^+') && echo PARITY-NO-ENGAGE-ADDS-NO-INPUT | tee -a /tmp/s117-checks/t004.txt
  ! grep -nE '\b(mouse|keyboard|touchscreen)\.|\.(hover|focus|click|tap)\(|dispatchEvent|scrollIntoView' tools/perf/src/eager-probe.ts tools/perf/src/cli/eager-probe.ts && echo PROBE-NO-INPUT-APIS | tee -a /tmp/s117-checks/t004.txt
  pnpm build:eager
  for r in / /projects/websocket-inspector; do
    pnpm eager:probe --serve apps/web/out --route $r --runs 2 --out /tmp/s117-checks/t004-normal || echo "exit $? (verdict recorded)"
    pnpm eager:probe --serve apps/web/out --route $r --runs 2 --reduced-motion --out /tmp/s117-checks/t004-reduce || echo "exit $? (verdict recorded)"
  done
  ls /tmp/s117-checks/t004-normal /tmp/s117-checks/t004-reduce | tee -a /tmp/s117-checks/t004.txt
  bash $F/guards.sh | tee -a /tmp/s117-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-probe-verdict-tools.txt`, holding:
  - the tests and the no-input-API grep;
  - the local probe results (tool check only). **Expected:** the project route under reduced motion **fails** today. That is RFC F4, recorded as a pre-baseline observation and not fixed here;
  - the golden default-output line.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: run `pnpm build:eager && pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --reduced-motion --runs 1` and see the F4 failure yourself.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D6, D7; Q8, Q9).

### T005 [US2] `perf:host` and the `eager-load.yml` workflow

- **Seam:** the runner VM ↔ host qualification and the GL backend; the PR ↔ one full measurement set per shard.
- **Files:**
  - `tools/perf/src/cli/host-meta.ts` + `test/host-meta.test.ts` (new);
  - `package.json`: script `perf:host`;
  - `.github/workflows/eager-load.yml` (new; plan.md "Workflow").
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks
  pnpm --filter perf-tools exec vitest run test/host-meta.test.ts --reporter verbose 2>&1 | tee /tmp/s117-checks/t005.txt
  pnpm perf:host --out /tmp/s117-checks/t005-host.json && pnpm perf:host --gl swiftshader --out /tmp/s117-checks/t005-host-ss.json
  node -e 'for(const f of ["t005-host","t005-host-ss"]){const h=require("/tmp/s117-checks/"+f+".json");console.log(f,h.benchmarkIndex.median,h.webgl.backend,h.webgl.renderer)}' | tee -a /tmp/s117-checks/t005.txt
  node -e 'const y=require("fs").readFileSync(".github/workflows/eager-load.yml","utf8");for(const s of ["head_ref == '"'"'task/s11.7-eager-load'"'"'","shard: [1, 2, 3]","perf:host","--profile","--scenario load","eager:probe","--reduced-motion","--rule s11.7","upload-artifact"])if(!y.includes(s))throw new Error("missing "+s);console.log("WORKFLOW-SHAPE-OK")' | tee -a /tmp/s117-checks/t005.txt
  bash $F/guards.sh | tee -a /tmp/s117-checks/t005.txt          # CI-JOBS-OK: eager-load.yml is the only new workflow
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-host-workflow.txt`, holding the local host meta (M4, ANGLE Metal, plus the SwiftShader variant) and the workflow shape check.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `.github/workflows/eager-load.yml`: measurement-only, slice branch only, not required.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q2, Q3).

### T006 [US2] AC1 baseline on one slow-class attempt (orchestrator: CI; executor: tables)

- **Seam:** the unmodified product on a slow-class runner ↔ AC1's per-task attribution.
- **Steps (orchestrator):**
  1. `git diff --quiet 7833b28 -- apps/web/components apps/web/build apps/web/app packages` (the product is still the base).
  2. `git push -u origin task/s11.7-eager-load`; `gh pr create --draft` (title `S11.7: eager load path`; body = summary + evidence pointers + the attribution lines).
  3. Wait for `perf: eager-load` (3 shards) and `perf: eager-3d`.
  4. Download every shard's `host-meta.json` → the qualification table. `gh run rerun <id>` until **one** shard qualifies (cap 10 attempts, Q4; past the cap → STOP + escalate with the index log).
  5. Download the qualifying shard's full artifact, plus the summaries + meta of the non-qualifying ones (Q15).
- **Steps (executor, on the downloaded artifact):**
  1. Sanitise and copy into `evidence/`:
     - `T006-host-meta-att<id>.json`;
     - `T006-lighthouse-summary-ci-{gated,eager}-{home,project}-r{1,2}-att<id>.json`;
     - `T006-trace-{gated,eager}-{home,project}-att<id>.json.gz` (profiled);
     - `T006-per-task-{gated,eager}-{home,project}.json` + `.md`;
     - `T006-fps-load-{home,project}-{trace-only,recorder}-r{1,2}.json`;
     - `T006-eager-probe-{home,project}-{normal,reduce}-r{1,2}.json` + deadline shots;
     - `T006-cpuprofile-summary-{home,project}.json` (fallback source);
     - `T006-log-bundle-{gated,eager}-ci.json`.
  2. Local baselines at the base product:
     - `perf:parity --write` → `T006-screenshot-gated-*` (8 shots, engaged) and `perf:parity --no-engage --write` on the eager build → `T006-screenshot-eager-*` (8 shots), each with its parity manifest;
     - the local A/B protocol at the base, both routes → `$F/evidence/T006-ab/` (the "before" of T007);
     - **local-emulation drift:** choose `M` so that local eager simulated TBT per route tracks the attempt's (table + chosen `M` in the log);
     - write `$F/lever-block.sh` (verbatim from the "Standing lever-task block" section) and `$F/ab-table.mjs`.
  3. Write `evidence/T006-log-baseline.md`. **This file name is the `BASELINE-FIRST-OK` anchor.** It holds:
     1. the qualification table (every attempt, index min/median/max, runner name, counted or not);
     2. the **GL backend** on the runner (F2). If WebGL is absent → the log says so, and the orchestrator STOPs (Q6);
     3. gated + eager perf/TBT per route, and eager − gated;
     4. **the per-task table:** every task above 50 ms simulated, with observed ms, URL → chunk → module, top functions, H1–H4. The ≈ 200 ms react-dom tasks are named by function;
     5. the Lantern check (F1);
     6. AC2 baseline (both modes, the recorder labelled excluded), AC5 baseline (incl. F4 confirmed or refuted), bytes;
     7. the local-emulation drift table and `M`;
     8. **the confirmed lever order with reasons**, the pre-skips, and any **engine-exception request** (file, change, expected Δ, re-seal plan).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load
  git diff --quiet 7833b28 -- apps/web/components apps/web/build apps/web/app packages && echo PRODUCT-IS-BASE | tee /tmp/s117-checks/t006.txt
  test -s $F/evidence/T006-log-baseline.md && grep -q 'benchmarkIndex' $F/evidence/T006-log-baseline.md
  node -e 'const h=require(process.argv[1]);const i=h.benchmarkIndex;if(!(i.min>=1900&&i.max<=2600))throw new Error("attempt not slow-class");console.log("SLOW-CLASS-OK",i.min,i.max,h.webgl.backend)' $(ls $F/evidence/T006-host-meta-att*.json | head -1) | tee -a /tmp/s117-checks/t006.txt
  test "$(ls $F/evidence/T006-trace-*.json.gz | wc -l)" -eq 4 && test "$(ls $F/evidence/T006-per-task-*.json | wc -l)" -eq 4 && echo ARTIFACTS-OK | tee -a /tmp/s117-checks/t006.txt
  bash $F/guards.sh | tee -a /tmp/s117-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
  The `SLOW-CLASS-OK` check reads the qualifying attempt's meta. Its `benchmarkIndex` range covers every Lighthouse run of the attempt (`eager-verdict --rule s11.7` output attached), not only `perf:host`'s own samples.
- **→ STOP G1.** The orchestrator presents the qualification, the GL backend, the per-task attribution, the Lantern check, the AC2/AC5 baselines and the confirmed lever order, plus an exception request if needed.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T006-log-baseline.md` §4: do the named functions explain the ≈ 200 ms tasks? Does the H1–H4 split match your reading?
  2. §2: the runner's GL backend.
  3. The lever order, and any exception request.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" (or feedback) for G2 (default: the lever order in the log).
  2. On an exception request: "approve" or "decline" (default: decline, which leaves app-side levers only and the verdict follows).
  3. Current 5h usage (default: proceed if < 85 %).

---

## Standing lever-task block (`$F/lever-block.sh`, written in T006)

Every lever task (T007–T012) sources it after its own unit tests, with `T=t0NN` set. It runs the local A/B and the non-goal checks against the T006 local baseline and exits non-zero on a STOP condition.

```sh
# requires: F, T, M (cpu multiplier from T006-log-baseline.md §7); before = previous accepted state's $F/evidence/<prev>-ab/
O=/tmp/s117-checks/$T; mkdir -p $O
pnpm build:eager && pnpm bundle:manifest --out-dir apps/web/out --write $O/eager-manifest.json
for r in home:/ project:/projects/websocket-inspector; do n=${r%%:*}; p=${r#*:}
  (pnpm serve:out --port 4321 & echo $! > $O/srv.pid); sleep 2
  for i in 1 2; do pnpm perf:lighthouse http://127.0.0.1:4321$p --gl swiftshader --cpu-multiplier $M --out $O/lh-$n-r$i || echo "exit $? (verdict recorded)"; done
  pnpm perf:lighthouse http://127.0.0.1:4321$p --profile --gl swiftshader --cpu-multiplier $M --out $O/lhp-$n || echo "exit $? (verdict recorded)"
  kill "$(cat $O/srv.pid)"
  pnpm perf:attribution --lhr $O/lhp-$n/lighthouse-run-0.json --trace $O/lhp-$n/lighthouse-run-0.trace.json.gz --manifest $O/eager-manifest.json --out $O/attr-$n
  for i in 1 2; do pnpm fps:engine --scenario load --route $p --no-build --out $O/fps-$n-r$i || echo "exit $? (verdict recorded)"; done
  pnpm eager:probe --serve apps/web/out --route $p --runs 2 --out $O/probe-$n || echo "exit $? (verdict recorded)"
  pnpm eager:probe --serve apps/web/out --route $p --runs 2 --reduced-motion --out $O/probe-$n-reduce || echo "exit $? (verdict recorded)"
done
pnpm perf:parity --serve apps/web/out --no-engage --compare /tmp/s117-checks/baseline-shots-eager      # post-eager parity: 0 px or STOP
node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-eager.json /tmp/s117-checks/base-eager $O/eager-manifest.json apps/web/out
pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write $O/gated-manifest.json
pnpm perf:parity --serve apps/web/out --compare /tmp/s117-checks/baseline-shots-gated                  # rest-state parity: 0 px or STOP
node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-gated.json /tmp/s117-checks/base-gated $O/gated-manifest.json apps/web/out
pnpm site:probe --serve apps/web/out --group draws --group hero 2>&1 | tail -5
pnpm perf:startup --serve apps/web/out --route /projects/websocket-inspector --engage click --attribute --runs 2 --out $O/seq-project   # S11.6 sequence probe
pnpm perf:startup --serve apps/web/out --route / --engage move --attribute --runs 2 --out $O/seq-home
node $F/ab-table.mjs <before-dir> $O > $O/ab.md       # medians, spreads, keep-rule verdict (written in T006)
```

- The two baseline-shot dirs are rebuilt from the committed `T006-screenshot-{gated,eager}-*` + parity manifests (single-set dirs, S11.6 R6).
- `ab-table.mjs` (feature dir, T006) prints the keep-rule verdict.

---

## Phase G2 — App-side levers (STOP after T013)

### T007 [US1] L0 — eager workbench guards (reduced motion, saveData)

- **Seam:** the eager branch of `WorkbenchLoader` ↔ AC5's reduced-motion clause.
- **Files:**
  - `apps/web/components/workbench/workbench-loader.tsx` (plan.md L0);
  - `apps/web/test/eager-flag.test.ts` (new assertion; the existing assertions kept, R6);
  - `apps/web/test/eager-guards.test.tsx` (new).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks
  pnpm --filter web exec vitest run test/eager-flag.test.ts test/eager-guards.test.tsx --reporter verbose 2>&1 | tee /tmp/s117-checks/t007.txt
  pnpm build:eager
  for r in / /projects/websocket-inspector; do pnpm eager:probe --serve apps/web/out --route $r --runs 2 --reduced-motion --out /tmp/s117-checks/t007-reduce || echo "exit $? (verdict recorded)"; done
  node -e 'const fs=require("fs");const d="/tmp/s117-checks/t007-reduce";const rs=fs.readdirSync(d).filter(f=>f.endsWith(".json")).map(f=>JSON.parse(fs.readFileSync(d+"/"+f)));if(rs.length!==4||!rs.every(r=>r.pass&&r.atDeadline.canvasCount===0))throw new Error("reduce fail");console.log("REDUCE-POSTER-ONLY-OK")' | tee -a /tmp/s117-checks/t007.txt
  T=t007; source $F/lever-block.sh          # includes the gated hero probe, parity, bytes
  bash $F/guards.sh | tee -a /tmp/s117-checks/t007.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-l0.md`: probe before/after (project reduce: fail → pass), the A/B (expected Δ ≈ 0 with the motion on), parity, bytes. L0 is kept as a correctness fix even without a perf Δ: it is not subject to the keep rule (RFC D3 rank 0).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: with OS "reduce motion" on, `NEXT_PUBLIC_EAGER_3D=1 pnpm dev`, then open the project page. The poster stays, and "Explore in 3D" still works on click.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q10, saveData included).

### T008 [US3] L1 — render-lane hygiene (reveal and portals)

- **Seam:** app state updates ↔ synchronous re-renders of the live tree (H2).
- **Files:**
  - `apps/web/components/hero/hero-live.tsx`, `apps/web/components/workbench/workbench-loader.tsx`, `apps/web/components/workbench/workbench-client.tsx` (plan.md L1);
  - `apps/web/test/eager-render-lanes.test.tsx` (new).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; T=t008; mkdir -p /tmp/s117-checks
  pnpm --filter web exec vitest run test/eager-render-lanes.test.tsx --reporter verbose 2>&1 | tee /tmp/s117-checks/$T.txt
  source $F/lever-block.sh      # standing lever-task block, see above
  bash $F/guards.sh | tee -a /tmp/s117-checks/$T.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-l1-ab.md`: the A/B table, the attributed tasks before/after (the reveal and mount commit, observed ms), parity, sequence, bytes, kept or reverted.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm dev`, click "Explore in 3D", use the dock, tour and layers. Nothing should behave differently.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the keep rule decides).

### T009 [US3] L2 — staged composition on the project route

- **Seam:** the WorkbenchClient mount commit ↔ two smaller commits; reveal ↔ "portals mounted".
- **Files:** `apps/web/components/workbench/workbench-client.tsx` (plan.md L2); `apps/web/test/eager-staged-portals.test.tsx` (new).
- **Check:** as T008, with `test/eager-staged-portals.test.tsx`, plus the sequence probe assertion "dock children exist at the `revealed` mutation" (both builds: gated via the click path in `perf:startup --engage click`).
- **Evidence:** `evidence/T009-log-l2-ab.md`.
- **Runs only if** T008's after-state still shows a project-route mount/commit task above the design target in `perf:attribution`. Otherwise ⊘ skipped with that evidence.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the A/B + sequence log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T010 [US3] L3 — staged module evaluation (L3a) + idle prefetch (L3b)

- **Seam:** `import()` evaluation tasks ↔ smaller ordered stages; network ↔ idle prefetch.
- **Files:**
  - `apps/web/build/stage-3d.ts`, `apps/web/build/three-stage-{a,b,c}.ts` (new, ≤ 3);
  - `apps/web/components/boot-3d.ts`;
  - `apps/web/components/hero/hero-boot.ts`, `apps/web/components/workbench/workbench-boot.ts` (only for L3b);
  - `apps/web/test/stage-3d.test.ts`, `boot-3d.test.ts` (R6).
- **Check:** as T008, plus:
  - the `bundle:manifest` chunk map shows each stage as its own file;
  - `perf:attribution` shows the evaluation tasks split (observed ms per stage);
  - for L3b: the network log (eager:probe run) shows the prefetch requests before evaluation, or the skip evidence (plan.md L3 step 2).
  - L3a and L3b are **separate commits with separate A/Bs**.
- **Evidence:** `evidence/T010-log-l3-ab.md` (+ `T010-log-chunks.txt`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: L3b skipped if Turbopack offers no URL source).

### T011 [US3] L4 — post-hydration sequencing (conditional)

- **Seam:** the eager boot start ↔ the end of hydration.
- **Runs only if** plan.md L4's condition holds on the T006 or T010 traces. Otherwise ⊘ with evidence.
- **Files:** `apps/web/components/hero/hero-live.tsx`, `workbench-loader.tsx` (a second `waitForIdle`); `apps/web/test/interaction-gate.test.ts` (case added).
- **Check:** as T008, plus the local `eager:probe` deadline times before/after (the AC5 cost of the extra idle).
- **Evidence:** `evidence/T011-log-l4-ab.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T012 [US3] L5 — hydration islands (conditional)

- **Seam:** a named island's hydration task ↔ a narrower client boundary.
- **Runs only if** T006 attributes an app-component hydration task above 12.5 ms observed. The island and its files are named at G1, added to `app-touch.txt` with a §9 note. Otherwise ⊘ with evidence.
- **Check:** as T008, plus CLS 0 on both builds (Lighthouse + load harness) and `server-components.test.ts` green.
- **Evidence:** `evidence/T012-log-l5-ab.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Approval of the named island at G1 (default: skip if none is attributed).

### T013 [US5] Final local state: parity, draws, CLS, sequence, bytes, before/after

- **Seam:** the whole lever stack ↔ the non-goals and AC4.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load; mkdir -p /tmp/s117-checks
  pnpm build    # gated
  # perf:parity 8 shots vs T006 baseline shots → 0 px; site:probe --group draws --group hero; engine:probe --scope s4 (fixtures) = 2 draws
  pnpm bundle:manifest --out-dir apps/web/out --write $F/evidence/T013-log-bundle-gated.json
  node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-gated.json /tmp/s117-checks/base-gated $F/evidence/T013-log-bundle-gated.json apps/web/out | tee $F/evidence/T013-log-bytes.txt
  pnpm build:eager
  # post-eager parity 8 shots vs T006 → 0 px; load harness CLS; sequence probe both routes
  pnpm bundle:manifest --out-dir apps/web/out --write $F/evidence/T013-log-bundle-eager.json
  node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-eager.json /tmp/s117-checks/base-eager $F/evidence/T013-log-bundle-eager.json apps/web/out | tee -a $F/evidence/T013-log-bytes.txt
  bash $F/guards.sh | tee -a /tmp/s117-checks/t013.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T013-OK
  ```
- **Evidence:**
  - `evidence/T013-log-before-after.md`: per lever and final, local emulation, 2 runs each: eager simulated TBT, the targeted tasks' observed ms, max long task, dropped frames (trace-only, and recorder labelled excluded), AC5 times. Kept / reverted / skipped per lever;
  - `T013-log-parity.txt`, `T013-log-drawcalls.txt`, `T013-log-bytes.txt`, `T013-log-ready-reveal.md`.
- **→ STOP G2.**
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T013-log-before-after.md` and the byte table.
  2. Optional: an eager build in the browser (`NEXT_PUBLIC_EAGER_3D=1 pnpm dev`) on both routes. Is it visually identical once revealed?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for G3 (default: proceed to the verdict on the final state).
  2. Current 5h usage.

---

## Phase G3 — Verdict (STOP after T014)

### T014 [US1, US3, US4] Two slow-class attempts on the final state; AC2, AC3, AC5; AC6 branch (orchestrator: CI; executor: tables)

- **Seam:** the final product on two independent slow-class runners ↔ AC2/AC3/AC5 and the fallback contract.
- **Steps (orchestrator):**
  1. Push the final state (the PR head).
  2. Wait for `eager-load` (3 shards); rerun until **two** qualifying attempts with distinct runner names exist (cap 10; past the cap → STOP + escalate).
  3. Download every counted attempt's full artifact, plus the summaries + meta of the others.
- **Steps (executor):**
  1. `eager-verdict --rule s11.7 --dir …` over all attempts → `evidence/T014-log-ac3.md`. The first two qualifying attempts in time order decide.
  2. `evidence/T014-log-ac2.md`: per counted attempt × route, `trace-only` max long task + dropped frames (median of 2, raws). The recorder count goes in a separate column headed "excluded from AC2: harness rAF recorder".
  3. `evidence/T014-log-ac5.md`: per counted attempt × route, normal + reduced motion, both runs. Deadline times, trusted-event count, fade, non-blank, canvas absence under reduce.
  4. `evidence/T014-log-verdict.md`: the AC6 branch.
     - **fail** → "verdict: keep gate". The default build is still gated (`FLAG-DEFAULT-OK`), the eager path stays flag-only, and the per-attempt numbers + remaining attribution are recorded.
     - **pass ×2** → the numbers for Murphy's decision.
  5. The before/after vs T006 on the slow class: same protocol, different attempts. Same-attempt eager − gated is the tie-breaker.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load
  for f in T014-log-ac2.md T014-log-ac3.md T014-log-ac5.md T014-log-verdict.md; do test -s $F/evidence/$f; done
  grep -Eq 'AC3 (PASS|FAIL)' $F/evidence/T014-log-ac3.md && grep -Eq 'verdict: (keep gate|retire on Murphy)' $F/evidence/T014-log-verdict.md && echo VERDICT-RECORDED
  test "$(ls $F/evidence/T014-host-meta-att*.json | wc -l)" -ge 2 && echo ATTEMPTS-OK
  bash $F/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T014-OK
  ```
- **→ STOP G3.**
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T014-log-verdict.md` and the PR's checks tab.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "go" for G4 (default: proceed).
  2. **If AC3 passed twice:** "retire" or "keep" (default: keep until you say "retire", RFC Q13).

---

## Phase G4 — CI and surfaces (STOP after T015)

### T015 [US5] Guards, CI green, frozen-surface diffs, AC1–AC7 self-check

- **Seam:** the whole branch ↔ AC7 + the end-contract.
- **Files (evidence):**
  - `T015-log-guard.txt`;
  - `T015-log-frozen-diffs.txt`: `git diff --stat 7833b28 -- packages/xploder` (empty), the three workflow files (empty), `app-touch.txt` vs the actual app diff;
  - `T015-ci-run.txt`: every check on the PR head green, including `seo: meta + og`, both axe jobs, the perf gates and `perf: eager-3d (measurement)`;
  - `evidence/AC-selfcheck.md`: the AC1–AC7 table with artifacts, plus the per-task finishing tier.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/eager-load
  bash $F/guards.sh | tee $F/evidence/T015-log-guard.txt
  git diff --quiet 7833b28 -- packages/xploder .github/workflows/ci.yml .github/workflows/perf.yml .github/workflows/eager-3d.yml && echo SURFACES-EMPTY
  gh pr checks --required && gh pr checks | tee $F/evidence/T015-ci-run.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T015-OK
  ```
- **→ STOP (end-contract).** AC1–AC7 self-check table + the "needs Murphy's hands" list.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation of the draft PR, then "merge" (the orchestrator merges only on your word).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" or feedback.

### T015b [US4] Gate retirement (conditional: only after AC3 PASS ×2 **and** Murphy's "retire")

- **Seam:** the default build ↔ the eager path (AC6 "the gate is retired").
- **Files:**
  - `apps/web/next.config.ts`: `__XP_EAGER_3D__` defaults to true; `NEXT_PUBLIC_EAGER_3D=0` restores the gate for one slice (RFC Q13);
  - `apps/web/test/eager-flag.test.ts` updated;
  - `guards.sh` `FLAG-DEFAULT-OK` inverted, with a §9 note.
- **Check:** the default build passes `perf-gate: lighthouse (mobile)` and `weight` on the PR, both axe jobs, and `site:probe --group hero` adapted to "revealed without interaction". Then T015's check again.
- **D-19:** the amendment is recorded in rfc.md §9 (Murphy's words). `eager-3d.yml` + `eager-load.yml` are removed in a follow-up commit **after** that record (AC7).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The Vercel preview: both routes show the live teardown without touching the page.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "retire" (no default: this task never runs without it).
