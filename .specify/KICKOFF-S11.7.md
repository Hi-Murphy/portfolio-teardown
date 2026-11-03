# KICKOFF PROTOCOL — Slice S11.7 · Eager Load Path

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S11.7.md and execute Stage 1 on branch task/s11.7-eager-load. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s11.7-eager-load`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP.
- Feedback instead of approval → address it within the current stage, re-present the end-contract, STOP again. Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-11.7-eager-load.md` (frozen brief), this file, or `.specify/content/*.json`.
2. The brief is the only scope source. AC1–AC7 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Baseline first (AC1).** No optimisation commit may land before eager **and** gated baselines exist from the **same slow-class attempt** (`benchmarkIndex` 1,900–2,600), with per-task attribution of the ≈200 ms react-dom work. If the executor starts "fixing" first, stop it and reset to AC1.
4. **Measurement wording is fixed by the brief — do not soften or re-derive it:**
   - frames: "no task > 50 ms" gated; dropped frames reported on an **explicitly named harness mode** with a ≤ 2 per route bound, and the harness's own rAF recorder excluded in writing (S11.5/S11.6 lesson);
   - bytes: **offset budget** (≤ +2 KB gzip initial per route, total JS ≤ +1 %), never "≤ previous" (hash-name noise makes that unreachable);
   - runners: **two independent slow-class attempts**, same-attempt eager-vs-gated comparison as the tie-breaker (runner speed varies ~1.8× between attempts).
5. **Timebox:** one attempt cycle. If AC3 fails on both slow-class attempts, close the slice with "verdict: keep gate" — no further optimisation rounds in this slice.
6. **Engine exception:** not requested at freeze. App-side work only. Any engine/theme change requires Murphy's explicit approval **and** a re-seal note before it lands.
7. No budget may be lowered to manufacture a pass; no visual change (pixel parity, 2 draw calls, CLS 0); reduced motion still poster-only, no canvas.
8. Evidence: every number (ms, frames, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`; two runs per measurement, median reported; no secrets.
9. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. Tier 1.5 dormant (skip-with-record). Report which tier finished each task.
10. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
11. Commit at each stage boundary with prefix `S11.7/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-11.7-eager-load.md` — the FROZEN brief and only scope source; you may not edit it. Produce `.specify/features/eager-load/rfc.md`: the measurement plan (slow-class selection and verification, harness modes, per-task attribution method); a static read of the eager load path (hydration vs viewer render coincidence, the ≈200 ms react-dom tasks); candidate app-side levers ranked by expected payoff vs risk (deferred viewer mount after hydration, island/deferred client boundaries, idle preload/warm of the 3D chunk); how each AC is proven, including the two-attempt rule; what "zero interaction within 2.5 s" means concretely as a probe. Every open question carries your recommendation as default. Do NOT implement, and do NOT profile yet (AC1 profiling is Stage 3's first task).

**End-contract:** RFC committed; decision summary + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/eager-load/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (task order with AC1 baselines first, harness wiring, slow-class selection), `tasks.md` (granular ordered tasks, one seam + one executable check each, each ending with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order, **AC1 baselines first**. Per task: fresh worktree off the slice branch; executor = DeepSeek Flash 4.1; evidence per Hard Rule 8; escalation per Hard Rule 9. STOP at each phase-group boundary (baselines → app-side levers → two-attempt verdict → CI/surfaces).

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check table (same-attempt baselines, per-task attribution, before/after table, no-task>50 ms logs, named-mode dropped frames, two slow-class verdict attempts, byte budget, zero-interaction 2.5 s probe, pixel parity + draws + CLS, CI run, frozen-surface diffs); anything needing Murphy's hands listed. STOP. Murphy validates and signals "S11.7 done" outside your view.
