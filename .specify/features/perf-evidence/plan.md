# Implementation Plan: S03 Perf Gates + Evidence Loop

**Feature dir:** `.specify/features/perf-evidence/` · **Branch:** `task/s03-perf-evidence` · **Date:** 2026-10-29 · **Inputs:** `spec.md`, `rfc.md` (approved, §9)

## Summary

A new private workspace package `tools/perf` holds every perf tool: the Lighthouse gate, the weight gate, the evidence CLI, the FPS harness, the preview resolver and a static server. They are TypeScript files that Node 24 runs directly and that drive one Playwright-managed Chromium. A new workflow `.github/workflows/perf.yml` runs the two required gates against the PR's Vercel preview, plus two informational jobs (FPS calibration, fixture exclusion). `apps/web` gets three config-level changes: the build id becomes the commit SHA, an env-gated `pageExtensions`, and a fixture `distDir`. It also gets one fixture page that never compiles into production. `.specify/EVIDENCE.md` is the contract for later slices. Nothing in `packages/xploder` changes.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9, Node 24.19 native type stripping (`"type": "module"`, erasable syntax only, `.ts` import extensions) |
| New deps (`tools/perf` only) | `lighthouse@^13.6.0`, `playwright@^1.64.1` · dev: `vitest@^5.0.5`, `@types/node@^24.19.2`, `typescript@^5.9.3`, `eslint@^9.39.5` (+ `typescript-eslint` only if the xploder ESLint config already uses it; copy that config) |
| Browser | Playwright Chromium (`channel: 'chromium'`, new headless), 156.x at lockfile time. Install: `pnpm exec playwright install chromium` (CI: `--with-deps`) |
| Lighthouse | Node API, default (mobile) config, attached via CDP port to the Playwright browser |
| CI | GitHub Actions `ubuntu-latest`, `GITHUB_TOKEN` only, no new secrets |
| Tests | vitest, pure logic only (no browser in unit tests) |
| Targets | Perf ≥ 0.95 (median of 3), LCP < 2500 ms (median), CLS = 0 (every run), weight < 3,000,000 B (mobile and desktop), FPS 60 ±10% (54–66 inclusive) |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-006 quote AC1–AC6 verbatim. Supporting work maps to brief deliverables only. |
| II. Static-only shell | No server runtime. The fixture route is static and excluded from prod. `serve.ts` is a local/CI dev tool, not deployed. |
| III. Performance is a feature | This slice enforces it. The site's bytes are unchanged except the build-id string. |
| IV. Single motion source | Fixture animation uses only `--motion-*` CSS variables. The existing scanner covers the fixture. `tools/perf` contains no animation code. |
| V. Theme integrity | Untouched. |
| VI. Evidence over assertion | This slice builds the machinery. Every task saves evidence. |
| VII. No secrets | `GITHUB_TOKEN` only (never echoed). Artifacts hold public URLs and timings. gitleaks unchanged. |
| Constraints (stack) | lighthouse + playwright are dev tooling outside the runtime stack. Explicitly approved (RFC §9.2). |

## Project Structure

### Documentation (this feature)

```text
.specify/features/perf-evidence/
  rfc.md  spec.md  plan.md  tasks.md
  evidence/            T0NN-*.txt|png|json, AC-selfcheck.md
.specify/EVIDENCE.md   (T012)
```

### Source code (changes only)

```text
pnpm-workspace.yaml               + 'tools/*'
package.json (root)               + scripts: evidence, perf:lighthouse, perf:weight, fps, fps:calibrate, serve:out, build:fixtures
.gitignore                        + .evidence/  out-fixtures/
README.md                         + "Evidence & perf gates" section (T012)
AGENTS.md                         + §4 bullet linking .specify/EVIDENCE.md, + tools/perf in §2/§3 (T012)
.github/workflows/perf.yml        new (T007, T011)
apps/web/next.config.ts           phase function; generateBuildId; pageExtensions gate; VERCEL guard; fixture distDir (T006, T009)
apps/web/app/fixtures/fps-calibration/page.fixture.tsx      new (T009)
apps/web/app/fixtures/fps-calibration/main-lane.tsx         new, 'use client' (T009)   [plain .tsx: only reachable from the fixture page]
apps/web/app/fixtures/fps-calibration/fixture.module.css    new (T009)                  [or Tailwind arbitrary props via var(); no literals]
apps/web/test/fixture-exclusion.test.ts                     new (T009)
tools/perf/
  package.json  tsconfig.json  eslint.config.mjs  vitest.config.ts (only if needed)
  src/
    budgets.ts  exit-codes.ts  args.ts  browser.ts  reach.ts  serve.ts  log.ts
    lighthouse.ts  weight.ts  fps.ts  preview.ts  evidence.ts  summary-md.ts
    cli/evidence.ts  cli/lighthouse-gate.ts  cli/weight-gate.ts  cli/fps.ts  cli/fps-calibrate.ts  cli/serve.ts  cli/resolve-preview.ts
  test/
    fixtures/  (synthetic LHR JSON, CDP event streams, mini trace, sanitized Vercel comment)
    *.test.ts
```

