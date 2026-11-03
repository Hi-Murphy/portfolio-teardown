# T013 — Before/after and leave-one-out

Date: 2026-11-03

Final state: this worktree at `1a1e39b` (`task/s11.5-engine-startup-t013`), production static export. Baseline: T006
at `a08f0a5`, same host and protocol. Playwright Chromium `156.0.8078.4`, mobile profile, 4× CPU
throttling. Final benchmarkIndex range 4087–4226; LOO ranges were 4122–4181. Clean runs supply cost,
long tasks and blocking; attributed runs supply P2–P9 main-thread time. Median is the mean of the two
raw runs. The final trace files are run 1 of each path/kind.

The T013 final-artifact names are `T013-startup-*.json`, `T013-summary-*.json` and
`T013-trace-*-r1.json.gz`. Leave-one-out raws are `T013-loo-l3-startup-*.json` and
`T013-loo-l4-startup-*.json`. Dropped frames come from the committed `T006-fps-startup-*` and
`T010-fps-startup-*` files, as required by T013.

Spread note: the home clean pair has a 16.94 % cost spread and a 56.01 % blocking spread because
blocking is `maxLongTask − 50` (10.786–19.177 ms); its P0 spread also makes the summary flag true.
The project clean pairs are not flagged. Attributed summaries flag only sub-millisecond P6/P7/P8
cells: target cost spreads are 0.49–2.91 %. All raw values are retained below.

## 1. Before/after

### Main-thread cost, long tasks, blocking and dropped frames

| Path | Cost T006 (r1, r2) | Cost T013 (r1, r2) | Δ cost | Max long task T006 (r1, r2) | Max long task T013 (r1, r2) | Δ max long task | Blocking T006 (r1, r2) | Blocking T013 (r1, r2) | Δ blocking | Dropped T006 (r1, r2) | Dropped T013 | Δ dropped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| home / move | 316.746 (314.891, 318.602) | 311.931 (338.359, 285.503) | -4.815 (-1.52%) | 102.715 (102.083, 103.346) | 64.982 (69.177, 60.786) | -37.733 (-36.74%) | 62.981 (63.401, 62.562) | 14.982 (19.177, 10.786) | -48.000 (-76.21%) | 2.000 (2, 2) | 1 (1) | -1.0 (-50.00%) |
| project / move | 375.961 (377.085, 374.836) | 325.607 (330.174, 321.040) | -50.354 (-13.39%) | 133.978 (133.389, 134.566) | 57.453 (57.543, 57.362) | -76.525 (-57.12%) | 89.381 (88.070, 90.691) | 7.453 (7.543, 7.362) | -81.928 (-91.66%) | 6.500 (7, 6) | 6 (6) | -0.5 (-7.69%) |
| project / click | 392.280 (398.184, 386.376) | 339.608 (347.329, 331.887) | -52.672 (-13.43%) | 140.597 (143.015, 138.179) | 56.982 (58.058, 55.906) | -83.615 (-59.47%) | 96.806 (100.389, 93.224) | 6.982 (8.058, 5.906) | -89.825 (-92.79%) | 6.000 (6, 6) | 6 (6) | +0.0 (+0.00%) |

### Attributed per-phase main-thread time, P2–P9

### home / move

| Phase | T006 mainThreadMs median (r1, r2) | T013 mainThreadMs median (r1, r2) | Δ ms | Δ % |
|---|---:|---:|---:|---:|
| P2 | 1.389 (1.915, 0.862) | 2.897 (2.168, 3.626) | +1.508 | +108.64% |
| P3 | 102.250 (101.700, 102.800) | 58.500 (59.000, 58.000) | -43.750 | -42.79% |
| P4 | 44.105 (45.040, 43.171) | 39.971 (40.014, 39.928) | -4.135 | -9.37% |
| P5 | 66.924 (65.864, 67.983) | 65.463 (65.281, 65.644) | -1.461 | -2.18% |
| P6 | 0.050 (0.000, 0.100) | 0.000 (0.000, 0.000) | -0.050 | -100.00% |
| P7 | 3.000 (3.000, 3.000) | 2.850 (3.400, 2.300) | -0.150 | -5.00% |
| P8 | 2.776 (2.829, 2.724) | 2.491 (1.803, 3.179) | -0.285 | -10.28% |
| P9 | 2.623 (2.529, 2.717) | 2.791 (2.799, 2.783) | +0.168 | +6.40% |

