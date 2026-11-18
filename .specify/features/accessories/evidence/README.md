# S19 round 1 — accessories: evidence

Work order: `.specify/slices/s19-round-1-accessories.md` (W1–W5). Branch `task/s19-accessories`.
Host: local macOS, Chromium 156 (Playwright), static export served by `pnpm serve:out`.
Base = `main` at `357229c`, built from a detached worktree with the same tools.

## Holds table (W2) — hero is now JEV (`site.hero.project = "jev-toolkit"`)

Script: `.specify/features/engine-polish/storyboard-timing.mjs` (S14). Medians of 3 runs each.
Logs: `W2-log-holds-base-run{1,2,3}.txt`, `W2-log-holds-branch-run{1,2,3}.txt`.
S14 references: labelled 0.19 → 3.40 s, zoomed 0.14 → 1.75 s, tour-end hold 0 → 1.61 s.

| viewport | hold | base (websocket hero) s | S19 (JEV hero) s | delta s |
|---|---|---:|---:|---:|
| 1440x900 | labelled exploded view | 3.40 | 3.40 | +0.00 |
| 1440x900 | zoomed view | 1.73 | 1.74 | +0.00 |
| 1440x900 | tour-end hold 1 / 2 | 1.61 / 1.61 | 1.61 / 1.61 | 0 / 0 |
| 1440x900 | loop | 39.57 | 36.39 | −3.19 |
| 390x844 | labelled exploded view | 3.40 | 3.35 | −0.05 |
| 390x844 | zoomed view | 1.73 | 1.73 | −0.00 |
| 390x844 | tour-end hold 1 / 2 | 1.61 / 1.61 | 1.61 / 1.61 | 0 / 0 |
| 390x844 | loop | 39.58 | 36.38 | −3.20 |

Per phase, only the flow phases move, and they follow the flow length (JEV `arm-run` 8 steps +
`judge-path` 4 steps vs websocket 7 + 7): capture 12.81 → 14.41 s (+1.6), inspect 12.81 → 8.00 s
(−4.8). implode 2.20, explode 4.60, zoomin 2.35, turn 4.80 are unchanged. Nothing was retuned.

**Fix needed for W2:** `components/hero/hero-stage.tsx` hard-coded websocket-inspector's flow ids
(`capture-path`, `inspect-path`), so the JEV hero stalled after zoom-in (the first holds run timed out).
It now takes `project.flows[0]` / `project.flows[1]`. That is the same ids, in the same order, for
websocket-inspector. Test: `home-hero-loop.test.tsx` › "tours the hero project's own first flow".

## Fold line at 390x844 (W3)

Script: `fold-and-cards.mjs`. Logs: `W3-log-fold-cards-{branch,base}.md`. Document y, px.

| section | base top | S19 top |
|---|---:|---:|
| hero | 45 | 45 |
| first below-hero section | projects @ 844 | about @ 844 |
| about | 1529 | 844 (heading 885) |
| projects | 844 (heading 885, first card 935) | 1476 (heading 1517, first card 1567) |
| contact | 2238 | 2232 |

The fold is at 844 px, where the hero ends. On base, the Projects section started exactly at the fold.
In S19, About starts at the fold and Projects starts 632 px below it. Projects is no longer the
first section after the hero.

## Chips and cards (W1, W5.2)

`agent-fleet` card chips, in rank order: **Infrastructure · Agents · Linux · Git** (infra 3, agent 2,
linux 2, git 1). Card order is unchanged on `/` and `/projects`: websocket-inspector, jev-toolkit,
agent-fleet. CLS is 0.0000 on `/` and `/projects` at 390 and 1440. On the 1440 home grid the fleet
card is now 140.5 px, the same height as the other two (base 102.5 px: no chip row).

## OG cards (W4 + X1): re-baselined, current hashes

From `X1-log-og-hashes.json`. Two clean builds gave identical bytes (`seo:probe --compare` PASS,
`X1-log-seo-og.txt`). All cards are 1200x630 and ≤ 92 KB. W4 re-baselined all five. X1 changed only
the home card again, which now draws the hero project (JEV). The W4-only hash for `/` was
`abc84e86…b7d8d` (`W4-log-og-hashes.json`).

| route | file | bytes | sha256 |
|---|---|---:|---|
| / | og/home.png | 77155 | 8b85d13330287e772e0a48e604cfb78cb336c648701ac6464d4e39e3c894bf8b |
| /projects | og/projects.png | 91496 | 141547c1c33751e43045f9e08ed1afd0b3aedced7fdabd4e9fdf684de61c3b8d |
| /projects/websocket-inspector | og/projects/websocket-inspector.png | 79988 | 04dbd97c63eb96e26d8d0c946997ce34b26b628ce831248d8afd9f88726cd346 |
| /projects/jev-toolkit | og/projects/jev-toolkit.png | 76530 | 94f9947d6cd48bb4eb29aa988602c8a297ad01b32af2b2687c251ec493b13abe |
| /projects/agent-fleet | og/projects/agent-fleet.png | 71408 | c4e718dd447617af52853aab0d186441c60e2663a781ad19542b255a591d5924 |
| (apple icon) | apple-touch-icon.png | 1858 | 61a38e234693b46bf8d4085e0689bf0debf613b8da2085124ee395873a518bab |

