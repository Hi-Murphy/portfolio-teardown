# RFC — S06 Blueprint Theme Applied

**slice:** S06-blueprint-theme · **status:** DRAFT for Murphy review (Stage 1) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-06-blueprint-theme.md` (frozen brief v1) · **branch:** `task/s06-blueprint-theme` · **base:** `bb6a514` (brief freeze; S5 shipped at `524a6cd` + `f31600e`) · **date:** 2026-10-31

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict should be raised as an open question.

---

## 1. Context (from the brief)

- **Mission:** turn the token-fed base materials into the portfolio's **blueprint drafting-table visual language**: a light default and a dark alternate, edge lines, dimension and callout language, and a circuit-trace tour highlight. S4/S5 behaviour, performance and accessibility are preserved. **No new interaction capabilities, panels, or site shell.**
- **Live from S4/S5:** auto-layout, explode/implode, orthographic camera, snap rotate, bounded zoom plus vertical scroll when zoomed (S5 AC7, `setViewOffset`), hover/tap highlight, layer focus, guided tours, reduced-motion states, HTML tour captions. There are 2 draw calls, and the full PR gates are green.
- **Live from S2/S3:** palette, theme and motion tokens; no hardcoded hex, duration or easing literals (enforced by grep); evidence gates.
- **Theme target:** light = warm paper-white background, ink-blue lines, steel/cyan accents, charcoal mono labels. Dark = deep navy background, light/cyan lines, the same semantic accents. The S1 toggle, OS preference and no-flash behaviour stay intact. Blueprint is the only theme with two palettes; future themes have one.
- **Carry-overs:** the `explodedGap` product default is decided here (S5 F6). Click/tap details are deferred to S7 (no panel here). Live-region first-step polish is deferred to S8.
- **Non-goals (hard):** detail/case-study/tech panels (S7) · new hover/tap behaviour · a11y live-region polish (S8) · site shell or landing routes (S10) · real content (S9) · pixel/papercraft theme · schema/API changes · camera-rig changes · replacing the token system.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | light default and dark alternate render the blueprint palette with toggle + OS preference/no-flash preserved; palette colors come only from tokens (hex exclusivity green). |
| AC2 | slabs have crisp blueprint edge/outline treatment and semantic category accents; no texture assets; 2 draw calls on fixture A remain. |
| AC3 | layer labels, part numbers, and dimension/callout overlays are selectable HTML/SVG, readable at 360px+, and do not contribute CLS; screenshots prove light+dark readability. |
| AC4 | tour circuit trace/pulse follows actual flow component order; reduced-motion produces an instant/static equivalent; motion exclusivity green. |
| AC5 | product `explodedGap` is explicitly decided in RFC; default-angle evidence shows all required fixture A/C components reachable/visible; S5 zoom-scroll AC7 remains green (top+bottom max-zoom evidence). |
| AC6 | full CI green on PR (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); S2/S4/S5 frozen-surface checks remain empty; zero CLS contribution from theme overlays. |

### Starting point (checked on this branch at `bb6a514`)

| Item | State |
|---|---|
| Palette tokens | `src/theme/blueprint.ts` **already defines** `blueprint.light` and `blueprint.dark`: roles `paper surface grid line lineMuted ink label accent steel` plus `tech.*` (8 categories). The light/dark values already match the brief's description. `paletteCss()` emits `--bp-*` variables, the S1 head script sets `.light`/`.dark` before paint, and `usePalette` (S4) follows the class. **S6 needs no new colour tokens** (F1). |
| Renderer | `Slabs.tsx` has **2 `InstancedMesh`es** (layers, components) sharing one unit `BoxGeometry` and `MeshLambertMaterial` (`color` = `lineMuted` / `line`), lit by the frozen `Lights.tsx`. S5 added `instanceColor` as a **per-channel multiplier** on the role colour (`target ⊘ base`, emphasis). `frameloop="demand"`. |
| Frozen guard | `test/frozen-surface.manifest.json` (base `53b2b2b`) hashes the **S2 + S4** surface: `src/schema/**`, `parse.ts`, `errors.ts`, `index.ts`, `src/theme/**`, `motion/index.ts`, `motion/ease.ts`, `src/layout/**`, `src/engine/**`, `CameraRig.tsx`, `Lights.tsx`, `Stats.tsx`, `env.ts`, `usePalette.ts`, `useReducedMotion.ts`, fixtures A/B + registry, S4 tests and snapshots, and `package.json`. **No S5 manifest exists** (F2). |
| S4 frozen test | `test/scene.test.tsx` asserts that each mesh material is a `MeshLambertMaterial` whose `color` equals `lineMuted` / `line` in both palettes (F4). |
| Layout default | `LAYOUT_DEFAULTS.explodedGap = 1.1` in `src/layout/layout.ts` (S4-frozen). The S5 playground passes `layoutOptions={{ explodedGap: 2 }}` (S5 §9.8). Layer index 0 is the **top** of the stack. |
| Viewer DOM | wrapper (`tabIndex 0`) → **stage** (`overflow-y: auto`, carries S5's pointer listeners) → sticky **canvas viewport** (`<Canvas>`) + scroll spacer. The tour caption is a sibling of the stage. S5 picks by `clientX/clientY`, not by `event.target`. |
| Motion tokens | `durations explode implode hoverLift hoverSettle tourPulse tourBeat panelEnter panelExit`, `easings` (each `{ gsap, css }`), `staggers`, `distances`. There is **no annotation/reveal token** (F5). S5 `TourCaption` animates with WAAPI using token-derived milliseconds. |
| Fonts | `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`: a system stack, **no webfont**, so there is no font-swap reflow. |
| Production | `/` is the S1 palette page; **the viewer is mounted only on `/dev/engine`** (dev / fixture export, 404 on production). Every S6 visual is proven on the fixture export (F6). |
| Probe | `pnpm engine:probe` has S4/S5 groups including `fixture-*-draw-calls`, `hitmap-*`, `hover-pixel-toward-accent`, `focus-pixel-toward-paper`, `cls-zero` (interaction phase), caption tokens, `rm-*`, and the AC7 zoom-scroll group. |

### Environment facts checked 2026-10-31

| Item | Fact | Source |
|---|---|---|
| Node | v24.19.0 (`.nvmrc` 24) | local |
| Tier-1 executor | `codex` present, `deepseek` provider profile configured | local config |
| Tier 1.5 | `OPENROUTER_API_KEY` **unset** → DORMANT, skip-with-record (Murphy 2026-10-30) | local env |
| Occlusion vs `explodedGap` | measured with the pure picker, table in D9 | `evidence/RFC-log-occlusion-gap-sweep.txt` |
| Text contrast on `paper` (WCAG) | `ink` 13.71 / 14.81 · `label` 7.33 / 8.62 · `steel` 5.23 / 6.74 · `line` 7.58 / 9.36 · `accent` 5.27 / 9.57 · `lineMuted` 3.23 / 3.78 (light / dark) | `evidence/RFC-log-palette-measurements.txt` |
| Category fills (sRGB-space wash 0.18 of the category role over `surface`) | smallest pairwise ΔE between kind fills **4.9 / 3.6** (module vs external); `line` edge against any fill **≥ 6.01 / ≥ 5.49 : 1**; highlight fill (accent wash 0.4) vs any kind fill ΔE **≥ 15.6 / ≥ 18.7**. Linear-space washes are perceptually far weaker in light theme (ΔE 1.2–4.0 at 0.14), so the mix is done in sRGB space (D4). | same |
| Emphasis basis | cosine between (`accent`−`line`) and (`paper`−`line`) in linear RGB: 0.41 (light), 0.27 (dark). Well conditioned for the decomposition in D3. | same |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Module tree, package surface, frozen-surface guard (AC2, AC6)

- **R: new behaviour lives in new modules. The S2/S4 manifest stays byte-identical. A new S5 manifest seals S5's modules. Four mount points change additively.**

  | Path | New / changed | Contents | three/React? |
  |---|---|---|---|
  | `src/look/tokens.ts` | new | blueprint **look tokens**: static style numbers and role maps (D2) | no |
  | `src/look/fills.ts` | new | sRGB-space fill mixing, kind → fill colours per palette, `decomposeEmphasis` TS twin (D3, D4) | no |
  | `src/look/product.ts` | new | `VIEWER_LAYOUT_DEFAULTS = { explodedGap: 2 }` (D9) | no |
  | `src/overlay/project.ts`, `place.ts`, `dimension.ts`, `trace.ts`, `parts.ts` | new | pure overlay geometry: anchors, label placement, dimension lines, circuit-trace route, part numbering (D6–D8) | no |
  | `src/react/scene/blueprintMaterial.ts` | new | `onBeforeCompile` patch of the existing `MeshLambertMaterial`s (D3) | three |
  | `src/react/scene/OverlayProjector.tsx` | new | `useFrame` projection + settle detection → overlay frame (D6) | R3F |
  | `src/react/overlay/BlueprintOverlay.tsx`, `CircuitTrace.tsx` | new | DOM/SVG overlay layer (D6–D8) | React |
  | `Slabs.tsx`, `Scene.tsx`, `TeardownViewer.tsx`, `react/index.ts` | **changed, additively** | optional `look` prop (materials + `instanceFill`), projector mount, overlay mount, product layout default. **Without `look`, the output equals S5** (scene test). | yes |
  | `apps/web/app/dev/engine/*` | changed | drop the playground's `explodedGap: 2` override (the product default now covers it), drafting-grid backdrop (CSS), S6 URL params for evidence | React |
  | `tools/perf/src/engine-probe.ts` | changed | S6 check groups (D12) | node |

- **Frozen sets (AC6, "S2/S4/S5 frozen-surface checks remain empty"):**
  - **S2 + S4:** the existing manifest, unchanged, base `53b2b2b`. S6 does not touch `src/theme/**`, `src/layout/**`, `Lights.tsx` or `test/scene.test.tsx`. That rules out editing `LAYOUT_DEFAULTS` (D9) and swapping the material class (D3).
  - **S5 (new, F2):** `test/frozen-surface.s5.manifest.json`, base `f31600e` (S5 shipped on `main`). Sealed: `src/interaction/**`, `src/motion/emphasis.ts`, `react/scene/{Emphasis,PickBridge,ViewScroll}.tsx`, `react/overlay/TourCaption.tsx`, `react/{usePointerPick,useTourClock,useTeardownViewer}.ts`, `test/fixtures/project-c-lockerbay.json`, and every S5 test file (`pick*`, `pointer`, `focus`, `tour*`, `emphasis*`, `caption`, `fixture-c`, `scroll`, `view-scroll`, `viewer-handle`). **Mount points are excluded** (`Slabs.tsx`, `Scene.tsx`, `TeardownViewer.tsx`, `react/index.ts`, `test/fixtures/index.ts`), because S6 must extend them, as S5 extended S4's. The same test file runs both manifests. The diff logs `git diff --stat --exit-code <base> -- <set>` are committed at G1 and G4.
- **No new package export.** The look tokens, overlay geometry and product default are imported relatively inside the lib. They can be exported additively later, for example for OSS theming. **Open question 1.**
- **Rejected:** editing `LAYOUT_DEFAULTS` (S4-frozen; it would change S4 snapshots) · putting look numbers in `src/theme/` (S2-frozen directory) · a separate `xploder-blueprint` package (premature).

### D2 — Look tokens (AC1, AC2, AC3)

- **R: one new token file, `src/look/tokens.ts`, typed `as const satisfies LookTokens`.** It holds only static style numbers and palette **role names** (strings), never hex. The hex scanner therefore stays green with no exception, and the motion scanner has nothing to flag, because none of these values is a duration, easing or stagger.

  ```ts
  export const look = {
    edge:   { componentPx: 1, layerPx: 1, role: 'line' },          // per-face border, CSS px
    fill:   { base: 'surface', wash: 0.18, highlightWash: 0.4 },   // sRGB-space mix over `surface`
    faces:  { top: 0, left: 0.06, right: 0.12 },                    // extra mix toward the edge ink, by face
    layer:  { wash: 0.1 },                                          // layer plates: `lineMuted` wash
    kind:   { module: 'line', service: 'tech.framework', store: 'tech.storage',
              external: 'steel', actor: 'tech.tooling' },           // semantic category roles (D4)
    annotation: { fontPx: 12, gapPx: 4, leaderRole: 'lineMuted', textRole: 'label',
                  partRole: 'ink', dimensionRole: 'steel', balloonRole: 'line' },
    trace:  { role: 'accent', casingRole: 'paper', strokePx: 2, casingPx: 2, padPx: 3 },
  } as const satisfies LookTokens;
  ```

- The values are tuned **once**, against the G2 screenshots, as S4's layout constants and S5's emphasis levels were. Measured starting points are in §1. **Open question 2.**
- **Theme-count independence:** every token is a role reference. A future single-palette theme supplies one `Palette` and reuses the whole material and overlay system. Nothing assumes two palettes.

### D3 — Material and edge strategy (AC2)

- **R: keep both `MeshLambertMaterial`s (same class, same `color` = `line` / `lineMuted`, so S4's frozen `scene.test.tsx` stays green) and patch their shaders with `onBeforeCompile` + `customProgramCacheKey`.** Draw calls stay at 2. No texture is loaded.
- **Edges: constant-pixel-width face borders from box UVs.** Each `BoxGeometry` face carries UVs 0..1. The fragment shader computes the distance to the nearest face border in **screen pixels**, `d = min(min(u, 1−u) / fwidth(u), min(v, 1−v) / fwidth(v))`, and draws the edge ink where `d < edgePx · pixelRatio`, with a one-pixel `smoothstep` for anti-aliasing. Lines stay crisp and the same width at every zoom, on 4 px component side faces and on 3.5 px layer-plate sides alike (those read as solid ink, which is the drafting convention for a plate edge). `fwidth` is core in WebGL2, which three r186 always uses.
- **Fill: per-instance `instanceFill` attribute** (new `InstancedBufferAttribute`, linear RGB). It is allocated in the same layout effect as S5's `instanceColor`, **before the first compile**, and rewritten when the palette or project changes. The value is the kind fill (D4) for components and the layer wash for plates, both mixed in sRGB space on the CPU (`look/fills.ts`, pure, unit-tested).
- **Face shading without lights:** top / left / right faces mix the fill toward the edge ink by `look.faces.*`. Top is detected from the geometry normal, and left vs right from the view-space normal's x sign, so the shading is camera-relative and identical after every 90° snap. The patched output replaces Lambert's `outgoingLight`, so the frozen `Lights.tsx` stays mounted but no longer affects these meshes. The flat-shaded look is deterministic in both themes.
- **S5 emphasis carried exactly (no S5 code change).** S5 writes `instanceColor = E ⊘ L`, where `E = mix(mix(L, accent, t), paper, p)` and `L` is the role colour. The vertex shader rebuilds `E = L · instanceColor` and **recovers `(t, p)`** by a 2 × 2 least-squares solve on the basis (`accent`−`L`, `paper`−`L`). This is exact for every colour S5 can produce, and the basis is well conditioned (cosine 0.41 / 0.27, §1). The fragment shader then composes:
  - edge ink = `E` (exactly S5's colour: line → accent on highlight, → paper when dimmed);
  - fill = `mix(mix(instanceFill, highlightFill, t), paper, p)`, where `highlightFill` = accent wash 0.4;
  - output = `mix(faceShaded(fill), edgeInk, edgeMask)`.

  So highlight, tour tint and focus dim keep S5's exact weights, timing and tokens. Only their **appearance** becomes blueprint. `look/fills.ts` holds a TS twin of the decomposition, property-tested by round trip against S5's `componentWeights` composition (D11). **Neutral state = blueprint neutral.** With no `look` prop, Slabs renders exactly as S5 did (scene test).
- **S5 probe pixel checks stay meaningful:** hover moves the pointer pixel (top-face fill) toward `highlightFill` (accent), and focus moves it toward `paper`. `hover-pixel-toward-accent` and `focus-pixel-toward-paper` must stay green; they are regression gates in G3.
- **Rejected:** `EdgesGeometry` + `LineSegments` (+2 draw calls, 1 px lines only) · fat lines (`Line2`) (+draw calls) · post-process outline / Sobel (render target + full-screen pass, extra calls) · inverted-hull outline (+1 call per mesh) · texture/atlas edges (asset pipeline banned) · barycentric attributes (need non-indexed geometry; UVs already suffice for boxes) · swapping to `ShaderMaterial` (breaks S4's frozen material assertions) · editing `Emphasis.tsx` to expose weights (S5-sealed).

### D4 — Semantic category accents (AC2)

- **R: the category is the component's `kind`** (`module service store external actor`, schema-native, defaulted to `module`). The accent shows as the **fill wash** of the component (sRGB mix of the category role over `surface`, `look.fill.wash` 0.18). Edges stay uniform `line` ink, so the drawing reads as one blueprint with colour-coded parts.

  | kind | role | why |
  |---|---|---|
  | module | `line` | default part: plain ink wash |
  | service | `tech.framework` | distinct hue (violet) for running services |
  | store | `tech.storage` | amber; storage semantics match |
  | external | `steel` | grey: outside the system boundary |
  | actor | `tech.tooling` | olive: people/entry points, kept off `accent`, which is the highlight role |

- **Why kind, not tech category:** every component has a kind, but actors and externals have no techs (fixtures A/B/C), and a component with several techs has no single category. Tech-category colour belongs to S7's tech chips.
- **Measured (§1):** smallest kind-to-kind ΔE is 4.9 (light) / 3.6 (dark), for module vs external, which share blue-grey hues. Every other pair is larger, up to 16.8 / 19.6. Edges vs every fill ≥ 6.0 / 5.5 : 1. **Open question 3** covers the map and the module/external closeness.
- **Layer plates:** a `lineMuted` wash at 0.1 with `lineMuted` edges. No category.
- **Rejected:** `accent` for any kind (it collides with the highlight) · a separate colour stripe on the top face (needs extra geometry or UV tricks for little gain at 40 px parts) · tech-category colour (undefined for half the parts).

### D5 — Light/dark parity and the theme contract (AC1)

- **R: one code path, two palettes.** Materials, fills and overlays read **only** the active `Palette` (`usePalette`, S4), so the toggle and OS preference switch everything in the same frame. `Slabs` already reacts to palette changes, and `instanceFill` + uniforms are rewritten in that effect.
- **No-flash stays S1's mechanism**, untouched: the inline head script, the `prefers-color-scheme` fallback, and the rule that toggling back to the OS value clears the override. The canvas is transparent over the page `paper`, so the first paint already has the right background.
- **Parity is proved by computation and by pixels:** (1) unit test: for **both** palettes, every overlay text role vs `paper` ≥ 4.5 : 1, edges and leaders vs `paper` ≥ 3 : 1, edge vs every kind fill ≥ 3 : 1, highlight-fill ΔE vs every kind fill ≥ 10, smallest kind ΔE ≥ 3; (2) probe: sampled slab-fill and edge pixels match the computed token colours (within tolerance) in light **and** dark, after a toggle **and** under OS-dark emulation with no stored override; (3) the screenshot matrix (D12).
- **Hex exclusivity:** the `no-color-literals` scanner already covers all of `xploder/src` and `apps/web`; its non-vacuity list gains the S6 files. GLSL is plain source text in a `.ts` file, so it is scanned too, and contains no colour literal.

### D6 — Overlay architecture (AC3, AC6)

- **R: one DOM/SVG overlay layer inside the sticky canvas viewport, positioned from a per-frame projection inside the R3F tree, and laid out only when the scene is settled.**
  - **Placement in the DOM:** `<div data-xploder-overlay>` is a sibling of `<Canvas>` inside `data-xploder-canvas-viewport`, absolutely positioned at `inset: 0` with the canvas size and `pointer-events: none`. Label elements set `pointer-events: auto` + `user-select: text`, so they are selectable real text. Lines, leaders, ticks and the trace are one `<svg aria-hidden>` with `pointer-events: none`.
  - **Input is unchanged by construction:** pointer events on a label **bubble to the stage**, where S5's listeners pick by `clientX/clientY`. Hover, tap, tap-empty-clear and outside-tap therefore behave exactly as before. Labels are never placed over a component silhouette (D7), so they cannot mask a hover target. This is checked by the S5 probe groups (`hitmap-*`, `tap-*`), re-run in G3.
  - **Projection (`OverlayProjector`, R3F `useFrame`):** it projects anchors (layer-plate corners, component top-face centres at **rest** positions, so the hover lift is ignored as in S5's pick) through the real camera. Coordinates are CSS px in **content space**, with the S5 view offset removed. It computes a signature (camera world matrix, zoom, canvas size, explode progress).
  - **Settle rule:** if the signature changed this frame (explode/implode, turn, zoom tween or resize), the overlay is hidden at once (opacity 0) and one follow-up frame is requested with `invalidate()`. A frame with an unchanged signature after motion counts as **settled**: the pure layout (D7, D8) runs on measured label sizes, React renders it once, and the layer fades in. **Scroll is not a relayout:** a change of S5's view offset only applies a `translateY` to the overlay root in the same frame, so labels move rigidly with the drawing and AC7 reachability is untouched.
  - **Zero CLS by construction:** the overlay root has a fixed size inside a fixed-size viewport. Children are positioned with `transform` only. Text never changes after mount (names come from the project), and the system mono font has no swap. Opacity is the only animated property. The proof is the probe's `layout-shift` observer, run as an S6 group: zero entries whose sources lie inside the overlay, over load **and** interaction, both themes, mobile and desktop (D12). The S5 interaction-phase `cls-zero` gate also stays green.
  - **Crawlable:** label elements exist in the DOM from mount (at opacity 0 until the first layout), so their text is present whether or not the layout has run.
- **Motion (F5):** the fade-in borrows `durations.hoverSettle` + `easings.hover`; the hide is instant. The static twin makes both instant. No new motion token is needed, and S2's tokens are frozen anyway. **Open question 4.**
- **Rejected:** per-frame label tracking during tweens (DOM writes every frame, labels colliding mid-turn, side flips) · drei `<Html>` (drei is banned, S4 D6) · labels baked into WebGL text (forbidden by the brief) · overlay outside the stage (it would not receive S5's pointer bubbling or the scroll transform).

### D7 — Overlay vocabulary and layout (AC3)

- **Vocabulary (all selectable HTML text; strokes in SVG):**
  1. **Layer labels:** `{n} {layer name}` (n = 1 at the top of the stack), in `label` role, mono 12 px, uppercase via CSS (the DOM keeps the original case). Anchor: the layer plate's leftmost projected corner, with a leader in `lineMuted`.
  2. **Part-number callouts:** balloon `{n}.{m}` (layer number · 1-based slot), `ink` text in a `line`-stroked circle on `surface`, with a leader from the balloon to a dot on the component's top-face centre. **Responsive text:** overlay width ≥ 768 px → `1.2 Tide chart screen`; narrower → `1.2`, with the name kept in a visually hidden span, so it stays in the DOM, crawlable and readable by screen readers, and the 360 px drawing does not clutter. Shown when exploded; hidden imploded, where most parts sit inside the stack.
  3. **Dimension lines** (`steel`, drafting style: extension lines + slash ticks): (a) **stack** — a vertical rail left of the drawing from the top plate to the bottom plate, a tick per layer, label `{n} layers`; (b) **footprint** — along the bottom plate's lower-left edge, offset outward, label `{cols} × {rows}`. Shown in both states.
- **Placement (`overlay/place.ts`, pure, deterministic):** greedy cartographic placement. Labels are processed in priority order: layer labels (top → bottom), then parts (layer, slot), then dimension labels. Each label tries candidate offsets: 8 directions × radii {8, 20, 36, 56} px, with a direction preference per label type. The first candidate whose box (inflated by `gapPx`) stays inside the viewport and intersects **no** component silhouette (the projected box hexagon, separating-axis test) and **no** already-placed label wins. Layer plates are **not** obstacles: labels may sit on plate margins and in the explode gaps. If no candidate fits, the label is hidden and counted.
  - **Executable readability check:** for fixtures A, B, C × 4 azimuths × {imploded, exploded} × viewports {360×480, 360×640, 390×844, 768×1024, 1280×720} at default zoom → **0 hidden labels, 0 overlaps, 100% inside the viewport, font ≥ 12 px.** When zoomed in, labels whose anchor is outside the viewport are hidden (their part is off-screen, reachable by S5 scroll). The remaining labels still never overlap.
- **Interplay with S5 states (visual only; no new behaviour):**
  - **Tour active (`status ≠ idle`):** labels, parts and dimensions step back (hidden), and the circuit trace + caption take over. This mirrors S5's "focus yields to the tour" and avoids caption collisions. **Open question 5.**
  - **Layer focus:** the labels and part callouts of non-focused layers fade to the S5 dim level (`emphasis.dim.level`, read from the S5 token file) on the dim channel's tokens. The static twin makes it instant.
  - **Hover:** no overlay change. Echoing the hover in the callouts would arguably be new hover behaviour.
- **Rejected:** labels drawn on the slabs (they mask hover targets and would block S5 pointer semantics) · a parts-list (BOM) table (a panel, S7) · iso-rotated label text (polygon collisions and angle handling for little gain) · hiding names permanently on mobile with no DOM text (not crawlable).

### D8 — Circuit-trace geometry and motion (AC4)

- **R: an SVG polyline in the overlay, routed PCB-style through the projected anchors of `flow.path[0..step]` in order.**
  - **Route (`overlay/trace.ts`, pure):** `traceRoute(path, anchors) → { vertices: id[], points }`. Each hop p → q is **octilinear**: a straight run along the dominant axis for `|major| − |minor|`, then a 45° run for `|minor|`. Each visited component gets a round **pad** (via) of radius `padPx`; the current component's pad gets a ring. Stroke `accent` 2 px over a 2 px `paper` casing, so the trace reads where it crosses slabs. **Vertex order is exactly the flow order:** `vertices` equals `flow.path.slice(0, step + 1)` (AC4 test), and the wrapper exposes it as `data-xploder-trace` for the probe.
  - **Driven only by S5 state:** `handle.tour` (`flowId`, `status`, `step`) plus the tour position the caption already uses. `ended` holds the full trace (S5's `ended` holds the last step); `stop` or a flow switch clears it. The anchors come from the settled overlay frame. Play on an imploded stack auto-explodes it (S5), and the trace appears at settle.
  - **Motion (normal):** on each step the newest hop **draws in** (`stroke-dashoffset` from its length to 0) over `durations.tourPulse` with `easings.tourPulse`, delayed by `staggers.tourStep`, which keeps it in sync with S5's caption beat. While **playing**, a signal dot (a dashed second path) travels the newest hop with period `2 × durations.tourPulse`, matching S5's tint pulse. Paused: static trace, no dot. Implemented with WAAPI on token-derived milliseconds, as S5's `TourCaption` does (the scanner-compliant pattern).
  - **Reduced motion (static twin):** the hop appears complete in the same frame, there is no signal dot, and the ring is static. Checked by `document.getAnimations()` being empty for the overlay under `reducedMotion: 'reduce'`, plus exactly one frame per step (D12).
- **Rejected:** a WebGL line (+1 draw call during tours; AC2 counts 2) · straight chords (cross each other and read as arrows, not traces) · 3D-routed traces along slab surfaces (occluded by upper layers, and camera-dependent artefacts).

### D9 — Product `explodedGap` decision (AC5)

**Decision: the product default is `explodedGap: 2.0`.** It is set at the **viewer level** (`VIEWER_LAYOUT_DEFAULTS` in `src/look/product.ts`): `TeardownViewer` lays out with `{ ...VIEWER_LAYOUT_DEFAULTS, ...layoutOptions }`. The S4 primitive `LAYOUT_DEFAULTS.explodedGap = 1.1` stays byte-identical (frozen surface) as the engine's geometric default for direct `layoutProject` callers. The playground drops its explicit override, so every S6 screenshot shows the **product default**.

Occlusion evidence (pure picker, exploded, `evidence/RFC-log-occlusion-gap-sweep.txt`; visible % = visible area / unoccluded silhouette):

| gap | A @45° (default angle) | A worst snap | C @45° | C worst snap | fitZoom 360×640 A / C (px per unit) |
|---|---|---|---|---|---|
| 1.1 (S4) | **tide-repository 0%**, tide-view-model 38%, tide-feed 38% | 0% | **booking-service 0%, notifier 0%**, locker-registry 21%, push-gateway 21% | 0% | 82.2 / 69.0 |
| 1.4 | tide-repository 0% | 0% | booking-service 0%, notifier 0% | 0% | 82.2 / 67.0 |
| 1.6 | tide-repository 38% | 38% | booking-service 21%, notifier 38% | 21% | 79.1 / 62.0 |
| 1.8 | tide-repository 68% | 68% | booking-service 43% | 43% | 73.8 / 57.7 |
| **2.0** | **tide-repository 88%, all others 100%** | **88%** | **booking-service 65%, notifier 88%, all others 100%** | **65%** | **69.2 / 53.9** |
| 2.4 | all 100% | 100% | all 100% | 100% | 61.4 / 47.6 |

Fixture B is fine at every gap (≥ 77%).

- **Why 2.0:** it is the smallest measured gap at which **every** A and C component keeps at least half of its silhouette at **every** snap (1.8 leaves C at 43%). It matches the value Murphy validated in the S5 playground (S5 §9.8). Its fit cost vs 1.1 on a 360×640 phone is ×0.84 (A) and ×0.78 (C), so a C part is ≈ 43 px wide (0.8 × 53.9). 2.4 reaches 100% but shrinks C parts to ≈ 38 px (×0.69).
- **Executable checks:** (1) unit test: `VIEWER_LAYOUT_DEFAULTS.explodedGap === 2`, and `TeardownViewer` with no `layoutOptions` lays out at 2 (test-renderer); (2) **occlusion test** at the product default: every component of A **and** C has ≥ 50% visible silhouette at 45° **and** at all four snaps (that is the operational meaning of "visible" here, a documented value, not a new AC); (3) probe hit map at the default, 45°, exploded: every A and C component is hovered at least once ("reachable"); (4) default-angle screenshots of A and C, light + dark, mobile + desktop; (5) labels never cover a part (D7), so overlays cannot undo (2).
- **Open question 6** (2.0 vs 2.4).

### D10 — Draw-call and performance budget (AC2, AC6)

| Item | S5 | S6 budget | How it holds |
|---|---|---|---|
| Draw calls (fixture A, rest **and** during a tour) | 2 | **2** | same 2 instanced meshes; edges, fills and shading live in the patched shaders; overlays and trace are DOM/SVG (0 calls) |
| Shader programs | 1–2 | ≤ 2 | shared `customProgramCacheKey` for the blueprint patch |
| Triangles / instances | unchanged | unchanged | same unit box |
| Per-frame CPU when idle | 0 (demand) | 0 | the projector only runs inside frames that already render; layout only at settle |
| Fragment cost | Lambert | ≈ Lambert | a few `fwidth`/`mix`/`smoothstep` ops; no lights loop |
| CLS from overlays | — | **0** | D6 |
| Tour FPS (`fps:engine --scenario tour`) | 0 dropped / 5 s | **0 dropped / ≥ 5 s**, band 60 ±10% as liveness, raw fps information only | the trace adds a WAAPI dash animation (paint only) |
| Initial-load weight / Lighthouse (`/`) | green | green | `/` does not mount the viewer (F6); no new dependency |

Perf criteria use the dropped-frames style only. **No literal fps threshold appears in any check.**

### D11 — Test strategy

| AC | Assertion | Where |
|---|---|---|
| AC1 | look tokens are roles only (type test); parity table for both palettes (text ≥ 4.5 : 1, strokes ≥ 3 : 1, edge vs fill ≥ 3 : 1, highlight ΔE ≥ 10, kind ΔE ≥ 3) | `xploder/test/look-tokens.test.ts`, `look-fills.test.ts` |
| AC1 | hex scanner non-vacuity extended with every S6 file; `app/theme-script.ts`, `theme-toggle.tsx` and `usePalette.ts` untouched (no unit test exists for the head script, so no-flash is proved in the browser by the probe, D12) | `apps/web/test/no-color-literals.test.ts` |
| AC2 | `decomposeEmphasis` round trip vs S5's composition (random t, p, both palettes, both meshes); sRGB mix maths | `look-fills.test.ts` |
| AC2 | scene: with `look`, both materials are still `MeshLambertMaterial` with the S4 colours, `onBeforeCompile` + cache key set, `instanceFill` allocated before first render with the kind fills; still **exactly 2 `InstancedMesh`**; without `look`, the output equals S5 | `xploder/test/blueprint-scene.test.tsx` (test-renderer) |
| AC3 | placement: 0 hidden / 0 overlaps / inside viewport for the matrix in D7; determinism; zoomed-in off-screen hiding | `xploder/test/overlay-place.test.ts` |
| AC3 | projection anchors vs the real rig camera (`Vector3.project`) for 4 azimuths × both states; scroll = pure translation; dimension geometry; part numbering | `overlay-project.test.tsx`, `overlay-dimension.test.ts`, `overlay-parts.test.ts` |
| AC4 | `traceRoute` vertices `toStrictEqual(flow.path.slice(0, k + 1))` for every step of A×2, B, C×2 flows; every hop octilinear; trace timing reads only tokens, and the static twin = 0 | `overlay-trace.test.ts` |
| AC4 | motion scanner non-vacuity extended with S6 files | `apps/web/test/no-motion-literals.test.ts` |
| AC5 | product default = 2 + viewer wiring; occlusion ≥ 50% at 45° and every snap for every A/C component | `xploder/test/product-gap.test.ts` |
| AC6 | S2/S4 manifest unchanged; S5 manifest added and green; negative control (touching a sealed file turns it red) logged | `frozen-surface.test.ts` (extended) |

All logic is pure and runs in Node. React-level tests use `@react-three/test-renderer`, as in S4/S5 (no jsdom). Real-browser wiring is covered by the probe (D12).

### D12 — Evidence strategy

- **`pnpm engine:probe` S6 groups** (same CLI and exit codes; every S4/S5 check must stay green, including the AC7 zoom-scroll group):
  - **palette pixels:** slab fill and edge samples equal the token-derived colours in light, after a toggle to dark, and under OS-dark emulation with no stored override (no-flash: the first screenshot after load is already dark);
  - **overlay:** labels selectable (Selection API round trip, `user-select ≠ none`); computed text colours = token roles in both themes; at 360 px every label box is inside the viewport, none overlap, and font-size ≥ 12 px; label hit-through (hovering a component next to a label still highlights it; tapping a label clears like empty canvas);
  - **CLS:** zero `layout-shift` entries with sources inside `[data-xploder-overlay]`, load + interaction, both themes; the S5 interaction-phase total stays 0 (F7);
  - **trace:** at each step `data-xploder-trace` equals the flow-path prefix for A (both flows) and C (both flows); stop clears; under reduced motion `getAnimations()` on the overlay is empty and there is exactly 1 frame per step;
  - **draw calls:** 2 for A at rest, exploded and mid-tour;
  - **default gap:** hit map at default with no `layoutOptions` → every A and C component reachable.
- **Screenshot matrix (AC3, Deliverable 6):** `pnpm evidence` against URL-driven playground states: light/dark × {imploded, exploded, tour paused at step 3} × mobile/desktop = **12 PNGs** for fixture A, plus fixture C default-angle exploded × light/dark × mobile/desktop (**4**), plus **max-zoom top + bottom** for A (light, mobile and desktop) proving S5 AC7 with overlays present.
- **FPS:** `pnpm fps:engine --scenario tour` on A: `droppedFrames = 0` over ≥ 5 s, band as liveness, `tourStepsAdvanced ≥ 3`, `drawCalls = 2`.
- **CI (AC6):** the PR run URL + log excerpts: build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion.
- Naming per `.specify/EVIDENCE.md`: `evidence/T<NNN>-<kind>[-<variant>].<ext>`; RFC-time logs are `evidence/RFC-log-*.txt`.

### D13 — Execution ladder (Hard Rule 7)

- **Tier 1 = DeepSeek Flash 4.1** (`codex exec -p deepseek`; sandbox off for browser tasks, as in S03–S05). **Tier 1.5 (Sol/Gemini via OpenRouter) = DORMANT**, `OPENROUTER_API_KEY` unset (checked 2026-10-31), skip-with-record per task. **Flash stuck ×2 → the orchestrator executes personally.** That is the kickoff ladder. Standing policy from S03–S05 is to *pause and report usage instead of taking over*. The kickoff now says the orchestrator executes, and the two conflict, so this is **open question 9**. Every task report names the tier that finished it. Each task runs in a fresh worktree off `task/s06-blueprint-theme`.

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories:**
- **P1 — Visitor sees a blueprint.** Paper-white sheet, ink-blue crisp outlines, colour-coded parts; in dark mode a navy sheet with light lines; toggling or OS preference switches cleanly without a flash. → AC1, AC2
- **P1 — Visitor reads the drawing.** Layer names, part numbers and dimension lines annotate the exploded architecture, legible on a 360 px phone, selectable as text, and nothing on the page jumps. → AC3
- **P1 — Visitor follows a request.** During a tour a circuit trace grows from part to part in flow order, with a gentle signal pulse; reduced-motion visitors get the same trace without movement. → AC4
- **P2 — Every part is visible by default.** At the default angle no part hides behind another layer; zooming in still lets you scroll to the top and bottom. → AC5
- **P2 — Reviewer trusts it.** Same 2 draw calls, zero overlay CLS, frozen surfaces untouched, full CI and perf gates green. → AC6

**FR mapping rule:** FR-001 ↔ AC1 … FR-006 ↔ AC6, one to one. D1 (surface/guard), D2 (look tokens), D3 (material), D6 (overlay architecture) and D9 (product default) are supporting requirements under the FR whose AC they serve. **No new acceptance criteria are invented.** Thresholds such as the 50% visibility and the parity table are documented values, not new ACs.

**plan.md inputs:** D1–D12. Data flow:
`Palette (usePalette)` → `look/fills` → `instanceFill` + uniforms → patched Lambert shaders (edges, faces, S5 emphasis via `(t, p)` recovery) · `layout ({...VIEWER_LAYOUT_DEFAULTS, ...layoutOptions})` → `OverlayProjector` (`useFrame`: anchors, signature, settle) → `overlay/place` + `dimension` + `parts` → `<BlueprintOverlay>` (HTML labels + SVG strokes) · S5 `handle.tour` + position → `overlay/trace` → `<CircuitTrace>` (WAAPI token timings; static twin) · S5 view offset → overlay `translateY`.

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Task (one integration seam) | Executable check | AC |
|---|---|---|---|
| T1 | S5 frozen manifest + generator + negative control; `look/tokens.ts` + type test | `pnpm --filter xploder test frozen-surface look-tokens` green; touching a sealed S5 file turns it red (logged) | AC6, AC1 |
| T2 | `look/fills.ts`: sRGB mix, kind fills, layer wash, highlight fill, `decomposeEmphasis` + parity table | `pnpm --filter xploder test look-fills` green (both palettes) | AC1, AC2 |
| T3 | `look/product.ts` + occlusion test at the product default | `pnpm --filter xploder test product-gap` green | AC5 |
| T4 | `overlay/project.ts` + `parts.ts` + `dimension.ts` (pure) + projection-vs-camera test | `pnpm --filter xploder test overlay-project overlay-parts overlay-dimension` green | AC3 |
| T5 | `overlay/place.ts` + readability matrix test | `pnpm --filter xploder test overlay-place` green (0 hidden, 0 overlaps) | AC3 |
| T6 | `overlay/trace.ts` (route + timing from tokens, static twin) | `pnpm --filter xploder test overlay-trace` green (path-prefix order for A×2, B, C×2) | AC4 |
| T7 | `blueprintMaterial.ts` + `Slabs` `look` prop + `instanceFill` + `blueprint-scene.test.tsx` | test-renderer suite green; S4 `scene.test.tsx` + S5 suites untouched and green; still 2 meshes | AC2 |
| T8 | `OverlayProjector` + `<BlueprintOverlay>` (labels, parts, dims; settle/fade; scroll translate; focus dim) wired in `TeardownViewer` | unit/scene tests green; `pnpm dev` smoke screenshot (light, mobile + desktop) | AC3 |
| T9 | `<CircuitTrace>` (draw-in, signal dot, RM twin, `data-xploder-trace`) | tests green; `pnpm dev` tour screenshot | AC4 |
| T10 | Playground: product default (override removed), drafting-grid backdrop, S6 URL params; `TeardownViewer` product-default wiring test; scanner upkeep (hex/motion non-vacuity, package-consumer identifiers) | typecheck/lint/test green; each scanner green and negative controls fire | AC1, AC4, AC5, AC6 |
| T11 | `engine:probe` S6 groups (palette pixels, overlay, CLS, trace, draw calls, default-gap hit map) | tools unit tests green; `--help` exits 0 | AC1–AC6 |
| T12 | Probe evidence run (normal + reduced motion), all S4/S5/S6 checks incl. AC7 zoom-scroll | `engine-probe.json` all pass, exit 0; committed | AC1, AC3, AC4, AC5 |
| T13 | Screenshot matrix (12 + 4 + max-zoom top/bottom) | files committed per naming rule; evidence exit 0 | AC3, AC5 |
| T14 | FPS (tour) + draw-call + CLS numbers | `fps.json`: 0 dropped, band liveness, `tourStepsAdvanced ≥ 3`, `drawCalls = 2` | AC2, AC6 |
| T15 | Push + PR, full CI, AC1–AC6 self-check table | all CI checks green on the PR; `evidence/AC-selfcheck.md` | AC6 (all) |

**Order:** T1 → T2 → T3 → (T4 → T5) ∥ T6 → T7 → T8 → T9 → T10 → T11 → (T12 ∥ T13 ∥ T14) → T15.

**Phase groups (Stage 3 STOP points):** **G1 pure core** T1–T6 → STOP · **G2 renderer + overlay + playground** T7–T10 → STOP (Murphy's visual check in Orca's browser; token tuning happens here) · **G3 evidence** T11–T14 → STOP · **G4 ship** T15 → STOP + AC self-check table.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `onBeforeCompile` chunk names drift in three r186 (`opaque_fragment`, `color_vertex`) | patch silently not applied | scene test asserts the patched source contains the S6 markers after `onBeforeCompile` runs on the real r186 shader; probe pixel check (edge vs fill) in the browser |
| `instanceFill` added after the first compile is ignored | flat fill missing | allocate it in S5's colour-buffer effect before first render; scene test checks the attribute at mount |
| `(t, p)` recovery breaks if S5 colours change | wrong highlight/dim appearance | S5 is sealed (manifest); round-trip property test on both palettes and both meshes |
| Face-border edges double on shared edges (2 × px inside, 1 × px on the silhouette) | silhouette thinner than inner edges | accepted for v1 (no extra pass allowed by the 2-call budget); widths tuned at G2 |
| Edge aliasing on very thin side faces at low zoom | shimmering lines | analytic AA (`fwidth` + `smoothstep`) on top of MSAA; G2 screenshots at 360 px |
| Placement fails on a cramped viewport | hidden labels → AC3 "readable" at risk | matrix test down to 360×480 with 0 hidden at default zoom; responsive short labels; if a case fails it is escalated with the failing case, not relaxed |
| Labels intercept pointer events | S5 hover/tap regressions | overlay inside the stage (events bubble; S5 picks by coordinates); labels never over parts; S5 probe groups re-run |
| Overlay hide/fade on every turn feels jumpy | perceived polish | fade on hover tokens; judged at G2; fallback = keep labels visible but frozen during tweens (open question 4) |
| `hover-pixel-toward-accent` / `focus-pixel-toward-paper` regress with pale fills | S5 probe red | highlight wash 0.4 (ΔE ≥ 15.6 vs fills), dim toward `paper` is unchanged maths; G3 gate |
| Module vs external kinds look alike (ΔE 4.9 / 3.6) | weak category read | open question 3; alternative map ready (`external → tech.platform`, or `module` unwashed) |
| Frozen-file drift (the S4 b884e95 lesson) | AC6 claim false | two manifests in CI + diff logs at G1 and G4; check `git log` for foreign commits on the brief before each gate |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (no AC is blocked; none requires a brief revision):**

- **F1 — The blueprint palettes already exist as S2 tokens.** Deliverable 1 is therefore material work, not token work, and the S2 token API stays untouched.
- **F2 — No S5 frozen-surface check exists yet.** S5's guard covers S2 + S4 only, so AC6's "S5 frozen-surface checks remain empty" has nothing to run. **Default:** T1 adds an S5 manifest (D1) before any S6 code lands, so the check exists and is empty from the start.
- **F3 — `LAYOUT_DEFAULTS` is S4-frozen.** The product default therefore lives at the viewer level (D9). The S4 primitive keeps 1.1.
- **F4 — S4's frozen `scene.test.tsx` pins the material class and colours.** The material is patched rather than replaced (D3).
- **F5 — There is no motion token for annotation reveal.** **Default:** borrow `hoverSettle` + `easings.hover` (D6).
- **F6 — Production does not mount the viewer yet.** All S6 visuals are evidenced on `/dev/engine` (fixture export). Lighthouse/weight on `/` stay as no-regression gates. The production look arrives with S9/S10.
- **F7 — S5's pre-existing load shift** (≈ 0.0006 from the S4 playground control row, S5 F7) remains. The S6 overlay CLS check is attributed by source, so it is unaffected.

**Open questions:**

1. **Module placement:** new `src/look/`, `src/overlay/`, React adapters; mount points changed additively; no new package export? → **Default: yes** (D1).
2. **Look token values:** edge 1 px, fill wash 0.18 (sRGB), highlight wash 0.4, faces 0 / 0.06 / 0.12, layer wash 0.1, annotation 12 px? → **Default: yes**, tuned once at G2.
3. **Category = component `kind`**, map module→`line`, service→`tech.framework`, store→`tech.storage`, external→`steel`, actor→`tech.tooling`? → **Default: yes**; if module/external read too alike at G2, switch external to `tech.platform`.
4. **Overlay motion:** hide instantly during geometry tweens, fade in at settle on `hoverSettle` + `easings.hover`, no new token? → **Default: yes**.
5. **Tour interplay:** annotations hidden while a tour is active; the trace + caption take over? → **Default: yes**.
6. **`explodedGap` product default = 2.0** at the viewer level (S4 primitive stays 1.1), with 50% minimum visible silhouette as the test's meaning of "visible"? → **Default: yes** (2.4 is the alternative if you want 100%).
7. **Part-callout text:** number + name at ≥ 768 px, number only below (name in a visually hidden span)? → **Default: yes**.
8. **Drafting-grid backdrop** (CSS grid from the `grid` role behind the playground canvas, 0 draw calls)? → **Default: yes**, playground only; the product shell is S10.
9. **Ladder after two Flash failures:** the kickoff says the orchestrator executes personally; the standing S03–S05 policy (memory) says pause and report usage. → **Default: pause and report with 5h usage, then execute personally on your go** (the stricter of the two).
10. **S5 sealed set** as listed in D1 (pure S5 modules, `Emphasis`/`PickBridge`/`ViewScroll`/`TourCaption`, S5 hooks, fixture C, S5 tests; mount points excluded), base `f31600e`? → **Default: yes**.
11. **Engine FPS stays a local headless proof** on the Mac GPU, not a CI job (as S4/S5)? → **Default: yes**.

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. The `explodedGap` decision in D9: **2.0 as product default**, set at the viewer level, with the occlusion table as evidence (default: accept).
2. The overlay vocabulary in D7 (layer labels, `n.m` part balloons, two dimension lines) matches the drafting-table picture you have in mind (default: accept; final judgement at G2 in Orca's browser).
3. The tour look in D8: PCB-style trace with pads, draw-in per step, signal dot while playing; annotations step back during a tour (default: accept).
4. The category colours by component kind (D4), including the module/external closeness (default: accept; judged on the G2 screenshots).
5. The four phase groups in §4 give you the validation points you want, with G2 as the visual-tuning gate (default: accept).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to open questions 1–11, or "defaults" (default: all defaults).
2. Confirmation of the ladder reading in open question 9 (default: pause + usage report after two Flash failures, then execute personally on your go).
3. Push permission: push `task/s06-blueprint-theme` and open a draft PR at the end of G2, as in S05 (default: granted at G2; nothing is pushed in Stages 1–2).
4. Merge: the orchestrator merges only after you say "merge" (default: as S05).
5. Usage pacing (default: start each Stage 3 group in a fresh 5h window, stop at ≥ 85%; please keep stating "5h: N%" in gate messages, because the local usage capture is stale, last captured 2026-10-29).
