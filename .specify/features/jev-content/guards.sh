#!/usr/bin/env bash
# S13 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

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
  test -z "$(git log --oneline 3b829d0..HEAD -- .specify/slices .specify/KICKOFF-S13.md .specify/content)"
}

# Revision 1 of 2 (evidence/R1-revision-note.md): only these xploder paths may differ from 3b829d0.
R1_XPLODER_PATHS=(
  packages/xploder/src/react/useTourClock.ts
  packages/xploder/test/tour-clock-boundary.test.tsx
  packages/xploder/test/frozen-surface.s5.paths
  packages/xploder/test/frozen-surface.s5.manifest.json
  packages/xploder/test/frozen-surface.generate-s5.sh
  packages/xploder/test/frozen-surface.test.ts
)

surfaces_s2s8_ok() {
  local p
  # S2–S4, S6, S7, S8: byte-identical to the 3aee8fc seal.
  for p in frozen-surface{,.s6,.s7,.s8}.paths; do
    git diff --quiet 3aee8fc -- $(sed 's#^#packages/xploder/#' "packages/xploder/test/$p") || return 1
  done
  # S5: identical to 3aee8fc except the R1 paths; the re-sealed manifest is verified by the xploder test.
  git diff --quiet 3aee8fc -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) \
    $(printf ":(exclude)%s " "${R1_XPLODER_PATHS[@]}") || return 1
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts
}

xploder_ok() {
  git diff --quiet 3b829d0 -- packages/xploder $(printf ":(exclude)%s " "${R1_XPLODER_PATHS[@]}")
}

allowed_paths_ok() {
  local changed unexpected
  changed=$(
    {
      git diff --name-only 3b829d0
      git ls-files --others --exclude-standard
    } | sort -u
  )
  [[ -n "$changed" ]] || return 0
  unexpected=$(grep -vE '^(packages/xploder/src/react/useTourClock\.ts$|packages/xploder/test/tour-clock-boundary\.test\.tsx$|packages/xploder/test/frozen-surface\.(s5\.paths|s5\.manifest\.json|generate-s5\.sh|test\.ts)$|apps/web/content/projects/|apps/web/content/tech-registry\.ts$|apps/web/scripts/convert-content\.ts$|apps/web/test/|tools/perf/|\.github/workflows/perf\.yml$|\.specify/features/jev-content/)' <<<"$changed" || true)
  [[ -z "$unexpected" ]]
}

gitleaks_ok() {
  if [[ -n "$(git rev-list --max-count=1 3b829d0..HEAD)" ]]; then
    gitleaks git --no-banner --log-opts="3b829d0..HEAD" . >/dev/null 2>&1 || return 1
  fi
  gitleaks dir --no-banner .specify/features/jev-content >/dev/null 2>&1
}

guard FROZEN-OK git diff --quiet 3b829d0 -- .specify/slices .specify/KICKOFF-S13.md .specify/content
guard BRIEF-HISTORY-OK brief_history_ok
guard XPLODER-OK xploder_ok
guard SURFACES-S2S8-OK surfaces_s2s8_ok
guard UI-UNCHANGED-OK git diff --quiet 3b829d0 -- apps/web/app apps/web/components apps/web/seo
guard S8-TOOLS-OK git diff --quiet 3b829d0 -- tools/perf/src/a11y-axe.ts tools/perf/src/a11y-probe.ts \
  tools/perf/src/engine-probe.ts tools/perf/src/panel-probe.ts tools/perf/src/presentation-snapshot.ts
guard OTHER-CI-OK git diff --quiet 3b829d0 -- .github/workflows/ci.yml .github/workflows/hero-eager.yml \
  .github/workflows/eager-load.yml .github/workflows/eager-3d.yml
guard ALLOWED-PATHS-OK allowed_paths_ok
guard CONVERT-CHECK-OK pnpm --filter web content:convert --check
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
