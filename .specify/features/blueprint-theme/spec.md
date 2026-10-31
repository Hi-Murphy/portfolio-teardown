# Feature Specification: S06 Blueprint Theme Applied

**Feature dir:** `.specify/features/blueprint-theme/` · **Slice:** S06-blueprint-theme · **Created:** 2026-10-31 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-06-blueprint-theme.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-10-31; §6 defaults + round-1 refinements R1–R6; decisions in §9)

> Rule: functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. The material patch, look tokens, overlay geometry and placement, circuit-trace routing, the S5 frozen manifest and the evidence tooling are supporting work under the FRs they serve. They get task-level checks, not criteria of their own. Documented values (edge width, washes, the kind → role map, the 50% visibility meaning, the parity thresholds, the 2-draw-call baseline) come from the RFC and are referenced, not promoted to criteria.
>
> **Perf doctrine (binding):** perf evidence uses the dropped-frames style only (0 dropped frames over a ≥ 5 s window, the 60 ±10% band as liveness, raw fps as information). No task check anywhere in this feature may contain a literal fps threshold (kickoff Hard Rule 4).
>
> **Reachability (binding):** wherever zoom is involved, all content must stay reachable through S5's `setViewOffset` scroll, evidenced by top + bottom max-zoom screenshots (kickoff Hard Rule 5).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Visitor sees a blueprint (Priority: P1)

I open the architecture view and see a drafting sheet: a warm paper-white background, slabs drawn as pale paper parts with crisp ink-blue outlines, and parts tinted by what they are (service, store, external, actor, module). In dark mode, from the OS or the toggle, the sheet is deep navy with light/cyan lines and the same colour meanings. The page never flashes the wrong theme on load.

**Why this priority:** the visual language is the slice's whole purpose, and it must hold in both palettes.

**Independent Test:** the look-token, fills and parity tests are green for both palettes. The blueprint scene test shows the patched materials, `instanceFill` and exactly 2 meshes. The probe samples slab fill and edge pixels in light, after a toggle to dark, and under OS-dark emulation with no stored override. The hex scanner is green with the S6 files in its scanned set.

**Acceptance Scenarios:**

1. **Given** `/dev/engine` fixture A in light mode, **When** the view renders, **Then** slab fills equal the token-derived kind fills, outlines equal the `line` role, and the page background is `paper`. _(AC1, AC2)_
2. **Given** the same page, **When** the theme toggle switches to dark, **Then** fills, outlines and overlay text switch to the dark-palette roles on the next frame. _(AC1)_
3. **Given** a browser with OS dark preference and no stored theme, **When** `/dev/engine` loads, **Then** the first captured screenshot is already dark (no light flash), and toggling back to the OS value clears the stored override (S1 behaviour preserved). _(AC1)_
4. **Given** the color-literal scanner, **When** it runs, **Then** it is green and its scanned set includes every new S6 file. _(AC1)_
5. **Given** fixture A exploded, **When** the canvas is inspected, **Then** the renderer reports exactly 2 draw calls, and no texture is loaded. _(AC2)_

---

### User Story 2 — Visitor reads the drawing (Priority: P1)

The exploded architecture is annotated like a technical drawing: each layer is named, each part has a part number (with its name on wide screens), and dimension lines show the stack height and the footprint. Everything is readable on a 360 px phone, I can select the text, nothing covers a part, and nothing on the page jumps.

**Why this priority:** the annotations turn the 3D model into a readable drawing, on the design-target phone.

**Independent Test:** the placement matrix test is green (0 hidden, 0 overlaps, inside the viewport, font ≥ 12 px) for fixtures A/B/C × 4 azimuths × both states × five viewports. The probe checks selection, token colours in both themes, label boxes at 360 px, and zero overlay layout shifts. The 12-shot screenshot matrix shows light and dark readability.

**Acceptance Scenarios:**

1. **Given** fixture A exploded at the default zoom on a 360 px wide viewport, **When** the overlay is shown, **Then** every layer label, part number and dimension label is inside the viewer, none overlap each other, none cover a component, and font-size is ≥ 12 px. _(AC3)_
2. **Given** any overlay label, **When** text is selected (Selection API round trip), **Then** the label text is returned, and its computed `user-select` is not `none`. _(AC3)_
3. **Given** light and dark themes, **When** label colours are read, **Then** they equal the token roles (`label`, `ink`, `steel`), with contrast against `paper` ≥ 4.5 : 1 in both palettes. _(AC1, AC3)_
4. **Given** load plus the full probe interaction script, **When** `layout-shift` entries are inspected, **Then** none has a source inside `[data-xploder-overlay]`. _(AC3, AC6)_
5. **Given** an overlay label lying over empty canvas or a layer plate, **When** the visitor hovers a nearby component or taps the label, **Then** S5's hover and tap-empty behaviour are unchanged. _(AC3; S5 behaviour preserved)_

