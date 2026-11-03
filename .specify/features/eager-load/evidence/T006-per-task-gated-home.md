# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (198 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.1 ms | 71.0 ms | 17.7 ms | exact | 21.0 ms | 17.7% | Unattributable | — | — | — | — |
| 2 | 824.1 ms | 136.0 ms | 34.0 ms | exact | 86.0 ms | 72.6% | Unattributable | (native) | — | (program) 27.2 ms (97.4%) | — |
| 3 | 1002.1 ms | 73.0 ms | 10.2 ms | loose | 23.0 ms | 19.4% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 2313.2 ms | 177.0 ms | 44.3 ms | exact | 127.0 ms | 107.3% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.5 ms (50.8%)<br>(program) 8.7 ms (19.8%)<br>(anonymous) 2.3 ms (5.1%) | — |

## Task details

### Task 1 — 753.1 ms simulated

- URL: `Unattributable`
- Simulated: 71.0 ms; observed: 17.7 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 824.1 ms simulated

- URL: `Unattributable`
- Simulated: 136.0 ms; observed: 34.0 ms; match: exact
- `(program)` — 27.2 ms (97.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 1002.1 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 73.0 ms; observed: 10.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 4 — 2313.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 177.0 ms; observed: 44.3 ms; match: exact
- `I` — 22.5 ms (50.8%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 8.7 ms (19.8%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.3 ms (5.1%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 118.4 ms
Observed Σ max(0, 4 × duration − 50): 329.5 ms
Difference: 211.1 ms (178.3%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 753.1 ms | 18.6 ms | -734.5 ms | 71.0 ms | 17.7 ms | 70.9 ms |
| Unattributable | 824.1 ms | 36.3 ms | -787.8 ms | 136.0 ms | 34.0 ms | 136.1 ms |
| http://127.0.0.1:PORT/ | 1002.1 ms | 84.9 ms | -917.2 ms | 73.0 ms | 10.2 ms | 40.7 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2313.2 ms | 149.4 ms | -2163.8 ms | 177.0 ms | 44.3 ms | 177.1 ms |
