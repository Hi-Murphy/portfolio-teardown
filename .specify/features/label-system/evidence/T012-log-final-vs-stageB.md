# reproduce-check | base runs: stageB, stageB2, stageB3 | head runs: final1

Cells that differed in the first head run vs the first base run:

| cell | gated on | identical pair found | verdict |
|---|---|---|---|
| `websocket-inspector-390-light-exploded-z3-middle-t1` | px | none | FAIL |
| `websocket-inspector-390-light-exploded-z3-middle-t3` | px | none | FAIL |
| `jev-toolkit-390-light-exploded-z2-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `websocket-inspector-768-light-exploded-z1-middle-t1` | px | none | FAIL |
| `jev-toolkit-768-light-exploded-z1-middle-t1` | px | none | FAIL |
| `jev-toolkit-768-light-exploded-z2-middle-t1` | px | none | FAIL |
| `jev-toolkit-768-light-exploded-z2-middle-t3` | px | head `final1` = base `stageB2` | PASS |
| `websocket-inspector-1440-light-exploded-z1-middle-t2` | px | none | FAIL |
| `websocket-inspector-1440-light-exploded-z5-middle-t1` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z1-middle-t1` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z1-middle-t2` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z2-middle-t2` | px | none | FAIL |
| `jev-toolkit-1440-light-exploded-z5-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `jev-toolkit-1440-light-exploded-z5-middle-t3` | px | head `final1` = base `stageB3` | PASS |
| `websocket-inspector-390-dark-exploded-z2-middle-t2` | px | none | FAIL |
| `websocket-inspector-390-dark-exploded-z2-middle-t3` | px | none | FAIL |
| `websocket-inspector-390-dark-exploded-z4-middle-t1` | px | head `final1` = base `stageB3` | PASS |
| `jev-toolkit-390-dark-exploded-z2-middle-t1` | px | none | FAIL |
| `websocket-inspector-768-dark-exploded-z1-middle-t3` | px | none | FAIL |
| `websocket-inspector-768-dark-exploded-z5-middle-t3` | px | none | FAIL |
| `jev-toolkit-768-dark-exploded-z3-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `jev-toolkit-768-dark-exploded-z4-bottom-t3` | px | head `final1` = base `stageB3` | PASS |
| `jev-toolkit-768-dark-exploded-z5-middle-t1` | px | none | FAIL |
| `websocket-inspector-1440-dark-exploded-z1-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `websocket-inspector-1440-dark-exploded-z4-top-t0` | px + dom | none | FAIL |
| `websocket-inspector-1440-dark-exploded-z4-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `websocket-inspector-1440-dark-exploded-z4-middle-t2` | px | none | FAIL |
| `websocket-inspector-1440-dark-exploded-z4-middle-t3` | px | none | FAIL |
| `jev-toolkit-1440-dark-exploded-z2-middle-t2` | px | none | FAIL |
| `jev-toolkit-1440-dark-exploded-z4-top-t0` | px + dom | head `final1` = base `stageB3` | PASS |
| `fixture-a-390-light-exploded-z1-middle-t1` | px | head `final1` = base `stageB3` | PASS |
| `fixture-a-390-light-exploded-z1-middle-t2` | px | none | FAIL |
| `fixture-a-390-light-exploded-z4-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `fixture-a-390-light-exploded-z5-middle-t3` | px | none | FAIL |
| `fixture-c-390-light-exploded-z5-middle-t2` | px | none | FAIL |
| `fixture-a-768-light-exploded-z3-middle-t1` | px | none | FAIL |
| `fixture-a-768-light-exploded-z5-middle-t2` | px | head `final1` = base `stageB2` | PASS |
| `fixture-b-768-light-exploded-z4-middle-t2` | px | none | FAIL |
| `fixture-b-768-light-exploded-z5-middle-t2` | px | head `final1` = base `stageB3` | PASS |
| `fixture-c-768-light-exploded-z0-n-a-t3` | px + dom | none | FAIL |
| `fixture-c-768-light-exploded-z1-middle-t2` | px | head `final1` = base `stageB2` | PASS |
| `fixture-c-768-light-exploded-z2-middle-t2` | px | none | FAIL |
| `fixture-c-768-light-exploded-z3-bottom-t3` | px + dom | none | FAIL |
| `fixture-c-768-light-exploded-z4-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `fixture-a-1440-light-exploded-z1-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `fixture-a-1440-light-exploded-z3-middle-t2` | px | head `final1` = base `stageB3` | PASS |
| `fixture-a-1440-light-exploded-z4-middle-t1` | px | none | FAIL |
| `fixture-b-1440-light-exploded-z2-top-t0` | px + dom | head `final1` = base `stageB3` | PASS |
| `fixture-b-1440-light-exploded-z2-middle-t2` | px | head `final1` = base `stageB2` | PASS |
| `fixture-b-1440-light-exploded-z4-top-t0` | px + dom | none | FAIL |
| `fixture-c-1440-light-exploded-z1-top-t0` | px + dom | none | FAIL |
| `fixture-a-390-dark-exploded-z2-middle-t3` | px | none | FAIL |
| `fixture-a-390-dark-exploded-z4-middle-t3` | px | none | FAIL |
| `fixture-b-390-dark-exploded-z2-middle-t2` | px | none | FAIL |
| `fixture-b-390-dark-exploded-z3-top-t0` | px + dom | none | FAIL |
| `fixture-b-390-dark-exploded-z5-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `fixture-c-390-dark-exploded-z1-middle-t1` | px | none | FAIL |
| `fixture-c-390-dark-exploded-z1-middle-t3` | px | none | FAIL |
| `fixture-c-390-dark-exploded-z3-middle-t1` | px | none | FAIL |
| `fixture-c-390-dark-exploded-z3-middle-t2` | px | none | FAIL |
| `fixture-a-768-dark-exploded-z3-middle-t2` | px | head `final1` = base `stageB2` | PASS |
| `fixture-a-768-dark-exploded-z3-middle-t3` | px | none | FAIL |
| `fixture-b-768-dark-exploded-z4-middle-t2` | px | head `final1` = base `stageB3` | PASS |
| `fixture-c-768-dark-imploded-z0-n-a-t3` | px + dom | none | FAIL |
| `fixture-c-768-dark-exploded-z0-n-a-t0` | px + dom | none | FAIL |
| `fixture-c-768-dark-exploded-z0-n-a-t3` | px + dom | head `final1` = base `stageB2` | PASS |
| `fixture-c-768-dark-exploded-z2-middle-t2` | px | head `final1` = base `stageB3` | PASS |
| `fixture-a-1440-dark-exploded-z5-middle-t1` | px | head `final1` = base `stageB2` | PASS |
| `fixture-b-1440-dark-exploded-z5-middle-t1` | px | none | FAIL |
| `fixture-c-1440-dark-exploded-z4-bottom-t3` | px | none | FAIL |

reproduce: FAIL (1733 gated cells, 1689 reproduced, 44 never matched)
