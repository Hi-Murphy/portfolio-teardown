# Tasks: S16 Label System (E3, E6)

**Input:** `rfc.md` (approved, §13 Gate 1: all defaults + R1–R8), `spec.md`, `plan.md` in `.specify/features/label-system/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1): `codex exec -p deepseek -C <worktree> -s danger-full-access "<prompt>" < /dev/null`.
- The **sandbox is off** for every task: the checks build with Turbopack, run vitest on loopback or launch Chromium, and the Codex sandbox blocks all three. The prompt limits writes to the task worktree and `/tmp/s16-checks`.
- Before each phase group's first dispatch, probe the executor: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`.
- A DeepSeek 402 means the executor is *unavailable*, not that it failed. Pause, report, and offer three choices: top-up, orchestrator on "go", or split.

**Escalation (kickoff Hard Rule 10, RFC Q15):**
- Tier 1.5 (OpenRouter) is **DORMANT**: skipped, and the skip is recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage (`$CLAUDE_CONFIG_DIR/usage/usage.json`, flagged if ≥ 90%), then finishes the task personally on "go".
- Each report states the finishing tier and any skip.
- A failing `RESEAL-LIST-OK`, `ALLOWED-PATHS-OK`, `SURFACES-S2S4S5-OK` or `NO-TYPO-OK` guard is never "fixed" by widening the guard. It is a STOP and an escalation with evidence.

**Hard STOPs inside tasks (no workaround):**
- Stage A shows a non-zero pixel diff on a pixel-stable cell, a DOM diff on a DOM-stable cell, or any oracle mismatch (RFC R11);
- `guarded > 0` in a sweep;
- a Stage B cluster has no attributed reason;
- the gzip Δ exceeds 2,048 bytes;
- an S2/S3/S4/S5 file, or an unapproved sealed file, would need to change;
- a seal tag push is rejected.

**Usage pacing:** at ≥ 85% of the 5h window, no new task starts. Finish and commit the current task, tick the ledger, report, then STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s16-label-system`, on branch `task/s16-label-system-tNNN`. The orchestrator reviews it, re-runs the check, and merges it back with `--no-ff`. A worktree is removed only after its merge (global rule).

**Evidence doctrine (kickoff Hard Rule 9):** every claim attaches a machine artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`). Browser logs carry a header with the command, target, Chromium version, CPU throttling and commit. Budgets come from `tools/perf/src/budgets.ts` and are never changed.

