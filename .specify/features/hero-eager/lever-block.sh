#!/usr/bin/env bash
# S11.8 local A/B block. Source after setting T=tNNN; the other inputs are overridable.
F=${F:-.specify/features/hero-eager}
T=${T:?set T=tNNN}
EAGER_BUILD=${EAGER_BUILD:-build:eager-hero}
M=${M:-16.4}   # T004 §9 drift re-check (18.5 → 16.4)
GLFLAG=${GLFLAG:-}
O=${O:-/tmp/s118-checks/$T}
BEFORE=${BEFORE:-}
PARITY_GATED=${PARITY_GATED:-$F/evidence/T004-log-parity-gated.json}
PARITY_EAGER=${PARITY_EAGER:-$F/evidence/T004-log-parity-eager-home.json}

# Before = the most recent earlier task that left an A/B dir (skipped levers leave none);
# T010 compares the whole E1 group against the T004 base.
if [ -z "$BEFORE" ]; then
  n=$((10#${T#t}))
  if [ "$n" -eq 10 ]; then
    BEFORE=$F/evidence/T004-ab
  else
    for ((k = n - 1; k >= 4; k--)); do
      candidate=$(printf '%s/evidence/T%03d-ab' "$F" "$k")
      if [ -d "$candidate" ]; then BEFORE=$candidate; break; fi
    done
  fi
fi

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
mkdir -p "$O"
: > "$O/exit-codes.txt"

GL_ARGS=()
if [ -n "$GLFLAG" ]; then GL_ARGS=(--gl "$GLFLAG"); fi

measure() {
  local label=$1
  shift
  local code=0
  set +e
  {
    printf '$'
    printf ' %q' "$@"
    printf '\n'
    "$@"
  } 2>&1 | tee "$O/$label.log"
  code=$?
  set -e
  echo "$label exit=$code" | tee -a "$O/exit-codes.txt"
}

SRV_PID=
stop_server() {
  if [ -n "$SRV_PID" ]; then
    kill "$SRV_PID" 2>/dev/null || true
    wait "$SRV_PID" 2>/dev/null || true
    SRV_PID=
  fi
}
trap stop_server EXIT

prepare_parity_baseline() {
  local manifest=$1
  local dest=$2
  mkdir -p "$dest"
  cp "$manifest" "$dest/parity.json"
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const [manifest, dest, shots] = process.argv.slice(1);
    const baseline = JSON.parse(fs.readFileSync(manifest, "utf8"));
    for (const shot of baseline.shots) {
      const target = path.join(dest, shot.file);
      try { fs.unlinkSync(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
      fs.symlinkSync(path.join(shots, shot.file), target);
    }
  ' "$manifest" "$dest" "$PWD/$F/evidence"
}

prepare_parity_baseline "$PARITY_GATED" "$O/parity-baseline-gated"
prepare_parity_baseline "$PARITY_EAGER" "$O/parity-baseline-eager"

pnpm "$EAGER_BUILD"
pnpm bundle:manifest --out-dir apps/web/out --write "$O/eager-manifest.json"

node tools/perf/src/cli/serve.ts --port 4321 > "$O/server-eager.log" 2>&1 &
SRV_PID=$!
sleep 2
for i in 1 2; do
  measure "lh-home-r$i" pnpm perf:lighthouse http://127.0.0.1:4321/ \
    ${GL_ARGS[@]+"${GL_ARGS[@]}"} --cpu-multiplier "$M" --out "$O/lh-home-r$i"
done
measure "lhp-home" pnpm perf:lighthouse http://127.0.0.1:4321/ --profile \
  ${GL_ARGS[@]+"${GL_ARGS[@]}"} --cpu-multiplier "$M" --out "$O/lhp-home"
stop_server
measure "attr-home" pnpm perf:attribution \
  --lhr "$O/lhp-home/lighthouse-run-0.json" \
  --trace "$O/lhp-home/lighthouse-run-0.trace.json.gz" \
  --manifest "$O/eager-manifest.json" --out-dir apps/web/out --out "$O/attr-home"

for i in 1 2; do
  measure "fps-home-r$i" pnpm fps:engine --scenario load --route / --no-build \
    --frames trace-only --cpu 1 --names --out "$O/fps-home-r$i"
done
for i in 1 2; do
  measure "fps-home-cpu4-r$i" pnpm fps:engine --scenario load --route / --no-build \
    --frames trace-only --cpu 4 --names --out "$O/fps-home-cpu4-r$i"
done

measure "probe-home" pnpm eager:probe --serve apps/web/out --route / --runs 2 --out "$O/probe-home"
measure "probe-home-reduce" pnpm eager:probe --serve apps/web/out --route / --runs 2 \
  --reduced-motion --out "$O/probe-home-reduce"
measure "probe-project-gated" pnpm eager:probe --serve apps/web/out \
  --route /projects/websocket-inspector --expect gated --runs 2 --out "$O/probe-project-gated"
project_probe_code=$(sed -n 's/^probe-project-gated exit=//p' "$O/exit-codes.txt")
if [ "$project_probe_code" != 0 ]; then
  if [ "$EAGER_BUILD" = build:eager ]; then
    printf '%s\n' \
      'EXPECTED AT BASE: build:eager makes both routes eager, so --expect gated fails here.' \
      'This is the pre-A1 state, not a product defect.' >> "$O/probe-project-gated.txt"
  else
    echo "PROJECT-GATED-PROBE-FAILED exit=$project_probe_code" >&2
    exit "$project_probe_code"
  fi
fi

measure "parity-eager-home" pnpm perf:parity --serve apps/web/out --no-engage --route home \
  --compare "$O/parity-baseline-eager" --out "$O/parity-eager-home"
measure "seq-home" pnpm perf:startup --serve apps/web/out --route / --engage none \
  --attribute --runs 2 --out "$O/seq-home"
node "$F/bundle-scopes.mjs" --budget s11.8 "$F/evidence/T001-log-bundle-eager.json" \
  /tmp/s118-checks/base-eager "$O/eager-manifest.json" apps/web/out | tee "$O/bytes-eager.txt" || \
  echo "exit $? (verdict recorded)" | tee -a "$O/bytes-eager.txt"

pnpm build
pnpm bundle:manifest --out-dir apps/web/out --write "$O/gated-manifest.json"
measure "parity-gated" pnpm perf:parity --serve apps/web/out --compare "$O/parity-baseline-gated" \
  --out "$O/parity-gated"
node "$F/bundle-scopes.mjs" --budget s11.8 "$F/evidence/T001-log-bundle-gated.json" \
  /tmp/s118-checks/base-gated "$O/gated-manifest.json" apps/web/out | tee "$O/bytes-gated.txt" || \
  echo "exit $? (verdict recorded)" | tee -a "$O/bytes-gated.txt"
measure "site-probe" pnpm site:probe --serve apps/web/out --group draws --group hero

node tools/perf/src/cli/serve.ts --port 4321 > "$O/server-gated.log" 2>&1 &
SRV_PID=$!
sleep 2
for i in 1 2; do
  measure "lh-project-r$i" pnpm perf:lighthouse http://127.0.0.1:4321/projects/websocket-inspector \
    ${GL_ARGS[@]+"${GL_ARGS[@]}"} --cpu-multiplier "$M" --out "$O/lh-project-r$i"
done
stop_server
trap - EXIT

for label in parity-eager-home parity-gated site-probe; do
  code=$(sed -n "s/^$label exit=//p" "$O/exit-codes.txt")
  if [ "$code" != 0 ]; then
    echo "$label failed with exit=$code" >&2
    exit "$code"
  fi
done
for build in eager gated; do
  grep -q 'RESULT: PASS' "$O/bytes-$build.txt" || {
    echo "bytes-$build failed" >&2
    exit 1
  }
done

if [ -n "$BEFORE" ] && [ -d "$BEFORE" ]; then
  node "$F/ab-table.mjs" "$BEFORE" "$O" > "$O/ab.md"
fi

find "$O/parity-baseline-gated" "$O/parity-baseline-eager" -type l -delete
find "$O/parity-baseline-gated" "$O/parity-baseline-eager" -type f -delete
rmdir "$O/parity-baseline-gated" "$O/parity-baseline-eager"

TID=$(printf '%s' "$T" | tr '[:lower:]' '[:upper:]')
DEST="$F/evidence/$TID-ab"
mkdir -p "$DEST"
# Summaries and reports only: full LHRs, devtools logs and traces stay in $O (EVIDENCE.md §4).
rsync -a --exclude 'lighthouse-run-*.json' --exclude '*.devtoolslog.json' --exclude '*.trace.json.gz' --exclude '*.html' "$O/" "$DEST/"

node - "$DEST" "$PWD" "$F/evidence" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [root, repo, shots] = process.argv.slice(2);

function sanitize(text) {
  return text
    .replaceAll(repo, '.')
    .replaceAll(shots, '.specify/features/hero-eager/evidence')
    .replace(/\/Users\/[^/\s"'\\]+/g, '<local-path>')
    .replace(/\/tmp\/s118-checks/g, '<local-path>/s118-checks')
    .replace(/\/tmp\//g, '<local-path>/tmp/');
}

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    else if (entry.isDirectory()) visit(target);
    else if (!entry.name.endsWith('.png')) {
      fs.writeFileSync(target, sanitize(fs.readFileSync(target, 'utf8')));
    }
  }
}

visit(root);
NODE

echo "local A/B artifacts: $DEST"
