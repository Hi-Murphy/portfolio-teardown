# RFC — S04 Engine Core A: Layout · Explode · Camera

**slice:** S04-engine-core-a · **status:** REVIEWED round 2 (AC4 revised) (2026-10-29): decisions in §9; **AC4 revised — dropped-frame gate replaces the literal ≥60.00 reading (change-log line under the AC table)** · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-04-engine-core-a.md` (frozen brief v1) · **branch:** `task/s04-engine-core-a` · **date:** 2026-10-29

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins and the conflict should be raised as an open question.

---

## 1. Context (from the brief)

- **Mission:** build the spatial foundation of the teardown engine. Given a validated `Project`, **auto-layout slabs in 3D, animate explode ⇄ implode, and rig the camera.** This is the first Three.js/R3F code in the repo. Controls are limited to toggle, rotate and zoom. Visual theming is limited to base materials fed by tokens.
- **The engine belongs in `packages/xploder`** (the future OSS lib). `apps/web` is a thin consumer.
- **Live from S2:** zod schema + `parseProject`, tech registry, **motion tokens (the only source of easings, durations and staggers)**, blueprint palette tokens (light default + dark), fixtures **A** (UI-app shape) and **B** (pipeline shape). Both must render.
- **Live from S3:** CI perf gates (Lighthouse mobile ≥ 95 / LCP < 2.5 s / CLS = 0 on previews; < 3 MB weight), the FPS harness and calibration-fixture pattern, `pnpm evidence`, and the `.specify/EVIDENCE.md` contract.
- **Locked design decisions:** auto-layout only, with zero coordinates in data (layers stack vertically in data order, components grid within their layer, deterministic). Explode ⇄ implode runs on motion tokens with a mechanical ease-out-expo signature, and `prefers-reduced-motion` gets an instant static separated state. Camera is orthographic, locked to a 45° default azimuth, rotates only in 90° snaps (button + keyboard), has bounded zoom, and **never** has free orbit. Instanced meshes, minimal draw calls, 60 fps floor on a mid-range Android over 4G. Every color comes from S2 theme tokens, with zero hardcoded hex (grep-enforced). Development happens on a dev-only route that is excluded from the production build.
- **Non-goals (hard):** hover/focus/tour (S5) · blueprint materials, edge lines, dimension lines, annotations (S6) · panels/chips/case-study UI (S7) · keyboard a11y beyond the rotate control (S8) · site shell/landing (S10) · real content (S9) · pixel shader (v1.5) · schema changes (S2 contract frozen: new modules only, no breaking changes to the schema/parse/tokens public API).

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | `/dev/engine` renders fixture A as stacked layer slabs with component slabs gridded inside; fixture B renders via the switch; layout determinism unit test green; route 404s on the production URL (CI-checked like the S3 fixture). |
| AC2 | explode ⇄ implode works both directions from the toggle; every duration/easing traces to the S2 motion module (exclusivity grep green over engine + playground); with `prefers-reduced-motion`, the exploded state appears instantly with no animation. |
| AC3 | camera defaults to locked 45° azimuth; rotate happens only in 90° snaps via button AND keyboard; zoom stays within documented bounds; a code-level test asserts no free-orbit control exists. |
| AC4 | FPS harness on `/dev/engine` with fixture A runs headless for a window of at least 5s and reports **0 dropped frames** over that window, with trace fps inside the 60 ±10% band as a liveness check. fps, rafFps and p50/p95/max frame interval are reported in the artifact as information, not gated. Evidence artifact attached per EVIDENCE.md. |
| AC5 | layout + renderer live in `packages/xploder`; `apps/web` imports them as a package consumer (no engine logic in the app); schema geometry-free test still green. |
| AC6 | full CI green on the PR — build/typecheck/lint/test, gitleaks, lighthouse gate, weight gate, fps calibration, fixture exclusion — plus screenshots (light + dark, imploded + exploded) attached as evidence. |

AC4 revised 2026-10-29 (round 2): dropped-frame gate replaces the literal ≥60.00 reading; see agent-queue issue comment.

### Starting point (S01–S03, checked on this branch)

| Item | State |
|---|---|
| `packages/xploder` | Source-only TS, `exports` = `.`, `./motion`, `./theme`. Only runtime dep: `zod`. No React, no JSX in `tsconfig`, ESLint = `@eslint/js` + `typescript-eslint` (no React rules). |
| Fixtures | `packages/xploder/test/fixtures/` (JSON, re-exported as `unknown`). **A** `ui:3 · state:1 · data:3 · platform:1` (8 components, 2 flows). **B** `ingest:1 · normalize:1 · validate:1 · report:2` (5 components, 1 flow). Not reachable from `apps/web` today: there is no package export. |
| Motion tokens | `durations.explode 0.9` / `implode 0.6` (seconds), `easings.explode = expo.out / cubic-bezier(0.16, 1, 0.3, 1)`, `easings.implode = power3.inOut / cubic-bezier(0.76, 0, 0.24, 1)`, `staggers.explodeLayer 0.06`, `explodeComponent 0.02`, `implodeLayer 0.04`. `resolveMotion(true)` = static twin (all durations/staggers 0). **There is no camera/rotate/zoom token.** |
| Theme tokens | `blueprint.light` / `blueprint.dark` (JS objects) + `paletteCss()` (`:root` light, `.dark` dark, `@media (prefers-color-scheme: dark){html:not(.light){…}}`). S1 theme mechanism toggles `.dark`/`.light` on `<html>`. |
| Dev-only route pattern | `next.config.ts` adds the `fixture.tsx` page extension only in `next dev` or `PERF_FIXTURES=1` (separate `out-fixtures/`). `PERF_FIXTURES` + `VERCEL` throws. Marker attribute `data-perf-fixture`. |
| Exclusion checks | `apps/web/test/fixture-exclusion.test.ts` (scans `out/` for marker + route name, positive control on `out-fixtures/`); CI job `perf: fixture exclusion` runs `assert-absent.ts` on the PR preview and, on push to `main`, on the production URL. Both are hardwired to `fixtures/fps-calibration`. |
| Motion-literal scanner | `apps/web/test/no-motion-literals.test.ts` scans all of `apps/web` and `packages/xploder/src` except `motion/`. New engine code under `xploder/src` is covered automatically. |
| Hex-literal scan | **Does not exist yet.** The only hex values in source are in `packages/xploder/src/theme/blueprint.ts` (checked: `grep` over `apps/web/app` + `xploder/src` excluding `theme/` finds none). |

### Environment facts checked 2026-10-29

| Item | Fact | Source |
|---|---|---|
| React / Next | `react` 19.3.1, `next` 16.4.3 installed. | `node_modules` |
| three | 0.186.1 (`@types/three` 0.186.0). | npm |
| @react-three/fiber | 9.8.2. Peer: `react >=19 <19.4`, `three >=0.156`. React 19.3.1 is in range. | npm |
| @react-three/test-renderer | 9.1.1 (peer `@react-three/fiber >=9`). Renders a scene graph in Node without WebGL. | npm |
| @react-three/drei | 10.7.9. **Not proposed** (D6): it ships `OrbitControls` and friends. | npm |
| gsap | 3.15.0. **Not proposed** (D4). | npm |
| Headless WebGL (Mac) | Harness Chromium 156.0.8078.4 headless: **WebGL2 available**, renderer `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`, so it runs on the real GPU. On ubuntu CI it would be software GL (SwiftShader). | local probe (`/tmp/s04-checks/webgl-probe.mjs`) |
| Harness readings at nominal 60 Hz | S3 calibration fixture: **59.63 fps** local (`T010-fps.json`, 301 DrawFrame / 5048 ms, 0 dropped) and **59.98 fps** CI (`T011-fps-ci.json`, 301 / 5018 ms, 0 dropped). Both < 60.00. Re-run today 10× locally: **59.32–59.82, 10/10 with 0 dropped frames, rAF 60.00**. One trace: 301 DrawFrame over **5001.2 ms → display cadence 59.986 Hz**. See **E1** and `evidence/E1-fps-literal-probe.txt`. | S3 evidence + local probe |
| Tier-2 executor | `OPENROUTER_API_KEY` unset (checked today) → tier 2 skipped, as in S02/S03. | local env |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Module tree and package surface (AC5)

- **R:** three new subpath exports, all additive. `.`, `./motion` and `./theme` stay byte-identical in behaviour and API.

  | Export | Path | Contents | Imports three/React? |
  |---|---|---|---|
  | `xploder/layout` | `src/layout/` | `layoutProject()`, `LAYOUT_DEFAULTS`, layout types, `fitZoom()` (pure math) | no |
  | `xploder/react` | `src/react/` | `<TeardownViewer>`, `useTeardownViewer()`, `useBlueprintPalette()`, `usePrefersReducedMotion()` | yes |
  | `xploder/fixtures` | `test/fixtures/index.ts` (existing file) | `projectAJson`, `projectBJson`, `techRegistryJson` (`unknown`, as today) | no |

  Internal (not exported, imported relatively inside the lib): `src/engine/` (explode timeline, camera rig reducer, keymap) and **`src/motion/ease.ts`** (cubic-bezier evaluator, see D4). The `motion/index.ts` file and its exports are not touched.
- **Peer deps** on `xploder`: `react ^19`, `three >=0.186`, `@react-three/fiber ^9.8`, all `peerDependenciesMeta.optional: true`, so a consumer that only uses `xploder/layout` needs none of them. `apps/web` adds `three` and `@react-three/fiber` as **dependencies only to satisfy the peers**. App source never imports them (D9 enforces this). Dev deps on `xploder`: the same three packages + `@types/three`, `@types/react`, `@react-three/test-renderer`, `eslint-plugin-react-hooks` (no `jsdom`: see D9, revised in round 1). The `xploder` tsconfig gains `"jsx": "react-jsx"`.
- **Why separate subpaths:** the landing page and later SSR consumers can import the pure layout without pulling three (~170 KB gz) into their graph. `sideEffects: false` is already set.
- **Why export fixtures from `test/fixtures`:** the playground needs A and B through the package (AC5), and pointing the export at the existing file means no file moves and no S2 test churn. For the OSS lib these are documented "example projects". Only the dev-only route imports them, so they never reach the production bundle. **Open question 3.**
- **Rejected:** putting the renderer in `.` (pulls three into every consumer) · copying the fixture JSON into `apps/web` (two sources of truth) · a relative import from `apps/web` into `packages/xploder/test` (violates AC5) · a separate `xploder-react` package (premature for M1).

### D2 — Layout algorithm and determinism (AC1)

- **R:** `layoutProject(project, options?) → ProjectLayout`, a pure function. The input type is structural, `{ layers: readonly { id; components: readonly { id }[] }[] }`, so a parsed `Project` satisfies it and the layout reads **only** layer order, component order and ids. World units: **1 unit = one component cell pitch**. Axes: `y` up, `x` = grid column, `z` = grid row.
  1. **Shared footprint.** `n_max = max(1, max components in any layer)`. `cols = ceil(sqrt(n_max))`, `rows = ceil(n_max / cols)`. Every layer slab has the same footprint: `cols × rows` cells plus `margin` on each side. The stack reads as one assembled object, and camera framing is simpler.
  2. **Per-layer grid.** Layer with `n` components: `c = ceil(sqrt(n))`, `r = ceil(n / c)`, filled row-major in data order. The grid is centered on the footprint, and a partial last row is centered too. Axis signs are chosen so that at the default 45° azimuth, data order reads left → right, back → front (component 0 is the top-left cell on screen). `n = 0` is valid (`components` defaults to `[]`) and gives an empty slab.
  3. **Vertical stack.** Layer 0 (first in data) is at the **top**. Imploded: slabs are stacked with a gap of exactly `componentThickness`, so the components are sandwiched and the stack looks assembled. Exploded: gap = `explodedGap`, and components additionally lift `componentLift` off their slab. In both states the stack is centered on `y = 0`, so the camera target never moves while animating.
  4. **Output:** `{ version: 1, footprint: {cols, rows, width, depth}, layers: LayerSlab[], components: ComponentSlab[], bounds: {imploded, exploded} }`. Each slab has `id`, `size: Vec3`, `imploded: Vec3` and `exploded: Vec3` (box centers). Components also carry `layerId`, `layerIndex`, `slot` (index in layer) and `cell: [col, row]`. Array order **is** instance order: layers in data order, components layer-major. S5 picking maps instance index → id with no lookup table.
  5. **Defaults** (`LAYOUT_DEFAULTS`, overridable, tuned once with screenshot evidence in T2/T7): `componentSize 0.8` (0.2 gutter), `componentThickness 0.12`, `slabThickness 0.08`, `margin 0.3`, `explodedGap 1.1`, `componentLift 0.12`. These are geometry, not motion: they describe the two end states. Timing lives only in tokens (D4).
- **Determinism strategy:** no randomness, no clock, no `Map`/`Set` iteration over unordered input, and no dependence on any field except ids and order. Every coordinate is `integer × constant`, and `-0` is normalized to `0` so snapshots are stable. Output is deep-frozen.
- **Determinism tests (AC1):** (a) the same input laid out twice is `toStrictEqual`, including across `structuredClone`; (b) **golden snapshots** for fixtures A and B; (c) changing non-structural fields (names, descriptions, techs, flows, story) leaves the output unchanged; (d) the input is not mutated (deep-frozen input, no throw); (e) a sweep over 1–12 layers × 0–16 components per layer: no two component slabs overlap within a layer, every component is inside its slab's footprint, layers never overlap in either state, `exploded gap > imploded gap`, and `ceil(sqrt)` gives `12 → 4×3` and `13 → 4×4`.
- **Rejected:** per-layer footprints (a ragged stack, and rotation reframes per layer) · flow-aware placement (that's S5/S6 territory and would make layout depend on flows) · force/graph layout (non-deterministic or expensive, and it breaks the "data order" rule).

### D3 — Instancing and draw-call budget (AC1, AC4)

- **R:** **two `InstancedMesh`es** sharing one unit `BoxGeometry` (scaled per instance through the matrix): `layers` (count = layer count) and `components` (count = component count). Two materials, one per mesh. No shadows, no post-processing, transparent canvas (the page background is the paper token).
- **Per-frame work while animating:** for each instance, `lerp(imploded, exploded, progress_i)` → `setMatrixAt` with a preallocated `Object3D`/`Matrix4` (no allocation per frame) → `instanceMatrix.needsUpdate = true`. When switching project A ↔ B the meshes are keyed by `meta.slug`, so they remount with the right count (instance counts are fixed at construction).
- **Draw-call budget (documented here, measured in evidence):**

  | Scope | Draw calls | Triangles (fixture A) | Notes |
  |---|---|---|---|
  | S4 scene | **2** | (4 + 8) × 12 = 144 | measured via `renderer.info.render.calls` |
  | S4 ceiling (assertion) | **≤ 2** | — | scene-graph test counts meshes; probe reports `calls` |
  | Engine ceiling through S6 | **≤ 8** | ≤ 20k | room for instanced edges/annotation lines in S6; recorded for later slices, not an S4 gate |
  | Worst case "12 layers × 16 comps" | 2 | 2,448 | 204 instances |

- **Renderer settings:** `frameloop="demand"` (zero GPU work at rest, important for mobile battery; tweens call `invalidate()` every frame while running), `dpr={[1, 2]}`, `antialias: true`, `alpha: true`.
- **Rejected:** one mesh per slab (draw calls scale with data) · merged static geometry (it can't animate per slab without a custom shader) · a custom vertex shader for the explode lerp (fastest, but it's S6/v1.5 material territory and harder to test).

### D4 — Explode ⇄ implode mechanics (AC2)

- **R: a small custom tween driven by R3F's frame loop. No GSAP.**
  - **Timeline model (pure, `src/engine/explode.ts`):** each instance `i` has a progress `p_i ∈ [0, 1]` (0 = imploded, 1 = exploded). `setTarget(target, now, tokens)` captures each instance's **current** `p_i` as its `from` and assigns:
    - explode: `delay_i = layerIndex × staggers.explodeLayer + slot × staggers.explodeComponent`, `duration_i = durations.explode × |target − from_i|`, ease `easings.explode`;
    - implode: `delay_i = (L − 1 − layerIndex) × staggers.implodeLayer` (last out, first in), `duration_i = durations.implode × |target − from_i|`, ease `easings.implode`.
  - `sample(now)` returns the progress array. `settled(now)` is true once every instance has reached the target. The R3F hook calls `sample(clock.elapsedTime)` in `useFrame`, writes matrices, and calls `invalidate()` until settled.
  - **Interruptible-safe:** a toggle mid-flight restarts from the current `p_i`, so there is never a positional jump (C0-continuous). A half-finished explode reverses in half the implode duration. Spam-toggling always ends exactly on the last target. **Round 1 refinement:** on an interruption, each instance's stagger delay is also scaled by `|target − from_i|`. With full delays, slabs that were mid-flight would visibly freeze for up to `(L − 1) × stagger` before reversing; scaled delays keep the cascade but make the reversal feel immediate. On a full-travel toggle the scale is 1, so the token values apply unchanged.
  - **Easing:** evaluate the token's **CSS cubic-bezier** (`easings.*.css`, parsed at runtime) with a ~30-line solver in **`src/motion/ease.ts`**. It is a new file inside `motion/`, so its numeric solver constants sit where AGENTS.md §5 allows animation numbers. It isn't exported from `motion/index.ts`, so the S2 tokens API doesn't change. `cubic-bezier(0.16, 1, 0.3, 1)` is the standard ease-out-expo curve, which is the brief's "mechanical ease-out-expo signature".
- **Why not GSAP:** (1) **one loop.** R3F already owns the rAF and runs in `demand` mode, and a second animation loop would fight it. (2) The lib is meant for OSS release, and GSAP's no-charge "standard" license isn't an OSI license, so it would be a dependency the OSS lib would have to carry and explain. (3) ~27 KB gz saved. (4) The pure timeline is unit-testable with an injected clock, and GSAP timelines aren't without fake timers. The cost: the tokens' `gsap` easing strings go unused by the engine (still valid tokens; nothing is removed).
- **Traceability proof (AC2 "every duration/easing traces to the S2 motion module"):**
  1. the existing motion-literal scanner already covers `xploder/src` (except `motion/`) and all of `apps/web`, including the new route. A non-vacuity assertion is added: the scanned file list must include `src/engine/explode.ts` and `apps/web/app/dev/engine/page.fixture.tsx`;
  2. the timeline takes a `MotionTokens` argument and has **no other timing input**. A test runs it with synthetic tokens (durations × 2, staggers × 3, a linear `cubic-bezier(0, 0, 1, 1)`) and asserts that total length and the per-instance curve change exactly as computed. A hidden constant would break that proportionality.
- **Rejected:** GSAP (above) · `@react-spring/three` (spring physics: tokens are duration/easing, not mass/tension) · CSS transitions (not applicable to WebGL instances) · animating in a vertex shader (D3).

### D5 — Reduced-motion path (AC2)

- **R:** `usePrefersReducedMotion()` subscribes to `matchMedia(reducedMotion.query)` (the token, not a literal) and its `change` event. The viewer passes `resolveMotion(prefersReduced)` into the timeline. With the static twin every duration and stagger is 0, so `setTarget` makes `settled(now)` true immediately. The hook writes the final matrices once and calls `invalidate()` **once**: one frame, no tween frames.
- **Initial state:** normal motion mounts **imploded** (the "assembled" product, which the toggle explodes). Reduced motion mounts **exploded** ("instant static separated state", per the brief's a11y floor), and the toggle still works in both directions, instantly. **Open question 5.**
- **Observable state for tests/evidence:** the viewer wrapper exposes `data-xploder-state="imploded|exploding|exploded|imploding"`. Under reduced motion, a toggle goes straight from `imploded` to `exploded` without an intermediate value in the same task.
- **Tests:** unit (timeline with `resolveMotion(true)` → `sample(now) = target` at `t = now`; `settled` immediately) and E2E evidence (D10: Playwright `reducedMotion: 'reduce'`, click toggle, record the state-attribute timeline and the rendered frame count over 1 s, then screenshot).

### D6 — Camera rig (AC3)

- **R:** R3F `<Canvas orthographic>` with a rig driven by a **pure reducer** (`src/engine/camera.ts`):
  - **State:** `{ step: 0 | 1 | 2 | 3, zoom: number }`. Azimuth = `45° + 90° × step`, so **the default is 45°** (`step 0`). Elevation is fixed at **true isometric** `atan(1/√2) ≈ 35.26°` (computed, no literal). The camera looks at the origin, which is the stack center (D2). There are no free angles in state.
  - **Actions (exhaustive union):** `rotateLeft` · `rotateRight` · `zoomIn` · `zoomOut` · `zoomReset`. There is no action that accepts an angle or a delta.
  - **Snap transition (revised in round 1): an animated 90° turn** on the `implode` tokens (`durations.implode`, `easings.implode` = `power3.inOut` / `cubic-bezier(0.76, 0, 0.24, 1)`), driven by the same frame loop as D4. The reducer's `step` changes immediately (state is always on a snap); only the *displayed* azimuth tweens from its current value to `45° + 90° × step` along the shorter arc. A second press mid-turn retargets from the current displayed angle. Under reduced motion the static twin makes the turn a cut. **Why this replaces the instant cut:** the shared square footprint (D2) means the stack's silhouette is identical at all four azimuths, so a cut reads as "the components teleported", not "the model turned". The animation is what makes a rotation legible. `implode`'s symmetric in-out curve is the token whose character matches a camera turn, and reusing it keeps AC2's "every duration/easing traces to the S2 motion module" intact without touching the frozen tokens. **Open question 6.**
  - **Zoom bounds (revised in round 1):** zoom is relative to **fit**. `fit = fitZoom(bounds.exploded, viewport)` is the largest zoom at which the *exploded* bounds fit the viewport with an 8% margin **at every one of the 4 azimuths**, so neither rotation nor exploding can clip at the default. Bounds: **`zoom ∈ [1 × fit, 3 × fit]`**, step **× 1.25**, `zoomReset` → `1 × fit`. Zooming out past fit only adds empty paper, so the lower bound is fit itself, which means the default view is also the widest. Clamped in the reducer, recomputed on resize. Zoom steps are instant: a 25% scale change is easy to follow without animation, and it keeps a second animated channel out of S4. **Open question 7.**
  - **Inputs:** buttons (the playground renders them and calls `viewer.actions.*`) and **keyboard** on the focusable viewer wrapper (`tabIndex=0`, `role="group"`, `aria-label`, `aria-keyshortcuts`). Keys: `ArrowLeft` / `ArrowRight` → rotate, `+`/`=` and `-` → zoom, `0` → reset. Pure `keyToAction(key)`. The handler is scoped to the wrapper, not `window`, so page keys aren't hijacked. **No wheel, drag or pinch handlers.** The canvas keeps `touch-action: pan-y pinch-zoom` (round 1: `pinch-zoom` added so browser page zoom, an a11y need, still works over the canvas), so mobile page scroll passes through, which is the reason free orbit was cut.
- **"No free-orbit" code-level test (AC3):**
  1. **Static scan** of `packages/xploder/src` and `apps/web` (code + `package.json`s): no import from `@react-three/drei`, `three/examples`, `three/addons`, `three-stdlib` or `camera-controls`, and no identifier from the list `OrbitControls|MapControls|TrackballControls|ArcballControls|FlyControls|FirstPersonControls|PointerLockControls|CameraControls|TransformControls|DragControls`. A negative-control sample proves the scan bites (same pattern as the motion scanner).
  2. **Reducer property test:** 10,000 random action sequences, and after every step `azimuth ∈ {45, 135, 225, 315}` and `zoom ∈ [0.75·fit, 3·fit]`. `RigAction['type']` is asserted to equal exactly the five actions above.
  3. **Scene-graph test** (`@react-three/test-renderer`): the rendered camera `isOrthographicCamera`, its world azimuth equals 45° at mount and 135° after one `rotateRight`, and no scene child or R3F store entry holds a controls object (`store.controls === null`).
- **Rejected:** drei `<OrthographicCamera>` / `<OrbitControls enableRotate={false}>` (orbit code present in the bundle and one prop away from enabled, which the brief explicitly cut) · animated free azimuth with snap-on-release (that's still a free orbit during the drag).

### D7 — Token-fed base materials and hex-literal exclusivity (AC6 visuals, brief Deliverable 5)

- **R:** `MeshLambertMaterial` (cheapest lit material; gives the box sides depth so slabs read as slabs) + one `ambientLight` + one `directionalLight` (default white, intensities only; light color is never set). Color roles (revised in round 1): **layer slab = `lineMuted`**, **component slab = `line`**, background = the page's `paper` (transparent canvas). Measured WCAG contrast (flat colors, before shading):

  | Slab role | slab vs paper (light / dark) | `line` component vs slab (light / dark) |
  |---|---|---|
  | `grid` (round-0 default) | 1.19 / 1.37 | 6.38 / 6.82 |
  | **`lineMuted` (new default)** | **3.23 / 3.78** | **2.35 / 2.48** |
  | `steel` | 5.23 / 6.74 | 1.45 / 1.39 |

  With `grid` the slabs nearly vanish into the paper (≈ 1.2:1). Until S6 adds edge lines that would make AC1's "stacked layer slabs" hard to see in the screenshots. `lineMuted` clears the 3:1 non-text-contrast level against the paper in both themes, and components stay distinct from it, helped by Lambert side shading. **Open question 8.**
- **Theme source:** `useBlueprintPalette()` returns `blueprint.light` or `blueprint.dark` (the JS token objects, not parsed CSS). The choice comes from pure `resolveThemeMode({ hasDarkClass, hasLightClass, prefersDark })`, which mirrors `paletteCss()`'s selector logic exactly: `.dark` → dark; otherwise media dark and not `.light` → dark; otherwise light. A `MutationObserver` on `<html class>` + a `matchMedia('(prefers-color-scheme: dark)')` listener re-resolve it. Materials update with `color.set(...)` + `invalidate()`, with no remount. A `palette` prop overrides it for OSS consumers with their own theme switch. This covers all three S1 paths (stored, OS, toggle) with no app code.
- **Hex grep test (new):** `apps/web/test/no-color-literals.test.ts` scans `apps/web` (code + CSS) and `packages/xploder/src` **excluding `theme/`**. Patterns: `#[0-9a-fA-F]{3,8}\b` in strings/CSS, `0x[0-9a-fA-F]{6}\b`, `rgba?(`, `hsla?(`, and `new Color('<name>')` with a CSS color keyword. Same shape as the motion scanner: a negative control per rule and a non-vacuity check (engine files are in the scanned set).
- **Rejected:** `MeshBasicMaterial` (unlit, so boxes read as flat hexagons in isometric view) · `MeshStandardMaterial` (PBR cost on mobile for no S4 gain) · reading `--bp-*` CSS variables (string parsing, and timing issues before the head style applies).

