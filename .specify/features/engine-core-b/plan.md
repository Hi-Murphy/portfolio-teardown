# Implementation Plan: S05 Engine Core B — Hover · Layer Focus · Guided Tour

**Feature dir:** `.specify/features/engine-core-b/` · **Branch:** `task/s05-engine-core-b` · **Date:** 2026-10-30 · **Inputs:** `spec.md`, `rfc.md` (approved, §9; round-1 refinements R1–R6)

## Summary

`packages/xploder` gains the interaction layer as **new modules**: pure picking, pointer, focus, tour and emphasis logic in `src/interaction/`, emphasis tokens in `src/motion/emphasis.ts`, and React/DOM adapters (`scene/Emphasis.tsx`, `overlay/TourCaption.tsx`, `usePointerPick.ts`). The S4 React wiring (`Slabs`, `Scene`, `TeardownViewer`, `useTeardownViewer`, `react/index.ts`) gets **additive** optional props and handle fields only. With no interaction state, rendering is identical to S4, and every S4 test stays untouched and green. S2/S4 source files are byte-identical to `53b2b2b`, which a hash-manifest test proves in CI. Rendering stays at **2 draw calls**: emphasis is per-instance colour plus a lift offset, and the caption is HTML. `apps/web` gets fixture C, layer and tour controls, and URL params in the dev-only playground. `tools/perf` gains S5 probe groups and a `--scenario tour` FPS run, and the stale `literal60` verdict is removed.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict (`noUncheckedIndexedAccess`), React 19.3, Next 16.4 static export, Node 24 |
| New deps | **None.** three 0.186, R3F 9.8, `@react-three/test-renderer`, Playwright (tools/perf) are already present. |
| Renderer | unchanged R3F `<Canvas orthographic frameloop="demand">`; 2 `InstancedMesh`; `instanceColor` added to both |
| Tests | vitest (Node): pure logic + `@react-three/test-renderer` scenes. Real browser: `engine:probe`, `fps:engine` (Playwright). |
| Targets | 2 draw calls (S4 baseline); 0 dropped frames over 5 s while a tour plays, fps band 60 ±10% as liveness; CLS 0 |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`; the S2/S4 surface listed under "Guards" |
| Time base | seconds from `performance.now() / 1000` (the S4 `Scene` `now`), injectable for tests |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-006 quote AC1–AC6 verbatim. Supporting work maps to brief deliverables 1–6 only. |
| II. Static-only shell | No server code. The playground stays a dev-only static client page. |
| III. Performance is a feature | No extra draw call; demand loop idles at rest; per-frame work is O(instances) with no allocation; the pulse renders only while a tour is **playing**. Landing bundle unaffected (the viewer is not in the production graph). |
| IV. Single motion source | All timing from `xploder/motion` tokens; emphasis levels in `src/motion/emphasis.ts`; caption fade via WAAPI with token values; beat wake-up via `setTimeout` with a token-derived delay. Scanners cover every new file (non-vacuity). |
| V. Theme integrity | Highlight/dim/caption colours are palette **roles** resolved from `blueprint.light/dark` (or the `palette` prop). No hex outside `theme/`. |
| VI. Evidence over assertion | Every visual/motion/touch claim attaches screenshots, `engine-probe.json`, the touch trace or `fps.json`. |
| VII. No secrets | No new secrets. Evidence holds `127.0.0.1` URLs only. |

## Project Structure

### Documentation (this feature)

```text
.specify/features/engine-core-b/
  rfc.md  spec.md  plan.md  tasks.md
  evidence/   T0NN-*.{txt,png,json}, AC-selfcheck.md
```

### Source code (changes only)

```text
AGENTS.md                               §3: fps:engine --scenario note (T011)

