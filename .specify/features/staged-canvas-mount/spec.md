# Feature Specification: S11.6 Staged Canvas Mount

**Feature dir:** `.specify/features/staged-canvas-mount/` · **Slice:** S11.6-staged-canvas-mount · **Created:** 2026-11-03 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-11.6-staged-canvas-mount.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved at Gate 1, 2026-11-03: all §7 defaults; refinements R1–R9 in §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Deliverables 1–5 appear as supporting requirements (SR) under the FR they serve and get task-level checks, not criteria of their own. Definitions the brief leaves open come from the approved RFC defaults. They are referenced, not promoted to criteria.
>
> **Definitions on record (RFC Gate 1 defaults):**
> - **Protocol** = S11.5 D2: local production export, Lighthouse mobile screen/UA, CDP 4× CPU, network unthrottled, headless Playwright Chromium (ANGLE Metal on this host). Exactly 2 runs per measurement, median = mean of 2, both raws published. A spread above 20 % → flagged, repeated, all runs kept (RFC D1, Q1).
> - **"Before"** = the AC1 re-baseline, never S11.5's numbers. Drift above 20 % is flagged (RFC Q2).
> - **Engagement paths** = hero `/` pointer move; project `/projects/websocket-inspector` pointer move **and** the "Explore 3D" click.
> - **First content frame** = the first frame rendered by `Stats` (priority-1 `gl.render`), the one that sets `data-xploder-ready="true"` (RFC D4).
> - **AC3 "per scope"** = home initial JS, project initial JS, total emitted JS and non-initial 3D JS, each raw **and** gzip (node zlib level 9, per file, summed) ≤ the S11.5 final as re-measured in AC1 (RFC D6, Q9).
> - **AC3 parity** = 8 rest-state shots (2 routes × mobile/desktop × light/dark), decoded RGBA, 0 differing pixels vs the AC1 re-baseline shots.
> - **AC5 host** = the CI runner (`eager-3d.yml` on the PR), 2 independent workflow runs. Local eager numbers are published alongside (RFC D7, Q12).
>
> **Evidence doctrine (kickoff Hard Rule 7):** every number (ms, dropped frames, long tasks, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`. Every measurement is two runs, median reported. Perf claims use the dropped-frames / long-task style only.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Starting the 3D never stutters (Priority: P1)

A recruiter on a mid-range Android phone moves a finger over `/projects/websocket-inspector` or taps "Explore 3D". The teardown appears with no hitch, and no frame is skipped while it starts. The hero on `/` behaves the same after the first touch.

**Why this priority:** this is the slice's mission. One 56–69 ms task is left on every path.

**Independent Test:** `fps:engine --scenario startup` on all three paths, final state, 4× CPU, 2 runs each.

**Acceptance Scenarios:**

1. **Given** the final export under the protocol, **When** the visitor engages the project route by pointer move or by the "Explore 3D" click, **Then** the first 5 s record 0 dropped frames and no main-thread task above 50 ms. _(AC2)_
2. **Given** the same protocol, **When** the visitor first moves the pointer on `/`, **Then** the hero's first 5 s record 0 dropped frames and no task above 50 ms. _(AC2)_

---

### User Story 2 — Numbers first, fixes second (Priority: P1)

Before the mount changes, Murphy finds S11.5's final state re-measured on today's host and Chromium. The re-baseline has per-path numbers, traces, a CPU-profile attribution of every task above one frame, and the time of every dropped frame. After the work lands, a before/after table shows what each lever changed.

**Why this priority:** Hard Rule 3 and the brief's executor rule: a mount change before the re-baseline is a protocol violation.

**Independent Test:** the re-baseline artifacts are committed in an ancestor of the first `packages/xploder/src` commit (`REBASELINE-FIRST-OK`), and the per-lever A/B table exists.

**Acceptance Scenarios:**

1. **Given** the branch history, **Then** the commit with the re-baseline (per-path numbers + traces) precedes every commit that changes the mount. _(AC1)_
2. **Given** the final state, **Then** the before/after table reports max long task, long-task count, dropped frames, blocking ms and main-thread cost for every path, 2 runs each. _(Deliverable 3, serves AC2)_

---

### User Story 3 — Nothing looks or behaves differently (Priority: P1)

A returning visitor sees exactly the same teardown in light and dark, with the same draw calls and no layout shift. The hero and the workbench reveal at the same moment relative to the first drawn frame, in the same order as before. The page downloads no more JavaScript than S11.5's final build.

**Why this priority:** the non-goals and Hard Rule 5. Any visible change is a STOP.

**Independent Test:** the parity tool (8 shots), `site:probe --group draws` + `engine:probe`, CLS from the harness and Lighthouse, the four-scope byte table, and the ready/reveal sequence probe on both routes.

**Acceptance Scenarios:**

1. **Given** the re-baseline and final exports, **When** both routes are captured at rest in mobile + desktop × light + dark, **Then** every decoded RGBA buffer is identical. _(AC3)_
2. **Given** both routes and fixtures a/b/c, **Then** each content frame issues 2 draw calls and CLS is 0. _(AC3)_
3. **Given** the re-baseline and final bundles, **Then** every scope is ≤ in raw and gzip bytes, and the byte counts are reported. _(AC3)_
4. **Given** the sequence probe before and after, **Then** no instanced draw precedes the frame in which `data-xploder-ready` flips, ready flips in the rAF of the first instanced draw, and the ordered live-state transitions on the hero and the workbench are identical. _(AC4)_

---

### User Story 4 — Murphy decides on the interaction gate with fresh data (Priority: P2)

Murphy gets mobile Lighthouse numbers for the eager build on the CI runner, on both routes, with a written verdict: retire D-19's gate, or keep it. A "keep" verdict names the tasks that still cost the blocking time.

**Why this priority:** Deliverable 4. Either verdict is acceptable. Murphy wants the gate gone if the numbers allow it.

**Independent Test:** two `eager-3d` workflow runs on the draft PR, the `eager-verdict` output, and the long-task attribution.

**Acceptance Scenarios:**

1. **Given** the final lever state built with `NEXT_PUBLIC_EAGER_3D=1`, **When** `/` and `/projects/websocket-inspector` are measured on the runner under the mobile profile, **Then** perf, TBT, LCP and CLS are published for every run. _(AC5)_
2. **Given** those numbers, **Then** the verdict is "recommend retiring D-19" if perf ≥ 95 and TBT ≤ 200 ms on both routes. Otherwise it is "keep the gate", with the numbers. _(AC5)_

---

### User Story 5 — CI and the frozen surfaces stay trustworthy (Priority: P2)

A reviewer sees every required check green. Only the approved Canvas-owner and scene files changed, each re-sealed with a reason note. S2, S5 and S7 show empty diffs.

**Independent Test:** the CI run, `guards.sh`, the manifest diffs, and `approved-xploder-src.txt` vs `XPLODER-SRC-OK`.

**Acceptance Scenarios:**

1. **Given** the PR, **Then** all required checks are green, including `seo: meta + og`, fps calibration and both axe jobs. _(AC6)_
2. **Given** `guards.sh`, **Then** S2, S5 and S7 are empty, every touched S4/S6/S8 file is re-sealed with a reason note, and `XPLODER-SRC-OK` equals exactly that file list. _(AC6)_

### Edge Cases

- **WebGL unavailable:** `hasWebgl()` still decides before the Canvas renders, so the fallback, `data-xploder-webgl="unavailable"` and the hidden navigator are unchanged. A renderer-factory rejection rethrows into `CanvasBoundary` exactly as a synchronous constructor throw does today.
- **No `requestIdleCallback`** (e.g. Safari): the factory falls back to `scheduler.yield()`, then to a `MessageChannel` hop. No numeric timeout anywhere (motion-literal rule).
- **Unmount while the factory is pending:** R3F's teardown waits for `root.ready` and releases the renderer it built. No orphan context remains (unit test).
- **StrictMode / dev double effects:** the factory is module-level and runs once per root. No second renderer is built (unit test).
- **Reduced motion / Save-Data:** the 3D never mounts, as today. No lever changes that.
- **Slug change (workbench switches project):** with `staged`, the scene re-mounts its meshes per slug as today. Staging applies only to the first mount of a root.
- **Noisy runs:** a spread above 20 % → flagged, repeated, all runs published.
- **AC2 blocked after all four levers:** STOP + escalation with the dropped-frame/task timeline (Hard Rule 2). Never closed as "partially met".
- **AC3 bytes grow:** offset inside the touched files or app-side, or STOP + escalation with the byte table. Never relaxed.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** a re-baseline of S11.5's final state exists **before** any change commit, on the same 4× CPU protocol, with per-path numbers and the trace artifact attached.
  - **SR1.1 (Deliverable 1):** the full RFC D1 measurement set on the unmodified tree (`perf:startup` clean + attributed, `fps:engine --scenario startup`, `perf:parity`, draw calls, bundle scopes, gated Lighthouse), committed with gzipped traces, `meta.json` and the drift table vs S11.5 T013/T014.
  - **SR1.2:** the RFC D2 diagnostics (CPU-profile attribution, dropped-frame timeline, ready/reveal sequence) exist before the re-baseline and are part of its artifacts. They are additive and change no existing number.
- **FR2 (= AC2):** during the first 5 s after engagement, the project route records **0 dropped frames** (existing `fps-engine` startup scenario) and **no single long task above 50 ms**, on every engagement path (pointer move and the "Explore 3D" click); the same holds for the hero's first 5 s.
  - **SR2.1 (Deliverable 2):** the staged mount, levers in order of measured payoff (RFC D3, D5): L1 the renderer in its own slice (async `gl` factory), L4 configuration split from construction, L2 first-frame-only staged scene mount (conditional), L3 the cheaper probe (conditional). One lever per commit, each with an A/B. The keep rule is Δ > run spread.
  - **SR2.2 (Deliverable 3):** the before/after table, 2 runs each: dropped frames, long tasks, blocking ms (TBT-style), main-thread cost.
- **FR3 (= AC3):** visual parity: rest-state screenshots pixel-identical in light and dark; **2 draw calls** on the teardown unchanged; CLS 0; client JS ≤ the S11.5 final bytes per scope (byte count reported).
  - **SR3.1:** `perf:parity --compare` against the AC1 shots; `site:probe --group draws` + `engine:probe`; CLS from the harness + Lighthouse; `bundle-scopes.mjs` four-scope raw + gzip table.
- **FR4 (= AC4):** `data-xploder-ready` still fires on the first content frame, and the hero and workbench reveal sequence is unchanged (probe evidence on both routes).
  - **SR4.1:** the RFC D4 sequence probe (attributed `perf:startup` runs) before and after on both routes, plus `site:probe --group hero`.
- **FR5 (= AC5):** the eager-hydration flag is re-measured on `/` and `/projects/websocket-inspector` on the CI runner under the mobile profile with a verdict: **≥ 95 perf and TBT ≤ 200 ms** on both → recommend retiring D-19's gate; otherwise publish the numbers and **keep the gate**. Either verdict is acceptable; an unmeasured opinion is not.
  - **SR5.1 (Deliverable 4):** `eager-3d.yml` on the draft PR, 2 runs. `eager-verdict` + the Lighthouse long-task attribution (RFC Q13). Local `build:eager` Lighthouse alongside.
- **FR6 (= AC6):** CI green (all required checks incl. `seo: meta + og`, fps calibration, both axe jobs); frozen surfaces S2/S5/S7 remain empty; every touched S4/S6/S8 file is re-sealed with a reason note, and `XPLODER-SRC-OK` lists exactly those files.
  - **SR6.1 (Deliverable 5):** a lever commit + re-seal commit pair per kept lever touching a sealed file (RFC D8, Q16), a final re-seal audit, and `guards.sh` incl. `REBASELINE-FIRST-OK`.

### Key Entities

- **FpsStartupReport (additive fields, startup scenario only):** `droppedFrameTimes: number[]` (ms from t0), `tasksOver16ms: { start, dur }[]`.
- **CpuProfileSummary:** `{ route, engage, run, tasks: { start, dur, byChunk: { chunk, selfMs, pct }[], topFunctions: { fn, chunk, selfMs }[] }[] }` for every main-thread task above 16.7 ms in [t0, t0 + 5 s].
- **SequenceRecord:** `{ firstInstancedDraw: { t, raf }, ready: { t, raf }, liveStates: { value, t, raf }[] }` per attributed run.
- **ScopeBytes:** `{ scope: 'home-initial' | 'project-initial' | 'total' | 'non-initial-3d', files, raw, gzip }`.
- **LeverRecord:** `{ id: 'L1' | 'L4' | 'L2' | 'L3', commit, reseal?, before[2], after[2], deltas, spread, kept }`.
- **EagerVerdict:** S11.5's shape, plus `longTasks: { url, startMs, durMs }[]` per run.

## Success Criteria _(mandatory)_

The success criteria are exactly FR1–FR6 (= AC1–AC6). No additional measurable outcomes are defined, by rule. The ≈ 27 ms slice size (RFC Q11) is a design target, not a criterion.

## Assumptions

- `three` 0.186.1, `@react-three/fiber` 9.8.2, React 19.3.1 and Next 16.4.3 stay pinned for the whole slice (`VERSIONS-OK`). R3F 9.8.2's async `gl` factory is the L1/L4 seam.
- All before/after pairs run on the same host, one measurement at a time. `benchmarkIndex` is recorded per run.
- The CI runner (`ubuntu-latest`) is the binding host for AC5 only. AC1–AC4 are local.
- No Vercel setting, env value or DNS changes. The eager flag stays off by default. Retiring D-19 is a follow-up on Murphy's word (RFC Q18).
