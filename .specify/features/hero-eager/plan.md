# Implementation Plan: S11.8 Hero-Only Eager

**Feature dir:** `.specify/features/hero-eager/` · **Branch:** `task/s11.8-hero-eager` · **Date:** 2026-11-04 · **Inputs:** `spec.md`, `rfc.md` (approved at Gate 1: all §9 defaults, the six-path E1/E2 list in §4; refinements R1–R8 in §11)

## Summary

Measurement comes first, and the first four tasks touch no product code:

- guards, the G1 file list, an app allowlist and the S11.8 byte-budget helper;
- small additive `tools/perf` changes:
  - named exceptions in the load scenario (`--names`);
  - the `/`-only verdict rule with the AC1 reproduction check (`--rule s11.8`);
  - a "still gated" probe mode (`--expect gated`);
  - a parity route filter (`--route`);
- a measurement-only workflow, `hero-eager.yml`;
- then the **AC1 reproduction + attribution** on one slow-class attempt, committed before any product commit.

Product work then lands one change per commit:

1. **A1:** the hero-only flag. Byte-neutral, no A/B.
2. **E1a:** an output-identical placement search in `overlay/place.ts`, with an oracle test + A/B + an S6 re-seal.
3. **E1b–E1d:** conditional on their RFC §4 triggers, each with an A/B + re-seal.
4. A final local-state check.
5. **E2:** only if AC1 puts the `ViewScroll` mount re-render in home's TBT window.

The verdict then runs once, on the final state, until two slow-class attempts exist. The slice ends with CI green, the re-seal diff and the AC self-check. On "retire" only, A2 makes hero-eager the default.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19, Next 16 (Turbopack) static export, `three` 0.186.1 + `@react-three/fiber` (pinned), Node 24, pnpm 12 |
| Binding host | GitHub-hosted `ubuntu-latest` attempts qualified per RFC D1 (all Lighthouse `benchmarkIndex` in [1,900, 2,600]) |
| Local host | Apple M4, A/B only. Lighthouse local emulation = native GL + `--cpu-multiplier 18.5` (S11.7 T006 §7; re-checked against the AC1 attempt in T004); `fps:engine --scenario load --cpu 1` / `--cpu 4` |
| New deps | **none** |
| Tests | vitest: `tools/perf/test/*` (additive); `packages/xploder/test/overlay-place-equivalence.test.ts` + `test/oracles/place-s11.7.ts` (new, R7); `apps/web/test/eager-hero.test.tsx` (new), `eager-flag.test.ts` (updated in A1) |
| Budgets | `tools/perf/src/budgets.ts` unchanged. AC3/AC4 bars are verdict rules |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; every `packages/xploder/src` path except the approved files actually edited; every sealed test (`*.paths`); `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`; `ci.yml`, `perf.yml`, `eager-3d.yml`, `eager-load.yml` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. The levers are the brief's E1 (scope 2) and E2 (scope 3), plus A1, which is needed for "hero-only" (AC5/AC6). Non-goals hold: there is no project eager, no `three` split, no chunking change, no new dependency, no visual, content, tour, panel, a11y or theme change, and no budget is lowered. |
| II. Static-only | Unchanged. The workflow serves the export locally on the runner. |
| III. Performance is a feature | The slice's purpose. Bytes: ≤ +2,000 B gzip per route initial, total gzip ≤ +0.5 % (AC4). |
| IV. Single motion source | No timing literal is added. E1c waits on a promise (`compileAsync`), and E1d/E2 yield with the existing `yieldToMain` / `MessageChannel` pattern. `no-motion-literals` stays unchanged and green. |
| V. Theme integrity | No palette code is touched. Parity runs in light + dark. |
| VI. Evidence over assertion | Every number has an artifact. Reproduce-before-change is enforced by `BASELINE-FIRST-OK`, identity by the oracle test and 0-px parity. |
| VII. No secrets | Runner paths → `<runner-home>`, local paths → `<local-path>`, ports → `PORT`. Traces go through `gitleaks dir` before commit. |

## Project Structure

### Documentation (this feature)

```
.specify/features/hero-eager/
  rfc.md · spec.md · plan.md · tasks.md
  guards.sh · g1-approved.txt (the six RFC §4 paths; hash-pinned in guards.sh)
  approved-xploder-src.txt (starts empty; one line per re-sealed file)
  app-touch.txt (APP-TOUCH-OK allowlist) · s2.paths · s4.paths (copied from staged-canvas-mount)
  bundle-scopes.mjs (copied from eager-load + --budget s11.8)
  lever-block.sh + ab-table.mjs (written in T004; standing A/B + non-goal block)
  evidence/   RFC-log-static-read.txt + T<NNN>-* per EVIDENCE.md
```