### project / move

| Phase | T006 mainThreadMs median (r1, r2) | T013 mainThreadMs median (r1, r2) | Δ ms | Δ % |
|---|---:|---:|---:|---:|
| P2 | 0.602 (0.262, 0.942) | 3.548 (2.420, 4.676) | +2.946 | +489.37% |
| P3 | 134.650 (133.700, 135.600) | 82.300 (84.100, 80.500) | -52.350 | -38.88% |
| P4 | 58.251 (59.277, 57.226) | 50.562 (51.830, 49.294) | -7.689 | -13.20% |
| P5 | 65.078 (66.480, 63.676) | 66.010 (65.614, 66.407) | +0.932 | +1.43% |
| P6 | 0.050 (0.100, 0.000) | 0.050 (0.000, 0.100) | +0.000 | +0.00% |
| P7 | 2.700 (3.100, 2.300) | 2.550 (2.800, 2.300) | -0.150 | -5.56% |
| P8 | 5.407 (4.905, 5.909) | 5.623 (5.291, 5.956) | +0.217 | +4.00% |
| P9 | 2.356 (2.884, 1.829) | 2.404 (2.594, 2.214) | +0.048 | +2.02% |

### project / click

| Phase | T006 mainThreadMs median (r1, r2) | T013 mainThreadMs median (r1, r2) | Δ ms | Δ % |
|---|---:|---:|---:|---:|
| P2 | 0.332 (0.330, 0.334) | 3.057 (3.000, 3.114) | +2.725 | +820.78% |
| P3 | 137.700 (138.300, 137.100) | 82.200 (81.100, 83.300) | -55.500 | -40.31% |
| P4 | 51.404 (52.171, 50.637) | 49.676 (49.007, 50.346) | -1.727 | -3.36% |
| P5 | 67.213 (68.221, 66.204) | 66.974 (67.369, 66.578) | -0.239 | -0.36% |
| P6 | 0.000 (0.000, 0.000) | 0.050 (0.000, 0.100) | +0.050 | n/a |
| P7 | 2.300 (2.500, 2.100) | 3.200 (3.000, 3.400) | +0.900 | +39.13% |
| P8 | 6.269 (6.619, 5.919) | 5.016 (5.721, 4.311) | -1.253 | -19.99% |
| P9 | 2.211 (1.856, 2.566) | 2.886 (2.543, 3.229) | +0.675 | +30.53% |

## 2. AC3 verdict and shortfall ceiling

**AC3 does not meet 40 %.** The measured median cost drops are **1.52 % home / 13.39 % project move /
13.43 % project click**. Even the best individual home run (285.503 ms) is only 9.86 % below the
316.746 ms baseline median. The 40 % target and the remaining gap are:

| Path | T006 cost | What 40 % requires (60 % of T006) | T013 cost | Drop / target | Gap to 40 % | Drop if P3 became 0 ms | Gap after P3 = 0 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| home / move | 316.746 | 190.048 | 311.931 | -4.815 / −1.520% | 121.883 | 253.431 / −19.989% | 63.383 |
| project / move | 375.961 | 225.576 | 325.607 | -50.354 / −13.393% | 100.031 | 243.307 / −35.284% | 17.731 |
| project / click | 392.280 | 235.368 | 339.608 | -52.672 / −13.427% | 104.240 | 257.408 / −34.382% | 22.040 |

The measured slice-addressable work is P3 module evaluation. It fell from 102.250 / 134.650 / 137.700 ms
to 58.500 / 82.300 / 82.200 ms, a reduction of 43.750 / 52.350 / 55.500 ms. If that remaining P3 cost
could be removed completely — which cannot happen because the libraries must still evaluate — the
drop would reach only 19.99 / 35.28 / 34.38 %, leaving 63.383 / 17.731 / 22.040 ms still above the
40 % target. Thus the theoretical ceiling from all remaining P3 work is 35.28 % on the best project
path, below 40 %.