### D8 — Playground route and production exclusion (AC1, AC6)

- **R: reuse the S3 mechanism unchanged.** File `apps/web/app/dev/engine/page.fixture.tsx` → route **`/dev/engine`**. It only exists in `next dev` and in `PERF_FIXTURES=1` builds (`out-fixtures/`), and it is **not compiled** into the production export. The page is a thin client island (`next/dynamic`, `ssr: false`, around `<TeardownViewer>`) with marker **`data-perf-fixture="engine"`**.
- **Playground controls (all UI, no engine logic):** fixture switch A/B (buttons + `?fixture=a|b`), explode/implode toggle, rotate ⟲ / ⟳, zoom − / reset / +, the existing `ThemeToggle`, and a small readout of state, azimuth, zoom, draw calls and instance counts (from the viewer's `onStats` callback). Query params for evidence runs: `?fixture=a|b`, `?state=exploded` (mount exploded), and `?cycle=1` (re-toggle on every `onSettled`, giving continuous explode ⇄ implode for the FPS window with no timers or literals).
- **Exclusion checks extended (AC1 "CI-checked like the S3 fixture"):**
  1. `fixture-exclusion.test.ts`: the route list becomes `['fixtures/fps-calibration', 'dev/engine']`; `out/dev` must not exist; the marker check already covers `data-perf-fixture`; the positive control requires **both** markers in `out-fixtures/`.
  2. `perf.yml` `fixture-exclusion` job: a second `assert-absent.ts` call for `…/dev/engine` on the PR preview **and** on the production URL (push to `main`). `assert-absent` already checks "404 and no `data-perf-fixture`", so the tooling needs no change.
  3. **Production-URL proof** exists only after merge (as in S3 AC4): the `main`-push run of that job is the AC1 prod evidence. **Open question 9.**
- **Rejected:** a `notFound()` env check (code stays in the prod bundle) · a separate Next app for the playground (duplicates theme/layout wiring) · Vercel env-gated previews (project-config change, out of scope).

### D9 — Test strategy for AC3/AC5 assertions (and the rest)

| AC | Assertion | Where |
|---|---|---|
| AC1 | determinism suite (D2 a–e) + golden snapshots A/B | `xploder/test/layout.test.ts` |
| AC1 | scene graph: exactly 2 `InstancedMesh`, counts = layout lengths, A and B both mount | `xploder/test/scene.test.tsx` (test-renderer) |
| AC1 | route excluded: `out/` scan + preview/prod 404 | `fixture-exclusion.test.ts`, `perf.yml` |
| AC2 | timeline: both directions, interruption continuity (max \|Δp\| between consecutive 1 ms samples across a toggle ≤ the slope bound), spam-toggle ends on target, token proportionality (D4) | `xploder/test/explode.test.ts` |
| AC2 | reduced motion: static twin settles at `t = now` | `explode.test.ts` |
| AC2 | motion-literal scanner covers engine + playground (non-vacuity) | `no-motion-literals.test.ts` |
| AC3 | reducer property test + exact action union; `keyToAction` table | `xploder/test/camera.test.ts` |
| AC3 | **no-free-orbit scan** (imports, identifiers, manifests, negative control) | `apps/web/test/no-free-orbit.test.ts` (scans both packages, next to the other scanners) |
| AC3 | ortho camera, 45° at mount, 135° after `rotateRight` once the turn settles, `store.controls === null` | `scene.test.tsx` |
| AC3 | animated turn: the displayed azimuth stays between the two consecutive snaps, ends exactly on a snap, retargets on a second press; static twin = cut | `xploder/test/camera.test.ts` |
| AC5 | **package-consumer scan** over `apps/web/app`: imports of `three`, `@react-three/*` and `xploder/src/*` are forbidden; only exported `xploder` subpaths are allowed; engine identifiers (`useFrame`, `InstancedMesh`, `setMatrixAt`, `Matrix4`, `OrthographicCamera`) are forbidden in app code | `apps/web/test/package-consumer.test.ts` |
| AC5 | `xploder/package.json` exports include `./layout` + `./react`; S2 `geometry-free.test.ts` and the schema snapshot unchanged and green | `xploder/test/exports.test.ts` + existing |
| AC6 | hex-literal scanner (D7) | `apps/web/test/no-color-literals.test.ts` |

- React components stay thin. All logic (layout, timeline, rig, keymap, theme resolution, fit) is pure and unit-tested in Node. The only React-level tests use `@react-three/test-renderer` (no WebGL, no jsdom needed for the scene). **Revised in round 1: no jsdom.** The hooks are thin adapters over pure functions that take their environment as arguments (`resolveThemeMode`, `subscribeTheme(env)`, `subscribeReducedMotion(env)`). Those are unit-tested in Node with small fakes for `matchMedia`/`MutationObserver`. The real-browser wiring is covered by `engine:probe` (D10), which runs in actual Chromium. That's one dev dependency less, and it avoids a jsdom shim that would test jsdom's `matchMedia` rather than a browser's. **Open question 4.**

### D10 — Evidence and the FPS proof (AC2, AC3, AC4, AC6)

- **R: one new CLI, `pnpm engine:probe <url>`** (`tools/perf/src/cli/engine-probe.ts`, same exit-code contract). It drives `/dev/engine` with Playwright and writes `engine-probe.json`: draw calls and instance counts for A and B; the default azimuth; azimuth after the rotate button and after `ArrowRight`; zoom after 20 × `+` and 20 × `-` (clamped to the documented bounds); the state timeline for one explode and one implode; and, under `reducedMotion: 'reduce'`, the state timeline + rendered frame count in the 1 s after a toggle. Screenshots are taken at each end state. This is the machine evidence for AC2/AC3 behaviour.
- **Screenshots (AC6):** `pnpm evidence <url> --color-scheme light|dark --wait-for '[data-xploder-state=exploded]'` (and `…imploded`) against `?fixture=a&state=…`. That gives **mobile + desktop × light + dark × imploded + exploded = 8 PNGs**, plus B exploded light as the generality shot. Committed as `T0NN-screenshot-<variant>.png`.
- **FPS (AC4):** `pnpm fps:engine` (sibling of `fps:calibrate`): `build:fixtures` → serve `out-fixtures/` on `127.0.0.1` → `measureFps` on `/dev/engine?fixture=a&cycle=1` (desktop profile, warmup 1 s, window 5 s, continuous explode ⇄ implode) → `fps.json` + screenshot + meta. Pass rule = **literal `fps ≥ 60.00`** (Murphy, round 1), with `droppedFrames`, `rafFps` and p95 reported. That rule is currently **blocked by construction** (E1) pending Merlin. `?cycle=1` re-toggles in the same frame `onSettled` fires, so the demand loop never idles inside the window. Run **locally on the Mac** (real GPU, D-facts). It is **not** added as a CI job: ubuntu runners would use software GL, and AC6's CI list doesn't include an engine FPS job, so a flaky non-AC check could turn "full CI green" red. **Open question 10.**
- **Weight note (informational):** `perf:weight` on `out-fixtures` `/dev/engine` is recorded once, so S9 knows the engine's transfer cost before the engine ships to production. It is not a gate in S4 (the playground is not in the production build, and the landing page's gates are unaffected).

