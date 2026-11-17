#!/usr/bin/env bash
# Build the current worktree with the fixed S18 build id and copy the static export.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <dest>" >&2
  exit 2
fi

dest=$1
root=$(git rev-parse --show-toplevel)
log=$dest.log
mkdir -p "$(dirname "$dest")"
: >"$log"

code=0
(
  cd "$root"
  VERCEL_GIT_COMMIT_SHA=s18-fixed-build-id pnpm build
) >>"$log" 2>&1 || code=$?

if ((code == 0)) && grep -q SecurityFatalError "$log"; then
  code=1
fi

if ((code == 0)); then
  rm -rf "$dest"
  cp -R "$root/apps/web/out" "$dest"
  echo "build exit $code"
else
  if grep -q SecurityFatalError "$log"; then
    echo SECURITY-NOTICE
  fi
  echo "build exit $code"
fi

exit "$code"
