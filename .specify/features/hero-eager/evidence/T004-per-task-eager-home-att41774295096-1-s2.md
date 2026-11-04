# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (268 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 757.5 ms | 67.0 ms | 16.7 ms | exact | 17.0 ms | 4.9% | Unattributable | (native) | — | (program) 11.8 ms (100.0%) | — |
| 2 | 825.5 ms | 63.0 ms | 15.8 ms | exact | 13.0 ms | 3.7% | http://127.0.0.1:PORT/ | — | — | — | — |
| 3 | 888.5 ms | 68.0 ms | not matched | — | 18.0 ms | 5.2% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 956.5 ms | 65.0 ms | 16.2 ms | exact | 15.0 ms | 4.3% | Unattributable | — | — | — | — |
| 5 | 1021.5 ms | 62.0 ms | not matched | — | 12.0 ms | 3.4% | http://127.0.0.1:PORT/ | — | — | — | — |
| 6 | 2181.9 ms | 176.0 ms | 44.1 ms | exact | 126.0 ms | 36.1% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 20.2 ms (45.9%)<br>(program) 9.9 ms (22.6%)<br>push.Object.defineProperty.value 2.5 ms (5.6%)<br>(anonymous) 2.3 ms (5.1%) | — |
| 7 | 2373.9 ms | 54.0 ms | 13.5 ms | exact | 4.0 ms | 1.1% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 2427.9 ms | 160.0 ms | 32.3 ms | exact | 110.0 ms | 31.5% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3vnmkhfgdnq2d.js | _next/static/chunks/3vnmkhfgdnq2d.js | (anonymous) 6.9 ms (21.3%) | — |
| 9 | 3423.4 ms | 65.0 ms | 9.2 ms | loose | 15.0 ms | 4.3% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3488.4 ms | 60.0 ms | 9.2 ms | loose | 10.0 ms | 2.9% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 11 | 3548.4 ms | 65.0 ms | not matched | — | 15.0 ms | 4.3% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 12 | 4004.4 ms | 134.0 ms | 33.5 ms | exact | 84.0 ms | 24.1% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 15.3 ms (64.2%)<br>I 6.5 ms (27.2%)<br>(anonymous) 1.3 ms (5.5%) | — |

## Task details

### Task 1 — 757.5 ms simulated

- URL: `Unattributable`
- Simulated: 67.0 ms; observed: 16.7 ms; match: exact
- `(program)` — 11.8 ms (100.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 825.5 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 63.0 ms; observed: 15.8 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 888.5 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 68.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 956.5 ms simulated

- URL: `Unattributable`
- Simulated: 65.0 ms; observed: 16.2 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 1021.5 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 62.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 2181.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 176.0 ms; observed: 44.1 ms; match: exact
- `I` — 20.2 ms (45.9%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 9.9 ms (22.6%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `push.Object.defineProperty.value` — 2.5 ms (5.6%), chunk `10kujx8nsd3ck.js`, module `_next/static/chunks/10kujx8nsd3ck.js`, lineNumber 0, columnNumber 1614
  - self: `push.Object.defineProperty.value` at `10kujx8nsd3ck.js` lineNumber 0, columnNumber 1614 — `(e,t,n)=>{let r;e.i(29942),Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"findSourceMapURL",{`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
- `(anonymous)` — 2.3 ms (5.1%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 7 — 2373.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 54.0 ms; observed: 13.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 2427.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 160.0 ms; observed: 32.3 ms; match: exact
- `(anonymous)` — 6.9 ms (21.3%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 48, columnNumber 6566
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 48, columnNumber 6566 — `()=>{var t,r;let l,f=n.current,h=a.height;if(h<=0||a.width<=0)return;let m=function(e,t,n,r){let l=1/0,o=-1/0;for(let a`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 48, columnNumber 7483 — `()=>{f()},[t.turns,t.zoomFactor,a.height,a.width,f]),(0,r.useLayoutEffect)(()=>{let e=n.current;if(null!==e)return e.add`
  - grandparent: `nK` at `1d5kkip1hlg-o.js` lineNumber 7, columnNumber 53680 — `(e,t){try{var n=t.updateQueue,r=null!==n?n.lastEffect:null;if(null!==r){var l=r.next;n=l;do{if((n.tag&e)===e){r=void 0;v`

### Task 9 — 3423.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 65.0 ms; observed: 9.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3488.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 60.0 ms; observed: 9.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 11 — 3548.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 65.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 12 — 4004.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 134.0 ms; observed: 33.5 ms; match: exact
- `(program)` — 15.3 ms (64.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 6.5 ms (27.2%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`
- `(anonymous)` — 1.3 ms (5.5%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 8, columnNumber 18208
  - self: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 18208 — `e=>{e.i(11162);let t=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

## Lantern check

Simulated TBT: 349.0 ms
Observed Σ max(0, 4 × duration − 50): 692.9 ms
Difference: 343.9 ms (98.5%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 757.5 ms | 18.6 ms | -738.9 ms | 67.0 ms | 16.7 ms | 66.9 ms |
| http://127.0.0.1:PORT/ | 825.5 ms | 55.6 ms | -769.9 ms | 63.0 ms | 15.8 ms | 63.4 ms |
| Unattributable | 956.5 ms | 475.4 ms | -481.1 ms | 65.0 ms | 16.2 ms | 64.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2181.9 ms | 125.8 ms | -2056.1 ms | 176.0 ms | 44.1 ms | 176.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2373.9 ms | 377.5 ms | -1996.4 ms | 54.0 ms | 13.5 ms | 54.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2427.9 ms | 530.6 ms | -1897.3 ms | 160.0 ms | 32.3 ms | 129.3 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3423.4 ms | 396.8 ms | -3026.6 ms | 65.0 ms | 9.2 ms | 36.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3488.4 ms | 225.0 ms | -3263.5 ms | 60.0 ms | 9.2 ms | 36.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4004.4 ms | 286.8 ms | -3717.6 ms | 134.0 ms | 33.5 ms | 133.9 ms |
