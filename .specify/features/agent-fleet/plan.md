# Implementation Plan: S18 Agent-fleet teardown (third project)

**Feature dir:** `.specify/features/agent-fleet/` · **Branch:** `task/s18-agent-fleet` · **Date:** 2026-11-17 · **Inputs:** `spec.md`, `rfc.md` (approved; §12 Gate 1: all defaults, revision 1 of 2, C3, R-A–R-F)

## Summary

The order is the kickoff's (content conversion → registration → empty rendering → sanitization gate → fleet surfaces → gates), with one change the brief forces: **the scanner and its canary land first** ("the sanitization scanner lands before the route is wired, and its canary test is red-then-green", R-D). Each step lands green with its own test.

| # | Step | Task | Product paths | Test |
|---|---|---|---|---|
| 0 | scanner + canary + G1 (before the route is wired) | T001 | `apps/web/scripts/redaction-scan.ts`, `apps/web/test/redaction-scan.test.ts` | canary red (stub) → green 3/3; ledger negatives; G1 0 |
| 1 | content conversion + registration | T002 | converter row, generated source, `agent-fleet.ts`, `index.ts`, `project-sources.ts`, test edits | the 4 baseline reds → green; fidelity 3 rows; AC1 ids/counts/lengths |
| 2 | empty rendering | T003 | `components/tech-chip-list.tsx`, `tools/perf/src/site-probe.ts` | render test red → green; empty-render counts with controls; screenshots |
| 3 | fleet surfaces | T004 | `.github/workflows/perf.yml` (Q6) | route probe 4/14/3 + 14 panels + 3 flows; sitemap 5; OG 5 × 2 builds; JSON-LD 3; 404 |
| 4 | sanitization gate on the build + G4/G5 | T005 | `apps/web/package.json` (`build` script line only) | G2 0 unexempted, per rule, on 5 routes; differential; source map; signed read |
| 5 | accessibility | T006 | none | axe ×2 palettes (+ panel open, flow playing); keyboard; focus; tap targets |
| 6 | gates + AC7 + self-check | T007 | none | Lighthouse ×5, CLS, weight, draws, eager, guards, bytes report (C3), sweep, CI 7/7 |

**Phase groups (kickoff: STOP at each boundary):** **A** = T001–T002 (scanner, registration) · **B** = T003–T004 (rendering, surfaces) · **C** = T005 (sanitization gates) · **D** = T006–T007 (a11y, gates, self-check). After each group: ledger updated, stage commit `S18/stage-3-<group>:`, report, STOP.

No sealed surface is touched and no re-seal is planned. Any need for one is a STOP (kickoff Hard Rule 5).

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16.4.6 static export, Tailwind v4, Node 24 (type stripping runs `scripts/*.ts` directly), pnpm 12.15 |
| New deps | none |
| Tests | vitest (`apps/web/test`, `packages/xploder/test`, `tools/perf/test`); `site:probe`, `eager:probe`, `a11y:axe:site`, `seo:probe`, `perf:lighthouse`, `perf:weight` on `apps/web/out`; feature scripts in this dir; `guards.sh` |
| Base | `33e2ba1` (S17 product code + S18 canonical JSON). Byte base = a fixed-id export of `33e2ba1` (`base-out`) |
| Seal bases | S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `c8794b2`, S7 `cc663f7`, S8 `c8794b2` (pushed `seal/*` tags); S3 = `label-system/guards.sh:49-51` list |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, **all** of `.specify/content/**` (incl. `agent-fleet.json`, `site.json`, `relationships/`), `packages/xploder/**`, the S3 `tools/perf` list, `pnpm-lock.yaml`, every `package.json` except the one `build` script line |
| Allowed product paths | `apps/web/scripts/convert-content.ts`, `apps/web/scripts/redaction-scan.ts` (new), `apps/web/content/projects/{agent-fleet.ts,agent-fleet.source.ts,index.ts}`, `apps/web/components/tech-chip-list.tsx`, `apps/web/package.json` (`scripts.build` only), `apps/web/test/**`, `tools/perf/src/{project-sources,site-probe}.ts`, `tools/perf/test/**`, `.github/workflows/perf.yml` (route steps only) |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-007 quote AC1–AC7 verbatim, with REV1 lines beneath. `ALLOWED-PATHS-OK` fences drive-bys |
| II. Static-only | No route beyond the SSG project route; the scanner runs at build time only |
| III. Performance is a feature | +2.7 KB gzip expected (spike), all in the lazy workbench chunk; Lighthouse ×5, weight, draws and eager hero re-run |
| IV. Single motion source | No motion code; `tech-chip-list.tsx` is already on the literal-scan lists; `redaction-scan.ts` holds no animation number |
| V. Theme integrity | No new class (stylesheet byte-identical, R0); no colour literal |
| VI. Evidence over assertion | Every AC has a machine artifact (RFC §8) |
| VII. No secrets | the redaction contract itself; gitleaks in CI; `gitleaks dir` + `redaction-scan.ts content` on new prose and evidence before each commit (R-C); the canary is assembled at run time |

