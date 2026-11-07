# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (199 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.3 ms | 78.0 ms | 19.6 ms | exact | 28.0 ms | 19.1% | Unattributable | — | — | — | — |
| 2 | 832.3 ms | 139.0 ms | 34.7 ms | exact | 89.0 ms | 60.7% | Unattributable | (native) | — | (program) 28.7 ms (98.2%) | — |
| 3 | 971.3 ms | 93.0 ms | not matched | — | 43.0 ms | 29.3% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 2325.7 ms | 180.0 ms | 45.0 ms | exact | 130.0 ms | 88.6% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.0 ms (48.8%)<br>(program) 9.3 ms (20.7%)<br>(anonymous) 2.8 ms (6.1%) | — |

## Task details

### Task 1 — 754.3 ms simulated

- URL: `Unattributable`
- Simulated: 78.0 ms; observed: 19.6 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 832.3 ms simulated

- URL: `Unattributable`
- Simulated: 139.0 ms; observed: 34.7 ms; match: exact
- `(program)` — 28.7 ms (98.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 971.3 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 93.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2325.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 180.0 ms; observed: 45.0 ms; match: exact
- `I` — 22.0 ms (48.8%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 9.3 ms (20.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.8 ms (6.1%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 146.7 ms
Observed Σ max(0, 4 × duration − 50): 312.2 ms
Difference: 165.6 ms (112.9%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.3 ms | 18.3 ms | -736.0 ms | 78.0 ms | 19.6 ms | 78.3 ms |
| Unattributable | 832.3 ms | 37.9 ms | -794.4 ms | 139.0 ms | 34.7 ms | 138.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2325.7 ms | 157.1 ms | -2168.6 ms | 180.0 ms | 45.0 ms | 180.2 ms |
