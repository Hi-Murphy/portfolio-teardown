# Implementation Plan: S11.6 Staged Canvas Mount

**Feature dir:** `.specify/features/staged-canvas-mount/` · **Branch:** `task/s11.6-staged-canvas-mount` · **Date:** 2026-11-03 · **Inputs:** `spec.md`, `rfc.md` (approved at Gate 1: all §7 defaults; refinements R1–R9 in §9)

## Summary

Measurement comes first, and the first deliverables touch no product code:

- guards and a bytes-per-scope helper;
- three additive diagnostics in `tools/perf`: the dropped-frame timeline, CPU-profile attribution, and the ready/reveal sequence;
- then the **AC1 re-baseline** of S11.5's final state, committed before any `packages/xploder/src` commit.

Levers then land one per commit, each with an A/B on all three paths. Every kept lever that touches a sealed file is followed by its re-seal commit.

- **L1:** an async `gl` factory in `TeardownViewer.tsx` (S8) builds the renderer in its own idle slice.
- **L4:** one more yield in the same factory, so R3F's configuration (camera, `setPixelRatio`/`setSize`) runs in its own task.
- **L2** (conditional): `Scene.tsx` (S6) stages its first mount behind a `RenderHold`, with Stats last.
- **L3** (conditional): a cheaper `hasWebgl()` probe in `a11y/webgl.ts` (S8).

The eager re-run reuses S11.5's flag and the `eager-3d.yml` workflow on a draft PR, with Lighthouse long-task attribution added. The slice ends with a re-seal audit, CI green and the AC self-check.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3.1, Next 16.4.3 (Turbopack) static export, `three` 0.186.1, `@react-three/fiber` 9.8.2, Node 24, pnpm 12 |
| Measurement | S11.5 protocol: Playwright Chromium 156 headless (ANGLE Metal on this host), `PROFILES.mobile`, CDP 4× CPU, local export via `serveDir`, 2 runs, median = mean of 2 |
| New deps | **none** |
| Tests | vitest: `tools/perf/test/*` (new + additive cases), `packages/xploder/test/staged-mount.test.tsx` (**new** file, outside every manifest), the existing sealed scene tests **unmodified** |
| Budgets | `tools/perf/src/budgets.ts` unchanged. AC5's 200 ms is a verdict rule, not a gate |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`. S2/S5/S7 entirely. S4/S6/S8 except `approved-xploder-src.txt`. The sealed test files of every surface. `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`. The S8 perf tools. `ci.yml`, `perf.yml` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR6 quote AC1–AC6 verbatim. The levers are exactly the brief's four. Non-goals hold: no redesign, no first-frame/reveal change, no theme/behaviour/content/a11y/tour change, no version bump, no client library, no budget change. |
| II. Static-only | Unchanged. |
| III. Performance is a feature | The slice's purpose. Bytes may not grow in any scope (AC3). |
| IV. Single motion source | Yields use `requestIdleCallback` / `scheduler.yield()` / `MessageChannel` with **no numeric timeout**. `no-motion-literals` scans `packages/xploder/src`, so the touched files stay clean. Harness constants live in `tools/perf`. |
| V. Theme integrity | No palette code is touched. Parity is checked in light + dark. |
| VI. Evidence over assertion | Every number has an artifact. Re-baseline-before-change is enforced by `REBASELINE-FIRST-OK`. |
| VII. No secrets | Evidence holds `127.0.0.1` and public URLs only. Profiles and traces are sanitized (no `file://` paths) by the existing harness path. `gitleaks dir` runs on new prose and evidence before each commit. |

## Project Structure

### Documentation (this feature)

```
.specify/features/staged-canvas-mount/
  rfc.md · spec.md · plan.md · tasks.md
  guards.sh · approved-xploder-src.txt · s2.paths · s4.paths (copied from engine-startup)
  bundle-scopes.mjs                  four-scope raw + gzip byte table (node zlib level 9, per file)
  evidence/   RFC-log-static-read.txt + T<NNN>-* per EVIDENCE.md
```

### Source code (changes only)