packages/xploder/
  src/
    motion/emphasis.ts                  NEW internal tokens: emphasis (T001)
    interaction/                        NEW, pure, no three/React
      pick.ts                           rayBoxDistance, pick                                 (T002)
      pointer.ts                        pointerReducer                                        (T003)
      focus.ts                          focusReducer, escapeTarget                            (T003)
      tour.ts                           tourReducer, positionAt, initialTour, showFlowSelector (T005)
      emphasis.ts                       createChannels, emphasisTargets, pulseAt, liftWorld   (T006)
    react/
      scene/Emphasis.tsx                NEW: emphasis driver (colours + lift)                 (T006)
      scene/PickBridge.tsx              NEW: exposes camera + progress to the pointer hook    (T007)
      usePointerPick.ts                 NEW: DOM pointer listeners → ray → pick → reducer     (T007)
      overlay/TourCaption.tsx           NEW: HTML caption, palette-styled, WAAPI fade         (T008)
      useTourClock.ts                   NEW: beat wake-up timer                               (T008)
      scene/Slabs.tsx                   ADDITIVE: optional emphasis driver + progress ref     (T006)
      scene/Scene.tsx                   ADDITIVE: optional emphasis/pick props                (T006, T007)
      useTeardownViewer.ts              ADDITIVE: project option, interaction state + actions, Esc (T008)
      TeardownViewer.tsx                ADDITIVE: stage div, caption, data-* attributes       (T007, T008)
      index.ts                          ADDITIVE: new types (TourStatus, …)                   (T008)
  test/
    frozen-surface.test.ts + frozen-surface.manifest.json                                    (T001)
    emphasis-tokens.test.ts  pick.test.ts  pointer.test.ts  focus.test.ts                    (T001–T003)
    fixture-c.test.ts  (+ __snapshots__/fixture-c.test.ts.snap)                              (T004)
    tour.test.ts  emphasis.test.ts                                                           (T005, T006)
    emphasis-scene.test.tsx  pick-scene.test.tsx  viewer-handle.test.tsx                      (T006–T008)
    fixtures/project-c-lockerbay.json   NEW; fixtures/index.ts +1 export line                (T004)

apps/web/
  app/dev/engine/engine-playground.tsx  fixture C, layer focus buttons, tour controls + selector, URL params (T009)
  test/no-motion-literals.test.ts       non-vacuity += new xploder files                     (T010)
  test/no-color-literals.test.ts        non-vacuity += new xploder files                     (T010)
  test/package-consumer.test.ts         engine identifiers += Raycaster setColorAt instanceColor (T010)

tools/perf/
  src/engine-probe.ts                   S5 observation types + checks                        (T011)
  src/cli/engine-probe.ts               S5 drive script (hit map, hover, touch, CLS, focus, tour, caption, reduced) (T011)
  src/cli/fps-engine.ts                 --scenario explode|tour; literal60 removed            (T011)
  test/engine-probe.test.ts  test/fps-engine.test.ts                                         (T011)
```

Nothing in S2/S4 is moved or renamed. `packages/xploder/package.json` is unchanged (no new export, no new dep).

## Guards (every task)

Base `53b2b2b` = brief freeze = `main` at kickoff.

```sh
git diff --quiet 53b2b2b -- .specify/slices .specify/KICKOFF.md .specify/KICKOFF-S02.md .specify/KICKOFF-S03.md .specify/KICKOFF-S04.md .specify/KICKOFF-S05.md && echo FROZEN-OK
git diff --quiet 53b2b2b -- $(cat packages/xploder/test/frozen-surface.paths) && echo SURFACE-OK   # after T001 creates the list
```

**Frozen surface** (`packages/xploder/…`; `frozen-surface.paths` lists exactly these, one per line): `package.json` · `src/index.ts` `src/parse.ts` `src/errors.ts` · `src/schema/` · `src/theme/` · `src/motion/index.ts` `src/motion/ease.ts` · `src/layout/` · `src/engine/` · `src/react/scene/CameraRig.tsx` `src/react/scene/Lights.tsx` `src/react/scene/Stats.tsx` `src/react/env.ts` `src/react/usePalette.ts` `src/react/useReducedMotion.ts` · `test/fixtures/project-a-ui-app.json` `test/fixtures/project-b-pipeline.json` `test/fixtures/tech-registry.json` · every S2/S4 test file (`test/{camera,ease,env,explode,exports,fixtures,generality,geometry-free,layout,motion,parse,registry,scene,schema,smoke,theme}.test.ts[x]`, `test/helpers.ts`) · `test/__snapshots__/{generality,layout}.test.ts.snap`.

Before every gate the orchestrator also runs `git log --oneline 53b2b2b..HEAD -- .specify/slices .specify/KICKOFF-S05.md` and expects **no output** (S4 lesson: a foreign commit to the brief went unnoticed).

## Emphasis tokens (`src/motion/emphasis.ts`, internal)

```ts
import type { PaletteRole } from '../theme';
export interface EmphasisTokens {
  readonly highlight: { readonly role: PaletteRole };                     // 'accent'
  readonly dim: { readonly level: number; readonly toward: PaletteRole }; // 0.3, 'paper'
  readonly tourPulse: { readonly floor: number };                         // 0.6
}
export const emphasis = { highlight: { role: 'accent' }, dim: { level: 0.3, toward: 'paper' }, tourPulse: { floor: 0.6 } }
  as const satisfies EmphasisTokens;
