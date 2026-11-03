# Defaults selected by T006. Override GLFLAG (swiftshader) or M per run.
GLFLAG=${GLFLAG-}
M=${M-18.5}
BEFORE=${BEFORE:-$F/evidence/T006-ab}
GL_ARGS=()
if [ -n "$GLFLAG" ]; then GL_ARGS=(--gl "$GLFLAG"); fi

# requires: F, T, M (cpu multiplier from T006-log-baseline.md §7); before = previous accepted state's $F/evidence/<prev>-ab/
O=/tmp/s117-checks/$T; mkdir -p $O
pnpm build:eager && pnpm bundle:manifest --out-dir apps/web/out --write $O/eager-manifest.json
for r in home:/ project:/projects/websocket-inspector; do n=${r%%:*}; p=${r#*:}
  (pnpm serve:out --port 4321 & echo $! > $O/srv.pid); sleep 2
  for i in 1 2; do pnpm perf:lighthouse http://127.0.0.1:4321$p "${GL_ARGS[@]}" --cpu-multiplier $M --out $O/lh-$n-r$i || echo "exit $? (verdict recorded)"; done
  pnpm perf:lighthouse http://127.0.0.1:4321$p --profile "${GL_ARGS[@]}" --cpu-multiplier $M --out $O/lhp-$n || echo "exit $? (verdict recorded)"
  kill "$(cat $O/srv.pid)"
  pnpm perf:attribution --lhr $O/lhp-$n/lighthouse-run-0.json --trace $O/lhp-$n/lighthouse-run-0.trace.json.gz --manifest $O/eager-manifest.json --out $O/attr-$n
  for i in 1 2; do pnpm fps:engine --scenario load --route $p --no-build --out $O/fps-$n-r$i || echo "exit $? (verdict recorded)"; done
  pnpm eager:probe --serve apps/web/out --route $p --runs 2 --out $O/probe-$n || echo "exit $? (verdict recorded)"
  pnpm eager:probe --serve apps/web/out --route $p --runs 2 --reduced-motion --out $O/probe-$n-reduce || echo "exit $? (verdict recorded)"
done
pnpm perf:parity --serve apps/web/out --no-engage --compare /tmp/s117-checks/baseline-shots-eager      # post-eager parity: 0 px or STOP
node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-eager.json /tmp/s117-checks/base-eager $O/eager-manifest.json apps/web/out
pnpm build && pnpm bundle:manifest --out-dir apps/web/out --write $O/gated-manifest.json
pnpm perf:parity --serve apps/web/out --compare /tmp/s117-checks/baseline-shots-gated                  # rest-state parity: 0 px or STOP
node $F/bundle-scopes.mjs --budget $F/evidence/T001-log-bundle-gated.json /tmp/s117-checks/base-gated $O/gated-manifest.json apps/web/out
pnpm site:probe --serve apps/web/out --group draws --group hero 2>&1 | tail -5
pnpm perf:startup --serve apps/web/out --route /projects/websocket-inspector --engage click --attribute --runs 2 --out $O/seq-project   # S11.6 sequence probe
pnpm perf:startup --serve apps/web/out --route / --engage move --attribute --runs 2 --out $O/seq-home
node $F/ab-table.mjs "$BEFORE" $O > $O/ab.md       # medians, spreads, keep-rule verdict (written in T006)
