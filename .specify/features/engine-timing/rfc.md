# RFC — S15 Engine Timing & Events (E1, E2, E4, E5, E8)

**slice:** S15-engine-timing · **status:** APPROVED at Gate 1 (2026-11-15): all §12 defaults; refinements R1–R10 in §13 · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-15-engine-timing.md` (frozen brief v1) · **branch:** `task/s15-engine-timing` · **base:** `8c410f3` (S15 freeze; product code = S14 merge `7865770`) · **date:** 2026-11-15 · **revision counter:** 0 of 2

> This RFC records design decisions only and does not change scope. Where it seems to conflict with the brief, the brief wins and the conflict becomes an open question (§12). Nothing is implemented.
>
> **Inputs:** a static read of the code at `8c410f3`, one unit-level repro (`rfc-repro/dup-frame.test.tsx` → `evidence/RFC-log-dup-frame-repro.txt`) and the AC1 baseline scan (`evidence/RFC-log-ac1-scan-base.txt`). No browser measurement was taken at Stage 1; every browser number below is a plan, and any number not taken from those two files is labelled **estimate**.

---

## 1. Context (from the brief)

- **Mission:** the engine owns time. Every animation reads one injectable, pausable clock. Pause freezes the scene at once and Play resumes from the same frame. "Settled" comes from the animation's own state, not from frame-signature equality. The engine announces its phases as public events. Label cost is measured on a phone profile before any cache is added.
- **Kickoff order:** clock module (with a fake-clock suite) → consumers (explode → camera → emphasis → tour → overlay) → pause/resume → settle state → events → phone measurement → gates/seals.
- **Pause contract (kickoff Hard Rule 4):** Pause = **immediate freeze, zero settles while paused**. S14 AC3's "exactly one settle transition" is retired for this slice.
- **Holds (Hard Rule 7):** S14 R1 timings stand (labelled exploded view 0.19 → 3.40 s, zoomed view 0.14 → 1.75 s, tour end 0 → 1.61 s). A boundary may move by **≤ 1 frame** (16.7 ms).
- **Gates (unchanged):** mobile Lighthouse ≥ 95/95 on `/`, `/projects` and `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero reveal with zero interaction.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — one clock source.** A scan finds **no** `performance.now()` / `Date.now()` timing reads inside `packages/xploder/src` outside the clock module. Tests drive every animation with a fake clock and use **zero real timers**; the suite proves it (no `setTimeout`-driven waits in the animation tests).
- **AC2 — pause is a freeze.** Pressing Pause at any point (implode, explode, zoom, tour) freezes the hero **within one frame**. Frames captured 0.5 s and 3 s after Pause are **pixel-identical**, there are **zero** settle transitions while paused, and Play continues from the same frame — no jump, no restart. Reduced motion unchanged. *(Replaces S14 AC3.)*
- **AC3 — settle is state, not signatures.** With forced duplicate frames mid-tween (test) and at CPU ×4/×6 (browser), labels appear **exactly once per settle**, with no mid-animation flicker. Evidence: event log + frame captures.
- **AC4 — events.** `onReady`, `onSettled(phase)`, `onTourEnded` fire **once per transition, in the documented order**; `site-probe` / `eager-probe` use them for "hero settled"; all S14 checks stay green.
- **AC5 — phone measurement, cache only by number.** A placement/settle timing table at CPU ×1/×4/×6 for both projects. If the median settle delay is **≤ the G1 threshold (default 50 ms)**, **no cache is added** and the table is the deliverable. If it is above, the cache must be output-identical (placement compared, 0 differing coordinates).
- **AC6 — gates and seals.** Full CI green; Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero intact; every touched S2/S5/S6/S8 file re-sealed with a written reason and a pushed `seal/*` tag; **S3/S4/S7 diffs empty**.

---

## 2. Baseline: where time comes from today

| # | Source | File (surface) | What reads it |
|---|---|---|---|
| T1 | `performance.now() / 1000` (`defaultNow`) | `src/react/useTeardownViewer.ts` (S5) | tour reducer actions, `positionAt` on every render, the tour clock |
| T2 | `performance.now() / 1000` (`defaultNow`) | `src/react/scene/Scene.tsx` (S6) | `Slabs` (explode timeline), `CameraRig` (turn and zoom tweens), `useEmphasisDriver` |
| T3 | `setTimeout` to the next tour boundary | `src/react/useTourClock.ts` (S5) | tour steps and the S13 last-step tick |
| T4 | `performance.now()` as an event-timestamp cutoff | `src/react/panel/PanelLayer.tsx` (S8) | ignores the click/key that opened a panel |
| T5 | WAAPI and CSS transitions on DOM time | `BlueprintOverlay`, `CircuitTrace` (S6), `PartLettering`, `PanelLayer` (S8), `TourCaption` (S5) | label/lettering/caption fades, trace draw and the **infinite** trace dot loop |
| T6 | `window.setTimeout` + `performance.now()` | `apps/web/components/hero/hero-stage.tsx`, `hero-leader.tsx` (app) | hero storyboard waits (`hero-loop.ts` takes them injected), hero label waits, the tour watchdog |
| — | Settle detection | `src/react/scene/OverlayProjector.tsx` (S6) | no clock: "settled" = the frame signature repeated once |

Scan output: `evidence/RFC-log-ac1-scan-base.txt` (T1, T2, T4 are the three AC1 hits; T3 is the one animation timer).

### Corrections to the brief's assumptions (C-items; none changes an AC)

- **C1 — the engine tweens already take time as an argument.** `engine/explode.ts` (`setTarget(target, now)`, `sample(now, out)`), `engine/camera.ts` (`createTurnTween`, `createZoomTween`) and `react/scene/CameraRig.tsx` (`now` prop) never read a clock. The real defect is that there are **two** clocks: the viewer's `now` option (T1) never reaches the `Scene`, because `TeardownViewer` renders `<Scene>` without `now`, so the scene runs on its own `performance.now()` (T2). A test that injects a viewer clock does not drive the scene.
- **C2 — the brief's "S2" engine files are S4 in the repo's split.** `engine/explode.ts`, `engine/camera.ts` and `CameraRig.tsx` sit in the combined S2/S4 manifest (`frozen-surface.manifest.json`, base `3aee8fc`). The S11.5 R6 split (`.specify/features/staged-canvas-mount/s4.paths`) lists all three, and `test/scene.test.tsx`, `test/explode.test.ts` and `test/camera.test.ts`, as **S4**. AC6 requires S4 diffs to be empty. **This design touches none of them** (C1 makes that possible), so the combined manifest stays byte-identical and AC6 holds under either reading (Q1).
- **C3 — `viewer.actions.pause()` is already taken.** Today it pauses **the tour only**. It is called by S7 `executeTourCommand` (through `TeardownViewer`), by the S8 case-study auto-pause, by `workbench-client.tsx`, by `engine-playground.tsx` and by the hero watchdog (Q2).
- **C4 — a held frame settles the overlay mid-tween (reproduced).** Holding the clock for one frame at t = 0.2 s of a 0.9 s explode (progress 0.79) makes `OverlayProjector` emit `settled`. The next frame emits `moving`: labels flash in and out (`evidence/RFC-log-dup-frame-repro.txt`). A paused clock **is** a held clock, so without E4 the new pause would settle labels on a half-exploded pose. E4 is therefore a prerequisite for AC2's zero settles, not only for AC3.
- **C5 — freezing the canvas is not enough for AC2.** The tour trace dot is an infinite WAAPI loop, and fades run on document time (T5). Freezing only the WebGL scene would leave the dot moving, and the +0.5 s and +3 s frames of a tour-phase pause would differ.
- **C6 — `hero-loop.ts` needs no change of its own.** Its waits already take injected `schedule`/`cancel`/`now`. Moving them onto the engine clock is wiring in `hero-stage.tsx` (app code, unsealed, not named in the brief). `hero-leader.tsx` has its own label waits (T6).