```

`motion/index.ts` is not touched and does not re-export this file. `import type` from `theme` adds no runtime coupling.

## Internal modules (pure; `src/interaction/`)

```ts
// pick.ts — slabs are axis-aligned in world space; the camera rotates, the model doesn't
export interface Ray { readonly origin: Vec3; readonly direction: Vec3 }
export function rayBoxDistance(ray: Ray, center: Vec3, size: Vec3): number | null;   // slab method; nearest t ≥ 0 or null
export function pick(ray: Ray, layout: ProjectLayout, progress: ArrayLike<number>): number | null;
//   progress uses the explode-timeline index order: [layers…, components…]
//   centre_i = lerp(imploded_i, exploded_i, progress[i]); size_i = placement.size (rest positions: NO hover lift)
//   tests every layer slab and component; nearest hit wins; nearest = layer slab → null; returns the component index

// pointer.ts
export interface PointerState { readonly highlight: string | null; readonly source: 'none' | 'mouse' | 'touch' | 'program' }
export type PointerInput =
  | { type: 'move'; hit: string | null }   // mouse pointermove (also the per-frame re-pick)
  | { type: 'leave' }                      // mouse pointerleave
  | { type: 'tap'; hit: string | null }    // click after a non-mouse pointerdown
  | { type: 'outsideTap' }                 // document pointerdown outside the viewer
  | { type: 'set'; id: string | null }     // actions.highlight
  | { type: 'reset' };
export const INITIAL_POINTER: PointerState;  // { highlight: null, source: 'none' }
export function pointerReducer(state: PointerState, input: PointerInput): PointerState;
//   move: hit ≠ null → { hit, 'mouse' }; hit = null → clear only if source = 'mouse'
//   leave: clear only if source = 'mouse'
//   tap: hit = null or hit = highlight → clear; else { hit, 'touch' }
//   outsideTap: clear only if source = 'touch'
//   set: { id, id ? 'program' : 'none' }

// focus.ts
export interface FocusState { readonly layerId: string | null }
export type FocusAction = { type: 'toggle'; layerId: string } | { type: 'release' } | { type: 'reset' };
export function focusReducer(state: FocusState, action: FocusAction, layerIds: readonly string[]): FocusState;
//   toggle: unknown id → unchanged; same id → null; other id → that id (one at a time)
export function escapeTarget(tour: TourStatus, focus: FocusState): 'stopTour' | 'releaseFocus' | null;
//   tour ≠ 'idle' → 'stopTour'; else focus.layerId ≠ null → 'releaseFocus'; else null (Esc not consumed)

// tour.ts — beat = motion.durations.tourBeat (the BASE token, both motion modes; RFC D10)
export type TourStatus = 'idle' | 'playing' | 'paused' | 'ended';
export interface TourFlow { readonly id: string; readonly path: readonly string[] }
export interface TourState {
  readonly flowId: string | null;  // selected flow; flows[0].id initially; null if no flows
  readonly status: TourStatus;
  readonly step: number;           // -1 when idle
  readonly anchor: number;         // playing: time the current step started; paused: elapsed in step
}
export type TourAction =
  | { type: 'play' | 'pause' | 'stop' | 'step' | 'tick'; now: number }
  | { type: 'selectFlow'; flowId: string; now: number }
  | { type: 'reset'; flows: readonly TourFlow[] };
export function initialTour(flows: readonly TourFlow[]): TourState;
export function tourReducer(state: TourState, action: TourAction, flows: readonly TourFlow[], beat: number): TourState;
//   every action first folds elapsed beats (playing: while now − anchor ≥ beat → step++, anchor += beat; past last → 'ended')
//   play:  idle|ended → playing step 0 anchor now · paused → playing, anchor = now − elapsed · playing → unchanged
//   pause: playing → paused, anchor = now − anchor (elapsed, < beat)
//   step:  idle|ended → paused step 0 · playing|paused → paused step+1 (elapsed 0), or 'ended' past last
//   stop:  → idle step −1 · selectFlow(other known id) → idle on that flow · unknown id → unchanged
//   tick:  fold only (the adapter's beat wake-up)
export interface TourPosition {
  readonly status: TourStatus; readonly step: number; readonly total: number;
  readonly componentId: string | null;        // null when idle
  readonly stepStartedAt: number | null;      // absolute time the visible step began (caption/pulse phase)
  readonly nextBoundary: number | null;       // absolute time of the next auto-advance (playing only)
}
export function positionAt(state: TourState, now: number, flows: readonly TourFlow[], beat: number): TourPosition;
export function showFlowSelector(flows: readonly TourFlow[]): boolean;   // flows.length > 1

