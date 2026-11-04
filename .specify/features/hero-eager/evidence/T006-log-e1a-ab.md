# T006 — E1a output-identical placement search

Branch: `task/s11.8-hero-eager-t006` · base: `0fcd243` · date: 2026-11-04

Environment: Node 24.19.0, pnpm 12.15.0, Playwright 1.64.1, Chromium mobile emulation. All numbers below are **local emulation**, not AC evidence.

## Equivalence oracle

The oracle is the verbatim `0fcd243:packages/xploder/src/overlay/place.ts` copy with only the prescribed import rewrites. `diff` against the checked-in oracle prints `ORACLE-VERBATIM`.

| Run | Seed | Fixtures | Random layouts | Edge cases | Cases | Mismatches | Fixture median old / new |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Before the lever | 85032474 | 24 | 2,000 | 6 | 2,030 | 0 | 13.542 / 13.606 ms |
| After the lever | 85032474 | 24 | 2,000 | 6 | 2,030 | 0 | 13.515 / 0.461 ms |

The random set uses 1–24 convex hulls, 4–30 labels covering every kind, optional alternate anchors, short text and excluded obstacles. The edge set includes zero-length edges, collinear points, viewport-inset labels, off-screen anchors, a forced `completeSearch` recovery and a `SEARCH_NODE_LIMIT` hit. Every case asserts `toStrictEqual` against `oracles/place-s11.7.ts`.

The pre-lever output is preserved as `T006-ab/t006-oracle-pre.txt`; the final focused check output is `T006-ab/t006.txt`.

## Local A/B — T005 to T006

```text
Before: ./.specify/features/hero-eager/evidence/T005-ab
After: .specify/features/hero-eager/evidence/T006-ab

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 202.75 | 80.50 | 175.25 | 22.50 | 27.50 | 80.50 | no measurable win |
| renderer-constructor /home (ms) | 5.45 | 0.29 | 5.80 | 0.38 | -0.35 | 0.38 | no measurable win |
| program-compile /home (ms) | 10.80 | 0.11 | 11.10 | 0.40 | -0.31 | 0.40 | no measurable win |
| first-content-frame /home (ms) | 10.80 | 0.11 | 11.10 | 0.40 | -0.31 | 0.40 | no measurable win |
| unnamedMaxMs /home (ms) | 9.05 | 0.14 | 7.90 | 0.28 | 1.14 | 0.28 | KEEP |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 207.65 | 27.10 | 211.90 | 13.60 | -4.25 | 27.10 | no measurable win |
| probe revealed /home (ms) | 216.55 | 27.50 | 215.65 | 13.50 | 0.90 | 27.50 | no measurable win |
```

**Keep-rule verdict:** the literal rule over its named targets (simulated TBT, first-content-frame observed, or named exceptions) reports **no measurable win**. `unnamedMaxMs` is the one KEEP row. The direct target is visible in the neighbour split: before, the placement task follows the frame at 504.18/513.70 ms with 32.14/32.55 ms durations and 16.30/16.53 ms placement self time; after, that task is absent and the remaining neighbours at 441.40/441.86 ms have 0.00 ms placement self time. The first-content-frame median moved from 10.80 to 11.10 ms, within the run spread, because host-native separates placement into its neighbour task. This is reported as a task STOP decision for the orchestrator, not hidden by relabelling a different metric.

### First-content-frame and neighbour split

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 10.85 | 0.00 (0.00%) | 2.76 (40.35%) | 0.87 (12.74%) | 3.21 (46.91%) |
| before cpu1 r2 first-content-frame | 10.74 | 0.00 (0.00%) | 2.81 (40.36%) | 0.69 (9.97%) | 3.45 (49.67%) |
| after cpu1 r1 first-content-frame | 11.30 | 0.00 (0.00%) | 2.63 (34.18%) | 1.17 (15.24%) | 3.89 (50.59%) |
| after cpu1 r2 first-content-frame | 10.90 | 0.00 (0.00%) | 3.01 (43.50%) | 0.87 (12.62%) | 3.04 (43.88%) |
| before cpu4 r1 first-content-frame | 32.09 | 0.00 (0.00%) | 2.90 (16.30%) | 1.19 (6.68%) | 13.71 (77.02%) |
| before cpu4 r1 unnamed @ 437.47 ms | 33.16 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.72 (100.00%) |
| before cpu4 r1 unnamed @ 504.18 ms | 32.14 | 16.30 (63.56%) | 0.00 (0.00%) | 2.87 (11.19%) | 6.48 (25.25%) |
| before cpu4 r2 first-content-frame | 35.63 | 0.00 (0.00%) | 4.06 (21.00%) | 1.63 (8.42%) | 13.65 (70.59%) |
| before cpu4 r2 unnamed @ 438.31 ms | 37.65 | 0.00 (0.00%) | 0.00 (0.00%) | 1.02 (7.33%) | 12.88 (92.67%) |
| before cpu4 r2 unnamed @ 513.70 ms | 32.55 | 16.53 (64.59%) | 0.00 (0.00%) | 4.04 (15.80%) | 5.02 (19.61%) |
| after cpu4 r1 first-content-frame | 33.28 | 0.00 (0.00%) | 3.76 (23.26%) | 1.47 (9.06%) | 10.95 (67.68%) |
| after cpu4 r1 unnamed @ 441.40 ms | 34.48 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.33 (100.00%) |
| after cpu4 r2 first-content-frame | 33.97 | 0.00 (0.00%) | 2.99 (16.29%) | 2.68 (14.62%) | 12.67 (69.09%) |
| after cpu4 r2 unnamed @ 441.86 ms | 34.96 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.64 (100.00%) |

