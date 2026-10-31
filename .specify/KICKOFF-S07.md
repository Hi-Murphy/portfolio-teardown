# KICKOFF PROTOCOL — Slice S07 · Panels (Component Detail · Case Study · Tech Chips)

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S07.md and execute Stage 1 on branch task/s07-panels. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s07-panels`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-07-panels.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC6 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. **Frozen surfaces:** S2 schema/parse/tokens public API; S4 layout/camera/explode behavior; S5 hover/focus/tour + zoom reachability; S6 materials/edges/callouts/palettes. Extend with NEW modules only. No DNS/Vercel changes; no analytics; no secrets.
4. **Perf criteria in dropped-frames style only.** A literal fps threshold in any task check = protocol violation.
5. **Viewport reachability:** zoom remains fully reachable (S5 setViewOffset scroll); do not regress; evidence top+bottom max-zoom screenshots.
6. Evidence discipline: every visual/interaction claim attaches machine-made evidence per `.specify/EVIDENCE.md` — screenshots for states, measured CLS, interaction logs for keyboard/Esc. "It looks right" is not a report.
7. Escalation ladder per task: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. (Tier 1.5 dormant — skip-with-record unless `OPENROUTER_API_KEY` is present; Murphy decision 2026-10-30.) Report which tier finished each task.
8. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
9. Commit at each stage boundary with message prefix `S07/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S07 of this repo. Read `.specify/slices/slice-07-panels.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/panels/rfc.md`: context (from brief), technical decisions (panel DOM architecture vs the S5 stage/scroll structure, placement algorithm + never-cover-slab proof, focus management, chips from registry, case-study layout, **tour-click decision — state the recommendation and flag it for Murphy's confirmation**, test/evidence strategy incl. CLS measurement), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed to the branch; present Murphy a decision summary + open questions (tour-click decision stated explicitly). STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/panels/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no new acceptance criteria), `plan.md` (module additions, panel state machine, overlay layout), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s07-panels`; executor seat = DeepSeek Flash 4.1; evidence attached per Hard Rule 6; escalation per Hard Rule 7. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check evidence table (panel screenshots ×4 positions ×2 palettes, case-study screenshots, CLS measurement, tour-jump interaction log, chips hex-grep, frozen-surface diff); anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S7 done" outside your view.