// emphasis.ts
export interface ChannelTiming { readonly rise: number; readonly fall: number; readonly ease: (t: number) => number }
export interface Channels {
  readonly count: number;
  setTargets(targets: ArrayLike<number>, now: number): void;  // each channel retargets from its current value
  sample(now: number, out: Float32Array): boolean;            // writes values; returns settled
}
export function createChannels(count: number, timing: ChannelTiming): Channels;
//   duration = (target > from ? rise : fall) × |target − from|; 0 → instant (static twin)
export interface EmphasisInput {
  readonly highlight: string | null; readonly focusLayerId: string | null;
  readonly focusSuspended: boolean;   // tour status ≠ 'idle'
  readonly tourComponentId: string | null;
}
export function emphasisTargets(layout: ProjectLayout, input: EmphasisInput):
  { hover: Float32Array /* components */; tour: Float32Array /* components */; dim: Float32Array /* layers */ };
export function pulseAt(now: number, stepStartedAt: number, tokens: MotionTokens, floor: number): number;
//   yoyo between 1 and floor, period 2 × durations.tourPulse, eased by easings.tourPulse; durations.tourPulse = 0 → 1
export function componentWeights(h: number, t: number, pulse: number, d: number, level: number): { tint: number; toPaper: number };
//   tint = max(h, t × pulse); toPaper = (1 − level) × d × (1 − h)
export function layerWeight(d: number, level: number): number;   // (1 − level) × d
export function liftWorld(px: number, zoom: number, elevation: number): number;  // px / (zoom × cos(elevation))
```

Timings come from tokens via the adapter: hover channel `{ rise: durations.hoverLift, fall: durations.hoverSettle, ease: easings.hover }`, dim channel `{ rise: durations.hoverSettle, fall: durations.hoverSettle, ease: easings.hover }`, tour channel `{ rise: durations.tourPulse, fall: durations.tourPulse, ease: easings.tourPulse }`. Easing evaluation reuses `easeFromToken` from `src/motion/ease.ts` (import only).

## Emphasis rendering (`scene/Emphasis.tsx` + additive `Slabs`) — Stage 2 correction to RFC D3

- **Material colour stays the S4 role colour** (`lineMuted` / `line`). S4's frozen `scene.test.tsx` asserts `material.color` equals those roles, and RFC D3's "material white" would have broken it. Instead, **`instanceColor` is a per-channel multiplier**: three's shader computes `diffuse = material.color × instanceColor` in the linear working space. So `instanceColor = target ⊘ base` (per channel, linear), and **white (1, 1, 1) = unchanged S4 colour**. Values above 1 are valid in the float attribute. Base role channels are nonzero in both themes (asserted in `emphasis-tokens.test.ts`). A guard clamps the divisor to a tiny epsilon for OSS palettes with a zero channel.
- Both meshes get an `InstancedBufferAttribute(new Float32Array(count × 3).fill(1), 3)` as `instanceColor` **before first render** (the shader is compiled with `USE_INSTANCING_COLOR` only if it exists then).
- **Target colours:** component `c = mix(line, accent, tint)`, then `mix(c, paper, toPaper)`; layer `mix(lineMuted, paper, layerWeight)`. Mixing uses `three.Color.lerp` in linear space; the roles come from `emphasis` + the active `Palette`.
- **Lift:** `Slabs.writeInstances` adds `lift[i]` (world units, from `liftWorld(distances.hoverLift × h_i, camera.zoom, VIEW.elevation)`) to component `y`. With no driver, lift = 0 and the code path is S4's.
- **Driver contract (additive Slabs prop `emphasis?: EmphasisDriver`):**
  ```ts
  interface EmphasisDriver {
    sample(now: number, zoom: number): boolean;   // advances channels + pulse; returns "still moving or playing"
    lift: Float32Array;                           // per component, world units
    writeColors(layers: InstancedMesh, components: InstancedMesh): boolean;  // returns true if anything changed
  }
  ```
  `Slabs`' `useFrame`: if the explode timeline is pending **or** `driver.sample(now, zoom)` → write matrices (with lift) + colours, `invalidate()`. When the driver reports settled and the timeline is settled, nothing runs. `Emphasis.tsx` builds the driver from the interaction state (props), the resolved tokens and the palette, and calls `invalidate()` whenever its targets change.
- **Data attributes:** the driver reports `tweening` (any channel moving) and `pulse` (tour pulse running) through an `onEmphasisPhase` callback → `TeardownViewer` writes `data-xploder-tweening` / `data-xploder-pulse` via the wrapper ref (no React render per frame).

## Picking adapter (`usePointerPick.ts`, `scene/PickBridge.tsx`)

- `PickBridge` (inside the Canvas) stores `{ camera, progress }` in a ref passed from `TeardownViewer`; `progress` is the `Float32Array` that `Slabs` already samples (exposed via an additive `progressRef` prop).
- `usePointerPick(stageRef, bridgeRef, layout, dispatch)` attaches listeners to the **stage div** that wraps only the `<Canvas>` (the caption is a sibling, so its events never reach the picker): `pointermove` (mouse only), `pointerleave`, `pointerdown` (records `pointerType`), `click` (a tap when the last `pointerdown` was not `'mouse'`). NDC from `getBoundingClientRect`; ray from `Raycaster.setFromCamera` → plain `Vec3`s → `pick`.
- While the explode timeline or camera turn is moving and the mouse is inside, the last pointer position is re-picked once per frame (`PickBridge` `useFrame`, dispatching only on change).
- Cursor: `canvas.style.cursor = hit ? 'pointer' : ''` on mouse moves.
- Outside tap: while `source === 'touch'`, a `document` `pointerdown` listener whose target is outside the wrapper dispatches `outsideTap`; removed otherwise.

## Public API additions (`xploder/react`, additive)

```ts
export type TourStatus = 'idle' | 'playing' | 'paused' | 'ended';
export interface TeardownViewerHandle {            // S4 fields unchanged
  /* S4: target, rig, azimuthDegrees, can, actions, onKeyDown */
  readonly highlight: string | null;
  readonly focus: { readonly layerId: string | null; readonly suspended: boolean };
  readonly tour: {
    readonly flows: readonly { readonly id: string; readonly label: string }[];   // label ?? id
    readonly flowId: string | null; readonly status: TourStatus;
    readonly step: number; readonly total: number; readonly showFlowSelector: boolean;
  };
  readonly actions: TeardownViewerActions & {
    highlight(id: string | null): void;
    toggleFocus(layerId: string): void; releaseFocus(): void;
    selectFlow(flowId: string): void; play(): void; pause(): void; stop(): void; step(): void;
  };
}
export function useTeardownViewer(opts?: {
  initial?: 'imploded' | 'exploded';
  project?: ViewerProject;        // the SAME object passed to <TeardownViewer project> (RFC R2)
  now?: () => number;             // tests; default performance.now() / 1000
}): TeardownViewerHandle;

