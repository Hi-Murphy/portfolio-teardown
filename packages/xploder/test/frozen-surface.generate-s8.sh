#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
package_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
repo_root=$(CDPATH= cd -- "$package_dir/../.." && pwd)
paths_file="$script_dir/frozen-surface.s8.paths"
manifest_file="$script_dir/frozen-surface.s8.manifest.json"
base=5d3abdb
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
  printf '  "note": "S08 seal (S10 RFC D13). S10 changes no xploder source; a later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.6 at 405bca1: src/react/TeardownViewer.tsx — async renderer factory: WebGLRenderer construction in its own idle slice (S11.6 L1); see .specify/features/staged-canvas-mount/evidence/T005-log-l1-ab.md. Fixed at 1a99569: default-lane re-render when the staged renderer settles (S11.6 L1, D-P3). L4 at 0ac2148: R3F configuration in the next task (S11.6 L4). Compacted at 470acd8 (S11.6 T008b, bytes). Re-sealed in S14 at edde9d0: src/react/TeardownViewer.tsx — the open detail panel is the selected emphasis; open/close highlight sync keeps hover and keyboard focus; data-xploder-selected (I-09); see .specify/features/engine-polish/evidence/T003-log-reseal.txt. Re-sealed in S15 at 74394e9: src/react/TeardownViewer.tsx + src/react/panel/PanelLayer.tsx — the Scene runs on the viewer'"'"'s engine clock; panel event cutoff via hostNow() (E1); see .specify/features/engine-timing/evidence/T006-log-ac1-scan.txt. Re-sealed in S15 at 5d3abdb: src/react/TeardownViewer.tsx — tour commands and the case-study auto-pause use pauseTour() (tourCommandActionsOf adapter; S7 executeTourCommand unchanged) (E2); see .specify/features/engine-timing/evidence/T007-log-callers.txt.",\n'
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
