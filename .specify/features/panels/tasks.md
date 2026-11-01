# Tasks: S07 Panels (Component Detail · Case Study · Tech Chips)

**Input:** `rfc.md` (approved, §9; Q-TOUR = D6; R1–R7), `spec.md`, `plan.md` in `.specify/features/panels/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`). The sandbox is on for Node-only tasks and off for browser tasks (S3 note: the sandbox can't launch Chromium). Writes are limited to the task worktree and `/tmp/s07-checks`.

**Escalation (RFC D13):**
- Tier 1.5 (OpenRouter) is **DORMANT** (`OPENROUTER_API_KEY` unset), so it is skipped and recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes the task personally on Murphy's go.
- Each report states the finishing tier and any skip.

**Usage pacing:**
- Each phase group starts in a fresh 5h window.
- Murphy states "5h: N%" at gates.
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Perf doctrine:** dropped-frames style only. **No task check may compare fps against a literal threshold.** Liveness is the harness band verdict; raw fps is information.

**Reachability:** zoom stays reachable through S5 scroll, **with a panel open** (T012 `panel-max-zoom-reach` + top/bottom screenshots in T013).

## Ledger (resume point — update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (32 files sealed; negative control red) | 1 (Flash, sandbox on); full check re-run by orchestrator outside the sandbox | evidence/T001-log-guard.txt | b12badb |
| T002 | ☑ | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T002-log-state.txt | 0b35dda |
| T003 | ☑ (+ orchestrator review fix: hysteresis never keeps a stage-3/4 size, 2 tests) | 1 (Flash, sandbox on) + orchestrator review fix | evidence/T003-log-placement.txt | c847ce3 + G1 integration |
| T004 | ☑ (local `PanelClickEvent` replaced by `PanelEvent` at integration) | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T004-log-tour-click.txt | e642dd6 + G1 integration |
| T005 | ☑ (+ `name` optional → falls back to id, 1 test) | 1 (Flash, sandbox on) + orchestrator integration fix | evidence/T005-log-content.txt | b2530bf + G1 integration |
| T006 | ☑ (local `Dock` replaced by `place.ts` import) | 1 (Flash, sandbox on); full check re-run by orchestrator | evidence/T006-log-motion.txt | 0f252dc + G1 integration |
| T007 | ☑ (5 tests incl. real-handle jump/pause and pickAt = S5 picker on 20 rays) | 1 (Flash, sandbox on) + orchestrator (`executeTourCommand` accepts null) | evidence/T007-log-hooks.txt | 6b8186a |
| T008 | ☑ (+ 3 review fixes: same-dispatch outside-click guard, re-open enter animation, program highlight; interaction smoke log) | 1 (Flash, sandbox off) + orchestrator review fixes + smoke | evidence/T008-{log-detail.txt,screenshot-*.png,meta-*.json} | d253281 |
| T009 | ☑ (+ heading focus ring removed) | 1 (Flash, sandbox off) + orchestrator review fix | evidence/T009-{log-case-study.txt,screenshot-*.png,meta-*.json} | 69b2aa8 |
| T010 | ☑ + ⚑ pushed, draft PR (scanner gained a bare CSS timing-shorthand rule) | 1 (Flash, sandbox on); build + negative controls re-run by orchestrator | evidence/T010-log-scanners.txt, G2-log-combined.txt | 7aa81c6 |
| T010a | ☑ (G2 feedback: part lettering; smoke 72/72 states all parts lettered, 0 visible S6 pills) | 1 (Flash: -1 sandbox on, -2 sandbox off) + orchestrator re-run + scanner lists | evidence/T010a-{log-lettering.txt,log-smoke.txt,screenshot-*.png} | see merge |
| T010c | ☑ (G2 feedback 2: one text direction in all rotations — smoke 16/16 states u=(0.866, 0.5); names wrap) | 1 (Flash, sandbox off) + orchestrator verification | evidence/T010c-{log-lettering.txt,screenshot-*.png} | see merge |
| T010d+T010b | ◐ WIP on branch `task/s07-t010d-phone-column` (worktree `../s07-t010d`), not merged. Phone 1× compact right column ✓; layers lettered on the plates ✓. Review defects: (1) when a layer's iso lettering doesn't fit (C services at phone 1×), the plain fallback overlaps the S6 '5 layers' label; (2) when zoomed, the fallback sits left of an off-screen plate corner and is clipped ('T'). Fix plan: hide S6 layer labels per layer only where iso lettering succeeded (selector `[data-xploder-label="layer:<id>"]`) and drop the custom fallback, so S6's collision-free label remains the fallback; also review the horizontally condensed column lines | 1 (Flash, sandbox off) | evidence/T010d-{log.txt,log-phone-margin-measure.txt,screenshot-*.png} | — |
| T011 | ☐ | | | |
| T012 | ☐ | | | |
| T013 | ☐ | | | |
| T014 | ☐ | | | |
| T015 | ☐ | | | |

Resume prompt for a fresh session: _"Read `.specify/KICKOFF-S07.md` and `.specify/features/panels/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."_

## Format & rules (apply to every task)

- **Task heading:** `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task.
- **Stories:** **US1** learns what a part is · **US2** the panel never hides what you picked · **US3** reads the story · **US4** tech at a glance · **US5** the tour stays a guide · **US6** reviewer trusts it.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:**
  - Each task runs in a fresh worktree from `task/s07-panels`, on branch `task/s07-t0NN-<slug>`.
  - After the check passes, merge back into the slice branch without squashing.
  - Commit message: `S07/T0NN: <title>`.
  - Remove the worktree only after the merge.
- **Orchestrator-only steps (⚑):** `git push`, opening/updating the PR, merging the PR (only after Murphy says "merge"). Flash prepares; the orchestrator executes.
- **Guards (every task):** all must print OK (plan.md "Guards"):
  ```sh
  git diff --quiet 3f06c8f -- .specify/slices .specify/KICKOFF-S07.md && echo FROZEN-OK
  git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
  git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK
  git diff --quiet 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) && echo SURFACE-S6-OK   # from T001 on
  test -z "$(git log --oneline 3f06c8f..HEAD -- .specify/slices .specify/KICKOFF-S07.md)" && echo BRIEF-HISTORY-OK
  ```
- **Every check also runs:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Never:**
  - Dependencies and exports: add dependencies; add a package `exports` subpath; change an existing prop, type or signature (additive optional props and new exports only, Q2); deep-import `xploder/src` from the app.
  - Sealed and frozen code:
    - edit a file listed in the S2/S4, S5 or S6 manifests, or an existing S2–S6 test;
    - change the tour reducer, the pointer reducer or the viewer handle (the jump is composed from public actions, D6);
    - change camera, layout, explode, emphasis, overlay or callout behaviour.
  - Renderer: add a WebGL object; put text into WebGL; import GSAP or `@react-three/drei`.
  - Panel geometry: move a mounted panel surface by changing `top/left/right/bottom/transform` (re-dock = remount, R1); measure panel content to place it.
  - Literals:
    - motion literals (durations, easings, staggers, timer delays, CSS `transition` strings) outside `packages/xploder/src/motion/`;
    - hex/`rgb()`/`hsl()` colours outside `packages/xploder/src/theme/`.
  - Chips: make a chip focusable or navigable.
  - Perf: compare fps to a literal number in any tool or check; add a threshold override to any perf CLI; set `PERF_FIXTURES` on Vercel.
  - Hygiene: put private hostnames, IPs or tokens anywhere (`127.0.0.1` is fine); run `specify init`; use bare `git stash`.
- **Evidence** goes to `.specify/features/panels/evidence/T0NN-*.{txt,png,json}` (naming per `.specify/EVIDENCE.md` §4). Throwaway scripts live in `/tmp/s07-checks/`. Run `mkdir -p /tmp/s07-checks .specify/features/panels/evidence` first, and run every check under `set -euo pipefail`.
- **Dev server** (T008–T010): `pnpm --filter web dev`, then use `http://localhost:3000` (not `127.0.0.1`: Next 16 dev blocks `/_next` for that origin).
- **Local fixture server** (T011–T014):
  - start: `pnpm build:fixtures && (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s07-checks/serve.pid)`;
  - wait: `until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done`;
  - stop: `kill "$(cat /tmp/s07-checks/serve.pid)"`.

