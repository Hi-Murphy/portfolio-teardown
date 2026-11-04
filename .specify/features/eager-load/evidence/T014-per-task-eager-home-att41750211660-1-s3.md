# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/
Route: /
Source: lighthouse-profile (275 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 753.6 ms | 69.0 ms | 17.2 ms | exact | 19.0 ms | 6.6% | Unattributable | (native) | — | (program) 10.8 ms (96.0%) | — |
| 2 | 823.6 ms | 73.0 ms | 9.8 ms | loose | 23.0 ms | 8.0% | http://127.0.0.1:4320/ | — | — | — | — |
| 3 | 896.6 ms | 64.0 ms | 16.1 ms | exact | 14.0 ms | 4.9% | Unattributable | — | — | — | — |
| 4 | 960.6 ms | 51.0 ms | not matched | — | 1.0 ms | 0.3% | http://127.0.0.1:4320/ | — | — | — | — |
| 5 | 2176.3 ms | 161.0 ms | 40.3 ms | exact | 111.0 ms | 38.6% | http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 22.5 ms (56.2%)<br>(program) 6.4 ms (16.0%)<br>(anonymous) 2.4 ms (6.0%) | — |
| 6 | 2351.3 ms | 53.0 ms | 13.3 ms | exact | 3.0 ms | 1.0% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 7 | 2404.3 ms | 53.0 ms | 13.4 ms | exact | 3.0 ms | 1.0% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 2457.3 ms | 161.0 ms | 40.3 ms | exact | 111.0 ms | 38.6% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3vwpvuyn90046.js | _next/static/chunks/3vwpvuyn90046.js | (garbage collector) 6.1 ms (15.2%)<br>G 5.7 ms (14.0%)<br>(anonymous) 5.4 ms (13.3%)<br>O 4.7 ms (11.5%)<br>q 4.2 ms (10.3%)<br>R 2.9 ms (7.2%)<br>Y 2.7 ms (6.7%)<br>(program) 2.3 ms (5.8%) | — |
| 9 | 3397.9 ms | 56.0 ms | 7.2 ms | loose | 6.0 ms | 2.1% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3453.9 ms | 54.0 ms | 8.1 ms | loose | 4.0 ms | 1.4% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 11 | 3507.9 ms | 60.0 ms | not matched | — | 10.0 ms | 3.5% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 12 | 3983.6 ms | 120.0 ms | 30.1 ms | exact | 70.0 ms | 24.4% | http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 12.2 ms (54.2%)<br>I 8.4 ms (37.3%) | — |

## Task details

### Task 1 — 753.6 ms simulated

- URL: `Unattributable`
- Simulated: 69.0 ms; observed: 17.2 ms; match: exact
- `(program)` — 10.8 ms (96.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 823.6 ms simulated

- URL: `http://127.0.0.1:4320/`
- Simulated: 73.0 ms; observed: 9.8 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 3 — 896.6 ms simulated

- URL: `Unattributable`
- Simulated: 64.0 ms; observed: 16.1 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 960.6 ms simulated

- URL: `http://127.0.0.1:4320/`
- Simulated: 51.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 2176.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 161.0 ms; observed: 40.3 ms; match: exact
- `I` — 22.5 ms (56.2%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 6.4 ms (16.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.4 ms (6.0%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 6 — 2351.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 53.0 ms; observed: 13.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 7 — 2404.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 53.0 ms; observed: 13.4 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 2457.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 161.0 ms; observed: 40.3 ms; match: exact
- `(garbage collector)` — 6.1 ms (15.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(garbage collector)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `G` — 5.7 ms (14.0%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6313
  - self: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - grandparent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
- `(anonymous)` — 5.4 ms (13.3%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 45004
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 45004 — `(e,t,n,r,l,o){let a,i,s,u,d=(a=[],e.layers.forEach(e=>{var t,r;let l=n.layers.findIndex(t=>t.id===e.id),o=n.layers[l],i=`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42206 — `({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.layers.map(e=>({...e,corners:e`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42180 — `()=>null===b?null:function({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.laye`
- `O` — 4.7 ms (11.5%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5622
  - self: `O` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5622 — `(e,t){return e[0]*t[0]+e[1]*t[1]}function Y(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l`
  - parent: `N` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5831 — `(e,t){let n=1/0,r=-1/0;for(let l of e){let e=O(t,l);n=Math.min(n,e),r=Math.max(r,e)}return[n,r]}function W(e,t){if(0===t`
  - grandparent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
- `q` — 4.2 ms (10.3%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6617
  - self: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
  - parent: `U` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7626 — `(e,t,n,r,l){let o=q(e,e.text,F(e.text,l.annotation),t,n,r,l.annotation.gapPx).map(e=>({placement:e,fellBack:!1}));return`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 8025 — `(e,t,n,r){let l=[],o=[],a=[],i=[];for(let{label:u}of e){var s;if(s=u.anchor,s[0]<0||s[0]>n.width||s[1]<0||s[1]>n.height)`
- `R` — 2.9 ms (7.2%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
- `Y` — 2.7 ms (6.7%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5665
  - self: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
- `(program)` — 2.3 ms (5.8%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 9 — 3397.9 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 56.0 ms; observed: 7.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3453.9 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 54.0 ms; observed: 8.1 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 11 — 3507.9 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 60.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 12 — 3983.6 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 120.0 ms; observed: 30.1 ms; match: exact
- `(program)` — 12.2 ms (54.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 8.4 ms (37.3%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`

## Lantern check

Simulated TBT: 287.4 ms
Observed Σ max(0, 4 × duration − 50): 614.0 ms
Difference: 326.6 ms (113.7%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 753.6 ms | 15.7 ms | -738.0 ms | 69.0 ms | 17.2 ms | 69.0 ms |
| http://127.0.0.1:4320/ | 823.6 ms | 49.7 ms | -773.9 ms | 73.0 ms | 9.8 ms | 39.2 ms |
| Unattributable | 896.6 ms | 434.5 ms | -462.2 ms | 64.0 ms | 16.1 ms | 64.4 ms |
| http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | 2176.3 ms | 114.6 ms | -2061.7 ms | 161.0 ms | 40.3 ms | 161.2 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2351.3 ms | 421.2 ms | -1930.1 ms | 53.0 ms | 13.3 ms | 53.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2404.3 ms | 334.3 ms | -2070.0 ms | 53.0 ms | 13.4 ms | 53.4 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2457.3 ms | 516.2 ms | -1941.1 ms | 161.0 ms | 40.3 ms | 161.3 ms |
| http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | 3397.9 ms | 353.0 ms | -3045.0 ms | 56.0 ms | 7.2 ms | 28.8 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3453.9 ms | 168.2 ms | -3285.8 ms | 54.0 ms | 8.1 ms | 32.5 ms |
| http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | 3983.6 ms | 252.9 ms | -3730.7 ms | 120.0 ms | 30.1 ms | 120.5 ms |
