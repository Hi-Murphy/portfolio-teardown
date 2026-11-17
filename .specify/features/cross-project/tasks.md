# Tasks: S17 Cross-project relationships

**Input:** `rfc.md` (approved, §11 Gate 1: all defaults + U1 + R1–R6), `spec.md`, `plan.md` in `.specify/features/cross-project/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1): `codex exec -p deepseek -C <worktree> -s danger-full-access "<prompt>" < /dev/null`.
- The **sandbox is off** for every task: checks build with Turbopack, run vitest on loopback or launch Chromium. The prompt limits writes to the task worktree and `/tmp/s17-checks`.
- Before each dispatch, probe the executor: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means *unavailable*, not *failed*: pause, report, and offer top-up / orchestrator on "go" / split.

**Escalation (kickoff Hard Rule 9):**
- Tier 1.5 (OpenRouter) is **DORMANT**: skipped, and the skip is recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage (`$CLAUDE_CONFIG_DIR/usage/usage.json`, flagged if ≥ 90 %), then finishes the task personally on "go".
- Each report states the finishing tier and any skip.

**Hard STOPs inside tasks (no workaround):**
- any `packages/xploder`, `tools/perf` or `.github` change would be needed (engine/tooling work = out of scope);
- `/` differs from `B1` in any byte;
- the gzip Δ exceeds 1,536 B;
- an AC check fails after one honest fix attempt (escalate with evidence; never reword or relax);
- the upgrade (T001) breaks a gate that a code change outside the allowed paths would be needed to fix.

**Usage pacing:** at ≥ 85 % of the 5h window, no new task starts. Finish and commit the current task, tick the ledger, report, then STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s17-cross-project`, on branch `task/s17-cross-project-tNNN`. The orchestrator reviews it, re-runs the check, and merges it back with `--no-ff`. A worktree is removed only after its merge (global rule).

**Format & rules (every task):**
- **Start of every check:** `set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project`.
- **End of every check:** `bash $F/guards.sh` (from T001 on), then `pnpm typecheck && pnpm lint && pnpm test`.
- **Test-first (Hard Rule 4):** each product task first commits the red test alone, with the failing output saved as `T<NNN>-log-red.txt` (non-zero exit). Then it commits the change, with `T<NNN>-log-green.txt`.
- **Bytes:** every task that changes client code ends with `node $F/bundle-gzip.mjs --diff /tmp/s17-checks/base-gzip.json apps/web/out` (built with `build-fixed.sh`) and logs the cumulative Δ.
- **No literals and no copy:** no motion, colour or transition class; no project string in code; only classes that already exist (R0/R4).
- **Never touch:** `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/site.json`, `packages/xploder/**`, `tools/perf/**`, `.github/**`.
- **Commits:** prefix `S17/TNNN:`, ending with the attribution line. Run `gitleaks dir` on new prose and evidence before each commit. Stage-boundary commits use `S17/stage-N:`.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☐ | | | |
| T002 | ☐ | | | |
| T003 | ☐ | | | |
| T004 | ☐ | | | |
| T005 | ☐ | | | |
| T006 | ☐ | | | |

---

## Phase G1 — Upgrade and baselines

### T001 [US5, U1] Next 16.4.6, feature tooling, and every baseline on `B1`