export type ViewerProject = LayoutInput & {                 // a parsed Project satisfies it
  meta: { slug: string };
  layers: readonly { id: string; name?: string; components: readonly { id: string; name?: string; summary?: string }[] }[];
  flows?: readonly { id: string; label?: string; description?: string; path: readonly string[] }[];
};
export interface TeardownViewerProps { /* S4 props unchanged */ project: ViewerProject; }
```

- **Behaviour in the hook:** pointer, focus and tour reducers; actions dispatch with `now()`. `play()` calls `explode()` first when `target === 'imploded'`. Interaction state resets when `project.meta.slug` changes (state-adjust-on-prop-change pattern, no effect loop). A `window` `keydown` listener for `Escape` exists only while `escapeTarget(…) !== null`, skips `defaultPrevented` events, and calls `preventDefault()` when it consumes the key. `useTourClock` schedules one `setTimeout` to `positionAt(…).nextBoundary` while playing and dispatches `tick`.
- `TeardownViewer` warns once in development when `viewer` was built with a different `project` object (identity check).
- `layoutProject` still receives the project unchanged; `ViewerProject` only widens what the viewer may read.

## Overlay architecture (`overlay/TourCaption.tsx`)

```text
<div wrapper tabIndex=0 role=group data-xploder-*>     (S4; position: relative)
  <div data-xploder-stage>  <Canvas/>  </div>          picking listeners live here
  <div data-xploder-caption aria-live="polite">        sibling, position: absolute; inset-block-start + inset-inline-start; max-inline-size
     <p>{flow.label} · Step k of n</p>                  palette.label
     <p>{component.name}</p>                            palette.ink
     <p>{component.summary}</p>                         palette.ink (omitted when absent)
     <p>{flow.description}</p>                          step 0 only
  </div>
