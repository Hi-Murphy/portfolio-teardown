#!/usr/bin/env bash
# Build the current worktree with the fixed S17 build id and copy the static export.
set -euo pipefail

retry_on_notice=0
if [[ ${1:-} == --retry-on-notice ]]; then
  retry_on_notice=1
  shift
fi

if [[ $# -ne 1 ]]; then
  echo "usage: $0 [--retry-on-notice] <dest>" >&2
  exit 2
fi

dest=$1
root=$(git rev-parse --show-toplevel)
log=$dest.log
mkdir -p "$(dirname "$dest")"
: >"$log"

run_build() {
  (
    cd "$root"
    VERCEL_GIT_COMMIT_SHA=s17-fixed-build-id pnpm build
  ) >>"$log" 2>&1
}

code=0
run_build || code=$?

if ((code != 0 && retry_on_notice)) && grep -q SecurityFatalError "$log"; then
  printf '\n--- retrying once after SecurityFatalError ---\n' >>"$log"
  code=0
  run_build || code=$?
fi

if ((code == 0 && retry_on_notice == 0)) && grep -q SecurityFatalError "$log"; then
  code=1
fi

if ((code == 0)); then
  rm -rf "$dest"
  cp -R "$root/apps/web/out" "$dest"
  echo "build exit $code"
else
  if ((retry_on_notice == 0)) && grep -q SecurityFatalError "$log"; then
    echo SECURITY-NOTICE
  fi
  echo "build exit $code"
fi

exit "$code"
