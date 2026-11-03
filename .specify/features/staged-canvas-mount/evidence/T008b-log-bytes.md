# T008b — compact staged-renderer code and measure bytes / behaviour

Date: 2026-11-03

Lever: `470acd8` — `S11.6/T008b: compact the staged-renderer code (bytes, same behaviour)`.

The viewer now uses one `nextTask()` helper (`scheduler.yield()`, otherwise a timer task with no delay), one
`createStagedRenderer` construction/config yield pair, and one inline `useState` factory. The factory calls a
`useReducer` bump after `createStagedRenderer` resolves. There is no idle-callback path, mounted flag, or
factory-settling microtask chain.

All measurements ran sequentially against the local production export. Chromium was `156.0.8078.4`, the
profile was mobile with 4x CPU throttling, and the host was otherwise quiet. Clean-run `benchmarkIndex`
values were 4,200–4,302.5; attributed-run values were 4,213–4,243.

## 1. Bytes

`bundle-scopes.mjs` used T004's emitted manifest and `base-out` as the baseline. T006's numbers are the
committed after-state from `T006-log-l4-ab.md`; no T006 rebuild was required.

| Scope | T004 raw | T008b raw | Raw Δ vs T004 | T006 raw | Raw Δ vs T006 | T004 gzip | T008b gzip | Gzip Δ vs T004 | T006 gzip | Gzip Δ vs T006 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| home initial | 583,343 | 583,343 | 0 | 583,343 | 0 | 180,606 | 180,606 | 0 | 180,605 | +1 |
| project initial | 581,795 | 581,795 | 0 | 581,795 | 0 | 180,044 | 180,046 | +2 | 180,045 | +1 |
| total emitted JS | 1,581,558 | 1,581,847 | +289 | 1,582,324 | -477 | 459,097 | 459,233 | +136 | 459,408 | -175 |
| non-initial 3D JS | 995,971 | 996,260 | +289 | 996,737 | -477 | 277,414 | 277,548 | +134 | 277,725 | -177 |

The task's keep condition is a byte shrink versus T006. Every raw scope is flat or smaller; total and
non-initial gzip shrink by 175/177 bytes, while each initial gzip scope grows by 1 byte. Versus T004,
`bundle-scopes.mjs` still reports growth in total/non-initial because 289 raw / 136 gzip bytes remain from
the staged-mount behaviour. That residual is recorded for T009; the AC3 gate is not relaxed here.

Artifacts: `T008b-log-bundle.json`, plus this run's bundle manifest in the check log.

## 2. A/B — startup clean

