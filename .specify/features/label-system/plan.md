# Implementation Plan: S16 Label System

**Feature dir:** `.specify/features/label-system/` · **Branch:** `task/s16-label-system` · **Date:** 2026-11-16 · **Inputs:** `spec.md`, `rfc.md` (approved; §13 Gate 1: all defaults + R1–R8)

## Summary

The work runs in **two stages with a hard stop between them** (kickoff Hard Rule 3):

- **Stage A — model merge at 0 px.** One model and one pass compose the unchanged placers. Both renderers consume the pass. Proof: the oracle, DOM identity and pixels on the full matrix. → **[STOP 1]**, wait for Murphy's "continue".
- **Stage B — placement behaviour and emphasis**, only after the word. Order:
  1. the sweep, red on a seed;
  2. S7 obstacle entry points;
  3. the conflict-gated pass → sweep 0;
  4. the two emphasis slots (S6, then S8);
  5. cost, passes and churn;
  6. gates and seals.

Every behaviour change goes test-first:

**red test commit → fix commit (green) → re-seal commit (only if a sealed file changed) → annotated `seal/<surface>-<fix sha>` tag, pushed in the same session → evidence.**

| # | Stage | Step | Sealed surface | Tag |
|---|---|---|---|---|
| 1 | A | `labelPass` (pure) + oracle parity | S6 | `seal/s6-…` |
| 2 | A | viewer runs the pass; lettering consumes it; face snapshot (R1); counter | S8 | `seal/s8-…` |
| 3 | A | overlay consumes the pass (+ R3 safety net) | S6 | `seal/s6-…` |
| 4 | B | S7 obstacle entry points (R6) | S7 | `seal/s7-…` |
| 5 | B | conflict-gated priority pass; `tagsModel` extra obstacles; sweep test sealed | S6 | `seal/s6-…` |
| 6 | B | two emphasis slots in the overlay model + `BlueprintOverlay` | S6 | `seal/s6-…` |
| 7 | B | slots wired in the viewer + lettering; focus = selected; tile in sync | S8 | `seal/s8-…` |

S2/S4 (combined manifest), S3 and S5 stay byte-identical.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16 static export, three 0.186.1, @react-three/fiber 9.8.2, Node 24, pnpm 12.15 |
| New deps | none |
| Tests | vitest (`packages/xploder/test`, `apps/web/test` incl. `xploder-dom` jsdom, `tools/perf/test`); `site:probe`, `eager:probe`, `engine:probe` on `apps/web/out` / `out-fixtures`; feature scripts in this dir; `guards.sh` |
| Base | `021c1ff`. Seal bases at the start: S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `8506837`, S7 `5b22987`, S8 `8f27462` |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; every S2/S4 and S5 manifest path; the 21 S3 tool files; every S6/S7/S8 path not on `approved-xploder-src.txt` |
| Approved sealed edits | **S6:** `src/labels/**` (new), `src/react/overlay/BlueprintOverlay.tsx`, `src/overlay/model.ts` (Stage B only). **S7:** `src/lettering/place.ts`, `src/lettering/layers.ts`, `src/lettering/model.ts` (Stage B only). **S8:** `src/react/TeardownViewer.tsx`, `src/react/lettering/PartLettering.tsx`, `src/react/labels/**` (new, R1). Plus their new tests, `.paths`, manifests, generators and `frozen-surface.test.ts` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR6 quote AC1–AC6 verbatim; E3 and E6 only. `ALLOWED-PATHS-OK` fences drive-bys |
| II. Static-only | No runtime. The pass is client code inside the existing viewer |
| III. Performance is a feature | No new dependency; Stage A removes one consumer's duplicate placement; gzip Δ measured at every task (≤ 2 KB); Lighthouse, weight, draw-call and eager-hero gates re-run on the final head |
| IV. Single motion source | No duration, easing or stagger is added; `no-motion-literals` stays green |
| V. Theme integrity | No colour, font, size or weight change. Emphasis reuses the existing roles; `no-color-literals` stays green |
| VI. Evidence over assertion | Every AC has a machine artifact (RFC §10) |
| VII. No secrets | gitleaks in CI, and `gitleaks dir` on new prose and evidence before each commit |

## Project Structure

### Documentation (this feature)

