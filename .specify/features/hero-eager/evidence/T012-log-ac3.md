# T012 - AC3 on the final product state

CI run `42378433209`, attempt `1`, PR head `da757d2`. The shipped product is A1 + E1a; the
informational eager-project results do not change the route gate.

`eager-verdict --rule s11.8` was run over the three attempt directories in host-`startedAt` order:
`s2` (`13:46:23.065Z`), `s1` (`13:46:25.086Z`), `s3` (`13:46:27.150Z`). The rule ordered the
attempts by their embedded `startedAt` values, so the command's directory order did not affect the
result.

| Attempt | Runner | benchmarkIndex (min/median/max) | Qualifies | Home | Project gated |
|---|---|---:|---|---|---|
| `42378433209-1-s2` | GitHub Actions 1000000916 | 3587.5 / 4047.5 / 4306.5 | no | PASS (a:Y b:Y; eager 53.75, gated 34.5) | FAIL (32.5 in [78.85, 91.35]) |
| `42378433209-1-s1` | GitHub Actions 1000000917 | 2132 / 2284.75 / 2386.5 | yes | PASS (a:Y b:N; eager 175.5, gated 85) | PASS (90.5 in [78.85, 91.35]) |
| `42378433209-1-s3` | GitHub Actions 1000000915 | 2224.5 / 2293.75 / 2334.5 | yes | PASS (a:Y b:N; eager 157.75, gated 83.5) | PASS (83.5 in [78.85, 91.35]) |

**AC3 PASS** on both deciding attempts.

The deciding attempts are `s1` and `s3`: both are slow-class, both use distinct runner names, and
both pass home rule (a). `s2` is not slow-class and is listed only. Both deciding attempts also pass
the project-gated band.

Raw attempt records:

- `T012-host-meta-att42378433209-1-s2.json`
- `T012-host-meta-att42378433209-1-s1.json`
- `T012-host-meta-att42378433209-1-s3.json`
- `T012-per-task-eager-home-att42378433209-1-s1.json`
- `T012-per-task-eager-home-att42378433209-1-s3.json`

## Informational, not counted

These earlier heads shipped identical final-state code but were pushed before the final product
state was decided. Their rows are published for continuity only; they do not decide AC3.
The rows below are transcribed from each run's generated `verdict-s11.8.md`.

Run `42375389347`, attempt `1`, head `b7b065e`:

| Attempt | Runner | benchmarkIndex (min/median/max) | Qualifies | Home | Project gated |
|---|---|---:|---|---|---|
| `42375389347-1-s1` | GitHub Actions 1000000900 | 2373 / 2496 / 2638 | no | PASS (a:Y b:Y; eager 126.1955, gated 77.5) | FAIL (64.25 in [78.85, 91.35]) |
| `42375389347-1-s2` | GitHub Actions 1000000899 | 2130.5 / 2278 / 2350.5 | yes | PASS (a:Y b:N; eager 147.417, gated 87) | PASS (84.5 in [78.85, 91.35]) |
| `42375389347-1-s3` | GitHub Actions 1000000898 | 2183.5 / 2381.5 / 2448.5 | yes | PASS (a:Y b:N; eager 151.8595, gated 83) | PASS (85 in [78.85, 91.35]) |

Run `41788320197`, attempt `1`, head `e4c1136`:

| Attempt | Runner | benchmarkIndex (min/median/max) | Qualifies | Home | Project gated |
|---|---|---:|---|---|---|
| `41788320197-1-s1` | GitHub Actions 1000000887 | 2074 / 2283 / 2344.5 | yes | PASS (a:Y b:N; eager 161, gated 87) | PASS (85 in [78.85, 91.35]) |
| `41788320197-1-s2` | GitHub Actions 1000000886 | 2118 / 2286.5 / 2367.5 | yes | PASS (a:Y b:N; eager 157, gated 85.5) | PASS (85 in [78.85, 91.35]) |
| `41788320197-1-s3` | GitHub Actions 1000000888 | 2183 / 2607.25 / 2741.5 | no | PASS (a:Y b:Y; eager 122.5, gated 78.5) | FAIL (78.5 in [78.85, 91.35]) |

> Orchestrator review: the `41788320197-1-s2` row was corrected to the tool's output (`eager-verdict --rule s11.8 --dir …/hero-eager-41788320197-1-s2` → index 2118 / 2286.5 / 2367.5); the executor's transcription had mixed in other values. That run is informational and not counted.