**Format & rules (every task):**
- **Start of every check:** `set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system`.
- **End of every check:** `bash $F/guards.sh` (from T001 on), then `pnpm typecheck && pnpm lint && pnpm test`.
- **Build:** tasks that read `apps/web/out` run `pnpm build` first; tasks that read `out-fixtures` run `pnpm build:fixtures` first. Exports are copied to `/tmp/s16-checks/<name>-out` because the two builds share `apps/web/out*`.
- **Test-first (Hard Rule 4):** each fix task first commits the red test alone, with the failing output saved as `T<NNN>-log-red.txt` (non-zero exit). Only then does it commit the fix, with `T<NNN>-log-green.txt`. A pure-parity task (T002–T004) is red by a missing module or signature, then green with **zero** differences.
- **Bytes:** every task that changes client code ends with `node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json apps/web/out` and logs the cumulative Δ.
- **No literals:** no motion or colour literals, and no font, size, weight or colour change (Hard Rule 6).
- **Never touch:** `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, S2/S4/S5 paths, the 21 S3 tool files, or any sealed file not on `approved-xploder-src.txt`.
- **Commits:** message prefix `S16/TNNN:`, ending with the attribution line. Run `gitleaks dir` on new prose and evidence before each commit. Stage-boundary commits on the slice branch use `S16/stage-N:`.
- **Re-seal tasks** follow plan.md "Re-seal procedure", including the pushed tag. Its name and SHA go in the ledger.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA | Seal tag |
|---|---|---|---|---|---|
| T001 | ☑ after R11 (guards 9/9 OK + 4 negative controls bite; gzip base 472,002 B; timing base 12 cells 10/10; first 4-worker noise floor FAIL → diagnosed (S4/S5 scroll-extent feedback + load), Murphy chose option A; 3 serial base runs × 2,052 cells, 0 settle timeouts, 54 min each; pixel-stable 1,734 / 2,040, DOM-stable 242, pixel-unstable 306 (257 of them `middle`)) | 1 (Flash, sandbox off, 1 dispatch); orchestrator diagnosis, R11 tooling, serial base runs | evidence/T001-* | 3bc97b6 + 9f5da5b | — |
| T002 | ☑ (red: module missing; green: 2,272 cases, 0 differing values (`Object.is` walker); placers unchanged; S6 frozen 6/6; xploder 706, web 298 + 6 skipped, perf 309) | 1 (Flash, sandbox off, 1 dispatch) | evidence/T002-log-{red,green,reseal}.txt | 9dd6d9a (fix 76ca441) | `seal/s6-76ca441` (pushed) |
| T003 | ☐ | | | | `seal/s8-…` |
| T004 | ☐ | | | | `seal/s6-…` |
| T005 | ☐ (→ STOP 1) | | | | — |
| T006 | ☐ | | | | — |
| T007 | ☐ | | | | `seal/s7-…` |
| T008 | ☐ | | | | `seal/s6-…` |
| T009 | ☐ | | | | `seal/s6-…` |
| T010 | ☐ | | | | `seal/s8-…` |
| T011 | ☐ | | | | — |
| T012 | ☐ (→ final STOP) | | | | — |

---

## Phase G1 — Baselines (conditional STOP)

### T001 [US2, US5, US6] Guards, scripts, and every baseline on `021c1ff`

- **Seam:** branch ↔ frozen surfaces and the no-drive-by fence; base export ↔ every "before" number.
- **Files:**
  - `guards.sh` (the plan.md block), `approved-xploder-src.txt` (plan.md "Approved sealed edits", as `packages/xploder/...` paths), `seal-tag.sh` (the S15 copy, surfaces `s6 | s7 | s8`, note marker `Re-sealed in S16`).
  - Scripts:
    - `label-matrix.mjs <repo> <baseUrl> --out <dir> [--routes projects|fixtures|home] [--workers 4]`: the RFC §5.2 cells.
      - Per cell it writes a viewport PNG, `quads.json` (every §5.1 marker: key, kind, quad, painted flag, computed effective opacity) and `dom.html` (the `outerHTML` of `[data-xploder-overlay]` and `[data-xploder-lettering-layer]`).
      - It waits on `xploder:settled` + fade end. Order inside a cell: zoom → scroll → turn.
    - `parity-compare.mjs <runA> <runB> [--base-sweep <sweep.json>]`: per-cell differing pixels (`tools/perf/src/png.ts`), DOM string equality, and 8-connected cluster bounding boxes.
    - `settle-timing.mjs`: the S15 copy with an S16 header, method unchanged, plus a `--compare <base.md> <head.md>` mode (per-cell Δ median vs +10 % and vs the base run spread).
    - `bundle-gzip.mjs [--write <file>] [--diff <before.json> <outDir>]` (R5).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  bash $F/guards.sh | tee $E/T001-log-guard.txt          # all OK
  # negative controls: one S5 file, one S2/S4 file, one unapproved S7 file, one renderer colour edit, one unrelated app file
  printf ' ' >> packages/xploder/src/interaction/pointer.ts; printf ' ' >> packages/xploder/src/react/scene/CameraRig.tsx
  printf ' ' >> packages/xploder/src/lettering/column.ts; printf ' ' >> apps/web/components/project-card.tsx
  sed -i '' 's/fontWeight: 600/fontWeight: 700/' packages/xploder/src/react/lettering/PartLettering.tsx
  if bash $F/guards.sh > /tmp/s16-checks/t001-neg.txt 2>&1; then echo NEG-CONTROL-FAILED; exit 1; fi
  git checkout -- packages/xploder/src apps/web/components/project-card.tsx
  grep FAIL /tmp/s16-checks/t001-neg.txt | tee -a $E/T001-log-guard.txt   # expect SURFACES-S2S4S5, RESEAL-LIST, ALLOWED-PATHS, NO-TYPO
  git ls-remote --tags origin 'seal/*' | tee $E/T001-log-seal-tags-base.txt
  # base exports
  git worktree add --detach /tmp/s16-base 021c1ff
  (cd /tmp/s16-base && pnpm install --frozen-lockfile && pnpm build && cp -R apps/web/out /tmp/s16-checks/base-out \
     && pnpm build:fixtures && cp -R apps/web/out-fixtures /tmp/s16-checks/base-out-fixtures)
  git worktree remove --force /tmp/s16-base
  node $F/bundle-gzip.mjs --write /tmp/s16-checks/base-gzip.json /tmp/s16-checks/base-out | tee $E/T001-log-gzip-base.txt
  pnpm serve:out --dir /tmp/s16-checks/base-out --port 4616 & S1=$!
  pnpm serve:out --dir /tmp/s16-checks/base-out-fixtures --port 4617 & S2=$!; sleep 3
  for run in base1 base2; do
    node $F/label-matrix.mjs $PWD http://127.0.0.1:4616 --out /tmp/s16-checks/$run --routes projects,home
    node $F/label-matrix.mjs $PWD http://127.0.0.1:4617 --out /tmp/s16-checks/$run --routes fixtures
  done
  node $F/parity-compare.mjs /tmp/s16-checks/base1 /tmp/s16-checks/base2 > $E/T001-log-parity-noise.md   # STOP unless 0 px + DOM equal in every cell
  node $F/settle-timing.mjs $PWD http://127.0.0.1:4616 --cpu 1,4 --runs 10 > $E/T001-log-timing-base.md
  kill $S1 $S2
  cp /tmp/s16-checks/base1/summary.json $E/T001-log-matrix-base.json      # cell list + label counts; quads kept in /tmp for T006
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `T001-log-guard.txt` (all OK, plus the four negative-control FAILs) · `T001-log-seal-tags-base.txt` · `T001-log-gzip-base.txt` · `T001-log-parity-noise.md` · `T001-log-timing-base.md` · `T001-log-matrix-base.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; the negative controls show the guards bite).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: base `021c1ff`).
  2. Only if the noise floor is not 0 px: a decision on the non-deterministic cells (default proposal: STOP and escalate with the diff masks; no tolerance is introduced).

