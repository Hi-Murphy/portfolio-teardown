# RFC — S12 M1 Validation (MVP gate)

**slice:** S12-m1-validation · **status:** APPROVED at Gate 1 (2026-11-13): all §10 defaults; protocol frozen; simplification R1–R4 (2026-11-14) (§11) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-12-m1-validation.md` (frozen brief v1) · **branch:** `task/s12-m1-validation` · **base:** `5dec9f9` (product tree = S11.9 final `ffda3a2`) · **re-seal baseline:** `3aee8fc` · **date:** 2026-11-13

> This RFC designs the validation protocol only. Nothing was measured. Where it seems to conflict with the brief, the brief wins and the conflict becomes an open question (§10).
>
> **Inputs:** a static read of the repo at `5dec9f9` (content, probes, workflows, the S11.9 artifacts), plus three reachability calls made while writing (the S11.9 Vercel preview answered 200; `github.com/TimurHaryo` answered 200; the LinkedIn profile answered **999** to `curl`). Those calls are not AC evidence. They only shaped the risk in §9 R2. AC3 is measured in Stage 3, under §6.

---

## 1. Context (from the brief)

- **Mission:** prove the MVP with evidence: the real deploy, the real gates and five real humans giving `/` 15 seconds. Then ship the preview and close M1. **No features.** The slice measures, triages and fixes defects only.
- **Under test:** the S11.9 animated storyboard hero (imploded → explode → zoom → camera follows the real flows → zoom out → turns → implode, looping, 44×44 pause/play), the full-screen blueprint sheet, CSS scroll snap hero ↔ Projects on `/` only, and the poster with the numbered frame path for reduced motion, Save-Data and no-JS. The project route keeps its interaction gate. The employer is redacted to `████████`.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — the 15-second test, 5 participants.** Protocol: each participant sees `/` on a phone-sized viewport for **15 seconds** with no guidance, then answers three questions — (a) what does this person do? (b) name one project you saw; (c) how would you contact them? **Pass: ≥ 4 of 5 correct on all three.** One participant may be a non-technical reader. Evidence: per-participant sheet (answers verbatim, time, device) + the script used.
- **AC2 — gate matrix green on the final commit.** Lighthouse mobile **≥ 95 perf / ≥ 95 a11y** on `/` and `/projects/websocket-inspector`; **CLS 0**; weight **< 3 MB**; axe **0 serious / 0 critical**; `seo: meta + og` green; fixture exclusion green (dev routes 404 in production); eager hero reveal **≤ 2.5 s** with zero interaction on the slow class; **2 draw calls**; `/projects*` `<main>` byte-identical to `ffda3a2` unless a defect fix is justified and recorded.
- **AC3 — content integrity.** Every visible string resolves from content modules (no hand-typed copy); zero `TODO`/placeholder/lorem; employer redaction (`████████`) intact everywhere it appears; every link resolves — GitHub and LinkedIn 200, `mailto:vibing.murphy@gmail.com` correct, `/projects` and the project route 200, unknown slug 404.
- **AC4 — device and browser matrix.** iOS Safari 17+, Android Chrome on a mid-range device, desktop Chrome / Safari / Firefox: the hero plays, the pause control pauses and resumes, scroll snap behaves (and is off under reduced motion), a component panel opens and closes, **no console errors**, no horizontal scroll. Evidence: screenshots + console logs per device.
- **AC5 — degraded modes.** No-JS, `prefers-reduced-motion`, and Save-Data each render the **poster with the numbered frame path**, no canvas, no animation, no layout break; keyboard-only pass reaches every control in visual order.
- **AC6 — triage log.** Every issue found in AC1–AC5 is either fixed in this slice with evidence, or filed in the vault backlog with severity and owner. **Zero Sev-1/Sev-2 open at close.** Sev-3/Sev-4 may ship.
- **AC7 — CI and close.** All required checks green on the final commit; frozen surfaces S2–S8 empty (post-S11.9 re-seal baseline `3aee8fc`); the MVP report committed with every AC verdict, the metric table, the participant sheets (anonymised as P1–P5) and the open-issue list.

---

## 2. The 15-second protocol (AC1) — frozen at G1

At Gate 1 this section is copied **verbatim** to `.specify/features/m1-validation/protocol.md`. Its SHA-256 is recorded in §11 (the G1 record). From then on, a Stage 3 guard fails if `protocol.md` changes. **No participant sees the site before G1.**

### 2.1 Setup (Murphy, before each session)

1. **Device:** Murphy's own phone, the same phone for all five sessions (§10 Q5). Reduce Motion **off**, Data Saver / Low Data Mode **off**, the OS theme as it is (recorded on the sheet).
2. **URL:** the test URL fixed at G1 (§10 Q1), opened in a **fresh private tab** (no stored theme, no cache).
3. Wait until the hero animation is running (the model is moving). Scroll to the very top. Do not touch the page after that.
4. Have a stopwatch ready and the sheet (§2.5) open on a separate device or on paper.
5. Choose a quiet place. The participant has not seen the site before (§2.6).

### 2.2 Script (read aloud, word for word)

**Instruction, English:**

> "I'm going to show you a website on this phone for 15 seconds. Look at it however you like. When the time is up, I'll take the phone back and ask you three short questions."

**Instruction, Bahasa Indonesia** (only if the participant prefers it):

> "Saya akan menunjukkan sebuah situs web di ponsel ini selama 15 detik. Silakan lihat sesukamu. Setelah waktunya habis, saya akan mengambil ponselnya kembali dan mengajukan tiga pertanyaan singkat."

Then hand over the phone and start the stopwatch the moment it is in their hand, screen facing them. At **15 s**, say "Time's up" ("Waktunya habis") and take the phone back.

**Allowed during the 15 s:** silence. If the participant asks anything ("Can I scroll?", "Whose site is this?"), the only answer is: **"Do whatever you like."** ("Terserah kamu.") No pointing, no hints, no reactions.

**The three questions**, asked immediately after, in this order, each read exactly once:

| # | English (verbatim, from AC1) | Bahasa Indonesia |
|---|---|---|
| (a) | "What does this person do?" | "Apa pekerjaan orang ini?" |
| (b) | "Name one project you saw." | "Sebutkan satu proyek yang kamu lihat." |
| (c) | "How would you contact them?" | "Bagaimana cara kamu menghubungi orang ini?" |

**Allowed after a question:** repeat it word for word once, if asked. Nothing else: no rephrasing, no "think about the top part", no follow-ups, no confirming or correcting an answer. "I don't know" is a final answer. The phone is not handed back.

### 2.3 Recording answers verbatim

- Murphy writes each answer **word for word** as spoken, in the language spoken, including hesitations that carry content ("uh, something with apps? Android maybe"). Do not tidy, translate or summarise.
- Optional audio recording, only with the participant's consent. It is used for transcription only and is never committed or sent to the agent. The transcript is what counts.
- Murphy also writes neutral observations of what the participant did during the 15 s: scrolled (yes/no, roughly how far), tapped anything (what), and anything they said aloud.
- Murphy sends the raw sheets to the agent as typed text (or a photo of the paper). The agent copies them **unchanged** into `evidence/P<n>-sheet.md`. Fixing typos is not allowed. Unreadable handwriting is marked `[illegible]`, and Murphy is asked about it.

### 2.4 Scoring rules (binary, no partial credit)

The orchestrator scores each answer against the rules below. Each score quotes the rule that decided it (e.g. "a-C1"). Murphy reviews the scores. A score changes only if the written rule supports the change; new rules are never added after results exist. **Ambiguous → INCORRECT** (conservative), with the reason noted.

**(a) What does this person do?**
- **a-C1 CORRECT:** the answer says the person builds, develops or engineers software **and** names Android or mobile apps. Examples: "Android developer", "he makes mobile apps", "Android engineer, performance stuff", "programmer, Android".
- **a-I1 INCORRECT:** a generic software role without Android or mobile ("software engineer", "developer", "IT").
- **a-I2 INCORRECT:** a different job ("web designer", "3D artist", "architect", "engineer who designs machines").
- **a-I3 INCORRECT:** "I don't know", or no answer.

**(b) Name one project you saw.**
- **b-C1 CORRECT:** the answer names the project. It contains "Scarlet", "Inspector" or "WebSocket", in any case and with minor misspellings ("Scarlett", "web socket", "inspektor").
- **b-C2 CORRECT:** it describes that project unambiguously without its name ("a tool that records WebSocket traffic", "an inspector for network frames on Android").
- **b-I1 INCORRECT:** it names a component, layer, technology or section only ("Room", "Compose", "Frames in", "Projects").
- **b-I2 INCORRECT:** it describes the animation in general ("some 3D model", "a blueprint thing").
- **b-I3 INCORRECT:** "I don't know", or no answer.

**(c) How would you contact them?**
- **c-C1 CORRECT:** the answer names a channel the site offers: email (or the address), LinkedIn or GitHub.
- **c-C2 CORRECT:** it names the site's own contact path ("the Contact link at the top", "there's a contact section").
- **c-I1 INCORRECT:** a channel the site does not offer (phone, WhatsApp, Instagram, a contact form).
- **c-I2 INCORRECT:** a generic guess with no basis on the site ("Google him", "find him somewhere online").
- **c-I3 INCORRECT:** "I don't know", or no answer.

### 2.5 Pass line and sheet

**Pass line (verbatim from AC1):** **≥ 4 of 5 correct on all three.** Computed as: count CORRECT for (a), for (b) and for (c) separately over P1–P5. AC1 is MET only if all three counts are ≥ 4. Any count ≤ 3 → **AC1 NOT MET**. This is a failed MVP gate, recorded as such.

**Sheet** (`evidence/P<n>-sheet.md`, one per participant; template at G1 as `protocol-sheet-template.md`):

```
Participant: P<n>            Group: recruiter/hiring-adjacent | developer | non-technical
Date / local time: ____      Session valid: yes | no (reason: ____)
Device: model ____  OS ____  Browser ____ (version ____)
Theme seen: light | dark     Hero state seen: live animation | poster
Test URL: ____               Deploy commit (short SHA): ____
Language used: EN | ID
Exposure time (stopwatch): ____ s   (valid range 14–16 s)
Has seen the site before: no (must be no)   Knows Murphy personally: yes | no
Observed during 15 s: scrolled ____  tapped ____  said aloud "____"
(a) What does this person do?    Verbatim: "____"
(b) Name one project you saw.    Verbatim: "____"
(c) How would you contact them?  Verbatim: "____"
--- scored by orchestrator ---
(a) CORRECT | INCORRECT  rule: ____  note: ____
(b) CORRECT | INCORRECT  rule: ____  note: ____
(c) CORRECT | INCORRECT  rule: ____  note: ____
Murphy review: agree | flag (rule-based reason: ____)
```

### 2.6 Participants and validity

- **Mix (brief):** 2 recruiters / hiring-adjacent, 2 developers, 1 non-technical. **Default:** Murphy recruits; the slice supplies the script, the sheet and the scoring. Labels are P1–P5 in session order. The name ↔ label mapping stays with Murphy (vault or paper) and is never sent to the agent or committed. No names, ages, employers or contact details on any sheet.
- **Eligibility:** has never seen the site (any version) and did not help build it. Knowing Murphy is allowed but recorded (§10 Q8).
- **Invalid session (procedural reasons only, decided before answers are scored):** exposure outside 14–16 s; the page was not live at the top when handed over; Murphy gave guidance beyond §2.2; the participant had seen the site before; an interruption during the 15 s. An invalid session is **kept on file** with its reason and replaced by a new participant from the same group. A session is never invalidated because of its answers.
- **Each participant takes the test once.** Nobody is re-tested. AC1 is not re-run after results exist. If a later defect fix changes `/`, AC1 still stands as measured, with its deploy SHA recorded.

---

## 3. Test deploy

- **Default (Q1):** at the start of Stage 3 the agent opens a **draft PR** from `task/s12-m1-validation` to `main`. Its Vercel preview (product tree = `ffda3a2`) is the "real deploy": the human test URL, the device-matrix URL and the CI perf-gate target. The URL and deploy SHA go on every sheet and in the report.
- **"Ship the preview":** after Murphy's "M1 passed" and "merge", the PR merges and Vercel's production deploy follows. No DNS or domain change (S16).

---

## 4. Device and browser matrix (AC4)

### 4.1 Cells and who runs them

| Cell | Browser | Hardware | Runs it | Console capture |
|---|---|---|---|---|
| D1 | iOS Safari 17+ | Murphy's iPhone | Murphy | Mac Safari Web Inspector over cable (iPhone: Settings › Apps › Safari › Advanced › Web Inspector on; Mac Safari: Settings › Advanced › "Show features for web developers"). Console with "Preserve Log" on, exported or screenshotted |
| D2 | Android Chrome | Murphy's mid-range Android phone (model recorded) | Murphy taps; agent captures | USB debugging + `~/Library/Android/sdk/platform-tools/adb forward tcp:9222 localabstract:chrome_devtools_remote`. The agent attaches over CDP (Playwright `connectOverCDP`), records every console message and page error, and takes the screenshots |
| D3 | desktop Chrome | this Mac, 1440×900 | agent | Playwright, bundled Chrome for Testing (version recorded) |
| D4 | desktop Safari (26.x) | this Mac, 1440×900 | Murphy | Safari Web Inspector console |
| D5 | desktop Firefox | this Mac, 1440×900 | agent | Playwright Firefox (Gecko; version recorded) |

Desktop Chrome and Firefox are not installed on this Mac, so D3/D5 use the Playwright builds and are labelled as such (§10 Q9).

### 4.2 Checks per cell (each = one row in `evidence/T<NNN>-log-device-<cell>.md`)

| Check | Pass condition | Capture |
|---|---|---|
| M1 hero plays | `/` reveals live and the model moves through the storyboard (explode → zoom → follow → zoom out → implode) | screenshot mid-animation; agent cells also read `data-hero-loop="running"` |
| M2 pause / resume | the 44×44 control stops motion (two shots 2 s apart are identical) and Play resumes it | shot paused + shot resumed |
| M3 scroll snap | from the top of `/`, one short swipe or wheel step lands with the Projects section aligned to the top. Below Projects, scrolling is free | shot after the swipe |
| M4 snap off (reduced motion) | with the OS Reduce Motion on (iOS: Accessibility › Motion; Android: Remove animations; macOS: Accessibility › Display › Reduce motion; agent cells: Playwright `reducedMotion: 'reduce'`), the same swipe stops mid-page with no snapping, and the hero shows the poster | shot |
| M5 component panel | on `/projects/websocket-inspector`, after the interaction gate, selecting a component opens its panel; closing it (close control or Esc) returns to the view | shot open + shot closed |
| M6 no console errors | zero `error`-level messages and zero uncaught exceptions or unhandled rejections across M1–M5 (failed resource loads count as errors). Warnings are logged, not failed | full console log |
| M7 no horizontal scroll | `/` and the project route cannot be panned sideways; agent cells assert `scrollWidth ≤ clientWidth` | shot after a sideways swipe attempt |

A cell is PASS only when M1–M7 all pass **and** its console log exists. A cell with no console log is **unproven**. AC4 is then NOT MET and escalated, never "passed with a note".

---

## 5. Degraded modes (AC5)

### 5.1 What "poster with the numbered frame path" must show

In each mode, on `/`, at 390×844 and 1440×900, both palettes:

1. The **visible** `[data-site-poster]` (since S11.9 `/` has two; the visible one is checked) contains `[data-site-poster-flow]`, with one `polyline[data-site-poster-flow-line]`;
2. `[data-site-poster-step]` groups numbered **1…N in DOM order**. Each step's text equals its index, and **N equals the number of steps in the hero's first content flow** (`capture-path` "Frames in", 7 steps today, read from content and never hard-coded);
3. **no `<canvas>`** in the document;
4. **no animation:** `document.getAnimations()` has no running animation in the hero, `data-hero-loop` is absent or not `running`, and two hero screenshots 2 s apart are pixel-identical;
5. **no layout break:** no horizontal scroll, CLS 0, the poster box is non-empty and inside the hero, and no text overlaps the poster (reusing `home:probe`'s responsive overlap and clipping evaluators).

### 5.2 Modes and how each is produced

| Mode | Emulation |
|---|---|
| No-JS | Playwright context `javaScriptEnabled: false` |
| Reduced motion | context `reducedMotion: 'reduce'` |
| Save-Data | the S11.8 R11 emulation already used by `eager:probe --save-data` (request header + `navigator.connection.saveData`) |

### 5.3 Keyboard-only pass

In normal mode and in each degraded mode, at 390 and 1440: Tab from page load through every focusable control on `/` and on the project route. Every interactive control is reached, the order follows visual order (column-aware, as the S11.9 structure group does), focus is always visible, and nothing traps focus. Normal mode reuses `site:probe --group drill` and `home:probe --group structure`. The degraded modes use the new group (Q12).

### 5.4 Tooling

**Default (Q12):** a new `degraded` group in `home:probe` (tools/perf only, no product code). It covers §5.1 and the §5.3 Tab walk for the three modes. Its pure evaluators are unit-tested, with negative controls: a fixture with a canvas, one with a missing step number, one with steps out of order, and one with a running animation. The existing `site:probe --group nojs,reduced-motion` and `eager:probe --reduced-motion | --save-data` runs stay as cross-checks.

---

## 6. Gate matrix (AC2, AC3, AC7) — run list and exact commands

**Binding host:** the PR's Vercel preview for Lighthouse, weight and fixture exclusion (as CI's `perf.yml` already does). A GitHub-hosted slow-class runner for the reveal. The local production export for everything else. Local Lighthouse and weight runs are supplementary. Per `.specify/EVIDENCE.md`, a failed gate is never re-run until green. One re-run is allowed only for exit 3/4.

Local setup (once per product commit):

```sh
pnpm install --frozen-lockfile
pnpm --filter perf-tools exec playwright install chromium
pnpm build
pnpm serve:out --port 4173 &          # → http://127.0.0.1:4173
```

| Id | Gate (AC) | Command(s) | Pass |
|---|---|---|---|
| G1 | build, types, lint, tests (AC7) | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + CI `build (typecheck, lint, test, build)` | exit 0 / green |
| G2 | secrets (AC7) | CI `secrets (gitleaks)` | green |
| G3 | `seo: meta + og` (AC2) | CI `seo: meta + og`; local `pnpm --filter web seo:expect && pnpm seo:probe --out-dir apps/web/out --site-url https://hi-murphy.me --expect apps/web/out-seo-expect.json --out .evidence/m1/seo` | green / exit 0 |
| G4 | Lighthouse mobile ≥ 95 perf / ≥ 95 a11y, `/` + project route (AC2) | **binding:** CI `perf-gate: lighthouse (mobile)` on the preview (median of 3, both routes). Supplementary: `pnpm perf:lighthouse http://127.0.0.1:4173/ --categories performance,accessibility --out .evidence/m1/lh-home` and `… /projects/websocket-inspector … --out .evidence/m1/lh-project` | ≥ 0.95 / ≥ 0.95 every route |
| G5 | CLS 0 (AC2) | `pnpm site:probe --serve apps/web/out --group cls --out .evidence/m1/cls` + the CLS audit in G4's summaries | 0 in every cell |
| G6 | weight < 3 MB (AC2) | **binding:** CI `perf-gate: weight (< 3 MB)` (both routes). Supplementary: `pnpm perf:weight http://127.0.0.1:4173/` and `…/projects/websocket-inspector --out .evidence/m1/weight-project` | < 3,000,000 B mobile + desktop |
| G7 | axe 0 serious / 0 critical (AC2) | CI `a11y: axe (production routes)` + `a11y: axe (engine fixture export)`; local `pnpm a11y:axe:site --serve apps/web/out --out .evidence/m1/axe-site` | 0 / 0 |
| G8 | fixture exclusion (AC2) | CI `Fixture exclusion` step + `perf: fixture exclusion` (preview `/fixtures/fps-calibration`, `/dev/engine` absent); local `pnpm site:probe --serve apps/web/out --group routes --out .evidence/m1/routes` | green; dev routes 404 |
| G9 | eager reveal ≤ 2.5 s, zero interaction, slow class (AC2) | temporary `.github/workflows/m1-validation.yml`, a copy of S11.9's `home-composition.yml` measure job, gated to `task/s12-m1-validation`: `pnpm perf:host` + `pnpm eager:probe --serve apps/web/out --route / --runs 2 --expect live-loop`. It counts only when `benchmarkIndex` ∈ [1,900, 2,600]; cap 10 attempts, then STOP + escalate. It is **deleted in the slice's last commit** (run URLs remain as evidence). Local cross-check: the same `eager:probe` on `out` | reveal ≤ 2,500 ms, 0 input events |
| G10 | 2 draw calls (AC2) | `pnpm site:probe --serve apps/web/out --group draws --out .evidence/m1/draws` | 2 |
| G11 | `/projects*` `<main>` byte-identical to `ffda3a2` (AC2) | `.specify/features/m1-validation/main-diff.sh`: builds `ffda3a2` in a temporary worktree and the head in place, applies S11.9 `cross-route.sh`'s normalisation (static-asset hashes, build id, inline flight data), extracts `<main>…</main>` from `projects/index.html` and `projects/websocket-inspector/index.html`, and compares the two | 0-byte diff, or every hunk tied to a recorded fix |
| G12 | frozen surfaces S2–S8 empty vs `3aee8fc` (AC7) | `for p in packages/xploder/test/frozen-surface{,.s5,.s6,.s7,.s8}.paths; do git diff --quiet 3aee8fc -- $(sed "s#^#packages/xploder/#" "$p") \|\| echo "DIRTY $p"; done` + `pnpm --filter xploder test` (`frozen-surface.test.ts`) | no `DIRTY`; tests green |
| G13 | hero contract (regression) | `pnpm site:probe --serve apps/web/out --group hero` + `pnpm eager:probe --serve apps/web/out --route / --runs 2 --expect live-loop` | PASS |

