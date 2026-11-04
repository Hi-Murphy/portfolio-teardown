# Local A/B

Before: ./.specify/features/eager-load/evidence/T006-ab
After: /tmp/s117-checks/t007

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 278.02 | 44.04 | 272.58 | 35.16 | 5.44 | 44.04 | no measurable win |
| max long task /home (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /home | 2.00 | 0.00 | 2.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 208.70 | 4.00 | 211.15 | 17.10 | -2.45 | 17.10 | no measurable win |
| probe revealed /home (ms) | 217.65 | 3.90 | 220.00 | 17.40 | -2.35 | 17.40 | no measurable win |
| eager simulated TBT /project (ms) | 338.32 | 2.37 | 319.50 | 42.00 | 18.82 | 42.00 | no measurable win |
| max long task /project (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /project | 1.50 | 1.00 | 2.00 | 0.00 | -0.50 | 1.00 | no measurable win |
| probe ready /project (ms) | 210.45 | 20.10 | 215.30 | 8.00 | -4.85 | 20.10 | no measurable win |
| probe revealed /project (ms) | 220.75 | 19.90 | 225.75 | 8.10 | -5.00 | 19.90 | no measurable win |
