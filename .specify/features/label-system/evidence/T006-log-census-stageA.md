# command: node .specify/features/label-system/label-sweep.mjs /tmp/s16-checks/stageA --json /tmp/s16-checks/census-stageA.json | commit: 67560d8 | exit: 6

# Label sweep — stageA

## Totals

- Cells: 2052
- Painted labels: 37091
- Pairs tested: 389701
- Cells with hits: 6
- Hit pairs: 10

| cell | hits | pair keys |
|---|---:|---|
| `home-768-light-hero-explode-z0-n-a-t0` | 1 | `dimension:footprint × stream-adapter` |
| `home-768-dark-hero-explode-z0-n-a-t0` | 1 | `dimension:footprint × stream-adapter` |
| `fixture-c-390-light-exploded-z0-n-a-t1` | 2 | `retry-scheduler × slot-planner`<br>`slot-planner × audit-trail` |
| `fixture-c-390-light-exploded-z0-n-a-t3` | 2 | `notifier × retry-scheduler`<br>`retry-scheduler × slot-planner` |
| `fixture-c-390-dark-exploded-z0-n-a-t1` | 2 | `retry-scheduler × slot-planner`<br>`slot-planner × audit-trail` |
| `fixture-c-390-dark-exploded-z0-n-a-t3` | 2 | `notifier × retry-scheduler`<br>`retry-scheduler × slot-planner` |

## Hit counts by pair kind

| a | b | hits |
|---|---|---:|
| `data-xploder-lettering:face` | `data-xploder-lettering:mark` | 4 |
| `data-xploder-lettering:mark` | `data-xploder-lettering:face` | 4 |
| `data-xploder-label:dimension` | `data-xploder-lettering:mark` | 2 |

## AC1-named subset (zoom indexes 0, 3, 5)

| zoom index | cells | Painted labels | Pairs tested | Cells with hits | Hit pairs |
|---:|---:|---:|---:|---:|---:|
| 0 | 246 | 3988 | 65456 | 6 | 10 |
| 3 | 360 | 6450 | 60750 | 0 | 0 |
| 5 | 366 | 6385 | 58611 | 0 | 0 |
| total | 972 | 16823 | 184817 | 6 | 10 |

sweep: FAIL (10 intersections in 6 cells)
