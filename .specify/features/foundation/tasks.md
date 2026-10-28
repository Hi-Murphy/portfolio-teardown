# Tasks: S01 Foundation & Monorepo Scaffold

**Input:** `rfc.md` (approved), `spec.md`, `plan.md` in `.specify/features/foundation/`
**Executor:** DeepSeek Flash seat. Escalation: stuck ×2 → Sol/Gemini (OpenRouter) → stuck ×2 → orchestrator (KICKOFF Hard Rule 4). Each report states the finishing tier.

## Format & rules (apply to every task)

- `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task (different files, no dependency). Stories: US1 builder/pipeline · US2 visitor shell · US3 lib boundary · US4 process docs.
- **One task = one integration seam + one executable check.** The task is done only when the check's exit code / assertion passes and its output is pasted into the report.
- **Worktree:** each task runs in a fresh worktree branched from the slice branch `TimurHaryo/portfolio-teardown`, and merges back (fast-forward / no-squash) after the check passes. Commit message: `S01/T0NN: <title>`.
- **Frozen-file guard (every task):** `git diff --quiet HEAD -- .specify/KICKOFF.md .specify/slices && echo FROZEN-OK` must print `FROZEN-OK`.
- **Never:** add zod/R3F/drei/GSAP/analytics deps, content files, OG images, `vercel.json`, DNS changes, secrets, IPs, tokens or private hostnames. Never run `specify init` in the repo. Never use bare `git stash`.
- **Evidence** goes to `.specify/features/foundation/evidence/T0NN-*.{png,txt,json,html}`. Visual claims need screenshots.
- **Throwaway check scripts** (Playwright etc.) live in `/tmp/s01-checks/`, outside the repo. Playwright is **not** added as a repo dependency.

---

## Phase G1 — Local scaffold (US1, US2, US3) → STOP for Murphy after T007

### T001 [US1] Root workspace & toolchain pin
- **Seam:** repo root ↔ pnpm/Node toolchain.
- **Files:** `package.json` (`private:true`, `packageManager: "pnpm@<latest 12.x exact>"`, `engines: {node: ">=24 <25", pnpm: ">=12"}`, scripts per plan.md "Script contract"; dev deps: `typescript`, `prettier`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.nvmrc` (`24`), `.gitignore` (`.env*`, `node_modules/`, `.next/`, `out/`, `.vercel/`, `next-env.d.ts`, `*.tsbuildinfo`, `.DS_Store`), `.editorconfig`, `.prettierrc` (`{"singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100}`), `.prettierignore` (**must include** `.specify/`, `.claude/`, `pnpm-lock.yaml`, `out/`, `.next/`), `tsconfig.base.json` (`strict`, `target ES2022`, `module ESNext`, `moduleResolution bundler`, `noUncheckedIndexedAccess`, `skipLibCheck`, `isolatedModules`).
- **Check:**
  ```sh
  corepack enable && node -v | grep -E '^v24\.' && pnpm -v && pnpm install && \
  git check-ignore -v .env .env.local apps/web/.env.production && pnpm format:check
  ```
