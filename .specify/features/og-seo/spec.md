# Feature Specification: S11 OG Cards & SEO

**Feature dir:** `.specify/features/og-seo/` · **Slice:** S11-og-seo · **Created:** 2026-11-02 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-11-og-seo.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-02: all §6 defaults, Q1 reading confirmed, §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Deliverables 1–8 appear as supporting requirements (SR) under the FR they serve and get task-level checks, not criteria of their own. Documented values (field tables, card layout, `SITE_URL` order, probe steps) come from the RFC and are referenced, not promoted to criteria.
>
> **Interpretation on record (RFC Q1, confirmed at Gate 1):** in FR4 "every URL matches the canonical" and FR5 "any other origin", the rule covers **self-referential** URLs (canonical, `og:url`, `og:image`, `twitter:image`, icon links, JSON-LD `url`/`author.url`). External identity links (`sameAs`, `codeRepository`) are allowed only if they equal a canonical content value verbatim.
>
> **Evidence doctrine (kickoff Hard Rule 7):** every claim attaches machine-made evidence per `.specify/EVIDENCE.md`: rendered HTML, parsed tag assertions, PNG files + sizes + SHA-256, sitemap/robots output, JSON-LD validation output, Lighthouse JSON. Perf claims use the dropped-frames style only.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A shared link looks deliberate (Priority: P1)

I paste `/projects/websocket-inspector` into LinkedIn, Slack or X. The preview shows a blueprint card with "Scarlet Inspector", its tagline and a stack of its five layers, plus the project's title and description. The home and projects links get their own cards.

**Why this priority:** the slice's mission. Shares are the main way recruiters reach the site.

**Independent Test:** `seo:probe` meta + link-preview steps on the production export. PNG dimension/size/hash checks. Rendered PNGs reviewed at G2.

**Acceptance Scenarios:**

1. **Given** the production export, **When** the probe parses `/`, `/projects` and `/projects/websocket-inspector`, **Then** every AC1 tag is present with the RFC D3 value, and `og:image`/`og:url` are absolute. _(AC1)_
2. **Given** an unfurler (`open-graph-scraper`) reading the same HTML, **Then** it sees title, description, a 1200×630 image and `summary_large_image`. _(AC1, SR1.2)_
3. **Given** two consecutive clean builds, **Then** `og/home.png`, `og/projects.png` and `og/projects/websocket-inspector.png` are 1200×630, ≤ 300 KB and SHA-256-identical. Each shows the route's name and the layer silhouette. _(AC2)_

---

### User Story 2 — A crawler reads the site correctly (Priority: P1)

A search crawler fetches `/robots.txt`, follows the sitemap, and finds exactly the three public routes. It reads a `Person` on the home page and a `SoftwareApplication` on the project page, with nothing invented.

**Why this priority:** Deliverables 4–5. The brief requires correctness ("honest JSON-LD").

**Independent Test:** probe sitemap/robots + JSON-LD steps; `schema-dts` typecheck; one validator.schema.org run.

**Acceptance Scenarios:**

1. **Given** `out/sitemap.xml`, **Then** its `<loc>` set equals the indexable routes' absolute URLs exactly, and no dev or fixture route appears. _(AC3)_
2. **Given** `out/robots.txt`, **Then** it allows `/`, disallows `/dev/`, references `<SITE_URL>/sitemap.xml`, and names no other dev or fixture path. _(AC3)_
3. **Given** the JSON-LD on `/` and on the project route, **Then** the types and properties are valid per schema.org, `url` equals the canonical, and every value traces to `site.json` / `websocket-inspector.json`. _(AC4)_

---

### User Story 3 — The S16 domain cutover is one env value (Priority: P1)

Murphy sets `SITE_URL=https://hi-murphy.me` on Vercel in S16 and redeploys. Every canonical, `og:*` URL, sitemap entry and JSON-LD URL now uses that origin, with no code change. Before S16, production uses the Vercel production URL and previews use their deploy URL.

**Why this priority:** Deliverable 2 and AC5. A leaked host makes every share and crawl wrong.

