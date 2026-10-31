# Implementation Plan: S06 Blueprint Theme Applied

**Feature dir:** `.specify/features/blueprint-theme/` · **Branch:** `task/s06-blueprint-theme` · **Date:** 2026-10-31 · **Inputs:** `spec.md`, `rfc.md` (approved, §9; round-1 refinements R1–R6)

## Summary

`packages/xploder` gains the blueprint visual language as **new modules**. Pure look logic lives in `src/look/`: tokens, sRGB fills, the emphasis decomposition and the product layout default. Pure overlay geometry lives in `src/overlay/`: projection twin, part numbering, dimension lines, label placement and trace routing. The React/three adapters are `scene/blueprintMaterial.ts`, `scene/OverlayProjector.tsx`, `overlay/BlueprintOverlay.tsx` and `overlay/CircuitTrace.tsx`. The mount points `Slabs`, `Scene` and `TeardownViewer` change **additively**: internal props only, and `TeardownViewerProps` is unchanged (R5). Without the `look` prop, `Slabs` renders exactly as S5 did, so S4's `scene.test.tsx` and every S5 test stay untouched and green. The S2/S4 manifest stays byte-identical. A new S5 manifest seals S5's modules. Rendering stays at **2 draw calls**: edges, fills and face shading live in a patched `MeshLambertMaterial` shader, and the overlay and trace are DOM/SVG. `apps/web` drops the playground's `explodedGap` override so the product default (2.0) is what every screenshot shows, and adds a CSS drafting grid. `tools/perf` gains S6 probe groups.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict (`noUncheckedIndexedAccess`), React 19.3, Next 16.4 static export, Node 24 |
| New deps | **None.** three 0.186.1, R3F 9.8, `@react-three/test-renderer`, Playwright (tools/perf) are already present. |
| Renderer | unchanged R3F `<Canvas orthographic frameloop="demand" dpr={[1, 2]}>`; same 2 `InstancedMesh`; materials stay `MeshLambertMaterial`, patched via `onBeforeCompile` |
| Shader chunks (verified in `three@0.186.1` `meshlambert.glsl.js`) | vertex `#include <color_vertex>` (sets `vec4 vColor`, multiplied by `instanceColor` under `USE_INSTANCING_COLOR`); fragment `#include <color_fragment>`, `#include <normal_fragment_begin>` (declares view-space `normal`), `#include <opaque_fragment>` (`gl_FragColor = vec4(outgoingLight, diffuseColor.a)`) |
| Tests | vitest (Node): pure logic + `@react-three/test-renderer` scenes. Real browser: `engine:probe`, `evidence`, `fps:engine` (Playwright). |
| Targets | 2 draw calls; 0 dropped frames over ≥ 5 s while a tour plays (band as liveness); 0 overlay layout shifts; 0 hidden labels at default zoom |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`; the S2/S4 and S5 surfaces listed under "Guards" |
| Time base | seconds from `performance.now() / 1000` (the `Scene` `now`), injectable for tests |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-006 quote AC1–AC6 verbatim. Supporting work maps to brief deliverables 1–7 only. No panel, no new hover/tap behaviour, no schema/API change. |
| II. Static-only shell | No server code. The playground stays a dev-only static client page. |
| III. Performance is a feature | No extra draw call; no texture; the demand loop idles at rest; overlay layout runs only at settle; the per-frame projector does O(instances) work with no allocation and only inside frames that already render. The landing bundle is unaffected (the viewer is not in the production graph). |
| IV. Single motion source | Overlay fade on `hoverSettle` + `easings.hover`; trace draw-in and signal dot on `tourPulse` / `easings.tourPulse` / `staggers.tourStep`; WAAPI with token-derived milliseconds (S5 `TourCaption` pattern). Look tokens hold no timing. Scanners cover every new file (non-vacuity). |
| V. Theme integrity | Every colour is a palette **role** resolved from the active `Palette`. No hex outside `theme/`; GLSL contains no colour literal. One code path for both palettes; future single-palette themes reuse it. |
| VI. Evidence over assertion | Every visual/motion claim attaches screenshots, `engine-probe.json` or `fps.json` per `.specify/EVIDENCE.md`. |
| VII. No secrets | No new secrets. Evidence holds `127.0.0.1` URLs only. |

## Project Structure

### Documentation (this feature)

```text
.specify/features/blueprint-theme/
  rfc.md  spec.md  plan.md  tasks.md
  evidence/   RFC-log-*.txt, T0NN-*.{txt,png,json}, AC-selfcheck.md
