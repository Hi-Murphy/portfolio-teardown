# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (235 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 755.7 ms | 193.0 ms | 11.7 ms | exact | 143.0 ms | 62.7% | Unattributable | — | — | — | — |
| 2 | 949.7 ms | 100.0 ms | not matched | — | 50.0 ms | 21.9% | http://127.0.0.1:PORT/ | — | — | — | — |
| 3 | 2301.5 ms | 231.0 ms | 14.1 ms | exact | 181.0 ms | 79.4% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 4 | 3595.2 ms | 83.0 ms | 4.3 ms | exact | 33.0 ms | 14.5% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 4106.9 ms | 242.0 ms | 14.8 ms | exact | 192.0 ms | 84.2% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 755.7 ms simulated

- URL: `Unattributable`
- Simulated: 193.0 ms; observed: 11.7 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 949.7 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 100.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 2301.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 231.0 ms; observed: 14.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 3595.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 83.0 ms; observed: 4.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 4106.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 242.0 ms; observed: 14.8 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 228.0 ms
Observed Σ max(0, 16.4 × duration − 50): 1187.8 ms
Difference: 959.8 ms (421.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 755.7 ms | 15.1 ms | -740.6 ms | 193.0 ms | 11.7 ms | 192.5 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2301.5 ms | 51.8 ms | -2249.6 ms | 231.0 ms | 14.1 ms | 230.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3595.2 ms | 238.7 ms | -3356.5 ms | 83.0 ms | 4.3 ms | 70.4 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4106.9 ms | 101.7 ms | -4005.2 ms | 242.0 ms | 14.8 ms | 242.2 ms |
