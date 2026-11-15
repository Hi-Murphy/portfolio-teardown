# Feature Specification: S15 Engine Timing & Events (E1, E2, E4, E5, E8)

**Feature dir:** `.specify/features/engine-timing/` · **Slice:** S15-engine-timing · **Created:** 2026-11-15 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-15-engine-timing.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-15: all §12 defaults; refinements R1–R10 in §13)

> **Rule:** the functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** acceptance criteria. The five brief items appear as supporting requirements (SR) under the FR they serve. They get task-level checks, not criteria of their own. File names, selectors, viewports and tolerances come from the RFC and are referenced, not promoted to criteria.
>
> **Evidence doctrine (kickoff Hard Rule 10):** every claim attaches machine-made evidence per `.specify/EVIDENCE.md`: red-then-green test output, the scan log, pixel diffs and event counts per pause cell, settle event logs with frame captures, the event-order log, the timing table at three CPU profiles, and the gate matrix with the seal tags.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — One clock (Priority: P1) — E1

As a maintainer, I can drive every animation in the engine from one clock that a test can replace. Explode, camera, emphasis, tour and the overlay all move on that clock, and nothing in the engine reads the wall clock on its own.

**Why this priority:** pause (US2), settle (US3) and events (US4) all depend on it; the kickoff makes it the first change.

**Independent Test:** `test/clock.test.ts` (fake-clock suite) · `test/no-time-reads.test.ts` (the AC1 scan) · `test/no-real-timers.test.ts` (with a negative control) · one fake-clock proof test per consumer (RFC §4).

**Acceptance Scenarios:**

1. **Given** `packages/xploder/src`, **When** it is scanned for `performance.now()` / `Date.now()`, **Then** the only hit is the clock module. _(AC1)_
2. **Given** the animation tests, **When** they run, **Then** every animation is driven by a fake clock and none uses a real timer or a `setTimeout`-driven wait. _(AC1)_

---

### User Story 2 — Pause means freeze (Priority: P1) — E2

On the home page I press Pause at any moment: while the model implodes, explodes, zooms or tours. Within one frame everything stops: the model, the camera, the highlights, the tour line and the labels. Nothing changes however long I wait. When I press Play it carries on from exactly that frame. With reduced motion I see the still poster as before.

**Why this priority:** it replaces S14 AC3 and is the visible change of the slice.

**Independent Test:** `scene-pause` and `viewer-pause` (red → green), the S13 and S14 I-03 original tests plus their fake-clock twins, the `pause-freeze.mjs` matrix, and the `reduced-motion` probe group (RFC §5.3).

**Acceptance Scenarios:**

1. **Given** the hero in implode, explode, zoom or tour, **When** Pause is pressed, **Then** the hero is frozen within one frame. _(AC2)_
2. **Given** a paused hero, **When** frames are captured 0.5 s and 3 s after Pause, **Then** they are pixel-identical and there are zero settle transitions. _(AC2)_
3. **Given** a paused hero, **When** Play is pressed, **Then** it continues from the same frame, with no jump and no restart. _(AC2)_
4. **Given** reduced motion, **Then** the behaviour is unchanged. _(AC2)_

---

### User Story 3 — Labels appear once, when the motion has ended (Priority: P1) — E4

On a slow phone I explode, zoom or turn a teardown. The labels never flash in the middle of the motion. They appear once, when the motion has ended.

**Why this priority:** reproduced at Stage 1 (RFC C4), and a pause would trigger it.

**Independent Test:** `test/overlay-settle-state.test.tsx` (forced duplicate frames, red → green) and `settle-once.mjs` at CPU ×4 and ×6 (RFC §6.3).

**Acceptance Scenarios:**

1. **Given** forced duplicate frames mid-tween (test), **Then** labels appear exactly once per settle, with no mid-animation flicker. _(AC3)_
2. **Given** CPU ×4 and ×6 (browser), **Then** labels appear exactly once per settle, with no mid-animation flicker; evidence is an event log plus frame captures. _(AC3)_

---

### User Story 4 — The engine says what it is doing (Priority: P2) — E5

As a developer embedding the viewer, or a probe, I get `onReady`, `onSettled(phase)` and `onTourEnded`. Each fires once per transition, in a documented order, so I don't have to guess from DOM attributes.

**Independent Test:** the emitter unit tests, `viewer-events.dom.test.tsx`, `event-log.mjs`, and the switched `site-probe` / `eager-probe` (RFC §7).

