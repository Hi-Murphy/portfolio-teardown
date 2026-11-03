# T010 — Lighthouse long-task attribution and local eager numbers

Date: 2026-11-03

Build: `pnpm build:eager` (`NEXT_PUBLIC_EAGER_3D=1`), served from `apps/web/out` with
`pnpm serve:out --port 4320`. The default export was restored with `pnpm build` after the
measurement.

Protocol: Lighthouse 13.6.0, Chromium 156.0.0.0, mobile form factor with simulated throttling.
Each `perf:lighthouse` invocation performed three internal runs. `r1` and `r2` are separate
invocations. All four invocations exited 0 and all four summaries passed their existing gates.

## Per-run results

| Route | Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---|---|---:|---:|---:|---:|---:|
| home | r1-1 | 1 | 0.5 | 904.2043 | 0 | 4254.5 |
| home | r1-2 | 1 | 1.5 | 905.5281 | 0 | 4269.5 |
| home | r1-3 | 1 | 0.5 | 903.861 | 0 | 4222 |
| home | r2-1 | 1 | 1.5 | 905.2816 | 0 | 4257 |
| home | r2-2 | 1 | 1 | 903.0591 | 0 | 4256.5 |
| home | r2-3 | 1 | 0.5 | 904.0414 | 0 | 4264.5 |
| project | r1-1 | 1 | 1 | 904.4418 | 0 | 4287.5 |
| project | r1-2 | 1 | 1.5 | 906.1517 | 0 | 4273.5 |
| project | r1-3 | 1 | 3.5 | 904.8764 | 0 | 4276.5 |
| project | r2-1 | 1 | 1 | 904.5512 | 0 | 4258.5 |
| project | r2-2 | 1 | 0.5 | 904.347 | 0 | 4246.5 |
| project | r2-3 | 1 | 0.5 | 903.3167 | 0 | 4257 |

