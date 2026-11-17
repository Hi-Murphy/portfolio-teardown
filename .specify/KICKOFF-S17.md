# KICKOFF PROTOCOL — Slice S17 · Cross-project relationships

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S17.md and execute Stage 1 on branch task/s17-cross-project. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s17-cross-project`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-17-cross-project.md` (frozen brief), this file.
2. The brief is the only scope source. AC1–AC6 are inviolable; a blocked AC = STOP + escalate with evidence.
3. **App + content only. S2–S8 must all show empty diffs.** No engine, theme, motion, panel or label change. If a change smells like engine work, it is out of scope — stop and report.
4. **Order: content → schema → UI.** Each lands with its test; the schema rejects an unknown `to` slug and a self-reference at build time.
5. **No invented copy.** Every string comes from the JSON. The two `note` strings in the brief are the only new prose.
6. **No tech-chip links.** Measured: zero shared techs. Do not add an index page, a filter, or a comparator.
7. Gates unchanged: Lighthouse ≥ 95/95 on `/`, `/projects`, both project routes; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero intact; S16 sweep re-run at 0 intersections.
8. Evidence per `.specify/EVIDENCE.md`: both strips (light/dark × 390/1440), removal test, unknown-slug build failure, axe, CLS table, byte delta, sweep re-run.
9. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record).
10. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
11. Commit at each stage boundary with prefix `S17/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-17-cross-project.md` — the FROZEN brief and only scope source. Produce `.specify/features/cross-project/rfc.md`:
- the schema addition (zod shape, error messages for unknown slug and self-reference, how the fidelity test covers it);
- the content edit (exact JSON patch per project, byte-level);
- the `Connections` component: where it mounts on the project route, which existing tokens it uses, how it reads relationships without a per-project branch;
- the a11y contract (landmark, list semantics, link text rule, focus);
- the weight plan (what ships, expected gzip delta) and the proof that S2–S8 stay empty;
- the gate matrix and evidence list per AC.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; schema + content patch + component mount + a11y + weight plan presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/cross-project/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no criteria), `plan.md` (content → schema → UI → gates), `tasks.md` (granular tasks, each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute in order: content patch → schema + tests → `Connections` component → both routes → a11y/CLS/sweep → gates.

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check (removal test, unknown-slug build failure, both strips at four widths/palettes, axe, CLS table, byte delta, 2 draw calls, sweep re-run, S2–S8 empty); anything needing Murphy's hands listed. STOP. Murphy validates and signals "S17 done" outside your view.