### Source code (changes only)

```
tools/perf/
  src/cli/fps-engine.ts        EDIT  --names (load scenario only; adds the V8 sampling category; labels tasks) (R4)
  src/cpu-profile.ts           EDIT  additive export: samplesInWindow(trace, startUs, endUs) (reused by --names)
  src/cli/eager-verdict.ts     EDIT  --rule s11.8 [--reproduce] (default + --rule s11.7 byte-identical) (R5)
  src/eager-probe.ts · src/cli/eager-probe.ts   EDIT  --expect live|gated (default live = S11.7 behaviour)
  src/cli/parity.ts            EDIT  --route home|project (default both, byte-identical) (R3)
  test/{fps-engine-load,eager-verdict,eager-probe,parity,cpu-profile}.test.ts   additive cases
package.json                   EDIT  script build:eager-hero (T005), nothing else
.github/workflows/hero-eager.yml   NEW  measurement-only, slice branch only, matrix shard [1,2,3]

apps/web/next.config.ts                  EDIT A1: __XP_EAGER_HERO__ define
apps/web/eager-3d.d.ts                   EDIT A1: declare __XP_EAGER_HERO__
apps/web/components/hero/hero-live.tsx   EDIT A1: gate on __XP_EAGER_3D__ || __XP_EAGER_HERO__
apps/web/test/eager-flag.test.ts         EDIT A1: new define's shape (intent kept)
apps/web/test/eager-hero.test.tsx        NEW  A1: hero boots without interaction under __XP_EAGER_HERO__; workbench stays gated

packages/xploder/src/overlay/place.ts                 E1a (required)
packages/xploder/src/overlay/model.ts                 E1b (conditional)
packages/xploder/src/react/scene/Stats.tsx            E1c (conditional)
packages/xploder/src/react/overlay/BlueprintOverlay.tsx  E1d (conditional, last resort)
packages/xploder/src/react/scene/ViewScroll.tsx       E2 (conditional)
packages/xploder/src/react/TeardownViewer.tsx         E2 (conditional, with ViewScroll only)
packages/xploder/test/oracles/place-s11.7.ts          NEW verbatim copy of place.ts at 0fcd243 (R7)
packages/xploder/test/overlay-place-equivalence.test.ts   NEW
packages/xploder/test/{oracles/model-s11.7.ts, overlay-model-equivalence.test.ts}   NEW only if E1b runs
packages/xploder/test/stats-compile.test.tsx          NEW only if E1c runs
packages/xploder/test/frozen-surface.generate{,-s5,-s6,-s8}.sh · *.manifest.json · frozen-surface.test.ts
                                                      re-seal edits only, for the surfaces actually touched (R1)
```

`app-touch.txt` lists exactly the five `apps/web` paths above. `XPLODER-SRC-OK` + `XPLODER-TEST-OK` bound the package diff. Any other change STOPs the task.

## Guards (every task)

`guards.sh` (T001) prints one line per guard and exits 1 on any failure. It is copied from S11.6's (`approved`, `excl`, `paths_contains`, `note_in_generator` helpers) with these values and additions:

