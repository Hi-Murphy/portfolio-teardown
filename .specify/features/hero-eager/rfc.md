# RFC — S11.8 Hero-Only Eager

**slice:** S11.8-hero-eager · **status:** APPROVED at Gate 1 (2026-11-04): all §9 defaults, incl. the six-path E1/E2 list in §4; refinements R1–R8 in §11 · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-11.8-hero-eager.md` (frozen brief v1) · **branch:** `task/s11.8-hero-eager` · **base:** `0fcd243` (product tree = S11.7 final `7df1b6d`) · **date:** 2026-11-04

> This RFC records design decisions only. It does not change scope. Where it seems to conflict with the brief, the brief wins and the conflict is raised as an open question (§9).
>
> **Nothing was built, run or profiled for this RFC.** AC1 profiling is Stage 3's first measurement task. The only inputs are S11.7's committed evidence and a static source read (`evidence/RFC-log-static-read.txt`, cited below as **SR §n**). Any number not taken from that evidence is labelled **estimate**.

---

## 1. Context (from the brief)

- **Mission:** make the homepage teardown appear with **zero interaction** on the slow-class host. The project route keeps its interaction gate, and `three` is not split (E3). One cycle: if it fails, D-19 becomes permanent for both routes.
- **Distance to the bar (S11.7 T014, slow class):**
  - home eager/gated TBT is **209.25 / 82.75 ms** (`s1`) and **210 / 86 ms** (`s3`), against a 200 ms bar;
  - home eager perf is 0.965 on both attempts, so AC3(a) is missing only ≈ 10 ms of TBT;
  - project gated is 83 / 87 ms (the AC5 reference).
- **Engine levers named by S11.7:**
  - **E1** — first content frame: GL program setup on the first `gl.render`, plus label placement;
  - **E2** — camera-fit layout effect (only if it sits inside home's TBT window);
  - **E3** — `three` split: out of scope.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — baseline reproduced first.** On a slow-class attempt (`benchmarkIndex` 1,900–2,600), before any product commit: home eager TBT within **±10 %** of S11.7's 209.25/210 ms, gated within ±10 % of 82.75/86 ms, with per-task attribution naming the tasks E1 and E2 will touch. If the host drifts beyond that, STOP and re-baseline — do not optimise against a number you did not reproduce.
- **AC2 — host-native frame bar.** During the first 5 s after load on the eager home path: **no task > 50 ms**, **except** the named unsplittable tasks — three's renderer constructor, the first `gl.render` program compile, and the first content frame. Each named exception is measured and reported individually and must not exceed **its own AC1 baseline + 5 %**. Dropped frames are reported on an **explicitly named harness mode** with a bound of **≤ 2 per route**, recorder excluded in writing.
- **AC3 — the gate, homepage only, two attempts.** On **two independent slow-class attempts**, `/` must satisfy **either** (a) Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**, **or** (b) **eager − gated TBT ≤ +50 ms** on the same attempt. Both attempts must pass. A fast-runner pass does not count.
- **AC4 — explicit byte budget.** Total JS gzip grows by **≤ +0.5 %** versus `main` at slice start, and per-route initial JS by **≤ +2 KB gzip**; both reported per route with the raw numbers. No "≤ previous" clause.
- **AC5 — the user-visible outcome.** On the slow class, with **zero interaction**, the home canvas is visible and animating (ambient idle) within **2.5 s** of load. `prefers-reduced-motion` → poster only, no canvas. The project route still requires interaction, and its gated TBT stays within ±5 % of S11.7.
- **AC6 — verdict, one cycle.** If AC3 passes twice: retire the gate **for `/` only** (D-19 amended: home eager, project gated) — Murphy's call on the numbers. If AC3 fails: **D-19 becomes permanent for both routes**, the eager path stays flag-only, the numbers are published, and the slice closes. No further optimisation rounds inside this slice.
- **AC7 — CI and surfaces.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates); frozen surfaces empty **except** the G1-approved E1/E2 files, each re-sealed with a reason note and listed in `XPLODER-SRC-OK`; pixel parity on the home canvas, 2 draw calls, CLS 0.

---

## 2. Static read: what the first content frame does on `/` today

### 2.1 The S11.7 final-state home profile (SR §1)

The largest eager-only task on home is the **first content frame**:

| Attempt | Simulated / observed | TBT |
|---|---|---:|
| T014 `s1`, task 6 | 156 / 39.0 ms | 106 ms |
| T014 `s3`, task 8 | 161 / 40.3 ms | 111 ms |

Its self time, resolved to source from the served-chunk snippets:

| Share of the task | Work | Source |
|---|---|---|
| ≈ 55–65 % | label placement + overlay model: `q`/`U`/firstFit/`G`/`Y`/`N`/`O` and the `tagsModel` closure | `overlay/place.ts`, `overlay/model.ts` |
| ≈ 15–16 % | garbage collection, mostly from placement's per-candidate allocations | `overlay/place.ts` |
| ≈ 7–10 % | three program setup (`R` ← `getUniforms`, `debug.checkShaderErrors` info logs) | three, via `Stats.tsx`'s `gl.render` |

The other eager-only home tasks are module evaluation:

- Turbopack `I`: 159–161 ms simulated. A 173–190 ms task of the same kind appears in the gated build too, so most of it is framework start-up.
- three evaluation: 120–126 ms simulated.

Splitting three is E3, out of scope. App-side staging was exhausted in S11.7 (L3a reverted on bytes).

### 2.2 Why placement and program setup share one task (SR §2)

- **First projector frame.** `OverlayProjector`'s first frame (`previousSignature === null`) projects the buffers and emits `settled`.
- **Overlay model.** `BlueprintOverlay`'s `useMemo` runs `overlayBaseModel` → `tagsModel` → `placeLabels`. Lighthouse's mobile viewport uses tags mode; wide viewports go through `placeColumns` → `placeLabels`.
- **First draw.** In the same frame, `Stats.tsx`'s priority-1 `useFrame` calls `gl.render`, which performs three's first program setup. `onStats` then flips `data-xploder-ready`.

### 2.3 Placement does work it throws away (SR §3), and this is the main finding

- **F1 — `firstFit` keeps only the first option.** It calls `labelOptions(...)[0]` (`place.ts:434`), which builds **every** candidate for the label and then keeps only the first:
  - one set per anchor (layer labels have up to 9 anchors) × 6 radii × 8 directions;
  - a second set for a part's `shortText`;
  - a centred candidate for tags.

  Each **valid** candidate is SAT-tested against **every** hull, and all valid candidates after the first are discarded.

  A lazy search that stops at the first valid candidate, visiting candidates in the same order, returns **the same placement by construction**. Most labels place on first-fit (`completeSearch` runs only when first-fit hides a label), so this removes most of the placement work. **Estimate:** ≥ 70 % of placement self time.
- **F2 — allocation churn.** `rectOverlapsPolygon` allocates an axes array per call, `rectProjection` a 4-corner array per axis, and `inflate` an object per candidate. That accounts for most of the 15–16 % GC share.
- **F3 — an exact AABB pre-reject exists.** The SAT axes `[1,0]` and `[0,1]` are tested first, and `projection([1,0], p) = p[0]` for finite input. A per-hull AABB, computed once per `placeLabels` call, therefore rejects exactly the same pairs before any allocation.
  - The edge axes and hull projections can also be computed once per hull, not once per candidate.
  - `.some()` over hulls is order-independent for its boolean result, so a spatial index (a uniform grid over the hull AABBs) is also result-identical.
- **F4 — the look-ahead keeps its order.** `completeSearch` consumes options in order, so a lazy generator in the same order is result-identical. The search-node cap (`SEARCH_NODE_LIMIT`) counts search nodes, not candidates, so it is unaffected.

**Consequence.** The cheaper placement can be **output-identical**. No placement has to move "after first paint". The first content frame keeps drawing exactly what it draws today, only sooner.

### 2.4 E2 source (SR §4)

- **What T006 H10 resolves to.** `ViewScroll.tsx:124-126` (deps `[turns, zoomFactor, height, width]`) runs `sync` on mount, and `onExtent` calls `setScrollExtentPx` in `TeardownViewer.tsx:241`. That causes a nested `TeardownViewer` re-render for the scroll spacer, then `scrollTop = extent / 2` plus a `scroll` event, and then `sync` runs again.
- **Not CameraRig.** `CameraRig.tsx`'s `fitZoom` effect has different deps and is **not** the H10 frame.
- **At S11.7 final:** no T014 home task resolves to this effect, so E2 is **expected to be skipped**. AC1 decides.

### 2.5 Other findings

- **F5 — hero-only eager needs a hero-only define (SR §5).** `__XP_EAGER_3D__` is one define read by both `hero-live.tsx:106` and `workbench-loader.tsx:65`. An app-side flag split is required, so that `/` can be eager while the project route stays gated. It is define-time, so dead code is eliminated and bytes are neutral (**estimate**: ≤ 50 B).
- **F6 — AC1 has to measure the existing eager build.** The flag split is a product commit, so it cannot precede AC1. AC1 therefore uses `pnpm build:eager`, the same build S11.7 measured, which is also what AC1 reproduces. `/` contains no workbench code, so the home numbers of `build:eager` and the later hero-eager build are the same code path.
- **F7 — S11.7's workflow won't run here.** `eager-load.yml` is gated on `head_ref == 'task/s11.7-eager-load'` (SR §6). This slice needs its own measurement workflow (D2).
- **F8 — the CPU condition changes.** AC2 is **host-native**: no CDP 4×. S11.7's AC2 was measured at 4× and failed at 85–112 ms max task. At host-native, S11.7's Lighthouse-observed tasks on the slow host are all ≤ 47.4 ms, and the eager-only ones ≤ 40.3 ms. So AC2's "no task > 50 ms" is **plausibly met at baseline**, and its risk is the per-exception +5 % caps and the dropped frames (§8).
- **F9 — housekeeping.**
  - Orca created this worktree on `TimurHaryo/task-s11.8-hero-eager`. It was renamed to `task/s11.8-hero-eager` before any commit (global branch rule).
  - The usage file is stale (captured 2026-10-29). Current 5h/7d usage is **unknown**.

---

## 3. Measurement plan

### D1 — Slow-class qualification (AC1, AC2, AC3, AC5)

- **Attempt:** one CI job on one runner VM. It builds the gated and eager products of one commit and measures them on that VM.
- **Slow-class:** an attempt qualifies iff **every** Lighthouse run in it reports `benchmarkIndex` within **[1,900, 2,600]**. One run outside the band disqualifies the attempt, which is then published as informational and never counted. This is S11.7 D1 unchanged.
- **Recorded per attempt (`perf:host` meta):**
  - runner name and image, run id/attempt/shard;
  - Chromium version;
  - min/median/max index;
  - the WebGL renderer string (SwiftShader on Vulkan at S11.7).
- **Independence (AC3):** two attempts on distinct runner VMs (distinct runner names). Matrix shards and reruns both qualify (S11.7 Q3 default).
- **Deciding attempts:** the **first two qualifying attempts in time order** after the final product state is reached decide AC3. Nothing is cherry-picked (S11.7 R4).
- **Cap:** at most 10 attempts per measurement phase (AC1; verdict). If too few slow-class attempts arrive → STOP + escalate with the index log. No local emulation is substituted.

### D2 — Harness modes and wiring (`tools/perf` additive + one new workflow)

**New workflow `hero-eager.yml`.** Its job is `perf: hero-eager (slow-class measurement)`: measurement-only, not a required check.

- **Trigger:** `if: github.head_ref == 'task/s11.8-hero-eager'`, with a 3-shard matrix.
- **Untouched workflows:** `eager-load.yml`, `eager-3d.yml`, `ci.yml` and `perf.yml` stay **byte-identical**.

**Steps per shard:**

1. **`perf:host`.**
2. **Build gated** (`pnpm build`) **and eager.** The eager build is `pnpm build:eager` until the flag-split task lands, and `pnpm build:eager-hero` after it. The workflow reads one variable, which the flag-split commit changes. The workflow log names the eager build used.
3. **Lighthouse on `/`:** `perf:lighthouse` ×2 invocations (each a median of 3) per build, plus 1 profiled run per build (`--profile`) → `perf:attribution` per-task table.
4. **Lighthouse on `/projects/websocket-inspector`, gated build only:** ×2 invocations. This is the AC5 ±5 % check. Optionally, the eager build's project route ×2 as well, which must equal gated by construction after the flag split.
5. **`fps:engine --scenario load` on the eager build, `/`, ×2 runs:**
   - **`--frames trace-only --cpu 1`** is the **named AC2 mode**. It is host-native, has no harness rAF loop, and counts dropped frames as Compositor `DroppedFrame` events in `[load, load + 5 s]`.
   - **`--frames recorder --cpu 1`** runs alongside, informational, **excluded from AC2 in writing**.
   - **`--frames trace-only --cpu 4`** is informational continuity with S11.7.
6. **`eager:probe`:**
   - `/` normal ×2 and reduced motion ×2 (AC5);
   - **`/projects/websocket-inspector --expect gated` ×2** (new, AC5).
7. **`bundle:manifest`** for both builds. Everything is uploaded, with traces gzipped.

**`tools/perf` additions** (additive; existing defaults byte-identical, each with tests):

- **`fps:engine --scenario load --names`.** It adds `disabled-by-default-v8.cpu_profiler` to the load trace and labels every task > 50 ms (and the named-exception tasks regardless of size) as one of:
  - **`renderer-constructor`:** the task whose samples include three's `WebGLRenderer` constructor (between `createStagedRenderer`'s two `nextTask()` yields);
  - **`program-compile`:** the task holding the first three program setup (`WebGLProgram` / `getUniforms` / `getAttributes` first use, or `compileAsync`'s compile call);
  - **`first-content-frame`:** the task in which `data-xploder-ready` flips (MutationObserver timestamp, matched to the trace task that contains it);
  - **`unnamed`:** anything else.

  The profiler stays on in **both** AC1 and the verdict, so baseline and caps are measured identically. Sampling overhead only makes the bar stricter.
- **`eager-verdict --rule s11.8`.** The rule is AC3: **`/` only**, per attempt, (a) perf ≥ 0.95 ∧ TBT ≤ 200, or (b) eager − gated ≤ +50, on two qualifying attempts. It also emits the AC1 reproduction check (§D3) and the AC5 project-gated ±5 % check. The `--rule s11.7` output and the default output stay byte-identical (golden tests).
- **`eager:probe --expect gated`.** Zero interaction until `load + 5 s`. Pass iff:
  - there is no `canvas` and no `data-xploder-ready`;
  - the poster is visible;
  - the trusted-event count is 0.
- **`bundle-scopes.mjs`.** The copy in this feature dir gains `--budget s11.8`: per-route initial gzip Δ ≤ 2,000 B, total JS gzip Δ ≤ +0.5 %, both against `main` at slice start.

**Sanitising:** the S11.5 rules apply (`<local-path>`, `<runner-home>`, `PORT`), and gitleaks checks every artifact before commit.

### D3 — AC1: reproduce first, attribute, then commit product

**Target band** (±10 % of either S11.7 attempt, Q3):

| Build | Band |
|---|---|
| home eager | [188.33, 231.00] ms |
| home gated | [74.48, 94.60] ms |

**Steps:**

1. **Push and run.** Push the harness + workflow (tools/workflow only, no product) and open a draft PR. `hero-eager.yml` runs, with reruns until one qualifying attempt arrives (D1).
2. **Reproduction check.** On that attempt, the two-invocation mean must fall inside both bands. If it does not: **STOP and re-baseline** (escalate with the index + TBT log). No product commit happens on an unreproduced number.
3. **Per-task attribution from the profiled Lighthouse run.** Every task > 50 ms simulated on `/` eager and gated is listed with:
   - simulated/observed duration, TBT share;
   - URL → chunk → module;
   - top self-time functions ≥ 5 %, resolved to source.

   It names explicitly:
   - **E1's task(s):** first content frame; its split into placement, overlay model, program setup and GC;
   - **E2's task:** whether a `ViewScroll` `sync` → `setScrollExtentPx` re-render task exists **inside home's FCP→TTI window** with > 50 ms simulated. **This decides E2 (go / skip).**
4. **AC2 baselines, host-native (`--cpu 1 --names`), from the same attempt** (the median of 2 runs per named task):
   - **`renderer-constructor`** duration;
   - **`program-compile`.** At baseline this is the task containing the first `gl.render` program setup, which is the first content frame itself (Q4);
   - **`first-content-frame`** duration;
   - unnamed tasks > 50 ms;
   - dropped frames.

   Each exception cap = baseline × 1.05, frozen in `evidence/T0xx-log-baseline.md`.
5. **Also recorded:** AC5 baselines (probe), bytes for both builds at `0fcd243` (the AC4 reference), project gated TBT (an informational drift check vs 83/87).
6. **Ordering proof.** `BASELINE-FIRST-OK`: the AC1 log commit precedes the first commit touching `apps/**` or `packages/**`.

### D4 — Local A/B (per lever, informational only)

- **Local emulation:** S11.7's chosen setting, native GL with Lighthouse `cpuSlowdownMultiplier` 18.5 (T006 §7, the drift table). It is labelled "local emulation" and never decides an AC.
- **Per lever:**
  - Lighthouse `/` ×2 invocations, before vs after;
  - `fps:engine --scenario load --frames trace-only --cpu 1 --names` ×2 and `--cpu 4` ×2 (informational);
  - a profiled run for the changed task's self-time split;
  - parity + draws + CLS (D7).
- **Keep rule:** Δ must exceed the larger run-to-run spread, and every non-goal check must pass. Otherwise the lever is reverted and recorded as "no measurable win".
- **One lever per commit.** Levers are not stacked "just in case": a lever runs only if its trigger (§4) holds on the measured state.

---

## 4. Engine exceptions: the E1/E2 file list (for G1 approval)

Exactly these paths may change under `packages/xploder/src`. Anything else is a protocol violation. Each file is either **required** (it will be edited) or **conditional** (edited only if its trigger is met on measured evidence; otherwise it stays untouched and is recorded as skipped). `XPLODER-SRC-OK` checks that the changed set ⊆ the approved set, and that each changed file carries a re-seal note.

| # | Path | Exception | Status | Why this file is the cause | Trigger (conditional only) | Seal |
|---|---|---|---|---|---|---|
| 1 | `packages/xploder/src/overlay/place.ts` | E1a | **required** | Owns `placeLabels` / firstFit / `placementsForText` / `rectOverlapsPolygon`: ≈ 55–65 % of the first-content-frame task's self time plus most of its GC (SR §1, §3) | — | S6 |
| 2 | `packages/xploder/src/overlay/model.ts` | E1b | conditional | `tagsModel` / `tagLabels` build the label list with nested `findIndex` lookups (the `(anon 45004)` frame, 13.3 % in T014 `s3`) | after E1a, `model.ts` self time ≥ 5 % of the first-content-frame task in the A/B profile | S6 |
| 3 | `packages/xploder/src/react/scene/Stats.tsx` | E1c | conditional | Its `useFrame(…, 1)` makes the first `gl.render`, which carries three's first program setup (`R` ← `getUniforms`, 7–10 %) | AC1 shows three program setup ≥ 5 % of the first-content-frame task, **or** that task is > 12.5 ms observed after E1a/E1b | S2/S4 |
| 4 | `packages/xploder/src/react/overlay/BlueprintOverlay.tsx` | E1d | conditional (last resort) | Its `useMemo(overlayBaseModel)` puts the overlay model into the first-content-frame task | after E1a–E1c, the first-content-frame task still contributes > 50 ms simulated **and** the projected `/` eager TBT is still > 185 ms (a 15 ms margin under 200) | S6 |
| 5 | `packages/xploder/src/react/scene/ViewScroll.tsx` | E2 | conditional (expected skip) | The mount `sync` → `onExtent` path is T006's H10 frame (SR §4) | AC1 attribution shows the `sync` / scroll-extent re-render in a home task > 50 ms simulated **inside FCP→TTI** | S5 |
| 6 | `packages/xploder/src/react/TeardownViewer.tsx` | E2 | conditional (only with #5) | `setScrollExtentPx` + the spacer/`scrollTop` layout effect cause the nested re-render that E2 removes | same as #5 | S8 |

**Not requested, with reasons:**

- **`CameraRig.tsx`:** not the H10 frame (SR §4).
- **`OverlayProjector.tsx`:** its first-frame projection is cheap (8 points per component); the cost is downstream.
- **`lettering/*` and `PartLettering.tsx` (S7/S8):** not in the hot stacks. The T006/T014 "lettering placement" frames resolve to `overlay/place.ts`.
- **`Slabs.tsx` / `blueprintMaterial.ts`:** a shader change would be a visual change.
- **Any `three` or `@react-three/fiber` configuration** (`dpr`, `antialias`, `frameloop`, `debug.checkShaderErrors`): visual or diagnostic behaviour.
- **E3:** out of scope.

### 4.1 Lever design (how the first content frame gets cheaper without changing pixels)

**E1a — output-identical placement search (`place.ts`), one commit, with an A/B and an oracle.**

1. **Lazy first-fit.** Candidate generation becomes an in-order generator: anchor → radius → direction, text before shortText, the centred tag candidate first. `firstFit` takes the first valid candidate and stops. `completeSearch` iterates the same generator, so its order, its results and the `SEARCH_NODE_LIMIT` semantics are unchanged.
2. **Per-call obstacle preparation.** Once per `placeLabels` call, compute each hull's AABB, edge-normal axes and the hull's projection interval on each axis. Also hoist the `excludeObstacles` filter so it runs once per label, not once per text.
3. **Exact pre-reject, no allocations.**
   - The AABB test replaces the first two SAT axes and uses the identical strict comparisons (F3).
   - The edge axes reuse the precomputed hull intervals.
   - The rect is projected with scalar math, with no corner or axes arrays and no `inflate` object (F2).
4. **Optional, only if (1)–(3) leave placement ≥ 5 % of the task:** a uniform grid over the hull AABBs. `.some()` is order-independent, so the result is identical.

**Proof of identity.** A new test file, `packages/xploder/test/overlay-place-equivalence.test.ts` (new and unsealed, outside the frozen manifests), checks:

- a verbatim copy of today's `placeLabels` as an **oracle** vs the new one;
- `deepStrictEqual` on `{placements, hidden, fellBack, offscreen}`;
- every committed fixture project at the S11.7 parity viewports (mobile/desktop), imploded/exploded, plus ≥ 2,000 seeded random layouts (the seed is printed);
- inputs including degenerate hulls, zero-area edges, labels on the viewport edge, a forced `completeSearch` path, and a hit on the node-limit path.

The sealed `test/overlay-place.test.ts` stays byte-identical and must still pass.

**E1b — label-list index maps (`model.ts`), conditional.** Precompute the `layerId → index` and `componentId → slot` maps once per model call, replacing the nested `findIndex` calls. The output is identical: the same oracle-style test on `overlayBaseModel` for the fixture projects.

**E1c — program setup ordering (`Stats.tsx`), conditional.** On mount, after `Slabs`' layout effects have set the instance colour buffers (so the program variant is final), call `gl.compileAsync(scene, camera)`. Stats' `useFrame` skips `gl.render` until it resolves, then `invalidate()`s. This has three effects:

- the program compile/link leaves the first-content-frame task. With `KHR_parallel_shader_compile` it is polled off-thread; without it, it is at least its own task;
- the first drawn frame is still the first instanced-draw frame, so `data-xploder-ready` keeps S11.6's "ready flips in the first instanced-draw rAF";
- a frame with no draw makes no visual difference, because the canvas is still under the poster (reveal waits for `ready`).

Guard checks:

- `gl.info.programs.length` is unchanged after the first render (no recompile);
- the draw count is 2;
- the reveal sequence is unchanged.

**E1d — overlay model one task later (`BlueprintOverlay.tsx`), last resort.** On the **first** `settled` only, compute `overlayBaseModel` in the next task before the overlay's fade starts, so the first-content-frame task only draws. The rest-state and revealed frames are unchanged, because the overlay is at opacity 0 until its fade, and the fade starts after the model exists.

**Risk:** the fade starts one task later. This is checked with the reveal-sequence probe and 0-px parity at rest. **E1d is not used if E1a–E1c reach the target.**

**E2 — no nested re-render at mount (`ViewScroll.tsx` + `TeardownViewer.tsx`), conditional.** The mount-time extent is written straight to the stage DOM (spacer height + centred `scrollTop`) inside the same layout effect. `onExtent` / the state update is published in a passive effect, so the R3F scene-mount commit no longer triggers a synchronous `TeardownViewer` re-render. The first frame's view offset is unchanged.

**Risk:** first-frame framing (S11.6 F4). This is checked with 0-px parity on the first content frame and the rest frames.

**Projection (estimate, scaled from T014 home):** E1a alone takes the first-content-frame task from ≈ 40 to ≈ 15–20 ms observed, i.e. −60 to −85 ms TBT, which puts `/` eager at ≈ 125–150 ms. That is **AC3(a) with ≥ 50 ms margin**, if perf stays ≥ 0.95 (0.965 today). AC3(b) (Δ ≤ 50) stays out of reach; (a) is the target.

### 4.2 Re-seal plan (for every file that actually changes)

1. **Lever commit:** the source change + its new test file + the A/B evidence.
2. **Re-seal commit (same task):**
   - In the owning generator, `base` moves to the lever commit's SHA. The generators are `frozen-surface.generate-s6.sh` (#1, #2, #4), `frozen-surface.generate.sh` (#3, S2/S4), `frozen-surface.generate-s5.sh` (#5) and `frozen-surface.generate-s8.sh` (#6).
   - The generator's `note` gains: `Re-sealed in S11.8 at <sha>: <path> — <one-line reason> (E1x/E2); see .specify/features/hero-eager/evidence/T0xx-log-<lever>-ab.md.`
   - The manifest is regenerated with the generator, never edited by hand.
   - `frozen-surface.test.ts` passes.
3. **`approved-xploder-src.txt`** in this feature dir lists exactly the files that changed, a subset of §4. It starts empty and is appended in each re-seal commit.
4. **`guards.sh`** (copied from S11.6/S11.7, `B=0fcd243`):
   - `XPLODER-SRC-OK`: `git diff --name-only B -- packages/xploder/src packages/xploder/package.json` = the approved list;
   - `RESEAL-NOTE-OK`: each approved file's generator carries an `S11.8` note naming it. **The S5 generator is added to the note check**, because S11.6's guard only covered S2/S4, S6 and S8;
   - `SURFACE-S2…S8-OK` with the approved files excluded;
   - `SEALED-TESTS-OK`: every sealed test is byte-identical;
   - `G1-LIST-OK`: the approved list ⊆ the §4 table, as approved at G1 (§10);
   - plus `FROZEN-OK`, `BRIEF-HISTORY-OK`, `BASELINE-FIRST-OK`, `CI-JOBS-OK` (`ci.yml`, `perf.yml`, `eager-3d.yml` and `eager-load.yml` byte-identical; `hero-eager.yml` the only new workflow), `FLAG-DEFAULT-OK`, `VERSIONS-OK`, `BUDGETS-OK` (`budgets.ts` untouched), `DEV-ROUTES-OK` and `GITLEAKS-OK`.

---

## 5. App-side (non-engine) changes

**A1 — hero-only eager flag (F5), the first product commit after AC1, byte-neutral:**

- `next.config.ts` adds `__XP_EAGER_HERO__ = process.env.NEXT_PUBLIC_EAGER_HERO === '1'`;
- `hero-live.tsx` gates on `__XP_EAGER_3D__ || __XP_EAGER_HERO__`;
- `workbench-loader.tsx` is unchanged (it reads `__XP_EAGER_3D__` only);
- `eager-3d.d.ts` declares the new define;
- `package.json` adds `build:eager-hero`;
- `eager-flag.test.ts` gains the new define's shape. Its intent is kept: the defines are read only in `next.config.ts`, and the gated branch is unchanged.

`app-touch.txt` lists exactly these files. A1 is not a lever, so it carries no A/B, only a byte check and the `--expect gated` project probe.

**A2 — retirement for `/` only** (only on AC3 ×2 pass **and** Murphy's "retire", Q8):

- the default flips to hero-eager. `__XP_EAGER_HERO__` is true unless `NEXT_PUBLIC_GATED_HERO=1`, which keeps the gate reachable for one slice;
- the workbench stays gated;
- the default build's perf gates are re-run;
- the D-19 amendment is recorded: home eager, project gated.

---

## 6. How AC1–AC7 are proven

| AC | Proof | Artifacts |
|---|---|---|
| AC1 | D3 on one qualifying attempt at the unmodified product (`build:eager` + `build`): reproduction inside both bands, per-task table naming E1/E2's tasks and the E2 go/skip, AC2 named-exception baselines (host-native), committed before any `apps/**` / `packages/**` commit (`BASELINE-FIRST-OK`) | `T0xx-log-baseline.md`, `T0xx-per-task-{eager,gated}-home*.md/json`, `T0xx-trace-*-home*.json.gz`, `T0xx-lighthouse-summary-ci-*.json`, `T0xx-fps-load-home-*.json`, `T0xx-host-meta-*.json` |
| AC2 | On **both** deciding attempts, eager `/`, named mode **`trace-only --cpu 1`**, 2 runs, median reported + raws: (i) every unnamed task in `[load, load + 5 s]` ≤ 50 ms; (ii) `renderer-constructor`, `program-compile` and `first-content-frame` each ≤ its AC1 baseline × 1.05, reported individually; (iii) dropped frames ≤ 2. `recorder` is published and marked "excluded from AC2: harness rAF recorder" | `T0xx-fps-load-home-{trace-only,recorder}-r{n}-att*.json`, `T0xx-log-ac2.md` |
| AC3 | `eager-verdict --rule s11.8` on the first two qualifying attempts after the final product state: `/` passes (a) or (b) on each. Fast or mixed attempts are listed and never counted | `T0xx-lighthouse-summary-ci-*.json`, `T0xx-verdict-s11.8-att*.md`, `T0xx-log-verdict.md` |
| AC4 | `bundle-scopes.mjs --budget s11.8` vs `0fcd243`, both builds (gated vs `main` gated; hero-eager vs `main` `build:eager`, Q6): `/` initial and project initial (raw + gzip, Δ ≤ 2,000 B gzip), total JS (raw + gzip, gzip Δ ≤ +0.5 %) | `T0xx-log-bytes.md`, manifests |
| AC5 | On both deciding attempts, 2 runs each, every run must pass (binary): `eager:probe /` normal (canvas visible, ready + revealed + fade done by navigation start + 2.5 s, non-blank, 0 trusted events); `/` reduced motion (no canvas, poster visible); `eager:probe /projects/websocket-inspector --expect gated` (no canvas without interaction); project **gated** TBT within ±5 % of S11.7 (Q3) | `T0xx-eager-probe-*.json` + PNGs at T, `T0xx-log-ac5.md` |
| AC6 | The verdict branch is recorded with per-attempt numbers. **Pass ×2:** the numbers go to Murphy; on "retire", A2 runs. **Fail:** D-19 is permanent for both routes, the hero-eager flag stays default-off (`FLAG-DEFAULT-OK`), numbers are published, the slice closes, and there is no second round | `T0xx-log-verdict.md`, §10 gate log |
| AC7 | CI on the PR head: all required checks green (incl. `seo: meta + og`, both axe jobs, perf gates), with run URL + `gh pr checks`. `guards.sh` log (§4.2). Re-seal diff (`git diff 0fcd243 -- packages/xploder` = the approved files + regenerated manifests + generator notes + new test files only). Home pixel parity 0 px (4 shots: mobile/desktop × light/dark, gated and post-eager no-input) + project parity 0 px (engine files are shared). `site:probe --group draws` = 2. CLS 0 (Lighthouse + load scenario) | `T0xx-ci-run.txt`, `T0xx-log-guard.txt`, `T0xx-log-reseal-diff.txt`, `T0xx-log-parity.txt`, `T0xx-log-drawcalls.txt` |
| Deliverable | Before/after table: AC1 baseline vs final, the same protocol per task (first content frame split, named exceptions, TBT, dropped frames, AC5 times, bytes) | `T0xx-log-before-after.md` |

**Non-goal checks run by every lever (D4):**

- 0-px parity;
- 2 draws;
- CLS 0;
- the reveal-sequence probe (unchanged ordered live-state list; ready in the first instanced-draw rAF);
- the existing app tests and both axe jobs;
- `site:probe --group hero`, both builds;
- reduced motion = poster.

---

## 7. Implementation sketch (Stage 2 input; Stage 3 STOPs at each group boundary)

1. **Baseline**
   - **T001:** `guards.sh` (`B=0fcd243`), an empty `approved-xploder-src.txt`, `app-touch.txt`.
   - **T002:** `tools/perf` additions (D2), with tests.
   - **T003:** `hero-eager.yml` + `bundle-scopes.mjs --budget s11.8`.
   - **T004:** push + draft PR → qualifying attempt → **AC1** reproduction, attribution, E2 go/skip, AC2 caps, bytes, committed.

   → **STOP (baseline):** Murphy sees the reproduced numbers, the per-task table and the E2 decision.
2. **E1**
   - **T005:** A1 hero-only flag (byte-neutral; project `--expect gated` probe).
   - **T006:** E1a + oracle test + A/B → re-seal S6.
   - **T007:** E1b (conditional).
   - **T008:** E1c (conditional) → re-seal S2/S4.
   - **T009:** E1d (conditional, last resort).

   → **STOP (E1).**
3. **E2**
   - **T010:** E2 (conditional; skip-with-evidence if AC1 says skip) → re-seal S5/S8.

   → **STOP (E2)**, if E2 ran; otherwise it is folded into the E1 STOP.
4. **Verdict**
   - **T011:** `hero-eager.yml` on the final state until two qualifying attempts exist → AC2/AC3/AC5 → verdict.

   → **STOP (verdict).**
5. **CI and surfaces**
   - **T012:** guards, CI run, AC self-check, re-seal diff, before/after.
   - **T012b:** A2 retirement, only on "retire".

   → **STOP (end-contract).**

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Host drift at AC1:** the slow class now runs faster or slower than S11.7's band | STOP + re-baseline (Hard Rule 3). Attempts outside both bands are published, never optimised against. Cap of 10 attempts → escalate |
| **AC2 caps are tight on unchanged tasks.** `renderer-constructor` is untouched by this slice, but run-to-run noise on a ≈ 10–20 ms native task can exceed +5 % | median of 2 runs, profiler on in both AC1 and the verdict (same mode). A miss is reported individually and escalated with both raws. It is never rerun until green (EVIDENCE §6) |
| **Dropped frames at host-native are unmeasured.** S11.7 measured 9.5–13 only at 4× | AC1 records it. If the baseline is already far above 2, Murphy sees it at the baseline STOP. E1a shrinks the only big eager task in the window |
| **E1a not identical in an edge case** (float, NaN, ordering) | an oracle test over fixtures + 2,000 seeded random inputs, including edge cases; 0-px parity on both routes; the sealed placement tests unchanged |
| **E1c recompiles at first render** (the program variant differs after `compileAsync`) → no win | compile after Slabs' instance colours are set; assert no new program after the first render. If it does recompile, revert E1c as "no measurable win" |
| **Project gated TBT ±5 %** (≈ ±4 ms) is inside S11.7's own attempt-to-attempt spread (83 / 86 / 87 ms) | the gated project code path is byte-identical by construction (A1 is define-time; E1 runs only after interaction). The AC5 check is a host-drift check; a miss is escalated with the index log, not "fixed" |
| **Perf score < 0.95** even with TBT ≤ 200 (LCP/FCP drift on the host) | eager perf has been 0.965 on both S11.7 attempts. LCP is poster-bound and untouched |
| **Bytes:** E1a adds code to the non-initial xploder chunk | **estimate** ≤ 0.6 KB gzip, vs a budget of ≈ 2.3 KB (0.5 % of 459,006 B); measured per lever |
| **Executor (DeepSeek Flash 4.1)** unavailable (402) or stuck | probe before each wave; stuck ×2 → the orchestrator executes personally (Hard Rule 10); Tier 1.5 skipped-with-record; browser/perf tasks run with the sandbox off |

---

## 9. Open questions (each with a recommended default)

1. **Q1 — The E1/E2 file list (§4).** **Default:** approve all six paths with the statuses and triggers as written: #1 required; #2–#6 conditional on the stated measured trigger, untouched otherwise. **Alternative:** approve #1–#3 only (no E1d, no E2). If E1a–E1c then fall short, the verdict runs on that state; there is no mid-slice re-ask.
2. **Q2 — "Product commit" boundary (Hard Rule 3).** **Default:** product = `apps/**` and `packages/**`. Harness (`tools/perf`), the workflow and feature-dir files may land before AC1, as in S11.7.
3. **Q3 — Reference values for "within ±10 % of 209.25/210" (AC1) and "within ±5 % of S11.7" (AC5).** **Default:** inside the band of **either** S11.7 deciding attempt:
   - AC1 eager [188.33, 231.00], gated [74.48, 94.60];
   - AC5 project gated [78.85, 91.35] (±5 % of 83 / 87).

   **Alternative (stricter):** ±X % of the mean of the two attempts.
4. **Q4 — AC2 named exceptions are tasks.** **Default:** each exception is the **task** (trace `RunTask`) identified by D2's `--names` classifier. At AC1, "first `gl.render` program compile" and "first content frame" are **the same task**, so both caps equal that task's baseline × 1.05. If E1c splits the compile into its own task, the compile task is capped at that same baseline × 1.05. **Alternative (stricter):** cap the compile at its profiled sub-span within the AC1 task × 1.05.
5. **Q5 — AC2 harness mode name and CPU.** **Default:** the named mode is **`fps:engine --scenario load --frames trace-only --cpu 1 --names`**, host-native on the slow-class runner, window `[load, load + 5 s]`. `recorder` is excluded in writing. `--cpu 4` is published as informational continuity with S11.7.
6. **Q6 — AC4 comparison pairs.** **Default:** the post-slice gated build vs `main` gated, and the post-slice hero-eager build vs `main` `build:eager`, at `0fcd243`. "2 KB" = 2,000 B gzip (the stricter reading, as S11.7 Q11). +0.5 % is on total JS gzip; raw is reported too.
7. **Q7 — New workflow.** **Default:** `hero-eager.yml` (measurement-only, not required, only for this branch, 3 shards). `eager-load.yml` and `eager-3d.yml` stay byte-identical. All three are removed together once the D-19 outcome is recorded, in a later housekeeping change, not in this slice.
8. **Q8 — On AC3 pass ×2.** **Default:** the numbers go to you; on your "retire", A2 runs inside this slice (default build = hero-eager, project gated, `NEXT_PUBLIC_GATED_HERO=1` as a one-slice escape hatch, perf gates re-run, D-19 amended).
9. **Q9 — On AC3 fail.** **Default:**
   - D-19 is permanent for both routes and the hero-eager flag stays default-off;
   - **E1 engine changes that passed their non-goal checks stay merged.** They are output-identical, sealed with notes, and also make the gated path's post-interaction first frame cheaper;
   - A1 stays (flag-only).

   **Alternative:** revert every engine file on fail, so the surfaces are empty.
10. **Q10 — Push + draft PR early.** **Default:** approved now for T004 (AC1 needs CI). The orchestrator merges only on your "merge".
11. **Q11 — "Ambient idle" and the 2.5 s clock.** **Default:** the same as S11.7 Q8/Q9:
    - deadline = navigation start + 2.5 s, host-native CPU, no network throttle;
    - visible = canvas + ready + revealed + fade complete at T;
    - animating (ambient idle) = the S10 at-rest live view, rendered on demand, non-blank;
    - no timed motion is added.
12. **Q12 — Executor and escalation.** **Default:**
    - Tier 1 = DeepSeek Flash 4.1, probed before each wave;
    - stuck ×2 → the orchestrator executes personally;
    - Tier 1.5 dormant (skip-with-record);
    - every task reports its finishing tier;
    - CI steps (push, reruns, downloads) are the orchestrator's.

---

## 10. Stage-1 hand-off

**WHAT MURPHY SHOULD TEST/VALIDATE**

1. §2.3 F1: placement builds every candidate and keeps one. You accept that E1a can be **output-identical** (an oracle test + 0-px parity), so no label moves "after first paint" unless E1d is needed.
2. The §4 file list: exact paths, required vs conditional, the triggers, and the "not requested" reasons (CameraRig, the lettering modules, materials).
3. §2.4: E2 resolves to `ViewScroll.tsx` + `TeardownViewer.tsx`, not CameraRig, and it is expected to be skipped. AC1 decides.
4. F5 / A1: a hero-only define is needed, because today one flag drives both routes.
5. Q3 / Q4: the reference bands and the "exceptions are tasks" reading. The literal readings are spelled out; tell me if you want the stricter alternatives.
6. `evidence/RFC-log-static-read.txt`.

**WHAT THE AGENT NEEDS FROM MURPHY** (defaults apply if you say nothing)

1. **G1 approval of the E1/E2 file list (§4, Q1).** Default: all six paths as written.
2. Answers to Q2–Q12. Default: all §9 defaults.
3. Current 5h/7d usage from `/usage` (F9). Default: Stage 2 proceeds, and usage is asked again before the Stage 3 dispatch.
4. "approved" (or feedback) to start Stage 2 (spec/plan/tasks).

---

## 11. Gate log

1. **Stage 1 (2026-11-04):** RFC drafted on `task/s11.8-hero-eager` (F9: branch renamed before any commit). Nothing was built, run or profiled.
2. **Gate 1 (Murphy, 2026-11-04, 5h 16%): "defaults. approved".**
   - Q1–Q12 = the §9 defaults.
   - **The E1/E2 file list is approved as written in §4:** #1 `overlay/place.ts` required; #2 `overlay/model.ts`, #3 `react/scene/Stats.tsx`, #4 `react/overlay/BlueprintOverlay.tsx`, #5 `react/scene/ViewScroll.tsx` and #6 `react/TeardownViewer.tsx` conditional on their stated triggers. No other `packages/xploder/src` path may change.
3. **Stage-2 re-check of the defaults against the code.** These are refinements R1–R8. None of them changes an AC.
   - **R1 (re-seal touches three files).** `frozen-surface.test.ts` pins each manifest's `base` and `note` as literals (L122-126 and the like). A re-seal therefore edits the generator (`base` + `note`), regenerates the manifest, **and** updates those two literals in `frozen-surface.test.ts`, as S11.6 did for S8 at `2fd19f0`. `frozen-surface.test.ts` is not in any `*.paths` list, so `SEALED-TESTS-OK` is unaffected.
   - **R2 (seal bases after a squash).** Existing bases (`f65b13c`, `405bca1`) are slice-branch commits that are not ancestors of `main`, because the PRs were squash-merged. The S11.8 re-seals follow the same convention: the base is the lever commit on the slice branch, and the note names it plus its A/B evidence file. Regeneration runs in the slice worktree, where that commit exists.
   - **R3 (`perf:parity --route`).** `perf:parity` always captures both routes (`ROUTES`, `cli/parity.ts` L76). On the hero-eager build the project route never mounts without input, so `--no-engage` would hang there. Additive `--route home|project` (default both, byte-identical): post-eager no-input parity runs `--route home` on the hero-eager build; project parity runs engaged on the gated build.
   - **R4 (load scenario).**
     - `fps:engine --scenario load` builds `pnpm build:eager` (both routes eager) unless `--no-build`, so the workflow and the lever block always build first and pass `--no-build`.
     - `--names` adds the V8 sampling category to `LOAD_TRACE_CATEGORIES` only when set, and reuses the load observer's `readyMs` (already in the init script) to find the first-content-frame task.
     - Without `--names`, the output is byte-identical.
   - **R5 (`eager-verdict --rule s11.8`).** It reads the same per-attempt layout as `--rule s11.7` (`{gated,eager}-{home,project}-r{n}/`, `host-meta.json`). It needs home eager + gated and project gated; project eager is optional and informational. The default and `--rule s11.7` outputs stay byte-identical (golden tests).
   - **R6 (hero probe on the gated build only).** `site:probe --group hero` asserts gated behaviour (not revealed at FCP, revealed after interaction). It runs on the gated build. The hero-eager build is covered by `eager:probe`.
   - **R7 (oracle location).** The verbatim pre-slice `place.ts` used as E1a's oracle lives in `packages/xploder/test/oracles/place-s11.7.ts`. That is outside `src/` (so it is not shipped and not scanned by `no-motion-literals`) and outside every sealed manifest. The same applies to the `model.ts` oracle if E1b runs.
   - **R8 (E1c ordering and task numbering).**
     - `Stats` is the last child of `Scene`, so its layout effect runs after `Slabs`' instance-colour effects. That is where `compileAsync` starts.
     - The RFC §7 sketch becomes T001–T013 (+ T013b only on "retire"). As in S11.7, a final local-state task (T010) closes the E1 group, and E2 is T011.
