# KICKOFF PROTOCOL — Slice S12 · M1 Validation (MVP gate)

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S12.md and execute Stage 1 on branch task/s12-m1-validation. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s12-m1-validation`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-12-m1-validation.md` (frozen brief), this file, `.specify/content/*.json`.
2. The brief is the only scope source. AC1–AC7 are inviolable. **A failed AC is reported as a failed AC** — never reworded, never "passed with a note", never quietly re-run until green.
3. **Protocol before measurement (AC1).** The 15-second script, the three questions, the pass line (≥ 4 of 5 on all three) and the scoring sheet are frozen at G1 **before any participant sees the site**. Changing them after results exist is a protocol violation.
4. **The human test is Murphy's hands.** You prepare the script, the sheet, the capture method and the anonymisation (P1–P5); you cannot run participants. Process his raw notes verbatim — do not paraphrase answers into nicer data.
5. **This slice adds no features.** Fixes are allowed only for **Sev-1/Sev-2 defects**, one defect per task, each with a before/after proof and a full gate-matrix regression afterwards. Everything else goes to the backlog with severity and owner.
6. **Baselines:** final commit is `ffda3a2`; frozen-surface baseline is the S11.9 re-seal `3aee8fc`. `/projects*` `<main>` must be byte-identical to `ffda3a2` unless a recorded defect fix touches it.
7. Gates unchanged: Lighthouse ≥ 95/95, CLS 0, < 3 MB, axe 0/0, `seo: meta + og`, fixture exclusion, eager hero reveal ≤ 2.5 s (slow class), 2 draw calls.
8. Evidence: every number attaches its artifact per `.specify/EVIDENCE.md`; participants anonymised; no secrets; no personal data beyond P1–P5 labels.
9. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record). Report which tier finished each task.
10. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
11. Commit at each stage boundary with prefix `S12/stage-N:`.

## Stage 1 — Validation protocol RFC

Read `.specify/slices/slice-12-m1-validation.md` — the FROZEN brief and only scope source. Produce `.specify/features/m1-validation/rfc.md`:
- the 15-second protocol: exact wording of the instruction, the three questions, the scoring rules, what counts as "correct" for each, how answers are recorded verbatim;
- the participant mix and recruitment ask (2 recruiters/hiring-adjacent, 2 developers, 1 non-technical), with the default: Murphy recruits, slice supplies the script;
- the device/browser matrix and how each cell is captured (screenshots + console logs);
- the degraded-mode checks (no-JS, reduced motion, Save-Data) and what "poster with numbered path" must show;
- the gate-matrix run list and the exact commands;
- the triage rubric (Sev-1/2/3/4 definitions) and the close rule (zero Sev-1/Sev-2);
- the report skeleton, including the metric table and the open-issue list.
Every open question carries your recommendation as default. Do NOT measure anything yet.

**End-contract:** protocol committed; the script, pass line, matrix and rubric presented verbatim for approval. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/m1-validation/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (run order: gates → device matrix → human test → triage → report), `tasks.md` (granular tasks; the protocol and pass line are inputs, not tasks; each task ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order: gate matrix, content integrity, device matrix (Murphy), degraded modes, human test (Murphy), triage + Sev-1/Sev-2 fixes, report. STOP at each phase-group boundary.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check with **explicit MET / NOT MET per AC** (no softening); the metric table (Lighthouse, CLS, weight, axe, reveal time, draws); the five participant sheets as raw notes; the triage log with severities; the MVP report committed; anything needing Murphy's hands listed. STOP. Murphy gives the final "M1 passed / failed" outside your view.
