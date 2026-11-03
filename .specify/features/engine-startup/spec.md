# Feature Specification: S11.5 Engine Startup Performance

**Feature dir:** `.specify/features/engine-startup/` · **Slice:** S11.5-engine-startup · **Created:** 2026-11-03 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-11.5-engine-startup.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-03: all §6 defaults, §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Deliverables 1–5 appear as supporting requirements (SR) under the FR they serve and get task-level checks, not criteria of their own. Definitions that the brief leaves open (the startup window, engagement paths, the run protocol, the TBT reference, the bundle scope, the parity matrix) come from the approved RFC defaults. They are referenced, not promoted to criteria.
>
> **Definitions on record (RFC Gate 1 defaults):**
> - **Startup** = engagement (the input that opens the gate) → first content frame + 1 s. Its **main-thread cost** is the sum of top-level main-thread tasks in that window, and includes any 3D work moved before engagement (RFC D1, Q2).
> - **Profile** = Lighthouse mobile screen/UA + 4× CPU throttle, local production export, headless Chromium. It applies to AC1, AC2 and AC3 (RFC D2, Q1, Q5).
> - **Runs** = exactly 2 per measurement, median reported (RFC Q4).
> - **Engagement paths** = hero pointermove; project route pointermove **and** the "Explore 3D" click (RFC Q3).
> - **AC6 "TBT within budget"** = ≤ 200 ms median per route; the verdict follows the CI runner (RFC Q7, Q8).
> - **AC4 "bundle"** = initial JS per route **and** total emitted JS (RFC Q11). **AC4 parity** = 8 rest-state shots compared as decoded RGBA (RFC Q12).
>
> **Evidence doctrine (kickoff Hard Rule 7):** every number (ms, dropped frames, long tasks, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`. Every measurement is two runs, median reported. Perf claims use the dropped-frames / long-task style only.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Engaging the page feels instant (Priority: P1)

A recruiter on a mid-range Android phone opens `/projects/websocket-inspector` and moves a finger or taps "Explore 3D". The architecture teardown appears without a hitch. Nothing stutters while it starts, and the hero on `/` behaves the same way after the first touch.

**Why this priority:** the slice's mission. Today the visitor pays ≈ 0.4–0.6 s of main-thread time at exactly the moment they engage.

**Independent Test:** `fps-engine --scenario startup` on both routes and every engagement path, plus the `perf:startup` before/after table, 4× CPU, two runs each.

**Acceptance Scenarios:**

1. **Given** the final export under the 4× CPU mobile profile, **When** the visitor engages the project route (pointermove or the "Explore 3D" click), **Then** the first 5 s record 0 dropped frames and no main-thread task above 50 ms. _(AC2)_
2. **Given** the same profile, **When** the visitor first moves the pointer on `/`, **Then** the hero's first 5 s record 0 dropped frames and no task above 50 ms. _(AC2)_
3. **Given** the AC1 baseline and the final state, measured with the same protocol, **Then** the startup main-thread cost (median of 2) is at least 40 % lower. If it is not, the evidence documents the ceiling and the reason in numbers. _(AC3)_

---

### User Story 2 — The maintainer knows where startup time goes (Priority: P1)

Before anything is optimised, Murphy opens a profile that splits startup into parse/eval, mount, geometry, shader compile, texture creation and first frame, with numbers and the raw trace. After the work lands, a table shows which single change earned the win.

**Why this priority:** "numbers first, fixes second" is the brief's binding rule (Executor rules, Hard Rule 3).

**Independent Test:** the AC1 baseline artifacts exist in a commit that precedes every lever commit (`git log` order), plus the per-lever contribution table and the leave-one-out run.

**Acceptance Scenarios:**

1. **Given** the branch history, **Then** the commit carrying the baseline profile (phase table, startup JSONs, traces) comes before any commit that changes product startup behaviour. _(AC1)_
2. **Given** the baseline, **Then** every phase P2–P9 has a number on the 4× profile, and textures report a count (expected 0) plus time. _(AC1)_
3. **Given** the lever commits, **Then** each one has its own A/B measurement. One lever is shown to be the dominant win, both incrementally and by leave-one-out, and every lever without a measurable win is reverted and recorded. _(AC5)_

---

### User Story 3 — Nothing looks different (Priority: P1)

A returning visitor sees exactly the same teardown in light and dark: the same pixels, the same layout, and no shift while it loads. The page downloads no more JavaScript than before.

**Why this priority:** the brief's non-goal "no visual redesign" and Hard Rule 5. Any visible change is a STOP.

**Independent Test:** the parity tool comparing 8 rest-state shots against the baseline, `engine:probe` draw calls, the GL draw counter, Lighthouse/harness CLS, and the `bundle:manifest` diff.

**Acceptance Scenarios:**

1. **Given** the baseline and final exports, **When** both routes are captured at rest in mobile + desktop × light + dark, **Then** every decoded RGBA buffer is identical. _(AC4)_
2. **Given** the teardown on fixtures a/b and on both routes, **Then** each content frame issues 2 draw calls, and CLS is 0. _(AC4)_
3. **Given** the baseline and final bundle manifests, **Then** neither the initial JS per route nor the total emitted JS grew, and both byte counts are reported. _(AC4)_

---

### User Story 4 — Murphy can decide on the interaction gate with data (Priority: P2)

Murphy builds the site with an eager-hydration flag that starts the 3D at load instead of on interaction. Mobile Lighthouse numbers for both routes, locally and on the CI runner, come with a written verdict: retire the gate, or keep it.

**Why this priority:** Deliverable 4. The verdict decides D-19, but either outcome is acceptable.

**Independent Test:** a flag build, `perf:lighthouse` ×2 runs per route (local + CI runner), and the verdict log.

**Acceptance Scenarios:**

1. **Given** a build with `NEXT_PUBLIC_EAGER_3D=1`, **When** `/` and `/projects/websocket-inspector` are measured under the mobile profile, **Then** perf, TBT, LCP and CLS are published for every run. _(AC6)_
2. **Given** those numbers, **Then** the verdict is "recommend retiring D-19" if perf ≥ 95 and TBT ≤ 200 ms on both routes on the runner. Otherwise it is "keep the gate", with the numbers. _(AC6)_
3. **Given** the default build (flag unset), **Then** behaviour and initial JS are unchanged from the pre-flag state. _(AC6, AC4)_

---

### User Story 5 — CI and the frozen surfaces stay trustworthy (Priority: P2)

A reviewer sees every required CI check green. Only the approved engine/material files changed, each with a re-seal note, and the other frozen surfaces show empty diffs.

**Independent Test:** the CI run URL, `guards.sh` output, the re-seal manifest diff, and `XPLODER-SRC-OK`.

**Acceptance Scenarios:**

1. **Given** the PR, **Then** all required checks are green, including `seo: meta + og`, fps calibration and both axe jobs. _(AC7)_
2. **Given** `guards.sh`, **Then** S2, S5, S7 and S8 show empty diffs, every touched S4/S6 file is re-sealed with a reason note, and `XPLODER-SRC-OK` equals exactly that file list. _(AC7)_

### Edge Cases

- **Reduced motion / Save-Data:** the 3D never mounts, with or without the eager flag. No lever changes that.
- **No `KHR_parallel_shader_compile`:** the material path is exactly today's synchronous one (RFC Q13, §9 R2).
- **WebGL unavailable:** the existing fallback renders. The startup harness reports "no canvas" rather than a phase table.
- **A slow chunk download:** network time is P1, which is off-main-thread. It is reported but is not part of the main-thread cost.
- **Engagement before `load`:** the gate still waits for `load` + visible (hero) exactly as today. The harness engages only after `load` + 2 s quiet.
- **Noisy runs (spread > 20 %):** flagged and repeated, with all runs published (RFC Q4).
- **The 40 % target is unreachable:** documented with the ceiling (the share in frozen S7/S8 mount work and WebGL context creation), per AC3's own clause.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** a baseline profile exists **before** any optimisation commit, covering parse/eval, mount, geometry, shader compile and texture creation on the 4× CPU profile, with per-phase numbers and the trace artifact attached.
  - **SR1.1 (Deliverable 1):** `pnpm perf:startup` (RFC D3.1/D3.2): the phase model P0–P9 from trace events + GL-call spans, clean vs attributed runs, startup JSON + gzipped trace + `meta` (host `benchmarkIndex`, Chromium, WebGL renderer, extension availability).
  - **SR1.2:** the baseline task also captures the AC2, AC4 and AC6 references (fps-startup, 8 parity shots, bundle manifest, gated Lighthouse) before any lever.
- **FR2 (= AC2):** during the first 5 s after engagement, the project route records **0 dropped frames** (existing `fps-engine` harness) and **no single long task above 50 ms**; the same holds for the hero's first 5 s.
  - **SR2.1:** `fps-engine --scenario startup --route <path> --engage move|click` on the production export at 4× CPU. It reports dropped frames and long tasks from the kept trace. The existing `explode`/`tour` scenarios are unchanged (RFC D3.3).
- **FR3 (= AC3):** measured startup main-thread cost drops **≥ 40 %** against the AC1 baseline on the same profile and protocol (two runs each, median reported). If 40 % proves physically unreachable, the shortfall is documented with the ceiling and the reason — numbers, not adjectives.
  - **SR3.1 (Deliverables 2–3):** levers implemented in order of measured payoff (RFC D5, D6), and a before/after table of cost, long tasks, dropped frames and blocking time.
- **FR4 (= AC4):** visual parity: rest-state screenshots pixel-identical in light and dark; **2 draw calls** on the teardown unchanged; CLS 0; client JS bundle ≤ baseline (byte count reported).
  - **SR4.1:** the parity tool (8 shots, RGBA compare via `node:zlib`, RFC D8), `engine:probe`, the GL draw counter, and `bundle:manifest` diff vs the baseline task.
- **FR5 (= AC5):** at least one startup lever is proven by measurement to be the dominant win (split init, precompiled materials, or import trimming), with the evidence showing its individual contribution — no shotgun changes.
  - **SR5.1:** one lever per commit with an A/B. The keep rule is Δ > run spread, otherwise revert and record. Leave-one-out of the dominant lever (RFC D6).
- **FR6 (= AC6):** the eager-hydration flag is measured on `/` and `/projects/websocket-inspector` under the mobile profile with a verdict: **≥ 95 perf and TBT within budget** → recommend retiring D-19's gate; otherwise publish the numbers and **keep the gate**. Either verdict is acceptable; an unmeasured opinion is not.
  - **SR6.1 (Deliverable 4):** a build-time `NEXT_PUBLIC_EAGER_3D` flag via `waitForStartup()` in `interaction-gate.ts`, off by default and never set on Vercel. A local + CI-runner measurement job (RFC D7, §9 R5).
- **FR7 (= AC7):** CI green (all required checks incl. `seo: meta + og`, fps calibration, both axe jobs); frozen surfaces S2/S5/S7/S8 remain empty; every touched S4/S6 file is re-sealed with a reason note, and `XPLODER-SRC-OK` lists exactly those files.
  - **SR7.1 (Deliverable 5):** the S6 (and, only if touched, S4) re-seal per RFC D9, plus `guards.sh` with S2/S4 subset lists and the approved-file list.

### Key Entities

- **StartupReport:** `{ route, engage, runKind: 'clean' | 'attributed', t0, firstFrame, phases: { P0…P9: { ms, mainThreadMs, count? } }, mainThreadCostMs, longTasks: { start, dur, phase }[], blockingMs, droppedFrames, cls, drawCallsPerFrame, textures, meta }`.
- **LeverRecord:** `{ id: 'L1' | 'L2' | 'L3' | 'L4' | 'L5', commit, before: StartupReport[2], after: StartupReport[2], deltaMs, spreadMs, kept }`.
- **ParitySet:** `{ shots: { route, profile, scheme, path, sha256 }[] }`, plus a compare result `{ differingPixels }` per shot.
- **EagerVerdict:** `{ host: 'local' | 'ci-runner', routes: { path, runs: { perf, tbtMs, lcpMs, cls }[], median }[], verdict: 'retire-gate' | 'keep-gate' }`.

## Success Criteria _(mandatory)_

The success criteria are exactly FR1–FR7 (= AC1–AC7). No additional measurable outcomes are defined, by rule. Their evidence is listed in RFC §3/§7: profiles, traces, before/after tables, fps-startup reports, parity logs, bundle diffs, Lighthouse summaries and CI runs.

## Assumptions

- `three` stays at 0.186.1, `@react-three/fiber` at 9.8.2 and Next at 16.4.3 for the whole slice. A version change would invalidate the before/after comparison.
- Headless Chromium (SwiftShader) is the measurement GPU for every harness. Real-device GPU behaviour may differ, and this is published as a limitation (RFC Q5).
- All before/after pairs run on the same host. `benchmarkIndex` is recorded per run.
- No Vercel setting, env value or DNS changes in this slice. The eager flag is measured on local and CI-runner builds only.
