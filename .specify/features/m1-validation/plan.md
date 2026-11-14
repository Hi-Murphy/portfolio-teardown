# Implementation Plan: S12 M1 Validation (MVP gate)

**Feature dir:** `.specify/features/m1-validation/` · **Branch:** `task/s12-m1-validation` · **Date:** 2026-11-14 · **Inputs:** `spec.md`, `rfc.md` (G1: all §10 defaults; simplification R1–R4 in §11), `protocol.md` + `protocol-sheet-template.md` (frozen, hashed)

## Summary

The slice measures. Product code changes only to fix a recorded Sev-1/Sev-2 defect. The run order follows the kickoff: **gates → devices → human test → triage → report**. It is kept simple (R4): one check script, one runner, 9 tasks.

| Phase | Tasks | What happens | Murphy's hands |
|---|---|---|---|
| **P0 Setup** | T001–T003 | guards + `<main>` diff + slow-class workflow; `site-checks.mjs` + `run-checks.sh`; draft PR (preview URL) | none |
| **P1 Automated run** | T004 | every automated check: gates, content, degraded modes, desktop Chrome/Firefox, CI on the preview, slow class | none |
| **P2 Devices** | T005 | iPhone, Android, desktop Safari, all driven by the agent | ~5 min: plug in two phones |
| **P3 Human test** | T006–T007 | five sessions; sheets copied verbatim, scored, tallied | the five sessions |
| **P4 Triage + fixes** | T008, T008.x | triage log + backlog; one task per Sev-1/Sev-2 fix | review severities |
| **P5 Report** | T009 | final run + CI, workflow deleted, report + AC self-check | the M1 verdict |

**STOP at the end of every phase** (and after each fix). A **Sev-1 found in P1 or P2 stops the slice before P3**, so no participant is spent on a broken build. Sev-2 issues are logged and fixed in P4.

## Technical Context

| Item | Value |
|---|---|
| Product under test | `ffda3a2`. Frozen-surface baseline `3aee8fc` |
| Binding hosts | Lighthouse, weight, fixture exclusion: CI `perf.yml` on the draft PR's preview. Reveal: a slow-class attempt in `m1-validation.yml` (`benchmarkIndex` ∈ [1,900, 2,600], cap 10). Everything else: the local export |
| Browsers | D3: Playwright Chrome for Testing. D5: Playwright Firefox (browser binary install, not a dependency). D2: Android Chrome over `adb forward` + `connectOverCDP`. D1: iPhone Safari via the Mac's Web Inspector (Orca computer-use). D4: Mac Safari via Orca computer-use |
| New deps | **none**. `tools/perf` unchanged |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/*.json`, `protocol*.md`; `apps/**` + `packages/**` except paths in `fix-ledger.txt`; every workflow except `m1-validation.yml` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. No feature, copy, theme or engine change. Fixes: Sev-1/Sev-2 only, within the Q14 cap |
| II–V. Static, performance, motion, theme | Measured, not changed. Every fix re-runs everything |
| VI. Evidence over assertion | Every number and cell has an artifact. Verdicts are MET / NOT MET only |
| VII. No secrets | Participants appear only as P1–P5. The employer word is derived at runtime, never printed. `gitleaks dir` runs before each commit |

## Files

```
.specify/features/m1-validation/
  guards.sh          # 5 checks (below); --final adds "m1-validation.yml absent"
  main-diff.sh       # G11: ffda3a2 export (temp worktree) vs head, S11.9 normalisation, <main> of both /projects* pages
  site-checks.mjs    # C2–C4, AC5 degraded checks + Tab walk, M1–M7 for D2/D3/D5
  run-checks.sh      # every automated G/C row + site-checks.mjs → one PASS/FAIL table
  ci-summary.mjs     # copied from S11.9, for the slow-class artifacts
  fix-ledger.txt     # empty; one line per product path a fix changes
  triage-log.md · backlog.md · report.md
  evidence/          # T<NNN>-*, P<n>-sheet.md
.github/workflows/m1-validation.yml   # temporary; deleted in T009
```

## Guards (`guards.sh`)

`B=5dec9f9`, `P=ffda3a2`, `S=3aee8fc`. Each check prints OK/FAIL, and the script exits 1 on any FAIL.

1. **Frozen files:** no diff since `$B` in `.specify/slices`, `KICKOFF-S12.md`, `.specify/content`; `protocol.md` and `protocol-sheet-template.md` match their G1 SHA-256.
2. **Product:** `git diff --name-only $P -- apps packages` ⊆ `fix-ledger.txt`. Dependency blocks and `pnpm-lock.yaml` unchanged.
3. **Surfaces (G12):** every `frozen-surface*.paths` set has an empty diff vs `$S`.
4. **Workflows:** the only change is the added `m1-validation.yml`. With `--final`, it must be absent.
5. **Touch list:** every path changed since `$B` is in `.specify/features/m1-validation/**`, `m1-validation.yml` or `fix-ledger.txt`.

## `run-checks.sh` (the one runner)

It runs on a fresh `pnpm build` + `serve:out`. It uses the RFC §6 commands unchanged and prints one row per check with exit code and artifact:

- **G1** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- **G3** `seo:expect` + `seo:probe`
- **G4** local `perf:lighthouse` ×2 routes
- **G5** `site:probe --group cls`
- **G6** local `perf:weight` ×2 routes
- **G7** `a11y:axe:site`
- **G8** `site:probe --group routes`
- **G10** `site:probe --group draws`
- **G11** `main-diff.sh`
- **G12** surfaces + `pnpm --filter xploder test`
- **G13** `site:probe --group hero` + `eager:probe --expect live-loop`
- **C1** copy tests + `home:probe --group copy`
- **C2–C4, AC5, D3, D5** `site-checks.mjs`
- **guards** `guards.sh`

CI-side gates (G2, the binding G4/G6/G8, and G9) are read from the PR. It is used in T004, after every fix and in T009.

## Executor plan

- **DeepSeek Flash (tier 1):** writes the scripts (T001–T002) and the code of fixes (T008.x). Sandbox off for builds and browsers; probe before dispatch (a 402 = unavailable: pause and report).
- **Orchestrator:** the PR, pushes, CI reads, all device driving (T005), sheets and scoring (T007), severities (T008), the report (T009).
- **Flash stuck ×2:** pause and report with usage; the orchestrator takes over on "go". Tier 1.5 is dormant (skip recorded). The ledger records the finishing tier.
- **Worktrees:** one per Flash task, on `task/s12-m1-validation-tNNN`, merged `--no-ff` after review and removed only after the merge.

## Risks (from the RFC)

- **R2 LinkedIn 999:** browser status first, then Murphy's DevTools screenshot. With no 200 observed, AC3 is NOT MET.
- **R3 phone console:** a missing log = unproven. If Web Inspector driving fails for D1, Murphy sends about 5 screenshots; the console still comes from the Mac.
- **R4 slow class:** cap 10 attempts, then escalate.
- **R6 AC1:** stands as measured.
