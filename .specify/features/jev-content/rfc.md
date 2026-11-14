# RFC — S13 Project Data #2: jev-toolkit (wiring)

**slice:** S13-jev-content · **status:** DRAFT, awaiting Gate 1 · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-13-jev-content.md` (frozen brief v1) · **branch:** `task/s13-jev-content` · **base:** `3b829d0` · **date:** 2026-11-14

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§10). Nothing here is implemented yet.

---

## 1. Context (from the brief)

- **Mission:** add jev-toolkit as the second project, data-only. The canonical content `.specify/content/jev-toolkit.json` (20 components / 5 layers / 2 flows) is wired in, proven to render, and proven not to regress anything. No new UI patterns, no engine work, no invented copy.
- **Content facts shown as-is:** JEV is a **third-party decision model**; the work is the harness. Metrics: 21,448 vs 28,721 input tokens, $0.0093 vs $0.0112, recall 0.79 vs 1.00, 45/45 compile, 277 tests / 0 deps.
- **Frozen:** the brief, `KICKOFF-S13.md`, `jev-toolkit.json` (converted, never edited), and the S2–S8 surfaces. No engine, theme, motion or panel changes.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — it renders.** `/projects/jev-toolkit` returns 200 and renders 5 layers, 20 components and 2 flows from the content module; a panel opens for a component; the guided tour runs to completion; the phone layout shows the compact parts column. Evidence: screenshots (mobile/desktop × light/dark) + probe output.
- **AC2 — fidelity.** A test asserts the converted module deep-equals `.specify/content/jev-toolkit.json` (strict equality + sha stamp, with a negative control), exactly as the websocket-inspector fidelity test does.
- **AC3 — discoverability.** The project appears as a card on `/projects` **and** in the home Projects section with name, tagline and ≤ 4 chips; both link to the route; the home section's DOM order is unchanged by the addition; no horizontal scroll at 390 px.
- **AC4 — machine-readable.** `/og/projects/jev-toolkit.png` exists at exactly 1200×630, ≤ 300 KB, deterministic across two clean builds (identical SHA-256); canonical, `og:url`, `og:image`, `twitter:image` are absolute and correct; the route appears in `sitemap.xml`; JSON-LD `SoftwareApplication` validates with every field traced to content.
- **AC5 — no regression.** Mobile Lighthouse ≥ 95 perf and ≥ 95 a11y on `/`, `/projects` and the new route; CLS 0; weight < 3 MB per route; axe 0 serious/0 critical on all three; **2 draw calls** on the new teardown; the home eager hero still reveals with zero interaction (D-28 behaviour intact); `/projects/websocket-inspector` unchanged in behaviour.
- **AC6 — nothing invented.** Every string on the new route and its card resolves from the content JSON; a scan finds no hand-typed project copy; the JEV third-party framing is rendered exactly as written (no "built JEV" claim anywhere).
- **AC7 — CI and surfaces.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, fixture exclusion); frozen surfaces S2–S8 empty; dev routes still 404 in production.

### Starting point (checked on this branch at `3b829d0`)

- **Content pipeline (S9/S10):** `apps/web/scripts/convert-content.ts` holds a `CONTENT_FILES` list. For each entry it reads the canonical JSON, records its SHA-256 in a header comment, and writes a Prettier-formatted `export const <name> = {…} satisfies <Type>` module. `--check` fails on drift. `content/projects/websocket-inspector.ts` passes the generated source through `defineProject(…, { registry: SITE_REGISTRY })`, which zod-parses it at module load (build time). `content/projects/index.ts` exports `PROJECTS = [websocketInspector]`, `PROJECT_SLUGS`, `getProject()` and `cardModel()`.
- **Data-driven consumers (already generic over `PROJECTS`):** `/projects/[slug]` (`generateStaticParams`, `dynamicParams = false`), `/projects`, the home `ProjectsSection`, `not-found.tsx`, `seo/routes.ts` (`INDEXABLE_ROUTES`), `app/sitemap.ts`, `seo/metadata.ts`, `seo/json-ld.ts`, `seo/og/card-model.ts`, `scripts/build-og.ts`, and `test/seo-expect.write.test.ts` (which feeds `seo:probe`).
- **Hero:** `components/home/hero-section.tsx` and the home OG card both use `PROJECTS[0]`.
- **Hardcoded to websocket-inspector (tests and tooling, not app code):** `test/content-fidelity.test.ts`, `test/no-hand-copied-content.test.ts`, `test/content-model.test.ts`, the S08 file lists in `test/no-{motion,color}-literals.test.ts`, `tools/perf/src/site-probe.ts` (`SITE_ROUTES`, `PROJECT_PATH`), `tools/perf/src/site-axe.ts` (`SITE_STATES`), `tools/perf/src/home-probe.ts` (copy allowlist), and `.github/workflows/perf.yml` (Lighthouse and weight project steps).
- **Frozen surfaces:** S2–S8 manifests diff-clean against the post-S11.9 re-seal baseline `3aee8fc` (checked at `3b829d0`).

### Pre-RFC spike (throwaway, reverted, not committed)

To ground this RFC, the orchestrator wired the project into the working tree with the four app changes in §3.1, ran the web tests and `og:build`, then reverted everything (`git status` clean afterwards).

| Probe | Result |
|---|---|
| `parseProject(jev-toolkit.json)` without `nodejs` in the registry | **fails**: unknown tech id `nodejs` |
| … with `{ id: 'nodejs', label: 'Node.js', category: 'platform' }` | parses: 5 layers, 20 components, 2 flows; `layoutProject` succeeds |
| `pnpm --filter web test` | 237 pass, **1 fail**: `content-model.test.ts › exposes the websocket-inspector project and slug` (asserts `PROJECTS` is exactly `[websocketInspector]`) |
| `og:build`: `/og/projects/jev-toolkit.png` | 1200×630, 76,330 B |
| `og:build`: `/og/projects/websocket-inspector.png` | **byte-identical** to the base (`74e0a609…bed9cd3`, 79,743 B) |
| `og:build`: `/og/home.png`, `/og/projects.png` | change, as expected: both list every project (home 74,778 → 75,554 B, projects 69,640 → 93,278 B) |
| Source links (repo root + 2 sampled `blob/main/…` URLs) | 200 (the repository is public) |

**Content observations (reported, not fixed):** none of them is an error. The three Evidence-layer stores (`fixtures`, `gold`, `reports`) have `links: []`, which matches commit `5b4f8ad` ("17 of 20") and the brief's post-merge follow-up for Reports. Metrics use U+2212 (−) and em dashes; they render byte-for-byte.

---

## 2. Conversion: JSON → content module (Deliverable 1, AC2)

**D1 — the same mechanism as websocket-inspector, with no hand-copied fields.**

| File | Change | How it is produced |
|---|---|---|
| `apps/web/scripts/convert-content.ts` | +1 entry in `CONTENT_FILES`: `{ source: '.specify/content/jev-toolkit.json', target: 'content/projects/jev-toolkit.source.ts', exportName: 'jevToolkitSource', typeImport: { typeName: 'ProjectInput', moduleSpecifier: 'xploder' } }` | hand edit (data entry, no branch) |
| `apps/web/content/projects/jev-toolkit.source.ts` | new, **generated** by `pnpm --filter web content:convert`; header records the JSON SHA-256 | generated; never hand-edited |
| `apps/web/content/projects/jev-toolkit.ts` | new; the 9-line shape of `websocket-inspector.ts`: `defineProject(jevToolkitSource, { registry: SITE_REGISTRY, source: 'jev-toolkit' })` | hand edit (mirrors the existing file) |
| `apps/web/content/projects/index.ts` | `PROJECTS = [websocketInspector, jevToolkit] as const` | hand edit (one array element; order rule in §4) |
| `apps/web/content/tech-registry.ts` | + `{ id: 'nodejs', label: 'Node.js', category: 'platform' }` | hand edit; see §3.1 S4 and Q1 |

Build-time validation is unchanged: `defineProject` zod-parses at module load, so a schema error fails `next build`, `og:build` and every test that imports the content.

**D2 — the fidelity test hooks in first.** `apps/web/test/content-fidelity.test.ts` becomes table-driven. It is the first task in Stage 3 and lands before any route or card work.

- One row per project: `{ slug, jsonPath, source, project, sourcePath }`. The websocket-inspector row keeps its five assertions unchanged: (a) generated module `toStrictEqual` the JSON, (b) parsed module `toStrictEqual` `parseProject(json)`, (c) `content:convert --check` exits 0, (d) the header SHA-256 equals the JSON's SHA-256, (e) negative control: a mutated `meta.tagline` copy is **not** strictly equal.
- The jev-toolkit row gets the same five assertions, so AC2's "exactly as the websocket-inspector fidelity test does" holds by construction.
- **New completeness guard (no silent omission):** the set of `.specify/content/*.json` files minus `site.json` equals the fidelity rows, `PROJECT_SLUGS`, and the project entries in `CONTENT_FILES`. A third project cannot be half-wired.
- **Order inside the first task:** write the test rows first and watch them fail (the module is missing), then convert and watch them pass. Both outputs are kept as evidence (`T001-log-fidelity-red.txt`, `T001-log-fidelity-green.txt`). A second negative control mutates one *nested* field (a component `summary` in layer 5) to show the strict equality reaches deep content.

---

## 3. Shared-code changes (each additive, each justified)

### 3.1 App code (`apps/web`)

| Id | File | Change | Why it is needed | Why it is not special-casing |
|---|---|---|---|---|
| S1 | `scripts/convert-content.ts` | +1 `CONTENT_FILES` entry | The converter is the only allowed way to produce a content module (Deliverable 1) | It is a data row in the existing registration list. There is no slug check in the code path |
| S2 | `content/projects/jev-toolkit{,.source}.ts` | new files | The module that the route, cards and SEO read | Same shape as websocket-inspector |
| S3 | `content/projects/index.ts` | append to `PROJECTS` | `PROJECTS` is the single source for routes, cards, sitemap, OG and JSON-LD | One array element; every consumer is already generic |
| S4 | `content/tech-registry.ts` | + `nodejs` tech | **Required:** all 20 components reference `techs: ["nodejs"]`; without the id, parsing fails and `cardModel` throws | The registry is the site-level vocabulary that the content references by id (S9 design); websocket-inspector's six techs live there too. The label and category are Q1 |

**Not changed (verified generic):** `app/(site)/projects/[slug]/page.tsx`, `app/(site)/projects/page.tsx`, `components/home/projects-section.tsx`, `components/project-card.tsx`, `components/teardown-poster.tsx`, `app/not-found.tsx`, `app/sitemap.ts`, `app/robots.ts`, `seo/*` (routes, metadata, json-ld, og/card-model, og/card, og/render), `scripts/build-og.ts`, everything in `components/workbench/*`, `components/hero/*`, and the whole `packages/xploder`.

**Accepted side effects (no code change; each one is measured):**

- **E1 — the workbench chunk carries every project.** `components/workbench/workbench-client.tsx` (client) calls `getProject(slug)`, so its lazy chunk bundles `PROJECTS`. After the addition, `/projects/websocket-inspector`'s chunk also contains jev-toolkit's content (about 16 KB raw, a few KB gzipped) and parses it on chunk evaluation. Behaviour is unchanged. The delta is measured with the weight gate (before = `3b829d0`, after = head) and recorded. A per-slug code split would be a shared workbench change, so it is **not** proposed unless a gate fails (Q4).
- **E2 — home and `/projects` OG cards change.** They list every project (title-block rows, and `/projects` draws one silhouette per project). The websocket-inspector card stays byte-identical (spike above). Both new hashes are recorded and are deterministic across two builds.
- **E3 — `/projects` `<main>` gains one `<article>`.** `/projects/websocket-inspector` `<main>` is expected to be byte-identical after normalisation (gate G11).

### 3.2 Tests (`apps/web/test`)

| Id | File | Change | Why |
|---|---|---|---|
| T-a | `content-fidelity.test.ts` | table-driven + completeness guard (D2) | AC2 |
| T-b | `no-hand-copied-content.test.ts` | one `(json, generatedSource)` pair per project. Each project's strings are allowed only in its own generated source; the negative controls stay | AC6's "a scan finds no hand-typed project copy" must cover jev-toolkit's strings |
| T-c | `content-model.test.ts` | `PROJECTS`/`PROJECT_SLUGS` expectation → `[websocketInspector, jevToolkit]` / `['websocket-inspector','jev-toolkit']`; + a jev-toolkit `cardModel` case (1 chip: Node.js) | the one test the spike broke; AC3's ≤ 4 chips |
| T-d | `no-motion-literals.test.ts`, `no-color-literals.test.ts` | add `content/projects/jev-toolkit{,.source}.ts` to the S08 file lists | keeps the literal scans covering every content module |
| T-e | new `third-party-framing.test.ts` | (1) the canonical framing sentence "the JEV decision model (a third-party service I do not own)" is present verbatim in the generated source and in the exported route HTML (when `out/` exists); (2) a deny-list scan of `app/`, `components/`, `content/`, `seo/` and the exported `out/**/*.{html,txt}` finds no `built (the )?JEV`, `JEV(,)? built by`, `my JEV`, `our JEV`, `I built JEV`; (3) a negative control proves that the scan catches a planted claim | AC6 |

### 3.3 Tooling (`tools/perf`) and CI

| Id | File | Change | Why |
|---|---|---|---|
| P1 | new `tools/perf/src/project-sources.ts` | `PROJECT_SOURCES = [websocketInspectorSource, jevToolkitSource]` (imports the generated `.source.ts` files, as the probes already do). A tools test asserts that its slugs equal `.specify/content/*.json` minus `site.json`, in `PROJECTS` order | tools cannot import `content/projects/index.ts` (runtime `xploder` + extensionless imports); the guard stops drift |
| P2 | `tools/perf/src/site-probe.ts` | `SITE_ROUTES` gets one project route per `PROJECT_SOURCES` entry; the `routes`, `cls`, `nojs`, `reduced-motion`, `draws` and metadata checks run on every project route. `drill` keeps walking the **first** card (the home keyboard path, unchanged). **New group `teardown`** (per project): DOM counts vs the content module (layers, components, flows) on the live workbench **and** the no-JS outline; open a component panel; play each flow's tour until `data-xploder-tour="ended"`; at mobile width, assert that the compact parts column is visible. **New group `cards`** at 390×844 on `/` and `/projects`: one card per project, name/tagline/chips text equal to the content, ≤ 4 chips, `href` = route, route 200, `scrollWidth ≤ clientWidth` | AC1, AC3, AC5 (draws, CLS, no-JS on the new route) |
| P3 | `tools/perf/src/site-axe.ts` | the six `project-*` states × every project | AC5's axe on the new route; `a11y: axe (production routes)` covers it |
| P4 | `tools/perf/src/home-probe.ts` | copy allowlist flattens every `PROJECT_SOURCES` entry. Hero config and narration stay on the first entry (= the hero project) | without it, the home `copy` group would flag the new home card as unknown copy |
| P5 | `.github/workflows/perf.yml` | + "Lighthouse gate (project route: jev-toolkit)" and "Weight gate (project route: jev-toolkit)" steps, separate `--out` dirs; + `/projects` steps in both gates, which today cover only `/` and the WSI route (Q5) | AC5 binding CI on the preview |

Untouched: `hero-eager.yml`, `eager-load.yml`, `eager-3d.yml` (legacy slice workflows, websocket-inspector only, still valid as regression), `ci.yml` (the `seo: meta + og` job is already route-generic).

---

## 4. Card ordering rule (AC3)

| Option | Rule | Assessment |
|---|---|---|
| **A — content order (recommended)** | the order of `PROJECTS` in `content/projects/index.ts`; new projects are appended | Explicit, reviewed in the diff, zero new mechanism. `PROJECTS[0]` stays websocket-inspector, so the **home hero, the eager hero path (D-28) and the home OG silhouette do not change**. The existing card keeps its position; the new card follows it |
| B — date | sort by `meta.year` | Both are 2026, so this ties and falls back to array order anyway. A finer date does not exist in the content and cannot be added (the JSON is frozen) |
| C — manual field | an `order` field in content | Requires editing canonical JSON (forbidden) or a new site-level ordering config (a new mechanism for a two-item list) |

**Default: A.** Resulting DOM:

- **Home Projects section:** `[websocket-inspector card, jev-toolkit card, "More teardowns in progress." note]` in the existing `md:grid-cols-2` grid. The section order `nav, hero, projects, about, contact, footer` (`HOME_SECTIONS`) is untouched. That is "the home section's DOM order is unchanged", asserted by `home-sections.test.ts` and `home:probe --group structure`.
- **`/projects`:** `[websocket-inspector, jev-toolkit]` list cards.
- The `emptyNote` placeholder stays: it is `site.json` copy, and removing it would be a UI change (Q3).

---

## 5. OG, metadata, sitemap and JSON-LD (Deliverable 4, AC4)

Everything below flows from `PROJECTS` through `INDEXABLE_ROUTES`. No SEO code changes.

- **OG card:** `build-og.ts` iterates `INDEXABLE_ROUTES` → `public/og/projects/jev-toolkit.png`. Card model: eyebrow = site name, title = `meta.name` ("JEV Benchmark"), subtitle = `meta.tagline`, the exploded layer silhouette, and title-block rows = the 5 layer names (under the 6-row limit). Light palette, as for every card.
- **Determinism:** CI `seo: meta + og` already builds twice from clean (`rm -rf .next out`) and runs `seo:probe --compare build-1/og-hashes.json`. Locally the orchestrator repeats two clean builds and records both SHA-256 lists for all four cards: they must be pairwise identical, and websocket-inspector's must equal the base `74e0a609…`.
- **Metadata (`routeMetadata`):** title `JEV Benchmark · <siteName>`, description = `meta.tagline`, canonical and `og:url` = `absoluteUrl('/projects/jev-toolkit')`, `og:image` and `twitter:image` = `/og/projects/jev-toolkit.png` made absolute by `metadataBase` (`SITE_URL`). `seo:expect` derives its expectations from `INDEXABLE_ROUTES`, so `seo:probe` asserts the new route automatically, including "absolute, never relative".
- **Sitemap:** `app/sitemap.ts` maps `INDEXABLE_ROUTES` → gains `<SITE_URL>/projects/jev-toolkit`. Robots is unchanged.
- **JSON-LD (`projectLd`)**, `@type: ['SoftwareApplication','SoftwareSourceCode']` (the S11 type, unchanged). Field trace:

| Field | Value source |
|---|---|
| `name` | `jev-toolkit.json` `meta.name` |
| `description` | `jev-toolkit.json` `meta.summary` |
| `url` | `SITE_URL` + `/projects/` + `meta.slug` |
| `codeRepository` | `jev-toolkit.json` `meta.links[label = "Source"].url` |
| `author.name`, `author.url` | `site.json` `identity.name`, `SITE_URL` + `/` |

Validation: `seo:probe` checks the vocabulary against `tools/perf/src/schema-vocab.json` (the S11 local equivalent of the schema.org validator). The JSON-LD describes the **harness** ("JEV Benchmark", authored by the site owner), not the JEV model, so it makes no "built JEV" claim (Q2).

---

## 6. AC6 — nothing invented

- **Strings on the route and cards** come from: `jev-toolkit.json` (name, tagline, summary, year, role, links, story, metrics, layers, components, flows) via the module; existing UI chrome that already ships on websocket-inspector ("← All projects", "Guided tour", "Step k of n", "Case study"…); `site.json` (site name, Projects title); and the tech registry chip label (Q1). No new chrome strings are introduced.
- **Scans:** T-b (hand-copy scan per project), T-e (framing + "built JEV" deny-list over source **and** the exported HTML/RSC), and `home:probe --group copy` with the P4 allowlist.
- **Rendered framing:** the case study renders `story.approach`, which contains "the JEV decision model (a third-party service I do not own)". T-e asserts that it is in `out/projects/jev-toolkit.html` verbatim.

---

## 7. Gate matrix and evidence per AC

Local setup per product commit: `pnpm install --frozen-lockfile && pnpm --filter perf-tools exec playwright install chromium && pnpm build && pnpm serve:out --port 4173 &`. Evidence goes to `.specify/features/jev-content/evidence/` with names per `.specify/EVIDENCE.md` (`T<NNN>-<kind>-<what>.<ext>`), and every visual or perf artifact comes with `meta.json`.

| Id | Gate (AC) | Command(s) | Pass |
|---|---|---|---|
| G1 | build, types, lint, tests (AC7) | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + CI `build (typecheck, lint, test, build)` | exit 0 / green |
| G2 | fidelity (AC2) | `pnpm --filter web exec vitest run test/content-fidelity.test.ts` (red → green logs, D2) + `pnpm --filter web content:convert --check` | 2 rows × 5 assertions + guard green; nested negative control green |
| G3 | route renders (AC1) | `pnpm site:probe --serve apps/web/out --group teardown,routes,nojs --out …/teardown` | `/projects/jev-toolkit` 200; layers 5 / components 20 / flows 2 (live + outline); panel opens; both flows reach `ended`; compact parts column visible at mobile |
| G4 | screenshots (AC1) | `pnpm evidence http://127.0.0.1:4173/projects/jev-toolkit --color-scheme light` and `… dark` (mobile + desktop each), plus panel-open and tour-ended shots from the `teardown` group | 4 baseline + state shots, `meta.json` each |
| G5 | cards (AC3) | `pnpm site:probe --serve apps/web/out --group cards,drill` + `pnpm home:probe --serve apps/web/out --group structure,copy` + `home-sections.test.ts` | both surfaces: card present, ≤ 4 chips, href → route 200; section order unchanged; `scrollWidth ≤ clientWidth` at 390 px |
| G6 | OG card (AC4) | `pnpm build` ×2 from clean; `sha256sum apps/web/out/og/**/*.png`; PNG IHDR dims; byte size | 1200×630, ≤ 300 KB, identical SHA-256 across builds; WSI card = base hash |
| G7 | metadata, sitemap, JSON-LD (AC4) | `pnpm --filter web seo:expect && pnpm seo:probe --out-dir apps/web/out --site-url https://hi-murphy.me --expect apps/web/out-seo-expect.json --out …/seo` + CI `seo: meta + og` | exit 0 / green; sitemap contains the route; JSON-LD valid, every field traced (§5 table) |
| G8 | Lighthouse ≥ 95/95, three routes (AC5) | **binding:** CI `perf-gate: lighthouse (mobile)` on the preview (with P5). Supplementary: `pnpm perf:lighthouse http://127.0.0.1:4173<route> --categories performance,accessibility --out …` for `/`, `/projects`, `/projects/jev-toolkit` | ≥ 0.95 / ≥ 0.95 each |
| G9 | CLS 0 (AC5) | `pnpm site:probe --serve apps/web/out --group cls` (all routes incl. the new one) + the Lighthouse CLS audits | 0 in every cell |
| G10 | weight < 3 MB (AC5) | **binding:** CI `perf-gate: weight (< 3 MB)` (with P5). Supplementary: `pnpm perf:weight` for the three routes and for `/projects/websocket-inspector` before (`3b829d0`) vs after (E1 delta) | < 3,000,000 B mobile + desktop |
| G11 | axe 0/0 (AC5) | CI `a11y: axe (production routes)` (with P3) + `a11y: axe (engine fixture export)`; local `pnpm a11y:axe:site --serve apps/web/out --out …/axe-site` | 0 serious / 0 critical |
| G12 | 2 draw calls (AC5) | `pnpm site:probe --serve apps/web/out --group draws` | 2 on `/projects/jev-toolkit` (and still 2 on websocket-inspector) |
| G13 | eager hero (AC5) | `pnpm site:probe --serve apps/web/out --group hero` + `pnpm eager:probe --serve apps/web/out --route / --runs 2 --expect live-loop` | PASS; 0 input events before reveal |
| G14 | websocket-inspector unchanged (AC5) | S12 `main-diff.sh` method against base `3b829d0`: normalised `<main>` of `projects/websocket-inspector.html` (expect 0-byte diff) and `projects.html` (expect exactly one added `<article>`); site-probe/axe on the WSI route green; WSI OG hash = base | as stated |
| G15 | nothing invented (AC6) | `vitest run test/no-hand-copied-content.test.ts test/third-party-framing.test.ts test/content-fidelity.test.ts` (after `pnpm build`, so T-e scans `out/`) + G5 `home:probe --group copy` | green; 0 deny-list hits; framing present verbatim |
| G16 | frozen surfaces (AC7) | `for p in packages/xploder/test/frozen-surface{,.s5,.s6,.s7,.s8}.paths; do git diff --quiet 3aee8fc -- $(sed "s#^#packages/xploder/#" "$p") \|\| echo "DIRTY $p"; done` + `pnpm --filter xploder test` | no `DIRTY`; green |
| G17 | dev routes 404 + fixture exclusion (AC7) | CI `Fixture exclusion` + `perf: fixture exclusion`; local `site:probe --group routes` | green; `/dev/engine`, `/fixtures/fps-calibration` 404 |
| G18 | CI (AC7) | every required check on the PR head (`build`, `secrets (gitleaks)`, `seo: meta + og`, both axe jobs, both perf gates, fixture exclusion) | all green; run URLs recorded |

