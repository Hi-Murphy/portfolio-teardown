# Feature Specification: S07 Panels (Component Detail · Case Study · Tech Chips)

**Feature dir:** `.specify/features/panels/` · **Slice:** S07-panels · **Created:** 2026-10-31 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-07-panels.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-10-31: §6 defaults, Q-TOUR = D6, refinements R1–R7 in §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. The supporting work is:
> - the panel state machine, the placement function and its stage ladder;
> - the tour-click command, the content view-models and the panel motion helper;
> - the S6 frozen manifest and the probe group.
>
> Each piece sits under the FR it serves and gets task-level checks, not criteria of its own. Documented values (inset/gap, dock sizes, the 640 px side-dock breakpoint, the stage ladder) come from the RFC and are referenced, not promoted to criteria.
>
> **Perf doctrine (binding):** perf evidence uses the dropped-frames style only: 0 dropped frames over a ≥ 5 s window, the 60 ±10% band as liveness, raw fps as information. No task check anywhere in this feature may contain a literal fps threshold (kickoff Hard Rule 4).
>
> **Reachability (binding):** zoom stays fully reachable through S5's `setViewOffset` scroll, including **with a panel open**. Top + bottom max-zoom screenshots are the evidence (kickoff Hard Rule 5).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Visitor learns what a part is (Priority: P1)

I click (or tap) a slab and a panel appears on the far side of the view, telling me the part's name, what it does, which technologies it uses, its numbers and its links. Tapping the same slab again, pressing Esc, tapping elsewhere or pressing the ✕ closes it, and I'm back in the view where I was.

**Why this priority:** this is the slice's reading layer, and it is the S5-G4 carry-over Murphy asked for.

**Independent Test:**
- `panel-state.test.ts` covers every transition (RFC D4).
- `panel-content.test.ts` covers the complete detail models for fixtures A/B/C with the registry.
- `viewer-panels.test.tsx` runs the panel handle with the real viewer handle.
- The probe interaction log opens by mouse click and by touch tap, closes by every route, and checks focus and content against the fixture JSON.

**Acceptance Scenarios:**

1. **Given** `/dev/engine` fixture A exploded, **When** the visitor clicks `tide-repository`, **Then** a detail panel opens showing its name, its role (`summary`, plus the `description` body), chips with the registry labels `Kotlin`, `Kotlin Coroutines`, `kotlinx.serialization`, the metric `Saved window: 30 days`, and the link `Data notes`. The link opens externally with `rel` containing `noopener`. _(AC1)_
2. **Given** that panel is open, **When** the visitor clicks the same slab again, **Then** the panel closes, and `document.activeElement` is the viewer wrapper. _(AC1)_
3. **Given** a detail panel is open, **When** the visitor presses `Esc` / clicks outside the viewer / presses the close control / clicks empty canvas, **Then** the panel closes each time, and focus is on the viewer wrapper. For an outside click on another focusable control, that control keeps focus (RFC D5, Q5). _(AC1)_
4. **Given** a touch device, **When** the visitor taps a slab, then taps another slab, **Then** the panel switches to the second component. A page or stage swipe does not close it. _(AC1)_
5. **Given** a component without techs, metrics or links (A `beachgoer`), **When** its panel opens, **Then** those sections are omitted: no empty headings. _(AC1)_

---

### User Story 2 — The panel never hides what you picked (Priority: P1)

Wherever the slab I picked sits on screen (top, bottom, left or right; stack open or closed; zoomed out or fully zoomed in and scrolled; light or dark), the panel docks on the opposite side and never covers it.

**Why this priority:** this is a binding carry-over (S5-G4). A panel over the selected part defeats the point.

**Independent Test:**
- `panel-place.test.ts` runs the AC2 matrix: fixtures A/B/C × the top/bottom/left/right slab × imploded/exploded × zoom 1× and 3× (with scroll offsets) × 4 azimuths × 4 viewer sizes. It checks polygon disjointness, containment, the dock side, stage ≤ 2 for fixtures, hysteresis, the synthetic worst cases and the gap vs hover-lift.
- The probe checks the same matrix in pixels in both palettes: each hit-map point of the selected slab lies outside the panel rect, and `elementFromPoint` is not the panel.
- Screenshots × 4 positions × 2 palettes.

**Acceptance Scenarios:**

