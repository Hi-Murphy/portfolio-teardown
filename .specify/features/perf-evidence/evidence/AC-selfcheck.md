# S03 AC self-check

**Slice:** S03-perf-evidence · **Branch:** `task/s03-perf-evidence` · **PR:** #3 (draft) · **Date:** 2026-10-29
**Scope source:** `.specify/slices/slice-03-perf-evidence.md` (frozen, untouched) · AC text below is verbatim.

| AC | Criterion (verbatim) | Verdict | Evidence | Tasks |
|---|---|---|---|---|
| AC1 | every PR runs an automated Lighthouse mobile audit against a real deployed/preview URL; Perf ≥ 95, LCP < 2.5s, CLS = 0 enforced; violation fails the check (demonstrated once with a deliberately broken threshold in a scratch run, reverted). | **PASS** — `perf-gate: lighthouse (mobile)` runs on every PR against the PR's own Vercel preview. The preview is resolved through the Vercel status and bot comment, and the commit hash in the HTML must match. Green on PR #3: Perf 1.0, LCP 777 ms (median of 3), CLS 0/0/0. **Violation demo:** scratch PR #4 commit A (`LCP_MAX_MS = 1`) turned the gate red with exit 6 (LCP 815 ms vs 1 ms), weight stayed green. The PR was closed unmerged and its branch deleted. `budgets.ts` on the slice is unchanged. | [T007-ci.txt](T007-ci.txt), [T007-lighthouse-summary.json](T007-lighthouse-summary.json), [T008-violation-A.txt](T008-violation-A.txt), [T003-lighthouse.txt](T003-lighthouse.txt), [T006-preview.txt](T006-preview.txt) | T003, T006, T007, T008 |
| AC2 | initial-load weight < 3MB enforced in CI; over-budget fails the check (demonstrated likewise). | **PASS** — `perf-gate: weight (< 3 MB)` counts the bytes actually transferred, from the PR preview, on both mobile and desktop, with a strict `< 3,000,000 B`. Green on PR #3: mobile 152,148 B, desktop 175,544 B. **Violation demo:** PR #4 commit B (A reverted, `WEIGHT_BUDGET_BYTES = 1_000`) turned the gate red with exit 6 on both profiles; Lighthouse was green in the same run. | [T007-ci.txt](T007-ci.txt), [T007-weight.json](T007-weight.json), [T008-violation-B.txt](T008-violation-B.txt), [T004-weight.txt](T004-weight.txt) | T004, T006, T007, T008 |
| AC3 | `pnpm evidence <url>` produces the full standardized artifact set locally; output dir git-ignored; exit codes documented and honored. | **PASS** — all 5 artifacts written (mobile 721×1440 and desktop 1350×940 screenshots, `lighthouse-summary.json` with 3 runs, `lighthouse-report.json`, `meta.json`). `.evidence/` is git-ignored and the tree stays clean. Exit codes honoured: 0 ok, 2 usage, 3 unreachable, 5 partial. The table in `.specify/EVIDENCE.md` equals the code, enforced by a test. | [T005-evidence.txt](T005-evidence.txt), [T005-screenshot-mobile.png](T005-screenshot-mobile.png), [T005-screenshot-desktop.png](T005-screenshot-desktop.png), [T005-meta.json](T005-meta.json), [T001-scaffold.txt](T001-scaffold.txt), [T012-docs.txt](T012-docs.txt) | T001, T002, T005, T012 |
| AC4 | FPS harness on the calibration fixture reports 60 ±10% headless; fixture excluded from the production build (verified against the deployed prod URL). | **PASS for the headless FPS part and pre-merge exclusion. The prod-URL row is PENDING the merge.** Headless FPS: local Mac 59.63 fps, CI ubuntu 59.98 fps (band 54–66, rAF cross-check 60.0, 0 dropped). Exclusion: the fixture compiles only in `next dev` or with `PERF_FIXTURES=1`; config refuses to build on Vercel with that flag; the build-output scan finds no marker and does find it in the fixture build; PR preview `/fixtures/fps-calibration` returns 404. Today's prod URL also returns 404, but it doesn't contain S03 yet. **Pending:** `perf: fixture exclusion` on the push to `main` after Murphy's merge, run against `https://portfolio-teardown.vercel.app`. | [T010-fps.txt](T010-fps.txt), [T010-fps.json](T010-fps.json), [T011-ci.txt](T011-ci.txt), [T011-fps-ci.json](T011-fps-ci.json), [T009-fixture.txt](T009-fixture.txt) | T009, T010, T011 (+ post-merge run) |
| AC5 | `.specify/EVIDENCE.md` committed and referenced from the repo README or `.specify/KICKOFF` chain so seats discover it. | **PASS** — `.specify/EVIDENCE.md` is committed (task-type → artifact matrix, naming, how a seat runs it, gate-failure escalation, FPS interface). It is linked from `README.md` (Evidence & perf gates) and from `AGENTS.md` §4, the file every seat reads first. | [T012-docs.txt](T012-docs.txt) | T012 |
| AC6 | full CI green on the PR: typecheck, lint, test, build, gitleaks, + the two new gates. | **PASS** — PR #3 at `d9e4d0f`: `build (typecheck, lint, test, build)`, `secrets (gitleaks)`, `perf-gate: lighthouse (mobile)`, `perf-gate: weight (< 3 MB)` all pass and are **required** by ruleset 26115910 on `main` (admin bypass). The informational `perf: fps calibration` and `perf: fixture exclusion` also pass. Merge state CLEAN. | [T013-ci.txt](T013-ci.txt), [T013-ruleset.json](T013-ruleset.json) | T007, T011, T013 |