- **Seam:** framework version ↔ every gate. `B1` ↔ every "before" number (R1).
- **Files:** `apps/web/package.json` (`next` `^16.4.6`, `eslint-config-next` `^16.4.6`), `pnpm-lock.yaml`, `apps/web/AGENTS.md` (only if `next dev` rewrites it; R6). Feature tooling: `guards.sh`, `build-fixed.sh`, `bundle-gzip.mjs` (S16 copy, `BUDGET = 1536`), `home-bytes.sh` (plan.md "Project Structure").
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project
  # reference export at f0c2d37 (pre-upgrade), for the upgrade's own deltas
  git worktree add --detach /tmp/s17-ref f0c2d37
  (cd /tmp/s17-ref && pnpm install --frozen-lockfile && bash $OLDPWD/$F/build-fixed.sh --retry-on-notice /tmp/s17-checks/ref-out)
  git worktree remove --force /tmp/s17-ref
  # U1
  pnpm --filter web add next@^16.4.6 && pnpm --filter web add -D eslint-config-next@^16.4.6
  rm -rf node_modules apps/web/node_modules && pnpm install --frozen-lockfile 2>&1 | tee $E/T001-log-install.txt
  node -e "console.log(require('./apps/web/node_modules/next/package.json').version)" | tee $E/T001-log-version.txt   # 16.4.6
  pnpm audit --json > /tmp/s17-checks/audit.json || true; node -e '…list advisories…' /tmp/s17-checks/audit.json | tee $E/T001-log-audit.txt   # no "next" row
  # (orchestrator runs pnpm dev once, reviews any apps/web/AGENTS.md diff for secrets)
  for i in 1 2 3; do bash $F/build-fixed.sh /tmp/s17-checks/b1-out-$i; done 2>&1 | tee $E/T001-log-builds.txt
  ! grep -q SecurityFatalError $E/T001-log-builds.txt && echo NO-NOTICE
  cmp -s /tmp/s17-checks/b1-out-1/index.html /tmp/s17-checks/b1-out-3/index.html && echo B1-DETERMINISTIC
  bash $F/guards.sh | tee $E/T001-log-guard.txt
  # negative controls: one xploder byte, one tools/perf byte, one extra dependency → guards must FAIL
  printf ' ' >> packages/xploder/src/parse.ts; printf ' ' >> tools/perf/src/serve.ts
  if bash $F/guards.sh > /tmp/s17-checks/t001-neg.txt 2>&1; then echo NEG-CONTROL-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/parse.ts tools/perf/src/serve.ts
  grep FAIL /tmp/s17-checks/t001-neg.txt | tee -a $E/T001-log-guard.txt   # expect XPLODER, SURFACES-S2S8, TOOLS, ALLOWED-PATHS
  pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -30 | tee $E/T001-log-suite.txt
  # commit = B1, then baselines on B1
  cp -R /tmp/s17-checks/b1-out-3 /tmp/s17-checks/base-out
  pnpm build:fixtures && cp -R apps/web/out-fixtures /tmp/s17-checks/base-out-fixtures
  node $F/bundle-gzip.mjs --write /tmp/s17-checks/base-gzip.json /tmp/s17-checks/base-out | tee $E/T001-log-gzip-base.txt
  node $F/bundle-gzip.mjs --write /tmp/s17-checks/ref-gzip.json /tmp/s17-checks/ref-out > /dev/null
  node $F/bundle-gzip.mjs --diff /tmp/s17-checks/ref-gzip.json /tmp/s17-checks/base-out | tee $E/T001-log-upgrade-gzip.txt || true   # reported, not budgeted
  bash $F/home-bytes.sh /tmp/s17-checks/ref-out /tmp/s17-checks/base-out | tee $E/T001-log-upgrade-home-bytes.md || true   # the upgrade's own / changes, reported
  pnpm serve:out --dir /tmp/s17-checks/base-out --port 4717 & S=$!; sleep 3
  pnpm eager:probe --serve /tmp/s17-checks/base-out --route / --runs 2 --expect live-loop | tee $E/T001-log-eager-base.txt
  for r in / /projects /projects/websocket-inspector /projects/jev-toolkit; do
    pnpm perf:lighthouse http://127.0.0.1:4717$r --out /tmp/s17-checks/lh-b1$(echo $r | tr / -); done | tee $E/T001-log-lighthouse-b1.txt
  pnpm site:probe --serve /tmp/s17-checks/base-out --group cls,draws,routes | tee $E/T001-log-site-probe-b1.txt
  pnpm a11y:axe:site --serve /tmp/s17-checks/base-out --out /tmp/s17-checks/axe-b1 | tail -5 | tee $E/T001-log-axe-b1.txt
  kill $S; echo T001-OK
  ```
- **Evidence:** `T001-log-{install,version,audit,builds,guard,suite,gzip-base,upgrade-gzip,upgrade-home-bytes,eager-base,lighthouse-b1,site-probe-b1,axe-b1}.*`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the logs). Optional: `pnpm dev` on the branch and open any page to check that the upgrade did not change anything visible.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: `^16.4.6` for both packages; R1 baseline `B1`).
  2. Only if a gate fails on `B1` because of the upgrade: a decision (default proposal: STOP, report the failing gate, and offer to revert U1 out of S17 into its own `bug/next-16-4-6` PR).

---

## Phase G2 — Content

### T002 [US1, US2] Content patch + pass-through (fidelity red → green)

- **Seam:** canonical JSON ↔ generated module ↔ strict xploder schema.
- **Files:**
  - **Red commit:** the two JSON patches (RFC §2, exact bytes), `content-patch-check.mjs`, and the fidelity test with (b) adjusted (strips `relationships` itself). Red: (a)/(d) fail on the stale module and the old SHA.
  - **Green commit:** `content/projects/relationships.ts` (only `RELATIONSHIP_KINDS`, `RelationshipKind`, `RelationshipInput`, `ProjectSource`, `projectInput`), the converter's two project `typeImport`s → `{ typeName: 'ProjectSource', moduleSpecifier: './relationships' }`, `defineProject(projectInput(…))` in both project modules, and `pnpm --filter web content:convert`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project
  grep -Eq 'FAIL|failed' $E/T002-log-red.txt && echo RED-RECORDED
  node $F/content-patch-check.mjs | tee $E/T002-log-content-patch.txt          # both files: CONTENT-PATCH PASS
  git diff f0c2d37 -- .specify/content > $E/T002-log-content-diff.txt          # exactly the RFC §2 hunks
  pnpm --filter web exec vitest run test/content-fidelity.test.ts --reporter verbose 2>&1 | tee $E/T002-log-green.txt
  pnpm --filter web content:convert --check | tee -a $E/T002-log-green.txt
  bash $F/build-fixed.sh /tmp/s17-checks/t002-out
  node $F/bundle-gzip.mjs --diff /tmp/s17-checks/base-gzip.json /tmp/s17-checks/t002-out | tee $E/T002-log-gzip.txt
  bash $F/home-bytes.sh /tmp/s17-checks/base-out /tmp/s17-checks/t002-out | tee $E/T002-log-home-bytes.md   # all identical
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `T002-log-{red,green,content-patch,content-diff,gzip,home-bytes}.*`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `T002-log-content-diff.txt`: the only content change is one `relationships` block per file, with your approved notes.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the notes as approved at Gate 1).

---

## Phase G3 — Schema

### T003 [US2] Schema, named errors, resolver (red → green) + build failures

- **Seam:** content relationships ↔ the set of known projects, validated at build.
- **Files:**
  - **Red commit:** `test/relationships.test.ts` cases 1–4 (RFC §3.5), fidelity (f), (e3) and the completeness guard, `no-hand-copied-content.test.ts` + `relationships[].note`. Red: the exports are missing.
  - **Green commit:** `relationships.ts` + `RelationshipSchema` (from `LinkSchema` / `IdSchema` / `MetaSchema`), `createRelationshipsSchema` (self / unknown / duplicate), `RelationshipValidationError` (explicit `name`), `resolveConnections`; new `content/projects/connections.ts` (`CONNECTION_SOURCES`, `connectionsFor`); `no-{motion,color}-literals` lists + the two new files.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project
  grep -Eq 'FAIL|failed|Cannot find|is not exported' $E/T003-log-red.txt && echo RED-RECORDED
  pnpm --filter web exec vitest run test/relationships.test.ts test/content-fidelity.test.ts test/no-hand-copied-content.test.ts --reporter verbose 2>&1 | tee $E/T003-log-green.txt
  # one-off build failures (restored afterwards; git status must be clean)
  for case in unknown self; do
    node -e '
      const fs=require("fs"),p=".specify/content/jev-toolkit.json",j=JSON.parse(fs.readFileSync(p,"utf8"));
      j.relationships[0].to = process.argv[1]==="unknown" ? "no-such-project" : "jev-toolkit";
      fs.writeFileSync(p, JSON.stringify(j,null,2)+"\n");' $case
    pnpm --filter web content:convert
    if bash $F/build-fixed.sh /tmp/s17-checks/t003-$case-out > $E/T003-log-$case-build.txt 2>&1; then echo "BUILD-PASSED-$case"; exit 1; fi
    grep -E 'RelationshipValidationError' $E/T003-log-$case-build.txt
    git checkout -- .specify/content apps/web/content/projects && pnpm --filter web content:convert --check
  done
  grep -q 'Unknown relationship target "no-such-project" in project "jev-toolkit"' $E/T003-log-unknown-build.txt && echo UNKNOWN-NAMED
  grep -q 'Project "jev-toolkit" cannot have a relationship to itself' $E/T003-log-self-build.txt && echo SELF-NAMED
  test -z "$(git status --porcelain)" && echo RESTORED-CLEAN
  bash $F/build-fixed.sh /tmp/s17-checks/t003-out
  grep -c 'RelationshipSchema\|cannot have a relationship' -r /tmp/s17-checks/t003-out/_next/static || echo SCHEMA-NOT-IN-CLIENT   # server only
  node $F/bundle-gzip.mjs --diff /tmp/s17-checks/base-gzip.json /tmp/s17-checks/t003-out | tee $E/T003-log-gzip.txt
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `T003-log-{red,green,unknown-build,self-build,gzip}.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: read `T003-log-unknown-build.txt`. The build stops with a message that names the bad slug and the project.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the RFC §3.2 messages).

