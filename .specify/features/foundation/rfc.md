# RFC — S01 Foundation & Monorepo Scaffold

**slice:** S01-foundation · **status:** DRAFT, awaiting Murphy review (Stage 1 gate) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-01-foundation.md` (frozen brief v1) · **date:** 2026-10-26

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins and the conflict should be raised as an open question.

---

## 1. Context (from the brief)

- **Mission:** set up the monorepo, tooling, CI and deploy pipeline so later slices are scoped, measurable and shippable. **No engine code, no schema, no content.**
- **Product:** a data-driven "teardown" portfolio for hi-murphy.me. Each project renders as an exploded architecture view from data files. The renderer will later be extracted as the OSS lib `xploder`.
- **Design target:** a mid-range Android phone on 4G. Audiences are recruiters (10–15 s scan) and creative devs.
- **Locked stack:** Next.js (App Router, SSG) · R3F + drei · GSAP · Tailwind · zod · pnpm workspaces. *S01 installs only Next.js, Tailwind and pnpm. R3F, drei, GSAP and zod arrive in their own slices.*
- **Locked layout:** `apps/web` + `packages/xploder`.
- **Locked theme rule:** light by default, dark as the alternate, follows the OS preference, no flash on load.
- **Locked motion rule:** one central motion-token module is the only source of easings, durations and staggers. S01 ships the stub and the import convention. S02 defines the values.
- **Static only:** no server runtime, no analytics, no DB. Deploy target is Vercel. A VPS fallback will be decided later.
- **Non-goals (hard):** zod schema, 3D/engine code, perf-gate harness (S03), content files, OG cards, DNS/domain changes, analytics.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | fresh clone → `pnpm install && pnpm build` exits 0 on the pinned Node LTS. |
| AC2 | `pnpm dev` serves the placeholder; theme toggle flips light/dark; OS preference honored on hard reload; no white flash when OS is dark. |
| AC3 | CI workflow green on the scaffold commit (typecheck + lint + build). |
| AC4 | any branch push produces a reachable HTTPS Vercel preview URL. |
| AC5 | `apps/web` imports at least one symbol from `packages/xploder` and the build still passes. |
| AC6 | Lighthouse mobile on the placeholder page: Performance ≥ 95, Accessibility ≥ 95 (proves a clean shell baseline). |
| AC7 | secret scan (gitleaks or equivalent) clean; `.env*` git-ignored. |

### Environment facts checked 2026-10-26

| Item | Fact | Source |
|---|---|---|
| Node.js | v24 "Krypton" is the latest LTS (24.22.x). v26 is "Current". Local Mac has v24.19.0. | nodejs.org previous-releases |
| Next.js | 16.4.x. Turbopack is the default for `dev` and `build`. `output: 'export'` is still how static export works. **`next lint` was removed**, and `next build` no longer lints. | npm, nextjs.org v16 upgrade guide |
| Tailwind | 4.3.x. CSS-first config via `@tailwindcss/postcss` and `@import "tailwindcss"`, with no `tailwind.config.js`. | tailwindcss.com Next guide |
| pnpm | Latest major is 12. **Not installed on the Mac.** Corepack 0.35 is present (bundled with Node 24). | npm, local |
| next-themes | 0.4.6, no release since 2025-03. There are known React 19 inline-script warnings. | npm |
| spec-kit | `specify` 0.16.4 is installed locally. Correct flag is `--integration claude` (`--ai` is legacy). `--here` / `.` initialises the current dir. | local `specify init --help` |
| gitleaks-action | v3 needs a (free) `GITLEAKS_LICENSE` secret for **organization** repos. `Hi-Murphy` is a GitHub **Organization**, and the repo is **public**. | GitHub API, action README |
| Vercel CLI, gitleaks CLI | Not installed locally. | local |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Monorepo tooling: plain pnpm workspaces, no Turborepo/Nx

- **R:** `pnpm-workspace.yaml` (`apps/*`, `packages/*`). Root `package.json` has `"private": true`, `"packageManager": "pnpm@12.x.y"` (exact version pinned at execution), and `"engines": { "node": ">=24 <25", "pnpm": ">=12" }`. Root scripts fan out with `pnpm -r --if-present <script>`:
  - `build` → `pnpm -r --if-present build`. Only `apps/web` builds. xploder is source-only (D3), so its only checks are typecheck and lint.
  - `typecheck`, `lint`, `format:check` → the same pattern.
  - `dev` → `pnpm --filter web dev`.
- **Node pin:** `.nvmrc` = `24`, `engines.node` as above. Vercel project Node version = 24.x.
- **Why:** two packages don't need a task-graph cache. Turbo adds config surface that budget-tier executors get wrong. It can be revisited in S03 when the perf-gate arrives.
- **Why Node 24 over 26:** 24 is the current LTS, it's installed on the Mac, it's supported by Vercel, and it still bundles corepack (removed from Node 25+).
- **Rejected:** Turborepo (premature) · npm/yarn workspaces (stack locks pnpm) · Node 26 (not LTS yet).
- **Risk:** Vercel's support for pnpm 12. *Mitigation:* the Vercel task checks the install log. If Vercel rejects pnpm 12, the fallback is `pnpm@10` (latest 10.x) everywhere. This is recorded as a revision-free tooling change because the brief says only "pnpm workspaces".

### D2 — Package naming

- **R:** the web app is `web` (private). The renderer lib is `xploder` (private: true, version `0.0.0`). These match the future OSS name, so imports never need a rename.
- **Rejected:** a scoped `@portfolio/xploder`, which would mean a rename at OSS extraction.

### D3 — `packages/xploder`: source-only TS package, transpiled by Next

- **R:** no build step in S01. `package.json`:
  ```json
  {
    "name": "xploder", "version": "0.0.0", "private": true, "type": "module",
    "sideEffects": false,
    "exports": {
      ".": "./src/index.ts",
      "./motion": "./src/motion/index.ts"
    },
    "scripts": { "typecheck": "tsc --noEmit", "lint": "eslint ." }
  }
  ```
  `apps/web` depends on `"xploder": "workspace:*"`, and `next.config.ts` sets `transpilePackages: ['xploder']`.
- **Exports in S01:**
  - `src/index.ts` → `export type XploderPlaceholder = { readonly kind: 'xploder-placeholder' }` (the placeholder type the brief asks for) and `export const XPLODER_VERSION = '0.0.0'` (a **runtime value**, so AC5 can't be met by a type-only import that the compiler erases).
  - `./motion` → the motion-token stub (D7).
- **Why:** zero build orchestration, instant HMR across packages, and typecheck still runs through `tsc --noEmit`. When `xploder` is extracted as OSS, a `tsup` build plus `dist/` exports is a contained change in that package.
- **Rejected:** a `tsup` build now (extra watch process, YAGNI) · TS project references (adds friction for executors).

### D4 — `apps/web`: Next.js 16 App Router with `output: 'export'`

- **R:** `next.config.ts` sets `output: 'export'`, `images: { unoptimized: true }`, `transpilePackages: ['xploder']` and `reactStrictMode: true`. The build emits `apps/web/out/`. Turbopack defaults stay on.
- **Why:** `output: 'export'` makes "static-only, no server runtime" true by construction. Any attempt to add a server feature fails the build. It also keeps a later VPS fallback trivial: copy `out/`. Vercel serves Next static exports natively.
- **Scaffold method:** hand-written minimal files, not `create-next-app`, so there's no demo cruft or extra fonts/assets to strip. The file set is `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `eslint.config.mjs`.
- **Typecheck:** `"typecheck": "next typegen && tsc --noEmit"`. `next typegen` generates route types and `next-env.d.ts` without a full build, so CI can typecheck before it builds. `next-env.d.ts` is git-ignored.
- **Fonts:** system font stack only in S01. No webfont request keeps AC6 Performance headroom. Typography is decided in a later slice.

### D5 — Lint & format

- **R:** **per-package flat configs**, run through the ESLint 9 CLI (`next lint` no longer exists).
  - `apps/web/eslint.config.mjs` → `eslint-config-next` (core-web-vitals + typescript).
  - `packages/xploder/eslint.config.mjs` → `typescript-eslint` recommended. No Next dependency, so the lib stays extractable.
- **Prettier** at the root (`.prettierrc`, `.prettierignore`). `format:check` runs inside the CI **lint** step. Budget-tier executors produce drifting formatting, and a formatter is the cheapest guard.
- **Rejected:** one root ESLint config (it would couple xploder to `eslint-config-next`) · Biome (`eslint-config-next` is the supported path for Next rules).

### D6 — Theme setup: hand-rolled no-flash script, not next-themes

- **Semantics (resolves "light default" vs "OS-aware"):**
  1. A stored explicit choice (`localStorage['theme']` ∈ `light|dark`) wins.
  2. Otherwise follow `prefers-color-scheme`. OS dark → dark.
  3. Otherwise (no preference, or the media query isn't supported) → **light**. That is the "light default".
- **Toggle behaviour:** a 2-state button (sun/moon) flips the theme. **If the new theme equals the current OS preference, the stored key is removed rather than written.** The user then falls back to "follow OS", so AC2's "OS preference honored on hard reload" stays true after any amount of toggling back. The only time a stored value survives is a deliberate choice against the OS.
- **No-flash mechanism (belt and braces):**
  - A blocking inline `<script>` at the top of `<head>` in `app/layout.tsx`, rendered by the **server component** via `dangerouslySetInnerHTML`. This avoids the React 19 "script inside client component" warning that affects next-themes. The script is under 400 bytes. It resolves the theme, sets `class="dark"` and `style.colorScheme` on `<html>`, and wraps everything in try/catch for privacy-mode `localStorage`.
  - `<html suppressHydrationWarning>`.
  - `<meta name="color-scheme" content="light dark">`, plus CSS fallback `@media (prefers-color-scheme: dark) { html:not(.light) { background: <dark-bg> } }`. Even before the script runs (or if JS is disabled), a dark-OS user never sees white.
  - A listener on `matchMedia('(prefers-color-scheme: dark)')` updates the theme live while no stored choice exists.
- **Tailwind wiring:** `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css`. Colour roles are CSS variables (`--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`) defined in `@theme` with `.dark` overrides. The palette is a **neutral placeholder** in S01 (real palette is a later slice), with contrast checked to WCAG AA in both themes for AC6 Accessibility.
- **Toggle a11y:** a real `<button>` with `aria-label` that reflects the action ("Switch to dark theme"), visible focus ring, and a target of at least 44×44 px. The icon is inline SVG (no icon library).
- **Toggle hydration:** the toggle is a tiny client component. Before mount it renders a neutral, same-size placeholder so there's no hydration mismatch and no layout shift (CLS 0).
- **Rejected:** `next-themes` (unmaintained since 2025-03, React 19 script warning, more than we need) · CSS-only `prefers-color-scheme` (can't toggle).

### D7 — Motion-token module convention

- **Location:** `packages/xploder/src/motion/index.ts`, exported as subpath **`xploder/motion`**. It lives in the lib because the renderer will consume it and the brief puts the stub in xploder.
- **Stub shape (S01):** typed, empty-but-valid containers that S02 fills in:
  ```ts
  /** The ONLY source of easings, durations and staggers. Values land in S02. */
  export const durations = {} as const satisfies Record<string, number>; // seconds
  export const easings   = {} as const satisfies Record<string, string>; // GSAP ease strings / CSS cubic-bezier
  export const staggers  = {} as const satisfies Record<string, number>; // seconds
  export const motion = { durations, easings, staggers } as const;
  export type MotionTokens = typeof motion;
  ```
- **Import convention (binding from S01 on):**
  - Always `import { motion } from 'xploder/motion'` (or named `durations`, `easings`, `staggers`). **Never** deep-import `xploder/src/...`. `exports` blocks deep imports anyway.
  - No literal durations, easings or stagger values in app or lib code (no `duration: 0.3`, `ease: 'power2.out'`, CSS `transition: … 200ms`). Tailwind motion utilities are allowed only once S02 maps them to tokens.
  - Reduced motion is handled centrally in this module in S02 (noted here so S02 owns it).
- **Enforcement:** S01 documents the convention in `AGENTS.md` and in the module's JSDoc. A lint rule (`no-restricted-syntax` / `no-restricted-imports`) is **deferred to S02**, when GSAP and real values exist. Until then there's nothing to restrict.
- **AC5 wiring:** the placeholder page imports `XPLODER_VERSION` from `xploder` and renders it in the footer ("renderer: xploder v0.0.0"). It also imports `motion` from `xploder/motion` (touched in a type-safe no-op) so both export paths are proven through the build.

### D8 — Placeholder page

- A single route, `/`. It shows `<h1>` "Portfolio Teardown", a sub-line "coming online slice by slice", the theme toggle, and a footer with the xploder version.
- Fluid type via `clamp()`, no horizontal scroll at **360 px** width (checked by screenshot at 360×740 and 1280×800).
- `<html lang="en">`, metadata `title` + `description`. No OG cards (non-goal). No images. Target: zero client JS apart from the toggle and Next runtime.

### D9 — CI (GitHub Actions)

- **File:** `.github/workflows/ci.yml`. Triggers: `pull_request` (all branches) and `push` to `main`. `permissions: contents: read`. `concurrency` per ref with `cancel-in-progress: true`.
- **Job `build`** (ubuntu-latest):
  1. `actions/checkout@v4`
  2. `pnpm/action-setup@v4`, which reads `packageManager`
  3. `actions/setup-node@v4` with `node-version-file: .nvmrc`, `cache: pnpm`
  4. `pnpm install --frozen-lockfile`
  5. `pnpm typecheck`
  6. `pnpm lint` (includes `format:check`)
  7. `pnpm build`
- **Job `secrets`** (parallel, same triggers): `actions/checkout@v4` with `fetch-depth: 0`, then the **gitleaks CLI** downloaded from the official GitHub release (pinned version plus checksum verification), then `gitleaks git --redact --verbose`. *Why not gitleaks-action:* the repo belongs to an Organization, so the action needs a `GITLEAKS_LICENSE` secret. The raw CLI is MIT-licensed and needs no secret.
- **Pinned action versions:** major tags in S01. SHA pinning is noted as a later hardening item, not in scope.
- **AC3 evidence:** a link to the green run plus a screenshot of the checks list.

### D10 — Deploy wiring (Vercel)

- **R:** **Vercel Git integration** (dashboard import), not CLI deploys from CI. That means no Vercel token in GitHub secrets at all, and preview-per-push plus production-on-`main` come out of the box.
- **Project settings:** Framework = Next.js · **Root Directory = `apps/web`** · "Include files outside root directory" = on (default, needed for the workspace package) · Node.js = 24.x · install/build commands = defaults (Vercel detects pnpm from the lockfile and `packageManager`). If pnpm 12 isn't picked up, set env `ENABLE_EXPERIMENTAL_COREPACK=1`. This is a non-secret build flag.
- **Deployment Protection:** Vercel enables "Vercel Authentication" on previews by default. That makes previews return 401 to anonymous clients and to Lighthouse. **R: disable it for this project.** It's a public portfolio with no secrets, and AC4 ("reachable") plus AC6 (Lighthouse on the preview) both need anonymous access.
- **No `vercel.json`** in S01. Defaults are enough.
- **No domain/DNS changes.** The production URL stays `*.vercel.app` until the cutover slice.
- **AC4 evidence:** push a throwaway branch, capture the preview URL from the Vercel GitHub check, and run `curl -sI https://<preview>` → `HTTP/2 200`. This is recorded in the task report, with the URL redacted to its project slug if Murphy prefers.