**Content integrity (AC3) runs with the matrix:**

| Id | Check | Command / method | Pass |
|---|---|---|---|
| C1 | visible strings from content | `pnpm --filter web exec vitest run test/no-hand-copied-content.test.ts test/site-copy-fidelity.test.ts test/content-fidelity.test.ts test/home-copy.test.ts test/home-copy-mutation.test.tsx` + `pnpm home:probe --serve apps/web/out --group copy` | green |
| C2 | no TODO / placeholder / lorem | scan of every exported `.html` file's rendered text and `alt`/`title`/`aria-label`/`content` attributes for `/\b(todo\|fixme\|tbd\|xxx\|lorem\|ipsum\|placeholder)\b/i` (`content-scan.mjs`) | 0 hits |
| C3 | redaction intact | `████████` (8 × U+2588) present in About on `/` and in its RSC payload. The original employer word, derived at runtime from `git show b52fc06:.specify/content/site.json` and **never printed or committed**, appears in **no** file of `apps/web/out/` (HTML, JS, `.txt`, OG PNG metadata) | present / 0 hits |
| C4 | links | every `<a href>` in the export, deduplicated. Internal: `/`, `/projects`, `/projects/websocket-inspector` 200 and `/projects/unknown-slug` 404, on the **preview** and locally. External: GitHub profile, project source repo and LinkedIn opened in Playwright Chromium (document response status, redirects followed) → **200**. `mailto:` equals `mailto:vibing.murphy@gmail.com` exactly | all as stated |

