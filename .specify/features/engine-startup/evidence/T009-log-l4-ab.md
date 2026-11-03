# T009 — L4 import trimming A/B

Date: 2026-11-03

Baseline: T006 clean runs, product tree unchanged since T006, same host. After state: this worktree,
production static export, Playwright Chromium `156.0.8078.4`, mobile profile, 4x CPU throttling.
Median = mean of the two raw values. Raw files are `T009-startup-<label>-<engage>-<kind>-r<N>.json`.

## Decision gate

Spike config: `turbopack.resolveAlias = { three: './build/three-surface-spike.ts' }`, where the
throwaway shim re-exported from `three/src/Three.js` and `three/src/constants.js`.

Result: **PASS — exact match**. Turbopack 16.4.3 reported `Compiled successfully`; the shim's two
`three/src/*` requests resolved normally (no recursive alias and no rewrite error). The build then
failed only in TypeScript with TS7016 because `three` ships no declarations for its `src/*` files.
The real shim handles that with a directive on each re-export.

No subpath form, relative `node_modules` path, or `(a)`/`(b)` fallback was needed. The spike config
and shim were removed before implementing the deliverable.

## Shim coverage

`apps/web/build/three-surface.ts` exports 30 names, each from its `three/src/**` module:
the 23 `THREE.*` names found in R3F's `dist/*.js`, every non-type `three` value import in
`packages/xploder/src`, the three xploder JSX constructors (`InstancedMesh`, `AmbientLight`,
`DirectionalLight`), and `REVISION`.

`apps/web/test/three-surface.test.ts` recomputes that union at test time from R3F's dist, xploder's
source imports, and xploder JSX mapped through Three's own export list. It asserts the shim is
exactly that union, that `three-surface` is referenced only by `next.config.ts`, and that exactly one
quoted `REVISION` value exists in the emitted chunks. All 3 tests pass after the build.

## Bundle bytes

Gzip is per-file `gzip -9`, summed over each scope. The 3D chunk is the only emitted JS containing
both `MeshLambertMaterial` and `WebGLRenderer`.

| Scope | Before raw | Before gzip | After raw | After gzip | Raw delta | Gzip delta |
|---|---:|---:|---:|---:|---:|---:|
| 3D chunk | 1,035,388 | 277,455 | 833,672 | 228,824 | -201,716 (-19.48%) | -48,631 (-17.53%) |
| home initial JS (9 files) | 583,368 | 180,618 | 583,368 | 180,616 | 0 | -2 |
| project initial JS (9 files) | 586,201 | 181,497 | 586,201 | 181,497 | 0 | 0 |
| total emitted JS (17 files) | 1,771,865 | 501,942 | 1,570,149 | 453,326 | -201,716 (-11.38%) | -48,616 (-9.69%) |

Before names: `3dxvu8o_bxf8t.js` (3D), `3m37727paud1r.js` (home route), `13ldcbk_x6afb.js`
(project route). After names: `0-55hduc7aza-.js` (3D), `1u93iu5q-9jwi.js` (home route),
`2v1982h__8qff.js` (project route). The route chunks changed only because they reference the new
content-addressed 3D chunk; initial raw bytes are unchanged.

`T009-log-bundle-diff.txt` is the raw manifest diff. It ends `DIFF-FAIL` because
`bundle:manifest --diff` treats the content-hash replacements as added files/scripts even though the
total is 201,716 bytes smaller and both initial route totals are non-growing.

## Clean-run A/B

Values are `median (r1, r2)` in milliseconds. Before is the T006 clean runs; before was not re-measured.

| Path | State | Startup cost | Max long task | Blocking |
|---|---|---:|---:|---:|
| home / move | before | 316.746 (314.891, 318.602) | 102.715 (102.083, 103.346) | 62.981 (63.401, 62.562) |
| home / move | after | 326.960 (356.674, 297.246) | 80.395 (81.569, 79.220) | 44.540 (51.271, 37.809) |
| home / move | delta | +10.214 (+3.22%) | -22.320 (-21.73%) | -18.441 (-29.28%) |
| project / move | before | 375.961 (377.085, 374.836) | 133.978 (133.389, 134.566) | 89.381 (88.070, 90.691) |
| project / move | after | 364.436 (369.588, 359.284) | 112.871 (114.233, 111.509) | 67.913 (69.853, 65.972) |
| project / move | delta | -11.525 (-3.07%) | -21.107 (-15.75%) | -21.468 (-24.02%) |
| project / click | before | 392.280 (398.184, 386.376) | 140.597 (143.015, 138.179) | 96.806 (100.389, 93.224) |
| project / click | after | 371.169 (373.294, 369.043) | 112.152 (112.690, 111.613) | 67.946 (68.543, 67.349) |
| project / click | delta | -21.112 (-5.38%) | -28.446 (-20.23%) | -28.861 (-29.81%) |

Run spread (max - min):

| Metric | home before | home after | project move before | project move after | project click before | project click after |
|---|---:|---:|---:|---:|---:|---:|
| startup cost | 3.711 | 59.428 | 2.249 | 10.304 | 11.808 | 4.251 |
| max long task | 1.263 | 2.349 | 1.177 | 2.724 | 4.836 | 1.077 |
| blocking | 0.839 | 13.462 | 2.621 | 3.881 | 7.165 | 1.194 |