**Acceptance Scenarios:**

1. **Given** a viewer, **Then** `onReady`, `onSettled(phase)` and `onTourEnded` fire once per transition, in the documented order. _(AC4)_
2. **Given** `site-probe` and `eager-probe`, **Then** they use the events for "hero settled", and all S14 checks stay green. _(AC4)_

---

### User Story 5 — Measure before caching (Priority: P2) — E8

On a mid-range phone profile I can see how long labels take to appear after each motion, for both projects. A cache is added only if that number is too high.

**Independent Test:** `settle-timing.mjs` on both projects at CPU ×1/×4/×6, with the decision line (RFC §8).

**Acceptance Scenarios:**

1. **Given** both projects at CPU ×1/×4/×6, **Then** a placement/settle timing table exists. _(AC5)_
2. **Given** a median settle delay ≤ 50 ms (G1 threshold), **Then** no cache is added and the table is the deliverable; **otherwise** the cache is output-identical (0 differing coordinates). _(AC5)_

---

### User Story 6 — Nothing else moves (Priority: P1)

The site is as fast and accessible as before, and the hero still comes alive by itself. Sealed engine code changes only where an item needs it, each change with a written reason and a pushed tag.

**Independent Test:** the RFC §10 gate matrix, `guards.sh`, the frozen-surface tests, CI, and the holds re-run.

**Acceptance Scenarios:**

1. **Given** the PR head, **Then** full CI is green and the gates hold (Lighthouse ≥ 95/95 on the three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero intact). Every touched S2/S5/S6/S8 file is re-sealed with a written reason and a pushed `seal/*` tag, and the S3/S4/S7 diffs are empty. _(AC6)_

---

### Edge Cases

