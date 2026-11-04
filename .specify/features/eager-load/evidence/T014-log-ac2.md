# T014 — AC2 trace-only load window

Counted attempts are `s1` and `s3`; `s2` is non-qualifying and excluded. Each
row is the eager build on the slow-class runner, CDP CPU throttle `4×`, with a
`load`-event-to-`load + 5 s` window. `trace-only` is the named AC2 mode and the
only mode below that decides the bound. The harness rAF recorder is published
beside it as informational and excluded from AC2.

Values are raw run 1 / raw run 2 / median of the two runs. `tasks > 50` counts
the trace tasks over 50 ms in that window.

| Attempt | Route | trace-only maxLongTaskMs r1 | r2 | median | trace-only tasks > 50 ms r1 | r2 | median | trace-only droppedFrames r1 | r2 | median | recorder (excluded from AC2: harness rAF recorder) maxLongTaskMs r1/r2/median; tasks > 50 ms r1/r2/median; droppedFrames r1/r2/median | Bound |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| `s1` | home | 85.329 | 86.338 | 85.8335 | 6 | 6 | 6 | 9 | 10 | 9.5 | 88.536 / 84.443 / 86.4895; 6 / 6 / 6; 16 / 10 / 13 | FAIL |
| `s1` | project | 108.474 | 106.113 | 107.2935 | 8 | 7 | 7.5 | 12 | 12 | 12 | 109.010 / 111.078 / 110.044; 7 / 7 / 7; 18 / 17 / 17.5 | FAIL |
| `s3` | home | 106.789 | 112.202 | 109.4955 | 6 | 7 | 6.5 | 13 | 13 | 13 | 99.391 / 90.716 / 95.0535; 6 / 6 / 6; 18 / 16 / 17 | FAIL |
| `s3` | project | 105.643 | 117.072 | 111.3575 | 7 | 7 | 7 | 12 | 13 | 12.5 | 124.793 / 114.078 / 119.4355; 7 / 7 / 7; 20 / 20 / 20 | FAIL |

## Bound check

The AC2 bound is `maxLongTaskMs <= 50` and `droppedFrames <= 2`. It fails on
every counted attempt × route in both raw runs and in the two-run median;
the quietest trace-only cell is still 85.8335 ms and 9.5 dropped frames.

The recorder numbers above are shown only for comparison and are not used for
AC2. `fps:engine` exited `6` on every trace-only measurement, as expected for a
recorded verdict failure; the attached JSON is the source of truth.

## Raw artifacts

- `T014-fps-load-{home,project}-trace-only-r{1,2}-att41750211660-1-{s1,s3}.json`
- `T014-fps-load-{home,project}-recorder-r{1,2}-att41750211660-1-{s1,s3}.json`
