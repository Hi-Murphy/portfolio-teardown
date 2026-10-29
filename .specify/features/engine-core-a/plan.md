# Implementation Plan: S04 Engine Core A — Layout · Explode · Camera

**Feature dir:** `.specify/features/engine-core-a/` · **Branch:** `task/s04-engine-core-a` · **Date:** 2026-10-29 · **Inputs:** `spec.md`, `rfc.md` (approved, §9; round-1 revisions confirmed)

## Summary

`packages/xploder` gains the engine as **new modules only**: a pure layout (`xploder/layout`), an internal explode timeline and camera rig (`src/engine/`), a cubic-bezier evaluator inside `src/motion/` (not exported), and an R3F renderer (`xploder/react`) that draws every slab with **2 instanced meshes** and sources timing from `xploder/motion` and color from `xploder/theme`. The S2 schema/parse/tokens public API is untouched. `apps/web` gets a dev-only route `/dev/engine` (S3 `fixture.tsx` mechanism) that only wires fixtures and buttons to `xploder/react`. Three new scanner tests (color literals, free orbit, package consumer) join the motion scanner. The exclusion checks cover the new route. `tools/perf` gains two CLIs (`engine:probe`, `fps:engine`) for evidence.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict (`noUncheckedIndexedAccess`), React 19.3, Next 16.4 static export, Node 24 |
| New deps | `xploder` peers (optional): `react ^19.3.1`, `three ^0.186.1`, `@react-three/fiber ^9.8.2` · `xploder` dev: same three + `@types/three ^0.186.0`, `@types/react ^19.3.0`, `@react-three/test-renderer ^9.1.1`, `eslint-plugin-react-hooks ^7.1.1` (the version `eslint-config-next` already resolves) · `apps/web` deps: `three ^0.186.1`, `@react-three/fiber ^9.8.2` (peer satisfaction only). **No drei, no GSAP, no jsdom.** |
| Renderer | R3F `<Canvas orthographic frameloop="demand" dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>` |
| Tests | vitest (Node). Pure logic + `@react-three/test-renderer` scene graph. Real-browser behaviour via `engine:probe` (Playwright). |
| Targets | 2 draw calls (S4 scene); 60 fps floor (AC4 rule per E1); zoom `[1 × fit, 3 × fit]`; azimuth `45° + k·90°` |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`; S2 files listed under "Guards" |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-006 quote AC1–AC6 verbatim; FR-004 flagged blocked pending Merlin, text unchanged. Supporting work maps to brief deliverables 1–7 only. |
| II. Static-only shell | No server code. The playground is a static client page, absent from the production export. |
| III. Performance is a feature | 2 draw calls, demand frame loop, DPR ≤ 2, no per-frame allocation. The landing page bundle is unchanged (T001 checks it). |
| IV. Single motion source | Explode, implode and the camera turn take timing only from `xploder/motion` tokens. Solver constants live in `src/motion/ease.ts`. The scanner covers engine + playground, with a non-vacuity assertion. |
| V. Theme integrity | Colors come only from `blueprint.light/dark`. A new hex/color scanner covers `apps/web` and `xploder/src` except `theme/`. S1 toggle and OS paths are honoured. |
| VI. Evidence over assertion | Every visual/motion task attaches screenshots, `engine-probe.json` or `fps.json` per `EVIDENCE.md`. |
| VII. No secrets | No new secrets. Evidence holds `127.0.0.1` and public `*.vercel.app` URLs only. |
| Constraints (stack) | three + R3F are the planned engine stack (brief: "first Three.js/R3F code"). The dependency list was approved by Murphy (RFC §9.3). |

## Project Structure

### Documentation (this feature)

```text
.specify/features/engine-core-a/
  rfc.md  spec.md  plan.md  tasks.md
  evidence/   E1-fps-literal-probe.txt, T0NN-*.{txt,png,json}, AC-selfcheck.md
