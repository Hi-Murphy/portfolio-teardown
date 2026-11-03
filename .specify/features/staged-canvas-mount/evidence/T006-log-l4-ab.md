# T006 — L4 configuration in its own task

Date: 2026-11-03

Lever: `0ac2148` — `S11.6/T006: L4 — R3F configuration in its own task after renderer construction`

Baseline: T005's committed after-runs (`T005-startup-*-clean-r{1,2}.json`, `T005-fps-startup-*-r{1,2}.json`). They were not re-measured.

Protocol: local static export, Playwright Chromium 156.0.8078.4, mobile profile, 4× CPU, quiet host, measurements one at a time. `benchmarkIndex` was 4,201.5 and 4,246.5 for the home-move pair. Medians are the mean of two runs; the larger raw range is `max(raw spread before, raw spread after)`.

## 1. A/B — startup clean

`time to first content frame` is `firstFrame - t0` (D-P3).

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | time to first content frame (ms) | 291.550 (293.600, 289.500) | 320.050 (344.000, 296.100) | +28.500 | 47.900 | no |
| home-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| home-move | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | cost (ms) | 271.996 (271.753, 272.240) | 305.015 (337.188, 272.843) | +33.019 | 64.345 | no |
| project-move | time to first content frame (ms) | 332.500 (331.000, 334.000) | 332.150 (333.200, 331.100) | -0.350 | 3.000 | no |
| project-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-move | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | cost (ms) | 325.491 (326.066, 324.917) | 322.303 (323.063, 321.544) | -3.188 | 1.519 | yes |
| project-click | time to first content frame (ms) | 361.550 (359.700, 363.400) | 352.350 (355.100, 349.600) | -9.200 | 5.500 | yes |
| project-click | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-click | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | cost (ms) | 338.990 (341.497, 336.484) | 334.882 (337.621, 332.143) | -4.109 | 5.478 | no |

After runs: `T006-startup-<path>-clean-r{1,2}.json`.

**D-P3 verdict:** project-move is unchanged (-0.350 ms) and project-click improves (-9.200 ms). Home-move's median is +28.500 ms, but the after pair itself spans 47.900 ms (15.0% of its median), so the delta does not exceed the larger run spread. No 300 ms retry regression returned, and the factory-settle re-render still fires after R3F fulfils `root.ready`.

## 2. A/B — fps-engine startup

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | dropped frames | 2.0 (2, 2) | 1.5 (1, 2) | -0.5 | 1 | no |
| home-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-move | dropped frames | 6.0 (6, 6) | 5.0 (4, 6) | -1.0 | 2 | no |
| project-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |
| project-click | dropped frames | 5.5 (5, 6) | 5.5 (5, 6) | 0.0 | 1 | no |
| project-click | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0.000 | no |

After runs: `T006-fps-startup-<path>-r{1,2}.json`.

### Per-run dropped-frame timeline

All times are milliseconds after engagement. `tasksOver16ms` is quoted as `start+dur`.

| Run | droppedFrameTimes | tasksOver16ms |
|---|---|---|
| home-move r1 | 246.613 | 7.736+26.248; 171.400+26.399; 197.812+32.965; 232.024+31.718 |
| home-move r2 | 223.067, 239.733 | 7.472+26.545; 138.332+17.298; 166.083+27.389; 193.486+28.942; 223.811+30.507 |
| project-move r1 | 177.068, 260.398, 277.064, 293.730 | 7.416+25.736; 40.876+31.888; 210.305+26.538; 236.851+32.014; 269.944+32.945 |
| project-move r2 | 185.361, 202.027, 218.693, 235.359, 268.691, 285.357 | 7.401+27.027; 41.978+32.943; 76.023+16.952; 98.766+19.451; 208.630+25.876; 234.514+33.238; 269.290+32.820 |
| project-click r1 | 210.475, 227.141, 293.805, 310.471, 327.137 | 14.532+23.866; 47.407+25.679; 81.314+33.611; 135.310+20.799; 221.037+17.697; 251.010+24.912; 275.929+31.743; 309.158+31.819 |
| project-click r2 | 226.585, 243.251, 259.917, 276.583, 309.915, 326.581 | 15.551+24.059; 47.869+26.210; 82.509+33.292; 135.620+21.899; 249.659+26.061; 275.728+31.616; 308.629+32.239 |

