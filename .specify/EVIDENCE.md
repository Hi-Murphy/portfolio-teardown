# Evidence Contract

This is the binding evidence contract for every slice. Design rationale lives in the
[S03 perf-evidence RFC](features/perf-evidence/rfc.md).

## 1. Purpose and doctrine

Evidence over assertion: a visual, performance, motion, or tooling claim is accepted only when the
reviewer can inspect a machine-produced artifact. The artifact must identify what was measured,
where it ran, and whether the gate passed. A screenshot, metric, log, or test output without the
context below is not sufficient.

## 2. Tools, setup, and exit codes

Install dependencies and the pinned browser once:

```sh
pnpm install
pnpm --filter perf-tools exec playwright install chromium
```

Primary commands:

- `pnpm evidence <url> [--out <dir>] [--runs <n>] [--color-scheme light|dark] [--full-page] [--wait-for <css>]`
  writes the standard evidence bundle (two screenshots, Lighthouse summary/report, and `meta.json`).
- `pnpm perf:lighthouse <url>` runs the mobile Lighthouse gate (median of 3). `pnpm perf:weight <url>`
  runs the initial-load weight gate on mobile and desktop.
- `pnpm fps <url> [--expect 60 --tolerance 0.1]` measures animation FPS. `pnpm fps:calibrate` builds
  and measures the calibration fixture. `pnpm serve:out` serves the production static export.

Every perf CLI uses one exit-code contract:

| Code | Meaning |
|---|---|
| 0 | success: every artifact written / every gate assertion passed |
| 1 | internal error (bug, unexpected exception) |
| 2 | usage error: missing/invalid args, URL not `http(s)`, `--out` not writable |
| 3 | target unreachable: DNS/TLS/connection failure, document HTTP status >= 400, or preview not resolvable |
| 4 | browser unavailable: Chromium missing or failed to launch (message prints the install command) |
| 5 | partial evidence (evidence CLI only): at least one artifact step failed; `meta.json.steps` says which; other artifacts still written |
| 6 | budget violated (gates and `fps --expect` only) |

### FPS reuse

Engine slices import `measureFps` from [`tools/perf/src/fps.ts`](../tools/perf/src/fps.ts):

```ts
measureFps(page, { warmupMs, durationMs, trigger }) -> Promise<FpsResult>
```

`warmupMs` defaults to 1000 and `durationMs` to 5000. The optional `trigger(page)` runs after warmup
and before tracing, which is where a slice starts its animation. `FpsResult` contains `fps`,
`frames`, `droppedFrames`, `windowMs`, `intervalsMs: { p50, p95, max }`, cross-check `rafFps`,
`source: 'trace:DrawFrame'`, `chromium`, `pid`, `pidSource`, plus optional `expect`, `tolerance`,
`pass`, and `trace` fields. The CLI populates `expect`, `tolerance`, and `pass` when `--expect` is
used; `trace` is kept only when tracing is requested.

### Calibration fixture

`/fixtures/fps-calibration` is the known synthetic animation used to prove the harness at 60 fps
±10%. It is dev-only: `pnpm dev` makes the route available, and `PERF_FIXTURES=1` produces a separate
fixture export in `out-fixtures/` (via `pnpm fps:calibrate` or `pnpm build:fixtures`). It is never
compiled into the production export, and `PERF_FIXTURES` must never be set on Vercel.

## 3. Required artifacts by task type

| Task type | Must attach |
|---|---|
| visual (UI, layout, theme) | `screenshot-mobile` + `screenshot-desktop` (light; plus dark if theme-affecting) + `meta` |
| perf-affecting (deps, bundles, routes, assets) | `lighthouse-summary` (median of 3) + `weight` + `meta` |
| motion / engine animation | `fps.json` on the relevant route with `trigger` + screenshot + `meta` |
| CI / tooling | CI run URL + log excerpt of the relevant step |
| data / schema / logic | test command + output log |

## 4. Naming and committed copies

Committed copies go to `.specify/features/<feature>/evidence/T<NNN>-<kind>[-<variant>].<ext>`.
`kind` is one of `screenshot|lighthouse|weight|fps|meta|ci|log`; `variant` is optional, for example
`mobile-dark`. Examples: `T004-screenshot-mobile-dark.png` and `T004-lighthouse-summary.json`.
Commit summaries and logs, not full Lighthouse reports or traces, unless a reviewer asks for them.
The `.evidence/` working directory is git-ignored.

## 5. How an orca seat runs it

1. Use the preview URL in the PR's `vercel[bot]` comment, or build and serve locally with
   `pnpm build && pnpm serve:out`. Use `pnpm dev` only for visual-only checks where a deployed build
   is not required.
2. Run the requested command and keep its full output. Browser commands need an unsandboxed shell:
   the Codex sandbox on this Mac cannot launch Chromium.
3. Copy the chosen artifacts into the feature evidence directory with the naming rule above. Include
   the command, exit code, URL or local target, and relevant tool/browser versions in `meta` or the
   log.
4. Sanitize before committing: public `*.vercel.app` URLs and `127.0.0.1` are allowed; never include
   environment values, tokens, secrets, private hostnames, or private IPs.

## 6. Gate failures and escalation

A failed gate is escalated with: the check name and run URL; the gate summary JSON showing threshold
versus measured values for every run; a mobile screenshot; the suspected commit/diff; and a local
reproduction command.

Never raise a threshold to make a check pass, and never rerun until green. One rerun is allowed only
for infrastructure exits 3 or 4. Budget violations (exit 6) stay red and escalate through the slice
ladder with the evidence above. A blocked acceptance criterion is reported with that evidence; it is
never reworded or relaxed.