## Executor tiers

| Task | Tier | Attempts | Notes |
|---|---|---:|---|
| T001, T002 | 1 (DeepSeek Flash) | 1 | Check re-run by the orchestrator. |
| T003, T004, T005, T010 | 1 (Flash, sandbox off per Murphy) | 1 | The Codex sandbox can't launch Chromium. Checks re-run by the orchestrator. |
| T006 | 1 (Flash, sandbox off) | 1 | Needs `gh` login for the live resolver check. |
| T007, T011 | 1 (Flash) + ⚑ orchestrator push/PR | 1 | T011: orchestrator fixed the FPS artifact path. |
| T009 | 1 (Flash) | 1 | Orchestrator fix: main-thread lane didn't move on wide viewports. |
| T012 | 1 (Flash, one-time `.specify/EVIDENCE.md` write) | 1 | `EVIDENCE.md` reviewed in full. |
| T008, T013 | orchestrator (⚑ by design) | 1 | Scratch PR and ruleset are outward-facing steps, not escalations. |
| T014 | orchestrator | 1 | Stage 3 end-contract artifact. |

- Tier 2 (OpenRouter) was skipped for the whole slice (not configured). No task failed twice, and no pause was needed.
- `packages/xploder`: `git diff 303db16 -- packages/xploder` is empty. The frozen brief and KICKOFF files are untouched.

## Deviations and notes

- **Vercel toolbar weight:** the RFC's Stage-1 probe (~73 B) understated it. On desktop the preview loads `vercel.live` feedback.js at 23,580 B. It is counted (the conservative choice, OQ5); production doesn't load it.
- **FPS renderer pid:** Chrome doesn't emit `TracingStartedInBrowser` under the D7 categories, so the harness uses the busiest-`DrawFrame` process (`pidSource: draw-frame-frequency-fallback`). It agrees with the rAF cross-check within 1%.
- **Threshold guard in `build`:** the unit tests pin the real thresholds, so any edit to `budgets.ts` also turns `build` red (seen in both T008 runs).
- **Screenshots of the checks page** were replaced by `gh pr checks` text with run links.
- **CI Lighthouse summary** reports Chromium as `156.0.0.0` (taken from the Lighthouse user agent). Cosmetic.