```sh
B=0fcd243                                            # S11.8 freeze; product = S11.7 final 7df1b6d
F=.specify/features/hero-eager
G1_SHA=<sha256 of g1-approved.txt, written in T001>  # the Gate-1 list cannot drift
approved() { grep -v '^#' $F/approved-xploder-src.txt | sed 's/ *#.*//;/^$/d'; }

guard FROZEN-OK          git diff --quiet $B -- .specify/slices .specify/KICKOFF-S11.8.md .specify/content
guard BRIEF-HISTORY-OK   test -z "$(git log --oneline $B..HEAD -- .specify/slices .specify/KICKOFF-S11.8.md .specify/content)"
guard G1-LIST-OK         test "$(shasum -a 256 < $F/g1-approved.txt | cut -d' ' -f1)" = "$G1_SHA" &&
                         test -z "$(approved | grep -vxFf <(grep -v '^#' $F/g1-approved.txt))"
guard XPLODER-SRC-OK     test "$(git diff --name-only $B -- packages/xploder/src packages/xploder/package.json | sort)" = "$(approved | sort)"
guard XPLODER-TEST-OK    # changed (not added) files under packages/xploder/test ⊆ generators, manifests, frozen-surface.test.ts
guard SURFACE-S2-OK      git diff --quiet $B -- $(xpf s2.paths)
guard SURFACE-S4-OK      git diff --quiet $B -- $(xpf s4.paths) $(excl)
guard SURFACE-S5-OK      git diff --quiet $B -- $(xp frozen-surface.s5.paths) $(excl)
guard SURFACE-S6-OK      git diff --quiet $B -- $(xp frozen-surface.s6.paths) $(excl)
guard SURFACE-S7-OK      git diff --quiet $B -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK      git diff --quiet $B -- $(xp frozen-surface.s8.paths) $(excl)
guard SEALED-TESTS-OK    git diff --quiet $B -- $(xp_tests_of_all_manifests)
guard RESEAL-NOTE-OK     reseal_note_ok        # S11.6's helper + the S5 generator; note must contain 'S11.8' and the path
guard BASELINE-FIRST-OK  first=$(git log --reverse --format=%H $B..HEAD -- apps packages | head -1);
                         test -z "$first" || git merge-base --is-ancestor \
                           "$(git log --format=%H --diff-filter=A -1 -- $F/evidence/T004-log-baseline.md)" "$first"
guard APP-TOUCH-OK       test -z "$(git diff --name-only $B -- apps/web | grep -vxFf <(grep -v '^#' $F/app-touch.txt))"
guard DEV-ROUTES-OK      git diff --quiet $B -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard CI-JOBS-OK         git diff --quiet $B -- .github/workflows/{ci,perf,eager-3d,eager-load}.yml &&
                         test -z "$(git diff --name-only --diff-filter=A $B -- .github/workflows | grep -vx .github/workflows/hero-eager.yml)"
guard FLAG-DEFAULT-OK    grep -q "process.env.NEXT_PUBLIC_EAGER_3D === '1'" apps/web/next.config.ts &&
                         { ! grep -q EAGER_HERO apps/web/next.config.ts || grep -q "process.env.NEXT_PUBLIC_EAGER_HERO === '1'" apps/web/next.config.ts; }
guard VERSIONS-OK        git diff --quiet $B -- pnpm-lock.yaml packages/*/package.json apps/web/package.json tools/perf/package.json
guard BUDGETS-OK         git diff --quiet $B -- tools/perf/src/budgets.ts
guard GITLEAKS-OK        gitleaks git --no-banner --log-opts="$B..HEAD" . && gitleaks dir --no-banner $F
```

- **`XPLODER-SRC-OK`** holds with an empty list until the first engine lever. Each re-seal commit appends its file to `approved-xploder-src.txt`, so a lever commit **without** its re-seal fails the guard. Lever + re-seal therefore land in one task merge.
- **`reseal_note_ok`** maps each approved path to its manifest via `paths_contains`:
  - `frozen-surface.paths` → `generate.sh`;
  - `.s5.paths` → `generate-s5.sh`;
  - `.s6.paths` → `generate-s6.sh`;
  - `.s8.paths` → `generate-s8.sh`.

  A path in no manifest fails.
- **`FLAG-DEFAULT-OK`** changes only in T013b, on Murphy's "retire", with a §11 note.
- **`BASELINE-FIRST-OK`** holds trivially until A1, then proves ancestry from the T004 log.

## Harness (RFC D2; SR1.1)

### `fps:engine --scenario load --names` (T002, R4)

