# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (195 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 757.5 ms | 68.0 ms | 16.9 ms | exact | 18.0 ms | 14.6% | Unattributable | (native) | — | (program) 10.6 ms (95.0%)<br>(anonymous) 0.6 ms (5.0%) | — |
| 2 | 873.5 ms | 65.0 ms | 11.8 ms | loose | 15.0 ms | 12.2% | http://127.0.0.1:PORT/projects/websocket-inspector | — | — | — | — |
| 3 | 2183.0 ms | 173.0 ms | 43.2 ms | exact | 123.0 ms | 100.0% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.2 ms (51.3%)<br>(program) 9.9 ms (22.9%)<br>(anonymous) 2.5 ms (5.7%) | — |

## Task details

### Task 1 — 757.5 ms simulated

- URL: `Unattributable`
- Simulated: 68.0 ms; observed: 16.9 ms; match: exact
- `(program)` — 10.6 ms (95.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 0.6 ms (5.0%), chunk `_lighthouse-eval.js`, module `—`, lineNumber 7, columnNumber 7
  - self: `(anonymous)` at `_lighthouse-eval.js` lineNumber 7, columnNumber 7 — source unavailable
  - parent: `(anonymous)` at `_lighthouse-eval.js` lineNumber 0, columnNumber 1 — source unavailable
  - grandparent: `(anonymous)` at `_lighthouse-eval.js` lineNumber 0, columnNumber 0 — source unavailable

### Task 2 — 873.5 ms simulated

- URL: `http://127.0.0.1:PORT/projects/websocket-inspector`
- Simulated: 65.0 ms; observed: 11.8 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 3 — 2183.0 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 173.0 ms; observed: 43.2 ms; match: exact
- `I` — 22.2 ms (51.3%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 9.9 ms (22.9%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.5 ms (5.7%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 123.0 ms
Observed Σ max(0, 4 × duration − 50): 220.8 ms
Difference: 97.8 ms (79.5%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 757.5 ms | 14.6 ms | -742.9 ms | 68.0 ms | 16.9 ms | 67.8 ms |
| http://127.0.0.1:PORT/projects/websocket-inspector | 873.5 ms | 50.1 ms | -823.4 ms | 65.0 ms | 11.8 ms | 47.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2183.0 ms | 115.4 ms | -2067.6 ms | 173.0 ms | 43.2 ms | 172.9 ms |
