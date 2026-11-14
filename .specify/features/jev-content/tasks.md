# Tasks: S13 Project Data #2 — jev-toolkit (wiring)

**Input:** `rfc.md` (approved, §11 Gate 1: all defaults), `spec.md`, `plan.md` in `.specify/features/jev-content/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek -C <worktree> -s danger-full-access "<prompt>" < /dev/null`). The **sandbox is off** for every task: each check builds with Turbopack, runs vitest with loopback or launches Chromium, which the Codex sandbox blocks. The prompt limits writes to the task worktree and `/tmp/s13-checks`. Before each phase group's first dispatch, probe the executor: `cd /tmp && codex exec -p deepseek -s read-only --skip-git-repo-check "Reply with the single word READY." < /dev/null`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: pause, report, offer top-up / orchestrator on "go" / split.

**Escalation (kickoff Hard Rule 9):**
- Tier 1.5 (OpenRouter) is **DORMANT**: skipped and recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage (`$CLAUDE_CONFIG_DIR/usage/usage.json`, flagged if ≥ 90%), then executes the task personally on Murphy's "go".
- Each report states the finishing tier and any skip.
- A failing `UI-UNCHANGED-OK` or `ALLOWED-PATHS-OK` guard is never "fixed" by widening the guard: it is a Hard Rule 4 STOP + escalation with evidence.

**Usage pacing:** at ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s13-jev-content` on branch `task/s13-jev-content-tNNN`. The orchestrator reviews it, re-runs the check, and merges it back into `task/s13-jev-content` with `--no-ff`. A worktree is removed only after its merge (global rule).

**Evidence doctrine (kickoff Hard Rule 8):** every claim attaches a machine artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`); every screenshot/perf bundle has its `meta.json`. Budgets come from `tools/perf/src/budgets.ts` and are never changed.