- **The flag.** `--names` appends `disabled-by-default-v8.cpu_profiler` to the load trace categories. It is valid with `--frames trace-only` and `recorder`. Without it, the categories and the report are byte-identical: the S11.7 `fps-engine-load.test.ts` cases pass unmodified.
- **Labelling.** Every top-level main-thread task that intersects the window and is > 50 ms, plus the three named tasks regardless of size, gets a label:
  - **`renderer-constructor`:** the task with the most `WebGLRenderer` constructor self + child samples (three chunk). It is identified by the constructor frame's served-chunk snippet, as `perf:attribution` does (S11.7 D-P2).
  - **`program-compile`:** the first task whose samples include three's program setup (`getUniforms` / `getAttributes` first use, `WebGLProgram`, or `compileAsync`'s `compile`).
  - **`first-content-frame`:** the task whose `[ts, ts + dur]` contains `readyMs` (the load observer's MutationObserver timestamp, mapped to the trace clock with the existing load mark).
  - **`unnamed`:** everything else.

  One task may carry two names. At AC1, `program-compile` and `first-content-frame` are expected to be one task.
- **Report additions:**
  - `names[]` (`NamedTask`);
  - `namedExceptions` (each name → `durMs`, or `null` if not found);
  - `unnamedMaxMs`.
- **Caps.** `--caps <json>` (`{ "renderer-constructor": ms, … }`) adds `cap` + `pass` per name, plus `verdict.namedWithinCaps`. A missing named task is a **fail**, not a pass.
- **Validity.** A run with `mounted: false` stays invalid (exit 1), as in S11.7.

### `eager-verdict --rule s11.8` (T002, R5)

- **Inputs:** `--dir <attempt>…` (the S11.7 layout), plus optional `--reproduce` (adds the AC1 band check).
- **Per attempt:**
  - qualification (every run in [1,900, 2,600]);
  - home eager/gated route values (the existing aggregation);
  - `ruleA` = perf ≥ 0.95 ∧ TBT ≤ 200; `ruleB` = eager − gated ≤ 50; `pass` = a ∨ b;
  - `projectGated.inBand` = TBT in [78.85, 91.35] (AC5, Q3).
- **Overall:** AC3 PASS iff the first two qualifying attempts in time order are on distinct runner names and `/` passes on both.
- **`--reproduce`:**
  - `eagerInBand` = home eager in [188.33, 231.00];
  - `gatedInBand` = home gated in [74.48, 94.60];
  - output `REPRODUCED` or `NOT REPRODUCED` per attempt.
- **Golden tests:** the default output, and the `--rule s11.7` output on the S11.7 T014 fixture dirs, are byte-identical.

### `eager:probe --expect gated` (T002)

- **Default `--expect live`:** S11.7 behaviour, unchanged (test).
- **`gated`:**
  - observed until `load` + 5 s, with no input;
  - pass iff `canvas` count = 0, no `data-xploder-ready`, the poster has computed `visibility: visible` + `opacity: 1`, and trusted events = 0;
  - `threeRequested` is reported (informational; expected false).
- **No input APIs:** the existing grep check stays.

### `perf:parity --route home|project` (T002, R3)

- **Filter:** it narrows `ROUTES` before the capture.
- **Compare against a full baseline:** it compares only the selected route's shots. The manifest records `routes`.
- **Default:** both routes, byte-identical (the existing parity tests pass unmodified).

## Workflow `hero-eager.yml` (T003; RFC D2)

```yaml
name: hero-eager
on: { pull_request: {} }
permissions: { contents: read }
jobs:
  measure:
    if: github.head_ref == 'task/s11.8-hero-eager'
    name: 'perf: hero-eager (slow-class measurement) #${{ matrix.shard }}'
    runs-on: ubuntu-latest
    timeout-minutes: 75
    strategy: { fail-fast: false, matrix: { shard: [1, 2, 3] } }
    env: { E: .evidence/ci/hero-eager, SHARD: '${{ matrix.shard }}', EAGER_BUILD: 'build:eager' }   # → build:eager-hero in T005
    steps: checkout · pnpm · node (.nvmrc) · install --frozen-lockfile · Playwright cache + install chromium
      - perf:host → $E/host-meta.json; echo "eager build: $EAGER_BUILD" >> $E/exit-codes.txt
      - build (gated) → bundle:manifest → $E/gated-manifest.json
        serve:out :4320 → perf:lighthouse ×2 on / and on /projects/websocket-inspector ($E/gated-<route>-r<n>)
                        → perf:lighthouse --profile ×1 on / → perf:attribution ($E/attr-gated-home)
      - pnpm $EAGER_BUILD → bundle:manifest → $E/eager-manifest.json
        serve:out :4320 → perf:lighthouse ×2 on / ($E/eager-home-r<n>) · --profile ×1 on / → perf:attribution
                        → (after T005 only) perf:lighthouse ×2 on project ($E/eager-project-r<n>), informational
                        → fps:engine --scenario load --route / --no-build ×2 each:
                              --frames trace-only --cpu 1 --names   (named AC2 mode)
                              --frames recorder   --cpu 1 --names   (excluded from AC2: harness rAF recorder)
                              --frames trace-only --cpu 4           (informational continuity with S11.7)
                        → eager:probe / ×2, / --reduced-motion ×2, (after T005) /projects/websocket-inspector --expect gated ×2
      - node tools/perf/src/cli/eager-verdict.ts --rule s11.8 --reproduce --dir $E
      - upload-artifact hero-eager-${{ github.run_id }}-${{ github.run_attempt }}-s${{ matrix.shard }} (retention 14)
```

- Every measuring step records its exit code and never fails the job. The job fails only on a build or tool error (S11.6 D-P2).
- **Not a required check.** `eager-load.yml` and `eager-3d.yml` are untouched. `eager-3d.yml` still runs on this PR, as an informational both-routes-eager reference.
- **Before T005:** the steps marked "after T005" are skipped with `if: env.EAGER_BUILD == 'build:eager-hero'`. T005's commit flips `EAGER_BUILD`.
- **Caps:** after T004, `--caps $F/evidence/T004-ac2-caps.json` is added to the named-mode step, in the same commit as the AC1 log.

## A1 — hero-only flag (T005; SR5.1)

```ts
// next.config.ts
const eager3d = process.env.NEXT_PUBLIC_EAGER_3D === '1';
const eagerHero = process.env.NEXT_PUBLIC_EAGER_HERO === '1';
define: { __XP_EAGER_3D__: eager3d, __XP_EAGER_HERO__: eagerHero }
// hero-live.tsx
if (!(__XP_EAGER_3D__ || __XP_EAGER_HERO__)) { if (!(await waitForFirstInteraction(signal))) return; }
```

- `workbench-loader.tsx` is **not** touched.
- **Root `package.json`:** `"build:eager-hero": "NEXT_PUBLIC_EAGER_HERO=1 pnpm --filter web build"`.
- **Tests:**
  - `eager-flag.test.ts`: the defines are read only in `next.config.ts`; `__XP_EAGER_HERO__` is referenced only by `hero-live.tsx`; the gated branch is unchanged;
  - `eager-hero.test.tsx` (jsdom, `vi.stubGlobal('__XP_EAGER_HERO__', true)`, `__XP_EAGER_3D__` false): the hero boot import happens without an interaction event; reduced motion and saveData still skip it; `WorkbenchLoader` still waits for interaction.
- **Checks:**
  - bytes: `bundle-scopes --budget s11.8` on both pairs (expected Δ ≈ 0);
  - `eager:probe /projects/websocket-inspector --expect gated` ×2 locally on `build:eager-hero`;
  - `eager:probe /` ×2 (live);
  - home post-eager parity 0 px.

## E1 levers (RFC §4.1; SR2.1)

### E1a — output-identical placement search (T006, `place.ts`, required)

1. **Oracle first** (separate commit inside the task, before the lever): `test/oracles/place-s11.7.ts` = `git show 0fcd243:packages/xploder/src/overlay/place.ts`, with the import paths rewritten to `../../src/...`, plus the equivalence test. Run against the unchanged `place.ts`, it must pass, which proves the harness.
2. **Lever commit:**
   - **In-order candidate generator:** `function* candidates(label, text, box, viewport, gapPx)` yields, for each anchor in `[anchor, ...anchors]`: the centred tag candidate (tags only) first, then radius × direction in `PLACEMENT_RADII` × `PREFERENCES[kind]` order, skipping `!insideViewport`. `labelOptions` becomes a generator, text set then shortText set, with the same `fellBack` flags.
   - **`firstFit`** takes the first option that passes `clear(...)`. **`completeSearch`** iterates the generator, so its order and `SEARCH_NODE_LIMIT` counting are unchanged.
   - **`prepareObstacles(obstacles)`** runs once per `placeLabels` call and returns, per hull, `{ minX, maxX, minY, maxY, axes: Float64Array (nx, ny pairs, zero edges skipped), hullMin, hullMax }`. The excluded set is applied per label, once.
   - **`rectOverlapsPrepared(x, y, w, h, hull)`** does the following:
     - **AABB pre-reject** with the same strict comparisons as the original's axes `[1,0]` / `[0,1]`: `rectMax <= polygonMin || polygonMax <= rectMin` → no overlap;
     - then the edge axes, with the rect projected by scalar min/max over its 4 corners, so no arrays are allocated.

     `inflate` becomes scalar arguments. `rectsOverlap` against already-placed rects is unchanged.
   - **Signatures unchanged:** `placeLabels`, `rectIntersectsPolygon` (used by `columns.ts` / `titleBlock.ts`) and every exported type keep their signatures. `rectIntersectsPolygon` itself is unchanged.
3. **Optional sub-step,** only if the A/B profile still shows placement ≥ 5 % of the first-content-frame task: a uniform grid over the hull AABBs, with cell = the median hull AABB size and no numeric literal beyond what the data gives. It is its own commit + A/B.
4. **Equivalence test** (`overlay-place-equivalence.test.ts`):
   - **Fixtures:** the committed xploder fixture projects (`project-a`, `project-b`, `project-c-lockerbay`), plus the hero project, read only via `fs` from `.specify/content/websocket-inspector.json` (frozen content; never written; the package takes no dependency on `apps/web`). They are projected through `layoutProject` + an orthographic test camera at the parity viewports (412×823 mobile, 1350×940 desktop) and the S11.7 rest pose, imploded and exploded. Labels come from `tagLabels` / `placeColumns` inputs.
   - **Random:** a seeded PRNG (seed printed; mulberry32 in the test file) generates 2,000 layouts of 1–24 convex hulls (3–8 points), 1–30 labels of every kind, with optional `anchors` / `shortText` / `excludeObstacles`.
   - **Edge cases:** zero-length edges, collinear points, labels on the inset edge, offscreen anchors, a case that forces `completeSearch`, and a case that hits `SEARCH_NODE_LIMIT`.
   - **Assertion:** `expect(placeLabels(...)).toStrictEqual(oracle.placeLabels(...))` on every case.
   - **Timing** (informational, printed only, never asserted): the fixture-set median time, old vs new.
5. **Re-seal commit** (RFC §4.2 + R1):
   - `generate-s6.sh`: `base` = the lever SHA, and the note gains `Re-sealed in S11.8 at <sha>: src/overlay/place.ts — output-identical lazy first-fit placement search with prepared obstacle bounds (E1a); see .specify/features/hero-eager/evidence/T006-log-e1a-ab.md.`;
   - `bash packages/xploder/test/frozen-surface.generate-s6.sh`;
   - `frozen-surface.test.ts`: the S6 `base` + `note` literals;
   - append `packages/xploder/src/overlay/place.ts  # E1a <sha>` to `approved-xploder-src.txt`.

### E1b — label-list index maps (T007, `model.ts`, conditional)

- **Trigger:** T006's after-profile shows `model.ts` frames (the `tagsModel` / `tagLabels` closure) ≥ 5 % of the first-content-frame task self time. Otherwise skip with the profile.
- **Change:** `tagLabels`, `overlayLabels` and the `findIndex` sites (L229, L248, L253, L380, L396, L401) read from `Map`s built once per call. The output order is unchanged.
- **Oracle:** `oracles/model-s11.7.ts` + an `overlayBaseModel` `toStrictEqual` test on the fixtures above (imploded + exploded, tags + columns).
- **Re-seal:** S6 (the same generator, appended note).

### E1c — program setup before the first draw (T008, `Stats.tsx`, conditional)

- **Trigger:** the AC1 attribution shows three program setup ≥ 5 % of the first-content-frame task, **or** after T006/T007 that task is still > 12.5 ms observed on the slow attempt's scale (local: the A/B's profiled task × the T004 drift ratio). Otherwise skip.
- **Change:**
  ```tsx
  const { gl, scene, camera, invalidate } = useThree();
  const compiledRef = useRef(false);
  useLayoutEffect(() => {            // after Slabs' layout effects (Stats is Scene's last child, R8)
    let live = true;
    gl.compileAsync(scene, camera).then(
      () => { if (live) { compiledRef.current = true; invalidate(); } },
      () => { if (live) { compiledRef.current = true; invalidate(); } },   // failure → today's path (compile inside render)
    );
    return () => { live = false; };
  }, [gl, scene, camera, invalidate]);
  useFrame(({ gl, scene, camera }) => { if (!compiledRef.current) return; gl.render(scene, camera); … }, 1);
  ```
