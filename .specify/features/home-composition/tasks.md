# Tasks: S11.9 Home Composition

**Input:** `rfc.md` (approved at Gate 1: all §11 defaults; refinements R1–R5 in §13), `spec.md`, `plan.md` in `.specify/features/home-composition/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`).

- The **sandbox is off** for every task that builds, serves or launches Chromium (loopback is blocked in the Codex sandbox).
- Writes are limited to the task worktree and `/tmp/s119-checks`.
- Before each dispatch wave, probe with `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: pause, report, and offer top-up / orchestrator on "go" / split.
- **CI-side steps** (push, PR, reruns, artifact download) are done by the orchestrator, never by the executor.

**Escalation (kickoff Hard Rule 10):**

- Tier 1.5 is **DORMANT**, so it is skipped and recorded per task.
- If tier 1 is stuck ×2 on a task, the orchestrator executes it personally and reports the current 5h usage at the next STOP. It never takes over automatically on a single failure.
- Each ledger row states the finishing tier.

**Usage pacing:** at ≥ 85 % of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s11.9-home-composition` on branch `task/s11.9-home-composition-tNNN`. The orchestrator reviews it and merges it back with `--no-ff`. The worktree is removed only after its merge (global rule).

**Evidence doctrine (kickoff Hard Rule 9):**

- Every claim attaches its artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`).
- No secrets: `gitleaks dir` on new prose and evidence before each commit. Local paths → `<local-path>`, ports → `PORT`.

**Format & rules (every task):**

- Every check starts with `set -euo pipefail; F=.specify/features/home-composition; mkdir -p /tmp/s119-checks $F/evidence`.
- Every check ends with `bash $F/guards.sh` (from T002 on), `bash $F/regress-hero.sh` (from T003 on; T001–T002 run its steps inline) and `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- **Visual tasks** (T006–T010) attach before/after shots of the section they touch: 390 and 1440, light, plus dark where the palette matters. They also attach that section's `home:probe` assertion.
- No motion or colour literals. No product strings outside `apps/web/content/*` and `.specify/content/site.json`. No `'use client'` in `components/home/**`.
- **Never touch:**
  - `.specify/slices/**`, `.specify/KICKOFF*.md`;
  - `.specify/content/**`, except T001's three edits;
  - `packages/xploder/**`;
  - `apps/web/components/{hero,workbench,viewer}/**`, `teardown-poster.tsx`;
  - `app/(site)/projects/**`, `app/dev/**`, `app/fixtures/**`, `app/layout.tsx`, `app/(site)/layout.tsx`, `app/globals.css`, `app/theme-*`;
  - `apps/web/test/xploder-dom/**`;
  - workflows other than `home-composition.yml`;
  - `tools/perf/src/budgets.ts`;
  - any `apps/web` path not in `$F/app-touch.txt`.
