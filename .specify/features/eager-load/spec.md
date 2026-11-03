# Feature Specification: S11.7 Eager Load Path

**Feature dir:** `.specify/features/eager-load/` · **Slice:** S11.7-eager-load · **Created:** 2026-11-03 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-11.7-eager-load.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved at Gate 1, 2026-11-03: all §7 defaults; refinements R1–R10 in §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Supporting requirements (SR) sit under the FR they serve and get task-level checks, not criteria of their own. Definitions the brief leaves open come from the approved RFC defaults. They are referenced, not promoted to criteria.
>
> **Definitions on record (RFC Gate 1 defaults):**
> - **Attempt** = one CI job on one runner VM that measures the gated **and** eager builds of one commit, both routes (RFC D1). **Slow-class attempt** = every Lighthouse run in it reports `benchmarkIndex` in [1,900, 2,600]. **Independent** = distinct jobs on distinct runner VMs (different runner names); reruns and matrix shards both qualify (Q3). Cap: 10 attempts per phase (Q4).
> - **Binding host** = qualified CI attempts only. The local M4 (with SwiftShader + scaled-multiplier emulation) is for A/B only (Q1).
> - **Lighthouse protocol** = the `eager-3d.yml` protocol: `perf:lighthouse` mobile, simulated throttling, 2 invocations × median of 3 per route per build. The route value = mean of the two invocation medians (existing `eager-verdict` aggregation).
> - **AC2 harness** = `fps:engine --scenario load`, eager build, no engagement, mobile profile, CDP 4× CPU on the slow-class host (Q7). Window = `load` event → `load` + 5 s; a task counts if it intersects the window. **Named frame mode = `trace-only`:** no harness rAF loop; dropped frames = Compositor `DroppedFrame` trace events. The `recorder` mode is informational and excluded from the gate (RFC D2.3).
> - **AC5 probe** = `eager:probe` per RFC D6: host-native CPU, deadline = navigation start + 2,500 ms (Q8), every run must pass. "Visible" = canvas mounted, first content frame drawn (`data-xploder-ready="true"`), revealed, fade complete at the deadline. "Animating (ambient idle)" = the S10 definition: the live view at rest, rendered on demand, non-blank, with no timed motion (Q9).
> - **AC4 budget** = initial JS per route ≤ +2,000 B gzip (Q11), total emitted JS ≤ +1 % raw and gzip, each per build (gated, eager), vs the pre-slice product `7833b28` (node zlib level 9, per file, summed).
> - **Pre-slice baseline** = the product at `7833b28` (= S11.6 merged `2fd19f0`, RFC F6).
>
> **Evidence doctrine (kickoff Hard Rule 8):** every number (ms, frames, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`. Two runs per measurement, median reported. No secrets.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A visitor who never touches the page still sees the teardown (Priority: P1)

A recruiter opens `/` or `/projects/websocket-inspector` on a slow device and only reads. Within 2.5 s the live teardown replaces the poster, at rest. A visitor who prefers reduced motion keeps the poster and downloads no live view.

**Why this priority:** the product goal. D-19's gate exists only because load-time cost broke the budget.

**Independent Test:** `eager:probe` on both slow-class verdict attempts, both routes, normal and reduced motion, 2 runs each.

**Acceptance Scenarios:**

1. **Given** the eager build on a slow-class attempt, **When** a route loads and no input event of any kind occurs, **Then** by navigation start + 2.5 s the canvas is mounted, the first content frame is drawn, the live layer is revealed with its fade complete, and the canvas is non-blank, at rest. _(AC5)_
2. **Given** `prefers-reduced-motion: reduce`, **When** either route loads, **Then** until `load` + 5 s no `canvas` exists and the poster stays visible. _(AC5)_

---

### User Story 2 — Numbers first, on the host that fails (Priority: P1)

Before any app change, Murphy sees the eager and gated builds measured on one slow-class attempt, with every TBT-relevant task named by function, the runner's WebGL backend, and a check that Lighthouse's simulation behaves as the RFC assumes.

**Why this priority:** Hard Rule 3. Fixing before measuring is a protocol violation.

**Independent Test:** the AC1 artifacts are committed in an ancestor of the first app optimisation commit (`BASELINE-FIRST-OK`), and the per-task table names the ≈ 200 ms react-dom tasks.

**Acceptance Scenarios:**

1. **Given** the branch history, **Then** the commit holding the AC1 baseline precedes every commit touching the app's eager path. _(AC1)_
2. **Given** the AC1 attempt, **Then** both builds × both routes have Lighthouse summaries, traces, and a per-task table with simulated and observed durations, URL → chunk → module, and the top functions by self time. _(AC1)_

---

### User Story 3 — The eager path never stutters (Priority: P1)

On a slow device the poster stays smooth while the live view boots: no main-thread task above 50 ms in the first 5 s after load, and at most 2 dropped frames per route in a harness mode that adds no frame demand of its own.

**Independent Test:** `fps:engine --scenario load --frames trace-only` on both slow-class verdict attempts, both routes, 2 runs.

**Acceptance Scenarios:**

1. **Given** the eager build on a slow-class attempt under the AC2 harness, **When** a route loads with no engagement, **Then** no task intersecting [load, load + 5 s] exceeds 50 ms, and `trace-only` records ≤ 2 dropped frames (median of 2). The `recorder` count is published and labelled as excluded. _(AC2)_

---

### User Story 4 — Murphy decides on D-19 from two slow attempts (Priority: P1)

Murphy gets a verdict per route per attempt on two independent slow-class attempts: eager ≥ 0.95 and TBT ≤ 200 ms, or eager − gated TBT ≤ +50 ms on the same attempt. Fast attempts are shown and never counted. Whatever the result, the fallback contract holds.

**Independent Test:** `eager-verdict --rule s11.7` over the verdict attempts, and the flag state in the default build.

**Acceptance Scenarios:**

1. **Given** two qualifying attempts on the final state, **Then** each route on each attempt is marked pass via (a) or (b), or fail, with the numbers. _(AC3)_
2. **Given** any fail, **Then** the default build stays gated, the eager path stays behind `NEXT_PUBLIC_EAGER_3D=1`, and the per-attempt numbers are documented. **Given** pass ×2, **Then** the retirement waits for Murphy's word. _(AC6)_

---

### User Story 5 — Nothing else changes (Priority: P2)

A returning visitor sees the same pixels, draw calls and layout, and downloads at most 2 KB more initial JS. A reviewer sees every required check green, `packages/xploder` untouched, and `eager-3d.yml` unchanged.

**Independent Test:** the byte table, 8-shot parity (rest and post-eager), draws, CLS, the reveal sequence, the guards and the CI run.

**Acceptance Scenarios:**

1. **Given** the baseline and final builds, **Then** initial JS per route grows ≤ +2,000 B gzip and total JS ≤ +1 %, per build. _(AC4)_
2. **Given** the PR head, **Then** all required checks are green, S2–S8 diffs are empty, and `eager-3d.yml` is byte-identical. _(AC7)_

### Edge Cases

- **No WebGL on the runner (RFC F2):** `hasWebgl()` is false and the a11y fallback renders. The AC1 baseline records the renderer first. If it is absent → STOP + escalate (Q6). No AC5 claim is made from a fallback path.
- **Engine-owned blocker (H1, S11.6's `rerender()`):** app-side levers cannot reach it → STOP at G1 with a named exception request (Hard Rule 6). No `packages/xploder` edit without approval + a re-seal note.
- **Slow-class attempts are scarce:** at most 10 attempts per phase → escalate with the index log (Q4). No emulation is substituted.
- **Reduced motion toggled while booting:** the eager boot aborts and the poster stays (hero today; the workbench gains the same guard, L0).
- **Save-Data:** the eager boot does not start on either route (hero today; the workbench gains it, Q10).
- **Profiler category breaks Lighthouse (LH 13 ships it disabled, R2):** per-task attribution falls back to `perf:startup --engage none --cpu-profile` on the same attempt, joined by URL and order. The log names the fallback.
- **A lever shows no win beyond spread:** reverted and recorded (keep rule). Never stacked.
- **AC3 fails on both attempts:** verdict "keep gate", the slice closes. No second lever round (Hard Rule 5).

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** **baseline first, on the slow class.** Before any optimisation commit: eager and gated builds measured on the **same** slow-class attempt (Lighthouse `benchmarkIndex` **1,900–2,600**), both routes, with per-task attribution of the react-dom work (the ≈200 ms tasks named by function). Evidence: traces + per-task table. No optimisation commit may precede it.
  - **SR1.1:** additive harness: `perf:lighthouse --profile` (traces with V8 samples), `perf:attribution` (Lighthouse long task ↔ observed task ↔ functions/modules), `perf:startup --engage none` (cross-check), `perf:host` (benchmarkIndex, Chromium, WebGL renderer + backend, runner identity). Existing outputs are byte-identical (RFC D2).
  - **SR1.2:** `eager-load.yml` (3 shards, slice branch only) runs the full measurement set per attempt and uploads traces (RFC D2.6).
  - **SR1.3:** the Lantern check (observed vs simulated timeline; Σ max(0, 4·d − 50) vs Lighthouse TBT) and the local-emulation drift table (RFC D1, D5).
  - **SR1.4:** AC2/AC4/AC5 baselines on the same attempt (load harness, bytes, probe).
- **FR2 (= AC2):** **frame honesty (per the S11.5/S11.6 lesson).** During the first 5 s after load (eager path): **no task > 50 ms** on either route on the slow class; dropped frames reported on an **explicitly named harness mode** with a bound of **≤ 2 frames per route** (the harness's own rAF recorder is excluded from the gate and stated in the evidence).
  - **SR2.1:** `fps:engine --scenario load --frames trace-only|recorder`; `explode`/`tour`/`startup` byte-identical (tests).
  - **SR2.2:** app-side levers in the order L0 → L1 → L2 → L3 → L4 (conditional) → L5 (conditional), reordered at G1 from the AC1 attribution. One lever per commit with a local A/B; keep rule Δ > run spread (RFC D3, D4).
- **FR3 (= AC3):** **the retirement gate (two attempts, both routes).** On **two independent slow-class attempts** (`benchmarkIndex` 1,900–2,600), both `/` and `/projects/websocket-inspector` must satisfy **either**: (a) eager Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**; **or** (b) **eager − gated TBT ≤ +50 ms** on the *same attempt*, with gated TBT measured on that attempt. Same-attempt comparison is the tie-breaker; a fast-runner pass alone does not satisfy this AC.
  - **SR3.1:** `eager-verdict --rule s11.7`: attempt qualification, the per-route (a)/(b) rule, the two-attempt verdict. The default output stays byte-identical, because `eager-3d.yml` consumes it (R4).
- **FR4 (= AC4):** **bytes with an explicit budget.** Client JS initial per route may grow by **≤ +2 KB gzip** versus the pre-slice baseline (offset budget, not "≤ previous"), and total JS must not grow by more than 1 %; both reported per route.
  - **SR4.1:** `bundle-scopes.mjs --budget` (R5), both builds, baseline `7833b28`.
- **FR5 (= AC5):** **the user-visible outcome.** On the slow class, with **zero interaction**, the teardown canvas is visible and animating (ambient idle) **within 2.5 s of load** on both routes; with `prefers-reduced-motion`, the poster remains and no canvas mounts.
  - **SR5.1:** `eager:probe` (RFC D6), normal + reduced motion.
  - **SR5.2:** L0: the eager workbench branch gets the hero's reduced-motion and saveData guards (RFC F4, Q10).
- **FR6 (= AC6):** **verdict and fallback contract.** If AC3 fails on either attempt, the interaction gate stays the default, the eager path remains flag-only (`NEXT_PUBLIC_EAGER_3D=1`), and the failure is documented with the per-attempt numbers. If AC3 passes twice, the gate is retired and D-19 is amended — Murphy's call, on the numbers.
  - **SR6.1:** the verdict log and, only on Murphy's "retire", the conditional retirement task (RFC Q13).
- **FR7 (= AC7):** **CI, surfaces, housekeeping.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, `perf: eager-3d (measurement)`); frozen surfaces S2–S8 empty **unless** a named exception is approved in the RFC and re-sealed with a note; `eager-3d.yml` retained until the D-19 decision is recorded.
  - **SR7.1:** `guards.sh` (RFC D10 + R8): `XPLODER-EMPTY-OK`, `APP-TOUCH-OK`, `CI-JOBS-OK`, `BASELINE-FIRST-OK`, and the rest.
  - **SR7.2:** visual and behaviour parity per RFC D9 (non-goals): 8-shot rest-state and post-eager parity 0 px, 2 draws, CLS 0, unchanged reveal sequence, the hero gate probe, both axe jobs.

### Key Entities

- **HostMeta:** `{ attemptId: '<runId>-<runAttempt>-s<shard>' | 'local', runnerName, imageVersion, chromium, benchmarkIndex: { min, median, max }, webgl: { available, renderer, vendor, backend }, git: { sha } }`.
- **PerTaskRecord:** `{ build, route, run, simulated: { startMs, durMs }, observedMs, tbtMs, url, chunk, modules[], topFunctions: { fn, module, selfMs, pct }[], hypothesis: 'H1'|'H2'|'H3'|'H4'|null }`.
- **FpsLoadReport:** `{ scenario: 'load', route, frames: 'trace-only'|'recorder', cpuThrottle, loadMs, windowMs, longTasks[], maxLongTaskMs, preLoadTasks[], droppedFrames, droppedFrameTimes[], mounted, readyMs, verdict: { longTask50, droppedFramesLe2, gated: frames === 'trace-only' } }`.
- **EagerProbeRun:** `{ route, motion: 'normal'|'reduce', run, t: { load, ready, revealed, fadeDone }, trustedInputEvents, canvas: { present, rect }, posterVisible, nonBlank, threeRequested, pass }`.
- **AttemptVerdict:** `{ attemptId, qualifies, benchmarkIndex: { min, max }, routes: { home, project }: { eager: { perf, tbtMs }, gated: { perf, tbtMs }, deltaTbtMs, ruleA, ruleB, pass } }`.
- **ScopeBudget:** `{ build, scope: 'home-initial'|'project-initial'|'total', before: { raw, gzip }, after: { raw, gzip }, delta, budget, pass }`.

## Success Criteria _(mandatory)_

The success criteria are exactly FR1–FR7 (= AC1–AC7). No additional measurable outcomes are defined, by rule. The ≤ 12.5 ms observed task size on the slow host (RFC D3) is a design target, not a criterion.

## Assumptions

- `three`, `@react-three/fiber`, React and Next stay pinned for the whole slice (`VERSIONS-OK`). No dependency is added.
- `packages/xploder` stays untouched (no exception requested at freeze). Any exception is a G1 decision by Murphy, with a re-seal note, recorded in rfc.md §9.
- GitHub-hosted `ubuntu-latest` runners keep landing on both host classes, as in S11.5/S11.6.
- No Vercel setting, env value or DNS changes. The eager flag stays off by default unless Murphy retires the gate (AC6).