```
tools/perf/
  src/cli/fps-engine.ts             EDIT startup scenario only: + droppedFrameTimes, tasksOver16ms (explode/tour byte-identical)
  src/fps.ts                        EDIT additive export: droppedFrameTimesFromTrace(events, t0) (existing exports unchanged)
  src/startup-attribution.ts        EDIT attributed runs only: + first instanced draw {t, raf}, ready {t, raf}, live-state transitions
  src/startup.ts                    EDIT additive: sequence block in StartupReport (null in clean runs)
  src/cpu-profile.ts                NEW  pure: CDP Profile + task list → CpuProfileSummary
  src/cli/startup-profile.ts        EDIT + --cpu-profile (third run kind "profiled", never mixed into totals)
  src/lighthouse.ts                 EDIT (T010) summary runs[] + longTasks (from the LHR long-tasks audit), additive
  src/cli/eager-verdict.ts          EDIT (T010) prints the top long tasks per route/build
  test/fps-engine-startup.test.ts · startup.test.ts · lighthouse.test.ts · eager-verdict.test.ts   EDIT additive cases
  test/cpu-profile.test.ts          NEW
packages/xploder/src/react/TeardownViewer.tsx   EDIT (L1, L4; L2 wiring) S8, approved per task
packages/xploder/src/react/scene/Scene.tsx      EDIT (L2 only, conditional) S6
packages/xploder/src/react/a11y/webgl.ts        EDIT (L3 only, conditional) S8
packages/xploder/test/staged-mount.test.tsx     NEW
packages/xploder/test/frozen-surface.generate-s8.sh · frozen-surface.s8.manifest.json   EDIT (S8 re-seal)
packages/xploder/test/frozen-surface.generate-s6.sh · frozen-surface.s6.manifest.json   EDIT (S6 re-seal, only with L2)
packages/xploder/test/frozen-surface.test.ts                                           EDIT (pinned base/note only)
```

`Slabs.tsx` and `Stats.tsx` are **not** planned to change (RFC Q7). If a task finds it must touch one, it STOPs and asks. Stats is an S4 re-seal with S2-identity proof.

## Guards (every task)

`guards.sh` (T001) prints one line per guard and exits 1 on any failure.

```sh
B=05e4e16                                   # S11.6 freeze = slice code base (product = 66a021f)
F=.specify/features/staged-canvas-mount
approved() { grep -v '^#' $F/approved-xploder-src.txt | sed '/^$/d'; }
excl()     { approved | sed 's#^#:(exclude)#'; }      # git pathspec excludes for approved files

guard FROZEN-OK           git diff --quiet $B -- .specify/slices .specify/KICKOFF-S11.6.md .specify/content
guard BRIEF-HISTORY-OK    test -z "$(git log --oneline $B..HEAD -- .specify/slices .specify/KICKOFF-S11.6.md .specify/content)"
guard XPLODER-SRC-OK      test "$(git diff --name-only $B -- packages/xploder/src packages/xploder/package.json | sort)" = "$(approved | sort)"
guard SURFACE-S2-OK       git diff --quiet $B -- $(xpf s2.paths)
guard SURFACE-S4-OK       git diff --quiet $B -- $(xpf s4.paths) $(excl)
guard SURFACE-S5-OK       git diff --quiet f31600e -- $(xp frozen-surface.s5.paths)
guard SURFACE-S6-OK       git diff --quiet $B -- $(xp frozen-surface.s6.paths) $(excl)
guard SURFACE-S7-OK       git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK       git diff --quiet $B -- $(xp frozen-surface.s8.paths) $(excl)
guard SEALED-TESTS-OK     git diff --quiet $B -- $(xp-tests-of-all-manifests)       # sealed test files never change (R1)
guard RESEAL-NOTE-OK      every approved file appears in its surface generator's note with "S11.6"
guard REBASELINE-FIRST-OK first=$(git log --reverse --format=%H $B..HEAD -- packages/xploder/src | head -1);
                          test -z "$first" || git merge-base --is-ancestor \
                            "$(git log --format=%H --diff-filter=A -1 -- $F/evidence/T004-log-rebaseline.md)" "$first"
guard DEV-ROUTES-OK       git diff --quiet $B -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard S8-TOOLS-OK         git diff --quiet $B -- tools/perf/src/{a11y-axe,a11y-probe,engine-probe,panel-probe,presentation-snapshot}.ts \
                            tools/perf/src/cli/{a11y-axe,a11y-probe,engine-probe}.ts
guard CI-JOBS-OK          git diff --quiet $B -- .github/workflows/ci.yml .github/workflows/perf.yml .github/workflows/eager-3d.yml
guard VERSIONS-OK         test "$(git diff $B -- pnpm-lock.yaml | grep -cE '^[+-] +(three|@react-three/fiber|react|react-dom|next)@')" = 0
guard GITLEAKS-OK         gitleaks git --no-banner --log-opts="$B..HEAD" . && gitleaks dir --no-banner $F
```

