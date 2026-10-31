# Tasks: S06 Blueprint Theme Applied

**Input:** `rfc.md` (approved, §9), `spec.md`, `plan.md` in `.specify/features/blueprint-theme/`
**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`; sandbox off for browser tasks; writes limited to the task worktree and `/tmp/s06-checks`). **Escalation (RFC D13, §9.2):** tier 1.5 (Sol/Gemini via OpenRouter) is **DORMANT** (`OPENROUTER_API_KEY` unset), skipped and recorded per task. If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes the task personally on Murphy's go. Each report states the finishing tier and any skip.
**Usage pacing:** each phase group starts in a fresh 5h window. Before each task the orchestrator checks usage (Murphy states "5h: N%" at gates). At ≥ 85% of the 5h window, no new task starts: finish and commit the current task, tick the ledger, report, STOP.
**Perf doctrine:** dropped-frames style only. **No task check may compare fps against a literal threshold**; liveness is the harness band verdict, and raw fps is information.
**Reachability:** wherever zoom is involved, S5's scroll reachability must stay green, with top + bottom max-zoom screenshots (T013).

## Ledger (resume point — update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T001-log-guard.txt | b291309 |
| T002 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T002-log-fills.txt | e042085 |
| T003 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T003-log-product-gap.txt | f3e9da0 |
| T004 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T004-log-overlay-geometry.txt | c88c3d2 |
| T005 | ☑ (look-ahead deviation accepted, see log) | 1 (Flash, sandbox on) + orchestrator review fix (search cap 100k → 2k, measured) | evidence/T005-log-placement.txt | 53cbeb1 |
| T006 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T006-log-trace.txt | ad7244a |
| T007 | ☑ (+ T007a fix) | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T007-log-material.txt | 14bc3fa |
| T007a | ☑ (found by the pre-T009 browser check: tone mapping + StrictMode double-patch) | ⚑ orchestrator | evidence/T007a-{log-material-fix.txt,screenshot-desktop-*.png} | 14d15e7 |
| T008 | ☑ (Scene.tsx additive conflict with T007 resolved) | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T008-log-projector.txt | cddae21 |
| T009 | ☑ (+ label background fix) | 1 (Flash, sandbox on) + orchestrator screenshot step (sandbox EPERM) and labelFillRole fix | evidence/T009-{log-overlay.txt,screenshot-*.png,meta.json} | 99a946b |
| T010 | ☑ | 1 (Flash, sandbox on) + orchestrator browser step (sandbox EPERM) | evidence/T010-{log-trace.txt,screenshot-*.png,meta.json} | 748b96e |
| T011 | ☑ + ⚑ pushed, draft PR | 1 (Flash, sandbox on); build + full check re-run by orchestrator | evidence/T011-log-scanners.txt, G2-log-combined.txt | 73da9a5 |
| T011a | ☑ (G2 feedback: imploded title block) | 1 (Flash, sandbox on) + orchestrator browser step | evidence/T011a-{log-titleblock.txt,screenshot-*.png} | f365b6e |
| T011b | ☑ (G2 feedback: blink 8 → 0 frames; no stuck state) | 1 (Flash, sandbox on) + orchestrator review fix (pending settle) | evidence/T011b-log-blink.txt | d8a3cfc |
| T012 | ☑ | 1 (Flash, sandbox on); browser path validated in T013 | evidence/T012-log-probe-tool.txt | a28a22a |
| T014a | ☑ (found by T014: 680/19 836 → 0) | 1 (Flash, sandbox on) | evidence/T014a-log-placement-sweep.txt | 3a8a2f9 |
| T013 | ☑ 104/104 | 1 (Flash, sandbox off; driver-only fixes reviewed); 1st dispatch lost to an orchestrator cwd error (not an executor failure) | evidence/T013-{engine-probe.json,log-probe.txt,screenshot-*.png} | d0ffdc8 |
| T014 | ☑ 16 shots (round 2) | 1 (Flash, sandbox off) | evidence/T014-{log-matrix.txt,screenshot-*.png,meta-*.json} | 4e68a4d |
| T015 | ☑ 0 dropped / 5.05 s, 2 calls | 1 (Flash, sandbox off, alone) | evidence/T015-{fps.json,log-fps.txt,screenshot-desktop.png,meta.json} | 635b0c2 |
| T016 | ☐ | | | |

Resume prompt for a fresh session: _"Read `.specify/KICKOFF-S06.md` and `.specify/features/blueprint-theme/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."_

## Format & rules (apply to every task)

