# KICKOFF PROTOCOL — Slice S11.5 · Engine Startup Performance

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S11.5.md and execute Stage 1 on branch task/s11.5-engine-startup. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s11.5-engine-startup`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-11.5-engine-startup.md` (frozen brief), this file, or `.specify/content/*.json`.
2. The brief is the only scope source. AC1–AC7 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Profile first (AC1).** No optimisation commit may land before the baseline profile exists, with its artifact committed. If the executor starts "fixing" before measuring, stop it and reset to AC1.
4. **Frozen surfaces:** this slice may touch **S4 (engine)** and **S6 (materials)** only, and only surgically — every touched file is re-sealed in the manifest with a reason note, and `XPLODER-SRC-OK` must list exactly those files. S2, S5, S7, S8 must show **empty** diffs.
5. Visual parity is an acceptance criterion: rest-state screenshots pixel-identical in light and dark; 2 draw calls; CLS 0. Any visible change = STOP.
6. No new client library on the page bundle; patch-level `three` bumps only with a written reason; no budget may be lowered to pass.
7. Evidence: every number (ms, dropped frames, long tasks, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`; two runs per measurement, median reported.
8. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. Tier 1.5 dormant (skip-with-record). Report which tier finished each task.
9. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
10. Commit at each stage boundary with message prefix `S11.5/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-11.5-engine-startup.md` — the FROZEN brief and your only scope source; you may not edit it. Produce `.specify/features/engine-startup/rfc.md`: the measurement plan (throttled 4× CPU profile, harnesses, what "startup" means in phase terms); a static read of the likely costs (3D chunk parse, R3F mount, geometry, shader compile, texture/lettering creation); candidate levers ranked by expected payoff vs risk against the frozen surfaces; the re-seal strategy for S4/S6; the eager-hydration flag design; how each AC is proven. Every open question carries your recommendation as default. Do NOT implement, and do NOT profile on the branch yet — the profile is Stage 3's first task by design.

**End-contract:** RFC committed to the branch; decision summary + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/engine-startup/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no acceptance criteria), `plan.md` (task order with AC1 profiling first, harness wiring, re-seal procedure), `tasks.md` (granular ordered tasks, one seam + one executable check each, each ending with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order, **AC1's baseline first**. Per task: fresh worktree off the slice branch; executor = DeepSeek Flash 4.1; evidence per Hard Rule 7; escalation per Hard Rule 8. STOP at each phase-group boundary (baseline → levers → eager-hydration experiment → re-seal/CI).

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check table (baseline profile, before/after table, dropped-frame + long-task logs, pixel-parity screenshots, draw calls, bundle bytes, eager-hydration verdict, CI run, re-seal manifest diff, frozen-surface diffs); anything needing Murphy's hands listed. STOP. Murphy validates and signals "S11.5 done" outside your view.
