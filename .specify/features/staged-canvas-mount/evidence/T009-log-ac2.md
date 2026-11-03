# T009 — AC2 verdict and dropped-frame timeline

Commands (run one at a time):

- `pnpm fps:engine --scenario startup --route / --engage move --no-build --out <out>/fps-home-move-r{1,2}`
- `pnpm fps:engine --scenario startup --route /projects/websocket-inspector --engage move --no-build --out <out>/fps-project-move-r{1,2}`
- `pnpm fps:engine --scenario startup --route /projects/websocket-inspector --engage click --no-build --out <out>/fps-project-click-r{1,2}`

AC2 rule: during the first 5 s after engagement, `droppedFrames === 0` **and** `maxLongTaskMs <= 50`, on every run.

## Verdict per path

| Path | Run | Dropped frames | Max long task (ms) | Verdict |
|---|---:|---:|---:|---|
| home-move | r1 | 2 | 0.000 | FAIL |
| home-move | r2 | 2 | 0.000 | FAIL |
| **home-move overall** |  | **2 median** | **0.000 median** | **FAIL** |
| project-move | r1 | 6 | 0.000 | FAIL |
| project-move | r2 | 5 | 0.000 | FAIL |
| **project-move overall** |  | **5.5 median** | **0.000 median** | **FAIL** |
| project-click | r1 | 6 | 0.000 | FAIL |
| project-click | r2 | 5 | 0.000 | FAIL |
| **project-click overall** |  | **5.5 median** | **0.000 median** | **FAIL** |

All three paths **FAIL AC2** on the zero-dropped-frames half. The long-task half passes everywhere: each run has zero tasks above 50 ms. This is the RFC Q10 escalation case; no threshold was changed.

## Dropped-frame times and tasks over 16.7 ms

| Run | droppedFrameTimes (ms) | tasksOver16ms (start+dur) |
|---|---|---|
| home-move r1 | 232.775, 249.441 | #1 7.664+26.748; #2 146.810+17.367; #3 174.471+27.392; #4 201.879+30.885; #5 233.919+29.744 |
| home-move r2 | 238.008, 254.674 | #1 8.048+29.440; #2 178.361+26.850; #3 205.238+29.323; #4 236.064+32.006 |
| project-move r1 | 184.285, 200.951, 217.617, 234.283, 267.615, 284.281 | #1 7.942+27.057; #2 43.686+31.798; #3 98.414+20.228; #4 210.000+24.973; #5 234.979+32.244; #6 268.791+32.754 |
| project-move r2 | 172.594, 189.260, 255.924, 272.590, 289.256 | #1 7.328+26.720; #2 41.805+33.432; #3 97.828+19.305; #4 124.087+18.725; #5 211.827+25.714; #6 237.566+31.979; #7 270.522+33.231 |
| project-click r1 | 227.066, 243.732, 260.398, 277.064, 310.396, 327.062 | #1 15.585+23.950; #2 48.504+26.491; #3 83.222+32.782; #4 137.902+19.669; #5 222.426+16.923; #6 248.994+25.116; #7 274.118+31.492; #8 307.702+33.800 |
| project-click r2 | 211.089, 227.755, 294.419, 311.085, 327.751 | #1 15.164+23.893; #2 47.165+26.616; #3 82.063+31.983; #4 135.159+19.427; #5 248.275+25.249; #6 273.588+32.749; #7 307.303+33.818 |

## Per dropped frame

Times and task bounds are milliseconds after engagement.

| Run | Dropped frame (ms) | Containing task |
|---|---:|---|
| home-move r1 | 232.775 | no >16.7 ms task; follows #4 201.879+30.885 by 0.011 ms; next #5 starts 233.919 |
| home-move r1 | 249.441 | inside #5 233.919+29.744 |
| home-move r2 | 238.008 | inside #4 236.064+32.006 |
| home-move r2 | 254.674 | inside #4 236.064+32.006 |
| project-move r1 | 184.285 | no >16.7 ms task; follows #3 98.414+20.228 by 65.643 ms; next #4 starts 210.000 |
| project-move r1 | 200.951 | no >16.7 ms task; follows #3 98.414+20.228 by 82.309 ms; next #4 starts 210.000 |
| project-move r1 | 217.617 | inside #4 210.000+24.973 |
| project-move r1 | 234.283 | inside #4 210.000+24.973 |
| project-move r1 | 267.615 | no >16.7 ms task; follows #5 234.979+32.244 by 0.392 ms; next #6 starts 268.791 |
| project-move r1 | 284.281 | inside #6 268.791+32.754 |
| project-move r2 | 172.594 | no >16.7 ms task; follows #4 124.087+18.725 by 29.782 ms; next #5 starts 211.827 |
| project-move r2 | 189.260 | no >16.7 ms task; follows #4 124.087+18.725 by 46.448 ms; next #5 starts 211.827 |
| project-move r2 | 255.924 | inside #6 237.566+31.979 |
| project-move r2 | 272.590 | inside #7 270.522+33.231 |
| project-move r2 | 289.256 | inside #7 270.522+33.231 |
| project-click r1 | 227.066 | inside #5 222.426+16.923 |
| project-click r1 | 243.732 | no >16.7 ms task; follows #5 222.426+16.923 by 4.383 ms; next #6 starts 248.994 |
| project-click r1 | 260.398 | inside #6 248.994+25.116 |
| project-click r1 | 277.064 | inside #7 274.118+31.492 |
| project-click r1 | 310.396 | inside #8 307.702+33.800 |
| project-click r1 | 327.062 | inside #8 307.702+33.800 |
| project-click r2 | 211.089 | no >16.7 ms task; follows #4 135.159+19.427 by 56.503 ms; next #5 starts 248.275 |
| project-click r2 | 227.755 | no >16.7 ms task; follows #4 135.159+19.427 by 73.169 ms; next #5 starts 248.275 |
| project-click r2 | 294.419 | inside #6 273.588+32.749 |
| project-click r2 | 311.085 | inside #7 307.303+33.818 |
| project-click r2 | 327.751 | inside #7 307.303+33.818 |

The recorded `droppedFrameTimes.length` equals `droppedFrames` in all six runs.
