# Feature Specification: S10 Site Shell (Landing · Project Routes · Recruiter Mode)

**Feature dir:** `.specify/features/site-shell/` · **Slice:** S10-site-shell · **Created:** 2026-11-02 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-10-site-shell.md` (frozen brief v1 + erratum `99a94f2`, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-02: §6 defaults, Murphy answers, refinements R1–R10, corrections C1–C3 in §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. The supporting work sits under the FR it serves and gets task-level checks, not criteria of its own:
> - the S8 seal;
> - the content converter;
> - the poster, cards, nav, hero gate and workbench;
> - the site axe CLI, the site probe, the Lighthouse category flag and the CI wiring.
>
> Documented values (chip rule, poster framing, axe state list, probe groups) come from the RFC and are referenced, not promoted to criteria.
>
> **Perf doctrine (binding, kickoff Hard Rule 5):** perf criteria use the dropped-frames style only. No task check anywhere in this feature contains a literal fps threshold. Lighthouse/weight budgets are the brief's own (`budgets.ts`), never retuned.
>
> **Evidence doctrine (binding, kickoff Hard Rule 6):** every visual, perf or a11y claim attaches machine-made evidence per `.specify/EVIDENCE.md`: screenshots + meta, Lighthouse JSON, axe JSON, CLS measurements, fidelity test output.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Recruiter skims the portfolio in seconds (Priority: P1)

I open the home page on my phone. I see who this is, what they do, and one project card: its name, a one-line pitch and a few tech chips. One tap on "Projects" gives me a plain list, and one tap on a card opens the project. Résumé, GitHub, LinkedIn and email are always one tap away.

**Why this priority:** the site's primary audience. The brief's recruiter path (Deliverables 2, 4).

**Independent Test:**
- `content-fidelity.test.ts`, `content-model.test.ts` (chip rule) and `no-hand-copied-content.test.ts`.
- Site probe `drill` + `routes` groups on the production export.
- Mobile/desktop screenshots, light and dark.

**Acceptance Scenarios:**

1. **Given** `/`, **When** the page loads, **Then** the project card shows `Scarlet Inspector`, `Every WebSocket frame, captured and inspectable.` and at most 4 tech chips (default rule: Kotlin · Android · Kotlin Coroutines · Jetpack Compose), all taken from the converted module. _(AC1)_
2. **Given** `/`, **When** the visitor activates "Projects" in the nav (one activation), **Then** `/projects` lists every project as a card that links to `/projects/<slug>`. _(AC3)_
3. **Given** the nav at 360 px width, **Then** it stays one line: name · Projects · About · Contact · Résumé · GitHub · LinkedIn · theme toggle. Every target is ≥ 44 px. _(Deliverable 2; evidence screenshot)_

---

### User Story 2 — Visitor sees the drawing instantly, then it comes alive (Priority: P1)

The first thing that paints is a crisp blueprint drawing of the project. A moment later it becomes the live 3D view, in the same place and at the same size, without anything on the page jumping. Nothing explodes by itself. If I asked my device for reduced motion, the drawing simply stays.

**Why this priority:** AC2. This is the site's signature and its main perf risk.

**Independent Test:**
- Site probe `hero` (poster in the SSR bytes, poster visible at FCP, live reveal after FCP, no tween during idle), `cls` and `reduced-motion` groups.
- The `site-motion-matrix.test.ts` app motion matrix.
- Lighthouse filmstrip frames.

**Acceptance Scenarios:**

1. **Given** `/` on a WebGL device without reduced motion, **When** it loads, **Then** the first paint shows the static poster in the hero box. The live view mounts only after `load` + idle while the tab is visible (R3). It reveals itself only after its first rendered frame, and the poster fades out in the same box. The layout-shift total from navigation to reveal + 3 s is exactly 0. _(AC2)_
2. **Given** the live hero, **When** 5 s of idle pass, **Then** the view stays `exploded`, never tweens, and runs no tour or timed motion (ambient idle = at rest). _(AC2)_
3. **Given** `prefers-reduced-motion: reduce`, **When** `/` loads and idles for 2 s, **Then** no `<canvas>` exists in the hero, `document.getAnimations()` is empty, and the poster is visible. _(AC2, AC4)_
4. **Given** WebGL unavailable or Save-Data on, **Then** the poster stays and no error surfaces. _(AC2, AC3)_

---

### User Story 3 — Visitor takes the project apart (Priority: P1)

On the project page I get the full teardown: the drawing in a large stage, with controls to explode/implode, rotate, zoom, play the tour and open the case study. The page is a link I can share and reload.

**Why this priority:** Deliverable 3, AC1 + AC3 (deep link, 404).

**Independent Test:**
- Site probe `routes` (deep link 200, unknown slug 404, metadata), `draws` (2 per frame) and `cls`.
- Screenshots of the exploded, case-study and tour states.

**Acceptance Scenarios:**

1. **Given** a direct load of `/projects/websocket-inspector`, **Then** the page shows the module's name, tagline, year · role and source link, and the teardown hydrates over the poster with no layout shift. _(AC1, AC3)_
2. **Given** the project page, **When** the visitor activates "Case study", **Then** the S7 case-study panel opens (`aria-expanded=true`). Tour Play/Step/Stop and the flow selector (2 flows) operate the S5 tour. _(Deliverable 3)_
3. **Given** `/projects/does-not-exist`, **Then** the host answers 404 with the site's not-found page (R6: project cards + links). _(AC3)_
4. **Given** the idle exploded teardown, **Then** the renderer issues 2 draw calls per frame. _(AC7)_

---

### User Story 4 — Recruiter without WebGL or JavaScript still gets everything (Priority: P1)

My locked-down laptop has no WebGL, or JavaScript is off. Home still shows the drawing, the cards, the about strip and the contact details. The project page still shows the drawing plus a readable outline of the story and every part.

**Why this priority:** AC3; mirrors the S8 fallback pattern.

**Independent Test:**
- Site probe `nojs`: JS-disabled screenshots + DOM dumps; raw-HTML assertions on the exported files (R9); a WebGL-disabled variant.

**Acceptance Scenarios:**

1. **Given** JS disabled, **When** `/` and `/projects/websocket-inspector` load, **Then** each shows the poster `<svg>` and a readable list: cards on home; on the project route, story + layers → components (`ProjectOutline`). The loading placeholder and the empty toolbar are hidden by the `<noscript>` style. _(AC3)_
2. **Given** JS on but WebGL unavailable on the project route, **Then** the viewer's fallback shows `ProjectOutline` and a "WebGL is unavailable" message. _(AC3)_

---

### User Story 5 — Keyboard and screen-reader visitors move through the site (Priority: P1)

I tab from the top: skip link, nav, the hero's "Open the teardown" link, the cards. Enter opens the project, and Back brings me home. No trap, and a visible focus ring everywhere. Axe finds nothing serious in either theme.

**Why this priority:** AC4.

**Independent Test:**
- `pnpm a11y:axe:site` (routes × light/dark × desktop/mobile, 0 serious / 0 critical).
- Site probe `drill` + `reduced-motion`.
- The CI job `a11y: axe (production routes)`, with a red → green regression proof.

**Acceptance Scenarios:**

1. **Given** `/` from the document start, **When** the visitor presses Tab repeatedly, **Then** focus visits: skip link → name → Projects → About → Contact → Résumé → GitHub → LinkedIn → theme toggle → hero CTA → card(s) → footer links. Shift+Tab reverses the sequence, and there is no trap. The hero live view has no tab stop (`inert`, Q1). _(AC4)_
2. **Given** focus on the card, **When** Enter is pressed, **Then** the URL is `/projects/websocket-inspector`, the viewer is ready, and `h1` = `Scarlet Inspector`. **When** the visitor goes back, **Then** the URL is `/`, the card is reachable again, and the layout-shift total across the round trip is 0 (R5). _(AC4)_
3. **Given** `/` and `/projects/websocket-inspector` in light and dark, desktop and mobile, **When** axe runs (plus the project states: case study, detail, tour step 1, no-WebGL), **Then** it reports 0 serious and 0 critical. _(AC4)_
4. **Given** reduced-motion emulation, **Then** every new app surface in the matrix (hero reveal, poster fade, card hover) has its static twin with 0 running animations. _(AC4)_

---

### User Story 6 — Reviewer trusts the numbers (Priority: P2)

On a mid-range Android profile, both routes score ≥ 95 for performance and accessibility, paint their largest content in under 2.5 s, never shift, and home stays under 3 MB. CI enforces all of it on every PR.

**Why this priority:** AC5 + AC7.

**Independent Test:**
- `pnpm perf:lighthouse <url> --categories performance,accessibility` on both routes (median of 3).
- `pnpm perf:weight` on both.
- The CI perf jobs.

**Acceptance Scenarios:**

1. **Given** the PR's preview, **When** the Lighthouse gate runs on `/` and `/projects/websocket-inspector`, **Then** median perf ≥ 0.95, median a11y ≥ 0.95, median LCP < 2500 ms, and CLS = 0 on every run. _(AC5)_
2. **Given** the preview, **When** the weight gate runs on `/`, **Then** the first load is < 3 MB. _(AC5)_

---

### User Story 7 — Nothing else breaks (Priority: P1)

The dev playground and the calibration fixture still 404 in production. The old page-load shift on the playground is gone. Every frozen engine, theme, panel and a11y file is byte-identical. The teardown still draws in 2 calls, and CI is fully green.

**Why this priority:** AC6 + AC7.

**Independent Test:**
- The guards (plan.md), the frozen-surface tests (S2–S8 manifests).
- Site probe `cls` on the fixture export's `/dev/engine` (before/after).
- The fixture-exclusion jobs, `gh pr checks`.

**Acceptance Scenarios:**

1. **Given** the production export and the PR preview, **When** `/dev/engine` and `/fixtures/fps-calibration` are requested, **Then** both return 404. _(AC6)_
2. **Given** the fixture export, **When** `/dev/engine?fixture=a` loads (desktop and mobile), **Then** the layout-shift total is 0. The before value from `RFC-log-baseline.txt` was 0.000637 / 0.000043. _(AC6)_
3. **Given** the PR head, **Then** every CI check is green: build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion, both a11y jobs. The S2/S4, S5, S6, S7 and S8 guards print OK, and the draw calls are 2. _(AC7)_

### Edge Cases

- **Reduced motion toggled while the live hero is mounted** → the live layer unmounts and the poster shows (no animation).
- **WebGL context lost after reveal** → the S8 `CanvasBoundary` renders the fallback. The hero passes `fallback={null}`, so the poster is shown again.
- **Background tab at load** → the hero waits for `visibilitychange` to visible (R3).
- **Back/forward cache restore of `/`** → the gate re-evaluates. There is no double mount: the single-flight import plus a per-mount guard prevent it.
- **Theme toggled before the hero has hydrated** → the poster follows via CSS variables. The live view reads the palette on mount.
- **360 px viewport** → the nav's text-link group scrolls horizontally, and the name and toggle stay pinned.
- **The canonical JSON changes after S10** → `content:convert --check` + the SHA stamp (R7) fail the fidelity test until the module is regenerated.
- **Résumé PDF not yet placed** → the link renders (`TODO(résumé)`), and the G4 validation list checks for the file.

## Requirements _(mandatory)_

### Functional Requirements (verbatim, 1:1 with the brief)

- **FR-001 (AC1):** `/` and `/projects/websocket-inspector` render entirely from the converted content module; the fidelity test (`module ≡ .specify/content/websocket-inspector.json`) is green; project cards show name, tagline, and ≤ 4 tech chips.
- **FR-002 (AC2):** poster-first hero: first paint is the static poster; the 3D hydrates after without layout shift (CLS 0); ambient idle only; `prefers-reduced-motion` → static poster, no animation; no autoplay explosion.
- **FR-003 (AC3):** recruiter path works without WebGL: `/projects` list reachable in ≤ 1 click from home; every card deep-links; unknown slug → 404; with JS disabled, home and project route show poster + readable list (evidence screenshots + DOM).
- **FR-004 (AC4):** axe on both production routes, light + dark: 0 serious, 0 critical; landing keyboard drill passes (nav → cards → project route → back); reduced-motion matrix extended to the new surfaces.
- **FR-005 (AC5):** mobile Lighthouse ≥ 95 perf / ≥ 95 a11y on both routes; LCP < 2.5 s; CLS = 0; home first load < 3 MB; evidence artifacts attached.
- **FR-006 (AC6):** the dev-only routes remain production-excluded (404 on the prod URL); the S10 CLS carry-over is fixed or bounded with evidence.
- **FR-007 (AC7):** full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion, axe gate extended); frozen-surface checks S2–S8 remain empty; 2 draw calls unchanged on the teardown.

### FR ↔ AC ↔ design ↔ story

| FR | AC | RFC design | Stories |
| --- | --- | --- | --- |
| FR-001 | AC1 | D2, D3, Q4, Q8, C1, R7 | US1, US3 |
| FR-002 | AC2 | D4, D5, Q1, Q2, Q3, Q7, R1, R3 | US2 |
| FR-003 | AC3 | D1, D6, D8, Q9, Q13, R6, R9, R10 | US1, US3, US4 |
| FR-004 | AC4 | D9, D11, D12, R5 | US5 |
| FR-005 | AC5 | D5, D9, Q11, R2, R8 | US6 |
| FR-006 | AC6 | D10, D9 (routes) | US7 |
| FR-007 | AC7 | D9, D11 (`draws`), D13, Q10, C2, C3 | US7 |

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
| --- | --- | --- |
| 1. Content module, converted 1:1, zod-validated at build time, fidelity test | FR-001 | RFC D2, C1, R7 |
| 2. `/` landing: poster-first hero, cards (name, tagline, ≤ 4 chips), about strip, contact footer, single-line nav incl. Résumé, GitHub/LinkedIn, theme toggle | FR-001, FR-002 | RFC D3, D5, D12, R1, R3, R4 |
| 3. `/projects/[slug]`: full teardown (engine + theme + panels + tour), deep-linked, unknown → 404, case study reachable | FR-001, FR-003, FR-007 | RFC D1, D6, Q3, Q12, R2, R6 |
| 4. Recruiter mode: `/projects` list (no WebGL), ≤ 1 click from home, cards link, no-JS fallback (poster + list) | FR-003 | RFC D8, Q9, Q13, R9, R10 |
| 5. Metadata: per-route `<title>`/description from project meta; **no OG images** | FR-001 (renders from the module) | RFC D7 |
| 6. Route a11y gate extension: axe on `/` and the project route in CI (light + dark), drill extended to the landing | FR-004, FR-007 | RFC D9, D11, Q10 |
| 7. CLS carry-over fixed or bounded | FR-006 | RFC D10 |
| 8. Perf on both routes | FR-005 | RFC D5, D9, Q11, R2 |
| Murphy dependency: résumé PDF at `apps/web/public/resume.pdf` | Deliverable 2 | brief; G4 validation list |
| Murphy dependency: contact = `mailto:vibing.murphy@gmail.com` + GitHub `https://github.com/TimurHaryo` + LinkedIn `https://id.linkedin.com/in/timurharyo` | Deliverable 2 | brief; RFC §9.1 |

