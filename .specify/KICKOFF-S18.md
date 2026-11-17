# KICKOFF PROTOCOL — Slice S18 · Agent-fleet teardown

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S18.md and execute Stage 1 on branch task/s18-agent-fleet. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s18-agent-fleet`** (it already exists on origin and carries `.specify/content/agent-fleet.json`). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-18-agent-fleet.md` (frozen brief), this file, **`.specify/content/agent-fleet.json`** (canonical content — convert it, never edit it).
2. The brief is the only scope source. AC1–AC7 are inviolable; a blocked AC = STOP + escalate with evidence.
3. **Redaction contract is a gate, not advice.** F1–F9 patterns + implication ban (§3 of the brief). A hit fails the build. The scanner is committed with a canary test that must go red on a seeded string before it goes green on clean content.
4. **No content edits, no tech-registry additions** (the project ships with zero techs by design), **no relationship file** for this project.
5. **No engine work: S2–S8 must show empty diffs.** If a change smells like engine/renderer work, it is out of scope — stop and report.
6. **G5 manual read is mandatory** and signed in the self-check: every `summary`, `description`, `story.*` string read end to end for implication leaks.
7. **G4 source map is mandatory:** every number and factual sentence must name its source. Unsourced → the sentence is removed, not softened.
8. Gates unchanged: Lighthouse ≥ 95/95 on all four routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero reveal intact, the other two projects' own files byte-identical.
9. Evidence per `.specify/EVIDENCE.md`; no secrets in any artefact; screenshots from the rendered site only.
10. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record).
11. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
12. Commit at each stage boundary with prefix `S18/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-18-agent-fleet.md` — the FROZEN brief and only scope source. Produce `.specify/features/agent-fleet/rfc.md`:
- the conversion + registration path (`convert-content.ts` entry, `projects/index.ts` import/array) and what the fidelity test compares;
- every place that assumes **two** projects (`content-model.test.ts` slug list, `/projects` list, home section, sitemap count, OG route list, JSON-LD) with the exact file and line that must change;
- the **empty-rendering** design: how a card with zero chips and a panel with zero links avoid empty containers, with the computed-node-count checks that prove it;
- the sanitization scanner design (patterns, where it runs, how the canary is wired red-then-green) and the source-map format;
- the a11y plan for a route with no tech row and no source section;
- the gate matrix and evidence list per AC.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; registration map + empty-render design + scanner design + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/agent-fleet/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no criteria), `plan.md` (content conversion → registration → empty rendering → sanitization gate → fleet surfaces → gates), `tasks.md` (granular tasks; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute in order: converter entry + registration → route renders 4/14/3 → empty rendering → home/projects/sitemap/OG/JSON-LD → sanitization gates (scanner first, then G1–G5) → a11y → gates. STOP at each phase-group boundary.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check (component/layer/flow counts and fidelity output, sitemap 4 locs, 4 OG cards with dimensions + hashes, 0 chip nodes / 0 source nodes, G1/G2 zero hits, G3 3/3 canary, G4 source map, G5 signed read, axe, Lighthouse ×4, CLS, weight, draws, S2–S8 empty, other projects unchanged); anything needing Murphy's hands listed. STOP. Murphy validates and signals "S18 done" outside your view.