The residual mount/renderer/context block is P4+P5. P4 is not wholly frozen, but T010 attributes its
long task to the Canvas mount in S8; P5 is renderer/context initialization. P4+P5 is
105.433 / 116.572 / 116.650 ms, or 33.80 / 35.80 / 34.35 % of final cost (T006 baseline:
111.029 / 123.330 / 118.617 ms, 35.05 / 32.80 / 30.24 %). `T006-log-baseline-profile.md` records
that P4 is the frozen S7/S8 mount and P5 is WebGL context/renderer initialization. The T010 CPU
profile splits the busy stretch containing that mount task into 37–46 % three.js renderer construction, 22–31 % R3F root +
first scene render, and 17–27 % xploder scene components (S4–S8); the connected `getContext` span was
2.80 ms. T013's detached `hasWebgl()` probes were 4.2–6.4 ms. Applying those measured shares to
the final P5 interval gives:

| Path | Final P4+P5 main thread | Share of final cost | P4 mount | P5 renderer/context frame | P5: three renderer setup (37–46 %) | P5: R3F root + first render (22–31 %) | P5: xploder scene S4–S8 (17–27 %) |
|---|---:|---:|---:|---:|---:|---:|---:|
| home / move | 105.433 | 33.80% | 39.971 | 65.463 | 24.221–30.113 | 14.402–20.293 | 11.129–17.675 |
| project / move | 116.572 | 35.80% | 50.562 | 66.010 | 24.424–30.365 | 14.522–20.463 | 11.222–17.823 |
| project / click | 116.650 | 34.35% | 49.676 | 66.974 | 24.780–30.808 | 14.734–20.762 | 11.385–18.083 |

The T010 profile also states that the remaining 56–62 ms task is triggered by the `<Canvas>` mount in
frozen S8 and that no app-side or S4/S6 seam can split it. Therefore the measured reachable result is
the 13.39–13.43 % project drop and 1.52 % home drop already reported; the numerical ceiling from the
only remaining measured seam (P3) is 19.99–35.28 %, not 40 %. AC3 closes only through its
documented-shortfall clause.

## 3. Per-lever contribution

T007 (L2), T011 (L1) and T012 (L5) were skipped by the G1/G2 decisions, so they have no measured
contribution. L4 was measured incrementally as T006→T009 and in isolation by reverting `c9aea35`
from final. L3 was measured incrementally as T009→T010 and in isolation by reverting `cc1c89f` from
final. A negative cost delta means the lever lowers cost.

### Incremental deltas from committed JSONs

| Path | Lever | Cost before → after (median; spread) | Δ cost | Max long task before → after (median; spread) | Δ max long task |
|---|---|---:|---:|---:|---:|
| home / move | L4 | 316.746 [314.891–318.602] → 326.960 [297.246–356.674] | +10.214 (+3.22%) | 102.715 [102.083–103.346] → 80.394 [79.220–81.569] | -22.320 (-21.73%) |
| home / move | L3 | 326.960 [297.246–356.674] → 277.630 [277.054–278.207] | -49.329 (-15.09%) | 80.394 [79.220–81.569] → 61.353 [61.030–61.677] | -19.041 (-23.68%) |
| project / move | L4 | 375.961 [374.836–377.085] → 364.436 [359.284–369.588] | -11.524 (-3.07%) | 133.978 [133.389–134.566] → 112.871 [111.509–114.233] | -21.107 (-15.75%) |
| project / move | L3 | 364.436 [359.284–369.588] → 329.619 [325.122–334.115] | -34.817 (-9.55%) | 112.871 [111.509–114.233] → 57.684 [56.396–58.972] | -55.187 (-48.89%) |
| project / click | L4 | 392.280 [386.376–398.184] → 371.168 [369.043–373.294] | -21.111 (-5.38%) | 140.597 [138.179–143.015] → 112.151 [111.613–112.690] | -28.445 (-20.23%) |
| project / click | L3 | 371.168 [369.043–373.294] → 337.648 [336.752–338.544] | -33.520 (-9.03%) | 112.151 [111.613–112.690] → 56.631 [56.383–56.879] | -55.520 (-49.50%) |

### Leave-one-out deltas

