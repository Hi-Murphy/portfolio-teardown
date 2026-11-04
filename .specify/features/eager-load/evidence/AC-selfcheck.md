# T015 — AC1–AC7 self-check

Built from the committed evidence named below. The binding verdict is **keep gate**.

## Acceptance criteria

| AC | Acceptance criterion (verbatim from `spec.md` FR1–FR7) | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | baseline first, on the slow class. Before any optimisation commit: eager and gated builds measured on the **same** slow-class attempt (Lighthouse `benchmarkIndex` **1,900–2,600**), both routes, with per-task attribution of the react-dom work (the ≈200 ms tasks named by function). Evidence: traces + per-task table. No optimisation commit may precede it. | **MET** | `T006-log-baseline.md`: slow-class `41734234159-1-s3` qualified at 2,114.5–2,351.5; eager − gated TBT was +137.25 ms home / +288.13 ms project; P13 and H10 were named by function. |
| AC2 | frame honesty (per the S11.5/S11.6 lesson). During the first 5 s after load (eager path): **no task > 50 ms** on either route on the slow class; dropped frames reported on an **explicitly named harness mode** with a bound of **≤ 2 frames per route** (the harness's own rAF recorder is excluded from the gate and stated in the evidence). | **NOT MET** | `T014-log-ac2.md`: FAIL; trace-only medians were 85.8335–111.3575 ms with 9.5–13 dropped frames. Escalated at G1; `T006-log-baseline.md` §8.3; `rfc.md` §9 items 4–5. |
| AC3 | the retirement gate (two attempts, both routes). On **two independent slow-class attempts** (`benchmarkIndex` 1,900–2,600), both `/` and `/projects/websocket-inspector` must satisfy **either**: (a) eager Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**; **or** (b) **eager − gated TBT ≤ +50 ms** on the *same attempt*, with gated TBT measured on that attempt. Same-attempt comparison is the tie-breaker; a fast-runner pass alone does not satisfy this AC. | **NOT MET** | `T014-log-ac3.md`: FAIL on both attempts. Home eager/gated TBT was 209.25/82.75 ms (`s1`) and 210/86 ms (`s3`); project was 350.5/83 ms (`s1`) and 380.5322/87 ms (`s3`). |
| AC4 | bytes with an explicit budget. Client JS initial per route may grow by **≤ +2 KB gzip** versus the pre-slice baseline (offset budget, not "≤ previous"), and total JS must not grow by more than 1 %; both reported per route. | **MET** | `T013-log-bytes.txt`: PASS on both builds; deltas by scope are below. |
| AC5 | the user-visible outcome. On the slow class, with **zero interaction**, the teardown canvas is visible and animating (ambient idle) **within 2.5 s of load** on both routes; with `prefers-reduced-motion`, the poster remains and no canvas mounts. | **MET** | `T014-log-ac5.md`: PASS 16/16 runs; every normal run revealed before 2.5 s with zero trusted events; every reduced-motion run had zero canvases and a visible poster. |
| AC6 | verdict and fallback contract. If AC3 fails on either attempt, the interaction gate stays the default, the eager path remains flag-only (`NEXT_PUBLIC_EAGER_3D=1`), and the failure is documented with the per-attempt numbers. If AC3 passes twice, the gate is retired and D-19 is amended — Murphy's call, on the numbers. | **MET (verdict: keep gate)** | `T014-log-verdict.md`: verdict **keep gate**; default remains gated and the eager path remains flag-only. |
| AC7 | CI, surfaces, housekeeping. All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, `perf: eager-3d (measurement)`); frozen surfaces S2–S8 empty **unless** a named exception is approved in the RFC and re-sealed with a note; `eager-3d.yml` retained until the D-19 decision is recorded. | **MET** | `T015-log-guard.txt`; `T015-log-frozen-diffs.txt`; CI: see `T015-ci-run.txt` (recorded by the orchestrator after push). |

## AC4 byte deltas

Source: `T013-log-bytes.txt`.