### D11 — Lighthouse (AC6) without a perf harness

- S03 owns the perf-gate harness, so S01 runs Lighthouse as a **one-shot manual check**, not a CI gate:
  `npx lighthouse@latest <preview-url> --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance,accessibility --output=json --output=html`.
- Run against the **Vercel preview** (real CDN, HTTPS, compression), 3 runs, report the **median**. A local `out/` served via `npx serve` is used only for fast iteration.
- **Evidence:** JSON plus HTML reports in `.specify/features/foundation/evidence/` (Lighthouse JSON contains only public URLs and timings, no secrets).

### D12 — Secrets hygiene (AC7)

- Root `.gitignore` includes `.env*`, with `!.env.example` *only if* an example is ever needed. None is needed in S01, so the negation is omitted. It also ignores `node_modules`, `.next`, `out`, `.vercel`, `next-env.d.ts`, `*.tsbuildinfo` and `.DS_Store`.
- Local check: `gitleaks git --redact` (Murphy or agent installs via `brew install gitleaks`), plus `git check-ignore -v .env .env.local apps/web/.env.production` (all must match).
- The CI `secrets` job (D9) makes the scan continuous.
- Sanitization rule for every executor prompt: no IPs, tokens, hostnames of private infra, or private repo names in code, comments, fixtures or commit messages.

