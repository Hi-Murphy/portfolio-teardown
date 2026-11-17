# Slice 17 — Cross-project relationships — FROZEN BRIEF v1

**slice:** S17-cross-project · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M2 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S16 ✅ (`cec65ea`) · **branch:** `task/s17-cross-project` · **frozen:** 2026-11-17 · **revision counter:** 0 of 2

## What the content actually says (measured, not assumed)

- `websocket-inspector` techs: `android, coroutines, jetpack-compose, kotlin, room, websocket`
- `jev-toolkit` techs: `nodejs`
- **Shared techs: zero.** A chip-to-chip "used in N projects" feature would ship with **no links at all** today.
- What *is* real: jev-toolkit's arms were measured **against a real Android app** — that app is the websocket-inspector. The two teardowns describe one body of work; nothing on the site says so.

## Mission
Make the two projects read as **one body of work**: a content-driven relationship strip on each teardown, in both directions, so a reader who lands on either page finds the other. **No chip links** — the data does not support them, and a link feature with zero links is weight without a demonstration.

## Scope
1. **Schema (additive, content model only):** `relationships: [{ to: slug, kind: 'measured-on' | 'shares-stack' | 'same-engine', note: string }]` in each project JSON. Unknown `to` slug = build error, never a silent drop.
2. **Content:** one relationship in each file:
   - `jev-toolkit` → `websocket-inspector`: kind `measured-on`, note *"Every arm in this harness was measured against this app's real code."*
   - `websocket-inspector` → `jev-toolkit`: kind `measured-on`, note *"This app is the benchmark target for the harness in jev-toolkit."*
3. **UI:** a `Connections` strip on the project route, **after the story, before the footer** — project name, the note, one link. Data-driven; removing the JSON entry removes the strip.
4. **Explicitly out of scope:** tech-chip links, a tech index page, home-page changes, new engine code.

## Constraints (binding)
- **App + content only. S2–S8 must all show empty diffs.** No engine, theme, motion, panel or label changes.
- Content is verbatim from this brief; the JEV framing holds (harness = the work; JEV = the third-party model it measures).
- No new dependency; no new route.
- Gates unchanged: Lighthouse ≥ 95/95 on `/`, `/projects`, both project routes; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero intact.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — data-driven both ways.** Both strips render from JSON alone; deleting one entry removes exactly that strip (test); an unknown `to` slug fails the build with a named error; a relationship to the same project is rejected by the schema.
- **AC2 — accessible.** The strip is a labelled list of links, keyboard reachable in order, visible focus, tap targets ≥ 44×44, link text names the destination project (not "here"). axe 0 serious / 0 critical.
- **AC3 — no layout damage.** CLS 0 on all four routes; the strip sits between story and footer; 390 px shows no horizontal scroll and no overlap with the label system's footprint notes (the S16 sweep is re-run and must stay at 0 intersections).
- **AC4 — home untouched.** `/` is byte-identical except for no change at all; the eager hero's reveal is re-measured and unchanged.
- **AC5 — weight.** Total client JS **+ ≤ 1.5 KB gzip**; 2 draw calls; no new route in the sitemap beyond the existing three.
- **AC6 — gates and seals.** CI 7/7 required contexts green; the fidelity test passes for both converted modules; **S2–S8 empty**.

## Executor rules (binding)
- Content first, then schema, then UI — in that order, each with its test.
- No copy invented in code; every string comes from the JSON.
- Evidence per `.specify/EVIDENCE.md`: both strips (light/dark, 390/1440), removal test, unknown-slug build failure, axe output, CLS table, byte delta, sweep re-run.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Decisions set at freeze (defaults — Murphy may override at G1)
1. **No tech-chip links.** Measured: 0 shared techs across the two projects. *(Recommendation: revisit only when a third project shares a tech — then the same `relationships` field can carry `shares-stack` without new UI.)*
2. **Two-way relationship**, both entries written explicitly in content (not auto-mirrored). *(Recommendation: explicit — a mirrored link someone can't find in the JSON is a mystery later.)*
3. **Strip position: after the story, before the footer.** *(Recommendation: it is a closing thought, not a headline.)*

## Murphy dependencies
- Approve the two `note` strings at G1 (they are the only new prose on the site).

## Freeze protocol
Frozen at commit; work only on `task/s17-cross-project`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/cross-project/rfc.md`.
