# KICKOFF PROTOCOL — Slice S05 · Engine Core B (Hover · Layer Focus · Guided Tour)

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S05.md and execute Stage 1 on branch task/s05-engine-core-b. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s05-engine-core-b`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode on this project and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-05-engine-core-b.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC6 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence. **Perf criteria stay in dropped-frames style (S04 lesson); a literal fps threshold in any task check = protocol violation.**
3. S2 contract (schema/parse/tokens public API) and S4 behavior (layout/camera) are frozen — extend `packages/xploder` with NEW modules only; fixture C is an additive data file. No DNS/Vercel-project changes; no analytics; no secrets.
4. Evidence discipline: every visual/motion/touch claim attaches machine-made evidence per `.specify/EVIDENCE.md`. "It looks right" is not a report.
5. Escalation ladder per task: executor (DeepSeek Flash) stuck ×2 → Sol/Gemini via OpenRouter → stuck ×2 → orchestrator executes personally. Report which tier finished each task.
6. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
7. Commit at each stage boundary with message prefix `S05/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S05 of this repo. Read `.specify/slices/slice-05-engine-core-b.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/engine-core-b/rfc.md`: context (from brief), technical decisions (raycast/hover strategy incl. touch, layer-focus dim mechanics, tour state machine + caption overlay approach, multi-flow selector, fixture C design, reduced-motion paths, test + evidence strategy for AC3/AC5), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed to the branch; present Murphy a decision summary + open questions. STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/engine-core-b/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no new acceptance criteria), `plan.md` (module additions inside `packages/xploder`, interaction state flow, overlay architecture), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s05-engine-core-b`; executor seat = DeepSeek Flash; evidence attached per Hard Rule 4; escalation per Hard Rule 5. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check evidence table (state screenshots light+dark, tour-playing dropped-frames artifact, touch-emulation proof, fixture-C schema-diff proof, prod-404 re-check); anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S5 done" outside your view.