## 3. Keep decision

The tasks.md keep rule is: Δ (max long task, dropped frames, blocking ms or cost) > the larger run spread of the two states. The only qualifying change is **project-move startup cost**, 325.491 → 322.303 ms (Δ −3.188 ms) against a larger raw range of 1.519 ms. Long tasks and blocking remain 0, and no dropped-frame change exceeds its pair spread. Project-click's first-content improvement (−9.200 ms) is favourable but is not one of the keep-rule metrics.

**Decision: keep L4.** Both commits stay; the re-seal is based at `0ac2148`.

## 4. Visual, draws, hero and bytes

Parity against the rebuilt T004 baseline: **0 px on all 8 shots**, `parity: PASS (8 shots, 0 px)`.

Site probe: project draws **2 calls on 32/32** rendered frames; hero draws **2 calls on 40/40**; hero probe **7/7 pass**. The hero poster is still the first paint, the canvas is revealed only after interaction, and the project poster keeps its static Explore control.

| Scope | Before raw | After raw | Raw Δ | Before gzip | After gzip | Gzip Δ |
|---|---:|---:|---:|---:|---:|---:|
| home initial | 583,343 | 583,343 | 0 | 180,606 | 180,605 | -1 |
| project initial | 581,795 | 581,795 | 0 | 180,044 | 180,045 | +1 |
| total emitted JS | 1,581,558 | 1,582,324 | +766 | 459,097 | 459,408 | +311 |
| non-initial 3D JS | 995,971 | 996,737 | +766 | 277,414 | 277,725 | +311 |

Against T005's recorded after-state, L4 adds 44 raw bytes and 4 gzip bytes in the two lazy scopes. Growth is recorded for the T009 gate.

## 5. AC4 sequence vs T004 §5

One attributed startup run per path (`--attribute --runs 1`).

| Path | firstInstancedDraw t / raf | ready t / raf | Same rAF | liveStates | Draw before ready |
|---|---|---|---|---|---|
| home-move | 2541.400 / 12 | 2542.400 / 12 | yes | idle → loading → revealed | no |
| project-move | 2563.100 / 14 | 2564.100 / 14 | yes | loading → revealed | no |
| project-click | 2706.400 / 16 | 2707.300 / 16 | yes | loading → revealed | no |

This matches T004 §5: `ready.raf === firstInstancedDraw.raf`, no instanced draw before ready, and the same live-state order on both route types.

## 6. Check output

Sanitized from `/tmp/s116-checks/t006.txt` (worktree path replaced with `.`):

