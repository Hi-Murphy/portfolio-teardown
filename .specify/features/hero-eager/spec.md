# Feature Specification: S11.8 Hero-Only Eager

**Feature dir:** `.specify/features/hero-eager/` · **Slice:** S11.8-hero-eager · **Created:** 2026-11-04 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-11.8-hero-eager.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved at Gate 1, 2026-11-04: all §9 defaults, the six-path E1/E2 list in §4; refinements R1–R8 in §11)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Supporting requirements (SR) sit under the FR they serve and get task-level checks, not criteria of their own. Definitions the brief leaves open come from the approved RFC defaults. They are referenced, not promoted to criteria.
>
> **Definitions on record (RFC Gate 1 defaults):**
>
> - **Attempt** = one CI job on one runner VM. It builds the gated and eager products of one commit and measures them there (RFC D1).
>   - **Slow-class attempt** = every Lighthouse run in it reports `benchmarkIndex` in [1,900, 2,600].
>   - **Independent** = distinct runner VMs (distinct runner names); matrix shards and reruns both qualify.
>   - **Deciding attempts** = the first two qualifying attempts in time order on the final product state.
>   - **Cap:** 10 attempts per phase.
> - **Product commit** = any commit touching `apps/**` or `packages/**` (Q2). `tools/perf`, workflows and feature-dir files may precede AC1.
> - **Lighthouse protocol** = `perf:lighthouse` mobile, simulated throttling, 2 invocations × median of 3 per route per build. The route value is the mean of the two invocation medians (the existing `eager-verdict` aggregation).
> - **Reference bands (Q3)** = inside the ±band of **either** S11.7 deciding attempt:
>   - AC1 home eager [188.33, 231.00] ms, home gated [74.48, 94.60] ms;
>   - AC5 project gated [78.85, 91.35] ms.
> - **AC2 named harness mode (Q5)** = `fps:engine --scenario load --frames trace-only --cpu 1 --names`: host-native CPU on the slow-class host, eager build, `/`, no engagement, mobile profile.
>   - Window = `load` → `load` + 5 s; a task counts if it intersects the window.
>   - Dropped frames = Compositor `DroppedFrame` events in the window.
>   - `--frames recorder` is informational and **excluded from AC2: harness rAF recorder**.
> - **Named exceptions (Q4)** = trace **tasks** labelled by `--names`:
>   - `renderer-constructor`;
>   - `program-compile` (the task holding the first three program setup);
>   - `first-content-frame` (the task in which `data-xploder-ready` flips).
>
>   At AC1, `program-compile` and `first-content-frame` are the same task, and both caps = that task's AC1 median × 1.05. If E1c moves the compile into its own task, that task keeps the same cap.
> - **AC5 probe (Q11)** = `eager:probe`. Deadline = navigation start + 2,500 ms, host-native CPU, every run must pass.
>   - "Visible" = canvas mounted, `data-xploder-ready="true"`, revealed, fade complete at the deadline.
>   - "Animating (ambient idle)" = the S10 at-rest live view, rendered on demand, non-blank, with no timed motion.
>   - "Still requires interaction" = `eager:probe --expect gated` on the project route: no `canvas` and no `data-xploder-ready` until `load` + 5 s, the poster visible, 0 trusted input events.
> - **AC4 pairs (Q6)** = post-slice gated vs `main` gated, and post-slice hero-eager vs `main` `build:eager`, both at `0fcd243`.
>   - "2 KB" = 2,000 B gzip per route initial;
>   - +0.5 % = on total emitted JS gzip (raw reported too);
>   - node zlib level 9, per file, summed.
> - **Hero-eager build** = `pnpm build:eager-hero` (`NEXT_PUBLIC_EAGER_HERO=1` → `__XP_EAGER_HERO__`): `/` eager, project route gated (RFC §5 A1). Before A1 lands, AC1 uses `pnpm build:eager` (RFC F6).
> - **Approved engine files** = RFC §4 #1–#6 only. Each is edited only when it is required (#1) or its trigger holds; each one that changes is re-sealed per RFC §4.2 + R1.
>
> **Evidence doctrine (kickoff Hard Rule 9):** every number (ms, frames, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`. Two runs per measurement, median reported. No secrets.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A visitor who never touches `/` still sees the teardown (Priority: P1)

A recruiter opens the homepage on a slow device and only reads. Within 2.5 s the live teardown replaces the poster, at rest. A visitor who prefers reduced motion keeps the poster and gets no canvas. On a project page, nothing live loads until the visitor interacts.

**Why this priority:** the slice's purpose. D-19's gate exists only because load-time cost broke the budget.

**Independent Test:** `eager:probe` on both deciding attempts: `/` normal and reduced motion, the project route `--expect gated`, 2 runs each.

**Acceptance Scenarios:**

1. **Given** the hero-eager build on a slow-class attempt, **When** `/` loads with no input of any kind, **Then** by navigation start + 2.5 s the canvas is mounted, the first content frame is drawn, the live layer is revealed with its fade complete, and the canvas is non-blank and at rest. _(AC5)_
2. **Given** `prefers-reduced-motion: reduce`, **When** `/` loads, **Then** until `load` + 5 s no `canvas` exists and the poster stays visible. _(AC5)_
3. **Given** the hero-eager build, **When** `/projects/websocket-inspector` loads with no input, **Then** no canvas mounts until `load` + 5 s, and its gated TBT is inside [78.85, 91.35] ms. _(AC5)_

---

### User Story 2 — The baseline is reproduced before anything changes (Priority: P1)

Before any product commit, Murphy sees S11.7's home numbers reproduced on a slow-class attempt. Murphy also sees the first-content-frame task split by function (placement, overlay model, program setup, GC), and a measured go/skip for E2.

**Why this priority:** Hard Rule 3. Optimising against an unreproduced number is a protocol violation.

**Independent Test:** the AC1 log commit is an ancestor of the first product commit (`BASELINE-FIRST-OK`). Its reproduction check is inside both bands.

**Acceptance Scenarios:**

1. **Given** the branch history, **Then** the commit holding the AC1 baseline log precedes every commit touching `apps/**` or `packages/**`. _(AC1)_
2. **Given** the AC1 attempt, **Then** home eager and gated TBT are each inside their band. Otherwise the slice STOPs and re-baselines. _(AC1)_
3. **Given** the AC1 per-task table, **Then** the tasks E1 and E2 would touch are named by function, with simulated/observed duration and TBT share. _(AC1)_

---

### User Story 3 — The homepage never stutters on its own host (Priority: P1)

On a slow device, the eager homepage produces no main-thread task above 50 ms in the first 5 s after load. The only exceptions are three's renderer constructor, the first program compile and the first content frame, and none of those gets slower than its baseline + 5 %. At most 2 frames drop in a harness mode that adds no frame demand of its own.

**Independent Test:** the named AC2 mode on both deciding attempts, 2 runs.

**Acceptance Scenarios:**

1. **Given** the hero-eager build on a slow-class attempt in the named mode, **When** `/` loads with no engagement, **Then**:
   - every unnamed task intersecting [load, load + 5 s] is ≤ 50 ms;
   - each named exception is ≤ its AC1 median × 1.05, reported individually;
   - dropped frames are ≤ 2 (median of 2).

   The recorder count is published and labelled as excluded. _(AC2)_

---

### User Story 4 — Murphy decides on D-19 for `/` from two slow attempts (Priority: P1)

Murphy gets a `/` verdict per attempt on two independent slow-class attempts: perf ≥ 0.95 and TBT ≤ 200 ms, or eager − gated ≤ +50 ms on the same attempt. Fast attempts are shown and never counted. One cycle: the result closes the question either way.

**Independent Test:** `eager-verdict --rule s11.8` over the verdict attempts, and the flag state in the default build.

**Acceptance Scenarios:**

1. **Given** two deciding attempts, **Then** `/` on each is marked pass via (a) or (b), or fail, with the numbers. _(AC3)_
2. **Given** pass ×2, **Then** the retirement for `/` waits for Murphy's word and leaves the project route gated. **Given** any fail, **Then** D-19 is recorded as permanent for both routes, the hero-eager path stays flag-only, the numbers are published, and no further round runs. _(AC6)_

---

### User Story 5 — Nothing else changes (Priority: P2)

A returning visitor sees the same pixels, draw calls and layout, and downloads at most 2 KB more initial JS. A reviewer sees every required check green, and engine edits limited to the approved files, each re-sealed with a reason note.

**Independent Test:** the byte table, home + project parity, draws, CLS, the reveal sequence, the guards, the re-seal diff and the CI run.

**Acceptance Scenarios:**

1. **Given** `main` at `0fcd243` and the final builds, **Then** each route's initial JS grows ≤ +2,000 B gzip and total JS gzip ≤ +0.5 %, per build pair. _(AC4)_
2. **Given** the PR head, **Then**:
   - all required checks are green;
   - `git diff 0fcd243 -- packages/xploder/src` lists only approved files, each re-sealed with an S11.8 note and listed in `approved-xploder-src.txt`;
   - home parity is 0 px, there are 2 draw calls, and CLS is 0. _(AC7)_

### Edge Cases

- **Host drift at AC1:** the attempt qualifies but TBT falls outside a band → STOP + re-baseline. No product commit. Past the 10-attempt cap → escalate with the index + TBT log.
- **No WebGL on the runner:** `hasWebgl()` is false, and no AC5/AC2 claim is made from the fallback path. STOP + escalate (as S11.7 Q6).
- **E1a output differs on any input:** the oracle test fails → the lever is not committed. A parity diff is a STOP (Hard Rule 7).
- **E1c recompiles at first render** (`gl.info.programs` grows) → there is no win, so it is reverted as "no measurable win".
- **A conditional trigger does not hold:** the file stays untouched and is recorded "skipped (trigger not met)" with the evidence.
- **An edit outside the approved list:** a protocol violation. `XPLODER-SRC-OK` fails and the task stops.
- **Reduced motion toggled while booting:** the hero boot aborts and the poster stays (existing `hero-live.tsx` behaviour, unchanged).
- **Save-Data:** the hero boot does not start (existing behaviour, unchanged).
- **AC3 fails on both attempts:** D-19 is permanent for both routes, and the slice closes (Hard Rule 8). The approved E1 changes that passed their checks stay (Q9).
- **A named exception exceeds +5 % from noise alone** (an untouched task): it is reported individually with both raws and escalated. It is never rerun until green.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** **baseline reproduced first.** On a slow-class attempt (`benchmarkIndex` 1,900–2,600), before any product commit: home eager TBT within **±10 %** of S11.7's 209.25/210 ms, gated within ±10 % of 82.75/86 ms, with per-task attribution naming the tasks E1 and E2 will touch. If the host drifts beyond that, STOP and re-baseline — do not optimise against a number you did not reproduce.
  - **SR1.1:** the additive harness (RFC D2): `fps:engine --scenario load --names`, `eager-verdict --rule s11.8` (with the reproduction check), `eager:probe --expect gated`, `perf:parity --route`. Existing outputs are byte-identical (R3–R5).
  - **SR1.2:** `hero-eager.yml` (3 shards, slice branch only) runs the full set per attempt and uploads traces (RFC D2).
  - **SR1.3:** the AC1 log records the reproduction check, the per-task table, the E2 go/skip, the AC2 named-exception baselines and caps, the AC5 baselines, and the bytes at `0fcd243` (RFC D3).
- **FR2 (= AC2):** **host-native frame bar.** During the first 5 s after load on the eager home path: **no task > 50 ms**, **except** the named unsplittable tasks — three's renderer constructor, the first `gl.render` program compile, and the first content frame. Each named exception is measured and reported individually and must not exceed **its own AC1 baseline + 5 %**. Dropped frames are reported on an **explicitly named harness mode** with a bound of **≤ 2 per route**, recorder excluded in writing.
  - **SR2.1:** the E1 levers (RFC §4.1) in order: E1a (required), then E1b, E1c and E1d (conditional on their triggers). One lever per commit with a local A/B; keep rule Δ > run spread (RFC D4).
  - **SR2.2:** E2 (RFC §4.1), only if the AC1 attribution puts the `ViewScroll` mount re-render inside home's TBT window.
- **FR3 (= AC3):** **the gate, homepage only, two attempts.** On **two independent slow-class attempts**, `/` must satisfy **either** (a) Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**, **or** (b) **eager − gated TBT ≤ +50 ms** on the same attempt. Both attempts must pass. A fast-runner pass does not count.
  - **SR3.1:** `eager-verdict --rule s11.8`: per-attempt qualification, the `/` (a)/(b) rule, the two-attempt verdict over the first two qualifying attempts on distinct runners.
- **FR4 (= AC4):** **explicit byte budget.** Total JS gzip grows by **≤ +0.5 %** versus `main` at slice start, and per-route initial JS by **≤ +2 KB gzip**; both reported per route with the raw numbers. No "≤ previous" clause.
  - **SR4.1:** `bundle-scopes.mjs --budget s11.8`, both build pairs, against `0fcd243`.
- **FR5 (= AC5):** **the user-visible outcome.** On the slow class, with **zero interaction**, the home canvas is visible and animating (ambient idle) within **2.5 s** of load. `prefers-reduced-motion` → poster only, no canvas. The project route still requires interaction, and its gated TBT stays within ±5 % of S11.7.
  - **SR5.1:** the A1 hero-only flag (RFC §5): the hero reads `__XP_EAGER_3D__ || __XP_EAGER_HERO__`, and the workbench reads `__XP_EAGER_3D__` only. It is define-time and byte-neutral.
  - **SR5.2:** `eager:probe` on `/` (normal + reduced motion) and on the project route (`--expect gated`); the project gated TBT inside the Q3 band.
- **FR6 (= AC6):** **verdict, one cycle.** If AC3 passes twice: retire the gate **for `/` only** (D-19 amended: home eager, project gated) — Murphy's call on the numbers. If AC3 fails: **D-19 becomes permanent for both routes**, the eager path stays flag-only, the numbers are published, and the slice closes. No further optimisation rounds inside this slice.
  - **SR6.1:** the verdict log, and, only on Murphy's "retire", A2 (RFC §5, Q8). A2 makes hero-eager the default, keeps `NEXT_PUBLIC_GATED_HERO=1` as an escape hatch, keeps the workbench gated, and re-runs the perf gates.
- **FR7 (= AC7):** **CI and surfaces.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates); frozen surfaces empty **except** the G1-approved E1/E2 files, each re-sealed with a reason note and listed in `XPLODER-SRC-OK`; pixel parity on the home canvas, 2 draw calls, CLS 0.
  - **SR7.1:** `guards.sh` (RFC §4.2): `XPLODER-SRC-OK`, `G1-LIST-OK`, `RESEAL-NOTE-OK` (incl. S5), `SURFACE-S2…S8-OK`, `SEALED-TESTS-OK`, `BASELINE-FIRST-OK`, `APP-TOUCH-OK`, `CI-JOBS-OK`, `FLAG-DEFAULT-OK`, `VERSIONS-OK`, `BUDGETS-OK`, `DEV-ROUTES-OK`, `FROZEN-OK`, `BRIEF-HISTORY-OK`, `GITLEAKS-OK`.
  - **SR7.2:** the non-goal checks per lever (RFC §6):
    - home post-eager parity 0 px, plus home + project rest-state parity 0 px;
    - 2 draws, CLS 0;
    - an unchanged reveal sequence;
    - the hero gate probe (gated build), both axe jobs, the existing app tests;
    - reduced motion = poster.
  - **SR7.3:** the E1a equivalence oracle (and the E1b one if it runs). `deepStrictEqual` vs the verbatim pre-slice implementation, over fixtures + ≥ 2,000 seeded random layouts. Sealed tests unchanged.

### Key Entities

- **HostMeta** (existing, S11.7): `{ attemptId, runnerName, imageVersion, chromium, benchmarkIndex: { min, median, max }, webgl: { available, renderer, vendor, backend }, git: { sha } }`.
- **NamedTask** (new, `--names`): `{ name: 'renderer-constructor' | 'program-compile' | 'first-content-frame' | 'unnamed', startMs, durMs, topFunctions: { fn, url, selfMs, pct }[], containsReady: boolean }`.
- **FpsLoadReport** (extended): S11.7's report plus `names?: NamedTask[]`, `namedExceptions?: { renderer-constructor, program-compile, first-content-frame: { durMs, cap?, pass? } }` and `unnamedMaxMs`. Without `--names`, the S11.7 shape is unchanged.
- **AttemptVerdictS118:** `{ attemptId, qualifies, benchmarkIndex, home: { eager: { perf, tbtMs }, gated: { perf, tbtMs }, deltaTbtMs, ruleA, ruleB, pass }, projectGated: { tbtMs, inBand }, reproduction?: { eagerInBand, gatedInBand } }`.
- **EagerProbeRun** (extended): S11.7's run plus `expect: 'live' | 'gated'`.
- **ScopeBudget:** `{ pair: 'gated' | 'hero-eager', scope: 'home-initial' | 'project-initial' | 'total', before: { raw, gzip }, after: { raw, gzip }, delta, budget, pass }`.
- **ApprovedSrcEntry:** one repo-relative path per line in `approved-xploder-src.txt`. It is a subset of RFC §4, with the lever ID and re-seal commit in a trailing comment.

## Success Criteria _(mandatory)_

The success criteria are exactly FR1–FR7 (= AC1–AC7). No additional measurable outcomes are defined, by rule. RFC §4's triggers (≥ 5 % self time, > 12.5 ms observed, > 185 ms projected) decide **whether a conditional lever runs**. They are not criteria.

## Assumptions

- `three` 0.186.1, `@react-three/fiber`, React and Next stay pinned (`VERSIONS-OK`). No dependency is added.
- GitHub-hosted `ubuntu-latest` runners keep landing on both host classes, and the slow class still renders WebGL through SwiftShader on Vulkan (S11.7 T006 §2).
- `/` mounts no workbench code, so `build:eager` and `build:eager-hero` run the same code path on `/` (RFC F6).
- No Vercel setting, env value or DNS changes. The hero-eager flag stays off by default unless Murphy says "retire" after AC3 passes twice.
