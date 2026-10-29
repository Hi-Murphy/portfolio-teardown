# Portfolio Teardown

Data-driven teardown portfolio: every project rendered as an exploded architecture view.

Slice 01 (foundation) — placeholder shell; content and renderer arrive slice by slice.

## Monorepo map

```text
portfolio-teardown/
├── apps/web/                       # Next.js 16 static site
├── packages/xploder/               # renderer library stub; motion tokens at xploder/motion
├── .specify/                       # slice briefs, RFCs, specs, plans, tasks, and evidence
└── .github/workflows/ci.yml        # typecheck, lint, build, and gitleaks
```

## Prerequisites

- Node 24 (`nvm use` reads `.nvmrc`)
- `corepack enable` (the pnpm version is pinned in `package.json`)

## Commands

```sh
pnpm install # install workspace dependencies
pnpm dev # start the local development server at http://localhost:3000
pnpm build # create the static export in apps/web/out
pnpm typecheck # typecheck every workspace package
pnpm lint # lint every workspace package and check formatting
pnpm test # run every workspace package's tests
pnpm format # format the workspace with Prettier
```

## Evidence & perf gates

Install the pinned Chromium once, then run evidence or a gate against a deployed preview or a local
export:

```sh
pnpm --filter perf-tools exec playwright install chromium
pnpm evidence <url> # screenshots, Lighthouse summary, meta
pnpm perf:lighthouse <url> # mobile performance gate
pnpm perf:weight <url> # initial-load weight gate
pnpm fps <url> # animation FPS harness
pnpm build && pnpm serve:out # serve the local production export
```

The task-type artifact matrix, naming rules, FPS interface, and gate-failure escalation are binding
in [`.specify/EVIDENCE.md`](.specify/EVIDENCE.md).

Contributing agents: read AGENTS.md.