---

### User Story 3 — Visitor follows a request (Priority: P1)

When I play a tour, a circuit trace grows from part to part in exactly the flow's order, with a pad on each visited part and a small signal pulse travelling the newest hop. If I prefer reduced motion, I get the same trace drawn instantly, with no moving pulse.

**Why this priority:** the trace is the blueprint form of the S5 tour, and it must stay truthful to the flow.

**Independent Test:** the trace test asserts `vertices` equals `flow.path.slice(0, k + 1)` for every step of A×2, B and C×2 flows, and that every hop is octilinear. The probe reads `data-xploder-trace` at each step of A's and C's flows, and checks no running animations plus 1 frame per step under reduced motion. The motion scanner is green with the S6 files in its scanned set.

**Acceptance Scenarios:**

1. **Given** fixture A flow `live-update` playing, **When** step k is reached, **Then** `data-xploder-trace` lists `flow.path[0..k]` in order, and the newest hop draws in on `durations.tourPulse` / `easings.tourPulse` after `staggers.tourStep`. _(AC4)_
2. **Given** the tour is playing, **When** a step is active, **Then** a signal dot travels the newest hop with period `2 × durations.tourPulse`. Paused → no dot; ended → full trace held; stop or a flow switch → trace cleared. _(AC4)_
3. **Given** `prefers-reduced-motion: reduce`, **When** the tour advances, **Then** each hop appears complete in the same frame, `getAnimations()` on the overlay is empty, and exactly one frame renders per step. _(AC4)_
4. **Given** the motion-literal scanner, **When** it runs, **Then** it is green and its scanned set includes every new S6 file. _(AC4)_

---

### User Story 4 — Every part is visible by default (Priority: P2)

With the default settings, no part of fixture A or C hides behind another layer at the default angle, and every part can be pointed at. When I zoom in, I can still scroll to the very top and bottom of the stack.

**Why this priority:** a hidden part makes the drawing lie; reachability when zoomed is an S5 guarantee that must not regress.

**Independent Test:** the product-gap test (default = 2, viewer wiring, occlusion ≥ 50% at 45° and every snap). The probe's default hit map reaches every A and C component. Default-angle screenshots of A and C. S5's zoom-scroll probe group stays green, with top + bottom max-zoom screenshots.

**Acceptance Scenarios:**

1. **Given** the RFC, **When** reviewed, **Then** it states the product `explodedGap` (2.0) with the occlusion evidence (RFC D9). _(AC5)_
2. **Given** `TeardownViewer` with no `layoutOptions`, **When** it lays out fixture A or C exploded at 45°, **Then** every component has ≥ 50% of its silhouette visible, and the probe hovers every component at least once. _(AC5)_
3. **Given** max zoom (3×), **When** the stage is scrolled to the top and to the bottom, **Then** a top-layer and a bottom-layer slab are visible and hoverable at the respective ends, and screenshots are attached. _(AC5)_

---

### User Story 5 — Reviewer trusts it (Priority: P2)

I can see that nothing regressed: still 2 draw calls, zero CLS from overlays, frozen S2/S4/S5 surfaces untouched, and every CI and perf gate green.

**Why this priority:** S6 changes the look of a frozen engine; trust comes from guards and gates, not assertions.

**Independent Test:** both frozen manifests green, with negative controls; `git diff --stat --exit-code` logs empty at G1 and G4; `gh pr checks` all green; the FPS tour run shows 0 dropped frames and 2 draw calls.

**Acceptance Scenarios:**

1. **Given** the PR, **When** CI runs, **Then** build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration and fixture exclusion are green. _(AC6)_
2. **Given** the S2/S4 manifest (base `53b2b2b`) and the S5 manifest (base `f31600e`), **When** the frozen-surface test and diff logs run, **Then** both are empty or green. _(AC6)_
3. **Given** the probe's CLS observer, **When** the overlay groups run, **Then** zero layout-shift entries originate in the overlay. _(AC6)_

---

### Edge Cases