**Independent Test:** the `resolveSiteUrl` unit matrix; the probe host-leak step with `SITE_URL=https://hi-murphy.me`.

**Acceptance Scenarios:**

1. **Given** `SITE_URL=https://hi-murphy.me`, **When** the export is built, **Then** every self-URL in og/canonical/JSON-LD output has that origin, and no `localhost`, `127.0.0.1` or `*.vercel.app` appears. _(AC5)_
2. **Given** `VERCEL_ENV=production` without `SITE_URL`, **Then** the origin is `https://$VERCEL_PROJECT_PRODUCTION_URL`. **Given** a preview, **Then** it is `https://$VERCEL_URL`. **Given** `VERCEL=1` and a localhost result, **Then** the build fails. _(AC5, SR5.1)_

---

### User Story 4 — Visitors pay nothing for it (Priority: P1)

A visitor on a mid-range Android phone over 4G loads the site. It is exactly as fast as before S11: no new scripts, no new web fonts, the same layout stability.

**Why this priority:** the design target and the brief's "no client-side cost" mission.

**Independent Test:** bundle manifest diff (base `3ba4c3b` vs head); perf CI jobs; Lighthouse/weight before vs after.

**Acceptance Scenarios:**

1. **Given** the base and head production exports, **Then** the client JS file set and each route's script list are unchanged. _(AC6)_
2. **Given** the PR preview, **Then** mobile Lighthouse perf and a11y are ≥ 95 on `/` and the project route, CLS is 0, home weight is < 3 MB, and the axe job is green. _(AC6)_

---

### User Story 5 — The maintainer can trust CI (Priority: P2)

A future change drops `og:image` or adds a dev route to the sitemap. The `seo: meta + og` job goes red. Frozen engine surfaces stay untouched.

**Independent Test:** CI run URLs; a regression proof on a throwaway commit; `guards.sh`.

**Acceptance Scenarios:**

1. **Given** the PR, **Then** every CI job is green, including `seo: meta + og`, and the frozen-surface test + `guards.sh` report no diff. _(AC7)_
2. **Given** any exported HTML route, including 404, **Then** the `icon.svg` link, the `apple-touch-icon.png` link and `theme-color` are present. _(AC7)_

### Edge Cases

- **404:** inherits the base metadata (home card, title, description, icons, theme-color). It has **no** canonical or `og:url`, Next adds `noindex`, and it is absent from the sitemap.
- **Missing optional content:** a project with no `tagline` falls back to `summary`, then `meta.description`. A project with no `Source` link omits `codeRepository`. An `identity.links` entry whose `url` is null is skipped in `sameAs`.
- **Long strings:** card titles/subs clamp at 2 lines, and title-block rows cap at 6 + `+N` (RFC D5).
- **More projects later:** the cards, sitemap entries, metadata and probe routes follow `PROJECTS` with no code change.
- **`SITE_URL` with a path or trailing slash:** normalized to an origin. A non-`https` origin is rejected unless the host is localhost.
- **Manual theme toggle:** `theme-color` follows the OS scheme only (RFC Q13).

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** `/`, `/projects` and `/projects/websocket-inspector` render complete metadata derived from content: title, description, canonical, `og:title`, `og:description`, `og:image` (absolute), `og:url`, `og:type`, `og:site_name`, `twitter:card=summary_large_image`, `twitter:title/description/image`; a probe asserts all of them and fails on any missing or relative `og:image`/`og:url`.
  - **SR1.1 (Deliverable 1):** one function, `routeMetadata(route)`, produces all per-route metadata (incl. `og:locale`, `twitter:*`) for `/`, `/projects`, `/projects/[slug]` and 404, from the content modules only (RFC D3).
  - **SR1.2 (Deliverable 7):** the meta probe and a link-preview parser check (RFC D9 steps 1–2).
- **FR2 (= AC2):** OG cards exist for `/`, `/projects` and every project in content; each is exactly 1200×630 PNG, ≤ 300 KB, built from theme tokens (light palette), deterministic across two consecutive builds (identical SHA-256), and visibly contains the route's name plus the layer silhouette (evidence: files + sizes + hashes + rendered PNGs).
  - **SR2.1 (Deliverable 3):** build-time static PNGs via `next/og` in `force-static` route handlers. No runtime function, no client JS, no external service. Vendored OFL fonts. Title-block motif (RFC D4, D5).
  - **SR2.2 (Deliverable 7):** dimension/size/checksum checks on every card (RFC D9 step 3).