```
.specify/features/label-system/
  rfc.md · spec.md · plan.md · tasks.md · guards.sh · approved-xploder-src.txt · seal-tag.sh
  label-matrix.mjs     matrix runner: screenshots + label quads + label DOM per cell (T001); --control (T006)
  label-sweep.mjs      pure pair test over quad dumps + census + seeded unit control (T006, R8)
  parity-compare.mjs   pixel + DOM comparison of two matrix runs; cluster attribution (T001 noise floor, T005, T008)
  label-passes.mjs     pass counter vs xploder:settled; 60-frame churn (T003 smoke, T011)
  label-emphasis.mjs   browser emphasis assertions + screenshots (T010)
  settle-timing.mjs    copy of ../engine-timing/settle-timing.mjs (method unchanged; S16 header; + --compare)
  bench-pass.ts        Node bench: old two-consumer calls vs labelPass (T011)
  bundle-gzip.mjs      gzip -9 sum of out/_next/static/**/*.js; --diff (R5)
  evidence/            T<NNN>-* per EVIDENCE.md, AC-selfcheck.md
```

### Source code (changes only)

```
packages/xploder/
  src/labels/pass.ts                      NEW   labelPass: composes S6/S7 placers; LabelItem list; pass id    [E3 A; gate B, S6]
  src/labels/types.ts                     NEW   LabelItem, LabelPassInput, LabelPassResult                  [E3, S6]
  src/labels/sweep.ts                     NEW   strict SAT pair test (shared by the gate, guarantee, tests) [E3 B, S6]
  src/react/labels/faces.ts               NEW   top-face snapshot from the pick bridge (moved verbatim, R1) [E3 A, S8]
  src/react/TeardownViewer.tsx            EDIT  runs labelPass once per settle; fan-out; counter; slots; focus [E3/E6, S8]
  src/react/lettering/PartLettering.tsx   EDIT  renders result.lettering (A); two-slot colours + slot attr (B) [E3/E6, S8]
  src/react/overlay/BlueprintOverlay.tsx  EDIT  renders result.overlay (A, R3); passes slots, slot attr (B)  [E3/E6, S6]
  src/overlay/model.ts                    EDIT  tagsModel extra obstacles (B5); overlayStateModel {hover, selected} (B6) [S6]
  src/lettering/place.ts                  EDIT  letterPartAvoiding (new export, R6)                         [E3 B, S7]
  src/lettering/layers.ts                 EDIT  optional obstacles, sequential plate avoidance (R6)          [E3 B, S7]
  src/lettering/model.ts                  EDIT  letteringModel optional obstacles → letterPartAvoiding        [E3 B, S7]
  test/label-pass-parity.test.ts, test/oracles/labels-s15.ts   NEW  (S6)
  test/label-sweep.test.ts                NEW   (S6, sealed with #5)
  test/lettering-obstacles.test.ts        NEW   (S7)
  test/overlay-emphasis-slots.test.ts     NEW   (S6)
  test/frozen-surface.{s6,s7,s8}.paths, .sN.manifest.json, generate-sN.sh, frozen-surface.test.ts   RE-SEAL
apps/web/
  test/xploder-dom/label-pass.dom.test.tsx       NEW   one pass per settle, 0 on re-render (AC4)
  test/xploder-dom/label-emphasis.dom.test.tsx   NEW   RFC §7.1 six rows (AC3)
  test/xploder-dom/viewer-moving.dom.test.tsx    EDIT? mock shape only, if the PartLettering mock must follow the new update signature (no assertion change)
```

No `tools/perf` file changes (Q13); the feature scripts import `tools/perf/src/{png,browser,serve}.ts` read-only.

## Guards (every task)

`guards.sh` (T001) prints one line per guard and exits 1 on any failure (S15 `guard NAME cmd` style):

