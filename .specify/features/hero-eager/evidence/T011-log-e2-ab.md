# T011 — E2: no nested re-render at mount

## Outcome

E2 was implemented in the two approved files plus its new mount test. The mount-time scene commit no
longer publishes the extent synchronously through `setScrollExtentPx`, and the first-content-frame
view state is unchanged. Visual parity, reveal ordering, the engine scroll group, probes and bytes
all pass.

The targeted pre-frame commit task does **not** show a measurable win: its median moved from 36.995
to 34.640 ms, a 2.355 ms delta against the larger T010 spread of 4.350 ms. The task remains present
immediately before the first content frame.

This is local emulation only; it does not decide an acceptance criterion.

## Trigger and change

T004 §6 says **E2 go**: the binding s2 eager task 8 is 160 ms simulated / 32.3 ms observed with 110
ms TBT, and its top frame is the `ViewScroll` mount layout effect under the R3F commit. T011 therefore
ran rather than skipping.

- `packages/xploder/src/react/scene/ViewScroll.tsx`: the first successful mount measurement writes
  the spacer height and `scrollTop = extent / 2` directly on the stage, applies the camera offset,
  and stores the extent for passive publication. Later dependency changes, frames and scroll events
  use the existing synchronous path. A later publication clears the pending mount value.
- `packages/xploder/src/react/TeardownViewer.tsx`: when the first published extent already matches
  the stage DOM, it seeds `adjustedExtentRef` so the state-driven spacer update does not re-centre the
  page. Later extent changes still use the existing rescale path.
- `packages/xploder/test/view-scroll-mount.test.tsx`: asserts passive mount publication, direct
  spacer/`scrollTop` writes, zero camera offset at the mount extent, and the unchanged later-change
  path.

No re-seal was performed; see `T011-log-reseal.txt`.

## Tests and checks

- Focused and sealed tests: 12/12 passed (`view-scroll-mount.test.tsx`, `view-scroll.test.tsx`,
  `viewer-handle.test.tsx`). The two sealed files are unchanged from `0fcd243`.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
- Full `pnpm test`: tools/perf 245/245 pass; xploder 624/626 pass. The only two failures are the
  expected pre-re-seal S5/S8 hashes.
- The exact check output ends with `T011-OK` in `T011-ab/t011.txt`; guards fail only
  `XPLODER-SRC`, `SURFACE-S5`, and `SURFACE-S8`.

## First-frame view state

The standard sequence probe does not emit the stage extent or camera view, so a ready-state Playwright
probe sampled those values immediately after `data-xploder-ready="true"`. The home route used the
eager build with no input; the project route was gated and engaged through “Explore in 3D”. T010 was
served from an archive of `e393048` built separately with the same flags.

| Route | T010 extent / spacer / scrollTop | T011 extent / spacer / scrollTop | T010 view / offsetY | T011 view / offsetY | Runs |
| --- | --- | --- | --- | --- | --- |
| home | `0` / `0px` / `0` | `0` / `0px` / `0` | `null` / effective `0` | `null` / effective `0` | 2 + 2 |
| project, engaged | `0` / `0px` / `0` | `0` / `0px` / `0` | `null` / effective `0` | `null` / effective `0` | 2 + 2 |

Home had no vertical overflow at the first frame (`scrollHeight = clientHeight = 277`); the project
surface likewise had none (`574 = 574`). The raw samples are in `T011-ab/offsets/`, with the compact
readout in `T011-ab/offset-probe.txt`.

## Target and A/B

The D-P7/D-P8 target is the unnamed R3F scene-mount commit immediately before the first content frame.

| Run | Before target @ start | After target @ start | Before first frame @ start | After first frame @ start |
| --- | ---: | ---: | ---: | ---: |
| r1 | 34.820 ms @ 442.355 ms | 34.497 ms @ 448.013 ms | 33.890 ms @ 477.177 ms | 37.703 ms @ 482.511 ms |
| r2 | 39.170 ms @ 454.286 ms | 34.783 ms @ 456.150 ms | 35.553 ms @ 493.458 ms | 33.151 ms @ 490.935 ms |
| median / spread | **36.995 / 4.350 ms** | **34.640 / 0.286 ms** | 34.722 / 1.663 ms | 35.427 / 4.552 ms |

Target delta = 2.355 ms, below the larger spread (4.350 ms): **no measurable win**. The target did not
leave the sequence; it still ends at the first-frame boundary 2 ms later in r1 and 2 ms later in r2.
Its top-eight still contains the xploder scene callback and R3F commit frames (`(anonymous)` in the
xploder chunk: 2.450 ms r1 / 3.361 ms r2; `nO` / `nK` also remain). No separate TeardownViewer frame
is named in the top-eight on either side. This is consistent with removing the nested re-render but
retaining the mount measurement/commit itself.

