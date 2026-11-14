# Tasks: S12 M1 Validation (MVP gate)

**Input:** `rfc.md` (G1: all §10 defaults; simplification R1–R4 in §11), `spec.md`, `plan.md`. **Inputs, not tasks:** `protocol.md` and `protocol-sheet-template.md` (script, scoring rules, pass line, sheet). They were frozen at G1, are never edited, and are checked by `guards.sh`.

**Rules (every task):**

- Each check starts with `set -euo pipefail; F=.specify/features/m1-validation; mkdir -p /tmp/s12-checks $F/evidence` and ends with `bash $F/guards.sh` (from T001 on).
- **Executor:** DeepSeek Flash for the scripts and fix code; the orchestrator for everything else (plan § Executor plan).
  - Before each dispatch, probe: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`.
  - A 402 = unavailable: pause and report.
  - Flash stuck ×2: pause and report with 5h/7d usage, then take over on "go". Tier 1.5 is dormant (skip recorded).
  - At ≥ 85 % of the 5h window, no new task starts.
- **Evidence:**
  - name it `evidence/T<NNN>-<kind>[-<variant>].<ext>` per `.specify/EVIDENCE.md`;
  - run `gitleaks dir` before each commit;
  - write local paths as `<local-path>` and ports as `PORT`;
  - participants appear only as P1–P5.
- **Never touch:**
  - `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, `protocol*.md`;
  - `apps/**`, `packages/**` (except a T008.x fix, with its paths in `fix-ledger.txt`);
  - `tools/perf/**`;
  - every workflow except `m1-validation.yml`.
- **A failed check is never re-run until green.** One re-run is allowed only for exit 3/4. A miss goes to triage.
- Commit prefix `S12/TNNN:` (phase boundaries: `S12/stage-3:`), ending with the attribution lines. **STOP at the end of every phase and after each fix.**

## Ledger (resume point)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ guards 5/5 OK (`--final` flags the workflow as expected); `main-diff.sh` 0 bytes on both `/projects*` pages vs `ffda3a2`; `m1-validation.yml` = S11.9 workflow with renames only; orchestrator fixed a tab-vs-space bug in the workflow guard | 1 (Flash) + orchestrator review | evidence/T001-log-setup.txt | 3b9526b, e48b894 |
| T002 | ☑ `site-checks.mjs` (content / degraded / devices) + `run-checks.sh`; 4 negative controls bite; D2 exits 3 without a phone. Orchestrator review fixed 3 method issues (R5: M1/M2 sampling window, S11.9 snap method, aborted prefetches logged not failed); D3 + D5 re-run 7/7 locally. Dry run surfaced 2 real findings for T004: no-JS poster without the numbered path; LinkedIn 999 | 1 (Flash) + orchestrator review | evidence/T002-log-scripts.txt | 5d31d01 |
| T003 | ☑ draft PR #23; preview (branch alias) 200 at deploy `aa4cd53`, product tree = `ffda3a2` | orchestrator | evidence/T003-log-preview.txt | (this commit) |
| T004 | ☑ all CI green; G1–G13 PASS (Lighthouse CI median `/` 0.97/1.00, project 1.00/1.00; CLS 0; weight 460 KB / 201 KB; axe 0/0; reveal 678/645 ms slow class attempt 1; draws 2; `<main>` 0 bytes; surfaces empty); C1–C3 PASS; C4 LinkedIn 999 (I-02); AC5 64/72, no-JS poster lacks the numbered path (I-01); D3/D5 6/7, M2 pause mid-explode label fade-in (I-03); 3 harness bugs fixed + re-run (G3 SITE_URL, C4 fragments, Save-Data Tab walk) | orchestrator | evidence/T004-results.md | (this commit) |
| T005 | ◐ D4 desktop Safari 26.6.2 7/7 (agent, Orca computer-use); D3/D5 7/7 under R6; **D1 iPhone + D2 Android not run (R7, Murphy: no cable) → AC4 NOT MET**; I-05 label overlap (visual) | orchestrator | evidence/T005-log-device-D4.md, T005-log-device-D{3,5}.md | (this commit) |
| T006 | ✗ not run (R8, Murphy decision) → AC1 NOT MET; informal feedback: friends saw the preview earlier and liked it (not AC1 evidence) | — | evidence/T006-log-human-test.md | (this commit) |
| T007 | ✗ not applicable (no sheets) | — | — | — |
| T008 / T008.x | ☑ triage I-01…I-08 + H-01…H-08, backlog; **T008.1** fixed I-01 (Sev-2, no-JS numbered path: `noscript:` variant + test; degraded 72/72; full regression green) + T008.1b probe follow-up (CI caught it); CI all green at `e35e7de`, slow-class reveal 593/516 ms. Open: Sev-1 0, Sev-2 0, Sev-3 I-03/I-05, Sev-4 I-04/I-08; evidence gaps I-06 (AC4), I-07 (AC1) | T008, T008.1b orchestrator; T008.1 Flash + orchestrator review | triage-log.md, backlog.md, evidence/T008.1-log-fix.md | 26cb43f, e35e7de |
| T009 | ☐ | | | |

