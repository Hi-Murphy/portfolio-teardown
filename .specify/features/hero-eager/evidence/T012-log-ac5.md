# T012 - AC5 probes and project-gated band

Both deciding attempts ran every probe twice. The table below records each run rather than a
summary.

## Home normal

Deadline: 2.5 s after navigation start. Fade is complete when the live state is `revealed` and live
opacity is `1`; the poster must then be hidden.

| Attempt | Run | Ready (ms) | Observed at deadline (ms) | Trusted events | Live state / opacity | Poster | Non-blank | Pass |
|---|---|---:|---:|---:|---|---|---|---|
| `s1` | r1 | 578.9 | 2512.6 | 0 | `revealed` / 1 | hidden | yes | yes |
| `s1` | r2 | 533.0 | 2503.5 | 0 | `revealed` / 1 | hidden | yes | yes |
| `s3` | r1 | 546.1 | 2509.9 | 0 | `revealed` / 1 | hidden | yes | yes |
| `s3` | r2 | 514.8 | 2506.5 | 0 | `revealed` / 1 | hidden | yes | yes |

## Home reduced motion

| Attempt | Run | Canvas count | Ready attribute | Poster | Trusted events | Non-blank | Pass |
|---|---|---:|---|---|---:|---|---|
| `s1` | r1 | 0 | absent | visible / opacity 1 | 0 | yes | yes |
| `s1` | r2 | 0 | absent | visible / opacity 1 | 0 | yes | yes |
| `s3` | r1 | 0 | absent | visible / opacity 1 | 0 | yes | yes |
| `s3` | r2 | 0 | absent | visible / opacity 1 | 0 | yes | yes |

## Project with `--expect gated`

| Attempt | Run | Canvas count | Ready attribute | Trusted events | Poster | Non-blank | Pass |
|---|---|---:|---|---:|---|---|---|
| `s1` | r1 | 0 | absent | 0 | visible / opacity 1 | yes | yes |
| `s1` | r2 | 0 | absent | 0 | visible / opacity 1 | yes | yes |
| `s3` | r1 | 0 | absent | 0 | visible / opacity 1 | yes | yes |
| `s3` | r2 | 0 | absent | 0 | visible / opacity 1 | yes | yes |

## Project-gated TBT

The AC5 band is `[78.85, 91.35]` ms. Values are Lighthouse invocation medians; the attempt value is
the mean of the two invocation medians, matching `eager-verdict`.

| Attempt | r1 TBT (ms) | r2 TBT (ms) | Attempt TBT (ms) | Position |
|---|---:|---:|---:|---|
| `s1` | 91.0 | 90.0 | 90.5 | PASS |
| `s3` | 84.0 | 83.0 | 83.5 | PASS |

**AC5 probes:** PASS 12/12. **AC5 project band:** PASS 2/2.

Raw reports and screenshots:

- `T012-eager-probe-home-normal-r1-att42378433209-1-s1.json`
- `T012-eager-probe-home-normal-r2-att42378433209-1-s1.json`
- `T012-eager-probe-home-reduce-r1-att42378433209-1-s1.json`
- `T012-eager-probe-home-reduce-r2-att42378433209-1-s1.json`
- `T012-eager-probe-project-normal-r1-att42378433209-1-s1.json`
- `T012-eager-probe-project-normal-r2-att42378433209-1-s1.json`
- `T012-eager-probe-home-normal-r1-att42378433209-1-s3.json`
- `T012-eager-probe-home-normal-r2-att42378433209-1-s3.json`
- `T012-eager-probe-home-reduce-r1-att42378433209-1-s3.json`
- `T012-eager-probe-home-reduce-r2-att42378433209-1-s3.json`
- `T012-eager-probe-project-normal-r1-att42378433209-1-s3.json`
- `T012-eager-probe-project-normal-r2-att42378433209-1-s3.json`
- The matching `*.deadline.png` files are stored under the same names.
