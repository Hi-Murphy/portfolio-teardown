# Tasks: S18 Agent-fleet teardown (third project)

**Input:** `rfc.md` (approved, §12 Gate 1: all defaults, revision 1 of 2, C3, R-A–R-F), `spec.md`, `plan.md` in `.specify/features/agent-fleet/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1): `codex exec -p deepseek -C <worktree> -s danger-full-access "<prompt>" < /dev/null`.
- The **sandbox is off** for every task: checks build with Turbopack, run vitest on loopback or launch Chromium. The prompt limits writes to the task worktree and `/tmp/s18-checks`.
- Before each dispatch, probe the executor: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means *unavailable*, not *failed*: pause, report, and offer top-up / orchestrator on "go" / split.

**Escalation (kickoff Hard Rule 10):**
- Tier 1.5 is **DORMANT**: skipped, and the skip is recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage (`$CLAUDE_CONFIG_DIR/usage/usage.json`, flagged if ≥ 90 %), then finishes the task personally on "go".
- Each report states the finishing tier and any skip.

**Hard STOPs inside tasks (no workaround):**
- any `packages/xploder`, `.specify/content/**`, `tech-registry.ts`, relationship or S3-listed `tools/perf` change would be needed;
- G1 > 0, G2 unexempted > 0, or a hit that a ledger rule could only cover by naming agent-fleet content;
- a G4 row is UNSOURCED (Q3: Murphy/Merlin amend the JSON; the orchestrator never edits it);
- an AC check fails after one honest fix attempt (escalate with evidence; never reword or relax);
- a new utility class would be needed (stylesheet must stay byte-identical).

**Usage pacing:** at ≥ 85 % of the 5h window, no new task starts. Finish and commit the current task, tick the ledger, report, then STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s18-agent-fleet`, on branch `task/s18-agent-fleet-tNNN`. The orchestrator reviews it, re-runs the check, and merges it back with `--no-ff`. A worktree is removed only after its merge (global rule).

**Format & rules (every task):**
- **Start of every check:** `set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet`.
- **End of every check:** `bash $F/guards.sh` (from T001 on), then `pnpm typecheck && pnpm lint && pnpm test`. (Until T002 is merged, `pnpm test` has exactly the 4 known completeness reds; T001 logs them and asserts the count is 4.)
- **Red then green:** each product task first commits the red test alone, with the failing output in `T<NNN>-log-red.txt` (non-zero exit), then the change with `T<NNN>-log-green.txt`.
- **No copy in code:** every visible string comes from the JSON; no motion, colour or transition literal; no new class.
- **Never touch:** `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, `packages/xploder/**`, `apps/web/content/tech-registry.ts`, `apps/web/content/projects/connections.ts`, `pnpm-lock.yaml`.
- **Evidence paths (R-J):** absolute local paths in logs are normalised to `<worktree>` / `<home>` before commit (`EVIDENCE-PATHS-OK`).
- **Commits:** prefix `S18/TNNN:`, ending with the attribution line. Before each commit, run `gitleaks dir` and `node apps/web/scripts/redaction-scan.ts content` on new prose and evidence (R-C). Stage-boundary commits use `S18/stage-3-<group>:`.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (canary red 23 → green 27/27; G1 0; G2 S17 base 0 unexempted; seeded 3/3; guards 11/11 + 5 controls; R-G/R-H/R-I) | 1 (Flash, 2 dispatches; both stops were spec gaps, not failures) + orchestrator (prose-guard scope, 1 type fix) | evidence/T001-* | e7ae0f1 |
| T002 | ☑ (red: module missing → green; web 391 / xploder 727 / perf 309, 0 fail; build prerenders `/projects/agent-fleet`; G1 0; guards 12/12) | 1 (Flash, 1 dispatch) + orchestrator (path normalisation R-J) | evidence/T002-* | dbeb1aa |
| T003 | ☑ (red → green; empty-render 72/72 cells + 20/20 controls; site-probe cards 43/43; CSS identical; 16 screenshots; guards 12/12) | 1 (Flash, 1 dispatch) | evidence/T003-* | 54113f3 |
| T004 | ☑ (route 4/14/3, panels 14/14, flows 3/3; sitemap 5; OG 5 × 1200×630 stable over 2 builds, existing 2 identical to base; JSON-LD 1 per project page ×3; 404; site-probe teardown/routes/draws/cards PASS; perf.yml steps) | 1 (Flash, 1 dispatch) | evidence/T004-* | 5f7a307 |
| T005 | ☑ (G1 0; G2 in `pnpm build`, 0 unexempted on all 5 routes; differential = 6 new geometry floats, all X1; seeded 3/3 exit 6; fixture skip; G4 all SOURCED after Merlin `eda5c82` + A/B/D sources; G5 53 strings signed, 0 flags; R-K, R-L) | 1 (Flash, G2 part) + orchestrator (G4 map, G5 read, prose mode) | evidence/T005-*, source-map.md | 5e6e61d |
| T006 | ☐ | — | evidence/T006-* | — |
| T007 | ☐ | — | evidence/T007-*, AC-selfcheck.md | — |

---

## Group A — Scanner and registration

### T001 [US4, FR-004] Redaction scanner, canary red → green, G1, feature tooling and baselines

- **Seam:** F-pattern table ↔ content and build text. It lands **before** the route is wired (brief executor rule, R-D).
- **Files:**
  - **Tooling:** `guards.sh` (plan "Guards"), `build-fixed.sh` (S18 id).
  - **Red commit:** `apps/web/test/redaction-scan.test.ts`, plus `apps/web/scripts/redaction-scan.ts` as a **stub** exporting `PATTERNS`, `LEDGER`, `scanContent`, `scanBuild` with `scanContent`/`scanBuild` returning `[]`. The tests:
    - (1) G3 content path: canary in a temp JSON `description` → exactly 3 hits, classes `{F1, F3, F4}`.
    - (2) G3 build path: canary written into temp copies of a real `.html`, `.txt` and `.js` from `base-out` → 3 unexempted per file.
    - (3) Ledger negatives: the RFC §5.3 must-not lists for X1–X4 → each reported, unexempted.
    - (4) Ledger positives: one sample per rule from `T000` §4 (`-.27.38.01.53`, `?27:5:26`, `mask-image`, `a.internal.interaction`, int64 bound) → exempted by the named rule.
    - (5) G1: `scanContent(.specify/content/agent-fleet.json)` → 0.
    - (6) Pattern table equals the brief's F1/F2/F3/F5/F6 regex sources verbatim (string compare).
    - The canary is assembled at run time: `'192.0.2.' + 44`, `'gh' + 'p_' + 'CANARY0canary0'`, `'github.com/' + 'canary-owner/canary-private-repo'`.
  - **Green commit:** the real scanner per RFC §5.1–§5.3 and R-A: patterns, X1–X7 (X5 reads `site.json` identity at run time), `scanContent` (JSON string leaves or plain text), `scanBuild` (every `.html/.txt/.js/.css/.xml/.json` under the dir, per-route grouping by file path), CLI `content <file>` | `build <outDir>` (exit 0 clean / 6 hits / 2 usage; prints class, file, offset and a 4-char prefix only).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  bash $F/build-fixed.sh /tmp/s18-checks/base-out                                   # 33e2ba1 product code
  pnpm test 2>&1 | grep -E 'FAIL|Tests ' | tee $E/T001-log-baseline-reds.txt          # exactly the 4 known completeness reds
  grep -Eq 'failed' $E/T001-log-red.txt && echo RED-RECORDED                           # stub commit: (1)(2)(3)(4) red
  pnpm --filter web exec vitest run test/redaction-scan.test.ts --reporter verbose 2>&1 | tee $E/T001-log-canary-green.txt
  # mutation control: drop the F3 ghp_ entry → the canary must go red, then restore
  sed -i.bak "/'ghp_'/d" apps/web/scripts/redaction-scan.ts
  ! pnpm --filter web exec vitest run test/redaction-scan.test.ts > /tmp/s18-checks/t001-mut.txt 2>&1 && echo MUTATION-RED | tee $E/T001-log-mutation.txt
  mv apps/web/scripts/redaction-scan.ts.bak apps/web/scripts/redaction-scan.ts
  node apps/web/scripts/redaction-scan.ts content .specify/content/agent-fleet.json | tee $E/T001-log-g1.txt   # 0 hits, exit 0
  gitleaks dir apps/web/test/redaction-scan.test.ts --redact --no-banner 2>&1 | tee $E/T001-log-gitleaks-canary.txt   # no leaks
  bash $F/guards.sh | tee $E/T001-log-guard.txt
  # guard negative controls (one byte each, then restore) → XPLODER, FROZEN, S3-TOOLS, ALLOWED-PATHS FAIL
  bash $F/guards.sh && pnpm typecheck && pnpm lint && echo T001-OK
  ```
- **Evidence:** `T001-log-{baseline-reds,red,canary-green,mutation,g1,gitleaks-canary,guard}.txt` (the red and green logs are AC4's "red then green").
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open `T001-log-red.txt` and `T001-log-canary-green.txt`: the same test fails against the stub and passes 3/3 against the scanner.
  2. Skim the ledger rules in `redaction-scan.ts` (a dozen lines): none names agent-fleet content.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: §5 design as approved at Gate 1).

---

### T002 [US1, FR-001] Convert and register (the 4 baseline reds → green)

- **Seam:** canonical JSON ↔ generated module ↔ `PROJECTS` / `PROJECT_SOURCES`.
- **Files:**
  - **Red commit:** test edits only: `content-fidelity.test.ts` (agent-fleet row + R-E e2 fix), `content-model.test.ts` (three-project index; agent-fleet card model `chips: []`; AC1 case: ids set-equal to the JSON, counts 4/14/3, max component name ≤ 14 and layer name ≤ 16, every flow step resolves), `tools/perf/test/project-sources.test.ts` (slug + negative-control replace target). Red: the module is missing.
  - **Green commit:** converter row; `pnpm --filter web content:convert`; `content/projects/agent-fleet.ts`; `index.ts` import + append-last; `tools/perf/src/project-sources.ts`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  grep -Eq 'FAIL|failed|Cannot find' $E/T002-log-red.txt && echo RED-RECORDED
  git status --short apps/web/content | tee $E/T002-log-convert.txt                    # only agent-fleet.source.ts new; other generated files unchanged
  pnpm --filter web exec vitest run test/content-fidelity.test.ts test/content-model.test.ts --reporter verbose 2>&1 | tee $E/T002-log-green.txt
  pnpm --filter perf-tools exec vitest run test/project-sources.test.ts 2>&1 | tee -a $E/T002-log-green.txt
  bash $F/build-fixed.sh /tmp/s18-checks/t002-out && ls /tmp/s18-checks/t002-out/projects/agent-fleet.html
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T002-OK          # 0 failures; the 4 baseline reds are green
  ```
- **Evidence:** `T002-log-{red,convert,green}.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing visual yet. Optionally run `pnpm dev` and open `http://localhost:3000/projects/agent-fleet`.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

**→ STOP A** (ledger, `S18/stage-3-A:` commit, report).

---

## Group B — Rendering and surfaces

### T003 [US3, FR-003] Empty rendering: no chip row, no Source section

- **Seam:** zero techs/links ↔ card, panel and header markup.
- **Files:**
  - **Red commit:** `apps/web/test/tech-chip-list-empty.test.tsx`: render the compact and list `ProjectCard` for `cardModel(agentFleet)` → no `aria-label="Tech"` and no `<ul` with zero children; a websocket-inspector control still has 1 list and 4 items. Plus `tools/perf/test/site-probe.test.ts` cases: expected 0 with 0 labels → pass, expected 0 with 1 label → fail, existing 1–4 cases unchanged. Red: the empty list renders, and `evaluateCardChips` has no expected-count input.
  - **Green commit:** `TechChipList` → `null` for zero chips (RFC §4.1). `site-probe.ts`: the expected chip count derives from the source's techs (unique, capped at 4); for 0, `ul[aria-label="Tech"]` must be absent. Feature `empty-render-probe.mjs` (RFC §4.3 table, every row with its positive control).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  grep -Eq 'failed' $E/T003-log-red.txt && echo RED-RECORDED
  bash $F/build-fixed.sh /tmp/s18-checks/t003-out
  for c in $(cd /tmp/s18-checks/base-out && find _next -name '*.css'); do cmp /tmp/s18-checks/base-out/$c /tmp/s18-checks/t003-out/$c; done && echo CSS-IDENTICAL | tee $E/T003-log-css.txt
  pnpm serve:out --dir /tmp/s18-checks/t003-out --port 4318 & SRV=$!
  node $F/empty-render-probe.mjs http://localhost:4318/ --out $E | tee $E/T003-log-empty-counts.txt   # writes T003-log-empty-counts.json + T003-screenshot-*.png
  pnpm site:probe http://localhost:4318/ --group cards 2>&1 | tee $E/T003-log-site-probe-cards.txt
  kill $SRV
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `T003-log-{red,green,css,empty-counts,site-probe-cards}.*`, `T003-log-empty-counts.json`; screenshots `T003-screenshot-{card-home,card-projects,panel-approval-gate,panel-orchestrator}-{mobile,desktop}-{light,dark}.png` (16).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. **Gate 1 visual (brief "Murphy dependencies"):** look at the 16 screenshots and say whether "empty" reads as intentional. (Default recorded: yes.)
  2. Check `T003-log-empty-counts.json`: every agent-fleet count 0, every control > 0.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing unless the screenshots read as broken. Default: proceed.

---

### T004 [US1, US2, FR-001, FR-002] Route behaviour and fleet-wide surfaces

- **Seam:** `PROJECTS` ↔ every derived surface (list, home, 404, sitemap, OG, JSON-LD, perf CI).
- **Files:** feature `route-probe.mjs`: 4/14/3 DOM counts via `site-probe`'s `expectedTeardownCounts`, each of 14 components opened (panel surface visible, heading = component name), each of 3 flows played to its end (tour state advances through every `path` step). `.github/workflows/perf.yml`: `Lighthouse gate (project route: agent-fleet)` and `Weight gate (project route: agent-fleet)`, mirroring the jev-toolkit steps (Q6).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  rm -rf apps/web/.next apps/web/out; bash $F/build-fixed.sh /tmp/s18-checks/t004-out-1
  rm -rf apps/web/.next apps/web/out; bash $F/build-fixed.sh /tmp/s18-checks/t004-out-2
  grep -o '<loc>[^<]*</loc>' /tmp/s18-checks/t004-out-1/sitemap.xml | tee $E/T004-log-sitemap.txt; test $(grep -c '<loc>' $E/T004-log-sitemap.txt) -eq 5
  node -e '…for each of 5 PNGs: IHDR width/height, bytes ≤ 307200, sha256 in out-1 and out-2…' | tee $E/T004-log-og.txt   # 5 rows, 1200×630, equal hashes
  pnpm --filter web seo:expect && pnpm seo:probe --out-dir apps/web/out --expect apps/web/out-seo-expect.json --out /tmp/s18-checks/seo 2>&1 | tee $E/T004-log-seo-probe.txt   # JSON-LD SoftwareApplication on 3 project routes
  pnpm serve:out --dir /tmp/s18-checks/t004-out-1 --port 4318 & SRV=$!
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4318/projects/no-such-project | tee $E/T004-log-404.txt   # 404
  node $F/route-probe.mjs http://localhost:4318/projects/agent-fleet --out $E | tee $E/T004-log-route-probe.txt   # 4/14/3, 14/14, 3/3
  pnpm site:probe http://localhost:4318/ --group cards 2>&1 | tee $E/T004-log-cards.txt   # 3 cards on / and /projects
  pnpm evidence http://localhost:4318/ --out $E/T004-home --full-page                       # home 2×2 grid
  kill $SRV
  cp /tmp/s18-checks/t004-out-1/og/projects/agent-fleet.png $E/T004-og-agent-fleet.png; cp /tmp/s18-checks/t004-out-1/og/projects.png $E/T004-og-projects.png; cp /tmp/s18-checks/t004-out-1/og/home.png $E/T004-og-home.png
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `T004-log-{sitemap,og,seo-probe,404,route-probe,cards}.txt`, `T004-log-route-probe.json`, `T004-og-*.png`, `T004-home/`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at `T004-og-agent-fleet.png`, `T004-og-projects.png` (three silhouettes) and the home screenshot (2×2 grid).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the `perf.yml` steps per Q6).

**→ STOP B.**

---

## Group C — Sanitization gates

### T005 [US4, FR-004] G2 in the build, differential, G4 source map, G5 signed read

- **Seam:** production export ↔ the redaction contract; every claim ↔ its source.
- **Files:** `apps/web/package.json` `scripts.build` → `pnpm og:build && next build && node scripts/redaction-scan.ts build out` (G2 skips with a log line when `PERF_FIXTURES=1`, R-B). Feature `g2-diff.mjs`. `evidence/source-map.md` (RFC §5.6 format, one row per number and factual sentence). `evidence/T005-log-g5-read.md` (one row per string: path → clean / flag + reason, signed by the orchestrator with date and commit).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  bash $F/build-fixed.sh /tmp/s18-checks/t005-out; grep -A40 'redaction-scan' /tmp/s18-checks/t005-out.log | tee $E/T005-log-g2.txt   # per route: raw / exempt per rule / unexempted 0
  node $F/g2-diff.mjs /tmp/s18-checks/base-out /tmp/s18-checks/t005-out | tee $E/T005-log-g2-diff.txt   # new distinct = geometry floats, all X1
  # build-level negative: seed the canary into a copy of the export → exit 6, 3 unexempted
  cp -R /tmp/s18-checks/t005-out /tmp/s18-checks/t005-seeded && node -e '…append run-time canary to projects/agent-fleet.html…' /tmp/s18-checks/t005-seeded
  ! node apps/web/scripts/redaction-scan.ts build /tmp/s18-checks/t005-seeded > /tmp/s18-checks/t005-seeded.txt; tail -5 /tmp/s18-checks/t005-seeded.txt | tee $E/T005-log-g2-seeded.txt   # exit 6, 3/3
  PERF_FIXTURES=1 pnpm --filter web build 2>&1 | grep 'G2 skipped' | tee $E/T005-log-fixture-skip.txt
  node apps/web/scripts/redaction-scan.ts content .specify/content/agent-fleet.json | tee $E/T005-log-g1.txt   # 0
  for f in $E/source-map.md $E/T005-log-g5-read.md; do node apps/web/scripts/redaction-scan.ts content $f; done   # 0 each (R-C)
  grep -c '| UNSOURCED |' $E/source-map.md | grep -qx 0 && echo G4-COMPLETE                                  # else STOP (Q3)
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `T005-log-{g1,g2,g2-diff,g2-seeded,fixture-skip}.txt`, `source-map.md`, `T005-log-g5-read.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `source-map.md`: every number and factual sentence has a source you recognise.
  2. Read the rendered `/projects/agent-fleet` end to end (brief G5: "Murphy reads the rendered page at the gate").
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. **Q5 pointers (required before this task starts; no default):** one line each, with no hostnames, paths, ids or vendor names, for "15 revisions", "12 scheduled jobs" and "2 hosts". Example shape: "vault: revision log, 15 entries as of 2026-11-17".
  2. **P1:** keep "The fleet runs for weeks without attention" with a source, or remove it from `agent-fleet.json` yourself or via Merlin (Q3). Default: it is listed UNSOURCED and the task STOPs until one of those happens.

**→ STOP C.**

---

## Group D — Accessibility and gates

### T006 [US5, FR-005] Accessibility pass on the new route

- **Seam:** a route without a tech row or source section ↔ the a11y floor (S08).
- **Files:** `route-probe.mjs --keyboard` mode (Tab path from the skip link; 14 panel opens by keyboard with focus on the heading, Tab to close, Esc, focus return; Flows tab by arrow keys; each of 3 flows started, paused and stepped by keyboard; focus-ring screenshot per stop; tap-target scan of every interactive element at 390).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  bash $F/build-fixed.sh /tmp/s18-checks/t006-out
  pnpm serve:out --dir /tmp/s18-checks/t006-out --port 4318 & SRV=$!
  pnpm a11y:axe:site http://localhost:4318/ --out /tmp/s18-checks/axe 2>&1 | tee $E/T006-log-axe.txt   # all routes incl. agent-fleet, light + dark: 0 serious / 0 critical
  node $F/route-probe.mjs http://localhost:4318/projects/agent-fleet --axe-states --out $E | tee -a $E/T006-log-axe.txt   # panel open + flow playing, both palettes
  node $F/route-probe.mjs http://localhost:4318/projects/agent-fleet --keyboard --out $E | tee $E/T006-log-keyboard.txt   # 14/14, 3/3, focus visible, tap ≥ 44
  kill $SRV
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `T006-log-{axe,keyboard}.txt`, `T006-log-axe.json`, `T006-log-tap-targets.json`, `T006-screenshot-focus-*.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: Tab through `/projects/agent-fleet` on your machine and open one panel with the keyboard.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing.

---

### T007 [US6, FR-006, FR-007] Gates, AC7 bytes, sweep, PR, self-check

- **Seam:** the whole site ↔ every unchanged gate; the two existing projects ↔ base.
- **Files:** feature `bytes-report.mjs` (C3: `/`, `/projects`, `404` normalised diff = the added card only; both existing project pages' own HTML and RSC files identical after `/_next/static/chunks/<hash>.js` masking; changed-chunk proof; OG of existing projects identical; `data-site-connections` markup equal; gzip Δ). `evidence/AC-selfcheck.md`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s18-checks .specify/features/agent-fleet/evidence; E=.specify/features/agent-fleet/evidence; F=.specify/features/agent-fleet
  bash $F/build-fixed.sh /tmp/s18-checks/head-out
  node $F/bytes-report.mjs /tmp/s18-checks/base-out /tmp/s18-checks/head-out | tee $E/T007-log-bytes.md
  pnpm serve:out --dir /tmp/s18-checks/head-out --port 4318 & SRV=$!
  for r in '' projects projects/websocket-inspector projects/jev-toolkit projects/agent-fleet; do
    pnpm perf:lighthouse "http://localhost:4318/$r" --categories performance,accessibility --out $E/T007-lighthouse-${r//\//-}; done   # median of 3, ≥ 95/95 ×5
  pnpm site:probe http://localhost:4318/ --group cls,draws 2>&1 | tee $E/T007-log-cls-draws.txt   # CLS 0 everywhere; 2 draw calls on agent-fleet
  for r in '' projects projects/agent-fleet; do pnpm perf:weight "http://localhost:4318/$r" --out $E/T007-weight-${r//\//-}; done   # < 3 MB
  pnpm eager:probe http://localhost:4318/ 2>&1 | tee $E/T007-log-eager.txt                        # hero reveals with zero interaction
  kill $SRV
  pnpm --filter xploder exec vitest run test/label-sweep.test.ts test/label-pass-parity.test.ts test/lettering-obstacles.test.ts 2>&1 | tee $E/T007-log-sweep.txt   # sealed, unchanged: 0 intersections
  # Q7 report-only: out-of-tree copy of the sweep harness on agent-fleet → $E/T007-log-sweep-agent-fleet.txt (not a gate)
  bash $F/guards.sh | tee $E/T007-log-guards.txt
  # PR (draft) → CI; record the run URL and 7/7 required contexts in $E/T007-ci.md
  ```
- **Evidence:** `T007-log-{bytes,cls-draws,eager,sweep,sweep-agent-fleet,guards}.*`, `T007-lighthouse-*`, `T007-weight-*`, `T007-ci.md`, `AC-selfcheck.md` (AC1–AC7 with the numbers listed in the kickoff Stage 3 end-contract, G5 signature, the REV1/C3 readings named).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The Vercel preview: `/`, `/projects`, `/projects/agent-fleet` (light and dark, phone and desktop).
  2. `AC-selfcheck.md`, then say "S18 done" / "merge" when satisfied.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. The final merge word (brief "Murphy dependencies"). Default: no merge without it.

**→ STOP D (end of Stage 3).**