- **Eager-hero regression = STOP** (kickoff Hard Rule 6): any `regress-hero.sh` failure stops the task and is reported with its JSON.
- Commit message prefix: `S11.9/TNNN:`, ending with the attribution lines. Stage-boundary commits use `S11.9/stage-3:`.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ R1–R3 in `site.json` (key diff only those three; name absent from repo tree outside older slices' evidence); `site.source.ts` regenerated; seo probe + eager probes (live, reduced) PASS; 8 baseline shots retaken; suite 197 passed | 1 (Flash) + orchestrator review | evidence/T001-log-content.txt, T001-screenshot-baseline-* | 4415797 |
| T002 | ☑ guards 8 + `interim-list` (OK/SKIP as expected), self-test: 8 guards bite; cross-route 0 hunks, `/projects*` `<main>` byte-identical, stable across a fresh rebuild (orchestrator re-check); route list 21 entries | 1 (Flash) + orchestrator review | evidence/T002-log-guards.txt, T002-routes.txt, T002-cross-route-baseline/ | 33f3726 |
| T003 | ☑ `home:probe` 5 groups + 15 negative controls; `eager:probe --save-data` PASS 2/2 (poster, `skipped`); `regress-hero.sh` PASS 5/5. Baseline verdict = RFC §2 prediction: order (module missing), fold (name), responsive (tap targets, 14 px body), structure (hero unnamed, no Contact h2) | 1 (Flash) + orchestrator review | evidence/T003-log-harness.txt | c6ad802 |
| T004 | ☑ `home-composition.yml` (3 shards, gated to this branch, never fails on a verdict) + `ci-summary.mjs`; YAML parsed; local dry run: eager live/reduced/save-data 2/2 each, local index 4245–4265 (not slow class, as expected) | 1 (Flash) + orchestrator review | evidence/T004-log-workflow.txt | 46910da |
| T005 | ☑ `HOME_SECTIONS` (interim, contact in T009) + typed registry; page renders from data; About = one `<section>` root (`AboutStrip` returns content); 8 shots 0 px vs T001; order group PASS 18/18; permutation test PASS; regress-hero, cross-route 0 hunks, guards PASS | 1 (Flash) + orchestrator review | evidence/T005-log-order.txt | 364df48 |
| T006 | ☑ identity line (`identity.name`), h1 clamp 2.25–4.25 rem, lg grid 0.8/1.2 fr, caption 16 px; fold PASS 12/12 light+dark (caption bottom 812 ≤ 836, no padding lever needed); figure snapshot test (caption class only); regress-hero 5/5, cross-route 0 hunks | 1 (Flash) + orchestrator review | evidence/T006-log-hero.txt, T006-screenshot-* | c5abf42 |
| T007 | ☑ compact tagline 16 px (L4); dashed note tile always on beside the card; responsive: Projects body 16 px + no card/tile overlap in 6/6 cells; cross-route: `/projects*` 0 hunks, `/404` exactly the L4 hunk; regress-hero 5/5 | 1 (Flash) + orchestrator review | evidence/T007-log-projects.txt, T007-screenshot-* | 2d8b672 |
| T008 | ☑ About paragraphs 16 px, h2 24 px (= Projects), prose `max-w-prose` kept, skills note unchanged (label); responsive: body sizes PASS 6/6 (only tap targets left, T010); cross-route unchanged; regress-hero 5/5 | 1 (Flash) + orchestrator review | evidence/T008-log-about.txt, T008-screenshot-* | a1fe18b |
| T009 | ☑ Contact section (h2 `contact.title`; email/GitHub/LinkedIn from content, 44 px rows); `HOME_SECTIONS` = G1 list; footer: id removed (L1), contact block hidden on `/` by `:has()` (L6; visible on `/projects`), label from content (L5). order 18/18, structure 36/36, fold 12/12; guards 9/9 (interim-list OK); cross-route 7 hunks all ledgered, `/projects*` `<main>` identical; regress-hero 5/5 | 1 (Flash) + orchestrator review | evidence/T009-log-contact.txt, T009-screenshot-* | 9148ca2 |
| T010 | ☑ nav monogram + social links 44×44 (L2), footer brand link 44 px (L3), nav labels from content (L5); responsive PASS 36/36 in 6 cells; nav 44 px single row at 390; order/fold/structure PASS; cross-route 10 hunks all ledgered, `/projects*` `<main>` identical; regress-hero 5/5 | 1 (Flash) + orchestrator review | evidence/T010-log-chrome.txt, T010-log-cross-route.txt, T010-screenshot-* | 5821491 |
| T011 | ☑ AST scan (7 file groups, printed allowlist = probe allowlist, 3 negative controls bite); mutation test 24 strings / 39 sentinels, unmocked control 0; rendered copy group default + PASS; all 5 default groups PASS; nav/footer social labels from content (renders identically); regress-hero 5/5, cross-route ledger-only, guards 9/9 | 1 (Flash) + orchestrator review (CLI help line) | evidence/T011-log-home-copy.txt | 9377517 |
| T011b | ☐ | | | |
| T012 | ☐ | | | |
| T013 | ☐ | | | |

## Stage-3 amendments (orchestrator)

- **D-A1 (Murphy, 2026-11-08):** hero showcase loop added as T011b (RFC §13 R6). `apps/web/components/hero/**` is touchable in T011b only (`hero-stage.tsx` + a new `hero-loop.ts`); the T006 hero figure snapshot is updated in T011b with a reason note. T006 also makes the headline smaller (one step down the existing clamp) so the figure gets more room, keeping AC2.
- **D-A3 (Murphy, 2026-11-08):** RFC R7 — T011b adds the pause/play button (labels `hero.loopPause` / `hero.loopPlay`, orchestrator content edit before T011b) and `eager:probe --expect live-loop` for `/` (`regress-hero.sh` step 1 and `home-composition.yml` switch to it). `components/hero/hero-live.tsx` is touchable in T011b to pass the labels through.
- **D-A2 (Murphy, 2026-11-08):** R1a — the redaction bar is 8 blocks (one word); orchestrator content edit `28a723c`. `guards.sh --self-test` restores files with `git checkout`, so it must only run on a clean tree (it reverted an uncommitted edit once; re-applied, nothing lost).

---

## Phase Setup — content, guards, harness, workflow (STOP after T004)

### T001 [US3] Content edits R1–R3 + retaken baseline shots

- **Seam:** `site.json` ↔ generated `site.source.ts` ↔ `SiteCopy`.
- **Files:** `.specify/content/site.json` (R1–R3 only), `apps/web/content/site-copy.ts` (`contact: { title: string }`), `apps/web/content/site.source.ts` (regenerated, never hand-edited).
- **Steps:**
  1. In `about.paragraphs[0]`, replace the employer name (19 characters, `&` included) with `███████████████████` (19 × U+2588).
  2. Set `meta.description` to "Android engineer. Portfolio rendered as exploded architecture: real layers, real components, real numbers."
  3. Add `"contact": { "title": "Contact" }` after `projects`.
  4. Run `pnpm --filter web content:convert`.
  5. Retake the 6 full-page baseline shots + 2 fold shots with the RFC baseline script (moved to `$F/baseline-shots.mjs`).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/home-composition; mkdir -p /tmp/s119-checks $F/evidence
  OLD=$(git show b52fc06:.specify/content/site.json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const p=JSON.parse(d).about.paragraphs[0];process.stdout.write(p.slice(p.indexOf(" at ")+4,p.indexOf(", focused")))})')   # the redacted phrase, never written literally
  node -e 'const s=require("./.specify/content/site.json");const p=s.about.paragraphs[0];const ok=p.includes(" at "+"█".repeat(19)+", focused")&&s.contact.title==="Contact"&&!s.meta.description.includes(" at ");process.exit(ok?0:1)' && echo CONTENT-OK | tee /tmp/s119-checks/t001.txt
  (cd apps/web && node scripts/convert-content.ts --check)
  pnpm --filter web exec vitest run test/site-copy-fidelity.test.ts test/no-hand-copied-content.test.ts test/seo-metadata.test.ts test/site-metadata.test.ts --reporter verbose | tee -a /tmp/s119-checks/t001.txt
  pnpm build && pnpm --filter web seo:expect
  pnpm seo:probe --out-dir apps/web/out --site-url http://localhost:3000 --expect apps/web/out-seo-expect.json --out /tmp/s119-checks/t001-seo
  pnpm eager:probe --serve apps/web/out --route / --runs 2 --out /tmp/s119-checks/t001-eager
  pnpm eager:probe --serve apps/web/out --route / --runs 2 --reduced-motion --out /tmp/s119-checks/t001-eager-rm
  node $F/baseline-shots.mjs "$PWD" apps/web/out $F/evidence   # T001-screenshot-baseline-*.png
  ! grep -rIlF "$OLD" $F apps/web/content apps/web/out .specify/content
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-content.txt` (key diff, tests, seo probe, eager probes), `evidence/T001-screenshot-baseline-{390,768,1440}-{light,dark}.png`, `…-390x844-fold-{light,dark}.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `evidence/T001-screenshot-baseline-1440-light.png`: the About paragraph shows the solid bar.
  2. `git show <T001 sha> -- .specify/content/site.json`: only the three approved changes.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: G1 R1–R3).

