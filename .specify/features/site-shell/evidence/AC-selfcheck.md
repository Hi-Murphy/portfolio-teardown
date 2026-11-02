# S10 Site Shell: AC1–AC7 self-check

**Branch:** `task/s10-site-shell` · **PR:** https://github.com/Hi-Murphy/portfolio-teardown/pull/14 · **Preview:** https://portfolio-teardown-git-task-s10-site-shell-murphy-3c4d.vercel.app · **Date:** 2026-11-02 · **Author:** orchestrator (Opus 5.5)

The AC text is verbatim from the frozen brief. The verdict is the orchestrator's self-check; Murphy's final validation decides. All evidence paths are relative to `.specify/features/site-shell/evidence/`.

| AC | Criterion (verbatim) | Verdict | Evidence |
|---|---|---|---|
| AC1 | `/` and `/projects/websocket-inspector` render entirely from the converted content module; the fidelity test (`module ≡ .specify/content/websocket-inspector.json`) is green; project cards show name, tagline, and ≤ 4 tech chips. | **PASS** | `T018-log-fidelity.txt` (`--check` + 9/9: strict equality, parsed equality, sha stamp, negative control, for both content files) · `T002-log-content-fidelity.txt` · `T002b-log-site-copy-fidelity.txt` · `T003-log-content-model.txt` (chips Kotlin · Android · Kotlin Coroutines · Jetpack Compose; no hand-copied strings; no `xploder/fixtures` in prod) · `T008-screenshot-home-*` |
| AC2 | poster-first hero: first paint is the static poster; the 3D hydrates after without layout shift (CLS 0); ambient idle only; `prefers-reduced-motion` → static poster, no animation; no autoplay explosion. | **PASS** (note 1) | `T018-log-site-probe.txt` (hero group: poster in the SSR bytes, not revealed at FCP, no canvas before interaction, revealed after, 5 s idle stays exploded and untweened; cls 0 in 16 cells; reduced-motion: skipped, no canvas, 0 animations) · `T009-log-hero.txt` · `T009-screenshot-hero-*` · `T018-lighthouse-summary-home.json` (LCP 934 ms, CLS 0) |
| AC3 | recruiter path works without WebGL: `/projects` list reachable in ≤ 1 click from home; every card deep-links; unknown slug → 404; with JS disabled, home and project route show poster + readable list (evidence screenshots + DOM). | **PASS** | `T018-log-site-probe.txt` (drill: nav Projects → `/projects` in 1 activation, every card href 200; routes: unknown slug 404; nojs: poster + list in the browser and in the raw exported HTML; no-WebGL outline + message) · `T018-screenshot-nojs-{home,project}.png` + `T018-log-nojs-dom-*` · `T010-screenshot-nojs-project-*` · `T018-log-routes-404.txt` |
| AC4 | axe on both production routes, light + dark: 0 serious, 0 critical; landing keyboard drill passes (nav → cards → project route → back); reduced-motion matrix extended to the new surfaces. | **PASS** | `T018-axe-site-{home,projects,project}-{light,dark}-{desktop,mobile}.json` + `T018-axe-site-summary.json` (12 cells: serious 0, critical 0, moderate 0, minor 0; "incomplete" = text over the canvas, as in S8) · `T018-log-site-probe.txt` (drill: skip → nav → hero CTAs → card → footer, Shift+Tab reverse, no trap, card → project → back, strict CLS 0 across the soft navigation) · `site-motion-matrix.test.ts` + the reduced-motion group · CI job `a11y: axe (production routes)` (now a required check) |
| AC5 | mobile Lighthouse ≥ 95 perf / ≥ 95 a11y on both routes; LCP < 2.5 s; CLS = 0; home first load < 3 MB; evidence artifacts attached. | **PASS** (note 2) | `T018-lighthouse-summary-home.json` (perf 1.0, a11y 1.0, LCP 934 ms, CLS 0×3) · `T018-lighthouse-summary-project.json` (perf 1.0, a11y 1.0, LCP 923 ms, CLS 0×3) · `T018-weight-{home,project}.json` (mobile 204 KB / 196 KB) · CI on the preview: `T016-log-ci-run3.txt` (home 0.99, project 1.0) · history `T016-log-ci-run{1,2}.txt` |
| AC6 | the dev-only routes remain production-excluded (404 on the prod URL); the S10 CLS carry-over is fixed or bounded with evidence. | **PASS** | `T018-log-routes-404.txt` (`/dev/engine`, `/fixtures/fps-calibration` → 404 on the production URL and on the preview; `fixture-exclusion.test.ts` green) · carry-over **fixed**: `T004-log-cls-carryover.txt` (0.000637 / 0.000043 → 0, root cause `ThemeToggle` placeholder box) + `T018-log-site-probe.txt` (`/dev/engine` cls 0 in 4 cells) |
| AC7 | full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion, axe gate extended); frozen-surface checks S2–S8 remain empty; 2 draw calls unchanged on the teardown. | **PASS with one Murphy-authorised exception** (note 3) | `G3-log-gate.txt` + PR #14 checks (all 10 green on `f0ab654`) · `T017-ci-regression-proof.txt` (the new axe gate bites: red → green) · `T018-log-guards.txt` (10/10) · `T018-log-xploder-diff.txt` · `T018-log-site-probe.txt` (draws: project 2, hero 2) · `Q16-revision-note.md` |

