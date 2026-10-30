# Tasks: S05 Engine Core B — Hover · Layer Focus · Guided Tour

**Input:** `rfc.md` (approved, §9), `spec.md`, `plan.md` in `.specify/features/engine-core-b/`
**Executor:** DeepSeek Flash seat (tier 1: `codex exec -p deepseek`; sandbox off for browser tasks, writes limited to the task worktree and `/tmp/s05-checks`). **Escalation (RFC D13):** tier 2 (OpenRouter) is **skipped** (`OPENROUTER_API_KEY` unset; logged per task). If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage and waits for "go". It never takes over automatically. Each report states the finishing tier and any skip.
**Usage pacing:** each phase group starts in a fresh 5h window. Before each task the orchestrator checks usage (Murphy states "5h: N%" at gates). At ≥ 85% of the 5h window, no new task starts: finish and commit the current task, tick the ledger, report, STOP.
**AC5 doctrine:** dropped-frames style only. **No task check may compare fps against a literal threshold**; liveness is the harness band verdict (`inBand`), and raw fps is information.

## Ledger (resume point — update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator (sandbox loopback EPERM) | evidence/T001-log-guard.txt | 324a7af |
| T002 | ☑ | 1 (Flash, 2nd dispatch after an orchestrator spec fix, not an executor failure; F6 found) | evidence/T002-log-pick.txt | b1c2643 |
| T003 | ☑ | 1 (Flash, sandbox on) | evidence/T003-log-pointer-focus.txt | 8dbce93 |
| T004 | ☑ | 1 (Flash, sandbox on) | evidence/T004-log-fixture-c.txt | 3fe8a6b |
| T005 | ☑ | 1 (Flash) + 2 one-line orchestrator review fixes with tests | evidence/T005-log-tour.txt | 8248d3e |
| T006 | ☑ | 1 (Flash) + 2 one-line orchestrator review fixes | evidence/T006-log-emphasis.txt | 98da2b7 |
| T007 | ☑ | 1 (Flash, sandbox off) + orchestrator reverted an out-of-scope next.config change | evidence/T007-log-pointer.txt | 7462c9e |
| T008 | ☑ | 1 (Flash) + orchestrator cleanup (process declare) | evidence/T008-log-handle.txt | d58b4b4 |
| T009 | ☑ (R6: mobile caption covers the top layer, raised at G2) | 1 (Flash, sandbox off; 1st dispatch hung on runner stdin, infra not executor) + orchestrator fix (loop param) | evidence/T009-{log-playground.txt,screenshot-*.png,meta-c-tour.json} | 1b9c5ae |
| T010 | ☑ + ⚑ pushed, draft PR #8 | 1 (Flash, sandbox on); build/exclusion re-run outside sandbox | evidence/T010-log-scanners.txt | 3fff46c |
| T010a | ☑ (G2 feedback, scope-add rev 1) | 1 (Flash, sandbox off) | evidence/T010a-{log-scroll.txt,screenshot-desktop-zoomed-*.png} | 082e28b |
| T010b | ☑ (R6 fixed) | 1 (Flash, sandbox off) + orchestrator test fix (fragile react-dom reach) | evidence/T010b-{log-caption.txt,screenshot-mobile-*-target.png} | 872a987 |
| T010c | ☑ (caption CLS found by the probe) | 1 (Flash, sandbox off) | evidence/T010c-log-caption-cls.txt | c6ca0a9 |
| T010d | ☑ (F8 tour clock stall; Play/Pause width) | 1 (Flash, sandbox off); orchestrator negative control | evidence/T010d-log-tour-clock.txt | a12c7ac |
| T011a | ☑ | 1 (Flash, sandbox off) + orchestrator counter fix | evidence/T011a-log-fps-tool.txt | bedaaf9 |
| T011b | ☑ (3 rounds: scope amendments by the orchestrator, not executor failures) | 1 (Flash, sandbox off) | evidence/T011b-log-probe-tool.txt | ac4a43c |
| T012 | ☑ 69/69 | 1 (Flash, sandbox off); orchestrator removed 2 duplicate screenshots | evidence/T012-{log-probe.txt,engine-probe.json,log-touch-trace.json,screenshot-*.png} | 862d579 |
| T013 | ☑ 14 shots | 1 (Flash, sandbox off) | evidence/T013-{log-matrix.txt,screenshot-*.png,meta-*.json} | da65e3c |
| T014 | ☑ AC5 pass | 1 (Flash, alone) | evidence/T014-{fps.json,log-fps.txt,screenshot-desktop.png,meta.json} | 4a71777 |
| T015 | ☐ | | | |

Resume prompt for a fresh session: _"Read `.specify/KICKOFF-S05.md` and `.specify/features/engine-core-b/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."_

## Format & rules (apply to every task)

