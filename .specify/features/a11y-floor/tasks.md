# Tasks: S08 A11y Floor (Keyboard · Screen Reader · Contrast · No-JS)

**Input:** `rfc.md` (approved, §9; R1–R9; correction C1), `spec.md`, `plan.md` in `.specify/features/a11y-floor/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`). The sandbox is on for Node-only tasks and off for browser tasks (S3 note: the sandbox can't launch Chromium). Writes are limited to the task worktree and `/tmp/s08-checks`.

**Escalation (RFC D12):**
- Tier 1.5 (OpenRouter) is **DORMANT** (`OPENROUTER_API_KEY` unset), so it is skipped and recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes the task personally on Murphy's go.
- Each report states the finishing tier and any skip.

**Usage pacing:**
- Each phase group starts in a fresh 5h window.
- Murphy states "5h: N%" at gates.
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Perf doctrine:** dropped-frames style only. **No task check may compare fps against a literal threshold.** Liveness is the harness band verdict; raw fps is information.

**Evidence doctrine (Hard Rule 5):** every a11y claim attaches a machine artifact (AX tree / ARIA snapshot, measured ratio, axe JSON, drill log, screenshot + meta). "Looks fine" is never a check.

**Stage-2 correction C1 (RFC §9.8):** `packages/xploder/package.json` is S2-sealed, so the jsdom DOM tests live in `apps/web/test/xploder-dom/`, and `jsdom` is an `apps/web` devDependency.

**Stage-3 correction C2 (T008):** the DOM unit tests in `apps/web/test/xploder-dom/` may import xploder **internals by relative path** (e.g. `ComponentNavigator`, `PanelLayer`) to test them standalone, because WebGL (hence the mounted navigator) is unavailable in jsdom. This is test-only. `app/` code still never deep-imports `xploder/src` (enforced by `package-consumer.test.ts`), and no internal becomes a public `xploder/react` export just for tests.

## Ledger (resume point — update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (24 files sealed; negative control red) | 1 (Flash, sandbox on); full check re-run by orchestrator outside the sandbox. 1st launch hung on stdin (runner bug, model never started; not counted) | evidence/T001-log-guard.txt | 48345c0 |
| T002 | ☑ (28 states, 1502 nodes, determinism diff 0) | 1 (Flash, sandbox off) | evidence/T002-{presentation-base.json,log-presentation.txt} | e23373e |
| T003 | ☑ (25 tests; S6 `partNumber` reused; reveal ↔ `offsetFor` round trip) | 1 (Flash, sandbox on) | evidence/T003-log-navigator.txt | f75ac46 |
| T004 | ☑ (16 tests; S5 copy pinned to baseline strings) | 1 (Flash, sandbox on) | evidence/T004-log-announce.txt | ca62659 |
| T005 | ☑ (before table: accent 3.05/3.34, label 4.24/3.01 FAIL; 4 R2 rows `test.fails` until T011) | 1 (Flash, sandbox on) | evidence/T005-log-contrast-token-before.txt | 48b1de3 |
| T006 | ☑ (12 rows; 8 scanned sites covered; negative control fires) | 1 (Flash, sandbox on) | evidence/T006-log-motion-matrix.txt | 87b0cb3 |
| T007 | ☑ (live region at mount, same node step 1; WebGL gate + boundary; panel announcements landed here early) | 1 (Flash, sandbox on); jsdom added by orchestrator (no network); full check re-run unsandboxed | evidence/T007-log-live-region.txt | 5907c63 |
| T008 | ☑ (navigator, ring, R1 redirect, pan keys; orchestrator CLS check: 0 navigator shifts) | 1 (Flash, sandbox off) + orchestrator review (C2 test-only internal imports) | evidence/T008-{log-navigator.txt,screenshot-ring-*.png,meta.json} | f7b15cf |
| T009 | ☑ (open→heading, re-dock keeps focus, close→trigger) | 1 (Flash) ×2: attempt 1 ran out mid-task (debug logs + click-swallow hack from a wrong orchestrator smoke step); attempt 2 with corrected brief finished | evidence/T009-{log-focus.txt,log-tierb-diff.txt} | 660a1d9 |
| T010 | ☑ (lettering + S6 overlay hidden from AT, chip categories, dialog description) | 1 (Flash, sandbox off) + orchestrator review fix (visible chip comma rejected; comma in hidden span) | evidence/T010-{log-aria-smoke.txt,log-tierb-diff.txt,screenshot-chips-light.png} | 764f859 |
| T011 | ☑ (R2 ink; presentation diff 12 colour + 20 hidden-span, 0 disallowed; rendered pixels match token model) | 1 (Flash, sandbox off) | evidence/T011-{log-contrast-token-after.txt,log-presentation-diff.txt,screenshot-highlight-*.png} | 8227c87 |
| T012 | ☑ (no-JS poster + list, no-WebGL message + list, skip link; smoke 44/44) | 1 (Flash, sandbox off) + orchestrator review fix (skip link overlay, viewer shift 0) | evidence/T012-{log-fallback.txt,screenshot-*.png,meta.json} | 63b11eb |
| T013 | ☐ | | | |
| T014 | ☐ | | | |
| T015 | ☐ | | | |
| T016 | ☐ | | | |
| T017 | ☐ | | | |

**G1 gate (2026-11-01):** integrated `b81959d`, all 7 guards OK, typecheck/lint/test (595 + 4 expected-fail)/build green, unsandboxed → `evidence/G1-log-gate.txt`. Scanner-list merge conflicts were resolved by the orchestrator (union).

**G2 gate (2026-11-01):** integrated `7cdbd0f`: guards OK, typecheck/lint/build green; `pnpm test` 1 intermittent failure (output not captured) then 3× green; S4–S7 `engine:probe` 195/198, 3 chip-label FAILs from the S7 probe reading `textContent` (C3 pending Murphy) → `evidence/G2-log-gate.txt`, `G2-engine-probe.json`.

Resume prompt for a fresh session: _"Read `.specify/KICKOFF-S08.md` and `.specify/features/a11y-floor/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."_

## Format & rules (apply to every task)

- **Task heading:** `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task.
- **Stories:** **US1** keyboard explores parts · **US2** focus story · **US3** screen reader hears it · **US4** reviewer trusts the floor (axe) · **US5** contrast · **US6** reduced motion · **US7** no JS / no WebGL · **US8** nothing else breaks.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:**
  - Each task runs in a fresh worktree from `task/s08-a11y-floor`, on branch `task/s08-t0NN-<slug>`.
  - After the check passes, merge back into the slice branch without squashing.
  - Commit message: `S08/T0NN: <title>`.
  - Remove the worktree only after the merge.
- **Orchestrator-only steps (⚑):** `git push`, opening/updating the PR, the regression-proof commits, merging the PR (only on Murphy's command). Flash prepares; the orchestrator executes.
- **Guards (every task):** all must print OK (plan.md "Guards"):
  ```sh
  git diff --quiet 5b22987 -- .specify/slices .specify/KICKOFF-S08.md && echo FROZEN-OK
  git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
  git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK
  git diff --quiet 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) && echo SURFACE-S6-OK
  git diff --quiet 5b22987 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s7.paths) && echo SURFACE-S7-OK   # from T001 on
  git diff --quiet 5b22987 -- tools/perf/src/panel-probe.ts tools/perf/src/engine-probe.ts tools/perf/src/cli/engine-probe.ts && echo PROBES-OK
  test -z "$(git log --oneline 5b22987..HEAD -- .specify/slices .specify/KICKOFF-S08.md)" && echo BRIEF-HISTORY-OK
  ```
- **Every check also runs:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Scanner upkeep (every task that adds a source file):** add the file to an `S08_SOURCE_FILES` list in `apps/web/test/no-color-literals.test.ts` and `no-motion-literals.test.ts` (create the list on first use, same shape as `S07_SOURCE_FILES`, asserted with `arrayContaining`). A new `xploder/react` import used by the app goes into `package-consumer.test.ts`'s allowed identifiers.
- **Tier-B files** (plan.md "Tier-B edits"): only the listed change is allowed in `PanelLayer.tsx`, `DetailPanel.tsx`, `TechChips.tsx`, `useViewerPanels.ts`, `PartLettering.tsx`. Each Tier-B task pastes `git diff 5b22987 -- <file>` into its evidence.
- **Never:**
  - Dependencies and exports: add a dependency other than `jsdom` (apps/web dev, T007) and `axe-core@4.14.0` (tools/perf, T013); edit `packages/xploder/package.json`; add a package `exports` subpath; change an existing prop, type or signature (additive only); deep-import `xploder/src` from the app.
  - Sealed and frozen code: edit any file in the S2/S4, S5, S6 or S7 Tier-A manifests, an existing S2–S7 test, `panel-probe.ts` or `engine-probe.ts`; change the tour, pointer or focus reducers, the viewer handle, camera, layout, explode, emphasis, overlay or callout behaviour.
  - Presentation: change any colour, size, font, spacing, position or motion of an existing surface, **except** R2 (T011).
  - Renderer: add a WebGL object; put text into WebGL.
  - Literals: motion literals (durations, easings, staggers, timer delays, CSS `transition` strings) outside `packages/xploder/src/motion/`; hex/`rgb()`/`hsl()` colours outside `packages/xploder/src/theme/`; `setTimeout` for focus or announcements (use `requestAnimationFrame` / layout effects).
  - a11y anti-patterns: `aria-modal=true` or a focus trap on panels; a positive `tabIndex`; `aria-hidden` on a node that contains a focusable element (except the ⚑ regression-proof commit in T015).
  - Perf: compare fps to a literal number; add a threshold override to any CLI; set `PERF_FIXTURES` on Vercel.
  - Hygiene: private hostnames, IPs or tokens anywhere (`127.0.0.1` is fine); run `specify init`; use bare `git stash`.
- **Evidence** goes to `.specify/features/a11y-floor/evidence/T0NN-*.{txt,png,json,md}` (naming per `.specify/EVIDENCE.md` §4). Throwaway scripts live in `/tmp/s08-checks/`. Run `mkdir -p /tmp/s08-checks .specify/features/a11y-floor/evidence` first, and run every check under `set -euo pipefail`.
- **Dev server** (T008–T012 smoke): `pnpm --filter web dev`, then use `http://localhost:3000` (not `127.0.0.1`: Next 16 dev blocks `/_next` for that origin). Smoke scripts load Playwright via `createRequire('<repo>/tools/perf/package.json')('playwright')`. Each script exits non-zero on any failed assertion, so the check fails.
- **Local fixture server** (T002, T016): from T013 on, the CLIs take `--serve out-fixtures` (in-process `serveDir`, free port). Before that: `pnpm build:fixtures && (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s08-checks/serve.pid)`, wait with `until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done`, stop with `kill "$(cat /tmp/s08-checks/serve.pid)"`.

