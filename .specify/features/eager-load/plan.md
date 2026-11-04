# Implementation Plan: S11.7 Eager Load Path

**Feature dir:** `.specify/features/eager-load/` · **Branch:** `task/s11.7-eager-load` · **Date:** 2026-11-03 · **Inputs:** `spec.md`, `rfc.md` (approved at Gate 1: all §7 defaults; refinements R1–R10 in §9)

## Summary

Measurement comes first, and the first deliverables touch no product code:

- guards and a byte-budget helper;
- additive `tools/perf` harness: profiled Lighthouse traces, per-task attribution, the no-engagement load scenario (named frame modes), the AC5 probe, the host meta and the S11.7 verdict rule;
- a measurement-only workflow, `eager-load.yml`, that runs the whole set per attempt on three runner shards;
- then the **AC1 baseline** on one slow-class attempt, committed before any app change.

App-side levers then land one per commit, each with a local A/B:

- **L0:** reduced-motion and saveData guards on the eager workbench branch;
- **L1:** render-lane hygiene, so the reveal and the portals stop re-rendering the live tree synchronously;
- **L2:** staged composition on the project route;
- **L3:** staged module evaluation + idle prefetch of the 3D chunks;
- **L4 / L5** (conditional): post-hydration sequencing and hydration islands.

The verdict runs once, on the final state, until two slow-class attempts exist. The slice ends with CI green and the AC self-check. `packages/xploder` stays untouched throughout.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19, Next 16 (Turbopack) static export, `three` + `@react-three/fiber` (pinned), Node 24, pnpm 12 |
| Binding host | GitHub-hosted `ubuntu-latest` attempts qualified per RFC D1 (all Lighthouse `benchmarkIndex` in [1,900, 2,600]) |
| Local host | Apple M4 (≈ 4,200), A/B only: `perf:lighthouse --gl swiftshader --cpu-multiplier <4 × index ÷ 2,200>` + `fps:engine --scenario load` at 4× |
| Lighthouse | 13.6, `throttling: simulate`. Lantern: task × `cpuSlowdownMultiplier` (`Simulator.js` L244), timers as edges without delay (`PageDependencyGraph.js` L252-269) (R1) |
| New deps | **none** |
| Tests | vitest: `tools/perf/test/*` (new + additive cases); `apps/web/test/*` (new lever tests; `stage-3d` / `eager-flag` updated in their lever commits, R6) |
| Budgets | `tools/perf/src/budgets.ts` unchanged. AC3/AC4 bars are verdict rules |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; **all of `packages/xploder`**; `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`; `ci.yml`, `perf.yml`, `eager-3d.yml` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. The levers are the brief's three app-side items plus L0 (an AC5 correctness fix). Non-goals hold: no visual, theme, tour, panel or a11y change, no client library, no content change, no budget change. |
| II. Static-only | Unchanged. The workflow serves the export locally on the runner. |
| III. Performance is a feature | The slice's purpose. Initial JS ≤ +2,000 B gzip per route (AC4). |
| IV. Single motion source | Yields use `scheduler.yield()` / `MessageChannel` / `requestIdleCallback` without numeric timeouts. `no-motion-literals` stays unchanged and green. |
| V. Theme integrity | No palette code is touched. Parity runs in light + dark. |
| VI. Evidence over assertion | Every number has an artifact. Baseline-before-change is enforced by `BASELINE-FIRST-OK`. |
| VII. No secrets | Runner paths → `<runner-home>`, local paths → `<local-path>`, ports → `PORT`. Traces go through `gitleaks dir` before commit. |

## Project Structure

### Documentation (this feature)

```
.specify/features/eager-load/
  rfc.md · spec.md · plan.md · tasks.md
  guards.sh · app-touch.txt (APP-TOUCH-OK allowlist) · lever-block.sh + ab-table.mjs (T006, standing A/B)
  bundle-scopes.mjs                 copied from staged-canvas-mount + --budget mode (R5)
  evidence/   RFC-log-static-read.txt + T<NNN>-* per EVIDENCE.md
```

### Source code (changes only)

