# Implementation Plan: S11.9 Home Composition

**Feature dir:** `.specify/features/home-composition/` · **Branch:** `task/s11.9-home-composition` · **Date:** 2026-11-08 · **Inputs:** `spec.md`, `rfc.md` (approved at Gate 1: all §11 defaults; refinements R1–R5 in §13)

## Summary

The slice runs in four phases.

1. **Content and harness first.** No section work starts until these exist:
   - the three Murphy-approved content edits (R1–R3) and the retaken baseline shots;
   - the guards and a baseline export of the other routes, for the cross-route diff;
   - the `home:probe` harness, `eager:probe --save-data` and `regress-hero.sh`;
   - the measurement-only slow-class workflow.
2. **Order, then one section per task:**
   - the order data module and registry, with no visual change;
   - then Hero → Projects → About → Contact (Contact includes L1 and L6).
3. **Chrome and copy:**
   - nav and footer ledger lines L2, L3 and L5;
   - then the copy-fidelity tests over the finished components.
4. **Verification:**
   - all gates, the 12 shots and the structure checks locally;
   - then the PR, CI green, the slow-class run, the AC self-check, and deleting the temporary workflow.

`regress-hero.sh` runs after every task from T003 on. T001 and T002 run its steps inline. Any regression = STOP.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript strict, React 19, Next 16 (Turbopack) static export, Tailwind v4, Node 24, pnpm 12 |
| Binding host | AC4 reveal: a GitHub-hosted `ubuntu-latest` slow-class attempt (`benchmarkIndex` ∈ [1,900, 2,600]). Every other gate: local export + PR CI |
| Local host | Apple M4; Playwright Chromium (`tools/perf`) |
| New deps | **none** |
| Tests | vitest: `apps/web/test/home-sections.test.ts`, `home-copy.test.ts`, `home-copy-mutation.test.tsx`, `home-hero-figure.test.tsx` (new); `tools/perf/test/home-probe.test.ts` (new, pure evaluators + negative controls) |
| Budgets | `tools/perf/src/budgets.ts` unchanged |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`; `.specify/content/**` **except** the R1–R3 edits in T001; every `packages/xploder/**` path; `apps/web/app/dev/**`, `apps/web/app/fixtures/**`, `apps/web/test/xploder-dom/**`; `apps/web/app/(site)/projects/**`, `apps/web/components/{workbench,viewer,hero}/**`, `apps/web/components/teardown-poster.tsx`; `app/globals.css`, `app/theme-*`, `app/layout.tsx`, `app/(site)/layout.tsx`; `ci.yml`, `perf.yml`, `eager-3d.yml`, `eager-load.yml`, `hero-eager.yml` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. Non-goals hold: `/` only (other routes get only ledger lines L1–L7), no new copy claims, no résumé, no form, no theme/token/engine change, no new dependency, no new client JS. |
| II. Static-only | Unchanged. The R4 footer hiding is CSS (`:has()`), with no client JS. |
| III. Performance is a feature | No new client JS; the section components are server components. Gates re-run at T012. Weight Δ ≈ text only. |
| IV. Single motion source | No transition or animation is added; no timing literal. `no-motion-literals` stays green. |
| V. Theme integrity | Only existing palette utilities (`text-fg`, `text-muted`, `border-line`, `bg-surface`, `bg-accent`). Both palettes are probed and shot. `no-color-literals` stays green. |
| VI. Evidence over assertion | Every AC has a probe group or test with a negative control, and a named artifact. |
| VII. No secrets | The employer name is redacted (R1). Evidence goes through `gitleaks dir` before commit; local paths → `<local-path>`, ports → `PORT`. |

## Project Structure (touched paths)

```
.specify/content/site.json                       # T001 only: R1, R2, R3
apps/web/content/site-copy.ts                    # + contact.title
apps/web/content/site.source.ts                  # regenerated (content:convert)
apps/web/content/home-sections.ts                # new: HOME_SECTIONS
apps/web/app/(site)/page.tsx                     # renders from HOME_SECTIONS
apps/web/components/home/section-frame.tsx       # new: shared section shell (border-t, padding, aria-labelledby, data-home-section)
apps/web/components/home/hero-section.tsx        # new (figure subtree moved verbatim)
apps/web/components/home/projects-section.tsx    # new
apps/web/components/home/about-section.tsx       # new (wraps AboutStrip)
apps/web/components/home/contact-section.tsx     # new
apps/web/components/home/registry.tsx            # new: Record<PageSectionId, …>
apps/web/components/about-strip.tsx              # / only: 16 px paragraphs, h2 style
apps/web/components/project-card.tsx             # compact tagline 16 px (L4)
apps/web/components/site-nav.tsx                 # L2, L5
apps/web/components/nav-projects-link.tsx        # L5
apps/web/components/site-footer.tsx              # L1, L3, L5, L6
apps/web/test/home-*.test.ts(x)                  # new
tools/perf/src/home-probe.ts                     # new
tools/perf/src/cli/home-probe.ts                 # new
tools/perf/src/eager-probe.ts, cli/eager-probe.ts  # --save-data
tools/perf/test/home-probe.test.ts               # new
package.json                                     # "home:probe"
.github/workflows/home-composition.yml           # temporary (T004 → deleted in T013)
.specify/features/home-composition/**            # guards.sh, app-touch.txt, regress-hero.sh, cross-route.sh, evidence/
```

`app-touch.txt` lists exactly these `apps/web` paths; `guards.sh` rejects anything else.

## Section-by-section implementation order

| Step | Task | What changes | Visual change? | Probe assertion after |
|---|---|---|---|---|
| 0 | T001 | `site.json` R1–R3 → `content:convert` → `SiteCopy.contact` | About ¶1 shows the redaction bar; the description meta changes on every route (L7) | eager probe steps inline; `no-hand-copied-content`, `site-copy-fidelity`, seo tests green |
| 1 | T005 | `HOME_SECTIONS` + registry + `SectionFrame`; page renders from data; hero/projects/about get `data-home-section` + `aria-labelledby`. **No Contact entry yet:** the list is temporarily `nav, hero, projects, about, footer`, and T009 adds `contact` | none intended. Before/after full-page shots must match pixel-for-pixel at 3 widths (the shell keeps today's classes) | order group passes against the interim list (`--approved` = interim, recorded) |
| 2 | T006 | Hero: identity line (`identity.name`), caption 16 px. Figure subtree byte-frozen | yes (hero) | fold group PASS at 390×844; `regress-hero.sh` |
| 3 | T007 | Projects: compact tagline 16 px (L4); always-on note tile | yes (projects) | responsive group: Projects cells pass; no overlap between card and tile |
| 4 | T008 | About: `SectionFrame`, 16 px paragraphs, unified `h2` | yes (about) | responsive group: About cells pass |
| 5 | T009 | Contact section; `contact` added to `HOME_SECTIONS` (now = G1 list); `id="contact"` moves (L1); footer contact block gets `data-footer-contact` + `[body:has([data-home-section=contact])_&]:hidden` (L6); footer "Contact" label → `contact.title` (L5) | yes (contact; footer list hidden on `/`) | order group PASS against `g1-approved.txt`; structure group PASS |
| 6 | T010 | Nav monogram + social links 44 × 44 (L2); footer brand link `min-h-11` (L3); nav labels → `projects.title` / `about.title` / `contact.title` (L5) | yes (nav: 8 px wider items; footer brand link 8 px taller) | responsive group: tap targets PASS in all 6 cells; cross-route diff = ledger only |
| 7 | T011 | Copy tests (AST, mutation) + rendered copy group enabled | none | copy group PASS; negative controls bite |

## Probe wiring: `home:probe`

`pnpm home:probe --serve apps/web/out [--group order,fold,responsive,structure,copy] [--approved <file>] [--out <dir>]`. It follows the exit-code contract (0 / 1 / 2 / 3 / 4 / 6), and pure evaluators are unit-tested with fixtures.

| Group | Cells | Asserts | Artifact |
|---|---|---|---|
| `order` | 390, 768, 1440 (light) | sequence = `HOME_SECTIONS` = `--approved` (default `g1-approved.txt`); each section box height > 0, has text and its heading; section tops strictly increasing; no CSS reordering on section roots or their parent | `order.json`, `order-1440-light.png` (full page, section boxes outlined) |
| `fold` | 390×844 light + dark, no scroll | name, role eyebrow, `h1`, primary CTA, project signal visible and inside `[0, 844]`; `scrollWidth ≤ clientWidth` | `fold.json`, `fold-390x844-{light,dark}.png` (boxes overlaid) |
| `responsive` | 390×844, 768×1024, 1440×900 × light, dark | no horizontal scroll; no pairwise overlap of text and control boxes within a section, and no section overlap; no clipping (`scrollWidth/Height ≤ client*` where overflow ≠ visible; no box past the viewport x-range); every tap target ≥ 44 × 44 (`::after` for stretched links); body elements (spec definition) ≥ 16 px; 12 screenshots (full page + first viewport) | `responsive.json`, `{mobile,tablet,desktop}-{light,dark}[-fold].png` |
| `structure` | 390, 768, 1440 (light) | one `h1`; `h2` per page section in order; no skipped levels; one `banner`, `main` and `contentinfo`; each page section is a named `region`; skip link = first Tab stop; `evaluateTabWalk` forward/back; focus stops non-decreasing in (section, y, x) | `structure.json` |
| `copy` | 1440 light | every visible text node ∈ content strings ∪ compositions ∪ allowlist; the allowlist is printed | `copy.json` |

**Negative controls** (`tools/perf/test/home-probe.test.ts`, on fixture snapshots):

- order: add / remove / swap → FAIL;
- fold: a CTA at y 900 → FAIL;
- responsive: a 40 px target, a 14 px body element, overlapping boxes → FAIL;
- structure: two `h1`, `h2` → `h4`, a positive `tabindex` jump → FAIL;
- copy: an unknown string → FAIL.

Contrast is read from `a11y:axe:site` (`color-contrast`, both palettes); `home:probe` does not re-implement it.

## Regression probes

**`regress-hero.sh`** (written in T003). It runs after every product task, on a fresh `pnpm build` export, and exits 1 on any failure:

1. `pnpm eager:probe --serve apps/web/out --route / --runs 2`: expects live, with `data-site-live-mode="eager"`, reveal ≤ 2.5 s, zero input (local host).
2. `… --reduced-motion --runs 2`: poster, no canvas until `load` + 5 s.
3. `… --save-data --runs 2` (new): poster, no canvas, live state `skipped`.
4. `pnpm site:probe --serve apps/web/out --group hero`: the S11.8 R9 mode-aware hero checks, incl. `hero-ssr-poster` and `hero-first-paint-is-poster`.
5. `pnpm site:probe --serve apps/web/out --group cls,draws`: CLS 0, 2 draw calls.

**`home-hero-figure.test.tsx`** (T006) snapshots the rendered hero `<figure>` markup at T005 and asserts it is unchanged at every later task. The only allowed figure diff is the caption's font-size class, recorded in the snapshot update at T006.

**`cross-route.sh`** (T002): normalises the exported HTML of `/projects`, `/projects/websocket-inspector` and `/404` (strips `/_next/static/**` hashes, build ids and inline flight data) and diffs it against `evidence/T002-cross-route-baseline/`. Each differing hunk must match a ledger line pattern (L1–L6; L7 is already in the baseline because T001 precedes T002). `<main>…</main>` of the two `/projects*` pages must be byte-identical.

## Guards (`guards.sh`, T002)

1. Changed paths since `b52fc06` ⊆ `app-touch.txt` ∪ `tools/perf/**` ∪ `package.json` ∪ `.github/workflows/home-composition.yml` ∪ feature dir ∪ `.specify/content/site.json`.
2. `site.json` diff vs `b52fc06` = exactly R1 (paragraph 0), R2 (`meta.description`) and R3 (`contact`); the other keys are deep-equal.
3. `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/websocket-inspector.json` and `packages/xploder/**` are unchanged.
4. Workflows other than `home-composition.yml` are unchanged.
5. The exported route list equals T002's `routes.txt`; `/dev/*` and `/fixtures/*` are absent from `out/`.
6. `g1-approved.txt` sha256 = `f64f0222…3811`.
7. There is no `'use client'` in `components/home/**`.
8. No new dependency: `package.json` dependency blocks and `pnpm-lock.yaml` are unchanged.

## Risks → mitigations

- **Fold overflow at 390** (RFC R1): measured at T006. Lever: hero `pt-8`. If it still overflows: STOP.
- **Interim order list in T005** (contact added in T009): T005 records `--approved evidence/T005-interim-approved.txt`. From T009 on, the probe uses `g1-approved.txt` only, and `guards.sh` rejects an interim list after T009.
- **Description change (L7) breaks the seo checks:** T001 runs `pnpm --filter web seo:expect` + `seo:probe` locally, and CI's `seo: meta + og` confirms.
- **Slow class scarce:** cap 10, then STOP + escalate (RFC R5).
- **Executor stuck:** ×2 → the orchestrator executes (Hard Rule 10).
