# Implementation Plan: S11.5 Engine Startup Performance

**Feature dir:** `.specify/features/engine-startup/` · **Branch:** `task/s11.5-engine-startup` · **Date:** 2026-11-03 · **Inputs:** `spec.md`, `rfc.md` (approved; §9 Gate 1: all defaults + refinements R1–R8, correction C1)

## Summary

The slice proceeds measurement first. The first deliverable is a **harness, with no product change**. `pnpm perf:startup` is a phase model built from Chromium trace events plus GL-call spans recorded by an init script. `fps-engine` gains a `startup` scenario on the production export, and a parity tool captures and compares 8 rest-state shots. The **AC1 baseline** (profile, traces, plus the AC2/AC4/AC6 references) is committed before any lever.

Levers then land **one per commit, each with an A/B**:

- **L2** precompiled material: S6 `Scene.tsx` only, then the S6 re-seal.
- **L4** import trimming: an app-level `three` alias.
- **L3** split init: app loaders.
- **L1** idle warm and **L5** overlay-model cache: conditional, only if the numbers justify them.

The order is provisional until the baseline numbers exist. A before/after table and a leave-one-out run prove AC3/AC5.

The eager-hydration experiment is a build-time flag in `interaction-gate.ts`. It is measured locally and by a measurement-only CI workflow on the runner. The slice ends with guards, re-seal proof, CI green and the AC self-check.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16.4.3 (Turbopack) static export, `three` 0.186.1, `@react-three/fiber` 9.8.2, Node 24, pnpm 12 |
| Measurement | Playwright Chromium (pinned, headless/SwiftShader), `PROFILES.mobile` + CDP `Emulation.setCPUThrottlingRate(4)`, local export via `serveDir`, 2 runs per measurement, median |
| New deps | **none** (PNG decode via `node:zlib`; trace types from `tools/perf/src/fps.ts`) |
| Tests | vitest: `tools/perf/test/*`, `apps/web/test/*`, `packages/xploder/test/*` (new files only, plus the re-seal expectations in `frozen-surface.test.ts`) |
| Budgets | `tools/perf/src/budgets.ts`, unchanged. AC6 TBT reference ≤ 200 ms is recorded in evidence, not added as a gate |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; S2, S5, S7 and S8 manifest paths; S4 paths (no S4 touch planned); S6 paths except the approved `src/react/scene/Scene.tsx`; `apps/web/app/dev/**`, `apps/web/app/fixtures/**`; the S8 perf tools; `perf.yml` and `ci.yml` jobs (byte-identical) |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim, and the SRs map to Deliverables 1–5. Non-goals are respected: no redesign, no theme/behaviour/content change, no `three` bump, no client library, no budget change. |
| II. Static-only | Unchanged: static export. The eager flag is build-time. |
| III. Performance is a feature | This is the slice's purpose. The bundle may only shrink (AC4), and Lighthouse ≥ 95 stays gated. |
| IV. Single motion source | L1/L3 use scheduling primitives (`requestIdleCallback`, `scheduler.yield`, `startTransition`) with no duration literals. `no-motion-literals` keeps scanning the touched app files. The harness's 2 s quiet/5 s window values live in `tools/perf`, outside the scanned roots, as named constants. |
| V. Theme integrity | No palette or theme code is touched. Parity is checked in light + dark. |
| VI. Evidence over assertion | Every number has an artifact (RFC §3/§7). Baseline before levers is enforced by commit order. |
| VII. No secrets | Evidence holds only `127.0.0.1` and public URLs. Traces are sanitized: the harness strips `file://` paths and env-derived strings before writing. `gitleaks dir` runs on new prose before each commit. |

## Project Structure

### Documentation (this feature)

```
.specify/features/engine-startup/
  rfc.md · spec.md · plan.md · tasks.md · guards.sh
  s2.paths · s4.paths · approved-xploder-src.txt
  evidence/   RFC-log-static-read.txt + T<NNN>-* per EVIDENCE.md
```

