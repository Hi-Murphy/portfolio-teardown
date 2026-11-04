# T004 - AC1 reproduction, attribution, and local baseline

Binding CI run: `41774295096`, attempt `1`; the AC1 attempt is `41774295096-1-s2`. Local runs below
are **local emulation** and do not decide an acceptance criterion.

## 1. Qualification

Qualification uses the eighteen Lighthouse summaries consumed by `eager-verdict` (gated/eager home
and gated project, two invocations of three runs each), not `perf:host`'s separate three samples.
The fixed verdict orders attempts by the D-P4 jobs-API start time: `s2` first, then `s1`; `s3` is
non-qualifying.

| Attempt | Runner | benchmarkIndex min / median / max | Qualifies | Counted |
| --- | --- | ---: | --- | --- |
| `41774295096-1-s2` | GitHub Actions 1000000860 | 1964 / 2267.75 / 2349.5 | yes | yes - AC1 deciding attempt |
| `41774295096-1-s1` | GitHub Actions 1000000869 | 2119.5 / 2290 / 2371.5 | yes | yes - AC1 corroboration only (AC3 is decided on the final product state, T012) |
| `41774295096-1-s3` | GitHub Actions 1000000863 | 2424.5 / 2496.75 / 2603.5 | no | no |

All three host records report WebGL through `swiftshader`, with renderer
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`,
image `20261026.180.1`, and Chromium `156.0.8078.4`.

## 2. Reproduction

Two-invocation values from `T004-verdict-s11.8-att41774295096-1.md`:

| Attempt | Eager TBT (ms) | Eager band [188.33, 231.00] | Gated TBT (ms) | Gated band [74.48, 94.60] | Result |
| --- | ---: | --- | ---: | --- | --- |
| `41774295096-1-s2` (binding) | 219.25 | inside | 90 | inside | REPRODUCED |
| `41774295096-1-s1` (corroborating) | 205 | inside | 87.5 | inside | REPRODUCED |

The AC1 verdict line is **REPRODUCED**.

## 3. Project gated TBT

This is informational for AC1; the AC5 band is [78.85, 91.35] ms.

| Attempt | Project gated TBT (ms) | Position |
| --- | ---: | --- |
| `41774295096-1-s2` | 88.5 | inside |
| `41774295096-1-s1` | 94.5 | above by 3.15 ms |
| `41774295096-1-s3` (non-qualifying) | 79.5 | inside |

## 4. Per-task attribution

Source: the profiled Lighthouse run per build on `/` (`T004-per-task-{gated,eager}-home-att41774295096-1-s2.md`; s1 copies under `T004-corroborating-att41774295096-1-s1/`). Frames were resolved to source by hand from the served-chunk snippets (S11.7 D-P2 method; mapping in `RFC-log-static-read.txt` §1/§4). A profiled run is **one** Lighthouse run with sampling overhead, so its TBT shares are indicative; the binding TBT values are §2's.

**Common to both builds (not the eager path):**

| Build (s2) | Simulated / observed | TBT | What it is |
|---|---|---:|---|
| gated | 178 / 44.4 ms | 128 | Turbopack `I` (module instantiate) + RSC decode: framework start-up |
| eager | 176 / 44.1 ms | 126 | the same task in the eager build (it cancels in AC3(b), counts in AC3(a)) |
| both | 62–78 / 10–20 ms | 12–28 each | pre-FCP parse / script compile (`(program)` ≈ 96–100 %) |

**Eager-only tasks on `/` (s2, binding):**

| # | Simulated / observed | TBT | Named work | Lever |
|---|---|---:|---|---|
| 8 | **160 / 32.3 ms** | **110** | **R3F scene-mount commit → `ViewScroll` mount `sync`**: `(anonymous)` at `3vwpvuyn90046.js` 48:6566 (`h<=0\|\|width<=0` guard, bounds loop) 21.3 % ← parent `()=>{f()},[t.turns,t.zoomFactor,a.height,a.width,f]` ← R3F `nK` (`commitHookEffects`). Same frame as S11.7 T006 H10 | **E2** |
| 12 | 134 / 33.5 ms | 84 | three module evaluation (`(program)` 64 %, Turbopack `I` 27 %) | E3, out of scope |
| 9–11 | 60–65 / ≈ 9 ms (loose / unmatched) | 10–15 each | R3F root configuration and small React commits | — |

**s1 (corroborating), eager-only:** task 8, **161 / 40.1 ms, TBT 111**: the **first content frame with placement merged into it**. Top frames: three `R` (`getProgramInfoLog` program setup, ← `getUniforms`) 23.1 %; placement `G` (`rectOverlapsPolygon`) 13.0 %, `Y` (`rectProjection`) 11.3 %, `O` (`projection`) 5.2 %; GC 12.7 %. That is the same shape as S11.7 T014's final-state task (s1 task 6, s3 task 8).

**Host-native named runs (s2, `trace-only --cpu 1 --names`, the AC2 mode):** the `first-content-frame` task (= `program-compile`, one task) is 33.8 / 32.2 ms. Its top functions are `getProgramInfoLog` 22 %, `(anonymous)` 13 %, GC 8 %, `render` 3 % (program setup + draw). A separate unnamed task of 39.2 / 36.9 ms (`unnamedMaxMs`) follows. The AC1 harness listed unnamed tasks only above 50 ms, so that task has no host-native attribution in this run (D-P5 fixes the listing for later runs). Local emulation (`T004-ab`, plus the orchestrator's `--cpu 4 --names` check) resolves the three tasks around the first frame as: the R3F scene-mount commit (`nK`/`nO`, 36–37 ms), then the first content frame (program setup `getProgramInfoLog`/`acquireProgram` + draw, 38–43 ms), then the **overlay placement task** (`G` 30–31 %, `Y` 7–8 %, `q`/`U` 6 %, GC 7–8 %; 36–41 ms).

**Reading:** E1's work (program setup + placement) is either one task (s1, S11.7 T014) or two adjacent tasks (s2 host-native). E2's task (the `ViewScroll` mount re-render inside the R3F commit) is a separate eager-only task in the TBT window. Both lever families target tasks that each contribute ≈ 80–111 ms of TBT.

## 5. E1 naming and trigger readings (RFC §4)

| Lever | File | Trigger | Reading at AC1 | Status |
|---|---|---|---|---|
| E1a | `overlay/place.ts` | required | placement `G`/`Y`/`O` ≈ 30 % of s1's merged task; the separate placement task (local) `G`+`Y`+`q`+`U` ≈ 50 % of 36–41 ms | **run (T006)** |
| E1b | `overlay/model.ts` | `model.ts` self time ≥ 5 % of the first-content-frame task **after E1a** | not readable before E1a | decided in T007 from T006's after-profile |
| E1c | `react/scene/Stats.tsx` | program setup ≥ 5 % of the first-content-frame task (AC1), or task > 12.5 ms observed after E1a/E1b | `getProgramInfoLog` **22 %** of the s2 host-native first-content-frame task; `R` **23.1 %** of s1's profiled task | **triggered (T008)** |
| E1d | `react/overlay/BlueprintOverlay.tsx` | after E1a–E1c: first-content-frame task still > 50 ms simulated and projected `/` eager TBT > 185 ms | not readable before E1a–E1c | decided in T009 |

## 6. E2 naming

**E2 go.** The trigger (RFC §4 #5/#6: a home task > 50 ms simulated inside FCP→TTI whose top frames include `ViewScroll`'s mount `sync`) holds on the binding attempt: s2 eager task 8, **160 ms simulated / 32.3 ms observed, TBT 110 ms** (so inside the TBT window), top frame the `ViewScroll` `[turns, zoomFactor, height, width]` layout effect under R3F `nK`. Local emulation shows the same R3F commit task (36–37 ms at `--cpu 4`) immediately before the first content frame. T011 runs E2 (both approved files, `ViewScroll.tsx` + `TeardownViewer.tsx`) after the E1 group.

## 7. AC2 baseline at host-native

Caps are frozen in `T004-ac2-caps.json`; the raw run table is in `T004-log-ac2-caps.md`.

| Attempt | Mode | Renderer r1/r2 (median) | Program r1/r2 (median) | First frame r1/r2 (median) | `unnamedMaxMs` r1/r2 | Dropped r1/r2 |
| --- | --- | --- | --- | --- | ---: | ---: |
| `s2` | `trace-only`, CPU 1 (AC2 mode) | 15.021/15.084 (15.0525) | 33.798/32.204 (33.001) | 33.798/32.204 (33.001) | 39.157/36.931 | 3/4 |
| `s2` | `recorder`, CPU 1 | 15.376/15.263 (15.3195) | 33.021/33.254 (33.1375) | 33.021/33.254 (33.1375) | 85.949/79.895 | 3/3 |
| `s2` | `trace-only`, CPU 4 | informational | informational | informational | max long task 90.706/93.739 | 10/11 |
| `s1` | `trace-only`, CPU 1 (AC2 mode) | 14.938/15.936 (15.437) | 30.156/29.941 (30.0485) | 30.156/29.941 (30.0485) | 39.084/34.626 | 3/3 |
| `s1` | `recorder`, CPU 1 | 15.127/14.626 (14.8765) | 31.406/35.316 (33.361) | 31.406/35.316 (33.361) | 73.769/82.590 | 3/3 |
| `s1` | `trace-only`, CPU 4 | informational | informational | informational | max long task 86.456/87.485 | 10/11 |

The recorder column is **excluded from AC2: harness rAF recorder**. The CPU 4 rows are informational
continuity with S11.7. On the binding `s2` trace-only runs, the named caps are 15.805125 ms,
34.651050000000005 ms, and 34.651050000000005 ms; both named durations are below their caps on both
runs. The baseline `unnamedMaxMs` remains below 50 ms, but dropped frames are 3/4 against the AC2
bound of 2.

## 8. AC5 baselines and bytes

CI home probes:

| Attempt | Mode | ready ms r1/r2 | revealed ms r1/r2 | Canvas / poster | Pass |
| --- | --- | ---: | ---: | --- | --- |
| `s2` | normal | 554.7 / 520.4 | 586.3 / 548.0 | 1 / revealed | 2/2 |
| `s2` | reduced motion | - / - | - / - | 0 / visible | 2/2 |
| `s1` | normal | 555.8 / 478.0 | 585.7 / 507.8 | 1 / revealed | 2/2 |
| `s1` | reduced motion | - / - | - / - | 0 / visible | 2/2 |

Both binding home probes are inside the 2.5 s AC5 deadline. The project gated probe is not part of
this pre-A1 workflow pass; locally at `build:eager` it fails as expected because both routes are
eager (`T004-ab/probe-project-gated.txt`).

Bytes, using `cmp` against T001's frozen manifests:

| Attempt | Build | `cmp` | Canonical comparison |
| --- | --- | ---: | --- |
| `s2` | eager | 0 | identical, 22 files, 1,581,749 B |
| `s2` | gated | 1 | same 22 files and bytes/hashes; only the three `<build-id>` entries are ordered differently |
| `s1` | eager | 0 | identical, 22 files, 1,581,749 B |
| `s1` | gated | 1 | same 22 files and bytes/hashes; only the three `<build-id>` entries are ordered differently |

The local base block also produced 4/4 eager home parity shots at 0 px and 8/8 gated shots at 0 px.
The gated site probe passed its two draw checks at exactly 2 draws and all seven hero checks. The
T001 gzip totals are 459,158 B eager and 459,309 B gated; the local block reports zero byte delta
for both pairs and `RESULT: PASS` for each budget.

## 9. Local-emulation drift and M

The target is the binding `s2` two-invocation eager TBT of 219.25 ms (invocation medians 215.5 and
223.0). `M = 18.5` missed by 26.43% mean absolute error. The single refinement pass used the
observed local response: 14.6 was the proportional first estimate, and the two measured points
selected 16.4 for the retained block.

| CPU multiplier | Home eager invocation medians r1 / r2 | Mean (ms) | Mean absolute delta vs `s2` | Use |
| ---: | ---: | ---: | ---: | --- |
| 18.5 | 269.0 / 285.5 | 277.25 | 26.43% | initial check |
| 14.6 | 138.5 / 186.0 | 162.25 | 26.16% | refinement estimate |
| 16.4 | 220.0 / 223.0 | 221.5 | 1.04% | chosen M; `T004-ab/` |

The retained local block ran at **M = 16.4**. `ab-table.mjs` is exercised on the retained baseline
in `T004-ab/ab-self.md`; it prints the first-content-frame self-time split and any unnamed task of at
least 16.7 ms starting within 120 ms after it. This host-native run has no such unnamed task; its
largest unnamed task is 9.003 ms.

## 10. Confirmed lever plan (orchestrator)

1. **T005 A1** (hero-only flag): unchanged, byte-neutral.
2. **T006 E1a** (`place.ts`, required): output-identical lazy first-fit + prepared obstacles + oracle. Targets the placement work, whether merged into the first-content-frame task (s1) or in its own task (s2 host-native, `unnamedMaxMs` 37–39 ms).
3. **T007 E1b**: conditional on T006's after-profile.
4. **T008 E1c** (`Stats.tsx`, `compileAsync` before the first draw): **trigger met at AC1** (program setup 22–23 %).
5. **T009 E1d**: conditional on T006–T008; expected skip if E1a/E1c land.
6. **T011 E2**: **go** (§6), after the E1 STOP.

**Projection (estimate, binding s2 scale, not a measurement):** home eager is 219.25 ms. E1a removes most of the placement task (≈ −60 to −100 ms TBT, depending on whether it is merged or separate), E1c moves program setup out of the first-content-frame task (≈ −15 to −30 ms), and E2 removes the nested re-render from the 110 ms commit task (≈ −30 to −60 ms). Each lever is kept only on its own A/B (keep rule).

**Risks surfaced by AC1 (escalated now, not reworded):**

- **AC2 dropped frames:** 3 / 4 at baseline in the named mode (bound ≤ 2). They fall at load + 398–432 ms, immediately after the first content frame (s2 r1), i.e. across the E1/E2 tasks.
- **AC2 renderer-constructor cap** = 15.805 ms (s2 median 15.05 × 1.05). That task is untouched by every lever, and its run-to-run spread already reaches the cap: s1 r2 15.94 ms, s3 r2 19.2 ms. A miss on that cap would be host noise, reported individually, never rerun until green.
- **AC5 project gated band** [78.85, 91.35] ms: on the **unmodified** product, s1 measured 94.5 ms (outside), s2 88.5 ms. This is host drift on an unchanged code path; a verdict-attempt miss is escalated with the index log.

## Check output

Transcribed from `<local-path>/s118-checks/t004.txt` after the exact T004 Check block:

```text
PRODUCT-IS-BASE
CAPS-OK {"renderer-constructor":15.805125,"program-compile":34.651050000000005,"first-content-frame":34.651050000000005}
ARTIFACTS-OK
FROZEN-OK
BRIEF-HISTORY-OK
G1-LIST-OK
XPLODER-SRC-OK
XPLODER-TEST-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
BASELINE-FIRST-OK
APP-TOUCH-OK
DEV-ROUTES-OK
CI-JOBS-OK
FLAG-DEFAULT-OK
VERSIONS-OK
BUDGETS-OK
GITLEAKS-OK
```
