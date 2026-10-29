# RFC — S03 Perf Gates + Evidence Loop

**slice:** S03-perf-evidence · **status:** DRAFT for Murphy review (Stage 1 gate) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-03-perf-evidence.md` (frozen brief v1) · **branch:** `task/s03-perf-evidence` · **date:** 2026-10-29

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins and the conflict should be raised as an open question.

---

## 1. Context (from the brief)

- **Mission:** make quality *measured, not vibed*. Automate the performance gates in CI against real preview deploys, and ship the repo-side evidence tooling that every later visual/engine slice depends on. **No engine code, no schema changes, no theme changes.**
- **Design target:** mid-range Android over 4G. Locked budgets (PRD G2): **first load < 3MB · LCP < 2.5s · 60fps floor on animation · zero layout shift.**
- **Doctrine:** measured gates beat eyeballs. Every visual/perf task in later slices attaches machine-produced evidence (screenshot + metrics). This slice builds that machinery.
- **Gates run against a real deployed URL**, not only a local build. Every PR gets a Vercel preview through the Vercel GitHub integration.
- **Portability:** tooling runs in GitHub Actions (ubuntu + headless Chrome) and locally via pnpm, with no host-specific hacks.
- **Non-goals (hard):** rendering-engine code (S4+) · schema/contract changes (S2 frozen, zero new fields, zero `xploder` public-API changes) · theme/palette work · a11y automation (S8) · DNS/Vercel-project config beyond what CI integration requires · analytics.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | every PR runs an automated Lighthouse mobile audit against a real deployed/preview URL; Perf ≥ 95, LCP < 2.5s, CLS = 0 enforced; violation fails the check (demonstrated once with a deliberately broken threshold in a scratch run, reverted). |
| AC2 | initial-load weight < 3MB enforced in CI; over-budget fails the check (demonstrated likewise). |
| AC3 | `pnpm evidence <url>` produces the full standardized artifact set locally; output dir git-ignored; exit codes documented and honored. |
| AC4 | FPS harness on the calibration fixture reports 60 ±10% headless; fixture excluded from the production build (verified against the deployed prod URL). |
| AC5 | `.specify/EVIDENCE.md` committed and referenced from the repo README or `.specify/KICKOFF` chain so seats discover it. |
| AC6 | full CI green on the PR: typecheck, lint, test, build, gitleaks, + the two new gates. |

### Starting point (S01 + S02, checked on this branch)

| Item | State |
|---|---|
| CI | `.github/workflows/ci.yml`: job `build (typecheck, lint, test, build)` + job `secrets (gitleaks)`. Triggers: `pull_request`, `push` to `main`. `permissions: contents: read`. |
| Branch protection | **None.** `main` has no protection and no rulesets (`gh api …/branches/main/protection` → 404, `…/rulesets` → `[]`). Today **no** check is required. Repo is public. |
| Vercel | Git integration, Root Directory `apps/web`, Deployment Protection **off** (S01 D10), "skip unaffected deployments" **off** (S01 T010), so every push deploys. |
| Vercel → GitHub signals | **No GitHub Deployments** (`…/deployments` → 0 entries), so there are no `deployment_status` events. Vercel posts a **commit status** (context `Vercel`, `pending` → `success`, `target_url` = dashboard inspector, *not* the site) and a **`vercel[bot]` PR comment**. The comment starts with a machine-readable line `[vc]: #<sig>:<base64 JSON>`, and the JSON carries `projects[].previewUrl` (the branch alias, e.g. `portfolio-teardown-git-task-s02-contracts-tokens-<scope>.vercel.app`) and `nextCommitStatus: "DEPLOYED"`. |
| `apps/web` | Next 16.4 static export (`out/`), Turbopack. Landing page only. Motion-literal scanner test covers `apps/web/**`. |
| Root scripts | `build`, `test`, `typecheck`, `lint` fan out with `pnpm -r --if-present`. Workspace globs: `apps/*`, `packages/*`. |

### Environment facts checked 2026-10-29

| Item | Fact | Source |
|---|---|---|
| Node / pnpm | v24.19.0 / 12.15.0. Node 24 runs `.ts` files natively (type stripping, no flag, no warning) when the nearest `package.json` has `"type": "module"`. | local probe |
| lighthouse | 13.6.0 (`engines.node >=22.19`). ESM default export imports cleanly. Default config = mobile (Moto G Power emulation, simulated Slow-4G: 150 ms RTT, ~1.6 Mbps, 4× CPU). | npm, local probe |
| @lhci/cli | 0.15.1, **bundles lighthouse 12.6.1** (one major behind). | npm |
| playwright | 1.64.1 → Chromium **156.0.8078.4** (Chrome for Testing build). | npm, local probe |
| Preview weight today | Landing page on the S02 preview: **148,577 bytes** encoded transfer, 9 requests (CDP `Network.loadingFinished`, cache disabled). The production alias: 148,504 bytes, 8 requests. | local probe |
| Vercel toolbar | Previews load `vercel.live/_next-live/feedback/feedback.js`. The production alias does not. Sending `x-vercel-skip-toolbar: 1` on every request **did not** suppress it. Its byte cost is negligible (Δ ≈ 73 B observed). | local probe |
| Headless FPS | Synthetic rAF-driven transform animation, 5 s trace window. Default headless shell: **300 `DrawFrame`** / 300 `Display::FrameDisplayed`, rAF 60.0 fps. New headless (`channel: 'chromium'`): **296 `DrawFrame`**, 7 `DroppedFrame`, rAF 59.1 fps. Both are well inside 60 ±10%. | local probe (Mac arm64) |
| Build id in HTML | Next embeds its build id in the inline flight payload (`\"b\":\"<id>\"`). `generateBuildId` controls the value. | curl of S02 preview |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Tooling home and runtime