```
tools/perf/
  src/lighthouse.ts                 EDIT additive: runLighthouse opts { profile?, cpuMultiplier?, gl? }; profiled runs save trace.json.gz
  src/cli/lighthouse-gate.ts        EDIT + --profile, --cpu-multiplier <x>, --gl swiftshader (defaults byte-identical)
  src/browser.ts                    EDIT additive: launch({ cdpPort, args? }) (existing call sites unchanged)
  src/lh-attribution.ts             NEW  pure: LHR long tasks + observed trace + manifest → PerTaskRecord[]
  src/cli/attribution.ts            NEW  `pnpm perf:attribution --lhr <run.json> --trace <trace.json.gz> --manifest <m.json> --out <dir>`
  src/cli/startup-profile.ts        EDIT + --engage none (t0 = load event; window load → load + 5 s) (R3)
  src/cli/fps-engine.ts             EDIT + --scenario load, --frames trace-only|recorder (explode/tour/startup byte-identical)
  src/fps.ts                        EDIT additive export: traceOnlyFrames(page, window) (no rAF recorder)
  src/eager-probe.ts                NEW  AC5 probe core (init script, deadline evaluation)
  src/cli/eager-probe.ts            NEW  `pnpm eager:probe --serve <dir> --route <p> [--reduced-motion] --runs 2 --out <dir>`
  src/cli/host-meta.ts              NEW  `pnpm perf:host --out <file>` (benchmarkIndex, Chromium, WebGL renderer/vendor/backend, RUNNER_NAME, ImageVersion)
  src/cli/eager-verdict.ts          EDIT + --rule s11.7 [--dir <attempt-dir>]… (default output byte-identical, R4)
  src/cli/parity.ts                 EDIT + --no-engage (post-eager shots without input; engaged path byte-identical, R10)
  test/{lighthouse,eager-verdict,fps-engine-load,startup,attribution,eager-probe,host-meta}.test.ts   NEW or additive
package.json                        EDIT scripts: perf:attribution, eager:probe, perf:host
.github/workflows/eager-load.yml    NEW measurement-only, slice branch only, matrix shard [1,2,3]
apps/web/components/workbench/workbench-loader.tsx   EDIT L0 (guards), L1 (portal targets passed down)
apps/web/components/workbench/workbench-client.tsx   EDIT L1 (memoised live element, targets from props), L2 (staged portals)
apps/web/components/hero/hero-live.tsx               EDIT L1 (memoised stage element)
apps/web/components/boot-3d.ts · build/stage-3d.ts · build/three-stage-*.ts (NEW)   EDIT L3
apps/web/components/hero/hero-boot.ts · workbench/workbench-boot.ts                EDIT L3 (prefetch), L4
apps/web/test/{eager-flag,stage-3d,boot-3d,interaction-gate}.test.ts  EDIT (R6, L4) · apps/web/test/eager-*.test.tsx NEW
```

`app-touch.txt` lists exactly these app paths. Any other `apps/web` change STOPs the task (`APP-TOUCH-OK`). L5 adds files to the list only at G1/G2, on evidence.

## Guards (every task)

`guards.sh` (T001) prints one line per guard and exits 1 on any failure.

```sh
B=7833b28                                   # S11.7 freeze = slice base (product = S11.6 merged 2fd19f0)
F=.specify/features/eager-load

guard FROZEN-OK          git diff --quiet $B -- .specify/slices .specify/KICKOFF-S11.7.md .specify/content
guard BRIEF-HISTORY-OK   test -z "$(git log --oneline $B..HEAD -- .specify/slices .specify/KICKOFF-S11.7.md .specify/content)"
guard XPLODER-EMPTY-OK   git diff --quiet $B -- packages/xploder             # S2–S8 empty by construction
guard APP-TOUCH-OK       git diff --name-only $B -- apps/web | grep -vxFf <(grep -v '^#' $F/app-touch.txt) | wc -l | grep -qx 0
guard BASELINE-FIRST-OK  first=$(git log --reverse --format=%H $B..HEAD -- apps/web/components apps/web/build apps/web/app | head -1);
                         test -z "$first" || git merge-base --is-ancestor \
                           "$(git log --format=%H --diff-filter=A -1 -- $F/evidence/T006-log-baseline.md)" "$first"
guard DEV-ROUTES-OK      git diff --quiet $B -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard CI-JOBS-OK         git diff --quiet $B -- .github/workflows/ci.yml .github/workflows/perf.yml .github/workflows/eager-3d.yml &&
                         test "$(git diff --name-only --diff-filter=A $B -- .github/workflows)" = ".github/workflows/eager-load.yml" -o \
                              -z "$(git diff --name-only --diff-filter=A $B -- .github/workflows)"
guard FLAG-DEFAULT-OK    grep -q "process.env.NEXT_PUBLIC_EAGER_3D === '1'" apps/web/next.config.ts   # AC6: gated stays default unless retired
guard VERSIONS-OK        git diff --quiet $B -- pnpm-lock.yaml packages/*/package.json apps/web/package.json tools/perf/package.json
guard BUDGETS-OK         git diff --quiet $B -- tools/perf/src/budgets.ts
guard GITLEAKS-OK        gitleaks git --no-banner --log-opts="$B..HEAD" . && gitleaks dir --no-banner $F
```

