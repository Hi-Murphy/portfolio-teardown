# Feature Specification: S12 M1 Validation (MVP gate)

**Feature dir:** `.specify/features/m1-validation/` · **Slice:** S12-m1-validation · **Created:** 2026-11-13 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-12-m1-validation.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved at Gate 1, 2026-11-13: all §10 defaults Q1–Q17, no refinements) · **Frozen protocol:** `protocol.md` (sha256 `6566893d…4e60`) + `protocol-sheet-template.md` (sha256 `f74af2ac…97c8`)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Supporting requirements (SR) sit under the FR they serve. They are the RFC's approved methods for proving an FR, not criteria of their own. A failed FR is reported as a failed AC: never reworded, never "passed with a note".
>
> **Definitions on record (RFC Gate 1 defaults):**
>
> - **Final commit** = the head of `task/s12-m1-validation` when the report is committed. **Product tree** = `apps/**` + `packages/**`. It equals `ffda3a2` unless a recorded Sev-1/Sev-2 fix (FR6) changed it.
> - **Real deploy / test URL** (Q1) = the Vercel preview of this branch's draft PR. Its URL and deploy SHA are recorded on every sheet and in the report.
> - **Correct answer** (AC1) = scored by the frozen rules in `protocol.md` §2.4 (a-C1, b-C1/b-C2, c-C1/c-C2). Ambiguous → INCORRECT. The orchestrator scores; Murphy reviews (Q4).
> - **Phone-sized viewport** (AC1) = Murphy's phone, the same one for all five sessions, in a fresh private tab with Reduce Motion and Data Saver off (Q5).
> - **Slow class** = a CI attempt whose runs all report `benchmarkIndex` ∈ [1,900, 2,600] (S11.8 D1). Cap: 10 attempts, then STOP + escalate.
> - **Byte-identical `<main>`** = after the S11.9 `cross-route.sh` normalisation (static-asset hashes, build id, inline flight data), the `<main>…</main>` of `projects/index.html` and `projects/websocket-inspector/index.html` matches `ffda3a2` with a 0-byte diff.
> - **Frozen surfaces S2–S8 empty** = `git diff 3aee8fc` is empty for every path in `packages/xploder/test/frozen-surface{,.s5,.s6,.s7,.s8}.paths`, and `frozen-surface.test.ts` is green.
> - **Poster with the numbered frame path** (RFC §5.1) = the visible `[data-site-poster]` holds `[data-site-poster-flow]` with one `polyline[data-site-poster-flow-line]` and `[data-site-poster-step]` 1…N in DOM order. Each step's text equals its index, and N = the step count of the hero's first content flow (read from content, 7 today).
> - **No animation** = no running `document.getAnimations()` entry in the hero, `data-hero-loop` absent or not `running`, and two hero shots 2 s apart pixel-identical.
> - **Console error** (AC4) = any `error`-level console message, uncaught exception or unhandled rejection, including failed resource loads. Warnings are logged, not failed.
> - **Matrix cells** (Q9, Q10) = D1 iOS Safari (Murphy), D2 Android Chrome (Murphy taps; agent captures over adb + CDP), D3 desktop Chrome (agent, Playwright Chrome for Testing), D4 desktop Safari (Murphy), D5 desktop Firefox (agent, Playwright Firefox). A cell without a console log is unproven.
> - **Severity** = the RFC §7 rubric (Sev-1 blocker … Sev-4 idea). Anything that fails an AC check is ≥ Sev-2.
> - **Vault backlog** (Q13) = `backlog.md` in the feature dir, formatted for the vault and imported by Merlin/Murphy.
> - **Small, in-scope fix** (Q14) = ≤ ~50 changed product lines, no new dependency, no S2–S8 edit, no copy invention. Bigger → escalate.
>
> **Evidence doctrine (kickoff Hard Rule 8):** every number attaches its artifact per `.specify/EVIDENCE.md`. Participants appear only as P1–P5. No secrets, no personal data.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Five strangers get the point in 15 seconds (Priority: P1)

