# RFC — S14 Engine & Hero Polish (six parked defects)

**slice:** S14-engine-polish · **status:** DRAFT for Gate 1 · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-14-engine-polish.md` (frozen brief v1) · **branch:** `task/s14-engine-polish` · **base:** `a9edbfc` · **date:** 2026-11-14 · **revision counter:** 0 of 2

> This RFC records design decisions only and does not change scope. Where it seems to conflict with the brief, the brief wins and the conflict becomes an open question (§11). Nothing is implemented.
>
> **Inputs:** a static read of the code, the CI artifacts of the S13 flake, and local repros against the production export of `a9edbfc` (`pnpm build`, `pnpm serve:out` on `127.0.0.1:4614`, Playwright Chromium 156.0.8078.4, macOS). The repro scripts are committed in `rfc-repro/` and their outputs in `evidence/RFC-*`. Any number that does not come from those files is labelled **estimate**.

---

## 1. Context (from the brief)

- **Mission:** close six parked defects with test-first fixes. Each fix touches only the frozen surfaces its item needs, and every touched surface is re-sealed with a written reason. No content changes, no UI redesign, no new features, no new dependencies.
- **Order (kickoff):** I-09 → I-10 → I-03 → I-05 → I-04 → I-08.
- **Gates (unchanged):** mobile Lighthouse ≥ 95/95 on `/`, `/projects` and `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero reveal with zero interaction.

### Acceptance criteria (verbatim, inviolable)

- **AC1 (I-09):** with A's panel open and B hovered, both A and B are emphasised; leaving B keeps A emphasised; closing the panel clears A unless hovered; keyboard focus on A keeps it emphasised. Evidence: emphasis-target assertions + screenshots (light/dark, desktop/phone).
- **AC2 (I-10):** five consecutive probe runs: **0 CLS in every cell**, reverse drill passes every time; hero corner-mark boxes are **identical** before and after reveal on a 390 px viewport (coordinates listed). No probe timeout was merely increased — the probe waits on a settled signal.
- **AC3 (I-03):** pausing mid-explode yields **exactly one** settle transition (event count = 1); no position jump; resume continues; reduced motion unchanged. Evidence: event log + frame captures.
- **AC4 (I-05):** at 1× / 2× / 3×, both palettes, 390 px and 1440 px, the layer-count note's box never intersects a layer-name box — geometric assertion with the measured rectangles attached.
- **AC5 (I-04):** zero `THREE.Clock` deprecation warnings; tour duration and step boundaries within ±1 frame of the pre-slice baseline; parity screenshots 0 px difference.
- **AC6 (I-08):** the three workflow files are gone from `main`; a PR still reports all **seven** required contexts; no required check becomes "expected" without a run.
- **AC7 (gates):** full CI green (build, gitleaks, `seo: meta + og`, Lighthouse, weight, axe production routes, fixture exclusion); 2 draw calls; eager hero intact; every touched S5/S6/S8 file re-sealed with a written reason; S2/S3/S4/S7 diffs empty.

---

## 2. Baseline: what reproduces today

| Item | Reproduced? | How (artifact) | Key numbers |
|---|---|---|---|
| I-09 | **Yes**, deterministic | `rfc-repro/i09.mjs` → `evidence/RFC-log-i09-repro.txt` | Click `frame-row` → highlight `frame-row`; hover `inspector-service` → `inspector-service`; move away → **`null` with the panel still open** |
| I-10 drill | **Yes**, mechanism shown in the CI artifact | `evidence/RFC-log-i10-ci-cls-entry.json`, CI `drill.json` (run `43586127421` attempt 1) | The expected tab list was read **before** `hero:pause` existed; the backward walk contained it |
| I-10 CLS | **Yes**, deterministic once the HTML stream stalls | `rfc-repro/chunk-server.mjs` + `chunk-probe.mjs` → `evidence/RFC-log-i10-stall-repro.txt` | 390×740 and 360×740: the two bottom corner marks shift (0.000248 / 0.000269). Control without a stall: 0 |
| I-03 | **Not as "more than once"**: 16 of 16 runs settle exactly once | `rfc-repro/pause-sweep.mjs` → `evidence/RFC-log-i03-pause-sweep.txt` | While paused: 1 settle (labels +23 / +22) in every cell. On resume: a **1.43 s dead wait** before the next phase |
| I-05 | **Yes**, deterministic | `rfc-repro/note-overlap.mjs` → `evidence/RFC-log-i05-overlap.txt`, `evidence/RFC-screenshot-i05-*.png` | 1440 px, 2× and 3×, both palettes, both projects: "5 layers" intersects "3 CAPTURE" / "3 DECISION CLIENT". 1× clear; at 390 px the note is hidden at 2×/3× |
| I-04 | **Yes** | `rfc-repro/console-warnings.mjs` → `evidence/RFC-log-i04-console.txt` | 1 warning per canvas on `/`, `/projects/websocket-inspector` and `/projects/jev-toolkit` |
| I-08 | n/a | `gh api …/rulesets/26115910` | Seven required contexts (§8). `eager-3d.yml` runs on every PR; the other two skip on non-matching branches |

