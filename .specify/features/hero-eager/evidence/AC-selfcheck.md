# AC self-check — S11.8 hero-only eager (T013)

Worktree: `.` · head: `15885cf` · PR: #21 · base: `0fcd243` (S11.7 final).

Final product state: A1 + E1a only. E1b, E1c, E1d and E2 were measured and reverted; their source
files are byte-identical to `0fcd243`. T013b retired the home gate: the default build is hero eager,
`NEXT_PUBLIC_GATED_HERO=1` restores the gate, and the project route stays gated.

## End-contract table

### Reproduced baseline (T004)

| Attempt | Runner | benchmarkIndex min / median / max | Eager TBT (ms) | Eager band [188.33, 231.00] | Gated TBT (ms) | Gated band [74.48, 94.60] | AC1 |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| `41774295096-1-s2` | GitHub Actions 1000000860 | 1964 / 2267.75 / 2349.5 | 219.25 | inside | 90 | inside | **REPRODUCED** |
| `41774295096-1-s1` | GitHub Actions 1000000869 | 2119.5 / 2290 / 2371.5 | 205 | inside | 87.5 | inside | corroborating |
| `41774295096-1-s3` | GitHub Actions 1000000863 | 2424.5 / 2496.75 / 2603.5 | — | — | — | — | not slow-class |

Source: `T004-log-baseline.md`.

### Per-task before / after — T010 (local emulation)

All T010 numbers are local emulation and do not decide an AC.

| Metric | T004 before | T010 after | Delta | Before spread | Reading |
| --- | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT `/` (ms) | 221.50 | 193.66 | 27.84 | 62.31 | inside spread; not claimed |
| `renderer-constructor`, cpu1 (ms) | 5.56 | 5.70 | -0.14 | 0.08 | no measurable win |
| `program-compile`, cpu1 (ms) | 10.84 | 10.67 | 0.17 | 0.27 | no measurable win |
| `first-content-frame`, cpu1 (ms) | 10.84 | 10.67 | 0.17 | 0.27 | no measurable win |
| `unnamedMaxMs`, cpu1 (ms) | 8.96 | 8.15 | 0.81 | 0.10 | reduced |
| probe ready (ms) | 211.00 | 204.25 | 6.75 | 16.80 | no measurable win |
| probe revealed (ms) | 219.65 | 208.15 | 11.50 | 16.90 | no measurable win |

The E1a target is the separate placement task at `--cpu 4`: **32.14 / 32.55 ms with 16.30 / 16.53 ms
placement self time before → no unnamed task ≥ 16.7 ms carrying placement after** (D-P7). The oracle
reported 2,030 cases and 0 mismatches; the fixture-set median fell 13.515 → 0.461 ms. Source:
`T010-log-before-after.md`, `T006-log-e1a-ab.md`.

### Per-task before / after — T012 verdict (binding)

| State | Attempt | Eager perf | Eager TBT (ms) | Gated TBT (ms) | Eager − gated (ms) | Project gated TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| T004 baseline | `41774295096-1-s2` | 0.96 | 219.25 | 90.0 | 129.25 | 88.5 |
| T012 final | `42378433209-1-s1` | 0.98 | 175.5 | 85.0 | 90.5 | 90.5 |
| T012 final | `42378433209-1-s3` | 0.98 | 157.75 | 83.5 | 74.25 | 83.5 |

Against T004, eager TBT fell by **43.75 ms (20.0 %)** on `s1` and **61.5 ms (28.0 %)** on `s3`. The
same-attempt eager-minus-gated delta fell by 38.75 ms and 55 ms. The T004 eager-only `ViewScroll`
mount task (160 ms simulated / 32.3 ms observed / 110 ms TBT) is absent from both deciding profiles;
the remaining eager cost is the shared Turbopack/module-instantiation task and the later three
module-evaluation task, which are also present in the gated profiles. Source: `T012-log-verdict.md`,
`T012-per-task-*.md`.

### Named-exception caps (T004 caps vs T012 medians / raws)