1. **Given** a desktop viewer (canvas ≥ 640 px wide), **When** the leftmost slab is selected, **Then** the panel docks right. When the rightmost slab is selected, it docks left. In both cases it is disjoint from the slab. _(AC2)_
2. **Given** a phone viewer (canvas < 640 px), **When** the topmost slab is selected, **Then** the panel is a bottom sheet. When the bottommost slab is selected, it is a top sheet. In both cases it is disjoint from the slab. _(AC2)_
3. **Given** max zoom with a panel open, **When** the stage is scrolled to the top and to the bottom, **Then** the panel keeps or changes dock so that it never covers the slab, and the drawing stays scrollable end to end (screenshots top + bottom). _(AC2; Hard Rule 5)_
4. **Given** the stack explodes/implodes, rotates or zooms while a panel is open, **When** the motion runs, **Then** the panel is hidden during the motion and re-placed when it settles, so no painted frame shows the panel over the slab. _(AC2)_
5. **Given** light and dark palettes, **When** scenarios 1–3 run, **Then** the disjointness checks pass in both, and screenshots for both are attached. _(AC2)_

---

### User Story 3 — Visitor reads the story (Priority: P1)

A "Case study" control next to the view opens the project's story: problem, approach, outcome and the project's metrics. The panel scrolls when it is long, leaves the drawing visible, looks right in light and dark, and closes easily.

**Why this priority:** this is the project-level reading layer that S9's real content will fill.

**Independent Test:**
- `panel-content.test.ts` checks the case-study model: section order, sections present only when the schema field exists, metrics from `story.metrics`, and C without a metrics section.
- The probe opens the panel from the chrome button, checks the sections in order, scrolls it, closes it by every route, in light and dark.
- Screenshots light/dark × mobile/desktop.

**Acceptance Scenarios:**

1. **Given** fixture A, **When** the visitor presses "Case study", **Then** a panel shows the project name and tagline, the headline, then Problem → Approach → Outcome, then Metrics (`Saved forecast: 30 days`, `Live refresh: every 5 min`). _(AC3)_
2. **Given** a narrow viewer, **When** the case study is open, **Then** its body scrolls (`scrollHeight > clientHeight`, and `scrollTop` changes after a wheel/touch scroll) without scrolling the page, and ≥ 30% of the canvas stays visible. _(AC3)_
3. **Given** the case study is open, **When** the visitor presses the close control / `Esc` / the "Case study" button again / taps the visible canvas, **Then** it closes, and focus returns to the opener button (or the wrapper). _(AC3)_
4. **Given** light and dark palettes, **When** the case study is open, **Then** its surface, text and borders use palette roles, and screenshots for both are attached. _(AC3)_

---

### User Story 4 — Tech at a glance (Priority: P2)

Inside the detail panel, chips name each technology the part uses, each with its category colour, in both themes. They are labels only; they don't take me anywhere yet.

**Why this priority:** the chips connect parts to the tech registry, and cross-project links come in S14.

**Independent Test:**
- `panel-content.test.ts` checks chip models: registry labels, categories and colour refs.
- The hex scanner is green with the S7 files in its scanned set (non-vacuity).
- The probe compares chip swatch colours with the live `--bp-tech-<category>` values, and checks that no chip is focusable or has a link role.

**Acceptance Scenarios:**

1. **Given** fixture A `live-tide-client`, **When** its panel opens, **Then** chips appear in schema order, each labelled with the registry `label`, inside an `<ul>` list with `<li>` items. _(AC4)_
2. **Given** light and then dark palette, **When** chip swatch colours are read, **Then** each equals the live `--bp-tech-<category>` token (or `--bp-accent` for an `accent` ref). _(AC4)_
3. **Given** the colour-literal scanner, **When** it runs, **Then** it is green and its scanned set includes every new S7 file. _(AC4)_
4. **Given** any chip, **When** inspected, **Then** it contains no `<a>`, no `<button>`, no `tabIndex`, no link role and no click handler. _(AC4)_

---

### User Story 5 — The tour stays a guide (Priority: P2)

While a tour plays, clicking a part on the tour's route jumps the tour there and keeps playing. Clicking a part that isn't on the route pauses the tour and shows that part's details. Pressing Play continues from where it stopped.

**Why this priority:** this settles the brief's Gate-1 question (RFC D6, confirmed by Murphy).

