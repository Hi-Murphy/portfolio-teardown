# Tasks: S12 M1 Validation (MVP gate)

**Input:** `rfc.md` (approved at Gate 1: all §10 defaults), `spec.md`, `plan.md` in `.specify/features/m1-validation/`. **Inputs, not tasks:** `protocol.md` and `protocol-sheet-template.md` (script, scoring rules, pass line, sheet). They were frozen at G1, are never edited, and are checked by `guards.sh` guard 2.

**Executor:** DeepSeek Flash 4.1 (tier 1: `codex exec -p deepseek`) for tooling tasks. The orchestrator handles outward-facing, judgement and Murphy-hands steps (plan § Executor plan).

- **Sandbox off** for every task that builds, serves or launches a browser. Writes are limited to the task worktree and `/tmp/s12-checks`.
- **Before each dispatch wave**, probe `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A 402 = unavailable: pause, report, and offer top-up / orchestrator on "go" / split.
- **Escalation (kickoff Hard Rule 9):**
  - Tier 1.5 is dormant (skip recorded per task).
  - If Flash is stuck ×2, pause and report with 5h/7d usage; the orchestrator takes over only on Murphy's "go".
  - Each ledger row states the finishing tier.
- **Usage pacing:** at ≥ 85 % of the 5h window no new task starts: finish and commit the current one, then report and STOP.

**Format & rules (every task):**

- Each check starts with `set -euo pipefail; F=.specify/features/m1-validation; mkdir -p /tmp/s12-checks $F/evidence`, and ends with `bash $F/guards.sh` (from T001 on).
- Evidence: `evidence/T<NNN>-<kind>[-<variant>].<ext>` per `.specify/EVIDENCE.md`. Run `gitleaks dir` on new prose and evidence before each commit. Local paths → `<local-path>`, ports → `PORT`. Participants appear only as P1–P5.
- **Never touch:** `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, `protocol*.md`; `apps/**` and `packages/**` (except a T014.x fix, path listed in `fix-ledger.txt`); `budgets.ts`; every workflow except `m1-validation.yml`.
- **A failed gate is never re-run until green.** One re-run is allowed only for exit 3/4. Exit 6 stays red and goes to triage.
- Commit prefix: `S12/TNNN:`, ending with the attribution lines. Phase boundaries: `S12/stage-3:`.
- **STOP at every phase boundary (P0…P5)** and after each T014.x fix.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☐ | | | |
| T002 | ☐ | | | |
| T003 | ☐ | | | |
| T004 | ☐ | | | |
| T005 | ☐ | | | |
| T006 | ☐ | | | |
| T007 | ☐ | | | |
| T008 | ☐ | | | |
| T009 | ☐ | | | |
| T010 | ☐ | | | |
| T011 | ☐ | | | |
| T012 | ☐ | | | |
| T013 | ☐ | | | |
| T014.x | ☐ (created per Sev-1/Sev-2 issue) | | | |
| T015 | ☐ | | | |

---

## Phase P0 — Harness (FR2, FR3, FR4, FR5, FR7)

### T001 — Guards, regression runner, `<main>` diff, draft PR

- **Do:**
  1. Write `guards.sh` (guards 1–8 in plan § Guards, `--final` flag) and its self-test.
  2. Write `main-diff.sh` (G11: `ffda3a2` export built in a temporary worktree, with S11.9 `cross-route.sh` normalisation, `<main>` of both `/projects*` pages).
  3. Write `regress-all.sh` (plan § Regression runner); C1–C4 rows stay `SKIP (T004)` until T004 lands.
  4. Create an empty `fix-ledger.txt`. Record `evidence/T001-routes.txt` from the `ffda3a2` export.
  5. **Orchestrator:** push the branch, open a **draft PR** to `main`, and record the Vercel preview URL + deploy SHA in `evidence/T001-log-preview.txt`.
