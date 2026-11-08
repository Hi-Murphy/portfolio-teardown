# Feature Specification: S11.9 Home Composition

**Feature dir:** `.specify/features/home-composition/` · **Slice:** S11.9-home-composition · **Created:** 2026-11-08 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-11.9-home-composition.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved at Gate 1, 2026-11-08: all §11 defaults; refinements R1–R5 in §13)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Supporting requirements (SR) sit under the FR they serve and get task-level checks, not criteria of their own. Definitions the brief leaves open come from the approved RFC defaults. They are referenced here, not promoted to criteria.
>
> **Definitions on record (RFC Gate 1 defaults):**
>
> - **Approved section list** = `nav, hero, projects, about, contact, footer` (Order A, RFC §3; frozen in `g1-approved.txt`, sha256 `f64f0222…3811`). `nav` and `footer` are rendered by the shared layout and identified by their `banner` / `contentinfo` landmarks; the other four are page sections marked `data-home-section="<id>"`.
> - **From data** = the page renders the page-owned entries of `HOME_SECTIONS` (`apps/web/content/home-sections.ts`) through a typed registry. Reordering the array reorders the DOM, with no JSX edit (RFC §4.1).
> - **Project signal** = the hero caption's project name, or any `[data-site-card]` heading (RFC §8 AC2).
> - **Visible** = non-zero box, not inside `.sr-only`, computed opacity 1 and visibility `visible`, box fully inside the viewport `[0, 844]` with no scroll.
> - **Tap target** = every visible `a` / `button` on `/`, measured as **≥ 44 × 44 CSS px**. A stretched link is measured by its `::after` box (the card).
> - **Body text** (Q5) = running prose in `main`: hero subline and caption, card taglines, About paragraphs, the "More teardowns in progress." note, Contact rows. **Labels** (not body): hero eyebrow, tech chips, skills note. The shared footer's fine print is chrome meta.
> - **UI-control labels** (Q4) = "Skip to content", "Back to top ↑", the theme-toggle labels, `aria-label="Primary"`, chip-list `aria-label="Tech"`. They are allowlisted in the copy scan and printed with every run. Separators with no letters (`·`, `—`, `©`, `↑`) are also allowed.
> - **Keyboard order = visual order** = the forward Tab sequence starts at the skip link, and successive focus stops never move back in visual reading order (section index, then y, then x), at 390, 768 and 1440.
> - **Slow class** = a CI attempt whose Lighthouse runs all report `benchmarkIndex` in [1,900, 2,600] (S11.8 D1). Cap: 10 attempts.
> - **Eager-hero regression probe** = `regress-hero.sh` (RFC §8 AC4): `eager:probe /` live, `--reduced-motion` poster, `--save-data` poster, `site:probe` `hero-ssr-poster` + `hero-first-paint-is-poster`.
> - **12 screenshots** (Q8) = 390 / 768 / 1440 × light / dark × {full page, first viewport}, final state. The AC2 390×844 fold shot with box overlay comes on top of these.
> - **Cross-route ledger** = L1–L7 (RFC §9 + §13): the only rendered differences allowed on routes other than `/`. The `<main>` of `/projects` and `/projects/[slug]` stays byte-identical.
> - **Content edits** (R1–R3) = exactly three `site.json` changes, made by the agent with Murphy's go-ahead: the employer name redacted to 19 × U+2588 in `about.paragraphs[0]`, `meta.description` without the employer, and a new `contact.title`.
>
> **Evidence doctrine (kickoff Hard Rule 9):** every claim attaches its artifact per `.specify/EVIDENCE.md`. No secrets.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A recruiter gets the story in 15 seconds on a phone (Priority: P1)

A recruiter opens `/` on a phone and reads without scrolling. They see who this is (name, role), what the site is (headline), a project, and the button that opens a teardown.

**Why this priority:** the slice's mission.

