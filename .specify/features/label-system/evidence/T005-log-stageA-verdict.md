# T005 — Stage A verdict (orchestrator) · STOP 1

**Head:** Stage A at `68e05b9` + T005 scripts. The head export is `/tmp/s16-checks/a-out` and `a-out-fixtures`.
**Base:** `021c1ff` (`sbase1..3`).
**Machine:** the same machine and Chromium 156.0.8078.4 throughout. Every matrix run is serial (`--workers 1`, RFC R11).

## 1. Matrix comparison (R11 gate: first head run vs `sbase1`)

`T005-log-parity-stageA.md`: `parity: FAIL (2040 cells, 288107 px)`.

| set | cells | result |
|---|---:|---|
| pixel-stable in the base (all 3 runs identical) | 1,734 | 1,674 identical in the first head run; 60 gated failures (53 with px, 7 DOM-only) |
| pixel-unstable in the base (R11 "base-unstable") | 306 | not decidable by pixels; listed in `T005-log-parity-stageA.md` |
| home hero (sweep-only, R9) | 12 | not compared |

## 2. Why the 60 failures are not Stage A (`T005-log-parity-failures.md`, `T005-log-input-diff.txt`)

1. **50 of 60: the upstream input differed.**
   - The settle offset the projector handed to the labels (the label layer's `translateY`), or the stage extent, differs between base and head in the same cell.
   - Example: `jev-toolkit-390-light-exploded-z0-n-a-t3` was at offset 0 in the base and 0.0097361 px in the head. The same 0.0096 px class was seen in base-only runs (`T001-log-noise-diagnosis.md`).
   - The label pass cannot produce that value: it is an input.
2. **Every one of the 60 was re-run** (`T005-log-reproduce.md`, `reproduce-check.mjs`):
   - three more head runs (`stageA2..4`);
   - five more base and head runs of the four pages with same-input pixel diffs (`T005-log-knife-repeats.txt`).
   - A deterministic code change gives the same output for the same input. So a head cell that is byte-identical (pixels, plus DOM where the base is DOM-stable) to **some** base run shows the head produces the S15 result there.
   - **53 of 60 reproduced exactly.**
   - Example: in `jev-toolkit-768-dark-exploded-z4-bottom-t1`, the stack note lands at y = 1.19 or y = −14.81 in **base** runs (3 of 8) and in head runs (2 of 6) alike.
3. **The other 7 never matched in 4 head runs, but in each of them the overlay layer itself differs.**
   - The S6 overlay output (labels **and** dimension strokes) is a pure function of the projector's frame, size, offset and target. T002 proved it identical to S15 on identical inputs: 2,272 cases, 0 differing values. The offset is identical in these 7 cells.
   - So the frame from the unchanged projector differed (by 1e-13 px in three cells; 7e-4 to 7e-3 px in four `middle` cells).
   - The head runs also disagree with **each other** in these cells (fixture-b z3: 4 different DOM hashes in 4 head runs; fixture-a z5: 3 in 4; websocket-inspector-1440-dark z2 top: 2 in 4). The settle frame is projected before the label pass runs, so a difference in it can only come from upstream timing (the S4/S5 scroll-extent feedback), not from a label decision. Stage A code cannot produce run-to-run variation from one input.

**Conclusion:** every cell is accounted for. No cell differs where the input is shown to be the same, and in every compared cell the head is either identical to the base or shows input noise of the class found in T001.

## 3. One pass per settle, no churn (`T005-log-passes-smoke.md`, `--churn`)

- `passes: PASS`.
- Every motion step (toggle, zoom ×5, turn ×4, zoom reset, a resize that changes the viewer size) gives passes = settles ≥ 1.
- Every no-pass action (hover, panel open/close, scroll, palette, focus, idle) gives 0 / 0.
- R3 re-pass count: 0. Every churn sample is `identical 60/60` with the counter unchanged.
- The T005 executor run had 4 FAIL rows. They were desktop resizes (1440 ↔ 1280) that do not change the viewer box (it stays 1086 px wide), so no settle is due. That was an expectation bug in the script, fixed by the orchestrator: a resize now expects a settle only when the viewer box changes.

## 4. Cost so far

- Gzip `472,002 → 473,047 B` (**+1,045 B** of the 2,048 B slice budget; `T005-log-gzip.txt`).
- No new dependency.

## 5. For Murphy at STOP 1

- The R11 gate as written (the first head run vs `sbase1` on pixel-stable cells) **fails on 60 cells**. Section 2 shows they are upstream input noise, using the stronger rule "the head reproduces a base run exactly".
- This rule (RFC R12) is an orchestrator refinement and needs Murphy's acceptance.