- `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task. Stories: **US1** visitor sees a blueprint · **US2** visitor reads the drawing · **US3** visitor follows a request · **US4** every part is visible by default · **US5** reviewer trusts it.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:** each task runs in a fresh worktree from `task/s06-blueprint-theme`, on branch `task/s06-t0NN-<slug>`. After the check passes, merge back into the slice branch without squashing. Commit message: `S06/T0NN: <title>`. Remove the worktree only after the merge.
- **Orchestrator-only steps** (marked ⚑): `git push`, opening/updating the PR, merging the PR (only after Murphy says "merge"). Flash prepares; the orchestrator executes.
- **Guards (every task):** all must print OK (plan.md "Guards"):
  ```sh
  git diff --quiet bb6a514 -- .specify/slices .specify/KICKOFF-S06.md && echo FROZEN-OK
  git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
  git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK   # from T001 on
  test -z "$(git log --oneline bb6a514..HEAD -- .specify/slices .specify/KICKOFF-S06.md)" && echo BRIEF-HISTORY-OK
  ```
- **Every check also runs:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Never:** add dependencies · add a package export or change `TeardownViewerProps` · edit a frozen file (S2/S4 or S5 lists in plan.md "Guards") or an existing S2/S4/S5 test · edit `LAYOUT_DEFAULTS` · replace the `MeshLambertMaterial` class · import `@react-three/drei`, GSAP, `three/examples`, `three/addons`, `three-stdlib` or `camera-controls` · load a texture or image asset in the renderer · add a WebGL object (mesh, line, sprite) beyond the 2 `InstancedMesh`es · put text into WebGL · write motion literals (durations, easings, staggers, timer delays) outside `packages/xploder/src/motion/` · write hex/`rgb()`/`hsl()`/`0x` colours outside `packages/xploder/src/theme/` (GLSL included) · put engine logic or `three`/`@react-three/*` imports in `apps/web` · deep-import `xploder/src` from the app · add hover/tap behaviour or a panel · compare fps to a literal number in any tool or check · add a threshold override to any perf CLI · set `PERF_FIXTURES` on Vercel · put private hostnames, IPs or tokens anywhere (`127.0.0.1` is fine) · run `specify init` · use bare `git stash`.
- **Evidence** goes to `.specify/features/blueprint-theme/evidence/T0NN-*.{txt,png,json}` (naming per `.specify/EVIDENCE.md` §4). Throwaway scripts live in `/tmp/s06-checks/`. Run `mkdir -p /tmp/s06-checks .specify/features/blueprint-theme/evidence` first, and run every check under `set -euo pipefail`.
- **Dev server** (T009–T011): Next 16 dev blocks `/_next` dev resources for the `127.0.0.1` origin, so dev-server checks use `http://localhost:3000` (found in T007a).
- **Local fixture server** (T011–T015): `pnpm build:fixtures && (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s06-checks/serve.pid)`, then `until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done`; stop with `kill "$(cat /tmp/s06-checks/serve.pid)"`.

---

## Phase G1: Pure core (US1–US5) → STOP for Murphy after T006

### T001 [US5] S5 frozen manifest + look tokens

- **Seam:** S5 surface ↔ CI (second hash manifest) · palette roles ↔ `src/look/tokens.ts`.
- **Files:**
  - `packages/xploder/test/frozen-surface.s5.paths`: the S5 list from plan.md "Guards", one path per line.
  - `packages/xploder/test/frozen-surface.generate-s5.sh`: a copy of `frozen-surface.generate.sh` with `base=f31600e`, the S5 paths/manifest files, and the note `"S05 seal (S06 RFC D1). A later slice that changes a listed file regenerates this manifest in the same diff and states why."`. Run it to produce `frozen-surface.s5.manifest.json`.
  - `packages/xploder/test/frozen-surface.test.ts`: **append** a `describe('frozen S5 surface', …)` that checks every hash of the S5 manifest against the working copy, asserts `base === 'f31600e'`, ≥ 25 entries, and the presence of `src/interaction/tour.ts`, `src/react/scene/Emphasis.tsx`, `src/react/scene/ViewScroll.tsx`, `test/tour.test.ts`. The existing S2/S4 describe is not modified. (`frozen-surface.test.ts` is excluded from both manifests.)
  - `packages/xploder/src/look/tokens.ts` per plan.md "Look tokens".
  - `packages/xploder/test/look-tokens.test.ts`: every role ref resolves to a hex string in `blueprint.light` and `blueprint.dark`; `0 < fill.wash < fill.highlightWash < 1`; `0 ≤ faces.top < faces.left < faces.right < 1`; `0 < layer.wash < 1`; px values > 0; `annotation.fontPx ≥ 12`; no kind maps to `accent` (the highlight role).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s06-checks .specify/features/blueprint-theme/evidence
  bash packages/xploder/test/frozen-surface.generate-s5.sh | tee /tmp/s06-checks/t001.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts test/look-tokens.test.ts 2>&1 | tee -a /tmp/s06-checks/t001.txt
  printf ' ' >> packages/xploder/src/interaction/tour.ts
  if pnpm --filter xploder exec vitest run test/frozen-surface.test.ts >/tmp/s06-checks/t001-neg.txt 2>&1; then echo 'NEG-CONTROL-FAILED'; exit 1; fi
  git checkout -- packages/xploder/src/interaction/tour.ts; echo 'S5 negative control: red as expected' | tee -a /tmp/s06-checks/t001.txt
  git diff --stat --exit-code f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) | tee -a /tmp/s06-checks/t001.txt && echo S5-DIFF-EMPTY | tee -a /tmp/s06-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (generator output, test log, negative control, empty S5 diff, manifest entry count)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the negative control shows the S5 guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed with the S5 list from RFC §6 Q10).

### T002 [US1] Fills, parity table, emphasis decomposition

- **Seam:** `Palette` ↔ `src/look/fills.ts` (pure colour maths shared with the GLSL in T007).
- **Files:** `packages/xploder/src/look/fills.ts` per plan.md "Fills and emphasis decomposition"; `packages/xploder/test/look-fills.test.ts`:
  - `mixSrgb` end points (t = 0 → a, t = 1 → b) and a midpoint value computed by hand;
  - `kindFill` for every kind in both palettes equals `mixSrgb(surface, role, 0.18)`;
  - **parity table, both palettes:** `ink`, `label`, `steel` vs `paper` ≥ 4.5 : 1; `lineMuted` and `accent` vs `paper` ≥ 3 : 1; `line` vs every kind fill ≥ 3 : 1; highlight fill vs every kind fill ΔE ≥ 10; smallest pairwise kind ΔE ≥ 3. The test prints the table (it goes into the evidence log);
  - **decomposition round trip:** for 200 seeded random `(t, p) ∈ [0, 1]²`, both palettes, base `line` with S5's component composition (`mix(mix(line, accent, t), paper, p)`, linear) and base `lineMuted` with t = 0: `ratio = E ⊘ base`, then `decomposeEmphasis` recovers `t` within 1e-4 (when `p < 0.99`) and `p` within 1e-4. Neutral ratio `(1, 1, 1)` → exactly `{ t: 0, p: 0 }`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/look-fills.test.ts --reporter verbose 2>&1 | tee /tmp/s06-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-fills.txt` (incl. the printed parity table for light and dark)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The parity table numbers match RFC §1 (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T003 [US4] Product `explodedGap` default + occlusion test

- **Seam:** `src/look/product.ts` ↔ S4 `layoutProject` ↔ S5 pure picker (AC5).
- **Files:** `packages/xploder/src/look/product.ts` per plan.md; `packages/xploder/test/product-gap.test.ts`:
  - `VIEWER_LAYOUT_DEFAULTS.explodedGap === 2`; `resolveViewerLayoutOptions()` → `{ explodedGap: 2 }`; `resolveViewerLayoutOptions({ explodedGap: 1.1 })` → 1.1; `LAYOUT_DEFAULTS.explodedGap === 1.1` (the S4 primitive is untouched);
  - **occlusion:** for fixtures A and C laid out with `resolveViewerLayoutOptions()`, exploded, every component's visible fraction (orthographic ray grid, step 0.02 world units, `pick` vs `rayBoxDistance` alone, the method of `evidence/RFC-log-occlusion-gap-sweep.txt`) is **≥ 0.5 at 45° and at 135°, 225°, 315°**; the test prints the per-component fractions at 45°;
  - the **source assertion** for `TeardownViewer.tsx` calling `resolveViewerLayoutOptions(` is added in T007 (where the call is introduced), not here.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/product-gap.test.ts --reporter verbose 2>&1 | tee /tmp/s06-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-product-gap.txt` (incl. the printed fractions)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the visual proof is T014).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: 2.0 per RFC D9).

### T004 [P] [US2] Projection twin, part numbering, dimension geometry

- **Seam:** `ProjectLayout` + view ↔ `src/overlay/{project,parts,dimension}.ts` (pure).
- **Files:** per plan.md "Projection", "Parts, dimensions, labels"; tests `overlay-project.test.ts` (origin maps to the viewport centre; the S4 basis vectors; a known corner value by hand; hull is convex and contains every projected corner; content-space y independent of offset), `overlay-parts.test.ts` (A numbering `1.1 … 4.1`, C `3.5`, layer texts, long/short part texts, the box model of R1 for a known string), `overlay-dimension.test.ts` (stack rail x is left of every layer corner; one tick per layer; ticks ordered top → bottom; footprint offset points away from the bottom plate's centroid; label anchors at the midpoints).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/overlay-project.test.ts test/overlay-parts.test.ts test/overlay-dimension.test.ts 2>&1 | tee /tmp/s06-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-overlay-geometry.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: label texts `n NAME`, `n.m Name`, `{n} layers`, `{cols} × {rows}` per RFC D7).

### T005 [US2] Label placement + readability matrix

- **Seam:** overlay frame + labels ↔ `src/overlay/place.ts` (pure; same code runs in the browser, R1).
- **Files:** `packages/xploder/src/overlay/place.ts` per plan.md "Placement"; `packages/xploder/test/overlay-place.test.ts`:
  - **matrix:** fixtures A, B, C × azimuths 45/135/225/315 × {imploded (layer + dimension labels), exploded (layer + part + dimension labels)} × viewports 360×480, 360×640, 390×844, 768×1024, 1280×720, at the default zoom (`fitZoom(bounds.exploded, viewport)`, product gap): **hidden = 0; no two placed boxes intersect; no placed box intersects a component hull; every box inside `[4, W − 4] × [4, H − 4]`**; the box font size is `look.annotation.fontPx` (≥ 12). The test prints per-case counts of `fellBack` (R2) and the maximum leader length;
  - determinism: same input → identical output;
  - zoomed (factor 3, 360×640): labels whose anchors are off-screen are reported `offscreen`, and the placed ones still satisfy the non-overlap rules;
  - unit cases for the SAT intersection (separated, touching, overlapping, contained).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/overlay-place.test.ts --reporter verbose 2>&1 | tee /tmp/s06-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
  If a matrix case cannot reach hidden = 0, **do not relax the rule**: report the failing case (fixture, azimuth, state, viewport, label) to the orchestrator, who escalates with evidence (AC3).
- **Evidence:** `evidence/T005-log-placement.txt` (incl. the printed matrix)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the visual check is G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. A decision only if a matrix case fails (default: the orchestrator proposes a placement fix first; AC3 is never relaxed).

### T006 [P] [US3] Trace route + overlay timing

- **Seam:** S5 flows + overlay anchors ↔ `src/overlay/{trace,timing}.ts` (pure; AC4 order).
- **Files:** per plan.md "Circuit trace"; tests `overlay-trace.test.ts` (for **every step k** of fixture A's `live-update` and `offline-read`, B's flow and C's `pickup-ready` and `push-failed`: `traceRoute(path, k, anchors).vertices` `toStrictEqual(path.slice(0, k + 1))`; `hops.length === k`; every segment of every hop is horizontal, vertical or exactly 45° (|dx| = |dy| within 1e-9); hops start and end at the anchors; an anchor-less id throws) and `overlay-timing.test.ts` (`milliseconds`; `fadeMs` from `hoverSettle`; `drawMs`, `delayMs`, `dotPeriodMs` from `tourPulse`, `tourStep`, `2 × tourPulse`; all 0 for `resolveMotion(true)`).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/overlay-trace.test.ts test/overlay-timing.test.ts --reporter verbose 2>&1 | tee /tmp/s06-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-log-trace.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G1 validation at the STOP after this task (default: proceed to G2 on "approved"). The orchestrator attaches `G1-log-combined.txt` and both frozen-surface diff logs.

---

## Phase G2: Renderer + overlay + playground (US1–US4) → STOP for Murphy after T011

### T007 [US1] Blueprint material patch + `instanceFill` + product layout wiring

- **Seam:** look tokens + palette ↔ `Slabs` materials (patched Lambert) ↔ `TeardownViewer` (look, kinds, product default).
- **Files:** `packages/xploder/src/react/scene/blueprintMaterial.ts` per plan.md "Blueprint material"; additive edits to `Slabs.tsx`, `Scene.tsx`, `TeardownViewer.tsx` (`look`, `kinds`, `resolveViewerLayoutOptions`); `packages/xploder/test/blueprint-scene.test.tsx`:
  - with `look`: both materials are `MeshLambertMaterial` with `color` = `lineMuted` / `line` (both palettes); `onBeforeCompile` and `customProgramCacheKey` are set; running `onBeforeCompile` on `ShaderLib.lambert` sources yields shaders containing `instanceFill`, `vEmphasis`, `fwidth(` and no `#include <opaque_fragment>`; `instanceFill` exists on both meshes at mount with values equal to `layerFill` / `kindFill(kind)` (linear, within 1e-6); exactly **2 `InstancedMesh`**; a palette switch rewrites `instanceFill` to the other palette's fills;
  - without `look`: no `onBeforeCompile`, no `instanceFill`, the same instance/colour values as S5 (`instanceColor` all 1 at neutral);
  - source assertion: `TeardownViewer.tsx` contains `resolveViewerLayoutOptions(`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/blueprint-scene.test.tsx test/scene.test.tsx test/emphasis-scene.test.tsx 2>&1 | tee /tmp/s06-checks/t007.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-material.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet (default: agent log; the look is judged at the G2 STOP).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T008 [US2] Overlay projector (closed loop) + settle signals

- **Seam:** real R3F camera (incl. S5 view offset) ↔ `OverlayProjector` ↔ pure projection twin.
- **Files:** `packages/xploder/src/react/scene/OverlayProjector.tsx` per plan.md; additive `Scene` props `onOverlay`, `onOverlayScroll`; `packages/xploder/test/overlay-projector.test.tsx`: (a) closed loop: the projector's settled frame equals `overlayFrame(...)` within 0.5 px for 4 azimuths × both states (fixture A, 390×844); (b) a turn emits `moving` then exactly one `settled`; (c) changing only the view offset calls `onOverlayScroll` and emits no `moving`; (d) the projector allocates nothing per frame after warm-up (spy on the frame builder's array creation, or assert reused buffers).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/overlay-projector.test.tsx 2>&1 | tee /tmp/s06-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-projector.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T009 [US2] Overlay model + `<BlueprintOverlay>` (labels, parts, dimensions)

- **Seam:** settled frame + S5 viewer state ↔ `overlay/model.ts` ↔ DOM overlay inside the sticky canvas viewport.
- **Files:** `packages/xploder/src/overlay/model.ts` and `src/react/overlay/BlueprintOverlay.tsx` per plan.md; additive `TeardownViewer` mount + `data-xploder-overlay`, `data-xploder-overlay-hidden`; `packages/xploder/test/overlay-model.test.ts` (tour status ≠ idle → no annotation labels; imploded → no part labels; focus on layer `data` → labels of other layers carry `opacity = emphasis.dim.level`, focused ones 1; width 390 → part text short + `srText` = name, width 1280 → long text; every label box = the size model; `hidden` = the placement's hidden count; strokes present for both dimensions and every leader).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/overlay-model.test.ts 2>&1 | tee /tmp/s06-checks/t009.txt
  pnpm typecheck && pnpm lint && pnpm test
  pnpm --filter web dev >/tmp/s06-checks/dev.log 2>&1 & echo $! > /tmp/s06-checks/dev.pid
  until curl -sf -o /dev/null http://localhost:3000/dev/engine; do sleep 0.5; done
  for s in light dark; do pnpm evidence 'http://localhost:3000/dev/engine?fixture=a&state=exploded' --runs 1 --color-scheme $s --wait-for '[data-xploder-overlay="shown"]' --out /tmp/s06-checks/t009-$s; done
  kill "$(cat /tmp/s06-checks/dev.pid)"; echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-overlay.txt`, `T009-screenshot-{mobile,desktop}-{light,dark}.png`, `T009-meta-{light,dark}.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing yet (default: judged in the G2 walkthrough).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010 [US3] `<CircuitTrace>` + reduced-motion twin

- **Seam:** S5 tour state + settled anchors ↔ `traceRoute` ↔ SVG trace with WAAPI token timing.
- **Files:** `packages/xploder/src/react/overlay/CircuitTrace.tsx` per plan.md "Circuit trace"; additive `TeardownViewer` wiring + `data-xploder-trace`; extend `overlay-model.test.ts` with the trace model (idle → no trace and empty attribute; paused at step 2 → 3 vertices, no dot; playing → dot flagged; ended → full path; under `resolveMotion(true)` every animation spec has duration 0 and the dot is off).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/overlay-model.test.ts test/overlay-trace.test.ts 2>&1 | tee /tmp/s06-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test
  pnpm --filter web dev >/tmp/s06-checks/dev.log 2>&1 & echo $! > /tmp/s06-checks/dev.pid
  until curl -sf -o /dev/null http://localhost:3000/dev/engine; do sleep 0.5; done
  pnpm evidence 'http://localhost:3000/dev/engine?fixture=a&state=exploded&flow=live-update&tour=paused&step=3' --runs 1 --wait-for '[data-xploder-trace="beachgoer tide-chart-screen tide-view-model tide-repository"]' --out /tmp/s06-checks/t010
  kill "$(cat /tmp/s06-checks/dev.pid)"; echo T010-OK
  ```
- **Evidence:** `evidence/T010-log-trace.txt`, `T010-screenshot-{mobile,desktop}.png`, `T010-meta.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing yet (default: judged in the G2 walkthrough).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T011 [US1] [US4] [US5] Playground default + backdrop, scanner upkeep, ⚑ push + draft PR

- **Seam:** dev playground ↔ product default · scanners ↔ S6 files · slice branch ↔ remote.
- **Files:** `apps/web/app/dev/engine/engine-playground.tsx` (remove `PLAYGROUND_LAYOUT_OPTIONS` and the prop; add the CSS drafting-grid backdrop behind the canvas from `var(--color-grid)`); `apps/web/test/no-color-literals.test.ts`, `no-motion-literals.test.ts` (non-vacuity += every S6 file), `package-consumer.test.ts` (identifiers += `onBeforeCompile`, `instanceFill`, `placeLabels`, `traceRoute`).
- **Check:**
  ```sh
  set -euo pipefail
  grep -q 'explodedGap' apps/web/app/dev/engine/engine-playground.tsx && { echo 'override still present'; exit 1; } || true
  pnpm --filter web exec vitest run test/no-color-literals.test.ts test/no-motion-literals.test.ts test/package-consumer.test.ts test/fixture-exclusion.test.ts 2>&1 | tee /tmp/s06-checks/t011.txt
  # negative controls: a hex literal and a duration literal in an S6 file must turn the scanners red
  printf '\nconst probeHex = "#123456";\n' >> packages/xploder/src/overlay/model.ts
  if pnpm --filter web exec vitest run test/no-color-literals.test.ts >/tmp/s06-checks/t011-neg-hex.txt 2>&1; then echo NEG-HEX-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/overlay/model.ts
  printf '\nconst probeMs = { transition: "opacity 200ms" };\n' >> packages/xploder/src/overlay/model.ts
  if pnpm --filter web exec vitest run test/no-motion-literals.test.ts >/tmp/s06-checks/t011-neg-motion.txt 2>&1; then echo NEG-MOTION-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/overlay/model.ts; echo 'negative controls: red as expected' | tee -a /tmp/s06-checks/t011.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T011-OK
  ```
  ⚑ Then the orchestrator pushes `task/s06-blueprint-theme` and opens a **draft** PR (granted, RFC §9.4).
- **Evidence:** `evidence/T011-log-scanners.txt` (+ the draft PR URL)
- **WHAT MURPHY SHOULD TEST/VALIDATE (G2 walkthrough, Orca browser, `pnpm dev` → `/dev/engine`):**
  1. Light and dark: paper/navy sheet, crisp ink outlines, kind colours distinguishable, including module vs external (default: accept, or name a token to tune).
  2. Labels, part numbers and dimension lines readable at phone width (Orca's narrow viewport) and never covering a part (default: accept).
  3. Hover, tap, focus and tour still behave as in S5; the circuit trace grows in flow order with the pulse; labels step back during the tour (default: accept).
  4. Zoom in fully and scroll to the top and bottom (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G2 validation, or token tweaks named by value (default: proceed to G3 on "approved"; tuning happens once, here).

### T011a [US2] Imploded title block (G2 feedback, RFC §9.8)

- **Seam:** overlay model (imploded state) ↔ new title-block model ↔ `<BlueprintOverlay>`.
- **Files:** `packages/xploder/src/overlay/titleBlock.ts` (pure: content lines, box from the R1 model, corner choice vs silhouettes); `src/overlay/model.ts` (imploded → no on-drawing labels or strokes; title block in the model); `src/look/tokens.ts` (`titleBlock: { insetPx: 8, titleRole: 'ink', metaRole: 'steel', rowRole: 'label', borderRole: 'line', fillRole: 'paper' }`); `src/react/overlay/BlueprintOverlay.tsx` (render it); `TeardownViewer.tsx` (`data-xploder-titleblock="shown|hidden"`); tests `overlay-titleblock.test.ts` + updated `overlay-place.test.ts`/`overlay-model.test.ts`.
- **Check:** `pnpm --filter xploder exec vitest run test/overlay-titleblock.test.ts test/overlay-place.test.ts test/overlay-model.test.ts`. The matrix must show, for fixtures A/B/C × 4 azimuths × 5 viewports, imploded at default zoom: 0 on-drawing labels; title block inside the viewport, intersecting no layer/component silhouette, font ≥ 12 px. Exploded matrix unchanged. Then `pnpm typecheck && pnpm lint && pnpm test`, and orchestrator dev-server screenshots (imploded light/dark × 360/1280).
- **Evidence:** `evidence/T011a-log-titleblock.txt`, `T011a-screenshot-{mobile,desktop}-{light,dark}-imploded.png`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Imploded shows only the stack plus the title block; exploded unchanged (default: accept in the G2 re-walkthrough).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: G2 re-validation after this task).

### T011b [US2] No overlay blink on implode/explode (G2 feedback)

- **Seam:** viewer target + explode phase ↔ `<BlueprintOverlay>` visibility.
- **Cause (measured, evidence/T011b-log-blink.txt):** clicking Explode/Implode changes `target` at once; for 1–2 frames the overlay re-renders the new state's model on the old settled frame (13 exploded labels over the closed stack, or the title block over the open one) before the projector's `moving` event hides it. 8 blink frames over 6 toggles at 4× CPU throttle.
- **Fix:** visibility is pure `overlayVisible({ moving, settledTarget, target, phase })` = not moving ∧ a settled frame exists ∧ the frame was settled for the current target ∧ the explode phase equals the target state. When it is false, the overlay renders no labels, strokes, title block or trace, and opacity drops to 0 synchronously (layout effect, before paint). `settled` events that arrive while the phase is still `exploding`/`imploding` are ignored.
- **Check:** `pnpm --filter xploder exec vitest run test/overlay-model.test.ts` (visibility truth table) + `pnpm typecheck && pnpm lint && pnpm test`; orchestrator browser re-run of the blink probe → `blinkFrames: 0`.
- **Evidence:** `evidence/T011b-log-blink.txt` (before/after)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Toggle implode/explode on your phone: no text flashes (default: accept after your re-test).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: G2 re-validation).

---

## Phase G3: Evidence (US1–US5) → STOP for Murphy after T015

### T012 [US1] [US2] [US3] [US4] `engine:probe` S6 groups

- **Seam:** Playwright drive script ↔ viewer DOM contract (`data-xploder-overlay*`, `data-xploder-trace`, `data-xploder-label`) ↔ `engine-probe.json`.
- **Files:** `tools/perf/src/engine-probe.ts` (observation types + checks per plan.md "Evidence CLIs"), `tools/perf/src/cli/engine-probe.ts` (drive script: palette pixels incl. OS-dark first screenshot, toggle, overlay default/360/selectable/colours/hit-through/CLS, trace order A×2 + C×2, stop, reduced-motion trace, default-gap hit maps A + C, draw calls mid-tour; screenshots `screenshot-overlay-360-{light,dark}.png`, `screenshot-default-gap-{a,c}.png`, `screenshot-trace-{a,c}.png`, `screenshot-rm-trace.png`); `tools/perf/test/engine-probe.test.ts` (evaluation of every S6 check from fabricated observations, pass and fail cases).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools exec vitest run test/engine-probe.test.ts 2>&1 | tee /tmp/s06-checks/t012.txt
  pnpm engine:probe --help >/dev/null && echo HELP-OK
  pnpm typecheck && pnpm lint && pnpm test && echo T012-OK
  ```
- **Evidence:** `evidence/T012-log-probe-tool.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

#### T012 amended check list (orchestrator, G3 start, RFC §9.10) — supersedes plan.md "Evidence CLIs" table

New scope `s6` (CLI `--scope s6`; `all` = s4 + s5 + s6). Every S4/S5 check stays unchanged and required. During pixel sampling the overlay is hidden by an injected style (`[data-xploder-overlay]{visibility:hidden}`) so leaders don't cover the sampled slab; it is removed afterwards.

| Check | Pass rule |
|---|---|
| `bp-fill-near-paper-light` / `-dark` | centre pixel of `tide-chart-screen` (A, exploded, desktop): ΔE to `--bp-paper` < ΔE to `--bp-line` |
| `bp-edge-ink-light` / `-dark` | along a 60 px vertical scan down from that centre, the pixel closest to `--bp-line` is within ΔE 10 |
| `bp-kind-distinct` | centre pixels of `tide-cache` (store) and `live-tide-client` (service): ΔE ≥ 3 (light) |
| `bp-toggle-switches` | after clicking the theme toggle, the fill sample is closer to the dark `paper` than to the light `paper` |
| `bp-os-dark-first-paint` | new context `colorScheme: 'dark'`, empty storage: the first screenshot after ready has the page background within ΔE 3 of the dark `paper` and the fill closer to the dark `paper` |
| `overlay-default-<fixture>-<state>-<viewport>` | A/B/C × imploded/exploded × 390×844/1280×800: imploded → `data-xploder-titleblock="shown"` and 0 `[data-xploder-label]`; exploded → `data-xploder-overlay="shown"` and `data-xploder-overlay-hidden="0"` |
| `overlay-360-boxes` | 360×740, A and C, exploded (labels) and imploded (title block): every box inside the viewer rect, no pairwise intersections, computed font-size ≥ 12 px; screenshots `screenshot-overlay-360-{light,dark}-{a,c}-{exploded,imploded}.png` |
| `overlay-selectable` | Selection API round trip returns a layer label's text and a title-block row's text; `user-select ≠ none` |
| `overlay-colors-light` / `-dark` | computed colours: layer label = `--bp-label`, part label = `--bp-ink`, dimension label = `--bp-steel`, title-block title = `--bp-ink` |
| `overlay-hit-through` | mouse over the component next to a part balloon → highlight = that id; touch: tap a component (highlighted), then tap a layer label → highlight cleared |
| `overlay-cls-zero` | zero `layout-shift` entries whose sources lie inside `[data-xploder-overlay]`, over load + the S6 groups (incl. toggles), both themes |
| `trace-order-<fixture>-<flow>` | A `live-update`, `offline-read`; C `pickup-ready`, `push-failed`: paused + Step through every step k → `data-xploder-trace` = `path.slice(0, k + 1).join(' ')` |
| `trace-stop-clears` | after Stop, `data-xploder-trace` = `""` |
| `rm-trace-static` | `reducedMotion: 'reduce'`, tour playing: at two different steps the trace is present and `[data-xploder-overlay]`'s `getAnimations({ subtree: true })` is empty |
| `default-gap-hitmap-a` / `-c` | the existing hit-map sweep, exploded at 45°, playground without `layoutOptions`: every component of A and of C is hit |
| `draw-calls-mid-tour` | A, tour playing: draw calls = 2 |
| `overlay-no-blink` | Pixel 7 emulation, CPU throttle 4×, 4 implode/explode toggles, rAF sampling from the click: 0 frames with overlay opacity > 0 and label/title-block elements before the phase reaches the target; the overlay is `shown` 2.5 s after each click |

### T013 [P] [US1] [US2] [US3] [US4] Probe evidence run (all S4/S5/S6 checks, incl. AC7 scroll)

- **Seam:** fixture export ↔ `engine:probe` ↔ committed evidence.
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; # local fixture server (see rules)
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s06-checks/t013 2>&1 | tee /tmp/s06-checks/t013.txt
  node -e "const r=require('/tmp/s06-checks/t013/engine-probe.json');const bad=r.checks.filter(c=>!c.pass);console.log(r.checks.length,'checks',bad.length,'failed');for(const n of ['scroll-top-reaches-top-layer','scroll-bottom-reaches-bottom-layer','overlay-cls-zero','cls-zero','hover-pixel-toward-accent','focus-pixel-toward-paper','draw-calls-mid-tour']){if(!r.checks.some(c=>c.name===n&&c.pass)){console.log('missing or failed',n);process.exit(1)}}if(!r.pass||bad.length)process.exit(1)"
  kill "$(cat /tmp/s06-checks/serve.pid)"; echo T013-OK
  ```
- **Evidence:** `evidence/T013-log-probe.txt`, `T013-engine-probe.json`, `T013-screenshot-{scroll-top,scroll-bottom,overlay-360-light,overlay-360-dark,default-gap-a,default-gap-c,trace-a,trace-c,rm-trace}.png` (scroll top/bottom = max zoom 3×, the AC5/AC7 reachability proof)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The 360 px overlay shots (light + dark) and the max-zoom top/bottom shots (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T014a [US2] Placement robust at every canvas size (found by T014, RFC §9.11)

- **Seam:** `overlay/place.ts` + `overlay/model.ts` (stack-dimension anchors) ↔ readability contract.
- **Finding:** T014's evidence desktop profile (1350×940 → canvas 1150×562) hid `dimension:stack` on fixture C (`data-xploder-overlay-hidden="1"`). T005's matrix tested five fixed sizes, but the canvas is sized by the page (60dvh × container), so real canvases fall between them. Dense sweep (canvas 300–1700 × 300–1000 step 25, A/B/C × 4 azimuths, exploded): **680 / 19 836 cases hid ≥ 1 label** (mostly `dimension:stack`; on short C canvases also parts). Orchestrator experiment: stack-label anchors along the rail (t = 0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9, 0, 1) → 39; plus radii `[8, 20, 36, 56, 80, 104]` → **0**.
- **Fix:** (1) `PlacementLabel.anchors?: readonly Vec2[]` = alternative anchors tried in order (each × radii × directions) after the primary; `overlayLabels` gives `dimension:stack` the rail points above; the leader starts at the anchor actually used. (2) `PLACEMENT_RADII = [8, 20, 36, 56, 80, 104]`. (3) The readability contract becomes the dense sweep: canvas widths 360–1700 step 40 × heights 300–1000 step 40, A/B/C × 4 azimuths × exploded (labels) and imploded (title block) → 0 hidden, 0 overlaps, no hull hit, inside. The previous 5-size matrix stays as a printed sample. (4) Bug: `data-xploder-titleblock` must read `shown` only when the title block itself is rendered (it currently mirrors the whole overlay).
- **Check:** `pnpm --filter xploder exec vitest run test/overlay-place.test.ts test/overlay-titleblock.test.ts test/overlay-model.test.ts` + `pnpm typecheck && pnpm lint && pnpm test`; then T014 is re-run.
- **Evidence:** `evidence/T014a-log-placement-sweep.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the visual proof is the T014 matrix).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T014 [P] [US2] [US4] Screenshot matrix (light/dark × imploded/exploded/tour + fixture C default)

- **Seam:** URL-driven playground states ↔ `pnpm evidence` ↔ committed screenshots.
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; # local fixture server (see rules)
  B='http://127.0.0.1:4199/dev/engine?fixture=a'
  for s in light dark; do
    pnpm evidence "$B" --runs 1 --color-scheme $s --wait-for '[data-xploder-overlay="shown"]' --out /tmp/s06-checks/t014-imploded-$s
    pnpm evidence "$B&state=exploded" --runs 1 --color-scheme $s --wait-for '[data-xploder-overlay="shown"][data-xploder-overlay-hidden="0"]' --out /tmp/s06-checks/t014-exploded-$s
    pnpm evidence "$B&state=exploded&flow=live-update&tour=paused&step=3" --runs 1 --color-scheme $s --wait-for '[data-xploder-trace="beachgoer tide-chart-screen tide-view-model tide-repository"]' --out /tmp/s06-checks/t014-tour-$s
    pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=c&state=exploded' --runs 1 --color-scheme $s --wait-for '[data-xploder-overlay="shown"][data-xploder-overlay-hidden="0"]' --out /tmp/s06-checks/t014-c-$s
  done
  ls /tmp/s06-checks/t014-*/screenshot-*.png | wc -l   # expect 16
  kill "$(cat /tmp/s06-checks/serve.pid)"; echo T014-OK
  ```
- **Evidence:** `evidence/T014-screenshot-{mobile,desktop}-{light,dark}-{imploded,exploded,tour}.png` (12), `T014-screenshot-{mobile,desktop}-{light,dark}-c-default.png` (4), `T014-meta-*.json`, `T014-log-matrix.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The 16 shots: light/dark readability of labels, all A and C parts visible at the default angle, trace visible in both themes (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T015 [US5] FPS during a live tour + draw calls (run alone)

- **Seam:** fixture export ↔ `fps:engine --scenario tour` ↔ no-regression verdict with the blueprint shader + trace animation. **Runs with no other browser task in parallel** (T013/T014 must have finished).
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; pnpm fps:engine --scenario tour --out /tmp/s06-checks/t015 2>&1 | tee /tmp/s06-checks/t015.txt
  node -e "const r=require('/tmp/s06-checks/t015/fps.json');const ok=r.verdict.pass===true&&r.droppedFrames===0&&r.verdict.liveness===true&&r.windowMs>=5000&&r.tourStepsAdvanced>=3&&r.drawCalls===2;console.log(JSON.stringify({droppedFrames:r.droppedFrames,liveness:r.verdict.liveness,windowMs:r.windowMs,tourStepsAdvanced:r.tourStepsAdvanced,drawCalls:r.drawCalls,info:{fps:r.fps,rafFps:r.rafFps,intervalsMs:r.intervalsMs}}));if(!ok)process.exit(6)"
  echo T015-OK
  ```
  A failing verdict is **not** rerun to green (EVIDENCE.md §6): one rerun only for infrastructure exits 3/4; otherwise escalate with the evidence.
- **Evidence:** `evidence/T015-fps.json`, `T015-log-fps.txt`, `T015-screenshot-desktop.png`, `T015-meta.json` (Chromium version, command, exit code, `127.0.0.1` target)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The `fps.json` summary: 0 dropped frames, liveness true, ≥ 3 steps advanced, 2 draw calls (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G3 validation at the STOP after this task (default: proceed to G4 on "approved").

---

## Phase G4: Ship (US5) → STOP for Murphy after T016

### T016 [US5] ⚑ PR ready, full CI, AC self-check

- **Seam:** slice branch ↔ CI ↔ `main`.
- **Files:** `evidence/AC-selfcheck.md` (AC1–AC6 × evidence file × verdict: light+dark × imploded/exploded × tour states, default-gap visibility proof for `tide-repository`, `booking-service`, `notifier`, max-zoom reachability re-check, draw-call and CLS numbers), `evidence/T016-ci.txt`, `evidence/T016-log-surface-diff.txt`.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build 2>&1 | tail -5 | tee /tmp/s06-checks/t016.txt
  git diff --stat --exit-code 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) | tee /tmp/s06-checks/t016-surface.txt && echo S2S4-DIFF-EMPTY
  git diff --stat --exit-code f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) | tee -a /tmp/s06-checks/t016-surface.txt && echo S5-DIFF-EMPTY
  gh pr checks --watch 2>&1 | tee -a /tmp/s06-checks/t016.txt   # build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion
  ```
  ⚑ The orchestrator marks the PR ready, then **waits for Murphy's "merge"** (RFC §9.5).
- **Evidence:** `evidence/T016-ci.txt`, `T016-log-surface-diff.txt`, `AC-selfcheck.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation in Orca's browser via `pnpm dev` locally (both palettes, callout readability, tour trace), since `/dev/engine` is excluded from previews and production (default: same walkthrough as G2).
  2. The AC self-check table (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" when you're satisfied (default: no merge without it).
  2. After the merge: nothing; the agent reminds you to `git pull` the original clone.

---

## Dependencies & order

T001 → T002 → T003 → (T004 → T005) ∥ T006 → **STOP G1** → T007 → T008 → T009 → T010 → T011 (⚑ push + draft PR) → **STOP G2** → T012 → (T013 ∥ T014) → T015 (alone) → **STOP G3** → T016 → **STOP G4**.

T001 comes first so the S5 seal exists before any S6 code lands. T005 needs T004's frame and box model. T009 needs T005 (placement) and T008 (frames). T015 runs after T013/T014 so no other browser load overlaps the FPS window.

## FR ↔ task coverage

| FR | AC | Tasks |
|---|---|---|
| FR-001 | AC1 | T001, T002, T007, T011, T013, T014 |
| FR-002 | AC2 | T002, T007, T013, T015 |
| FR-003 | AC3 | T004, T005, T008, T009, T013, T014 |
| FR-004 | AC4 | T006, T010, T011, T013 |
| FR-005 | AC5 | T003, T007, T011, T013, T014 |
| FR-006 | AC6 | T001, T011, T013, T015, T016 |
