# T007 — E1b label-list index maps

Branch: `task/s11.8-hero-eager-t007` · base: `0fcd243` · date: 2026-11-04

Environment: Node 24.19.0, pnpm 12.15.0, Playwright 1.64.1, Chromium mobile emulation. Every number below is **local emulation**, not AC evidence.

## Trigger

T006's after-profile put the anonymous overlay-model chunk at 13.03%/13.19% of the first-content-frame task at CPU 1 and 12.43%/16.02% at CPU 4. Both are above the 5% E1b trigger. The exact `tagsModel` share is not separable from the anonymous model frame; the whole overlay-model chunk was used for the trigger reading.

## Equivalence oracle

`oracles/model-s11.7.ts` is `0fcd243:packages/xploder/src/overlay/model.ts` with only import paths rewritten. The exception required by the task is preserved: it imports `./place-s11.7`, so the old model runs on the old placement implementation and is compared with the new model on the new placement implementation. Prettier wrapped the rewritten import declarations; function bodies are unchanged.

The test covers project-a, project-b, project-c-lockerbay and the hero project from `.specify/content/websocket-inspector.json` at 412x823 and 1350x940, imploded and exploded. Exploded mobile exercises tags and exploded desktop exercises columns. The hero project parsed and all 16 project/viewport/state cases ran.

| Run | Cases | Mismatches | Fixture-set median old / new |
| --- | ---: | ---: | ---: |
| Before the lever on unchanged `model.ts` | 16 | 0 | 7.002 / 0.767 ms |
| After the lever | 16 | 0 | 7.640 / 0.725 ms |

Every case asserts `overlayBaseModel(...)` with `toStrictEqual` against the S11.7 oracle. The pre-lever output is `T007-log-oracle-pre.txt`; the post-lever output is `T007-ab/t007-oracle-post.txt`. The sealed `overlay-model.test.ts` is byte-identical to `0fcd243` and passes both before and after. The ordered `findIndex` sites in `overlayLabels` and `tagLabels` now read per-call layer and component index maps; exports and output order are unchanged.

## Local A/B — T006 to T007

```text
Before: ./.specify/features/hero-eager/evidence/T006-ab
After: .specify/features/hero-eager/evidence/T007-ab

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 175.25 | 22.50 | 162.25 | 3.50 | 13.00 | 22.50 | no measurable win |
| renderer-constructor /home (ms) | 5.80 | 0.38 | 5.66 | 0.32 | 0.14 | 0.38 | no measurable win |
| program-compile /home (ms) | 11.10 | 0.40 | 10.81 | 0.12 | 0.29 | 0.40 | no measurable win |
| first-content-frame /home (ms) | 11.10 | 0.40 | 10.81 | 0.12 | 0.29 | 0.40 | no measurable win |
| unnamedMaxMs /home (ms) | 7.90 | 0.28 | 7.87 | 0.16 | 0.03 | 0.28 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.90 | 13.60 | 205.35 | 3.10 | 6.55 | 13.60 | no measurable win |
| probe revealed /home (ms) | 215.65 | 13.50 | 209.25 | 3.10 | 6.40 | 13.50 | no measurable win |
```

### First-content-frame and neighbour split

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 11.30 | 0.00 (0.00%) | 2.63 (34.18%) | 1.17 (15.24%) | 3.89 (50.59%) |
| before cpu1 r2 first-content-frame | 10.90 | 0.00 (0.00%) | 3.01 (43.50%) | 0.87 (12.62%) | 3.04 (43.88%) |
| after cpu1 r1 first-content-frame | 10.76 | 0.00 (0.00%) | 2.75 (39.76%) | 0.84 (12.09%) | 3.33 (48.15%) |
| after cpu1 r2 first-content-frame | 10.87 | 0.00 (0.00%) | 3.10 (45.20%) | 1.00 (14.56%) | 2.76 (40.24%) |
| before cpu4 r1 first-content-frame | 33.28 | 0.00 (0.00%) | 3.76 (23.26%) | 1.47 (9.06%) | 10.95 (67.68%) |
| before cpu4 r1 unnamed @ 441.40 ms | 34.48 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.33 (100.00%) |
| before cpu4 r2 first-content-frame | 33.97 | 0.00 (0.00%) | 2.99 (16.29%) | 2.68 (14.62%) | 12.67 (69.09%) |
| before cpu4 r2 unnamed @ 441.86 ms | 34.96 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.64 (100.00%) |
| after cpu4 r1 first-content-frame | 34.60 | 0.00 (0.00%) | 3.10 (16.89%) | 1.93 (10.48%) | 13.34 (72.63%) |
| after cpu4 r1 unnamed @ 450.08 ms | 33.32 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 14.09 (100.00%) |
| after cpu4 r2 first-content-frame | 34.79 | 0.00 (0.00%) | 3.21 (15.60%) | 1.83 (8.90%) | 15.55 (75.51%) |
| after cpu4 r2 unnamed @ 439.64 ms | 34.22 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.74 (100.00%) |