- **Check:** guards 8/8 OK; the self-test shows each guard bite; `main-diff.sh` reports 0 bytes on the untouched tree; `regress-all.sh` runs end to end (results are not judged here, T006 does that); the preview URL answers 200.
- **Evidence:** `T001-log-guards.txt`, `T001-routes.txt`, `T001-log-preview.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the preview URL from `T001-log-preview.txt` on your phone. It loads, and the hero plays. Don't show it to anyone yet.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK to push the branch and open the draft PR. Default: covered by G1's Q1 approval; proceeds without asking again.

### T002 — Temporary slow-class workflow (G9)

- **Do:**
  1. Restore S11.9's `home-composition.yml` measure job from git history as `.github/workflows/m1-validation.yml`, gated to `github.head_ref == 'task/s12-m1-validation'`, with labels renamed. It is measurement-only and never fails on a verdict.
  2. Copy `ci-summary.mjs` from S11.9 with labels renamed. Steps: `perf:host` → `pnpm build` → `eager:probe --serve apps/web/out --route / --runs 2 --expect live-loop` (+ `--reduced-motion`, `--save-data` cross-checks).
- **Check:** YAML parses; a local dry run of the measure commands passes (local host is not slow class, as expected); guard 6 OK.
- **Evidence:** `T002-log-workflow.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing to test by hand. The workflow appears in the PR's checks after the next push.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. Default: the workflow is deleted in T015.

### T003 — `home:probe --group degraded` (FR5 tooling)

- **Do:** add the `degraded` group to `tools/perf/src/home-probe.ts` (+ CLI wiring if needed), implementing RFC §5.1 checks 1–5 and the §5.3 Tab walk:
  - **modes:** `javaScriptEnabled: false`, `reducedMotion: 'reduce'`, and the Save-Data emulation reused from `eager:probe`;
  - **viewports:** 390×844 and 1440×900;
  - **palettes:** light and dark;
  - **routes:** `/` for the poster checks; `/` and `/projects/websocket-inspector` for the Tab walk.

  N is read from the hero project's first content flow, never hard-coded. Write pure evaluators in `tools/perf/test/home-probe-degraded.test.ts`, with negative controls: canvas present, step missing, steps out of order, running animation, overlap.
- **Check:** `pnpm --filter perf-tools test` green, and the negative controls fail as intended. `pnpm home:probe --serve apps/web/out --group degraded` runs and writes JSON + screenshots (the verdict is judged in T010). The default groups are unchanged.
- **Evidence:** `T003-log-degraded-harness.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing by hand. Optional: glance at one poster screenshot in the run output.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. Default: tooling only, no product change.

### T004 — Content and link scripts (FR3 tooling)

- **Do:**
  1. `content-scan.mjs`:
     - **C2:** scans the rendered text and the `alt` / `title` / `aria-label` / `content` attributes of every exported `.html` for `/\b(todo|fixme|tbd|xxx|lorem|ipsum|placeholder)\b/i`.
     - **C3:** checks that the `████████` bar is present in About on `/` and in its RSC payload. It also checks that the employer word appears in no file under `apps/web/out/`. The word is derived at runtime from `git show b52fc06:.specify/content/site.json` and is never printed, logged or written to disk.
  2. `link-check.mjs` (**C4**):
     - every `<a href>` in the export, deduplicated;
     - internal routes against the local export **and** the preview: `/`, `/projects` and the project route 200, `/projects/unknown-slug` 404;
     - external links through Playwright Chromium document navigation (status after redirects);
     - an exact `mailto:` match.
  3. Wire C1–C4 into `regress-all.sh`.
- **Check:** each script has a negative control. A scratch copy of `out/` with an injected "TODO", and one with the redaction bar removed, both fail. Guards OK.
- **Evidence:** `T004-log-scripts.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing by hand.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing now. If LinkedIn is not 200 in T007, you'll be asked for a DevTools screenshot (Q11).

### T005 — Device harness and Murphy's checklist (FR4 tooling)

