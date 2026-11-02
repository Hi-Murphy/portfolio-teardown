# KICKOFF PROTOCOL — Slice S11 · OG Cards & SEO

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S11.md and execute Stage 1 on branch task/s11-og-seo. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s11-og-seo`** (worktrees welcome). Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Never chain two stages in one turn, even when review seems a formality.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-11-og-seo.md` (frozen brief), this file, or `.specify/content/*.json` (canonical content — read it, never edit it).
2. The brief is the only scope source. AC1–AC7 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Frozen surfaces:** S2 schema/parse/tokens, S4 layout/camera/explode, S5 hover/focus/tour/zoom, S6 materials/edges/callouts/palettes, S7 panels/chips/lettering, S8 a11y behaviours. **No exceptions this slice** — AC7 requires the frozen-surface checks to be empty. New modules only (metadata/OG/sitemap layer is new).
4. Other hard rules: no secrets; no DNS/Vercel-project changes; no analytics; dev routes stay production-excluded; no new client JS or page-bundle fonts.
5. **OG cards are generated at build time only** — no runtime OG function, no headless browser in the request path, no external image service.
6. Determinism is an acceptance criterion: same input → identical PNG bytes (AC2). Fonts must be bundled from a permissively licensed source and recorded in the RFC.
7. Evidence discipline: every claim attaches machine-made evidence per `.specify/EVIDENCE.md` — rendered HTML, parsed tag assertions, PNG files + sizes + SHA-256, sitemap/robots output, JSON-LD validation output, Lighthouse JSON.
8. Escalation ladder: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator executes personally. Tier 1.5 dormant (skip-with-record). Report which tier finished each task.
9. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
10. Commit at each stage boundary with message prefix `S11/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-11-og-seo.md` — the FROZEN brief and your only scope source; you may not edit it. Produce `.specify/features/og-seo/rfc.md`: metadata derivation model (one function, content-driven); `SITE_URL` strategy for Vercel previews vs production vs S16 domain cutover; OG image pipeline (renderer choice, font strategy + licence, token access from `packages/xploder`, determinism method, output paths, build wiring); sitemap/robots generation; JSON-LD mapping to canonical fields; icon set derivation; the new CI job `seo: meta + og` and how it proves each AC; risks. Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed to the branch; decision summary + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/og-seo/`: `spec.md` (FRs mapping 1:1 to AC1–AC7 — invent no acceptance criteria), `plan.md` (module layout, build wiring, renderer, test harness), `tasks.md` (granular ordered tasks; one integration seam + one executable check each; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order. Per task: fresh worktree off `task/s11-og-seo`; executor seat = DeepSeek Flash 4.1; evidence per Hard Rule 7; escalation per Hard Rule 8. STOP at each phase-group boundary and wait for Murphy's validation.

**End-contract:** all tasks complete with evidence; AC1–AC7 self-check table (tag probe per route, PNG files + hashes + size, sitemap/robots output, JSON-LD validation, host-leak test, bundle/weight/Lighthouse comparison, CI run incl. the new job); frozen-surface diffs empty; anything needing Murphy's hands listed. STOP. Murphy runs final validation and signals "S11 done" outside your view.