- `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task. Stories: **US1** visitor points at a part · **US2** visitor isolates a layer · **US3** visitor watches a request travel · **US4** reduced-motion visitor · **US5** reviewer trusts it.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:** each task runs in a fresh worktree from `task/s05-engine-core-b`, on branch `task/s05-t0NN-<slug>`. After the check passes, merge back into the slice branch without squashing. Commit message: `S05/T0NN: <title>`. Remove the worktree only after the merge.
- **Orchestrator-only steps** (marked ⚑): `git push`, opening/updating the PR, merging the PR (only after Murphy says "merge"). Flash prepares; the orchestrator executes.
- **Guards (every task):** all must print OK (plan.md "Guards"):
  ```sh
  git diff --quiet 53b2b2b -- .specify/slices .specify/KICKOFF.md .specify/KICKOFF-S02.md .specify/KICKOFF-S03.md .specify/KICKOFF-S04.md .specify/KICKOFF-S05.md && echo FROZEN-OK
  git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-OK   # from T001 on
  test -z "$(git log --oneline 53b2b2b..HEAD -- .specify/slices .specify/KICKOFF-S05.md)" && echo BRIEF-HISTORY-OK
  ```
- **Every check also runs:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Never:** add dependencies · add a package export · edit a frozen-surface file (plan.md "Guards") or an existing S2/S4 test · import `@react-three/drei`, GSAP, `three/examples`, `three/addons`, `three-stdlib` or `camera-controls` · write motion literals (durations, easings, staggers, timer delays) outside `packages/xploder/src/motion/` · write hex/`rgb()`/`hsl()`/`0x` colours outside `packages/xploder/src/theme/` · put engine logic or `three`/`@react-three/*` imports in `apps/web` · deep-import `xploder/src` from the app · compare fps to a literal number in any tool or check · add a threshold override to any perf CLI · uncap the browser frame rate · set `PERF_FIXTURES` on Vercel · put private hostnames, IPs or tokens anywhere (`127.0.0.1` is fine) · run `specify init` · use bare `git stash`.
- **Evidence** goes to `.specify/features/engine-core-b/evidence/T0NN-*.{txt,png,json}` (naming per `.specify/EVIDENCE.md` §4). Throwaway scripts live in `/tmp/s05-checks/`. Run `mkdir -p /tmp/s05-checks .specify/features/engine-core-b/evidence` first, and run every check under `set -euo pipefail`.
- **Local fixture server** (T009, T012–T014): `pnpm build:fixtures && (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s05-checks/serve.pid)`, then `until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done`; stop with `kill "$(cat /tmp/s05-checks/serve.pid)"`.

---

## Phase G1: Pure core (US1, US2, US3) → STOP for Murphy after T005

### T001 [US5] Frozen-surface guard + emphasis tokens

- **Seam:** S2/S4 surface ↔ CI (hash manifest) · `xploder/theme` roles ↔ `src/motion/emphasis.ts`.
- **Files:**
  - `packages/xploder/test/frozen-surface.paths`: the plan.md frozen list, one repo-relative-to-package path per line (directories expand to every tracked file below them at generation time; the manifest stores files only).
  - `packages/xploder/test/frozen-surface.manifest.json`: `{ "base": "53b2b2b", "note": "S05 freeze (RFC D1/R5). A later slice that changes a listed file regenerates this manifest in the same diff and states why.", "files": { "<path>": "<sha256>" } }`, generated **from the base commit** with `git ls-tree -r --name-only 53b2b2b -- <paths>` + `git show 53b2b2b:<path> | shasum -a 256`. Commit the generator as `packages/xploder/test/frozen-surface.generate.sh`.
  - `packages/xploder/test/frozen-surface.test.ts`: reads the manifest; for each file, sha256 of the working copy equals the manifest value; the manifest has ≥ 40 entries and includes `src/schema/project.ts`, `src/motion/index.ts`, `src/engine/camera.ts`, `src/react/scene/CameraRig.tsx`, `test/scene.test.tsx` (non-vacuity); a unit case shows the hash helper detects a one-byte change.
  - `packages/xploder/src/motion/emphasis.ts` per plan.md "Emphasis tokens".
  - `packages/xploder/test/emphasis-tokens.test.ts`: roles are `PaletteRole`s present in `blueprint.light/dark`; `0 < dim.level < 1`; `0 < tourPulse.floor < 1`; every RGB channel of `line` and `lineMuted` is nonzero in both themes (ratio multiplier safety, plan.md).
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s05-checks .specify/features/engine-core-b/evidence
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts test/emphasis-tokens.test.ts 2>&1 | tee /tmp/s05-checks/t001.txt
  # negative control: touching a frozen file must turn the guard red
  printf ' ' >> packages/xploder/src/parse.ts
  if pnpm --filter xploder exec vitest run test/frozen-surface.test.ts >/tmp/s05-checks/t001-neg.txt 2>&1; then echo 'NEG-CONTROL-FAILED'; exit 1; fi
  git checkout -- packages/xploder/src/parse.ts; echo 'negative control: red as expected' | tee -a /tmp/s05-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (test log + negative-control note + manifest entry count)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; negative control shows the guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; token values per RFC §9.1).

### T002 [P] [US1] Pure pick (ray ⇄ AABB with occlusion)

- **Seam:** layout + explode progress ↔ `pick()` (the instance-index contract shared with the S4 timeline).
- **Files:** `src/interaction/pick.ts`, `test/pick.test.ts`. Per plan.md "Internal modules". Tests:
  - `rayBoxDistance`: hit from each axis, miss, origin inside box (t = 0), ray pointing away → null;
  - for fixture A and B, for azimuths `VIEW.baseAzimuth + k·VIEW.snap` (k = 0..3), build the camera direction from `VIEW.elevation`/azimuth exactly as `CameraRig.placeCamera` does (re-derived in the test, not imported) and cast parallel (orthographic) rays;
  - **amended 2026-10-30 (orchestrator spec fix, RFC §9.7 F6):** the original bullet "exploded: every component's centre ray returns its own index" was wrong. In the exploded state the slab above overlaps lower layers on screen, so a nearest-hit picker correctly returns `null` for some centre rays. It is replaced by:
    - **reference agreement:** for both states (progress all 0 / all 1) and all 4 azimuths, on a screen-space grid of rays (step ≤ 0.05 world units, covering the projected stack bounds), `pick` equals an **independent reference**: march along the ray in steps ≤ 0.005 and return the first box that contains the point (component → its index, layer slab → `null`, none → `null`);
    - **top layer:** every top-layer component's centre ray returns its own index in both states;
    - **imploded occlusion:** for every component in layers ≥ 1, the centre ray returns `null` or a top-layer index, never its own;
    - **visibility table (information, not asserted):** for the exploded state, per azimuth, the count of grid rays that pick each component, printed into the evidence file;
  - nearest wins when two components overlap along a ray; a ray that hits only a layer slab → `null`;
  - mid-explode (progress 0.5) uses lerped centres.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/pick.test.ts 2>&1 | tee /tmp/s05-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-pick.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: test log; the real-camera closed loop comes in T006).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T003 [P] [US1] [US2] Pointer and focus reducers

- **Seam:** user input events ↔ highlight state · layer toggles/`Esc` ↔ focus state.
- **Files:** `src/interaction/pointer.ts`, `src/interaction/focus.ts`, `test/pointer.test.ts`, `test/focus.test.ts`. Per plan.md. Tests:
  - pointer: the full transition table from plan.md (each input × each `source`), including "mouse move over empty keeps a programmatic highlight" and "outside tap ignores a mouse highlight";
  - focus: toggle sets / same toggle releases / other switches / unknown id ignored / `release` / `reset`; `escapeTarget` truth table over all `TourStatus` × focus set/unset;
  - **property test (AC2):** seeded PRNG, 2,000 sequences of 50 actions mixing focus actions with S4 viewer actions (`explode`, `implode`, `toggle`, `rotateLeft`, `rotateRight`, `zoomIn`, `zoomOut`, applied through the real `cameraReducer` and a target variable); after every step, the focus state equals a reference model that only looks at the focus actions.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/pointer.test.ts test/focus.test.ts 2>&1 | tee /tmp/s05-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-pointer-focus.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The tap rules read right to you: tap = highlight, same tap = clear, empty or outside tap = clear (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T004 [US3] Fixture C (data only) + diff proof

- **Seam:** new fixture JSON ↔ frozen S2 schema ↔ `xploder/fixtures` re-export.
- **Files:**
  - `packages/xploder/test/fixtures/project-c-lockerbay.json` (fictional; `https://example.com/lockerbay…` links only, like A/B). `meta`: slug `lockerbay`, name `Lockerbay`, tagline, summary ("A fictional service for collecting parcels from neighbourhood street lockers."), year 2026, role, tags, one link; a short `story`.
    - Layers (data order) and components (`id` · kind · status · techs):
      1. `client`: `recipient` actor · `pickup-app` module [kotlin, jetpack-compose, okhttp]
      2. `edge`: `pickup-api` service [typescript, nodejs] · `session-gate` service **wip** [typescript, nodejs]
      3. `services`: `booking-service` service [typescript, nodejs] · `notifier` service [nodejs, websocket] · `retry-scheduler` service [nodejs] · `slot-planner` module [typescript] · `audit-trail` module **planned** [typescript]
      4. `storage`: `locker-registry` store · `dead-letter-store` store
      5. `external`: `push-gateway` external · `locker-hardware` external
    - Every component has `name` and a one-sentence `summary` (these become tour captions, RFC F1).
    - Flows: `pickup-ready` "Pickup code delivered": `recipient → pickup-app → pickup-api → booking-service → locker-registry → notifier → push-gateway`; `push-failed` "Notice fails, retry queued": `booking-service → notifier → push-gateway → retry-scheduler → dead-letter-store`. Each with a one-sentence `description`.
    - Techs only from the existing registry ids. No real company, product or person names.
  - `packages/xploder/test/fixtures/index.ts`: **one** added import + `export const projectCJson: unknown = …;` (nothing else changes).
  - `packages/xploder/test/fixture-c.test.ts` (+ its own `__snapshots__/fixture-c.test.ts.snap`): parse with the registry; 5 layers, 13 components; `layoutProject` footprint `cols 3, rows 2`; determinism (twice + `structuredClone` → `toStrictEqual`); `toMatchSnapshot()` of the layout; every flow path id exists; uses all five `kind`s and statuses `wip` + `planned`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/fixture-c.test.ts 2>&1 | tee /tmp/s05-checks/t004.txt
  CI=true pnpm --filter xploder exec vitest run test/fixture-c.test.ts 2>&1 | tail -3
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts 2>&1 | tail -3 | tee -a /tmp/s05-checks/t004.txt
  git diff --stat 53b2b2b -- packages/xploder/src packages/xploder/package.json | tee /tmp/s05-checks/t004-src-diff.txt
  git diff --name-status 53b2b2b -- packages/xploder/test/fixtures | tee -a /tmp/s05-checks/t004.txt   # expect: A project-c-lockerbay.json, M index.ts
  git diff 53b2b2b -- packages/xploder/test/fixtures/index.ts | grep -E '^[+-][^+-]' | tee -a /tmp/s05-checks/t004.txt  # expect exactly 2 added lines, 0 removed
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-fixture-c.txt` (tests + the fixtures diff + the `src` diff stat showing only S05's new interaction/motion files and no frozen path)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Fixture C's story reads as plausible and fictional (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; name "Lockerbay" per RFC D9).

### T005 [US3] [US4] Tour state machine

- **Seam:** `flows[]` ↔ `tourReducer`/`positionAt` ↔ beat clock.
- **Files:** `src/interaction/tour.ts`, `test/tour.test.ts`. Per plan.md. Tests:
  - **step order (AC3):** for A `live-update` and `offline-read`, B `nightly-reconciliation`, C `pickup-ready` and `push-failed`: `play` at t = 0, then sample `positionAt` at the middle of each beat → the component id sequence `toStrictEqual(flow.path)`; after the last beat → `ended` holding the last step;
  - pause at 0.4 beat → after 10 beats still the same step; play → the step advances 0.6 beat later (elapsed kept);
  - step from idle → paused step 0; step ×k → step k; step past the last → `ended`; step from ended → paused step 0; play from ended → playing step 0;
  - stop → idle, step −1, `componentId` null; selectFlow(other) → idle on that flow; selectFlow(unknown) unchanged; flows `[]` → `flowId` null and `play` is a no-op;
  - `tick` folds elapsed beats exactly once (no double advance when an action and a tick share a timestamp); `nextBoundary` = `anchor + beat` while playing, null otherwise;
  - **cadence (AC4):** the reducer uses only its `beat` argument. A test passes `motion.durations.tourBeat` with `resolveMotion(true)` tokens elsewhere and shows steps still advance every `motion.durations.tourBeat` (the static twin's `tourBeat: 0` never reaches the machine);
  - `showFlowSelector`: A true, B false, C true.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/tour.test.ts 2>&1 | tee /tmp/s05-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-tour.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The step-order log for A's `live-update` matches the flow you know: beachgoer → chart screen → view model → repository → live client → feed (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G1 validation at the STOP after this task (default: proceed to G2 on "approved").

---

## Phase G2: Renderer + overlay + playground (US1–US4) → STOP for Murphy after T010

### T006 [US1] [US2] Emphasis channels + instance-colour rendering

- **Seam:** interaction state ↔ emphasis channels ↔ `Slabs` (2 meshes: `instanceColor` ratio + lift).
- **Files:** `src/interaction/emphasis.ts`, `src/react/scene/Emphasis.tsx`, **additive** edits to `src/react/scene/Slabs.tsx` (optional `emphasis` driver + `progressRef`; with neither, the S4 code path runs unchanged) and `src/react/scene/Scene.tsx` (optional props passed through); `test/emphasis.test.ts`, `test/emphasis-scene.test.tsx`, `test/pick-scene.test.tsx`. Per plan.md "Emphasis rendering". Tests:
  - `emphasis.test.ts`: channel rise/fall durations and easing at sample points; retarget mid-tween continues from the current value; static twin → settled at `t = now`; `emphasisTargets` (highlight, focus, suspension by tour, tour target); `componentWeights` (hover reveals a dimmed component); `pulseAt` ∈ [floor, 1] with period `2 × durations.tourPulse`, = 1 under the static twin; `liftWorld` formula;
  - `emphasis-scene.test.tsx` (test-renderer, light + dark palettes): both meshes have `instanceColor` at mount; **neutral state: every instance colour is (1, 1, 1)** and the S4 material colours are unchanged; highlight `tide-view-model` → after the hover rise, the effective colour (`material.color × instanceColor`) equals `accent` within 1e-6; focus `data` → layer slabs and components of other layers equal `mix(role, paper, 1 − level)`; then `target: 'exploded'` + `rotateRight` rig → still dimmed; still exactly 2 `InstancedMesh`; lift of the hovered component = `liftWorld(distances.hoverLift, camera.zoom, VIEW.elevation)`;
  - `pick-scene.test.tsx` (**R1 closed loop**): render the scene with the real `CameraRig` at each of the 4 rig steps, imploded and exploded; for each component, `Vector3.project(camera)` of its centre → `Raycaster.setFromCamera(ndc, camera)` → `pick` returns **the same result as the pure-model orthographic ray through that centre** (the T002 test's camera maths) for every component, 4 azimuths × both states, and its own index for every top-layer component. (Amended 2026-10-30 with F6: lower-layer centres can be legitimately occluded, so "same index for all" was wrong; the closed loop proves the real camera and the pure model agree.)
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/emphasis.test.ts test/emphasis-scene.test.tsx test/pick-scene.test.tsx 2>&1 | tee /tmp/s05-checks/t006.txt
  pnpm --filter xploder exec vitest run test/scene.test.tsx test/frozen-surface.test.ts 2>&1 | tail -4 | tee -a /tmp/s05-checks/t006.txt   # S4 scene suite untouched + green
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts test/no-color-literals.test.ts 2>&1 | tail -4 | tee -a /tmp/s05-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-log-emphasis.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet (default: test log; you see it live at the G2 STOP).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T007 [US1] Pointer wiring: hover, tap, cursor

- **Seam:** DOM pointer events on the stage div ↔ camera ray ↔ `pick` ↔ `pointerReducer` ↔ emphasis.
- **Files:** `src/react/usePointerPick.ts`, `src/react/scene/PickBridge.tsx`; **additive** edits to `TeardownViewer.tsx` (stage `div[data-xploder-stage]` around the `<Canvas>`; `data-xploder-highlight` written via the wrapper ref) and `Scene.tsx` (mount `PickBridge`). Per plan.md "Picking adapter": mouse `pointermove`/`pointerleave`; tap = `click` after a non-mouse `pointerdown`; per-frame re-pick while the explode timeline or camera turn moves; cursor; outside-tap listener only while `source === 'touch'`. Extend `test/emphasis-scene.test.tsx` or add `test/pointer-wiring.test.tsx` only for logic reachable without a DOM (the real-browser proof is T012).
- **Check:**
  ```sh
  set -euo pipefail; pnpm typecheck && pnpm lint && pnpm test 2>&1 | tee /tmp/s05-checks/t007.txt
  # dev smoke with a real browser (sandbox off): hover the first exploded component found by a 24×16 mouse sweep
  pnpm dev >/tmp/s05-checks/dev.log 2>&1 & echo $! > /tmp/s05-checks/dev.pid
  until curl -sf -o /dev/null http://127.0.0.1:3000/dev/engine; do sleep 0.5; done
  node /tmp/s05-checks/t007-smoke.mjs 'http://127.0.0.1:3000/dev/engine?fixture=a&state=exploded' 2>&1 | tee -a /tmp/s05-checks/t007.txt
  kill "$(cat /tmp/s05-checks/dev.pid)"; echo T007-OK
  ```
  (`t007-smoke.mjs`: Playwright; sweeps the canvas, prints the set of highlighted ids and `cursor` at the first hit, then taps that point in a `hasTouch` context and prints the highlight; exits 1 if no id is ever highlighted or the tap doesn't highlight.)
- **Evidence:** `evidence/T007-log-pointer.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet (default: smoke log; the full probe is T012).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T008 [US2] [US3] [US4] Viewer handle, Esc, tour runtime, caption overlay

- **Seam:** `useTeardownViewer` handle ↔ reducers + beat timer ↔ `TeardownViewer` (emphasis props, caption, data attributes).
- **Files:** **additive** edits to `useTeardownViewer.ts`, `TeardownViewer.tsx`, `react/index.ts`; new `src/react/useTourClock.ts`, `src/react/overlay/TourCaption.tsx`; `test/viewer-handle.test.tsx`. Per plan.md "Public API additions" and "Overlay architecture":
  - handle fields/actions; `project` option; slug change resets; unknown ids ignored; `play()` explodes first when imploded; focus `suspended` while tour ≠ idle; window `Escape` listener only while `escapeTarget ≠ null`;
  - `useTourClock`: one `setTimeout` to `nextBoundary` while playing (delay computed from the token-derived boundary, never a literal); `tick` dispatch;
  - `TourCaption`: palette-styled DOM caption, `aria-live="polite"`, `data-xploder-caption`, WAAPI fade from tokens (skipped under the static twin), top-left anchor;
  - wrapper attributes `data-xploder-highlight|focus|tour|tour-flow|tour-step|tweening|pulse` written imperatively via the ref;
  - dev-mode warning when `viewer` was built from a different `project` object.
  - `viewer-handle.test.tsx` (test-renderer + a fake `now`): play auto-explodes; play → pause → stop; focus suspended during the tour and restored after stop; `Esc` stops the tour first, then releases focus; slug change resets all three; `selectFlow` while playing → idle on the new flow.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/viewer-handle.test.tsx 2>&1 | tee /tmp/s05-checks/t008.txt
  pnpm --filter xploder exec vitest run test/scene.test.tsx test/frozen-surface.test.ts 2>&1 | tail -4 | tee -a /tmp/s05-checks/t008.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts test/no-color-literals.test.ts 2>&1 | tail -4 | tee -a /tmp/s05-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
- **Evidence:** `evidence/T008-log-handle.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet (default: test log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T009 [US1] [US2] [US3] Playground: fixture C, focus + tour controls, URL params

- **Seam:** `apps/web` playground (thin consumer) ↔ `xploder/react` handle.
- **Files:** `apps/web/app/dev/engine/engine-playground.tsx` per plan.md "Playground" (fixture C; `useTeardownViewer({ initial, project })`; **`layoutOptions={{ explodedGap: 2 }}` on `<TeardownViewer>` (F6 decision A, RFC §9.8)**; layer focus buttons; Play/Pause, Step, Stop; flow selector when `showFlowSelector`; URL params `highlight focus flow tour step loop`; readout rows). No engine logic: only handle fields and actions.
- **Check:**
  ```sh
  set -euo pipefail; pnpm typecheck && pnpm lint && pnpm test 2>&1 | tee /tmp/s05-checks/t009.txt
  pnpm --filter web exec vitest run test/package-consumer.test.ts test/fixture-exclusion.test.ts 2>&1 | tail -4 | tee -a /tmp/s05-checks/t009.txt
  # local fixture server (see rules), then:
  for f in a b c; do pnpm evidence "http://127.0.0.1:4199/dev/engine?fixture=$f&state=exploded" --runs 1 --wait-for '[data-xploder-ready=true]' --out /tmp/s05-checks/t009-$f; done
  pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=c&state=exploded&flow=pickup-ready&tour=paused&step=1' --runs 1 --wait-for '[data-xploder-tour=paused][data-xploder-tweening=false]' --out /tmp/s05-checks/t009-c-tour
  kill "$(cat /tmp/s05-checks/serve.pid)"; echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-playground.txt`, `T009-screenshot-{desktop,mobile}-c-tour.png`, `T009-meta-c-tour.json`, plus the A/B/C desktop shots as `T009-screenshot-desktop-{a,b,c}.png`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on until the G2 STOP (default: screenshots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010 [US5] Scanner upkeep + ⚑ push and draft PR

- **Seam:** new xploder files ↔ exclusivity scanners ↔ package-consumer scan; branch ↔ remote.
- **Files:** `apps/web/test/no-motion-literals.test.ts` and `no-color-literals.test.ts` (non-vacuity lists += the plan.md files); `apps/web/test/package-consumer.test.ts` (identifiers += `Raycaster`, `setColorAt`, `instanceColor`, each with a negative-control sample).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter web exec vitest run test/no-motion-literals.test.ts test/no-color-literals.test.ts test/package-consumer.test.ts test/fixture-exclusion.test.ts test/no-free-orbit.test.ts 2>&1 | tee /tmp/s05-checks/t010.txt
  pnpm build && pnpm --filter web exec vitest run test/fixture-exclusion.test.ts 2>&1 | tail -3 | tee -a /tmp/s05-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T010-OK
  ```
  ⚑ Then the orchestrator pushes `task/s05-engine-core-b` and opens a **draft** PR (granted, RFC §9.3), and records the PR URL and the first CI run in the evidence file.
- **Evidence:** `evidence/T010-log-scanners.txt` (+ PR URL, first CI status)
- **WHAT MURPHY SHOULD TEST/VALIDATE (G2 STOP):**
  1. In Orca's browser on `pnpm dev` → `/dev/engine`: hover slabs on A exploded and imploded; focus a layer, explode/rotate, press Esc; play the tour on A and on C (selector shows two flows), pause/step/stop; toggle the theme while the caption shows (default: accept if all behave as described in spec US1–US3).
  2. Optional: tap-test on your Android phone over the LAN (default: skip).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G2 validation (default: proceed to G3 on "approved").
  2. Your look at the dim level and highlight colour in both themes (default: keep 0.3 / `accent`; `ink` is the fallback highlight).

### T010a [US1] Vertical scroll when zoomed (G2 feedback, RFC §9.10)

- **Seam:** stage scroll container ↔ `camera.setViewOffset` ↔ picking (new modules only; `CameraRig.tsx` and `engine/camera.ts` untouched).
- **Files:** new `src/interaction/scroll.ts` (pure: `scrollExtent(contentTopPx, contentBottomPx, viewportHeight, marginPx)` → px ≥ 0; `offsetFor(scrollTop, extent)` → view-offset px with `offsetFor(extent / 2, extent) = 0` and the centre preserved; `rescaleScroll(prevScrollTop, prevExtent, nextExtent)` keeping the same content point at the viewport centre); new `src/react/scene/ViewScroll.tsx` (inside the Canvas: projects the 8 corners of `bounds.exploded` with the live camera to get the content's px extent, publishes the extent, applies `setViewOffset`/`clearViewOffset` + `updateProjectionMatrix()` + `invalidate()` on scroll, zoom, rotate and resize); **additive** edits to `TeardownViewer.tsx` (stage = scroll container with `overflow-y: auto`, `scrollbar-width: thin`; a sticky viewport-sized canvas wrapper; a spacer div sized by the extent; on first zoom-in the scroll starts centred) and `Scene.tsx` (mount `ViewScroll`); `test/scroll.test.ts`, `test/view-scroll.test.tsx`.
- **Tests:** pure: extent 0 at zoom factor 1 for A/B/C at all 4 azimuths (S4 framing preserved); extent grows with zoom; `offsetFor`/`rescaleScroll` round-trips. Scene (test-renderer): with a view offset of +d px, a world point's projected screen y moves by exactly d px; the real-camera closed-loop pick (as `pick-scene.test.tsx`) still agrees with the pure model under an offset; `clearViewOffset` at zoom 1 → projection matrix equals S4's; still 2 `InstancedMesh`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/scroll.test.ts test/view-scroll.test.tsx test/pick-scene.test.tsx test/scene.test.tsx test/frozen-surface.test.ts 2>&1 | tee /tmp/s05-checks/t010a.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts test/no-color-literals.test.ts test/no-free-orbit.test.ts test/package-consumer.test.ts 2>&1 | tail -4 | tee -a /tmp/s05-checks/t010a.txt
  # browser smoke (sandbox off): fixture A exploded, zoom in ×5 (key '+'), scroll the stage to the top → hovering near the top finds a layer-0 id; scroll to the bottom → hovering near the bottom finds a last-layer id; at zoom 1 the stage has no scrollable overflow
  pnpm typecheck && pnpm lint && pnpm test && echo T010a-OK
  ```
- **Evidence:** `evidence/T010a-log-scroll.txt` (+ smoke output, two screenshots: zoomed top / zoomed bottom)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. In Orca's browser: zoom in, then scroll/swipe up and down to reach the top and bottom layers; at the ends the page scrolls on (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Log the scope addition in the vault revision log (S05 revision 1 of 2, reason `scope-add`) (default: you log it; the RFC §9.10 entry is the repo record).

### T010b [US3] Caption anchors away from the target layer (R6, RFC §9.9)

- **Seam:** tour position ↔ `TourCaption` placement.
- **Files:** `src/react/overlay/TourCaption.tsx` (+ a pure `captionAnchor(targetLayerIndex, layerCount)` in `src/interaction/tour.ts` or a new `src/interaction/caption.ts`: `'bottom'` when the target layer index < layerCount / 2, else `'top'`; `'top'` when there is no target); the caption box is keyed by its anchor; `TeardownViewer.tsx` passes what it needs; tests for the pure function and a render test that the anchor follows the step.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/viewer-handle.test.tsx 2>&1 | tail -4 | tee /tmp/s05-checks/t010b.txt
  # local fixture server, then the mobile tour screenshot at a top-layer step and at a bottom-layer step:
  pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=c&state=exploded&flow=pickup-ready&tour=paused&step=1' --runs 1 --wait-for '[data-xploder-tour=paused][data-xploder-tweening=false]' --out /tmp/s05-checks/t010b-top-target
  pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=c&state=exploded&flow=pickup-ready&tour=paused&step=6' --runs 1 --wait-for '[data-xploder-tour=paused][data-xploder-tweening=false]' --out /tmp/s05-checks/t010b-bottom-target
  pnpm typecheck && pnpm lint && pnpm test && echo T010b-OK
  ```
- **Evidence:** `evidence/T010b-log-caption.txt`, `T010b-screenshot-mobile-{top,bottom}-target.png`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The two mobile shots: the caption never covers the highlighted slab (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010c [US3] Caption: no layout shift between steps (found by T011b, RFC D7)

- **Seam:** `TourCaption` DOM structure ↔ Layout Instability.
- **Finding:** the T011b dry run measured CLS 0.0018 / 0.0008 when a **bottom-anchored** caption changed height between steps (its start point moves). D7's zero-CLS argument assumed a top anchor; T010b's bottom anchor broke it.
- **Fix:** the visible caption box is keyed by `${anchor}:${flowId}:${step}`, so each step **replaces** the box (removal + insertion is not a layout shift) and the WAAPI fade runs on mount. The `aria-live="polite"` announcement moves to a **persistent, visually hidden** region inside the viewer wrapper (always mounted while the tour is not idle, so screen readers keep announcing). The visible box keeps `user-select: text` and the palette styles; its `aria-live` is removed, so the text isn't announced twice. Visually-hidden styles use no colour or motion literals.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/caption.test.ts test/viewer-handle.test.tsx 2>&1 | tail -4 | tee /tmp/s05-checks/t010c.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts test/no-color-literals.test.ts 2>&1 | tail -3 | tee -a /tmp/s05-checks/t010c.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T010c-OK
  ```
  The CLS proof is the T011b probe run (whole-script `cls-zero`).
- **Evidence:** `evidence/T010c-log-caption-cls.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Nothing hands-on (default: probe evidence at T012).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Nothing (default: proceed).

### T010d [US3] Tour clock never stalls; Play/Pause keeps its width (F8, RFC §9.12)

- **Seam:** `useTourClock` timer ↔ tour reducer; playground tour toggle ↔ layout.
- **Files:** `packages/xploder/src/react/useTourClock.ts`: each timer fire dispatches `tick` **and** bumps a local wake counter that is in the effect's dependencies, so the effect always re-arms from the current `positionAt(…).nextBoundary`, even when the tick folded nothing (an early fire). No literal delay. Plus `packages/xploder/test/tour-clock.test.tsx` (vitest fake timers + an injected `now` that lags the timer by a fraction of a millisecond: the tour must still advance through every step of A `live-update`). `apps/web/app/dev/engine/engine-playground.tsx`: the Play/Pause button gets a fixed width that fits the longer label (a Tailwind width utility, or an inline-grid that stacks both labels with the inactive one `invisible`), so toggling never moves Step/Stop.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/tour-clock.test.tsx test/viewer-handle.test.tsx test/tour.test.ts 2>&1 | tail -4 | tee /tmp/s05-checks/t010d.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts test/package-consumer.test.ts 2>&1 | tail -3 | tee -a /tmp/s05-checks/t010d.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T010d-OK
  ```
- **Evidence:** `evidence/T010d-log-tour-clock.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Nothing hands-on (default: the probe's tour groups at T012).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Nothing (default: proceed).

---

## Phase G3: Evidence (US1–US5) → STOP for Murphy after T014

### T011 — split at G3 start (orchestrator, 2026-10-30) into T011a ∥ T011b

Reason: two independent seams (probe vs FPS tool, different files), and the probe gains the G2 additions (zoomed scroll, RFC §9.10; caption anchor, R6/§9.9). Check names below extend plan.md "Evidence CLIs".

### T011a [P] [US5] `fps:engine --scenario tour` (literal60 removed)

- **Seam:** fixture export ↔ in-process `measureFps` with a tour step counter ↔ `fps.json` verdict.
- **Files:** `tools/perf/src/cli/fps-engine.ts` (`--scenario explode|tour`, default `explode`; `literal60` removed from both; verdict `{ rule: 'dropped-frames', droppedFrames0, liveness, pass }` with `liveness = inBand(fps, FPS_NOMINAL, FPS_TOLERANCE)`; tour scenario in-process per plan.md, URL `dev/engine?fixture=a&state=exploded&flow=live-update&tour=play&loop=1`, wait for `[data-xploder-ready=true][data-xploder-tour=playing]`, the `trigger` installs a MutationObserver counting `data-xploder-tour-step` changes, then read the counter and `[data-engine-draw-calls]`; `fps.json` adds `scenario`, `tourStepsAdvanced`, `drawCalls`), `tools/perf/test/fps-engine.test.ts` (verdict function incl. band edges and dropped frames, no `literal60` key anywhere in the output, scenario URL builder), `AGENTS.md` §3 (`pnpm fps:engine [--scenario tour]`).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools exec vitest run test/fps-engine.test.ts 2>&1 | tee /tmp/s05-checks/t011a.txt
  node tools/perf/src/cli/fps-engine.ts --help | tee -a /tmp/s05-checks/t011a.txt
  ! grep -n 'literal60' tools/perf/src/cli/fps-engine.ts && echo 'no literal60' | tee -a /tmp/s05-checks/t011a.txt
  ! grep -nE 'fps\s*(>=|>|<=|<)\s*[0-9]' tools/perf/src/cli/fps-engine.ts && echo 'no literal fps comparison' | tee -a /tmp/s05-checks/t011a.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T011a-OK
  ```
  (The real measurement is T014; T011a only builds and unit-tests the tool. A smoke `--scenario tour` run is allowed for development but its result is not evidence.)
- **Evidence:** `evidence/T011a-log-fps-tool.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Nothing (default: proceed; F2 in scope, RFC §9.2).

### T011b [P] [US1] [US2] [US3] [US4] `engine:probe` S5 groups

- **Seam:** Playwright ↔ `/dev/engine` DOM contract (`data-xploder-*`, `data-engine-*`, `data-engine-control`) ↔ `engine-probe.json`.
- **Files:** `tools/perf/src/engine-probe.ts` (S5 observation types + `evaluateProbe` checks), `tools/perf/src/cli/engine-probe.ts` (drive script, `--only s4|s5`, fixtures a/b/c), `tools/perf/test/engine-probe.test.ts` (one passing synthetic observation + one failing case per S5 group). S4 checks stay as they are (fixture C adds an instance-count check: 5 layers / 13 components, 2 draw calls).
- **S5 check groups:** exactly the plan.md list (hit map, hover incl. pixel-under-pointer, touch incl. the pointer trace, CLS, focus, tour, selector, caption, reduced motion) **plus**:
  - `scroll`: at zoom 1 the stage has no scrollable overflow (`scrollHeight − clientHeight ≤ 1`) → `scroll-zoom1-no-overflow`; after zoom-in ×5 the stage overflows → `scroll-zoomed-overflows`; scroll to the top and hover-sweep the upper third → some layer-0 id → `scroll-top-reaches-top-layer`; scroll to the bottom and sweep the lower third → some last-layer id → `scroll-bottom-reaches-bottom-layer`; azimuth and zoom unchanged by scrolling → `scroll-camera-still`;
  - `captionAnchor`: for each step of C `pickup-ready` (paused via Step), the target's hit-map point (from the exploded hit map, zoom 1) lies outside the caption's bounding box → `caption-clear-of-target` (mobile 390×844 and desktop).
- **`cls-zero` covers the whole probe script's interaction phase** (every context and page: hover, tap, focus, tour, caption, reduced motion, scroll, from `[data-xploder-ready=true]` on each page to the end of each group), counting every entry including `hadRecentInput` ones; page-load entries before ready are reported as `clsLoad` information with the F7 attribution (RFC §9.12). The report lists every entry with its source elements.
- The probe uses the fixture export (`out-fixtures`) served on `127.0.0.1`, mouse sweeps on desktop 1280×800, touch on a `hasTouch`/`isMobile` 390×844 context, and `reducedMotion: 'reduce'` for the reduced group. Pixel checks decode screenshot clips in the page (no new dependency).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools exec vitest run test/engine-probe.test.ts 2>&1 | tee /tmp/s05-checks/t011b.txt
  node tools/perf/src/cli/engine-probe.ts --help | tee -a /tmp/s05-checks/t011b.txt
  # development dry run against the local fixture server (see rules) must exit 0; its output is not the T012 evidence
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s05-checks/t011b-dry 2>&1 | tail -15 | tee -a /tmp/s05-checks/t011b.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T011b-OK
  ```
- **Evidence:** `evidence/T011b-log-probe-tool.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:** 1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:** 1. Nothing (default: proceed).

### T012 [P] [US1] [US2] [US3] [US4] Behaviour evidence: probe run (normal + reduced motion)

- **Seam:** fixture export ↔ `engine:probe` ↔ committed evidence.
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; # local fixture server (see rules)
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s05-checks/t012 2>&1 | tee /tmp/s05-checks/t012.txt
  node -e "const r=require('/tmp/s05-checks/t012/engine-probe.json');const bad=r.checks.filter(c=>!c.pass);console.log(r.checks.length,'checks',bad.length,'failed');if(!r.pass||bad.length)process.exit(1)"
  kill "$(cat /tmp/s05-checks/serve.pid)"; echo T012-OK
  ```
- **Evidence:** `evidence/T012-log-probe.txt`, `T012-engine-probe.json`, `T012-log-touch-trace.json`, `T012-screenshot-{hover-exploded,hover-imploded,tap-exploded,tap-imploded,focus-dimmed,focus-after-explode,focus-after-rotate,tour-a,tour-c-selector,rm-hover,rm-focus,rm-tour}.png`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The real-input screenshots match what you saw at G2 (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T013 [P] [US5] Screenshot matrix (light/dark × hover/focus/tour)

- **Seam:** URL-driven playground states ↔ `pnpm evidence` ↔ committed screenshots.
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; # local fixture server (see rules)
  B='http://127.0.0.1:4199/dev/engine?fixture=a&state=exploded'
  for s in light dark; do
    pnpm evidence "$B&highlight=tide-view-model" --runs 1 --color-scheme $s --wait-for '[data-xploder-highlight=tide-view-model][data-xploder-tweening=false]' --out /tmp/s05-checks/t013-hover-$s
    pnpm evidence "$B&focus=data" --runs 1 --color-scheme $s --wait-for '[data-xploder-focus=data][data-xploder-tweening=false]' --out /tmp/s05-checks/t013-focus-$s
    pnpm evidence "$B&flow=live-update&tour=paused&step=2" --runs 1 --color-scheme $s --wait-for '[data-xploder-tour=paused][data-xploder-tour-step="2"][data-xploder-tweening=false]' --out /tmp/s05-checks/t013-tour-$s
  done
  pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=c&state=exploded&flow=push-failed&tour=paused&step=0' --runs 1 --wait-for '[data-xploder-tour=paused][data-xploder-tweening=false]' --out /tmp/s05-checks/t013-c-selector
  ls /tmp/s05-checks/t013-*/screenshot-*.png | wc -l   # expect 14
  kill "$(cat /tmp/s05-checks/serve.pid)"; echo T013-OK
  ```
  Also check the mobile tour shots for caption/top-layer overlap (RFC R6) and note the finding in the log.
- **Evidence:** `evidence/T013-screenshot-{mobile,desktop}-{light,dark}-{hover,focus,tour}.png` (12), `T013-screenshot-{mobile,desktop}-c-selector.png`, `T013-meta-*.json`, `T013-log-matrix.txt` (incl. the R6 overlap note)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The 12 shots: highlight visible in both themes (dark is the weaker one, F5), dim level reads as "receded but legible", caption readable and clear of the top layer on mobile (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. A decision only if the dark-theme highlight looks weak: switch to `ink` (default: keep `accent`).

### T014 [US5] FPS evidence during a live tour (run alone)

- **Seam:** fixture export ↔ `fps:engine --scenario tour` ↔ AC5 verdict. **Runs with no other browser task in parallel** (T012/T013 must have finished) so the measurement isn't disturbed.
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; pnpm fps:engine --scenario tour --out /tmp/s05-checks/t014 2>&1 | tee /tmp/s05-checks/t014.txt
  node -e "const r=require('/tmp/s05-checks/t014/fps.json');const ok=r.verdict.pass===true&&r.droppedFrames===0&&r.verdict.liveness===true&&r.windowMs>=5000&&r.tourStepsAdvanced>=3&&r.drawCalls===2;console.log(JSON.stringify({droppedFrames:r.droppedFrames,liveness:r.verdict.liveness,windowMs:r.windowMs,tourStepsAdvanced:r.tourStepsAdvanced,drawCalls:r.drawCalls,info:{fps:r.fps,rafFps:r.rafFps,intervalsMs:r.intervalsMs}}));if(!ok)process.exit(6)"
  echo T014-OK
  ```
  A failing verdict is **not** rerun to green (EVIDENCE.md §6): one rerun only for infrastructure exits 3/4; otherwise escalate with the evidence.
