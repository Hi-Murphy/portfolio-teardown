# T011 — eager-verdict tables, CI runner (both runs, verbatim output of eager-verdict.ts)

## Run 1 — https://github.com/Hi-Murphy/portfolio-teardown/actions/runs/41637668830 (attempt 1)

# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 39 | 909.6516 | 0 | 3814.5 |
| r1-2 | 1 | 40 | 904.3905 | 0 | 3620.5 |
| r1-3 | 1 | 42 | 904.802 | 0 | 3840.5 |
| r1 median | 1 | 40 | 904.802 | 0 | 3814.5 |
| r2-1 | 1 | 44 | 905.764 | 0 | 3757 |
| r2-2 | 1 | 41 | 907.6057 | 0 | 3474 |
| r2-3 | 1 | 20 | 904.6873 | 0 | 3964.5 |
| r2 median | 1 | 41 | 905.764 | 0 | 3757 |
| two-invocation median | 1 | 40.5 | 905.283 | 0 | 3785.75 |

Median runs: r1 #3, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-1 | Unattributable | 752.882 | 106 |
| r2-1 | 10kujx8nsd3ck.js | 2105.764 | 94 |
| r1-3 | 10kujx8nsd3ck.js | 2104.802 | 92 |
| r2-2 | 10kujx8nsd3ck.js | 2107.6057 | 91 |
| r1-2 | 10kujx8nsd3ck.js | 2104.3905 | 90 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 40 | 905.9963 | 0 | 3893.5 |
| r1-2 | 1 | 44 | 904.875 | 0 | 3640 |
| r1-3 | 1 | 44 | 906.0167 | 0 | 3888.5 |
| r1 median | 1 | 44 | 905.9963 | 0 | 3888.5 |
| r2-1 | 1 | 39 | 904.2759 | 0 | 3734 |
| r2-2 | 1 | 42 | 905.7442 | 0 | 3820.5 |
| r2-3 | 1 | 45 | 907.6531 | 0 | 3741.5 |
| r2 median | 1 | 42 | 905.7442 | 0 | 3741.5 |
| two-invocation median | 1 | 43 | 905.8703 | 0 | 3815 |

Median runs: r1 #1, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-2 | Unattributable | 752.8721 | 100 |
| r2-3 | 1kgrt2f4mrm63.js | 2107.6531 | 95 |
| r1-2 | 1kgrt2f4mrm63.js | 2104.875 | 94 |
| r1-3 | 10kujx8nsd3ck.js | 2106.0167 | 94 |
| r2-2 | 10kujx8nsd3ck.js | 2105.7442 | 92 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 63 | 906.7708 | 0 | 3782.5 |
| r1-2 | 1 | 71 | 906.3198 | 0 | 3836 |
| r1-3 | 1 | 73.5 | 904.1633 | 0 | 3807.5 |
| r1 median | 1 | 71 | 906.3198 | 0 | 3807.5 |
| r2-1 | 1 | 72 | 904.7707 | 0 | 4025 |
| r2-2 | 0.99 | 96 | 905.9058 | 0 | 3776 |
| r2-3 | 1 | 64 | 906.1858 | 0 | 3923.5 |
| r2 median | 1 | 72 | 905.9058 | 0 | 3923.5 |
| two-invocation median | 1 | 71.5 | 906.1128 | 0 | 3865.5 |

Median runs: r1 #2, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-1 | 10kujx8nsd3ck.js | 2104.7707 | 95 |
| r1-3 | 10kujx8nsd3ck.js | 2104.1633 | 92 |
| r1-3 | 1kgrt2f4mrm63.js | 3377.4083 | 92 |
| r1-2 | 10kujx8nsd3ck.js | 2106.3198 | 89 |
| r2-2 | 10kujx8nsd3ck.js | 2105.9058 | 89 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.99 | 117.5 | 909.0088 | 0 | 3993.5 |
| r1-2 | 0.99 | 110 | 905.8471 | 0 | 3887.5 |
| r1-3 | 0.99 | 102 | 905.0276 | 0 | 3906 |
| r1 median | 0.99 | 110 | 905.8471 | 0 | 3906 |
| r2-1 | 0.99 | 99 | 907.7644 | 0 | 3905 |
| r2-2 | 0.98 | 161.5968 | 905.6127 | 0 | 3783 |
| r2-3 | 0.99 | 102 | 906.8668 | 0 | 3878.5 |
| r2 median | 0.99 | 102 | 906.8668 | 0 | 3878.5 |
| two-invocation median | 0.99 | 106 | 906.357 | 0 | 3892.25 |

Median runs: r1 #2, r2 #3.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 1kgrt2f4mrm63.js | 3739.6178 | 114 |
| r1-1 | 1kgrt2f4mrm63.js | 3689.522 | 110 |
| r2-1 | 1kgrt2f4mrm63.js | 3684.411 | 109 |
| r2-3 | 1kgrt2f4mrm63.js | 3738.167 | 108 |
| r2-2 | 1kgrt2f4mrm63.js | 3727.0318 | 105 |

**Verdict:** recommend retiring D-19

