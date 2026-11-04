# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (198 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 756.9 ms | 78.0 ms | 19.5 ms | exact | 28.0 ms | 22.0% | Unattributable | (native) | — | (program) 13.1 ms (96.0%) | — |
| 2 | 878.9 ms | 75.0 ms | 10.4 ms | loose | 25.0 ms | 19.7% | http://127.0.0.1:PORT/ | — | — | — | — |
| 3 | 2189.8 ms | 178.0 ms | 44.4 ms | exact | 128.0 ms | 100.8% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.9 ms (51.5%)<br>(program) 8.5 ms (19.1%)<br>(anonymous) 2.8 ms (6.4%) | — |

## Task details

### Task 1 — 756.9 ms simulated

- URL: `Unattributable`
- Simulated: 78.0 ms; observed: 19.5 ms; match: exact
- `(program)` — 13.1 ms (96.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 878.9 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 75.0 ms; observed: 10.4 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 3 — 2189.8 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 178.0 ms; observed: 44.4 ms; match: exact
- `I` — 22.9 ms (51.5%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 8.5 ms (19.1%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.8 ms (6.4%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 127.0 ms
Observed Σ max(0, 4 × duration − 50): 255.5 ms
Difference: 128.5 ms (101.2%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 756.9 ms | 18.0 ms | -738.9 ms | 78.0 ms | 19.5 ms | 77.8 ms |
| http://127.0.0.1:PORT/ | 878.9 ms | 57.0 ms | -821.9 ms | 75.0 ms | 10.4 ms | 41.7 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2189.8 ms | 127.6 ms | -2062.2 ms | 178.0 ms | 44.4 ms | 177.7 ms |