`apps/web/app/fixtures/fps-calibration/main-lane.tsx` is a normal `.tsx` module. It isn't a route file, so it compiles only if something imports it, and only the gated `page.fixture.tsx` does. The exclusion test (T009) proves the marker and component code are absent from `out/`.

## Module contracts (`tools/perf/src`)

```ts
// budgets.ts — the only place thresholds live. No CLI flag or env var may override them.
export const PERF_MIN_SCORE = 0.95;          // pass iff median.score >= 0.95 (raw, unrounded)
export const LCP_MAX_MS = 2500;              // pass iff median LCP numericValue < 2500
export const CLS_MAX = 0;                    // pass iff every run's CLS numericValue === 0
export const WEIGHT_BUDGET_BYTES = 3_000_000;// pass iff total < 3_000_000, per profile
export const LIGHTHOUSE_RUNS = 3;
export const FPS_NOMINAL = 60;
export const FPS_TOLERANCE = 0.1;            // pass iff 54 <= fps <= 66

// exit-codes.ts
export const EXIT = { OK: 0, INTERNAL: 1, USAGE: 2, UNREACHABLE: 3, BROWSER: 4, PARTIAL: 5, BUDGET: 6 } as const;
export const EXIT_DESCRIPTIONS: Record<keyof typeof EXIT, string>;   // the EVIDENCE.md table is checked against this
export class CliError extends Error { constructor(code: number, message: string) }  // thrown → main() maps to process.exitCode

// args.ts — node:util parseArgs wrapper; unknown flag / missing positional → CliError(USAGE)
export function parseCli<T>(argv: string[], spec): T;
export function parseUrl(raw: string | undefined): URL;   // http/https only, else USAGE

// browser.ts
export const PROFILES: { mobile: Profile; desktop: Profile };  // from lighthouse/core/config/constants.js
                                                              // (screenEmulationMetrics + userAgents)
export async function launch(opts?: { cdpPort?: number }): Promise<Browser>; // channel 'chromium'; failure → CliError(BROWSER, "... run: pnpm exec playwright install chromium")
export async function freePort(): Promise<number>;
export function chromiumVersion(browser: Browser): string;

// reach.ts
export async function assertReachable(url: URL): Promise<{ status: number; finalUrl: string }>; // fetch GET, redirect follow; network error or status >= 400 → CliError(UNREACHABLE)

// serve.ts
export async function serveDir(dir: string, opts?: { port?: number; host?: '127.0.0.1' }): Promise<{ url: URL; close(): Promise<void> }>;
//  - `/a/b` → a/b.html | a/b/index.html | a/b; unknown → 404 (+ 404.html body if present)
//  - gzip via node:zlib when Accept-Encoding has gzip and type is text/js/css/json/svg
//  - Cache-Control: `public, max-age=31536000, immutable` under /_next/static, else `public, max-age=0, must-revalidate`
//  - path traversal rejected (resolved path must stay inside dir)

// lighthouse.ts
export async function runLighthouse(url: URL, opts: { runs: number; categories: string[] }): Promise<LHR[]>;
//   per run: freePort → launch({cdpPort}) → lighthouse(url, { port, output:'json', logLevel:'error', onlyCategories }) → close
export function pickMedianRun(lhrs: LHR[]): number;          // index; sort by perf score, tie → lower LCP; middle element
export function summarizeLighthouse(lhrs: LHR[]): LighthouseSummary;
export function assertLighthouse(summary: LighthouseSummary): Assertion[];   // uses budgets.ts only

// weight.ts
export async function measureWeight(url: URL, profile: 'mobile' | 'desktop'): Promise<WeightProfileResult>;
export function aggregateWeight(events: CdpNetEvent[], pageOrigin: string): WeightProfileResult; // pure; unit-tested
export function assertWeight(r: WeightReport): Assertion[];

// fps.ts
export interface FpsOptions { warmupMs?: number; durationMs?: number; trigger?: (page: Page) => Promise<void>; keepTrace?: boolean }
export interface FpsResult { fps: number; frames: number; droppedFrames: number; windowMs: number;
  intervalsMs: { p50: number; p95: number; max: number }; rafFps: number; source: 'trace:DrawFrame'; chromium: string;
  expect?: number; tolerance?: number; pass?: boolean }
export async function measureFps(page: Page, opts?: FpsOptions): Promise<FpsResult>;
export function analyzeTrace(events: TraceEvent[], windowStartUs: number, windowEndUs: number): Omit<FpsResult, 'rafFps'|'chromium'>; // pure
export function inBand(fps: number, expect: number, tolerance: number): boolean;  // inclusive

// preview.ts
export function parseVercelComment(body: string, project: string): string | null;   // [vc] base64 JSON → previewUrl; fallback [Preview](https://…vercel.app)
export async function waitForVercelStatus(gh: Gh, sha: string, o: { timeoutMs; intervalMs }): Promise<void>; // success → resolve; failure/error/timeout → CliError(UNREACHABLE)
export async function waitForSha(url: URL, sha: string, o): Promise<void>;          // HTML contains sha; timeout → CliError(UNREACHABLE)
export async function resolvePreviewUrl(o: { repo; pr; sha; token; project?: 'portfolio-teardown' }): Promise<URL>;
//  Gh = injected minimal fetch wrapper (Authorization: Bearer token; never logged), so tests stub it.
```