**Independent Test:**
- `panel-tour-click.test.ts` covers both branches × playing/paused/ended, repeated ids and empty hits, and runs the jump sequence through the sealed `tourReducer`/`positionAt`.
- `viewer-panels.test.tsx` runs the same against the real viewer handle.
- The probe tour log on fixture A checks the caption text, step, trace prefix and status after a jump and after one more beat.

**Acceptance Scenarios:**

1. **Given** fixture A `live-update` is playing, **When** the visitor clicks `tide-repository` (path index 3), **Then** the tour is at step 3 and still playing, the caption reads "… Step 4 of 6" with "Tide Repository", and `data-xploder-trace` lists the first 4 path ids. One beat later all of them show step 4 together. _(AC5)_
2. **Given** the same tour is paused at step 1, **When** an in-flow component at index 4 is clicked, **Then** the tour is paused at step 4, and caption + trace agree. _(AC5)_
3. **Given** the tour is playing, **When** the visitor clicks `forecast-details-panel` (not in `live-update`), **Then** the tour pauses at its current step and the detail panel opens for that component. When Play is pressed, the tour resumes from the same step. _(AC5)_
4. **Given** a detail panel is open during a tour, **When** `Esc` is pressed twice, **Then** the first press closes the panel and the second stops the tour. _(AC5, AC1)_

---

### User Story 6 — Reviewer trusts it (Priority: P2)

Nothing on the page jumps when panels and chips appear, move or disappear. Motion comes only from the panel tokens, and reduced-motion visitors get instant show/hide. Frozen surfaces stay untouched, the renderer stays at 2 draw calls, and every CI gate is green.

**Why this priority:** S7 must not regress S2–S6.

**Independent Test:**
- The probe's strict CLS: 0 entries with a source inside the viewer, including `hadRecentInput`; the stage rect and `scrollHeight` are invariant.
- `getAnimations()` is empty under reduced motion.
- `panel-motion.test.ts` checks timings equal the tokens.
- The motion and hex scanners are green with S7 files.
- The frozen-surface test covers S2/S4, S5 and the new S6 manifest, with a negative control.
- `fps.json` for the tour scenario (0 dropped frames, band liveness, `drawCalls = 2`).
- `gh pr checks` is all green.

**Acceptance Scenarios:**

1. **Given** the scripted panel scenario (open, switch, scroll-driven re-dock at max zoom, case study open/scroll/close, Esc), **When** `layout-shift` entries are collected, **Then** none has a source inside the viewer wrapper (counted including `hadRecentInput`). The page total is reported. _(AC6)_
2. **Given** normal motion, **When** a panel opens/closes, **Then** its WAAPI timings equal `durations.panelEnter`/`panelExit` and `easings.panelEnter/panelExit.css`, with offset `distances.panelOffset`. Under `prefers-reduced-motion: reduce`, `getAnimations()` on the panel is empty right after open and the panel is fully visible. _(AC6)_
3. **Given** the S2/S4, S5 and S6 manifests, **When** the frozen-surface test runs, **Then** every hash matches, and a one-byte change to a sealed S6 file turns it red. _(AC6)_
4. **Given** fixture A with a panel open and with the tour playing, **When** renderer stats are read, **Then** draw calls = 2. _(AC6)_
5. **Given** the PR, **When** CI runs, **Then** build, typecheck, lint (+ Prettier), test, gitleaks, lighthouse, weight, fps calibration and fixture exclusion are all green. _(AC6)_

### Edge Cases

- **Slab scrolled fully off-screen while a panel is open:** the panel keeps its dock (nothing to cover) (RFC D3 step 1).
- **No dock reaches the compact size** (only a synthetic 1-layer × 1-component project at zoom ≥ 2.44): the panel takes the largest positive band, cramped but still non-covering, with no camera side effect (Q4).
- **Repeated id in a flow path:** the jump goes to the next occurrence after the current step, else the first (D6).
- **Project switch with a panel open:** the panels reset (R6).
- **Registry absent:** chips render the raw id with no accent (D7). With `parseProject({registry})`, unknown ids are already rejected.
- **Re-open during an exit animation:** the exit is cancelled, and the new surface enters (R5).
- **Esc with no panel open:** untouched, so S5's tour/focus Escape works as before (D5).

