# T006 — AC1 baseline profile

Date: 2026-11-03

Git: `919b7841e38d87b0367b7ff8822d7f9a800cd04a` (`task/s11.5-engine-startup-t006`). The product diff
from `92a8d24` over `apps/web` and `packages/xploder` is empty.

Protocol: production static export, Playwright Chromium `156.0.8078.4`, mobile profile, 4x CPU
throttling, two runs per path and kind, median = mean of the two raw values. Attributed runs install
the GL wrappers; clean runs do not. Phase values are milliseconds; raw cells are
`ms / mainThreadMs / count`, with `—` when the phase has no count. `probeContexts` is shown as
`count / ms`.

## Startup phase model (attributed)

### home / move

| Phase | Median ms | Median mainThreadMs | r1 ms / mainThreadMs / count | r2 ms / mainThreadMs / count | probeContexts r1 / r2 |
|---|---:|---:|---|---|---|
| P0 | 27.941 | 0.000 | 29.398 / 0.000 / — | 26.483 / 0.000 / — | 1 / 4.800 ms ; 1 / 4.300 ms |
| P1 | 29.718 | 0.000 | 28.821 / 0.000 / 2 | 30.614 / 0.000 / 2 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P2 | 112.835 | 1.389 | 113.242 / 1.915 / 6 | 112.428 / 0.862 / 6 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P3 | 102.250 | 102.250 | 101.700 / 101.700 / 1 | 102.800 / 102.800 / 1 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P4 | 90.300 | 44.105 | 90.900 / 45.040 / — | 89.700 / 43.171 / — | 1 / 4.800 ms ; 1 / 4.300 ms |
| P5 | 67.850 | 66.924 | 66.800 / 65.864 / 1 | 68.900 / 67.983 / 1 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P6 | 0.050 | 0.050 | 0.000 / 0.000 / 14 | 0.100 / 0.100 / 14 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P7 | 3.000 | 3.000 | 3.000 / 3.000 / 6 | 3.000 / 3.000 / 6 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P8 | 2.776 | 2.776 | 2.829 / 2.829 / 7 | 2.724 / 2.724 / 7 | 1 / 4.800 ms ; 1 / 4.300 ms |
| P9 | 2.719 | 2.623 | 2.628 / 2.529 / — | 2.811 / 2.717 / — | 1 / 4.800 ms ; 1 / 4.300 ms |

Attributed median total: `mainThreadCostMs=313.0545`, `attributedMs=223.1170`,
`otherMs=89.9375`, `blockingMs=64.3715`.

### project / move

| Phase | Median ms | Median mainThreadMs | r1 ms / mainThreadMs / count | r2 ms / mainThreadMs / count | probeContexts r1 / r2 |
|---|---:|---:|---|---|---|
| P0 | 26.491 | 0.000 | 26.870 / 0.000 / — | 26.111 / 0.000 / — | 1 / 4.900 ms ; 1 / 4.700 ms |
| P1 | 30.886 | 0.000 | 29.566 / 0.000 / 3 | 32.206 / 0.000 / 3 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P2 | 145.528 | 0.602 | 144.415 / 0.262 / 9 | 146.641 / 0.942 / 9 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P3 | 134.650 | 134.650 | 133.700 / 133.700 / 1 | 135.600 / 135.600 / 1 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P4 | 215.350 | 58.251 | 218.200 / 59.277 / — | 212.500 / 57.226 / — | 1 / 4.900 ms ; 1 / 4.700 ms |
| P5 | 65.900 | 65.078 | 67.300 / 66.480 / 1 | 64.500 / 63.676 / 1 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P6 | 0.050 | 0.050 | 0.100 / 0.100 / 14 | 0.000 / 0.000 / 14 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P7 | 2.700 | 2.700 | 3.100 / 3.100 / 6 | 2.300 / 2.300 / 6 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P8 | 5.407 | 5.407 | 4.905 / 4.905 / 7 | 5.909 / 5.909 / 7 | 1 / 4.900 ms ; 1 / 4.700 ms |
| P9 | 2.792 | 2.356 | 2.984 / 2.884 / — | 2.600 / 1.829 / — | 1 / 4.900 ms ; 1 / 4.700 ms |

