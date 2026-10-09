# KICKOFF PROTOCOL — Slice S01 · Foundation & Monorepo Scaffold

**Audience: the orchestrator seat (Opus, orca).** This file is the machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF.md and execute Stage 1. Then STOP and wait for my message.`
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when you are confident the review is a formality. Gate overruns are a documented failure mode on this project and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-01-foundation.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC7 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. No DNS/domain changes, no analytics, no secrets committed. Sanitize anything infra-flavored (no IPs, tokens, or private repo names in code, comments, or fixtures).
4. Escalation ladder per task: executor (DeepSeek Flash) stuck ×2 → Sol/Gemini via OpenRouter → stuck ×2 → orchestrator executes personally. Report which tier finished each task.
5. Every visual or performance claim ships with evidence (screenshot / terminal output) in the task report.
6. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
7. Commit at each stage boundary with message prefix `S01/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S01 of this repo. Read `.specify/slices/slice-01-foundation.md` — it is the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/foundation/rfc.md`: context (from brief), technical decisions (monorepo tooling, CI, deploy wiring, theme setup, motion-token module convention), design brief for the spec kit, implementation checklist. Every open question must carry your recommendation as the default. Do NOT start implementation.

**End-contract:** RFC committed; present Murphy a decision summary + open questions (each with recommendation). STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/foundation/`: `spec.md` (user stories P1–P3; functional requirements mapping 1:1 to the brief's AC1–AC7 — invent no new acceptance criteria), `plan.md` (architecture, component tree, data flow), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each task ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree; executor seat = DeepSeek Flash; visual tasks attach screenshot evidence; report per task. Escalation per Hard Rule 4. A blocked acceptance criterion = STOP + escalate with evidence; never reword or relax an AC. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check evidence table; list of anything needing Murphy's hands. STOP. Murphy runs the final validation and signals "S1 done" outside your view.

## Later slices

This protocol generalizes: future slices ship their own brief + stage definitions in this file's place. The invocation contract and hard rules carry over verbatim.
