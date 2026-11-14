# KICKOFF PROTOCOL — Slice S14 · Engine & Hero Polish

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S14.md and execute Stage 1 on branch task/s14-engine-polish. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s14-engine-polish`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-14-engine-polish.md` (frozen brief), this file, `.specify/content/*.json`, `site.json`.
2. The brief is the only scope source. **Six named defects, nothing else.** AC1–AC7 are inviolable; a blocked AC = STOP + escalate with evidence. A drive-by refactor or an unlisted fix is a protocol violation, even if it improves things.
3. **Test-first, per defect.** Red test that reproduces the defect → fix → green → evidence. No fix without a failing test first.
4. **Re-seal discipline:** S5, S6 and S8 may be touched **only** for the files each item names, each with a written reason note in the manifest (the S11.9 `3aee8fc` procedure). S2/S3/S4/S7 must show empty diffs. An unapproved file edit is a protocol violation.
5. **I-08 is a `workflow`-scope operation** — Merlin cannot push it. If the executor seat lacks the scope, STOP and hand it to Murphy/orca rather than failing the task. After removal, prove the **seven** required contexts still report on a PR.
6. No content changes, no UI redesign, no new features, no new dependencies (three's own `Timer` is in-package).
7. Gates unchanged and must stay green: Lighthouse ≥ 95/95 on three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero reveal with zero interaction.
8. Evidence per `.specify/EVIDENCE.md`: failing-then-passing test output, screenshots (light/dark, desktop/phone), geometric rectangles for I-05, event counts for I-03, five-run CLS table for I-10, coordinate table for the corner marks.
9. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record). Report which tier finished each task.
10. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
11. Commit at each stage boundary with prefix `S14/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-14-engine-polish.md` — the FROZEN brief and only scope source. Produce `.specify/features/engine-polish/rfc.md`:
- one section per item: repro (exact steps), root cause in code (file → function), the smallest fix, the failing test that will prove it, the frozen files it touches and the re-seal plan;
- the **`selected` emphasis input** design for I-09 (how `pointer.ts`, `emphasis.ts` and `TeardownViewer.tsx` cooperate; a11y impact on the panel focus contract);
- the probe **settled-state signal** for I-10 (what "settled" means, which event/flag, and why it removes the flake rather than hiding it);
- the geometry assertion design for I-05 (which boxes, how measured, tolerances);
- the `Timer` migration plan for I-04 (what `Clock` currently feeds, and the parity check);
- the workflow removal procedure for I-08, including the "seven required contexts still report" proof;
- the gate matrix and evidence list per AC.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; per-item repro + fix + re-seal list + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/engine-polish/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (item order with the red test first for each, re-seal commits paired with each fix), `tasks.md` (granular tasks; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute items one at a time: I-09 → I-10 → I-03 → I-05 → I-04 → I-08 (smallest risk first; I-08 last since it needs Murphy's hands if scope is missing). STOP at each phase-group boundary.

**End-contract:** all items complete with evidence; AC1–AC7 self-check (emphasis assertions, 5-run CLS table + corner-mark coordinates, settle event counts, overlap rectangles, Timer parity + zero warnings, seven-context proof, gate matrix); every re-seal noted; S2/S3/S4/S7 diffs empty; anything needing Murphy's hands listed. STOP. Murphy validates and signals "S14 done" outside your view.
