# T011h — camera-follow spike

Date: 2026-11-13
Branch: `task/s11.9-home-composition-t011h` (throwaway; not merged)
Worktree: `.`
Export: local static `apps/web/out` at `http://localhost:PORT/`
Browser: Playwright Chromium 156.0.8078.4
Motion: normal; light theme for screenshots and pacing. Reduced-motion path was not changed and its eager probe passed.

## Verdict

**YES — the public API can make the hero camera follow the frame, using the viewer's stage scroller.**

The best variant is **candidate (a), with interpolated scroll feedback** rather than a step-boundary snap. The current component id comes from the public project flow data (`flows[].path[step]`); the camera-space anchor is the engine-rendered
`data-xploder-trace-pad="<componentId>"` circle inside the public `data-xploder-stage` scroller. Its screen-space Y lets the hero move the stage's `scrollTop` so the active component stays at the viewport midpoint. The scroller's public `data-xploder-scroll-extent` and `scrollHeight` bound the correction.

| Candidate | Camera follow? | Result | Evidence |
|---|---|---|---|
| **(a) `zoomIn` + stage scroll** | **YES** | Works. A raw step write snaps by up to 111 px in one frame; interpolating the same scroll target over `tourPulse + tourStep` is smooth (max 5 px/frame). Most capture components settle within 3 px of the midpoint. | 60 fps pacing, CLS 0, draws 2, no errors; screenshots 1–4 |
| **(b) `toggleFocus(layerId)` per step** | **NO** | The public handle accepts the layer id, but `viewer.focus.suspended` is `true` for the whole tour, so the engine deliberately suppresses focus emphasis. Even when unsuspended, focus dims a layer; it has no camera translation. A 25 s run confirmed `releaseFocus()` when the turn begins. | Max centre error 166 px (1440) / 123 px (390); scroll range 12/10 px, only the initial zoom rescale |
| **(c) other public actions** | **NO** | `zoomIn/zoomOut/zoomReset` scale about the fixed centre; `rotateLeft/rotateRight` change azimuth; `highlight(id)` repaints a component. None expose a camera pan/centre. The stage scroller is the only public translation mechanism. | Zoom-only centre error 166 px (1440) / 123 px (390) |

**Recommendation:** build the R9 follow on candidate (a). Keep the trace-pad lookup as a small, documented DOM bridge; if the engine later exposes a projected component anchor on the public handle, replace that lookup without changing the scroll math. Use the interpolated variant, not the snap.

## What was measured

The static export was built from this worktree. A query-gated harness in `apps/web/components/hero/hero-stage.tsx` kept the default hero behaviour untouched:

- `?follow=scroll` — candidate (a), snap to the current pad each step.
- `?follow=trace` — candidate (a), interpolated scroll feedback; **best candidate**.
- `?follow=focus` — candidate (b).
- `?follow=zoom` — zoom-only control (candidate c / R9 fallback).

In every experimental mode the first frame explodes, calls `zoomIn()` twice (ends at zoom `1.5625`), then the existing sequence selects `capture-path` and plays. The default no-query path is unchanged.

### Locating the component

`[data-xploder-trace-pad]` **works**. Each reached component renders a circle whose `data-xploder-trace-pad` value is the public component id; its `getBoundingClientRect()` is stable after adding the stage's `scrollTop`. Overlay part labels did **not** work reliably at this zoom: `[data-xploder-label^="part:"]` was absent in the runtime sample, while the trace pad was present for every step.

The component id itself is derived without internals:

```ts
const flow = project.flows?.find((candidate) => candidate.id === viewer.tour.flowId);
const componentId = flow?.path[viewer.tour.step] ?? null;
```

## Measurements

30 s PerformanceObserver window per cell. Frame deltas are `requestAnimationFrame` deltas while `capture-path` is playing. CLS is accumulated from `layout-shift` entries with no recent input. Console errors and page errors include both channels.

| Viewport | Variant | RAF p50 / p95 / max (ms) | FPS | Max centre error | CLS | Errors |
|---|---|---:|---:|---:|---:|---:|
| 1440x900 | **trace (best)** | 16.6 / 17.5 / 18.2 | 60.16 | 83 px | 0 | 0 |
| 390x844 | **trace (best)** | 16.7 / 17.6 / 18.5 | 60.08 | 62 px | 0 | 0 |
| 1440x900 | scroll (snap) | 16.7 / 17.4 / 18.0 | 60.07 | 83 px | 0 | 0 |
| 390x844 | scroll (snap) | 16.6 / 18.6 / 20.2 | 60.08 | 62 px | 0 | 0 |
| 1440x900 | focus | 16.7 / 18.2 / 19.2 | 60.10 | 166 px | 0 | 0 |
| 390x844 | focus | 16.7 / 18.1 / 20.1 | 60.08 | 123 px | 0 | 0 |
| 1440x900 | zoom-only | 16.7 / 18.0 / 18.7 | 60.08 | 166 px | 0 | 0 |
| 390x844 | zoom-only | 16.7 / 18.0 / 18.8 | 60.07 | 123 px | 0 | 0 |

The centre error is the active trace-pad centre minus the stage viewport centre, sampled 1 s into each step. The first two host-layer components bottom out at the scroll maximum:

| Step | Component | 1440 centre error | 390 centre error |
|---:|---|---:|---:|
| 0 | `main-activity` | 64 px | 47 px |
| 1 | `financial-api` | 83 px | 62 px |
| 2 | `chucker-factory` | 3 px | 3 px |
| 3 | `chucker-socket` | 3 px | 3 px |
| 4 | `session-tracker` | 3 px | 3 px |
| 5 | `inspector-dao` | 3 px | 3 px |
| 6 | `inspector-database` | 7 px | 5 px |