Non-goals stay hard:
- no OG images (S11), no analytics, no DNS/domain/cutover (S16);
- no content for jev-toolkit or agent-fleet (S13/S15), no cross-project chip links (S14);
- no theme/engine/panel behaviour changes (frozen surfaces: **no `packages/xploder/src` change at all**);
- no pixel/papercraft theme, no résumé redesign, no contact form.

### Key Entities

- **Canonical content:** `.specify/content/websocket-inspector.json` (read-only, schema v1).
- **Generated source module:** `apps/web/content/projects/websocket-inspector.source.ts`:
  - `websocketInspectorSource satisfies ProjectInput`;
  - header: source path, SHA-256 of the canonical JSON, "generated — do not edit".
- **Parsed project:** `websocketInspector = defineProject(source, { registry: SITE_REGISTRY, source: 'websocket-inspector' })`.
- **Site registry:** `apps/web/content/tech-registry.ts`. 6 techs: kotlin, android, coroutines, jetpack-compose, room, websocket. Labels/categories as in the fixture registry.
- **Project index:** `apps/web/content/projects/index.ts`:
  - `PROJECTS: readonly Project[]`, `PROJECT_SLUGS`;
  - `getProject(slug): Project | undefined`;
  - `cardModel(project): { slug, name, tagline, chips: { id, label, category, color }[] }` (≤ 4).
