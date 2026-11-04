# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (239 ProfileChunk events, 16.4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 752.0 ms | 305.0 ms | 18.6 ms | exact | 255.0 ms | 49.3% | Unattributable | — | — | — | — |
| 2 | 1057.0 ms | 390.0 ms | 23.8 ms | exact | 340.0 ms | 65.7% | Unattributable | (native) | — | (program) 21.8 ms (98.5%) | — |
| 3 | 1448.0 ms | 102.0 ms | not matched | — | 52.0 ms | 10.0% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 2798.9 ms | 229.0 ms | 14.0 ms | exact | 179.0 ms | 34.6% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 5 | 4088.9 ms | 86.0 ms | 6.1 ms | exact | 36.0 ms | 7.0% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 6 | 4456.7 ms | 237.0 ms | 14.4 ms | exact | 187.0 ms | 36.1% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 752.0 ms simulated

- URL: `Unattributable`
- Simulated: 305.0 ms; observed: 18.6 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 1057.0 ms simulated

- URL: `Unattributable`
- Simulated: 390.0 ms; observed: 23.8 ms; match: exact
- `(program)` — 21.8 ms (98.5%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 1448.0 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 102.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2798.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 229.0 ms; observed: 14.0 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 4088.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 86.0 ms; observed: 6.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 6 — 4456.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 237.0 ms; observed: 14.4 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 517.5 ms
Observed Σ max(0, 16.4 × duration − 50): 1620.1 ms
Difference: 1102.6 ms (213.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 752.0 ms | 11.7 ms | -740.3 ms | 305.0 ms | 18.6 ms | 304.5 ms |
| Unattributable | 1057.0 ms | 30.2 ms | -1026.7 ms | 390.0 ms | 23.8 ms | 390.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2798.9 ms | 78.5 ms | -2720.4 ms | 229.0 ms | 14.0 ms | 228.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 4088.9 ms | 234.6 ms | -3854.3 ms | 86.0 ms | 6.1 ms | 100.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4456.7 ms | 129.5 ms | -4327.2 ms | 237.0 ms | 14.4 ms | 236.7 ms |
