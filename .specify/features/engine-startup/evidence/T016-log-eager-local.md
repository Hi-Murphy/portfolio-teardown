# T016 — Local eager Lighthouse

Date: 2026-11-03

Builds measured:

- eager: `pnpm build:eager` (`NEXT_PUBLIC_EAGER_3D=1`)
- gated reference: `pnpm build` (default, flag off)

Both builds were served with `pnpm serve:out --port 4320`. Each invocation of
`pnpm perf:lighthouse <url>` performed three internal runs. `r1` and `r2` are separate
invocations, matching the task's two-run protocol. All eight invocations exited 0.

Protocol: Lighthouse 13.6.0, Chromium 156.0.0.0, mobile form factor with simulated
throttling, Node 24.19.0, pnpm 12.15.0.

Medians below are computed independently for each metric. An invocation median is the median
of its three internal runs; a two-invocation median is the mean of the two invocation medians.

## Results

| Build | Route | Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---|---|---|---:|---:|---:|---:|---:|
| eager | home | r1-1 | 1 | 9 | 904.6646 | 0 | 4169.5 |
| eager | home | r1-2 | 1 | 2 | 905.8378 | 0 | 4188.5 |
| eager | home | r1-3 | 1 | 1 | 903.2056 | 0 | 4195.5 |
| eager | home | r1 median | 1 | 2 | 904.6646 | 0 | 4188.5 |
| eager | home | r2-1 | 1 | 2 | 906.3628 | 0 | 4159 |
| eager | home | r2-2 | 1 | 2.5 | 905.3667 | 0 | 4097 |
| eager | home | r2-3 | 1 | 1.5 | 903.8307 | 0 | 4197.5 |
| eager | home | r2 median | 1 | 2 | 905.3667 | 0 | 4159 |
| eager | home | two-invocation median | 1 | 2 | 905.0157 | 0 | 4173.75 |
| eager | project | r1-1 | 1 | 3 | 905.679 | 0 | 4173 |
| eager | project | r1-2 | 1 | 1.5 | 904.8241 | 0 | 4178 |
| eager | project | r1-3 | 1 | 2.5 | 905.9731 | 0 | 4193.5 |
| eager | project | r1 median | 1 | 2.5 | 905.679 | 0 | 4178 |
| eager | project | r2-1 | 1 | 2 | 906.0339 | 0 | 4175.5 |
| eager | project | r2-2 | 1 | 3.5 | 903.8186 | 0 | 4183 |
| eager | project | r2-3 | 1 | 3.5 | 903.6347 | 0 | 4202 |
| eager | project | r2 median | 1 | 3.5 | 903.8186 | 0 | 4183 |
| eager | project | two-invocation median | 1 | 3 | 904.7488 | 0 | 4180.5 |
| gated | home | r1-1 | 1 | 0.5 | 904.5077 | 0 | 4199.5 |
| gated | home | r1-2 | 1 | 1 | 904.5358 | 0 | 4198.5 |
| gated | home | r1-3 | 1 | 1 | 903.3284 | 0 | 4170 |
| gated | home | r1 median | 1 | 1 | 904.5077 | 0 | 4198.5 |
| gated | home | r2-1 | 1 | 2 | 904.2539 | 0 | 4195.5 |
| gated | home | r2-2 | 1 | 0 | 903.3584 | 0 | 4179 |
| gated | home | r2-3 | 1 | 0.5 | 903.2461 | 0 | 4180.5 |
| gated | home | r2 median | 1 | 0.5 | 903.3584 | 0 | 4180.5 |
| gated | home | two-invocation median | 1 | 0.75 | 903.9331 | 0 | 4189.5 |
| gated | project | r1-1 | 1 | 1 | 903.3156 | 0 | 4183.5 |
| gated | project | r1-2 | 1 | 1 | 903.0999 | 0 | 4181.5 |
| gated | project | r1-3 | 1 | 1.5 | 903.8901 | 0 | 4101.5 |
| gated | project | r1 median | 1 | 1 | 903.3156 | 0 | 4181.5 |
| gated | project | r2-1 | 1 | 1.5 | 903.2264 | 0 | 4169.5 |
| gated | project | r2-2 | 1 | 1 | 903.0787 | 0 | 4180.5 |
| gated | project | r2-3 | 1 | 1 | 903.0831 | 0 | 4151.5 |
| gated | project | r2 median | 1 | 1 | 903.0831 | 0 | 4169.5 |
| gated | project | two-invocation median | 1 | 1 | 903.1993 | 0 | 4175.5 |