**Independent Test:** `home:probe --group fold` at 390×844, plus the screenshot with box overlay.

**Acceptance Scenarios:**

1. **Given** the production export, **When** `/` loads at 390×844 without scrolling, **Then** the name, the role eyebrow, the `h1`, the primary CTA and a project signal are visible, and there is no horizontal scroll. _(AC2)_

---

### User Story 2 — The page reads in one deliberate order (Priority: P1)

The sections appear as approved: Nav, Hero, Projects, About, Contact, Footer. Each is non-empty. The order comes from one data list, so a future reorder is a one-line data change.

**Why this priority:** AC1, and the brief's first deliverable.

**Independent Test:** `home:probe --group order` at three widths; the unit test with a permuted list; the 1440 light full-page screenshot.

**Acceptance Scenarios:**

1. **Given** the export, **When** the probe walks `banner`, `main [data-home-section]` and `contentinfo`, **Then** the id sequence strictly equals `HOME_SECTIONS`, and `HOME_SECTIONS` strictly equals `g1-approved.txt`. _(AC1)_
2. **Given** `HOME_SECTIONS` permuted in a unit test, **When** the page renders, **Then** the DOM follows the permutation. _(AC1)_
3. **Given** a section added, removed or swapped (negative controls), **When** the probe runs, **Then** it fails. _(AC1)_

---

### User Story 3 — Every word comes from content (Priority: P1)

Murphy edits `site.json` and the page changes. No component carries its own product copy.

**Independent Test:** `home-copy.test.ts` (AST scan), `home-copy-mutation.test.tsx` (sentinel render), `home:probe --group copy` (rendered text).

**Acceptance Scenarios:**

1. **Given** the home components, **When** the AST scan runs, **Then** no `JsxText` or text-bearing literal exists outside the printed allowlist. _(AC3)_
2. **Given** every home string in `SITE` suffixed with a sentinel, **When** `HomePage` renders, **Then** every sentinel appears and no original string remains. _(AC3)_

---

### User Story 4 — The eager hero and the gates do not move (Priority: P1)

The teardown still appears by itself after load. Reduced motion and Save-Data still show the poster. Performance, accessibility and weight stay inside their gates.

**Independent Test:** `regress-hero.sh` after every task; the final gates; the slow-class run.

**Acceptance Scenarios:**

1. **Given** the final export on a slow-class attempt, **When** `/` loads with zero interaction, **Then** `data-site-live-mode="eager"` and the canvas reveals ≤ 2.5 s. _(AC4)_
2. **Given** reduced motion, or Save-Data, **When** `/` loads, **Then** the poster stays and no canvas mounts. _(AC4)_
3. **Given** the final export, **When** the gates run, **Then** CLS 0, Lighthouse ≥ 95 perf and ≥ 95 a11y, axe 0 serious and 0 critical, weight < 3 MB, 2 draw calls. _(AC4)_

---

### User Story 5 — It holds at every width and palette (Priority: P2)

On a phone, a tablet and a desktop, in light and dark, nothing overlaps, clips or scrolls sideways. Targets are big enough to tap, body text is ≥ 16 px, and contrast passes AA.

**Independent Test:** `home:probe --group responsive` × 6 cells; axe `color-contrast` in both palettes; the 12 screenshots.

**Acceptance Scenarios:**

1. **Given** each of 390 / 768 / 1440 × light / dark, **When** the probe runs, **Then** it finds no overlap, no clipping and no horizontal scroll, every tap target is ≥ 44 × 44, every body element is ≥ 16 px, and there are 0 contrast violations. _(AC5)_

---

### User Story 6 — Screen-reader and keyboard users get the same structure (Priority: P2)

**Independent Test:** `home:probe --group structure` at three widths.

**Acceptance Scenarios:**

