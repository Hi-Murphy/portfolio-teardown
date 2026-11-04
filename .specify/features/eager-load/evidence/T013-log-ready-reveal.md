# T013 — Ready/reveal sequence

The T013 final state was probed on the gated export: `home` with `move`, and `project` with
`click`, two attributed runs each. The ordered live-state values match the S11.6 T009 baseline
(the product state inherited by T006), T007-ab and T008-ab.

T006-ab did not commit a `seq-*` directory. Its sequence baseline is therefore the final T004 row
in `../staged-canvas-mount/evidence/T009-log-ready-reveal.md`; T007-ab is the nearest eager-load
artifact (T007 changes only the eager ready guards, not the normal reveal path).

| State | Route | Run | firstInstancedDraw t / raf | ready t / raf | Same rAF | liveStates (raf) |
| --- | --- | ---: | ---: | ---: | --- | --- |
| T006 base | home-move | r1 | 2609.000 / 12 | 2610.100 / 12 | yes | idle → loading → revealed |
| T006 base | home-move | r2 | 2590.900 / 12 | 2591.900 / 12 | yes | idle → loading → revealed |
| T007 | home-move | r1 | 2527.900 / 12 | 2528.700 / 12 | yes | idle (0) → loading (0) → revealed (12) |
| T007 | home-move | r2 | 2593.300 / 12 | 2593.500 / 12 | yes | idle (0) → loading (0) → revealed (12) |
| T008 | home-move | r1 | 2533.900 / 13 | 2535.100 / 13 | yes | idle (0) → loading (0) → revealed (13) |
| T008 | home-move | r2 | 2610.600 / 12 | 2611.800 / 12 | yes | idle (0) → loading (0) → revealed (12) |
| **T013 final** | home-move | r1 | 2629.200 / 12 | 2630.400 / 12 | yes | idle (0) → loading (0) → revealed (12) |
| **T013 final** | home-move | r2 | 2489.800 / 12 | 2491.200 / 12 | yes | idle (0) → loading (0) → revealed (12) |
| T006 base | project-click | r1 | 2700.000 / 15 | 2700.900 / 15 | yes | loading → revealed |
| T006 base | project-click | r2 | 2571.600 / 14 | 2572.600 / 14 | yes | loading → revealed |
| T007 | project-click | r1 | 2608.300 / 15 | 2609.700 / 15 | yes | loading (9) → revealed (15) |
| T007 | project-click | r2 | 2669.900 / 15 | 2670.900 / 15 | yes | loading (9) → revealed (15) |
| T008 | project-click | r1 | 2712.300 / 16 | 2713.100 / 16 | yes | loading (10) → revealed (16) |
| T008 | project-click | r2 | 2591.100 / 16 | 2591.800 / 16 | yes | loading (10) → revealed (16) |
| **T013 final** | project-click | r1 | 2712.900 / 15 | 2713.800 / 15 | yes | loading (9) → revealed (15) |
| **T013 final** | project-click | r2 | 2586.300 / 16 | 2587.200 / 16 | yes | loading (10) → revealed (16) |

## Assertions

- **Home:** both final runs keep `idle>loading>revealed`; `ready.raf === firstInstancedDraw.raf`.
- **Project:** both final runs keep `loading>revealed`; `ready.raf === firstInstancedDraw.raf`.
- **Ordered values:** identical to T006 (S11.6 T009), T007 and T008. RAF indices vary with run
  timing, as they do in the baseline artifacts; no live-state value or ordering changed.
- **Hero:** `site:probe --group hero` passed all 7 checks on the gated build. The project starts
  with a poster and static explore, then reveals after interaction. See `T013-log-drawcalls.txt`.

## Check output

```text
$ node tools/perf/src/cli/startup-profile.ts --serve apps/web/out --route / --engage move --attribute --runs 2 --out /tmp/s117-checks/t013/seq-home
run 1/2: home move attributed
phases: P0=28.6 P1=85.2 P2=67.3 P3=56.4 P4=95.0 P5=68.3 P6=0.0 P7=3.5 P8=2.8 P9=2.7
cost: 282.1 ms; attributed: 176.8 ms; other: 105.3 ms; blocking: 0.0 ms
glCounts: createProgram=1 linkProgram=1
startup: /tmp/s117-checks/t013/seq-home/startup-home-move-attributed-r1.json
run 2/2: home move attributed
phases: P0=24.6 P1=83.8 P2=66.1 P3=55.7 P4=92.1 P5=65.5 P6=0.1 P7=2.4 P8=3.0 P9=3.6
cost: 268.8 ms; attributed: 170.3 ms; other: 98.5 ms; blocking: 0.0 ms
glCounts: createProgram=1 linkProgram=1
startup: /tmp/s117-checks/t013/seq-home/startup-home-move-attributed-r2.json
summary: /tmp/s117-checks/t013/seq-home/summary.json (mainThreadCostMs=275.4, spreadFlagged=true)
$ node tools/perf/src/cli/startup-profile.ts --serve apps/web/out --route /projects/websocket-inspector --engage click --attribute --runs 2 --out /tmp/s117-checks/t013/seq-project
run 1/2: project click attributed
phases: P0=null P1=111.6 P2=91.4 P3=80.4 P4=113.0 P5=71.3 P6=0.0 P7=3.1 P8=5.3 P9=2.9
cost: 327.0 ms; attributed: 214.4 ms; other: 112.6 ms; blocking: 0.0 ms
glCounts: createProgram=1 linkProgram=1
startup: /tmp/s117-checks/t013/seq-project/startup-project-click-attributed-r1.json
run 2/2: project click attributed
phases: P0=null P1=111.0 P2=90.7 P3=80.4 P4=101.6 P5=69.3 P6=0.1 P7=2.2 P8=11.6 P9=47.0
cost: 322.5 ms; attributed: 252.9 ms; other: 69.5 ms; blocking: 0.0 ms
glCounts: createProgram=1 linkProgram=1
startup: /tmp/s117-checks/t013/seq-project/startup-project-click-attributed-r2.json
summary: /tmp/s117-checks/t013/seq-project/summary.json (mainThreadCostMs=324.7, spreadFlagged=true)
```
