# T012 — final matrix on the PR head

**Head:** `12dae35` (T011 ledger; product code = T010 merge). The final export ran serially on Chromium 156.0.8078.4.

## AC1

- `T012-log-sweep-final.{md,json}`: **`sweep: PASS (0 intersections in 2052 cells)`**. Every rectangle is attached.
- Seeded controls 3/3 `seed detected` (`T012-log-sweep-control.txt`).

## Regression since T008 (T009/T010 must not move a resting label)

- `T012-log-final-reproduce.md`: the final run is checked against the pool of ten earlier runs: S15 `sbase1..3`, Stage A `stageA..4`, Stage B `stageB..3`, plus the knife repeats. **1,715 / 1,733** gated cells are byte-identical to an earlier run.
- 18 cells were not matched in this single run (`T012-log-final-input.txt`):
  - **16:** the label layer settled at a scroll offset never seen in the ten earlier runs (for example fixture-c 768 zoom 1 at 0.0097 px, the T005 noise class). The closest earlier run differs by ≤ 0.009 px per label. This is upstream S4/S5 scroll-extent noise.
  - **`fixture-c-768-light z3 bottom t3`:** 0 px against `sbase1`, `stageB` and `stageB2`. Only the DOM differs.
  - **`fixture-c-1440-dark z4 bottom t3`:** the stack note was 16 px higher (one placement-radius step) than in all ten earlier runs. Three reruns of that page on the same final build all return the S15 position (`431.6,134.5`), so the final-run result is a rare upstream knife-edge flip. S15 itself shows the same 16 px stack-note flip between its own runs in `jev-toolkit-768-dark z4 bottom t1` (T005).