- `xp`/`xpf` map manifest-relative and feature-dir lists to repo paths, as in S11.5.
- `SURFACE-S4/S6/S8-OK` compare against `B`. The manifests themselves pin every hash in `frozen-surface.test.ts`, so the guard only has to prove that *nothing but the approved files* moved in this slice.
- `SEALED-TESTS-OK` covers every `test/*` entry of all five `*.paths` files. It covers `scene.test.tsx` (S4); `view-scroll`, `pick-scene`, `emphasis-scene` (S5); `blueprint-scene`, `overlay-projector` (S6); and the S8 `a11y-*` tests. `frozen-surface.test.ts` and the manifests/generators are not in any `*.paths` file, so the re-seal can update them.
- `REBASELINE-FIRST-OK` holds trivially until the first xploder commit, then proves ancestry.

## Diagnostics (RFC D2; SR1.2)

### Dropped-frame timeline (`fps-engine --scenario startup`)

- `fps.ts` gains `droppedFrameTimesFromTrace(events, t0Us)`. It returns the `DroppedFrame` event timestamps in ms from t0, using the same event filter `measureFps` already counts with, so the count always equals `droppedFrames`. A test pins that invariant.
- The startup report adds `droppedFrameTimes: number[]` and `tasksOver16ms: { start, dur }[]`. The second list comes from the same top-level task list as `longTasksFromTrace`, with a 16.7 ms threshold.
- The `explode`/`tour` outputs, the verdict functions and the existing tests stay unchanged. `fps-engine.test.ts` must pass **unmodified**.

### CPU-profile attribution (`perf:startup --cpu-profile`)

- **Run kind `profiled`**, never mixed into totals.
- **Capture:** the run starts with `Profiler.enable`, `Profiler.setSamplingInterval({ interval: 100 })` and `Profiler.start`, immediately before engagement. It ends with `Profiler.stop` at t0 + 5 s.
- **`cpu-profile.ts` (pure):** for every main-thread top-level task above 16.7 ms in [t0, t0 + 5 s] (from the same trace), it computes:
  - self time by script URL (chunk file name);
  - the top 8 functions (name + chunk);
  - each as ms and %.
- **Output:** `cpuprofile-summary-<label>-<engage>-r<N>.json`, plus the gzipped `.cpuprofile` with `--keep-trace`.
- **Chunk → stage mapping:** `bundle:manifest` (initial chunks per route) plus the load order of the 3D stage chunks. It is written into the T004 log, as in S11.5 T010.

### Ready/reveal sequence (attributed runs; AC4)

- **`startup-attribution.ts`:** the existing rAF wrapper already counts frames.
  - The init script records a monotonically increasing `raf` index, `t` at the first `drawElementsInstanced` (with its `raf`), and `t`/`raf` when `data-xploder-ready` flips.
  - A MutationObserver on `data-site-live-state` (hero and workbench share the attribute) logs every value change with `t`/`raf`.
- **`startup.ts`:** adds `sequence: { firstInstancedDraw, ready, liveStates[] } | null` to the report.
- **The AC4 check:** a feature-dir one-liner in T004/T009 asserts, per attributed run:
  1. `ready.raf === firstInstancedDraw.raf`;
  2. no instanced draw has `raf < ready.raf`;
  3. the `liveStates` value list equals the re-baseline's for the same path.

## Levers (RFC D3; SR2.1)

### Shared yield helpers (inline in `TeardownViewer.tsx`, no new file or export from the package)

