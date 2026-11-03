# T005 — L1 renderer in its own idle slice

Date: 2026-11-03

First lever: `405bca1` — `S11.6/T005: L1 — WebGLRenderer construction in its own idle slice (async gl factory)`

Review fix: `1a99569` — `S11.6/T005: L1 fix — default-lane re-render when the staged renderer settles (avoid the 300 ms Suspense retry throttle)`

Baseline: `05e4e16`; timing baseline: T004's committed clean and FPS evidence.

Protocol: local static export, Playwright Chromium 156.0.8078.4, mobile profile, 4× CPU, quiet host, measurements one at a time.

The renderer factory is module-level and returns `new WebGLRenderer({ ...defaults, antialias: true, alpha: true })` after yielding. In headless Chromium the project route's continuous `requestAnimationFrame` loop starves `requestIdleCallback` indefinitely, so `idleSlice()` prefers the available `scheduler.yield()` path and retains the no-timeout `requestIdleCallback` path for environments without it. No timer or numeric timeout was added.

## 1. First pass and D-P3 fix

The first pass (`405bca1`) removed the long task, but delayed first content by roughly 275–285 ms:

| Path | T004 first frame − t0 (ms) | First pass (ms) | Δ (ms) |
|---|---:|---:|---:|
| home-move | 285 | 561 | +276 |
| project-move | 325 | 599 | +274 |
| project-click | 353 | 636 | +283 |

The async `gl` factory makes R3F suspend a null `useGate` subtree. When the factory settles, React retries that subtree on a retry lane, and React 19.3 throttles retry commits to 300 ms after the most recent fallback commit (`globalMostRecentFallbackTime + 300`). The review fix creates one factory per viewer through `useState`. After the renderer settles and R3F fulfills `root.ready`, the factory bumps a default-lane state counter; the resulting render re-runs Canvas's layout effect and calls `root.render`. The bump is owned by the factory's mounted flag, so an unmounted viewer never schedules it.

## 2. A/B — startup clean

Medians are the mean of two runs. `home-move` uses T004's accepted repeat r3/r4; the other paths use T004 r1/r2. The larger raw range is `max(raw spread before, raw spread after)`.

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | time to first content frame (ms) | 289.250 (285.100, 293.400) | 291.550 (293.600, 289.500) | +2.300 | 8.300 | no |
| home-move | max long task (ms) | 58.785 (59.237, 58.332) | 0.000 (0.000, 0.000) | -58.785 | 0.905 | yes |
| home-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| home-move | blocking (ms) | 8.785 (9.237, 8.332) | 0.000 (0.000, 0.000) | -8.785 | 0.905 | yes |
| home-move | cost (ms) | 268.433 (271.233, 265.633) | 271.996 (271.753, 272.240) | +3.563 | 5.600 | no |
| project-move | time to first content frame (ms) | 322.500 (324.900, 320.100) | 332.500 (331.000, 334.000) | +10.000 | 4.800 | yes |
| project-move | max long task (ms) | 56.939 (56.639, 57.238) | 0.000 (0.000, 0.000) | -56.939 | 0.599 | yes |
| project-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-move | blocking (ms) | 6.939 (6.639, 7.238) | 0.000 (0.000, 0.000) | -6.939 | 0.599 | yes |
| project-move | cost (ms) | 317.084 (322.927, 311.240) | 325.491 (326.066, 324.917) | +8.408 | 11.687 | no |
| project-click | time to first content frame (ms) | 346.900 (352.600, 341.200) | 361.550 (359.700, 363.400) | +14.650 | 11.400 | yes |
| project-click | max long task (ms) | 54.538 (53.610, 55.466) | 0.000 (0.000, 0.000) | -54.538 | 1.856 | yes |
| project-click | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-click | blocking (ms) | 4.538 (3.610, 5.466) | 0.000 (0.000, 0.000) | -4.538 | 1.856 | yes |
| project-click | cost (ms) | 327.881 (335.000, 320.762) | 338.990 (341.497, 336.484) | +11.110 | 14.238 | no |