**Regression after a defect fix:** G1–G13 + C1–C4 in full on the fixed commit, plus CI on push. G9 re-runs only if the fix touches the hero or its bundle.

---

## 7. Triage rubric (AC6)

Every issue from AC1–AC5 gets one row in `triage-log.md`: id (`I-NN`), source (check id or `P<n>`), cell or route, severity, evidence path, decision (fix in slice / backlog), owner, status.

| Sev | Definition | Examples |
|---|---|---|
| **Sev-1 — blocker** | The core path (load → understand → contact or open the project) is broken for a whole class of users, or private data leaks | a route blank or crashing in a matrix cell; the hero throws and takes the page down; wrong `mailto` or a dead contact link; the project route 404; the employer name visible anywhere; a secret in the export |
| **Sev-2 — major** | An AC check fails in at least one cell or mode, while the core path still works | any AC2 gate missed (e.g. Lighthouse 94, weight ≥ 3 MB, 3 draws); a console error; pause doesn't resume on one browser; snap traps scrolling or stays on under reduced motion; horizontal scroll; a canvas or animation in a degraded mode; a control unreachable by keyboard; axe serious/critical |
| **Sev-3 — minor** | Works and passes every AC check, but looks or reads worse than intended | a small misalignment in one cell; a console warning (not an error); a participant comprehension or design remark that is not a malfunction (Q15) |
| **Sev-4 — trivial / idea** | Polish, preference or new-feature request | "would be nice if…", colour preference, ideas for M2 |