### Corrections to the brief's assumptions (C-items; none changes an AC)

- **C1 — I-04 has no `THREE.Clock` in xploder.** `xploder` never constructs or reads a clock: its timing is `performance.now()` (`useTeardownViewer.ts` `defaultNow`, `scene/Scene.tsx` `defaultNow`), and no `useFrame` callback reads `state.clock` or `delta`. The warning comes from `@react-three/fiber` 9.8.2 (the latest stable release). Its `createStore` builds `clock: new THREE.Clock()` (dist `events-*.js`, one per `<Canvas>` root). A "migration to `THREE.Timer`" inside S5 therefore cannot remove the warning (§7, Q4).
- **C2 — I-03 already counts one settle.** In every local cell the engine settles exactly once while paused. The one reproducible deviation inside I-03's wording is the resume: it re-runs the interrupted step's full wait (§5, Q3).
- **C3 — I-09 needs one S5 file the brief does not name.** `src/react/scene/Emphasis.tsx` builds the `emphasisTargets` input field by field, so a new `selected` input never reaches the scene unless this file forwards it (§3, Q1). `pointer.ts` is named in the brief as the cause, but it does **not** need to change.

---

## 3. I-09 — an open panel's tile loses its highlight on hover

**Repro (exact):** `/projects/websocket-inspector`, 1440×900 → "Explore in 3D" → click tile A (`frame-row`) → move the mouse over tile B (`inspector-service`) → move the mouse off the stage. Expected: A stays emphasised while its panel is open. Actual: `data-xploder-highlight` is `null` and A is unlit (`evidence/RFC-log-i09-repro.txt`).

**Root cause:**
- The engine has one emphasis slot: `src/interaction/pointer.ts` `PointerState.highlight`.
- Opening a detail panel writes a `program` highlight once (`src/react/TeardownViewer.tsx`, the panel `useLayoutEffect`, S7 "Highlight sync").
- A mouse `move` onto B replaces that slot (`source: 'mouse'`), and `leave` clears it.
- `src/interaction/emphasis.ts` `emphasisTargets` lights only `input.highlight`, so nothing remembers A.

### 3.1 Design: a `selected` emphasis input

| File (surface) | Change |
|---|---|
| `src/interaction/emphasis.ts` (S5) | `EmphasisInput` gains `readonly selected?: string \| null` (**optional**, so every existing caller and the sealed tests stay byte-identical and behave as before). `emphasisTargets` sets `hover[index(selected)] = 1` in addition to `hover[index(highlight)]`. Selected uses the same channel and tokens as hover, which is the emphasis an open tile already gets today, so no new token or visual. |
| `src/react/scene/Emphasis.tsx` (S5, **not named in the brief**, Q1) | `useEmphasisDriver` reads `state?.selected ?? null`, passes it into `emphasisTargets` and adds it to the memo deps. That is the whole change. |
| `src/react/TeardownViewer.tsx` (S8) | (a) The emphasis memo adds `selected: detailOpenId`, the open detail panel's component, else `null`. (b) The panel effect writes the open-time `program` highlight only when `viewer.highlight !== componentId`, so an existing mouse or touch hover on A keeps its source. (c) On close it clears the highlight only if it is still the closed id **and** its source is not `'mouse'` **and** the focused element is not that id's navigator proxy (`[data-xploder-proxy="<id>"]`). (d) `PartLettering` and `BlueprintOverlay` receive `highlight={viewer.highlight ?? detailOpenId}`, so after B is left A's name looks exactly as it did just after opening (Q2). |
| `src/interaction/pointer.ts` (S5) | **No change.** |

**How the AC1 clauses come out:**

| AC1 clause | `highlight` | `selected` | Lit |
|---|---|---|---|
| A open, B hovered | B (mouse) | A | A + B |
| B left | `null` | A | A |
| Panel closed with the X, pointer elsewhere | `null` | `null` | none |
| Panel closed by clicking A while hovering A | A (mouse, kept by (b) and (c)) | `null` | A |
| Keyboard focus on A's proxy, panel open | A (program, set by the navigator `onFocus`) | A | A |
| Escape closes; focus returns to A's proxy | A (kept by (c): A's proxy is focused) | `null` | A |

**Accessibility impact:**
- No DOM, ARIA or focus change: the navigator props, `aria-expanded`/`aria-controls`, the live region and the panel focus contract (focus into the panel on open, back to the opener on close: `onPanelClose` → `focusProxyOpener`) are untouched.
- `data-xploder-highlight` keeps its meaning: the pointer/keyboard highlight. The S7 probe `panel-open-mouse/touch` samples it right after the click with the pointer still on the slab, so it still reads the target. Stage 3 re-runs `engine:probe` (s7/s8 groups) to prove it.

**Failing tests first:**
- `test/emphasis-selected.test.ts` (new, unit): `emphasisTargets(layout, { highlight: B, selected: A, … })` lights both A and B. Red today because `selected` is ignored.
- `test/viewer-selected.test.tsx` (new, integration, the `viewer-panels.test.tsx` harness):
  - open A, then pointer `move` B, then `leave`: A is lit, read from the emphasis state the Scene receives;
  - close: A is cleared, or kept when hovered;
  - keyboard focus on A's proxy keeps A lit.
  - Red today at "leave B keeps A".