`time to first content frame` is `firstFrame - t0` (D-P3). Before values are T006's committed after-runs.
Medians are the mean of two runs. The larger range is computed across both states' raws.

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | time to first content frame (ms) | 320.050 (344.000, 296.100) | 317.200 (341.000, 293.400) | -2.850 | 50.600 | no |
| home-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0 | no |
| home-move | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | cost (ms) | 305.015 (337.188, 272.843) | 303.503 (330.132, 276.874) | -1.512 | 64.345 | no |
| project-move | time to first content frame (ms) | 332.150 (333.200, 331.100) | 318.900 (334.300, 303.500) | -13.250 | 30.800 | no |
| project-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0 | no |
| project-move | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | cost (ms) | 322.303 (323.063, 321.544) | 322.935 (327.430, 318.439) | +0.631 | 8.991 | no |
| project-click | time to first content frame (ms) | 352.350 (355.100, 349.600) | 359.100 (364.400, 353.800) | +6.750 | 14.800 | no |
| project-click | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0 | no |
| project-click | blocking (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | cost (ms) | 334.882 (337.621, 332.143) | 334.406 (337.417, 331.395) | -0.476 | 6.226 | no |

The home-move and project-move first pairs were spread-flagged by P0 (45.8% and 140.8%); the pair was
repeated and all runs are kept:

| Path | Pair | first-content median (raws) | cost median (raws) | spread flagged |
|---|---|---:|---:|---|
| home-move | repeat | 294.350 (293.600, 295.100) | 275.390 (278.785, 271.995) | no |
| project-move | repeat | 319.550 (307.900, 331.200) | 324.794 (326.762, 322.825) | yes (P0) |

**D-P3 verdict:** the factory still schedules the default-lane re-render after the renderer resolves, as
asserted by `staged-mount.test.tsx`. No 300 ms retry regression appears: first-content changes are within
the combined raw ranges, and the largest positive change (project-click, +6.750 ms) is below the 14.800 ms
range.

## 3. A/B — fps-engine startup

| Path | Metric | Before median (raws) | After median (raws) | Δ | Larger raw range | Δ exceeds range |
|---|---|---:|---:|---:|---:|---|
| home-move | dropped frames | 1.5 (1, 2) | 2.0 (2, 2) | +0.5 | 1 | no |
| home-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| home-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0 | no |
| project-move | dropped frames | 5.0 (4, 6) | 4.5 (4, 5) | -0.5 | 2 | no |
| project-move | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-move | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0 | no |
| project-click | dropped frames | 5.5 (5, 6) | 6.0 (6, 6) | +0.5 | 1 | no |
| project-click | max long task (ms) | 0.000 (0.000, 0.000) | 0.000 (0.000, 0.000) | 0.000 | 0.000 | no |
| project-click | long tasks | 0 (0, 0) | 0 (0, 0) | 0 | 0 | no |

### Per-run dropped-frame timeline

All times are milliseconds after engagement. `tasksOver16ms` is quoted as `start+dur`.

| Run | droppedFrameTimes | tasksOver16ms |
|---|---|---|
| home-move r1 | 270.023, 286.689 | 213.112+26.679; 239.794+28.958; 270.429+29.906 |
| home-move r2 | 225.623, 242.289 | 166.800+27.336; 194.150+29.366; 225.145+29.548 |
| project-move r1 | 179.455, 262.785, 279.451, 296.117 | 182.001+17.290; 210.834+26.506; 237.348+31.101; 270.628+32.480 |
| project-move r2 | 170.441, 187.107, 253.771, 270.437, 287.103 | 179.938+17.101; 207.604+25.881; 233.492+31.734; 265.907+33.859 |
| project-click r1 | 227.174, 243.840, 260.506, 277.172, 310.504, 327.170 | 222.724+16.999; 249.435+25.513; 274.955+33.335; 309.871+34.447 |
| project-click r2 | 227.381, 244.047, 260.713, 277.379, 310.711, 327.377 | 249.059+25.342; 274.412+31.372; 307.405+33.569 |

## 4. Visual, draws and hero

Parity against the T004 baseline: **0 px on all 8 shots**, `parity: PASS (8 shots, 0 px)`. Artifact:
`T008b-log-parity.json`.

Site probe: project draws **2 calls on 32/32** rendered frames; hero draws **2 calls on 40/40**; hero probe
**7/7 pass**. The hero poster remains the first paint, the canvas is revealed only after interaction, and
the project poster retains its static Explore control.

```text
draws project: mode=2 rendered=32 total=32 PASS
draws hero: mode=2 rendered=40 total=40 PASS
hero: PASS (7 checks)
site-probe: PASS
```

## 5. AC4 sequence vs T004 §5

One attributed startup run per path (`--attribute --runs 1`).

| Path | firstInstancedDraw t / raf | ready t / raf | Same rAF | liveStates | Draw before ready |
|---|---|---|---|---|---|
| home-move | 2614.600 / 12 | 2615.500 / 12 | yes | idle → loading → revealed | no |
| project-move | 2572.300 / 14 | 2573.300 / 14 | yes | loading → revealed | no |
| project-click | 2604.100 / 15 | 2605.500 / 15 | yes | loading → revealed | no |

This matches T004 §5: `ready.raf === firstInstancedDraw.raf`, no instanced draw before ready, and the same
live-state order on both route types.

## 6. Keep decision

**Keep.** Bytes shrink versus T006 in every raw scope and in total/non-initial gzip, and none of the keep-rule
metrics (max long task, dropped frames, blocking, cost) regresses beyond the larger run spread. Parity is
0 px and the AC4 sequence is unchanged. The remaining +289 raw / +136 gzip versus T004 is recorded for the
T009 AC3 gate; it is not hidden or waived.

## 7. Remaining blockers

### Tasks above 50 ms

None. Every startup FPS run has `maxLongTaskMs: 0` and an empty `longTasks` array.

### Every dropped frame and its task

| Run | Dropped (ms) | Task it falls in (start+dur) |
|---|---:|---|
| home-move r1 | 270.023 | no >16.7 ms task; follows #4 239.794+28.958 by 30.229 ms; next #5 starts 270.429 |
| home-move r1 | 286.689 | inside #5 270.429+29.906 |
| home-move r2 | 225.623 | inside #4 225.145+29.548 |
| home-move r2 | 242.289 | inside #4 225.145+29.548 |
| project-move r1 | 179.455 | no >16.7 ms task; follows #3 97.328+19.552 by 82.127 ms; next #4 starts 182.001 |
| project-move r1 | 262.785 | inside #6 237.348+31.101 |
| project-move r1 | 279.451 | inside #7 270.628+32.480 |
| project-move r1 | 296.117 | inside #7 270.628+32.480 |
| project-move r2 | 170.441 | no >16.7 ms task; follows #2 41.874+31.775 by 128.567 ms; next #3 starts 179.938 |
| project-move r2 | 187.107 | inside #3 179.938+17.101 |
| project-move r2 | 253.771 | inside #5 233.492+31.734 |
| project-move r2 | 270.437 | inside #6 265.907+33.859 |
| project-move r2 | 287.103 | inside #6 265.907+33.859 |
| project-click r1 | 227.174 | inside #5 222.724+16.999 |
| project-click r1 | 243.840 | no >16.7 ms task; follows #5 222.724+16.999 by 21.116 ms; next #6 starts 249.435 |
| project-click r1 | 260.506 | inside #6 249.435+25.513 |
| project-click r1 | 277.172 | inside #7 274.955+33.335 |
| project-click r1 | 310.504 | inside #8 309.871+34.447 |
| project-click r1 | 327.170 | inside #8 309.871+34.447 |
| project-click r2 | 227.381 | no >16.7 ms task; follows #4 136.822+21.871 by 90.559 ms; next #5 starts 249.059 |
| project-click r2 | 244.047 | no >16.7 ms task; follows #4 136.822+21.871 by 107.225 ms; next #5 starts 249.059 |
| project-click r2 | 260.713 | inside #5 249.059+25.342 |
| project-click r2 | 277.379 | inside #6 274.412+31.372 |
| project-click r2 | 310.711 | inside #7 307.405+33.569 |
| project-click r2 | 327.377 | inside #7 307.405+33.569 |

### Tasks above 16.7 ms after t0 + 150 ms

| Run | Tasks (start+dur) |
|---|---|
| home-move r1 | 213.112+26.679; 239.794+28.958; 270.429+29.906 |
| home-move r2 | 166.800+27.336; 194.150+29.366; 225.145+29.548 |
| project-move r1 | 182.001+17.290; 210.834+26.506; 237.348+31.101; 270.628+32.480 |
| project-move r2 | 179.938+17.101; 207.604+25.881; 233.492+31.734; 265.907+33.859 |
| project-click r1 | 222.724+16.999; 249.435+25.513; 274.955+33.335; 309.871+34.447 |
| project-click r2 | 249.059+25.342; 274.412+31.372; 307.405+33.569 |

## 8. Defect checks and commands

- **D-P1:** `pnpm bundle:manifest --out-dir apps/web/out --write <file>` was used, then
  `bundle-scopes.mjs` consumed the manifest and export.
- **D-P2:** `fps:engine` returned its expected exit 6 on each run; the verdict and raw metrics were read from
  `fps.json`.
- **D-P3:** time to first content is reported above as `firstFrame - t0`; the settle-render assertion and the
  attributed sequence both pass.

Commands (from the worktree root):

```sh
pnpm build
pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s116-checks/t008b-manifest.json
node .specify/features/staged-canvas-mount/bundle-scopes.mjs \
  .specify/features/staged-canvas-mount/evidence/T004-log-bundle.json /tmp/s116-checks/base-out \
  /tmp/s116-checks/t008b-manifest.json apps/web/out
pnpm perf:startup --serve apps/web/out --route <path> --engage <kind> --runs 2 --out <dir>
pnpm fps:engine --scenario startup --route <path> --engage <kind> --no-build --out <dir>
pnpm perf:startup --serve apps/web/out --route <path> --engage <kind> --attribute --runs 1 --out <dir>
pnpm perf:parity --serve apps/web/out --compare /tmp/s116-checks/baseline-shots
pnpm site:probe --serve apps/web/out --group draws --group hero
```

## 9. Check output

$ pnpm -r --if-present build
$ pnpm og:build && next build
$ tsx --tsconfig scripts/tsconfig.og.json scripts/build-og.ts
public/og/home.png 74310 bytes 56ae1db92d7d0affd771961ea6adfd5bec24b33140d8af945c38c126ecadc669
public/og/projects.png 69640 bytes 53c61f75d8e14a30afac818daac98d429c016a96dd65f7b6bc6bd028fca91d22
public/og/projects/websocket-inspector.png 79743 bytes 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3
public/apple-touch-icon.png 1186 bytes e1bd7bbd3011681f91cadb506f95e534398df9d1fc466a78953eb7613434a51b
▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 11ms

  Creating an optimized production build ...
✓ Compiled successfully in 115ms
  Running TypeScript ...
  Finished TypeScript in 758ms ...
  Collecting page data using 9 workers ...
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
  Generating static pages using 9 workers (0/8) ...
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
SITE_URL is not set; using http://localhost:3000 for this local build. Set SITE_URL=https://example.com for a public build.
  Generating static pages using 9 workers (2/8) 
  Generating static pages using 9 workers (4/8) 
  Generating static pages using 9 workers (6/8) 
✓ Generating static pages using 9 workers (8/8) in 266ms
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

$ node tools/perf/src/cli/bundle-manifest.ts --out-dir apps/web/out --write /tmp/s116-checks/t008b-final-manifest.json
bundle-manifest: 22 JS files, 1581847 bytes
routes: 5
wrote: /tmp/s116-checks/t008b-final-manifest.json
Bundle scope delta: .specify/features/staged-canvas-mount/evidence/T004-log-bundle.json + /tmp/s116-checks/base-out -> /tmp/s116-checks/t008b-final-manifest.json + apps/web/out
Scope              Before raw   After raw   Raw delta Before gzip  After gzip  Gzip delta
home initial           583343      583343           0      180606      180606           0
project initial        581795      581795           0      180044      180046           2
total                 1581558     1581847         289      459097      459233         136
non-initial 3D         995971      996260         289      277414      277548         134
RESULT: FAIL (at least one scope grew in raw or gzip bytes)
T008B-BYTES-OK {
  rawDeltaVsT004: '289',
  gzipDeltaVsT004: '136',
  totalRaw: '1581847',
  totalGzip: '459233',
  t006Raw: 1582324,
  t006Gzip: 459408
}
T008B-BEHAVIOUR-OK longTasks=0 parity=0px/8 ac4=same-raf
FROZEN-OK
BRIEF-HISTORY-OK
XPLODER-SRC-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
REBASELINE-FIRST-OK
DEV-ROUTES-OK
S8-TOOLS-OK
CI-JOBS-OK
VERSIONS-OK
GITLEAKS-OK
$ pnpm -r --if-present typecheck
packages/xploder typecheck$ tsc --noEmit
tools/perf typecheck$ tsc --noEmit
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
tools/perf test$ vitest run
packages/xploder test$ vitest run
packages/xploder test: 
packages/xploder test:  RUN  v5.0.5 ./packages/xploder
packages/xploder test: 
packages/xploder test: (node:63648) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63647) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63650) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  RUN  v5.0.5 ./tools/perf
tools/perf test: 
packages/xploder test: (node:63669) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
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
packages/xploder test: (node:63683) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63685) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63693) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63714) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63717) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
packages/xploder test: (node:63731) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
packages/xploder test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
packages/xploder test: (Use `node --trace-deprecation ...` to show where the warning was created)
tools/perf test: 
tools/perf test:  Test Files  26 passed (26)
tools/perf test:       Tests  191 passed (191)
tools/perf test:    Start at  19:06:19
tools/perf test:    Duration  2.21s (import 68%, transform 19%, tests 12%, worker 1%)
tools/perf test: 
tools/perf test: Done
packages/xploder test: 
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  624 passed (624)
packages/xploder test:    Start at  19:06:19
packages/xploder test:    Duration  7.23s (tests 73%, import 19%, transform 7%, worker 1%)
packages/xploder test: 
packages/xploder test:     Isolate  61 workers spawned · ~84ms startup each (spawn + environment, per file)
packages/xploder test:              at least ~484ms faster with isolate: false — reuses workers across files instead of one per file
packages/xploder test: 
packages/xploder test: Done
apps/web test$ vitest run
apps/web test: 
apps/web test:  RUN  v5.0.5 ./apps/web
apps/web test: 
apps/web test: (node:63771) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: (node:63779) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
apps/web test: Replace `const THREE = require("three")` with `import * as THREE from "three"`.
apps/web test: (Use `node --trace-deprecation ...` to show where the warning was created)
apps/web test: 
apps/web test:  Test Files  32 passed | 1 skipped (33)
apps/web test:       Tests  182 passed | 2 skipped (184)
apps/web test:    Start at  19:06:26
apps/web test:    Duration  1.15s (import 27%, environment 25%, transform 24%, tests 22%, worker 2%)
apps/web test: 
apps/web test:     Isolate  33 workers spawned · ~130ms startup each (spawn + environment, per file)
apps/web test:              at least ~347ms faster with isolate: false — reuses workers across files instead of one per file
apps/web test: 
apps/web test: Done
T008b-OK

## 10. S8 re-seal

The S8 generator is based at the lever commit `470acd8`; its manifest diff changes only `base`, `note`,
and the `src/react/TeardownViewer.tsx` hash. The exact diff is in `T008b-log-reseal-s8.txt`.
