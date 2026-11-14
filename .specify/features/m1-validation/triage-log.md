# S12 triage log (AC6)

Rubric: RFC §7 (Sev-1 blocker … Sev-4 idea). Close rule: zero Sev-1 / Sev-2 open. Every issue found in AC1–AC5 is listed here and is either fixed in this slice with evidence, or filed in `backlog.md` (vault-formatted) with severity and owner.

| Id | Source | Cell / route | Finding | Sev | Decision | Owner | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| I-01 | AC5 degraded, no-JS ×4 cells | `/`, 390 + 1440, light + dark | With JS disabled, the visible hero poster is the imploded one **without** the numbered frame path. The flow poster only switches on via `motion-reduce:` or live state `skipped`, which never happens without JS | **Sev-2** (an AC5 check fails; core path works) | fixed in slice: T008.1 (`noscript:` variant, two classes + regression test) + T008.1b (probe measures the visible poster) | orchestrator | **fixed** | before: `T004-log-degraded.json`, `T004-screenshot-nojs-390-light.png`; after: `T008.1-log-degraded-after.json` (72/72), `T008.1-screenshot-nojs-*-after.png`, `T008.1-log-fix.md` |
| I-02 | AC3 C4 external | LinkedIn profile link | Automated Chromium gets HTTP 999 (bot block) | — (not a defect) | closed by Murphy's browser evidence: document status **200** after redirect to LinkedIn's sign-in wall (`authwall`) for logged-out visitors (RFC §11, P1 decisions) | Murphy | closed | `T004-log-content.json`, `T004-screenshot-linkedin-devtools.png` |
| I-03 | AC4 M2, D3 + D5 | `/` | Pausing during the storyboard's explode step lets that step settle once (labels fade in within ~1.5 s), then the hero is still. Pausing in any other phase freezes it at once | **Sev-3** (Murphy: "accept it", R6) | backlog | orchestrator | open, ships | `T004-log-pause.md`, `T004-screenshot-D3-m2-paused-{a,b}.png` |
| I-04 | AC4 M6 warnings, D3 / D4 / D5 | `/`, project route | Console warning `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` (warning, not an error) | **Sev-4** | backlog (engine change: S5 frozen surface, needs its own slice) | orchestrator | open, ships | `T004-log-console-D3.txt`, `T005-screenshot-D4-m6-console-home.png` |
| I-05 | AC4 visual, D4 Safari 26 | `/` hero, 1324 px, dark | During the zoomed storyboard the engine note "5 layers" briefly overlaps a layer name ("CAPTURE") | **Sev-3** (looks worse than intended; no AC check fails) | backlog | orchestrator | open, ships | `T005-screenshot-D4-i05-overlap.png` |
| I-06 | AC4 D1 + D2 | iOS Safari 17+, Android Chrome mid-range | Phone cells **not run**: no cable or adapter; Murphy chose to skip (R7). No screenshots, no console logs | evidence gap (not a product defect) | **AC4 = NOT MET**, escalated; procedure to close later in `T005-log-device-D1-D2.md` | Murphy | open, blocks AC4 | `T005-log-device-D1-D2.md` |
| I-07 | AC1 | — | 15-second human test **not run**; Murphy chose to skip (R8). Friends' earlier preview views are informal feedback only | evidence gap (not a product defect) | **AC1 = NOT MET**, escalated; protocol stays frozen for a later run | Murphy | open, blocks AC1 | `T006-log-human-test.md` |
| I-08 | housekeeping (RFC Q16) | `.github/workflows` | `eager-3d.yml` still runs a measurement job on every PR; `eager-load.yml` and `hero-eager.yml` are gated to old branches | **Sev-4** | backlog | orchestrator | open, ships | `T004-ci.txt` |

## Harness issues (tooling, fixed in this slice; not product defects)

| Id | Where | Problem | Fix | Evidence |
|---|---|---|---|---|
| H-01 | `guards.sh` workflow guard | compared `A<TAB>path` with `A path` | `tr '\t' ' '` | `T001-log-setup.txt` |
| H-02 | `site-checks.mjs` M1/M2 | a fixed frame pair can land on a hold beat | 8 s change window, loop attribute (R5) | `T002-log-scripts.txt` |
| H-03 | `site-checks.mjs` M3/M4 | a 150 px wheel step correctly snaps back | S11.9 T011i snap method (R5) | `T002-log-scripts.txt` |
| H-04 | `site-checks.mjs` M6 | cancelled prefetch requests counted as failed loads | logged as `requestAborted` (R5) | `T002-log-scripts.txt` |
| H-05 | `run-checks.sh` G3 | local build without `SITE_URL` (CI sets it) | export `SITE_URL` as CI does | `T004-log-local.md` |
| H-06 | `site-checks.mjs` C4 | `#main` skip links fetched as file paths | same-page target check + negative control | `T004-log-local.md` |
| H-07 | `site-checks.mjs` AC5 Tab walk | Save-Data init script missing in the Tab-walk context | init script added | `T004-log-local.md` |
| H-08 | D4 console probing | agent's `copy()` inside timers threw 7 `ReferenceError`s in the console | console cleared; M6 re-run cleanly without timers | `T005-log-device-D4.md` |

## Info (no action)

- Chromium GPU-stall warnings (`GL_CLOSE_PATH_NV … ReadPixels`) appear only when Playwright takes screenshots (read-back).
- Vercel injects its preview toolbar on `*.vercel.app` previews. It is not part of the site.

## Close rule

Open Sev-1: **0**. Open Sev-2: **0** (I-01 fixed, T008.1). Open Sev-3: I-03, I-05. Open Sev-4: I-04, I-08. Evidence gaps blocking ACs: I-06 (AC4), I-07 (AC1).
