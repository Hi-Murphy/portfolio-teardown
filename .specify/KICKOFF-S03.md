# KICKOFF PROTOCOL — Slice S03 · Perf Gates + Evidence Loop

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S03.md and execute Stage 1 on branch task/s03-perf-evidence. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s03-perf-evidence`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode on this project and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-03-perf-evidence.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC6 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. No DNS/domain/Vercel-project changes beyond CI integration; no analytics; no secrets in repo or CI logs; S2 schema/types/tokens are frozen — zero modifications to `packages/xploder` public API (adding dev tooling *around* it is fine, changing it is not).
4. Escalation ladder per task: executor (DeepSeek Flash) stuck ×2 → Sol/Gemini via OpenRouter → stuck ×2 → orchestrator executes personally. Report which tier finished each task.
5. Every claim ships with evidence (CI logs / terminal output / artifact samples) in the task report.
6. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
7. Commit at each stage boundary with message prefix `S03/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S03 of this repo. Read `.specify/slices/slice-03-perf-evidence.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/perf-evidence/rfc.md`: context (from brief), technical decisions (Lighthouse tooling choice + preview-URL access strategy — including the fallback open question with your recommendation, weight-budget measurement method, FPS/CDP tracing approach, fixture-route exclusion mechanism, evidence CLI design), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed; present Murphy a decision summary + open questions. STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/perf-evidence/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no new acceptance criteria), `plan.md` (CI flow, tooling architecture, artifact formats), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree; executor seat = DeepSeek Flash; evidence attached per Hard Rule 5; escalation per Hard Rule 4. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check evidence table (including the two deliberate-violation demos from AC1/AC2); anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S3 done" outside your view.
