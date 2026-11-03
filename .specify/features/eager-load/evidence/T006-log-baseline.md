# T006 — AC1 baseline on a slow-class attempt

Binding host: `41734234159-1-s3`. Local runs in §7 are labelled **local emulation** and do not
decide an acceptance criterion.

## 1. Qualification

Qualification uses every Lighthouse run in the shard, not `perf:host`'s own samples. The slow-class
band is `benchmarkIndex` in [1900, 2600]. Each row covers 24 runs: gated/eager × home/project × 2
invocations × 3 Lighthouse runs.

| Shard attempt | Runner | benchmarkIndex min | median | max | Qualifies | Counted |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `41734234159-1-s1` | GitHub Actions 1000000761 | 3232.5 | 3333 | 3458 | no | no |
| `41734234159-1-s2` | GitHub Actions 1000000765 | 3414.5 | 3785.75 | 4097.5 | no | no |
| `41734234159-1-s3` | GitHub Actions 1000000760 | 2114.5 | 2295.75 | 2351.5 | yes | yes |

Only `s3` is in the slow-class band. `s1` and `s2` are retained as non-qualifying artifacts with the
`-att41734234159-1-s1`/`-s2` suffix; their summaries were not used for AC1 or the drift target.
`perf:host`'s own three samples for `s3` are 2235 / 2586 / 2638.5; per the dispatch, qualification
uses the 24 Lighthouse runs above instead of those host samples.

## 2. Runner GL backend

From `T006-host-meta-att41734234159-1-s3.json`:

