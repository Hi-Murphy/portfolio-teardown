# Local A/B

Before: ./.specify/features/hero-eager/evidence/T006-ab
After: <local-path>/s118-checks/t009

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 175.25 | 22.50 | 162.75 | 15.50 | 12.50 | 22.50 | no measurable win |
| renderer-constructor /home (ms) | 5.80 | 0.38 | 5.58 | 0.04 | 0.22 | 0.38 | no measurable win |
| program-compile /home (ms) | 11.10 | 0.40 | 10.83 | 0.48 | 0.27 | 0.48 | no measurable win |
| first-content-frame /home (ms) | 11.10 | 0.40 | 10.83 | 0.48 | 0.27 | 0.48 | no measurable win |
| unnamedMaxMs /home (ms) | 7.90 | 0.28 | 7.85 | 0.30 | 0.05 | 0.30 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.90 | 13.60 | 209.35 | 21.10 | 2.55 | 21.10 | no measurable win |
| probe revealed /home (ms) | 215.65 | 13.50 | 211.25 | 21.10 | 4.40 | 21.10 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 11.30 | 0.00 (0.00%) | 2.63 (34.18%) | 1.17 (15.24%) | 3.89 (50.59%) |
| before cpu1 r2 first-content-frame | 10.90 | 0.00 (0.00%) | 3.01 (43.50%) | 0.87 (12.62%) | 3.04 (43.88%) |
| after cpu1 r1 first-content-frame | 10.59 | 0.00 (0.00%) | 2.79 (39.16%) | 0.98 (13.80%) | 3.36 (47.04%) |
| after cpu1 r2 first-content-frame | 11.07 | 0.00 (0.00%) | 3.08 (46.54%) | 0.88 (13.35%) | 2.65 (40.11%) |
| before cpu4 r1 first-content-frame | 33.28 | 0.00 (0.00%) | 3.76 (23.26%) | 1.47 (9.06%) | 10.95 (67.68%) |
| before cpu4 r1 unnamed @ 441.40 ms | 34.48 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.33 (100.00%) |
| before cpu4 r2 first-content-frame | 33.97 | 0.00 (0.00%) | 2.99 (16.29%) | 2.68 (14.62%) | 12.67 (69.09%) |
| before cpu4 r2 unnamed @ 441.86 ms | 34.96 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.64 (100.00%) |
| after cpu4 r1 first-content-frame | 34.21 | 0.00 (0.00%) | 3.25 (15.63%) | 2.93 (14.08%) | 14.63 (70.29%) |
| after cpu4 r1 unnamed @ 459.46 ms | 34.35 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.82 (100.00%) |
| after cpu4 r2 first-content-frame | 32.88 | 0.00 (0.00%) | 2.86 (13.34%) | 1.79 (8.34%) | 16.82 (78.33%) |
| after cpu4 r2 unnamed @ 443.58 ms | 34.85 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.54 (100.00%) |
