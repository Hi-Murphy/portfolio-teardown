# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (278 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 756.0 ms | 85.0 ms | 21.3 ms | exact | 35.0 ms | 13.2% | Unattributable | (native) | — | (program) 14.7 ms (95.7%) | — |
| 2 | 842.0 ms | 50.0 ms | 12.5 ms | exact | 0.0 ms | 0.0% | http://127.0.0.1:PORT/ | — | — | — | — |
| 3 | 892.0 ms | 74.0 ms | not matched | — | 24.0 ms | 9.1% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 997.0 ms | 64.0 ms | 16.1 ms | exact | 14.0 ms | 5.3% | Unattributable | — | — | — | — |
| 5 | 1061.0 ms | 91.0 ms | not matched | — | 41.0 ms | 15.5% | http://127.0.0.1:PORT/ | — | — | — | — |
| 6 | 2195.1 ms | 169.0 ms | 42.3 ms | exact | 119.0 ms | 45.0% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 21.1 ms (50.0%)<br>(program) 8.7 ms (20.6%)<br>(anonymous) 2.4 ms (5.7%) | — |
| 7 | 2378.1 ms | 52.0 ms | 13.0 ms | exact | 2.0 ms | 0.8% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 2472.1 ms | 63.0 ms | 15.8 ms | exact | 13.0 ms | 4.9% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 9 | 3425.1 ms | 59.0 ms | 10.5 ms | loose | 9.0 ms | 3.4% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3484.1 ms | 58.0 ms | 7.9 ms | loose | 8.0 ms | 3.0% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 11 | 3542.1 ms | 63.0 ms | not matched | — | 13.0 ms | 4.9% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 12 | 4011.3 ms | 125.0 ms | 31.3 ms | exact | 75.0 ms | 28.4% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 3vnmkhfgdnq2d.js | _next/static/chunks/3vnmkhfgdnq2d.js | (anonymous) 7.0 ms (22.2%)<br>R 3.3 ms (10.5%) | — |

## Task details

### Task 1 — 756.0 ms simulated

- URL: `Unattributable`
- Simulated: 85.0 ms; observed: 21.3 ms; match: exact
- `(program)` — 14.7 ms (95.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 842.0 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 50.0 ms; observed: 12.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 3 — 892.0 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 74.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 997.0 ms simulated

- URL: `Unattributable`
- Simulated: 64.0 ms; observed: 16.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 1061.0 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 91.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 2195.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 169.0 ms; observed: 42.3 ms; match: exact
- `I` — 21.1 ms (50.0%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 8.7 ms (20.6%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.4 ms (5.7%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 7 — 2378.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 52.0 ms; observed: 13.0 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 2472.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 63.0 ms; observed: 15.8 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 9 — 3425.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 59.0 ms; observed: 10.5 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3484.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 58.0 ms; observed: 7.9 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 11 — 3542.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 63.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 12 — 4011.3 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 125.0 ms; observed: 31.3 ms; match: exact
- `(anonymous)` — 7.0 ms (22.2%), chunk `1y7jwsdsad7nj.js`, module `_next/static/chunks/1y7jwsdsad7nj.js`, lineNumber 48, columnNumber 6566
  - self: `(anonymous)` at `1y7jwsdsad7nj.js` lineNumber 48, columnNumber 6566 — `()=>{var t,r;let l,f=n.current,h=a.height;if(h<=0||a.width<=0)return;let m=function(e,t,n,r){let l=1/0,o=-1/0;for(let a`
  - parent: `(anonymous)` at `1y7jwsdsad7nj.js` lineNumber 48, columnNumber 7483 — `()=>{f()},[t.turns,t.zoomFactor,a.height,a.width,f]),(0,r.useLayoutEffect)(()=>{let e=n.current;if(null!==e)return e.add`
  - grandparent: `nK` at `1d5kkip1hlg-o.js` lineNumber 7, columnNumber 53680 — `(e,t){try{var n=t.updateQueue,r=null!==n?n.lastEffect:null;if(null!==r){var l=r.next;n=l;do{if((n.tag&e)===e){r=void 0;v`
- `R` — 3.3 ms (10.5%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`

## Lantern check

Simulated TBT: 264.5 ms
Observed Σ max(0, 4 × duration − 50): 577.5 ms
Difference: 313.0 ms (118.4%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 756.0 ms | 26.4 ms | -729.7 ms | 85.0 ms | 21.3 ms | 85.4 ms |
| http://127.0.0.1:PORT/ | 842.0 ms | 62.2 ms | -779.8 ms | 50.0 ms | 12.5 ms | 50.2 ms |
| Unattributable | 997.0 ms | 474.3 ms | -522.8 ms | 64.0 ms | 16.1 ms | 64.4 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2195.1 ms | 128.3 ms | -2066.8 ms | 169.0 ms | 42.3 ms | 169.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2378.1 ms | 372.8 ms | -2005.3 ms | 52.0 ms | 13.0 ms | 52.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2472.1 ms | 560.6 ms | -1911.4 ms | 63.0 ms | 15.8 ms | 63.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3425.1 ms | 463.7 ms | -2961.4 ms | 59.0 ms | 10.5 ms | 42.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3484.1 ms | 391.4 ms | -3092.8 ms | 58.0 ms | 7.9 ms | 31.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4011.3 ms | 527.8 ms | -3483.4 ms | 125.0 ms | 31.3 ms | 125.3 ms |
