# Tasks: S03 Perf Gates + Evidence Loop

**Input:** `rfc.md` (approved, §9), `spec.md`, `plan.md` in `.specify/features/perf-evidence/`
**Executor:** DeepSeek Flash seat (tier 1). **Escalation (RFC §9, S02 policy):** tier 2 (OpenRouter) is **skipped** (`OPENROUTER_API_KEY` unset). If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage and waits for "go". It never takes over automatically. Each report states the finishing tier and any skip.
**Usage pacing (RFC §9.6):** each phase group starts in a fresh 5h window. Before each task the orchestrator checks usage. At ≥ 85% of the 5h window, no new task starts: finish and commit the current task, tick the ledger, report, STOP.

## Ledger (resume point — update at every task boundary)

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
| T014 | ☐ | | | |

Resume prompt for a fresh session: *"Read `.specify/KICKOFF-S03.md` and `.specify/features/perf-evidence/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."*

## Format & rules (apply to every task)

- `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task. Stories: **US1** reviewer trusts the PR · **US2** seat produces evidence · **US3** engine slice author.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:** each task runs in a fresh worktree from the slice branch `task/s03-perf-evidence`, on branch `task/s03-t0NN-<slug>`. After the check passes, merge back into the slice branch without squashing. Commit message: `S03/T0NN: <title>`. Remove the worktree only after the merge.
- **Orchestrator-only steps** (marked ⚑): `git push`, opening/closing PRs, `gh api` writes. Flash prepares; the orchestrator executes.
- **Frozen-file guard (every task):** `git diff --quiet HEAD -- .specify/KICKOFF-S03.md .specify/KICKOFF-S02.md .specify/KICKOFF.md .specify/slices && echo FROZEN-OK` must print `FROZEN-OK`.
- **xploder guard (every task):** `git diff --quiet 303db16 -- packages/xploder && echo XPLODER-OK` must print `XPLODER-OK` (303db16 = Stage 1 commit; S2 public API frozen).
- **Every check also runs:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Never:** add deps other than `lighthouse`, `playwright`, `@types/node` (and copies of existing dev deps) in `tools/perf` · change `packages/xploder` · add a runtime/CLI/env override to any threshold in `budgets.ts` · use `@lhci/cli`, `temporary-public-storage` or any external upload · add a Vercel token or any secret · touch Vercel/DNS settings · add analytics · write motion literals in `apps/web` · put private hostnames, IPs or tokens anywhere (preview `*.vercel.app` URLs and `127.0.0.1` are fine) · print `GITHUB_TOKEN` · run `specify init` · use bare `git stash`.
- **Node TS rules (`tools/perf`):** `"type": "module"`; relative imports carry `.ts`; erasable syntax only (no `enum`, no `namespace`, no parameter properties); run with plain `node file.ts`.
- **Evidence** goes to `.specify/features/perf-evidence/evidence/T0NN-*.{txt,png,json}`. Throwaway scripts live in `/tmp/s03-checks/`. Run `mkdir -p /tmp/s03-checks .specify/features/perf-evidence/evidence` first, and run every check under `set -euo pipefail`.
- **Reference URLs:** `S02_PREVIEW=https://portfolio-teardown-git-task-s02-contracts-tokens-murphy-3c4d.vercel.app/` (public, stable) · `PROD=https://portfolio-teardown.vercel.app/`.

---

## Phase G1: Local tooling (US2) → STOP for Murphy after T005

### T001 [US2] `tools/perf` package scaffold
- **Seam:** pnpm workspace ↔ new package ↔ root scripts/ignores.
- **Files:**
  - `pnpm-workspace.yaml`: add `'tools/*'`.
  - `tools/perf/package.json`: `name: "perf-tools"`, `private`, `version: "0.0.0"`, `type: "module"`; deps `lighthouse ^13.6.0`, `playwright ^1.64.1`; devDeps `vitest ^5.0.5`, `@types/node ^24.19.2`, `typescript ^5.9.3`, `eslint ^9.39.5` (+ whatever `packages/xploder/eslint.config.mjs` imports); scripts `typecheck: tsc --noEmit`, `lint: eslint .`, `test: vitest run`.
  - `tools/perf/tsconfig.json`: extends `../../tsconfig.base.json`; `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit`, `types: ["node"]`, include `src`, `test`.
  - `tools/perf/eslint.config.mjs`: copy of the xploder config.
  - `tools/perf/src/cli/evidence.ts`: `--help` prints a usage stub and exits 0 (real logic lands in T005).
  - root `package.json` scripts: `evidence`, `perf:lighthouse`, `perf:weight`, `fps`, `fps:calibrate`, `serve:out`, `build:fixtures` per plan.md "CLI contracts". Scripts whose CLI doesn't exist yet point at their future file. Only `evidence --help` is exercised now.
  - `.gitignore`: add `.evidence/` and `out-fixtures/`.
  - `tools/perf/test/smoke.test.ts`: one trivial assertion.