### Source code (changes only)

```
tools/perf/
  src/startup.ts                    NEW  pure: trace events + GL spans → StartupReport (phases, cost, long tasks, blocking, CLS)
  src/startup-attribution.ts        NEW  init-script source (string) for GL wrappers + ready MutationObserver + layout-shift buffer
  src/cli/startup-profile.ts        NEW  pnpm perf:startup (browser driving, throttle, engage, runs, outputs)
  src/png.ts                        NEW  PNG decode (zlib inflate + unfilter) → RGBA; compareRgba(a, b) → differingPixels
  src/cli/parity.ts                 NEW  pnpm perf:parity --write <dir> | --compare <dir>
  src/cli/fps-engine.ts             EDIT additive `startup` scenario (+ --route, --engage); explode/tour paths byte-for-byte equivalent
  test/startup.test.ts · test/png.test.ts · test/parity.test.ts · test/fps-engine-startup.test.ts   NEW
  test/fixtures/startup-*.json      NEW  synthetic trace fixtures
package.json                        EDIT scripts perf:startup, perf:parity, build:eager
packages/xploder/src/react/scene/Scene.tsx   EDIT (L2 only, S6, approved) precompile gate
packages/xploder/test/scene-precompile.test.tsx  NEW
packages/xploder/test/frozen-surface.generate-s6.sh · frozen-surface.s6.manifest.json · frozen-surface.test.ts   EDIT (S6 re-seal only)
apps/web/build/three-surface.ts     NEW (L4 only) curated three namespace, outside scanner roots (R4)
apps/web/next.config.ts             EDIT (L4) turbopack.resolveAlias { three → ./build/three-surface.ts }
apps/web/components/interaction-gate.ts      EDIT (L3 yieldToMain; T015 waitForStartup)
apps/web/components/hero/hero-live.tsx       EDIT (L3 startTransition; T015 waitForStartup)
apps/web/components/workbench/workbench-loader.tsx   EDIT (L3 startTransition incl. click path; T015 waitForStartup)
apps/web/test/three-surface.test.ts · interaction-gate.test.ts   NEW
.github/workflows/eager-3d.yml      NEW  measurement-only, never red (R5)
```

## Guards (every task)

`.specify/features/engine-startup/guards.sh` (created in T001) prints one line per guard and exits 1 on any failure. The style is S10's `guard NAME cmd`.

```sh
B=92a8d24                                    # S11.5 brief freeze = slice code base
guard FROZEN-OK        git diff --quiet $B -- .specify/slices .specify/KICKOFF-S11.5.md .specify/content
guard BRIEF-HISTORY-OK test -z "$(git log --oneline $B..HEAD -- .specify/slices .specify/KICKOFF-S11.5.md .specify/content)"
guard XPLODER-SRC-OK   test "$(git diff --name-only $B -- packages/xploder/src packages/xploder/package.json | sort)" \
                          = "$(grep -v '^#' $F/approved-xploder-src.txt | sed '/^$/d' | sort)"
guard SURFACE-S2-OK    git diff --quiet $B -- $(xpf s2.paths)
guard SURFACE-S4-OK    git diff --quiet $S4BASE -- $(xpf s4.paths)        # S4BASE=$B (no S4 touch planned)
guard SURFACE-S5-OK    git diff --quiet f31600e -- $(xp frozen-surface.s5.paths)
guard SURFACE-S6-OK    git diff --quiet $S6BASE -- $(xp frozen-surface.s6.paths)   # f65b13c until T008, then the L2 re-seal SHA
guard SURFACE-S7-OK    git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK    git diff --quiet 99a94f2 -- $(xp frozen-surface.s8.paths)
guard DEV-ROUTES-OK    git diff --quiet $B -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard S8-TOOLS-OK      git diff --quiet $B -- tools/perf/src/{a11y-axe,a11y-probe,engine-probe,panel-probe,presentation-snapshot}.ts \
                          tools/perf/src/cli/{a11y-axe,a11y-probe,engine-probe}.ts
guard CI-JOBS-OK       git diff --quiet $B -- .github/workflows/ci.yml .github/workflows/perf.yml
guard VERSIONS-OK      test "$(git diff $B -- pnpm-lock.yaml | grep -cE '^[+-] +(three|@react-three/fiber|next)@')" = 0
guard GITLEAKS-OK      gitleaks git --no-banner --log-opts="$B..HEAD" . && gitleaks dir --no-banner .specify/features/engine-startup
```

