# Portfolio Teardown — Agent Instructions

## 1. Project

Portfolio Teardown is a data-driven "teardown" portfolio. Each project renders as an exploded
architecture view from data files, using the renderer library `xploder`, which is intended for a
future open-source release. The design target is a mid-range Android phone on a 4G connection.

## 2. Stack & layout

- pnpm 12 workspaces; Node 24 is pinned in `.nvmrc`.
- `apps/web`: Next.js 16 App Router, `output: 'export'`, Tailwind CSS v4.
- `packages/xploder`: source-only TypeScript, with exports for `.`, `./motion`, `./theme`,
  `./layout`, `./react` and `./fixtures`. `./react` needs the optional React, `three` and
  `@react-three/fiber` peers. It is consumed through `workspace:*` and Next.js `transpilePackages`.
- `tools/perf`: private Node 24/TypeScript perf tooling for evidence, Lighthouse, weight, FPS, preview
  resolution, and serving the static export.

## 3. Commands

- `pnpm install` — install workspace dependencies.
- `pnpm dev` — start the web app.
- `pnpm build` — build every workspace package that defines a build.
- `pnpm typecheck` — typecheck every workspace package.
- `pnpm lint` — run ESLint and the Prettier check.
- `pnpm test` — run every workspace package's tests.
- `pnpm format` — format the repository with Prettier.
- `pnpm evidence <url>` — write screenshots, a Lighthouse summary, and `meta.json` to `.evidence/`.
- `pnpm perf:lighthouse <url>` / `pnpm perf:weight <url>` — run the mobile performance and weight gates.
- `pnpm fps <url>` / `pnpm fps:calibrate` — measure FPS or calibrate the dev-only fixture.
- `pnpm engine:probe <url>` / `pnpm fps:engine [--scenario tour]` — probe `/dev/engine` behaviour or
  measure its FPS
  (fixture export).
- `pnpm build && pnpm serve:out` — serve the local production export.

## 4. Process

- Slice briefs live in `.specify/slices/` and are frozen. Never edit them.
- Feature artifacts live in `.specify/features/<name>/`: `rfc.md`, `spec.md`, `plan.md`, `tasks.md`,
  and `evidence/`. Do not use spec-kit's default `specs/` directory.
- Never run `specify init` inside the repo, including with `--here` or `--force`.
- Acceptance criteria are never reworded or relaxed. A blocked criterion is escalated with evidence.
- Visual and performance claims require evidence files in `evidence/`.
- Evidence follows `.specify/EVIDENCE.md`.

## 5. Motion convention (binding)

`xploder/motion` is the only source of durations, easings, and staggers. Import `motion` (or the
`durations`, `easings`, and `staggers` token groups) from `'xploder/motion'` and palette values from
`'xploder/theme'`; never deep-import `xploder/src`. Do not write literal durations, easings, or
staggers, or CSS transition timings, in application or library code. No animation number literal may
exist outside `packages/xploder/src/motion/`; `apps/web/test/no-motion-literals.test.ts` enforces it.

## 6. Theme

Light is the default theme, with an OS-aware dark alternative and no flash on load. The inline head
script in `app/theme-script.ts` applies the stored or OS theme before paint, with a CSS
`prefers-color-scheme` fallback. Toggling back to the OS value clears the stored override.

## 7. Hard rules

- Static only: no server runtime, API routes, or database.
- No analytics.
- No secrets, IPs, tokens, private hostnames, or private repository names anywhere: code, comments,
  fixtures, evidence, or commits.
- `.env*` is git-ignored.
- No DNS or domain changes.
- CI must stay green: typecheck, lint and format, build, and gitleaks.
