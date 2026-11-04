# T013 — Local before/after

All values in the tables below are **local emulation (native GL, M=18.5) — informational**. They
do not decide any acceptance criterion. TBT is the median of the two Lighthouse invocation medians
with the run spread in parentheses. Long-task and dropped-frame values are the two raw harness runs
(`r1 / r2`). Probe values are medians of two runs. T006–T010 are the published A/B artifacts; Final
uses this task's fresh FPS/probe runs and the T008-ab Lighthouse summaries, because the product
state is unchanged from T008.

## `/`
All numbers: **local emulation (native GL, M=18.5) — informational**.

| State | Simulated TBT median (spread), ms | Max long task, ms | Dropped frames, trace-only | Dropped frames, recorder (excluded from AC2) | Probe ready / revealed, ms | Reduced-motion probe |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| T006 base | 278.02 (44.04) | 0 / 0 | 2 / 2 | not run | 208.70 / 217.65 | 2/2 pass |
| T007 (L0, kept) | 272.58 (35.16) | 0 / 0 | 2 / 2 | not run | 211.15 / 220.00 | 2/2 pass |
| T008 (L1, kept) | 243.54 (101.08) | 0 / 0 | 1 / 1 | not run | 216.25 / 225.00 | 2/2 pass |
| T010 (L3a, **reverted**) | 161.63 (5.74) | 0 / 0 | 2 / 2 | not run | 208.00 / 217.15 | 2/2 pass |
| **Final = T008 state** | **243.54 (101.08)** | **0 / 0** | **2 / 1** | **2 / 1** | **211.40 / 220.25** | **2/2 pass** |

## `/projects/websocket-inspector`
All numbers: **local emulation (native GL, M=18.5) — informational**.

| State | Simulated TBT median (spread), ms | Max long task, ms | Dropped frames, trace-only | Dropped frames, recorder (excluded from AC2) | Probe ready / revealed, ms | Reduced-motion probe |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| T006 base | 338.32 (2.37) | 0 / 0 | 2 / 1 | not run | 210.45 / 220.75 | 0/2 fail |
| T007 (L0, kept) | 319.50 (42.00) | 0 / 0 | 2 / 2 | not run | 215.30 / 225.75 | 2/2 pass |
| T008 (L1, kept) | 354.00 (19.00) | 0 / 0 | 2 / 1 | not run | 220.95 / 230.95 | 2/2 pass |
| T010 (L3a, **reverted**) | 267.50 (7.00) | 0 / 0 | 2 / 2 | not run | 210.85 / 221.05 | 2/2 pass |
| **Final = T008 state** | **354.00 (19.00)** | **0 / 0** | **1 / 2** | **6 / 6** | **218.45 / 228.65** | **2/2 pass** |

## Decisions and notes

- **L0 (T007): kept.** It fixes reduced motion on the project route (0/2 → 2/2). The TBT and frame
  changes do not clear the keep rule; this is a correctness fix.
- **L1 (T008): kept.** It removes the project render-lane work measured in T008-ab; the final state
  remains T008-equivalent.
- **L3a (T010): reverted.** Its local TBT was lower, but it breached the AC4 total-JS budget. The
  row is retained only to document the measured-and-reverted trial.
- **CLS:** the FPS reports do not carry a CLS field. The T008-ab Lighthouse summaries report CLS 0
  on all runs for both routes, and this task found no long tasks in the load window.
- **Recorder:** recorder mode was not rerun in the T006–T010 local A/B artifacts; those cells are
  intentionally `not run`. This task ran it twice on the final state. Its counts are informational
  and **excluded from AC2** by the tool's own `exclusionNote`. The separate T006 slow-class AC2
  recorder values (home 17/17, project 18/18 in `T006-log-baseline.md`) are not native-GL local
  emulation and are not mixed into this table.
