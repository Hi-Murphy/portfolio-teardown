# Tasks: S10 Site Shell (Landing · Project Routes · Recruiter Mode)

**Input:** `rfc.md` (approved, §9: Murphy answers, R1–R10, C1–C3), `spec.md`, `plan.md` in `.specify/features/site-shell/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`). The sandbox is on for Node-only tasks and **off** for browser tasks (the Codex sandbox cannot launch Chromium). Writes are limited to the task worktree and `/tmp/s10-checks`.

**Escalation (kickoff Hard Rule 7):**
- Tier 1.5 (OpenRouter) is **DORMANT** (`OPENROUTER_API_KEY` unset), so it is skipped and recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes the task personally on Murphy's go.
- Each report states the finishing tier and any skip.

**Usage pacing:**
- Murphy states "5h: N%" at gates (Gate 1: 61%).
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Perf doctrine (kickoff Hard Rule 5):** dropped-frames style only. **No task check may compare fps against a literal threshold.** Lighthouse/weight budgets come from `tools/perf/src/budgets.ts` and are never changed or overridden.

**Evidence doctrine (kickoff Hard Rule 6):** every visual/perf/a11y claim attaches a machine artifact (screenshot + meta, Lighthouse JSON, axe JSON, CLS JSON, test log). "Looks fine" is never a check.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (24 files sealed; negative control red) | 1 (Flash, sandbox on); full check re-run by orchestrator unsandboxed (tools/perf loopback EPERM in sandbox) | evidence/T001-log-guard.txt | 30d0bf8 |
| T002 | ☑ (5 fidelity tests; strict + parsed equality, --check, sha) | 1 (Flash, sandbox on); check re-run by orchestrator unsandboxed (loopback EPERM: tools/perf tests + Turbopack) | evidence/T002-log-content-fidelity.txt | 674c2ae |
| T002b | ☑ (site.json → site.source.ts; 9 fidelity tests) | 1 (Flash, sandbox off from here: every check needs loopback) | evidence/T002b-log-site-copy-fidelity.txt | 32a8140 |
| T003 | ☑ (chips Kotlin · Android · Kotlin Coroutines · Jetpack Compose; fixture-import + hand-copy scans incl. site.json) | 1 (Flash, sandbox off) | evidence/T003-log-content-model.txt | 0a38430 |
| T004 | ☑ (/dev/engine CLS 0.000637/0.000043 → 0 in 4 cells; independent cross-check 0 entries) | 1 (Flash, sandbox off) + orchestrator cross-check | evidence/T004-{log-cls-carryover.txt,cls-after.json} | 788f23c |
| T005 | ☑ (21 slabs, projection identity, fitZoom framing) | 1 (Flash) + orchestrator review fix (painter depth x+y+z; plan error) | evidence/T005-log-poster.txt | 81dd53f |
| T006 | ☑ (title = site.json meta.title; nav one row 360–1280; skip link; R4) | 1 (Flash) | evidence/T006-{log-chrome.txt,screenshot-*.png,meta.json} | fbaf896 |
| T007 | ☑ (card/chips/outline/about; no 'use client' R10) | 1 (Flash) | evidence/T007-log-components.txt | bac7043 |
| T008 | ☑ (hero copy from site.json; /projects; 404 + cards R6; CLS 0) | 1 (Flash) | evidence/T008-{log-pages.txt,screenshot-*.png,meta.json} | 8f1eaf4 |
| T009 | ☑ (27 smoke asserts: poster at FCP, reveal after load, idle exploded, reduced → skipped/0 animations, no-WebGL poster; CLS 0) | 1 (Flash) + orchestrator review fix (class constants out of the use-client module) | evidence/T009-{log-hero.txt,screenshot-*.png,meta.json} | c6d777f |
| T010 | ☑ (only known slug, unknown 404, deep link 200, metadata, no-JS outline) | 1 (Flash); 1st launch stopped by orchestrator (port collision with T009, runner issue, not an attempt) | evidence/T010-{log-route.txt,screenshot-nojs-*.png,meta.json} | 34e2a47 |
| T011 | ☑ (toolbar/case study/tour; rects stable; no-WebGL outline; ONE 3D chunk R2; CLS 0 on 3 routes) | 1 (Flash) | evidence/T011-{log-workbench.txt,screenshot-*.png,meta.json} | 56f49cf |
| T012a | ☑ (dock + Guided tour: route chooser w/ descriptions, transport, clickable step rail, hover highlight, Now line; pause-on-implode; 89 smoke asserts; CLS 0) | 1 (Flash) + orchestrator review (Case study text label ≥ sm) | evidence/T012a-{log-dock-tour.txt,screenshot-*.png,meta.json} | 3f93411 |
| T012b | ☑ (header one line at 360 no overflow; footer two-column; Résumé links + public/resume.pdf removed; /resume.pdf 404) | 1 (Flash) + orchestrator review (nav server-side, only NavProjectsLink client; desktop right-aligned links) | evidence/T012b-{log-header-footer.txt,screenshot-*.png,cls.json,meta.json} | 4ed6c27 |
| T012d | ☑ (poster hit-through fixed: hover leaders, wheel scroll at max zoom, slab clicks; Exit tour; route header first → last + steps; explode-before-step; 50 smoke asserts) | 1 (Flash) + orchestrator review (poster hides after the fade) | evidence/T012d-* | 907c2d6 |
| T012e | ☑ (S6 tour trail; 44 smoke asserts; S6 re-sealed at f65b13c; guards exit non-zero) | 1 (Flash; 1st launch was a runner quoting bug, not an attempt) + ⚑ orchestrator re-seal | evidence/{T012e-*,Q16-revision-note.md} | cfef420 |
| T012f | ☐ | | | |
| T012c | ☑ (local LH single-run perf 1 on all 3 routes × 2 themes, CLS 0, home 479 KB) | 1 (Flash) | evidence/T012c-* | (merge) |
| T012 | ☑ (3 routes × 2 themes; local LH single-run perf 0.99–1, CLS 0, home 476 KB; parity IoU 0.118 info, binarisation caught the box) | 1 (Flash) | evidence/T012-* | 2df7796 |
| T013 | ☐ | | | |
| T014 | ☐ | | | |
| T015 | ☐ | | | |
| T016 | ☐ ⚑ | | | |
| T017 | ☐ ⚑ | | | |
| T018 | ☐ | | | |
| T019 | ☐ ⚑ | | | |

