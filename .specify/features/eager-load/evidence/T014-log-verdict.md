# T014 — AC6 verdict

verdict: keep gate

AC3 fails on both deciding slow-class attempts, `s1` and `s3`. The default build
therefore remains gated: `FLAG-DEFAULT-OK` is `OK FLAG-DEFAULT`, and the eager
path remains flag-only behind `NEXT_PUBLIC_EAGER_3D=1` (`process.env.NEXT_PUBLIC_EAGER_3D === '1'`
in `apps/web/next.config.ts`). No retirement or default-build change is made.

## Verdict provenance

- Deciding slow-class attempts: `41750211660-1-s1` on runner
  `GitHub Actions 1000000783`, then `41750211660-1-s3` on runner
  `GitHub Actions 1000000784`.
- `41750211660-1-s2` is listed only; its benchmark indices are outside
  `[1900, 2600]`.
- Verdict run `41750211660` attempt `1` is head `f6b342a`; its `apps/` and
  `packages/` product trees are identical to final lever state `3491e3f`
  (`git diff` empty).
- Runs `41734234159` (head `747db51`) and `41737674502` (head `a21ef80`)
  measured the BASE product, not the final state. They are not verdict
  attempts and are not counted here.

## Per-attempt result

Each value is the mean of two invocation medians, with each invocation a
median of three Lighthouse runs.

| Attempt | Runner | Index min / median / max | Counted | Route | Eager perf / TBT | Gated perf / TBT | Eager − gated | Rule a | Rule b | Pass |
|---|---|---:|---|---|---:|---:|---:|---|---|---|
| `s1` | GitHub Actions 1000000783 | 2248.5 / 2418.5 / 2590.5 | yes | home | 0.965 / 209.25 | 1 / 82.75 | 126.50 | no | no | FAIL |
| `s1` | GitHub Actions 1000000783 | 2248.5 / 2418.5 / 2590.5 | yes | project | 0.92 / 350.50 | 0.995 / 83.00 | 267.50 | no | no | FAIL |
| `s3` | GitHub Actions 1000000784 | 2020.5 / 2323.75 / 2541.5 | yes | home | 0.965 / 210.00 | 1 / 86.00 | 124.00 | no | no | FAIL |
| `s3` | GitHub Actions 1000000784 | 2020.5 / 2323.75 / 2541.5 | yes | project | 0.91 / 380.5322 | 0.99 / 87.00 | 293.5322 | no | no | FAIL |
| `s2` | GitHub Actions 1000000782 | 2698 / 2899.5 / 3029.5 | no | home | 0.99 / 146.25 | 1 / 56.00 | 90.25 | yes | no | PASS |
| `s2` | GitHub Actions 1000000782 | 2698 / 2899.5 / 3029.5 | no | project | 0.96 / 230.6517 | 1 / 54.00 | 176.6517 | no | no | FAIL |

## Before and after versus T006

This is the same protocol on different attempts, not a controlled same-host
A/B. The base is T006 attempt `41734234159-1-s3`. The same-attempt
`eager − gated` delta is the tie-breaker against attempt-to-attempt drift.

| State / attempt | Home eager | Home gated | Home eager − gated | Home eager Δ vs T006 | Project eager | Project gated | Project eager − gated | Project eager Δ vs T006 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| T006 base `41734234159-1-s3` | 219.75 | 82.5 | 137.25 | — | 374.13 | 86 | 288.13 | — |
| Final `s1` | 209.25 | 82.75 | 126.50 | -10.50 | 350.50 | 83.00 | 267.50 | -23.63 |
| Final `s3` | 210.00 | 86.00 | 124.00 | -9.75 | 380.5322 | 87.00 | 293.5322 | +6.4022 |

The eager penalty remains large on both final attempts: the smallest
same-attempt deltas are `126.50 ms` home and `267.50 ms` project. Both routes
still exceed rule (a)'s TBT ceiling (`200 ms`) and rule (b)'s delta ceiling
(`50 ms`) on `s1` and `s3`.

## Remaining attribution

Top task contributions from the attached per-task profiles (simulated /
observed / TBT, chunk, top self-time frames):

