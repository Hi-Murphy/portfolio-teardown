# Local A/B

Before: ./.specify/features/eager-load/evidence/T007-ab
After: /tmp/s117-checks/t008

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 272.58 | 35.16 | 243.54 | 101.08 | 29.04 | 101.08 | no measurable win |
| max long task /home (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /home | 2.00 | 0.00 | 1.00 | 0.00 | 1.00 | 0.00 | KEEP |
| probe ready /home (ms) | 211.15 | 17.10 | 216.25 | 17.50 | -5.10 | 17.50 | no measurable win |
| probe revealed /home (ms) | 220.00 | 17.40 | 225.00 | 17.60 | -5.00 | 17.60 | no measurable win |
| eager simulated TBT /project (ms) | 319.50 | 42.00 | 354.00 | 19.00 | -34.50 | 42.00 | no measurable win |
| max long task /project (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /project | 2.00 | 0.00 | 1.50 | 1.00 | 0.50 | 1.00 | no measurable win |
| probe ready /project (ms) | 215.30 | 8.00 | 220.95 | 10.10 | -5.65 | 10.10 | no measurable win |
| probe revealed /project (ms) | 225.75 | 8.10 | 230.95 | 9.90 | -5.20 | 9.90 | no measurable win |
