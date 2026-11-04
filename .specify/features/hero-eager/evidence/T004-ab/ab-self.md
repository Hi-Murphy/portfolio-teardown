# Local A/B

Before: .specify/features/hero-eager/evidence/T004-ab
After: .specify/features/hero-eager/evidence/T004-ab

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 221.50 | 3.00 | 221.50 | 3.00 | 0.00 | 3.00 | no measurable win |
| renderer-constructor /home (ms) | 5.56 | 0.08 | 5.56 | 0.08 | 0.00 | 0.08 | no measurable win |
| program-compile /home (ms) | 10.84 | 0.27 | 10.84 | 0.27 | 0.00 | 0.27 | no measurable win |
| first-content-frame /home (ms) | 10.84 | 0.27 | 10.84 | 0.27 | 0.00 | 0.27 | no measurable win |
| unnamedMaxMs /home (ms) | 8.96 | 0.10 | 8.96 | 0.10 | 0.00 | 0.10 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.00 | 16.80 | 211.00 | 16.80 | 0.00 | 16.80 | no measurable win |
| probe revealed /home (ms) | 219.65 | 16.90 | 219.65 | 16.90 | 0.00 | 16.90 | no measurable win |

## First-content-frame self-time split

Shares use the captured self time in the `--names` report (its top eight entries).

| Task | Duration ms | Placement | Program setup | GC | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| before r1 first-content-frame | 10.71 | 0.00 (0.00%) | 2.76 (37.87%) | 0.87 (11.92%) | 3.66 (50.21%) |
| before r2 first-content-frame | 10.97 | 0.00 (0.00%) | 2.76 (42.29%) | 1.05 (16.02%) | 2.73 (41.69%) |
| after r1 first-content-frame | 10.71 | 0.00 (0.00%) | 2.76 (37.87%) | 0.87 (11.92%) | 3.66 (50.21%) |
| after r2 first-content-frame | 10.97 | 0.00 (0.00%) | 2.76 (42.29%) | 1.05 (16.02%) | 2.73 (41.69%) |
