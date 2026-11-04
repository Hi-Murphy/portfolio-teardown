# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (267 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.8 ms | 115.0 ms | not matched | — | 65.0 ms | 15.2% | http://127.0.0.1:PORT/projects/websocket-inspector | — | — | — | — |
| 2 | 2105.6 ms | 268.0 ms | not matched | — | 218.0 ms | 51.1% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 3 | 3454.4 ms | 217.0 ms | not matched | — | 167.0 ms | 39.1% | http://127.0.0.1:PORT/_next/static/chunks/1y81jgf1iz4ib.js | — | — | — | — |
| 4 | 3738.4 ms | 103.0 ms | 13.5 ms | loose | 53.0 ms | 12.4% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 5 | 3841.4 ms | 249.0 ms | not matched | — | 199.0 ms | 46.6% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 6 | 4090.4 ms | 267.0 ms | not matched | — | 217.0 ms | 50.8% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 753.8 ms simulated

- URL: `http://127.0.0.1:PORT/projects/websocket-inspector`
- Simulated: 115.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 2105.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 268.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 3454.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1y81jgf1iz4ib.js`
- Simulated: 217.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 3738.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 103.0 ms; observed: 13.5 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 5 — 3841.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 249.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 4090.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 267.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 427.0 ms
Observed Σ max(0, 4 × duration − 50): 19.6 ms
Difference: -407.4 ms (95.4%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3738.4 ms | 230.2 ms | -3508.3 ms | 103.0 ms | 13.5 ms | 53.9 ms |
