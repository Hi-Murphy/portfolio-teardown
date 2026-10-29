# Feature Specification: S03 Perf Gates + Evidence Loop

**Feature dir:** `.specify/features/perf-evidence/` · **Slice:** S03-perf-evidence · **Created:** 2026-10-29 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-03-perf-evidence.md` (frozen brief v1) · **Design:** `rfc.md` (approved 2026-10-29; all §6 defaults accepted; decisions in §9)

> Rule: functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Tooling home, preview resolution, CI wiring and the required-check ruleset are supporting work under the FRs they serve. They get task-level checks, not criteria of their own.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Reviewer trusts the PR (Priority: P1)

As Murphy reviewing a PR, I see two required perf checks measured against that PR's real Vercel preview: a Lighthouse mobile audit and an initial-load weight budget. A regression past the locked budgets turns the PR red, and the check summary shows the measured numbers next to the thresholds.

**Why this priority:** this is the slice's mission ("measured, not vibed"). Every later visual/engine slice is gated by these checks.

**Independent Test:** open the S03 PR. `perf-gate: lighthouse (mobile)` and `perf-gate: weight (< 3 MB)` are green, with summary tables naming the preview URL and head SHA. On the scratch PR, each gate goes red on its own deliberately broken threshold.

**Acceptance Scenarios:**
1. **Given** a PR whose Vercel preview has deployed, **When** the perf workflow runs, **Then** it resolves the preview URL for the PR head SHA, runs Lighthouse mobile 3× against it, and passes only if Perf ≥ 95 and LCP < 2.5s (median run) and CLS = 0 (every run). *(AC1)*
2. **Given** a scratch PR with the LCP threshold set to 1 ms, **When** the gate runs, **Then** `perf-gate: lighthouse (mobile)` fails with exit 6, and the weight gate stays green. The scratch PR is then closed without merging. *(AC1)*
3. **Given** a PR preview, **When** the weight gate runs, **Then** the initial-load transfer bytes on the mobile and desktop profiles are each < 3,000,000, or the check fails. *(AC2)*
4. **Given** a scratch PR with the weight budget set to 1,000 bytes, **When** the gate runs, **Then** `perf-gate: weight (< 3 MB)` fails with exit 6, and the Lighthouse gate stays green. *(AC2)*
5. **Given** the S03 PR, **When** CI completes, **Then** typecheck, lint, test, build, gitleaks and both new gates are green, and the two gates are required checks on `main`. *(AC6)*

---

### User Story 2 — Seat produces evidence (Priority: P1)

As an orca seat finishing a visual or perf task, I run one command against any URL and get a standardized, git-ignored artifact set. The command has documented exit codes. I attach chosen artifacts according to a written evidence contract that I can find from the README and AGENTS.md.

**Why this priority:** the brief's doctrine is that every later visual/perf task ships machine-produced evidence. Without the CLI and the contract, later slices can't comply.

**Independent Test:** `pnpm evidence <preview-url>` exits 0 and writes `screenshot-mobile.png`, `screenshot-desktop.png`, `lighthouse-summary.json`, `lighthouse-report.json` and `meta.json` under `.evidence/`. `git status` stays clean. A bad URL exits 2 and an unreachable one exits 3. `.specify/EVIDENCE.md` exists and is linked from both the README and AGENTS.md.

**Acceptance Scenarios:**
1. **Given** a reachable URL, **When** `pnpm evidence <url>` runs locally, **Then** all five artifacts are written to a new directory under `.evidence/` and the command exits 0. *(AC3)*
2. **Given** the default output directory, **When** `git status --porcelain` and `git check-ignore` run, **Then** the output is ignored and the tree is clean. *(AC3)*
3. **Given** a malformed URL / a closed port / a missing Chromium, **When** the CLI runs, **Then** it exits 2 / 3 / 4 respectively, as documented in `EVIDENCE.md`. A test keeps the documented table and the code's exit-code map identical. *(AC3)*
4. **Given** a fresh seat reading the README or AGENTS.md, **When** it looks for how to attach evidence, **Then** it finds a link to `.specify/EVIDENCE.md`. *(AC5)*

---

### User Story 3 — Engine slice author (Priority: P2)

As the author of S4/S5, I import a documented FPS harness that has been proven to read 60 ±10% headless on a calibration fixture. I trust that dev-only fixture routes never reach the production site.

**Why this priority:** the 60fps floor gate belongs to S4/S5. S03 only has to deliver a calibrated, reusable harness and a safe fixture mechanism.

**Independent Test:** `pnpm fps:calibrate` exits 0 with `54 ≤ fps ≤ 66`. The production `out/` scan finds no fixture marker, while the fixture build does contain it (positive control). The PR preview and the production URL return 404 at `/fixtures/fps-calibration`.

**Acceptance Scenarios:**
1. **Given** the fixture build served locally, **When** `pnpm fps:calibrate` runs headless, **Then** `fps.json` reports trace FPS in [54, 66] and the command exits 0. *(AC4)*
2. **Given** a normal production build (`pnpm build`) and a Vercel deploy, **When** the build output and the deployed production URL are checked, **Then** the fixture route and its marker are absent (404). *(AC4)*

### Edge Cases

- Vercel deploy fails or never reports for the head SHA → the gate is **red** (exit 3, "no Vercel status"). It is never skipped and never silently falls back to localhost (RFC D3, §6.1).
- The branch alias still serves an older deploy → the gate waits until the HTML contains the head SHA (build id). On timeout it's red.
- Run-to-run variance → median of 3 for Perf/LCP. CLS must be exactly 0 on every run.
- Vercel toolbar present on previews only → counted (conservative), labelled third-party in the weight report.
- `--out` pointing at a tracked path → warning on stderr, artifacts still written, exit unaffected.
- One artifact step fails (e.g. Lighthouse crash) while the screenshots succeed → exit 5. `meta.json.steps` names the failed step.
- `PERF_FIXTURES=1` set in a Vercel build → `next.config.ts` throws and the build fails.
- Docs-only PR → Vercel still deploys ("skip unaffected" is off), so the gates run normally.

## Requirements *(mandatory)*

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** every PR runs an automated Lighthouse mobile audit against a real deployed/preview URL; Perf ≥ 95, LCP < 2.5s, CLS = 0 enforced; violation fails the check (demonstrated once with a deliberately broken threshold in a scratch run, reverted).
- **FR-002 (↔ AC2):** initial-load weight < 3MB enforced in CI; over-budget fails the check (demonstrated likewise).
- **FR-003 (↔ AC3):** `pnpm evidence <url>` produces the full standardized artifact set locally; output dir git-ignored; exit codes documented and honored.
- **FR-004 (↔ AC4):** FPS harness on the calibration fixture reports 60 ±10% headless; fixture excluded from the production build (verified against the deployed prod URL).
- **FR-005 (↔ AC5):** `.specify/EVIDENCE.md` committed and referenced from the repo README or `.specify/KICKOFF` chain so seats discover it.
- **FR-006 (↔ AC6):** full CI green on the PR: typecheck, lint, test, build, gitleaks, + the two new gates.

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
|---|---|---|
| 1. Lighthouse gate in CI on the PR's preview (+ fallback decision) | FR-001 | RFC D1, D2, D3, D5 |
| 2. Weight budget gate | FR-002 | RFC D4, D5 |
| 3. Evidence CLI | FR-003 | RFC D1, D6 |
| 4. FPS harness + dev-only calibration fixture route | FR-004 | RFC D7, D8 |
| 5. `.specify/EVIDENCE.md` | FR-005 | RFC D10 |
| 6. Existing checks stay green; new gates become required | FR-006 | RFC D5 (ruleset) |
| AC1/AC2 deliberate-violation demos | FR-001, FR-002 | RFC D9 |

Non-goals stay hard: no rendering-engine code · no schema/contract changes (zero `xploder` public-API changes) · no theme/palette work · no a11y automation · no DNS/Vercel-project config changes · no analytics · no new secrets.

### Key Entities

- **Budgets** (`tools/perf/src/budgets.ts`): `PERF_MIN_SCORE = 0.95`, `LCP_MAX_MS = 2500` (exclusive), `CLS_MAX = 0` (exact), `WEIGHT_BUDGET_BYTES = 3_000_000` (exclusive), `FPS_NOMINAL = 60`, `FPS_TOLERANCE = 0.10`, `LIGHTHOUSE_RUNS = 3`. Single source; no runtime override.
- **Exit codes** (`tools/perf/src/exit-codes.ts`): 0 ok · 1 internal · 2 usage · 3 unreachable · 4 browser unavailable · 5 partial evidence · 6 budget violated.
- **Lighthouse summary** (`lighthouse-summary.json`): URL, versions, per-run metrics, median index, assertions with pass/fail.
- **Weight report** (`weight.json`): per-profile totals, breakdown by type and origin, top-10 requests, budget, pass/fail.
- **Evidence run** (`meta.json`): URL, timestamps, tool versions, git SHA, steps, exit code.
- **FpsResult** (`fps.json`): `fps`, `frames`, `droppedFrames`, `windowMs`, `intervalsMs`, `rafFps`, `source`, band verdict.
- **Calibration fixture**: route `/fixtures/fps-calibration`, marker `data-perf-fixture="fps-calibration"`, compiled only in `next dev` or with `PERF_FIXTURES=1`.

## Success Criteria *(mandatory)*

Success = AC1–AC6 each pass with evidence (CI logs, terminal output, artifact samples) recorded in `evidence/` and the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
|---|---|---|
| FR-001 | AC1 | green `perf-gate: lighthouse (mobile)` run (log + step summary + `lighthouse-summary.json`) on the S03 PR + red run on the scratch PR (commit A) + empty `budgets.ts` diff after revert |
| FR-002 | AC2 | green `perf-gate: weight (< 3 MB)` run (log + `weight.json`) + red run on the scratch PR (commit B) |
| FR-003 | AC3 | `pnpm evidence` terminal log + file listing + `meta.json` sample + `git status`/`check-ignore` output + exit-code demos (2, 3) + doc/code table test output |
| FR-004 | AC4 | `pnpm fps:calibrate` log + `fps.json` (local headless) + CI calibration log + `out/` scan test output (with positive control) + preview 404 log + **post-merge** prod-URL 404 log from `perf: fixture exclusion` |
| FR-005 | AC5 | committed `.specify/EVIDENCE.md` + `grep` showing links in `README.md` and `AGENTS.md` |
| FR-006 | AC6 | PR checks page (screenshot + `gh pr checks` output) showing all six green + ruleset JSON listing the required contexts |

## Assumptions

- All RFC §6 defaults are accepted. `lighthouse@^13.6` and `playwright@^1.64` are approved for `tools/perf` only (Murphy, 2026-10-29, RFC §9).
- Push, the draft PR at T007 and the scratch PR at T008 are granted at the G1 gate. The ruleset is granted at the G4 gate.
- Murphy merges S03 after the orchestrator's final validation. The AC4 prod-URL evidence row is completed from the main-push run after that merge.
- Vercel previews stay anonymous (Deployment Protection off) and every push deploys ("skip unaffected deployments" off), as set up in S01.
- Escalation: tier 2 (OpenRouter) is skipped. If tier 1 fails twice, the orchestrator pauses and reports with 5h/7d usage. Usage pacing per RFC §9.6.
