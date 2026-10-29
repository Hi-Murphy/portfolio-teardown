# Slice 03 — Perf Gates + Evidence Loop · FROZEN BRIEF v1

**slice:** S03-perf-evidence · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S1 (deploy+CI) ✅ · S2 ✅ (not modified by this slice)

## Mission
Make quality **measured, not vibed**: automate the performance gates in CI against real preview deploys, and ship the repo-side evidence tooling every later visual/engine slice depends on. No engine code, no schema changes, no theme changes.

## Context (self-contained — the orchestrator reads ONLY this brief)
- Product: data-driven "teardown" portfolio (exploded architecture views). S1 shipped monorepo + Next.js static export + Vercel previews + CI (typecheck/lint/test/build/gitleaks). S2 shipped the zod schema contract, tech registry, motion tokens, blueprint palettes — all green.
- **Design-target device: mid-range Android over 4G** (the audience's actual phone). Locked budgets: **first load < 3MB · LCP < 2.5s · 60fps floor on animation · zero layout shift** (PRD G2).
- Locked doctrine: *measured gates beat eyeballs* — every visual/perf task in later slices must attach machine-produced evidence (screenshot + metrics). This slice builds that machinery.
- The site deploys to Vercel; every PR gets a preview URL via the Vercel GitHub integration. Gates must run against a **real deployed URL**, not only a local build.
- Orca seats (Mac) have a built-in browser, but repo tooling must be runnable in **both** GitHub Actions (ubuntu + headless Chrome) and locally via pnpm — no host-specific hacks.

## Deliverables
1. **Lighthouse gate in CI:** automated mobile-emulation audit of the PR's Vercel preview deployment on every PR; thresholds: Performance ≥ 95, LCP < 2.5s, CLS = 0; violation = failed check. If preview-URL access from CI proves impossible, the RFC must pick and justify a fallback (e.g. build + static-serve inside CI) — flagged as an RFC open question with recommendation.
2. **Weight budget gate:** total initial transfer weight of the landing page < 3MB, enforced in CI (budget exceeded = red).
3. **Evidence CLI:** `pnpm evidence <url> [--out <dir>]` producing standardized artifacts into a git-ignored dir: screenshot PNG (mobile + desktop viewports), Lighthouse JSON summary, run metadata (url, timestamp, tool versions); documented exit codes; runnable headless in CI and locally.
4. **FPS harness:** frame-timing measurement script (CDP tracing or equivalent) + a dev-only calibration fixture route (page with a known synthetic animation, excluded from production build); headless run reports FPS within ±10% of the fixture's nominal 60fps; interface documented for reuse by engine slices (S4/S5 gates).
5. **`.specify/EVIDENCE.md`:** the evidence contract for all future slices — which task types attach which artifacts, naming convention, how an orca seat runs the CLI, what a gate failure escalates with.
6. Existing checks stay green; the new gates join them as required PR checks.

## Non-goals (hard)
- No rendering-engine code (S4+) · no schema/contract changes (S2 is frozen; zero new fields) · no theme/palette work · no a11y automation (S8 owns it) · no DNS/Vercel-project-config changes beyond what CI integration requires · no analytics.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** every PR runs an automated Lighthouse mobile audit against a real deployed/preview URL; Perf ≥ 95, LCP < 2.5s, CLS = 0 enforced; violation fails the check (demonstrated once with a deliberately broken threshold in a scratch run, reverted).
- **AC2:** initial-load weight < 3MB enforced in CI; over-budget fails the check (demonstrated likewise).
- **AC3:** `pnpm evidence <url>` produces the full standardized artifact set locally; output dir git-ignored; exit codes documented and honored.
- **AC4:** FPS harness on the calibration fixture reports 60 ±10% headless; fixture excluded from the production build (verified against the deployed prod URL).
- **AC5:** `.specify/EVIDENCE.md` committed and referenced from the repo README or `.specify/KICKOFF` chain so seats discover it.
- **AC6:** full CI green on the PR: typecheck, lint, test, build, gitleaks, + the two new gates.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash: one integration seam + one executable check each.
- Every claim ships with evidence (CI logs, terminal output, artifact samples) in the task report; escalation ladder: Flash stuck ×2 → Sol/Gemini (OpenRouter) → ×2 → orchestrator executes. Report which tier finished each task.
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets in repo or CI logs; gitleaks stays green.

## Murphy dependencies
- None new. (Vercel GitHub integration already active from S1.)

## Freeze protocol
Frozen at commit. Scope/AC changes = revision, logged in the vault revision log with reason code. Design decisions (tool choices: lighthouse-ci vs custom, CDP tracing approach, CI wiring details) live in `.specify/features/perf-evidence/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution.
