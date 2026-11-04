# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 77 | 907.6183 | 0 | 2590.5 |
| r1-2 | 1 | 79.5 | 906.4353 | 0 | 2578.5 |
| r1-3 | 0.99 | 105.5 | 907.9259 | 0 | 2248.5 |
| r1 median | 1 | 79.5 | 907.6183 | 0 | 2578.5 |
| r2-1 | 1 | 84 | 907.4861 | 0 | 2314.5 |
| r2-2 | 1 | 87 | 907.6261 | 0 | 2319 |
| r2-3 | 1 | 86 | 906.0766 | 0 | 2315.5 |
| r2 median | 1 | 86 | 907.4861 | 0 | 2315.5 |
| two-invocation median | 1 | 82.75 | 907.5522 | 0 | 2447 |

Median runs: r1 #2, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-3 | 10kujx8nsd3ck.js | 2194.9259 | 179 |
| r2-2 | 10kujx8nsd3ck.js | 2107.6261 | 137 |
| r2-3 | 10kujx8nsd3ck.js | 2147.0766 | 136 |
| r2-1 | 10kujx8nsd3ck.js | 2149.4861 | 134 |
| r1-2 | 10kujx8nsd3ck.js | 2153.4353 | 130 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 55.5 | 906.4615 | 0 | 2359.5 |
| r1-2 | 0.99 | 94 | 904.8609 | 0 | 2250.5 |
| r1-3 | 0.99 | 84 | 1807.4574 | 0 | 2368 |
| r1 median | 0.99 | 84 | 906.4615 | 0 | 2359.5 |
| r2-1 | 1 | 56 | 906.0923 | 0 | 2411.5 |
| r2-2 | 1 | 82 | 906.0298 | 0 | 2386.5 |
| r2-3 | 1 | 82 | 905.3919 | 0 | 2425.5 |
| r2 median | 1 | 82 | 906.0298 | 0 | 2411.5 |
| two-invocation median | 0.995 | 83 | 906.2457 | 0 | 2385.5 |

Median runs: r1 #3, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 10kujx8nsd3ck.js | 2145.8609 | 144 |
| r2-1 | 10kujx8nsd3ck.js | 2211.0923 | 136 |
| r1-3 | 10kujx8nsd3ck.js | 2107.4574 | 134 |
| r1-1 | 10kujx8nsd3ck.js | 2203.4615 | 133 |
| r2-2 | 10kujx8nsd3ck.js | 2106.0298 | 132 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.96 | 211 | 914.5832 | 0 | 2380.5 |
| r1-2 | 0.97 | 201.5 | 911.4221 | 0 | 2374 |
| r1-3 | 0.97 | 208.5 | 907.8398 | 0 | 2480.5 |
| r1 median | 0.97 | 208.5 | 911.4221 | 0 | 2380.5 |
| r2-1 | 0.96 | 210 | 907.2313 | 0 | 2551 |
| r2-2 | 0.96 | 213 | 907.724 | 0 | 2395 |
| r2-3 | 0.97 | 203 | 912.2449 | 0 | 2443.5 |
| r2 median | 0.96 | 210 | 907.724 | 0 | 2443.5 |
| two-invocation median | 0.965 | 209.25 | 909.5731 | 0 | 2412 |

Median runs: r1 #3, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-1 | 1kgrt2f4mrm63.js | 2343.2313 | 143 |
| r2-2 | 1kgrt2f4mrm63.js | 2411.724 | 143 |
| r1-3 | 1kgrt2f4mrm63.js | 2445.8398 | 140 |
| r1-1 | 10kujx8nsd3ck.js | 2114.5832 | 136 |
| r1-1 | 1kgrt2f4mrm63.js | 2307.5832 | 136 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.93 | 328 | 913.0658 | 0 | 2546 |
| r1-2 | 0.92 | 363 | 906.4775 | 0 | 2472.5 |
| r1-3 | 0.92 | 341 | 905.6659 | 0 | 2554 |
| r1 median | 0.92 | 341 | 906.4775 | 0 | 2546 |
| r2-1 | 0.92 | 360 | 908.2823 | 0 | 2456.5 |
| r2-2 | 0.9 | 421.3145 | 907.371 | 0 | 2534.5 |
| r2-3 | 0.93 | 324 | 905.9114 | 0 | 2467.5 |
| r2 median | 0.92 | 360 | 907.371 | 0 | 2467.5 |
| two-invocation median | 0.92 | 350.5 | 906.9243 | 0 | 2506.75 |

Median runs: r1 #2, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-2 | 3vnmkhfgdnq2d.js | 4106.742 | 203 |
| r2-1 | 1kgrt2f4mrm63.js | 2302.2823 | 192 |
| r1-3 | 1kgrt2f4mrm63.js | 2293.6659 | 180 |
| r2-2 | 1kgrt2f4mrm63.js | 2342.371 | 168 |
| r1-2 | 1kgrt2f4mrm63.js | 2413.4775 | 167 |

**Verdict:** keep the gate
