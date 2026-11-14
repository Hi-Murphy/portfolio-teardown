#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
# Build like CI's `seo: meta + og` job: canonical/OG URLs use the production origin (S12 T004 review).
export SITE_URL=https://hi-murphy.me
F=.specify/features/m1-validation
mkdir -p /tmp/s12-checks "$F/evidence"

PREVIEW=""
SKIP_BUILD=0
ONLY_IDS=""
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/tmp/s12-checks/run-${STAMP}"

usage() {
  printf 'Usage: bash %s [--preview <url>] [--skip-build] [--out <dir>] [--only <id,id>]\n' "$0"
}

while (($# > 0)); do
  case "$1" in
    --preview)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      PREVIEW=$2
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --out)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      OUT=$2
      shift 2
      ;;
    --only)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      ONLY_IDS=${2// /}
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -n "$PREVIEW" ]]; then
  case "$PREVIEW" in
    http://*|https://*) ;;
    *) printf '%s\n' '--preview must use http or https' >&2; exit 2 ;;
  esac
fi

mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)

ROW_IDS=()
ROW_LABELS=()
ROW_EXITS=()
ROW_ARTIFACTS=()
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

record_row() {
  ROW_IDS+=("$1")
  ROW_LABELS+=("$2")
  ROW_EXITS+=("$3")
  ROW_ARTIFACTS+=("$4")
}

selected() {
  [[ -z "$ONLY_IDS" || ",$ONLY_IDS," == *",$1,"* ]]
}

run_row() {
  local id=$1
  local label=$2
  local command=$3
  local artifact="$OUT/$id"
  local log="$OUT/$id.log"
  local code

  selected "$id" || return 0
  mkdir -p "$artifact"
  set +e
  bash -c "$command" >"$log" 2>&1
  code=$?
  set -e
  record_row "$id" "$label" "$code" "$artifact"
  if ((code == 0)); then
    printf 'PASS %s\n' "$id"
  elif ((code == 3 || code == 4)); then
    printf 'INFRA %s (exit %d): %s\n' "$id" "$code" "$log"
  else
    printf 'FAIL %s (exit %d): %s\n' "$id" "$code" "$log"
  fi
}

