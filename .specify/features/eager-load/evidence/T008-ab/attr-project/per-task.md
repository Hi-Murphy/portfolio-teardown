# Lighthouse per-task attribution

LHR: http://127.0.0.1:4321/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (261 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.1 ms | 243.0 ms | not matched | — | 193.0 ms | 29.8% | Unattributable | — | — | — | — |
| 2 | 996.1 ms | 326.0 ms | not matched | — | 276.0 ms | 42.6% | Unattributable | — | — | — | — |
| 3 | 1323.1 ms | 115.0 ms | not matched | — | 65.0 ms | 10.0% | http://127.0.0.1:4321/projects/websocket-inspector | — | — | — | — |
| 4 | 2825.2 ms | 264.0 ms | not matched | — | 214.0 ms | 33.0% | http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 5 | 3116.2 ms | 246.0 ms | not matched | — | 196.0 ms | 30.3% | http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 6 | 4019.4 ms | 210.0 ms | not matched | — | 160.0 ms | 24.7% | http://127.0.0.1:4321/_next/static/chunks/3vwpvuyn90046.js | — | — | — | — |
| 7 | 4454.4 ms | 103.0 ms | 13.3 ms | loose | 53.0 ms | 8.2% | http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 8 | 4781.5 ms | 269.0 ms | not matched | — | 219.0 ms | 33.8% | http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 753.1 ms simulated

- URL: `Unattributable`
- Simulated: 243.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 996.1 ms simulated

- URL: `Unattributable`
- Simulated: 326.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 1323.1 ms simulated

- URL: `http://127.0.0.1:4321/projects/websocket-inspector`
- Simulated: 115.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2825.2 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 264.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 3116.2 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 246.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 4019.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/3vwpvuyn90046.js`
- Simulated: 210.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 7 — 4454.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 103.0 ms; observed: 13.3 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 8 — 4781.5 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 269.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 647.9 ms
Observed Σ max(0, 4 × duration − 50): 41.2 ms
Difference: -606.7 ms (93.6%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | 4454.4 ms | 257.2 ms | -4197.1 ms | 103.0 ms | 13.3 ms | 53.2 ms |
