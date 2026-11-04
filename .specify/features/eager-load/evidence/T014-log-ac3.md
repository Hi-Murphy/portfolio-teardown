# T014 — AC3 on the final state

Verdict run: `41750211660` attempt `1`, head `f6b342a`. Its `apps/` and
`packages/` trees are identical to the final lever state `3491e3f` (empty
product diff). Qualification is every Lighthouse run in the attempt having
`benchmarkIndex` in `[1900, 2600]`; the first two qualifying attempts in time
order decide AC3.

AC3 FAIL

The deciding attempts are `s1` (runner `GitHub Actions 1000000783`) and `s3`
(runner `GitHub Actions 1000000784`) in that order. `s2` is listed only because
its Lighthouse indices fall outside the slow-class band.

## Tool output

Command (artifact paths shown relative to the downloaded attempt root):

```sh
node tools/perf/src/cli/eager-verdict.ts --rule s11.7 \
  --dir .evidence/ci/eager-load-41750211660-1-s1 \
  --dir .evidence/ci/eager-load-41750211660-1-s3 \
  --dir .evidence/ci/eager-load-41750211660-1-s2
```

```text
# Eager 3D Lighthouse — S11.7 AC3

Qualification: every Lighthouse run has benchmarkIndex in [1900, 2600].
The first two qualifying attempts in time order decide AC3; later qualifying attempts are listed only.

| Attempt | Runner | benchmarkIndex (min/median/max) | Qualifies | Counted | Home | Project |
|---|---|---:|---|---|---|---|
| .evidence/ci/eager-load-41750211660-1-s2 | GitHub Actions 1000000782 | 2698 / 2899.5 / 3029.5 | no | no | PASS (a:Y b:N; eager TBT 146.25, gated 56) | FAIL (a:N b:N; eager TBT 230.6517, gated 54) |
| .evidence/ci/eager-load-41750211660-1-s1 | GitHub Actions 1000000783 | 2248.5 / 2418.5 / 2590.5 | yes | yes | FAIL (a:N b:N; eager TBT 209.25, gated 82.75) | FAIL (a:N b:N; eager TBT 350.5, gated 83) |
| .evidence/ci/eager-load-41750211660-1-s3 | GitHub Actions 1000000784 | 2020.5 / 2323.75 / 2541.5 | yes | yes | FAIL (a:N b:N; eager TBT 210, gated 86) | FAIL (a:N b:N; eager TBT 380.5322, gated 87) |

**AC3:** FAIL
- both routes must pass on the first two qualifying attempts
ac3-verdict: .evidence/ci/ac3-verdict.json
```

## Per-attempt detail

Each eager/gated value is the mean of the two Lighthouse invocation medians;
each invocation is a median of three runs. `eager − gated` is the TBT delta in
milliseconds. Rule (a) is eager performance `>= 0.95` and TBT `<= 200 ms`; rule
(b) is `eager − gated <= 50 ms`.

| Attempt | Runner | Index min / median / max | Qualifies | Counted | Route | Eager perf / TBT | Gated perf / TBT | Eager − gated | Rule a | Rule b | Pass |
|---|---|---:|---|---|---|---:|---:|---:|---|---|---|
| `s1` | GitHub Actions 1000000783 | 2248.5 / 2418.5 / 2590.5 | yes | yes | home | 0.965 / 209.2500 | 1 / 82.7500 | 126.5000 | no | no | FAIL |
| `s1` | GitHub Actions 1000000783 | 2248.5 / 2418.5 / 2590.5 | yes | yes | project | 0.92 / 350.5000 | 0.995 / 83.0000 | 267.5000 | no | no | FAIL |
| `s3` | GitHub Actions 1000000784 | 2020.5 / 2323.75 / 2541.5 | yes | yes | home | 0.965 / 210.0000 | 1 / 86.0000 | 124.0000 | no | no | FAIL |
| `s3` | GitHub Actions 1000000784 | 2020.5 / 2323.75 / 2541.5 | yes | yes | project | 0.91 / 380.5322 | 0.99 / 87.0000 | 293.5322 | no | no | FAIL |
| `s2` | GitHub Actions 1000000782 | 2698 / 2899.5 / 3029.5 | no | no | home | 0.99 / 146.2500 | 1 / 56.0000 | 90.2500 | yes | no | PASS |
| `s2` | GitHub Actions 1000000782 | 2698 / 2899.5 / 3029.5 | no | no | project | 0.96 / 230.6517 | 1 / 54.0000 | 176.6517 | no | no | FAIL |

AC3 FAIL: both deciding attempts fail both routes, and the tool records
`both routes must pass on the first two qualifying attempts`. Paths in the
copied tool output were sanitised with the T006 path substitutions.
