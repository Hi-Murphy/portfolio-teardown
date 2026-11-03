# S11.5 — AC1–AC7 self-check (orchestrator)

Slice: S11.5 engine startup · branch `task/s11.5-engine-startup` · draft PR #17 · brief `.specify/slices/slice-11.5-engine-startup.md` (frozen, unedited) · design `rfc.md` (§9 gate log)

Protocol for every number: local production export, Playwright Chromium 156, Lighthouse mobile screen/UA, CDP 4× CPU throttle, ANGLE Metal (Apple M4) GPU, 2 runs per measurement, median = mean of the 2 raws (all raws in the JSONs). Baseline = T006 (unmodified product, `a08f0a5`); final = T013/T014 (`de7a417` code = HEAD code).

| AC | Verdict | Evidence (all under `evidence/`) |
|---|---|---|
| **AC1** baseline profile before any optimisation | **MET** | `T006-log-baseline-profile.md` (P0–P9 per path, ms + main-thread ms, counts), `T006-startup-*.json`, `T006-trace-*.json.gz` (6 traces), `T006-meta.json`, `T006-log-task-breakdown.txt`. Commit order: T006 merge `a08f0a5` precedes the first product commit (T009 `c9aea35`); `git diff 92a8d24 a08f0a5 -- apps/web packages/xploder` is empty. Phases covered: parse/eval (P2/P3), mount (P4), geometry (P6: 14 uploads ≈ 0 ms), shader compile (P7: 2.3–3.0 ms), texture creation (P8: 7 = three's empty default textures, 0.2–0.7 ms), first frame (P9) |
| **AC2** 0 dropped frames + no task > 50 ms in the first 5 s (project route + hero) | **NOT MET — blocked, escalated with evidence (Hard Rule 2)** | `T014-log-ac2.md`, `T014-fps-startup-*.json`: one long task remains on every path (median max 56.4 ms project move, 58.9 ms project click, 61–69 ms home) and 1–7 dropped frames. Baseline: 103–143 ms max + a second 55–61 ms task. Blocker = the synchronous `<Canvas>` mount in frozen S8 `TeardownViewer.tsx` (three renderer construction 37–46 %, R3F root + first render 22–31 %, xploder scene 17–27 %; context creation only 2.8 ms): `T010-log-longtask-profile.txt`. Murphy accepted "blocked" at G2 (RFC §9.6). The fix would need a brief revision allowing S8/Canvas changes. |
| **AC3** startup main-thread cost −40 % or documented shortfall | **Shortfall documented (AC3's own clause)** | `T013-log-before-after.md`: project/move 375.961 → 325.607 ms (**−13.4 %**), project/click 392.280 → 339.608 ms (**−13.4 %**), home 316.746 → 311.931 ms (−1.5 %, protocol pair; extra pair 284.2 ms = −10.3 %, both published). Ceiling: even if all remaining P3 module eval went to 0, the drop caps at 20.0 / 35.3 / 34.4 %; P4 + P5 (frozen-S8 mount + three/R3F renderer init) = 33.8–35.8 % of final cost and is outside the allowed surfaces. |
| **AC4** pixel parity light + dark, 2 draw calls, CLS 0, JS ≤ baseline | **MET** | Parity: `T014-log-parity.txt`, 8/8 shots (2 routes × mobile/desktop × light/dark) 0 differing RGBA pixels vs `T006-screenshot-*`. Draw calls: `T014-log-drawcalls.txt` (site probe 2 on both routes, engine:probe fixtures a/b/c 2). CLS 0 (harness + gated Lighthouse). Bytes, `T014-log-bundle-diff.txt` (single gzip method): home initial 583,368 → 583,343 B (−25), project initial 586,201 → 581,795 B (−4,406), total JS 1,771,865 → 1,581,558 B (−190,307); gzip ≤ baseline in every scope. |
| **AC5** one lever proven dominant, individual contribution shown | **MET** | `T013-log-before-after.md` §3–4: **L3 split init** (staged module evaluation + transition mount, T010) is dominant. Leave-one-out on project move/click: cost −28.9 / −30.8 ms, max long task −54.6 / −55.0 ms. L4 import trimming (T009) is second: LOO cost −21.6 / −17.7 ms, bytes −201,716 B. L2 precompile and L5 were skipped with evidence (P7 = 2–3 ms, below spread), L1 skipped (cannot move the AC2 blocker) — no shotgun changes, one lever per commit with an A/B (`T009-log-l4-ab.md`, `T010-log-l3-ab.md`). |
| **AC6** eager flag measured on `/` and the project route, verdict | **MET — verdict: keep the gate** | `T017-log-eager-verdict.md`. CI runner (binding, 2 independent runs): eager `/` perf 0.955 / 0.96, TBT 248.5 / 232.75 ms; eager project perf 0.89 / 0.905, TBT 441.5 / 397.65 ms → fails "≥ 95 perf and TBT ≤ 200 ms" → **keep D-19's gate**. Local (`T016-log-eager-local.md`): perf 1.00, TBT 2–3 ms on both. Flag: `NEXT_PUBLIC_EAGER_3D=1 pnpm build:eager` (`compiler.define`), off by default, flag-off build byte-identical (`T015-log-flag.txt`). |
| **AC7** CI green, S2/S5/S7/S8 empty, touched S4/S6 re-sealed, `XPLODER-SRC-OK` exact | **MET** | `T018-ci-run.txt`: all 12 checks pass on head `e92c55c` (incl. required: build, gitleaks, `seo: meta + og`, Lighthouse, weight, fixture exclusion, axe production routes; plus `perf: fps calibration`, `a11y: axe (engine fixture export)`, `perf: eager-3d (measurement)`). `T018-log-guard.txt`: all 14 guards OK. `T018-log-reseal.txt`: S2, S4, S5, S6, S7, S8 diffs empty; `git diff 92a8d24 -- packages/xploder` empty; no S4/S6 file touched, so no manifest regenerated; `approved-xploder-src.txt` empty = `XPLODER-SRC-OK` lists exactly the (zero) touched files. |

## Who finished each task (Hard Rule 8; tier 1.5 dormant and skipped throughout)

| Task | Finished by |
|---|---|
| T001, T005 | tier 1 (DeepSeek Flash 4.1) |
| T002, T003, T004 | tier 1, each after one orchestrator-review revision (harness accounting defects); T003 merge conflict resolved by orchestrator |
| T006 | tier 1 (measurements, tables) + orchestrator (interpretation, task breakdown) |
| T007, T008, T011, T012 | skipped by Murphy-approved gate decisions (G1, G2) |
| T009 | tier 1 (check blocked by two plan defects, recorded as D-P1/D-P2) |
| T010 | tier 1 after two review revisions; final 45 B initial-JS fix + long-task CPU profile by orchestrator |
| T013 | tier 1 + orchestrator noise pair (home) |
| T014 | tier 1 + orchestrator gzip-method correction |
| T015 | tier 1 after one review revision (compile-away define) |
| T016 | tier 1 + orchestrator capture check |
| T017 | tier 1 (workflow, verdict CLI) + orchestrator (push, draft PR, CI artifact, verdict doc) |
| T018 | tier 1 (evidence logs) + orchestrator (this self-check) |

No task hit "stuck ×2"; no escalation pause was needed.

## Needs Murphy's hands

1. Final validation of PR #17, then "merge" (the orchestrator merges only on your word).
2. D-19 (retire the interaction gate?): the AC6 data says **keep it**. Decision is yours, outside this slice.
3. `eager-3d.yml`: kept until your D-19 decision, then remove it (not a required check).
4. AC2: blocked by frozen S8 — a future brief revision could allow a staged `<Canvas>` mount.