---

## Phase G4 — UI

### T004 [US1, US3, US4] `Connections` strip + mount (removal test red → green)

- **Seam:** resolved connections ↔ project route DOM, between the workbench and the footer.
- **Files:**
  - **Red commit:** `test/relationships.test.ts` case 5 (removal render with `react-dom/server`: full data → 1 strip per route; jev-toolkit entry deleted → jev 0 / wsi 1; mirror) and `test/connections-classes.test.ts` (R4). Red: the component is missing.
  - **Green commit:** `components/connections.tsx` (RFC §4.3 markup: `section[aria-labelledby=site-connections-title][data-site-connections]` > `h2#site-connections-title` "Connections" + `ul[aria-labelledby]` > `li[data-relationship-kind]` > `Link` (`min-h-11 min-w-11`, site focus ring) + `p` note; `null` when empty), the page mount after `<Workbench>`, and `no-{motion,color}-literals` + `components/connections.tsx`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project
  grep -Eq 'FAIL|failed|Cannot find' $E/T004-log-red.txt && echo RED-RECORDED
  pnpm --filter web exec vitest run test/relationships.test.ts test/connections-classes.test.ts --reporter verbose 2>&1 | tee $E/T004-log-green.txt
  bash $F/build-fixed.sh /tmp/s17-checks/t004-out
  bash $F/home-bytes.sh /tmp/s17-checks/base-out /tmp/s17-checks/t004-out | tee $E/T004-log-home-bytes.md        # / + stylesheet identical (STOP otherwise)
  cmp /tmp/s17-checks/base-out/sitemap.xml /tmp/s17-checks/t004-out/sitemap.xml && echo SITEMAP-IDENTICAL | tee -a $E/T004-log-home-bytes.md
  for s in jev-toolkit websocket-inspector; do echo "$s $(grep -o 'data-site-connections' /tmp/s17-checks/t004-out/projects/$s.html | wc -l)"; done | tee $E/T004-log-strips.txt   # 1 each
  # one-off removal build: delete jev-toolkit's entry → jev 0, wsi 1; restore
  node -e 'const fs=require("fs"),p=".specify/content/jev-toolkit.json",j=JSON.parse(fs.readFileSync(p,"utf8"));delete j.relationships;fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")'
  pnpm --filter web content:convert && bash $F/build-fixed.sh /tmp/s17-checks/t004-removal-out
  for s in jev-toolkit websocket-inspector; do echo "$s $(grep -o 'data-site-connections' /tmp/s17-checks/t004-removal-out/projects/$s.html | wc -l)"; done | tee $E/T004-log-removal-build.txt   # jev 0, wsi 1
  git checkout -- .specify/content apps/web/content/projects && pnpm --filter web content:convert --check && test -z "$(git status --porcelain)" && echo RESTORED-CLEAN
  node $F/bundle-gzip.mjs --diff /tmp/s17-checks/base-gzip.json /tmp/s17-checks/t004-out | tee $E/T004-log-gzip.txt
  # screenshots: both routes × 390/1440 × light/dark, strip element + viewport (connections-probe --shots-only lands in T005; here pnpm evidence)
  pnpm serve:out --dir /tmp/s17-checks/t004-out --port 4718 & S=$!; sleep 3
  for s in jev-toolkit websocket-inspector; do for c in light dark; do
    pnpm evidence http://127.0.0.1:4718/projects/$s --color-scheme $c --full-page --out /tmp/s17-checks/ev-$s-$c; done; done
  kill $S
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `T004-log-{red,green,home-bytes,strips,removal-build,gzip}.*`; `T004-screenshot-{jev,wsi}-{mobile,desktop}-{light,dark}.png` + `T004-meta-*.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the eight screenshots: the strip sits under the teardown, above the footer, on both pages, in both palettes.
  2. Optional, hands-on: `pnpm dev`, open both project pages, scroll to the end, and follow each link.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC §4.3 layout with existing classes only).
  2. Only if you dislike the look: say what to change. It must stay within classes that already exist, or `/` stops being byte-identical (R0).

---

## Phase G5 — A11y and layout

### T005 [US3, US4] Accessibility, CLS, 390 px, sweep re-run

- **Seam:** the strip ↔ assistive tech, layout stability and the S16 label footprint.
- **Files:** `connections-probe.mjs` (feature-local). For both routes × 390/1440 × light/dark it checks:
  - DOM order: workbench < strip < footer; the strip is inside `main`.
  - Roles and names: `region` "Connections", `list` "Connections", `li` count = JSON entries.
  - Link text = target `meta.name`, and the deny-list `/\b(here|click|link|more)\b/i` does not match.
  - Tab walk: last workbench focusable → strip link → first footer link.
  - `:focus-visible` outline: solid, ≥ 2 px.
  - Link box ≥ 44×44.
  - `scrollWidth ≤ clientWidth`.
  - The strip rect against every visible `[data-xploder-overlay]` / lettering label rect (strict SAT, the S16 predicate): 0 intersections.
  - Element shots, plus a focus shot.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project
  bash $F/build-fixed.sh /tmp/s17-checks/t005-out && pnpm build:fixtures && cp -R apps/web/out-fixtures /tmp/s17-checks/t005-out-fixtures
  pnpm serve:out --dir /tmp/s17-checks/t005-out --port 4719 & S1=$!
  pnpm serve:out --dir /tmp/s17-checks/t005-out-fixtures --port 4720 & S2=$!; sleep 3
  node $F/connections-probe.mjs http://127.0.0.1:4719 --out /tmp/s17-checks/probe | tee $E/T005-log-connections-probe.md   # PASS, 0 intersections
  cp /tmp/s17-checks/probe/*.png $E/ && cp /tmp/s17-checks/probe/summary.json $E/T005-log-connections-probe.json
  pnpm a11y:axe:site --serve /tmp/s17-checks/t005-out --out /tmp/s17-checks/axe | tail -8 | tee $E/T005-log-axe.txt              # serious 0, critical 0
  pnpm site:probe --serve /tmp/s17-checks/t005-out --group cls,draws --out /tmp/s17-checks/site | tee $E/T005-log-site-probe.txt  # CLS 0 × 4 routes, draws 2
  # S16 sweep re-run (R5): the T012 matrix + controls, read-only reuse
  L=.specify/features/label-system
  node $L/label-matrix.mjs $PWD http://127.0.0.1:4719 --out /tmp/s17-checks/sweep --routes projects,home
  node $L/label-matrix.mjs $PWD http://127.0.0.1:4720 --out /tmp/s17-checks/sweep --routes fixtures
  node $L/label-sweep.mjs /tmp/s17-checks/sweep --json $E/T005-log-sweep.json > $E/T005-log-sweep.md          # Cells 2052, Hit pairs 0
  { node $L/label-matrix.mjs $PWD http://127.0.0.1:4719 --control --routes projects,home --out /tmp/s17-checks/ctl
    node $L/label-matrix.mjs $PWD http://127.0.0.1:4720 --control --routes fixtures --out /tmp/s17-checks/ctl; } | tee $E/T005-log-sweep-control.txt   # seed detected ×3
  kill $S1 $S2
  bash $F/guards.sh && pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `T005-log-connections-probe.{md,json}`, `T005-screenshot-strip-*`, `T005-screenshot-focus-*`, `T005-log-axe.txt`, `T005-log-site-probe.txt` (the CLS table), `T005-log-sweep.{md,json}` (every rectangle), `T005-log-sweep-control.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the focus screenshots: the ring is visible on the link in both palettes.
  2. Optional, hands-on: on a project page, press Tab past the teardown controls. The next stop is the strip link, then the footer.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the S16 sweep predicate and cells, reused unchanged).

