# orchestrator review of T010-log-pause-freeze.md (G3) — commit after T010 merge
# AC2 clauses: +1f↔+0.5 s and +0.5 s↔+3 s diffs, settles while paused, freeze latency; 'Play continues from the same frame' is checked by the resume landing:
#   explode@N: play→settle should fall by the offset step (250/300/250 ms) — a restart would keep it constant, a jump would make it ~0;
#   'first frame after play diff px' compares a frame taken after the screenshot round-trip (several frames of motion), so it is not a jump measure.

cells: 40; cells with a non-zero diff, a paused settle or MISSED: 0
max freeze latency (click → data-xploder-clock=paused): 2.3 ms (one frame = 16.7 ms)

| viewport | cpu | explode@50 | @300 | @600 | @850 | step 50→300 | 300→600 | 600→850 | implied explode end (offset + play→settle) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1440x900 | x1 | 1137.2 | 885.9 | 584.9 | 334.0 | 251.3 | 301.0 | 250.9 | [1191.7, 1188.1, 1189.3, 1186.9] |
| 1440x900 | x4 | 1132.4 | 900.8 | 599.1 | 348.8 | 231.6 | 301.7 | 250.3 | [1185.8, 1201.4, 1203.1, 1199.0] |
| 390x844 | x1 | 1130.6 | 882.5 | 594.3 | 345.1 | 248.1 | 288.2 | 249.2 | [1187.4, 1187.2, 1199.9, 1198.0] |
| 390x844 | x4 | 1140.6 | 888.8 | 589.5 | 338.5 | 251.8 | 299.3 | 251.0 | [1190.9, 1190.3, 1190.2, 1189.8] |
