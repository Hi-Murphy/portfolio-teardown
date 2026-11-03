# T005 — L1 renderer in its own idle slice

Date: 2026-11-03  
Lever commit: `405bca1` — `S11.6/T005: L1 — WebGLRenderer construction in its own idle slice (async gl factory)`  
Baseline: `05e4e16`; timing baseline: T004's committed clean and FPS evidence.  
Protocol: local static export, Playwright Chromium 156.0.8078.4, mobile profile, 4× CPU, quiet host, measurements one at a time.

The renderer factory is module-level and returns `new WebGLRenderer({ ...defaults, antialias: true, alpha: true })` after yielding. In headless Chromium the project route's continuous `requestAnimationFrame` loop starves `requestIdleCallback` indefinitely, so `idleSlice()` prefers the available `scheduler.yield()` path and retains the no-timeout `requestIdleCallback` path for environments without it. No timer or numeric timeout was added.

## 1. A/B — startup clean

Medians are the mean of two runs. `home-move` uses T004's accepted repeat r3/r4; the other paths use T004 r1/r2. The larger raw range is `max(raw spread before, raw spread after)`.

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | max long task (ms) | 58.785 (59.237, 58.332) | 0.000 (0.000, 0.000) | -58.785 | 0.905 | yes |
| home-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| home-move | blocking (ms) | 8.785 (9.237, 8.332) | 0.000 (0.000, 0.000) | -8.785 | 0.905 | yes |
| home-move | cost (ms) | 268.433 (271.233, 265.633) | 273.755 (274.027, 273.483) | +5.322 | 5.600 | no |
| project-move | max long task (ms) | 56.939 (56.639, 57.238) | 0.000 (0.000, 0.000) | -56.939 | 0.599 | yes |
| project-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-move | blocking (ms) | 6.939 (6.639, 7.238) | 0.000 (0.000, 0.000) | -6.939 | 0.599 | yes |
| project-move | cost (ms) | 317.084 (322.927, 311.240) | 324.714 (325.591, 323.837) | +7.630 | 11.687 | no |
| project-click | max long task (ms) | 54.538 (53.610, 55.466) | 0.000 (0.000, 0.000) | -54.538 | 1.856 | yes |
| project-click | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-click | blocking (ms) | 4.538 (3.610, 5.466) | 0.000 (0.000, 0.000) | -4.538 | 1.856 | yes |
| project-click | cost (ms) | 327.881 (335.000, 320.762) | 333.551 (338.878, 328.223) | +5.669 | 14.238 | no |

After runs: `T005-startup-<path>-clean-r{1,2}.json`.

## 2. A/B — fps-engine startup

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | max long task (ms) | 57.724 (58.108, 57.341) | 0.000 (0.000, 0.000) | -57.724 | 0.767 | yes |
| home-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| home-move | dropped frames | 1.0 (1, 1) | 2.0 (2, 2) | +1.0 | 0.000 | yes (regression) |
| project-move | max long task (ms) | 56.922 (57.335, 56.510) | 0.000 (0.000, 0.000) | -56.922 | 0.825 | yes |
| project-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-move | dropped frames | 6.0 (6, 6) | 4.0 (4, 4) | -2.0 | 0.000 | yes |
| project-click | max long task (ms) | 54.188 (54.388, 53.987) | 0.000 (0.000, 0.000) | -54.188 | 0.401 | yes |
| project-click | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-click | dropped frames | 6.5 (6, 7) | 4.0 (4, 4) | -2.5 | 1.000 | yes |

After runs: `T005-fps-startup-<path>-r{1,2}.json`.

**Keep decision: KEEP.** On every path the max long task and blocking time fall from above 50 ms to zero, with deltas far beyond the run ranges (D5). Cost is within noise. `home-move` dropped frames move from 1 to 2 and are recorded as a regression; L4 must be judged against this state.

## 3. After-state long-task anatomy

`tasksOver16ms` is `start+dur→end` in ms. `droppedFrameTimes` is the exact array from each run.

| Path | Run | droppedFrameTimes | tasksOver16ms |
|---|---|---|---|
| home-move | r1 | [494.978, 511.644] | 7.003+27.365→34.368; 144.012+27.784→171.796; 442.775+25.694→468.469; 468.489+29.749→498.238; 499.678+29.948→529.626 |
| home-move | r2 | [497.819, 514.485] | 8.353+26.498→34.851; 146.664+26.260→172.924; 446.006+25.464→471.470; 471.491+29.881→501.372; 503.056+29.386→532.442 |
| project-move | r1 | [176.521, 526.507, 543.173, 559.839] | 7.427+26.424→33.851; 42.032+32.216→74.248; 74.423+17.305→91.728; 97.572+19.974→117.546; 181.745+26.580→208.325; 480.365+24.080→504.445; 505.029+30.829→535.858; 535.926+33.410→569.336 |
| project-move | r2 | [187.189, 520.509, 537.175, 553.841] | 7.274+26.772→34.046; 42.526+33.744→76.270; 98.389+20.654→119.043; 183.099+27.087→210.186; 483.234+24.129→507.363; 507.381+31.706→539.087; 541.065+32.790→573.855 |
| project-click | r1 | [227.829, 561.149, 577.815, 594.481] | 14.877+23.698→38.575; 46.493+26.843→73.336; 81.921+33.907→115.828; 136.410+20.200→156.610; 223.217+26.464→249.681; 521.653+24.486→546.139; 546.157+31.590→577.747; 579.066+32.892→611.958 |
| project-click | r2 | [228.309, 561.629, 578.295, 594.961] | 16.147+23.190→39.337; 48.597+26.829→75.426; 83.427+33.155→116.582; 137.536+20.911→158.447; 222.602+26.105→248.707; 522.022+24.040→546.062; 546.081+30.579→576.660; 578.147+33.397→611.544 |

