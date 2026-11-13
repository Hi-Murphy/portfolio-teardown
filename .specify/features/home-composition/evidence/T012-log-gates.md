# T012 local gate log

Run date: 2026-11-13. Branch: `task/s11.9-home-composition-t012`. All gates below passed.

| Gate | Measured value | Result |
|---|---|---|
| `guards.sh --self-test` on a clean tree | app-touch, site-json, frozen-surfaces, routes, g1-sha, home-use-client and dependencies all bite; interim-list skipped because files exist | PASS |
| Fresh `pnpm build` | exit 0; eight static pages generated | PASS |
| `home:probe` (all default groups) | order 18/18, fold 12/12, responsive 36/36, structure 52/52, copy 1/1; overall PASS | PASS |
| Screenshot set from `home:probe` | 12 responsive shots + 2 fold overlays at 390x844 + 1440 light order shot | PASS |
| `site:probe --ci` | drill 13/13, CLS 12/12, routes 11/11, nojs 6/6, reduced-motion 5/5; overall PASS | PASS |
| `site:probe --group draws,hero` | draws 2/2 with 2 draw calls; hero 7/7; overall PASS | PASS |
| `a11y:axe:site` (all route groups) | 12 cells, 40 states; serious 0, critical 0, moderate 0, minor 0; exit 0 | PASS |
| Lighthouse `/` invocation 1 | perf 1.00, a11y 1.00, CLS 0/0/0, LCP 907.2 ms | PASS |
| Lighthouse `/` invocation 2 | perf 1.00, a11y 1.00, CLS 0/0/0, LCP 904.0 ms | PASS |
| Lighthouse `/projects/websocket-inspector` invocation 1 | perf 1.00, a11y 1.00, CLS 0/0/0, LCP 902.7 ms | PASS |
| Lighthouse `/projects/websocket-inspector` invocation 2 | perf 1.00, a11y 1.00, CLS 0/0/0, LCP 903.1 ms | PASS |
| `perf:weight` `/` | mobile 452,678 B / 29 requests; desktop 452,678 B / 29 requests; budget 3,000,000 B | PASS |
| `regress-hero.sh` | eager-live, eager-reduced-motion, eager-save-data, site-hero, site-cls-draws: 5/5 | PASS |
| `cross-route.sh` | `/projects` 5 hunks, project 3 hunks, 404 6 hunks; 14 total, all ledgered; both `/projects*` mains byte-identical | PASS |
| `guards.sh` | app-touch, site-json, frozen-surfaces, workflows, routes, g1-sha, home-use-client, dependencies, interim-list: 9/9 | PASS |
| Snap harness at 390x844 and 1440x900 | 20/20 checks | PASS |
| 30 s full-cycle CLS observer | 390x844: 0.000000 (0 entries), cycle returned; 1440x900: 0.000000 (0 entries), cycle returned | PASS |
| `pnpm typecheck && pnpm lint && pnpm test` | typecheck PASS; ESLint PASS; Prettier PASS; perf 275, xploder 632, web 234 passed with 2 existing skips | PASS |
| Explicit route list | 21 entries, identical to `T002-routes.txt`; dev and fixture routes absent | PASS |

## Attempt 1 -> 2

Attempt 1 stopped at the axe gate. Since T011f, `/` intentionally renders two stacked `aria-hidden`
posters: the imploded hand-over poster and the exploded poster with the flow path, selected by CSS.
`tools/perf/src/site-axe.ts` assumed exactly one `[data-site-poster]`, so Playwright strict mode failed
before axe ran.

The attempt-2 tooling fix is limited to `tools/perf/src/site-axe.ts`: poster readiness now targets the
visible locator (`.filter({ visible: true }).first()`), and `assertPosterOnly` checks that some poster
has non-zero width, computed `visibility: visible`, and non-zero opacity. The project route and gated
single-poster builds follow the same code path with one visible poster and retain their prior
pre-interaction assertions. No product code changed.

An additional single-poster check ran `pnpm build:gated-hero` and the home-only axe matrix: all four
palette/viewport cells reported 0 serious and 0 critical across 3 states. The default export was then
rebuilt, and `guards.sh` stayed 9/9.