| Attempt | Route | Largest tasks |
|---|---|---|
| `s1` | home | 159 / 39.8 / 109 ms, Turbopack runtime `I` 48.4%; 156 / 39.0 / 106 ms, xploder `3vwpvuyn90046.js` (`G` 17.1%, GC 16.1%, `O` 16.0%); 126 / 31.5 / 76 ms, three evaluation (`(program)` 54.8%, `I` 34.3%) |
| `s1` | project | 174 / 43.6 / 124 ms, xploder `3vwpvuyn90046.js` (`G` 25.5%, anonymous 13.8%); 153 / 38.3 / 103 ms, Turbopack runtime `I` 47.9%; 146 / 36.4 / 96 ms, unattributable parse/program 97.3%; 135 / 33.9 / 85 ms, xploder program 82.7% |
| `s3` | home | 161 / 40.3 / 111 ms, Turbopack runtime `I` 56.2%; 161 / 40.3 / 111 ms, xploder `3vwpvuyn90046.js` (GC 15.2%, `G` 14.0%); 120 / 30.1 / 70 ms, three evaluation (`(program)` 54.2%, `I` 37.3%) |
| `s3` | project | 184 / 46.0 / 134 ms, Turbopack runtime `I` 51.2%; 164 / 40.9 / 114 ms, xploder `3vwpvuyn90046.js` (GC 24.0%, `G` 17.6%, `Y` 11.9%); 156 / 36.6 / 106 ms, xploder program 73.3%; 132 / 33.0 / 82 ms, three evaluation (`(program)` 51.4%, `I` 35.6%) |

The remaining eager-only cost is concentrated in module instantiation
(Turbopack runtime `I`), xploder scene/label layout, and three evaluation.
The machine profiles are `T014-per-task-{gated,eager}-{home,project}-att41750211660-1-{s1,s3}.md`.

## Supporting evidence

- AC3: `T014-log-ac3.md`, plus the three attached host metas and 24 Lighthouse summaries.
- AC2: `T014-log-ac2.md`, plus the s1/s3 trace-only and recorder JSONs.
- AC5: `T014-log-ac5.md`, plus the s1/s3 probe JSONs and deadline PNGs.
- Per-attempt verdict files: `T014-verdict-{default,s11.7}-att41750211660-1-{s1,s3}.md`.

## Check

Captured from the T014 check output; path substitutions match the T006 sanitisation rules.

```text
VERDICT-RECORDED
ATTEMPTS-OK
OK FROZEN
OK BRIEF-HISTORY
OK XPLODER-EMPTY
OK APP-TOUCH
OK BASELINE-FIRST
OK DEV-ROUTES
OK CI-JOBS
OK FLAG-DEFAULT
OK VERSIONS
OK BUDGETS
OK GITLEAKS
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
packages/xploder lint$ eslint .
tools/perf lint$ eslint .
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
packages/xploder test: (node:77032) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77031) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77037) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77049) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
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
packages/xploder test: (node:77060) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77067) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77072) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77099) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  236 passed (236)
tools/perf test:    Start at  08:16:01
tools/perf test:    Duration  3.03s (import 69%, tests 18%, transform 13%, worker 1%)
tools/perf test: 
tools/perf test:     Isolate  30 workers spawned · ~139ms startup each (spawn + environment, per file)
tools/perf test:              at least ~323ms faster with isolate: false — reuses workers across files instead of one per file
tools/perf test: 
tools/perf test: Done
packages/xploder test: (node:77101) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:77107) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: 
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  624 passed (624)
packages/xploder test:    Start at  08:16:01
packages/xploder test:    Duration  8.17s (tests 62%, transform 20%, import 18%, worker 1%)
packages/xploder test: 
packages/xploder test:     Isolate  61 workers spawned · ~116ms startup each (spawn + environment, per file)
packages/xploder test:              at least ~671ms faster with isolate: false — reuses workers across files instead of one per file
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:77157) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:77167) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  33 passed | 2 skipped (35)
apps/web test:       Tests  187 passed | 4 skipped (191)
apps/web test:    Start at  08:16:09
apps/web test:    Duration  1.85s (tests 29%, environment 27%, transform 21%, import 21%, worker 1%)
apps/web test: 
apps/web test:     Isolate  35 workers spawned · ~255ms startup each (spawn + environment, per file)
apps/web test:              at least ~738ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
T014-OK
```