The glyph sits before the site name wherever the card's text column shows it: the eyebrow on
project and `/projects` cards, the title on the home card.

## Logo (W4, W5.5)

`W4-log-icon-render.md` and `W4-screenshot-icons/`: `/icon.svg` at 16 and 32 px, light and dark, and
`/apple-touch-icon.png` at 180. No glyph is clipped: the glyph box is inside the tile at every size.
The glyph colour is `ink` and the ground is `paper`, from `xploder/theme` (no hex). The design file's
`#17324F` / `#DCE6EF` are closest to ink (light) and ink (dark). The apple icon is full-bleed paper,
as before (iOS masks it). The design file's 180 px `rx="34"` would only round the tile, which the div
ground already fills. The inline glyph in the hero identity line and the footer is 20x20,
`aria-hidden`, and uses `currentColor`, the same colour as the name in both themes.

## W5 checks

| # | check | result | evidence |
|---|---|---|---|
| 1 | `content:convert` + fidelity (both JSONs deep-equal) | PASS (`content-fidelity`, `site-copy-fidelity`) | `pnpm test` |
| 2 | chips, no layout shift, card order | PASS | W3 logs above |
| 3 | JEV stages and flows play; pause/play; zero-interaction reveal | PASS: pause-freeze 20/20 OK; eager probe 3/3 (ready 203–226 ms vs base 200–217 ms); reduced-motion and Save-Data poster PASS; site-probe hero 9/9 | `W5-log-pause-freeze.txt`, `W5-log-eager-probe.txt`, `W5-log-site-probe.txt` |
| 4 | About after hero; fold line | PASS (home-probe `order` 18/18) | `W5-log-home-probe.txt` |
| 5 | favicon / apple icon 16/32/180 light and dark | PASS | `W4-log-icon-render.md` |
| 6 | axe on 5 routes, keyboard, contrast | 0 serious / 0 critical (also 0 moderate/minor); site-probe drill tab order PASS | `W5-log-axe.txt`, `W5-log-site-probe.txt` |
| 7 | Lighthouse mobile, CLS, weight, draw calls | perf 100 / a11y 100 on all 5; CLS 0; max weight 467 KB (`/`); draws 2 on hero and 3 projects | `W5-lighthouse-summary*.json`, `W5-weight*.json`, `W5-log-site-probe.txt` |
| 8 | redaction scan (in `pnpm build`) | G2 unexempted 0 | `W4-log-seo-og.txt` |
| 9 | sitemap 5 `<loc>`; OG 1200x630 ≤ 300 KB; JSON-LD shape | PASS; largest card 91 KB; JSON-LD key shape identical to base on 5 routes | `W4-log-seo-summary.md` |

Lighthouse here ran on the local export. CI repeats it on the Vercel preview.

## X1 — Murphy's on-air additions (override the brief; see `../HANDOFF-merlin.md`)

| item | change | result | evidence |
|---|---|---|---|
| nav mark | `site-nav.tsx`: `LogoGlyph` replaces the `TH` monogram (`MonogramMark` removed) | all routes: axe 0/0; Lighthouse 100/100 on 5 routes; site-probe drill/routes PASS | `X1-log-axe.txt`, `X1-log-lighthouse.txt`, `X1-screenshot-home-*` |
| home OG silhouette | `heroProject(slug)` in `content/projects` is shared by `HeroSection` and the OG `homeCard()` | home card shows JEV; only the `/` hash changed | `X1-log-seo-og.txt`, `X1-log-og-hashes.json` |
| focus-order probe | `tools/perf` home-probe reads a grid column-first only when the grid has one row (the hero); wrapping card grids read row by row | home-probe PASS at all widths (was FAIL at 768/1440 on main too) | `X1-log-home-probe.txt` |
| live hero in dark | new `dark-hero.mjs`: dark theme, zero interaction, 6 phases screenshotted and lit, pause/play by click | PASS at 1440x900 and 390x844 | `X1-log-dark-hero.md`, `X1-screenshot-dark-hero/` |

X2 (pre-merge scouting, approved by Murphy):
- `home:probe` default approved list fixed. A bare `pnpm home:probe --serve apps/web/out` passes
  all groups (`X2-log-home-probe-default.txt`).
- CTA/hero match test added; hero tests no longer pin `jev-toolkit`.
- Footer glyph gap 12 → 8 px (`X2-screenshot-glyph-footer-light.png`).
- CI home TBT check: see the PR thread (re-run on the perf workflow).

Other notes:
- axe "incomplete" (needs review) on `/` is 34 vs base 32. The extra items are poster step numbers:
  JEV's first flow has 8 steps vs 7.
- Tooling: `tools/perf` home-probe takes the hero from `site.hero.project` (`heroProjectSource()`).
