# T010 revision 1 — side-effect-only stage variants

Status: **V1 selected; both builds pass AC4.** This is a bytes-only comparison. No lever A/B and no
Lighthouse runs were performed, per the revision instruction.

## Method

Each variant changed only `apps/web/build/stage-3d.ts` and the `three-stage-*` / `xploder-stage-*`
files. For every variant, the eager build was measured with:

```sh
pnpm build:eager
pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s117-checks/t010-v<N>-eager.json
node .specify/features/eager-load/bundle-scopes.mjs --budget \
  .specify/features/eager-load/evidence/T001-log-bundle-eager.json \
  /tmp/s117-checks/base-eager /tmp/s117-checks/t010-v<N>-eager.json apps/web/out
```

The gated build repeated the same steps with `pnpm build` and the T001 gated baseline. The chunk
lists below come from the eager manifests and the Turbopack stage-loader arrays. A repeated file in
the final R3F stage is an already-loaded shared dependency.

## Variants

| Variant | Stage layout |
| --- | --- |
| V1 | `three-stage-a`, `three-stage-b`, `three-stage-c`, `three`, `xploder-stage-a`, `xploder-stage-b`, R3F |
| V2 | `three-stage-a` (WebGLRenderer only), `three`, `xploder-stage-a`, `xploder-stage-b`, R3F |
| V3 | `three-stage-a` (all non-renderer surface paths), `three`, `xploder-stage-a`, `xploder-stage-b`, R3F |
| V4 | `three`, `xploder-stage-a`, `xploder-stage-b`, R3F |

## Bytes

`three chunks` counts the chunks loaded by the `three-stage-*` entries only. `largest three chunk`
is the largest of those entry chunks. The bare `three` stage is listed separately because it still
contains the merged three graph in every variant.

| Variant | Eager total raw / gzip delta | Gated total raw / gzip delta | Eager initial gzip delta (home / project) | Gated initial gzip delta (home / project) | Three chunks | Largest three chunk | Bare three chunk | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| V1 | +2,129 / +1,039 B | +1,890 / +958 B | 0 / +472 B | -1 / -2 B | 3 | 146 B | 545,967 B | PASS |
| V2 | +1,373 / +657 B | +1,134 / +580 B | 0 / +471 B | 0 / -1 B | 1 | 146 B | 545,967 B | PASS |
| V3 | +1,373 / +657 B | +1,134 / +580 B | 0 / +471 B | 0 / -1 B | 1 | 146 B | 545,967 B | PASS |
| V4 | +995 / +468 B | +756 / +389 B | +2 / +472 B | +1 / -1 B | 0 | n/a | 545,967 B | PASS |

Limits: initial gzip <= +2,000 B per route; total raw and gzip <= 1% of the T001 baseline.

## Chunk lists

### V1

| Stage | File | Bytes |
| --- | --- | ---: |
| 1 three-stage-a | `1javbi7w5uabw.js` | 146 |
| 2 three-stage-b | `2i5fu5ymftzm1.js` | 146 |
| 3 three-stage-c | `21omevep8pn8z.js` | 146 |
| 4 three | `3vnmkhfgdnq2d.js` | 545,967 |
| 5 xploder-stage-a | `3sazg0aji4_pc.js` | 146 |
| 6 xploder-stage-b | `33fjhx4965huq.js` | 146 |
| 7 R3F | `4388rdi57woly.js` | 536 |
| 7 R3F shared | `3vnmkhfgdnq2d.js` | 545,967 |
| 7 R3F shared | `1d5kkip1hlg-o.js` | 181,183 |

### V2

| Stage | File | Bytes |
| --- | --- | ---: |
| 1 three-stage-a | `1javbi7w5uabw.js` | 146 |
| 2 three | `3vnmkhfgdnq2d.js` | 545,967 |
| 3 xploder-stage-a | `3sazg0aji4_pc.js` | 146 |
| 4 xploder-stage-b | `33fjhx4965huq.js` | 146 |
| 5 R3F | `4388rdi57woly.js` | 536 |
| 5 R3F shared | `3vnmkhfgdnq2d.js` | 545,967 |
| 5 R3F shared | `1d5kkip1hlg-o.js` | 181,183 |

### V3

| Stage | File | Bytes |
| --- | --- | ---: |
| 1 three-stage-a | `1javbi7w5uabw.js` | 146 |
| 2 three | `3vnmkhfgdnq2d.js` | 545,967 |
| 3 xploder-stage-a | `3sazg0aji4_pc.js` | 146 |
| 4 xploder-stage-b | `33fjhx4965huq.js` | 146 |
| 5 R3F | `4388rdi57woly.js` | 536 |
| 5 R3F shared | `3vnmkhfgdnq2d.js` | 545,967 |
| 5 R3F shared | `1d5kkip1hlg-o.js` | 181,183 |

### V4

| Stage | File | Bytes |
| --- | --- | ---: |
| 1 three | `3vnmkhfgdnq2d.js` | 545,967 |
| 2 xploder-stage-a | `3sazg0aji4_pc.js` | 146 |
| 3 xploder-stage-b | `33fjhx4965huq.js` | 146 |
| 4 R3F | `4388rdi57woly.js` | 536 |
| 4 R3F shared | `3vnmkhfgdnq2d.js` | 545,967 |
| 4 R3F shared | `1d5kkip1hlg-o.js` | 181,183 |

