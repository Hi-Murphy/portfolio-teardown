# RFC — S16 Label System (E3, E6)

**slice:** S16-label-system · **status:** APPROVED at Gate 1 (2026-11-16): all §12 defaults; refinements R1–R8 in §13 · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-16-label-system.md` (frozen brief v1) · **branch:** `task/s16-label-system` · **base:** `021c1ff` (S16 freeze; product code = S15 merge `fae4ac6`) · **date:** 2026-11-16 · **revision counter:** 0 of 2

> This RFC records design decisions only and does not change scope. Where it seems to conflict with the brief, the brief wins and the conflict becomes an open question (§12). Nothing is implemented.
>
> **Inputs:** a static read of the code at `021c1ff`. No browser or unit measurement was taken at Stage 1. Every number below is either a line reference or labelled **estimate**; the baseline census (overlaps, passes, timing, bytes) is task T001.

---

## 1. Context (from the brief)

- **Mission:** one placement pass for every label. Today overlay annotations and lettering are placed by separate models that do not know each other. Merge them into one model and one pass so overlap is impossible by construction, and make hover + selected emphasis native on labels.
- **Two stages, hard stop between them:** (A) the unified model with **0 px visual difference** → **[STOP 1]**, Murphy's word; (B) placement behaviour + emphasis on top.
- **Surfaces:** S6, S7, S8 may be touched and re-sealed (reason + pushed `seal/<surfaces>-<sha>` tag each). **S2/S3/S4/S5 stay empty.**
- **No typography change, no content change, no new dependency, gates unchanged.**

### Acceptance criteria (verbatim, inviolable)

- **AC1 — no overlaps, by sweep.** A geometric sweep over **every pair of labels** finds **0 intersections** across: zoom steps 1×/2×/3×, the four rotation snaps, widths 390/768/1440, and scroll positions top/middle/bottom, in both palettes, for both projects and for the fixtures. Rectangles attached.
- **AC2 — pixel parity where nothing overlapped.** Against the S15 baseline, every state that had no overlap must render **0 px difference**. Every changed pixel cluster in states that did overlap is listed with its reason (the old overlap, the new position). A blanket "looks better" is not evidence.
- **AC3 — two-slot emphasis.** With A's panel open and B hovered, **both** A's and B's names are emphasised simultaneously; leaving B keeps A; closing the panel clears A; keyboard focus on A behaves as selected. Extends S14 AC1 to the labels. Evidence: emphasis assertions + screenshots.
- **AC4 — one pass, no churn.** Exactly **one** placement pass per settle (event/log count), and label positions are stable across frames where the scene state is unchanged (no jitter, no re-placement loop).
- **AC5 — cost.** Placement time at CPU ×1/×4 within **+10 %** of the S15 baseline (or inside the measured run spread), 2 draw calls, and **no more than +2 KB gzip** of client JS for the whole slice.
- **AC6 — gates and seals.** Full CI green (7 required contexts); Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; eager hero reveal with zero interaction; every touched S6/S7/S8 file re-sealed with a reason and a pushed tag; **S2/S3/S4/S5 diffs empty**.

---

## 2. Baseline: how labels are placed today

All paths are relative to `packages/xploder/src/`.

| Placer | Module (surface) | Places | Obstacles it knows |
|---|---|---|---|
| `placeLabels` (first-fit, then bounded search ≤ 3,000 nodes) | `overlay/place.ts` (S6) | tags-mode layer callouts, part tags, dimension notes (stack, footprint) | component hulls, plate-name quads (since S14 I-05), its own earlier labels (+ `gapPx` 4) |
| `placeColumns` (all-or-nothing) | `overlay/columns.ts` (S6) | columns mode (width ≥ 768): layer column, part column, rail label, footprint via `placeLabels` | component hulls, its own boxes |
| `placeTitleBlockResponsive` | `overlay/titleBlock.ts` (S6) | title block (imploded only) | silhouettes |
| `letterPart` → face / mark | `lettering/place.ts` (S7) | part number + name on the top face; else a **mark** (number beside the front corner, with a leader) | hulls and plate corners of layers **above** |
| `layerLetteringModel` | `lettering/layers.ts` (S7) | plate layer names on the plate's front edge | component hulls of the same and upper layers |
| `compactColumn` | `lettering/column.ts` (S7) | right-hand compact name column (tags mode, at rest) | the canvas and the drawing's right edge only |

**Who calls what per settle** (`OverlayEvent` `settled`, fanned out by `TeardownViewer.tsx:287`):

- `BlueprintOverlay.tsx:287` → `overlayBaseModel` → `placeColumns` + `calloutMode` (reused) → `columnModel` **or** `tagsModel` (`layerLetteringModel` + `placeLabels`). Memoised on the settled frame; emphasis runs after, in `overlayStateModel` (`:301`), and never re-places.
- `PartLettering.tsx:296–326` → `calloutMode` (runs `placeColumns` **again**) → `compactColumn` → `faceLetteringAllOrNone` (`letteringModel` once, twice if a face name fails) → `layerLetteringModel` (**again**).

### Corrections and findings (C-items; none changes an AC)

- **C1 — three families, not two.** E3's "two placement modules" are six placers in two families (table above). The unified model covers all six.
- **C2 — the coupling is one-way.** S6 already treats S7's plate-name quads as obstacles (`overlay/model.ts:558`). Nothing in S7 knows about S6, and the S7 placers do not know about each other's output. The possible overlap sources found by reading the code are:
  - a mark that finds no clear spot falls back to its first candidate regardless (`lettering/place.ts:301`);
  - marks ignore other lettering;
  - plate names ignore other plate names;
  - the compact column ignores the S6 dimension notes;
  - S6 notes ignore marks and the compact column.
  Whether any of these happens in a shipped state is T001's census, not a claim here.
- **C3 — duplicate work.** Per settle, `placeColumns` runs twice and `layerLetteringModel` twice (once per consumer), and `letteringModel` once or twice. So today there are **two** placement computations per settle (one per consumer), not one.
- **C4 — two coordinate spaces, harmless.** The overlay places in viewport space (`shiftFrame(frame, -offsetY)`, `overlay/model.ts:627`). The lettering evaluates `calloutMode` on the content-space frame. The two can disagree only when `offsetY ≠ 0`. The lettering reads its mode in exactly two places:
  - `column`, which needs `|offsetY| ≤ 1e-9`;
  - `layersShown = mode === 'tags' || extentPx > 1e-9`. With `extentPx ≤ 1e-9` the scroll offset is also ≤ 1e-9.
  So a disagreement never reaches the screen beyond a 1e-9 px knife-edge. §4.2 uses this.
- **C5 — S6 part tags are never visible but still reserve space.** `data-xploder-lettering-on` is always set (`TeardownViewer.tsx:863`), so `LETTERING_TAG_HIDE_CSS` hides every S6 part tag in tags mode. They are still placed before the dimension notes and push them aside. They stay as reservations: removing them would move notes in states without any overlap, which breaks AC2.
- **C6 — labels have one emphasis slot.** Both label layers receive `highlight={viewer.highlight ?? detailOpenId}` (`TeardownViewer.tsx:931, 948`). With A open and B hovered, only B's label is emphasised. The 3D tiles already light both (S14 I-09, `interaction/emphasis.ts:97`).
- **C7 — the layer-name fallback is CSS.** An S6 layer callout is hidden per layer where the plate lettering succeeded (`PartLettering.tsx` `layerHideCss`). The unified model makes this explicit: one logical label `layer:<id>` with an ordered candidate list (plate face → S6 callout / column).

---

## 3. The unified label model (E3)

### 3.1 Labels, anchors, constraints, priority

Every label on screen is one `LabelItem` in one list:

- `key`: the logical id, `layer:<id>` | `part:<id>` | `dimension:stack` | `dimension:footprint` | `titleblock`;
- `kind`: one of the kinds below;
- `quad`: four screen points in **content space**; plain rectangles are axis-aligned quads;
- `priority`;
- `visible`: whether it is painted, after CSS hiding and the fallback rules;
- `source`: which placer produced it.

| Priority | Kind | Logical key | Anchor | Constraint (unchanged placer) | Shown when |
|---:|---|---|---|---|---|
| P0 | `titleblock` | `titleblock` | drawing silhouette | `placeTitleBlockResponsive` | imploded |
| P1 | `column-layer`, `column-part`, `column-rail`, `column-footprint` | layer / part / dimension | layer mean-Y; drawing left/right edge | `placeColumns` all-or-nothing | exploded, columns mode |
| P2 | `plate` | `layer:<id>` | plate front edge | `layerLetteringModel` (font 13→9, 9 edge stops, inside canvas width) | exploded idle, tags mode or extent > 0, `kind: 'face'` |
| P3 | `face` | `part:<id>` | top-face quad | `letterPart` face (grid, font 16→9, names all-or-none ≥ 1.5625×) | exploded idle |
| P4 | `compact-row` | `part:<id>` | layer mean-Y, right of the drawing | `compactColumn` | tags mode, at rest |
| P5 | `mark` | `part:<id>` | front corner of the top face | `letterPart` mark (4 candidates) | exploded idle, face failed |
| P6 | `callout-layer`, `dimension` | layer / dimension | leftmost plate corner; dimension anchors | `placeLabels` (radii × directions × anchors) | tags mode; a layer callout only where its plate name is not `face` |
| — | `tag` (reservation) | `part:<id>` | component anchor | `placeLabels` | never painted (C5); reserves space only |

**Why this order** (it only matters in Stage B, on conflict):
- labels **inside geometry** (P2, P3) cannot move, so they win;
- **fixed layouts** (P0, P1, P4) are all-or-nothing, so they win over free labels;
- a **mark** has only 4 candidates, so it is placed before the notes;
- the **notes and layer callouts** have the richest candidate sets (6 radii × 8 directions × up to 9 anchors), so they yield.

P2 and P3 cannot conflict with each other: each one's obstacles already contain the other's host polygon (§2 table).

### 3.2 The single pass

```ts
// src/labels/pass.ts (new, S6)
labelPass(input: LabelPassInput): LabelPassResult