### T002 [US7] Guards, allowlists, cross-route and route-list baselines

- **Files:** `$F/guards.sh`, `$F/app-touch.txt` (the plan's `apps/web` paths), `$F/cross-route.sh`, `$F/evidence/T002-cross-route-baseline/` (normalised HTML of `/projects`, `/projects/websocket-inspector`, `/404` from the T001 export), `$F/evidence/T002-routes.txt`.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/home-composition; mkdir -p /tmp/s119-checks
  pnpm build
  bash $F/cross-route.sh --write-baseline && bash $F/cross-route.sh | tee /tmp/s119-checks/t002.txt   # 0 hunks against itself
  bash $F/guards.sh | tee -a /tmp/s119-checks/t002.txt
  # negative controls (uncommitted, reverted after each): touch a frozen path; edit a non-R1–R3 site.json key; add a route dir under out/; add 'use client' to a fake components/home file → each guard must FAIL
  bash $F/guards.sh --self-test | tee -a /tmp/s119-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-guards.txt` (every guard line + the negative controls biting), the baseline dir, `T002-routes.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing visible. Optional: read the guard list in `T002-log-guards.txt`.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: plan "Guards").

### T003 [US1, US2, US4, US5, US6] Harness: `home:probe`, `eager:probe --save-data`, `regress-hero.sh`

