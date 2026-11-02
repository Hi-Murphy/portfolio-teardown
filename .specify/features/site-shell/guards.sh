#!/usr/bin/env bash
# S10 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
xp() { sed 's#^#packages/xploder/#' "packages/xploder/test/$1"; }
fails=0
guard() { local name=$1; shift; if "$@" >/dev/null 2>&1; then echo "$name"; else echo "FAIL ${name%-OK}"; fails=1; fi; }

# Brief/content base = 72dc34a (Merlin site.json updates merged at G2 start; RFC §9.6).
guard FROZEN-OK git diff --quiet 72dc34a -- .specify/slices .specify/KICKOFF-S10.md .specify/content
guard BRIEF-HISTORY-OK test -z "$(git log --oneline 72dc34a..HEAD -- .specify/slices .specify/KICKOFF-S10.md .specify/content)"
# Only the approved S6 file may differ from the S10 base (RFC §9.9, Q16 tour trail).
guard XPLODER-SRC-OK test "$(git diff --name-only 99a94f2 -- packages/xploder/src packages/xploder/package.json)" = packages/xploder/src/overlay/model.ts
guard SURFACE-S2S4-OK git diff --quiet 53b2b2b -- $(xp frozen-surface.paths)
guard SURFACE-S5-OK git diff --quiet f31600e -- $(xp frozen-surface.s5.paths)
# S6 re-sealed at f65b13c (RFC §9.9).
guard SURFACE-S6-OK git diff --quiet f65b13c -- $(xp frozen-surface.s6.paths)
guard SURFACE-S7-OK git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK git diff --quiet 99a94f2 -- $(xp frozen-surface.s8.paths)
guard DEV-ROUTES-OK git diff --quiet 99a94f2 -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard S8-TOOLS-OK git diff --quiet 99a94f2 -- tools/perf/src/a11y-axe.ts tools/perf/src/a11y-probe.ts tools/perf/src/engine-probe.ts \
  tools/perf/src/panel-probe.ts tools/perf/src/presentation-snapshot.ts tools/perf/src/cli/a11y-axe.ts \
  tools/perf/src/cli/a11y-probe.ts tools/perf/src/cli/engine-probe.ts
exit $fails
