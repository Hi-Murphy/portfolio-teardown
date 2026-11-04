# Lighthouse per-task attribution

LHR: PORT/
Route: /
Source: lighthouse-profile (245 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 755.1 ms | 102.0 ms | not matched | — | 52.0 ms | 21.4% | PORT/ | — | — | — | — |
| 2 | 2108.1 ms | 231.0 ms | 14.1 ms | exact | 181.0 ms | 74.6% | PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 3402.2 ms | 169.0 ms | 10.3 ms | exact | 119.0 ms | 49.1% | PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 4 | 3920.3 ms | 235.0 ms | 14.3 ms | exact | 185.0 ms | 76.3% | PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 755.1 ms simulated

- URL: `PORT/`
- Simulated: 102.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2108.1 ms simulated

- URL: `PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 231.0 ms; observed: 14.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 3402.2 ms simulated

- URL: `PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 169.0 ms; observed: 10.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 3920.3 ms simulated

- URL: `PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 235.0 ms; observed: 14.3 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 242.5 ms
Observed Σ max(0, 16.4 × duration − 50): 1050.0 ms
Difference: 807.5 ms (333.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| PORT/_next/static/chunks/10kujx8nsd3ck.js | 2108.1 ms | 42.3 ms | -2065.8 ms | 231.0 ms | 14.1 ms | 231.2 ms |
| PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3402.2 ms | 221.1 ms | -3181.1 ms | 169.0 ms | 10.3 ms | 169.3 ms |
| PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 3920.3 ms | 89.3 ms | -3831.1 ms | 235.0 ms | 14.3 ms | 235.1 ms |
