# KICKOFF PROTOCOL — Slice S16 · Label System

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S16.md and execute Stage 1 on branch task/s16-label-system. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s16-label-system`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-16-label-system.md` (frozen brief), this file, `.specify/content/*.json`.
2. The brief is the only scope source: **E3 and E6 and nothing else.** AC1–AC6 are inviolable; a blocked AC = STOP + escalate with evidence.
3. **Two-stage gate is mandatory.**
   - **[STOP 1] The unified model lands with 0 px visual difference** on the full screenshot matrix (both projects, both palettes, 390/768/1440, all zoom steps and snaps). Then STOP and wait for Murphy's word.
   - Only after that word may placement behaviour change (overlap resolution, emphasis slots).
4. **Sweep before switch.** The geometric sweep (every label pair) is written and failing on a seeded overlap **before** the unified placement is enabled.
5. **Surfaces:** S6/S7/S8 may be touched, each re-sealed with a written reason and a pushed tag `seal/<surfaces>-<sha>`. **S2/S3/S4/S5 must stay empty.**
6. **No typography changes** — no font, size, weight or colour change. Placement and emphasis only. No new visual style for the second emphasis slot.
7. No content changes, no new features beyond E3/E6, no new dependencies.
8. Gates unchanged: Lighthouse ≥ 95/95 on three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero reveal with zero interaction.
9. Evidence per `.specify/EVIDENCE.md`: rectangles for the sweep, pixel-diff matrix with every changed cluster explained, emphasis assertions, placement-pass counts, timing table, re-seal tags.
10. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record). Report which tier finished each task.
11. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
12. Commit at each stage boundary with prefix `S16/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-16-label-system.md` — the FROZEN brief and only scope source. Produce `.specify/features/label-system/rfc.md`:
- the unified label model (every label kind, its anchor, its constraints, its priority) and the single pass that places them;
- how the two existing placement modules are absorbed without changing output (the parity argument, stated precisely);
- the geometric sweep design (which rectangles, which viewport/zoom/rotation/scroll matrix, how measured — DOM markers vs projected box) and the seeded-overlap negative control;
- the two-slot emphasis model (hover + selected, precedence, a11y announcement);
- the placement-pass counter and the "no churn" check;
- the per-file re-seal list with reasons and tag names;
- the gate matrix and evidence list per AC.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; unified model + parity argument + sweep design + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/label-system/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no criteria), `plan.md` (**Stage A: model merge at 0 px parity → STOP 1; Stage B: placement behaviour and emphasis**), `tasks.md` (granular tasks, each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

**Stage A (model merge, 0 px):** unify the models and the pass; prove the full pixel-parity matrix; leave every placement decision identical. Commit, then **STOP for Murphy's "continue"** — do not proceed past this gate.

**Stage B (only after the word):** switch placement to the unified solver, run the sweep, add the second emphasis slot, re-seal S6/S7/S8 with tags, run the gate matrix.

**End-contract:** all items complete with evidence; AC1–AC6 self-check (sweep result per matrix cell, pixel-diff clusters with reasons, two-slot emphasis assertions, pass count, timing table, gate matrix, tags listed); S2/S3/S4/S5 diffs empty; anything needing Murphy's hands listed. STOP. Murphy validates and signals "S16 done" outside your view.
