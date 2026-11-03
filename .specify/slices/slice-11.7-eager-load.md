# Slice 11.7 — Eager Load Path (retiring D-19's interaction gate) — FROZEN BRIEF v1

**slice:** S11.7-eager-load · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S11.5 ✅ (profile + levers), S11.6 ✅ (staged Canvas mount, verdict: keep gate) · **branch:** `task/s11.7-eager-load` · **frozen:** 2026-11-03 · **revision counter:** 0 of 2

## Mission
S11.5 and S11.6 removed the *mount* as the blocker. The remaining blocker is the **eager load path**: on a slow-class CI runner, react-dom tasks of ≈200 ms (hydration and the viewer render coinciding at load, ≈4 s) dominate TBT, flipping the eager verdict from pass (fast runner) to fail (slow runner). This slice makes the teardown appear **without any interaction** on a slow-class host — or proves it impossible and keeps the gate, with numbers.

## Product goal (the thing being bought)
A visitor who never touches the page should still see the live teardown. The interaction gate (D-19) exists only because load-time cost broke the budget; it is not a design preference.

## Scope
**App-side first.** The ≈200 ms react-dom tasks are the target:
1. Sequence the viewer mount **after** hydration completes, not during it (idle/staggered mount), while still requiring **zero interaction** to appear.
2. Split or defer hydration work on the two production routes (island boundaries, deferred client components) so no single task exceeds the frame-long-task bar.
3. Preload/warm the 3D chunk during idle after poster paint, so the mount itself stays cheap (S11.5 L3/L4 and S11.6 L1/L4 already in place).
4. Only if app-side work is exhausted: a surgical engine change under a named, re-sealed exception.

## Non-goals (hard)
- No visual change: rest-state and post-eager frames pixel-identical; 2 draw calls; CLS 0.
- No theme/tour/panel/a11y behaviour changes; no new client library; no content change.
- No lowering of Lighthouse/TBT budgets to manufacture a pass.

## Acceptance criteria (inviolable — no rewording, no relaxing)

- **AC1 — baseline first, on the slow class.** Before any optimisation commit: eager and gated builds measured on the **same** slow-class attempt (Lighthouse `benchmarkIndex` **1,900–2,600**), both routes, with per-task attribution of the react-dom work (the ≈200 ms tasks named by function). Evidence: traces + per-task table. No optimisation commit may precede it.
- **AC2 — frame honesty (per the S11.5/S11.6 lesson).** During the first 5 s after load (eager path): **no task > 50 ms** on either route on the slow class; dropped frames reported on an **explicitly named harness mode** with a bound of **≤ 2 frames per route** (the harness's own rAF recorder is excluded from the gate and stated in the evidence).
- **AC3 — the retirement gate (two attempts, both routes).** On **two independent slow-class attempts** (`benchmarkIndex` 1,900–2,600), both `/` and `/projects/websocket-inspector` must satisfy **either**:
  - (a) eager Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**; **or**
  - (b) **eager − gated TBT ≤ +50 ms** on the *same attempt*, with gated TBT measured on that attempt.
  Same-attempt comparison is the tie-breaker; a fast-runner pass alone does not satisfy this AC.
- **AC4 — bytes with an explicit budget.** Client JS initial per route may grow by **≤ +2 KB gzip** versus the pre-slice baseline (offset budget, not "≤ previous"), and total JS must not grow by more than 1 %; both reported per route.
- **AC5 — the user-visible outcome.** On the slow class, with **zero interaction**, the teardown canvas is visible and animating (ambient idle) **within 2.5 s of load** on both routes; with `prefers-reduced-motion`, the poster remains and no canvas mounts.
- **AC6 — verdict and fallback contract.** If AC3 fails on either attempt, the interaction gate stays the default, the eager path remains flag-only (`NEXT_PUBLIC_EAGER_3D=1`), and the failure is documented with the per-attempt numbers. If AC3 passes twice, the gate is retired and D-19 is amended — Murphy's call, on the numbers.
- **AC7 — CI, surfaces, housekeeping.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, `perf: eager-3d (measurement)`); frozen surfaces S2–S8 empty **unless** a named exception is approved in the RFC and re-sealed with a note; `eager-3d.yml` retained until the D-19 decision is recorded.

## Decisions locked at freeze (Murphy, 2026-11-03: "ok s11.7 it is")
1. **Placement:** S11.7 runs **before S12** — MVP validation should validate the better product.
2. **Timebox:** **one attempt cycle.** If AC3 fails on both slow-class attempts, close the slice with "verdict: keep gate" and do not iterate again in this slice.
3. **Engine exception:** **not requested at freeze.** App-side work first; any engine change needs Murphy's explicit approval plus a re-seal note before it lands.
4. **Wait budget:** teardown visible with zero interaction within **2.5 s** (AC5). It may rise to 3 s only if the G1 RFC shows a material complexity drop, and only on Murphy's word.

## Freeze protocol (on confirmation)
Frozen at commit; work only on `task/s11.7-eager-load`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/eager-load/rfc.md`, orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution.