```

### Source code (changes only)

```text
package.json (root)                    + scripts: engine:probe, fps:engine
AGENTS.md                              §2 exports list + §3 commands (T001, T009)
.github/workflows/perf.yml             fixture-exclusion job: + assert-absent …/dev/engine (preview + prod) (T008)

packages/xploder/
  package.json                         exports + ./layout ./react ./fixtures; optional peers; dev deps (T001)
  tsconfig.json                        + "jsx": "react-jsx" (T001)
  eslint.config.mjs                    + react-hooks plugin for *.tsx (T001)
  src/
    layout/
      index.ts                         public: layoutProject, fitZoom, LAYOUT_DEFAULTS, VIEW, types   (T002)
      types.ts  layout.ts  fit.ts  view.ts
    motion/
      ease.ts                          NEW, internal: parseCubicBezier, cubicBezier, easeFromToken     (T003)
      index.ts                         UNCHANGED (S2 frozen)
    engine/                            internal, never exported directly
      explode.ts                       createExplodeTimeline                                          (T003)
      camera.ts                        cameraReducer, RigAction, ZOOM_BOUNDS, keyToAction, createTurnTween (T004)
    react/
      index.ts                         public: TeardownViewer, useTeardownViewer, useBlueprintPalette, usePrefersReducedMotion, types (T005)
      TeardownViewer.tsx  useTeardownViewer.ts
      scene/Slabs.tsx  scene/CameraRig.tsx  scene/Lights.tsx  scene/Stats.tsx
      env.ts                           resolveThemeMode, subscribeTheme(env), subscribeReducedMotion(env)  (T005)
      usePalette.ts  useReducedMotion.ts
  test/
    exports.test.ts  layout.test.ts  ease.test.ts  explode.test.ts  camera.test.ts  env.test.ts  scene.test.tsx
    __snapshots__/layout.test.ts.snap  (new; the S2 snapshot file is untouched)

apps/web/
  package.json                         + three, @react-three/fiber (T001)
  app/dev/engine/page.fixture.tsx      route /dev/engine, marker data-perf-fixture="engine"            (T007)
  app/dev/engine/engine-playground.tsx 'use client'; controls, query params, readout                   (T007)
  test/fixture-exclusion.test.ts       routes list + both markers in positive control                  (T008)
  test/source-scan.ts                  shared file walker + hit formatter for the three new scanners   (T006)
  test/no-color-literals.test.ts       (T006)
  test/no-free-orbit.test.ts           (T006)
  test/package-consumer.test.ts        (T006)
  test/no-motion-literals.test.ts      + non-vacuity assertion (T006)

tools/perf/
  src/engine-probe.ts  src/cli/engine-probe.ts  src/cli/fps-engine.ts   (T009)
  test/engine-probe.test.ts                                            (T009)
```

`engine-playground.tsx` is a plain `.tsx` module, not a route file. Only the gated `page.fixture.tsx` imports it, so it never enters the production graph. T008's `out/` scan proves it.

## Guards (every task)

- **Frozen files:** `git diff --quiet b504fba -- .specify/slices .specify/KICKOFF.md .specify/KICKOFF-S02.md .specify/KICKOFF-S03.md .specify/KICKOFF-S04.md && echo FROZEN-OK` (b504fba = last Stage 1 commit). *Exception:* a Merlin-committed brief revision merged from `main` (E1) — the guard base moves to that merge commit and the move is noted in the ledger.
- **S2 contract:** `git diff --quiet b504fba -- packages/xploder/src/schema packages/xploder/src/parse.ts packages/xploder/src/errors.ts packages/xploder/src/index.ts packages/xploder/src/motion/index.ts packages/xploder/src/theme packages/xploder/test/fixtures packages/xploder/test/__snapshots__/generality.test.ts.snap packages/xploder/test/geometry-free.test.ts && echo S2-OK`.

## Public API (`xploder/layout`)

```ts
export type Vec3 = readonly [x: number, y: number, z: number];
export interface Box { readonly min: Vec3; readonly max: Vec3 }

