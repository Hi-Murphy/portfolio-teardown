# T005 — A1 hero-only eager flag

Branch: `task/s11.8-hero-eager-t005` · base: `0fcd243` · date: 2026-11-04

Environment: Node 24.19.0, pnpm 12.15.0, Playwright 1.64.1, Chromium mobile emulation.

Command (from `.`):

```sh
set -euo pipefail; F=.specify/features/hero-eager; T=t005; mkdir -p /tmp/s118-checks
pnpm --filter web exec vitest run test/eager-flag.test.ts test/eager-hero.test.tsx test/eager-guards.test.tsx --reporter verbose 2>&1 | tee /tmp/s118-checks/t005.txt
git diff --quiet 0fcd243 -- apps/web/components/workbench && echo WORKBENCH-UNTOUCHED | tee -a /tmp/s118-checks/t005.txt
pnpm build:eager-hero
pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --expect gated --runs 2 --out /tmp/s118-checks/t005-project-gated
pnpm eager:probe --serve apps/web/out --route / --runs 2 --out /tmp/s118-checks/t005-home
source $F/lever-block.sh
bash $F/guards.sh | tee -a /tmp/s118-checks/t005.txt
pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T005-OK
```

Result: exit 0; the final marker is `T005-OK`.

## Focused tests and workbench guard

```text
RUN  v5.0.5 ./apps/web

 ✓ test/eager-flag.test.ts > eager 3D build flag > the hero gates only its interaction wait behind the flag 1ms
 ✓ test/eager-flag.test.ts > eager 3D build flag > the workbench gates only its interaction wait behind the flag 0ms
 ✓ test/eager-flag.test.ts > eager 3D build flag > the eager workbench guards reduced motion and saveData before waiting for load 0ms
 ✓ test/eager-flag.test.ts > eager 3D build flag > only the Next config reads the eager environment flags 9ms
 ✓ test/eager-flag.test.ts > eager 3D build flag > the hero-only define is consumed only by the hero 3ms
 ✓ test/eager-flag.test.ts > eager 3D build flag > the Next config exposes both eager defines 0ms
 ✓ test/eager-flag.test.ts > eager 3D build flag > both defines are declared and used at their call sites 0ms
 ✓ test/eager-guards.test.tsx > eager workbench guards > reduced motion leaves the poster in place without importing the boot module 15ms
 ✓ test/eager-guards.test.tsx > eager workbench guards > saveData leaves the poster in place without importing the boot module 2ms
 ✓ test/eager-guards.test.tsx > eager workbench guards > a change to reduced motion while waiting aborts the eager boot 2ms
 ✓ test/eager-guards.test.tsx > eager workbench guards > the explore control still imports and mounts the workbench 4ms
 ✓ test/eager-hero.test.tsx > hero-only eager flag > boots the hero without an interaction event 16ms
 ✓ test/eager-hero.test.tsx > hero-only eager flag > reduced motion skips the hero boot 1ms
 ✓ test/eager-hero.test.tsx > hero-only eager flag > saveData skips the hero boot 1ms
 ✓ test/eager-hero.test.tsx > hero-only eager flag > the workbench still waits for interaction 5ms

 Test Files  3 passed (3)
      Tests  15 passed (15)

WORKBENCH-UNTOUCHED
```

## Probes

### Project `/projects/websocket-inspector` — `--expect gated`, 2/2 PASS

```json
{
  "route": "/projects/websocket-inspector",
  "expect": "gated",
  "runs": [
    {
      "pass": true,
      "checks": [
        { "name": "canvas-absent", "pass": true, "actual": 0 },
        { "name": "ready-absent", "pass": true, "actual": { "readyAtMs": null, "readyAttribute": false } },
        { "name": "poster-visible", "pass": true, "actual": { "opacity": "1", "visibility": "visible" } },
        { "name": "no-trusted-events", "pass": true, "actual": 0 }
      ]
    },
    {
      "pass": true,
      "checks": [
        { "name": "canvas-absent", "pass": true, "actual": 0 },
        { "name": "ready-absent", "pass": true, "actual": { "readyAtMs": null, "readyAttribute": false } },
        { "name": "poster-visible", "pass": true, "actual": { "opacity": "1", "visibility": "visible" } },
        { "name": "no-trusted-events", "pass": true, "actual": 0 }
      ]
    }
  ],
  "pass": true
}
```

