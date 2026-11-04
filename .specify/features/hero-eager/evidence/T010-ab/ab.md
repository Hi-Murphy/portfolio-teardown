# Local A/B

Before: ./.specify/features/hero-eager/evidence/T004-ab
After: <local-path>/s118-checks/t010

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 221.50 | 3.00 | 193.66 | 62.31 | 27.84 | 62.31 | no measurable win |
| renderer-constructor /home (ms) | 5.56 | 0.08 | 5.70 | 0.10 | -0.14 | 0.10 | no measurable win |
| program-compile /home (ms) | 10.84 | 0.27 | 10.67 | 0.37 | 0.17 | 0.37 | no measurable win |
| first-content-frame /home (ms) | 10.84 | 0.27 | 10.67 | 0.37 | 0.17 | 0.37 | no measurable win |
| unnamedMaxMs /home (ms) | 8.96 | 0.10 | 8.15 | 0.16 | 0.81 | 0.16 | KEEP |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.00 | 16.80 | 204.25 | 9.30 | 6.75 | 16.80 | no measurable win |
| probe revealed /home (ms) | 219.65 | 16.90 | 208.15 | 9.30 | 11.50 | 16.90 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 10.71 | 0.00 (0.00%) | 2.76 (37.87%) | 0.87 (11.92%) | 3.66 (50.21%) |
| before cpu1 r2 first-content-frame | 10.97 | 0.00 (0.00%) | 2.76 (42.29%) | 1.05 (16.02%) | 2.73 (41.69%) |
| after cpu1 r1 first-content-frame | 10.86 | 0.00 (0.00%) | 3.09 (41.54%) | 0.85 (11.47%) | 3.50 (46.98%) |
| after cpu1 r2 first-content-frame | 10.49 | 0.00 (0.00%) | 2.61 (38.61%) | 1.06 (15.69%) | 3.09 (45.71%) |
| after cpu4 r1 first-content-frame | 33.89 | 0.00 (0.00%) | 2.72 (14.43%) | 1.77 (9.39%) | 14.38 (76.18%) |
| after cpu4 r1 unnamed @ 442.36 ms | 34.82 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 14.40 (100.00%) |
| after cpu4 r2 first-content-frame | 35.55 | 0.00 (0.00%) | 4.32 (22.30%) | 2.08 (10.77%) | 12.95 (66.93%) |
| after cpu4 r2 unnamed @ 454.29 ms | 39.17 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.04 (100.00%) |
