# RFC — S11 OG Cards & SEO

**slice:** S11-og-seo · **status:** APPROVED at Gate 1 (2026-11-02): all §6 defaults accepted (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-11-og-seo.md` (frozen brief v1) · **branch:** `task/s11-og-seo` · **base:** `3ba4c3b` · **date:** 2026-11-02

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§6).

---

## 1. Context (from the brief)

- **Mission:** every share of the site should look deliberate, and every crawler should read it correctly. Each indexable route gets a build-time 1200×630 blueprint card made from the same theme tokens and project data as the site. Routes also get complete Open Graph/Twitter metadata, a correct sitemap and robots file, honest JSON-LD and a favicon set. All of it is generated at build time, at zero client cost.
- **Live:** routes `/`, `/projects` and `/projects/[slug]` (S10), the blueprint palettes in `xploder/theme` (S6), and canonical content in `.specify/content/{site,websocket-inspector}.json`, converted into `apps/web/content/*` (S9/S10).
- **Deploy:** Vercel. Production is `https://portfolio-teardown.vercel.app` today, and `https://hi-murphy.me` arrives in S16 as one env value. **No host may be hardcoded.**
- **Gates that must stay green:** mobile Lighthouse ≥ 95 perf/a11y, home weight < 3 MB, CLS 0, axe (production routes), fixture exclusion, gitleaks, and the S2–S8 frozen-surface manifests.

### Acceptance criteria (verbatim, inviolable)

- **AC1:** `/`, `/projects` and `/projects/websocket-inspector` render complete metadata derived from content: title, description, canonical, `og:title`, `og:description`, `og:image` (absolute), `og:url`, `og:type`, `og:site_name`, `twitter:card=summary_large_image`, `twitter:title/description/image`; a probe asserts all of them and fails on any missing or relative `og:image`/`og:url`.
- **AC2:** OG cards exist for `/`, `/projects` and every project in content; each is exactly 1200×630 PNG, ≤ 300 KB, built from theme tokens (light palette), deterministic across two consecutive builds (identical SHA-256), and visibly contains the route's name plus the layer silhouette (evidence: files + sizes + hashes + rendered PNGs).
- **AC3:** `sitemap.xml` contains exactly the indexable routes with absolute URLs from `SITE_URL`; `robots.txt` allows them, disallows `/dev/`, and references the sitemap; neither mentions any dev or fixture route.
- **AC4:** JSON-LD on `/` validates as `Person` and on the project route as `SoftwareApplication` (schema.org validator or an equivalent local check), every URL matches the canonical, and every field traces to canonical content — zero hand-written facts.
- **AC5:** no host is hardcoded: a production build's HTML contains only URLs built from `SITE_URL`; a test fails if `localhost`, a `*.vercel.app` preview host, or any other origin appears in og/canonical/JSON-LD output when `SITE_URL` is the production domain.
- **AC6:** zero client-side cost: no new client JS (bundle comparison before/after), home weight still < 3 MB, mobile Lighthouse ≥ 95 perf/≥ 95 a11y on `/` and the project route, CLS 0; existing axe gate green.
- **AC7:** full CI green plus the new `seo: meta + og` job; frozen-surface checks (S2–S8) remain empty — **no exceptions this slice**; `icon.svg`, `apple-touch-icon.png` and `theme-color` present on every route.

### Starting point (checked on this branch at `3ba4c3b`)

- `app/layout.tsx` sets `title { default: SITE.meta.title, template: '%s · ' + SITE.meta.siteName }` and `description`. It has no `metadataBase`, `icons` or `viewport`.
- `(site)/projects/page.tsx` exports static `metadata` (title + site description). `(site)/projects/[slug]/page.tsx` has `generateMetadata` (name + tagline). The home page and `not-found.tsx` have no metadata of their own.
- `apps/web/test/site-metadata.test.ts` (S10) asserts those three metadata objects with `toEqual`, so it is updated together with D3. It is an S10 test, not a frozen surface.
- There is no `apps/web/public/` directory (S10 T012b removed `resume.pdf`).
- `content/poster.ts` (S10 app code) has `posterGeometry(project, 'exploded')`, an isometric projection of the real `layoutProject` slabs. It uses only the public `xploder/layout` export.
- `xploder` public exports: `.` (schema/parse), `./theme` (`blueprint.light|dark`, `paletteCss`, `techColor`), `./layout`, `./motion`, `./react`. The title-block helpers (`overlay/titleBlock.ts`) and `look` tokens are **not** exported, and `packages/xploder/package.json` + `src/index.ts` are frozen (S2 manifest).
- Guard tests that new code must respect: `no-color-literals`, `no-motion-literals`, `no-hand-copied-content`, `prod-imports`, `fixture-exclusion`. The last one reads every file in `out/` as UTF-8 and rejects the substrings `dev/engine` and `fps-calibration`. `Disallow: /dev/` does not contain either.

### Environment facts checked 2026-11-02

- **Production baseline** (`evidence/RFC-log-baseline.txt`): all three routes have only `title` + `description` + `color-scheme`. There are 0 og/twitter/canonical/JSON-LD/icon/theme-color tags. `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/icon.svg` and `/apple-touch-icon.png` all return 404.
- **Spike** (`evidence/RFC-log-spike.txt`, a throwaway app deleted after the run, Next 16.4.3 / Node 24.19.0): under `output: 'export'`, `force-static` route handlers emit `out/og/home.png`, a nested `out/og/projects/x.png` (catch-all + `generateStaticParams`), `out/icon.svg` and `out/apple-touch-icon.png`. `app/sitemap.ts` and `app/robots.ts` emit `out/sitemap.xml` and `out/robots.txt`. `metadataBase` makes `og:image` absolute, and folders named `icon.svg` / `apple-touch-icon.png` do not collide with Next's metadata file conventions.
- **Renderer:** Next 16.4.3 ships `next/og` (`ImageResponse`). It bundles satori and `resvg.wasm` (plus Geist-Regular, OFL) under `next/dist/compiled/@vercel/og`, so no new renderer dependency is needed. Registry facts if the fallback is needed: `satori` 0.63.2 (MPL-2.0) and `@resvg/resvg-wasm` 2.6.2 (MPL-2.0).

---

## 2. Technical decisions

### D1 — Module layout (all new; Deliverables 1–6)

```
apps/web/seo/                     # new metadata/OG/sitemap layer, server-only, no product strings
  site-url.ts                     # resolveSiteUrl(env) + absoluteUrl(path)            (D2)
  routes.ts                       # SeoRoute registry derived from content             (D3)
  metadata.ts                     # routeMetadata(route) → Next Metadata  ← the ONE function (D3)
  json-ld.ts                      # personLd(), softwareApplicationLd(project)         (D7)
  og/card-model.ts                # route → card model (text, layer rows, silhouette)  (D5)
  og/card.tsx                     # card model → satori element tree (tokens only)     (D5)
  og/render.ts                    # element tree → PNG via next/og ImageResponse       (D4)
  og/fonts/                       # vendored OFL fonts + OFL.txt                       (D4)
  icon.ts                         # icon SVG string from tokens + title-block motif    (D8)
apps/web/components/json-ld.tsx   # <script type="application/ld+json"> server component
apps/web/app/og/[...card]/route.ts            # force-static PNG cards
apps/web/app/icon.svg/route.ts                # force-static SVG
apps/web/app/apple-touch-icon.png/route.ts    # force-static PNG 180×180
apps/web/app/sitemap.ts · apps/web/app/robots.ts
tools/perf/src/seo-probe.ts + cli/seo-probe.ts  # verification (D9), root script `seo:probe`
```

Existing files touched (app level only, no frozen surface): `app/layout.tsx` (base metadata + `viewport`), the three `(site)` pages and `not-found.tsx` (each calls `routeMetadata`; home and project pages render `<JsonLd>`), `test/site-metadata.test.ts`, `.github/workflows/ci.yml` (new job), root/web/perf `package.json` (scripts, plus one perf devDep, D9). `seo/` is added to the source scanners' roots (`no-color-literals`, `no-hand-copied-content`, `prod-imports`) so it gets the same guards as `app/`, `components/` and `content/`.

### D2 — `SITE_URL` strategy (Deliverable 2, AC5)

`resolveSiteUrl(env)` is pure and unit-tested. It is read only on the server at build time, and **never** as `NEXT_PUBLIC_*`, so it can never reach client JS. First match wins:

| # | Condition | Origin | Where it applies |
|---|---|---|---|
| 1 | `SITE_URL` set | its value, normalized to an origin (no path, no trailing slash, `https:` required unless the host is `localhost`) | S16: Murphy sets `https://hi-murphy.me` (one env value). CI `seo` job. |
| 2 | `VERCEL_ENV=production` | `https://$VERCEL_PROJECT_PRODUCTION_URL` | Production today → `portfolio-teardown.vercel.app`. A Vercel system variable, so no project change is needed (Q3). |
| 3 | `VERCEL_ENV=preview` / `development` | `https://$VERCEL_URL` (the deploy URL, as the brief specifies) | PR previews |
| 4 | not on Vercel | `http://localhost:3000`, with a one-line build warning | local `pnpm build`, the CI `build` / `a11y-site` jobs (never deployed) |

**Guards** (the build fails loudly rather than leaking): if `VERCEL=1` and the result is localhost (for example because system env exposure is off), or if `VERCEL_ENV=production` and the result equals `https://$VERCEL_URL`, the build throws. `absoluteUrl(path)` is the only constructor of absolute self-URLs. It feeds `metadataBase`, canonical, `og:url`, sitemap, robots and JSON-LD, so every one of them prints the identical string. Canonical paths have no trailing slash, except the home URL `"<origin>/"`.

### D3 — Route registry and the one metadata function (Deliverable 1, AC1)

`seo/routes.ts` derives `SeoRoute = { kind: 'home' | 'projects' | 'project' | 'not-found', path, ogImagePath, project? }` from `SITE` + `PROJECTS`. The registry, `INDEXABLE_ROUTES` = home, projects and one entry per `PROJECT_SLUGS`, is the single source for metadata, OG `generateStaticParams`, the sitemap and the probe's route list. Adding a project to content adds its card, sitemap entry and metadata automatically, with no code change. Dev and fixture routes are not representable in the registry.

`routeMetadata(route): Metadata` is the only metadata producer. Field derivation (every string comes from `SITE`/project content; the code holds only composition):

| Field | `/` | `/projects` | `/projects/[slug]` | 404 |
|---|---|---|---|---|
| `<title>` (absolute) | `meta.title` | `projects.title · meta.siteName` | `project.meta.name · meta.siteName` | `meta.title` (inherited) |
| description | `meta.description` | `meta.description` | `project.meta.tagline`, else `summary`, else `meta.description` | `meta.description` |
| canonical, `og:url` | `absoluteUrl('/')` | `absoluteUrl('/projects')` | `absoluteUrl('/projects/<slug>')` | **none** |
| `og:title` / `twitter:title` | = `<title>` | = `<title>` | = `<title>` | = `<title>` |
| `og:description` / `twitter:description` | = description | = description | = description | = description |
| `og:image` / `twitter:image` | `/og/home.png` | `/og/projects.png` | `/og/projects/<slug>.png` | `/og/home.png` |
| `og:image:width/height/type/alt` | 1200 / 630 / `image/png` / = `<title>` | same | same | same |
| `og:type` · `og:site_name` · `og:locale` | `website` · `meta.siteName` · `meta.locale` | same | same | same |
| `twitter:card` | `summary_large_image` | same | same | same |

The root layout exports the **404-safe base**: `metadataBase`, the title template, description, `og:*` with the home card, `twitter:*`, icons, and no canonical or `og:url`, so a route that forgot to override can never claim another URL. It also exports `viewport.themeColor` (D8). Pages override with `routeMetadata(...)`. Next already emits `robots: noindex` on the not-found page. `og:title` deliberately equals `<title>`, so the probe can assert one invariant instead of two formats. The titles keep S10's existing visible strings (`Projects · Timur Haryo`, `Scarlet Inspector · Timur Haryo`).

### D4 — OG image pipeline (Deliverable 3, AC2, AC6)

- **Renderer: `next/og` `ImageResponse` inside `force-static` route handlers.** The output path is satori (element tree → SVG, with text converted to paths using our fonts) → resvg **wasm** → PNG. There are no new renderer dependencies. Wasm gives the same bytes on macOS arm64, CI x64 and Vercel. The route handler runs only in `next build` (and in `next dev`, which is never deployed). The export holds plain files. There is no runtime function, headless browser or external service. Alternative (Q4): direct pinned `satori` + `@resvg/resvg-wasm`.
- **Output paths:** `out/og/home.png`, `out/og/projects.png`, `out/og/projects/<slug>.png` from `app/og/[...card]/route.ts`. `generateStaticParams` comes from `INDEXABLE_ROUTES`, with `dynamicParams = false`. The `.png` extension gives Vercel the right content type. There is no cache-busting query (crawler caches are refreshed through the platforms' inspectors; S16 changes the origin anyway).
- **Fonts (Q5):** IBM Plex Sans SemiBold (titles) and IBM Plex Mono Regular (title-block rows, eyebrow), **SIL OFL 1.1**. They are vendored as TTF in `apps/web/seo/og/fonts/` from the official IBM Plex GitHub release, next to `OFL.txt`. The release tag, source URL and SHA-256 of each file go into `plan.md` and the T-evidence. They are read with `fs.readFile` at build time, so they are never imported by app code or emitted to `out/` (the D11 test asserts no `.ttf`/`.woff*` and no new `@font-face` in `out/`).
- **Token access:** colours come only from `blueprint.light` via `import { blueprint } from 'xploder/theme'`, by role (`paper`, `surface`, `grid`, `line`, `lineMuted`, `ink`, `label`, `accent`, `steel`). Because `look.titleBlock` is not exported and the export map is frozen (F3), the card's title-block role mapping is **mirrored** in app code (title = `ink`, meta = `steel`, rows = `label`, border = `line`, fill = `paper`), with a comment pointing to `look/tokens.ts`. Role names are not colour literals. `no-color-literals` scans `seo/`. A unit test walks the element tree and asserts that every colour value is a `blueprint.light` value.
- **Determinism method:** the inputs are content, tokens, font bytes and the Next version, with no time, randomness, environment or host. The cards **contain no URL text**, so `SITE_URL` cannot change their bytes. Proofs: (a) a unit test renders each card twice in-process and compares SHA-256; (b) the CI `seo` job runs two full `pnpm build`s with `apps/web/.next` and `out` **deleted in between** (so no build cache can fake equality) and compares the SHA-256 manifests; (c) bonus evidence compares the local (arm64) and CI (x64) hashes.
- **Size:** flat line art at 1200×630 should land at about 30–90 KB, well under the ≤ 300 KB budget. The probe asserts the budget, so no quantizer is planned.
- **Build wiring:** none beyond `next build`. Vercel's existing `pnpm build` produces the cards, and no prebuild script or loader is needed.

### D5 — Card composition (AC2)

Canvas 1200×630, light palette: `paper` ground, a `grid` drafting grid at a fixed pitch, and a `line` sheet border with an inset. The left column (about 52%) holds the text. The right column (about 48%) holds the **layer silhouette**. The **title-block motif** is a bordered `paper` box in the bottom-right corner.

| Card | Eyebrow (mono, `label`) | Title (sans 600, `ink`) | Sub (`label`) | Silhouette | Title block (title / meta / rows) |
|---|---|---|---|---|---|
| `/` | `hero.eyebrow` | `meta.siteName` | `hero.headline` | hero project (`PROJECTS[0]`) | `meta.siteName` / `identity.role` / `NN <project name>` per project |
| `/projects` | `meta.siteName` | `projects.title` | project names, joined with ` · ` | one small stack per project, side by side | `projects.title` / project count `NN` / `NN <project name>` |
| `/projects/<slug>` | `meta.siteName` | `project.meta.name` | `project.meta.tagline` | that project | `meta.name` / `meta.year` / `NN <layer name>` per layer |

- **Silhouette** = `posterGeometry(project, 'exploded')` (the same isometric projection as the on-site poster), filtered to `kind === 'layer'`. That gives exactly `project.layers.length` slabs, drawn with a `surface` top face, `paper` sides, a `line` stroke, and the top slab outlined in `accent`. Components are omitted, because they are unreadable at preview thumbnail sizes (Q11). It is drawn as an inline SVG image inside the satori tree.
- **Overflow:** titles clamp at 2 lines and subs at 2 lines, with an ellipsis. Title-block rows are capped at 6, then `+N`. Layer numbering uses the same 2-digit `NN` format as the site's title block.
- **Strings:** only content fields, numbers and separators (` · `, `+`). There are no product words in code (`no-hand-copied-content` covers `seo/`).

### D6 — Sitemap and robots (Deliverable 4, AC3)

- `app/sitemap.ts` (`force-static`) → `out/sitemap.xml`: one `<url><loc>` per `INDEXABLE_ROUTES` entry, from `absoluteUrl`. There is no `lastmod`, because inventing dates is ruled out and build time would break byte stability. There is no `priority`/`changefreq`.
- `app/robots.ts` (`force-static`) → `out/robots.txt`: `User-Agent: *`, `Allow: /`, `Disallow: /dev/`, `Sitemap: <origin>/sitemap.xml`. The fixture route stays unmentioned, as AC3 requires. It is already absent from the production export (S3 exclusion), so it 404s.
- Vercel already sends `X-Robots-Tag: noindex` on preview deployments, so previews stay unindexed with no code.

### D7 — JSON-LD mapping (Deliverable 5, AC4)

The JSON-LD is rendered by the `<JsonLd>` server component as `<script type="application/ld+json">`, with `<` escaped as `\u003c`. It is not executable JS and not a client component.

**`/` → `Person`**

| Property | Source |
|---|---|
| `@context` / `@type` | `https://schema.org` / `Person` |
| `name` | `identity.name` |
| `jobTitle` | `identity.role` (schema.org's property for the brief's "role") |
| `url` | `absoluteUrl('/')` (= canonical) |
| `sameAs` | `identity.links[].url` where non-null, in content order |

**`/projects/<slug>` → `["SoftwareApplication", "SoftwareSourceCode"]`** (F6, Q9)

| Property | Source |
|---|---|
| `name` | `project.meta.name` |
| `description` | `project.meta.summary`, else `tagline` (Q8) |
| `url` | `absoluteUrl('/projects/<slug>')` (= canonical) |
| `author` | `{ "@type": "Person", "name": identity.name, "url": absoluteUrl('/') }` |
| `codeRepository` | `project.meta.links` entry labelled `Source` (omitted if absent) |

Deliberately **omitted** because no canonical field backs them: `applicationCategory`, `operatingSystem`, `offers`, `datePublished`, `image`, `email`, `alternateName`. Google's SoftwareApplication rich result needs `offers`/rating, so the route won't get a rich result. That is accepted, because AC4 asks for schema validity with zero invented facts.

**Validation (Q10):** (1) types come from `schema-dts` (Apache-2.0, a compile-time devDep) so a misspelled property fails `typecheck`; (2) a **local vocabulary check** in the probe uses a committed subset of the schema.org vocabulary (the types used, their supertypes, and the properties used with `domainIncludes`/`rangeIncludes`), extracted from a pinned schema.org release with the version recorded. Every `@type` must exist, and every property must be valid for the type or one of its supertypes; (3) **trace check**: every leaf value equals a content field or `absoluteUrl(...)`, asserted by recomputing from content; (4) a one-off run on validator.schema.org against the deployed preview/production HTML, committed as evidence.

### D8 — Icon set and theme-color (Deliverable 6, AC7)

- **`/icon.svg`** (`app/icon.svg/route.ts`, `force-static`, from `seo/icon.ts`): a 32-unit square sheet in `paper` with a `line` border. The title-block motif sits in the lower half: a full-width title cell filled with `accent` over two meta cells, and 2 `lineMuted` row rules above. The SVG carries an `@media (prefers-color-scheme: dark)` block with `blueprint.dark` values, so both palettes come from tokens.
- **`/apple-touch-icon.png`**: 180×180, the same motif in the light palette with an opaque `paper` ground (iOS needs one), rendered through the same `ImageResponse` path as the cards.
- **Links:** the root layout sets `icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: '/apple-touch-icon.png' }`, so they appear on every route including 404. No `favicon.ico` is added (not in the brief). Legacy `/favicon.ico` requests keep returning 404, as they do today.
- **theme-color:** `viewport.themeColor = [{ media: '(prefers-color-scheme: light)', color: blueprint.light.paper }, { media: '(prefers-color-scheme: dark)', color: blueprint.dark.paper }]`. A manual theme toggle won't retint the browser chrome, because that would need new client JS (Q13).

### D9 — Verification: `pnpm seo:probe` (Deliverable 7)

`tools/perf/src/cli/seo-probe.ts --out-dir apps/web/out --site-url <origin> [--compare <hashes.json>] [--out <evidence dir>]` reads the built files, needs no browser, and follows the S3 exit-code contract (0 pass · 1 internal · 2 usage · 6 assertion failed). It writes `seo-probe.json` plus a human summary.

1. **Meta probe (AC1, AC7):** parses each `out/**/*.html` with `jsdom` (a new perf devDep). For the three AC1 routes it asserts every tag in the D3 table, with exact expected values recomputed from the content modules: present, non-empty, in `<head>`, and `og:image`/`og:url`/`twitter:image`/canonical absolute. For **every** HTML route, including 404, it asserts the icon/apple links and both `theme-color` metas.
2. **Link-preview parser check:** `open-graph-scraper` (MIT, perf devDep) parses the same HTML strings (`html` option, no fetch). The probe asserts that the unfurler sees title, description, image URL, image dimensions and the large-image card for each AC1 route.
3. **Card checks (AC2):** for each `INDEXABLE_ROUTES` entry it checks that the PNG exists, the signature and IHDR say exactly 1200×630, the size is ≤ 300 KB, and records SHA-256. With `--compare`, it asserts identical hashes. The `og:image` of each route must resolve to a file that exists in `out/`.
4. **Sitemap/robots (AC3):** the `<loc>` set equals the `INDEXABLE_ROUTES` absolute URLs exactly. robots has `Allow: /`, `Disallow: /dev/` and `Sitemap: <origin>/sitemap.xml`. Neither file matches `/dev/engine`, `fixtures` or `fps-calibration`.
5. **JSON-LD (AC4):** D7 checks (2) and (3). `url`/`author.url` must equal the page canonical.
6. **Host-leak test (AC5):** collects every URL in canonical, `og:*`, `twitter:*`, `link[rel=icon|apple-touch-icon]` and JSON-LD. Every **self-URL** must have origin === `--site-url` (an allowlist, which catches *any* other origin). It also blacklists `localhost`, `127.0.0.1` and `*.vercel.app` explicitly when the site URL is not itself `*.vercel.app`. Content-sourced external links (`sameAs`, `codeRepository`) must equal their content values verbatim (Q1).

Unit tests (vitest, in the CI `build` job's `pnpm test`) cover `resolveSiteUrl` (the D2 matrix including the guards), `routeMetadata` per route, the JSON-LD mappers, the card model (text = content, silhouette slab count = `layers.length`, colours ⊂ `blueprint.light`), and an in-process double render.

### D10 — CI job `seo: meta + og` (Deliverable 8, AC proof map)

New job in `ci.yml`, runs on `pull_request` and `push: main`, no preview needed, `SITE_URL=https://hi-murphy.me` (Q2):

```
install → pnpm build → seo:probe (writes hashes-1.json)
        → rm -rf apps/web/.next apps/web/out → pnpm build → seo:probe --compare hashes-1.json
        → upload .evidence/ci/seo (probe JSON, hash manifests, the PNGs)
```

| AC | Proven by |
|---|---|
| AC1 | probe step 1 + step 2 on `/`, `/projects`, `/projects/websocket-inspector` |
| AC2 | probe step 3 (dims, size, `--compare` hashes) + card-model/colour unit tests + committed PNGs reviewed at G2 |
| AC3 | probe step 4 |
| AC4 | `schema-dts` typecheck + probe step 5 + one-off validator.schema.org evidence |
| AC5 | probe step 6 with `SITE_URL` = the production domain + `resolveSiteUrl` unit matrix |
| AC6 | existing perf jobs (Lighthouse perf+a11y on both routes, weight, CLS) + axe job + D11 bundle diff evidence |
| AC7 | all jobs green incl. this one + frozen-surface test + `guards.sh` + probe step 1 icon/theme-color on every route |

Branch protection: the agent proposes `seo: meta + og` for the required set, and Murphy adds it (Q14). The existing jobs are left byte-identical except that the `build` job's `pnpm test` now includes the new unit tests.

### D11 — Zero client cost (AC6)

- New code is server-only: `seo/` is imported only by route handlers, metadata exports and server components. A test asserts that no file under `seo/` has `'use client'` and that no client component imports `seo/`.
- **Bundle comparison:** `pnpm build` on `3ba4c3b` and on the branch head, comparing every `out/_next/static/**/*.js` (path, bytes, SHA-256) and each route's `<script src>` list. **Pass:** no new JS file and no route gains a script, with zero byte delta. If Next renumbers modules, any diff in an existing chunk gets a module-level breakdown in the evidence. The HTML grows by the head tags plus JSON-LD (about 2–3 KB), and that is reported, not hidden.
- Fonts: the test asserts no `.ttf`/`.woff*` in `out/` and no `@font-face` added to the CSS.
- Lighthouse perf/a11y (median of 3) and weight on `/` and the project route, before vs after. Weight gains one `icon.svg` request (< 1 KB). The Lighthouse SEO category is recorded as extra evidence and not gated (Q15).

### D12 — Frozen surfaces and guards (AC7)

`.specify/features/og-seo/guards.sh` (S10 pattern), one line per guard:
- `FROZEN-OK`: no diff vs `3ba4c3b` in `.specify/slices`, `.specify/KICKOFF-S11.md`, `.specify/content`.
- `XPLODER-OK`: `git diff --quiet 53a1f2e -- packages/xploder`, meaning **zero** xploder changes (stricter than the per-slice manifests).
- `SURFACE-S2S4/S5/S6/S7/S8-OK`: the existing manifest path lists against their seal commits, plus the frozen-surface vitest.
- `DEV-ROUTES-OK`: `apps/web/app/dev`, `apps/web/app/fixtures` and `apps/web/test/xploder-dom` unchanged. `S8-TOOLS-OK`: the S8 perf tools unchanged.

---

## 3. Design brief for the spec kit (Stage 2 input)

- **FRs:** FR1–FR7 map 1:1 to AC1–AC7, with no extra criteria. Deliverables 1–8 are traced as sub-requirements under the AC they serve.
- **Plan:** the D1 layout. One seam per task: site-url → routes + metadata → OG render → cards → sitemap/robots → JSON-LD → icons/theme-color → probe → CI job → evidence.
- **Test harness:** vitest units in `apps/web/test/` (pure functions + render determinism), `seo:probe` against `out/`, and `guards.sh`.

## 4. Implementation checklist (task sketch, refined in Stage 2)

1. **T1 — Renderer spike in-repo:** `ImageResponse` in a `force-static` catch-all route with vendored Plex fonts. Double build, hash-equal, ≤ 300 KB. Decides D4 vs the Q4 fallback before anything depends on it.
2. **T2 — `seo/site-url.ts`** + unit matrix (D2).
3. **T3 — `seo/routes.ts` + `seo/metadata.ts`**, wired into the layout, the three pages and 404, with `site-metadata.test.ts` updated (D3).
4. **T4 — Card model + card tree + `app/og/[...card]`** (D4, D5), with the colour/text/silhouette unit tests and rendered PNGs as evidence.
5. **T5 — `sitemap.ts` + `robots.ts`** (D6).
6. **T6 — `seo/json-ld.ts` + `<JsonLd>`** on home and project, with `schema-dts` (D7).
7. **T7 — `icon.svg` + `apple-touch-icon.png` + `viewport.themeColor`** (D8).
8. **T8 — `seo:probe`** (D9 steps 1–6) + the vocabulary subset fixture.
9. **T9 — CI job `seo: meta + og`** (D10), plus a regression proof that a deliberately relative `og:image` on a throwaway commit makes the job go red.
10. **T10 — Evidence pass:** bundle diff, Lighthouse/weight before/after, validator.schema.org, guards, and the self-check table.

## 5. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | `next/og`'s wasm or font loading misbehaves inside a Turbopack-bundled static route handler, or `ImageResponse` doesn't import cleanly under vitest | T1 spike first. Fallback (Q4): direct `satori` + `@resvg/resvg-wasm` with explicit wasm init. In the worst case the in-process unit test is dropped and the CI double build stays as the AC2 proof. |
| R2 | A false "deterministic" result from build caches | delete `.next` + `out` between the two CI builds; also compare local vs CI hashes |
| R3 | Vercel system env exposure is disabled → no `VERCEL_*` vars | the D2 guard fails the production build loudly instead of shipping localhost |
| R4 | The AC4/AC5 wording ("every URL matches the canonical", "any other origin") read literally excludes the `sameAs`/`codeRepository` links that Deliverable 5 requires | Q1: interpret as self-URLs, with external links traced verbatim to content. Raised for Murphy's explicit confirmation, not decided silently. |
| R5 | `codeRepository` is not in `SoftwareApplication`'s domain → validator error | multi-type with `SoftwareSourceCode` (F6) |
| R6 | Social crawlers cache images (LinkedIn about 7 days) | refresh with the platform inspectors after the first deploy, and again at S16 when the origin changes |
| R7 | Vercel preview protection blocks unfurlers and the online validator on preview URLs | run the share-preview check on production after merge, or locally via `serve:out`; the probe is file-based |
| R8 | Next 16 may stream metadata into `<body>` for some user agents | the static export resolves metadata into `<head>` (production baseline); the probe asserts the tags are in `<head>` |
| R9 | Exact-match tests in `site-metadata.test.ts` | updated in T3 (S10 test, not frozen) |
| R10 | Vendored font binaries in git | small TTFs plus OFL licence; gitleaks ignores binaries; SHA-256 recorded |
| R11 | A long future title overflows the card | line clamps + row cap (D5); probe size check |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (facts, no decision needed):**
- **F1:** static route handlers, sitemap and robots all export cleanly under Next 16.4.3 `output: 'export'` (`evidence/RFC-log-spike.txt`).
- **F2:** `next/og` already bundles satori + `resvg.wasm`, so the renderer adds zero dependencies.
- **F3:** the title-block helpers and `look` tokens are not public exports, and the export map is frozen. The card mirrors the role mapping in app code from public palette tokens (D4).
- **F4:** production today has no og/twitter/canonical/JSON-LD/icons/theme-color, and robots/sitemap/favicon all 404 (`evidence/RFC-log-baseline.txt`).
- **F5:** read literally, AC4's "every URL matches the canonical" and AC5's "any other origin" exclude the `sameAs`/`codeRepository` links that Deliverable 5 requires → Q1.
- **F6:** schema.org defines `codeRepository` on `SoftwareSourceCode`, not on `SoftwareApplication` → multi-typing (Q9).
- **F7:** `site.json` `identity.resume` still points to `/resume.pdf`, which S10 T012b removed. S11 does not use it (it is not in JSON-LD). Recorded for Merlin. Content stays untouched.
- **F8:** the usage file is stale (captured 2026-10-29). Current 5h/7d usage is **unknown**, so please check `/usage`.

**Open questions (the default applies unless Murphy says otherwise):**

1. **Q1 — Scope of "every URL" (AC4) and "any other origin" (AC5).** **Default:** the rule applies to **self-referential** URLs (canonical, `og:url`, `og:image`, `twitter:image`, icon links, JSON-LD `url`/`author.url`). These must be built from `SITE_URL` and match the canonical. **External identity links** from content (`sameAs` = the `identity.links` URLs; the project `codeRepository`) are allowed because they equal a canonical content value verbatim. Without this reading, Deliverable 5 can't be met. *Please confirm explicitly: this is an interpretation of AC text, not a relaxation, and if you reject it, it becomes a brief revision.*
2. **Q2 — `SITE_URL` for the AC5 test.** **Default: `https://hi-murphy.me`** (the brief's production value), so any `*.vercel.app` leak is detectable. Using the domain in a test needs no DNS change.
3. **Q3 — Production origin before S16.** **Default: the Vercel system variable `VERCEL_PROJECT_PRODUCTION_URL`** (→ `portfolio-teardown.vercel.app`). The agent sets no Vercel env value, and S16 sets `SITE_URL`.
4. **Q4 — Renderer.** **Default: `next/og` `ImageResponse` in static route handlers** (zero new deps). Fallback if T1 fails: pinned `satori` 0.63.2 + `@resvg/resvg-wasm` 2.6.2.
5. **Q5 — Card fonts.** **Default: IBM Plex Sans SemiBold + IBM Plex Mono Regular (OFL 1.1), vendored TTF.** Alternatives: Inter + JetBrains Mono (both OFL), or Geist (bundled in next/og, Regular only). The site itself uses system fonts, so there is nothing to match exactly.
6. **Q6 — `og:locale`.** **Default: emit `meta.locale` verbatim (`en`).** The OG format prefers `en_US`, but deriving a territory would invent data. If you want `en_US`, Merlin changes `site.json`, which the agent may not edit.
7. **Q7 — `og:type`.** **Default: `website` on every route.** `profile` (needs first/last name split) and `article` (needs dates) would need invented fields.
8. **Q8 — Descriptions.** **Default:** the project's meta/og description = `tagline` (as S10 does today), and JSON-LD `description` = `summary` (fuller). `/projects` reuses `meta.description`, because content has no projects-page description.
9. **Q9 — Project JSON-LD type.** **Default: `["SoftwareApplication", "SoftwareSourceCode"]`**, with `codeRepository` taken from the link labelled `Source`.
10. **Q10 — JSON-LD validation.** **Default:** `schema-dts` + a local vocabulary check in CI (the "equivalent local check"), plus **one** orchestrator submission of the rendered public JSON-LD to validator.schema.org as evidence. Say "local only" if you don't want any external submission.
11. **Q11 — Silhouette detail.** **Default: layer slabs only** (count = `layers.length`), with components omitted for thumbnail legibility.
12. **Q12 — Card copy.** **Default: the D5 table**, with no URL or host text on any card.
13. **Q13 — theme-color under a manual toggle.** **Default: the media-query pair only.** A manual toggle doesn't retint the browser chrome, because a fix would mean new client JS.
14. **Q14 — Required checks.** **Default:** the agent proposes `seo: meta + og`, and Murphy adds it to branch protection after merge.
15. **Q15 — Lighthouse SEO category.** **Default: recorded as evidence, not gated.**

---

## 7. Evidence map (Stage 3 end-contract)

| AC | Artifacts (in `.specify/features/og-seo/evidence/`) |
|---|---|
| AC1 | `T0xx-log-seo-probe.txt` (tag table per route) · `T0xx-log-link-preview.json` · rendered `<head>` excerpts |
| AC2 | `T0xx-og-{home,projects,websocket-inspector}.png` · `T0xx-log-og-hashes.txt` (size + SHA-256, build 1 vs build 2, local vs CI) · card-model unit test log |
| AC3 | `T0xx-log-sitemap.xml` · `T0xx-log-robots.txt` · probe step 4 output |
| AC4 | probe step 5 output · `schema-dts` typecheck log · `T0xx-log-schema-validator.json` |
| AC5 | probe step 6 output with `SITE_URL=https://hi-murphy.me` · `resolveSiteUrl` unit log |
| AC6 | `T0xx-log-bundle-diff.txt` · `T0xx-lighthouse-summary-{home,project}.json` (before/after, median of 3) · `T0xx-weight-{home,project}.json` · axe CI excerpt |
| AC7 | CI run URLs (all jobs incl. `seo: meta + og`) · `T0xx-ci-regression-proof.txt` · `T0xx-log-guards.txt` |

---

## 8. Stage-1 hand-off

**WHAT MURPHY SHOULD TEST/VALIDATE**
1. Q1, the AC4/AC5 URL-scope reading (§6). This is the one item that needs an explicit yes or no. Default: approve the self-URL/content-traced reading.
2. The `SITE_URL` resolution table and guards (D2), especially that production uses Vercel's system variable until S16. Default: approve.
3. The card composition (D5) and font choice (Q5). You review the three PNGs at G2. Default: approve.
4. The JSON-LD field maps (D7): every field traces to `site.json` / `websocket-inspector.json`. Default: approve.
5. Open questions Q2–Q15. Default: every default applies.

**WHAT THE AGENT NEEDS FROM MURPHY**
1. Q1 confirmation (default: the self-URL reading; if rejected, it is escalated as a brief revision).
2. OK to submit the public JSON-LD once to validator.schema.org (Q10). Default: yes.
3. After merge, add `seo: meta + og` to the required checks (Q14). Default: the agent proposes it and makes no protection change itself.
4. Current Claude usage from `/usage` (the usage file is stale, F8). Default: proceed and report usage as unknown.
5. Gate 1 verdict: `approved` (with any Q overrides) or feedback. Default: none; the orchestrator waits.

---

## 9. Gate log

1. **Gate 1 (Murphy, 2026-11-02, 5h 84%):** "approved all defaults". Every §6 default applies (Q1–Q15). Answers to §8:
   1. **Q1:** the self-URL / content-traced reading of AC4 "every URL" and AC5 "any other origin" is **confirmed** (D9 step 6, D7). No brief revision.
   2. **Q10:** one validator.schema.org submission of the public JSON-LD is allowed.
   3. **Q14:** the agent proposes `seo: meta + og` for the required set; Murphy changes branch protection.
   4. **Usage:** 5h 84% at Gate 1 (the usage file is stale, F8). Stage 3 pacing: no new task starts at ≥ 85% (tasks.md).
2. **Stage 3 refinements (orchestrator, recorded per the Gate 1 pre-approval of improvements):**
   1. **R1 (T004):** Next 16 renders the home canonical and `og:url` as the bare origin (`https://hi-murphy.me`, no trailing slash). `absoluteUrl('/')` now returns the bare origin, so canonical, `og:url`, sitemap and JSON-LD print identical strings. This supersedes the D2 note "except the home URL `<origin>/`".
   2. **R2 (T001):** `bundle-manifest` replaces the random `_next/static/<buildId>/` segment with `<build-id>`, so base and head manifests from different local builds compare like-for-like.
   3. **R3 (T011 → T011a, AC6 fix):** the T011 bundle diff failed (+1 251 B client JS). Any `next/og` import inside the Next module graph makes Turbopack add its async-module helper to the shared browser runtime (+1 225 B on every route), and the `/og/[...card]` route added +26 B to `_ssgManifest.js` (bisect: `evidence/T011-log-bundle-finding.txt`). The OG PNGs and `apple-touch-icon.png` are now rendered by `apps/web/scripts/build-og.ts` (`tsx`, same `renderPng`, same bytes) into git-ignored `public/` before `next build`. D4's "route handler" wiring is superseded. The URLs, renderer, fonts, determinism and the CI job are unchanged, and `icon.svg` stays a static route (no `next/og`). Result: total client JS delta 0 B and the base runtime chunk is restored byte-for-byte. One same-size chunk keeps a renumbered module id (8 bytes, identical code), documented in T011.

