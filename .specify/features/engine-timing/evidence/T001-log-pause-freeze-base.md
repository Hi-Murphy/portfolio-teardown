# command: node pause-freeze.mjs <repo> <baseUrl> [--cpu 1,4] [--viewports 1440x900,390x844] | base: <url> | chromium: 156.0.8078.4 | cpu: 1,4 | commit: 8c410f3
# signals: attributes (pre-S15)
# explode@50 1440x900 x1: approaching 2445.7 ms active
# explode@300 1440x900 x1: approaching 5822.3 ms active
# explode@600 1440x900 x1: approaching 9255 ms active
# explode@850 1440x900 x1: approaching 12632.9 ms active
# zoomin-mid 1440x900 x1: approaching 22938.1 ms active
# capture-mid-step 1440x900 x1: approaching 32053.1 ms active
# capture-mid-draw 1440x900 x1: approaching 34784.8 ms active
# inspect-mid-step 1440x900 x1: approaching 51125.8 ms active
# turn-mid 1440x900 x1: approaching 74411.5 ms active
# implode-mid 1440x900 x1: approaching 80741.3 ms active
# explode@50 1440x900 x4: approaching 2725.5 ms active
# explode@300 1440x900 x4: approaching 6098.9 ms active
# explode@600 1440x900 x4: approaching 9532.9 ms active
# explode@850 1440x900 x4: approaching 12908.6 ms active
# zoomin-mid 1440x900 x4: approaching 23202.2 ms active
# capture-mid-step 1440x900 x4: approaching 32313.7 ms active
# capture-mid-draw 1440x900 x4: approaching 35047.5 ms active
# inspect-mid-step 1440x900 x4: approaching 51386.8 ms active
# turn-mid 1440x900 x4: approaching 74667.3 ms active
# implode-mid 1440x900 x4: approaching 80991.5 ms active
# explode@50 390x844 x1: approaching 2433.9 ms active
# explode@300 390x844 x1: approaching 5814.5 ms active
# explode@600 390x844 x1: approaching 9249.9 ms active
# explode@850 390x844 x1: approaching 12631.7 ms active
# zoomin-mid 390x844 x1: approaching 22948.4 ms active
# capture-mid-step 390x844 x1: approaching 32074.5 ms active
# capture-mid-draw 390x844 x1: approaching 34808.9 ms active
# inspect-mid-step 390x844 x1: approaching 51151.5 ms active
# turn-mid 390x844 x1: approaching 74457.7 ms active
# implode-mid 390x844 x1: approaching 80793.8 ms active
# explode@50 390x844 x4: approaching 2707.9 ms active
# explode@300 390x844 x4: approaching 6068.9 ms active
# explode@600 390x844 x4: approaching 9482.6 ms active
# explode@850 390x844 x4: approaching 12847.5 ms active
# zoomin-mid 390x844 x4: approaching 23118.8 ms active
# capture-mid-step 390x844 x4: approaching 32203.5 ms active
# capture-mid-draw 390x844 x4: approaching 34920 ms active
# inspect-mid-step 390x844 x4: approaching 51251.7 ms active
# turn-mid 390x844 x4: approaching 74496 ms active
# implode-mid 390x844 x4: approaching 80808.8 ms active