```

### Source code (changes only)

```text
packages/xploder/
  src/
    look/                                NEW, pure, no three/React
      tokens.ts                          look tokens (LookTokens type)                          (T001)
      fills.ts                           mixSrgb, kindFill, layerFill, highlightFill, decomposeEmphasis (T002)
      product.ts                         VIEWER_LAYOUT_DEFAULTS, resolveViewerLayoutOptions      (T003)
    overlay/                             NEW, pure, no three/React
      project.ts                         projectPoint, overlayFrame (pure projection twin)       (T004)
      parts.ts                           partNumber, layerNumber, label texts, label box model   (T004)
      dimension.ts                       stackDimension, footprintDimension                      (T004)
      place.ts                           placeLabels (greedy, SAT obstacles)                     (T005)
      trace.ts                           traceRoute, octilinearHop                               (T006)
      timing.ts                          milliseconds, overlayTiming, traceTiming (token-derived ms) (T006)
      model.ts                           overlayModel: visibility rules + placement → render model (T009)
    react/
      scene/blueprintMaterial.ts         NEW: patchBlueprintMaterial(material, uniforms)         (T007)
      scene/OverlayProjector.tsx         NEW: useFrame projection, signature, settle             (T008)
      overlay/BlueprintOverlay.tsx       NEW: labels + leaders + dimensions (HTML + SVG)         (T009)
      overlay/CircuitTrace.tsx           NEW: trace SVG + WAAPI + static twin                    (T010)
      scene/Slabs.tsx                    ADDITIVE: optional `look`, `kinds`; instanceFill; uniforms (T007)
      scene/Scene.tsx                    ADDITIVE: optional `look`, `kinds`, overlay callbacks   (T007, T008)
      TeardownViewer.tsx                 ADDITIVE: product layout default, look + kinds, overlay mount, data-* (T007–T010)
  test/
    frozen-surface.s5.paths  frozen-surface.s5.manifest.json  frozen-surface.generate-s5.sh     (T001)
    frozen-surface.test.ts               EXTENDED: second describe for the S5 manifest           (T001)
    look-tokens.test.ts  look-fills.test.ts  product-gap.test.ts                                 (T001–T003)
    overlay-project.test.ts  overlay-parts.test.ts  overlay-dimension.test.ts                    (T004)
    overlay-place.test.ts  overlay-trace.test.ts                                                (T005, T006)
    blueprint-scene.test.tsx  overlay-projector.test.tsx                                         (T007, T008)
    overlay-model.test.ts  overlay-timing.test.ts                                                (T006, T009)

apps/web/
  app/dev/engine/engine-playground.tsx  override removed; drafting-grid backdrop; `annotations` evidence params (T011)
  test/no-color-literals.test.ts        non-vacuity += S6 files                                 (T011)
  test/no-motion-literals.test.ts       non-vacuity += S6 files                                 (T011)
  test/package-consumer.test.ts         engine identifiers += onBeforeCompile instanceFill       (T011)

tools/perf/
  src/engine-probe.ts                   S6 observation types + checks                           (T012)
  src/cli/engine-probe.ts               S6 drive script                                         (T012)
  test/engine-probe.test.ts             S6 evaluation tests                                     (T012)
