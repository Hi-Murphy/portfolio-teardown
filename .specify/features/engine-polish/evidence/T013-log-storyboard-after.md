# command: node storyboard-timing.mjs <repo> <baseUrl> | base: http://127.0.0.1:4614 | chromium: 156.0.8078.4 | commit: 9b73eed+working-tree
# labels: data-xploder-lettering=shown from MutationObserver; elements: [data-xploder-label], [data-xploder-lettering], [data-xploder-lettering-layer-label]
# tour-end hold: data-xploder-tour=ended to the next data-hero-phase change in the same flow

| viewport | phase | start ms | end ms | duration ms | labels visible ms | label elements |
|---|---|---:|---:|---:|---:|---:|
| 1440x900 | implode | 0 | 2201.8 | 2201.8 | 0 | 16 |
| 1440x900 | explode | 2201.8 | 6805 | 4603.2 | 3395.6 | 16 |
| 1440x900 | zoomin | 6805 | 9159.8 | 2354.8 | 1749.1 | 39 |
| 1440x900 | capture | 9159.8 | 21964.7 | 12804.9 | 0 | 16 |
| 1440x900 | inspect | 21964.7 | 34769.7 | 12805 | 0 | 16 |
| 1440x900 | turn | 34769.7 | 39571.3 | 4801.6 | 2980.5 | 34 |
| 390x844 | implode | 0 | 2202.3 | 2202.3 | 0 | 16 |
| 390x844 | explode | 2202.3 | 6804.4 | 4602.1 | 3385.8 | 16 |
| 390x844 | zoomin | 6804.4 | 9160.1 | 2355.7 | 1723.1 | 38 |
| 390x844 | capture | 9160.1 | 21966.1 | 12806 | 0 | 16 |
| 390x844 | inspect | 21966.1 | 34771 | 12804.9 | 0 | 16 |
| 390x844 | turn | 34771 | 39574 | 4803 | 2951.7 | 30 |

summary 1440x900: labelled exploded view visible 3.40 s; zoomed view visible 1.75 s; tour-end holds 1.61 s + 1.61 s; loop 39.57 s
summary 390x844: labelled exploded view visible 3.39 s; zoomed view visible 1.72 s; tour-end holds 1.61 s + 1.61 s; loop 39.57 s
SUMMARY_JSON [{"viewport":"1440x900","loopMs":39571.30000001192,"explodedLabelsMs":3395.5999999940395,"zoomedLabelsMs":1749.0999999940395,"holdsMs":[1607.0999999940395,1607.0999999940395]},{"viewport":"390x844","loopMs":39574,"explodedLabelsMs":3385.800000011921,"zoomedLabelsMs":1723.0999999940395,"holdsMs":[1605.7999999821186,1607.5]}]
