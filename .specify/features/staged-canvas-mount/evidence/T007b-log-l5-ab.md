# T007b — L5 frame-driven viewer state updates as transitions

Date: 2026-11-03

Lever: `3ea2588` — `S11.6/T007b: L5 — frame-driven viewer state updates as transitions`

Baseline: T006's committed after-runs (`T006-startup-*-clean-r{1,2}.json`, `T006-fps-startup-*-r{1,2}.json`). They were not re-measured.

Protocol: local static export, Playwright Chromium 156.0.8078.4, mobile profile, 4× CPU, quiet host, measurements one at a time. Clean startup `benchmarkIndex`: home-move 4,257.5 / 4,276.5, project-move 4,240 / 4,242, project-click 4,207 / 4,234. Medians are the mean of two runs; the larger raw range is `max(raw spread before, raw spread after)`.

## 0. Post-frame commit attribution

One `perf:startup --attribute --runs 1` run per path established the AC4 sequence. Before the clean A/B, a temporary instrumented build added `console.count` to `onPhase`, `onScrollExtent`, and effects on `phase` / `scrollExtentPx`; the counts were removed and the export rebuilt before measurement.

The page-side recorder timestamped the callbacks and the following React commits after engagement. Times are milliseconds in page time.

| Path | engage | ready | `onPhase` callback | phase commit | `onScrollExtent` | scroll spacer |
|---|---:|---:|---:|---:|---|---:|
| home-move | 81.400 | 387.000 | 349.700 | 403.500 | not called | 0 px |
| project-move | 63.800 | 399.100 | 362.900 | 417.500 | not called | 0 px |
| project-click | 58.200 | 467.200 | 430.500 | 486.200 | not called | 0 px |

Finding: the post-frame commit on these startup paths is fed by `setPhase`; `onScrollExtent` is not invoked after engagement and the spacer remains `0px`, so `setScrollExtentPx` is transition-wrapped defensively but does not contribute on these paths. The `data-xploder-state` write remains synchronous in `onPhase`.

## 1. A/B — startup clean

`time to first content frame` is `firstFrame - t0` (D-P3).

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | time to first content frame (ms) | 320.050 (344.000, 296.100) | 294.700 (292.800, 296.600) | -25.350 | 47.900 | no |
| home-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| home-move | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | cost (ms) | 305.015 (337.188, 272.843) | 284.384 (284.481, 284.286) | -20.632 | 64.345 | no |
| project-move | time to first content frame (ms) | 332.150 (333.200, 331.100) | 328.600 (329.900, 327.300) | -3.550 | 2.600 | yes |
| project-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-move | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | cost (ms) | 322.303 (323.063, 321.544) | 327.000 (328.974, 325.025) | +4.696 | 3.949 | yes |
| project-click | time to first content frame (ms) | 352.350 (355.100, 349.600) | 359.550 (364.300, 354.800) | +7.200 | 9.500 | no |
| project-click | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-click | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | cost (ms) | 334.882 (337.621, 332.143) | 337.576 (341.377, 333.774) | +2.694 | 7.603 | no |

After runs: `T007b-startup-<path>-clean-r{1,2}.json`.

**D-P1:** the check uses `pnpm bundle:manifest --out-dir apps/web/out --write …`; the T001 plan defect did not recur.

**D-P2:** `fps:engine --scenario startup` exited 6 on every dropped-frame verdict, as expected before AC2 is met. The check records `fps-engine exit 6 (verdict recorded)` and reads the JSON.

**D-P3 verdict:** home-move improves by 25.350 ms, project-move by 3.550 ms (both beyond the larger pair range), and project-click's +7.200 ms is inside its 9.500 ms larger range. No 300 ms retry regression returned.

## 2. A/B — fps-engine startup

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | dropped frames | 1.5 (1, 2) | 1.0 (1, 1) | -0.5 | 1.000 | no |
| home-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-move | dropped frames | 5.0 (4, 6) | 5.5 (5, 6) | +0.5 | 2.000 | no |
| project-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-click | dropped frames | 5.5 (5, 6) | 5.0 (6, 4) | -0.5 | 2.000 | no |
| project-click | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |

After runs: `T007b-fps-startup-<path>-r{1,2}.json`.

### Per-run dropped-frame timeline

All times are milliseconds after engagement. `tasksOver16ms` is quoted as `start+dur`.