**Evidence list per AC (`evidence/`):**

- **AC1:** `T0xx-screenshot-jev-{mobile,desktop}-{light,dark}.png` + `meta.json`; panel-open and tour-ended shots; `teardown.json` / `teardown.log.txt`; `routes.json`.
- **AC2:** `T001-log-fidelity-red.txt`, `T001-log-fidelity-green.txt`, `content:convert --check` output.
- **AC3:** `cards.json` (390 px scroll widths), `home-probe` structure/copy JSON, card screenshots on `/` and `/projects` (mobile/desktop × light/dark).
- **AC4:** `og-jev-toolkit.png` copy, `og-hashes-build-{1,2}.json`, a dims/size table, `sitemap.xml` excerpt, extracted JSON-LD + `seo-probe` summary, the §5 field-trace table.
- **AC5:** Lighthouse summaries ×3 routes (CI + local), weight ×3 routes + the E1 delta, CLS, axe summary, `draws.json`, `eager-probe` output, `main-diff` output.
- **AC6:** scanner outputs (T-b, T-e, home copy).
- **AC7:** the G16 log, CI run URLs, the routes 404 log.
- **Closing:** `AC-selfcheck.md` (one row per AC with verdict + evidence links) and an execution-tier table (which tier finished each task).

---

## 8. Stage 3 task outline (for Stage 2 to formalise)