- **Check:**
  ```sh
  set -euo pipefail; pnpm install && pnpm typecheck && pnpm lint && pnpm test 2>&1 | tee /tmp/s03-checks/t001.txt
  node tools/perf/src/cli/evidence.ts --help && pnpm evidence --help
  git check-ignore -v .evidence/x out-fixtures/x
  pnpm --filter perf-tools exec playwright --version && echo T001-OK
  ```
- **Evidence:** `evidence/T001-scaffold.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `pnpm evidence --help` prints usage from the repo root (default: agent log is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; deps approved in RFC §9.2).

### T002 [US2] Core modules: exit codes, args, budgets, browser, reach, static server
- **Seam:** shared CLI runtime ↔ Playwright Chromium ↔ `apps/web/out`.
- **Files:** `tools/perf/src/{exit-codes,args,budgets,browser,reach,serve,log}.ts`, `src/cli/serve.ts`, tests `test/{args,reach,serve}.test.ts`. Signatures and behaviour exactly per plan.md "Module contracts". `browser.ts` reads `screenEmulationMetrics` and `userAgents` from `lighthouse/core/config/constants.js`. `run(main)` helper in `log.ts` maps `CliError` → exit code.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools exec playwright install chromium
  pnpm --filter perf-tools test 2>&1 | tee /tmp/s03-checks/t002.txt
  pnpm build && (pnpm serve:out --port 4173 & echo $! > /tmp/s03-checks/serve.pid); sleep 2
  curl -sSI -H 'Accept-Encoding: gzip' http://127.0.0.1:4173/ | tee -a /tmp/s03-checks/t002.txt | grep -qi 'content-encoding: gzip'
  curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4173/nope | grep -q 404
  kill "$(cat /tmp/s03-checks/serve.pid)"; echo T002-OK
  ```
- **Evidence:** `evidence/T002-core.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: test log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T003 [P] [US1] Lighthouse runner + gate CLI
- **Seam:** Lighthouse 13 Node API ↔ Playwright browser via CDP port ↔ `budgets.ts`.
- **Files:** `src/lighthouse.ts`, `src/summary-md.ts`, `src/cli/lighthouse-gate.ts`, `test/lighthouse.test.ts` + `test/fixtures/lhr-*.json` (synthetic minimal LHRs with only the fields used). Summary schema per plan.md "Artifact formats". The step summary is written only when `GITHUB_STEP_SUMMARY` is set.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools test lighthouse 2>&1 | tee /tmp/s03-checks/t003.txt
  pnpm build && (pnpm serve:out --port 4173 & echo $! > /tmp/s03-checks/serve.pid); sleep 2
  pnpm perf:lighthouse http://127.0.0.1:4173/ --out /tmp/s03-checks/t003-lh 2>&1 | tee -a /tmp/s03-checks/t003.txt
  node -e "const s=require('/tmp/s03-checks/t003-lh/lighthouse-summary.json');if(!s.pass||s.runs.length!==3)process.exit(1)"
  set +e; pnpm perf:lighthouse http://127.0.0.1:9/ ; rc=$?; set -e; test $rc -eq 3
  kill "$(cat /tmp/s03-checks/serve.pid)"; echo T003-OK
  ```
