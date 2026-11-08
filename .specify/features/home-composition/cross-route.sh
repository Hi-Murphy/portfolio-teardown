#!/usr/bin/env bash
# S11.9 cross-route guard. Normalises three exported pages and compares them to the T002 baseline.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F=.specify/features/home-composition
OUT=apps/web/out
BASELINE=$F/evidence/T002-cross-route-baseline
LEDGER=$F/cross-route-ledger.txt
MODE=${1:-check}
TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT

list_routes() {
  node - "$1" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2]);
if (!fs.existsSync(root)) {
  console.error(`no export at ${process.argv[2]}`);
  process.exit(1);
}

const routes = new Set();

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === 'index.html') {
        routes.add('/');
      } else if (relative.endsWith('/index.html')) {
        routes.add(`/${relative.slice(0, -'/index.html'.length)}`);
      } else {
        routes.add(`/${relative.slice(0, -'.html'.length)}`);
      }
    }
  }
}

walk(root);
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile()) routes.add(`/${entry.name}`);
}

process.stdout.write(`${[...routes].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)).join('\n')}\n`);
NODE
}

normalize_html() {
  node - "$1" "$2" <<'NODE'
const fs = require('node:fs');

let html = fs.readFileSync(process.argv[2], 'utf8');

html = html.replace(/\s(?:nonce|data-nonce|data-csp-nonce)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
html = html.replace(
  /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?__next_f(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
  '<script data-flight=""></script>',
);
html = html.replace(/\b(https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])):\d+/gi, '$1:PORT');
html = html.replace(/\/_next\/static\/[^\s"'<>()\\]+/g, '/_next/static/<h>');
html = html.replace(/(?<![/\w])static\/(?:chunks|media|css)\/[^\s"'<>()\\]+/g, 'static/<h>');
html = html.replace(/></g, '>\n<');
if (!html.endsWith('\n')) html += '\n';

fs.writeFileSync(process.argv[3], html);
NODE
}

extract_main() {
  node - "$1" "$2" <<'NODE'
const fs = require('node:fs');

const html = fs.readFileSync(process.argv[2], 'utf8');
const main = /<main\b[^>]*>[\s\S]*?<\/main>/.exec(html);
if (!main) {
  console.error('no <main> element');
  process.exit(1);
}
fs.writeFileSync(process.argv[3], main[0]);
NODE
}

route_file() {
  local route=$1 path
  case "$route" in
    projects)
      for path in "$OUT/projects.html" "$OUT/projects/index.html"; do
        [[ -f "$path" ]] && { printf '%s\n' "$path"; return 0; }
      done
      ;;
    project)
      for path in "$OUT/projects/websocket-inspector.html" "$OUT/projects/websocket-inspector/index.html"; do
        [[ -f "$path" ]] && { printf '%s\n' "$path"; return 0; }
      done
      ;;
    404)
      [[ -f "$OUT/404.html" ]] && { printf '%s\n' "$OUT/404.html"; return 0; }
      ;;
  esac
  return 1
}

ledger_check() {
  node - "$1" "$LEDGER" "$2" <<'NODE'
const fs = require('node:fs');

const diff = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const route = process.argv[4];
const hunks = [];
let current;
for (const line of diff) {
  if (line.startsWith('@@')) {
    if (current) hunks.push(current);
    current = [line];
  } else if (current) {
    current.push(line);
  }
}
if (current) hunks.push(current);

const patterns = fs
  .readFileSync(process.argv[3], 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const separator = line.indexOf('|');
    if (separator < 1) {
      console.error(`invalid ledger pattern: ${line}`);
      process.exit(1);
    }
    return { route: line.slice(0, separator), pattern: new RegExp(line.slice(separator + 1)) };
  });

for (const [index, hunk] of hunks.entries()) {
  const text = hunk.join('\n');
  const allowed = patterns.some(
    ({ route: scope, pattern }) =>
      (scope === '*' || scope === route || scope.split(',').includes(route)) && pattern.test(text),
  );
  if (!allowed) {
    console.error(`unledgered ${route} hunk ${index + 1}:`);
    console.error(text);
    process.exit(1);
  }
}
NODE
}

if [[ "$MODE" == --list-routes ]]; then
  list_routes "${2:-$OUT}"
  exit 0
fi

if [[ "$MODE" != check && "$MODE" != --write-baseline ]]; then
  echo "usage: bash $0 [--write-baseline | --list-routes [out-dir]]" >&2
  exit 2
fi

if [[ ! -d "$OUT" ]]; then
  echo "cross-route: no export at $OUT" >&2
  exit 1
fi

if [[ "$MODE" == --write-baseline ]]; then
  mkdir -p "$BASELINE"
  for route in projects project 404; do
    source=$(route_file "$route") || {
      echo "cross-route: missing $route export" >&2
      exit 1
    }
    normalize_html "$source" "$BASELINE/$route.html"
    echo "wrote evidence/T002-cross-route-baseline/$route.html"
  done
  list_routes "$OUT" > "$F/evidence/T002-routes.txt"
  echo 'wrote evidence/T002-routes.txt'
  exit 0
fi

if [[ ! -f "$LEDGER" ]]; then
  echo "cross-route: missing $LEDGER" >&2
  exit 1
fi

total_hunks=0
for route in projects project 404; do
  baseline=$BASELINE/$route.html
  if [[ ! -f "$baseline" ]]; then
    echo "cross-route: missing baseline for $route" >&2
    exit 1
  fi
  source=$(route_file "$route") || {
    echo "cross-route: missing $route export" >&2
    exit 1
  }
  current=$TMP_ROOT/$route.html
  normalize_html "$source" "$current"

  diff_file=$TMP_ROOT/$route.diff
  diff -u --label "$route baseline" --label "$route current" "$baseline" "$current" > "$diff_file" || true
  hunks=$(grep -c '^@@' "$diff_file" || true)
  total_hunks=$((total_hunks + hunks))
  if [[ "$hunks" -eq 0 ]]; then
    echo "$route: 0 hunks"
  elif ledger_check "$diff_file" "$route"; then
    echo "$route: $hunks hunks (all ledgered)"
  else
    echo "$route: $hunks unledgered hunks" >&2
    exit 1
  fi

  if [[ "$route" == projects || "$route" == project ]]; then
    extract_main "$baseline" "$TMP_ROOT/$route.baseline.main"
    extract_main "$current" "$TMP_ROOT/$route.current.main"
    if ! cmp -s "$TMP_ROOT/$route.baseline.main" "$TMP_ROOT/$route.current.main"; then
      echo "cross-route: $route <main> is not byte-identical" >&2
      exit 1
    fi
    echo "$route: <main> byte-identical"
  fi
done

echo "cross-route: $total_hunks hunks"