The eager runs' `totalByteWeight` was 435,218 B on home and 470,084–470,123 B on the
project route. The gated runs were 197,098–197,134 B and 191,118–191,154 B respectively,
confirming that the eager build loaded the additional 3D work. LCP, CLS and benchmark
index stayed stable across the two builds. TBT remained in single-digit milliseconds on
every eager internal run.

## Verdict

AC6 rule: performance >= 0.95 and TBT <= 200 ms, using the two-invocation median on both
routes. Eager home: performance 1, TBT 2 ms. Eager project: performance 1, TBT 3 ms.
Both routes pass.

**LOCAL verdict: recommend retiring D-19.** This is the local-host reading only; the binding
verdict follows the CI runner measurement in T017.

## Artifacts

- `evidence/T016-lighthouse-summary-eager-home-r1.json`
- `evidence/T016-lighthouse-summary-eager-home-r2.json`
- `evidence/T016-lighthouse-summary-eager-project-r1.json`
- `evidence/T016-lighthouse-summary-eager-project-r2.json`
- `evidence/T016-lighthouse-summary-gated-home-r1.json`
- `evidence/T016-lighthouse-summary-gated-home-r2.json`
- `evidence/T016-lighthouse-summary-gated-project-r1.json`
- `evidence/T016-lighthouse-summary-gated-project-r2.json`

## Check output

The check recomputes every invocation and two-invocation median from the eight JSON summaries,
asserts the values and the local AC6 verdict, then runs the guards, typecheck, lint and tests.

```text
MEDIANS-OK
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
packages/xploder typecheck$ tsc --noEmit
tools/perf typecheck$ tsc --noEmit
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
packages/xploder test$ vitest run
tools/perf test$ vitest run
packages/xploder test: 
packages/xploder test:  RUN  v5.0.5 ./packages/xploder
packages/xploder test: 
tools/perf test: 
tools/perf test:  RUN  v5.0.5 ./tools/perf
tools/perf test: 
packages/xploder test: (node:93308) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:93307) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:93326) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:93333) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:93346) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
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
packages/xploder test: (node:93351) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  Test Files  24 passed (24)
tools/perf test:       Tests  180 passed (180)
tools/perf test:    Start at  12:10:23
tools/perf test:    Duration  1.98s (import 78%, transform 13%, tests 9%, worker 1%)
tools/perf test: 
tools/perf test: Done
packages/xploder test: (node:93353) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:93367) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:93373) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: 
packages/xploder test:  Test Files  60 passed (60)
packages/xploder test:       Tests  617 passed (617)
packages/xploder test:    Start at  12:10:23
packages/xploder test:    Duration  7.28s (tests 63%, transform 21%, import 16%, worker 1%)
packages/xploder test: 
packages/xploder test:     Isolate  60 workers spawned · ~105ms startup each (spawn + environment, per file)
packages/xploder test:              at least ~595ms faster with isolate: false — reuses workers across files instead of one per file
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:93411) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:93419) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  32 passed | 1 skipped (33)
apps/web test:       Tests  182 passed | 2 skipped (184)
apps/web test:    Start at  12:10:31
apps/web test:    Duration  1.26s (transform 27%, import 26%, environment 24%, tests 22%, worker 2%)
apps/web test: 
apps/web test:     Isolate  33 workers spawned · ~139ms startup each (spawn + environment, per file)
apps/web test:              at least ~370ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
T016-OK
```

## Orchestrator review: did Lighthouse capture the 3D load?

Yes. `totalByteWeight` in run 1 is 435,218 B (eager home) vs 197,134 B (gated home) and 470,123 B
(eager project) vs 191,154 B (gated project). The +238 KB / +279 KB difference is the staged 3D chunks
fetched after `load` + idle, so the eager numbers include the 3D startup work and are not an artefact
of Lighthouse stopping before it.
