# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 80 | 910.1747 | 0 | 2020.5 |
| r1-2 | 0.99 | 101 | 908.7292 | 0 | 2347 |
| r1-3 | 1 | 83 | 906.727 | 0 | 2307 |
| r1 median | 1 | 83 | 908.7292 | 0 | 2307 |
| r2-1 | 1 | 80 | 905.6008 | 0 | 2135.5 |
| r2-2 | 1 | 89 | 907.8944 | 0 | 2482.5 |
| r2-3 | 0.99 | 96 | 906.5987 | 0 | 2340.5 |
| r2 median | 1 | 89 | 906.5987 | 0 | 2340.5 |
| two-invocation median | 1 | 86 | 907.664 | 0 | 2323.75 |

Median runs: r1 #3, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 10kujx8nsd3ck.js | 2153.7292 | 151 |
| r2-3 | 1kgrt2f4mrm63.js | 2106.5987 | 146 |
| r2-2 | 10kujx8nsd3ck.js | 2152.8944 | 140 |
| r1-3 | 10kujx8nsd3ck.js | 2149.727 | 133 |
| r2-1 | 10kujx8nsd3ck.js | 2105.6008 | 130 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.99 | 111 | 908.8528 | 0 | 2278.5 |
| r1-2 | 0.99 | 81 | 1807.752 | 0 | 2224 |
| r1-3 | 1 | 56.5 | 905.0694 | 0 | 2205 |
| r1 median | 0.99 | 81 | 908.8528 | 0 | 2224 |
| r2-1 | 0.99 | 106 | 906.4415 | 0 | 2149.5 |
| r2-2 | 0.99 | 93 | 905.1405 | 0 | 2298.5 |
| r2-3 | 1 | 85 | 908.9596 | 0 | 2135.5 |
| r2 median | 0.99 | 93 | 906.4415 | 0 | 2149.5 |
| two-invocation median | 0.99 | 87 | 907.6471 | 0 | 2186.75 |

Median runs: r1 #2, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-1 | 10kujx8nsd3ck.js | 2157.8528 | 162 |
| r2-1 | 10kujx8nsd3ck.js | 2150.4415 | 156 |
| r2-2 | 10kujx8nsd3ck.js | 2146.1405 | 143 |
| r2-3 | 10kujx8nsd3ck.js | 2151.9596 | 135 |
| r1-3 | 10kujx8nsd3ck.js | 2201.0694 | 133 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.97 | 208 | 910.645 | 0 | 2360.5 |
| r1-2 | 0.96 | 223 | 907.8798 | 0 | 2362 |
| r1-3 | 0.96 | 217 | 906.2295 | 0 | 2348.5 |
| r1 median | 0.96 | 217 | 907.8798 | 0 | 2360.5 |
| r2-1 | 0.97 | 202 | 905.371 | 0 | 2411.5 |
| r2-2 | 0.97 | 203 | 909.6364 | 0 | 2242 |
| r2-3 | 0.96 | 240 | 905.5423 | 0 | 2216.5 |
| r2 median | 0.97 | 203 | 905.5423 | 0 | 2242 |
| two-invocation median | 0.965 | 210 | 906.7111 | 0 | 2301.25 |

Median runs: r1 #2, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 1kgrt2f4mrm63.js | 2296.8798 | 152 |
| r2-3 | 1kgrt2f4mrm63.js | 2405.5423 | 151 |
| r2-3 | 10kujx8nsd3ck.js | 2205.5423 | 142 |
| r1-1 | 10kujx8nsd3ck.js | 2152.645 | 139 |
| r1-3 | 1kgrt2f4mrm63.js | 2348.2295 | 139 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.92 | 351 | 908.0022 | 0 | 2383 |
| r1-2 | 0.89 | 447 | 906.9258 | 0 | 2426.5 |
| r1-3 | 0.92 | 360 | 906.8113 | 0 | 2368.5 |
| r1 median | 0.92 | 360 | 906.9258 | 0 | 2383 |
| r2-1 | 0.9 | 419 | 907.8226 | 0 | 2541.5 |
| r2-2 | 0.9 | 401.0643 | 911.8714 | 0 | 2351 |
| r2-3 | 0.91 | 388 | 907.1002 | 0 | 2267.5 |
| r2 median | 0.9 | 401.0643 | 907.8226 | 0 | 2351 |
| two-invocation median | 0.91 | 380.5322 | 907.3742 | 0 | 2367 |

Median runs: r1 #3, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 3vnmkhfgdnq2d.js | 4067.3145 | 209 |
| r2-1 | 1kgrt2f4mrm63.js | 2379.8226 | 207 |
| r2-2 | 1kgrt2f4mrm63.js | 2362.8714 | 193 |
| r1-1 | 1kgrt2f4mrm63.js | 2344.0022 | 180 |
| r1-3 | 1kgrt2f4mrm63.js | 2353.8113 | 178 |

**Verdict:** keep the gate
