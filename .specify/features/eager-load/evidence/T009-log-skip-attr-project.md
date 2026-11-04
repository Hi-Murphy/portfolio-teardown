# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (261 ProfileChunk events, 18.5x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.1 ms | 243.0 ms | 13.1 ms | exact | 193.0 ms | 29.8% | Unattributable | — | — | — | — |
| 2 | 996.1 ms | 326.0 ms | 17.6 ms | exact | 276.0 ms | 42.6% | Unattributable | (native) | — | (program) 15.7 ms (97.7%) | — |
| 3 | 1323.1 ms | 115.0 ms | not matched | — | 65.0 ms | 10.0% | http://127.0.0.1:PORT/projects/websocket-inspector | — | — | — | — |
| 4 | 2825.2 ms | 264.0 ms | 14.3 ms | exact | 214.0 ms | 33.0% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 5 | 3116.2 ms | 246.0 ms | 13.3 ms | exact | 196.0 ms | 30.3% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 6 | 4019.4 ms | 210.0 ms | 11.2 ms | exact | 160.0 ms | 24.7% | http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js | — | — | — | — |
| 7 | 4454.4 ms | 103.0 ms | 5.9 ms | exact | 53.0 ms | 8.2% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 8 | 4781.5 ms | 269.0 ms | 14.5 ms | exact | 219.0 ms | 33.8% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 753.1 ms simulated

- URL: `Unattributable`
- Simulated: 243.0 ms; observed: 13.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 996.1 ms simulated

- URL: `Unattributable`
- Simulated: 326.0 ms; observed: 17.6 ms; match: exact
- `(program)` — 15.7 ms (97.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 1323.1 ms simulated

- URL: `http://127.0.0.1:PORT/projects/websocket-inspector`
- Simulated: 115.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2825.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 264.0 ms; observed: 14.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 3116.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 246.0 ms; observed: 13.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 6 — 4019.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js`
- Simulated: 210.0 ms; observed: 11.2 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 7 — 4454.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 103.0 ms; observed: 5.9 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 4781.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 269.0 ms; observed: 14.5 ms; match: exact
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 647.9 ms
Observed Σ max(0, 18.5 × duration − 50): 2089.4 ms
Difference: 1441.5 ms (222.5%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 753.1 ms | 10.2 ms | -742.9 ms | 243.0 ms | 13.1 ms | 242.8 ms |
| Unattributable | 996.1 ms | 23.3 ms | -972.8 ms | 326.0 ms | 17.6 ms | 325.5 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2825.2 ms | 66.1 ms | -2759.1 ms | 264.0 ms | 14.3 ms | 263.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3116.2 ms | 257.2 ms | -2859.0 ms | 246.0 ms | 13.3 ms | 246.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js | 4019.4 ms | 245.7 ms | -3773.7 ms | 210.0 ms | 11.2 ms | 206.3 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 4454.4 ms | 225.5 ms | -4228.8 ms | 103.0 ms | 5.9 ms | 109.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4781.5 ms | 111.4 ms | -4670.1 ms | 269.0 ms | 14.5 ms | 268.7 ms |