```text

 RUN  v5.0.5 ./packages/xploder

(node:53198) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
Replace `const THREE = require("three")` with `import * as THREE from "three"`.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ✓ test/frozen-surface.test.ts > frozen S2/S4 surface > matches every hash recorded from the base commit 4ms
 ✓ test/frozen-surface.test.ts > frozen S2/S4 surface > the hash helper detects a one-byte change 0ms
 ✓ test/frozen-surface.test.ts > frozen S5 surface > matches every hash recorded from the base commit 1ms
 ✓ test/frozen-surface.test.ts > frozen S6 surface > matches every hash recorded from the base commit 1ms
 ✓ test/frozen-surface.test.ts > frozen S7 surface > matches every hash recorded from the base commit 1ms
 ✓ test/frozen-surface.test.ts > frozen S8 surface > matches every hash recorded from the base commit 1ms
stderr | test/staged-mount.test.tsx > staged renderer > a renderer rejection reaches the CanvasBoundary fallback
THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.

 ✓ test/staged-mount.test.tsx > staged renderer > constructs the renderer with the R3F defaults and today flags 10ms
 ✓ test/staged-mount.test.tsx > staged renderer > waits for the idle callback before constructing the renderer 0ms
 ✓ test/staged-mount.test.tsx > staged renderer > stays pending for one more task after construction 0ms
 ✓ test/staged-mount.test.tsx > staged renderer > falls back to message tasks when requestIdleCallback is unavailable 0ms
 ✓ test/staged-mount.test.tsx > staged renderer > a renderer rejection reaches the CanvasBoundary fallback 10ms
 ✓ test/staged-mount.test.tsx > staged renderer > bumps after the factory promise resolves 0ms
 ✓ test/staged-mount.test.tsx > staged renderer > does not bump after unmount 0ms
 ✓ test/staged-mount.test.tsx > staged renderer > TeardownViewer passes the staged renderer factory to Canvas 0ms

 Test Files  2 passed (2)
      Tests  14 passed (14)
   Start at  18:35:26
   Duration  174ms (transform 45%, import 40%, tests 13%, worker 1%)

$ node tools/perf/src/cli/parity.ts --serve apps/web/out --compare /tmp/s116-checks/baseline-shots
home-mobile-light: 0 px
home-mobile-dark: 0 px
home-desktop-light: 0 px
home-desktop-dark: 0 px
project-mobile-light: 0 px
project-mobile-dark: 0 px
project-desktop-light: 0 px
project-desktop-dark: 0 px
parity: PASS (8 shots, 0 px)
parity: baseline T004-log-parity-baseline.json
parity: comparison ./.evidence/parity-compare/parity-compare.json
PASS hero-one-canvas-max: expected 1 actual 1
PASS hero-project-poster: expected {"canvases":0,"poster":true,"staticExplore":true,"exploreControl":true} actual {"canvases":0,"posterWidth":1086,"staticExploreVisible":true,"controlVisible":true}
hero: PASS (7 checks)
site-probe: PASS
artifacts: ./.evidence/site-probe
Bundle scope delta: .specify/features/staged-canvas-mount/evidence/T004-log-bundle.json + /tmp/s116-checks/base-out -> /tmp/s116-checks/t006-manifest.json + apps/web/out
Scope              Before raw   After raw   Raw delta Before gzip  After gzip  Gzip delta
home initial           583343      583343           0      180606      180605          -1
project initial        581795      581795           0      180044      180045           1
total                 1581558     1582324         766      459097      459408         311
non-initial 3D         995971      996737         766      277414      277725         311
RESULT: FAIL (at least one scope grew in raw or gzip bytes)
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
```

Final command tail from `/tmp/s116-checks/t006-final.txt`:

```text
tools/perf test:  Test Files  26 passed (26)
tools/perf test:       Tests  191 passed (191)
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  625 passed (625)
apps/web test:  Test Files  32 passed | 1 skipped (33)
apps/web test:       Tests  182 passed | 2 skipped (184)
T006-OK
```

## 7. Remaining blockers

### Tasks above 50 ms

None: every startup FPS run reports `maxLongTaskMs: 0` and an empty `longTasks` array.

### Every dropped frame and its task

`inside` means the frame time is within a task listed in `tasksOver16ms`; `no >16.7 ms task` means the JSON records no qualifying task containing that frame, so the nearest preceding/following task is named.

