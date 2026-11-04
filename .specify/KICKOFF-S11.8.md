# KICKOFF PROTOCOL — Slice S11.8 · Hero-Only Eager

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S11.8.md and execute Stage 1 on branch task/s11.8-hero-eager. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s11.8-hero-eager`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP. Feedback → fix inside the current stage, re-present, STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-11.8-hero-eager.md` (frozen brief), this file, `.specify/content/*.json`.
2. The brief is the only scope source. AC1–AC7 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Baseline first (AC1).** No product commit before the S11.7 home baseline is reproduced on a slow-class attempt (`benchmarkIndex` 1,900–2,600) within ±10 %, with per-task attribution. If the host drifts, STOP and re-baseline — never optimise against an unreproduced number.
4. **Engine exceptions are named, approved and sealed.** Stage 1's RFC must name the exact files for **E1** (first content frame: GL program setup + lettering placement) and **E2** (camera-fit layout effect, only if it is inside home's TBT window). Murphy approves that file list at G1 **before the first product commit**. Each approved file is re-sealed with a reason note and listed in `XPLODER-SRC-OK`. An unapproved file edit is a protocol violation, even if it works.
5. **Frame bar is host-native, not blanket:** no task > 50 ms **except** the named unsplittable tasks (three renderer constructor, first `gl.render` program compile, first content frame), each capped at **its AC1 baseline + 5 %** and reported individually. Dropped frames on an explicitly named harness mode, bound ≤ 2, recorder excluded in writing.
6. **Byte budget is explicit:** total JS gzip ≤ **+0.5 %** vs `main` at slice start; per-route initial ≤ **+2 KB gzip**. No "≤ previous" clause. **E3 (`three` split) is out of scope** — do not attempt it.
7. **Scope is the homepage.** `/projects/websocket-inspector` keeps the interaction gate; its gated TBT must stay within ±5 % of S11.7. No visual change: pixel parity, 2 draw calls, CLS 0; reduced motion = poster, no canvas.
8. **One cycle.** If AC3 fails on both slow-class attempts, the verdict is "D-19 permanent for both routes" — publish the numbers, close, no further rounds.
9. Evidence: every number attaches its artifact per `.specify/EVIDENCE.md`; two runs per measurement, median reported; no secrets.
10. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. Tier 1.5 dormant (skip-with-record). Report which tier finished each task.
11. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
12. Commit at each stage boundary with prefix `S11.8/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-11.8-hero-eager.md` — the FROZEN brief and only scope source; you may not edit it. Produce `.specify/features/hero-eager/rfc.md`:
- the measurement plan (slow-class qualification, same-attempt eager/gated pairing, harness modes, per-task attribution);
- **the E1/E2 file list** (exact paths + why each is the cause), for Murphy's G1 approval;
- how the first content frame is made cheaper without changing pixels (lettering placement strategy, program/shader setup ordering, anything the engine allows);
- the re-seal plan for every approved file;
- how AC1–AC7 are proven, including the two-attempt verdict on `/` only and the home-only gate retirement.
Every open question carries your recommendation as default. Do NOT implement and do NOT profile yet (AC1 profiling is Stage 3's first task).

**End-contract:** RFC committed; decision summary + the E1/E2 file list + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/hero-eager/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (task order with AC1 first, harness wiring, re-seal procedure, one-lever-per-commit A/Bs), `tasks.md` (granular ordered tasks; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order, **AC1 baseline first**. Per task: fresh worktree off the slice branch; executor = DeepSeek Flash 4.1; evidence per Hard Rule 9; escalation per Hard Rule 10. STOP at each phase-group boundary (baseline → E1 → E2 if approved → two-attempt verdict → CI/surfaces).

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check table (reproduced baseline, per-task before/after, named-exception caps, no-bulk-task log, named-mode dropped frames, two slow-class verdict attempts, byte budget, zero-interaction 2.5 s probe, project gated TBT ±5 %, pixel parity + draws + CLS, CI run, re-seal diff); anything needing Murphy's hands listed. STOP. Murphy validates and signals "S11.8 done" outside your view.
