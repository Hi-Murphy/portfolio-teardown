#!/usr/bin/env bash
# Create, push and verify an S16 annotated seal tag from the named frozen-surface manifest(s).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

usage() {
  echo "usage: seal-tag.sh <s6|s7|s8[-...]> <fix-sha> [--dry-run]" >&2
  exit 2
}

[[ $# -ge 2 && $# -le 3 ]] || usage
surfaces=$1
fix=$2
dry_run=false
if [[ ${3:-} == "--dry-run" ]]; then dry_run=true; elif [[ $# -eq 3 ]]; then usage; fi

IFS='-' read -r -a parts <<<"$surfaces"
[[ ${#parts[@]} -gt 0 ]] || usage
for surface in "${parts[@]}"; do
  case "$surface" in
    s6 | s7 | s8) ;;
    *) echo "unknown surface: $surface" >&2; exit 2 ;;
  esac
done

sha=$(git rev-parse --verify "${fix}^{commit}")
sha7=${sha:0:7}
tag="seal/${surfaces}-${sha7}"

last_s16_note() {
  local manifest=$1 note
  note=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).note ?? "")' "$manifest")
  node -e '
    const note = process.argv[1];
    const marker = "Re-sealed in S16";
    const index = note.lastIndexOf(marker);
    if (index >= 0) {
      process.stdout.write(note.slice(index).trim());
    } else {
      process.stdout.write(note.trim());
    }
  ' "$note"
}

message="S16 re-seal: ${surfaces}"
for surface in "${parts[@]}"; do
  manifest="packages/xploder/test/frozen-surface.${surface}.manifest.json"
  [[ -f "$manifest" ]] || { echo "missing manifest: $manifest" >&2; exit 1; }
  message+=$'\n'"${surface}: $(last_s16_note "$manifest")"
done

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  existing=$(git rev-list -n 1 "$tag")
  if [[ "$existing" != "$sha" ]]; then
    echo "tag $tag already exists at $existing, not $sha" >&2
    exit 1
  fi
fi

if $dry_run; then
  echo "tag: $tag"
  echo "target: $sha"
  printf 'message:\n%s\n' "$message"
  exit 0
fi

if ! git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  git tag -a "$tag" "$sha" -m "$message"
fi
git push origin "refs/tags/$tag"
git ls-remote --tags origin "refs/tags/$tag" | grep -q "refs/tags/$tag" || {
  echo "tag verification failed: $tag" >&2
  exit 1
}
echo "verified $tag at $sha"
