# Implementation Plan: S14 Engine & Hero Polish

**Feature dir:** `.specify/features/engine-polish/` · **Branch:** `task/s14-engine-polish` · **Date:** 2026-11-14 · **Inputs:** `spec.md`, `rfc.md` (approved; §14 Gate 1: all defaults + R1–R5)

## Summary

Six independent defects, each fixed test-first in the order I-09 → I-10 → I-03 → I-05 → I-04 → I-08. Each item lands as:

**red test commit → fix commit (green) → re-seal commit (only if a sealed file changed) → evidence.**

Only three sealed surfaces change, each once:

- **S5 and S8:** in I-09.
- **S6:** in I-05.

Everything else is app code (`hero-section.tsx`, `hero-loop.ts`), tooling (`site-probe.ts`, an S10 file), a dependency patch (R3F) and CI file deletions. S2, S3, S4 and S7 stay byte-identical.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16 static export, three 0.186.1, @react-three/fiber 9.8.2, Node 24, pnpm 12.15 |
| New deps | none (`THREE.Timer` is in `three`) |
| Tests | vitest (`packages/xploder/test`, `apps/web/test`, `tools/perf/test`); `site:probe`, `engine:probe`, `eager:probe`, `perf:parity`, `a11y:axe:site` on `apps/web/out`; feature scripts in `rfc-repro/` and this dir; `guards.sh` |
| Base | `a9edbfc` (S14 freeze). Seal bases at start: S2/S4 `3aee8fc`, S5 `51d3fa7`, S6 `057d89a`, S7 `5b22987`, S8 `470acd8` |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; S2/S4/S7 manifest paths; the 21 S3 tool files (RFC §9.3); every S5/S6/S8 path not on the approved list |
| Approved sealed edits | `src/interaction/emphasis.ts`, `src/react/scene/Emphasis.tsx`, `src/react/TeardownViewer.tsx`, `src/overlay/model.ts` (+ their new tests, `.paths`, manifests, generators, `frozen-surface.test.ts` expectations) |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. Six items, nothing else. Drive-by refactors are blocked by `ALLOWED-PATHS-OK`. |
| II. Static-only | No runtime added. The R3F patch is build-time dependency code. |
| III. Performance is a feature | No new client code paths. The Lighthouse, weight, draw-call and eager-hero gates re-run on the final head. |
| IV. Single motion source | No motion values added. I-03 reuses the existing step delays, and `no-motion-literals` stays green. |
| V. Theme integrity | No colour added. `selected` reuses the hover tint. |
| VI. Evidence over assertion | Every AC has a machine artifact (RFC §10; task Evidence lines). |
| VII. No secrets | gitleaks in CI; `gitleaks dir` on new prose and evidence before each commit. |

## Project Structure

### Documentation (this feature)

```
.specify/features/engine-polish/
  rfc.md · spec.md · plan.md · tasks.md · guards.sh · approved-xploder-src.txt
  rfc-repro/  (Stage 1 repro scripts; reused as baselines)
  tour-timing.mjs · pause-events.mjs · overlap-matrix.mjs · corner-marks.mjs · required-contexts.sh
  evidence/   T<NNN>-* per EVIDENCE.md, AC-selfcheck.md
```

### Source code (changes only)

```
packages/xploder/
  src/interaction/emphasis.ts            EDIT  optional `selected` lit alongside `highlight`                  [I-09, S5]
  src/react/scene/Emphasis.tsx           EDIT  forward `selected` to emphasisTargets                          [I-09, S5]
  src/react/TeardownViewer.tsx           EDIT  selected = open detail id; open/close highlight guard; name fallback [I-09, S8]
  src/overlay/model.ts                   EDIT  dimension notes avoid plate layer-name quads                   [I-05, S6]
  test/emphasis-selected.test.ts         NEW   (added to s5.paths)                                            [I-09]
  test/viewer-selected.test.tsx          NEW   (added to s8.paths)                                            [I-09]
  test/overlay-note-clear.test.ts        NEW   (added to s6.paths)                                            [I-05]
  test/no-clock-warning.test.tsx         NEW   (no manifest)                                                  [I-04]
  test/frozen-surface.{s5,s6,s8}.paths, .sN.manifest.json, generate-sN.sh, frozen-surface.test.ts   RE-SEAL
apps/web/
  components/home/hero-section.tsx       EDIT  <BlueprintSheet /> moved after the content div                 [I-10]
  components/hero/hero-loop.ts           EDIT  remaining-time resume (`now` option)                           [I-03]
  test/home-hero-loop.test.tsx           EDIT  + resume-remaining cases                                       [I-03]
tools/perf/
  src/site-probe.ts                      EDIT  waitForHeroSettled (drill, / CLS) + hero-marks-stable checks + stall proxy [I-10]
  test/site-probe.test.ts                EDIT  unit cases for the settled predicate + mark comparison         [I-10]
pnpm-workspace.yaml, pnpm-lock.yaml      EDIT  patchedDependencies                                            [I-04]
patches/@react-three__fiber@9.8.2.patch  NEW   Timer-backed store clock                                       [I-04]
.github/workflows/{eager-3d,eager-load,hero-eager}.yml   DELETE                                              [I-08]
```