- **FR3 (= AC3):** `sitemap.xml` contains exactly the indexable routes with absolute URLs from `SITE_URL`; `robots.txt` allows them, disallows `/dev/`, and references the sitemap; neither mentions any dev or fixture route.
  - **SR3.1 (Deliverable 4):** both are generated from the route registry (RFC D6). Probe step 4.
- **FR4 (= AC4):** JSON-LD on `/` validates as `Person` and on the project route as `SoftwareApplication` (schema.org validator or an equivalent local check), every URL matches the canonical, and every field traces to canonical content — zero hand-written facts.
  - **SR4.1 (Deliverable 5):** field maps per RFC D7. The project is typed `["SoftwareApplication", "SoftwareSourceCode"]`. `schema-dts` types + a local vocabulary check + a trace check + one validator.schema.org run.
- **FR5 (= AC5):** no host is hardcoded: a production build's HTML contains only URLs built from `SITE_URL`; a test fails if `localhost`, a `*.vercel.app` preview host, or any other origin appears in og/canonical/JSON-LD output when `SITE_URL` is the production domain.
  - **SR5.1 (Deliverable 2):** a single `resolveSiteUrl(env)` + `absoluteUrl(path)` with the RFC D2 order and guards. Host-leak test = probe step 6 with `SITE_URL=https://hi-murphy.me`.
- **FR6 (= AC6):** zero client-side cost: no new client JS (bundle comparison before/after), home weight still < 3 MB, mobile Lighthouse ≥ 95 perf/≥ 95 a11y on `/` and the project route, CLS 0; existing axe gate green.
  - **SR6.1:** `seo/` is server-only. No fonts or `@font-face` in `out/`. A bundle manifest diff vs `3ba4c3b` (RFC D11).
- **FR7 (= AC7):** full CI green plus the new `seo: meta + og` job; frozen-surface checks (S2–S8) remain empty — **no exceptions this slice**; `icon.svg`, `apple-touch-icon.png` and `theme-color` present on every route.
  - **SR7.1 (Deliverable 6):** `icon.svg` from the title-block motif with both palettes, a 180×180 `apple-touch-icon.png`, and a `viewport.themeColor` pair (RFC D8).
  - **SR7.2 (Deliverable 8):** CI job `seo: meta + og` (RFC D10), proposed for the required set. `guards.sh` (RFC D12) with zero `packages/xploder` diff.

### Key Entities

- **SeoRoute:** `{ kind: 'home' | 'projects' | 'project' | 'not-found', path, ogImagePath, project? }`. `INDEXABLE_ROUTES` is home + projects + one entry per `PROJECT_SLUGS`.
- **SiteUrl:** a normalized origin string from `resolveSiteUrl(env)`. `absoluteUrl(path)` is the only self-URL constructor.
- **CardModel:** `{ eyebrow, title, sub, silhouettes: PosterGeometry[], titleBlock: { title, meta, rows } }`. Every string comes from content.
- **SeoProbeReport:** per-route tag table, unfurl result, card `{ path, width, height, bytes, sha256 }[]`, sitemap/robots findings, JSON-LD findings, host-leak findings, pass flag.

## Success Criteria _(mandatory)_

The success criteria are exactly FR1–FR7 (= AC1–AC7). No additional measurable outcomes are defined, by rule. The probe report, hash manifests, Lighthouse summaries, bundle diff and CI runs are their evidence (RFC §7).

## Assumptions

- Vercel's "Automatically expose System Environment Variables" stays enabled (default). If it is disabled, the D2 guard fails the build loudly.
- The Next version stays at 16.4.3 during the slice. A Next upgrade may change card bytes, which is allowed: determinism is defined across consecutive builds of the same input.
- `hi-murphy.me` is used only as a test value in CI. No DNS or Vercel change happens in S11.
