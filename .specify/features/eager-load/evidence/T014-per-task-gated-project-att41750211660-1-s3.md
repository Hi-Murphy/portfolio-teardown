# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (207 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.5 ms | 52.0 ms | 13.1 ms | exact | 2.0 ms | 1.7% | Unattributable | — | — | — | — |
| 2 | 806.5 ms | 118.0 ms | 29.5 ms | exact | 68.0 ms | 59.1% | Unattributable | (native) | — | (program) 22.6 ms (97.1%) | — |
| 3 | 925.5 ms | 72.0 ms | 9.2 ms | loose | 22.0 ms | 19.1% | http://127.0.0.1:4320/projects/websocket-inspector | — | — | — | — |
| 4 | 2279.0 ms | 169.0 ms | 42.2 ms | exact | 119.0 ms | 103.5% | http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 20.7 ms (49.0%)<br>(program) 7.7 ms (18.2%)<br>(anonymous) 2.6 ms (6.2%) | — |

## Task details

### Task 1 — 754.5 ms simulated

- URL: `Unattributable`
- Simulated: 52.0 ms; observed: 13.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 806.5 ms simulated

- URL: `Unattributable`
- Simulated: 118.0 ms; observed: 29.5 ms; match: exact
- `(program)` — 22.6 ms (97.1%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 925.5 ms simulated

- URL: `http://127.0.0.1:4320/projects/websocket-inspector`
- Simulated: 72.0 ms; observed: 9.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 4 — 2279.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 169.0 ms; observed: 42.2 ms; match: exact
- `I` — 20.7 ms (49.0%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 7.7 ms (18.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.6 ms (6.2%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 115.0 ms
Observed Σ max(0, 4 × duration − 50): 282.5 ms
Difference: 167.5 ms (145.7%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.5 ms | 20.9 ms | -733.6 ms | 52.0 ms | 13.1 ms | 52.4 ms |
| Unattributable | 806.5 ms | 34.0 ms | -772.5 ms | 118.0 ms | 29.5 ms | 118.0 ms |
| http://127.0.0.1:4320/projects/websocket-inspector | 925.5 ms | 81.6 ms | -843.9 ms | 72.0 ms | 9.2 ms | 36.9 ms |
| http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | 2279.0 ms | 145.9 ms | -2133.0 ms | 169.0 ms | 42.2 ms | 168.8 ms |
