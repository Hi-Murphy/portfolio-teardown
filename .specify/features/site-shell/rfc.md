# RFC — S10 Site Shell: Landing · Project Routes · Recruiter Mode

**slice:** S10-site-shell · **status:** APPROVED at Gate 1 (2026-11-02): defaults accepted, Murphy answers + refinements R1–R10 + corrections C1–C3 applied (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-10-site-shell.md` (frozen brief v1 + pre-dispatch erratum `99a94f2`) · **branch:** `task/s10-site-shell` · **base:** `99a94f2` · **date:** 2026-11-02

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§6).

---

## 1. Context (from the brief)

- **Mission:** turn the S1 placeholder into the actual portfolio. That means a home page with a poster-first live hero, project cards, an about strip and a contact footer; a real `/projects/[slug]` teardown route with panels; and a recruiter path that needs no 3D. The finalized websocket-inspector content is wired in. Production routes get the same gates the dev playground already has.
- **Live:** engine (S4/S5), blueprint theme (S6), panels/chips/tour (S7), a11y floor including the axe gate on the fixture export (S8), lockfile-gated CI (S3). Dev routes `/dev/engine` and `/fixtures/fps-calibration` are production-excluded and must stay so.
- **Content (S9):** `.specify/content/websocket-inspector.json`, schema v1: `schemaVersion`, `meta`, `story`, `layers[5]` (16 components nested), `flows[2]`. It is converted to a zod-validated TS module, not hand-copied (authoring rule D-06 = the S2 site path: `defineProject(input, { registry })` evaluated at build time).
- **Carry-over (from S5 F7):** a page-load CLS ≈ 0.0006 on the `/dev/engine` control row. S10 owns it.
- **Budgets (unchanged):** LCP < 2.5 s, CLS = 0, mobile Lighthouse perf/a11y ≥ 95, home first load < 3 MB. Design target: mid-range Android on 4G.
- **Murphy dependencies (resolved):** résumé = existing PDF at `apps/web/public/resume.pdf` (Murphy supplies it; a `TODO(résumé)` marker until it lands, plus a file-exists check at validation). Contact = `mailto:vibing.murphy@gmail.com` + GitHub/LinkedIn. No form.
- **Non-goals (hard):** OG images (S11) · analytics · DNS/domain/cutover (S16) · content for other projects (S13/S15) · cross-project chip links (S14) · theme/engine/panel behaviour changes · pixel/papercraft theme · résumé redesign.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | `/` and `/projects/websocket-inspector` render entirely from the converted content module; the fidelity test (`module ≡ .specify/content/websocket-inspector.json`) is green; project cards show name, tagline, and ≤ 4 tech chips. |
| AC2 | poster-first hero: first paint is the static poster; the 3D hydrates after without layout shift (CLS 0); ambient idle only; `prefers-reduced-motion` → static poster, no animation; no autoplay explosion. |
| AC3 | recruiter path works without WebGL: `/projects` list reachable in ≤ 1 click from home; every card deep-links; unknown slug → 404; with JS disabled, home and project route show poster + readable list (evidence screenshots + DOM). |
| AC4 | axe on both production routes, light + dark: 0 serious, 0 critical; landing keyboard drill passes (nav → cards → project route → back); reduced-motion matrix extended to the new surfaces. |
| AC5 | mobile Lighthouse ≥ 95 perf / ≥ 95 a11y on both routes; LCP < 2.5 s; CLS = 0; home first load < 3 MB; evidence artifacts attached. |
| AC6 | the dev-only routes remain production-excluded (404 on the prod URL); the S10 CLS carry-over is fixed or bounded with evidence. |
| AC7 | full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion, axe gate extended); frozen-surface checks S2–S8 remain empty; 2 draw calls unchanged on the teardown. |

### Starting point (checked on this branch at `99a94f2`)

| Item | State |
|---|---|
| `app/page.tsx` | S1 placeholder: palette swatches, `ThemeToggle` inside a `flex` header, footer with the xploder version. Root `layout.tsx` = theme script + `paletteCss()+motionCss()` inline style + static `metadata`. |
| Dev routes | `app/dev/engine/page.fixture.tsx`, `app/fixtures/fps-calibration/page.fixture.tsx`. The `.fixture.tsx` extension is compiled only in dev or with `PERF_FIXTURES=1` (`next.config.ts`). |
| Viewer API (`xploder/react`) | `TeardownViewer` (`project`, `viewer`, `panels?`, `registry?`, `onStats?`, `onSettled?`, `className`, `aria-label`, `fallback?`), `useTeardownViewer({ initial?, project })` (default `initial` = `exploded` under reduced motion, else `imploded`), `useViewerPanels()`, `usePrefersReducedMotion()`. `hasWebgl` is **not** exported (S8 internal); the viewer's `CanvasBoundary` renders `fallback` when WebGL is unavailable. |
| Engine idle | There is **no ambient/idle-motion mode** in the engine. At rest it renders on demand; motion only happens on explode/implode, rotate, zoom, hover, and the tour. |
| Motion tokens | durations `explode, implode, hoverLift, hoverSettle, tourPulse, tourBeat, panelEnter, panelExit`. There is no hero/reveal token, and adding one changes the S2 tokens API (frozen). |
| Content parse | `defineProject(input, { registry, source })` requires a registry. The only registry in the repo is the **test fixture** `xploder/fixtures` `techRegistryJson` (12 techs). It covers all 6 techs used by websocket-inspector: kotlin ×16, android ×6, coroutines ×6, jetpack-compose ×4, room ×3, websocket ×3. |
| Seals | `frozen-surface.manifest.json` (S2+S4), `.s5`, `.s6`, `.s7`. **There is no S8 seal** (F1). |
| Gates | `perf.yml`: Lighthouse + weight on the Vercel preview **root only**; the Lighthouse gate runs `categories: ['performance']` only, so a11y is not gated (F3). The axe + a11y-probe job runs on the **fixture export** `/dev/engine` only. Fixture exclusion asserts 404 for both dev routes on preview and production. |
| 404 | `tools/perf` `serve.ts` serves `404.html` with status 404, like Vercel's static hosting. Next writes `404.html` from `app/not-found.tsx` (the default one today). |
| Fonts | System stacks only (`globals.css`), so no web-font CLS risk. |
| `apps/web/public/` | Does not exist yet. |

### Environment facts checked 2026-11-02 (`evidence/RFC-log-baseline.txt`)

| Item | Fact |
|---|---|
| Node / tools | v24.19.0 · Lighthouse 13.6.0 · Chromium 156 · Playwright 1.64.1 |
| Tier-1 executor | `codex` at `/opt/homebrew/bin/codex` (DeepSeek Flash 4.1 profile) |
| Tier 1.5 | `OPENROUTER_API_KEY` **unset** → DORMANT, skip-with-record |
| Lighthouse mobile, `/dev/engine?fixture=a` (fixture export, local) | perf **0.99 / 1 / 1**, LCP ≈ 770 ms, TBT 58–114 ms, 471 KB total, but **CLS 4.3e-5 on every run → gate exit 6**. An eagerly loaded engine route already clears the perf budget. CLS is the blocker. |
| Load CLS attribution, `/dev/engine` | One shift at ≈ 325 ms: the whole control-row flex line moves up 3 px (desktop 0.000637, mobile 0.000043). Cause: `ThemeToggle`'s pre-mount placeholder is an `inline-block` span in a block `div.ml-auto`. Its line box is taller than 44 px by the descender gap; the mounted `inline-flex` button is not. Same value and timing as S5 F7. |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Route tree and module layout (AC1, AC3)

**R:** Site pages live in a **route group** with their own chrome, so the root layout and the dev routes stay untouched.

```
apps/web/
  app/
    layout.tsx                         root: theme script, palette+motion CSS, metadata default + title template (D7)
    not-found.tsx                      NEW: 404 page (renders SiteChrome itself; links to / and /projects)
    (site)/layout.tsx                  NEW: skip link · SiteNav · {children} · SiteFooter (contact)
    (site)/page.tsx                    REWRITTEN landing (replaces app/page.tsx)
    (site)/projects/page.tsx           NEW: recruiter list (no WebGL)
    (site)/projects/[slug]/page.tsx    NEW: teardown route (generateStaticParams, dynamicParams = false, generateMetadata)
    dev/…, fixtures/…                  UNCHANGED
    theme-toggle.tsx                   CLS fix only (D10)
  content/                             NEW: data layer (no React)
    site.ts                            site copy: name, role line, about text, contact + social links, résumé path
    tech-registry.ts                   defineTechRegistry({...}): the site registry (D2)
    projects/websocket-inspector.source.ts   GENERATED by scripts/convert-content.ts (header: do not edit)
    projects/websocket-inspector.ts    defineProject(source, { registry, source: 'websocket-inspector' })
    projects/index.ts                  PROJECTS, PROJECT_SLUGS, getProject(slug), cardModel(project)
  components/                          NEW: app-level UI (server unless marked)
    site-nav.tsx · site-footer.tsx · about-strip.tsx · project-card.tsx · tech-chip-list.tsx
    teardown-poster.tsx                server SVG poster from xploder/layout (D4)
    project-outline.tsx                readable story + layers → components list (no-JS / no-WebGL)
    hero/hero.tsx                      server shell: reserved box + poster + <HeroLive/>
    hero/hero-live.tsx                 'use client' gate island (no three import)
    hero/hero-stage.tsx                'use client' live viewer, loaded by dynamic import only
    workbench/workbench.tsx            server shell: reserved stage + toolbar boxes + <noscript>
    workbench/workbench-loader.tsx     'use client' next/dynamic(ssr:false)
    workbench/workbench-client.tsx     'use client' viewer + panels + toolbar + tour
  scripts/convert-content.ts           JSON → generated TS module (--check mode)
  public/resume.pdf                    Murphy supplies (TODO(résumé) until then)
```

- `/` = nav · hero · project cards · about strip (`#about`) · footer contact (`#contact`).
- `/projects` = recruiter list. It is linked from the nav, so it is **1 click from home**.
- `/projects/[slug]`: `generateStaticParams()` returns `PROJECT_SLUGS`. With `dynamicParams = false`, the static export emits only known slugs, so an unknown slug gets the host's `404.html` with status 404 (Vercel and `serve.ts` behave the same). `notFound()` guards `getProject()` misses during the build.
- **Rejected:** putting chrome in the root layout (that changes `/dev/engine`'s DOM, its axe baseline and its CLS) · `app/_components` (top-level `components/` + `content/` keep data and UI out of the route tree) · a `[...slug]` catch-all (unneeded).

### D2 — Content module: JSON → generated TS → `defineProject` (AC1)

**R:** A converter **generates** the TS module, `defineProject` validates it at build time, and a test proves it equals the canonical JSON.

- `apps/web/scripts/convert-content.ts` (Node 24 type-stripping, same style as `tools/perf`) reads `.specify/content/websocket-inspector.json` and writes `content/projects/websocket-inspector.source.ts`:
  `export const websocketInspectorSource = { …1:1 literal… } as const satisfies ProjectInput;` with a header naming the source file and saying "generated — do not edit; run `pnpm --filter web content:convert`". The output is Prettier-formatted, so `format:check` stays green.
- `content/projects/websocket-inspector.ts`: `export const websocketInspector = defineProject(websocketInspectorSource, { registry: SITE_REGISTRY, source: 'websocket-inspector' })`. It evaluates during `next build` static generation, so invalid content or an unknown tech fails the build (S2 D3 path).
- **Fidelity test** `apps/web/test/content-fidelity.test.ts`:
  1. `websocketInspectorSource` `toStrictEqual` `JSON.parse(readFileSync(canonical))` (module ≡ JSON, the AC1 wording);
  2. `websocketInspector` `toStrictEqual` `parseProject(json, { registry })` (the parsed module matches the parsed JSON, defaults included);
  3. `convert-content --check` output is byte-equal to the committed file (catches edits to the generated file and canonical-JSON drift).
- **Site registry:** `content/tech-registry.ts` = `defineTechRegistry({ schemaVersion: 1, techs: [...] })` holding the 6 techs the content uses, with ids, labels and categories copied from the fixture registry entries. Production code never imports `xploder/fixtures`. A source-scan test (`prod-imports.test.ts`) asserts that no non-`.fixture.tsx`, non-test file in `apps/web` imports `xploder/fixtures`.
- **"Renders entirely from the module" guard:** `no-hand-copied-content.test.ts` scans `app/` and `components/` for any project string from the JSON (meta name/tagline/summary, story texts, component names) as a literal. The generated `.source.ts` is the only allowed location. Site chrome copy (name, about, contact) lives in `content/site.ts` (Q8).
- **Rejected:** importing the JSON straight into `apps/web` (couples the build to `.specify/`, and "TS module" and "fidelity test" become vacuous) · a hand-written TS object (the brief forbids it) · reusing the fixture registry at runtime (test data in production).

### D3 — Card model and tech chips (AC1)

**R:** `cardModel(project)` returns `{ slug, name, tagline, chips }` derived only from the module. `chips` = registry techs ranked by **how many components use them** (ties broken by first appearance in layer/component order), **capped at 4**. For websocket-inspector that is **Kotlin · Android · Kotlin Coroutines · Jetpack Compose**.

- The chips are **static** (`<ul aria-label="Tech">`, label + category text, colour dot from the `tech-*` palette tokens), mirroring the S7/S8 chip semantics (label + category) without importing the panel component. They are not links (S14 owns chip links).
- A unit test (`content-model.test.ts`) covers the ranking, the tie-break, the cap of 4, and that every chip id resolves in the registry.
- **Alternative (Q4):** use `meta.tags.slice(0, 4)` (Android · WebSocket · Compose · Room). That reads better for "WebSocket", but these are free-text tags, not registry techs with categories and colours.

### D4 — Poster: server-rendered isometric SVG (AC2, AC3)

**R:** `TeardownPoster` is a **server component** that projects `layoutProject(project)` slabs to an isometric SVG. It uses the same math as the S8 dev `EngineFallback` (cos/sin 30°, top + two side faces per slab), filled with `var(--bp-*)` so it follows the theme with no JS. `state` prop: `'exploded'` (default, D5) | `'imploded'`. It also takes `className` and an optional `title`.

- **Inline in the HTML:** it is in the first paint by construction, with no request and no decode. An inline SVG is **not an LCP candidate**, so LCP stays on the hero's server-rendered text.
- The S8 `EngineFallback` (dev route) is **not** refactored to use it. The dev route is an S8 surface, and a little duplicated projection math is cheaper than touching it.
- Size: 5 layers + 16 components × 3 polygons ≈ 63 polygons, a few KB of HTML.
- **Rejected:** a pre-rendered PNG/WebP poster (an extra request, becomes the LCP element, theme needs two files) · a canvas snapshot at build time (needs a headless GPU in the build).

### D5 — Hero: poster-first, idle-gated live hydration, ambient idle (AC2, AC5)

**R:** a reserved box, the poster underneath, and the live layer mounted later as an absolutely positioned layer over the poster. No box ever changes size.

1. **Server shell** (`hero.tsx`): `<figure>` with a fixed **aspect-ratio** box (`aspect-[4/3] sm:aspect-[16/9]`, width-driven, so no `vh` jitter). Inside it: `TeardownPoster` (absolutely positioned, `aria-hidden`), the `<HeroLive>` island (absolutely positioned, empty at first), and a `<figcaption>` holding the project name + tagline from the module and a CTA "Open the teardown →" to `/projects/websocket-inspector`. The person headline (`h1`, from `content/site.ts`) sits above the box: that is the LCP element (server text).
2. **Gate** (`hero-live.tsx`, a tiny client island that does not import three):
   - `prefers-reduced-motion: reduce` (query from `motion.reducedMotion.query`) → **never mount**. Static poster, no animation (AC2). A live `change` to reduce unmounts the live layer and the poster shows again.
   - `navigator.connection?.saveData === true` → never mount (4G courtesy).
   - otherwise wait for `load`, then `requestIdleCallback` (fallback `requestAnimationFrame` where it is missing; no timeout literals), then `import('./hero-stage')`, a separate chunk with three/R3F/xploder-react.
3. **Live layer** (`hero-stage.tsx`): `TeardownViewer` with `useTeardownViewer({ initial: 'exploded', project })`, **no panels, no tour, no toolbar**. It starts settled in the exploded state, which matches the poster, so nothing tweens on load (**no autoplay explosion**). It mounts at `opacity: 0`. On the first `onStats` callback (a frame has rendered), the live layer fades in and the poster fades out using the existing **`panelEnter`** duration/easing CSS variables from `motionCss()` (no literals, no new token; Q7). The canvas is transparent (S4), so the poster must fade out rather than stay underneath.
4. **Ambient idle** = the live view at rest: rendered on demand, theme-following (toggling the palette re-renders it live), resize-correct, **no timed motion, no tour, no explode**. The layer is `inert` (Q1). It has no tab stops and no pointer capture, which keeps the landing drill nav → cards short and stops mobile touch gestures from landing in the hero.
5. **WebGL unavailable / context loss** → `fallback={null}`. The first `onStats` never fires, so the poster simply stays.
6. **Accessibility:** the `<figure>` is named by its `figcaption`. The poster and live layer are both `aria-hidden`/`inert`, so axe and screen readers see one stable figure, before and after hydration.

- **CLS proof:** every box is reserved at SSR, and the live layer is `position:absolute; inset:0` in the reserved box, so opacity changes are not layout shifts. The site probe (D11) sums `layout-shift` from navigation to hydration + 3 s and must get exactly 0. Lighthouse checks CLS = 0 independently.
- **LCP/TBT:** the 3D chunk downloads after `load` + idle. The engine route at full eager load already scores 0.99–1.0 (baseline), so the idle-deferred hero has headroom.
- **Rejected:** mounting the live view at hydration (wasted main-thread time before the page is interactive) · IntersectionObserver gating (the hero is above the fold, so it adds nothing) · an interactive hero (Q1 alternative).

### D6 — Project route `/projects/[slug]`: workbench (AC1, AC3, AC7)

**R:** a server shell with reserved boxes, and a client workbench loaded eagerly (this route *is* the teardown).

- **Header (server):** "← All projects" link, `h1` = `meta.name`, tagline, a meta line (`year · role`), and `meta.links` (Source).
- **Workbench shell (server):** a stage box `h-[min(70svh,44rem)]` (`svh`: stable when the mobile URL bar collapses) holding `TeardownPoster` (exploded) + a loading placeholder, then a **toolbar box with a fixed block-size** (single row, `flex-nowrap`, horizontal scroll on narrow screens). The client workbench fills both boxes, so their sizes never change.
- **Workbench client** (`next/dynamic`, `ssr:false`): `TeardownViewer` with `useTeardownViewer({ initial: 'exploded', project })` + `useViewerPanels()` + the site registry. The poster fades out on first `onStats`, as in D5. Toolbar: Implode/Explode · Rotate left/right · Zoom out/reset/in · **Case study** (`aria-expanded`/`aria-controls` = `panels.ids.caseStudy`, as the playground does), so the case study is reachable from the page · Tour: flow selector (2 flows) · Play/Pause · Step · Stop. The layer-focus row is omitted (Q12).
- **Deep links:** the route itself is the deep link (a static `projects/websocket-inspector.html`, directly loadable, back/forward safe). No query/hash state is added (YAGNI; the probes drive states through the UI).
- **No-WebGL:** `fallback={<ProjectOutline project message="WebGL is unavailable…" />}`. **No-JS:** `<noscript>` holds `<style>` (hides the loading placeholder and the empty toolbar box) + `<ProjectOutline>`. This mirrors S8 (D8).
- **Draw calls:** the viewer is unchanged, so it renders 2 draw calls. This is measured on the production route by probe-side WebGL instrumentation (D11), so no debug data ships.
- **Rejected:** SSR of the toolbar (the hooks come from `xploder/react`, which imports three, and SSR'ing them is unproven) · a `vh`/`dvh` stage (resize shifts on mobile) · `?panel=` deep links (the brief asks for route-level deep links only).

### D7 — Per-route metadata (no OG images) (Deliverable 5)

**R:** the root `metadata` = `{ title: { default: SITE.title, template: '%s · ' + SITE.name }, description: SITE.description }`.

- `/` uses the default title.
- `/projects`: title `Projects`, description from `content/site.ts`.
- `/projects/[slug]`: `generateMetadata` → `title: meta.name`, `description: meta.tagline` (full sentence, < 160 chars; `meta.summary` is ≈ 230 chars).
- **No `openGraph`/`twitter` blocks or images** (S11 owns them).
- A unit test asserts the metadata for each route. The site probe checks the `<title>` and `<meta name=description>` in the exported HTML.
- The dev routes inherit the default title.

### D8 — Recruiter mode and no-JS fallbacks (AC3)

**R:** `/projects` is fully static and has no client code apart from `ThemeToggle`.

- Each project gets a `ProjectCard` in `list` variant: a small decorative poster thumbnail (`TeardownPoster`, `aria-hidden`) · name (an `<a>` to `/projects/<slug>` with the stretched-link pattern, so the whole card is clickable as one tab stop) · tagline · year · role · ≤ 4 chips · summary · "Source" (a secondary link, raised above the stretched link).
- Home cards use the `compact` variant (no thumbnail, no summary).
- **No-JS:** home is entirely server HTML (the poster stays, cards and about are readable). `/projects` is server HTML. The project route shows the poster + `<noscript>` `ProjectOutline`.
- `ProjectOutline` = the story (headline, problem, approach, outcome, metrics `<dl>`) + layers → components (`<ul>`: name and summary). It is used for no-JS and no-WebGL. It mirrors the S8 pattern (poster + list + message).
- **Evidence:** screenshots + DOM dumps with `javaScriptEnabled: false` and with WebGL disabled (D11).

### D9 — Gate extensions: axe, Lighthouse, weight, routes (AC4, AC5, AC6, AC7)

New modules only. The S8 tools are reused through their exports and are not rewritten.

- **Axe on production routes:** a new `tools/perf/src/site-axe.ts` + CLI `cli/a11y-axe-site.ts` (`pnpm a11y:axe:site <url> | --serve <dir>`). It reuses `AXE_TAGS` and `verdict()` from `a11y-axe.ts`. Matrix: routes `/` (hero revealed; plus a reduced-motion poster-only state), `/projects`, `/projects/websocket-inspector` (idle · case study open · detail open via the S8 keyboard navigator · tour step 1 via Step · no-WebGL) × light/dark × desktop/mobile. 0 serious and 0 critical, otherwise exit 6. Output: one JSON per route × palette × viewport + `axe-site-summary.json`.
- **Lighthouse:** `lighthouse-gate.ts` gets an opt-in `--categories performance,accessibility` flag. A new budget constant `A11Y_MIN_SCORE = 0.95` is asserted only when accessibility is requested, so the S3 default behaviour is unchanged. CI runs it on the preview root **and** on `projects/websocket-inspector`.
- **Weight:** CI runs the existing weight gate on both routes. The AC binds home only; the project route is about 0.5 MB, so the 3 MB gate on it costs nothing.
- **Routes:** the fixture-exclusion job adds `assert-absent "<preview>projects/does-not-exist"` (unknown slug → 404 on the real host). The existing dev-route asserts stay, for preview and production.
- **CI wiring:** a **new job** `a11y: axe (production routes)` in `perf.yml`: `pnpm build` → `a11y:axe:site --serve apps/web/out` → `site:probe --serve apps/web/out --ci`. The existing fixture-export a11y job stays byte-identical (Q10).
- **Regression proof** (as S8 R6): a deliberately broken commit in **app code only** (e.g. `aria-hidden="true"` on the nav containing links → `aria-hidden-focus`, serious) turns the new job red. The revert commit turns it green. Both run URLs go into the evidence.

### D10 — CLS carry-over fix (AC6, AC5)

**R:** fix it at the source: `ThemeToggle`'s placeholder and button get **one shared box-geometry class string** (`inline-flex h-11 w-11 shrink-0 items-center justify-center align-middle`). The pre-mount and post-mount boxes are then identical in any parent (block line box or flex item).

- No dev-route file changes. The fix lands in `app/theme-toggle.tsx`, which is shared app code and not a frozen surface. Its behaviour, labels and storage logic are unchanged.
- **Proof:** the site probe's `cls` group runs on `/dev/engine?fixture=a` (fixture export, desktop + mobile; before = 0.000637/0.000043 in `RFC-log-baseline.txt`, after must be **0**) and on every production route. A Lighthouse rerun on `/dev/engine` (evidence only) shows CLS 0.
- The nav reuses `ThemeToggle`, so this fix is also a precondition for landing CLS = 0.
- **Rejected:** bounding the shift as "dev-only" (the cause sits in a shared component the production nav needs) · changing the playground's wrapper `div` to `flex` (it fixes the symptom on one route only).

### D11 — Site probe: drill, first paint, CLS, reduced motion, no-JS, routes, draw calls (AC2–AC7)

A new `tools/perf/src/site-probe.ts` + CLI `cli/site-probe.ts` (`pnpm site:probe <url> | --serve <dir> [--group …] [--ci] [--out]`). It follows the S8 probe's exit-code contract, report shape and log lines.

| Group | Checks | AC |
|---|---|---|
| `drill` | Tab from the document start: skip link → name → Projects → About → Contact → Résumé → GitHub → LinkedIn → theme toggle → hero CTA → card(s). No traps, Shift+Tab reverses. Enter on the card → URL `/projects/websocket-inspector`, viewer ready, `h1` = `meta.name`. `goBack()` → URL `/`, the card link is reachable again. Plus: nav "Projects" → `/projects` in **1 activation**, every card href resolves with 200. | AC3 AC4 |
| `hero` | The SSR HTML contains the poster SVG inside the hero box (curl, no JS). Runtime: at FCP, the poster is visible and the live layer is absent or `opacity 0`. Live reveal happens after FCP. `data-xploder-state` stays `exploded` and the viewer is never `tweening` during 5 s idle. Lighthouse filmstrip frames saved. | AC2 |
| `cls` | `layout-shift` sum (buffered, every entry, including `hadRecentInput`) from navigation to hydration + 3 s on `/`, `/projects`, `/projects/websocket-inspector` (and `/dev/engine` against the fixture export), desktop + mobile, light + dark. Must be exactly 0. Entries are listed with sources. | AC2 AC5 AC6 |
| `reduced-motion` | With `reducedMotion: 'reduce'`: the hero never mounts a `<canvas>`, `document.getAnimations()` stays empty for 2 s, the poster is visible. On the project route: the S8 static twins (explode is instant), the poster swap uses no transition. App-surface matrix rows: hero reveal, poster fade, card hover. | AC4 AC2 |
| `nojs` | `javaScriptEnabled: false`: screenshots + DOM dumps of `/` and `/projects/websocket-inspector`. Poster SVG present and the readable list present (cards / `ProjectOutline`). Also a WebGL-disabled variant of the project route (outline + message). | AC3 |
| `routes` | `/projects/does-not-exist` → 404 with the not-found content. `/dev/engine` and `/fixtures/fps-calibration` → 404 on the production export. Each route's `<title>`/description matches the module. | AC3 AC6 D7 |
| `draws` | `addInitScript` wraps the WebGL2 draw entry points and counts draws per animation frame. Project route idle + exploded → **2**. Hero → **2**. | AC7 |

- **CI subset (`--ci`):** `drill`, `cls`, `routes`, `nojs`, `reduced-motion`. `hero` and `draws` run in the evidence pass; they need stable GPU timing.
- **App reduced-motion matrix:** `apps/web/test/site-motion-matrix.test.ts` lists every app-level animation with its reduced-motion twin (hero reveal → no mount; poster fade → none; card hover → colour only, no transform). The `reduced-motion` probe group asserts it in the browser. The S8 xploder matrix is untouched.
- Perf evidence uses the **dropped-frames** style only (`measureFps` `droppedFrames`/`intervalsMs` on a project-route explode toggle and on hero idle), reported, with **no new fps threshold**.

### D12 — Nav, about, contact (Deliverable 2)

- **Nav, single line at every width:** name (link `/`) · Projects (`/projects`) · About (`/#about`) · Contact (`/#contact`) · **Résumé** (`/resume.pdf`, styled as a button, `TODO(résumé)` until the file lands) · GitHub (icon link) · LinkedIn (icon link) · theme toggle. `flex-nowrap`. Below `sm`, the text-link group scrolls horizontally while the name and toggle stay pinned. Every target is ≥ 44 px. Icon links have `aria-label`s.
- The current page is marked with `aria-current="page"` on Projects (`/projects*`).
- A "Skip to content" link comes first. It is visually hidden until focused.
- **About strip** (`#about`): 2–3 sentences from `content/site.ts` (Q5).
- **Footer** (`#contact`): `mailto:vibing.murphy@gmail.com`, GitHub, LinkedIn, résumé. No form, no analytics, no third-party embeds.
- **Copy and names** live in `content/site.ts`; there are no strings in components (Q5, Q6).

### D13 — Frozen surfaces and seals (AC7)

**R:** S10 changes **no xploder source**. The first task seals S8 the way S8 sealed S7.

- **T1 = S8 seal:** `frozen-surface.s8.paths` + `.s8.manifest.json` + `generate-s8.sh` (base `99a94f2`) covering the S8 xploder files: `src/a11y/`, `src/react/a11y/`, `src/react/TeardownViewer.tsx`, `src/react/lettering/`, the S8-touched `src/react/panel/` files (`DetailPanel`, `PanelLayer`, `TechChips`, `useViewerPanels`), and the S8 tests (`a11y-*`, `lettering-face-names`). `frozen-surface.test.ts` gains the S8 block. Adding seal files under `packages/xploder/test/` is the established convention (S8 did the same for S7).
- **Whole-package guard:** at every gate, `git diff --stat 99a94f2 -- packages/xploder/src packages/xploder/package.json` must be **empty**. Evidence log at G1 and G4.
- Also untouched: `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`, the S8 `a11y-axe.ts` / `a11y-probe.ts` (imported, not edited), and the existing `perf.yml` jobs other than the lines added in D9.
- Check `git log` for foreign commits on the brief before each gate (memory: Mercure may commit).

---

## 3. Design brief for the spec kit (Stage 2 input)

- **spec.md:** user stories, one per deliverable cluster: US1 content module · US2 landing + hero · US3 project route · US4 recruiter list + no-JS · US5 metadata · US6 gates · US7 CLS carry-over. FRs map **1:1 to AC1–AC7**, with no invented acceptance criteria. Each FR has an independent test naming its executable check (test file or probe group).
- **plan.md:** the D1 route tree, the data flow `JSON → convert-content → .source.ts → defineProject(+site registry) → PROJECTS → cardModel / pages`, the hydration sequence diagrams (hero: SSR poster → load → idle → chunk → first frame → crossfade; project: SSR poster → hydrate → viewer → first frame → swap), the test harness (vitest units in `apps/web/test`, the `tools/perf` site probe and site axe with their unit tests, CI wiring), seals, and the evidence map per AC.
- **tasks.md:** one integration seam + one executable check per task, sized for Flash. Every task brief lists the forbidden paths (D13). Visual tasks attach mobile + desktop screenshots in light + dark. Perf tasks attach a Lighthouse summary + weight. Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, with defaults).
- **Styling rules for executors:** Tailwind utilities on palette roles (`bg-bg`, `text-fg`, `border-line`, `bg-surface`, `text-muted`, `tech-*`). No colour literals (`no-color-literals.test.ts`) and no motion literals (`no-motion-literals.test.ts`). Transitions only via `--motion-*` variables. Blueprint grid backgrounds reuse the existing `GRID_STYLE` pattern. Mono uppercase micro-labels as in S1/S7.

---

## 4. Implementation checklist (task sketch, refined in Stage 2)

| # | Seam | Executable check | AC |
|---|---|---|---|
| T1 | S8 seal (paths, manifest, generator, test block) + whole-package diff log | `pnpm --filter xploder test frozen-surface` green; diff log empty | AC7 |
| T2 | `scripts/convert-content.ts` + generated `.source.ts` + `content-fidelity.test.ts` | `pnpm --filter web test content-fidelity` green; `content:convert --check` exit 0 | AC1 |
| T3 | Site registry + `projects/index.ts` (`getProject`, `PROJECT_SLUGS`, `cardModel`) + `content-model.test.ts` + `prod-imports.test.ts` | web tests green (chip rank, cap of 4, no `xploder/fixtures` in prod) | AC1 |
| T4 | `ThemeToggle` box fix (D10) + `site-probe` skeleton with the `cls` group | `pnpm site:probe --serve out-fixtures --group cls` → `/dev/engine` CLS 0 (desktop+mobile); before/after log | AC6 |
| T5 | `(site)` layout: skip link, `SiteNav`, `SiteFooter`, `content/site.ts`, root metadata template, `not-found.tsx`; move `page.tsx` into `(site)` | build green; screenshots light/dark × mobile/desktop; `/dev/engine` DOM unchanged (snapshot) | D7 D12 |
| T6 | `TeardownPoster` + `ProjectOutline` + `ProjectCard` + `TechChipList` (server) + unit tests | web tests green; build green | AC1 AC3 |
| T7 | Landing: hero shell (poster, caption, CTA) + cards + about | screenshots; `site:probe --group cls,nojs` on `/` | AC1 AC2 AC3 |
| T8 | `HeroLive` gate + `HeroStage` (idle import, first-frame crossfade, reduced-motion/saveData skip) + motion matrix test | `site:probe --group hero,cls,reduced-motion` on `/` | AC2 |
| T9 | `/projects` list + `aria-current` | `site:probe --group drill,nojs` partial; screenshots | AC3 |
| T10 | `/projects/[slug]`: static params, `dynamicParams=false`, `generateMetadata`, header, workbench shell, `<noscript>` | build output lists only the known slug; `site:probe --group routes,nojs` | AC3 D7 |
| T11 | Workbench client: viewer + panels + toolbar + tour + case study + no-WebGL fallback | `site:probe --group cls,draws` on the project route; screenshots (exploded, case study, tour) | AC1 AC3 AC7 |
| T12 | `site-axe` module + CLI + unit tests (recorded violation → exit 6) | `tools/perf` tests green; `pnpm a11y:axe:site --serve apps/web/out` exit 0 | AC4 |
| T13 | `site-probe` remaining groups (`drill`, `hero`, `routes`, `draws`, `reduced-motion`, `nojs`) + unit tests | `tools/perf` tests green; full `site:probe --serve apps/web/out` exit 0 | AC2–AC7 |
| T14 | Lighthouse `--categories` + `A11Y_MIN_SCORE` + tests; `perf.yml` wiring (Lighthouse ×2, weight ×2, new a11y job, unknown-slug assert) | `tools/perf` tests green; draft PR: all jobs green | AC5 AC7 |
| T15 | Regression proof: broken app-only commit → new job red → revert → green | two run URLs | AC4 AC7 |
| T16 | Evidence run (§7 map) + résumé file-exists check + frozen diff logs | all files committed per EVIDENCE.md naming | AC1–AC7 |
| T17 | AC self-check table + PR ready for Murphy's validation | `evidence/AC-selfcheck.md`; CI green | AC1–AC7 |

**Order:** T1 → T2 → T3 → T4 → T5 → T6 → (T7 → T8) ∥ T9 → T10 → T11 → (T12 ∥ T13) → T14 → T15 → T16 → T17.

**Phase groups (Stage 3 STOP points):**
- **G1 foundations:** T1–T4 → STOP (seal, content fidelity, CLS carry-over fixed with before/after)
- **G2 site UI:** T5–T11 → STOP (Murphy click-through on `pnpm dev` in Orca's browser: nav, hero hydration, cards, `/projects`, the project route, both themes, reduced motion)
- **G3 gates:** T12–T15 → STOP (draft PR, new CI job, regression proof)
- **G4 evidence + ship:** T16–T17 → STOP + AC self-check

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| CI runners are slower than this Mac (benchmarkIndex ≈ 4200 locally), so TBT is higher on the hero/project route | hero 3D is idle-deferred; the project-route baseline has ~5 points of headroom; Lighthouse is measured on the Vercel preview (the real gate); escalate with the gate JSON if it fails, never retune the budget |
| The poster's isometric projection differs slightly from the live camera, so the crossfade "jumps" | both are exploded and centred; the crossfade masks the difference; Murphy judges it at G2. Fallback: an instant swap (Q7) |
| The hero's live layer flashes blank (transparent canvas before the first frame) | reveal only on the first `onStats` (a frame has rendered); the poster stays until then |
| Next 16 static export + route group + `not-found.tsx` + `dynamicParams=false` behave differently than expected | T5/T10 checks inspect `apps/web/out` (`404.html`, only the known slug); `serve.ts` and Vercel both serve `404.html` with 404; the fixture-exclusion job asserts it on the preview |
| A client-side navigation home → project → back leaves a WebGL context alive | R3F disposes on unmount; the `draws` + drill groups run across the back navigation; one context per page is asserted (`canvas` count) |
| The nav does not fit one line at 360 px | the text-link group scrolls horizontally; a screenshot at 360 px; a probe assertion that the nav height equals one row |
| Executors import `xploder/fixtures` or deep `xploder/src` in production | `prod-imports.test.ts` + the existing deep-import rules; listed as forbidden in every task brief |
| The generated `.source.ts` is formatted differently from Prettier, so `format:check` goes red | the converter runs Prettier's API on its output; `--check` compares formatted bytes |
| The S8 seal misses a file S8 changed | the seal paths come from `git diff --name-only 5b22987 99a94f2 -- packages/xploder/src packages/xploder/test`, a reproducible list in the generator comment |
| Mercure/foreign commits on the brief | `git log` check on `.specify/slices/slice-10-site-shell.md` + `KICKOFF-S10.md` before each gate |
| `public/resume.pdf` is still missing at the final gate | `TODO(résumé)` marker + a validation file-exists check listed for Murphy; the nav link renders regardless |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (facts, no decision needed):**
- **F1:** There is no S8 seal, so "frozen-surface checks S2–S8 remain empty" needs one → T1 (D13).
- **F2:** The S10 carry-over is caused by `ThemeToggle`'s placeholder box (`evidence/RFC-log-baseline.txt` §2). The current Lighthouse gate would **fail** the engine route on it (CLS 4.3e-5, exit 6). It is fixable at the source → D10.
- **F3:** The Lighthouse gate runs only the performance category. AC5's a11y ≥ 95 is ungated today → D9.
- **F4:** The engine has no ambient/idle-motion mode, and adding timed motion would need a new motion token (S2 frozen surface) → Q2.
- **F5:** An eager engine route already scores perf 0.99–1.0 on simulated mobile (local) → AC5 is feasible. CLS is the only failing budget, and D10 fixes it.

**Open questions (the default is applied unless Murphy says otherwise):**

1. **Q1 — Hero interactivity.** **Default: `inert` ambient view** (no tab stops, no pointer; the CTA leads into the full teardown). Alternative: a fully interactive hero (hover highlight, arrows rotate, S8 navigator tab stops between the nav and the cards).
2. **Q2 — Meaning of "ambient idle".** **Default: the live view at rest** (on-demand render, theme-live, no timed motion). Alternative: slow periodic rotation. That needs a new cadence token in `xploder/motion` (S2 frozen surface), so it would be a brief revision.
3. **Q3 — Initial state on the hero and the project route.** **Default: `exploded` poster + live view starting exploded** (no explosion plays on load; Implode/Explode stays on the project toolbar). Alternative: imploded at rest with an Explode button. The poster would then show the imploded stack (less informative).
4. **Q4 — Card chip rule.** **Default: the top-4 registry techs by component count** → Kotlin · Android · Kotlin Coroutines · Jetpack Compose. Alternative: `meta.tags[0..4]` → Android · WebSocket · Compose · Room.
5. **Q5 — Site identity copy** (nav name, title, role line, about text). **Default: name "Murphy", role line "Android engineer"**, and a 2–3 sentence about text drafted by the orchestrator from the project's role/summary, all in `content/site.ts` for Murphy to edit at G2.
6. **Q6 — LinkedIn URL** (the brief requires the link, but no URL is given). **Default: `content/site.ts` `linkedin` with a `TODO(linkedin)` marker** (same treatment as the résumé), plus a validation check that it is set before the final gate.
7. **Q7 — Hero/project poster → live transition.** **Default: a crossfade on the existing `panelEnter` duration/easing variables** (no new token; skipped entirely under reduced motion, because the live view never mounts). Alternative: an instant swap on the first frame.
8. **Q8 — AC1 "entirely from the converted content module".** **Default: every project-derived string and structure on both routes comes from the module.** Site chrome (name, about, contact, nav labels) comes from `content/site.ts`. The no-hand-copied-content test guards the boundary.
9. **Q9 — Project-route readable content.** **Default: S8 mirror.** `ProjectOutline` appears only under `<noscript>` and as the no-WebGL fallback. With JS + WebGL, the case-study panel and the S8 navigator carry it. Alternative: an always-visible outline below the workbench (duplicates the panel text).
10. **Q10 — CI shape.** **Default: a new job `a11y: axe (production routes)`.** The existing fixture-export job is left byte-identical. If branch protection lists required checks, Murphy adds the new job there.
11. **Q11 — Lighthouse a11y gating.** **Default: an opt-in `--categories performance,accessibility` flag + `A11Y_MIN_SCORE 0.95`.** CI passes it for both routes, and the S3 default invocation is unchanged.
12. **Q12 — Project toolbar scope.** **Default:** explode/implode · rotate · zoom · case study · tour (flow selector, play/pause, step, stop). The **layer-focus row is omitted** (not in the brief). Alternative: include it as in the playground.
13. **Q13 — Thumbnails on `/projects`.** **Default: a small static poster thumbnail per card on `/projects` only** (home already shows the hero poster).

---

## 7. Evidence map (Stage 3 end-contract)

| AC | Artifacts (in `.specify/features/site-shell/evidence/`) |
|---|---|
| AC1 | `T002-log-content-fidelity.txt` (vitest output + `--check`) · `T003-log-content-model.txt` · home/project screenshots |
| AC2 | `T008-log-site-probe-hero.txt` (FCP vs reveal timestamps, idle state) · Lighthouse filmstrip frames · `T008-log-cls-home.json` · reduced-motion screenshots + `getAnimations` log |
| AC3 | `T016-screenshot-nojs-{home,project}-{mobile,desktop}.png` + DOM dumps · no-WebGL screenshot · `routes` log (404s, card hrefs, 1-click path) |
| AC4 | `T016-axe-{route}-{light,dark}-{mobile,desktop}.json` + summary · `T016-log-site-probe-drill.txt` · reduced-motion matrix log |
| AC5 | `T016-lighthouse-summary-{home,project}.json` (median of 3, perf + a11y) · `T016-weight-{home,project}.json` |
| AC6 | `T004-log-cls-carryover.txt` (before 0.000637/0.000043 → after 0) · fixture-exclusion CI log excerpt (preview + production) |
| AC7 | CI run URLs (all jobs) · `T015-ci-regression-proof.txt` · `T016-log-frozen-diff.txt` (S2–S8 manifests + whole-package diff) · `T016-log-draws.txt` (2 draw calls on hero + project route) · dropped-frames `fps.json` |

---

## 8. Stage-1 hand-off

**WHAT MURPHY SHOULD TEST/VALIDATE**
1. The hero strategy (D5): poster first, idle-deferred live layer, `inert` ambient view, crossfade. Default: approve as written.
2. The route tree and recruiter path (D1, D8): `/` → nav "Projects" → `/projects` → card → `/projects/websocket-inspector`. Default: approve.
3. The CLS carry-over root cause and fix (`evidence/RFC-log-baseline.txt`, D10). Default: approve the source fix.
4. Open questions Q1–Q13 (§6). Default: every default applies.

**WHAT THE AGENT NEEDS FROM MURPHY**
1. Display name, title and role line for the nav/header/metadata (Q5). Default: "Murphy" / "Android engineer"; editable at G2.
2. LinkedIn profile URL (Q6). Default: a `TODO(linkedin)` marker until supplied, checked at final validation.
3. `apps/web/public/resume.pdf`, before final validation (brief). Default: `TODO(résumé)` marker + a file-exists check in the validation list.
4. If branch protection uses required checks: add `a11y: axe (production routes)` after G3 (Q10). Default: the job runs either way; no protection change by the agent.
5. Gate 1 verdict: `approved` (with any Q overrides) or feedback. Default: none; the orchestrator waits.

---

## 9. Gate log

1. **Gate 1 (Murphy, 2026-11-02, 5h 61%):** "use defaults", **approved**. Every §6 default applies (Q1–Q13). Murphy also challenged the orchestrator to improve on the defaults (→ R1–R10). Answers to §8:
   1. **Identity (Q5):** name **"Timur Haryo M"**, role line **"Android Engineer"**. Site title "Timur Haryo M — Android Engineer"; title template `%s · Timur Haryo M`. The orchestrator drafts the about text and Murphy edits it at G2.
   2. **LinkedIn (Q6):** `https://id.linkedin.com/in/timurharyo`. The `TODO(linkedin)` marker is dropped.
   3. **Résumé:** "use resume". Read as the brief's route: reuse the existing PDF, placed by Murphy at `apps/web/public/resume.pdf`. Until it lands, the nav link renders with the `TODO(résumé)` marker, and the file-exists check sits in the G4 validation list. No PDF was found on this machine, so the agent does not fabricate or place one.
   4. **Required checks (Q10):** Murphy adds `a11y: axe (production routes)` to branch protection once the job exists (after G3).

2. **Refinements (orchestrator self-review against the code, pre-approved by "i challenge you to add some improvement"). None changes an AC; each is either stricter or a better default:**
   1. **R1 — Poster framing equals the live camera framing.** The engine camera is true isometric and orthographic (`VIEW.baseAzimuth π/4`, `VIEW.elevation atan(1/√2)`; `xploder/layout`, public). Its screen projection is right = (x − z)/√2, up = y·√(2/3) − (x + z)/√6. That is **exactly** the S8 poster projection (x − z)·cos30°, (x + z)·sin30° − y, scaled uniformly by √(3/2). The poster therefore cannot be "close": it can be identical. `TeardownPoster` (D4) computes its `viewBox` the way `fitZoom` frames the camera: **centred on the world origin** (the camera looks at the origin, not at the bbox centre), with half-extents = the max projected half-extents over the 4 snap azimuths, and the `VIEW.fitMargin` margin. With `preserveAspectRatio="xMidYMid meet"` in the same box, the poster → live crossfade lines up. A unit test pins the projection identity and the framing rule. The site probe logs the silhouette overlap (IoU) of the poster and the first live frame as information (Murphy judges at G2; not a gate).
   2. **R2 — One shared 3D chunk.** `hero-stage.tsx` and `workbench-client.tsx` both import the viewer through one app module, `components/viewer/live-viewer.tsx` (the only app file that imports `xploder/react`). The bundler then emits **one** three/R3F/xploder chunk. Once the hero has hydrated on `/`, opening the project route reuses the cached code, which makes the home → teardown hop cheap on 4G. Internal links use `next/link`. Evidence: the build's chunk listing shows the single shared chunk (T011).
   3. **R3 — Hidden-tab gate.** The hero gate (D5.2) also waits for `document.visibilityState === 'visible'`, so a background tab never creates a WebGL context.
   4. **R4 — Résumé and link hygiene.** The Résumé link reads "Résumé" with a visually hidden " (PDF)" in its accessible name. All links open in the same tab (no `target=_blank`). External links carry no tracking parameters.
   5. **R5 — Strict CLS across soft navigation.** The drill (D11) also records `layout-shift` entries across the client-side navigation home → project → back, counting every entry including `hadRecentInput`. They must sum to 0. Lighthouse cannot see this, but users can.
   6. **R6 — 404 page recovers the recruiter.** `not-found.tsx` shows a short message plus the compact project cards (from the module) and links to `/` and `/projects`. A wrong link still lands one click from every teardown.
   7. **R7 — The converter stamps its source.** The generated `.source.ts` header carries the canonical JSON's SHA-256. The fidelity test re-hashes the JSON and compares, so a stale module fails with a message that names the cause.
   8. **R8 — `/projects` gets the same evidence as the other two routes.** It is in the axe matrix (D9), the `cls`/`nojs`/`routes` probe groups, and a local Lighthouse evidence run. CI Lighthouse stays on the two AC routes (keeps the job time down).
   9. **R9 — No-JS proof also from raw HTML.** Besides the JS-disabled screenshots, the `nojs` group parses the exported HTML files (`out/index.html`, `out/projects/websocket-inspector.html`) and asserts that the poster `<svg>` and the readable list are present in the bytes. This is a deterministic proof that no browser timing can fake.
   10. **R10 — `/projects` and cards render with zero client JS of their own.** Cards are server components. The only client islands on the site are `ThemeToggle`, `HeroLive` and the workbench loader. A test asserts that `components/project-card.tsx`, `tech-chip-list.tsx`, `teardown-poster.tsx` and `project-outline.tsx` carry no `'use client'`.

3. **Corrections found while preparing Stage 2:**
   1. **C1 — `as const` cannot satisfy `ProjectInput`.** zod input arrays are mutable, so a readonly `as const` literal is not assignable to them. D2's generated module is `export const websocketInspectorSource = { … } satisfies ProjectInput;` (no `as const`). Fidelity is unaffected.
   2. **C2 — App tests pin `app/page.tsx` and scan only `app/`.** `apps/web/test/package-consumer.test.ts` asserts that `app/page.tsx` exists and scans `app/` only. Moving the landing into `app/(site)/page.tsx` updates that one constant. A new block additionally scans `components/`, `content/` and `scripts/` with the same rules, so the new directories are not blind spots. These are app tests, not sealed. The colour and motion literal scanners already scan all of `apps/web`, so new files are covered automatically. They still get an explicit `S10_SOURCE_FILES` presence list (S7/S8 convention).
   3. **C3 — The production export must never contain the strings `dev/engine` or `fps-calibration`.** `fixture-exclusion.test.ts` asserts this over every file in `apps/web/out`. Site code (nav, footer, 404, metadata, comments that reach client bundles) must therefore never name the dev routes. This is listed under "Never" in tasks.md.

4. **Stage-2 gate (Murphy, 2026-11-02, 5h 78%):** "accept and approved all". R1–R10 and C1–C3 accepted. Murphy reports the résumé PDF as added.

5. **Stage-3 start: foreign commit on `main` (Merlin agent, `5aae743`), merged into the slice branch as `efb9410`.** The commit:
   - adds `apps/web/public/resume.pdf`;
   - adds the canonical **`.specify/content/site.json`** (identity, hero, about, projects, footer, meta);
   - amends the frozen brief: "Site copy (S10, FINAL) … canonical at `.specify/content/site.json`, wire it, do not invent copy"; the résumé is published as-is (no restyle/redaction).

   Consequences:
   1. **C4 — Site copy is converted, not drafted.** `content/site.ts` no longer holds hand-written copy. The T002 converter also turns `site.json` into a generated `content/site.source.ts` (`satisfies SiteCopy`, a local TS type; no new dependency), with the same fidelity test pattern (strict equality, `--check`, sha stamp) → new task **T002b**. `content/site.ts` derives `SITE` from it. The no-hand-copied-content scan (T003) also covers the `site.json` strings. The orchestrator's about draft is dropped. The hero gets `eyebrow`/`headline`/`subline` + primary/secondary CTAs from `site.json` (the secondary CTA "Skip the 3D — read the list" → `/projects` is a second one-click recruiter path). Metadata uses `meta.title`/`meta.description`/`meta.siteName`. The guard base for `.specify/slices`, `.specify/content` and the kickoff moves to `5aae743` (`guards.sh`).
   2. **Q14 — `site.json` vs Murphy's Gate-1 answers.** `site.json` has name "Timur Haryo Mahissanular" (goes by "Murphy"), role "Android engineer", meta title "Timur Haryo — Android engineer", siteName "Timur Haryo", and **LinkedIn `url: null`**. Murphy answered "Timur Haryo M" / "Android Engineer" / `https://id.linkedin.com/in/timurharyo`. **Default: `site.json` verbatim** (the brief now says FINAL, do not invent copy). The only exception is the LinkedIn URL: `site.json` leaves it null and Murphy supplied it, so it comes from Murphy's answer as the single documented override in `content/site.ts`, and the link is not dropped. Alternative: Murphy (or Merlin) updates `site.json` and the converter regenerates. Needed before T006 (G2); G1 is unaffected.

6. **G1 gate (Murphy, 2026-11-02, 5h 0%):** "Done, you can continue". **Q14 resolved in the canonical content**: Merlin commits `267c525` + `72dc34a` on `main` set the `site.json` LinkedIn URL (`https://id.linkedin.com/in/timurharyo`) and `meta.title` ("Timur Haryo — Software Engineer · Android & Developer Tools"). `site.json` is used **verbatim**, with no override in `content/site.ts`. Identity stays `name` "Timur Haryo Mahissanular" / `goesBy` "Murphy" / `role` "Android engineer", and `meta.siteName` is "Timur Haryo". `main` is merged into the slice branch at G2 start, `site.source.ts` is regenerated (the fidelity sha follows), and the guard base for brief/content moves to `72dc34a`.

7. **G2 feedback (Murphy, 2026-11-02): handled within G2 (kickoff: feedback → address in the current stage).**
   1. **Controls feel like a placeholder; make explode/implode, rotate, zoom, tour more interactive.** → **D6a — control dock** (task **T012a**). The flat button row becomes a dock attached under the stage. It has a primary Explode/Implode toggle (icon + label, pressed state) and icon buttons with `aria-label` + tooltip `title`: rotate ↺ ↻ as a group, zoom − / reset / + as a segmented group, and "Case study". Heights are fixed per breakpoint (2 rows < sm, 1 row ≥ sm), with **no horizontal scroll**. It is reserved by the server shell, so CLS stays 0.
   2. **"Frames in / Frames out / Play" are confusing; make the tour interactive while it plays.** → **D6b — Guided tour panel** (T012a). Its own card with reserved fixed height under the dock:
      - **route chooser**: one option per flow; title = `flow.label`, subtitle = `flow.description` (both from the content module);
      - **transport**: Start tour / Pause / Resume (icon + label), Prev step, Next step, Restart, and a "Step k of n" readout;
      - **step rail**: one chip per path component, with the name from the module. The current step is highlighted. **Click = jump** (public actions `stop()` + `step()`×(k+1) (+ `play()` if it was playing), the same sequence as S7's slab click-to-jump). **Hover/focus = `highlight(id)`**;
      - a **"Now" line**: the current component's name + summary (from the module).
      - The flow labels themselves ("Frames in", "Frames out") are **canonical content** (`websocket-inspector.json`, which the orchestrator never edits) → **Q15**. Chrome wording ("Guided tour", "Start tour", "Next step"…) is UI chrome.
   3. **Keep Play, recompose it** → covered by D6b.
   4. **Implode while the tour is playing → pause.** → the dock's toggle calls `actions.pause()` before `actions.implode()` when `tour.status === 'playing'` (app wiring only; engine unchanged) (T012a; smoke-asserted).
   5. **"No need to add my CV."** → **Résumé removed**: the nav and footer links are dropped, and `apps/web/public/resume.pdf` is deleted from the slice branch, so the export no longer serves `/resume.pdf` (the file stays in git history; restore = revert). This is a **Murphy-directed deviation from brief Deliverable 2** ("· Résumé ·") and the erratum's résumé line. It is not an AC (AC1–AC7 do not mention the résumé). Whether it counts as a brief revision is Murphy's vault call. `site.json` keeps `identity.resume` (canonical, unused). The T018 file-exists check becomes "not served" (T012b).
   6. **Header and footer: cleaner, tidier.** → **D12a** (task **T012b**):
      - **Header:** a monogram mark + `meta.siteName` (name text hidden < sm) on the left; text links Projects · About · Contact; a hairline divider; GitHub + LinkedIn icon buttons (the correct GitHub mark, both icons optically aligned); theme toggle. **One line with no scrolling at 360 px** (link targets ≥ 36×44, icon targets ≥ 36×44; WCAG 2.2 AA target size).
      - **Footer** (`id="contact"`): a two-column grid. Left: mark + `identity.name`, `identity.role · identity.location`, `footer.line`. Right: a "Contact" micro-label + a stacked list (mail icon + address, GitHub, LinkedIn). Bottom bar: © year + name, "Back to top". All copy from `site.json` except the chrome labels.
   7. **Q15 — flow labels.** Default: the UI shows the content labels unchanged with their descriptions as subtitles (no copy is invented). If Murphy wants new names, Merlin (or Murphy) updates `websocket-inspector.json` `flows[].label`, and the converter regenerates. Orchestrator suggestion: `capture-path` → "How a frame is recorded", `inspect-path` → "How you read it back".

8. **G2 feedback round 2 (Murphy, 2026-11-02): "love it" + 6 adjustments.**
   1. **Tour: keep each visited step's part name on the right, joined by its leader line (accumulating); no tile lettering, just dot + line.** **Escalated (Q16), not built in S10.** The S6-sealed overlay model (`src/overlay/model.ts` `overlayStateModel`: `if (tour.status !== 'idle') return emptyOverlayModel()`) deliberately clears every callout during a tour, and the tile lettering is S7/S8 (`PartLettering`, sealed). Building this means editing sealed S6/S7 files, which **breaks AC7 as written** ("frozen-surface checks S2–S8 remain empty"). An app-level copy of the projection (`VIEW` + rig azimuth/zoom + stage scroll) could draw its own leaders, but it would duplicate engine geometry and drift during rotate/zoom/scroll tweens, so it is rejected. Options: **(A)** a brief revision via Merlin (revision 1 of 2) that allows an additive overlay mode ("tour trail": callouts for visited path parts, emphasis on the current one; lettering hidden during the tour) with the S6/S7 manifests regenerated and justified in the same diff; **(B)** defer it to a follow-up engine-polish slice and ship S10 without it. **Orchestrator view:** the idea is good. It turns the tour into a growing legend, which explains the flow better than a lone dot. **Default: (B)** unless Murphy chooses (A).
   2. **Can't get back to the overview after starting the tour; single-flow case.** → an **"Exit tour"** control (`actions.stop()` → status `idle` → the overview and callouts return), always visible while the tour is not idle. With one flow, the chooser collapses to a single route header (task **T012d**).
   3. **Hover on a tile draws no leader.** → **app bug, root-caused:** after the reveal, the faded poster SVG stays on top of the viewer (opacity 0, `pointer-events: auto`) and swallows hover, wheel and clicks. S6 already draws the hover leader in column mode (`overlayHighlight`). Fix: the posters (hero + stage) are `pointer-events-none` and become `invisible` once revealed (a visibility change is not a layout shift) (T012d).
   4. **Route chooser wording.** → the "Frames in/out" labels are no longer shown. Each route reads **"MainActivity → Room store · 7 steps"** (first and last component names from the module + step count) with the content description beneath it. No copy is invented. A single flow shows the same header without a chooser (T012d). This supersedes Q15.
   5. **The zoomed stage can't be scrolled.** → same root cause as item 3 (the poster swallows the wheel). Fixed by item 3. The smoke asserts that a wheel over the stage scrolls the viewer at max zoom (T012d).
   6. **Play/Next/Prev/jump must ensure the exploded state.** → if `target === 'imploded'`, call `actions.explode()` before `play()`/`step()`/the jump sequence. S5 `play()` already explodes; this covers step/prev/jump (T012d).

9. **Q16 decided (Murphy, 2026-11-02): option (A), "change it here and re-seal it; give an explanation, I will send it to Merlin after S10 is done".** This is a Murphy-authorised **brief revision (S10 revision 1 of 2, pending Merlin's vault log)**. AC7's "frozen-surface checks S2–S8 remain empty" is read as: empty **except** the one approved S6 change below, re-sealed in the same slice with the reason recorded. The orchestrator does not reword the AC. The revision note for Merlin is `evidence/Q16-revision-note.md`.
   - **Change (D14, task T012e):** S6 `src/overlay/model.ts` only, additive:
     - `OverlayProject` gains optional `flows?: { id; path }[]`;
     - `overlayStateModel`'s `tour` parameter gains optional `flowId?`/`step?`;
     - while the tour is not idle **and** callouts are in `columns` mode **and** the active flow resolves, the model returns a **tour trail** instead of the empty model: the part callouts for the visited path components (`path[0..step]`), each with its leader to its slab anchor (the same geometry as `overlayHighlight`). The current step's callout is `emphasis: true` with the emphasis-role leader, the earlier ones use the normal leader role. There are no layer labels, dimension or title block. `shown: true`.
     - Every other case keeps the S6 behaviour (empty overlay during a tour): narrow/non-column modes, no flow, idle.
   - Untouched: `BlueprintOverlay.tsx` (it already passes `tour` {flowId, status, step} and the project incl. flows), lettering (already hidden during tours), the tour reducer, the trace/dot.
   - **Re-seal:** the S6 manifest is regenerated with the new base = the T012e commit and a note naming this revision. `frozen-surface.test.ts` S6 block → new base + note. `guards.sh`: `SURFACE-S6-OK` uses the new base. `XPLODER-SRC-OK` becomes "the only `packages/xploder/src` diff vs `99a94f2` is `src/overlay/model.ts`". The existing S6 test `overlay-model.test.ts` stays byte-identical (its "hides every annotation while a tour is not idle" case has no flow → still empty). The new behaviour is tested in a **new** `packages/xploder/test/overlay-tour-trail.test.ts`.

10. **G2 feedback round 3 (Murphy, 2026-11-02).**
   1. **Move "Exit tour" into a centred, more interactive menu.** The tour transport becomes one centred control cluster: Prev · **Play/Pause** (primary, larger, accent) · Next, flanked by Restart and **Exit tour**. Exit tour is shown inside the cluster while the tour is not idle and keeps its icon + label; the cluster stays centred at every width. The "Step k of n" readout sits centred under or next to it. Reserved heights stay fixed (task **T012f**).
   2. **The dock and tour panel sometimes render empty after a refresh or navigation.** → **bug, root-caused:** `workbench-client.tsx` resolves its portal targets with `document.querySelector` during the first render (a `useState` initializer). On a soft navigation or fast refresh, the client chunk can render before the sibling `[data-site-dock]` and `[data-site-tour]` boxes are in the DOM. The lookup then returns null, never retries, and nothing is portalled. Fix: resolve the targets **after commit** in `useLayoutEffect`, scoped to the component's own `[data-site-workbench]` (via a ref + `closest`), so a stale node from another page can never match. If they are missing, retry on the next animation frame until found (unmount cancels). A regression smoke repeats home → project soft navigations, back/forward and reloads, and asserts the dock + tour buttons every time, on both the export and `next dev` (StrictMode) (T012f).

11. **G2 feedback round 4 (Murphy, 2026-11-02).**
   1. **More spacing in the tour card; Play/Pause icon-only.** Larger padding and vertical rhythm between the route chooser, transport, step readout, rail and "Now" line. The primary transport button is icon-only (▶ / ❚❚) with a state-dependent `aria-label`/`title` ("Start tour" / "Pause tour" / "Resume tour") and `aria-pressed` while playing (task **T012g**).
   2. **Mode switch: Layers vs Flows** (Murphy's "Layer mode" / "Flow mode"; the clean names mirror the content's own `layers[]`/`flows[]` and the drawing's "5 layers" label). One **Explore** card under the dock with a centred two-tab switch (`role=tablist`, Left/Right/Home/End keys, roving tabindex, `aria-controls` → the tabpanel):
      - **Layers** (default): the overview (tour idle, full callouts). The panel lists one chip per layer ("1 Inspection UI · 4 parts", from the module); click/Enter toggles S5 layer focus (`toggleFocus`, `aria-pressed`). The line beneath shows the focused layer's `description` (from the module), or a short chrome hint when none is focused.
      - **Flows**: the guided tour (route chooser, centred transport, step rail, "Now" line), as built in T012a–f.
      - Switching to Layers calls `actions.stop()` (tour → idle); this **replaces the Exit tour button**, which is removed. Switching to Flows calls `actions.releaseFocus()`. The mode is local UI state; the default is Layers on every load.
      - Both modes render inside **one fixed-height reserved card** (no CLS). `<noscript>` hides the card as before.

12. **G2 feedback round 5 (Murphy, 2026-11-02).**
   1. **Layers mode with no layer selected: shrink the unused bottom space.** The Explore card drops its fixed height and sizes to its content. **CLS-safe by construction:** the server shell renders the card's initial state (Layers tab selected, chips, hint line) with a **shared presentational component** (no hooks) that the client also uses. On mount, the client portal takes over and the static copy is hidden, with identical geometry (same markup and classes). Every later height change (selecting a layer, switching to Flows) follows a user activation, so it is input-driven and excluded from CLS by definition; the load-to-hydration window stays strict 0 (`site:probe --group cls`). `<noscript>` still hides the card (task **T012h**).
   2. **Flows mode owns the exploded state.** Switching to Flows calls `actions.explode()` when the view is imploded. While Flows is active, the dock's Implode/Explode toggle is **disabled** (`disabled` + a `title` explaining "Switch to Layers to implode"). Switching back to Layers leaves the view exploded (no auto-implode). The mode state moves up into `WorkbenchClient`, so the dock and the Explore card share it. Pause-on-implode stays for safety but is unreachable from the UI while in Flows (T012h).

13. **G2 gate (Murphy, 2026-11-02, 5h 71%): "all good. go next if possible".** G2 approved after feedback rounds 1–5 (T012a–T012h). G3 starts. Notes carried into G3 task briefs, because the UI changed since tasks.md was written:
   - the nav no longer has a Résumé link; the hero has two CTAs (primary → project route, secondary → `/projects`);
   - the project page's case study opens from the dock button `[data-site-control="case-study"]`;
   - the tour is reached via the Explore card's **Flows** tab;
   - the Exit tour control no longer exists (switching to Layers stops the tour).

14. **G3 blocked on the executor (2026-11-02):** the first G3 dispatch (T013/T014/T015 in parallel) ended at once with **DeepSeek API `402 Payment Required: Insufficient Balance`** for all three. No file changed; the empty worktrees and branches were removed. This was neither a Flash failure nor a counted attempt; tier 1 is **unavailable**. Tier 1.5 is dormant (`OPENROUTER_API_KEY` unset). Per the standing escalation policy, the orchestrator **pauses and reports** and does not take over automatically. Options for Murphy: (a) top up the DeepSeek balance → resume with Flash; (b) "go" → the orchestrator executes G3 personally (Claude usage; G3 is mostly tooling: site axe CLI, site-probe groups, Lighthouse flag, CI wiring); (c) both (orchestrator starts, Flash resumes when funded).

15. **AC5 escalation: CI Lighthouse on the PR preview (2026-11-02, run 41404421018).** Home: **performance 0.89 (median) < 0.95 → exit 6**. LCP 963 ms, CLS 0 and accessibility 1 all pass. TBT is 426–639 ms on the runner (benchmarkIndex ~2300) vs ~30 ms locally. Cause: the hero's lazily loaded 3D chunk initialises inside the TBT window on slower CPUs. The project-route step was not reached. Evidence: `evidence/T016-log-ci-run1.txt` and `T016-lighthouse-summary-home-ci-fail.json`. Per EVIDENCE.md §6 there is no rerun and no threshold change. **AC5 is blocked until a design change lands.** Proposed fix (Murphy's call):
   - **(A, recommended)** the home hero hydrates on the **first user interaction** (pointermove/pointerdown/touchstart/scroll/keydown/focusin, whichever comes first) instead of `load` + idle. The poster stays until then. AC2 still holds (the poster paints first and the 3D hydrates after with CLS 0; reduced motion → never). Real mid-range phones also avoid a 3D init during load. Lighthouse never interacts, so the trace contains no 3D work.
   - Then measure the project route on CI. If it also misses (it loads 3D eagerly by design), apply the same "poster + outline until first interaction" pattern to the workbench, or chunk the init. That second step is decided on data.
   - **(B)** keep load + idle and look for main-thread savings in the 3D init (engine-side: frozen surfaces → a revision).

16. **§9.15 decided (Murphy, 2026-11-02, 5h 83%): option A.** After asking "regardless of the frozen engine, which is better?" and hearing the orchestrator's view (A for the decorative home hero; B-style init savings belong to a follow-up engine-perf slice for the project route), Murphy chose A.
   - The hero gate is now: reduced motion / Save-Data → skip; else `load` → visible → **first interaction** (pointermove/pointerdown/touchstart/wheel/scroll/keydown/focusin, captured passively on `window`) → idle → `import('./hero-stage')`.
   - Verified locally on the export: no canvas and no live state 4 s after load without input; one pointer move → `revealed`; strict CLS 0 (`site:probe --group cls`).
   - The project route is measured next on CI. If it misses, the decision follows the data (RFC §9.15 second bullet).

17. **CI run 2 (head `5512174`):** home **0.99** perf, a11y 1, LCP 913 ms, CLS 0 → **pass** (option A confirmed). Project route: **0.87** perf (fail, exit 6), a11y 1, LCP 908 ms, CLS 0. Everything else is green. Evidence: `evidence/T016-log-ci-run2.txt`. AC5 is still blocked, on the project route only. Proposed (Murphy's call): **(P1, recommended)** the same pattern on the teardown route. The poster and the server-rendered Explore card show immediately; the 3D workbench mounts on the first interaction (any pointer/touch/scroll/key) **or** on an explicit centred "Explore in 3D" button on the stage, so the affordance is visible on touch devices. The real init cost then lands after the visitor engages, never inside the load window. **(P2)** engine-side init savings (shader/scene init split across frames, smaller three build) as a follow-up engine-perf slice; probably not enough alone to reach 0.95 on the CI CPU.

18. **§9.17 decided (Murphy, 2026-11-02, fresh window 5h 25%): P1.** Tier 1 (Flash) is available again (a DeepSeek probe answered), so execution returns to Flash.
   - **D6c — interaction-gated workbench (task T012i):**
     - the project route renders the poster + the server-rendered Explore card at once; the workbench client chunk mounts on the **first interaction** (same event set as the hero) **or** when the visitor activates a centred **"Explore in 3D"** button `[data-site-control="explore-3d"]` on the stage (icon + label, ≥ 44 px, a visible affordance for touch);
     - while it loads, the button shows a busy state (`aria-busy`, label "Loading 3D…");
     - the reveal crossfade and fixed boxes are unchanged (CLS 0);
     - reduced motion does not block the workbench (it is the page's content; the S8 static twins apply);
     - no-JS and no-WebGL paths are unchanged.
   - **Tooling consequence:** the site probe and site axe trigger the project-route 3D by clicking `explore-3d` (and the hero by a pointer move) before waiting for `[data-xploder-ready]`.

19. **G3 follow-up (Murphy, 2026-11-02, 5h 44%):** "yes add". The orchestrator added `a11y: axe (production routes)` to the repository ruleset **"main: required checks"** (id 26115910, active, target `~DEFAULT_BRANCH`). Required checks are now: build (typecheck, lint, test, build) · secrets (gitleaks) · perf-gate: lighthouse (mobile) · perf-gate: weight (< 3 MB) · a11y: axe (production routes). Nothing else in the ruleset changed. `main` uses rulesets, not classic branch protection. The S8 job `a11y: axe (engine fixture export)` stays non-required, as before.
