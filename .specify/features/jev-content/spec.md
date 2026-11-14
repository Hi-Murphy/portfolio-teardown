# Feature Specification: S13 Project Data #2 — jev-toolkit (wiring)

**Feature dir:** `.specify/features/jev-content/` · **Slice:** S13-jev-content · **Created:** 2026-11-14 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-13-jev-content.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-14: all §10 defaults, §11)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Deliverables 1–5 appear as supporting requirements (SR) under the FR they serve and get task-level checks, not criteria of their own. Documented values (file names, field-trace table, probe steps, gate ids) come from the RFC and are referenced, not promoted to criteria.
>
> **Evidence doctrine (kickoff Hard Rule 8):** every claim attaches machine-made evidence per `.specify/EVIDENCE.md`: screenshots (mobile/desktop × light/dark) with `meta.json`, probe JSON/logs, test output, OG PNG + SHA-256 from two builds, sitemap and JSON-LD verification, Lighthouse/weight/axe summaries.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A visitor explores the JEV teardown (Priority: P1)

I open `/projects/jev-toolkit` on a phone or a desktop. I see the exploded view with its five layers and twenty parts. I tap a part and its panel opens. I start the guided tour and it walks one of the two flows to the end. On the phone, the parts are listed in the compact column.

**Why this priority:** the slice's mission ("prove it renders").

**Independent Test:** `site:probe --group teardown,routes,nojs,draws` on the production export, plus `pnpm evidence` screenshots in both palettes (RFC G3, G4, G12).

**Acceptance Scenarios:**

1. **Given** the production export, **When** `/projects/jev-toolkit` is requested, **Then** it returns 200 and the live workbench and the no-JS outline show 5 layers, 20 components and 2 flows, equal to the content module. _(AC1)_
2. **Given** the live workbench, **When** a component is activated, **Then** its panel opens. **When** each flow's tour is played, **Then** it reaches `ended`. _(AC1)_
3. **Given** a mobile viewport, **Then** the compact parts column is visible. _(AC1)_
4. **Given** the new teardown, **Then** the renderer issues 2 draw calls. _(AC5)_

---

### User Story 2 — The maintainer trusts that the content is the canonical content (Priority: P1)

I change nothing in the JSON by hand, and I can prove that the site's module is the JSON: same structure, same bytes stamped by SHA-256, and a test that would fail if they diverged.

**Why this priority:** kickoff Hard Rule 3 (fidelity test first) and Hard Rule 5 (content verbatim).

**Independent Test:** `content-fidelity.test.ts` (red before the conversion, green after) and `content:convert --check` (RFC G2).

**Acceptance Scenarios:**

1. **Given** the generated `jev-toolkit.source.ts`, **Then** it `toStrictEqual`s the JSON; the parsed project `toStrictEqual`s `parseProject(json)`; the header SHA-256 equals the JSON's; `--check` exits 0. _(AC2)_
2. **Given** a mutated copy of the JSON (top-level `meta.tagline`, and a nested component `summary`), **Then** strict equality fails. _(AC2)_
3. **Given** every `.specify/content/*.json` except `site.json`, **Then** each has a fidelity row, a converter entry and a `PROJECTS` entry. _(AC2, SR1.2)_

---

### User Story 3 — A visitor finds the project (Priority: P1)

On the home page and on `/projects` I see a JEV Benchmark card next to Scarlet Inspector, with its name, tagline and chips. Tapping either card opens the teardown. Nothing scrolls sideways on a 390 px phone.

**Why this priority:** Deliverable 3.

**Independent Test:** `site:probe --group cards,drill`, `home:probe --group structure,copy`, `home-sections.test.ts` (RFC G5).

**Acceptance Scenarios:**

1. **Given** `/` and `/projects`, **Then** each shows one card per project. The jev-toolkit card shows `meta.name`, `meta.tagline` and ≤ 4 chips, and links to `/projects/jev-toolkit`, which returns 200. _(AC3)_
2. **Given** the home page, **Then** the section order (`nav, hero, projects, about, contact, footer`) is unchanged, and websocket-inspector stays first (hero project). _(AC3, RFC §4)_
3. **Given** a 390 px viewport, **Then** `scrollWidth ≤ clientWidth` on `/`, `/projects` and the new route. _(AC3)_