- **Evidence:** `evidence/T003-lighthouse.txt`, `evidence/T003-lighthouse-summary.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The summary JSON reads clearly: thresholds vs measured, 3 runs, median marked (default: accept the sample).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T004 [P] [US1] Weight measurement + gate CLI
- **Seam:** CDP Network domain ↔ mobile/desktop profiles ↔ `WEIGHT_BUDGET_BYTES`.
- **Files:** `src/weight.ts`, `src/cli/weight-gate.ts`, `test/weight.test.ts` + `test/fixtures/net-events-*.json`. Context options: profile from `PROFILES`, `serviceWorkers: 'block'`. CDP `Network.enable` + `Network.setCacheDisabled({cacheDisabled:true})`. Quiet = no in-flight request for 1000 ms after `load`, cap 30 s.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools test weight 2>&1 | tee /tmp/s03-checks/t004.txt
  pnpm perf:weight "$S02_PREVIEW" --out /tmp/s03-checks/t004-w 2>&1 | tee -a /tmp/s03-checks/t004.txt
  node -e "const w=require('/tmp/s03-checks/t004-w/weight.json');const m=w.profiles.mobile.totalBytes;console.log('mobile',m,'desktop',w.profiles.desktop.totalBytes);if(!w.pass||m<141000||m>156000)process.exit(1)"
  echo T004-OK
  ```
  (141,000–156,000 = ±5% of the RFC probe's 148,577 B.)
- **Evidence:** `evidence/T004-weight.txt`, `evidence/T004-weight.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The top-requests list matches what you'd expect for the landing page (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T005 [US2] Evidence CLI (AC3)
- **Seam:** screenshots + Lighthouse runner + meta ↔ `.evidence/` output contract.
- **Files:** `src/evidence.ts`, `src/cli/evidence.ts` (full), `test/evidence.test.ts`. Flags, artifact set, stability waits and exit codes per RFC D6 / plan.md. `--out` not git-ignored → stderr warning only. A step failure → remaining steps still run, exit 5.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools test evidence 2>&1 | tee /tmp/s03-checks/t005.txt
  pnpm evidence "$S02_PREVIEW" 2>&1 | tee -a /tmp/s03-checks/t005.txt
  d=$(ls -dt .evidence/*/ | head -1); ls -la "$d" | tee -a /tmp/s03-checks/t005.txt
  for f in screenshot-mobile.png screenshot-desktop.png lighthouse-summary.json lighthouse-report.json meta.json; do test -s "$d$f"; done
  node -e "const m=require('$PWD/$d/meta.json');if(m.exitCode!==0||m.steps.some(s=>!s.ok))process.exit(1)"
  test -z "$(git status --porcelain)"
  set +e; pnpm evidence ftp://x; a=$?; pnpm evidence http://127.0.0.1:9/; b=$?; set -e
  echo "usage=$a unreachable=$b" | tee -a /tmp/s03-checks/t005.txt; test $a -eq 2 -a $b -eq 3; echo T005-OK
  ```
- **Evidence:** `evidence/T005-evidence.txt`, `evidence/T005-screenshot-mobile.png`, `evidence/T005-screenshot-desktop.png`, `evidence/T005-meta.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Run `pnpm exec playwright install chromium` once in `tools/perf`, then `pnpm evidence https://portfolio-teardown.vercel.app/` on your Mac and open the folder it prints (default: optional; agent log is sufficient).
  2. The two screenshots look like the real page at phone and desktop sizes (default: review the committed copies).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G1 validation, then "approved" to start G2 (default: G2 waits for your message, in a fresh 5h window).

**⛔ STOP G1** — report T001–T005 with evidence, tiers and usage.

---

## Phase G2: CI gates (US1) → STOP for Murphy after T008

### T006 [US1] Preview resolver + build id = commit SHA
- **Seam:** GitHub REST (statuses, PR comments) ↔ Vercel bot comment ↔ deployed HTML.
- **Files:** `src/preview.ts`, `src/cli/resolve-preview.ts` (supports `--production --url <u> --sha <s>`: steps 1 and 3 only), `src/cli/assert-absent.ts`, `test/preview.test.ts` + `test/fixtures/vercel-comment.md` (sanitized: replace project id/team id/scope with `example` values; keep the `[vc]:` format). `apps/web/next.config.ts`: `generateBuildId` per plan.md (keep the current object shape; the phase-function refactor comes in T009).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools test preview 2>&1 | tee /tmp/s03-checks/t006.txt
  S=0123456789abcdef0123456789abcdef01234567
  VERCEL_GIT_COMMIT_SHA=$S pnpm --filter web build && grep -q "$S" apps/web/out/index.html
  pnpm build && ! grep -q "$S" apps/web/out/index.html
  GITHUB_TOKEN=$(gh auth token) node tools/perf/src/cli/resolve-preview.ts --repo Hi-Murphy/portfolio-teardown --pr 2 --sha "$(git rev-parse 688127d)" --skip-sha-check 2>&1 | tee -a /tmp/s03-checks/t006.txt | grep -q 'task-s02-contracts-tokens'
  echo T006-OK
  ```
  (`--skip-sha-check` is a **test-only** flag for PRs built before T006. It is documented as such and is never used in `perf.yml`. A unit test asserts that `perf.yml` doesn't contain it.)
- **Evidence:** `evidence/T006-preview.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; push granted at G1).

