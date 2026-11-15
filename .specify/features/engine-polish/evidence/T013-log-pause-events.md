# command: node pause-events.mjs <repo> <baseUrl> [screenshotDir] | base: http://127.0.0.1:4614 | chromium: 156.0.8078.4 | commit: 9b73eed
| width | offset | cpu | midExplode | stateSettles | labelBatches | expectedRemainingMs | resumeToNextPhaseMs | resumeDeltaMs | frameEqual |
|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| 1440x900 | 50 | x1 | true | 1 | 1 | 4457.5 | 4461.3 | 3.8 | true |
| 1440x900 | 50 | x4 | true | 1 | 1 | 4168.6 | 4168 | -0.6 | true |
| 1440x900 | 300 | x1 | true | 1 | 1 | 4245.8 | 4248.6 | 2.8 | true |
| 1440x900 | 300 | x4 | true | 1 | 1 | 3919.6 | 3918 | -1.6 | true |
| 1440x900 | 600 | x1 | true | 1 | 1 | 3944.7 | 3946.6 | 1.9 | true |
| 1440x900 | 600 | x4 | true | 1 | 1 | 3619.2 | 3617.8 | -1.4 | true |
| 1440x900 | 850 | x1 | true | 1 | 1 | 3696.4 | 3700.3 | 3.9 | true |
| 1440x900 | 850 | x4 | false | 0 | 0 | 3373.2 | 3372.1 | -1.1 | true |
| 390x844 | 50 | x1 | true | 1 | 1 | 4491.6 | 4494.1 | 2.5 | true |
| 390x844 | 50 | x4 | true | 1 | 1 | 4087.7 | 4088.4 | 0.7 | true |
| 390x844 | 300 | x1 | true | 1 | 1 | 3738 | 3742.1 | 4.1 | true |
| 390x844 | 300 | x4 | true | 1 | 1 | 3922.3 | 3921.5 | -0.8 | true |
| 390x844 | 600 | x1 | true | 1 | 1 | 3940.7 | 3940.1 | -0.6 | true |
| 390x844 | 600 | x4 | true | 1 | 1 | 3621.7 | 3622.1 | 0.4 | true |
| 390x844 | 850 | x1 | true | 1 | 1 | 3689.7 | 3693.5 | 3.8 | true |
| 390x844 | 850 | x4 | false | 0 | 0 | 3371.8 | 3370.1 | -1.7 | true |

settle count = 1 in every mid-explode cell: yes
frames equal while paused in every cell: yes
max |resumeDeltaMs| over cells: 4.1 ms (one frame = 16.7 ms)