Caps are T004 `s2` two-run medians × 1.05 (`T004-ac2-caps.json`). AC2 uses the two-run median; both
raw runs are shown.

| Attempt | Run | `renderer-constructor` (cap 15.805125) | `program-compile` (cap 34.651050) | `first-content-frame` (cap 34.651050) | `unnamedMaxMs` (bound 50) | Dropped frames (bound 2) |
| --- | --- | --- | --- | --- | ---: | ---: |
| `s1` | r1 | 15.161 PASS | 35.419 (above cap, raw) | 35.419 (above cap, raw) | 42.563 PASS | 3 FAIL |
| `s1` | r2 | 15.372 PASS | 33.690 PASS | 33.690 PASS | 46.919 PASS | 3 FAIL |
| `s1` | **median** | **15.2665 PASS** | **34.5545 PASS** | **34.5545 PASS** | **44.741 PASS** | **3 FAIL** |
| `s3` | r1 | 14.847 PASS | 31.646 PASS | 31.646 PASS | 43.963 PASS | 3 FAIL |
| `s3` | r2 | **17.514 FAIL** | 30.202 PASS | 30.202 PASS | 40.381 PASS | 3 FAIL |
| `s3` | **median** | **16.1805 FAIL** | **30.924 PASS** | **30.924 PASS** | **42.172 PASS** | **3 FAIL** |

The `s1` raw `program-compile` / `first-content-frame` exceed the cap on r1, but the specified AC2
reading is the two-run median and those medians pass. The `s3` renderer-constructor median is above
its frozen cap. Source: `T012-log-ac2.md`.

### No-bulk-task log

| Attempt | `unnamedMaxMs` r1 / r2 | Median | Bound | Verdict |
| --- | ---: | ---: | ---: | --- |
| `42378433209-1-s1` | 42.563 / 46.919 | 44.741 | ≤ 50 ms | PASS |
| `42378433209-1-s3` | 43.963 / 40.381 | 42.172 | ≤ 50 ms | PASS |

No unnamed task above 50 ms occurs on either deciding attempt.

### Named-mode dropped frames — NOT MET

| Attempt | Dropped frames r1 / r2 | Median | Bound | Verdict |
| --- | ---: | ---: | ---: | --- |
| `42378433209-1-s1` | 3 / 3 | **3** | ≤ 2 | **FAIL** |
| `42378433209-1-s3` | 3 / 3 | **3** | ≤ 2 | **FAIL** |

Dropped frames are 3 on both deciding attempts. **AC2 is not met and is not relaxed.** The recorder
column is excluded from AC2 as the harness rAF recorder; CPU 4 is informational only.

### Two slow-class verdict attempts

| Attempt | Runner | benchmarkIndex min / median / max | Qualifies | Home | Project gated |
| --- | --- | ---: | --- | --- | --- |
| `42378433209-1-s1` | GitHub Actions 1000000917 | 2132 / 2284.75 / 2386.5 | yes | PASS (a:Y b:N; eager 175.5, gated 85, perf 0.98) | PASS (90.5 in [78.85, 91.35]) |
| `42378433209-1-s3` | GitHub Actions 1000000915 | 2224.5 / 2293.75 / 2334.5 | yes | PASS (a:Y b:N; eager 157.75, gated 83.5, perf 0.98) | PASS (83.5 in [78.85, 91.35]) |
| `42378433209-1-s2` | GitHub Actions 1000000916 | 3587.5 / 4047.5 / 4306.5 | no | listed only | listed only |

The two deciding attempts use distinct runner VMs. **AC3 PASS 2/2 on rule (a).** Source:
`T012-log-ac3.md`.

### Byte budget — recomputed on the final builds

`bundle-scopes.mjs --budget s11.8` on the final head, against the T001 `0fcd243` manifests. Raw is
informational; gzip is budgeted. The command output is retained at
`<local-path>/s118-checks/t013/bytes-{eager,gated}.txt`; the same final deltas are in
`T013b-log-retire.md`.

