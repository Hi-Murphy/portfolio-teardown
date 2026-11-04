# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/
Route: /
Source: lighthouse-profile (207 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.7 ms | 73.0 ms | 18.2 ms | exact | 23.0 ms | 22.4% | Unattributable | — | — | — | — |
| 2 | 826.7 ms | 142.0 ms | 35.5 ms | exact | 92.0 ms | 89.5% | Unattributable | (native) | — | (program) 28.5 ms (97.8%) | — |
| 3 | 969.7 ms | 70.0 ms | not matched | — | 20.0 ms | 19.5% | http://127.0.0.1:4320/ | — | — | — | — |
| 4 | 2322.5 ms | 158.0 ms | 39.4 ms | exact | 108.0 ms | 105.1% | http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 20.2 ms (51.3%)<br>(program) 5.4 ms (13.8%)<br>(anonymous) 2.0 ms (5.1%) | — |

## Task details

### Task 1 — 753.7 ms simulated

- URL: `Unattributable`
- Simulated: 73.0 ms; observed: 18.2 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 826.7 ms simulated

- URL: `Unattributable`
- Simulated: 142.0 ms; observed: 35.5 ms; match: exact
- `(program)` — 28.5 ms (97.8%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 969.7 ms simulated

- URL: `http://127.0.0.1:4320/`
- Simulated: 70.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2322.5 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 158.0 ms; observed: 39.4 ms; match: exact
- `I` — 20.2 ms (51.3%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 5.4 ms (13.8%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.0 ms (5.1%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 2514
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 2514 — `t=>{e.enqueue("string"==typeof t?C.encode(t):t)}),T&&!z)&&(null===e.desiredSize||e.desiredSize<0?N||e.error(Error("The c`
  - parent: `start` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 2496 — `(e){a&&(a.forEach(t=>{e.enqueue("string"==typeof t?C.encode(t):t)}),T&&!z)&&(null===e.desiredSize||e.desiredSize<0?N||e.`
  - grandparent: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 1268 — `(e,t,n)=>{let r,l,a,o;e.i(29942),Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"hydrate",{enu`

## Lantern check

Simulated TBT: 102.8 ms
Observed Σ max(0, 4 × duration − 50): 311.3 ms
Difference: 208.6 ms (203.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 753.7 ms | 22.0 ms | -731.7 ms | 73.0 ms | 18.2 ms | 72.7 ms |
| Unattributable | 826.7 ms | 40.3 ms | -786.5 ms | 142.0 ms | 35.5 ms | 141.9 ms |
| http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | 2322.5 ms | 151.7 ms | -2170.7 ms | 158.0 ms | 39.4 ms | 157.6 ms |
