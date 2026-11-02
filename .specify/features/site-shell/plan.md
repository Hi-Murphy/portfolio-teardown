# Implementation Plan: S10 Site Shell (Landing · Project Routes · Recruiter Mode)

**Feature dir:** `.specify/features/site-shell/` · **Branch:** `task/s10-site-shell` · **Date:** 2026-11-02 · **Inputs:** `spec.md`, `rfc.md` (approved; §9: Murphy answers, R1–R10, C1–C3)

## Summary

`apps/web` becomes the real site. Everything lives in **new app modules** plus a few small edits to existing app files: `ThemeToggle`'s box (D10), the root `metadata`, and moving the placeholder page into the `(site)` group.

- **Data layer** (`content/`): a generated TS module, converted 1:1 from the canonical JSON, validated by `defineProject` with a site registry at build time and proven equal to the JSON by a test.
- **UI** (`components/`): server components for the nav, footer, about, cards, chips, poster and outline. Three client islands only: `ThemeToggle`, `HeroLive` and the workbench loader. They share one lazily loaded live-viewer module (R2).
- **Routes** (`app/(site)/`): `/`, `/projects`, `/projects/[slug]` (static params, `dynamicParams=false`) + `app/not-found.tsx`.
- **Tools** (`tools/perf`, new modules): `site-axe` and `site-probe` CLIs. `lighthouse-gate` gains an opt-in `--categories` flag + `A11Y_MIN_SCORE`.
- **CI** (`perf.yml`): Lighthouse and weight on both routes, a new job `a11y: axe (production routes)`, and an unknown-slug 404 assert.
- **`packages/xploder/src` is not touched.** Only S8 seal files are added under `packages/xploder/test/`.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict (`noUncheckedIndexedAccess`), React 19.3, Next 16.4 App Router static export (`output: 'export'`), Tailwind v4, Node 24 |
| New deps | **none**. The converter uses the root `prettier`. The tools reuse `playwright`, `axe-core` and `lighthouse` from `tools/perf` |
| Tests | vitest (Node) in `apps/web/test/` (content, model, poster math, metadata, scanners); vitest in `tools/perf/test/` (site-axe verdicts, site-probe pure helpers, lighthouse flag); real browser: `site:probe`, `a11y:axe:site`, `perf:lighthouse`, `perf:weight`, `fps`, `evidence` (Playwright 1.64.1, Chromium 156) |
| Targets | fidelity strict-equal; axe 0 serious / 0 critical in every cell; strict CLS 0 on every site route + `/dev/engine`; Lighthouse median perf ≥ 0.95 and a11y ≥ 0.95, LCP < 2500 ms, CLS 0 every run; home < 3 MB; 2 draw calls; dropped frames reported (no fps literal) |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; `packages/xploder/src/**` + `packages/xploder/package.json`; the S2/S4–S8 manifests; `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`; `tools/perf/src/{a11y-axe,a11y-probe,engine-probe,panel-probe,presentation-snapshot}.ts` + their CLIs (import only) |
| Time base | No timers. The hero gate uses `load`, `requestIdleCallback` (fallback `requestAnimationFrame`) and `visibilitychange`. Transitions use `--motion-*` CSS variables only |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-007 quote AC1–AC7 verbatim. The supporting work maps to brief Deliverables 1–8 + the Murphy dependencies. Non-goals respected: no OG images, analytics, other projects' content, chip links, engine changes or form. |
| II. Static-only shell | Every route is pre-rendered (`generateStaticParams`, `dynamicParams=false`). No route handlers, server actions or runtime data. Contact is `mailto:`. |
| III. Performance is a feature | LCP = server text. The poster is inline SVG (no request). The hero 3D loads after `load` + idle and only when visible (R3). One shared 3D chunk (R2). Reserved boxes everywhere (CLS 0 by construction + proof). The baseline engine route already scores 0.99–1.0. |
| IV. Single motion source | One app transition (poster ↔ live crossfade) using the existing `panelEnter` variables. No new token. The literal scanners already cover all of `apps/web`. The reduced-motion twin = never mount. |
| V. Theme integrity | Palette roles / `--bp-*` only (poster, chips, cards). No colour literals. Theme-following poster via CSS variables, no JS. |
| VI. Evidence over assertion | Every claim has a machine artifact (spec Success Criteria table; tasks' Evidence lines). |
| VII. No secrets | Only public URLs (GitHub, LinkedIn, `mailto:` per the brief). Evidence uses `127.0.0.1` and public `*.vercel.app` hosts. gitleaks in CI. |

## Project Structure

### Documentation (this feature)

```
.specify/features/site-shell/
  rfc.md  spec.md  plan.md  tasks.md
  evidence/   RFC-log-baseline.txt, T0NN-*, G{1..4}-log-gate.txt, AC-selfcheck.md
```

### Source code (changes only)

```
apps/web/
  package.json                 + scripts: "content:convert": "node scripts/convert-content.ts"
  app/
    layout.tsx                 EDIT: metadata → { title: { default, template }, description } from content/site.ts
    page.tsx                   MOVED → app/(site)/page.tsx (rewritten)
    not-found.tsx              NEW (R6)
    theme-toggle.tsx           EDIT: shared box class for placeholder + button (D10) — behaviour unchanged
    (site)/layout.tsx          NEW: skip link, <SiteNav/>, <main id="main" tabIndex={-1}>, <SiteFooter/>
    (site)/page.tsx            NEW landing: <Hero/>, cards section, <AboutStrip/>
    (site)/projects/page.tsx   NEW recruiter list + metadata
    (site)/projects/[slug]/page.tsx  NEW: generateStaticParams, dynamicParams=false, generateMetadata, header, <Workbench/>
  content/
    site.ts                    NEW: SITE (name, role, title, description, about[], email, links)
    tech-registry.ts           NEW: SITE_REGISTRY = defineTechRegistry({ schemaVersion: 1, techs: [6] })
    projects/websocket-inspector.source.ts   GENERATED (C1: `satisfies ProjectInput`, no `as const`; R7 SHA header)
    projects/websocket-inspector.ts          NEW: defineProject(source, { registry, source })
    projects/index.ts          NEW: PROJECTS, PROJECT_SLUGS, getProject, cardModel
    poster.ts                  NEW (pure): posterGeometry(project, state) (R1)
  components/
    site-nav.tsx  site-footer.tsx  about-strip.tsx  skip-link.tsx
    project-card.tsx (variants compact | list)  tech-chip-list.tsx
    teardown-poster.tsx  project-outline.tsx
    hero/hero.tsx  hero/hero-live.tsx ('use client')  hero/hero-stage.tsx ('use client')
    workbench/workbench.tsx  workbench/workbench-loader.tsx ('use client')  workbench/workbench-client.tsx ('use client')
    viewer/live-viewer.tsx ('use client'; the ONLY app import of 'xploder/react') (R2)
  scripts/convert-content.ts   NEW
  test/
    content-fidelity.test.ts  content-model.test.ts  no-hand-copied-content.test.ts  prod-imports.test.ts
    poster.test.ts  site-metadata.test.ts  site-motion-matrix.test.ts  server-components.test.ts (R10)
    package-consumer.test.ts   EDIT (C2): PAGE → app/(site)/page.tsx; + block scanning components/, content/, scripts/
    no-color-literals.test.ts, no-motion-literals.test.ts   EDIT: + S10_SOURCE_FILES presence list
  public/resume.pdf            Murphy (TODO(résumé) until then)
packages/xploder/test/
  frozen-surface.s8.paths  frozen-surface.s8.manifest.json  frozen-surface.generate-s8.sh   NEW (T001)
  frozen-surface.test.ts       EDIT: append describe('frozen S8 surface')
tools/perf/
  package.json                 (no dep change)
  src/budgets.ts               EDIT: + A11Y_MIN_SCORE = 0.95
  src/lighthouse.ts            EDIT (additive): accessibility assertion when the category is requested
  src/cli/lighthouse-gate.ts   EDIT (additive): --categories <list> (default 'performance' = S3 behaviour)
  src/site-axe.ts  src/cli/a11y-axe-site.ts        NEW
  src/site-probe.ts  src/cli/site-probe.ts         NEW
  test/site-axe.test.ts  test/site-probe.test.ts  test/lighthouse.test.ts (EDIT: + flag cases)
package.json (root)            + "a11y:axe:site", "site:probe" scripts
.github/workflows/perf.yml     EDIT (additive): Lighthouse/weight 2nd route steps, new job, unknown-slug assert
```

## Guards (every task)

All must print OK. They are scripted in `.specify/features/site-shell/guards.sh` (the S8 line is skipped until T001 creates its paths file) and run in every task check (tasks.md "Format & rules").

```sh
git diff --quiet 99a94f2 -- .specify/slices .specify/KICKOFF-S10.md .specify/content && echo FROZEN-OK
test -z "$(git log --oneline 99a94f2..HEAD -- .specify/slices .specify/KICKOFF-S10.md .specify/content)" && echo BRIEF-HISTORY-OK
git diff --quiet 99a94f2 -- packages/xploder/src packages/xploder/package.json && echo XPLODER-SRC-OK
git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK
git diff --quiet 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) && echo SURFACE-S6-OK
git diff --quiet 5b22987 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s7.paths) && echo SURFACE-S7-OK
git diff --quiet 99a94f2 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s8.paths) && echo SURFACE-S8-OK   # from T001 on
git diff --quiet 99a94f2 -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom && echo DEV-ROUTES-OK
git diff --quiet 99a94f2 -- tools/perf/src/a11y-axe.ts tools/perf/src/a11y-probe.ts tools/perf/src/engine-probe.ts tools/perf/src/panel-probe.ts tools/perf/src/presentation-snapshot.ts tools/perf/src/cli/a11y-axe.ts tools/perf/src/cli/a11y-probe.ts tools/perf/src/cli/engine-probe.ts && echo S8-TOOLS-OK
```

**S8 seal list** (`frozen-surface.s8.paths`, base `99a94f2`). These are the xploder files S8 added or changed (`git diff --name-only 5b22987 99a94f2 -- packages/xploder`) minus the S7 seal files themselves:

```
src/a11y/
src/react/a11y/
src/react/TeardownViewer.tsx
src/react/lettering/PartLettering.tsx
src/react/lettering/faceNames.ts
src/react/panel/DetailPanel.tsx
src/react/panel/PanelLayer.tsx
src/react/panel/TechChips.tsx
src/react/panel/useViewerPanels.ts
test/a11y-announce.test.ts
test/a11y-contrast.test.ts
test/a11y-motion-matrix.json
test/a11y-motion-matrix.test.ts
test/a11y-navigator.test.ts
test/a11y-reveal.test.ts
test/lettering-face-names.test.ts
```

Note `"S08 seal (S10 RFC D13). S10 changes no xploder source; a later slice that changes a listed file regenerates this manifest in the same diff and states why."`.

## Content pipeline (RFC D2, C1, R7)

1. `node apps/web/scripts/convert-content.ts [--check]` (cwd-independent; paths resolved from `import.meta.url`):
   - reads `.specify/content/websocket-inspector.json` as bytes, then computes `sha256` and parses it;
   - renders `/* Generated by apps/web/scripts/convert-content.ts from .specify/content/websocket-inspector.json (sha256 <hex>). Do not edit; run pnpm --filter web content:convert. */`, then `import type { ProjectInput } from 'xploder';` and `export const websocketInspectorSource = <JSON.stringify(json, null, 2)> satisfies ProjectInput;`;
   - formats with `prettier.format(text, { ...(await prettier.resolveConfig(target)), filepath: target })`;
   - writes the result, or with `--check` compares bytes and exits 1 on a diff (printing the first differing line).
2. `websocket-inspector.ts`: `export const websocketInspector: Project = defineProject(websocketInspectorSource, { registry: SITE_REGISTRY, source: 'websocket-inspector' });`.
3. `projects/index.ts`:
   - `PROJECTS = [websocketInspector] as const`;
   - `PROJECT_SLUGS = PROJECTS.map(p => p.meta.slug)`;
   - `getProject(slug)`;
   - `cardModel(project)`: chips = count per tech id over every component; sort by count desc, then first appearance (layer order, then component order, then tech order); take 4; map through `SITE_REGISTRY` (label, category, color).
4. Fidelity test (`content-fidelity.test.ts`):
   - (a) `toStrictEqual(source, JSON.parse(bytes))`;
   - (b) `toStrictEqual(websocketInspector, parseProject(json, { registry: SITE_REGISTRY }))`;
   - (c) `--check` exits 0 (spawned with `process.execPath`);
   - (d) the header SHA equals the `sha256` of the bytes;
   - (e) a negative control: a mutated copy of the JSON is not strict-equal.

## Poster (RFC D4, R1)

`content/poster.ts` (pure, Node-tested) + `components/teardown-poster.tsx` (server).

- **Projection** (iso units, equal to the camera's up to the factor √(3/2)): `p(x, y, z) = [(x − z)·cos30°, (x + z)·sin30° − y]` (SVG y grows down).
- **Slab faces:** top + `+x` side + `+z` side, as in S8 `EngineFallback`. Painter's order: sort slabs by `x + y + z` ascending (far → near; the camera sits at +x, +y, +z — corrected at T005 review), so nearer faces paint last.
- **Framing (R1):**
  - `[u, v] = max over k ∈ 0..3` of the projected half-extents of `layout.bounds.<state>` at azimuth `VIEW.baseAzimuth + k·VIEW.snap` (the same corners loop as `fitZoom`), converted to poster units (×√(3/2));
  - margin: `width = 2u / (1 − 2·VIEW.fitMargin)`, `height = 2v / (1 − 2·VIEW.fitMargin)`;
  - `viewBox = [−width/2, −height/2, width, height]`: origin-centred like the camera's `lookAt(0, 0, 0)`.
- **Render:**
  - `<svg viewBox preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-site-poster>`;
  - fills `var(--bp-paper)` (sides) / `var(--bp-surface)` (top), stroke `var(--bp-line)`;
  - `vector-effect: non-scaling-stroke`; layers vs components differ like S8 (layers `--bp-line-muted` stroke).
- **Test** (`poster.test.ts`):
  - the projection identity against `VIEW` (camera right/up vectors × √1.5 equal `p` for random points, ε 1e-9);
  - the `viewBox` is symmetric about 0;
  - fitting matches `fitZoom` (same aspect, frame ⇒ same scale ratio);
  - painter order is stable;
  - the slab count is 21 (5 layers + 16 components).

## Hero (RFC D5, R1–R3; spec US2)

```
SSR HTML: <section data-site-hero>
            <h1>{SITE.name}</h1><p>{SITE.role} …</p>                          ← LCP (server text)
            <figure aria-labelledby=cap>
              <div class="relative aspect-[4/3] sm:aspect-[16/9]">           ← reserved box
                <TeardownPoster state=exploded class="absolute inset-0 …" />  ← first paint
                <HeroLive slug/>  → <div data-site-live data-site-live-state="idle" class="absolute inset-0" inert aria-hidden/>
              </div>
              <figcaption id=cap>{meta.name} — {meta.tagline} <Link href=/projects/slug>Open the teardown →</Link></figcaption>
            </figure>
HeroLive effect:
  reduced-motion (matchMedia(motion.reducedMotion.query)) → state "skipped" (listen: change → unmount/skip)
  navigator.connection?.saveData → "skipped"
  await load (document.readyState === 'complete' || once 'load')
  await visible (document.visibilityState === 'visible' || once 'visibilitychange'→visible)   (R3)
  await idle (requestIdleCallback ?? requestAnimationFrame)
  state "loading" → const { HeroStage } = await import('./hero-stage')   (single-flight, guarded by a mounted ref)
HeroStage → <LiveViewer project initial="exploded" onFirstFrame={reveal} fallback={null}/>
reveal → state "revealed": live layer opacity 0→1, poster opacity 1→0
         transition-property: opacity; duration var(--motion-duration-panel-enter); easing var(--motion-ease-panel-enter)
```

- Bound to the existing CSS variables generated by `motionCss()`. The exact variable names are confirmed in T008 from the `motionCss()` output. No literals.
- `LiveViewer` (`components/viewer/live-viewer.tsx`) wraps `useTeardownViewer({ initial, project })`, `TeardownViewer` and the optional `useViewerPanels()`. `onFirstFrame` fires once, from the first `onStats`.
- The hero gets no `panels`, no tour UI and no `onSettled` actions. `inert` on the live layer (Q1).

## Workbench (RFC D6; spec US3)

```
SSR: <div data-site-workbench>
       <div data-site-stage class="relative h-[min(70svh,44rem)] rounded border border-line">
         <TeardownPoster state=exploded class="absolute inset-0"/>
         <p data-site-loading class="sr-only">Loading teardown…</p>    (visually hidden: no box)
         <WorkbenchLoader slug/>   → dynamic(() => import('./workbench-client'), { ssr:false, loading: () => null })
       </div>
       <div data-site-toolbar class="h-14 …" />            ← reserved, filled by the client (portal-free: the client renders the stage overlay + toolbar inside one fixed grid)
       <noscript><style>[data-site-loading],[data-site-toolbar]{display:none}</style><ProjectOutline project/></noscript>
     </div>
```

- The loader is a client component. It renders `<WorkbenchClient>` absolutely positioned over the reserved stage **and** the reserved toolbar row (the workbench is a CSS grid with fixed rows), so neither box ever resizes.
- `WorkbenchClient`:
  - `LiveViewer` with `initial: 'exploded'`, `panels` (`useViewerPanels()`), `registry: SITE_REGISTRY`, `fallback=<ProjectOutline project message="WebGL is unavailable for this teardown."/>`;
  - the toolbar row: Implode/Explode · Rotate left/right · Zoom out/reset/in (disabled per `viewer.can`) · Case study (`aria-expanded`, `aria-controls={panels.ids.caseStudy}`) · flow selector (when `viewer.tour.showFlowSelector`) · Play/Pause · Step · Stop;
  - `flex-nowrap overflow-x-auto`, buttons `min-h-11`;
  - the poster fades on the first frame (same mechanism as the hero).
- **No-WebGL inside JS:** the fallback renders inside the stage box (scrollable, `overflow-y-auto`), so the box size stays fixed.

## Routes, metadata, nav (RFC D1, D7, D12, R4, R6)

- **`app/layout.tsx` metadata:** `{ title: { default: SITE.meta.title, template: '%s · ' + SITE.meta.siteName }, description: SITE.meta.description }` (from `site.json`; RFC §9.5 C4/Q14)`.
- **Route metadata:**
  - `/projects`: `{ title: 'Projects', description: SITE.projectsDescription }`;
  - `[slug]`: `generateMetadata({ params }) → { title: meta.name, description: meta.tagline }`. With Next 16, `params` is a Promise, so it is awaited.
- **Static params:** `generateStaticParams = () => PROJECT_SLUGS.map(slug => ({ slug }))`, `export const dynamicParams = false`. The page calls `notFound()` if `getProject` misses.
- **Nav:** `<header><nav aria-label="Primary">`, one line:
  - name → `/`;
  - `<div class="flex min-w-0 overflow-x-auto">` holding Projects (`aria-current="page"` on `/projects*`), About `/#about`, Contact `/#contact`, Résumé `/resume.pdf` (button style; sr-only " (PDF)"; `{/* TODO(résumé): Murphy places apps/web/public/resume.pdf */}`), GitHub and LinkedIn (icon links, `aria-label`);
  - `ThemeToggle`, pinned.
- **Footer:** `id="contact"`: email `mailto:`, GitHub, LinkedIn, résumé; `SITE.footer.line` + "© {year} {SITE.identity.name}" (year from the build date via `new Date().getFullYear()` at build, so static).
- **About:** `id="about"`: `SITE.about` paragraphs (orchestrator draft; Murphy edits at G2).
- **`not-found.tsx` (R6):** `<SiteNav/>`, an `h1` "Page not found", compact cards for `PROJECTS`, links to `/` and `/projects`, `<SiteFooter/>`.
- **Never** mention the dev route paths anywhere in site code (C3).

## Tools (`tools/perf`) (RFC D9, D11, R5, R8, R9)

- **`site-axe.ts` / `cli/a11y-axe-site.ts`** (`pnpm a11y:axe:site <url> | --serve <dir> [--out] [--routes]`):
  - imports `AXE_TAGS` and `verdict` from `./a11y-axe.ts` (read-only reuse);
  - matrix: routes × `{light, dark}` × `{desktop 1280×800, mobile 390×844}`. States:
    - `home` (wait for `data-site-live-state` ∈ revealed|skipped);
    - `home-reduced` (`reducedMotion: 'reduce'`);
    - `projects`;
    - `project-idle` (`data-xploder-ready="true"`);
    - `project-case-study` (click the Case study button, wait for `data-xploder-panel-ready="true"`);
    - `project-detail` (focus the viewer, Tab to the S8 navigator proxy, Enter);
    - `project-tour-step1` (click Step, wait for `data-xploder-tour="paused"`);
    - `project-no-webgl` (`getContext` stub as in S8);
  - output: `axe-site-<route>-<palette>-<viewport>.json` + `axe-site-summary.json`;
  - exit 6 on any serious/critical;
  - unit tests: summary aggregation; a recorded serious violation → exit 6; a state-list snapshot.
- **`site-probe.ts` / `cli/site-probe.ts`** (`pnpm site:probe <url> | --serve <dir> [--group …] [--ci] [--out]`):
  - groups `drill`, `hero`, `cls`, `reduced-motion`, `nojs`, `routes`, `draws` exactly as RFC D11 + R5/R9;
  - `--ci` = `drill,cls,routes,nojs,reduced-motion`;
  - `--serve` serves `apps/web/out` (and, for the `cls` carry-over, `--fixtures out-fixtures` adds `/dev/engine?fixture=a`);
  - pure helpers (shift summation, tab-walk verdict reuse from `a11y-probe.ts`'s exported `evaluateTabWalk`, draw-count per frame, HTML assertions) are unit-tested on recorded inputs;
  - **draw counting:** `addInitScript` wraps `WebGL2RenderingContext.prototype.{drawElements,drawArrays,drawElementsInstanced,drawArraysInstanced}` and buckets calls per `requestAnimationFrame` tick. The verdict = the mode over ≥ 30 rendered frames after `[data-xploder-ready="true"]` while a render is forced by a camera rotate (frames with 0 draws, i.e. on-demand idle, are excluded).
- **Lighthouse gate:** `--categories performance,accessibility` (comma list, validated against Lighthouse category ids; default `performance`). When `accessibility` is present, an assertion `accessibility >= 0.95 (median)` is added. Unit tests cover the parse + assertion.

## CI (`.github/workflows/perf.yml`) (RFC D9, Q10)

- **`lighthouse` job:**
  - the existing step gets `--categories performance,accessibility`;
  - **+ step** `pnpm perf:lighthouse "${url}projects/websocket-inspector" --categories performance,accessibility --out .evidence/ci/lighthouse-project`.
- **`weight` job:** **+ step** `pnpm perf:weight "${url}projects/websocket-inspector" --out .evidence/ci/weight-project`.
- **`fixture-exclusion` job:** **+ step** (PR) `assert-absent "${url}projects/does-not-exist"`.
- **NEW job `a11y: axe (production routes)`:**
  - checkout, pnpm, node, install, Playwright cache, install chromium;
  - `pnpm build`;
  - `pnpm a11y:axe:site --serve apps/web/out --out .evidence/ci/axe-site`;
  - `pnpm site:probe --serve apps/web/out --ci --out .evidence/ci/site-probe`;
  - upload artifact `a11y-site`.
- The existing `a11y: axe (engine fixture export)` job is byte-identical.

## Data flow

```
.specify/content/websocket-inspector.json ──convert-content──▶ content/projects/websocket-inspector.source.ts
        │ (fidelity test: strict-equal + --check + sha)                        │
        └──────────────────────────────▶ parseProject ≡ defineProject(source, SITE_REGISTRY) ──▶ PROJECTS
PROJECTS ─▶ cardModel ─▶ ProjectCard (/, /projects, 404)
         ─▶ posterGeometry ─▶ TeardownPoster (hero, cards[list], stage)
         ─▶ meta ─▶ generateMetadata / header        ─▶ ProjectOutline (noscript, no-WebGL)
         ─▶ LiveViewer (xploder/react, lazy shared chunk) ─▶ hero (inert) / workbench (panels + tour)
```

## Test map

| Check | Where | FR |
|---|---|---|
| fidelity (strict, parsed, `--check`, sha, negative control) | `apps/web/test/content-fidelity.test.ts` | FR-001 |
| card model (rank, ties, cap 4, registry resolution) | `content-model.test.ts` | FR-001 |
| no hand-copied project strings in `app/`, `components/` | `no-hand-copied-content.test.ts` | FR-001 |
| no `xploder/fixtures` in production code | `prod-imports.test.ts` | FR-001 |
| poster projection identity + framing | `poster.test.ts` | FR-002 |
| metadata per route | `site-metadata.test.ts` | Deliverable 5 |
| app motion matrix | `site-motion-matrix.test.ts` + probe `reduced-motion` | FR-004 |
| server components carry no `'use client'` (R10) | `server-components.test.ts` | FR-003 |
| package consumer incl. new dirs (C2) | `package-consumer.test.ts` | FR-007 |
| site axe gate | `tools/perf/test/site-axe.test.ts` + CI job | FR-004 |
| site probe helpers | `tools/perf/test/site-probe.test.ts` | FR-002…FR-007 |
| Lighthouse categories flag | `tools/perf/test/lighthouse.test.ts` | FR-005 |
| S8 seal + negative control | `packages/xploder/test/frozen-surface.test.ts` | FR-007 |
| production export excludes dev routes | `fixture-exclusion.test.ts` (unchanged) + CI asserts | FR-006 |

## Phase groups (Stage 3 STOP points)

- **G1 foundations:** T001–T004 → STOP (seal, content fidelity, model, CLS carry-over before/after)
- **G2 site UI:** T005–T012 → STOP (Murphy click-through on `pnpm dev` in Orca's browser: nav, hero hydration + crossfade, cards, `/projects`, project route, both themes, reduced motion, 404; about copy review)
- **G3 gates:** T013–T017 → STOP (draft PR, CI green incl. the new job, red → green regression proof)
- **G4 evidence + ship:** T018–T019 → STOP (AC self-check; Murphy final validation incl. `resume.pdf`)

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| Generated TS + fidelity test instead of importing the JSON | The brief asks for a TS module that is "not a hand-copied object" plus a fidelity test. A direct import makes both vacuous, and couples the build to `.specify/`. |
| Poster framing math (R1) instead of a bbox fit | The S8 bbox fit is centred on the bbox, but the camera is centred on the origin. Without R1 the crossfade visibly jumps. The math is already public (`VIEW`, `fitZoom` rule). |
| A new site probe instead of extending `a11y-probe.ts` | `a11y-probe.ts` is S8-frozen and fixture-coupled (≈ 3 000 lines). The site probe reuses its exported helpers read-only. |
| A new CI job instead of extending the S8 a11y job | Keeps the S8 job byte-identical and isolates the production-export build. Murphy adds it to the required checks. |