```sh
B=021c1ff; F=.specify/features/label-system; X=packages/xploder
FROZEN-OK               git diff --quiet $B -- .specify/slices .specify/KICKOFF-S16.md .specify/content
SURFACES-S2S4S5-OK      combined S2/S4 + S5 manifests, .paths, generators and every listed path byte-identical to $B
S3-TOOLS-OK             the 21 S3 tool files byte-identical
RESEAL-LIST-OK          every changed path under an S6/S7/S8 sealed path (or src/labels, src/react/labels) is on approved-xploder-src.txt
ALLOWED-PATHS-OK        every changed path matches the plan's file list (the no-drive-by fence)
NO-NEW-DEPS-OK          the four package.json files byte-identical
NO-TYPO-OK              no change to font/fontSize/fontWeight/color/palette-role literals in the touched renderers (diff grep: '^[-+].*(font|Px\b|fontWeight|color:|Role\b)' outside moved blocks → reviewed list)
SEAL-TAG-OK             each manifest base has refs/tags/seal/*-<base> on origin (git ls-remote)
GITLEAKS-OK             gitleaks git --log-opts="$B..HEAD" + gitleaks dir $F
```

- `NO-TYPO-OK` greps the diff of `BlueprintOverlay.tsx` and `PartLettering.tsx` for added lines that set a font, size, weight or colour, and compares them with an allow-list of lines that are moved but unchanged. It has a negative control in T001.
- A failing `RESEAL-LIST-OK`, `ALLOWED-PATHS-OK`, `SURFACES-S2S4S5-OK` or `NO-TYPO-OK` is never fixed by widening the guard. It is a STOP and an escalation with evidence (kickoff Hard Rules 2, 5 and 6).

## Re-seal procedure (RFC §9)

1. The fix commit is green apart from `frozen-surface.test.ts`.
2. **Re-seal commit**, in one diff:
   - `frozen-surface.generate-sN.sh` `base=<fix sha>`;
   - the note gains ` Re-sealed in S16 at <sha>: <files> — <reason>; see .specify/features/label-system/evidence/<T-file>.`;
   - `.paths` gets the new directories and tests;
   - run the generator;
   - update `frozen-surface.test.ts` (`base`, `note`).
3. `pnpm --filter xploder exec vitest run test/frozen-surface.test.ts` must be green.
4. **Tag:** `bash $F/seal-tag.sh <surface> <fix sha>` creates the annotated tag `seal/<surface>-<sha7>` (message: the note line), runs `git push origin refs/tags/seal/<surface>-<sha7>`, and verifies the tag with `git ls-remote`.
   - If the push is rejected: STOP and hand it to Murphy with the exact command.
5. Merge the task branch back with `--no-ff`. The tag keeps the fix SHA reachable after the squash merge.

## Key implementation notes

- **Pass (T002, RFC §3.2, §4.2):**
  - `labelPass` copies today's consumer argument-building verbatim (`columnLayers`, `drawingMaxX`, `frameExtent`, names). It calls `overlayBaseModel(…)` exactly as `BlueprintOverlay` does, then the lettering sequence exactly as `PartLettering.update` does.
  - It reuses `placeColumns` and `layerLetteringModel` results only when `offsetY === 0` (§4.2 item 5).
  - `labels` is built from the outputs and never fed back in Stage A.
  - The oracle `test/oracles/labels-s15.ts` is a frozen copy of the two consumers' compute code at `021c1ff`.
- **Viewer (T003, R1, R2, R4):**
  - `onOverlay(event)`: on `settled`, call `snapshotFaces(bridge, layout, event)` (R1), then `labelPass({…, target: targetRef.current, zoomFactor: zoomRef.current, extentPx: stageExtent(wrapper)})`. Then `overlayRef.update(event, result)` and `letteringRef.update(event, result)`.
  - Then write `data-xploder-label-passes`.
  - `moving` events pass through unchanged.
  - The memo is a ref keyed by `(event, layout, project, look, target)`.
- **Overlay (T004, R3):**
  - `update(event, result?)` stores `result.overlay` in the pending frame; `baseModel` becomes `settled.overlay`.
  - On apply, if `result.target !== targetRef.current`, call `props.onRepass(event, target)`, which is counted.
  - Without a `result` (a direct use in tests), it falls back to today's `overlayBaseModel` call, so unchanged sealed tests still pass.
- **Gate (T008, RFC §3.3):**
  - Families run in P0→P6 order. `sweep.ts` `intersects(a, b)` is strict SAT with depth > 1/64 px (Q5), and it is the **same** function the unit sweep uses.
  - Conflict re-runs use `letterPartAvoiding`, `layerLetteringModel({ obstacles })` and `tagsModel(…, extraObstacles)`. Hidden labels are removed from the render lists (R7).
  - The guarantee step counts `guarded`; the unit test asserts `guarded === 0`.
