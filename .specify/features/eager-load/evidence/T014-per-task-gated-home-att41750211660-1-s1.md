# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/
Route: /
Source: lighthouse-profile (207 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 799.3 ms | 117.0 ms | 29.2 ms | exact | 67.0 ms | 60.4% | Unattributable | (native) | — | (program) 23.2 ms (97.2%) | — |
| 2 | 917.3 ms | 73.0 ms | 9.2 ms | loose | 23.0 ms | 20.7% | http://127.0.0.1:4320/ | — | — | — | — |
| 3 | 2269.6 ms | 161.0 ms | 40.3 ms | exact | 111.0 ms | 100.0% | http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.1 ms (54.7%)<br>(program) 5.1 ms (12.7%)<br>(anonymous) 2.3 ms (5.7%) | — |

## Task details

### Task 1 — 799.3 ms simulated

- URL: `Unattributable`
- Simulated: 117.0 ms; observed: 29.2 ms; match: exact
- `(program)` — 23.2 ms (97.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 917.3 ms simulated

- URL: `http://127.0.0.1:4320/`
- Simulated: 73.0 ms; observed: 9.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 3 — 2269.6 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 161.0 ms; observed: 40.3 ms; match: exact
- `I` — 22.1 ms (54.7%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 5.1 ms (12.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.3 ms (5.7%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 111.0 ms
Observed Σ max(0, 4 × duration − 50): 274.4 ms
Difference: 163.4 ms (147.2%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 799.3 ms | 28.5 ms | -770.7 ms | 117.0 ms | 29.2 ms | 116.9 ms |
| http://127.0.0.1:4320/ | 917.3 ms | 72.9 ms | -844.4 ms | 73.0 ms | 9.2 ms | 36.9 ms |
| http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | 2269.6 ms | 135.2 ms | -2134.4 ms | 161.0 ms | 40.3 ms | 161.3 ms |