- **Test `stats-compile.test.tsx`:**
  - no `gl.render` before `compileAsync` resolves;
  - exactly one `invalidate` after it resolves;
  - a rejected promise still renders;
  - `onStats` fires on the first drawn frame only.
- **Lever-block extras:**
  - `gl.info.programs.length` after the first render = after `compileAsync` (no recompile), read from a dev-only probe hook already exposed by `engine:probe` (if no hook exists, the check uses `site:probe --group draws`'s program count, else it is reported as unavailable, not assumed);
  - the reveal-sequence probe: ready is still the first instanced-draw rAF;
  - 2 draws.
- **Re-seal:** `frozen-surface.generate.sh` (S2/S4) + `frozen-surface.test.ts` literals.

### E1d — overlay model one task later on the first settle (T009, `BlueprintOverlay.tsx`, conditional, last resort)

- **Trigger:** after T006–T008, the A/B's first-content-frame task still contributes > 50 ms simulated **and** the projected `/` eager TBT (the local A/B Δ applied to the AC1 attempt's 209–231 ms value) is > 185 ms. Otherwise skip.
- **Change:** for the **first** `settled` event only, `update` stores the pending frame and schedules `applyPending` with `yieldToMain()` (the existing app/boot pattern, re-implemented locally with `MessageChannel`, no timer literal). Later settles are unchanged (synchronous).
- **Checks:** the fade still starts after the model exists; the reveal sequence is unchanged; rest-state parity is 0 px; the first-content-frame task no longer contains `overlayBaseModel` samples.
- **Re-seal:** S6.

