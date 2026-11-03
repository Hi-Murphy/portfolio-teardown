# T009 — final AC2/AC3/AC4 and before/after table

Date: 2026-11-03  
Branch: `task/s11.6-staged-canvas-mount-t009`  
Final product state: T005 L1 + T006 L4 + T008b compaction. T007 and T008 are skipped; T007b was measured and reverted.  
T009 makes no source change. This commit is evidence only.

Protocol: local static export, Playwright Chromium 156.0.8078.4, mobile profile, 4× CPU, quiet host, one measurement at a time. Clean and FPS medians are the mean of two runs. Cells are median (raw r1, raw r2). Time to first content frame is `firstFrame - t0` from the clean runs. Blocking and cost are from the clean runs; dropped frames are from the FPS runs.

## Per-path table

### home-move

| Metric | T004 re-baseline | T005 L1 | T006 L4 | T008b compaction | T009 final |
|---|---:|---:|---:|---:|---:|
| time to first content frame (ms) | 289.250 (285.100, 293.400) | 291.550 (293.600, 289.500) | 320.050 (344.000, 296.100) | 294.350 (293.600, 295.100) | 294.800 (290.200, 299.400) |
| max long task (ms) | 58.785 (59.237, 58.332) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) |
| long tasks | 1 (1, 1) | 0 (0, 0) | 0 (0, 0) | 0 (0, 0) | 0 (0, 0) |
| dropped frames | 1 (1, 1) | 2 (2, 2) | 1.5 (1, 2) | 2 (2, 2) | 2 (2, 2) |
| blocking (ms) | 8.785 (9.237, 8.332) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) |
| main-thread cost (ms) | 268.433 (271.233, 265.633) | 271.996 (271.753, 272.240) | 305.015 (337.188, 272.843) | 275.390 (278.785, 271.995) | 272.489 (274.783, 270.194) |

Accepted clean pair: T004 repeat r3/r4; T005/T006 r1/r2; T008b repeat r1/r2; T009 repeat r1/r2. The first T009 home-move clean pair was flagged by P0 (46.22%) and is retained as `T009-startup-home-move-clean-r1/r2.json`; the accepted repeat is `T009-startup-home-move-clean-repeat-r1/r2.json`.

### project-move

| Metric | T004 re-baseline | T005 L1 | T006 L4 | T008b compaction | T009 final |
|---|---:|---:|---:|---:|---:|
| time to first content frame (ms) | 322.500 (324.900, 320.100) | 332.500 (331.000, 334.000) | 332.150 (333.200, 331.100) | 319.550 (307.900, 331.200) | 331.250 (334.400, 328.100) |
| max long task (ms) | 56.939 (56.639, 57.238) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) |
| long tasks | 1 (1, 1) | 0 (0, 0) | 0 (0, 0) | 0 (0, 0) | 0 (0, 0) |
| dropped frames | 6 (6, 6) | 6 (6, 6) | 5 (4, 6) | 4.5 (4, 5) | 5.5 (6, 5) |
| blocking (ms) | 6.939 (6.639, 7.238) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) |
| main-thread cost (ms) | 317.084 (322.927, 311.240) | 325.491 (326.066, 324.917) | 322.303 (323.063, 321.544) | 324.793 (326.762, 322.825) | 323.830 (323.135, 324.525) |

Accepted clean pair: T004/T005/T006 r1/r2; T008b repeat r1/r2; T009 r1/r2.

### project-click

| Metric | T004 re-baseline | T005 L1 | T006 L4 | T008b compaction | T009 final |
|---|---:|---:|---:|---:|---:|
| time to first content frame (ms) | 346.900 (352.600, 341.200) | 361.550 (359.700, 363.400) | 352.350 (355.100, 349.600) | 359.100 (364.400, 353.800) | 354.900 (352.600, 357.200) |
| max long task (ms) | 54.538 (53.610, 55.466) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) |
| long tasks | 1 (1, 1) | 0 (0, 0) | 0 (0, 0) | 0 (0, 0) | 0 (0, 0) |
| dropped frames | 6.5 (6, 7) | 5.5 (5, 6) | 5.5 (5, 6) | 6 (6, 6) | 5.5 (6, 5) |
| blocking (ms) | 4.538 (3.610, 5.466) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) |
| main-thread cost (ms) | 327.881 (335.000, 320.762) | 338.990 (341.497, 336.484) | 334.882 (337.621, 332.143) | 334.406 (337.417, 331.395) | 333.978 (346.434, 321.522) |

Accepted clean pair: T004/T005/T006/T008b/T009 r1/r2.

## Control rows

T007 (L2) and T008 (L3) are `⊘ skipped (evidence)`; neither is part of the final state. T007b (L5) was measured and reverted.[^t007b]