## Project Structure

### Documentation and feature tooling (this feature)

```
.specify/features/agent-fleet/
  rfc.md · spec.md · plan.md · tasks.md
  guards.sh              the block below (T001)
  build-fixed.sh         pnpm build with VERCEL_GIT_COMMIT_SHA=s18-fixed-build-id; copies out → <dest> (T001)
  empty-render-probe.mjs <baseUrl> --out <dir>: RFC §4.3 counts + controls, 390/1440 × light/dark (T003)
  route-probe.mjs        <baseUrl> --out <dir>: 4/14/3 DOM counts, 14 panel opens, 3 flow plays,
                         keyboard walk, focus screenshots, tap-target scan (T004, T006)
  g2-diff.mjs            <baseOut> <headOut>: distinct (class, match) pairs, head minus base (T005)
  bytes-report.mjs       <baseOut> <headOut>: AC7 own-file diff with chunk names masked (C3), changed-chunk
                         proof, gzip Δ of every _next/**/*.js (T007)
  evidence/              T<NNN>-* per EVIDENCE.md, source-map.md, REV1-revision-note.md, AC-selfcheck.md
```

### Source code (changes only)

```
apps/web/
  scripts/redaction-scan.ts             NEW  patterns (F1–F9), ledger (X1–X7), scanContent, scanBuild,
                                             CLI `content <file>` | `build <outDir>` (R-A, R-B)          [T001, T005]
  scripts/convert-content.ts                 + agent-fleet row                                          [T002]
  content/projects/agent-fleet.source.ts NEW generated                                                  [T002]
  content/projects/agent-fleet.ts        NEW defineProject(agentFleetSource, …)                         [T002]
  content/projects/index.ts                  import + PROJECTS append-last                              [T002]
  components/tech-chip-list.tsx              zero chips → null                                          [T003]
  package.json                               scripts.build += ` && node scripts/redaction-scan.ts build out` [T005]
  test/redaction-scan.test.ts            NEW canary, ledger negatives, G1                               [T001]
  test/content-fidelity.test.ts              + agent-fleet row; e2 index (R-E)                          [T002]
  test/content-model.test.ts                 three-project index; agent-fleet card model; AC1 ids/counts [T002]
  test/tech-chip-list-empty.test.tsx     NEW zero chips → no list (compact + list card)                 [T003]
tools/perf/
  src/project-sources.ts                     + agentFleetSource                                         [T002]
  test/project-sources.test.ts               + slug; negative-control replace target                    [T002]
  src/site-probe.ts                          chip rule from techs (0 → no ul)                           [T003]
  test/site-probe.test.ts                    evaluateCardChips cases for 0 expected                     [T003]
.github/workflows/perf.yml                   + agent-fleet Lighthouse and weight steps (Q6)             [T004]
```

## Guards (`guards.sh`, from T001 on)

One line per guard, exit 1 if any fails (S17 shape). `BASE=33e2ba1`.