---

## Phase G1: Seals + pure core (US1–US6, US8) → STOP for Murphy after T006

### T001 [US8] S7 frozen manifest Tier A (seal) + negative control

- **Seam:** S7 surface ↔ CI (fourth hash manifest).
- **Files:**
  - `packages/xploder/test/frozen-surface.s7.paths`: the Tier-A list from plan.md "Guards", one path per line (directories allowed).
  - `packages/xploder/test/frozen-surface.generate-s7.sh`: a copy of `frozen-surface.generate-s6.sh` with `base=5b22987`, the S7 file names and the note `"S07 seal, Tier A (S08 RFC D1). Tier B files are edited for a11y only and guarded by the presentation snapshot. A later slice that changes a listed file regenerates this manifest in the same diff and states why."`. Run it to produce `frozen-surface.s7.manifest.json`.
  - `packages/xploder/test/frozen-surface.test.ts`: **append** `describe('frozen S7 surface', …)` (same shape as the S6 block). It asserts `base === '5b22987'`, the exact note, ≥ 20 entries, and the presence of `src/panel/state.ts`, `src/panel/place.ts`, `src/lettering/model.ts`, `src/react/panel/useSlabClick.ts` and `test/panel-place.test.ts`. It also asserts that **none** of the five Tier-B paths is in the manifest. The existing describes are not modified.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s08-checks .specify/features/a11y-floor/evidence
  bash packages/xploder/test/frozen-surface.generate-s7.sh | tee /tmp/s08-checks/t001.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts 2>&1 | tee -a /tmp/s08-checks/t001.txt
  printf ' ' >> packages/xploder/src/panel/state.ts
  if pnpm --filter xploder exec vitest run test/frozen-surface.test.ts >/tmp/s08-checks/t001-neg.txt 2>&1; then echo 'NEG-CONTROL-FAILED'; exit 1; fi
  git checkout -- packages/xploder/src/panel/state.ts; echo 'S7 negative control: red as expected' | tee -a /tmp/s08-checks/t001.txt
  git diff --stat --exit-code 5b22987 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s7.paths) | tee -a /tmp/s08-checks/t001.txt && echo S7-DIFF-EMPTY | tee -a /tmp/s08-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (generator output, test log, negative control, empty S7 diff, manifest entry count)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the negative control shows the S7 guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed with the Tier-A list in plan.md).