Full machine output: `T006-ab/ab.md`; raw summaries remain in `T006-ab/`.

## Non-goals

- Home post-eager parity: PASS, 4 shots, 0 px.
- Gated parity: PASS, 8 shots, 0 px.
- Draws: hero and project both 2 draw calls; hero probe 7/7 PASS.
- CLS: 0 on every Lighthouse run.
- Reveal sequence: PASS, both runs.
- Dropped frames: trace-only CPU 1 = 0/0; CPU 4 = 1/1 (information only).

Bytes:

| Build | Home initial gzip Δ | Project initial gzip Δ | Total gzip Δ | Verdict |
| --- | ---: | ---: | ---: | --- |
| hero-eager | +137 B | -386 B | +512 B | PASS |
| gated | -1 B | 0 B | +364 B | PASS |

## Trigger readings after E1a

- **E1a step 3 (grid): not triggered.** Placement self time in the first-content-frame task is 0.00% after the lever, and the separate placement neighbour disappeared. The optional grid step was not implemented.
- **E1b (`model.ts`): triggered.** The overlay-model chunk renamed from `3vwpvuyn90046.js` to `1y7jwsdsad7nj.js`; its `overlayBaseModel`/`tagsModel` block is still near column 45,004. The profiler names it only `(anonymous)`, with no column, so the exact `tagsModel` share is **not separable** from the rest of that anonymous model frame. The whole anonymous overlay-model-chunk share is 13.03% and 13.19% at CPU 1, and 12.43% and 16.02% at CPU 4. It exceeds the 5% trigger under every reading.
- **E1c (`Stats.tsx`): triggered.** Program setup is 34.18% and 43.50% of the first-content-frame task at CPU 1, and 23.26% and 16.29% at CPU 4. The 5% branch is met.
- **E1d (`BlueprintOverlay.tsx`): not yet triggered on the T006 state.** Local eager simulated TBT is 175.25 ms, already below the 185 ms condition. The separate > 50 ms first-content-frame contribution is read from the simulated attribution; the local observed 11.10 ms frame is not that branch. T009 re-evaluates after T008 as specified.

## Check status

The literal T006 check halts at the intentional pre-re-seal S6 hash mismatch for `src/overlay/place.ts`:

```text
seed=85032474 cases=2030 random=2000 fixtures=24 mismatches=0
median fixture-set old=13.515 ms new=0.461 ms
FAIL test/frozen-surface.test.ts > frozen S6 surface > matches every hash recorded from the base commit
Expected: "135d4d48195dcc46544da3b90caaed6ab473d2c2e129825bda1ee78e7533ab49"
Received: "0b3588f2b32e7781e5563bd3850fd7fd6d9e956fe7bc62b976514af2bf40e00a"
Test Files  1 failed | 5 passed (6)
Tests       1 failed | 62 passed (63)
```

Guards in this worktree print:

```text
FROZEN-OK
BRIEF-HISTORY-OK
G1-LIST-OK
FAIL XPLODER-SRC
XPLODER-TEST-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
FAIL SURFACE-S6
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

`XPLODER-SRC` and `SURFACE-S6` are expected before the orchestrator's re-seal. `RESEAL-NOTE` is observed OK in this pre-approval state, not the expected FAIL; the guard has no approved path to check yet.

Repo-wide checks: `pnpm typecheck` and `pnpm lint` pass; `pnpm build` passes. `pnpm test` has exactly the same single expected S6 failure: 61 files and 624 tests pass, 1 file and 1 test fail. Therefore the final `T006-OK` marker cannot be reached until the orchestrator commits the lever SHA and performs the re-seal. No re-seal files were touched here, as instructed.