## Requirements _(mandatory)_

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** detail panel opens on click/tap with complete schema-driven content (name, role, chips with registry labels, metrics, links); closes via same-slab tap, `Esc`, outside tap, close control; state-machine tests green; focus returns to the viewer.
- **FR-002 (↔ AC2):** panel never covers the selected slab — placement tests green for top/bottom/left/right slab positions × exploded/imploded × both palettes; screenshot evidence attached.
- **FR-003 (↔ AC3):** case-study panel renders story sections + project metrics from schema, is scrollable, closes, and works in both palettes (screenshots).
- **FR-004 (↔ AC4):** tech chips render from the registry with token-derived category accents; hex exclusivity grep green; chips are display-only (no navigation yet).
- **FR-005 (↔ AC5):** tour-click behavior implemented exactly as decided in the RFC (recommended default: jump-to-step when in the active flow, else pause + panel); tests cover both branches; caption + highlight stay in sync after a jump.
- **FR-006 (↔ AC6):** zero CLS from panel/chip overlays (measured); panel motion tokens only; reduced-motion instant twin; full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); frozen-surface checks for S2/S4/S5/S6 remain empty; 2 draw calls unchanged.

### FR ↔ AC mapping

| FR | AC | Design (RFC) | User story |
| --- | --- | --- | --- |
| FR-001 | AC1 | D2, D4, D5, D7; R4, R6, R7 | US1 |
| FR-002 | AC2 | D2, D3; R1, R2 | US2 |
| FR-003 | AC3 | D7, D9 | US3 |
| FR-004 | AC4 | D7, D8 | US4 |
| FR-005 | AC5 | D6; R6 | US5 |
| FR-006 | AC6 | D1, D2, D10, D11, D12; R3, R5 | US6 |

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
| --- | --- | --- |
| 1. Component detail panel (HTML): content, close routes, focus return, positioned overlay | FR-001, FR-004 | RFC D2, D4, D5, D7 |
| 2. Placement logic: opposite side, 4 positions, both states, both zoom bands, unit tests + screenshots | FR-002 | RFC D3, R1, R2 |
| 3. Case-study panel: chrome control, story + metrics, scrollable, palette-styled, closable | FR-003 | RFC D9 |
| 4. Tech chips: display-only, registry label + token accent, list semantics, no hex | FR-004 | RFC D8 |
| 5. Tour interaction: jump-to-step / pause + panel / resume | FR-005 | RFC D6, R6 |
| 6. Motion + reduced motion: panel tokens, instant twin, no stage layout animation | FR-006 | RFC D10, R5 |
| 7. Evidence: light+dark × (4 positions, case study, chips, tour jump); CLS; interaction/keyboard log; tests | FR-001…FR-006 | RFC D11 |

Non-goals stay hard:
- no cross-project chip links or "also used in" (S14);
- no annotation/callout changes (S6 sealed in T001);
- no full a11y drill or screen-reader pass (S8);
- no site shell, landing or routes (S10);
- no real content (S9, fixtures only);
- no schema changes and no change to an existing API (additive optional props + new exports only, Q2);
- no camera/layout/explode changes (S4/S5);
- no pixel/papercraft theme, no DNS/Vercel changes, no analytics, no secrets.

### Key Entities