---

## Phase G2 — Stage A: model merge at 0 px (STOP 1 after T005)

### T002 [US2] `labelPass` + oracle parity (S6) → re-seal S6 + tag

- **Seam:** today's two consumers ↔ one pure pass (RFC §3.2, §4.2 items 1, 2 and 5).
- **Files:**
  - **Red commit:**
    - `packages/xploder/test/oracles/labels-s15.ts`: verbatim copies of the compute parts of `BlueprintOverlay` (`overlayBaseModel` call) and `PartLettering.update` (projection excluded; takes `faces`), at `021c1ff`.
    - `packages/xploder/test/label-pass-parity.test.ts`: the corpus (S11.8 seed `0x5117e1a`, 2,000 random layouts + fixtures A/B/C + `websocket-inspector` + `jev-toolkit`) × widths 390/768/1440 × the six zoom levels × 4 turns × offsets 0/mid/max × imploded/exploded. Face quads come from `topFaceQuad` + `projectPoint`.
    - `expect(pass.overlay).toStrictEqual(oracle.overlay)` and the same for `lettering`. A custom check asserts `Object.is` on every number.
    - Red: the module is missing.
  - **Fix commit:** `src/labels/types.ts`, `src/labels/pass.ts`, `src/labels/sweep.ts` (the strict SAT predicate, exported but unused until T006).
  - **Re-seal commit:** `frozen-surface.s6.paths` (+ `src/labels`, + the two tests), generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/labels/ — one label model and one pass composing the S6/S7 placers, output-identical (E3) + test/label-pass-parity.test.ts; see .specify/features/label-system/evidence/T002-log-green.txt.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed|Cannot find' $E/T002-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/label-pass-parity.test.ts --reporter verbose 2>&1 | tee $E/T002-log-green.txt
  grep -E 'cases: [0-9]+, differing values: 0$' $E/T002-log-green.txt      # the test prints its own tally
  git diff --quiet 021c1ff -- packages/xploder/src/overlay packages/xploder/src/lettering && echo PLACERS-UNCHANGED
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee $E/T002-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T002-log-reseal.txt
  bash $F/seal-tag.sh s6 <fix sha> | tee -a $E/T002-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `T002-log-red.txt` · `T002-log-green.txt` (case count, 0 differing values) · `T002-log-reseal.txt` (incl. the `ls-remote` line).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the parity tally; nothing is wired yet, so the site is unchanged).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the corpus as listed).

### T003 [US2, US4] The viewer runs the pass; the lettering consumes it; counter (S8) → re-seal S8 + tag

