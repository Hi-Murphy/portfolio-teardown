# T004 - AC2 caps

Local and CI values are `--cpu 1 --frames trace-only --names` task durations in milliseconds.
`program-compile` and `first-content-frame` are the same task on both attempts. Caps are exactly
`1.05 x median(r1, r2)`, unrounded; the sibling `T004-ac2-caps.json` carries the binding values used by
the workflow.

## Binding attempt (`41774295096-1-s2`)

| Name | r1 | r2 | Median | Cap (x1.05) |
| --- | ---: | ---: | ---: | ---: |
| `renderer-constructor` | 15.021 | 15.084 | 15.0525 | 15.805125 |
| `program-compile` | 33.798 | 32.204 | 33.001000000000005 | 34.651050000000005 |
| `first-content-frame` | 33.798 | 32.204 | 33.001000000000005 | 34.651050000000005 |
| `unnamedMaxMs` | 39.157 | 36.931 | - | 50 ms gate |
| dropped frames | 3 | 4 | - | 2 max |

## Corroborating attempt (`41774295096-1-s1`, informational)

| Name | r1 | r2 | Median | Cap (x1.05) |
| --- | ---: | ---: | ---: | ---: |
| `renderer-constructor` | 14.938 | 15.936 | 15.437000000000001 | 16.20885 |
| `program-compile` | 30.156 | 29.941 | 30.048499999999997 | 31.550925 |
| `first-content-frame` | 30.156 | 29.941 | 30.048499999999997 | 31.550925 |
| `unnamedMaxMs` | 39.084 | 34.626 | - | 50 ms gate |
| dropped frames | 3 | 3 | - | 2 max |

The recorder is excluded from AC2: harness rAF recorder. Its `unnamedMaxMs` was 85.949/79.895 on
`s2` and 73.769/82.590 on `s1`; recorder dropped frames were 3/3 on both attempts. The `--cpu 4`
informational runs had dropped frames 10/11 and max long task 90.706/93.739 ms on `s2`, and 10/11
and 86.456/87.485 ms on `s1`.