### D11 — Execution ladder (Hard Rule 5)

- Same as S02/S03: **tier 1 = DeepSeek Flash** (`codex exec -p deepseek`, sandbox off for browser tasks per the S03 decision). **Tier 2 skipped** (`OPENROUTER_API_KEY` unset, logged per task). On 2 tier-1 failures: **pause and report with 5h/7d usage**, no automatic takeover. Each task report names the finishing tier.

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories:**
- **P1 — Visitor sees the product move.** On `/dev/engine` (later the site), a project appears as an assembled isometric stack; one toggle explodes it into separated layers and back, smoothly and interruptibly, and reduced-motion users get the separated view instantly. → AC1, AC2
- **P1 — Visitor orients without getting lost.** The view starts at a fixed 45° isometric angle; rotate buttons/arrow keys turn it in clean 90° steps; zoom is bounded; the page still scrolls on a phone. → AC3
- **P1 — Lib author (OSS).** `xploder/layout` turns any valid `Project` into deterministic slab placements, with no coordinates in the data; `xploder/react` renders it with two draw calls from tokens alone. → AC1, AC5
- **P2 — Reviewer trusts it.** FPS, screenshots and behaviour probes are machine-made and attached; CI proves the playground never ships. → AC4, AC6

**FR mapping rule:** FR-001 ↔ AC1 … FR-006 ↔ AC6, one-to-one. D1 (package surface), D3 (instancing/budget), D7 (materials + hex scan) and D8 (route) are supporting requirements under the FR whose AC they serve. **No new acceptance criteria are invented.** The draw-call budget and zoom bounds are documented values (from this RFC) referenced by FR-001/FR-003. They aren't new ACs.

