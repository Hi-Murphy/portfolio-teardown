# Implementation Plan: S07 Panels (Component Detail · Case Study · Tech Chips)

**Feature dir:** `.specify/features/panels/` · **Branch:** `task/s07-panels` · **Date:** 2026-10-31 · **Inputs:** `spec.md`, `rfc.md` (approved; Q-TOUR = D6; refinements R1–R7 in §9)

## Summary

`packages/xploder` gains a reading layer as **new modules**:
- **Pure logic in `src/panel/`:**
  - the state machine;
  - placement with the never-cover proof;
  - the tour-click decision and jump sequence;
  - the content view-models;
  - the layout constants;
  - motion timings.
- **Thin DOM renderers in `src/react/panel/`:**
  - `PanelLayer` (surface, dock anchoring, Esc/outside/focus, hide-while-moving);
  - `DetailPanel`, `CaseStudyPanel` and `TechChips`;
  - `useSlabClick` (stage click → pick);
  - `useViewerPanels` (the panel handle for app chrome);
  - `pickAt` (R7).

`TeardownViewer.tsx` (the composition root, unsealed) changes **additively**:
- two optional props, `panels?` and `registry?`;
- the overlay-event fan-out to the panel layer;
- the wrapper data attributes;
- the tour-command executor and the lifecycle effects (R6).

Every sealed file stays byte-identical: S2/S4 (`53b2b2b`), S5 (`f31600e`) and **S6 (`0b2c678`, sealed by T001)**. `apps/web`'s playground gets the registry prop, a "Case study" chrome button and the S7 URL params. `tools/perf` gains an `s7` probe scope. Rendering stays at **2 draw calls**, because the panels are DOM.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict (`noUncheckedIndexedAccess`), React 19.3, Next 16.4 static export, Node 24 |
| New deps | **None.** No `react-dom` in xploder (S6 §9.7.1): DOM components are proved in the browser by the probe |
| Tests | vitest (Node): pure modules + `@react-three/test-renderer` for hooks against the real viewer handle. Real browser: `engine:probe --scope s7`, `evidence`, `fps:engine` (Playwright) |
| Targets | 0 overlaps (polygon) in the placement matrix; fixtures at stage ≤ 2; 0 viewer-sourced layout-shift entries (strict); `getAnimations()` empty under reduced motion; 2 draw calls; 0 dropped frames over ≥ 5 s in the tour FPS scenario (band liveness) |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`; the S2/S4, S5 and S6 surfaces under "Guards" |
| Time base | S5's `now()` in seconds (`performance.now()/1000`); tour actions take `now` internally |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-006 quote AC1–AC6 verbatim. Supporting work maps to brief deliverables 1–7 only. No chip navigation, no annotation change, no schema change, no camera/layout change, no a11y drill. |
| II. Static-only shell | No server code. Panels are client DOM inside the dev-only playground route. External links are plain anchors. |
| III. Performance is a feature | No WebGL object; no new asset or font; placement is O(1) per settle/scroll event; no per-frame DOM writes (scroll re-placement writes only when the dock or size changes, R1); WAAPI on opacity/transform only. |
| IV. Single motion source | Panel enter/exit from `durations.panelEnter/panelExit`, `easings.panelEnter/panelExit.css`, `distances.panelOffset`; static twin via `resolveMotion(true)`. `panel/look.ts` holds no timing. Scanners cover every new file (non-vacuity). |
| V. Theme integrity | Surface/text/border/chip colours are palette roles and `techColor(ref, palette)`. No hex outside `theme/`; one code path for both palettes. |

## Project Structure

### Documentation (this feature)

```
.specify/features/panels/
├── rfc.md · spec.md · plan.md · tasks.md
└── evidence/   RFC-log-*, T0NN-*, AC-selfcheck.md
```

### Source code (changes only)

```
packages/xploder/
├── src/panel/                         NEW (pure)
│   ├── state.ts        panelReducer, PanelState, PanelEvent
│   ├── place.ts        placePanel, Rect, Dock, rectOfHull, visibleSlabRect
│   ├── tourClick.ts    resolveSlabClick, jumpSequence, stepForComponent
│   ├── content.ts      detailModel, caseStudyModel, chipModels, PanelProjectInput
│   ├── look.ts         PANEL_LOOK (layout constants only)
│   └── motion.ts       panelMotion(tokens, dock, phase) → keyframes + timing
├── src/react/panel/                   NEW (DOM, probe-proved)
│   ├── PanelLayer.tsx  surface lifecycle, dock anchoring, listeners, focus, moving→hidden
│   ├── DetailPanel.tsx · CaseStudyPanel.tsx · TechChips.tsx
│   ├── useSlabClick.ts stage 'click' → pickAt → onSlabClick(hit)
│   ├── useViewerPanels.ts  panel handle (useReducer over panelReducer)
│   └── pickAt.ts       R7 duplicate of the sealed private picker
├── src/react/TeardownViewer.tsx       EDIT (additive: props, fan-out, attrs, executor)
├── src/react/index.ts                 EDIT (export useViewerPanels + types)
└── test/
    ├── frozen-surface.s6.paths · frozen-surface.s6.manifest.json · frozen-surface.generate-s6.sh   NEW
    ├── frozen-surface.test.ts         EDIT (append S6 describe)
    └── panel-{state,place,tour-click,content,motion}.test.ts · viewer-panels.test.tsx   NEW
