# S08 A11y Floor: AC1–AC7 self-check

Branch `task/s08-a11y-floor`, PR #13. Evidence lives in this directory. The ACs are quoted verbatim from the frozen brief. Every row points at the machine-made artifacts (kickoff Hard Rule 5). Murphy's VoiceOver pass (`voiceover-checklist.md`) completed AC2's human leg on 2026-11-02. Murphy accepted this table at the final gate.

| AC | Criterion (verbatim, abridged only by "…") | Evidence | Verdict |
|---|---|---|---|
| AC1 | keyboard-only drill passes for fixtures A and B: every component selectable via keyboard, panel opens from the keyboard, `Esc` closes it, focus returns to the triggering element, no traps, tab order logical; automated drill script + log attached. | `T016-log-keyboard-drill-a.txt`, `T016-log-keyboard-drill-b.txt` (forward and backward Tab walk; every component ArrowDown → Enter → dialog + heading focus → Esc → proxy; Space variant; pointer variant; tour jump and pause); the same drill runs in CI (`a11y` job, `T015-ci.txt`); DOM tests `T007`/`T008`/`T009` logs; script `tools/perf/src/a11y-probe.ts` (`drill` group) | ✅ PASS |
| AC2 | screen-reader evidence: live region mounts at viewer mount and announces step 1 (asserted in the DOM test), panel open/close announcements assertable in the accessibility tree, chips carry label+category, **lettering nodes are `aria-hidden`** and expose no duplicate accessible text; ARIA snapshot evidence attached. | `T007-log-live-region.txt` (jsdom DOM test: same node, empty at mount → step 1 after `play()`); `T016-log-aria-{idle,focused,detail,case-study,tour-step1,jump}.txt` (CDP AX tree + `ariaSnapshot`: lettering and overlay roots ignored, no part-number text, dialog name + description, chip text "Kotlin, language"); `T016-log-announce.txt`; `T010-log-aria-smoke.txt`; before/after vs `RFC-log-baseline.txt` | ✅ PASS (machine) + ✅ **Murphy's VoiceOver pass (2026-11-02)** |
| AC3 | axe-core on `/dev/engine` light+dark × desktop+mobile in CI: **0 serious, 0 critical** violations; the gate fails on regression (proven with a deliberately broken state, reverted). | `T016-axe-{light,dark}-{desktop,mobile}.json`, `T016-axe-summary.json` (11 states per combo: serious 0, critical 0; R3 ledger 72 entries, all layer-focus at opacity ≤ 0.3); CI job `a11y: axe (engine fixture export)`; `T015-ci.txt`: run 1 green → **run 2 red** on the broken commit `42985ae` (`aria-hidden-focus` ×32, exit 6) → run 3 green after the revert → run 4 green after the ledger-race fix | ✅ PASS |
| AC4 | measured contrast ratios meet AA for all text/UI surfaces in both palettes; offending tokens fixed at the CSS-variable layer; evidence table attached. | `T016-log-contrast-table.md`: the token table (`T011-log-contrast-token-after.txt`), browser measurement (`T016-log-contrast-browser.json`, computed + pixel sampling, every non-exception glyph measured; pixel min 5.04) and the axe column. All non-exception rows meet AA in both palettes. Token-level offenders: **none** (no `blueprint.ts` change). Non-token offender fixed: highlighted face lettering → ink (R2, `T011-*`; it was 3.05/3.34 and 4.24/3.01). Exceptions listed, not hidden: layer-focus dimming (`inactive-dim`, R3), disabled buttons (`disabled-control`) | ✅ PASS (with the R2/R3 decisions recorded in RFC §9) |
| AC5 | reduced-motion coverage matrix complete for all animations (including S7 lettering/panel additions) — 0 animations under emulation, with a twin for each; evidence attached. | `packages/xploder/test/a11y-motion-matrix.json` (12 rows incl. S7 panel and lettering); `T006-log-motion-matrix.txt` (completeness scanner + negative control); `T016-log-reduced-motion.txt` (12/12 rows: `getAnimations()` = 0 in every frame sample, no tweening, frame delta ≤ 2) | ✅ PASS |
| AC6 | JS-disabled render shows poster + accessible project list (screenshot + DOM evidence); no-WebGL path shows the same list plus a message (evidence). | `T016-log-nojs-dom.txt`, `T016-screenshot-nojs-mobile-{light,dark}.png`, `T012-screenshot-nojs-mobile-*.png`; `T016-log-nowebgl-dom.txt` (init-script stub **and** `--disable-3d-apis`: 0 canvas, message (`role=status`) + poster (`img`) + `navigation "Projects"` with 3 links, 0 page errors), `T016-screenshot-nowebgl-desktop-*.png` | ✅ PASS |
| AC7 | full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion) + the new axe gate; frozen-surface checks for S2–S7 remain empty; 2 draw calls unchanged; zero CLS. | `T017-ci.txt` (all checks incl. `a11y` green on the PR head); `T016-log-surface-diff.txt` (S2/S4, S5, S6, S7-Tier-A hash diffs empty; Tier-B and C3 diffs listed); `T016-engine-probe.json` (S4–S7 198/198); `T016-log-metrics.txt` (`drawCalls = 2` idle/detail/focused; CLS with sources inside the viewer = 0); `T016-fps.json` (tour: 0 dropped frames over 5.05 s, `drawCalls = 2`, dropped-frames verdict pass) | ✅ PASS |

## Decisions and changes Murphy may want in the vault

- **Presentation changes outside the ACs, made on Murphy's direction** (possible revision entries, Murphy's call):
  - R2: the highlighted-face lettering number and name are drawn in ink (an a11y fix);
  - T012a/T012b: face part names show only from the second zoom-in click, all-or-nothing. With legible ≥ 8 px names, they appear from click 3 (A), 4 (C) and 5 (B).
- **Corrections:**
  - C1: jsdom tests in `apps/web`;
  - C2: test-only relative imports of xploder internals;
  - C3: the S7 probe reads the visible chip label.
- **Review fixes:**
  - visible chip comma rejected;
  - skip-link overlay;
  - honest contrast rows;
  - axe dim-ledger race.
- **Escalations:** none beyond tier 1. T009 needed a second Flash attempt (the first ran out mid-task).