- `BASELINE-FIRST-OK` holds trivially until the first app commit, then proves ancestry from the T006 baseline log.
- `FLAG-DEFAULT-OK` changes only in the conditional retirement task (T015b), on Murphy's word. That task edits the guard with a §9 note.
- `XPLODER-EMPTY-OK` would become `XPLODER-SRC-OK` + re-seal guards only under an approved exception (RFC D10).

## Harness (RFC D2; SR1.1, SR2.1, SR3.1, SR5.1)

### Profiled Lighthouse + attribution (T002)

- **`runLighthouse(url, { runs, categories, profile?, cpuMultiplier?, gl? })`:**
  - `profile` sets the flag `additionalTraceCategories: 'disabled-by-default-v8.cpu_profiler'` and keeps `result.artifacts.Trace` + `DevtoolsLog`. The CLI writes `lighthouse-run-N.trace.json.gz`.
  - `cpuMultiplier` sets `throttling.cpuSlowdownMultiplier`.
  - `gl: 'swiftshader'` launches Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`.

  With no options, the code path and outputs are unchanged (test: identical flags object and summary for a fixture LHR).
- **Profiled summaries** carry `"profiled": true`. `eager-verdict` and `perf:lighthouse`'s gate refuse to aggregate them (test).
- **`lh-attribution.ts` (pure):**
  1. **Input:** the LHR `long-tasks` items (simulated `startTime`, `duration`, `url`), plus the observed trace's top-level main-thread tasks (`RunTask` on the renderer main thread of the page's pid), each with its `ProfileChunk` samples, plus the `bundle:manifest` chunk map.
  2. **Match:** each long task is matched to the observed task with the same attributable URL whose `|observed × 4 − simulated| / simulated` is the smallest and ≤ 25 %, in chronological order. Unmatched tasks are kept with `observedMs: null`.
  3. **Per matched task:** self time per function (V8 samples inside the task window), function → script URL → chunk → modules (manifest), top functions ≥ 5 %, `tbtMs = max(0, simulated − 50)`.
  4. **Hypothesis tag:**
     - **H1:** WebGL calls or `hasWebgl` / `WebGLRenderer` frames ≥ 20 % of self time;
     - **H2:** React reconciler render/commit (`performWorkOnRoot`, `commitRoot`, …) from a non-transition lane ≥ 40 %;
     - **H3:** module-evaluation frames ≥ 40 %;
     - **H4:** a task before the first eager import.
- **Fallback (R2):** LH 13.6 ships the profiler category disabled upstream (`trace.js` L67-70). If a profiled run fails, or its trace has no `ProfileChunk`, the per-task table uses `perf:startup --engage none --cpu-profile` from the same attempt, joined by URL and order. The log says which source was used.
- **`perf:attribution` CLI:** writes `per-task.json` + `per-task.md` (the table in RFC D5) and the **Lantern check**:
  - observed vs simulated start of each matched task (shows idle gaps collapsing);
  - Σ max(0, 4·d − 50) over observed tasks vs the LHR TBT.

### Load scenario + named frame modes (T003)

- **`fps:engine --scenario load --route <p> [--frames trace-only|recorder] [--cpu <rate>]`:**
  - default `--frames trace-only`, `--cpu 4`;
  - it builds with `pnpm build:eager` unless `--no-build` (R8);
  - mobile profile, `serveDir`, CDP throttle set **before** navigation, no engagement.
- **Trace:** starts before `goto`. The window is `[loadEventStart, loadEventStart + 5 s]`, with `loadEventStart` taken from `performance.timing` mapped onto the trace clock via a `performance.mark('xp-perf:load')` in an init-script `load` listener.
- **Long tasks:** top-level main-thread tasks that **intersect** the window. Tasks wholly before the window go to `preLoadTasks`, published but not gated.
- **`trace-only`:** no `measureFps`, no page rAF injection. `droppedFrames` = Compositor `DroppedFrame` events in the window (the existing `droppedFrameTimesFromTrace` filter).
- **`recorder`:** the S11.6 `measureFps` path over the same window. Its report is marked `"gated": false` and carries the sentence: "the harness rAF recorder adds a frame demand on every vsync; this count is excluded from AC2."
- **`mounted` + `readyMs`:** from a `data-xploder-ready` MutationObserver. A run with `mounted: false` is **invalid** (exit 1): it measured no eager path.
- **Verdict:** `longTask50 = maxLongTaskMs ≤ 50`, `droppedFramesLe2 = droppedFrames ≤ 2`. The gate uses only `trace-only`.
- **Byte-identity:** `fps-engine.test.ts` and `fps-engine-startup.test.ts` pass **unmodified**.

### `perf:startup --engage none` (T003, R3)

- t0 = the load mark (same init script). No engagement, window t0 → t0 + 5 s.
- `--cpu-profile` (the existing third run kind) attributes every task above 16.7 ms.
- The meta gains nothing new, because it already records `benchmarkIndex` and the WebGL renderer. `move` / `click` are byte-identical (tests).

### `eager:probe` (T004; RFC D6)

1. **Init script** (before any page script):
   - capture-phase listeners for `pointerdown pointermove pointerup mousedown mousemove mouseup click touchstart touchmove wheel scroll keydown focusin`, counting `event.isTrusted`;
   - a MutationObserver recording the first `performance.now()` of `data-xploder-ready="true"` and of each `data-site-live-state` value;
   - a `load` timestamp.
2. **Navigation:** `page.goto(url, { waitUntil: 'commit' })`. No `mouse` / `keyboard` / `touchscreen` / `hover` / `focus` / `click` / `scroll` / `evaluate`-dispatched events. A unit test greps the probe source for those APIs.
3. **At the deadline** (`timeOrigin + 2,500` ms, waited with `page.waitForFunction(() => performance.now() >= 2500)`, read immediately after):
   - canvas present in `[data-site-live]` with a non-zero rect;
   - ready ≤ 2,500, revealed ≤ 2,500;
   - live layer `getComputedStyle(...).opacity === '1'`, poster `visibility === 'hidden'`;
   - trusted events = 0;
   - element screenshot of the canvas → `nonBlank` = more than one distinct colour and not uniformly the `--color-bg` value.

   Then 2 s more at rest: no change of `data-site-live-state`, no tour attribute (ambient idle).
4. **Reduced motion** (`--reduced-motion` → `reducedMotion: 'reduce'`):
   - observed until load + 5 s: zero `canvas` elements, no ready attribute, poster `opacity === '1'` and `visibility === 'visible'`;
   - `threeRequested` comes from the network log of three/R3F chunk URLs (manifest), informational.
5. **Output:** `eager-probe-<route>-<motion>-r<N>.json` + `…-deadline.png`. Exit 6 if any run fails (measurement steps record the exit, as D-P2 in S11.6).

### `perf:host` (T005)

- Launches the harness Chromium headless (the same `launch()`), and opens `about:blank` → a data-URL page.
- `computeBenchmarkIndex()` ×3 (median).
- WebGL: `getContext('webgl2') ?? getContext('webgl')`, `WEBGL_debug_renderer_info`, then backend = `swiftshader` | `angle-<vendor>` | `none`.
- Plus `RUNNER_NAME`, `ImageOS` / `ImageVersion` and `GITHUB_RUN_ID` / `GITHUB_RUN_ATTEMPT` from the environment, sanitised.
- With `--gl swiftshader`, it reports what that flag yields (for local emulation).

### `eager-verdict --rule s11.7` (T004, R4)

- **Default invocation** (`--dir`): byte-identical output (golden test against a fixture dir).
- **`--rule s11.7 --dir <attempt>…`:**
  - per attempt: qualification = every run's `benchmarkIndex` in [1,900, 2,600];
  - per route: eager and gated route values (the existing two-invocation median), `ruleA = perf ≥ 0.95 && tbt ≤ 200`, `ruleB = eager.tbt − gated.tbt ≤ 50`, `pass = ruleA || ruleB`;
  - overall: **AC3 PASS** iff ≥ 2 qualifying attempts with distinct `runnerName` (from `host-meta.json` in each dir) **and** both routes pass on the first two qualifying attempts in time order. Otherwise AC3 FAIL, plus the per-attempt table.
  - Later qualifying attempts are listed too. The verdict is fixed by the first two, so that no attempt is cherry-picked.
- Exits 0 (measurement); the verdict is in the text and in `ac3-verdict.json`.

## Workflow `eager-load.yml` (T005; RFC D2.6)

```yaml
name: eager-load
on: { pull_request: {} }
permissions: { contents: read }
jobs:
  measure:
    if: github.head_ref == 'task/s11.7-eager-load'
    name: 'perf: eager-load (slow-class measurement) #${{ matrix.shard }}'
    runs-on: ubuntu-latest
    timeout-minutes: 75
    strategy: { fail-fast: false, matrix: { shard: [1, 2, 3] } }
    steps: checkout · pnpm · node (.nvmrc) · install --frozen-lockfile · Playwright cache + install chromium
      - perf:host → $E/host-meta.json                                  # E=.evidence/ci/eager-load
      - build gated → bundle:manifest → $E/gated-manifest.json
        serve:out :4320 → perf:lighthouse ×2 per route ($E/gated-<route>-r<n>) · --profile ×1 per route ($E/profiled-gated-<route>)
      - build:eager → bundle:manifest → $E/eager-manifest.json
        serve:out :4320 → perf:lighthouse ×2 per route · --profile ×1 per route
                        → perf:startup --engage none --cpu-profile --runs 1 per route (fallback source, R2)
                        → fps:engine --scenario load --no-build ×2 per route per --frames mode
                        → eager:probe --runs 2 per route, normal + --reduced-motion
      - perf:attribution for each profiled run · eager-verdict --dir $E (default) + --rule s11.7 --dir $E
      - upload-artifact eager-load-${{ github.run_id }}-${{ github.run_attempt }}-s${{ matrix.shard }} (retention 14)
