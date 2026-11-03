# T011 — AC5 eager-hydration verdict (CI runner)

**Verdict (AC5): keep the gate.** The rule (AC5 + RFC Q7/Q12) is eager perf ≥ 0.95 **and** TBT ≤ 200 ms (two-invocation median) on **both** `/` and `/projects/websocket-inspector`, in **both** independent runner runs. Run 1 passes and run 2 fails, so D-19 stays.

- **Runs:** `perf: eager-3d (measurement)` on draft PR #18, head `515d587`. https://github.com/Hi-Murphy/portfolio-teardown/actions/runs/41637668830. Attempt 1 = run 1; attempt 2 (`gh run rerun`) = run 2.
- **Build and protocol:** eager build = `pnpm build:eager` (`NEXT_PUBLIC_EAGER_3D=1`), served on the runner (`serve:out`, 127.0.0.1:4320). `perf:lighthouse` mobile (simulated throttling), ×2 invocations per route, each a median of 3. The gated build is measured in the same job as the reference.
- **Raw files:** `T011-lighthouse-summary-ci-{gated,eager}-{home,project}-r{1,2}-run{1,2}.json`.
- **Full tables:** `T011-log-eager-verdict-ci-tables.md`.

| Run | Runner benchmarkIndex | Build | Route | Perf | TBT ms | LCP ms | CLS | AC5 rule |
|---|---:|---|---|---:|---:|---:|---:|---|
| 1 | ≈ 3,750–4,000 | eager | `/` | 1.00 | 71.5 | 906.1 | 0 | pass |
| 1 | | eager | project | 0.99 | 106 | 906.4 | 0 | pass |
| 1 | | gated | `/` | 1.00 | 40.5 | 905.3 | 0 | — |
| 1 | | gated | project | 1.00 | 43 | 905.9 | 0 | — |
| 2 | ≈ 2,150–2,250 | eager | `/` | 0.95 | **260.25** | 911.7 | 0 | **fail (TBT)** |
| 2 | | eager | project | **0.87** | **506.1** | 912.3 | 0 | **fail (perf, TBT)** |
| 2 | | gated | `/` | 0.995 | 91.1 | 907.8 | 0 | — |
| 2 | | gated | project | 1.00 | 83 | 908.6 | 0 | — |

## Reading

1. **Host variance dominates.** The two attempts ran on runners about 1.8× apart in Lighthouse `benchmarkIndex`.
   - Run 2's host matches S11.5's binding host (T017: index ≈ 2,200–2,340; gated TBT 84–97 ms vs 83–91 ms here).
   - Run 1's host is faster than any host S11.5 measured.
2. **Same-host comparison with S11.5 (run 2 vs T017).** The eager build does **not** improve on the slow runner:

   | Route | S11.5 (T017) perf / TBT | S11.6 run 2 perf / TBT |
   |---|---|---|
   | `/` | 0.955 / 248.5 ms | 0.95 / 260.25 ms |
   | project | 0.89 / 441.5 ms | 0.87 / 506.1 ms |

   This is one pair of runs per slice, so the +12 / +65 ms difference is within what a single runner pair can vary, but the direction is not an improvement. Locally (T010, this Mac) both routes score perf 1.00 with TBT ≤ 1 ms, as in S11.5 T016.
3. **Eager − gated TBT on the same host:**

   | Host | `/` | project |
   |---|---|---|
   | run 1 (fast runner) | +31 ms | +63 ms |
   | run 2 (slow runner) | +169 ms | +423 ms |
   | S11.5 T017 (slow runner) | +150 ms | +353 ms |

4. **Attribution on the slow runner (run 2, `longTasks` from the Lighthouse long-tasks audit; blocking = Σ(dur − 50) per URL, averaged per internal run):**
   - eager project: `1kgrt2f4mrm63.js` (react-dom) 189 ms, `10kujx8nsd3ck.js` 103 ms (also 107 ms in the gated build, so not 3D), `3vwpvuyn90046.js` 99 ms, `3vnmkhfgdnq2d.js` (three) 83 ms, the document 46 ms, `1d5kkip1hlg-o.js` (R3F) 35 ms;
   - eager home: react-dom 126 ms, `10kujx8nsd3ck.js` 81 ms, three 71 ms.
   - The largest single eager tasks are react-dom tasks of 198–212 ms simulated at ≈ 4.0 s.
   - This slice's levers split the `<Canvas>` mount on the engagement path. On a slow runner under simulated 4× throttling, load-time eager startup still produces react-dom tasks large enough to dominate TBT. They are not explained by the local 4× profile (no task above 33 ms there).
5. **Open item for a follow-up (outside this slice, RFC Q14):** profile the eager load path on a slow host (index ≈ 2,200) to identify the ≈ 200 ms react-dom task: hydration plus the viewer transition render coinciding at load, versus the engagement path measured in AC1–AC4.

## Recommendation (per AC5)

**Keep D-19's interaction gate.** The flag stays off by default and `eager-3d.yml` stays until Murphy's D-19 decision. Retiring D-19 on run 1 alone would depend on CI hardware luck. Run 2, on the same host class as S11.5's binding measurement, fails both criteria on the project route.

## Addendum: run 3 (T012, informational)

Pushing the T011 commit triggered a third `eager-3d` run: https://github.com/Hi-Murphy/portfolio-teardown/actions/runs/41639534169, head `f8f937d`, the same product code. It landed on a fast runner (benchmarkIndex ≈ 3,800–3,950):

| Route | Eager perf / TBT | Gated perf / TBT |
|---|---|---|
| `/` | 1.00 / 62.5 ms | 1.00 / 39.5 ms |
| project | 0.99 / 100 ms | 1.00 / 39.5 ms |

That is a pass, like run 1.

**Picture across three runs:** the eager build passes on every fast runner (2/2) and fails on the one slow runner, the host class S11.5 was judged on. The two-binding-run rule (RFC Q12) already decided **keep the gate**, and run 3 does not change it. It does confirm that the outcome tracks runner speed, which is why retiring D-19 needs the slow-host load path fixed first. Raw summaries: `T011-lighthouse-summary-ci-*-run3.json`.
