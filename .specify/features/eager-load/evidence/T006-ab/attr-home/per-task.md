# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (240 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 2105.8 ms | 260.0 ms | not matched | — | 210.0 ms | 64.8% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 2 | 3429.7 ms | 96.0 ms | 12.2 ms | loose | 46.0 ms | 14.2% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 3 | 3525.7 ms | 227.0 ms | not matched | — | 177.0 ms | 54.6% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 4 | 3914.5 ms | 265.0 ms | not matched | — | 215.0 ms | 66.4% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 2105.8 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 260.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 3429.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 96.0 ms; observed: 12.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 3 — 3525.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 227.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 3914.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 265.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 324.0 ms
Observed Σ max(0, 4 × duration − 50): 13.7 ms
Difference: -310.3 ms (95.8%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3429.7 ms | 236.7 ms | -3193.0 ms | 96.0 ms | 12.2 ms | 49.0 ms |
