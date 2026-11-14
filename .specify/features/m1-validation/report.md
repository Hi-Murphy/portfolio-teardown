# M1 Validation — MVP report

**Slice:** S12-m1-validation · **Commit (CI-verified):** `5621f3f` · **Product tree:** `ffda3a2` + the I-01 fix (`apps/web/components/home/hero-section.tsx`, `apps/web/test/home-poster-noscript.test.tsx`) · **PR:** #23 (draft) · **Preview:** https://portfolio-teardown-git-task-s12-m1-validation-murphy-3c4d.vercel.app · **Date:** 2026-11-14
**Murphy's verdict (2026-11-14):** **M1 passed**. Murphy: "the NOT MET actually needs human participants and i'd like to skip them". The AC verdicts above are unchanged: AC1, AC4 and AC7 stay NOT MET, and their evidence gaps (I-06, I-07) stay open in `backlog.md`, owner Murphy.

## 1. AC verdicts

| AC | Verdict | Proof |
|---|---|---|
| **AC1** 15-second test, 5 participants | **NOT MET** | Not run. Murphy decided to skip the sessions (RFC §11 R8). 0 of 5 sessions, no sheets. Friends' earlier preview views are informal feedback only (they had seen the site; no timed exposure, questions or verbatim record). `evidence/T006-log-human-test.md`; protocol frozen and unchanged (`protocol.md`, SHA-256 `6566893d…4e60`) |
| **AC2** gate matrix green on the final commit | **MET** | §2 metric table. Lighthouse mobile CI median `/` 0.99/1.00, project 1.00/1.00; CLS 0; weight 460,600 B / 201,133 B; axe 0/0; `seo: meta + og` green; fixture exclusion green; reveal 593/516 ms, 0 input, slow class; 2 draw calls; `/projects*` `<main>` 0 bytes vs `ffda3a2` (the I-01 fix touches `/` only). `evidence/T009-ci.txt`, `T009-results.md`, `T008.1-log-fix.md` |
| **AC3** content integrity | **MET** | C1 copy tests + copy probe green; C2 0 TODO/placeholder/lorem hits; C3 `████████` present (About + RSC payload), employer word/phrase 0 hits in all exported files; C4 GitHub profile 200, project repo 200, **LinkedIn 200** (Murphy's browser, DevTools: the profile link redirects to LinkedIn's sign-in wall for logged-out visitors, document status 200; automated browsers get a bot block 999), `mailto:vibing.murphy@gmail.com` exact, `/`, `/projects`, project route 200, unknown slug 404, 10 skip-link targets exist. `evidence/T004-log-content.json`, `T004-screenshot-linkedin-devtools.png`, `T009-results.md` |
| **AC4** device and browser matrix | **NOT MET** | Desktop Chrome (D3), Safari 26.6.2 (D4), Firefox (D5): 7/7 each, with screenshots and console logs. **iOS Safari 17+ (D1) and Android Chrome mid-range (D2) not run.** There was no cable or adapter, and Murphy decided to skip both (RFC §11 R7), so these cells have no evidence. `evidence/T005-log-device-D{3,4,5}.*`, `T005-log-device-D1-D2.md` |
| **AC5** degraded modes | **MET** | After fix I-01 (T008.1): no-JS, reduced motion and Save-Data each show the poster with the numbered path (steps 1–7, N read from content), no canvas, no animation, no layout break, at 390/1440 × light/dark; the keyboard Tab walk reaches every control in visual order on `/` and the project route in every mode. 72/72 checks; CI `site:probe --ci` (nojs, reduced-motion, drill) green. Before: `T004-log-degraded.json` (8 no-JS FAILs); after: `T008.1-log-degraded-after.json`, `T009-results.md` |
| **AC6** triage log | **MET** | Every issue from AC1–AC5 is in `triage-log.md`. I-01 (the only Sev-2) was fixed with before/after proof and a full regression. Sev-3 (I-03, I-05) and Sev-4 (I-04, I-08) are filed in `backlog.md` with severity and owner. **Zero Sev-1 / Sev-2 open.** The two not-run tests (I-06, I-07) are filed with owner Murphy as evidence gaps, not product defects; they are what make AC1 and AC4 NOT MET above |
| **AC7** CI and close | **NOT MET** | All required checks green on `5621f3f` (`T009-ci.txt`). Frozen surfaces S2–S8 empty vs `3aee8fc` (G12; xploder tests 632 passed). Temporary workflow removed (`guards.sh --final` OK). This report has every AC verdict, the metric table and the open-issue list. **Not met:** AC7 requires "the participant sheets (anonymised as P1–P5)", and there are none because AC1 was not run |

