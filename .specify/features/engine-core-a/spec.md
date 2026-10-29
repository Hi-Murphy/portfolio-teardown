# Feature Specification: S04 Engine Core A — Layout · Explode · Camera

**Feature dir:** `.specify/features/engine-core-a/` · **Slice:** S04-engine-core-a · **Created:** 2026-10-29 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-04-engine-core-a.md` (frozen brief v1) · **Design:** `rfc.md` (approved 2026-10-29; §6 defaults + six round-1 revisions confirmed; decisions in §9)

> Rule: functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Package surface, instancing, base materials, the playground route and the evidence CLIs are supporting work under the FRs they serve. They get task-level checks, not criteria of their own. Documented values (draw-call budget, zoom bounds, layout defaults) come from the RFC and are referenced, not promoted to criteria.
>
> **FR-004 (AC4): Merlin decided R3 (keep the literal reading), RFC §9.7.** It was previously flagged *blocked pending Merlin* (RFC E1): under Murphy's literal reading (`fps ≥ 60.00`), headless Chromium's 59.986 Hz cadence makes it unattainable by construction (`evidence/E1-fps-literal-probe.txt`). The AC text below is unchanged. If Merlin commits a revised brief, it is merged into this branch and FR-004 is re-quoted from it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visitor sees the product move (Priority: P1)

On `/dev/engine` (later the site), I see a project as an assembled isometric stack of layer slabs with component slabs gridded on them. One toggle explodes it into separated layers and another implodes it back, smoothly, and I can interrupt either at any time. If I prefer reduced motion, I get the separated view instantly with no animation.

**Why this priority:** this is the slice's mission and the first time the product moves.

**Independent Test:** open `/dev/engine` (dev server or fixture export). Fixture A shows 4 layer slabs and 8 component slabs. The toggle explodes and implodes. `?fixture=b` (or the switch) shows fixture B. `pnpm engine:probe` records both directions and the reduced-motion path.

**Acceptance Scenarios:**
1. **Given** `/dev/engine` with fixture A, **When** it renders, **Then** 4 layer slabs stack vertically in data order (layer 0 on top), each carrying its components in a centered grid, drawn by 2 instanced meshes. *(AC1)*
2. **Given** the fixture switch set to B (or `?fixture=b`), **When** it renders, **Then** fixture B's 4 layers and 5 components render through the same code path. *(AC1)*
3. **Given** the same `Project`, **When** `layoutProject` runs twice (or in another process), **Then** the outputs are strictly equal and match the committed golden snapshot. *(AC1)*
4. **Given** the imploded state, **When** the toggle is pressed, **Then** the state goes `imploded → exploding → exploded` with the cascade timed by `durations.explode`, `easings.explode` and the explode staggers. Pressing it again goes `exploded → imploding → imploded` on the implode tokens. *(AC2)*
5. **Given** an animation in flight, **When** the toggle is pressed again, **Then** every slab reverses from its current position with no jump and the view ends exactly on the new target. *(AC2)*
6. **Given** `prefers-reduced-motion: reduce`, **When** the page loads and the toggle is pressed, **Then** the exploded state is present from the first frame, and each toggle switches state in one rendered frame with no intermediate `exploding`/`imploding` state. *(AC2)*
7. **Given** the production build and the deployed production URL, **When** `/dev/engine` is requested, **Then** it 404s and no `data-perf-fixture` marker ships (CI-checked like the S3 fixture). *(AC1)*

---

### User Story 2 — Visitor orients without getting lost (Priority: P1)

The view starts at a fixed 45° isometric angle. Rotate buttons and the arrow keys turn it in clean 90° steps. Zoom stays within sensible bounds. On a phone, the page still scrolls over the canvas.

**Why this priority:** the locked camera decisions (no free orbit, snaps only) are what make the view legible on mobile.

**Independent Test:** `pnpm engine:probe` reports azimuth 45° at load, 135° after the rotate button, 135° → 225° after `ArrowRight`, and zoom clamped at both ends. The no-free-orbit test is green and its negative control fails as expected.

**Acceptance Scenarios:**
1. **Given** a fresh load, **When** the camera settles, **Then** its azimuth is 45°. *(AC3)*
2. **Given** any state, **When** rotate is pressed (button) or `ArrowLeft`/`ArrowRight` is pressed (keyboard, viewer focused), **Then** the target azimuth moves by exactly ±90°. The displayed angle animates on the implode tokens (a cut under reduced motion) and always ends on `45° + k·90°`. *(AC3)*
3. **Given** repeated zoom in/out (buttons or `+`/`-`), **When** the bound is reached, **Then** zoom stays within `[1 × fit, 3 × fit]`, and `0`/reset returns to fit. *(AC3)*
4. **Given** the source tree and manifests, **When** the no-free-orbit test runs, **Then** no orbit/trackball/arcball/map/fly/camera-controls import or identifier exists, the rig's action union is exactly `rotateLeft | rotateRight | zoomIn | zoomOut | zoomReset`, and the R3F store holds no controls object. *(AC3)*

---

### User Story 3 — Lib author (OSS) (Priority: P1)

As a consumer of `xploder`, I can turn any valid `Project` into deterministic slab placements with `xploder/layout`, with no coordinates in the data, and render it with `xploder/react` using tokens alone. The site is just another consumer.

**Why this priority:** layout generality and the lib/app boundary are the lib's core promise and the basis of the future OSS release.

**Independent Test:** the package-consumer scan over `apps/web/app` is green (no `three`/`@react-three/*`/`xploder/src` imports, no engine identifiers). `xploder` exports include `./layout` and `./react`. The S2 geometry-free test and schema snapshot are unchanged and green.

**Acceptance Scenarios:**
1. **Given** `apps/web`, **When** the package-consumer scan runs, **Then** the app imports the engine only through exported `xploder` subpaths and contains no engine logic. *(AC5)*
2. **Given** the S2 schema, **When** `geometry-free.test.ts` and the schema fingerprint snapshot run, **Then** both are green and unchanged. *(AC5)*
3. **Given** engine and playground code, **When** the motion-literal and color-literal scanners run, **Then** both are green and their scanned file sets include the engine and playground files. *(AC2, supporting AC6)*

---

### User Story 4 — Reviewer trusts it (Priority: P2)

As Murphy, I see machine-made evidence for every visual and motion claim (screenshots, FPS harness output, behaviour probe), and full CI green on the PR.

**Why this priority:** this is the first visual slice, where "looks right" is a trap (brief).

**Independent Test:** `evidence/` holds 8 screenshots (mobile + desktop × light + dark × imploded + exploded) plus one of fixture B, `engine-probe.json`, and `fps.json` from the engine route. The PR's checks are all green.

**Acceptance Scenarios:**
1. **Given** the fixture export served locally, **When** `pnpm fps:engine` runs headless on fixture A with continuous explode ⇄ implode, **Then** the harness reports fps per the AC4 rule in force (see the flag above), with `fps.json`, a screenshot and meta attached. *(AC4)*
2. **Given** the PR, **When** CI completes, **Then** build/typecheck/lint/test, gitleaks, the lighthouse gate, the weight gate, fps calibration and fixture exclusion are all green, and the four-way screenshot set is attached. *(AC6)*

### Edge Cases

- Layer with **0 components** (schema default `[]`) → an empty slab of the shared footprint; no component instances for that layer.
- **1–12+ components** per layer → `ceil(sqrt(n))` columns, row-major, partial last row centered; footprint grows with the busiest layer; fit zoom keeps the whole exploded stack in view at all 4 azimuths.
- **Spam toggling** → each press retargets from current progress (duration and stagger delay scaled by remaining distance); the final state equals the last target.
- **Rotate during a turn** → the target moves another 90°, and the displayed angle retargets from where it is (shorter arc).
- **Theme toggle mid-animation** → material colors update on the next frame; the animation continues.
- **Reduced-motion preference changes at runtime** → the in-flight tween completes instantly on the next frame; later toggles are instant.
- **Fixture switch mid-animation** → meshes remount for the new project (keyed by slug) in the default state.
- **Viewport resize** → fit recomputed; the zoom factor is kept and clamped to the bounds.
- **WebGL unavailable** → the viewer renders its fallback text instead of the canvas; no crash.
- **`PERF_FIXTURES=1` on Vercel** → the existing `next.config.ts` guard throws (unchanged from S3).

## Requirements *(mandatory)*

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** `/dev/engine` renders fixture A as stacked layer slabs with component slabs gridded inside; fixture B renders via the switch; layout determinism unit test green; route 404s on the production URL (CI-checked like the S3 fixture).
- **FR-002 (↔ AC2):** explode ⇄ implode works both directions from the toggle; every duration/easing traces to the S2 motion module (exclusivity grep green over engine + playground); with `prefers-reduced-motion`, the exploded state appears instantly with no animation.
- **FR-003 (↔ AC3):** camera defaults to locked 45° azimuth; rotate happens only in 90° snaps via button AND keyboard; zoom stays within documented bounds; a code-level test asserts no free-orbit control exists.
- **FR-004 (↔ AC4):** FPS harness on `/dev/engine` with fixture A reports ≥60fps headless; evidence artifact attached per EVIDENCE.md. — ⚠ *reading in force: literal `fps ≥ 60.00` (Merlin R3, RFC §9.7); expected blocked by construction (E1 evidence).*
- **FR-005 (↔ AC5):** layout + renderer live in `packages/xploder`; `apps/web` imports them as a package consumer (no engine logic in the app); schema geometry-free test still green.
- **FR-006 (↔ AC6):** full CI green on the PR — build/typecheck/lint/test, gitleaks, lighthouse gate, weight gate, fps calibration, fixture exclusion — plus screenshots (light + dark, imploded + exploded) attached as evidence.

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
|---|---|---|
| 1. Layout engine in `packages/xploder` (pure, deterministic, A + B, 1–12+ components) | FR-001, FR-005 | RFC D1, D2 |
| 2. R3F renderer: instanced slabs, explode ⇄ implode (both directions, interruptible), reduced-motion twin | FR-001, FR-002, FR-005 | RFC D3, D4, D5 |
| 3. Camera rig: ortho, 45° default, 90° snaps (button + keyboard), bounded zoom, no free orbit | FR-003 | RFC D6 |
| 4. Dev playground `/dev/engine`: A + B switch, toggle/rotate/zoom, excluded from prod | FR-001, FR-006 | RFC D8 |
| 5. Base materials from S2 theme tokens, light/dark respected, no hex (grep test) | FR-006 (screenshots), supports FR-001 | RFC D7 |
| 6. Perf proof: FPS harness on the playground; draw-call/instance budget documented | FR-004 | RFC D3, D10, E1 |
| 7. Tests: determinism · no free orbit · reduced motion · motion + hex literal exclusivity over engine · fixture exclusion extended | FR-001…FR-006 | RFC D9 |

Non-goals stay hard: no hover/focus/tour (S5) · no blueprint materials, edges, dimension lines, annotations (S6) · no panels/chips/case-study UI (S7) · no keyboard a11y beyond the rotate control (S8) · no site shell/landing changes (S10) · no real content (S9) · no pixel shader · **no schema changes and no breaking change to the schema/parse/tokens public API** (new modules only) · no DNS/Vercel-project changes · no analytics · no secrets.

### Key Entities

- **`ProjectLayout`** (`xploder/layout`): `{ version: 1, footprint, layers: LayerSlab[], components: ComponentSlab[], bounds: { imploded, exploded } }`, deep-frozen. Array order = instance order.
- **`LayoutOptions` / `LAYOUT_DEFAULTS`:** `componentSize 0.8`, `componentThickness 0.12`, `slabThickness 0.08`, `margin 0.3`, `explodedGap 1.1`, `componentLift 0.12` (world units; 1 = one cell pitch). Geometry only, no timing.
- **Explode timeline** (internal): per-instance progress `p_i ∈ [0, 1]`. Timing derives only from a `MotionTokens` argument.
- **Camera rig state** (internal): `{ step: 0..3, zoomFactor ∈ [1, 3] }`. Azimuth = 45° + 90°·step, elevation = `atan(1/√2)`.
- **Viewer DOM contract:** `data-xploder-state` (`imploded|exploding|exploded|imploding`), `data-xploder-azimuth` (target degrees), `data-xploder-zoom` (factor), `data-xploder-ready` (first frame drawn).
- **Playground** (`/dev/engine`): marker `data-perf-fixture="engine"`, query `fixture=a|b`, `state=exploded`, `cycle=1`. Compiled only in `next dev` or with `PERF_FIXTURES=1`.
- **Evidence artifacts:** `engine-probe.json` (new CLI) and `fps.json` (S3 `FpsResult` + engine verdicts).

## Success Criteria *(mandatory)*

Success = AC1–AC6 each pass with evidence recorded in `evidence/` and the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
|---|---|---|
| FR-001 | AC1 | layout test log (determinism suite + golden snapshots) + scene-graph test log + screenshots A (and B) + `engine-probe.json` instance counts + `out/` exclusion scan (with positive control) + preview 404 log + **post-merge** prod 404 log from `perf: fixture exclusion` |
| FR-002 | AC2 | timeline test log + `engine-probe.json` state timelines (normal: both directions; reduced: one-frame switch, frame count) + motion-scanner log with non-vacuity |
| FR-003 | AC3 | camera + no-free-orbit test logs (incl. negative control) + `engine-probe.json` camera block (45°, button 135°, key 225°, zoom clamps) |
| FR-004 | AC4 | `pnpm fps:engine` log + `fps.json` (fixture A, desktop, headless, continuous explode ⇄ implode) + screenshot + meta, judged by the rule in force after E1 |
| FR-005 | AC5 | package-consumer scan log + exports test log + unchanged S2 geometry-free/snapshot test log |
| FR-006 | AC6 | `gh pr checks` output + PR checks screenshot (all listed checks green) + 8 screenshots (mobile/desktop × light/dark × imploded/exploded) |

## Assumptions

- All RFC §6 defaults are accepted, including the six round-1 revisions (RFC §9.2). Dependencies approved: `three ^0.186`, `@react-three/fiber ^9.8` (optional peers of `xploder`, deps of `apps/web`); dev `@types/three`, `@types/react`, `@react-three/test-renderer`, `eslint-plugin-react-hooks`. No drei, no GSAP, no jsdom.
- Push and the draft PR are granted (RFC §9.4). The branch is pushed; the draft PR opens at T008.
- Murphy merges S04 after final validation. The AC1 prod-404 row is completed from the main-push run after that merge.
- The AC4 verdict is not given before Merlin's decision (RFC §9.6). T011 still produces the measurement.
- Escalation: tier 2 (OpenRouter) is skipped; if tier 1 fails twice, the orchestrator pauses and reports with 5h/7d usage. Each phase group starts in a fresh 5h window; no new task at ≥ 85% of the 5h window.
