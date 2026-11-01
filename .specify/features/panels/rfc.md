# RFC — S07 Panels: Component Detail · Case Study · Tech Chips

**slice:** S07-panels · **status:** APPROVED at Gate 1 (2026-10-31): defaults accepted, self-review refinements R1–R7 applied (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-07-panels.md` (frozen brief v1) · **branch:** `task/s07-panels` · **base:** `3f06c8f` (brief freeze; S6 shipped at `0ce25ed` + fix `0b2c678`) · **date:** 2026-10-31

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§6).

---

## 1. Context (from the brief)

- **Mission:** give the teardown its **reading layer**: an HTML detail panel when a component slab is clicked or tapped, a case-study panel per project, and tech chips from the registry. This is the first slice where the product *informs* rather than only being explorable, and the first that consumes the story/data fields Murphy fills in S9.
- **Live from S6:** blueprint theme (token materials/edges, dimension lines, part-number callouts, title block when imploded), circuit-trace tour, product `explodedGap = 2.0` at the viewer level, 2 draw calls, zero overlay CLS.
- **Live from S5:** `viewer.highlight` + `actions.highlight(id)`; the tour player with caption beats; `TourCaption` (palette-styled HTML) plus a persistent `aria-live` region; pointer picks by `clientX/clientY`. Viewer DOM: wrapper (`tabIndex 0`) → stage (`overflow-y: auto`, pointer listeners) → sticky canvas viewport + scroll spacer. The caption is a sibling of the stage.
- **Motion tokens** already include `panelEnter` / `panelExit` (durations + easings) and `distances.panelOffset`. They are consumed, never invented.
- **Binding carry-over (Murphy, S5-G4):** click/tap a slab → details in an HTML panel; close via same-slab tap, `Esc`, or tapping elsewhere; **the panel never covers the selected slab**; zero CLS; reduced-motion twin.
- **Open question the brief asks this RFC to settle:** click during an active tour → in-flow: jump the tour to that step; not in flow: open the panel and pause. **Decided in D6, flagged for Murphy's confirmation (§6 Q-TOUR).**
- **Non-goals (hard):** cross-project chip links / "also used in" (S14) · annotation/callout changes (S6 frozen) · full a11y drill / screen-reader pass (S8) · site shell, landing, routes (S10) · real content (S9, fixtures only) · schema/API changes · camera/layout/explode changes (S4/S5 frozen) · pixel/papercraft theme.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | detail panel opens on click/tap with complete schema-driven content (name, role, chips with registry labels, metrics, links); closes via same-slab tap, `Esc`, outside tap, close control; state-machine tests green; focus returns to the viewer. |
| AC2 | panel never covers the selected slab — placement tests green for top/bottom/left/right slab positions × exploded/imploded × both palettes; screenshot evidence attached. |
| AC3 | case-study panel renders story sections + project metrics from schema, is scrollable, closes, and works in both palettes (screenshots). |
| AC4 | tech chips render from the registry with token-derived category accents; hex exclusivity grep green; chips are display-only (no navigation yet). |
| AC5 | tour-click behavior implemented exactly as decided in the RFC (recommended default: jump-to-step when in the active flow, else pause + panel); tests cover both branches; caption + highlight stay in sync after a jump. |
| AC6 | zero CLS from panel/chip overlays (measured); panel motion tokens only; reduced-motion instant twin; full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); frozen-surface checks for S2/S4/S5/S6 remain empty; 2 draw calls unchanged. |

### Starting point (checked on this branch at `3f06c8f`)

| Item | State |
|---|---|
| Schema (S2, frozen) | `ComponentSchema {id, name, summary?, description?, kind='module', status='shipped', techs=[], links=[], metrics=[]}` · `StorySchema {headline?, problem?, approach?, outcome?, metrics=[]}` · `MetaSchema {slug, name, tagline?, summary?, year?, role?, tags?, links=[]}` · `TechSchema {id, label, category, color = 'tech-<category>'}` (`color` ∈ `tech-*` or `accent`). **The brief's field contract differs from the code** (F1). |
| Theme (S2, frozen) | `blueprint.light/dark` with roles + `tech.<category>` (8 categories); `techColor(ref, palette)` resolves a registry `color` ref to a palette value. `useBlueprintPalette()` follows the `.light/.dark` class. |
| Motion (S2, frozen) | `durations.panelEnter 0.32`, `durations.panelExit 0.2`, `easings.panelEnter/panelExit {gsap, css}`, `distances.panelOffset 16`; `resolveMotion(true)` zeroes durations and distances (static twin). |
| Viewer handle (S5, **hash-sealed**) | `useTeardownViewer.ts`, `usePointerPick.ts`, `src/interaction/**`, `TourCaption.tsx`, `useTourClock.ts` are in `frozen-surface.s5.manifest.json`. The handle exposes `actions.{highlight, selectFlow, play, pause, stop, step, …}`. There is **no jump-to-step action** (F2). |
| Pointer (S5) | `usePointerPick` dispatches `tap` only for **non-mouse** pointers. A mouse click is not handled at all; mouse only hovers (F5). An outside `pointerdown` clears a touch highlight. |
| Escape (S5) | `useTeardownViewer` registers a `window` `keydown` listener (only while a tour is active or a layer is focused) that **skips events with `defaultPrevented`** (F6). |
| Keys (S4) | The wrapper's React `onKeyDown` maps `ArrowLeft/ArrowRight/+/-/0` to rig actions and calls `preventDefault`. Keys from any descendant bubble to it (F7). |
| Overlay (S6) | `OverlayProjector` emits `{kind:'moving'}` / `{kind:'settled', frame, width, height, offsetY}`. `frame.components[i].hull` is the convex hull of the slab's 8 projected corners in canvas px, **content space** (`+ offsetY`). Scroll offsets arrive via `onOverlayScroll(offsetY)`. Both are fanned out in `TeardownViewer.tsx`. Hover emphasis does **not** touch explode progress, so hover never emits `moving`. |
| Frozen guards | `frozen-surface.manifest.json` (S2+S4, base `53b2b2b`, 47 files) and `frozen-surface.s5.manifest.json` (base `f31600e`, 31 files). **There is no S6 seal** (F3). `TeardownViewer.tsx` and `react/index.ts` are not sealed: they are the composition root. |
| Production | `/` is the S1 palette page. **The viewer is mounted only on `/dev/engine`** (dev / fixture export; 404 in production). Every S7 visual is proven on the fixture export, as in S6 (F4). |
| Test env | xploder has **no `react-dom`/jsdom** (S6 Stage-2 correction 7.1). React DOM components cannot render in Node. Pure modules carry the logic and unit tests; DOM behaviour is proved by the browser probe (F8). |
| Fixture coverage | Full detail content (techs + metrics + links): A `tide-repository`, A `tide-feed`, B `reconciliation-ledger`. No techs: A `beachgoer`, B `partner-csv-drop`. C's `story` has **no metrics**. A has 2 flows, B 1, C 2. A test project already uses a **repeated id in a flow path** (`['request','request']`). |

### Environment facts checked 2026-10-31

| Item | Fact | Source |
|---|---|---|
| Node | v24.19.0 (`.nvmrc` 24) | local |
| Tier-1 executor | `codex` present (`/opt/homebrew/bin/codex`), DeepSeek Flash 4.1 profile as in S6 | local |
| Tier 1.5 | `OPENROUTER_API_KEY` **unset** → DORMANT, skip-with-record (Murphy 2026-10-30) | local env |
| Slab screen extents | Largest component bbox at **max zoom 3×**: ≤ **26% of viewer height** and ≤ 55% of width (B, 358×506). At 1×: ≤ 9% height | `evidence/RFC-log-slab-extent-sweep.txt` |
| Placement feasibility (prototype of D3) | A/B/C × 5 viewer sizes × 6 zoom notches × 4 azimuths × imploded/exploded × 9 scroll offsets × every component: **stage 1 (preferred size) or stage 2 (reduced ≥ min) in 100% of on-screen cases; 0 compact; 0 infeasible**. Only a synthetic 1-layer × 1-component project reaches the last-resort stage (68 cases, all at zoom ≥ 2.44 on 768×614 / 640×400) | same |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Module tree, package surface, frozen-surface guard (AC6)

**R:** Everything new goes into **new modules**. Sealed files stay byte-identical.

```
packages/xploder/src/panel/            (new, pure, Node-tested)
  state.ts      panel state machine (reducer + events)                       AC1
  place.ts      placement: slab rect → dock + rect, with the never-cover invariant  AC2
  tourClick.ts  slab-click decision during a tour + jump command sequence    AC5
  content.ts    view-models: detail, case study, chips (registry + palette refs)  AC1 AC3 AC4
  look.ts       panel layout constants (px/rem sizes, breakpoints; no motion, no colour)
  motion.ts     panel enter/exit keyframes + timings from MotionTokens (static twin)  AC6
packages/xploder/src/react/panel/      (new, thin DOM renderers, probe-proved)
  PanelLayer.tsx      owns the placed surface, Esc/outside listeners, focus return
  DetailPanel.tsx     component content
  CaseStudyPanel.tsx  story content
  TechChips.tsx       chip list
  useSlabClick.ts     stage click → pick (reuses interaction/pick.ts read-only)
  useViewerPanels.ts  panel handle (state + actions) for app chrome
```

- **Edited (not sealed):** `react/TeardownViewer.tsx` (composition root: mounts `<PanelLayer>`, fans the overlay events out, two optional props, see D9) · `react/index.ts` (new exports) · `apps/web/app/dev/engine/engine-playground.tsx` (registry prop, "Case study" chrome button, S7 URL params) · scanners in `apps/web/test/*` (S7 file lists) · `tools/perf` (new probe group, D11).
- **S6 seal first (T001):** `frozen-surface.s6.paths` + `frozen-surface.s6.manifest.json` + generator at base `0b2c678`, covering `src/look/**`, `src/overlay/**`, `react/overlay/BlueprintOverlay.tsx`, `react/overlay/CircuitTrace.tsx`, `react/scene/{OverlayProjector,Scene,Slabs}.tsx`, `react/scene/blueprintMaterial.ts`, and the S6 tests and snapshots. A new `describe('frozen S6 surface')` block, with a negative control (touch one sealed file → red, logged). That makes AC6's "frozen-surface checks for S2/S4/S5/S6 remain empty" a real, executable check.
- **Rejected:** adding a `jump` action to `tourReducer` or the handle (S5 sealed; D6 composes it from public actions) · putting the new pure modules in `src/interaction/` (it's an S5 directory; a new top-level `panel/` keeps seal boundaries obvious) · a new package subpath (`package.json` is in the S2 manifest).

### D2 — Panel DOM architecture vs the S5 stage/scroll structure (AC1, AC2, AC6)

```
wrapper  (tabIndex 0, role=group, position:relative, onKeyDown = S4 keys)
├─ stage  (overflow-y:auto, S5 pointer listeners + S7 click listener)
│  ├─ canvas viewport (sticky)  → <Canvas> + <BlueprintOverlay>
│  └─ scroll spacer
├─ TourCaptionLiveRegion / TourCaption   (S5, z-index 1)
└─ PanelLayer   (S7, NEW sibling of the stage, z-index 2)
   └─ surface  role=dialog aria-modal=false aria-labelledby=<heading id>
      └─ motion box (WAAPI enter/exit)  → DetailPanel | CaseStudyPanel
```

**R:**
- **A sibling of the stage, never a child.** The panel is outside the scrolling stage, so stage scroll never moves it, the stage's size and `scrollHeight` never change, and S5's pick listeners never see panel clicks. S5's outside-tap check (`stage.parentElement.contains(target)`) counts the panel as *inside* the viewer, so tapping the panel does not clear a touch highlight.
- **Positioned overlay, zero reflow** _(positioning superseded by R1, §9.2.1: CSS edge anchors + remount on dock change)_: `position:absolute; top:0; left:0`. The dock position is applied with **`transform: translate(x, y)` only**, never by changing `top/left/right/bottom`. The size is set with explicit `width` / `max-height`. Insertion is a new node, which is not a layout shift, and transform moves are not layout shifts. The stage is never resized, so there is no layout animation on it (brief deliverable 6).
- **Two boxes:** the outer *surface* owns the placement transform. The inner *motion box* owns the enter/exit animation (`opacity` + `translate` by `panelOffset`). The two transforms never fight.
- **Content keyed by `${kind}:${id}:${axis}`:** switching component, or switching between a side dock and a sheet (a width change), remounts the content subtree. New nodes are not shifts, so text reflow inside a resized panel cannot produce layout-shift entries (D11 CLS).
- **Scroll containment:** the content box is `overflow-y:auto; overscroll-behavior:contain`, so scrolling a long case study never chains to the page.
- **Canvas reachability (Hard Rule 5):** placement uses the canvas size reported by the projector (`event.width/height`), which excludes the stage's scrollbar, so a panel never sits on the scrollbar. The panel never covers the whole canvas (D3 sizes leave the slab's side free; the case study is capped, D8), so wheel/swipe scrolling at max zoom stays reachable. The probe proves top + bottom max-zoom scroll **with a panel open** (D11).

### D3 — Placement algorithm and the never-cover proof (AC2)

**Inputs (pure `placePanel`):** viewer canvas `W × H`; the selected slab's **visible rect** `S` = axis-aligned bbox of its settled hull, shifted by the current scroll offset (`y − offsetY`) and clipped to `[0,W]×[0,H]`; the panel kind; the current dock (for hysteresis); `look` constants.

**Constants (`panel/look.ts`, layout numbers only):** inset `8`, gap `8`; **side docks** (left/right) only when `W ≥ 640`, width `min(320, 0.42W)`, minimum `240`, full height minus insets; **sheets** (top/bottom) full width minus insets, height `min(0.45H, 320)`, minimum `128`; compact minimum `48`.

**Algorithm:**
1. If `S` is empty (slab scrolled fully off-screen): keep the current dock (nothing to cover).
2. Free space per side: `free.right = W − inset − (S.right + gap)`, `free.left = S.left − gap − inset`, `free.bottom = H − inset − (S.bottom + gap)`, `free.top = S.top − gap − inset`.
3. **Hysteresis** _(refined by R1: keep while `free ≥ current size`)_: if the current dock still has `free ≥ min`, keep it, sized `min(pref, free)`. Docks don't flip-flop while scrolling.
4. **Preference order:** wide (`W ≥ 640`): the side opposite the slab's centre x, then the other side, then the sheet opposite the slab's centre y, then the other sheet. Narrow: the sheet opposite the centre y, then the other sheet.
   - **Stage 1:** the first dock in that order with `free ≥ pref`.
   - **Stage 2:** the first dock with `free ≥ min`, sized to `free`.
   - **Stage 3:** the dock with the most free space if it is `≥ 48` (compact: header + scrolling body).
   - **Stage 4:** the dock with the most free space at any `free > 0` (cramped, still disjoint).
5. The result is `{dock, rect, stage}`. The wrapper exposes `data-xploder-panel="detail|case-study|closed"`, `data-xploder-panel-dock`, `data-xploder-panel-stage` and `data-xploder-panel-slab="l t r b"` as observables for the probe, and as input to the evidence CLI's `--wait-for`.

**Never-cover proof.**
- (i) Under orthographic projection, the silhouette of a box is the convex hull of its 8 projected corners. That is exactly `hull` (S6 projector), so silhouette ⊆ `S`.
- (ii) For the chosen dock `d`, the panel rect is sized `≤ free.d`, so it lies entirely in the closed half-plane beyond `S`'s edge plus `gap`. For example, `right` ⇒ `x ≥ S.right + gap`.
- (iii) `gap > 0` ⇒ that half-plane and `S` are disjoint. So panel ∩ silhouette = ∅, for every returned dock and every stage.
- (iv) **A dock always exists.** At zoom 1× the view has no offset, and the fit keeps the exploded drawing (which contains the imploded one) inside `[0.08H, 0.92H]` vertically. So `free.top ≥ 0.08H − 16 > 0` for any `H > 200 px`, and stage 4 at worst still returns a disjoint panel. At higher zoom, step 4 still returns the largest positive band. A slab whose visible rect fills the whole canvas on all four sides cannot occur at 1×. At > 1× it only occurs when the visible part of the slab spans the canvas, and the measured sweep never reaches it.
- **Readability (not disjointness)** is what the stages trade. The sweep shows fixtures A/B/C never leave stages 1–2 (the measured precondition).

**Geometry motion:** explode/implode, rotate, zoom and resize emit `moving` (hover does not). While moving, the panel is `visibility:hidden` and keeps its content. At `settled` it is re-placed and shown **without** replaying the enter animation. The invariant therefore holds in every painted frame, not only at rest. In practice this only happens through keyboard shortcuts or a resize while a panel is open, because clicking a chrome button is an outside tap and closes the panel first. **Scroll is not motion:** every `onOverlayScroll` re-runs `placePanel` (cheap, pure) and moves the surface by transform in the same frame.

**Rejected:**
- Anchoring the panel next to the slab (a popover): it covers neighbours, needs a collision search, and jumps with scroll.
- A fixed right dock always: it fails AC2 for right-hand slabs.
- Auto zoom-out or auto scroll as a fallback: a camera side effect (S4/S5 behaviour frozen), and §6 Q4 covers it as the alternative.
- Measuring the panel's content height in the DOM to size it: a measure-then-place loop risks a visible correction frame. Explicit sizes plus internal scroll are deterministic, as the S6 R1 approach was.

### D4 — Panel state machine (AC1)

**R:** a pure reducer in `panel/state.ts`. It holds no DOM refs and no timers.

```
State  = { kind:'closed' }
       | { kind:'detail', componentId }
       | { kind:'caseStudy' }
Event  = slab(hit: id|null)        // stage click/tap, after the D6 tour decision
       | outside                   // click outside the wrapper (not on the panel)
       | escape | closeControl
       | toggleCaseStudy | openCaseStudy
       | reset                     // project change
```

| From \ event | `slab(X)` | `slab(same id)` | `slab(null)` (empty stage) | `outside` / `escape` / `closeControl` | `toggleCaseStudy` |
|---|---|---|---|---|---|
| closed | detail X | — | closed | closed (escape **not consumed**) | caseStudy |
| detail A | detail X (switch) | **closed** (same-slab tap) | closed | closed | caseStudy |
| caseStudy | detail X | — | closed | closed | closed |

- **One panel at a time.** The case study and the detail panel are mutually exclusive, which keeps placement single-surface.
- **Outside tap** = a `click` on `document` whose target is outside the wrapper. `click`, not `pointerdown`: a touch pan or scroll produces no `click`, so swiping the page or the stage never closes the panel. Clicks inside the panel are ignored. Clicks on the caption (inside the wrapper, outside the stage) count as "elsewhere" and close it.
- **Highlight sync:** opening a detail panel calls `actions.highlight(id)` (program source). Closing it calls `actions.highlight(null)` only if the highlight is still that id. S5's hover can override this transiently (frozen behaviour). On touch, S5's own tap toggle already agrees with same-slab-tap-closes.
- **Executable check:** a table-driven reducer test covers every cell above plus `reset`, and an event-sequence test: open → switch → same-slab → reopen → Esc → outside → caseStudy toggle.

### D5 — Focus management and keyboard (AC1)

**R:**
- **Detail panel opened by pointer: focus does not move.** The wrapper is the focused element after a click inside it. The panel is the **next Tab stop** after the wrapper (DOM order), so keyboard users reach the close button and links with one Tab. Stealing focus on a mouse click would put a focus ring and a scroll jump into a pointer flow.
- **Case study opened from the chrome button:** focus moves to the panel heading (`tabIndex -1`, `focus({preventScroll:true})`), because the panel is far away in the DOM from the button.
- **Close → focus return (AC1).** On every close path (Esc, close control, same-slab tap, empty-stage tap, case-study toggle), the panel calls `wrapper.focus({preventScroll:true})`. For a detail panel this is always the case. For a case study it returns to the opener button if that is still connected, otherwise to the wrapper. For an **outside tap**, focus returns to the wrapper unless the user's tap focused another focusable element. The rule is "`document.activeElement` is `body`, null, or inside the viewer → wrapper", so we never steal focus from a control the user just pressed (§6 Q5).
- **Esc layering:** `PanelLayer` listens on `document` for `keydown` (it runs before S5's `window` listener). When a panel is open and the key is `Escape`: `preventDefault()` + close. S5's tour/focus Escape skips `defaultPrevented` events, so **the first Esc closes the panel and the second Esc stops the tour** (or releases layer focus). When no panel is open the event is untouched.
- **Key isolation:** the surface's `onKeyDown` calls `stopPropagation()` for every key except `Escape`. Arrow keys inside the panel scroll its content instead of rotating the camera through the wrapper's S4 handler.
- **Rejected:** a focus trap / `aria-modal=true`. The panel is non-modal by design: the canvas stays interactive, and tapping the canvas is a documented close path.

### D6 — Tour-click decision (AC5) — **flagged for Murphy's confirmation (§6 Q-TOUR)**

**R (= the brief's recommended default, made precise):** "active tour" = `viewer.tour.status !== 'idle'` (playing, paused or ended), the same predicate S5 uses to suspend layer focus and route Escape.

| Click on slab X during an active tour | Effect |
|---|---|
| X **is in the active flow's path** | **Jump the tour to X's step.** Highlight + caption follow the tour position. **Play state is preserved:** playing → keeps playing from X with a fresh beat; paused or ended → paused at X. An open detail panel closes (it was about another component). No panel opens: the caption is the reading surface. |
| X is **not** in the active flow | **Open the detail panel for X, and pause the tour** if it is playing (paused/ended stay as they are). The caption stays visible at its step under the panel (z-index 2 > 1). |
| empty stage (no hit) | Panel logic only (closes an open panel). The tour is untouched. |
| no active tour | Plain D4 behaviour. |

- **Repeated ids in a path:** jump to the first occurrence **after** the current step, otherwise the first occurrence overall (wrap). A click on the current step's component is therefore a no-op on the step but restarts its beat.
- **Resuming:** there is **no auto-resume** on panel close. The visitor presses Play. S5's `play` from `paused` keeps the step and the remaining beat, so "resuming continues from the current step" is S5's existing behaviour (§6 Q3).
- **Opening the case study pauses a playing tour**, by the same rule as the not-in-flow branch: a panel that hides part of the drawing pauses the guide.
- **Jump mechanics without touching the sealed reducer:** `tourClick.ts` returns a command. The viewer executes `jump(k, resume)` as public actions in **one event handler**: `stop()` → `step()` × (k+1) → `play()` if `resume`. React batches the dispatches, so the intermediate states never render. With the sealed reducer: `stop` → idle; the first `step` → paused at 0, anchor 0; each further `step` → +1, paused; `play` from paused → playing at k with `anchor = now − 0 = now` (a fresh beat). The caption is keyed by `flowId:step`, so it re-renders and re-announces once. The live region updates. The trace prefix grows to k (S6 `traceVertices(status, flow, step)`).
- **Executable checks:** (1) pure `resolveSlabClick` table test: both branches × playing/paused/ended × in/out of flow, repeated ids, the empty hit; (2) a sequence test through the real sealed `tourReducer`: after `jump(k, true)` → `{status:'playing', step:k}`, `positionAt(...).componentId === path[k]`; after a pause, `play` keeps the step; (3) a `viewer-handle` test-renderer test (the existing pattern) running the command against the real handle: `tour.step === k`, the status is preserved, `position.componentId === X`; (4) a probe interaction log on fixture A (D11): caption text "Step k+1 of n" + component name, `data-xploder-tour-step`, `data-xploder-trace` prefix, and the S5 tour-emphasis component all agree after a jump, and after one more beat they advance together.
- **Rejected:** locking slab clicks during a tour (the brief: "the tour is a guide, not a jail") · jumping *and* opening the panel (two reading surfaces for the same component) · stopping the tour on a not-in-flow click (it loses the visitor's place).

### D7 — Content view-models and the brief↔schema field map (AC1, AC3, AC4)

**R:** pure `panel/content.ts` turns a project + registry into render-ready models, so content completeness is unit-tested in Node. React only maps models to markup.

| Brief field | Schema field (S2, frozen) | Detail panel rendering |
|---|---|---|
| `name` | `component.name` | heading (`h2`, id for `aria-labelledby`) |
| `role` | `component.summary` (+ `description` as the body) | lede + paragraph |
| `kind`, `status` | `component.kind`, `component.status` | a mono meta line, e.g. `service · wip` |
| `tech?[]` | `component.techs` (registry ids) | `<TechChips>` (D8) |
| `metrics?[]` | `component.metrics` | `<dl>` label/value |
| `links?[]` | `component.links` | `<ul>` of `<a href target="_blank" rel="noopener noreferrer">`, with a visually hidden "(opens in a new tab)" |

- **Empty sections are omitted**, with no empty headings. Ids not in the registry (only possible without a registry, since `parseProject({registry})` rejects them) render as plain id chips without an accent.
- **Typing:** `TeardownViewer`'s prop stays `ViewerProject` (sealed, minimal). The panel reads the optional fields through a structural `PanelProjectInput` type (all fields optional), the same pattern `TeardownViewer` already uses for `kind`. Parsed `Project` objects satisfy it.

### D8 — Tech chips from the registry (AC4)

**R:** `chipModels(techIds, registry)` returns `{id, label, category, colorRef}` with `colorRef` = the registry's resolved `color` (default `tech-<category>`; `accent` allowed). The React side resolves the colour with the existing `techColor(colorRef, palette)` at render. **No hex anywhere in S7 code.** The hex scanner adds the S7 files to its explicit lists (non-vacuity, as in S6).

- **Markup:** `<ul aria-label="Tech">` → `<li>` per chip: a 0.5 rem accent swatch (`aria-hidden`, `background: techColor(...)`) + the label in `palette.ink` on `palette.surface`, a `1px` border in `palette.lineMuted`. **Text stays ink** for contrast in both palettes. The accent is the swatch plus a 2 px inline-start border.
- **Display-only:** `<li>` and `<span>`. No `<a>`, no `<button>`, no `tabIndex`, no `onClick`, no `role="link"`. The probe asserts that no chip element is focusable and none has a link role.
- **Rejected:** accent-coloured chip text (dark-palette accents fail contrast on `surface` for some categories; S8 will audit, so take the safe default now) · Tailwind classes inside xploder (the library styles from the palette object, like `TourCaption`).

### D9 — Case-study panel and the viewer-chrome control (AC3)

**R:**
- **Content (`caseStudyModel(project)`):** `meta.name` (heading) + `meta.tagline` → `story.headline` → **Problem → Approach → Outcome** sections (`h3` + paragraph, each only if present) → **Metrics** (`<dl>` of `story.metrics`, the project's metrics; omitted when empty, as in fixture C). **There is no `decisions` field in `StorySchema`** (F1, §6 Q1). The model is a section list, so a later schema revision adds Decisions with one entry.
- **Placement:** no slab to avoid. Wide: right dock, width `min(448, 0.5W)`, full height minus insets. Narrow: bottom sheet, height `min(0.7H, 480)`. Internal scroll (`overflow-y:auto`, `overscroll-behavior:contain`). At least 30% of the canvas always stays visible and interactive, so it **never blocks the canvas permanently**: it closes via the close control, Esc, the toggle button, or a tap on the visible canvas / outside.
- **Chrome control (additive API):** a new hook `useViewerPanels()` returns `{state, actions:{toggleCaseStudy, openCaseStudy, close}, ids:{caseStudy}}`. `TeardownViewer` gains two **optional** props: `panels?` (the handle; without it the viewer creates an internal one, so the detail panel works with zero app code) and `registry?: TechRegistry` (chip labels/categories). The playground's control bar gets a **"Case study"** button with `aria-expanded` + `aria-controls`. No existing prop, type or signature changes (§6 Q2).
- **Rejected:** a button drawn inside the canvas corner (it would collide with S6's title block / callout columns, which are frozen) · making the case study a route or a modal (S10 shell; a modal blocks the canvas).

### D10 — Motion and the reduced-motion twin (AC6)

**R:** `panel/motion.ts` derives everything from `MotionTokens` (the existing `resolveMotion(prefersReduced)`):
- **Enter:** WAAPI on the motion box, `opacity 0→1` + `translate` from `panelOffset` px toward the dock edge (right dock: +x; bottom sheet: +y; …) → 0, `durations.panelEnter`, `easings.panelEnter.css`.
- **Exit:** the reverse with `panelExit`. The surface stays mounted until `animation.finished`, then unmounts. A re-open during the exit cancels it.
- **Reduced motion:** the static twin has duration 0 and distance 0 ⇒ **no animation object is created** (as in S5's caption guard `duration <= 0`): instant show/hide. The probe checks `getAnimations().length === 0` right after opening under `prefers-reduced-motion: reduce`.
- Transform/opacity only (compositor-friendly). No CSS `transition` strings with literals. A `milliseconds()` helper with a named constant, as in S6's `overlay/timing.ts`. The motion-literal scanner gets the S7 files in its lists.

### D11 — Test and evidence strategy, including CLS measurement (AC1–AC6)

**Node (vitest, pure):**

| Suite | Proves |
|---|---|
| `panel-state.test.ts` | every transition in D4's table plus the sequences (AC1 "state-machine tests green") |
| `panel-place.test.ts` | **AC2 matrix:** for fixtures A/B/C, the slab that is topmost / bottommost / leftmost / rightmost on screen (by centre) × imploded/exploded × zoom bands {1×, 3× with scroll offsets} × 4 azimuths × viewer sizes {328×444, 358×506, 768×614, 1216×480}: the returned rect is disjoint from the slab's hull **polygon** (exact separating-axis test, not only the bbox) and inside the canvas; the dock is opposite as specified; the stage is ≤ 2 for fixtures; hysteresis is stable over a scroll sweep; synthetic worst cases are still disjoint (stages 3–4) |
| `panel-tour-click.test.ts` | D6 table + the jump sequence through the sealed `tourReducer`/`positionAt` |
| `panel-content.test.ts` | complete detail models for full-content components (name, role, chips with **registry labels**, metrics, links with `rel`); empty sections omitted; case-study section order; C has no metrics section |
| `panel-motion.test.ts` | timings/keyframes equal the tokens; the static twin gives 0/none |
| `viewer-panels.test.tsx` (test-renderer) | `useViewerPanels` + the jump command against the real `useTeardownViewer` handle |
| frozen-surface + scanners | S2/S4/S5/**S6** hashes unchanged; hex/motion scanners include the S7 files and their negative controls fire |

**Browser (`engine:probe`, new `s7-panels` group in a new `tools/perf/src/panel-probe.ts`):** the probe can't import xploder's TS (S6 G3 note), so it finds slabs **independently** by hit-map sweep (the existing S5 technique: hover a grid, read `data-xploder-highlight`). It picks the top/bottom/left/right slab from the hit-point centroids and clicks a hit point.

**Probe checks:**
- **AC2 in pixels, independent of `place.ts`:** every hit-map point of the selected slab lies outside the panel's `getBoundingClientRect()`, **and** `document.elementFromPoint` at each of those points is not inside the panel. Matrix: 4 positions × exploded/imploded × **light/dark** × zoom 1× and max zoom (top + bottom scroll).
- **AC1 interaction log:** open by click (mouse) and tap (touch context); same-slab close; Esc close; outside close; close-control close. After each close: `document.activeElement === wrapper`, and the panel content (name, chip labels, metrics, link `rel`) matches the fixture JSON.
- **AC3:** open the case study from the chrome button; the sections are present in order; `scrollHeight > clientHeight` on a narrow viewer and `scrollTop` changes after a wheel/touch scroll; closes; light + dark.
- **AC4:** chip labels = registry labels; chip swatch colours = the live `--bp-tech-<category>` value (relational, as in S6 G3); no chip descendant is focusable or a link.
- **AC5 tour log:** A `live-update` playing → click `tide-repository` (step 3) → still playing, step 3, caption "Step 4 of 6 · Tide repository", trace prefix of 4, tour emphasis on it; one beat later all advance to step 4 together. Click `forecast-details-panel` (not in flow) → paused, panel open; Play → resumes at the same step.
- **AC6 CLS (measured):** a `PerformanceObserver({type:'layout-shift', buffered:true})` installed before load. Over the scripted panel scenario (open, switch, dock flip by scrolling at max zoom, case study open/scroll/close, Esc) the report gives (a) the **total of all entries including `hadRecentInput`** (strict) **= 0**, and (b) entries whose sources lie inside the panel/chips = 0. Stage rect and `scrollHeight` are unchanged across open/close (no stage reflow). Reduced-motion: `getAnimations().length === 0` after open. Draw calls = 2 with a panel open.
- **Hard Rule 5:** top + bottom max-zoom screenshots with a detail panel open (re-placed, slab uncovered).

**Evidence files (`.specify/features/panels/evidence/`, per EVIDENCE.md):**
- detail panel × 4 positions × light/dark (desktop for left/right, mobile for top/bottom, plus mobile left/right showing sheets)
- case study light/dark × mobile/desktop
- chips close-up light/dark
- tour-jump state light/dark
- max-zoom top/bottom with a panel
- `engine-probe.json`
- `T0xx-log-*.txt` interaction/keyboard logs
- CLS numbers
- `fps.json` for the unchanged S5 tour scenario: **0 dropped frames over ≥ 5 s**, fps band as liveness only, `drawCalls = 2`
- frozen-surface diff log
- the CI run URL

### D12 — Performance budget (AC6)

The panels are DOM only: no new meshes, materials, textures or fonts. 2 draw calls is structural. The bundle cost is confined to `/dev/engine` (the viewer is not on `/`), so the Lighthouse/weight gates on `/` are unaffected by construction and still run. The S5 tour FPS gate stays in dropped-frames style. **No fps threshold is written anywhere** (Hard Rule 4).

### D13 — Execution ladder (Hard Rule 7)

Tier 1 = DeepSeek Flash 4.1 via `codex` (browser tasks run with the sandbox off, per the S3 note). If Flash is stuck ×2 on a task → **pause + report usage to Murphy**, then the orchestrator executes personally on Murphy's go (S6 Q9 reading). Tier 1.5 is dormant (no `OPENROUTER_API_KEY`), skip-with-record. Each task records the tier that finished it.

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories:**
- **P1 — Visitor learns what a part is.** Click or tap a slab; a panel slides in on the far side and shows its name, what it does, its tech, its numbers and its links. Tap it again, press Esc, tap elsewhere or press ✕ to close, and you're back where you were. → AC1
- **P1 — The panel never hides what you picked.** Wherever the slab sits (top, bottom, left, right; open or closed stack; zoomed or not; light or dark), the panel docks on the opposite side. → AC2
- **P1 — Visitor reads the story.** A "Case study" control opens the project's problem → approach → outcome and its metrics in a scrollable, closable panel that leaves the drawing in view. → AC3
- **P2 — Tech at a glance.** Chips name the technologies with their category colour, in both themes; they don't navigate yet. → AC4
- **P2 — Tour stays a guide.** Clicking a part on the route jumps the tour there; clicking a part off the route pauses the tour and explains that part; Play continues where it stopped. → AC5
- **P2 — Reviewer trusts it.** Nothing jumps (CLS 0), motion comes only from tokens with an instant reduced-motion twin, frozen surfaces stay untouched, 2 draw calls, full CI green. → AC6

**FR mapping rule:** FR-001 ↔ AC1 … FR-006 ↔ AC6, one to one. D1–D13 are supporting requirements under the FR whose AC they serve. **No new acceptance criteria are invented.** Layout constants (`look.ts`) and the stage ladder are documented values, not new ACs.

**plan.md inputs:** D1–D12. Data flow:
- stage `click` → `useSlabClick` (pick via the S6 pick bridge + `interaction/pick.ts`) → `resolveSlabClick` (tour decision) → tour command (public actions) + `panelReducer`
- `OverlayProjector` settled/scroll events (fan-out in `TeardownViewer`) → `placePanel` → surface transform
- `content.ts` (project + registry) → `DetailPanel` / `CaseStudyPanel` / `TechChips` (palette roles + `techColor`)
- `panel/motion.ts` (MotionTokens) → WAAPI on the motion box

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Task (one integration seam) | Executable check | AC |
|---|---|---|---|
| T1 | S6 seal: paths + manifest + generator (base `0b2c678`) + `frozen S6 surface` test + negative control | `pnpm --filter xploder test frozen-surface` green; one-byte touch of a sealed S6 file → red (log) | AC6 |
| T2 | `panel/state.ts` reducer | `pnpm --filter xploder test panel-state` green (every D4 cell) | AC1 |
| T3 | `panel/look.ts` + `panel/place.ts` + AC2 matrix test (incl. the synthetic worst cases) | `pnpm --filter xploder test panel-place` green: 0 overlaps (polygon SAT), all inside the canvas, fixtures at stage ≤ 2 | AC2 |
| T4 | `panel/tourClick.ts` (decision + jump command) | `pnpm --filter xploder test panel-tour-click` green, both branches, through the sealed `tourReducer` | AC5 |
| T5 | `panel/content.ts` (detail, case study, chips) | `pnpm --filter xploder test panel-content` green on fixtures A/B/C + registry | AC1 AC3 AC4 |
| T6 | `panel/motion.ts` (token keyframes, static twin) | `pnpm --filter xploder test panel-motion` green | AC6 |
| T7 | `useSlabClick` + `useViewerPanels` + a test-renderer test with the real handle (jump/pause) | `pnpm --filter xploder test viewer-panels` green; S5 suites untouched and green | AC1 AC5 |
| T8 | `PanelLayer` + `DetailPanel` + `TechChips` (surface, placement transform, Esc/outside/focus, moving→hidden) wired into `TeardownViewer` (+ `registry`/`panels` props, overlay fan-out) | typecheck/lint/test green; `pnpm dev` smoke screenshot (light, desktop + mobile) | AC1 AC2 AC4 |
| T9 | `CaseStudyPanel` + playground "Case study" button + `registry` prop + S7 URL params (`?panel=`, `?select=`) | typecheck/lint/test green; `pnpm dev` smoke screenshot light + dark | AC3 |
| T10 | Scanner upkeep (hex/motion lists incl. S7 files; package-consumer identifiers; exports test) | each scanner green; negative controls fire | AC4 AC6 |
| T11 | Probe `s7-panels` group (hit-map slab finder, AC1–AC6 checks, CLS observer) | `tools/perf` unit tests green; `pnpm engine:probe --help` exits 0 | AC1–AC6 |
| T12 | Probe evidence run (normal + reduced motion) on the fixture export, all S4/S5/S6/S7 checks incl. the AC7 zoom-scroll | `engine-probe.json` all pass, exit 0; committed | AC1 AC2 AC4 AC5 AC6 |
| T13 | Screenshot matrix (4 positions × 2 palettes, case study, chips, tour jump, max-zoom top/bottom) | files committed per the naming rule; evidence exit 0 | AC2 AC3 AC4 AC5 |
| T14 | FPS (tour, unchanged scenario) + draw calls + CLS numbers | `fps.json`: 0 dropped over ≥ 5 s, band liveness, `drawCalls = 2`; CLS strict total 0 | AC6 |
| T15 | Push + PR, full CI, AC1–AC6 self-check table + frozen-surface diff | all CI checks green on the PR; `evidence/AC-selfcheck.md` | AC6 (all) |

**Order:** T1 → (T2 ∥ T3 ∥ T4 ∥ T5 ∥ T6) → T7 → T8 → T9 → T10 → T11 → (T12 ∥ T13 ∥ T14) → T15.

**Phase groups (Stage 3 STOP points):**
- **G1 pure core:** T1–T6 → STOP
- **G2 renderers + wiring + playground:** T7–T10 → STOP (Murphy clicks through in Orca's browser; panel look and sizing get tuned here)
- **G3 evidence:** T11–T14 → STOP
- **G4 ship:** T15 → STOP + AC self-check table

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| A layout-shift entry from panel content reflow (text wrap when the dock changes width) | content keyed by kind/id/axis (D2); the strict probe total includes `hadRecentInput` entries |
| Mouse-click + touch-tap double handling (S5 `tap` + S7 `click` on the same event) | the S7 handler only drives the panel/tour. S5's tap only drives the highlight, and both agree on same-slab-closes (D4). The probe covers both a mouse and a touch context |
| Esc order regression (the panel listener running after S5's window listener) | `document` listener (it bubbles before `window`) + `defaultPrevented`; the probe logs Esc ×2 during a tour: panel closed, then tour stopped |
| The jump sequence renders an intermediate idle state (caption flash) | all dispatches in one handler (React batching); the probe samples the caption per rAF during a jump: 0 frames without a caption |
| Flash executor fighting the sealed files | T1 seals S6 first; every task brief lists the sealed paths; the frozen-surface test runs in every task check |
| The dark-palette chip swatch is too faint on `surface` | the swatch is not text (no contrast AC); judged on G2 screenshots; tokens are S2-frozen anyway |
| Panel and caption overlap (the not-in-flow branch) | accepted: the panel stacks above (z 2 > 1), the caption remains readable once the panel closes; noted in §6 Q6 |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (facts, no decision needed):**
- **F1:** The brief's field names differ from the frozen schema: `role` → `summary` (+ `description`), `tech[]` → `techs[]`, and **`story.decisions` does not exist**. The schema is S2-frozen and "no schema/API changes" is a hard non-goal. → Q1.
- **F2:** The S5 handle has no jump action and is sealed. → D6 composes the jump from public actions.
- **F3:** There is no S6 frozen guard yet. → T1 seals it.
- **F4:** The viewer exists only on `/dev/engine`. → evidence runs on the fixture export, as in S6.
- **F5:** A mouse click is unhandled by S5. → new `useSlabClick` listener.
- **F6/F7:** S5 Esc honours `defaultPrevented`; the S4 keys bubble from descendants. → D5 layering + key isolation.
- **F8:** xploder has no DOM test env. → logic in pure modules, DOM proved by the probe.

**Open questions:**

**Q-TOUR (the brief's Gate-1 question).** Click during an active tour: **in the active flow → jump the tour to that step** (highlight + caption follow, play state preserved: playing keeps playing); **not in the flow → open the detail panel + pause the tour**; Play resumes from the current step; no auto-resume on close. → **Default: accept D6 as written.**
- Variant A: a paused tour + in-flow click also opens the panel.
- Variant B: closing the panel auto-resumes.

**Q1 — `story.decisions`.** It is not in the frozen schema. → **Default:** render Problem → Approach → Outcome + Metrics from the schema now (that satisfies AC3, "story sections + project metrics from schema"). Decisions is a one-line addition when a schema revision adds the field (S9 content work or a logged revision). Alternative: a schema revision now (it costs one of the brief's 2 revisions and breaks the S2 seal).

**Q2 — Additive viewer API.** `TeardownViewer` gets optional `registry?` and `panels?` props, plus a new `useViewerPanels()` hook. Nothing existing changes. I read "no schema/API changes" as no changes to the schema or to existing API. Chips can't get registry labels without passing the registry in. → **Default: accept additive-only.**

**Q3 — Auto-resume.** Should closing a not-in-flow panel auto-resume the tour? → **Default: no.** Explicit Play, which matches "resuming continues from the current step".

**Q4 — Last-resort placement.** When no dock reaches the 48 px compact size (never for A/B/C; only for a 1-layer × 1-component project at zoom ≥ 2.44) → **Default:** dock in the largest positive band (cramped but still non-covering), with no camera side effect. Alternative: auto zoom-out one notch.

**Q5 — Focus after an outside tap.** → **Default:** return to the wrapper unless the tap itself focused another control (never steal the user's chosen focus). Alternative: always the wrapper.

**Q6 — Caption under the panel** (not-in-flow branch). → **Default:** the panel stacks above the caption, with no avoidance logic. Alternative: treat the caption as a soft obstacle in placement.

**Q7 — Detail-panel focus on open.** → **Default:** don't move focus on a pointer open (the panel is the next Tab stop); the case study moves focus to its heading. Alternative: always move focus into the panel.

**Q8 — Panel sizes** (side 320 / min 240 at ≥ 640 px; sheets 45% / min 128; case study 448 or 70%). → **Default: accept**, and tune at G2 in Orca's browser.

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. **Q-TOUR:** jump-to-step when the clicked part is in the active flow (play state preserved), else pause + panel; explicit Play to resume (default: accept).
2. The never-cover approach in D3: opposite-side docking, side docks only ≥ 640 px wide, sheets on phones, hidden during geometry motion, re-placed on scroll (default: accept; judged visually at G2).
3. Q1: the case study ships without a "Decisions" section because the schema has no such field (default: accept).
4. Q2: two optional `TeardownViewer` props + `useViewerPanels()`, with the "Case study" button in the playground's control bar (default: accept).
5. The phase groups in §4, with G2 as the click-through/tuning gate in Orca's browser (default: accept).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to Q-TOUR and Q1–Q8, or "defaults" (default: all defaults).
2. The ladder reading in D13: pause + usage report after two Flash failures, then the orchestrator executes personally on your go (default: as in S6).
3. Push permission: push `task/s07-panels` and open a draft PR at the end of G2, as in S06 (default: granted at G2; nothing is pushed in Stages 1–2).
4. Merge: the orchestrator merges only after you say "merge" (default: as before).
5. Usage pacing: start each Stage 3 group in a fresh 5h window and stop at ≥ 85% (default; please keep stating "5h: N%" in gate messages).

---

## 9. Decisions recorded (Murphy, 2026-10-31, Gate 1)

1. **WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1): all accepted**, including **Q-TOUR = D6 as written**: jump-to-step when the clicked part is in the active flow (play state preserved), else pause + detail panel; explicit Play resumes from the current step.
2. **Q1–Q8: defaults.** Murphy approved improvements found by the orchestrator ("if you can find better, approved to be implemented"). The self-review while writing `plan.md` against the code produced the refinements below. **None changes an AC or a default answer.**
   1. **R1 — Dock anchoring by CSS edges and remount on dock change** (replaces the transform-positioning line of D2). Each mounted surface uses its dock's natural anchors: right = `top/right: inset`; bottom = `bottom/left/right: inset`; and so on. It has a fixed `width` (side) or `max-height` (sheet) for its whole life. The surface is keyed `${kind}:${id}:${dock}:${size}`, so a dock or size change is a **new element**, and a new element is not a layout shift. No property that moves a mounted surface's start point ever changes. Hysteresis (D3 step 3) therefore becomes "keep the current dock while `free ≥ current size`", otherwise re-dock (D3 steps 4–5). The actual box is ⊆ the allocated rect, so the never-cover proof is unchanged. A sheet with short content simply hugs its edge. This is simpler than transform positioning and removes the measure/translate path entirely.
   2. **R2 — gap vs S5 hover lift.** S5's emphasis lifts a highlighted slab by `distances.hoverLift` (4 px) without changing explode progress, so the hull does not include the lift. The placement gap must exceed it: `look.gap ≥ 2 × motion.distances.hoverLift` is asserted in `panel-place.test.ts`. With gap 8 and lift 4, a lifted slab still never touches the panel.
   3. **R3 — CLS criterion made precise** (D11). The **strict** measure is: zero `layout-shift` entries, counted **including** `hadRecentInput`, with any source inside the viewer wrapper (stage, overlay, caption, panel, chips) over the whole panel scenario. The page-wide total is reported too. Playground chrome text (the stats `<dl>`) can shift outside the viewer, and such entries are listed separately and attributed. The probe also asserts that the stage's rect and `scrollHeight` are identical before, during and after every open/close.
   4. **R4 — deterministic programmatic open for evidence.** `useViewerPanels().actions.openDetail(id)` (it bypasses the tour decision; it is for app chrome and evidence), plus the playground URL params `?select=<componentId>` and `?panel=case-study`. `pnpm evidence --wait-for '[data-xploder-panel-ready="true"]'` can then shoot any panel state without clicking.
   5. **R5 — switch vs close motion** (D10). Switching A → B (or a re-dock) mounts the new surface with `panelEnter`, and the old one unmounts at once (never two panels). Only a real close plays `panelExit`. During the exit the surface has `pointer-events:none` and is marked `data-xploder-panel-exiting`.
   6. **R6 — lifecycle wiring in `TeardownViewer`.** A project change resets the panels (layout effect keyed by `project.meta.slug`; the handle may live in the app). Opening the case study pauses a playing tour through a layout effect on the panel-state transition, because the panel handle does not own the viewer. The pause, jump and reset all go through the public viewer actions only.
   7. **R7 — pick helper.** `usePointerPick`'s `pickAt` is private to a sealed file. S7 adds `react/panel/pickAt.ts`, which duplicates its ~25 lines (bridge camera/progress → `Raycaster` → `interaction/pick.ts`). `pick.ts` itself is imported read-only. `viewer-panels.test.tsx` cross-checks both on the same ray via the existing `pick-scene` fixture approach.
3. **Push + draft PR: granted at the end of G2.** Nothing is pushed before then.
4. **Merge:** only on Murphy's "merge".
5. Usage at this gate: **5h 0%** (Murphy).
6. **Gate 1 → Stage 3 records:** G1 approved (2026-11-01, 5h 23%). G2 delivered T007–T010; draft PR #12.
7. **G2 feedback (Murphy, 2026-11-01, 5h 52% → 60%): part indices when zoomed.**
   1. **Bug (S6, found by Murphy):** when zoomed in, some components show no index. Cause (measured): S6 places labels only at settle and drops any label whose anchor is off-screen at that moment. Scroll then only translates the overlay (S6 D6 "scroll is not a relayout"), so parts scrolled into view keep no index (fixture C: 13/13 at 1×, 8/13 at 3×). S6 layer labels share the cause.
   2. **Style:** Murphy dislikes the pill "tags" on the slabs. The options were A (isometric lettering on the top face), B (drafting part mark) and C (spotlight only), with a mockup. **Murphy chose A** ("it matches our isometric exploded view").
   3. **Route 1 chosen:** the S6 files stay sealed, so AC6's "frozen-surface checks … remain empty" still holds. A new S7 module `src/lettering/` (pure) plus `react/lettering/PartLettering.tsx` draws the lettering from the live camera at settle. The viewer hides S6's part tags through the S6 public DOM contract (`[data-xploder-callouts="tags"] [data-xploder-label^="part:"]`). It crosses the brief non-goal "no annotation/callout changes", so **Murphy logs it as revision 1 of 2 in the vault**. No AC is reworded.
   4. **Zoomed-out style (orchestrator recommendation, judged at the G2 walkthrough):** lettering is the single rule for part numbers whenever the stack is exploded and settled with no tour, at every zoom and width. The number is always shown; the name is added when the face is large enough. On a phone this replaces the pills. On desktop at default zoom the number is lettered on the face, and S6's callout columns stay as the margin parts list (item number on the part + parts list = drafting convention). Desktop zoomed falls back to tags in S6, so lettering takes over there.
   5. **Rules:**
      - **Lettering placement:** the text runs along the face edge that points most to the right on screen; the second axis keeps the text unmirrored.
      - **Size:** S6 R1 monospace box model; number font 9–16 px, name ≥ 8 px, uppercase via CSS.
      - **Occlusion:** a candidate position is valid only if its screen quad avoids every hull and plate of upper layers (convex SAT). Fallback order: number only → smaller font → a B-style mark off the front corner.
      - **No culling:** every component is lettered, and the layer translates with scroll exactly like the S6 overlay, so an index can never be missing.
      - **Matches S6 overlay states:** hidden while moving, during a tour, and when imploded; it fades on S6's overlay timing; it dims under layer focus; the highlighted part uses `callouts.emphasisRole`.
      - **Input and selection:** the text is selectable and sits inside the stage, so S5/S7 picks still work, since they use coordinates.
   6. **Layer labels** have the same culling bug. They are assessed after T010a (lettering on the plate rim if it fits ≥ 9 px), as T010b, and judged at G2.
8. **G2 feedback round 2 (Murphy, 2026-11-01, 5h 71%):**
   1. "All isometric labels should face the same direction, bottom-right or bottom-left, also when rotating." → T010c: the lettering baseline is always the face axis running toward the bottom-right (`LETTERING_LOOK.baseline = 'down-right'`; `'down-left'` is available as a one-line switch). Smoke: 16/16 rotation × zoom × width states share u = (0.866, 0.5).
   2. "On phone, in all modes, use the zoomed-in desktop style (number + name on the face)." → names now wrap at spaces (up to 3 lines). **Measured constraint:** at phone 1× a top face is 28–36 px across, so no name fits on a face at a legible ≥ 8 px. Names appear on every part from zoom ≈ 1.95× (A) and 2.44× (C). The options for zoomed-out phones went back to Murphy.
9. **G2 feedback round 3 (Murphy, 2026-11-01):** the desktop lettering was accepted. For the zoomed-out phone, Murphy asked for "a column on the right side, similar to computer mode but smaller". **Measured:** 76–98 px are free right of the drawing at phone 1×. → T010d: a compact parts column (9 px mono, names wrap to 2 lines; very long lines are condensed horizontally, as accepted by Murphy) appears only at 1× in S6 tags mode; the faces then show numbers only. When zoomed there is no room and the names go back onto the faces. T010b ("inside G2", Murphy): layers are lettered in isometric on the plate's front edge, sliding along it to stay on screen. S6's layer label is hidden only for layers whose plate lettering succeeded, so S6's collision-free label remains the fallback. Usage pause at 5h ≥ 79%; resumed in a fresh window.
