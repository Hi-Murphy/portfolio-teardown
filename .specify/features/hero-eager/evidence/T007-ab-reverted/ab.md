# Local A/B

Before: ./.specify/features/hero-eager/evidence/T006-ab
After: <local-path>/s118-checks/t007

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 175.25 | 22.50 | 162.25 | 3.50 | 13.00 | 22.50 | no measurable win |
| renderer-constructor /home (ms) | 5.80 | 0.38 | 5.66 | 0.32 | 0.14 | 0.38 | no measurable win |
| program-compile /home (ms) | 11.10 | 0.40 | 10.81 | 0.12 | 0.29 | 0.40 | no measurable win |
| first-content-frame /home (ms) | 11.10 | 0.40 | 10.81 | 0.12 | 0.29 | 0.40 | no measurable win |
| unnamedMaxMs /home (ms) | 7.90 | 0.28 | 7.87 | 0.16 | 0.03 | 0.28 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.90 | 13.60 | 205.35 | 3.10 | 6.55 | 13.60 | no measurable win |
| probe revealed /home (ms) | 215.65 | 13.50 | 209.25 | 3.10 | 6.40 | 13.50 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 11.30 | 0.00 (0.00%) | 2.63 (34.18%) | 1.17 (15.24%) | 3.89 (50.59%) |
| before cpu1 r2 first-content-frame | 10.90 | 0.00 (0.00%) | 3.01 (43.50%) | 0.87 (12.62%) | 3.04 (43.88%) |
| after cpu1 r1 first-content-frame | 10.76 | 0.00 (0.00%) | 2.75 (39.76%) | 0.84 (12.09%) | 3.33 (48.15%) |
| after cpu1 r2 first-content-frame | 10.87 | 0.00 (0.00%) | 3.10 (45.20%) | 1.00 (14.56%) | 2.76 (40.24%) |
| before cpu4 r1 first-content-frame | 33.28 | 0.00 (0.00%) | 3.76 (23.26%) | 1.47 (9.06%) | 10.95 (67.68%) |
| before cpu4 r1 unnamed @ 441.40 ms | 34.48 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.33 (100.00%) |
| before cpu4 r2 first-content-frame | 33.97 | 0.00 (0.00%) | 2.99 (16.29%) | 2.68 (14.62%) | 12.67 (69.09%) |
| before cpu4 r2 unnamed @ 441.86 ms | 34.96 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.64 (100.00%) |
| after cpu4 r1 first-content-frame | 34.60 | 0.00 (0.00%) | 3.10 (16.89%) | 1.93 (10.48%) | 13.34 (72.63%) |
| after cpu4 r1 unnamed @ 450.08 ms | 33.32 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 14.09 (100.00%) |
| after cpu4 r2 first-content-frame | 34.79 | 0.00 (0.00%) | 3.21 (15.60%) | 1.83 (8.90%) | 15.55 (75.51%) |
| after cpu4 r2 unnamed @ 439.64 ms | 34.22 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.74 (100.00%) |