## Guards (every task)

`guards.sh` (T001) prints one line per guard and exits 1 on any failure (`guard NAME cmd` style):

```sh
B=a9edbfc; F=.specify/features/engine-polish; X=packages/xploder
git diff --quiet $B -- .specify/slices .specify/KICKOFF-S14.md .specify/content && echo FROZEN-OK
# S2/S4 and S7: manifests and every listed path byte-identical
git diff --quiet $B -- $X/test/frozen-surface.manifest.json $X/test/frozen-surface.paths $X/test/frozen-surface.generate.sh \
  $X/test/frozen-surface.s7.manifest.json $X/test/frozen-surface.s7.paths $X/test/frozen-surface.generate-s7.sh \
  $(sed "s#^#$X/#" $X/test/frozen-surface.paths $X/test/frozen-surface.s7.paths) && echo SURFACES-S2S4S7-OK
git diff --quiet $B -- tools/perf/src/{args,browser,budgets,evidence,exit-codes,fps,lighthouse,log,preview,reach,serve,summary-md,weight}.ts \
  tools/perf/src/cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}.ts && echo S3-TOOLS-OK
# every changed file under an S5/S6/S8 sealed path is on the approved list
for p in s5 s6 s8; do git diff --name-only $B -- $(sed "s#^#$X/#" $X/test/frozen-surface.$p.paths); done | sort -u \
  | grep -vxF -f <(grep -v '^#' $F/approved-xploder-src.txt) | (! grep -q .) && echo RESEAL-LIST-OK
# the no-drive-by fence
git diff --name-only $B | grep -vE "^($X/src/interaction/emphasis\.ts|$X/src/react/scene/Emphasis\.tsx|$X/src/react/TeardownViewer\.tsx|$X/src/overlay/model\.ts|$X/test/(emphasis-selected|viewer-selected|overlay-note-clear|no-clock-warning)\.test\.tsx?|$X/test/frozen-surface\..*|apps/web/components/home/hero-section\.tsx|apps/web/components/hero/hero-loop\.ts|apps/web/test/home-hero-loop\.test\.tsx|tools/perf/src/site-probe\.ts|tools/perf/test/site-probe\.test\.ts|pnpm-workspace\.yaml|pnpm-lock\.yaml|patches/@react-three__fiber@9\.8\.2\.patch|\.github/workflows/(eager-3d|eager-load|hero-eager)\.yml|$F/.*)$" \
  | (! grep -q .) && echo ALLOWED-PATHS-OK
git diff --quiet $B -- package.json apps/web/package.json packages/xploder/package.json tools/perf/package.json && echo NO-NEW-DEPS-OK
# AC2: no existing timeout/sleep constant changed (R4)
! git diff -U0 $B -- tools/perf/src/site-probe.ts | grep -E '^-.*(_MS\b.*=|timeout:)\s*[0-9A-Z_]' && echo TIMEOUT-NOT-RAISED-OK
gitleaks git --no-banner --log-opts="$B..HEAD" . && gitleaks dir --no-banner $F && echo GITLEAKS-OK
```

`approved-xploder-src.txt` lists the four approved source files and the three new sealed tests (package-relative paths prefixed with `packages/xploder/`). A failing `ALLOWED-PATHS-OK` or `RESEAL-LIST-OK` is never fixed by widening the guard: it is a STOP and an escalation (kickoff Hard Rules 2 and 4).

## Per-item plan (red test first, re-seal paired with the fix)

