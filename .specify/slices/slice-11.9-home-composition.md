# Slice 11.9 — Home Composition (landing sections & content arrangement) — FROZEN BRIEF v1

**slice:** S11.9-home-composition · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S10 ✅ (site shell), S11 ✅ (metadata), S11.8 ✅ (eager hero) · **branch:** `task/s11.9-home-composition` · **frozen:** 2026-11-08 · **revision counter:** 0 of 2

## Mission
Rearrange what the homepage says and in what order — section by section — so a recruiter gets the story in the first 15 seconds and every section earns its place. **Composition only: no new features, no new content claims, no new routes.** Runs before S12 so the 15-second-scan validation measures the final layout, not one about to change.

## Scope: `/` only
Everything else is untouched: `/projects`, `/projects/[slug]`, the workbench, panels, the engine, the theme, project routes' gated 3D.

## Current state (self-contained)
- `/` renders from `apps/web/content/site.ts` (copy) + `apps/web/content/projects/*` (cards), inside `apps/web/app/(site)/page.tsx`, with `apps/web/components/*` (hero, project-card, about-strip, site-footer, site-nav).
- The hero is **eager by default** (D-28): poster first paint → live teardown boots after load + idle, zero interaction; reduced motion and Save-Data stay poster; `NEXT_PUBLIC_GATED_HERO=1` restores the gate. **This must not regress.**
- The nav already carries "Skip the 3D — read the list" and `/projects` is one click away (recruiter path, AC3 of S10).
- Gates in force: mobile Lighthouse ≥ 95 perf/a11y, CLS 0, weight < 3 MB, axe (production routes) 0 serious/critical, `seo: meta + og`, fixture exclusion, 2 draw calls.

## Deliverables
1. **Section inventory + order** — the approved set of sections and their exact order on `/`, expressed as data (an ordered list the page renders from), not as hand-moved JSX.
2. **Per-section composition** — what each section contains, how much space it takes, and what it says (copy comes from `site.json` / project content, never hand-typed).
3. **Responsive composition** — mobile 390, tablet 768, desktop 1440: no clipping, no overlap, tap targets ≥ 44 px, reading order = keyboard order.
4. **Verification** — a DOM-order probe, full-page screenshots at three widths × two palettes, and the existing gates re-run.

## Default order (G1 may reorder; the RFC must present alternatives with a recommendation)
1. **Nav** (name · projects · about · contact · theme)
2. **Hero** — identity + role line, the eager teardown, two CTAs (Open a teardown · Skip the 3D — read the list)
3. **Projects** — cards (name, tagline, ≤ 4 tech chips), "more teardowns in progress"
4. **About** — the three paragraphs already in `site.json`
5. **Contact** — email + GitHub + LinkedIn
6. **Footer**

Alternative worth putting to G1: Projects before About (evidence first, biography second) — cheaper for a 15-second scan.

## Non-goals (hard)
- Scope is `/` only — no other route changes.
- No new copy claims, no new sections that need new content, no résumé link (removed by D-20), no contact form.
- No theme/token/engine changes; no new dependency; no new client JS beyond what the existing sections already load.
- No regression of the eager hero, CLS, Lighthouse, axe, weight, draw calls.
- No hand-typed product strings in components: copy stays in `site.json` / project content.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — section set and order.** `/` renders exactly the approved section list, in the approved order, from data (not reordered JSX). A DOM-order probe asserts the sequence; a full-page screenshot at 1440 light shows every section non-empty and in order. Any section removed or added versus the approved list fails the probe.
- **AC2 — the 15-second read.** At 390×844 (above the fold, no scroll): name, role, the hero headline and at least one project signal are visible; no horizontal scroll; the primary CTA is reachable without scrolling. Evidence: screenshot + DOM probe with measured element boxes.
- **AC3 — copy fidelity.** Every product string on `/` resolves from `site.json` or project content — a scan proves no hand-typed copy in the home components (same idea as the existing no-literal scans). Changing a string in `site.json` changes the page.
- **AC4 — zero regression.** Eager hero intact (`data-site-live-mode="eager"`, reveal ≤ 2.5 s with zero interaction on the slow class), poster first paint, reduced motion → poster, Save-Data → poster; CLS 0; Lighthouse ≥ 95 perf and ≥ 95 a11y; axe 0 serious, 0 critical; weight < 3 MB; 2 draw calls.
- **AC5 — responsive composition.** At 390 / 768 / 1440 in light and dark: no overlap, no clipping, no horizontal scroll; tap targets ≥ 44 px; text ≥ 16 px body; contrast AA in both palettes. Evidence: 12 screenshots.
- **AC6 — structure and a11y.** One `h1`, ordered `h2` per section (no skipped levels), labelled landmarks (`header`/`main`/sections/`footer`), skip link still the first focusable element, keyboard order equals visual order.
- **AC7 — CI and surfaces.** All required checks green (build, gitleaks, `seo: meta + og`, Lighthouse, weight, axe production routes, fixture exclusion); dev routes still 404 in production; frozen surfaces S2–S8 empty; no new routes.

## Executor rules (binding)
- The RFC must present the section order as a numbered list with a recommendation and one alternative; Murphy approves it at G1 **before** any implementation.
- One section per task where practical, each with a before/after screenshot and the probe assertion.
- Evidence per `.specify/EVIDENCE.md`; every AC claim attaches artifacts; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator executes personally; tier 1.5 dormant.

## Murphy dependencies
- Approve the final section order at G1 (default above; alternative = Projects before About).
- Nothing else blocking. Copy edits go into `site.json` as content, not into the slice.

## Freeze protocol
Frozen at commit; work only on `task/s11.9-home-composition`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/home-composition/rfc.md`.
