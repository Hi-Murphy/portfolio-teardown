# RFC — S11.9 Home Composition

**slice:** S11.9-home-composition · **status:** APPROVED at Gate 1 (2026-11-08): all §11 defaults; refinements R1–R5 in §13 · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-11.9-home-composition.md` (frozen brief v1) · **branch:** `task/s11.9-home-composition` · **base:** `b52fc06` (product tree = S11.8 final `209ad4c`) · **date:** 2026-11-08

> This RFC records design decisions only and does not change scope. Where it seems to conflict with the brief, the brief wins and the conflict becomes an open question (§11).
>
> **Inputs:** a static read of the home surface, plus one local baseline measurement of the production export at `b52fc06`. It ran on a local host (not the slow class) with Chromium `reducedMotion: reduce` so the hero stays on its poster and the screenshots are deterministic. Artifacts are in `evidence/RFC-*`. Numbers not taken from these artifacts are labelled **estimate**. Nothing was implemented.

---

## 1. Context (from the brief)

- **Mission:** rearrange what `/` says and in what order, so a recruiter gets the story in 15 seconds. This is composition only: no new features, no new content claims, no new routes. It runs before S12, so the 15-second validation measures the final layout.
- **Scope:** `/` only. `/projects`, `/projects/[slug]`, the workbench, panels, engine and theme stay untouched.
- **Must not regress:** the eager hero (D-28): poster first paint, then a live teardown after load + idle with zero interaction. Reduced motion and Save-Data stay on the poster. `NEXT_PUBLIC_GATED_HERO=1` restores the gate.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — section set and order.** `/` renders exactly the approved section list, in the approved order, from data (not reordered JSX). A DOM-order probe asserts the sequence; a full-page screenshot at 1440 light shows every section non-empty and in order. Any section removed or added versus the approved list fails the probe.
- **AC2 — the 15-second read.** At 390×844 (above the fold, no scroll): name, role, the hero headline and at least one project signal are visible; no horizontal scroll; the primary CTA is reachable without scrolling. Evidence: screenshot + DOM probe with measured element boxes.
- **AC3 — copy fidelity.** Every product string on `/` resolves from `site.json` or project content — a scan proves no hand-typed copy in the home components (same idea as the existing no-literal scans). Changing a string in `site.json` changes the page.
- **AC4 — zero regression.** Eager hero intact (`data-site-live-mode="eager"`, reveal ≤ 2.5 s with zero interaction on the slow class), poster first paint, reduced motion → poster, Save-Data → poster; CLS 0; Lighthouse ≥ 95 perf and ≥ 95 a11y; axe 0 serious, 0 critical; weight < 3 MB; 2 draw calls.
- **AC5 — responsive composition.** At 390 / 768 / 1440 in light and dark: no overlap, no clipping, no horizontal scroll; tap targets ≥ 44 px; text ≥ 16 px body; contrast AA in both palettes. Evidence: 12 screenshots.
- **AC6 — structure and a11y.** One `h1`, ordered `h2` per section (no skipped levels), labelled landmarks (`header`/`main`/sections/`footer`), skip link still the first focusable element, keyboard order equals visual order.
- **AC7 — CI and surfaces.** All required checks green (build, gitleaks, `seo: meta + og`, Lighthouse, weight, axe production routes, fixture exclusion); dev routes still 404 in production; frozen surfaces S2–S8 empty; no new routes.

---

## 2. Baseline: what `/` is today (measured)

Sources: `evidence/RFC-log-baseline-boxes.json`, `evidence/RFC-log-tap-targets.txt` and `evidence/RFC-screenshot-baseline-390x844-fold-{light,dark}.png`. The full-page baseline shots were withdrawn at G1 because they showed the employer name (R1); T001 retakes them after the redaction.

| Fact | Value | AC impact |
|---|---|---|
| DOM order | `header` (nav) → hero `section` (no accessible name) → `section#projects` → `div` › `section#about` → `footer#contact` | AC1: the order is hand-placed JSX. AC6: the hero section is unlabelled. |
| Contact | exists only inside the shared footer (`footer#contact`); its "Contact" label is a `<p>`, not a heading | AC1/AC6: the brief's sections 5 and 6 are fused today |
| Name at 390×844 | **not visible above the fold.** The nav shows the monogram only (`sr-only` below `sm`); the name first appears in the footer at y = 1774 | **AC2 fails today** |
| Role at 390×844 | eyebrow "Android engineer · Indonesia", y 85–101 | AC2 ✓ |
| Headline (`h1`) at 390×844 | y 121–199 | AC2 ✓ |
| Primary CTA at 390×844 | y 317–361, 155×44 | AC2 ✓ |
| Project signal at 390×844 | hero figure y 449–769, its caption (project name + tagline) y 724–769; first card y 900 (below the fold) | AC2 ✓ via the caption |
| Horizontal scroll | none at 390 / 768 / 1440 | AC5 ✓ |
| Document height | 2232 / 2098 / 1712 px at 390 / 768 / 1440 | — |
| Tap targets < 44 px in either dimension | nav monogram link 36×44 (390 only); nav GitHub and LinkedIn 36×44 (all widths); footer brand link 237×36 (all widths). The card's title link is 144×21, but its `::after` stretches it over the whole card, so the real target is the card | **AC5 fails today** (shared nav and footer) |
| Body prose below 16 px | About paragraphs 14 px, compact card tagline 14 px, hero caption 14 px | **AC5 fails today** |
| Labels below 16 px | eyebrow 12 px mono, tech chips 12 px mono, skills note 12 px mono; footer line 12 px, footer links 14 px | depends on what counts as "body" (§11 Q5) |
| Headings | `h1` headline → `h2` Projects → `h3` card → `h2` About. No Contact heading | AC6: Contact has no `h2` |
| Hand-typed visible strings on `/` | nav "Projects" / "About" / "Contact"; footer "Contact", "Back to top ↑"; skip link "Skip to content"; theme-toggle and `aria-label`s | AC3 (§7, §11 Q4) |
| Live mode | `data-site-live-mode="eager"` | AC4 baseline |
| 1440 composition | a lone project card leaves the right half of the Projects grid empty; About prose sits in a narrow left column | composition target |

