# command: node event-log.mjs <repo> <baseUrl> | base: http://127.0.0.1:4616 | chromium: 156.0.8078.4 | cpu: 1 | commit: 165937b
# signals: events + clock + attributes (S15)
# events: present (S15)

| path | type | detail | at ms |
|---|---|---|---:|
| / | ready | {} | 192.8 |
| / | settled | {"phase":"imploded","at":0.17930000001192092} | 192.8 |
| / | settled | {"phase":"exploded","at":3.5925} | 3593.4 |
| / | settled | {"phase":"zoomed","at":7.609099999994039} | 7609.7 |
| / | tour-ended | {"flowId":"capture-path"} | 20550.5 |
| / | tour-ended | {"flowId":"inspect-path"} | 33355.3 |
| / | settled | {"phase":"zoomed","at":35.57540000000596} | 35576.7 |
| / | settled | {"phase":"turned","at":37.17519999998808} | 37175.8 |
| / | settled | {"phase":"turned","at":38.77519999998808} | 38776.2 |
| /projects/websocket-inspector | ready | {} | 194.9 |
| /projects/websocket-inspector | settled | {"phase":"exploded","at":0.18989999997615814} | 194.9 |
| /projects/websocket-inspector | settled | {"phase":"imploded","at":1.0940999999940395} | 1098.1 |
| /projects/websocket-inspector | settled | {"phase":"exploded","at":2.3105999999940394} | 2311.8 |
| /projects/websocket-inspector | settled | {"phase":"zoomed","at":2.927399999976158} | 2928.2 |
| /projects/websocket-inspector | tour-ended | {"flowId":"capture-path"} | 13636.1 |
| /projects/jev-toolkit | ready | {} | 150.5 |
| /projects/jev-toolkit | settled | {"phase":"exploded","at":0.14469999998807906} | 150.6 |
| /projects/jev-toolkit | settled | {"phase":"imploded","at":1.0608000000119209} | 1065.2 |
| /projects/jev-toolkit | settled | {"phase":"exploded","at":2.2764000000059603} | 2277.5 |
| /projects/jev-toolkit | settled | {"phase":"zoomed","at":2.894699999988079} | 2895.7 |
| /projects/jev-toolkit | tour-ended | {"flowId":"arm-run"} | 15204.7 |

| path | ready | settled | tour-ended | ready first |
|---|---:|---:|---:|---|
| / | 1 | 6 | 2 | yes |
| /projects/websocket-inspector | 1 | 4 | 1 | yes |
| /projects/jev-toolkit | 1 | 4 | 1 | yes |
ORDER PASS
SUMMARY_JSON {"counts":[{"path":"/","ready":1,"settled":6,"tourEnded":2,"orderReadyFirst":true},{"path":"/projects/websocket-inspector","ready":1,"settled":4,"tourEnded":1,"orderReadyFirst":true},{"path":"/projects/jev-toolkit","ready":1,"settled":4,"tourEnded":1,"orderReadyFirst":true}],"orderPass":true}
