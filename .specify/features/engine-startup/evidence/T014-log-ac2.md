# T014 — Final AC2 and AC4 verification

Build: `pnpm build` (Next.js 16.4.3, Node 24.19.0, pnpm 12.15.0).
Protocol: mobile profile, 4x CPU, first 5 s after engagement. AC2 requires both
`droppedFrames === 0` and `maxLongTaskMs <= 50`.

## AC2

### home / move

| Run | Dropped frames | Long tasks | Max long task | Verdict |
|---|---:|---:|---:|---|
| r1 | 3 | 1 | 70.631 ms | fail |
| r2 | 1 | 1 | 67.426 ms | fail |
| r3 (spread repeat) | 2 | 1 | 62.400 ms | fail |
| r4 (spread repeat) | 2 | 1 | 59.900 ms | fail |
| Median (r1/r2) | 2 | 1 | 69.029 ms | fail |
| Median (r3/r4) | 2 | 1 | 61.150 ms | fail |
| Median (all four) | 2.5 | 1 | 64.913 ms | fail |

The original pair's dropped-frame readings had a >20% spread; the pair was repeated and all
four runs are kept.

### project / move

| Run | Dropped frames | Long tasks | Max long task | Verdict |
|---|---:|---:|---:|---|
| r1 | 6 | 1 | 56.767 ms | fail |
| r2 | 6 | 1 | 56.021 ms | fail |
| Median | 6 | 1 | 56.394 ms | fail |

### project / click

| Run | Dropped frames | Long tasks | Max long task | Verdict |
|---|---:|---:|---:|---|
| r1 | 7 | 1 | 59.957 ms | fail |
| r2 | 6 | 1 | 57.850 ms | fail |
| Median | 6.5 | 1 | 58.904 ms | fail |

### Verdict

**AC2: FAIL on all three paths.** Every path has non-zero dropped frames and one long task
above 50 ms. The remaining blocking task is the synchronous `<Canvas>` mount in the frozen S8
TeardownViewer path: the attributed task is 56–58 ms and starts in P5, between connected
`getContext` and the first `createProgram`. The sampled profile attributes it mainly to three.js
renderer construction/setup, R3F root setup and the first scene render; no app-side or S4/S6 seam
can split it. See `evidence/T010-log-longtask-profile.txt`.

Raw artifacts:

- `evidence/T014-fps-startup-home-move-r1.json`
- `evidence/T014-fps-startup-home-move-r2.json`
- `evidence/T014-fps-startup-home-move-r3.json`
- `evidence/T014-fps-startup-home-move-r4.json`
- `evidence/T014-fps-startup-project-move-r1.json`
- `evidence/T014-fps-startup-project-move-r2.json`
- `evidence/T014-fps-startup-project-click-r1.json`
- `evidence/T014-fps-startup-project-click-r2.json`

## AC4

### Visual parity — PASS

`pnpm perf:parity --serve apps/web/out --compare .specify/features/engine-startup/evidence`
compared all 8 T006 shots and found 0 differing pixels in every shot. See
`evidence/T014-log-parity.txt` and `evidence/T014-screenshot-*.png`.

### Draw calls — PASS

`pnpm site:probe --serve apps/web/out --group draws`:

| Check | Expected | Observed |
|---|---:|---|
| draws-project | 2 | mode 2 for 32/32 rendered frames |
| draws-hero | 2 | mode 2 for 40/40 rendered frames |

`pnpm engine:probe --scope s4` also reported exactly 2 draw calls for fixtures a, b and c.
See `evidence/T014-log-drawcalls.txt`.

### CLS — PASS

Clean `perf:startup` runs (one per path) reported raw/filtered CLS of `0/0` on home/move,
project/move and project/click. All four gated Lighthouse summaries reported CLS 0 on every
one of their three internal runs.

### Client JS bytes — PASS

Raw and gzip totals are in `evidence/T014-log-bundle-diff.txt`.

| Scope | T006 raw | T014 raw | Delta |
|---|---:|---:|---:|
| home initial | 583,368 | 583,343 | -25 |
| project initial | 586,201 | 581,795 | -4,406 |
| total emitted JS | 1,771,865 | 1,581,558 | -190,307 |
| 3D lazy chunk | 1,035,388 | 545,967 | -489,421 |