- **Seam:** `OverlayEvent` fan-out ↔ one pass per settle (RFC §3.2, §4.2 items 3 and 4, R1, R2, R4).
- **Files:**
  - **Red commit:** `apps/web/test/xploder-dom/label-pass.dom.test.tsx`. Red: no `data-xploder-label-passes`, and the lettering still computes its own result.
    - One `settled` event → counter `1`, and `PartLettering` renders the pass result (spy on `labelPass`: one call).
    - Re-renders with a new hover, focus or tour status → still `1`.
    - A `moving` event → `1`.
    - A second `settled` event → `2`.
    - The camera is `null` at event time → the lettering is not updated, as today (R2).
  - **Fix commit:**
    - `src/react/labels/faces.ts` (moved projection, R1);
    - `TeardownViewer.tsx`: `onOverlay` runs `snapshotFaces` + `labelPass` once, `update(event, result)`, writes the counter; refs for target and zoom;
    - `PartLettering.tsx`: `update(event, result)` uses `result.lettering`. Render code untouched.
    - `viewer-moving.dom.test.tsx` mock shape only, if needed.
  - **Re-seal commit:** `frozen-surface.s8.paths` (+ `src/react/labels`), generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/react/TeardownViewer.tsx + src/react/lettering/PartLettering.tsx + src/react/labels/faces.ts — the viewer runs the label pass once per settle and the lettering renders its result; data-xploder-label-passes (E3); see .specify/features/label-system/evidence/T003-log-green.txt.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed' $E/T003-log-red.txt && echo RED-RECORDED
  pnpm --filter web exec vitest run test/xploder-dom --reporter verbose 2>&1 | tee $E/T003-log-green.txt
  git diff 021c1ff -- packages/xploder/src/react/lettering/PartLettering.tsx | grep -E '^[-+].*(style=|font|color)' && { echo RENDER-TOUCHED; exit 1; } || echo RENDER-UNTOUCHED
  pnpm build && node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json apps/web/out | tee $E/T003-log-gzip.txt
  bash packages/xploder/test/frozen-surface.generate-s8.sh | tee $E/T003-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T003-log-reseal.txt
  bash $F/seal-tag.sh s8 <fix sha> | tee -a $E/T003-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `T003-log-red.txt` · `T003-log-green.txt` · `T003-log-gzip.txt` · `T003-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the jsdom log; the pixel proof comes in T005).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T004 [US2, US4] The overlay consumes the pass (S6) → re-seal S6 + tag

- **Seam:** `BlueprintOverlay`'s own `overlayBaseModel` call ↔ `result.overlay` (RFC §4.1, R3).
- **Files:**
  - **Red commit:** additional cases in `label-pass.dom.test.tsx`. Red: the overlay still calls `overlayBaseModel`.
    - Spy: `overlayBaseModel` is called only inside `labelPass` (one call per settle).
    - The R3 mismatch path: force a target change without `moving` (test-only) → one counted re-pass.
  - **Fix commit:** `BlueprintOverlay.tsx`. `update(event, result?)`; `baseModel = settled.overlay`; R3 check; the fallback to `overlayBaseModel` when no `result` is given (sealed S6 tests unchanged). JSX untouched.
  - **Re-seal commit:** S6 generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/react/overlay/BlueprintOverlay.tsx — renders the label pass's overlay model instead of placing its own (E3); see .specify/features/label-system/evidence/T004-log-green.txt.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed' $E/T004-log-red.txt && echo RED-RECORDED
  pnpm --filter web exec vitest run test/xploder-dom --reporter verbose 2>&1 | tee $E/T004-log-green.txt
  pnpm --filter xploder exec vitest run test/blueprint-scene.test.tsx test/overlay-*.test.ts* 2>&1 | tee -a $E/T004-log-green.txt   # sealed S6 tests unchanged + green
  git diff 021c1ff -- packages/xploder/src/react/overlay/BlueprintOverlay.tsx | grep -E '^[-+].*(style=|font|color|labelStyle)' && { echo RENDER-TOUCHED; exit 1; } || echo RENDER-UNTOUCHED
  pnpm build && node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json apps/web/out | tee $E/T004-log-gzip.txt
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee $E/T004-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T004-log-reseal.txt
  bash $F/seal-tag.sh s6 <fix sha> | tee -a $E/T004-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `T004-log-red.txt` · `T004-log-green.txt` · `T004-log-gzip.txt` · `T004-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the logs).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T005 [US2, US4] Stage A proof: full matrix 0 px + DOM identical + one pass → **[STOP 1]**

- **Seam:** the S15 baseline ↔ the Stage A head, on every cell (RFC §4.2 b and c, §6).
- **Files:**
  - `label-passes.mjs` (smoke mode): per route, explode / zoom ×5 / turn ×4 / resize / implode → Δcounter per `xploder:settled`; hover, panel open/close, scroll, palette, focus and 2 s idle → Δ0. It also reports the count of R3 re-passes.
  - Evidence only; no product change.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  pnpm build && rm -rf /tmp/s16-checks/a-out && cp -R apps/web/out /tmp/s16-checks/a-out
  pnpm build:fixtures && rm -rf /tmp/s16-checks/a-out-fixtures && cp -R apps/web/out-fixtures /tmp/s16-checks/a-out-fixtures
  pnpm serve:out --dir /tmp/s16-checks/a-out --port 4618 & S1=$!
  pnpm serve:out --dir /tmp/s16-checks/a-out-fixtures --port 4619 & S2=$!; sleep 3
  node $F/label-matrix.mjs $PWD http://127.0.0.1:4618 --out /tmp/s16-checks/stageA --routes projects,home --workers 1
  node $F/label-matrix.mjs $PWD http://127.0.0.1:4619 --out /tmp/s16-checks/stageA --routes fixtures --workers 1
  node $F/parity-compare.mjs /tmp/s16-checks/sbase1 /tmp/s16-checks/stageA --stable $E/T001-log-stable-cells.json > $E/T005-log-parity-stageA.md   # R11: 0 px on every pixel-stable cell, DOM equal on every DOM-stable cell
  grep -q '^parity: PASS' $E/T005-log-parity-stageA.md
  node $F/label-passes.mjs $PWD http://127.0.0.1:4618 > $E/T005-log-passes-smoke.md                      # +1 per settle, 0 otherwise, 0 re-passes
  kill $S1 $S2
  node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json /tmp/s16-checks/a-out | tee $E/T005-log-gzip.txt
  bash $F/guards.sh | tee $E/T005-log-guards.txt && pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `T005-log-parity-stageA.md` (per-cell table: px, DOM, base stability; the base-unstable list, R11) · `T005-log-passes-smoke.md` · `T005-log-gzip.txt` · `T005-log-guards.txt` · two sample screenshot pairs per route (`T005-screenshot-<route>-<cell>-{base,head}.png`).