1. **Fidelity first:** T-a red → S1/S2 conversion → T-a green (+ T-d). *Gate: G2.*
2. **Route:** S3 + S4 + T-c; `pnpm build`; P1 + P2 `teardown` group; screenshots. *Gates: G3, G4, G12.*
3. **Cards:** P2 `cards` group, P4, home/projects screenshots. *Gate: G5.*
4. **OG/SEO:** two clean builds, hashes, seo probe. *Gates: G6, G7.*
5. **Nothing invented:** T-b, T-e. *Gate: G15.*
6. **Gate matrix:** P3, P5; G8–G11, G13, G14, G16–G18; `AC-selfcheck.md`.

One integration seam and one executable check per task. Fresh worktree per task off the slice branch; executor = DeepSeek Flash 4.1; stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record).

---

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A 20-part teardown (5 parts in Bench core vs max 4 on WSI) crowds the compact parts column or the callout columns on phones | medium | G3/G4 screenshots at 412 and 390 px; any overflow is a Sev-2 escalated with evidence (no engine/panel change allowed in scope) |
| E1 weight/parse cost pushes the project route's Lighthouse perf under 95 | low | measured before/after; the fallback is Q4 (per-slug split = shared-code change → Murphy decides) |
| The 8-step `arm-run` tour takes long enough to hit probe timeouts | low | the `teardown` group waits on `data-xploder-tour="ended"` with a step-count-scaled timeout |
| CI runtime grows (axe/site-probe states × 2 projects) | medium | acceptable; reported with job durations |
| Two-silhouette `/projects` OG card is less legible | low | rendered PNG attached for review (S11 layout already supports N silhouettes) |

