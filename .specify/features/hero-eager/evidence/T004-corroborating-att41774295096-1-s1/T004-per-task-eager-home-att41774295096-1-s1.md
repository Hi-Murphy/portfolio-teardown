# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (269 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.8 ms | 64.0 ms | 16.0 ms | exact | 14.0 ms | 3.8% | Unattributable | — | — | — | — |
| 2 | 818.8 ms | 137.0 ms | 34.2 ms | exact | 87.0 ms | 23.7% | Unattributable | (native) | — | (program) 28.3 ms (97.6%) | — |
| 3 | 956.8 ms | 66.0 ms | 8.3 ms | loose | 16.0 ms | 4.4% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 1062.8 ms | 63.0 ms | 15.7 ms | exact | 13.0 ms | 3.5% | Unattributable | — | — | — | — |
| 5 | 2310.7 ms | 197.0 ms | 49.3 ms | exact | 147.0 ms | 40.0% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 24.2 ms (49.0%)<br>(program) 9.2 ms (18.7%)<br>(anonymous) 3.0 ms (6.2%) | — |
| 6 | 2522.7 ms | 50.0 ms | 10.2 ms | exact | 0.0 ms | 0.0% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 7 | 2572.7 ms | 58.0 ms | not matched | — | 8.0 ms | 2.2% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 2630.7 ms | 161.0 ms | 40.1 ms | exact | 111.0 ms | 30.2% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3vwpvuyn90046.js | _next/static/chunks/3vwpvuyn90046.js | R 9.3 ms (23.1%)<br>G 5.2 ms (13.0%)<br>(garbage collector) 5.1 ms (12.7%)<br>Y 4.5 ms (11.3%)<br>(anonymous) 3.2 ms (8.1%)<br>(program) 2.7 ms (6.7%)<br>O 2.1 ms (5.2%) | — |
| 9 | 3570.5 ms | 60.0 ms | 14.4 ms | exact | 10.0 ms | 2.7% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3671.5 ms | 60.0 ms | not matched | — | 10.0 ms | 2.7% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 11 | 3731.5 ms | 63.0 ms | 9.0 ms | loose | 13.0 ms | 3.5% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 12 | 4120.4 ms | 129.0 ms | 32.2 ms | exact | 79.0 ms | 21.5% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 15.8 ms (65.9%)<br>I 4.8 ms (20.1%) | — |

## Task details

### Task 1 — 754.8 ms simulated

- URL: `Unattributable`
- Simulated: 64.0 ms; observed: 16.0 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 818.8 ms simulated

- URL: `Unattributable`
- Simulated: 137.0 ms; observed: 34.2 ms; match: exact
- `(program)` — 28.3 ms (97.6%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 956.8 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 66.0 ms; observed: 8.3 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 4 — 1062.8 ms simulated

- URL: `Unattributable`
- Simulated: 63.0 ms; observed: 15.7 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 2310.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 197.0 ms; observed: 49.3 ms; match: exact
- `I` — 24.2 ms (49.0%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 9.2 ms (18.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 3.0 ms (6.2%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 6 — 2522.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 50.0 ms; observed: 10.2 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 7 — 2572.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 58.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 8 — 2630.7 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 161.0 ms; observed: 40.1 ms; match: exact
- `R` — 9.3 ms (23.1%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
- `G` — 5.2 ms (13.0%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6313
  - self: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - grandparent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
- `(garbage collector)` — 5.1 ms (12.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(garbage collector)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `Y` — 4.5 ms (11.3%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5665
  - self: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
- `(anonymous)` — 3.2 ms (8.1%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 42206
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42206 — `({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.layers.map(e=>({...e,corners:e`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42180 — `()=>null===b?null:function({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.laye`
  - grandparent: `oc` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 83230 — `(e,t){var n=aL();t=void 0===t?null:t;var r=n.memoizedState;return null!==t&&aE(t,r[1])?r[0]:(n.memoizedState=[r=e(),t],r`
- `(program)` — 2.7 ms (6.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `O` — 2.1 ms (5.2%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5622
  - self: `O` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5622 — `(e,t){return e[0]*t[0]+e[1]*t[1]}function Y(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l`
  - parent: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - grandparent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`

### Task 9 — 3570.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 60.0 ms; observed: 14.4 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 10 — 3671.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 60.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 11 — 3731.5 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 63.0 ms; observed: 9.0 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 12 — 4120.4 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 129.0 ms; observed: 32.2 ms; match: exact
- `(program)` — 15.8 ms (65.9%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 4.8 ms (20.1%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`

## Lantern check

Simulated TBT: 367.5 ms
Observed Σ max(0, 4 × duration − 50): 703.0 ms
Difference: 335.5 ms (91.3%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.8 ms | 18.7 ms | -736.2 ms | 64.0 ms | 16.0 ms | 63.9 ms |
| Unattributable | 818.8 ms | 34.7 ms | -784.2 ms | 137.0 ms | 34.2 ms | 137.0 ms |
| http://127.0.0.1:PORT/ | 956.8 ms | 86.3 ms | -870.6 ms | 66.0 ms | 8.3 ms | 33.2 ms |
| Unattributable | 1062.8 ms | 497.4 ms | -565.5 ms | 63.0 ms | 15.7 ms | 62.7 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2310.7 ms | 149.9 ms | -2160.8 ms | 197.0 ms | 49.3 ms | 197.4 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2522.7 ms | 410.8 ms | -2111.9 ms | 50.0 ms | 10.2 ms | 40.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2630.7 ms | 584.4 ms | -2046.3 ms | 161.0 ms | 40.1 ms | 160.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3570.5 ms | 483.0 ms | -3087.6 ms | 60.0 ms | 14.4 ms | 57.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3731.5 ms | 383.2 ms | -3348.3 ms | 63.0 ms | 9.0 ms | 35.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4120.4 ms | 306.9 ms | -3813.5 ms | 129.0 ms | 32.2 ms | 128.6 ms |