- **Then:** stage-boundary commit `S16/stage-3A: model merge at 0 px`, and **STOP**. Report the parity table summary, pass counts, gzip Δ so far and tags pushed.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `T005-log-parity-stageA.md`: every cell should read `0 px · DOM equal`.
  2. Optional, 1 min: open `/projects/jev-toolkit` from the branch build (`pnpm build && pnpm serve:out`), zoom and turn. It should look exactly like `main`.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. **"continue"** to start Stage B (kickoff Hard Rule 3). There is no default: the agent waits.

---

## Phase G3 — Stage B: placement behaviour and emphasis (after "continue")

### T006 [US1] Sweep before switch: unit + browser sweep, seeded controls, census on S15 and Stage A

- **Seam:** label quads ↔ a pair verdict (RFC §5, R8). Kickoff Hard Rule 4: this lands **before** T008.
- **Files:**
  - `label-sweep.mjs <runDir> [--json <out>]`: every pair per cell, with the strict SAT predicate (depth > 1/64 px). Output: hits per cell and every rectangle.
  - `label-matrix.mjs --control`: a 1 px clone per route; the script exits 1 if the clone is not detected.
  - `packages/xploder/test/label-sweep.test.ts` (unsealed until T008):
    - the model sweep of `labelPass(…).labels` over the T002 corpus;
    - the unit seed: one pair is reported; a touching copy is reported as 0;
    - a `sweep.ts` predicate table (overlap, touch, contained, rotated).
    - The model-sweep case is expected **red** on Stage A if C2 overlaps exist; it is marked `test.fails` only until T008, and the census is recorded.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  pnpm --filter xploder exec vitest run test/label-sweep.test.ts --reporter verbose 2>&1 | tee $E/T006-log-sweep-unit.txt   # seed detected; model census printed
  node $F/label-sweep.mjs /tmp/s16-checks/sbase1 --json $E/T006-log-census-s15.json > $E/T006-log-census-s15.md
  node $F/label-sweep.mjs /tmp/s16-checks/stageA --json $E/T006-log-census-stageA.json > $E/T006-log-census-stageA.md
  cmp <(jq -S .cells $E/T006-log-census-s15.json) <(jq -S .cells $E/T006-log-census-stageA.json) && echo CENSUS-IDENTICAL
  pnpm serve:out --dir /tmp/s16-checks/a-out --port 4618 & S1=$!; sleep 3
  node $F/label-matrix.mjs $PWD http://127.0.0.1:4618 --control --out /tmp/s16-checks/control | tee $E/T006-log-sweep-control.txt   # exit 0 only if every seed is detected
  kill $S1
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `T006-log-sweep-unit.txt` · `T006-log-census-s15.{md,json}` (the AC2 "had an overlap" list, with rectangles) · `T006-log-census-stageA.{md,json}` · `T006-log-sweep-control.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `T006-log-census-s15.md`: the list of states where labels overlap today. Only these may change in T008.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; if the census is empty, T008 still lands the gate and guarantee, and AC2 then expects 0 px everywhere).

### T007 [US1] S7 obstacle entry points, output-identical without obstacles (S7) → re-seal S7 + tag

- **Seam:** S7 placers ↔ external obstacles (RFC §3.3 step 3, R6).
- **Files:**
  - **Red commit:** `packages/xploder/test/lettering-obstacles.test.ts`. Red: the exports are missing.
    - `letterPartAvoiding` without obstacles ≡ `letterPart` on the T002 corpus faces;
    - with an obstacle on the chosen face spot → next grid point / smaller size / mark;
    - with every mark candidate blocked → `null`;
    - `layerLetteringModel({ obstacles: [] })`: a second plate name avoids the first;
    - absent `obstacles` ≡ today.
  - **Fix commit:** `src/lettering/place.ts` (`letterPartAvoiding`), `layers.ts` (optional `obstacles`), `model.ts` (optional `obstacles` → `letterPartAvoiding`). Existing exports are byte-identical in behaviour.
  - **Re-seal commit:** `frozen-surface.s7.paths` (+ the test), generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/lettering/place.ts + layers.ts + model.ts — optional obstacles for the unified label pass; output-identical without them (E3) + test/lettering-obstacles.test.ts; see .specify/features/label-system/evidence/T007-log-green.txt.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed|is not a function|has no exported' $E/T007-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/lettering-obstacles.test.ts test/lettering.test.ts test/lettering-column.test.ts test/lettering-face-names.test.ts test/label-pass-parity.test.ts --reporter verbose 2>&1 | tee $E/T007-log-green.txt
  git diff --quiet 021c1ff -- packages/xploder/test/lettering.test.ts packages/xploder/test/lettering-column.test.ts && echo S7-TESTS-BYTE-IDENTICAL
  bash packages/xploder/test/frozen-surface.generate-s7.sh | tee $E/T007-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T007-log-reseal.txt
  bash $F/seal-tag.sh s7 <fix sha> | tee -a $E/T007-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `T007-log-red.txt` · `T007-log-green.txt` · `T007-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the logs; nothing calls the new entry points yet).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T008 [US1, US2] Switch: the conflict-gated priority pass (S6) → sweep 0, AC2 clusters → re-seal S6 + tag