**G1 gate (2026-11-02):** integrated `788f23c`, all 10 guards OK (incl. SURFACE-S8-OK), typecheck/lint green, tests tools/perf 111 · xploder 610 · web 83 (+1 skipped), build green → `evidence/G1-log-gate.txt`. Stage-3 start merged `main` (`5aae743`, Merlin: site.json + resume.pdf + brief erratum) → C4/T002b, Q14 open (RFC §9.5).

**G2 gate (2026-11-02):** integrated `2df7796` (+ `7a49449` scanner S10 lists; `main` 72dc34a merged at G2 start, Q14 resolved in site.json), guards 10 OK, typecheck/lint green, tests tools/perf 111 · xploder 610 · web 103, build green (/, /projects, /projects/[slug]), strict CLS 0 on 3 routes × 2 viewports × 2 themes → `evidence/G2-log-gate.txt`.

Resume prompt for a fresh session: _"Read `.specify/KICKOFF-S10.md` and `.specify/features/site-shell/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."_

## Format & rules (apply to every task)

- **Task heading:** `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task.
- **Stories:** **US1** recruiter skims · **US2** poster-first hero · **US3** project teardown · **US4** no WebGL / no JS · **US5** keyboard + screen reader + reduced motion · **US6** numbers (perf) · **US7** nothing else breaks.
- **One task = one integration seam + one executable check.** A task is done only when its check exits 0 and the output is pasted into the report and saved to `evidence/`.
- **Worktree:**
  - Each task runs in a fresh worktree from `task/s10-site-shell`, on branch `task/s10-t0NN-<slug>`.
  - After the check passes, merge back into the slice branch without squashing.
  - Commit message: `S10/T0NN: <title>`.
  - Remove the worktree only after the merge.
- **Orchestrator-only steps (⚑):** `git push`, opening/updating the PR, the regression-proof commits, merging the PR (only on Murphy's command). Flash prepares; the orchestrator executes.
- **Guards (every task):** `bash .specify/features/site-shell/guards.sh` must print every `…-OK` line (plan.md "Guards").
- **Every check ends with:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Scanner upkeep (every task that adds an `apps/web` source file):** add it to an `S10_SOURCE_FILES` list in `apps/web/test/no-color-literals.test.ts` and `no-motion-literals.test.ts` (create the list on first use, same shape as the S7/S8 lists, asserted with `arrayContaining`).
- **Never:**
  - Frozen and sealed code: edit `packages/xploder/src/**` or `packages/xploder/package.json`; edit `apps/web/app/dev/**`, `apps/web/app/fixtures/**` or `apps/web/test/xploder-dom/**`; edit the S8 tools (`a11y-axe.ts`, `a11y-probe.ts`, `engine-probe.ts`, `panel-probe.ts`, `presentation-snapshot.ts` and their CLIs). Importing their exports is fine.
  - Frozen inputs: edit `.specify/slices/**`, `.specify/KICKOFF*.md` or `.specify/content/**`; hand-edit `content/projects/websocket-inspector.source.ts` (regenerate it instead).
  - Production imports: import `xploder/fixtures` or deep `xploder/src/**` from production code; import `three` or `@react-three/*` in the app; import `xploder/react` anywhere except `components/viewer/live-viewer.tsx` (R2).
  - Literals: motion literals (durations, easings, staggers, timer delays, CSS `transition` timings) or `setTimeout`/`setInterval` anywhere in `apps/web`; colour literals (hex/`rgb()`/`hsl()`); hard-coded project strings (names, taglines, story text) outside the generated module.
  - Forbidden strings (C3): the dev route paths (`dev/engine`, `fps-calibration`) anywhere in site code.
  - Out of scope: OG images, `openGraph`/`twitter` metadata, analytics, third-party scripts or embeds, a contact form, `target="_blank"`, API routes or route handlers.
  - a11y anti-patterns: a positive `tabIndex`; `aria-hidden` on a node containing a focusable element (except the ⚑ T017 regression commit).
  - Perf: compare fps to a literal number; add a threshold override to any CLI; set `PERF_FIXTURES` on Vercel.
  - Hygiene: private hostnames, IPs or tokens anywhere (`127.0.0.1` is fine); run `specify init`; use bare `git stash`.
- **Evidence** goes to `.specify/features/site-shell/evidence/T0NN-*.{txt,png,json,md}` (naming per `.specify/EVIDENCE.md` §4). Throwaway scripts live in `/tmp/s10-checks/`. Run `mkdir -p /tmp/s10-checks .specify/features/site-shell/evidence` first, and run every check under `set -euo pipefail`.
- **Dev server** (visual smoke): `pnpm --filter web dev`, then use `http://localhost:3000` (not `127.0.0.1`: Next 16 dev blocks `/_next` for that origin). Smoke scripts load Playwright via `createRequire('<repo>/tools/perf/package.json')('playwright')` and exit non-zero on any failed assertion.
- **Static export server:** `pnpm build && (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid)`. Wait with `until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done` and stop with `kill "$(cat /tmp/s10-checks/serve.pid)"`. From T014 on, the CLIs take `--serve <dir>` instead.
- **Every visual task** attaches `screenshot-mobile` + `screenshot-desktop`, in light **and** dark, + `meta` (via `pnpm evidence <url> --color-scheme <s> --out …` or a smoke script that writes meta).

---

## Phase G1: Foundations (US1, US7) → STOP for Murphy after T004

### T001 [US7] S8 frozen manifest (seal) + negative control

- **Seam:** S8 surface ↔ CI (fifth hash manifest).
- **Files:**
  - `packages/xploder/test/frozen-surface.s8.paths`: the S8 seal list from plan.md "Guards", one path per line.
  - `packages/xploder/test/frozen-surface.generate-s8.sh`: a copy of `frozen-surface.generate-s7.sh` with `base=99a94f2`, the S8 file names and the plan.md note. Run it to produce `frozen-surface.s8.manifest.json`.
  - `packages/xploder/test/frozen-surface.test.ts`: **append** `describe('frozen S8 surface', …)` (same shape as the S7 block). It asserts `base === '99a94f2'`, the exact note, ≥ 16 entries, and the presence of `src/a11y/navigator.ts`, `src/react/a11y/LiveRegion.tsx`, `src/react/TeardownViewer.tsx`, `src/react/panel/PanelLayer.tsx` and `test/a11y-navigator.test.ts`. Existing describes are not modified.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s10-checks .specify/features/site-shell/evidence
  bash packages/xploder/test/frozen-surface.generate-s8.sh | tee /tmp/s10-checks/t001.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts 2>&1 | tee -a /tmp/s10-checks/t001.txt
  printf ' ' >> packages/xploder/src/a11y/navigator.ts
  if pnpm --filter xploder exec vitest run test/frozen-surface.test.ts >/tmp/s10-checks/t001-neg.txt 2>&1; then echo 'NEG-CONTROL-FAILED'; exit 1; fi
  git checkout -- packages/xploder/src/a11y/navigator.ts; echo 'S8 negative control: red as expected' | tee -a /tmp/s10-checks/t001.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (generator output, test log, negative control, all guards incl. `SURFACE-S8-OK`, manifest entry count).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; the negative control shows the S8 guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the S8 list in plan.md).

### T002 [US1] Content converter + generated module + fidelity test

- **Seam:** canonical JSON ↔ `apps/web/content` (build-time validated data).
- **Files:**
  - `apps/web/scripts/convert-content.ts` (plan.md "Content pipeline"; Node 24 type-stripping; `--check`).
  - `apps/web/package.json`: script `"content:convert": "node scripts/convert-content.ts"`.
  - `apps/web/content/tech-registry.ts`: `SITE_REGISTRY = defineTechRegistry({ schemaVersion: 1, techs: [...] })`. It holds exactly kotlin, android, coroutines, jetpack-compose, room and websocket, with the labels/categories of the same ids in `packages/xploder/test/fixtures/tech-registry.json` (copied values, not imported).
  - `apps/web/content/projects/websocket-inspector.source.ts`: **generated** by running the converter (C1: `satisfies ProjectInput`; R7: sha header).
  - `apps/web/content/projects/websocket-inspector.ts`: `defineProject(...)`.
  - `apps/web/test/content-fidelity.test.ts`: plan.md (a)–(e).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s10-checks
  pnpm --filter web content:convert --check 2>&1 | tee /tmp/s10-checks/t002.txt
  pnpm --filter web exec vitest run test/content-fidelity.test.ts --reporter verbose 2>&1 | tee -a /tmp/s10-checks/t002.txt
  sha256sum .specify/content/websocket-inspector.json 2>/dev/null || shasum -a 256 .specify/content/websocket-inspector.json | tee -a /tmp/s10-checks/t002.txt
  head -3 apps/web/content/projects/websocket-inspector.source.ts | tee -a /tmp/s10-checks/t002.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-content-fidelity.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; strict equality + `--check` + sha).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the fixture registry's labels, e.g. "Kotlin Coroutines", "Jetpack Compose").

### T002b [US1] Site copy converter + generated module + fidelity test (RFC §9.5 C4)

- **Seam:** canonical `.specify/content/site.json` ↔ `apps/web/content/site.source.ts`.
- **Files:**
  - `apps/web/scripts/convert-content.ts`: generalise to a list of `{ source, target, exportName, typeImport }` entries. `websocket-inspector.json` → `projects/websocket-inspector.source.ts` (unchanged output); `site.json` → `site.source.ts` (`export const siteSource = { … } satisfies SiteCopy;`, header with sha256). `--check` covers both.
  - `apps/web/content/site-copy.ts`: `export interface SiteCopy`. A strict TS shape of `site.json` (identity incl. `links[].url: string | null`, hero CTAs, about paragraphs, projects, footer, meta).
  - `apps/web/test/site-copy-fidelity.test.ts`: strict equality with `JSON.parse(site.json)`, `--check` exit 0, sha stamp, negative control.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web content:convert --check 2>&1 | tee /tmp/s10-checks/t002b.txt
  pnpm --filter web exec vitest run test/site-copy-fidelity.test.ts test/content-fidelity.test.ts --reporter verbose 2>&1 | tee -a /tmp/s10-checks/t002b.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t002b.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002b-OK
  ```
- **Evidence:** `evidence/T002b-log-site-copy-fidelity.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing for this task (Q14 is only consumed by T006).

### T003 [US1] Project index + card model + production-import guards

- **Seam:** parsed project ↔ UI models (`cardModel`, `getProject`) + source scanners.
- **Files:**
  - `apps/web/content/projects/index.ts` (plan.md "Content pipeline" 3).
  - `apps/web/test/content-model.test.ts`: the websocket-inspector chips are exactly `['kotlin','android','coroutines','jetpack-compose']` with labels from the registry; a synthetic project covers the tie-break (first appearance), the cap (≤ 4 with 6 techs) and fewer than 4 techs; `getProject('nope') === undefined`; `PROJECT_SLUGS` equals `['websocket-inspector']`.
  - `apps/web/test/prod-imports.test.ts`: no file under `app/` (excluding `*.fixture.tsx` and `app/dev/**`, `app/fixtures/**`), `components/`, `content/` or `scripts/` imports `xploder/fixtures`. A negative control runs on a sample string.
  - `apps/web/test/no-hand-copied-content.test.ts`: collects the JSON's meta name/tagline/summary, story texts, and layer + component names and summaries. It asserts that none appears as a string literal or JSX text in `app/` or `components/`, and that the only `content/` file containing them is the generated `.source.ts`. A negative control runs on a sample.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web exec vitest run test/content-model.test.ts test/prod-imports.test.ts test/no-hand-copied-content.test.ts --reporter verbose 2>&1 | tee /tmp/s10-checks/t003.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-content-model.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; you see the chips on the card at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q4 rule, Kotlin · Android · Kotlin Coroutines · Jetpack Compose).

### T004 [US7] CLS carry-over fix (`ThemeToggle` box) + site-probe `cls` group

- **Seam:** `ThemeToggle` mount ↔ layout (`/dev/engine` control row; future nav).
- **Files:**
  - `apps/web/app/theme-toggle.tsx`: one `const BOX = 'inline-flex h-11 w-11 shrink-0 items-center justify-center align-middle'` used by **both** the placeholder (`<span aria-hidden="true" className={BOX} />`) and the button (`className={`${BOX} rounded-full …`}`). Nothing else changes: labels, storage, the media listener, the icons.
  - `tools/perf/src/site-probe.ts` + `tools/perf/src/cli/site-probe.ts`: the CLI skeleton (args, `--serve <dir>`, `--fixtures <dir>`, `--group`, `--out`, exit codes per EVIDENCE.md) with the **`cls` group**. It runs the buffered `layout-shift` observer from navigation to readiness (`[data-xploder-ready="true"]` where a viewer exists, else `load`) + 3 s, counting every entry (including `hadRecentInput`) and recording sources. It runs for desktop 1280×800 and mobile 412×823, light and dark. The routes are those of the served export (from T008 on `/`, `/projects`, `/projects/websocket-inspector`), plus `/dev/engine?fixture=a` when `--fixtures` is given. Output: `cls.json` + log lines `cls <route> <viewport> <palette> total=<v> PASS|FAIL`.
  - `tools/perf/test/site-probe.test.ts`: the shift-summation helper on recorded entries (0 → PASS; any positive → FAIL with sources).
  - Root `package.json`: `"site:probe": "node tools/perf/src/cli/site-probe.ts"`.
- **Check** (browser, sandbox off):
  ```sh
  set -euo pipefail
  git worktree add /tmp/s10-base 99a94f2 && (cd /tmp/s10-base && pnpm install --frozen-lockfile && pnpm build:fixtures)
  pnpm site:probe --fixtures /tmp/s10-base/out-fixtures --group cls --out /tmp/s10-checks/t004-before 2>&1 | tee /tmp/s10-checks/t004.txt || true   # expected FAIL (before)
  git worktree remove --force /tmp/s10-base
  pnpm build:fixtures
  pnpm site:probe --fixtures out-fixtures --group cls --out /tmp/s10-checks/t004-after 2>&1 | tee -a /tmp/s10-checks/t004.txt   # must exit 0
  pnpm --filter perf-tools exec vitest run test/site-probe.test.ts 2>&1 | tee -a /tmp/s10-checks/t004.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-cls-carryover.txt` (before total ≈ 0.000637 desktop / 0.000043 mobile with sources → after 0 in all four cells), `evidence/T004-cls-after.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: on `pnpm dev`, reload `/dev/engine` and watch the control row. Nothing jumps (default: trust the before/after log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: source fix per D10).

**G1 STOP:** integrate, run guards + `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → `evidence/G1-log-gate.txt`, then report to Murphy.

---

## Phase G2: Site UI (US1–US5) → STOP for Murphy after T012

### T005 [US2] Poster geometry (R1) + `TeardownPoster`

- **Seam:** `xploder/layout` (`layoutProject`, `VIEW`) ↔ server SVG.
- **Files:** `apps/web/content/poster.ts` (pure `posterGeometry(project, state)`), `apps/web/components/teardown-poster.tsx` (server; props `project`, `state='exploded'`, `className`), `apps/web/test/poster.test.ts` (plan.md "Poster": identity ε 1e-9, symmetric `viewBox`, `fitZoom` parity, painter order, 21 slabs).
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web exec vitest run test/poster.test.ts --reporter verbose 2>&1 | tee /tmp/s10-checks/t005.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-poster.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: you see the poster at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: R1 framing).

### T006 [P] [US1] Site chrome: `(site)` layout, nav, footer, skip link, root metadata

- **Seam:** route group ↔ chrome (`/` moves into `(site)`).
- **Files:**
  - `apps/web/content/site.ts` (**RFC §9.5 C4 + Q14 supersede §9.1**): `SITE` derived from `siteSource` (T002b): identity, hero, about, footer, meta. There is no hand-written copy and no override (Q14 resolved in `site.json`, RFC §9.6).
  - `apps/web/components/{skip-link,site-nav,site-footer}.tsx` (plan.md "Routes, metadata, nav"; R4).
  - `apps/web/app/(site)/layout.tsx`.
  - `apps/web/app/layout.tsx`: the metadata change only.
  - Move `app/page.tsx` → `app/(site)/page.tsx`. Its content stays the S1 placeholder for now; T008 rewrites it.
  - `apps/web/test/package-consumer.test.ts` (C2): change `PAGE` to `app/(site)/page.tsx` + **append** a describe that scans `components/`, `content/` and `scripts/` with the same rules.
- **Check** (browser smoke on the export, sandbox off):
  ```sh
  set -euo pipefail
  pnpm build && (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid)
  until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  node /tmp/s10-checks/t006-smoke.mjs http://127.0.0.1:4310/ 2>&1 | tee /tmp/s10-checks/t006.txt
  #   asserts: <title> = site.json meta.title (per Q14); nav one row at 360/412/1280 px (nav height = one target row);
  #   the 8 nav items in order with names; every target ≥ 44×44; skip link first Tab stop and moves focus to #main;
  #   Résumé accessible name contains '(PDF)'; no target=_blank anywhere; footer has mailto + GitHub + LinkedIn;
  #   writes screenshots light/dark × 360/1280 + meta.json to .specify/features/site-shell/evidence/T006-*
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-log-chrome.txt`, `T006-screenshot-{mobile,desktop}-{light,dark}.png`, `T006-meta.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: the nav reads well on your phone width; the name/role are right (default: as answered at Gate 1).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the about draft; you edit it at G2).

### T007 [US1] Server content components: card, chips, outline, about (R10)

- **Seam:** `cardModel` / `Project` ↔ server components.
- **Files:**
  - `apps/web/components/project-card.tsx`: `variant: 'compact' | 'list'`; stretched-link name; `data-site-card`; the list variant adds a poster thumbnail (`aria-hidden`), year · role, summary, and a "Source" link raised above the stretched link.
  - `tech-chip-list.tsx`: `<ul aria-label="Tech">`; each chip = label + visually hidden `, <category>` + a colour dot `bg-tech-<category>`.
  - `project-outline.tsx`: story headline/problem/approach/outcome; metrics as a `<dl>`; layers → components `<ul>` with name + summary; optional `message` with `role="status"`; `data-site-outline`.
  - `about-strip.tsx`.
  - `apps/web/test/server-components.test.ts` (R10): these four files + `teardown-poster.tsx` have no `'use client'`.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web exec vitest run test/server-components.test.ts --reporter verbose 2>&1 | tee /tmp/s10-checks/t007.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t007.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-components.txt` (screenshots come with T008).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: seen at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q13 thumbnails on `/projects` only).

### T008 [US1] Landing (static hero shell) + `/projects` + 404 + metadata

- **Seam:** routes ↔ components (no 3D yet).
- **Files:**
  - `app/(site)/page.tsx`: rewritten. Hero shell per plan.md "Hero" (the `HeroLive` slot renders an empty `data-site-live` div until T009), cards section (`compact`), `<AboutStrip/>`.
  - `app/(site)/projects/page.tsx` (`list` cards, metadata).
  - `app/not-found.tsx` (R6).
  - `apps/web/test/site-metadata.test.ts`: the root default/template, the `/projects` metadata, and `generateMetadata` for the slug (from T010; until then it is `test.todo`).
- **Check** (export smoke, sandbox off):
  ```sh
  set -euo pipefail
  pnpm build && (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid)
  until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  node /tmp/s10-checks/t008-smoke.mjs http://127.0.0.1:4310 2>&1 | tee /tmp/s10-checks/t008.txt
  #   asserts: / has hero poster svg inside [data-site-hero], card 'Scarlet Inspector' + tagline + 4 chips;
  #   nav Projects → /projects in one click; /projects card href /projects/websocket-inspector;
  #   /projects/nope → status 404 + 'Page not found' + cards; JS-disabled context shows poster + cards on /;
  #   writes screenshots light/dark × mobile/desktop for / and /projects + meta
  pnpm site:probe --serve apps/web/out --group cls 2>&1 | tee -a /tmp/s10-checks/t008.txt     # strict 0 on / and /projects
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-pages.txt`, `T008-screenshot-{home,projects}-{mobile,desktop}-{light,dark}.png`, `T008-meta.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: the home layout and the `/projects` list (default: as screenshotted).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T009 [US2] Live hero: `LiveViewer` + `HeroLive` gate + `HeroStage` reveal

- **Seam:** server poster ↔ lazily loaded live viewer (D5, R2, R3).
- **Files:**
  - `apps/web/components/viewer/live-viewer.tsx` (the only `xploder/react` import).
  - `components/hero/hero-live.tsx` (gate per plan.md "Hero"; `data-site-live-state`).
  - `components/hero/hero-stage.tsx`.
  - `app/(site)/page.tsx`: renders `<HeroLive/>` in the slot.
  - `apps/web/test/site-motion-matrix.test.ts`: rows `hero-reveal` (twin: never mounts), `poster-fade` (twin: none), `card-hover` (colour only, no transform/transition of layout properties). It asserts every row names a twin, and that the only transition in `components/` uses `var(--motion-…panel-enter)` variables.
- **Check** (export smoke, sandbox off):
  ```sh
  set -euo pipefail
  pnpm build && (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid)
  until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  node /tmp/s10-checks/t009-smoke.mjs http://127.0.0.1:4310/ 2>&1 | tee /tmp/s10-checks/t009.txt
  #   asserts: SSR bytes contain [data-site-poster] inside [data-site-hero]; at FCP (paint observer) live state != revealed;
  #   state reaches 'revealed' after load; then 5 s idle: data-xploder-state stays 'exploded', tweening 'false';
  #   reducedMotion 'reduce' → state 'skipped', no <canvas>, document.getAnimations().length === 0 over 2 s;
  #   WebGL stubbed off → poster visible, no page errors; one <canvas> max; live layer is inert;
  #   screenshots: poster-only (reduced) + revealed, light/dark × mobile/desktop + meta
  pnpm site:probe --serve apps/web/out --group cls 2>&1 | tee -a /tmp/s10-checks/t009.txt     # strict 0 incl. reveal
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t009.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-hero.txt`, `T009-screenshot-hero-{revealed,reduced}-{mobile,desktop}-{light,dark}.png`, `T009-meta.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: reload `/` a few times. The drawing appears immediately and the live view replaces it without a jump; with reduced motion on (macOS setting) it stays a drawing (default: as evidenced).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (defaults Q1 inert, Q2 at rest, Q3 exploded, Q7 crossfade).

### T010 [US3] `/projects/[slug]`: static params, 404, metadata, header, workbench shell + `<noscript>`

- **Seam:** module slugs ↔ static export routes.
- **Files:**
  - `app/(site)/projects/[slug]/page.tsx`: `generateStaticParams`, `dynamicParams = false`, `generateMetadata`, `notFound()`, header (back link, `h1`, tagline, year · role, `meta.links`).
  - `components/workbench/workbench.tsx`: shell per plan.md "Workbench"; `WorkbenchLoader` renders nothing yet.
  - `site-metadata.test.ts`: the slug case becomes a real test.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm build 2>&1 | tee /tmp/s10-checks/t010-build.txt
  test -f apps/web/out/projects/websocket-inspector.html && ! ls apps/web/out/projects | grep -v -e '^websocket-inspector' -e '^index' && echo ONLY-KNOWN-SLUG
  grep -c 'data-site-poster' apps/web/out/projects/websocket-inspector.html; grep -c 'data-site-outline' apps/web/out/projects/websocket-inspector.html   # outline inside <noscript>
  (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4310/projects/does-not-exist)" = 404 && echo UNKNOWN-404
  test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4310/projects/websocket-inspector)" = 200 && echo DEEP-LINK-200
  node /tmp/s10-checks/t010-smoke.mjs http://127.0.0.1:4310/projects/websocket-inspector 2>&1 | tee /tmp/s10-checks/t010.txt
  #   asserts: <title> 'Scarlet Inspector · <siteName per Q14>', description = tagline; JS-disabled: poster + outline visible, loading/toolbar hidden;
  #   screenshots nojs light/dark × mobile/desktop + meta
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T010-OK
  ```
- **Evidence:** `evidence/T010-log-route.txt` (build route list, 404/200, metadata, raw HTML counts), `T010-screenshot-nojs-project-{mobile,desktop}-{light,dark}.png`, `T010-meta.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: seen at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T011 [US3] Workbench client: viewer + panels + toolbar + tour + case study + no-WebGL fallback (R2)

- **Seam:** `LiveViewer` ↔ project route (full teardown).
- **Files:**
  - `components/workbench/workbench-loader.tsx` (`dynamic`, `ssr:false`).
  - `components/workbench/workbench-client.tsx` (plan.md "Workbench").
  - `workbench.tsx`: wires the loader.
- **Check** (export smoke, sandbox off):
  ```sh
  set -euo pipefail
  pnpm build 2>&1 | tee /tmp/s10-checks/t011-build.txt
  grep -l 'WebGLRenderer' apps/web/out/_next/static/chunks/*.js | tee /tmp/s10-checks/t011-chunks.txt; test "$(wc -l < /tmp/s10-checks/t011-chunks.txt)" -eq 1 && echo ONE-3D-CHUNK   # R2
  (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  node /tmp/s10-checks/t011-smoke.mjs http://127.0.0.1:4310/projects/websocket-inspector 2>&1 | tee /tmp/s10-checks/t011.txt
  #   asserts: viewer ready + exploded at load (no tween); toolbar buttons present in order; Case study → aria-expanded true + panel ready;
  #   Step → data-xploder-tour paused step 1; flow selector shows 2 flows; Implode toggles state; stage + toolbar rects identical before/after hydration;
  #   WebGL stubbed off → outline + message inside the stage, stage rect unchanged; one <canvas>;
  #   screenshots exploded / case study / tour step, light/dark × mobile/desktop + meta
  pnpm site:probe --serve apps/web/out --group cls 2>&1 | tee -a /tmp/s10-checks/t011.txt     # strict 0 on all three routes
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t011.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T011-OK
  ```
- **Evidence:** `evidence/T011-log-workbench.txt`, `T011-screenshot-{exploded,case-study,tour}-{mobile,desktop}-{light,dark}.png`, `T011-meta.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. At G2: open the project page, explode/implode, rotate, zoom, play the tour, open the case study, click parts (default: as evidenced).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q12, no layer-focus row).

### T012a [US3, US5] G2 feedback: control dock + Guided tour panel + pause-on-implode (RFC §9.7 D6a/D6b)

- **Seam:** viewer handle ↔ the redesigned workbench controls (app only; engine unchanged).
- **Files:**
  - `components/workbench/workbench.tsx`: the server shell reserves fixed-height rows for the dock (2 rows < sm, 1 row ≥ sm) and the tour card; the `<noscript>` style hides both.
  - `components/workbench/workbench-client.tsx`: the dock + tour panel (split into `workbench-dock.tsx` and `tour-panel.tsx` if clearer).
  - `components/workbench/tour-model.ts`: pure. Steps from `project.flows` + component names/summaries; the jump sequence; unit-tested in `apps/web/test/tour-model.test.ts`.
- **Check:** export smoke (port 4310). It asserts:
  - the dock fits without horizontal overflow at 360/412/1280;
  - each button has an accessible name;
  - Explode/Implode toggles `data-xploder-state`;
  - Start tour → `data-xploder-tour=playing`; **Implode while playing → tour `paused` and state `imploded`**;
  - Next/Prev move the step;
  - clicking rail chip k → step k (playing stays playing, paused stays paused);
  - hovering a chip → `data-xploder-highlight` = that id;
  - the route chooser switches the flow;
  - stage/dock/tour rects are identical before and after hydration;
  - `site:probe --group cls` strict 0;
  - screenshots (dock idle, tour playing, mobile + desktop, light + dark) + meta.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Play with the dock and the tour on `pnpm dev` (default: as screenshotted).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Q15 flow labels (default: content labels + descriptions).

### T012b [P] [US1] G2 feedback: header + footer redesign, Résumé removed (RFC §9.7 D12a)

- **Seam:** site chrome ↔ `site.json`.
- **Files:** `components/site-nav.tsx`, `components/site-footer.tsx`, `components/icons.tsx` (GitHub mark, LinkedIn, mail; `aria-hidden`), `apps/web/public/resume.pdf` (deleted).
- **Check:** export smoke (port 4320). It asserts:
  - the nav is one line with **no horizontal overflow** at 360/412/1280;
  - items in order with names;
  - targets ≥ 36×44;
  - no `/resume.pdf` link anywhere and `/resume.pdf` → 404;
  - the footer has `id=contact` + mailto + GitHub + LinkedIn;
  - `site:probe --group cls` strict 0;
  - screenshots of header + footer at 360/1280, light + dark.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Header/footer look (default: as screenshotted).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Nothing.

### T012d [US3, US5] G2 feedback round 2: poster hit-through, Exit tour, route header, explode-before-step (RFC §9.8)

- **Seam:** workbench/hero app code (engine unchanged).
- **Files:**
  - `components/hero/hero-classes.ts` (poster: `pointer-events-none`; `invisible` once revealed);
  - `components/workbench/workbench.tsx`;
  - `components/workbench/tour-panel.tsx`, `tour-model.ts` (route title = first → last component name + step count; description; single-flow header; Exit tour);
  - `components/workbench/workbench-client.tsx` (explode-before-step/prev/jump; Exit tour → `stop()`);
  - `apps/web/test/tour-model.test.ts`.
- **Check:** export smoke (port 4310). It asserts:
  - after reveal, `elementFromPoint` at the stage centre is inside `[data-xploder-ready]` (not the poster), on the project page and the hero;
  - hovering over a slab sets `data-xploder-highlight` and draws a leader (`[data-xploder-overlay]` leader stroke present);
  - clicking a slab opens the detail panel;
  - at max zoom, a wheel over the stage changes the viewer stage `scrollTop`;
  - Start tour → Exit tour → `data-xploder-tour=idle` and `data-xploder-overlay=shown`;
  - imploded + Next → `exploded` and step 1; imploded + rail chip 3 → `exploded` and step 3;
  - the route options show "<first> → <last>" + "<n> steps" and no flow label text;
  - a synthetic single-flow model renders a header without a chooser (unit test);
  - strict CLS 0 (`site:probe --group cls`);
  - screenshots (tour panel idle/playing, mobile + desktop, light + dark).
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Hover/click parts, scroll at max zoom, Exit tour, step while imploded (default: as screenshotted).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Q16 (tour trail callouts): (A) brief revision or (B) defer (default B).

### T012e [US3] Q16 (A): S6 overlay "tour trail" + re-seal (RFC §9.9 D14)

- **Seam:** S6 overlay model ↔ tour state (sealed surface, Murphy-authorised revision).
- **Files:**
  - `packages/xploder/src/overlay/model.ts`: the additive trail (D14);
  - `packages/xploder/test/overlay-tour-trail.test.ts` (new): fixture A in a columns viewport; tour playing step 0 → exactly 1 part label + 1 leader, the label emphasised; step 3 → 4 labels in path order, 4 leaders, only the last emphasised; paused keeps the trail; unknown flowId → empty; narrow (non-columns) → empty; idle → unchanged base model (deep-equals the idle `overlayStateModel` without tour fields);
  - `packages/xploder/test/frozen-surface.generate-s6.sh` (base → the T012e source commit, note += revision), regenerated `frozen-surface.s6.manifest.json`, `frozen-surface.test.ts` S6 block (base + note);
  - `.specify/features/site-shell/guards.sh` (S6 base; XPLODER-SRC-OK = only `src/overlay/model.ts` differs from `99a94f2`);
  - `evidence/Q16-revision-note.md` (for Merlin).
- **Check:** xploder tests green (all, incl. `overlay-model.test.ts` unchanged); S6 negative control red; guards OK; export smoke on the project route (port 4320): Start tour → the overlay is shown with 1 part label + leader, then Next ×2 → 3 labels + 3 leaders, the latest emphasised; Exit/stop → full idle overlay back; screenshots of the tour trail (desktop, light + dark).
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Play the tour and watch the names build up on the right (default: as screenshotted).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Send `evidence/Q16-revision-note.md` to Merlin after S10 (agreed).

### T012f [US3] G2 feedback round 3: centred tour transport + portal-target race fix (RFC §9.10)

- **Seam:** workbench client portals ↔ server shell boxes; tour transport UI.
- **Files:** `components/workbench/workbench-client.tsx` (portal targets after commit, scoped + retry), `components/workbench/tour-panel.tsx` (centred transport cluster incl. Exit tour), `apps/web/test/tour-model.test.ts` (if markup tests change).
- **Check:** export smoke (port 4310) + dev smoke (`pnpm --filter web dev` on port 3100, `http://localhost:3100`). Each asserts:
  - 10× cycle: load `/`, click the hero primary CTA (soft nav) → the dock has ≥ 6 buttons and the tour panel has the Start control; `goBack` → `/`; `goForward` → the project route, dock + tour present;
  - 5× `reload` on the project route → dock + tour present;
  - direct load of the project route → present;
  - while playing, the transport cluster is horizontally centred within the tour card (|centre delta| ≤ 2 px) at 360/1280, Exit tour sits inside the cluster, and Exit tour → idle;
  - strict CLS 0 (`site:probe --group cls` on the export).
  - Screenshots: tour playing (mobile + desktop, light + dark).
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Refresh and navigate repeatedly; the menus are always there. 2. The new centred transport (default: as screenshotted).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. G2 verdict.

### T012c [US1–US5] G2 evidence refresh

- **Seam:** evidence only. It re-runs T012's bundle after T012a/T012b (`T012c-*`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. G2 click-through again.
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. G2 verdict.

### T012 [US1–US5] G2 visual evidence bundle + poster/live parity info

- **Seam:** the whole site ↔ the evidence CLI (pre-gate visual record).
- **Files:** none in source. Evidence only. Flash runs the commands; the orchestrator reviews.
- **Check** (sandbox off):
  ```sh
  set -euo pipefail
  pnpm build && (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  for r in '' projects projects/websocket-inspector; do for s in light dark; do
    pnpm evidence "http://127.0.0.1:4310/$r" --color-scheme "$s" --runs 1 --out "/tmp/s10-checks/t012/${r//\//-}-$s"; done; done
  node /tmp/s10-checks/t012-iou.mjs http://127.0.0.1:4310/ 2>&1 | tee /tmp/s10-checks/t012.txt   # poster vs first live frame silhouette IoU (information, R1)
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t012.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T012-OK
  ```
- **Evidence:** `evidence/T012-screenshot-<route>-{mobile,desktop}-{light,dark}.png`, `T012-lighthouse-summary-<route>.json` (single-run sanity, not the gate), `T012-log-parity.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Click through on `pnpm dev` in Orca's browser: nav, hero, cards, `/projects`, project page, 404, both themes, reduced motion (default: approve as screenshotted).
  2. Edit or approve the about text in `apps/web/content/site.ts` (default: the draft).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G2 verdict (default: none; the orchestrator waits).

**G2 STOP:** integrate, guards + full suite + build → `evidence/G2-log-gate.txt`; start `pnpm dev` + an Orca browser tab for Murphy's click-through.

---

## Phase G3: Gates (US4–US7) → STOP for Murphy after T017

### T013 [US5] Site axe module + CLI + tests

- **Seam:** production export ↔ axe-core (`site-axe.ts`, reusing `AXE_TAGS`/`verdict` from `a11y-axe.ts`).
- **Files:** `tools/perf/src/site-axe.ts`, `tools/perf/src/cli/a11y-axe-site.ts`, `tools/perf/test/site-axe.test.ts`, root `package.json` script `"a11y:axe:site"` (plan.md "Tools").
- **Check** (sandbox off):
  ```sh
  set -euo pipefail
  pnpm --filter perf-tools exec vitest run test/site-axe.test.ts --reporter verbose 2>&1 | tee /tmp/s10-checks/t013.txt
  pnpm build && pnpm a11y:axe:site --serve apps/web/out --out /tmp/s10-checks/t013-axe 2>&1 | tee -a /tmp/s10-checks/t013.txt
  pnpm a11y:axe:site --help >/dev/null && echo HELP-OK
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t013.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T013-OK
  ```
- **Evidence:** `evidence/T013-log-axe-site.txt` (per-cell counts, 0 serious / 0 critical), `T013-axe-site-summary.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the summary).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the state list in plan.md).

### T014 [P] [US2–US7] Site probe: remaining groups + tests

- **Seam:** production export ↔ the probe (`drill`, `hero`, `reduced-motion`, `nojs`, `routes`, `draws`; R5, R9).
- **Files:** `tools/perf/src/site-probe.ts` (+ groups), `tools/perf/src/cli/site-probe.ts` (`--ci`), `tools/perf/test/site-probe.test.ts` (tab-walk verdict via `evaluateTabWalk`, draw-count mode on recorded per-frame counts, HTML assertions on fixture strings).
- **Check** (sandbox off):
  ```sh
  set -euo pipefail
  pnpm --filter perf-tools exec vitest run test/site-probe.test.ts --reporter verbose 2>&1 | tee /tmp/s10-checks/t014.txt
  pnpm build && pnpm build:fixtures
  pnpm site:probe --serve apps/web/out --fixtures out-fixtures --out /tmp/s10-checks/t014-probe 2>&1 | tee -a /tmp/s10-checks/t014.txt   # all groups, exit 0
  pnpm site:probe --serve apps/web/out --ci --out /tmp/s10-checks/t014-ci 2>&1 | tail -5 | tee -a /tmp/s10-checks/t014.txt
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t014.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T014-OK
  ```
- **Evidence:** `evidence/T014-log-site-probe.txt` (every group PASS; drill steps; draws = 2; strict CLS 0 incl. the soft navigation).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T015 [P] [US6] Lighthouse `--categories` + `A11Y_MIN_SCORE` + tests

- **Seam:** Lighthouse gate ↔ the accessibility category (F3, Q11).
- **Files:** `tools/perf/src/budgets.ts` (`A11Y_MIN_SCORE = 0.95`), `tools/perf/src/lighthouse.ts` (additive assertion), `tools/perf/src/cli/lighthouse-gate.ts` (`--categories`; default `performance` unchanged), `tools/perf/test/lighthouse.test.ts` (append: parse, unknown category → exit 2, a11y assertion pass/fail on synthetic LHRs, default behaviour unchanged).
- **Check** (sandbox off for the live run):
  ```sh
  set -euo pipefail
  pnpm --filter perf-tools exec vitest run test/lighthouse.test.ts --reporter verbose 2>&1 | tee /tmp/s10-checks/t015.txt
  pnpm build && (node tools/perf/src/cli/serve.ts --dir apps/web/out --port 4310 & echo $! > /tmp/s10-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4310/; do sleep 0.5; done
  pnpm perf:lighthouse http://127.0.0.1:4310/ --categories performance,accessibility --out /tmp/s10-checks/t015-home 2>&1 | tee -a /tmp/s10-checks/t015.txt
  pnpm perf:lighthouse http://127.0.0.1:4310/projects/websocket-inspector --categories performance,accessibility --out /tmp/s10-checks/t015-project 2>&1 | tee -a /tmp/s10-checks/t015.txt
  kill "$(cat /tmp/s10-checks/serve.pid)"
  bash .specify/features/site-shell/guards.sh | tee -a /tmp/s10-checks/t015.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T015-OK
  ```
- **Evidence:** `evidence/T015-log-lighthouse-flag.txt`, `T015-lighthouse-summary-{home,project}-local.json` (local, no CDN; the gate of record is CI on the preview).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing. A local budget miss escalates with the gate JSON per EVIDENCE.md §6; it is never retuned.

### T016 ⚑ [US6, US7] CI wiring (`perf.yml`) + push + draft PR

- **Seam:** repo ↔ GitHub Actions (plan.md "CI").
- **Files:** `.github/workflows/perf.yml` (additive steps + the new job), root `package.json` scripts (already added).
- **Check (⚑ orchestrator: push + PR):**
  ```sh
  set -euo pipefail
  bash .specify/features/site-shell/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && pnpm build
  git push -u origin task/s10-site-shell
  gh pr create --draft --base main --head task/s10-site-shell --title "S10: site shell — landing, project routes, recruiter mode" --body-file /tmp/s10-checks/pr-body.md
  gh pr checks --watch --fail-fast=false 2>&1 | tee /tmp/s10-checks/t016.txt   # every check green, incl. 'a11y: axe (production routes)'
  ```
- **Evidence:** `evidence/T016-ci.txt` (run URLs, the step log excerpts for both Lighthouse routes, both weight routes, the unknown-slug assert, the new job).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the draft PR; the Vercel preview renders (default: the run URLs).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Add `a11y: axe (production routes)` to the required checks in branch protection (answered "yes" at Gate 1).

### T017 ⚑ [US5, US7] Regression proof: broken app-only commit → red → revert → green

- **Seam:** the new CI job ↔ a deliberate serious violation (RFC D9).
- **Change:** commit `S10/T017: regression proof (deliberately broken)`, adding `aria-hidden="true"` to the `<nav aria-label="Primary">` in `components/site-nav.tsx` (focusable links inside → `aria-hidden-focus`, serious). Push, wait for the job to go red (exit 6), then `git revert` it. Push again, and the job goes green.
- **Check (⚑):** `gh run view <id> --log | grep -E 'axe|serious|exit'` for both runs.
- **Evidence:** `evidence/T017-ci-regression-proof.txt` (both run URLs, the violation summary, the green rerun).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the two run URLs).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G3 verdict (default: none; the orchestrator waits).

**G3 STOP:** guards + `gh pr checks` (all green) → `evidence/G3-log-gate.txt`.

---

## Phase G4: Evidence + ship (US1–US7) → STOP for Murphy after T019

### T018 [US1–US7] Evidence run (AC1–AC7 artifacts)

- **Seam:** the Vercel preview + the local export ↔ the evidence map (RFC §7).
- **Files:** evidence only.
- **Check** (sandbox off; `PREVIEW` = the PR's `vercel[bot]` URL):
  ```sh
  set -euo pipefail
  pnpm perf:lighthouse "$PREVIEW" --categories performance,accessibility --out /tmp/s10-checks/t018-lh-home
  pnpm perf:lighthouse "${PREVIEW}projects/websocket-inspector" --categories performance,accessibility --out /tmp/s10-checks/t018-lh-project
  pnpm perf:weight "$PREVIEW" --out /tmp/s10-checks/t018-w-home; pnpm perf:weight "${PREVIEW}projects/websocket-inspector" --out /tmp/s10-checks/t018-w-project
  pnpm build && pnpm build:fixtures
  pnpm a11y:axe:site --serve apps/web/out --out /tmp/s10-checks/t018-axe
  pnpm site:probe --serve apps/web/out --fixtures out-fixtures --out /tmp/s10-checks/t018-probe
  pnpm fps "${PREVIEW}projects/websocket-inspector" --out /tmp/s10-checks/t018-fps   # dropped frames, information (no fps literal in any check)
  node tools/perf/src/cli/assert-absent.ts "${PREVIEW}dev/engine"; node tools/perf/src/cli/assert-absent.ts "${PREVIEW}fixtures/fps-calibration"
  node tools/perf/src/cli/assert-absent.ts "${PREVIEW}projects/does-not-exist"
  test ! -e apps/web/public/resume.pdf && test "$(curl -s -o /dev/null -w '%{http_code}' "${PREVIEW}resume.pdf")" = 404 && echo RESUME-NOT-SERVED   # RFC §9.7.5
  bash .specify/features/site-shell/guards.sh | tee /tmp/s10-checks/t018-guards.txt
  git diff --stat 99a94f2 -- packages/xploder | tee /tmp/s10-checks/t018-xploder-diff.txt   # only test/frozen-surface.s8.* + frozen-surface.test.ts
  ```
  Copy the artifacts per EVIDENCE.md §4 (`T018-lighthouse-summary-{home,project}.json`, `T018-weight-{home,project}.json`, `T018-axe-site-*.json`, `T018-log-site-probe.txt`, `T018-screenshot-nojs-*`, `T018-fps.json`, `T018-log-guards.txt`, `T018-log-xploder-diff.txt`).
- **Evidence:** as listed, plus `T018-meta.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the artifacts feed T019).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. `apps/web/public/resume.pdf` if still missing (default: reported as the one open Murphy dependency).

### T019 ⚑ [US1–US7] AC self-check + PR ready for Murphy's validation

- **Seam:** evidence ↔ AC1–AC7 table.
- **Files:** `evidence/AC-selfcheck.md`: one row per AC with the artifact links and verdict, the kickoff Stage-3 list (fidelity test, hero CLS/LCP artifacts, recruiter-mode + no-JS screenshots, axe JSON ×4 combos, Lighthouse JSON ×2 routes, prod-404 re-check, CLS carry-over proof, frozen-surface diffs), and the tier that finished each task. Ledger complete.
- **Check (⚑):** `gh pr ready`; `gh pr checks` all green → `evidence/T019-ci.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation on the preview: phone (4G) + desktop, both themes, reduced motion, JS off, keyboard drill; the résumé link opens the PDF.
  2. The AC self-check table (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. `resume.pdf` in place (if not yet).
  2. The merge command (memory: merge only on Murphy's explicit "merge").
