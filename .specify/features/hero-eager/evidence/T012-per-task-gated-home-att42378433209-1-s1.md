# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (210 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.6 ms | 68.0 ms | 17.0 ms | exact | 18.0 ms | 13.5% | Unattributable | — | — | — | — |
| 2 | 821.6 ms | 164.0 ms | 41.0 ms | exact | 114.0 ms | 85.5% | Unattributable | (native) | — | (program) 35.2 ms (98.6%) | — |
| 3 | 986.6 ms | 78.0 ms | not matched | — | 28.0 ms | 21.0% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 2339.2 ms | 161.0 ms | 40.2 ms | exact | 111.0 ms | 83.2% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 19.7 ms (49.2%)<br>(program) 4.5 ms (11.4%)<br>(anonymous) 2.1 ms (5.3%) | — |

## Task details

### Task 1 — 753.6 ms simulated

- URL: `Unattributable`
- Simulated: 68.0 ms; observed: 17.0 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 821.6 ms simulated

- URL: `Unattributable`
- Simulated: 164.0 ms; observed: 41.0 ms; match: exact
- `(program)` — 35.2 ms (98.6%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 986.6 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 78.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 2339.2 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 161.0 ms; observed: 40.2 ms; match: exact
- `I` — 19.7 ms (49.2%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 4.5 ms (11.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.1 ms (5.3%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 133.4 ms
Observed Σ max(0, 4 × duration − 50): 348.3 ms
Difference: 214.9 ms (161.1%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 753.6 ms | 21.4 ms | -732.2 ms | 68.0 ms | 17.0 ms | 68.2 ms |
| Unattributable | 821.6 ms | 38.5 ms | -783.1 ms | 164.0 ms | 41.0 ms | 164.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2339.2 ms | 163.2 ms | -2176.1 ms | 161.0 ms | 40.2 ms | 160.8 ms |
