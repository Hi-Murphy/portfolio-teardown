# T012 gate matrix | PR #27 head 57f3203 | CI run 43924563918 on the Vercel preview of PR #27

## Lighthouse (mobile, median of 3, CI perf-gate job) — order: /, /projects/websocket-inspector, /projects, /projects/jev-toolkit
```
performance: 0.97 >= 0.95 (median) pass
lcp: 1044.2440000000001 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
accessibility: 1 >= 0.95 (median) pass
performance: 0.99 >= 0.95 (median) pass
lcp: 911.496 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
accessibility: 1 >= 0.95 (median) pass
performance: 1 >= 0.95 (median) pass
lcp: 906.805 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
accessibility: 1 >= 0.95 (median) pass
performance: 1 >= 0.95 (median) pass
lcp: 975.3404999999999 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
accessibility: 1 >= 0.95 (median) pass
```

## Weight (CI perf-gate weight; < 3 MB)
```
mobile: 467724 bytes, 30 requests, PASS
desktop: 499840 bytes, 36 requests, PASS
mobile: 203535 bytes, 21 requests, PASS
desktop: 227092 bytes, 24 requests, PASS
mobile: 208961 bytes, 24 requests, PASS
desktop: 240961 bytes, 30 requests, PASS
mobile: 204164 bytes, 21 requests, PASS
desktop: 227690 bytes, 24 requests, PASS
```

## axe (CI; serious/critical must be 0)
```
axe total: serious 0 critical 0 moderate 0 minor 0 | incomplete 1100 ledger 72
axe-site total: serious 0 critical 0 moderate 0 minor 0 | incomplete 1864
```

## Required contexts
T012-ci-required-contexts.json: 7 / 7 completed successfully, verdict PASS. All 11 checks on PR #27 pass (T012-ci.txt).

## Local (final export)
- eager hero reveal with zero interaction: `eager:probe --expect live-loop` ×2 PASS (T012-log-eager.txt)
- site:probe --ci PASS (T012-log-site-probe.txt); draw calls 2 (T011-log-drawcalls.txt)