| Guard | Check |
|---|---|
| `FROZEN-OK` | `git diff --quiet $BASE -- .specify/slices .specify/KICKOFF-S18.md .specify/content` |
| `XPLODER-OK` | `git diff --quiet $BASE -- packages/xploder` |
| `SURFACES-S2S8-OK` | each seal list vs its base + `pnpm --filter xploder exec vitest run test/frozen-surface.test.ts` |
| `S3-TOOLS-OK` | the S16 `s3_tools_ok` file list unchanged vs `$BASE` |
| `NO-DEP-OK` | `pnpm-lock.yaml` unchanged; every `package.json` unchanged except `apps/web/package.json` `scripts.build` (JSON-compared) |
| `ALLOWED-PATHS-OK` | changed + untracked files ⊆ "Allowed product paths" ∪ `.specify/features/agent-fleet/**` |
| `CONVERT-CHECK-OK` | `pnpm --filter web content:convert --check` |
| `NO-REGISTRY-OK` | `git diff --quiet $BASE -- apps/web/content/tech-registry.ts` (D-44) |
| `NO-RELATIONSHIP-OK` | `connections.ts` unchanged and `.specify/content/relationships/` has no `agent-fleet.json` (D-45) |
| `GITLEAKS-OK` | `gitleaks git --log-opts="$BASE..HEAD"` + `gitleaks dir .specify/features/agent-fleet` |
| `REDACTION-PROSE-OK` | `node apps/web/scripts/redaction-scan.ts content <f>` = 0 for every `.md` in this feature dir (from T001) |

A failing guard is never "fixed" by widening it. It is a STOP and an escalation with evidence. T001 runs negative controls (one xploder byte, one frozen content byte, one S3 tools byte, one stray file → the matching guards FAIL).

## Phases

### Group A — Scanner and registration (T001–T002)

- **T001:** `base-out` (fixed id, `33e2ba1`) and `base-gzip`. Then the test plus a stub `scanContent`/`scanBuild` that return `[]` → red, logged. Then the real scanner → green; the mutation control (drop F3 `ghp_` → red); G1 on the JSON = 0; `REDACTION-PROSE-OK` live. Local `gitleaks dir` on the test file proves the canary is gitleaks-clean.
- **T002:** the 4 baseline reds are logged as T002's red. Converter row → convert → module → `PROJECTS` → `PROJECT_SOURCES` → test edits → green. One fixed-id build: the route prerenders.
- **STOP A.**

### Group B — Rendering and surfaces (T003–T004)

- **T003:** render test red (empty `ul` present) → guard → green. `site-probe` rule + unit cases. `empty-render-probe.mjs` counts + controls; screenshots 390/1440 × light/dark (cards, panels `approval-gate` + `orchestrator`); stylesheet `cmp` vs `base-out` = identical.
- **T004:** `route-probe.mjs` (4/14/3, 14/14 panels, 3/3 flows); two clean builds → sitemap 5, OG 5 × dims/bytes/sha256 equal; `seo-probe` JSON-LD ×3; 404; `perf.yml` steps; home 2×2 grid and OG review screenshots.
- **STOP B.**

### Group C — Sanitization gates (T005)

`build` script gains G2 → a fixed-id build prints the per-route accounting (raw / exempted per rule / **unexempted = 0**). `g2-diff.mjs base-out head-out`: only X1-covered geometry floats are new. One-off negative: seed the canary into a copy of `out` → `scanBuild` exits 6 with 3 unexempted hits. `source-map.md` (Murphy's Q5 pointers required; STOP if missing); G5 table signed; any UNSOURCED row → STOP (Q3). **STOP C.**

### Group D — Accessibility and gates (T006–T007)

- **T006:** `a11y:axe:site` (light + dark) + panel-open and flow-playing runs; `route-probe.mjs --keyboard` (14/14, 3/3); focus screenshots; tap targets at 390.
- **T007:** Lighthouse median-of-3 × 5 routes; `site:probe` CLS + draws; `perf:weight` × 5; `eager:probe`; `bytes-report.mjs` (C3) + gzip Δ; existing OG identical; Connections markup equal; the S16 sweep re-run (sealed tests unchanged) + control; Q7 report-only sweep on agent-fleet; PR, CI 7/7; `AC-selfcheck.md` (G5 signature, all counts).
- **STOP D** (end of Stage 3).

## Build and serve conventions

- Every byte comparison uses `build-fixed.sh` (`VERCEL_GIT_COMMIT_SHA=s18-fixed-build-id`). Exports are copied to `/tmp/s18-checks/<name>-out`.
- Serve with `pnpm serve:out --dir <out> --port <p>`; `next dev` checks use `localhost`, not `127.0.0.1`. Browser steps run unsandboxed (executor sandbox blocks Chromium).
- Every task that changes client code logs the cumulative gzip Δ against `base-gzip` (`bytes-report.mjs --gzip-only`). Spike expectation: about +2.7 KB, all in the lazy workbench chunk.