**Summary:** 4 of 7 MET (AC2, AC3, AC5, AC6). 3 NOT MET (AC1, AC4, AC7). All three trace to the two tests Murphy chose not to run (human test, phone cells). No product defect is open above Sev-3.

## 2. Metric table

| Metric | Route | Host | Threshold | Measured | Pass | Artifact |
|---|---|---|---|---|---|---|
| Lighthouse perf | `/` | CI preview, median of 3 (`5621f3f`) | ≥ 0.95 | **0.99** (0.99, 0.99, 0.98) | ✔ | `T009-ci.txt` |
| Lighthouse perf | `/projects/websocket-inspector` | CI preview, median of 3 | ≥ 0.95 | **1.00** (1, 1, 1) | ✔ | `T009-ci.txt` |
| Lighthouse a11y | both | CI preview | ≥ 0.95 | **1.00 / 1.00** | ✔ | `T009-ci.txt` |
| Lighthouse (local, supplementary) | both | local export | — | 1.00 / 1.00 ×3 each | info | `T009-results.md` |
| CLS | `/`, project | local `site:probe --group cls` (12 cells) + every Lighthouse run | 0 | **0** | ✔ | `T009-results.md`, `T009-ci.txt` |
| Weight (mobile / desktop) | `/` | CI preview | < 3,000,000 B | **460,600 / 484,153 B** | ✔ | `T009-ci.txt` |
| Weight (mobile / desktop) | project | CI preview | < 3,000,000 B | **201,133 / 224,707 B** | ✔ | `T009-ci.txt` |
| axe serious / critical | production routes | CI + local `a11y:axe:site` | 0 / 0 | **0 / 0** (0 moderate, 0 minor) | ✔ | `T009-results.md` |
| Eager reveal, zero interaction | `/` | slow class: m1-validation run 43550185247 shard 2, `benchmarkIndex` 2260–2351.5, head `e35e7de` (product-identical to `5621f3f`) | ≤ 2,500 ms, 0 input | **593 / 516 ms**, 0 trusted events | ✔ | `T008.1-log-fix.md` |
| Draw calls | `/` hero + project | local `site:probe --group draws` | 2 | **2** | ✔ | `T009-results.md` |
| `/projects*` `<main>` vs `ffda3a2` | `/projects`, project | local `main-diff.sh` | 0 bytes | **0 / 0 bytes** | ✔ | `T009-results.md` |
| Frozen surfaces S2–S8 vs `3aee8fc` | `packages/xploder` | local + CI | empty | **empty**; 63 files / 632 tests passed | ✔ | `T009-results.md` |

## 3. 15-second test (AC1)

Protocol: `protocol.md` (SHA-256 `6566893d4267a198c325b153be4860a3db874d03ae79124bef7abc99ccb54e60`, frozen at G1, unchanged).

| P | Group | Device | Exposure s | (a) | (b) | (c) |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

Tally: none. **Not run** (Murphy decision, R8). Sheets: none. Informal feedback, which is not evidence: friends who saw the preview earlier liked it.

## 4. Content integrity (AC3)

| Check | Result |
|---|---|
| C1 copy from content (tests + copy probe) | PASS |
| C2 TODO / placeholder / lorem | 0 hits |
| C3 redaction | bar present; employer word and phrase 0 hits in 58 exported files |
| C4 routes | `/`, `/projects`, project 200; unknown slug 404 (local + preview) |
| C4 fragments | 10 skip links, all targets exist |
| C4 mailto | exact |
| C4 external | GitHub ×2 200; LinkedIn 200 in Murphy's browser via its sign-in wall (999 to automated browsers) |

## 5. Device matrix (AC4)

| Cell | Browser | M1 | M2 | M3 | M4 | M5 | M6 | M7 | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| D1 | iOS Safari 17+ | — | — | — | — | — | — | — | **not run** (R7) |
| D2 | Android Chrome, mid-range | — | — | — | — | — | — | — | **not run** (R7) |
| D3 | Chrome for Testing 156 | ✔ | ✔ (R6) | ✔ | ✔ | ✔ | ✔ | ✔ | `T005-log-device-D3.*`, `T004-screenshot-D3-*` |
| D4 | Safari 26.6.2 (macOS) | ✔ | ✔ (R6) | ✔ (Page Down/Up) | ✔ (inspector override) | ✔ | ✔ 0 errors | ✔ | `T005-log-device-D4.md`, `T005-screenshot-D4-*` |
| D5 | Firefox 157 (Playwright) | ✔ | ✔ (R6) | ✔ | ✔ | ✔ | ✔ | ✔ | `T005-log-device-D5.*`, `T004-screenshot-D5-*` |

