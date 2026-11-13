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
| T011c | ☑ spike: **YES**, the tour runs in the hero with the public `xploder/react` API, no engine change, no panels; draws 2, CLS 0, Lighthouse perf 1 / a11y 1, no console errors; per-step component derivable from public data; engine `TourCaption` overlay appears automatically (covers part of the figure); `--expect live-loop` needs to accept a playing tour. Spike branch kept unmerged in its worktree for T011d reuse | 1 (Flash) | evidence/T011c-log-spike.md, T011c-screenshot-tour-* | (spike, not merged) |
| T011d | ☑ capture → inspect → turn cycle (pure controller); caption row narrates `flow · n/7 · component — summary` from project content (static caption kept for SSR/SR), 2 lines reserved, button in caption row, engine caption hidden in hero only. regress-hero 5/5, home:probe all PASS (caption bottom 812 ≤ 836), CLS 0 over a full cycle at 390 + 1440, draws 2, axe 0/0, Lighthouse ×2 1.00/1.00, cross-route ledger-only. Executor also made `site:probe` hero accept tour states (D-A4 scope); caption container excluded from overlap (button shares the row) | 1 (Flash) + orchestrator review | evidence/T011d-log-tour.txt, T011d-screenshot-caption-* | b0a3f50 |
| T011e | ☑ proof strip (3 facts from `story.metrics` via `hero.proof`), full-width last hero row, highlight follows the tour's layer (colour only); resolver validated against real content; fold PASS (812 ≤ 836), CLS 0 over a full cycle at 390 + 1440, draws 2, axe 0, Lighthouse ×2 1.00/1.00, regress-hero 5/5, guards 9/9, cross-route ledger-only | 1 (Flash) + orchestrator review | evidence/T011e-log-proof.txt, T011e-screenshot-strip-* | e80efc8 |
| T011e2 | ☑ proof facts plain (dividers, no boxes/highlight, server component, `hero.proof` = indexes); secondary CTA removed; primary CTA = 44 px text link + SVG arrow; fold PASS, axe 0 light + dark (accent link contrast), CLS 0 full cycle, Lighthouse ×2 1.00/1.00, draws 2, regress-hero 5/5, guards, cross-route ledger-only | 1 (Flash) + orchestrator review | evidence/T011e2-log-calm.txt, T011e2-screenshot-hero-* | a3b22c5 |
| T011h | ☑ spike: **YES** via (a) `zoomIn` ×2 + interpolated stage-scroller follow anchored on the engine-rendered `data-xploder-trace-pad` marker (public DOM, not a typed handle); 60 fps (RAF p95 ≤ 17.6 ms), CLS 0, draws 2, Lighthouse perf 1, no errors; (b) per-layer focus NO (suspended during tours), (c) zoom-only NO. Risks: DOM bridge, vertical-only, first two host steps sit 47–83 px low | 1 (Flash) | evidence/T011h-log-spike.md, T011h-screenshot-follow-*, T011h-spike.diff.txt | (spike, not merged) |
| T011i | ☑ full-screen blueprint hero per R9 mockup; CSS snap `mandatory` on `/` only (proximity failed the up-scroll check), off under reduced motion; snap checks 20/20 at 390 + 1440; proof strip + `hero.proof` removed; fold 12/12, home:probe all PASS, CLS 0 full cycle, axe 0/0, Lighthouse ×2 1/1, draws 2, regress-hero 5/5, cross-route ledger-only, guards 9/9. Note: at 1440 the post-hero content is ~1005 px, so its free-scroll range is short | 1 (Flash) + orchestrator review | evidence/T011i-log-layout.txt, T011i-screenshot-hero-* | 21f1b3d |
| T011j | ☑ storyboard controller (tokens only), zoomIn ×3 + interpolated follow via one DOM-bridge module (contract test), live layer inert/pointer-events-none + stage overflow-hidden in the hero only, leader synced (0 px at samples), bigger model; follow 14/14 samples reach their (clamped) targets, wheel over hero scrolls the page, snap 20/20, home:probe all PASS, CLS 0 full cycle, axe 0/0, Lighthouse ×2 PASS, draws 2, regress-hero 5/5, no-motion-literals PASS, guards 9/9, cross-route ledger-only. Open polish: hard top/bottom crop of the zoomed canvas | 1 (Flash; first dispatch stopped by orchestrator after a status race, re-dispatched) + orchestrator review | evidence/T011j-log-storyboard.txt, T011j-screenshot-* | 6d0b4c7 |
| T011k | ☑ overlay label + leader at the active pad (14/14 steps 0 px), fade-out-then-in via Web Animations API with motion tokens (CSS transition timings are blocked by the motion-matrix test), permanent project line, phone label below the model; home:probe all PASS, snap 20/20, CLS 0 full cycle, axe 0, Lighthouse ×2 1.00, draws 2, regress-hero 5/5, no-motion-literals PASS | 1 (Flash) + orchestrator review | evidence/T011k-log-labels.txt, T011k-screenshot-label-* | 372d7ff |
| T011l | ☑ opt-in `createZoomTween` (implode token) in engine/camera + CameraRig, `useTeardownViewer({ smoothZoom })`, hero opts in; default path unchanged (project zoom still instant). Lever 3aee8fc, re-seal S2/S4 + S5 manifests at 3aee8fc (orchestrator), frozen-surface + camera tests 13/13, xploder suite PASS; hero zoom 91 samples ×3 monotonic, worst per-frame 33.5 % of a step; Lighthouse ×2 1.00; regress-hero 5/5; guards PASS. **Found:** `site:probe` drill (a CI group) fails on `/` since T009 → T011m | 1 (Flash) + orchestrator (re-seal SHAs) | evidence/T011l-log-zoom.md, T011l-screenshot-zoom-strip.png | 4e320bf |
| T011m | ☑ drill expects the approved `/` Tab order (contact keys, optional hero pause); soft-nav CLS 0.146 → 0: Back restored a deep home scroll while the outgoing project page was still painted (snap amplifies: 0.018 without it, orchestrator test build); fix = home-only scroll memory (manual restoration on traversal to `/`). `site:probe --ci` PASS (drill 13/13, CLS 12/12 = 0), hero 7/7, draws 2, regress-hero 5/5, home:probe all, snap 20/20, guards 9/9, cross-route ledger-only; `main` comparison 0 | 1 (Flash) + orchestrator (snap cross-check) | evidence/T011m-log-drill.txt, T011m-log-drill-before.txt | 23a5466 |
| T011n | ☐ | | | |
| T011o | ☐ | | | |
| T011f | ☐ | | | |
| T011g | ☐ (Murphy content pass) | | | |
| T011b | ☑ loop (explode/implode + quarter turn, `tourBeat` hold; pauses off-screen / hidden tab) + 44×44 pause/play button outside `aria-hidden`, labels from content; attempt 1 blocked by two probes assuming a still hero → D-A4; attempt 2: regress-hero 5/5 (`--expect live-loop`), home:probe all groups PASS incl. button + reduced cell, axe home 0/0, Lighthouse ×2 perf 1.00 / a11y 1.00 / CLS 0, draws 2, cross-route ledger-only, guards 9/9 | 1 (Flash, 2 attempts) + orchestrator (D-A4 decision) | evidence/T011b-log-loop.txt, T011b-screenshot-* | 27968cb |
| T012 | ☐ | | | |
| T013 | ☐ | | | |