- **Do:**
  1. `device-check.mjs` runs M1–M7 (RFC §4.2) with full console capture (`console`, `pageerror`, failed requests). It runs in three modes:
     - **D3:** Playwright Chromium (Chrome for Testing) at 1440×900;
     - **D5:** Playwright Firefox at 1440×900;
     - **D2:** `connectOverCDP('http://127.0.0.1:9222')` after `adb forward tcp:9222 localabstract:chrome_devtools_remote`. Murphy does the taps it asks for; the agent takes screenshots and logs.
  2. Install the Firefox binary (`pnpm --filter perf-tools exec playwright install firefox`).
  3. Write `device-checklist.md` for Murphy: D1 iPhone and D4 Mac Safari steps M1–M7, with Web Inspector setup, what to screenshot, how to export the console, and how to toggle Reduce Motion. It also covers D2 (USB debugging on, cable in, the prompts to accept, then follow the agent's cues).
- **Check:** a D3 + D5 dry run against the local export writes shots and a console log per check. The D2 mode is exercised up to "no device connected" (exit 3 with a clear message). The checklist has one numbered step per M-check per cell.
- **Evidence:** `T005-log-device-harness.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `device-checklist.md` once: is every step clear enough to follow without asking?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Your Android phone model and Android version. Default: asked at this phase's STOP.
  2. Your iPhone's iOS version (must be 17+). Default: asked at this phase's STOP.
  3. A USB cable for each phone, available for P2. Default: assumed.

**— STOP (end of P0) —**

---

## Phase P1 — Gates and content integrity (FR2, FR3, FR7)

### T006 — Gate matrix G1–G13 on the product tree

- **Do (orchestrator + Flash):**
  1. Run `regress-all.sh` on a fresh build (local half).
  2. Push and read CI on the draft PR: `build`, `secrets (gitleaks)`, `seo: meta + og`, `perf-gate: lighthouse (mobile)` (binding G4), `perf-gate: weight (< 3 MB)` (binding G6), both `a11y: axe` jobs, `perf: fixture exclusion`, `perf: fps calibration`.
  3. Run `m1-validation.yml` until a slow-class attempt exists (cap 10). Download the artifacts and summarise them with `ci-summary.mjs`.
- **Check:** every G row has its threshold vs measured value and an artifact. Any miss is an issue for T013, never re-run to green.
- **Evidence:** `T006-log-gates.md` (one table, G1–G13), `T006-lighthouse-summary-{home,project}.json` (CI median), `T006-weight-{home,project}.json`, `T006-log-axe.json`, `T006-log-reveal.json` (with `benchmarkIndex`), `T006-log-draws.json`, `T006-log-main-diff.txt`, `T006-log-surfaces.txt`, `T006-ci.txt` (run URLs).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the G1–G13 table in `T006-log-gates.md`: every row has a number and a PASS/FAIL.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing, unless the slow class doesn't arrive in 10 attempts. Then you choose: keep waiting / escalate to Merlin. Default: escalate with the `benchmarkIndex` log.

### T007 — Content integrity C1–C4

- **Do:** run C1 (the copy tests + `home:probe --group copy`), C2, C3 and C4 against the local export and the preview.
- **Check:** each C row has a result and an artifact. LinkedIn: browser status first; if not 200, ask Murphy (Q11).
- **Evidence:** `T007-log-content.md` (C1–C4 table), `T007-log-links.json`, `T007-log-scan.json` (hit counts only, never the employer word).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Tap the email, GitHub and LinkedIn links on the preview once yourself. Do they open the right place?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Only if LinkedIn isn't 200 to the browser: open the LinkedIn link in your own browser with DevTools → Network and send a screenshot of the document row with its status. Default: not needed.

**— STOP (end of P1) — any Sev-1 found here stops the slice before P3.**

---

## Phase P2 — Device matrix and degraded modes (FR4, FR5)

### T008 — Agent cells D3 (Chrome) and D5 (Firefox)

- **Do:** run `device-check.mjs` D3 and D5 against the **preview** URL: M1–M7, with M4 under `reducedMotion: 'reduce'`.
- **Check:** every M row PASS/FAIL with shots, a console log per cell, and the exact browser versions recorded.
- **Evidence:** `T008-log-device-D3.md`, `T008-log-device-D5.md`, `T008-log-console-D3.txt`, `T008-log-console-D5.txt`, `T008-screenshot-D3-*`, `T008-screenshot-D5-*`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the D3/D5 shots: does anything look broken to you that a check would miss?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. Default: Playwright builds, labelled (Q9).

### T009 — Murphy cells D1 (iOS Safari), D4 (desktop Safari), D2 (Android Chrome)

- **Do:**
  - **D1, D4:** Murphy follows `device-checklist.md` on the preview URL and sends the screenshots + the exported console log per cell.
  - **D2:** Murphy connects the phone over USB and taps on the agent's cues; the agent runs `device-check.mjs` D2 and records everything.
  - The agent files every item under `evidence/` with the T009 names and fills the M1–M7 grid.
- **Check:** each cell has M1–M7 + a console log. A missing log = unproven (AC4 → escalate).
- **Evidence:** `T009-log-device-{D1,D2,D4}.md`, `T009-log-console-{D1,D2,D4}.txt`, `T009-screenshot-{D1,D2,D4}-*`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Do D1 and D4 exactly as the checklist says; that is the test.
  2. D2: hold the phone and tap when asked.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. D1 + D4 screenshots and console exports, sent in chat or dropped into a folder you name. Default: sent in chat.
  2. About 20 minutes with the Android phone on a cable for D2. Default: right after D1/D4.
  3. If your Android phone is a flagship rather than mid-range: whether to borrow a mid-range one. Default: record the model and flag it in the report.

### T010 — Degraded modes and keyboard pass (FR5)

- **Do:**
  1. `pnpm home:probe --serve apps/web/out --group degraded --out $F/evidence/T010-degraded`: 3 modes × 390/1440 × light/dark, plus the Tab walk on `/` and the project route.
  2. Cross-checks: `pnpm site:probe --serve apps/web/out --group nojs,reduced-motion` and `pnpm eager:probe --serve apps/web/out --route / --runs 2 --reduced-motion | --save-data`.
  3. Normal-mode keyboard: `pnpm site:probe --serve apps/web/out --group drill` + `pnpm home:probe --serve apps/web/out --group structure`.
- **Check:** each mode × viewport × palette cell PASS/FAIL against RFC §5.1 checks 1–5, and the Tab walk PASS/FAIL per mode.
- **Evidence:** `T010-log-degraded.md` (grid), `T010-log-degraded.json`, `T010-screenshot-{nojs,reduced,savedata}-{390,1440}-{light,dark}.png`, `T010-log-keyboard.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the six 390 poster shots: is the numbered path readable and the layout intact?
  2. Optional: on your phone, turn on Reduce Motion and open the preview. Do you see the poster with numbers?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. Default: Chromium emulation is the binding check, as approved.

**— STOP (end of P2) — any Sev-1 found here stops the slice before P3.**

---

## Phase P3 — Human test (FR1)

### T011 — Five sessions (Murphy's hands)

- **Do (Murphy):** run P1–P5 exactly per `protocol.md` on the preview URL, using one copy of `protocol-sheet-template.md` per session. Keep the name ↔ P-label mapping yourself; never send it.
- **Agent:** before the first session, re-check `guards.sh` guard 2 (the protocol is unchanged), give Murphy the test URL + deploy SHA for the sheets, and do nothing else until the raw notes arrive.
- **Check:** 5 valid sessions (invalid ones kept with their reason and replaced from the same group); the group mix is 2 recruiter/hiring-adjacent, 2 developer, 1 non-technical.
- **Evidence:** Murphy's raw notes (input to T012).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the script word for word, and give no hints. "Do whatever you like." is the only answer during the 15 s.
  2. Check the stopwatch reads 14–16 s for each session.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Five raw sheets (typed text, or a photo of the paper), one per participant. Default: sent together after the last session.
  2. Any invalid session, with its reason, as its own sheet.

### T012 — Sheets, scoring and tally (orchestrator)

- **Do:**
  1. Copy each raw sheet **unchanged** into `evidence/P<n>-sheet.md`; unreadable words become `[illegible]`, and Murphy is asked about them.
  2. Score (a), (b) and (c) with the `protocol.md` §2.4 rule ids; ambiguous → INCORRECT, with a note.
  3. Tally against the pass line.
- **Check:** every score cites a rule id. The tally (a) n/5 · (b) n/5 · (c) n/5 → MET only if all three are ≥ 4. Murphy reviews; a score changes only with a rule-based reason.
- **Evidence:** `P1-sheet.md` … `P5-sheet.md` (+ any invalid ones), `T012-log-tally.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Compare each `P<n>-sheet.md` with your notes: identical?
  2. Review the scores: agree, or flag one with the rule that supports a change.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "Scores agreed", or your flags. Default: none; the scores stand as written by the rules.

**— STOP (end of P3) —**

---

## Phase P4 — Triage and fixes (FR6)

### T013 — Triage log and backlog

- **Do:** collect every failing check and remark from T006–T012 into `triage-log.md` (`I-NN`, source, cell/route, severity per the RFC §7 rubric, evidence, decision, owner, status). Write `backlog.md` (vault-formatted) with every Sev-3/Sev-4, including the Q16 housekeeping item (stale workflows, Sev-4, orchestrator) and AC1 comprehension remarks (Sev-3, Murphy, Q15). Create one **T014.x** per Sev-1/Sev-2.
- **Check:** every failing row from T006–T012 maps to an `I-NN`; anything that fails an AC check is ≥ Sev-2.
- **Evidence:** `triage-log.md`, `backlog.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the severities: does any feel wrong against the rubric?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK on the triage. Default: the rubric decides; you can flag a row.
  2. For a Sev-1/Sev-2 bigger than the Q14 cap: fix in S12 (exception) or leave it open (AC6 NOT MET). Default: escalated to you, never decided silently.

### T014.x — One Sev-1/Sev-2 fix per task (conditional)

- **Do (Flash, orchestrator reviews):**
  1. Reproduce the issue with its failing check → `T014.x-*-before.*`.
  2. Make the smallest fix within the Q14 cap and add the changed paths to `fix-ledger.txt`.
  3. Re-run the failing check → `T014.x-*-after.*`.
  4. Run the full regression: `regress-all.sh`, then push, CI green, and G9 again if the hero or its bundle changed.
- **Check:** after-artifact PASS; `regress-all.sh` all PASS; guards OK; `main-diff.sh` 0 bytes or the hunk justified in `fix-ledger.txt`; the issue status becomes `fixed`.
- **Evidence:** `T014.x-log-fix.md` (issue, cause, diff stat, before/after paths, regression table).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the preview after the fix and repeat the step that failed.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing, unless the fix touches `/` after P3. Then the record says AC1 stands as measured (R6). Default: recorded, no re-test.

**— STOP after each T014.x and at the end of P4 —**

---

## Phase P5 — Report and close (FR7, all ACs)

### T015 — Final regression, CI, report

- **Do:**
  1. Delete `m1-validation.yml` (its run URLs stay in `T006-ci.txt`).
  2. Run `guards.sh --final` and `regress-all.sh` on the final commit.
  3. Push; read every required check on the PR head.
  4. Write `report.md` per RFC §8: the AC1–AC7 verdicts (MET / NOT MET only), the metric table, the P1–P5 tally + sheet links, C1–C4, the D1–D5 grid, the degraded grid, the triage log, open issues (Sev-3/4 only), CI URLs, deviations, and the tier per task.
  5. Write `evidence/AC-selfcheck.md`.
  6. Leave the PR as draft until Murphy's verdict; merge only on "merge".
- **Check:** guards `--final` OK; every required check green on the final commit; zero open Sev-1/Sev-2 (or AC6 NOT MET stated); the report has no "passed with a note".
- **Evidence:** `report.md`, `evidence/AC-selfcheck.md`, `T015-ci.txt`, `T015-log-regress.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `report.md` §1 (verdicts) and §8 (open issues).
  2. Open the preview one last time on your phone.
  3. Give "M1 passed" or "M1 failed, here's why".
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Your M1 verdict. Default: none; the slice waits.
  2. "merge" to merge the PR (ships the preview to production). Default: no merge without it.
