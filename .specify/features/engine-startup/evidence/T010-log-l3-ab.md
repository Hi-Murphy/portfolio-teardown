# T010 revision — L3 split init + staged module evaluation A/B

Date: 2026-11-03

## Outcome

**DO NOT KEEP under AC4.** The restructure preserves the measured startup win and moves all staging
code out of initial modules, but the home initial scope is still **45 B above the T006 baseline**
(583,413 B vs 583,368 B). Project initial is 4,406 B below T006. The exact remaining delta and the
initial-chunk source are recorded below, as required by the revision instruction.

`interaction-gate.ts` is byte-identical to T009 (`git diff` is empty). The staging implementation is
now in dynamic chunks only:

- `apps/web/components/boot-3d.ts`: `yieldToMain`, abort-aware `loadStaged`, and `STAGES_3D`.
- `apps/web/components/hero/hero-boot.ts`: stages `three`/R3F, imports `hero-stage`, yields, returns
  the component.
- `apps/web/components/workbench/workbench-boot.ts`: stages `three`/R3F, imports
  `workbench-client`, yields, returns the component.
- `hero-live.tsx` dynamically imports `hero-boot`, calls `bootHeroStage(signal)`, then mounts inside
  `startTransition`.
- `workbench-loader.tsx` drops `next/dynamic`, keeps the click feedback synchronous, dynamically
  imports `workbench-boot`, holds the component in state, and mounts inside `startTransition`.
- `stage-3d.test.ts` now asserts that `stage-3d.ts` is imported only by `components/boot-3d.ts`.
- `boot-3d.test.ts` contains the moved `yieldToMain`/`loadStaged` tests. The retained
  `interaction-gate.test.ts` covers its two abort guards so the task's unchanged Check command still
  has a test file to run.

## Measurement protocol

"Before" is the T009 after state (`c9aea35`). "After" is this worktree. All runs use the production
static export, Playwright Chromium, the mobile profile, and 4x CPU throttling. Startup values are
medians of two runs; max-long-task values are listed per raw run. The exact Check block was run with
`bash` from the worktree root.

## Clean-run A/B

| Path | State | Startup cost | Max long task | Blocking |
|---|---|---:|---:|---:|
| home / move | T009 | 326.960 | 80.394 | 44.540 |
| home / move | after | 277.631 (278.207, 277.054) | 61.353 (61.030, 61.677) | 11.354 (11.030, 11.677) |
| home / move | delta | -49.329 (-15.09%) | -19.041 (-23.69%) | -33.186 (-74.51%) |
| project / move | T009 | 364.436 | 112.871 | 67.913 |
| project / move | after | 329.619 (334.115, 325.122) | 57.684 (56.396, 58.972) | 7.684 (6.396, 8.972) |
| project / move | delta | -34.817 (-9.55%) | -55.187 (-48.89%) | -60.229 (-88.69%) |
| project / click | T009 | 371.168 | 112.151 | 67.946 |
| project / click | after | 337.648 (338.544, 336.752) | 56.631 (56.879, 56.383) | 6.631 (6.879, 6.383) |
| project / click | delta | -33.520 (-9.03%) | -55.520 (-49.51%) | -61.315 (-90.24%) |

The after summaries are not spread-flagged. Max-long-task run spreads are 0.647 ms, 2.576 ms and
0.496 ms respectively; each delta is far above its spread.

## Attributed project / move

| Metric | T009 | after | Delta |
|---|---:|---:|---:|
| Startup cost | 353.688 | 327.563 | -26.125 |
| P3 main-thread | 112.250 | 81.850 | -30.400 |
| P4 main-thread | 61.016 | 58.232 | -2.784 |
| P5 main-thread | 65.577 | 67.678 | +2.102 |
| Max long task | 112.830 | 56.894 | -55.937 |

## Task-breakdown dump

Top-level `CrRendererMain` tasks over 8 ms in each clean r1 trace; child events over 2 ms aggregated.

