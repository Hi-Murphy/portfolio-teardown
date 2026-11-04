#!/usr/bin/env bash
# S11.7 guards (plan.md "Guards"). Prints one line per guard; exits 1 on any failure.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=7833b28
F=.specify/features/eager-load

app_touch_ok() {
  test -f "$F/app-touch.txt" || return 1
  local extra
  extra=$(git diff --name-only "$B" -- apps/web |
    grep -vxFf <(grep -v '^#' "$F/app-touch.txt") |
    wc -l | tr -d ' ')
  test "$extra" -eq 0
}

baseline_first_ok() {
  local first evidence
  first=$(git log --reverse --format=%H "$B"..HEAD -- apps/web/components apps/web/build apps/web/app | head -1)
  test -z "$first" && return 0
  evidence=$(git log --format=%H --diff-filter=A -1 -- "$F/evidence/T006-log-baseline.md")
  test -n "$evidence" && git merge-base --is-ancestor "$evidence" "$first"
}

ci_jobs_ok() {
  git diff --quiet "$B" -- .github/workflows/ci.yml .github/workflows/perf.yml .github/workflows/eager-3d.yml ||
    return 1
  local added
  added=$(git diff --name-only --diff-filter=A "$B" -- .github/workflows)
  test "$added" = ".github/workflows/eager-load.yml" || test -z "$added"
}

gitleaks_ok() {
  gitleaks git --no-banner --log-opts="$B..HEAD" . >/dev/null 2>&1 &&
    gitleaks dir --no-banner "$F" >/dev/null 2>&1
}

fails=0
guard() {
  local name=$1
  shift
  if "$@" >/dev/null 2>&1; then
    echo "OK $name"
  else
    echo "FAIL $name"
    fails=1
  fi
}

guard FROZEN git diff --quiet "$B" -- .specify/slices .specify/KICKOFF-S11.7.md .specify/content
guard BRIEF-HISTORY test -z "$(git log --oneline "$B"..HEAD -- .specify/slices .specify/KICKOFF-S11.7.md .specify/content)"
guard XPLODER-EMPTY git diff --quiet "$B" -- packages/xploder
guard APP-TOUCH app_touch_ok
guard BASELINE-FIRST baseline_first_ok
guard DEV-ROUTES git diff --quiet "$B" -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard CI-JOBS ci_jobs_ok
guard FLAG-DEFAULT grep -q "process.env.NEXT_PUBLIC_EAGER_3D === '1'" apps/web/next.config.ts
guard VERSIONS git diff --quiet "$B" -- pnpm-lock.yaml packages/*/package.json apps/web/package.json tools/perf/package.json
guard BUDGETS git diff --quiet "$B" -- tools/perf/src/budgets.ts
guard GITLEAKS gitleaks_ok
exit "$fails"