1. **Given** `/`, **When** the outline and landmarks are read, **Then** there is one `h1`, one `h2` per page section in order and no skipped level; the landmarks are `banner`, `main` and `contentinfo`, plus named regions per section. _(AC6)_
2. **Given** a keyboard user, **When** they press Tab from page load, **Then** the skip link is first and focus follows visual order. _(AC6)_

---

### User Story 7 — Nothing else moves (Priority: P2)

**Independent Test:** `guards.sh`, the cross-route diff, CI.

**Acceptance Scenarios:**

1. **Given** the PR head, **When** CI runs, **Then** all required checks are green. _(AC7)_
2. **Given** the final export vs the T002 baseline export, **When** other routes are diffed, **Then** only ledger lines L1–L7 differ, and the `<main>` of `/projects*` is byte-identical. Dev routes 404; the route list is unchanged; frozen surfaces S2–S8 are empty. _(AC7)_

### Edge Cases

- **Zero projects:** "More teardowns in progress." shows once (as today), and Projects is still non-empty, so AC1 holds.
- **More than one project:** the note tile takes the next grid cell; with an even card count it wraps to a row of its own.
- **Browser without `:has()`:** the footer contact list is not hidden on `/` (R4). The duplicate is harmless and matches today's page. The probe runs on Playwright Chromium, which supports `:has()`.
- **`NEXT_PUBLIC_GATED_HERO=1` build:** the composition is identical; `regress-hero.sh` is not run against it (the gated hero is not this slice's default). `site:probe` hero checks stay mode-aware (S11.8 R9).
- **Long name:** `identity.name` wraps at 390; the fold budget is measured, not assumed.
- **JS disabled:** all sections are static SSR. The `site:probe` `nojs` group stays green.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** **section set and order.** `/` renders exactly the approved section list, in the approved order, from data (not reordered JSX). A DOM-order probe asserts the sequence; a full-page screenshot at 1440 light shows every section non-empty and in order. Any section removed or added versus the approved list fails the probe.
  - SR1.1 `HOME_SECTIONS` data module + typed registry; `page.tsx` contains no hand-placed section order.
  - SR1.2 `home:probe` order group with negative controls (add, remove, swap).
  - SR1.3 `g1-approved.txt` equals `HOME_SECTIONS` (unit test).
- **FR2 (= AC2):** **the 15-second read.** At 390×844 (above the fold, no scroll): name, role, the hero headline and at least one project signal are visible; no horizontal scroll; the primary CTA is reachable without scrolling. Evidence: screenshot + DOM probe with measured element boxes.
  - SR2.1 Hero identity line from `identity.name` (Q9).
  - SR2.2 `home:probe` fold group with a box overlay screenshot.
- **FR3 (= AC3):** **copy fidelity.** Every product string on `/` resolves from `site.json` or project content — a scan proves no hand-typed copy in the home components (same idea as the existing no-literal scans). Changing a string in `site.json` changes the page.
  - SR3.1 Content edits R1–R3 (redaction, description, `contact.title`), regenerated `site.source.ts`, extended `SiteCopy`.
  - SR3.2 Nav and footer labels wired to content (L5, renders identically).
  - SR3.3 AST scan, rendered scan and mutation test, each with a negative control (RFC §7).
- **FR4 (= AC4):** **zero regression.** Eager hero intact (`data-site-live-mode="eager"`, reveal ≤ 2.5 s with zero interaction on the slow class), poster first paint, reduced motion → poster, Save-Data → poster; CLS 0; Lighthouse ≥ 95 perf and ≥ 95 a11y; axe 0 serious, 0 critical; weight < 3 MB; 2 draw calls.
  - SR4.1 `eager:probe --save-data`.
  - SR4.2 `regress-hero.sh` after every task; any failure = STOP.
  - SR4.3 Hero figure subtree byte-frozen (markup snapshot test).
  - SR4.4 `home-composition.yml` slow-class measurement (temporary, deleted before merge).
- **FR5 (= AC5):** **responsive composition.** At 390 / 768 / 1440 in light and dark: no overlap, no clipping, no horizontal scroll; tap targets ≥ 44 px; text ≥ 16 px body; contrast AA in both palettes. Evidence: 12 screenshots.
  - SR5.1 Body prose → 16 px (hero caption, card tagline L4, About paragraphs, note, Contact).
  - SR5.2 Nav targets 44 × 44 (L2) and footer brand link 44 px tall (L3).
  - SR5.3 `home:probe` responsive group × 6 cells.
- **FR6 (= AC6):** **structure and a11y.** One `h1`, ordered `h2` per section (no skipped levels), labelled landmarks (`header`/`main`/sections/`footer`), skip link still the first focusable element, keyboard order equals visual order.
  - SR6.1 Each page section is `section[aria-labelledby]` (hero → `h1`); Contact gets an `h2` (`contact.title`).
  - SR6.2 `id="contact"` moves to the home Contact section (L1); the footer contact list is hidden on `/` by CSS (L6, R4).
  - SR6.3 `home:probe` structure group (outline, landmarks, tab walk, visual order).
- **FR7 (= AC7):** **CI and surfaces.** All required checks green (build, gitleaks, `seo: meta + og`, Lighthouse, weight, axe production routes, fixture exclusion); dev routes still 404 in production; frozen surfaces S2–S8 empty; no new routes.
  - SR7.1 `guards.sh`: allowed paths, frozen surfaces, `site.json` key diff = R1–R3 only, route list, cross-route diff vs the T002 baseline.

### FR ↔ AC mapping

| FR | AC | Proven by | Tasks |
|---|---|---|---|
| FR1 | AC1 | `home:probe --group order` (3 widths) + negative controls; `home-sections.test.ts` (permutation, G1 list); 1440 light full-page shot | T003, T005, T012 |
| FR2 | AC2 | `home:probe --group fold` boxes + overlay shot at 390×844 (light, dark) | T003, T006, T012 |
| FR3 | AC3 | `home-copy.test.ts`, `home-copy-mutation.test.tsx`, `home:probe --group copy` | T001, T009, T010, T011 |
| FR4 | AC4 | `regress-hero.sh` every task; `site:probe --group cls,draws`; `perf:lighthouse`; `perf:weight`; `a11y:axe:site`; slow-class `home-composition.yml` | T003, T004, every task, T012, T013 |
| FR5 | AC5 | `home:probe --group responsive` × 6; axe contrast; 12 shots | T006–T010, T012 |
| FR6 | AC6 | `home:probe --group structure` × 3 widths | T005, T009, T012 |
| FR7 | AC7 | CI run URL; `guards.sh`; cross-route diff; `site:probe --group routes`; `fixture-exclusion.test.ts` | T002, T013 |

### Key Entities

- **`HOME_SECTIONS`:** the ordered list of section ids; the single source of the home order.
- **Section registry:** `Record<PageSectionId, () => ReactElement>`, complete by type.
- **`SiteCopy.contact`:** `{ title: string }` (new, R3).
- **Cross-route ledger:** L1–L7 with the routes each line touches; the input to the cross-route diff.
- **Copy allowlist:** separators + UI-control labels; printed by the scan.

## Success Criteria _(mandatory)_

The success criteria are the acceptance criteria AC1–AC7 above, unchanged. No additional criteria are defined.

## Assumptions

- The slow class still arrives on GitHub-hosted runners within 10 attempts (S11.8 saw it on 2 of 3 shards). If not: STOP + escalate (RFC R5).
- The hero's live canvas does not change size or position as a result of the composition; the figure subtree is byte-frozen.
- `:has()` is supported by the browsers the gates run in (Playwright Chromium, Lighthouse Chromium).
- Murphy's Gate 1 go-ahead covers the three `site.json` edits only. Any further copy change goes back to Murphy.
- The executor is DeepSeek Flash 4.1 (tier 1); tier 1.5 is dormant.
