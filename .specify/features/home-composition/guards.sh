#!/usr/bin/env bash
# S11.9 guards (plan.md "Guards"). Prints one line per guard; exits 1 if any guard fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

B=b52fc06
F=.specify/features/home-composition
G1_SHA=f64f02224fe07693e038bd0b9980d9274570819ded80a6d937483781d6d03811
OUT=apps/web/out
TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT
SELF_TEST_INTERIM_CREATED=0

changed_paths() {
  {
    git diff --name-only "$B" --
    git ls-files --others --exclude-standard
  } | LC_ALL=C sort -u
}

app_touch_path_ok() {
  local path=$1 pattern
  while IFS= read -r pattern; do
    [[ "$pattern" =~ ^[[:space:]]*(#|$) ]] && continue
    case "$path" in
      $pattern) return 0 ;;
    esac
  done < "$F/app-touch.txt"
  return 1
}

path_allowed() {
  local path=$1
  case "$path" in
    tools/perf/* | package.json | .github/workflows/home-composition.yml | \
      .specify/features/home-composition/* | .specify/content/site.json) return 0 ;;
  esac
  case "$path" in
    apps/web/*) app_touch_path_ok "$path" ;;
    *) return 1 ;;
  esac
}

app_touch_ok() {
  local path
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if ! path_allowed "$path"; then
      printf '%s\n' "$path"
      return 1
    fi
  done < <(changed_paths)
}

site_json_ok() {
  git show "$B:.specify/content/site.json" > "$TMP_ROOT/site-base.json" || {
    echo "cannot read site.json at $B"
    return 1
  }

  node - "$TMP_ROOT/site-base.json" <<'NODE'
const fs = require('node:fs');

const base = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const current = JSON.parse(fs.readFileSync('.specify/content/site.json', 'utf8'));
const expectedDescription =
  'Android engineer. Portfolio rendered as exploded architecture: real layers, real components, real numbers.';
// R1a (Murphy, 2026-11-08): only the first word of the old 19-character span is the employer; it is redacted as 8 blocks.
const block = '█'.repeat(8);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const oldParagraph = base?.about?.paragraphs?.[0];
const newParagraph = current?.about?.paragraphs?.[0];
if (typeof oldParagraph !== 'string' || typeof newParagraph !== 'string') {
  console.error('about.paragraphs[0] is missing');
  process.exit(1);
}

const start = newParagraph.indexOf(block);
const blockCount = [...newParagraph].filter((character) => character === '█').length;
if (start < 0 || blockCount !== 8 || newParagraph.indexOf(block, start + block.length) >= 0) {
  console.error('about.paragraphs[0] must contain exactly one 8-character redaction bar');
  process.exit(1);
}

const prefix = newParagraph.slice(0, start);
const suffix = newParagraph.slice(start + block.length);
if (!oldParagraph.startsWith(prefix) || !oldParagraph.endsWith(suffix)) {
  console.error('about.paragraphs[0] changed outside the redacted employer span');
  process.exit(1);
}

const oldEmployer = oldParagraph.slice(prefix.length, oldParagraph.length - suffix.length);
if (
  oldEmployer.length !== 19 ||
  oldEmployer.split(' ')[0].length !== block.length ||
  oldParagraph !== `${prefix}${oldEmployer}${suffix}`
) {
  console.error('about.paragraphs[0] redaction does not replace one 19-character phrase');
  process.exit(1);
}

if (current?.meta?.description !== expectedDescription) {
  console.error('meta.description is not the approved R2 value');
  process.exit(1);
}

if (canonical(current?.contact) !== canonical({ title: 'Contact' })) {
  console.error('contact is not the approved R3 value');
  process.exit(1);
}

// R7 (Murphy, 2026-11-08): hero loop pause/play labels.
if (current?.hero?.loopPause !== 'Pause animation' || current?.hero?.loopPlay !== 'Play animation') {
  console.error('hero.loopPause / hero.loopPlay are not the approved R7 values');
  process.exit(1);
}

const comparedBase = structuredClone(base);
comparedBase.hero.loopPause = current.hero.loopPause;
comparedBase.hero.loopPlay = current.hero.loopPlay;
comparedBase.about.paragraphs[0] = newParagraph;
comparedBase.meta.description = current.meta.description;
comparedBase.contact = current.contact;

if (canonical(comparedBase) !== canonical(current)) {
  console.error('site.json differs outside about.paragraphs[0], meta.description, contact and hero.loopPause/loopPlay');
  process.exit(1);
}
NODE
}

frozen_surfaces_ok() {
  local changed approved
  # R10 (Murphy, 2026-11-13): packages/xploder paths listed in approved-xploder-src.txt may change, each
  # re-sealed with an S11.9 note; the generated manifests / generators of the re-seal are allowed with them.
  approved="$F/approved-xploder-src.txt"
  changed=$(changed_paths |
    grep -E '^(\.specify/slices/|\.specify/KICKOFF[^/]*\.md$|\.specify/content/websocket-inspector\.json$|packages/xploder/)' |
    grep -vxF -f <( { [[ -f "$approved" ]] && grep -v '^#' "$approved" | sed '/^$/d'; } || true ) |
    grep -vE '^packages/xploder/test/frozen-surface(\.s[0-9]+)?\.(manifest\.json|generate(-s[0-9]+)?\.sh)$|^packages/xploder/test/frozen-surface\.generate(-s[0-9]+)?\.sh$' |
    head -1 || true)
  if [[ -n "$changed" ]]; then
    printf '%s\n' "$changed"
    return 1
  fi
}

workflows_ok() {
  local changed
  changed=$(changed_paths |
    grep '^\.github/workflows/' |
    grep -vx '\.github/workflows/home-composition\.yml' |
    head -1 || true)
  if [[ -n "$changed" ]]; then
    printf '%s\n' "$changed"
    return 1
  fi
}

route_list_ok() {
  local forbidden
  if [[ ! -d "$OUT" ]]; then
    echo 'no export'
    return 77
  fi
  if [[ ! -f "$F/evidence/T002-routes.txt" ]]; then
    echo 'evidence/T002-routes.txt is missing'
    return 1
  fi

  bash "$F/cross-route.sh" --list-routes "$OUT" > "$TMP_ROOT/routes.txt" || {
    echo 'cannot enumerate exported routes'
    return 1
  }
  if ! diff -u --label 'T002-routes baseline' --label 'current export' \
    "$F/evidence/T002-routes.txt" "$TMP_ROOT/routes.txt" > "$TMP_ROOT/routes.diff"; then
    echo 'exported route list differs from evidence/T002-routes.txt'
    sed -n '3,20p' "$TMP_ROOT/routes.diff"
    return 1
  fi

  forbidden=$(find "$OUT" -type f \
    \( -path "$OUT/dev/*" -o -path "$OUT/fixtures/*" -o -path "$OUT/dev.html" -o -path "$OUT/fixtures.html" \) \
    -print -quit)
  if [[ -n "$forbidden" ]]; then
    printf '%s\n' "$forbidden"
    return 1
  fi
}

g1_sha_ok() {
  local actual
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$F/g1-approved.txt" | awk '{print $1}')
  else
    actual=$(shasum -a 256 "$F/g1-approved.txt" | awk '{print $1}')
  fi
  if [[ "$actual" != "$G1_SHA" ]]; then
    echo "expected $G1_SHA, got $actual"
    return 1
  fi
}

home_use_client_ok() {
  local dir=apps/web/components/home found
  if [[ ! -d "$dir" ]]; then
    echo 'components/home does not exist'
    return 77
  fi
  found=$(grep -RInE "['\"]use client['\"]" "$dir" 2>/dev/null || true)
  if [[ -n "$found" ]]; then
    printf '%s\n' "$found" | head -5
    return 1
  fi
}

dependencies_ok() {
  git diff --quiet "$B" -- pnpm-lock.yaml || {
    echo 'pnpm-lock.yaml changed'
    return 1
  }

  node - "$B" <<'NODE'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const base = process.argv[2];
const blocks = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'bundledDependencies',
  'bundleDependencies',
  'overrides',
  'resolutions',
];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function dependencyBlocks(manifest) {
  return Object.fromEntries(blocks.map((name) => [name, manifest[name]]));
}

const manifests = execFileSync('git', ['ls-files', '*package.json'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

for (const path of manifests) {
  let before;
  let after;
  try {
    before = JSON.parse(execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' }));
  } catch {
    console.error(`${path} is not present at ${base}`);
    process.exit(1);
  }
  try {
    after = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    console.error(`${path} is missing or invalid`);
    process.exit(1);
  }
  if (canonical(dependencyBlocks(before)) !== canonical(dependencyBlocks(after))) {
    console.error(`${path} dependency blocks changed`);
    process.exit(1);
  }
}
NODE
}

interim_list_ok() {
  if [[ ! -f apps/web/components/home/contact-section.tsx ]]; then
    echo 'no contact section'
    return 77
  fi
  if [[ ! -f apps/web/content/home-sections.ts ]]; then
    echo 'apps/web/content/home-sections.ts is missing'
    return 1
  fi

  node - "$F/g1-approved.txt" <<'NODE'
const fs = require('node:fs');

const expected = fs
  .readFileSync(process.argv[2], 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
const source = fs.readFileSync('apps/web/content/home-sections.ts', 'utf8');
const assignment = /HOME_SECTIONS\s*=\s*\[([\s\S]*?)\]/.exec(source);
if (!assignment) {
  console.error('HOME_SECTIONS assignment is missing');
  process.exit(1);
}
const actual = [...assignment[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
if (actual.join(',') !== expected.join(',')) {
  console.error(`HOME_SECTIONS must contain ${expected.join(', ')} in order`);
  process.exit(1);
}
NODE
}

fails=0
guard() {
  local name=$1 output status detail
  shift
  if output=$("$@" 2>&1); then
    echo "OK $name"
  else
    status=$?
    if [[ "$status" -eq 77 ]]; then
      echo "SKIP $name: ${output:-not applicable}"
    else
      detail=$(printf '%s\n' "$output" | awk 'NF { print; exit }')
      echo "FAIL $name: ${detail:-check failed}"
      fails=1
    fi
  fi
}

self_test_cleanup() {
  rm -f apps/web/t002-self-test.txt .specify/slices/.t002-self-test
  rm -rf "$OUT/t002-self-test"
  rm -f apps/web/components/home/t002-self-test.tsx
  if [[ "$SELF_TEST_INTERIM_CREATED" == 1 ]]; then
    rm -f apps/web/components/home/contact-section.tsx apps/web/content/home-sections.ts
  fi
  rmdir apps/web/components/home 2>/dev/null || true
  git checkout -- .specify/content/site.json "$F/g1-approved.txt" package.json 2>/dev/null || true
  rm -rf "$TMP_ROOT"
}

self_test_case() {
  local name=$1 mutate=$2 restore=$3 before after output
  before=$(git status --porcelain=v1)
  eval "$mutate"
  output=$(bash "$0" 2>&1 || true)
  eval "$restore"
  after=$(git status --porcelain=v1)

  if grep -q "^FAIL $name:" <<< "$output"; then
    echo "BITES $name"
  else
    echo "SELF-TEST FAIL $name: guard did not fail"
    fails=1
  fi
  if [[ "$before" != "$after" ]]; then
    echo "SELF-TEST FAIL $name: tree was not restored"
    fails=1
  fi
}

self_test() {
  local route_name
  trap self_test_cleanup EXIT INT TERM

  self_test_case app-touch \
    'printf "self test\\n" > apps/web/t002-self-test.txt' \
    'rm -f apps/web/t002-self-test.txt'

  self_test_case site-json \
    'node -e "const fs=require(\"node:fs\");const path=\".specify/content/site.json\";const site=JSON.parse(fs.readFileSync(path,\"utf8\"));site.meta.siteName=\"Self test\";fs.writeFileSync(path,JSON.stringify(site,null,2)+\"\\n\")"' \
    'git checkout -- .specify/content/site.json'

  self_test_case frozen-surfaces \
    'printf "self test\\n" > .specify/slices/.t002-self-test' \
    'rm -f .specify/slices/.t002-self-test'

  if [[ -d "$OUT" ]]; then
    self_test_case routes \
      'mkdir -p "$OUT/t002-self-test" && printf "self test\\n" > "$OUT/t002-self-test/index.html"' \
      'rm -rf "$OUT/t002-self-test"'
  else
    echo 'SKIP self-test routes: no export'
  fi

  self_test_case g1-sha \
    'printf "\\n# self test\\n" >> "$F/g1-approved.txt"' \
    'git checkout -- "$F/g1-approved.txt"'

  self_test_case home-use-client \
    'mkdir -p apps/web/components/home && printf "\x27use client\x27;\\nexport {};\\n" > apps/web/components/home/t002-self-test.tsx' \
    'rm -f apps/web/components/home/t002-self-test.tsx; rmdir apps/web/components/home 2>/dev/null || true'

  self_test_case dependencies \
    'node -e "const fs=require(\"node:fs\");const path=\"package.json\";const pkg=JSON.parse(fs.readFileSync(path,\"utf8\"));pkg.devDependencies[\"t002-self-test\"]=\"0.0.0\";fs.writeFileSync(path,JSON.stringify(pkg,null,2)+\"\\n\")"' \
    'git checkout -- package.json'

  if [[ ! -e apps/web/components/home/contact-section.tsx && ! -e apps/web/content/home-sections.ts ]]; then
    SELF_TEST_INTERIM_CREATED=1
    self_test_case interim-list \
      'mkdir -p apps/web/components/home && printf "export {};\\n" > apps/web/components/home/contact-section.tsx && printf "export const HOME_SECTIONS = [\x27nav\x27, \x27hero\x27, \x27projects\x27, \x27about\x27, \x27footer\x27] as const;\\n" > apps/web/content/home-sections.ts' \
      'rm -f apps/web/components/home/contact-section.tsx apps/web/content/home-sections.ts; rmdir apps/web/components/home 2>/dev/null || true'
  else
    echo 'SKIP self-test interim-list: files already exist'
  fi

  self_test_cleanup
  return "$fails"
}

if [[ "${1:-}" == "--self-test" ]]; then
  self_test
  exit $?
fi

guard app-touch app_touch_ok
guard site-json site_json_ok
guard frozen-surfaces frozen_surfaces_ok
guard workflows workflows_ok
guard routes route_list_ok
guard g1-sha g1_sha_ok
guard home-use-client home_use_client_ok
guard dependencies dependencies_ok
guard interim-list interim_list_ok
exit "$fails"
