# T017 — AC6 eager-hydration verdict

**Verdict:** keep the gate

Binding host: the GitHub Actions runner (`ubuntu-latest`, benchmarkIndex ≈ 2,200–2,340, the slower
host where S10's load-time hydration failed). Run: `perf: eager-3d (measurement)`,
https://github.com/Hi-Murphy/portfolio-teardown/actions/runs/41583093379 (head `d753931`, PR #17).
Each build is served on the runner (`serve:out`, 127.0.0.1:4320). `perf:lighthouse` mobile is run
×2 per route, each a median of 3. Rule (AC6 + RFC Q7): eager perf ≥ 0.95 **and** TBT ≤ 200 ms
(two-invocation median) on **both** `/` and `/projects/websocket-inspector`.

| Host | Build | Route | Perf | TBT ms | LCP ms | CLS | Pass AC6 rule |
|---|---|---|---:|---:|---:|---:|---|
| CI runner | eager | `/` | 0.955 | **248.5** | 910.6 | 0 | no (TBT) |
| CI runner | eager | project | **0.89** | **441.5** | 910.3 | 0 | no (perf, TBT) |
| CI runner | gated (reference) | `/` | 0.995 | 96.75 | 909.3 | 0 | — |
| CI runner | gated (reference) | project | 1.00 | 88.5 | 906.9 | 0 | — |
| local (T016) | eager | `/` | 1.00 | 2 | 905.0 | 0 | yes |
| local (T016) | eager | project | 1.00 | 3 | 904.7 | 0 | yes |

Eager hydration adds ≈ 150 ms (home) and ≈ 350 ms (project) of TBT on the runner over the gated
build. The 3D startup's remaining long work (the frozen S8 `<Canvas>` mount, and eval stages that
fall under 50 ms locally but exceed it at the runner's ~2× slower CPU under Lighthouse's 4×
simulation) lands inside Lighthouse's TBT window. For reference, S10's load + idle hydration on
the runner scored home perf 0.89 with TBT 426–639 ms (S10 RFC §9.15). This slice's levers moved the
home route from failing to perf 0.955, but TBT is still above the 200 ms reference, and the project
route still fails both criteria.

**Recommendation (per AC6): keep D-19's interaction gate.** The flag stays in the build, off by
default (`NEXT_PUBLIC_EAGER_3D`, `pnpm build:eager`), so the experiment can be re-run after a
future slice that may touch the S8 Canvas mount.

Artifacts: `T017-lighthouse-summary-ci-{gated,eager}-{home,project}-r{1,2}.json` (copied from the
run's `eager-3d` artifact). Per-run tables: `T017-log-eager-verdict-ci-tables.md` (output of
`node tools/perf/src/cli/eager-verdict.ts --dir <artifact>`). Exit codes from the job:
eager-project r1/r2 = 6 (budget, recorded; the job never fails on budget), all others 0.