| Metric | T010 median / spread | T011 median / spread | Delta | Keep rule |
| --- | ---: | ---: | ---: | --- |
| eager simulated TBT /home | 193.66 / 62.31 ms | 171.83 / 22.67 ms | +21.82 ms | no measurable win (limit 62.31) |
| cpu1 first-content-frame | 10.673 / 0.368 ms | 10.748 / 0.042 ms | -0.075 ms | no measurable win |
| cpu4 first-content-frame | 34.722 / 1.663 ms | 35.427 / 4.552 ms | -0.706 ms | no measurable win |

### Named exceptions and dropped frames

| CPU | Exception | T010 r1 / r2 (median; spread) | T011 r1 / r2 (median; spread) |
| ---: | --- | --- | --- |
| 1 | renderer-constructor | 5.747 / 5.647 (5.697; 0.100) | 5.402 / 5.900 (5.651; 0.498) |
| 1 | program-compile | 10.857 / 10.489 (10.673; 0.368) | 10.727 / 10.769 (10.748; 0.042) |
| 1 | first-content-frame | 10.857 / 10.489 (10.673; 0.368) | 10.727 / 10.769 (10.748; 0.042) |
| 1 | `unnamedMaxMs` | 8.069 / 8.227 (8.148; 0.158) | 8.092 / 8.146 (8.119; 0.054) |
| 4 | renderer-constructor | 18.747 / 19.366 (19.057; 0.619) | 17.279 / 18.861 (18.070; 1.582) |
| 4 | program-compile | 33.890 / 35.553 (34.722; 1.663) | 37.703 / 33.151 (35.427; 4.552) |
| 4 | first-content-frame | 33.890 / 35.553 (34.722; 1.663) | 37.703 / 33.151 (35.427; 4.552) |
| 4 | `unnamedMaxMs` / target | 34.820 / 39.170 (36.995; 4.350) | 34.497 / 34.783 (34.640; 0.286) |

Dropped frames: CPU 1 was **0/0** before and **0/0** after. CPU 4 was **1/0** before and **1/1**
after. No dropped-frame bound was crossed.

## Non-goals

| Check | Result |
| --- | --- |
| Eager home parity, no input | 4 shots, 0 px |
| Gated home + project parity, engaged | 8 shots, 0 px |
| Draw calls | hero 2, project 2 |
| Ready / reduced-motion / project-gated probes | 2/2 PASS each |
| Probe ready / revealed | 204.25 / 208.15 ms before; 211.30 / 215.20 ms after (spread 20.40 / 20.20 ms, no win) |
| Engine scroll group | 5/5 PASS: zoom-1 overflow 0; zoom-3 overflow 803 px; top and bottom layers reached; camera unchanged at azimuth 45, zoom 3 |
| Reveal order | `firstInstancedDraw` -> `ready` -> `revealed`, all rAF 13 in both runs before and after; `firstFrameSource = draw-frame` |
| Eager bytes vs `0fcd243` | home initial gzip +138 B; total gzip +678 B; PASS |
| Gated bytes vs `0fcd243` | home initial gzip +1 B; project initial gzip -2 B; total gzip +531 B; PASS |

The standard reveal sequence stayed ordered and same-frame. The async `loading` state landed at rAF 2
instead of rAF 1 in these two runs, but it is before the first draw; the content-reveal sequence did
not change.

## Reading

The change removes the documented synchronous extent-state path without changing the first-frame
offset or visible output. Its target is still present and no run-to-run evidence shows a win beyond
noise. The orchestrator should decide whether to keep E2, and owns the S5/S8 re-seal if kept.

## Orchestrator decision (T011): REVERTED — no measurable win, and its target does not exist at these viewports (D-P11)

- Target task (the R3F scene-mount commit before the first content frame, `--cpu 4`): 34.820 / 39.170 → 34.497 / 34.783 ms; Δ 2.355 ms inside the 4.350 ms spread. The `ViewScroll` / R3F commit frames stay in it.
- Why: at ready, `data-xploder-scroll-extent` = 0, spacer 0 px, `scrollTop` 0 and camera `view.offsetY` 0 on both routes, both runs. With extent 0, `ViewScroll`'s mount `sync` never calls `onExtent`, so the nested `setScrollExtentPx` re-render that E2 removes does not occur. AC1's E2 task (s2 task 8, 160 / 32.3 ms) is the scene-mount commit itself; `sync` is its largest self-time frame (21 %, first execution of three's projection/matrix code), not a re-render.
- Side effect seen: the pre-draw `loading` live state moved from rAF 1 to rAF 2 in both after-runs (ready/revealed unchanged at rAF 13). Not kept.
- `ViewScroll.tsx` and `TeardownViewer.tsx` stay byte-identical to `0fcd243`; no S5/S8 re-seal; `view-scroll-mount.test.tsx` not committed. `T011-ab` is kept as `T011-ab-reverted`.