| Pair | Scope | Before raw | After raw | Delta raw | Before gzip | After gzip | Delta gzip | Limit | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| default (hero eager) vs `main` eager | home initial | 582949 | 583386 | +437 | 180481 | 180628 | +147 | 2000 B | PASS |
| default (hero eager) vs `main` eager | project initial | 583043 | 581945 | -1098 | 180482 | 180096 | -386 | 2000 B | PASS |
| default (hero eager) vs `main` eager | total | 1581749 | 1582962 | +1213 | 459158 | 459680 | **+522** | 2295 B (0.5 %) | **PASS** |
| default (hero eager) vs `main` eager | non-initial 3D | 995308 | 997182 | +1874 | 277162 | 277923 | +761 | INFO | INFO |
| gated-hero vs `main` gated | home initial | 583374 | 583404 | +30 | 180622 | 180633 | +11 | 2000 B | PASS |
| gated-hero vs `main` gated | project initial | 581945 | 581945 | 0 | 180096 | 180096 | 0 | 2000 B | PASS |
| gated-hero vs `main` gated | total | 1582126 | 1582980 | +854 | 459309 | 459685 | **+376** | 2296 B (0.5 %) | **PASS** |
| gated-hero vs `main` gated | non-initial 3D | 996358 | 997182 | +824 | 277558 | 277923 | +365 | INFO | INFO |

**AC4 PASS** for both pairs.

### Zero-interaction 2.5 s probe

| Attempt | Run | Ready (ms) | Live at deadline | Trusted events | Poster | Non-blank | Pass |
| --- | --- | ---: | --- | ---: | --- | --- | --- |
| `s1` | r1 | 578.9 | `revealed` / opacity 1 | 0 | hidden | yes | yes |
| `s1` | r2 | 533.0 | `revealed` / opacity 1 | 0 | hidden | yes | yes |
| `s3` | r1 | 546.1 | `revealed` / opacity 1 | 0 | hidden | yes | yes |
| `s3` | r2 | 514.8 | `revealed` / opacity 1 | 0 | hidden | yes | yes |

All four home runs pass inside the 2.5 s deadline. Reduced motion is 4/4 pass (no canvas, poster
visible); the project `--expect gated` probe is 4/4 pass (no canvas before interaction). Source:
`T012-log-ac5.md`.

### Project gated TBT ±5 %

AC5 band: `[78.85, 91.35]` ms.

| Attempt | Invocation r1 / r2 (ms) | Attempt (ms) | Position |
| --- | ---: | ---: | --- |
| `s1` | 91.0 / 90.0 | 90.5 | inside |
| `s3` | 84.0 / 83.0 | 83.5 | inside |

**AC5 project band PASS 2/2.**

### Pixel parity, draws and CLS

| Check | Result | Evidence |
| --- | --- | --- |
| Default build, home, no engagement vs T004 eager-home | **0 px on 4/4 shots** | `T013-log-parity.txt` |
| Gated build, home + project, engaged vs T004 gated | **0 px on 8/8 shots** | `T013-log-parity.txt` |
| `site:probe --group draws`, default build | project 2 on 32/32; hero 2 on 40/40 | `T013-log-drawcalls.txt` |
| `site:probe --group draws`, gated build | project 2 on 32/32; hero 2 on 40/40 | `T013-log-drawcalls.txt` |
| CLS, Lighthouse (default home, gated home, gated project; 2 invocations each) | 0 on every internal run (6/6 invocations) | `T013-log-parity.txt` |
| CLS, zero-interaction load (`perf:startup --engage none`, default, 2 runs) | raw/filtered 0/0, no entries | `T013-log-parity.txt` |
| CLS, site-probe load group, both builds | 12/12 cells at 0 on each build | `T013-log-parity.txt` |
| Load harness (`fps:engine --scenario load`, 2 runs) | dropped frames 0/0; long tasks 0/0; verdict pass | `T013-log-parity.txt` |

The named load harness report has no CLS field; the load-scenario CLS checks are the zero-interaction
startup run and the site-probe `cls` load group. No CLS failure was observed.