- **Files:** `tools/perf/src/home-probe.ts`, `tools/perf/src/cli/home-probe.ts`, `tools/perf/test/home-probe.test.ts`, `tools/perf/src/eager-probe.ts` + `cli/eager-probe.ts` (`--save-data`: init script sets `navigator.connection.saveData = true`, the S11.8 R11 mechanism; expected state = poster, no canvas, live state `skipped`), root `package.json` (`home:probe`), `$F/regress-hero.sh`.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/home-composition; mkdir -p /tmp/s119-checks
  pnpm --filter perf-tools exec vitest run test/home-probe.test.ts --reporter verbose | tee /tmp/s119-checks/t003.txt   # negative controls bite
  pnpm build
  pnpm eager:probe --serve apps/web/out --route / --runs 2 --save-data --out /tmp/s119-checks/t003-sd   # PASS: poster
  pnpm home:probe --serve apps/web/out --out /tmp/s119-checks/t003-home || echo "exit $? (baseline verdict recorded)"
  bash $F/regress-hero.sh | tee -a /tmp/s119-checks/t003.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-harness.txt` holds the unit tests, the Save-Data PASS and `regress-hero.sh` PASS. It also holds **the baseline `home:probe` verdict on today's page**, which is expected to fail: order (no data list, no Contact), fold (no name), responsive (tap targets, 14 px body), structure (hero unnamed, no Contact `h2`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The baseline verdict lists exactly the failures the RFC §2 table predicts.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC Q6, plan "Probe wiring").

### T004 [US4] Workflow `home-composition.yml` (measurement only)

- **Files:** `.github/workflows/home-composition.yml`:
  - `if: github.head_ref == 'task/s11.9-home-composition'`;
  - 3 shards; per shard: host metadata with `startedAt`, `pnpm build`, `perf:lighthouse /` ×2 (for `benchmarkIndex`), `eager:probe /` ×2, `--reduced-motion` ×2, `--save-data` ×2;
  - uploads `.evidence/ci/home-composition`;
  - not a required check.
- **Check:** `actionlint` if available, else `node -e` YAML parse; a local dry run of the shard script against `serve:out`.
- **Evidence:** `evidence/T004-log-workflow.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing (the workflow first runs at T013).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC Q7; deleted at T013).

**STOP — Phase Setup report:** ledger rows T001–T004, the baseline `home:probe` verdict, `regress-hero.sh` green.

---

## Phase Sections — order data, then one section per task (STOP after T009)

### T005 [US2, US6] Order data + registry + section frame (no visual change)