```text
== home-move ==
TASK ts=0.0ms dur=22.9ms
TASK ts=45.1ms dur=23.5ms
      23.5 EvaluateScript 3vnmkhfgdnq2d.js
TASK ts=78.2ms dur=27.2ms
      27.1 EvaluateScript 1d5kkip1hlg-o.js
TASK ts=118.5ms dur=14.7ms
      14.7 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=139.0ms dur=8.5ms
       8.5 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=209.0ms dur=61.0ms
      61.0 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=270.2ms dur=29.4ms
      27.6 FireAnimationFrame 1d5kkip1hlg-o.js fn=tf
TASK ts=300.8ms dur=20.0ms
      20.0 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=320.9ms dur=9.5ms
       3.7 Layout

== project-move ==
TASK ts=0.0ms dur=22.2ms
TASK ts=43.4ms dur=24.8ms
      24.8 EvaluateScript 3vnmkhfgdnq2d.js
TASK ts=77.7ms dur=27.5ms
      27.4 EvaluateScript 1d5kkip1hlg-o.js
TASK ts=113.5ms dur=32.6ms
      32.6 EvaluateScript 1i-prr2ae20oj.js
TASK ts=146.8ms dur=15.6ms
      15.5 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=169.0ms dur=20.2ms
      20.1 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=243.5ms dur=56.4ms
      56.3 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=299.9ms dur=31.1ms
      27.8 FireAnimationFrame 1d5kkip1hlg-o.js fn=tf
TASK ts=332.1ms dur=39.6ms
      39.5 FunctionCall 1kgrt2f4mrm63.js fn=z
       5.6 MinorGC
TASK ts=371.7ms dur=12.8ms
       4.8 UpdateLayoutTree

== project-click ==
TASK ts=0.0ms dur=19.2ms
TASK ts=36.1ms dur=23.7ms
      23.6 EvaluateScript 3vnmkhfgdnq2d.js
TASK ts=68.9ms dur=26.8ms
      26.8 EvaluateScript 1d5kkip1hlg-o.js
TASK ts=107.1ms dur=31.7ms
      31.7 EvaluateScript 1y81jgf1iz4ib.js
TASK ts=140.2ms dur=14.9ms
      14.9 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=162.0ms dur=21.0ms
      20.9 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=237.6ms dur=56.9ms
      56.3 FunctionCall 1kgrt2f4mrm63.js fn=z
TASK ts=294.5ms dur=31.4ms
      29.3 FireAnimationFrame 1d5kkip1hlg-o.js fn=tf
TASK ts=327.8ms dur=32.9ms
      32.9 FunctionCall 1kgrt2f4mrm63.js fn=z
       2.4 MinorGC
TASK ts=360.8ms dur=11.7ms
       3.4 UpdateLayoutTree
       3.1 Layout
```

The staged module work is split into 23–33 ms chunks. The remaining 56–61 ms task is the React/UI
mount path (`1kgrt2f4mrm63.js`), not module evaluation.

## FPS startup (AC2 reading)

One run per path, 5 s after engagement, 4x CPU. Exit 6 is recorded as a failed AC2 reading, not a
task failure, per T010's Check.

| Path | FPS | Dropped frames | Long tasks | Max long task | Verdict |
|---|---:|---:|---:|---:|---|
| home / move | 4.364 | 1 | 1 | 62.450 ms | FAIL |
| project / move | 4.357 | 6 | 1 | 57.883 ms | FAIL |
| project / click | 4.570 | 6 | 1 | 57.946 ms | FAIL |

## Parity, site probe and axe

- `perf:parity --serve apps/web/out --compare evidence`: **PASS**, 8/8 shots at **0 px**.
- `site:probe --serve apps/web/out`: **PASS**; `draws-project` 2 and `draws-hero` 2.
- `a11y:axe:site --serve apps/web/out`: home/PASS and projects/PASS; project serious 0, critical 0,
  moderate 0, minor 0, incomplete 802 across its 24 states. The click label remains synchronous.

## Bundle bytes vs T006 and T009

Gzip is per-file level 9, summed over each scope. The T006 and T009 comparison trees were rebuilt
from `a08f0a5` and `c9aea35` respectively; their manifest totals reproduced the committed values
(1,771,865 B and 1,570,149 B). Initial scopes are the distinct route script sets. The 3D scope is all
non-initial JS chunks, excluding the three build manifests.

| Scope | T006 raw | T006 gzip | T009 raw | T009 gzip | T010 raw | T010 gzip | Raw delta vs T006 | Raw delta vs T009 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Home initial JS (9 files) | 583,368 | 180,618 | 583,368 | 180,616 | 583,413 | 180,634 | **+45** | **+45** |
| Project initial JS (9 files) | 586,201 | 181,497 | 586,201 | 181,497 | 581,795 | 180,044 | -4,406 | -4,406 |
| Total emitted JS | 1,771,865 | 501,942 | 1,570,149 | 453,326 | 1,581,595 | 459,101 | -190,270 | +11,446 |
| 3D / non-initial JS | 1,181,424 | 318,489 | 979,708 | 269,875 | 995,515 | 277,085 | -185,909 | +15,807 |

The keep rule therefore stops here: one initial scope remains above T006. The remaining regression
is **45 B raw / 16 B gzip on the home route**, not a hidden dynamic-chunk cost.

### Exact initial-chunk source of the 45 B

Eight of the nine home initial files are byte-identical by sha256 between T009 and T010. Only the
content-addressed home route chunk changes:

- T009 `1u93iu5q-9jwi.js`: 3,817 B.
- T010 `2motyjbjw3p_7.js`: 3,862 B, **+45 B**.

The generated route module changed in exactly two places:

```text
T009: let{HeroStage:t}=await e.A(26326); ... u(()=>t)
      26326 maps ["22g2-bd2w2wpe.js", "0-55hduc7aza-.js"]

T010: let{bootHeroStage:t}=await e.A(68348); let i=await t(o);
      ... (0,r.startTransition)(()=>u(()=>i))
      68348 maps ["3to-lt_f5n8rd.js"]
```

