# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (320 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 759.7 ms | 98.0 ms | 24.5 ms | exact | 48.0 ms | 9.3% | Unattributable | (native) | — | (program) 17.5 ms (96.4%) | — |
| 2 | 858.7 ms | 73.0 ms | not matched | — | 23.0 ms | 4.4% | http://127.0.0.1:4320/projects/websocket-inspector | — | — | — | — |
| 3 | 931.7 ms | 62.0 ms | 15.5 ms | exact | 12.0 ms | 2.3% | Unattributable | — | — | — | — |
| 4 | 993.7 ms | 73.0 ms | not matched | — | 23.0 ms | 4.4% | http://127.0.0.1:4320/projects/websocket-inspector | — | — | — | — |
| 5 | 2215.3 ms | 184.0 ms | 46.0 ms | exact | 134.0 ms | 25.9% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 23.4 ms (51.2%)<br>(program) 9.3 ms (20.2%)<br>(anonymous) 2.7 ms (5.9%) | — |
| 6 | 2420.3 ms | 59.0 ms | 14.7 ms | exact | 9.0 ms | 1.7% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 7 | 2523.3 ms | 164.0 ms | 40.9 ms | exact | 114.0 ms | 22.0% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3vwpvuyn90046.js | _next/static/chunks/3vwpvuyn90046.js | (garbage collector) 9.8 ms (24.0%)<br>G 7.2 ms (17.6%)<br>Y 4.9 ms (11.9%)<br>R 3.7 ms (9.0%)<br>O 2.6 ms (6.5%)<br>(anonymous) 2.6 ms (6.4%)<br>N 2.4 ms (6.0%) | — |
| 8 | 3328.0 ms | 156.0 ms | 36.6 ms | exact | 106.0 ms | 20.5% | http://127.0.0.1:4320/_next/static/chunks/3vwpvuyn90046.js | (native) | — | (program) 26.8 ms (73.3%)<br>(anonymous) 2.7 ms (7.4%) | — |
| 9 | 3766.0 ms | 65.0 ms | 11.0 ms | loose | 15.0 ms | 2.9% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3878.0 ms | 60.0 ms | 11.8 ms | exact | 10.0 ms | 1.9% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 11 | 3938.0 ms | 64.0 ms | not matched | — | 14.0 ms | 2.7% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 12 | 4180.6 ms | 132.0 ms | 33.0 ms | exact | 82.0 ms | 15.8% | http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 13.7 ms (51.4%)<br>I 9.5 ms (35.6%) | — |

## Task details

### Task 1 — 759.7 ms simulated

- URL: `Unattributable`
- Simulated: 98.0 ms; observed: 24.5 ms; match: exact
- `(program)` — 17.5 ms (96.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 2 — 858.7 ms simulated

- URL: `http://127.0.0.1:4320/projects/websocket-inspector`
- Simulated: 73.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 3 — 931.7 ms simulated

- URL: `Unattributable`
- Simulated: 62.0 ms; observed: 15.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 4 — 993.7 ms simulated

- URL: `http://127.0.0.1:4320/projects/websocket-inspector`
- Simulated: 73.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 5 — 2215.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 184.0 ms; observed: 46.0 ms; match: exact
- `I` — 23.4 ms (51.2%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 9.3 ms (20.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.7 ms (5.9%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 6 — 2420.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 59.0 ms; observed: 14.7 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 7 — 2523.3 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 164.0 ms; observed: 40.9 ms; match: exact
- `(garbage collector)` — 9.8 ms (24.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(garbage collector)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `G` — 7.2 ms (17.6%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6313
  - self: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - grandparent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
- `Y` — 4.9 ms (11.9%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5665
  - self: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
- `R` — 3.7 ms (9.0%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
- `O` — 2.6 ms (6.5%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5622
  - self: `O` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5622 — `(e,t){return e[0]*t[0]+e[1]*t[1]}function Y(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l`
  - parent: `N` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5831 — `(e,t){let n=1/0,r=-1/0;for(let l of e){let e=O(t,l);n=Math.min(n,e),r=Math.max(r,e)}return[n,r]}function W(e,t){if(0===t`
  - grandparent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
- `(anonymous)` — 2.6 ms (6.4%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 45004
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 45004 — `(e,t,n,r,l,o){let a,i,s,u,d=(a=[],e.layers.forEach(e=>{var t,r;let l=n.layers.findIndex(t=>t.id===e.id),o=n.layers[l],i=`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42206 — `({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.layers.map(e=>({...e,corners:e`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42180 — `()=>null===b?null:function({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.laye`
- `N` — 2.4 ms (6.0%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5831
  - self: `N` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5831 — `(e,t){let n=1/0,r=-1/0;for(let l of e){let e=O(t,l);n=Math.min(n,e),r=Math.max(r,e)}return[n,r]}function W(e,t){if(0===t`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`

### Task 8 — 3328.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/3vwpvuyn90046.js`
- Simulated: 156.0 ms; observed: 36.6 ms; match: exact
- `(program)` — 26.8 ms (73.3%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.7 ms (7.4%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 23489
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 23489 — `({layout:e,project:t,palette:l,tokens:o,look:a,bridgeRef:i,target:s,phase:u,tourStatus:d,focus:c,highlight:f,wrapperRef:`
  - parent: `ax` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 74320 — `(e,t,n,r,l,a){return af=a,ad=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,K.H=null===e||null===e.memoizedState?oz`
  - grandparent: `oY` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 92372 — `(e,t,n,r,l){n=n.render;var a=t.ref;if("ref"in r){var o={};for(var i in r)"ref"!==i&&(o[i]=r[i])}else o=r;return(li(t),r=`

### Task 9 — 3766.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 65.0 ms; observed: 11.0 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3878.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 60.0 ms; observed: 11.8 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 11 — 3938.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 64.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 12 — 4180.6 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 132.0 ms; observed: 33.0 ms; match: exact
- `(program)` — 13.7 ms (51.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 9.5 ms (35.6%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`

## Lantern check

Simulated TBT: 518.0 ms
Observed Σ max(0, 4 × duration − 50): 860.4 ms
Difference: 342.4 ms (66.1%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 759.7 ms | 26.6 ms | -733.1 ms | 98.0 ms | 24.5 ms | 98.0 ms |
| Unattributable | 931.7 ms | 517.2 ms | -414.4 ms | 62.0 ms | 15.5 ms | 62.2 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2215.3 ms | 129.4 ms | -2085.9 ms | 184.0 ms | 46.0 ms | 184.0 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2420.3 ms | 413.1 ms | -2007.2 ms | 59.0 ms | 14.7 ms | 58.9 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2523.3 ms | 604.7 ms | -1918.7 ms | 164.0 ms | 40.9 ms | 163.7 ms |
| http://127.0.0.1:4320/_next/static/chunks/3vwpvuyn90046.js | 3328.0 ms | 645.6 ms | -2682.4 ms | 156.0 ms | 36.6 ms | 146.2 ms |
| http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | 3766.0 ms | 506.2 ms | -3259.8 ms | 65.0 ms | 11.0 ms | 44.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3878.0 ms | 438.7 ms | -3439.3 ms | 60.0 ms | 11.8 ms | 47.3 ms |
| http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | 4180.6 ms | 286.0 ms | -3894.7 ms | 132.0 ms | 33.0 ms | 131.9 ms |