| Build | Scope | Raw delta | Gzip delta | Limit | Result |
| --- | --- | ---: | ---: | --- | --- |
| gated | home initial | +31 B | +16 B | 2,000 B gzip | PASS |
| gated | project initial | +150 B | +50 B | 2,000 B gzip | PASS |
| gated | total | +279 B | +76 B | 1 % | PASS |
| gated | non-initial 3D | +98 B | +10 B | informational | INFO |
| eager | home initial | +31 B | +16 B | 2,000 B gzip | PASS |
| eager | project initial | +1,439 B | +522 B | 2,000 B gzip | PASS |
| eager | total | +518 B | +152 B | 1 % | PASS |
| eager | non-initial 3D | −952 B | −386 B | informational | INFO |

## Non-goals

| Non-goal | Result | Evidence |
| --- | --- | --- |
| Rest-state and post-eager parity | 0 px on all 16 shots (8 gated rest-state + 8 eager post-eager) | `T013-log-parity.txt` |
| Draw calls | 2 per frame; project 32/32 frames and hero 40/40 frames | `T013-log-drawcalls.txt` |
| CLS | 0 on both routes | `T013-log-before-after.md` |
| Reveal sequence | Unchanged: home `idle → loading → revealed`, project `loading → revealed`; ready and first instance share the same rAF | `T013-log-ready-reveal.md` |
| Reduced motion | Poster-only probe passed 2/2 on both routes | `T013-log-before-after.md` |

## Lever outcomes

| Lever | Outcome | Evidence |
| --- | --- | --- |
| L0 | **Kept.** Project reduced-motion probe changed 0/2 → 2/2. | `T007-log-l0.md` |
| L1 | **Kept.** Project reveal interval changed 40.9 → 2.3 ms observed; home dropped frames changed 2 → 1. | T008 evidence, summarised in `T013-log-before-after.md` |
| L2 | **Skipped.** No separate portal-commit task remained after L1. | `T009-log-skip-attr-home.md`, `T009-log-skip-attr-project.md` |
| L3a | **Reverted.** Local TBT changed −111 ms home / −52 ms project, but total JS grew +36,197 B raw / +13,327 B gzip (+2.3 % / +2.9 %), above AC4's 1 % limit. | `T010-log-l3-ab.md` |
| L3b | **Skipped.** No TBT effect; AC5 already had ample headroom. | `T006-log-baseline.md` §8.1 item 5 |
| L4 | **Skipped.** Hydration and eager boot were already separate real-time tasks; Lantern collapses the gap. | `T006-log-baseline.md` §8.1 item 6 |
| L5 | **Skipped.** No app-component hydration task above 12.5 ms observed. | `T006-log-baseline.md` §4.1 and §8.1 item 7 |

## Per-task finishing tier

Copied from the `Tier` column in `tasks.md`. The T015 ledger row is not yet recorded when this evidence is produced.

| Task | Tier |
| --- | --- |
| T001 | 1 (Flash) |
| T002 | 1 (Flash) ×2: orchestrator review revision (D-P2) |
| T003 | 1 (Flash) |
| T004 | 1 (Flash) |
| T005 | 1 (Flash) + orchestrator (D-P1) |
| T006 | 1 (Flash: copy, local baselines, drift, scripts) + orchestrator (CI, §4, §8) |
| T007 | 1 (Flash) + orchestrator review (D-P4: DOM marker reverted, probe locator fixed) |
| T008 | 1 (Flash) + orchestrator (D-P5 harness fix) |
| T009 | — |
| T010 | 1 (Flash) ×2: orchestrator review revision (bytes variants) + orchestrator decision |
| T011 | — |
| T012 | — |
| T013 | 1 (Flash) |
| T014 | 1 (Flash: tables) + orchestrator (CI, qualification) |
| T015 | — (not yet recorded in the ledger) |

## Follow-ups for Merlin

- (a) A total-JS budget for a three split (+~3 % gzip measured) is the only app-side lever with real payoff.
- (b) Engine exceptions E1 (lettering placement out of the first-frame task) and E2 (camera-fit split) were declined in S11.7.
- (c) AC2-style frame criteria at 4× on the slow host require ≤ 12.5 ms native tasks, which is unreachable for the first content frame.
- (d) `eager-3d.yml` and `eager-load.yml` are retained until the D-19 decision is recorded.

## Needs Murphy's hands

- Final validation of the draft PR, then "merge" (the orchestrator merges only on Murphy's word).
