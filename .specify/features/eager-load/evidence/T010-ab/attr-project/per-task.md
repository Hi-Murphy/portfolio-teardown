# Lighthouse per-task attribution

LHR: http://127.0.0.1:4321/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (271 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 756.5 ms | 111.0 ms | not matched | — | 61.0 ms | 19.5% | http://127.0.0.1:4321/projects/websocket-inspector | — | — | — | — |
| 2 | 2103.0 ms | 265.0 ms | not matched | — | 215.0 ms | 68.6% | http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 3910.4 ms | 216.0 ms | not matched | — | 166.0 ms | 53.0% | http://127.0.0.1:4321/_next/static/chunks/1y81jgf1iz4ib.js | — | — | — | — |
| 4 | 4126.4 ms | 104.0 ms | 13.1 ms | loose | 54.0 ms | 17.2% | http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 4230.4 ms | 242.0 ms | not matched | — | 192.0 ms | 61.2% | http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |

## Task details

### Task 1 — 756.5 ms simulated

- URL: `http://127.0.0.1:4321/projects/websocket-inspector`
- Simulated: 111.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2103.0 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 265.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 3910.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1y81jgf1iz4ib.js`
- Simulated: 216.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 4126.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 104.0 ms; observed: 13.1 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 5 — 4230.4 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 242.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 313.5 ms
Observed Σ max(0, 4 × duration − 50): 9.6 ms
Difference: -303.9 ms (97.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | 4126.4 ms | 243.7 ms | -3882.8 ms | 104.0 ms | 13.1 ms | 52.3 ms |