---

## 3. Section inventory and order (the G1 decision)

### 3.1 Inventory (recommended — Order A)

1. **Nav**: name (monogram + site name) · Projects · About · Contact · GitHub/LinkedIn icons · theme toggle. Owned by the layout and shared with every route.
2. **Hero**: identity line (name) + role line, headline, subline, two CTAs (Open a teardown · Skip the 3D — read the list), and the eager teardown figure with its project caption.
3. **Projects**: `h2`, compact cards (name, tagline, ≤ 4 tech chips), and the "More teardowns in progress." note.
4. **About**: `h2`, the three `site.json` paragraphs and the skills note.
5. **Contact**: `h2`, email, GitHub and LinkedIn.
6. **Footer**: owned by the layout and shared with every route.

### 3.2 The alternative (Order B — About before Projects)

1. Nav · 2. Hero · 3. **About** · 4. **Projects** · 5. Contact · 6. Footer

> **Note on the brief's alternative.** The brief's default (§ Default order) already has Projects (3) before About (4), so "Projects before About" as written *is* the default. The only real ordering alternative for the body sections is the reverse, biography first, so this RFC presents that as Order B (§11 Q1).

### 3.3 Recommendation: Order A (evidence first)

A recruiter's 15 seconds go: who is this, what do they do, can I see the work, how do I reach them.

- **Who and what** are answered above the fold by the hero in both orders (§6, AC2).
- **Can I see the work** is the first thing they scroll to under Order A. The first project card sits at ≈ 950 px on a 390 phone (**estimate**, from the 900 px baseline plus the identity line). That is one short thumb flick. Under Order B, About's ≈ 600 px of prose (baseline section height 520–601 px) sits in between, so the first card drops to ≈ 1550 px, about two screens.
- About repeats in prose what the projects prove ("I measure before I believe… an inspector for WebSocket traffic"). It reads better *after* the evidence, as an explanation, than before it as a claim.
- Contact comes last in both orders, right after the reader has decided. It is also one tap away at all times through the nav.

Order B is stronger only for someone who wants the biography before any work. That is not the brief's reader.

---

## 4. Where the order lives, and how the probe reads it

### 4.1 Data module, not page config

**Default:** a new code-owned data module, `apps/web/content/home-sections.ts`:

```ts
// The approved home composition (S11.9 G1). Order is data; the page renders from it.
export const HOME_SECTIONS = ['nav', 'hero', 'projects', 'about', 'contact', 'footer'] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];
// 'nav' and 'footer' are rendered by app/(site)/layout.tsx (shared with every route) and are pinned first/last.
export const LAYOUT_SECTIONS = ['nav', 'footer'] as const satisfies readonly HomeSectionId[];
```

- `page.tsx` maps `HOME_SECTIONS.filter(not layout)` over a registry `Record<PageSectionId, () => ReactElement>` (`components/home/*-section.tsx`). TypeScript fails the build if a section has no renderer or a renderer has no entry. Reordering the page means editing the array and nothing else, which AC1's negative control proves (§8).
- Each rendered section root carries `data-home-section="<id>"`. Nav and footer are identified by their landmark roles (`banner`, `contentinfo`), so the shared nav and footer need no attribute.
- **Why not `site.json` (page config):** order is structure, not copy, and `.specify/content/*.json` is frozen for the agent (kickoff Hard Rule 1). A data module keeps order changes in code review and typed against the registry.
- **Why not a page-local constant:** the probe and the unit test must read the same source of truth without importing a React page.

### 4.2 The DOM-order probe

