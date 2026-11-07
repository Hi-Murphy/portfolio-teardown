# T010 — final local state for E1

Branch: `task/s11.8-hero-eager-t010` · base: `0fcd243` · date: 2026-11-04

Environment: Node 24.19.0, pnpm 12.15.0, Playwright 1.64.1, Chromium mobile emulation.
**Every number in this log is local emulation, not binding.** Binding AC evidence comes only from
the qualified CI attempts.

## Lever disposition

| Task | Lever | State | Evidence | Decision |
| --- | --- | --- | --- | --- |
| T005 | A1 hero-only eager flag | kept | `T005-log-a1.md`, `T005-ab/` | Hero boots eagerly under `build:eager-hero`; the project route remains gated. |
| T006 | E1a output-identical placement search | kept | `T006-log-e1a-ab.md`, `T006-ab/` | Oracle identity held, and the cpu4 placement neighbour disappeared (32.14/32.55 ms, with 16.30/16.53 ms placement self time, to no such task). |
| T007 | E1b label-list index maps | reverted | `T007-log-e1b-ab.md`, `T007-ab-reverted/` | Its own target moved only 5.132 -> 3.877 ms, inside the larger 1.456 ms spread; no measurable win (D-P8). |
| T008 | E1c program setup before the first draw | reverted | `T008-log-e1c-ab.md`, `T008-ab-reverted/` | The cpu4 compile task grew to 46.32/44.22 ms from the 33.28/33.97 ms pre-lever frame, risking the AC2 cap, and TBT did not move (D-P9). |
| T009 | E1d overlay model one task later | reverted | `T009-log-e1d-ab.md`, `T009-ab-reverted/` | Overlay-chunk self time inside the first-content-frame task did not leave it (7.788 -> 8.476 ms), so there was no measurable win. |

The accepted E1 state is therefore A1 (T005) plus E1a (T006) only. E1b, E1c and E1d were measured
and reverted; their source files remain byte-identical to `0fcd243`.

## Home eager before / after T004

Source: `T004-ab/ab.md` and `T010-ab/ab.md`. Before is `T004-ab`; after is the accepted E1 state
measured by the final T010 local block.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| eager simulated TBT `/` (ms) | 221.50 | 3.00 | 193.66 | 62.31 | 27.84 | 62.31 |
| `renderer-constructor`, cpu1 (ms) | 5.56 | 0.08 | 5.70 | 0.10 | -0.14 | 0.10 |
| `program-compile`, cpu1 (ms) | 10.84 | 0.27 | 10.67 | 0.37 | 0.17 | 0.37 |
| `first-content-frame`, cpu1 (ms) | 10.84 | 0.27 | 10.67 | 0.37 | 0.17 | 0.37 |
| `unnamedMaxMs`, cpu1 (ms) | 8.96 | 0.10 | 8.15 | 0.16 | 0.81 | 0.16 |
| dropped frames, cpu1 | 0 | 0 | 0 | 0 | 0 | 0 |
| probe ready (ms) | 211.00 | 16.80 | 204.25 | 9.30 | 6.75 | 16.80 |
| probe revealed (ms) | 219.65 | 16.90 | 208.15 | 9.30 | 11.50 | 16.90 |
| `renderer-constructor`, cpu4 (ms) | n/a | n/a | 19.06 | 0.62 | n/a | n/a |
| `program-compile`, cpu4 (ms) | n/a | n/a | 34.72 | 1.66 | n/a | n/a |
| `first-content-frame`, cpu4 (ms) | n/a | n/a | 34.72 | 1.66 | n/a | n/a |
| `unnamedMaxMs`, cpu4 (ms) | n/a | n/a | 37.00 | 4.35 | n/a | n/a |
| dropped frames, cpu4 | 2/1 (raw) | n/a | 1/0 (raw) | n/a | n/a | n/a |

The `T004-ab` cpu4 runs predate `--names` on cpu4, so they have no named values or neighbour split.
The cpu4 after rows are from `T010-ab`; `T006-ab` is the earlier first accepted state with those
names. The cpu1 simulated-TBT spread widened to 62.31 ms on the final rerun, so the table reads no
measurable win there. E1a's keep decision rests on its placement target and oracle identity, not on
TBT (D-P7). The `unnamedMaxMs` reduction is above its spread.