| Run | droppedFrameTimes | tasksOver16ms |
|---|---|---|
| home-move r1 | 246.281 | 6.960+26.764; 172.278+25.855; 198.145+29.804; 239.329+28.075 |
| home-move r2 | 254.328 | 7.796+26.460; 178.311+27.090; 205.417+27.798; 244.258+28.970 |
| project-move r1 | 168.513, 185.179, 251.843, 285.175, 301.841 | 7.238+26.303; 41.840+32.052; 95.841+19.571; 180.560+16.780; 209.297+24.709; 234.013+30.760; 277.029+33.434 |
| project-move r2 | 180.671, 197.337, 214.003, 230.669, 247.335, 297.333 | 7.117+26.215; 41.869+32.069; 97.258+19.477; 181.792+17.366; 209.095+24.233; 233.335+31.416; 277.881+31.811 |
| project-click r1 | 226.923, 243.589, 260.255, 276.921, 326.919, 343.585 | 15.217+23.785; 48.428+26.635; 82.544+33.158; 138.100+19.551; 223.362+17.486; 250.749+23.258; 274.842+30.535; 318.180+32.446 |
| project-click r2 | 210.985, 227.651, 294.315, 327.647 | 15.330+24.144; 48.452+26.040; 82.427+33.405; 136.537+20.740; 221.818+16.992; 250.328+23.371; 273.706+30.297; 316.661+32.195 |

## 3. Keep decision

The tasks.md keep rule is: Δ (max long task, dropped frames, blocking ms or cost) > the larger run spread of the two states. No metric improves beyond its larger run spread. The only qualifying change is **project-move startup cost**, 322.303 → 327.000 ms (Δ +4.696 ms) against a larger raw range of 3.949 ms. Long tasks and blocking remain 0; dropped frames change by less than their pair spreads.

**Decision: no measurable win; retain both commits as instructed and report for the orchestrator's revert decision.** The attribution finding explains the result: only `setPhase` feeds the startup post-frame commit, and the remaining dropped-frame clusters still track 23–33 ms tasks.

## 4. Visual, draws, hero and bytes

Parity against `/tmp/s116-checks/baseline-shots` (the T004 baseline): **0 px on all 8 shots**, `parity: PASS (8 shots, 0 px)`.

Site probe: project draws **2 calls on 32/32** rendered frames; hero draws **2 calls on 40/40**; hero probe **7/7 pass**. The hero poster is the first paint, the canvas is revealed only after interaction, and the project poster keeps its static Explore control.

| Scope | Before raw | After raw | Raw Δ | Before gzip | After gzip | Gzip Δ |
|---|---:|---:|---:|---:|---:|---:|
| home initial | 583,343 | 583,343 | 0 | 180,606 | 180,605 | -1 |
| project initial | 581,795 | 581,795 | 0 | 180,044 | 180,047 | +3 |
| total emitted JS | 1,581,558 | 1,582,378 | +820 | 459,097 | 459,424 | +327 |
| non-initial 3D JS | 995,971 | 996,791 | +820 | 277,414 | 277,739 | +325 |

Against T006's recorded after-state, L5 adds 54 raw bytes and 16 gzip bytes in total; the lazy 3D scope accounts for all of it. Growth is recorded for the T009 bytes gate.

## 5. AC4 sequence vs T004 §5

One attributed startup run per path (`--attribute --runs 1`).

| Path | firstInstancedDraw t / raf | ready t / raf | Same rAF | liveStates | Draw before ready |
|---|---|---|---|---|---|
| home-move | 2626.200 / 12 | 2627.700 / 12 | yes | idle → loading → revealed | no |
| project-move | 2564.900 / 15 | 2565.500 / 15 | yes | loading → revealed | no |
| project-click | 2606.800 / 16 | 2607.700 / 16 | yes | loading → revealed | no |

This matches T004 §5: `ready.raf === firstInstancedDraw.raf` on every path, no instanced draw before ready, and the same live-state order on both route types. The check printed `AC4-SEQUENCE-OK`.

## 6. Check output

Sanitized from `/tmp/s116-checks/t007b.txt` (worktree path replaced with `.`):

