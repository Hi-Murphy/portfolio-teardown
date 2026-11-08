# KICKOFF PROTOCOL — Slice S11.9 · Home Composition

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S11.9.md and execute Stage 1 on branch task/s11.9-home-composition. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s11.9-home-composition`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP. Feedback → fix inside the current stage, re-present, STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-11.9-home-composition.md` (frozen brief), this file, `.specify/content/*.json`.
2. The brief is the only scope source. AC1–AC7 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Scope is `/` only.** No changes to `/projects`, `/projects/[slug]`, the workbench, panels, engine, theme or any other route. A diff outside the home surface is a protocol violation.
4. **The section order is approved before it is built.** Stage 1's RFC must present the section inventory and order as a numbered list with a recommendation and one alternative; Murphy approves at G1 **before any implementation commit**. Section order lives in data, not in hand-moved JSX.
5. **Copy comes from content.** Every product string resolves from `site.json` or project content. No hand-typed strings in home components; no new claims; no résumé link (D-20); no contact form.
6. **The eager hero must survive.** After every task: `data-site-live-mode="eager"`, poster first paint, reveal with zero interaction on the slow class, reduced motion → poster, Save-Data → poster. Any regression = STOP.
7. **Gates unchanged:** CLS 0, Lighthouse ≥ 95 perf/a11y, axe 0 serious/critical, weight < 3 MB, 2 draw calls, dev routes 404 in production.
8. **Responsive evidence is 12 shots:** 390 / 768 / 1440 × light/dark, plus the AC2 above-the-fold shot at 390×844.
9. Evidence: every claim attaches artifacts per `.specify/EVIDENCE.md`; no secrets.
10. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. Tier 1.5 dormant (skip-with-record). Report which tier finished each task.
11. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
12. Commit at each stage boundary with prefix `S11.9/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-11.9-home-composition.md` — the FROZEN brief and only scope source; you may not edit it. Produce `.specify/features/home-composition/rfc.md`:
- the section inventory as a numbered list, with the brief's default order, one alternative (Projects before About), and a recommendation with the reason a recruiter's 15 seconds benefits;
- where the order lives (data module vs page config) and how the DOM-order probe reads it;
- per-section composition: content fields used, space/rhythm, what is removed if anything (nothing new is invented);
- the responsive strategy at 390 / 768 / 1440 (stacking order, what collapses, what stays above the fold);
- the copy-fidelity scan design;
- how each AC is proven, including the eager-hero regression probe.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; section order + alternatives + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/home-composition/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (section-by-section implementation order, probe wiring, regression probes), `tasks.md` (granular tasks; one section per task where practical; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off the slice branch; executor = DeepSeek Flash 4.1; before/after screenshots + probe assertion per section; regression probe for the eager hero after every task. STOP at each phase-group boundary.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check table (DOM-order probe, 390×844 above-the-fold shot + boxes, copy scan, eager-hero regression, 12 responsive shots, heading/landmark/keyboard checks, CI run); frozen surfaces empty; anything needing Murphy's hands listed. STOP. Murphy validates and signals "S11.9 done" outside your view.