The after cost spread on home/move is the one outlier. The after cost spreads on project/move and
project/click are 2.83% and 1.15% of their medians. The harness summaries flag other tiny-phase
spreads (P0, blocking, P6/P7/texture), not the target-path cost median.

## Attributed project/move

Values are `median (r1, r2)` in milliseconds.

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| P2 wall interval | 145.528 (144.415, 146.641) | 122.447 (124.029, 120.864) | -23.082 |
| P2 main-thread | 0.602 (0.262, 0.942) | 1.338 (1.129, 1.546) | +0.736 |
| P3 wall interval | 134.650 (133.700, 135.600) | 112.250 (114.200, 110.300) | -22.400 |
| P3 main-thread | 134.650 (133.700, 135.600) | 112.250 (114.200, 110.300) | -22.400 |
| total startup cost | 376.027 (378.826, 373.227) | 353.689 (356.475, 350.902) | -22.338 |

P2/P3 spread: before P3 range = 1.900 ms; after P3 range = 3.900 ms. The 22.400 ms P3 reduction is
more than five times the larger spread. Benchmark index range across all after runs: 4155-4220.

## Keep / revert (D6)

**KEEP.** The primary AC3 route is project/move. Its clean startup-cost delta is **11.525 ms**, larger
than the larger of the two state spreads (**10.304 ms**). Project/click also passes D6
(**21.112 ms** delta vs **11.808 ms** spread). The isolated project/move P3 reduction is **22.400 ms**
against a **3.900 ms** larger spread.

Home/move total cost is inconclusive because non-P3 work moved in the opposite direction
(`otherMs` 246.526 after vs 214.039 before), but its P2 main-thread work fell by about 22.3 ms and its
max long task fell by 22.320 ms, both above the corresponding spread. The dominant mechanism is the
same on all three paths: shorter module evaluation. No product file outside T009's list changed.

## Visual, accessibility and draw calls

- Parity: 8/8 shots, **0 px** each (`pnpm perf:parity --serve apps/web/out --compare ...`).
- Axe site, invoked with its required target (`--serve apps/web/out`): 0 serious, 0 critical,
  0 moderate, 0 minor; incomplete findings are reported by the existing matrix.
- `engine:probe http://127.0.0.1:4321/ --scope s4`: PASS; fixture a/b/c draw calls each `2`.
- Fixture export was built, probed, then the production export was rebuilt.

## Check status and blocker

The exact T009 block was run with `bash -lc 'set -euo pipefail; ...'` from the worktree root.

- `pnpm build`: PASS.
- The three targeted test files: **23/23 PASS** (including all 3 shim tests).
- Bundle manifest write: PASS, total 1,570,149 bytes.
- Bundle diff: **exit 6 / `DIFF-FAIL`** on the content-hash rename, as described above. With
  `set -euo pipefail`, this stops the literal block before parity, axe, guards and the final chain.
- The literal `pnpm a11y:axe:site` line has no URL or `--serve`; run alone it exits 2 with
  `error: expected exactly one URL or --serve <dir>`. It cannot print `T009-OK` as written.

The intended remainder was run separately and passed: parity 8/8 at 0 px; axe-site with
`--serve apps/web/out` at 0 findings; all 14 guards (`FROZEN-OK` through `GITLEAKS-OK`);
`pnpm typecheck`; `pnpm lint` (including Prettier); `pnpm test` with tools/perf 180/180,
xploder 617/617, and web 171 passed + 1 skipped.

Targeted test output copied from `/tmp/s115-checks/t009.txt` (worktree path normalized to `.`):

```text
RUN  v5.0.5 ./apps/web
✓ test/prod-imports.test.ts (2 tests)
✓ test/package-consumer.test.ts (18 tests)
✓ test/three-surface.test.ts (3 tests)

Test Files  3 passed (3)
     Tests  23 passed (23)
```

Exact check tail:

```text
TOTAL-JS 1771865 -> 1570149 (-201716)
ADDED-JS _next/static/chunks/0-55hduc7aza-.js bytes=833672
REMOVED-JS _next/static/chunks/13ldcbk_x6afb.js bytes=6650
ADDED-JS _next/static/chunks/1u93iu5q-9jwi.js bytes=3817
ADDED-JS _next/static/chunks/2v1982h__8qff.js bytes=6650
REMOVED-JS _next/static/chunks/3dxvu8o_bxf8t.js bytes=1035388
REMOVED-JS _next/static/chunks/3m37727paud1r.js bytes=3817
ADDED-SCRIPT / /_next/static/chunks/1u93iu5q-9jwi.js
REMOVED-SCRIPT / /_next/static/chunks/3m37727paud1r.js
ADDED-SCRIPT /projects/websocket-inspector /_next/static/chunks/2v1982h__8qff.js
REMOVED-SCRIPT /projects/websocket-inspector /_next/static/chunks/13ldcbk_x6afb.js
DIFF-FAIL
```

Blocker for the literal `T009-OK` gate: making `bundle:manifest --diff` accept a content-addressed
rename requires changing `tools/perf/src/bundle-manifest.ts`, which T009 does not list; replacing the
missing axe target requires either changing that CLI or supplying an argument not present in the
literal block. Neither was changed.