Every CLI follows one shape: `main(argv) → Promise<number>`, wrapped by `run(main)`, which sets `process.exitCode` and maps `CliError.code`. Anything else maps to 1, with the stack printed. `--help` prints usage and the exit-code table and exits 0.

## CLI contracts

| Root script | Command | Writes | Exit |
|---|---|---|---|
| `pnpm evidence <url> [--out d] [--runs n=3] [--color-scheme light\|dark] [--full-page] [--wait-for css]` | `node tools/perf/src/cli/evidence.ts` | `screenshot-mobile.png`, `screenshot-desktop.png`, `lighthouse-summary.json`, `lighthouse-report.json`, `meta.json` into `--out` or `.evidence/<YYYYMMDD-HHmmss>-<host-slug>/` | 0/1/2/3/4/5 |
| `pnpm perf:lighthouse <url> [--out d]` | `cli/lighthouse-gate.ts` | `lighthouse-summary.json`, `lighthouse-run-<i>.json`; appends Markdown to `$GITHUB_STEP_SUMMARY` if set | 0/1/2/3/4/6 |
| `pnpm perf:weight <url> [--out d]` | `cli/weight-gate.ts` | `weight.json`; step summary | 0/1/2/3/4/6 |
| `pnpm fps <url> [--warmup ms=1000] [--duration ms=5000] [--expect fps --tolerance f] [--trace] [--out d]` | `cli/fps.ts` | `fps.json` (+ `fps-trace.json.gz`) | 0/1/2/3/4/6 (6 only with `--expect`) |
| `pnpm fps:calibrate [--out d]` | `cli/fps-calibrate.ts` | runs `build:fixtures` unless `--no-build`, serves `out-fixtures/`, then `fps <served>/fixtures/fps-calibration --expect 60 --tolerance 0.1` | same as `fps` |
| `pnpm serve:out [--dir apps/web/out] [--port 4173]` | `cli/serve.ts` | prints URL; runs until SIGINT | 0/2 |
| `pnpm build:fixtures` | `PERF_FIXTURES=1 pnpm --filter web build` | `out-fixtures/` at repo root (see "Fixture build") | build's |
| (CI) `node tools/perf/src/cli/resolve-preview.ts --repo o/r --pr N --sha S` | | `url=<preview>` to `$GITHUB_OUTPUT` (stdout otherwise) | 0/2/3 |

