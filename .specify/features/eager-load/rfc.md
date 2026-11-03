# RFC — S11.7 Eager Load Path

**slice:** S11.7-eager-load · **status:** APPROVED at Gate 1 (2026-11-03): all §7 defaults accepted; refinements R1–R10 recorded (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-11.7-eager-load.md` (frozen brief v1) · **branch:** `task/s11.7-eager-load` · **base:** `7833b28` (product tree = S11.6 final `2fd19f0`) · **date:** 2026-11-03

> This RFC records design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins and the conflict is raised as an open question (§7). **Nothing was built, run or profiled for this RFC.** AC1 profiling is Stage 3's first measurement task, by design. The only inputs are S11.5/S11.6 committed evidence and a static source read (`evidence/RFC-log-static-read.txt`). Every number below that does not come from that evidence is labelled **estimate**.

---

## 1. Context (from the brief)

- **Mission:** S11.5/S11.6 stopped the `<Canvas>` mount from being the blocker. The blocker now is the **eager load path**. On a slow-class CI runner, react-dom tasks of ≈ 200 ms (simulated) at ≈ 4 s dominate TBT, and that flips the eager verdict to fail. The slice either makes the teardown appear **with zero interaction** on a slow-class host, or proves that impossible with numbers and keeps the gate.
- **Scope order:** app-side first:
  1. mount after hydration;
  2. split or defer hydration work;
  3. idle preload/warm of the 3D chunk.

  An engine change happens only once app-side work is exhausted, under a named and re-sealed exception. **No exception is requested at freeze.**
- **Timebox:** one attempt cycle. If AC3 fails on both slow-class attempts, the verdict is "keep the gate".

### Acceptance criteria (verbatim, inviolable)

- **AC1 — baseline first, on the slow class.** Before any optimisation commit: eager and gated builds measured on the **same** slow-class attempt (Lighthouse `benchmarkIndex` **1,900–2,600**), both routes, with per-task attribution of the react-dom work (the ≈200 ms tasks named by function). Evidence: traces + per-task table. No optimisation commit may precede it.
- **AC2 — frame honesty (per the S11.5/S11.6 lesson).** During the first 5 s after load (eager path): **no task > 50 ms** on either route on the slow class; dropped frames reported on an **explicitly named harness mode** with a bound of **≤ 2 frames per route** (the harness's own rAF recorder is excluded from the gate and stated in the evidence).
- **AC3 — the retirement gate (two attempts, both routes).** On **two independent slow-class attempts** (`benchmarkIndex` 1,900–2,600), both `/` and `/projects/websocket-inspector` must satisfy **either**:
  - (a) eager Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**; **or**
  - (b) **eager − gated TBT ≤ +50 ms** on the *same attempt*, with gated TBT measured on that attempt.
  Same-attempt comparison is the tie-breaker; a fast-runner pass alone does not satisfy this AC.
- **AC4 — bytes with an explicit budget.** Client JS initial per route may grow by **≤ +2 KB gzip** versus the pre-slice baseline (offset budget, not "≤ previous"), and total JS must not grow by more than 1 %; both reported per route.
- **AC5 — the user-visible outcome.** On the slow class, with **zero interaction**, the teardown canvas is visible and animating (ambient idle) **within 2.5 s of load** on both routes; with `prefers-reduced-motion`, the poster remains and no canvas mounts.
- **AC6 — verdict and fallback contract.** If AC3 fails on either attempt, the interaction gate stays the default, the eager path remains flag-only (`NEXT_PUBLIC_EAGER_3D=1`), and the failure is documented with the per-attempt numbers. If AC3 passes twice, the gate is retired and D-19 is amended — Murphy's call, on the numbers.
- **AC7 — CI, surfaces, housekeeping.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, `perf: eager-3d (measurement)`); frozen surfaces S2–S8 empty **unless** a named exception is approved in the RFC and re-sealed with a note; `eager-3d.yml` retained until the D-19 decision is recorded.

### Starting point (S11.6 evidence, `.specify/features/staged-canvas-mount/evidence/T011-log-eager-verdict.md`)

| Runner attempt | benchmarkIndex | Route | Eager perf / TBT | Gated perf / TBT | Eager − gated TBT |
|---|---:|---|---|---|---:|
| run 2 (slow) | ≈ 2,150–2,250 | `/` | 0.95 / 260 ms | 0.995 / 91 ms | **+169 ms** |
| run 2 (slow) | | project | 0.87 / 506 ms | 1.00 / 83 ms | **+423 ms** |
| runs 1, 3 (fast) | ≈ 3,750–4,000 | both | 0.99–1.00 / 62–106 ms | 1.00 / 40–43 ms | +23 … +63 ms |

- **Slow-runner attribution** (Lighthouse long-tasks audit, blocking = Σ(dur − 50)):
  - eager project: react-dom `1kgrt2f4mrm63.js` 189 ms, `10kujx8nsd3ck.js` 103 ms (107 ms in gated too, so it is not the 3D path), `3vwpvuyn90046.js` 99 ms, three 83 ms, document 46 ms, R3F 35 ms;
  - eager home: react-dom 126 ms, `10kujx8nsd3ck.js` 81 ms, three 71 ms.
- **Local** (Apple M4, benchmarkIndex ≈ 4,200): eager TBT ≤ 1 ms on both routes (S11.6 T010).

---

## 2. Static read: the eager load path today

Details and line references: `evidence/RFC-log-static-read.txt`.

### 2.1 Order of work (both routes)

1. HTML + poster paint. Framework chunks are evaluated, then the client islands are hydrated: HeroLive / ThemeToggle / NavProjectsLink on `/`, and WorkbenchLoader on the project route. App hydration is small. The framework runtime is the bulk, and the gated build pays it too.
2. The island's `useEffect` runs **after its hydration commit**. The hero then checks reduced motion and saveData. Both routes wait for `load` (plus `visible` on the hero), then `requestIdleCallback`.
3. Boot: `import(boot chunk)` → `import('three')` → yield → `import('@react-three/fiber')` → yield → `import(stage or client chunk)` → yield. Each `import()` evaluates its whole module graph **in one task**.
4. `startTransition(mount)`. The transition render is time-sliced (5 ms), but a single component render is not split: e.g. `TeardownViewer`'s first render calls `hasWebgl()`, which creates and loses a WebGL context. **The commit is synchronous.**
5. **Project route only:** `WorkbenchClient`'s `useLayoutEffect` calls `setPortalTargets` inside the commit. That is a sync-lane re-render in the same task, which renders and commits the dock and the explore panel portals.
6. S11.6 factory: renderer construction in its own task → R3F configuration in the next task → `rerender()` (a default-lane, **non-sliced** re-render of `TeardownViewer`) → scene mount → first content frame (rAF).
7. **Reveal:** `onFirstFrame` → `setState('revealed')`. This is a default-lane update, so it is a **synchronous, non-sliced re-render of the whole live tree**:
   - hero: HeroStage → LiveViewer → TeardownViewer, because a new `<HeroStage>` element is created and nothing is memoised;
   - project: all of WorkbenchClient, i.e. viewer + dock + explore panel.

### 2.2 What "coinciding at load" most likely is (reasoning, verified in AC1)

- **Real time.** The eager boot cannot start before its island has hydrated and `load` + idle have fired. So in real time, hydration and the viewer render are **not** in the same task (§2.1 step 2).
- **Simulated time.** Lighthouse runs with `throttling: simulate`. Lantern rebuilds the observed trace as a dependency graph, multiplies each main-thread task by 4, and treats timer and idle waits as edges, not durations. The idle gaps therefore collapse, and the eager tasks land right after hydration ("≈ 4 s").
- **Consequence for the lever choice (F1).**
  - Moving the mount later in real time does **not** change simulated TBT.
  - Each task contributes `max(0, 4·d − 50)` ms, where *d* is its observed duration on the measuring host.
  - A task is TBT-free only when **d ≤ 12.5 ms on the slow-class runner** (≈ 6.8 ms on the local M4, **estimate** from the 1.85× index ratio).
  - So AC3 is a **task-size** problem, not a sequencing problem.
- **What sequencing still buys:** real frames (AC2), and keeping hydration and boot tasks from merging (§2.1 steps 2–4 should already prevent that; AC1 checks it).

### 2.3 Why the slow runner differs by ≈ 4×, not 1.85× (hypotheses for AC1)

The ≈ 200 ms simulated react-dom tasks mean ≈ 50 ms observed on the runner. Locally, every eager task is under 12.5 ms. The host speed ratio alone (1.85×) does not explain that gap. Candidates, in order of the static evidence for them:

| # | Hypothesis | Static evidence | Owner |
|---|---|---|---|
| H1 | **Software WebGL on the GPU-less runner** inflates GL work inside React tasks: `hasWebgl()` context creation in the transition render, and the R3F configuration/scene-mount commit. Locally this work runs on ANGLE Metal | the runner renderer string has never been recorded (S11.5 C2 was local only); the cost scales with host, not code | engine (S8) / host |
| H2 | **Non-sliced default/sync-lane re-renders of the whole live tree**: reveal (step 7), the portal layout effect (step 5), S11.6's `rerender()` (step 6) | project route > home (189 vs 126 ms react-dom), which matches the extra dock + explore panel subtree that only the project route re-renders | app (steps 5, 7) / engine (step 6) |
| H3 | **Large single-task module evaluation**: `three` (83 ms), `3vwpvuyn90046.js` (99 ms, unidentified), R3F (35 ms) | one `import()` per graph | app (`build/stage-3d.ts`, chunking) |
| H4 | Hydration / framework tasks on the slow host | `10kujx8nsd3ck.js` is ≈ equal in eager and gated, so it cancels in AC3(b) but counts in AC3(a) | framework (app boundaries only) |

AC1's per-task attribution decides between them. The lever order in §3 D3 is a **default that the AC1 numbers can reorder** at the Stage 3 G1 STOP.

### 2.4 Findings from the read

- **F1:** see §2.2. Lighthouse-simulated TBT is decided by task size on the measuring host. Sequencing alone cannot move AC3.
- **F2:** the runner's WebGL backend is unrecorded. If headless Chromium on the runner has **no** WebGL, then `hasWebgl()` is false, the a11y fallback renders, and **no canvas mounts on the runner at all**. AC5 would then be unprovable there, and the runner's eager numbers would measure the fallback path. AC1 records the renderer string first (§3 D1, Q6).
- **F3:** "ambient idle" is already defined by S10 (site-shell RFC Q2, spec L53): the live view at rest, rendered on demand, no timed motion. `frameloop="demand"`. AC5's "animating (ambient idle)" is read against that definition (Q9).
- **F4:** **the eager project route ignores `prefers-reduced-motion`** (and saveData). `WorkbenchLoader`'s eager branch waits only for `load` + idle. So in an eager build, AC5's reduced-motion clause fails on `/projects/websocket-inspector` today (static read; the AC1 probe confirms it). The hero already skips correctly.
- **F5:** `hasWebgl()` is not exported from `xploder/react`. The app cannot warm the probe early without an engine change.
- **F6:** `git diff 44d025b 7833b28 -- apps packages tools .github` is empty. The pre-slice baseline is S11.6's merged product.
- **F7:** Orca created this worktree on `TimurHaryo/task-s11.7-eager-load`. It was renamed to `task/s11.7-eager-load` before any commit (global branch rule).
- **F8:** the usage file is stale (captured 2026-10-29). Current 5h/7d usage is **unknown**; please check `/usage` before Stage 3.

---

## 3. Technical decisions

### D1 — Slow-class selection and verification (AC1, AC3, AC2/AC5 host)

- **Host class:** an **attempt** is one CI job on one runner VM. It measures the gated and eager builds of the same commit, both routes, in that one job.
- **Qualification:** an attempt is **slow-class** iff **every** Lighthouse run in it (gated + eager, both routes, all invocations) reports `benchmarkIndex` within **[1,900, 2,600]**. A single run outside the range disqualifies the attempt. Disqualified attempts are published as informational and never counted.
- **Recorded per attempt** (`meta.json`):
  - runner name and image version, run id + attempt number, job id;
  - Chromium version;
  - min/median/max `benchmarkIndex`;
  - **WebGL `UNMASKED_RENDERER` string and the GL backend** (F2).
- **Independence (AC3):** the two attempts are distinct jobs on distinct VMs (different runner names). Either a `gh run rerun` or a different matrix shard gives that (Q3).
- **Getting slow attempts.** GitHub-hosted runners land on either host class at random (S11.6 saw ≈ 2,200 and ≈ 3,900).
  - The new measurement workflow (D2) runs a **matrix of 3 identical shards**, which raises the chance of a slow-class hit per run.
  - **Cap:** at most **10 qualifying-or-not attempts per measurement phase** (AC1, and the verdict). If fewer slow-class attempts arrive than needed, the slice STOPs and escalates with the index log (Q4).
- **Local host role** (Apple M4, ≈ 4,200): A/B and diagnosis only, **never binding**.
  - **Slow-class emulation**, informational: headless Chromium with `--use-angle=swiftshader` (the runner's likely GL path, F2), plus a Lighthouse `cpuSlowdownMultiplier` scaled to `4 × (local index ÷ 2,200)` (≈ 7.6, **estimate**). This approximates the runner's simulated TBT locally.
  - Every emulated number is labelled "local emulation". It is checked once against the AC1 slow attempt (drift table), so that local A/B is trusted only as far as it tracks the runner.

### D2 — Harness wiring (additive, `tools/perf` + one new workflow; defaults byte-identical)

1. **`perf:lighthouse --profile`**, profiled runs only:
   - sets `additionalTraceCategories: 'disabled-by-default-v8.cpu_profiler'`;
   - saves the trace (gzip) and devtools log next to the summary.
   - Profiled runs are a separate run kind and **never** enter verdict medians (sampling overhead).
2. **`lh-attribution`** (new CLI). For each Lighthouse long task (simulated start/duration, URL), it finds the observed trace task (matched by URL, order and `observed ≈ simulated ÷ 4`). It then lists that task's sampled self time by function and by chunk → module, using the `bundle:manifest` of the same build (S11.6 `cpu-profile.ts` summariser, reused). Output:
   - `per-task.json`;
   - a markdown table: build · route · simulated start/dur · observed dur · TBT share · top functions ≥ 5 % · module · hypothesis H1–H4.

   **This is AC1's "≈ 200 ms tasks named by function".**
3. **`fps:engine --scenario load`** (new scenario; `explode`/`tour`/`startup` stay byte-identical, with tests):
   - eager build, production route, **no engagement**, mobile profile, CDP CPU throttle per Q7 (default 4×);
   - window = `load` event → `load` + 5 s, plus pre-load tasks reported separately;
   - long tasks from the trace, every task that **intersects** the window.
   - `--frames trace-only|recorder`. **Named mode for AC2 = `trace-only`:** no harness rAF loop; dropped frames = Compositor `DroppedFrame` events in the window (S11.6 T005 method, now committed). `recorder` (S11.6's `measureFps` loop) is reported alongside as **informational and excluded from the gate**, and the evidence says so in writing.
4. **`eager:probe`** (new CLI, AC5; §3 D6) on both routes, normal and reduced motion.
5. **`eager-verdict` extensions** (additive): per-attempt qualification (D1), the AC3 rule per route per attempt ((a) or (b)), and the two-attempt verdict. The existing aggregation is reused unchanged: median of 3 per invocation, mean of 2 invocations.
6. **New workflow `eager-load.yml`** — `perf: eager-load (slow-class measurement)`, measurement-only, not a required check.
   - Trigger: `pull_request`, with `if: github.head_ref == 'task/s11.7-eager-load'` so other PRs don't pay for it.
   - Matrix `shard: [1, 2, 3]`.
   - Per shard:
     1. build gated + eager;
     2. record host meta;
     3. run the eager-3d protocol (`perf:lighthouse` ×2 per route per build);
     4. one profiled Lighthouse run per route per build;
     5. `fps:engine --scenario load` ×2 per route;
     6. `eager:probe` ×2 per route (+ reduced motion ×2);
     7. `bundle:manifest`;
     8. upload everything (traces gz).
   - `eager-3d.yml` is **not edited** (AC7). Its jobs use the same Lighthouse protocol, so a slow-class `eager-3d` job also counts as an AC3 attempt, but only for the Lighthouse half.
7. **Sanitising** (existing S11.5 rules): absolute paths → `<local-path>`, runner home → `<runner-home>`, the origin port → `PORT`. Traces are checked by gitleaks before commit.

### D3 — Candidate app-side levers, ranked by expected payoff ÷ risk (final order = AC1 numbers)

The design target per task is **≤ 12.5 ms observed on a slow-class host**, i.e. ≤ 50 ms simulated, so zero TBT (F1). It is a design target, not an acceptance bar.

| Rank | Lever | Mechanism (app-side only) | Targets | Expected effect (**estimate**) | Risk |
|---|---|---|---|---|---|
| **1** | **L1 render-lane hygiene** | Stop app-side state changes from re-rendering the live tree synchronously. **Reveal:** memoise the `<HeroStage>` / `<LiveViewer>` element (`useMemo`, stable callbacks), so `setState('revealed')` re-renders only the wrapper `div`'s attribute. **Portals:** resolve the dock/tour targets before the first render (they are server-rendered siblings), not in a `useLayoutEffect` + `setState`, so the mount commit has no sync re-render | H2, steps 5 + 7 | removes 1–2 full-tree sync re-renders per route. Largest on the project route (dock + explore panel) | low. Same final DOM and attributes; reveal timing unchanged (same rAF) |
| **2** | **L2 staged composition (project route)** | Mount the viewer first (transition), then the dock + explore portals in a **second transition** after the viewer commit. Reveal waits until both are mounted, so every post-reveal frame is unchanged. Tour/panel props and behaviour are unchanged | H2, step 5 | splits the biggest project-route commit into two | medium: the order "dock appears ≤ reveal" must hold. Covered by parity shots + reveal-sequence probe |
| **3** | **L3 staged module evaluation + idle warm** | Split `STAGES_3D` into finer ordered stages (sub-surfaces of `build/three-surface.ts`, then R3F, then the viewer/xploder chunk, then the stage/client chunk), with a yield between each, so each `import()` evaluates a smaller graph in its own task. Right after poster paint + idle, **prefetch** (`<link rel="prefetch">`, injected by the boot) every 3D chunk, so later stages only evaluate | H3 (three 83 ms, `3vwpvuyn90046.js` 99 ms, R3F 35 ms) | each evaluation slice under the design target; network overlap helps AC5 | medium: Turbopack may merge chunks or hoist shared modules (checked against the `bundle:manifest` chunk map); a few hundred bytes of non-initial JS (AC4 total ≤ +1 %) |
| **4** | **L4 post-hydration sequencing** (brief scope 1) | Start the eager boot only after the hydration commit **and** the framework's post-hydration work have settled (e.g. `load` → first idle → one more idle), never inside a hydration task. Zero interaction is still required | H4 (real time), AC2 frames | ≈ 0 on simulated TBT (F1); fewer real long tasks / dropped frames near load | low. Costs AC5 time (budgeted in D6) |
| **5** | **L5 hydration islands / deferral** (brief scope 2), conditional | Only if AC1 attributes app-component hydration tasks > 12.5 ms observed. Then narrow the client boundary (e.g. split HeroLive's effect host from its markup) or defer a non-visible island's hydration | H4 | helps AC3(a) only (hydration cancels in (b)) | medium: RSC boundaries, CLS 0 |
| **0** | **L0 reduced-motion parity (correctness, not an optimisation)** | The eager branch of `WorkbenchLoader` gets the hero's guards: reduced motion → no boot (plus a `change` listener that aborts), and saveData → no boot (Q10). The click path is unchanged | F4, AC5 | AC5 reduced-motion clause on the project route | low. Eager-only code path |
| — | **Rejected** | Delaying the mount beyond Lighthouse's TTI window or past 2.5 s (games the metric, breaks AC5); Canvas prop changes (`dpr`, `antialias`, `frameloop`) (visual); removing or skipping `hasWebgl()` (a11y, engine); any `xploder/src` edit (no exception, Hard Rule 6); a new client library; lowering any budget | | | |

**If AC1 attributes the bulk to engine-owned work** (H1: `hasWebgl()` / R3F configuration under software GL; H2 step 6: S11.6's `rerender()`): app-side levers cannot reach it. The orchestrator then **STOPs at G1 with an exception request**: the named file(s), the change, the expected Δ and a re-seal plan. Nothing in `packages/xploder/src` lands without Murphy's explicit approval + a re-seal note (Hard Rule 6).

### D4 — Lever discipline (within one attempt cycle)

- **One lever, one commit, one A/B.** The A/B runs locally:
  - slow-class emulation Lighthouse ×2 per route;
  - `fps:engine --scenario load` ×2 per route (trace-only, at the Q7 throttle);
  - `perf:lighthouse --profile` attribution of the changed tasks.
- **Keep rule (S11.5 D6 / S11.6 D5):** Δ must exceed the larger run-to-run spread. Otherwise the lever is reverted and recorded as "no measurable win".
- **Stop rule:** a lever runs only if a measured blocker remains that it targets (an attributed task above the design target, or an AC2 failure). Levers are never stacked "just in case".
- **One attempt cycle:** levers L0–L5 are a single pass. The CI verdict (D7) runs **once**, on the final lever state. If AC3 fails on both slow-class attempts, the slice closes "verdict: keep gate", with no second lever round (Hard Rule 5).
- **Ordering proof:** a guard `BASELINE-FIRST-OK` checks from `git log` that the AC1 artifact commit precedes the first commit touching `apps/web/components/**`, `apps/web/build/**` or `apps/web/app/**`.

### D5 — Per-task attribution method (AC1)

- **Source of truth:** the **profiled Lighthouse runs** on the slow-class attempt (D2.1). They are the same tasks Lantern scores, with V8 samples attached.
- **Cross-check:** `fps:engine --scenario load` traces from the same job. They give the observed durations at the Q7 throttle, and the real-time gap between hydration and boot (verifies §2.2).
- **Table, per build × route:** every task whose simulated duration is > 50 ms, with:
  - simulated start/duration and observed duration;
  - its TBT contribution;
  - the attributable URL → chunk → module;
  - the **top functions by self time** (≥ 5 %);
  - the §2.3 hypothesis it supports.

  It explicitly names the ≈ 200 ms react-dom tasks.
- **Lantern check:**
  - observed vs simulated timelines for one eager run, showing the idle gaps collapse (F1);
  - Σ max(0, 4·d − 50) over the observed tasks, compared with Lighthouse's TBT within the run-to-run spread.

### D6 — AC5 probe: what "zero interaction within 2.5 s" means

`eager:probe`, on the slow-class attempt, eager build, both routes, **2 runs each; every run must pass** (binary, not a median):

1. **Context:** a fresh browser context, Lighthouse mobile screen + UA, light scheme, **host-native CPU** (the slow-class host is the condition, Q8), no network throttle (local `serve:out`).
2. **Zero interaction:**
   - the probe never calls `mouse`, `keyboard`, `touchscreen`, `hover`, `focus`, `click` or `scroll` APIs, and navigates with `page.goto(url, { waitUntil: 'commit' })`;
   - an init script counts **trusted** `pointer*`, `mouse*`, `touch*`, `wheel`, `scroll`, `keydown`, `focusin` and `click` events in capture phase;
   - **count = 0** up to the deadline, or the run fails.
3. **Clock:** t0 = `performance.timeOrigin` (navigation start). **Deadline T = t0 + 2,500 ms** (Q8). Times relative to the `load` event are reported alongside.
4. **Pass at T, all of:**
   1. a `canvas` inside the live layer, with a non-zero client rect;
   2. `data-xploder-ready="true"` (the first content frame) was set at ≤ T (MutationObserver timestamp);
   3. live state `revealed` was set at ≤ T, the live layer's computed `opacity` is `1` at T (fade complete), and the poster's computed `visibility` is `hidden`;
   4. **ambient idle** (F3, Q9): the canvas is non-blank at T (an element screenshot with more than one colour and not the bg colour), with no timed motion added. After T the view stays at rest: no tween and no tour.
5. **Reduced motion** (`reducedMotion: 'reduce'`), both routes, 2 runs, observed until `load` + 5 s:
   - **no `canvas` element** in the document, no `data-xploder-ready`;
   - the poster has computed `opacity` 1 and `visibility` visible;
   - informational: whether the three/R3F chunks were requested.
6. **Output:** JSON per run with every timestamp, the event counts and a screenshot at T.

### D7 — AC3 verdict on two slow-class attempts

- Built on the final lever state, through `eager-load.yml` on the draft PR, with reruns per D1 until **two** qualifying attempts exist (cap 10).
- **Per attempt, per route:** eager and gated perf/TBT, aggregated as in `eager-verdict`. The route passes if (a) eager perf ≥ 0.95 **and** TBT ≤ 200 ms, **or** (b) eager − gated TBT ≤ +50 ms on that attempt.
- **AC3 passes** iff both routes pass on both attempts. Fast or mixed attempts are published, but they never count.
- **AC6 branch:**
  - **fail** → the gate stays the default and the flag stays (`NEXT_PUBLIC_EAGER_3D=1`), with per-attempt numbers + attribution in `T0xx-log-verdict.md`;
  - **pass ×2** → the numbers go to Murphy. The retirement happens only on Murphy's word (Q13).

### D8 — Bytes (AC4)

- **Baseline:** the pre-slice product at `7833b28`, built twice (gated and eager), with S11.6's `bundle-scopes.mjs` method (node zlib level 9, per file, summed). It is copied into this feature dir unchanged.
- **Scopes, per build:**
  1. `/` initial;
  2. project initial;
  3. total emitted JS.

  Each is reported raw + gzip.
- **Budget:**
  - initial per route **≤ +2,000 B gzip** (the stricter reading of "2 KB", Q11);
  - total JS **≤ +1 %**, both raw and gzip, vs the baseline of the same build.
- **Placement rule:** new code goes into dynamic chunks (boot / stage modules) wherever possible. Only the guards that must run before the boot (L0) are allowed in initial islands.

### D9 — Visual and behavioural parity (non-goals)

- **Rest-state parity:** the 8 S11.6 shots (2 routes × mobile/desktop × light/dark, engaged → ready → exploded settled → 2 rAF) as decoded RGBA vs the AC1 baseline shots, **0 differing pixels**.
- **Post-eager parity:** the same 8 shots **taken on the eager build with no interaction**, vs the gated baseline, also 0 px. Any diff is a STOP.
- **Draw calls:** `site:probe --group draws` (both routes) + `engine:probe` fixtures = **2**.
- **CLS 0:** Lighthouse (both builds) + `fps:engine --scenario load`.
- **Reveal sequence:** S11.6's ready/reveal sequence probe, before/after. The ordered live-state list and "ready flips in the first instanced-draw rAF" must be unchanged. For L2, the dock/explore portals are mounted ≤ the reveal.
- **Theme, tour, panel and a11y:**
  - the existing app tests and both axe jobs;
  - `site:probe --group hero` (gated build: not revealed at FCP, revealed after interaction);
  - reduced motion = poster only (D6.5).

### D10 — Frozen surfaces, guards, CI (AC7)

- **No exception requested** → `git diff 7833b28 -- packages/xploder` must be **empty**. That keeps S2–S8 empty by construction. Guards in `.specify/features/eager-load/guards.sh`, copied from S11.6 with `B=7833b28`, exit 1 on any failure, run by every task:
  - `FROZEN-OK` / `BRIEF-HISTORY-OK`: brief, kickoff and content vs `B`;
  - `XPLODER-EMPTY-OK`: `git diff --name-only B -- packages/xploder` is empty (it would become `XPLODER-SRC-OK` with an approved list only under an approved exception);
  - `SURFACE-S2…S8-OK`;
  - `BASELINE-FIRST-OK` (D4);
  - `CI-JOBS-OK`: `ci.yml`, `perf.yml` and **`eager-3d.yml` byte-identical** to `B`; `eager-load.yml` is the only new workflow;
  - `VERSIONS-OK` (no dependency change), `DEV-ROUTES-OK`, `GITLEAKS-OK`.
- **CI:** all required checks green on the PR head, including `seo: meta + og`, both axe jobs, the perf gates and `perf: eager-3d (measurement)`. Run URL + `gh pr checks` output in `T0xx-ci-run.txt`.
- **Dependencies:** none added or bumped. **Budgets:** `budgets.ts` untouched.

---

## 4. AC proof map

| AC | Proven by | Artifact(s) |
|---|---|---|
| AC1 | one slow-class attempt (D1) of `eager-load.yml` at the **unmodified** product: gated + eager, both routes; profiled Lighthouse traces + `lh-attribution` per-task table (D5); the Lantern check; host meta incl. GL renderer. Committed before any app optimisation commit (`BASELINE-FIRST-OK`) | `T0xx-log-baseline.md`, `T0xx-per-task-{build}-{route}.json`, `T0xx-trace-{build}-{route}.json.gz`, `T0xx-lighthouse-summary-ci-*.json`, `T0xx-meta.json` |
| AC2 | `fps:engine --scenario load --frames trace-only` on both slow-class verdict attempts, both routes, 2 runs: `maxLongTaskMs ≤ 50` **and** `droppedFrames ≤ 2` per route (median of 2, and both raws published). The `recorder` mode is reported as informational and excluded in writing | `T0xx-fps-load-{route}-{mode}-r{n}-att{k}.json`, `T0xx-log-ac2.md` |
| AC3 | D7 on two independent slow-class attempts, per route per attempt, rule (a) or (b) | `T0xx-lighthouse-summary-ci-*.json`, `T0xx-log-verdict.md` (qualification table, per-attempt verdict, run URLs) |
| AC4 | D8 byte table, both builds, 3 scopes, raw + gzip, Δ vs `7833b28` | `T0xx-log-bytes.md`, `bundle-scopes.mjs` output |
| AC5 | D6 `eager:probe` on both slow-class verdict attempts, both routes, 2 runs each, normal + reduced motion | `T0xx-eager-probe-{route}-{motion}-r{n}-att{k}.json`, screenshots at T, `T0xx-log-ac5.md` |
| AC6 | verdict branch recorded with per-attempt numbers. On fail: the flag stays default-off (eager-flag test). On pass ×2: Murphy's decision recorded | `T0xx-log-verdict.md`, §9 gate log |
| AC7 | CI run on the PR head, `guards.sh` log, surface diffs (empty), workflows unchanged | `T0xx-ci-run.txt`, `T0xx-log-guard.txt` |
| Deliverable | before/after table: per-task attribution, TBT, max task, dropped frames, AC5 times, bytes (AC1 baseline vs final, same protocol) | `T0xx-log-before-after.md` |

---

## 5. Implementation sketch (Stage 2 input; Stage 3 STOPs at each group boundary)

1. **Baselines:**
   - T001: feature guards (`guards.sh`, `B=7833b28`);
   - T002: harness, `tools/perf` only, additive + tests: `--profile`, `lh-attribution`, `--scenario load` with `--frames`, `eager:probe`, `eager-verdict` qualification + AC3 rule, local slow-class emulation flags;
   - T003: `eager-load.yml` + byte baseline script;
   - T004: push + draft PR → reruns until one slow-class attempt → **AC1 baseline committed** (traces, per-task table, Lantern check, AC2/AC5 baselines, bytes, host meta incl. GL backend) + the local-emulation drift check.

   → **STOP G1:** Murphy reviews the attribution. The lever order is confirmed or reordered, and the orchestrator files an engine-exception request if the evidence demands one.
2. **App-side levers** (one commit + A/B each, local):
   - T005: L0;
   - T006: L1;
   - T007: L2;
   - T008: L3;
   - T009: L4 (conditional);
   - T010: L5 (conditional);
   - T011: final local parity, draws, CLS, reveal sequence, bytes.

   → **STOP G2.**
3. **Verdict:** T012 runs `eager-load.yml` on the final state until two slow-class attempts exist, then checks AC2 / AC3 / AC5 on both, and records the verdict.

   → **STOP G3.**
4. **CI and surfaces:** T013 covers the guards, the CI run, the AC self-check and the housekeeping (`eager-3d.yml` kept). If the verdict passed and Murphy says "retire", it also carries the conditional gate-retirement task.

   → **STOP** (end-contract).

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| **F2: no WebGL on the runner** → no canvas on the slow class, AC5 unprovable there, and eager numbers measure the fallback | T004 records the renderer first. If WebGL is missing → STOP + escalate with option Q6 (explicit SwiftShader flag for **both** builds in the slice's workflow only) |
| **H1 dominates** (software-GL cost inside engine-owned tasks) → app levers can't reach it | D3: STOP at G1 with a named exception request. Without approval → verdict "keep gate" with attribution |
| **AC2 at 4× on the slow class** is stricter than any previous host: three's unsplittable `WebGLRenderer` constructor (≈ 25 ms at local 4×, S11.6) scales to ≈ 46 ms (**estimate**), and the first content frame (≈ 30 ms) to ≈ 55 ms | AC1 measures it at baseline, so Murphy sees the gap at G1. An honest miss is escalated (Hard Rule 2), never reworded. Q7 offers the alternative reading |
| Lantern behaves differently from F1 (idle gaps preserved) | D5 Lantern check in AC1. If wrong, L4's rank rises at G1 |
| Slow-class attempts are rare | 3-shard matrix; cap 10 per phase → escalate (Q4) |
| L1 memoisation hides a needed re-render (stale props into the viewer) | memo deps = every prop the viewer reads; tests on reveal + theme + tour; parity + reveal-sequence probe |
| L2/L3 change the pre-reveal sequence | reveal waits for every staged piece; sequence probe before/after; post-eager parity 0 px |
| L3 adds chunks / bytes | non-initial only; total ≤ +1 % (D8); chunk map checked |
| Local emulation diverges from the runner | it is informational only; drift table vs the AC1 attempt; binding numbers always come from CI |
| Executor (DeepSeek Flash 4.1) unavailable (402) or stuck | probe before each wave; stuck ×2 → orchestrator executes (Hard Rule 9); Tier 1.5 skipped-with-record |

---

## 7. Findings and open questions (each with a recommended default)

**Findings:** F1–F8 in §2.4.

**Open questions (the default applies unless Murphy says otherwise):**

1. **Q1 — Measuring host.** **Default:** GitHub-hosted runner attempts qualified per D1 (every Lighthouse run in [1,900, 2,600]) are the only binding host. The local M4 (with SwiftShader + scaled-multiplier emulation) is for A/B only.
2. **Q2 — New workflow.** **Default:** add `eager-load.yml` (measurement-only, not required, runs only for this slice's head branch, 3-shard matrix) and leave `eager-3d.yml` byte-identical (AC7). `eager-load.yml` is removed together with `eager-3d.yml` once D-19 is decided.
3. **Q3 — "Independent attempts".** **Default:** distinct jobs on distinct runner VMs (different runner names); matrix shards and reruns both qualify. **Alternative (stricter):** they must come from different workflow-run attempts.
4. **Q4 — Attempt cap.** **Default:** at most 10 attempts per phase (AC1 baseline; verdict). If fewer than the needed slow-class attempts arrive → STOP + escalate with the index log. No local emulation is substituted.
5. **Q5 — Push + draft PR early.** **Default:** approved now for T004, because the AC1 baseline needs a CI attempt. The orchestrator merges only on your "merge".
6. **Q6 — Runner without WebGL (F2).** **Default:** if T004 shows no WebGL on the runner, STOP + escalate, recommending a `--use-angle=swiftshader` (+ `--enable-unsafe-swiftshader` if needed) flag for both builds in `eager-load.yml` only, so the measured path is the real canvas path. `eager-3d.yml` stays as it is.
7. **Q7 — AC2 CPU condition.** **Default:** the existing startup protocol, **CDP 4× CPU on the slow-class host** (consistent with S11.5/S11.6 and with Lighthouse's 4× view, and closest to the mid-range-phone design target). Host-native numbers are reported alongside, informational. **Alternative:** host-native only ("the slow class" as the whole condition). That is looser, and it would be your call, not mine.
8. **Q8 — AC5 clock and CPU.** **Default:**
   - deadline = **navigation start + 2.5 s** (stricter than "after the load event"), with load-relative times also reported;
   - host-native CPU on the slow-class host, with no CDP throttle (a 4× informational run is published);
   - the wait budget stays **2.5 s**: no complexity drop justifies 3 s.
9. **Q9 — "Visible and animating (ambient idle)".** **Default:**
   - visible = canvas mounted, the first content frame drawn, revealed, and the fade complete at T;
   - animating (ambient idle) = the S10 definition (F3): the live view at rest, rendered on demand, non-blank. No timed motion is added, because that would be a visual and motion-token change (non-goal).
10. **Q10 — L0 guards.** **Default:** the eager workbench branch gets the hero's reduced-motion skip (required by AC5) **and** its saveData skip (parity with the hero, eager path only).
11. **Q11 — "2 KB".** **Default:** 2,000 B gzip per route initial (the stricter reading). Total ≤ +1 % on both raw and gzip, per build (gated and eager).
12. **Q12 — Lever order.** **Default:** L0 → L1 → L2 → L3 → L4 (conditional) → L5 (conditional), reordered at G1 from the AC1 attribution. Engine-owned blockers → an exception request at G1, never an engine edit without your approval.
13. **Q13 — Retirement on pass ×2.** **Default:** the orchestrator presents the numbers. On your "retire", a final in-slice task makes the eager path the default build (gate code kept behind the inverse flag for one slice), the default build's perf gates re-run, and D-19's amendment is recorded. `eager-3d.yml` + `eager-load.yml` are removed only after the D-19 amendment is recorded. On a fail, nothing changes in the default build.
14. **Q14 — Executor and escalation.** **Default:**
    - Tier 1 = DeepSeek Flash 4.1, probed before each wave; browser/perf tasks run with the sandbox off;
    - stuck ×2 → the orchestrator executes personally (Hard Rule 9), with the usage reported;
    - Tier 1.5 dormant (skip-with-record);
    - every task reports its finishing tier.
15. **Q15 — Evidence retention.** **Default:** CI artifacts (14-day retention) are downloaded and committed for every **counted** attempt (traces gzip, sanitised). For non-qualifying attempts, only the summaries + meta are committed.

---

## 8. Stage-1 hand-off

**WHAT MURPHY SHOULD TEST/VALIDATE**
1. F1 (§2.2): you accept that Lighthouse-simulated TBT is a task-size problem on the measuring host. "Mount after hydration" helps real frames (AC2), not AC3. That is why L1–L3 rank above L4.
2. F2 / Q6: the runner may render with software WebGL, or none. T004 checks this first and STOPs if the canvas cannot mount there.
3. F4 / L0: the eager project route mounts 3D under reduced motion today. The fix is an eager-only correctness change.
4. The D3 lever ranking and touch set: `apps/web/components/{hero,workbench,boot-3d}`, `apps/web/build/stage-3d.ts`, plus additive `tools/perf` and one new workflow; `packages/xploder` untouched.
5. The AC2 risk (Q7): at 4× on the slow class, three's renderer constructor and the first content frame may sit near or above 50 ms. AC1 shows it before any lever work.
6. `evidence/RFC-log-static-read.txt`.

**WHAT THE AGENT NEEDS FROM MURPHY** (the defaults apply if you say nothing)
1. Answers to Q1–Q15. Default: all §7 defaults.
2. Current 5h/7d usage from `/usage` (F8). Default: Stage 2 proceeds, and usage is asked again before the Stage 3 dispatch.
3. "approved" (or feedback) to start Stage 2 (spec/plan/tasks).

---

## 9. Gate log

1. **Stage 1 (2026-11-03):** RFC drafted on `task/s11.7-eager-load` (F7 branch rename before any commit).
2. **Gate 1 (Murphy, 2026-11-03, 5h 58%):** "all defaults. approved". Q1–Q15 = the §7 defaults.
3. **Stage-2 re-check of the defaults against the code.** These are refinements R1–R10. None of them changes an AC.
   - **R1 (F1 confirmed in the Lighthouse source).** Lantern scales every CPU node by the multiplier (`@paulirish/trace_engine` `lantern/simulation/Simulator.js` L244: `duration × multiplier`, capped at 10 s). It links `TimerInstall`/`TimerFire` as graph edges with no delay (`lantern/graph/PageDependencyGraph.js` L252-269). So F1 is a source fact, not an assumption. D5's Lantern check stays as empirical confirmation on the AC1 attempt.
   - **R2 (profiler category).** LH 13.6 ships `disabled-by-default-v8.cpu_profiler` commented out ("TODO: Re-enable after investigating b/325659693", `core/gather/gatherers/trace.js` L67-70). `additionalTraceCategories` is a supported setting (`core/config/constants.js` L83). **Fallback:** if profiled runs fail or carry no `ProfileChunk`, the per-task table uses `perf:startup --engage none --cpu-profile` from the same attempt, joined by URL and order. The log names the source.
   - **R3 (cross-check tool).** `perf:startup` already has CPU-profile attribution, `benchmarkIndex` and the WebGL renderer in its meta. It gains `--engage none` (t0 = the `load` mark) as the AC1 cross-check / R2 fallback, instead of a new profiler in `fps:engine`.
   - **R4 (eager-verdict contract).** `eager-3d.yml` pipes `eager-verdict`'s default output into the step summary, so that output stays byte-identical (golden test on S11.6 T011 run-2 summaries). The S11.7 rule lives behind `--rule s11.7`. The **first two qualifying attempts in time order** decide AC3, so that no attempt can be cherry-picked.
   - **R5 (byte helper).** S11.6's `bundle-scopes.mjs` exits 1 on any growth (S11.6's "≤ previous" rule). The S11.7 copy gains `--budget`: initial gzip Δ ≤ 2,000 B per route, total Δ ≤ 1 % raw and gzip. Non-initial 3D is reported, informational.
   - **R6 (structural app tests).** `stage-3d.test.ts` pins `STAGES_3D` to exactly `three` + R3F, and `eager-flag.test.ts` pins the eager branch's shape. L3 and L0 update them **in the lever commit**, keeping their intent: `stage-3d` imported only by `boot-3d`, the flag read only by `next.config.ts`, the gated branch unchanged. They are not frozen surfaces.
   - **R7 (L1 is feasible app-side).** `useTeardownViewer` and `useViewerPanels` return memoised handles (`useTeardownViewer.ts` L262-304, `useViewerPanels.ts` L97-104). So a memoised `<LiveViewer>` element bails out on the reveal update. The portal targets can be resolved by `WorkbenchLoader`, which already locates `[data-site-workbench]` (L16), and passed down, which removes the layout-effect `setState`.
   - **R8 (harness + guards).**
     - `fps:engine --scenario load` builds with `pnpm build:eager` unless `--no-build`. A run whose page never sets `data-xploder-ready` is invalid (exit 1), because it measured no eager path.
     - Guards add `APP-TOUCH-OK` (an allowlist of the app files the levers may touch, `app-touch.txt`), `FLAG-DEFAULT-OK` (AC6: gated stays default unless retired), `BUDGETS-OK` and `XPLODER-EMPTY-OK`.
     - `BASELINE-FIRST-OK` is anchored on `evidence/T006-log-baseline.md`.
   - **R9 (task structure).**
     - The RFC §5 sketch becomes T001–T015 (+ T015b, only on "retire").
     - Host meta is a small `perf:host` CLI (it also reports what `--gl swiftshader` yields locally).
     - The local A/B + non-goal checks are one standing `lever-block.sh`, written in T006 and sourced by every lever task.
     - CI-side steps (push, PR, reruns, downloads) are the orchestrator's; the executor writes tables from downloaded artifacts.
   - **R10 (post-eager parity needs a no-input mode).** `perf:parity` always engages with `page.mouse.move` (`cli/parity.ts` L314). D9's "post-eager frames with no interaction" therefore needs an additive `--no-engage`. The engaged default is byte-identical.
4. **Stage 3 G1 (2026-11-04): AC1 baseline committed (T006 `adfe955`) before any app commit.**
   - Attempt `41734234159-1-s3` is slow-class (every Lighthouse run 2,114–2,351). Shards s1/s2 are fast and not counted. The runner renders WebGL with SwiftShader on Vulkan, so F2 does not block.
   - The ≈ 200 ms react-dom tasks are named (`evidence/T006-log-baseline.md` §4). On the project route it is the first content frame + the lettering label placement; on home it is the R3F commit → the camera-fit layout effect. Both are engine-owned. App-reachable cost is the module evaluation of the xploder and three chunks.
   - F1 is confirmed in practice: observed × 4 = simulated, and the idle gaps collapse.
   - **AC2 is escalated as blocked** for app-side work (§8.3).
   - Proposed:
     - lever order L0 → L3a (now also staging the xploder graph) → L1 → L2 (conditional);
     - L3b, L4 and L5 pre-skipped with evidence;
     - engine exceptions E1/E2 described, recommendation "decline now, re-ask at G2".