---

## 10. Open questions (each with a default)

1. **Q1 — Tech chip for `nodejs`.** The JSON references tech id `nodejs`, which is not in the site registry. **Default:** add `{ id: 'nodejs', label: 'Node.js', category: 'platform' }`. "Node.js" follows the registry's convention of official names ("Jetpack Compose" for the tag "Compose"), and `platform` matches how Android is classed, so it uses the existing `tech-platform` colour. Alternatives: label "Node" (the JSON tag verbatim), or category `tooling`. The registry label is the only card string not taken from the project JSON; it resolves through the content's tech id, the same as websocket-inspector's chips.
2. **Q2 — JSON-LD author.** **Default:** keep the S11 `projectLd` unchanged. The entity is "JEV Benchmark" (the harness) with the site owner as author, which matches the content's role line. Alternative: none needed unless Murphy wants the third-party model named in JSON-LD (that would be new copy, so not recommended).
3. **Q3 — Home placeholder card.** **Default:** keep the "More teardowns in progress." tile after the two cards (unchanged UI, no copy change).
4. **Q4 — E1 (every project's content in the workbench chunk).** **Default:** accept and measure. Only if G8/G10 fail: escalate a per-slug dynamic import as an additive shared change.
5. **Q5 — `/projects` in the CI perf gates.** AC5 needs `/projects` measured. Today `perf.yml` gates only `/` and the WSI route. **Default:** add `/projects` steps next to the jev-toolkit steps, so all three AC5 routes are binding in CI.
6. **Q6 — Eager-hero timing host.** S12 needed a temporary slow-class workflow for a timing threshold. AC5 here asks for reveal with zero interaction, not a time budget. **Default:** local `eager:probe --expect live-loop` + `site:probe --group hero` (G13), with no temporary workflow.
7. **Q7 — Tooling scope.** **Default:** P1–P5 as written (probes iterate every project from one guarded list). Alternative: a `--project <slug>` flag, which keeps CI output identical but needs a per-slug invocation for every future project.

---

## 11. Gate 1 record

_Pending Murphy's review._