Scroll smoothness over 12 s at 1440x900 (per-frame absolute `scrollTop` delta):

| Variant | Scroll delta p50 / p95 / max | RAF p50 / p95 / max |
|---|---:|---:|
| raw scroll (snap) | 0 / 0 / **111 px** | 16.6 / 17.4 / 18.3 ms |
| interpolated trace | 0 / **3 / 5 px** | 16.7 / 17.2 / 17.8 ms |

The interpolated run moves the scroller over `motion.durations.tourPulse + motion.staggers.tourStep`, matching the trace drawing pulse, then holds. No animation duration literal is used.

### Draws

```text
draws project: mode=2 rendered=32 total=32 PASS
draws hero: mode=2 rendered=105 total=105 PASS
draws: PASS (2 checks)
site-probe: PASS
```

### Lighthouse

`pnpm perf:lighthouse http://localhost:PORT/` against the final export:

```text
performance: 1 >= 0.95 (median) pass
lcp: 903.7039 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
```

### Console

No console errors or page errors in any of the eight 30 s measurement cells. Chromium emitted no relevant warning during the follow sequence.

## Screenshots

All four are the 1440 px light-theme hero clip (`[data-site-hero] figure`) from `?follow=trace`, at 1.35 s into the named capture step. The engine's trace is already drawn, so the moved camera and active component are visible together.

| File | Flow / step | Component | ScrollTop | Centre error |
|---|---|---:|---:|---:|
| `T011h-screenshot-follow-1.png` | capture / 0 | `main-activity` | 165 | 64 px |
| `T011h-screenshot-follow-2.png` | capture / 2 | `chucker-factory` | 54 | 3 px |
| `T011h-screenshot-follow-3.png` | capture / 4 | `session-tracker` | 83 | 3 px |
| `T011h-screenshot-follow-4.png` | capture / 6 | `inspector-database` | 165 | 7 px |

## Minimal wiring

The whole follow is public state + public DOM geometry; no engine or viewer change:

```ts
const stage = wrapper.querySelector<HTMLElement>('[data-xploder-stage]');
const anchor = wrapper.querySelector<SVGCircleElement>(
  `[data-xploder-trace-pad="${componentId}"]`,
);
const currentBaseY = anchor.getBoundingClientRect().top + stage.scrollTop;
const target = clamp(
  currentBaseY - (stage.getBoundingClientRect().top + stage.clientHeight / 2),
  0,
  stage.scrollHeight - stage.clientHeight,
);

// Per step: latch startScrollTop -> target, then on each frame:
stage.scrollTop = startScrollTop + (target - startScrollTop) * smoothstep(elapsed / followSeconds);
```

`followSeconds` is `motion.durations.tourPulse + motion.staggers.tourStep`; `smoothstep(t) = t²(3−2t)`. The component id is read from the project flow path and the step is observed from `data-xploder-tour-flow` / `data-xploder-tour-step` (or `viewer.tour`). The existing hero sequence still owns capture → inspect → turn.

## Risks

- **DOM bridge, not a typed API.** `data-xploder-trace-pad` is an engine-rendered public DOM marker, not part of `TeardownViewerHandle`. It is stable today but should be documented as a contract or promoted to a typed anchor before production.
- **Vertical only.** The stage scroller moves the camera's view offset on Y. The current capture path is sufficiently centred in X; an arbitrary path with large X separation would still be off-centre horizontally.
- **Range bound.** Two `zoomIn()` steps give 164.9 px of desktop scroll extent. The first two host-layer components cannot reach the exact midpoint (64–83 px low at 1440; 47–62 px at 390). This reads acceptably in the screenshots, but a final build should consider a third zoom step or a viewport-specific fit.
- **Input conflict.** Programmatic scrolling would fight user pan during the follow. Gate the loop off on pointer/touch interaction, and keep it off when paused, reduced motion is active, the hero is off-screen, or the document is hidden.
- **Trace availability.** There is no pad until the tour has advanced to that component. The follower waits for the pad; the first component therefore starts from the engine's centred exploded view and eases to the scroll bound.
- **Scrollbar/accessibility.** The stage already exposes a scrollable region for keyboard pan. The follow must not synthesize focus or change the declared keyboard controls; this spike only sets `scrollTop` and dispatches no focus.

## Final check output

```text
$ pnpm typecheck
$ pnpm lint
$ pnpm test
apps/web: 222 passed, 2 skipped
perf-tools: 274 passed
packages/xploder: 625 passed
$ pnpm build
WORKSPACE-CHECKS: PASS

OK app-touch
OK site-json
OK frozen-surfaces
OK workflows
OK routes
OK g1-sha
OK home-use-client
OK dependencies
OK interim-list

PASS eager-live
PASS eager-reduced-motion
PASS eager-save-data
PASS site-hero
PASS site-cls-draws
regress-hero: PASS (5 steps)
```

### Evidence check

```text
== T011h evidence check ==
screenshots: 4 present (624x415, 1440 light hero clip)
verdicts: (a) YES / (b) NO / (c) NO
measurements: pacing, centre error, 30 s CLS, draws, Lighthouse recorded
sanitization: PASS (no home paths or local ports)
changed paths: hero-stage.tsx + T011h evidence only
T011h-OK
```
