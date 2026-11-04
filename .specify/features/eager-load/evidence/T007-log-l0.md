# T007 — L0 eager workbench guards

Status: implemented and verified. The literal Task T007 checker has one stale probe-field
reference (`r.canvas.present`); the current T004 probe schema exposes
`r.atDeadline.canvasCount`. That exact expression raises `TypeError` before evaluating the runs.
With only that schema translation, the full block prints `T007-OK`. The raw error and artifacts are
in `T007-ab/`.

## Change

- `apps/web/components/workbench/workbench-loader.tsx`: the eager branch now reads
  `motion.reducedMotion.query`, mirrors the hero's `navigator.connection.saveData` read, returns
  before the load wait when either guard matches, and aborts the controller if reduced motion turns
  on while waiting. The gated branch is unchanged, so click-to-explore remains available.
- **Orchestrator review (D-P4):** the executor's first pass also exposed the loader's hidden span as `data-site-live`, so that the probe's poster locator would match. That is a product DOM change on both builds, made for a tool, and it was **reverted**. Instead, the probe (`tools/perf/src/eager-probe.ts`) now falls back to the poster inside `[data-site-stage]` / `[data-site-hero]` when no live layer exists. Re-verified on the eager build after the revert: reduced motion passes 4/4 (home 2, project 2; canvas count 0, poster opacity 1 / visible), and project normal motion still passes.
- `apps/web/test/eager-flag.test.ts`: source assertion that the eager branch checks reduced motion
  and saveData before the load wait.
- `apps/web/test/eager-guards.test.tsx`: jsdom coverage for reduced motion, saveData, changing to
  reduced motion while waiting, and click-to-boot. The dynamic module mock records whether
  `workbench-boot` itself is imported.

## Probe before/after

Before is the default previous state, `T006-ab`. After is the T007 eager build.

| Route | State | Run | Pass | Canvas count | Ready ms | Poster present | Poster opacity | Poster visibility |
| --- | --- | ---: | --- | ---: | ---: | --- | --- | --- |
| home | T006 before | 1 | true | 0 | — | true | 1 | visible |
| home | T006 before | 2 | true | 0 | — | true | 1 | visible |
| project | T006 before | 1 | false | 1 | 217.8 | true | 0 | hidden |
| project | T006 before | 2 | false | 1 | 197.8 | true | 0 | hidden |
| home | T007 after | 1 | true | 0 | — | true | 1 | visible |
| home | T007 after | 2 | true | 0 | — | true | 1 | visible |
| project | T007 after | 1 | true | 0 | — | true | 1 | visible |
| project | T007 after | 2 | true | 0 | — | true | 1 | visible |

The T007 reduced-motion check therefore reports `REDUCE-POSTER-ONLY-OK`; the project route moves
from 0/2 to 2/2.

## Local A/B

Local emulation only. This correctness lever is not subject to the keep rule.

```md
# Local A/B

Before: ./.specify/features/eager-load/evidence/T006-ab
After: /tmp/s117-checks/t007

Local emulation only. The keep rule is `before median - after median > the larger run spread`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 278.02 | 44.04 | 272.58 | 35.16 | 5.44 | 44.04 | no measurable win |
| max long task /home (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /home | 2.00 | 0.00 | 2.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 208.70 | 4.00 | 211.15 | 17.10 | -2.45 | 17.10 | no measurable win |
| probe revealed /home (ms) | 217.65 | 3.90 | 220.00 | 17.40 | -2.35 | 17.40 | no measurable win |
| eager simulated TBT /project (ms) | 338.32 | 2.37 | 319.50 | 42.00 | 18.82 | 42.00 | no measurable win |
| max long task /project (ms) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| dropped frames trace-only /project | 1.50 | 1.00 | 2.00 | 0.00 | -0.50 | 1.00 | no measurable win |
| probe ready /project (ms) | 210.45 | 20.10 | 215.30 | 8.00 | -4.85 | 20.10 | no measurable win |
| probe revealed /project (ms) | 220.75 | 19.90 | 225.75 | 8.10 | -5.00 | 19.90 | no measurable win |
```

## Parity, bytes, and sequence

- Post-eager parity: 8/8 shots, 0 differing pixels (`T007-ab/` comparison outputs).
- Gated rest-state parity: 8/8 shots, 0 differing pixels.
- Eager bytes: project initial raw +1,325 B, gzip +485 B; total raw +275 B, gzip +90 B. Budget PASS.
- Gated bytes: project initial raw +36 B, gzip +14 B; total raw +36 B, gzip +14 B. Budget PASS.
- Site probe: PASS (7 checks); project keeps no canvas, a visible poster, static explore, and the
  explore control before interaction.
- Sequence probes completed for project/click and home/move.

## Check output tail

The literal block reaches and passes the 9 focused tests and all four reduced-motion probes, then
stops on the stale selector:

```text
TypeError: Cannot read properties of undefined (reading 'present')
```

The schema-equivalent block (only `r.canvas.present` translated to
`r.atDeadline.canvasCount === 0`) completes:

```text
REDUCE-POSTER-ONLY-OK
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
tools/perf test:  Test Files  30 passed (30)
tools/perf test:       Tests  235 passed (235)
packages/xploder test:  Test Files  61 passed (61)
packages/xploder test:       Tests  624 passed (624)
apps/web test:  Test Files  33 passed | 1 skipped (34)
apps/web test:       Tests  187 passed | 2 skipped (189)
T007-OK
```

Typecheck, lint, and Prettier also passed. The clean run used a shell-local `serve:out` wrapper so
`lever-block.sh`'s recorded PID was the actual listener; the harness file itself was not edited.