[^t007b]: T007b (L5) was measured and reverted; its code and re-seal are not in the final state. Retained run values home-move: first 294.700 (292.800, 296.600), max long task 0.000 (0.000, 0.000), long tasks 0 (0, 0), dropped 1 (1, 1), blocking 0.000 (0.000, 0.000), cost 284.384 (284.481, 284.286); project-move: first 328.600 (329.900, 327.300), max long task 0.000 (0.000, 0.000), long tasks 0 (0, 0), dropped 5.5 (5, 6), blocking 0.000 (0.000, 0.000), cost 327.000 (328.974, 325.025); project-click: first 359.550 (364.300, 354.800), max long task 0.000 (0.000, 0.000), long tasks 0 (0, 0), dropped 5 (6, 4), blocking 0.000 (0.000, 0.000), cost 337.576 (341.377, 333.774).

## Verdicts

- **AC2: FAIL (recorded).** All three paths keep dropped frames: home-move 2/2, project-move 6/5, project-click 6/5. Every run has `maxLongTaskMs: 0`, so the ≤50 ms half passes. See `T009-log-ac2.md`.
- **AC3: FAIL (recorded at the byte gate).** Parity is 0 px on all 8 shots and draw calls remain 2, but project initial/total/non-initial gzip and total/non-initial raw grew versus T004. See `T009-log-parity.txt`, `T009-log-drawcalls.txt` and `T009-log-bytes.txt`.
- **AC4: PASS.** Attributed runs keep `ready.raf === firstInstancedDraw.raf`, draw nothing before ready, and preserve the live-state order. The hero probe is 7/7 pass. See `T009-log-ready-reveal.md`.

## Artifacts

Raw startup reports, CPU-profile summaries, FPS reports, six run-1 traces, Lighthouse summaries and meta are the `T009-*` files in this directory. The T009 build manifest used by the byte gate is `T009-log-bundle.json`.

## Check output

The literal check has two execution defects: the relative evidence path is treated by Node as a package name, and `bundle-scopes.mjs` exits 1 on the recorded AC3 byte failure. The first is fixed by passing the evidence directory as an absolute path. The second is recorded with `BYTES-GREW-RECORDED` so the remaining guards and repository checks can run; the AC3 failure is not waived.

Parity uses the check's JSON alternative, `grep -q '"differingPixels": 0' T009-log-parity.txt`, against the captured comparison JSON.

Original assertions up to and including the byte gate:

```text
home-move 1 dropped 2 maxLT 0 FAIL
home-move 2 dropped 2 maxLT 0 FAIL
project-move 1 dropped 6 maxLT 0 FAIL
project-move 2 dropped 5 maxLT 0 FAIL
project-click 1 dropped 6 maxLT 0 FAIL
project-click 2 dropped 5 maxLT 0 FAIL
Bundle scope delta: .specify/features/staged-canvas-mount/evidence/T004-log-bundle.json + /tmp/s116-checks/base-out -> .specify/features/staged-canvas-mount/evidence/T009-log-bundle.json + apps/web/out
Scope              Before raw   After raw   Raw delta Before gzip  After gzip  Gzip delta
home initial           583343      583343           0      180606      180606           0
project initial        581795      581795           0      180044      180046           2
total                 1581558     1581847         289      459097      459233         136
non-initial 3D         995971      996260         289      277414      277548         134
RESULT: FAIL (at least one scope grew in raw or gzip bytes)
EXIT 1 (expected AC3 STOP)
```

Final run with the byte failure recorded:

```text
home-move 1 dropped 2 maxLT 0 FAIL
home-move 2 dropped 2 maxLT 0 FAIL
project-move 1 dropped 6 maxLT 0 FAIL
project-move 2 dropped 5 maxLT 0 FAIL
project-click 1 dropped 6 maxLT 0 FAIL
project-click 2 dropped 5 maxLT 0 FAIL
PARITY-0PX
Bundle scope delta: .specify/features/staged-canvas-mount/evidence/T004-log-bundle.json + /tmp/s116-checks/base-out -> .specify/features/staged-canvas-mount/evidence/T009-log-bundle.json + apps/web/out
Scope              Before raw   After raw   Raw delta Before gzip  After gzip  Gzip delta
home initial           583343      583343           0      180606      180606           0
project initial        581795      581795           0      180044      180046           2
total                 1581558     1581847         289      459097      459233         136
non-initial 3D         995971      996260         289      277414      277548         134
RESULT: FAIL (at least one scope grew in raw or gzip bytes)
BYTES-GREW-RECORDED (AC3 FAIL; STOP/ESCALATE, not waived)
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
T009-OK
```