### T007 [US1] `perf.yml` gate jobs + draft PR (AC1, AC2 green path)
- **Seam:** GitHub Actions ↔ resolver ↔ gate CLIs ↔ PR checks.
- **Files:** `.github/workflows/perf.yml` with jobs `lighthouse` and `weight` exactly per plan.md "CI flow" (fps/fixture jobs come in T011).
- ⚑ **Orchestrator:** push `task/s03-perf-evidence`. Open a **draft** PR to `main` titled `S03: perf gates + evidence loop`, with a body summarizing the slice and ending with the attribution line.
- **Check:**
  ```sh
  set -euo pipefail; gh pr checks <PR> --watch --fail-fast=false 2>&1 | tee /tmp/s03-checks/t007.txt
  gh pr checks <PR> --json name,state | node -e "const c=JSON.parse(require('fs').readFileSync(0));for(const n of ['perf-gate: lighthouse (mobile)','perf-gate: weight (< 3 MB)','build (typecheck, lint, test, build)','secrets (gitleaks)']){const x=c.find(i=>i.name===n);if(!x||x.state!=='SUCCESS'){console.error('not green',n);process.exit(1)}}"
  gh run download <run-id> -n perf-lighthouse -D /tmp/s03-checks/t007-art && echo T007-OK
  ```
- **Evidence:** `evidence/T007-ci.txt`, `evidence/T007-ci.png` (checks list), `evidence/T007-lighthouse-summary.json`, `evidence/T007-weight.json`, step-summary excerpt.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the draft PR: both `perf-gate:` checks are green and their summaries show measured vs threshold (default: screenshot in evidence is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; PR granted at G1).

### T008 [US1] Deliberate-violation demos (AC1, AC2 red path)
- **Seam:** `budgets.ts` ↔ gate exit 6 ↔ PR check state.
- ⚑ **Orchestrator:** branch `test/s03-gate-violation` from the slice head. Commit A: `LCP_MAX_MS = 1`. Push and open a draft PR (base `task/s03-perf-evidence`). Wait for the checks. Commit B: revert A plus `WEIGHT_BUDGET_BYTES = 1_000`. Push and wait. Then close the PR and delete the remote branch.
- **Check:**
  ```sh
  # after run A: lighthouse FAILURE, weight SUCCESS; after run B: weight FAILURE, lighthouse SUCCESS (gh pr checks --json name,state captured per run)
  gh pr view <scratch PR> --json state | grep -q CLOSED
  git fetch origin && ! git ls-remote --exit-code origin test/s03-gate-violation
  git diff --quiet <T007-merge-SHA> task/s03-perf-evidence -- tools/perf/src/budgets.ts && echo T008-OK   # slice budgets untouched by the demo
  ```