print_table() {
  local index result
  printf '| Id | Check | Exit | Result | Artifact |\n'
  printf '| --- | --- | ---: | --- | --- |\n'
  for ((index = 0; index < ${#ROW_IDS[@]}; index += 1)); do
    if ((${ROW_EXITS[index]} == 0)); then
      result=PASS
    elif ((${ROW_EXITS[index]} == 3 || ${ROW_EXITS[index]} == 4)); then
      result=INFRA
    else
      result=FAIL
    fi
    printf '| %s | %s | %s | %s | %s |\n' \
      "${ROW_IDS[index]}" "${ROW_LABELS[index]}" "${ROW_EXITS[index]}" "$result" \
      "${ROW_ARTIFACTS[index]}"
  done
}

finish() {
  local table index status=0
  table=$(print_table)
  printf '%s\n' "$table" | tee "$OUT/results.md"
  for index in "${ROW_EXITS[@]}"; do
    ((index == 0)) || status=1
  done
  ((status == 0)) && exit 0 || exit 6
}

if ((SKIP_BUILD == 0)); then
  if ! pnpm build >"$OUT/build.log" 2>&1; then
    record_row G1 'build, types, lint, tests' 1 "$OUT/G1"
    printf 'FAIL build (see %s)\n' "$OUT/build.log"
    finish
  fi
fi

PORT=$(node -e "const net=require('node:net');const s=net.createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close();});")
BASE="http://127.0.0.1:${PORT}"

pnpm serve:out --port "$PORT" >"$OUT/serve.log" 2>&1 &
SERVER_PID=$!

READY=0
for _ in $(seq 1 80); do
  if curl -fsS "$BASE/" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.25
done
if ((READY == 0)); then
  record_row SERVE 'serve local export' 3 "$OUT/serve.log"
  finish
fi

if ((SKIP_BUILD == 0)); then
  G1_COMMAND='pnpm typecheck && pnpm lint && pnpm test'
else
  G1_COMMAND='pnpm typecheck && pnpm lint && pnpm test && pnpm build'
fi
run_row G1 'build, types, lint, tests' "$G1_COMMAND"

run_row G3 'SEO meta + OG' \
  "pnpm --filter web seo:expect && pnpm seo:probe --out-dir apps/web/out --site-url https://hi-murphy.me --expect apps/web/out-seo-expect.json --out \"$OUT/G3\""

run_row G4 'Lighthouse mobile performance + accessibility' \
  "pnpm perf:lighthouse \"$BASE/\" --categories performance,accessibility --out \"$OUT/G4/home\" && pnpm perf:lighthouse \"$BASE/projects/websocket-inspector\" --categories performance,accessibility --out \"$OUT/G4/project\""

run_row G5 'CLS 0' \
  "pnpm site:probe --serve apps/web/out --group cls --out \"$OUT/G5\""

run_row G6 'weight below 3 MB' \
  "pnpm perf:weight \"$BASE/\" --out \"$OUT/G6/home\" && pnpm perf:weight \"$BASE/projects/websocket-inspector\" --out \"$OUT/G6/project\""

run_row G7 'axe serious + critical' \
  "pnpm a11y:axe:site --serve apps/web/out --out \"$OUT/G7\""

run_row G8 'fixture exclusion + route surface' \
  "pnpm site:probe --serve apps/web/out --group routes --out \"$OUT/G8\""

run_row G10 'two draw calls' \
  "pnpm site:probe --serve apps/web/out --group draws --out \"$OUT/G10\""

run_row G11 'projects main byte-identical' \
  "bash \"$F/main-diff.sh\" --no-build"

run_row G12 'frozen surfaces + xploder tests' \
  'dirty=0; for p in packages/xploder/test/frozen-surface{,.s5,.s6,.s7,.s8}.paths; do if ! git diff --quiet 3aee8fc -- $(sed "s#^#packages/xploder/#" "$p"); then echo "DIRTY $p"; dirty=1; fi; done; if [ "$dirty" -ne 0 ]; then exit 1; fi; pnpm --filter xploder test'

run_row G13 'hero contract + eager loop' \
  "pnpm site:probe --serve apps/web/out --group hero --out \"$OUT/G13/site\" && pnpm eager:probe --serve apps/web/out --route / --runs 2 --expect live-loop --out \"$OUT/G13/eager\""

run_row C1 'visible copy tests + home copy probe' \
  "pnpm --filter web exec vitest run test/no-hand-copied-content.test.ts test/site-copy-fidelity.test.ts test/content-fidelity.test.ts test/home-copy.test.ts test/home-copy-mutation.test.tsx && pnpm home:probe --serve apps/web/out --group copy --out \"$OUT/C1/home\""

CONTENT_COMMAND="node \"$F/site-checks.mjs\" --part content --serve apps/web/out --out \"$OUT/C2-C4\""
if [[ -n "$PREVIEW" ]]; then
  CONTENT_COMMAND+=" --preview \"$PREVIEW\""
fi
run_row C2-C4 'content integrity C2-C4' "$CONTENT_COMMAND"

run_row AC5 'degraded modes + keyboard walk' \
  "node \"$F/site-checks.mjs\" --part degraded --serve apps/web/out --out \"$OUT/AC5\""

if [[ -n "$PREVIEW" ]]; then
  D3_TARGET="--base-url \"$PREVIEW\""
  D5_TARGET="--base-url \"$PREVIEW\""
else
  D3_TARGET='--serve apps/web/out'
  D5_TARGET='--serve apps/web/out'
fi
run_row D3 'desktop Chromium M1-M7' \
  "node \"$F/site-checks.mjs\" --part devices --cell D3 $D3_TARGET --out \"$OUT/D3\""
run_row D5 'desktop Firefox M1-M7' \
  "node \"$F/site-checks.mjs\" --part devices --cell D5 $D5_TARGET --out \"$OUT/D5\""

if [[ -f "$F/guards.sh" ]]; then
  run_row guards 'slice guards' "bash \"$F/guards.sh\""
else
  run_row guards 'slice guards' 'printf "guards.sh is missing\n"; exit 1'
fi

finish
