# Local A/B

Before: ./.specify/features/hero-eager/evidence/T005-ab
After: <local-path>/s118-checks/t006

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 202.75 | 80.50 | 175.25 | 22.50 | 27.50 | 80.50 | no measurable win |
| renderer-constructor /home (ms) | 5.45 | 0.29 | 5.80 | 0.38 | -0.35 | 0.38 | no measurable win |
| program-compile /home (ms) | 10.80 | 0.11 | 11.10 | 0.40 | -0.31 | 0.40 | no measurable win |
| first-content-frame /home (ms) | 10.80 | 0.11 | 11.10 | 0.40 | -0.31 | 0.40 | no measurable win |
| unnamedMaxMs /home (ms) | 9.05 | 0.14 | 7.90 | 0.28 | 1.14 | 0.28 | KEEP |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 207.65 | 27.10 | 211.90 | 13.60 | -4.25 | 27.10 | no measurable win |
| probe revealed /home (ms) | 216.55 | 27.50 | 215.65 | 13.50 | 0.90 | 27.50 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 10.85 | 0.00 (0.00%) | 2.76 (40.35%) | 0.87 (12.74%) | 3.21 (46.91%) |
| before cpu1 r2 first-content-frame | 10.74 | 0.00 (0.00%) | 2.81 (40.36%) | 0.69 (9.97%) | 3.45 (49.67%) |
| after cpu1 r1 first-content-frame | 11.30 | 0.00 (0.00%) | 2.63 (34.18%) | 1.17 (15.24%) | 3.89 (50.59%) |
| after cpu1 r2 first-content-frame | 10.90 | 0.00 (0.00%) | 3.01 (43.50%) | 0.87 (12.62%) | 3.04 (43.88%) |
| before cpu4 r1 first-content-frame | 32.09 | 0.00 (0.00%) | 2.90 (16.30%) | 1.19 (6.68%) | 13.71 (77.02%) |
| before cpu4 r1 unnamed @ 437.47 ms | 33.16 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.72 (100.00%) |
| before cpu4 r1 unnamed @ 504.18 ms | 32.14 | 16.30 (63.56%) | 0.00 (0.00%) | 2.87 (11.19%) | 6.48 (25.25%) |
| before cpu4 r2 first-content-frame | 35.63 | 0.00 (0.00%) | 4.06 (21.00%) | 1.63 (8.42%) | 13.65 (70.59%) |
| before cpu4 r2 unnamed @ 438.31 ms | 37.65 | 0.00 (0.00%) | 0.00 (0.00%) | 1.02 (7.33%) | 12.88 (92.67%) |
| before cpu4 r2 unnamed @ 513.70 ms | 32.55 | 16.53 (64.59%) | 0.00 (0.00%) | 4.04 (15.80%) | 5.02 (19.61%) |
| after cpu4 r1 first-content-frame | 33.28 | 0.00 (0.00%) | 3.76 (23.26%) | 1.47 (9.06%) | 10.95 (67.68%) |
| after cpu4 r1 unnamed @ 441.40 ms | 34.48 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.33 (100.00%) |
| after cpu4 r2 first-content-frame | 33.97 | 0.00 (0.00%) | 2.99 (16.29%) | 2.68 (14.62%) | 12.67 (69.09%) |
| after cpu4 r2 unnamed @ 441.86 ms | 34.96 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 17.64 (100.00%) |
