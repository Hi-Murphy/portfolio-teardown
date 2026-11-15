#!/usr/bin/env bash
# AC6 proof: the seven required contexts report a completed run on the PR head; removed workflows are absent.
# Usage: bash required-contexts.sh <pr-number>
set -euo pipefail
pr=${1:?usage: required-contexts.sh <pr-number>}
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
head=$(gh pr view "$pr" --json headRefOid -q .headRefOid)
required=$(gh api "repos/$repo/rulesets" -q '.[].id' | while read -r id; do
  gh api "repos/$repo/rulesets/$id" -q '.rules[]? | select(.type=="required_status_checks") | .parameters.required_status_checks[].context'
done | sort -u)
runs=$(gh api "repos/$repo/commits/$head/check-runs?per_page=100" --paginate -q '.check_runs[] | {name, status, conclusion}' | jq -s '.')
removed='["perf: eager-3d (measurement)"]'
fail=0
echo "{"
echo "  \"pr\": $pr, \"head\": \"$head\","
echo "  \"required\": $(printf '%s\n' "$required" | jq -R . | jq -s .),"
echo "  \"checks\": ["
first=1
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  run=$(jq -c --arg n "$name" '[.[] | select(.name==$n)] | last // null' <<<"$runs")
  status=$(jq -r '.status // "missing"' <<<"$run"); conclusion=$(jq -r '.conclusion // "none"' <<<"$run")
  ok=false; [[ "$status" == completed && "$conclusion" == success ]] && ok=true
  [[ "$ok" == true ]] || fail=1
  [[ $first == 1 ]] || echo ","
  first=0
  printf '    {"context": %s, "status": "%s", "conclusion": "%s", "ok": %s}' "$(jq -R . <<<"$name")" "$status" "$conclusion" "$ok"
done <<<"$required"
echo ""
echo "  ],"
count=$(printf '%s\n' "$required" | grep -c . || true)
stale=$(jq --argjson r "$removed" '[.[] | select(.name | test("eager-3d|eager-load|hero-eager"))] | length' <<<"$runs")
[[ "$count" == 7 ]] || fail=1
[[ "$stale" == 0 ]] || fail=1
echo "  \"requiredCount\": $count, \"staleWorkflowRuns\": $stale, \"verdict\": \"$([[ $fail == 0 ]] && echo PASS || echo FAIL)\""
echo "}"
exit $fail