- **Seam:** the per-family placers ↔ one priority order with gates (RFC §3.1, §3.3, R7).
- **Files:**
  - **Red commit:** `label-sweep.test.ts` drops `test.fails` (red where T006 found model overlaps, or red on the new assertions).
    - `guarded === 0`;
    - the unit seed injected **into the pass input** (an extra obstacle-blind label) is resolved;
    - every T006 model-census cell → 0.
  - **Fix commit:** `src/labels/pass.ts` (P0→P6 gates, re-runs, fallbacks, guarantee); `src/overlay/model.ts` (`tagsModel` optional `extraObstacles`, appended after the existing obstacles so `excludeObstacles` indices hold).
  - **Re-seal commit:** S6 paths (+ `test/label-sweep.test.ts`), generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/labels/pass.ts + src/overlay/model.ts — conflict-gated priority pass: a label family keeps its S15 placement unless it overlaps a higher-priority label (E3) + test/label-sweep.test.ts; see .specify/features/label-system/evidence/T008-log-sweep-matrix.md.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed' $E/T008-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/label-sweep.test.ts test/label-pass-parity.test.ts test/overlay-*.test.ts --reporter verbose 2>&1 | tee $E/T008-log-green.txt
  # parity-oracle test: still exact for every corpus case WITHOUT a conflict; conflicting cases listed by key (the test prints them)
  pnpm build && rm -rf /tmp/s16-checks/b-out && cp -R apps/web/out /tmp/s16-checks/b-out
  pnpm build:fixtures && rm -rf /tmp/s16-checks/b-out-fixtures && cp -R apps/web/out-fixtures /tmp/s16-checks/b-out-fixtures
  pnpm serve:out --dir /tmp/s16-checks/b-out --port 4620 & S1=$!
  pnpm serve:out --dir /tmp/s16-checks/b-out-fixtures --port 4621 & S2=$!; sleep 3
  node $F/label-matrix.mjs $PWD http://127.0.0.1:4620 --out /tmp/s16-checks/stageB --routes projects,home --workers 1
  node $F/label-matrix.mjs $PWD http://127.0.0.1:4621 --out /tmp/s16-checks/stageB --routes fixtures --workers 1
  node $F/label-matrix.mjs $PWD http://127.0.0.1:4620 --control --out /tmp/s16-checks/controlB | tee $E/T008-log-sweep-control.txt
  kill $S1 $S2
  node $F/label-sweep.mjs /tmp/s16-checks/stageB --json $E/T008-log-sweep-matrix.json > $E/T008-log-sweep-matrix.md
  grep -q '^sweep: PASS (0 intersections' $E/T008-log-sweep-matrix.md
  node $F/parity-compare.mjs /tmp/s16-checks/sbase1 /tmp/s16-checks/stageB --base-sweep $E/T006-log-census-s15.json --stable $E/T001-log-stable-cells.json > $E/T008-log-parity-stageB.md
  grep -q '^parity: PASS' $E/T008-log-parity-stageB.md   # 0 px in every 0-hit cell; every cluster attributed
  node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json /tmp/s16-checks/b-out | tee $E/T008-log-gzip.txt
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee $E/T008-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T008-log-reseal.txt
  bash $F/seal-tag.sh s6 <fix sha> | tee -a $E/T008-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:**
  - `T008-log-red.txt` · `T008-log-green.txt`;
  - `T008-log-sweep-matrix.{md,json}` (the **AC1 table**, every rectangle);
  - `T008-log-sweep-control.txt`;
  - `T008-log-parity-stageB.md` (the **AC2 table** + cluster list: cell, bbox, label key, old quad → new quad / hidden, base pair);
  - before/after screenshots per changed cell (`T008-screenshot-<cell>-{base,head}.png`), plus diff masks for the changed cells only;
  - `T008-log-gzip.txt` · `T008-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the before/after pairs in `T008-log-parity-stageB.md`. Each should show a former overlap now resolved, with nothing else changed.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; a hidden label on conflict is listed and accepted per Q3).

### T009 [US3] Two emphasis slots in the overlay (S6) → re-seal S6 + tag

- **Seam:** a single `highlight` id ↔ `{ hover, selected }` (RFC §7.1, §7.2).
- **Files:**
  - **Red commit:** `packages/xploder/test/overlay-emphasis-slots.test.ts`. Red: the slots are ignored.
    - tags and columns modes: A selected + B hovered → both labels `emphasis: true` with `emphasisSlots`; columns → two leaders with the existing `emphasisRole`;
    - same id in both slots → one;
    - a tour → the trail ignores the slots;
    - an old-signature call ≡ today.
  - **Fix commit:** `src/overlay/model.ts` (`overlayStateModel(…, slots?)`, `overlayHighlight` over a set); `BlueprintOverlay.tsx` (`selected` prop, `data-xploder-emphasis-slot`; `data-xploder-emphasis="true"` kept; `labelStyle` unchanged).
  - **Re-seal commit:** S6 paths (+ the test), generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/overlay/model.ts + src/react/overlay/BlueprintOverlay.tsx — hover and selected as two emphasis slots, existing emphasis style (E6) + test/overlay-emphasis-slots.test.ts; see .specify/features/label-system/evidence/T009-log-green.txt.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed' $E/T009-log-red.txt && echo RED-RECORDED
  pnpm --filter xploder exec vitest run test/overlay-emphasis-slots.test.ts test/overlay-model.test.ts test/overlay-tour-trail.test.ts --reporter verbose 2>&1 | tee $E/T009-log-green.txt
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee $E/T009-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T009-log-reseal.txt
  bash $F/seal-tag.sh s6 <fix sha> | tee -a $E/T009-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
- **Evidence:** `T009-log-red.txt` · `T009-log-green.txt` · `T009-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the unit log; the viewer is wired in T010).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T010 [US3] Slots wired in the viewer and the lettering; focus = selected; tile in sync (S8) → re-seal S8 + tag