```ts
type SchedulingWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  scheduler?: { yield?: () => Promise<void> };
};

function nextTask(): Promise<void> {                 // scheduler.yield → MessageChannel; no timer literal
  const scheduler = (window as SchedulingWindow).scheduler;
  if (typeof scheduler?.yield === 'function') return scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
    channel.port2.postMessage(null);
  });
}

function idleSlice(): Promise<void> {                // requestIdleCallback without a timeout, else nextTask
  const idle = (window as SchedulingWindow).requestIdleCallback;
  return typeof idle === 'function' ? new Promise((resolve) => { idle(() => resolve()); }) : nextTask();
}
```

### L1 — Renderer in its own slice (T005; `TeardownViewer.tsx`, S8)

```tsx
export async function createStagedRenderer(defaults: StagedRendererDefaults): Promise<WebGLRenderer> {
  await idleSlice();
  return new WebGLRenderer({ ...defaults, antialias: true, alpha: true });
}
…
<Canvas orthographic frameloop="demand" dpr={[1, 2]} gl={createStagedRenderer} style={CANVAS_STYLE} fallback={webglFallback}>
```

- **Constructor arguments are unchanged.** `defaults` is R3F's `{ canvas, powerPreference: 'high-performance', antialias: true, alpha: true }`, and the explicit `antialias`/`alpha` keep today's object literal visible in the source.
- **Module-level and stable:** R3F's `changed('gl')` never re-fires, and StrictMode builds no second renderer.
- **Exports:** `createStagedRenderer` is exported from the **module** for tests only. `src/react/index.ts` is unchanged, so it is not a package export (R2).
- **Errors:** a rejection reaches R3F's `.catch(setError)` and rethrows into `CanvasBoundary`, the same path as today's synchronous throw.
- **`staged-mount.test.tsx` (L1 part):**
  1. the factory resolves to a `WebGLRenderer` built with exactly `{ canvas, powerPreference, antialias: true, alpha: true }` (constructor spy);
  2. construction happens only after the idle callback fires (fake `requestIdleCallback`);
  3. the fallback to `nextTask` works without `requestIdleCallback`;
  4. a rejection reaches the error boundary;
  5. `TeardownViewer`'s source passes `gl={createStagedRenderer}`.

  The R3F wiring itself is proven in the browser by the A/B, parity and draw-call checks.

### L4 — Configuration split from construction (T006; same file)

```tsx
  const renderer = new WebGLRenderer({ ...defaults, antialias: true, alpha: true });
  await nextTask();          // R3F's apply (camera, scene, setPixelRatio/setSize) runs in the next task
  return renderer;
```

- The scene mount is already a later task: the Canvas re-renders after `useGate` settles.
- The A/B shows the task split in `tasksOver16ms`.
- Test: after construction, the factory's promise is still pending until one more task.

### L2 — First-frame-only staged scene mount (T007, conditional; `Scene.tsx` S6 + wiring in `TeardownViewer.tsx`)

- **Runs only if** the T006 state still shows a scene-mount task above 50 ms, a dropped frame tied to it, or a slice above the ≈ 27 ms design target that the timeline ties to a frame (RFC D5 stop rule). Otherwise it is skipped with the evidence.
- **R1/R3:** `SceneProps` gains an optional, internal `stage?: () => Promise<void>`. `Scene` is not a package export.
  - **Absent** (every sealed test): today's synchronous mount, byte-for-byte the same element tree.
  - **Present:** `TeardownViewer` passes `stage={nextTask}`, and the mount proceeds in steps:

```tsx
const [step, setStep] = useState(stage === undefined ? LAST_STEP : 0);
useEffect(() => {
  if (stage === undefined || step >= STATS_STEP) return;   // STATS_STEP → LAST_STEP is driven by the first onStats
  let live = true;
  void stage().then(() => { if (live) setStep((current) => current + 1); });
  return () => { live = false; };
}, [stage, step]);
…
{step < STATS_STEP ? <RenderHold /> : <Stats layout={layout} onStats={onStats} />}   // RenderHold = useFrame(noop, 1)
```

