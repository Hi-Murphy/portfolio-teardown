#!/usr/bin/env bash
# Compare the export files fetched by / on the base and head static exports.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <baseOut> <headOut>" >&2
  exit 2
fi

base_out=$(cd "$1" && pwd)
head_out=$(cd "$2" && pwd)
mkdir -p /tmp/s17-checks

pids=()
kill_tree() {
  local pid=$1
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  local pid
  for pid in "${pids[@]}"; do
    kill_tree "$pid"
  done
  for pid in "${pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT
trap 'exit 130' INT TERM

ports=$(node --input-type=module <<'NODE'
import { createServer } from 'node:net';

function open() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const first = await open();
const second = await open();
console.log(`${first.address().port} ${second.address().port}`);
await Promise.all([
  new Promise((resolve) => first.close(resolve)),
  new Promise((resolve) => second.close(resolve)),
]);
NODE
)
read -r base_port head_port <<<"$ports"

pnpm serve:out --dir "$base_out" --port "$base_port" \
  >/tmp/s17-checks/home-bytes-base-serve.log 2>&1 &
base_pid=$!
pids+=("$base_pid")
pnpm serve:out --dir "$head_out" --port "$head_port" \
  >/tmp/s17-checks/home-bytes-head-serve.log 2>&1 &
head_pid=$!
pids+=("$head_pid")

wait_for_server() {
  local pid=$1
  local port=$2
  local log=$3
  local attempt
  for attempt in {1..100}; do
    if curl --silent --fail --max-time 1 "http://127.0.0.1:$port/" >/dev/null; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "home-bytes: server exited before ready" >&2
      cat "$log" >&2
      return 1
    fi
    sleep 0.1
  done
  echo "home-bytes: server did not become ready on port $port" >&2
  cat "$log" >&2
  return 1
}

wait_for_server "$base_pid" "$base_port" /tmp/s17-checks/home-bytes-base-serve.log
wait_for_server "$head_pid" "$head_port" /tmp/s17-checks/home-bytes-head-serve.log

node .specify/features/cross-project/home-bytes.mjs \
  "http://127.0.0.1:$base_port" "http://127.0.0.1:$head_port" "$base_out" "$head_out"
