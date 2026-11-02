# Slice 11 — OG Cards & SEO — FROZEN BRIEF v1

**slice:** S11-og-seo · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s11-og-seo` · **depends on:** S10 ✅ (routes live: `/`, `/projects`, `/projects/[slug]`), S6 ✅ (palettes), S9/S10 content ✅ · **revision counter:** 0 of 2

## Mission
Make every share of this site look deliberate and every crawler read it correctly. Each indexable route gets a build-time **1200×630 blueprint card** generated from the same theme tokens and project data as the site itself, complete Open Graph/Twitter metadata, a correct sitemap and robots file, honest JSON-LD, and a favicon set. No client-side cost: everything is generated at build time.

## Context (self-contained — the orchestrator reads ONLY this brief)
- S10 shipped the real routes: `apps/web/app/(site)/page.tsx`, `(site)/projects`, `(site)/projects/[slug]`; content is canonical at `.specify/content/site.json` + `.specify/content/websocket-inspector.json`, converted into `apps/web/content/*`.
- Theme tokens and both palettes live in `packages/xploder`; the site renders a blueprint drafting-table look (light default, dark alternate). OG cards must use the **same tokens**, never a second palette.
- Deployment is Vercel. Production today is `https://portfolio-teardown.vercel.app`; the real domain `https://hi-murphy.me` arrives in S16. **No host may be hardcoded** in rendered HTML.
- Existing gates (must stay green): mobile Lighthouse ≥ 95, weight < 3 MB home, CLS 0, axe (production routes), fixture exclusion, gitleaks.

## Deliverables
1. **Metadata layer** — one function derives per-route metadata from content: `title`, `description`, `canonical`, `og:title/description/image/url/type/site_name/locale`, `twitter:card=summary_large_image`, `twitter:title/description/image`. Used by `/`, `/projects`, `/projects/[slug]`, and 404. No product strings outside the content modules.
2. **Base URL config** — a single `SITE_URL` (env-driven, with the Vercel deploy URL as the preview default and the final domain as the production value). Absolute URLs everywhere derive from it.
3. **OG image generation (build time)** — static PNGs written during the build (no runtime function, no client JS): one for `/`, one for `/projects`, one per project. 1200×630, blueprint palette from tokens, deterministic (same input → identical bytes), each ≤ 300 KB. Content: project name/tagline or site title, an exploded-layer silhouette derived from the project's own layer count, and the title-block motif.
4. **Sitemap + robots** — generated from the content module; sitemap lists exactly the indexable routes with absolute URLs; robots allows them and disallows `/dev/`; dev routes appear nowhere.
5. **JSON-LD** — `Person` on `/` (name, role, sameAs links from `identity.links`, url) and `SoftwareApplication` per project (name, description, url, author, codeRepository from the project link). Only fields backed by canonical content — no invented data.
6. **Icon set** — `icon.svg` derived from the title-block motif + 180×180 `apple-touch-icon.png`; `theme-color` per palette.
7. **Verification** — a meta/OG probe (parse the rendered HTML of each route, assert every tag), a link-preview parser check, dimension/size/checksum checks on every generated card, sitemap/robots assertions, and a "no preview/localhost host in production HTML" test.
8. **CI** — new job `seo: meta + og` running the above; must be green and proposed for the required set.

## Non-goals (hard)
- No visual redesign of any page · no new routes · no analytics · no i18n · no domain/DNS/Vercel-project changes (S16) · no runtime OG functions · no new client-side JS or fonts added to the page bundle · no changes to engine/theme/panel behaviour (frozen S2–S8 surfaces).

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** `/`, `/projects` and `/projects/websocket-inspector` render complete metadata derived from content: title, description, canonical, `og:title`, `og:description`, `og:image` (absolute), `og:url`, `og:type`, `og:site_name`, `twitter:card=summary_large_image`, `twitter:title/description/image`; a probe asserts all of them and fails on any missing or relative `og:image`/`og:url`.
- **AC2:** OG cards exist for `/`, `/projects` and every project in content; each is exactly 1200×630 PNG, ≤ 300 KB, built from theme tokens (light palette), deterministic across two consecutive builds (identical SHA-256), and visibly contains the route's name plus the layer silhouette (evidence: files + sizes + hashes + rendered PNGs).
- **AC3:** `sitemap.xml` contains exactly the indexable routes with absolute URLs from `SITE_URL`; `robots.txt` allows them, disallows `/dev/`, and references the sitemap; neither mentions any dev or fixture route.
- **AC4:** JSON-LD on `/` validates as `Person` and on the project route as `SoftwareApplication` (schema.org validator or an equivalent local check), every URL matches the canonical, and every field traces to canonical content — zero hand-written facts.
- **AC5:** no host is hardcoded: a production build's HTML contains only URLs built from `SITE_URL`; a test fails if `localhost`, a `*.vercel.app` preview host, or any other origin appears in og/canonical/JSON-LD output when `SITE_URL` is the production domain.
- **AC6:** zero client-side cost: no new client JS (bundle comparison before/after), home weight still < 3 MB, mobile Lighthouse ≥ 95 perf/≥ 95 a11y on `/` and the project route, CLS 0; existing axe gate green.
- **AC7:** full CI green plus the new `seo: meta + og` job; frozen-surface checks (S2–S8) remain empty — **no exceptions this slice**; `icon.svg`, `apple-touch-icon.png` and `theme-color` present on every route.

## Executor rules (binding)
- One integration seam + one executable check per task; evidence per `.specify/EVIDENCE.md`; no secrets; gitleaks green.
- Perf claims in dropped-frames style only; tier 1.5 dormant (skip-with-record).
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).

## Murphy dependencies
- **None blocking.** At the G2 gate he reviews the three generated PNGs (home, projects, project) and the rendered share preview; defaults ship if he says nothing.
- S16 will point `SITE_URL` at `https://hi-murphy.me` — no code change, one env value.

## Freeze protocol
Frozen at commit; work only on `task/s11-og-seo`; integration via PR after Murphy's final validation. Scope/AC changes = revision (counter 0 of 2). RFC (`.specify/features/og-seo/rfc.md`) is orchestrator-authored and Murphy-reviewed before spec/plan/tasks and again before execution.