Two-invocation medians (mean of each invocation's three-run metric median):

| Route | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---|---:|---:|---:|---:|---:|
| home | 1 | 0.75 | 904.1229 | 0 | 4255.75 |
| project | 1 | 1 | 904.6117 | 0 | 4266.75 |

## Long tasks

### Top five per build/route

These are the `eager-verdict` tables. URL basenames are shown; start and duration are Lighthouse's
simulated trace values.

| Route | Run | URL | Start (ms) | Duration (ms) |
|---|---|---:|---:|---:|
| home | r1-3 | Unattributable | 751.9305 | 69 |
| home | r1-1 | Unattributable | 752.1022 | 57 |
| home | r1-2 | 10kujx8nsd3ck.js | 2105.5281 | 52 |
| home | r2-1 | 10kujx8nsd3ck.js | 2105.2816 | 52 |
| home | r2-2 | 3vnmkhfgdnq2d.js | 3909.1773 | 52 |
| project | r1-1 | Unattributable | 752.2209 | 73 |
| project | r1-3 | 1kgrt2f4mrm63.js | 3635.191 | 55 |
| project | r1-3 | Unattributable | 752.4382 | 52 |
| project | r1-2 | 10kujx8nsd3ck.js | 2106.1517 | 52 |
| project | r1-1 | 3vnmkhfgdnq2d.js | 4061.1045 | 51 |

### All recorded long tasks

| Route | Run | URL | Start (ms) | Duration (ms) |
|---|---|---:|---:|---:|
| home | r1-1 | Unattributable | 752.1022 | 57 |
| home | r1-1 | 3vnmkhfgdnq2d.js | 3910.5108 | 51 |
| home | r1-2 | 10kujx8nsd3ck.js | 2105.5281 | 52 |
| home | r1-2 | 3vnmkhfgdnq2d.js | 3913.8203 | 51 |
| home | r1-3 | Unattributable | 751.9305 | 69 |
| home | r1-3 | 3vnmkhfgdnq2d.js | 3911.583 | 51 |
| home | r2-1 | 10kujx8nsd3ck.js | 2105.2816 | 52 |
| home | r2-1 | 3vnmkhfgdnq2d.js | 3913.204 | 51 |
| home | r2-2 | 3vnmkhfgdnq2d.js | 3909.1773 | 52 |
| home | r2-3 | 3vnmkhfgdnq2d.js | 4058.0828 | 51 |
| project | r1-1 | Unattributable | 752.2209 | 73 |
| project | r1-1 | 3vnmkhfgdnq2d.js | 4061.1045 | 51 |
| project | r1-1 | 10kujx8nsd3ck.js | 2104.4418 | 51 |
| project | r1-2 | 10kujx8nsd3ck.js | 2106.1517 | 52 |
| project | r1-2 | 3vnmkhfgdnq2d.js | 4065.3793 | 51 |
| project | r1-3 | 1kgrt2f4mrm63.js | 3635.191 | 55 |
| project | r1-3 | Unattributable | 752.4382 | 52 |
| project | r1-3 | 3vnmkhfgdnq2d.js | 4062.191 | 51 |
| project | r1-3 | 10kujx8nsd3ck.js | 2104.8764 | 51 |
| project | r2-1 | 10kujx8nsd3ck.js | 2104.5512 | 51 |
| project | r2-1 | 3vnmkhfgdnq2d.js | 4061.378 | 51 |
| project | r2-2 | 3vnmkhfgdnq2d.js | 4060.8675 | 51 |
| project | r2-3 | 3vnmkhfgdnq2d.js | 4062.2918 | 51 |
| project | r2-3 | 10kujx8nsd3ck.js | 2103.3167 | 50 |

The largest home task is the unattributable 69 ms task at ~752 ms. The largest project task is the
unattributable 73 ms task at ~752 ms. Both start before LCP (~904 ms), which is why they do not add
to the reported TBT. After LCP, the recurring task is the 51–52 ms chunk at ~2.1 s; home also
records a 51–52 ms chunk around 3.9–4.1 s.

## Comparison with S11.5 T016 local eager

Both measurements are local and informational. The host benchmark index differs, so small
differences are not treated as a runner-equivalent result.

| Route | Source | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---|---|---:|---:|---:|---:|---:|
| home | S11.5 T016 | 1 | 2 | 905.0157 | 0 | 4173.75 |
| home | S11.6 T010 | 1 | 0.75 | 904.1229 | 0 | 4255.75 |
| project | S11.5 T016 | 1 | 3 | 904.7488 | 0 | 4180.5 |
| project | S11.6 T010 | 1 | 1 | 904.6117 | 0 | 4266.75 |

Against S11.5 T016, TBT is down 1.25 ms on home and 2 ms on project; LCP is down 0.89 ms and
0.14 ms respectively. S11.5's summaries did not carry `longTasks`, so only the aggregate TBT is
comparable. This run's attribution adds the task names and start times above.

## Local verdict

AC5's rule uses the two-invocation median per route: performance >= 0.95 and TBT <= 200 ms.

| Route | Performance | TBT (ms) | Local AC5 rule |
|---|---:|---:|---|
| home | 1 | 0.75 | pass |
| project | 1 | 1 | pass |

**Local verdict: recommend retiring D-19.** This is informational only; the binding AC5 verdict is
the CI-runner measurement in T011.

## Check output tail

```text
Test Files  2 passed (2)
Tests  16 passed (16)

| r1 median | 1 | 0.5 | 904.2043 | 0 | 4254.5 |
| r2 median | 1 | 1 | 904.0414 | 0 | 4257 |
| two-invocation median | 1 | 0.75 | 904.1229 | 0 | 4255.75 |

| r1 median | 1 | 1.5 | 904.8764 | 0 | 4276.5 |
| r2 median | 1 | 0.5 | 904.347 | 0 | 4257 |
| two-invocation median | 1 | 1 | 904.6117 | 0 | 4266.75 |

**Verdict:** recommend retiring D-19
FROZEN-OK
BRIEF-HISTORY-OK
XPLODER-SRC-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
REBASELINE-FIRST-OK
DEV-ROUTES-OK
S8-TOOLS-OK
CI-JOBS-OK
VERSIONS-OK
GITLEAKS-OK
```

`pnpm typecheck`, `pnpm lint`, and `pnpm test` then completed successfully, and the check printed
`T010-OK`.

## Artifacts

- `evidence/T010-lighthouse-summary-eager-home-r1.json`
- `evidence/T010-lighthouse-summary-eager-home-r2.json`
- `evidence/T010-lighthouse-summary-eager-project-r1.json`
- `evidence/T010-lighthouse-summary-eager-project-r2.json`
