# command: node pause-events.mjs <repo> <baseUrl> [screenshotDir] | base: <url> | chromium: 156.0.8078.4 | commit: 8c410f3
| width | offset | cpu | midExplode | stateSettles | labelBatches | expectedRemainingMs | resumeToNextPhaseMs | resumeDeltaMs | frameEqual |
|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| 1440x900 | 50 | x1 | true | 1 | 1 | 4478 | 4481.9 | 3.9 | true |
| 1440x900 | 50 | x4 | true | 1 | 1 | 4166.8 | 4166.7 | -0.1 | true |
| 1440x900 | 300 | x1 | true | 1 | 1 | 4247.2 | 4250.7 | 3.5 | true |
| 1440x900 | 300 | x4 | true | 1 | 1 | 3920 | 3918.1 | -1.9 | true |
| 1440x900 | 600 | x1 | true | 1 | 1 | 3945.2 | 3947.5 | 2.3 | true |
| 1440x900 | 600 | x4 | true | 1 | 1 | 3615.9 | 3615 | -0.9 | true |
| 1440x900 | 850 | x1 | true | 1 | 1 | 3695.8 | 3699.7 | 3.9 | true |
| 1440x900 | 850 | x4 | false | 0 | 0 | 3370.1 | 3369.8 | -0.3 | true |
| 390x844 | 50 | x1 | true | 1 | 1 | 4491.1 | 4491.8 | 0.7 | true |
| 390x844 | 50 | x4 | true | 1 | 1 | 4187 | 4186.9 | -0.1 | true |
| 390x844 | 300 | x1 | true | 1 | 1 | 4256.7 | 4261.6 | 4.9 | true |
| 390x844 | 300 | x4 | true | 1 | 1 | 3942 | 3941.3 | -0.7 | true |
| 390x844 | 600 | x1 | true | 1 | 1 | 3939.4 | 3940.7 | 1.3 | true |
| 390x844 | 600 | x4 | true | 1 | 1 | 3638.9 | 3639.7 | 0.8 | true |
| 390x844 | 850 | x1 | true | 1 | 1 | 3693.3 | 3696.4 | 3.1 | true |
| 390x844 | 850 | x4 | false | 0 | 0 | 3291.3 | 3291.7 | 0.4 | true |

settle count = 1 in every mid-explode cell: yes
frames equal while paused in every cell: yes
max |resumeDeltaMs| over cells: 4.9 ms (one frame = 16.7 ms)
