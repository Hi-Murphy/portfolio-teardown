# T012 - verdict

verdict: retire `/` on Murphy's word

CI run `42378433209`, attempt `1`, head `da757d2`, product A1 + E1a. The deciding slow-class
attempts are `s1` and `s3`.

## AC3

| Attempt | Eager perf | Eager TBT (ms) | Gated TBT (ms) | Eager - gated (ms) | Rule (a) | Rule (b) | Home | Project gated TBT (ms) |
|---|---:|---:|---:|---:|---|---|---|---:|
| `42378433209-1-s1` | 0.98 | 175.5 | 85.0 | 90.5 | Y | N | PASS | 90.5 |
| `42378433209-1-s3` | 0.98 | 157.75 | 83.5 | 74.25 | Y | N | PASS | 83.5 |

Both deciding attempts pass rule (a): performance is at least 0.95 and eager TBT is at most 200 ms.
They use distinct runners. AC3 is PASS 2/2.

AC2 is **NOT MET** and is not relaxed here: `s1` passes all named caps on its two-run median but
drops 3 frames against the bound of 2; `s3` has `renderer-constructor` at 16.1805 ms against the
15.805125 ms cap and also drops 3 frames. See `T012-log-ac2.md`.

AC5 is PASS: all 12 probe runs pass, and the project-gated TBT is 90.5 ms (`s1`) and 83.5 ms (`s3`)
inside `[78.85, 91.35]`. See `T012-log-ac5.md`.

## Before / after versus T004

T004 used the same Lighthouse protocol on a different slow-class attempt (`41774295096-1-s2`). These
are a before/after comparison, not paired observations; the same-attempt eager-minus-gated delta is
the tie-breaker.

| State | Attempt | Eager perf | Eager TBT (ms) | Gated TBT (ms) | Eager - gated (ms) | Project gated TBT (ms) |
|---|---|---:|---:|---:|---:|---:|
| T004 baseline | `41774295096-1-s2` | 0.96 | 219.25 | 90.0 | 129.25 | 88.5 |
| T012 final | `42378433209-1-s1` | 0.98 | 175.5 | 85.0 | 90.5 | 90.5 |
| T012 final | `42378433209-1-s3` | 0.98 | 157.75 | 83.5 | 74.25 | 83.5 |

Against the T004 attempt, eager TBT falls by 43.75 ms on `s1` (20.0%) and 61.5 ms on `s3` (28.0%).
The same-attempt eager-minus-gated delta falls by 38.75 ms and 55 ms respectively. Gated TBT also
moves by -5.0 ms (`s1`) and -6.5 ms (`s3`), which is host drift on an unchanged project path.

### AC2 before / after

The baseline row is T004's binding `s2` trace-only CPU 1 measurement. "r1/r2" are the two raw runs;
the bracket is their median.

| State | Constructor (ms) | Program compile (ms) | First content frame (ms) | `unnamedMaxMs` r1/r2 | Dropped r1/r2 |
|---|---:|---:|---:|---:|---:|
| T004 baseline `s2` | 15.021/15.084 (15.0525) | 33.798/32.204 (33.001) | 33.798/32.204 (33.001) | 39.157/36.931 | 3/4 |
| T012 `s1` | 15.161/15.372 (15.2665) | 35.419/33.690 (34.5545) | 35.419/33.690 (34.5545) | 42.563/46.919 | 3/3 |
| T012 `s3` | 14.847/17.514 (16.1805) | 31.646/30.202 (30.924) | 31.646/30.202 (30.924) | 43.963/40.381 | 3/3 |

The program/first-frame median is `33.001` ms at baseline, `34.5545` ms on `s1`, and `30.924` ms on
`s3`; these are host-dependent task durations, not a paired lever measurement. The dropped-frame
bound remains unmet in both deciding attempts, and the `s3` constructor median is outside its frozen
cap.

### AC5 before / after

| State | Attempt | Home ready r1/r2 (ms) | Home revealed r1/r2 (ms) | Project gated TBT (ms) |
|---|---|---:|---:|---:|
| T004 baseline | `41774295096-1-s2` | 554.7 / 520.4 | 586.3 / 548.0 | 88.5 |
| T012 final | `42378433209-1-s1` | 578.9 / 533.0 | revealed by deadline / revealed by deadline | 90.5 |
| T012 final | `42378433209-1-s3` | 546.1 / 514.8 | revealed by deadline / revealed by deadline | 83.5 |

