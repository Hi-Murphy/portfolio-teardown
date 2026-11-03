# Eager 3D Lighthouse

AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.

## gated / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 84 | 910.4002 | 0 | 2114.5 |
| r1-2 | 0.99 | 93 | 906.2557 | 0 | 2203 |
| r1-3 | 1 | 52 | 905.187 | 0 | 2272 |
| r1 median | 1 | 84 | 906.2557 | 0 | 2203 |
| r2-1 | 1 | 81 | 906.1817 | 0 | 2293.5 |
| r2-2 | 1 | 85 | 906.2318 | 0 | 2295 |
| r2-3 | 1 | 61.5 | 906.1425 | 0 | 2275 |
| r2 median | 1 | 81 | 906.1817 | 0 | 2293.5 |
| two-invocation median | 1 | 82.5 | 906.2187 | 0 | 2248.25 |

Median runs: r1 #3, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-2 | 10kujx8nsd3ck.js | 2146.2557 | 143 |
| r1-3 | 10kujx8nsd3ck.js | 2216.187 | 136 |
| r2-2 | 10kujx8nsd3ck.js | 2106.2318 | 135 |
| r1-1 | 10kujx8nsd3ck.js | 2154.4002 | 135 |
| r2-3 | 10kujx8nsd3ck.js | 2197.1425 | 135 |

## gated / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 1 | 89 | 908.1728 | 0 | 2260.5 |
| r1-2 | 1 | 85 | 906.2106 | 0 | 2321 |
| r1-3 | 1 | 86 | 905.4347 | 0 | 2301 |
| r1 median | 1 | 86 | 906.2106 | 0 | 2301 |
| r2-1 | 1 | 87 | 906.9218 | 0 | 2351.5 |
| r2-2 | 1 | 86 | 906.87 | 0 | 2309.5 |
| r2-3 | 1 | 86 | 906.4803 | 0 | 2344 |
| r2 median | 1 | 86 | 906.87 | 0 | 2344 |
| two-invocation median | 1 | 86 | 906.5403 | 0 | 2322.5 |

Median runs: r1 #2, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-1 | 10kujx8nsd3ck.js | 2108.1728 | 139 |
| r2-1 | 10kujx8nsd3ck.js | 2106.9218 | 137 |
| r1-3 | 10kujx8nsd3ck.js | 2105.4347 | 136 |
| r2-2 | 10kujx8nsd3ck.js | 2106.87 | 136 |
| r2-3 | 10kujx8nsd3ck.js | 2150.4803 | 136 |

## eager / home

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.97 | 205.5 | 910.9182 | 0 | 2284 |
| r1-2 | 0.96 | 230 | 909.6978 | 0 | 2319 |
| r1-3 | 0.96 | 231.5 | 906.273 | 0 | 2295 |
| r1 median | 0.96 | 230 | 909.6978 | 0 | 2295 |
| r2-1 | 0.97 | 209.5 | 909.8079 | 0 | 2324.5 |
| r2-2 | 0.97 | 204.5 | 908.3479 | 0 | 2325.5 |
| r2-3 | 0.96 | 213.5 | 910.5156 | 0 | 2273.5 |
| r2 median | 0.97 | 209.5 | 909.8079 | 0 | 2324.5 |
| two-invocation median | 0.965 | 219.75 | 909.7529 | 0 | 2309.75 |

Median runs: r1 #2, r2 #2.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r1-3 | 1kgrt2f4mrm63.js | 3613.6825 | 147 |
| r1-2 | 10kujx8nsd3ck.js | 2199.6978 | 142 |
| r2-2 | 1kgrt2f4mrm63.js | 3484.5218 | 141 |
| r2-3 | 10kujx8nsd3ck.js | 2110.5156 | 140 |
| r2-3 | 1kgrt2f4mrm63.js | 3497.7734 | 140 |

## eager / project

| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |
|---:|---:|---:|---:|---:|---:|
| r1-1 | 0.91 | 374.5 | 910.6339 | 0 | 2305 |
| r1-2 | 0.92 | 348.6901 | 909.2397 | 0 | 2319 |
| r1-3 | 0.91 | 364.9816 | 908.0367 | 0 | 2266 |
| r1 median | 0.91 | 364.9816 | 909.2397 | 0 | 2305 |
| r2-1 | 0.91 | 370.5 | 909.286 | 0 | 2317.5 |
| r2-2 | 0.9 | 420.4989 | 910.0044 | 0 | 2296.5 |
| r2-3 | 0.91 | 383.2767 | 910.8934 | 0 | 2275 |
| r2 median | 0.91 | 383.2767 | 910.0044 | 0 | 2296.5 |
| two-invocation median | 0.91 | 374.1292 | 909.6221 | 0 | 2300.75 |

Median runs: r1 #1, r2 #1.

**Five longest tasks**

| Run | URL | Start (ms) | Duration (ms) |
|---:|---|---:|---:|
| r2-1 | 1kgrt2f4mrm63.js | 3958.929 | 199 |
| r1-1 | 1kgrt2f4mrm63.js | 3924.9509 | 178 |
| r1-3 | 1kgrt2f4mrm63.js | 3907.055 | 173 |
| r1-2 | 1kgrt2f4mrm63.js | 3868.8596 | 164 |
| r2-2 | 3vnmkhfgdnq2d.js | 4075.011 | 162 |

**Verdict:** keep the gate
