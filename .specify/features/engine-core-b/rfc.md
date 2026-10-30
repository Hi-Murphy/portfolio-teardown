# RFC — S05 Engine Core B: Hover · Layer Focus · Guided Tour

**slice:** S05-engine-core-b · **status:** REVIEWED round 1 (2026-10-30): defaults accepted, six self-review refinements R1–R6 applied (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-05-engine-core-b.md` (frozen brief v1) · **branch:** `task/s05-engine-core-b` · **base:** `53b2b2b` (brief freeze, = `main` at kickoff) · **date:** 2026-10-30

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins and the conflict should be raised as an open question.

---

## 1. Context (from the brief)

- **Mission:** build the interaction layer on top of Engine Core A: **component hover highlight, layer focus, and the guided data-flow tour**, so that an architecture can be read in motion. All motion comes from S2 tokens, and every claim carries S3 evidence.
- **Live from S4:** layout engine, instanced renderer, explode ⇄ implode, camera rig (locked 45°, 90° snaps, bounded zoom) in `packages/xploder`; the dev playground `/dev/engine` (prod-excluded, renders fixtures A and B); 2 draw calls on fixture A.
- **Live from S2:** the schema includes `flows[]`, and a project may have several flows. Motion tokens are the only source of easings, durations and staggers (grep-enforced). Theme tokens exist for light and dark.
- **Live from S3:** perf gates, the FPS harness, `pnpm evidence` and `.specify/EVIDENCE.md`. **Measurement doctrine (binding):** animation perf gates use the dropped-frames style: 0 dropped frames over a headless window of at least N seconds, the fps band as a liveness check, and raw fps reported as information only. Never a literal fps threshold.
- **Design target:** a mid-range Android phone on 4G. Touch has no hover, so **tap is the hover equivalent**.
- **Non-goals (hard):** detail/case-study panels and tech chips (S7) · blueprint materials, edge lines, dimension annotations (S6) · full keyboard-navigation drill and screen-reader pass (S8; S5 only keeps controls keyboard-reachable) · site shell (S10) · real content (S9) · cross-project links (S14) · camera auto-fly (v2) · pixel shader (v1.5) · **no changes to the S2 public API or to S4 layout/camera behaviour** (new modules only).

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | hover (desktop) and tap (touch emulation) highlight a component slab in both exploded and imploded states; highlight visuals trace to tokens only (exclusivity greps green: motion + hex); zero CLS contribution. |
| AC2 | layer focus dims non-focused layers to the token level; `Esc` and toggle both release; state survives explode/implode and 90° camera snaps; unit tests green. |
| AC3 | tour plays fixture A's flow step-order-exactly (asserted by test); play/pause/stop/step all work; captions are selectable HTML overlay text styled from theme tokens; fixture C shows the multi-flow selector and both flows play; fixture C validates via the frozen schema with zero package-API changes (diff-verified). |
| AC4 | with `prefers-reduced-motion` emulated: hover/focus/tour produce instant state changes, no tweens (verified via emulation + evidence artifact). |
| AC5 | perf gate, dropped-frames style: **0 dropped frames over a ≥5s headless window while the tour is actively playing** on fixture A (`/dev/engine`), fps within the 60 ±10% liveness band, raw fps/intervals reported as information; draw-call count documented and not regressed vs S4 baseline; evidence artifact attached per EVIDENCE.md. |
| AC6 | all engine logic in `packages/xploder` (apps/web thin-consumer test still green); full CI green on the PR (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); `/dev/engine` still 404s on production; screenshots attached (light+dark × hover/focus/tour). |

### Starting point (S04, checked on this branch at `53b2b2b`)

| Item | State |
|---|---|
| Package surface | `xploder` exports `.`, `./motion`, `./theme`, `./layout`, `./react`, `./fixtures`. Engine internals (`src/engine/explode.ts`, `src/engine/camera.ts`, `src/motion/ease.ts`) are unexported. |
| Renderer | `Slabs.tsx`: **2 `InstancedMesh`es** (layers, components) sharing one unit `BoxGeometry`, `MeshLambertMaterial` coloured by `palette.lineMuted` / `palette.line`, **no `instanceColor`**. `frameloop="demand"`. Matrices are written only while the explode timeline runs. |
| Camera | Orthographic. R3F's default orthographic frustum is in CSS pixels, so `camera.zoom` = pixels per world unit. Elevation `VIEW.elevation` (true isometric), azimuth `45° + 90°·turns`. |
| Viewer API | `useTeardownViewer({ initial })` → `{ target, rig, azimuthDegrees, can, actions, onKeyDown }`. `<TeardownViewer project viewer palette? …>` renders a focusable wrapper (`tabIndex=0`, keyboard: arrows, `+ - 0`) with `data-xploder-state|ready|azimuth|zoom`. |
| Pointer input | **None.** R3F's event system is mounted by default but no object has handlers. |
| Motion tokens | `durations.hoverLift 0.18` / `hoverSettle 0.24` / `tourPulse 0.5` / `tourBeat 1.6`; `easings.hover` (power3.out), `easings.tourPulse` (sine.inOut); `staggers.tourStep 0.15`; `distances.hoverLift 4` (CSS px). `resolveMotion(true)` (static twin) sets **every** duration, stagger and distance to 0, **including `tourBeat`**. There is **no focus/dim token** and no token literally named `hover` or `tour`; those are token families (D2). |
| Theme tokens | `Palette` roles: `paper surface grid line lineMuted ink label accent steel` + `tech.*`. No opacity or emphasis levels. |
| Flows in fixtures | **A** `tidewatch`: **2 flows**, `live-update` (6 steps) and `offline-read` (5 steps). **B** `ledgerline`: 1 flow (4 steps). Flow schema: `{ id?, label?, description?, path: id[] (min 2) }`. **No per-step caption field** (F1). |
| Scanners | `no-motion-literals` (rules `css-time css-easing gsap-ease motion-key tw-utility timer`), `no-color-literals` (hex, `0x`, `rgb/hsl(`, `new Color('name')`; excludes `theme/`), `no-free-orbit`, `package-consumer` (forbids `three`, `@react-three/*`, `xploder/src/*` and engine identifiers in `apps/web/app`). New files under `xploder/src` and `apps/web` are covered automatically. |
| FPS tooling | `pnpm fps:engine` measures `/dev/engine?fixture=a&cycle=1` and writes **two verdicts**: `literal60: fps >= 60` (informational, a leftover from S4 round 1) and `r1: pass && droppedFrames === 0` (gating). FPS = DrawFrames ÷ window, so **an idle demand-mode canvas reads as low fps** (D12). |
| `engine:probe` | 20 checks (fixtures, camera, explode phases, reduced-motion frames). No pointer, focus or tour coverage. |

### Environment facts checked 2026-10-30

| Item | Fact | Source |
|---|---|---|
| Node | v24.19.0 (`.nvmrc` 24) | local |
| Tier-2 executor | `OPENROUTER_API_KEY` **unset** → tier 2 is skipped, as in S02–S04 | local env |
| Tier-1 executor | `codex` present with a `deepseek` provider profile | local config |
| Tech registry | 12 ids: `kotlin typescript android nodejs jetpack-compose coroutines kotlinx-serialization hilt okhttp websocket room gradle`. Fixture C may only use these (the registry is frozen fixture data). | `tech-registry.json` |
| Colour contrast (measured, flat colours) | Highlight candidates against component `line`: **`accent`** CR 1.44 / ΔE 32.0 (light), **CR 1.02 / ΔE 21.5 (dark)**; `ink` CR 1.81 / ΔE 40.7 (light), 1.58 / 28.3 (dark). Dim level 0.30 toward `paper`: component vs paper **1.65 (light) / 1.99 (dark)** (full: 7.58 / 9.36); layer slab 1.36 / 1.42 (full: 3.23 / 3.78). | local calculation, sRGB WCAG + CIE76 |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Module tree, package surface, frozen-surface guard (AC3, AC6)

- **R: all new logic in new modules; S2 and S4 files byte-identical; no new package exports.**

  | Path | New / changed | Contents | three/React? |
  |---|---|---|---|
  | `src/interaction/pick.ts` | new | ray ⇄ AABB picking over the layout (D4) | no |
  | `src/interaction/pointer.ts` | new | hover/tap intent reducer (D4) | no |
  | `src/interaction/focus.ts` | new | layer-focus reducer + `Esc` mapping (D5) | no |
  | `src/interaction/tour.ts` | new | tour state machine + step clock (D6) | no |
  | `src/interaction/emphasis.ts` | new | per-instance emphasis channels and target resolution (D3) | no |
  | `src/motion/emphasis.ts` | new | **emphasis tokens** (D2) | no |
  | `src/react/scene/Emphasis.tsx`, `src/react/overlay/TourCaption.tsx`, `src/react/usePointerPick.ts` | new | R3F/DOM adapters | yes |
  | `src/react/scene/Slabs.tsx`, `Scene.tsx`, `TeardownViewer.tsx`, `useTeardownViewer.ts`, `react/index.ts` | **changed, additive only** | optional props/fields; with no interaction state the output is identical to S4 (proved by test, D11) | yes |
  | `test/fixtures/project-c-*.json` + one re-export line in `test/fixtures/index.ts` | new + 1 line | fixture C (D9) | no |

- **Frozen set (must be byte-identical to `53b2b2b`):** S2 = `src/schema/**`, `src/parse.ts`, `src/errors.ts`, `src/index.ts`, `src/motion/index.ts`, `src/theme/**`, `test/fixtures/{project-a-ui-app,project-b-pipeline,tech-registry}.json`; S4 = `src/layout/**`, `src/engine/**`, `src/motion/ease.ts`, `src/react/scene/CameraRig.tsx`, `test/__snapshots__/*.snap`, and `package.json` `exports`.
- **Guard, two layers:** (1) a vitest **hash manifest** (`packages/xploder/test/frozen-surface.test.ts`): sha256 of every frozen file, generated once from `53b2b2b` and committed. It runs in CI without git history (the checkout may be shallow). (2) The **diff log** `git diff --stat --exit-code 53b2b2b -- <frozen set>` as a committed evidence file at T5 and at G4. Together they are the "diff-verified" proof for AC3. **Scope (round 1, R5):** the manifest's header names it as the S5 freeze. A later slice that legitimately changes one of these files (S6 materials, for example) regenerates the manifest in the same diff and states the reason in its commit message, so the guard never blocks a later slice silently.
- **No new subpath export.** The new modules are imported relatively inside the lib, like S4's `engine/`. They can be exported additively later, for example a headless `xploder/interaction` for OSS consumers. **Open question 1.**
- **Rejected:** editing `engine/explode.ts` or `CameraRig.tsx` (S4 behaviour is frozen) · a new `xploder-interaction` package (premature) · putting the dim level into `theme/blueprint.ts` (S2 token API frozen).

### D2 — Emphasis tokens: the "token-defined dim level" (AC1, AC2)

- **R: a new token file `src/motion/emphasis.ts`**, typed like S2 tokens (`as const satisfies EmphasisTokens`), not exported from `motion/index.ts`:

  ```ts
  export const emphasis = {
    highlight: { role: 'accent' },  // palette role used for hover/tap/tour tint
    dim:       { level: 0.3, toward: 'paper' },  // non-focused layers keep 30% of their colour distance from paper
    tourPulse: { floor: 0.6 },      // tour-target tint oscillates between 0.6 and 1 while playing
  } as const satisfies EmphasisTokens;
  ```

- **Why `motion/`:** the dim level and the pulse floor are the end points and amplitude of animated fades. AGENTS.md §5 allows animation numbers only under `src/motion/`, so placing them there keeps the rule airtight without touching `motion/index.ts`. Colours are palette **roles** (strings), never hex, so the hex scanner stays green with no exception.
- **Why these values (measured, §1):** at 0.3 the dimmed components sit at 1.65:1 (light) and 1.99:1 (dark) against paper, compared with 7.6:1 and 9.4:1 for the focused layer. That is a clear figure/ground split, and the dimmed layers still read as context. The value is tuned once with screenshot evidence (T6), like S4's layout constants. **Open question 2.**
- **Highlight role = `accent`** because it is the semantic emphasis role. Measured caveat (**F5**): in dark theme `accent` and `line` have almost the same luminance (CR 1.02). The highlight is carried by hue (ΔE 21.5) plus the hover lift and the tour pulse. The measured alternative is `ink` (ΔE 40.7 / 28.3), which reads as near-black in light theme. **Open question 2.**
- **Token families used (no new timing values):**

  | Channel | Rise | Fall | Ease | Distance |
  |---|---|---|---|---|
  | hover/tap highlight (tint + lift) | `durations.hoverLift` | `durations.hoverSettle` | `easings.hover` | `distances.hoverLift` (px) |
  | layer dim | `durations.hoverSettle` | `durations.hoverSettle` | `easings.hover` | — |
  | tour target tint | `durations.tourPulse` | `durations.tourPulse` | `easings.tourPulse` | — |
  | tour pulse (while playing) | period `2 × durations.tourPulse`, yoyo | | `easings.tourPulse` | — |
  | tour step cadence | `durations.tourBeat` per step | | — | — |
  | caption beat | appears `staggers.tourStep` after the step starts, fades in over `durations.tourPulse` | | `easings.tourPulse` | — |

  The layer-dim fade borrows the hover family because no focus token exists, and S2 tokens are frozen. **Open question 4.**

### D3 — Rendering emphasis inside the 2-draw-call budget (AC1, AC2, AC5)

- **R: per-instance colour (`InstancedMesh.instanceColor`) plus a per-instance y-offset for the lift.** Both meshes get an `instanceColor` buffer before first render, so the shader is compiled with `USE_INSTANCING_COLOR`. Material colour becomes white (`color.setScalar(1)`), so the instance colour is the token colour. **Draw calls stay at 2**, and the caption is HTML (0 calls).
- **Per-frame composition (pure weights from `interaction/emphasis.ts`, colour maths in the React adapter with `three.Color`):**
  - component *i* in layer *l*: `tint = max(h_i, t_i · pulse)`, `c = mix(line, accent, tint)`, then `c = mix(c, paper, (1 − dim.level) · d_l · (1 − h_i))`. **Hovering a dimmed component reveals it.**
  - layer slab *l*: `mix(lineMuted, paper, (1 − dim.level) · d_l)`.
  - lift: `y += h_i · distances.hoverLift / (camera.zoom · cos(VIEW.elevation))`. That is exactly `hoverLift` CSS px on screen at any zoom (R3F's orthographic zoom is px per world unit).
  - `h`, `t`, `d` are channel tweens: pure, injected clock, interruptible from the current value, the same pattern as S4's explode timeline.
- **Neutral state = S4:** with no highlight, focus or tour, every instance colour equals the S4 role colour (`line` / `lineMuted`). A scene test asserts this, so S4 visuals are provably unchanged.
- **Frame driving:** a new `Emphasis` `useFrame` samples the channels and calls `invalidate()` while any channel is moving or the tour is **playing** (the pulse). At rest it does nothing, so the canvas stays fully idle in demand mode.
- **Dim = opaque colour mix toward `paper`, not alpha.** The canvas is transparent over a flat `paper` background, so mixing toward `paper` looks like an opacity fade with no transparency sorting, no `depthWrite` problems, and no extra draw calls. **Trade-off:** a dimmed upper layer still occludes the focused layer behind it, exactly as in S4 today. Real alpha inside one instanced mesh would need either per-instance sorting or a second pass. **Open question 3.**
- **Rejected:** outline pass / post-processing (extra draw calls, conflicts with AC5's "not regressed" and with S6 edge lines) · per-instance alpha via an `onBeforeCompile` shader patch (instance order can't be sorted per frame without remapping ids, and it can't be unit-tested in Node) · `alphaHash` stochastic transparency (grain on a flat blueprint look) · a third mesh for the highlighted slab (+1 draw call).

### D4 — Picking: hover, tap, cursor (AC1)

- **R: a pure ray ⇄ AABB pick in `xploder`, driven by DOM pointer events on the canvas. R3F's event system is not used.**
  - Slabs are axis-aligned boxes in world space (the camera rotates, the model doesn't), so picking is a slab test per box. `pick(ray, layout, progress) → componentIndex | null` tests **all layer slabs and all components** and returns the nearest hit. **If the nearest hit is a layer slab, the result is `null`**, so components hidden inside the imploded stack can't be hovered through it.
  - **Hit boxes use rest positions (explode progress, no hover lift).** Otherwise a pointer at a slab's lower edge would unhover the slab as it lifts, then rehover it as it settles: a flicker loop.
  - The React adapter builds the ray with `Raycaster.setFromCamera(ndc, camera)` and passes plain `Vec3`s to `pick`. While an explode/implode or turn tween runs, the last pointer position is **re-picked every frame**, so a stationary mouse tracks moving slabs.
  - **Closed-loop correctness (round 1, R1).** A pure `pick` test proves the maths. It does not prove that the slab under the pointer is the one that lights up: an axis or sign error between camera placement and ray construction would highlight the wrong slab while every black-box check still passed. Two checks close the loop: (a) **in Node**, a test-renderer scene projects each component's centre through the **real** rig camera (`Vector3.project`), builds the ray back from that NDC with `Raycaster.setFromCamera`, and asserts `pick` returns that same id, for 4 azimuths × both states (visible components only when imploded); (b) **in the browser**, the probe screenshots a small clip around the pointer before and after hovering and asserts that **the pixel under the pointer changes toward `accent`**. It decodes the PNG in the page with a 2D canvas, so no new dependency is needed.
  - **Why not R3F `onPointerMove` + `instanceId`:** `InstancedMesh.raycast` caches a bounding sphere that goes stale after the explode moves the instances. It has no occluder semantics across the two meshes. It also can't be unit-tested in Node the way a pure function can.
- **Pointer semantics (`interaction/pointer.ts`, pure reducer):**
  - `pointerType === 'mouse'`: `pointermove` → highlight = hit (or `null`); `pointerleave` → clear; clicks do not change the highlight.
  - touch/pen: **tap = `click`** whose preceding `pointerdown` had `pointerType !== 'mouse'`. The browser only fires `click` for a real tap; a pan-y scroll gives `pointercancel` and no `click`. That means no tap-slop constant of ours. Tap a component → highlight it; **tap the same component again → clear**; tap another → switch; tap empty canvas → clear; a tap outside the viewer also clears (a document `pointerdown` listener, registered only while a touch highlight is active). **Open question 6.**
  - The wrapper keeps `touch-action: pan-y pinch-zoom` (S4), so page scroll on a phone is unchanged.
- **Cursor affordance:** `canvas.style.cursor = 'pointer'` while a component is under the mouse, otherwise reset. It is written directly to the DOM, with no React render per move.
- **Zero CLS:** hover and tap change only WebGL instance data, `cursor`, and `data-*` attributes. No DOM box moves. The caption overlay is designed not to shift either (D7). Proof: a `PerformanceObserver('layout-shift')` running through the whole probe script (D12).
- **Programmatic highlight:** `viewer.actions.highlight(id | null)` sets the same state (used by S7 chips later, and by the evidence URL params).

### D5 — Layer focus (AC2)

- **R:** `focus.ts` reducer, state `{ layerId: string | null }`. Actions: `toggle(layerId)` (same id → release, other id → switch, **one layer at a time**), `release`. `d_l` targets 1 for every layer ≠ focused.
- **Activation surface:** HTML toggle buttons per layer (`aria-pressed`), rendered by the consumer from `project.layers`. An unknown layer id is ignored. Clicking a layer **slab** does not focus it, because tap is already the hover equivalent on touch and overloading it would be ambiguous. **Open question 11.**
- **`Esc`:** a `window` `keydown` listener, **registered only while focus or a tour is active** and skipped when `event.defaultPrevented`. This is needed because keyboard focus is usually on a control button, not on the viewer wrapper. Esc is layered: **tour active → stop the tour** (which restores focus, D6); **otherwise focus active → release**. **Open question 7.**
- **Survives explode/implode and 90° snaps by construction:** focus state is independent of `target` and `rig` (separate reducer), and dimming is per layer index, so it follows the instances wherever the timeline moves them. Proved three ways: a property test interleaving random viewer actions with focus actions; a scene test (focus → explode → `rotateRight` → instance colours still dimmed); a probe screenshot sequence (D12).

### D6 — Tour state machine (AC3)

- **R: a pure machine with an injected clock** (`tour.ts`).

  ```
  state  = { flowId, status: 'idle'|'playing'|'paused'|'ended', step, anchor }
  idle    --play-->  playing(step 0)         idle    --step--> paused(step 0)
  playing --pause--> paused (elapsed kept)   paused  --play--> playing (resumes mid-beat)
  playing|paused --step--> paused(step+1), or ended if past the last step
  playing --clock: beat elapsed--> playing(step+1), or ended after the last beat
  ended   --play-->  playing(step 0)         ended   --step--> paused(step 0)
  any     --stop-->  idle                    any     --selectFlow(other)--> idle on the new flow
  ```

  - `positionAt(state, now) → { status, step, componentId, beatProgress }`. The machine has no timers, so it is fully unit-testable.
  - **Step order is exactly `flow.path`.** The AC3 test drives the clock beat by beat and asserts the emitted component ids `toStrictEqual(flow.path)` for **both** of fixture A's flows (F3), both of C's, and B's.
  - **`ended` holds the last step** (highlight + caption) until play (restart), step or stop. **Open question 8.**
- **Runtime:** the React adapter keeps the machine state and schedules **one wake-up per beat boundary** (`setTimeout` with a delay computed from the token; the scanner's `timer` rule only rejects literal digits). The R3F frame loop reads `positionAt(now)` directly, so the highlight is frame-exact and the DOM caption follows within a few ms.
- **Camera stays put:** the tour never dispatches a rig action. This is structural: the tour module has no access to the rig. The probe asserts azimuth and zoom are unchanged over a full tour.
- **Play on an imploded stack auto-explodes it** (`actions.explode()`, the S4 tween, unchanged), because most tour targets sit inside the assembled stack and can't be seen. Stop does not implode. **Open question 8.**
- **Coexistence with focus ("focus yields to tour highlight, restores after"):** while `status ≠ idle` the stored focus is **suspended** (every `d_l` targets 0, so the whole architecture is visible for the walk-through), and the focus controls show the stored layer as pressed but disabled. On `stop` (or `Esc`), the stored focus restores and fades back in. Hover keeps working during the tour.
- **Flow switch:** selecting another flow stops the current one and selects the new one in `idle`, with no autoplay. The selector stays enabled in every state (round 1, R4: disabling it while playing added state for no gain, because switching already stops the tour). **Open question 8.**

### D7 — Caption overlay (AC3)

- **R: an HTML `<div>` inside the viewer wrapper, absolutely positioned and anchored top-left, never part of the WebGL output.**
  - Content (F1, derived because the schema has no per-step caption): **flow label** · `Step k of n` · **component name** · component **summary** when present. The flow description is shown at step 0. The text is real DOM text: `user-select: text`, and the overlay stops pointer propagation, so selecting text doesn't pick slabs.
  - **Styled from theme tokens:** inline styles from the active `Palette` object, the same one the canvas uses (`surface` background, `ink` text, `label` secondary text, `line` border). There are no literals, and an OSS consumer's `palette` prop restyles both canvas and caption together.
  - **Zero CLS:** the box is top-anchored, so a longer caption grows downward without moving its start point. Swapping text inside it moves nothing else. Opacity is the only animated property.
  - **Caption beat:** step *k*'s caption appears `staggers.tourStep` after the step starts and fades in over `durations.tourPulse` / `easings.tourPulse`. The inline `transition` value is composed from token values in a helper, so the motion scanner's `motion-key` rule (which flags a literal after `transition:`) stays green.
  - **Accessibility floor for S5:** `aria-live="polite"` on the caption region; controls are native buttons. The full screen-reader pass is S8.
- **Rejected:** projecting the caption next to the 3D slab (per-frame DOM writes, CLS risk, and a "camera stays calm" goal it doesn't need) · drei `<Html>` (drei is banned by S4 D6) · CSS variables from `motionCss()` (assumes the consumer injected them; the lib must be self-contained).

### D8 — Controls and multi-flow selector (AC3, AC6)

- **R: headless in the lib, rendered by the consumer.** `useTeardownViewer({ initial?, project? })` adds additive fields to the handle.
  - **One source of truth (round 1, R2):** the hook takes the **same `project` object** that is passed to `<TeardownViewer>`, not a separate `flows` list. Flow paths, layer ids and caption text then all come from one object, and `TeardownViewer` warns in development if `viewer` was built from a different project.
  - **Project switch resets the interaction state:** when `project.meta.slug` changes (fixture A → C), highlight, focus and tour all return to their initial state. Otherwise, focusing A's `ui` layer and then switching to C would leave a focus on a layer id C doesn't have. Actions that name an unknown component, layer or flow id are ignored.

  The new handle fields:

  ```ts
  handle.highlight: string | null
  handle.focus: { layerId: string | null; suspended: boolean }
  handle.tour: { flows: { id; label }[]; flowId: string | null; status; step: number; total: number;
                 showFlowSelector: boolean /* flows.length > 1 */ }
  handle.actions += { highlight(id|null), toggleFocus(layerId), releaseFocus(),
                      selectFlow(id), play(), pause(), stop(), step() }
  ```

  `TeardownViewer` renders the caption overlay and writes `data-xploder-highlight|focus|tour|tour-flow|tour-step|tweening|pulse` on the wrapper for tests and evidence. The playground renders the buttons and the selector (a segmented button group with `aria-pressed`, matching the fixture switch). That is thin consumer code, so AC6's package-consumer scan stays meaningful. **Open question 11.**
- **Selector visibility rule** (`flows.length > 1`) is pure and lives in the lib. Fixture **A** (2 flows) and **C** (2 flows) show it; **B** (1 flow) is the negative control.

### D9 — Fixture C (AC3)

- **R: a new fictional project, `test/fixtures/project-c-<slug>.json`**, working name **"Lockerbay"**, a neighbourhood parcel-locker pickup service. It is an event/service shape, distinct from A (UI app) and B (linear pipeline):
  - **5 layers:** `client` · `api` · `services` · `storage` · `external`. **One layer has 5 components**, which gives a **3 × 2 footprint with a centred partial row**, a layout case neither A (2 × 2) nor B (2 × 1) exercises. About 12 components in total.
  - Uses all five `kind`s (`actor service store external module`), one `wip` and one `planned` status, and only the 12 existing registry tech ids.
  - **Two flows with explicit ids:** a happy path (`pickup-ready`: recipient → app → API → booking → locker registry → notifier → push gateway) and an error path (`push-failed`: shares the booking prefix, then the push fails → retry scheduler → dead-letter store). They share a prefix and diverge, which is what a selector is for.
- **Validation proof:** `parseProject(projectCJson, { registry })` succeeds through the frozen schema; new test file `fixture-c.test.ts` with its **own** snapshot file, so S4's `layout.test.ts.snap` stays byte-identical; generality assertions like B's; layout determinism for C.
- **"Zero package-API changes (diff-verified)":** the frozen-surface guard (D1) plus the fixture-C commit's own `git diff --stat` (only the JSON file, the one re-export line in `test/fixtures/index.ts`, and new tests). The re-export of `projectCJson` from `xploder/fixtures` is an additive **example-data** export, which the playground needs to reach C through the package. It is not part of the schema/parse/tokens API that Deliverable 4 freezes. **Open question 12.**

### D10 — Reduced-motion twins (AC4)

- **R:** the viewer already resolves `resolveMotion(prefersReduced)`. With the static twin:
  - hover/tap: tint changes in **one frame**; **no lift** (the static twin zeroes `distances.hoverLift`, which is the S2 static-twin policy);
  - focus: dim applies in one frame;
  - tour: target tint is instant, **no pulse**, caption appears instantly (`tourStep` = 0, `tourPulse` = 0).
- **Step cadence is preserved.** The static twin also zeroes `tourBeat`, but `tourBeat` is the narrative pace, not a tween. Using 0 would race through every step instantly and break "caption stepping preserved" (Deliverable 5). The tour clock therefore reads **`motion.durations.tourBeat` (the base token)** in both modes, and only the transitions use the resolved tokens. **Open question 9.**
- **Observable (split in round 1, R3):** `data-xploder-tweening` is `"true"` only while a **transition** (hover, dim or tour-target tint) is mid-tween. The continuous tour pulse is reported separately as `data-xploder-pulse`. Without the split, `tweening` would read `"true"` for the whole of a normal-motion tour and couldn't tell a tween from the pulse. Under reduced motion **neither** may ever be `"true"`, which a `MutationObserver` log in the probe checks. Rendered frames per state change = exactly 1 (`data-engine-frame` delta), including one frame per tour step and no frames between steps (the beat wake-up is a timer, not a running loop).

### D11 — Test strategy

| AC | Assertion | Where |
|---|---|---|
| AC1 | `pick`: rays through each component centre hit that component at progress 0 and 1, from all 4 azimuths; imploded: occluded components return `null`, top-layer components hit; nearest-hit ordering; rest-position hit boxes | `xploder/test/pick.test.ts` |
| AC1 | **closed loop:** project each component centre through the real rig camera → `setFromCamera` → `pick` returns the same id, 4 azimuths × both states (R1) | `xploder/test/pick-scene.test.tsx` (test-renderer) |
| AC1 | pointer reducer: mouse hover/leave; touch tap/second tap/other/empty/outside; mouse click is a no-op | `xploder/test/pointer.test.ts` |
| AC1 | scene: highlight → that instance's colour = `accent` mix at tween end; lift equals `hoverLift`/(zoom·cos elevation); **neutral state colours = S4 roles**; still exactly 2 `InstancedMesh` | `xploder/test/emphasis-scene.test.tsx` (test-renderer) |
| AC1 | motion + hex scanners cover the new files (non-vacuity list extended: `interaction/*.ts`, `scene/Emphasis.tsx`, `overlay/TourCaption.tsx`) | `apps/web/test/no-*-literals.test.ts` |
| AC2 | focus reducer: toggle, switch, release, `Esc` mapping, one-at-a-time; property test interleaving explode/implode/rotate with focus | `xploder/test/focus.test.ts` |
| AC2 | scene: non-focused instance colours = `mix(role, paper, 1 − level)` exactly; still dimmed after explode + `rotateRight` | `emphasis-scene.test.tsx` |
| AC3 | tour machine: step order `toStrictEqual(flow.path)` for A (both flows), B, C (both); play/pause (elapsed kept)/stop/step/ended transitions; flow switch → idle; focus suspended/restored | `xploder/test/tour.test.ts` |
| AC3 | fixture C parses through the frozen schema; C layout determinism; selector rule (A, C true; B false) | `xploder/test/fixture-c.test.ts` |
| AC3 | frozen-surface hash manifest | `xploder/test/frozen-surface.test.ts` |
| AC4 | channels with `resolveMotion(true)`: settled at `t = now`; tour cadence still `motion.durations.tourBeat` | `emphasis.test.ts`, `tour.test.ts` |
| AC6 | package-consumer scan still green; engine identifier list extended with `Raycaster`, `setColorAt`, `instanceColor` | `apps/web/test/package-consumer.test.ts` |

All logic is pure and runs in Node. React-level tests use `@react-three/test-renderer` as in S4 (no jsdom). Real-browser wiring is covered by the probe (D12).

### D12 — Evidence and the AC5 FPS proof

- **`pnpm engine:probe` extended** (same CLI, new check groups, same exit codes). New observations:
  - **Hit map:** for each state (imploded, exploded) the probe sweeps a grid of mouse positions and reads `data-xploder-highlight`. It records which component sits under which points: every component is hit at least once when exploded, and the top-layer components are hit when imploded. This is black-box, so no debug API is needed. It also gives the probe a target point for each id.
  - **Hover (desktop):** move to a component's point → highlight = id, `cursor: pointer`, and **the pixel under the pointer shifts toward `accent`** (R1, D4); leave → cleared. Both states.
  - **Tap (touch emulation):** a context with `hasTouch: true, isMobile: true`, using `page.touchscreen.tap`. Tap → highlight; tap again → cleared; tap other → switched; tap empty → cleared. **The pointer-event trace** (`type`, `pointerType`, timestamps) is recorded as the touch-emulation artifact. Both states.
  - **CLS:** `layout-shift` entries summed over the whole script = **0**, with the entries listed.
  - **Focus:** toggle → `data-xploder-focus`; `Esc` releases; toggle releases; focus → explode → rotate → still focused; screenshots after each step.
  - **Tour:** the `data-xploder-tour-step` timeline equals `flow.path` for A's flows and both of C's; pause holds the step across more than one beat; step advances one; stop clears; azimuth and zoom are unchanged over the tour; selector present for A and C and absent for B; the caption is selectable (a Selection API round-trip returns the caption text, and `user-select` ≠ `none`); the caption's computed `color` and `background-color` equal the `ink` and `surface` tokens in **both** themes.
  - **Reduced motion** (`reducedMotion: 'reduce'`): hover, focus and tour each change state with `data-xploder-tweening` never `"true"` and exactly 1 rendered frame per change; tour steps still advance at `tourBeat`.
- **Screenshot matrix (AC6):** `pnpm evidence` against URL-driven playground states (the evidence CLI cannot hover): `?fixture=a&state=exploded&highlight=<id>`, `…&focus=<layerId>`, `…&flow=live-update&tour=paused&step=2`, × `--color-scheme light|dark` → **3 states × 2 themes × (mobile + desktop) = 12 PNGs**, plus fixture C with its selector. The probe adds screenshots from **real** hover and tap, which prove the URL params render the same state that real input produces.
- **AC5 FPS:** `pnpm fps:engine --scenario tour` → `/dev/engine?fixture=a&state=exploded&flow=live-update&loop=1`. The `trigger` presses **Play** after warmup, then a 5 s window is measured (`live-update` lasts 6 × 1.6 = 9.6 s, and `loop=1` covers longer runs). **Pass rule = `droppedFrames === 0` AND fps inside 60 ±10% (liveness).** `fps`, `rafFps` and p50/p95/max intervals are reported as information. The artifact also records **`tourStepsAdvanced`** during the window (≥ 3 expected, which proves the tour was actually playing) and **`drawCalls`** (expected 2, the S4 baseline). The continuous tour pulse (D2) is what keeps frames flowing in demand mode during a beat; without it, an idle beat would read as low fps.
- **F2 — remove `literal60` from `fps:engine`.** The tool still computes `literal60: fps >= 60`, which is a literal fps threshold. The S5 kickoff makes any literal fps threshold in a task check a protocol violation. **R:** delete the `literal60` verdict for both scenarios; the only verdict is the dropped-frames rule. S4's committed evidence stays as it is (historical). **Open question 13.**
- **Engine FPS stays a local headless proof on the Mac GPU**, not a CI job, as in S4 D10 (ubuntu runners use software GL). The CI list in AC6 is unchanged.

### D13 — Execution ladder (Hard Rule 5)

- As S02–S04: **tier 1 = DeepSeek Flash** (`codex exec -p deepseek`, sandbox off for browser tasks); **tier 2 skipped** (`OPENROUTER_API_KEY` unset, checked 2026-10-30, logged per task). After 2 tier-1 failures: **pause and report with 5h/7d usage**, no automatic takeover (standing policy). Every task report names the tier that finished it. Each task runs in a fresh worktree off `task/s05-engine-core-b`.

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories:**
- **P1 — Visitor points at a part.** On desktop, hovering a slab lifts and tints it; on a phone, tapping does the same, and tapping again clears it. This works whether the stack is assembled or exploded, and nothing on the page jumps. → AC1
- **P1 — Visitor isolates a layer.** One toggle per layer dims every other layer; Esc or the same toggle brings them back; exploding or rotating doesn't lose it. → AC2
- **P1 — Visitor watches a request travel.** Play walks a flow slab by slab with a caption per step that can be read and selected; pause, step and stop work; projects with several flows offer a choice. → AC3
- **P2 — Reduced-motion visitor** gets the same states and the same step pacing with no tweens. → AC4
- **P2 — Reviewer trusts it.** Dropped-frame proof during a live tour, screenshots in both themes, touch traces, and a frozen-surface diff. → AC5, AC6

**FR mapping rule:** FR-001 ↔ AC1 … FR-006 ↔ AC6, one-to-one. D1 (surface/guard), D2 (emphasis tokens), D3 (instance colour), D7 (caption) and D9 (fixture C) are supporting requirements under the FR whose AC they serve. **No new acceptance criteria are invented.** The dim level, the highlight role and the pulse floor are documented values (D2), not new ACs.

**plan.md inputs:** D1–D12. Data flow:
`pointer event` → `Raycaster.setFromCamera` → `pick(ray, layout, progress)` → `pointerReducer` → `handle.highlight` · `layer button / Esc` → `focusReducer` → `handle.focus` · `tour buttons` → `tourMachine` (+ beat timer) → `handle.tour` · all three → `emphasisTargets(layout, state)` → channel tweens (`resolveMotion` tokens) → `useFrame`: weights → `setColorAt` + lift → `invalidate()` while moving or playing · `positionAt(now)` → `<TourCaption>` (palette-styled HTML).

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Task (one integration seam) | Executable check | AC |
|---|---|---|---|
| T1 | Frozen-surface guard: hash manifest test generated from `53b2b2b` + diff-log script; `src/motion/emphasis.ts` tokens + type test | `pnpm --filter xploder test frozen-surface` green; deliberately touching a frozen file turns it red (negative control logged) | AC3, AC6 |
| T2 | `interaction/pick.ts` + tests (both states, 4 azimuths, occlusion, rest-position boxes) | `pnpm --filter xploder test pick` green | AC1 |
| T3 | `interaction/pointer.ts` + `interaction/focus.ts` + tests (incl. focus/viewer property test) | `pnpm --filter xploder test pointer focus` green | AC1, AC2 |
| T4 | `interaction/tour.ts` + tests (step order for A×2, B, C×2 once C exists; controls; ended; flow switch; focus suspension; base-`tourBeat` cadence) | `pnpm --filter xploder test tour` green | AC3, AC4 |
| T5 | Fixture C JSON + re-export + `fixture-c.test.ts` (own snapshot) + diff evidence | `pnpm --filter xploder test` green; `git diff --stat 53b2b2b` log committed showing only additive files | AC3 |
| T6 | `interaction/emphasis.ts` channels + `scene/Emphasis.tsx` + `instanceColor`/lift in `Slabs` (additive) + `emphasis-scene.test.tsx` (neutral = S4, highlight, dim, still 2 meshes) + `pick-scene.test.tsx` (closed loop, R1) | test-renderer suite green; S4 suites untouched and green | AC1, AC2, AC4 |
| T7 | Pointer wiring: canvas listeners, ray, re-pick during tweens, cursor, outside-tap clear | typecheck/lint/test green; `pnpm dev` manual smoke logged (the real proof is T12) | AC1 |
| T8 | Handle API (D8) + `Esc` listener + tour runtime (beat timer, auto-explode, focus suspension) + `<TourCaption>` + wrapper data attributes | unit + scene tests green | AC2, AC3 |
| T9 | Playground: fixture C switch, layer focus buttons, tour controls + selector, URL params (`highlight focus flow tour step loop`) | `pnpm dev` → A/B/C render; screenshot (light, desktop + mobile) | AC3, AC6 |
| T10 | Scanner upkeep: non-vacuity lists, package-consumer identifiers; fixture-exclusion still green | each scanner green + negative controls fire | AC1, AC6 |
| T11 | `engine:probe` S5 groups (hit map, hover, touch trace, CLS, focus, tour, caption, reduced motion) + `fps:engine --scenario tour` (literal60 removed) | tools unit tests for parsing/evaluation; `--help` exits 0 | AC1–AC5 |
| T12 | Behaviour evidence: probe run (normal + reduced motion) + touch trace + real-input screenshots | `engine-probe.json` all checks pass, exit 0; files committed | AC1, AC2, AC3, AC4 |
| T13 | Screenshot matrix: 12 PNGs (light/dark × hover/focus/tour × mobile/desktop) + fixture C selector shot | files committed per naming rule; evidence exit 0 | AC6 |
| T14 | FPS evidence: `pnpm fps:engine --scenario tour` on fixture A | `fps.json`: `droppedFrames = 0`, fps in band, `tourStepsAdvanced ≥ 3`, `drawCalls = 2` | AC5 |
| T15 | Push + PR, full CI, AC1–AC6 self-check table; post-merge prod-404 row | all listed checks green on the PR; `evidence/AC-selfcheck.md` | AC6 (all) |

**Order:** T1 → (T2 ∥ T3) → T5 → T4 → T6 → T7 → T8 → T9 → T10 → T11 → (T12 ∥ T13 ∥ T14) → T15. T5 comes before T4 so the tour tests can include fixture C.

**Phase groups (Stage 3 STOP points):** **G1 pure core** T1–T5 (guard, pick, pointer, focus, tour, fixture C) → STOP · **G2 renderer + overlay + playground** T6–T10 → STOP · **G3 evidence** T11–T14 → STOP · **G4 ship** T15 → STOP + AC self-check table.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `instanceColor` added after first compile is ignored by the shader | highlight/dim invisible | allocate both colour buffers before first render; scene test asserts `mesh.instanceColor !== null` at mount |
| Dimmed upper layer occludes the focused layer (opaque mix, D3) | focus less legible in exploded view | same occlusion as S4 today; the focused layer is at full contrast; screenshots judged at T13; alpha path documented as rejected (open question 3) |
| Highlight weak in dark theme (`accent` ≈ `line` luminance, F5) | hover hard to see in dark mode | hue ΔE 21.5 + 4 px lift + pulse; dark screenshots at T13; `ink` alternative ready (open question 2) |
| `tourBeat` 1.6 s per step may be short for reading a caption | visitors miss captions | pause + step controls; `ended` holds the last caption; any token change is an S2/S9 revision, not S5 scope (F4) |
| Idle beats read as low fps | AC5 false fail | continuous pulse while playing (D2/D12); `tourStepsAdvanced` proves the tour was live |
| Touch emulation differs from real Android | tap works headless but not on device | `click`-based tap relies on the browser's own tap detection; Murphy's post-merge Orca check (brief) + optional phone check (§7) |
| `Esc` listener on `window` steals Esc from future dialogs | page-level conflict in S7/S10 | registered only while focus/tour active; skips `defaultPrevented` events; documented for S7 |
| Caption overlay covers the top layer on a phone (round 1, R6) | the slab being explained is hidden under its own caption | the box is compact (`max-inline-size`, no fixed height) and sits in the top-left margin that `fitZoom`'s 8% framing leaves; the T13 **mobile** screenshots (tour state, both themes) are checked for overlap. If it overlaps, the fallback is a bottom-anchored box, still zero-CLS because it is a single text swap inside a box whose start point is fixed. Moving the caption outside the canvas is **not** an option: the brief requires an overlay |
| Frozen-file drift goes unnoticed (the S4 b884e95 lesson) | AC3 diff claim false | hash-manifest test in CI + diff log at T5 and G4; check `git log` for foreign commits on the brief before each gate |
| Slice size (15 tasks) | revisions → split | G1/G2/G3 align with hover · focus · tour seams, so a split costs no re-planning |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (no AC is blocked; none requires a brief revision):**

- **F1 — Flows carry no per-step captions.** The brief's context says flows are "ordered steps referencing component ids with captions", but the frozen schema has `path: id[]` plus a flow-level `label`/`description` only. **Default:** derive each step's caption from the component's `name` + `summary` and the flow's `label`/`description` (D7). No schema change, which S5 forbids anyway.
- **F2 — `fps:engine` still computes `literal60: fps >= 60`.** **Default:** remove it (D12, open question 13).
- **F3 — AC3 says "fixture A's flow" (singular); fixture A has two flows** (`live-update`, `offline-read`). **Default:** the step-order test asserts **both** (a superset of the AC); `live-update` (flows[0]) is the AC5 and screenshot flow. Fixture A therefore also shows the selector.
- **F4 — Reading pace:** see Risks. No action in S5.
- **F5 — Dark-theme highlight contrast:** measured, see D2 and open question 2.

**Open questions:**

1. **Module placement:** pure logic in new `src/interaction/`, tokens in new `src/motion/emphasis.ts`, React files extended additively, frozen set byte-identical, **no new subpath export**? → **Default: yes** (D1).
2. **Emphasis token values:** highlight role `accent`, dim level **0.3** toward `paper`, tour-pulse floor **0.6**? → **Default: yes**, tuned once against T13 screenshots; `ink` is the fallback highlight if dark-theme hover reads weak.
3. **Dim mechanics:** opaque colour mix toward `paper` (no alpha, no extra draw call), accepting S4-style occlusion? → **Default: yes** (D3).
4. **Fade tokens:** hover rise `hoverLift`, fall `hoverSettle`, `easings.hover`; layer dim also on `hoverSettle` + `easings.hover` (no focus token exists)? → **Default: yes** (D2).
5. **Picking:** pure ray ⇄ AABB with layer slabs as occluders, rest-position hit boxes, DOM pointer events, no R3F event handlers? → **Default: yes** (D4).
6. **Touch:** tap = `click` after a non-mouse `pointerdown`; tap same/empty/outside clears? → **Default: yes** (D4).
7. **Esc:** window listener only while focus/tour is active; layered (tour → stop, else focus → release)? → **Default: yes** (D5).
8. **Tour behaviour:** auto-explode on play; `ended` holds the last step; flow switch = stop + select, selector disabled while playing; focus suspended while the tour is not idle, restored on stop? → **Default: yes** (D6).
9. **Reduced-motion cadence:** the tour clock uses the base `motion.durations.tourBeat` because the static twin's `tourBeat: 0` is a tween value, not a pace? → **Default: yes** (D10).
10. **Captions** derived from component `name` + `summary` and flow `label`/`description` (F1)? → **Default: yes** (D7).
11. **Controls headless:** the lib exposes state + actions + the caption overlay; the app renders layer, tour and selector buttons; slab clicks never focus a layer? → **Default: yes** (D5, D8).
12. **Fixture C:** "Lockerbay", 5 layers, 3 × 2 footprint, happy + error flows; the `projectCJson` re-export counts as example data, not package API? → **Default: yes** (D9).
13. **F2:** remove the `literal60` verdict from `fps:engine` for every scenario? → **Default: yes** (D12).
14. **Engine FPS stays a local headless proof** on the Mac GPU, not a CI job (as S4)? → **Default: yes** (D12).
15. **Screenshot matrix** via URL-driven states for the evidence CLI + real-input screenshots from the probe? → **Default: yes** (D12).
16. **Executor ladder** as S02–S04 (Flash → tier 2 skipped → pause + usage report after 2 failures)? → **Default: yes** (D13).

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. The tour behaviour in D6 matches the product you picture: auto-explode on play, `ended` holds the last caption, focus suspended during the tour (default: accept).
2. The emphasis look in D2/D3: `accent` tint + 4 px lift for hover, 30% dim toward paper for focus, a gentle pulse on the tour target (default: accept; final judgement on the T13 screenshots).
3. F1: captions derived from component name + summary are acceptable for v1 (default: accept).
4. The four phase groups in §4 give you the validation points you want (default: accept).
5. Optional, after G2: tap a slab on your own Android phone through `pnpm dev` on the LAN, since headless touch emulation is the AC proof but not a real device (default: skip; the brief's post-merge Orca check covers it).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to open questions 1–16, or "defaults" (default: all defaults).
2. Confirmation that removing `literal60` from `fps:engine` (F2) is in scope as S5 tooling upkeep (default: yes).
3. Push permission: push `task/s05-engine-core-b` and open a draft PR at T9 (end of G2), as in S04 (default: granted at G2; nothing is pushed in Stage 1).
4. Who merges, and when, for the post-merge prod-404 row (default: you merge after your final validation; the `fixture exclusion` job's main-push log is the evidence).
5. Usage pacing (default: as S04: start each Stage 3 group in a fresh 5h window and stop at ≥ 85%; please state "5h: N%" in gate messages, because the local usage capture is stale, last captured 2026-10-29 03:50Z).

---

## 9. Decisions recorded (Murphy, 2026-10-30, round 1)

1. **Open questions 1–16: defaults accepted**, on the condition that the orchestrator first reviewed its own RFC for improvements. Six refinements came out of that review. None changes an AC, a token value, or a default answer:
   1. **R1 — closed-loop pick verification** (D4, D11, D12): a Node scene test round-trips each component through the real camera, and the probe asserts the pixel under the pointer turns toward `accent`. This catches a "wrong slab lights up" bug that the pure tests and the black-box hit map would both miss.
   2. **R2 — one project object** (D8): `useTeardownViewer({ project })` instead of a separate `flows` list; a project switch resets highlight/focus/tour; unknown ids are ignored. This fixes D5's reference to a `viewer.layers` field that D8 never defined.
   3. **R3 — `data-xploder-pulse` split from `data-xploder-tweening`** (D8, D10), so the AC4 "no tweens" check can't be confused with the continuous tour pulse.
   4. **R4 — the flow selector stays enabled** while playing (D6); switching already stops the tour.
   5. **R5 — frozen-surface manifest scoped to S5** (D1), with a documented regeneration rule for later slices.
   6. **R6 — caption-overlap risk on mobile** recorded with a check (T13 mobile tour shots) and a zero-CLS fallback (§5).
2. **F2 (remove `literal60` from `fps:engine`): in scope.**
3. **Push + draft PR: granted at G2** (end of T10). Nothing is pushed before then.
4. **Merge:** the orchestrator merges the PR **only after Murphy says so**. The post-merge `fixture exclusion` main-push log is the AC6 prod-404 evidence.
5. Usage at this gate: **5h 18%** (Murphy).

6. **Stage 2 corrections (orchestrator, 2026-10-30), found while writing plan.md against the code:**
   1. **D3 material colour.** D3 said the material colour becomes white and `instanceColor` carries the absolute token colour. That would break S4's frozen `scene.test.tsx` test, which asserts `material.color` equals `lineMuted`/`line`. **Correction:** the material keeps the S4 role colour, and `instanceColor` is a per-channel multiplier (`target ⊘ base` in linear space; white = unchanged). Same pixels, same 2 draw calls, S4 test untouched. Base role channels are asserted nonzero (plan.md "Emphasis rendering").
   2. **D12 FPS trigger.** `pnpm fps` has no trigger option, so "the trigger presses Play" can't run through it. **Correction:** the tour scenario autoplays via `?tour=play` and measures in-process with `measureFps`, whose `trigger` installs the step counter. The window is still entirely inside an active tour.
7. **F6 — hidden components in the exploded view (orchestrator, 2026-10-30, found in T002):** with the frozen S4 layout (`explodedGap 1.1`, shared square footprint, isometric elevation), the slab above a layer covers part of that layer on screen. Measured with the pure picker (dense orthographic ray grid, exploded, visible area in world units²): fixture A at the default 45° view has **`tide-repository` = 0** (fully hidden), `tide-view-model` 0.18, `tide-feed` 0.18, versus ≈ 0.48 for top-layer components; at 315° `live-tide-client` = 0. Fixture B has no hidden component (min 0.37). `tide-repository` is step 4 of both of A's flows. No AC is blocked (AC1 needs a slab to highlight, not every slab; AC3's order is state-exact), but a tour step can light a slab the visitor can't see. T002's test spec was amended accordingly (tasks.md). **Decision needed from Murphy before G2** (options in the G1 report).
8. **F6 decided (Murphy, 2026-10-30, G1 gate): option A.** The playground passes `layoutOptions={{ explodedGap: 2 }}` to `<TeardownViewer>`. This is a consumer option of the existing S4 API: S4 `LAYOUT_DEFAULTS`, code and tests are unchanged. Result: no component of A, B or C is hidden when exploded at any azimuth (smallest visible area 0.42 for A, 0.31 for C), at a fit-zoom cost of ×0.72. Whether 2.0 becomes the product default is flagged for S6 (layout tuning with blueprint materials). G1 evidence and fixture C accepted. Usage at this gate: 5h 0% (fresh window).
9. **G2 gate (Murphy, 2026-10-30).** Walkthrough "mostly good"; all G2 defaults accepted: (a) R6 → the caption anchors at the end of the viewer away from the current step's layer (top while the target sits in the lower half of the stack, bottom otherwise; the box is re-keyed per anchor, so a switch is a remount, not a layout shift) → task T010b; (b) Merlin erratum `7f5719d` on `main` (ladder "Flash ×2 → orchestrator", OpenRouter dormant) accepted as legitimate; the orchestrator **keeps pausing** after two Flash failures (standing policy) unless Murphy says otherwise; the slice branch stays on guard base `53b2b2b` and picks the erratum up when main is merged at G4.
10. **Scope addition, vertical scroll when zoomed (Murphy feedback at G2; S05 revision 1 of 2, reason `scope-add`, to be logged in the vault by Murphy).** Feedback: "when I zoom in, it focuses on the middle, so the user cannot scroll to close up on the upper or lower layers." The brief freezes S4 camera behaviour, so this is built as a **new module only**; `CameraRig.tsx` and `engine/camera.ts` stay byte-identical (hash guard).
    - **Mechanism:** the stage becomes a native vertical scroll container (`overflow-y: auto`) holding a sticky, viewport-sized canvas and a spacer whose height is the scrollable extent. The scroll position maps to `camera.setViewOffset(W, H, 0, offsetY, W, H)`, a screen-space shift of the projection window. Camera position, `lookAt`, zoom, azimuth and the 90° snaps are untouched, and `Raycaster.setFromCamera` already honours the view offset, so picking stays correct.
    - **Extent:** from the projected exploded bounds at the current zoom, azimuth and viewport: `max(0, contentHeightPx + 2 × fitMargin × H − H)`. At zoom 1× the extent is 0, so there is no scroll and the framing is exactly S4's. Zoom-in keeps the current behaviour of starting centred, and zoom/rotate/resize keep the same content point at the viewport centre.
    - **Input:** native scrolling only (touch swipe, wheel, trackpad, scrollbar), so there are no custom wheel/drag handlers (S4 D6). The page scroll takes over at either end (scroll chaining). Keyboard scrolling of the stage is left to S8. Horizontal scroll is out of scope (not requested).
    - **Invariants:** still 2 draw calls; zero CLS (the spacer lives inside a fixed-height container); no motion (user-driven scroll, so nothing to reduce); the tour never scrolls ("camera stays put").
    - → task T010a, evidence in G3 (probe: zoom 3×, scroll to top → a top-layer slab is hoverable; scroll to bottom → a bottom-layer slab is hoverable).
11. **G2 re-validation (Murphy, 2026-10-30):** vertical scroll and the caption anchor tested in Orca's browser, "all good". G3 on hold until Murphy's go (5h 53% at this gate). The revision-log entry for §9.10 is Murphy's to add in the vault.