- **Seam:** viewer state (hover, open panel, focused proxy) ↔ both label layers and the tile input (RFC §7.1, Q8).
- **Files:**
  - **Red commit:** `apps/web/test/xploder-dom/label-emphasis.dom.test.tsx`, the six RFC §7.1 rows. Each asserts `data-xploder-emphasis-slot` on the S6 label **and** the lettering element, plus the `Scene` emphasis input (the R5 Scene-stub pattern of S15). Red at row 1 (only B is emphasised today) and row 6.
  - **Fix commit:** `TeardownViewer.tsx` (`focusedProxyId`; `selected = detailOpenId ?? focusedProxyId`; slots to `BlueprintOverlay` and `PartLettering`; `EmphasisState.selected` = the same); `PartLettering.tsx` (`emphasis` prop, membership colours, slot attribute; style values unchanged).
  - `label-emphasis.mjs`: browser assertions + screenshots, light/dark × 390/1440 × {A open + B hover, B left, closed, focus A + hover B}.
  - **Re-seal commit:** S8 generator, manifest, `frozen-surface.test.ts`. Note: `Re-sealed in S16 at <sha>: src/react/TeardownViewer.tsx + src/react/lettering/PartLettering.tsx — hover and selected emphasis slots to both label layers; keyboard focus counts as selected; tile input in sync (E6); see .specify/features/label-system/evidence/T010-log-emphasis.md.`
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  grep -Eq 'FAIL|failed' $E/T010-log-red.txt && echo RED-RECORDED
  pnpm --filter web exec vitest run test/xploder-dom --reporter verbose 2>&1 | tee $E/T010-log-green.txt   # incl. viewer-selected (S14) unchanged + green
  pnpm build && pnpm serve:out --port 4622 & S1=$!; sleep 3
  node $F/label-emphasis.mjs $PWD http://127.0.0.1:4622 --shots $E > $E/T010-log-emphasis.md
  kill $S1
  pnpm build:fixtures && pnpm serve:out --dir apps/web/out-fixtures --port 4624 & S2=$!; sleep 3
  for scope in s7 s8; do pnpm engine:probe http://127.0.0.1:4624/ --scope $scope --out /tmp/s16-checks/t010-$scope; done 2>&1 | tee $E/T010-log-engine-probe.txt   # hover → one leader, data-xploder-emphasis kept
  kill $S2
  node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json apps/web/out | tee $E/T010-log-gzip.txt
  bash packages/xploder/test/frozen-surface.generate-s8.sh | tee $E/T010-log-reseal.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts | tee -a $E/T010-log-reseal.txt
  bash $F/seal-tag.sh s8 <fix sha> | tee -a $E/T010-log-reseal.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T010-OK
  ```
- **Evidence:** `T010-log-red.txt` · `T010-log-green.txt` · `T010-log-emphasis.md` (the **AC3 assertions**) · `T010-screenshot-emphasis-<state>-<width>-<scheme>.png` (16) · `T010-log-engine-probe.txt` · `T010-log-gzip.txt` · `T010-log-reseal.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional, 1 min on the branch build: open a part's panel, hover another part. Both names should be emphasised, and leaving keeps the open one.
  2. Tab to a part with the keyboard, then hover another with the mouse: both stay emphasised.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q8 as approved).

### T011 [US4, US5] Cost, passes and churn on the final code