### Final local state (T010)

- The full lever block on the accepted state, against T004's local baseline;
- the before/after table;
- bytes for both pairs;
- the E2 decision restated from T004.

## E2 (T011; SR2.2, conditional, expected skip)

- **Trigger:** T004's per-task table shows a home task > 50 ms simulated inside FCP→TTI whose top frames include `ViewScroll`'s `sync` (the `[turns, zoomFactor, height, width]` effect) or the `setScrollExtentPx` re-render. Otherwise T011 records "skipped (trigger not met)" with the T004 table excerpt.
- **Change (if triggered):**
  - **`ViewScroll.tsx`:** on the **mount** call only, write the extent straight to the stage DOM (spacer `height` via `[data-xploder-scroll-spacer]`, `scrollTop = extent / 2`), then call `sync()` for the offset. `onExtent` is published from a passive `useEffect`. Later dependency changes keep today's path.
  - **`TeardownViewer.tsx`:** the scroll-extent layout effect skips the `scrollTop` write when the stage already matches (`adjustedExtentRef`), so the passive state update does not re-centre a page the visitor has scrolled. The spacer stays state-driven after mount.
- **Checks:**
  - the first-content-frame view offset is equal (`data-xploder-scroll-extent` and the camera `view.offsetY` at ready, via the sequence probe);
  - parity 0 px;
  - the a11y keyboard pan (`engine:probe` scroll group) is unchanged.