### T002 [US8] Presentation snapshot tool + base baseline

- **Seam:** S7 presentation ↔ a machine diff (the Tier-B guard, RFC D1).
- **Files:**
  - `tools/perf/src/presentation-snapshot.ts`: `snapshotPresentation(page)` and the pure `diffPresentation(a, b)` (plan.md "Tools"). Every node under `[data-xploder-panel-layer]` and `[data-xploder-lettering-layer]` is keyed by a stable DOM path. It records the rect (rounded to 0.5 px) and the computed `color`, `background-color`, `font-family`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `border-*-color`, `border-*-width`, `opacity`, `transform`, `visibility`, `display`.
  - `tools/perf/src/cli/presentation-snapshot.ts`: `--url <base> --out <file>` over the **state list** {A exploded idle, A `?highlight=tide-repository`, A `?select=tide-repository`, A `?panel=case-study`, B `?select=reconciliation-ledger`, C exploded idle, C `?focus=client` (layer focus = dimmed state)} × {light, dark} × {desktop 1280×800, mobile 390×844}. It waits for `[data-xploder-ready="true"]` (+ `[data-xploder-panel-ready="true"]` where a panel is open) + 2 frames.
  - `tools/perf/test/presentation-snapshot.test.ts`: the diff on synthetic inputs (equal → `[]`; one property → one entry; a missing node → one entry).
- **Check:**
  ```sh
  set -euo pipefail
  git worktree add /tmp/s08-base 5b22987 && (cd /tmp/s08-base && pnpm install --frozen-lockfile && pnpm build:fixtures)
  (node tools/perf/src/cli/serve.ts --dir /tmp/s08-base/out-fixtures --port 4199 & echo $! > /tmp/s08-checks/serve.pid)
  until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done
  node tools/perf/src/cli/presentation-snapshot.ts --url http://127.0.0.1:4199 --out .specify/features/a11y-floor/evidence/T002-presentation-base.json
  node tools/perf/src/cli/presentation-snapshot.ts --url http://127.0.0.1:4199 --out /tmp/s08-checks/t002-rerun.json
  node -e "const {diffPresentation}=await import('./tools/perf/src/presentation-snapshot.ts');const fs=await import('node:fs');const d=diffPresentation(JSON.parse(fs.readFileSync('.specify/features/a11y-floor/evidence/T002-presentation-base.json')),JSON.parse(fs.readFileSync('/tmp/s08-checks/t002-rerun.json')));console.log('determinism diff entries:',d.length);if(d.length)process.exit(1)" | tee /tmp/s08-checks/t002.txt
  kill "$(cat /tmp/s08-checks/serve.pid)"; git worktree remove /tmp/s08-base
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-presentation-base.json`, `evidence/T002-log-presentation.txt` (node and state counts, determinism diff = 0)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the state list above; if the determinism diff is non-zero because of sub-pixel noise, the orchestrator widens the rounding to 1 px and records it).

### T003 [P] [US1] Navigator order/keys + reveal (pure)