- **Explode/implode, turn, zoom or resize** → the overlay hides at once and re-lays out at settle (one follow-up frame); the trace re-routes without replaying the draw-in (R4).
- **Scroll while zoomed** → the overlay translates rigidly with the drawing in the same frame, with no relayout (AC7 untouched).
- **Zoomed in, a label's anchor off-screen** → that label is hidden (its part is reachable by scroll); remaining labels never overlap.
- **Imploded stack** → part callouts are hidden (most parts sit inside the stack); layer labels and dimension lines are shown.
- **Tour active** → layer labels, part callouts and dimension lines step back; the trace and the S5 caption take over; on stop they return.
- **Layer focus** → labels and callouts of non-focused layers fade to the S5 dim level on the dim channel's tokens (instant with the static twin).
- **Theme toggle with the overlay shown or during a tour** → materials, overlay text and trace colours follow the new palette on the next frame.
- **Project switch (A → C)** → materials, `instanceFill`, overlay content and trace are rebuilt for the new project; S5 state resets as before.
- **Narrow viewport, long part names (≥ 768 px)** → long → short fallback before hiding (R2).
- **Hover on a highlighted part** → overlay unchanged (no new hover behaviour); the slab shows S5's highlight in the blueprint look.
- **Component with no techs (actors, externals)** → its kind still defines the category colour.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** light default and dark alternate render the blueprint palette with toggle + OS preference/no-flash preserved; palette colors come only from tokens (hex exclusivity green).
- **FR-002 (↔ AC2):** slabs have crisp blueprint edge/outline treatment and semantic category accents; no texture assets; 2 draw calls on fixture A remain.
- **FR-003 (↔ AC3):** layer labels, part numbers, and dimension/callout overlays are selectable HTML/SVG, readable at 360px+, and do not contribute CLS; screenshots prove light+dark readability.
- **FR-004 (↔ AC4):** tour circuit trace/pulse follows actual flow component order; reduced-motion produces an instant/static equivalent; motion exclusivity green.
- **FR-005 (↔ AC5):** product `explodedGap` is explicitly decided in RFC; default-angle evidence shows all required fixture A/C components reachable/visible; S5 zoom-scroll AC7 remains green (top+bottom max-zoom evidence).
- **FR-006 (↔ AC6):** full CI green on PR (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); S2/S4/S5 frozen-surface checks remain empty; zero CLS contribution from theme overlays.

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
| --- | --- | --- |
| 1. Blueprint slab materials + semantic category colours from S2 tokens; light/dark parity | FR-001, FR-002 | RFC D2, D3, D4, D5 |
| 2. Crisp slab edges/outline, no texture pipeline | FR-002 | RFC D3 |
| 3. Dimension lines, part-number callouts, layer labels as HTML/SVG overlays; responsive at 360 px+ | FR-003 | RFC D6, D7, R1–R3 |
| 4. Tour circuit trace/pulse from S5 tour state + S2 motion tokens; reduced-motion twin | FR-004 | RFC D8, R4 |
| 5. Product `explodedGap` decision, documented and tested; A/C components visible at default | FR-005 | RFC D9 |
| 6. Evidence: light/dark × imploded/exploded × tour; max-zoom top/bottom | FR-003, FR-005 | RFC D12 |
| 7. No regressions: frozen surfaces, 2 draw calls, zero CLS, CI/perf gates | FR-006 | RFC D1, D10 |

Non-goals stay hard: no detail/case-study/tech panels (S7) · no new hover/tap behaviour (S5 is frozen) · no a11y live-region polish (S8) · no site shell or landing routes (S10) · no real project content (S9) · no pixel/papercraft theme · no schema/API changes (`TeardownViewerProps` unchanged, no new package export, R5) · no camera-rig changes · no replacing the token system · no DNS/Vercel-project changes · no analytics · no secrets.

### Key Entities