- **Re-seal:** `generate-s5.sh` + `generate-s8.sh` + `frozen-surface.test.ts` literals. The S8 note appends to S11.6's.

## Bytes (RFC D3; SR4.1)

`bundle-scopes.mjs` (copied from eager-load) gains `--budget s11.8`:

```
node $F/bundle-scopes.mjs --budget s11.8 <before-manifest> <before-out> <after-manifest> <after-out>
```

- **Scopes:** home initial, project initial, total, and non-initial 3D (informational).
- **Pass:** each initial gzip Δ ≤ 2,000 B and total gzip Δ ≤ 0.5 % of before. Raw is reported. Exit 1 on a breach.
- **Pairs:**
  - gated (`pnpm build` at `0fcd243` vs now);
  - hero-eager (`pnpm build:eager` at `0fcd243` vs `pnpm build:eager-hero` now; before T005, vs `build:eager`).
- **Baseline:** built once in T001 into `/tmp/s118-checks/base-{gated,eager}`, with the manifests committed. On the runner, the AC1 attempt's manifests are cross-checked with `cmp` (S11.7 T006 §6 pattern).

## Data flow

```
apps/web/out (gated | eager | eager-hero) ──serve:out──> Chromium (mobile UA/screen)
  Lighthouse simulate ×2×3 on / (+ project gated) ────> summaries ─> eager-verdict --rule s11.8 [--reproduce] ─> AC1 band, AC3, AC5 band
  Lighthouse --profile on / ─> trace + V8 samples ─> perf:attribution ─> per-task table (E1/E2 tasks, E2 go/skip) ─> AC1
  fps:engine load --cpu 1 --names (trace-only | recorder) ─> named exceptions, unnamed max, dropped frames ─> AC2 (+ caps from AC1)
  eager:probe / (live, reduce) · project (--expect gated) ─> deadline / absence checks ─> AC5
  perf:host ─> host-meta.json ─> qualification
bundle:manifest + bundle-scopes --budget s11.8 ─> AC4
oracle tests · perf:parity (--route) · site:probe (draws, hero on gated) · sequence probe · axe · guards.sh · CI ─> AC7 / non-goals
```

## Re-seal procedure (every engine lever; RFC §4.2 + R1)

