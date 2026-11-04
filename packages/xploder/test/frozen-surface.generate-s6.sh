#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
package_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
repo_root=$(CDPATH= cd -- "$package_dir/../.." && pwd)
paths_file="$script_dir/frozen-surface.s6.paths"
manifest_file="$script_dir/frozen-surface.s6.manifest.json"
base=057d89a
package_prefix=packages/xploder/

cd "$repo_root"

tree_paths=()
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  tree_paths+=("$package_prefix$path")
done < "$paths_file"

tmp_file=$(mktemp "$manifest_file.tmp.XXXXXX")
trap 'rm -f "$tmp_file"' EXIT

{
  printf '{\n'
  printf '  "base": "%s",\n' "$base"
  printf '  "note": "%s",\n' 'S06 seal (S07 RFC D1). Re-sealed in S10 at f65b13c: src/overlay/model.ts gained the tour-trail overlay (S10 Q16, Murphy-authorised revision; see .specify/features/site-shell/evidence/Q16-revision-note.md). A later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.8 at 057d89a: src/overlay/place.ts — output-identical lazy first-fit placement search with prepared obstacle bounds (E1a); see .specify/features/hero-eager/evidence/T006-log-e1a-ab.md.'
  printf '  "files": {\n'

  first=true
  while IFS= read -r tree_path; do
    [[ -z "$tree_path" ]] && continue

    file=${tree_path#"$package_prefix"}
    hash=$(git show "$base:$tree_path" | shasum -a 256 | awk '{print $1}')

    if [[ "$first" == true ]]; then
      first=false
    else
      printf ',\n'
    fi
    printf '    "%s": "%s"' "$file" "$hash"
  done < <(git ls-tree -r --name-only "$base" -- "${tree_paths[@]}")

  printf '\n  }\n}\n'
} > "$tmp_file"

if [[ ! -f "$manifest_file" ]] || ! cmp -s "$tmp_file" "$manifest_file"; then
  mv "$tmp_file" "$manifest_file"
  trap - EXIT
fi

count=$(grep -Ec '^    "[^"]+": "[0-9a-f]{64}",?$' "$manifest_file")
printf 'wrote %s (%s files)\n' "${manifest_file#"$repo_root/"}" "$count"