```text
RUN  v5.0.5 ./packages/xploder

 ✓ test/staged-mount.test.tsx > staged renderer > constructs the renderer with the R3F defaults and today flags
 ✓ test/staged-mount.test.tsx > staged renderer > waits for the idle callback before constructing the renderer
 ✓ test/staged-mount.test.tsx > staged renderer > stays pending for one more task after construction
 ✓ test/staged-mount.test.tsx > staged renderer > falls back to message tasks when requestIdleCallback is unavailable
 ✓ test/staged-mount.test.tsx > staged renderer > a renderer rejection reaches the CanvasBoundary fallback
 ✓ test/staged-mount.test.tsx > staged renderer > bumps after the factory promise resolves
 ✓ test/staged-mount.test.tsx > staged renderer > does not bump after unmount
 ✓ test/staged-mount.test.tsx > staged renderer > TeardownViewer passes the staged renderer factory to Canvas
 ✓ test/staged-mount.test.tsx > staged renderer > TeardownViewer schedules frame-driven state updates through a transition
 ✓ test/frozen-surface.test.ts > frozen S2/S4 surface > matches every hash recorded from the base commit
 ✓ test/frozen-surface.test.ts > frozen S2/S4 surface > the hash helper detects a one-byte change
 ✓ test/frozen-surface.test.ts > frozen S5 surface > matches every hash recorded from the base commit
 ✓ test/frozen-surface.test.ts > frozen S6 surface > matches every hash recorded from the base commit
 ✓ test/frozen-surface.test.ts > frozen S7 surface > matches every hash recorded from the base commit
 ✓ test/frozen-surface.test.ts > frozen S8 surface > matches every hash recorded from the base commit

 Test Files  2 passed (2)
      Tests  15 passed (15)
fps-engine exit 6 (verdict recorded)
fps-engine exit 6 (verdict recorded)
fps-engine exit 6 (verdict recorded)
fps-engine exit 6 (verdict recorded)
fps-engine exit 6 (verdict recorded)
fps-engine exit 6 (verdict recorded)
AC4 home-move: draw.raf=12 ready.raf=12; liveStates=idle,loading,revealed
AC4 project-move: draw.raf=15 ready.raf=15; liveStates=loading,revealed
AC4 project-click: draw.raf=16 ready.raf=16; liveStates=loading,revealed
AC4-SEQUENCE-OK
home-mobile-light: 0 px
home-mobile-dark: 0 px
home-desktop-light: 0 px
home-desktop-dark: 0 px
project-mobile-light: 0 px
project-mobile-dark: 0 px
project-desktop-light: 0 px
project-desktop-dark: 0 px
parity: PASS (8 shots, 0 px)
draws project: mode=2 rendered=32 total=32 PASS
draws hero: mode=2 rendered=40 total=40 PASS
draws: PASS (2 checks)
hero: PASS (7 checks)
site-probe: PASS
Scope              Before raw   After raw   Raw delta Before gzip  After gzip  Gzip delta
home initial           583343      583343           0      180606      180605          -1
project initial        581795      581795           0      180044      180047           3
total                 1581558     1582378         820      459097      459424         327
non-initial 3D         995971      996791         820      277414      277739         325
RESULT: FAIL (at least one scope grew in raw or gzip bytes)
BYTES-GREW-RECORDED
FROZEN-OK
BRIEF-HISTORY-OK
XPLODER-SRC-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
REBASELINE-FIRST-OK
DEV-ROUTES-OK
S8-TOOLS-OK
CI-JOBS-OK
VERSIONS-OK
GITLEAKS-OK
T007b-OK
```

Final command tail:

```text
tools/perf test:  Test Files  26 passed (26)
tools/perf test:       Tests  191 passed (191)
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  626 passed (626)
apps/web test:  Test Files  32 passed | 1 skipped (33)
apps/web test:       Tests  182 passed | 2 skipped (184)
T007b-OK
```

## 7. Remaining blockers

### Tasks above 50 ms

None: every startup FPS run reports `maxLongTaskMs: 0` and an empty `longTasks` array.

### Every dropped frame and its task

`inside` means the frame time is within a task listed in `tasksOver16ms`; `no >16.7 ms task` means the JSON records no qualifying task containing that frame, so the nearest preceding/following task is named.