Attributed median total: `mainThreadCostMs=376.0265`, `attributedMs=269.0950`,
`otherMs=106.9315`, `blockingMs=89.9290`.

### project / click

| Phase | Median ms | Median mainThreadMs | r1 ms / mainThreadMs / count | r2 ms / mainThreadMs / count | probeContexts r1 / r2 |
|---|---:|---:|---|---|---|
| P0 | — | — | — | — | 1 / 5.600 ms ; 1 / 5.200 ms |
| P1 | 38.687 | 0.000 | 44.039 / 0.000 / 3 | 33.335 / 0.000 / 3 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P2 | 154.032 | 0.332 | 159.798 / 0.330 / 9 | 148.267 / 0.334 / 9 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P3 | 137.700 | 137.700 | 138.300 / 138.300 / 1 | 137.100 / 137.100 / 1 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P4 | 203.650 | 51.404 | 197.200 / 52.171 / — | 210.100 / 50.637 / — | 1 / 5.600 ms ; 1 / 5.200 ms |
| P5 | 67.950 | 67.213 | 69.000 / 68.221 / 1 | 66.900 / 66.204 / 1 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P6 | 0.000 | 0.000 | 0.000 / 0.000 / 14 | 0.000 / 0.000 / 14 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P7 | 2.300 | 2.300 | 2.500 / 2.500 / 6 | 2.100 / 2.100 / 6 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P8 | 6.269 | 6.269 | 6.619 / 6.619 / 7 | 5.919 / 5.919 / 7 | 1 / 5.600 ms ; 1 / 5.200 ms |
| P9 | 2.938 | 2.211 | 2.774 / 1.856 / — | 3.102 / 2.566 / — | 1 / 5.600 ms ; 1 / 5.200 ms |

Attributed median total: `mainThreadCostMs=386.5885`, `attributedMs=267.4285`,
`otherMs=119.1600`, `blockingMs=94.9385`.

## Clean cost, long tasks, blocking, FPS and CLS

`startup` columns come from the unwrapped clean runs. `FPS` comes from
`fps:engine --scenario startup`; all six runs exit `6` because the baseline fails AC2. Values are
`median (r1, r2)`.

| Path | startup main-thread cost ms | startup max long task ms | startup blocking ms | startup CLS | FPS dropped frames | FPS max long task ms |
|---|---:|---:|---:|---:|---:|---:|
| home / move | 316.746 (314.891, 318.602) | 102.715 (102.083, 103.346) | 62.981 (63.401, 62.562) | 0 (0, 0) | 2 (2, 2) | 82.460 (60.804, 104.116) |
| project / move | 375.961 (377.085, 374.836) | 133.978 (133.389, 134.566) | 89.381 (88.070, 90.691) | 0 (0, 0) | 6.5 (7, 6) | 54.450 (55.523, 53.376) |
| project / click | 392.280 (398.184, 386.376) | 140.597 (143.015, 138.179) | 96.806 (100.389, 93.224) | 0 (0, 0) | 6 (6, 6) | 54.866 (55.161, 54.571) |

Long-task lists (`start`, `duration`, `phase` in ms):

| Path | Source | r1 | r2 |
|---|---|---|---|
| home / move | startup clean | 2393.600 / 102.083 / P2; 2578.129 / 61.318 / other | 2362.422 / 103.346 / P2; 2548.762 / 59.216 / other |
| home / move | FPS startup | 89.861 / 60.804 / other | 31.996 / 104.116 / other; 221.489 / 60.264 / other |
| project / move | startup clean | 2373.033 / 133.389 / P2; 2716.560 / 54.681 / other | 2356.778 / 134.566 / P2; 2700.006 / 56.125 / other |
| project / move | FPS startup | 197.911 / 55.523 / other | 211.243 / 53.376 / other |
| project / click | startup clean | 2299.637 / 143.015 / P2; 2641.942 / 57.374 / other | 2376.322 / 138.179 / P2; 2716.167 / 55.045 / other |
| project / click | FPS startup | 185.483 / 55.161 / other | 183.550 / 54.571 / other |

## Textures, WebGL and benchmark index