apps/web/
├── app/dev/engine/engine-playground.tsx   EDIT (registry, panels, Case study button, URL params)
└── test/{no-color-literals,no-motion-literals,package-consumer}.test.ts   EDIT (S7 file lists / identifiers)
tools/perf/
├── src/panel-probe.ts                 NEW (S7 checks: pure evaluators + page drivers)
├── src/cli/engine-probe.ts            EDIT (--scope s7, wire group)
└── test/panel-probe.test.ts           NEW (evaluator unit tests)
```

## Guards (every task)

```sh
git diff --quiet 3f06c8f -- .specify/slices .specify/KICKOFF-S07.md && echo FROZEN-OK
git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK
git diff --quiet 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) && echo SURFACE-S6-OK   # from T001 on
test -z "$(git log --oneline 3f06c8f..HEAD -- .specify/slices .specify/KICKOFF-S07.md)" && echo BRIEF-HISTORY-OK
```

**S6 frozen surface** (`frozen-surface.s6.paths`, base `0b2c678`; directories expand at generation time):
- sources: `src/look/` · `src/overlay/` · `src/react/overlay/BlueprintOverlay.tsx` · `src/react/overlay/CircuitTrace.tsx` · `src/react/scene/OverlayProjector.tsx` · `src/react/scene/Scene.tsx` · `src/react/scene/Slabs.tsx` · `src/react/scene/blueprintMaterial.ts`
- tests: `test/{blueprint-scene,overlay-projector}.test.tsx` · `test/{look-fills,look-tokens,overlay-columns,overlay-dimension,overlay-model,overlay-parts,overlay-place,overlay-project,overlay-timing,overlay-titleblock,overlay-trace,product-gap}.test.ts`

**Excluded mount points** (S7 edits these additively): `TeardownViewer.tsx`, `react/index.ts`, `test/frozen-surface.*`. The S5 list is unchanged (see `frozen-surface.s5.paths`).

Before every gate, the orchestrator runs the five guard lines above and expects every OK.

## Panel state machine (`src/panel/state.ts`) — RFC D4

```ts
export type PanelState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'detail'; readonly componentId: string }
  | { readonly kind: 'caseStudy' };
export type PanelEvent =
  | { type: 'slab'; hit: string | null }
  | { type: 'openDetail'; id: string }          // R4 programmatic
  | { type: 'outside' } | { type: 'escape' } | { type: 'closeControl' }
  | { type: 'toggleCaseStudy' } | { type: 'openCaseStudy' } | { type: 'reset' };