- **Evidence:** `evidence/T001-install.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `node -v` prints v24.x and `pnpm -v` prints 12.x in your shell (default: agent log is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK to run `corepack enable` on the Mac (default: yes, already approved in the RFC).

### T002 [P] [US3] `packages/xploder` stub + motion-token module
- **Seam:** lib package boundary (`exports` map ↔ TS resolution).
- **Files:** `packages/xploder/package.json` (exactly per RFC D3: name `xploder`, `0.0.0`, private, `type: module`, `sideEffects:false`, exports `.` → `./src/index.ts`, `./motion` → `./src/motion/index.ts`; scripts `typecheck: tsc --noEmit`, `lint: eslint .`; dev deps `eslint`, `typescript-eslint`, `typescript`), `tsconfig.json` (extends base, `include: ["src"]`), `eslint.config.mjs` (typescript-eslint recommended, flat config), `src/index.ts` (`export type XploderPlaceholder = { readonly kind: 'xploder-placeholder' }; export const XPLODER_VERSION = '0.0.0';`), `src/motion/index.ts` (exact stub from RFC D7, with the JSDoc header stating it is the ONLY source of easings/durations/staggers and that values land in S02).
- **Check:**
  ```sh
  pnpm install && pnpm --filter xploder typecheck && pnpm --filter xploder lint && \
  grep -q '"./motion"' packages/xploder/package.json && echo XPLODER-OK
  ```
- **Evidence:** `evidence/T002-xploder.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Skim `packages/xploder/src/motion/index.ts`. The shape (`durations`/`easings`/`staggers`) is what S02 should fill (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T003 [US1] `apps/web` minimal Next 16 static-export scaffold
- **Seam:** Next.js build ↔ static export output.
- **Files:** `apps/web/package.json` (name `web`, private; deps `next@16.4.x`, `react@19`, `react-dom@19`; dev deps `@types/react`, `@types/react-dom`, `@types/node`, `typescript`, `eslint`, `eslint-config-next@16`; scripts `dev: next dev`, `build: next build`, `typecheck: next typegen && tsc --noEmit`, `lint: eslint .`), `next.config.ts` (`output:'export'`, `images:{unoptimized:true}`, `reactStrictMode:true`), `tsconfig.json` (extends base + Next plugin, `jsx: preserve`), `eslint.config.mjs` (`eslint-config-next` core-web-vitals + typescript, ignores `out`, `.next`), `app/layout.tsx` (minimal `<html lang="en">`, metadata title "Portfolio Teardown" + description), `app/page.tsx` (plain text placeholder). Hand-written; **no `create-next-app`**.
- **Check:**
  ```sh
  pnpm install && pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build && \
  test -f apps/web/out/index.html && echo EXPORT-OK
  ```
- **Evidence:** `evidence/T003-build.txt` (shows "○ (Static)" route table)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The route table in the log shows `/` as static (default: agent log is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T004 [US2] Tailwind v4 + responsive placeholder page
- **Seam:** PostCSS/Tailwind pipeline ↔ page markup.
- **Files:** `apps/web/postcss.config.mjs` (`@tailwindcss/postcss`), deps `tailwindcss@4.3.x`, `@tailwindcss/postcss`, `postcss`; `app/globals.css` (`@import "tailwindcss";`, `@custom-variant dark (&:where(.dark, .dark *));`, `@theme` colour roles `--color-bg`, `--color-fg`, `--color-muted`, `--color-accent` with neutral light values and `.dark` overrides, both pairs WCAG AA ≥ 4.5:1; system font stack); `app/layout.tsx` imports `globals.css`; `app/page.tsx`: `<header>` (slot for toggle), `<main>` with `<h1>Portfolio Teardown</h1>` and `<p>coming online slice by slice</p>`, `<footer>`; fluid type with `clamp()`; no images, no webfonts. **No transition/animation durations** (motion rule).
- **Check:** `pnpm --filter web build` exits 0, then Playwright (`/tmp/s01-checks/t004.mjs`) against `npx serve apps/web/out`: at viewports 360×740 and 1280×800 assert `document.documentElement.scrollWidth <= window.innerWidth` and `h1` text = "Portfolio Teardown"; save screenshots.
- **Evidence:** `evidence/T004-360.png`, `evidence/T004-1280.png`, `evidence/T004-check.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at both screenshots: copy reads correctly and nothing is clipped at 360 px (default: accept if assertions pass).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Any preference on placeholder neutral palette (default: neutral greys, real palette in a later slice).

### T005 [US2] No-flash theme script + CSS fallback + toggle island
- **Seam:** pre-hydration inline script ↔ `<html>` class ↔ CSS variables ↔ client toggle.
- **Files:** `app/theme-script.ts` (exports a minified IIFE string ≤ 400 B implementing RFC D6 resolution: stored `light|dark` → `prefers-color-scheme` → light; sets `classList` `dark` and `style.colorScheme`; try/catch around `localStorage`), `app/layout.tsx` (`<html lang="en" suppressHydrationWarning>`, `<meta name="color-scheme" content="light dark">`, `<script dangerouslySetInnerHTML={{__html: THEME_SCRIPT}} />` first in `<head>`), `app/globals.css` (add `@media (prefers-color-scheme: dark) { html:not(.light) { background: <dark bg>; color-scheme: dark; } }`. The script must also set `light` class when resolved light, so the fallback doesn't fight an explicit light choice), `app/theme-toggle.tsx` (`'use client'`; reads theme from `<html>` after mount; renders same-size placeholder before mount; `<button>` ≥ 44×44 px, `aria-label` = "Switch to dark theme"/"Switch to light theme", visible focus ring, inline SVG sun/moon; on click: flip, **remove stored key if new theme equals OS preference, else store it**; `matchMedia` change listener re-applies when no stored key), and wire the toggle into the page header.
- **Check:** `pnpm --filter web build` then Playwright `/tmp/s01-checks/t005.mjs` against served `out/`:
  - (a) `colorScheme:'dark'`, block `**/_next/static/**/*.js` (no hydration) → `<html>` has class `dark`; computed `body` background ≠ `rgb(255, 255, 255)`. Screenshot.
  - (b) `colorScheme:'dark'`, `javaScriptEnabled:false` → computed `html` background ≠ white (CSS fallback). Screenshot.
  - (c) `colorScheme:'light'` → no `dark` class. Screenshot.
  - (d) light OS: click toggle → `dark` class + `localStorage.theme==='dark'`; reload → still dark; click again → `localStorage.theme` is null; reload → light.
  - (e) dark OS: fresh context, hard reload → dark (OS honored).
  - (f) no console errors / hydration warnings in any run.
- **Evidence:** `evidence/T005-a-dark-nohydrate.png`, `T005-b-dark-nojs.png`, `T005-c-light.png`, `T005-d-toggled.png`, `T005-check.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. In a real browser with `pnpm dev`: set macOS to Dark, hard-reload, and watch for any white flash. Then toggle twice and reload (default: you do this at the G1 STOP).
  2. The toggle feels right (icon, focus ring) (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed. Semantics were fixed in RFC D6).

### T006 [US3] web ↔ xploder workspace wiring (AC5)
- **Seam:** `workspace:*` dependency ↔ `transpilePackages` ↔ package `exports`.
- **Files:** `apps/web/package.json` adds `"xploder": "workspace:*"`; `next.config.ts` adds `transpilePackages: ['xploder']`; `app/page.tsx` footer renders `renderer: xploder v{XPLODER_VERSION}` (value import from `xploder`) and imports `motion` from `xploder/motion` (e.g. `export const _motionTokens: MotionTokens = motion` in a tiny module, or a `satisfies` reference that the type checker sees; no motion literals).
- **Check:**
  ```sh
  pnpm install && pnpm typecheck && pnpm build && grep -rq "xploder v0.0.0" apps/web/out && echo AC5-OK
  ```
- **Evidence:** `evidence/T006-ac5.txt` (import lines via `grep -n "from 'xploder" apps/web/app -r` + build log)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Footer shows "renderer: xploder v0.0.0" (default: grep evidence is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T007 [US1] Root scripts + fresh-clone proof (AC1)
- **Seam:** root script contract ↔ every workspace package.
- **Files:** finalize root `package.json` scripts per plan.md; run `pnpm format` once and commit.
- **Check (from a clean clone of the merged slice branch):**
  ```sh
  rm -rf /tmp/s01-fresh && git clone --branch TimurHaryo/portfolio-teardown "$(git rev-parse --show-toplevel)" /tmp/s01-fresh && \
  cd /tmp/s01-fresh && node -v && pnpm install --frozen-lockfile && pnpm build && echo AC1-EXIT=$? && \
  pnpm typecheck && pnpm lint && echo ALL-GREEN
  ```
- **Evidence:** `evidence/T007-fresh-clone.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optionally repeat the fresh-clone command yourself (default: agent log is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

**⛔ G1 STOP:** report T001–T007 with evidence and AC1/AC2/AC5 local status, then wait for Murphy.

---

## Phase G2 — Pipeline (US1) → STOP for Murphy after T010

### T008 [US1] GitHub Actions CI + draft PR (AC3)
- **Seam:** repo ↔ GitHub Actions.
- **Files:** `.github/workflows/ci.yml` per RFC D9. Triggers `pull_request` + `push: branches: [main]`; `permissions: contents: read`; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`. Job `build`: checkout@v4 → pnpm/action-setup@v4 → setup-node@v4 (`node-version-file: .nvmrc`, `cache: pnpm`) → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm build`. Job `secrets`: checkout@v4 (`fetch-depth: 0`) → download a pinned gitleaks release tarball from `github.com/gitleaks/gitleaks/releases`, verify against the release's `checksums.txt`, then `gitleaks git --redact --verbose`. **No secrets referenced.**
- **Action:** push the slice branch; open a **draft** PR → `main` (title `S01: foundation & monorepo scaffold`).
- **Check:** `gh pr checks <pr> --watch` exits 0 (all of build, secrets green).
- **Evidence:** `evidence/T008-ci.txt` (checks output + run URL), `evidence/T008-ci.png` (checks list screenshot)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The PR's Checks tab shows `build` and `secrets` green (default: agent evidence is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Permission to push the branch and open the draft PR (default: granted on G2 approval, per RFC §8.3).

### T009 [P] [US1] Local secret scan + ignore proof (AC7)
- **Seam:** git history ↔ secret scanner.
- **Action:** `brew install gitleaks` (if absent).
- **Check:**
  ```sh
  gitleaks git --redact --verbose . ; echo GITLEAKS-EXIT=$? && \
  git check-ignore -v .env .env.local .env.production apps/web/.env.local
  ```
  Exit 0 with "no leaks found"; every path matched by `.gitignore`.
- **Evidence:** `evidence/T009-gitleaks.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing beyond the log (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. OK to `brew install gitleaks` (default: yes, approved in the RFC).

### T010 [US1] Vercel Git-integration wiring (AC4) — **Murphy's hands**
- **Seam:** GitHub repo ↔ Vercel project.
- **Murphy does (dashboard, about 3 min):** Add New → Project → import `Hi-Murphy/portfolio-teardown` · Framework: Next.js · **Root Directory: `apps/web`** · "Include files outside the root directory": on · Node.js: **24.x** · Settings → Deployment Protection → **Vercel Authentication: off**. Do not add a domain.
- **Agent does:** push an empty commit on a throwaway branch `s01/preview-probe` (`git commit --allow-empty -m "S01/T010: preview probe"`), read the preview URL from the Vercel check on the commit (`gh api repos/Hi-Murphy/portfolio-teardown/commits/<sha>/status` or `gh pr checks`). If the Vercel build log rejects pnpm 12, ask Murphy to add env `ENABLE_EXPERIMENTAL_COREPACK=1`, otherwise apply the pnpm 10 fallback (RFC D1) and log it. Delete the probe branch afterwards.
- **Check:** `curl -sSI https://<preview-host>/ | head -1` → `HTTP/2 200`; `curl -s https://<preview-host>/ | grep -q "Portfolio Teardown" && echo AC4-OK`.
- **Evidence:** `evidence/T010-preview.txt`, `evidence/T010-preview.png` (screenshot of the preview page)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the preview URL on your phone over cellular. The page loads over HTTPS without a login wall (default: you do this at the G2 STOP).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Do the dashboard steps above and reply "vercel wired" (default: the agent waits; no workaround via tokens).
  2. Whether the preview URL may appear unredacted in committed evidence (default: yes, `*.vercel.app` previews are public).

**⛔ G2 STOP:** report T008–T010 with evidence and AC3/AC4/AC7 status, then wait for Murphy.

---

## Phase G3 — Proof & docs (US2, US4) → STOP after T013

### T011 [US2] Lighthouse mobile on preview (AC6)
- **Seam:** deployed shell ↔ Lighthouse mobile profile.
- **Check:** 3 runs against the latest preview URL:
  ```sh
  for i in 1 2 3; do npx -y lighthouse@latest "https://<preview-host>/" --form-factor=mobile \
    --throttling-method=simulate --only-categories=performance,accessibility \
    --chrome-flags="--headless=new" --output=json --output=html \
    --output-path=.specify/features/foundation/evidence/T011-run$i --quiet; done
  ```
  Then extract scores with `node -e` from each JSON. **Median Performance ≥ 95 and median Accessibility ≥ 95.** If below: fix in the shell (never lower the bar), redeploy, rerun.
- **Evidence:** `evidence/T011-run{1,2,3}.report.{json,html}`, `evidence/T011-scores.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open one HTML report and confirm mobile form factor plus scores (default: scores file is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T012 [P] [US4] AGENTS.md, CLAUDE.md, constitution
- **Seam:** agent instruction surface ↔ spec-kit memory.
- **Files:** `AGENTS.md` (stack, layout, commands, `.specify/features/<name>/` convention (not `specs/`), never run `specify init --here`, frozen-file rule, motion import convention from RFC D7, sanitization rules, evidence convention); `CLAUDE.md` (`@AGENTS.md` plus a one-line Claude note); `.specify/memory/constitution.md` filled from brief principles (static-only, light-default theme, single motion source, mid-range-Android-on-4G target, no secrets/analytics, AC immutability). Version `1.0.0`, ratified 2026-10-26.
- **Check:**
  ```sh
  test -f AGENTS.md && grep -q '@AGENTS.md' CLAUDE.md && grep -q 'xploder/motion' AGENTS.md && \
  ! grep -q '\[PROJECT_NAME\]' .specify/memory/constitution.md && \
  git diff --quiet HEAD -- .specify/KICKOFF.md .specify/slices && echo DOCS-OK
  ```
- **Evidence:** `evidence/T012-docs.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read the constitution principles. They reflect your project rules (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Any extra principle to add (default: none).

### T013 [P] [US4] README stub
- **Seam:** human onboarding ↔ script contract.
- **Files:** `README.md`: one-liner, monorepo map (`apps/web`, `packages/xploder`, `.specify/`), prerequisites (Node 24 via `.nvmrc`, `corepack enable`), commands (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`), pointer to `.specify/`. No external badges.
- **Check:** extract every fenced `pnpm …` command from README and run it in the fresh-clone dir (`dev` with `timeout 30` and `curl -s localhost:3000 | grep -q "Portfolio Teardown"`); all exit 0; `pnpm format:check` passes.
- **Evidence:** `evidence/T013-readme.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The README one-liner reads the way you'd pitch it (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Preferred one-liner wording (default: "Data-driven teardown portfolio: every project rendered as an exploded architecture view.").

**⛔ G3 STOP (Stage 3 end-contract):** AC1–AC7 self-check evidence table + list of anything needing Murphy's hands.

---

## Dependencies & execution order

```text
T001 ─┬─▶ T002 [P] ─┐
      └─▶ T003 ─▶ T004 ─▶ T005 ─┴─▶ T006 ─▶ T007 ─⛔G1
T007 ─▶ T008 ─┬─▶ T010 ─⛔G2      (T009 [P] alongside T008)
              └─ T009
T010 ─▶ T011 ─┬─ T012 [P] ─┬─⛔G3
              └─ T013 [P] ─┘
```

## Task ↔ AC coverage

| AC | Proven by | Supporting |
|---|---|---|
| AC1 | T007 | T001, T003 |
| AC2 | T005 | T004 |
| AC3 | T008 | T001–T007 |
| AC4 | T010 | T008 |
| AC5 | T006 | T002 |
| AC6 | T011 | T004, T005 |
| AC7 | T009 (+ T008 `secrets` job) | T001 |
| Deliverable 6 | T012 (+ spec-kit files installed in Stage 2) | — |
| Deliverable 7 | T013 | — |