export interface LayoutInput {                       // structural; a parsed Project satisfies it
  readonly layers: readonly { readonly id: string; readonly components: readonly { readonly id: string }[] }[];
}
export interface LayoutOptions {
  readonly componentSize: number;       // 0.8   footprint edge of a component slab (cell pitch = 1)
  readonly componentThickness: number;  // 0.12
  readonly slabThickness: number;       // 0.08
  readonly margin: number;              // 0.3   slab border around the grid, each side
  readonly explodedGap: number;         // 1.1   clear gap between slabs when exploded
  readonly componentLift: number;       // 0.12  extra lift of components off their slab when exploded
}
export const LAYOUT_DEFAULTS: LayoutOptions;

interface SlabPlacement { readonly size: Vec3; readonly imploded: Vec3; readonly exploded: Vec3 }  // box centers
export interface LayerSlab extends SlabPlacement { readonly id: string; readonly index: number }
export interface ComponentSlab extends SlabPlacement {
  readonly id: string; readonly layerId: string; readonly layerIndex: number;
  readonly slot: number; readonly cell: readonly [col: number, row: number];
}
export interface ProjectLayout {
  readonly version: 1;
  readonly footprint: { readonly cols: number; readonly rows: number; readonly width: number; readonly depth: number };
  readonly layers: readonly LayerSlab[];          // data order; index 0 = top
  readonly components: readonly ComponentSlab[];  // layer-major, slot order
  readonly bounds: { readonly imploded: Box; readonly exploded: Box };
}

export function layoutProject(project: LayoutInput, options?: Partial<LayoutOptions>): ProjectLayout; // pure, deep-frozen

export const VIEW: {                     // shared by fitZoom and the camera rig
  readonly baseAzimuth: number;          // π/4      (45°)
  readonly snap: number;                 // π/2      (90°)
  readonly elevation: number;            // atan(1/√2) — true isometric
  readonly fitMargin: number;            // 0.08
};
export function fitZoom(bounds: Box, viewport: { width: number; height: number }): number;
// px per world unit at which `bounds` fits viewport × (1 − 2·fitMargin) at ALL four azimuths (minimum over the four)
```

**Layout algorithm** (RFC D2): `nMax = max(1, max n)`, `cols = ceil(√nMax)`, `rows = ceil(nMax / cols)`; footprint `width = cols + 2·margin`, `depth = rows + 2·margin`. Per layer: `c = ceil(√n)`, `r = ceil(n / c)`, row-major, the grid and a partial last row centered. The cell `(col, row)` center is `x = col − (c − 1)/2` (adjusted for the partial row), `z = row − (r − 1)/2`, with axis signs chosen so slot 0 is top-left on screen at 45°. Vertical pitch is `slabThickness + componentThickness` (imploded) or `slabThickness + componentThickness + explodedGap` (exploded). The stack is centered on `y = 0`, and layer 0 has the highest `y`. Component `y` = slab top + `componentThickness / 2`, plus `componentLift` when exploded. `-0` → `0`; output deep-frozen.

## Internal modules

```ts
// src/motion/ease.ts — the only place with solver constants (AGENTS.md §5 allows animation numbers here)
export function parseCubicBezier(css: string): readonly [number, number, number, number]; // 'cubic-bezier(a, b, c, d)' → tuple; throws on anything else
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number; // Newton + bisection fallback; f(0)=0, f(1)=1
export function easeFromToken(token: MotionEasing): (t: number) => number;  // parseCubicBezier(token.css) → cubicBezier