Five people who have never seen the site look at `/` on a phone for 15 seconds. Then they say what the person does, name a project and say how to get in touch.

**Why this priority:** this is the MVP gate (AC1).

**Independent Test:** five sessions run by Murphy under `protocol.md`; sheets copied verbatim; scored by rule id; tallied against the pass line.

**Acceptance Scenarios:**

1. **Given** the frozen protocol and the test URL, **When** five valid sessions are run and scored, **Then** each of (a), (b) and (c) has ≥ 4 of 5 CORRECT. Otherwise AC1 is NOT MET. _(AC1)_
2. **Given** a session that breaks a §2.6 procedural rule, **When** it is recorded, **Then** it is kept on file as invalid and replaced from the same group. It is never invalidated because of its answers. _(AC1)_

---

### User Story 2 — The shipped build meets every budget (Priority: P1)

The deploy that participants see is fast, accessible, stable and still has the S11.9 hero contract.

**Why this priority:** AC2. The budgets from S11.8/S11.9 stand.

**Independent Test:** the RFC §6 gate matrix G1–G13 on the final commit: CI on the preview plus the local export, and the slow-class workflow.

**Acceptance Scenarios:**

1. **Given** the final commit, **When** G3–G11 run, **Then** Lighthouse ≥ 0.95 / ≥ 0.95 on both routes, CLS 0, weight < 3 MB, axe 0/0, `seo: meta + og` green, dev routes 404, reveal ≤ 2.5 s with zero input on a slow-class attempt, 2 draw calls, and `/projects*` `<main>` diff 0 bytes (or every hunk tied to a recorded fix). _(AC2)_

---

### User Story 3 — Every word and link is right (Priority: P1)

Nothing on the site is hand-typed, unfinished or leaks the employer. Every link goes where it says.

**Why this priority:** AC3. A wrong `mailto` or a leak is a Sev-1.

**Independent Test:** C1–C4 (RFC §6).

**Acceptance Scenarios:**

1. **Given** the export, **When** C1–C3 run, **Then** the copy tests and the copy probe are green, there are 0 TODO/placeholder/lorem hits, `████████` is present, and the original employer word appears in no exported file. _(AC3)_
2. **Given** the export and the preview, **When** C4 runs, **Then** GitHub and LinkedIn return 200, `mailto:vibing.murphy@gmail.com` matches exactly, `/projects` and the project route return 200, and an unknown slug returns 404. _(AC3)_

---

### User Story 4 — It works on the phones and browsers people use (Priority: P1)

The hero plays and pauses, snap scrolling behaves, the project panel opens and closes, with no errors and no sideways scroll, on iOS Safari, Android Chrome and desktop Chrome, Safari and Firefox.

**Why this priority:** AC4.

**Independent Test:** cells D1–D5 × checks M1–M7 (RFC §4.2), with screenshots + a console log per cell.

**Acceptance Scenarios:**

1. **Given** each cell, **When** M1–M7 are run, **Then** all pass and a console log exists. A missing log = unproven = AC4 NOT MET. _(AC4)_

---

### User Story 5 — Reduced, no-JS and data-saving visitors get the poster (Priority: P1)

Visitors without JS, with reduced motion or with Save-Data see a still poster with the numbered path, and can reach every control by keyboard.

**Why this priority:** AC5.

**Independent Test:** `home:probe --group degraded` (new, RFC §5.4) for 3 modes × 390/1440 × light/dark, plus the Tab walk; cross-checked by `site:probe --group nojs,reduced-motion` and `eager:probe --reduced-motion | --save-data`.

**Acceptance Scenarios:**

1. **Given** each degraded mode, **When** `/` loads, **Then** the numbered path is present with N steps, there is no canvas, no animation and no layout break. _(AC5)_
2. **Given** normal mode and each degraded mode, **When** a keyboard user Tabs through `/` and the project route, **Then** every control is reached in visual order with visible focus. _(AC5)_

