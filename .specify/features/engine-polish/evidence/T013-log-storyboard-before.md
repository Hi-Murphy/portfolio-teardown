# command: node storyboard-timing.mjs <repo> <baseUrl> | base: http://127.0.0.1:4615 | chromium: 156.0.8078.4 | commit: a9edbfc
# labels: data-xploder-lettering=shown from MutationObserver; elements: [data-xploder-label], [data-xploder-lettering], [data-xploder-lettering-layer-label]
# tour-end hold: data-xploder-tour=ended to the next data-hero-phase change in the same flow

| viewport | phase | start ms | end ms | duration ms | labels visible ms | label elements |
|---|---|---:|---:|---:|---:|---:|
| 1440x900 | implode | 0 | 2202.3 | 2202.3 | 0 | 16 |
| 1440x900 | explode | 2202.3 | 3602.1 | 1399.8 | 193.8 | 16 |
| 1440x900 | zoomin | 3602.1 | 4353.4 | 751.3 | 138 | 39 |
| 1440x900 | capture | 4353.4 | 15555.8 | 11202.4 | 0 | 16 |
| 1440x900 | inspect | 15555.8 | 26764.4 | 11208.6 | 0 | 16 |
| 1440x900 | turn | 26764.4 | 31570.8 | 4806.4 | 2969.5 | 34 |
| 390x844 | implode | 0 | 2204.2 | 2204.2 | 0 | 16 |
| 390x844 | explode | 2204.2 | 3606.8 | 1402.6 | 185.9 | 16 |
| 390x844 | zoomin | 3606.8 | 4360.1 | 753.3 | 138.2 | 38 |
| 390x844 | capture | 4360.1 | 15562.5 | 11202.4 | 0 | 16 |
| 390x844 | inspect | 15562.5 | 26765 | 11202.5 | 0 | 16 |
| 390x844 | turn | 26765 | 31573.3 | 4808.3 | 2936.7 | 30 |

summary 1440x900: labelled exploded view visible 0.19 s; zoomed view visible 0.14 s; tour-end holds 0.00 s + 0.00 s; loop 31.57 s
summary 390x844: labelled exploded view visible 0.19 s; zoomed view visible 0.14 s; tour-end holds 0.00 s + 0.00 s; loop 31.57 s
SUMMARY_JSON [{"viewport":"1440x900","loopMs":31570.80000001192,"explodedLabelsMs":193.80000001192093,"zoomedLabelsMs":138,"holdsMs":[1.199999988079071,1.199999988079071]},{"viewport":"390x844","loopMs":31573.29999998212,"explodedLabelsMs":185.90000000596046,"zoomedLabelsMs":138.2000000178814,"holdsMs":[3.800000011920929,2.600000023841858]}]
