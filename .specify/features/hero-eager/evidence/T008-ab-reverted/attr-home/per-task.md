# Lighthouse per-task attribution

LHR: http://localhost:PORT/
Route: /
Source: lighthouse-profile (276 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 2106.9 ms | 229.0 ms | 14.0 ms | exact | 179.0 ms | 86.1% | http://localhost:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 2 | 3917.4 ms | 238.0 ms | 14.5 ms | exact | 188.0 ms | 90.4% | http://localhost:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |
| 3 | 4155.4 ms | 99.0 ms | 6.1 ms | exact | 49.0 ms | 23.6% | http://localhost:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |

## Task details

### Task 1 — 2106.9 ms simulated

- URL: `http://localhost:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 229.0 ms; observed: 14.0 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 3917.4 ms simulated

- URL: `http://localhost:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 238.0 ms; observed: 14.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 4155.4 ms simulated

- URL: `http://localhost:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 99.0 ms; observed: 6.1 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 208.0 ms
Observed Σ max(0, 16.4 × duration − 50): 934.0 ms
Difference: 726.0 ms (349.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://localhost:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2106.9 ms | 33.5 ms | -2073.5 ms | 229.0 ms | 14.0 ms | 229.1 ms |
| http://localhost:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 3917.4 ms | 89.5 ms | -3827.8 ms | 238.0 ms | 14.5 ms | 238.5 ms |
| http://localhost:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 4155.4 ms | 204.5 ms | -3950.8 ms | 99.0 ms | 6.1 ms | 100.4 ms |