- **Seam:** final head ↔ the T001 base numbers (RFC §8, §10, Q11).
- **Files:**
  - `bench-pass.ts` (Node 24, type stripping): old two-consumer calls (the oracle) vs `labelPass`, on 50 captured real settle frames per project + the fixtures. 5 rounds; median / p95.
  - `label-passes.mjs --churn`: the full AC4 run.
  - Evidence only.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  pnpm build && pnpm serve:out --port 4623 & S1=$!; sleep 3
  node $F/settle-timing.mjs $PWD http://127.0.0.1:4623 --cpu 1,4 --runs 10 > /tmp/s16-checks/timing-head.md
  node $F/settle-timing.mjs --compare $E/T001-log-timing-base.md /tmp/s16-checks/timing-head.md > $E/T011-log-timing.md   # +10 % or inside the spread, per cell
  node $F/label-passes.mjs $PWD http://127.0.0.1:4623 --churn > $E/T011-log-passes.md        # +1 per settle; 0 otherwise; 60/60 identical frames; 0 re-passes
  pnpm site:probe http://127.0.0.1:4623 --group draws,hero,reduced-motion 2>&1 | tee $E/T011-log-drawcalls.txt
  kill $S1
  node --experimental-strip-types $F/bench-pass.ts > $E/T011-log-bench.txt
  node $F/bundle-gzip.mjs --diff /tmp/s16-checks/base-gzip.json apps/web/out | tee $E/T011-log-bundle.md
  pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s16-checks/head-manifest.json && echo RAW-MANIFEST-WRITTEN
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T011-OK
  ```
- **Evidence:** `T011-log-timing.md` (the **AC5 timing table**) · `T011-log-bench.txt` · `T011-log-passes.md` (the **AC4 table**) · `T011-log-drawcalls.txt` · `T011-log-bundle.md` (gzip Δ ≤ 2,048 B; raw Δ).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the tables).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the 10-run spread rule as approved in Q11).

### T012 [US6] Gates, seals, guards, PR, AC self-check → **final STOP**

- **Seam:** slice branch ↔ CI and the Vercel preview (RFC §10).
- **Files:** `evidence/AC-selfcheck.md` (AC1–AC6 verdicts with links); the ledger; the PR body (attribution line).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s16-checks .specify/features/label-system/evidence; E=.specify/features/label-system/evidence; F=.specify/features/label-system
  bash $F/guards.sh | tee $E/T012-log-guards.txt        # incl. SURFACES-S2S4S5-OK, S3-TOOLS-OK, SEAL-TAG-OK
  git diff --stat 021c1ff -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths packages/xploder/test/frozen-surface.s5.paths) | tee $E/T012-log-surfaces.txt   # empty
  git ls-remote --tags origin 'seal/*' | tee $E/T012-log-seal-tags.txt   # the 7 S16 tags present
  git push -u origin task/s16-label-system && gh pr create --draft --base main --title "S16: label system — one label pass, 0 px parity, sweep 0, two-slot emphasis" --body-file /tmp/s16-checks/pr-body.md
  gh pr checks --watch | tee $E/T012-ci.txt
  bash .specify/features/engine-polish/required-contexts.sh <pr> > $E/T012-ci-required-contexts.json   # 7/7
  pnpm perf:lighthouse <preview>/ ; pnpm perf:lighthouse <preview>/projects ; pnpm perf:lighthouse <preview>/projects/jev-toolkit   # ≥ 95/95, CLS 0
  pnpm perf:weight <preview>/ | tee $E/T012-weight.txt                                         # < 3 MB
  pnpm a11y:axe:site <preview> 2>&1 | tee $E/T012-log-axe.txt                                  # 0/0
  pnpm eager:probe <preview> --expect live-loop 2>&1 | tee $E/T012-log-eager.txt               # zero-interaction reveal
  ```
- **Evidence:** `T012-log-guards.txt` · `T012-log-surfaces.txt` · `T012-log-seal-tags.txt` · `T012-ci.txt` · `T012-ci-required-contexts.json` · `T012-lighthouse-summary-{home,projects,jev-toolkit}.json` · `T012-weight.txt` · `T012-log-axe.txt` · `T012-log-eager.txt` · `AC-selfcheck.md`.
- **Then:** stage-boundary commit `S16/stage-3B: placement + emphasis; gates green`, and **STOP** with the AC1–AC6 self-check: the sweep per cell, the clusters with reasons, the emphasis assertions, the pass count, the timing table, the gate matrix, the tags, and the empty S2/S3/S4/S5 diffs.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. On the Vercel preview, on a phone and a laptop:
     - zoom, turn and scroll a project: no label should sit on another;
     - open a panel and hover another part: both names emphasised.
  2. Read `AC-selfcheck.md`.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. **"merge"** when satisfied (standing rule: the orchestrator merges only on Murphy's word). Default: none; the agent waits.
  2. Anything needing Murphy's hands: none expected beyond the preview check (default: no phone tethering, per the S12 preference).