**plan.md inputs:** D1–D10. Data flow:
`projectAJson` → `parseProject(json, { registry })` → `layoutProject(project)` → `ProjectLayout` (frozen) → `<TeardownViewer layout>` → `useExplodeTimeline(layout, resolveMotion(prefersReduced))` → `useFrame`: `sample(t)` → `setMatrixAt` ×2 meshes → `invalidate()` until settled. Camera: `useReducer(cameraReducer)` ← buttons / `keyToAction` → `fitZoom(bounds.exploded, viewport)` → ortho camera position/zoom. Palette: `<html class>` + media → `resolveThemeMode` → `blueprint[mode]` → material colors.

**Component API surface (draft, stabilised in plan.md):**
```ts
// xploder/layout
layoutProject(project: LayoutInput, options?: Partial<LayoutOptions>): ProjectLayout
fitZoom(bounds: Box, viewport: { width: number; height: number }): number
LAYOUT_DEFAULTS: LayoutOptions

// xploder/react
useTeardownViewer(opts?: { initial?: 'imploded' | 'exploded' }): TeardownViewerHandle
  // → { state, azimuth, zoom, actions: { toggle, explode, implode, rotateLeft, rotateRight, zoomIn, zoomOut, zoomReset } }
<TeardownViewer layout viewer palette? onStats? onSettled? className? aria-label />
useBlueprintPalette(): Palette
usePrefersReducedMotion(): boolean
```

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Task (one integration seam) | Executable check | AC |
|---|---|---|---|
| T1 | `xploder` surface: `./layout`, `./react`, `./fixtures` exports; optional peers + dev deps; `jsx` in tsconfig; react-hooks ESLint; `apps/web` peer-satisfying deps; `exports.test.ts` | `pnpm install && pnpm typecheck && pnpm lint && pnpm test` green; S2 schema snapshot + geometry-free unchanged; `pnpm build` landing weight within ±2% of main | AC5 |
| T2 | `layoutProject` + `LAYOUT_DEFAULTS` + `fitZoom` + determinism suite (D2 a–e) | `pnpm --filter xploder test layout` green; golden snapshots A/B committed | AC1 |
| T3 | `motion/ease.ts` (cubic-bezier) + `engine/explode.ts` timeline + tests (both directions, interruption, spam, reduced motion, token proportionality) | `pnpm --filter xploder test explode` green; scanner green | AC2 |
| T4 | `engine/camera.ts` reducer + `keyToAction` + property test | `pnpm --filter xploder test camera` green | AC3 |
| T5 | `xploder/react`: canvas, 2 instanced meshes, rig wiring, palette + reduced-motion hooks, `<TeardownViewer>` + `useTeardownViewer`; `scene.test.tsx` | test-renderer: 2 meshes, counts, ortho 45°→135°, `controls === null`; typecheck/lint green | AC1, AC3, AC5 |
| T6 | Guard scanners: `no-color-literals`, `no-free-orbit`, `package-consumer`; motion-scanner non-vacuity | each scanner green + its negative controls fail as expected | AC2, AC3, AC5 |
| T7 | `/dev/engine` playground (`page.fixture.tsx`, controls, query params, readout) | `pnpm dev` → route renders A and B; first screenshot evidence (light, desktop + mobile) | AC1 |
| T8 | Exclusion extended: `fixture-exclusion.test.ts` + `perf.yml` assert-absent for `dev/engine` | `pnpm build` → scan green; `pnpm build:fixtures` → positive control finds both markers | AC1, AC6 |
| T9 | `engine:probe` CLI + `fps:engine` CLI (tools/perf) | unit tests for parsing/report shape; `--help` exits 0 | AC2, AC3, AC4 |
| T10 | Visual + behaviour evidence: 8 screenshots + B shot + `engine-probe.json` (normal + reduced motion) | files committed under `evidence/` per naming rule; probe exit 0 | AC2, AC3, AC6 |
| T11 | FPS evidence: `pnpm fps:engine` on fixture A | `fps.json` per the E1 pass rule + screenshot + meta | AC4 |
| T12 | Push + PR, full CI, AC1–AC6 self-check table; post-merge prod-404 row | all required + listed checks green on the PR; `evidence/AC-selfcheck.md` | AC6 (all) |

