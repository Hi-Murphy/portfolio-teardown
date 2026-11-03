# Lighthouse per-task attribution

LHR: http://127.0.0.1:PORT/projects/websocket-inspector
Route: /projects/websocket-inspector
Source: lighthouse-profile (305 ProfileChunk events, 4x observed-to-simulated multiplier)

| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | 754.5 ms | 64.0 ms | 15.9 ms | exact | 14.0 ms | 2.4% | Unattributable | — | — | — | — |
| 2 | 818.5 ms | 158.0 ms | 39.4 ms | exact | 108.0 ms | 18.2% | Unattributable | (native) | — | (program) 33.3 ms (97.7%) | — |
| 3 | 977.5 ms | 83.0 ms | not matched | — | 33.0 ms | 5.6% | http://127.0.0.1:PORT/projects/websocket-inspector | — | — | — | — |
| 4 | 1098.5 ms | 63.0 ms | 15.9 ms | exact | 13.0 ms | 2.2% | Unattributable | — | — | — | — |
| 5 | 1161.5 ms | 78.0 ms | not matched | — | 28.0 ms | 4.7% | http://127.0.0.1:PORT/projects/websocket-inspector | — | — | — | — |
| 6 | 2331.1 ms | 174.0 ms | 43.5 ms | exact | 124.0 ms | 20.9% | http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | turbopack-3-ry682tkyiqk.js | _next/static/chunks/turbopack-3-ry682tkyiqk.js | I 21.7 ms (49.9%)<br>(program) 7.2 ms (16.6%)<br>(anonymous) 2.9 ms (6.6%)<br>(anonymous) 2.4 ms (5.4%) | — |
| 7 | 2527.1 ms | 58.0 ms | 14.5 ms | exact | 8.0 ms | 1.3% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 8 | 3431.6 ms | 156.0 ms | 39.0 ms | exact | 106.0 ms | 17.8% | http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js | (native) | — | (program) 27.8 ms (71.3%)<br>(anonymous) 2.7 ms (6.8%) | — |
| 9 | 3868.6 ms | 62.0 ms | 11.2 ms | loose | 12.0 ms | 2.0% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 10 | 3930.6 ms | 85.0 ms | 21.2 ms | exact | 35.0 ms | 5.9% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 1kgrt2f4mrm63.js | _next/static/chunks/1kgrt2f4mrm63.js | (anonymous) 4.2 ms (19.7%)<br>e 3.2 ms (15.2%)<br>ax 2.8 ms (13.2%)<br>iE 1.1 ms (5.3%) | — |
| 11 | 4015.6 ms | 65.0 ms | not matched | — | 15.0 ms | 2.5% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | — | — | — | — |
| 12 | 4080.6 ms | 72.0 ms | not matched | — | 22.0 ms | 3.7% | http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | — | — | — | — |
| 13 | 4152.6 ms | 188.0 ms | 47.0 ms | exact | 138.0 ms | 23.2% | http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3vwpvuyn90046.js | _next/static/chunks/3vwpvuyn90046.js | G 6.9 ms (14.7%)<br>O 6.2 ms (13.3%)<br>Y 6.0 ms (12.7%)<br>R 4.3 ms (9.1%)<br>(garbage collector) 3.8 ms (8.0%)<br>q 3.5 ms (7.5%)<br>(anonymous) 3.4 ms (7.3%)<br>(program) 2.8 ms (5.9%) | — |
| 14 | 4340.6 ms | 135.0 ms | 33.7 ms | exact | 85.0 ms | 14.3% | http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | (native) | — | (program) 13.7 ms (53.0%)<br>I 9.6 ms (37.1%) | — |

## Task details

### Task 1 — 754.5 ms simulated

- URL: `Unattributable`
- Simulated: 64.0 ms; observed: 15.9 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 2 — 818.5 ms simulated