- **Step groups** come from the T004 profile; there is at least one yield between the heavy members. The constraints:
  - Slabs, CameraRig and Lights are in step 0.
  - The emphasis hook stays unconditional: hooks can't be staged, and it is state only.
  - ViewScroll and OverlayProjector each mount before `STATS_STEP`.
  - Stats is mounted at `STATS_STEP`, together with one `invalidate()` (S11.5 C1: Stats alone requests no frame), so the first content frame waits for every first-frame contributor.
  - PickBridge is mounted at `LAST_STEP`. `Scene` wraps `onStats`, and the **first** stats callback (= the first content frame) schedules `stage()` → `LAST_STEP`. So PickBridge provably mounts after that frame.
- **`staged-mount.test.tsx` (L2 part, test renderer with an injected controllable `stage`):**
  1. no `gl.render` / no `onStats` before `STATS_STEP`;
  2. the first `onStats` reports `drawCalls 2` and the same stats as the unstaged scene;
  3. the camera view offset and the overlay events on the first rendered frame equal the unstaged scene's;
  4. PickBridge's `bridge.camera` is null until after the first frame;
  5. without `stage`, the element tree and first-frame stats equal today's.

### L3 — Cheaper probe (T008, conditional; `a11y/webgl.ts`, S8)

- **Runs only if** the T004/T006 profile puts `hasWebgl()` in a task above 50 ms or next to a dropped frame.
- **Change:** the canvas is 1×1, and `getContext('webgl2', PROBE_ATTRIBUTES) ?? getContext('webgl', PROBE_ATTRIBUTES)` uses `{ antialias: false, depth: false, stencil: false }`. Everything else stays: the same cache, the same `loseContext()`, the same boolean.
- **Test:** a new case in `staged-mount.test.tsx`: the null → false and throw → false paths, plus the cache.

## Bytes (RFC D6; SR3.1)

`bundle-scopes.mjs <manifest.json> <out-dir> [<manifest.json> <out-dir>]` reads a `bundle:manifest --write` output and computes four scopes:

- **home initial:** the scripts of `/` in the manifest;
- **project initial:** the scripts of `/projects/websocket-inspector`;
- **total:** every `.js` under `_next/static`;
- **non-initial 3D:** total minus the union of all routes' initial scripts.