`xp f` maps `packages/xploder/test/f` paths to the repo root, and `xpf f` maps the feature-dir list `f`. The ownership split was derived from each path's adding commit (RFC D9) and is the list in `s2.paths`/`s4.paths`.

- **`s2.paths`:** `package.json`, `src/index.ts`, `src/motion/index.ts`, `src/errors.ts`, `src/parse.ts`, `src/schema`, `src/theme`, `test/{fixtures.test.ts,generality.test.ts,geometry-free.test.ts,helpers.ts,motion.test.ts,parse.test.ts,registry.test.ts,schema.test.ts,smoke.test.ts,theme.test.ts}`, `test/fixtures/{project-a-ui-app,project-b-pipeline,tech-registry}.json`, `test/__snapshots__/generality.test.ts.snap`.
- **`s4.paths`:** `src/engine`, `src/layout`, `src/motion/ease.ts`, `src/react/env.ts`, `src/react/scene/{CameraRig,Lights,Stats}.tsx`, `src/react/usePalette.ts`, `src/react/useReducedMotion.ts`, `test/{camera,ease,env,explode,exports,layout}.test.ts`, `test/scene.test.tsx`, `test/__snapshots__/layout.test.ts.snap`.
- **Rule:** together they equal `frozen-surface.paths` exactly. T001 asserts this, so no path escapes both guards.

## Harness (RFC D1–D3; FR1, FR2, FR3)

### `startup.ts` (pure, unit-tested on fixtures)

**`analyzeStartup(events: TraceEvent[], spans: GlSpan[], marks: PageMarks): StartupReport`.**

- **Main thread:** the `CrRendererMain` thread of the page's renderer pid (pid resolution reuses `fps.ts`).
- **t0:** the harness's engagement timestamp, mapped into trace time through a `performance.mark('xp-perf:engage')` that the harness injects from `page.evaluate` immediately before dispatching. It is a harness-side mark, not product code.
- **t9:** the first `DrawFrame` after the first instanced draw span. Cross-checked against the init script's `ready` timestamp (`data-xploder-ready` MutationObserver).
- **Phases:**
  - P1: `ResourceSendRequest`/`ResourceFinish` for chunk URLs first requested after the page `load` event (the 3D chunk set).
  - P2: `v8.compile`/`v8.compileModule`/`V8.CompileCode` for those URLs.
  - P3: `EvaluateScript`/`v8.evaluateModule` + `FunctionCall` whose url is a 3D chunk, up to the dynamic-import resolution.
  - P4: the rest of main-thread time between P3's end and the first `getContext` span.
  - P5: `getContext` → first `createProgram`, minus P6/P7 spans.
  - P6: Σ `bufferData`/`bufferSubData`.
  - P7: Σ `compileShader`, `linkProgram`, and the first `getProgramParameter`/`getShaderParameter`/`getUniformLocation`/`getProgramInfoLog` per program.
  - P8: Σ `texImage2D`/`texStorage2D`/`texSubImage2D` (+ count), plus `Layout`/`UpdateLayoutTree` inside [P3 end, t9] reported as `domLayoutMs`.
  - P9: first draw span → t9.
  - `other` = the cost minus Σ attributed main-thread time (published, never hidden).
- **Cost:** Σ top-level `RunTask`/`ThreadControllerImpl::RunTask` durations on the main thread in [min(t0, first 3D request), t9 + 1000 ms].
- **Long tasks:** top-level tasks > 50 ms in [t0, t0 + 5000 ms]. **Blocking** = Σ (dur − 50).
- **CLS:** from the `layout-shift` buffer (no `hadRecentInput` filter applied; it is reported raw and with the filter).