---

## 3. The clock module (E1 core)

### 3.1 Location and API

- **New directory `packages/xploder/src/time/`**, sealed into **S5** (`frozen-surface.s5.paths` gains `src/time`). It is the only xploder source allowed to read host time (AC1) and the only one to arm a host timer for animation time.
- Public from `xploder/react` (`src/react/index.ts` is unsealed). `package.json` `exports` is **not** changed: it is an S2 file.

```ts
// src/time/clock.ts — engine time is in seconds, like every existing `now()`.
export interface ClockHost {
  now(): number;                                   // host milliseconds, monotonic
  setTimer(callback: () => void, delayMs: number): unknown;
  clearTimer(handle: unknown): void;
}

export interface ClockReader {
  now(): number;                                   // engine seconds; frozen while paused
  readonly paused: boolean;
  /** Runs `callback` when engine time reaches `from + delay`; suspended while paused. */
  schedule(delaySeconds: number, callback: () => void, from?: number): () => void;
  subscribe(listener: (paused: boolean) => void): () => void;
}

export interface EngineClock extends ClockReader {
  pause(): void;                                   // idempotent
  resume(): void;                                  // idempotent
}

export function createEngineClock(host?: ClockHost): EngineClock;   // default: browserHost
export function clockFromNow(now: () => number, host?: ClockHost): EngineClock; // legacy `now` option
export function hostNow(): number;                 // host ms, for DOM event-timestamp comparisons only
```

```ts
// src/time/fake.ts — re-exported from `xploder/fixtures` (barred from production by prod-imports.test.ts)
export interface FakeClock extends EngineClock {
  advance(seconds: number): void;                  // moves host time and fires due timers in order
  readonly pendingTimers: number;
}
export function createFakeClock(startSeconds?: number): FakeClock;
```

### 3.2 Semantics

- **One source.** Engine time = `(host.now() − origin − pausedTotal) / 1000` while running. While paused it is the value captured at `pause()`. It is monotonic and continuous across pause: `resume()` adds the paused span to `pausedTotal`, so the first `now()` after resume equals the last `now()` before pause, to the microsecond.
- **Timers.** `schedule` arms one host timer for the remaining delay. `pause()` clears every armed host timer and records each timer's remaining engine time. `resume()` re-arms them. A timer never fires while paused. On fire the callback runs as plain `setTimeout` does today (no early/late correction), so tour timing is unchanged (§4.4).
- **No extra host reads on the tour path.** The S13 boundary test's `RaceClock` counts `now()` calls (two early reads, then late). `schedule(delay, cb, from)` takes the caller's timestamp when given, so the tour clock makes exactly the host reads it makes today and the S13 race is tested unchanged.
- **Legacy `now` option.** `useTeardownViewer({ now })` and `<Scene now>` keep working. `clockFromNow(now)` uses the given function as the host time source (seconds → ms) and the default host timers. It is pausable, so every existing test that injects `now` runs on the new clock module.
- **Default host** (`browserHost`): `performance.now()`, `setTimeout`, `clearTimeout`. These are the module's only host calls (AC1).

### 3.3 How a fake clock replaces real timers in tests

- `createFakeClock()` is the real `createEngineClock` on a manual host: host time is a number, `setTimer` pushes onto an ordered queue, and `advance(s)` steps host time timer by timer, firing each due callback at its due time. No `setTimeout`, `performance.now()` or `Date.now()` is involved, so a test is deterministic and independent of the machine.
- React tests wrap `clock.advance` in `act(...)` and render frames with `@react-three/test-renderer` `advanceFrames`. Frame time comes from the fake clock, not from the renderer's delta.
- **The fake-clock suite** (`test/clock.test.ts`, new, S5) is red first, because the module does not exist:
  1. `now()` advances with host time and freezes on `pause()`;
  2. continuity: the last value before pause equals the first after resume;
  3. pause and resume are idempotent;
  4. a timer scheduled for 0.4 s, paused at 0.1 s for 5 s, fires at engine 0.4 s (host 5.4 s), never while paused;
  5. several timers fire in due order and a cancelled timer never fires;
  6. `schedule(..., from)` makes no host read;
  7. `subscribe` reports each pause/resume once;
  8. `clockFromNow` reproduces an injected `now` exactly while running.
- **AC1 test-half proof** (`test/no-real-timers.test.ts`, new, S5): a source scanner over the **animation test list** (§10, AC1 row). It fails on:
  - a real-time read: `performance.now(`, `Date.now(`, `new Date(`;
  - a real wait: `setTimeout(`/`setInterval(` used to wait, `await new Promise(… setTimeout`, `vi.useRealTimers()` outside `afterEach`.
  - Accepted fakes are the engine fake clock and Vitest fake timers. The latter are what the untouched S13 test uses; Vitest 5 also fakes `performance`.
  - It carries a negative control (a planted string turns it red), in the S14 scanner style.

---

## 4. E1 — consumer migration order

