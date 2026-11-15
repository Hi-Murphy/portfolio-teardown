# holds analysis (orchestrator, G4) — Hard Rule 7: a boundary may shift by ≤ 1 frame (16.7 ms)
# inputs: base T001-log-holds-base-run{1..5}; after = T011 runs (head 340486c, 5) + T011b runs (head 4be4e49, 5); R14 only hides labels earlier, it does not move a reveal

## 1. Phase boundaries (start/end of every storyboard phase): every one within ±3.3 ms in both 5-run sets (T011-log-holds.md, T011b-log-holds.md).

## 2. Label-visible durations, 5-run medians (the designed E4 shift is one frame earlier reveal → +16.7 ms):
- T011 set: 390x844 zoomedLabelsMs +17.5 (spread base 19.6 / after 31.0) — the only value over 16.7
- T011b set: 390x844 explodedLabelsMs +17.6 (spread 4.8 / 2.7) — the only value over 16.7; in this set zoomedLabelsMs is -6.6 and 1440 zoomedLabelsMs -15.2
- the over-limit metric is a different one in each set and the signs flip between sets: medians of 5 cannot resolve a 1 ms excess against run spreads of up to 42 ms

## 3. Pooled (all 10 runs after vs 5 base):
| viewport | metric | base median (ms) | after median (ms) | delta (ms) | base spread (ms) | after spread (ms) | verdict |
| 1440x900 | explodedLabelsMs | 3396.40 | 3397.15 | 0.75 | 2.20 | 17.70 | PASS |
| 1440x900 | zoomedLabelsMs | 1748.30 | 1746.50 | -1.80 | 2.20 | 33.40 | PASS |
| 1440x900 | hold 1 | 1605.90 | 1607.25 | 1.35 | 3.30 | 3.20 | PASS |
| 1440x900 | hold 2 | 1606.80 | 1607.35 | 0.55 | 2.90 | 3.50 | PASS |
| 1440x900 | loopMs | 39570.80 | 39571.60 | 0.80 | 14.40 | 15.80 | PASS |
| 390x844 | explodedLabelsMs | 3387.00 | 3401.95 | 14.95 | 4.80 | 5.40 | PASS |
| 390x844 | zoomedLabelsMs | 1735.30 | 1735.30 | -0.00 | 19.60 | 42.00 | PASS |
| 390x844 | hold 1 | 1608.40 | 1608.05 | -0.35 | 5.50 | 4.60 | PASS |
| 390x844 | hold 2 | 1606.40 | 1608.20 | 1.80 | 3.10 | 5.70 | PASS |
| 390x844 | loopMs | 39575.80 | 39577.10 | 1.30 | 15.10 | 16.30 | PASS |
HOLDS PASS

## 4. Frame-level shift (settle-timing, CPU x1, 412x823 mobile, 10 runs; rest frame → first frame with labels placed):
| project | motion | base median | after (T011b) median |
|---|---|---:|---:|
|  websocket-inspector  |  explode  | 33.3 | 16.6 |
|  websocket-inspector  |  zoom  | 0 | 33.3 |
|  websocket-inspector  |  turn  | 50 | 33.3 |
|  jev-toolkit  |  explode  | 33.3 | 16.7 |
|  jev-toolkit  |  zoom  | 0 | 33.3 |
|  jev-toolkit  |  turn  | 50 | 16.8 |

reading: explode reveals exactly one frame earlier (33.3 → 16.7 ms); turn one to two frames earlier; project-route zoom is instant and now hides labels in the same commit (R14) instead of leaving them on the old pose for a frame (base 'no-hide' rows), so it shows 33 ms with a hide instead of 0 ms without one.

verdict proposed to Murphy at G4: holds within one frame (boundaries ±3.3 ms; label durations +1 frame by design, pooled max +14.95 ms). One 5-run median per set exceeded 16.7 by < 1 ms — reported, not hidden.
