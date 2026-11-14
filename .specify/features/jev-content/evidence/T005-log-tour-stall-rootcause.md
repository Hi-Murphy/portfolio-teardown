# T005 — tour stalls at its last step: root cause (orchestrator, 2026-11-14)

**Symptom.** In the `teardown` re-run, 2 of 8 jev-toolkit tours stayed `data-xploder-tour="playing"` on "Step N of N" until the probe timeout (47 s / 31 s); the first T005 run had 8/8 `ended`. The tour UI shows the last step as playing indefinitely; Exit/Restart still work.

**Not S13.** The same stall reproduces on the **base export `3b829d0`** (before any S13 change, websocket-inspector only): **3 of 16** `capture-path` tours stalled at "Step 7 of 7" (`T005-repro-tour-stall.mjs.txt`, run against `/tmp/s13-checks/base-out-3b829d0`).

**Reproduction conditions.** Only with Playwright's `channel: 'chromium'` (the probes' browser) plus CDP polling (`page.bringToFront()` every 100 ms, as the probe's `waitForTourState` does): jev arm-run 1/8, 1/12, 1/14; WSI base 3/16. 0/12 with the headless shell and no polling. The polling only changes timing; it is not the cause.

**Instrumentation (failing run, jev arm-run).** Every `setTimeout` wrapped; `data-xploder-tour` watched with a MutationObserver; Page Lifecycle + visibility events recorded:

```
TIMERS [{"delay":1594,"at":11598,"fired":13191,"late":-1}]      <- final-step timer fires ~1 ms early; no timer is ever scheduled again
MUTS   [...,[9996,"playing"],[11598,"playing"]]                <- no attribute change after the last step starts
LIFE   []                                                       <- no freeze/resume/visibilitychange/blur
MC "mc-ok"   TO "timeout-ok"                                    <- MessageChannel and timers still run: the page is not frozen
```

**Root cause — `packages/xploder/src/react/useTourClock.ts` (S5 frozen surface) with `src/interaction/tour.ts`:**

1. The clock sets `setTimeout(tick, (nextBoundary − now) × 1000)`. Chrome truncates the fractional delay, so the timer can fire up to ~1 ms **before** the boundary.
2. `tick` folds `wholeBeats(now − anchor, beat) = 0` → the reducer returns the **same** `playing` state (last step).
3. `setWake` re-runs the effect a moment later, now **after** the boundary. `positionAt(state, now)` folds to `ended` → `nextBoundary === null` → the effect `return`s **without scheduling a timer and without dispatching**.
4. Nothing dispatches again → the reducer state stays `playing` forever.

Only the last step can stall: on earlier steps the fold yields the next `playing` step with a non-null boundary, so a timer is re-armed.

**Deterministic proof** (pure reducer, no browser): `T005-repro-clock-race.test.ts.txt` — a tick 0.4 ms before the final boundary returns the identical state (`toBe(state)`), and `positionAt` 0.2 ms after it returns `nextBoundary: null` while the reducer status is `playing`. It passed when run temporarily inside `packages/xploder/test/` (removed afterwards; `packages/` unchanged).

**Why S13 cannot fix it.** `src/react/useTourClock.ts` is listed in `packages/xploder/test/frozen-surface.s5.paths`. Kickoff Hard Rule 7 / AC7: no engine changes, frozen surfaces S2–S8 empty. → STOP + escalate (Hard Rule 2).

**Smallest correct fix (for whoever is authorised):** in `useTourClock`, when `positionAt` reports a status different from `state.status` (the boundary has already passed), dispatch `{ type: 'tick', now: timestamp }` instead of returning; plus a regression test built from the reproduction above. Optionally `Math.ceil` the delay so the timer is never early.
