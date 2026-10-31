# KICKOFF PROTOCOL — Slice S06 · Blueprint Theme Applied

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S06.md and execute Stage 1 on branch task/s06-blueprint-theme. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s06-blueprint-theme`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Under no circumstance chain two stages in one turn — including when review seems a formality. Gate overruns are a documented failure mode on this project and are treated as protocol violations.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-06-blueprint-theme.md` (frozen brief) and this file.
2. The brief is the only scope source. AC1–AC6 are inviolable — no rewording, no relaxing, no silent descoping. A blocked AC = STOP + escalate with evidence.
3. **Frozen surfaces:** S2 schema/parse/tokens public API, S4 layout/camera behavior, S5 hover/focus/tour behavior and the zoom-reachability fix (AC7) are sealed — extend with NEW modules only. No DNS/Vercel-project changes; no analytics; no secrets.
4. **Perf criteria in dropped-frames style only** (0 dropped frames over ≥Ns window; band as liveness; raw fps informational). A literal fps threshold in any task check = protocol violation.
5. **Viewport reachability:** wherever zoom is involved, all content must remain reachable (S5's setViewOffset scroll) and evidenced with top+bottom max-zoom screenshots. Do not regress it.
6. Evidence discipline: every visual/motion claim attaches machine-made evidence per `.specify/EVIDENCE.md`. "It looks right" is not a report.
7. Escalation ladder per task: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. (Tier 1.5 Sol/Gemini via OpenRouter is **DORMANT** — skip-with-record unless `OPENROUTER_API_KEY` is present; Murphy decision 2026-10-30.) Report which tier finished each task.
8. Every task decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each with a default).
9. Commit at each stage boundary with message prefix `S06/stage-N:`.

## Stage 1 — RFC

You are the orchestrator for slice S06 of this repo. Read `.specify/slices/slice-06-blueprint-theme.md` — the FROZEN brief and your only scope source; you may not edit it. Produce the technical design RFC at `.specify/features/blueprint-theme/rfc.md`: context (from brief), technical decisions (material/edge strategy, overlay layout system for dimension lines + part numbers, circuit-trace geometry for tours, light/dark material parity, **`explodedGap` product-default decision with the occlusion evidence for fixture A tide-repository and fixture C booking-service/notifier**, draw-call budget under the new visual system, test/evidence strategy). Every open question carries your recommendation as default. Do NOT start implementation.

**End-contract:** RFC committed to the branch; present Murphy a decision summary + open questions (explodedGap decision stated explicitly). STOP.

## Stage 2 — Spec Kit

Generate spec-kit artifacts in `.specify/features/blueprint-theme/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no new acceptance criteria), `plan.md` (module additions, overlay architecture, material system), `tasks.md` (ordered granular tasks; each = one integration seam + one executable check; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s06-blueprint-theme`; executor seat = DeepSeek Flash 4.1; evidence attached per Hard Rule 6; escalation per Hard Rule 7. A blocked AC = STOP + escalate with evidence. STOP at each phase-group boundary and wait for Murphy's validation before continuing.

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check evidence table (light+dark × imploded/exploded × tour states, default-gap visibility proof for the named occlusions, max-zoom reachability re-check, draw-call and CLS numbers); anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S6 done" outside your view.