- **Seam:** keyboard events ↔ `src/a11y/navigator.ts`; focus ↔ `src/a11y/reveal.ts` (used by T008).
- **Files:** `packages/xploder/src/a11y/navigator.ts`, `src/a11y/reveal.ts`, `src/a11y/look.ts` (pan step, page fraction, reveal margin: layout values, documented in a comment as not motion), `test/a11y-navigator.test.ts`, `test/a11y-reveal.test.ts` (plan.md "Navigator", "Reveal").
  - The navigator test covers: A order `1.1 beachgoer … 4.1 tide-feed` (8 items), B (5), C (13); wrap at both ends; Home/End; `null` for `ArrowLeft, ArrowRight, '+', '-', '0', 'Escape', 'Tab', 'a'`; item numbers equal to the S6 parts-model numbering (read through the public S6 overlay model, read-only).
  - The reveal test covers above / below / inside / taller-than-canvas / clamped, with an `offsetFor` round trip.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/a11y-navigator.test.ts test/a11y-reveal.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-navigator.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; you try the keys at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: item-number order, Up/Down wrap).

### T004 [P] [US3] Announcement model (pure)

- **Seam:** viewer/panel transitions ↔ `src/a11y/announce.ts` (used by T007/T010).
- **Files:** `packages/xploder/src/a11y/announce.ts`, `test/a11y-announce.test.ts`.
  - Every RFC D5 row for fixture A.
  - **Pinned S5 copy:** `tourStep` for `live-update` step 0 equals `"Live update · Step 1 of 6. Beachgoer. A person checking the next high tide.. A new tide reading travels from the public feed to the chart."` (from `RFC-log-baseline.txt`), and step 3 starts with `"Live update · Step 4 of 6. Tide Repository"`.
  - `tourJump` = `"Jumped to " + tourStep`; `tourPausedOpen` = `"Tour paused. " + detailOpen`.
  - `detailOpen('tide-repository')` = `"Tide Repository, module. Chooses between a live reading and the saved forecast."`; a component without a summary → `"<name>, <kind>."`; `detailClose` = `"Tide Repository details closed."`.
  - Case study `"Case study: Tidewatch."` / `"Case study closed."`; `ANNOUNCE.detailOpen === true`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/a11y-announce.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-announce.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the message table in the log (default: accept; final judgement in the VoiceOver pass).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC D5 wording).

### T005 [P] [US5] Contrast inventory + table test (pure)

- **Seam:** palette tokens ↔ `src/a11y/contrast.ts` (the AC4 token-level measurement).
- **Files:** `packages/xploder/src/a11y/contrast.ts`, `test/a11y-contrast.test.ts` (plan.md "Contrast").
  - The inventory covers every RFC D6 surface × `rest | highlight | dim`.
  - The test prints the full table for light and dark (`console.log`, captured in evidence) and asserts `pass` for every row without `exception`.
  - The four R2 rows (`lettering-face-number-highlight`, `lettering-face-name-highlight` × 2 palettes) assert the **post-fix** role (`ink`) inside `test.fails(...)`, so today's red is recorded and CI stays green. T011 converts them to `test(...)`.
  - The table must reproduce the RFC numbers within ±0.01, for example accent on the highlight fill 3.05 / 3.34, label 4.24 / 3.01, and light `tech.library` on paper 4.93.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/a11y-contrast.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t005.txt
  grep -E 'lettering-face-(number|name)-highlight' /tmp/s08-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-contrast-token-before.txt` (both tables)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Skim the table for a surface that is missing (default: accept the RFC D6 inventory).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: thresholds 4.5 body / 3 large and UI).

### T006 [P] [US6] Reduced-motion matrix + completeness scanner (pure)

- **Seam:** source animation sites ↔ `test/a11y-motion-matrix.json` (AC5 completeness).
- **Files:** `packages/xploder/test/a11y-motion-matrix.json` (12 rows per RFC D9), `test/a11y-motion-matrix.test.ts` (plan.md "Motion matrix").
  - Every row has an existing `site` file.
  - Every scanned site appears in some row.
  - The negative control: a synthetic unlisted `.animate(` → a hit.
  - Every row's `tokens` are keys of `motion.durations`/`staggers`/`distances` or `"none"`, and `resolveMotion(true)` returns 0 for each listed token.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/a11y-motion-matrix.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-log-motion-matrix.txt` (the rows, scanned sites, negative control)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the browser proof is T016).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

---

## Phase G2: DOM wiring (US1–US3, US5, US7) → STOP for Murphy after T012

### T007 [US3] [US7] jsdom env + WebGL gate + always-mounted live region (tour steps)

- **Seam:** `TeardownViewer` mount ↔ `LiveRegion` + `hasWebgl` / `CanvasBoundary`.
- **Files:**
  - `apps/web/package.json`: devDependency `jsdom` (C1).
  - `packages/xploder/src/react/a11y/{LiveRegion.tsx, webgl.ts, CanvasBoundary.tsx}`.
  - `src/react/TeardownViewer.tsx`:
    - the WebGL gate (`data-xploder-webgl`; unavailable → `fallback` in place of the stage);
    - `<CanvasBoundary>` around `<Canvas>`;
    - `<LiveRegion>` from the first render;
    - tour step/jump announcements via `announce()`;
    - `TourCaptionLiveRegion` no longer rendered.
  - `apps/web/test/xploder-dom/a11y-live-region.dom.test.tsx` (`// @vitest-environment jsdom`): mount `TeardownViewer` + `useTeardownViewer` for fixture A with `react-dom/client` + `act`. It asserts: wrapper `data-xploder-webgl="unavailable"`; exactly one `[aria-live="polite"]` (`[data-xploder-live]`), empty; `act(() => viewer.actions.play())` → **the same element** has the T004 step-1 text; `step()` → the step-2 text; no `[data-xploder-caption-live]` exists.