The full machine table is `T007-ab/ab.md`; the overlay-model rows are in `T007-ab/target-split.md`.

### D-P7 keep-rule reading

The targeted task is the unnamed task adjacent to the first content frame that carries the overlay-model chunk. At CPU 4 it moves from 34.717 ms (spread 0.479) to 33.773 ms (spread 0.902): delta 0.944 ms against the larger spread of 0.902 ms, so the observed-ms keep rule reads **KEEP**, narrowly. The chunk self time is 5.132 to 3.877 ms, but its 1.255 ms delta is inside the 1.456 ms larger spread, so it is not claimed as a separable win. At CPU 1 the model remains in the first-content-frame task, which moves 11.103 to 10.815 ms, inside its 0.395 ms spread.

Local simulated TBT moves 175.25 to 162.25 ms, but the 13.00 ms delta is inside the 22.50 ms before spread and is not claimed. The binding TBT effect remains T012's.

## Non-goals

- Home post-eager parity: PASS, 4 shots, 0 px.
- Gated parity: PASS, 8 shots, 0 px.
- Probes: home normal 2/2 PASS, home reduced-motion 2/2 PASS, project gated 2/2 PASS.
- Draws: project and hero both 2 draw calls; hero sequence 7/7 PASS.
- CLS: 0 on every Lighthouse run.
- Reveal sequence: PASS on both runs.
- Dropped frames: trace-only CPU 1 = 0/0; CPU 4 = 0/1 (information only).

Bytes:

| Build | Home initial gzip Δ | Project initial gzip Δ | Total gzip Δ | Verdict |
| --- | ---: | ---: | ---: | --- |
| hero-eager | +137 B | -386 B | +567 B | PASS |
| gated | -1 B | 0 B | +419 B | PASS |

## Trigger readings after E1b

- **E1c (`Stats.tsx`): triggered.** Program setup is 39.76%/45.20% of the captured first-content-frame self time at CPU 1 and 16.89%/15.60% at CPU 4. The 5% branch is met.
- **E1d (`BlueprintOverlay.tsx`): not yet triggered on the T007 state.** Local eager simulated TBT is 162.25 ms, below the 185 ms condition. T009 must re-evaluate after E1c/T008.

## Check status

The literal check, saved as `T007-ab/t007.txt`, passes `MODEL-ORACLE-VERBATIM`, `SEALED-MODEL-TEST-UNCHANGED`, the 16-case equivalence with 0 mismatches and the unchanged `overlay-model.test.ts` tests, then halts at the intentional pre-re-seal S6 hash for `src/overlay/model.ts`:

```text
FAIL test/frozen-surface.test.ts > frozen S6 surface > matches every hash recorded from the base commit
Expected: "63427b9eed60ea9fc07eae2b55214be66bc37bbeb736d3a6cff4f1e767d77117"
Received: "91a75d2727810529813960aaf01d0ab234905af7013b63ec1d3316dafffbc71d"
Test Files  1 failed | 2 passed (3)
Tests       1 failed | 28 passed (29)
```

Guards (`T007-ab/t007-guards.txt`) print the expected pre-re-seal failures `XPLODER-SRC` and `SURFACE-S6`; every other guard is OK. `RESEAL-NOTE` is observed OK in this state because the new source path is not yet approved.

`pnpm typecheck` and `pnpm lint` pass. `pnpm build` passes. `pnpm test` has exactly the same single expected S6 failure: 62 files and 625 tests pass, 1 file and 1 test fail (626 total). Therefore `T007-OK` cannot be reached until the orchestrator commits the lever SHA and performs the S6 re-seal. No re-seal files were touched.

## Orchestrator decision (T007): REVERTED — no measurable win (D-P8)

- The trigger held (overlay-model frame 12–16 % after E1a) and identity held (16 cases, 0 mismatches). The change is not kept, because its **own target did not move beyond noise**: overlay-model self time 5.132 → 3.877 ms against a larger spread of 1.456 ms. The adjacent task's 0.944 ms gain clears its 0.902 ms spread by 0.04 ms, which is at the noise floor of a single A/B, and local simulated TBT (−13.0 ms) is inside its 22.5 ms spread.
- A sealed engine file is changed only for a measurable win (brief: one lever per commit, no shotgun changes). `packages/xploder/src/overlay/model.ts` stays byte-identical to `0fcd243`; no S6 re-seal for it; `approved-xploder-src.txt` unchanged. The E1b oracle/test files are not committed (they would test an unchanged file).
- T008's A/B "before" is `T006-ab` (lever-block picks the most recent earlier A/B dir; `T007-ab` is kept as evidence of the reverted measurement and is renamed `T007-ab-reverted` so it is not picked).