| Field | Value |
| --- | --- |
| WebGL available | true |
| Backend | `swiftshader` |
| Renderer | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` |
| Vendor | `Google Inc. (Google)` |
| Image | `20261026.180.1` |
| Chromium | `156.0.8078.4` |

The slow-class runner has WebGL and renders through SwiftShader; this is not an absent-WebGL STOP.

## 3. Gated vs eager Lighthouse

Two-invocation medians from `T006-verdict-s11.7.md` and `T006-verdict-default.md`. Each invocation is
a Lighthouse median of 3 runs.

| Route | Build | Performance | TBT (ms) | LCP (ms) | CLS |
| --- | --- | ---: | ---: | ---: | ---: |
| home | gated | 1 | 82.5 | 906.2187 | 0 |
| home | eager | 0.965 | 219.75 | 909.7529 | 0 |
| home | eager − gated | -0.035 | +137.25 | +3.5342 | 0 |
| project | gated | 1 | 86 | 906.5403 | 0 |
| project | eager | 0.91 | 374.1292 | 909.6221 | 0 |
| project | eager − gated | -0.09 | +288.1292 | +3.0818 | 0 |

The AC3 rule fails on both routes in this attempt: home has `a:false, b:false`; project has
`a:false, b:false`.

## 4. Per-task attribution

Source: the profiled Lighthouse run per build × route on `41734234159-1-s3` (`T006-per-task-*.md`, `source: lighthouse-profile`). Function names come from each hot frame's served-chunk snippet and its parent/grandparent frames (tasks.md D-P2); the orchestrator resolved them to source by hand. A profiled run is **one** Lighthouse run with sampling overhead, so its TBT (home 350.5 / project 594 ms) is higher than the verdict medians in §3 (219.75 / 374.13 ms). Shares below are of the profiled run.

**Chunk map** (from the snippets):

| Chunk | Contents |
|---|---|
| `1kgrt2f4mrm63.js` | react-dom (scheduler, `renderWithHooks`, commit) |
| `10kujx8nsd3ck.js` | Next app-router runtime + RSC payload decoding |
| `turbopack-3-ry682tkyiqk.js` | Turbopack runtime (module instantiate `I`) |
| `3vnmkhfgdnq2d.js` | three |
| `1d5kkip1hlg-o.js` | R3F |
| `3vwpvuyn90046.js` | xploder (react viewer, overlay, lettering, scene) |

### 4.1 Tasks common to both builds (not the eager path)

| Route | Simulated / observed | TBT | What it is |
|---|---|---:|---|
| both | 136–158 / 34–39 ms, `(program)` 97 % | 86–108 | HTML parse / script compile before FCP (Unattributable) |
| both | 173–190 / 43–47 ms | 123–140 | `10kujx8nsd3ck.js` → Turbopack `I` (module instantiate) + RSC row decoding: **hydration / framework start-up**. Equal in gated (177 / 173 ms), so it cancels in AC3(b) |

No app-component hydration task above 12.5 ms observed appears in either build (H4 for app code: **not supported**).

### 4.2 Eager-only tasks: the ≈ 200 ms react-dom tasks named

| # | Route | Simulated / observed | TBT | URL | Named work (top self time → stack) | Hypothesis | Owner |
|---|---|---|---:|---|---|---|---|
| P13 | project | **188 / 47.0 ms** | 138 | react-dom | **First content frame + overlay label layout.** three `getUniforms` → `R` (`getProgramInfoLog` / `getShaderInfoLog`, program setup on the first `gl.render`); xploder label placement `q` → `G`/`Y`/`N`/`O` (polygon-overlap tests for lettering placements, `excludeObstacles`), the overlay model `({frame, layout, project, viewport, offsetY, target, look})`; GC 8 % | H2 (React/frame work) + GL program setup | engine (S6 overlay / lettering, S4 Stats frame) |
| H10 | home | **161 / 32.0 ms** | 111 | react-dom | **R3F commit → xploder scene layout effect:** R3F `commitHookEffects` (`nK`) → an xploder `useLayoutEffect` keyed on `[turns, zoomFactor, height, width]` that fits the camera to the layout (`h<=0||width<=0` guard, bounds loop) | H2 (scene mount) | engine (S5/S6 camera rig / view scroll) |
| P8 | project | 156 / 39.0 ms | 106 | xploder chunk | **xploder chunk compile + first viewer render:** `(program)` 71 % (V8 compile of the 3D chunk), then the scene component `({layout, project, palette, tokens, look, bridgeRef, …})` via `renderWithHooks` | H3 (module evaluation) | app (staging) |
| P14 / H11 | both | 135 / 33.7–33.8 ms | 85 each | three | **three module evaluation:** `(program)` 53–61 % (compile) + Turbopack `I` (instantiate) | H3 | app (staging) |
| P10 | project | 85 / 21.2 ms | 35 | react-dom | `TeardownViewer` first render: `hasWebgl()` (4.2 ms; the probe is cheap on the runner's SwiftShader/Vulkan, unlike local SwiftShader in T002), R3F `useMeasure` scroll-container walk (`getComputedStyle`), `renderWithHooks` | H2 / H1 (small) | engine (S8) + app (what is rendered) |
| — | both | 53–72 / 9–11 ms (loose / unmatched) | 3–22 each | R3F, react-dom | R3F root configuration / scene mount and small React commits. Not resolved by function (loose matches, no samples above 5 %) | — | mixed |

**The "≈ 200 ms react-dom tasks" of S11.6 T011 are P13 (project) and H10 (home).** Both are engine-owned: the first content frame with the overlay/lettering layout, and the scene's camera-fit layout effect. App code reaches them only through *when* they run, not through *their size*.

**H1 on the runner:** WebGL is SwiftShader on Vulkan, and context creation is cheap there (`hasWebgl()` 4.2 ms; the renderer constructor is not among the > 50 ms simulated tasks). The 634 ms `hasWebgl()` task in T002 was an artefact of local SwiftShader on macOS, which §7 confirms as unusable for emulation.

## 5. Lantern check

Copied from the eager per-task Markdown. The profiled invocation is informational and is excluded
from the Lighthouse medians in §3.

### home

Simulated TBT: 350.5 ms
Observed Σ max(0, 4 × duration − 50): 672.9 ms
Difference: 322.4 ms (92.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 758.3 ms | 26.4 ms | -731.8 ms | 110.0 ms | 27.6 ms | 110.3 ms |
| http://127.0.0.1:PORT/ | 869.3 ms | 71.7 ms | -797.6 ms | 71.0 ms | 8.9 ms | 35.8 ms |
| Unattributable | 977.3 ms | 481.7 ms | -495.6 ms | 62.0 ms | 15.5 ms | 62.2 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2225.6 ms | 137.5 ms | -2088.1 ms | 190.0 ms | 47.4 ms | 189.8 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2431.6 ms | 397.3 ms | -2034.3 ms | 53.0 ms | 9.5 ms | 38.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3480.9 ms | 368.8 ms | -3112.0 ms | 66.0 ms | 9.3 ms | 37.4 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3670.9 ms | 536.0 ms | -3134.8 ms | 161.0 ms | 32.0 ms | 128.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4040.1 ms | 289.4 ms | -3750.8 ms | 135.0 ms | 33.8 ms | 135.2 ms |

### project

Simulated TBT: 594.0 ms
Observed Σ max(0, 4 × duration − 50): 979.9 ms
Difference: 385.9 ms (65.0%)

| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unattributable | 754.5 ms | 18.2 ms | -736.3 ms | 64.0 ms | 15.9 ms | 63.6 ms |
| Unattributable | 818.5 ms | 34.1 ms | -784.4 ms | 158.0 ms | 39.4 ms | 157.7 ms |
| Unattributable | 1098.5 ms | 537.0 ms | -561.6 ms | 63.0 ms | 15.9 ms | 63.5 ms |
| http://127.0.0.1:PORT/_next/static/chunks/10kujx8nsd3ck.js | 2331.1 ms | 157.1 ms | -2174.0 ms | 174.0 ms | 43.5 ms | 173.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 2527.1 ms | 430.8 ms | -2096.3 ms | 58.0 ms | 14.5 ms | 58.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vwpvuyn90046.js | 3431.6 ms | 679.5 ms | -2752.1 ms | 156.0 ms | 39.0 ms | 156.1 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1d5kkip1hlg-o.js | 3868.6 ms | 525.8 ms | -3342.8 ms | 62.0 ms | 11.2 ms | 44.6 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 3930.6 ms | 450.9 ms | -3479.7 ms | 85.0 ms | 21.2 ms | 84.9 ms |
| http://127.0.0.1:PORT/_next/static/chunks/1kgrt2f4mrm63.js | 4152.6 ms | 632.4 ms | -3520.1 ms | 188.0 ms | 47.0 ms | 188.0 ms |
| http://127.0.0.1:PORT/_next/static/chunks/3vnmkhfgdnq2d.js | 4340.6 ms | 304.4 ms | -4036.1 ms | 135.0 ms | 33.7 ms | 134.7 ms |

## 6. AC2, AC5, and bytes at baseline

### AC2

Load window is `[load, load + 5 s]`, eager build, CDP CPU 4×. `tasks>50` counts long tasks with
duration greater than 50 ms.

| Route | Mode | Run | maxLongTaskMs | tasks>50 | droppedFrames | readyMs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| home | trace-only | 1 | 93.019 | 6 | 11 | 1493.2 |
| home | trace-only | 2 | 103.698 | 6 | 11 | 1510.9 |
| home | recorder | 1 | 88.265 | 6 | 17 | 1496 |
| home | recorder | 2 | 96.199 | 6 | 17 | 1453 |
| project | trace-only | 1 | 109.554 | 8 | 13 | 1569.8 |
| project | trace-only | 2 | 116.758 | 8 | 13 | 1624.9 |
| project | recorder | 1 | 120.107 | 8 | 18 | 1565.1 |
| project | recorder | 2 | 115.018 | 8 | 18 | 1620.8 |

`recorder` is **excluded from AC2: harness rAF recorder**. The gate uses `trace-only`; both routes
fail `maxLongTaskMs ≤ 50` and `droppedFrames ≤ 2` at the eager baseline.

### AC5

`readyAtMs` and `revealed` are from the same deadline observation; the deadline is 2500 ms for normal
motion and the reduced-motion observation window is load + 5000 ms. `—` means absent.

| Route | Motion | Run | loadAtMs | readyAtMs | revealed t (ms) | trusted events | Pass |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| home | normal | 1 | 207 | 551.9 | 581.6 | 0 | true |
| home | normal | 2 | 201.2 | 515.8 | 544.4 | 0 | true |
| home | reduce | 1 | 223.2 | — | — | 0 | true |
| home | reduce | 2 | 174.3 | — | — | 0 | true |
| project | normal | 1 | 215.4 | 591 | 627.4 | 0 | true |
| project | normal | 2 | 186.8 | 522.8 | 561 | 0 | true |
| project | reduce | 1 | 219.2 | 579 | 607.1 | 0 | false |
| project | reduce | 2 | 174.7 | 546.3 | 578.1 | 0 | false |

**F4 is confirmed:** the eager project route ignores reduced motion in 2/2 runs (canvas present,
`ready` set, poster hidden, live state revealed). Home reduced motion passes in 2/2 runs with no
canvas and no ready attribute.

### Bytes

The CI manifests are byte-identical to the T001 local manifests (`cmp` returns 0 for both). The
`bundle-scopes.mjs --budget` comparison against the T001 local baseline therefore reports zero deltas
for every scope.

| Build | Scope | Files | Raw | Gzip |
| --- | --- | ---: | ---: | ---: |
| gated | home initial | 9 | 583343 | 180606 |
| gated | project initial | 9 | 581795 | 180046 |
| gated | total | 22 | 1581847 | 459233 |
| gated | non-initial 3D | 12 | 996260 | 277548 |
| eager | home initial | 9 | 582918 | 180465 |
| eager | project initial | 9 | 581604 | 179960 |
| eager | total | 22 | 1581231 | 459006 |
| eager | non-initial 3D | 12 | 996260 | 277548 |

Budget result: `PASS` for gated and eager; all deltas are 0 B/0%.

## 7. Local-emulation drift and chosen M

Target: the qualifying attempt's eager two-invocation TBT, home **219.75 ms** and project
**374.1292 ms**. Each row is two invocations of a Lighthouse median of 3 on the base eager build.
`a`, `b`, and `c` are the requested variants; `refined` is the single allowed multiplier refinement.

| Variant | GL flag | M | Home TBT (ms) | Project TBT (ms) | Home Δ | Project Δ | Mean absolute Δ |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| a | `swiftshader` | 7.6 | 5066.647 | 5899.0829 | +2205.64% | +1476.75% | 1841.20% |
| b | none | 7.6 | 61.75 | 83.0 | -71.90% | -77.82% | 74.86% |
| c | none | 4 | 1.25 | 2.5 | -99.43% | -99.33% | 99.38% |
| refined (chosen) | none | 18.5 | 278.0216 | 338.317 | +26.52% | -9.57% | 18.04% |

Invocation spreads: refined home 44.0433 ms, refined project 2.366 ms. The chosen local emulation is
**no `--gl` (native GL) with `--cpu-multiplier 18.5`**. `GLFLAG=` and `M=18.5` are the defaults in
`lever-block.sh`; both are environment-overridable. The local A/B raw outputs are in `T006-ab/`.

## 8. Confirmed lever order, pre-skips, projection and decisions (orchestrator)

### 8.1 Order

1. **L0 (T007): kept as planned.** F4 is confirmed (project reduce 0/2). It is a correctness fix for AC5.
2. **L3a (T010 → moved up, runs second): staged module evaluation.** Targets P8 (xploder chunk, 106 ms TBT) and P14/H11 (three, 85 ms TBT on each route).
   - **Scope refinement:** besides splitting `three-surface` into sub-stages, the stage list also stages the **xploder** graph app-side: `xploder/motion` / `xploder/theme` / `xploder/layout` / `xploder` core, then `xploder/react`. Each goes through a separate `import()` plus a yield, so the viewer chunk is compiled and evaluated in smaller tasks.
   - This needs `apps/web/build/xploder-stage-*.ts` (≤ 2 files) in `app-touch.txt`, with a §9 note.
3. **L1 (T008, runs third): render-lane hygiene.** The evidence for it is weaker than the RFC expected. No reveal re-render task above 50 ms simulated is resolved; the candidates are the unmatched 60–65 ms react-dom tasks. It stays because it is cheap and low-risk, but it is expected to be small (≤ 15–35 ms TBT, **estimate**).
4. **L2 (T009): conditional, expected skip.** No separate portal-commit task appears above 50 ms simulated. The dock/explore render sits inside P10/P13's neighbours.
5. **L3b (prefetch): pre-skipped.** It has no TBT effect (Lantern simulates the network separately), and AC5 has ≈ 1.9 s of headroom (revealed ≤ 627 ms vs 2,500 ms).
6. **L4 (T011): pre-skipped.**
   - In real time, hydration (137–157 ms observed) and the eager boot (≥ 289 ms observed) are already in separate tasks.
   - Lantern collapses the gap regardless (§5: start gaps −2.0 to −4.0 s; observed × 4 = simulated within 1 ms on exact matches).
   - So F1 is confirmed for durations and ordering. The §5 sum check is higher than TBT because it also counts tasks outside the FCP→TTI window.
7. **L5 (T012): pre-skipped.** No app-component hydration task appears (§4.1).

### 8.2 Projection (**estimate**, scaled from the profiled run to the verdict medians)

| Route | Eager TBT now | App-side reachable (L3a + L1) | Projected eager TBT | AC3(a) ≤ 200 + perf ≥ 0.95 | AC3(b) eager − gated ≤ +50 |
|---|---:|---:|---:|---|---|
| home | 219.75 | ≈ 60–65 (85 + ≤ 15 of 350.5 profiled) | ≈ 155–160 | **likely pass** | fail (H10 alone ≈ +70 at median scale) |
| project | 374.13 | ≈ 130–135 (106 + 85 + ≤ 20 of 594) | ≈ 240 | **likely fail** | fail |

The binding remainder after app-side work is P13 (project) and H10 (home), both engine-owned.

### 8.3 AC2 is blocked (Hard Rule 2: escalated here, with evidence)

- At the AC2 harness condition (CDP 4× on the slow host), the baseline max task is 93–117 ms, with 6–8 tasks above 50 ms and 11–13 dropped frames (`trace-only`).
- "No task > 50 ms" at 4× means every task must be ≤ 12.5 ms native on the slow host. P13 is 47 ms native: it combines the first content frame (which S11.6 AC4 requires to be one frame) with three's program setup. H10 is 32 ms native.
- So AC2 cannot be met app-side. It is the same structural limit as S11.6's dropped-frame half, now on the slow host.
- The AC is **not reworded**. It is recorded as blocked unless an engine exception changes P13/H10, and even then three's single-call program setup inside the first frame may stay above 12.5 ms native.

### 8.4 Engine-exception request (Hard Rule 6), for Murphy's decision

- **E1 (S6/S7 overlay + lettering, project P13):** move the lettering label-placement pass out of the first-content-frame task, into the next task before the reveal, so that the first frame only draws. **Risk:** the labels in the first visible frame (post-eager parity, reveal sequence). It would need a re-seal of the S6/S7 manifests.
- **E2 (S5/S6 camera fit, home H10):** split the camera-fit layout effect from the R3F scene-mount commit, by yielding before the fit. **Risk:** the first-frame framing (view offset), as in S11.6 F4.
- **Expected effect if both land (estimate):** home −70, project −90 ms TBT. That would put project at ≈ 150 ms, i.e. AC3(a) likely on both routes. AC2 would still be at risk from three's program setup.
- **Orchestrator recommendation: decline for now.** The brief puts engine work after app-side work is exhausted. Run L0 → L3a → L1 (→ L2 only if evidence appears), measure at G2, and re-ask E1/E2 at G2 with the measured remainder. That still fits the one attempt cycle, because the verdict (T014) runs only once, after G2.

## Check output

```text
PRODUCT-IS-BASE
ARTIFACTS-OK
OK FROZEN
OK BRIEF-HISTORY
OK XPLODER-EMPTY
OK APP-TOUCH
OK BASELINE-FIRST
OK DEV-ROUTES
OK CI-JOBS
OK FLAG-DEFAULT
OK VERSIONS
OK BUDGETS
OK GITLEAKS
T006-OK
```