interface LabelPassInput {
  frame: OverlayFrame;              // the settled event's frame (content space)
  faces: readonly FaceQuad[];       // top-face quads, snapshotted at event time from the pick bridge
  viewport: { width; height };
  offsetY: number;
  extentPx: number;                 // stage data-xploder-scroll-extent at event time
  zoomFactor: number;               // rig zoom at event time
  target: 'imploded' | 'exploded';
  layout; project; look;
}

interface LabelPassResult {
  overlay: OverlayModel;            // exactly what overlayBaseModel returns today
  lettering: { items; column; layerLabels; layersShown };   // exactly PartLettering's SettledLettering today
  labels: readonly LabelItem[];     // the unified list (sweep, tests, Stage B)
  pass: number;                     // monotonic pass id (AC4)
}
```

- **Where it runs:** `TeardownViewer.onOverlay`, once per `settled` event, **before** the fan-out. The result goes to `BlueprintOverlay.update(event, result)` and `PartLettering.update(event, result)`. Both renderers keep their DOM and styles byte-for-byte; they stop calling placers.
- **Memo key:** `(event, layout, project, look, target)`. A re-render, an emphasis change, a scroll, a palette change or a panel change re-uses the result. A key change without a settle (project or look identity) re-runs the pass and counts it. Today that coincides with a layout change, which emits `moving` → `settled` anyway.

### 3.3 Stage B: the conflict-gated pass

Stage B keeps every placer and changes the order of trust:

1. Families run in priority order P0 → P6. Each family first runs **its S15 placer unchanged**.
2. **Gate:** if none of the family's visible labels intersects an already-placed visible label of higher priority (strict SAT, the same predicate as the sweep, §5.3), its output is kept **as is**.
3. **Conflict:** otherwise the family is re-run **with the higher-priority quads as extra obstacles**:
   - `placeLabels` and `letterPart` already take obstacles;
   - S7 gains an optional `obstacles` input (§9 #4).
   A label that still finds no clear spot follows the fallback rules below.
4. **Fallbacks on conflict** (existing behaviour, no new style):
   - plate name → `plain` → the S6 layer callout shows (the C7 mechanism);
   - face → mark;
   - mark → hidden;
   - S6 label → hidden. It is counted in `data-xploder-overlay-hidden`, as today.
5. **Guarantee:** a final all-pairs check over the visible list hides the lower-priority label of any pair that still intersects. This step is empty by design and counted (`guarded: n`). A non-zero count fails the sweep test. Overlap is therefore impossible by construction: the last step makes it so, and the sweep proves the step never had to act.

**AC2 by construction:** in a state with no baseline overlap, every gate passes, so every family keeps its S15 output, so the pixels are identical. Only the families in a conflicting state change, and the AC2 report attributes each changed cluster to a moved or hidden label (§6).

---

## 4. Stage A: absorbing the two modules with 0 px change (parity argument)

### 4.1 What changes in Stage A

| File | Change |
|---|---|
| `src/labels/pass.ts` (new, S6) | composes the existing placers in today's order and spaces; builds `labels` |
| `TeardownViewer.tsx` (S8) | runs the pass once per settle; passes the result to both renderers; pass counter |
| `PartLettering.tsx` (S8) | renders `result.lettering` instead of computing it; face quads move to the viewer snapshot |
| `BlueprintOverlay.tsx` (S6) | renders `result.overlay` instead of calling `overlayBaseModel` |
| S7 `lettering/*`, S6 `overlay/*` | **no change** |

### 4.2 Parity argument, stated precisely

The claim: for every settled event, `result.overlay` and `result.lettering` are **deep-equal with exact numbers** (`Object.is` on every float) to what the two consumers compute today. Then the rendered DOM is identical, and so are the pixels.

1. **Same functions, same arguments.** The pass calls the unchanged S6/S7 placers with the arguments the consumers build today. The argument-building code is moved verbatim (`columnLayers`, `drawingMaxX`, `frameExtent`, `topFaceQuad` inputs).
2. **Pure and deterministic.** Every placer is a pure function of its arguments: no time reads (S15 AC1 scan), no randomness, no hidden state. The one module-level value, `SEARCH_NODE_LIMIT`, is a constant. The same operations in the same order give the same IEEE-754 results.
3. **Same inputs at the same instant.**
   - The face quads read `bridge.camera` and `bridge.progress`; the pass snapshots them in the same synchronous `onOverlay` call where `PartLettering.update` reads them today.
   - `extentPx` comes from the stage attribute, read in that same call.
   - `zoomFactor` comes from a ref updated in a layout effect, like `zoomFactorRef`. useFrame runs outside React's commit, so both refs hold the committed value.
4. **Same target.** Today the overlay applies a settled frame with `targetRef.current` at apply time, which can be later than the event. Since S15 R14, any target change sends `moving` in a layout effect, and that clears the pending frame. So the target at apply time equals the target at event time. The pass uses the event-time target.
   - `layoutMatches` stays: the result carries the `layout` it was computed for, and the overlay still compares identities.
5. **De-duplication only where the inputs are bit-identical.** The second `placeColumns` and the second `layerLetteringModel` are reused from the overlay's computation only when `offsetY === 0`:
   - `shiftFrame(frame, -0)` returns the same numbers (`y + -0 === y`);
   - the hull copies (`arrayPoint`) hold the same values;
   - width and names are built by the same expressions.
   When `offsetY ≠ 0`, the pass runs the lettering's own evaluation, as today. C4 shows that removing this second evaluation later is invisible, but Stage A does not rely on that.
6. **Renderers unchanged.** Both components keep their JSX, styles, fade, `pending` logic, CSS hide rules and data attributes. Only the source of `settled` data changes. The new pass counter attribute sits on the wrapper; no pixel is involved.

**Proof plan (all three must hold before STOP 1):**
- **(a) Unit oracle.** `test/label-pass-parity.test.ts` holds a frozen copy of the S15 consumer composition (`test/oracles/labels-s15.ts`, the S11.8 oracle pattern). It asserts `toStrictEqual` between the pass and the oracle over the S11.8 seeded corpus (2,000 random layouts + fixtures A/B/C + both content projects) × widths 390/768/1440 × zoom levels × 4 snaps × offsets 0/mid/max. The result is 0 differing values.
- **(b) DOM identity.** For every matrix cell (§6), the serialised `outerHTML` of the overlay root and the lettering root is identical, base vs head.
- **(c) Pixels.** 0 px on the full matrix (§6).

---

## 5. Geometric sweep design (AC1)

### 5.1 What is a label (the rectangles)

Painted text-bearing boxes only. Selector and rectangle rule:

| Marker | Rectangle |
|---|---|
| `[data-xploder-label]` (S6 layer / part / tag / dimension) | border box under its `translate()` (it paints a fill and border) |
| `[data-xploder-titleblock-box]` | border box |
| `[data-xploder-lettering]` (face, mark), `[data-xploder-lettering-layer-label]` (plate) | element box mapped through its `matrix()`: an exact parallelogram (S14 `overlap-matrix.mjs` method) |
| `[data-xploder-column-row]` | union of the text `Range` client rects. The row div spans to the canvas edge, so its box is not ink. |

- **Counted only if painted:** computed `visibility` is not `hidden`, `display` is not `none`, the **effective** opacity (product over ancestors) is > 0 after the fade, and the element has client rects.
- **Out of scope** (not labels): leader and dimension strokes, the circuit trace, tour caption, hero step label, panels, chips, and the invisible navigator proxies (Q7).

### 5.2 Matrix

| Axis | Values |
|---|---|
| Routes | `/projects/websocket-inspector`, `/projects/jev-toolkit`; fixtures A/B/C at `/dev/engine?fixture=a\|b\|c` (fixture export, `PERF_FIXTURES=1`); extra: `/` hero settled states (explode, hero zoom) |
| Widths | 390×844 (mobile, touch), 768×1024, 1440×900 |
| Palettes | light, dark |
| State | imploded (title block) and exploded |
| Zoom | all six levels: 1, 1.25, 1.5625, 1.953125, 2.44140625, 3. AC1's 1×/2×/3× are 1 / 1.953125 / 3, as named in S14. |
| Snaps | turns 0/1/2/3 (azimuth 45°/135°/225°/315°: the brief's "0/90/180/270" snaps) |
| Scroll | the viewer stage scroll at top / middle / bottom of `data-xploder-scroll-extent`. At extent 0 the three collapse into one cell, marked `n/a`. |

- **Order inside a cell:** zoom → scroll → turn. The settle therefore happens at the scrolled offset (settled-while-scrolled states are covered), and the sweep measures after the S15 `settled` DOM event plus the fade.
- **Size (estimate):** about 2,000 cells, about 45 min per run with 4 parallel contexts.

### 5.3 How it is measured

- **Authoritative (AC1 evidence): DOM markers in the browser.** A feature-local `label-matrix.mjs` (Playwright from `tools/perf`, as in S14) collects every quad above per cell and tests **every pair** with strict SAT. A pair counts if its penetration depth on every axis is > 1/64 px (Chromium's layout unit, the measurement resolution; Q5). Touching edges do not count.
  - Output: `T0xx-log-sweep-matrix.json` with **every rectangle and every pair test per cell**, plus a summary `.md`: hits per cell, with route/width/palette/zoom/snap/scroll.
- **Test-first gate: the model sweep in Vitest.** `test/label-sweep.test.ts` runs `labelPass` over the node-projected matrix (the S11.8 corpus frames) and applies the **same predicate** to `result.labels`. It is fast, deterministic and runs in CI.
- **Cross-check:** on 20 sampled browser cells, the model quads and the DOM quads agree within 1 px. This shows the model sweep measures what is painted.

### 5.4 Seeded-overlap negative control

- **Unit:** take a real pass result (fixture A, 1440, zoom 3, turn 0) and add a copy of a visible label's quad shifted by (1, 1) px under a new key. The sweep must report **exactly that one pair**. A copy shifted so it only touches must report **0**.
- **Browser:** per route, one control cell clones a visible label element, offsets it by 1 px, sweeps (≥ 1 hit required), then removes it. If the control does not detect the seed, the script exits non-zero.
- **Order (brief, test-first):** sweep and controls land and run **on Stage A code before** the Stage B switch. That run is red on the seed, and it records the real Stage A hit count (= the baseline census). The switch commit then turns the real matrix to 0.

---

## 6. Pixel-parity matrix (AC2)

- **Same matrix as §5.2**, screenshots of the viewport, taken in the same run as the sweep. The comparison uses the `tools/perf/src/png.ts` decode/diff helpers, imported read-only, so S3 stays untouched.
- **Noise floor first:** T001 takes **two** base runs. If base vs base is not 0 px everywhere, it STOPs and escalates, because 0 px cannot be proved on a non-deterministic cell.
- **Stage A:** every cell 0 px, and DOM identical (§4.2 b).
- **Stage B:** every cell whose **base sweep had 0 hits** must be 0 px. In a cell with base hits, each 8-connected cluster of differing pixels is listed with:
  - its bounding box;
  - the label key whose quad it intersects;
  - that label's **old quad** (base) and **new quad** (head), or `hidden`;
  - the base pair it was part of.
  The pairing is automatic from the two quad dumps. An unexplained cluster fails the check.

---

## 7. Two-slot emphasis (E6, AC3)

### 7.1 Slots and precedence

- **hover** = `viewer.highlight` (pointer hover, or the navigator's highlight).
- **selected** = the open detail panel (`detailOpenId`), else the **keyboard-focused proxy** (`data-xploder-proxy` under `document.activeElement`, tracked by `focusin`/`focusout` on the wrapper in `TeardownViewer`).
- A label is emphasised if its part id is in `{hover, selected}`. Both slots use **the existing emphasis rendering**, with no new style (brief decision 3):
  - S6: the `emphasisRole` border, plus the existing leader in columns mode, now drawn for each emphasised label;
  - S7/S8 lettering: the existing `numberColor` / `faceNumberColor` / `faceNameColor` / column-row colours.
- **Precedence:** none is needed, because the visual is identical. When both slots hold the same id, it is one emphasis.
- The tour trail still overrides both: it ignores highlight during a tour, as today.

| AC3 clause | hover | selected | Emphasised labels |
|---|---|---|---|
| A open, B hovered | B | A | A + B |
| B left | `null` | A | A |
| Panel closed with the X, pointer elsewhere | `null` | `null` | none |
| Panel closed while hovering A | A | `null` | A |
| Keyboard focus on A's proxy, no panel | A (navigator) | A (focus) | A |
| Keyboard focus on A, mouse hovers B | B | A (focus) | A + B: focus behaves as selected |

**Q8:** the same `{hover, selected}` pair also feeds the 3D tile input (`EmphasisState.selected`, built in `TeardownViewer`, S8; S5 untouched), so tile and label never disagree.

### 7.2 Observables and accessibility

- **DOM observables:**
  - `data-xploder-emphasis="true"` stays on S6 labels (probes read it);
  - new: `data-xploder-emphasis-slot="hover" | "selected" | "hover selected"` on S6 labels and on lettering elements. DOM only, no pixels.
- **Accessibility:** no new announcement.
  - Selected is already announced (`detailOpen` live message, `aria-expanded` on the proxy).
  - Keyboard focus announces the focused button itself.
  - Hover is a pointer-only visual and must not flood the live region.
  - The label layers stay `aria-hidden`.
  - No ARIA, focus-order or live-region change (Q9).

---

## 8. Pass counter and the no-churn check (AC4)

- **Counter:** `labelPass` returns a monotonic `pass` id. `TeardownViewer` writes `data-xploder-label-passes` (the cumulative count) on the wrapper in the same handler. The count has no public event and no API (Q12).
- **One pass per settle:** the probe logs the S15 `settled` CustomEvent mirror together with the counter.
  - Motions: explode, zoom ×5, turn ×4, resize, imploded, project switch.
  - For each motion, the counter must rise by exactly 1 per settle.
  - Hover, panel open/close, scroll, palette toggle, focus moves and a 2 s idle must raise it by 0.
- **No churn:** after each settle, the probe samples every label quad on 60 consecutive rAF frames with the state unchanged. All 60 samples must be identical, and `data-xploder-label-passes` must not change.
- **jsdom test:** `apps/web/test/xploder-dom/label-pass.dom.test.tsx` (unsealed app test, the S14 C4 location). One settled event gives one pass; re-renders with hover, focus or tour props give 0 more; and the renderers receive the same result object.

---

## 9. Re-seal plan (for Murphy's approval at G1)

One surface family per task. Each re-seal commit pairs with the change that needs it. Tags come from a feature-local `seal-tag.sh` (S15 copy, `s6 | s7 | s8`).

| # | Stage | Surface | Files | Reason | Tag |
|---:|---|---|---|---|---|
| 1 | A | S6 | `src/labels/pass.ts` (new; `src/labels` added to `frozen-surface.s6.paths`), `test/label-pass-parity.test.ts`, `test/oracles/labels-s15.ts` | E3: one label model and one pass composing the S6/S7 placers, output-identical | `seal/s6-<sha>` |
| 2 | A | S8 | `src/react/TeardownViewer.tsx`, `src/react/lettering/PartLettering.tsx` | the viewer runs the pass once per settle; the lettering renders its result; pass counter | `seal/s8-<sha>` |
| 3 | A | S6 | `src/react/overlay/BlueprintOverlay.tsx` | the overlay renders the pass's base model | `seal/s6-<sha>` |
| 4 | B | S7 | `src/lettering/place.ts`, `layers.ts`, `model.ts` | optional `obstacles` (extra polygons). Absent → output-identical: the S7 tests stay byte-identical and green. A mark with obstacles and no clear spot → `hidden`. | `seal/s7-<sha>` |
| 5 | B | S6 | `src/labels/pass.ts`, `src/overlay/model.ts` (`tagsModel` takes optional extra obstacles), `test/label-sweep.test.ts` | conflict-gated priority pass (§3.3); the sweep is 0 | `seal/s6-<sha>` |
| 6 | B | S6 | `src/overlay/model.ts` (`overlayStateModel` takes `{hover, selected}`; the old `highlight` call shape kept for the sealed tests), `BlueprintOverlay.tsx` | two emphasis slots in the overlay | `seal/s6-<sha>` |
| 7 | B | S8 | `TeardownViewer.tsx`, `PartLettering.tsx` | hover + selected slots to both label layers; keyboard focus = selected; tile input in sync (Q8) | `seal/s8-<sha>` |

Seven tags. Every manifest note gains `Re-sealed in S16 at <sha>: … ; see .specify/features/label-system/evidence/T0xx-…`. The guard (`guards.sh`, S15 pattern, base `021c1ff`) proves:
- frozen files unchanged;
- S2/S4 manifest + paths, S5 manifest + paths, S3 tool files: **empty diff**;
- every changed sealed path is on the approved list;
- no new dependencies;
- every manifest base has a pushed `seal/*` tag;
- gitleaks clean.

---

## 10. Gate matrix and evidence per AC

| AC | Check | Evidence (`.specify/features/label-system/evidence/`) |
|---|---|---|
| AC1 | browser sweep over §5.2 = 0 hits; model sweep green; seeded control detected | `T0xx-log-sweep-matrix.{json,md}` (all rectangles), `T0xx-log-sweep-control.txt`, `T0xx-log-sweep-unit.txt`, `T0xx-log-crosscheck.md` |
| AC2 | Stage A 0 px + DOM identical; Stage B 0 px where base had 0 hits; clusters explained | `T001-log-parity-noise.md`, `T0xx-log-parity-stageA.md`, `T0xx-log-parity-stageB.md` (cluster table), diff masks for changed cells only, before/after screenshots per cluster |
| AC3 | jsdom assertions for the six §7.1 rows; browser assertions (`data-xploder-emphasis-slot`) | `T0xx-log-emphasis.md`, screenshots light/dark × 390/1440 for "A open + B hover", "B left", "closed", "focus A + hover B" |
| AC4 | +1 per settle, 0 otherwise; 60-frame stability | `T0xx-log-passes.md`, `T0xx-log-churn.md` |
| AC5 | S15 `settle-timing.mjs` method (412×823 @ DPR 1.75, 10 runs, CPU ×1/×4, both projects, explode/zoom/turn), base vs head on the same machine; Node pass benchmark; bundle gzip base vs head; draw calls | `T0xx-log-timing.md`, `T0xx-log-bench.txt`, `T0xx-log-bundle.md`, `T0xx-log-drawcalls.txt` |
| AC6 | 7 required contexts; Lighthouse ×3 routes; CLS; axe; weight; eager probe; seal tags; guards | `T0xx-ci.txt`, `T0xx-ci-required-contexts.json`, `T0xx-lighthouse-summary-*.json`, `T0xx-weight.json`, `T0xx-log-axe.txt`, `T0xx-log-eager.txt`, `T0xx-log-seal-tags.txt`, `T0xx-log-guards.txt` |

**AC5 budget estimate:**
- Stage A adds the pass module but removes one consumer's placer calls;
- Stage B adds the gate, the guarantee filter, the obstacle plumbing and the slot wiring.
- **Estimate:** +0.8 to +1.6 KB gzip, so the +2 KB budget is tight. The bundle is measured at every task (`tools/perf` `bundle-manifest`, read-only). A task that pushes the slice over +2 KB stops and escalates.

---

## 11. Stage 3 outline (Stage 2 formalises)

1. **T001 baselines on `021c1ff`:**
   - two matrix runs (noise floor + base quads + base census of hits, C2);
   - settle timing ×1/×4;
   - bundle;
   - guard dry run.
2. **Stage A:**
   - T002 `labelPass` + oracle parity (S6 #1);
   - T003 viewer runs the pass, lettering consumes it, counter (S8 #2);
   - T004 overlay consumes it (S6 #3);
   - T005 Stage A matrix: 0 px + DOM identical + pass count. **→ [STOP 1]**, wait for "continue".
3. **Stage B:**
   - T006 sweep (unit + browser) + seeded control, red on the seed, census on Stage A;
   - T007 S7 obstacles, output-identical (S7 #4);
   - T008 gated pass, sweep → 0, AC2 cluster report (S6 #5);
   - T009 overlay slots (S6 #6);
   - T010 viewer and lettering slots + focus (S8 #7);
   - T011 timing, bench, bundle, passes, churn;
   - T012 gates, seals, guards, PR.

### Risks

- **Nondeterministic WebGL pixels** would make 0 px unprovable. The two-run noise floor in T001 detects this before any change.
- **Bundle budget** is tight (§10).
- **Matrix runtime** is about 45 min per run (estimate), with at least four runs (two base, Stage A, Stage B).
- **Stage B may hide a label** where the baseline overlapped (mark or note). Each one is listed per cell. Information stays reachable through the navigator proxies and panels.
- **Sealed tests:** S6/S7 public signatures only gain optional parameters, so every sealed test file stays byte-identical.

---

## 12. Open questions (each with a default)

1. **Q1 — module home.** **Default:** new `src/labels/` directory, added to the S6 seal paths. It composes S6 and S7, and S6 already depends on S7. No new public export (`src/index.ts` is S2/S4, and the viewer imports the module internally).
2. **Q2 — where the pass runs.** **Default:** in `TeardownViewer.onOverlay`, once per settle; both renderers become consumers (§3.2). Alternative: a shared memo called from the first consumer. It is harder to prove "exactly one" with it.
3. **Q3 — Stage B policy.** **Default:** conflict-gated, priority P0 → P6 (§3.1, §3.3); the lower priority yields; existing fallbacks; final guarantee filter. Alternative: one greedy pass with all obstacles always on. It is simpler, but it can change states without an overlap (the search node limit, all-or-none rules), which risks AC2.
4. **Q4 — the C4 mode duplication.** **Default:** Stage A reuses the overlay's computation only when `offsetY === 0`. Stage B keeps the lettering's own evaluation too, so nothing outside a conflict changes. It is cheap and never painted.
5. **Q5 — sweep predicate.** **Default:** strict SAT on DOM quads; a pair counts above 1/64 px penetration (the layout unit, the measurement resolution), and touching edges do not count. The model gate uses the same predicate.
6. **Q6 — sweep matrix.** **Default:** §5.2. All six zoom levels (a superset of 1×/2×/3×), scroll = viewer stage scroll with `n/a` at extent 0, fixtures A/B/C, plus `/` hero states as extra cells.
7. **Q7 — what is a label.** **Default:** the §5.1 markers. Leaders, strokes, trace, captions, the hero step label, panels and proxies are not labels.
8. **Q8 — keyboard focus and the tile.** **Default:** focus fills the **selected** slot (strict reading of "behaves as selected", row 6 of §7.1), and the same slots feed the 3D tile input from `TeardownViewer` (S8), so tile and label agree. S5 stays untouched. Alternative: labels only; tiles keep S14 behaviour (focus A + hover B would then light tile B only but labels A + B).
9. **Q9 — announcement.** **Default:** no new live-region message (§7.2).
10. **Q10 — emphasis observable.** **Default:** keep `data-xploder-emphasis="true"`; add `data-xploder-emphasis-slot`.
11. **Q11 — AC5 metric.** **Default:** S15's settle task time and settle delay (the settle task contains the whole pass), base vs head on the same machine, 10 runs, ×1/×4; plus a Node benchmark of the pure pass vs the old two-consumer calls. Placement self time was not attributable on the minified build in S15 (`engine-timing/evidence/T014-log-e8-timing.md`).
12. **Q12 — counter exposure.** **Default:** wrapper attribute `data-xploder-label-passes`; no public event.
13. **Q13 — tooling home.** **Default:** feature-local scripts (`label-matrix.mjs`, `settle-timing.mjs` copy, `guards.sh`, `seal-tag.sh`), with `tools/perf` imported read-only. S3 stays empty.
14. **Q14 — brief defaults.** **Default:** confirm all three: four snaps only, the cluster-explained diff budget, and emphasis reusing the existing style.
15. **Q15 — escalation wording.** **Default:** S15 R9 stands. After two Flash failures, pause and report with 5h/7d usage; the orchestrator finishes the task on Murphy's "go". The finishing tier is reported per task.

---

### WHAT MURPHY SHOULD TEST/VALIDATE

1. Read §2 C2. These are the places where two labels can collide today, found by reading the code. T001 will count which ones actually happen.
2. Optional, 30 s: on `/projects/jev-toolkit`, open a part's panel, then hover another part. Today only the hovered part's **label** lights (its tile and the open one both light). After S16, both labels light.
3. Check the priority list in §3.1: who yields on a conflict (dimension notes first, then marks).

### WHAT THE AGENT NEEDS FROM MURPHY

1. **Approve the re-seal list (§9).** Default: approve as listed (7 tags: S6 ×4, S8 ×2, S7 ×1; no S2/S3/S4/S5 file).
2. **Q8 — keyboard focus = selected, and the tile in sync.** Default: yes, both.
3. **Q3 — conflict-gated Stage B with the §3.1 priorities.** Default: yes.
4. **Q14 — the three brief defaults.** Default: confirm.
5. **Everything else (Q1, Q2, Q4–Q7, Q9–Q13, Q15).** Default: accept as written.

---

## 13. Gate 1 record

**Murphy, 2026-11-16:** "all defaults. go". Every §12 default is accepted (Q1–Q15), including:
- the §9 re-seal list (7 tags: S6 ×4, S8 ×2, S7 ×1; no S2/S3/S4/S5 file);
- keyboard focus = the selected slot, with the tile input in sync (Q8);
- the conflict-gated Stage B with the §3.1 priorities (Q3);
- the three brief defaults (four snaps, every changed cluster explained, existing emphasis style).

**Refinements made in Stage 2 after re-checking the defaults against the code** (Murphy pre-approves improvements at G1; none changes an AC):

- **R1 — the face-quad snapshot gets its own S8 file.** Today `PartLettering.update` projects every top face with `bridge.camera`, `bridge.progress` and a shared `Vector3`. That code moves verbatim into `src/react/labels/faces.ts` (new). `TeardownViewer.onOverlay` calls it, then calls `labelPass`. `src/react/labels` joins `frozen-surface.s8.paths` in re-seal #2. `TeardownViewer.tsx` (already 994 lines) only gains the call.
- **R2 — "no camera yet" keeps today's early return.** If `bridge.camera` or `bridge.progress` is `null` at event time, the pass returns `lettering: null`. `PartLettering.update` then does what it does today in that case: `setMoving(false)` and return, with no new `settled` state. The overlay still receives its base model, as today (the overlay never read the bridge).
- **R3 — an apply-time target check in the overlay (safety net).** §4.2 item 4 argues that the event-time target equals the apply-time target. To keep parity even if that ever fails, `BlueprintOverlay` compares `result.target` with `targetRef.current` when it applies a pending frame. On a mismatch it re-runs `labelPass` with the apply-time target through a viewer callback. That re-run counts as a pass, so AC4's count would expose it. No mismatch is expected; T005 and T011 report the count of these re-runs (expected 0).
- **R4 — the imploded state still computes the lettering.** Today `PartLettering.update` builds lettering for imploded frames too, so the `data-xploder-lettering-count` and `-marks` attributes are set even though nothing is painted. The pass does the same, so the DOM identity check (§4.2 b) holds on imploded cells.
- **R5 — gzip is measured by a feature-local script.** `pnpm bundle:manifest` reports raw bytes only. `bundle-gzip.mjs` (feature dir) sums `zlib.gzipSync(file, { level: 9 })` over every `.js` file under `apps/web/out/_next/static/`, base vs head. AC5 passes when Δ ≤ 2,048 bytes. The raw-byte `bundle:manifest --diff` is attached as well.
- **R6 — S7 gets new entry points, not changed ones.**
  - `letterPart` keeps its exact signature and output. A new `letterPartAvoiding(input & { obstacles })` returns `Lettering | null`: face → mark → `null`, where `null` means hidden.
  - `layerLetteringModel` gains an optional `obstacles` field. When it is present (even empty), each placed face name is appended for the following layers. This is how plate names avoid each other.
  - `compactColumn` is **not** changed. It can only conflict with P0–P3, and §3.1 shows that it never does; on a gate failure it is dropped through its existing `null` path.
  - So every S7 test stays byte-identical.
- **R7 — hidden labels on conflict are dropped from the render lists.**
  - A label hidden by a Stage B fallback or the guarantee step is removed from `result.overlay.labels` (and counted in `hidden`) or from `result.lettering.items`.
  - The CSS hide rules (C5, C7) are untouched.
  - `data-xploder-lettering-count` and `-marks` count what is rendered, as today.
- **R8 — the census is offline.**
  - `label-matrix.mjs` (T001) only collects quads, screenshots and the label DOM.
  - The pair test is a separate pure script, `label-sweep.mjs` (T006), run on the dumps. One sweep implementation therefore yields the S15 census (T001 dumps), the Stage A census and the Stage B result.
  - The browser seeded control (§5.4) is a `--control` mode of `label-matrix.mjs`, added in T006.
- **R9 — home hero cells are sweep-only (Stage 3, before T001).**
  - The `/` hero runs a looping storyboard with a moving trace dot and pulses, so its screenshots are not frame-stable between runs.
  - Pixel parity and DOM identity (AC2) therefore run on the kickoff's parity matrix: both projects plus fixtures A/B/C.
  - The hero's settled states (explode hold, zoom hold) stay in the AC1 sweep as extra cells.
  - `parity-compare.mjs` marks them `sweep-only`.
