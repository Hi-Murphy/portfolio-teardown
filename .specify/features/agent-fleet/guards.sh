#!/usr/bin/env bash
# S18 guards (plan.md "Guards"). One line per guard; exits 1 if any guard fails.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE=33e2ba1
F=.specify/features/agent-fleet
X=packages/xploder

fails=0

guard() {
  local name=$1
  local output
  shift
  if output=$("$@" 2>&1); then
    echo "$name"
  else
    echo "FAIL ${name%-OK}"
    [[ -z "$output" ]] || printf '%s\n' "$output"
    fails=1
  fi
}

changed_paths() {
  {
    git diff --name-only "$BASE"
    git ls-files --others --exclude-standard
  } | sort -u
}

paths_unchanged() {
  local base=$1
  shift
  git diff --quiet "$base" -- "$@" &&
    [[ -z "$(git ls-files --others --exclude-standard -- "$@")" ]]
}

frozen_ok() {
  paths_unchanged "$BASE" .specify/slices .specify/KICKOFF-S18.md .specify/content
}

xploder_ok() {
  paths_unchanged "$BASE" "$X"
}

seal_list_ok() {
  local base=$1
  local list=$2
  local -a sealed=()
  local path
  while IFS= read -r path || [[ -n "$path" ]]; do
    [[ -z "$path" || "$path" == \#* ]] && continue
    sealed+=("$X/${path%/}")
  done <"$list"
  ((${#sealed[@]} > 0)) || return 1
  paths_unchanged "$base" "${sealed[@]}"
}

surfaces_s2s8_ok() {
  seal_list_ok 3aee8fc "$X/test/frozen-surface.paths" || return 1
  seal_list_ok 5d3abdb "$X/test/frozen-surface.s5.paths" || return 1
  seal_list_ok c8794b2 "$X/test/frozen-surface.s6.paths" || return 1
  seal_list_ok cc663f7 "$X/test/frozen-surface.s7.paths" || return 1
  seal_list_ok c8794b2 "$X/test/frozen-surface.s8.paths" || return 1
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts
}

s3_tools_ok() {
  paths_unchanged "$BASE" \
    tools/perf/src/{args,browser,budgets,evidence,exit-codes,fps,lighthouse,log,preview,reach,serve,summary-md,weight}.ts \
    tools/perf/src/cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}.ts
}

no_dep_ok() {
  paths_unchanged "$BASE" pnpm-lock.yaml || return 1

  local path package_changes=
  while IFS= read -r path; do
    [[ -z "$path" || "$path" == apps/web/package.json ]] && continue
    if [[ "$path" == package.json || "$path" == */package.json ]]; then
      package_changes+="$path"$'\n'
    fi
  done <<<"$(changed_paths)"
  [[ -z "$package_changes" ]] || {
    printf 'unexpected package.json changes:\n%s' "$package_changes"
    return 1
  }

  BASE="$BASE" node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const path = 'apps/web/package.json';
const before = JSON.parse(execFileSync('git', ['show', `${process.env.BASE}:${path}`], { encoding: 'utf8' }));
const after = JSON.parse(readFileSync(path, 'utf8'));

delete before.scripts?.build;
delete after.scripts?.build;

try {
  assert.deepStrictEqual(after, before);
} catch {
  console.error(`${path} changed outside scripts.build`);
  process.exit(1);
}
NODE
}

allowed_paths_ok() {
  local changed unexpected
  changed=$(changed_paths)
  [[ -n "$changed" ]] || return 0
  unexpected=$(grep -vE '^(apps/web/scripts/(convert-content|redaction-scan)\.ts|apps/web/content/projects/(agent-fleet\.ts|agent-fleet\.source\.ts|index\.ts)|apps/web/components/tech-chip-list\.tsx|apps/web/package\.json|apps/web/test/|tools/perf/src/(project-sources|site-probe)\.ts|tools/perf/test/|\.github/workflows/perf\.yml|\.specify/features/agent-fleet/)' <<<"$changed" || true)
  [[ -z "$unexpected" ]] || {
    printf 'unexpected paths:\n%s\n' "$unexpected"
    return 1
  }
}

convert_check_ok() {
  pnpm --filter web content:convert --check
}

no_registry_ok() {
  paths_unchanged "$BASE" apps/web/content/tech-registry.ts
}

no_relationship_ok() {
  paths_unchanged "$BASE" apps/web/content/projects/connections.ts &&
    [[ ! -e .specify/content/relationships/agent-fleet.json ]]
}

gitleaks_ok() {
  gitleaks git --no-banner --log-opts="$BASE..HEAD" . &&
    gitleaks dir --no-banner .specify/features/agent-fleet
}

redaction_prose_ok() {
  # R-C (corrected, R-I): only the prose that makes claims about the fleet is scanned with the content rules.
  # Design docs (rfc/spec/plan/tasks, T000 spike log) quote the patterns themselves; gitleaks covers them.
  local file
  for file in "$F/evidence/source-map.md" "$F/evidence/T005-log-g5-read.md" "$F/evidence/AC-selfcheck.md"; do
    [[ -f "$file" ]] || continue
    node apps/web/scripts/redaction-scan.ts content "$file" || return 1
  done
}

guard FROZEN-OK frozen_ok
guard XPLODER-OK xploder_ok
guard SURFACES-S2S8-OK surfaces_s2s8_ok
guard S3-TOOLS-OK s3_tools_ok
guard NO-DEP-OK no_dep_ok
guard ALLOWED-PATHS-OK allowed_paths_ok
guard CONVERT-CHECK-OK convert_check_ok
guard NO-REGISTRY-OK no_registry_ok
guard NO-RELATIONSHIP-OK no_relationship_ok
guard GITLEAKS-OK gitleaks_ok
guard REDACTION-PROSE-OK redaction_prose_ok

exit "$fails"
