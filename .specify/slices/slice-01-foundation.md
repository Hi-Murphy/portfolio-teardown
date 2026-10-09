# Slice 01 — Foundation & Monorepo Scaffold · FROZEN BRIEF v1

**slice:** S01-foundation · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **frozen:** on first commit to `.specify/slices/`

## Mission
Stand up the monorepo, tooling, CI, and deploy pipeline so every later slice is scoped, measurable, and shippable. **No engine code, no schema, no content in this slice.**

## Context (self-contained — the orchestrator reads ONLY this brief)
- Product: data-driven "teardown" portfolio for hi-murphy.me — each project rendered as an exploded architecture view (layers/components/tech chips/metrics) from JSON-like data files. Renderer will later be extracted as OSS lib `xploder`.
- Audiences: recruiters (10–15s scan) + creative devs. **Design-target device: mid-range Android over 4G.**
- Stack (locked by decision record): Next.js (App Router, static generation) · React Three Fiber + drei · GSAP · Tailwind · zod · pnpm workspaces.
- Repo layout (locked): `apps/web` (site) + `packages/xploder` (renderer lib workspace package).
- Theme rule (locked): **light default**, dark alternate; OS-preference aware; no flash on load.
- Motion rule (locked): one central motion-token module is the ONLY source of easings/durations/staggers. Slice 01 creates the module **stub + import convention**; values are defined in Slice 02.
- Static-only: no server runtime, no analytics, no database. Deploy target: Vercel (VPS fallback decided later).
- Language: English. No secrets of any kind in the repo (content sanitization rules apply to later slices).

## Deliverables
1. pnpm-workspaces monorepo at repo root; Node LTS pinned (`.nvmrc`/`engines`).
2. `apps/web`: Next.js SSG app serving a placeholder landing page ("Portfolio Teardown — coming online slice by slice"), Tailwind wired, theme toggle (light default, OS-aware, no flash), responsive down to 360px width.
3. `packages/xploder`: typechecked stub package — exports a placeholder type + the motion-token module stub; consumed by `apps/web` as a workspace dependency.
4. CI (GitHub Actions): install → typecheck → lint → build on every PR and main push.
5. Deploy: Vercel project wired to the repo — preview URL per push, production on main (domain cutover is a LATER slice; do not touch DNS).
6. `.specify/` structure: `slices/` (this brief lives here), `features/` (RFC + spec-kit homes), spec-kit init with `--integration claude` conventions (AGENTS.md/CLAUDE.md compatible).
7. README stub: project one-liner + monorepo map + build instructions.

## Non-goals (hard)
- No zod schema/contracts (Slice 02) · no 3D/engine code (Slice 04+) · no perf-gate harness (Slice 03) · no project content files · no OG cards · no DNS/domain changes · no analytics.

## Acceptance criteria (each independently testable — the orchestrator may NOT reword or relax these)
- **AC1:** fresh clone → `pnpm install && pnpm build` exits 0 on the pinned Node LTS.
- **AC2:** `pnpm dev` serves the placeholder; theme toggle flips light/dark; OS preference honored on hard reload; no white flash when OS is dark.
- **AC3:** CI workflow green on the scaffold commit (typecheck + lint + build).
- **AC4:** any branch push produces a reachable HTTPS Vercel preview URL.
- **AC5:** `apps/web` imports at least one symbol from `packages/xploder` and the build still passes.
- **AC6:** Lighthouse mobile on the placeholder page: Performance ≥ 95, Accessibility ≥ 95 (proves a clean shell baseline).
- **AC7:** secret scan (gitleaks or equivalent) clean; `.env*` git-ignored.

## Executor rules (binding for decomposition & dispatch)
- Tasks sized for a budget-tier executor (DeepSeek V4 Flash): each task = one integration seam + one executable check.
- Every visual claim ships with screenshot evidence (orca browser pane or agent browser tool) attached to the task report.
- Escalation ladder: stuck ×2 → Sol/Gemini (OpenRouter) → stuck ×2 → Opus executes personally. Never silently lower an AC; a blocked AC = stop + escalate with evidence.
- Each task prompt ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, each item with a default).
- Sensitive content (credentials, infra details) never enters task payloads.

## Murphy dependencies (resolved before kickoff)
- Vercel account + repo import (or first-push auto-prompt) · Node LTS on the Mac · orca seats verified: Claude Code on Pro subscription (`/model` → Opus 5.5, subscription auth not API billing) · DeepSeek console key inside a custom-provider CLI seat (Kilocode/OpenCode/Codex-profile — NOT dsh, not first-class in orca yet) · OpenRouter credit loaded (tier 1.5).

## Freeze protocol
Frozen at commit. Scope/AC changes = a revision, logged in the vault revision log with a reason code (`spec-gap` / `criteria-wrong` / `unplanned-dependency` / `implementer-error`) — the orchestrator may not edit this file. Design decisions live in `.specify/features/foundation/rfc.md`, authored by the orchestrator, reviewed by Murphy BEFORE spec/plan/tasks, and again before execution.
