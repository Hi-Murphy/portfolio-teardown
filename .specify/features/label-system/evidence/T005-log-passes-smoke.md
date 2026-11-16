# command: node label-passes.mjs <repo> <baseUrl> | base: http://127.0.0.1:4618 | chromium: 156.0.8078.4 | commit: 68e05b9
note [/projects/websocket-inspector 390x844] hover slab: skipped on touch
note [/projects/websocket-inspector 1440x900] resize 1440 to 1280: settle timed out
note [/projects/websocket-inspector 1440x900] resize 1280 to 1440: settle timed out
note [/projects/jev-toolkit 390x844] hover slab: skipped on touch
note [/projects/jev-toolkit 1440x900] resize 1440 to 1280: settle timed out
note [/projects/jev-toolkit 1440x900] resize 1280 to 1440: settle timed out
| route | viewport | step | settles | passes | expected | verdict |
|---|---|---|---:|---:|---|---|
| `/projects/websocket-inspector` | `390x844` | toggle to imploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | toggle to exploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | zoom-in 1/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | zoom-in 2/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | zoom-in 3/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | zoom-in 4/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | zoom-in 5/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | rotate-right 1/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | rotate-right 2/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | rotate-right 3/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | rotate-right 4/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | zoom-reset | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | resize 390 to 360 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | resize 360 to 390 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `390x844` | open and close part detail | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `390x844` | scroll stage middle and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `390x844` | palette dark and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `390x844` | keyboard focus moves | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `390x844` | 2 s idle | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `1440x900` | toggle to imploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | toggle to exploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | zoom-in 1/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | zoom-in 2/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | zoom-in 3/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | zoom-in 4/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | zoom-in 5/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | rotate-right 1/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | rotate-right 2/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | rotate-right 3/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | rotate-right 4/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | zoom-reset | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/websocket-inspector` | `1440x900` | resize 1440 to 1280 | 0 | 0 | passes == settles >= 1 | FAIL |
| `/projects/websocket-inspector` | `1440x900` | resize 1280 to 1440 | 0 | 0 | passes == settles >= 1 | FAIL |
| `/projects/websocket-inspector` | `1440x900` | hover slab on/off | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `1440x900` | open and close part detail | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `1440x900` | scroll stage middle and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `1440x900` | palette dark and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `1440x900` | keyboard focus moves | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/websocket-inspector` | `1440x900` | 2 s idle | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `390x844` | toggle to imploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | toggle to exploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | zoom-in 1/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | zoom-in 2/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | zoom-in 3/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | zoom-in 4/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | zoom-in 5/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | rotate-right 1/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | rotate-right 2/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | rotate-right 3/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | rotate-right 4/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | zoom-reset | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | resize 390 to 360 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | resize 360 to 390 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `390x844` | open and close part detail | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `390x844` | scroll stage middle and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `390x844` | palette dark and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `390x844` | keyboard focus moves | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `390x844` | 2 s idle | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `1440x900` | toggle to imploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | toggle to exploded | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | zoom-in 1/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | zoom-in 2/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | zoom-in 3/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | zoom-in 4/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | zoom-in 5/5 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | rotate-right 1/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | rotate-right 2/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | rotate-right 3/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | rotate-right 4/4 | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | zoom-reset | 1 | 1 | passes == settles >= 1 | PASS |
| `/projects/jev-toolkit` | `1440x900` | resize 1440 to 1280 | 0 | 0 | passes == settles >= 1 | FAIL |
| `/projects/jev-toolkit` | `1440x900` | resize 1280 to 1440 | 0 | 0 | passes == settles >= 1 | FAIL |
| `/projects/jev-toolkit` | `1440x900` | hover slab on/off | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `1440x900` | open and close part detail | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `1440x900` | scroll stage middle and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `1440x900` | palette dark and back | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `1440x900` | keyboard focus moves | 0 | 0 | passes == settles == 0 | PASS |
| `/projects/jev-toolkit` | `1440x900` | 2 s idle | 0 | 0 | passes == settles == 0 | PASS |

Project switch: skipped — not available on project pages.

R3 re-pass count: 0 (expected 0) | PASS

passes: FAIL
