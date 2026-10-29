# S02 AC1–AC7 self-check (executor, T013)

AC text is quoted verbatim from `.specify/slices/slice-02-contracts-tokens.md` (Acceptance criteria). Evidence was reviewed at slice branch `task/s02-contracts-tokens`, head `577eb59` (T012 merge), with PR #2 in draft.

| AC | Criterion (verbatim) | Result | Evidence | Task IDs |
|---|---|---|---|---|
| AC1 | `packages/xploder` exports schema, inferred types, `parseProject`, motion tokens; `apps/web` imports ≥1 type and ≥1 token module; `pnpm build` green at workspace root. | PASS — schema and parse tests pass; the web app imports `TechCategory` (type) from `xploder`, `motion`/`motionCss` from `xploder/motion` and `paletteCss` from `xploder/theme`; root build succeeds and the exported static HTML contains the `--bp-*` palette and `--motion-*` variables. An invalid site data module fails `next build` with a readable `ProjectValidationError` (T009 probe). Final CI also reran the root build. | [T003-schema.txt](T003-schema.txt), [T007-motion.txt](T007-motion.txt), [T009-build.txt](T009-build.txt), [T012-local.txt](T012-local.txt) | T003, T007, T009, T012 |
| AC2 | both fixtures parse; `pnpm test` in `packages/xploder` green including ≥2 negative tests (missing required field rejected; unknown tech id rejected). | PASS — fixture A and fixture B parse in the 34/34 xploder run; `missing meta.name` and unknown tech-id negatives pass. The option-C follow-up reran 34/34, and final CI ran 43/43 xploder tests. | [T003-schema.txt](T003-schema.txt), [T005-fixture-a.txt](T005-fixture-a.txt), [T006-generality.txt](T006-generality.txt), [G1-followup-json-imports.txt](G1-followup-json-imports.txt) | T003, T005, T006, G1 |
| AC3 | geometry-free schema enforced by a test (schema shape contains no position/coordinate/size/layout fields). | PASS — six geometry-free tests pass, including banned-name walk, closed objects, three negative controls, and runtime rejection of `x` on a component. | [T004-geometry.txt](T004-geometry.txt) | T004 |
| AC4 | motion-token exclusivity enforced (grep/lint test: zero duration/easing literals in `apps/web` source). | PASS — the scanner passes across `apps/web` and xploder source outside `motion/`; all six negative controls pass. The planted `transition: color 200ms ease-in` proof made the scanner fail as expected, then the planted change was reverted. | [T010-scanner.txt](T010-scanner.txt) | T010 |
| AC5 | theme toggle flips blueprint light ⇄ dark palettes on the placeholder page; light is default; no flash on load (S1 behavior preserved). | PASS — all Playwright checks (a)–(i) pass. S1 checks (a)–(f) run unchanged (dark before hydration, dark with JavaScript disabled, light OS, toggle persistence/clearing, hard reload, no console/hydration errors). New palette checks: (g) light default body `rgb(246, 243, 234)` = `#F6F3EA`; (h) toggle → body `rgb(11, 26, 46)` = `#0B1A2E` and the network chip flips `rgb(10, 110, 135)` → `rgb(94, 211, 238)`, and back; (i) dark OS with JavaScript disabled → navy via the CSS fallback. Palette contrast tests pass in both themes; screenshots are retained. Murphy's real-browser dark-mode confirmation remains a manual follow-up. | [T011-check.txt](T011-check.txt), [T011-light.png](T011-light.png), [T011-dark-toggled.png](T011-dark-toggled.png), [T011-dark-nohydrate.png](T011-dark-nohydrate.png), [T011-dark-nojs.png](T011-dark-nojs.png), [T008-theme.txt](T008-theme.txt) | T008, T009, T011 |
| AC6 | CI green on the PR (build + tests + gitleaks). | PASS — PR #2 checks are green at head `577eb59`: build (typecheck, lint, test, build), secrets (gitleaks), and Vercel. CI reports 43/43 xploder tests and 13/13 web tests; gitleaks reports no leaks. | [T012-ci.txt](T012-ci.txt), [T012-ci.png](T012-ci.png), [T012-gitleaks.txt](T012-gitleaks.txt) | T012 |
| AC7 | **generality smoke:** fixture B (pipeline shape) validates with zero schema changes after fixture A exists — the S13 data-only claim proven early. | PASS — fixture B parses as a pipeline and preserves layer order. The T005-to-T006 commit-range diff for `packages/xploder/src` and `packages/xploder/test/__snapshots__` is empty; only fixture/test data changed. | [T006-generality.txt](T006-generality.txt), [T005-fixture-a.txt](T005-fixture-a.txt) | T005, T006 |

## Executor tiers

| Task | Tier | Attempts | Outcome | Notes |
|---|---|---:|---|---|
| T001 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator independently re-ran the check. |
| T002 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator independently re-ran the check. |
| T003 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator review fix: exported `Flow` type derived from parsed `Project`, making `id` non-optional (one line). Check re-run. |
| T004 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator independently re-ran the check. |
| T005 | Tier 1 (DeepSeek Flash) | 1 | PASS | Snapshot created by the task that owns it; orchestrator re-ran the check. |
| T006 | Tier 1 (DeepSeek Flash) | 1 | PASS | Zero-schema-change commit-range proof independently checked by the orchestrator. |
| T007 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator independently re-ran the check. |
| T008 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator independently re-ran the check. |
| T009 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator ran the build-time invalid-data probe. Review fix: explicit error-class names because minified builds printed `gb:`, plus one test. |
| T010 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator ran the planted-literal proof and re-ran the check. |
| T011 | Tier 1 (DeepSeek Flash) | 1 | PASS | Orchestrator re-ran the scenarios, reviewed screenshots, and ran Lighthouse locally (Performance 100, Accessibility 100). |
| T012 | Tier 1 (DeepSeek Flash, file edits) | 1 | PASS | Orchestrator ran gitleaks, push, draft PR, and CI watch; both required checks are green. |
| T013 | Tier 1 (DeepSeek Flash) | 1 | PASS | This self-check; final `T013-OK` check recorded in the task report. |

- Tier 2 (OpenRouter) was skipped for the entire slice per RFC §9.4.
- Pause events: none. No task failed twice.
- Three runner-script failures (orchestrator bash/zsh bugs) occurred before an executor started; they are not counted as attempts.
- Every task check was independently re-run by the orchestrator.

G1 follow-up was orchestrator-owned: Murphy selected option C, fixtures load through JSON imports, and the `node-fs.d.ts` shim was removed. Its 34/34 xploder test run and typecheck/lint passed.

## Deviations from plan

- `plan.md` records the RFC refinements: the validation error-class hierarchy, the motion scanner in `apps/web/test` (covering web plus xploder source outside `motion/`), and the `defineProject` source option for author-facing errors.
- G1 option C changed fixture loading to JSON imports re-exported as `unknown`, removing the `node-fs.d.ts` shim without adding Node types.
- No acceptance criterion was reworded or relaxed.

## Needs Murphy's hands

1. Perform the final S02 validation from this table, mark PR #2 ready, and merge it. The agent never merges to `main`.
2. Confirm no flash on load in a real browser on macOS Dark. The dev server was opened in the Orca browser.
3. Decide what to do with the untracked `apps/web/AGENTS.md` generated by `next dev` (Next 16 agent rules). Default: leave it uncommitted; optionally set `agentRules: false` in a later slice.
4. After merge, update the original clone with `git pull`.