`3to-lt_f5n8rd.js` is the dynamic `hero-boot` chunk; its own module maps to the existing
`hero-stage` payload. The +45 B is the minified home-route call site for the extra dynamic boot step
(`bootHeroStage` import/call plus `startTransition`), replacing T009's direct `hero-stage` import.
No staging helper or `STAGES_3D` bytes remain in the initial route chunk.

## Check output

The exact Check block completed with `T010-OK`. Worktree paths below are normalized to `.`; the FPS
exit-6 lines are expected and are recorded without failing the task.

```text
RUN  v5.0.5 ./apps/web

✓ test/interaction-gate.test.ts > interaction gates > return false when the signal is already aborted
✓ test/site-motion-matrix.test.ts > site motion matrix > every app animation row names its reduced-motion twin
✓ test/site-motion-matrix.test.ts > site motion matrix > the only transitions in components use the panel-enter variables
✓ test/no-motion-literals.test.ts > motion-literal scanner > apps/web contains no motion literals
✓ test/no-motion-literals.test.ts > motion-literal scanner > xploder source outside motion/ contains no motion literals
✓ test/no-motion-literals.test.ts > motion-literal scanner > source outside motion/ contains no bare CSS timing shorthands
✓ test/no-motion-literals.test.ts > motion-literal scanner > scanner roots include engine sources
✓ test/no-motion-literals.test.ts > motion-literal scanner > scanner root includes the engine playground
✓ test/no-motion-literals.test.ts > motion-literal scanner > css-time catches its negative control
✓ test/no-motion-literals.test.ts > motion-literal scanner > css-easing catches its negative control
✓ test/no-motion-literals.test.ts > motion-literal scanner > gsap-ease catches its negative control
✓ test/no-motion-literals.test.ts > motion-literal scanner > motion-key catches its negative control
✓ test/no-motion-literals.test.ts > motion-literal scanner > tw-utility catches its negative control
✓ test/no-motion-literals.test.ts > motion-literal scanner > timer catches its negative control
✓ test/no-motion-literals.test.ts > motion-literal scanner > accepts content, tokens and token-backed utilities: motion.durations.explode
✓ test/no-motion-literals.test.ts > motion-literal scanner > accepts content, tokens and token-backed utilities: transition-duration: var(--motion-duration-hover-lift)
✓ test/no-motion-literals.test.ts > motion-literal scanner > accepts content, tokens and token-backed utilities: className="ease-explode transition-colors"
✓ test/no-motion-literals.test.ts > motion-literal scanner > accepts content, tokens and token-backed utilities: <p>the 1990s</p>
✓ test/no-motion-literals.test.ts > motion-literal scanner > accepts content, tokens and token-backed utilities: { label: 'p95', value: '120 ms' }

Test Files  3 passed (3)
Tests  19 passed (19)

home-mobile-light: 0 px
home-mobile-dark: 0 px
home-desktop-light: 0 px
home-desktop-dark: 0 px
project-mobile-light: 0 px
project-mobile-dark: 0 px
project-desktop-light: 0 px
project-desktop-dark: 0 px
parity: PASS (8 shots, 0 px)

PASS draws-project: expected 2 actual mode 2
PASS draws-hero: expected 2 actual mode 2
draws: PASS (2 checks)
site-probe: PASS

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
tools/perf: 24 files, 180 tests passed
packages/xploder: 60 files, 617 tests passed
apps/web: 31 files passed, 1 skipped; 178 tests passed, 2 skipped
T010-OK
```

## Orchestrator review fix (home +45 B)

`startTransition` and the stage setter call moved from `hero-live.tsx` (initial JS) into the dynamic
`hero-boot.ts` (`bootHeroStage(signal, mount)`); `hero-live.tsx` now only does
`await bootHeroStage(signal, setHeroStage)` where it previously imported `hero-stage`.

| Scope | T006 raw | After fix raw | Delta vs T006 |
|---|---:|---:|---:|
| Home initial JS | 583,368 | 583,343 | **−25** |
| Project initial JS | 586,201 | 581,795 | **−4,406** |
| Total emitted JS | 1,771,865 | 1,581,558 | **−190,307** |

(`T010-log-bundle-after.json`.) Re-verified after the fix: web tests 178 passed / 2 skipped; parity 8/8
at 0 px; site:probe PASS; all 14 guards OK; home/move clean ×2 cost 294.0 / 279.4 ms (median 286.7,
`T010-summary-home-move-clean-postfix.json`), fps-startup home 2 dropped frames, max long task 62.2 ms
(unchanged within noise from the pre-fix revision).

**Decision: KEEP** (D6: max long task −19 / −55 / −56 ms vs spreads ≤ 2.6 ms; cost −34…−49 ms; both
initial scopes ≤ T006). AC2 still fails on all paths: one 56–62 ms React mount task remains (see the
task breakdown) and 1–6 dropped frames.
