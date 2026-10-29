# KICKOFF PROTOCOL — Slice S04 · Engine Core A (Layout · Explode · Camera)

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S04.md and execute Stage 1 on branch task/s04-engine-core-a. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s04-engine-core-a`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode on this project and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-04-engine-core-a.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC6 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. The S2 contract (schema/parse/tokens public API) is frozen — extend `packages/xploder` with NEW modules only, no breaking changes. No DNS/domain/Vercel-project changes; no analytics; no secrets.
4. **Evidence discipline (first visual slice):** every visual or motion claim attaches machine-made evidence per `.specify/EVIDENCE.md` (screenshots via the evidence CLI, FPS via the S3 harness). "It looks right" is not a report.
5. Escalation ladder per task: executor (DeepSeek Flash) stuck ×2 → Sol/Gemini via OpenRouter → stuck ×2 → orchestrator executes personally. Report which tier finished each task.
6. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
7. Commit at each stage boundary with message prefix `S04/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S04 of this repo. Read `.specify/slices/slice-04-engine-core-a.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/engine-core-a/rfc.md`: context (from brief), technical decisions (layout algorithm + determinism strategy, instancing approach + draw-call budget, explode/implode tween mechanics on motion tokens, orthographic camera rig + snap-rotate implementation, reduced-motion path, playground route exclusion mechanism, test strategy for AC3/AC5 assertions), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed to the branch; present Murphy a decision summary + open questions. STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/engine-core-a/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no new acceptance criteria), `plan.md` (module tree inside `packages/xploder`, data flow Project → layout → instances, component API surface), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s04-engine-core-a`; executor seat = DeepSeek Flash; evidence attached per Hard Rule 4; escalation per Hard Rule 5. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check evidence table (screenshots light+dark × imploded+exploded, FPS harness output, prod-404 proof); anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S4 done" outside your view.
