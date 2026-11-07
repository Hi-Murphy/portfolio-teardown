# Overlay-model target split

The E1b target is the unnamed task adjacent to the first content frame that carries the overlay-model chunk (`1y7jwsdsad7nj.js` before, `3q3_qibh-2sbv.js` after). At CPU 1 the model frames remain in the first-content-frame task; at CPU 4 the adjacent target task is above the reporting threshold.

| Run | Task | Start ms | Duration ms | Overlay-model chunk self ms | Share of task |
| --- | --- | ---: | ---: | ---: | ---: |
| before cpu1 r1 | first-content-frame | 198.900 | 11.300 | 1.472 | 13.03% |
| before cpu1 r2 | first-content-frame | 194.577 | 10.905 | 1.438 | 13.19% |
| after cpu1 r1 | first-content-frame | 195.969 | 10.757 | 1.524 | 14.17% |
| after cpu1 r2 | first-content-frame | 191.195 | 10.873 | 1.370 | 12.60% |
| before cpu4 r1 | unnamed target | 441.404 | 34.477 | 4.404 | 12.77% |
| before cpu4 r2 | unnamed target | 441.857 | 34.956 | 5.860 | 16.76% |
| after cpu4 r1 | unnamed target | 450.081 | 33.322 | 4.557 | 13.68% |
| after cpu4 r2 | unnamed target | 439.639 | 34.224 | 3.197 | 9.34% |

## D-P7 reading

| Target reading | Before median / spread | After median / spread | Delta | Larger spread | Keep rule |
| --- | ---: | ---: | ---: | ---: | --- |
| CPU 4 adjacent target task observed ms | 34.717 / 0.479 | 33.773 / 0.902 | 0.944 | 0.902 | **KEEP** |
| CPU 4 overlay-model chunk self ms | 5.132 / 1.456 | 3.877 / 1.360 | 1.255 | 1.456 | no measurable win |
| CPU 1 first-content-frame observed ms | 11.103 / 0.395 | 10.815 / 0.116 | 0.288 | 0.395 | no measurable win |

The keep rule is applied to the targeted task's observed milliseconds per D-P7, which gives a narrow local KEEP (0.944 ms delta versus 0.902 ms spread). The chunk self-time alone is inside the run spread, so it is not claimed as a separable win.
