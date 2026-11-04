# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/
Route: /
Source: lighthouse-profile (282 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.9 ms | 63.0 ms | 15.8 ms | exact | 13.0 ms | 4.3% | Unattributable | — | — | — | — |
| 2 | 818.9 ms | 83.0 ms | not matched | — | 33.0 ms | 11.0% | http://127.0.0.1:4320/ | — | — | — | — |
| 3 | 931.9 ms | 62.0 ms | 15.4 ms | exact | 12.0 ms | 4.0% | Unattributable | — | — | — | — |
| 4 | 2170.9 ms | 159.0 ms | 39.8 ms | exact | 109.0 ms | 36.2% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 19.2 ms (48.4%)<br>(program) 10.0 ms (25.2%) | — |
| 5 | 2343.9 ms | 56.0 ms | 13.9 ms | exact | 6.0 ms | 2.0% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 6 | 2399.9 ms | 156.0 ms | 39.0 ms | exact | 106.0 ms | 35.2% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3vwpvuyn90046.js | _next/static/chunks/3vwpvuyn90046.js | G 6.7 ms (17.1%)<br>(garbage collector) 6.3 ms (16.1%)<br>O 6.2 ms (16.0%)<br>R 3.8 ms (9.8%)<br>(anonymous) 3.7 ms (9.6%) | — |
| 7 | 3389.8 ms | 64.0 ms | 9.7 ms | loose | 14.0 ms | 4.7% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 8 | 3453.8 ms | 57.0 ms | 9.1 ms | loose | 7.0 ms | 2.3% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 9 | 3510.8 ms | 59.0 ms | 7.5 ms | loose | 9.0 ms | 3.0% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3982.6 ms | 126.0 ms | 31.5 ms | exact | 76.0 ms | 25.2% | http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 13.0 ms (54.8%)<br>I 8.1 ms (34.3%)<br>(anonymous) 1.5 ms (6.1%) | — |

## Task details

### Task 1 — 754.9 ms simulated

- URL: `Unattributable`
- Simulated: 63.0 ms; observed: 15.8 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 818.9 ms simulated

- URL: `http://127.0.0.1:4320/`
- Simulated: 83.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 931.9 ms simulated

- URL: `Unattributable`
- Simulated: 62.0 ms; observed: 15.4 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 2170.9 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 159.0 ms; observed: 39.8 ms; match: exact
- `I` — 19.2 ms (48.4%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 10.0 ms (25.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 5 — 2343.9 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 56.0 ms; observed: 13.9 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 6 — 2399.9 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 156.0 ms; observed: 39.0 ms; match: exact
- `G` — 6.7 ms (17.1%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6313
  - self: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - grandparent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
- `(garbage collector)` — 6.3 ms (16.1%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(garbage collector)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `O` — 6.2 ms (16.0%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5622
  - self: `O` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5622 — `(e,t){return e[0]*t[0]+e[1]*t[1]}function Y(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l`
  - parent: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - grandparent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
- `R` — 3.8 ms (9.8%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
- `(anonymous)` — 3.7 ms (9.6%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 7348
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - parent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
  - grandparent: `U` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7626 — `(e,t,n,r,l){let o=q(e,e.text,F(e.text,l.annotation),t,n,r,l.annotation.gapPx).map(e=>({placement:e,fellBack:!1}));return`

### Task 7 — 3389.8 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 64.0 ms; observed: 9.7 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 8 — 3453.8 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 57.0 ms; observed: 9.1 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 9 — 3510.8 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 59.0 ms; observed: 7.5 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3982.6 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 126.0 ms; observed: 31.5 ms; match: exact
- `(program)` — 13.0 ms (54.8%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 8.1 ms (34.3%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`
- `(anonymous)` — 1.5 ms (6.1%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 0, columnNumber 25010
  - self: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 0, columnNumber 25010 — `(){let e=new ArrayBuffer(4),t=new Float32Array(e),i=new Uint32Array(e),r=new Uint32Array(512),a=new Uint32Array(512);for`
  - parent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 0, columnNumber 24962 — `e=>{var t=e.i(84806),i=e.i(11162);let r=function(){let e=new ArrayBuffer(4),t=new Float32Array(e),i=new Uint32Array(e),r`
  - grandparent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`

## Lantern check

Simulated TBT: 301.0 ms
Observed Σ max(0, 4 × duration − 50): 549.1 ms
Difference: 248.1 ms (82.4%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.9 ms | 16.9 ms | -738.0 ms | 63.0 ms | 15.8 ms | 63.2 ms |
| Unattributable | 931.9 ms | 440.7 ms | -491.2 ms | 62.0 ms | 15.4 ms | 61.5 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2170.9 ms | 109.9 ms | -2061.0 ms | 159.0 ms | 39.8 ms | 159.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2343.9 ms | 341.6 ms | -2002.3 ms | 56.0 ms | 13.9 ms | 55.8 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2399.9 ms | 523.8 ms | -1876.1 ms | 156.0 ms | 39.0 ms | 156.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | 3389.8 ms | 431.0 ms | -2958.9 ms | 64.0 ms | 9.7 ms | 39.0 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3453.8 ms | 162.7 ms | -3291.1 ms | 57.0 ms | 9.1 ms | 36.5 ms |
| http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | 3510.8 ms | 360.9 ms | -3149.9 ms | 59.0 ms | 7.5 ms | 29.9 ms |
| http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | 3982.6 ms | 255.2 ms | -3727.4 ms | 126.0 ms | 31.5 ms | 126.0 ms |
