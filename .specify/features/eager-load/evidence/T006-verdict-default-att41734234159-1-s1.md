# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 46 | 905.9091 | 0 | 3421.5 |
| r1-2 | 1 | 45 | 906.5198 | 0 | 3365.5 |
| r1-3 | 1 | 47 | 904.0029 | 0 | 3260 |
| r1 median | 1 | 46 | 905.9091 | 0 | 3365.5 |
| r2-1 | 1 | 45 | 903.5472 | 0 | 3239 |
| r2-2 | 0.99 | 47 | 2204.535 | 0 | 3334.5 |
| r2-3 | 1 | 45 | 1804.4137 | 0 | 3295.5 |
| r2 median | 1 | 45 | 1804.4137 | 0 | 3295.5 |
| two-invocation median | 1 | 45.5 | 1355.1614 | 0 | 3330.5 |

Median runs: r1 #1, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-3 | Unattributable | 752.2069 | 112 |
| r1-1 | Unattributable | 752.9546 | 104 |
| r1-3 | 10kujx8nsd3ck.js | 2104.0029 | 97 |
| r2-2 | 10kujx8nsd3ck.js | 2107.535 | 97 |
| r1-1 | 10kujx8nsd3ck.js | 2105.9091 | 96 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 46 | 905.1641 | 0 | 3417 |
| r1-2 | 1 | 24 | 904.9717 | 0 | 3340.5 |
| r1-3 | 1 | 45 | 904.6876 | 0 | 3274 |
| r1 median | 1 | 45 | 904.9717 | 0 | 3340.5 |
| r2-1 | 1 | 46 | 904.0732 | 0 | 3458 |
| r2-2 | 1 | 45 | 904.6863 | 0 | 3437 |
| r2-3 | 1 | 46 | 903.7846 | 0 | 3334 |
| r2 median | 1 | 46 | 904.0732 | 0 | 3437 |
| two-invocation median | 1 | 45.5 | 904.5225 | 0 | 3388.75 |

Median runs: r1 #2, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 10kujx8nsd3ck.js | 2404.9717 | 98 |
| r2-3 | 10kujx8nsd3ck.js | 2103.7846 | 96 |
| r2-1 | 10kujx8nsd3ck.js | 2104.0732 | 96 |
| r1-1 | 10kujx8nsd3ck.js | 2105.1641 | 96 |
| r2-2 | 10kujx8nsd3ck.js | 2104.6863 | 95 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 80.5 | 909.7917 | 0 | 3332 |
| r1-2 | 1 | 76.5 | 905.0599 | 0 | 3396 |
| r1-3 | 1 | 81.5 | 905.1977 | 0 | 3365.5 |
| r1 median | 1 | 80.5 | 905.1977 | 0 | 3365.5 |
| r2-1 | 1 | 84 | 904.9207 | 0 | 3299 |
| r2-2 | 1 | 79 | 905.0948 | 0 | 3328.5 |
| r2-3 | 1 | 86 | 906.4531 | 0 | 3364.5 |
| r2 median | 1 | 84 | 905.0948 | 0 | 3328.5 |
| two-invocation median | 1 | 82.25 | 905.1463 | 0 | 3347 |

Median runs: r1 #3, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-3 | 1kgrt2f4mrm63.js | 3383.1327 | 99 |
| r2-3 | 10kujx8nsd3ck.js | 2106.4531 | 98 |
| r2-1 | 10kujx8nsd3ck.js | 2104.9207 | 97 |
| r2-2 | 10kujx8nsd3ck.js | 2105.0948 | 97 |
| r1-3 | 10kujx8nsd3ck.js | 2105.1977 | 96 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.98 | 179.1523 | 907.3906 | 0 | 3283.5 |
| r1-2 | 0.97 | 185.7851 | 904.8595 | 0 | 3280 |
| r1-3 | 0.99 | 128.7662 | 909.4677 | 0 | 3232.5 |
| r1 median | 0.98 | 179.1523 | 907.3906 | 0 | 3280 |
| r2-1 | 0.99 | 120 | 904.8831 | 0 | 3455.5 |
| r2-2 | 0.96 | 243.5161 | 907.9357 | 0 | 3244.5 |
| r2-3 | 0.99 | 135 | 903.9699 | 0 | 3303 |
| r2 median | 0.99 | 135 | 904.8831 | 0 | 3303 |
| two-invocation median | 0.985 | 157.0762 | 906.1369 | 0 | 3291.5 |

Median runs: r1 #1, r2 #3.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-2 | 1kgrt2f4mrm63.js | 3701.8393 | 133 |
| r2-2 | 3vnmkhfgdnq2d.js | 4076.8393 | 132 |
| r2-3 | Unattributable | 751.985 | 128 |
| r1-1 | 1kgrt2f4mrm63.js | 3737.4765 | 119 |
| r1-3 | 1kgrt2f4mrm63.js | 3697.6693 | 117 |

**Verdict:** recommend retiring D-19
