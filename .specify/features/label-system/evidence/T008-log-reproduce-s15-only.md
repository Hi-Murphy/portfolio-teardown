# reproduce-check | base runs: sbase1, sbase2, sbase3, knife-base-1, knife-base-2, knife-base-3, knife-base-4, knife-base-5 | head runs: stageB, stageB2, stageB3

Cells that differed in the first head run vs the first base run:

| cell | gated on | identical pair found | verdict |
|---|---|---|---|
| `websocket-inspector-390-light-exploded-z1-bottom-t0` | px | head `stageB` = base `knife-base-3` | PASS |
| `websocket-inspector-390-light-exploded-z5-middle-t2` | px | head `stageB` = base `knife-base-2` | PASS |
| `jev-toolkit-390-light-exploded-z2-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `jev-toolkit-390-light-exploded-z3-middle-t3` | px | head `stageB2` = base `sbase1` | PASS |
| `websocket-inspector-768-light-exploded-z1-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `jev-toolkit-768-light-exploded-z2-middle-t3` | px | head `stageB2` = base `sbase1` | PASS |
| `websocket-inspector-1440-light-exploded-z1-middle-t2` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z1-middle-t1` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z1-middle-t2` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z2-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `jev-toolkit-1440-light-exploded-z2-middle-t2` | px | head `stageB2` = base `sbase1` | PASS |
| `jev-toolkit-1440-light-exploded-z5-middle-t3` | px | head `stageB3` = base `sbase1` | PASS |
| `websocket-inspector-390-dark-exploded-z2-middle-t2` | px | head `stageB3` = base `sbase1` | PASS |
| `websocket-inspector-390-dark-exploded-z2-middle-t3` | px | head `stageB2` = base `sbase1` | PASS |
| `websocket-inspector-390-dark-exploded-z4-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `websocket-inspector-768-dark-exploded-z1-middle-t3` | px | none | FAIL |
| `jev-toolkit-768-dark-exploded-z3-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `jev-toolkit-768-dark-exploded-z4-bottom-t1` | px | head `stageB` = base `knife-base-2` | PASS |
| `websocket-inspector-1440-dark-exploded-z1-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `websocket-inspector-1440-dark-exploded-z4-top-t0` | px + dom | none | FAIL |
| `websocket-inspector-1440-dark-exploded-z4-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `websocket-inspector-1440-dark-exploded-z4-middle-t2` | px | head `stageB2` = base `sbase1` | PASS |
| `jev-toolkit-1440-dark-exploded-z4-top-t0` | px + dom | head `stageB3` = base `sbase1` | PASS |
| `fixture-a-390-light-exploded-z1-middle-t1` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-a-390-light-exploded-z4-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-c-390-light-exploded-z5-middle-t2` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-a-768-light-exploded-z1-middle-t2` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-a-768-light-exploded-z3-middle-t1` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-a-768-light-exploded-z5-top-t0` | px + dom | none | FAIL |
| `fixture-a-768-light-exploded-z5-middle-t1` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-a-768-light-exploded-z5-middle-t2` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-b-768-light-exploded-z5-middle-t2` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-c-768-light-exploded-z0-n-a-t3` | px + dom | head `stageB2` = base `sbase1` | PASS |
| `fixture-c-768-light-exploded-z1-middle-t2` | px | head `stageB` = base `knife-base-2` | PASS |
| `fixture-c-768-light-exploded-z3-bottom-t3` | px + dom | none | FAIL |
| `fixture-c-768-light-exploded-z4-middle-t1` | px | head `stageB` = base `knife-base-2` | PASS |
| `fixture-a-1440-light-exploded-z1-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-b-1440-light-exploded-z2-middle-t2` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-b-1440-light-exploded-z4-top-t0` | px + dom | none | FAIL |
| `fixture-a-390-dark-exploded-z4-middle-t3` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-b-390-dark-exploded-z3-top-t0` | px + dom | none | FAIL |
| `fixture-b-390-dark-exploded-z5-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-b-390-dark-exploded-z5-middle-t2` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-c-390-dark-exploded-z1-top-t0` | px + dom | none | FAIL |
| `fixture-b-768-dark-exploded-z1-middle-t1` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-c-768-dark-exploded-z0-n-a-t3` | px + dom | head `stageB2` = base `sbase1` | PASS |
| `fixture-c-768-dark-exploded-z2-middle-t2` | px | head `stageB3` = base `sbase1` | PASS |
| `fixture-a-1440-dark-exploded-z5-middle-t1` | px | head `stageB2` = base `sbase1` | PASS |
| `fixture-c-1440-dark-exploded-z3-middle-t1` | px | head `stageB3` = base `sbase1` | PASS |

reproduce: FAIL (1733 gated cells, 1723 reproduced, 10 never matched)