Every step is one surface family and pairs with its own re-seal (§9.1 #1–#5). Each step's proof test is red before the change and green after, and uses the fake clock only.

| Step | Consumer | Change | Proof test (red first) |
|---|---|---|---|
| 1 | **clock module** | §3 (S5) | `test/clock.test.ts` (§3.3) |
| 2 | **explode** | `Scene` gains `clock?: ClockReader` and passes `clock.now` to `Slabs`. `defaultNow` is removed and the default is `createEngineClock()` (S6 `Scene.tsx`) | `test/scene-clock.test.tsx` "explode": a `Scene` on a fake clock reaches `exploded` exactly at `explode + max stagger` of clock time. With the clock not advanced across 10 frames, `progress` is byte-identical. Red: `clock` prop unknown, so the scene runs on host time |
| 3 | **camera** | the same `clock.now` reaches `CameraRig` (no `CameraRig` edit, C1/C2) | `scene-clock` "camera": a turn and a smooth zoom on the fake clock reach target at `implode` seconds of clock time. A held clock means a byte-identical camera matrix and zoom |
| 4 | **emphasis** | the same `clock.now` reaches `useEmphasisDriver` (no `Emphasis.tsx` edit) | `scene-clock` "emphasis": the hover lift reaches its token value at `hoverSettle`. A held clock means an identical lift |
| 5 | **tour** | `useTeardownViewer` owns one `EngineClock`: option `clock?`, otherwise `clockFromNow(opts.now)` or `createEngineClock()`. It exposes `viewer.clock: ClockReader` (additive) and passes the clock to `useTourClock`, which calls `clock.schedule(delay, tick, timestamp)` instead of `setTimeout` (S5) | `test/tour-clock-engine.test.tsx` (new): the three S13 cases (tick just before / on the final boundary, intermediate beats) **re-run on `createFakeClock()` with no Vitest timers**; tour steps land at `k × tourBeat` of clock time. The untouched originals (`tour-clock-boundary.test.tsx`, `tour-clock.test.tsx`) still pass through `clockFromNow` (§3.2). Red: `viewer.clock` is undefined |
| 6 | **overlay** | `OverlayProjector` receives the clock. Its `moving`/`settled` events carry `at` (engine seconds of the deciding frame), and **while `clock.paused` it emits nothing** (S6) | `test/overlay-clock.test.tsx` (new): `settled.at` equals the fake clock time of the frame that settled. A paused clock over 10 rendered frames emits 0 events. Red: no `at`, and the C4 repro settles |
| 7 | **viewer plumbing + AC1 scan** | `TeardownViewer` passes `viewerMetadataOf(viewer).clock` to `<Scene clock>`. `PanelLayer` replaces `performance.now()` with `hostNow()` (S8) | jsdom `apps/web/test/xploder-dom/viewer-clock.dom.test.tsx` (new, unsealed): the `Scene` element receives the viewer's clock. `test/no-time-reads.test.ts` (new, S5): the AC1 scan as a test, red until this step (3 hits → 0) |

Notes:
- Steps 2–4 change one file, `Scene.tsx`. They land as **one S6 task** with three tests written in order explode → camera → emphasis, and one S6 re-seal, so a single file is not re-sealed three times in a row.
- `Slabs.tsx` is named in the brief but needs **no edit**: it already samples through its `now` prop.
- After step 7 the scan prints only `src/time/clock.ts`, and AC1's first half is met.
- `TeardownViewer`'s `setTimeout(resolve)` (staged-renderer task yield) and the `requestAnimationFrame` callbacks in `LiveRegion`/`CircuitTrace` are **not time reads**. They stay, and are listed as such in the scan log (Q6).

---

## 5. E2 — true pause/resume

### 5.1 API (Q2)

| Action | Meaning after S15 | Before |
|---|---|---|
| `actions.pause()` | **freeze the whole scene:** `clock.pause()`. Explode, camera, emphasis, tour time, overlay and DOM motion stop. Tour status is left as it is | tour-only pause |
| `actions.resume()` (new) | `clock.resume()`: everything continues from the frozen frame | — |
| `actions.pauseTour()` (new name for the old `pause`) | tour-only pause, byte-for-byte the old reducer path | was `pause()` |
| `play()`, `stop()`, `step()`, … | unchanged. While frozen, a command is applied at the frozen instant and its motion starts on `resume()` | — |

- **Callers moved to `pauseTour()`** so that project pages behave exactly as before:
  - S8 case-study auto-pause;
  - `executeTourCommand` through an adapter `{ ...viewer.actions, pause: viewer.actions.pauseTour }` built in `TeardownViewer`, so the **S7 file stays byte-identical**;
  - `workbench-client.tsx`, `engine-playground.tsx` and the hero watchdog (app).
- The hero is the only caller of the new freeze.
- `viewer.paused: boolean` (additive) and `data-xploder-clock="running|paused"` on the wrapper make the state observable. This is an observability hook like S14 R6, not a feature.

### 5.2 What freezes, and how

1. **Engine tweens: by time.** Every tween samples `clock.now()`, which is frozen, so any frame rendered while paused shows the same pose. This covers explode (`Slabs`), turn and zoom (`CameraRig`), emphasis and tour position (`positionAt`). There is no per-tween pause code.
2. **Render loop: frame gate** (S6 `Scene.tsx`, a `<ClockGate>` child). On pause it calls R3F `setFrameloop('never')`, so self-invalidating loops stop and a paused hero burns no frames, even when paused mid-tween or offscreen. On resume it calls `setFrameloop('demand')` and `invalidate()`.
   - While paused it calls `advance()` **once** when something the canvas must redraw changes: size, DPR, palette, look, layout, kinds. This keeps a resize or theme toggle from leaving a stale or blank canvas.
   - `TeardownViewer`'s `frameloop="demand"` prop is unchanged; R3F keeps a runtime `setFrameloop` until the prop changes.
   - Why not gate each `invalidate()` call instead: that needs `CameraRig.tsx` (S4, C2) (Q3).
3. **Tour timers: suspended** by the clock (§3.2). `useTourClock`'s pending boundary fires after resume at the right engine time.
4. **Overlay: emits nothing while paused** (§4 step 6). Together with E4 this gives **zero settles while paused**, even if a gate-driven `advance()` renders a frame.
5. **DOM motion: viewer sweep** (S8 `TeardownViewer.tsx`).
   - On pause: `wrapper.getAnimations({ subtree: true })` → `pause()` each running animation, and the paused set is kept. A second sweep runs on the next animation frame to catch `CircuitTrace`'s rAF-deferred draw start.
   - On resume: `play()` the kept set.
   - CSS transitions are `CSSTransition` animations and are swept too. Under reduced motion nothing animates, so this is a no-op.
6. **Hero** (app wiring, C6):
   - **Storyboard.** `hero-stage.tsx` builds the sequence with `schedule: (cb, ms) => viewer.clock.schedule(ms / 1000, cb)`, `cancel: (h) => h()` and `now: () => viewer.clock.now() * 1000`.
   - **Pause order.** On a user, hidden or offscreen pause the effect calls `viewer.actions.pause()` **first**, then `controller.pause()`, so the storyboard's elapsed-time bookkeeping reads the frozen instant. Resume runs in the reverse order.
   - **Unchanged.** `hero-loop.ts` keeps its S14 I-03 logic (cancel on pause, reschedule the remaining time on resume), so its original tests are untouched. The tour is still `pauseTour()`d and `play()`ed around the freeze, as today.
   - **Label waits.** `hero-leader.tsx`'s label controller uses the same clock-backed `schedule`. Its WAAPI fade is swept with the hero figure: `figure.getAnimations({ subtree: true })`, same rule as item 5.
   - **Latency.** If Stage 3 measures more than one frame between the click and `clock.pause()`, because the pause runs in an effect, the call moves into the toggle handler.
   - `hero-follow.ts` (scroll follow) already pauses and resumes from the current scroll position, and is left alone.

### 5.3 Proof

- **Unit, S5/S6 (fake clock):**
  - `test/scene-pause.test.tsx`: pause mid-explode / mid-turn / mid-zoom / mid-emphasis; advance the fake host by 0.5 s and by 3 s, rendering frames.
    - `progress`, the camera matrix and the lift are byte-identical to the pause frame.
    - 0 `settled` events while paused.
    - Resume: the first sample equals the pause sample. `settled` arrives once, at `pauseAt + remaining` engine time.
  - `test/viewer-pause.test.tsx`: tour mid-step; pause 3 s; the step index and `positionAt` are frozen, and the boundary fires `remaining` after resume. `pauseTour()` keeps the old behaviour.
- **Hero, app (fake clock):**
  - The S14 I-03 tests (`home-hero-loop.test.tsx` "pause … resumes after the remaining step time", 8 cases) pass **unchanged**.
  - A twin runs four of them with `schedule`/`now` taken from `createFakeClock()` instead of the hand-rolled scheduler (Hard Rule 6).
  - The watchdog tests switch their mock from `pause` to `pauseTour` (rename only, Q2).
- **Browser:** `pause-freeze.mjs` (feature dir), on the production export.
  - **Matrix:** pause points = implode mid, explode at 50 / 300 / 600 / 850 ms, zoomin mid-tween, turn mid-tween, capture mid-step and mid trace draw, inspect mid-step; × 1440×900 and 390×844; × CPU ×1 and ×4.
  - **Per cell:**
    - hero-figure screenshots at Pause + 1 frame, + 0.5 s and + 3 s;
    - pixel diff (+1 frame vs +0.5 s vs +3 s) = **0 px**;
    - `xploder:settled` count while paused = **0**, plus a label/lettering DOM mutation count = 0;
    - `data-xploder-clock` set within one frame of the click (rAF timestamps);
    - resume: the first frame after Play differs from the paused frame by at most one frame of motion, and the next settle lands at `remaining ± 1 frame`. That proves "no jump" (it would land at 0) and "no restart" (it would land at the full duration).
  - **Reduced motion:** the `site-probe` `reduced-motion` group, unchanged and green.

---

## 6. E4 — settle from the tween state

### 6.1 What replaces frame-signature equality

`OverlayProjector` keeps its state machine (`initial` → `moving` → `settled`). Each rendered frame it evaluates two things.

1. **The rest key: what the scene is heading for.** `{ layout, size.width, size.height, explodeTarget, rig.turns, rig.zoomFactor }`. These are targets, not the current frame, and come in as `Scene` props (S6). When the rest key changes, a transition starts. `moving` is emitted if the state was not already `moving`.
2. **At rest: the tweens' own state at `clock.now()`.**
   - **explode:** every `progress[i] === target` (0 or 1). This is exactly the timeline's own settled test (`explode.ts` `sample`: `value !== currentTarget` ⇒ not settled).
   - **turn:** the azimuth the rig last placed (recorded from `CameraRig`'s `onAzimuth`, which `Scene` already wires) `=== azimuthOf(rig.turns)`.
   - **zoom:** `camera.zoom === fitZoom(bounds, size) × rig.zoomFactor`.
   - Each tween's `sample()` returns **exactly** its target once settled (`displayed = target`), and the projector reads that output, not the tween object, so neither `CameraRig.tsx` nor `camera.ts` changes (C2, Q4).
   - **clock running:** `!clock.paused`.

**Rule:** `settled` is emitted when the state is not `settled` and the scene is **at rest**. It is emitted once per transition: it stays `settled` until the rest key changes or the scene leaves rest.

- A mid-tween frame, duplicated or not, is never at rest, so it can never settle. That is C4 / AC3.
- A paused clock is never at rest (and item 4 of §5.2 emits nothing anyway). That is AC2's zero settles.
- A **discrete change** (resize, reduced-motion instant turn or zoom, layout swap) changes the rest key while already at rest. It emits `moving` then `settled` **in the same frame**, so consumers still see the pair, and labels re-place without a stale frame.
- **View offset (scroll)** stays outside the rest key and keeps its own `onOverlayScroll` path. The existing test "reports a view-offset change without emitting moving" stays green.
- The frame signature (`signatureOf`) is **deleted**. Nothing decides settled from frame equality any more.

### 6.2 Visible effect and the existing S6 test

- Today a tween settles one frame **after** it reaches rest, because the signature must repeat once. With E4 it settles **in the frame it reaches rest**: labels appear about 16.7 ms earlier. That is within Hard Rule 7's one-frame tolerance, and is measured in §11 (hold table).
- `test/overlay-projector.test.tsx` "emits moving once and then exactly one settled after a turn" asserts the extra frame (`['settled','moving']` at `seconds = implode`). That assertion changes to `['settled','moving','settled']` in the same frame. This is an S6 test change for a behaviour change, made test-first and re-sealed with that reason. Its other tests stay byte-identical in intent.

### 6.3 Proof

- **Red first:** `test/overlay-settle-state.test.tsx` (new, S6) promotes the C4 repro: hold the clock for 1, 2 and 5 frames at 0.2 s of explode, at mid-turn and at mid-zoom → expect **0** `settled` events until the tween's end time, then exactly **1**. Red today (1 settle at 0.2 s, then `moving`).
- **Same-frame settle:** the frame where `progress` reaches the target emits `settled` with `at` equal to the tween end time.
- **Browser:** `settle-once.mjs` (feature dir), CPU ×4 and ×6.
  - **Motions:** explode, implode, zoom in, turn. **Routes:** `/projects/websocket-inspector`, `/projects/jev-toolkit` and the `/` hero loop.
  - It logs every `xploder:settled` event and every label/lettering visibility flip with rAF timestamps, and captures frames at 25 / 50 / 75 % of each tween.
  - **Pass:** one settle and one label reveal per motion, and zero labels visible in any mid-tween capture.

---

## 7. E5 — public events

### 7.1 Contract

| Event | Fires | Once per | Payload |
|---|---|---|---|
| `onReady()` | the first frame is rendered: the same moment `data-xploder-ready="true"` is set | viewer mount | — |
| `onSettled(phase)` | the overlay enters `settled` (§6) | settle transition | `phase: 'imploded' \| 'exploded' \| 'zoomed' \| 'turned'` |
| `onTourEnded(flowId)` | `viewer.tour.status` goes `playing` → `ended` | tour run | `flowId: string` |

- **Phase** names what the transition contained. Precedence is explode/implode > zoom > turn.
  - An explode-target change gives `'exploded'`/`'imploded'`, a zoom change (in, out or reset) gives `'zoomed'`, and a turn gives `'turned'`.
  - A transition with none of these (initial rest, resize, layout swap) reports the explode state.
  - This keeps the probe vocabulary (`data-xploder-state`) for the explode phases (Q8).
- **Order (documented in `TeardownViewer`'s TSDoc and in `src/react/events.ts`):**
  1. `onReady` precedes every other event.
  2. `onSettled` events follow in the order of their transitions. The first rest after mount is the first `onSettled`.
  3. `onTourEnded` fires after any `onSettled` decided in the same frame.
  - Because `OverlayProjector` (useFrame priority 0) runs before `Stats` (priority 1, which sets ready), a settle in the first frame is held by the emitter and delivered right after `onReady`, in the same frame.
- **While paused:** no events. A `pauseTour()` is not an end.
- **DOM mirror for probes:** the wrapper dispatches bubbling `CustomEvent`s `xploder:ready`, `xploder:settled` (`detail: { phase, at }`) and `xploder:tour-ended` (`detail: { flowId }`) at the same moments. Probes listen from an init script; app code still scrapes no DOM.
- **Existing `onSettled` prop:** the type widens from `(state: 'imploded' | 'exploded')` and the source moves from the `Slabs` timeline to the scene-wide settle. `() => void` callers (`engine-playground` cycle) are unaffected.
  - An explode or implode with the camera at rest settles in the **same frame** as the timeline did.
  - `Scene`/`Slabs` keep their own timeline `onSettled`, so the S4 `test/scene.test.tsx` is untouched.
- The `data-xploder-*` attributes all stay.
- **Code:** a pure emitter `src/react/events.ts` (new, S8) with `ready()`, `settled(phase, at)` and `tourEnded(flowId)`. It enforces ready-first and once-per-transition, and is unit-tested in Node. `TeardownViewer` (S8) wires it. `OverlayEvent` `settled` gains `phase` and `at` (S6, additive).

### 7.2 Which probes switch

| Probe | Today | After |
|---|---|---|
| `site-probe.ts` `waitForHeroSettled` (drill, `/` CLS cell) | DOM poll: `[data-hero-loop-slot] button` + `[data-hero-loop]` | in `revealed` mode, waits for `xploder:ready` then the first `xploder:settled` on the hero viewer, then the existing structural condition (loop button). Skipped and gated rows are unchanged. No timeout constant changes (S14 R4 guard stays) |
| `eager-probe.ts` | `readyAtMs` from a `data-xploder-ready` observer; `afterRest` = fixed `EAGER_PROBE_REST_MS` | `readyAtMs` from `xploder:ready`, cross-checked against the attribute (same frame, else the run fails); new `settledAtMs` = first `xploder:settled`. `afterRest` waits for **max(deadline + REST, first settle)**, so the observation window can only grow. Deadlines unchanged |
| `engine-probe.ts`, other `site-probe` groups | attributes | unchanged (simpler as is) |

- Neither probe is an S3 file.
- **Proof:**
  - unit: emitter order and once-semantics; jsdom `viewer-events.dom.test.tsx` (ready-first, tour end once, no events while paused);
  - browser: `event-log.mjs` over one full hero loop (39.6 s) and an explode → zoom → turn → tour script on both project routes, giving per-transition counts (all = 1) and the order;
  - every S14 group (`site:probe --ci`, `eager:probe --expect live-loop`, `engine:probe`) green.

---

## 8. E8 — phone-profile measurement

- **Profile:** Playwright Chromium, mobile emulation 412×823 at DPR 1.75, touch, 4G off (local export), CPU throttling ×1 / ×4 / ×6 via CDP `Emulation.setCPUThrottlingRate`.
- **Routes:** `/projects/websocket-inspector` and `/projects/jev-toolkit` ("both projects").
- **Motions:** explode, zoom in ×3 (smooth), turn right; **10 runs** per cell after one warm-up.
- **Measured per settle** (`settle-timing.mjs`, feature dir; the event log of §7 plus a CDP CPU profile):
  - **settle delay** = (rAF timestamp of the first frame whose paint includes the placed labels) − (rAF timestamp of the frame where the tweens reached rest). The labels' fade-in is excluded: it is a designed duration, not a cost. The rest frame is `settled.at` mapped to the host frame.
  - **placement cost** = self time of `overlay/place.ts` and `lettering/place.ts` frames in the settle task, attributed with the existing `tools/perf/src/cpu-profile.ts` on a source-mapped build. Plus the total main-thread time of the settle task.
- **Output:** a table, project × CPU × motion → median, p95 and max for settle delay, placement self time and task time. Also `meta` (Chromium version, commit, throttling, viewport).
- **When:** on the final code after E4/E5 (the decision concerns what ships). The same script also runs once on base `8c410f3` for context; there the settle includes the one-frame signature lag.
- **Decision rule (brief default, Q9):**
  - if the **median settle delay at CPU ×4 is > 50 ms for either project**, a placement cache lands in S6 `overlay/place.ts`. It must be output-identical: the S11.8 E1a oracle corpus (2,030 cases) plus captured real settle frames, **0 differing coordinates**. It is then re-measured.
  - Otherwise **no cache**, no `place.ts` change, and the table is the deliverable. ×1 and ×6 are reported, not decided on.
- **Estimate (not evidence):** S11.8 measured the fixture placement median at 0.46 ms in Node after E1a, so the ×4 settle delay is expected well under 50 ms → no cache.

---

## 9. Re-seal plan (for Murphy's approval at G1)

### 9.1 Files, reasons, tags

The procedure is the S14 one, per step:
1. red test commit;
2. fix commit (green);
3. re-seal commit: the generator `base=` moves to the fix commit, the note gains `Re-sealed in S15 at <sha>: <file> — <reason>; see .specify/features/engine-timing/evidence/<T-file>`, new tests join `.paths`, the manifest is regenerated and `frozen-surface.test.ts` expectations are updated;
4. annotated tag **`seal/<surfaces>-<fix sha>`**, pushed in the same session (Hard Rule 5).

| # | Step | Surface | Files | Reason (manifest note) | Tag |
|---|---|---|---|---|---|
| 1 | clock module | S5 | `src/time/clock.ts`, `src/time/fake.ts` (new; `src/time` added to `.paths`); tests `clock.test.ts` | one injectable, pausable engine clock; only host-time reader | `seal/s5-<sha1>` |
| 2 | explode → camera → emphasis | S6 | `src/react/scene/Scene.tsx`; tests `scene-clock.test.tsx` | Scene samples every tween on the injected engine clock | `seal/s6-<sha2>` |
| 3 | tour | S5 | `src/react/useTeardownViewer.ts`, `src/react/useTourClock.ts`; tests `tour-clock-engine.test.tsx` | viewer owns the clock (`viewer.clock`); tour boundaries on `clock.schedule` | `seal/s5-<sha3>` |
| 4 | overlay | S6 | `src/react/scene/OverlayProjector.tsx`; tests `overlay-clock.test.tsx` | overlay events stamped in engine time; none while the clock is paused | `seal/s6-<sha4>` |
| 5 | viewer plumbing + AC1 scanners | S8 + S5 | S8: `src/react/TeardownViewer.tsx`, `src/react/panel/PanelLayer.tsx`. S5: tests `no-time-reads.test.ts`, `no-real-timers.test.ts` | the Scene runs on the viewer's clock; panel event cutoff via `hostNow()`; AC1 scanners join S5 | `seal/s5-s8-<sha5>` (both manifests share this base, like `seal/s5-s8-edde9d0`) |
| 6 | pause/resume API | S5 | `src/react/useTeardownViewer.ts`; tests `viewer-pause.test.tsx`, `viewer-handle.test.tsx` (pause rename) | `pause()`/`resume()` freeze the scene; tour-only pause is `pauseTour()` | `seal/s5-<sha6>` |
| 7 | frame gate | S6 | `src/react/scene/Scene.tsx`; tests `scene-pause.test.tsx` | no frames while paused; one repaint on resize/theme | `seal/s6-<sha7>` |
| 8 | DOM freeze | S8 | `src/react/TeardownViewer.tsx` | viewer animations paused/resumed with the clock; tour-command adapter; `data-xploder-clock` | `seal/s8-<sha8>` |
| 9 | settle state | S6 | `src/react/scene/OverlayProjector.tsx`, `Scene.tsx` (rest inputs); tests `overlay-settle-state.test.tsx`, `overlay-projector.test.tsx` (turn timing) | settled from tween state at clock time; signature removed | `seal/s6-<sha9>` |
| 10 | events | S8 | `src/react/TeardownViewer.tsx`, `src/react/events.ts` (new, added to S8 `.paths`); tests `viewer-events.test.ts` | `onReady` / `onSettled(phase)` / `onTourEnded` + DOM mirror | `seal/s8-<sha10>` |
| 11 | *only if §8 says so* | S6 | `src/overlay/place.ts` | output-identical placement cache (0 differing coordinates) | `seal/s6-<sha11>` |

- **Not touched:**
  - S2/S4 (combined manifest, C2): `engine/explode.ts`, `engine/camera.ts`, `CameraRig.tsx`;
  - S5 `Emphasis.tsx`, `TourCaption.tsx`;
  - S6 `Slabs.tsx`, `CircuitTrace.tsx`, `BlueprintOverlay.tsx`;
  - S8 `PartLettering.tsx`;
  - S7 everything, including `executeTourCommand.ts` and `viewer-panels.test.tsx`.
- **Unsealed files touched:**
  - `src/react/index.ts`, `test/fixtures/index.ts` (exports);
  - app: `hero-stage.tsx`, `hero-leader.tsx`, `workbench-client.tsx`, `engine-playground.tsx`, `home-hero-loop.test.tsx`, new `xploder-dom` tests;
  - `tools/perf/src/site-probe.ts`, `eager-probe.ts`;
  - feature-dir scripts.
- **Count:** 10 re-seal commits and 10 tags (+1 if §8 triggers the cache): S5 at #1, #3, #5, #6; S6 at #2, #4, #7, #9; S8 at #5, #8, #10. Each tag pairs with the commit that needed it; none is batched.

### 9.2 Empty-diff proof (AC6)

- **S2/S4:** `frozen-surface.manifest.json`, `.paths` and `generate.sh` are byte-identical to `8c410f3`, and so is every path in `frozen-surface.paths`.
- **S7:** `frozen-surface.s7.*` and every S7 path are byte-identical.
- **S3:** the 21 `tools/perf/src` files of the S03 merge (`args browser budgets evidence exit-codes fps lighthouse log preview reach serve summary-md weight` + `cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}`) are byte-identical.
- `guards.sh` (S14 pattern, base `8c410f3`) adds:
  - `RESEAL-LIST-OK`: every changed sealed path is on §9.1;
  - `SEAL-TAG-OK`: every manifest base has a matching `seal/*` tag on origin;
  - `AC1-SCAN-OK`;
  - `TIMEOUT-NOT-RAISED-OK`, carried over.

---

## 10. Gate matrix and evidence per AC

| AC | Proof | Evidence (Stage 3) |
|---|---|---|
| **AC1** | scan as test (`no-time-reads`) + `guards.sh AC1-SCAN-OK`. Fake-clock suite. `no-real-timers` scanner with negative control over the **animation tests**: `clock`, `scene-clock`, `scene-pause`, `overlay-clock`, `overlay-settle-state`, `overlay-projector`, `tour-clock-engine`, `tour-clock`, `tour-clock-boundary`, `viewer-pause`, `viewer-handle`, `camera-zoom`, `emphasis-scene`, and app `home-hero-loop` | `T0xx-log-ac1-scan.txt` (base 3 hits → 0), `T0xx-log-clock-suite.txt`, `T0xx-log-no-real-timers.txt` (incl. negative control) |
| **AC2** | `scene-pause` + `viewer-pause` red → green; I-03 originals + clock twin; S13 originals + clock twin; `pause-freeze.mjs` matrix (§5.3); `reduced-motion` group | `T0xx-log-pause-red.txt`, `T0xx-log-pause-green.txt`, `T0xx-log-i03-s13-reproof.txt`, `T0xx-log-pause-freeze.md` (cell table: pixel diffs, settle counts, freeze latency, resume landing), `T0xx-screenshot-pause-<phase>-<vp>-{p1f,p05,p3}.png`, `T0xx-log-reduced-motion.txt` |
| **AC3** | `overlay-settle-state` red → green; `settle-once.mjs` at CPU ×4/×6 | `T0xx-log-settle-red.txt`, `T0xx-log-settle-green.txt`, `T0xx-log-settle-once.md` (event log), `T0xx-screenshot-settle-<motion>-{25,50,75}.png` |
| **AC4** | emitter unit + jsdom tests; `event-log.mjs`; probes switched; S14 groups green | `T0xx-log-events-unit.txt`, `T0xx-log-event-order.md`, `T0xx-log-probes.txt` (`site:probe --ci`, `eager:probe --expect live-loop` ×2, `engine:probe`) |
| **AC5** | `settle-timing.mjs` ×3 CPU × 2 projects; decision line; cache oracle only if triggered | `T0xx-log-e8-timing.md`, `T0xx-log-e8-base.md` (context), `T0xx-log-e8-decision.txt` |
| **AC6** | PR CI run URL (all seven required contexts); Lighthouse ≥ 95/95 on three routes; CLS 0; axe 0/0; weight < 3 MB; `site:probe` `draws` (2) and `hero` (eager reveal, zero interaction); `guards.sh`; tag list from `git ls-remote --tags origin 'seal/*'` | `T0xx-ci.txt`, `T0xx-log-gates.md`, `T0xx-log-surfaces.txt`, `T0xx-log-seal-tags.txt`, `AC-selfcheck.md` |
| **Holds** (Hard Rule 7) | S14 `storyboard-timing.mjs` + `tour-timing.mjs`: 5 runs on base and 5 after; every boundary within ±16.7 ms of base | `T0xx-log-holds.md` |

---

## 11. Stage 3 outline (Stage 2 formalises)

| Group | Tasks | Tier |
|---|---|---|
| 0 · baseline | on `8c410f3`: storyboard and tour timing (5 runs), S14 `pause-events.mjs` (expect 1 settle while paused today), `settle-once` and `settle-timing` base, AC1 scan | orchestrator (browser) |
| A · clock | §9.1 #1 (clock module + fake-clock suite) | Flash; orchestrator reviews and tags |
| B · consumers | §9.1 #2–#5 in order (explode → camera → emphasis, tour, overlay, viewer plumbing + AC1 scan) | Flash; orchestrator reviews, tags, runs the jsdom checks |
| C · pause | §9.1 #6–#8 + hero wiring + `pause-freeze` matrix | Flash (code); orchestrator (matrix) |
| D · settle | §9.1 #9 + `settle-once` | Flash; orchestrator |
| E · events | §9.1 #10 + probe switch + `event-log` | Flash; orchestrator |
| F · measure | `settle-timing` ×3 CPU; decision; §9.1 #11 only if triggered | orchestrator |
| G · gates/seals | holds re-run, full CI, guards, AC self-check, tag list | orchestrator |

- Stage 3 stops at each group boundary.
- **Escalation:** Flash stuck ×2 → the orchestrator finishes the task personally (kickoff Hard Rule 11), with the standing pause-and-report on usage. Tier 1.5 is dormant (skip-with-record).
- Every task report names the tier that finished it.

### Risks

| Risk | Mitigation |
|---|---|
| R3F `setFrameloop('never')` leaves a stale canvas on resize/theme while paused | the gate's one `advance()` on size/DPR/palette/look/layout change; tested by `scene-pause` (resize while paused renders one identical-pose frame) |
| Hidden extra host reads shift the S13 race | `schedule(…, from)` adds no reads (§3.2); the untouched original test is the guard |
| `ease(p)` reaches exactly 1.0 a hair before the tween end | same property the explode timeline already has; at most a sub-millisecond-early settle, never mid-pose; covered by the same-frame test |
| A DOM animation created during pause escapes the sweep | second sweep on the next frame; `pause-freeze` diffs every tour cell at +1 frame / +0.5 s / +3 s |
| A tour-pause caller is missed in the rename | `pause` keeps its type, so typecheck cannot catch it: the API commit lists every `.pause()` caller from a repo-wide grep (the five in C3) and moves each; S7 is reached through the adapter |
| `no-motion-literals` flags the clock's ms/s factor | uses the existing named `MILLISECONDS_PER_SECOND` pattern; the scanner runs in CI |

---

## 12. Open questions (each with a default)

1. **Q1 — S2/S4 labelling (C2).** The brief calls `engine/explode.ts`, `engine/camera.ts` and `CameraRig.tsx` "S2". The repo's split classes them as S4, and AC6 requires S4 empty. **Default:** touch none of them (C1 makes that free). The combined S2/S4 manifest stays byte-identical, so AC6 holds either way. If Stage 3 finds one of them must change, STOP and ask.
2. **Q2 — `pause()` name collision (C3).** **Default:** `pause()`/`resume()` become the whole-scene freeze (the brief's names), and the old tour-only pause is renamed `pauseTour()`. All internal callers move, S7 is reached through an adapter, and project pages behave as before. Alternative: `pause()` = freeze **and** tour pause, with no rename. But then a tour pause on a project page would also freeze hover, explode and zoom until resume, which changes project-page behaviour.
3. **Q3 — how rendering freezes.** **Default:** the frame gate (`setFrameloop('never')` while paused, one repaint on size/theme change) in `Scene.tsx`. Alternative: gate each `invalidate()` loop, which needs `CameraRig.tsx` (S4).
4. **Q4 — camera rest state.** **Default:** read the tween's settled output against the target (azimuth via `onAzimuth`, `camera.zoom`). No S4 edit. Alternative: `CameraRig` reports its tweens' `settled` flags (S4 edit).
5. **Q5 — clock home.** **Default:** `src/time/` sealed in S5, API from `xploder/react`, fake clock from `xploder/fixtures` (already barred from production by `prod-imports.test.ts`). `package.json` unchanged.
6. **Q6 — AC1 scan scope.** **Default:**
   - the regex is `performance\.now\(|Date\.now\(` over `packages/xploder/src`, excluding `src/time/`;
   - `PanelLayer`'s event cutoff moves to `hostNow()`;
   - rAF callbacks and the staged-renderer task yield are not time reads and are listed as such.
7. **Q7 — what counts as a fake in "zero real timers".** **Default:** the engine fake clock or Vitest fake timers (the latter only where the untouched S13/S14 original tests already use them). Real reads and real waits fail the scanner.
8. **Q8 — events.** **Default:**
   - callbacks on `TeardownViewer` plus a DOM `CustomEvent` mirror for probes;
   - phases `imploded`/`exploded`/`zoomed`/`turned` with the §7.1 precedence;
   - the existing `onSettled` prop is widened and moved to the scene-wide settle;
   - `onTourEnded` carries `flowId`.
9. **Q9 — E8 decision.** **Default:** a cache only if the median settle delay at **CPU ×4** is **> 50 ms on either project**, measured on the final code. The delay is defined as in §8 (rest frame → labels painted, fade excluded).
10. **Q10 — hero DOM motion.** **Default:**
    - storyboard and label waits on the engine clock;
    - viewer and hero-figure animation sweeps;
    - `hero-follow.ts` unchanged;
    - `hero-loop.ts` unchanged (C6).
11. **Q11 — commands while paused.** **Default:** accepted and applied at the frozen instant, animating after `resume()`. Pointer hover too.
12. **Q12 — one-frame-earlier labels (§6.2).** **Default:** accept. This is the brief's E4 literally, and it is within the one-frame hold tolerance. The S6 turn test is updated test-first. Alternative: keep a one-frame confirmation, which would retain frame-equality as a settle condition and contradict E4.
13. **Q13 — brief defaults.** **Default:** confirm all three: 50 ms threshold, ≤ 1 frame hold tolerance, and the `onReady` → `onSettled(phase)` → `onTourEnded` order.

---

### WHAT MURPHY SHOULD TEST/VALIDATE

1. Read §2 (C1–C6). The surprise is C4: one held frame mid-explode makes labels flash (`evidence/RFC-log-dup-frame-repro.txt`). A real pause would trigger it, which is why E4 comes with E2.
2. Optional, 30 s: on `/`, press Pause while the model explodes. Today the slabs finish exploding and the labels fade in while paused. After S15 they stop on the spot.
3. Check the API naming in §5.1: `pause()`/`resume()` freeze everything; the tour's own pause becomes `pauseTour()`.

### WHAT THE AGENT NEEDS FROM MURPHY

1. **Approve the re-seal list (§9.1)** and the tag-per-re-seal scheme. Default: approve as listed (10 tags, +1 only if the cache is triggered; no S2/S4/S7 file).
2. **Q1 — S2/S4 labelling.** Default: touch no S4-split file.
3. **Q2 — the pause naming.** Default: `pause()`/`resume()` = scene freeze, tour pause = `pauseTour()`.
4. **Q13 — the three brief defaults.** Default: 50 ms at CPU ×4, ≤ 1 frame, the event order as written.
5. **Everything else (Q3–Q12).** Default: accept as written.

---

## 13. Gate 1 record

**Murphy, 2026-11-15:** "yes all defaults". Every §12 default is accepted (Q1–Q13), including the §9.1 re-seal list, the tag-per-re-seal scheme, the S4-untouched reading (Q1), the `pause()`/`resume()` + `pauseTour()` naming (Q2) and the three brief defaults (50 ms at CPU ×4, ≤ 1 frame, the event order).

**Refinements made in Stage 2 after re-checking the defaults against the code** (Murphy pre-approves improvements at G1; none changes an AC):

- **R1 — host time in seconds, legacy `now` read through a ref.** `ClockHost.now()` returns **seconds**, not ms. The default host is then bit-identical to today's `defaultNow` (`performance.now() / 1000`). `clockFromNow(now)` returns the injected value exactly: no `× 1000 / 1000` round trip, which could move a value by one ulp in the S13 race. Tests pass `now` as inline lambdas (`tour-clock.test.tsx`), so the legacy clock reads the **latest** `now` through a ref updated every render, as the current `now` dependency does. §3.1's `ClockHost` comment changes accordingly; `setTimer` still takes ms.
- **R2 — the rename lands with its callers.** If `pause()` became the freeze in one commit and the S8 callers (case-study auto-pause, the `executeTourCommand` adapter) moved in a later one, a tour pause on a project page would freeze the scene in between. §9.1 #6 therefore covers **S5 + S8** in one task (`useTeardownViewer.ts` + `TeardownViewer.tsx` caller changes + the app callers), tagged `seal/s5-s8-<sha>`. §9.1 #8 (DOM freeze) stays its own S8 step. The tag count is unchanged at 10 (+1).
- **R3 — `viewer-handle.test.tsx` is not touched by the rename.** No xploder test calls `viewer.actions.pause()` (repo grep). The rename edits app code (`workbench-client.tsx`, `engine-playground.tsx`, `hero-stage.tsx`) and the hero stage tests' mocked viewer, which also gains `pause`, `resume`, `pauseTour` and a fake `clock`. The S14 I-03 controller tests (`controller()` harness) are untouched.
- **R4 — the frame gate invalidates on resume itself.** R3F 9.8.2 `setFrameloop` only stores the mode (and resets the store clock, which nothing reads; S14 C1). It does not request a frame, so `<ClockGate>` calls `invalidate()` after `setFrameloop('demand')`. `advance` is the store's `advance(timestamp, runGlobalEffects)`.
- **R5 — the viewer-clock jsdom test mocks `Scene`, not only `Canvas`.** The existing `xploder-dom` harness mocks `Canvas` to `null`, so no `Scene` props are visible. `viewer-clock.dom.test.tsx` mocks `Canvas` as a pass-through and `src/react/scene/Scene` as a prop-capturing stub.
- **R6 — guard `getAnimations`.** jsdom has no `Element.getAnimations`. The DOM sweep runs only when `typeof wrapper.getAnimations === 'function'`, so jsdom suites stay green and old browsers degrade to the canvas-only freeze.
- **R7 — precise rule for "fake" in AC1 (Q7).** Vitest fake timers also fake `Date` and `performance`: the hero tests read `Date.now()` under `vi.useFakeTimers()`. The scanner therefore fails an animation test that reads `Date.now(`/`performance.now(`/`new Date(` or calls `setTimeout(`/`setInterval(` **unless the same file installs `vi.useFakeTimers()`** (in `beforeEach` or the test). It also fails `await new Promise(… setTimeout …)` and `vi.useRealTimers()` outside `afterEach`, in every case.
- **R8 — one base for every "before" number.** T001 takes every baseline once on `8c410f3`: holds (5 runs), tour timing (2 × 5), the S14 pause sweep (expect 1 settle while paused today), `settle-once`, `settle-timing`, the AC1 scan. Every later comparison uses that snapshot (the S14 R1 pattern).
- **R9 — escalation wording reconciled.** Kickoff Hard Rule 11 says that if Flash is stuck twice, the orchestrator finishes the task personally. The standing policy (S02, kept in S14) is to pause and report to Murphy with the 5h/7d usage first. **Applied:** after two Flash failures, pause and report with usage; the orchestrator finishes the task personally on Murphy's "go". The finishing tier is reported either way.
- **R10 — the phase is computed where the rest key lives.** `OverlayProjector` already tracks the rest key (§6.1), so it computes the `onSettled` phase (§7.1 precedence) and puts `phase` on the `settled` `OverlayEvent` in the **E4** step (§9.1 #9, S6). The E5 step (#10) is then S8-only: the emitter, the wiring and the DOM mirror.
- **R11 — two jsdom tests gain `at` (found in T005).** `OverlayEvent` now carries `at` on both kinds (§4 step 6), so the `OverlayEvent` literals in `apps/web/test/xploder-dom/a11y-navigator.dom.test.tsx` and `a11y-panel-focus.dom.test.tsx` gain `at: 0`. These are app tests (unsealed). The change is type-driven only and makes no assertion change. The guard's allow-list gains the two paths; nothing else is widened.
- **R12 — `pause()` also pauses a playing tour (found in T007; corrects R3).** Two existing tests call `viewer.actions.pause()` and expect tour status `paused`: `packages/xploder/test/viewer-handle.test.tsx` (S5) and `packages/xploder/test/viewer-panels.test.tsx`. The second is S7 and must stay byte-identical (AC6), and it also passes `viewer.actions` straight to `executeTourCommand`. The Q2 default ("tour status unchanged") would break it, so `pause()` takes the Q2 alternative, but only for the scene-freeze caller:
  - `pause()` = clock freeze **plus** the tour pause if the tour is playing;
  - `resume()` = clock resume **plus** the tour play if that pause paused it;
  - `play()` resumes the clock first;
  - `pauseTour()` stays tour-only, and every project-page caller (the `tourCommandActionsOf` adapter, the case-study auto-pause, the workbench, the playground, the hero watchdog) uses it, so project pages keep today's behaviour exactly;
  - `stop()`, `step()` and `selectFlow()` do not touch the clock.
  - No AC changes. AC2's "zero settles, pixel-identical, Play continues from the same frame" is unaffected: the tour's own pause stores the elapsed time at the frozen instant.
- **R13 — the hero clock reaches the leader through the showcase context (T010).** `hero-leader.tsx` sits outside `hero-stage.tsx` and only sees the showcase context, so its label waits can use the viewer clock only through that context. `hero-showcase.tsx` (and `hero-live.tsx` if the wiring passes through it) join the allow-list. Both are app code and unsealed, and the change is wiring only.
