# T011 gates — CI on the Vercel preview (perf run 43664792319 attempt 1) + local probes (T011-log-local-gates.txt)

| route | perf (median of 3) | a11y | CLS max | LCP ms (median) |
|---|---:|---:|---:|---:|
| /projects/jev-toolkit | 1.00 | 1.00 | 0 | 920 |
| /projects/websocket-inspector | 1.00 | 1.00 | 0 | 944 |
| /projects | 1.00 | 1.00 | 0 | 920 |
| / | 1.00 | 1.00 | 0 | 944 |

| route | mobile bytes | desktop bytes | budget |
|---|---:|---:|---:|
| /projects/jev-toolkit | 204,094 | 227,651 | 3,000,000 |
| /projects/websocket-inspector | 203,508 | 226,866 | 3,000,000 |
| /projects | 208,982 | 240,901 | 3,000,000 |
| / | 463,517 | 495,643 | 3,000,000 |

- Draw calls: draws-hero 2 (102/102 frames), draws-project-websocket-inspector 2, draws-project-jev-toolkit 2.
- Eager hero: hero group 8/8 (poster first paint, reveal with zero interaction, loop running, one canvas max); eager:probe --expect live-loop PASS 2/2.
- axe production routes: CI job success ×5 (0 serious / 0 critical, job gate).
- CLS: 0 in every cell of 5 CI attempts (T011-log-ci-site-probe-5runs.md).