1. The lever commit (source + its new test files) is checked: the A/B passes the keep rule and every non-goal check.
2. `SHA=$(git rev-parse --short HEAD)`.
3. In the owning generator, set `base=$SHA` and append the note sentence: `Re-sealed in S11.8 at $SHA: <src path> — <reason> (<lever>); see .specify/features/hero-eager/evidence/<TID>-log-<lever>-ab.md.`
4. Run the generator. **Never hand-edit a manifest.**
5. Update that surface's `expect(manifest.base)` and `note` literals in `frozen-surface.test.ts`.
6. Append `<repo path>  # <lever> $SHA` to `approved-xploder-src.txt`.
7. Run `pnpm --filter xploder test` (incl. `frozen-surface.test.ts`) and `bash $F/guards.sh`. `XPLODER-SRC-OK`, `RESEAL-NOTE-OK` and `G1-LIST-OK` must print OK.
8. Commit `S11.8/TNNN: re-seal <surface> for <file> (<lever>)`.

## Test map

| Check | Where | FR |
|---|---|---|
| `--names` labels (constructor, compile, first frame via readyMs, unnamed), caps, a missing name fails; no `--names` → output unchanged | `tools/perf/test/fps-engine-load.test.ts` (additive; synthetic traces) | FR2 |
| `samplesInWindow` | `tools/perf/test/cpu-profile.test.ts` | FR2 |
| `--rule s11.8` (a)/(b), first-two distinct runners, project band, `--reproduce` bands; default + `--rule s11.7` golden | `tools/perf/test/eager-verdict.test.ts` | FR1, FR3, FR5 |
| `--expect gated` absence checks; `live` unchanged; no input APIs | `tools/perf/test/eager-probe.test.ts` | FR5 |
| `--route` filter; default byte-identical | `tools/perf/test/parity.test.ts` | FR7 |
| placement identity vs the oracle (fixtures + 2,000 random + edge cases) | `packages/xploder/test/overlay-place-equivalence.test.ts` | FR2, FR7 |
| overlay model identity (if E1b) | `packages/xploder/test/overlay-model-equivalence.test.ts` | FR2, FR7 |
| compile-before-draw ordering (if E1c) | `packages/xploder/test/stats-compile.test.tsx` | FR2, FR7 |
| sealed manifests match | `packages/xploder/test/frozen-surface.test.ts` (literals updated per re-seal) | FR7 |
| hero-only flag behaviour; defines' shape | `apps/web/test/eager-hero.test.tsx`, `eager-flag.test.ts` | FR5, FR6 |
| budget mode | T001 self-check (`--budget s11.8` A vs A = 0 Δ) | FR4 |
| no motion literals, no colour literals, prod imports, sealed placement tests | existing tests, unchanged | FR7 |

## Phase groups (Stage 3 STOP points)

- **Baseline:** T001–T004 → STOP. Guards, harness, workflow, then **AC1** on one slow-class attempt. Murphy sees the reproduction, the per-task table, the E2 go/skip and the AC2 caps.
- **E1:** T005–T010 → STOP. A1, E1a (+ re-seal), E1b–E1d (conditional, each + re-seal), the final local state.
- **E2:** T011 → STOP, only if E2 ran. A skip is recorded in T011 and folded into the E1 STOP.
- **Verdict:** T012 → STOP. Two slow-class attempts on the final state, with AC2/AC3/AC5 on both and the AC6 branch.
- **CI/surfaces:** T013 (+ T013b only on "retire") → STOP (end-contract).

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| A verbatim oracle copy instead of snapshot tests | Snapshots only cover the fixtures. The oracle also covers 2,000 random layouts and the look-ahead paths, which is what "pixel-identical by construction" needs. |
| A lazy generator instead of only the AABB pre-reject | The pre-reject alone keeps building every discarded candidate. The generator removes them at the source, and the pre-reject removes the allocations of the rest. |
| Conditional files approved up front | Hard Rule 4 requires the list at G1. A mid-slice re-ask would break the one-cycle rule. Triggers keep unneeded edits from happening. |
| `--names` in the binding run (profiler on) instead of a separate profiled run | The exception caps compare like with like: AC1 and the verdict are measured in the same mode. Sampling overhead only makes the bar stricter. |
| A new workflow instead of re-pointing `eager-load.yml` | `eager-load.yml` is S11.7's record. Editing it would rewrite how S11.7's numbers were produced, and the `/`-only protocol differs. |
| `g1-approved.txt` hash-pinned in `guards.sh` | It makes "an unapproved file edit is a protocol violation" mechanical, including edits to the list itself. |