// src/engine/explode.ts
export type Phase = 'imploded' | 'exploding' | 'exploded' | 'imploding';
export interface ExplodeTimeline {
  readonly count: number;                                   // layers.length + components.length
  readonly target: 0 | 1;
  setTarget(target: 0 | 1, now: number): void;              // captures current p_i as from_i
  sample(now: number, out: Float32Array): boolean;          // writes p_i; returns settled
  phase(now: number): Phase;
}
export function createExplodeTimeline(layout: ProjectLayout, tokens: MotionTokens, initial: 0 | 1): ExplodeTimeline;
// instance i: layer slabs first (slot 0), then components. On setTarget at `now`:
//   d = |target − from_i|
//   explode: delay_i = d · (layerIndex · staggers.explodeLayer + slot · staggers.explodeComponent); dur_i = d · durations.explode; ease = easeFromToken(easings.explode)
//   implode: delay_i = d · (L − 1 − layerIndex) · staggers.implodeLayer;                          dur_i = d · durations.implode; ease = easeFromToken(easings.implode)
//   p_i(t) = from_i + (target − from_i) · ease(clamp((t − now − delay_i) / dur_i, 0, 1)); dur_i = 0 → p_i = target immediately
// tokens = resolveMotion(prefersReduced) → static twin gives settled at t = now.

// src/engine/camera.ts
export type RigAction = { type: 'rotateLeft' } | { type: 'rotateRight' } | { type: 'zoomIn' } | { type: 'zoomOut' } | { type: 'zoomReset' };
export const RIG_ACTION_TYPES: readonly RigAction['type'][];       // exactly the five, asserted by test
export interface RigState { readonly step: 0 | 1 | 2 | 3; readonly turns: number; readonly zoomFactor: number }
//   `turns` = signed count of 90° turns (for shorter-arc display); step = mod(turns, 4)
export const ZOOM_BOUNDS: { readonly min: 1; readonly max: 3; readonly step: 1.25 };
export const INITIAL_RIG: RigState;                                  // { step: 0, turns: 0, zoomFactor: 1 }
export function cameraReducer(state: RigState, action: RigAction): RigState;  // clamps zoomFactor
export function azimuthOf(turns: number): number;                    // VIEW.baseAzimuth + turns · VIEW.snap
export function keyToAction(key: string): RigAction | null;          // ArrowLeft/ArrowRight/+/=/-/_/0
export function createTurnTween(tokens: MotionTokens): {             // displayed azimuth
  setTarget(azimuth: number, now: number): void;                     // from = current displayed value
  sample(now: number): { azimuth: number; settled: boolean };        // durations.implode / easings.implode; static twin = cut
};
```

## Public API (`xploder/react`)

```ts
export interface TeardownViewerHandle {
  readonly target: 'imploded' | 'exploded';
  readonly rig: RigState;
  readonly azimuthDegrees: number;              // target azimuth, normalised to [0, 360) (G2 review fix: no app-side angle math)
  readonly can: { zoomIn: boolean; zoomOut: boolean; zoomReset: boolean };  // zoomAvailability(rig): true exactly when the action changes the zoom (G2 feedback fix)
  readonly actions: {
    toggle(): void; explode(): void; implode(): void;
    rotateLeft(): void; rotateRight(): void; zoomIn(): void; zoomOut(): void; zoomReset(): void;
  };
  readonly onKeyDown: (event: React.KeyboardEvent) => void;    // keyToAction → dispatch; preventDefault on handled keys only
}
export function useTeardownViewer(opts?: { initial?: 'imploded' | 'exploded' }): TeardownViewerHandle;
// initial undefined → reduced motion ? 'exploded' : 'imploded'

export interface ViewerStats { drawCalls: number; triangles: number; frame: number; instances: { layers: number; components: number } }
export interface TeardownViewerProps {
  project: LayoutInput & { meta: { slug: string } };    // laid out internally (memoised layoutProject)
  viewer: TeardownViewerHandle;
  palette?: Palette;                                     // override; default useBlueprintPalette()
  layoutOptions?: Partial<LayoutOptions>;
  onStats?: (stats: ViewerStats) => void;               // after each rendered frame whose stats changed
  onSettled?: (state: 'imploded' | 'exploded') => void; // explode/implode settled
  className?: string;
  'aria-label'?: string;                                 // default: `${meta.slug} architecture view`
  fallback?: React.ReactNode;                            // when WebGL is unavailable
}
export function TeardownViewer(props: TeardownViewerProps): React.JSX.Element;
// renders <div tabIndex=0 role="group" aria-keyshortcuts="ArrowLeft ArrowRight + - 0" onKeyDown
//   data-xploder-state data-xploder-azimuth data-xploder-zoom data-xploder-ready style="touch-action: pan-y pinch-zoom">
//   <Canvas …><CameraRig/><Lights/><Slabs/><Stats/></Canvas></div>
// data-* attributes are written imperatively via a ref on phase/rig change (no React re-render per frame).

