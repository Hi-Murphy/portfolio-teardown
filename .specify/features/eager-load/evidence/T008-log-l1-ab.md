# T008 — L1 render-lane hygiene

Status: implemented and verified. The A/B keep-rule result is reported below; the orchestrator
decides whether to keep or revert. No revert was performed by the executor.

## Change

- Memoised the hero stage element on `[HeroStage, project, reveal]`.
- Moved portal-target resolution into `WorkbenchLoader` and stored the client plus `{dock, tour}` in
  one `startTransition` state update.
- Removed `WorkbenchClient`'s target-resolution layout-effect `setState` and rAF retry. A layout
  effect now only sets `data-site-explore-live` on the tour container.
- Memoised the live viewer element and both portal elements so reveal and unrelated state updates do
  not re-render their subtrees.

## Render-lane test

`apps/web/test/eager-render-lanes.test.tsx` stubs the live viewer, dock and explore panel with render
counters. Observed counts:

| Step | Workbench commits | LiveViewer renders | Dock renders | Explore renders |
| --- | ---: | ---: | ---: | ---: |
| Mount | 1 | 1 | 1 | 1 |
| Reveal | 2 | 1 | 1 | 1 |
| Explore mode change | 3 | 1 | 2 | 2 |

`data-site-explore-live` is present on the tour container after mount. The existing eager guard
tests remain green, including click-to-boot when the loader has no portal fixtures.

## Local A/B

Before is the accepted T007 state. Local emulation only; binding numbers remain CI-only.

```md
# Local A/B

Before: ./.specify/features/eager-load/evidence/T007-ab
After: /tmp/s117-checks/t008

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 272.58 | 35.16 | 243.54 | 101.08 | 29.04 | 101.08 | no measurable win |
| max long task /home (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /home | 2.00 | 0.00 | 1.00 | 0.00 | 1.00 | 0.00 | KEEP |
| probe ready /home (ms) | 211.15 | 17.10 | 216.25 | 17.50 | -5.10 | 17.50 | no measurable win |
| probe revealed /home (ms) | 220.00 | 17.40 | 225.00 | 17.60 | -5.00 | 17.60 | no measurable win |
| eager simulated TBT /project (ms) | 319.50 | 42.00 | 354.00 | 19.00 | -34.50 | 42.00 | no measurable win |
| max long task /project (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /project | 2.00 | 0.00 | 1.50 | 1.00 | 0.50 | 1.00 | no measurable win |
| probe ready /project (ms) | 215.30 | 8.00 | 220.95 | 10.10 | -5.65 | 10.10 | no measurable win |
| probe revealed /project (ms) | 225.75 | 8.10 | 230.95 | 9.90 | -5.20 | 9.90 | no measurable win |
```

Literal table reading: only `/home` dropped frames reports `KEEP`; every other table row reports
`no measurable win`.

## Observed mount and reveal intervals

The startup probe's `P9` is the first-draw → first-frame interval containing the reveal. It does not
label React commits directly; the local Lighthouse profile matched 0 function-attributed tasks on
home and one loose 13.3 ms task on project, with no hot-frame samples. The probe intervals are
therefore the attributable observed times for this local run.

| Route / interval | T007 runs (ms) | T008 runs (ms) | Before median / spread | After median / spread | Delta / limit | Rule |
| --- | --- | --- | ---: | ---: | ---: | --- |
| project P9 reveal boundary | 41.537, 40.221 | 2.377, 2.251 | 40.879 / 1.316 | 2.314 / 0.126 | 38.565 / 1.316 | KEEP |
| project P8 texture + layout | 10.967, 12.927 | 4.973, 6.130 | 11.947 / 1.960 | 5.552 / 1.157 | 6.395 / 1.960 | KEEP |
| project total main thread | 330.285, 327.692 | 329.761, 321.410 | 328.989 / 2.593 | 325.586 / 8.351 | 3.403 / 8.351 | no measurable win |
| home P9 reveal boundary | 2.352, 2.011 | 2.315, 1.770 | 2.182 / 0.341 | 2.043 / 0.545 | 0.139 / 0.545 | no measurable win |
| home total main thread | 276.790, 271.300 | 273.869, 269.680 | 274.045 / 5.490 | 271.775 / 4.189 | 2.270 / 5.490 | no measurable win |

The project reveal interval clears the keep rule by 38.6 ms against a 1.3 ms spread. The literal
A/B table still leaves the final keep/revert decision to the orchestrator.

## Parity, probes, bytes and sequence

- Eager post-eager parity: 8/8 shots, 0 differing pixels.
- Gated rest-state parity: 8/8 shots, 0 differing pixels.
- Eager probes: normal and reduced motion PASS 2/2 on both routes.
- `site:probe --group draws --group hero`: PASS (7 checks).
- Eager bytes: home initial gzip +16 B; project initial gzip +522 B; total raw +518 B; total gzip
  +152 B. Budget PASS.
- Gated bytes: home initial gzip +16 B; project initial gzip +50 B; total raw +279 B; total gzip
  +76 B. Budget PASS.
- Sequence probes completed 2/2 for project/click and home/move.

## Check output

Copied from `/tmp/s117-checks/t008.txt`:

```text
RUN  v5.0.5 ./apps/web

✓ test/eager-render-lanes.test.tsx > eager render lanes > reveal and portals do not re-render the live tree 43ms
✓ test/eager-render-lanes.test.tsx > eager render lanes > an explore interaction still re-renders the panel 2ms

Test Files  1 passed (1)
     Tests  2 passed (2)
  Start at  07:31:08
  Duration  336ms (environment 76%, tests 16%, import 7%, transform 1%, worker 1%)

OK FROZEN
OK BRIEF-HISTORY
OK XPLODER-EMPTY
OK APP-TOUCH
OK BASELINE-FIRST
OK DEV-ROUTES
OK CI-JOBS
OK FLAG-DEFAULT
OK VERSIONS
OK BUDGETS
OK GITLEAKS
```

Final suite tail from the same check:

```text
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  235 passed (235)
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  624 passed (624)
apps/web test:  Test Files  34 passed | 1 skipped (35)
apps/web test:       Tests  189 passed | 2 skipped (191)
T008-OK
```

Typecheck, lint, and Prettier passed. Raw lever artifacts are in `T008-ab/`, excluding trace
archives and DevTools logs.