**Re-seal:**
- S5: `src/interaction/emphasis.ts` and `src/react/scene/Emphasis.tsx`; add `test/emphasis-selected.test.ts` to `frozen-surface.s5.paths`.
- S8: `src/react/TeardownViewer.tsx`; add `test/viewer-selected.test.tsx` to `frozen-surface.s8.paths`.
- Procedure: §9.

---

## 4. I-10 — home-hero CI probe flake and unstable corner marks

### 4.1 Drill (reverse walk)

- **Repro:** CI run `43586127421` attempt 1, `drill.json`. `readDrillStructure` ran right after `waitForHydration`, before the live loop started, so the expected list has no `hero:pause`. The pause button then mounted between the forward and the backward walk, and the backward list gained `hero:pause` and lost `skip`.
- **Root cause:** `tools/perf/src/site-probe.ts` `runDrillGroup` waits only for hydration (the theme button). It never waits for the hero to reach its final set of tab stops.

### 4.2 The settled-state signal

**"Settled" means:** the hero has reached a terminal state, after which nothing in it can add, remove or move a tab stop or a box. It is read from attributes that already exist, so the app gains no new attribute:

| `[data-site-live]` mode / state | Settled when |
|---|---|
| `eager`, `revealed` | `[data-hero-loop-slot] button` exists (`showcase.available`, set on the first frame) and `[data-hero-loop]` is present |
| any mode, `skipped` (reduced motion, Save-Data, no WebGL) | immediately |
| `gated`, `idle` (`NEXT_PUBLIC_GATED_HERO=1`, no interaction) | immediately (terminal until a user acts) |

In every row the probe then also awaits `document.fonts.ready` and two `requestAnimationFrame`s.

- **Helper:** `waitForHeroSettled(page)` in `site-probe.ts`.
  - The drill calls it before `readDrillStructure`.
  - The `/` CLS cell calls it after `activateHomeLive`.
  - Its timeout is the existing `WAIT_TIMEOUT_MS`, unchanged.
- **Why this removes the flake rather than hiding it:** the expected list, the forward walk and the backward walk are all taken after the last hero tab stop exists. Once it is mounted, the loop button is never unmounted (`available = sequence.started` never goes back to false), so the three lists describe the same DOM. No timeout or sleep is added or raised, and the CLS cell's 3 s observation window (`SETTLE_MS`) stays as it is: it is where late shifts are caught, so shortening it would hide them.

### 4.3 Corner marks (CLS)

- **Repro (exact):** `node rfc-repro/chunk-server.mjs 4615 data-hero-annotation 600` is a proxy that stalls `/` for 600 ms just before the hero caption. Then `node rfc-repro/chunk-probe.mjs <repo> http://127.0.0.1:4615/` (dark, mobile). Result: at 390×740 and 360×740 the two bottom corner marks shift. With the direct server, nothing shifts.
- **Root cause, from the measurements:**
  1. The CI shift happened at **145.6 ms**, before hydration: the probe delays every JS chunk by 250 ms. So it is **not** the loop controls appearing, as S13 guessed.
  2. Only the two bottom marks moved, by **+24.78 px**. Nothing above them moved, and the scroll-cue span, which also sits at the section bottom but is **after** the content in the DOM, was not among the shifted sources.
  3. On mobile the hero's natural content height (776.78 px locally) is within 1.22 px of its reserved `min-h` at 412×823 (778 px; `evidence/RFC-log-i10-hero-natural.txt`). On CI's Linux fonts it is content-bound: 778 + 24.78 = 802.78 px.
  4. `BlueprintSheet` (grid + crop marks, absolute, anchored to the section bottom) comes **before** the content in `apps/web/components/home/hero-section.tsx`. When Chromium paints a partly parsed document mid-hero, the marks are painted at the not-yet-final section bottom. When the rest of the hero arrives, the content-bound section grows and the marks move.
  5. Locally the hero is not content-bound at 390×844 / 412×823, which explains 0 of 5 local repros. At 740 px tall it is, and the stall reproduces it.
- **Smallest fix:**
  - Move `<BlueprintSheet />` after the content `div` in `hero-section.tsx`. Then the marks are parsed only after all in-flow hero content, so their first paint already uses the final section height.
  - Paint order is unchanged: the content is `relative z-10`, and the sheet is a z-auto positioned element below it. Expected visual difference: 0 px, proven by a pixel diff.
  - No timing, no layout value and no frozen file changes.