---

## P0 — Setup (no Murphy hands)

### T001 — Guards, `<main>` diff, slow-class workflow

- **Do:**
  1. Write `guards.sh` (5 checks, plan § Guards) and `main-diff.sh` (G11). Create an empty `fix-ledger.txt`.
  2. Restore S11.9's `home-composition.yml` from git history as `.github/workflows/m1-validation.yml`, gated to `task/s12-m1-validation` and measurement-only. Steps: `perf:host` → `pnpm build` → `eager:probe --route / --runs 2 --expect live-loop` (+ `--reduced-motion`, `--save-data`).
  3. Copy `ci-summary.mjs` with labels renamed.
- **Check:** guards 5/5 OK; `main-diff.sh` 0 bytes on the untouched tree; the YAML parses.
- **Evidence:** `T001-log-setup.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T002 — `site-checks.mjs` + `run-checks.sh`

- **Do:**
  1. Write `site-checks.mjs` with three parts:
     - **content:** C2 (TODO/placeholder/lorem scan), C3 (the redaction bar is present; the employer word, derived at runtime from `b52fc06` and never printed, is absent from `out/`), and C4 (links: local + preview, external links by Chromium navigation, exact `mailto:`);
     - **degraded:** AC5. No-JS, reduced motion and Save-Data × 390/1440 × light/dark, checking that the numbered path has steps 1…N, with N read from content, plus no canvas, no animation and no layout break. Also the Tab walk on `/` and the project route;
     - **devices:** M1–M7 for D3 (Chromium), D5 (Firefox) and D2 (`connectOverCDP` after `adb forward`), with a full console capture.
  2. Install the Firefox binary.
  3. Write `run-checks.sh` (plan § run-checks).
- **Check:** run negative controls on a scratch copy of `out/`: an injected "TODO", the redaction bar removed, and a canvas injected into the poster. Each one fails. D2 without a phone exits 3 with a clear message.
- **Evidence:** `T002-log-scripts.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T003 — Draft PR (orchestrator)

- **Do:** push the branch, open a **draft PR** to `main` (Q1), and record the preview URL + deploy SHA.
- **Check:** the preview answers 200.
- **Evidence:** `T003-log-preview.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: open the preview link on your phone. Don't show it to anyone yet.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. Default: covered by Q1.

**— STOP (end of P0) —**

---

## P1 — Automated run (no Murphy hands)

### T004 — Everything automated (AC2, AC3, AC5, D3, D5)

- **Do:**
  1. `run-checks.sh` on the product tree (local gates, content, degraded modes, desktop Chrome + Firefox against the preview).
  2. Read CI on the draft PR: build, gitleaks, seo, Lighthouse (binding), weight (binding), both axe jobs, fixture exclusion.
  3. Run `m1-validation.yml` until a slow-class attempt exists (cap 10) and summarise it.
- **Check:** one table, `T004-results.md`, with every G, C, AC5 and D3/D5 row as threshold vs measured → PASS/FAIL, each with its artifact. Misses go to T008.
- **Evidence:**
  - `T004-results.md`;
  - `T004-lighthouse-summary-{home,project}.json`, `T004-weight-{home,project}.json`;
  - `T004-log-{axe,reveal,draws,main-diff,surfaces,content,links,degraded}.json|txt`;
  - `T004-screenshot-*`, `T004-log-console-{D3,D5}.txt`;
  - `T004-ci.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Glance at `T004-results.md`. Every row has a number and PASS/FAIL.
  2. Tap email, GitHub and LinkedIn on the preview once yourself.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Only if LinkedIn isn't 200 to the browser: a DevTools → Network screenshot of the LinkedIn page from your browser. Default: not needed.
  2. Only if the slow class doesn't arrive in 10 attempts: OK to escalate. Default: escalate with the log.

**— STOP (end of P1). A Sev-1 here stops the slice before P3. —**

---

## P2 — Devices (Murphy: ~5 minutes)

### T005 — iPhone, Android, desktop Safari (D1, D2, D4)

- **Do (orchestrator):**
  - **D2 Android:** `adb forward` + `site-checks.mjs` devices (M1–M7), with Reduce Motion via `adb shell settings` for M4. The model and version come from `adb`.
  - **D1 iPhone:** drive the page from the Mac's Safari Web Inspector (Orca computer-use): play, pause/resume, scroll, panel, sideways-scroll check, and the console log. The iOS version comes from the user agent.
  - **D4 Mac Safari:** the same checks via Orca computer-use with Web Inspector open.