**Order:** T1 → T2 → (T3 ∥ T4) → T5 → T6 → T7 → T8 → T9 → (T10 ∥ T11) → T12.

**Phase groups (Stage 3 STOP points):** **G1 pure core** T1–T4 (layout, timeline, rig; AC1/AC2/AC3 logic) → STOP · **G2 renderer + playground** T5–T8 (AC1, AC3, AC5 + exclusion) → STOP · **G3 evidence** T9–T11 (AC2, AC3, AC4, AC6 visuals) → STOP · **G4 ship** T12 → STOP + AC self-check table.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **AC4 literal "≥60.00" vs a 59.986 Hz headless cadence** | **materialised:** blocked by construction (E1 evidence) | escalated to Merlin 2026-10-29. Never re-tune the harness or uncap the frame rate to read higher. |
| R3F v9 peer range `react <19.4` | a React 19.4 bump breaks the peer | pin `react` at the current `^19.3.1` resolution; Renovate-style bumps must check R3F first (noted in plan.md). |
| WebGL screenshots blank in headless | visual evidence fails | the Mac probe shows hardware WebGL2; if captures are blank, `preserveDrawingBuffer` in playground only, never in the lib default. |
| Theme toggle flash in canvas (one frame of the old palette) | visible flicker on toggle | the `MutationObserver` callback runs as a microtask before the next frame → `color.set` + `invalidate` land in the same frame; checked in T10 dark/light screenshots. |
| Dev-route three.js weight leaks into prod bundle | weight/Lighthouse gates move | route not compiled in prod (D8); T1 checks landing weight ±2%; exclusion scan. |
| `test/fixtures` exported from the package | test-file churn affects consumers | documented as "example projects"; S2 tests keep their paths; file contents unchanged. |
| Scanner false positives (`#` anchors, `0x` constants) | red tests on legit code | patterns restricted (hex length 3/4/6/8 with word boundary, `0x` 6-digit only); allowlist by file is **not** offered. Fix the code instead. |
| Layout constants look wrong once rendered | rework in S6 | tuned once in T7 with screenshot evidence; all overridable via `options`. |
| Slice size (brief: "Large-effort split candidate") | 2 revisions → split | phase groups align with the brief's split line (layout · animation · camera), so a split costs no re-planning. |

