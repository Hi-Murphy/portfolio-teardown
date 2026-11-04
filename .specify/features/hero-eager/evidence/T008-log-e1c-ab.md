# T008 - E1c program setup before the first draw

Branch: `task/s11.8-hero-eager-t008` - base: `0fcd243` - date: 2026-11-04

Environment: Node 24.19.0, pnpm 12.15.0, local Chromium mobile emulation. All numbers below are
**local emulation** and do not decide an AC.

## Trigger and keep rule

E1c was triggered at AC1: program setup was 22% of the s2 host-native first-content-frame task and
23.1% of s1's profiled task. After T006 it remained 34.18% / 43.50% at CPU 1 and 23.26% / 16.29% at
CPU 4, so the 5% branch held.

The D-P7/D-P8 reading is on E1c's own target, the first-content-frame task:

| Reading | Before (T006) median | Before spread | After (T008) median | After spread | Delta | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| first-content-frame duration, CPU 1 (ms) | 11.10 | 0.40 | 3.01 | 0.01 | 8.09 | KEEP |
| program-setup self time in that task, CPU 1 (ms) | 2.82 | 0.19 | 0.23 | 0.08 | 2.59 | KEEP |
| program-compile task duration, CPU 1 (ms) | 11.10 | 0.40 | 11.07 | 0.14 | 0.03 | compile moved out; not the target |

The program setup now has its own `program-compile` task rather than remaining in the first-content
frame. The CPU-4 durations are `program-compile` 46.316 / 44.218 ms and `first-content-frame` 12.221 /
12.583 ms. The required standalone split is `program-compile 10.999 ms`, `first-content-frame
3.203 ms`.

## Local A/B

Full table: `T008-ab/ab.md`. Before is `T006-ab`; after is `T008-ab`.

| Metric | Before median | Before spread | After median | After spread | Delta | Reading |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 175.25 | 22.50 | 176.75 | 1.50 | -1.50 | no measurable win |
| first-content-frame /home (ms) | 11.10 | 0.40 | 3.01 | 0.01 | 8.09 | KEEP on the target |
| program-compile /home (ms) | 11.10 | 0.40 | 11.07 | 0.14 | 0.03 | separated task |
| unnamedMaxMs /home (ms) | 7.90 | 0.28 | 6.68 | 0.02 | 1.22 | KEEP |
| dropped frames /home | 0.00 | 0.00 | 1.00 | 0.00 | -1.00 | within AC2 (<= 2) |
| probe ready /home (ms) | 211.90 | 13.60 | 231.80 | 18.00 | -19.90 | no measurable win |

The TBT change is inside the before spread and is not claimed as a win. The keep decision rests on the
targeted first-content-frame task: 8.09 ms against the 0.40 ms spread.

## Compile diagnostics

- **KHR_parallel_shader_compile:** present locally (`webgl2: true`, extension returned). The runner
  value is pending CI host-meta and is not inferred here.
- **Program count:** unavailable. No existing probe exposes `gl.info.programs`; `site:probe` supplies
  draw counts only. The startup probe's GL counters (`createProgram=1`, `linkProgram=1`) and the draw
  count are not a substitute for the required before/after-first-render program-count comparison.

## Sequence, parity, bytes

- Reveal sequence: `firstInstancedDraw` and `ready` are both rAF 15 in both runs; ready follows the
  draw by 0.8 / 0.7 ms. `drawElementsInstanced = 2` in each run.
- `site:probe --group draws`: hero 2 draws (40/40 frames), project 2 draws (32/32 frames).
- Parity: eager home 0 px x4; gated home + project 0 px x8. No parity diff.
- Eager bytes: home initial gzip +136 B; project initial gzip -388 B; total gzip +629 B; PASS.
- Gated bytes: home initial gzip -1 B; project initial gzip -2 B; total gzip +482 B; PASS.

## E1d trigger reading

The local eager simulated TBT is 176.75 ms versus 175.25 ms before, a +1.50 ms change. Applied to the
binding AC1 eager TBT of 219.25 ms: `219.25 + 1.50 = 220.75 ms`, which is above 185 ms. However, the
companion condition is that the first-content-frame task still contributes > 50 ms simulated. The
available target reading is 3.01 ms observed at CPU 1 (about 49.4 ms at the T004 16.4 drift ratio),
so that condition is not evidenced. E1d is therefore not triggered on this local reading and its
exact simulated task split is not separately exposed by the A/B.

## Checks

The literal T008 check stops at the expected pre-re-seal S2/S4 hash. The focused run has 15 passing
tests and exactly this failure:

```text
FAIL test/frozen-surface.test.ts > frozen S2/S4 surface > matches every hash recorded from the base commit
AssertionError: src/react/scene/Stats.tsx: expected 'cd5290ed572a0b882b5f86dac5cfe5ebc21bf...'
to be '78f1d7b522a7f6066daaf35b0bfc599bae22d...'
Test Files  1 failed | 2 passed (3)
Tests       1 failed | 15 passed (16)
```

Guards print the other two expected failures:

```text
FAIL XPLODER-SRC
FAIL SURFACE-S4
```

All other guards pass. Repo-wide `pnpm typecheck` and `pnpm lint` pass. `pnpm test` has only the same
S2/S4 hash failure: 62 files / 626 tests pass, 1 file / 1 test fails. `pnpm build` passes.

The check's standalone names step comes after `lever-block.sh` leaves the gated build in
`apps/web/out`, so its first `--no-build` invocation did not mount and produced an empty split. This
is a harness ordering issue, not a product failure. After an explicit `pnpm build:eager-hero`, the
same names command passes and prints `SPLIT [["program-compile",10.999],["first-content-frame",3.203]]`.

`T008-OK` is unreachable until the orchestrator re-seals S2/S4 and adds the approved source path. No
re-seal files were changed here. Check snapshots are in `T008-ab/t008*.txt`.

## Orchestrator decision (T008): REVERTED — harmful to the AC2 cap, no TBT win (D-P9)

- `--cpu 1` shows the intended split (first-content-frame 11.10 → 3.01 ms), but the `--cpu 4` named runs (`T008-ab/fps-home-cpu4-r{1,2}`) show the cost **grows**: before, `program-compile` = `first-content-frame` = one task of **33.28 / 33.97 ms**; after, `program-compile` is its own task of **46.32 / 44.22 ms** (+36 %) plus a `first-content-frame` task of 12.22 / 12.58 ms. Total ≈ 34 → ≈ 58 ms.
- AC2 caps `program-compile` at its AC1 baseline + 5 % (34.65 ms on the slow host). A compile task ≈ 1.3× the baseline task would very likely breach it, and local simulated TBT does not move (175.25 → 176.75 ms). `compileAsync` compiles every material up front instead of the two programs the first frame needs, so it adds work rather than moving it.
- Also found in review: the `getExtension('KHR_parallel_shader_compile') === undefined` branch could never be true in a browser (`getExtension` returns `null`); it only served the test mock.
- `packages/xploder/src/react/scene/Stats.tsx` stays byte-identical to `0fcd243`; no S2/S4 re-seal; `stats-compile.test.tsx` not committed. `T008-ab` is kept as `T008-ab-reverted`.
