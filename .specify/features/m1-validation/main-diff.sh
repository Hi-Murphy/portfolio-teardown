#!/usr/bin/env bash
# S12/G11: compare normalised <main> content with the ffda3a2 export.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE_COMMIT=ffda3a2
CACHE=/tmp/s12-checks/base-out-ffda3a2
OUT_DIR=/tmp/s12-checks/main-diff
HEAD_OUT=apps/web/out
NO_BUILD=0
BASE_OUT_ARG=
WORKTREE=
TMP_ROOT=$(mktemp -d /tmp/s12-checks/main-diff.XXXXXX)

cleanup() {
  if [[ -n "$WORKTREE" ]]; then
    git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_ROOT"
}

on_exit() {
  local status=$?
  cleanup
  if ((status != 0 && status != 6)); then
    exit 1
  fi
  exit "$status"
}
trap on_exit EXIT

die() {
  echo "main-diff: $*" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --no-build)
      NO_BUILD=1
      shift
      ;;
    --base-out)
      (($# >= 2)) || die "--base-out needs a directory"
      BASE_OUT_ARG=$2
      shift 2
      ;;
    --base-out=*)
      BASE_OUT_ARG=${1#--base-out=}
      shift
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

mkdir -p /tmp/s12-checks

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

source_for_page() {
  local root=$1
  local page=$2
  local path

  case "$page" in
    projects)
      for path in "$root/projects/index.html" "$root/projects.html"; do
        [[ -f "$path" ]] && { printf '%s\n' "$path"; return 0; }
      done
      ;;
    websocket-inspector)
      for path in "$root/projects/websocket-inspector/index.html" "$root/projects/websocket-inspector.html"; do
        [[ -f "$path" ]] && { printf '%s\n' "$path"; return 0; }
      done
      ;;
  esac
  return 1
}

valid_export() {
  local root=$1
  [[ -f "$root/index.html" ]] || return 1
  source_for_page "$root" projects >/dev/null || return 1
  source_for_page "$root" websocket-inspector >/dev/null || return 1
}

if ((NO_BUILD == 0)); then
  echo "main-diff: building head export"
  pnpm build
fi
[[ -d "$HEAD_OUT" ]] || die "no head export at $HEAD_OUT"
valid_export "$HEAD_OUT" || die "head export is missing a required page"

if [[ -n "$BASE_OUT_ARG" ]]; then
  [[ -d "$BASE_OUT_ARG" ]] || die "no base export at $BASE_OUT_ARG"
  BASE_DIR=$(cd "$BASE_OUT_ARG" && pwd)
  valid_export "$BASE_DIR" || die "base export is missing a required page"
  echo "main-diff: using supplied base export"
elif valid_export "$CACHE"; then
  BASE_DIR=$CACHE
  echo "main-diff: reusing cached base export"
else
  echo "main-diff: building base export at $BASE_COMMIT"
  WORKTREE=$TMP_ROOT/worktree
  git worktree add --detach "$WORKTREE" "$BASE_COMMIT"
  (
    cd "$WORKTREE"
    pnpm install --frozen-lockfile --prefer-offline
    pnpm build
  )
  valid_export "$WORKTREE/apps/web/out" || die "base build is missing a required page"
  rm -rf "${CACHE}.tmp"
  cp -R "$WORKTREE/apps/web/out" "${CACHE}.tmp"
  rm -rf "$CACHE"
  mv "${CACHE}.tmp" "$CACHE"
  BASE_DIR=$CACHE
  git worktree remove --force "$WORKTREE"
  WORKTREE=
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

overall=0
for page in projects websocket-inspector; do
  base_source=$(source_for_page "$BASE_DIR" "$page") || die "missing base $page page"
  head_source=$(source_for_page "$HEAD_OUT" "$page") || die "missing head $page page"

  base_normalized=$TMP_ROOT/base-$page.normalized.html
  head_normalized=$TMP_ROOT/head-$page.normalized.html
  base_main=$OUT_DIR/base-$page.html
  head_main=$OUT_DIR/head-$page.html

  normalize_html "$base_source" "$base_normalized"
  normalize_html "$head_source" "$head_normalized"
  extract_main "$base_normalized" "$base_main"
  extract_main "$head_normalized" "$head_main"

  if cmp -s "$base_main" "$head_main"; then
    echo "main-diff $page: 0 bytes"
  else
    diff_file=$OUT_DIR/$page.diff
    diff -u --label "base $page" --label "head $page" "$base_main" "$head_main" > "$diff_file" || true
    bytes=$(wc -c < "$diff_file" | tr -d '[:space:]')
    echo "main-diff $page: $bytes bytes"
    sed -n '1,40p' "$diff_file"
    overall=1
  fi
done

if ((overall)); then
  exit 6
fi
