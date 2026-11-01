# KICKOFF PROTOCOL — Slice S08 · A11y Floor

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S08.md and execute Stage 1 on branch task/s08-a11y-floor. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s08-a11y-floor`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-08-a11y-floor.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC7 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. **Frozen surfaces:** S2 schema/parse/tokens public API; S4 layout/camera/explode; S5 hover/focus/tour + zoom reachability; S6 materials/edges/callouts/palettes; S7 panels/chips/lettering (presentation). Extend with NEW modules only; contrast fixes at the CSS-variable layer are the one sanctioned token edit. No DNS/Vercel changes; no analytics; no secrets.
4. **Perf criteria in dropped-frames style only.** A literal fps threshold in any task check = protocol violation.
5. Evidence discipline: a11y claims need machine evidence (AX-tree/ARIA snapshots, measured contrast ratios, axe JSON, keyboard drill logs) — plus Murphy's VoiceOver pass at final validation. "Feels accessible" is not a report.
6. Escalation ladder per task: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. (Tier 1.5 dormant — skip-with-record unless `OPENROUTER_API_KEY` is present.) Report which tier finished each task.
7. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
8. Commit at each stage boundary with message prefix `S08/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S08 of this repo. Read `.specify/slices/slice-08-a11y-floor.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/a11y-floor/rfc.md`: context (from brief), technical decisions (keyboard interaction model + focus strategy vs the S5 stage/scroll DOM, ARIA structure incl. lettering aria-hidden, axe-core CI integration for a dev-only route, contrast measurement method, no-JS/no-WebGL fallback architecture, reduced-motion matrix approach), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed to the branch; present Murphy a decision summary + open questions. STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/a11y-floor/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no new acceptance criteria), `plan.md` (module additions, focus/ARIA architecture, test harness), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s08-a11y-floor`; executor seat = DeepSeek Flash 4.1; evidence attached per Hard Rule 5; escalation per Hard Rule 6. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check evidence table (keyboard drill log, ARIA snapshots, axe JSON for 4 palette×viewport combos + the deliberate-regression proof, contrast table, reduced-motion matrix, no-JS/no-WebGL screenshots, frozen-surface diffs, draw calls, CLS); **VoiceOver checklist prepared for Murphy**; anything needing Murphy's hands listed. STOP. Murphy runs final validation (incl. VoiceOver) and signals "S8 done" outside your view.