After runs: `T005-startup-<path>-clean-r{1,2}.json`.

**First-content verdict:** home-move is within T004's run spread (+2.300 vs 8.300). Project-move and project-click recover the 300 ms throttle regression but remain 10.000 ms and 14.650 ms slower than their T004 medians, exceeding the strict spreads by 5.200 ms and 3.250 ms. The target is therefore met on home-move but not strictly met on the two project paths; the remaining delta is about 3.1% and 4.2% respectively.

## 3. A/B — fps-engine startup

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | max long task (ms) | 57.724 (58.108, 57.341) | 0.000 (0.000, 0.000) | -57.724 | 0.767 | yes |
| home-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| home-move | dropped frames | 1.0 (1.0, 1.0) | 2.0 (2.0, 2.0) | +1.0 | 0.000 | yes (regression) |
| project-move | max long task (ms) | 56.922 (57.335, 56.510) | 0.000 (0.000, 0.000) | -56.922 | 0.825 | yes |
| project-move | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-move | dropped frames | 6.0 (6.0, 6.0) | 6.0 (6.0, 6.0) | +0.0 | 0.000 | no |
| project-click | max long task (ms) | 54.188 (54.388, 53.987) | 0.000 (0.000, 0.000) | -54.188 | 0.401 | yes |
| project-click | long tasks | 1 (1, 1) | 0 (0, 0) | -1 | 0.000 | yes |
| project-click | dropped frames | 6.5 (6.0, 7.0) | 5.5 (5.0, 6.0) | -1.0 | 1.000 | no |

After runs: `T005-fps-startup-<path>-r{1,2}.json`.

**Keep decision: KEEP.** Every path removes the >50 ms long task and blocking time, well beyond the run ranges. The review fix restores first content to the T004 range instead of the +275–285 ms retry-lane regression. `home-move` retains the known 1 → 2 dropped-frame regression; project-move is unchanged and project-click improves by 1.0 dropped frame.

## 4. After-state long-task anatomy

`tasksOver16ms` is `start+dur→end` in ms. `droppedFrameTimes` is the exact array from each run. No task reaches 50 ms.

| Path | Run | droppedFrameTimes | tasksOver16ms |
|---|---|---|---|
| home-move | r1 | [227.232, 243.898] | 6.970+26.070→33.040; 142.200+27.241→169.441; 169.445+27.410→196.855; 197.153+28.322→225.475; 227.006+30.210→257.216 |
| home-move | r2 | [224.575, 241.241] | 7.533+26.665→34.198; 141.496+26.152→167.648; 168.203+25.931→194.134; 194.149+28.128→222.277; 224.408+29.729→254.137 |
| project-move | r1 | [183.687, 200.353, 217.019, 233.685, 267.017, 283.683] | 7.560+26.742→34.302; 42.536+32.352→74.888; 98.143+19.218→117.361; 182.329+26.796→209.125; 209.128+24.833→233.961; 233.969+31.661→265.630; 267.425+32.311→299.736 |
| project-move | r2 | [185.853, 202.519, 219.185, 235.851, 269.183, 285.849] | 7.703+26.842→34.545; 42.969+31.240→74.209; 75.000+17.579→92.579; 98.837+19.569→118.406; 182.059+26.731→208.790; 208.792+25.483→234.275; 234.283+31.785→266.068; 267.478+34.148→301.626 |
| project-click | r1 | [211.831, 228.497, 295.161, 311.827, 328.493] | 15.772+23.693→39.465; 47.639+25.739→73.378; 81.574+32.649→114.223; 135.880+20.750→156.630; 221.675+26.303→247.978; 249.935+24.980→274.915; 274.922+32.149→307.071; 308.401+33.682→342.083 |
| project-click | r2 | [227.929, 244.595, 261.261, 277.927, 311.259, 327.925] | 15.134+24.396→39.530; 48.113+26.560→74.673; 83.514+32.692→116.206; 137.700+21.004→158.704; 223.760+26.388→250.148; 250.150+25.534→275.684; 275.692+32.237→307.929; 309.633+33.132→342.765 |