Both initial scopes and total raw bytes are <= T006, so the bundle gate passes.

### Gated Lighthouse — PASS

| Route | Run | Performance | CLS | TBT | Summary |
|---|---|---:|---:|---:|---|
| home | r1 | 1.00 | 0,0,0 | 0.5 ms median | `evidence/T014-lighthouse-summary-gated-home-r1.json` |
| home | r2 | 1.00 | 0,0,0 | 0.5 ms median | `evidence/T014-lighthouse-summary-gated-home-r2.json` |
| project | r1 | 1.00 | 0,0,0 | 1.0 ms median | `evidence/T014-lighthouse-summary-gated-project-r1.json` |
| project | r2 | 1.00 | 0,0,0 | 1.0 ms median | `evidence/T014-lighthouse-summary-gated-project-r2.json` |

**AC4: PASS.**

## Final check output

```text
$ final evidence assertions
PASS evidence set: 25 artifacts; AC4 PASS; AC2 failure documented

$ bash .specify/features/engine-startup/guards.sh
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

$ pnpm typecheck && pnpm lint && pnpm test
$ pnpm -r --if-present typecheck
tools/perf typecheck$ tsc --noEmit
packages/xploder typecheck$ tsc --noEmit
tools/perf typecheck: Done
packages/xploder typecheck: Done
apps/web typecheck$ next typegen && tsc --noEmit
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
packages/xploder test: 
tools/perf test:  RUN  v5.0.5 ./tools/perf
packages/xploder test:  RUN  v5.0.5 ./packages/xploder
tools/perf test: 
packages/xploder test: 
packages/xploder test: (node:83140) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83139) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83143) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83150) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83163) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83166) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
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
tools/perf test: 
tools/perf test:  Test Files  24 passed (24)
tools/perf test:       Tests  180 passed (180)
tools/perf test:    Start at  11:33:35
tools/perf test:    Duration  1.99s (import 79%, transform 12%, tests 9%, worker 1%)
tools/perf test: 
tools/perf test: Done
packages/xploder test: (node:83170) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83182) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:83188) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: 
packages/xploder test:  Test Files  60 passed (60)
packages/xploder test:       Tests  617 passed (617)
packages/xploder test:    Start at  11:33:35
packages/xploder test:    Duration  7.33s (tests 62%, transform 22%, import 16%, worker 1%)
packages/xploder test: 
packages/xploder test:     Isolate  60 workers spawned · ~103ms startup each (spawn + environment, per file)
packages/xploder test:              at least ~584ms faster with isolate: false — reuses workers across files instead of one per file
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:83226) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:83234) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  31 passed | 1 skipped (32)
apps/web test:       Tests  179 passed | 1 skipped (180)
apps/web test:    Start at  11:33:43
apps/web test:    Duration  1.25s (import 27%, environment 26%, transform 24%, tests 21%, worker 2%)
apps/web test: 
apps/web test:     Isolate  32 workers spawned · ~144ms startup each (spawn + environment, per file)
apps/web test:              at least ~368ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
T014-OK
```

== Orchestrator review correction (single gzip method) ==
The gzip column above mixed methods (gzip CLI headers carry name/mtime) and the '3D lazy chunk' row compared one stage chunk with the former single chunk. Recomputed for both builds with one method: node zlib gzip level 9 (no name/mtime header), per file, summed; T006 rebuilt from a08f0a5 (raw totals reproduce T006-log-bundle-before.json exactly).

| Scope | T006 files | T006 raw | T006 gzip | Final files | Final raw | Final gzip | Raw delta | Gzip delta |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| home initial JS | 9 | 583,368 | 180,618 | 9 | 583,343 | 180,606 | −25 | −12 |
| project initial JS | 9 | 586,201 | 181,497 | 9 | 581,795 | 180,044 | −4,406 | −1,453 |
| total emitted JS | 17 | 1,771,865 | 501,942 | 22 | 1,581,558 | 459,097 | −190,307 | −42,845 |
| non-initial (3D) JS | 7 | 1,181,847 | 318,794 | 12 | 995,971 | 277,414 | −185,876 | −41,380 |

RESULT (corrected): PASS — every scope is <= the T006 baseline in raw AND gzip bytes.
