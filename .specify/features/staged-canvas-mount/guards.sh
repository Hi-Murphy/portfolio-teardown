#!/usr/bin/env bash
# S11.6 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=05e4e16
F=.specify/features/staged-canvas-mount

xp() { sed 's#^#packages/xploder/#' "packages/xploder/test/$1"; }
xpf() { sed 's#^#packages/xploder/#' "$F/$1"; }
approved() { grep -v '^#' "$F/approved-xploder-src.txt" | sed '/^$/d'; }
excl() { approved | sed 's#^#:(exclude)#'; }

xp_tests_of_all_manifests() {
  local paths
  for paths in packages/xploder/test/frozen-surface{,.s5,.s6,.s7,.s8}.paths; do
    sed -n 's#^test/#packages/xploder/test/#p' "$paths"
  done
}

paths_contains() {
  local path=$1 paths=$2 entry full
  while IFS= read -r entry; do
    [[ -z "$entry" ]] && continue
    full="packages/xploder/$entry"
    if [[ "$entry" == */ || -d "$full" ]]; then
      [[ "$path" == "$full"* ]] && return 0
    elif [[ "$path" == "$full" ]]; then
      return 0
    fi
  done < "$paths"
  return 1
}

note_in_generator() {
  grep -Fq 'S11.6' "$1" && grep -Fq -- "$2" "$1"
}

reseal_note_ok() {
  local path relative surface matched
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    relative=${path#packages/xploder/}
    matched=0

    if paths_contains "$path" packages/xploder/test/frozen-surface.paths; then
      matched=1
      note_in_generator packages/xploder/test/frozen-surface.generate.sh "$relative" || return 1
    fi
    if paths_contains "$path" packages/xploder/test/frozen-surface.s6.paths; then
      matched=1
      note_in_generator packages/xploder/test/frozen-surface.generate-s6.sh "$relative" || return 1
    fi
    if paths_contains "$path" packages/xploder/test/frozen-surface.s8.paths; then
      matched=1
      note_in_generator packages/xploder/test/frozen-surface.generate-s8.sh "$relative" || return 1
    fi

    [[ "$matched" == 1 ]] || return 1
  done < <(approved)
}

rebaseline_first_ok() {
  local first evidence
  first=$(git log --reverse --format=%H "$B"..HEAD -- packages/xploder/src | head -1)
  test -z "$first" && return 0
  evidence=$(git log --format=%H --diff-filter=A -1 -- "$F/evidence/T004-log-rebaseline.md")
  test -n "$evidence" && git merge-base --is-ancestor "$evidence" "$first"
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
    echo "$name"
  else
    echo "FAIL ${name%-OK}"
    fails=1
  fi
}

guard FROZEN-OK git diff --quiet "$B" -- .specify/slices .specify/KICKOFF-S11.6.md .specify/content
guard BRIEF-HISTORY-OK test -z "$(git log --oneline "$B"..HEAD -- .specify/slices .specify/KICKOFF-S11.6.md .specify/content)"
guard XPLODER-SRC-OK test "$(git diff --name-only "$B" -- packages/xploder/src packages/xploder/package.json | sort)" \
  = "$(approved | sort)"
guard SURFACE-S2-OK git diff --quiet "$B" -- $(xpf s2.paths)
guard SURFACE-S4-OK git diff --quiet "$B" -- $(xpf s4.paths) $(excl)
guard SURFACE-S5-OK git diff --quiet f31600e -- $(xp frozen-surface.s5.paths)
guard SURFACE-S6-OK git diff --quiet "$B" -- $(xp frozen-surface.s6.paths) $(excl)
guard SURFACE-S7-OK git diff --quiet 5b22987 -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK git diff --quiet "$B" -- $(xp frozen-surface.s8.paths) $(excl)
guard SEALED-TESTS-OK git diff --quiet "$B" -- $(xp_tests_of_all_manifests)
guard RESEAL-NOTE-OK reseal_note_ok
guard REBASELINE-FIRST-OK rebaseline_first_ok
guard DEV-ROUTES-OK git diff --quiet "$B" -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard S8-TOOLS-OK git diff --quiet "$B" -- tools/perf/src/{a11y-axe,a11y-probe,engine-probe,panel-probe,presentation-snapshot}.ts \
  tools/perf/src/cli/{a11y-axe,a11y-probe,engine-probe}.ts
guard CI-JOBS-OK git diff --quiet "$B" -- .github/workflows/ci.yml .github/workflows/perf.yml .github/workflows/eager-3d.yml
guard VERSIONS-OK test "$(git diff "$B" -- pnpm-lock.yaml | grep -cE '^[+-] +(three|@react-three/fiber|react|react-dom|next)@')" = 0
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