| Run | Dropped (ms) | Task it falls in (start+dur) |
|---|---:|---|
| home-move r1 | 246.281 | inside 239.329+28.075 |
| home-move r2 | 254.328 | inside 244.258+28.970 |
| project-move r1 | 168.513 | no >16.7 ms task; follows 95.841+19.571 by 53.101 ms; next starts 180.560 |
| project-move r1 | 185.179 | inside 180.560+16.780 |
| project-move r1 | 251.843 | inside 234.013+30.760 |
| project-move r1 | 285.175 | inside 277.029+33.434 |
| project-move r1 | 301.841 | inside 277.029+33.434 |
| project-move r2 | 180.671 | no >16.7 ms task; follows 97.258+19.477 by 63.936 ms; next starts 181.792 |
| project-move r2 | 197.337 | inside 181.792+17.366 |
| project-move r2 | 214.003 | inside 209.095+24.233 |
| project-move r2 | 230.669 | inside 209.095+24.233 |
| project-move r2 | 247.335 | inside 233.335+31.416 |
| project-move r2 | 297.333 | inside 277.881+31.811 |
| project-click r1 | 226.923 | inside 223.362+17.486 |
| project-click r1 | 243.589 | no >16.7 ms task; follows 223.362+17.486 by 2.741 ms; next starts 250.749 |
| project-click r1 | 260.255 | inside 250.749+23.258 |
| project-click r1 | 276.921 | inside 274.842+30.535 |
| project-click r1 | 326.919 | inside 318.180+32.446 |
| project-click r1 | 343.585 | inside 318.180+32.446 |
| project-click r2 | 210.985 | no >16.7 ms task; follows 136.537+20.740 by 53.708 ms; next starts 221.818 |
| project-click r2 | 227.651 | inside 221.818+16.992 |
| project-click r2 | 294.315 | inside 273.706+30.297 |
| project-click r2 | 327.647 | inside 316.661+32.195 |

### Every task over 16.7 ms after t0 + 150 ms

Start and duration are milliseconds after engagement. Tasks over the ≈27 ms design target are marked `yes`.

| Run | # | start | dur | end | >27 ms | Drop inside |
|---|---:|---:|---:|---:|---|---|
| home-move r1 | 1 | 172.278 | 25.855 | 198.133 | no | — |
| home-move r1 | 2 | 198.145 | 29.804 | 227.949 | yes | — |
| home-move r1 | 3 | 239.329 | 28.075 | 267.404 | yes | 246.281 |
| home-move r2 | 1 | 178.311 | 27.090 | 205.401 | yes | — |
| home-move r2 | 2 | 205.417 | 27.798 | 233.215 | yes | — |
| home-move r2 | 3 | 244.258 | 28.970 | 273.228 | yes | 254.328 |
| project-move r1 | 1 | 180.560 | 16.780 | 197.340 | no | 185.179 |
| project-move r1 | 2 | 209.297 | 24.709 | 234.006 | no | — |
| project-move r1 | 3 | 234.013 | 30.760 | 264.773 | yes | 251.843 |
| project-move r1 | 4 | 277.029 | 33.434 | 310.463 | yes | 285.175, 301.841 |
| project-move r2 | 1 | 181.792 | 17.366 | 199.158 | no | 197.337 |
| project-move r2 | 2 | 209.095 | 24.233 | 233.328 | no | 214.003, 230.669 |
| project-move r2 | 3 | 233.335 | 31.416 | 264.751 | yes | 247.335 |
| project-move r2 | 4 | 277.881 | 31.811 | 309.692 | yes | 297.333 |
| project-click r1 | 1 | 223.362 | 17.486 | 240.848 | no | 226.923 |
| project-click r1 | 2 | 250.749 | 23.258 | 274.007 | no | 260.255 |
| project-click r1 | 3 | 274.842 | 30.535 | 305.377 | yes | 276.921 |
| project-click r1 | 4 | 318.180 | 32.446 | 350.626 | yes | 326.919, 343.585 |
| project-click r2 | 1 | 221.818 | 16.992 | 238.810 | no | 227.651 |
| project-click r2 | 2 | 250.328 | 23.371 | 273.699 | no | — |
| project-click r2 | 3 | 273.706 | 30.297 | 304.003 | yes | 294.315 |
| project-click r2 | 4 | 316.661 | 32.195 | 348.856 | yes | 327.647 |

Thirteen of these 22 post-150 ms tasks exceed the ≈27 ms design target. Nineteen of the 23 dropped frames fall inside a listed task; the other four occur while no >16.7 ms task is recorded, one of them 2.741 ms after the preceding task.

### S8 re-seal

The manifest diff is in `T007b-log-reseal-s8.txt`. It is based at `3ea2588` and contains only `base`, the cumulative `note`, and the `src/react/TeardownViewer.tsx` hash.
