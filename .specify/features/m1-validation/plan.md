# Implementation Plan: S12 M1 Validation (MVP gate)

**Feature dir:** `.specify/features/m1-validation/` · **Branch:** `task/s12-m1-validation` · **Date:** 2026-11-13 · **Inputs:** `spec.md`, `rfc.md` (approved at Gate 1: all §10 defaults), `protocol.md` + `protocol-sheet-template.md` (frozen, hashed)

## Summary

The slice measures. It changes product code only to fix a recorded Sev-1/Sev-2 defect. The run order follows the kickoff: **gates → device matrix → human test → triage → report**. Content integrity runs with the gates; degraded modes run with the device matrix.

| Phase | Tasks | What happens | STOP after |
|---|---|---|---|
| **P0 Harness** | T001–T005 | guards + regression runner, slow-class workflow, degraded probe group, content/link scripts, device harness + Murphy's checklist; draft PR opened (preview URL) | yes |
| **P1 Gates** | T006–T007 | gate matrix G1–G13 (local + CI on the preview + slow class); content integrity C1–C4 | yes |
| **P2 Devices + degraded** | T008–T010 | agent cells D3/D5; Murphy cells D1/D4 + D2 (agent capture); degraded modes + keyboard pass | yes |
| **P3 Human test** | T011–T012 | Murphy runs P1–P5; agent copies sheets verbatim, scores by rule id, tallies | yes |
| **P4 Triage + fixes** | T013, T014.x | triage log + backlog; one task per Sev-1/Sev-2 fix, each with before/after + full regression | yes (and after each fix) |
| **P5 Report** | T015 | final regression + CI on the final commit, `m1-validation.yml` deleted, report + AC self-check | yes (end of Stage 3) |

**Sev-1 before people:** if P1 or P2 finds a Sev-1, the slice STOPs and escalates before any participant session (no participant is spent on a broken build). Sev-2 issues found before P3 are logged and fixed in P4, following the kickoff order. The human test then sees the build the gates measured, and its deploy SHA is recorded.

## Technical Context