- **Failing test first:** a new `site-probe` `cls` check, `hero-marks-stable-<viewport>`. It runs in CI's `--ci` set inside the required axe job.
  - The probe serves the export through an in-process stall proxy that holds the HTML just before `data-hero-annotation`.
  - It records the four corner-mark boxes at first paint and again after the hero settles (§4.2), at **390×844** (AC2's viewport), **390×740** and **360×740** (content-bound), and asserts identical boxes and zero layout-shift entries.
  - Red today at 390×740 and 360×740.
- **Re-seal:** none. `apps/web` and `tools/perf/src/site-probe.ts` are not sealed surfaces, and the S3 tool files listed in §9.3 are not touched.

---

## 5. I-03 — pausing mid-explode

**Repro (exact):** `/`, 1440×900 and 390×844 → wait for `data-hero-phase="explode"` → wait N ∈ {50, 300, 600, 850} ms → press Pause → wait 5 s → press Play → wait for `capture` (CPU ×1 and ×4). Script: `rfc-repro/pause-sweep.mjs`.

**Measured (`evidence/RFC-log-i03-pause-sweep.txt`, 16 cells):**
- **While paused:** the in-flight explode tween finishes, then the engine settles **once** (one `data-xploder-state=exploded`, one batch of +23 / +22 label elements). Nothing else changes. Event count = 1 in 16 of 16 cells.
- **On resume:** `hero-loop.ts` `resumePending` calls `wait(next.delayMs, …)` with the step's **full** delay. The explode step's wait restarts from zero, so the hero sits still for **1.43 s** after Play before `zoomin` starts, even though the explode had finished.
- The zoom-end label flash (labels appear about 120 ms before the capture tour hides them) happens **with and without** a pause, so it is not I-03 and is out of scope.

**Reading of AC3 (Q3):**
1. **"Exactly one settle transition (event count = 1)"**: already true locally. Stage 3 locks it with a test, and a fix lands only if that test goes red on CI or on throttled runs. A candidate mechanism for a second settle on slow devices is a mid-tween frame with an unchanged signature in `OverlayProjector`. If it reproduces, that is an S6 file outside this RFC's re-seal list, so the orchestrator STOPs and asks Murphy.
2. **"No position jump; resume continues"**: we read "resuming continues from the same position" (brief, Wanted) as continuing the storyboard from where it was paused, not restarting the interrupted step's wait.

**Smallest fix (default, Q3):**
- `apps/web/components/hero/hero-loop.ts`: `wait` records the start time of the pending step, `pause` stores the elapsed part, and `resumePending` waits `max(0, delayMs − elapsed)`.
- This is the shared helper for every non-tour phase, so implode, turn and zoom pauses also resume with their remaining time. There is no special case for explode. Tour phases already resume through the engine's tour clock and are unchanged.
- Injectable `schedule`/`cancel` already exist, and a `now` option defaulting to `performance.now` makes it testable.

**Failing tests first (`apps/web/test/home-hero-loop.test.tsx`, fake scheduler and clock):**
- Pause 400 ms into explode, wait 5 s, resume: the next phase is scheduled after 1000 ms (1.4 s − 0.4 s). Red today: 1400 ms.
- An engine-level settle counter, written as an xploder test or a probe check: pause → exactly one `settled` OverlayEvent until resume. Green today; it guards the AC.
- No position jump: the explode `progress` sampled across the pause is monotonic, with no step greater than one frame's tween delta.
- Reduced motion: the `site-probe` `reduced-motion` group (poster only, no loop) stays green, unchanged.

**Re-seal:** none in the default. `hero-loop.ts` is app code.

---

## 6. I-05 — the layer-count note overlaps a layer name while zoomed

**Repro (exact):** `/projects/websocket-inspector` or `/projects/jev-toolkit`, 1440×900, either palette → "Explore in 3D" → focus the viewer → press `=` 3× (zoom 1.953) and 5× (zoom 3). The `dimension:stack` note ("5 layers") intersects the plate-lettered layer name "3 CAPTURE" / "3 DECISION CLIENT" (`evidence/RFC-log-i05-overlap.txt`, `evidence/RFC-screenshot-i05-*.png`). At 1× it is clear. At 390 px the note is not shown at 2×/3× (no free spot; existing S6 rule) and is clear at 1×.

**Root cause:**
- `src/overlay/model.ts` `tagsModel` places the tags, the S6 layer labels and the two dimension notes with `placeLabels`, using component hulls and earlier placements as obstacles.
- Since S7/S8 the visible layer names are the **plate lettering** (`src/lettering/layers.ts` `layerLetteringModel`, drawn by `PartLettering`). The S6 layer label is hidden by CSS wherever the plate lettering succeeded.
- So the note avoids an invisible S6 label but not the visible plate name. When zoomed, the plate name runs across the stack rail where the note is anchored.

**Smallest fix (S6 `src/overlay/model.ts` only):**
- In `tagsModel`, compute the plate layer-name quads with the same pure function and inputs `PartLettering` uses: `layerLetteringModel({ layers: frame layers with names, components: hulls, canvasWidth })`, on the viewport frame.
- Append the quads to the obstacle list, and add their indices to `excludeObstacles` of **every non-dimension label**. Tag and layer-label placement therefore stay output-identical, and only the two dimension notes avoid the plate names.
- If the note finds no free spot, `placeLabels` hides it (existing rule, Q5).
- `src/lettering/layers.ts` is **imported, not edited**. It imports only a type from `overlay/project`, so there is no import cycle and S7's bytes are unchanged (Q6).
- `columnModel` gets the same check if Stage 3's test shows the note can meet a column row there; otherwise it is left alone.

**Geometric assertion design (AC4):**
- **Boxes:**
  - the note: the visible `[data-xploder-label="dimension:stack"]`;
  - layer names: every visible `[data-xploder-lettering-layer-label]` (plate lettering, often rotated), visible `[data-xploder-label^="layer:"]` (S6 fallback) and `[data-xploder-column-layer]` (column rows). "Visible" means `visibility` not hidden, `display` not none, opacity > 0.01 and having client rects.
- **Measurement:**
  - Each element becomes its exact screen polygon. Untransformed elements use their `getBoundingClientRect` corners. Transformed ones apply `DOMMatrix(getComputedStyle(el).transform)` to the element box at its offset origin (plate lettering uses `matrix(…)` with origin 0 0).
  - Intersection uses a separating-axis test on the two convex polygons. **Tolerance: 0 px.** Shared edges count as clear and any positive-area overlap fails. AABBs are not used because a rotated name's AABB covers empty space and would give false failures.
- **Matrix:**
  - zoom 1 / 1.953125 / 3 (the engine's 1×/2×/3× bands; `ZOOM_BOUNDS` step 1.25, so 2× is the 1.953 step);
  - light and dark;
  - 390×844 (mobile) and 1440×900;
  - both project routes, and `/` at its own zoom states (1× and 1.953×, since the hero never reaches 3×).
- **Output:** a table of the note polygon and every layer-name polygon, with the verdict per cell. A missing note counts as clear and is reported as "hidden".
- **Unit test first:** `test/overlay-note-clear.test.ts` (new) builds the overlay model at 2× and 3× for fixtures and both real projects, then asserts the note rectangle does not intersect any `layerLetteringModel` quad, using the same SAT. Red today. A second test asserts that every non-dimension placement is byte-identical before and after the change (the S11.8 E1a equivalence approach).

**Re-seal:** S6: `src/overlay/model.ts`; add `test/overlay-note-clear.test.ts` to `frozen-surface.s6.paths`.

---

## 7. I-04 — `THREE.Clock` deprecation

**Repro:** load `/`, `/projects/websocket-inspector` or `/projects/jev-toolkit` and start the viewer. There is exactly one `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` per canvas (`evidence/RFC-log-i04-console.txt`).

**What the `Clock` currently feeds:**
- R3F's render loop calls `state.clock.getDelta()` each frame and passes `state` and `delta` to `useFrame` subscribers. In `frameloop="never"` it writes `clock.elapsedTime` and `clock.oldTime` itself, and on `setFrameloop` it does `clock.stop()` / `clock.start()` and `elapsedTime = 0`.
- **No xploder code consumes any of it** (C1): every xploder `useFrame` ignores `state.clock` and `delta`, and the tour, explode, emphasis and camera tweens run on `performance.now()`. So the clock affects nothing visible. It only emits the warning.

**Migration plan (default, Q4): replace the store clock with a `THREE.Timer`-backed adapter, through a pnpm patch of `@react-three/fiber@9.8.2`.**
- **Files:**
  - `patches/@react-three__fiber@9.8.2.patch`;
  - `patchedDependencies` in `pnpm-workspace.yaml`;
  - `pnpm-lock.yaml` (patch hash).
- **Patch content:** the three `dist/events-*.js` builds construct `clock: createTimerClock()` instead of `new THREE.Clock()`. `createTimerClock` returns an object with the `Clock` surface R3F uses (`autoStart`, `startTime`, `oldTime`, `elapsedTime`, `running`, `start()`, `stop()`, `getDelta()`, `getElapsedTime()`). Internally `getDelta()` calls `timer.update()` and returns `timer.getDelta()`, keeps `elapsedTime` in step, and the class honours direct writes to `elapsedTime`/`oldTime` as `Clock` does. The `Timer` is never `connect()`ed to the document, so it does not use the Page Visibility API, which matches `Clock`.
- **Constraints met:** no new dependency (`Timer` is in `three`), no xploder file touched, no re-seal.
- **Limit:** consumers of xploder outside this repo still see R3F's warning until upstream R3F moves to `Timer` (optional upstream issue, Murphy's call; outward-facing, so the agent does not file it).
- **Failing test first:** `packages/xploder/test/no-clock-warning.test.tsx` (new, not in any manifest) mounts the smallest R3F root (`@react-three/test-renderer`, which uses fiber's store) with a `console.warn` spy, and expects zero messages containing `THREE.Clock`. Red today.

**Parity check (AC5):**
- **Before the patch, on `a9edbfc`:** record five tour runs on `/projects/websocket-inspector` (`capture-path`) and the fixture tour (`pnpm fps:engine --scenario tour` export). Each run logs the `performance.now()` of every `data-xploder-tour-step` change, from Play to `ended`. Take `pnpm perf:parity` screenshots.
- **After the patch:** the same five runs. Every step boundary and the total duration must stay within ±1 frame (16.7 ms at 60 Hz) of the baseline median, parity screenshots must differ by 0 px, and the three routes must show 0 `THREE.Clock` warnings (the same console capture).
- Because nothing reads the clock, exact parity is expected and the tolerance only absorbs scheduling noise.

**Re-seal:** none (Q4).

---

## 8. I-08 — stale measurement workflows

**State:**
- `eager-3d.yml` runs a measurement job on every PR, and is not required.
- `eager-load.yml` and `hero-eager.yml` run only on `task/s11.7-eager-load` / `task/s11.8-hero-eager`, so they show as "skipped".
- The `main` ruleset (`26115910`) requires seven contexts:
  1. `build (typecheck, lint, test, build)`
  2. `secrets (gitleaks)`
  3. `seo: meta + og`
  4. `perf-gate: lighthouse (mobile)`
  5. `perf-gate: weight (< 3 MB)`
  6. `a11y: axe (production routes)`
  7. `perf: fixture exclusion`
- None of the three files defines a required context. `tools/perf` commands used only by these workflows (e.g. `eager-verdict.ts`) stay; deleting them is out of scope.

**Procedure:**
1. One commit, `S14/I-08: remove stale measurement workflows`, deletes exactly the three files. `git show --stat` lists only those three paths.
2. **Push:** the remote is SSH, and SSH pushes are not limited by the OAuth `workflow` scope (the agent's `gh` token lacks that scope). The orchestrator pushes it as part of the slice branch. If GitHub rejects the push, STOP and hand it to Murphy (Hard Rule 5) with the exact command.
3. **Seven-context proof** on the slice PR:
   - `gh pr checks <n> --json name,state,bucket` and `gh api …/commits/<head>/check-runs`;
   - each of the seven names must be present with a completed run (`success`), and none `expected`/`pending` without a run;
   - the three removed workflow names must not appear.
   - The JSON goes to `evidence/T0xx-ci-required-contexts.json`.
4. After merge: `git ls-tree origin/main .github/workflows` shows only `ci.yml` and `perf.yml` (AC6 "gone from main").

---

## 9. Re-seal plan (for Murphy's approval at G1)

### 9.1 Files per item, with reasons

| Item | Surface | File | Reason (goes into the manifest note) |
|---|---|---|---|
| I-09 | S5 | `src/interaction/emphasis.ts` | optional `selected` emphasis input, lit alongside `highlight` |
| I-09 | S5 | `src/react/scene/Emphasis.tsx` | forwards `selected` to `emphasisTargets` (**not named in the brief, Q1**) |
| I-09 | S5 | `test/emphasis-selected.test.ts` (new) | added to `frozen-surface.s5.paths` |
| I-09 | S8 | `src/react/TeardownViewer.tsx` | passes the open detail panel as `selected`; open/close highlight sync keeps hover and focus |
| I-09 | S8 | `test/viewer-selected.test.tsx` (new) | added to `frozen-surface.s8.paths` |
| I-05 | S6 | `src/overlay/model.ts` | dimension notes avoid the plate layer-name quads; other placements output-identical |
| I-05 | S6 | `test/overlay-note-clear.test.ts` (new) | added to `frozen-surface.s6.paths` |
| I-10, I-03, I-04, I-08 | none | — | app code, `tools/perf` (S10 file), dependency patch, CI files |

### 9.2 Procedure (the S11.9 `3aee8fc` / S13 `51d3fa7` way)

Per item:
1. Commit the red test.
2. Commit the fix (green).
3. Re-seal commit:
   - the generator `base=` moves to the fix commit;
   - the note gains `Re-sealed in S14 at <sha>: <file> — <reason>; see .specify/features/engine-polish/evidence/<T-file>`;
   - new test paths are added to `.paths`;
   - the manifest is regenerated with `frozen-surface.generate-sN.sh`;
   - `frozen-surface.test.ts` expectations (`base` and `note`) are updated in the same diff.

The frozen-surface test is red only between steps 2 and 3, locally. S5 is re-sealed once, after I-09. S6 once, after I-05. S8 once, after I-09.

**Seal bases must stay reachable (Q9):** after the squash merge, keep `task/s14-engine-polish` on origin, as with `task/s11.9-home-composition` and `task/s13-jev-content`.

### 9.3 Empty-diff proof for S2/S3/S4/S7

- **S2/S4:** `frozen-surface.manifest.json`, unchanged base `3aee8fc`.
- **S7:** `frozen-surface.s7.manifest.json`, base `5b22987`.
- Their frozen-surface tests stay green with manifests byte-identical to `a9edbfc`, and `git diff a9edbfc -- <those paths>` is empty.
- **S3** has no manifest. Its surface is the 21 `tools/perf/src` files added by the S03 merge `fb73bc9`: `args browser budgets evidence exit-codes fps lighthouse log preview reach serve summary-md weight` and `cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}`. `git diff a9edbfc -- <those 21>` must be empty.
- `site-probe.ts` (S10) is not in S3.

---

## 10. Gate matrix and evidence per AC

| AC | Proof | Evidence files (Stage 3) |
|---|---|---|
| **AC1** | `emphasis-selected` + `viewer-selected` red → green (all four clauses, plus the close-while-hovered and Escape-to-proxy rows of §3.1); browser: A open + B hovered, then B left, on `/projects/websocket-inspector`, with the probe reading `data-xploder-highlight` and a pixel check that A's slab tint matches the hover tint | `T0xx-log-i09-red.txt`, `T0xx-log-i09-green.txt`, `T0xx-screenshot-i09-{desktop,mobile}-{light,dark}-{hover-b,left-b}.png`, `T0xx-log-i09-engine-probe.txt` (s7/s8 groups unchanged) |
| **AC2** | `hero-marks-stable-*` red → green; drill + `cls`: 5 consecutive CI attempts on the final head (all recorded, Q8) and 5 local runs; corner-mark coordinate table at 390×844 and 390×740, first paint vs after reveal; a diff showing no timeout/sleep constant raised in `site-probe.ts` | `T0xx-log-i10-red.txt`, `T0xx-log-i10-cls-5runs.md` (16 cells × 5), `T0xx-log-i10-drill-5runs.md`, `T0xx-log-i10-corner-marks.md`, `T0xx-ci-site-probe-runs.txt`, `T0xx-screenshot-i10-hero-pixel-diff.txt` (0 px, DOM-order move) |
| **AC3** | `home-hero-loop` resume test red → green; settle counter = 1 per cell (16 cells, the `pause-sweep` matrix); frames at +0.5 / +1.5 / +3.5 s after Pause; progress monotonic across pause and resume; `reduced-motion` group green | `T0xx-log-i03-red.txt`, `T0xx-log-i03-events.md`, `T0xx-screenshot-i03-pause-{a,b,c}.png`, `T0xx-log-i03-reduced-motion.txt` |
| **AC4** | `overlay-note-clear` red → green; equivalence test for the other labels; browser SAT matrix (§6) with every polygon listed | `T0xx-log-i05-red.txt`, `T0xx-log-i05-rects.md`, `T0xx-screenshot-i05-{1440,390}-{light,dark}-{1x,2x,3x}.png` |
| **AC5** | `no-clock-warning` red → green; console capture on 3 routes = 0; tour step-boundary table, baseline vs after (5 runs each); `perf:parity` 0 px | `T0xx-log-i04-red.txt`, `T0xx-log-i04-console.txt`, `T0xx-log-i04-tour-parity.md`, `T0xx-log-i04-parity.json` |
| **AC6** | the deletion commit stat; required-context JSON on the PR; `ls-tree origin/main` after merge | `T0xx-ci-required-contexts.json`, `T0xx-log-i08-tree.txt` |
| **AC7** | PR CI run URL with every required check green; `site:probe` `draws` (2 draw calls) and `hero` (eager reveal, zero interaction) groups; `eager:probe --expect live-loop`; Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; weight < 3 MB; axe 0/0; frozen-surface tests green with the S14 notes; §9.3 empty diffs | `T0xx-ci.txt`, `T0xx-log-gates.md`, `T0xx-log-surfaces.txt`, `AC-selfcheck.md` |

---

## 11. Stage 3 task outline (Stage 2 formalises)

| # | Item | Steps | Tier |
|---|---|---|---|
| 1 | I-09 | red unit + integration → fix (3 files) → green → S5/S8 re-seal → browser evidence | Flash executes; orchestrator reviews and runs the browser checks |
| 2 | I-10 | red `hero-marks-stable` → DOM-order fix → settled-wait helper (drill + `/` CLS) → green → 5 local runs; the 5 CI runs come at the end (they need the PR) | Flash; orchestrator runs CI |
| 3 | I-03 | red resume test → fix → settle-counter and position tests → sweep evidence | Flash |
| 4 | I-05 | red unit test → fix → equivalence test → S6 re-seal → browser SAT matrix | Flash; orchestrator re-runs the matrix |
| 5 | I-04 | baseline parity on `a9edbfc` **first** → red warn-spy test → pnpm patch → parity + console | Flash; orchestrator checks the patch content |
| 6 | I-08 | delete → push → seven-context proof | orchestrator (Hard Rule 5) |
| 7 | gates | full CI, AC1–AC7 self-check | orchestrator |

Escalation: Flash stuck ×2 → pause and report to Murphy with usage (standing policy). Tier 1.5 is dormant (skip-with-record). Each task report names the tier that finished it.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| I-10's shift is CI-only (Linux fonts make the hero content-bound) | the stall repro makes it deterministic on any host; the five CI attempts confirm it on Linux |
| Moving `BlueprintSheet` changes paint order | stacking analysis (content is `z-10`) plus a 0 px pixel diff at 390/1440, light/dark, poster and live |
| I-09 changes S7's "highlight sync" | `data-xploder-highlight` on open is unchanged except when the same id was already hovered; the `engine:probe` s7/s8 groups re-run |
| I-05 hides the note at more zooms | measured per cell and reported as "hidden" (Q5) |
| The pnpm patch drifts on an R3F bump | `patchedDependencies` is keyed to the exact version `9.8.2`, so a bump fails `pnpm install` loudly instead of silently dropping the patch |
| I-03's ">1" exists only on slow devices | the settle counter runs at CPU ×4 too; a red result there triggers a STOP (outside the re-seal list) |
| Seal-base commits lost after a squash merge | keep the slice branch (Q9) |

---

## 13. Open questions (each with a default)

1. **Q1 — I-09 needs `src/react/scene/Emphasis.tsx` (S5), which the brief does not name.** It is the only path from `EmphasisState` to `emphasisTargets` (C3); the change is one destructured field plus a dep. **Default: approve it in I-09's re-seal list.** `pointer.ts` is not touched.
2. **Q2 — what "emphasised" covers in AC1.** **Default:** the engine emphasis (`emphasisTargets`: slab tint + lift), which both A and B get. The lettering and overlay name highlight stay single-slot and show `highlight ?? openPanelId`: hover wins while hovering, and A's name comes back when B is left. Alternative: two-slot name emphasis, which needs `PartLettering` (S8) and the overlay model/`BlueprintOverlay` (S6) to change, i.e. more files outside the brief.
3. **Q3 — I-03 reading.** The count is already 1 locally (C2). **Default:** (a) lock AC3 with tests (settle count = 1, no jump, reduced motion); (b) fix "resume continues from the same position" as "resume runs the remainder of the interrupted step" in `hero-loop.ts`. This shared helper applies to every non-tour phase, with no explode special case: it removes the 1.43 s dead wait. A ">1" found later on CI or under throttling leads to a STOP and asking you, because the likely fix is in S6 `OverlayProjector`, outside the re-seal list. Alternative: lock-only, with no code change for I-03.
4. **Q4 — I-04 fix route** (C1: the Clock lives in R3F, not xploder). **Default:** a pnpm patch of `@react-three/fiber@9.8.2` that swaps the store's `new THREE.Clock()` for a `THREE.Timer`-backed adapter. No new dependency, no xploder change, no re-seal. Rejected: an R3F 10 pre-release (major, unstable); filtering the warning with `THREE.setConsoleFunction` (hides it, does not remove it). Alternative: declare AC5 blocked and wait for upstream.
5. **Q5 — I-05 when no clear spot exists.** **Default:** the note is hidden (the existing S6 `placeLabels` rule, which already applies at 390 px 2×/3× today). AC4 is met because there is no box to intersect.
6. **Q6 — I-05 import direction.** **Default:** S6 `overlay/model.ts` imports S7's pure `layerLetteringModel` (read-only; no cycle, S7 bytes unchanged). Alternative: thread the plate quads from `PartLettering`, which touches S8 `PartLettering.tsx` and S6 `BlueprintOverlay.tsx`.
7. **Q7 — I-10 fix shape.** **Default:** move `BlueprintSheet` after the hero content (DOM order only, 0 px visual change). Alternatives: `<link rel="expect" blocking="render">` (Chromium-only, does not help iOS); a larger fixed mobile `min-h` (a layout change, i.e. redesign).
8. **Q8 — where the "five consecutive probe runs" come from.** **Default:** five attempts of the required `a11y: axe (production routes)` job (it runs `site:probe --ci`) on the final PR head, triggered as an AC2 measurement. All five are reported whatever they show, so this is not "rerun until green" (EVIDENCE §6). Five local runs with the stall proxy are added on top.
9. **Q9 — keep the slice branch after merge.** **Default: yes.** The S5, S6 and S8 seal bases will live only on `task/s14-engine-polish`.
10. **Q10 — the CI shift had `hadRecentInput: true`.** Web-vitals CLS would ignore it; our probe counts every entry. **Default:** keep counting (no relaxation); the fix makes the entry disappear.
11. **Q11 — I-08 push.** **Default:** the orchestrator pushes the deletion over SSH. If it is rejected, hand it to you with the exact command.
12. **Q12 — AC4 routes.** **Default:** both project routes at 1×/2×/3×, plus `/` at its own zoom states (1× and 1.953×; the hero never reaches 3×).

---

## 14. Gate 1 record

*(empty until Murphy answers)*

---

### WHAT MURPHY SHOULD TEST/VALIDATE

1. Read §2: does the baseline match what you saw? I-09 and I-05 are reproduced exactly as reported. I-10 is reproduced by stalling the page load. I-03 shows **one** settle, not more.
2. Optional, 30 s: on `/projects/websocket-inspector` (desktop), click a tile, hover another, move off. The first tile goes dark: that is I-09.
3. Optional: zoom in twice on the same page. "5 layers" sits on top of "3 CAPTURE": that is I-05 (`evidence/RFC-screenshot-i05-websocket-inspector-1440-light-2x.png`).

### WHAT THE AGENT NEEDS FROM MURPHY

1. **Approve the re-seal list (§9.1).** Default: approve, including `Emphasis.tsx` (Q1).
2. **I-04 route (Q4).** Default: pnpm patch of R3F with a `Timer`-backed clock.
3. **I-03 reading (Q3).** Default: lock the count at 1 and fix resume-from-remaining-time.
4. **The other questions, Q2 and Q5–Q12.** Default: accept as written.
