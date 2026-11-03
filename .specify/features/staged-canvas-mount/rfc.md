# RFC — S11.6 Staged Canvas Mount

**slice:** S11.6-staged-canvas-mount · **status:** APPROVED at Gate 1 (2026-11-03): all §7 defaults accepted; refinements R1–R9 recorded (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-11.6-staged-canvas-mount.md` (frozen brief v1) · **branch:** `task/s11.6-staged-canvas-mount` · **base:** `05e4e16` (product tree = S11.5 final `66a021f`) · **date:** 2026-11-03

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§7). **Nothing was profiled or built for this RFC.** The AC1 re-baseline is Stage 3's first task by design. The only inputs are S11.5's committed evidence and a static source read (`evidence/RFC-log-static-read.txt`). Every number below that is not from S11.5's evidence is labelled **estimate**.

---

## 1. Context (from the brief)

- **Mission:** after S11.5, one long task is left on every startup path: a **56–69 ms** synchronous `<Canvas>` mount. It is the only reason S11.5's AC2 failed, and it is the main TBT cost that kept D-19's interaction gate. This slice may touch the Canvas owner (S8) to stage that mount across frames, then re-runs the eager-hydration verdict.
- **Order (binding):** re-measure first (AC1), then change the mount.
- **Allowed frozen files (surgical, re-sealed with a reason note):**
  - S8: `src/react/TeardownViewer.tsx`, `src/react/a11y/webgl.ts`;
  - S6: `src/react/scene/Scene.tsx`, `src/react/scene/Slabs.tsx`;
  - S4: `src/react/scene/Stats.tsx`.

  S2, S5 and S7 stay empty.

### Acceptance criteria (verbatim, inviolable)

- **AC1:** a re-baseline of S11.5's final state exists **before** any change commit, on the same 4× CPU protocol, with per-path numbers and the trace artifact attached.
- **AC2:** during the first 5 s after engagement, the project route records **0 dropped frames** (existing `fps-engine` startup scenario) and **no single long task above 50 ms**, on every engagement path (pointer move and the "Explore 3D" click); the same holds for the hero's first 5 s.
- **AC3:** visual parity: rest-state screenshots pixel-identical in light and dark; **2 draw calls** on the teardown unchanged; CLS 0; client JS ≤ the S11.5 final bytes per scope (byte count reported).
- **AC4:** `data-xploder-ready` still fires on the first content frame, and the hero and workbench reveal sequence is unchanged (probe evidence on both routes).
- **AC5:** the eager-hydration flag is re-measured on `/` and `/projects/websocket-inspector` on the CI runner under the mobile profile with a verdict: **≥ 95 perf and TBT ≤ 200 ms** on both → recommend retiring D-19's gate; otherwise publish the numbers and **keep the gate**. Either verdict is acceptable; an unmeasured opinion is not.
- **AC6:** CI green (all required checks incl. `seo: meta + og`, fps calibration, both axe jobs); frozen surfaces S2/S5/S7 remain empty; every touched S4/S6/S8 file is re-sealed with a reason note, and `XPLODER-SRC-OK` lists exactly those files.

### Starting point (S11.5 evidence, `.specify/features/engine-startup/evidence/`)

| Path (4× CPU, mobile, 2 runs) | Max long task | Dropped frames | Startup main-thread cost | Source |
|---|---:|---:|---:|---|
| home / move | 61–69 ms (two pairs) | 2 (median) | 284–312 ms | `T014-log-ac2.md`, `T013-log-before-after.md` |
| project / move | 56.4 ms | 6 | 325.6 ms | same |
| project / click | 58.9 ms | 6.5 | 339.6 ms | same |

- **Anatomy of the long task** (`T010-log-longtask-profile.txt`, sampled CPU profile, 2 runs):
  - three.js `WebGLRenderer` construction/setup: 37–46 %;
  - R3F root creation + first scene render: 22–31 %;
  - xploder scene components: 17–27 %.

  WebGL context creation itself is 2.8 ms. The `hasWebgl()` probe context (4.7 ms) is in an **earlier** task (P4), not in the long one.
- **Applied to the 56–69 ms maxima (estimate):** renderer ≈ 21–32 ms, root + first render ≈ 12–21 ms, scene ≈ 10–19 ms. Each part is under 50 ms on its own, so splitting the task along these lines should meet AC2's long-task half on this host.
- **CI-runner eager Lighthouse** (`T017-log-eager-verdict.md`):

  | Route | Perf | TBT |
  |---|---:|---:|
  | `/` | 0.955–0.96 | 233–249 ms |
  | project | 0.89–0.905 | 398–442 ms |

  Gated runs on the same runner sit at 84–97 ms TBT. Eager mode adds ≈ 150 ms (home) and ≈ 350 ms (project).

---

## 2. Static read: what the `<Canvas>` mount task does today

Details and line references: `evidence/RFC-log-static-read.txt`.

1. **TeardownViewer render** (S8, inside S11.5's transition):
   - `useState(() => hasWebgl())` runs the probe on a detached canvas: `getContext('webgl2')`, then `loseContext()`. The result is cached per page.
   - The probe decides whether `<Canvas>` and the navigator render at all. That is S8 a11y behaviour (`data-xploder-webgl`, the fallback).
2. **R3F `Canvas` first commit.** `useMeasure` has no size yet, so nothing GL happens.
3. **The ResizeObserver re-render.** Its **layout effect** does all of the following in one synchronous task:
   1. `createRoot(canvas)`: store + `reconciler.createContainer`;
   2. `configure({ gl })`: `createRenderer` → `new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance', antialias: true, alpha: true })`;
   3. `applyRootConfiguration`: Raycaster, OrthographicCamera, Scene, `setPixelRatio` + `setSize` through the store subscription;
   4. `root.render(...)`, which mounts the whole xploder scene with **`updateContainerSync` + `flushSyncWork`**. Every component's memos and layout effects run: Slabs geometry/materials/instances, CameraRig, ViewScroll `setViewOffset`, OverlayProjector buffers, the emphasis driver, Lights, Stats.

   **This is the 56–69 ms task.**
4. **Next rAF: the first frame.** Priority-0 `useFrame` callbacks run, then Stats (priority 1) calls `gl.render`. Shader compile happens here (2–3 ms, S11.5 P7). Then `gl.info`, `onStats`, `data-xploder-ready="true"`, and `onFirstFrame` triggers the reveal.

**The seam the brief asks for already exists in R3F 9.8.2.** If `gl` is a **function**, R3F calls it once per root with the defaults (including R3F's own `canvas`). If that call returns a **promise**, `root.ready` stays pending, and `Canvas` suspends a *null sibling* (`useGate`), so the canvas stays in the DOM. The scene mounts only in the re-render after the promise resolves. R3F still owns and disposes the renderer.

So one change in `TeardownViewer.tsx` can put the renderer construction, the root configuration and the scene mount in **separate tasks**. Canvas props, context attributes and the frameloop don't change.

**What the first content frame depends on** (static read §4). Of the four components the brief lists for "after the first frame", three contribute to it:

| Component | Contributes to the first frame? |
|---|---|
| ViewScroll | yes: `camera.setViewOffset`, the vertical framing |
| OverlayProjector | yes: overlay/lettering positions in the same frame |
| emphasis driver | yes: instance colours + lift written by Slabs' `useFrame` |
| PickBridge | no: picking refs only |

---

## 3. Technical decisions

### D1 — Re-baseline protocol (AC1, Deliverable 1)

- **Identical to S11.5 D2** (and its G1 corrections):
  - local production export (`pnpm build && pnpm serve:out`);
  - Playwright Chromium with the Lighthouse mobile screen/UA;
  - CDP `setCPUThrottlingRate(4)`, network unthrottled;
  - **2 runs per measurement, median = mean of 2**, both raws published;
  - a spread above 20 % → the pair is flagged and repeated, and every run is published.

  `meta.json` records the Chromium version, the host `benchmarkIndex` and the WebGL renderer string (S11.5 C2: ANGLE Metal on this host, not SwiftShader).
- **Paths:**
  - hero `/` with pointer move;
  - project `/projects/websocket-inspector` with pointer move **and** with the "Explore 3D" click.
- **Measurements, all on the unmodified tree:**
  1. `perf:startup` clean runs: main-thread cost, long tasks, blocking ms, CLS;
  2. `perf:startup --attribute`: phases;
  3. `fps:engine --scenario startup`: AC2's harness, with dropped frames and long tasks;
  4. `perf:parity`: 8 rest-state shots (2 routes × mobile/desktop × light/dark);
  5. `site:probe --group draws` + `engine:probe`: draw calls;
  6. `bundle:manifest`: bytes per scope, raw + gzip, single gzip method (S11.5 T014 correction);
  7. gated `perf:lighthouse` × 2 per route.

  Gzipped traces are committed for each path (clean + attributed).
- **Drift check:** a table compares the re-baseline with S11.5's T013/T014 numbers, and the 8 shots are pixel-compared with `T014-screenshot-*`. **The re-baseline, not S11.5's numbers, is the "before" for every comparison** in this slice (Q2).
- **Commit order is evidence.** The re-baseline task commits its artifacts before any commit touching `packages/xploder/src`. A guard (`REBASELINE-FIRST-OK`) checks this from `git log`.

### D2 — Diagnostics needed to rank the levers (additive, `tools/perf` only)

S11.5 explained the long task with a **one-off, uncommitted** CPU-profile script. It never explained *where the dropped frames fall*. Both questions decide the lever order here, so the harness gains three additive diagnostics. None of them changes how existing numbers are computed.

1. **`perf:startup --cpu-profile`:** a third run kind ("profiled", never mixed into totals). It records a CDP sampled profile (100 µs) across the engagement window, and writes self time per chunk and per top function for every task above 16.7 ms. The chunk → module map comes from `bundle:manifest`. This makes T010's attribution reproducible and committed.
2. **`fps:engine --scenario startup` dropped-frame timeline:** the startup scenario's JSON gains `droppedFrameTimes` and `tasksOver16ms`, both from the trace it already records. The `explode`/`tour` scenarios and the verdict rule stay byte-for-byte unchanged (tests). AC2 needs **0 dropped frames**, and a frame can drop behind a 20–40 ms task as well as behind a long one. So the timeline shows which tasks the frames drop behind.
3. **Ready/reveal sequence** (attributed runs, for AC4). The run logs the first `drawElementsInstanced`, the `data-xploder-ready` mutation, and the `data-site-live-state` / workbench live-state transitions (timestamp + rAF index each). This is the AC4 probe on both routes.

### D3 — Candidate levers, ranked by expected payoff ÷ risk (final order = re-baseline numbers)

Names follow the brief's list. Expected effects are **estimates** from the T010 shares.

| Rank | Lever | Mechanism | Surface | Expected effect | Risk |
|---|---|---|---|---|---|
| **1** | **L1 renderer in its own slice** | `<Canvas gl={createRendererStaged}>`: a module-level async factory. It waits for an idle slice, then builds `new WebGLRenderer({ ...defaults, antialias: true, alpha: true })`. The constructor arguments are byte-for-byte today's (R3F defaults + the same two flags). Errors reject `root.ready`, R3F's `setError` rethrows into `CanvasBoundary`, and the a11y fallback path is unchanged | `TeardownViewer.tsx` (S8) | takes ≈ 21–32 ms (constructor, extensions, capabilities, state) out of the long task | low–medium: `glProps` is skipped for factories, but today's `{antialias, alpha}` only matter at construction. Parity shots prove it |
| **2** | **L4 split root setup and first scene render** | inside the same factory, `await` one more yield **after** construction and before resolving. R3F's `apply` (camera, scene, `setPixelRatio`/`setSize`, the MSAA buffer resize) then runs in its own task. The Canvas re-render that mounts the scene is a later task again (Suspense retry). The first frame stays in its own rAF | `TeardownViewer.tsx` (S8) | three tasks: construct · configure + `setSize` · scene mount, plus the first-frame rAF | low |
| **3** | **L2 first-frame-only staged scene mount** | `Scene.tsx` mounts its children in staged commits, one per yield. A priority-1 no-op `RenderHold` (S11.5 C1 design) blocks R3F's own render, and Stats mounts **last**, so no frame is drawn until every first-frame contributor (Slabs, CameraRig, Lights, ViewScroll, OverlayProjector, the emphasis hook) is mounted. **Only PickBridge mounts after the first content frame** (Q6). Runs only if the re-baseline + L1/L4 still show a scene task above the target or a frame dropping behind it | `Scene.tsx` (S6) | splits the 10–19 ms scene mount; matters for dropped frames and the runner, less for the 50 ms bar | medium: ordering of `invalidate()` and the first frame. RenderHold keeps "first content frame" exact |
| **4** | **L3 `hasWebgl()` probe** | **Reuse is impossible:** a WebGL context cannot move between canvases, and R3F creates its canvas inside `Canvas`. **Removing** the probe would change the S8 a11y fallback (non-goal). So the only variant left is a **cheaper probe with the same boolean semantics**: a 1×1 canvas, `{ antialias: false, depth: false, stencil: false }`, same `webgl2 → webgl` order, the same cache, `loseContext()`. Runs only if the profile puts the probe inside a task above 50 ms or next to a dropped frame | `a11y/webgl.ts` (S8) | ≤ 4.7 ms, outside the long task today | low |
| — | **Rejected** | `Canvas` prop changes (`antialias`, `dpr`, `frameloop`, `powerPreference`), because they are visible; a pre-built renderer **instance**, because it would not own R3F's canvas; an optimistic Canvas without the probe (a11y); `three`/R3F version bumps (no measured reason); any new library; any edit to Stats (S4) unless the numbers force it (Q7) | | | |

**Slice target (Q11):**
- AC2's bar is 50 ms, and it is not reworded.
- For AC5, a lower bar matters. Lighthouse's simulated throttling scales the runner's task durations by 4×, and the runner is ≈ 1.8–1.9× slower than this host (benchmarkIndex ≈ 2,200–2,340 vs ≈ 4,200). So a task of *t* ms at this host's 4× ≈ 1.85·*t* ms simulated on the runner (**estimate**).
- A task stays TBT-free on the runner only at ≲ **27 ms** here.
- L1/L4/L2 slices are designed toward that size. This is a design target, not an acceptance bar.

### D4 — Ready and reveal stay first-content-frame (AC4)

- **`data-xploder-ready` keeps its single source:** Stats' first priority-1 render → `onStats` → `TeardownViewer.onStatsChange`. L1/L4 only delay *when* the scene mounts. They don't change what the first render contains or who reports it. L2 mounts Stats last, behind `RenderHold`, so no earlier frame is drawn.
- **Stats.tsx stays byte-identical** by default (Q7).
- **Invariants checked by the D2.3 probe on both routes,** before and after:
  1. no `drawElementsInstanced` happens before the frame in which `data-xploder-ready` flips;
  2. ready flips in the same rAF as the first instanced draw;
  3. the ordered list of live-state values (hero `idle → loading → revealed`, workbench `loading → revealed`) is identical to the re-baseline's;
  4. `site:probe --group hero` still passes (not revealed at FCP, revealed after interaction).

### D5 — Lever discipline

- **One lever, one commit, one A/B.** The A/B is clean runs on all three paths, ×2. Its Δ is measured on max long task, dropped frames, blocking ms and main-thread cost against the state just before the lever.
- **Keep rule (S11.5 D6):** Δ must exceed the larger run-to-run spread. Otherwise the lever is reverted, and the revert is recorded as "no measurable win".
- **Stop rule:**
  - After L1 + L4, the next lever runs only if a measured blocker remains: a task above 50 ms, a dropped frame, or a slice above the D3 target that the timeline ties to a frame.
  - Levers are never stacked "just in case".
  - If the brief's four levers cannot reach AC2, the slice STOPs and escalates with the timeline (Hard Rule 2).

### D6 — Visual parity and bytes (AC3)

- **Rest state** (S11.5 D8): engaged → ready → `exploded` settled → 2 rAF. The 8 shots are compared as decoded RGBA against the **AC1 re-baseline shots**, and must show 0 differing pixels. Any non-zero diff is a STOP (Hard Rule 5), reported with a diff image.
- **Draw calls:** `site:probe --group draws` (both routes, mode 2) + `engine:probe` fixtures a/b/c = 2.
- **CLS 0:** startup harness after engagement + gated Lighthouse.
- **Bytes "per scope"** = the four scopes S11.5 published, each **raw and gzip ≤ the S11.5 final** (re-measured in AC1):
  1. home initial;
  2. project initial;
  3. total emitted JS;
  4. non-initial 3D JS.
- **Risk:** L1/L4 add a few hundred bytes to the lazy viewer chunk (**estimate**), which grows scopes 3 and 4. The plan offsets inside the touched files and app-side code first. If no honest offset exists, the slice STOPs and escalates with the byte table; the budget is never relaxed (Q9).

### D7 — Eager-hydration re-run (AC5, Deliverable 4)

- **Build and protocol:** the S11.5 flag (`NEXT_PUBLIC_EAGER_3D=1 pnpm build:eager`, default off), on the final lever state.
- **Binding host = the CI runner.** `eager-3d.yml` already runs on `pull_request`, measurement-only. It is run **twice** (two workflow runs, each `perf:lighthouse` mobile ×2 per route, each a median of 3), with the gated build as the reference. `eager-verdict` applies AC5's rule (≥ 0.95 perf **and** TBT ≤ 200 ms on both routes).
- **Local eager numbers** are published alongside, as in S11.5 T016.
- **Attribution (Q13):** the eager summaries gain Lighthouse's long-task list (URL, start, duration; additive). If the verdict is "keep", it says *which* tasks still cost the TBT. If it is "retire", the gate itself is retired in a follow-up on Murphy's word (Q18), not in this slice.

### D8 — Frozen surfaces, re-seal and guards (AC6)

- **Manifests:**

  | Surface | Manifest | Generator / base | Allowed file(s) |
  |---|---|---|---|
  | S8 | `frozen-surface.s8.manifest.json` | `generate-s8.sh`, base `99a94f2` | `TeardownViewer.tsx`, `a11y/webgl.ts` (via the `src/react/a11y/` entry) |
  | S6 | `frozen-surface.s6.manifest.json` | `generate-s6.sh`, base `f65b13c` | `Scene.tsx`, `Slabs.tsx` |
  | S4 | combined S2/S4 `frozen-surface.manifest.json` | base `53b2b2b` | `Stats.tsx` |

  The S2/S4 split lists from S11.5 (`s2.paths`, `s4.paths`) are reused.
- **Re-seal procedure (S10 `f65b13c`/`cfef420` pattern):**
  - A **lever commit** touching a sealed file is followed immediately by a **re-seal commit**. That way every commit's test suite is green (Q16). The re-seal commit:
    - moves the generator's `base` to the lever commit;
    - appends the note "Re-sealed in S11.6 at `<sha>`: `<file>` — `<reason>`; see `.specify/features/staged-canvas-mount/…`";
    - regenerates the manifest;
    - updates the pinned base/note in `frozen-surface.test.ts`.
  - A reverted lever reverts its re-seal too.
  - The **final audit** logs each manifest diff and shows that only the touched files' hashes changed. If Stats is ever touched, every S2 hash must be byte-identical.
- **Guards** (`.specify/features/staged-canvas-mount/guards.sh`, copied from S11.5 with `B=05e4e16`, exit 1 on any failure, run by every task):
  - `FROZEN-OK`, `BRIEF-HISTORY-OK`: brief, kickoff and content vs `05e4e16`.
  - `XPLODER-SRC-OK`: `git diff --name-only 05e4e16 -- packages/xploder/src packages/xploder/package.json` equals `approved-xploder-src.txt`. The list starts empty and gains a file only in the lever task that touches it.
  - `SURFACE-S2-OK`, `SURFACE-S5-OK`, `SURFACE-S7-OK`: unchanged vs their bases.
  - `SURFACE-S4/S6/S8-OK`: the non-approved paths of each surface are unchanged vs their bases.
  - `REBASELINE-FIRST-OK`: the AC1 artifact commit precedes the first `packages/xploder/src` commit.
  - `S8-TOOLS-OK`, `DEV-ROUTES-OK`, `CI-JOBS-OK` (`ci.yml`/`perf.yml` untouched), `VERSIONS-OK`, `GITLEAKS-OK`.

### D9 — Dependencies and budgets

- No new dependency, runtime or dev.
- No `three`/R3F version change. L1 uses R3F 9.8.2's documented factory, and `WebGLRenderer` is already exported by the app's curated `three-surface.ts`.
- No budget in `budgets.ts` changes. AC5's TBT bar (200 ms) is recorded in the verdict, not added as a gate.

---

## 4. AC proof map

| AC | Proven by | Artifact(s) |
|---|---|---|
| AC1 | D1 re-baseline on all three paths + drift table, committed before any xploder commit (`REBASELINE-FIRST-OK`) | `T0xx-log-rebaseline.md`, `T0xx-startup-*.json`, `T0xx-fps-startup-*.json`, `T0xx-trace-*.json.gz`, `T0xx-cpuprofile-summary-*.json`, `T0xx-meta.json` |
| AC2 | `fps:engine --scenario startup` final state, 3 paths × 2 runs: `droppedFrames === 0` **and** `maxLongTaskMs ≤ 50`, plus the dropped-frame/task timeline | `T0xx-fps-startup-*.json`, `T0xx-log-ac2.md` |
| AC3 | 8-shot RGBA parity vs the re-baseline, draw calls (site + engine probes), CLS (harness + Lighthouse), `bundle:manifest` byte table, 4 scopes, raw + gzip | `T0xx-log-parity.txt`, screenshots, `T0xx-log-drawcalls.txt`, `T0xx-log-bundle-diff.txt` |
| AC4 | D4 sequence probe before/after on both routes + `site:probe --group hero` | `T0xx-log-ready-reveal.md` + JSONs |
| AC5 | `eager-3d.yml` on the PR, 2 runner runs + local, `eager-verdict`, long-task attribution | `T0xx-lighthouse-summary-ci-*.json`, `T0xx-log-eager-verdict.md`, run URLs |
| AC6 | CI run (all required checks), `guards.sh`, manifest diffs + notes, `approved-xploder-src.txt` | `T0xx-ci-run.txt`, `T0xx-log-guard.txt`, `T0xx-log-reseal.txt` |
| Deliverable 3 | before/after table: max long task, dropped frames, blocking ms (TBT-style), main-thread cost, 2 runs each, per lever and final | `T0xx-log-before-after.md` |

---

## 5. Implementation sketch (Stage 2 input; Stage 3 stops at each group boundary)

1. **Re-baseline:**
   - T001: feature guards + approved list (empty);
   - T002: D2 diagnostics (`--cpu-profile`, dropped-frame timeline, sequence probe) + tests, no product change;
   - T003: **AC1 re-baseline** (D1, all paths, traces, profile attribution, drift table, 8 shots, bytes, draws, gated Lighthouse).

   → **STOP G1:** Murphy reviews the numbers, and the lever order is confirmed or reordered from them.
2. **Staging levers:**
   - T004: L1 + A/B, then the S8 re-seal;
   - T005: L4 + A/B (re-seal amended);
   - T006: L2 (conditional) + A/B, then the S6 re-seal;
   - T007: L3 (conditional) + A/B;
   - T008: final AC2/AC3/AC4 measurements + before/after table.

   → **STOP G2.**
3. **Eager-hydration re-run:**
   - T009: local eager Lighthouse;
   - T010: push + draft PR, two `eager-3d` runner runs, verdict.

   → **STOP G3.**
4. **Re-seal / CI:**
   - T011: re-seal audit (manifest diffs, notes, S2 identity if S4 was touched);
   - T012: final guards, CI green, AC self-check.

   → **STOP** (end-contract).

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| **Dropped frames are the harder half of AC2.** A 20–40 ms task can still drop a frame when one is due, and 6–7 frames dropped on the project paths with only one long task | The D2.2 timeline ties each dropped frame to a task. Slices are designed toward ≈ 27 ms (D3). If the brief's levers cannot remove the remaining drops → STOP + escalate with the timeline |
| AC5 still fails on the runner even if AC2 passes locally (4× simulation on a ≈ 1.85× slower CPU) | Either verdict is acceptable. The D7 attribution names the remaining TBT tasks, and the gate stays (Q14) |
| L1's async gap changes the ready/reveal order, or shows an empty canvas frame | No frame can be drawn before the scene mounts (R3F waits on `root.ready`). The D4 probe checks order and first frame on both routes, before and after |
| L1 factory constructs differently from today (R3F's `applyProps(gl, {antialias, alpha})` no longer runs) | Constructor arguments stay identical. A unit test asserts them, and pixel parity on 8 shots + draw calls confirms |
| StrictMode/dev double effects create two renderers (the S06 memo lesson) | R3F calls the factory once per root. The factory is module-level, side-effect-free until called, and covered by a StrictMode test |
| Bytes grow in the lazy/total scopes | D6: offset first; if impossible → STOP + escalate. Never relax (Q9) |
| L2 changes the first frame (e.g. ViewScroll's view offset applied late) | Only PickBridge mounts after the first frame. Everything else mounts before Stats behind `RenderHold`. Parity + D4 probe |
| Host/Chromium drift since S11.5 | D1 drift table. Re-baseline numbers become the "before" |
| Executor unavailable (402) or stuck | Probe before each wave. Hard Rule 8 pause + usage report. Tier 1.5 skipped-with-record |

---

## 7. Findings and open questions (each with a recommended default)

**Findings (facts, no decision needed):**

- **F1:** Orca created this worktree on `TimurHaryo/task-s11.6-staged-canvas-mount` at `66a021f`, without the brief. The real slice branch `task/s11.6-staged-canvas-mount` (`05e4e16`, pushed, with the frozen brief + kickoff) was checked out in the old S11.5 worktree. That worktree was clean and is now detached, this worktree was switched to the slice branch, and the Orca-named branch was deleted before any commit.
- **F2:** `git diff 66a021f 05e4e16 -- apps packages tools .github` is empty. The re-baseline measures exactly S11.5's merged product.
- **F3:** R3F 9.8.2 natively supports an async `gl` factory. It gives the brief's "construct the renderer in its own slice … hand it to `<Canvas gl={…}>`" without touching Canvas props, and it splits root configuration from the scene mount (static read §2).
- **F4:** three of the four components the brief would mount "after the first content frame" contribute to that frame: ViewScroll (camera view offset), OverlayProjector (overlay/lettering positions) and the emphasis driver (instance colours/lift). Only PickBridge doesn't. Emphasis, PickBridge and ViewScroll are S5 files. Staging them is done by `Scene.tsx` (S6) alone, so S5 stays empty.
- **F5:** `Stats.tsx` sits in the combined S2/S4 manifest. Touching it forces an S4 re-seal with S2-hash identity proof, so it is avoided by default.
- **F6:** the `hasWebgl()` probe (4.7 ms) runs in an earlier task than the long one (`T010`). Reusing its context is technically impossible, and removing it changes S8 a11y behaviour.
- **F7:** S11.5's dropped-frame counts have no timestamps in the committed JSONs. Which tasks the frames drop behind is unknown until D2.2.
- **F8:** the AC5 runner applies 4× simulated throttling to a CPU ≈ 1.85× slower than this host. A slice ≲ 27 ms here is roughly TBT-free there (**estimate**, D3).
- **F9:** the usage file is stale (captured 2026-10-29), so current 5h/7d usage is **unknown**. Please check `/usage` before Stage 3.

**Open questions (the default applies unless Murphy says otherwise):**

1. **Q1 — Re-baseline protocol.** **Default:** S11.5 D2 unchanged (local export, mobile UA/screen, 4× CPU, 2 runs, median = mean of 2, repeat on a spread above 20 %, all raws published), on all three paths.
2. **Q2 — Drift.** **Default:** the re-baseline is the "before" for every comparison. Any headline number more than 20 % away from T013/T014 is flagged and published, and nothing is compared with S11.5's numbers across hosts or builds.
3. **Q3 — Diagnostics (D2).** **Default:** add `--cpu-profile`, the startup-only dropped-frame timeline and the sequence probe to `tools/perf` (additive, tested, existing scenarios byte-identical) **before** the re-baseline, so AC1's artifacts already carry them.
4. **Q4 — L1 mechanism.** **Default:** an async `gl` factory with constructor arguments identical to today's. A pre-built renderer instance is rejected: it can't own R3F's canvas.
5. **Q5 — Yield primitive inside xploder.** **Default:** `requestIdleCallback` (no numeric timeout, per the motion-literal rule) for the construction slice. `scheduler.yield()` → `MessageChannel` is the fallback, and also the primitive for the L4/L2 yields. It is inlined in the touched file: no new xploder file or export.
6. **Q6 — The brief's "mount after the first frame" list vs AC3/AC4.** **Default:** the ACs win. ViewScroll, OverlayProjector and the emphasis driver are *staged* into separate tasks but mounted **before** the first content frame (render held by `RenderHold` until Stats mounts). Only PickBridge mounts after it. The literal reading would visibly change the first frame and the reveal, so it is not offered.
7. **Q7 — Stats.tsx (S4).** **Default:** untouched. It is touched only if the numbers show a need no other allowed file can meet. That would then need an S4 re-seal with an S2-identity proof.
8. **Q8 — `hasWebgl()`.** **Default:** unchanged unless the profile places it in a task above 50 ms or next to a dropped frame. If so, the cheaper-probe variant (same boolean, same cache) is used. Never removed.
9. **Q9 — "Client JS per scope".** **Default:** the four S11.5 scopes (home initial, project initial, total emitted, non-initial 3D), raw **and** gzip, each ≤ the S11.5 final as re-measured in AC1. Growth is offset, or the slice escalates.
10. **Q10 — Dropped frames with no long task left.** **Default:** use the D2.2 timeline to target the task each frame drops behind, with the brief's levers only. If they can't, STOP + escalate with evidence. AC2 is not closed as "partially met".
11. **Q11 — Slice-size design target.** **Default:** ≈ 27 ms at this host's 4×, as a design target for L1/L4/L2 slices (it serves AC5). It is not an acceptance bar, and it adds no lever beyond the brief's four.
12. **Q12 — AC5 runs.** **Default:** two independent `eager-3d` workflow runs on the draft PR, with the verdict applied to both. Local eager numbers are published alongside.
13. **Q13 — Runner TBT attribution.** **Default:** add Lighthouse's long-task list to the eager summaries (additive, measurement-only), so the verdict names its remaining costs.
14. **Q14 — Scope if AC5 misses.** **Default:** stay within the brief's four levers. Publish the attribution and keep the gate. Further app-side staging of module evaluation would be new scope (a brief revision), not done here.
15. **Q15 — Push + draft PR.** **Default:** approved now, for T010, because `eager-3d.yml` only runs on a PR. The orchestrator merges only on your "merge".
16. **Q16 — Re-seal cadence.** **Default:** a lever commit + re-seal commit pair for each kept lever touching a sealed file (every commit green). Reverted levers revert their re-seal. A final audit happens in T011.
17. **Q17 — Executor and escalation.** **Default:**
    - Tier 1 = DeepSeek Flash 4.1, probed before each wave. Browser/perf tasks run with the sandbox off.
    - Stuck ×2 → pause and report with usage, then the orchestrator executes on "go".
    - Tier 1.5 is skipped-with-record.
    - Each task reports the tier that finished it.
18. **Q18 — D-19 follow-up.** **Default:** if AC5 passes on both routes, the orchestrator proposes retiring D-19 (eager path as default, then remove `eager-3d.yml`) as a separate follow-up after merge, on your confirmation. If it fails, the numbers are published and the gate stays.

---

## 8. Stage-1 hand-off

**WHAT MURPHY SHOULD TEST/VALIDATE**
1. §2 and F3: R3F's async `gl` factory as the seam for L1/L4, all inside `TeardownViewer.tsx`.
2. F4/Q6: ViewScroll, OverlayProjector and the emphasis driver stay before the first content frame (staged, not deferred). Only PickBridge moves after it.
3. The D3 lever ranking (L1 → L4 → L2 conditional → L3 conditional) and the expected touch set: `TeardownViewer.tsx` (S8), maybe `Scene.tsx` (S6), Stats untouched.
4. The risks that may still end in an escalation: dropped frames (Q10) and bytes (Q9). AC5 may still say "keep" (F8).
5. `evidence/RFC-log-static-read.txt`.

**WHAT THE AGENT NEEDS FROM MURPHY** (the defaults apply if you say nothing)
1. Answers to Q1–Q18. Default: all §7 defaults.
2. Current 5h/7d usage from `/usage` (F9). Default: Stage 2 proceeds, and usage is re-asked before the Stage 3 dispatch.
3. "approved" (or feedback) to start Stage 2 (spec/plan/tasks).

---

## 9. Gate log

1. **Stage 1 (2026-11-03):** RFC drafted on `task/s11.6-staged-canvas-mount` (F1 branch fix before any commit). Awaiting Gate 1.
2. **Gate 1 (Murphy, 2026-11-03, 5h 0%):** "defaults. approved". Q1–Q18 = the §7 defaults.
3. **Stage-2 re-check of the defaults against the code.** These are refinements R1–R9. None of them changes an AC.
   - **R1 (L2 must not touch sealed tests):** `scene.test.tsx` (S4), `view-scroll`/`pick-scene`/`emphasis-scene` (S5) and `blueprint-scene`/`overlay-projector` (S6) render `<Scene>` with the R3F test renderer and expect a frame after `advanceFrames(1)`. So L2 is **opt-in**: `Scene` (internal, not a package export) gains an optional `stage?: () => Promise<void>`. When it is absent, the mount is today's synchronous one. `TeardownViewer` passes its own `nextTask`. No yield helper is duplicated in `Scene.tsx`, and tests can inject a controllable promise. A new guard `SEALED-TESTS-OK` keeps every sealed test file unmodified.
   - **R2 (L1 testability):** the `xploder-dom` tests make `getContext` throw, so `hasWebgl()` is false and `<Canvas>` never renders in jsdom. `createStagedRenderer` is therefore exported from the `TeardownViewer.tsx` **module** for a new unit test (`staged-mount.test.tsx`). `src/react/index.ts` is unchanged, so it is not a package export. The R3F wiring is proven in the browser by the A/B, parity and draw checks.
   - **R3 (L2 first frame):** Stats requests no frame on mount, so `Scene` calls `invalidate()` when Stats' step arrives (S11.5 C1). PickBridge's step is scheduled from the **first `onStats`**, so it provably mounts after the first content frame.
   - **R4 (guards):**
     - `SURFACE-S4/S6/S8-OK` compare against `B` with git `:(exclude)` pathspecs for the approved files. That proves nothing else moved; the manifests pin the hashes.
     - New: `RESEAL-NOTE-OK`, and `REBASELINE-FIRST-OK`, anchored on `evidence/T004-log-rebaseline.md`.
     - `CI-JOBS-OK` also covers `eager-3d.yml`, which this slice does not edit.
   - **R5 (re-seal cadence):** `frozen-surface.test.ts` pins each manifest's `base`/`note`. So every kept lever on a sealed file is a lever commit + re-seal commit pair inside one task, and every commit's suite stays green.
   - **R6 (parity directories):** `perf:parity --compare` resolves shots by the `screenshot-<id>.png` suffix and refuses ambiguity, and an evidence dir that holds several shot sets is ambiguous. Compares therefore run against single-set temp dirs: the slice baseline = T004 shots + manifest; the drift check = S11.5 T014 shots + T006 manifest.
   - **R7 (bytes):** a feature-dir `bundle-scopes.mjs` computes the four scopes in raw and gzip with S11.5's corrected method (node zlib level 9, per file). `bundle:manifest --diff` stays informational only (S11.5 D-P1). A growth is recorded at each lever and becomes a gate at T009.
   - **R8 (AC5 mechanics):** one `eager-3d` run already measures gated + eager ×2 per route. Run 2 = `gh run rerun`. Long tasks come from the LHR `long-tasks` audit, whose durations are simulated under `throttling: simulate`, so they are the TBT-relevant ones.
   - **R9 (task numbering):** the RFC §5 sketch becomes T001–T012. The Lighthouse attribution moves to G3 (T010). Each lever task carries its own re-seal commit, so T011 (RFC) = T012 (tasks) is the final audit.
4. **Stage 3 G1 (2026-11-03): re-baseline committed (T004 `c4d71ae`) before any xploder commit.**
   - No drift vs S11.5: parity 0 px, bytes identical.
   - Every dropped frame sits in the chain mount → first frame → post-frame commit (`evidence/T004-log-rebaseline.md` §7).
   - Proposed: L1 → L4 → L2 as a precompile step (conditional), and the new L5, a post-frame commit as a transition (conditional). L3 skipped.
5. **G1 decision (Murphy, 2026-11-03, 5h 47%): "all defaults accepted. go".**
   - **L5 approved** as T007b: `TeardownViewer.tsx` only, the same lever discipline, conditional on T006/T007 evidence.
   - **L3 skipped** (T008 ⊘).
   - **Lever-task commit mechanics:** the executor makes the lever commit on its task branch, then the re-seal commit, so the re-seal can name the lever SHA (RFC R5).
6. **Stage 3 G2 (2026-11-03): levers done, at the G2 STOP** (`evidence/T009-*`).
   - **Kept:** L1 (T005, with the D-P3 fix for React's 300 ms Suspense retry throttle), L4 (T006), and the compaction (T008b).
   - **Skipped with evidence:** L2 (T007) and L3 (T008). **Reverted:** L5 (T007b, no measurable win).
   - **AC2 long-task half met:** 0 tasks above 50 ms on every path.
   - **AC2 dropped-frame half not met:** 2 / 5.5 / 5.5 dropped frames. The AC2 harness's own continuous rAF recorder keeps a frame due, and the remaining 25–33 ms tasks include three's unsplittable `WebGLRenderer` constructor and the first content frame, which must stay one frame (`T005-log-frame-diagnosis.md`, `T009-log-ac2.md`). → escalated (Hard Rule 2, RFC Q10).
   - **AC3:** parity 0 px, draws 2, CLS 0 hold. The byte clause is missed: lazy and total +289 B raw / +136 B gzip, and project initial gzip +2 B (only chunk-hash names changed). → escalated with the options in the G2 report.
   - **AC4:** pass.
7. **G2 decision (Murphy, 2026-11-03, 5h 80%): "yes default all. go".**
   - AC2's dropped-frame half is recorded as escalated and blocked by the harness rAF recorder + three's constructor; the long-task half is met.
   - AC3's byte clause is recorded as missed by +289 B raw / +136 B gzip (lazy/total) and +2 B gzip (project initial). The levers are kept, and there is no offset task.
   - G3 starts: push + draft PR approved (Q15).
8. **Stage 3 G3 (2026-11-03): eager re-run done, at the G3 STOP.**
   - Draft PR #18, `eager-3d` run 41637668830, attempts 1 and 2.
   - Run 1 (fast runner) passes. Run 2 (slow runner, the same host class as S11.5 T017) fails: project 0.87 / 506 ms.
   - **AC5 verdict: keep the gate** (`evidence/T011-log-eager-verdict.md`).
   - The slow-runner eager TBT is dominated by ≈ 200 ms react-dom tasks on the load path, which this slice's engagement-path levers do not address. Recorded as a follow-up item.
9. **G3 decision (Murphy, 2026-11-03, 5h 0%): "go".** G4 runs T012.
10. **Stage 3 G4 (2026-11-03): end-contract** (`evidence/AC-selfcheck.md`).
    - **Met:** AC1, AC4, AC5 (verdict: keep the gate), AC6.
    - **AC2:** long-task half met; dropped-frame half escalated.
    - **AC3:** parity, draw calls and CLS met; byte clause missed by +289 B raw / +136 B gzip, escalated.
    - Both escalations were accepted at G2.
    - PR #18 is a draft, awaiting Murphy's validation and "merge".