- URL: `Unattributable`
- Simulated: 158.0 ms; observed: 39.4 ms; match: exact
- `(program)` — 33.3 ms (97.7%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 3 — 977.5 ms simulated

- URL: `http://127.0.0.1:PORT/projects/websocket-inspector`
- Simulated: 83.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 4 — 1098.5 ms simulated

- URL: `Unattributable`
- Simulated: 63.0 ms; observed: 15.9 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 5 — 1161.5 ms simulated

- URL: `http://127.0.0.1:PORT/projects/websocket-inspector`
- Simulated: 78.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 6 — 2331.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js`
- Simulated: 174.0 ms; observed: 43.5 ms; match: exact
- `I` — 21.7 ms (49.9%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `u.r` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3629 — `(e){return B(e,this.m).exports},u.f=function(e){function t(t){if(t=v(t),s.call(e,t))return e[t].module();let r=Error(\`Ca`
- `(program)` — 7.2 ms (16.6%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.9 ms (6.6%), chunk `10kujx8nsd3ck.js`, module `_next/static/chunks/10kujx8nsd3ck.js`, lineNumber 1, columnNumber 89736
  - self: `(anonymous)` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89736 — `(e,t,n,r,u,o){switch(r){case 65:eu(e,n,ed(u,o).buffer);return;case 79:eh(e,n,u,o,Int8Array,1);return;case 111:eu(e,n,0==`
  - parent: `t` at `10kujx8nsd3ck.js` lineNumber 1, columnNumber 89073 — `(i){var c=i.value;if(i.done)return n();var s=0,d=u._rowState;i=u._rowID;for(var p=u._rowTag,y=u._rowLength,g=u._buffer,v`
  - grandparent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.4 ms (5.4%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 20127
  - self: `(anonymous)` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 20127 — `(e,t,n)=>{var r,l=e.i(29942),a=e.r(77816),o=e.r(50619),i=e.r(44559);function u(e){var t="https://react.dev/errors/"+e;if`
  - parent: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - grandparent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`

### Task 7 — 2527.1 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 58.0 ms; observed: 14.5 ms; match: exact
- Top functions: none ≥ 5% self time

### Task 8 — 3431.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js`
- Simulated: 156.0 ms; observed: 39.0 ms; match: exact
- `(program)` — 27.8 ms (71.3%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `(anonymous)` — 2.7 ms (6.8%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 23489
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 23489 — `({layout:e,project:t,palette:l,tokens:o,look:a,bridgeRef:i,target:s,phase:u,tourStatus:d,focus:c,highlight:f,wrapperRef:`
  - parent: `ax` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 74320 — `(e,t,n,r,l,a){return af=a,ad=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,K.H=null===e||null===e.memoizedState?oz`
  - grandparent: `oY` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 92372 — `(e,t,n,r,l){n=n.render;var a=t.ref;if("ref"in r){var o={};for(var i in r)"ref"!==i&&(o[i]=r[i])}else o=r;return(li(t),r=`

### Task 9 — 3868.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 62.0 ms; observed: 11.2 ms; match: loose
- Top functions: none ≥ 5% self time

### Task 10 — 3930.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 85.0 ms; observed: 21.2 ms; match: exact
- `(anonymous)` — 4.2 ms (19.7%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 48, columnNumber 19651
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 48, columnNumber 19651 — `(e="u"<typeof document?void 0:document){if(void 0!==t)return t;if(void 0===e)return!1;try{let n=e.createElement("canvas"`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 48, columnNumber 19638 — `()=>(function(e="u"<typeof document?void 0:document){if(void 0!==t)return t;if(void 0===e)return!1;try{let n=e.createEle`
  - grandparent: `aq` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 79283 — `(e){var t=aO();return"function"==typeof e&&(e=e()),t.memoizedState=t.baseState=e,t.queue={pending:null,lanes:0,dispatch:`
- `e` — 3.2 ms (15.2%), chunk `1d5kkip1hlg-o.js`, module `_next/static/chunks/1d5kkip1hlg-o.js`, lineNumber 11, columnNumber 30170
  - self: `e` at `1d5kkip1hlg-o.js` lineNumber 11, columnNumber 30170 — `(t){let n=[];if(!t||t===document.body)return n;let{overflow:r,overflowX:l,overflowY:a}=window.getComputedStyle(t);return`
  - parent: `(anonymous)` at `1d5kkip1hlg-o.js` lineNumber 11, columnNumber 30078 — `e=>{e&&e!==c.current.element&&(b(),c.current.element=e,c.current.scrollContainers=function e(t){let n=[];if(!t||t===docu`
  - grandparent: `iN` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 114285 — `(e,t){try{var n=e.ref;if(null!==n){switch(e.tag){case 26:case 27:case 5:var r=e.stateNode;break;case 30:var l=e.stateNod`
- `ax` — 2.8 ms (13.2%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 74320
  - self: `ax` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 74320 — `(e,t,n,r,l,a){return af=a,ad=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,K.H=null===e||null===e.memoizedState?oz`
  - parent: `oY` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 92372 — `(e,t,n,r,l){n=n.render;var a=t.ref;if("ref"in r){var o={};for(var i in r)"ref"!==i&&(o[i]=r[i])}else o=r;return(li(t),r=`
  - grandparent: `ih` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 104145 — `(e,t,n){if(null!==e)if(e.memoizedProps!==t.pendingProps)oq=!0;else{if(!im(e,n)&&0==(128&t.flags))return oq=!1,function(e`
- `iE` — 1.1 ms (5.3%), chunk `1kgrt2f4mrm63.js`, module `_next/static/chunks/1kgrt2f4mrm63.js`, lineNumber 0, columnNumber 113573
  - self: `iE` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 113573 — `(e,t){try{var n=t.updateQueue,r=null!==n?n.lastEffect:null;if(null!==r){var l=r.next;n=l;do{if((n.tag&e)===e){r=void 0;v`
  - parent: `un` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 124264 — `(e,t,n){var r=n.flags;switch(n.tag){case 0:case 11:case 15:uv(e,n),4&r&&iE(5,n);break;case 1:if(uv(e,n),4&r)if(e=n.state`
  - grandparent: `uv` at `1kgrt2f4mrm63.js` lineNumber 0, columnNumber 137887 — `(e,t){if(8772&t.subtreeFlags)for(t=t.child;null!==t;)un(e,t.alternate,t),t=t.sibling}function uy(e,t){var n=null;null!==`

### Task 11 — 4015.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 65.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 12 — 4080.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js`
- Simulated: 72.0 ms; observed: not matched; match: —
- Top functions: none ≥ 5% self time

### Task 13 — 4152.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js`
- Simulated: 188.0 ms; observed: 47.0 ms; match: exact
- `G` — 6.9 ms (14.7%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6313
  - self: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
  - grandparent: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
- `O` — 6.2 ms (13.3%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5622
  - self: `O` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5622 — `(e,t){return e[0]*t[0]+e[1]*t[1]}function Y(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l`
  - parent: `N` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5831 — `(e,t){let n=1/0,r=-1/0;for(let l of e){let e=O(t,l);n=Math.min(n,e),r=Math.max(r,e)}return[n,r]}function W(e,t){if(0===t`
  - grandparent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
- `Y` — 6.0 ms (12.7%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 5665
  - self: `Y` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 5665 — `(e,t){let n=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],r=1/0,l=-1/0;for(let e of n){let n=O(t,e);r=Math.m`
  - parent: `G` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6313 — `(e,t){if(0===t.length)return!1;let n=[[1,0],[0,1]];for(let e=0;e<t.length;e+=1){let r=t[e],l=t[(e+1)%t.length];if(void 0`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7348 — `e=>G(f,e)))&&(l.some(e=>H(f,e))||i.push({key:e.key,kind:e.kind,anchor:r,text:t,x:p.x,y:p.y,w:p.w,h:p.h,direction:p.direc`
- `R` — 4.3 ms (9.1%), chunk `3vnmkhfgdnq2d.js`, module `_next/static/chunks/3vnmkhfgdnq2d.js`, lineNumber 7054, columnNumber 937
  - self: `R` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 937 — `(t){if(e.debug.checkShaderErrors){let i=u.getProgramInfoLog(E)||"",r=u.getShaderInfoLog(w)||"",a=u.getShaderInfoLog(A)||`
  - parent: `getUniforms` at `3vnmkhfgdnq2d.js` lineNumber 7054, columnNumber 2263 — `(){return void 0===c&&R(this),c},this.getAttributes=function(){return void 0===h&&R(this),h};let C=!1===r.rendererExtens`
  - grandparent: `(anonymous)` at `3vnmkhfgdnq2d.js` lineNumber 8, columnNumber 89608 — `(e,i,r,a,n){!0!==i.isScene&&(i=e9),j.resetTextureUnits();let s=i.fog,o=a.isMeshStandardMaterial||a.isMeshLambertMaterial`
- `(garbage collector)` — 3.8 ms (8.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(garbage collector)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `q` — 3.5 ms (7.5%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 6617
  - self: `q` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 6617 — `(e,t,n,r,l,o,a){let i=[],s=new Set(e.excludeObstacles??[]),u=r.filter((e,t)=>!s.has(t));for(let r of[e.anchor,...e.ancho`
  - parent: `U` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 7626 — `(e,t,n,r,l){let o=q(e,e.text,F(e.text,l.annotation),t,n,r,l.annotation.gapPx).map(e=>({placement:e,fellBack:!1}));return`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 8025 — `(e,t,n,r){let l=[],o=[],a=[],i=[];for(let{label:u}of e){var s;if(s=u.anchor,s[0]<0||s[0]>n.width||s[1]<0||s[1]>n.height)`
- `(anonymous)` — 3.4 ms (7.3%), chunk `3vwpvuyn90046.js`, module `_next/static/chunks/3vwpvuyn90046.js`, lineNumber 0, columnNumber 45004
  - self: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 45004 — `(e,t,n,r,l,o){let a,i,s,u,d=(a=[],e.layers.forEach(e=>{var t,r;let l=n.layers.findIndex(t=>t.id===e.id),o=n.layers[l],i=`
  - parent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42206 — `({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.layers.map(e=>({...e,corners:e`
  - grandparent: `(anonymous)` at `3vwpvuyn90046.js` lineNumber 0, columnNumber 42180 — `()=>null===b?null:function({frame:e,layout:t,project:n,viewport:r,offsetY:l,target:o,look:a}){let i=(u=-l,{layers:e.laye`
- `(program)` — 2.8 ms (5.9%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable

### Task 14 — 4340.6 ms simulated

- URL: `http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js`
- Simulated: 135.0 ms; observed: 33.7 ms; match: exact
- `(program)` — 13.7 ms (53.0%), chunk `(native)`, module `—`, lineNumber —, columnNumber —
  - self: `(program)` at `(native)` lineNumber —, columnNumber — — source unavailable
  - parent: `(root)` at `(native)` lineNumber —, columnNumber — — source unavailable
- `I` — 9.6 ms (37.1%), chunk `turbopack-3-ry682tkyiqk.js`, module `_next/static/chunks/turbopack-3-ry682tkyiqk.js`, lineNumber 0, columnNumber 6194
  - self: `I` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6194 — `(e,t,r){let n=P.get(e);if("function"!=typeof n)throw Error(function(e,t,r){let n;switch(t){case 0:n=\`as a runtime entry`
  - parent: `B` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 6094 — `(e,t)=>{let r=L.get(e);if(r){if(r.error)throw r.error;return r}return I(e,o.Parent,t.id)};function I(e,t,r){let n=P.get(`
  - grandparent: `w` at `turbopack-3-ry682tkyiqk.js` lineNumber 0, columnNumber 3130 — `(e){let t=B(e,this.m);if(t.namespaceObject)return t.namespaceObject;let r=t.exports;return t.namespaceObject=O(r,"functi`

## Lantern check

Simulated TBT: 594.0 ms
Observed Σ max(0, 4 × duration − 50): 979.9 ms
Difference: 385.9 ms (65.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.5 ms | 18.2 ms | -736.3 ms | 64.0 ms | 15.9 ms | 63.6 ms |
| Unattributable | 818.5 ms | 34.1 ms | -784.4 ms | 158.0 ms | 39.4 ms | 157.7 ms |
| Unattributable | 1098.5 ms | 537.0 ms | -561.6 ms | 63.0 ms | 15.9 ms | 63.5 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2331.1 ms | 157.1 ms | -2174.0 ms | 174.0 ms | 43.5 ms | 173.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2527.1 ms | 430.8 ms | -2096.3 ms | 58.0 ms | 14.5 ms | 58.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js | 3431.6 ms | 679.5 ms | -2752.1 ms | 156.0 ms | 39.0 ms | 156.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3868.6 ms | 525.8 ms | -3342.8 ms | 62.0 ms | 11.2 ms | 44.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3930.6 ms | 450.9 ms | -3479.7 ms | 85.0 ms | 21.2 ms | 84.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 4152.6 ms | 632.4 ms | -3520.1 ms | 188.0 ms | 47.0 ms | 188.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4340.6 ms | 304.4 ms | -4036.1 ms | 135.0 ms | 33.7 ms | 134.7 ms |
