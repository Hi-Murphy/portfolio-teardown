# S11.9 — AC1–AC7 self-check

| AC | Verdict | Proof |
|---|---|---|
| **AC1** section set and order | **MET** | `home:probe` order 18/18 at 390/768/1440 against `HOME_SECTIONS` = `g1-approved.txt` (nav, hero, projects, about, contact, footer); permutation unit test; 1440 light full-page shot `T012-screenshot-order-1440-light.png` |
| **AC2** 15-second read | **MET** | fold 12/12 at 390×844 light + dark: name, role, headline, primary CTA (y 334–378), project signal inside the first screen, no horizontal scroll; `T012-screenshot-fold-390x844-{light,dark}.png`, `T012-log-home-probe.json` |
| **AC3** copy fidelity | **MET** | AST scan of home components (printed allowlist), sentinel mutation test (`home-copy-mutation.test.tsx`), rendered copy group PASS; content pass T011g changed the page through `site.json` only |
| **AC4** zero regression | **MET** | `data-site-live-mode="eager"`; **slow class (s2, index 2,198–2,349): reveal 578 / 526 ms ≤ 2.5 s**, zero interaction; poster first paint (site:probe hero 7/7); reduced motion → poster, Save-Data → poster (CI 2/2 each); CLS 0 (12/12 cells + full-cycle observer); Lighthouse perf 1.00 / a11y 1.00 (local ×2) and CI `perf-gate: lighthouse` pass; axe 0 serious / 0 critical (40 states, CI `a11y: axe (production routes)` pass); weight 452,678 B < 3 MB; 2 draw calls |
| **AC5** responsive composition | **MET** | responsive 36/36 at 390/768/1440 × light/dark (no overlap, no clipping, no horizontal scroll, tap targets ≥ 44×44, body ≥ 16 px), axe colour-contrast 0 in both palettes; 12 shots `T012-screenshot-{mobile,tablet,desktop}-{light,dark}[-fold].png` |
| **AC6** structure and a11y | **MET** | structure 52/52: one `h1`, `h2` per section in order, named regions, landmarks, skip link first, Tab walk + visual (column-aware) order; CI drill 13/13 |
| **AC7** CI and surfaces | **MET with one approved exception** | every required check green on PR #22 (`T013-ci.txt`); dev routes 404 and route list = T002 (`site:probe` routes 11/11); no new routes. **Frozen surfaces:** S6–S8 empty; S2/S4 + S5 changed for the opt-in smooth zoom — **exception approved by Murphy (R10.2)**, re-sealed at `3aee8fc`, listed in `approved-xploder-src.txt`, recorded for Merlin in `HANDOFF-merlin.md`. AC7's text is not reworded. |

Brief deviations (R1–R10, all Murphy-approved) are listed in `HANDOFF-merlin.md`. The temporary `home-composition.yml` workflow was removed in the slice's final commit.
