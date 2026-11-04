# Lighthouse per-task attribution

LHR: http://127.0.0.1:4321/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (266 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 2103.8 ms | 271.0 ms | not matched | — | 221.0 ms | 52.4% | http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js | — | — | — | — |
| 2 | 3309.5 ms | 207.0 ms | not matched | — | 157.0 ms | 37.2% | http://127.0.0.1:4321/_next/static/chunks/3vwpvuyn90046.js | — | — | — | — |
| 3 | 3738.7 ms | 104.0 ms | 13.2 ms | loose | 54.0 ms | 12.8% | http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 4 | 3842.7 ms | 245.0 ms | not matched | — | 195.0 ms | 46.2% | http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 5 | 4087.7 ms | 267.0 ms | not matched | — | 217.0 ms | 51.4% | http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js | — | — | — | — |

## Task details

### Task 1 — 2103.8 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 271.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 2 — 3309.5 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/3vwpvuyn90046.js`
- Simulated: 207.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 3738.7 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 104.0 ms; observed: 13.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 4 — 3842.7 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 245.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 4087.7 ms simulated

- URL: `http://127.0.0.1:4321/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 267.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

## Lantern check

Simulated TBT: 422.0 ms
Observed Σ max(0, 4 × duration − 50): 19.3 ms
Difference: -402.7 ms (95.4%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| http://127.0.0.1:4321/_next/static/chunks/1d5kkip1hlg-o.js | 3738.7 ms | 238.7 ms | -3500.0 ms | 104.0 ms | 13.2 ms | 52.9 ms |