### D13 — `.specify/` structure & spec-kit init

- **Target layout:**
  ```
  .specify/
    KICKOFF.md                 (frozen, untouched)
    slices/slice-01-foundation.md (frozen, untouched)
    features/foundation/       rfc.md · spec.md · plan.md · tasks.md · evidence/
    memory/constitution.md     (spec-kit; filled with project principles from the brief)
    templates/ · scripts/      (spec-kit managed)
  AGENTS.md                    canonical agent instructions (read by Claude Code, OpenCode, Kilocode, Codex)
  CLAUDE.md                    one line: `@AGENTS.md`, plus Claude-only notes if any
  .claude/                     spec-kit Claude integration (skills/commands)
  ```
- **Init procedure (safe for frozen files):** run `specify init <scratch-dir> --integration claude --script sh` in a scratch directory **outside the repo**. Diff the output, then copy `.specify/{memory,templates,scripts}` and `.claude/` into the repo. **Never run `--here --force` against the repo**, because it could merge over `.specify/` and touch frozen files. After copying, verify `git diff --stat .specify/slices .specify/KICKOFF.md` is empty.
- **Path convention divergence:** spec-kit's own scripts create `specs/NNN-name/` and git branches. This project's protocol puts feature artifacts in `.specify/features/<name>/`. **R:** artifacts are authored with the spec-kit **templates**, but the branch-creating `create-new-feature` script is not used. AGENTS.md documents the `.specify/features/` convention.
- **When:** at the start of **Stage 2**, so `spec.md`/`plan.md`/`tasks.md` follow the official templates. It's spec tooling, not product code.