---

## Phase G6 — Gates

### T006 [US4, US5] Final gates, PR, AC self-check

- **Seam:** the final head ↔ every AC and CI.
- **Files:** `evidence/AC-selfcheck.md` (one row per AC: verdict + evidence links, plus the execution-tier table); the draft PR (body ends with the attribution line).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s17-checks .specify/features/cross-project/evidence; E=.specify/features/cross-project/evidence; F=.specify/features/cross-project
  pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -30 | tee $E/T006-log-suite.txt
  bash $F/build-fixed.sh /tmp/s17-checks/head-out
  bash $F/home-bytes.sh /tmp/s17-checks/base-out /tmp/s17-checks/head-out | tee $E/T006-log-home-bytes.md           # AC4
  cmp /tmp/s17-checks/base-out/sitemap.xml /tmp/s17-checks/head-out/sitemap.xml && echo SITEMAP-IDENTICAL | tee -a $E/T006-log-home-bytes.md
  node $F/bundle-gzip.mjs --diff /tmp/s17-checks/base-gzip.json /tmp/s17-checks/head-out | tee $E/T006-log-gzip.txt   # AC5 ≤ 1,536
  pnpm serve:out --dir /tmp/s17-checks/head-out --port 4721 & S=$!; sleep 3
  pnpm eager:probe --serve /tmp/s17-checks/head-out --route / --runs 2 --expect live-loop | tee $E/T006-log-eager.txt   # vs T001-log-eager-base.txt
  for r in / /projects /projects/websocket-inspector /projects/jev-toolkit; do
    pnpm perf:lighthouse http://127.0.0.1:4721$r --out /tmp/s17-checks/lh$(echo $r | tr / -)
    pnpm perf:weight http://127.0.0.1:4721$r --out /tmp/s17-checks/w$(echo $r | tr / -); done | tee $E/T006-log-perf.txt
  pnpm site:probe --serve /tmp/s17-checks/head-out --group cls,draws,routes,hero | tee $E/T006-log-site-probe.txt
  kill $S
  bash $F/guards.sh | tee $E/T006-log-guards.txt
  git push -u origin task/s17-cross-project && gh pr create --draft …          # then wait for CI
  gh pr checks --required --watch | tee $E/T006-ci.txt                            # 7/7 required green
  echo T006-OK
  ```
- **Evidence:** `T006-log-{suite,home-bytes,gzip,eager,perf,site-probe,guards}.*`, `T006-ci.txt` (+ run URLs), `AC-selfcheck.md`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `AC-selfcheck.md`: six rows, each MET with links (or an escalation with evidence).
  2. On the Vercel preview: open both project pages and follow each strip link; open `/` and check that the hero still starts by itself.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "S17 done" / "merge" when satisfied (default: the PR stays a draft until you say so).