- **Files:** `apps/web/content/home-sections.ts`, `apps/web/components/home/{section-frame,registry,hero-section,projects-section,about-section}.tsx`, `apps/web/app/(site)/page.tsx`, `apps/web/test/home-sections.test.ts`, `$F/evidence/T005-interim-approved.txt` (`nav, hero, projects, about, footer`).
- **Rules:**
  - The section JSX moves verbatim into the section components; only the shell is new.
  - Each section root gets `data-home-section` + `aria-labelledby` (hero → `h1` id).
  - `HOME_SECTIONS` holds the interim list until T009.
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/home-composition; mkdir -p /tmp/s119-checks
  pnpm --filter web exec vitest run test/home-sections.test.ts --reporter verbose | tee /tmp/s119-checks/t005.txt   # permuted list → permuted DOM; registry complete
  pnpm build
  node $F/baseline-shots.mjs "$PWD" apps/web/out /tmp/s119-checks/t005-after && node $F/pixel-diff.mjs $F/evidence/T001-screenshot-baseline /tmp/s119-checks/t005-after   # 0 px at 3 widths × 2 palettes
  pnpm home:probe --serve apps/web/out --group order --approved $F/evidence/T005-interim-approved.txt --out /tmp/s119-checks/t005-order
  bash $F/regress-hero.sh && bash $F/cross-route.sh && bash $F/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-order.txt` (unit tests, 0-px diff, order group PASS on the interim list).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing visible should change. Optional: in `content/home-sections.ts`, swap `projects` and `about` locally, run `pnpm dev`, and see the page follow; then revert.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC §4.1).

### T006 [US1, US5] Hero: identity line + 16 px caption

- **Files:** `components/home/hero-section.tsx`, `apps/web/test/home-hero-figure.test.tsx` (new; snapshot taken from the T005 figure, updated only for the caption font class).
- **Composition:**
  - `identity.name` above the eyebrow (`text-base font-semibold text-fg`);
  - caption `text-sm` → `text-base`.
  - If the caption bottom is > 836 at 390×844, set hero `py-10` → `pt-8 pb-10`. If it still overflows: STOP.
- **Check:** home-hero-figure test; `home:probe --group fold` (light + dark) PASS; responsive group cells for the hero; before/after hero shots; `regress-hero.sh`; `cross-route.sh` (0 hunks); `guards.sh`; full suite.
- **Evidence:** `evidence/T006-screenshot-{before,after}-{390,1440}-light.png`, `T006-screenshot-fold-390x844-{light,dark}.png` (boxes), `T006-log-hero.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `T006-screenshot-fold-390x844-light.png`: name, role, headline, Open a teardown and the project caption are all visible without scrolling.
  2. `pnpm dev` → `/` on a phone-width window: the live teardown still appears by itself.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q9 `identity.name`).

### T007 [US5] Projects: 16 px taglines + always-on note tile

- **Files:** `components/home/projects-section.tsx`, `components/project-card.tsx` (compact tagline only, L4).
- **Composition:** the note is a `<p>` in its own grid cell (`rounded border border-dashed border-line/30 p-4 sm:p-5 text-base text-muted`, vertically centred). With zero projects, the existing single note renders as today.
- **Check:** responsive group (Projects cells) PASS; before/after shots at 390 / 768 / 1440 light; `cross-route.sh` (only L4 hunks on `/404`); `regress-hero.sh`; `guards.sh`; full suite.
- **Evidence:** `evidence/T007-screenshot-{before,after}-{390,768,1440}-light.png`, `T007-log-projects.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `T007-screenshot-after-1440-light.png`: the tile sits beside the card and reads as quiet, not as a missing card.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: G1 dashed tile).

### T008 [US5] About: section frame, 16 px paragraphs, unified heading

- **Files:** `components/home/about-section.tsx`, `components/about-strip.tsx`.
- **Composition:** the wrapping `div` is removed; paragraphs `text-sm` → `text-base`; `h2` → `text-2xl`; the skills note is unchanged (label).
- **Check:** responsive group (About cells) PASS; before/after shots at 390 / 1440 light + dark; `regress-hero.sh`; `cross-route.sh` (0 hunks); `guards.sh`; full suite.
- **Evidence:** `evidence/T008-screenshot-{before,after}-{390,1440}-{light,dark}.png`, `T008-log-about.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The About text is easier to read at 390, and the redaction bar sits cleanly in the line.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T009 [US2, US6] Contact section + footer de-duplication (L1, L5 footer label, L6)

