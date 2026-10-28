# Feature Specification: S01 Foundation & Monorepo Scaffold

**Feature dir:** `.specify/features/foundation/` · **Slice:** S01-foundation · **Created:** 2026-10-26 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-01-foundation.md` (frozen brief v1) · **Design:** `rfc.md` (approved 2026-10-26, all open-question defaults accepted)

> Rule: functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Deliverables 6–7 (spec-kit, README) are supporting work with task-level checks only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Builder can clone, verify and ship (Priority: P1)

As Murphy or an executor agent, I clone the repo, install and build on the pinned Node LTS, and every PR / main push is checked by CI and every push gets a preview URL, with no secrets anywhere.

**Why this priority:** every later slice depends on a reproducible build plus pipeline. Without it nothing is "shippable".

**Independent Test:** fresh clone → `pnpm install && pnpm build` on Node 24; open a PR → CI green; push a branch → HTTPS preview URL responds; gitleaks clean.

**Acceptance Scenarios:**
1. **Given** a fresh clone and Node 24 (`.nvmrc`), **When** `pnpm install && pnpm build` runs, **Then** it exits 0. *(AC1)*
2. **Given** the scaffold commit on a PR, **When** CI runs, **Then** typecheck, lint and build jobs are green. *(AC3)*
3. **Given** the Vercel project is wired, **When** any branch is pushed, **Then** a reachable HTTPS preview URL is produced. *(AC4)*
4. **Given** the repo history, **When** gitleaks scans it, **Then** no leaks are found, **and** `.env*` paths are git-ignored. *(AC7)*

---

### User Story 2 — Visitor gets a clean, fast, theme-correct shell (Priority: P1)

As a visitor on a mid-range Android over 4G, I see the placeholder landing page load fast and accessibly. It respects my OS theme without a white flash, and I can toggle light/dark.

**Why this priority:** this is the baseline later slices build on. If the empty shell already misses performance/a11y or flashes, every later slice inherits it.

**Independent Test:** `pnpm dev` → page renders; emulate OS dark → dark on hard reload with no white first paint; toggle flips; Lighthouse mobile on the preview ≥ 95/95.

**Acceptance Scenarios:**
1. **Given** `pnpm dev`, **When** I open `/`, **Then** the placeholder ("Portfolio Teardown — coming online slice by slice") is served. *(AC2)*
2. **Given** the page is open, **When** I press the theme toggle, **Then** the theme flips light ↔ dark. *(AC2)*
3. **Given** the OS prefers dark (or light) and no explicit override is stored, **When** I hard-reload, **Then** the page renders in the OS theme. *(AC2)*
4. **Given** the OS prefers dark, **When** the page loads, **Then** there is no white flash. *(AC2)*
5. **Given** the deployed placeholder, **When** Lighthouse mobile runs, **Then** Performance ≥ 95 and Accessibility ≥ 95. *(AC6)*

---

### User Story 3 — The lib boundary exists from day one (Priority: P2)

As a future slice author, I import renderer symbols and motion tokens from the `xploder` workspace package (`xploder`, `xploder/motion`), following one documented import convention.

**Why this priority:** it stops renderer code and motion values from leaking into `apps/web` before S02/S04 land, and it keeps the OSS extraction path clean.

**Independent Test:** `apps/web` imports a runtime symbol from `xploder`, and `pnpm build` passes.

**Acceptance Scenarios:**
1. **Given** `apps/web` depends on `xploder` via `workspace:*`, **When** the page imports at least one symbol from it and the app builds, **Then** the build passes. *(AC5)*

---

### User Story 4 — Process scaffolding is discoverable (Priority: P3)

As an agent starting any later slice, I find `AGENTS.md`/`CLAUDE.md`, the spec-kit templates under `.specify/`, and a README with the monorepo map and build instructions, so no archaeology is needed.

**Why this priority:** supporting work (brief deliverables 6–7). It carries no AC of its own.

**Independent Test:** files exist; `CLAUDE.md` imports `AGENTS.md`; README commands copy-paste-run clean.

**Acceptance Scenarios:**
1. **Given** the repo root, **When** an agent reads `AGENTS.md` (directly or via `CLAUDE.md`), **Then** it finds the stack, layout, `.specify/features/` convention, motion import convention and sanitization rules.
2. **Given** the README, **When** a builder follows it, **Then** install/dev/build commands work as written.

### Edge Cases

- `localStorage` unavailable (privacy mode / blocked): the theme falls back to OS preference, then light. No exception surfaces.
- JS disabled or slow script on 4G: the CSS `prefers-color-scheme` fallback still paints a dark background for dark-OS users (no white flash).
- Browser with no `prefers-color-scheme` support: light (the "light default").
- User toggles to the theme that equals the OS preference: the stored override is cleared, so later hard reloads follow the OS (RFC D6).
- Viewport 360 px wide: no horizontal scroll; the toggle stays reachable (≥ 44×44 px target).
- Vercel preview protection enabled by default: previews would 401. It must be disabled for AC4/AC6 (RFC D10).
- Vercel install doesn't support pinned pnpm 12: `ENABLE_EXPERIMENTAL_COREPACK=1`, otherwise fall back to pnpm 10.x (RFC D1).
- A `.env*` file is created locally: it must be ignored by git (AC7).

## Requirements *(mandatory)*

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** fresh clone → `pnpm install && pnpm build` exits 0 on the pinned Node LTS.
- **FR-002 (↔ AC2):** `pnpm dev` serves the placeholder; theme toggle flips light/dark; OS preference honored on hard reload; no white flash when OS is dark.
- **FR-003 (↔ AC3):** CI workflow green on the scaffold commit (typecheck + lint + build).
- **FR-004 (↔ AC4):** any branch push produces a reachable HTTPS Vercel preview URL.
- **FR-005 (↔ AC5):** `apps/web` imports at least one symbol from `packages/xploder` and the build still passes.
- **FR-006 (↔ AC6):** Lighthouse mobile on the placeholder page: Performance ≥ 95, Accessibility ≥ 95 (proves a clean shell baseline).
- **FR-007 (↔ AC7):** secret scan (gitleaks or equivalent) clean; `.env*` git-ignored.

### Brief constraints carried as-is (not new criteria)

Deliverables 1–7, non-goals, theme rule, motion rule and static-only rule are taken from the brief unchanged. RFC D1–D15 define *how*. Non-goals stay hard: no zod schema, no 3D/engine code, no perf-gate harness, no content files, no OG cards, no DNS/domain changes, no analytics.

### Key Entities

- **Theme preference:** `light | dark`. Resolution order: stored override (`localStorage['theme']`) → OS `prefers-color-scheme` → `light`.
- **Motion tokens:** `{ durations, easings, staggers }`. Empty typed stubs in S01, values in S02, single source at `xploder/motion`.
- **xploder public surface (S01):** `XploderPlaceholder` (type), `XPLODER_VERSION` (value), `xploder/motion`.

## Success Criteria *(mandatory)*

Success = AC1–AC7 each pass with evidence (terminal log, CI run, screenshot or Lighthouse report) recorded in `evidence/` and the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
|---|---|---|
| FR-001 | AC1 | fresh-clone terminal log (Node version shown) |
| FR-002 | AC2 | Playwright screenshots: light, dark (OS), toggled, first-paint dark check |
| FR-003 | AC3 | CI run URL + checks screenshot |
| FR-004 | AC4 | preview URL + `curl -sI` HTTP 200 over HTTPS |
| FR-005 | AC5 | import diff + green build log + `grep` hit in `out/` |
| FR-006 | AC6 | Lighthouse JSON + HTML, median of 3 mobile runs |
| FR-007 | AC7 | `gitleaks` "no leaks found" log + `git check-ignore -v` output |

## Assumptions

- Murphy does the Vercel dashboard import (RFC §8.2) when T10 prompts.
- Node 24 LTS on the Mac and CI; pnpm 12 via corepack.
- All RFC §6 defaults are accepted (Murphy: "approved", 2026-10-26).
