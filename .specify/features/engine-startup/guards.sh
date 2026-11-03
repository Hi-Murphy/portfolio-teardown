#!/usr/bin/env bash
# S11.5 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=92a8d24
F=.specify/features/engine-startup
S4BASE=92a8d24
S6BASE=f65b13c

xp() { sed 's#^#packages/xploder/#' "packages/xploder/test/$1"; }
xpf() { sed 's#^#packages/xploder/#' "$F/$1"; }

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

gitleaks_ok() {
  gitleaks git --no-banner --log-opts="$B..HEAD" . >/dev/null 2>&1 &&
    gitleaks dir --no-banner "$F" >/dev/null 2>&1
}

guard FROZEN-OK git diff --quiet "$B" -- .specify/slices .specify/KICKOFF-S11.5.md .specify/content
guard BRIEF-HISTORY-OK test -z "$(git log --oneline "$B"..HEAD -- .specify/slices .specify/KICKOFF-S11.5.md .specify/content)"
guard XPLODER-SRC-OK test "$(git diff --name-only "$B" -- packages/xploder/src packages/xploder/package.json | sort)" \
  = "$(grep -v '^#' "$F/approved-xploder-src.txt" | sed '/^$/d' | sort)"
guard SURFACE-S2-OK git diff --quiet "$B" -- $(xpf s2.paths)
guard SURFACE-S4-OK git diff --quiet "$S4BASE" -- $(xpf s4.paths)
guard SURFACE-S5-OK git diff --quiet f31600e -- $(xp frozen-surface.s5.paths)
guard SURFACE-S6-OK git diff --quiet "$S6BASE" -- $(xp frozen-surface.s6.paths)
guard SURFACE-S7-OK git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK git diff --quiet 99a94f2 -- $(xp frozen-surface.s8.paths)
guard DEV-ROUTES-OK git diff --quiet "$B" -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard S8-TOOLS-OK git diff --quiet "$B" -- tools/perf/src/{a11y-axe,a11y-probe,engine-probe,panel-probe,presentation-snapshot}.ts \
  tools/perf/src/cli/{a11y-axe,a11y-probe,engine-probe}.ts
guard CI-JOBS-OK git diff --quiet "$B" -- .github/workflows/ci.yml .github/workflows/perf.yml
guard VERSIONS-OK test "$(git diff "$B" -- pnpm-lock.yaml | grep -cE '^[+-] +(three|@react-three/fiber|next)@')" = 0
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