</div>
```

- Rendered only when `tour.status !== 'idle'`. Styles are inline objects from the active `Palette` (`surface` background, `ink` text, `label` secondary, `line` border), `userSelect: 'text'`, `pointerEvents: 'auto'`. Layout lengths use rem/ch units (not motion literals).
- **Caption beat:** on each step change, the caption element runs `element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(durations.tourPulse), delay: ms(staggers.tourStep), easing: easings.tourPulse.css, fill: 'backwards' })`. Static twin: both 0 → the animation is skipped and the text appears in the same frame. The option values are token variables, so the `motion-key` scanner rule stays green.
- Zero CLS: start point fixed (top-left anchor), opacity is the only animated property, text swaps inside the box.

## Interaction state flow

```text
mouse move/leave ─┐                                  ┌─ actions.highlight(id)
touch tap / outside┼─▶ usePointerPick ─▶ pick() ─▶ pointerReducer ─▶ highlight ─┐
layer button ───────────▶ actions.toggleFocus ─▶ focusReducer ─▶ focus.layerId ─┤
Esc (window, while active) ─▶ escapeTarget ─▶ stop() | releaseFocus() ──────────┤
tour buttons/selector ─▶ tourReducer(+ tick from useTourClock) ─▶ tour state ───┤
                                                                                ▼
             emphasisTargets(layout, { highlight, focusLayerId, focusSuspended = tour≠idle, tourComponentId })
                     │                                         │
          createChannels(hover|tour|dim, resolved tokens)       positionAt(now) ─▶ <TourCaption> (DOM)
                     │ useFrame: sample → componentWeights/layerWeight, pulseAt, liftWorld
                     ▼
          Slabs: setMatrixAt (+lift) · instanceColor (target ⊘ base) · invalidate() while moving/playing
```

## Data flow

```text
projectCJson ─parseProject(json,{registry})─▶ Project ─▶ useTeardownViewer({ project }) ─▶ handle
  └─▶ <TeardownViewer project viewer> ─▶ layoutProject(project) (S4) ─▶ Scene(+emphasis, +pick bridge) ─▶ Slabs (2 meshes)
                                     └─▶ TourCaption(project, positionAt(now), palette, tokens)