| Path | Texture count median (r1, r2) | Texture ms median (r1, r2) |
|---|---:|---:|
| home / move | 7 (7, 7) | 0.350 (0.000, 0.700) |
| project / move | 7 (7, 7) | 0.650 (0.600, 0.700) |
| project / click | 7 (7, 7) | 0.150 (0.200, 0.100) |

- WebGL renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`.
- `KHR_parallel_shader_compile`: **yes**; it is present in all six attributed runs (36 extensions
  reported per run). Clean runs do not install the GL wrapper, so renderer/extensions are taken from
  the attributed runs.
- The complete extension list is recorded in `T006-meta.json`.

| Path | Kind | r1 benchmarkIndex | r2 benchmarkIndex |
|---|---|---:|---:|
| home / move | clean | 4188.5 | 4179.5 |
| home / move | attributed | 4200 | 4191 |
| project / move | clean | 4183 | 4177 |
| project / move | attributed | 4166 | 4159.5 |
| project / click | clean | 4096.5 | 4151 |
| project / click | attributed | 4182 | 4182.5 |

## D4 hypotheses versus measured

Measured cells are the median wall / main-thread ranges across the three attributed paths.

| Phase | D4 hypothesis | Measured baseline | Verdict |
|---|---|---|---|
| P2 parse/compile | medium | 112.8–154.0 / 0.3–1.4 | Mostly off-thread; wall time is large but main-thread cost is small. |
| P3 module eval | medium–high | 102.3–137.7 / 102.3–137.7 | Confirmed; it is the largest single main-thread phase. |
| P4 React mount | high | 90.3–215.4 / 44.1–58.3 | High wall time; main-thread mount is 44–58 ms per path. |
| P5 renderer init | low–medium | 65.9–67.9 / 65.1–67.2 | Higher than expected and consistently near 67 ms. |
| P6 geometry | negligible | 0.0–0.1 / 0.0–0.1 | Confirmed negligible. |
| P7 shader compile | medium–high on mobile GPUs | 2.3–3.0 / 2.3–3.0 | Low on this host (headless Chromium uses ANGLE Metal on the Apple M4 GPU, not SwiftShader); 6 calls = 2 compileShader + 1 linkProgram + 3 first status queries for the one program. |
| P8 textures | none expected, ≈0 ms | 2.8–6.3 / 2.8–6.3, 7 textures | Rejected: seven textures are uploaded, though the cost remains small. |
| P9 first frame | low | 2.7–2.9 / 2.2–2.6 | Confirmed low. |

## Recommended lever order and AC3 ceiling (executor draft — superseded by the orchestrator interpretation below)

1. **L4, import trimming.** P3 is 102.3–137.7 ms of main-thread module evaluation (32.7–35.8% of
   total cost); P2 adds 112.8–154.0 ms of wall time even though its main-thread share is small. This
   is the only measured lever with a plausible direct reduction in AC3 cost and it also addresses
   AC4 bundle bytes.
2. **L2, precompiled material.** `KHR_parallel_shader_compile` is present and valid for the planned
   path, but P7 is only 2.3–3.0 ms here. Keep it as the correctness/readiness experiment, not as the
   expected source of the AC3 win.
3. **L3, split init, for AC2.** P4's main-thread mount is 44.1–58.3 ms and the clean long tasks are
   102–143 ms; time-slicing can reduce the longest task but does not remove that work from AC3.
4. **L1, warm startup, for AC2.** It can move work before engagement, but Q2 still counts that work,
   so it is not an AC3 saving. The FPS runs already show 2–7 dropped frames and 53–104 ms long tasks.
5. **L5, overlay model cache: not selected here.** The phase table does not isolate the S6 overlay
   from the rest of P4, so T006 provides no ≥10%-of-P4 proof for the conditional lever.

Frozen S7/S8 mount (P4 main-thread) plus WebGL context creation (P5 main-thread) is 111.0 ms on home,
123.3 ms on project move and 118.6 ms on project click: **35.5%, 32.8% and 30.7% of total cost**.
The theoretical maximum AC3 reduction is therefore about 65–69%, but that would require removing all
other work. The measured, addressable L4 work (P3) is only 32.7–35.8% of total cost before any
incomplete-removal haircut. The baseline therefore points to an AC3 ceiling below the 40% target;
T014 should use the documented-shortfall clause unless later measurements show savings outside the
phase model.

## Gated Lighthouse

Each invocation is a `perf:lighthouse` run containing three internal Lighthouse runs. Both routes
passed every invocation.

| Route | Invocation | Internal run | Performance | TBT ms | LCP ms | CLS | benchmarkIndex |
|---|---|---:|---:|---:|---:|---:|---:|
| home | r1 | 1 | 1.00 | 0.5 | 903.035 | 0 | 4212.5 |
| home | r1 | 2 | 1.00 | 0.5 | 903.205 | 0 | 4230.5 |
| home | r1 | 3 | 1.00 | 0.5 | 903.227 | 0 | 4250 |
| home | r2 | 1 | 1.00 | 0.5 | 903.551 | 0 | 4226 |
| home | r2 | 2 | 1.00 | 0.5 | 903.208 | 0 | 4232.5 |
| home | r2 | 3 | 1.00 | 0.0 | 902.771 | 0 | 4208.5 |
| project | r1 | 1 | 1.00 | 0.5 | 903.046 | 0 | 4225.5 |
| project | r1 | 2 | 1.00 | 0.0 | 903.163 | 0 | 4237.5 |
| project | r1 | 3 | 1.00 | 0.0 | 902.859 | 0 | 4263.5 |
| project | r2 | 1 | 1.00 | 0.5 | 903.122 | 0 | 4225 |
| project | r2 | 2 | 1.00 | 1.0 | 903.318 | 0 | 4231.5 |
| project | r2 | 3 | 1.00 | 2.0 | 902.984 | 0 | 4229 |

## Bundle baseline

Gzip values are the sum of per-file gzip sizes at level 9. Initial JS is the distinct script set on
the exported route; total JS is all 17 files under `_next/static`.

| Scope | Files | Raw bytes | Gzip bytes |
|---|---:|---:|---:|
| home initial JS | 9 | 583368 | 180618 |
| project initial JS | 9 | 586201 | 181497 |
| total emitted JS | 17 | 1771865 | 501942 |

## Run spread

The required pair was flagged above 20% for home/move attributed (P6 and texture time at 0.0–0.1 ms),
project/move clean (P0, 5.9 vs 25.4 ms), project/move attributed (P6 and P7) and project/click
attributed (P1 and texture time). Each flagged pair was repeated. Repeat median main-thread cost was
313.268, 377.171, 378.141 and 386.327 ms respectively, within 1.5% of the published pairs; the repeat
aggregate flag still trips on sub-millisecond phases. The required r1/r2 pairs above remain the
published two-run baseline and all repeat artifacts are retained for audit.

## Interpretation (orchestrator)

Reviewed against the clean traces (top-level task breakdown via `/tmp` dump script; excerpt below). All numbers are T006 medians on this host at 4× CPU.

**Where the time goes (one engagement, project/move clean ≈ 376 ms main thread):**

| # | Task (relative start) | Dur | What it is | Phase | Code owner |
|---|---|---:|---|---|---|
| 1 | +0 ms | 133 ms | `EvaluateScript` of the 3D chunk + `RunMicrotasks`: **all 3D module factories run in one task** (three, R3F + its reconciler, xploder react) | P2 + P3 | three/R3F (deps), bundling = app |
| 2 | +134 ms | 14 ms | React scheduler work (`react-dom`, `fn=z`) | P4 | app + S7/S8 |
| 3 | +270 ms | 17 ms | `TimerFire` → React | P4 | app + S7/S8 |
| 4 | +344 ms | **55 ms** | React render + commit of the viewer tree; R3F `Canvas` root creation → `getContext` (MSAA) + `WebGLRenderer` init | P4 → P5 | S8 (`TeardownViewer`, Canvas props), R3F |
| 5 | +398 ms | 30 ms | `FireAnimationFrame` in the 3D chunk: R3F's first frame (program link via parallel compile, 2 instanced draws) | P5–P9 | R3F / S4 `Stats` / S6 |
| 6 | +430 ms | 34 ms | React work after the first frame: reveal / `onStats` / `onPhase` re-renders (workbench, overlay, lettering) | other | app + S6/S7/S8 |

Home/move has the same shape (102 / 28 / **61** / 29 / 27 ms), and project/click too (143 ms first task).

**Findings that change the RFC's expectations:**
- **F-B1:** the dominant cost is **one synchronous module-evaluation task** (102–143 ms ≈ 33–36 % of cost). It is also AC2's worst long task. It shrinks with **L4** (fewer modules to evaluate) and can be **split** only by evaluating the 3D graph in separate `import()` stages (each its own task). That staged split is **L3's** job: "split … setup across frames".
- **F-B2:** shader compile is **2.3–3.0 ms** (P7). The host GPU is ANGLE Metal / Apple M4 (headless Chromium uses the hardware GPU here, not SwiftShader as RFC D2/Q5 assumed → correction C2). `KHR_parallel_shader_compile` is present. **L2 cannot show a measurable win on this host** (3 ms is below the run spread), and per D6 it would be reverted. Default: **skip L2 and leave S6 untouched**.
- **F-B3:** the "7 textures" are three.js's default empty textures from `WebGLState` (1 × 2D + 6 cube-map faces), 0.2–0.7 ms. There are no product textures. Geometry is 14 tiny buffer uploads (≈ 0 ms).
- **F-B4:** a second WebGL context is created by xploder's `hasWebgl()` probe (S8, frozen) in every start (≈ 5 ms, inside P4). It is recorded, not touchable.
- **F-B5:** the second long task (55–61 ms, React render/commit + R3F root/context creation) sits mostly in **frozen S8** (`TeardownViewer`, `<Canvas>` props) and R3F. L3's `startTransition` can slice the **render** phase but not the commit or context creation. Whether it gets below 50 ms is an open measurement.
- **F-B6:** gated Lighthouse is perf 1.00, TBT 0–2 ms, CLS 0 on both routes (the 3D never loads without interaction). That is the AC6 reference.

**AC3 ceiling estimate (numbers, provisional until T013):** a 40 % drop needs ≈ 150 ms off ≈ 376 ms (project/move). What this slice may touch:
- (a) the module-eval task, via L4. If L4 removes the unused ≈ 30–50 % of three and three is roughly two thirds of the chunk's evaluation, it saves ≈ 20–45 ms;
- (b) app-side post-first-frame React work (task 6, app share unknown, ≤ 34 ms);
- (c) shader compile, ≈ 3 ms.

The rest (React mount of frozen S7/S8 trees, R3F reconciliation, WebGL context + renderer init ≈ 65 ms, the probe context) is outside the allowed surfaces. **Best case ≈ 25–80 ms ≈ 7–21 %.** AC3's 40 % is very likely **physically unreachable within the frozen-surface rules**, and AC3 will most likely close through its own documented-shortfall clause (ceiling + reason in numbers, T013). This is reported now, at G1, as the brief requires (Hard Rule 2: escalate with evidence; no AC is reworded).

**AC2 outlook:** the baseline shows 2–7 dropped frames and long tasks of 102–143 ms plus 55–61 ms. AC2 needs every task ≤ 50 ms. That means splitting the module evaluation (L4 + staged imports) **and** getting the frozen-tree mount task under 50 ms (L3 render slicing). If the mount/commit + context-creation task stays above 50 ms after L3, AC2 is blocked by frozen S8 code and is escalated at G2 with that task's breakdown.

**Recommended lever order (replaces RFC D5's provisional order):**
1. **L4 import trimming** (T009). The AC3/AC5-dominant candidate; it also cuts bytes (AC4).
2. **L3 split init** (T010), extended with **staged module evaluation**: `import()` the curated three surface, then R3F, then the viewer, each awaited with a `yieldToMain()` between them, plus `startTransition` on mount and the click path. The AC2 lever.
3. **App-side post-first-frame work** (task 6), inside T010's seam (the app loaders/workbench). Only if the T010 attributed trace shows app code above 10 ms there.
4. **L1 idle warm** (T011), conditional as planned.
5. **L2** (T007/T008): **skip** by default (F-B2). If skipped, S6 is never touched, `approved-xploder-src.txt` stays empty, and no re-seal is needed (AC7's re-seal clause is then vacuously met).
6. **L5** (T012): **skip** (no attribution showing the overlay model ≥ 10 % of P4).
