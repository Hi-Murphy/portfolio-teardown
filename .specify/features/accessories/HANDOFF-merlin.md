# S19 round 1 — handoff for Merlin

**From:** orchestrator (Opus 5.5) · **date:** 2026-11-18 · **PR:** #30 (`task/s19-accessories`)
**Brief:** `.specify/slices/s19-round-1-accessories.md` (frozen, not edited)

## Overrides of the brief, decided on air by Murphy

Murphy approved the items below in the session on 2026-11-18. They **override the frozen work
order** where it said otherwise. Please carry them into the next brief as the new baseline, not as
deviations to undo.

| # | brief text overridden | what was done | why |
|---|---|---|---|
| O1 | W4 named only the hero identity line and the footer for the inline glyph | The nav mark is now `LogoGlyph` too. `MonogramMark` (the `TH` box) is removed from the codebase. The footer had already replaced it in W4. | One mark across the site |
| O2 | W2 "No other hero change" (W4 only added the glyph to the OG card) | The home OG card silhouette follows the hero project. `heroProject(slug)` in `apps/web/content/projects` is used by `HeroSection` and `seo/og/card-model.ts`. The home OG hash was re-baselined a second time (current hashes are in `evidence/README.md`). | The share image matches the hero (JEV) |
| O3 | Not in the work order (pre-existing since S18) | `tools/perf` home-probe `structure-focus-order` reads a grid column-first only when the grid has one row. The wrapping 3-card grid now reads row by row. | The check failed on `main` at 768 and 1440 even though the real tab walk passed |
| O4 | Not required by W5 (W5.5 covered dark only for the icons) | Added a dark-theme live-hero check (`dark-hero.mjs`): 6 phases lit, and pause/play by click | Close the "dark live hero not verified" gap |

## Changes beyond the brief, made during W2/W4 and reported at the first review

- **W2 needed a hero-stage fix.** `apps/web/components/hero/hero-stage.tsx` had websocket-inspector's
  flow ids (`capture-path`, `inspect-path`) hard-coded, so a JEV hero stalled after zoom-in. It now
  uses the hero project's first two flows; websocket-inspector gets the same ids in the same order.
  This also changed hero code despite "No other hero change". Murphy has seen it.
- **W4 logo colours:** the glyph is palette `ink` on `paper` (`xploder/theme`). The design files'
  `#17324F` / `#DCE6EF` were not used.
- **W4 footer:** the `TH` monogram was replaced, not doubled.
- **Tooling:** home-probe takes the hero from `site.hero.project` (`heroProjectSource()`).
- **W3 approved list:** the test now reads `.specify/features/accessories/sections-approved.txt`.
  The S11.9 `g1-approved.txt` was left as it was.

## Results to carry forward

- Holds: unchanged (labelled 3.40/3.35 s, zoomed 1.73 s, tour-end 1.61 + 1.61 s). The loop is
  36.4 s, down from 39.6 s, because the flows have different step counts.
- Fold at 390x844: 844 px. About starts there and Projects at 1476 px.
- Fleet chips: Infrastructure · Agents · Linux · Git.
- The OG hashes for all five cards are in `evidence/README.md`.

## Still out of scope (unchanged from the brief)

The résumé PDF still says "Android engineer". The 404 project list, per-project lazy chunks,
docs-only CI skip, and evidence path scrub are still backlog.
