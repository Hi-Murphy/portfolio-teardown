# Eager 3D Lighthouse — S11.8 AC3

Qualification: every Lighthouse run has benchmarkIndex in [1900, 2600].
The first two qualifying attempts in time order decide AC3; later qualifying attempts are listed only.

| Attempt | Runner | benchmarkIndex (min/median/max) | Qualifies | Home | Project gated | Reproduction |
|---|---|---:|---|---|---|---|
| 41774295096-1-s2 | GitHub Actions 1000000860 | 1964 / 2267.75 / 2349.5 | yes | FAIL (a:N b:N; eager 219.25, gated 90) | PASS (88.5 in [78.85, 91.35]) | REPRODUCED |
| 41774295096-1-s3 | GitHub Actions 1000000863 | 2424.5 / 2496.75 / 2603.5 | no | FAIL (a:N b:N; eager 211.5, gated 66.25) | PASS (80 in [78.85, 91.35]) | NOT REPRODUCED |
| 41774295096-1-s1 | GitHub Actions 1000000869 | 2119.5 / 2290 / 2371.5 | yes | FAIL (a:N b:N; eager 205, gated 87.5) | FAIL (94.5 in [78.85, 91.35]) | REPRODUCED |

**AC3:** FAIL
- home must pass on the first two qualifying attempts
**AC5 project gated:** FAIL
**AC1:** REPRODUCED
s11.8-verdict: <local-path>/s118-checks/ci/41774295096-1/s11.8-verdict.json