- **Site copy:** `apps/web/content/site.ts`:
  - `SITE = { name: 'Timur Haryo M', role: 'Android Engineer', title, description, about: string[], email: 'vibing.murphy@gmail.com', links: { github, linkedin, resume: '/resume.pdf' } }`.
- **Poster model:** `posterGeometry(project, state) → { viewBox, slabs: { id, top, sideX, sideZ }[] }`. Pure, origin-centred, fit like `fitZoom` (R1).
- **DOM contract (new, app-level):**
  - `[data-site-hero]` with `[data-site-poster]` and `[data-site-live]` (`data-site-live-state="idle|loading|revealed|skipped"`);
  - `[data-site-workbench]` with `[data-site-stage]` and `[data-site-toolbar]`;
  - `[data-site-loading]` (hidden by `<noscript>`);
  - `[data-site-outline]` (`ProjectOutline`);
  - `[data-site-card="<slug>"]`.
- **Frozen manifests:**
  - unchanged: S2/S4 (`53b2b2b`), S5 (`f31600e`), S6 (`0b2c678`), S7 (`5b22987`);
  - **new in T001: S8 `frozen-surface.s8.manifest.json` (base `99a94f2`)**.
- **Evidence artifacts:**
  - `RFC-log-baseline.txt`;
  - `T0NN-log-*`, `T0NN-screenshot-*`, `T0NN-axe-*.json`, `T0NN-lighthouse-summary-*.json`, `T0NN-weight-*.json`, `T0NN-fps*.json`;
  - `AC-selfcheck.md`.