- **Check:** each cell has M1–M7 + a console log (a missing log = unproven → escalate). The D2 model is recorded; if it is not mid-range, that is flagged for Murphy.
- **Evidence:** `T005-log-device-{D1,D2,D4}.md`, `T005-log-console-{D1,D2,D4}.txt`, `T005-screenshot-{D1,D2,D4}-*`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing beyond plugging in. Optional: watch the phones while the agent drives them.
- **WHAT THE AGENT NEEDS FROM MURPHY (one sitting, about 5 minutes):**
  1. **Android:** turn on USB debugging (Settings › Developer options), plug it into the Mac, and accept "Allow USB debugging".
  2. **iPhone:** turn on Web Inspector (Settings › Apps › Safari › Advanced), plug it into the Mac, tap "Trust", open the preview link in Safari, and keep the screen unlocked.
  3. Flip Reduce Motion on the iPhone when asked, and back off afterwards.
  4. Fallback only: if driving the iPhone from the Mac fails, about 5 screenshots on the iPhone, as listed by the agent.

**— STOP (end of P2). A Sev-1 here stops the slice before P3. —**

---

## P3 — Human test (Murphy: five sessions)

### T006 — Five sessions

- **Do (Murphy):** run P1–P5 exactly per `protocol.md` on the preview link, one sheet each. Keep the name ↔ P-label mapping yourself.
- **Agent:** re-check `guards.sh` (the protocol is unchanged); give you the link + deploy SHA for the sheets.
- **Check:** 5 valid sessions; the mix is 2 recruiter/hiring-adjacent, 2 developer, 1 non-technical. An invalid session is kept with its reason and replaced from the same group.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the script word for word and give no hints. During the 15 s, "Do whatever you like." is the only thing you say.
  2. Each stopwatch reading is 14–16 s.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Five raw sheets (typed or a photo), plus any invalid ones. Default: sent together after the last session.

### T007 — Sheets, scores, tally (orchestrator)

- **Do:**
  1. Copy each sheet **unchanged** to `evidence/P<n>-sheet.md`.
  2. Score each answer by its `protocol.md` §2.4 rule id (ambiguous → INCORRECT).
  3. Tally against the pass line.
- **Check:** every score cites a rule. AC1 is MET only if (a), (b) and (c) are each ≥ 4/5.
- **Evidence:** `P1-sheet.md` … `P5-sheet.md`, `T007-log-tally.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The sheets match your notes.
  2. You agree with the scores.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "Scores agreed", or a flag with the rule that supports it. Default: scores stand.

**— STOP (end of P3) —**

---

## P4 — Triage and fixes

### T008 — Triage log + backlog (orchestrator)

- **Do:**
  1. List every miss and remark from T004–T007 in `triage-log.md`: `I-NN`, source, severity per RFC §7, evidence, decision, owner, status.
  2. Put every Sev-3/Sev-4 in `backlog.md` (vault format), including Q15 comprehension remarks and Q16 stale workflows.
  3. Create one **T008.x** per Sev-1/Sev-2.
- **Check:** every FAIL row maps to an `I-NN`; anything that fails an AC check is ≥ Sev-2.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The severities look right.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK on the triage. Default: the rubric decides.
  2. For a Sev-1/Sev-2 over the Q14 size cap: fix (exception) or leave it open (AC6 NOT MET). Default: escalated to you.

### T008.x — One Sev-1/Sev-2 fix per task (only if needed)

- **Do:**
  1. Capture the failing check → `T008.x-*-before.*`.
  2. Make the smallest fix and add its paths to `fix-ledger.txt`.
  3. Capture the check again → `T008.x-*-after.*`.
  4. Re-run `run-checks.sh` in full, then push, CI, and G9 again if the hero changed.
- **Check:** after = PASS; `run-checks.sh` all PASS; guards OK.
- **Evidence:** `T008.x-log-fix.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Repeat the failing step on the preview.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. Default: a fix after P3 that touches `/` is recorded, and AC1 stands as measured.

**— STOP after each fix and at the end of P4 —**

---

## P5 — Report

### T009 — Final run, CI, report (orchestrator)

- **Do:**
  1. Delete `m1-validation.yml`.
  2. Run `guards.sh --final` + `run-checks.sh` on the final commit.
  3. Push; read every required check.
  4. Write `report.md` (RFC §8) + `evidence/AC-selfcheck.md`, with **MET / NOT MET per AC**.
  5. Keep the PR draft until your verdict.
- **Check:** guards `--final` OK; CI green; zero open Sev-1/Sev-2 (or AC6 NOT MET stated).
- **Evidence:** `report.md`, `evidence/AC-selfcheck.md`, `T009-ci.txt`, `T009-results.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read report §1 (verdicts) and §8 (open issues).
  2. Open the preview once more on your phone.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "M1 passed" or "M1 failed, here's why".
  2. "merge" to ship. Default: no merge without it.
