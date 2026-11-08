#!/usr/bin/env bash
# S11.9 eager-hero regression probe (plan.md "Regression probes").
# The caller builds apps/web/out; this script only probes the existing export.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/tmp/s119-checks/regress-${STAMP}"
mkdir -p "$OUT"

failures=0

step() {
  local name=$1
  shift
  local log="$OUT/${name}.log"
  if "$@" >"$log" 2>&1; then
    printf 'PASS %s\n' "$name"
  else
    printf 'FAIL %s (%s)\n' "$name" "$log"
    failures=$((failures + 1))
  fi
}

step eager-live pnpm eager:probe --serve apps/web/out --route / --runs 2 --out "$OUT/eager-live"
step eager-reduced-motion pnpm eager:probe --serve apps/web/out --route / --runs 2 --reduced-motion --out "$OUT/eager-reduced-motion"
step eager-save-data pnpm eager:probe --serve apps/web/out --route / --runs 2 --save-data --out "$OUT/eager-save-data"
step site-hero pnpm site:probe --serve apps/web/out --group hero --out "$OUT/site-hero"
step site-cls-draws pnpm site:probe --serve apps/web/out --group cls,draws --out "$OUT/site-cls-draws"

printf 'artifacts: %s\n' "$OUT"
if ((failures > 0)); then
  printf 'regress-hero: FAIL (%d steps)\n' "$failures"
  exit 1
fi
printf 'regress-hero: PASS (5 steps)\n'
