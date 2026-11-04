# Lighthouse per-task attribution

LHR: http://127.0.0.1:4320/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (315 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 755.5 ms | 57.0 ms | 14.3 ms | exact | 7.0 ms | 1.5% | Unattributable | — | — | — | — |
| 2 | 812.5 ms | 146.0 ms | 36.4 ms | exact | 96.0 ms | 20.3% | Unattributable | (native) | — | (program) 29.8 ms (97.3%) | — |
| 3 | 959.5 ms | 71.0 ms | not matched | — | 21.0 ms | 4.4% | http://127.0.0.1:4320/projects/websocket-inspector | — | — | — | — |
| 4 | 1030.5 ms | 61.0 ms | 15.3 ms | exact | 11.0 ms | 2.3% | Unattributable | — | — | — | — |
| 5 | 1091.5 ms | 68.0 ms | not matched | — | 18.0 ms | 3.8% | http://127.0.0.1:4320/projects/websocket-inspector | — | — | — | — |
| 6 | 2314.0 ms | 153.0 ms | 38.3 ms | exact | 103.0 ms | 21.8% | http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 18.3 ms (47.9%)<br>(program) 4.8 ms (12.4%)<br>(anonymous) 3.3 ms (8.5%) | — |
| 7 | 2467.0 ms | 51.0 ms | 12.7 ms | exact | 1.0 ms | 0.2% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 2537.0 ms | 174.0 ms | 43.6 ms | exact | 124.0 ms | 26.2% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3vwpvuyn90046.js | _next/static/chunks/3vwpvuyn90046.js | G 11.1 ms (25.5%)<br>(anonymous) 6.0 ms (13.8%)<br>(garbage collector) 4.5 ms (10.2%)<br>Y 4.2 ms (9.6%)<br>N 3.1 ms (7.2%)<br>(program) 2.6 ms (5.9%)<br>O 2.3 ms (5.4%) | — |
| 9 | 3442.5 ms | 135.0 ms | 33.9 ms | exact | 85.0 ms | 18.0% | http://127.0.0.1:4320/_next/static/chunks/3vwpvuyn90046.js | (native) | — | (program) 28.0 ms (82.7%)<br>(anonymous) 2.0 ms (6.0%) | — |
| 10 | 3882.5 ms | 58.0 ms | 14.6 ms | exact | 8.0 ms | 1.7% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 11 | 3940.5 ms | 63.0 ms | 10.0 ms | loose | 13.0 ms | 2.7% | http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 12 | 4003.5 ms | 66.0 ms | 9.6 ms | loose | 16.0 ms | 3.4% | http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 13 | 4275.0 ms | 123.0 ms | 30.8 ms | exact | 73.0 ms | 15.4% | http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 12.4 ms (46.3%)<br>I 10.3 ms (38.3%) | — |

## Task details

### Task 1 — 755.5 ms simulated

- URL: `Unattributable`
- Simulated: 57.0 ms; observed: 14.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 812.5 ms simulated

