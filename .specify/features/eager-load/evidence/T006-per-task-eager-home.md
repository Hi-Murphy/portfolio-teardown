# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (264 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 758.3 ms | 110.0 ms | 27.6 ms | exact | 60.0 ms | 17.1% | Unattributable | (native) | — | (program) 21.6 ms (97.1%) | — |
| 2 | 869.3 ms | 71.0 ms | 8.9 ms | loose | 21.0 ms | 6.0% | http://127.0.0.1:PORT/ | — | — | — | — |
| 3 | 977.3 ms | 62.0 ms | 15.5 ms | exact | 12.0 ms | 3.4% | Unattributable | — | — | — | — |
| 4 | 1039.3 ms | 52.0 ms | not matched | — | 2.0 ms | 0.6% | http://127.0.0.1:PORT/ | — | — | — | — |
| 5 | 2225.6 ms | 190.0 ms | 47.4 ms | exact | 140.0 ms | 39.9% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 25.3 ms (53.3%)<br>(program) 10.9 ms (23.0%)<br>(anonymous) 2.8 ms (6.0%) | — |
| 6 | 2431.6 ms | 53.0 ms | 9.5 ms | loose | 3.0 ms | 0.9% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 7 | 3480.9 ms | 66.0 ms | 9.3 ms | loose | 16.0 ms | 4.6% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 8 | 3546.9 ms | 60.0 ms | not matched | — | 10.0 ms | 2.9% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 9 | 3606.9 ms | 64.0 ms | not matched | — | 14.0 ms | 4.0% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3670.9 ms | 161.0 ms | 32.0 ms | exact | 111.0 ms | 31.7% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3vnmkhfgdnq2d.js | _next/static/chunks/3vnmkhfgdnq2d.js | (anonymous) 7.7 ms (24.0%) | — |
| 11 | 4040.1 ms | 135.0 ms | 33.8 ms | exact | 85.0 ms | 24.3% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 19.6 ms (60.8%)<br>I 5.4 ms (16.6%)<br>(anonymous) 1.9 ms (5.8%)<br>t 1.8 ms (5.7%) | — |

## Task details

### Task 1 — 758.3 ms simulated

- URL: `Unattributable`
- Simulated: 110.0 ms; observed: 27.6 ms; match: exact
- `(program)` — 21.6 ms (97.1%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 869.3 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 71.0 ms; observed: 8.9 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 3 — 977.3 ms simulated

- URL: `Unattributable`
- Simulated: 62.0 ms; observed: 15.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 1039.3 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 52.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 2225.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 190.0 ms; observed: 47.4 ms; match: exact
- `I` — 25.3 ms (53.3%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 10.9 ms (23.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.8 ms (6.0%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 6 — 2431.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 53.0 ms; observed: 9.5 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 7 — 3480.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 66.0 ms; observed: 9.3 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 8 — 3546.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 60.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 9 — 3606.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 64.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 10 — 3670.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 161.0 ms; observed: 32.0 ms; match: exact
- `(anonymous)` — 7.7 ms (24.0%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 48, columnNumber 6566
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 48, columnNumber 6566 — `()=>{var t,r;let l,f=n.current,h=a.height;if(h<=0||a.width<=0)return;let m=function(e,t,n,r){let l=1/0,o=-1/0;for(let a`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 48, columnNumber 7483 — `()=>{f()},[t.turns,t.zoomFactor,a.height,a.width,f]),(0,r.useLayoutEffect)(()=>{let e=n.current;if(null!==e)return e.add`
  - grandparent: `nK` at `1d5kkip1hlg-o.js` lineNumber 7, columnNumber 53680 — `(e,t){try{var n=t.updateQueue,r=null!==n?n.lastEffect:null;if(null!==r){var l=r.next;n=l;do{if((n.tag&e)===e){r=void 0;v`

### Task 11 — 4040.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 135.0 ms; observed: 33.8 ms; match: exact
- `(program)` — 19.6 ms (60.8%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 5.4 ms (16.6%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`
- `(anonymous)` — 1.9 ms (5.8%), chunk `10kujx8nsd3ck.js`, module `_next/static/chunks/10kujx8nsd3ck.js`, lineNumber 1, columnNumber 89736
  - self: `(anonymous)` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89736 — `(e,t,n,r,u,o){switch(r){case 65:eu(e,n,ed(u,o).buffer);return;case 79:eh(e,n,u,o,Int8Array,1);return;case 111:eu(e,n,0==`
  - parent: `t` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89073 — `(i){var c=i.value;if(i.done)return n();var s=0,d=u._rowState;i=u._rowID;for(var p=u._rowTag,y=u._rowLength,g=u._buffer,v`
  - grandparent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `t` — 1.8 ms (5.7%), chunk `10kujx8nsd3ck.js`, module `_next/static/chunks/10kujx8nsd3ck.js`, lineNumber 1, columnNumber 89073
  - self: `t` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89073 — `(i){var c=i.value;if(i.done)return n();var s=0,d=u._rowState;i=u._rowID;for(var p=u._rowTag,y=u._rowLength,g=u._buffer,v`
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

## Lantern check

Simulated TBT: 350.5 ms
Observed Σ max(0, 4 × duration − 50): 672.9 ms
Difference: 322.4 ms (92.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 758.3 ms | 26.4 ms | -731.8 ms | 110.0 ms | 27.6 ms | 110.3 ms |
| http://127.0.0.1:PORT/ | 869.3 ms | 71.7 ms | -797.6 ms | 71.0 ms | 8.9 ms | 35.8 ms |
| Unattributable | 977.3 ms | 481.7 ms | -495.6 ms | 62.0 ms | 15.5 ms | 62.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2225.6 ms | 137.5 ms | -2088.1 ms | 190.0 ms | 47.4 ms | 189.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2431.6 ms | 397.3 ms | -2034.3 ms | 53.0 ms | 9.5 ms | 38.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3480.9 ms | 368.8 ms | -3112.0 ms | 66.0 ms | 9.3 ms | 37.4 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3670.9 ms | 536.0 ms | -3134.8 ms | 161.0 ms | 32.0 ms | 128.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4040.1 ms | 289.4 ms | -3750.8 ms | 135.0 ms | 33.8 ms | 135.2 ms |