- **Slots (T009/T010, RFC §7):**
  - `overlayStateModel(base, project, focus, tour, highlight, look, slots?)`: when `slots` is given it overrides `highlight`. Each emphasised label carries `emphasis: true` and `emphasisSlots`. Columns mode draws one leader per emphasised label.
  - `TeardownViewer` tracks `focusedProxyId` via `focusin`/`focusout`. `selected = detailOpenId ?? focusedProxyId`, `hover = viewer.highlight`. `EmphasisState.selected` takes the same `selected` (Q8).
  - `PartLettering` receives `emphasis: { hover, selected }` instead of `highlight`, and its colour helpers test membership.

## Test map

| Check | Where | FR |
|---|---|---|
| pass ≡ S15 consumers (exact) on the corpus | `packages/xploder/test/label-pass-parity.test.ts` | FR2 |
| Stage A pixels + DOM 0 diff | `label-matrix.mjs` + `parity-compare.mjs` | FR2 |
| noise floor base vs base | `parity-compare.mjs` on two T001 runs | FR2 |
| one pass per settle; 0 on re-render | `apps/web/test/xploder-dom/label-pass.dom.test.tsx`, `label-passes.mjs` | FR4 |
| 60-frame stability | `label-passes.mjs --churn` | FR4 |
| model sweep + seeded control | `packages/xploder/test/label-sweep.test.ts` | FR1 |
| browser sweep + seeded control | `label-matrix.mjs --control` + `label-sweep.mjs` | FR1 |
| S7 entry points identical without obstacles | `packages/xploder/test/lettering-obstacles.test.ts`; sealed S7 tests byte-identical | FR1 |
| Stage B clusters explained | `parity-compare.mjs --base-sweep` | FR2 |
| slot model | `packages/xploder/test/overlay-emphasis-slots.test.ts` | FR3 |
| six §7.1 rows | `apps/web/test/xploder-dom/label-emphasis.dom.test.tsx`, `label-emphasis.mjs` | FR3 |
| timing ×1/×4 | `settle-timing.mjs` base vs head; `bench-pass.ts` | FR5 |
| gzip Δ | `bundle-gzip.mjs --diff` | FR5 |
| draws, hero, reduced motion | `site:probe --group draws,hero,reduced-motion`, `eager:probe --expect live-loop` | FR5, FR6 |
| surfaces, re-seals, tags, gitleaks | `guards.sh`, frozen-surface tests | FR6 |
| gates | CI (7 required) + Lighthouse/weight on the preview + `engine:probe` | FR6 |

## Phase groups (Stage 3 STOP points)

- **G1 — baselines:** T001. A conditional STOP only if the noise floor is not 0 px (Risk 1).
- **G2 — Stage A:** T002–T005 → **[STOP 1]**. Wait for Murphy's "continue" (kickoff Hard Rule 3).
- **G3 — Stage B:** T006–T012 → STOP (final). Murphy validates; "S16 done" happens outside the agent's view.

Conditional STOPs anywhere: a red sealed test that is not on the approved list; gzip Δ > 2 KB; a non-zero `guarded` count; an unexplained Stage B cluster; a 0 px miss in Stage A; a rejected tag push; ≥ 85 % of the 5 h usage window.

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| A conflict gate instead of one greedy pass with every obstacle on | The greedy pass can change states that had no overlap: the search node limit, all-or-none columns and the face-name rules are not monotone. The gate makes AC2 hold by construction (RFC Q3) |
| Keeping both coordinate-space evaluations when `offsetY ≠ 0` | Merging them is invisible (C4) but not bit-identical. Keeping them costs one extra `placeColumns` on scrolled settles only |
| Ghost S6 tags kept as reservations | Removing them moves notes in states without an overlap (C5), which breaks AC2 |
| A frozen oracle copy of the consumers | Exact equality against today's code is the strongest Stage A proof, and it survives the later Stage B edits (the S11.8 pattern) |
| Offline sweep over quad dumps | One implementation gives the S15 census, the Stage A census and the Stage B result from the same data (R8) |
