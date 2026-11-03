# S11.6 — AC1–AC6 self-check (orchestrator)

- **Slice:** S11.6 staged canvas mount. Branch `task/s11.6-staged-canvas-mount`, draft PR #18.
- **Scope:** the brief `.specify/slices/slice-11.6-staged-canvas-mount.md` (frozen, unedited). The design and every gate decision are in `rfc.md` §9.
- **Protocol for every local number** (S11.5 D2):
  - local production export;
  - Playwright Chromium 156, Lighthouse mobile screen/UA;
  - CDP 4× CPU, ANGLE Metal (Apple M4);
  - 2 runs per measurement, median = mean of the 2 raws (all raws in the JSONs).
- **Before** = T004, the re-baseline of S11.5's final state. **Final** = T009, the product code at HEAD.

| AC | Verdict | Evidence (all under `evidence/`) |
|---|---|---|
| **AC1** re-baseline before any change | **MET** | `T004-log-rebaseline.md` (per-path tables, drift vs S11.5, CPU-profile anatomy, dropped-frame timeline, AC4 sequence, bytes/draws/CLS/Lighthouse), `T004-log-task-identity.txt`, `T004-startup-*.json`, `T004-fps-startup-*.json`, `T004-cpuprofile-summary-*.json`, `T004-trace-*.json.gz` (6), `T004-meta.json`. Commit order: `T004-log-rebaseline.md` was added in `c4d71ae`, an ancestor of the first `packages/xploder/src` commit `405bca1`. The `REBASELINE-FIRST-OK` guard checks this |
| **AC2** 0 dropped frames **and** no task > 50 ms in the first 5 s, all paths + hero | **NOT MET: escalated (Hard Rule 2), accepted at G2** | **Long-task half met:** max long task 57.7 / 56.9 / 54.2 ms → **0 ms** on home-move / project-move / project-click (`T009-log-ac2.md`, `T009-fps-startup-*.json`). **Dropped-frame half not met:** 1 / 6 / 6.5 → 2 / 5.5 / 5.5. Blocker (`T005-log-frame-diagnosis.md`): the binding harness's own continuous rAF recorder keeps a frame due, so every task above one frame drops frames. The remaining 25–33 ms tasks include three's single-call `WebGLRenderer` constructor and the first content frame (which must stay one frame for AC4); neither can be split by an allowed lever. Without the recorder the same build drops 1 frame |
| **AC3** parity light + dark, 2 draw calls, CLS 0, client JS ≤ S11.5 final per scope | **PARTLY MET: byte clause missed, escalated, accepted at G2** | Parity 0 differing pixels on 8/8 shots vs the T004 re-baseline (`T009-log-parity.txt`, `T009-screenshot-*`); T004 itself is 0 px vs S11.5 T014. Draw calls 2 (`T009-log-drawcalls.txt`). CLS 0 (clean runs + gated Lighthouse). Bytes (`T009-log-bytes.txt`, four scopes, node zlib level 9): home initial 0 / 0; project initial raw 0, **gzip +2** (only chunk-hash names changed); total and non-initial 3D **+289 B raw / +136 B gzip** (0.03 %). The compaction pass (T008b) already removed 477 B of lever code |
| **AC4** `data-xploder-ready` on the first content frame, reveal sequence unchanged, both routes | **MET** | `T009-log-ready-reveal.md`: attributed runs on all paths, `ready.raf === firstInstancedDraw.raf`, no instanced draw before ready, live-state order identical to T004 (hero `idle → loading → revealed`, workbench `loading → revealed`); `site:probe --group hero` 7/7. Time to first content frame: +5.6 / +8.8 / +8.0 ms vs T004 (`T009-log-before-after.md`, D-P3) |
| **AC5** eager flag on the CI runner, verdict | **MET: verdict keep the gate** | `T011-log-eager-verdict.md`. Run 41637668830: attempt 1 (fast runner, index ≈ 3,900) eager `/` 1.00 / TBT 71.5 ms, project 0.99 / 106 ms → pass; attempt 2 (slow runner, index ≈ 2,200, S11.5's host class) `/` 0.95 / 260 ms, project 0.87 / 506 ms → fail. Both runs must pass, so **keep D-19's gate**. The slow-runner TBT is dominated by ≈ 200 ms react-dom tasks on the eager *load* path, which is outside this slice's levers (follow-up item). A third run (41639534169, T011 push, fast runner) passes as well: 1.00 / 62.5 ms and 0.99 / 100 ms. The outcome tracks runner speed (T011 addendum). Local eager: 1.00 / ≤ 1 ms on both routes (`T010-log-eager-local.md`) |
| **AC6** CI green; S2/S5/S7 empty; touched S4/S6/S8 files re-sealed with a reason note; `XPLODER-SRC-OK` exact | **MET** (see T012 logs) | `T012-ci-run.txt` (all checks on the PR head), `T012-log-guard.txt` (all guards OK), `T012-log-reseal.txt` (S2/S4, S5, S6 and S7 manifests byte-identical to `05e4e16`; S8 changes only `base`, `note` and the `TeardownViewer.tsx` hash; the note names S11.6, the file and each reason), `T012-log-frozen-diffs.txt` (S2/S5/S7 empty; S4/S6/S8 only `TeardownViewer.tsx`), `approved-xploder-src.txt` = exactly `packages/xploder/src/react/TeardownViewer.tsx` |

## Deliverables

1. **Re-baseline:** T004 (AC1).
2. **Staged mount:**
   - **Kept:** L1, the renderer in its own task (T005, with the D-P3 fix for React's 300 ms Suspense retry throttle); L4, R3F configuration in the next task (T006); T008b compaction.
   - **Skipped on evidence:** L2 precompile (T007) and L3 probe (T008).
   - **Measured and reverted:** L5 transitions (T007b).
3. **Re-measurement:** `T009-log-before-after.md`, with every state in one table.
4. **Eager re-run:** T010 (local) + T011 (runner) → keep the gate.
5. **Re-seal:** S8 at every kept lever (`T005`/`T006`/`T008b-log-reseal-s8.txt`) and the final audit `T012-log-reseal.txt`. No S4 or S6 file touched.

## Who finished each task (Hard Rule 8; tier 1.5 dormant, skipped throughout)

| Task | Finished by |
|---|---|
| T001 | tier 1 (DeepSeek Flash 4.1); check re-run by the orchestrator after plan defect D-P1 |
| T002, T003 | tier 1, each after one orchestrator review revision (T003 also had one re-dispatch after an API disconnect, not counted) |
| T004 | tier 1 (measurements, tables) + orchestrator (task identity, interpretation, lever order) |
| T005 | tier 1 after one orchestrator review revision (D-P3 throttle); frame diagnosis by the orchestrator |
| T006, T008b, T009 | tier 1 |
| T007b | tier 1; revert by the orchestrator (no measurable win) |
| T007, T008 | skipped with evidence (G1 / G2 decisions) |
| T010 | tier 1; commit by the orchestrator |
| T011 | orchestrator (push, draft PR #18, both runner runs, verdict) |
| T012 | tier 1 (audit logs) + orchestrator (this self-check) |

No task hit "stuck ×2", so no escalation pause was needed.

## Needs Murphy's hands

1. Final validation of PR #18, then "merge" (the orchestrator merges only on your word).
2. D-19 stays (AC5). Retiring it needs a follow-up that profiles the eager load path on a slow runner (the ≈ 200 ms react-dom tasks).
3. AC2's dropped-frame half and AC3's byte clause are recorded as escalated (accepted at G2). A future brief could revisit either: for example, AC2 measured without the harness's rAF recorder, or a byte offset task.
4. `eager-3d.yml` stays until your D-19 decision.