---

## Phase G1: Pure core (US1–US6) → STOP for Murphy after T006

### T001 [US6] S6 frozen manifest (seal) + negative control

- **Seam:** S6 surface ↔ CI (third hash manifest).
- **Files:**
  - `packages/xploder/test/frozen-surface.s6.paths`: the S6 list from plan.md "Guards", one path per line (directories allowed).
  - `packages/xploder/test/frozen-surface.generate-s6.sh`: a copy of `frozen-surface.generate-s5.sh` with `base=0b2c678`, the S6 paths/manifest file names, and the note `"S06 seal (S07 RFC D1). A later slice that changes a listed file regenerates this manifest in the same diff and states why."`. Run it to produce `frozen-surface.s6.manifest.json`.
  - `packages/xploder/test/frozen-surface.test.ts`: **append** `describe('frozen S6 surface', …)` (same shape as the S5 block). It asserts `base === '0b2c678'`, the exact note, ≥ 25 entries, and the presence of `src/overlay/model.ts`, `src/look/tokens.ts`, `src/react/scene/OverlayProjector.tsx` and `test/overlay-place.test.ts`. The existing describes are not modified.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s07-checks .specify/features/panels/evidence
  bash packages/xploder/test/frozen-surface.generate-s6.sh | tee /tmp/s07-checks/t001.txt
  pnpm --filter xploder exec vitest run test/frozen-surface.test.ts 2>&1 | tee -a /tmp/s07-checks/t001.txt
  printf ' ' >> packages/xploder/src/overlay/model.ts
  if pnpm --filter xploder exec vitest run test/frozen-surface.test.ts >/tmp/s07-checks/t001-neg.txt 2>&1; then echo 'NEG-CONTROL-FAILED'; exit 1; fi
  git checkout -- packages/xploder/src/overlay/model.ts; echo 'S6 negative control: red as expected' | tee -a /tmp/s07-checks/t001.txt
  git diff --stat --exit-code 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) | tee -a /tmp/s07-checks/t001.txt && echo S6-DIFF-EMPTY | tee -a /tmp/s07-checks/t001.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (generator output, test log, negative control, empty S6 diff, manifest entry count)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the negative control shows the S6 guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed with the S6 list in plan.md).

