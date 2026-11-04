# T010 — L3a staged module evaluation

Status: **BLOCKED on AC4 bytes**. The staged evaluation works and the local keep-rule metric
improves on both routes, but the total-JS budget fails on both builds. L3b (idle prefetch) was
pre-skipped by D-P3 and is not implemented.

## Change

`STAGES_3D` is now:

```text
three-stage-a -> three-stage-b -> three-stage-c -> three -> xploder-stage-a -> xploder-stage-b -> @react-three/fiber
```

- `apps/web/build/three-stage-a.ts`: constants, math, core, cameras, lights and scene.
- `apps/web/build/three-stage-b.ts`: geometries, materials and objects.
- `apps/web/build/three-stage-c.ts`: `WebGLRenderer`.
- `apps/web/build/xploder-stage-a.ts`: public `xploder/layout`, `xploder/motion`, `xploder/theme` values.
- `apps/web/build/xploder-stage-b.ts`: public `xploder` core marker (`XPLODER_VERSION`).
- `apps/web/build/stage-3d.ts`: ordered stage list.
- `apps/web/test/stage-3d.test.ts`: order, three-surface membership and public-xploder checks.
- `apps/web/test/boot-3d.test.ts`: verifies one yield after every configured stage.

The existing viewer/client import remains after `STAGES_3D` in `hero-boot.ts` and
`workbench-boot.ts`; `loadStaged`/`yieldToMain` are unchanged. No `packages/xploder` file changed.

## Chunk map

The eager manifest emits 31 JS files, 1,617,428 bytes. Each stage entry is a separate chunk; shared
dependency chunks are reused by the later stages. Full size list: `T010-log-chunks.txt`.

| Order | Stage entry chunk | Bytes | Dependencies added by this stage |
| ---: | --- | ---: | --- |
| 1 | `41_nv2rd_1mc0.js` | 688 | `2cmb3hh2qt4ru.js` 83,162; `2c6ejsunauw91.js` 14,467 |
| 2 | `35-o31wt_-fi0.js` | 5,453 | `43c0tgtm5fya-.js` 50,735 (`2cmb3hh2qt4ru.js` shared) |
| 3 | `40t85hbp2bgnv.js` | 7,781 | `3rtgqd1wp9qbj.js` 390,554 (earlier dependencies shared) |
| 4 | `1p0s0u1en1zzu.js` | 20,009 | graph already evaluated |
| 5 | `0pb67l6o_2foa.js` | 3,372 | xploder layout/motion/theme |
| 6 | `0wryfjqvjmyv2.js` | 179 | xploder core marker |
| 7 | `4388rdi57woly.js` | 536 | R3F graph already evaluated |

The stage chunks are distinct files, and each `STAGES_3D` entry has its own `import()` followed by
`yieldToMain`. The final client chunks remain separate: `0gi51jqiq5o0-.js` 3,489 B (hero stage),
`18jpa178m80gm.js` 3,530 B (workbench stage), `235_4bwr5p062.js` 116,597 B (xploder viewer) and
`1y81jgf1iz4ib.js` 144,243 B (workbench content).

## Bytes

The exact `bundle-scopes.mjs --budget` check against T001:

```text
eager: initial home gzip +0 B PASS; project gzip +471 B PASS;
       total raw +36,197 B FAIL; total gzip +13,327 B FAIL
gated: initial home gzip -1 B PASS; project gzip -1 B PASS;
       total raw +40,360 B FAIL; total gzip +15,168 B FAIL
```

The total limits are 1% (15,812 B raw / 4,590 B gzip for these manifests). This is not stale cache:
a clean eager rebuild produced the same 1,617,428-byte total. Fewer-stage trials did not improve it;
the two-stage grouping was larger (+45,453 B raw). This is Turbopack's split-graph overhead, so the
task's budget criterion remains unmet.

## Attribution and keep rule

The T006 slow-runner AC1 baseline observed 33.8 ms for the single three evaluation and 39 ms for the
xploder viewer. On the local M4 profile, the staged eager build has separate `EvaluateScript` tasks
(V8 `v8.compile` in parentheses):

| Stage | Home eval | Project eval |
| --- | ---: | ---: |
| three-stage-a (`2cmb...` + `2c6e...`) | 3.596 ms (1.298 ms) | 3.683 ms (1.299 ms) |
| three-stage-b (`43c0...`) | 2.036 ms (0.813 ms) | 1.946 ms (0.741 ms) |
| three-stage-c (`3rtg...`) | 9.307 ms (5.446 ms) | 9.267 ms (5.401 ms) |
| xploder-stage-a (`0pb...`) | 0.230 ms (0.068 ms) | 0.197 ms (0.060 ms) |
| xploder-stage-b (`0wry...`) | 0.057 ms (0.019 ms) | 0.073 ms (0.020 ms) |
| viewer (`235...`) | 3.407 ms (1.507 ms) | 1.531 ms (1.488 ms) |

`perf:attribution` did not match these short local tasks to Lighthouse long tasks (the before state
also reports `observed: not matched` for these chunks), so the numbers above were read from the same
profile trace's `EvaluateScript`/`v8.compile` events. The split is real: no stage evaluation exceeds
12.5 ms locally, and the original single three task is gone.

Local A/B (`T007-ab` before, `T010-ab` after):

| Metric | Before median | After median | Delta | Spread limit | Rule |
| --- | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home | 272.58 ms | 161.63 ms | 110.95 ms | 35.16 ms | KEEP |
| eager simulated TBT /project | 319.50 ms | 267.50 ms | 52.00 ms | 42.00 ms | KEEP |
| max long task /home | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | no measurable win |
| max long task /project | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | no measurable win |
| dropped frames /home | 2 | 2 | 0 | 0 | no measurable win |
| dropped frames /project | 2 | 2 | 0 | 0 | no measurable win |

The full table and raw Lighthouse/FPS/probe artifacts are in `T010-ab/ab.md` and `T010-ab/`.

## Parity, probes and tests

- Eager post-engagement parity: 8/8 shots, 0 differing pixels.
- Gated rest-state parity: 8/8 shots, 0 differing pixels.
- Normal and reduced-motion eager probes: PASS (2 runs each route).
- `eager:probe` normal: home and project 2/2 PASS; reduced motion: home and project 2/2 PASS.
- `site:probe --group draws --group hero`: PASS (7 checks).
- Startup sequence: project 2 runs (335.2 ms median main-thread cost); home 2 runs (286.3 ms).
- `guards.sh`: 11/11 OK, including `XPLODER-EMPTY`, `APP-TOUCH`, `BASELINE-FIRST`, `BUDGETS` and `GITLEAKS`.
- `pnpm typecheck`: PASS; `pnpm lint` (including Prettier): PASS.
- `pnpm test`: tools/perf 235/235, packages/xploder 624/624, apps/web 190 passed / 2 skipped.

## Check output tail

The exact T010 block ran through the focused tests, eager build, both routes' Lighthouse/attribution,
FPS, probes and eager parity, then stopped at the byte gate:

```text
home initial gzip             180465      180465           0      2000 B PASS
project initial gzip           179960      180431         471      2000 B PASS
total raw                    1581231     1617428       36197          1% FAIL
total gzip                    459006      472333       13327          1% FAIL
RESULT: FAIL (a budgeted scope exceeded its byte budget)
```

Consequently the literal block did **not** print `T010-OK`. The remaining gated parity, sequence,
guards and full test suite were completed separately; the gated byte result is recorded above.

## Human action

The orchestrator must choose whether to accept a byte-budget exception, rework/merge the stage split
(which weakens the task-size win), or revert T010. No files outside the T010 allowlist were changed.