For each scope it reports `files`, `raw` and `gzip` (node `zlib.gzipSync` level 9 per file, summed: S11.5's corrected method). Given two `<manifest> <out-dir>` pairs (before, after), it prints the delta table and exits 1 if any scope grows in raw **or** gzip. `--diff` stays informational only (S11.5 D-P1: it flags hash renames).

## Eager re-run (RFC D7; SR5.1)

- **T010:**
  - `lighthouse.ts`: each summary run gains `longTasks: { url, startMs, durMs }[]` from the LHR `long-tasks` audit details (simulated durations under `throttling: simulate`). The field is additive, so `perf.yml` consumers are unaffected.
  - `eager-verdict` prints the five longest per build/route.
  - Then `pnpm build:eager` + local `perf:lighthouse` ×2 per route, published alongside.
- **T011:**
  - push the branch and open a **draft PR**: `eager-3d.yml` runs on `pull_request`. The workflow file is untouched (`CI-JOBS-OK`);
  - a second run comes from `gh run rerun <id>`;
  - both artifacts are downloaded, and the verdict is written per AC5's rule on both runs.

## Re-seal (RFC D8; SR6.1)

A lever task that keeps a lever on a sealed file makes **two commits**:

1. **`S11.6/TNNN: <lever>`:** the source change + tests; `approved-xploder-src.txt` gains the file.
2. **`S11.6/TNNN: re-seal <surface> at <lever-sha>`:**
   - `generate-s8.sh` (or `-s6.sh`): `base=<lever short sha>`; the note keeps its existing text and appends "Re-sealed in S11.6 at `<sha>`: `<file>` — `<reason>`; see `.specify/features/staged-canvas-mount/evidence/TNNN-*`.";
   - run the script;
   - the manifest diff must be `base`, `note` and the touched file's hash only (logged);
   - `frozen-surface.test.ts` updates the pinned `base`/`note` of that surface only.

A second lever on the same file re-seals again at the new sha, with a cumulative note. A reverted lever reverts both commits. T012 audits the final manifests against `B`: only approved-file hashes differ; `base`/`note` name S11.6; S2/S4/S5/S7 manifests are byte-identical.

## Data flow

```
apps/web/out ──serveDir──> Chromium (mobile, 4× CPU, init script) ── engage (move|click)
   hero-live / workbench ─> staged module eval (S11.5) ─> TeardownViewer ─> <Canvas gl={createStagedRenderer}>
      idle slice: new WebGLRenderer (L1) │ next task: R3F apply + setSize (L4) │ next task: scene mount (L2 steps)
      rAF: Stats renders → data-xploder-ready → reveal
trace + cpuprofile + sequence ─> startup.ts / cpu-profile.ts / fps-engine startup ─> T0xx JSON + logs (AC1, AC2, AC4)
perf:parity · site:probe draws · engine:probe · bundle-scopes.mjs ─> AC3
build:eager ─> eager-3d.yml (runner ×2) + local ─> eager-verdict + longTasks ─> AC5
guards.sh · frozen-surface.test.ts · CI ─> AC6
```

## Test map

| Check | Where | FR |
|---|---|---|
| dropped-frame times count = `droppedFrames`; `tasksOver16ms` threshold; explode/tour unchanged | `tools/perf/test/fps-engine-startup.test.ts` (+ unmodified `fps-engine.test.ts`) | FR1, FR2 |
| profile → per-task self time by chunk/function on a synthetic profile; tasks ≤ 16.7 ms excluded | `tools/perf/test/cpu-profile.test.ts` | FR1 |
| sequence capture (fake GL + MutationObserver in jsdom); `sequence` null in clean runs | `tools/perf/test/startup.test.ts` | FR4 |
| long-task list in summary; verdict printing | `tools/perf/test/lighthouse.test.ts`, `eager-verdict.test.ts` | FR5 |
| factory args, idle slice, fallback, rejection, configure-in-next-task (L4) | `packages/xploder/test/staged-mount.test.tsx` | FR2, FR3 |
| staged scene: no render before Stats step, first-frame equality, PickBridge after, no-`stage` = today | `packages/xploder/test/staged-mount.test.tsx` | FR3, FR4 |
| sealed scene/a11y tests pass unmodified | existing files + `SEALED-TESTS-OK` | FR3, FR6 |
| manifests + pinned notes | `frozen-surface.test.ts` + `guards.sh` | FR6 |
| no motion literals in touched xploder files | `apps/web/test/no-motion-literals.test.ts` (unchanged) | FR3 |

## Phase groups (Stage 3 STOP points)

- **G1 re-baseline:** T001–T004 → STOP. Guards, diagnostics, and the **AC1 re-baseline**. Murphy reviews the numbers and the confirmed lever order.
- **G2 staging levers:** T005–T009 → STOP. L1, L4, L2/L3 (conditional), each with A/B + re-seal, then the final AC2/AC3/AC4 measurements and the before/after table.
- **G3 eager re-run:** T010–T011 → STOP. Attribution, local eager, draft PR, two runner runs, verdict.
- **G4 re-seal/CI:** T012 → STOP (end-contract). Re-seal audit, guards, CI green, AC1–AC6 self-check.

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| Async `gl` factory instead of a pre-built renderer instance | An instance needs a canvas before R3F creates its own. The factory receives R3F's canvas and lets R3F keep owning the renderer's lifetime. |
| `stage` prop on the internal `Scene` instead of always staging | The sealed S4/S5/S6 scene tests render `<Scene>` and expect a frame after `advanceFrames(1)`. Opt-in staging keeps them unmodified (S5 must stay empty). |
| `RenderHold` instead of editing `Stats` | Stats (S4) owns the render. Holding R3F's own render from `Scene` (S6) avoids an S4 re-seal (S11.5 C1 design). |
| Yield helpers duplicated from `apps/web/components/boot-3d.ts` | xploder cannot import app code, and no new xploder file or export is allowed. About 15 lines. |
| A third run kind for CPU profiles | Sampling adds overhead, so totals stay clean-run only. |
| Lever + re-seal commit pairs | `frozen-surface.test.ts` would otherwise be red between commits, and every commit's suite must pass. |
