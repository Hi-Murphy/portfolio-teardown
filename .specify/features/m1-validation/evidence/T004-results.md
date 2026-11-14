# T004 — automated run results (P1)

**Commit / deploy:** `89db889` (product tree = `ffda3a2`) · **Preview:** https://portfolio-teardown-git-task-s12-m1-validation-murphy-3c4d.vercel.app · **PR:** #23 · **Date:** 2026-11-14
**CI runs:** `ci.yml` 43543037293 · `perf.yml` 43543037303 · `m1-validation.yml` 43543037520 (all jobs green; see `T004-ci.txt`) · **Local:** `run-checks.sh` on this Mac (Apple M4), Playwright Chromium 156.0.8078.4, Firefox 157.0

## Gate matrix (AC2, AC7)

| Id | Gate | Host | Threshold | Measured | Result | Artifact |
|---|---|---|---|---|---|---|
| G1 | typecheck, lint, test, build | CI `build` + local | exit 0 | green / exit 0 | PASS | `T004-ci.txt`, `T004-log-local.md` |
| G2 | gitleaks | CI | green | green | PASS | `T004-ci.txt` |
| G3 | `seo: meta + og` | CI (binding) + local | green | CI green; local PASS after the SITE_URL harness fix (first local run built without `SITE_URL`, see review notes) | PASS | `T004-ci.txt`, `T004-log-local.md` |
| G4 | Lighthouse mobile `/` | CI preview, median of 3 (binding) | ≥ 0.95 / ≥ 0.95 | **0.97 / 1.00** (runs 0.97, 0.98, 0.95; a11y 1, 1, 1) | PASS | `T004-lighthouse-summary-home.json` |
| G4 | Lighthouse mobile `/projects/websocket-inspector` | CI preview, median of 3 (binding) | ≥ 0.95 / ≥ 0.95 | **1.00 / 1.00** (runs 1, 1, 0.99) | PASS | `T004-lighthouse-summary-project.json` |
| G4 | Lighthouse local (supplementary) | local export | — | `/` 1/1 ×3, project 1/1 ×3 | info | `T004-log-local.md` |
| G5 | CLS | local `site:probe --group cls` (12 cells) + Lighthouse | 0 | **0** in all 12 cells and in every Lighthouse run | PASS | `T004-log-local.md`, Lighthouse summaries |
| G6 | weight `/` | CI preview (binding) | < 3,000,000 B | **460,263 B** mobile / 483,835 B desktop (local 452,651 / 452,693) | PASS | `T004-weight-home.json` |
| G6 | weight project route | CI preview (binding) | < 3,000,000 B | **200,957 B** mobile / 224,527 B desktop (local 199,758) | PASS | `T004-weight-project.json` |
| G7 | axe serious / critical | CI both axe jobs + local `a11y:axe:site` | 0 / 0 | **0 / 0** (local: 0 moderate, 0 minor) | PASS | `T004-ci.txt`, `T004-log-local.md` |
| G8 | fixture exclusion | CI `build` step + `perf: fixture exclusion` (preview) + local routes | dev routes 404 | green; local routes PASS | PASS | `T004-ci.txt`, `T004-log-local.md` |
| G9 | eager reveal, slow class | `m1-validation.yml` shard 3, `benchmarkIndex` 2251.5–2328 (attempt 1 of ≤ 10; shards 1–2 not slow class) | ≤ 2,500 ms, 0 input | **677.7 ms / 644.6 ms** (`revealed`), `no-trusted-events` 0 / 0 | PASS | `T004-log-reveal.md`, `T004-log-reveal-s3-r{1,2}.json` |
| G10 | draw calls | local `site:probe --group draws` | 2 | **2** (hero 104/104 frames, project 32/32) | PASS | `T004-log-local.md` |
| G11 | `/projects*` `<main>` vs `ffda3a2` | local `main-diff.sh` | 0 bytes | **0 / 0 bytes** | PASS | `T004-log-local.md` |
| G12 | frozen surfaces S2–S8 vs `3aee8fc` | local | empty + tests green | empty; xploder 63 files / 632 tests passed | PASS | `T004-log-local.md` |
| G13 | hero contract | local `site:probe --group hero` + `eager:probe --expect live-loop` | PASS | PASS | PASS | `T004-log-local.md` |

## Content integrity (AC3)