- **Check:**
  ```sh
  set -euo pipefail; pnpm install
  pnpm --filter web exec vitest run test/xploder-dom/a11y-live-region.dom.test.tsx --reporter verbose 2>&1 | tee /tmp/s08-checks/t007.txt
  git diff --exit-code 5b22987 -- packages/xploder/package.json && echo XPLODER-PKG-UNCHANGED | tee -a /tmp/s08-checks/t007.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-live-region.txt` (the DOM test = the AC2 "asserted in the DOM test" proof)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; you hear it in the VoiceOver pass).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: jsdom in `apps/web` per C1).

### T008 [US1] `ComponentNavigator` + stage focus redirect + wrapper pan keys

- **Seam:** keyboard ↔ components (proxies, ring, highlight, reveal) in `TeardownViewer`.
- **Files:**
  - `packages/xploder/src/react/a11y/ComponentNavigator.tsx` (plan.md "Navigator").
  - `src/react/TeardownViewer.tsx`:
    - mount it after the stage and add it to the `onOverlay`/`onOverlayScroll` fan-out;
    - activate → `onSlabClick(id)` with the opener recorded;
    - stage `tabIndex -1` + `onFocus` redirect (R1);
    - wrapper pan keys + `aria-keyshortcuts` + `aria-describedby` help (Q11).
  - `apps/web/test/xploder-dom/a11y-navigator.dom.test.tsx`: the navigator standalone with a synthetic settled frame. It checks one `tabIndex=0`; ArrowDown ×9 → index 1 (wrap over 8); End → last; Enter → `onActivate(id)`; ArrowLeft → not `defaultPrevented`; ring present only after focus with a frame.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web exec vitest run test/xploder-dom/a11y-navigator.dom.test.tsx --reporter verbose 2>&1 | tee /tmp/s08-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-UNIT-OK
  # dev smoke (dev server on localhost:3000): /tmp/s08-checks/t008-smoke.mjs — fixture A: Tab from body → wrapper → 1 proxy stop;
  # ArrowDown ×8 visits all 8 ids in order (data-xploder-highlight follows); ArrowLeft changes data-xploder-azimuth;
  # Enter → data-xploder-panel=detail; C at max zoom: wrapper ArrowDown changes stage.scrollTop, Tab never lands on [data-xploder-stage];
  # mouse click on canvas → activeElement === wrapper (R1). Screenshot of the ring light + dark.
  node /tmp/s08-checks/t008-smoke.mjs 2>&1 | tee -a /tmp/s08-checks/t008.txt && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-navigator.txt`, `T008-screenshot-ring-desktop-{light,dark}.png` + `T008-meta.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: Tab into the drawing, arrow through the parts, check the outline and highlight (default: accept the look; the ring weight is tunable).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T009 [US2] Focus: `usePanelFocus` + Tier-B focus edits + close-to-trigger

- **Seam:** panel lifecycle ↔ focus (open → heading, remount/visibility restore, close → trigger).
- **Files:**
  - `packages/xploder/src/react/a11y/usePanelFocus.ts`.
  - **Tier B:** `PanelLayer.tsx` (hook call + refs), `DetailPanel.tsx` (`h2 tabIndex -1` + ref), `useViewerPanels.ts` (opener on `openDetail` + `recordOpener`).
  - `TeardownViewer.tsx`: close → connected proxy / chrome opener, else the S7 rule.
  - `apps/web/test/xploder-dom/a11y-panel-focus.dom.test.tsx`: `PanelLayer` standalone with a synthetic settled event:
    - open → `activeElement` = heading;
    - a new settled event with another dock (key change) while focus is inside → the new heading;
    - `update({kind:'moving'})` then settled → still the heading;
    - close (through `TeardownViewer` in jsdom, no-WebGL path, with `panels.actions.openDetail` + the proxy as opener) → proxy focused.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web exec vitest run test/xploder-dom/a11y-panel-focus.dom.test.tsx --reporter verbose 2>&1 | tee /tmp/s08-checks/t009.txt
  git diff 5b22987 -- packages/xploder/src/react/panel/{PanelLayer.tsx,DetailPanel.tsx,useViewerPanels.ts} | tee /tmp/s08-checks/t009-tierb.diff
  pnpm typecheck && pnpm lint && pnpm test && echo T009-UNIT-OK
  # dev smoke: click tide-repository → activeElement = h2, no :focus-visible; Esc → wrapper;
  # keyboard: proxy Enter → h2; Esc → that proxy; explode toggle (chrome button) with focus in panel → focus back in panel after settle.
  node /tmp/s08-checks/t009-smoke.mjs 2>&1 | tee -a /tmp/s08-checks/t009.txt && echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-focus.txt`, `T009-log-tierb-diff.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: click a part (no focus ring should appear), press Esc; then the same from the keyboard (default: accept Q4).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010 [US3] ARIA wiring + panel/jump/pause announcements

- **Seam:** viewer DOM ↔ the accessibility tree.
- **Files:**
  - **Tier B:** `PartLettering.tsx` (root `aria-hidden` only, not R2 yet), `TechChips.tsx` (category text), `DetailPanel.tsx` (meta/summary ids), `PanelLayer.tsx` (`aria-describedby`).
  - `TeardownViewer.tsx`:
    - the `aria-hidden` wrapper around `BlueprintOverlay`;
    - the group description;
    - the `detailOpen` / `detailClose` / `tourPausedOpen` / `tourJump` / case-study announcements.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm typecheck && pnpm lint && pnpm test && echo T010-UNIT-OK
  # dev smoke via CDP Accessibility.getFullAXTree + locator.ariaSnapshot(): every node under [data-xploder-lettering-layer]
  # and the overlay wrapper ignored; no AX text '1.1'…'4.1' outside navigator/dialog/live/caption; chip names 'Kotlin, language' …;
  # dialog 'Tide Repository' has a description with 'module · shipped'; live text after open / close / jump / pause per T004 strings.
  node /tmp/s08-checks/t010-smoke.mjs 2>&1 | tee /tmp/s08-checks/t010.txt
  git diff 5b22987 -- packages/xploder/src/react/lettering/PartLettering.tsx packages/xploder/src/react/panel/TechChips.tsx | tee /tmp/s08-checks/t010-tierb.diff && echo T010-OK
  ```
- **Evidence:** `evidence/T010-log-aria-smoke.txt` (ARIA snapshots before/after vs `RFC-log-baseline.txt`), `T010-log-tierb-diff.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional quick VoiceOver peek at G2 (default: skip; the full pass is at final validation).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q6 hide the S6 overlay from AT).

