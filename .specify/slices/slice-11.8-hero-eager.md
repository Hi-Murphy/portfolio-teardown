# Slice 11.8 — Hero-Only Eager (retire D-19 for `/` only) — FROZEN BRIEF v1

**slice:** S11.8-hero-eager · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S11.7 ✅ (`7df1b6d`, verdict keep gate) · **branch:** `task/s11.8-hero-eager` · **frozen:** 2026-11-04 · **revision counter:** 0 of 2

## Mission
S11.7 showed the **homepage** is 9–10 ms from the eager budget (209–210 ms vs a 200 ms bar) while the project route is 150–180 ms away. This slice takes the **only realistic shot**: make the homepage's teardown appear with **zero interaction**, on the slow-class host, without touching the project route's gate and without the `three` split. One cycle. If it fails, D-19 becomes permanent for both routes.

## Context (self-contained — the orchestrator reads ONLY this brief)
- S11.7 (`7df1b6d`) measured, on the slow class (`benchmarkIndex` 1,900–2,600): home eager/gated TBT **209.25 / 82.75 ms** (`s1`) and **210 / 86 ms** (`s3`); project eager/gated **350.5 / 83 ms** and **380.53 / 87 ms**; bar 200 ms.
- Remaining levers named in the S11.7 baseline (`T006-log-baseline.md` §4/§8):
  - **E1 — first content frame:** GL program setup on the first `gl.render` (`getUniforms` → program info logs) plus **lettering placement** (polygon-overlap tests for label placement, `excludeObstacles`) inside the overlay model.
  - **E2 — camera-fit layout effect** (engine/layout).
  - **E3 — splitting `three`:** costs **+2.9 % total-JS gzip** against a 1 % budget. **Out of scope this slice.**
- The homepage mounts via `apps/web/components/hero/hero-live.tsx` → dynamic `hero-stage` behind `interaction-gate.ts`. The project route mounts via `workbench-loader.tsx` → `workbench.tsx`.
- **Stage ownership is not guessed here:** the RFC must name the exact files behind E1 and E2, and Murphy approves that list at G1 **before the first product commit**. Each approved file is re-sealed with a reason note and listed in `XPLODER-SRC-OK`.

## Scope
1. Reproduce the S11.7 home baseline on a slow-class attempt, with per-task attribution (AC1).
2. Apply **E1** on the home path: make the first content frame cheaper without changing what is drawn — e.g. cheaper lettering placement (spatial early-out / index instead of full polygon-overlap scans / placement after first paint where it never changes the rendered frame), and shader/program setup moved off the critical task where the engine allows it.
3. Apply **E2** only if the profile shows it inside home's TBT window.
4. Re-measure, then run the two-attempt verdict on **`/` only**.

## Non-goals (hard)
- **No eager project route** — `/projects/websocket-inspector` keeps the interaction gate and must not regress (gated TBT within ±5 % of S11.7).
- **No `three` split (E3)** and no new dependency; no chunk-splitting changes.
- No visual change: rest-state and revealed frames pixel-identical; 2 draw calls; CLS 0.
- No content, tour, panel, a11y or theme behaviour changes; reduced motion still poster-only, no canvas.
- No budget may be lowered to manufacture a pass.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — baseline reproduced first.** On a slow-class attempt (`benchmarkIndex` 1,900–2,600), before any product commit: home eager TBT within **±10 %** of S11.7's 209.25/210 ms, gated within ±10 % of 82.75/86 ms, with per-task attribution naming the tasks E1 and E2 will touch. If the host drifts beyond that, STOP and re-baseline — do not optimise against a number you did not reproduce.
- **AC2 — host-native frame bar.** During the first 5 s after load on the eager home path: **no task > 50 ms**, **except** the named unsplittable tasks — three's renderer constructor, the first `gl.render` program compile, and the first content frame. Each named exception is measured and reported individually and must not exceed **its own AC1 baseline + 5 %**. Dropped frames are reported on an **explicitly named harness mode** with a bound of **≤ 2 per route**, recorder excluded in writing.
- **AC3 — the gate, homepage only, two attempts.** On **two independent slow-class attempts**, `/` must satisfy **either** (a) Lighthouse perf **≥ 0.95** and **TBT ≤ 200 ms**, **or** (b) **eager − gated TBT ≤ +50 ms** on the same attempt. Both attempts must pass. A fast-runner pass does not count.
- **AC4 — explicit byte budget.** Total JS gzip grows by **≤ +0.5 %** versus `main` at slice start, and per-route initial JS by **≤ +2 KB gzip**; both reported per route with the raw numbers. No "≤ previous" clause.
- **AC5 — the user-visible outcome.** On the slow class, with **zero interaction**, the home canvas is visible and animating (ambient idle) within **2.5 s** of load. `prefers-reduced-motion` → poster only, no canvas. The project route still requires interaction, and its gated TBT stays within ±5 % of S11.7.
- **AC6 — verdict, one cycle.** If AC3 passes twice: retire the gate **for `/` only** (D-19 amended: home eager, project gated) — Murphy's call on the numbers. If AC3 fails: **D-19 becomes permanent for both routes**, the eager path stays flag-only, the numbers are published, and the slice closes. No further optimisation rounds inside this slice.
- **AC7 — CI and surfaces.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates); frozen surfaces empty **except** the G1-approved E1/E2 files, each re-sealed with a reason note and listed in `XPLODER-SRC-OK`; pixel parity on the home canvas, 2 draw calls, CLS 0.

## Executor rules (binding)
- Baseline before code (AC1); one lever per commit with an A/B; no shotgun changes.
- Named engine exceptions only — an unapproved file edit is a protocol violation, even if it works.
- Every number attaches its artifact (traces, Lighthouse JSON, per-task tables, byte logs); two runs per measurement, median reported.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator executes personally; tier 1.5 dormant.

## Decisions locked at freeze (Murphy, 2026-11-04: "ok 2")
1. **Hero-only** variant: `/` eager, project route gated.
2. **No `three` split** — E3 out of scope, byte budget ≤ +0.5 %.
3. **One attempt cycle** — fail twice → D-19 permanent for both routes, close.
4. **2.5 s** zero-interaction visibility budget (AC5).

## Freeze protocol
Frozen at commit; work only on `task/s11.8-hero-eager`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/hero-eager/rfc.md`, orchestrator-authored; the E1/E2 file list is Murphy-approved at G1 before any product commit.