- **Evidence:** `evidence/T014-fps.json`, `T014-log-fps.txt`, `T014-screenshot-desktop.png`, `T014-meta.json` (Chromium version, command, exit code, `127.0.0.1` target)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The `fps.json` summary: 0 dropped frames, liveness true, ≥ 3 steps advanced, 2 draw calls (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G3 validation at the STOP after this task (default: proceed to G4 on "approved").

---

## Phase G4: Ship (US5) → STOP for Murphy after T015

### T015 [US5] ⚑ PR ready, full CI, AC self-check; post-merge prod-404

- **Seam:** slice branch ↔ CI ↔ `main`.
- **Files:** `evidence/AC-selfcheck.md` (AC1–AC6 × evidence file × verdict, incl. the frozen-surface diff log), `evidence/T015-ci.txt`, `evidence/T015-log-surface-diff.txt`.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build 2>&1 | tail -5 | tee /tmp/s05-checks/t015.txt
  git diff --stat --exit-code 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) | tee /tmp/s05-checks/t015-surface.txt && echo SURFACE-DIFF-EMPTY
  gh pr checks --watch 2>&1 | tee -a /tmp/s05-checks/t015.txt   # all required + listed checks green
  ```
  ⚑ The orchestrator marks the PR ready, then **waits for Murphy's "merge"** (RFC §9.4). After the merge: capture the main-push `perf: fixture exclusion` log (`/dev/engine` 404 on production) into `evidence/T015-ci.txt` and complete the AC6 prod-404 row in a follow-up evidence commit on `main` via PR, as in S04.
- **Evidence:** `evidence/T015-ci.txt`, `T015-log-surface-diff.txt`, `AC-selfcheck.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation: play the tour in Orca's browser via `pnpm dev` locally, since `/dev/engine` is excluded from previews and production (default: same walkthrough as at G2).
  2. The AC self-check table (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" when you're satisfied (default: no merge without it).
  2. After the merge: nothing; the agent collects the prod-404 log and reminds you to `git pull` the original clone.

---

## Dependencies & order

T001 → (T002 ∥ T003) → T004 → T005 → **STOP G1** → T006 → T007 → T008 → T009 → T010 (⚑ push + draft PR) → T010a → T010b (G2 feedback) → **STOP G2** → (T011a ∥ T011b) → (T012 ∥ T013) → T014 (alone) → **STOP G3** → T015 → **STOP G4**.

T004 precedes T005 so the tour tests include fixture C's two flows. T014 runs after T012/T013 so no other browser load overlaps the FPS window.

## FR ↔ task coverage

| FR | AC | Tasks |
|---|---|---|
| FR-001 | AC1 | T002, T003, T006, T007, T010, T012, T013 |
| FR-002 | AC2 | T003, T006, T008, T012, T013 |
| FR-003 | AC3 | T001, T004, T005, T008, T009, T012, T013 |
| FR-004 | AC4 | T005, T006, T008, T012 |
| FR-005 | AC5 | T011, T014 |
| FR-006 | AC6 | T001, T009, T010, T013, T015 |