export const CLOSED: PanelState;
export function panelReducer(state: PanelState, event: PanelEvent): PanelState;
export function consumesEscape(state: PanelState): boolean;   // state.kind !== 'closed'
```

Transitions exactly as in the RFC D4 table. `slab(hit)` with `hit === state.componentId` → closed. `openDetail(id)` always → `detail id`. Identity is preserved when nothing changes (`closed` + `escape` returns the same object), so React skips re-renders.

## Placement (`src/panel/place.ts`, `src/panel/look.ts`) — RFC D3, R1, R2

```ts
export interface Rect { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
export type Dock = 'left' | 'right' | 'top' | 'bottom';
export interface Placement { readonly dock: Dock; readonly size: number; readonly rect: Rect; readonly stage: 1 | 2 | 3 | 4 }
export function rectOfHull(hull: readonly Vec2[]): Rect | null;
export function visibleSlabRect(hull: readonly Vec2[], offsetY: number, canvas: Size): Rect | null; // shift by -offsetY, clip; null if empty
export function placePanel(input: {
  canvas: Size; slab: Rect | null; kind: 'detail' | 'caseStudy';
  current?: { dock: Dock; size: number } | null; look?: PanelLook;
}): Placement;
```

**Detail:**
- `slab === null` → keep `current` (or `bottom`/`right` default by width).
- Free space per side as in RFC D3.
- Keep `current` while `free[current.dock] ≥ current.size` (R1).
- Otherwise the preference order: wide → opposite x side, other side, opposite y sheet, other sheet; narrow → sheets only.
- Stages: 1 `free ≥ pref` (size `pref`) · 2 `free ≥ min` (size `min(pref, free)`) · 3 best `≥ compactMin` · 4 best `> 0` (size `free`).
- `rect` = the allocated rect of that dock and size: side `height = H − 2·inset`; sheet `width = W − 2·inset`.

**Case study:** wide → `right`, `size = min(sidePx, sideFrac·W)`; narrow → `bottom`, `size = min(sheetFrac·H, sheetMaxPx)`; stage 1.

**Proof obligations tested:**
- `rect` is disjoint from the hull polygon (separating axis), for every returned placement;
- `rect` is inside `[0,W]×[0,H]`;
- `look.gapPx ≥ 2 × motion.distances.hoverLift` (R2).

**`PANEL_LOOK`:**
- `insetPx 8, gapPx 8, wideMinPx 640`
- `side {prefPx 320, prefFrac 0.42, minPx 240}`
- `sheet {prefFrac 0.45, prefMaxPx 320, minPx 128}`
- `compactMinPx 48`
- `caseStudy {sidePx 448, sideFrac 0.5, sheetFrac 0.7, sheetMaxPx 480}`
- `zIndex 2` (above the S5 caption's 1)
- `typography {headingRem 1, bodyRem 0.875, monoRem 0.75}`

## Tour-click decision (`src/panel/tourClick.ts`) — RFC D6

```ts
export type TourCommand = { type: 'jump'; step: number; resume: boolean } | { type: 'pause' };
export function stepForComponent(path: readonly string[], id: string, current: number): number | null; // next occurrence after current, else first
export function resolveSlabClick(input: {
  hit: string | null;
  tour: { status: TourStatus; flowId: string | null; step: number };
  flows: readonly { id: string; path: readonly string[] }[];
}): { panelEvent: PanelEvent | null; tour: TourCommand | null };
export function jumpSequence(step: number, resume: boolean): readonly ('stop' | 'step' | 'play')[]; // ['stop', 'step'×(step+1), ...(resume ? ['play'] : [])]
```

**Rules:**
- Active = `status !== 'idle'`.
- Active and `hit` in path → `{panelEvent: {type:'closeControl'}, tour: jump(k, status === 'playing')}`. The panel closes if open, and the focus return does **not** run for a jump close, because focus stays in the viewer anyway.
- Active and `hit` not in path → `{panelEvent: slab(hit), tour: status === 'playing' ? pause : null}`.
- `hit === null` → `{panelEvent: slab(null), tour: null}`.
- Not active → `{panelEvent: slab(hit), tour: null}`.

**Executor** (in `TeardownViewer`): for `jump`, `for (const name of jumpSequence(k, resume)) viewer.actions[name]()` in the same handler; for `pause`, `viewer.actions.pause()`.

## Content models (`src/panel/content.ts`) — RFC D7, D8, D9

```ts
export interface PanelProjectInput {            // structural; parsed Project satisfies it
  readonly meta: { readonly slug: string; readonly name?: string; readonly tagline?: string };
  readonly story?: { readonly headline?: string; readonly problem?: string; readonly approach?: string;
                     readonly outcome?: string; readonly metrics?: readonly Metric[] };
  readonly layers: readonly { readonly components: readonly PanelComponentInput[] }[];
}
export function detailModel(project: PanelProjectInput, id: string, registry?: TechRegistry): DetailModel | null;
export function caseStudyModel(project: PanelProjectInput): CaseStudyModel;
export function chipModels(techIds: readonly string[], registry?: TechRegistry): ChipModel[];
```

- Section titles are fixed English strings in the model (`Problem`, `Approach`, `Outcome`, `Metrics`, `Tech`, `Links`). Empty arrays and absent strings are omitted.
- Links carry `rel: 'noopener noreferrer'` and `target: '_blank'`.
- Chips: the registry hit gives `{label, category, colorRef: tech.color}`; a miss gives `{label: id}` with no category or colour.

## Motion (`src/panel/motion.ts`) — RFC D10, R5

```ts
export function panelMotion(tokens: MotionTokens, dock: Dock, phase: 'enter' | 'exit'):
  { keyframes: Keyframe[]; options: KeyframeAnimationOptions } | null;   // null when duration ≤ 0 (static twin)
```

- **Enter:** `[{opacity:0, transform: translate(dx,dy)}, {opacity:1, transform:'none'}]`. `(dx,dy)` is `panelOffset` toward the dock edge: right `+x`, left `−x`, bottom `+y`, top `−y`.
- **Exit:** the reverse.
- **Options:** `{duration: ms(durations.panelEnter|panelExit), easing: easings.panelEnter|panelExit.css, fill: 'both' on exit / 'backwards' on enter}`.
- `ms()` uses the named constant `MILLISECONDS_PER_SECOND` (the S6 `overlay/timing.ts` pattern).

## Renderers (`src/react/panel/*`) — RFC D2, D5, R1, R5

- **`useSlabClick(stageRef, bridgeRef, layout, onSlabClick)`:**
  - adds a `click` listener on the stage for all pointer types;
  - `hit = pickAt(...)`; `undefined` (bridge not ready) → ignore; otherwise `onSlabClick(hit)`.
- **`useViewerPanels()`:**
  - `useReducer(panelReducer, CLOSED)`;
  - `actions.{openDetail, toggleCaseStudy, openCaseStudy, close}`; `openCaseStudy`/`toggleCaseStudy` record `document.activeElement` as the opener in a ref;
  - `ids` from `useId()`;
  - exposes `dispatch` internally to `TeardownViewer` through a module-private `WeakMap` (the S5 `viewerMetadataOf` pattern), so the public type stays small.
- **`PanelLayer`** props: `state, project, registry, palette, tokens, wrapperRef, frameRef (latest settled frame), offsetRef, onClose(reason)`. Internal state: `{placement, moving, surfaces: [{key, kind, placement, phase:'enter'|'shown'|'exit'}]}`.

  **Imperative handle** `update(event: OverlayEvent)` / `setScroll(offsetY)`:
  - `moving` → `visibility:hidden` on the layer;
  - `settled` → store the frame and re-place;
  - a scroll → re-place, and set state only if the `{dock,size}` changed.

  **Surface:**
  - `<section role="dialog" aria-modal="false" aria-labelledby data-xploder-panel-surface>`, anchored by dock with CSS edges (R1);
  - `boxSizing: border-box`, `width` (side) or `maxHeight` (sheet), `overflowY: auto`, `overscrollBehavior: contain`;
  - `background: palette.surface`, `color: palette.ink`, `border: 1px solid palette.line`, `borderRadius: 0.25rem`.

  **Motion box:** an inner `div` animated with `panelMotion`. Enter on mount via `useLayoutEffect`. Exit keeps the surface until `finished`, then removes it.

  **Close control:** `<button type="button" aria-label="Close details|Close case study" data-xploder-panel-close>` at ≥ 44×44 px.

  **Listeners while open:**
  - `document` `keydown` Escape → `preventDefault` + `onClose('escape')`;
  - `document` `click` outside the wrapper → `onClose('outside')`;
  - surface `onKeyDown` → `stopPropagation()` unless `Escape`.

  **Focus (D5):**
  - case study → focus the heading on mount;
  - on close, `restoreFocus(reason)`: the case-study opener if connected; otherwise the wrapper, but for `outside` only when `activeElement` is `body`, null or inside the wrapper.

- **`DetailPanel`:** `h2` name · meta line (mono, `palette.label`) · summary (`palette.ink`) · description · `TechChips` · Metrics `<dl>` · Links `<ul>`. **`CaseStudyPanel`:** `h2` name · tagline · headline · `h3` sections · Metrics `<dl>`.
- **`TechChips`:** `<ul aria-label="Tech">` → `<li data-xploder-chip>` → a swatch `<span aria-hidden>` (`background: techColor(colorRef, palette)`, falling back to no swatch) + a `<span>` label. Border `1px solid palette.lineMuted`, `borderInlineStart: 2px solid <swatch colour>`.

## `TeardownViewer` wiring (additive) — RFC D2, D6, R6

1. Props: `panels?: ViewerPanelsHandle`, `registry?: TechRegistry`. `const internal = useViewerPanels(); const panelsHandle = panels ?? internal;`.
2. `onOverlay` → `overlayRef.current?.update(e); panelLayerRef.current?.update(e)`. `onOverlayScroll` does the same with `setScroll`.
3. `useSlabClick(stageRef, pickBridgeRef, layout, onSlabClick)`. `onSlabClick(hit)` runs `resolveSlabClick({hit, tour: {status, flowId, step}, flows: project.flows ?? []})`, then the tour command (`jumpSequence` / `pause`), then `dispatch(panelEvent)`.
4. Highlight sync: a layout effect on `state` — entering `detail id` → `viewer.actions.highlight(id)`; leaving it → `highlight(null)` if `viewer.highlight === id`.
5. R6: a layout effect on `project.meta.slug` → `dispatch({type:'reset'})`; a layout effect on the transition into `caseStudy` → `viewer.actions.pause()` if `viewer.tour.status === 'playing'`.
6. Wrapper attributes (layout effect): `data-xploder-panel`, `-dock`, `-stage`, `-slab`, `-ready`.
7. Render `<PanelLayer>` as the **last child of the wrapper** (after the caption).

`product-gap.test.ts` (S6, sealed) asserts that `TeardownViewer.tsx` calls `resolveViewerLayoutOptions(`. That call stays.

## Data flow

```
stage click ─► useSlabClick ─► pickAt (bridge camera/progress + interaction/pick) ─► hit
hit + viewer.tour + flows ─► resolveSlabClick ─► { tour command ─► viewer.actions (stop/step…/play | pause),
                                                   panel event  ─► panelReducer (useViewerPanels) }
OverlayProjector (settled | moving | scroll) ─► TeardownViewer fan-out ─► PanelLayer
   └► visibleSlabRect(hull, offsetY) ─► placePanel ─► dock + size ─► surface key + CSS edges
project + registry ─► detailModel / caseStudyModel / chipModels ─► DetailPanel / CaseStudyPanel / TechChips
resolveMotion(prefersReduced) ─► panelMotion ─► WAAPI on the motion box (null under reduced motion)
```

## Playground (`apps/web/app/dev/engine/engine-playground.tsx`)

- `registry` is already parsed. Pass `registry={registry}` and `panels={panels}` (`const panels = useViewerPanels()`).
- Control bar: `<button data-engine-control="case-study" aria-expanded aria-controls={panels.ids.caseStudy} onClick={panels.actions.toggleCaseStudy}>Case study</button>`.
- URL params (applied once, after `ready`): `?select=<componentId>` → `panels.actions.openDetail(id)`; `?panel=case-study` → `openCaseStudy()`. The existing `?state=`, `?tour=`, `?flow=` and `?step=` are unchanged.
- The stats `<dl>` gains `Panel` (`data-engine-panel`).

## Scanners (`apps/web/test`)

- `no-color-literals.test.ts` and `no-motion-literals.test.ts`: add an `S07_SOURCE_FILES` list (all `src/panel/*.ts` and `src/react/panel/*`) with the existing non-vacuity assertion pattern.
- `package-consumer.test.ts`: add `useViewerPanels` to the `xploder/react` identifiers.

## Evidence CLIs (`tools/perf`) — RFC D11, R3

`engine-probe --scope s7` (S4/S5/S6 scopes unchanged and still run in T012). All checks run on the fixture export `/dev/engine`.

| Check | Pass rule |
|---|---|
| `s7-slab-finder-<fixture>` | the hit-map sweep (exploded 45°, 1280×800 and 390×844) yields centroids. The top/bottom/left/right slab ids are recorded (independent of `place.ts`) |
| `panel-never-covers-<pos>-<state>-<palette>-<zoom>` | after clicking a hit point of the slab and waiting for `data-xploder-panel-ready="true"`: every hit-map point of that slab is outside the surface rect, and `elementFromPoint` at each point is not inside `[data-xploder-panel-surface]`. pos ∈ {top,bottom,left,right}; state ∈ {exploded, imploded}; palette ∈ {light,dark}; zoom ∈ {1, max-top, max-bottom} (≥ 48 entries). The slab finder re-runs in each view, so the position slab is the visible extreme of that view. Desktop for left/right, mobile for top/bottom |
| `panel-open-mouse` / `panel-open-touch` | the click (mouse context) / tap (`hasTouch` mobile context) opens `detail` for the clicked id |
| `panel-content-<id>` | name, summary, chip labels (= registry JSON labels), metrics and links (with `rel` ⊇ `noopener`, `target=_blank`) equal the fixture JSON, for A `tide-repository` and B `reconciliation-ledger`; A `beachgoer` has no Tech/Metrics/Links headings |
| `panel-close-<route>` + `panel-focus-return-<route>` | route ∈ {same-slab, escape, outside-blank, outside-control, close-control, empty-canvas}: the panel is closed; focus is the wrapper (`outside-control`: the control keeps focus) |
| `panel-keys-isolated` | ArrowLeft with focus on the close button does not change `data-xploder-azimuth` |
| `case-study-sections-<fixture>` | heading, Problem → Approach → Outcome order, metrics = `story.metrics` (C: none) |
| `case-study-scroll` | at 390×844: `scrollHeight > clientHeight`, a wheel changes `scrollTop`, `window.scrollY` is unchanged |
| `case-study-close-<route>` | close-control / escape / toggle / canvas-tap close it; focus goes to the opener button |
| `case-study-palette-<light|dark>` | the surface background = `--bp-surface`, the text = `--bp-ink` |
| `chips-labels` / `chips-swatch-<light|dark>` / `chips-display-only` | labels = the registry; swatch colour = the live `--bp-tech-<cat>`; no focusable chip descendant, no `a`/`button`/`[role=link]` |
| `tour-jump-playing` / `tour-jump-paused` / `tour-notinflow-pause` / `tour-resume-same-step` / `tour-escape-layering` | per spec US5 scenarios 1–4; each logs `{step, status, captionText, trace}` before and after, and one beat later |
| `tour-jump-no-caption-gap` | rAF sampling during a jump: 0 frames without `[data-xploder-caption]` |
| `panel-cls-strict` | 0 `layout-shift` entries (including `hadRecentInput`) whose sources are inside the viewer wrapper, over the scripted scenario; the page total and attributed outside entries are reported |
| `panel-stage-invariant` | the stage `getBoundingClientRect()` and `scrollHeight` are identical before/after every open/close |
| `panel-hidden-while-moving` | rAF sampling during an explode via keyboard with a panel open: every frame either has `visibility:hidden` on the layer or a surface disjoint from the slab's hit points |
| `rm-panel-instant` | reduced motion: right after open `getAnimations()` on the surface subtree = 0 and computed opacity = 1 |
| `panel-draw-calls` | `data-engine-draw-calls` = 2 with a panel open and with the tour playing |
| `panel-max-zoom-reach` | max zoom with a panel open: scroll to top and bottom; top-layer and bottom-layer slabs are hoverable; screenshots |

**`pnpm evidence`** is used for the screenshot matrix with `--wait-for '[data-xploder-panel-ready="true"]'` and the R4 URL params.

## Test map

| File | Covers |
|---|---|
| `frozen-surface.test.ts` | S2/S4 + S5 unchanged; **S6 manifest**: base `0b2c678`, ≥ 25 entries, non-vacuity (`src/overlay/model.ts`, `src/look/tokens.ts`, `src/react/scene/OverlayProjector.tsx`, `test/overlay-place.test.ts`) |
| `panel-state.test.ts` | every RFC D4 cell; identity on no-op; sequences; `consumesEscape` |
| `panel-place.test.ts` | the AC2 matrix (fixtures × positions × states × zoom bands + scroll offsets × azimuths × 4 viewer sizes): SAT disjointness, containment, opposite-side rule, stage ≤ 2 for fixtures (histogram printed); hysteresis (a scroll sweep keeps the dock while it fits); synthetic 1×1/2×1 → still disjoint at stage 3/4; `gapPx ≥ 2·hoverLift`; case-study sizes; `visibleSlabRect` shift + clip |
| `panel-tour-click.test.ts` | `resolveSlabClick` table (in/out × playing/paused/ended/idle × null hit); `stepForComponent` with repeats + wrap; `jumpSequence` shape; the sequence applied to the sealed `tourReducer` gives `{status, step}` as expected and `positionAt().componentId === path[k]`; pause→play keeps the step |
| `panel-content.test.ts` | detail models for every A/B/C component vs the fixture JSON + registry labels; omitted sections; link `rel`/`target`; chip colour refs; case-study order; C has no metrics |
| `panel-motion.test.ts` | the keyframe direction per dock; durations/easings = tokens; `null` under `resolveMotion(true)` |
| `viewer-panels.test.tsx` | test-renderer: `useViewerPanels` actions; the jump/pause executor against the real `useTeardownViewer` (playing → step k playing; paused → step k paused; not-in-flow → paused + detail); `pickAt` = the S5 picker on the same rays |
| `tools/perf/test/panel-probe.test.ts` | pure evaluators: rect/point containment, centroid extremes, CLS attribution (inside vs outside the wrapper), the never-covers verdict |

## Phase groups (Stage 3 STOP points)

- **G1 pure core:** T001–T006 → STOP (log bundle + S6 seal + diff logs).
- **G2 renderers + wiring + playground:** T007–T010 (⚑ push + draft PR at T010) → STOP. Murphy clicks through in Orca's browser (`pnpm dev`); panel sizes and look are tuned here, once.
- **G3 evidence:** T011–T014 → STOP.
- **G4 ship:** T015 → STOP + AC self-check table.

## Complexity Tracking

| Choice | Why the simpler alternative was rejected |
|---|---|
| Jump composed from public actions (`stop`, `step`×(k+1), `play`) | A `jump` reducer action would break the S5 seal (AC6). The composed sequence is batched into one render and is proven against the sealed reducer. |
| Pure placement + polygon SAT test + independent hit-map probe | A DOM-measured popover can't be tested in Node and drifts from what was tested. Two independent proofs (math + pixels) make AC2 credible. |
| Remount on dock/size change (R1) | Moving a mounted absolutely-positioned element is a layout shift; transform-positioning needs the panel height (a measure loop). Remounting is shift-free by definition. |
| `pickAt` duplicated (R7) | The S5 picker is private in a sealed file; exporting it would break the seal. ~25 lines, cross-checked by a test. |
| WeakMap-private `dispatch` on the panel handle | It keeps the public `ViewerPanelsHandle` minimal and mirrors S5's `viewerMetadataOf` pattern. |