### T011 [US5] Contrast fix R2 (highlighted face lettering → ink)

- **Seam:** `PartLettering` colour roles ↔ the AC4 table.
- **Files:**
  - **Tier B:** `PartLettering.tsx` (the highlighted part's face number + face name → `palette.ink`; nothing else).
  - `test/a11y-contrast.test.ts`: the R2 rows `test.fails` → `test`.
  - If the token table or the T016 pixel pass shows a **token-level** offender, the fix goes into `blueprint.ts` values + the S2 manifest regenerated for that file, with the reason (expected: none; record "none").
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter xploder exec vitest run test/a11y-contrast.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t011.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build:fixtures && echo T011-UNIT-OK
  # presentation diff vs T002 base: only the color of highlighted face-lettering nodes may differ
  (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s08-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done
  node tools/perf/src/cli/presentation-snapshot.ts --url http://127.0.0.1:4199 --out /tmp/s08-checks/t011-pres.json
  node /tmp/s08-checks/t011-diff.mjs .specify/features/a11y-floor/evidence/T002-presentation-base.json /tmp/s08-checks/t011-pres.json | tee -a /tmp/s08-checks/t011.txt   # exits 1 on any entry that is not (highlighted face lettering, color)
  kill "$(cat /tmp/s08-checks/serve.pid)"; echo T011-OK
  ```
- **Evidence:** `evidence/T011-log-contrast-token-after.txt`, `T011-log-presentation-diff.txt`, `T011-screenshot-highlight-{light,dark}.png` + meta
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: hover/focus a part and look at its face lettering in both palettes (default: accept ink).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: R2 as approved; the revision log is your call).

### T012 [US7] No-JS / no-WebGL fallback + skip link

- **Seam:** static export HTML ↔ `EngineFallback`; viewer `fallback` prop.
- **Files:**
  - `apps/web/app/dev/engine/engine-fallback.tsx` (plan.md "No-WebGL gate + fallback").
  - `page.fixture.tsx`: skip link + `<noscript>` fallback + placeholder hide.
  - `engine-playground-loader.tsx`: `data-engine-loading` on the placeholder.
  - `engine-playground.tsx`: `fallback={<EngineFallback projects message="WebGL is unavailable for this architecture view." />}` and `id="engine-controls"` on the controls section.
- **Check:**
  ```sh
  set -euo pipefail; pnpm typecheck && pnpm lint && pnpm test && pnpm build:fixtures && echo T012-BUILD-OK
  grep -c 'aria-label="Projects"' out-fixtures/dev/engine.html | tee /tmp/s08-checks/t012.txt   # the fallback is in the static HTML
  (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s08-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done
  # smoke: javaScriptEnabled:false → poster role=img + 3 project links visible, placeholder hidden (light + dark screenshots);
  # init-script getContext('webgl'|'webgl2') → null → no <canvas>, message + 3 links, 0 pageerror, 0 console errors;
  # Tab from page top → first stop is the skip link; Enter → focus/scroll to #engine-controls.
  node /tmp/s08-checks/t012-smoke.mjs 2>&1 | tee -a /tmp/s08-checks/t012.txt
  kill "$(cat /tmp/s08-checks/serve.pid)"; echo T012-OK
  ```
- **Evidence:** `evidence/T012-log-fallback.txt`, `T012-screenshot-nojs-mobile-{light,dark}.png`, `T012-screenshot-nowebgl-desktop.png` + meta
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: look at the no-JS poster and the list in both themes (default: accept the SVG poster; it is the S10 seed).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

**G2 gate:** the orchestrator runs all guards + `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then starts `pnpm dev` and opens `http://localhost:3000/dev/engine` in Orca's browser for Murphy's keyboard click-through (memory: visual checks in the Orca browser). STOP.

---

## Phase G3: Gates (US1–US4, US8) → STOP for Murphy after T015

### T013 [US4] axe gate tool (`a11y:axe`)

- **Seam:** a page under test ↔ the axe verdict + exit code.
- **Files:**
  - `tools/perf/package.json`: dependency `axe-core@4.14.0`.
  - `tools/perf/src/a11y-axe.ts`, `src/cli/a11y-axe.ts` (plan.md "Tools"). The state list is RFC D7 + R3 (layer focus) + R9 (C idle + C focused). `--serve <dir>` uses `serveDir`.
  - Root `package.json`: `"a11y:axe": "node tools/perf/src/cli/a11y-axe.ts"`.
  - `tools/perf/test/a11y-axe.test.ts` + `test/fixtures/axe-{clean,serious,dim-contrast}.json`: clean → 0; serious → 6 with the rule id in the summary; dim-contrast (all nodes tagged dimmed) → 0 with 1 ledger entry; dim-contrast + one untagged node → 6; usage error → 2.
- **Check:**
  ```sh
  set -euo pipefail; pnpm install
  pnpm --filter perf-tools exec vitest run test/a11y-axe.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t013.txt
  pnpm a11y:axe --help && pnpm build:fixtures && pnpm a11y:axe --serve out-fixtures --out /tmp/s08-checks/axe 2>&1 | tail -20 | tee -a /tmp/s08-checks/t013.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T013-OK
  ```
- **Evidence:** `evidence/T013-log-axe-tool.txt` (unit log + local run summary)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`).

### T014 [P] [US1] [US2] [US3] [US5] [US6] [US7] a11y probe tool (`a11y:probe`)

- **Seam:** the fixture export ↔ the drill, AX, announcement, contrast, reduced-motion, fallback, presentation and metrics groups.
- **Files:**
  - `tools/perf/src/a11y-probe.ts`, `src/cli/a11y-probe.ts` (plan.md "Tools").
  - Root `package.json`: `"a11y:probe": "node tools/perf/src/cli/a11y-probe.ts"`.
  - `tools/perf/test/a11y-probe.test.ts`: pure evaluators.
    - Tab-walk verdicts: a trap (a repeated cycle that never reaches the last control) → fail; forward/back mismatch → fail; the expected order matches.
    - The AX duplicate check: a lettering string outside the allowed roots → fail.
    - The contrast pixel evaluator: worst/median from a synthetic RGBA patch.
    - The reduced-motion row verdict: any sample > 0 → fail.
  - The probe reuses `presentation-snapshot.ts`.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter perf-tools exec vitest run test/a11y-probe.test.ts --reporter verbose 2>&1 | tee /tmp/s08-checks/t014.txt
  pnpm a11y:probe --help && pnpm build:fixtures && pnpm a11y:probe --serve out-fixtures --ci --out /tmp/s08-checks/probe 2>&1 | tail -30 | tee -a /tmp/s08-checks/t014.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T014-OK
  ```
- **Evidence:** `evidence/T014-log-probe-tool.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T015 [US4] [US8] ⚑ CI a11y job + push + draft PR + regression proof

- **Seam:** slice branch ↔ CI (`perf.yml` job `a11y: axe (engine fixture export)`).
- **Files:** `.github/workflows/perf.yml` (plan.md "CI").
- **Steps (⚑ orchestrator):**
  1. Push `task/s08-a11y-floor` and open a **draft PR** (title `S08: a11y floor — keyboard, screen reader, contrast, no-JS`).
  2. Wait for every check; the a11y job must be green → record the run URL.
  3. **Broken commit** `S08/T015: regression proof (deliberately broken — reverted next commit)`: add `aria-hidden="true"` to the "Engine playground controls" `<section>` (R6). Push. The a11y job must go **red** with `aria-hidden-focus` (serious) → record the run URL + log excerpt.
  4. `git revert` that commit; push; the a11y job is green again → record the run URL.
- **Check:**
  ```sh
  set -euo pipefail
  gh pr checks --watch 2>&1 | tee /tmp/s08-checks/t015-green-1.txt
  # after step 3:
  if gh pr checks --watch >/tmp/s08-checks/t015-red.txt 2>&1; then echo 'REGRESSION-NOT-CAUGHT'; exit 1; fi
  grep -E "a11y.*(fail|X)" /tmp/s08-checks/t015-red.txt && gh run view --log-failed --job "$(gh run list --branch task/s08-a11y-floor --workflow perf -L1 --json databaseId -q '.[0].databaseId')" 2>/dev/null | grep -m3 "aria-hidden-focus" | tee -a /tmp/s08-checks/t015-red.txt
  # after step 4:
  gh pr checks --watch 2>&1 | tee /tmp/s08-checks/t015-green-2.txt && echo T015-OK
  ```
- **Evidence:** `evidence/T015-ci.txt` (three run URLs: green, red with the rule id, green; log excerpts)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the red run once and see the axe rule named in the log (default: agent excerpt suffices).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (push + draft PR granted at Gate 1; default: the R6 broken state).

---

## Phase G4: Evidence + ship (US1–US8) → STOP for Murphy after T017

### T016 [US1]–[US8] Evidence run (all groups, both palettes, both viewports)

- **Seam:** the fixture export ↔ committed evidence.
- **Runs** (local fixture export, browser tasks unsandboxed; FPS last and alone):
  1. `pnpm a11y:axe --serve out-fixtures --out .evidence/axe` → `T016-axe-{light,dark}-{desktop,mobile}.json`, `T016-axe-summary.json` (0 serious / 0 critical; dim ledger listed).
  2. `pnpm a11y:probe --serve out-fixtures --out .evidence/a11y` (all groups) →
     - `T016-log-keyboard-drill-{a,b}.txt`;
     - `T016-log-aria-{idle,focused,detail,case-study,tour-step1,jump}.txt`;
     - `T016-log-announce.txt`;
     - `T016-log-contrast-browser.json`;
     - `T016-log-reduced-motion.txt`;
     - `T016-log-nojs-dom.txt`, `T016-log-nowebgl-dom.txt` + screenshots;
     - `T016-log-presentation-diff.txt`;
     - `T016-log-metrics.txt` (`drawCalls = 2` idle / panel / focused; strict CLS 0).
  3. `pnpm engine:probe <served url>` (S4–S7, unchanged tool) → `T016-engine-probe.json`: all pass.
  4. `T016-log-contrast-table.md`: merge the T011 token table + `contrast-browser.json` + the axe `color-contrast` column. One row per inventory surface × palette, with verdicts and the dim ledger rows marked.
  5. `T016-log-surface-diff.txt`: the guard lines + `git diff --stat` per base + the Tier-B diff.
  6. `pnpm fps:engine --scenario tour` alone → `T016-fps.json` (0 dropped frames over ≥ 5 s; band liveness; `drawCalls = 2`).
- **Check:**
  ```sh
  set -euo pipefail
  for f in axe-summary.json log-keyboard-drill-a.txt log-keyboard-drill-b.txt log-reduced-motion.txt log-presentation-diff.txt engine-probe.json fps.json log-contrast-table.md; do test -s ".specify/features/a11y-floor/evidence/T016-$f" || { echo "missing T016-$f"; exit 1; }; done
  node -e "const s=JSON.parse(require('fs').readFileSync('.specify/features/a11y-floor/evidence/T016-axe-summary.json'));if(s.serious||s.critical)process.exit(1);console.log('axe ok',s)"
  node -e "const r=JSON.parse(require('fs').readFileSync('.specify/features/a11y-floor/evidence/T016-fps.json'));if(r.droppedFrames!==0||r.drawCalls!==2||r.verdict?.pass!==true)process.exit(1);console.log('fps evidence ok: dropped',r.droppedFrames,'drawCalls',r.drawCalls)"
  echo T016-OK
  ```
- **Evidence:** the files above (+ `T016-meta.json`: command, exit code, local target, Chromium + axe versions)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Skim the contrast table and the dim ledger (default: accept R3).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T017 [US1]–[US8] ⚑ VoiceOver checklist + AC self-check + PR ready

- **Seam:** slice branch ↔ Murphy's final validation ↔ `main`.
- **Files:**
  - `evidence/voiceover-checklist.md`: a ~15-minute script for Safari + VoiceOver on `/dev/engine`. For each step: the action, the expected speech, and pass/fail boxes.
    1. VO on; load A.
    2. VO-Right through the header → the viewer group name + its description.
    3. Tab to Components → hear "Beachgoer, button, … Item 1.1 …".
    4. ArrowDown ×3; Enter → the dialog name + description + the live open message.
    5. Chips "Kotlin, language".
    6. Esc → back on the same part + "details closed".
    7. Play the tour → step 1 announced.
    8. Enter on an in-flow part → "Jumped to …".
    9. Enter on an off-flow part → "Tour paused …".
    10. The rotor (VO-U) headings/landmarks list has no lettering numbers.
    11. Case study open/close.
    12. Dark theme spot-check.
    13. The verbosity verdict for `ANNOUNCE.detailOpen`.
  - `evidence/AC-selfcheck.md`: AC1–AC7 × evidence file × verdict.
  - `evidence/T017-ci.txt`.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build 2>&1 | tail -5 | tee /tmp/s08-checks/t017.txt
  # the seven guard lines (all OK) | tee -a /tmp/s08-checks/t017.txt
  gh pr checks --watch 2>&1 | tee -a /tmp/s08-checks/t017.txt   # build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion, a11y
  ```
  ⚑ The orchestrator marks the PR ready, then **waits for Murphy's merge command** (RFC §9.4). Memory (gitleaks squash fingerprint): any new manifest is path-allowlisted by the existing `.gitleaks.toml` regex (`frozen-surface(\.s[0-9]+)?\.manifest\.json`), so `s7` is covered. This is re-checked after the merge.
- **Evidence:** `evidence/T017-ci.txt`, `AC-selfcheck.md`, `voiceover-checklist.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. **The VoiceOver pass (15 min, required by the brief)** with `voiceover-checklist.md`; tick or annotate each step (default: Safari + VoiceOver, `pnpm dev`, `http://localhost:3000/dev/engine`).
  2. Keyboard-only walkthrough of A and B in both palettes (default: same as G2).
  3. The AC self-check table (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. The completed VoiceOver checklist (or its failures); any failure is fixed inside Stage 3 before the merge (default: none expected).
  2. The merge command when you're satisfied (default: no merge without it).
  3. After the merge: nothing; the agent reminds you to `git pull` the original clone.

---

## Dependencies & order

T001 → T002 → (T003 ∥ T004 ∥ T005 ∥ T006) → **STOP G1** → T007 → T008 → T009 → T010 → T011 → T012 → **STOP G2** → (T013 ∥ T014) → T015 (⚑ push + draft PR + proof) → **STOP G3** → T016 (FPS last, alone) → T017 → **STOP G4**.

- T001 comes first, so the S7 seal exists before any S8 code lands. T002 captures the base presentation before any Tier-B edit.
- T007 needs T004 (announce) and provides the jsdom env + WebGL gate that T008/T009 DOM tests use.
- T008 needs T003. T009 needs T008 (the proxy as opener). T010 needs T004 + T009. T011 needs T005 + T002 (the presentation base).
- T013/T014 need the full G2 DOM; T015 needs both.
- Parallel G1 tasks run in separate worktrees and merge in ID order. Each touches only its own new files (+ scanner lists, merged by the orchestrator).

## FR ↔ task coverage

| FR | AC | Tasks |
|---|---|---|
| FR-001 | AC1 | T003, T008, T009, T014, T015 (CI drill), T016 |
| FR-002 | AC2 | T004, T007, T010, T014, T016, T017 (VoiceOver) |
| FR-003 | AC3 | T013, T015, T016 |
| FR-004 | AC4 | T005, T011, T014, T016 |
| FR-005 | AC5 | T006, T014, T016 |
| FR-006 | AC6 | T007, T012, T014, T016 |
| FR-007 | AC7 | T001, T002, T011, T015, T016, T017 |