Gate default `--out`: `.evidence/ci/<gate>/` in CI (`CI=true`), else `.evidence/<stamp>-<gate>/`. `PROFILES` are shared by evidence screenshots, the weight gate and Lighthouse (whose default config uses the same constants), so "mobile" means one thing everywhere.

## Artifact formats

```jsonc
// lighthouse-summary.json
{ "kind": "lighthouse-summary", "version": 1, "url": "...", "finalUrl": "...",
  "tools": { "lighthouse": "13.6.0", "chromium": "156.0.…" }, "formFactor": "mobile", "throttling": "simulate",
  "runs": [ { "performance": 1, "accessibility": 1 /* evidence only */, "lcpMs": 804, "cls": 0, "tbtMs": 27,
              "fcpMs": 804, "siMs": 900, "totalByteWeight": 148000, "benchmarkIndex": 1500 } ],
  "medianRun": 1,
  "assertions": [ { "id": "performance", "threshold": ">= 0.95", "actual": 1, "scope": "median", "pass": true },
                  { "id": "lcp", "threshold": "< 2500", "actual": 804, "scope": "median", "pass": true },
                  { "id": "cls", "threshold": "=== 0", "actual": [0,0,0], "scope": "every-run", "pass": true } ],
  "pass": true }

// weight.json
{ "kind": "weight", "version": 1, "url": "...", "budgetBytes": 3000000,
  "profiles": { "mobile":  { "totalBytes": 148577, "requests": 9, "byType": { "script": 0 }, "byOrigin": { "first": 0, "third": 0 },
                             "top": [ { "url": "...", "type": "script", "bytes": 0, "thirdParty": false } ], "pass": true },
                "desktop": { /* same */ } },
  "pass": true }

// meta.json (evidence)
{ "kind": "evidence-meta", "version": 1, "url": "...", "finalUrl": "...", "httpStatus": 200,
  "startedAt": "2026-10-29T15:00:00.000Z", "finishedAt": "...", "durationMs": 0, "argv": [], "colorScheme": "light",
  "git": { "sha": "…", "dirty": false },
  "tools": { "evidence": "0.0.0", "lighthouse": "13.6.0", "playwright": "1.64.1", "chromium": "156…", "node": "v24.19.0", "os": "darwin", "arch": "arm64" },
  "steps": [ { "name": "screenshot-mobile", "ok": true, "ms": 0 }, { "name": "screenshot-desktop", "ok": true, "ms": 0 },
             { "name": "lighthouse", "ok": true, "ms": 0 } ],
  "artifacts": ["screenshot-mobile.png", "screenshot-desktop.png", "lighthouse-summary.json", "lighthouse-report.json", "meta.json"],
  "exitCode": 0 }

// fps.json — FpsResult + { "kind": "fps", "version": 1, "url": "..." }
```

The step summary (Markdown) is one table per gate (threshold | measured | pass), plus all runs for Lighthouse and the top-5 requests for weight.

## Preview resolution (CI)

```text
resolve-preview(repo, pr, sha=pull_request.head.sha, token=GITHUB_TOKEN)
  1. poll GET /repos/{repo}/commits/{sha}/statuses  every 10s ≤ 12 min
       latest status with context "Vercel": success → go · failure|error → exit 3 · none/pending → wait
  2. GET /repos/{repo}/issues/{pr}/comments (paginate) → newest comment by "vercel[bot]"
       parseVercelComment(body, "portfolio-teardown") → https://<previewUrl>  (null → exit 3)
  3. poll GET <previewUrl>/ every 10s ≤ 3 min until body includes sha → else exit 3
  4. echo "url=https://<previewUrl>/" >> $GITHUB_OUTPUT
```

`apps/web/next.config.ts` adds `generateBuildId: async () => process.env.VERCEL_GIT_COMMIT_SHA ?? null`.

## Fixture build and exclusion

```ts
// apps/web/next.config.ts (shape)
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
export default (phase: string): NextConfig => {
  const fixtures = phase === PHASE_DEVELOPMENT_SERVER || process.env.PERF_FIXTURES === '1';
  if (process.env.PERF_FIXTURES === '1' && process.env.VERCEL) throw new Error('PERF_FIXTURES must never be set on Vercel');
  return {
    output: 'export', images: { unoptimized: true }, reactStrictMode: true, transpilePackages: ['xploder'],
    generateBuildId: async () => process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    pageExtensions: fixtures ? ['tsx', 'ts', 'jsx', 'js', 'fixture.tsx'] : ['tsx', 'ts', 'jsx', 'js'],
    ...(process.env.PERF_FIXTURES === '1' ? { distDir: '../../out-fixtures' } : {}),   // T009 verifies; see fallback
  };
};
```