### Home `/` — live, 2/2 PASS

```json
{
  "route": "/",
  "runs": [
    {
      "pass": true,
      "checks": [
        "canvas-present",
        "ready-by-deadline",
        "revealed-by-deadline",
        "live-opacity",
        "poster-hidden",
        "no-trusted-events",
        "canvas-non-blank",
        "ambient-idle"
      ],
      "readyMs": 218.90000009536743,
      "revealedAtMs": 227.90000009536743,
      "trustedEvents": 0,
      "canvasNonBlank": true
    },
    {
      "pass": true,
      "checks": [
        "canvas-present",
        "ready-by-deadline",
        "revealed-by-deadline",
        "live-opacity",
        "poster-hidden",
        "no-trusted-events",
        "canvas-non-blank",
        "ambient-idle"
      ],
      "readyMs": 203.90000009536743,
      "revealedAtMs": 212.70000004768372,
      "trustedEvents": 0,
      "canvasNonBlank": true
    }
  ],
  "pass": true
}
```

## Bytes

Gated pair:

```text
home initial gzip             180622      180622           0      2000 B PASS
project initial gzip          180096      180096           0      2000 B PASS
total gzip                    459309      459309           0        0.5% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 0.5% of before)
```

Hero-eager pair:

```text
home initial gzip             180481      180618         137      2000 B PASS
project initial gzip          180482      180096        -386      2000 B PASS
total gzip                    459158      459305         147        0.5% PASS
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 0.5% of before)
```

## Parity

```text
parity-eager-home: PASS (4 shots, 0 px)
parity-gated: PASS (8 shots, 0 px)
```

## Local A/B — informational

A1 is not a lever, so this table is not a keep decision. It is recorded to show that the
define-only change did not produce a measurable performance shift.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT /home (ms) | 221.50 | 3.00 | 202.75 | 80.50 | 18.75 | 80.50 | no measurable win |
| renderer-constructor /home (ms) | 5.56 | 0.08 | 5.45 | 0.29 | 0.11 | 0.29 | no measurable win |
| program-compile /home (ms) | 10.84 | 0.27 | 10.80 | 0.11 | 0.04 | 0.27 | no measurable win |
| first-content-frame /home (ms) | 10.84 | 0.27 | 10.80 | 0.11 | 0.04 | 0.27 | no measurable win |
| unnamedMaxMs /home (ms) | 8.96 | 0.10 | 9.05 | 0.14 | -0.09 | 0.14 | no measurable win |
| dropped frames trace-only /home | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no measurable win |
| probe ready /home (ms) | 211.00 | 16.80 | 207.65 | 27.10 | 3.35 | 27.10 | no measurable win |
| probe revealed /home (ms) | 219.65 | 16.90 | 216.55 | 27.50 | 3.10 | 27.50 | no measurable win |

Full block artifacts: `.specify/features/hero-eager/evidence/T005-ab/`.

## Final gate tail

```text
FROZEN-OK
BRIEF-HISTORY-OK
G1-LIST-OK
XPLODER-SRC-OK
XPLODER-TEST-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
BASELINE-FIRST-OK
APP-TOUCH-OK
DEV-ROUTES-OK
CI-JOBS-OK
FLAG-DEFAULT-OK
VERSIONS-OK
BUDGETS-OK
GITLEAKS-OK

pnpm typecheck: PASS
pnpm lint: PASS (no warnings after the final correction)
pnpm test: 35 passed | 1 skipped (36); 195 passed | 2 skipped (197)
pnpm build: PASS
T005-OK
```