`tools/perf/src/home-probe.ts` + `pnpm home:probe --serve apps/web/out` (new CLI, same exit-code contract). It imports `HOME_SECTIONS` straight from the `.ts` module (Node 24 strips types; `site-probe.ts` already imports `apps/web/content/*.source.ts` the same way) and asserts:

1. **Sequence:** `[banner, ...main [data-home-section] in DOM order, contentinfo]`, mapped to ids, **strictly equals** `HOME_SECTIONS`. Any added, removed or reordered section fails.
2. **Approved list:** `HOME_SECTIONS` strictly equals the G1-approved list frozen in `.specify/features/home-composition/g1-approved.txt` (sha-pinned like S11.8's). Data and approval cannot drift apart unnoticed.
3. **Non-empty:** every section has a box height > 0, visible text, and its heading (§5).
4. **No reordering by CSS:** no `order`, `flex-direction: *-reverse`, `grid-row`/`grid-area` placement, or `position: absolute` section roots, and each section's top is greater than the previous section's top at every width. Visual order then equals DOM order (feeds AC6).

The same module runs the AC2 fold boxes, the AC5 responsive checks and the AC6 structure checks (§8). Output: `home-probe.json` + screenshots, per `.specify/EVIDENCE.md`.

---

## 5. Per-section composition

Rhythm: one shared section frame. Every page-owned section is `border-t border-line/30 py-10 sm:py-14` inside the existing `max-w-6xl px-5 sm:px-8` container (today's Projects rhythm, now applied uniformly). Each section's `h2` uses one style (`text-2xl leading-tight text-fg`). Today About's is `text-xl` and Projects' is `text-2xl`. No tokens, colours or motion values change.

| # | Section | Content fields | Space / rhythm | Changes vs today (nothing invented) |
|---|---|---|---|---|
| 1 | **Nav** (layout) | `meta.siteName`, `identity.links[]`, `projects.title`, `about.title`, `contact.title` (Q3) | `h-11` bar, unchanged | Link text wired to content (renders identically, §7). Monogram and social links `w-9` → `w-11` so they reach 44×44 (§11 Q2 ledger). No item added or removed |
| 2 | **Hero** | **`identity.name`** (new on the hero), `hero.eyebrow` (role · location), `hero.headline` (`h1`), `hero.subline`, `hero.primaryCta`, `hero.secondaryCta`, project `meta.name` + `meta.tagline` (caption) | ≈ 800 px at 390 (**estimate**, baseline 764 + identity line); two columns at `lg` | **Adds the identity line** above the role eyebrow (AC2: the name is missing above the fold today). `aria-labelledby` → the `h1`'s id (AC6). Caption 14 → 16 px. **The figure box (`aspect-[4/3] sm:aspect-[16/9]`, `HeroLive` + `TeardownPoster`, `POSTER_FADE_CLASS`) is byte-frozen** to protect the eager hero and CLS |
| 3 | **Projects** | `projects.title` (`h2`), each project's `cardModel` (name `h3`, tagline, ≤ 4 chips — `CARD_CHIP_LIMIT = 4` already), `projects.emptyNote` | `md:grid-cols-2` grid, unchanged | Compact tagline 14 → 16 px. **"More teardowns in progress." is always shown** (the brief lists it; today it shows only when there are zero projects) as a quiet, dashed, non-interactive grid cell. At `md+` it fills the empty column beside the lone card; at 390 it stacks below the card. With zero projects it shows once, as today |
| 4 | **About** | `about.title` (`h2`), `about.paragraphs[0..2]`, `about.skillsNote` | `max-w-prose` prose column | Paragraphs 14 → 16 px. The wrapping `div` goes away and the section owns its frame. `AboutStrip` is used only by `/`, so it is edited in place. Nothing removed |
| 5 | **Contact** (new on `/`, existing content only) | `contact.title` (`h2`, Q3), `footer.contactLabel` ("Email") + `identity.email` (mailto), `identity.links[]` (GitHub, LinkedIn) | one compact row at `sm+`, stacked at 390; each link ≥ 44×44 | **New page section built only from existing fields**, apart from its heading (Q3). It takes over `id="contact"` from the footer, so the nav's `/#contact` lands on a real section in reading order. Same icons as the footer (`components/icons.tsx`). No form (non-goal), no résumé (D-20) |
| 6 | **Footer** (layout) | unchanged | unchanged | `id="contact"` moves to the home Contact section. Brand link gets `min-h-11` (44 px). The footer "Contact" label is wired to `contact.title`. Its contact list stays: it is site-wide chrome, so `/` shows contact twice, in the section and the footer (§10 R4) |

**Removed:** nothing. The duplicated contact list in the footer stays because the footer is shared with other routes.

---

## 6. Responsive strategy

All widths share one DOM order and one column order. Nothing is hidden or reordered by CSS, so reading order = keyboard order = DOM order.

| | 390 × 844 (mobile) | 768 × 1024 (tablet) | 1440 × 900 (desktop) |
|---|---|---|---|
| Nav | monogram (44×44), Projects, About, Contact, 2 icons (44×44), toggle; site name `sr-only`. Width ≈ 367 / 390 (**estimate**, baseline 343 + 3 × 8 px) | full: site name visible | full |
| Hero | single column: name → role → `h1` → subline → CTAs (wrap to 2 rows) → figure 4:3 → caption | single column; figure 16:9 | two columns `0.9fr / 1.1fr`: text left, figure right (the figure has no focusable children, so keyboard order is unchanged) |
| Projects | cards stacked, note tile below | 2-col grid: card + note tile side by side | 2-col grid, same |
| About | single prose column | prose `max-w-prose` | prose `max-w-prose`, left-aligned to the grid |
| Contact | stacked list, full-width 44 px rows | one row | one row |
| Footer | unchanged | unchanged | unchanged |
| **Above the fold** | **name, role, `h1`, subline, both CTAs, figure + caption (project signal)**. Target: caption bottom ≤ 836 (8 px margin). Baseline 769 + ≈ 50 → ≈ 820 (**estimate**). If it overflows, hero top padding `py-10` → `pt-8` (−8 px) is the only lever; the figure is frozen | name → CTAs + figure (baseline figure bottom 863 < 1024) | the whole hero + the Projects heading |
| What collapses | nothing is hidden; only grids collapse to one column and CTAs wrap | — | — |

---

## 7. Copy-fidelity scan (AC3)

Three layers. Each has a negative control.

1. **Static AST scan:** `apps/web/test/home-copy.test.ts`, reusing the `typescript` AST walk from `no-hand-copied-content.test.ts`.
   - **Files:** `app/(site)/page.tsx`, `components/home/**`, `components/about-strip.tsx`, `content/home-sections.ts`, and the visible-text parts of `site-nav.tsx`, `nav-projects-link.tsx` and `site-footer.tsx`.
   - **Flags** any `JsxText` and any string literal used as a JSX child, a template-literal part, or a text-bearing attribute (`aria-label`, `title`, `alt`, `placeholder`).
   - **Allowlist:** printed with every run. It holds (a) separators with no letters (`·`, `—`, `©`, `↑`) and (b) the G1-approved UI-control labels (Q4 default: "Skip to content", "Back to top", theme-toggle labels, `aria-label="Primary"`, chip-list `aria-label="Tech"`).
   - **Negative controls:** an in-memory fixture with `<p>Hello recruiter</p>` and `aria-label="Foo"` must be flagged.
2. **Rendered scan,** in `home:probe` against `out/index.html`:
   - Every visible text node in `<body>` must be either a content string (all `site.json` strings, project content strings, tech-registry chip labels), a composition of content strings and separators (e.g. `${role} · ${location}`, `© ${year} ${name}`), or an allowlisted UI label.
   - Any unknown string fails the scan and is printed. Negative control: the probe injects a `<p>` with an unknown string into a page copy and must fail.
3. **Mutation test** ("changing a string in `site.json` changes the page"): `apps/web/test/home-copy-mutation.test.tsx` renders `HomePage` with `react-dom/server` and a mocked `content/site` in which every string the home reads gets a sentinel suffix.
   - **Asserts:** every sentinel appears in the HTML and no original string survives.
   - **Negative control:** an unmutated render contains no sentinel.

The existing `no-hand-copied-content.test.ts` and `site-copy-fidelity.test.ts` stay unchanged and green.

---

## 8. How each AC is proven

| AC | Proof | Artifact (`evidence/`) |
|---|---|---|
| **AC1** | `home:probe` sequence and approved-list assertions (§4.2) at 390 / 768 / 1440. Unit test: rendering with a permuted `HOME_SECTIONS` (vi.mock) yields the permuted DOM order, so order comes from data. Negative controls: removing one id, adding one id, swapping two ids each fail the probe. Full-page 1440 light screenshot with section boxes | `T0xx-log-home-probe.json`, `T0xx-screenshot-desktop-light.png` |
| **AC2** | `home:probe` fold group at 390×844, no scroll. Boxes for the identity name, role eyebrow, `h1`, primary CTA, and project signal (hero caption's project name, or any `[data-site-card]` heading) must be fully inside `[0, 844]` and visible (non-zero size, not `sr-only`, opacity 1). `scrollWidth ≤ clientWidth`. Screenshot with a box overlay | `T0xx-screenshot-mobile-fold-light.png`, `…-fold-dark.png`, `T0xx-log-fold-boxes.json` |
| **AC3** | §7 layers 1–3 | `T0xx-log-home-copy.txt` (vitest output + printed allowlist), `home-probe.json` copy group |
| **AC4** | **Eager-hero regression probe after every task** (`.specify/features/home-composition/regress-hero.sh`, on a fresh production export): (1) `pnpm eager:probe --serve apps/web/out --route /` expects live: `data-site-live-mode="eager"`, canvas visible and animating ≤ 2.5 s with zero interaction (local host); (2) the same with `--reduced-motion` → poster, no canvas; (3) the same with Save-Data emulated (`navigator.connection.saveData = true`, the S11.8 R11 mechanism) → poster, no canvas, live state `skipped` (new `--save-data` flag, Q6); (4) `site:probe` checks `hero-ssr-poster` + `hero-first-paint-is-poster`. Any failure = STOP. **Slow class (the AC's reveal clause):** measurement-only workflow `home-composition.yml` gated to this branch runs `eager:probe` on `/`, classified by Lighthouse `benchmarkIndex` 1,900–2,600, capped at 10 attempts, not a required check (Q7). **Gates:** CLS 0 (`site:probe --group cls`, mobile + desktop), Lighthouse ≥ 95/95 (`perf.yml` on the Vercel preview + local `perf:lighthouse`), axe 0/0 (`a11y:axe:site`, home states incl. the Save-Data poster state), weight < 3 MB (`perf:weight`), 2 draw calls (`site:probe --group draws`) | `T0xx-log-regress-hero.txt` per task; final `T0xx-lighthouse-summary.json`, `T0xx-weight.json`, `T0xx-log-axe.json`, `T0xx-log-cls.json`, `T0xx-log-draws.json`, slow-class run URL + `T0xx-ci-eager-slow.txt` |
| **AC5** | `home:probe` responsive group at 390 / 768 / 1440 × light / dark. No horizontal scroll. No overlap: pairwise intersection of visible text/control boxes within each section is empty, and no section box intersects the next. No clipping: text elements have `scrollWidth ≤ clientWidth` and `scrollHeight ≤ clientHeight` where `overflow` ≠ visible, and no box extends past the viewport's x-range. Tap targets: every visible `a`/`button` (stretched `::after` measured as the card) ≥ 44×44. Body ≥ 16 px over the elements classified as body (Q5). Contrast AA via axe `color-contrast` in both palettes. **12 screenshots** (Q8 default: 3 widths × 2 palettes × {full page, first viewport}) | `T0xx-screenshot-{mobile,tablet,desktop}-{light,dark}[-fold].png`, `T0xx-log-responsive.json` |
| **AC6** | `home:probe` structure group: exactly one `h1`; one `h2` per page-owned section, in `HOME_SECTIONS` order; `h3` only inside an `h2` section; no skipped levels. Landmarks: one `banner`, one `main`, one `contentinfo`; every page-owned section is a `region` named via `aria-labelledby` (hero → `h1`). Skip link = first Tab stop. Keyboard: `evaluateTabWalk` (from `a11y-probe.ts`) forward and back, plus focus stops in non-decreasing visual reading order (section index, then y, then x) at each width | `T0xx-log-structure.json` |
| **AC7** | CI run URL with every required check green. `guards.sh`: (a) changed paths ⊆ the allowed list (§9); (b) xploder frozen-surface manifests S2–S8 unchanged (existing frozen-surface tests); (c) the export's route list equals the baseline's (no new routes); (d) dev routes 404 (`site:probe --group routes`, `fixture-exclusion.test.ts`); (e) **cross-route ledger diff**: `out/projects/index.html`, `out/projects/websocket-inspector/index.html` and `out/404.html` normalised for build hashes, diffed against the baseline export, with only the ledger lines in §9 allowed | `T0xx-ci.txt`, `T0xx-log-guards.txt`, `T0xx-log-cross-route-diff.txt` |

---

## 9. Change surface

**Allowed paths** (enforced by `guards.sh`):

- `apps/web/app/(site)/page.tsx`
- `apps/web/components/home/**` (new section components + registry)
- `apps/web/components/about-strip.tsx` (used only by `/`)
- `apps/web/content/home-sections.ts` (new)
- `apps/web/content/site-copy.ts` + regenerated `site.source.ts` (only if Murphy adds `contact.title`, Q3)
- `apps/web/test/home-*.test.ts(x)` (new)
- `tools/perf/src/home-probe.ts`, `tools/perf/src/cli/home-probe.ts` (new), `tools/perf/src/eager-probe.ts` + its CLI (`--save-data`, Q6), root `package.json` (`home:probe` script)
- `.github/workflows/home-composition.yml` (temporary, Q7)
- `.specify/features/home-composition/**`
- **Cross-route ledger** (Q2): `components/site-nav.tsx`, `components/nav-projects-link.tsx`, `components/site-footer.tsx`, `components/project-card.tsx` (compact branch only)

**Cross-route ledger.** These are the only rendered differences allowed on routes other than `/`:

| # | Change | Why (AC) | Routes affected |
|---|---|---|---|
| L1 | footer `id="contact"` removed (moves to the home Contact section) | AC6: no duplicate id; AC1: nav Contact lands on the section | all routes' footer (nothing targets that id off `/`: the nav links to `/#contact`) |
| L2 | nav monogram + GitHub + LinkedIn links `w-9`/`min-w-9` → `w-11`/`min-w-11` | AC5: tap targets ≥ 44 px | every nav, 8 px wider per item |
| L3 | footer brand link `min-h-11` | AC5 | every footer, 8 px taller |
| L4 | compact card tagline 14 → 16 px | AC5 body ≥ 16 px | `/` and the 404 page (the only other compact-card user) |
| L5 | nav/footer label text sourced from content (`projects.title`, `about.title`, `contact.title`) | AC3 | **none:** same bytes |

`/projects` and `/projects/[slug]` `<main>` content must be **byte-identical** to the baseline.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| R1 — the identity line pushes the caption (the project signal) below 844 px at 390 | §6 budget: estimate ≈ 820 px. Lever: hero top padding −8 px. If the caption still overflows, STOP + escalate. The figure is never shrunk |
| R2 — eager hero regression through hero markup edits | the figure subtree is byte-frozen (a unit-level snapshot of the figure markup is taken before T-hero and compared after). The regression probe runs after every task |
| R3 — CLS from the always-on note tile or 16 px text | static SSR layout, no client-inserted content; `site:probe --group cls` after every layout task |
| R4 — contact appears twice on `/` (section + footer) | accepted: the footer is shared chrome and cannot become route-aware without client JS (non-goal). G1 can pick the alternative in Q3 (Contact stays footer-only) to avoid it |
| R5 — the slow class does not arrive within 10 attempts | STOP + escalate with the `benchmarkIndex` log, as in S11.8; the local eager probe still runs every task |
| R6 — the 1440 hero headline (4 lines at `5.5rem`) dominates the fold | not changed: no token or type-scale change is in scope. Recorded for S12 |

---

## 11. Open questions (each with a default)

1. **Q1 — Section order.** **Default: Order A** (Nav · Hero · Projects · About · Contact · Footer), as §3.3. Alternative: Order B (About before Projects). Note: the brief's stated alternative equals its default (§3.2).
2. **Q2 — Shared chrome edits (cross-route ledger L1–L5).** The brief lists `site-nav` and `site-footer` among `/`'s components, but kickoff Hard Rule 3 forbids diffs outside the home surface. AC5 cannot pass on `/` without L2 + L3, because the failing targets are in the shared nav and footer. **Default:** allow exactly L1–L5, proven by the cross-route diff in §8 AC7(e), with `/projects*` `<main>` byte-identical. Alternative: zero cross-route diff, so AC5 (tap targets) and AC1/AC6 (Contact id) are escalated as blocked.
3. **Q3 — Contact section heading.** The Contact `h2` needs a string that `site.json` does not have, and the agent may not edit `site.json`. **Default:** Murphy adds `"contact": { "title": "Contact" }` to `.specify/content/site.json` (one line, no new claim). The agent then regenerates `site.source.ts`, extends `SiteCopy`, and wires the nav and footer "Contact" labels to it. Alternative: Contact stays footer-only. The approved list then becomes Nav · Hero · Projects · About · Footer (contact). No content edit and no L1, but no Contact `h2` and contact links appear only once.
4. **Q4 — UI-control labels.** "Skip to content", "Back to top ↑", the theme-toggle labels, `aria-label="Primary"` and the chip list's `aria-label="Tech"` are interaction labels, not product claims, and are identical on every route. **Default:** classify them as UI-control labels in the printed scan allowlist (§7), approved here. Alternative: Murphy adds a `ui` block to `site.json` and they are wired too (renders identically).
5. **Q5 — "Body" for "text ≥ 16 px body".** **Default:** body = running prose in `main`: hero subline and caption, card taglines, About paragraphs, the "More teardowns" note, Contact rows. These all become ≥ 16 px. Labels stay as designed: eyebrow, tech chips, skills note (mono meta rows). The shared footer's fine print (12–14 px) is classified as chrome meta and not resized (resizing it would add a ledger line). Alternative: footer text counts as body, which adds L6 (footer text → 16 px on all routes).
6. **Q6 — Save-Data probe.** **Default:** add a `--save-data` flag to `eager:probe` (tooling, not a frozen surface), reusing the S11.8 R11 emulation. Alternative: an ad-hoc check inside `home:probe`.
7. **Q7 — Slow-class reveal measurement.** `hero-eager.yml` is gated to the S11.8 branch. **Default:** a measurement-only `home-composition.yml` gated to `task/s11.9-home-composition`. It runs once, after the final task, and again only if a later task touches the hero. It is not a required check and is deleted in the slice's last commit before the PR is merged (its run URLs remain as evidence). Alternative: widen `hero-eager.yml`'s `if` to this branch (heavier: 3 shards, 75 min).
8. **Q8 — What "12 screenshots" means.** **Default:** 3 widths × 2 palettes × {full page, first viewport} of the final state = 12, plus the AC2 390×844 fold shot with box overlay. Per-task before/after shots are extra. Alternative: 6 before + 6 after (full page).
9. **Q9 — Which name on the hero.** **Default:** `identity.name` ("Timur Haryo Mahissanular"). It is the identity field and matches the footer and the JSON-LD `Person`. Alternative: `meta.siteName` ("Timur Haryo", matching the nav's wordmark) or `identity.goesBy`.

---

## 12. Execution outline (Stage 2 will formalise it)

- **Order:** order data + registry with no visual change (T-order); then one task per section: Hero → Projects → About → Contact; then chrome ledger L1–L5; then probes; then gates and the slow-class run.
- **Per task:** a fresh worktree off this branch; the executor is DeepSeek Flash 4.1; the orchestrator takes over after 2 stuck attempts (tier 1.5 dormant, skip recorded). Every task has before/after screenshots + its `home:probe` assertion + `regress-hero.sh`.

### WHAT MURPHY SHOULD TEST/VALIDATE

1. The section order in §3 (Order A vs B) and the reasoning in §3.3.
2. The baseline shot `evidence/RFC-screenshot-baseline-390x844-fold-light.png` (the name is missing above the fold).
3. The per-section table in §5, especially the hero identity line and the always-on "More teardowns in progress." tile.
4. The cross-route ledger in §9 (L1–L5): the only visible changes on other routes.

### WHAT THE AGENT NEEDS FROM MURPHY

1. **Q1** order. Default: Order A.
2. **Q2** cross-route ledger L1–L5. Default: allowed.
3. **Q3** Contact heading. Default: Murphy adds `"contact": { "title": "Contact" }` to `site.json` before Stage 3's Contact task (the agent may not edit `site.json`; it regenerates `site.source.ts` afterwards).
4. **Q4–Q9** defaults as listed in §11 unless you say otherwise.

---

## 13. Gate 1 record (2026-11-08)

Murphy approved **all §11 defaults** (Q1–Q9): Order A, ledger L1–L5, `contact.title`, the UI-label allowlist, the body-text definition, `--save-data`, `home-composition.yml`, 12 shots = full page + first viewport, and `identity.name` on the hero. The approved list is frozen in `g1-approved.txt`.

Refinements agreed at G1:

- **R1 — redact the employer name (Murphy request).** In `about.paragraphs[0]`, the employer name (19 characters, `&` included) becomes `███████████████████`: one solid bar of 19 U+2588, form A. No screen-reader wrapper; the bar is read as-is. The full-page baseline screenshots that showed the name were withdrawn before the branch was pushed. Older evidence from earlier slices and `main`'s history are not rewritten.
- **R2 — meta description without the employer.** `meta.description` becomes "Android engineer. Portfolio rendered as exploded architecture: real layers, real components, real numbers." This removes words and adds no claim. It changes the description, `og:description` and `twitter:description` on every route, so this ledger line (L7) is Murphy-approved content.
- **R3 — the agent edits `site.json` for R1, R2 and Q3 only.** This is Murphy's explicit go-ahead and overrides kickoff Hard Rule 1 for these three changes. Task T001 makes them as one content commit, before any section work, and regenerates `site.source.ts` (`content:convert`), extends `SiteCopy`, and refreshes the SEO expectations.
- **R4 — no duplicate contact on `/`.** The footer's contact list is hidden on `/` only, by CSS: a Tailwind arbitrary variant on the footer contact block (`[body:has([data-home-section=contact])_&]:hidden`). There is no client JS and no layout shift, because it is static at first paint. Other routes keep the full footer. Ledger **L6**: one class (plus a `data-` marker) on the footer contact block, rendered on every route but hiding nothing off `/`. Browsers without `:has()` show the duplicate, as today.
- **R5 — first Stage 3 task.** T001 = content (R1–R3) + the retaken full-page baseline shots (3 widths × 2 palettes), so every later before/after pair uses the redacted copy.

Change surface additions (§9): `.specify/content/site.json` (R1–R3 only), ledger L6 (footer contact block) and L7 (description meta on every route).

### Stage 3 addition (Murphy, 2026-11-08)

- **R6 — hero showcase loop.** Murphy's decision; it widens the brief's "no new features / no motion change" non-goal for the hero only (brief revision 1 of 2 in effect, recorded here because the brief file is frozen). Loop: explode + quarter turn → hold → implode + quarter turn → hold → repeat. Built from existing engine actions (`explode`, `implode`, `rotateRight`, `onSettled`) and an existing motion token for the hold (`durations.tourBeat`). No engine, token or dependency change. Guards: it starts only after the live reveal; it pauses when the hero is off-screen or the tab is hidden; reduced motion and Save-Data keep the static poster; 2 draw calls and every AC4 gate still bind. **Safety valve:** if a gate fails and two attempts do not fix it, only the loop is reverted, S11.9 ships without it, and the loop moves to its own slice. The headline stays (AC2) but gets smaller so the 3D figure gets more room (T006).
- **R1a — employer is one word (Murphy, 2026-11-08, before Phase Chrome & copy).** The employer is only the first word of the original 19-character span; the second name is dropped as content (removal, no new claim). `about.paragraphs[0]` now reads "I build Android apps at `████████`, focused on…" (8 × U+2588, one per character of that word). `guards.sh` guard 2 checks the 8-block bar against the first word of the original span. Earlier evidence shows the 19-block bar.
- **R7 — loop pause/play control (Murphy, 2026-11-08).** WCAG 2.2.2 (Level A) requires a pause mechanism for motion that starts automatically and lasts more than 5 s. The hero loop gets a 44×44 icon button in the bottom-right corner inside the figure frame, after the CTAs in Tab order. Its accessible name comes from two new content keys, `hero.loopPause` ("Pause animation") and `hero.loopPlay` ("Play animation"), added to `site.json` by the agent on Murphy's go-ahead. It renders only while the live loop runs (never for reduced motion, Save-Data or before the first frame); the choice is not persisted. **Probe mode:** the eager probe's `ambient-idle` check (the S11.8 "no timed motion" definition) contradicts R6 by design, so `/` is probed with a new `--expect live-loop` that keeps every live check and replaces `ambient-idle` with `loop-running` (tour idle, live states unchanged, loop attribute `running`). `--expect live` (default) is unchanged for every other use.
- **R8 — hero showcase: "watch a frame travel" + proof strip (Murphy, 2026-11-08).** The landing hero becomes a working explanation, not decoration, built only from existing content. (A) The live hero plays the project's real flows (`capture-path` "Frames in", then `inspect-path` "Frames out") with the engine's existing tour, explodes before and implodes after, and repeats. (1) The caption row narrates: project name plus the current step's component name and its content summary; it replaces the static caption, so no extra height (AC2). (B) A proof strip of 2–3 facts from `story.metrics` sits below the figure, and (2) a fact highlights while the pulse is in its layer; the fact ↔ layer mapping is site content (`site.json` `hero.proof`), filled by Murphy in the content pass. (3) The home-only poster (reduced motion, Save-Data, pre-reveal) draws the capture path as a static dotted line with numbered steps; other routes' posters stay identical. The pause/play button moves to the caption row (right end). Order: T011c feasibility (no engine change, or STOP) → T011d narrated tour → T011e proof strip → T011f poster path → Murphy content pass → T012 → T013. Murphy reviews each task (STOP after each). All AC1–AC7 gates bind; safety valve as R6 (two failed attempts on a gate → keep the T011b loop).
- **R8a — proof mapping shape.** `site.json` `hero.proof` = 2–3 entries `{ "metric": <index into the hero project's story.metrics>, "layer": <layer id or null> }`. It is referenced by index because copying a metric label into `site.json` would duplicate project copy (the no-hand-copied scan forbids that). Agent defaults (Murphy reviews in the content pass): metrics 1 "Concurrent sessions" → `capture`, 2 "Storage" → `persistence`, 3 "Inspector UI" → `inspection-ui`, all on the tour's paths. Guard 2 checks only the shape; T011e's unit test checks every index and layer id exist.
- **R8b — calmer hero (Murphy, 2026-11-10, after reviewing T011e).** Too many rectangles: the proof facts lose their boxes and the layer-synced highlight (plain text columns with thin dividers; `hero.proof` becomes a plain list of `story.metrics` indexes, `[1, 2, 3]`). The secondary CTA ("Skip the 3D — read the list") is removed from the hero; `/projects` stays one click away through the nav's Projects link. The primary CTA stays (AC2 requires it above the fold) but becomes a quiet text link with an arrow icon (≥ 44 px target). `hero.secondaryCta` stays in `site.json` (unused) for Murphy's content pass.
- **R9 — full-screen blueprint hero (Murphy, 2026-11-13, from mockups A–D).** Chosen: **D v2 "blueprint sheet"** (`evidence/R9-mockup-blueprint-v2.html`). The hero fills the first screen (`min-h` = viewport minus nav, never a fixed height); the model floats on fading grid paper with corner crop marks, no boxes; the left column reads name → role (accent tick) → headline → description → primary text link; narration is a drawing annotation (project · flow · n/total, component, summary) with a leader line and a round pause control at its end; a thin fading line hints scroll. **Scroll snap** (CSS only, `/` only, off under reduced motion): one boundary, hero ↔ Projects; free scrolling below. The proof strip is removed (and `hero.proof` with it, in the content pass). **Animation storyboard:** imploded → explode → zoom in to the flow's first component → the camera follows the frame along the path while the note narrates → zoom out → a couple of quarter turns → implode → repeat (paused off-screen; pause button). Camera follow must work with the public API only; T011h tests it (fallback: zoom on the whole model while the pulse travels).
