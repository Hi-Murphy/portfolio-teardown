# Lighthouse per-task attribution

LHR: http://127.0.0.1:4321/
Route: /
Source: lighthouse-profile (245 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.7 ms | 114.0 ms | not matched | — | 64.0 ms | 20.4% | http://127.0.0.1:4321/ | — | — | — | — |
| 2 | 2107.4 ms | 266.0 ms | not matched | — | 216.0 ms | 68.8% | http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 2394.4 ms | 200.0 ms | not matched | — | 150.0 ms | 47.8% | http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 4 | 3438.1 ms | 95.0 ms | not matched | — | 45.0 ms | 14.3% | http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 3918.4 ms | 267.0 ms | not matched | — | 217.0 ms | 69.1% | http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 754.7 ms simulated

- URL: `http://127.0.0.1:4321/`
- Simulated: 114.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2107.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 266.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 2394.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 200.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 3438.1 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 95.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 3918.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 267.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 314.0 ms
Observed Σ max(0, 4 × duration − 50): 15.3 ms
Difference: -298.7 ms (95.1%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