### `startup-attribution.ts`

An init-script string. For `WebGLRenderingContext.prototype` and `WebGL2RenderingContext.prototype` it wraps: `compileShader`, `linkProgram`, `getProgramParameter`, `getShaderParameter`, `getUniformLocation`, `getProgramInfoLog`, `bufferData`, `bufferSubData`, `texImage2D`, `texStorage2D`, `texSubImage2D`, `drawArrays`, `drawElements`, `drawArraysInstanced`, `drawElementsInstanced`, `createProgram`. It also wraps `HTMLCanvasElement.prototype.getContext`.

Each wrapper pushes `{ name, start, dur }` to `window.__xpPerfSpans` and counts draws per rAF tick into `window.__xpPerfDraws`. Separately it records `getSupportedExtensions()` and the `UNMASKED_RENDERER_WEBGL` string. The GL wrappers are installed **only** with `--attribute`. The ready observer and the layout-shift observer are always installed: they are passive and measured as negligible (T003 records the overhead A/B).

### `cli/startup-profile.ts`

```
pnpm perf:startup [--serve <dir> | <url>] --route <path> [--engage move|click] [--runs 2] [--attribute]
                  [--cpu 4] [--out <dir>] [--keep-trace]
```

1. Launch, open a context with `PROFILES.mobile`, attach CDP, apply `setCPUThrottlingRate(cpu)`, and install the init script(s).
2. `goto` and wait for `load`, then `visibilityState === 'visible'`, then `QUIET_MS = 2000` with no network request.
3. Start tracing (D3 categories) and set the harness mark.
4. Engage:
   - `move`: `page.mouse.move` to the viewport centre, in 2 steps.
   - `click`: `locator('[data-site-control="explore-3d"]').click()`.
5. Wait for ready (timeout 30 s → exit 3 "no canvas"), wait `WINDOW_MS = 5000` from t0, stop tracing, read the spans and marks, then `analyzeStartup`.
6. Write `startup-<label>-<engage>-<kind>-r<N>.json` (`label` = `home` for `/`, `project` for `/projects/*`), `trace-….json.gz` (with `--keep-trace`) and `meta.json`.

