#!/usr/bin/env bash
# S11 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
xp() { sed 's#^#packages/xploder/#' "packages/xploder/test/$1"; }
fails=0
guard() {
  local name=$1
  shift
  if "$@" >/dev/null 2>&1; then
    echo "$name"
  else
    echo "FAIL ${name%-OK}"
    fails=1
  fi
}

brief_history_ok() {
  test -z "$(git log --oneline 3ba4c3b..HEAD -- .specify/slices .specify/KICKOFF-S11.md .specify/content)"
}

seo_server_only_ok() {
  ! grep -rqE "^[[:space:]]*['\"]use client['\"]" apps/web/seo 2>/dev/null
}

gitleaks_ok() {
  gitleaks git --no-banner --log-opts="53a1f2e..HEAD" . >/dev/null 2>&1 &&
    gitleaks dir --no-banner .specify/features/og-seo >/dev/null 2>&1
}

guard FROZEN-OK git diff --quiet 3ba4c3b -- .specify/slices .specify/KICKOFF-S11.md .specify/content
guard BRIEF-HISTORY-OK brief_history_ok
guard XPLODER-OK git diff --quiet 53a1f2e -- packages/xploder
guard SURFACE-S2S4-OK git diff --quiet 53b2b2b -- $(xp frozen-surface.paths)
guard SURFACE-S5-OK git diff --quiet f31600e -- $(xp frozen-surface.s5.paths)
guard SURFACE-S6-OK git diff --quiet f65b13c -- $(xp frozen-surface.s6.paths)
guard SURFACE-S7-OK git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK git diff --quiet 99a94f2 -- $(xp frozen-surface.s8.paths)
guard DEV-ROUTES-OK git diff --quiet 53a1f2e -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard S8-TOOLS-OK git diff --quiet 53a1f2e -- tools/perf/src/a11y-axe.ts tools/perf/src/a11y-probe.ts \
  tools/perf/src/engine-probe.ts tools/perf/src/panel-probe.ts tools/perf/src/presentation-snapshot.ts \
  tools/perf/src/cli/a11y-axe.ts tools/perf/src/cli/a11y-probe.ts tools/perf/src/cli/engine-probe.ts
guard PERF-CI-OK test -z "$(git diff 53a1f2e -- .github/workflows/perf.yml)"
guard SEO-SERVER-ONLY-OK seo_server_only_ok
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