- **R:** a new private workspace package **`tools/perf`** (name `perf-tools`). `pnpm-workspace.yaml` adds `tools/*`. It is not a library and not part of `xploder`. The brief forbids changing the lib's API, and gates belong to the repo, not the OSS package.

  ```
  tools/perf/
    package.json        "type": "module"; deps: lighthouse, playwright; dev: vitest, @types/node
    tsconfig.json       strict, noEmit, allowImportingTsExtensions, erasableSyntaxOnly, verbatimModuleSyntax
    src/
      budgets.ts        THE thresholds (D2/D4); single source, no runtime override
      exit-codes.ts     EXIT map (D6), shared by every CLI, asserted against EVIDENCE.md by a test
      args.ts           tiny argv parser (node:util parseArgs)
      browser.ts        Playwright Chromium launch (+ CDP port for Lighthouse), mobile/desktop profiles
      reach.ts          document reachability probe (→ exit 3)
      serve.ts          zero-dep static server for apps/web/out (local + fallback + fixture builds)
      lighthouse.ts     runLighthouse(url, {runs}) → LHRs; summarize(); assertLighthouse()
      weight.ts         measureWeight(url, profile) → per-request breakdown; assertWeight()
      fps.ts            measureFps(page, opts) → FpsResult (D7)
      preview.ts        resolvePreviewUrl({repo, sha, pr, token}) (D3)
      cli/evidence.ts · cli/lighthouse-gate.ts · cli/weight-gate.ts · cli/fps.ts · cli/serve.ts · cli/resolve-preview.ts
    test/               vitest, pure logic only (no browser in unit tests)
  ```

- **Runtime:** CLIs are `.ts` run directly by Node 24 (type stripping, checked above). There's no build step and no `tsx` dependency. Root scripts call `node tools/perf/src/cli/<x>.ts` so the **cwd stays the repo root**. Relative `--out` paths then behave as expected. (A `pnpm --filter … exec` script would run in `tools/perf/`.)
- **Root scripts added:** `evidence`, `perf:lighthouse`, `perf:weight`, `fps`, `fps:calibrate`, `serve:out`. `pnpm evidence <url> [--out <dir>]` then works exactly as the brief writes it.
- **One browser everywhere:** Playwright-managed **Chromium in new-headless mode** (`channel: 'chromium'`) for screenshots, weight, FPS **and** Lighthouse. Lighthouse attaches to the Playwright-launched browser through `--remote-debugging-port=<free port>` and `lighthouse(url, { port })`. Install is `pnpm exec playwright install chromium` (CI: `--with-deps`, cached by Playwright version). The browser version is pinned by the lockfile, identical on the Mac and on ubuntu, and launched with the same flags on every host. That is the brief's "no host-specific hacks" requirement.
- **Rejected:** a `scripts/` folder of loose `.mjs` files (no typecheck, no tests) · `chrome-launcher` + system Chrome (a second launch path; sandbox flags differ between macOS and ubuntu-24.04; version drifts with the runner image) · Puppeteer (a second automation lib next to Playwright) · putting tools in `packages/` (that folder means "publishable lib").

### D2 — Lighthouse gate (AC1): custom gate on `lighthouse@13`, not LHCI

- **R:** a thin custom gate, `pnpm perf:lighthouse <url>`, on the **Lighthouse 13 Node API**, sharing its runner with the evidence CLI (D6).
  - **Why not `@lhci/cli`:** it bundles Lighthouse **12.6.1**. Then the gate and the evidence CLI would measure with different Lighthouse majors and could disagree on the same page. Its convenient upload target (`temporary-public-storage`) publishes reports to a third-party service, which we must not use. It also adds a server/config surface we don't need. The assertion logic we need is about 60 lines of pure, unit-testable code.
- **Config:** Lighthouse **default mobile config** (Moto G Power emulation, simulated throttling ≈ Slow 4G, 4× CPU). That is the brief's target device and the one S01/S02 baselines used. Only the `performance` category runs in the gate (speed). The evidence CLI adds `accessibility` as report-only data (no a11y gating; S8 owns that).
- **Runs and aggregation:** **3 runs**, each in a fresh browser (cold cache). Assertions:

  | Threshold (from `budgets.ts`) | Metric | Evaluated on | Pass condition (exact) |
  |---|---|---|---|
  | Perf ≥ 95 | `categories.performance.score` | **median run** (by perf score, LCP as tie-break) | `score >= 0.95` (raw score, no display rounding) |
  | LCP < 2.5s | `audits['largest-contentful-paint'].numericValue` | **median run** | `< 2500` ms |
  | CLS = 0 | `audits['cumulative-layout-shift'].numericValue` | **every run** | `=== 0` |

  Median-of-3 for score and LCP absorbs runner noise on shared CI machines. S01's AC6 used the same median-of-3 rule. CLS is deterministic for a given page, so *any* non-zero run is a real shift and fails. **Open question 3** offers the stricter "every run must pass all three" variant.