```

Nothing in S2/S4/S5 is moved or renamed. `packages/xploder/package.json` and `react/index.ts` are unchanged (no new export, no new dep).

## Guards (every task)

```sh
git diff --quiet bb6a514 -- .specify/slices .specify/KICKOFF-S06.md && echo FROZEN-OK
git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK   # from T001 on
test -z "$(git log --oneline bb6a514..HEAD -- .specify/slices .specify/KICKOFF-S06.md)" && echo BRIEF-HISTORY-OK
```

**S5 frozen surface** (`frozen-surface.s5.paths`, base `f31600e`; directories expand at generation time): `src/interaction/` · `src/motion/emphasis.ts` · `src/react/scene/Emphasis.tsx` `src/react/scene/PickBridge.tsx` `src/react/scene/ViewScroll.tsx` · `src/react/overlay/TourCaption.tsx` · `src/react/usePointerPick.ts` `src/react/useTourClock.ts` `src/react/useTeardownViewer.ts` · `test/fixtures/project-c-lockerbay.json` · `test/{pick,pick-scene,pointer,focus,tour,tour-clock,emphasis,emphasis-scene,emphasis-tokens,caption,fixture-c,scroll,view-scroll,viewer-handle}.test.ts[x]` · `test/__snapshots__/fixture-c.test.ts.snap` (if present at base). **Excluded mount points:** `Slabs.tsx`, `Scene.tsx`, `TeardownViewer.tsx`, `react/index.ts`, `test/fixtures/index.ts`, `test/frozen-surface.*`.

Before every gate the orchestrator runs the four guard lines above and expects every OK (S4 lesson: foreign commits to the brief).

## Look tokens (`src/look/tokens.ts`, internal)

```ts
import type { ComponentKind, TechCategory } from '../schema/constants';
import type { PaletteRole } from '../theme';

export type RoleRef = PaletteRole | `tech.${TechCategory}`;

export interface LookTokens {
  readonly edge: { readonly componentPx: number; readonly layerPx: number; readonly role: 'line' };
  readonly fill: { readonly base: PaletteRole; readonly wash: number; readonly highlightWash: number };
  readonly faces: { readonly top: number; readonly left: number; readonly right: number };
  readonly layer: { readonly wash: number };
  readonly kind: Readonly<Record<ComponentKind, RoleRef>>;
  readonly annotation: {
    readonly fontPx: number; readonly gapPx: number; readonly padXPx: number; readonly padYPx: number;
    readonly charEm: number; readonly lineEm: number; readonly wideMinPx: number;
    readonly textRole: PaletteRole; readonly partRole: PaletteRole; readonly dimensionRole: PaletteRole;
    readonly leaderRole: PaletteRole; readonly balloonRole: PaletteRole; readonly balloonFillRole: PaletteRole;
  };
  readonly trace: {
    readonly role: PaletteRole; readonly casingRole: PaletteRole;
    readonly strokePx: number; readonly casingPx: number; readonly padPx: number;
  };
}

