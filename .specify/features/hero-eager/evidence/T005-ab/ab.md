# Local A/B

Before: ./.specify/features/hero-eager/evidence/T004-ab
After: <local-path>/s118-checks/t005

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 221.50 | 3.00 | 202.75 | 80.50 | 18.75 | 80.50 | no measurable win |
| renderer-constructor /home (ms) | 5.56 | 0.08 | 5.45 | 0.29 | 0.11 | 0.29 | no measurable win |
| program-compile /home (ms) | 10.84 | 0.27 | 10.80 | 0.11 | 0.04 | 0.27 | no measurable win |
| first-content-frame /home (ms) | 10.84 | 0.27 | 10.80 | 0.11 | 0.04 | 0.27 | no measurable win |
| unnamedMaxMs /home (ms) | 8.96 | 0.10 | 9.05 | 0.14 | -0.09 | 0.14 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.00 | 16.80 | 207.65 | 27.10 | 3.35 | 27.10 | no measurable win |
| probe revealed /home (ms) | 219.65 | 16.90 | 216.55 | 27.50 | 3.10 | 27.50 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 10.71 | 0.00 (0.00%) | 2.76 (37.87%) | 0.87 (11.92%) | 3.66 (50.21%) |
| before cpu1 r2 first-content-frame | 10.97 | 0.00 (0.00%) | 2.76 (42.29%) | 1.05 (16.02%) | 2.73 (41.69%) |
| after cpu1 r1 first-content-frame | 10.85 | 0.00 (0.00%) | 2.76 (40.35%) | 0.87 (12.74%) | 3.21 (46.91%) |
| after cpu1 r2 first-content-frame | 10.74 | 0.00 (0.00%) | 2.81 (40.36%) | 0.69 (9.97%) | 3.45 (49.67%) |
| after cpu4 r1 first-content-frame | 32.09 | 0.00 (0.00%) | 2.90 (16.30%) | 1.19 (6.68%) | 13.71 (77.02%) |
| after cpu4 r1 unnamed @ 437.47 ms | 33.16 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.72 (100.00%) |
| after cpu4 r1 unnamed @ 504.18 ms | 32.14 | 16.30 (63.56%) | 0.00 (0.00%) | 2.87 (11.19%) | 6.48 (25.25%) |
| after cpu4 r2 first-content-frame | 35.63 | 0.00 (0.00%) | 4.06 (21.00%) | 1.63 (8.42%) | 13.65 (70.59%) |
| after cpu4 r2 unnamed @ 438.31 ms | 37.65 | 0.00 (0.00%) | 0.00 (0.00%) | 1.02 (7.33%) | 12.88 (92.67%) |
| after cpu4 r2 unnamed @ 513.70 ms | 32.55 | 16.53 (64.59%) | 0.00 (0.00%) | 4.04 (15.80%) | 5.02 (19.61%) |