- **Evidence:** `evidence/T008-violation-A.txt` (+ `.png`), `evidence/T008-violation-B.txt` (+ `.png`), each with the exit-6 log excerpt and step summary.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The two red runs each fail only their own gate, and the scratch PR is closed (default: evidence screenshots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G2 validation, then "approved" for G3 (default: waits for your message, fresh 5h window).

**⛔ STOP G2**

---

## Phase G3: FPS + fixture (US3) → STOP for Murphy after T011

### T009 [US3] Calibration fixture route + exclusion mechanism
- **Seam:** `next.config.ts` phase/env gate ↔ App Router `pageExtensions` ↔ static export output.
- **Files:** `apps/web/next.config.ts` (phase function, `pageExtensions` gate, `VERCEL` guard, fixture `distDir`, keep `generateBuildId`) · `apps/web/app/fixtures/fps-calibration/{page.fixture.tsx,main-lane.tsx,fixture.module.css}` · `apps/web/test/fixture-exclusion.test.ts` · root `build:fixtures` script (or `tools/perf/src/cli/build-fixtures.ts` fallback, per plan.md "Fixture build") · `.github/workflows/ci.yml`: one step after `pnpm build` running the exclusion test. First verify the `distDir` behaviour and record which variant shipped in the evidence.
- **Check:**
  ```sh
  set -euo pipefail; pnpm build && pnpm --filter web exec vitest run test/fixture-exclusion.test.ts 2>&1 | tee /tmp/s03-checks/t009.txt
  ! grep -rl 'data-perf-fixture' apps/web/out
  pnpm build:fixtures && grep -rl 'data-perf-fixture' out-fixtures | tee -a /tmp/s03-checks/t009.txt
  pnpm --filter web exec vitest run test/fixture-exclusion.test.ts   # positive control now active
  set +e; PERF_FIXTURES=1 VERCEL=1 pnpm --filter web build; rc=$?; set -e; test $rc -ne 0
  pnpm --filter web test   # motion-literal scanner still green
  echo T009-OK
  ```
- **Evidence:** `evidence/T009-fixture.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `pnpm dev` → open `/fixtures/fps-calibration` in the Orca browser: two lanes of boxes slide back and forth smoothly (default: optional).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010 [US3] FPS harness + calibration CLI (AC4 headless)
- **Seam:** CDP tracing ↔ trace parser ↔ fixture build.
- **Files:** `src/fps.ts`, `src/cli/fps.ts`, `src/cli/fps-calibrate.ts`, `test/fps.test.ts` + `test/fixtures/mini-trace.json` (≤ 200 events, recorded from a real run and trimmed). Algorithm per RFC D7.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools test fps 2>&1 | tee /tmp/s03-checks/t010.txt
  pnpm fps:calibrate --out /tmp/s03-checks/t010-fps 2>&1 | tee -a /tmp/s03-checks/t010.txt
  node -e "const r=require('/tmp/s03-checks/t010-fps/fps.json');console.log(r.fps,r.rafFps,r.droppedFrames);if(!r.pass||r.fps<54||r.fps>66)process.exit(1)"
  echo T010-OK
  ```
- **Evidence:** `evidence/T010-fps.txt`, `evidence/T010-fps.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `fps.json` shows ≈ 60 with the rAF cross-check close by (default: accept the log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T011 [US3] CI jobs: fps calibration + fixture exclusion
- **Seam:** `perf.yml` ↔ fixture build on ubuntu ↔ preview/prod 404 checks.
- **Files:** `.github/workflows/perf.yml`: jobs `fps-calibration` and `fixture-exclusion` per plan.md (`PRODUCTION_URL` env; `push: main` branch of the fixture job).
- ⚑ **Orchestrator:** push the slice branch.
- **Check:**
  ```sh
  set -euo pipefail; gh pr checks <PR> --watch --fail-fast=false 2>&1 | tee /tmp/s03-checks/t011.txt
  # 'perf: fps calibration' SUCCESS with fps in [54,66] in its log; 'perf: fixture exclusion' SUCCESS with "404" for the preview URL
  echo T011-OK
  ```
- **Evidence:** `evidence/T011-ci.txt` (fps value from the CI log, preview 404 line), `evidence/T011-fps-ci.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Both informational checks are green on the PR (default: log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G3 validation, then "approved" for G4 (default: waits for your message, fresh 5h window). If CI FPS is outside 54–66: escalation with traces (AC4's headless proof stands on T010; the CI job is informational).

**⛔ STOP G3**

---

## Phase G4: Contract & ship (US1, US2) → STOP (Stage 3 end-contract) after T014

### T012 [US2] `.specify/EVIDENCE.md` + discoverability (AC5)
- **Seam:** evidence contract ↔ README/AGENTS.md ↔ `exit-codes.ts`.
- **Files:** `.specify/EVIDENCE.md` (sections 1–6 per RFC D10; the exit-code table exactly as `EXIT_DESCRIPTIONS`) · `README.md` "Evidence & perf gates" section (commands + link) · `AGENTS.md` §2 (`tools/perf`), §3 (perf commands), §4 (bullet: "Evidence follows `.specify/EVIDENCE.md`.") · `tools/perf/test/exit-codes.test.ts` gains the doc-table equality test · `tools/perf/test/preview.test.ts` gains "perf.yml never uses `--skip-sha-check`".
- **Check:**
  ```sh
  set -euo pipefail; pnpm test 2>&1 | tee /tmp/s03-checks/t012.txt
  grep -n 'EVIDENCE.md' README.md AGENTS.md | tee -a /tmp/s03-checks/t012.txt
  test $(grep -c 'EVIDENCE.md' README.md) -ge 1 -a $(grep -c 'EVIDENCE.md' AGENTS.md) -ge 1 && echo T012-OK
  ```
- **Evidence:** `evidence/T012-docs.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `.specify/EVIDENCE.md`: the task-type → artifact table and the escalation rules are what you want to bind future slices to (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T013 [US1] Required-checks ruleset + full CI green (AC6)
- **Seam:** GitHub ruleset ↔ PR check contexts.
- ⚑ **Orchestrator** (granted at G4, RFC §9.3): push the slice branch. Then:
  ```sh
  gh api -X POST repos/Hi-Murphy/portfolio-teardown/rulesets --input - <<'JSON'
  {"name":"main: required checks","target":"branch","enforcement":"active",
   "conditions":{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}},
   "bypass_actors":[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}],
   "rules":[{"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,
     "required_status_checks":[{"context":"build (typecheck, lint, test, build)"},{"context":"secrets (gitleaks)"},
       {"context":"perf-gate: lighthouse (mobile)"},{"context":"perf-gate: weight (< 3 MB)"}]}}]}
  JSON
  ```
- **Check:**
  ```sh
  set -euo pipefail; gh api repos/Hi-Murphy/portfolio-teardown/rulesets --jq '.[].id' | head -1 | xargs -I{} gh api repos/Hi-Murphy/portfolio-teardown/rulesets/{} | tee /tmp/s03-checks/t013-ruleset.json
  gh pr checks <PR> --watch --fail-fast=false 2>&1 | tee /tmp/s03-checks/t013.txt
  gh pr checks <PR> --json name,state --jq '[.[]|select(.state!="SUCCESS")]|length' | grep -qx 0 && echo T013-OK
  ```
- **Evidence:** `evidence/T013-ruleset.json`, `evidence/T013-ci.txt`, `evidence/T013-ci.png`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Settings → Rules shows "main: required checks" with the 4 contexts and admin bypass (default: JSON evidence).
  2. The PR page lists all checks green and "required" on the four (default: screenshot).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; granted at G4).

### T014 [US1] [US2] [US3] AC1–AC6 self-check
- **Seam:** evidence ↔ acceptance criteria.
- **Files:** `evidence/AC-selfcheck.md`: one row per AC with the verbatim AC text, a verdict and links to the evidence files/CI runs, including both T008 violation demos. AC4's prod row says **"pending merge: filled from the `perf: fixture exclusion` main-push run"**.
- **Check:**
  ```sh
  set -euo pipefail; for f in $(grep -o 'evidence/[A-Za-z0-9._-]*' .specify/features/perf-evidence/evidence/AC-selfcheck.md | sort -u); do test -e ".specify/features/perf-evidence/$f"; done
  git diff --stat 303db16 -- packages/xploder | wc -l | grep -qx 0 && echo T014-OK
  ```
- **Evidence:** `evidence/AC-selfcheck.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final S03 validation against the self-check table (default: per your runbook).
  2. After you merge: `perf: fixture exclusion` on the `main` push is green (404 on prod) (default: I attach that log when you tell me it ran, or you read it yourself).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Merge decision: you merge after validation, unless you ask me to (RFC §9.5).

**⛔ STOP G4 (Stage 3 end-contract)**

---

## Dependencies & execution order

```text
T001 ─▶ T002 ─┬─▶ T003 [P] ─┬─▶ T005 ─⛔G1
              └─▶ T004 [P] ─┘
T002 ─▶ T006 ─▶ T007 ─▶ T008 ─⛔G2                       (G2 after Murphy's G1 validation)
T001 ─▶ T009 ─▶ T010 ─▶ T011 (needs T007's workflow) ─⛔G3
T005, T010 ─▶ T012 ─▶ T013 ─▶ T014 ─⛔G4
```

## Task ↔ AC coverage

| AC | Proven by | Supporting |
|---|---|---|
| AC1 | T007 (green on the PR), T008 run A (red demo) | T002, T003, T006 |
| AC2 | T007 (green), T008 run B (red demo) | T002, T004, T006 |
| AC3 | T005 | T001, T002, T003, T012 (doc/code exit table) |
| AC4 | T010 (headless 60 ±10%), T009 (out/ scan + guard), T011 (preview 404, CI fps), post-merge prod 404 | T002 (serve) |
| AC5 | T012 | — |
| AC6 | T013 | T007, T011 |