```

## Playground (`apps/web/app/dev/engine/engine-playground.tsx`)

- Fixture switch gains **C** (`projectCJson` from `xploder/fixtures`; `?fixture=a|b|c`).
- `useTeardownViewer({ initial, project })`.
- **`<TeardownViewer layoutOptions={{ explodedGap: 2 }}>`** (F6 decision A, RFC §9.8): a consumer option of the existing S4 API, so S4 `LAYOUT_DEFAULTS` and tests stay unchanged. With it, every component of A, B and C is visible when exploded at all four azimuths (smallest visible area 0.31 world units², `evidence/F6-log-visibility.txt`), at a fit-zoom cost of ×0.72.
- **Layer focus**: one button per `project.layers` entry (`data-engine-control="focus-<layerId>"`, `aria-pressed={viewer.focus.layerId === id}`, `disabled={viewer.focus.suspended}`).
- **Tour**: Play/Pause (one toggle button), Step, Stop (`data-engine-control="tour-play|tour-step|tour-stop"`), and when `viewer.tour.showFlowSelector` a segmented group (`data-engine-control="flow-<flowId>"`, `aria-pressed`). Hidden entirely when the project has no flows.
- **URL params** (read once after mount, like S4): `highlight=<componentId>` → `actions.highlight`; `focus=<layerId>` → `toggleFocus`; `flow=<flowId>` → `selectFlow`; `tour=play` → `play()`; `tour=paused&step=<n>` → `step()` n+1 times (n is 0-based); `loop=1` → when `tour.status` becomes `ended`, `play()`.
- Readout gains `Highlight`, `Focus`, `Tour` rows (`data-engine-highlight`, `data-engine-focus`, `data-engine-tour`).
- Only existing Tailwind theme utilities; no motion utilities.

## Scanners (`apps/web/test`)

| Scanner | Change |
|---|---|
| `no-motion-literals` | non-vacuity list += `src/interaction/{pick,pointer,focus,tour,emphasis}.ts`, `src/react/scene/Emphasis.tsx`, `src/react/overlay/TourCaption.tsx`, `src/react/useTourClock.ts`, `src/react/usePointerPick.ts`. (`src/motion/emphasis.ts` sits inside `motion/` and is exempt by design, like `ease.ts`.) |
| `no-color-literals` | non-vacuity list += the same files |
| `package-consumer` | engine identifiers += `Raycaster`, `setColorAt`, `instanceColor` |
| `fixture-exclusion` | unchanged (route list already has `dev/engine`); must stay green |

## Evidence CLIs (`tools/perf`)

```text
pnpm engine:probe <url> [--out <dir>] [--only s4|s5]      exit 0 all checks pass · 2/3/4 per contract · 6 a check failed
  S4 block unchanged (fixtures now a/b/c: c = 5 layers / 13 components, drawCalls 2).
  S5 block, observations → checks:
    hitMap   { imploded|exploded: { [componentId]: [x,y][] }, grid: { cols, rows } }      (mouse sweep, desktop 1280×800)
             exploded-all-components-hit (holds with explodedGap 2, F6) · imploded-top-layer-hit
    hover    { state, id, highlight, cursor, pixelBefore, pixelAfter, accent } ×2 states
             hover-highlight-{exploded,imploded} · hover-cursor-pointer · hover-pixel-toward-accent · hover-leave-clears
    touch    trace: [{ type, pointerType, t }] · tap results ×2 states (context: hasTouch, isMobile, 390×844)
             tap-highlight-{exploded,imploded} · tap-second-clears · tap-other-switches · tap-empty-clears · tap-outside-clears · trace-pointertype-touch
    cls      { total, entries[] }                                                          cls-zero
    focus    toggle/esc/toggle-release/explode/rotate snapshots + pixel at a dimmed component
             focus-toggle-sets · focus-pixel-toward-paper · focus-esc-releases · focus-toggle-releases · focus-survives-explode · focus-survives-rotate
    tour     per flow (a: live-update, offline-read; c: pickup-ready, push-failed): step timeline (componentIds)
             tour-order-<fixture>-<flowId> ×4 · tour-pause-holds · tour-step-advances-one · tour-stop-clears · tour-camera-still · tour-focus-suspended-restored
    selector selector-a-visible · selector-b-hidden · selector-c-two-flows
    caption  selection round-trip text, user-select, computed color/background (light + dark) vs palette
             caption-selectable · caption-tokens-light · caption-tokens-dark
    reduced  (reducedMotion: 'reduce') MutationObserver log of data-xploder-tweening/pulse, frames per change, step times
             rm-hover-instant · rm-focus-instant · rm-tour-instant · rm-no-tween-attr · rm-tour-cadence
  Pixel checks decode a screenshot clip in the page (Image → 2D canvas → getImageData); "toward X" = distance to X decreases.
  writes engine-probe.json, touch-trace.json, screenshot-<group>-<state>.png

pnpm fps:engine [--scenario explode|tour] [--no-build] [--out <dir>]   exit 0 verdict pass · 6 verdict fails · 1/2/3/4 per contract
  explode (default, S4): unchanged route /dev/engine?fixture=a&cycle=1 via `pnpm fps`; verdict recomputed without literal60
  tour: in-process Playwright (same launch helper as the fps CLI), desktop profile,
        /dev/engine?fixture=a&state=exploded&flow=live-update&tour=play&loop=1
        → wait [data-xploder-ready=true][data-xploder-tour=playing]
        → measureFps(page, { trigger: install a MutationObserver counting data-xploder-tour-step changes })  (default warmup/window from fps.ts)
        → read counter + data-engine-draw-calls
  fps.json = FpsResult + { scenario, tourStepsAdvanced?, drawCalls?, verdict: { rule: 'dropped-frames', droppedFrames0, liveness, pass } }
  liveness = inBand(fps, FPS_NOMINAL, FPS_TOLERANCE) (band only). No literal fps comparison exists anywhere in the tool.