export function useBlueprintPalette(): Palette;          // subscribeTheme(window env) → blueprint[mode]
export function usePrefersReducedMotion(): boolean;      // subscribeReducedMotion(window env) using reducedMotion.query

// src/react/env.ts (pure, unit-tested with fakes)
export function resolveThemeMode(s: { hasDarkClass: boolean; hasLightClass: boolean; prefersDark: boolean }): 'light' | 'dark';
//   mirrors paletteCss(): .dark → dark; else prefersDark && !.light → dark; else light
export function subscribeTheme(env: ThemeEnv, cb: (mode: 'light' | 'dark') => void): () => void;
export function subscribeReducedMotion(env: MotionEnv, cb: (reduced: boolean) => void): () => void;
```

**Scene internals:** `Slabs` = two `<instancedMesh args={[geometry, material, count]} key={slug}>` sharing one `BoxGeometry(1, 1, 1)`. Each frame while not settled: `timeline.sample(clock.elapsedTime, progress)`, then per instance `position = lerp(imploded, exploded, p)`, `scale = size` → `dummy.updateMatrix()` → `setMatrixAt`, then `needsUpdate`, `invalidate()`. Materials: `MeshLambertMaterial({ color })` for layers (`palette.lineMuted`) and components (`palette.line`), updated with `color.set()` + `invalidate()` on palette change. `Lights`: `ambientLight` + `directionalLight` (intensities only). `CameraRig`: on rig/resize change → `camera.zoom = fitZoom(bounds.exploded, size) · zoomFactor`, `updateProjectionMatrix()`. Displayed azimuth from `createTurnTween` → `camera.position` on a sphere around the origin at `VIEW.elevation`, then `lookAt(0, 0, 0)`. `Stats`: reads `gl.info.render` after render → `onStats`.

## Data flow

```text
projectAJson ─parseProject(json,{registry: parseTechRegistry(techRegistryJson)})─▶ Project
  ─▶ <TeardownViewer project viewer>  ─useMemo─▶ layoutProject(project) ─▶ ProjectLayout (frozen)
        ├─ usePrefersReducedMotion() ─▶ resolveMotion(reduced) ─▶ MotionTokens
        ├─ createExplodeTimeline(layout, tokens, initial) ◀─ viewer.target changes (toggle/explode/implode)
        │     useFrame: sample(t) ─▶ setMatrixAt ×2 meshes ─▶ invalidate() until settled ─▶ onSettled
        ├─ cameraReducer(rig, action) ◀─ buttons (app) / onKeyDown (keyToAction)
        │     fitZoom(bounds.exploded, viewport) × zoomFactor ─▶ camera.zoom
        │     createTurnTween(tokens) ─▶ displayed azimuth ─▶ camera.position/lookAt
        └─ useBlueprintPalette() ◀─ <html class> MutationObserver + matchMedia ─▶ material colors
