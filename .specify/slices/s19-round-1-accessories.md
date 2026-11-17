# S19 Round 1 — Accessories (free roam) — WORK ORDER

**branch:** `task/s19-accessories` · **author:** Merlin (project layer) · **for:** orchestrator (Opus 5.5 / orca) · **date:** 2026-11-17 · **no AC ceremony** — this is the free-roam phase; the rules below are the contract, the list is Murphy's

## What is already committed on this branch (content — do not re-decide)

1. `.specify/content/site.json`
   - `identity.role` → **"Software engineer"**
   - `hero.eyebrow` → "Software engineer · Android"
   - `hero.subline` → rewritten (trading, community, architecture, automation + performance)
   - `hero.primaryCta` → `{ label: "See how it works", href: "/projects/jev-toolkit" }`
   - `hero.project` → **"jev-toolkit"** (new key)
   - `about.paragraphs` → 3 new paragraphs (Murphy's words; employer still redacted as 8 blocks)
   - `about.skillsNote` → adds Automation
   - `meta.description` → rewritten
2. `.specify/content/agent-fleet.json` — `techs` added on 7 components: `orchestrator`/`implementer` → `agent`; `worktree` → `git`; `label-router`/`cron` → `infra`; `edge-host` → `linux`,`infra`; `workstation` → `linux`. Card chips resolve to **infra(3) · agent(2) · linux(2) · git(1)** — exactly 4.
3. `.specify/design/logo-c-32.svg`, `logo-c-180.svg`, `logo-c-dark-32.svg` — Murphy picked **candidate C** (two blocks joined by a dash).

## Work items (in this order)

**W1 — registry.** Add four techs to `apps/web/content/tech-registry.ts`:
`{ id: 'linux', label: 'Linux', category: 'platform' }`
`{ id: 'git', label: 'Git', category: 'tooling' }`
`{ id: 'agent', label: 'Agents', category: 'ai' }`
`{ id: 'infra', label: 'Infrastructure', category: 'tooling' }`
No vendor names anywhere. Then run the converter for `agent-fleet.json` and `site.json`.

**W2 — hero project becomes data.** `apps/web/content/site-copy.ts`: add `project: string` to the `hero` type. `apps/web/components/home/hero-section.tsx`: replace `projects[0]` with a lookup of `SITE.hero.project` in `PROJECTS`, falling back to `projects[0]` if the slug is missing. No other hero change. The hero now animates JEV's 20 components / 2 flows — re-measure the S14 holds (labelled 0.19–3.40 s, zoomed 0.14–1.75 s, tour end 0–1.61 s): report the deltas, do not silently retune.

**W3 — About moves up.** `apps/web/content/home-sections.ts`: order becomes `nav, hero, about, projects, contact, footer`. ⚠️ This collides with S11.9's above-fold reading: Projects was above the 390×844 fold. Re-measure the fold line on a 390×844 viewport and report it. Acceptable outcome, but it must be measured and recorded, not assumed.

**W4 — logo.** Replace the generated mark in `apps/web/seo/icon.ts` (`iconSvg()` **and** `appleIconElement()`) with the glyph in `.specify/design/logo-c-32.svg` / `logo-c-180.svg`, expressed in the existing palette code rather than hardcoded hex where the file already does that. Add an inline `<svg>` glyph (18–20 px, `aria-hidden="true"`) before the name in `apps/web/components/home/hero-section.tsx` (identity line) and in `apps/web/components/site-footer.tsx` (name span). The OG card wordmark: put the same glyph before the name in `apps/web/seo/og/card.tsx`. **This re-baselines all five OG card hashes** — one commit, publish the new hashes in the evidence file, do not chase the old ones.

**W5 — verify, in this order.**
1. `pnpm convert` + fidelity test (both JSONs deep-equal).
2. Card chips: `agent-fleet` shows four chips (infra, agent, linux, git) and no layout shift vs the other cards; `/projects` card order unchanged.
3. Hero: JEV stages and flows play; pause/play still work; zero-interaction reveal unchanged; holds table reported.
4. Home: About directly after hero; Projects below the fold at 390×844 — fold line number reported.
5. Favicon + apple icon render at 16/32/180, light and dark; no clipped glyph; tab shows the new mark.
6. axe 0 serious / 0 critical on `/`, `/projects`, three project routes; keyboard pass; contrast AA.
7. Lighthouse mobile ≥ 95/95 on all five routes; CLS 0; weight < 3 MB; 2 draw calls.
8. Redaction scan green (runs in `pnpm build`); no vendor names in any new string.
9. `sitemap` still 5 `<loc>`; OG cards 1200×630, ≤ 300 KB, new hashes recorded; JSON-LD unchanged in shape.

## Standing rules (do not relax)
- Five routes stay five; every number on the site stays sourced (no invented metrics in the new copy).
- JEV stays a third-party model; the About text must not imply Murphy built JEV.
- Employer stays redacted as ████████ (the résumé PDF still says Android engineer — flagged to Murphy, not our call here).
- No engine, motion, label or layout refactors beyond W3's one-line order change.

## Out of scope (Murphy will decide later)
- Résumé PDF re-export (it still says "Android engineer").
- 404 project list, per-project lazy chunks, docs-only CI skip, evidence path scrub — all still backlog.

## Report back with
The holds table, the fold line, the five new OG hashes, the chip order, and any item that could not be verified — before asking for the merge word.