| Path | Lever removed | Final cost (median; spread) | LOO cost (median; spread) | Δ cost (final − LOO) | Final max long task (median; spread) | LOO max long task (median; spread) | Δ max long task |
|---|---|---:|---:|---:|---:|---:|---:|
| home / move | L3 | 311.931 [285.503–338.359] | 326.337 [300.266–352.409] | -14.406 (-4.41%) | 64.982 [60.786–69.177] | 79.449 [79.429–79.469] | -14.467 (-18.21%) |
| home / move | L4 | 311.931 [285.503–338.359] | 305.822 [298.961–312.684] | +6.108 (+2.00%) | 64.982 [60.786–69.177] | 64.571 [61.001–68.141] | +0.411 (+0.64%) |
| project / move | L3 | 325.607 [321.040–330.174] | 354.536 [349.924–359.149] | -28.930 (-8.16%) | 57.453 [57.362–57.543] | 112.053 [110.435–113.672] | -54.601 (-48.73%) |
| project / move | L4 | 325.607 [321.040–330.174] | 347.252 [338.076–356.429] | -21.646 (-6.23%) | 57.453 [57.362–57.543] | 58.091 [55.267–60.915] | -0.639 (-1.10%) |
| project / click | L3 | 339.608 [331.887–347.329] | 370.455 [365.100–375.810] | -30.847 (-8.33%) | 56.982 [55.906–58.058] | 111.957 [111.586–112.329] | -54.975 (-49.10%) |
| project / click | L4 | 339.608 [331.887–347.329] | 357.339 [354.888–359.791] | -17.731 (-4.96%) | 56.982 [55.906–58.058] | 56.207 [55.961–56.454] | +0.775 (+1.38%) |

L4 LOO mean: cost -11.090 ms; max long task +0.182 ms. L3 LOO mean: cost -24.728 ms; max long task -41.348 ms.

## 4. AC5 dominant lever

**L3 split init is the dominant measured lever.** Its incremental cost contribution is
−49.329 / −34.817 / −33.520 ms (home / project move / project click), and its leave-one-out
contribution is **−14.406 / −28.930 / −30.847 ms**. For long tasks, the same comparison is
−19.041 / −55.187 / −55.520 ms incremental and **−14.467 / −54.601 / −54.975 ms** leave-one-out.
The three-path means are −39.222 ms cost and −43.249 ms max long task incrementally, and
−24.728 ms cost and −41.348 ms max long task in leave-one-out. L4's corresponding means are
−7.474 ms and −23.957 ms incrementally; in leave-one-out L4 changes mean cost by −11.090 ms but mean
max long task by +0.182 ms. L3 therefore wins on both cost and long-task evidence.

## 5. Artifact inventory

- Final clean and attributed raws: 12 `T013-startup-*.json` files.
- Final summaries: 6 `T013-summary-*.json` files.
- Final sanitized traces: 6 `T013-trace-*-r1.json.gz` files; decompressed home-path token hits: 0.
- Leave-one-out clean raws: 6 `T013-loo-l3-startup-*.json` and 6 `T013-loo-l4-startup-*.json` files.
- The two detached worktrees were removed with `git worktree remove --force`; neither held a commit.

## Check output

The check recomputes the table medians from the JSON files, then runs the guards, typecheck, lint and
test suites. The final line is `T013-OK`.