The remaining dropped-frame clusters follow 24–34 ms tasks, consistent with the T004 chain rule.

## 5. Visual parity

All eight rest-state shots compared against `T004-log-parity-baseline.json` and `T004-screenshot-*.png` at **0 differing pixels**:

`home-mobile-light`, `home-mobile-dark`, `home-desktop-light`, `home-desktop-dark`, `project-mobile-light`, `project-mobile-dark`, `project-desktop-light`, `project-desktop-dark`.

`parity: PASS (8 shots, 0 px)`. No visual change.

## 6. Draws and hero probe

| Probe | Result |
|---|---|
| site draws, project | 2 draw calls on 32/32 rendered frames — pass |
| site draws, hero | 2 draw calls on 40/40 rendered frames — pass |
| hero probe | 7/7 checks pass |

Hero probe highlights: poster at first paint with live state `idle` and no canvas; revealed after interaction; idle state `exploded`; one canvas maximum; project poster has no canvas and keeps the static explore control.

## 7. Client JS bytes

Baseline: T004 manifest + `/tmp/s116-checks/base-out` built once from `05e4e16`. After: current export.

| Scope | Before raw | After raw | Raw Δ | Before gzip | After gzip | Gzip Δ |
|---|---:|---:|---:|---:|---:|---:|
| home initial | 583,343 | 583,343 | 0 | 180,606 | 180,606 | 0 |
| project initial | 581,795 | 581,795 | 0 | 180,044 | 180,046 | +2 |
| total emitted JS | 1,581,558 | 1,582,280 | +722 | 459,097 | 459,404 | +307 |
| non-initial 3D JS | 995,971 | 996,693 | +722 | 277,414 | 277,719 | +305 |

Growth is recorded for T009; it is not fatal at this lever. Raw growth is 0.046%; gzip growth is 0.067%.

## 8. Check output

Sanitized from `/tmp/s116-checks/t005.txt` (worktree path replaced with `.`):

```text
RUN  v5.0.5 ./packages/xploder

✓ test/frozen-surface.test.ts > frozen S2/S4 surface > matches every hash recorded from the base commit
✓ test/frozen-surface.test.ts > frozen S2/S4 surface > the hash helper detects a one-byte change
✓ test/frozen-surface.test.ts > frozen S5 surface > matches every hash recorded from the base commit
✓ test/frozen-surface.test.ts > frozen S6 surface > matches every hash recorded from the base commit
✓ test/frozen-surface.test.ts > frozen S7 surface > matches every hash recorded from the base commit
✓ test/frozen-surface.test.ts > frozen S8 surface > matches every hash recorded from the base commit
✓ test/staged-mount.test.tsx > staged renderer > constructs the renderer with the R3F defaults and today flags
✓ test/staged-mount.test.tsx > staged renderer > waits for the idle callback before constructing the renderer
✓ test/staged-mount.test.tsx > staged renderer > falls back to a message task when requestIdleCallback is unavailable
✓ test/staged-mount.test.tsx > staged renderer > a renderer rejection reaches the CanvasBoundary fallback
✓ test/staged-mount.test.tsx > staged renderer > bumps after the factory promise resolves
✓ test/staged-mount.test.tsx > staged renderer > does not bump after unmount
✓ test/staged-mount.test.tsx > staged renderer > TeardownViewer passes the staged renderer factory to Canvas
Test Files  2 passed (2)
Tests       13 passed (13)

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
project initial        581795      581795           0      180044      180046           2
total                 1581558     1582280         722      459097      459404         307
non-initial 3D         995971      996693         722      277414      277719         305
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

## 9. S8 re-seal

The manifest diff is in `T005-log-reseal-s8.txt`. It is based at the review-fix commit `1a99569` and contains only `base`, the cumulative `note`, and the `src/react/TeardownViewer.tsx` hash.
