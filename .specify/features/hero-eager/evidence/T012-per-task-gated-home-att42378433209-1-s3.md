# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (205 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.5 ms | 69.0 ms | 17.2 ms | exact | 19.0 ms | 16.0% | Unattributable | — | — | — | — |
| 2 | 823.5 ms | 124.0 ms | 31.1 ms | exact | 74.0 ms | 62.4% | Unattributable | (native) | — | (program) 25.2 ms (97.9%) | — |
| 3 | 991.5 ms | 71.0 ms | 10.9 ms | loose | 21.0 ms | 17.7% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 2302.0 ms | 182.0 ms | 45.4 ms | exact | 132.0 ms | 111.4% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.2 ms (48.8%)<br>(program) 6.9 ms (15.3%)<br>(anonymous) 2.4 ms (5.3%)<br>(anonymous) 2.4 ms (5.2%) | — |

## Task details

### Task 1 — 754.5 ms simulated

- URL: `Unattributable`
- Simulated: 69.0 ms; observed: 17.2 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 823.5 ms simulated

- URL: `Unattributable`
- Simulated: 124.0 ms; observed: 31.1 ms; match: exact
- `(program)` — 25.2 ms (97.9%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 991.5 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 71.0 ms; observed: 10.9 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 4 — 2302.0 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 182.0 ms; observed: 45.4 ms; match: exact
- `I` — 22.2 ms (48.8%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 6.9 ms (15.3%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.4 ms (5.3%), chunk `10kujx8nsd3ck.js`, module `_next/static/chunks/10kujx8nsd3ck.js`, lineNumber 1, columnNumber 89736
  - self: `(anonymous)` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89736 — `(e,t,n,r,u,o){switch(r){case 65:eu(e,n,ed(u,o).buffer);return;case 79:eh(e,n,u,o,Int8Array,1);return;case 111:eu(e,n,0==`
  - parent: `t` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89073 — `(i){var c=i.value;if(i.done)return n();var s=0,d=u._rowState;i=u._rowID;for(var p=u._rowTag,y=u._rowLength,g=u._buffer,v`
  - grandparent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.4 ms (5.2%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 118.5 ms
Observed Σ max(0, 4 × duration − 50): 316.2 ms
Difference: 197.7 ms (166.8%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.5 ms | 18.9 ms | -735.6 ms | 69.0 ms | 17.2 ms | 68.8 ms |
| Unattributable | 823.5 ms | 36.1 ms | -787.4 ms | 124.0 ms | 31.1 ms | 124.4 ms |
| http://127.0.0.1:PORT/ | 991.5 ms | 87.3 ms | -904.2 ms | 71.0 ms | 10.9 ms | 43.4 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2302.0 ms | 155.7 ms | -2146.2 ms | 182.0 ms | 45.4 ms | 181.7 ms |