export const look = {
  edge: { componentPx: 1, layerPx: 1, role: 'line' },
  fill: { base: 'surface', wash: 0.18, highlightWash: 0.4 },
  faces: { top: 0, left: 0.06, right: 0.12 },
  layer: { wash: 0.1 },
  kind: { module: 'line', service: 'tech.framework', store: 'tech.storage', external: 'steel', actor: 'tech.tooling' },
  annotation: {
    fontPx: 12, gapPx: 4, padXPx: 4, padYPx: 2, charEm: 0.62, lineEm: 1.4, wideMinPx: 768,
    textRole: 'label', partRole: 'ink', dimensionRole: 'steel',
    leaderRole: 'lineMuted', balloonRole: 'line', balloonFillRole: 'surface',
  },
  trace: { role: 'accent', casingRole: 'paper', strokePx: 2, casingPx: 2, padPx: 3 },
} as const satisfies LookTokens;
```

`resolveRole(palette, ref)` (in `fills.ts`) maps `'tech.storage'` → `palette.tech.storage`, otherwise `palette[ref]`. Types import from `schema/constants` and `theme` (read-only use of frozen modules).

## Fills and emphasis decomposition (`src/look/fills.ts`, pure)

- `type Rgb = readonly [number, number, number]` (linear, 0..1). `hexToLinear(hex)` and `linearToSrgb` are local helpers (the hex **strings** come from the palette object, so there is no literal in source).
- `mixSrgb(a: string, b: string, t: number): Rgb`: decode both to sRGB 0..1, mix per channel in sRGB, return **linear** (what three's `Color` stores for a hex in the sRGB working space).
- `kindFill(palette, kind) = mixSrgb(palette[look.fill.base], resolveRole(palette, look.kind[kind]), look.fill.wash)`; `layerFill(palette) = mixSrgb(surface, lineMuted, look.layer.wash)`; `highlightFill(palette) = mixSrgb(surface, accent, look.fill.highlightWash)`.
- `decomposeEmphasis(ratio: Rgb, base: Rgb, accent: Rgb, paper: Rgb): { t: number; p: number }`: `E = base ⊙ ratio`, `u = E − base`, `a = accent − base`, `b = paper − base`; solve `[a·a a·b; a·b b·b] [α β]ᵀ = [a·u b·u]ᵀ`; `p = clamp(β, 0, 1)`; `t = p < 0.999 ? clamp(α / (1 − p), 0, 1) : 0`. **The GLSL in `blueprintMaterial.ts` mirrors this line by line.**
- `parityReport(palette)` returns the numbers the parity test asserts: text roles vs `paper` contrast, `lineMuted` (leaders) and `accent` (trace) vs `paper`, edge vs each kind fill contrast, highlight-fill ΔE vs each kind fill, smallest pairwise kind ΔE (CIE76).

## Product layout default (`src/look/product.ts`)

```ts
import type { LayoutOptions } from '../layout';
export const VIEWER_LAYOUT_DEFAULTS = { explodedGap: 2 } as const satisfies Partial<LayoutOptions>;
export function resolveViewerLayoutOptions(options?: Partial<LayoutOptions>): Partial<LayoutOptions> {
  return { ...VIEWER_LAYOUT_DEFAULTS, ...options };
}
```

`TeardownViewer`: `const options = useMemo(() => resolveViewerLayoutOptions(layoutOptions), [layoutOptions])`, then `layoutProject(project, options)`. xploder has no `react-dom`, so `TeardownViewer`'s DOM can't be rendered in Node. The wiring is proved by the pure function's test, a source assertion in `product-gap.test.ts` that `TeardownViewer.tsx` calls `resolveViewerLayoutOptions(`, and the probe's default-gap hit map on the override-free playground. An explicit consumer value still wins. `LAYOUT_DEFAULTS` (S4) is untouched.

## Blueprint material (`scene/blueprintMaterial.ts` + additive `Slabs`) — RFC D3

- `patchBlueprintMaterial(material: MeshLambertMaterial, uniforms: BlueprintUniforms): void` sets `material.onBeforeCompile` and `material.customProgramCacheKey = () => 'xploder-blueprint-1'`. `uniforms` holds `uBase: { value: material.color }` (**the same `Color` object**, so S5/S4 colour updates flow through), `uAccent`, `uPaper`, `uHighlightFill` (`Color`, linear), `uFaces` (`Vector3`), `uEdgePx` (`number`).
- **Vertex**: declare `attribute vec3 instanceFill; uniform vec3 uBase, uAccent, uPaper; varying vec3 vFill; varying vec2 vBoxUv; varying float vTop; varying vec2 vEmphasis;`. After `#include <color_vertex>`: `vFill = instanceFill; vBoxUv = uv; vTop = step(0.5, normal.y);` then the decomposition from `vColor.rgb` (it equals `instanceColor` here). Guard the solve with `max(det, 1e-8)`.
- **Fragment**: declare `uniform vec3 uHighlightFill, uPaper; uniform vec3 uFaces; uniform float uEdgePx;` + the varyings. Replace `#include <opaque_fragment>` with:
  ```glsl
  vec3 edgeInk = diffuseColor.rgb;                       // = diffuse * vColor = S5's colour E
  vec3 fill = mix(mix(vFill, uHighlightFill, vEmphasis.x), uPaper, vEmphasis.y);
  float face = vTop > 0.5 ? uFaces.x : (normal.x < 0.0 ? uFaces.y : uFaces.z);
  fill = mix(fill, edgeInk, face);
  vec2 w = max(fwidth(vBoxUv), vec2(1e-6));
  vec2 d2 = min(vBoxUv, 1.0 - vBoxUv) / w;
  float edge = 1.0 - smoothstep(uEdgePx - 0.5, uEdgePx + 0.5, min(d2.x, d2.y));
  gl_FragColor = vec4(mix(fill, edgeInk, edge), 1.0);
  ```
  `#include <colorspace_fragment>` still runs after it, so the output encoding is unchanged.
- **`Slabs` (additive):** new optional props `look?: BlueprintLookInput` (`{ palette, tokens: typeof look }`) and `kinds?: readonly ComponentKind[]` (aligned with `layout.components`). When `look` is present:
  - patch both materials once (`useMemo`);
  - in the existing colour-buffer layout effect (before first compile), also allocate `instanceFill` (`InstancedBufferAttribute(Float32Array(n × 3), 3)`) on both meshes and fill it: layers ← `layerFill`, components ← `kindFill(kinds[i] ?? 'module')`;
  - on palette change, rewrite `instanceFill`, `uAccent`, `uPaper`, `uHighlightFill` and invalidate;
  - each frame, set `uEdgePx = look.edge.*Px × viewport.dpr` (no invalidate of its own).

  With `look` absent, nothing above runs (S5-identical output; asserted in `blueprint-scene.test.tsx`).
- **`Scene` (additive):** passes `look`/`kinds` through. **`TeardownViewer`:** always passes `look = { palette: resolvedPalette, tokens: look }` and `kinds` derived from `project.layers.flatMap(l => l.components.map(c => c.kind))` (the same order `layoutProject` uses).

## Overlay architecture — RFC D6

### Projection (`overlay/project.ts`, pure twin) and `OverlayProjector.tsx`

- Pure: `projectPoint(p: Vec3, view: { azimuth, zoom, width, height }) → Vec2` using the S4 basis (`right = (cos θ, 0, −sin θ)`, `up = (−sin φ sin θ, cos φ, −sin φ cos θ)`, camera looking at the origin; `x = W/2 + zoom·(p·right)`, `y = H/2 − zoom·(p·up)`). `overlayFrame(layout, progress, view) → OverlayFrame`: each layer's 4 top corners; each component's top-face centre (rest position at the given progress, no lift) and its silhouette hull (convex hull of the 8 projected corners).
- R3F: `OverlayProjector` (`useFrame`) builds the same frame from the **real camera** (`Vector3.project`, NDC → CSS px), then adds `camera.view?.offsetY ?? 0` to y, so coordinates are content-space. It computes `signature = hash(camera.matrixWorld, camera.zoom, size.width, size.height, progress[])`:
  - signature changed vs the previous frame → `onOverlay({ kind: 'moving' })` and `invalidate()` once;
  - unchanged and the previous state was moving (or first frame) → `onOverlay({ kind: 'settled', frame })`;
  - every frame: if `offsetY` changed → `onOverlayScroll(offsetY)` (imperative, no React render).
- **Closed loop:** `overlay-projector.test.tsx` renders `Scene` with the real `CameraRig` (test-renderer) and asserts the projector's frame equals `overlayFrame(...)` from the pure twin within 0.5 px for 4 azimuths × both states. That licenses the Node placement matrix (T005) to use the pure twin.

### Parts, dimensions, labels (`parts.ts`, `dimension.ts`)

- `layerNumber(i) = i + 1`; `partNumber(layerIndex, slot) = \`${layerIndex + 1}.${slot + 1}\``; layer text `\`${n} ${layer.name}\``; part long text `\`${n.m} ${component.name}\``, short text `n.m`.
- `labelBox(text, look.annotation) = { w: ceil(chars × charEm × fontPx) + 2 × padXPx, h: ceil(lineEm × fontPx) + 2 × padYPx }` (R1). The DOM label gets exactly this `width`/`height`, `box-sizing: border-box`, `white-space: nowrap`, `overflow: hidden`, `font: fontPx/lineEm var(--font-mono, ui-monospace, monospace)`.
- `stackDimension(frame)`: rail x = min over layers of the leftmost corner x − 12 px; from the top layer's leftmost corner y to the bottom layer's; a tick per layer; extension lines from each corner to the rail; `labelAnchor` = rail midpoint; text `\`${layers} layers\``.
- `footprintDimension(frame, footprint)`: along the bottom layer's lower-left edge (the edge between its leftmost and lowest corners), offset 12 px outward along the edge normal; slash ticks at both ends; extension lines; `labelAnchor` = offset-edge midpoint; text `\`${cols} × ${rows}\``.

### Placement (`place.ts`, pure) — RFC D7, R1, R2

- `placeLabels(labels, obstacles: Vec2[][] /* component hulls */, viewport: { width, height }, look) → { placements, hidden: string[], fellBack: string[] }`.
- Order: layer labels (top → bottom), parts (layer, slot), dimension labels. Candidates: radii `[8, 20, 36, 56]` × directions; preference: layer `W, NW, SW, N, S, NE, E, SE`; part `NE, N, NW, E, W, SE, S, SW`; dimension `W, E, S, N, SW, NW, SE, NE`. Box offset so its nearest edge sits at the radius in that direction.
- Accept when: the box inset by `gapPx` lies inside `[4, W − 4] × [4, H − 4]` **in viewport space** (content y − offsetY at layout time; at default zoom offsetY = 0); it intersects no obstacle hull (SAT, box inflated by `gapPx`); it intersects no placed box (inflated by `gapPx`). R2: a part whose long box fails every candidate retries with its short box (`fellBack`). If that still fails → `hidden`.
- Labels whose anchor is outside the viewport are hidden up front (zoomed case), not counted as failures (`offscreen` list).
- Leader: from the anchor to the nearest point of the box when the radius is > 8 px.

### `overlay/model.ts` (pure) + `BlueprintOverlay.tsx` (thin DOM renderer)

- `overlayModel({ frame, project, layout, viewport, target, tour, focus, look }) → { labels: { key, layerIndex, x, y, w, h, text, srText?, role, variant, opacity }[], strokes: { kind, points, role }[], hidden: number, shown: boolean }`. It applies the visibility rules below, builds the label list (`parts.ts`), runs `placeLabels`, and adds dimension and leader strokes. All decisions live here and are unit-tested in Node (`overlay-model.test.ts`). The React component only maps the model to elements.

`BlueprintOverlay.tsx` is mounted in `TeardownViewer` inside `data-xploder-canvas-viewport`, after `<Canvas>`:


- Root: `<div data-xploder-overlay="hidden|shown" data-xploder-overlay-hidden="n" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity }}>`. Inner group `transform: translateY(-offsetY px)` written imperatively by `onOverlayScroll`.
- One `<svg aria-hidden="true" width height>` (content-space, `overflow: visible`) for leaders, ticks, extension lines and dimension lines (strokes from roles, 1 px, `vector-effect: non-scaling-stroke`).
- Label elements: `<span data-xploder-label="layer:<id>" …>` absolutely positioned via `transform: translate(x px, y px)`, `pointer-events: auto`, `user-select: text`, colours from roles (`textRole` layers, `partRole` + `balloonRole` border + `balloonFillRole` background for parts with `border-radius: 999px`, `dimensionRole` dims), uppercase via `text-transform` for layers. Narrow viewports (< `wideMinPx`): parts render the short text plus a visually hidden span with the name.
- Labels render from mount (opacity 0 until the first settle; crawlable). State: `moving` → opacity 0 instantly (no transition); `settled` → run `placeLabels`, render once, fade to 1 via WAAPI `{ opacity: [0, 1] }` with `overlayTiming(tokens).fadeMs` and `easings.hover.css` (skipped when the duration is 0). S5's `milliseconds` helper is private to the sealed `TourCaption.tsx`, so `overlay/timing.ts` defines its own `milliseconds` with a named `MILLISECONDS_PER_SECOND` constant, the same pattern S5 used.
- Visibility rules: `tour.status !== 'idle'` → labels, parts and dims hidden (the trace shows); imploded (`target === 'imploded'` and settled) → parts hidden; focus → elements of non-focused layers get `opacity = emphasis.dim.level` (S5 token, read-only), transition on `hoverSettle` / `easings.hover`.

## Circuit trace (`overlay/trace.ts` + `overlay/CircuitTrace.tsx`) — RFC D8, R4

- `octilinearHop(p, q) → Vec2[]`: `dx = q.x − p.x`, `dy = q.y − p.y`; if `|dy| ≥ |dx|`: `[p, (p.x, q.y − sign(dy)·|dx|), q]`; else `[p, (q.x − sign(dx)·|dy|, p.y), q]` (zero-length segments dropped).
- `traceRoute(path: string[], step: number, anchors: Map<string, Vec2>) → { vertices, points, hops }`: `vertices = path.slice(0, step + 1)` (ids missing from `anchors` throw: impossible for parsed projects); `hops[i] = octilinearHop(anchor(v[i]), anchor(v[i + 1]))`.
- `overlay/timing.ts`: `milliseconds(s)`; `overlayTiming(tokens) → { fadeMs }` from `hoverSettle`; `traceTiming(tokens) → { drawMs, delayMs, dotPeriodMs }` from `tourPulse`, `tourStep`, `2 × tourPulse` (all 0 under the static twin).
- `CircuitTrace` renders inside the overlay `<svg>` only while `tour.status !== 'idle'` and the overlay is settled: a casing polyline (`casingRole`, width `strokePx + 2 × casingPx`), the trace polyline (`role`, `strokePx`), a pad `<circle r=padPx>` per vertex, a ring on the current vertex. A **step change** animates the newest hop with `stroke-dasharray: L; stroke-dashoffset: [L, 0]` (WAAPI, `drawMs`, `delayMs`, `easings.tourPulse.css`). While `status === 'playing'`, a dot path (`stroke-dasharray: 0 L`, round cap) animates `stroke-dashoffset` along the newest hop with `iterations: Infinity`, `duration: dotPeriodMs`. A settle after geometry motion re-routes without replaying the draw-in (R4). With a duration of 0, nothing is animated and the final state is drawn in the same render.
- Wrapper attribute `data-xploder-trace = vertices.join(' ')` (empty string when idle).

## Data flow

`usePalette()` → `TeardownViewer` → `Scene look/kinds` → `Slabs`: `instanceFill` + uniforms → patched Lambert (edges, faces, `(t, p)` from S5 `instanceColor`) · `layout = layoutProject(project, { ...VIEWER_LAYOUT_DEFAULTS, ...layoutOptions })` · `OverlayProjector (useFrame)` → `moving | settled(frame)` + `scroll(offsetY)` → `BlueprintOverlay`: `placeLabels(frame)` → HTML labels + SVG strokes · `viewer.tour` + `viewer.focus` → visibility · `traceRoute(flow.path, step, anchors)` → `CircuitTrace` (WAAPI on token ms).

## Playground (`apps/web/app/dev/engine/engine-playground.tsx`)

- Remove `PLAYGROUND_LAYOUT_OPTIONS` and the `layoutOptions` prop (the product default applies).
- Stage backdrop: a CSS drafting grid from `var(--color-grid)` (the S1 home-page gradient pattern), behind the transparent canvas. Theme-aware through the S1 variables, with no literal.
- No new controls. The existing URL params (`fixture`, `state`, `highlight`, `focus`, `flow`, `tour`, `step`, `loop`, `cycle`) cover the evidence states.

## Scanners (`apps/web/test`)

- `no-color-literals` and `no-motion-literals`: add every S6 file to the non-vacuity lists (`look/*.ts`, `overlay/*.ts`, `scene/blueprintMaterial.ts`, `scene/OverlayProjector.tsx`, `overlay/BlueprintOverlay.tsx`, `overlay/CircuitTrace.tsx`). GLSL source is scanned as text.
- `package-consumer`: forbidden engine identifiers in `apps/web/app` += `onBeforeCompile`, `instanceFill`, `placeLabels`, `traceRoute`.

## Evidence CLIs (`tools/perf`) — RFC D12

`engine-probe` S6 groups (S4/S5 checks unchanged and still required):

| Check | Pass rule |
|---|---|
| `bp-pixel-fill-light` / `-dark` / `-os-dark` | sampled top-face pixel of a known component within ΔE ≤ 3 of its token kind fill (sRGB); edge pixel within ΔE ≤ 6 of `line`; `-os-dark` uses `colorScheme: 'dark'` with empty storage, first screenshot |
| `bp-toggle-switches` | after a toggle, the fill sample moves to the other palette's value |
| `overlay-shown-default` | `[data-xploder-overlay="shown"]` and `data-xploder-overlay-hidden="0"` at default zoom for A/B/C, both states, 390×844 and 1280×800 |
| `overlay-360-boxes` | at 360×740: every label box inside the viewer, no pairwise intersections, computed font-size ≥ 12 px |
| `overlay-selectable` | Selection API round trip returns a label's text; `user-select ≠ none` |
| `overlay-colors-light` / `-dark` | computed label colours = role tokens |
| `overlay-hit-through` | hovering a component adjacent to a label highlights it; tapping a label clears an active tap highlight |
| `overlay-cls-zero` | zero `layout-shift` entries with a source inside `[data-xploder-overlay]`, load + interaction, both themes |
| `trace-order-<fixture>-<flow>` | at each step `data-xploder-trace` = `path.slice(0, step + 1).join(' ')`, A×2, C×2 |
| `trace-stop-clears` | `data-xploder-trace` empty after stop |
| `rm-trace-static` | reduced motion: no overlay animations (`getAnimations()` filtered to the overlay = 0) and 1 frame per step |
| `default-gap-hitmap-a` / `-c` | no `layoutOptions`: hit map at 45° exploded hits every component |
| `draw-calls-mid-tour` | `fixture-a` draw calls = 2 while the tour plays |

## Test map

| File | Covers |
|---|---|
| `look-tokens.test.ts` | roles resolve in both palettes; numeric ranges (0 < wash < 1, faces ascending, px > 0, fontPx ≥ 12) |
| `look-fills.test.ts` | `mixSrgb` maths; kind/layer/highlight fills; parity table both palettes (text ≥ 4.5, strokes ≥ 3, edge vs fill ≥ 3, highlight ΔE ≥ 10, kind ΔE ≥ 3); `decomposeEmphasis` round trip vs S5 composition (random t, p; both palettes; both base roles) |
| `product-gap.test.ts` | `VIEWER_LAYOUT_DEFAULTS.explodedGap === 2`; `resolveViewerLayoutOptions()` → 2, `({ explodedGap: 1.1 })` → 1.1; `TeardownViewer.tsx` source calls `resolveViewerLayoutOptions(`; occlusion ≥ 50% at 45° and every snap for every A and C component (pure picker grid, step 0.02) |
| `overlay-project/parts/dimension.test.ts` | projection maths; hulls; part numbers; label box model; dimension geometry (rail left of all corners, ticks per layer, edge offset outward) |
| `overlay-place.test.ts` | the D7 matrix: 0 hidden, 0 overlaps, inside, no obstacle hit; determinism; zoomed off-screen hiding; R2 fallback count reported |
| `overlay-trace.test.ts` | path-prefix order for every step of A×2, B, C×2; octilinear hops (each segment axis-aligned or 45°); timing from tokens; static twin = 0 |
| `blueprint-scene.test.tsx` | with `look`: `MeshLambertMaterial`, S4 colours, `onBeforeCompile` + cache key, patched shader source contains the S6 markers when run on r186's Lambert shader, `instanceFill` present at mount with kind fills, 2 `InstancedMesh`; without `look`: no patch, no `instanceFill` |
| `overlay-projector.test.tsx` | closed loop vs the real rig camera; moving → settled sequence; scroll callback without relayout |
| `overlay-model.test.ts` | visibility rules (tour hides annotations; imploded hides parts; focus dims non-focused layers to `emphasis.dim.level`); narrow vs wide part text + `srText`; boxes = the size model; `hidden` count; strokes per dimension/leader |
| `overlay-timing.test.ts` | `milliseconds`; fade/draw/delay/dot values from tokens; all 0 under `resolveMotion(true)` |
| `frozen-surface.test.ts` | both manifests; non-vacuity for S5 (`src/interaction/tour.ts`, `src/react/scene/Emphasis.tsx`, `test/tour.test.ts`) |

## Phase groups (Stage 3 STOP points)

- **G1 pure core:** T001–T006 → STOP (log bundle + S5 diff log).
- **G2 renderer + overlay + playground:** T007–T011 (⚑ push + draft PR at T011) → STOP. Murphy's visual check in Orca's browser (`pnpm dev`); look tokens tuned here, once.
- **G3 evidence:** T012–T015 → STOP.
- **G4 ship:** T016 → STOP + AC self-check table.

## Complexity Tracking

| Choice | Why the simpler alternative was rejected |
|---|---|
| Recovering S5's `(t, p)` in the vertex shader | Editing `Emphasis.tsx` to export weights would break the S5 seal (AC6). An extra emphasis attribute would duplicate S5's channel logic. |
| Pure projection twin + closed-loop test | Placement must be testable in Node (readability matrix). The closed loop proves the twin equals the real camera. |
| Settle-then-layout instead of per-frame tracking | Per-frame label tracking collides mid-turn and costs DOM writes every frame during tweens. |
| Box-size model instead of DOM measurement (R1) | Measurement makes the browser layout differ from the tested layout. The model guarantees test = runtime. |