## Notes

1. **AC2, "3D hydrates after":** since RFC §9.15–9.16 (Murphy: option A), the hero's 3D hydrates after the visitor's **first interaction**, not right after load. CI showed that load-time hydration cost the home page its perf budget (0.89). The poster is still the first paint, CLS is 0, and reduced motion never mounts the 3D. With no interaction, the hero stays a poster.
2. **AC5 path:** run 1 home 0.89 → A; run 2 project 0.87 → P1 (the workbench mounts on first interaction or "Explore in 3D", RFC §9.18); run 3 and T018 pass on both routes. No threshold was changed and no run was repeated to get green.
3. **AC7, "frozen-surface checks S2–S8 remain empty":** S2/S4, S5, S7 and S8 are untouched. **S6** carries one Murphy-authorised change, the tour trail (`src/overlay/model.ts` only, RFC §9.9, Q16 option A). It is re-sealed at `f65b13c` with the reason in the manifest note, and the guard `XPLODER-SRC-OK` allows exactly that file. Murphy forwards `Q16-revision-note.md` to Merlin after S10; whether it is logged as revision 1 of 2 is a vault call.
4. **Brief Deliverable 2 deviation (not an AC):** the Résumé link and `apps/web/public/resume.pdf` were removed on Murphy's instruction (RFC §9.7.5); `/resume.pdf` → 404.

## Kickoff Stage-3 checklist

| Item | Evidence |
|---|---|
| fidelity test | `T018-log-fidelity.txt` |
| hero CLS/LCP artifacts | `T018-lighthouse-summary-home.json`, `T018-log-site-probe.txt` (hero + cls) |
| recruiter-mode + no-JS screenshots | `T008-screenshot-projects-*`, `T018-screenshot-nojs-*`, `T010-screenshot-nojs-project-*` |
| axe JSON ×4 combos | `T018-axe-site-{home,project}-{light,dark}-*.json` (+ `/projects`, + both viewports) |
| Lighthouse JSON ×2 routes | `T018-lighthouse-summary-{home,project}.json` |
| prod-404 re-check | `T018-log-routes-404.txt` |
| CLS carry-over proof | `T004-log-cls-carryover.txt`, `T018-log-site-probe.txt` |
| frozen-surface diffs | `T018-log-guards.txt`, `T018-log-xploder-diff.txt`, `Q16-revision-note.md` |
| perf (dropped-frames style, information) | `T018-fps.json` (0 dropped frames over the toggle window; no fps threshold) |

## Who finished each task

- **Flash (tier 1):**
  - T001–T004, T005–T012, T012a–T012i (with orchestrator review fixes where noted in the ledger);
  - T013, T014, T018.
- **Orchestrator:**
  - T015 and T016 (while DeepSeek had no balance, on Murphy's "go");
  - T017 ⚑, the S6 re-seal ⚑, T019 ⚑.
- **Tier 1.5:** dormant, skipped (`OPENROUTER_API_KEY` unset).

Details per task are in the `tasks.md` ledger.

## For Murphy's final validation

1. Phone over 4G + desktop, both themes, on the preview:
   - home: the poster, then the 3D after you touch or scroll;
   - `/projects`;
   - the project page: "Explore in 3D", the dock, Layers | Flows, the tour trail, the case study;
   - the 404 page.
2. JS off in the browser: home and the project page are still readable.
3. Keyboard only: Tab from the top through the nav, the hero CTAs and the card; Enter; Back.
4. Merge only on Murphy's explicit "merge". After merge, `main` pushes re-run the production fixture-exclusion job.
5. Send `Q16-revision-note.md` (plus the Résumé deviation) to Merlin.