### D14 — README stub

- Root `README.md` contains a one-liner, a monorepo map (`apps/web`, `packages/xploder`, `.specify/`), prerequisites (Node 24 via `.nvmrc`, `corepack enable`), commands (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`) and a pointer to `.specify/` for process. No badges that call external analytics.

### D15 — Execution mechanics (Stage 3 preview)

- One task = one integration seam + one executable check. Each task runs in a fresh worktree off this slice branch and merges back in order.
- Executor = DeepSeek Flash seat, with escalation per Hard Rule 4. The tier that finished each task is reported.
- Visual evidence = Playwright screenshots (agent browser) or the orca browser pane. Stored in `.specify/features/foundation/evidence/`.
- Stage-boundary commits are prefixed `S01/stage-N:`.

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories (to become P1–P3 in `spec.md`):**
- **P1 — Builder can clone and ship.** As Murphy or an agent, I clone the repo, run `pnpm install && pnpm build` on Node 24, and get a static site. CI proves typecheck, lint and build on every PR and main push, and every push gets a preview URL. → AC1, AC3, AC4, AC7
- **P1 — Visitor sees a clean, fast, theme-correct shell.** As a visitor on a mid-range Android over 4G, the placeholder loads fast and accessibly, respects my OS theme with no flash, and lets me toggle. → AC2, AC6
- **P2 — Lib boundary exists from day one.** As a future slice author, I import renderer symbols and motion tokens from `xploder` and `xploder/motion` through the workspace, with the import convention documented. → AC5
- **P3 — Process scaffolding.** As an agent, I find AGENTS.md/CLAUDE.md, the spec-kit templates and the README map, so later slices start without archaeology. → Deliverables 6–7 (supporting; no new AC)

**FR mapping rule:** functional requirements map **1:1 to AC1–AC7**: FR-001 ↔ AC1 … FR-007 ↔ AC7. Deliverables 6–7 (spec-kit, README) are tracked as tasks under P3 with checks, but **no new acceptance criteria are invented**.

**Plan.md inputs:** D1–D14 above. Component tree: `RootLayout` (server: no-flash script, `<html>` attrs) → `Page` (server: hero copy, footer with `XPLODER_VERSION`) → `ThemeToggle` (client island). Data flow: theme state in `localStorage` + `matchMedia` → `<html class>` → CSS variables. No other runtime data.

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Seam | Executable check | AC |
|---|---|---|---|
| T1 | Root workspace: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore`, `.editorconfig`, `.prettierrc`, `tsconfig.base.json` | `corepack enable && pnpm install` exits 0. `git check-ignore -v .env .env.local` matches. | AC1 (part), AC7 (part) |
| T2 | `packages/xploder` stub: exports `.` + `./motion`, tsconfig, eslint | `pnpm --filter xploder typecheck && pnpm --filter xploder lint` exits 0 | AC5 (part) |
| T3 | `apps/web` minimal Next 16 static-export scaffold | `pnpm --filter web build` exits 0 and `apps/web/out/index.html` exists | AC1 (part) |
| T4 | Tailwind v4 wiring + placeholder page (responsive) | build passes; screenshots at 360×740 and 1280×800 with no horizontal scroll (`scrollWidth <= innerWidth` asserted) | AC2 (part), AC6 (part) |
| T5 | Theme: no-flash head script + CSS fallback + toggle island | Playwright: (a) `colorScheme:'dark'` → `<html>` has `dark` at `waitUntil:'commit'` before hydration, and first-paint bg is not white; (b) `colorScheme:'light'` → light; (c) toggle flips class; (d) toggle back to OS value clears storage → reload honors OS. Screenshots for each state. | AC2 |
| T6 | web ↔ xploder wiring (`XPLODER_VERSION` + `xploder/motion`) | `pnpm build` exits 0; `grep -r "xploder v0.0.0" apps/web/out` hits | AC5 |
| T7 | Root scripts + fresh-clone proof | `git clone <local> /tmp/s01-fresh && cd … && pnpm install --frozen-lockfile && pnpm build` exits 0 on Node 24 (terminal log) | AC1 |
| T8 | CI workflow (`build` + `secrets` jobs) | PR run green: typecheck, lint, build, gitleaks (run URL + screenshot) | AC3, AC7 |
| T9 | Local secret scan | `gitleaks git --redact` → "no leaks found" (terminal log) | AC7 |
| T10 | Vercel wiring (**Murphy's hands**: import + settings) | branch push → preview URL; `curl -sI` → HTTP 200 over HTTPS | AC4 |
| T11 | Lighthouse mobile on preview | median of 3: Perf ≥ 95, A11y ≥ 95; JSON + HTML in `evidence/` | AC6 |
| T12 | `AGENTS.md`, `CLAUDE.md`, constitution content (spec-kit files already copied in Stage 2) | files present; `CLAUDE.md` imports `AGENTS.md`; frozen files diff empty | Deliverable 6 |
| T13 | `README.md` stub | file contains map + commands; commands copy-paste-run clean | Deliverable 7 |

**Phase groups (Stage 3 STOP points):** **G1 local scaffold** T1–T7 → STOP · **G2 pipeline** T8–T10 → STOP · **G3 proof & docs** T11–T13 → STOP + AC self-check table.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Vercel doesn't support pnpm 12 yet | AC4 blocked | `ENABLE_EXPERIMENTAL_COREPACK=1`, else fall back to pnpm 10.x everywhere |
| Preview protection left on | AC4/AC6 look failed (401) | D10: disable Vercel Authentication for previews |
| Theme flash on slow 4G devices | AC2 fail | blocking head script + CSS `prefers-color-scheme` fallback (works even before JS) |
| Budget executor runs `specify init --here --force` | frozen files touched | D13 scratch-dir procedure; frozen-file diff check in every task |
| Lighthouse variance on simulated mobile | flaky AC6 | median of 3 runs; zero webfonts, near-zero JS shell |
| Turbopack + `transpilePackages` edge cases with TS source packages | build fail | T6 isolates the seam; fallback `next build --webpack` for diagnosis only, not as the shipped config, unless Murphy approves |

---

## 6. Open questions (each with recommended default)

1. **Node pin: 24 LTS or 26?** → **Default: Node 24** (`.nvmrc` = `24`). 26 isn't LTS yet, and 24 is on the Mac and supported by Vercel.
2. **pnpm major: 12 (latest) or 10?** → **Default: pnpm 12** via corepack, pinned exactly in `packageManager`. Automatic fallback to 10.x if Vercel's install fails (logged in the task report).
3. **Static export (`output: 'export'`) or standard Next build on Vercel?** → **Default: `output: 'export'`.** It enforces "static-only" and keeps the VPS fallback trivial.
4. **Theme library: hand-rolled or next-themes?** → **Default: hand-rolled** (D6), with the "toggle back to OS value clears the override" semantics.
5. **Gitleaks in CI: CLI binary or gitleaks-action with a free org license?** → **Default: CLI binary** (no secret needed). Alternative: Murphy requests a free license and adds the `GITLEAKS_LICENSE` repo secret.
6. **Vercel preview Deployment Protection: disable?** → **Default: disable** for this project (public portfolio; AC4 and AC6 need anonymous access).
7. **Prettier + `format:check` in the CI lint step?** → **Default: yes.**
8. **When to run `specify init`: start of Stage 2 or as a Stage 3 task?** → **Default: start of Stage 2**, using the scratch-dir copy procedure, so Stage 2 artifacts follow the official templates.
9. **Evidence storage: commit screenshots and Lighthouse reports to `.specify/features/foundation/evidence/`?** → **Default: yes** (small PNG + JSON/HTML, no secrets).
10. **Branch / PR flow: open a PR from this slice branch to `main` when CI lands (T8), so AC3 runs on a PR?** → **Default: yes. Open a draft PR at T8. Merge to `main` only after Murphy's final S01 validation** (production deploy happens on that merge).
11. **Fonts: system stack in S01?** → **Default: yes**, with zero webfonts. Typography gets its own later decision.
12. **Dependabot/Renovate?** → **Default: no** in S01 (not in the brief). Revisit later.

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. The theme semantics in D6 match your intent for "light default + OS-aware" (default: as written).
2. The `output: 'export'` decision (D4) is acceptable for Vercel now and VPS later (default: accept).
3. The motion-token convention in D7 (subpath `xploder/motion`, lint enforcement deferred to S02) (default: accept).
4. The phase grouping in §4 gives you the validation points you want (default: G1/G2/G3).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to open questions §6 (default: all recommendations accepted).
2. Before G2: Vercel dashboard import of `Hi-Murphy/portfolio-teardown`, Root Directory `apps/web`, Node 24.x, preview protection off (default: you do this at T10 when prompted, about 3 minutes).
3. Permission to push this branch and open a draft PR at T8 (default: granted when you approve Stage 3 G2).
4. `brew install gitleaks` on the Mac, or permission for the agent to run it (default: the agent installs it via Homebrew at T9).
5. `corepack enable` on the Mac (pnpm isn't installed) (default: the agent runs it at T1. It only writes shims under the Node install).