### T002 [P] [US1] Panel state machine

- **Seam:** UI events ↔ `src/panel/state.ts` (pure reducer used by `useViewerPanels` in T007).
- **Files:**
  - `packages/xploder/src/panel/state.ts` per plan.md "Panel state machine".
  - `packages/xploder/test/panel-state.test.ts`:
    - a table-driven test of every RFC D4 cell (3 states × `slab(X)`, `slab(same)`, `slab(null)`, `outside`, `escape`, `closeControl`, `toggleCaseStudy`, `openCaseStudy`, `openDetail`, `reset`);
    - no-op events return the **same object**;
    - `consumesEscape` is false only for `closed`;
    - one long sequence: open A → switch B → same-slab B → open A → escape → caseStudy toggle → toggle → outside.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/panel-state.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-log-state.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log = the AC1 "state-machine tests green" proof).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T003 [P] [US2] Placement + the AC2 matrix

- **Seam:** S6 projected hull + S5 scroll offset ↔ `src/panel/place.ts` (never-cover invariant).
- **Files:**
  - `packages/xploder/src/panel/look.ts` (`PANEL_LOOK`) and `packages/xploder/src/panel/place.ts`, per plan.md "Placement".
  - `packages/xploder/test/panel-place.test.ts`. It builds frames with S6's pure `overlayFrame(layoutProject(p, resolveViewerLayoutOptions()), progress, view)`, where `view.zoom = fitZoom(exploded bounds, canvas) × zoomFactor`, the same method as `evidence/RFC-log-slab-extent-sweep.txt`. The scroll extent for zoom > 1 follows S5 `scrollExtent` with `VIEW.fitMargin`. It covers:
    - **(a) AC2 matrix:**
      - inputs: fixtures A/B/C × positions {top, bottom, left, right}, where position = the component whose visible-rect centre is min-y / max-y / min-x / max-x for that view × {imploded (0), exploded (1)} × zoom {1, 3 at scroll offsets −e/2, 0, +e/2} × 4 azimuths × canvases {328×444, 358×506, 768×614, 1216×480};
      - assertions: the placement rect is disjoint from the hull **polygon** (separating-axis test against the rect) and inside the canvas; on wide canvases a left-position slab docks `right` and a right-position slab docks `left`; on narrow canvases top → `bottom` and bottom → `top`; stage ≤ 2 for every fixture case;
      - it prints a stage histogram;
    - **(b) a scroll sweep** (17 offsets) at 3× for one slab per fixture: the dock changes only when the current size no longer fits (hysteresis, R1);
    - **(c) synthetic 1×1 and 2×1 projects** across the same grid: always disjoint and inside, stages 3–4 allowed and counted;
    - **(d)** `PANEL_LOOK.gapPx >= 2 * motion.distances.hoverLift` (R2);
    - **(e)** case-study sizes: `min(448, 0.5W)` on wide, `min(0.7H, 480)` on narrow;
    - **(f)** `visibleSlabRect`: the shift by `offsetY`, the clip, and `null` when fully off-screen.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/panel-place.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t003.txt
  grep -E 'stage histogram' /tmp/s07-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-placement.txt` (incl. the stage histogram per fixture and synthetic)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The histogram shows fixtures only at stages 1–2 (default: agent log; visual judgement at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed with the RFC D3 sizes; tuning happens once at G2).

### T004 [P] [US5] Tour-click decision + jump sequence

- **Seam:** slab hit + S5 tour state ↔ `src/panel/tourClick.ts` ↔ the sealed `tourReducer` (via public action names only).
- **Files:**
  - `packages/xploder/src/panel/tourClick.ts` per plan.md "Tour-click decision".
  - `packages/xploder/test/panel-tour-click.test.ts`:
    - (a) the `resolveSlabClick` table: hit in path / not in path / `null` × status `idle|playing|paused|ended`;
    - (b) `stepForComponent`: first occurrence, the next occurrence after the current step for repeats (`['request','request']`), wrap to the first, `null` when absent;
    - (c) the `jumpSequence(k, resume)` shape;
    - (d) the sequence **applied to the sealed `tourReducer`** (imported from `../src/interaction/tour`, flows from fixture A, beat = `motion.durations.tourBeat`):
      - from playing at step 1, `jump(3, true)` → `{status:'playing', step:3}` and `positionAt(state, now).componentId === 'tide-repository'`;
      - from paused at 1, `jump(4, false)` → `{status:'paused', step:4}`;
      - from ended, `jump(0, false)` → paused at 0;
    - (e) pause then play keeps the step (resume from the current step).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/panel-tour-click.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-tour-click.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; you click it yourself at G2).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q-TOUR as confirmed at Gate 1).

### T005 [P] [US1] [US3] [US4] Content view-models (detail, case study, chips)

- **Seam:** parsed project + tech registry ↔ `src/panel/content.ts`.
- **Files:**
  - `packages/xploder/src/panel/content.ts` per plan.md "Content models".
  - `packages/xploder/test/panel-content.test.ts`, with `parseProject(fixture, {registry})` for A/B/C:
    - (a) for **every** component, `detailModel` equals the JSON: name, summary, description, kind/status, chip labels = the registry `label` in `techs` order with `category` and `colorRef = tech.color`, metrics, links with `rel === 'noopener noreferrer'` and `target === '_blank'`;
    - (b) `beachgoer` → `chips`, `metrics` and `links` are empty arrays (the renderer omits them);
    - (c) `caseStudyModel` → name, tagline and headline, sections in the order problem/approach/outcome (only present keys), metrics = `story.metrics`, C → `metrics: []`;
    - (d) `chipModels(['kotlin','nope'])` without a registry → raw labels, no category; with the registry, unknown ids don't occur (parse rejects them);
    - (e) `detailModel(project, 'missing')` → `null`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/panel-content.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-content.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: Q1, no Decisions section).

### T006 [P] [US6] Panel motion helper

- **Seam:** `MotionTokens` (S2) ↔ `src/panel/motion.ts` (WAAPI keyframes/options).
- **Files:**
  - `packages/xploder/src/panel/motion.ts` per plan.md "Motion".
  - `packages/xploder/test/panel-motion.test.ts`:
    - for each dock, the enter keyframes start at `opacity 0` with a translate of `distances.panelOffset` toward that dock's edge and end at `opacity 1`, no translate; exit is the reverse;
    - `duration === durations.panelEnter * 1000` (exit: `panelExit`) and `easing === easings.panelEnter.css` (exit: `panelExit`);
    - `panelMotion(resolveMotion(true), …)` returns `null` for both phases;
    - the source contains no numeric duration or easing literal other than the named `MILLISECONDS_PER_SECOND`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/panel-motion.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t006.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts 2>&1 | tee -a /tmp/s07-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-log-motion.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed). **STOP after T006: G1 gate** (log bundle + guard lines).

---

## Phase G2: Renderers + wiring + playground (US1–US5) → STOP for Murphy after T010

### T007 [US1] [US5] Panel handle, slab click and tour executor (hooks, test-renderer)

- **Seam:** stage click + `PickBridge` ↔ `pickAt` ↔ `resolveSlabClick` ↔ the real `useTeardownViewer` handle + `useViewerPanels`.
- **Files:**
  - `packages/xploder/src/react/panel/pickAt.ts` (R7), `useSlabClick.ts`, `useViewerPanels.ts` per plan.md "Renderers".
  - `packages/xploder/src/react/panel/executeTourCommand.ts`, an exported helper `executeTourCommand(actions, command)` used by `TeardownViewer` in T008.
  - `packages/xploder/test/viewer-panels.test.tsx` (test-renderer, the `viewer-handle.test.tsx` pattern):
    - (a) `useViewerPanels` actions drive the state (openDetail, toggleCaseStudy ×2, close);
    - (b) with a real `useTeardownViewer` on fixture A, inside one `act()`:
      - tour playing at step 1 + click `tide-repository` → `executeTourCommand` → `handle.tour.step === 3`, `status === 'playing'`;
      - paused at 1 + click path index 4 → step 4, paused;
      - playing + `forecast-details-panel` → status `paused`, the panel state is `detail forecast-details-panel`;
      - then `actions.play()` → playing at the same step;
    - (c) `pickAt` returns the same component id as S5's picker on 20 seeded rays (reusing the `pick-scene.test.tsx` camera setup).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/viewer-panels.test.tsx --reporter verbose 2>&1 | tee /tmp/s07-checks/t007.txt
  pnpm --filter xploder exec vitest run test/viewer-handle.test.tsx test/tour.test.ts test/pointer.test.ts 2>&1 | tail -5 | tee -a /tmp/s07-checks/t007.txt   # S5 suites untouched, green
  pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-hooks.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T008 [US1] [US2] [US4] `PanelLayer` + `DetailPanel` + `TechChips`, wired into `TeardownViewer`

- **Seam:** overlay events + panel state ↔ `PanelLayer` (placement, CSS edge anchoring, listeners, focus, motion) ↔ the viewer wrapper DOM.
- **Files:**
  - `packages/xploder/src/react/panel/{PanelLayer,DetailPanel,TechChips}.tsx` per plan.md "Renderers".
  - `packages/xploder/src/react/TeardownViewer.tsx`: additive wiring per plan.md "`TeardownViewer` wiring", steps 1–7. `resolveViewerLayoutOptions(` stays.
  - `packages/xploder/src/react/index.ts`: export `useViewerPanels` and the types `ViewerPanelsHandle`, `PanelState`.
  - `apps/web/app/dev/engine/engine-playground.tsx` (minimal): pass `registry={registry}` + `panels={panels}` (`useViewerPanels()`), and apply `?select=<componentId>` once via `panels.actions.openDetail`. T009 extends the playground.
- **Check:**
  ```sh
  set -euo pipefail; pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -8 | tee /tmp/s07-checks/t008.txt
  pnpm --filter web dev >/tmp/s07-checks/dev.log 2>&1 & echo $! > /tmp/s07-checks/dev.pid
  until curl -sf -o /dev/null http://localhost:3000/dev/engine; do sleep 0.5; done
  for s in light dark; do pnpm evidence 'http://localhost:3000/dev/engine?fixture=a&state=exploded&select=tide-repository' --runs 1 --color-scheme $s --wait-for '[data-xploder-panel-ready="true"]' --out /tmp/s07-checks/t008-$s; done
  kill "$(cat /tmp/s07-checks/dev.pid)"; echo T008-OK
  ```
  If the evidence CLI is not the right tool for a clicked state, a throwaway Playwright script in `/tmp/s07-checks/` clicks `tide-repository` via a hit-map point and screenshots it (orchestrator browser step if the sandbox blocks Chromium).
- **Evidence:** `evidence/T008-log-detail.txt`, `T008-screenshot-{mobile,desktop}-{light,dark}.png`, `T008-meta-{light,dark}.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing yet (default: judged in the G2 walkthrough).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T009 [US3] `CaseStudyPanel` + playground chrome (Case study button, registry, URL params)

- **Seam:** `useViewerPanels` ↔ the app chrome button ↔ `CaseStudyPanel` in `PanelLayer`; playground URL params (R4).
- **Files:**
  - `packages/xploder/src/react/panel/CaseStudyPanel.tsx` (mounted by `PanelLayer` for `caseStudy`).
  - `apps/web/app/dev/engine/engine-playground.tsx` per plan.md "Playground", on top of T008's minimal wiring: the "Case study" button (`data-engine-control="case-study"`, `aria-expanded`, `aria-controls`), `?panel=case-study`, and the stats `Panel` entry.
- **Check:**
  ```sh
  set -euo pipefail; pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -8 | tee /tmp/s07-checks/t009.txt
  pnpm --filter web dev >/tmp/s07-checks/dev.log 2>&1 & echo $! > /tmp/s07-checks/dev.pid
  until curl -sf -o /dev/null http://localhost:3000/dev/engine; do sleep 0.5; done
  for s in light dark; do pnpm evidence 'http://localhost:3000/dev/engine?fixture=a&state=exploded&panel=case-study' --runs 1 --color-scheme $s --wait-for '[data-xploder-panel-ready="true"]' --out /tmp/s07-checks/t009-$s; done
  kill "$(cat /tmp/s07-checks/dev.pid)"; echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-case-study.txt`, `T009-screenshot-{mobile,desktop}-{light,dark}.png`, `T009-meta-{light,dark}.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing yet (default: judged in the G2 walkthrough).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010 [US4] [US6] Scanner upkeep + ⚑ push + draft PR

- **Seam:** S7 sources ↔ hex/motion scanners and the package-consumer test ↔ CI.
- **Files:**
  - `apps/web/test/no-color-literals.test.ts` and `apps/web/test/no-motion-literals.test.ts`: an `S07_SOURCE_FILES` list (`panel/{state,place,tourClick,content,look,motion}.ts`, `react/panel/{PanelLayer,DetailPanel,CaseStudyPanel,TechChips}.tsx`, `react/panel/{useSlabClick,useViewerPanels,pickAt,executeTourCommand}.ts`) with the existing non-vacuity assertion.
  - `apps/web/test/package-consumer.test.ts`: `useViewerPanels` in the `xploder/react` identifiers.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm --filter web exec vitest run test/no-color-literals.test.ts test/no-motion-literals.test.ts test/package-consumer.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t010.txt
  # negative controls: a hex and a duration literal in a panel file must turn the scanners red
  printf "\nexport const NEG = '#123456';\n" >> packages/xploder/src/panel/look.ts
  if pnpm --filter web exec vitest run test/no-color-literals.test.ts >/dev/null 2>&1; then echo NEG-HEX-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/panel/look.ts
  printf "\nexport const NEG = 'opacity 320ms ease';\n" >> packages/xploder/src/panel/look.ts
  if pnpm --filter web exec vitest run test/no-motion-literals.test.ts >/dev/null 2>&1; then echo NEG-MOTION-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/panel/look.ts; echo 'negative controls: red as expected' | tee -a /tmp/s07-checks/t010.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T010-OK
  ```
  ⚑ The orchestrator pushes `task/s07-panels` and opens a **draft PR** (RFC §9.3) with the RFC/spec summary and the ledger.
- **Evidence:** `evidence/T010-log-scanners.txt`, `evidence/G2-log-combined.txt` (the guard lines + full check)
- **WHAT MURPHY SHOULD TEST/VALIDATE (G2 walkthrough, Orca's browser, `pnpm dev`, `/dev/engine`):**
  1. Click a few slabs on fixtures A and C, desktop and phone width: the panel appears on the far side and never covers the slab; same-slab tap, Esc, ✕ and tapping elsewhere all close it (default: accept or give tuning notes on sizes/look).
  2. Zoom to max, scroll top ↔ bottom with a panel open: the panel re-docks, the slab stays uncovered, the drawing stays scrollable (default: accept).
  3. "Case study" on A, B and C in light and dark: readable, scrolls, closes (default: accept).
  4. Play a tour on A, click a part on the route (jumps, keeps playing) and a part off the route (pauses + panel), then Play (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G2 feedback or "approved" (default: proceed to G3 on "approved"; tuning feedback becomes T010a… within G2).

---

### T010a [US1] [US2] Isometric part lettering (G2 feedback, RFC §9.7) — Route 1

- **Seam:** S6 overlay events + live camera ↔ new pure `src/lettering/` ↔ new `react/lettering/PartLettering.tsx` inside the canvas viewport; S6 part tags hidden through the S6 DOM contract. **No sealed file changes** (S2/S4/S5/S6 diffs stay empty).
- **Steps:**
  - **T010a-1 (pure):** `src/lettering/{look,faces,place,model}.ts` + `test/lettering.test.ts`.
    - The matrix covers fixtures A/B/C × 4 azimuths × exploded × canvases {328×444, 358×506, 768×614, 1216×480} × zoom ladder 1…3 × scroll offsets.
    - Pass rules: **every component labelled** (lettered or marked; 0 missing); lettering block inside its face; not mirrored; no overlap with upper-layer hulls or plates; number ≥ 9 px. The fallback count is printed.
  - **T010a-2 (DOM):** `PartLettering.tsx` + `TeardownViewer` wiring (projection at settle from the pick-bridge camera, scroll translate, tag hiding, states).
    - Smoke: fixtures A/C × zoom 1×–3× × scroll top/middle/bottom × light/dark. Each component visible on screen has its number; screenshots.
- **Check:** `pnpm --filter xploder exec vitest run test/lettering.test.ts` green; full check green; the five guard lines OK; smoke log + screenshots.
- **Evidence:** `evidence/T010a-{log-lettering.txt,log-smoke.txt,screenshot-*.png}`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Zoom in on A and C and scroll top to bottom: every part shows its number, plus its name when zoomed, lettered on the face (default: accept, or tuning notes).
  2. Default zoom on phone and desktop: numbers on faces, and the desktop columns kept as the parts list (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Revision 1 of 2 logged in the vault (default: Murphy logs it).

## Phase G3: Evidence (US1–US6) → STOP for Murphy after T014

### T011 [US1]–[US6] `engine:probe --scope s7` (panel probe group)

- **Seam:** fixture export ↔ `tools/perf/src/panel-probe.ts` ↔ `engine-probe.json`.
- **Files:**
  - `tools/perf/src/panel-probe.ts`: pure evaluators (point-in-rect, centroid extremes, CLS attribution inside/outside the wrapper, the never-covers verdict) + page drivers for every check in plan.md "Evidence CLIs". A reduced-motion context is used for `rm-panel-instant`; a `hasTouch` mobile context for `panel-open-touch`.
  - `tools/perf/src/cli/engine-probe.ts`: `--scope s7` added, and included in `all`.
  - `tools/perf/test/panel-probe.test.ts`: evaluator unit tests, including a synthetic overlapping case that must fail and a CLS entry inside the wrapper that must fail.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools exec vitest run test/panel-probe.test.ts --reporter verbose 2>&1 | tee /tmp/s07-checks/t011.txt
  pnpm engine:probe --help | grep -q 's7' && echo HELP-OK | tee -a /tmp/s07-checks/t011.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T011-OK
  ```
- **Evidence:** `evidence/T011-log-probe-tool.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; the browser path is validated in T012).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T012 [US1] [US2] [US4] [US5] [US6] Probe evidence run (all S4/S5/S6/S7 checks; normal + reduced motion)

- **Seam:** fixture export ↔ `engine:probe` (all scopes) ↔ committed evidence.
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; # local fixture server (see rules)
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s07-checks/t012 2>&1 | tee /tmp/s07-checks/t012.txt
  node -e "const r=require('/tmp/s07-checks/t012/engine-probe.json');const bad=r.checks.filter(c=>!c.pass);console.log(r.checks.length,'checks',bad.length,'failed');const need=['panel-cls-strict','panel-stage-invariant','rm-panel-instant','panel-draw-calls','panel-max-zoom-reach','panel-hidden-while-moving','tour-jump-playing','tour-jump-paused','tour-notinflow-pause','tour-resume-same-step','tour-escape-layering','tour-jump-no-caption-gap','chips-display-only','case-study-scroll','scroll-top-reaches-top-layer','scroll-bottom-reaches-bottom-layer','overlay-cls-zero','draw-calls-mid-tour'];for(const n of need){if(!r.checks.some(c=>c.name===n&&c.pass)){console.log('missing or failed',n);process.exit(1)}}const cover=r.checks.filter(c=>c.name.startsWith('panel-never-covers-'));if(cover.length<48){console.log('never-covers matrix incomplete',cover.length);process.exit(1)}if(!r.pass||bad.length)process.exit(1)"
  kill "$(cat /tmp/s07-checks/serve.pid)"; echo T012-OK
  ```
  48 = 4 positions × 2 states × 2 palettes × 3 views (zoom 1×, max zoom scrolled to the top, max zoom scrolled to the bottom). The slab finder re-runs in each view, so the position slab is always the visible extreme of that view.
- **Evidence:** `evidence/T012-log-probe.txt`, `T012-engine-probe.json`, `T012-log-interaction.txt` (the open/close/focus/keyboard/tour log extracted from the JSON), `T012-screenshot-*.png` emitted by the probe
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The interaction log reads like what you clicked at G2 (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T013 [P] [US2] [US3] [US4] [US5] Screenshot matrix

- **Seam:** fixture export ↔ `pnpm evidence` (R4 URL params) / the probe's clicked shots ↔ committed PNGs + meta.
- **Files:** evidence only. Light + dark for each of:
  - (a) the detail panel at the 4 slab positions: left/right on desktop (1280×800) and top/bottom on mobile (390×844), using the T012 slab-finder ids;
  - (b) the case study, mobile + desktop;
  - (c) a chips close-up (`tide-repository`, `live-tide-client`);
  - (d) the tour-jump state (A `live-update` after a click on `tide-repository`);
  - (e) max zoom with a detail panel open, scrolled to the top and to the bottom (Hard Rule 5).
- **Check:**
  ```sh
  set -euo pipefail; # local fixture server (see rules)
  node /tmp/s07-checks/t013-matrix.mjs 2>&1 | tee /tmp/s07-checks/t013.txt   # loops pnpm evidence / probe shots; exits non-zero on any non-0 evidence exit
  ls .specify/features/panels/evidence/T013-screenshot-*.png | wc -l | tee -a /tmp/s07-checks/t013.txt   # expect >= 20
  kill "$(cat /tmp/s07-checks/serve.pid)"; echo T013-OK
  ```
- **Evidence:** `evidence/T013-log-matrix.txt`, `T013-screenshot-{detail-left,detail-right,detail-top,detail-bottom,case-study-mobile,case-study-desktop,chips,tour-jump,maxzoom-top,maxzoom-bottom}-{light,dark}.png`, `T013-meta-*.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The 4-position shots in both palettes: the panel is on the far side every time (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T014 [US6] FPS during a live tour + draw calls + CLS numbers (run alone)

- **Seam:** fixture export ↔ `fps:engine --scenario tour` ↔ no-regression verdict with S7 mounted. **Runs with no other browser task in parallel** (T012/T013 must have finished).
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail; pnpm fps:engine --scenario tour --out /tmp/s07-checks/t014 2>&1 | tee /tmp/s07-checks/t014.txt
  node -e "const r=require('/tmp/s07-checks/t014/fps.json');const ok=r.verdict.pass===true&&r.droppedFrames===0&&r.verdict.liveness===true&&r.windowMs>=5000&&r.tourStepsAdvanced>=3&&r.drawCalls===2;console.log(JSON.stringify({droppedFrames:r.droppedFrames,liveness:r.verdict.liveness,windowMs:r.windowMs,tourStepsAdvanced:r.tourStepsAdvanced,drawCalls:r.drawCalls,info:{fps:r.fps,rafFps:r.rafFps,intervalsMs:r.intervalsMs}}));if(!ok)process.exit(6)"
  node -e "const r=require('/tmp/s07-checks/t012/engine-probe.json');for(const n of ['panel-cls-strict','panel-stage-invariant','panel-draw-calls'])console.log(n,JSON.stringify(r.checks.find(c=>c.name===n)))" | tee -a /tmp/s07-checks/t014.txt
  echo T014-OK
  ```
  A failing verdict is **not** rerun to green (EVIDENCE.md §6). One rerun is allowed only for infrastructure exits 3/4; otherwise escalate with the evidence.
- **Evidence:** `evidence/T014-fps.json`, `T014-log-fps.txt` (incl. the CLS strict total and attribution, stage invariance, draw calls), `T014-screenshot-desktop.png`, `T014-meta.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The `fps.json` summary (0 dropped frames, liveness true, ≥ 3 steps, 2 draw calls) and CLS strict = 0 (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. G3 validation at the STOP after this task (default: proceed to G4 on "approved").

---

## Phase G4: Ship (US6) → STOP for Murphy after T015

### T015 [US6] ⚑ PR ready, full CI, AC self-check

- **Seam:** slice branch ↔ CI ↔ `main`.
- **Files:**
  - `evidence/AC-selfcheck.md`: AC1–AC6 × evidence file × verdict. It covers panel screenshots (4 positions × 2 palettes), case-study screenshots, the CLS measurement, the tour-jump interaction log, the chips hex-grep, the frozen-surface diff, and draw calls.
  - `evidence/T015-ci.txt`, `evidence/T015-log-surface-diff.txt`.
- **Check:**
  ```sh
  set -euo pipefail
  pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build 2>&1 | tail -5 | tee /tmp/s07-checks/t015.txt
  git diff --stat --exit-code 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) | tee /tmp/s07-checks/t015-surface.txt && echo S2S4-DIFF-EMPTY
  git diff --stat --exit-code f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) | tee -a /tmp/s07-checks/t015-surface.txt && echo S5-DIFF-EMPTY
  git diff --stat --exit-code 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) | tee -a /tmp/s07-checks/t015-surface.txt && echo S6-DIFF-EMPTY
  gh pr checks --watch 2>&1 | tee -a /tmp/s07-checks/t015.txt   # build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion
  ```
  ⚑ The orchestrator marks the PR ready, then **waits for Murphy's "merge"** (RFC §9.4). Lesson from S06 (memory: gitleaks squash fingerprint): if `.gitleaksignore` fingerprints are needed, they are re-checked against the squash commit after the merge.
- **Evidence:** `evidence/T015-ci.txt`, `T015-log-surface-diff.txt`, `AC-selfcheck.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation in Orca's browser via `pnpm dev` locally: click through a component and a case study on A/B/C in both palettes, plus a tour jump. This is the brief's "first time the portfolio *tells* you something" (default: same walkthrough as G2).
  2. The AC self-check table (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" when you're satisfied (default: no merge without it).
  2. After the merge: nothing; the agent reminds you to `git pull` the original clone.

---

## Dependencies & order

T001 → (T002 ∥ T003 ∥ T004 ∥ T005 ∥ T006) → **STOP G1** → T007 → T008 → T009 → T010 (⚑ push + draft PR) → **STOP G2** → T011 → T012 → T013 → T014 (alone) → **STOP G3** → T015 → **STOP G4**.

- T001 comes first, so the S6 seal exists before any S7 code lands.
- T007 needs T002 (reducer) and T004 (decision).
- T008 needs T003 (placement), T005 (content), T006 (motion) and T007 (hooks).
- T013 uses the slab ids found by T012.
- T014 runs after T012/T013, so no other browser load overlaps the FPS window.
- Parallel G1 tasks run in separate worktrees and merge in ID order. Each touches only its own new files.

## FR ↔ task coverage

| FR | AC | Tasks |
|---|---|---|
| FR-001 | AC1 | T002, T005, T007, T008, T012, T013 |
| FR-002 | AC2 | T003, T008, T012, T013 |
| FR-003 | AC3 | T005, T009, T012, T013 |
| FR-004 | AC4 | T005, T008, T010, T012, T013 |
| FR-005 | AC5 | T004, T007, T008, T012, T013 |
| FR-006 | AC6 | T001, T006, T010, T012, T014, T015 |