- **Commands while paused** (Q11): an explode, zoom, turn or hover sent while frozen is applied at the frozen instant and animates after `resume()`. No frame is drawn and no event fires while paused.
- **Resize, DPR or theme change while paused** (RFC §5.2 item 2): one repaint of the same frozen pose, with no settle.
- **Pause during the hero's tour:** the tour is `pauseTour()`d and the clock frozen. On resume the clock resumes first, then the tour plays, and an already-ended tour advances (the S14 behaviour, kept).
- **Hidden tab or offscreen hero:** these use the same freeze as the button (the hero's existing pause triggers). On return the hero continues from the same frame instead of snapping to the end of its tweens.
- **Reduced motion:** the hero is poster-only (no viewer). On project pages, durations of 0 make every change discrete: a settle fires in the same frame (RFC §6.1).
- **Project-page tour pause:** `pauseTour()`, exactly as before (Q2). The scene is never frozen on project pages.
- **jsdom / no `getAnimations`:** the DOM sweep is skipped (R6).
- **No WebGL:** the fallback renders no scene, `onReady` never fires, and the probes' skipped rows are unchanged.
- **`ease(p)` equal to 1 just before the tween end:** at most a sub-millisecond-early settle, never mid-pose (RFC §11 risks).

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** "**AC1 — one clock source.** A scan finds **no** `performance.now()` / `Date.now()` timing reads inside `packages/xploder/src` outside the clock module. Tests drive every animation with a fake clock and use **zero real timers**; the suite proves it (no `setTimeout`-driven waits in the animation tests)."
  - SR1.1: an injectable, pausable `EngineClock` in `src/time/` (S5), with `createFakeClock` (RFC §3, R1).
  - SR1.2: consumers moved in order: explode → camera → emphasis (S6 `Scene.tsx`), tour (S5), overlay (S6 `OverlayProjector.tsx`), then viewer plumbing and `hostNow()` (S8) (RFC §4).
  - SR1.3: the scanners `no-time-reads` and `no-real-timers` (R7), each with a negative control.
- **FR2 (= AC2):** "**AC2 — pause is a freeze.** Pressing Pause at any point (implode, explode, zoom, tour) freezes the hero **within one frame**. Frames captured 0.5 s and 3 s after Pause are **pixel-identical**, there are **zero** settle transitions while paused, and Play continues from the same frame — no jump, no restart. Reduced motion unchanged. *(Replaces S14 AC3.)*"
  - SR2.1: `actions.pause()` / `resume()` freeze and continue the scene; the tour-only pause becomes `pauseTour()`, and every caller moves in the same task (RFC §5.1, R2).
  - SR2.2: the frame gate (S6), suspended clock timers, overlay silence while paused, and the DOM sweep (S8) (RFC §5.2).
  - SR2.3: hero wiring: storyboard and label waits run on `viewer.clock`, in freeze-first / resume-first order (RFC §5.2 item 6).
  - SR2.4: re-proof (Hard Rule 6): the S13 tour-clock tests and the S14 I-03 tests pass unchanged on the new clock, plus their fake-clock twins. A regression is a STOP.
- **FR3 (= AC3):** "**AC3 — settle is state, not signatures.** With forced duplicate frames mid-tween (test) and at CPU ×4/×6 (browser), labels appear **exactly once per settle**, with no mid-animation flicker. Evidence: event log + frame captures."
  - SR3.1: `OverlayProjector` settles when the rest key is reached and the tweens are at rest at clock time. The frame signature is removed (RFC §6.1).
  - SR3.2: the S6 turn test's one-frame assertion moves, test-first (RFC §6.2, Q12).
- **FR4 (= AC4):** "**AC4 — events.** `onReady`, `onSettled(phase)`, `onTourEnded` fire **once per transition, in the documented order**; `site-probe` / `eager-probe` use them for "hero settled"; all S14 checks stay green."
  - SR4.1: the contract and order of RFC §7.1, with the phase computed in `OverlayProjector` (R10).
  - SR4.2: a pure emitter `src/react/events.ts` (S8), and a DOM `CustomEvent` mirror for probes.
  - SR4.3: the probe switch of RFC §7.2. No deadline or timeout constant changes.
- **FR5 (= AC5):** "**AC5 — phone measurement, cache only by number.** A placement/settle timing table at CPU ×1/×4/×6 for both projects. If the median settle delay is **≤ the G1 threshold (default 50 ms)**, **no cache is added** and the table is the deliverable. If it is above, the cache must be output-identical (placement compared, 0 differing coordinates)."
  - SR5.1: the RFC §8 definitions and decision rule (G1: 50 ms, decided at CPU ×4, on either project).
- **FR6 (= AC6):** "**AC6 — gates and seals.** Full CI green; Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero intact; every touched S2/S5/S6/S8 file re-sealed with a written reason and a pushed `seal/*` tag; **S3/S4/S7 diffs empty**."
  - SR6.1: the re-seal list of RFC §9.1, as refined by R2. Each re-seal has its own tag, pushed in the same session.
  - SR6.2: holds (Hard Rule 7): every storyboard and tour boundary within ±16.7 ms of the T001 base.

### Key Entities

- **`EngineClock` / `ClockReader`:** engine seconds, frozen while paused, with timers suspended while paused (RFC §3.1, R1).
- **`FakeClock`:** a manual-host `EngineClock` with `advance(seconds)`, from `xploder/fixtures`.
- **Rest key:** `{ layout, width, height, explodeTarget, turns, zoomFactor }`: what the scene is heading for (RFC §6.1).
- **Settle transition:** the overlay entering `settled` once after a rest-key change, or at the first rest.
- **Viewer events:** `ready`, `settled(phase, at)`, `tour-ended(flowId)`, as callbacks and as DOM `CustomEvent`s.
- **Seal tags:** `seal/<surfaces>-<fix sha>`, one per re-seal.

## Success Criteria _(mandatory)_

AC1–AC6 above are the success criteria. Verdicts go in `evidence/AC-selfcheck.md`, with links to each gate's evidence (RFC §10). No other criteria exist.

## Assumptions

- **Base** for every before/after comparison: `8c410f3` (S15 freeze; product code = S14 merge `7865770`).
- **Seal bases at the start:** S2/S4 `3aee8fc`, S5 `edde9d0`, S6 `b5a4713`, S7 `5b22987`, S8 `edde9d0`. All are reachable through the `seal/*` tags.
- **Executor:** DeepSeek Flash 4.1 with the sandbox off for every task that builds, runs vitest on loopback or launches Chromium. Writes are limited to its task worktree and `/tmp/s15-checks`.
- **Binding numbers:** Lighthouse and weight come from CI on the Vercel preview of the slice PR. The phone profile is local Chromium emulation (RFC §8); it is labelled as such and is not a device measurement.
- **Murphy's role:** Murphy validates hands-on later. No step blocks on a human test (the standing S12 preference).
