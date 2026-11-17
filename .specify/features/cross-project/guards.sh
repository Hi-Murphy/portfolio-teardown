#!/usr/bin/env bash
# S17 guards (plan.md "Guards"). One line per guard; exits 1 if any guard fails.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE=f0c2d37
F=.specify/features/cross-project
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
  paths_unchanged "$BASE" .specify/slices .specify/KICKOFF-S17.md .specify/content/site.json
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

tools_ok() {
  paths_unchanged "$BASE" tools/perf
}

ci_ok() {
  paths_unchanged "$BASE" .github
}

no_dep_ok() {
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

  git diff -U0 "$BASE" -- apps/web/package.json | node -e '
    const fs = require("node:fs");
    const allowed = /^"(next|eslint-config-next)":\s*"[^"]*",?$/;
    const unexpected = [];
    for (const raw of fs.readFileSync(0, "utf8").split("\n")) {
      if ((!raw.startsWith("+") && !raw.startsWith("-")) || raw.startsWith("+++") || raw.startsWith("---")) {
        continue;
      }
      const line = raw.slice(1).trim();
      if (!allowed.test(line)) unexpected.push(raw);
    }
    if (unexpected.length > 0) {
      console.error(`unexpected apps/web/package.json changes:\n${unexpected.join("\n")}`);
      process.exit(1);
    }
  ' || return 1

  BASE="$BASE" node --input-type=module <<'NODE'
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function packages(lockfile) {
  const result = new Map();
  let inPackages = false;

  for (const line of lockfile.split('\n')) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) {
      inPackages = false;
      continue;
    }
    if (!inPackages) continue;

    const match = /^ {2}(?:'([^']+)'|([^:\s][^:]*)):\s*$/.exec(line);
    if (!match) continue;
    const key = match[1] ?? match[2];
    const separator = key.startsWith('@') ? key.indexOf('@', 1) : key.indexOf('@');
    if (separator <= 0) continue;
    const name = key.slice(0, separator);
    const version = key.slice(separator + 1).split('(')[0];
    if (!result.has(name)) result.set(name, new Set());
    result.get(name).add(version);
  }

  return result;
}

const base = packages(
  execFileSync('git', ['show', `${process.env.BASE}:pnpm-lock.yaml`], { encoding: 'utf8' }),
);
const head = packages(readFileSync('pnpm-lock.yaml', 'utf8'));
const baseNames = new Set(base.keys());
const headNames = new Set(head.keys());
const added = [...headNames].filter((name) => !baseNames.has(name)).sort();
const removed = [...baseNames].filter((name) => !headNames.has(name)).sort();

if (added.length > 0 || removed.length > 0) {
  if (added.length > 0) console.error(`lockfile package names added: ${added.join(', ')}`);
  if (removed.length > 0) console.error(`lockfile package names removed: ${removed.join(', ')}`);
  process.exit(1);
}

const moved = [];
for (const name of baseNames) {
  const before = [...base.get(name)].sort().join(',');
  const after = [...head.get(name)].sort().join(',');
  if (before === after) continue;
  const allowed =
    name === 'next' || name === 'eslint-config-next' || name.startsWith('@next/');
  if (!allowed) moved.push(`${name}: ${before} -> ${after}`);
}

if (moved.length > 0) {
  console.error(`unexpected lockfile version changes:\n${moved.join('\n')}`);
  process.exit(1);
}
NODE
}

allowed_paths_ok() {
  local changed unexpected
  changed=$(changed_paths)
  [[ -n "$changed" ]] || return 0
  unexpected=$(grep -vE '^(\.specify/content/(jev-toolkit|websocket-inspector)\.json|apps/web/content/projects/|apps/web/scripts/convert-content\.ts|apps/web/components/connections\.tsx|apps/web/app/\(site\)/projects/\[slug\]/page\.tsx|apps/web/test/|apps/web/package\.json|pnpm-lock\.yaml|apps/web/AGENTS\.md|\.specify/features/cross-project/)' <<<"$changed" || true)
  [[ -z "$unexpected" ]] || {
    printf 'unexpected paths:\n%s\n' "$unexpected"
    return 1
  }
}

convert_check_ok() {
  pnpm --filter web content:convert --check
}

gitleaks_ok() {
  gitleaks git --no-banner --log-opts="$BASE..HEAD" . &&
    gitleaks dir --no-banner .specify/features/cross-project
}

guard FROZEN-OK frozen_ok
guard XPLODER-OK xploder_ok
guard SURFACES-S2S8-OK surfaces_s2s8_ok
guard TOOLS-OK tools_ok
guard CI-OK ci_ok
guard NO-DEP-OK no_dep_ok
guard ALLOWED-PATHS-OK allowed_paths_ok
if [[ -f "$F/content-patch-check.mjs" ]]; then
  guard CONTENT-PATCH-OK node "$F/content-patch-check.mjs"
else
  echo "CONTENT-PATCH-OK (n/a before T002)"
fi
guard CONVERT-CHECK-OK convert_check_ok
guard GITLEAKS-OK gitleaks_ok

exit "$fails"