| Item | Value |
|---|---|
| Product under test | `ffda3a2` (S11.9 final). Frozen-surface baseline `3aee8fc` |
| Runtime | Node 24, pnpm 12, Next 16 static export, Playwright 1.64 (`tools/perf`) |
| Binding hosts | Lighthouse, weight, fixture exclusion: CI `perf.yml` on the draft PR's Vercel preview. Reveal: a slow-class attempt in `m1-validation.yml` (`benchmarkIndex` ∈ [1,900, 2,600], cap 10). Everything else: the local export on `127.0.0.1` (Apple M4) |
| Browsers | D3: Playwright Chrome for Testing. D5: Playwright Firefox (`pnpm --filter perf-tools exec playwright install firefox`, a browser binary, not a dependency). D2: Android Chrome over `adb forward` + `connectOverCDP`. D1/D4: Murphy's Safari |
| New deps | **none** |
| Tests | `tools/perf/test/home-probe-degraded.test.ts` (new: pure evaluators + 4 negative controls). Existing suites unchanged |
| Budgets | `tools/perf/src/budgets.ts` unchanged |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/*.json`, `protocol.md`, `protocol-sheet-template.md`; the whole product tree (`apps/**`, `packages/**`) except paths a fix task records in `fix-ledger.txt`; `ci.yml`, `perf.yml`, `eager-3d.yml`, `eager-load.yml`, `hero-eager.yml` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR7 quote AC1–AC7 verbatim. No feature, copy, theme or engine change. Fixes are limited to Sev-1/Sev-2 under the Q14 size cap. |
| II. Static-only | Unchanged; no product change by default. |
| III. Performance is a feature | Measured, not changed. Budgets unchanged. Every fix re-runs the full matrix. |
| IV. Single motion source | No product change. A fix must keep `no-motion-literals` green. |
| V. Theme integrity | Both palettes are covered in the degraded and gate probes. |
| VI. Evidence over assertion | Every gate, cell, mode and score has a named artifact. AC verdicts are MET / NOT MET only. |
| VII. No secrets | Participants appear only as P1–P5. The employer word is derived at runtime, never printed. `gitleaks dir` runs on evidence before each commit. Local paths → `<local-path>`, ports → `PORT`. |

## Project Structure (touched paths)

```
.specify/features/m1-validation/
  guards.sh               # T001: G-guards below; --final adds "m1-validation.yml absent"
  regress-all.sh          # T001: local G1, G3–G8, G10–G13 + C1–C4 → one PASS/FAIL table
  main-diff.sh            # T001: G11 (ffda3a2 export in a temp worktree vs head)
  fix-ledger.txt          # T001: empty; one line per product path a fix task changes
  ci-summary.mjs          # T002: copied from S11.9, renamed labels
  content-scan.mjs        # T004: C2 + C3
  link-check.mjs          # T004: C4
  device-check.mjs        # T005: M1–M7 runner for D2 (CDP), D3, D5
  device-checklist.md     # T005: Murphy's step list for D1/D4/D2 (with capture steps)
  triage-log.md           # T013
  backlog.md              # T013 (vault-formatted)
  report.md               # T015
  evidence/               # T<NNN>-*, P<n>-sheet.md
.github/workflows/m1-validation.yml   # T002; deleted in T015
tools/perf/src/home-probe.ts          # T003: + 'degraded' group (evaluators + runner)
tools/perf/src/cli/home-probe.ts      # T003: group wiring, if needed
tools/perf/test/home-probe-degraded.test.ts   # T003: new
apps/**, packages/**                  # only T014.x fixes, each path in fix-ledger.txt
```

## Guards (`guards.sh`, T001)

Each line prints `OK` / `FAIL`; the script exits 1 on any failure. `B=5dec9f9` (brief freeze), `P=ffda3a2` (product), `S=3aee8fc` (seal).

1. **FROZEN-OK:** `git diff --quiet $B -- .specify/slices .specify/KICKOFF-S12.md .specify/content`, and no commit since `$B` touches them.
2. **PROTOCOL-OK:** `protocol.md` = `6566893d4267a198c325b153be4860a3db874d03ae79124bef7abc99ccb54e60`, `protocol-sheet-template.md` = `f74af2ac87f7a1a47b9e979fcfc9aa0ed3e4eb2b8a9a8c029307277a07d097c8`.
3. **PRODUCT-OK:** `git diff --name-only $P -- apps packages` ⊆ `fix-ledger.txt`.
4. **SURFACES-OK:** G12 (each `frozen-surface*.paths` set empty vs `$S`).
5. **DEPS-OK:** every `package.json` dependency block and `pnpm-lock.yaml` unchanged vs `$P`.
6. **WORKFLOWS-OK:** the only workflow change vs `$B` is the added `m1-validation.yml`. With `--final`, it must be absent.
7. **ROUTES-OK:** the exported route list equals `$P`'s (recorded by T001 in `evidence/T001-routes.txt`); `/dev/*` and `/fixtures/*` absent from `out/`.
8. **TOUCH-OK:** every path changed since `$B` is in `tools/perf/**`, `.specify/features/m1-validation/**`, `.github/workflows/m1-validation.yml`, or `fix-ledger.txt`.

A guard self-test (in T001) breaks each guard once in a scratch copy and shows it bites.

## Regression runner (`regress-all.sh`, T001)

It runs on a fresh `pnpm build` and prints one row per check with exit code and artifact path:

`G1` `pnpm typecheck && pnpm lint && pnpm test && pnpm build` · `G3` `seo:expect` + `seo:probe` · `G4` local `perf:lighthouse` on both routes · `G5` `site:probe --group cls` · `G6` local `perf:weight` on both routes · `G7` `a11y:axe:site` · `G8` `site:probe --group routes` · `G10` `site:probe --group draws` · `G11` `main-diff.sh` · `G12` surface loop + `pnpm --filter xploder test` · `G13` `site:probe --group hero` + `eager:probe --route / --runs 2 --expect live-loop` · `C1`–`C4` · `guards.sh`.

The commands are the ones in RFC §6, unchanged. It is used in T006 (local half), after every fix (T014.x) and in T015. CI-side gates (G2, the binding G4/G6/G8, G9) run on push and are read from the PR checks.

## Executor plan

- **Tier 1 (DeepSeek Flash 4.1, `codex exec -p deepseek`):** T001–T005, T010's probe runs, and the code of T014.x fixes. Sandbox off for anything that builds, serves or launches a browser. Writes are limited to the task worktree and `/tmp/s12-checks`. Probe before each wave; a 402 = unavailable, so pause and report.
- **Orchestrator personally:** everything outward-facing or needing judgement or Murphy's hands. That is: the draft PR, pushes, CI reads and slow-class re-runs (T002, T006); D2 capture (T009); sheet transcription and scoring (T012, where verbatim matters); triage severities (T013); the report (T015).
- **Escalation:** Flash stuck ×2 → pause and report with 5h/7d usage, then the orchestrator takes over on Murphy's "go". Tier 1.5 is dormant (skip recorded per task). The ledger records the finishing tier.
- **Worktrees:** one per Flash task, on `task/s12-m1-validation-tNNN` off this branch. Merged back `--no-ff` after review, and removed only after the merge.

## Risks carried from the RFC

R2 LinkedIn 999 (C4 → Murphy screenshot → NOT MET), R3 phone console capture (a missing log = unproven), R4 slow class scarce (cap 10), R5/R6 AC1 stands as measured, R8 Playwright builds labelled. Nothing new.