```

**RFC D12 refinement:** `pnpm fps` has no trigger option, so the tour scenario autoplays via `tour=play` and measures in-process with `measureFps` (whose `trigger` installs the step counter). The window is still entirely inside an active tour (`live-update` = 9.6 s, `loop=1` beyond that).

## Test map

| File | Proves | AC |
|---|---|---|
| `xploder/test/frozen-surface.test.ts` | every frozen file's sha256 equals the `53b2b2b` manifest | AC3, AC6 |
| `xploder/test/emphasis-tokens.test.ts` | roles exist in `Palette`; `0 < level < 1`; `0 < floor < 1`; base role channels nonzero (light + dark) | AC1, AC2 |
| `xploder/test/pick.test.ts` | ray-box unit cases; centre rays (pure camera maths from `VIEW`) hit each component at progress 0/1, 4 azimuths; imploded occlusion → null; nearest wins; lift ignored | AC1 |
| `xploder/test/pointer.test.ts` | full transition table (mouse, touch, program, outside) | AC1 |
| `xploder/test/focus.test.ts` | toggle/switch/release/unknown; `escapeTarget` table; property test: 2,000 random interleavings of explode/implode/rotate/zoom with focus actions → focus equals a reference model | AC2 |
| `xploder/test/fixture-c.test.ts` | parse with registry; 5 layers / 13 components / footprint 3 × 2; layout determinism + own snapshot; flows reference known ids; selector rule A/C true, B false | AC3 |
| `xploder/test/tour.test.ts` | step order = `flow.path` for A×2, B, C×2 (clock driven beat by beat); play/pause (elapsed kept)/resume/step/stop/ended/replay; selectFlow; tick folding; beat taken from the argument, never from the static twin | AC3, AC4 |
| `xploder/test/emphasis.test.ts` | channels: rise/fall timing, retarget continuity, static twin instant; `emphasisTargets` incl. focus suspension; `componentWeights` (hover reveals dimmed); `pulseAt` bounds/period; `liftWorld` | AC1, AC2, AC4 |
| `xploder/test/emphasis-scene.test.tsx` | both meshes have `instanceColor` at mount; neutral = all white (S4 colours); highlight → component colour = `accent` at tween end (target ⊘ base × base); focus → others = `mix(role, paper, 0.7)`, still after explode + rotate; still 2 `InstancedMesh`; lift = `liftWorld(…)` | AC1, AC2 |
| `xploder/test/pick-scene.test.tsx` | closed loop: project each component centre with the real rig camera → `setFromCamera` → `pick` = same id (4 azimuths × both states, visible ones when imploded) (R1) | AC1 |
| `xploder/test/viewer-handle.test.tsx` | hook: play auto-explodes; focus suspended while tour ≠ idle and restored; Esc layering; slug change resets; unknown ids ignored | AC2, AC3 |
| S4 suites (frozen, untouched) | still green: S4 behaviour unchanged | AC6 |
| `apps/web/test/*` scanners | motion, color, package consumer, fixture exclusion | AC1, AC6 |
| `tools/perf/test/engine-probe.test.ts` | S5 check evaluation on synthetic observations (pass + one failing case per group) | supports AC1–AC4 evidence |
| `tools/perf/test/fps-engine.test.ts` | verdict = dropped-frames rule; no `literal60` key; scenario URL builder | supports AC5 |

## Phase groups (Stage 3 STOP points)

| Group | Tasks | Proves | Needs from Murphy at STOP |
|---|---|---|---|
| **G1 pure core** | T001–T005 | AC1 (pick/pointer), AC2 (focus), AC3 (tour order, fixture C, frozen surface) | validation |
| **G2 renderer + overlay + playground** | T006–T010 | AC1, AC2, AC3 in the real viewer; AC6 consumer/scanners; **push + draft PR** | eyeball `/dev/engine` in Orca's browser (hover, focus, tour on A/C) |
| **G3 evidence** | T011–T014 | AC1–AC5 evidence, AC6 screenshots | validation of the evidence set |
| **G4 ship** | T015 | AC6 + AC self-check | final validation, then "merge" |

Usage pacing: each group starts in a fresh 5h window; no new task starts at ≥ 85% of the 5h window.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| pure ray ⇄ AABB pick | occlusion across two meshes, rest-position hit boxes, Node-testable (AC1) | R3F `instanceId` events: stale bounding sphere after explode, no cross-mesh occlusion, not unit-testable |
| `instanceColor` as a ratio multiplier | emphasis inside 2 draw calls **and** S4's frozen material-colour test | white material + absolute colours: breaks the frozen S4 test · extra mesh/outline pass: +draw calls |
| emphasis channels (own tween) | interruptible, token-timed, one frame loop (same pattern as S4 explode) | GSAP/react-spring: rejected in S4 D4 |
| pure tour machine + beat timer | exact step order is test-asserted; reduced motion keeps cadence with zero frames between steps | a running rAF clock: frames during reduced-motion beats; untestable timing |
| frozen-surface hash manifest | "diff-verified" in CI without git history (shallow checkout) | git-diff-only: needs full history in CI |
| S5 probe groups + touch trace | AC1/AC3/AC4 need real-browser proof (tap, selection, computed styles, frames) | unit tests can't observe touch, CLS, WebGL pixels or computed styles |
| `fps:engine --scenario tour` | reproducible AC5 run with proof the tour was live | `pnpm fps` has no trigger and can't read the DOM |
