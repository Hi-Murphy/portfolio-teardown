# Feature Specification: S05 Engine Core B — Hover · Layer Focus · Guided Tour

**Feature dir:** `.specify/features/engine-core-b/` · **Slice:** S05-engine-core-b · **Created:** 2026-10-30 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-05-engine-core-b.md` (frozen brief **v2**, 2026-10-30: AC7 added by revision 1, reason `spec-gap`, commit `d552ef4`) · **Design:** `rfc.md` (approved 2026-10-30; §6 defaults + round-1 refinements R1–R6; decisions in §9)

> Rule: functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Emphasis rendering, picking, the tour machine, the caption overlay, fixture C, the frozen-surface guard and the evidence tooling are supporting work under the FRs they serve. They get task-level checks, not criteria of their own. Documented values (dim level, highlight role, pulse floor, draw-call baseline) come from the RFC and are referenced, not promoted to criteria.
>
> **Perf doctrine (binding):** FR-005 is judged in dropped-frames style only. No task check anywhere in this feature may contain a literal fps threshold (kickoff Hard Rule 2). The `literal60` verdict is removed from `fps:engine` (RFC F2, §9.2).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Visitor points at a part (Priority: P1)

On desktop, when I hover a component slab it lifts slightly and takes the accent tint, and the cursor shows that it is interactive. On a phone, tapping a slab does the same, and tapping it again (or tapping empty space) clears it. This works with the stack assembled or exploded, and nothing else on the page moves.

**Why this priority:** pointing at a part is the most basic way to read the architecture, and on the design-target device the only way is a tap.

**Independent Test:** `pnpm engine:probe` sweeps the canvas with the mouse (hit map), hovers and taps components in both states, records the touch-emulation pointer trace, checks that the pixel under the pointer turns toward `accent`, and sums layout shifts (must be 0). The pick and scene tests are green.

**Acceptance Scenarios:**

1. **Given** `/dev/engine` with fixture A exploded, **When** the mouse moves over a component slab, **Then** `data-xploder-highlight` equals that component's id, the slab tints toward the `accent` token and lifts by `distances.hoverLift` on `durations.hoverLift`/`easings.hover`, the canvas cursor is `pointer`, and the pixel under the pointer changes toward `accent`. _(AC1)_
2. **Given** the same, **When** the pointer leaves the slab or the canvas, **Then** the highlight clears on `durations.hoverSettle`. _(AC1)_
3. **Given** the imploded stack, **When** the mouse moves over a top-layer component, **Then** it highlights. Components hidden inside the stack are never highlighted through the slab above them. _(AC1)_
4. **Given** a touch-emulated mobile context, **When** a component is tapped, **Then** it highlights; tapping it again clears it; tapping another switches; tapping empty canvas or outside the viewer clears. This holds in both states. _(AC1)_
5. **Given** the whole probe interaction script, **When** `layout-shift` entries are summed, **Then** the total is 0. _(AC1)_
6. **Given** the motion- and color-literal scanners, **When** they run, **Then** both are green and their scanned file sets include the new interaction, emphasis and overlay files. _(AC1)_

---

### User Story 2 — Visitor isolates a layer (Priority: P1)

I can focus one layer with its toggle: every other layer fades back to a dim level, so the focused layer stands out. The same toggle or `Esc` brings everything back. Exploding, imploding or rotating the view doesn't lose the focus.

**Why this priority:** layer focus is how a reader studies one tier of the architecture without the rest competing for attention.

**Independent Test:** the focus reducer and scene tests are green. The probe toggles focus, releases it with `Esc` and with the toggle, then focuses → explodes → rotates and checks that `data-xploder-focus` and the dimmed colours persist, with screenshots after each step.

**Acceptance Scenarios:**

1. **Given** fixture A and no focus, **When** a layer toggle is pressed, **Then** `data-xploder-focus` equals that layer id and every other layer's slab and component colours fade to `mix(role, paper, 1 − emphasis.dim.level)` on `durations.hoverSettle`/`easings.hover`. _(AC2)_
2. **Given** a focused layer, **When** `Esc` is pressed (with no tour active) **or** the same toggle is pressed again, **Then** focus is released and all layers return to full colour. _(AC2)_
3. **Given** a focused layer, **When** another layer's toggle is pressed, **Then** focus moves to that layer (only one layer is focused at a time). _(AC2)_
4. **Given** a focused layer, **When** the stack explodes or implodes, or the camera snaps 90° (button or arrow key), **Then** the same layer stays focused and the others stay dimmed. _(AC2)_
5. **Given** a dimmed component, **When** it is hovered, **Then** it is shown at full emphasis (hover reveals it). _(AC1, AC2)_

---

### User Story 3 — Visitor watches a request travel (Priority: P1)

I press Play and the architecture walks through a flow slab by slab: each step lights up its component, and a caption explains the step in real, selectable text styled like the rest of the blueprint. I can pause, step forward and stop. When a project has several flows, I pick which one to watch. The camera stays where I left it.

**Why this priority:** the guided tour is the slice's mission: the first time the product explains something.

**Independent Test:** the tour-machine test asserts step order equal to `flow.path` for every flow of A, B and C. The probe records the step timelines for A's and C's flows, exercises pause/step/stop, checks the selector (A and C shown, B hidden), round-trips a text selection on the caption, and compares the caption's computed colours with the theme tokens in both themes. The frozen-surface test and the diff log are green.

**Acceptance Scenarios:**

1. **Given** fixture A with flow `live-update` selected, **When** Play is pressed, **Then** the highlighted component sequence equals `flow.path` exactly, one step per `durations.tourBeat`, and the azimuth and zoom never change. _(AC3)_
2. **Given** a playing tour, **When** Pause is pressed, **Then** the step holds for longer than one beat; **When** Play is pressed again, **Then** it resumes mid-beat. _(AC3)_
3. **Given** a paused or idle tour, **When** Step is pressed, **Then** exactly one step advances (past the last step → `ended`, holding the last step). _(AC3)_
4. **Given** any tour state, **When** Stop is pressed, **Then** the tour returns to `idle`, the highlight and caption clear, and any stored layer focus is restored. _(AC3, AC2)_
5. **Given** a tour step, **When** its caption appears (`staggers.tourStep` after the step starts, fading in on `durations.tourPulse`), **Then** it is DOM text outside the canvas, selectable (a Selection API round-trip returns the caption text), and its computed `color`/`background-color` equal the `ink`/`surface` tokens of the active theme. _(AC3)_
6. **Given** fixture C (two flows), **When** it renders, **Then** the multi-flow selector shows both flows, and each flow plays its own path to the end. Fixture B (one flow) shows no selector. _(AC3)_
7. **Given** fixture C, **When** it is parsed with `parseProject(projectCJson, { registry })`, **Then** it validates, and the frozen-surface guard plus the `git diff --stat 53b2b2b` log show zero changes to the schema/parse/tokens surface. _(AC3)_
8. **Given** an imploded stack, **When** Play is pressed, **Then** the stack explodes (S4 tween) and the tour starts. _(AC3)_
9. **Given** a focused layer, **When** the tour plays, **Then** the focus is suspended (no dimming) and the focus toggles show the stored layer as pressed but disabled; after Stop the focus fades back in. _(AC3, AC2)_

---

### User Story 4 — Reduced-motion visitor (Priority: P2)

With reduced motion requested, hover, focus and the tour show the same states without any tweens. The tour still advances one step per beat.

**Why this priority:** accessibility floor carried from S2/S4 (static-twin policy).

**Independent Test:** the probe in a `reducedMotion: 'reduce'` context hovers, focuses and plays the tour. `data-xploder-tweening` and `data-xploder-pulse` are never `"true"` (MutationObserver log), exactly one frame renders per state change, and tour steps still advance at `tourBeat`.

**Acceptance Scenarios:**

1. **Given** `prefers-reduced-motion: reduce`, **When** a component is hovered or tapped, **Then** the tint appears in one rendered frame with no lift and no tween. _(AC4)_
2. **Given** the same, **When** a layer is focused or released, **Then** the dim applies or clears in one rendered frame. _(AC4)_
3. **Given** the same, **When** the tour plays, **Then** each step's tint and caption appear instantly with no pulse, one frame renders per step change and none between steps, and steps still advance every `motion.durations.tourBeat`. _(AC4)_

---

### User Story 5 — Reviewer trusts it (Priority: P2)

As Murphy, I see machine-made evidence for every visual, motion and touch claim (screenshots in both themes, the touch trace, the dropped-frames run during a live tour, the frozen-surface diff), and full CI green on the PR.

**Why this priority:** evidence over assertion (`.specify/EVIDENCE.md`).

**Independent Test:** `evidence/` holds the 12-shot matrix (light/dark × hover/focus/tour × mobile/desktop) plus a fixture C selector shot, `engine-probe.json` (normal + reduced motion), the touch trace, `fps.json` from the tour scenario, and the diff log. The PR's checks are all green.

**Acceptance Scenarios:**

1. **Given** the fixture export served locally, **When** `pnpm fps:engine --scenario tour` runs headless on fixture A with the `live-update` tour playing, **Then** `fps.json` reports 0 dropped frames over a ≥5s window with trace fps inside 60 ±10% (liveness), fps/rafFps/intervals as information, `tourStepsAdvanced ≥ 3` during the window, and `drawCalls = 2` (S4 baseline). _(AC5)_
2. **Given** the PR, **When** CI completes, **Then** build/typecheck/lint/test, gitleaks, the lighthouse gate, the weight gate, fps calibration and fixture exclusion are all green, the package-consumer scan is green, and the screenshot matrix is attached. _(AC6)_
3. **Given** the merge to `main`, **When** the `perf: fixture exclusion` job runs on the production URL, **Then** `/dev/engine` still 404s. _(AC6)_

### Edge Cases

- **Explode/implode or camera turn while the mouse is still** → the pointer is re-picked every frame of the tween, so the highlight follows whatever slab is now under it.
- **Pointer at a slab's lower edge** → hit boxes use rest positions (no lift), so the lift never makes the slab unhover itself (no flicker loop).
- **Vertical swipe on a phone** → the browser scrolls (`touch-action: pan-y pinch-zoom` unchanged) and fires `pointercancel`, no `click`, so the highlight doesn't change.
- **Mouse click on desktop** → no change (hover already governs desktop highlight).
- **Project switch (A → C) with highlight, focus or tour active** → all three reset to their initial state (RFC R2).
- **Action naming an unknown component, layer or flow id** → ignored.
- **Flow switch while playing** → the current tour stops and the new flow is selected in `idle` (no autoplay); the selector stays enabled.
- **`Esc` with a tour active and a stored focus** → the first `Esc` stops the tour (focus restores), the second releases the focus.
- **`Esc` while nothing is active** → not intercepted (the window listener exists only while focus or a tour is active).
- **Theme toggle during a tour** → canvas colours and caption colours both follow the new palette on the next frame.
- **Reduced-motion preference changes mid-tween** → in-flight channel tweens complete on the next frame; the tour keeps its cadence.
- **Zoom change while a slab is hovered** → the lift is recomputed so it stays `hoverLift` CSS px on screen.
- **Tour on fixture B (one flow)** → the tour works, and no selector is shown.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** hover (desktop) and tap (touch emulation) highlight a component slab in both exploded and imploded states; highlight visuals trace to tokens only (exclusivity greps green: motion + hex); zero CLS contribution.
- **FR-002 (↔ AC2):** layer focus dims non-focused layers to the token level; `Esc` and toggle both release; state survives explode/implode and 90° camera snaps; unit tests green.
- **FR-003 (↔ AC3):** tour plays fixture A's flow step-order-exactly (asserted by test); play/pause/stop/step all work; captions are selectable HTML overlay text styled from theme tokens; fixture C shows the multi-flow selector and both flows play; fixture C validates via the frozen schema with zero package-API changes (diff-verified).
- **FR-004 (↔ AC4):** with `prefers-reduced-motion` emulated: hover/focus/tour produce instant state changes, no tweens (verified via emulation + evidence artifact).
- **FR-005 (↔ AC5):** perf gate, dropped-frames style: **0 dropped frames over a ≥5s headless window while the tour is actively playing** on fixture A (`/dev/engine`), fps within the 60 ±10% liveness band, raw fps/intervals reported as information; draw-call count documented and not regressed vs S4 baseline; evidence artifact attached per EVIDENCE.md.
- **FR-006 (↔ AC6):** all engine logic in `packages/xploder` (apps/web thin-consumer test still green); full CI green on the PR (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); `/dev/engine` still 404s on production; screenshots attached (light+dark × hover/focus/tour).

- **FR-007 (↔ AC7, brief v2):** at zoom >1×, vertical scroll inside the viewer shifts the camera view window (`setViewOffset`) so the topmost and bottommost layers of the fixture stack are reachable — evidenced by top + bottom screenshots at max zoom; at 1× zoom viewer behavior is identical to v1 (no scroll capture); S4 camera-rig files untouched (frozen-surface diff check green); draw calls remain 2; zero CLS contribution; scroll module unit + component tests green in CI.

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief)                                                                                                   | Serves                  | Design                     |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------- |
| 1. Hover/tap highlight: raycast, token-fed tint + lift, cursor, tap on touch, clears on leave/second tap, zero CLS    | FR-001                  | RFC D2, D3, D4             |
| 2. Layer focus: token dim level, toggle + `Esc`, survives explode/implode + snaps, one at a time                      | FR-002                  | RFC D2, D3, D5             |
| 3. Tour player: step highlight, caption beat on tour tokens, camera still, controls, HTML caption, selector, focus yields | FR-003               | RFC D6, D7, D8             |
| 4. Fixture C: two flows, frozen schema, additive file only                                                            | FR-003                  | RFC D1 (guard), D9         |
| 5. Reduced-motion twins (caption stepping preserved)                                                                  | FR-004                  | RFC D10                    |
| 6. Tests + evidence: pure state-machine tests, dropped-frames gate during a tour, screenshot matrix                   | FR-001…FR-006           | RFC D11, D12               |

Non-goals stay hard: no detail/case-study panels or tech chips (S7) · no blueprint materials, edge lines or dimension annotations (S6) · no full keyboard-navigation drill or screen-reader pass (S8; controls only stay keyboard-reachable) · no site shell changes (S10) · no real content (S9) · no cross-project links (S14) · no camera auto-fly · no pixel shader · **no changes to the S2 public API or to S4 layout/camera behaviour** (new modules; additive edits to React wiring only, with S4 tests untouched and green) · no DNS/Vercel-project changes · no analytics · no secrets.

### Key Entities

- **Emphasis tokens** (internal, `src/motion/emphasis.ts`): `highlight.role = 'accent'`, `dim.level = 0.3` toward `paper`, `tourPulse.floor = 0.6`.
- **Pick** (internal, pure): ray `{ origin, direction }` × `ProjectLayout` × explode progress → nearest hit; a layer-slab hit returns `null`.
- **Pointer state** (internal, pure): `{ highlight: string | null, touchActive: boolean }`; events `move`, `leave`, `tap`, `outsideTap`, `set`.
- **Focus state** (internal, pure): `{ layerId: string | null }`; actions `toggle`, `release`.
- **Tour state** (internal, pure): `{ flowId, status: 'idle' | 'playing' | 'paused' | 'ended', step, anchor }`; actions `play`, `pause`, `stop`, `step`, `selectFlow`; derived `positionAt(state, now)`.
- **Emphasis channels** (internal, pure): per-instance `h` (hover), `t` (tour), per-layer `d` (dim), each a token-timed tween from its current value.
- **Viewer handle additions** (`xploder/react`): `highlight`, `focus { layerId, suspended }`, `tour { flows, flowId, status, step, total, showFlowSelector }`, actions `highlight`, `toggleFocus`, `releaseFocus`, `selectFlow`, `play`, `pause`, `stop`, `step`.
- **Viewer DOM contract additions:** `data-xploder-highlight`, `data-xploder-focus`, `data-xploder-tour` (status), `data-xploder-tour-flow`, `data-xploder-tour-step`, `data-xploder-tweening`, `data-xploder-pulse`; caption element `[data-xploder-caption]`.
- **Fixture C** (`test/fixtures/project-c-lockerbay.json`, re-exported as `projectCJson`): 5 layers, one layer of 5 components (3 × 2 footprint), flows `pickup-ready` and `push-failed`.
- **Playground query additions:** `fixture=c`, `highlight=<componentId>`, `focus=<layerId>`, `flow=<flowId>`, `tour=play|paused`, `step=<n>`, `loop=1`.
- **Evidence artifacts:** `engine-probe.json` (S4 checks + S5 groups), touch-trace JSON, `fps.json` (tour scenario), frozen-surface diff log.

## Success Criteria _(mandatory)_

Success = AC1–AC6 each pass with evidence recorded in `evidence/` and the per-task reports. No additional success criteria are defined.

| FR     | AC  | Evidence type                                                                                                                                                                                                                                                                   |
| ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 | AC1 | pick + pick-scene (closed loop) + pointer + emphasis-scene test logs · scanner logs with non-vacuity · `engine-probe.json` hit map, hover, pixel-under-pointer and tap checks (both states) · touch-emulation pointer trace · CLS sum = 0 with entries · real-input screenshots |
| FR-002 | AC2 | focus test log (incl. property test) + emphasis-scene dim assertions · `engine-probe.json` focus group (toggle, `Esc`, survive explode + rotate) + screenshots per step                                                                                                       |
| FR-003 | AC3 | tour test log (step order for A×2, B, C×2) · fixture-c test log · frozen-surface test log + `git diff --stat 53b2b2b` log · `engine-probe.json` tour, selector and caption groups (selection round-trip, token colours light + dark)                                       |
| FR-004 | AC4 | channel/tour tests with the static twin · `engine-probe.json` reduced-motion group (MutationObserver log: `tweening`/`pulse` never `"true"`, frames per change = 1, cadence kept) + screenshots                                                                             |
| FR-005 | AC5 | `pnpm fps:engine --scenario tour` log + `fps.json` (droppedFrames, band, fps/rafFps/intervals, `tourStepsAdvanced`, `drawCalls`) + screenshot + meta                                                                                                                         |
| FR-006 | AC6 | package-consumer scan log · `gh pr checks` output (all listed checks green) · 12-shot screenshot matrix + fixture C selector shot · **post-merge** prod-404 log from `perf: fixture exclusion`                                                                                |
| FR-007 | AC7 | `scroll.test.ts` + `view-scroll.test.tsx` logs (CI) · T010a top/bottom screenshots at max zoom (3×) · probe `scroll` group (`scroll-zoom1-no-overflow`, `scroll-zoomed-overflows`, `scroll-top-reaches-top-layer`, `scroll-bottom-reaches-bottom-layer`, `scroll-camera-still`) · frozen-surface test + diff log · draw calls 2 · interaction-phase `cls-zero` covering the scroll group |

## Assumptions

- All RFC §6 defaults are accepted, plus round-1 refinements R1–R6 (RFC §9.1). No new dependencies.
- **Stage 2 correction to RFC D3 (recorded in plan.md and RFC §9.6):** the material colour stays the S4 role colour, and `instanceColor` acts as a per-channel multiplier (white = unchanged). Setting the material to white, as D3 first said, would break S4's frozen `scene.test.tsx` material-colour assertion.
- F2 (remove `literal60` from `fps:engine`) is in scope (RFC §9.2).
- Push and draft PR are granted at the end of G2 (RFC §9.3). Nothing is pushed before then.
- The orchestrator merges only after Murphy says so (RFC §9.4). The AC6 prod-404 row is completed from the main-push run after that merge.
- Escalation: tier 2 (OpenRouter) is skipped; if tier 1 fails twice, the orchestrator pauses and reports with 5h/7d usage. Each phase group starts in a fresh 5h window; no new task at ≥ 85% of the 5h window.
