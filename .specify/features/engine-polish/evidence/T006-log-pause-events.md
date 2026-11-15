# command: node pause-events.mjs <repo> <baseUrl> [screenshotDir] | base: http://127.0.0.1:4614 | chromium: 156.0.8078.4 | commit: 64d9ef3
| width | offset | cpu | midExplode | stateSettles | labelBatches | expectedRemainingMs | resumeToNextPhaseMs | resumeDeltaMs | frameEqual |
|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| 1440x900 | 50 | x1 | true | 1 | 1 | 1254.6 | 1258.4 | 3.8 | true |
| 1440x900 | 50 | x4 | true | 1 | 1 | 971.7 | 970.1 | -1.6 | true |
| 1440x900 | 300 | x1 | true | 1 | 1 | 1047.4 | 1051.1 | 3.7 | true |
| 1440x900 | 300 | x4 | true | 1 | 1 | 624 | 621.2 | -2.8 | true |
| 1440x900 | 600 | x1 | true | 1 | 1 | 749.1 | 751.9 | 2.8 | true |
| 1440x900 | 600 | x4 | true | 1 | 1 | 421.5 | 420 | -1.5 | true |
| 1440x900 | 850 | x1 | true | 1 | 1 | 497.8 | 496.8 | -1 | true |
| 1440x900 | 850 | x4 | false | 0 | 0 | 174.8 | 172.9 | -1.9 | true |
| 390x844 | 50 | x1 | true | 1 | 1 | 1294.5 | 1298.1 | 3.6 | true |
| 390x844 | 50 | x4 | true | 1 | 1 | 974 | 973.9 | -0.1 | true |
| 390x844 | 300 | x1 | true | 1 | 1 | 1040.6 | 1043.1 | 2.5 | true |
| 390x844 | 300 | x4 | true | 1 | 1 | 727.3 | 726.9 | -0.4 | true |
| 390x844 | 600 | x1 | true | 1 | 1 | 741.9 | 747.1 | 5.2 | true |
| 390x844 | 600 | x4 | true | 1 | 1 | 428.4 | 428 | -0.4 | true |
| 390x844 | 850 | x1 | true | 1 | 1 | 489.3 | 494.3 | 5 | true |
| 390x844 | 850 | x4 | false | 0 | 0 | 177.5 | 173.4 | -4.1 | true |

settle count = 1 in every mid-explode cell: yes
frames equal while paused in every cell: yes
max |resumeDeltaMs| over cells: 5.2 ms (one frame = 16.7 ms)
