# Local A/B

Before: ./.specify/features/eager-load/evidence/T007-ab
After: /tmp/s117-checks/t010

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 272.58 | 35.16 | 161.63 | 5.74 | 110.95 | 35.16 | KEEP |
| max long task /home (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /home | 2.00 | 0.00 | 2.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.15 | 17.10 | 208.00 | 22.00 | 3.15 | 22.00 | no measurable win |
| probe revealed /home (ms) | 220.00 | 17.40 | 217.15 | 21.90 | 2.85 | 21.90 | no measurable win |
| eager simulated TBT /project (ms) | 319.50 | 42.00 | 267.50 | 7.00 | 52.00 | 42.00 | KEEP |
| max long task /project (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /project | 2.00 | 0.00 | 2.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /project (ms) | 215.30 | 8.00 | 210.85 | 17.10 | 4.45 | 17.10 | no measurable win |
| probe revealed /project (ms) | 225.75 | 8.10 | 221.05 | 16.70 | 4.70 | 16.70 | no measurable win |
