#!/usr/bin/env bash
# S14 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=a9edbfc
F=.specify/features/engine-polish
X=packages/xploder

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

changed_paths() {
  {
    git diff --name-only "$B"
    git ls-files --others --exclude-standard
  } | sort -u
}

frozen_ok() {
  git diff --quiet "$B" -- .specify/slices .specify/KICKOFF-S14.md .specify/content
}

surfaces_s2s4s7_ok() {
  local p
  for p in s2 s4 s7; do
    git diff --quiet "$B" -- "$X/test/frozen-surface.$p.manifest.json" \
      "$X/test/frozen-surface.$p.paths" "$X/test/frozen-surface.generate-$p.sh" || return 1
  done
  git diff --quiet "$B" -- "$X/test/frozen-surface.manifest.json" \
    "$X/test/frozen-surface.paths" "$X/test/frozen-surface.generate.sh" || return 1
  git diff --quiet "$B" -- $(sed "s#^#$X/#" \
    "$X/test/frozen-surface.paths" "$X/test/frozen-surface.s7.paths")
}

s3_tools_ok() {
  git diff --quiet "$B" -- tools/perf/src/{args,browser,budgets,evidence,exit-codes,fps,lighthouse,log,preview,reach,serve,summary-md,weight}.ts \
    tools/perf/src/cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}.ts
}

reseal_list_ok() {
  local changed sealed path sealed_path unexpected=
  changed=$(changed_paths)
  sealed=$(
    for p in s5 s6 s8; do sed "s#^#$X/#" "$X/test/frozen-surface.$p.paths"; done | sort -u
  )

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    while IFS= read -r sealed_path; do
      [[ -n "$sealed_path" ]] || continue
      if [[ "$path" == "$sealed_path" || "$path" == "$sealed_path/"* ]] &&
        ! grep -qxF "$path" <(grep -v '^#' "$F/approved-xploder-src.txt"); then
        unexpected+="$path"$'\n'
      fi
    done <<<"$sealed"
  done <<<"$changed"

  [[ -z "$unexpected" ]]
}

allowed_paths_ok() {
  local changed unexpected
  changed=$(changed_paths)
  [[ -n "$changed" ]] || return 0
  unexpected=$(grep -vE "^($X/src/interaction/emphasis\.ts|$X/src/react/scene/Emphasis\.tsx|$X/src/react/TeardownViewer\.tsx|$X/src/overlay/model\.ts|$X/test/(emphasis-selected|overlay-note-clear|no-clock-warning)\.test\.tsx?|$X/test/frozen-surface\..*|apps/web/components/home/hero-section\.tsx|apps/web/components/hero/hero-loop\.ts|apps/web/test/home-hero-loop\.test\.tsx|apps/web/test/xploder-dom/viewer-selected\.dom\.test\.tsx|tools/perf/src/site-probe\.ts|tools/perf/test/site-probe\.test\.ts|pnpm-workspace\.yaml|pnpm-lock\.yaml|patches/@react-three__fiber@9\.8\.2\.patch|\.github/workflows/(eager-3d|eager-load|hero-eager)\.yml|$F/.*)$" <<<"$changed" || true)
  [[ -z "$unexpected" ]]
}

no_new_deps_ok() {
  git diff --quiet "$B" -- package.json apps/web/package.json \
    packages/xploder/package.json tools/perf/package.json
}

timeout_not_raised_ok() {
  ! git diff -U0 "$B" -- tools/perf/src/site-probe.ts \
    | grep -E '^-.*(_MS\b.*=|timeout:)\s*[0-9A-Z_]'
}

gitleaks_ok() {
  if [[ -n "$(git rev-list --max-count=1 "$B"..HEAD)" ]]; then
    gitleaks git --no-banner --log-opts="$B..HEAD" . >/dev/null 2>&1 || return 1
  fi
  gitleaks dir --no-banner "$F" >/dev/null 2>&1
}

guard FROZEN-OK frozen_ok
guard SURFACES-S2S4S7-OK surfaces_s2s4s7_ok
guard S3-TOOLS-OK s3_tools_ok
guard RESEAL-LIST-OK reseal_list_ok
guard ALLOWED-PATHS-OK allowed_paths_ok
guard NO-NEW-DEPS-OK no_new_deps_ok
guard TIMEOUT-NOT-RAISED-OK timeout_not_raised_ok
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
