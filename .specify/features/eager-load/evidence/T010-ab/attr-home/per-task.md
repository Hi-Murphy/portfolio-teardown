# Lighthouse per-task attribution

LHR: http://127.0.0.1:4321/
Route: /
Source: lighthouse-profile (243 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 752.8 ms | 117.0 ms | not matched | — | 67.0 ms | 30.9% | http://127.0.0.1:4321/ | — | — | — | — |
| 2 | 2103.6 ms | 271.0 ms | not matched | — | 221.0 ms | 101.8% | http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 3912.5 ms | 95.0 ms | not matched | — | 45.0 ms | 20.7% | http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 4 | 4007.5 ms | 218.0 ms | not matched | — | 168.0 ms | 77.4% | http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |

## Task details

### Task 1 — 752.8 ms simulated

- URL: `http://127.0.0.1:4321/`
- Simulated: 117.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2103.6 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 271.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 3912.5 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 95.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 4007.5 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 218.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 217.0 ms
Observed Σ max(0, 4 × duration − 50): 9.3 ms
Difference: -207.7 ms (95.7%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