| Run | Dropped (ms) | Task it falls in (start+dur) |
|---|---:|---|
| home-move r1 | 246.613 | inside #4 232.024+31.718 |
| home-move r2 | 223.067 | no >16.7 ms task; follows #4 193.486+28.942 by 0.639 ms; next #5 starts 223.811 |
| home-move r2 | 239.733 | inside #5 223.811+30.507 |
| project-move r1 | 177.068 | no >16.7 ms task; follows #2 40.876+31.888 by 104.304 ms; next #3 starts 210.305 |
| project-move r1 | 260.398 | inside #4 236.851+32.014 |
| project-move r1 | 277.064 | inside #5 269.944+32.945 |
| project-move r1 | 293.730 | inside #5 269.944+32.945 |
| project-move r2 | 185.361 | no >16.7 ms task; follows #4 98.766+19.451 by 67.144 ms; next #5 starts 208.630 |
| project-move r2 | 202.027 | no >16.7 ms task; follows #4 98.766+19.451 by 83.810 ms; next #5 starts 208.630 |
| project-move r2 | 218.693 | inside #5 208.630+25.876 |
| project-move r2 | 235.359 | inside #6 234.514+33.238 |
| project-move r2 | 268.691 | no >16.7 ms task; follows #6 234.514+33.238 by 0.939 ms; next #7 starts 269.290 |
| project-move r2 | 285.357 | inside #7 269.290+32.820 |
| project-click r1 | 210.475 | no >16.7 ms task; follows #4 135.310+20.799 by 54.366 ms; next #5 starts 221.037 |
| project-click r1 | 227.141 | inside #5 221.037+17.697 |
| project-click r1 | 293.805 | inside #7 275.929+31.743 |
| project-click r1 | 310.471 | inside #8 309.158+31.819 |
| project-click r1 | 327.137 | inside #8 309.158+31.819 |
| project-click r2 | 226.585 | no >16.7 ms task; follows #4 135.620+21.899 by 69.066 ms; next #5 starts 249.659 |
| project-click r2 | 243.251 | no >16.7 ms task; follows #4 135.620+21.899 by 85.732 ms; next #5 starts 249.659 |
| project-click r2 | 259.917 | inside #5 249.659+26.061 |
| project-click r2 | 276.583 | inside #6 275.728+31.616 |
| project-click r2 | 309.915 | inside #7 308.629+32.239 |
| project-click r2 | 326.581 | inside #7 308.629+32.239 |

### Every task over 16.7 ms after t0 + 150 ms

Start and duration are milliseconds after engagement. Tasks over the ≈27 ms design target are marked `yes`.

| Run | # | start | dur | end | >27 ms | Drop inside |
|---|---:|---:|---:|---:|---|---|
| home-move r1 | 2 | 171.400 | 26.399 | 197.799 | no | — |
| home-move r1 | 3 | 197.812 | 32.965 | 230.777 | yes | — |
| home-move r1 | 4 | 232.024 | 31.718 | 263.742 | yes | 246.613 |
| home-move r2 | 3 | 166.083 | 27.389 | 193.472 | yes | — |
| home-move r2 | 4 | 193.486 | 28.942 | 222.428 | yes | — (next drop follows by 0.639 ms) |
| home-move r2 | 5 | 223.811 | 30.507 | 254.318 | yes | 239.733 |
| project-move r1 | 3 | 210.305 | 26.538 | 236.843 | no | — |
| project-move r1 | 4 | 236.851 | 32.014 | 268.865 | yes | 260.398 |
| project-move r1 | 5 | 269.944 | 32.945 | 302.889 | yes | 277.064, 293.730 |
| project-move r2 | 5 | 208.630 | 25.876 | 234.506 | no | 218.693 |
| project-move r2 | 6 | 234.514 | 33.238 | 267.752 | yes | 235.359 |
| project-move r2 | 7 | 269.290 | 32.820 | 302.110 | yes | 285.357 |
| project-click r1 | 5 | 221.037 | 17.697 | 238.734 | no | 227.141 |
| project-click r1 | 6 | 251.010 | 24.912 | 275.922 | no | — |
| project-click r1 | 7 | 275.929 | 31.743 | 307.672 | yes | 293.805 |
| project-click r1 | 8 | 309.158 | 31.819 | 340.977 | yes | 310.471, 327.137 |
| project-click r2 | 5 | 249.659 | 26.061 | 275.720 | no | 259.917 |
| project-click r2 | 6 | 275.728 | 31.616 | 307.344 | yes | 276.583 |
| project-click r2 | 7 | 308.629 | 32.239 | 340.868 | yes | 309.915, 326.581 |

Fourteen of the 19 post-150 ms tasks exceed the ≈27 ms design target. Ten contain a dropped frame directly; home-move r2 #4 is followed by a drop 0.639 ms after its end; home-move r1 #3 and project-click r1 #6 have no associated drop in their run. The remaining drops listed above occur while no task over 16.7 ms is recorded at that instant.

### S8 re-seal

The manifest diff is in `T006-log-reseal-s8.txt`. It is based at `0ac2148` and contains only `base`, the cumulative `note`, and the `src/react/TeardownViewer.tsx` hash.
