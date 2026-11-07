# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (234 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 757.1 ms | 101.0 ms | not matched | — | 51.0 ms | 19.3% | http://127.0.0.1:PORT/ | — | — | — | — |
| 2 | 2106.3 ms | 239.0 ms | 14.6 ms | exact | 189.0 ms | 71.6% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 2364.3 ms | 165.0 ms | 10.1 ms | exact | 115.0 ms | 43.6% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 4 | 3408.4 ms | 86.0 ms | 6.1 ms | exact | 36.0 ms | 13.6% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 3915.7 ms | 238.0 ms | 14.5 ms | exact | 188.0 ms | 71.2% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 757.1 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 101.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2106.3 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 239.0 ms; observed: 14.6 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 2364.3 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 165.0 ms; observed: 10.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 3408.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 86.0 ms; observed: 6.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 3915.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 238.0 ms; observed: 14.5 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 264.0 ms
Observed Σ max(0, 16.4 × duration − 50): 1126.1 ms
Difference: 862.1 ms (326.6%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2106.3 ms | 36.9 ms | -2069.4 ms | 239.0 ms | 14.6 ms | 238.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2364.3 ms | 237.4 ms | -2126.9 ms | 165.0 ms | 10.1 ms | 165.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3408.4 ms | 206.9 ms | -3201.5 ms | 86.0 ms | 6.1 ms | 99.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 3915.7 ms | 96.1 ms | -3819.7 ms | 238.0 ms | 14.5 ms | 238.1 ms |
