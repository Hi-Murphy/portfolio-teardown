# KICKOFF PROTOCOL — Slice S02 · Contracts & Tokens

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S02.md and execute Stage 1. Then STOP and wait for my message.`
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode on this project and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-02-contracts-tokens.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC7 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. No DNS/domain/Vercel-config changes; no analytics; no secrets committed; nothing infra-flavored in fixtures.
4. Escalation ladder per task: executor (DeepSeek Flash) stuck ×2 → Sol/Gemini via OpenRouter → stuck ×2 → orchestrator executes personally. Report which tier finished each task.
5. Every claim ships with evidence (test output / terminal / screenshot) in the task report.
6. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
7. Commit at each stage boundary with message prefix `S02/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S02 of this repo. Read `.specify/slices/slice-02-contracts-tokens.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/contracts-tokens/rfc.md`: context (from brief), technical decisions (zod schema organization + export surface, fixture layout, motion-token seed values with rationale, palette hex sets light/dark, test strategy for AC3/AC4/AC7 enforcement), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed; present Murphy a decision summary + open questions. STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/contracts-tokens/`: `spec.md` (user stories P1–P3 = site consumer / lib consumer / Murphy-as-content-author; FRs mapping 1:1 to AC1–AC7 — invent no new acceptance criteria), `plan.md` (module tree, data flow, public API surface), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree; executor seat = DeepSeek Flash; evidence attached per Hard Rule 5; escalation per Hard Rule 4. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check evidence table; anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S2 done" outside your view.
