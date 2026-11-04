# T009 — E1d overlay model one task later (local A/B)

Local emulation only. Binding numbers come from qualified CI attempts.

## Trigger

E1d was triggered by the letter of RFC §4:

- the first-content-frame task contributes 33 ms observed (~132 ms simulated) at `--cpu 4`, which is > 50 ms simulated;
- the projected `/` eager TBT is `219.25 - 27.5 = 191.75 ms` (T006's local TBT delta), which is > 185 ms.

## Change

`packages/xploder/src/react/overlay/BlueprintOverlay.tsx` only:

- the **first** `settled` event stores the pending frame and schedules `applyPending` with a local `MessageChannel` yield (one task, no timer literal);
- later `settled` events stay synchronous;
- the deferred task is cancelled on `moving`, layout change and unmount;
- the fade remains driven by the settled model, so it still starts after the model exists.

New test: `packages/xploder/test/overlay-first-settle.test.tsx` (first settle deferred, later settle synchronous, fade after model). The sealed `packages/xploder/test/blueprint-scene.test.tsx` is unchanged (`BLUEPRINT-SCENE-UNCHANGED`) and passing.

## A/B (T006 → T009)

Source: `T009-ab/ab.md`, `T009-ab/fps-home-*`, `T009-ab/lh-home-*`.

| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| eager simulated TBT `/` (ms) | 175.25 | 22.50 | 162.75 | 15.50 | 12.50 | 22.50 | no measurable win |
| `renderer-constructor`, cpu 1 (ms) | 5.801 | 0.382 | 5.582 | 0.044 | 0.219 | 0.382 | no measurable win |
| `program-compile`, cpu 1 (ms) | 11.102 | 0.395 | 10.828 | 0.479 | 0.275 | 0.479 | no measurable win |
| `first-content-frame`, cpu 1 (ms) | 11.102 | 0.395 | 10.828 | 0.479 | 0.275 | 0.479 | no measurable win |
| `renderer-constructor`, cpu 4 (ms) | 18.282 | 0.449 | 18.727 | 1.433 | -0.445 | 1.433 | no measurable win |
| `program-compile`, cpu 4 (ms) | 33.629 | 0.691 | 33.546 | 1.333 | 0.083 | 1.333 | no measurable win |
| `first-content-frame`, cpu 4 (ms) | 33.629 | 0.691 | 33.546 | 1.333 | 0.083 | 1.333 | no measurable win |
| unnamed max, cpu 4 (ms) | 34.717 | 0.479 | 34.600 | 0.492 | 0.117 | 0.492 | no measurable win |
| dropped frames trace-only | 0 | 0 | 0 | 0 | 0 | 0 | no measurable win |
| probe ready (ms) | 211.90 | 13.60 | 209.35 | 21.10 | 2.55 | 21.10 | no measurable win |
| probe revealed (ms) | 215.65 | 13.50 | 211.25 | 21.10 | 4.40 | 21.10 | no measurable win |

Raw named values:

| Run | cpu | constructor | program-compile | first-content-frame |
| --- | ---: | ---: | ---: | ---: |
| before r1 | 1 | 5.992 | 11.300 | 11.300 |
| before r2 | 1 | 5.610 | 10.905 | 10.905 |
| after r1 | 1 | 5.604 | 10.588 | 10.588 |
| after r2 | 1 | 5.560 | 11.067 | 11.067 |
| before r1 | 4 | 18.506 | 33.283 | 33.283 |
| before r2 | 4 | 18.057 | 33.974 | 33.974 |
| after r1 | 4 | 18.010 | 34.212 | 34.212 |
| after r2 | 4 | 19.443 | 32.879 | 32.879 |

No named exception grows beyond its own spread at cpu 1 or cpu 4 in the retained 2-run set. A preceding run of the same block measured cpu 4 `first-content-frame`/`program-compile` at 34.416/34.459 against 33.283/33.974 before (+0.809 ms median against a 0.691 ms spread). The final rerun did not reproduce that spread breach; it stayed below the local AC2 cap 34.651 ms either way. The A/B is not a win in either run.

## Targeted task at cpu 4

The production bundle is minified, so `overlayBaseModel` / `tagsModel` cannot be named in V8 samples. The focused trace therefore attributes self time at **overlay-chunk** level: it finds the client chunk containing `data-xploder-overlay`, then sums that chunk's V8 samples inside each main-thread task (`captures/t009-target-before.txt`, `captures/t009-target-after.txt`, 2 runs each, cpu 4, fresh page each run).

| Trace metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| first-content-frame duration (ms) | 34.630 | 1.193 | 33.921 | 1.611 | 0.709 | 1.611 | no measurable win |
| overlay-chunk self time **inside** first-content-frame (ms) | 7.788 | 1.435 | 8.476 | 0.662 | -0.688 | 1.435 | no reduction |
| post-ready overlay task duration (ms) | 14.811 | 0.155 | 10.198 | 0.815 | 4.612 | 0.815 | duration falls |
| post-ready overlay task overlay-chunk self time (ms) | 8.038 | 3.312 | 6.809 | 0.042 | 1.229 | 3.312 | no measurable win |

**Does the target leave the first-content-frame task at cpu 4? No.** Overlay-chunk self time is still present in that task after the change (8.807/8.145 ms vs 7.070/8.505 ms before), so this probe does not show the overlay model moving out of the first-content-frame task. The post-ready overlay task exists in both states; its own self-time delta (1.229 ms) is inside the larger spread (3.312 ms). The duration drop is not attributable to the deferred model and is not claimed. **Verdict: no measurable win.**

## Non-goal checks

- Parity: eager home 4 shots / 0 px; gated 4 home + 4 project shots / 0 px.
- Reveal sequence: `firstInstancedDraw` rAF 13 and `ready` rAF 13 in both runs; `revealed` at rAF 13; 2 instanced draws.
- Draws: 2 on both routes; CLS 0.
- Bytes: eager home initial gzip +138 B, project -386 B, total +709 B; gated home +1 B, project 0 B, total +562 B. All PASS.
- Probes: home normal 2/2 PASS; home reduced-motion 2/2 PASS; project gated 2/2 PASS.
- Lighthouse: home 0.98/0.98 (median 0.98), project 1.00/0.99.
- Dropped frames: 0.

## Check status

- Focused overlay suite: 65/65 passed, including `blueprint-scene.test.tsx`.
- Full overlay + frozen-surface run: 70 passed, 1 failed — the expected frozen S6 hash for `BlueprintOverlay.tsx`.
- Guards: `FAIL XPLODER-SRC`, `FAIL SURFACE-S6`; all other guards OK.
- `pnpm typecheck`: PASS. `pnpm lint`: PASS. `pnpm build`: PASS.
- `pnpm test`: 625 passed, 1 failed — the same expected frozen S6 hash.
- `T009-OK` was not emitted because the task forbids re-sealing. Full tail and logs are in `T009-ab/captures/`.

Check tail:

```text
BLUEPRINT-SCENE-UNCHANGED
Test Files  1 failed | 6 passed (7)
Tests  1 failed | 70 passed (71)
packages/xploder test:  Test Files  1 failed | 62 passed (63)
packages/xploder test:       Tests  1 failed | 625 passed (626)
T009-NOT-OK: expected pre-re-seal failures; T009-OK not emitted
GUARDS_FINAL_EXIT=1
FAIL XPLODER-SRC
XPLODER-TEST-OK
FAIL SURFACE-S6
SEALED-TESTS-OK
GITLEAKS-OK
LINT_FINAL_EXIT=0
```

## Re-seal

Not performed: the executor was instructed not to re-seal. `T009-log-reseal.txt` records the deferred re-seal and the exact expected hash failure.

## Orchestrator decision (T009): REVERTED — no measurable win (keep rule, D-P8)

- Its target (the overlay model) does **not** leave the first-content-frame task at `--cpu 4`: overlay-chunk self time inside that task 7.788 → 8.476 ms; the post-ready task's overlay self time moves 8.038 → 6.809 ms, Δ 1.229 ms inside the 3.312 ms spread. First-content-frame 33.629 → 33.546 ms (inside spread). Parity, sequence, bytes and probes passed, so the revert is for no win, not for harm.
- `packages/xploder/src/react/overlay/BlueprintOverlay.tsx` stays byte-identical to `0fcd243`; no S6 re-seal for it; `overlay-first-settle.test.tsx` not committed. `T009-ab` is kept as `T009-ab-reverted`.
