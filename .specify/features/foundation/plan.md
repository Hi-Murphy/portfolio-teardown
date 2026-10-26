# Implementation Plan: S01 Foundation & Monorepo Scaffold

**Feature dir:** `.specify/features/foundation/` · **Date:** 2026-10-26 · **Spec:** `spec.md` · **Design:** `rfc.md` (approved, all §6 defaults accepted)

## Summary

Stand up a pnpm-workspaces monorepo with two packages. `apps/web` is a Next.js 16 App Router site with static export (`out/`), Tailwind v4 and a no-flash light/dark theme. `packages/xploder` is a source-only TS stub exporting a placeholder type, `XPLODER_VERSION` and the `xploder/motion` token stub. Add GitHub Actions CI (typecheck → lint → build, plus a gitleaks CLI job), Vercel Git-integration deploys (preview per push, prod on `main`), spec-kit scaffolding, `AGENTS.md`/`CLAUDE.md` and a README stub. No engine code, schema or content.

## Technical Context

**Language/Version:** TypeScript 5.x (strict), Node.js 24 LTS (`.nvmrc` = `24`)
**Primary Dependencies:** Next.js 16.4.x (Turbopack default), React 19, Tailwind CSS 4.3.x (`@tailwindcss/postcss`), ESLint 9 (`eslint-config-next`, `typescript-eslint`), Prettier 3
**Package manager:** pnpm 12 via corepack (`packageManager` pinned exactly); fallback 10.x (RFC D1)
**Storage:** none (theme preference in `localStorage` only)
**Testing:** executable checks per task (shell exit codes, `grep`, Playwright screenshots/asserts via agent browser tooling, Lighthouse CLI). No test framework is added to the repo in S01, since that's harness territory (S03).
**Target Platform:** static hosting (Vercel now, any static host later). Design target is a mid-range Android over 4G.
**Project Type:** web monorepo (site app + library package)
**Performance Goals:** Lighthouse mobile Performance ≥ 95, Accessibility ≥ 95 (AC6)
**Constraints:** static-only (`output: 'export'`), no server runtime, no analytics, no secrets, no DNS changes, no webfonts, near-zero client JS
**Scale/Scope:** 1 route, 1 client island, 2 workspace packages

## Constitution Check

`.specify/memory/constitution.md` is still the spec-kit template (filled in T12 from brief principles). Gates applied now, from the brief and KICKOFF hard rules:

| Gate | Status |
|---|---|
| Scope = brief only; AC1–AC7 verbatim | ✅ spec FR-001…007 quote ACs verbatim |
| Non-goals untouched (schema, 3D, perf harness, content, OG, DNS, analytics) | ✅ no task touches them |
| Motion values only from `xploder/motion` | ✅ stub plus convention; no literal motion values in S01 code |
| No secrets / sanitized payloads | ✅ Vercel via Git integration (no token); gitleaks CLI (no license secret) |
| Frozen files untouched | ✅ every task check includes `git diff --quiet -- .specify/KICKOFF.md .specify/slices` |

## Project Structure

### Documentation (this feature)

```text
.specify/features/foundation/
├── rfc.md        # Stage 1 design (approved)
├── spec.md       # Stage 2 – stories + FR↔AC
├── plan.md       # this file
├── tasks.md      # Stage 2 – ordered executor tasks
└── evidence/     # Stage 3 – screenshots, logs, Lighthouse reports
```

### Source Code (repository root)

```text
.
├── .github/workflows/ci.yml        # jobs: build (install→typecheck→lint→build), secrets (gitleaks CLI)
├── .nvmrc                          # 24
├── .gitignore                      # .env*, node_modules, .next, out, .vercel, next-env.d.ts, *.tsbuildinfo, .DS_Store
├── .editorconfig  .prettierrc  .prettierignore
├── package.json                    # private, packageManager, engines, root scripts (pnpm -r --if-present …)
├── pnpm-workspace.yaml             # apps/*, packages/*
├── tsconfig.base.json              # strict, moduleResolution bundler, target ES2022
├── AGENTS.md  CLAUDE.md  README.md
├── apps/web/
│   ├── package.json                # name "web"; deps: next, react, react-dom, xploder workspace:*
│   ├── next.config.ts              # output:'export', images.unoptimized, transpilePackages:['xploder']
│   ├── postcss.config.mjs          # @tailwindcss/postcss
│   ├── eslint.config.mjs           # eslint-config-next (core-web-vitals + typescript)
│   ├── tsconfig.json               # extends ../../tsconfig.base.json + next plugin
│   └── app/
│       ├── layout.tsx              # server: <html lang suppressHydrationWarning>, color-scheme meta, inline theme script
│       ├── theme-script.ts         # exports the minified no-flash script string (≤ 400 B)
│       ├── page.tsx                # server: hero copy + <ThemeToggle/> + footer (XPLODER_VERSION)
│       ├── theme-toggle.tsx        # 'use client' island
│       └── globals.css             # @import "tailwindcss"; @custom-variant dark; @theme color roles; prefers-color-scheme fallback
└── packages/xploder/
    ├── package.json                # name "xploder", exports "." + "./motion", sideEffects:false
    ├── tsconfig.json  eslint.config.mjs
    └── src/
        ├── index.ts                # XploderPlaceholder (type), XPLODER_VERSION (value)
        └── motion/index.ts         # durations, easings, staggers, motion, MotionTokens (empty typed stubs)
```