## Selection

All four variants pass both builds. V1 has the most three-stage chunks (3), so the worktree is left
on V1 as required by the selection rule.

**Byte result versus execution result:** V1's three stage entries compile to empty 146-byte chunks.
Turbopack tree-shakes every side-effect-only `three/src/...` import because `three` marks those files
side-effect-free in its package metadata. The same applies to V2 and V3; V4 has no three stage. All
three side-effect variants therefore load the unchanged merged three graph from the bare `three`
stage (`3vnmkhfgdnq2d.js`, 545,967 B), not from their three-stage entries. The byte gates pass, but
this selected source does not split three evaluation in the compiled output.

## Exact budget outputs

### V1 eager

```text
home initial gzip             180465      180465           0      2000 B PASS
project initial gzip           179960      180432         472      2000 B PASS
total raw                    1581231     1583360        2129          1% PASS
total gzip                    459006      460045        1039          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V1 gated

```text
home initial gzip             180606      180605          -1      2000 B PASS
project initial gzip           180046      180044          -2      2000 B PASS
total raw                    1581847     1583737        1890          1% PASS
total gzip                    459233      460191         958          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V2 eager

```text
home initial gzip             180465      180465           0      2000 B PASS
project initial gzip           179960      180431         471      2000 B PASS
total raw                    1581231     1582604        1373          1% PASS
total gzip                    459006      459663         657          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V2 gated

```text
home initial gzip             180606      180606           0      2000 B PASS
project initial gzip           180046      180045          -1      2000 B PASS
total raw                    1581847     1582981        1134          1% PASS
total gzip                    459233      459813         580          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V3 eager

```text
home initial gzip             180465      180465           0      2000 B PASS
project initial gzip           179960      180431         471      2000 B PASS
total raw                    1581231     1582604        1373          1% PASS
total gzip                    459006      459663         657          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V3 gated

```text
home initial gzip             180606      180606           0      2000 B PASS
project initial gzip           180046      180045          -1      2000 B PASS
total raw                    1581847     1582981        1134          1% PASS
total gzip                    459233      459813         580          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V4 eager

```text
home initial gzip             180465      180467           2      2000 B PASS
project initial gzip           179960      180432         472      2000 B PASS
total raw                    1581231     1582226         995          1% PASS
total gzip                    459006      459474         468          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

### V4 gated

```text
home initial gzip             180606      180607           1      2000 B PASS
project initial gzip           180046      180045          -1      2000 B PASS
total raw                    1581847     1582603         756          1% PASS
total gzip                    459233      459622         389          1% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 1% of before)
```

## Final validation

Focused test and final gate:

```text
✓ test/stage-3d.test.ts > staged 3D modules > contains the ordered three, xploder and R3F stages
✓ test/stage-3d.test.ts > staged 3D modules > is imported only by boot-3d.ts
✓ test/stage-3d.test.ts > staged 3D modules > three stages side-effect import only paths from three-surface
✓ test/stage-3d.test.ts > staged 3D modules > xploder stages import only public xploder subpaths
Test Files  1 passed (1)
Tests       4 passed (4)
```

```text
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
apps/web typecheck: Done
apps/web lint: Done
All matched files use Prettier code style!
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  235 passed (235)
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  624 passed (624)
apps/web test:  Test Files  33 passed | 1 skipped (34)
apps/web test:       Tests  190 passed | 2 skipped (192)
T010-OK
```

## Orchestrator decision (T010 outcome): L3a reverted

- **V1 is not a split.** V1–V3 "pass" AC4 only because `three` marks its internal modules side-effect-free. Turbopack drops side-effect-only stage imports, so the stage entries compile to empty 146 B chunks and the 545,967 B merged three graph stays one chunk. V1 would keep code that does nothing, so it is rejected.
- **The real split** (re-exporting stages, first pass in `T010-log-l3-ab.md`) is the only variant that splits evaluation. Local emulation: home −111 ms, project −52 ms simulated TBT; each stage evaluation ≤ 9.3 ms locally. **Bytes:** total JS +36,197 raw / +13,327 gzip (+2.3 % / +2.9 %) on eager, and similar on gated. Turbopack had merged three into 39 module groups in one chunk; splitting the graph adds module boundaries and export glue. The two-stage grouping was larger still (+45,453 raw).
- **AC4** (total ≤ +1 %) is inviolable and its budget is not lowered or relaxed (kickoff Hard Rule 7). No offset of ≥ 9 KB gzip exists without a content or visual change. **L3a is therefore reverted**, and `stage-3d.ts` is byte-identical to the base.
- **V4** (xploder staging only) passes bytes, but leaves the 116,597 B viewer chunk as one file (its stage-a holds 3.4 KB of layout/motion/theme), so it cannot split the 39 ms viewer-chunk compile. It is **not kept**: expected Δ below the run spread, and levers are never stacked "just in case" (RFC D4).
- **Recorded for G2:** the largest app-side lever is blocked by AC4. The remaining payoff is L1 (small) and the engine exceptions E1/E2.
