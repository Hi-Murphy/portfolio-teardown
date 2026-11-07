# Local A/B

Before: ./.specify/features/hero-eager/evidence/T006-ab
After: <local-path>/s118-checks/t008

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 175.25 | 22.50 | 176.75 | 1.50 | -1.50 | 22.50 | no measurable win |
| renderer-constructor /home (ms) | 5.80 | 0.38 | 5.46 | 0.04 | 0.34 | 0.38 | no measurable win |
| program-compile /home (ms) | 11.10 | 0.40 | 11.07 | 0.14 | 0.03 | 0.40 | no measurable win |
| first-content-frame /home (ms) | 11.10 | 0.40 | 3.01 | 0.01 | 8.09 | 0.40 | KEEP |
| unnamedMaxMs /home (ms) | 7.90 | 0.28 | 6.68 | 0.02 | 1.22 | 0.28 | KEEP |
| dropped frames trace-only /home | 0.00 | 0.00 | 1.00 | 0.00 | -1.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.90 | 13.60 | 231.80 | 18.00 | -19.90 | 18.00 | no measurable win |
| probe revealed /home (ms) | 215.65 | 13.50 | 232.00 | 18.00 | -16.35 | 18.00 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 11.30 | 0.00 (0.00%) | 2.63 (34.18%) | 1.17 (15.24%) | 3.89 (50.59%) |
| before cpu1 r2 first-content-frame | 10.90 | 0.00 (0.00%) | 3.01 (43.50%) | 0.87 (12.62%) | 3.04 (43.88%) |
| after cpu1 r1 first-content-frame | 3.02 | 0.00 (0.00%) | 0.31 (20.59%) | 0.00 (0.00%) | 1.19 (79.41%) |
| after cpu1 r2 first-content-frame | 3.01 | 0.00 (0.00%) | 0.15 (6.94%) | 0.00 (0.00%) | 2.06 (93.06%) |
| before cpu4 r1 first-content-frame | 33.28 | 0.00 (0.00%) | 3.76 (23.26%) | 1.47 (9.06%) | 10.95 (67.68%) |
| before cpu4 r1 unnamed @ 441.40 ms | 34.48 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.33 (100.00%) |
| before cpu4 r2 first-content-frame | 33.97 | 0.00 (0.00%) | 2.99 (16.29%) | 2.68 (14.62%) | 12.67 (69.09%) |
| before cpu4 r2 unnamed @ 441.86 ms | 34.96 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.64 (100.00%) |
| after cpu4 r1 first-content-frame | 12.22 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 7.18 (100.00%) |
| after cpu4 r2 first-content-frame | 12.58 | 0.00 (0.00%) | 0.82 (11.09%) | 0.00 (0.00%) | 6.58 (88.91%) |
