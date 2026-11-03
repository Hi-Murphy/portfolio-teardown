# T005 follow-up — why frames drop under the AC2 harness (orchestrator diagnosis, 2026-11-03)

Build: slice HEAD after T005 (`992bd43`), local export, Playwright Chromium 156, mobile profile, 4× CPU.
Diagnostic scripts were one-off (not committed), and they change no harness. The raw outputs are below.

## 1. Which code requests animation frames after engagement (no harness recorder)

The script wraps `requestAnimationFrame` with an init script, records the caller stack for 3 s after a pointer move, and runs once per route.

```
/projects/websocket-inspector rAF requests after engage: 2
1 306 306 at td (/_next/static/chunks/1d5kkip1hlg-o.js:12:23695) | at /_next/static/chunks/1d5kkip1hlg-o.js:12:14901 | at /_next/static/chunks/1d5kkip1hlg-o.js:1:583
1 313 313 at tf (/_next/static/chunks/1d5kkip1hlg-o.js:12:23133)
/ rAF requests after engage: 2
1 263 263 at td (/_next/static/chunks/1d5kkip1hlg-o.js:12:23695) | at /_next/static/chunks/1d5kkip1hlg-o.js:12:14901 | at /_next/static/chunks/1d5kkip1hlg-o.js:1:583
1 271 271 at tf (/_next/static/chunks/1d5kkip1hlg-o.js:12:23133)
```

After engagement, the page requests **2** animation frames on each route, both from R3F (`1d5kkip1hlg-o.js` = R3F: `invalidate` → loop). There is **no continuous product rAF loop**.

## 2. Dropped frames without the harness recorder

This is a CDP trace (frame categories) of the same path with no `measureFps` recorder. The excerpt shows Compositor `DrawFrame`/`DroppedFrame` from t0 + 100 ms to t0 + 700 ms:

```
  83:  353.7    0.0 Compositor         DroppedFrame                 155
```

Only **1** frame drops: right after the 40.6 ms first-frame rAF (`FireAnimationFrame` at t0 + 306 ms). The same build under `fps:engine --scenario startup` drops 6 (T005 r1/r2).

## 3. Why the harness counts more

`tools/perf/src/fps.ts` `measureFps()` starts `startRafRecorder()` right after `Tracing.start`. That is a continuous `requestAnimationFrame` loop which samples `rafFps` for the whole 5 s window. With the recorder running, a main-thread frame is due on every vsync, so main-thread tasks longer than one frame interval delay frames that Chromium reports as `DroppedFrame`.

## 4. Consequences (no AC change)

- AC2 binds the **existing** `fps-engine` startup scenario, so its recorder stays and its count is the AC2 number. Nothing in the harness is changed or relaxed.
- Under this harness, "0 dropped frames" effectively requires every main-thread task from the moment the recorder starts (≈ t0 + 170 ms at 4× CPU) to fit within about one frame.
- One such task cannot be split by any allowed lever: three's `WebGLRenderer` constructor, a single synchronous call of ≈ 20–25 ms at 4× CPU (T004 §3: `getContext`, extensions, capabilities, state init).
- So **AC2's dropped-frame half may be physically unreachable on this host and harness**. The levers continue to minimise the count, and the final number is escalated with this evidence if it stays above 0 (RFC Q10).