---

### User Story 4 — A shared link and a crawler read the project correctly (Priority: P1)

Pasting `/projects/jev-toolkit` into a chat shows its own blueprint card. Crawlers find the route in the sitemap and read a `SoftwareApplication` whose every field comes from content.

**Why this priority:** Deliverable 4.

**Independent Test:** two clean builds + hashes + `seo:probe` (RFC G6, G7) and CI `seo: meta + og`.

**Acceptance Scenarios:**

1. **Given** two clean builds, **Then** `/og/projects/jev-toolkit.png` is 1200×630, ≤ 300 KB, and SHA-256-identical between them. _(AC4)_
2. **Given** the route HTML, **Then** canonical, `og:url`, `og:image` and `twitter:image` are absolute and point at the route and its card. _(AC4)_
3. **Given** `sitemap.xml`, **Then** it lists `/projects/jev-toolkit`. **Given** the route's JSON-LD, **Then** it validates as `SoftwareApplication` and each field matches the RFC §5 trace table. _(AC4)_

---

### User Story 5 — Nothing else changes, and nothing is invented (Priority: P1)

The site is as fast and accessible as before, the home hero still comes alive on its own, Scarlet Inspector's page behaves exactly as before, and no sentence on the new page was typed by anyone but the content author. JEV is shown as a third-party model, never as something the site owner built.

**Why this priority:** kickoff Hard Rules 5–7.

**Independent Test:** the RFC §7 gate matrix (G8–G18), the T-b/T-e scans, CI.

**Acceptance Scenarios:**

1. **Given** the preview, **Then** mobile Lighthouse ≥ 95 perf and ≥ 95 a11y on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; weight < 3 MB per route; axe 0 serious / 0 critical on all three. _(AC5)_
2. **Given** `/`, **Then** the eager hero reveals with zero input events. **Given** `/projects/websocket-inspector`, **Then** its normalised `<main>` equals the base and its probes stay green. _(AC5)_
3. **Given** the source tree and the export, **Then** the hand-copy scan has 0 hits, the framing sentence is present verbatim, and the "built JEV" deny-list has 0 hits. _(AC6)_
4. **Given** the PR head, **Then** every required check is green; frozen surfaces S2–S8 are empty; dev routes 404. _(AC7)_

---

### Edge Cases

- **Unknown tech id:** without the registry entry, parsing throws. The fidelity row (b) fails first, before any route work (RFC S4).
- **Converter drift:** someone hand-edits `jev-toolkit.source.ts`. Then `--check` and the SHA header assertion fail.
- **A third JSON appears in `.specify/content/`:** the completeness guards (fidelity + `PROJECT_SOURCES`) fail until it is wired everywhere.
- **Longest flow (8 steps):** the tour probe waits on `ended`, with a timeout scaled by step count.
- **Five parts in one layer** (Bench core) at 390/412 px: covered by screenshots and the `cards`/`teardown` scroll checks. Overflow is Sev-2 and escalated (no panel/engine change in scope).
- **Components without links** (the three Evidence stores): their panels render no link row, the same as any websocket-inspector component without links.
- **No-JS:** the outline lists all 20 components and both flows.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** "**AC1 — it renders.** `/projects/jev-toolkit` returns 200 and renders 5 layers, 20 components and 2 flows from the content module; a panel opens for a component; the guided tour runs to completion; the phone layout shows the compact parts column. Evidence: screenshots (mobile/desktop × light/dark) + probe output."
  - SR1.1 (Deliverable 2): the route renders the full teardown (layers, components, flows, panels, tour) through the existing `/projects/[slug]` route and workbench, unchanged.
- **FR2 (= AC2):** "**AC2 — fidelity.** A test asserts the converted module deep-equals `.specify/content/jev-toolkit.json` (strict equality + sha stamp, with a negative control), exactly as the websocket-inspector fidelity test does."
  - SR2.1 (Deliverable 1): the module is produced by `convert-content.ts` from the JSON; no field is hand-copied.
  - SR2.2 (Deliverable 5): the fidelity test lands before the route work (kickoff Hard Rule 3).
