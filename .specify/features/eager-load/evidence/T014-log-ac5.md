# T014 — AC5 eager probe

Counted attempts `s1` and `s3`, both routes, normal and reduced motion, both
runs. Values are read from the deadline snapshot. Times are milliseconds
relative to navigation start and are rounded to `0.1 ms` here; the attached
JSON keeps the machine values. A dash means the probe correctly did not expect
that event in reduced motion.

| Attempt | Route | Motion | Run | Deadline ms | loadAtMs | readyAtMs | Revealed t | Trusted events | Canvas count | Live opacity | Poster opacity / visibility | Non-blank | Pass |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| `s1` | home | normal | 1 | 2500 | 207.7 | 535.8 | 566.6 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s1` | home | normal | 2 | 2500 | 179.1 | 498.0 | 528.0 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s1` | home | reduce | 1 | 5000 | 200.7 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s1` | home | reduce | 2 | 5000 | 167.5 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s1` | project | normal | 1 | 2500 | 178.5 | 537.5 | 567.3 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s1` | project | normal | 2 | 2500 | 174.2 | 540.1 | 570.8 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s1` | project | reduce | 1 | 5000 | 185.5 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s1` | project | reduce | 2 | 5000 | 175.3 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s3` | home | normal | 1 | 2500 | 216.5 | 585.8 | 616.0 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s3` | home | normal | 2 | 2500 | 177.5 | 532.9 | 565.8 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s3` | home | reduce | 1 | 5000 | 228.5 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s3` | home | reduce | 2 | 5000 | 191.4 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s3` | project | normal | 1 | 2500 | 235.3 | 615.1 | 653.3 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s3` | project | normal | 2 | 2500 | 210.2 | 572.3 | 607.5 | 0 | 1 | 1 | 0 / hidden | true | PASS |
| `s3` | project | reduce | 1 | 5000 | 206.6 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |
| `s3` | project | reduce | 2 | 5000 | 156.7 | — | — | 0 | 0 | 0 | 1 / visible | true | PASS |

## Result

All 16 runs pass. Every normal-motion run has a canvas, `readyAtMs` and reveal
time below the `2.5 s` deadline, live opacity `1`, a hidden poster, and a
non-blank deadline screenshot. Every reduced-motion run has zero canvases,
zero readiness/reveal, a visible opacity-`1` poster, and a non-blank screenshot.
All runs record zero trusted interaction events through the deadline.

Deadline screenshots are attached as
`T014-eager-probe-{home,project}-{normal,reduce}-r{1,2}-att41750211660-1-{s1,s3}.deadline.png`.
