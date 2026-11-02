# T011 performance comparison

Measured 2026-11-03. Lighthouse is mobile, median of three runs; scores and metrics below are read
from the selected median run's full report. Weight covers mobile and desktop profiles. Budgets are
unchanged from `tools/perf/src/budgets.ts`: performance and accessibility >= 0.95, LCP < 2500 ms,
CLS = 0 on every run (not only the median), and weight < 3,000,000 B per profile. TBT and SEO are
recorded, not gated.

| Route | Run | Median | Performance | Accessibility | SEO | LCP (ms) | CLS | TBT (ms) | Mobile weight (B) | Desktop weight (B) | Lighthouse gate | Weight gate |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `/` | before | 1 | 1.00 pass | 1.00 pass | 1.00 | 923.324 pass | 0 pass | 1.5 | 203,602 pass | 203,599 pass | exit 0 pass | exit 0 pass |
| `/` | after | 1 | 1.00 pass | 1.00 pass | 0.66 | 954.557 pass | 0 pass | 14.0 | 200,676 pass | 224,072 pass | exit 0 pass | exit 0 pass |
| `/projects/websocket-inspector` | before | 0 | 1.00 pass | 1.00 pass | 1.00 | 922.9585 pass | 0 pass | 5.5 | 196,458 pass | 196,466 pass | exit 0 pass | exit 0 pass |
| `/projects/websocket-inspector` | after | 2 | 1.00 pass | 1.00 pass | 0.66 | 951.364 pass | 0 pass | 10.0 | 192,954 pass | 216,470 pass | exit 0 pass | exit 0 pass |

The preview SEO score is 0.66 on both routes because Lighthouse's `is-crawlable` audit scores 0.
This is Vercel preview behaviour, not a site metadata defect: `curl -sI` returned the following on
both preview URLs:

```text
HTTP/2 200
x-robots-tag: noindex
```

Production, which is intended to be indexable, does not send that header and scores SEO 1.00 on both
routes. All other SEO audit refs in the preview median reports have score 1.

Evidence: `T011-lighthouse-summary-{home,project}[-before].json` and
`T011-weight-{home,project}[-before].json` (after has no suffix; before is production).