- **Verify in T009** whether `distDir` with `output: 'export'` redirects the exported files. If it doesn't (or `.next` state collides), use the fallback: `build:fixtures` = `PERF_FIXTURES=1 next build` and then move `apps/web/out` → `out-fixtures/`, all in one node script `tools/perf/src/cli/build-fixtures.ts`. The production `out/` is then rebuilt by the normal `pnpm build`. Record which variant shipped.
- **`fixture-exclusion.test.ts` (apps/web):** skipped with a clear message if `out/` doesn't exist (local `pnpm test` before a build). Otherwise it asserts that no file under `out/` contains `data-perf-fixture` or `fps-calibration`, and that no `out/fixtures/` entry exists. A **positive control** runs only when `out-fixtures/` exists: the marker must be present there. CI's `build` job runs `pnpm test` before `pnpm build`, so in T009 the `ci.yml` build job gains one more step after `pnpm build`: `pnpm --filter web exec vitest run test/fixture-exclusion.test.ts` (scan of the fresh `out/`). This is a step inside the existing job, not a new check.
- **Fixture page:** `page.fixture.tsx` (server component) renders a heading, a compositor lane and a main-thread lane of 12 boxes each, inside `<main data-perf-fixture="fps-calibration">`. Compositor lane: CSS keyframes `translateX` 0 → lane width on `animation: <name> var(--motion-duration-explode) var(--motion-ease-explode) infinite alternate`. Main-thread lane: `main-lane.tsx` (`'use client'`) runs a rAF loop that reads `progress` from the compositor lane's `getAnimations()[0].effect.getComputedTiming()` and writes `style.transform`. No numeric animation literal anywhere: the existing scanner test must stay green.

## CI flow (`.github/workflows/perf.yml`)

```yaml
name: perf
on: { pull_request: {}, push: { branches: [main] } }
permissions: { contents: read, statuses: read, pull-requests: read, issues: read }
concurrency: { group: perf-${{ github.ref }}, cancel-in-progress: true }
jobs:
  lighthouse:
    name: 'perf-gate: lighthouse (mobile)'
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - checkout · pnpm/action-setup · setup-node (.nvmrc, cache pnpm) · pnpm install --frozen-lockfile   # same versions as ci.yml
      - uses: actions/cache  (path ~/.cache/ms-playwright, key ms-playwright-${{ runner.os }}-<playwright version from lockfile>)
      - run: pnpm --filter perf-tools exec playwright install --with-deps chromium
      - id: preview
        run: node tools/perf/src/cli/resolve-preview.ts --repo "$GITHUB_REPOSITORY" --pr "${{ github.event.pull_request.number }}" --sha "${{ github.event.pull_request.head.sha }}"
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - run: pnpm perf:lighthouse "${{ steps.preview.outputs.url }}"
      - if: always()  → actions/upload-artifact (name perf-lighthouse, path .evidence/ci/, retention-days 14)
  weight:            # identical skeleton; name 'perf-gate: weight (< 3 MB)'; runs pnpm perf:weight
  fps-calibration:   # name 'perf: fps calibration'; pull_request only; no preview; runs pnpm fps:calibrate; uploads fps.json
  fixture-exclusion: # name 'perf: fixture exclusion'; PR: resolve-preview → curl <url>/fixtures/fps-calibration → expect 404 and no marker
                     # push main: resolve-production (Vercel status success on github.sha, then poll PRODUCTION_URL for the sha) → same 404 check
```

- `PRODUCTION_URL` = `https://portfolio-teardown.vercel.app` (public production alias, probed 200 on 2026-10-29). It's set as a workflow-level `env`, not a secret. `resolve-preview.ts --production --url $PRODUCTION_URL --sha $GITHUB_SHA` runs steps 1 and 3 only.
- The fixture check is a small CLI `tools/perf/src/cli/assert-absent.ts <url>`. It exits 0 iff the status is 404 and the body lacks `data-perf-fixture`, else 6. It's unit-tested via the stubbed fetch.
- **Required contexts (ruleset, T013):** `build (typecheck, lint, test, build)`, `secrets (gitleaks)`, `perf-gate: lighthouse (mobile)`, `perf-gate: weight (< 3 MB)`. Admin bypass. Branch `main` only. No other rules.

