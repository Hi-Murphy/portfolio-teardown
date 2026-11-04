# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (208 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.3 ms | 58.0 ms | 14.5 ms | exact | 8.0 ms | 7.5% | Unattributable | — | — | — | — |
| 2 | 812.3 ms | 65.0 ms | not matched | — | 15.0 ms | 14.0% | http://127.0.0.1:4320/projects/websocket-inspector | — | — | — | — |
| 3 | 2164.5 ms | 157.0 ms | 39.2 ms | exact | 107.0 ms | 100.0% | http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 20.7 ms (52.8%)<br>(program) 6.4 ms (16.4%)<br>(anonymous) 2.1 ms (5.3%) | — |

## Task details

### Task 1 — 753.3 ms simulated

- URL: `Unattributable`
- Simulated: 58.0 ms; observed: 14.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 812.3 ms simulated

- URL: `http://127.0.0.1:4320/projects/websocket-inspector`
- Simulated: 65.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 2164.5 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 157.0 ms; observed: 39.2 ms; match: exact
- `I` — 20.7 ms (52.8%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 6.4 ms (16.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.1 ms (5.3%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 107.0 ms
Observed Σ max(0, 4 × duration − 50): 195.6 ms
Difference: 88.6 ms (82.8%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 753.3 ms | 14.8 ms | -738.5 ms | 58.0 ms | 14.5 ms | 58.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | 2164.5 ms | 106.5 ms | -2058.0 ms | 157.0 ms | 39.2 ms | 156.9 ms |
