# Lighthouse per-task attribution

LHR: http://127.0.0.1:4321/
Route: /
Source: lighthouse-profile (237 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 751.7 ms | 309.0 ms | not matched | — | 259.0 ms | 40.2% | Unattributable | — | — | — | — |
| 2 | 1060.7 ms | 386.0 ms | not matched | — | 336.0 ms | 52.2% | Unattributable | — | — | — | — |
| 3 | 1447.7 ms | 113.0 ms | not matched | — | 63.0 ms | 9.8% | http://127.0.0.1:4321/ | — | — | — | — |
| 4 | 2798.4 ms | 262.0 ms | not matched | — | 212.0 ms | 32.9% | http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 5 | 4123.1 ms | 101.0 ms | not matched | — | 51.0 ms | 7.9% | http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 6 | 4224.1 ms | 212.0 ms | not matched | — | 162.0 ms | 25.2% | http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 7 | 4455.3 ms | 272.0 ms | not matched | — | 222.0 ms | 34.5% | http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 751.7 ms simulated

- URL: `Unattributable`
- Simulated: 309.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 1060.7 ms simulated

- URL: `Unattributable`
- Simulated: 386.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 1447.7 ms simulated

- URL: `http://127.0.0.1:4321/`
- Simulated: 113.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2798.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 262.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 4123.1 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 101.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 4224.1 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 212.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 7 — 4455.3 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 272.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 643.8 ms
Observed Σ max(0, 4 × duration − 50): 65.8 ms
Difference: -578.0 ms (89.8%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
