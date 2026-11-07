# T012 - AC2 named exceptions

Mode: `fps:engine --scenario load --route / --no-build --frames trace-only --cpu 1 --names`, two
runs per deciding attempt. Caps are frozen in `T004-ac2-caps.json`. The AC2 bound is checked on the
median of the two runs; both raw runs remain published below.

The recorder runs are excluded from AC2 and are shown in their own column. CPU 4 runs are
informational.

## Named mode, CPU 1

| Attempt | Run | `renderer-constructor` (cap 15.805125 ms) | `program-compile` (cap 34.651050 ms) | `first-content-frame` (cap 34.651050 ms) | `unnamedMaxMs` (bound 50 ms) | Dropped frames (bound 2) | excluded from AC2: harness rAF recorder |
|---|---|---:|---:|---:|---:|---:|---|
| `s1` | r1 | 15.161 PASS | 35.419 FAIL | 35.419 FAIL | 42.563 PASS | 3 FAIL | ctor 15.694; compile 33.108; frame 33.108; unnamed 74.515; dropped 3 |
| `s1` | r2 | 15.372 PASS | 33.690 PASS | 33.690 PASS | 46.919 PASS | 3 FAIL | ctor 15.136; compile 31.318; frame 31.318; unnamed 79.902; dropped 3 |
| `s1` | **median** | **15.2665 PASS** | **34.5545 PASS** | **34.5545 PASS** | **44.741 PASS** | **3 FAIL** | excluded |
| `s3` | r1 | 14.847 PASS | 31.646 PASS | 31.646 PASS | 43.963 PASS | 3 FAIL | ctor 15.480; compile 32.769; frame 32.769; unnamed 132.712; dropped 3 |
| `s3` | r2 | 17.514 FAIL | 30.202 PASS | 30.202 PASS | 40.381 PASS | 3 FAIL | ctor 14.822; compile 31.407; frame 31.407; unnamed 78.576; dropped 2 |
| `s3` | **median** | **16.1805 FAIL** | **30.924 PASS** | **30.924 PASS** | **42.172 PASS** | **3 FAIL** | excluded |

`program-compile` and `first-content-frame` are the same task in these runs, so their raw and median
values match.

**AC2: NOT MET.** `s1` passes every named cap and the unnamed bound on its median, but drops 3
frames against the bound of 2. `s3` fails the `renderer-constructor` cap on its median
(`16.1805 > 15.805125`) and also drops 3 frames. The result is not softened by the individual r1/r2
passes.

## CPU 4 informational

| Attempt | Run | FPS | Dropped frames | Max long task (ms) | Long tasks |
|---|---|---:|---:|---:|---:|
| `s1` | r1 | 4.6 | 8 | 90.269 | 5 |
| `s1` | r2 | 4.6 | 9 | 95.471 | 5 |
| `s3` | r1 | 4.6 | 7 | 83.096 | 5 |
| `s3` | r2 | 4.6 | 8 | 88.824 | 5 |

Raw runs:

- `T012-fps-load-home-trace-only-cpu1-r1-att42378433209-1-s1.json`
- `T012-fps-load-home-trace-only-cpu1-r2-att42378433209-1-s1.json`
- `T012-fps-load-home-trace-only-cpu1-r1-att42378433209-1-s3.json`
- `T012-fps-load-home-trace-only-cpu1-r2-att42378433209-1-s3.json`
- `T012-fps-load-home-recorder-cpu1-r1-att42378433209-1-s1.json`
- `T012-fps-load-home-recorder-cpu1-r2-att42378433209-1-s1.json`
- `T012-fps-load-home-recorder-cpu1-r1-att42378433209-1-s3.json`
- `T012-fps-load-home-recorder-cpu1-r2-att42378433209-1-s3.json`
- `T012-fps-load-home-trace-only-cpu4-r1-att42378433209-1-s1.json`
- `T012-fps-load-home-trace-only-cpu4-r2-att42378433209-1-s1.json`
- `T012-fps-load-home-trace-only-cpu4-r1-att42378433209-1-s3.json`
- `T012-fps-load-home-trace-only-cpu4-r2-att42378433209-1-s3.json`