- URL: `Unattributable`
- Simulated: 146.0 ms; observed: 36.4 ms; match: exact
- `(program)` — 29.8 ms (97.3%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 959.5 ms simulated

- URL: `http://127.0.0.1:4320/projects/websocket-inspector`
- Simulated: 71.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 1030.5 ms simulated

- URL: `Unattributable`
- Simulated: 61.0 ms; observed: 15.3 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 1091.5 ms simulated

- URL: `http://127.0.0.1:4320/projects/websocket-inspector`
- Simulated: 68.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 2314.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 153.0 ms; observed: 38.3 ms; match: exact
- `I` — 18.3 ms (47.9%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 4.8 ms (12.4%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 3.3 ms (8.5%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 7 — 2467.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 51.0 ms; observed: 12.7 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 2537.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 174.0 ms; observed: 43.6 ms; match: exact
- `G` — 11.1 ms (25.5%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6313
  - self: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - grandparent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
- `(anonymous)` — 6.0 ms (13.8%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 7369
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7369 — `e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direction,radius:p.radius,`
  - parent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
  - grandparent: `U` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7626 — `(e,t,n,r,l){let o=q(e,e.text,F(e.text,l.annotation),t,n,r,l.annotation.gapPx).map(e=>({placement:e,fellBack:!1}));return`
- `(garbage collector)` — 4.5 ms (10.2%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(garbage collector)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `Y` — 4.2 ms (9.6%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5665
  - self: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
- `N` — 3.1 ms (7.2%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5831
  - self: `N` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5831 — `(e,t){let n=1/0,r=-1/0;for(let l of e){let e=O(t,l);n=Math.min(n,e),r=Math.max(r,e)}return[n,r]}function W(e,t){if(0===t`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
- `(program)` — 2.6 ms (5.9%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `O` — 2.3 ms (5.4%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5622
  - self: `O` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5622 — `(e,t){return e[0]*t[0]+e[1]*t[1]}function Y(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l`
  - parent: `N` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5831 — `(e,t){let n=1/0,r=-1/0;for(let l of e){let e=O(t,l);n=Math.min(n,e),r=Math.max(r,e)}return[n,r]}function W(e,t){if(0===t`
  - grandparent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`

### Task 9 — 3442.5 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/3vwpvuyn90046.js`
- Simulated: 135.0 ms; observed: 33.9 ms; match: exact
- `(program)` — 28.0 ms (82.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.0 ms (6.0%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 23489
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 23489 — `({layout:e,project:t,palette:l,tokens:o,look:a,bridgeRef:i,target:s,phase:u,tourStatus:d,focus:c,highlight:f,wrapperRef:`
  - parent: `ax` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 74320 — `(e,t,n,r,l,a){return af=a,ad=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,K.H=null===e||null===e.memoizedState?oz`
  - grandparent: `oY` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 92372 — `(e,t,n,r,l){n=n.render;var a=t.ref;if("ref"in r){var o={};for(var i in r)"ref"!==i&&(o[i]=r[i])}else o=r;return(li(t),r=`

### Task 10 — 3882.5 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 58.0 ms; observed: 14.6 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 11 — 3940.5 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 63.0 ms; observed: 10.0 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 12 — 4003.5 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 66.0 ms; observed: 9.6 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 13 — 4275.0 ms simulated

- URL: `http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 123.0 ms; observed: 30.8 ms; match: exact
- `(program)` — 12.4 ms (46.3%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 10.3 ms (38.3%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`

## Lantern check

Simulated TBT: 473.0 ms
Observed Σ max(0, 4 × duration − 50): 846.0 ms
Difference: 373.0 ms (78.9%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 755.5 ms | 17.4 ms | -738.1 ms | 57.0 ms | 14.3 ms | 57.2 ms |
| Unattributable | 812.5 ms | 31.7 ms | -780.8 ms | 146.0 ms | 36.4 ms | 145.7 ms |
| Unattributable | 1030.5 ms | 499.5 ms | -531.0 ms | 61.0 ms | 15.3 ms | 61.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/10kujx8nsd3ck.js | 2314.0 ms | 141.9 ms | -2172.2 ms | 153.0 ms | 38.3 ms | 153.1 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2467.0 ms | 394.6 ms | -2072.4 ms | 51.0 ms | 12.7 ms | 50.9 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 2537.0 ms | 590.0 ms | -1947.1 ms | 174.0 ms | 43.6 ms | 174.4 ms |
| http://127.0.0.1:4320/_next/static/chunks/3vwpvuyn90046.js | 3442.5 ms | 633.6 ms | -2809.0 ms | 135.0 ms | 33.9 ms | 135.7 ms |
| http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | 3882.5 ms | 326.6 ms | -3556.0 ms | 58.0 ms | 14.6 ms | 58.4 ms |
| http://127.0.0.1:4320/_next/static/chunks/1kgrt2f4mrm63.js | 3940.5 ms | 489.5 ms | -3451.0 ms | 63.0 ms | 10.0 ms | 39.8 ms |
| http://127.0.0.1:4320/_next/static/chunks/1d5kkip1hlg-o.js | 4003.5 ms | 417.9 ms | -3585.7 ms | 66.0 ms | 9.6 ms | 38.5 ms |
| http://127.0.0.1:4320/_next/static/chunks/3vnmkhfgdnq2d.js | 4275.0 ms | 276.8 ms | -3998.2 ms | 123.0 ms | 30.8 ms | 123.0 ms |
