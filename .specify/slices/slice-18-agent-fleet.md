# Slice 18 — Agent-fleet teardown (third project) — FROZEN BRIEF v1

**slice:** S18-agent-fleet · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M2 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S17 ✅ (`d5c7756`) · **branch:** `task/s18-agent-fleet` · **frozen:** 2026-11-17 · **revision counter:** 0 of 2

## Mission
Wire the **third teardown** — the agent fleet that built this site — through the existing pipeline, under a **redaction contract**: the content is already written and pre-scanned, the job here is to prove it renders, that no secret leaks into the build, and that a third project does not disturb the two that exist.

This is the only content on the site whose source material is operational rather than public. The rules that govern it are frozen in §"Redaction contract" below. Read them before touching anything.

## What is already done for you

- **Canonical content exists on this branch**: `.specify/content/agent-fleet.json` — 4 layers / 14 components / 3 flows, `techs: []` on every component, `links: []` on every component, six metrics. **Convert it; never edit it.** A suspected error in it is reported, not fixed.
- Content was scanned against the F1–F9 patterns below: **0 hits, 0 vendor names**.

## Scope (four things, nothing else)

1. **Convert + register.** Add the project to `apps/web/scripts/convert-content.ts` `CONTENT_FILES`, run the converter, import it in `apps/web/content/projects/index.ts` and add it to `PROJECTS`.
2. **Rendering with nothing to render.** Zero techs means no chips on the card and no tech row in the panel; zero links means no "Source" section. Both must look **intentional**, not broken: verify the card and the OG card with an empty chip list and the panel with no links.
3. **Fleet-wide surface updates.** `/projects` list, home projects section, sitemap (now **4** `<loc>`), OG cards (now **4**), JSON-LD (third `SoftwareApplication`), and the route itself.
4. **Sanitization proof.** Three gates + canary + a source map (§Redaction contract).

## Redaction contract (binding — a hit is a build failure)

| # | Class | Pattern |
|---|---|---|
| F1 | IPv4 / IPv6 | `\b\d{1,3}(\.\d{1,3}){3}\b`, `\b[0-9a-f]{2,}(?::[0-9a-f]{0,4}){2,}\b` |
| F2 | Hostnames | `\b[a-z0-9-]+\.(local\|internal\|lan)\b`, `ssh [a-z]` |
| F3 | Credentials | `ghp_`, `github_pat_`, `sk-[A-Za-z0-9]`, `AKIA`, `xox[bp]-`, `-----BEGIN`, `eyJ`, `Bearer <token>` |
| F4 | Private repos | any `owner/repo` outside `{Hi-Murphy/portfolio-teardown, TimurHaryo/websocket-inspector, TimurHaryo/jev-toolkit}` |
| F5 | Platform IDs | `\b\d{17,19}\b` (snowflakes), bot tokens |
| F6 | User paths | `/home/<word>/`, `/Users/<word>/`, `~/<letter>` |
| F7 | Prompt text | quoted agent/system instructions or tool schemas — **manual read** |
| F8 | Account identifiers | org / project / team / billing IDs |
| F9 | Personal identifiers | emails, phone numbers, postal addresses |

**Also banned by implication (manual read, not regex):** vendor names chosen for operational reasons, uptime or cost figures, region names, anything that would let a reader reproduce the setup.

**Gates:**
- **G1** scan `.specify/content/agent-fleet.json` → 0 hits.
- **G2** scan exported HTML + built JS for all **four** routes → 0 hits.
- **G3 canary** seed a fixture with one fake IP, one `ghp_` token, one private repo name → the same scanners must report **3/3**. A scanner that cannot fail is not a gate.
- **G4 source map** `evidence/source-map.md`: for every number and every factual sentence in the teardown, the source that proves it (repo file, vault count, config count). Unsourced → delete the sentence, do not soften it.
- **G5 manual read**: every `summary`, `description` and `story.*` string read end to end by the orchestrator, signed in the self-check; Murphy reads the rendered page at the gate.

## Constraints (binding)
- **No content edits.** The JSON is canonical. If a sentence is wrong, report it.
- **No new tech registry entries.** The teardown ships with zero techs by design — its subject is orchestration, not a stack. Do not add ids to `tech-registry.ts` to fill the gap.
- **No relationships file for this project.** The fleet gets no `measured-on` / `shares-stack` / `same-engine` link yet: none of the three kinds is true, and inventing one is exactly what this slice exists to prevent.
- **No engine work. S2–S8 all show empty diffs.** No theme, motion, panel or label changes.
- No new dependency, no new route beyond the project route, no home redesign.
- Gates unchanged: Lighthouse ≥ 95/95 on `/`, `/projects`, and all three project routes; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero reveal with zero interaction.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — the route.** `/projects/agent-fleet` renders 4 layers / 14 components / 3 flows; every component opens a panel; every flow plays; every component name ≤ 14 chars and layer name ≤ 16; ids match the canonical JSON one-for-one; the fidelity test is deep-equal for the converted module.
- **AC2 — registration everywhere.** The project appears on `/projects` and in the home projects section; sitemap has **4** `<loc>`; **4** OG cards, each 1200×630, ≤ 300 KB, byte-identical across two builds; JSON-LD carries three `SoftwareApplication` entries; unknown routes still 404.
- **AC3 — empty is a design, not a hole.** With zero techs the card shows **no chip row** and no empty container; with zero links the panel shows **no Source section**, no divider, no placeholder. Evidence: card, panel and OG card screenshots at 390/1440, both palettes — plus the computed element counts (0 chip nodes, 0 source nodes).
- **AC4 — sanitization.** G1/G2 **0 hits**, G3 canary **3/3**, G4 source map complete (every number has a source), G5 manual read signed. The scanner is committed as a repo script with a test that feeds it a seeded string and expects a failure.
- **AC5 — accessibility.** axe 0 serious / 0 critical on the new route in both palettes; full keyboard pass through the panel and the flow controls; visible focus; tap targets ≥ 44×44; contrast AA.
- **AC6 — gates.** Full CI green (7 required contexts); Lighthouse ≥ 95/95 on all four routes; CLS 0; weight < 3 MB; 2 draw calls; eager hero reveal intact; **S2–S8 empty**.
- **AC7 — the other two projects are untouched.** `/` and `/projects` change only by the added card/list entry; both existing project pages are byte-identical **in their own files** (prefetched payloads listed separately, per the S17 ruling); the `measured-on` strips are unchanged; the S16 label sweep still reports 0 intersections.

## Executor rules (binding)
- Content → registration → rendering → sanitization → gates, in that order.
- The sanitization scanner lands **before** the route is wired, and its canary test is red-then-green.
- No copy invented in code; every string comes from the JSON.
- Evidence per `.specify/EVIDENCE.md`.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Decisions set at freeze (defaults — Murphy may override at G1)
1. **Zero techs, no registry additions** (D-44). *(Recommendation: the fleet's credible tech ids would all be vendor names — exactly what §3 bans by implication.)*
2. **No relationship file for the fleet** (D-45). *(Recommendation: revisit only when Murphy states the true relationship in one sentence; `built-with` is not in the kind enum and adding it is its own slice.)*
3. **Six metrics ship as-is**: 22 slice units, 15 revisions, 7 CI contexts, 2 gates, 12 jobs, 2 hosts — every one counted, none estimated.

## Murphy dependencies
- G1: look at the card with no chips and the panel with no source link, and say whether "empty" reads as intentional to you. *(Default: yes — the alternative is inventing tech ids.)*
- Final merge word.

## Freeze protocol
Frozen at commit; work only on `task/s18-agent-fleet`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/agent-fleet/rfc.md`.