M2 under R6: as first measured (T004), D3 and D5 failed M2 because of a one-time label settle after pausing mid-explode (I-03). Murphy accepted that as designed, and "paused" is now judged 2 s after the click.

## 6. Degraded modes (AC5)

| Mode | Poster + numbered path | Canvas | Animation | Layout | Tab walk |
|---|---|---|---|---|---|
| No-JS | ✔ (after I-01 fix; before: 4/4 FAIL) | 0 | none | ✔ | ✔ |
| Reduced motion | ✔ steps 1–7 | 0 | none | ✔ | ✔ |
| Save-Data | ✔ steps 1–7 | 0 | none | ✔ | ✔ |

Every mode was checked at 390 and 1440, light and dark: 72/72 checks. Normal-mode keyboard: `site:probe --ci` drill is green.

## 7. Triage log (AC6)

See `triage-log.md` for the full log. Summary:

| Id | Finding | Sev | Status |
|---|---|---|---|
| I-01 | No-JS poster without the numbered path | Sev-2 | **fixed** (T008.1 + T008.1b) |
| I-02 | LinkedIn 999 to bots | — | closed (200 in a real browser) |
| I-03 | Pause mid-explode settles once | Sev-3 | backlog |
| I-04 | `THREE.Clock` deprecation warning | Sev-4 | backlog |
| I-05 | "5 layers" note overlaps a layer name during zoom | Sev-3 | backlog |
| I-06 | Phone cells not run | evidence gap | open → AC4 NOT MET |
| I-07 | Human test not run | evidence gap | open → AC1 NOT MET |
| I-08 | Stale measurement workflows | Sev-4 | backlog |

Harness fixes H-01…H-08 are listed in the triage log; they were tooling only.

## 8. Open issues (ship with M1)

These are Sev-3/Sev-4 only, all in `backlog.md` for the vault:

- **I-03** Sev-3 (orchestrator): pause mid-explode settles once.
- **I-05** Sev-3 (orchestrator): overlay label overlap during zoom.
- **I-04** Sev-4 (orchestrator): `THREE.Clock` deprecation warning.
- **I-08** Sev-4 (orchestrator): stale measurement workflows.

Evidence gaps, owner Murphy: **I-06** (phones) and **I-07** (human test). The steps to close each are in `backlog.md`.

## 9. CI (AC7)

PR #23 head `5621f3f`: `build (typecheck, lint, test, build)`, `secrets (gitleaks)`, `seo: meta + og`, `perf-gate: lighthouse (mobile)`, `perf-gate: weight (< 3 MB)`, `a11y: axe (production routes)`, `a11y: axe (engine fixture export)`, `perf: fixture exclusion`, `perf: fps calibration`, `perf: eager-3d (measurement)` are all **pass** (ci.yml run 43551237257, perf.yml run 43551237391; `T009-ci.txt`). The report commit that follows is documentation only; its CI result is recorded in the PR.

## 10. Deviations and escalations

All are recorded in RFC §11.

- **R1/R2:** the agent drives every device cell. D4 used Orca computer-use, and Murphy's Safari setting "Show features for web developers" was switched on.
- **R3/R4:** one check script, 9 tasks.
- **R5:** device-check method fixes made before any measurement counted.
- **R6:** pause settle window (Murphy).
- **R7:** phone cells skipped (Murphy) → AC4 NOT MET.
- **R8:** human test skipped (Murphy) → AC1 NOT MET (and AC7's sheets).
- **LinkedIn:** closed with Murphy's browser evidence.

No acceptance criterion was reworded.

## 11. Execution tiers

| Task | Finished by |
|---|---|
| T001, T002 | DeepSeek Flash (tier 1) + orchestrator review fixes |
| T003, T004, T005 (D3/D4/D5), T008, T008.1b, T009 | orchestrator |
| T006, T007 | not run (Murphy decision) |
| T008.1 | DeepSeek Flash (tier 1) + orchestrator review |

Tier 1.5 was dormant (skipped) for every task. No task needed the ×2 escalation.