**Structure Decision:** the brief's locked layout (`apps/web` + `packages/xploder`). Per-package ESLint configs keep `xploder` free of Next deps (RFC D5).

## Architecture

### Component tree (apps/web)

```text
RootLayout  (server component, app/layout.tsx)
├── <head>
│   ├── <meta name="color-scheme" content="light dark">
│   └── <script dangerouslySetInnerHTML={THEME_SCRIPT}>   ← runs before first paint
└── <body>  (bg/fg from CSS variables)
    └── Page  (server component, app/page.tsx)
        ├── <header>  → ThemeToggle  ('use client' island; same-size placeholder until mounted)
        ├── <main>    → <h1>Portfolio Teardown</h1> + "coming online slice by slice"
        └── <footer>  → "renderer: xploder v{XPLODER_VERSION}"   ← AC5 import
```

### Package dependency graph

```text
apps/web ──workspace:*──▶ xploder ( "." , "./motion" )
          (transpilePackages; source TS compiled by Next/Turbopack)
xploder ──▶ (no runtime deps)
```

### Data flow: theme

```text
first paint:   localStorage['theme'] ∈ {light,dark}? ──yes──▶ use it
                        │no
                        ▼
               matchMedia('(prefers-color-scheme: dark)') ? dark : light
                        ▼
               <html class="dark"|""  style="color-scheme:…">  ──▶ CSS vars (@theme + .dark overrides) ──▶ paint
no-JS/slow JS: CSS @media (prefers-color-scheme: dark) html:not(.light){background:var(--dark-bg)}  (no white flash)

toggle click:  next = current==='dark' ? 'light' : 'dark'
               next === OS preference ? localStorage.removeItem('theme') : localStorage.setItem('theme', next)
               apply class + colorScheme
OS change:     matchMedia 'change' listener → re-apply only if no stored override
```

The toggle reads the current theme from `document.documentElement.classList` after mount (single source of truth = `<html>`). There is no React context in S01.

### Data flow: build & deploy

```text
git push ─▶ GitHub Actions (PR / main):  build job: pnpm install --frozen-lockfile → typecheck → lint(+format:check) → build
                                          secrets job: gitleaks git --redact
         ─▶ Vercel Git integration:      root apps/web → pnpm install (workspace) → next build → out/ → preview URL (prod on main)
```

### Script contract (root `package.json`)

| Script | Command | Notes |
|---|---|---|
| `dev` | `pnpm --filter web dev` | AC2 |
| `build` | `pnpm -r --if-present build` | AC1; only web builds |
| `typecheck` | `pnpm -r --if-present typecheck` | web: `next typegen && tsc --noEmit`; xploder: `tsc --noEmit` |
| `lint` | `pnpm -r --if-present lint && pnpm format:check` | AC3 lint step |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` | ignores `out`, `.next`, lockfile, `.specify/` (frozen files must never be reformatted), `.claude/` |

## Phase groups (Stage 3 STOP points)

| Group | Tasks | Exit condition |
|---|---|---|
| **G1 — local scaffold** | T001–T007 | AC1, AC2, AC5 proven locally with evidence → STOP for Murphy |
| **G2 — pipeline** | T008–T010 | AC3, AC4, AC7 proven (needs push permission + Vercel import) → STOP |
| **G3 — proof & docs** | T011–T013 | AC6 proven; AGENTS/CLAUDE/constitution/README; AC1–AC7 evidence table → STOP |

## Complexity Tracking

No constitution violations. Deliberate omissions (each revisitable): no Turborepo, no xploder build step, no test framework, no motion lint rule (S02), no SHA-pinned actions, no Dependabot.
