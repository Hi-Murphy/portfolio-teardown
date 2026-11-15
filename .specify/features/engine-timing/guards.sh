#!/usr/bin/env bash
# S15 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=8c410f3
F=.specify/features/engine-timing
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
  git diff --quiet "$B" -- .specify/slices .specify/KICKOFF-S15.md .specify/content
}

surfaces_s2s4s7_ok() {
  git diff --quiet "$B" -- "$X/test/frozen-surface.manifest.json" \
    "$X/test/frozen-surface.paths" "$X/test/frozen-surface.generate.sh" || return 1
  git diff --quiet "$B" -- "$X/test/frozen-surface.s7.manifest.json" \
    "$X/test/frozen-surface.s7.paths" "$X/test/frozen-surface.generate-s7.sh" || return 1
  git diff --quiet "$B" -- $(sed "s#^#$X/#" \
    "$X/test/frozen-surface.paths" "$X/test/frozen-surface.s7.paths")
}

s3_tools_ok() {
  git diff --quiet "$B" -- tools/perf/src/{args,browser,budgets,evidence,exit-codes,fps,lighthouse,log,preview,reach,serve,summary-md,weight}.ts \
    tools/perf/src/cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}.ts
}

reseal_list_ok() {
  local changed sealed listed_tests path sealed_path unexpected=
  changed=$(changed_paths)
  sealed=$(
    for p in s5 s6 s8; do sed "s#^#$X/#" "$X/test/frozen-surface.$p.paths"; done | sort -u
  )
  listed_tests=$(
    for p in s5 s6 s8; do awk '/^test\//{print "packages/xploder/" $0}' "$X/test/frozen-surface.$p.paths"; done |
      sort -u
  )

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    [[ "$path" == "$X/src/time/"* ]] || while IFS= read -r sealed_path; do
      [[ -n "$sealed_path" ]] || continue
      [[ "$path" == "$sealed_path" || "$path" == "$sealed_path/"* ]] && break
      sealed_path=
    done <<<"$sealed"
    [[ "$path" == "$X/src/time/"* || -n "$sealed_path" ]] || continue
    [[ "$path" == "$X/test/frozen-surface."* ]] && continue
    grep -qxF "$path" <<<"$listed_tests" && continue
    grep -qxF "$path" <(grep -v '^#' "$F/approved-xploder-src.txt") || unexpected+="$path"$'\n'
  done <<<"$changed"

  [[ -z "$unexpected" ]]
}

allowed_paths_ok() {
  local changed unexpected
  changed=$(changed_paths)
  [[ -n "$changed" ]] || return 0
  unexpected=$(grep -vE "^($X/src/time/(clock|fake)\.ts|$X/src/react/(useTeardownViewer|useTourClock)\.ts|$X/src/react/TeardownViewer\.tsx|$X/src/react/scene/(Scene|OverlayProjector)\.tsx|$X/src/overlay/place\.ts|$X/src/react/panel/PanelLayer\.tsx|$X/src/react/events\.ts|$X/src/react/index\.ts|$X/test/fixtures/index\.ts|$X/test/(clock\.test\.ts|scene-clock\.test\.tsx|tour-clock-engine\.test\.tsx|overlay-clock\.test\.tsx|no-time-reads\.test\.ts|no-real-timers\.test\.ts|viewer-pause\.test\.tsx|scene-pause\.test\.tsx|overlay-settle-state\.test\.tsx|viewer-events\.test\.ts|overlay-projector\.test\.tsx)|$X/test/frozen-surface\..*|apps/web/components/hero/(hero-stage|hero-leader|hero-showcase|hero-live)\.tsx|apps/web/components/workbench/workbench-client\.tsx|apps/web/app/dev/engine/engine-playground\.tsx|apps/web/test/home-hero-loop\.test\.tsx|apps/web/test/xploder-dom/(viewer-clock|viewer-pause|viewer-events|a11y-navigator|a11y-panel-focus)\.dom\.test\.tsx|tools/perf/src/(site-probe|eager-probe)\.ts|tools/perf/test/(site-probe|eager-probe)\.test\.ts|$F/.*)$" <<<"$changed" || true)
  [[ -z "$unexpected" ]]
}

no_new_deps_ok() {
  git diff --quiet "$B" -- package.json apps/web/package.json \
    packages/xploder/package.json tools/perf/package.json
}

seal_tag_ok() {
  local manifest base
  for manifest in "$X/test/frozen-surface.manifest.json" \
    "$X/test/frozen-surface.s5.manifest.json" "$X/test/frozen-surface.s6.manifest.json" \
    "$X/test/frozen-surface.s7.manifest.json" "$X/test/frozen-surface.s8.manifest.json"; do
    base=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).base)' "$manifest")
    git ls-remote --tags origin "refs/tags/seal/*-$base" | grep -q . || return 1
  done
}

timeout_not_raised_ok() {
  ! git diff -U0 "$B" -- tools/perf/src/site-probe.ts tools/perf/src/eager-probe.ts |
    grep -E '^-.*(_MS\b.*=|timeout:)\s*[0-9A-Z_]'
}

gitleaks_ok() {
  if [[ -n "$(git rev-list --max-count=1 "$B"..HEAD)" ]]; then
    gitleaks git --no-banner --log-opts="$B..HEAD" . >/dev/null 2>&1 || return 1
  fi
  gitleaks dir --no-banner "$F" >/dev/null 2>&1
}

ac1_scan() {
  local hits count
  hits=$(grep -rnE 'performance\.now\(|Date\.now\(' "$X/src" | grep -v "^$X/src/time/" || true)
  count=$(printf '%s' "$hits" | awk 'NF{n++} END{print n+0}')

  if [[ ! -f "$X/test/no-time-reads.test.ts" ]]; then
    echo "AC1-SCAN-PENDING ($count hits)"
    return
  fi
  if [[ -z "$hits" ]]; then
    echo "AC1-SCAN-OK"
  else
    echo "FAIL AC1-SCAN"
    fails=1
  fi
}

guard FROZEN-OK frozen_ok
guard SURFACES-S2S4S7-OK surfaces_s2s4s7_ok
guard S3-TOOLS-OK s3_tools_ok
guard RESEAL-LIST-OK reseal_list_ok
guard ALLOWED-PATHS-OK allowed_paths_ok
guard NO-NEW-DEPS-OK no_new_deps_ok
ac1_scan
guard SEAL-TAG-OK seal_tag_ok
guard TIMEOUT-NOT-RAISED-OK timeout_not_raised_ok
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