- **Files:** `components/home/contact-section.tsx`, `components/home/registry.tsx`, `content/home-sections.ts` (`contact` added; now = `g1-approved.txt`), `components/site-footer.tsx`.
- **Composition:**
  - `h2` = `contact.title`;
  - rows: `footer.contactLabel` + `identity.email` (mailto), then GitHub and LinkedIn from `identity.links`, with the `icons.tsx` icons; 44 px rows, stacked at 390 and in one row at `sm+`;
  - `id="contact"` on the section, removed from the footer (L1);
  - the footer contact block gets `data-footer-contact` + `[body:has([data-home-section=contact])_&]:hidden` (L6);
  - the footer "Contact" label → `contact.title` (L5).
- **Check:** `home:probe --group order` (default `g1-approved.txt`) + `--group structure` PASS at 3 widths; the footer contact block is `display: none` on `/` and visible on `/projects` (probe assertion); before/after shots at 390 / 1440 light + dark; `regress-hero.sh`; `cross-route.sh` (only L1 + L6 hunks); `guards.sh` (interim list rejected from here on); full suite.
- **Evidence:** `evidence/T009-screenshot-{before,after}-{390,1440}-{light,dark}.png`, `T009-log-contact.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `pnpm dev` → `/`: tap "Contact" in the nav; the page lands on the Contact section, and the footer below no longer repeats the links.
  2. `/projects`: the footer still shows the contact links.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: G1 R4).

**STOP — Phase Sections report:** ledger rows T005–T009, before/after shots per section, order + fold + structure PASS, `regress-hero.sh` green.

---

## Phase Chrome & copy (STOP after T011)

### T010 [US5, US3] Nav + footer ledger: L2, L3, L5 nav labels

- **Files:** `components/site-nav.tsx`, `components/nav-projects-link.tsx`, `components/site-footer.tsx`.
- **Changes:**
  - monogram link `min-w-9` → `min-w-11`; social links `w-9` → `w-11` (L2);
  - footer brand link `min-h-11` (L3);
  - nav labels → `SITE.projects.title`, `SITE.about.title`, `SITE.contact.title`. `NavProjectsLink` takes the label as a prop and stays the only client part (L5).
- **Check:** responsive group: tap targets PASS in all 6 cells; nav fits at 390 (no horizontal scroll, no wrap); `cross-route.sh` (only L1–L6 hunks; `/projects*` `<main>` byte-identical); before/after nav + footer shots at 390 / 1440; `regress-hero.sh`; `guards.sh`; full suite.
- **Evidence:** `evidence/T010-screenshot-{before,after}-nav-{390,1440}-light.png`, `T010-log-cross-route.txt`, `T010-log-chrome.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The nav on a phone-width window: icons slightly roomier, nothing wraps.
  2. `/projects` looks unchanged apart from the nav spacing and the footer brand link height.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q2 ledger).

### T011 [US3] Copy fidelity: AST scan, mutation test, rendered copy group

- **Files:** `apps/web/test/home-copy.test.ts`, `apps/web/test/home-copy-mutation.test.tsx`, `tools/perf/src/home-probe.ts` (copy group enabled in the default run).
- **Check:**
  ```sh
  set -euo pipefail; F=.specify/features/home-composition; mkdir -p /tmp/s119-checks
  pnpm --filter web exec vitest run test/home-copy.test.ts test/home-copy-mutation.test.tsx --reporter verbose | tee /tmp/s119-checks/t011.txt   # incl. negative controls + printed allowlist
  pnpm build && pnpm home:probe --serve apps/web/out --group copy --out /tmp/s119-checks/t011-copy
  bash $F/regress-hero.sh && bash $F/cross-route.sh && bash $F/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T011-OK
  ```
- **Evidence:** `evidence/T011-log-home-copy.txt` (scan output, printed allowlist, mutation sentinels found, negative controls biting, rendered copy PASS).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: change one word in `site.json`, run `pnpm --filter web content:convert && pnpm dev`, and see the page change; then revert.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q4 allowlist).