### CI run

PR #21 head `15885cf`: required CI run
https://github.com/Hi-Murphy/portfolio-teardown/actions/runs/42422128483; slow-class measurement
run https://github.com/Hi-Murphy/portfolio-teardown/actions/runs/42422128410. `gh pr checks` is
green for `seo: meta + og`, both axe jobs, both perf gates, `build (typecheck, lint, test, build)`,
and `secrets (gitleaks)`. Full output: `T013-ci-run.txt`.

### Re-seal diff

`git diff 0fcd243 -- packages/xploder` is exactly: `src/overlay/place.ts` (the approved E1a file),
the S6 generator + regenerated manifest + `frozen-surface.test.ts` literals, and the new E1a oracle
and equivalence test. The source subset is exactly `packages/xploder/src/overlay/place.ts`, listed in
`approved-xploder-src.txt`. The S6 note carries the S11.8 re-seal sentence. S2/S4/S5/S7/S8 diffs are
empty; `ci.yml`, `perf.yml`, `eager-3d.yml` and `eager-load.yml` are byte-identical; `hero-eager.yml`
is the only added workflow. Full output: `T013-log-reseal-diff.txt`, `T013-log-frozen-diffs.txt`.

## AC verdicts

| AC | Verdict | Basis | Evidence |
| --- | --- | --- | --- |
| AC1 | **MET** | AC1 REPRODUCED on `41774295096-1-s2`: eager 219.25 ms and gated 90 ms, both inside their bands; `s1` corroborates. | `T004-log-baseline.md` |
| AC2 | **NOT MET** | Dropped frames 3/3 on both deciding attempts (bound 2); `s3` renderer-constructor median 16.1805 ms > cap 15.805125 ms. Unnamed max is within 50 ms on both. Not reworded or relaxed. | `T012-log-ac2.md`, `T012-log-verdict.md` |
| AC3 | **MET** | PASS 2/2 on distinct slow-class attempts: `s1` 175.5 / 85 ms, `s3` 157.75 / 83.5 ms, perf 0.98, rule (a). | `T012-log-ac3.md` |
| AC4 | **MET** | Final default vs main eager: total gzip +522 B (budget 2295 B), initial gzip +147 / -386 B. Final gated-hero vs main gated: total gzip +376 B (budget 2296 B), initial +11 / 0 B. | `T013b-log-retire.md`; recomputed table above |
| AC5 | **MET** | Home zero-interaction 4/4 pass, reduced motion 4/4, project gated 4/4; project gated TBT 90.5 / 83.5 ms inside `[78.85, 91.35]`. | `T012-log-ac5.md` |
| AC6 | **MET** | AC3 passed twice; Murphy said "retire"; T013b ran and amended D-19. | `T012-log-verdict.md`, `T013b-log-retire.md`, `rfc.md` §11.5 |
| AC7 | **MET** | CI green on the PR head; guards 21/21; re-seal diff limited to the approved file + its re-seal/test files; parity 0 px (4 + 8 shots), 2 draws, CLS 0. | `T013-ci-run.txt`, `T013-log-guard.txt`, `T013-log-reseal-diff.txt`, `T013-log-frozen-diffs.txt`, `T013-log-parity.txt`, `T013-log-drawcalls.txt` |

**AC6 decision text (D-19 amendment, quoted from `T013b-log-retire.md`):**

> D-19 amended (S11.8, Murphy 2026-11-08): home / eager - the live teardown boots with zero
> interaction after load + idle; project routes keep the interaction gate; reduced motion and
> Save-Data keep the poster; NEXT_PUBLIC_GATED_HERO=1 restores the home gate.

## Finishing tier per task