```

- Every measuring step records its exit code (S11.6 D-P2 pattern) and never fails the job. The job fails only on a build or tool error.
- **Not a required check.** It does not touch `eager-3d.yml`.
- **Reruns:** `gh run rerun <run-id>` re-runs all three shards (new VMs, new attempt number).

## Levers (RFC D3; SR2.2, SR5.2)

All levers live in `apps/web` and are listed in `app-touch.txt`. Each lever task makes **one commit**, with an A/B against the previous accepted state.

### L0 — Eager workbench guards (T007)

`WorkbenchLoader`'s eager branch, before the `load` wait:

```ts
const media = window.matchMedia(motion.reducedMotion.query);
if (media.matches || (navigator as SaveDataNavigator).connection?.saveData === true) return;  // poster stays; click path unaffected
media.addEventListener('change', onMotionChange);   // reduce mid-boot → controller.abort()
```

- This mirrors `hero-live.tsx` L62-81. The click listener is untouched, so a reduced-motion visitor can still choose "Explore in 3D".
- `eager-flag.test.ts` gains the assertion "the eager branch checks `motion.reducedMotion.query` and saveData before waiting for load". The existing gated-branch assertions stay (R6).
- **New test `eager-guards.test.tsx`** (jsdom; `__XP_EAGER_3D__` defined true via `vi.stubGlobal`):
  1. reduce → no `workbench-boot` import;
  2. saveData → none;
  3. a change to reduce while waiting → abort;
  4. the click still boots.

### L1 — Render-lane hygiene (T008)

- **Hero** (`hero-live.tsx`):
  ```tsx
  const stage = useMemo(() => (HeroStage === null ? null : <HeroStage project={project} onFirstFrame={reveal} />), [HeroStage, project, reveal]);
  ```
  React bails out on an identical element, so `setState('revealed')` re-renders only the wrapper `div`.
- **Workbench:**
  - `WorkbenchLoader` resolves `{ dock, tour }` from `[data-site-workbench]` in its effect (it already finds the root, L16) and passes `targets` to `WorkbenchClient`.
  - `WorkbenchClient` drops its `useLayoutEffect` + `setPortalTargets`. A layout effect without setState sets `data-site-explore-live` on `tour`.
  - The live element (`<LiveViewer …/>` including its `fallback`) is memoised on `[project, viewer, panels, reveal, ariaLabel]`. The handles are memoised in xploder (`useTeardownViewer.ts` L262-304, `useViewerPanels.ts` L97-104) (R7).
  - The portals are memoised on their props.
- **Tests (`eager-render-lanes.test.tsx`, jsdom, xploder viewer mocked):**
  1. on reveal, the mocked `LiveViewer` render count does not increase;
  2. the portals render once at mount, with no layout-effect re-render (render counter);
  3. `data-site-explore-live` is set;
  4. tour/explore interactions still re-render the panels (behaviour unchanged).

### L2 — Staged composition, project route (T009)

- `WorkbenchClient` state `portalsReady` (false), set by `startTransition` in a `useEffect` after the live element's commit.
- The portals render only when `portalsReady`.
- `reveal` sets `firstFrame`, and `liveState = firstFrame && portalsReady ? 'revealed' : 'loading'`. The reveal never precedes the portals, so every post-reveal frame is as today.
- **Tests:**
  1. portals mount in a later commit than the viewer;
  2. a first frame before the portals delays the reveal until they mount;
  3. a first frame after them reveals at once.
- **Sequence probe:** the live-state list is unchanged, and dock children exist at the `revealed` mutation.

### L3 — Staged module evaluation + idle prefetch (T010)

1. **AC1 decides the split.** `perf:attribution` names the modules inside the `three` / `3vwpvuyn90046.js` / R3F evaluation tasks. `build/three-stage-*.ts` (≤ 3 files) re-export **subsets of `three/src/...`**, grouped so each evaluates in ≤ 12.5 ms observed on the slow host (**design target**). `STAGES_3D` becomes `[stage-a, stage-b, …, three, @react-three/fiber, <viewer chunk>]`. Later imports reuse the evaluated modules.
2. **Prefetch (sub-lever L3b, separate A/B).** Fetch the 3D chunks during idle right after poster paint, without evaluating them, so later stages only evaluate.
   - **The open question is the URL source.** Turbopack's `import()` loads and evaluates in one step, and the app has no chunk-URL list at runtime.
   - **T010 first checks** whether the Turbopack runtime exposes a load-without-evaluate path, or whether the chunk URLs can be read from the export without a new build script.
   - **If neither exists,** L3b is **skipped with that evidence** and only the staged evaluation (L3a) lands. A new build step or a runtime hack is not added for it.
   - **If it lands,** the network log proves the prefetch precedes evaluation.
3. **Tests:**
   - `stage-3d.test.ts` updated: the stage list equals the new ordered list, `stage-3d` is still imported only by `boot-3d.ts`, and every `three-stage-*` module re-exports only names that `three-surface.ts` also exports (R6);
   - `boot-3d.test.ts`: yields between all stages.
4. **Chunk check:** the `bundle:manifest` chunk map shows the stage chunks as separate files. Turbopack may merge them or hoist shared modules; if so, the lever is reworked or reverted on that evidence.

### L4 — Post-hydration sequencing (T011, conditional)

- **Runs only if** the AC1 or T010 traces show an eager task starting within the same frame as a hydration task, or the AC2 harness ties a dropped frame or long task to that overlap.
- **Change:** `load` → `waitForIdle` → `waitForIdle` (a second idle period) before the boot. There is no timer literal.
- **Test:** `interaction-gate.test.ts` gains a two-idle case. AC5 timing is re-measured locally (the probe at 4× informational).

### L5 — Hydration islands (T012, conditional)

- **Runs only if** AC1 attributes an app-component hydration task above 12.5 ms observed on the slow attempt.
- **Scope:** the island is named at G1/G2, and its files are added to `app-touch.txt` with a §9 note.
- **Otherwise** it is skipped with evidence.

## Bytes (RFC D8; SR4.1)

`bundle-scopes.mjs` (copied from staged-canvas-mount) gains `--budget`:

```
node $F/bundle-scopes.mjs --budget <before-manifest> <before-out> <after-manifest> <after-out>
```

- **Scopes:** home initial, project initial, total (and non-initial 3D, informational).
- **Pass:** each initial gzip Δ ≤ 2,000 B, and total raw and gzip Δ ≤ 1 % of before. Exit 1 on a breach.
- **Baseline outputs:** built from `7833b28` (gated + eager) once in T001 into `/tmp/s117-checks/base-{gated,eager}`, plus the manifests committed as evidence. On the runner, the AC1 attempt's manifests are the binding baseline.

## Data flow

```
apps/web/out (gated | eager) ──serve:out──> Chromium (mobile UA/screen)
  Lighthouse simulate ×2×3 per route ───────────────> summaries ─> eager-verdict (default | --rule s11.7) ─> AC3
  Lighthouse --profile ─> trace + V8 samples ─> perf:attribution (+ manifest) ─> per-task table, Lantern check ─> AC1
  perf:startup --engage none --cpu-profile ─────────> fallback attribution (R2)
  fps:engine --scenario load (4×, trace-only | recorder) ─> long tasks, dropped frames ─> AC2
  eager:probe (native, normal | reduce) ────────────> deadline checks ─> AC5
  perf:host ─> host-meta.json (qualification, GL backend) ─> D1