No task reaches 50 ms. The remaining dropped-frame clusters follow 24–34 ms tasks, as predicted by the T004 chain rule.

## 4. Visual parity

All eight rest-state shots compared against `T004-log-parity-baseline.json` and `T004-screenshot-*.png` at **0 differing pixels**:

`home-mobile-light`, `home-mobile-dark`, `home-desktop-light`, `home-desktop-dark`, `project-mobile-light`, `project-mobile-dark`, `project-desktop-light`, `project-desktop-dark`.

`parity: PASS (8 shots, 0 px)`. No visual change.

## 5. Draws and hero probe

| Probe | Result |
|---|---|
| site draws, project | 2 draw calls on 32/32 rendered frames — pass |
| site draws, hero | 2 draw calls on 40/40 rendered frames — pass |
| hero probe | 7/7 checks pass |

Hero probe highlights: poster at first paint with live state `idle` and no canvas; revealed after interaction; idle state `exploded`; one canvas maximum; project poster has no canvas and keeps the static explore control.

## 6. Client JS bytes

Baseline: T004 manifest + `/tmp/s116-checks/base-out` built once from `05e4e16`. After: current export.

| Scope | Before raw | After raw | Raw Δ | Before gzip | After gzip | Gzip Δ |
|---|---:|---:|---:|---:|---:|---:|
| home initial | 583,343 | 583,343 | 0 | 180,606 | 180,606 | 0 |
| project initial | 581,795 | 581,795 | 0 | 180,044 | 180,044 | 0 |
| total emitted JS | 1,581,558 | 1,581,975 | +417 | 459,097 | 459,295 | +198 |
| non-initial 3D JS | 995,971 | 996,388 | +417 | 277,414 | 277,612 | +198 |

Growth is recorded for T009; it is not fatal at this lever. Raw growth is 0.026%; gzip growth is 0.043%.

## 7. Check output

Sanitized from `/tmp/s116-checks/t005.txt` (worktree path replaced with `.`):

```text
RUN  v5.0.5 ./packages/xploder

✓ test/staged-mount.test.tsx > staged renderer > constructs the renderer with the R3F defaults and today flags
✓ test/staged-mount.test.tsx > staged renderer > waits for the idle callback before constructing the renderer
✓ test/staged-mount.test.tsx > staged renderer > falls back to a message task when requestIdleCallback is unavailable
✓ test/staged-mount.test.tsx > staged renderer > a renderer rejection reaches the CanvasBoundary fallback
✓ test/staged-mount.test.tsx > staged renderer > TeardownViewer passes the staged renderer factory to Canvas
✓ test/frozen-surface.test.ts > frozen S2/S4 surface > matches every hash recorded from the base commit
✓ test/frozen-surface.test.ts > frozen S8 surface > matches every hash recorded from the base commit
Test Files  2 passed (2)
Tests       11 passed (11)

home-mobile-light: 0 px
home-mobile-dark: 0 px
home-desktop-light: 0 px
home-desktop-dark: 0 px
project-mobile-light: 0 px
project-mobile-dark: 0 px
project-desktop-light: 0 px
project-desktop-dark: 0 px
parity: PASS (8 shots, 0 px)
PASS hero-one-canvas-max: expected 1 actual 1
PASS hero-project-poster: expected {"canvases":0,"poster":true,"staticExplore":true,"exploreControl":true} actual {"canvases":0,"posterWidth":1086,"staticExploreVisible":true,"controlVisible":true}
hero: PASS (7 checks)
site-probe: PASS
home initial           583343      583343           0      180606      180606           0
project initial        581795      581795           0      180044      180044           0
total                 1581558     1581975         417      459097      459295         198
non-initial 3D         995971      996388         417      277414      277612         198
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
```

Final command tail:

```text
apps/web test:  Test Files  32 passed | 1 skipped (33)
apps/web test:       Tests  182 passed | 2 skipped (184)
apps/web test: Done
T005-OK
```

## 8. S8 re-seal

The manifest diff is in `T005-log-reseal-s8.txt`. It contains only `base`, `note`, and the `src/react/TeardownViewer.tsx` hash.