| Task | Finishing tier |
| --- | --- |
| T001 | 1 (Flash) + orchestrator review (paths-list guard tightened; total raw INFO; committed control) |
| T002 | 1 (Flash) + orchestrator review (D-P3 recorder-mode clock fix) |
| T003 | 1 (Flash) |
| T004 | 1 (Flash: artifacts, tables, caps, local baseline) + orchestrator (CI, D-P4 tool fixes, §4–§6/§10, D-P6) |
| T005 | 1 (Flash) |
| T006 | 1 (Flash) + orchestrator (keep decision, commits, re-seal) |
| T007 | 1 (Flash) + orchestrator (decision) |
| T008 | 1 (Flash) + orchestrator (decision) |
| T009 | 1 (Flash) + orchestrator (decision) |
| T010 | 1 (Flash) |
| T011 | 1 (Flash) + orchestrator (decision) |
| T012 | 1 (Flash: tables) + orchestrator (CI, qualification, row correction) |
| T013 | 1 (Flash: evidence/tables) + orchestrator (CI and PR checks) |
| T013b | 1 (Flash) + orchestrator review (CI-groups revert, R9 correction) |

## Check output

Sanitized copy of the T013 Check run (worktree path replaced by `.`; local ports by `PORT`).

```text
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
SRC-SUBSET-OK
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
packages/xploder test$ vitest run
tools/perf test$ vitest run
packages/xploder test: 
packages/xploder test:  RUN  v5.0.5 ./packages/xploder
tools/perf test: 
packages/xploder test: 
tools/perf test:  RUN  v5.0.5 ./tools/perf
tools/perf test: 
packages/xploder test: (node:67440) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67441) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67457) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67466) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
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
packages/xploder test: (node:67480) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67484) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67496) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67515) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  248 passed (248)
tools/perf test:    Start at  06:03:30
tools/perf test:    Duration  2.99s (import 70%, tests 18%, transform 12%, worker 1%)
tools/perf test: 
tools/perf test:     Isolate  30 workers spawned · ~115ms startup each (spawn + environment, per file)
tools/perf test:              at least ~269ms faster with isolate: false — reuses workers across files instead of one per file
tools/perf test: 
tools/perf test: Done
packages/xploder test: (node:67517) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:67524) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: 
packages/xploder test:  Test Files  62 passed (62)
packages/xploder test:       Tests  625 passed (625)
packages/xploder test:    Start at  06:03:30
packages/xploder test:    Duration  33.38s (tests 82%, transform 9%, import 8%)
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:67671) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:67682) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  35 passed | 1 skipped (36)
apps/web test:       Tests  197 passed | 2 skipped (199)
apps/web test:    Start at  06:04:04
apps/web test:    Duration  1.34s (environment 33%, import 23%, tests 22%, transform 21%, worker 1%)
apps/web test: 
apps/web test:     Isolate  36 workers spawned · ~159ms startup each (spawn + environment, per file)
apps/web test:              at least ~477ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
$ pnpm -r --if-present build
$ pnpm og:build && next build
$ tsx --tsconfig scripts/tsconfig.og.json scripts/build-og.ts
public/og/home.png 74310 bytes 56ae1db92d7d0affd771961ea6adfd5bec24b33140d8af945c38c126ecadc669
public/og/projects.png 69640 bytes 53c61f75d8e14a30afac818daac98d429c016a96dd65f7b6bc6bd028fca91d22
public/og/projects/websocket-inspector.png 79743 bytes 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3
public/apple-touch-icon.png 1186 bytes e1bd7bbd3011681f91cadb506f95e534398df9d1fc466a78953eb7613434a51b
▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 71ms

  Creating an optimized production build ...
✓ Compiled successfully in 328ms
  Running TypeScript ...
  Finished TypeScript in 929ms ...
  Collecting page data using 9 workers ...
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
  Generating static pages using 9 workers (0/8) ...
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:PORT for this local build. Set SITE_URL=https://example.com for a public build.
  Generating static pages using 9 workers (2/8) 

  Generating static pages using 9 workers (4/8) 

  Generating static pages using 9 workers (6/8) 

✓ Generating static pages using 9 workers (8/8) in 275ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /icon.svg
├ ○ /projects
├   /projects/[slug]
│ └ ● /projects/websocket-inspector
├ ○ /robots.txt
└ ○ /sitemap.xml


○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)

T013-OK
```