---

### User Story 6 — Every issue has an owner (Priority: P1)

Every problem found is either fixed with proof or written down with a severity and an owner. Nothing blocking ships.

**Why this priority:** AC6.

**Independent Test:** `triage-log.md` covers every failing check and every participant remark. Each fix has before/after artifacts and a full regression run. `backlog.md` holds every Sev-3/Sev-4.

**Acceptance Scenarios:**

1. **Given** the triage log at close, **When** it is counted, **Then** there are zero open Sev-1/Sev-2. _(AC6)_

---

### User Story 7 — The close is clean and documented (Priority: P1)

CI is green, the engine surfaces are untouched and the MVP report tells the whole story.

**Why this priority:** AC7.

**Independent Test:** the required CI checks on the final commit; G12; `report.md` against the RFC §8 skeleton.

**Acceptance Scenarios:**

1. **Given** the final commit, **When** CI runs, **Then** every required check is green and G12 is empty. The report holds all seven verdicts, the metric table, P1–P5 sheets and the open-issue list. _(AC7)_

---

### Edge Cases

- **A Sev-1 found before the human test** (e.g. a route broken on Murphy's phone): STOP and escalate before any participant session, so no participant is spent on a broken build (plan §1).
- **LinkedIn answers 999:** browser navigation, then Murphy's DevTools status screenshot. With no 200 observed, AC3 is NOT MET (Q11).
- **The slow class never arrives:** cap 10 attempts, then STOP + escalate with the `benchmarkIndex` log.
- **A fix after the human test touches `/`:** AC1 stands as measured, with its deploy SHA. The fix gets the full regression.
- **Murphy's Android phone is not mid-range:** it is recorded with its model, and Murphy decides whether another device is needed (escalation, not a silent pass).
- **The executor is unavailable (DeepSeek 402):** pause and report; not counted as a failed attempt.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** "**AC1 — the 15-second test, 5 participants.** Protocol: each participant sees `/` on a phone-sized viewport for **15 seconds** with no guidance, then answers three questions — (a) what does this person do? (b) name one project you saw; (c) how would you contact them? **Pass: ≥ 4 of 5 correct on all three.** One participant may be a non-technical reader. Evidence: per-participant sheet (answers verbatim, time, device) + the script used."
  - SR1.1 The script used is `protocol.md`, unchanged since G1 (hash guard).
  - SR1.2 Sheets are `evidence/P<n>-sheet.md`, copied from Murphy's raw notes without edits. Scores carry rule ids.
- **FR2 (= AC2):** "**AC2 — gate matrix green on the final commit.** Lighthouse mobile **≥ 95 perf / ≥ 95 a11y** on `/` and `/projects/websocket-inspector`; **CLS 0**; weight **< 3 MB**; axe **0 serious / 0 critical**; `seo: meta + og` green; fixture exclusion green (dev routes 404 in production); eager hero reveal **≤ 2.5 s** with zero interaction on the slow class; **2 draw calls**; `/projects*` `<main>` byte-identical to `ffda3a2` unless a defect fix is justified and recorded."
  - SR2.1 Gates G3–G11 and G13 with the commands in RFC §6. The binding hosts are CI on the preview (Lighthouse, weight, fixture exclusion), the slow-class workflow (reveal) and the local export (the rest).
  - SR2.2 `m1-validation.yml` is temporary and deleted in the slice's last commit.
- **FR3 (= AC3):** "**AC3 — content integrity.** Every visible string resolves from content modules (no hand-typed copy); zero `TODO`/placeholder/lorem; employer redaction (`████████`) intact everywhere it appears; every link resolves — GitHub and LinkedIn 200, `mailto:vibing.murphy@gmail.com` correct, `/projects` and the project route 200, unknown slug 404."
  - SR3.1 Checks C1–C4 (RFC §6). The employer word is derived at runtime and never printed or committed.
- **FR4 (= AC4):** "**AC4 — device and browser matrix.** iOS Safari 17+, Android Chrome on a mid-range device, desktop Chrome / Safari / Firefox: the hero plays, the pause control pauses and resumes, scroll snap behaves (and is off under reduced motion), a component panel opens and closes, **no console errors**, no horizontal scroll. Evidence: screenshots + console logs per device."
  - SR4.1 Cells D1–D5 × M1–M7 (RFC §4). Exact browser versions and device models are recorded.
- **FR5 (= AC5):** "**AC5 — degraded modes.** No-JS, `prefers-reduced-motion`, and Save-Data each render the **poster with the numbered frame path**, no canvas, no animation, no layout break; keyboard-only pass reaches every control in visual order."
  - SR5.1 `home:probe --group degraded` with unit-tested evaluators and negative controls (canvas present, missing step, steps out of order, running animation).
- **FR6 (= AC6):** "**AC6 — triage log.** Every issue found in AC1–AC5 is either fixed in this slice with evidence, or filed in the vault backlog with severity and owner. **Zero Sev-1/Sev-2 open at close.** Sev-3/Sev-4 may ship."
  - SR6.1 One defect per fix task, with a before/after proof and a full G1–G13 + C1–C4 regression. Every fixed product path is listed in `fix-ledger.txt`.
- **FR7 (= AC7):** "**AC7 — CI and close.** All required checks green on the final commit; frozen surfaces S2–S8 empty (post-S11.9 re-seal baseline `3aee8fc`); the MVP report committed with every AC verdict, the metric table, the participant sheets (anonymised as P1–P5) and the open-issue list."
  - SR7.1 `report.md` follows the RFC §8 skeleton. The AC self-check uses only MET / NOT MET.

### FR ↔ AC mapping

| FR | AC | Proven by (RFC) | Tasks |
|---|---|---|---|
| FR1 | AC1 — 15-second test | `protocol.md` §2; sheets + tally | T011, T012 |
| FR2 | AC2 — gate matrix | §6 G3–G11, G13 | T002, T006 (+ fix regressions) |
| FR3 | AC3 — content integrity | §6 C1–C4 | T004, T007 |
| FR4 | AC4 — device matrix | §4 D1–D5 × M1–M7 | T005, T008, T009 |
| FR5 | AC5 — degraded modes | §5 + `home:probe --group degraded` | T003, T010 |
| FR6 | AC6 — triage log | §7 rubric + close rule | T013, T014.x |
| FR7 | AC7 — CI and close | §6 G1, G2, G12 + §8 report | T001, T015 |

No FR exists without an AC, and no AC without an FR.

### Key Entities

- **Participant sheet** — P-label, group, device, exposure time, three verbatim answers, three scores with rule ids, Murphy's review.
- **Matrix cell** — browser + device + versions, M1–M7 results, screenshots, console log.
- **Gate result** — gate id, host, command, exit code, threshold vs measured, artifact path.
- **Issue** — `I-NN`, source, cell/route, severity, evidence, decision, owner, status.
- **Fix** — one issue, its changed paths (`fix-ledger.txt`), before/after artifacts, regression result.

## Success Criteria _(mandatory)_

The success criteria **are** AC1–AC7 as quoted in FR1–FR7. Nothing is added. The slice reports each as MET or NOT MET. Murphy gives the final "M1 passed / failed" outside the agent's view.

## Assumptions

- Murphy recruits and runs the five sessions, does D1 and D4, and taps through D2. The agent cannot run participants.
- The draft PR's Vercel preview is publicly reachable without login (the S11.9 preview was).
- `adb` at `~/Library/Android/sdk/platform-tools/adb` works with Murphy's Android phone over USB.
- The product tree stays `ffda3a2` unless a fix is recorded. This slice adds no feature, copy or design change.
