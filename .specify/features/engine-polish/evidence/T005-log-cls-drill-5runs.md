# T005 CLS + drill — 5 runs
# runs: /tmp/s14-checks/t005-run1, /tmp/s14-checks/t005-run2, /tmp/s14-checks/t005-run3, /tmp/s14-checks/t005-run4, /tmp/s14-checks/t005-run5

| check | route | viewport | palette | run 1 | run 2 | run 3 | run 4 | run 5 |
|---|---|---|---|---:|---:|---:|---:|---:|
| cls | / | desktop | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects | desktop | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/websocket-inspector | desktop | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/jev-toolkit | desktop | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | / | desktop | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects | desktop | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/websocket-inspector | desktop | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/jev-toolkit | desktop | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | / | mobile | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects | mobile | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/websocket-inspector | mobile | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/jev-toolkit | mobile | light | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | / | mobile | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects | mobile | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/websocket-inspector | mobile | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| cls | /projects/jev-toolkit | mobile | dark | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| hero marks | - | 390x844 | dark | PASS | PASS | PASS | PASS | PASS |
| hero marks | - | 390x740 | dark | PASS | PASS | PASS | PASS | PASS |
| hero marks | - | 360x740 | dark | PASS | PASS | PASS | PASS | PASS |

| drill check | run 1 | run 2 | run 3 | run 4 | run 5 |
|---|---|---|---|---|---|
| drill-tab-logical-order | PASS | PASS | PASS | PASS | PASS |
| drill-nav-dom-order | PASS | PASS | PASS | PASS | PASS |
| drill-no-resume-link | PASS | PASS | PASS | PASS | PASS |
| drill-shift-tab-reverses | PASS | PASS | PASS | PASS | PASS |
| drill-no-trap | PASS | PASS | PASS | PASS | PASS |
| drill-card-enter-url | PASS | PASS | PASS | PASS | PASS |
| drill-card-enter-viewer | PASS | PASS | PASS | PASS | PASS |
| drill-card-enter-h1 | PASS | PASS | PASS | PASS | PASS |
| drill-soft-navigation | PASS | PASS | PASS | PASS | PASS |
| drill-back-card-reachable | PASS | PASS | PASS | PASS | PASS |
| drill-soft-nav-cls | PASS | PASS | PASS | PASS | PASS |
| drill-projects-one-activation | PASS | PASS | PASS | PASS | PASS |
| drill-card-hrefs-200 | PASS | PASS | PASS | PASS | PASS |

OVERALL PASS — 0 CLS in every cell: yes; hero marks PASS in every run: yes; drill all PASS in every run: yes.
