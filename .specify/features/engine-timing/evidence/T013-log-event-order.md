# orchestrator re-run (G5 review): event-log.mjs now waits for each scripted motion's own xploder:settled and checks phase + count per motion (the executor's run waited on data-xploder-state only, so the turn was not awaited and its settle was not attributed); product code unchanged | commit: c3f3e25
# command: node event-log.mjs <repo> <baseUrl> | base: http://127.0.0.1:4619 | chromium: 156.0.8078.4 | cpu: 1 | commit: c3f3e25
# signals: events + clock + attributes (S15)
# events: present (S15)

| path | type | detail | at ms |
|---|---|---|---:|
| / | ready | {} | 195.7 |
| / | settled | {"phase":"imploded","at":0.1815} | 195.7 |
| / | settled | {"phase":"exploded","at":3.5934000000059605} | 3594.6 |
| / | settled | {"phase":"zoomed","at":7.60959999999404} | 7610.3 |
| / | tour-ended | {"flowId":"capture-path"} | 20552.9 |
| / | tour-ended | {"flowId":"inspect-path"} | 33358.2 |
| / | settled | {"phase":"zoomed","at":35.5745} | 35575.7 |
| / | settled | {"phase":"turned","at":37.17540000000596} | 37176.1 |
| / | settled | {"phase":"turned","at":38.77330000001192} | 38774.3 |
| /projects/websocket-inspector | ready | {} | 192.5 |
| /projects/websocket-inspector | settled | {"phase":"exploded","at":0.18759999999403953} | 192.5 |
| /projects/websocket-inspector | settled | {"phase":"imploded","at":1.0861999999880791} | 1090 |
| /projects/websocket-inspector | settled | {"phase":"exploded","at":2.7025999999940393} | 2703.3 |
| /projects/websocket-inspector | settled | {"phase":"zoomed","at":3.1363999999761583} | 3137.5 |
| /projects/websocket-inspector | settled | {"phase":"turned","at":4.169199999988079} | 4170.4 |
| /projects/websocket-inspector | tour-ended | {"flowId":"capture-path"} | 15892.9 |
| /projects/jev-toolkit | ready | {} | 150.1 |
| /projects/jev-toolkit | settled | {"phase":"exploded","at":0.144} | 150.2 |
| /projects/jev-toolkit | settled | {"phase":"imploded","at":1.0605} | 1065 |
| /projects/jev-toolkit | settled | {"phase":"exploded","at":2.6770999999940397} | 2678.2 |
| /projects/jev-toolkit | settled | {"phase":"zoomed","at":3.111} | 3113.1 |
| /projects/jev-toolkit | settled | {"phase":"turned","at":4.14390000000596} | 4144.6 |
| /projects/jev-toolkit | tour-ended | {"flowId":"arm-run"} | 17467.5 |

| path | ready | settled | tour-ended | ready first |
|---|---:|---:|---:|---|
| / | 1 | 6 | 2 | yes |
| /projects/websocket-inspector | 1 | 5 | 1 | yes |
| /projects/jev-toolkit | 1 | 5 | 1 | yes |

| path | scripted motion | settled events | phase | expected phase | verdict |
|---|---|---:|---|---|---|
| /projects/websocket-inspector | toggle-1 | 1 | imploded | imploded | ONCE |
| /projects/websocket-inspector | toggle-2 | 1 | exploded | exploded | ONCE |
| /projects/websocket-inspector | zoom-in | 1 | zoomed | zoomed | ONCE |
| /projects/websocket-inspector | turn-right | 1 | turned | turned | ONCE |
| /projects/jev-toolkit | toggle-1 | 1 | imploded | imploded | ONCE |
| /projects/jev-toolkit | toggle-2 | 1 | exploded | exploded | ONCE |
| /projects/jev-toolkit | zoom-in | 1 | zoomed | zoomed | ONCE |
| /projects/jev-toolkit | turn-right | 1 | turned | turned | ONCE |
ORDER PASS
SUMMARY_JSON {"counts":[{"path":"/","ready":1,"settled":6,"tourEnded":2,"orderReadyFirst":true},{"path":"/projects/websocket-inspector","ready":1,"settled":5,"tourEnded":1,"orderReadyFirst":true},{"path":"/projects/jev-toolkit","ready":1,"settled":5,"tourEnded":1,"orderReadyFirst":true}],"motionChecks":[{"path":"/projects/websocket-inspector","motion":"toggle-1","expectedPhase":"imploded","settles":1,"phase":"imploded"},{"path":"/projects/websocket-inspector","motion":"toggle-2","expectedPhase":"exploded","settles":1,"phase":"exploded"},{"path":"/projects/websocket-inspector","motion":"zoom-in","expectedPhase":"zoomed","settles":1,"phase":"zoomed"},{"path":"/projects/websocket-inspector","motion":"turn-right","expectedPhase":"turned","settles":1,"phase":"turned"},{"path":"/projects/jev-toolkit","motion":"toggle-1","expectedPhase":"imploded","settles":1,"phase":"imploded"},{"path":"/projects/jev-toolkit","motion":"toggle-2","expectedPhase":"exploded","settles":1,"phase":"exploded"},{"path":"/projects/jev-toolkit","motion":"zoom-in","expectedPhase":"zoomed","settles":1,"phase":"zoomed"},{"path":"/projects/jev-toolkit","motion":"turn-right","expectedPhase":"turned","settles":1,"phase":"turned"}],"orderPass":true}