## Run 2 — same run, attempt 2 (gh run rerun)

# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.99 | 112 | 910.5073 | 0 | 2191 |
| r1-2 | 1 | 88 | 908.7854 | 0 | 2175.5 |
| r1-3 | 0.99 | 106 | 908.227 | 0 | 2241.5 |
| r1 median | 0.99 | 106 | 908.7854 | 0 | 2191 |
| r2-1 | 1 | 76.1163 | 906.7673 | 0 | 2189.5 |
| r2-2 | 1 | 60 | 908.3023 | 0 | 2226.5 |
| r2-3 | 0.99 | 96 | 905.7833 | 0 | 2205 |
| r2 median | 1 | 76.1163 | 906.7673 | 0 | 2205 |
| two-invocation median | 0.995 | 91.0582 | 907.7764 | 0 | 2198 |

Median runs: r1 #1, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-1 | 10kujx8nsd3ck.js | 2157.5073 | 162 |
| r1-3 | 10kujx8nsd3ck.js | 2161.227 | 157 |
| r2-2 | 10kujx8nsd3ck.js | 2239.3023 | 150 |
| r2-3 | 10kujx8nsd3ck.js | 2150.7833 | 146 |
| r2-1 | 10kujx8nsd3ck.js | 2211.7673 | 145 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 78 | 908.1674 | 0 | 2174 |
| r1-2 | 0.99 | 114 | 909.4403 | 0 | 2200.5 |
| r1-3 | 1 | 77.5 | 907.2178 | 0 | 2162.5 |
| r1 median | 1 | 78 | 908.1674 | 0 | 2174 |
| r2-1 | 0.99 | 98 | 909.1639 | 0 | 2250 |
| r2-2 | 1 | 74.5 | 907.9188 | 0 | 2194 |
| r2-3 | 1 | 88 | 909.0285 | 0 | 2275.5 |
| r2 median | 1 | 88 | 909.0285 | 0 | 2250 |
| two-invocation median | 1 | 83 | 908.598 | 0 | 2212 |

Median runs: r1 #3, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 10kujx8nsd3ck.js | 2163.4403 | 165 |
| r2-3 | 10kujx8nsd3ck.js | 2247.0285 | 163 |
| r1-1 | 10kujx8nsd3ck.js | 2215.1674 | 159 |
| r2-2 | 10kujx8nsd3ck.js | 2234.9188 | 155 |
| r1-3 | 10kujx8nsd3ck.js | 2203.2178 | 153 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.94 | 297 | 909.5847 | 0 | 2233.5 |
| r1-2 | 0.95 | 249 | 914.345 | 0 | 2143 |
| r1-3 | 0.95 | 255 | 911.7523 | 0 | 2148 |
| r1 median | 0.95 | 255 | 911.7523 | 0 | 2148 |
| r2-1 | 0.95 | 265.5 | 908.1038 | 0 | 2168 |
| r2-2 | 0.96 | 239.5 | 914.3912 | 0 | 2129 |
| r2-3 | 0.94 | 290.5 | 911.6323 | 0 | 2147 |
| r2 median | 0.95 | 265.5 | 911.6323 | 0 | 2147 |
| two-invocation median | 0.95 | 260.25 | 911.6923 | 0 | 2147.5 |

Median runs: r1 #3, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-3 | 1kgrt2f4mrm63.js | 3578.4485 | 173 |
| r2-1 | 1kgrt2f4mrm63.js | 3561.1557 | 171 |
| r1-1 | 1kgrt2f4mrm63.js | 2236.5847 | 164 |
| r2-2 | 10kujx8nsd3ck.js | 2251.3912 | 161 |
| r1-3 | 1kgrt2f4mrm63.js | 3628.6285 | 153 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.87 | 511.5 | 910.9039 | 0 | 2221.5 |
| r1-2 | 0.86 | 567.3781 | 915.5125 | 0 | 2256 |
| r1-3 | 0.88 | 487.9855 | 907.9418 | 0 | 2165.5 |
| r1 median | 0.87 | 511.5 | 910.9039 | 0 | 2221.5 |
| r2-1 | 0.87 | 500.6548 | 916.6194 | 0 | 2214.5 |
| r2-2 | 0.85 | 575.5183 | 908.0733 | 0 | 2161 |
| r2-3 | 0.87 | 495 | 913.6226 | 0 | 2135 |
| r2 median | 0.87 | 500.6548 | 913.6226 | 0 | 2161 |
| two-invocation median | 0.87 | 506.0774 | 912.2633 | 0 | 2191.25 |

Median runs: r1 #1, r2 #3.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-3 | 1kgrt2f4mrm63.js | 3927.9127 | 212 |
| r2-3 | 1kgrt2f4mrm63.js | 4003.4339 | 211 |
| r2-1 | 1kgrt2f4mrm63.js | 4010.9291 | 208 |
| r2-2 | 3vwpvuyn90046.js | 3381.11 | 202 |
| r1-1 | 1kgrt2f4mrm63.js | 4013.3559 | 198 |

**Verdict:** keep the gate