## Stage-3 amendments (orchestrator)

- **D-A1 (Murphy, 2026-11-08):** hero showcase loop added as T011b (RFC §13 R6). `apps/web/components/hero/**` is touchable in T011b only (`hero-stage.tsx` + a new `hero-loop.ts`); the T006 hero figure snapshot is updated in T011b with a reason note. T006 also makes the headline smaller (one step down the existing clamp) so the figure gets more room, keeping AC2.
- **D-A8 (Murphy, 2026-11-13):** RFC R10 — T011k overlay labels (app only); T011l smooth zoom in the engine (opt-in, re-sealed; AC7 frozen-surface exception approved by Murphy, Merlin handoff at slice end). `guards.sh` frozen-surfaces allows exactly the files in `approved-xploder-src.txt` (each with an S11.9 re-seal note). T013 adds `HANDOFF-merlin.md`.
- **D-A7 (Murphy, 2026-11-13):** RFC R9 — full-screen blueprint hero + CSS snap + storyboard animation; proof strip dropped. T011h spike (camera follow) first; then the build tasks are specified from its answer. `/tmp` was cleared by the host between sessions: runner scripts are recreated; all work was already committed.
- **D-A6 (Murphy, 2026-11-10):** RFC R8b — T011e2 calms the hero (plain facts, no highlight, one text-link CTA). Removing both CTAs was declined: AC2 requires the primary CTA above the fold (an AC change would be an escalation).
- **D-A5 (Murphy, 2026-11-08):** RFC R8 — hero showcase tasks T011c–T011g inserted before T012; Murphy reviews after each (STOP per task). `components/hero/**` and a home-only poster option stay touchable through T011f; `packages/xploder/**` stays frozen (T011c must prove the tour runs in the hero with no engine change, else STOP).
- **D-A4 (orchestrator, T011b attempt 1):** two probes still encoded "the hero never moves on its own". (a) `site:probe` hero group: when the page carries `[data-hero-loop]`, `hero-idle-exploded` is replaced by `hero-loop-running` (loop attribute `running`, one canvas, tour idle); without the attribute the check is unchanged (mode-aware, like S11.8 R9). (b) `home:probe` measures the real page: every group runs in normal motion and waits for `[data-hero-loop="running"]` on `/`, so the pause button is covered by the tap-target, tab-walk and visual-order checks; one extra reduced-motion structure cell at 390 covers the poster path (no button). (c) Visual reading order (spec "Keyboard order = visual order") is refined for multi-column sections: (section index, grid column of the focus stop within a multi-column grid section at that width, then y, then x) — side-by-side columns read left column first, then right.
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