`meta.json` holds the command, exit code, Chromium version, `benchmarkIndex` (computed with Lighthouse's `computeBenchmarkIndex` page snippet, via the `lighthouse` dependency already in `tools/perf`), the renderer, the extensions and the git SHA.

- **Medians:** `--runs 2` writes `summary.json` with per-field medians and both raw values, plus a `spreadPct` flag when the spread is > 20 %.
- **Exit codes:** the S3 contract (0/1/2/3/4). There is no gate exit 6: this is a measurement tool.

### `fps-engine --scenario startup` (SR2.1)

```
pnpm fps:engine --scenario startup --route <path> [--engage move|click] [--no-build] [--out dir]
```

- Builds `pnpm build` (not `build:fixtures`), unless `--no-build`.
- Serves `apps/web/out`.
- Opens the route under `PROFILES.mobile` + 4× CPU and waits for load + quiet.
- Calls `measureFps(page, { warmupMs: 0, durationMs: 5000, trigger: engage, keepTrace: true })`.
- Computes long tasks from the kept trace with `startup.ts`'s long-task function.

The report adds `route`, `engage`, `cpuThrottle`, `longTasks[]`, `maxLongTaskMs` and `verdict: { rule: 'startup', droppedFrames0, longTask50, pass }`. Liveness (60 fps band) does not apply, because the route is static after settle. That is stated in the report.

The `explode`/`tour` code paths, defaults, outputs and `evaluateVerdict` stay untouched. The existing `fps-engine.test.ts` must pass unmodified.

### Parity (`png.ts`, `cli/parity.ts`; SR4.1)

```
pnpm perf:parity --serve apps/web/out (--write <dir> | --compare <dir>) [--out <dir>]
```

- **Shots:** 2 routes × `PROFILES.mobile|desktop` × `colorScheme: light|dark`. No CPU throttle (it is visual).
- **Rest state, per shot:** engage (move), wait for ready, then wait for `data-xploder-state="exploded"` and `data-xploder-tweening="false"` on `[data-xploder-ready]`. Then wait for the hero/workbench reveal (`data-site-live-state="revealed"`) plus two rAFs, with the CSS caret hidden. Then take a viewport screenshot.
- **Output:** `--write` writes PNGs + `parity.json` (sha256 of the file and of the decoded RGBA). `--compare` decodes both and exits 6 if any shot has `differingPixels > 0`, writing a greyscale diff-mask PNG (encoded with `node:zlib`) and `parity-compare.json`.

## Levers (RFC D5, §9 R1–R4; FR3, FR5)

### L2 — Precompiled material (`Scene.tsx`, S6)

```tsx
function RenderHold() { useFrame(noop, 1); return null; }   // priority > 0: R3F skips its own render while mounted
…
const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene), camera = useThree((s) => s.camera);
const invalidate = useThree((s) => s.invalidate);
const parallel = useMemo(() => gl.extensions.get('KHR_parallel_shader_compile') !== null, [gl]);
const [compiled, setCompiled] = useState(!parallel);           // no extension → exactly today's path
useLayoutEffect(() => {                                         // runs after Slabs' layout effects (instanceColor/Fill set)
  if (compiled) return;
  let live = true;
  void gl.compileAsync(scene, camera).then(() => { if (live) { setCompiled(true); invalidate(); } });
  return () => { live = false; };
}, [camera, compiled, gl, invalidate, scene]);
…
{compiled ? <Stats layout={layout} onStats={onStats} /> : <RenderHold />}
```

- `Stats` (S4) stays byte-identical. It already renders at priority 1, so ready still means "first content frame" (§9 R1).
- The compile key must match the render key, so there is no second program. T007 asserts `createProgram` count = baseline and `linkProgram` count = baseline.
- Keyed per layout/slug. A slug change remounts `Slabs` but does not re-hold. The program is cached, so the next frame uses it, and a test pins this behaviour.
- If `compileAsync` rejects, `setCompiled(true)` runs (the sync path), and the rejection is not swallowed silently in dev (`console.error`).

### L4 — Import trimming (`apps/web/build/three-surface.ts`, `next.config.ts`)

- **Decision gate (spike first):** prove that `turbopack.resolveAlias: { three: './build/three-surface.ts' }` aliases the bare `three` specifier **without** catching `three/src/*` (which the shim itself imports). If Turbopack cannot express an exact match, L4 is **dropped** and recorded. No webpack switch, no patching of R3F.
- **Shim:** `export { … } from 'three/src/<path>.js'`, one line per member. The members are R3F core's 23 `THREE.*` references, the constructors for the JSX intrinsics used (`InstancedMesh`, `AmbientLight`, `DirectionalLight`), and every value import from `'three'` in `packages/xploder/src`. `REVISION` is also exported.
- **`apps/web/test/three-surface.test.ts`:**
  - (a) Parses R3F's dist `THREE\.(\w+)`, xploder `import { … } from 'three'` and JSX intrinsics, and asserts shim exports ⊇ that set.
  - (b) Asserts the shim is referenced only by `next.config.ts` (no other app/xploder import).
  - (c) After build, exactly one `REVISION` value string exists across `out/_next/static/chunks/*.js`. It is skipped if `out/` is absent, and the task check runs it after `pnpm build`.

### L3 — Split init (app)

- `interaction-gate.ts`: `export function yieldToMain(): Promise<void>`. It calls `scheduler.yield()` if present, else posts one message through a `MessageChannel` and resolves on receipt. That is a new task with no timer literal: `no-motion-literals`' `TIMER` rule rejects `setTimeout(…, <digit>)`, so `setTimeout(r, 0)` is not an option.
- `hero-live.tsx`: `const { HeroStage } = await import('./hero-stage'); await yieldToMain(); startTransition(() => setHeroStage(() => HeroStage));`
- `workbench-loader.tsx`: `start()` → `startTransition(() => setMounted(true))` on both paths. The click path keeps its `aria-busy` + label update **synchronous**, so the feedback is immediate.

### L1 — Idle warm (conditional: only if AC2 still fails after L3)

Staged `import()`s of the 3D modules, each in its own `waitForIdle` slice, after `load` + `QUIET`. They are triggered from the loaders' existing effect, and never inside a handler. Each slice must stay ≤ 50 ms on the 4× profile, as measured in T011, or L1 is rejected. The gated-build Lighthouse TBT on both routes must not exceed the T006 reference by more than the run spread.

### L5 — Overlay model cache (conditional: only if T006 shows the S6 overlay model ≥ 10 % of P4)

A per-layout `WeakMap` memo in `src/overlay/model.ts` or `BlueprintOverlay.tsx` (S6). It means a second approved file, an `approved-xploder-src.txt` update and a re-seal.

## Eager flag (RFC D7, §9 R5; FR6)

- `interaction-gate.ts`:
  - `const EAGER = process.env.NEXT_PUBLIC_EAGER_3D === '1';`
  - `export function waitForStartup(signal, shouldIgnore?): Promise<boolean>`: if EAGER, `waitForLoad(signal)` (readyState `complete` or `load`) → `waitForIdle`; else `waitForFirstInteraction(signal, shouldIgnore)` → `waitForIdle`.
- `hero-live.tsx` replaces its `waitForFirstInteraction` + `waitForIdle` pair with `waitForStartup`. The `load`/visible waits that precede it stay.
- `workbench-loader.tsx` does the same. The click path is unchanged.
- Root script `"build:eager": "NEXT_PUBLIC_EAGER_3D=1 pnpm --filter web build"`.
- **Flag-off proof:** a `bundle:manifest` diff vs the pre-T015 state shows initial JS ≤ before, and a grep finds no `EAGER`/`load`-gate code in the hero/workbench chunks.
- **`.github/workflows/eager-3d.yml`:**
  - `on: pull_request`, job `perf: eager-3d (measurement)`.
  - `pnpm build:eager` → `pnpm serve:out --port 4320 &` → `pnpm perf:lighthouse http://127.0.0.1:4320/` and `…/projects/websocket-inspector`, ×2 runs each (`|| true` per run; the exit code is recorded).
  - A summary step writes the medians + verdict to `$GITHUB_STEP_SUMMARY` and uploads `.evidence/ci/eager-3d/`.
  - It **never fails on a budget** (measurement only), it is not required, and `perf.yml`/`ci.yml` are untouched.

## Re-seal (RFC D9; FR7)

After L2 is kept (T008):

1. `frozen-surface.generate-s6.sh`: `base=<L2 commit short SHA>`, and the note gains "Re-sealed in S11.5 at `<sha>`: `src/react/scene/Scene.tsx` precompiles the blueprint material with `compileAsync` before the first content frame (S11.5 AC3/AC5; see `.specify/features/engine-startup/evidence/T007-*`)." The existing S10 sentence stays.
2. Run the script, and check that the manifest diff = `base`, `note`, and the `Scene.tsx` hash only.
3. `frozen-surface.test.ts`: update the S6 `base`/`note` expectations.
4. `guards.sh`: `S6BASE=<sha>`.
5. `approved-xploder-src.txt` already lists `packages/xploder/src/react/scene/Scene.tsx` (set in T007).

If L5 runs, the S6 re-seal is repeated at the L5 commit. If an S4 file is ever needed (not planned), the combined manifest is regenerated, and `T0xx-log-reseal.txt` must show only `s4.paths` hashes changing.

## Data flow

```
apps/web/out (production export) ──serveDir──> Chromium (mobile UA/screen, 4× CPU, init script)
   engage (move|click) ─┐                                   │ trace (devtools.timeline, v8, loading, frame)
                        ▼                                   ▼ GL spans, ready ts, layout shifts
                 hero-live / workbench-loader ──import()──> 3D chunk ──> TeardownViewer ─> Scene(L2) ─> Stats ─> ready
                                                            │
startup.ts analyzeStartup ──> startup-*.json / summary.json ──> T0xx-log-*.md tables (AC1, AC3, AC5)
fps-engine startup ──> fps-startup-*.json (AC2) · parity ──> parity*.json + PNGs (AC4) · bundle:manifest (AC4)
build:eager ──> perf:lighthouse (local) + eager-3d.yml (runner) ──> verdict (AC6)
```

## Test map

| Check | Where | FR |
|---|---|---|
| phase attribution, cost window, long tasks, blocking, CLS on synthetic traces (incl. a pre-engagement warm task counted in cost) | `tools/perf/test/startup.test.ts` | FR1, FR2, FR3 |
| init-script wrappers record spans and draws (jsdom + fake GL prototype) | `tools/perf/test/startup.test.ts` | FR1, FR4 |
| PNG decode (all 5 filter types, RGBA/RGB, 8-bit) + compare; negative control | `tools/perf/test/png.test.ts`, `parity.test.ts` | FR4 |
| `startup` scenario args/report/verdict; explode/tour unchanged | `tools/perf/test/fps-engine-startup.test.ts` + existing `fps-engine.test.ts` | FR2 |
| precompile gate: no extension → Stats on first frame (today); with extension stub → no render until resolve, then first stats `drawCalls 2`; rejection → sync path | `packages/xploder/test/scene-precompile.test.tsx` | FR4, FR5 |
| shim ⊇ R3F/xploder/JSX members; referenced only by `next.config.ts`; single `REVISION` | `apps/web/test/three-surface.test.ts` | FR4, FR5 |
| `yieldToMain`, `waitForStartup` eager/default with fake events and `requestIdleCallback` | `apps/web/test/interaction-gate.test.ts` | FR6 |
| no motion/colour literals in touched app files | existing scanners | FR4 |
| frozen surfaces + manifests | `packages/xploder/test/frozen-surface.test.ts` + `guards.sh` | FR7 |

## Phase groups (Stage 3 STOP points)

- **G1 baseline:** T001–T006 → STOP. Guards, the harness and the **AC1 baseline**. Murphy reviews the profile, and the lever order is confirmed from the numbers.
- **G2 levers:** T007–T014 → STOP. Levers with A/B, the S6 re-seal, the before/after + leave-one-out, and the final AC2/AC4 checks.
- **G3 eager experiment:** T015–T017 → STOP. Flag, local + runner Lighthouse, verdict. Needs a pushed branch + draft PR.
- **G4 re-seal/CI:** T018 → STOP (end-contract). Guards, manifest diffs, CI green, AC1–AC7 self-check.

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| GL-call spans from an init script instead of product instrumentation | Product marks would touch frozen S4/S6/S8 files before the baseline, and they would ship bytes. The init script measures the unchanged product. |
| Separate clean and attributed runs | Wrappers add overhead to every GL call. Totals and long tasks must come from unwrapped runs. |
| A `RenderHold` placeholder instead of editing `Stats.tsx` | `Stats` (S4) already owns rendering at priority 1. Holding the render from `Scene` (S6) keeps S4 untouched and the re-seal to one manifest. |
| An app-level `three` alias instead of patching R3F | R3F's `extend(THREE)` defeats tree-shaking. Patching a dependency is a supply-chain change, and the alias is a reversible build setting with a test. |
| A new measurement-only workflow instead of `workflow_dispatch` in `perf.yml` | `workflow_dispatch` works only for files on the default branch. A PR-triggered job that never fails keeps the required checks untouched. |
| PNG decoder in `node:zlib` | Avoids a dev dependency for a ~120-line decoder of Playwright's own 8-bit PNGs. |