---

## 6. Open questions (each with recommended default)

**E1 — AC4 reading: Murphy chose the literal reading `fps ≥ 60.00` (round 1). Under it AC4 is blocked by construction → escalated to Merlin.**
- Evidence (`evidence/E1-fps-literal-probe.txt`): 10 consecutive harness runs on the S3 calibration fixture read **59.32–59.82 fps**. All 10 pass the S3 band with **0 dropped frames** and rAF 60.00, and **none reaches 60.00**. A trace shows 301 DrawFrames spanning **5001.2 ms**: headless Chromium's display cadence is **59.986 Hz**, so even a bias-free estimator can't reach 60.00 for *any* content. The harness estimator adds a further −0.6 fps: its window opens before `Tracing.start` takes effect, so the first ~50 ms of each window has no recorded frames (an S3 tooling finding).
- The only ways to read ≥ 60.00 are to uncap the frame rate (Chromium flags) or to change the estimator to report the nominal rate. Both would measure the instrument, not the engine. **Not done.**
- Options put to Merlin (brief owner). The orchestrator does not reword the AC: **(R1, recommended)** a brief revision so AC4 reads as the S3 harness verdict `--expect 60` **and** `droppedFrames = 0` (a 60 fps floor = no frame misses its vsync slot) · **(R2)** a calibration-relative rule: engine `fps ≥` calibration `fps` measured in the same session, and 0 dropped frames · **(R3)** keep the literal AC: AC4 stays blocked and S4 cannot close.
- **Effect on Stage 2:** spec/plan/tasks can be generated with FR-004 carrying AC4 verbatim and flagged *blocked pending Merlin*. Tasks T9/T11 are unaffected in content; only their pass verdict depends on the outcome.

