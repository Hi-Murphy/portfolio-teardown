#!/usr/bin/env bash
# S10 guards (plan.md "Guards"). Every line must print OK; any failure exits non-zero.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
xp() { sed 's#^#packages/xploder/#' "packages/xploder/test/$1"; }

# Brief/content base = 72dc34a (Merlin site.json updates merged at G2 start; RFC §9.6).
git diff --quiet 72dc34a -- .specify/slices .specify/KICKOFF-S10.md .specify/content && echo FROZEN-OK
test -z "$(git log --oneline 72dc34a..HEAD -- .specify/slices .specify/KICKOFF-S10.md .specify/content)" && echo BRIEF-HISTORY-OK
git diff --quiet 99a94f2 -- packages/xploder/src packages/xploder/package.json && echo XPLODER-SRC-OK
git diff --quiet 53b2b2b -- $(xp frozen-surface.paths) && echo SURFACE-S2S4-OK
git diff --quiet f31600e -- $(xp frozen-surface.s5.paths) && echo SURFACE-S5-OK
git diff --quiet 0b2c678 -- $(xp frozen-surface.s6.paths) && echo SURFACE-S6-OK
git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths) && echo SURFACE-S7-OK
if [[ -f packages/xploder/test/frozen-surface.s8.paths ]]; then
  git diff --quiet 99a94f2 -- $(xp frozen-surface.s8.paths) && echo SURFACE-S8-OK
else
  echo 'SURFACE-S8-SKIPPED (before T001)'
fi
git diff --quiet 99a94f2 -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom && echo DEV-ROUTES-OK
git diff --quiet 99a94f2 -- tools/perf/src/a11y-axe.ts tools/perf/src/a11y-probe.ts tools/perf/src/engine-probe.ts \
  tools/perf/src/panel-probe.ts tools/perf/src/presentation-snapshot.ts tools/perf/src/cli/a11y-axe.ts \
  tools/perf/src/cli/a11y-probe.ts tools/perf/src/cli/engine-probe.ts && echo S8-TOOLS-OK
