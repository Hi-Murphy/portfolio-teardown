#!/usr/bin/env bash
# S12 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

B=5dec9f9
P=ffda3a2
S=3aee8fc
LEDGER=.specify/features/m1-validation/fix-ledger.txt
PROTOCOL_SHA=6566893d4267a198c325b153be4860a3db874d03ae79124bef7abc99ccb54e60
TEMPLATE_SHA=f74af2ac87f7a1a47b9e979fcfc9aa0ed3e4eb2b8a9a8c029307277a07d097c8
FINAL=0
REASON=
failures=0
TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT

case "${1:-}" in
  '') ;;
  --final) FINAL=1 ;;
  *)
    echo "usage: bash $0 [--final]" >&2
    exit 1
    ;;
esac

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

ledger_paths() {
  awk '
    {
      sub(/[[:space:]]+#.*$/, "")
      gsub(/^[[:space:]]+|[[:space:]]+$/, "")
      if ($0 != "" && substr($0, 1, 1) != "#") print
    }
  ' "$LEDGER"
}

check_frozen() {
  local paths=(.specify/slices .specify/KICKOFF-S12.md .specify/content)
  local log

  if ! git diff --quiet "$B" -- "${paths[@]}"; then
    REASON="frozen files changed since $B"
    return 1
  fi

  log=$(git log --oneline "$B..HEAD" -- "${paths[@]}")
  if [[ -n "$log" ]]; then
    REASON="frozen files have commits since $B"
    return 1
  fi

  if [[ "$(sha256_file .specify/features/m1-validation/protocol.md)" != "$PROTOCOL_SHA" ]]; then
    REASON="protocol.md SHA-256 mismatch"
    return 1
  fi
  if [[ "$(sha256_file .specify/features/m1-validation/protocol-sheet-template.md)" != "$TEMPLATE_SHA" ]]; then
    REASON="protocol-sheet-template.md SHA-256 mismatch"
    return 1
  fi
}

check_product() {
  local changed=$TMP_ROOT/product-changed
  local ledger=$TMP_ROOT/product-ledger
  local path bad=()

  {
    git diff --name-only "$P" -- apps packages
    git ls-files --others --exclude-standard -- apps packages
  } | sort -u > "$changed"
  ledger_paths > "$ledger"

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    if ! grep -Fxq -- "$path" "$ledger"; then
      bad+=("$path")
    fi
  done < "$changed"

  if ((${#bad[@]} > 0)); then
    REASON="unledgered product paths: ${bad[*]}"
    return 1
  fi

  if ! git diff --quiet "$P" -- pnpm-lock.yaml; then
    REASON="pnpm-lock.yaml changed since $P"
    return 1
  fi

  local deps_output
  if ! deps_output=$(node - "$P" <<'NODE' 2>&1
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const base = process.argv[2];
const keys = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file === 'package.json' || file.endsWith('/package.json'))
  .filter((file) => !file.split('/').includes('node_modules'));

function canonical(block) {
  if (block === undefined || block === null) return null;
  return Object.keys(block)
    .sort()
    .map((name) => [name, block[name]]);
}

const bad = [];
for (const file of files) {
  let before;
  let current;
  try {
    before = JSON.parse(
      execFileSync('git', ['show', `${base}:${file}`], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      }),
    );
  } catch {
    bad.push(`${file} (missing at ${base})`);
    continue;
  }
  try {
    current = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    bad.push(`${file} (invalid JSON)`);
    continue;
  }

  for (const key of keys) {
    if (JSON.stringify(canonical(current[key])) !== JSON.stringify(canonical(before[key]))) {
      bad.push(`${file} (${key})`);
    }
  }
}

if (bad.length > 0) {
  console.error(`package dependency blocks changed since ${base}: ${bad.join(', ')}`);
  process.exit(1);
}
NODE
  ); then
    REASON=${deps_output:-"package dependency comparison failed"}
    return 1
  fi
}

check_surfaces() {
  local files=(
    packages/xploder/test/frozen-surface.paths
    packages/xploder/test/frozen-surface.s5.paths
    packages/xploder/test/frozen-surface.s6.paths
    packages/xploder/test/frozen-surface.s7.paths
    packages/xploder/test/frozen-surface.s8.paths
  )
  local file path paths dirty=()

  for file in "${files[@]}"; do
    if [[ ! -f "$file" ]]; then
      dirty+=("$file (missing)")
      continue
    fi
    paths=()
    while IFS= read -r path; do
      [[ -n "$path" ]] && paths+=("packages/xploder/$path")
    done < <(
      awk '
        {
          sub(/[[:space:]]+#.*$/, "")
          gsub(/^[[:space:]]+|[[:space:]]+$/, "")
          if ($0 != "" && substr($0, 1, 1) != "#") print
        }
      ' "$file"
    )
    if ((${#paths[@]} > 0)) && ! git diff --quiet "$S" -- "${paths[@]}"; then
      dirty+=("$file")
    fi
  done

  if ((${#dirty[@]} > 0)); then
    REASON="dirty frozen-surface sets: ${dirty[*]}"
    return 1
  fi
}

check_workflows() {
  if ((FINAL)); then
    if [[ -e .github/workflows/m1-validation.yml ]]; then
      REASON=".github/workflows/m1-validation.yml still exists"
      return 1
    fi
    return 0
  fi

  local changes=() line path
  while IFS= read -r line; do
    [[ -n "$line" ]] && changes+=("$line")
  done < <(git diff --name-status "$B" -- .github/workflows | tr '\t' ' ')

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    if ! git cat-file -e "$B:$path" 2>/dev/null; then
      changes+=("A $path")
    fi
  done < <(git ls-files --others --exclude-standard -- .github/workflows)

  if ((${#changes[@]} == 0)); then
    return 0
  fi
  if ((${#changes[@]} == 1)) && [[ "${changes[0]}" == "A .github/workflows/m1-validation.yml" ]]; then
    return 0
  fi

  REASON="unexpected workflow changes: ${changes[*]}"
  return 1
}

check_touch() {
  local changed=$TMP_ROOT/touch-changed
  local ledger=$TMP_ROOT/touch-ledger
  local path bad=()

  {
    git diff --name-only "$B"
    git ls-files --others --exclude-standard
  } | sort -u > "$changed"
  ledger_paths > "$ledger"

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    case "$path" in
      .specify/features/m1-validation/*) ;;
      .github/workflows/m1-validation.yml) ;;
      *)
        if ! grep -Fxq -- "$path" "$ledger"; then
          bad+=("$path")
        fi
        ;;
    esac
  done < "$changed"

  if ((${#bad[@]} > 0)); then
    REASON="paths outside the slice: ${bad[*]}"
    return 1
  fi
}

run_check() {
  local name=$1
  local fn=$2
  REASON=
  if "$fn"; then
    echo "OK $name"
  else
    echo "FAIL $name: ${REASON:-failed}"
    failures=$((failures + 1))
  fi
}

run_check frozen check_frozen
run_check product check_product
run_check surfaces check_surfaces
run_check workflows check_workflows
run_check touch check_touch

if ((failures > 0)); then
  exit 1
fi