bundle:manifest + bundle-scopes --budget ─> AC4
perf:parity · site:probe (draws, hero) · engine:probe · axe · guards.sh · CI ─> AC7 / non-goals
```

## Test map

| Check | Where | FR |
|---|---|---|
| default Lighthouse path byte-identical; `--profile` keeps the trace; profiled summaries refused by aggregation | `tools/perf/test/lighthouse.test.ts` | FR1 |
| long-task ↔ observed-task matching (± 25 %), function/module attribution, hypothesis tags, Lantern sum | `tools/perf/test/attribution.test.ts` (synthetic trace + LHR fixtures) | FR1 |
| `--engage none` window and t0; move/click unchanged | `tools/perf/test/startup.test.ts` | FR1 |
| load scenario window, intersecting tasks, `preLoadTasks`, `trace-only` count, recorder marked non-gated, unmounted run invalid; existing scenario tests unmodified | `tools/perf/test/fps-engine-load.test.ts` (+ unmodified `fps-engine*.test.ts`) | FR2 |
| probe: no input APIs in source, deadline evaluation, reduced-motion evaluation, non-blank detection | `tools/perf/test/eager-probe.test.ts` | FR5 |
| qualification, rule (a)/(b), first-two-attempts verdict, distinct runners; default output golden | `tools/perf/test/eager-verdict.test.ts` | FR3 |
| host meta parsing + sanitising | `tools/perf/test/host-meta.test.ts` | FR1 |
| eager workbench guards | `apps/web/test/eager-guards.test.tsx`, `eager-flag.test.ts` | FR5 |
| reveal/portal render counts, behaviour unchanged | `apps/web/test/eager-render-lanes.test.tsx` | FR2, FR7 |
| staged portals vs reveal | `apps/web/test/eager-staged-portals.test.tsx` | FR2, FR7 |
| stage list, yields | `apps/web/test/stage-3d.test.ts`, `boot-3d.test.ts` | FR2 |
| budget mode | T001 self-check (`--budget` A vs A = 0 Δ) | FR4 |
| no motion literals, no colour literals, prod imports | existing app tests, unchanged | FR7 |

## Phase groups (Stage 3 STOP points)

- **G1 baselines:** T001–T006 → STOP. Guards, harness, workflow, then the **AC1 baseline** on one slow-class attempt. Murphy reviews the attribution, the GL backend and the lever order (plus any exception request).
- **G2 app-side levers:** T007–T013 → STOP. L0, L1, L2, L3, L4/L5 (conditional), each with an A/B, then the final local parity/draws/CLS/sequence/bytes.
- **G3 verdict:** T014 → STOP. Two slow-class attempts on the final state, with AC2/AC3/AC5 on both and the AC6 branch.
- **G4 CI/surfaces:** T015 (+ T015b only on "retire") → STOP (end-contract).

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| A new workflow instead of extending `eager-3d.yml` | AC7 retains `eager-3d.yml` as the D-19 reference. Editing it would change the reference protocol mid-decision. |
| A 3-shard matrix | Slow hosts arrive at random (≈ 1 in 2–3 attempts in S11.5/S11.6). Three VMs per run cut the reruns and so the wall-clock time. |
| Profiled Lighthouse **and** a `perf:startup` cross-check | The profiled Lighthouse run scores the exact tasks. The profiler category is disabled upstream (R2), so a second source on the same attempt keeps AC1 from depending on it. |
| `trace-only` as a new mode instead of editing `startup` | S11.6's `startup` scenario and its numbers stay reproducible. AC2 needs a named mode without the recorder. |
| A memoised element instead of `React.memo` on `TeardownViewer` | `TeardownViewer` is in S8 (frozen). The app can only control what it re-renders. |
| `app-touch.txt` allowlist | It makes "app-side, small surface" checkable, and catches drift into theme, tour or panel files (non-goals). |
