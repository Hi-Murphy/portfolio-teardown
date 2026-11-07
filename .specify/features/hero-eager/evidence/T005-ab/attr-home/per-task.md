# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (236 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.6 ms | 104.0 ms | not matched | — | 54.0 ms | 20.3% | http://127.0.0.1:PORT/ | — | — | — | — |
| 2 | 2107.2 ms | 233.0 ms | 14.2 ms | exact | 183.0 ms | 68.9% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 2358.2 ms | 178.0 ms | 10.8 ms | exact | 128.0 ms | 48.2% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 4 | 3402.9 ms | 85.0 ms | 4.4 ms | exact | 35.0 ms | 13.2% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 3918.1 ms | 235.0 ms | 14.3 ms | exact | 185.0 ms | 69.7% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 754.6 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 104.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2107.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 233.0 ms; observed: 14.2 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 2358.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 178.0 ms; observed: 10.8 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 3402.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 85.0 ms; observed: 4.4 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 3918.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 235.0 ms; observed: 14.3 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 265.5 ms
Observed Σ max(0, 16.4 × duration − 50): 1138.4 ms
Difference: 872.9 ms (328.8%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2107.2 ms | 37.1 ms | -2070.1 ms | 233.0 ms | 14.2 ms | 232.7 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2358.2 ms | 229.3 ms | -2128.9 ms | 178.0 ms | 10.8 ms | 177.7 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3402.9 ms | 204.9 ms | -3198.0 ms | 85.0 ms | 4.4 ms | 72.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 3918.1 ms | 84.7 ms | -3833.4 ms | 235.0 ms | 14.3 ms | 234.7 ms |
