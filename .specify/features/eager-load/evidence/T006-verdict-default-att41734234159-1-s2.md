# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 50 | 906.2961 | 0 | 3556 |
| r1-2 | 1 | 53 | 906.7003 | 0 | 3476.5 |
| r1-3 | 1 | 38 | 904.8584 | 0 | 3800.5 |
| r1 median | 1 | 50 | 906.2961 | 0 | 3556 |
| r2-1 | 1 | 43 | 904.5254 | 0 | 3791 |
| r2-2 | 1 | 44 | 903.4516 | 0 | 3825.5 |
| r2-3 | 1 | 44 | 905.8844 | 0 | 3628.5 |
| r2 median | 1 | 44 | 904.5254 | 0 | 3791 |
| two-invocation median | 1 | 47 | 905.4108 | 0 | 3673.5 |

Median runs: r1 #1, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 1kgrt2f4mrm63.js | 2106.7003 | 103 |
| r1-1 | 10kujx8nsd3ck.js | 2106.2961 | 100 |
| r1-1 | Unattributable | 753.1481 | 100 |
| r2-2 | 10kujx8nsd3ck.js | 2103.4516 | 94 |
| r2-3 | 10kujx8nsd3ck.js | 2105.8844 | 94 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 40 | 904.5401 | 0 | 3709 |
| r1-2 | 1 | 45 | 906.1766 | 0 | 3784.5 |
| r1-3 | 1 | 45 | 904.9544 | 0 | 3590.5 |
| r1 median | 1 | 45 | 904.9544 | 0 | 3709 |
| r2-1 | 1 | 44 | 905.7408 | 0 | 3856 |
| r2-2 | 1 | 45 | 905.5793 | 0 | 3635.5 |
| r2-3 | 1 | 48 | 904.3272 | 0 | 3414.5 |
| r2 median | 1 | 45 | 905.5793 | 0 | 3635.5 |
| two-invocation median | 1 | 45 | 905.2669 | 0 | 3672.25 |

Median runs: r1 #3, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-1 | Unattributable | 752.8704 | 116 |
| r2-3 | 1kgrt2f4mrm63.js | 2104.3272 | 98 |
| r1-3 | 10kujx8nsd3ck.js | 2104.9544 | 95 |
| r2-2 | 10kujx8nsd3ck.js | 2105.5793 | 95 |
| r1-2 | 10kujx8nsd3ck.js | 2106.1766 | 95 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 71.5 | 907.8155 | 0 | 3522 |
| r1-2 | 1 | 76 | 907.9569 | 0 | 3896 |
| r1-3 | 1 | 79 | 904.3182 | 0 | 3665.5 |
| r1 median | 1 | 76 | 907.8155 | 0 | 3665.5 |
| r2-1 | 1 | 66.5 | 904.1049 | 0 | 3813 |
| r2-2 | 1 | 78.5 | 905.4024 | 0 | 3792.5 |
| r2-3 | 1 | 74.5 | 906.2216 | 0 | 3515.5 |
| r2 median | 1 | 74.5 | 905.4024 | 0 | 3792.5 |
| two-invocation median | 1 | 75.25 | 906.609 | 0 | 3729 |

Median runs: r1 #1, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-3 | Unattributable | 753.1108 | 111 |
| r1-2 | 1kgrt2f4mrm63.js | 3389.8923 | 99 |
| r2-2 | 10kujx8nsd3ck.js | 2105.4024 | 97 |
| r1-3 | 10kujx8nsd3ck.js | 2104.3182 | 96 |
| r2-3 | 10kujx8nsd3ck.js | 2106.2216 | 95 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.99 | 103 | 907.5711 | 0 | 4097.5 |
| r1-2 | 0.99 | 99 | 905.5759 | 0 | 3948 |
| r1-3 | 0.99 | 102 | 907.8069 | 0 | 3976 |
| r1 median | 0.99 | 102 | 907.5711 | 0 | 3976 |
| r2-1 | 0.99 | 110.5 | 906.3757 | 0 | 3996.5 |
| r2-2 | 0.99 | 110.5 | 905.7492 | 0 | 3787 |
| r2-3 | 0.99 | 125.5 | 907.4913 | 0 | 3743.5 |
| r2 median | 0.99 | 110.5 | 906.3757 | 0 | 3787 |
| two-invocation median | 0.99 | 106.25 | 906.9734 | 0 | 3881.5 |

Median runs: r1 #1, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-1 | 1kgrt2f4mrm63.js | 3686.9392 | 110 |
| r2-3 | Unattributable | 753.7457 | 106 |
| r2-3 | 1kgrt2f4mrm63.js | 3685.7283 | 105 |
| r1-1 | 1kgrt2f4mrm63.js | 3689.9278 | 104 |
| r2-2 | 1kgrt2f4mrm63.js | 3737.373 | 103 |

**Verdict:** recommend retiring D-19
