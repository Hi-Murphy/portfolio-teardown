# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/
Route: /
Source: lighthouse-profile (284 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 759.3 ms | 60.0 ms | 15.1 ms | exact | 10.0 ms | 3.0% | Unattributable | — | — | — | — |
| 2 | 819.3 ms | 109.0 ms | 27.3 ms | exact | 59.0 ms | 17.5% | Unattributable | (native) | — | (program) 21.5 ms (97.5%) | — |
| 3 | 928.3 ms | 72.0 ms | not matched | — | 22.0 ms | 6.5% | http://127.0.0.1:PORT/ | — | — | — | — |
| 4 | 1033.3 ms | 62.0 ms | 15.5 ms | exact | 12.0 ms | 3.6% | Unattributable | — | — | — | — |
| 5 | 1095.3 ms | 83.0 ms | not matched | — | 33.0 ms | 9.8% | http://127.0.0.1:PORT/ | — | — | — | — |
| 6 | 2285.6 ms | 189.0 ms | 47.2 ms | exact | 139.0 ms | 41.3% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 26.7 ms (56.5%)<br>(program) 7.8 ms (16.4%) | — |
| 7 | 2490.6 ms | 51.0 ms | 12.7 ms | exact | 1.0 ms | 0.3% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 2582.6 ms | 68.0 ms | 16.9 ms | exact | 18.0 ms | 5.3% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3vnmkhfgdnq2d.js | _next/static/chunks/3vnmkhfgdnq2d.js | R 5.3 ms (31.4%)<br>(anonymous) 2.4 ms (14.5%)<br>(program) 1.8 ms (10.7%)<br>lu 1.3 ms (7.6%)<br>(anonymous) 1.0 ms (5.9%) | — |
| 9 | 3539.9 ms | 62.0 ms | 9.9 ms | loose | 12.0 ms | 3.6% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3601.9 ms | 83.0 ms | not matched | — | 33.0 ms | 9.8% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 11 | 3684.9 ms | 77.0 ms | not matched | — | 27.0 ms | 8.0% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 12 | 4100.1 ms | 129.0 ms | 32.3 ms | exact | 79.0 ms | 23.5% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 18.3 ms (57.2%)<br>I 8.3 ms (26.1%) | — |

## Task details

### Task 1 — 759.3 ms simulated

- URL: `Unattributable`
- Simulated: 60.0 ms; observed: 15.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 819.3 ms simulated

- URL: `Unattributable`
- Simulated: 109.0 ms; observed: 27.3 ms; match: exact
- `(program)` — 21.5 ms (97.5%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 928.3 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 72.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 1033.3 ms simulated

- URL: `Unattributable`
- Simulated: 62.0 ms; observed: 15.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 1095.3 ms simulated

- URL: `http://127.0.0.1:PORT/`
- Simulated: 83.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 2285.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 189.0 ms; observed: 47.2 ms; match: exact
- `I` — 26.7 ms (56.5%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 7.8 ms (16.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 7 — 2490.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 51.0 ms; observed: 12.7 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 2582.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 68.0 ms; observed: 16.9 ms; match: exact
- `R` — 5.3 ms (31.4%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
- `(anonymous)` — 2.4 ms (14.5%), chunk `1y7jwsdsad7nj.js`, module `_next/static/chunks/1y7jwsdsad7nj.js`, lineNumber 0, columnNumber 45830
  - self: `(anonymous)` at `1y7jwsdsad7nj.js` lineNumber 0, columnNumber 45830 — `(e,t,n,r,l,o){let a,i,s,u,d=(a=[],e.layers.forEach(e=>{var t,r;let l=n.layers.findIndex(t=>t.id===e.id),o=n.layers[l],i=`
  - parent: `(anonymous)` at `1y7jwsdsad7nj.js` lineNumber 0, columnNumber 43035 — `({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.layers.map(e=>({...e,corners:e`
  - grandparent: `(anonymous)` at `1y7jwsdsad7nj.js` lineNumber 0, columnNumber 43009 — `()=>null===b?null:function({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.laye`
- `(program)` — 1.8 ms (10.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `lu` — 1.3 ms (7.6%), chunk `1d5kkip1hlg-o.js`, module `_next/static/chunks/1d5kkip1hlg-o.js`, lineNumber 7, columnNumber 95301
  - self: `lu` at `1d5kkip1hlg-o.js` lineNumber 7, columnNumber 95301 — `(){if(4===sB||3===sB){sB=0;var e=sZ;sZ=null,oj();var t=sW,n=sq,r=sG,l=sX,a=(0x13ffff00&r)===r?10262:10256;if((n.subtreeF`
  - parent: `(anonymous)` at `1d5kkip1hlg-o.js` lineNumber 7, columnNumber 92952 — `(e,t,n,r,l,a,i){var o,u=t.lanes|t.childLanes;if(sY=u,function(e,t,n,r,l,a){var i=e.pendingLanes;e.pendingLanes=n,e.suspe`
  - grandparent: `lr` at `1d5kkip1hlg-o.js` lineNumber 7, columnNumber 92736 — `(e,t,n,l,a,i,o,u,s,c,f,d){e.cancelPendingCommit=null;do lc();while(0!==sB)if((6&sw)!=0)throw Error(r(327));if(null!==t){`
- `(anonymous)` — 1.0 ms (5.9%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 8, columnNumber 89608
  - self: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
  - parent: `renderBufferDirect` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89509 — `(e,i,r,a,n,s){let o;null===i&&(i=e9);let l=n.isMesh&&0>n.matrixWorld.determinantAffine(),c=function(e,i,r,a,n){!0!==i.is`
  - grandparent: `tv` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 101438 — `(e,i,r,a,n,s){null!==eI&&n.isNodeMaterial&&eI.setObject(e,n),e.onBeforeRender(eU,i,r,a,n,s),e.modelViewMatrix.multiplyMa`

### Task 9 — 3539.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 62.0 ms; observed: 9.9 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3601.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 83.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 11 — 3684.9 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 77.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 12 — 4100.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 129.0 ms; observed: 32.3 ms; match: exact
- `(program)` — 18.3 ms (57.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 8.3 ms (26.1%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`

## Lantern check

Simulated TBT: 336.5 ms
Observed Σ max(0, 4 × duration − 50): 702.5 ms
Difference: 366.0 ms (108.8%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 759.3 ms | 18.1 ms | -741.2 ms | 60.0 ms | 15.1 ms | 60.3 ms |
| Unattributable | 819.3 ms | 33.2 ms | -786.1 ms | 109.0 ms | 27.3 ms | 109.1 ms |
| Unattributable | 1033.3 ms | 485.2 ms | -548.0 ms | 62.0 ms | 15.5 ms | 62.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2285.6 ms | 137.6 ms | -2147.9 ms | 189.0 ms | 47.2 ms | 188.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2490.6 ms | 382.5 ms | -2108.1 ms | 51.0 ms | 12.7 ms | 50.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2582.6 ms | 590.5 ms | -1992.0 ms | 68.0 ms | 16.9 ms | 67.5 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3539.9 ms | 400.7 ms | -3139.1 ms | 62.0 ms | 9.9 ms | 39.7 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4100.1 ms | 292.3 ms | -3807.8 ms | 129.0 ms | 32.3 ms | 129.2 ms |