All final probe runs are non-blank, use zero trusted events, and remain inside the 2.5 s home
deadline. Reduced motion keeps the canvas absent. The project route stays gated.

### Informational raw manifest totals

| State | Eager total JS (B) | Gated total JS (B) |
|---|---:|---:|
| T004 baseline | 1,581,749 | 1,582,126 |
| T012 final (`s1`/`s3`) | 1,582,932 | 1,582,950 |

These are raw manifest totals only. AC4's gzip budget is recorded in the T006 evidence and is not
recomputed in T012.

## Remaining per-task attribution

Source: the one profiled Lighthouse run per build on `/`. A profile has sampling and simulation
overhead, so TBT shares are indicative; binding TBT values remain those in the Lighthouse summaries.
Only tasks with simulated duration greater than 50 ms are shown. Task numbers follow the attribution
report and gaps mean the omitted task was at most 50 ms.

### `42378433209-1-s1`, eager

| Task | Simulated start (ms) | Simulated (ms) | Observed (ms) | TBT (ms) | Source | Top function |
|---:|---:|---:|---:|---:|---|---|
| 1 | 756.04 | 85 | 21.34 | 35 | Unattributable / native | `(program)` 95.7% |
| 3 | 892.04 | 74 | — | 24 | `/` | — |
| 4 | 997.04 | 64 | 16.09 | 14 | Unattributable | — |
| 5 | 1061.04 | 91 | — | 41 | `/` | — |
| 6 | 2195.08 | 169 | 42.31 | 119 | `10kujx8nsd3ck.js` / Turbopack | `I` 49.98% |
| 7 | 2378.08 | 52 | 12.99 | 2 | `1kgrt2f4mrm63.js` | — |
| 8 | 2472.08 | 63 | 15.80 | 13 | `1kgrt2f4mrm63.js` | — |
| 9 | 3425.13 | 59 | 10.53 | 9 | `1d5kkip1hlg-o.js` | — |
| 10 | 3484.13 | 58 | 7.90 | 8 | `1kgrt2f4mrm63.js` | — |
| 11 | 3542.13 | 63 | — | 13 | `1d5kkip1hlg-o.js` | — |
| 12 | 4011.25 | 125 | 31.33 | 75 | `3vnmkhfgdnq2d.js` / three | `(anonymous)` 22.19% |

### `42378433209-1-s1`, gated

| Task | Simulated start (ms) | Simulated (ms) | Observed (ms) | TBT (ms) | Source | Top function |
|---:|---:|---:|---:|---:|---|---|
| 1 | 753.61 | 68 | 17.04 | 18 | Unattributable | — |
| 2 | 821.61 | 164 | 41.00 | 114 | Unattributable / native | `(program)` 98.58% |
| 3 | 986.61 | 78 | — | 28 | `/` | — |
| 4 | 2339.22 | 161 | 40.20 | 111 | `10kujx8nsd3ck.js` / Turbopack | `I` 49.22% |

### `42378433209-1-s3`, eager

| Task | Simulated start (ms) | Simulated (ms) | Observed (ms) | TBT (ms) | Source | Top function |
|---:|---:|---:|---:|---:|---|---|
| 1 | 759.29 | 60 | 15.07 | 10 | Unattributable | — |
| 2 | 819.29 | 109 | 27.27 | 59 | Unattributable / native | `(program)` 97.55% |
| 3 | 928.29 | 72 | — | 22 | `/` | — |
| 4 | 1033.29 | 62 | 15.50 | 12 | Unattributable | — |
| 5 | 1095.29 | 83 | — | 33 | `/` | — |
| 6 | 2285.57 | 189 | 47.23 | 139 | `10kujx8nsd3ck.js` / Turbopack | `I` 56.47% |
| 7 | 2490.57 | 51 | 12.70 | 1 | `1kgrt2f4mrm63.js` | — |
| 8 | 2582.57 | 68 | 16.88 | 18 | `1kgrt2f4mrm63.js` / three | `R` 31.37% |
| 9 | 3539.86 | 62 | 9.93 | 12 | `1d5kkip1hlg-o.js` | — |
| 10 | 3601.86 | 83 | — | 33 | `1kgrt2f4mrm63.js` | — |
| 11 | 3684.86 | 77 | — | 27 | `1d5kkip1hlg-o.js` | — |
| 12 | 4100.14 | 129 | 32.29 | 79 | `3vnmkhfgdnq2d.js` / native | `(program)` 57.16% |