```

## Playground (`apps/web/app/dev/engine`)

- `page.fixture.tsx` (server component): `<main data-perf-fixture="engine" className=…><EnginePlayground/></main>` plus a heading. No engine imports.
- `engine-playground.tsx` (`'use client'`): reads `fixture`, `state`, `cycle` from `window.location.search` after mount; parses fixtures from `xploder/fixtures` via `parseProject`; `useTeardownViewer({ initial: state === 'exploded' ? 'exploded' : undefined })`; renders the controls (fixture A/B, toggle, ⟲, ⟳, −, reset, +, the existing `ThemeToggle`) as plain `<button>`s calling `viewer.actions.*`; a `<dl>` readout with `data-engine-draw-calls`, `data-engine-frame`, `data-engine-instances` from `onStats`; with `cycle=1`, `onSettled` calls `viewer.actions.toggle()` synchronously. Tailwind classes only from existing theme tokens; no motion utilities with literals.
- `next/dynamic(() => import('xploder/react').then(m => m.TeardownViewer), { ssr: false })` keeps three out of the server prerender.

## Exclusion (extends S3)

- `fixture-exclusion.test.ts`: `FIXTURE_ROUTES = ['fixtures/fps-calibration', 'dev/engine']`; `existsSync(out/fixtures)` and `existsSync(out/dev)` both false; no file name or content contains any route string or `data-perf-fixture`; positive control: `out-fixtures/` contains `data-perf-fixture="fps-calibration"` **and** `data-perf-fixture="engine"`.
- `perf.yml` `fixture-exclusion` job: after each existing `assert-absent.ts` step, a sibling step for `…dev/engine` (preview on PR, `$PRODUCTION_URL/dev/engine` on push to main).

## Scanners (`apps/web/test`)

All three new scanners share `source-scan.ts` (file walk with the motion scanner's exclusions, plus `{ roots, include }`). Each has per-rule negative-control samples and a non-vacuity assertion (named engine/playground files are in the scanned set).

| Scanner | Roots | Rules |
|---|---|---|
| `no-color-literals` | `apps/web` (code + CSS), `packages/xploder/src` minus `theme/` | `#[0-9a-fA-F]{3,4}\b` / `{6}\b` / `{8}\b` inside quotes or CSS values; `0x[0-9a-fA-F]{6}\b`; `\brgba?\(`; `\bhsla?\(`; `new Color\(\s*['"][a-z]+['"]` |
| `no-free-orbit` | `apps/web`, `packages/xploder/src`, both `package.json`s | imports from `@react-three/drei`, `three/examples`, `three/addons`, `three-stdlib`, `camera-controls`; identifiers `OrbitControls MapControls TrackballControls ArcballControls FlyControls FirstPersonControls PointerLockControls CameraControls TransformControls DragControls` |
| `package-consumer` | `apps/web/app` | import specifiers `three`, `three/*`, `@react-three/*`, `xploder/src*`; any `xploder/<x>` where `<x>` isn't in `packages/xploder/package.json#exports`; identifiers `useFrame useThree InstancedMesh setMatrixAt Matrix4 OrthographicCamera BoxGeometry` |
| `no-motion-literals` (existing) | unchanged | + non-vacuity: `src/engine/explode.ts`, `src/engine/camera.ts`, `app/dev/engine/engine-playground.tsx` scanned |

## Evidence CLIs (`tools/perf`)

```text
pnpm engine:probe <url> [--out <dir>]        exit 0 all checks pass · 2 usage · 3 unreachable · 4 browser · 6 a check failed
  url = base of a served out-fixtures (e.g. http://127.0.0.1:4199/); probes <url>dev/engine?…
  writes engine-probe.json + screenshot-*.png:
  { kind:'engine-probe', version:1, url, chromium,
    fixtures: { a: { instances:{layers,components}, drawCalls }, b: { … } },
    camera: { defaultAzimuth, afterButtonRight, afterArrowRight, zoomAfter20In, zoomAfter20Out, zoomAfterReset,
              disabledAtDefault: { zoomOut, zoomReset }, disabledAtMax: { zoomIn } },   // zoom loops use the + / - keys (disabled buttons can't be clicked)
    motion: { explode: { phases:[…], settledMs }, implode: { phases:[…], settledMs } },
    reducedMotion: { initialState, afterToggle: { phases:[…], framesIn1s }, afterToggleBack: { … } },
    checks: [{ name, pass, expected, actual }], pass }
  checks: a = 4/8 instances, b = 4/5, drawCalls = 2 · azimuth 45 → 135 (button) → 225 (ArrowRight)
          zoom factors 3 / 1 / 1 · normal phases include exploding then exploded (and imploding then imploded)
          reduced: initial 'exploded'; afterToggle phases = ['imploded'] only, framesIn1s ≤ 2; back the same

pnpm fps:engine [--no-build] [--out <dir>]   exit 0 measured & r1 verdict pass · 6 r1 fails · 1/3/4 per contract
  build:fixtures → serveDir(out-fixtures) → desktop profile → /dev/engine?fixture=a&cycle=1
  → measureFps(page, { warmupMs: 1000, durationMs: 5000 }) → fps.json (S3 FpsResult fields)
     + verdicts: { literal60: fps >= 60, r1: bandPass(60 ± FPS_TOLERANCE) && droppedFrames === 0 } + screenshot
  The AC4 verdict is read from fps.json under the rule in force after E1; the CLI never changes thresholds.
```