| Id | Check | Measured | Result | Artifact |
|---|---|---|---|---|
| C1 | copy tests + `home:probe --group copy` | green | PASS | `T004-log-local.md` |
| C2 | TODO / placeholder / lorem | 0 hits | PASS | `T004-log-content.json` |
| C3 | redaction | bar present in About + RSC payload; employer word 0 hits, phrase 0 hits in 58 exported files | PASS | `T004-log-content.json` |
| C4 | internal routes | `/`, `/projects`, project route 200; unknown slug 404 (local + preview) | PASS | `T004-log-content.json` |
| C4 | same-page fragments | 10 skip links, all targets exist | PASS | `T004-log-content.json` |
| C4 | `mailto` | `mailto:vibing.murphy@gmail.com` exact | PASS | `T004-log-content.json` |
| C4 | external | GitHub profile 200, project repo 200, **LinkedIn 999** (headless Chromium) | **FAIL → I-02** | `T004-log-content.json` |

## Degraded modes + keyboard (AC5) — 64 PASS / 8 FAIL

| Mode | Poster + numbered path | Canvas | Animation | Layout | Tab walk `/` + project |
|---|---|---|---|---|---|
| No-JS | **FAIL in 4/4 cells**: the visible poster is the imploded one without `[data-site-poster-flow]` (0 steps); the flow poster is `display:none` → **I-01** | 0 ✔ | none ✔ | ✔ | ✔ (390 + 1440) |
| Reduced motion | ✔ steps 1–7 (4/4) | 0 ✔ | none ✔ | ✔ | ✔ |
| Save-Data | ✔ steps 1–7 (4/4) | 0 ✔ | none ✔ | ✔ | ✔ (after harness fix) |

Normal-mode keyboard: CI `a11y: axe (production routes)` runs `site:probe --ci` (drill group) — green. Artifacts: `T004-log-degraded.json`, `T004-screenshot-{nojs,reduced,savedata}-390-light.png`.

## Desktop cells (AC4, D3 + D5, against the preview)

| Cell | Browser | M1 | M2 | M3 | M4 | M5 | M6 | M7 |
|---|---|---|---|---|---|---|---|---|
| D3 | Chrome for Testing 156.0.8078.4 | ✔ | **FAIL → I-03** | ✔ | ✔ | ✔ | ✔ (0 errors; 7 warnings) | ✔ |
| D5 | Playwright Firefox 157.0 | ✔ | **FAIL → I-03** | ✔ | ✔ | ✔ | ✔ (0 errors; 6 warnings) | ✔ |

M2 as measured: after Pause the loop reads `paused` and the model stops, but frames 0.5 s and 3.5 s after the click differ. The engine's settled labels and dimension lines fade in once. `T004-log-pause.md` reproduces it: pausing during the **explode** phase shows exactly one change between +0.5 s and +1.5 s, then the hero is still. Pausing in any other phase gives no change at all. Resume works in both cells. Console warnings: `THREE.Clock` deprecation (→ I-04) and Chromium GPU-stall messages from screenshot read-backs. Artifacts: `T004-log-device-D{3,5}.json`, `T004-log-console-D{3,5}.txt`, `T004-screenshot-D{3,5}-*.png`, `T004-screenshot-D3-m2-paused-{a,b}.png`.

## Issues for triage (T008)

| Id | Source | Finding | Severity (rubric, provisional) |
|---|---|---|---|
| I-01 | AC5 no-JS ×4 cells | No-JS shows the poster **without** the numbered frame path | Sev-2 (an AC5 check fails; core path works) |
| I-02 | C4 external | LinkedIn answers 999 to automated Chromium; AC3 needs 200 | open until Murphy's browser evidence (Q11) |
| I-03 | AC4 M2, D3 + D5 | Pausing mid-explode: a one-time label fade-in within ~1.5 s, then still | Sev-2 under the M2 check as written — **Murphy decision** (see STOP report) |
| I-04 | M6 warnings | `THREE.Clock` deprecation warning in the console (warning, not error) | Sev-4 |

## Orchestrator review notes (harness, not product)

The first local run had three more FAIL rows, all caused by the harness. Each was fixed and that row re-run; the first-run output is kept in `T004-log-local.md`.

- **G3:** the local build had no `SITE_URL`, so canonical and OG URLs used `localhost`. CI's binding job sets it and was green. `run-checks.sh` now exports it, the same as CI.
- **C4 internal:** the `#main` skip links were fetched as file paths (`/projects.html`). They are now checked as same-page targets, and a negative control (`#nope`) fails as it should.
- **AC5 Save-Data Tab walk:** the Tab-walk context lacked the Save-Data init script, so the hero booted normally and its Pause button appeared after the walk. The init script is now added, the same as the poster checks.

The D3/D5 M2 result was **not** re-run to green; it stands as measured (I-03).
