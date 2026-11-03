# RFC — S11.5 Engine Startup Performance

**slice:** S11.5-engine-startup · **status:** APPROVED at Gate 1 (2026-11-03): all §6 defaults accepted, refinements R1–R8 and correction C1 recorded (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-11.5-engine-startup.md` (frozen brief v1) · **branch:** `task/s11.5-engine-startup` · **base:** `92a8d24` · **date:** 2026-11-03

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§6). **Nothing was profiled for this RFC:** the AC1 baseline is Stage 3's first task by design. The only numbers here are byte counts from a static build read (`evidence/RFC-log-static-read.txt`).

---

## 1. Context (from the brief)

- **Mission:** since D-19 (S10 RFC §9.15), the teardown starts only after the visitor's first interaction, because load-time initialisation broke the perf budget. A visitor who never interacts never sees the 3D. This slice makes startup cheap enough to earn the 3D back. The order is fixed: measure where the time goes, then split, warm and precompile.
- **Mounts:** hero `apps/web/components/hero/hero-live.tsx` → `import('./hero-stage')`, gated by `interaction-gate.ts`. Project route `workbench/workbench-loader.tsx` → `next/dynamic` `workbench-client.tsx`, gated by the same module or by the "Explore 3D" click.
- **Measured cost today (S10 note):** ≈ 0.4–0.6 s of main-thread time on a mid-range Android CPU, paid at first interaction.
- **Frozen surfaces:** only S4 (engine) and S6 (materials) may be touched, surgically, with a re-seal and a reason note. S2, S5, S7 and S8 must show empty diffs.

### Acceptance criteria (verbatim, inviolable)

- **AC1:** a baseline profile exists **before** any optimisation commit, covering parse/eval, mount, geometry, shader compile and texture creation on the 4× CPU profile, with per-phase numbers and the trace artifact attached.
- **AC2:** during the first 5 s after engagement, the project route records **0 dropped frames** (existing `fps-engine` harness) and **no single long task above 50 ms**; the same holds for the hero's first 5 s.
- **AC3:** measured startup main-thread cost drops **≥ 40 %** against the AC1 baseline on the same profile and protocol (two runs each, median reported). If 40 % proves physically unreachable, the shortfall is documented with the ceiling and the reason — numbers, not adjectives.
- **AC4:** visual parity: rest-state screenshots pixel-identical in light and dark; **2 draw calls** on the teardown unchanged; CLS 0; client JS bundle ≤ baseline (byte count reported).
- **AC5:** at least one startup lever is proven by measurement to be the dominant win (split init, precompiled materials, or import trimming), with the evidence showing its individual contribution — no shotgun changes.
- **AC6:** the eager-hydration flag is measured on `/` and `/projects/websocket-inspector` under the mobile profile with a verdict: **≥ 95 perf and TBT within budget** → recommend retiring D-19's gate; otherwise publish the numbers and **keep the gate**. Either verdict is acceptable; an unmeasured opinion is not.
- **AC7:** CI green (all required checks incl. `seo: meta + og`, fps calibration, both axe jobs); frozen surfaces S2/S5/S7/S8 remain empty; every touched S4/S6 file is re-sealed with a reason note, and `XPLODER-SRC-OK` lists exactly those files.

### Starting point (checked on this branch at `92a8d24`)

- **Canvas owner:** `<Canvas orthographic frameloop="demand" dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>` lives in `src/react/TeardownViewer.tsx`, which is in the **S8** manifest. Canvas props (context attributes, frameloop, dpr) cannot change. Everything inside the Canvas goes through `scene/Scene.tsx` (**S6**).
- **Scene inventory:** `Slabs.tsx` (S6) builds 2 × `BoxGeometry(1,1,1)`, 2 × `InstancedMesh`, and 2 × `MeshLambertMaterial` patched by `blueprintMaterial.ts` (S6). Both materials share `customProgramCacheKey = 'xploder-blueprint-1'`, so **one** GL program is expected. `Lights.tsx` (S4) adds an ambient and a directional light. `Stats.tsx` (S4) reads `gl.info.render` and drives `data-xploder-ready`, which in turn drives the hero/workbench reveal.
- **No textures:** xploder source has no `texImage`, `CanvasTexture` or `measureText`. Lettering (`PartLettering`, S8) and the overlay (`BlueprintOverlay`, S6) are DOM/SVG. The "texture creation" phase is expected to be ≈ 0, and AC1 will measure it anyway.
- **3D chunk:** `3dxvu8o_bxf8t.js` is **1,035,388 B raw / 277,455 B gzip**. It is lazy, not in either route's initial HTML. Initial JS is 583,368 B on `/` and 586,201 B on the project route. The chunk contains **all of three.js** (loaders, `SkinnedMesh`, `AnimationMixer`, `PMREMGenerator`, …), because `@react-three/fiber` 9.8.2 `<Canvas>` calls `extend(THREE)` on the full namespace (`dist/react-three-fiber.esm.js:40`). xploder itself uses 3 JSX intrinsics (`instancedMesh`, `ambientLight`, `directionalLight`), and R3F core references 23 `THREE.*` members.
- **Gates:** `waitForFirstInteraction` listens for pointermove/pointerdown/touchstart/wheel/scroll/keydown/focusin, and then `waitForIdle` runs `requestIdleCallback`. The project route's click path calls `setMounted(true)` **inside the click handler**, which is a discrete event, so React renders it synchronously in that task.
- **Harnesses:** `fps-engine` measures `/dev/engine?fixture=a` on the **fixture export** only, without CPU throttling. `engine-probe` (S8 tool, not to be edited) checks `fixture-{a,b}-draw-calls === 2` and throttles Blink 4×. `bundle-manifest` (S11) reports bytes. The Lighthouse gate is mobile, simulated throttling, median of 3. `budgets.ts` has **no TBT constant**.
- **History (S10 RFC §9.15, CI run 41404421018):** with load + idle hydration, the CI runner (benchmarkIndex ≈ 2300, against ≈ 4200 on this Mac) measured home TBT at 426–639 ms and perf at 0.89. That is the failure D-19 fixed, and it is AC6's reference point.

---

## 2. Technical decisions

### D1 — What "startup" means: the phase model (AC1, AC3)

Startup runs from **engagement** (the input event that opens the gate, t0) to the **first content frame** (the first canvas frame that draws the teardown, t9), plus a **1 s settle tail**. It is cut into phases taken from trace events and GL-call timings, with **no product instrumentation** (D3):

| # | Phase | Boundary / source | Main-thread? |
|---|---|---|---|
| P0 | Gate latency | t0 → idle callback (`requestIdleCallback` fires) | waiting, not cost |
| P1 | Chunk fetch | `ResourceSendRequest` → `ResourceFinish` of the 3D chunk(s) | network (off main) |
| P2 | Parse / compile | V8 compile events for the chunk (`v8.compile`, `v8.compileModule`; background streaming reported separately) | main + background |
| P3 | Module eval | `EvaluateScript` / `v8.evaluateModule` / chunk `FunctionCall`, up to `import()` resolution | main |
| P4 | React mount (DOM) | end of P3 → first `getContext('webgl2')` on the viewer canvas: render + commit of TeardownViewer, overlay, lettering, navigator, panels, workbench | main |
| P5 | Renderer init | `getContext` → first `createProgram` (WebGLRenderer constructor, R3F root, capability queries) | main |
| P6 | Geometry | `bufferData`/`bufferSubData` time + count (BoxGeometry + instance attributes) | main |
| P7 | Shader compile | `compileShader` + `linkProgram` + the first sync status query (`getProgramParameter`/`getUniformLocation` stall) | main (stall) |
| P8 | Texture / lettering creation | `texImage2D`/`texStorage*` time + count (expected 0); DOM `Layout`/`UpdateLayoutTree` inside the window, reported as "lettering/overlay DOM" | main |
| P9 | First canvas frame | first `drawElementsInstanced` → next `DrawFrame`; `data-xploder-ready="true"` observed | main + compositor |

**Startup main-thread cost (AC3 metric)** = Σ of top-level main-thread task durations (`RunTask` on `CrRendererMain`) in the window **[min(t0, first 3D-attributable task), t9 + 1000 ms]**. Work that a lever moves **before** engagement, such as idle warming, **stays inside the window**. Moving cost is not removing it, so a shift cannot count toward the 40 % (Q2). Phases P2–P9 must add up to within ±10 % of the total. Anything unattributed is published as "other".

### D2 — Measurement protocol (AC1, AC2, AC3, Hard Rule 7)

- **Profile:** Playwright Chromium (the pinned build) with the Lighthouse **mobile** screen and UA (`PROFILES.mobile`) and **CDP `Emulation.setCPUThrottlingRate(4)`**, set before navigation. Network is unthrottled, because it isn't main-thread work. The target is the **local production export** (`pnpm build && pnpm serve:out`, 127.0.0.1), the same build for every before/after pair.
- **Host calibration:** each run records the Lighthouse `benchmarkIndex` of the host, the Chromium version and the WebGL `UNMASKED_RENDERER` string in `meta.json`. Numbers are compared only within one host and protocol. 4× on this Mac (index ≈ 4200) is roughly a current mid-range phone. That is a calibration note, not a claim about any device.
- **GPU caveat:** headless Chromium renders WebGL with SwiftShader, as every existing harness does. Shader compile and draw run on the CPU in the GPU process. Real Android GPUs differ. This is published in the evidence as a limitation, not hidden (Q5).
- **Runs:** exactly **two runs per measurement**, and the **median** is reported (for n = 2 that is the mean, with both raw values shown). If the two runs differ by more than 20 %, the pair is flagged and repeated, and every run is published (Q4).
- **Two run kinds:** **clean** runs (no GL wrappers) produce totals, long tasks, dropped frames and CLS. **Attributed** runs (GL wrappers on, D3) produce the phase split. Phase numbers are never mixed into the totals.
- **Routes × engagement:** hero on `/` (pointermove, the D-19 gate). Project route `/projects/websocket-inspector` (a) passive pointermove and (b) a click on "Explore 3D". AC2 must hold on **every** measured path (Q3).

### D3 — Harnesses (all additive, `tools/perf` only)

1. **`pnpm perf:startup <url> --route <path> [--engage move|click] [--runs 2] [--attribute] [--out dir]`** (new `tools/perf/src/startup.ts` + `cli/startup-profile.ts`). It opens the route under D2, waits for `load` + visible + a 2 s quiet period, then starts tracing and dispatches the engagement. It traces t0 → t9 + 5 s with `devtools.timeline`, `disabled-by-default-devtools.timeline(.frame)`, `v8`, `v8.execute`, `blink.user_timing` and `loading`. Output `startup.json`:
   - the phase table (D1),
   - main-thread cost,
   - the long-task list (> 50 ms, with start/duration/phase),
   - blocking time (Σ max(0, task − 50 ms)), the TBT-style figure for the engagement window,
   - dropped frames, CLS after engagement,
   - draw calls per frame and the texture count,
   - `meta`.

   The gzipped trace is written next to it.
2. **GL attribution:** a Playwright `addInitScript` wraps `HTMLCanvasElement.prototype.getContext` and the `WebGL2RenderingContext`/`WebGLRenderingContext` prototype methods listed in D1 (P5–P9). It wraps nothing else. Each wrapper writes `performance.now()` spans into a page-global buffer, and counts draw calls per rAF. It runs **only** in `--attribute` runs, and it touches no product code.
3. **`fps-engine --scenario startup --route <path> [--engage …]`**: AC2 requires "the existing `fps-engine` harness", so the CLI gains a scenario. It serves `out/` instead of `out-fixtures/`, applies 4× CPU, and reuses `measureFps` with `trigger` = engagement and `durationMs` = 5000. It keeps the trace and reports long tasks > 50 ms from it. The existing `explode`/`tour` scenarios and their defaults stay byte-for-byte unchanged and are covered by tests.
4. **Parity screenshots:** `perf:startup --screenshot` (or a sibling CLI) captures the rest state (D8). A **PNG decode with `node:zlib`** compares the RGBA buffers, so the slice adds no image dependency.
5. **Reused unchanged:** `engine:probe` (draw calls on fixtures a/b), `bundle:manifest` (bytes), `perf:lighthouse` (AC6), `perf:weight`, `fps:calibrate`.

### D4 — Static read: where the time probably goes (hypotheses, replaced by AC1 numbers)

| Cost | What happens | Expected size | Notes |
|---|---|---|---|
| P2 parse/compile | 1.04 MB minified chunk. V8 streams async scripts > 30 KB off-thread and lazily compiles function bodies | medium | the main-thread share is mostly lazy compiles during P3–P5 |
| P3 module eval | full three top level (≈ 500 classes, `ShaderChunk` strings, `ShaderLib`/`UniformsLib` merged at module init), react-reconciler copy inside R3F, xploder react | **medium–high** | shrinks with bytes → lever L4 |
| P4 React mount | TeardownViewer + `BlueprintOverlay` (overlay model, 859-line S6 module) + `PartLettering` (S8) + navigator + panels + workbench dock, committed in **one** synchronous task (click path: inside the handler) | **high** | mostly S7/S8 code, frozen → can be time-sliced (L3), not rewritten |
| P5 renderer init | WebGL context with MSAA, `WebGLRenderer` capabilities/extensions, R3F root and store | low–medium | context attributes frozen (S8) |
| P6 geometry | 2 boxes + 2 instance buffers | negligible | measured to close AC1 |
| P7 shader compile | one Lambert program with blueprint patches. `linkProgram` is async in Chrome's command buffer, but three's first `getProgramParameter`/`getUniformLocation` **blocks** until the link finishes | **medium–high** on mobile GPUs | → lever L2 |
| P8 textures | none expected; DOM lettering layout shows up as style/layout | ≈ 0 | measured to close AC1 |
| P9 first frame | first instanced draw + composite | low | |

**Likely AC3 ceiling:** whatever share of the baseline sits in **frozen S7/S8 React mount work** (P4 minus the S6 overlay model) and in **WebGL context creation** cannot be removed by this slice, only sliced. If that share is above 60 %, 40 % is physically unreachable, and the shortfall is documented with that ceiling (AC3's escape clause, numbers only).

### D5 — Candidate levers, ranked by expected payoff ÷ risk (final order = AC1 numbers)

| Rank | Lever | Where | Expected effect | Risk | Surface |
|---|---|---|---|---|---|
| **L2** | **Precompiled material.** Precompile the blueprint program with `gl.compileAsync(scene, camera)` (uses `KHR_parallel_shader_compile` when present) before the first content frame. Scene takes over the render with a priority-1 `useFrame` that calls `gl.render` only once compiled. The callback order stays as today: priority-0 callbacks, then render. Stats and the first frame wait for the compiled program. Fallback: the current sync path if the extension is missing | `scene/Scene.tsx` (S6) | removes the P7 main-thread stall; also splits P7 out of the mount task (AC2) | low–medium: ready/reveal ordering must stay "first content frame" | **S6**, 1 file (+ S6 test) |
| **L4** | **Import trimming.** A Turbopack `resolveAlias` in `apps/web/next.config.ts` maps bare `three` to an app-level curated module, `apps/web/three-surface.ts`. That module re-exports from `three/src/*` exactly R3F's 23 members, xploder's imports and the 3 JSX intrinsics. Loaders, animation, audio, helpers and curves drop out | app build config, no frozen file | cuts P2/P3 roughly in proportion to bytes, and cuts bundle bytes (AC4) | medium: a missing export is `undefined` at runtime → a unit test diffs the shim against R3F's `THREE.*` uses and xploder's imports; draw-call + parity checks | **none** |
| **L3** | **Split init.** (a) Mount the viewer inside `startTransition` (hero `setHeroStage`, workbench `setMounted`, including the click path) so React time-slices the P4 render phase. (b) Yield (`scheduler.yield()` → `setTimeout(0)` fallback) between `import()` resolution and mount | `hero-live.tsx`, `workbench-loader.tsx` (app) | **long tasks / AC2**; little total change (AC3) | low | **none** |
| **L1** | **Idle warm.** After `load` + idle + quiet, evaluate the 3D modules in **separate idle slices** (`import('three')` → `import('@react-three/fiber')` → `import('./hero-stage')`), each in its own `requestIdleCallback`, and never inside a handler. Engagement then only mounts. **Rule:** a warm slice that creates a long task (> 50 ms) is rejected, because that is exactly what broke S10's TBT | `interaction-gate.ts` + loaders (app) | moves P1–P3 off the engagement path (AC2). It **does not** count toward AC3 (D1) | medium: TBT on Lighthouse runs (it must be measured with Lighthouse, not assumed) | **none** |
| L5 | **Overlay model cache.** Memoise the S6 overlay model per layout so mount-time renders reuse one computation instead of rebuilding it | `overlay/model.ts` or `BlueprintOverlay.tsx` (S6) | only if AC1 shows the overlay model above ≈ 10 % of P4 | medium (S6 model is hot) | S6 |
| — | **Rejected:** Canvas prop changes (`antialias`, `powerPreference`, `frameloop`) because they are S8 and visual. A `three` patch bump (no measured reason). A new client library. Splitting TeardownViewer's mount order (S8). Lowering any budget | | | | |

### D6 — Lever discipline and the AC5 proof

- **One lever, one commit, one A/B.** Each lever lands alone on top of the previous accepted state. Its contribution is the clean-run Δ of startup main-thread cost (and long tasks, for AC2) against the state just before it, two runs each.
- **Keep rule:** a lever is kept only if its Δ is greater than the larger run-to-run spread of the two states. Otherwise it is reverted in a follow-up commit and recorded as "no measurable win". That record is what "no shotgun changes" means.
- **Leave-one-out confirmation:** at the end, the dominant lever is reverted on a throwaway worktree, and the cost is re-measured, so its individual contribution is shown both incrementally and in isolation (AC5).
- **Order:** L2 and L4 first (the AC3-relevant levers), then L3 and L1 (AC2 hardening), then L5 if justified. AC1 can reorder L2 and L4.

### D7 — Eager-hydration flag (Deliverable 4, AC6)

- **Mechanism:** a build-time `NEXT_PUBLIC_EAGER_3D=1`, read once in `apps/web/components/interaction-gate.ts` as a new `waitForStartup(signal, shouldIgnore?)`:
  - **eager:** `load` → visible → idle (the pre-D-19 S10 path);
  - **default:** `waitForFirstInteraction` → idle (today, unchanged).

  Next inlines the constant, so the flag-off build drops the eager branch, and the bundle byte delta is reported. The **default is off**, and the flag is **never set on Vercel** in this slice.
- **Unchanged under both:** reduced motion and `saveData` still skip the 3D, the click path still mounts immediately, and the poster is still the first paint.
- **Measurement:** the final lever state, flag build, `perf:lighthouse` mobile (median of 3) × 2 runs on `/` and `/projects/websocket-inspector`. Perf, TBT, LCP and CLS are recorded for every run. It runs in two places:
  - (a) the local export;
  - (b) an informational, non-required `workflow_dispatch` job in `perf.yml`. It builds the flag export on the runner, serves it with `serve:out` and uploads the summaries. The runner is where S10 failed (Q8).
- **Verdict (as AC6 states it):** perf ≥ 95 **and** TBT within budget (Q7: ≤ 200 ms) on **both** routes → "recommend retiring D-19". Otherwise "keep the gate", and the numbers are published. Retiring the gate is **Murphy's later decision**. This slice only records the verdict and leaves the default off.

### D8 — Visual parity (AC4)

- **Rest state:** route loaded → engaged → `data-xploder-ready="true"` → state `exploded` settled (`data-xploder-tweening="false"`) → 2 rAF later. The matrix is `/` (hero revealed) and the project route (workbench live) × mobile + desktop × light + dark = **8 baseline screenshots**, captured in the AC1 task, before any lever.
- **Pass:** decoded RGBA buffers are byte-identical to the baseline (0 differing pixels). Any non-zero diff is a STOP (Hard Rule 5), reported with a diff image.
- **Draw calls:** `engine:probe` fixture a/b `=== 2`, plus the D3 GL counter on both routes (2 draws per content frame).
- **CLS 0:** Lighthouse (load) and the startup harness (post-engagement, `layout-shift` entries).
- **Bundle:** `bundle:manifest` before (AC1 task) and after. The comparison covers (a) the initial JS per route and (b) the total emitted JS under `out/_next/static/chunks`. Both must be ≤ baseline, reported in raw and gzip bytes (Q11).

### D9 — Frozen surfaces, re-seal and guards (AC7, Hard Rule 4)

- **Ownership (checked from each file's adding commit):** the one `frozen-surface.manifest.json` (base `53b2b2b`) covers S2 and S4.
  - **S2:** `package.json`, `src/index.ts`, `parse.ts`, `errors.ts`, `schema/`, `theme/`, `motion/index.ts`, plus their tests.
  - **S4:** `motion/ease.ts`, `layout/`, `engine/`, `scene/CameraRig.tsx`, `Lights.tsx`, `Stats.tsx`, `env.ts`, `usePalette.ts`, `useReducedMotion.ts`, plus their tests.
  - **S6:** `frozen-surface.s6.manifest.json` (base `f65b13c`).
- **Consequence:** xploder may change **only in existing S4/S6-listed files**. A new xploder source file, a new export, or an edit to `src/react/index.ts` or `package.json` would put a non-S4/S6 path into `XPLODER-SRC-OK`. So engine-side levers live in existing files (L2: `Scene.tsx`), and everything else lives in `apps/web` or `tools/perf`. New **test** files under `packages/xploder/test/` are allowed, since they sit outside `src`.
- **Preference order:** app-side (no seal) > S6 > S4. The plan currently touches **only `src/react/scene/Scene.tsx`** (and possibly the S6 test `blueprint-scene.test.tsx`).
- **Re-seal procedure (S10 `f65b13c`/`cfef420` pattern):**
  1. The lever commit changes the S4/S6 file and its tests.
  2. A separate re-seal commit updates the `base` and `note` in `frozen-surface.generate-s6.sh`, regenerates the manifest, and updates `frozen-surface.test.ts` if it pins the base. The note reads "Re-sealed in S11.5 at `<sha>`: `<file>` — `<reason>`; see `.specify/features/engine-startup/…`".
  3. If an S4 file is ever touched, the combined manifest is regenerated, and the diff must show **only S4 entries changing**, with every S2 hash byte-identical. That proof is logged.
- **Guards (`.specify/features/engine-startup/guards.sh`, exit 1 on any failure, run by every task):**
  - `FROZEN-OK` / `BRIEF-HISTORY-OK`: slices, `KICKOFF-S11.5.md` and content vs `92a8d24`.
  - `XPLODER-SRC-OK`: `git diff --name-only 92a8d24 -- packages/xploder/src packages/xploder/package.json` equals the **approved list**. The list is empty until L2 lands, then `packages/xploder/src/react/scene/Scene.tsx`.
  - `SURFACE-S2-OK`: the S2 subset vs `92a8d24`.
  - `SURFACE-S4-OK`: the S4 subset vs `92a8d24`, or the re-seal base.
  - `SURFACE-S5-OK` (`f31600e`), `SURFACE-S6-OK` (the re-seal base after L2), `SURFACE-S7-OK` (`5b22987`), `SURFACE-S8-OK` (`99a94f2`).
  - `S8-TOOLS-OK`: `engine-probe` and the a11y tools are unchanged.
  - `DEV-ROUTES-OK`: `app/dev` and `app/fixtures` are unchanged.

### D10 — Dependency and budget policy

No new runtime or client dependency, and no `three` version change (L4 changes *which* three modules ship, not the version). Dev tooling also adds no dependency: PNG decoding uses `node:zlib`, and traces are parsed with the existing `fps.ts` types. No budget in `budgets.ts` changes. AC6's TBT reference is recorded in the evidence, not added as a new gate (Q7).

---

## 3. AC proof map

| AC | Proven by | Artifact(s) |
|---|---|---|
| AC1 | `perf:startup` clean + attributed runs, both routes, all engagement paths, 4× CPU, 2 runs each, **committed before any lever commit** (`git log` order is part of the evidence) | `T0xx-log-baseline-profile.md` (phase table), `T0xx-startup-*.json`, `T0xx-trace-*.json.gz`, `meta` |
| AC2 | `fps-engine --scenario startup` on hero + project route (move + click), final state, 4× CPU: `droppedFrames === 0` **and** max long task ≤ 50 ms | `T0xx-fps-startup-*.json`, long-task log |
| AC3 | before/after table of startup main-thread cost (median of 2), same protocol; or the ceiling analysis if < 40 % | `T0xx-log-before-after.md` + JSONs |
| AC4 | 8-shot RGBA parity, `engine:probe` draw calls, GL draw counter, CLS (Lighthouse + harness), `bundle:manifest` before/after | screenshots, `T0xx-log-parity.txt`, `T0xx-log-bundle-diff.txt` |
| AC5 | per-lever incremental Δ table + leave-one-out of the dominant lever | `T0xx-log-lever-contribution.md` |
| AC6 | flag build, Lighthouse mobile median of 3 × 2 runs, both routes, local + CI runner; verdict line | `T0xx-lighthouse-summary-eager-*.json`, `T0xx-log-eager-verdict.md`, CI URL |
| AC7 | CI run URL (all required checks), `guards.sh` output, re-seal manifest diff + note | `T0xx-ci-run.txt`, `T0xx-log-guard.txt`, `T0xx-log-reseal.txt` |

---

## 4. Implementation sketch (Stage 2 input, refined in tasks.md)

Phase groups follow the kickoff (Stage 3 stops at each boundary):

1. **Baseline:**
   - T001 guards + S2/S4 subset lists;
   - T002 `perf:startup` harness + GL attribution + unit tests (no product change);
   - T003 `fps-engine --scenario startup` + tests;
   - T004 **AC1 baseline profile** (both routes, clean + attributed, traces) + 8 parity baseline shots + bundle baseline + AC2 baseline;
   - → STOP: Murphy reviews the profile, and the lever order is confirmed from the numbers.
2. **Levers:**
   - T005 L2 precompiled material (S6 `Scene.tsx`) + A/B;
   - T006 S6 re-seal;
   - T007 L4 import trimming + A/B;
   - T008 L3 split init + A/B;
   - T009 L1 idle warm + A/B + Lighthouse TBT check (only if AC2 still fails after L3);
   - T010 L5 (only if AC1 justifies it);
   - T011 before/after table + leave-one-out (AC3, AC5);
   - T012 parity + draw calls + bundle + AC2 final (AC2, AC4);
   - → STOP.
3. **Eager-hydration experiment:**
   - T013 flag + tests;
   - T014 local Lighthouse;
   - T015 CI runner job + verdict (AC6);
   - → STOP.
4. **Re-seal / CI:**
   - T016 final guards + manifests + CI green + AC self-check (AC7);
   - → STOP (end-contract).

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| SwiftShader under-/over-states shader compile compared with mobile GPUs | Publish the renderer string. Use relative before/after on one host. L2's main-thread claim is backed by trace stalls, not GPU time |
| L2 changes ready/reveal timing in a visible way (empty first frame, early reveal) | Stats + first frame are gated on the compiled program, so ready keeps meaning "first content frame". Parity shots + the reveal sequence are checked on both routes |
| L4 shim misses a member, so R3F gets `undefined` at runtime | A unit test parses R3F's `THREE.*` uses + xploder imports + JSX intrinsics against the shim's exports. Then draw calls + parity + a11y axe |
| L4 creates two three instances (shim `src` + `build`) | The alias covers bare `three` for every importer. A bundle test asserts one `REVISION` string in the emitted JS |
| L1 warm slices push TBT up on Lighthouse runs (the S10 failure mode) | No warm slice may exceed 50 ms. L1 is measured with Lighthouse before it is kept, and it is optional (only if L3 alone doesn't meet AC2) |
| 4× on this Mac is faster than a real mid-range phone, so AC2 passes locally but not on devices | Calibration (`benchmarkIndex`) is recorded. AC6's runner numbers give a slower second host. Per Hard Rule 2, an honest gap is escalated, never hidden |
| AC3's 40 % is blocked by frozen S7/S8 mount work | The D4 ceiling analysis, using the brief's own escape clause (numbers + ceiling + reason) |
| Run-to-run noise hides small levers | The D6 keep rule (Δ > spread) and the repeat-on-20 %-spread rule |
| Executor (DeepSeek Flash 4.1) unavailable (402) or stuck | Probe before each wave. Pause/escalate per Hard Rule 8 and the usage policy (§6 Q14) |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (facts, no decision needed):**
- **F1:** `<Canvas>` and its props live in S8 `TeardownViewer.tsx`, so engine-side levers must run *inside* the scene (S6 `Scene.tsx`) or in the app loaders.
- **F2:** R3F 9.8.2's `extend(THREE)` ships the whole three namespace. The 3D chunk is 1,035,388 B raw / 277,455 B gzip (`evidence/RFC-log-static-read.txt`).
- **F3:** there are no textures. Lettering and overlay are DOM/SVG, and one GL program is expected (a shared cache key).
- **F4:** S2 and S4 share one manifest, so an S4 re-seal must prove that S2 hashes are unchanged (D9).
- **F5:** under AC7's "`XPLODER-SRC-OK` lists exactly those files", new xploder source files and exports are impossible. Levers live in existing S4/S6 files or outside xploder (D9).
- **F6:** `fps-engine` targets only the fixture `/dev/engine` route, without CPU throttling, so AC2 needs an additive `startup` scenario (D3.3).
- **F7:** `budgets.ts` has no TBT budget, so AC6's "TBT within budget" needs a recorded reference (Q7).
- **F8:** the project-route click path renders the whole viewer synchronously inside the click handler. That is a likely AC2 long task, and L3 fixes it app-side.
- **F9:** Orca created the worktree branch as `TimurHaryo/task-s11.5-engine-startup`. It was renamed to `task/s11.5-engine-startup` before any commit, per the branch convention.
- **F10:** the usage file is stale (captured 2026-10-29), so current 5h/7d usage is **unknown**. Please check `/usage` before Stage 3.

**Open questions (the default applies unless Murphy says otherwise):**

1. **Q1 — CPU profile for AC2.** **Default: 4× CPU** (the same profile as AC1/AC3 and the brief's design target). The unthrottled harness-native numbers are published alongside for reference. AC2 names no profile, and choosing the lax one would look like gaming. *Note: this is the stricter reading, so it carries a real chance of an AC2 escalation.*
2. **Q2 — AC3 metric.** **Default: D1's window sum, including work moved before engagement.** Warming that only moves cost earlier helps AC2 but is not counted as saved. Alternative: count only post-engagement time. That is easier to pass but, in my view, not honest.
3. **Q3 — Engagement paths.** **Default:** hero = pointermove. Project route = pointermove **and** the "Explore 3D" click. AC2 must pass on all three paths.
4. **Q4 — Run protocol.** **Default:** exactly 2 runs, median (= mean of 2) + both raw values. A spread above 20 % → flagged, the pair repeated, all runs published.
5. **Q5 — GPU backend.** **Default: headless Chromium (SwiftShader)**, as in every existing harness and CI, with the renderer string recorded. No headed or hardware-GPU runs. Say "add a headed run" if you want an informational Metal-GPU run as well.
6. **Q6 — Trace artifacts.** **Default:** commit gzipped traces for the AC1 baseline (one per route × engagement) and the final state. Every other run commits only summaries (EVIDENCE.md §4). If one trace is above 5 MB gzipped, commit a version trimmed to the window and categories, and keep the full one in `.evidence/`.
7. **Q7 — "TBT within budget" (AC6).** **Default: ≤ 200 ms median on each route** (Lighthouse's mobile "good" threshold, which is also what a ≥ 95 perf score needs). It is recorded as AC6's reference, **not** added to `budgets.ts` as a new gate.
8. **Q8 — Where AC6 is measured.** **Default:** the local export **and** an informational `workflow_dispatch` job on the CI runner (flag build, served on the runner). The **verdict follows the runner** (the slower host, where S10 failed), and local numbers are published next to it. No Vercel env change, and no flag on previews.
9. **Q9 — Flag shape.** **Default: build-time `NEXT_PUBLIC_EAGER_3D=1`, off by default**, dead-code-eliminated when off. Retiring D-19 after the verdict is a follow-up change on your word, not part of this slice.
10. **Q10 — L4 import trimming via an app-level `three` alias shim.** **Default: allowed as a candidate**, kept only if measured (D6). It adds no dependency, changes no version, and touches no frozen file. Say "no shim" if you'd rather the app never redirect `three`.
11. **Q11 — "client JS bundle ≤ baseline".** **Default: both** the initial JS per route **and** the total emitted JS (`out/_next/static/chunks`) must be ≤ the AC1-task baseline, reported in raw + gzip bytes.
12. **Q12 — Parity matrix.** **Default:** 8 shots (2 routes × mobile/desktop × light/dark) at the D8 rest state, compared as decoded RGBA (0 differing pixels), plus `engine:probe` draw calls.
13. **Q13 — L2 readiness semantics.** **Default:** `data-xploder-ready` and the reveal keep meaning "first content frame". With L2 that frame waits for the compiled program, and no empty canvas frame is shown or reported. If `compileAsync` is unavailable, the current sync path runs unchanged.
14. **Q14 — Executor and escalation.** **Default:** tier 1 = DeepSeek Flash 4.1, probed before each dispatch wave. Stuck ×2 → **pause and report with usage** (your standing policy), then the orchestrator executes on "go". Tier 1.5 is dormant (skip-with-record). Browser tasks run with the sandbox off.
15. **Q15 — Harness placement.** **Default:** new files `tools/perf/src/startup.ts` and `cli/startup-profile.ts`, plus `pnpm perf:startup`. `fps-engine` gains the `startup` scenario additively, and `engine-probe.ts` (S8 tool) stays untouched. The harness is **not** added as a CI gate, because it is local evidence.

---

## 7. Evidence map (Stage 3 end-contract)

`evidence/` will hold, per EVIDENCE.md naming: the AC1 baseline (phase table, startup JSONs, traces, meta); per-lever A/B logs; the before/after table; fps-startup JSONs + long-task logs; 8 baseline + 8 final parity screenshots + diff log; draw-call log; bundle before/after; eager Lighthouse summaries (local + CI) + verdict; guard logs; re-seal manifest diff; CI run URL; and `AC-selfcheck.md` (the AC1–AC7 table, with the tier that finished each task).

---

## 8. Stage-1 hand-off

**WHAT MURPHY SHOULD TEST/VALIDATE**
1. D1's definition of "startup" and the AC3 window (Q2). Shifted work doesn't count as saved.
2. The lever ranking in D5 (L2 precompile, L4 import trimming, L3 split, L1 warm, L5), and that the only planned frozen-file touch is S6 `Scene.tsx`.
3. The eager-flag design in D7 and the AC6 verdict host (Q8).
4. `evidence/RFC-log-static-read.txt`: the 3D chunk bytes and the `extend(THREE)` finding.

**WHAT THE AGENT NEEDS FROM MURPHY** (the defaults apply if you say nothing)
1. Answers to Q1–Q15. Default: all §6 defaults.
2. Current 5h/7d usage from `/usage` (F10). Default: Stage 2 proceeds, and usage is re-asked before Stage 3 dispatch.
3. "approved" (or feedback) to start Stage 2 (spec/plan/tasks).

---

## 9. Gate log

1. **Gate 1 (Murphy, 2026-11-03, 5h 62%):** "all defaults. approved". Q1–Q15 = the §6 defaults.
2. **Stage-2 re-check of the defaults against the code.** These are refinements R1–R8 and one correction, C1. None of them changes an AC.
   - **C1 (L2 mechanism):** `Stats.tsx` (S4) already owns rendering through a priority-1 `useFrame` that calls `gl.render`. So D5's "Scene takes over the render with a priority-1 `useFrame`" is replaced: `Scene.tsx` (S6) mounts a priority-1 no-op `RenderHold` until `compileAsync` resolves, then mounts `Stats` and calls `invalidate()`. `Stats` stays byte-identical, and S4 is not touched.
   - **R1:** with C1, `data-xploder-ready` and the reveal keep meaning "first content frame" without any S4/S8 edit (Q13 holds).
   - **R2:** L2 uses `compileAsync` **only when `KHR_parallel_shader_compile` is reported**. Otherwise `compiled` starts `true`, which is exactly today's path. That keeps the test-renderer scene tests and non-supporting browsers unchanged. T006 records whether headless Chromium exposes the extension. If it doesn't, the G1 STOP offers: drop L2, measure the no-extension variant (default), or add one headed GPU run.
   - **R3 (facts checked in three 0.186.1 source):** `compile()` prepares materials for every mesh via `scene.traverse`, not only visible ones. `WebGLProgram.isReady()` polls `COMPLETION_STATUS_KHR` without blocking, and without the extension it reports ready immediately (the stall moves to first use). R3F 9.8.2 skips its own `gl.render` while any priority > 0 subscriber exists.
   - **R4 (L4 placement):** `apps/web/test/package-consumer.test.ts` and `prod-imports.test.ts` forbid `three`/`three/*`/`@react-three/*` imports under `app/`, `components/`, `content/`, `scripts/` and `seo/`. The shim therefore lives at `apps/web/build/three-surface.ts`. It is a bundling alias target, not app code. The scanners stay unchanged, and a new test asserts the shim is referenced only by `next.config.ts`. T009 starts with a decision gate: Turbopack must alias bare `three` exactly, without catching `three/src/*`, or L4 is dropped.
   - **R5 (Q8 mechanics):** a `workflow_dispatch` workflow can only be dispatched once the file exists on the default branch. So the runner measurement is a new **`eager-3d.yml` on `pull_request`**. It is measurement-only: it never fails on a budget, it is not required, and `perf.yml`/`ci.yml` stay byte-identical.
   - **R6:** the S2/S4 split of the combined manifest is kept as feature-dir lists (`s2.paths`, `s4.paths`), derived from each path's adding commit. S01-created `package.json`, `src/index.ts` and `motion/index.ts` count as S2 (the stricter side). T001 asserts that the two lists partition `frozen-surface.paths` exactly. No xploder test file changes for this.
   - **R7:** the AC1 baseline task (T006) also records gated-build Lighthouse on both routes. That is the TBT reference for L1's "no TBT regression" rule and the gated column of the AC6 table.
   - **R8:** `XPLODER-SRC-OK` compares against `approved-xploder-src.txt`. That list starts empty and gains a file only in the lever task that touches it (T007: `Scene.tsx`; T012 only if L5 runs).
   - **Also found:** `no-motion-literals`' `TIMER` rule rejects `setTimeout(…, <digit>)`, so L3's `yieldToMain` falls back to a `MessageChannel` hop, not `setTimeout(r, 0)`.
3. **Stage 3 G1 (2026-11-03): baseline committed (T006), before any product change.**
   - **C2 (measurement GPU):** headless Playwright Chromium on this host renders WebGL with **ANGLE Metal on the Apple M4 GPU**, not SwiftShader as D2/Q5 assumed (renderer string in `evidence/T006-meta.json`). The GPU caveat still applies, in the other direction: desktop-class shader compile is far cheaper than on mobile GPUs.
   - **Harness corrections at review (no AC change):** T002, T003 and T004 each needed one orchestrator-review revision.
     - Nested tasks, GL windowing, exclusive accounting.
     - P3 from timed Turbopack module factories, P5 anchored on the connected viewer canvas because xploder's `hasWebgl()` probe creates a detached context first.
     - The `toplevel` trace category was missing from `measureFps` (the long-task check was vacuous).
   - **G1 escalation (Hard Rule 2, evidence `evidence/T006-log-baseline-profile.md` § Interpretation):** AC3's 40 % is very likely unreachable within the frozen-surface rules (estimated ceiling ≈ 7–21 %). L2 has no measurable payoff on this host (P7 = 2–3 ms). The recommended lever order is L4 → L3 (+ staged module evaluation) → app post-first-frame work → L1 (conditional), with L2/L5 skipped. Awaiting Murphy at the G1 STOP.
4. **G1 decision (Murphy, 2026-11-03): "all defaults. go".**
   - The new lever order applies: L4 → L3 + staged module evaluation → app post-first-frame work (only if the traces show it) → L1 (conditional).
   - **L2 and L5 are skipped**, so T007, T008 and T012 are not run. No S4 or S6 file is touched, `approved-xploder-src.txt` stays empty, and AC7's re-seal clause is met with zero touched files.
   - AC3 closes through its documented-shortfall clause if the final numbers stay under 40 %.
   - L4 and L3 A/B "before" = the T006 clean runs (the product tree is byte-identical to T006's, same host).
5. **Stage 3 G2 (2026-11-03): levers done, at the G2 STOP.**
   - Kept: L4 (T009) and L3 + staged evaluation (T010). Skipped: L2/L5 (G1), and L1 (T011) pending Murphy (it cannot move the remaining AC2 blocker).
   - **AC2 blocked:** one 56–71 ms task remains on every path. It is the `<Canvas>` mount in frozen S8 `TeardownViewer` (three renderer construction 37–46 %, R3F root + first render 22–31 %, xploder scene 17–27 %), plus 1–7 dropped frames (`evidence/T010-log-longtask-profile.txt`, `T014-log-ac2.md`).
   - **AC3 shortfall:** −13.4 % on the project paths and −1.5 % / −10.3 % on home, with the ceiling documented in `evidence/T013-log-before-after.md`.
   - AC4 passes. AC5 = L3.
6. **G2 decision (Murphy, 2026-11-03, 5h 42%): "accept defaults. go".**
   - AC2 is recorded as **blocked by frozen S8 `<Canvas>` mount + dependency internals**, with the evidence. The real fix would be a brief revision allowing S8/Canvas changes; none is requested.
   - **L1 (T011) is skipped.**
   - G3 starts. Pushing the branch and opening a **draft PR** at T017 is approved.
   - **T015 constraint:** home initial JS has only 25 B of headroom against T006. The flag is therefore an inline build-time check at the two call sites, which compiles away to the T014 code when off. The flag-off build's initial route chunks must be byte-identical to T014's.
7. **Stage 3 G3 (2026-11-03): eager-hydration experiment done, at the G3 STOP.**
   - Flag `NEXT_PUBLIC_EAGER_3D` → `compiler.define __XP_EAGER_3D__`, off by default, compiling away to byte-identical output.
   - Local result: eager perf 1.00 and TBT 2–3 ms on both routes.
   - **Binding result (CI runner, run 41583093379):** eager home perf 0.955 / TBT 248.5 ms, eager project perf 0.89 / TBT 441.5 ms → **AC6 verdict: keep the gate** (D-19 stays).
   - Draft PR #17 is open, and all 12 checks are green on `d753931`.
8. **G3 decision (Murphy, 2026-11-03): "defaults all. go".** AC6 verdict accepted (keep the gate; the D-19 decision stays with Murphy outside the slice). `eager-3d.yml` is kept until Murphy decides on D-19, then removed. G4 starts.