## Test map

| File | Proves | AC |
|---|---|---|
| `xploder/test/layout.test.ts` | determinism (a–e), golden snapshots A/B, sweep invariants, `fitZoom` ≥ all 4 azimuths | AC1 |
| `xploder/test/ease.test.ts` | parse/solver accuracy vs reference points, endpoints, monotone for token curves | AC2 |
| `xploder/test/explode.test.ts` | both directions, staggers, interruption continuity, spam → last target, static twin, token proportionality | AC2 |
| `xploder/test/camera.test.ts` | exact action union, 10k random sequences (azimuth snaps, zoom bounds), `keyToAction` table, turn tween (between snaps, ends on snap, retarget, static twin = cut) | AC3 |
| `xploder/test/env.test.ts` | `resolveThemeMode` truth table; subscribe/unsubscribe with fake env | AC6 (visual correctness), AC2 (reduced-motion subscription) |
| `xploder/test/scene.test.tsx` | 2 `InstancedMesh` with counts A 4/8, B 4/5; ortho camera; 45° → 135° after `rotateRight` settles; `controls === null` | AC1, AC3 |
| `xploder/test/exports.test.ts` | `exports` has `.`, `./motion`, `./theme`, `./layout`, `./react`, `./fixtures`; root API unchanged | AC5 |
| `apps/web/test/*` scanners | color, free orbit, package consumer, motion non-vacuity | AC2, AC3, AC5, AC6 |
| `apps/web/test/fixture-exclusion.test.ts` | route + markers absent from `out/`, present in `out-fixtures/` | AC1, AC6 |
| `tools/perf/test/engine-probe.test.ts` | report shape + check evaluation on a synthetic observation | supports AC2/AC3 evidence |

## Phase groups (Stage 3 STOP points)

| Group | Tasks | Proves | Needs from Murphy at STOP |
|---|---|---|---|
| **G1 pure core** | T001–T004 | AC1 (layout), AC2 (timeline), AC3 (rig), AC5 (surface) | validation |
| **G2 renderer + playground** | T005–T008 | AC1, AC3, AC5, AC6 (exclusion); draft PR opens | eyeball `/dev/engine` in Orca's browser |
| **G3 evidence** | T009–T011 | AC2, AC3, AC4 (measurement), AC6 (screenshots) | E1 outcome, if known |
| **G4 ship** | T012 | AC6 + AC self-check | final validation, merge |

Usage pacing: each group starts in a fresh 5h window; no new task starts at ≥ 85% of the 5h window.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| custom tween + cubic-bezier solver | one frame loop (R3F demand), token-only timing, testable with an injected clock | GSAP: second loop, non-OSI licence for the OSS lib, ~27 KB gz |
| pure rig reducer + turn tween | AC3 must be provable in code: discrete state, exact action union | camera-controls/drei: orbit code in the bundle, one prop away from free orbit |
| `xploder/fixtures` export | the playground needs A/B through the package (AC5) | copying JSON into the app: two sources of truth |
| three scanners + shared walker | AC3/AC5 + brief's "hex grep" need code-level proof | manual review isn't evidence |
| `engine:probe` CLI | real-browser proof of reduced motion, snaps, zoom clamps and draw calls | jsdom/unit tests can't observe WebGL frames or real `matchMedia` |
| `fps:engine` CLI | reproducible AC4 run (build → serve → measure) | ad-hoc commands aren't repeatable evidence |
