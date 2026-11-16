#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
package_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
repo_root=$(CDPATH= cd -- "$package_dir/../.." && pwd)
paths_file="$script_dir/frozen-surface.s6.paths"
manifest_file="$script_dir/frozen-surface.s6.manifest.json"
base=4a05d60
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
  printf '  "note": "%s",\n' 'S06 seal (S07 RFC D1). Re-sealed in S10 at f65b13c: src/overlay/model.ts gained the tour-trail overlay (S10 Q16, Murphy-authorised revision; see .specify/features/site-shell/evidence/Q16-revision-note.md). A later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.8 at 057d89a: src/overlay/place.ts — output-identical lazy first-fit placement search with prepared obstacle bounds (E1a); see .specify/features/hero-eager/evidence/T006-log-e1a-ab.md. Re-sealed in S14 at b5a4713: src/overlay/model.ts — dimension notes avoid the plate layer-name quads; every other placement output-identical (I-05) + test/overlay-note-clear.test.ts; see .specify/features/engine-polish/evidence/T008-log-rects.md. Re-sealed in S15 at d4efeaf: src/react/scene/Scene.tsx — every tween samples the injected engine clock (E1: explode, camera, emphasis) + test/scene-clock.test.tsx; see .specify/features/engine-timing/evidence/T003-log-green.txt. Re-sealed in S15 at 2c9187d: src/react/scene/OverlayProjector.tsx + src/react/scene/Scene.tsx — overlay events stamped in engine time; none while the clock is paused (E1) + test/overlay-clock.test.tsx; see .specify/features/engine-timing/evidence/T005-log-green.txt. Re-sealed in S15 at ea61882: src/react/scene/Scene.tsx — ClockGate: no frames while the engine clock is paused, one repaint of the frozen pose on resize/theme (E2) + test/scene-pause.test.tsx; see .specify/features/engine-timing/evidence/T008-log-green.txt. Re-sealed in S15 at 8506837: src/react/scene/OverlayProjector.tsx + src/react/scene/Scene.tsx — settled from the tweens'"'"' rest state at engine-clock time; frame signature removed; settle phase on the event (E4) + test/overlay-settle-state.test.tsx; see .specify/features/engine-timing/evidence/T011-log-settle-once.md. Re-sealed in S16 at 76ca441: src/labels/ — one label model and one pass composing the S6/S7 placers, output-identical (E3) + test/label-pass-parity.test.ts; see .specify/features/label-system/evidence/T002-log-green.txt. Re-sealed in S16 at 5d62338: src/react/overlay/BlueprintOverlay.tsx — renders the label pass'"'"'s overlay model instead of placing its own (E3); see .specify/features/label-system/evidence/T004-log-green.txt. Re-sealed in S16 at 916c82b: src/labels/pass.ts + src/overlay/model.ts — conflict-gated priority pass: a label family keeps its S15 placement unless it overlaps a higher-priority label (E3) + test/label-sweep.test.ts; see .specify/features/label-system/evidence/T008-log-sweep-matrix.md. Re-sealed in S16 at 4a05d60: src/overlay/model.ts + src/react/overlay/BlueprintOverlay.tsx — hover and selected as two emphasis slots, existing emphasis style (E6) + test/overlay-emphasis-slots.test.ts; see .specify/features/label-system/evidence/T009-log-green.txt.'
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
