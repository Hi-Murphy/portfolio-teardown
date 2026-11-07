# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (238 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 752.8 ms | 234.0 ms | 14.3 ms | exact | 184.0 ms | 71.3% | Unattributable | — | — | — | — |
| 2 | 987.8 ms | 101.0 ms | not matched | — | 51.0 ms | 19.7% | http://127.0.0.1:PORT/ | — | — | — | — |
| 3 | 2339.5 ms | 228.0 ms | 13.9 ms | exact | 178.0 ms | 68.9% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 4 | 3630.3 ms | 89.0 ms | 5.8 ms | exact | 39.0 ms | 15.1% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 4145.1 ms | 236.0 ms | 14.4 ms | exact | 186.0 ms | 72.0% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 752.8 ms simulated

- URL: `Unattributable`
- Simulated: 234.0 ms; observed: 14.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 987.8 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 101.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 2339.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 228.0 ms; observed: 13.9 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 3630.3 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 89.0 ms; observed: 5.8 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 4145.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 236.0 ms; observed: 14.4 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 258.2 ms
Observed Σ max(0, 16.4 × duration − 50): 1270.3 ms
Difference: 1012.1 ms (391.9%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 752.8 ms | 18.5 ms | -734.3 ms | 234.0 ms | 14.3 ms | 233.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2339.5 ms | 57.2 ms | -2282.3 ms | 228.0 ms | 13.9 ms | 228.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3630.3 ms | 224.9 ms | -3405.4 ms | 89.0 ms | 5.8 ms | 95.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4145.1 ms | 111.6 ms | -4033.5 ms | 236.0 ms | 14.4 ms | 235.9 ms |
