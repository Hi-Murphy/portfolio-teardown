#!/usr/bin/env bash
# S16 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=021c1ff
F=.specify/features/label-system
X=packages/xploder

fails=0
guard() {
  local name=$1
  local output
  shift
  if output=$("$@" 2>&1); then
    echo "$name"
  else
    echo "FAIL ${name%-OK}"
    [[ -z "$output" ]] || printf '%s\n' "$output"
    fails=1
  fi
}

changed_paths() {
  {
    git diff --name-only "$B"
    git ls-files --others --exclude-standard
  } | sort -u
}

paths_unchanged() {
  git diff --quiet "$B" -- "$@" && [[ -z "$(git ls-files --others --exclude-standard -- "$@")" ]]
}

frozen_ok() {
  paths_unchanged .specify/slices .specify/KICKOFF-S16.md .specify/content
}

surfaces_s2s4s5_ok() {
  local paths
  paths_unchanged "$X/test/frozen-surface.manifest.json" \
    "$X/test/frozen-surface.paths" "$X/test/frozen-surface.generate.sh" \
    "$X/test/frozen-surface.s5.manifest.json" "$X/test/frozen-surface.s5.paths" \
    "$X/test/frozen-surface.generate-s5.sh" || return 1
  paths=$(sed "s#^#$X/#" "$X/test/frozen-surface.paths" "$X/test/frozen-surface.s5.paths")
  paths_unchanged $paths
}

s3_tools_ok() {
  paths_unchanged tools/perf/src/{args,browser,budgets,evidence,exit-codes,fps,lighthouse,log,preview,reach,serve,summary-md,weight}.ts \
    tools/perf/src/cli/{assert-absent,evidence,fps-calibrate,fps,lighthouse-gate,resolve-preview,serve,weight-gate}.ts
}

reseal_list_ok() {
  local changed sealed listed_tests path sealed_path unexpected=
  changed=$(changed_paths)
  sealed=$(
    for p in s6 s7 s8; do sed "s#^#$X/#" "$X/test/frozen-surface.$p.paths"; done | sort -u
  )
  listed_tests=$(
    for p in s6 s7 s8; do awk '/^test\//{print "packages/xploder/" $0}' "$X/test/frozen-surface.$p.paths"; done |
      sort -u
  )

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    [[ "$path" == "$X/test/frozen-surface."* ]] && continue
    grep -qxF "$path" <<<"$listed_tests" && continue
    [[ "$path" == "$X/src/labels/"* || "$path" == "$X/src/react/labels/"* ]] || while IFS= read -r sealed_path; do
      [[ -n "$sealed_path" ]] || continue
      sealed_path=${sealed_path%/}
      [[ "$path" == "$sealed_path" || "$path" == "$sealed_path/"* ]] && break
      sealed_path=
    done <<<"$sealed"
    [[ "$path" == "$X/src/labels/"* || "$path" == "$X/src/react/labels/"* || -n "$sealed_path" ]] || continue
    grep -qxF "$path" <(grep -v '^#' "$F/approved-xploder-src.txt") || unexpected+="$path"$'\n'
  done <<<"$changed"

  [[ -z "$unexpected" ]]
}

allowed_paths_ok() {
  local changed unexpected
  changed=$(changed_paths)
  [[ -n "$changed" ]] || return 0
  unexpected=$(grep -vE "^($X/src/labels/(pass|types|sweep)\.ts|$X/src/react/labels/faces\.ts|$X/src/react/TeardownViewer\.tsx|$X/src/react/lettering/PartLettering\.tsx|$X/src/react/overlay/BlueprintOverlay\.tsx|$X/src/overlay/model\.ts|$X/src/lettering/(place|layers|model)\.ts|$X/test/(label-pass-parity\.test\.ts|oracles/labels-s15\.ts|label-sweep\.test\.ts|lettering-obstacles\.test\.ts|overlay-emphasis-slots\.test\.ts)|$X/test/frozen-surface\..*|apps/web/test/xploder-dom/(label-pass|label-emphasis|viewer-moving)\.dom\.test\.tsx|$F/.*)$" <<<"$changed" || true)
  [[ -z "$unexpected" ]]
}

no_new_deps_ok() {
  paths_unchanged package.json apps/web/package.json packages/xploder/package.json \
    tools/perf/package.json pnpm-lock.yaml
}

no_typo_ok() {
  git diff -U0 "$B" -- "$X/src/react/overlay/BlueprintOverlay.tsx" \
    "$X/src/react/lettering/PartLettering.tsx" "$X/src/lettering/look.ts" \
    "$X/src/look/tokens.ts" |
    node -e '
      const fs = require("node:fs");
      const allow = new Set(fs.readFileSync(process.argv[1], "utf8").split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#")));
      const pattern = /font|fontWeight|fontSize|color|Color|Role\b|palette\[|palette\./;
      const added = [];
      const removed = new Map();
      for (const raw of fs.readFileSync(0, "utf8").split("\n")) {
        if (raw.startsWith("+") && !raw.startsWith("+++")) added.push(raw.slice(1).trim());
        if (raw.startsWith("-") && !raw.startsWith("---")) {
          const line = raw.slice(1).trim();
          removed.set(line, (removed.get(line) ?? 0) + 1);
        }
      }
      const offenders = [];
      for (const line of added) {
        if (!pattern.test(line) || allow.has(line)) continue;
        const count = removed.get(line) ?? 0;
        if (count > 0) removed.set(line, count - 1);
        else offenders.push(line);
      }
      for (const line of offenders) console.log(line);
      process.exit(offenders.length === 0 ? 0 : 1);
    ' "$F/typo-allow.txt"
}

seal_tag_ok() {
  local manifest base
  for manifest in "$X/test/frozen-surface.manifest.json" \
    "$X/test/frozen-surface.s5.manifest.json" "$X/test/frozen-surface.s6.manifest.json" \
    "$X/test/frozen-surface.s7.manifest.json" "$X/test/frozen-surface.s8.manifest.json"; do
    base=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).base)' "$manifest")
    git ls-remote --tags origin "refs/tags/seal/*-$base" | grep -q . || return 1
  done
}

gitleaks_ok() {
  if [[ -n "$(git rev-list --max-count=1 "$B"..HEAD)" ]]; then
    gitleaks git --no-banner --log-opts="$B..HEAD" . >/dev/null 2>&1 || return 1
  fi
  gitleaks dir --no-banner "$F" >/dev/null 2>&1
}

guard FROZEN-OK frozen_ok
guard SURFACES-S2S4S5-OK surfaces_s2s4s5_ok
guard S3-TOOLS-OK s3_tools_ok
guard RESEAL-LIST-OK reseal_list_ok
guard ALLOWED-PATHS-OK allowed_paths_ok
guard NO-NEW-DEPS-OK no_new_deps_ok
guard NO-TYPO-OK no_typo_ok
guard SEAL-TAG-OK seal_tag_ok
guard GITLEAKS-OK gitleaks_ok
exit "$fails"