- **Output:** `lighthouse-summary.json` (thresholds, measured values for every run, which run is the median, pass/fail per assertion, Lighthouse + Chromium versions, `benchmarkIndex`) · full LHR JSON per run · a Markdown table appended to `$GITHUB_STEP_SUMMARY` in CI. Exit **6** on any violated threshold (D6).
- **Thresholds have no runtime override.** No CLI flag or env var loosens a gate. The only way to change a number is a reviewed diff to `budgets.ts`. That is also how the AC1/AC2 demos work (D9).
- **Rejected:** LHCI (above) · PageSpeed Insights API (external service, rate limits, can't test previews reliably) · `devtools` throttling (real throttling is noisier on CI than simulation).

### D3 — Preview-URL access strategy (AC1, AC2) + fallback (open question 1)

**Finding: access from CI is possible.** Previews are anonymous HTTP 200 (S01 D10, re-probed today). The URL is discoverable with the built-in `GITHUB_TOKEN`. No Vercel token and no new secret are needed. The difficulty is only *discovery*: Vercel creates no GitHub Deployments here, so the common `deployment_status` trigger never fires.

- **R: `resolve-preview` step inside each gate job**, using GitHub REST and `GITHUB_TOKEN` (`statuses: read`, `pull-requests: read`, `issues: read`):
  1. **Wait for the deploy of the PR head SHA** (`github.event.pull_request.head.sha`, not the merge SHA). Poll `GET /commits/{sha}/statuses` every 10 s until context `Vercel` is `success`. `failure`/`error` → exit 3 immediately. Time out after 12 min → exit 3.
  2. **Read the URL** from the `vercel[bot]` PR comment. Decode the `[vc]:` base64 JSON and take `projects[name="portfolio-teardown"].previewUrl`. Fallback: regex the `[Preview](https://….vercel.app)` link in the same comment. Never hard-code or compute the alias slug: Vercel truncates long branch names with a hash (seen in S01: `…-git-timurharyo-portfolio-a19548-…`).
  3. **Prove freshness.** The branch alias always points at the branch's *latest* ready deployment. To make sure we test *this* SHA, `apps/web/next.config.ts` gets `generateBuildId: () => process.env.VERCEL_GIT_COMMIT_SHA ?? null` (`null` = Next's default locally). Then poll `GET <previewUrl>` until the HTML contains the head SHA (≤ 3 min). This is config only: no markup, no `xploder` change. If a future Next stops embedding the build id, the check fails loudly (it never passes silently). The documented fallback is a `<meta name="build-sha">` tag.
  4. Emit `url=` to `$GITHUB_OUTPUT` for the gate step.