### T011c [US4] Feasibility: the existing tour plays in the hero (spike, STOP after)

- **Question:** can the home hero's `LiveViewer` run `selectFlow('capture-path')` + `play()` (then `inspect-path`) with the public `xploder/react` API only, no `packages/xploder` change, no panels? What does the handle expose per step (flow id, step, total, component id)? Are there console errors, extra draw calls, or a tour UI that appears without panels?
- **Output:** a throwaway branch (not merged); `evidence/T011c-log-spike.md` with the answers, the minimal wiring used, draw calls, Lighthouse ×1 on `/`, `eager:probe --expect live-loop`, and 4 screenshots of the pulse at different steps (`T011c-screenshot-tour-{1..4}.png`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. The 4 screenshots: is the travelling pulse the "wow" you want?
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Go / no-go for T011d.

### T011d [US1, US4, US5, US6] Narrated frame-travel tour in the hero (Murphy: narration below the frame)

- **Sequence:** after the first frame: `capture-path` tour → `inspect-path` tour → T011b turn (implode + quarter turn, explode + quarter turn) → repeat. A pure phase controller (extends `hero-loop.ts`) owns the sequence; it is unit-tested with fake timers and pauses/resumes as T011b (button, hidden tab, off-screen).
- **Narration (caption row):** the visible line is composed only of project content plus separators: `{flow label} · {step}/{total} · {component name} — {component summary}`, derived from public data (`flows[].path[step]`). Idle/turn/poster/SSR: `{name} — {tagline}` as today. Screen readers keep the static caption (the dynamic line is `aria-hidden`, no live region). Two lines are reserved and clamped at every width, so the caption never changes height (CLS 0). The engine's own `TourCaption` overlay is hidden inside the hero only (app CSS on `[data-xploder-caption]`, no engine change).
- **Button:** moves to the caption row's right end (44×44 slot always reserved, so nothing shifts when it appears); still outside `aria-hidden`, after the CTAs in Tab order.
- **Probes:** `eager:probe --expect live-loop` accepts a playing/paused tour (tour no longer required idle in that mode); `home:probe` copy group accepts the narration compositions; a 30 s CLS observer over a full cycle at 390 and 1440 must read 0.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Preview: the frame travels, the caption narrates each step, nothing jumps. 2. Pause works during the tour.
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Review → go for T011e.

### T011e [US1, US5] Proof strip with facts that light up in sync (RFC R8, R8a)

- **Content:** `SITE.hero.proof` entries → the hero project's `story.metrics[metric]` (label + value) and an optional layer id. Nothing typed in code.
- **Layout:** the last row of the hero section, spanning both columns at `lg` (`col-span-full`), a `<ul>` of 2–3 items; one column at 390, three at `sm+`. Each item: label (mono, small, muted: a label, not body) and value (`text-base`, body). Quiet border; existing palette only.
- **Sync:** while the tour's current component belongs to an item's layer, that item is highlighted (border and value colour only; no size change, no transition timing literal). SSR, poster, reduced motion and the turn phase: nothing highlighted. Visual only: no live region, no `aria-current`.
- **Checks:** unit tests (index/layer resolution and validation against the real project: every index exists, every layer id exists; highlight follows a fake tour); fold at 390×844 still PASS (the strip sits after the figure); CLS 0 over a full cycle at 390 + 1440 (the 30 s observer); home:probe all groups (body 16 px for values, tap targets n/a, copy compositions); regress-hero, draws, axe home, Lighthouse ×2, cross-route, guards, full suite.
- **Evidence:** `T011e-log-proof.txt`, `T011e-screenshot-strip-{390,1440}-light.png`, `T011e-screenshot-strip-1440-highlight-{capture,persistence,inspection-ui}.png`, `T011e-screenshot-strip-1440-dark.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Preview: a fact lights up as the frame passes its layer. 2. The default facts (you can change them in the content pass).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Review → go for T011f.

### T011e2 [US1, US3, US5] Calmer hero (RFC R8b)

- **Changes:** proof strip without item boxes and without highlight (server component; plain columns, thin dividers via `divide-*`, stacked at 390); remove the layer plumbing added for the highlight; remove the secondary CTA from the hero; the primary CTA becomes a text link (`text-accent`, underline on hover, inline aria-hidden SVG arrow, `min-h-11`), label from `SITE.hero.primaryCta`.
- **Checks:** fold at 390×844 PASS (primary CTA visible), contrast AA for the accent text link in both palettes (axe), tap targets, copy scan, CLS 0 full cycle, regress-hero, draws, Lighthouse ×2, cross-route, guards, full suite.
- **Evidence:** `T011e2-log-calm.txt`, `T011e2-screenshot-hero-{390,1440}-{light,dark}.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Preview: calmer hero, one text link, plain facts.
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Review → go for T011f.

### T011h [US4] Spike: can the camera follow the frame? (STOP after)

- **Question:** with the public `xploder/react` API only (no engine change), can the hero zoom in to the first component of a flow and keep the current component in view as the tour advances? Candidates: (a) `zoomIn` + programmatic scroll of the viewer's stage scroller (ViewScroll) towards the current component, located from DOM data attributes the engine renders; (b) `toggleFocus(layerId)` per step; (c) anything else public. Measure smoothness (frame pacing), draws, CLS, console errors, Lighthouse ×1, reduced-motion untouched.
- **Output:** throwaway branch; `evidence/T011h-log-spike.md` (YES/NO per candidate, minimal wiring, numbers, risks) + `T011h-screenshot-follow-{1..4}.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. The 4 screenshots: does the follow read as "the camera tracks the frame"?
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Go / fallback decision.

### T011i [US1, US2, US5, US6] Full-screen blueprint hero + scroll snap (RFC R9; layout only, animation unchanged)

- **Layout (match `evidence/R9-mockup-blueprint-v2.html`):** the hero fills the first screen (`min-h` = `100svh` − nav, never a fixed height); a full-bleed "sheet" (inset, four corner crop marks, `--color-grid` grid paper fading out with a radial mask; all decorative, `aria-hidden`); left column: name → role eyebrow with a short accent tick → headline → description → primary text link; the model floats with no frame/border/background, large on the right at `lg` and in the middle on phones; narration becomes a drawing annotation (accent left rule; mono uppercase header `{project name} · {flow label}` with `{n}/{total}` at the right; component name; summary), static state = project name + tagline; fixed reserved height; desktop-only decorative leader line; round 44×44 pause control at the annotation's end; a thin fading scroll-cue line at the bottom (decorative). Page container moves from `page.tsx` into each section so the hero can go full-bleed without `100vw` (no horizontal scroll).
- **Snap (CSS only, `/` only):** a home-only `<style>` sets `scroll-snap-type: y mandatory` on `:root`, none under `prefers-reduced-motion: reduce`; snap targets: hero `start` (with `scroll-margin-top` = nav height so it snaps to 0), one wrapper around every section after the hero `start` (taller than the viewport, so scrolling inside it is free), and the footer `end` (selector in the same home-only style). If mandatory fails any check below, fall back to `proximity` and report.
- **Removed:** the proof strip, its resolver/tests, and `hero.proof` (prepared content files).
- **Checks:** Playwright snap checks at 390×844 and 1440×900: (1) a small wheel/scroll down from the top lands at the Projects top; (2) from there, scrolling down is free (a mid-About position holds); (3) the bottom is reachable and the footer fully visible; (4) scrolling up from the Projects top lands back on the hero at 0; (5) `/#about` and `/#contact` land on their sections; (6) PageDown/End keys work; (7) reduced motion → no snap. Plus: fold at 390×844 (all AC2 boxes inside the first screen), home:probe all groups (order probe tolerates the snap wrapper), CLS 0 full cycle at 390 + 1440, axe home 0/0 both palettes, Lighthouse ×2, draws 2, regress-hero 5/5, cross-route (other routes unchanged), guards, full suite.
- **Evidence:** `T011i-log-layout.txt` (snap checks with scroll positions), `T011i-screenshot-hero-{390,768,1440}-{light,dark}.png` (first viewport).
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Preview: full-screen blueprint hero; scroll down snaps to Projects; scroll up from Projects snaps back.
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Review → go for T011j.

### T011j [US4, US5] Storyboard animation + camera follow + synced leader + bigger model (Murphy review of T011i)

- **Sequence (pure controller, tokens only):** start imploded at the default zoom → `explode()` → once exploded, zoom in (`zoomIn()` ×2–3, tuned so the first steps sit near the centre) → `capture-path` tour with the camera following the current component vertically (T011h candidate (a): interpolated scroll of the viewer's stage scroller towards the `data-xploder-trace-pad` of `flows[].path[step]`) → `inspect-path` likewise → zoom out (`zoomReset()`, scroller eased back) → two quarter turns → `implode()` (zoomed out) → hold → repeat. Pause/hidden tab/off-screen pause everything, including the follow.
- **System-only camera:** inside the hero the viewer never takes user input: the live layer is `inert` and `pointer-events-none`, and the stage scroller is `overflow-hidden` (programmatic `scrollTop` still works). Wheel, touch and keyboard scrolling always move the page.
- **Leader line synced:** the annotation's leader is an `aria-hidden` SVG line from the annotation's corner to the current trace pad's centre, updated on animation frames while the tour runs and the hero is visible; hidden outside tour phases (turn/implode) and on phones if it would cross the text.
- **Bigger model:** the model gets the larger share at every width (e.g. `lg` columns ≈ 0.6fr / 1.4fr; model box ≈ min(78svh, 760px) tall), the headline and text column scale down proportionally; at 390×844 every AC2 box still fits in the first screen.
- **Checks:** controller unit tests (sequence, zoom calls, follow targets, pause); Playwright: wheel over the hero scrolls the page (stage `scrollTop` unchanged by user input), follow centre error per step, leader endpoint within 12 px of the active pad centre; fold, home:probe all groups, snap checks still 20/20, CLS 0 full cycle, axe 0/0, Lighthouse ×2, draws 2, regress-hero 5/5, `no-motion-literals`, cross-route, guards, full suite.
- **Evidence:** `T011j-log-storyboard.txt`, `T011j-screenshot-story-{1..6}.png` (1440 light: imploded, exploded, zoomed at step 1, mid-follow, zoomed out + turned, imploded), `T011j-screenshot-hero-390-dark.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Preview one full cycle; 2. scroll over the 3D moves the page.
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Review.

### T011k [US1, US5] Overlay step labels with fade (RFC R10.1)

- Label to the right of the active component's trace pad (position via `transform`, clamped inside the figure), short leader to the pad; step change: fade out (`durations.panelExit`, `easings.panelExit`) then fade in (`durations.panelEnter`, `easings.panelEnter`) — from `xploder/motion` / its CSS vars, no literals; phones: label below the model, same fade; reduced motion: no fade (instant), poster path unchanged; a small permanent project line (`{name} — {tagline}`) stays under the model for AC2; static caption for SR unchanged.
- Checks: label within 12 px of its target offset per step at 1440; fade order (old opacity reaches 0 before new rises) sampled; CLS 0 full cycle at 390 + 1440; fold; home:probe all; snap 20/20; axe 0/0; Lighthouse ×2; draws 2; regress-hero 5/5; no-motion-literals; guards; cross-route; full suite.
- Evidence: `T011k-log-labels.txt`, `T011k-screenshot-label-{1440-light-step3,1440-dark-step5,390-light-step3}.png`.

### T011l [US4] Smooth zoom in the engine, opt-in + re-seal (RFC R10.2)

- Engine: a zoom tween mirroring the existing turn tween (`createTurnTween` uses `durations.implode`), enabled only when `useTeardownViewer({ smoothZoom: true })`; default behaviour byte-identical; reduced motion → instant. Hero opts in.
- Re-seal per S11.8 §4.2: generator `base` → this task's lever commit, note `Re-sealed in S11.9 at <sha>: <path> — opt-in camera zoom tween (R10)`, manifests regenerated by the generator, `approved-xploder-src.txt` lists exactly the changed engine files; `frozen-surface.test.ts` passes.
- Checks: engine unit tests (tween values over time, default path identical, reduced motion instant); project route unchanged (`site:probe --group drill`, workbench zoom still instant); hero zoom samples monotonic with no jump > 1 step-fraction per frame; draws 2; CLS 0; Lighthouse ×2; regress-hero 5/5; guards (updated frozen-surfaces rule); full suite.
- Evidence: `T011l-log-zoom.txt`, a 6-frame strip `T011l-screenshot-zoom-strip.png`.

### T011m [US6, US4] `site:probe` drill green again (CI group): new home Tab order + soft-navigation CLS 0

- **Found at T011l** (`evidence/T011m-log-drill-before.txt`): (1) `drill-tab-logical-order` / `drill-shift-tab-reverses` / `drill-no-trap` still encode the S10 home (footer contact links, no Contact section); the page's real order is right. (2) `drill-soft-nav-cls` = 0.146 on `/`: the footer shifts during home → project → back soft navigation. CLS 0 is AC4: fix the app, never relax the check.
- **Fix:** (1) update the drill expectations for `/` to the approved composition (… `hero:primary`, optional `hero:pause` when the live loop button is present, `card:<slug>`, `contact:email`, `contact:github`, `contact:linkedin`, `footer:home`, `footer:top`), giving the Contact section links stable keys the way other keys are derived; the hero pause button is included only when rendered (mode-aware, like S11.8 R9). (2) Find the soft-navigation shift's root cause by comparing with a `main` build (worktree at `main`, `pnpm build`, same probe) and fix it in the home code (likely suspects: the footer contact block hidden through `:has()`, the home-only snap `<style>`, the full-screen hero's min-height on soft navigation).
- **Checks:** `pnpm site:probe --serve apps/web/out --ci` all PASS (drill, cls, routes, nojs, reduced-motion) plus `--group hero,draws`; the `main` comparison recorded; regress-hero; home:probe; snap 20/20; full suite; guards. From now on `site:probe --ci` is part of every product task's checks.
- **Evidence:** `T011m-log-drill.txt` (before/after, root cause).

**After T011m: STOP for Murphy's review of T011k + T011l (+ T011m) together.**

### T011n [US4] Hero never stalls on a tour step (Murphy report; `evidence/T011n-log-stall-investigation.md`)

- **Failing tests first** (`home-hero-loop.test.tsx`, fake timers + fake viewer): (a) resume in a tour phase when the engine tour is already `ended` → the controller advances (capture → inspect, inspect → turn), it does not call play on the ended flow; (b) watchdog: the fake engine's tour stays `playing` on a step past `step start + beat × 1.5` (its clock never ticks) → the controller nudges with `pause()` then `play()` and the sequence continues; (c) no nudge while paused, hidden or off-screen; no nudge when steps advance on time.
- **Fix:** controller resume/advance logic per (a); a watchdog driven by `requestAnimationFrame` only while the hero is running and visible (no extra timers), comparing the last step-change time with `motion.durations.tourBeat` (tokens only).
- **Checks:** new tests pass (and failed before the fix), Playwright full cycles at 1440 + 390, a throttling simulation (CDP `Page.setWebLifecycleState` frozen → active mid-step, plus a manual long `setTimeout` hijack in a test page if needed), regress-hero 5/5, `site:probe --ci` PASS, home:probe all, snap 20/20, CLS 0 full cycle, Lighthouse ×1, guards, full suite.
- **Evidence:** `T011n-log-stall.txt`.

### T011o [US4] Smoothest zoom: one continuous glide in and out (Murphy, 2026-11-13)

- **Zoom-in:** issue all zoom steps in the same tick so the engine's opt-in tween glides once from 1 to the final zoom (no stepped "ratchet"); the follow starts after that single glide settles.
- **Zoom-out:** unchanged single glide (`zoomReset`), then a hold of `durations.tourBeat` before the first turn, so "zoomed out" reads as its own moment.
- **Checks:** zoom samples per frame monotonic with one rising segment for zoom-in and one falling segment for zoom-out (no plateaus between); controller tests updated; regress-hero, `site:probe --ci`, home:probe, snap, CLS 0 full cycle, Lighthouse ×1, guards, full suite.
- **Evidence:** `T011o-log-zoom.txt`, `T011o-screenshot-zoom-strip.png`.

### T011f–T011g

Specified after T011o (RFC R9/R10).

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