| # | Item | Red commit | Fix commit | Re-seal commit | Evidence |
|---|---|---|---|---|---|
| 1 | I-09 | `emphasis-selected` + `viewer-selected` (red log) | `emphasis.ts`, `Emphasis.tsx`, `TeardownViewer.tsx` (green log) | S5 + S8: base → fix SHA, notes, `.paths` +2 tests, manifests, `frozen-surface.test.ts` | unit logs, 8 screenshots, `engine:probe` s7/s8 unchanged |
| 2 | I-10 | `hero-marks-stable-*` checks + stall proxy in `site-probe.ts` (red at 390×740, 360×740) | `hero-section.tsx` DOM order; `waitForHeroSettled` in the drill and the `/` CLS cell (green) | none | red/green logs, corner-mark table, `perf:parity` 0 px, 5 local runs (CI runs in T011) |
| 3 | I-03 | `home-hero-loop` resume-remaining case (red: 1400 ≠ 1000) | `hero-loop.ts` (green) | none | unit logs, `pause-events.mjs` (16 cells, count = 1, frame equality R5), `reduced-motion` group |
| 4 | I-05 | `overlay-note-clear` (red) | `overlay/model.ts` + equivalence test (green) | S6: base → fix SHA, note, `.paths` +1, manifest, `frozen-surface.test.ts` | unit logs, `overlap-matrix.mjs` table with callout mode (R3), screenshots |
| 5 | I-04 | `no-clock-warning` (red; baselines already in T001) | patch + `patchedDependencies` + lockfile (green) | none | unit logs, console capture = 0, tour timing vs base, `perf:parity --compare` |
| 6 | I-08 | — (CI housekeeping; the proof is the PR's check list) | delete 3 files | none | `required-contexts.sh` JSON, tree listing |

### I-09 implementation notes

- `selected` is **optional** in `EmphasisInput`, so the sealed `emphasis.test.ts` and `emphasis-scene.test.tsx` stay byte-identical and green.
- In `TeardownViewer.tsx`, `detailOpenId` (today defined near the JSX) is computed before the emphasis memo; that is the same expression moved, not a new one.
- Panel effect (RFC §3.1):
  - **Open:** `if (viewer.highlight !== id) actions.highlight(id)`.
  - **Close:** clear only if `highlight === id && pointer.source !== 'mouse' && !activeIsProxy(id)`.
  - `pointer` comes from `viewerMetadataOf(viewer)`, which already exists.
- `PartLettering` / `BlueprintOverlay` get `highlight={viewer.highlight ?? detailOpenId}`. `ComponentNavigator` keeps `highlight={viewer.highlight}`.

### I-10 implementation notes

- **`waitForHeroSettled(page)`:** a predicate evaluated in the page (RFC §4.2 table), then `document.fonts.ready` and two rAFs, with the existing `WAIT_TIMEOUT_MS`. The pure predicate over an attribute snapshot is exported for the unit tests.
- **Stall proxy:** an in-process `http` server in `site-probe.ts`. It forwards to the probe's own static server and, for `/` only, writes the HTML up to `data-hero-annotation`, waits `HERO_STALL_MS`, then the rest.
  - `HERO_STALL_MS` is a **new** constant, not a raised timeout (R4 guard).
  - The marks are read via `[data-site-hero] > [aria-hidden] > span` (the 4 crop marks, skipping the grid span) at first paint, through a `requestAnimationFrame` sampler installed by `addInitScript`, and again after `waitForHeroSettled`.
- **Checks:** `hero-marks-stable-390x844`, `-390x740`, `-360x740` (identical boxes, 0 layout-shift entries). They are part of `runClsGroup`, so they run in CI's `--ci` set.

### I-03 implementation notes

- `createHeroSequence` gains an optional `now?: () => number` (default `() => performance.now()`, the hero's existing clock source).
- `wait` stores `{ delayMs, run, startedAt }`. `pause` records `elapsed = now() − startedAt` into `pending`, and `resumePending` waits `Math.max(0, delayMs − elapsed)`.
- Tour phases are untouched.

### I-05 implementation notes

- `tagsModel`: build the plate quads with `layerLetteringModel` from the viewport frame (names `project.layers[i].name ?? id`, component hulls, `viewport.width`). Append them after the component hulls, and give every non-`dimension` label `excludeObstacles` covering their indices (tags keep their own index too).
- **Equivalence test:** for every fixture and both real projects, at zoom 1 / 1.953125 / 3 and 390 / 1440 widths, every non-dimension placement is deep-equal before (old function, copied into the test) and after.

### I-04 implementation notes

- `pnpm patch @react-three/fiber@9.8.2`, then edit the three `dist/events-*.js`:
  - add `function createTimerClock()` near `createStore`;
  - replace the one `new THREE.Clock()` / `new THREE__namespace.Clock()`;
  - commit with `pnpm patch-commit`, which writes `patchedDependencies` into `pnpm-workspace.yaml`.
- `pnpm install --frozen-lockfile` must pass in CI and on Vercel.
- The adapter keeps `elapsedTime`/`oldTime` writable and `running`/`autoStart` semantics equal to `Clock`.

### I-08 implementation notes

- One commit with exactly three deletions; the orchestrator pushes over SSH.
- `required-contexts.sh <pr>` writes the check-run JSON and asserts the seven names are present and completed, and that none of the removed names appear.

## Re-seal procedure (RFC §9.2)

1. The fix commit is green apart from `frozen-surface.test.ts`.
2. The re-seal commit, in one diff:
   - `frozen-surface.generate-sN.sh` `base=<fix sha>`;
   - the note gains ` Re-sealed in S14 at <sha>: <file> — <reason>; see .specify/features/engine-polish/evidence/<T-file>.`;
   - `.paths` gets the new test;
   - run the generator;
   - update `frozen-surface.test.ts` (`base`, `note`; `REQUIRED_*` unchanged).
3. `pnpm --filter xploder test frozen-surface` must be green.
4. Merge with `--no-ff` to keep the fix SHA reachable. After the slice merges, the branch is kept on origin.

## Test map

| Check | Where | FR |
|---|---|---|
| `selected` lit with `highlight` | `packages/xploder/test/emphasis-selected.test.ts` | FR1 |
| AC1's four clauses + close-while-hovered + Escape-to-proxy | `packages/xploder/test/viewer-selected.test.tsx` | FR1 |
| S7/S8 probes unchanged | `engine:probe` (s7/s8 groups, fixture export) | FR1, FR7 |
| settled predicate, mark comparison | `tools/perf/test/site-probe.test.ts` | FR2 |
| marks stable under stalled HTML, CLS 0, drill | `site:probe --group cls,drill` (local ×5, CI ×5) | FR2 |
| hero pixels unchanged | `perf:parity --compare` vs T001 | FR2, FR5 |
| resume-remaining | `apps/web/test/home-hero-loop.test.tsx` | FR3 |
| settle count, frame equality | `pause-events.mjs` | FR3 |
| reduced motion | `site:probe --group reduced-motion` | FR3 |
| note vs plate names (unit) + other labels identical | `overlay-note-clear.test.ts` | FR4 |
| note vs layer names (browser) | `overlap-matrix.mjs` | FR4 |
| no Clock warning | `no-clock-warning.test.tsx`, console capture | FR5 |
| tour timing parity | `tour-timing.mjs` vs T001 | FR5 |
| seven contexts | `required-contexts.sh` | FR6 |
| frozen/approved/allowed/no-deps/timeouts/gitleaks | `guards.sh`, frozen-surface tests | FR7 |
| gates | CI (required 7) + `site:probe --group draws,hero` + `eager:probe --expect live-loop` | FR7 |

## Phase groups (Stage 3 STOP points)

- **G1 — baselines + I-09:** T001–T003 → STOP. Murphy may try the hover on a project page later (non-blocking).
- **G2 — I-10:** T004–T005 → STOP.
- **G3 — I-03:** T006 → STOP.
- **G4 — I-05:** T007–T008 → STOP.
- **G5 — I-04:** T009 → STOP.
- **G6 — I-08 + PR + gates:** T010–T012 → STOP (final). Murphy validates; "S14 done" happens outside the agent's view.

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| A stall proxy inside `site-probe` | The flake needs a mid-hero first paint, which a local static server never produces. Without the stall, a content-bound mobile hero cannot go red, so there would be no red test (Hard Rule 3). |
| A dependency patch for I-04 | The warning lives in R3F's store constructor, and no xploder code can stop it from being constructed (RFC C1). |
| An equivalence test copying the old `tagsModel` | It proves "other placements output-identical" in the same way S11.8 E1a did. |