### `42378433209-1-s3`, gated

| Task | Simulated start (ms) | Simulated (ms) | Observed (ms) | TBT (ms) | Source | Top function |
|---:|---:|---:|---:|---:|---|---|
| 1 | 754.49 | 69 | 17.21 | 19 | Unattributable | — |
| 2 | 823.49 | 124 | 31.11 | 74 | Unattributable / native | `(program)` 97.93% |
| 3 | 991.49 | 71 | 10.86 | 21 | `/` | — |
| 4 | 2301.98 | 182 | 45.43 | 132 | `10kujx8nsd3ck.js` / Turbopack | `I` 48.76% |

The T004 eager-only `ViewScroll` mount task (160 ms simulated / 32.3 ms observed / 110 ms TBT) is
not present in either deciding profile. The remaining eager cost is dominated by the shared
Turbopack/module-instantiation task (169/189 ms simulated, 119/139 ms TBT) and the later three
module-evaluation task (125/129 ms simulated, 75/79 ms TBT). The same tasks are present in each gated
profile, which is why the binding same-attempt eager-minus-gated TBT is much smaller than the
individual task TBTs.

## Artifacts

- AC3: `T012-log-ac3.md`
- AC2: `T012-log-ac2.md` plus the `T012-fps-load-home-*` raw JSON files.
- AC5: `T012-log-ac5.md` plus the `T012-eager-probe-*` JSON and PNG files.
- Profiles: `T012-per-task-{eager,gated}-home-att42378433209-1-{s1,s3}.{json,md}` and the matching
  `T012-trace-*` gzip files.

## Check output

Transcribed from `/tmp/s118-checks/t012.txt` after the exact T012 Check block. The worktree prefix
is sanitised to `.`.

```text
VERDICT-RECORDED
ATTEMPTS-OK
FROZEN-OK
BRIEF-HISTORY-OK
G1-LIST-OK
XPLODER-SRC-OK
XPLODER-TEST-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
BASELINE-FIRST-OK
APP-TOUCH-OK
DEV-ROUTES-OK
CI-JOBS-OK
FLAG-DEFAULT-OK
VERSIONS-OK
BUDGETS-OK
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
packages/xploder test: 
tools/perf test: 
packages/xploder test:  RUN  v5.0.5 ./packages/xploder
tools/perf test:  RUN  v5.0.5 ./tools/perf
packages/xploder test: 
tools/perf test: 
packages/xploder test: (node:69558) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69559) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69575) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69583) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
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
packages/xploder test: (node:69599) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69603) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69610) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  245 passed (245)
tools/perf test:    Start at  23:17:23
tools/perf test:    Duration  2.89s (import 70%, tests 18%, transform 11%, worker 1%)
tools/perf test: 
tools/perf test:     Isolate  30 workers spawned · ~110ms startup each (spawn + environment, per file)
tools/perf test:              at least ~257ms faster with isolate: false — reuses workers across files instead of one per file
tools/perf test: 
tools/perf test: Done
packages/xploder test: (node:69631) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69634) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:69647) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: 
packages/xploder test:  Test Files  62 passed (62)
packages/xploder test:       Tests  625 passed (625)
packages/xploder test:    Start at  23:17:23
packages/xploder test:    Duration  33.29s (tests 82%, transform 10%, import 8%)
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:69779) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:69798) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  34 passed | 2 skipped (36)
apps/web test:       Tests  193 passed | 4 skipped (197)
apps/web test:    Start at  23:17:57
apps/web test:    Duration  1.72s (environment 29%, tests 28%, import 21%, transform 20%, worker 1%)
apps/web test: 
apps/web test:     Isolate  36 workers spawned · ~233ms startup each (spawn + environment, per file)
apps/web test:              at least ~700ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
T012-OK
```
