# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (240 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.8 ms | 99.0 ms | not matched | — | 49.0 ms | 24.1% | http://127.0.0.1:PORT/ | — | — | — | — |
| 2 | 2105.7 ms | 234.0 ms | 14.3 ms | exact | 184.0 ms | 90.4% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 3402.5 ms | 87.0 ms | 6.1 ms | exact | 37.0 ms | 18.2% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 4 | 3914.2 ms | 236.0 ms | 14.4 ms | exact | 186.0 ms | 91.4% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 753.8 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 99.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2105.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 234.0 ms; observed: 14.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 3402.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 87.0 ms; observed: 6.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 3914.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 236.0 ms; observed: 14.4 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 203.5 ms
Observed Σ max(0, 16.4 × duration − 50): 1060.1 ms
Difference: 856.6 ms (421.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2105.7 ms | 38.7 ms | -2067.0 ms | 234.0 ms | 14.3 ms | 234.5 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3402.5 ms | 198.8 ms | -3203.7 ms | 87.0 ms | 6.1 ms | 99.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 3914.2 ms | 88.3 ms | -3825.9 ms | 236.0 ms | 14.4 ms | 236.1 ms |