## Success Criteria _(mandatory)_

Success = AC1–AC7 each pass, with evidence recorded in `evidence/` and in the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
| --- | --- | --- |
| FR-001 | AC1 | fidelity test log (strict equality, parsed equality, `--check`, SHA stamp) · card-model test log · no-hand-copied-content scan log · home/project screenshots light/dark × mobile/desktop |
| FR-002 | AC2 | `hero` probe log (SSR bytes, FCP vs reveal timestamps, idle state, IoU info) · strict CLS JSON for `/` · Lighthouse filmstrip frames · reduced-motion screenshots + `getAnimations` log |
| FR-003 | AC3 | `nojs` screenshots + DOM dumps (home, project, light/dark) · raw-HTML assertions · no-WebGL screenshot + DOM · `routes` log (1-click path, every card 200, unknown slug 404) |
| FR-004 | AC4 | `axe-site-*.json` (routes × palettes × viewports) + summary · drill log (forward/back walk, Enter → route, back, strict CLS) · reduced-motion matrix log · CI run URLs red → green |
| FR-005 | AC5 | Lighthouse summaries for both routes (median of 3, perf + a11y + LCP + CLS) · weight JSON for both routes · CI step log excerpts |
| FR-006 | AC6 | CLS carry-over before/after log (fixture export `/dev/engine`, desktop + mobile) · fixture-exclusion CI excerpts (preview + production) |
| FR-007 | AC7 | `gh pr checks` (all green) · guard log (5 manifests + S8 negative control + empty `packages/xploder/src` diff) · `draws` log (2 per frame, hero + project) · dropped-frames `fps.json` (information) |

## Assumptions

- All RFC §6 defaults are accepted, and Murphy's answers + R1–R10 + C1–C3 apply (RFC §9).
- **No new dependencies:**
  - `prettier` (root devDependency) is used by the converter;
  - `axe-core` and `playwright` are already in `tools/perf`;
  - `jsdom` is already in `apps/web` (used only if a DOM test is needed for the hero gate).
- `next build` (static export) generates `out/404.html` from `app/not-found.tsx`. Vercel and `tools/perf` `serve.ts` both answer unknown paths with that file and status 404.
- Push and draft PR are used at the start of G3. Merge happens only on Murphy's command.
- Escalation: tier 1.5 (OpenRouter) is DORMANT and skipped with a record. After two tier-1 failures, the orchestrator pauses and reports with 5h usage, then executes personally on Murphy's go. No new task starts at ≥ 85% of the 5h window.