**Format & rules (every task):**
- Every check starts with `set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence`.
- Every check ends with `bash .specify/features/jev-content/guards.sh` (from T001 on) and `pnpm typecheck && pnpm lint && pnpm test`. Tasks that touch content or tooling that reads `out/` also run `pnpm build`.
- No product strings in code outside the generated content modules. No colour or motion literals.
- Never touch `packages/xploder/**`, `apps/web/{app,components,seo}/**`, `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, dev/fixture routes, or CI files other than `perf.yml`.
- Commit message prefix: `S13/TNNN:`, ending with the attribution line. Run `gitleaks dir` on new prose before committing.
- Stage boundary commits on the slice branch use `S13/stage-N:`.

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (10 guards; negative control FAIL XPLODER + SURFACES-S2S8 + UI-UNCHANGED + ALLOWED-PATHS; base OG WSI = 74e0a609…; base weight / 452 728 · /projects 200 285 · WSI 199 733 B mobile; main-diff self-test 0 B) | 1 (Flash, sandbox off); orchestrator re-ran guards + self-diff | evidence/T001-log-{guard,base-og-hashes,base-weight}.txt | 17cbf24 |
| T002 | ☑ (red: module missing; green 13/13 = 2 rows × 6 + completeness; JSON sha 8a1eff72… = header; WSI/site sources byte-unchanged) | 1 (Flash, sandbox off); orchestrator added drift proof (hand edit → (a)(b)(c) fail) | evidence/T002-log-fidelity-{red,green}.txt, T002-log-drift-proof.txt | 9a1c0e0 |
| T003 | ☐ | | | |
| T004 | ☐ | | | |
| T005 | ☐ | | | |
| T006 | ☐ | | | |
| T007 | ☐ | | | |
| T008 | ☐ | | | |
| T009 | ☐ | | | |
| T010 | ☐ | | | |

---

## Phase G1 — Fidelity first (STOP after T002)

### T001 [US5] Guards + base snapshot (`3b829d0`)

- **Seam:** branch ↔ frozen surfaces and the no-special-casing fence; base export ↔ every "before" number.
- **Files:**
  - `.specify/features/jev-content/guards.sh`: the plan.md "Guards" block in S11's `guard NAME cmd` style. Prints `FAIL <name>` and exits 1 on any failure.
  - `.specify/features/jev-content/main-diff.sh`: a copy of `.specify/features/m1-validation/main-diff.sh` with `BASE_COMMIT=3b829d0`, cache `/tmp/s13-checks/base-out-3b829d0`, out `/tmp/s13-checks/main-diff`, and pages `projects/websocket-inspector.html` (expect 0-byte diff) and `projects.html` (diff reported, not asserted here), plus one option `--head-out <dir>` (default `apps/web/out`) so the script can self-test base against base. The normalisation is unchanged.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  bash .specify/features/jev-content/guards.sh | tee /tmp/s13-checks/t001.txt
  # negative controls: one frozen file, one UI file
  printf ' ' >> packages/xploder/src/index.ts; printf ' ' >> apps/web/components/project-card.tsx
  if bash .specify/features/jev-content/guards.sh >/tmp/s13-checks/t001-neg.txt 2>&1; then echo NEG-CONTROL-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/index.ts apps/web/components/project-card.tsx
  grep FAIL /tmp/s13-checks/t001-neg.txt | tee -a /tmp/s13-checks/t001.txt   # expect XPLODER, UI-UNCHANGED, ALLOWED-PATHS
  # base export
  git worktree add --detach /tmp/s13-base 3b829d0
  (cd /tmp/s13-base && pnpm install --frozen-lockfile && pnpm build 2>&1 | grep 'png' ) | tee -a /tmp/s13-checks/t001.txt
  rm -rf /tmp/s13-checks/base-out-3b829d0 && cp -R /tmp/s13-base/apps/web/out /tmp/s13-checks/base-out-3b829d0
  (cd /tmp/s13-checks/base-out-3b829d0 && find og -name '*.png' -exec shasum -a 256 {} \; | sort -k2) | tee $E/T001-log-base-og-hashes.txt
  pnpm serve:out --dir /tmp/s13-checks/base-out-3b829d0 --port 4174 & SERVE=$!; sleep 3
  for r in "" projects projects/websocket-inspector; do
    pnpm perf:weight "http://127.0.0.1:4174/$r" --out "/tmp/s13-checks/base-weight-${r//\//-}" | tee -a $E/T001-log-base-weight.txt
  done
  kill $SERVE; git worktree remove --force /tmp/s13-base
  bash .specify/features/jev-content/main-diff.sh --no-build --base-out /tmp/s13-checks/base-out-3b829d0 --head-out /tmp/s13-checks/base-out-3b829d0 | tee -a /tmp/s13-checks/t001.txt  # base vs base → 0 bytes
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (all guards OK + the negative controls' three FAILs) · `T001-log-base-og-hashes.txt` (WSI = `74e0a609…bed9cd3`) · `T001-log-base-weight.txt` (3 routes, mobile + desktop).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; the negative controls show the guards bite).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: base = `3b829d0`; frozen-surface baseline = `3aee8fc`).

### T002 [US2] Fidelity test (red → green) + conversion

- **Seam:** canonical JSON ↔ generated module (S1, S2, S4; T-a, T-d).
- **Files:** `apps/web/test/content-fidelity.test.ts` (table-driven, plan.md "Conversion + fidelity"; completeness guard over `.specify/content/*.json` vs rows + `CONTENT_FILES`), then `apps/web/scripts/convert-content.ts` (+1 row), generated `apps/web/content/projects/jev-toolkit.source.ts`, `apps/web/content/projects/jev-toolkit.ts`, `apps/web/content/tech-registry.ts` (+ `nodejs`), `apps/web/test/no-{motion,color}-literals.test.ts` (S08 lists). **Not** `content/projects/index.ts` (that is T003).
- **Order:** (1) edit the test only, run it, save the failing output as the red log (it must exit non-zero); (2) convert and wire; (3) run green.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  grep -Eq 'FAIL|failed' $E/T002-log-fidelity-red.txt && echo RED-RECORDED
  pnpm --filter web content:convert --check | tee /tmp/s13-checks/t002.txt
  head -1 apps/web/content/projects/jev-toolkit.source.ts | tee -a /tmp/s13-checks/t002.txt
  shasum -a 256 .specify/content/jev-toolkit.json | tee -a /tmp/s13-checks/t002.txt   # equals the header
  pnpm --filter web exec vitest run test/content-fidelity.test.ts --reporter verbose 2>&1 | tee $E/T002-log-fidelity-green.txt
  grep -c '✓' $E/T002-log-fidelity-green.txt   # 2 rows × 6 + guard
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-fidelity-red.txt` · `T002-log-fidelity-green.txt` (both rows: strict equality, parsed equality, `--check`, SHA header, two negative controls; guard).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: open `T002-log-fidelity-green.txt` and see both projects listed with every assertion passing (default: the agent's review).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: registry entry per Q1).

**STOP (G1).** Report: red/green logs, the SHA header, the tier per task.

---

## Phase G2 — Route (STOP after T005)

### T003 [US1] Register the project (S3) + content-model test

- **Seam:** `PROJECTS` ↔ every generic consumer (route, cards, sitemap, OG, metadata, JSON-LD).
- **Files:** `apps/web/content/projects/index.ts` (append `jevToolkit`), `apps/web/test/content-model.test.ts` (T-c), `apps/web/test/content-fidelity.test.ts` (completeness guard + `PROJECT_SLUGS`).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm build 2>&1 | tee /tmp/s13-checks/t003-build.txt | grep -E 'png|jev-toolkit'
  test -f apps/web/out/projects/jev-toolkit.html && echo ROUTE-EXPORTED
  grep -o '<loc>[^<]*</loc>' apps/web/out/sitemap.xml | tee -a /tmp/s13-checks/t003.txt
  pnpm --filter web exec vitest run test/content-model.test.ts test/content-fidelity.test.ts --reporter verbose | tee -a /tmp/s13-checks/t003.txt
  pnpm site:probe --serve apps/web/out --ci --out /tmp/s13-checks/t003-site-probe-ci   # existing CI groups stay green with 2 cards
  cp /tmp/s13-checks/t003.txt $E/T003-log-register.txt
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-register.txt` (export file present, sitemap `<loc>` list with 4 URLs, tests, `site:probe --ci` summary).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: `pnpm dev`, open `http://localhost:3000/projects/jev-toolkit` in Orca's browser (default: skip until G2 STOP).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: order per RFC §4: websocket-inspector first).

### T004 [US1, US5] Probes project-generic (P1, P2 route iteration)

- **Seam:** `tools/perf` ↔ the project list.
- **Files:** `tools/perf/src/project-sources.ts`, `tools/perf/test/project-sources.test.ts` (slugs = `.specify/content/*.json` − `site.json`, in `PROJECTS` order read from `apps/web/content/projects/index.ts` imports), `tools/perf/src/site-probe.ts` (`SITE_ROUTES` + `PROJECT_PATH` users iterate `PROJECT_SOURCES`; `drill` stays on `PROJECT_SOURCES[0]`), `tools/perf/test/site-probe.test.ts` (keep green; add a case for the route list).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm --filter perf-tools exec vitest run test/project-sources.test.ts test/site-probe.test.ts | tee /tmp/s13-checks/t004.txt
  pnpm build
  pnpm site:probe --serve apps/web/out --group routes,cls,nojs,reduced-motion,draws,drill --out $E/T004-probe
  node -e 'const d=require(process.argv[1]);for(const c of d.checks.filter(c=>/draw/.test(c.id)))console.log(c.id,c.actual,c.pass)' $E/T004-probe/draws.json | tee -a /tmp/s13-checks/t004.txt
  cp /tmp/s13-checks/t004.txt $E/T004-log-probes-generic.txt
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-probe/{routes,cls,nojs,reduced-motion,draws,drill}.{json,log.txt}` (both project routes present; draws = 2 on each) · `T004-log-probes-generic.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: probe JSON; draws 2/2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q7, iterate every project).

### T005 [US1] `teardown` probe group + AC1 screenshots

- **Seam:** probe ↔ live workbench and no-JS outline of every project route.
- **Files:** `tools/perf/src/site-probe.ts` (group `teardown` per plan.md "Route"; added to `SITE_PROBE_GROUPS` and `SITE_PROBE_CI_GROUPS`), `tools/perf/test/site-probe.test.ts` (pure helpers: outline counting from HTML, tour timeout from step count).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm --filter perf-tools exec vitest run test/site-probe.test.ts | tee /tmp/s13-checks/t005.txt
  pnpm build
  pnpm site:probe --serve apps/web/out --group teardown --out $E/T005-teardown | tee -a /tmp/s13-checks/t005.txt
  # jev-toolkit: outline + live = 5 / 20 / 2; panel open; arm-run + judge-path → ended; compact column at mobile
  pnpm serve:out --port 4173 & SERVE=$!; sleep 3
  for s in light dark; do
    pnpm evidence http://127.0.0.1:4173/projects/jev-toolkit --color-scheme $s --out $E/T005-evidence-jev-$s --wait-for '[data-site-workbench]'
  done
  kill $SERVE
  cp /tmp/s13-checks/t005.txt $E/T005-log-teardown.txt
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-teardown/teardown.{json,log.txt}` + panel-open / tour-ended screenshots per viewport × palette · `T005-evidence-jev-{light,dark}/` (mobile + desktop screenshots, Lighthouse summary, `meta.json`) · `T005-log-teardown.txt`. websocket-inspector also passes `teardown` (4 / 16 / 2 from its module): a regression proof.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the four `T005-evidence-jev-*` screenshots, or open `/projects/jev-toolkit` in Orca's browser (`pnpm dev`, `http://localhost:3000`), on desktop and narrowed to phone width (default: screenshots only).
  2. Optional: open a part's panel and run "Start tour" once (default: the probe's tour-ended shots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. If anything looks crowded with 20 parts on the phone: say so. Default: Sev-3 backlog unless a check fails (no panel/engine change allowed in scope).

**STOP (G2).** Report: route 200, 5/20/2, panel, both tours ended, compact column, draws 2, screenshots; tiers.

---

## Phase G3 — Cards (STOP after T006)

### T006 [US3] `cards` probe group + home-probe allowlist (P2, P4)

- **Seam:** probe ↔ cards on `/` and `/projects`.
- **Files:** `tools/perf/src/site-probe.ts` (group `cards` per plan.md "Cards"; in `SITE_PROBE_GROUPS` and `SITE_PROBE_CI_GROUPS`), `tools/perf/test/site-probe.test.ts` (scroll verdict + chip-count helper), `tools/perf/src/home-probe.ts` (P4).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm --filter perf-tools exec vitest run test/site-probe.test.ts | tee /tmp/s13-checks/t006.txt
  pnpm --filter web exec vitest run test/home-sections.test.ts | tee -a /tmp/s13-checks/t006.txt
  pnpm build
  pnpm site:probe --serve apps/web/out --group cards,drill --out $E/T006-cards | tee -a /tmp/s13-checks/t006.txt
  pnpm home:probe --serve apps/web/out --group structure,copy --out $E/T006-home | tee -a /tmp/s13-checks/t006.txt
  pnpm serve:out --port 4173 & SERVE=$!; sleep 3
  for r in "" projects; do for s in light dark; do
    pnpm evidence "http://127.0.0.1:4173/$r" --color-scheme $s --full-page --out "$E/T006-evidence-${r:-home}-$s"
  done; done
  kill $SERVE
  cp /tmp/s13-checks/t006.txt $E/T006-log-cards.txt
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-cards/cards.{json,log.txt}` (per surface × viewport × palette: card present, name/tagline equal, chips ≤ 4, href 200, `scrollWidth ≤ clientWidth` at 390 px) · `T006-home/{structure,copy}.json` (section order unchanged; 0 unknown copy) · `T006-evidence-{home,projects}-{light,dark}/` · `T006-log-cards.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the home and `/projects` full-page screenshots (or Orca's browser): two cards, Scarlet Inspector first, JEV Benchmark with one "Node.js" chip (default: screenshots only).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (defaults: Q1 chip, Q3 placeholder tile kept).

**STOP (G3).** Report: both surfaces, 390 px, DOM order; tier.

---

## Phase G4 — OG/SEO + content integrity (STOP after T008)

### T007 [US4] OG determinism, metadata, sitemap, JSON-LD (verification only)

- **Seam:** `INDEXABLE_ROUTES` ↔ build-time OG + head tags + sitemap + JSON-LD (no code change expected; if `seo:probe` fails, STOP and escalate, do not edit `seo/`).
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  for b in 1 2; do
    rm -rf apps/web/.next apps/web/out apps/web/public/og && pnpm build >/dev/null
    (cd apps/web/out && find og -name '*.png' -exec shasum -a 256 {} \; | sort -k2) > $E/T007-log-og-hashes-build-$b.txt
    pnpm --filter web seo:expect
    pnpm seo:probe --out-dir apps/web/out --site-url https://hi-murphy.me --expect apps/web/out-seo-expect.json \
      $( [ $b = 2 ] && echo --compare $E/T007-seo-build-1/og-hashes.json ) --out $E/T007-seo-build-$b
  done
  diff $E/T007-log-og-hashes-build-1.txt $E/T007-log-og-hashes-build-2.txt && echo OG-DETERMINISTIC
  grep websocket-inspector.png $E/T007-log-og-hashes-build-1.txt | grep -q 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3 && echo WSI-CARD-UNCHANGED
  node -e 'const b=require("fs").readFileSync(process.argv[1]);console.log("dims",b.readUInt32BE(16),b.readUInt32BE(20),"bytes",b.length)' apps/web/out/og/projects/jev-toolkit.png | tee -a $E/T007-log-og-dims.txt
  cp apps/web/out/og/projects/jev-toolkit.png apps/web/out/og/projects.png apps/web/out/og/home.png $E/ 2>/dev/null; for f in jev-toolkit projects home; do [ -f $E/$f.png ] && mv $E/$f.png $E/T007-screenshot-og-$f.png; done
  grep -o '<loc>[^<]*</loc>' apps/web/out/sitemap.xml > $E/T007-log-sitemap.txt
  node -e '
    const fs=require("fs");const h=fs.readFileSync("apps/web/out/projects/jev-toolkit.html","utf8");
    const ld=JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    const j=JSON.parse(fs.readFileSync(".specify/content/jev-toolkit.json","utf8"));const s=JSON.parse(fs.readFileSync(".specify/content/site.json","utf8"));
    const rows=[["name",ld.name,j.meta.name],["description",ld.description,j.meta.summary],["codeRepository",ld.codeRepository,j.meta.links.find(l=>l.label==="Source").url],["author.name",ld.author.name,s.identity.name],["url",ld.url,"https://hi-murphy.me/projects/"+j.meta.slug]];
    for(const [k,a,e] of rows)console.log(a===e?"OK  ":"FAIL",k);console.log(JSON.stringify(ld,null,2));' | tee $E/T007-log-json-ld-trace.txt
  ! grep -q FAIL $E/T007-log-json-ld-trace.txt
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
  (Build 2 of the loop must run with the same `SITE_URL=https://hi-murphy.me` the CI job uses; the executor exports it before the loop and records it.)
- **Evidence:** `evidence/T007-log-og-hashes-build-{1,2}.txt` (identical; WSI = base) · `T007-log-og-dims.txt` (1200×630, ≤ 307 200 B) · `T007-screenshot-og-{jev-toolkit,projects,home}.png` · `T007-seo-build-{1,2}/` (probe summaries) · `T007-log-sitemap.txt` · `T007-log-json-ld-trace.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at `T007-screenshot-og-jev-toolkit.png` (and the changed `projects`/`home` cards, which now list both projects) (default: agent review against S11's card layout).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q2, JSON-LD unchanged).

### T008 [US5] Nothing invented: per-project hand-copy scan + framing scan (T-b, T-e)

- **Seam:** content JSON ↔ every source and exported string.
- **Files:** `apps/web/test/no-hand-copied-content.test.ts` (T-b), `apps/web/test/third-party-framing.test.ts` (T-e, plan.md "Nothing invented").
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm build >/dev/null
  pnpm --filter web exec vitest run test/no-hand-copied-content.test.ts test/third-party-framing.test.ts test/content-fidelity.test.ts --reporter verbose 2>&1 | tee $E/T008-log-nothing-invented.txt
  ! grep -q 'skipped' <(grep third-party-framing $E/T008-log-nothing-invented.txt) && echo EXPORT-SCANNED
  pnpm home:probe --serve apps/web/out --group copy --out $E/T008-home-copy
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-nothing-invented.txt` (per-project scans, framing present in source + export, 0 deny-list hits, negative controls caught) · `T008-home-copy/copy.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: on `/projects/jev-toolkit`, open "Case study" and confirm the third-party sentence reads as in the JSON (default: the scan).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the deny-list in plan.md).

**STOP (G4).** Report: OG hashes ×2, dims/size, seo probe, sitemap, JSON-LD trace, scans; tiers.

---

## Phase G5 — Gate matrix + CI (STOP after T010)

### T009 [US5] axe states + perf gates for the new routes (P3, P5) + draft PR

- **Seam:** CI ↔ the three AC5 routes.
- **Files:** `tools/perf/src/site-axe.ts` (P3), its test if one exists for `SITE_STATES`, `.github/workflows/perf.yml` (P5).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm --filter perf-tools test | tee /tmp/s13-checks/t009.txt
  pnpm build
  pnpm a11y:axe:site --serve apps/web/out --out $E/T009-axe-site | tee -a /tmp/s13-checks/t009.txt   # 0 serious / 0 critical, both projects
  grep -nE 'projects/jev-toolkit|lighthouse-projects|weight-projects' .github/workflows/perf.yml | tee -a /tmp/s13-checks/t009.txt
  cp /tmp/s13-checks/t009.txt $E/T009-log-ci-gates.txt
  bash .specify/features/jev-content/guards.sh
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
  After the merge, the **orchestrator** pushes `task/s13-jev-content` and opens a **draft** PR to `main` (title `S13: jev-toolkit wiring`), so the preview-based gates run.
- **Evidence:** `evidence/T009-axe-site/axe-site-summary.json` · `T009-log-ci-gates.txt` · PR URL + first CI run URL (in `T009-log-ci-gates.txt`).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: CI on the draft PR).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK to push the slice branch and open the draft PR (default: yes, at the end of T009; it is not merged until your final validation).

### T010 [all] Full gate matrix + WSI-unchanged proof + AC self-check

- **Seam:** the final commit ↔ AC1–AC7.
- **Files:** `evidence/AC-selfcheck.md` (one row per AC: verdict + evidence links), `evidence/T010-*`; the ledger in this file.
- **Check:** RFC §7 G1–G18 on the final commit, in order, each with its `--out` under `$E/T010-<gate>`:
  ```sh
  set -euo pipefail; mkdir -p /tmp/s13-checks .specify/features/jev-content/evidence
  E=.specify/features/jev-content/evidence
  pnpm typecheck && pnpm lint && pnpm test && pnpm build                                    # G1
  pnpm --filter web exec vitest run test/content-fidelity.test.ts > $E/T010-G2-fidelity.txt # G2
  pnpm site:probe --serve apps/web/out --out $E/T010-site-probe                             # G3, G5, G9, G12, G17 (all groups)
  pnpm home:probe --serve apps/web/out --group structure,copy --out $E/T010-home            # G5, G15
  pnpm eager:probe --serve apps/web/out --route / --runs 2 --expect live-loop --out $E/T010-G13-eager  # G13
  pnpm a11y:axe:site --serve apps/web/out --out $E/T010-G11-axe                             # G11
  bash .specify/features/jev-content/main-diff.sh --base-out /tmp/s13-checks/base-out-3b829d0 --no-build | tee $E/T010-G14-main-diff.txt  # G14
  pnpm serve:out --port 4173 & SERVE=$!; sleep 3
  for r in "" projects projects/jev-toolkit projects/websocket-inspector; do
    pnpm perf:lighthouse "http://127.0.0.1:4173/$r" --categories performance,accessibility --out "$E/T010-G8-lh-${r//\//-}"   # G8 (supplementary)
    pnpm perf:weight "http://127.0.0.1:4173/$r" --out "$E/T010-G10-weight-${r//\//-}"                                       # G10 + E1 delta vs T001
  done
  kill $SERVE
  for p in packages/xploder/test/frozen-surface{,.s5,.s6,.s7,.s8}.paths; do git diff --quiet 3aee8fc -- $(sed "s#^#packages/xploder/#" "$p") || echo "DIRTY $p"; done | tee $E/T010-G16-frozen.txt
  pnpm --filter xploder test >> $E/T010-G16-frozen.txt                                    # G16
  bash .specify/features/jev-content/guards.sh | tee $E/T010-log-guard.txt
  gh pr checks --watch > $E/T010-G18-ci.txt                                                # G18 (binding G8/G10/G11/G7/G17 in CI)
  ```
  G6/G7/G15 reuse T007/T008 evidence if nothing under `apps/web` changed since (asserted with `git diff --quiet <T008 merge> -- apps/web`); otherwise they are re-run.
- **Evidence:** every `T010-*` artifact above · `AC-selfcheck.md` (AC1–AC7 table: route renders 5/20/2, fidelity output, cards on both surfaces, OG dims + hashes, sitemap/JSON-LD, Lighthouse/axe/CLS/weight/draws on three routes, eager hero, WSI main-diff, CI run URLs, frozen surfaces) · the execution-tier table (which tier finished each task) · the E1 weight delta (T001 vs T010) for `/projects/websocket-inspector`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `AC-selfcheck.md`: every AC MET with evidence (default: the agent's table).
  2. Open the Vercel preview of the draft PR: `/`, `/projects`, `/projects/jev-toolkit`, and `/projects/websocket-inspector` (to see it behaves as before) (default: optional).
  3. When satisfied, say "S13 done" / "merge" (merge only on your word).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing to finish the matrix (default: the binding Lighthouse/weight numbers are CI's on the preview).
  2. After merge: Merlin's content-only follow-up (`docs/benchmark-summary.md` link on the Reports component) is outside this slice (brief, "Murphy dependencies").

**STOP (G5 / Stage 3 end-contract).** Report: AC1–AC7 self-check table; frozen surfaces empty; tiers; anything needing Murphy's hands.

---

## FR ↔ AC ↔ task map

| FR | AC | Tasks | Gates (RFC §7) |
|---|---|---|---|
| FR1 | AC1 | T003, T004, T005 | G3, G4 |
| FR2 | AC2 | T002, T003 | G2 |
| FR3 | AC3 | T006 | G5 |
| FR4 | AC4 | T007 | G6, G7 |
| FR5 | AC5 | T001 (base), T004 (draws, CLS), T009, T010 | G8–G14 |
| FR6 | AC6 | T008 | G15 |
| FR7 | AC7 | T001 (guards), T009, T010 | G16–G18 |
