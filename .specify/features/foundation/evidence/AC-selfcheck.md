# S01 AC1–AC7 self-check (orchestrator, Stage 3 end)

AC text is quoted verbatim from `.specify/slices/slice-01-foundation.md`. Everything below was verified on slice branch `TimurHaryo/portfolio-teardown` / PR #1.

| AC | Criterion (verbatim) | Result | Evidence |
|---|---|---|---|
| AC1 | fresh clone → `pnpm install && pnpm build` exits 0 on the pinned Node LTS. | ✅ Node v24.19.0, pnpm 12.15.0, `AC1-EXIT=0`. Re-run on the final merged head: OK. | `T007-fresh-clone.txt` |
| AC2 | `pnpm dev` serves the placeholder; theme toggle flips light/dark; OS preference honored on hard reload; no white flash when OS is dark. | ✅ Playwright on the static build, scenarios (a)–(f). `pnpm dev` in the Orca browser: toggle flips, override persists, toggling back to the OS value clears it. | `T005-check.txt`, `T005-a…d-*.png`, `T005-orca-dev-*.png` |
| AC3 | CI workflow green on the scaffold commit (typecheck + lint + build). | ✅ PR #1: `build (typecheck, lint, build)` and `secrets (gitleaks)` green on every push. | `T008-ci.txt`, `T008-ci.png`, `T008-lint.txt` |
| AC4 | any branch push produces a reachable HTTPS Vercel preview URL. | ✅ An empty-commit probe branch and the slice branch each got their own preview, both `HTTP/2 200` over HTTPS with HSTS. Vercel's "skip unaffected deployments" is disabled. | `T010-preview.txt`, `T010-preview.png` |
| AC5 | `apps/web` imports at least one symbol from `packages/xploder` and the build still passes. | ✅ `XPLODER_VERSION` (value) from `xploder` and `motion` from `xploder/motion`. The build passes and "xploder v0.0.0" is in `out/`. | `T006-ac5.txt` |
| AC6 | Lighthouse mobile on the placeholder page: Performance ≥ 95, Accessibility ≥ 95 (proves a clean shell baseline). | ✅ 3 runs (mobile form factor, simulated throttling) on the Vercel preview. Median Performance **100**, Accessibility **100**. LCP ≈ 0.8 s, TBT ≤ 39 ms, CLS 0. | `T011-run{1,2,3}.report.{json,html}`, `T011-scores.txt` |
| AC7 | secret scan (gitleaks or equivalent) clean; `.env*` git-ignored. | ✅ gitleaks 8.30.1 finds no leaks in history or files (also on the final head). 5 `.env*` paths ignored, 0 tracked. The CI `secrets` job runs on every PR. | `T009-gitleaks.txt` |

## Executor tiers

- Tier 1 (DeepSeek Flash, `codex -p deepseek`) finished all 13 tasks.
- T011 attempt 1 failed because the executor sandbox blocked Chromium. The retry ran with the same executor on an unsandboxed seat, scoped to measurement only. No escalation to tier 2 or 3.
- Orchestrator interventions:
  - merge conflicts (lockfile, `page.tsx`)
  - 2 ESLint anonymous-default-export warnings
  - CI action major bumps (Node 20 deprecation)
  - push, PR and Vercel probe

## Deliverables 6–7

- Spec-kit 0.16.4 (`--integration claude`) is in `.specify/` and `.claude/skills/`.
- `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`) and constitution v1.0.0 are in place (`T012-docs.txt`).
- The README commands are verified from a fresh clone (`T013-readme.txt`).
