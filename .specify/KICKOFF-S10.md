# KICKOFF PROTOCOL — Slice S10 · Site Shell

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S10.md and execute Stage 1 on branch task/s10-site-shell. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s10-site-shell`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-10-site-shell.md` (frozen brief), this file, or `.specify/content/websocket-inspector.json` (canonical content — convert it, never edit it).
2. The brief is the only scope source. AC1–AC7 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. **Frozen surfaces:** S2 schema/parse/tokens public API; S4 layout/camera/explode; S5 hover/focus/tour + zoom reachability; S6 materials/edges/callouts/palettes; S7 panels/chips/lettering; S8 a11y behaviors. Extend with NEW modules only (the route layer is new). No DNS/Vercel-project changes; no analytics; no secrets.
4. **Dev routes stay out of production:** `/dev/engine` and `/fixtures/fps-calibration` must keep returning 404 on the production URL (CI-checked).
5. **Perf criteria in dropped-frames style only.** A literal fps threshold in any task check = protocol violation.
6. Evidence discipline: every visual/perf/a11y claim attaches machine-made evidence per `.specify/EVIDENCE.md` — screenshots, Lighthouse JSON, axe JSON, CLS measurements, fidelity test output.
7. Escalation ladder per task: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. (Tier 1.5 dormant — skip-with-record unless `OPENROUTER_API_KEY` is present.) Report which tier finished each task.
8. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
9. Commit at each stage boundary with message prefix `S10/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S10 of this repo. Read `.specify/slices/slice-10-site-shell.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/site-shell/rfc.md`: context (from brief), technical decisions (route structure and data-module wiring from `.specify/content/websocket-inspector.json` → zod-validated TS; hero poster-first hydration strategy without CLS; card/list layout; recruiter-mode and no-JS fallbacks; per-route metadata; axe/Lighthouse gate extension to production routes; the CLS carry-over fix), design brief for the spec kit, implementation checklist. Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed to the branch; present Murphy a decision summary + open questions. STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/site-shell/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no new acceptance criteria), `plan.md` (route tree, data flow, hydration strategy, test harness), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s10-site-shell`; executor seat = DeepSeek Flash 4.1; evidence attached per Hard Rule 6; escalation per Hard Rule 7. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check evidence table (fidelity test, hero CLS/LCP artifacts, recruiter-mode + no-JS screenshots, axe JSON ×4 combos, Lighthouse JSON ×2 routes, prod-404 re-check, CLS carry-over proof, frozen-surface diffs); anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S10 done" outside your view.