```text
T013-ARTIFACTS-OK
TABLE-MEDIANS-OK
FROZEN-OK
BRIEF-HISTORY-OK
XPLODER-SRC-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
DEV-ROUTES-OK
S8-TOOLS-OK
CI-JOBS-OK
VERSIONS-OK
GITLEAKS-OK
$ pnpm -r --if-present typecheck
tools/perf typecheck$ tsc --noEmit
packages/xploder typecheck$ tsc --noEmit
packages/xploder typecheck: Done
apps/web typecheck$ next typegen && tsc --noEmit
tools/perf typecheck: Done
apps/web typecheck: Generating route types...
apps/web typecheck: ✓ Types generated successfully
apps/web typecheck: Done
$ pnpm -r --if-present lint && pnpm format:check
tools/perf lint$ eslint .
packages/xploder lint$ eslint .
tools/perf lint: Done
packages/xploder lint: Done
apps/web lint$ eslint .
apps/web lint: Done
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
$ pnpm -r --if-present test
Scope: 3 of 4 workspace projects
tools/perf test$ vitest run
packages/xploder test$ vitest run
tools/perf test: 
tools/perf test:  RUN  v5.0.5 ./tools/perf
packages/xploder test: 
tools/perf test: 
packages/xploder test:  RUN  v5.0.5 ./packages/xploder
packages/xploder test: 
packages/xploder test: (node:78637) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:78638) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:78640) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:78648) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: theme  role                   paper   surface
packages/xploder test: light  paper                    1.00     1.06
packages/xploder test: light  surface                  1.06     1.00
packages/xploder test: light  grid                     1.19     1.26
packages/xploder test: light  line                     7.58     8.06
packages/xploder test: light  lineMuted                3.23     3.43
packages/xploder test: light  ink                     13.71    14.58
packages/xploder test: light  label                    7.33     7.79
packages/xploder test: light  accent                   5.27     5.60
packages/xploder test: light  steel                    5.23     5.56
packages/xploder test: light  tech-language            5.74     6.10
packages/xploder test: light  tech-platform            6.10     6.48
packages/xploder test: light  tech-framework           6.30     6.70
packages/xploder test: light  tech-library             4.93     5.24
packages/xploder test: light  tech-storage             5.18     5.51
packages/xploder test: light  tech-network             5.27     5.60
packages/xploder test: light  tech-tooling             5.45     5.79
packages/xploder test: light  tech-ai                  5.37     5.70
packages/xploder test: dark   paper                    1.00     1.13
packages/xploder test: dark   surface                  1.13     1.00
packages/xploder test: dark   grid                     1.37     1.21
packages/xploder test: dark   line                     9.36     8.25
packages/xploder test: dark   lineMuted                3.78     3.33
packages/xploder test: dark   ink                     14.81    13.06
packages/xploder test: dark   label                    8.62     7.60
packages/xploder test: dark   accent                   9.57     8.44
packages/xploder test: dark   steel                    6.74     5.94
packages/xploder test: dark   tech-language            7.93     6.99
packages/xploder test: dark   tech-platform            8.33     7.35
packages/xploder test: dark   tech-framework           8.17     7.21
packages/xploder test: dark   tech-library             9.64     8.50
packages/xploder test: dark   tech-storage             9.23     8.14
packages/xploder test: dark   tech-network            10.01     8.83
packages/xploder test: dark   tech-tooling            10.40     9.17
packages/xploder test: dark   tech-ai                  7.54     6.65
packages/xploder test: (node:78665) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:78662) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:78669) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  Test Files  24 passed (24)
tools/perf test:       Tests  180 passed (180)
tools/perf test:    Start at  11:23:43
tools/perf test:    Duration  2.05s (import 76%, transform 14%, tests 9%, worker 1%)
tools/perf test: 
tools/perf test: Done
packages/xploder test: (node:78681) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:78687) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: 
packages/xploder test:  Test Files  60 passed (60)
packages/xploder test:       Tests  617 passed (617)
packages/xploder test:    Start at  11:23:43
packages/xploder test:    Duration  7.29s (tests 63%, transform 20%, import 17%, worker 1%)
packages/xploder test: 
packages/xploder test:     Isolate  60 workers spawned · ~107ms startup each (spawn + environment, per file)
packages/xploder test:              at least ~604ms faster with isolate: false — reuses workers across files instead of one per file
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:78743) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:78751) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  31 passed | 1 skipped (32)
apps/web test:       Tests  178 passed | 2 skipped (180)
apps/web test:    Start at  11:23:51
apps/web test:    Duration  1.26s (transform 28%, import 26%, environment 24%, tests 20%, worker 1%)
apps/web test: 
apps/web test:     Isolate  32 workers spawned · ~139ms startup each (spawn + environment, per file)
apps/web test:              at least ~355ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
T013-OK
```

## Orchestrator addendum: home/move noise pair

The protocol pair for home/move final (338.359 / 285.503 ms, spread 16.9 %) is below the 20 % repeat
threshold, so it stays the reported pair. Because r1 disagrees with T010's home pair (278.207 /
277.054 ms on the same code), one extra pair was run right after T013 on the same build and host:
**288.3 / 280.2 ms, median 284.2 ms (−10.3 % vs T006's 316.746 ms)**
(`T013-summary-home-move-clean-extra.json`, `T013-extra-startup-home-move-clean-r{1,2}.json`). Both
pairs are published. The home AC3 figure is therefore −1.5 % (protocol pair) / −10.3 % (extra pair).
Neither changes the AC3 verdict (< 40 % on every path) or the AC5 attribution (project paths).