- **FR3 (= AC3):** "**AC3 — discoverability.** The project appears as a card on `/projects` **and** in the home Projects section with name, tagline and ≤ 4 chips; both link to the route; the home section's DOM order is unchanged by the addition; no horizontal scroll at 390 px."
  - SR3.1 (Deliverable 3): cards come from `cardModel()` and `ProjectCard`, unchanged; card order = `PROJECTS` order (RFC §4).
- **FR4 (= AC4):** "**AC4 — machine-readable.** `/og/projects/jev-toolkit.png` exists at exactly 1200×630, ≤ 300 KB, deterministic across two clean builds (identical SHA-256); canonical, `og:url`, `og:image`, `twitter:image` are absolute and correct; the route appears in `sitemap.xml`; JSON-LD `SoftwareApplication` validates with every field traced to content."
  - SR4.1 (Deliverable 4): all of it flows through the existing pipeline (`INDEXABLE_ROUTES` → `build-og.ts`, `routeMetadata`, `sitemap.ts`, `projectLd`), with no SEO code change.
- **FR5 (= AC5):** "**AC5 — no regression.** Mobile Lighthouse ≥ 95 perf and ≥ 95 a11y on `/`, `/projects` and the new route; CLS 0; weight < 3 MB per route; axe 0 serious/0 critical on all three; **2 draw calls** on the new teardown; the home eager hero still reveals with zero interaction (D-28 behaviour intact); `/projects/websocket-inspector` unchanged in behaviour."
  - SR5.1 (Deliverable 5): the gate matrix (RFC §7 G8–G14) runs on the final commit; the binding Lighthouse/weight numbers come from CI on the preview.
- **FR6 (= AC6):** "**AC6 — nothing invented.** Every string on the new route and its card resolves from the content JSON; a scan finds no hand-typed project copy; the JEV third-party framing is rendered exactly as written (no "built JEV" claim anywhere)."
  - SR6.1: the scans cover every project JSON (T-b) and the exported HTML/RSC (T-e).
- **FR7 (= AC7):** "**AC7 — CI and surfaces.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, fixture exclusion); frozen surfaces S2–S8 empty; dev routes still 404 in production."

### Key Entities

- **Canonical content:** `.specify/content/jev-toolkit.json` (frozen; schemaVersion 1; 5 layers / 20 components / 2 flows).
- **Generated source module:** `apps/web/content/projects/jev-toolkit.source.ts` (`jevToolkitSource`, SHA-256 header).
- **Parsed project:** `apps/web/content/projects/jev-toolkit.ts` (`jevToolkit: Project`, via `defineProject` + `SITE_REGISTRY`).
- **Project list:** `PROJECTS` in `apps/web/content/projects/index.ts` (app) and `PROJECT_SOURCES` in `tools/perf/src/project-sources.ts` (tooling), each guarded against `.specify/content/*.json`.
- **Tech `nodejs`:** `{ id: 'nodejs', label: 'Node.js', category: 'platform' }` in `SITE_REGISTRY` (RFC Q1).

## Success Criteria _(mandatory)_

AC1–AC7 above are the success criteria. Verdicts are recorded in `evidence/AC-selfcheck.md` with links to the evidence of each gate (RFC §7). No additional criteria exist.

## Assumptions

- Base for every before/after comparison: `3b829d0` (S13 freeze; product code equal to the S12 merge `408740f`). Frozen-surface baseline: `3aee8fc`.
- The executor (DeepSeek Flash 4.1) runs with the sandbox off for every task that builds or launches Chromium; writes are limited to the task worktree and `/tmp/s13-checks`.
- Binding Lighthouse and weight numbers come from CI on the Vercel preview of the slice PR; local runs are supplementary.
- Murphy runs no human-participant or tethered-phone tests; every check here is agent-runnable (Playwright, Orca browser for Murphy's optional visual look).
