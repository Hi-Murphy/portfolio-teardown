# KICKOFF PROTOCOL — Slice S13 · jev-toolkit wiring

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S13.md and execute Stage 1 on branch task/s13-jev-content. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s13-jev-content`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-13-jev-content.md` (frozen brief), this file, or `.specify/content/jev-toolkit.json` (**canonical content** — convert it, never edit it; a suspected error in it is reported, not fixed).
2. The brief is the only scope source. AC1–AC7 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Fidelity test first.** The converted content module must be proven deep-equal to the JSON (strict equality + sha stamp + negative control) **before** route/card work starts.
4. **No special-casing.** Adding a project must flow through the existing mechanisms (content module → route → cards → OG/sitemap/JSON-LD). If shared code needs a change, it must be additive and justified in the RFC — a per-project branch in shared code is a red flag, stop and escalate.
5. **Content is verbatim.** JEV is a **third-party decision model**; the work is the harness. No "built JEV" claim, no editorialising of the metrics, no new copy.
6. **No regression:** mobile Lighthouse ≥ 95/95 on `/`, `/projects`, new route; CLS 0; axe 0/0; weight < 3 MB per route; **2 draw calls** on the new teardown; the home eager hero still reveals with zero interaction; `/projects/websocket-inspector` behaviour unchanged.
7. Frozen surfaces S2–S8 empty. Dev routes 404 in production. No engine/theme/motion/panel changes.
8. Evidence per `.specify/EVIDENCE.md`: screenshots (mobile/desktop × light/dark), probe output, OG PNG + SHA-256 ×2 builds, sitemap/JSON-LD verification.
9. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record). Report which tier finished each task.
10. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
11. Commit at each stage boundary with prefix `S13/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-13-jev-content.md` — the FROZEN brief and only scope source. Produce `.specify/features/jev-content/rfc.md`:
- how the JSON converts into the content module (same mechanism as websocket-inspector — name the files), and where the fidelity test hooks in;
- what, if anything, in the shared content/route/card/OG code needs an **additive** change to accept a second project — with a justification per change;
- the card ordering rule on `/projects` and in the home section (content order vs date vs manual), with a recommendation;
- the OG pipeline check (determinism across two builds), sitemap and JSON-LD extension;
- the gate matrix and evidence list per AC.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; conversion plan + any shared-code change + card ordering + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/jev-content/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (fidelity test first, then route, then cards, then OG/SEO, then gates), `tasks.md` (granular tasks; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order: fidelity test → route → cards → OG/SEO → gate matrix. Per task: fresh worktree off the slice branch; executor = DeepSeek Flash 4.1; evidence per Hard Rule 8. STOP at each phase-group boundary.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check table (route renders 5/20/2, fidelity test output, cards on both surfaces, OG dimensions + hashes, sitemap/JSON-LD, Lighthouse/axe/CLS/weight/draws on three routes, eager hero regression, CI run); frozen surfaces empty; anything needing Murphy's hands listed. STOP. Murphy validates and signals "S13 done" outside your view.