- **Look tokens** (internal, `src/look/tokens.ts`): `edge { componentPx, layerPx, role }`, `fill { base, wash, highlightWash }`, `faces { top, left, right }`, `layer { wash }`, `kind { module, service, store, external, actor }` → palette role path, `annotation { fontPx, gapPx, …Role }`, `trace { role, casingRole, strokePx, casingPx, padPx }`. Role names only, never hex.
- **Fills** (internal, pure, `src/look/fills.ts`): `mixSrgb(a, b, t)`, `kindFill(palette, kind)`, `layerFill(palette)`, `highlightFill(palette)`, `decomposeEmphasis(ratio, base, accent, paper) → { t, p }`.
- **Viewer layout defaults** (internal, `src/look/product.ts`): `VIEWER_LAYOUT_DEFAULTS = { explodedGap: 2 }`.
- **Overlay frame** (internal): `{ width, height, offsetY, layers: { id, corners: Vec2[] }[], components: { id, center: Vec2, hull: Vec2[] }[] }` in content-space CSS px.
- **Label** (internal): `{ key, kind: 'layer' | 'part' | 'dimension', anchor: Vec2, text, shortText?, box: { w, h } }` → **placement** `{ key, x, y, w, h, leader?: [Vec2, Vec2], short: boolean } | hidden`.
- **Dimension line** (internal): `{ from: Vec2, to: Vec2, offsetPx, ticks: Vec2[] } → { line, extensions, tickMarks, labelAnchor }`.
- **Trace route** (internal): `traceRoute(pathPrefix, anchors) → { vertices: string[], points: Vec2[], hops: { from, to, points }[] }`.
- **Viewer DOM contract additions:** `[data-xploder-overlay]` (`hidden|shown`), `data-xploder-overlay-hidden` (count), `data-xploder-trace` (space-separated ids), label elements `[data-xploder-label="layer:<id>|part:<id>|dimension:<name>"]`.
- **Frozen manifests:** S2/S4 `frozen-surface.manifest.json` (base `53b2b2b`, unchanged); S5 `frozen-surface.s5.manifest.json` (base `f31600e`, new).
- **Evidence artifacts:** `engine-probe.json` (S4/S5 checks + S6 groups), screenshot matrix PNGs + meta, `fps.json` (tour), frozen-surface diff logs, RFC measurement logs.

## Success Criteria _(mandatory)_

Success = AC1–AC6 each pass with evidence recorded in `evidence/` and the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
| --- | --- | --- |
| FR-001 | AC1 | look-tokens + look-fills test logs (parity table, both palettes) · hex scanner log with non-vacuity · `engine-probe.json` palette-pixel group (light, toggle → dark, OS-dark first screenshot) · screenshot matrix light + dark |
| FR-002 | AC2 | look-fills (decomposition round trip) + blueprint-scene test logs (patched Lambert, `instanceFill`, 2 meshes) · probe edge/fill pixel samples · probe `fixture-a-draw-calls` = 2 (rest, exploded, mid-tour) · `fps.json` `drawCalls` = 2 |
| FR-003 | AC3 | overlay-place matrix log (0 hidden, 0 overlaps, inside, font ≥ 12 px) + projection closed-loop log · `engine-probe.json` overlay group (selection, token colours both themes, 360 px boxes, hit-through) + overlay CLS entries = 0 · 12-shot matrix light/dark × imploded/exploded/tour × mobile/desktop |
| FR-004 | AC4 | overlay-trace test log (path-prefix order A×2, B, C×2; octilinear hops; token timing; static twin) · motion scanner log with non-vacuity · `engine-probe.json` trace group (normal + reduced motion) + tour screenshots |
| FR-005 | AC5 | RFC D9 + `evidence/RFC-log-occlusion-gap-sweep.txt` · product-gap test log · probe default-gap hit map · default-angle screenshots A + C (light/dark × mobile/desktop) · S5 scroll probe group + max-zoom top/bottom screenshots |
| FR-006 | AC6 | `gh pr checks` output (every listed check green) · frozen-surface test log (both manifests) + negative controls + `git diff --stat` logs at G1 and G4 · overlay CLS entries = 0 · `fps.json` (0 dropped frames, band liveness, `tourStepsAdvanced ≥ 3`) |

## Assumptions

- All RFC §6 defaults are accepted, plus round-1 refinements R1–R6 (RFC §9.1). No new dependencies.
- `/dev/engine` is the only route that mounts the viewer (RFC F6). Visual evidence runs on the local fixture export (`pnpm build:fixtures` + `serve`). Lighthouse and weight on `/` remain no-regression gates.
- Push and draft PR are granted at the end of G2 (RFC §9.4). Nothing is pushed before then.
- The orchestrator merges only after Murphy says "merge" (RFC §9.5).
- Escalation: tier 1.5 (OpenRouter) is DORMANT and skipped with a record. After two tier-1 failures, the orchestrator pauses and reports with 5h usage, then executes personally on Murphy's go (RFC §9.2). Each phase group starts in a fresh 5h window; no new task starts at ≥ 85% of the 5h window.
