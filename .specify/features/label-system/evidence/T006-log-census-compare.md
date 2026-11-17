# T006 — S15 / Stage A census comparison

All seven runs use the same 2,052-cell matrix. The comparison is per cell; pair identity is marker + key + marker + key.

## Run totals

| run | cells | painted labels | pairs tested | cells with hits | hit pairs |
|---|---:|---:|---:|---:|---:|
| sbase1 | 2052 | 37108 | 390399 | 6 | 10 |
| sbase2 | 2052 | 37114 | 390613 | 6 | 10 |
| sbase3 | 2052 | 37153 | 391520 | 6 | 10 |
| stageA | 2052 | 37091 | 389701 | 6 | 10 |
| stageA2 | 2052 | 37058 | 388660 | 6 | 10 |
| stageA3 | 2052 | 37121 | 390712 | 6 | 10 |
| stageA4 | 2052 | 37098 | 390257 | 6 | 10 |
| S15 union | 2052 | n/a (per-run rectangles retained) | n/a | 6 | 10 |

## Cell sets

- S15-only hit cells: 0
- Stage A-only hit cells: 0
- Hit cells in both: 6 — `fixture-c-390-dark-exploded-z0-n-a-t1`, `fixture-c-390-dark-exploded-z0-n-a-t3`, `fixture-c-390-light-exploded-z0-n-a-t1`, `fixture-c-390-light-exploded-z0-n-a-t3`, `home-768-dark-hero-explode-z0-n-a-t0`, `home-768-light-hero-explode-z0-n-a-t0`
- Stage A-only hit cells that never appear in any base run: none

## Per-cell pairs

| cell | S15 hits sbase1/2/3 | Stage A hits stageA/2/3/4 | pair identity | exact quads+depth, sbase1 vs stageA |
|---|---|---|---|---|
| `fixture-c-390-dark-exploded-z0-n-a-t1` | 2/2/2 | 2/2/2/2 | same — data-xploder-lettering:retry-scheduler × data-xploder-lettering:slot-planner<br>data-xploder-lettering:slot-planner × data-xploder-lettering:audit-trail | differs (sub-pixel) |
| `fixture-c-390-dark-exploded-z0-n-a-t3` | 2/2/2 | 2/2/2/2 | same — data-xploder-lettering:notifier × data-xploder-lettering:retry-scheduler<br>data-xploder-lettering:retry-scheduler × data-xploder-lettering:slot-planner | same |
| `fixture-c-390-light-exploded-z0-n-a-t1` | 2/2/2 | 2/2/2/2 | same — data-xploder-lettering:retry-scheduler × data-xploder-lettering:slot-planner<br>data-xploder-lettering:slot-planner × data-xploder-lettering:audit-trail | differs (sub-pixel) |
| `fixture-c-390-light-exploded-z0-n-a-t3` | 2/2/2 | 2/2/2/2 | same — data-xploder-lettering:notifier × data-xploder-lettering:retry-scheduler<br>data-xploder-lettering:retry-scheduler × data-xploder-lettering:slot-planner | differs (sub-pixel) |
| `home-768-dark-hero-explode-z0-n-a-t0` | 1/1/1 | 1/1/1/1 | same — data-xploder-label:dimension:footprint × data-xploder-lettering:stream-adapter | same |
| `home-768-light-hero-explode-z0-n-a-t0` | 1/1/1 | 1/1/1/1 | same — data-xploder-label:dimension:footprint × data-xploder-lettering:stream-adapter | same |

## Base variation check

- Pair identities are identical in all seven runs on all six hit cells.
- Exact quads/depths are identical in the two home cells and one fixture-c cell, and vary in the other three fixture-c cells. Those cells vary independently among sbase1/2/3 and among stageA/2/3/4, so this is the known settled-offset jitter, not a new Stage A pair.
- No hit cell exists only in Stage A, and no Stage A-only hit cell is absent from every base run.

## Pair kinds

| a marker:kind | b marker:kind | hit pairs |
|---|---|---:|
| `data-xploder-lettering:face` | `data-xploder-lettering:mark` | 4 |
| `data-xploder-lettering:mark` | `data-xploder-lettering:face` | 4 |
| `data-xploder-label:dimension` | `data-xploder-lettering:mark` | 2 |

## AC1-named subset (zoom indexes 0, 3, 5)

| run | cells | painted labels | pairs tested | cells with hits | hit pairs |
|---|---:|---:|---:|---:|---:|
| sbase1 | 972 | 16843 | 185547 | 6 | 10 |
| stageA | 972 | 16823 | 184817 | 6 | 10 |