**Rules:**

- An issue that makes an AC check fail is at least **Sev-2**. It is never downgraded to ship.
- **Fix in slice:** Sev-1/Sev-2 only, one defect per task, each with a before/after proof (the failing check's artifact before, the passing artifact after) and the full regression in §6. A fix must be small and in scope (Q14). Otherwise it is escalated to Murphy with evidence.
- **Backlog:** Sev-3/Sev-4, each with severity and owner (Murphy = content/design decisions, orchestrator = code, Merlin = brief/vault) → `backlog.md` (Q13).
- **Close rule:** **zero Sev-1 and zero Sev-2 open** at close. One open Sev-1/Sev-2 → AC6 **NOT MET**.

---

## 8. MVP report skeleton (`.specify/features/m1-validation/report.md`, AC7)

```
# M1 Validation — MVP report
Commit: <final sha> · Preview: <url> · Deploy SHA: <sha> · Date: <date>
Murphy's verdict: ____ (filled by Murphy outside the agent's view)

## 1. AC verdicts
| AC | MET / NOT MET | Proof (artifact paths) |      ← AC1–AC7, no third value

## 2. Metric table
| Metric | Route | Host | Threshold | Measured | Pass | Artifact |
  Lighthouse perf        /, /projects/websocket-inspector   preview (CI median of 3) + local   ≥ 0.95
  Lighthouse a11y        same                                                                  ≥ 0.95
  CLS                    / , project route                  local + Lighthouse                 0
  Weight (mobile/desktop)/ , project route                  preview (CI) + local               < 3,000,000 B
  axe serious/critical   production routes                  CI + local                         0 / 0
  Eager reveal           /                                  slow class (benchmarkIndex)        ≤ 2,500 ms, 0 input
  Draw calls             /                                  local                              2
  /projects* <main> diff vs ffda3a2                         local                              0 bytes
  Frozen surfaces S2–S8 vs 3aee8fc                          local + CI                         empty

## 3. 15-second test (AC1)
Protocol: protocol.md (sha256 <hash>, frozen at G1)
| P | Group | Device | Exposure s | (a) | (b) | (c) |
Tally: (a) n/5 · (b) n/5 · (c) n/5 → pass line ≥ 4/5 on all three: MET / NOT MET
Sheets: evidence/P1-sheet.md … P5-sheet.md (raw, verbatim) · invalid sessions (if any) with reasons

## 4. Content integrity (AC3)        C1–C4 results
## 5. Device matrix (AC4)            D1–D5 × M1–M7 grid, links to shots + console logs
## 6. Degraded modes (AC5)           mode × viewport × palette grid + keyboard pass
## 7. Triage log (AC6)               all issues; fixed ones with before/after
## 8. Open issues (ship with M1)     Sev-3/Sev-4 only: id, severity, owner, backlog ref
## 9. CI (AC7)                       required checks + run URLs on the final commit
## 10. Deviations and escalations    none expected; anything else listed with evidence
## 11. Execution tiers               which tier finished each task
```

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| R1 — **a participant sees the site before the protocol is frozen**, or Murphy improvises guidance | §2 is frozen and hashed at G1; the script is read word for word; any deviation makes the session invalid (§2.6) |
| R2 — **LinkedIn answers bots with 999**, not 200 (a pre-RFC `curl` already did) | C4 uses a real browser navigation. If that is not 200 either, Murphy opens the link in his own browser with DevTools → Network and screenshots the document status. If no 200 is observed, AC3 is **NOT MET** and escalated, never "passed with a note" (Q11) |
| R3 — no tethered console on a phone cell → AC4 unprovable | D1 Web Inspector, D2 adb + CDP (adb is installed at `~/Library/Android/sdk/platform-tools/`). A cell without a log = unproven = escalation |
| R4 — the slow class does not arrive in 10 attempts | STOP + escalate with the `benchmarkIndex` log, as in S11.8/S11.9 |
| R5 — the AC1 result is a design or copy gap, not a defect, and copy changes are a non-goal | AC1 is recorded as measured (MET / NOT MET). Comprehension remarks go to the backlog as Sev-3 (Q15). No copy or design change in S12 |
| R6 — a defect fix after the human test changes `/` | AC1 stands as measured with its deploy SHA (§2.6); the fix gets the full §6 regression |
| R7 — participants who know Murphy answer (a) from memory | eligibility and "knows Murphy" on the sheet; disclosed in the report (Q8) |
| R8 — Playwright Chrome/Firefox builds are not the branded browsers | labelled with exact versions; Murphy can install the branded browsers instead (Q9) |

---

## 10. Open questions (each with a default)

1. **Q1 — Test URL.** **Default:** the draft PR's Vercel preview of this branch (product = `ffda3a2`), opened at the start of Stage 3; one URL for every session and cell. Alternative: the current production deployment of `main`.
2. **Q2 — Strictness of (a).** **Default:** must name Android or mobile (a-C1). Alternative: any software-engineering role counts.
3. **Q3 — (c) accepts the site's Contact link/section** (c-C2). **Default:** yes. Alternative: a named channel (email/LinkedIn/GitHub) is required.
4. **Q4 — Who scores.** **Default:** the orchestrator, mechanically by rule id; ambiguous → INCORRECT; Murphy reviews, and a score changes only with a rule-based reason.
5. **Q5 — Participant device.** **Default:** Murphy's phone for all five, fresh private tab, Reduce Motion and Data Saver off, in person. Remote sessions are not used.
6. **Q6 — Language.** **Default:** English; the frozen Bahasa Indonesia script only if the participant prefers it; answers are recorded in the language spoken.
7. **Q7 — Invalid sessions.** **Default:** procedural criteria only (§2.6); an invalid session is kept on file and replaced from the same group.
8. **Q8 — Participants who know Murphy.** **Default:** allowed, recorded on the sheet and disclosed in the report. Never seen the site = required.
9. **Q9 — Desktop Chrome / Firefox.** **Default:** the agent runs D3/D5 with Playwright's Chrome for Testing and Firefox (versions recorded). Murphy runs D4 (Safari). Alternative: Murphy installs branded Chrome and Firefox, and the agent drives them.
10. **Q10 — Phone cells.** **Default:** D1 iOS by Murphy with Web Inspector; D2 Android by Murphy's hands with agent capture over adb + CDP. Murphy names the Android model, so the report can show it is mid-range.
11. **Q11 — LinkedIn 200.** **Default:** browser navigation status → if not 200, Murphy's DevTools screenshot → if still not 200, AC3 NOT MET + escalate.
12. **Q12 — Degraded-mode tooling.** **Default:** a new `home:probe --group degraded` in `tools/perf` with tests (§5.4). Alternative: a one-off script in the feature dir.
13. **Q13 — "Vault backlog".** The agent has no vault access. **Default:** the agent writes `backlog.md` in the feature dir, formatted for the vault, and Merlin/Murphy imports it; the report links it.
14. **Q14 — "Small and in scope" fix.** **Default:** ≤ ~50 changed product lines, no new dependency, no frozen-surface (S2–S8) edit, no copy invention. Anything bigger → escalate to Murphy with evidence.
15. **Q15 — Comprehension findings from AC1.** **Default:** they are not defects. They are filed as Sev-3 (owner Murphy) for M2, and AC1 is reported exactly as measured.
16. **Q16 — Stale workflows** (`eager-3d.yml`, `eager-load.yml`, `hero-eager.yml`). **Default:** not touched in S12 (no-features slice); filed as Sev-4 housekeeping, owner orchestrator.
17. **Q17 — Protocol freeze mechanics.** **Default:** at G1, §2 is copied to `protocol.md`, with the sheet template in `protocol-sheet-template.md`. Both SHA-256 hashes are recorded in §11, and a Stage 3 guard checks them.

---

## 11. Gate 1 record (2026-11-13)

Murphy approved **all §10 defaults (Q1–Q17)** and §2 as written ("approve all defaults"). No refinements.

**Protocol frozen (Q17).** §2 was copied verbatim to `protocol.md` (byte-identical to §2), and the sheet block to `protocol-sheet-template.md`. Both were frozen before any participant saw the site:

| File | SHA-256 |
|---|---|
| `protocol.md` | `6566893d4267a198c325b153be4860a3db874d03ae79124bef7abc99ccb54e60` |
| `protocol-sheet-template.md` | `f74af2ac87f7a1a47b9e979fcfc9aa0ed3e4eb2b8a9a8c029307277a07d097c8` |

A Stage 3 guard recomputes both hashes before every task and fails on any change. Murphy supplies the Android phone model and confirms iOS 17+ (Q10) at the start of Stage 3.

### Stage 2 refinements (Murphy, 2026-11-14: "make the validation simple")

AC1–AC7, `protocol.md` and the pass line are **unchanged**. Only the method changes, so that Murphy's hands are needed for the five sessions and about 5 minutes of plugging in phones.

- **R1 — phones driven by the agent (refines Q10).**
  - **D2 Android:** Murphy turns on USB debugging, plugs the phone in and accepts the prompt. The agent drives Chrome over `adb` + CDP: taps, scroll, pause, panel, screenshots, the console log, and Reduce Motion through `adb shell settings`.
  - **D1 iPhone:** Murphy turns on Web Inspector, plugs the phone in, opens the preview in Safari and flips Reduce Motion once when asked. The agent drives the page from the Mac's Safari Web Inspector (Orca computer-use) and records the console there. If driving it that way fails, the fallback is about 5 screenshots taken by Murphy.
  - Device model and OS version are read from `adb` / the user agent, so Murphy is not asked for them.
- **R2 — desktop Safari driven by the agent (refines Q9).** D4 runs through Orca computer-use on this Mac (Safari + Web Inspector). Murphy does nothing.
- **R3 — one check script instead of a new probe group (Q12 → its alternative).** The checks are in one feature-dir script, `site-checks.mjs`:
  - C2–C4;
  - the AC5 degraded checks (RFC §5.1 checks 1–5 + the §5.3 Tab walk);
  - M1–M7 for D2/D3/D5.

  Negative controls run on a scratch copy of the export. `tools/perf` is not changed. `run-checks.sh` runs every automated check (RFC §6 G and C rows + `site-checks.mjs`) and prints one PASS/FAIL table.
- **R4 — fewer tasks and stops.** There are 9 tasks (+ one per fix) in 6 phases:
  1. setup;
  2. automated run;
  3. devices;
  4. human test;
  5. triage and fixes;
  6. report.

  The guard self-test is dropped (the guards are plain `git diff` / hash checks).

### Stage 3 method fixes (orchestrator, 2026-11-14, T002 review)

- **R5 — device-check method (AC4 text unchanged).** The T002 dry run showed three harness problems. They were fixed before any measurement counted.
  - **(a) M1/M2:** the storyboard has hold beats, so two frames 1.5 s apart can be identical while it plays. "Moving" now means `data-hero-loop="running"` and a hero change within an 8 s window. "Paused" means `paused` and identical frames 3 s apart.
  - **(b) M3/M4:** a 150 px wheel step correctly snaps back to the hero. The test now uses the S11.9 T011i snap method: (viewport − 100) down lands on Projects, then back up to 0. Under reduced motion, 180 px stays at 180.
  - **(c) M6:** requests cancelled with `net::ERR_ABORTED` / `NS_BINDING_ABORTED` produce no console message. They are logged as `requestAborted` and not counted as failed loads (in practice, prefetch HEAD requests dropped on navigation). Console errors, page errors, other failed requests and HTTP ≥ 400 still fail M6.

### WHAT MURPHY SHOULD TEST/VALIDATE

1. The script in §2.2: the wording you will read aloud, in English and Bahasa Indonesia.
2. The scoring rules in §2.4 and the pass line in §2.5, especially Q2 (strict "Android / mobile") and Q3 (the Contact link counts).
3. The device matrix in §4: which cells are yours (D1, D2 taps, D4) and the capture method.
4. The triage rubric in §7 and the close rule.
5. Do **not** show the site to any potential participant before G1 is approved.

### WHAT THE AGENT NEEDS FROM MURPHY

1. Approval of §2 (script, rules, pass line, sheet): it is frozen and hashed at G1. Default: as written.
2. Q1–Q17 defaults, unless you say otherwise.
3. Your Android phone model (D2), and confirmation that your iPhone runs iOS 17+ (D1). Default: you tell me at the start of Stage 3.
4. The five participants (2 recruiters/hiring-adjacent, 2 developers, 1 non-technical), recruited by you. Sessions happen in Stage 3, after the gates pass.