- **Why inside each gate job, not a separate "resolve" job they `need`:** when a needed job fails, GitHub **skips** the dependent jobs, and *skipped required checks count as passing*. A broken deploy would turn the gates green-by-skip. With resolution inside each gate job, "no preview" means a **red gate**.
- **Fallback (brief Deliverable 1):** **build + static-serve inside CI.** `pnpm build` → `pnpm serve:out` (D1 `serve.ts`, gzip on, cache headers like Vercel's) → the same gate commands against `http://127.0.0.1:<port>/`. The code path exists anyway for local iteration and FPS fixture builds.
  - **Recommendation: no automatic fallback in CI.** A localhost run is not "a real deployed/preview URL" (AC1). Silently switching to it would make a check green without meeting AC1. If preview access ever breaks for good, that is a **blocked AC1 → STOP + escalate with evidence**. Murphy can then choose to adopt the fallback explicitly (one-line workflow change, logged as a brief revision).
- **Rejected:** `deployment_status` trigger (no GitHub Deployments here; turning them on is a Vercel setting the brief would rather we didn't touch, and a failed deploy leaves the required check "expected" forever) · Vercel REST API + `VERCEL_TOKEN` (new secret, new Murphy dependency; the brief says none) · computing the alias slug (undocumented truncation/hash) · third-party "wait-for-vercel-preview" actions (supply-chain surface for ~80 lines of our own code).

### D4 — Weight budget measurement (AC2)

- **R:** `pnpm perf:weight <url>` measures **bytes over the wire for the initial load** in Playwright Chromium via CDP. This is independent of Lighthouse, so the two gates are separate signals and separate checks.
  - Fresh context, `Network.setCacheDisabled(true)`, service workers blocked.
  - Navigate and wait for `load`, then **network quiet** (no request in flight for 1 s, capped at 30 s after `load`).
  - **Sum `encodedDataLength` from `Network.loadingFinished`** (compressed body + headers, i.e. real transfer) for every request in that window, first- and third-party. Failed requests add their received bytes.
  - Run it **twice: mobile profile** (Lighthouse Moto G Power: 412×823 @1.75, mobile UA, touch) **and desktop** (1350×940 @1). Responsive assets could differ, so **both must pass.**
- **Budget:** `WEIGHT_BUDGET_BYTES = 3_000_000` and the check is `total < 3_000_000`. That's decimal MB, the stricter of the two readings of "3MB" (3 MiB = 3,145,728). **Open question 4.**
- **Vercel toolbar:** counted, not excluded. It exists on previews and not in prod, so including it is conservative (it can only make the gate stricter). The report labels it as third-party.
- **Output:** `weight.json`: total per profile, breakdown by resource type and by origin (first/third-party), the largest 10 requests, budget, pass/fail. Step-summary table. Exit **6** when over budget. Lighthouse's `total-byte-weight` is recorded in the Lighthouse summary as a cross-check.
- **Rejected:** Lighthouse `total-byte-weight` as the gate (it couples AC2 to Lighthouse's simulated run and only covers the mobile profile) · summing file sizes in `out/` (that isn't *transfer* from the deployed URL and ignores CDN compression) · a bundle analyzer (JS only).

### D5 — CI wiring (AC1, AC2, AC6)

- **R:** a new workflow **`.github/workflows/perf.yml`**, separate from `ci.yml` (which stays unchanged apart from automatically linting/typechecking/testing the new package through the root scripts).

  | Job (= check name) | Trigger | Required? | What it does |
  |---|---|---|---|
  | `perf-gate: lighthouse (mobile)` | `pull_request` | **yes** | install → Playwright Chromium (cached) → `resolve-preview` → `pnpm perf:lighthouse $URL` → step summary → upload `.evidence/ci/` artifact |
  | `perf-gate: weight (< 3 MB)` | `pull_request` | **yes** | same pattern → `pnpm perf:weight $URL` |
  | `perf: fps calibration` | `pull_request` | no (informational, D7) | `pnpm fps:calibrate` (fixture build → serve → FPS) |
  | `perf: fixture exclusion` | `pull_request` + `push: main` | no | PR: preview URL `/fixtures/fps-calibration` → 404 and no marker. main: waits for Vercel `success` on the main SHA, then the same check against the **production URL** (AC4's prod verification, continuous) |

- `permissions: { contents: read, statuses: read, pull-requests: read, issues: read }`. `concurrency: perf-${{ github.ref }}`, `cancel-in-progress: true`. `timeout-minutes: 20` per job. Same `actions/*` versions and pnpm/node setup as `ci.yml`.
- **Artifacts:** `actions/upload-artifact` with 14-day retention. Lighthouse JSONs contain only public URLs and timings. Nothing is published outside GitHub.
- **Required checks (Deliverable 6):** `main` has **no protection today**, so "join them as required checks" means creating a **repository ruleset** on `main`. It requires `build (typecheck, lint, test, build)`, `secrets (gitleaks)`, `perf-gate: lighthouse (mobile)` and `perf-gate: weight (< 3 MB)`, with **bypass for repository admins** so Merlin's direct brief-freeze pushes to `main` keep working. This is a GitHub setting, not Vercel. It needs Murphy's OK (§8 item 3).
- **Rejected:** adding jobs to `ci.yml` (the perf jobs wait minutes for a deploy, and mixing them would slow down and blur the fast checks) · running the gates on `push: main` against prod (not asked; post-merge numbers can't block anything).

### D6 — Evidence CLI (AC3)

- **R:** `pnpm evidence <url> [--out <dir>] [--runs <n>] [--color-scheme light|dark] [--full-page] [--wait-for <css>]`
- **Default output dir:** `.evidence/<YYYYMMDD-HHmmss>-<host-slug>/` at the repo root. Root `.gitignore` adds `.evidence/` (Prettier 3 honours `.gitignore`). If `--out` points at a non-ignored path, the CLI **warns** on stderr (`git check-ignore`). It doesn't fail, because copying chosen artifacts into a feature's `evidence/` is the intended next step (D10).
- **Standardized artifact set (always all five):**

  | File | Content |
  |---|---|
  | `screenshot-mobile.png` | 412×823 @1.75 DPR, mobile UA, touch (same profile as Lighthouse mobile) |
  | `screenshot-desktop.png` | 1350×940 @1 |
  | `lighthouse-summary.json` | same schema as the gate (D2): scores (perf + a11y, report-only), LCP/CLS/TBT/FCP/SI/`total-byte-weight` per run + median, budget evaluation (informational, doesn't affect the exit code) |
  | `lighthouse-report.json` | full LHR of the median run |
  | `meta.json` | `url`, `finalUrl`, `httpStatus`, `startedAt`/`finishedAt` (ISO 8601 UTC), `durationMs`, `argv`, `colorScheme`, `git: {sha, dirty}` (when run inside the repo), `tools: {evidence, lighthouse, playwright, chromium, node, os, arch}`, `steps: [{name, ok, ms, error?}]`, `exitCode` |

- **Screenshot stability:** wait for `load` + network quiet + `document.fonts.ready` + all *finite* Web Animations finished (`document.getAnimations()`, capped) + 2 rAFs. `--wait-for <css>` is the hook for engine slices whose JS animations the Animations API can't see. `--runs` defaults to **3**, matching the gate.
- **Exit codes (one table for every perf CLI, in `exit-codes.ts` and `EVIDENCE.md`; a test asserts the two match):**

  | Code | Meaning |
  |---|---|
  | 0 | success: every artifact written / every gate assertion passed |
  | 1 | internal error (bug, unexpected exception) |
  | 2 | usage error: missing/invalid args, URL not `http(s)`, `--out` not writable |
  | 3 | target unreachable: DNS/TLS/connection failure, document HTTP status ≥ 400, or preview not resolvable (D3) |
  | 4 | browser unavailable: Chromium missing or failed to launch (message prints the install command) |
  | 5 | partial evidence (evidence CLI only): at least one artifact step failed; `meta.json.steps` says which; other artifacts still written |
  | 6 | budget violated (gates and `fps --expect` only) |

- **Rejected:** writing evidence into `.specify/…` by default (bloats git with unreviewed artifacts) · HTML Lighthouse report by default (large; `--html` can be added later) · a `--assert` flag on the evidence CLI (gates judge, evidence records).

### D7 — FPS harness (AC4): CDP tracing

- **R:** `measureFps(page, opts)` in `tools/perf/src/fps.ts`, plus the CLI `pnpm fps <url> [--warmup <ms>=1000] [--duration <ms>=5000] [--expect <fps> --tolerance <frac>] [--out <dir>]`.
  1. Warm up (`opts.warmupMs`), then call the optional `opts.trigger(page)` (engine slices start their explode/tour here).
  2. `Tracing.start` with categories `devtools.timeline,disabled-by-default-devtools.timeline.frame` (`transferMode: ReportEvents`). At the same time an injected rAF recorder collects main-thread frame timestamps.
  3. After `durationMs`, end tracing. Take the page's renderer pid from `TracingStartedInBrowser` (`args.data.frames[]`, the main frame's `processId`).
  4. **FPS = number of `DrawFrame` events of that pid in the window ÷ window seconds.** Also report `DroppedFrame` count, frame-interval p50/p95/max (ms) from consecutive `DrawFrame` timestamps, and the rAF cross-check FPS. A warning is printed when trace and rAF differ by > 10%.
- **Why `DrawFrame`:** it's the compositor's "a frame was produced" event, the one DevTools' Frames track uses, and it counts frames whether the animation runs on the compositor or the main thread. The probe today showed 296–300 `DrawFrame`/5 s headless in both headless modes, with `DroppedFrame` present in new headless. **Open question 6** (rAF-only as an alternative).
- **`FpsResult` (documented reuse interface for S4/S5):** `{ fps, frames, droppedFrames, windowMs, intervalsMs: {p50, p95, max}, rafFps, source: 'trace:DrawFrame', chromium, pass?, expect?, tolerance? }`. Written to `fps.json`. The raw trace is optional (`--trace` → `fps-trace.json.gz`).
- **Calibration band:** `--expect 60 --tolerance 0.10` → pass iff `54 ≤ fps ≤ 66` (inclusive). Out of band → exit 6.
- **Reuse contract for engine slices:** import `measureFps` (programmatic, with `trigger`) or call the CLI against a fixture/route. The **60 fps floor gate** for S4/S5 is *their* gate. S03 only ships the harness and the calibration proof.
- **Rejected:** rAF-only counting (it measures main-thread cadence, not produced frames, and misses compositor-only jank) · `Performance.getMetrics` (no frame metric we can rely on) · `--enable-begin-frame-control` deterministic frames (it would hide real jank and defeat the purpose).

### D8 — Calibration fixture route and exclusion mechanism (AC4)

- **R: env-gated `pageExtensions`**, the documented Next pattern for dev-only pages:
  - File: `apps/web/app/fixtures/fps-calibration/page.fixture.tsx` → route `/fixtures/fps-calibration`. Not `_fixtures`: underscore folders are private in the App Router and never route.
  - `next.config.ts` becomes `(phase) => config`. `pageExtensions` = `['tsx','ts','jsx','js']` plus **`'fixture.tsx'` only when** `phase === PHASE_DEVELOPMENT_SERVER` **or** `PERF_FIXTURES === '1'`. The Vercel prod/preview build is a production build with no `PERF_FIXTURES`, so the file isn't a page and is **not compiled into the build at all** (not just hidden).
  - **Guard:** if `PERF_FIXTURES === '1'` and `process.env.VERCEL` is set, config throws. Fixtures can never ship by a misplaced env var.
  - **Fixture builds go to a separate directory** (`distDir` → `out-fixtures/` when `PERF_FIXTURES=1`, git-ignored), so the real `out/` is never polluted. To be verified in its task. Fallback: build, move `out/` to `out-fixtures/`, rebuild.
- **Fixture content ("known synthetic animation"):** marker `data-perf-fixture="fps-calibration"`. Two lanes of 12 boxes each:
  - a **compositor lane**: CSS keyframes on `transform`, timed with `var(--motion-duration-explode)` / `var(--motion-ease-explode)`, `infinite alternate`;
  - a **main-thread lane**: a small client component whose rAF loop mirrors the compositor lane's progress (`getAnimations()[0].effect.getComputedTiming().progress`) into `style.transform`. It costs main-thread style work per frame, like a GSAP-driven engine.
  - **Zero motion literals.** Everything comes from token CSS variables, and the existing scanner test covers the file.
  - Nominal = display refresh = **60 fps** (headless Chromium BeginFrame rate).
- **Exclusion proof (three layers):**
  1. a vitest test in `apps/web` that scans `out/` after `pnpm build` (CI `build` job). The marker string and the route file are absent. There's also a *positive control*: the fixture build in `out-fixtures/` **does** contain them, so the scan isn't vacuous.
  2. the PR preview (a production build) returns 404 at `/fixtures/fps-calibration`.
  3. **the deployed prod URL** returns 404 with no marker. The `perf: fixture exclusion` job runs this on every `push: main` (D5). The AC4 evidence is that job's log after the S03 merge (open question 8).
- **Rejected:** a standalone HTML file outside Next (it isn't a "route", and S4 fixtures that render the real engine through the app couldn't reuse it) · `notFound()` behind an env check (the code would still be in the production bundle) · putting fixtures on previews via a Vercel env var (Vercel project config change, and the preview would no longer equal prod).

### D9 — AC1/AC2 deliberate-violation demos

- **R:** a scratch branch `test/s03-gate-violation` off the slice branch, with a **draft PR** (never merged):
  1. commit A: `budgets.ts` LCP threshold → `1` ms. Expect `perf-gate: lighthouse` **red** (exit 6, step summary shows LCP measured vs 1 ms) and `weight` **green**.
  2. commit B: revert A; weight budget → `1_000` bytes. Expect `weight` **red**, `lighthouse` **green**.
  3. Capture both runs (log excerpts + check-list screenshots) into `evidence/`. Close the PR and delete the branch. Then prove `git diff task/s03-perf-evidence -- tools/perf/src/budgets.ts` is empty on the slice branch.
- Two separate commits show that **each gate fails on its own condition** and not because of a shared failure.

### D10 — `.specify/EVIDENCE.md` (AC5)

- **R:** the evidence contract for all future slices:
  1. **Purpose and doctrine** (constitution VI: evidence over assertion).
  2. **Tools:** setup (`pnpm install`, `pnpm exec playwright install chromium`), `pnpm evidence`, `pnpm perf:lighthouse`, `pnpm perf:weight`, `pnpm fps`, `pnpm serve:out`. The exit-code table is the D6 table.
  3. **Task type → required artifacts:**

     | Task type | Must attach |
     |---|---|
     | visual (UI, layout, theme) | `screenshot-mobile` + `screenshot-desktop` (light; plus dark if theme-affecting) + `meta` |
     | perf-affecting (deps, bundles, routes, assets) | `lighthouse-summary` (median of 3) + `weight` + `meta` |
     | motion / engine animation | `fps.json` on the relevant route with `trigger` + screenshot + `meta` |
     | CI / tooling | CI run URL + log excerpt of the relevant step |
     | data / schema / logic | test command + output log |

  4. **Naming:** committed copies go to `.specify/features/<feature>/evidence/T<NNN>-<kind>[-<variant>].<ext>`. `kind` is one of `screenshot|lighthouse|weight|fps|meta|ci|log`, and `variant` is e.g. `mobile-dark`. Examples: `T004-screenshot-mobile-dark.png`, `T004-lighthouse-summary.json`. Commit summaries, not full LHRs (size), unless a reviewer asks.
  5. **How an orca seat runs it:** against a preview URL (from the PR's Vercel comment) or locally (`pnpm build && pnpm serve:out`, or `pnpm dev` for visual-only checks). Copy the chosen artifacts with the naming above. Sanitize: public `*.vercel.app` and `127.0.0.1` URLs are fine; never env values or private hosts.
  6. **When a gate fails, the escalation carries:** check name + run URL · the gate's summary JSON (threshold vs measured, all runs) · mobile screenshot · suspected commit/diff · local repro command. **Never** raise a threshold or rerun-until-green. **One** rerun is allowed only for infra exits (3/4). Budget violations (exit 6) escalate per the ladder.
- **Discoverability:** linked from `README.md` (new "Evidence & perf gates" section) and from `AGENTS.md` §4 Process (the file every seat reads first). Neither KICKOFF file is touched (one is frozen, the others are historical).

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories:**
- **P1 — Reviewer (Murphy) trusts the PR.** Every PR shows two required perf checks measured on its real Vercel preview. A regression past the budgets turns the PR red, with the measured numbers in the check summary. → AC1, AC2, AC6
- **P1 — Seat produces evidence.** As an orca seat finishing a visual/perf task, I run one command against a URL and get a standardized, git-ignored artifact set with documented exit codes, then attach it by the contract. → AC3, AC5
- **P2 — Engine slice author (S4/S5).** I import a documented FPS harness that is proven at 60 ±10% on a calibration fixture, and I trust that fixtures never reach production. → AC4

**FR mapping rule:** FR-001 ↔ AC1 … FR-006 ↔ AC6, one-to-one. D1 (tooling home), D3 (preview resolution) and D5 (CI wiring) are supporting requirements under FR-001/FR-002/FR-006. **No new acceptance criteria are invented.**

**plan.md inputs:** D1–D10. Gate data flow:
`PR push` → Vercel build → commit status `Vercel: success` + bot comment → `resolve-preview` (status poll → `[vc]` previewUrl → build-id SHA match) → `perf:lighthouse` (3 × LH13 mobile → median/every-run assertions) ∥ `perf:weight` (CDP transfer sum, mobile + desktop) → exit 0/6 → required checks.
Evidence: `pnpm evidence <url>` → Playwright Chromium → screenshots + LH runs + meta → `.evidence/<stamp>-<host>/`.

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Seam | Executable check | AC |
|---|---|---|---|
| T1 | `tools/perf` package scaffold: workspace glob, `package.json` (`type: module`, lighthouse, playwright, vitest), tsconfig, eslint, root scripts, `.evidence/` + `out-fixtures/` git-ignored | `pnpm install && pnpm typecheck && pnpm lint && pnpm test` green; `node tools/perf/src/cli/evidence.ts --help` exits 0; `git check-ignore .evidence/x out-fixtures/x` both match | AC3 (part) |
| T2 | Core: `exit-codes.ts`, `args.ts`, `budgets.ts`, `browser.ts`, `reach.ts`, `serve.ts` + `pnpm serve:out` | unit tests green (args → exit 2, reach → exit 3 on a closed port); `pnpm build && pnpm serve:out` + `curl -sI` → 200 with `content-encoding: gzip` | AC3 (part) |
| T3 | `lighthouse.ts` runner + `summarize`/`assertLighthouse` + `pnpm perf:lighthouse` | unit tests on synthetic LHRs (median pick, raw-score boundary 0.949 fails / 0.95 passes, LCP 2499/2500, CLS 0 vs 0.0001 in one run); local run against `serve:out` exits 0 with summary JSON | AC1 (part) |
| T4 | `weight.ts` + `pnpm perf:weight` | unit tests on synthetic CDP event streams (sum, budget boundary 2,999,999 / 3,000,000); run against the S02 preview reports ≈ 148.6 KB per profile (±5% of today's probe) | AC2 (part) |
| T5 | Evidence CLI composing T2–T3 + screenshots + `meta.json` | `pnpm evidence <S02 preview URL>` → exit 0 + all 5 files (validated by a schema check in the test suite); bad URL → 2; closed port → 3; output under `.evidence/` and `git status` clean | AC3 |
| T6 | `preview.ts` + `pnpm` CLI `resolve-preview`; `generateBuildId` in `next.config.ts` | unit tests: `[vc]` decode on a sanitized fixture comment, link-regex fallback, status `failure` → exit 3, timeout → exit 3; `VERCEL_GIT_COMMIT_SHA=<40 hex> pnpm build && grep <sha> apps/web/out/index.html` | AC1, AC2 (part) |
| T7 | `.github/workflows/perf.yml` (two gate jobs) + draft PR for the slice branch | both `perf-gate:` checks green on the PR; step summaries show tables; artifacts downloadable | AC1, AC2, AC6 (part) |
| T8 | Violation demos (D9) on `test/s03-gate-violation` | run A: lighthouse red + weight green; run B: weight red + lighthouse green; PR closed, branch deleted, `budgets.ts` diff empty | AC1, AC2 |
| T9 | Fixture route + `pageExtensions` gate + `VERCEL` guard + `out-fixtures/` build + exclusion scan test (with positive control) | `pnpm build` → scan finds no marker; `pnpm build:fixtures` → marker present in `out-fixtures/`; motion-literal scanner green | AC4 (part) |
| T10 | `fps.ts` + `pnpm fps` + `pnpm fps:calibrate` | unit test on a recorded mini trace (pid filter, count, intervals); `pnpm fps:calibrate` locally → `54 ≤ fps ≤ 66`, exit 0, `fps.json` saved | AC4 |
| T11 | `perf.yml`: `fps calibration` + `fixture exclusion` jobs | both green on the PR; logs show fps value and preview 404 | AC4 |
| T12 | `.specify/EVIDENCE.md` + README section + AGENTS.md §4 link + exit-code doc/code consistency test | `pnpm test` green (table test); `grep -n EVIDENCE.md README.md AGENTS.md` shows both links | AC5 |
| T13 | Ruleset on `main` (4 required checks, admin bypass) via `gh api` (after Murphy's OK) + full CI run | `gh api repos/…/rulesets/<id>` lists the 4 contexts; PR checks all green: build, secrets, lighthouse, weight | AC6 |
| T14 | AC1–AC6 self-check table (+ post-merge prod-URL row for AC4) | `evidence/AC-selfcheck.md` links every AC to evidence | all |

**Order:** T1 → T2 → (T3 ∥ T4) → T5 · T6 (needs T2) → T7 → T8 · T9 → T10 → T11 (needs T7) · T12 (needs T5, T10) → T13 → T14.

**Phase groups (Stage 3 STOP points):** **G1 local tooling** T1–T5 (AC3) → STOP · **G2 CI gates** T6–T8 (AC1, AC2) → STOP · **G3 FPS + fixture** T9–T11 (AC4) → STOP · **G4 contract & ship** T12–T14 (AC5, AC6) → STOP + AC self-check table.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Vercel changes the bot-comment format | gates can't resolve the preview → red (never false-green) | `[vc]` JSON first, link regex second; both covered by fixture tests; failure message names the step. |
| Branch alias serves an older deploy (race) | gate measures the wrong commit | build-id = SHA freshness check (D3 step 3); concurrency cancels superseded runs. |
| CI runner noise pushes Perf/LCP over the line | flaky required check | median of 3; simulated throttling; today's margin is large (Perf 100, LCP ≈ 0.8 s on preview). Repeated flakes → escalate, never loosen. |
| Headless FPS on 2-vCPU ubuntu without GPU < 54 | AC4 headless proof fails in CI | fixture is deliberately light; the Mac probe shows 59–60; T11 runs it early in G3. If CI can't hold the band, escalate with traces (AC4 is satisfied by the headless run, and the CI job is informational). |
| `distDir` doesn't redirect static-export output in Next 16 | fixture build overwrites `out/` | T9 verifies it first; fallback is move-then-rebuild (D8). |
| `pageExtensions` gate interacts badly with Turbopack/typegen | fixture leaks or build breaks | three-layer exclusion proof (D8) incl. the positive control; `VERCEL` guard. |
| Required ruleset blocks Merlin's direct pushes to `main` | brief freezes can't land | admin bypass in the ruleset (D5). |
| Docs-only push with no Vercel deploy | required gates time out red | "skip unaffected deployments" is off (S01). The failure message says "no Vercel status"; remedy is a rerun. |
| Playwright Chromium download/apt deps slow CI | longer perf jobs | cache `~/.cache/ms-playwright` keyed on the Playwright version; only `chromium` is installed. |
| Evidence artifacts leak private data | constitution VII | artifacts contain public URLs and timings only; `.evidence/` git-ignored; gitleaks unchanged. |

---

## 6. Open questions (each with recommended default)

1. **Preview access fallback (brief Deliverable 1).** Primary is D3 (status poll + `[vc]` comment + build-id match, `GITHUB_TOKEN` only). The fallback is build + static-serve inside CI. Should the fallback engage automatically when the preview can't be resolved? → **Default: no.** It exists as a code path but is never used automatically by CI: localhost isn't "a real deployed/preview URL" (AC1), so an unresolvable preview is a red gate and a blocked AC1 is escalated.
2. **Lighthouse tooling: custom gate on `lighthouse@13` vs `@lhci/cli` (LH 12.6.1 bundled)?** → **Default: custom** (D2). One Lighthouse version for gate and evidence, no public upload.
3. **Aggregation:** median of 3 for Perf + LCP, CLS = 0 on every run? Stricter alternative: all three thresholds on every run. → **Default: median for Perf/LCP, every-run for CLS.**
4. **"3MB" = 3,000,000 bytes (decimal, stricter) vs 3 MiB?** → **Default: 3,000,000**, strict `<`, on both mobile and desktop profiles.
5. **Vercel toolbar on previews: count it in the weight/Lighthouse runs?** → **Default: count it** (conservative). Disabling the toolbar for the project is a Vercel setting we leave alone.
6. **FPS source: trace `DrawFrame` (primary) with rAF as a cross-check?** → **Default: yes** (D7).
7. **FPS calibration in CI: informational (non-required) job?** → **Default: yes.** AC6 names exactly two new required gates. Making a third required would add scope.
8. **AC4 prod-URL verification timing:** it can only happen after S03 is on `main`. The `perf: fixture exclusion` job runs automatically on the merge push, and its log becomes the AC4 prod evidence. Pre-merge, the preview (same production build) and the `out/` scan cover it. → **Default: yes.** After you merge, I attach the main-push log in one follow-up (or you read the check yourself as part of the final validation).
9. **Fixture route path `/fixtures/fps-calibration`, gated by `pageExtensions` + `PERF_FIXTURES=1`, also available in `pnpm dev`?** → **Default: yes** (D8).
10. **Required checks via a repository ruleset on `main`** (4 contexts, admin bypass)? → **Default: yes, applied by the agent with `gh api` at T13** (§8 item 3).
11. **`generateBuildId` = Vercel commit SHA** (for preview freshness)? → **Default: yes.** Config-only, and the SHA of a public repo isn't sensitive.
12. **Evidence CLI extras:** `--color-scheme`, `--full-page`, `--wait-for`, `--runs` (default 3)? → **Default: yes.** Small, and visual/engine slices need them. Not new ACs.
13. **Tools location `tools/perf` (new workspace glob `tools/*`)?** → **Default: yes** (D1).
14. **Violation demos on a scratch draft PR from `test/s03-gate-violation`, two sequential commits, closed afterwards?** → **Default: yes** (D9).
15. **Executor tiers:** Flash → (tier 2 skipped: `OPENROUTER_API_KEY` is still unset, checked today) → on 2 tier-1 failures **pause and report with 5h/7d usage**, never auto-take-over (your S02 decision)? → **Default: same as S02.**

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. D3's preview discovery (Vercel status + bot comment + SHA check, no Vercel token) is acceptable as "real preview URL" access (default: accept).
2. Threshold semantics in D2 (raw score ≥ 0.95, LCP < 2500 ms on the median, CLS exactly 0 on every run) and D4 (< 3,000,000 B, both profiles) match how you read the ACs (default: accept).
3. D8's exclusion mechanism plus the three-layer proof is convincing for "excluded from the production build" (default: accept).
4. The task-type → artifact matrix in D10 is what you want future slices bound to (default: accept).
5. The phase groups G1–G4 in §4 give you the validation points you want (default: accept).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to the open questions in §6 (default: all recommendations accepted).
2. Approval to add dependencies to `tools/perf` only: `lighthouse@^13.6`, `playwright@^1.64` (+ `@types/node`, vitest already in the stack). These are dev tooling outside the constitution's locked runtime stack, and nothing ships to the site (default: approved).
3. Permission for the agent to create the `main` ruleset (4 required checks, admin bypass) with `gh api` at T13 (default: granted at the G4 gate; alternatively you click it in Settings → Rules).
4. Permission to push `task/s03-perf-evidence`, open a draft PR at T7, and push/close the scratch PR `test/s03-gate-violation` at T8 (default: granted when you approve G1).
5. Who merges S03 to `main`, and when (needed for the AC4 prod-URL row) (default: you merge after your final validation; the `fixture exclusion` job's main-push log is the evidence).