## Data flow

```text
PR push ─▶ Vercel build (prod-mode next build, buildId = SHA) ─▶ status "Vercel: success" + bot comment [vc]
        ─▶ perf.yml/lighthouse: resolve-preview ─▶ 3× LH13 mobile on Playwright Chromium ─▶ summary ─▶ exit 0|6
        ─▶ perf.yml/weight:     resolve-preview ─▶ CDP transfer sum (mobile, desktop) ─▶ weight.json ─▶ exit 0|6
seat ─▶ pnpm evidence <url> ─▶ .evidence/<stamp>-<host>/{2×png, lighthouse-summary, lighthouse-report, meta}
     ─▶ copy chosen files ─▶ .specify/features/<f>/evidence/T0NN-<kind>[-variant].<ext>   (EVIDENCE.md)
engine slice ─▶ measureFps(page, { trigger }) ─▶ FpsResult ─▶ its own 60 fps gate (S4/S5)
```

## Test map (vitest, `tools/perf/test`)

| File | Covers |
|---|---|
| `exit-codes.test.ts` | codes unique and 0–6. **EVIDENCE.md exit table == `EXIT`/`EXIT_DESCRIPTIONS`** (added in T012; parses the Markdown table) |
| `args.test.ts` | missing URL / `ftp:` / unknown flag → USAGE; `--out` relative resolution against `process.cwd()` |
| `reach.test.ts` | closed port → UNREACHABLE; local `serveDir` 404 → UNREACHABLE; 200 ok |
| `serve.test.ts` | clean-URL mapping, 404, gzip header, traversal rejected, cache headers |
| `lighthouse.test.ts` | median pick (incl. tie); score 0.949 fail / 0.95 pass; LCP 2499 pass / 2500 fail; CLS `[0,0,0.0001]` fail; summary schema |
| `weight.test.ts` | aggregation from a synthetic event stream (incl. failed request, third-party); 2,999,999 pass / 3,000,000 fail; both profiles must pass |
| `fps.test.ts` | `analyzeTrace` on `fixtures/mini-trace.json` (pid filter, window clipping, intervals, dropped); `inBand(54/66 pass, 53.9/66.1 fail)` |
| `preview.test.ts` | `[vc]` decode on `fixtures/vercel-comment.md` (sanitized: example project/scope names), regex fallback, null case; status sequence pending→success, failure → UNREACHABLE, timeout (fake timers); sha wait |
| `evidence.test.ts` | meta schema validator + default out-dir naming (`YYYYMMDD-HHmmss-<host-slug>`) |
| `apps/web/test/fixture-exclusion.test.ts` | `out/` has no marker; `out-fixtures/` has it (positive control) |

## Phase groups (Stage 3 STOP points)

| Group | Tasks | Proves | Needs from Murphy at STOP |
|---|---|---|---|
| **G1 local tooling** | T001–T005 | AC3 | validation + push/PR permission takes effect (granted) |
| **G2 CI gates** | T006–T008 | AC1, AC2 | look at the green/red PR checks |
| **G3 FPS + fixture** | T009–T011 | AC4 (pre-merge parts) | — |
| **G4 contract & ship** | T012–T014 | AC5, AC6 | ruleset applied (granted), final validation, merge |

Usage pacing (RFC §9.6): each group starts in a fresh 5h window. No new task starts at ≥ 85% of the 5h window.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `tools/perf` workspace package | typecheck, lint and tests for tooling; deps kept out of `apps/web` | loose scripts have no types or tests |
| own static server (`serve.ts`) | fallback path, fixture builds, local runs without a dep | `serve`/`sirv` add a dependency for ~60 lines |
| preview resolver | no GitHub Deployments from Vercel; no Vercel token allowed | `deployment_status` never fires here; a token is a new secret |
| two-lane fixture | measures both compositor and main-thread frame production | a CSS-only fixture wouldn't exercise the main thread the engine will load |