### T011b [US4] Hero showcase loop (R6)

- **Files:** `apps/web/components/hero/hero-stage.tsx`, `apps/web/components/hero/hero-loop.ts` (new), `apps/web/test/home-hero-loop.test.tsx` (new), `apps/web/test/home-hero-figure.test.tsx` (snapshot note), `$F/app-touch.txt` (+ these hero paths).
- **Behaviour:**
  - after the first settled frame: hold `durations.tourBeat`, then `rotateRight` + `implode`; on settled, hold, then `rotateRight` + `explode`; repeat;
  - pause on `visibilitychange` hidden and when an `IntersectionObserver` reports the hero off-screen; resume when it is back;
  - reduced motion / Save-Data: the poster path is unchanged, so the loop never mounts.
- **Check:** unit tests with fake timers (sequence, pause/resume, no loop under reduced motion); `regress-hero.sh`; `site:probe --group draws,cls` (2 draws, CLS 0); local `perf:lighthouse /` ×2 (perf ≥ 0.95, a11y ≥ 0.95); `no-motion-literals` green; `guards.sh`; full suite. Two failed attempts on a gate → revert the loop only and report (safety valve).
- **Evidence:** `evidence/T011b-log-loop.txt`, a short screen recording or a frame strip `T011b-screenshot-loop-strip.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Preview: `/` shows the teardown turning, exploding and imploding in a loop; switching tabs and coming back resumes it.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (defaults: quarter turn per step, 1.6 s hold).

**STOP — Phase Chrome & copy report:** ledger rows T010–T011, the cross-route diff (ledger only), copy PASS.

---

## Phase Verify (STOP after T013 — Stage 3 end-contract)

### T012 [US1, US2, US4, US5, US6] Local gates + 12 shots + fold + structure

- **Check:**
  - `pnpm build`;
  - `home:probe` (all groups) → the 12 shots, the fold overlay and the 1440 light order shot;
  - `site:probe --serve apps/web/out --ci` + `--group draws,hero`;
  - `a11y:axe:site --serve apps/web/out` (all route groups);
  - `perf:lighthouse` on `/` via `serve:out` (median of 3, ×2);
  - `perf:weight`;
  - `regress-hero.sh`; `cross-route.sh`; `guards.sh`; full suite.
- **Evidence:**
  - `evidence/T012-screenshot-{mobile,tablet,desktop}-{light,dark}[-fold].png` (12);
  - `T012-screenshot-fold-390x844-{light,dark}.png`;
  - `T012-screenshot-order-1440-light.png`;
  - `T012-log-home-probe.json`, `T012-lighthouse-summary.json`, `T012-weight.json`, `T012-log-axe.json`, `T012-log-site-probe.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Flip through the 12 shots.
  2. `pnpm build && pnpm serve:out`, then open `/` on a real phone if handy.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

### T013 [US4, US7] PR, CI green, slow-class run, AC self-check, workflow removed (orchestrator: CI; executor: tables)

- **Steps:**
  1. The orchestrator pushes the branch and opens a **draft** PR to `main`.
  2. Wait for the required checks and `home-composition.yml`. Qualify slow-class attempts (cap 10).
  3. Download the artifacts and tabulate the AC4 reveal / reduced / Save-Data results.
  4. Delete `home-composition.yml` in a final commit, then re-run CI on it to green.
  5. Write `evidence/AC-selfcheck.md` (AC1–AC7 table) and confirm frozen surfaces S2–S8 are empty.
- **Evidence:** `evidence/T013-ci.txt` (run URLs, check list), `T013-log-slow-class.md`, `AC-selfcheck.md`, `T013-log-guards.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The PR's Vercel preview: `/` on a phone and a desktop, light and dark.
  2. The AC self-check table.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. ~~OK to push the branch and open a draft PR at T013~~ **Granted by Murphy 2026-11-08** (merge only on Murphy's "merge").
  2. Your "S11.9 done" after validation.

**STOP — Stage 3 end-contract:** all tasks complete with evidence; the AC1–AC7 self-check table; frozen surfaces empty; anything needing Murphy's hands listed.