### First-content-frame task and neighbours

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 10.71 | 0.00 (0.00%) | 2.76 (37.87%) | 0.87 (11.92%) | 3.66 (50.21%) |
| before cpu1 r2 first-content-frame | 10.97 | 0.00 (0.00%) | 2.76 (42.29%) | 1.05 (16.02%) | 2.73 (41.69%) |
| after cpu1 r1 first-content-frame | 10.86 | 0.00 (0.00%) | 3.09 (41.54%) | 0.85 (11.47%) | 3.50 (46.98%) |
| after cpu1 r2 first-content-frame | 10.49 | 0.00 (0.00%) | 2.61 (38.61%) | 1.06 (15.69%) | 3.09 (45.71%) |
| after cpu4 r1 first-content-frame | 33.89 | 0.00 (0.00%) | 2.72 (14.43%) | 1.77 (9.39%) | 14.38 (76.18%) |
| after cpu4 r1 unnamed @ 442.36 ms | 34.82 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 14.40 (100.00%) |
| after cpu4 r2 first-content-frame | 35.55 | 0.00 (0.00%) | 4.32 (22.30%) | 2.08 (10.77%) | 12.95 (66.93%) |
| after cpu4 r2 unnamed @ 454.29 ms | 39.17 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.04 (100.00%) |

There is no cpu4 `before` row because `T004-ab` has no `names` array at that throttle. At cpu1 the
first-content-frame task does not carry placement in either state; the separate placement task is
the E1a target visible at cpu4.

### E1a cpu4 effect: T005-ab to T006-ab

| Run | First-content-frame ms | Neighbour before frame ms | Neighbour after frame ms | Placement self in after-frame neighbour ms |
| --- | ---: | ---: | ---: | ---: |
| T005 r1 | 32.09 | 33.16 @ 437.47 | 32.14 @ 504.18 | 16.30 |
| T005 r2 | 35.63 | 37.65 @ 438.31 | 32.55 @ 513.70 | 16.53 |
| T006 r1 | 33.28 | 34.48 @ 441.40 | none >= 16.7 | 0.00 |
| T006 r2 | 33.97 | 34.96 @ 441.86 | none >= 16.7 | 0.00 |

This is the D-P7 target reading: the post-frame placement task is gone after E1a.

## AC5 probes

| Probe | Before | After | Verdict |
| --- | --- | --- | --- |
| `/` normal, ready median (ms) | 211.00 | 204.25 | 2/2 PASS in both |
| `/` normal, revealed median (ms) | 219.65 | 208.15 | 2/2 PASS in both |
| `/` reduced motion | 2/2 PASS | 2/2 PASS | PASS |
| project `--expect gated` | 2/2 PASS | 2/2 PASS | PASS |

## Bytes vs `0fcd243`

Both pairs are from `bundle-scopes.mjs --budget s11.8` with the T001 baseline manifests and the
T010 build manifests. Raw bytes are informational; gzip is the budgeted value.

| Pair | Scope | Before raw | After raw | Delta raw | Before gzip | After gzip | Delta gzip | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hero-eager | home initial | 582949 | 583356 | +407 | 180481 | 180618 | +137 | PASS |
| hero-eager | project initial | 583043 | 581945 | -1098 | 180482 | 180096 | -386 | PASS |
| hero-eager | total | 1581749 | 1582932 | +1183 | 459158 | 459670 | +512 | PASS |
| hero-eager | non-initial 3D | 995308 | 997182 | +1874 | 277162 | 277923 | +761 | INFO |
| gated | home initial | 583374 | 583374 | 0 | 180622 | 180621 | -1 | PASS |
| gated | project initial | 581945 | 581945 | 0 | 180096 | 180096 | 0 | PASS |
| gated | total | 1582126 | 1582950 | +824 | 459309 | 459673 | +364 | PASS |
| gated | non-initial 3D | 996358 | 997182 | +824 | 277558 | 277923 | +365 | INFO |

## E2 decision (restated from T004 §6)

**E2 go.** T004's binding attempt has an eager home task of **160 ms simulated / 32.3 ms observed**
with **110 ms TBT share**, inside FCP->TTI, whose top frame is `ViewScroll`'s
`[turns, zoomFactor, height, width]` mount `sync` under the R3F scene-mount commit. Local emulation
shows the same R3F commit task at 36-37 ms immediately before the first content frame. T011 must run
E2 on both approved files (`ViewScroll.tsx` and `TeardownViewer.tsx`) after this E1 STOP.

## Check output

Exact contents of `/tmp/s118-checks/t010.txt` (the final command also printed `T010-OK`):

```text
BYTES-PASS
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
```

Final verification tail:

```text
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  245 passed (245)
packages/xploder test:  Test Files  62 passed (62)
packages/xploder test:       Tests  625 passed (625)
apps/web test:  Test Files  35 passed | 1 skipped (36)
apps/web test:       Tests  195 passed | 2 skipped (197)
$ pnpm -r --if-present build
✓ Compiled successfully
T010-OK
```