1. **Package surface:** new subpaths `xploder/layout` (pure) and `xploder/react` (R3F), with engine internals unexported? → **Default: yes** (D1).
2. **Dependencies:** `three ^0.186`, `@react-three/fiber ^9.8` (optional peers of `xploder`, deps of `apps/web`), dev: `@types/three`, `@types/react`, `@react-three/test-renderer`, `eslint-plugin-react-hooks`. **No drei, no GSAP, no jsdom** (round 1). → **Approved by Murphy.**
3. **Fixtures via `xploder/fixtures`** pointing at the existing `test/fixtures/index.ts`? → **Default: yes** (D1).
4. **Hook tests:** ~~jsdom~~ → **revised default: pure env-injected adapters + real-browser coverage via `engine:probe`** (D9).
5. **Reduced-motion initial state = exploded** (normal = imploded); the toggle works instantly both ways under reduced motion? → **Default: yes** (D5).
6. **Snap rotation:** ~~instant cut~~ → **revised default: animated 90° turn on the `implode` tokens, cut under reduced motion** (D6). A square stack looks identical at every 90° step, so a cut doesn't read as a rotation.
7. **Zoom bounds:** ~~`[0.75 × fit, 3 × fit]`~~ → **revised default: `[1 × fit, 3 × fit]`**, step × 1.25, reset = fit, keyboard `+ - 0`, no wheel/pinch handlers, canvas `touch-action: pan-y pinch-zoom` (D6). Pinch/wheel model zoom can come with S8's input work.
8. **Base material roles:** ~~slab = `grid`~~ → **revised default: slab = `lineMuted`, component = `line`** (measured contrast in D7), transparent canvas over `paper`, Lambert + default-white lights. S6 replaces them anyway.
9. **AC1 prod-404 proof timing:** like S3, the `perf: fixture exclusion` job's `main`-push log after merge is the production evidence; pre-merge, the preview 404 + `out/` scan cover it? → **Default: yes.**
10. **Engine FPS stays a local headless proof (Mac GPU), not a CI job** (CI keeps S3's calibration job)? → **Default: yes** (D10).
11. **Layer 0 at the top of the stack** (UI on top for A, `ingest` on top for B)? → **Default: yes** (D2).
12. **Interrupt semantics:** a reversal restarts from current progress with duration **and stagger delay** scaled by remaining distance (round 1: delay scaling added) → **revised default** (D4).
13. **Executor ladder as S02/S03** (Flash → tier 2 skipped → pause + usage report on 2 failures)? → **Default: yes** (D11).

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. **E1:** Merlin's answer (R1 / R2 / R3) once it arrives (default: R1 recommended; no Stage 3 AC4 verdict before it).
2. The layout rules in D2 (shared footprint, `ceil(sqrt)` grid, layer 0 on top, centered stack) match the picture in your head for both fixtures (default: accept).
3. D4's choice of a custom tween over GSAP, including the OSS-license reason (default: accept).
4. D6's camera: instant 90° cuts, isometric elevation, zoom bounds, no wheel/drag/pinch (default: accept).
5. The four phase groups in §4 give you the validation points you want (default: accept).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. ~~Your answer to E1~~ → answered (literal). Now needed: Merlin's revision decision, relayed or recorded in the vault revision log (default: R1).
2. Confirmation of the six round-1 revisions in §9.2 (default: accepted).
3. ~~Dependency list~~ → approved.
4. ~~Push + draft PR~~ → granted. The branch is pushed now (for the E1 evidence); the draft PR opens at T8 as planned.
5. Who merges, and when, for the AC1 prod-404 row (default: you merge after your final validation; the `fixture exclusion` job's main-push log is the evidence).
6. Usage pacing as in S03 §9.6 (start each Stage 3 group in a fresh 5h window, stop at ≥ 85%; you state "5h: N%" in gate messages because the local capture is stale, last captured 03:50Z) (default: same).

---

## 9. Decisions recorded (Murphy, 2026-10-29, round 1)

1. **E1 → literal reading `fps ≥ 60.00`.** The orchestrator measured it (`evidence/E1-fps-literal-probe.txt`): blocked by construction (headless cadence 59.986 Hz). Escalated to Merlin via Hermes → home Discord channel, as Murphy authorised. AC4 is unchanged in this RFC.
2. Open questions 1–13: defaults accepted. Murphy then asked the orchestrator to challenge them, and **six defaults were revised** (need confirmation):
   1. Q4: no jsdom. Pure env-injected adapters + real-browser coverage via `engine:probe` (D9).
   2. Q6: animated 90° turn on the `implode` tokens instead of an instant cut (D6).
   3. Q7: zoom lower bound `1 × fit` instead of `0.75 × fit`; canvas `touch-action: pan-y pinch-zoom` (D6).
   4. Q8: slab color `lineMuted` instead of `grid`, from measured contrast (D7).
   5. Q12: stagger delays also scaled on interruption (D4).
   6. D2 addition: grid axis orientation fixed so data order reads left → right at the default view.
   Unchanged after challenge: Q1, Q3, Q5, Q9, Q10, Q11, Q13 (reasons in the chat summary for this round).
3. Dependencies (Q2, minus `jsdom`): **approved.**
4. Push `task/s04-engine-core-a` and open a draft PR: **granted.**
5. Usage at this gate: 5h 56% (Murphy).
