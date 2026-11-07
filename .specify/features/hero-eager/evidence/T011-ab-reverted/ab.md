# Local A/B

Before: ./.specify/features/hero-eager/evidence/T010-ab
After: <local-path>/s118-checks/t011

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 193.66 | 62.31 | 171.83 | 22.67 | 21.82 | 62.31 | no measurable win |
| renderer-constructor /home (ms) | 5.70 | 0.10 | 5.65 | 0.50 | 0.05 | 0.50 | no measurable win |
| program-compile /home (ms) | 10.67 | 0.37 | 10.75 | 0.04 | -0.08 | 0.37 | no measurable win |
| first-content-frame /home (ms) | 10.67 | 0.37 | 10.75 | 0.04 | -0.08 | 0.37 | no measurable win |
| unnamedMaxMs /home (ms) | 8.15 | 0.16 | 8.12 | 0.05 | 0.03 | 0.16 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 204.25 | 9.30 | 211.30 | 20.40 | -7.05 | 20.40 | no measurable win |
| probe revealed /home (ms) | 208.15 | 9.30 | 215.20 | 20.20 | -7.05 | 20.20 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before cpu1 r1 first-content-frame | 10.86 | 0.00 (0.00%) | 3.09 (41.54%) | 0.85 (11.47%) | 3.50 (46.98%) |
| before cpu1 r2 first-content-frame | 10.49 | 0.00 (0.00%) | 2.61 (38.61%) | 1.06 (15.69%) | 3.09 (45.71%) |
| after cpu1 r1 first-content-frame | 10.73 | 0.17 (2.58%) | 2.60 (40.75%) | 0.87 (13.62%) | 2.75 (43.05%) |
| after cpu1 r2 first-content-frame | 10.77 | 0.00 (0.00%) | 2.83 (38.61%) | 0.88 (12.04%) | 3.62 (49.35%) |
| before cpu4 r1 first-content-frame | 33.89 | 0.00 (0.00%) | 2.72 (14.43%) | 1.77 (9.39%) | 14.38 (76.18%) |
| before cpu4 r1 unnamed @ 442.36 ms | 34.82 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 14.40 (100.00%) |
| before cpu4 r2 first-content-frame | 35.55 | 0.00 (0.00%) | 4.32 (22.30%) | 2.08 (10.77%) | 12.95 (66.93%) |
| before cpu4 r2 unnamed @ 454.29 ms | 39.17 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 15.04 (100.00%) |
| after cpu4 r1 first-content-frame | 37.70 | 0.00 (0.00%) | 3.08 (13.31%) | 2.33 (10.06%) | 17.72 (76.63%) |
| after cpu4 r1 unnamed @ 448.01 ms | 34.50 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 12.83 (100.00%) |
| after cpu4 r2 first-content-frame | 33.15 | 0.00 (0.00%) | 4.55 (23.03%) | 1.83 (9.24%) | 13.38 (67.72%) |
| after cpu4 r2 unnamed @ 456.15 ms | 34.78 | 0.00 (0.00%) | 0.00 (0.00%) | 0.00 (0.00%) | 13.89 (100.00%) |