- **Panel state** (`src/panel/state.ts`): `{kind:'closed'} | {kind:'detail', componentId} | {kind:'caseStudy'}`. Events: `slab(hit)`, `outside`, `escape`, `closeControl`, `toggleCaseStudy`, `openCaseStudy`, `openDetail(id)`, `reset`.
- **Placement** (`src/panel/place.ts`): `placePanel({canvas:{width,height}, slab: Rect|null, kind, current?: {dock,size}, look}) → {dock:'left'|'right'|'top'|'bottom', rect: Rect, size, stage: 1|2|3|4}`. `Rect = {left, top, right, bottom}` in canvas CSS px.
- **Tour-click decision** (`src/panel/tourClick.ts`): `resolveSlabClick({hit, tour:{status, flowId, step}, flows, panel}) → {panelEvent, tour: null | {type:'jump', step, resume} | {type:'pause'}}`, plus `jumpSequence(step, resume)` → the ordered public action names.
- **Content models** (`src/panel/content.ts`): `DetailModel {id, name, meta:{kind,status}, summary?, description?, chips: ChipModel[], metrics: {label,value}[], links: {label,url}[]}` · `CaseStudyModel {name, tagline?, headline?, sections: {key:'problem'|'approach'|'outcome', title, body}[], metrics}` · `ChipModel {id, label, category?, colorRef?}`.
- **Panel look** (`src/panel/look.ts`): `insetPx 8, gapPx 8, wideMinPx 640, side {prefPx 320, prefFrac 0.42, minPx 240}, sheet {prefFrac 0.45, prefMaxPx 320, minPx 128}, compactMinPx 48, caseStudy {sidePx 448, sideFrac 0.5, sheetFrac 0.7, sheetMaxPx 480}`.
- **Panel handle** (`useViewerPanels`): `{state, actions:{openDetail, toggleCaseStudy, openCaseStudy, close}, ids:{caseStudy, detail}}`. New optional `TeardownViewerProps`: `panels?`, `registry?`.
- **Viewer DOM contract additions:**
  - on the wrapper: `data-xploder-panel="closed|detail|case-study"`, `data-xploder-panel-dock`, `data-xploder-panel-stage`, `data-xploder-panel-slab="l t r b"`, `data-xploder-panel-ready` (`true` once placed and the enter animation is finished or skipped);
  - `[data-xploder-panel-layer]`;
  - the surface `[data-xploder-panel-surface]` (+ `data-xploder-panel-exiting`), `[data-xploder-panel-close]`, `[data-xploder-chip="<techId>"]`.
- **Frozen manifests:** S2/S4 (base `53b2b2b`) and S5 (base `f31600e`) unchanged; **S6 `frozen-surface.s6.manifest.json` (base `0b2c678`, new in T001)**.
- **Evidence artifacts:** `engine-probe.json` (S4/S5/S6 checks + the S7 group), the screenshot matrix + meta, interaction/keyboard logs, CLS numbers, `fps.json` (tour), frozen-surface diff logs, the RFC measurement log.

## Success Criteria _(mandatory)_

Success = AC1–AC6 each pass, with evidence recorded in `evidence/` and in the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
| --- | --- | --- |
| FR-001 | AC1 | panel-state + panel-content + viewer-panels test logs · probe `panel-open-*`, `panel-close-*`, `panel-focus-return-*`, `panel-content-*` (mouse + touch) · interaction/keyboard log · detail screenshots |
| FR-002 | AC2 | panel-place matrix log (0 overlaps, stage histogram) · probe `panel-never-covers-<pos>-<state>-<palette>-<zoom>` (hit-map points ∩ panel = ∅, `elementFromPoint`) · 4 positions × light/dark screenshots + max-zoom top/bottom with a panel |
| FR-003 | AC3 | panel-content log (case-study model) · probe `case-study-*` (sections in order, scrollable, closes ×4 routes, both palettes) · case-study screenshots light/dark × mobile/desktop |
| FR-004 | AC4 | panel-content chip log · hex scanner log with non-vacuity · probe `chips-*` (labels, swatch = live token both palettes, display-only) · chips close-up light/dark |
| FR-005 | AC5 | panel-tour-click + viewer-panels test logs · probe tour log (jump playing, jump paused, not-in-flow pause + resume, Esc ×2) · tour-jump screenshots light/dark |
| FR-006 | AC6 | probe strict CLS (0 viewer-sourced entries; stage invariance) · `rm-panel-instant` · panel-motion log · motion scanner log · frozen-surface log (3 manifests) + S6 negative control + `git diff --stat` at G1 and G4 · `fps.json` (0 dropped, band liveness, `drawCalls = 2`) · `gh pr checks` |

## Assumptions

- All RFC §6 defaults are accepted, Q-TOUR = D6, and refinements R1–R7 apply (RFC §9). No new dependencies.
- `/dev/engine` is the only route that mounts the viewer (RFC F4). Visual evidence runs on the local fixture export (`pnpm build:fixtures` + `serve`). Lighthouse and weight on `/` remain no-regression gates.
- Push and draft PR are granted at the end of G2 (RFC §9.3). Nothing is pushed before then. Merge happens only on Murphy's "merge" (§9.4).
- Escalation: tier 1.5 (OpenRouter) is DORMANT and skipped with a record. After two tier-1 failures, the orchestrator pauses and reports with 5h usage, then executes personally on Murphy's go (RFC D13). Each phase group starts in a fresh 5h window; no new task starts at ≥ 85% of the 5h window.
