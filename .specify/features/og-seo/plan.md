# Implementation Plan: S11 OG Cards & SEO

**Feature dir:** `.specify/features/og-seo/` · **Branch:** `task/s11-og-seo` · **Date:** 2026-11-02 · **Inputs:** `spec.md`, `rfc.md` (approved; §9 Gate 1: all defaults, Q1 confirmed)

## Summary

A new **server-only metadata layer** (`apps/web/seo/`) derives everything from the existing content modules. It provides one `SITE_URL` resolver, one route registry and one `routeMetadata()` function, plus JSON-LD mappers, a card model and an icon generator.

`force-static` **route handlers** emit the build-time files into the static export: three-plus OG PNGs (`next/og`, wasm), `icon.svg`, `apple-touch-icon.png`, `sitemap.xml` and `robots.txt`. A file-based **`seo:probe`** in `tools/perf` verifies AC1–AC5 and the AC7 icon/theme-color rule on the built `out/`. A new CI job **`seo: meta + og`** runs it across two clean builds.

**`packages/xploder` is not touched at all**, and no client component is added or changed.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16.4.3 App Router static export, Node 24 (`.nvmrc`), pnpm 12 |
| Renderer | `next/og` `ImageResponse` (satori + `resvg.wasm` bundled in Next). Fallback (RFC Q4, only if T002 fails): pinned `satori` 0.63.2 + `@resvg/resvg-wasm` 2.6.2 |
| Fonts | IBM Plex Sans SemiBold + IBM Plex Mono Regular, TTF, SIL OFL 1.1, vendored in `apps/web/seo/og/fonts/` with `OFL.txt` and `SOURCE.md` (release tag, asset URL, SHA-256 per file) |
| New deps | `apps/web` devDep `schema-dts` (Apache-2.0, types only). `tools/perf` devDeps `jsdom`, `open-graph-scraper` (MIT). No runtime dependency is added to the page |
| Tests | vitest (Node) in `apps/web/test/` and `tools/perf/test/`; `seo:probe` against `apps/web/out`; `guards.sh` |
| Targets | AC1–AC7 verbatim; cards exactly 1200×630, ≤ 307 200 bytes; hash-equal across clean builds; Lighthouse/weight budgets from `tools/perf/src/budgets.ts` (unchanged) |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; **all of `packages/xploder/**`**; the S2–S8 manifests; `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`; the S8 perf tools; the existing CI jobs (byte-identical) |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. SRs map to Deliverables 1–8. Non-goals respected: no redesign, routes, analytics, i18n, DNS/Vercel changes, runtime OG or engine changes. |
| II. Static-only | Route handlers are `force-static` with `dynamicParams = false`, so they emit plain files. No server runtime, API or DB. |
| III. Performance is a feature | No client JS, no page fonts. Head tags + JSON-LD only. A bundle diff proves it (T011). |
| IV. Single motion source | No motion is added. The literal scanners already cover `apps/web` (and are extended to `seo/`). |
| V. Theme integrity | Cards, icons and theme-color use `blueprint.light` / `blueprint.dark` roles from `xploder/theme`. `no-color-literals` covers `seo/`. |
| VI. Evidence over assertion | Every AC has a machine artifact (RFC §7, tasks' Evidence lines). |
| VII. No secrets | Only public URLs. `hi-murphy.me` is a test value. gitleaks in CI. **Lesson from Stage 1:** the `linkedin-client-id` rule false-fires on prose like "LinkedIn … `codeRepository`", so run `gitleaks dir` on new docs before each commit. |

## Project Structure

### Documentation (this feature)

```
.specify/features/og-seo/
  rfc.md · spec.md · plan.md · tasks.md · guards.sh
  evidence/   RFC-log-{baseline,spike}.txt + T<NNN>-* per EVIDENCE.md
```

### Source code (changes only)

```
apps/web/
  seo/                                   NEW, server-only, no 'use client', no product strings
    site-url.ts        resolveSiteUrl(env), absoluteUrl(path), SITE_ORIGIN (resolved once from process.env)
    routes.ts          SeoRoute, INDEXABLE_ROUTES, NOT_FOUND_ROUTE, routeForSlug(slug)
    metadata.ts        routeMetadata(route): Metadata, baseMetadata(): Metadata, SITE_VIEWPORT
    json-ld.ts         personLd(), projectLd(project) (typed with schema-dts)
    icon.ts            iconSvg(): string (both palettes), appleIconElement()
    og/
      card-model.ts    cardModel(route): CardModel
      card.tsx         cardElement(model): ReactElement (satori subset: flex, absolute, inline <svg>)
      render.ts        renderPng(element, { width, height }): Promise<Uint8Array> (ImageResponse → bytes)
      fonts.ts         loadFonts(): Promise<FontOptions[]> (fs.readFile, cached)
      fonts/           IBMPlexSans-SemiBold.ttf, IBMPlexMono-Regular.ttf, OFL.txt, SOURCE.md
  components/json-ld.tsx                 NEW server component <JsonLd data={…}/>
  app/og/[...card]/route.ts              NEW force-static GET → PNG; generateStaticParams from INDEXABLE_ROUTES
  app/icon.svg/route.ts                  NEW force-static GET → image/svg+xml
  app/apple-touch-icon.png/route.ts      NEW force-static GET → image/png 180×180
  app/sitemap.ts · app/robots.ts         NEW force-static
  app/layout.tsx                         EDIT metadata = baseMetadata(); export const viewport = SITE_VIEWPORT
  app/(site)/page.tsx                    EDIT export metadata = routeMetadata(home); render <JsonLd data={personLd()}/>
  app/(site)/projects/page.tsx           EDIT metadata = routeMetadata(projects)
  app/(site)/projects/[slug]/page.tsx    EDIT generateMetadata → routeMetadata(routeForSlug(slug)); <JsonLd data={projectLd(project)}/>
  app/not-found.tsx                      EDIT export metadata = routeMetadata(NOT_FOUND_ROUTE) (if Next rejects it here, the base metadata covers 404; T004 records which)
  test/site-metadata.test.ts             EDIT expectations → routeMetadata outputs
  test/{no-color-literals,no-hand-copied-content,prod-imports}.test.ts   EDIT add seo/ to scanned roots
  test/seo-*.test.ts                     NEW (see Test map)
  package.json                           EDIT devDep schema-dts; script seo:expect
  test/seo-expect.write.test.ts          NEW env-gated expectation writer for the probe
tools/perf/
  src/seo-probe.ts + src/cli/seo-probe.ts            NEW (RFC D9 steps 1–6)
  src/bundle-manifest.ts + src/cli/bundle-manifest.ts NEW (RFC D11)
  src/schema-vocab.json                               NEW committed schema.org subset (version recorded in-file)
  test/seo-probe.test.ts · test/bundle-manifest.test.ts NEW
  package.json                                        EDIT devDeps jsdom, open-graph-scraper
package.json                             EDIT scripts seo:probe, bundle:manifest
.github/workflows/ci.yml                 EDIT append job `seo` (name: 'seo: meta + og'); other jobs untouched
```

## Guards (every task)

`.specify/features/og-seo/guards.sh` (created in T001) prints one line per guard and exits 1 on any failure. The seal bases are the ones S10 left in place.

```sh
git diff --quiet 3ba4c3b -- .specify/slices .specify/KICKOFF-S11.md .specify/content && echo FROZEN-OK
test -z "$(git log --oneline 3ba4c3b..HEAD -- .specify/slices .specify/KICKOFF-S11.md .specify/content)" && echo BRIEF-HISTORY-OK
git diff --quiet 53a1f2e -- packages/xploder && echo XPLODER-OK
git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK
git diff --quiet f65b13c -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) && echo SURFACE-S6-OK
git diff --quiet 5b22987 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s7.paths) && echo SURFACE-S7-OK
git diff --quiet 99a94f2 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s8.paths) && echo SURFACE-S8-OK
git diff --quiet 53a1f2e -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom && echo DEV-ROUTES-OK
git diff --quiet 53a1f2e -- tools/perf/src/a11y-axe.ts tools/perf/src/a11y-probe.ts tools/perf/src/engine-probe.ts tools/perf/src/panel-probe.ts tools/perf/src/presentation-snapshot.ts tools/perf/src/cli/a11y-axe.ts tools/perf/src/cli/a11y-probe.ts tools/perf/src/cli/engine-probe.ts && echo S8-TOOLS-OK
test -z "$(git diff 53a1f2e -- .github/workflows/perf.yml)" && echo PERF-CI-OK
! grep -rqE "^[[:space:]]*['\"]use client['\"]" apps/web/seo 2>/dev/null && echo SEO-SERVER-ONLY-OK
gitleaks git --no-banner --log-opts="53a1f2e..HEAD" . >/dev/null 2>&1 \
  && gitleaks dir --no-banner .specify/features/og-seo >/dev/null 2>&1 && echo GITLEAKS-OK
```

`53a1f2e` = S10 merge on `main` (the base of this branch's code). `3ba4c3b` = the S11 brief freeze.

## Metadata layer (RFC D2, D3; FR1, FR5)

- `resolveSiteUrl(env: Record<string, string | undefined>): string` applies the RFC D2 order and guards. It is pure, never reads `process.env` itself, and throws a `SiteUrlError` with a fix hint. `SITE_ORIGIN = resolveSiteUrl(process.env)` is evaluated once at module load. When rule 4 (local) fires it warns once on stderr.
- `absoluteUrl(path)` requires a leading `/`. It returns `${origin}/` for `/` and `${origin}${path}` otherwise, never with a trailing slash.
- `routeMetadata(route)` returns a full `Metadata` with `title: { absolute }`, `description`, `alternates.canonical` (not for 404), and `openGraph` `{ title, description, url (not for 404), siteName, locale, type: 'website', images: [{ url: route.ogImagePath, width: 1200, height: 630, type: 'image/png', alt: title }] }`. It also returns `twitter` `{ card: 'summary_large_image', title, description, images: [route.ogImagePath] }`. Image paths are relative and resolved by `metadataBase`.
- `baseMetadata()` = `routeMetadata(NOT_FOUND_ROUTE)` + `metadataBase: new URL(SITE_ORIGIN)` + `title.template` (kept for S10 compatibility) + `icons`.
- `SITE_VIEWPORT = { themeColor: [{ media: '(prefers-color-scheme: light)', color: blueprint.light.paper }, { media: '(prefers-color-scheme: dark)', color: blueprint.dark.paper }] }`.
- Value table: RFC D3 (the single source; tests recompute from content, not from copied strings).

## OG pipeline (RFC D4, D5; FR2)

- `app/og/[...card]/route.ts`: `export const dynamic = 'force-static'; export const dynamicParams = false;`. `generateStaticParams()` maps `INDEXABLE_ROUTES` → `{ card: route.ogImagePath.slice('/og/'.length).split('/') }`. `GET` finds the route by joined params, then runs `renderPng(cardElement(cardModel(route)), { width: 1200, height: 630 })` and returns `Response(bytes, { headers: { 'content-type': 'image/png' } })`.
- `ogImagePath`: home `/og/home.png`, projects `/og/projects.png`, project `/og/projects/<slug>.png`, 404 = home.
- `renderPng` wraps `new ImageResponse(element, { width, height, fonts })` and `await res.arrayBuffer()`. No emoji or dynamic font loading: `ImageResponse` gets the vendored fonts only, and any glyph missing from them fails the unit test (a text-presence check of the font coverage of every content string used).
- Card layout constants (grid pitch, insets, font sizes, column split) live in `card.tsx` as named `const`s. They are geometry, not motion or colour. Colours are `blueprint.light[role]` only.
- Silhouette: `posterGeometry(project, 'exploded').slabs.filter(s => s.kind === 'layer')` → an inline `<svg viewBox=…>` with `<polygon>`s (`sideX`/`sideZ` `paper`, `top` `surface`, stroke `line`; the top-most slab stroke is `accent`). The `/projects` card lays out one stack per project, width-divided.
- Title block: a bordered box, bottom-right of the right column. Title row (sans, `ink`) / meta row (mono, `steel`) / up to 6 rows `NN name` (mono, `label`) / `+N`. Border `line`, fill `paper`. The comment cites `packages/xploder/src/look/tokens.ts` `titleBlock` roles (mirrored, F3).

## Sitemap, robots, JSON-LD, icons (RFC D6–D8; FR3, FR4, FR7)

- `app/sitemap.ts` → `INDEXABLE_ROUTES.map(r => ({ url: absoluteUrl(r.path) }))`. `app/robots.ts` → `{ rules: { userAgent: '*', allow: '/', disallow: '/dev/' }, sitemap: absoluteUrl('/sitemap.xml') }`. Both are `force-static`.
- `personLd()` / `projectLd(project)`: the RFC D7 tables, typed `WithContext<Person>` and `WithContext<SoftwareApplication & SoftwareSourceCode>`-compatible via `schema-dts`. `@type` for the project is `['SoftwareApplication', 'SoftwareSourceCode']`. `codeRepository` comes from `project.meta.links.find(l => l.label === 'Source')?.url`.
- `<JsonLd data>` renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />`.
- `iconSvg()`: a 32×32 viewBox. A `<style>` block defines `.p .l .m .a` fills/strokes from `blueprint.light`, plus `@media (prefers-color-scheme: dark)` with `blueprint.dark`. The geometry: sheet + border + title-block cells (RFC D8). The `apple-touch-icon` route renders the same motif (light, opaque) at 180×180 via `renderPng`.

## Tools (`tools/perf`) (RFC D9, D11)

- **`seo-probe`:** `node tools/perf/src/cli/seo-probe.ts --out-dir apps/web/out --site-url <origin> --expect <expect.json> [--compare <hashes.json>] [--out <dir>]`.
  - `expect.json` is written by `apps/web/test/seo-expect.write.test.ts`. It skips unless `SEO_EXPECT_OUT` is set, and is run as `pnpm --filter web seo:expect` (= `SEO_EXPECT_OUT=out-seo-expect.json vitest run test/seo-expect.write.test.ts`). It serializes `INDEXABLE_ROUTES`, `routeMetadata(...)` as flat expected tags, `personLd()` and `projectLd(...)` from the same functions and the same env as the build. Going through vitest avoids Node's lack of support for xploder's extensionless TS imports. The probe therefore copies no content value. The unit tests independently pin those functions to content.
  - Steps 1–6 per RFC D9. Exit codes per the S3 contract (0/1/2/6). It writes `seo-probe.json`, `og-hashes.json` and `summary.md`.
  - PNG check: signature + IHDR (`width`, `height` big-endian at bytes 16–23), `stat.size ≤ 307200`, `sha256`.
  - Schema check: `schema-vocab.json` = `{ version, types: { Name: { supertypes } }, properties: { name: { domainIncludes, rangeIncludes } } }`, covering Thing, CreativeWork, Person, SoftwareApplication, SoftwareSourceCode, URL, Text and the properties used (`name`, `jobTitle`, `url`, `sameAs`, `description`, `author`, `codeRepository`). It is extracted once from the schema.org release JSON-LD, and the version and source URL are kept in the file.
- **`bundle-manifest`:** `node tools/perf/src/cli/bundle-manifest.ts --out-dir <out> --write <file>` lists every `_next/static/**/*.js` (path, bytes, sha256) and every HTML route's `<script src>` list. `--diff <a.json> <b.json>` prints the comparison and exits 6 if a JS file or a route script was added, or if the total JS bytes grew.

## CI (`.github/workflows/ci.yml`) (RFC D10)

```yaml
  seo:
    name: 'seo: meta + og'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      SITE_URL: https://hi-murphy.me
    steps:
      - checkout · pnpm/action-setup · setup-node (.nvmrc, cache pnpm) · pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm --filter web seo:expect
      - run: pnpm seo:probe --out-dir apps/web/out --site-url "$SITE_URL" --expect apps/web/out-seo-expect.json --out .evidence/ci/seo/build-1
      - run: rm -rf apps/web/.next apps/web/out
      - run: pnpm build
      - run: pnpm --filter web seo:expect
      - run: pnpm seo:probe ... --compare .evidence/ci/seo/build-1/og-hashes.json --out .evidence/ci/seo/build-2
      - uses: actions/upload-artifact@v7 (if: always(), name: seo, path: .evidence/ci/seo/, retention-days: 14)
```

No browser is needed. The existing jobs are not edited.

## Data flow

```
.specify/content/*.json ──(S10 converter)──> apps/web/content/{site,projects}
                                                     │
            process.env ─> seo/site-url ─┐           ▼
                                         ├──> seo/routes (INDEXABLE_ROUTES) ──┬─> seo/metadata ─> layout/pages <head>
            xploder/theme (blueprint) ───┤                                    ├─> app/og/[...card] ─> out/og/*.png
            content/poster (geometry) ───┘                                    ├─> app/sitemap.ts, app/robots.ts
                                                                              └─> seo/json-ld ─> <JsonLd> in pages
out/ ──> tools/perf seo-probe (+ expect.json from the same functions) ──> seo-probe.json / og-hashes.json
```

## Test map

| Check | Where | FR |
|---|---|---|
| `resolveSiteUrl` matrix (4 rules, normalization, guards, errors) + `absoluteUrl` | `apps/web/test/seo-site-url.test.ts` | FR5 |
| `routeMetadata` per route = RFC D3 table recomputed from content; 404 has no canonical/`og:url` | `seo-metadata.test.ts` + updated `site-metadata.test.ts` | FR1 |
| registry = home + projects + `PROJECT_SLUGS`; no `/dev`, `/fixtures` | `seo-routes.test.ts` | FR1, FR3 |
| card model strings ⊂ content; silhouette slab count = `layers.length`; colours ⊂ `blueprint.light`; font covers every glyph | `seo-card.test.ts` | FR2 |
| `renderPng` twice → identical SHA-256, 1200×630, ≤ 300 KB | `seo-render.test.ts` | FR2 |
| JSON-LD = RFC D7 tables; every leaf traces to content or `absoluteUrl` | `seo-json-ld.test.ts` | FR4 |
| `iconSvg` colours ⊂ `blueprint.light ∪ blueprint.dark`; valid SVG | `seo-icon.test.ts` | FR7 |
| `seo/` has no `'use client'`; no client component imports `seo/` | `seo-server-only.test.ts` | FR6 |
| no colour literals / hand-copied strings / fixture imports in `seo/` | existing scanners with `seo/` added | FR2, FR1 |
| probe step logic (IHDR, vocab, leak classifier, sitemap set) + negative fixtures | `tools/perf/test/seo-probe.test.ts` | FR1–FR5, FR7 |
| bundle diff logic | `tools/perf/test/bundle-manifest.test.ts` | FR6 |
| frozen surfaces | `packages/xploder/test/frozen-surface.test.ts` (unchanged) + `guards.sh` | FR7 |

## Phase groups (Stage 3 STOP points)

- **G1 foundations:** T001–T004 → STOP. Guards + baseline bundle manifest, renderer proof, `SITE_URL`, metadata wired.
- **G2 artifacts:** T005–T008 → STOP. **Murphy reviews the three PNGs + `icon.svg`** (committed evidence, plus `pnpm dev` in Orca's browser for `/og/*.png`) and the head tags.
- **G3 verification + CI:** T009–T010 → STOP. Draft PR, CI green incl. `seo: meta + og`, red → green regression proof.
- **G4 evidence:** T011 → STOP. Bundle diff, Lighthouse/weight before/after, validator.schema.org, AC1–AC7 self-check table; Murphy's final validation.

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| Static route handlers instead of Next's `opengraph-image.tsx` convention | The convention controls URL shape and hashing itself. Our metadata function must own the absolute URLs and file names (`.png`, stable paths for the probe and the sitemap tests). The spike proved the handlers export cleanly. |
| A separate `expect.json` instead of hardcoding expected values in the probe | The probe must assert "derived from content" without copying content. Generating expectations from the same functions + content keeps one source, and the unit tests independently pin those functions to content. |
| A committed schema.org vocabulary subset | Makes the "equivalent local check" offline and deterministic. The full vocabulary is about 1 MB and changes per release. The subset records its source version. |
| Two full builds in CI | AC2 says "two consecutive builds". In-process double rendering alone would not catch build-level nondeterminism (params order, caching). |