| point | viewport | cpu | diff px +1f↔+0.5s | diff px +0.5s↔+3s | settles while paused | freeze latency ms | play→settle ms | play→next phase ms | first frame after play diff px |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| explode@50 | 1440x900 | x1 | 64635 | 65143 | 25 | n/a | 4990.9 | 4349.9 | 0 |
| explode@300 | 1440x900 | x1 | 2437 | 0 | 0 | n/a | n/a | 1571.6 | 0 |
| explode@600 | 1440x900 | x1 | 0 | 0 | 0 | n/a | 11911.7 | 11911.7 | 8 |
| explode@850 | 1440x900 | x1 | 190743 | 61089 | 24 | n/a | 2057.1 | 4625.1 | 0 |
| zoomin-mid | 1440x900 | x1 | 73287 | 5846 | 1 | n/a | 3217.3 | 2020.9 | 0 |
| capture-mid-step | 1440x900 | x1 | 1886 | 0 | 0 | n/a | 3892.2 | 3254.5 | 0 |
| capture-mid-draw | 1440x900 | x1 | 2286 | 0 | 0 | n/a | n/a | 1571.8 | 0 |
| inspect-mid-step | 1440x900 | x1 | 0 | 0 | 0 | n/a | 11908.8 | 11908.9 | 6 |
| turn-mid | 1440x900 | x1 | 186546 | 60599 | 24 | n/a | 2041 | 4605.7 | 0 |
| implode-mid | 1440x900 | x1 | 72758 | 5384 | 1 | n/a | 3199.5 | 2018.6 | 0 |
| explode@50 | 1440x900 | x4 | 55807 | 62470 | 25 | n/a | 4961.6 | 4317 | 0 |
| explode@300 | 1440x900 | x4 | 2425 | 0 | 0 | n/a | n/a | 1586.6 | 0 |
| explode@600 | 1440x900 | x4 | 0 | 0 | 0 | n/a | 11944.3 | 11944.3 | 3862 |
| explode@850 | 1440x900 | x4 | 173568 | 50912 | 24 | n/a | 2080.3 | 4636.9 | 0 |
| zoomin-mid | 1440x900 | x4 | 76145 | 9784 | 1 | n/a | 3231 | 2046.1 | 0 |
| capture-mid-step | 1440x900 | x4 | 1886 | 0 | 0 | n/a | 3892.1 | 3261.4 | 0 |
| capture-mid-draw | 1440x900 | x4 | 2283 | 0 | 0 | n/a | n/a | 1582.4 | 0 |
| inspect-mid-step | 1440x900 | x4 | 0 | 0 | 0 | n/a | 11910.3 | 11910.3 | 5 |
| turn-mid | 1440x900 | x4 | 171507 | 61089 | 24 | n/a | 2059.1 | 4618.2 | 0 |
| implode-mid | 1440x900 | x4 | 72470 | 8538 | 1 | n/a | 3214.1 | 2027.1 | 0 |
| explode@50 | 390x844 | x1 | 9567 | 13432 | 24 | n/a | 4989 | 4360.7 | 0 |
| explode@300 | 390x844 | x1 | 7852 | 0 | 0 | n/a | n/a | 1668.4 | 0 |
| explode@600 | 390x844 | x1 | 0 | 0 | 0 | n/a | 12118.5 | 12118.6 | 929 |
| explode@850 | 390x844 | x1 | 22333 | 11414 | 23 | n/a | 2173.7 | 4737.8 | 0 |
| zoomin-mid | 390x844 | x1 | 10926 | 1503 | 1 | n/a | 3296.5 | 2106 | 0 |
| capture-mid-step | 390x844 | x1 | 9813 | 0 | 0 | n/a | 3953.8 | 3329 | 0 |
| capture-mid-draw | 390x844 | x1 | 1590 | 0 | 0 | n/a | n/a | 1650.9 | 0 |
| inspect-mid-step | 390x844 | x1 | 0 | 0 | 0 | n/a | 12089.3 | 12089.3 | 928 |
| turn-mid | 390x844 | x1 | 31043 | 11332 | 23 | n/a | 2139.1 | 4712.3 | 0 |
| implode-mid | 390x844 | x1 | 10939 | 1626 | 1 | n/a | 3297.5 | 2114.6 | 0 |
| explode@50 | 390x844 | x4 | 9637 | 13455 | 24 | n/a | 4992 | 4356.9 | 0 |
| explode@300 | 390x844 | x4 | 7847 | 0 | 0 | n/a | n/a | 1659.1 | 0 |
| explode@600 | 390x844 | x4 | 0 | 0 | 0 | n/a | 12124.1 | 12124.1 | 929 |
| explode@850 | 390x844 | x4 | 22293 | 11414 | 23 | n/a | 2171.8 | 4737.6 | 0 |
| zoomin-mid | 390x844 | x4 | 10991 | 1730 | 1 | n/a | 3313.2 | 2118.2 | 0 |
| capture-mid-step | 390x844 | x4 | 9813 | 0 | 0 | n/a | 3954.8 | 3321.2 | 0 |
| capture-mid-draw | 390x844 | x4 | 1797 | 0 | 0 | n/a | n/a | 1640.4 | 0 |
| inspect-mid-step | 390x844 | x4 | 0 | 0 | 0 | n/a | 12087.8 | 12087.9 | 928 |
| turn-mid | 390x844 | x4 | 30953 | 11366 | 23 | n/a | 2153.8 | 4716.6 | 0 |
| implode-mid | 390x844 | x4 | 10953 | 1689 | 1 | n/a | 3316.1 | 2115.9 | 0 |
SUMMARY_JSON [{"point":"explode@50","viewport":"1440x900","cpu":1,"diffP1fP05":64635,"diffP05P3":65143,"settlesWhilePaused":25,"freezeLatencyMs":"n/a","playToSettleMs":4990.9,"playToNextPhaseMs":4349.9,"firstFrameAfterPlayDiff":0},{"point":"explode@300","viewport":"1440x900","cpu":1,"diffP1fP05":2437,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1571.6,"firstFrameAfterPlayDiff":0},{"point":"explode@600","viewport":"1440x900","cpu":1,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":11911.7,"playToNextPhaseMs":11911.7,"firstFrameAfterPlayDiff":8},{"point":"explode@850","viewport":"1440x900","cpu":1,"diffP1fP05":190743,"diffP05P3":61089,"settlesWhilePaused":24,"freezeLatencyMs":"n/a","playToSettleMs":2057.1,"playToNextPhaseMs":4625.1,"firstFrameAfterPlayDiff":0},{"point":"zoomin-mid","viewport":"1440x900","cpu":1,"diffP1fP05":73287,"diffP05P3":5846,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3217.3,"playToNextPhaseMs":2020.9,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-step","viewport":"1440x900","cpu":1,"diffP1fP05":1886,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":3892.2,"playToNextPhaseMs":3254.5,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-draw","viewport":"1440x900","cpu":1,"diffP1fP05":2286,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1571.8,"firstFrameAfterPlayDiff":0},{"point":"inspect-mid-step","viewport":"1440x900","cpu":1,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":11908.8,"playToNextPhaseMs":11908.9,"firstFrameAfterPlayDiff":6},{"point":"turn-mid","viewport":"1440x900","cpu":1,"diffP1fP05":186546,"diffP05P3":60599,"settlesWhilePaused":24,"freezeLatencyMs":"n/a","playToSettleMs":2041,"playToNextPhaseMs":4605.7,"firstFrameAfterPlayDiff":0},{"point":"implode-mid","viewport":"1440x900","cpu":1,"diffP1fP05":72758,"diffP05P3":5384,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3199.5,"playToNextPhaseMs":2018.6,"firstFrameAfterPlayDiff":0},{"point":"explode@50","viewport":"1440x900","cpu":4,"diffP1fP05":55807,"diffP05P3":62470,"settlesWhilePaused":25,"freezeLatencyMs":"n/a","playToSettleMs":4961.6,"playToNextPhaseMs":4317,"firstFrameAfterPlayDiff":0},{"point":"explode@300","viewport":"1440x900","cpu":4,"diffP1fP05":2425,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1586.6,"firstFrameAfterPlayDiff":0},{"point":"explode@600","viewport":"1440x900","cpu":4,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":11944.3,"playToNextPhaseMs":11944.3,"firstFrameAfterPlayDiff":3862},{"point":"explode@850","viewport":"1440x900","cpu":4,"diffP1fP05":173568,"diffP05P3":50912,"settlesWhilePaused":24,"freezeLatencyMs":"n/a","playToSettleMs":2080.3,"playToNextPhaseMs":4636.9,"firstFrameAfterPlayDiff":0},{"point":"zoomin-mid","viewport":"1440x900","cpu":4,"diffP1fP05":76145,"diffP05P3":9784,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3231,"playToNextPhaseMs":2046.1,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-step","viewport":"1440x900","cpu":4,"diffP1fP05":1886,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":3892.1,"playToNextPhaseMs":3261.4,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-draw","viewport":"1440x900","cpu":4,"diffP1fP05":2283,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1582.4,"firstFrameAfterPlayDiff":0},{"point":"inspect-mid-step","viewport":"1440x900","cpu":4,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":11910.3,"playToNextPhaseMs":11910.3,"firstFrameAfterPlayDiff":5},{"point":"turn-mid","viewport":"1440x900","cpu":4,"diffP1fP05":171507,"diffP05P3":61089,"settlesWhilePaused":24,"freezeLatencyMs":"n/a","playToSettleMs":2059.1,"playToNextPhaseMs":4618.2,"firstFrameAfterPlayDiff":0},{"point":"implode-mid","viewport":"1440x900","cpu":4,"diffP1fP05":72470,"diffP05P3":8538,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3214.1,"playToNextPhaseMs":2027.1,"firstFrameAfterPlayDiff":0},{"point":"explode@50","viewport":"390x844","cpu":1,"diffP1fP05":9567,"diffP05P3":13432,"settlesWhilePaused":24,"freezeLatencyMs":"n/a","playToSettleMs":4989,"playToNextPhaseMs":4360.7,"firstFrameAfterPlayDiff":0},{"point":"explode@300","viewport":"390x844","cpu":1,"diffP1fP05":7852,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1668.4,"firstFrameAfterPlayDiff":0},{"point":"explode@600","viewport":"390x844","cpu":1,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":12118.5,"playToNextPhaseMs":12118.6,"firstFrameAfterPlayDiff":929},{"point":"explode@850","viewport":"390x844","cpu":1,"diffP1fP05":22333,"diffP05P3":11414,"settlesWhilePaused":23,"freezeLatencyMs":"n/a","playToSettleMs":2173.7,"playToNextPhaseMs":4737.8,"firstFrameAfterPlayDiff":0},{"point":"zoomin-mid","viewport":"390x844","cpu":1,"diffP1fP05":10926,"diffP05P3":1503,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3296.5,"playToNextPhaseMs":2106,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-step","viewport":"390x844","cpu":1,"diffP1fP05":9813,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":3953.8,"playToNextPhaseMs":3329,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-draw","viewport":"390x844","cpu":1,"diffP1fP05":1590,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1650.9,"firstFrameAfterPlayDiff":0},{"point":"inspect-mid-step","viewport":"390x844","cpu":1,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":12089.3,"playToNextPhaseMs":12089.3,"firstFrameAfterPlayDiff":928},{"point":"turn-mid","viewport":"390x844","cpu":1,"diffP1fP05":31043,"diffP05P3":11332,"settlesWhilePaused":23,"freezeLatencyMs":"n/a","playToSettleMs":2139.1,"playToNextPhaseMs":4712.3,"firstFrameAfterPlayDiff":0},{"point":"implode-mid","viewport":"390x844","cpu":1,"diffP1fP05":10939,"diffP05P3":1626,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3297.5,"playToNextPhaseMs":2114.6,"firstFrameAfterPlayDiff":0},{"point":"explode@50","viewport":"390x844","cpu":4,"diffP1fP05":9637,"diffP05P3":13455,"settlesWhilePaused":24,"freezeLatencyMs":"n/a","playToSettleMs":4992,"playToNextPhaseMs":4356.9,"firstFrameAfterPlayDiff":0},{"point":"explode@300","viewport":"390x844","cpu":4,"diffP1fP05":7847,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1659.1,"firstFrameAfterPlayDiff":0},{"point":"explode@600","viewport":"390x844","cpu":4,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":12124.1,"playToNextPhaseMs":12124.1,"firstFrameAfterPlayDiff":929},{"point":"explode@850","viewport":"390x844","cpu":4,"diffP1fP05":22293,"diffP05P3":11414,"settlesWhilePaused":23,"freezeLatencyMs":"n/a","playToSettleMs":2171.8,"playToNextPhaseMs":4737.6,"firstFrameAfterPlayDiff":0},{"point":"zoomin-mid","viewport":"390x844","cpu":4,"diffP1fP05":10991,"diffP05P3":1730,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3313.2,"playToNextPhaseMs":2118.2,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-step","viewport":"390x844","cpu":4,"diffP1fP05":9813,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":3954.8,"playToNextPhaseMs":3321.2,"firstFrameAfterPlayDiff":0},{"point":"capture-mid-draw","viewport":"390x844","cpu":4,"diffP1fP05":1797,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":"n/a","playToNextPhaseMs":1640.4,"firstFrameAfterPlayDiff":0},{"point":"inspect-mid-step","viewport":"390x844","cpu":4,"diffP1fP05":0,"diffP05P3":0,"settlesWhilePaused":0,"freezeLatencyMs":"n/a","playToSettleMs":12087.8,"playToNextPhaseMs":12087.9,"firstFrameAfterPlayDiff":928},{"point":"turn-mid","viewport":"390x844","cpu":4,"diffP1fP05":30953,"diffP05P3":11366,"settlesWhilePaused":23,"freezeLatencyMs":"n/a","playToSettleMs":2153.8,"playToNextPhaseMs":4716.6,"firstFrameAfterPlayDiff":0},{"point":"implode-mid","viewport":"390x844","cpu":4,"diffP1fP05":10953,"diffP05P3":1689,"settlesWhilePaused":1,"freezeLatencyMs":"n/a","playToSettleMs":3316.1,"playToNextPhaseMs":2115.9,"firstFrameAfterPlayDiff":0}]
