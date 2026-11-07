#!/usr/bin/env bash
# S11.8 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=0fcd243
F=.specify/features/hero-eager
G1_SHA=2b4fa4c35a7c952b3a3cca180e4e824155e1e8ff54f7bc8795f8090374438a9b

xp() { sed 's#^#packages/xploder/#' "packages/xploder/test/$1"; }
xpf() { sed 's#^#packages/xploder/#' "$F/$1"; }
approved() { grep -v '^#' "$F/approved-xploder-src.txt" | sed 's/ *#.*//;/^$/d'; }
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
  grep -Fq 'S11.8' "$1" && grep -Fq -- "$2" "$1"
}

reseal_note_ok() {
  local path relative matched
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    relative=${path#packages/xploder/}
    matched=0

    if paths_contains "$path" packages/xploder/test/frozen-surface.paths; then
      matched=1
      note_in_generator packages/xploder/test/frozen-surface.generate.sh "$relative" || return 1
    fi
    if paths_contains "$path" packages/xploder/test/frozen-surface.s5.paths; then
      matched=1
      note_in_generator packages/xploder/test/frozen-surface.generate-s5.sh "$relative" || return 1
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

g1_list_ok() {
  test "$(shasum -a 256 < "$F/g1-approved.txt" | cut -d' ' -f1)" = "$G1_SHA" &&
    test -z "$(approved | grep -vxFf <(grep -v '^#' "$F/g1-approved.txt"))"
}

xploder_test_ok() {
  local added path
  added=$(git diff --name-only --diff-filter=A "$B" -- packages/xploder/test)
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if printf '%s\n' "$added" | grep -qxF "$path"; then
      continue
    fi
    case "$path" in
      packages/xploder/test/frozen-surface.generate.sh | \
      packages/xploder/test/frozen-surface.generate-s?.sh | \
      packages/xploder/test/frozen-surface.test.ts | \
      packages/xploder/test/frozen-surface*.manifest.json) ;;
      *) return 1 ;;
    esac
  done < <(git diff --name-only "$B" -- packages/xploder/test)
}

baseline_first_ok() {
  local first evidence
  first=$(git log --reverse --format=%H "$B"..HEAD -- apps packages | head -1)
  test -z "$first" && return 0
  evidence=$(git log --format=%H --diff-filter=A -1 -- "$F/evidence/T004-log-baseline.md")
  test -n "$evidence" && git merge-base --is-ancestor "$evidence" "$first"
}

app_touch_ok() {
  test -f "$F/app-touch.txt" || return 1
  local extra
  extra=$(git diff --name-only "$B" -- apps/web |
    grep -vxFf <(grep -v '^#' "$F/app-touch.txt") |
    wc -l | tr -d ' ')
  test "$extra" -eq 0
}

ci_jobs_ok() {
  git diff --quiet "$B" -- .github/workflows/{ci,perf,eager-3d,eager-load}.yml &&
    test -z "$(git diff --name-only --diff-filter=A "$B" -- .github/workflows |
      grep -vx .github/workflows/hero-eager.yml)"
}

# rfc.md §11.5: `/` is eager by default; `NEXT_PUBLIC_GATED_HERO=1` restores the gate.
flag_default_ok() {
  grep -q "process.env.NEXT_PUBLIC_EAGER_3D === '1'" apps/web/next.config.ts &&
    grep -q "process.env.NEXT_PUBLIC_GATED_HERO !== '1'" apps/web/next.config.ts
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

guard FROZEN-OK git diff --quiet "$B" -- .specify/slices .specify/KICKOFF-S11.8.md .specify/content
guard BRIEF-HISTORY-OK test -z "$(git log --oneline "$B"..HEAD -- .specify/slices .specify/KICKOFF-S11.8.md .specify/content)"
guard G1-LIST-OK g1_list_ok
guard XPLODER-SRC-OK test "$(git diff --name-only "$B" -- packages/xploder/src packages/xploder/package.json | sort)" \
  = "$(approved | sort)"
guard XPLODER-TEST-OK xploder_test_ok
guard SURFACE-S2-OK git diff --quiet "$B" -- $(xpf s2.paths)
guard SURFACE-S4-OK git diff --quiet "$B" -- $(xpf s4.paths) $(excl)
guard SURFACE-S5-OK git diff --quiet "$B" -- $(xp frozen-surface.s5.paths) $(excl)
guard SURFACE-S6-OK git diff --quiet "$B" -- $(xp frozen-surface.s6.paths) $(excl)
guard SURFACE-S7-OK git diff --quiet "$B" -- $(xp frozen-surface.s7.paths)
guard SURFACE-S8-OK git diff --quiet "$B" -- $(xp frozen-surface.s8.paths) $(excl)
guard SEALED-TESTS-OK git diff --quiet "$B" -- $(xp_tests_of_all_manifests)
guard RESEAL-NOTE-OK reseal_note_ok
guard BASELINE-FIRST-OK baseline_first_ok
guard APP-TOUCH-OK app_touch_ok
guard DEV-ROUTES-OK git diff --quiet "$B" -- apps/web/app/dev apps/web/app/fixtures apps/web/test/xploder-dom
guard CI-JOBS-OK ci_jobs_ok
guard FLAG-DEFAULT-OK flag_default_ok
guard VERSIONS-OK git diff --quiet "$B" -- pnpm-lock.yaml packages/*/package.json apps/web/package.json tools/perf/package.json
guard BUDGETS-OK git diff --quiet "$B" -- tools/perf/src/budgets.ts
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
