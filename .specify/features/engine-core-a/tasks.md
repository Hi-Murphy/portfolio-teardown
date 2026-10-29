# Tasks: S04 Engine Core A — Layout · Explode · Camera

**Input:** `rfc.md` (approved, §9), `spec.md`, `plan.md` in `.specify/features/engine-core-a/`
**Executor:** DeepSeek Flash seat (tier 1: `codex exec -p deepseek`; sandbox off for browser tasks, writes limited to the task worktree and `/tmp/s04-checks`). **Escalation (RFC D11):** tier 2 (OpenRouter) is **skipped** (`OPENROUTER_API_KEY` unset; logged per task). If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage and waits for "go". It never takes over automatically. Each report states the finishing tier and any skip.
**Usage pacing:** each phase group starts in a fresh 5h window. Before each task the orchestrator checks usage. At ≥ 85% of the 5h window, no new task starts: finish and commit the current task, tick the ledger, report, STOP.
**AC4:** Merlin decided R3 (literal `fps ≥ 60.00`, RFC §9.7). T011 measures and judges `verdicts.literal60`; a FAIL with 0 dropped frames is reported as AC4 blocked by construction (E1).

## Ledger (resume point — update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☐ | | | |
| T002 | ☐ | | | |
| T003 | ☐ | | | |
| T004 | ☐ | | | |
| T005 | ☐ | | | |
| T006 | ☐ | | | |
| T007 | ☐ | | | |
| T008 | ☐ | | | |
| T009 | ☐ | | | |
| T010 | ☐ | | | |
| T011 | ☐ | | | |
| T012 | ☐ | | | |

Resume prompt for a fresh session: *"Read `.specify/KICKOFF-S04.md` and `.specify/features/engine-core-a/tasks.md`; continue Stage 3 at the first ☐ task; 5h: N%."*

## Format & rules (apply to every task)

- `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task. Stories: **US1** visitor sees the product move · **US2** visitor orients · **US3** lib author · **US4** reviewer trusts it.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:** each task runs in a fresh worktree from `task/s04-engine-core-a`, on branch `task/s04-t0NN-<slug>`. After the check passes, merge back into the slice branch without squashing. Commit message: `S04/T0NN: <title>`. Remove the worktree only after the merge.
- **Orchestrator-only steps** (marked ⚑): `git push`, opening/updating the PR, merging a Merlin brief revision from `main`. Flash prepares; the orchestrator executes.
- **Guards (every task):** both must print OK (plan.md "Guards"):
  ```sh
  git diff --quiet b504fba -- .specify/slices .specify/KICKOFF.md .specify/KICKOFF-S02.md .specify/KICKOFF-S03.md .specify/KICKOFF-S04.md && echo FROZEN-OK
  git diff --quiet b504fba -- packages/xploder/src/schema packages/xploder/src/parse.ts packages/xploder/src/errors.ts packages/xploder/src/index.ts packages/xploder/src/motion/index.ts packages/xploder/src/theme packages/xploder/test/fixtures packages/xploder/test/__snapshots__/generality.test.ts.snap packages/xploder/test/geometry-free.test.ts && echo S2-OK
  ```
- **Every check also runs:** `pnpm typecheck && pnpm lint && pnpm test` (lint includes the Prettier check).
- **Never:** add deps beyond the approved list (plan.md "Technical Context") · import `@react-three/drei`, GSAP, `three/examples`, `three/addons`, `three-stdlib` or `camera-controls` · write motion literals (durations, easings, staggers, timers) outside `packages/xploder/src/motion/` · write hex/`rgb()`/`hsl()`/`0x` colors outside `packages/xploder/src/theme/` · put engine logic or `three`/`@react-three/*` imports in `apps/web` · deep-import `xploder/src` from the app · change the S2 schema/parse/tokens files · add a threshold override to any perf CLI · uncap the browser frame rate · set `PERF_FIXTURES` on Vercel · put private hostnames, IPs or tokens anywhere (`127.0.0.1` and `*.vercel.app` are fine) · run `specify init` · use bare `git stash`.
- **Evidence** goes to `.specify/features/engine-core-a/evidence/T0NN-*.{txt,png,json}` (naming per `.specify/EVIDENCE.md` §4). Throwaway scripts live in `/tmp/s04-checks/`. Run `mkdir -p /tmp/s04-checks .specify/features/engine-core-a/evidence` first, and run every check under `set -euo pipefail`.
- **Local fixture server** (used by T007, T009–T011): `pnpm build:fixtures && (node tools/perf/src/cli/serve.ts --dir out-fixtures --port 4199 & echo $! > /tmp/s04-checks/serve.pid)`, then `until curl -sf -o /dev/null http://127.0.0.1:4199/dev/engine; do sleep 0.5; done`; stop with `kill "$(cat /tmp/s04-checks/serve.pid)"`.

---

## Phase G1: Pure core (US1, US2, US3) → STOP for Murphy after T004

### T001 [US3] `xploder` package surface, deps and tooling
- **Seam:** `packages/xploder` exports/peers ↔ pnpm workspace ↔ `apps/web` consumer.
- **Files:**
  - `packages/xploder/package.json`: `exports` add `"./layout": "./src/layout/index.ts"`, `"./react": "./src/react/index.ts"`, `"./fixtures": "./test/fixtures/index.ts"`; `peerDependencies` `react ^19.3.1`, `three ^0.186.1`, `@react-three/fiber ^9.8.2`, each `peerDependenciesMeta.<name>.optional: true`; devDeps the same three + `@types/three ^0.186.0`, `@types/react ^19.3.0`, `@react-three/test-renderer ^9.1.1`, `eslint-plugin-react-hooks ^7.1.1`.
  - Stub modules so the exports resolve: `src/layout/index.ts` (`export {}` + a TODO comment naming T002), `src/react/index.ts` (`export {}`, T005).
  - `packages/xploder/tsconfig.json`: `"compilerOptions": { "jsx": "react-jsx" }`.
  - `packages/xploder/eslint.config.mjs`: add `eslint-plugin-react-hooks` recommended rules for `**/*.tsx`.
  - `apps/web/package.json`: deps `three ^0.186.1`, `@react-three/fiber ^9.8.2`.
  - `packages/xploder/test/exports.test.ts`: reads `package.json`; asserts the six export keys; asserts that `Object.keys(await import('../src/index'))` equals the snapshot of the S2 root export names (inline list copied from `src/index.ts`).
  - `AGENTS.md` §2: exports list becomes `.`, `./motion`, `./theme`, `./layout`, `./react`, `./fixtures`, with a note that `./react` needs the optional peers.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s04-checks .specify/features/engine-core-a/evidence
  # 1) baseline: landing weight at b504fba (before any S04 code), from a scratch worktree
  git worktree add /tmp/s04-checks/base b504fba && (cd /tmp/s04-checks/base && pnpm install --frozen-lockfile && pnpm build)
  (node tools/perf/src/cli/serve.ts --dir /tmp/s04-checks/base/apps/web/out --port 4174 & echo $! > /tmp/s04-checks/base.pid); until curl -sf -o /dev/null http://127.0.0.1:4174/; do sleep 0.5; done
  pnpm perf:weight http://127.0.0.1:4174/ --out /tmp/s04-checks/t001-base-weight; kill "$(cat /tmp/s04-checks/base.pid)"; git worktree remove --force /tmp/s04-checks/base
  # 2) after the change
  pnpm install && pnpm typecheck && pnpm lint && pnpm test 2>&1 | tee /tmp/s04-checks/t001.txt
  pnpm build && (pnpm serve:out --port 4173 & echo $! > /tmp/s04-checks/serve.pid); until curl -sf -o /dev/null http://127.0.0.1:4173/; do sleep 0.5; done
  pnpm perf:weight http://127.0.0.1:4173/ --out /tmp/s04-checks/t001-weight 2>&1 | tee -a /tmp/s04-checks/t001.txt
  kill "$(cat /tmp/s04-checks/serve.pid)"
  node -e "const a=require('/tmp/s04-checks/t001-base-weight/weight.json').profiles.mobile.totalBytes,b=require('/tmp/s04-checks/t001-weight/weight.json').profiles.mobile.totalBytes;console.log('base',a,'now',b);if(Math.abs(b-a)/a>0.02)process.exit(1)"
  pnpm ls -r --depth 0 | grep -E 'three|@react-three|drei|gsap|jsdom' | tee -a /tmp/s04-checks/t001.txt
  ! pnpm ls -r --depth 0 | grep -qE 'drei|gsap|jsdom' && echo T001-OK
  ```
- **Evidence:** `evidence/T001-surface.txt` (test log, weight base vs now, dep listing)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: agent log; landing weight within ±2% of the pre-change baseline).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; deps approved in RFC §9.3).

### T002 [US1] [US3] Layout engine + determinism suite
- **Seam:** parsed `Project` ↔ `layoutProject` ↔ `ProjectLayout` (instance order contract).
- **Files:** `src/layout/{index,types,layout,fit,view}.ts`; `test/layout.test.ts` (+ new `__snapshots__/layout.test.ts.snap`). Signatures and algorithm exactly per plan.md "Public API (`xploder/layout`)". Tests:
  - (a) `layoutProject(p)` twice and after `structuredClone(p)` → `toStrictEqual`;
  - (b) `toMatchSnapshot()` for fixtures A and B (parsed with the registry);
  - (c) mutate names/descriptions/techs/flows/story → output unchanged;
  - (d) deep-frozen input → no throw, output deep-frozen (`Object.isFrozen` recursively);
  - (e) sweep 1–12 layers × 0–16 components: no component overlap within a layer, every component inside its slab footprint, slabs don't overlap in either state, exploded pitch > imploded pitch, layer 0 has max `y`, stack centered (`min.y = −max.y` within 1e-9), `12 → 4×3`, `13 → 4×4`;
  - `fitZoom`: for the exploded bounds of A, B and a 12×16 sweep case, all 8 projected corners lie within the margin-reduced viewport at all 4 azimuths, and `fitZoom × 1.01` breaks that for at least one azimuth (tightness).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/layout.test.ts 2>&1 | tee /tmp/s04-checks/t002.txt
  CI=true pnpm --filter xploder exec vitest run test/layout.test.ts 2>&1 | tail -3   # second run in CI mode: snapshots must already match
  grep -q 'layoutProject' packages/xploder/test/__snapshots__/layout.test.ts.snap
  pnpm typecheck && pnpm lint && pnpm test && echo T002-OK
  ```
- **Evidence:** `evidence/T002-layout.txt` (test log + the A snapshot excerpt)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. In the A snapshot excerpt, layer order is `ui, state, data, platform` from top (highest `y`) to bottom (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; layout defaults per RFC D2, tuned visually in T007).

### T003 [P] [US1] Easing evaluator + explode timeline
- **Seam:** `xploder/motion` tokens ↔ `src/motion/ease.ts` ↔ `src/engine/explode.ts`.
- **Files:** `src/motion/ease.ts` (new; `motion/index.ts` untouched), `src/engine/explode.ts`, `test/ease.test.ts`, `test/explode.test.ts`. Behaviour per plan.md "Internal modules". Tests:
  - ease: `parseCubicBezier` on both token strings and on whitespace variants; throws on `'ease-in'`; `f(0)=0`, `f(1)=1`; the explode curve at x = 0.25/0.5/0.75 within 1e-4 of a reference computed by dense bisection in the test; monotone on [0, 1].
  - timeline: from imploded, `setTarget(1, 0)` → each `p_i` reaches 1 at exactly `delay_i + durations.explode`; layer stagger order (layer 0 starts first), component stagger by slot; implode reverses order on `staggers.implodeLayer`; `phase()` goes `exploding → exploded` and `imploding → imploded`.
  - interruption: toggle at 40% of the explode → sampled at 1 ms steps across the toggle, `max |Δp_i|` ≤ the steepest slope of either curve × 1 ms (no jump); reversal ends on 0; per-instance delay scaled by `|target − from_i|`.
  - spam: 50 random toggles in 2 s → after `max(durations) + max stagger` from the last toggle, all `p_i` equal the last target.
  - static twin: `resolveMotion(true)` → `setTarget(1, t)` → `sample(t)` settled with all `p_i = 1`; `phase(t) = 'exploded'`.
  - token proportionality: synthetic tokens (durations × 2, staggers × 3, `cubic-bezier(0, 0, 1, 1)`) → settle time and mid-curve samples change exactly as computed.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/ease.test.ts test/explode.test.ts 2>&1 | tee /tmp/s04-checks/t003.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts 2>&1 | tee -a /tmp/s04-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-explode.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: test log; the motion feel is reviewed visually at G2/G3).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T004 [P] [US2] Camera rig reducer, keymap and turn tween
- **Seam:** user input (buttons/keys) ↔ `cameraReducer` ↔ displayed azimuth/zoom.
- **Files:** `src/engine/camera.ts`, `test/camera.test.ts`. Per plan.md "Internal modules". Tests:
  - `RIG_ACTION_TYPES` deep-equals `['rotateLeft','rotateRight','zoomIn','zoomOut','zoomReset']`, and a type-level assertion that `RigAction['type']` is exactly that union (`expectTypeOf`);
  - 10,000 random action sequences (seeded PRNG in the test) → after each step `azimuthOf(turns) mod 2π ∈ {45°, 135°, 225°, 315°}` (within 1e-9) and `1 ≤ zoomFactor ≤ 3`; `INITIAL_RIG` azimuth = 45°;
  - zoom: 20 × `zoomIn` → 3; 20 × `zoomOut` → 1; `zoomReset` → 1;
  - `keyToAction` table: `ArrowLeft`, `ArrowRight`, `+`, `=`, `-`, `_`, `0` map; `ArrowUp`, `a`, `Enter`, `' '` → `null`;
  - turn tween: from 45° to 135°, samples stay within [45°, 135°], end exactly on 135°, settle at `durations.implode`; a retarget mid-turn continues from the displayed angle without a jump; static twin → `sample(t)` = target at `t`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/camera.test.ts 2>&1 | tee /tmp/s04-checks/t004.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts 2>&1 | tail -3 | tee -a /tmp/s04-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
  ```
- **Evidence:** `evidence/T004-camera.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The key table (←/→ rotate, `+`/`-` zoom, `0` reset) is what you want (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

**G1 STOP:** report T001–T004 with evidence; Murphy validates; next group in a fresh 5h window.

---

## Phase G2: Renderer + playground (US1, US2, US3) → STOP for Murphy after T008

### T005 [US1] [US2] `xploder/react`: scene, viewer, hooks
- **Seam:** `ProjectLayout` + timeline + rig ↔ R3F scene graph (2 instanced meshes, ortho camera) ↔ DOM wrapper contract.
- **Files:** `src/react/{index,TeardownViewer,useTeardownViewer,env,usePalette,useReducedMotion}.ts(x)`, `src/react/scene/{Scene,Slabs,CameraRig,Lights,Stats}.tsx` (`Scene` = everything inside `<Canvas>`, so tests can render it without a DOM canvas), `test/env.test.ts`, `test/scene.test.tsx`. API exactly per plan.md "Public API (`xploder/react`)". Materials `MeshLambertMaterial` with `palette.lineMuted` (layers) and `palette.line` (components). No colors other than palette values; lights set intensity only.
  - `env.test.ts`: `resolveThemeMode` full truth table (8 rows); `subscribeTheme`/`subscribeReducedMotion` with fake `matchMedia` + fake `MutationObserver`: initial callback, change callback, unsubscribe removes the listeners.
  - `scene.test.tsx` (`@react-three/test-renderer`): `Scene` for fixture A → exactly 2 `InstancedMesh`, counts 4 and 8; fixture B → 4 and 5; `camera.isOrthographicCamera`; azimuth at mount 45° (from `camera.position`); after dispatching `rotateRight` and advancing frames past `durations.implode`, 135°; `state.controls === null`; the materials' `color.getHexString()` equals the palette value lowercased (light and dark passed explicitly).
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter xploder exec vitest run test/env.test.ts test/scene.test.tsx 2>&1 | tee /tmp/s04-checks/t005.txt
  pnpm --filter web exec vitest run test/no-motion-literals.test.ts 2>&1 | tail -3 | tee -a /tmp/s04-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-scene.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on yet; the first visual check is T007 (default: test log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T006 [US3] Guard scanners: color literals, free orbit, package consumer; motion non-vacuity
- **Seam:** repo source/manifests ↔ static scanners in `apps/web/test`.
- **Files:** `apps/web/test/source-scan.ts`, `no-color-literals.test.ts`, `no-free-orbit.test.ts`, `package-consumer.test.ts`; `no-motion-literals.test.ts` + the non-vacuity assertion. Rules exactly per plan.md "Scanners". Each scanner: (1) the real tree has 0 hits, (2) a negative-control sample per rule produces a hit, (3) the scanned file set contains `packages/xploder/src/engine/explode.ts`, `packages/xploder/src/react/scene/Slabs.tsx` and (once T007 lands; until then `skipIf` the file is absent) `apps/web/app/dev/engine/engine-playground.tsx`. `package-consumer` reads the allowed subpaths from `packages/xploder/package.json#exports`.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter web exec vitest run test/no-color-literals.test.ts test/no-free-orbit.test.ts test/package-consumer.test.ts test/no-motion-literals.test.ts 2>&1 | tee /tmp/s04-checks/t006.txt
  # bite test: a planted violation must turn each scanner red, then be removed
  printf "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\nexport const c = '#ff0000';\n" > packages/xploder/src/engine/__bite.ts
  set +e; pnpm --filter web exec vitest run test/no-color-literals.test.ts test/no-free-orbit.test.ts >/tmp/s04-checks/t006-bite.txt 2>&1; rc=$?; set -e
  rm packages/xploder/src/engine/__bite.ts; test $rc -ne 0 && grep -c 'FAIL' /tmp/s04-checks/t006-bite.txt | tee -a /tmp/s04-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-scanners.txt` (green run + bite run excerpt)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the green run plus the planted-violation red run).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T007 [US1] [US2] `/dev/engine` playground
- **Seam:** `xploder/fixtures` + `xploder/react` ↔ dev-only Next route ↔ S1 theme toggle.
- **Files:** `apps/web/app/dev/engine/page.fixture.tsx`, `apps/web/app/dev/engine/engine-playground.tsx`, per plan.md "Playground". Controls are `<button type="button">` with visible text/aria-labels: `Fixture A`, `Fixture B`, `Explode`/`Implode` (one toggle, label follows target), `Rotate left`, `Rotate right`, `Zoom out`, `Reset zoom`, `Zoom in`, plus `ThemeToggle`. Readout `<dl>`: state, azimuth, zoom, draw calls, instances. If the layout defaults look wrong at this point, tune `LAYOUT_DEFAULTS` here (update the T002 snapshots in the same commit, noted in the report).
- **Check:**
  ```sh
  set -euo pipefail; pnpm typecheck && pnpm lint && pnpm test 2>&1 | tee /tmp/s04-checks/t007.txt
  # local fixture server (see Format & rules), then:
  pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=a' --runs 1 --wait-for '[data-xploder-ready="true"][data-xploder-state="imploded"]' --out /tmp/s04-checks/t007-a 2>&1 | tee -a /tmp/s04-checks/t007.txt
  pnpm evidence 'http://127.0.0.1:4199/dev/engine?fixture=b&state=exploded' --runs 1 --wait-for '[data-xploder-ready="true"][data-xploder-state="exploded"]' --out /tmp/s04-checks/t007-b 2>&1 | tee -a /tmp/s04-checks/t007.txt
  kill "$(cat /tmp/s04-checks/serve.pid)"; echo T007-OK
  ```
  (The evidence CLI may exit 5 if only its Lighthouse step fails on a dev route; screenshots + `meta.json` must exist either way and the exit code is recorded.)
- **Evidence:** `evidence/T007-screenshot-{desktop,mobile}-a.png`, `T007-screenshot-desktop-b-exploded.png`, `T007-meta.json`, `T007-playground.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. In Orca's browser on `pnpm dev` → `/dev/engine`: A shows 4 stacked slabs with components on top; toggle explodes/implodes; ⟲/⟳ and ←/→ turn in 90° steps; zoom buttons stop at the bounds; the theme toggle recolors the slabs (default: screenshots suffice if you skip this).
  2. The slab proportions/gaps look right to you (default: accept the RFC D2 defaults).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T008 [US4] Exclusion extended to `/dev/engine` + draft PR ⚑
- **Seam:** Next `pageExtensions` gate ↔ `out/` scan ↔ CI `assert-absent` (preview + prod).
- **Files:** `apps/web/test/fixture-exclusion.test.ts` per plan.md "Exclusion"; `.github/workflows/perf.yml` two new `assert-absent` steps for `dev/engine`. ⚑ Orchestrator pushes the slice branch and opens the **draft PR** `S04: engine core A (layout · explode · camera)` (body: RFC/spec links, E1 status, attribution line).
- **Check:**
  ```sh
  set -euo pipefail; pnpm build && pnpm --filter web exec vitest run test/fixture-exclusion.test.ts 2>&1 | tee /tmp/s04-checks/t008.txt
  test ! -e apps/web/out/dev && test -z "$(grep -rl 'data-perf-fixture' apps/web/out || true)" && echo prod-clean | tee -a /tmp/s04-checks/t008.txt
  pnpm build:fixtures && pnpm --filter web exec vitest run test/fixture-exclusion.test.ts 2>&1 | tee -a /tmp/s04-checks/t008.txt
  grep -rl 'data-perf-fixture="engine"' out-fixtures | head -1 | tee -a /tmp/s04-checks/t008.txt
  # after ⚑ push + draft PR: CI 'perf: fixture exclusion' log shows both preview 404s
  gh pr checks --watch --fail-fast 2>&1 | tee -a /tmp/s04-checks/t008.txt
  echo T008-OK
  ```
- **Evidence:** `evidence/T008-exclusion.txt` (local scans + CI log excerpt of both preview `assert-absent` steps + PR URL)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. On the PR's Vercel preview, `/dev/engine` returns 404 (default: the CI log suffices).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: push + draft PR granted in RFC §9.4).

**G2 STOP:** report T005–T008; Murphy eyeballs the playground (memory: Orca browser + `pnpm dev`); next group in a fresh 5h window.

---

## Phase G3: Evidence (US4) → STOP for Murphy after T011

### T009 [US4] `engine:probe` + `fps:engine` CLIs
- **Seam:** S3 tooling (`browser.ts`, `serve.ts`, `fps.ts`, exit codes) ↔ playground DOM contract.
- **Files:** `tools/perf/src/engine-probe.ts` (pure `evaluateProbe(observation) → checks`), `tools/perf/src/cli/engine-probe.ts`, `tools/perf/src/cli/fps-engine.ts`, `tools/perf/test/engine-probe.test.ts` (synthetic observations: all-pass, each check failing once); root scripts `engine:probe`, `fps:engine`; `AGENTS.md` §3 two command bullets. Behaviour and report shapes exactly per plan.md "Evidence CLIs". Frame counting reads `data-engine-frame`; reduced motion uses a context with `reducedMotion: 'reduce'`. `fps:engine` reuses `FPS_TOLERANCE` from `budgets.ts` and never accepts a threshold flag.
- **Check:**
  ```sh
  set -euo pipefail; pnpm --filter perf-tools test engine-probe 2>&1 | tee /tmp/s04-checks/t009.txt
  pnpm engine:probe --help && pnpm fps:engine --help
  set +e; pnpm engine:probe not-a-url; rc=$?; set -e; test $rc -eq 2
  set +e; pnpm engine:probe http://127.0.0.1:9/; rc=$?; set -e; test $rc -eq 3
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
- **Evidence:** `evidence/T009-cli.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: test log + exit-code demos).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T010 [US1] [US2] [US4] Visual + behaviour evidence
- **Seam:** fixture export ↔ evidence CLI (screenshots, light/dark) ↔ `engine:probe` (motion, reduced motion, camera).
- **Files:** evidence only.
- **Check:**
  ```sh
  set -euo pipefail  # local fixture server running (see Format & rules)
  B='http://127.0.0.1:4199/dev/engine?fixture=a'
  for scheme in light dark; do for st in imploded exploded; do
    q=$([ "$st" = exploded ] && echo '&state=exploded' || true)
    pnpm evidence "$B$q" --runs 1 --color-scheme $scheme --wait-for "[data-xploder-ready=\"true\"][data-xploder-state=\"$st\"]" --out /tmp/s04-checks/t010-$scheme-$st 2>&1 | tee -a /tmp/s04-checks/t010.txt
  done; done
  pnpm engine:probe http://127.0.0.1:4199/ --out /tmp/s04-checks/t010-probe 2>&1 | tee -a /tmp/s04-checks/t010.txt
  node -e "const p=require('/tmp/s04-checks/t010-probe/engine-probe.json');console.log(p.checks.map(c=>(c.pass?'PASS ':'FAIL ')+c.name).join('\n'));if(!p.pass)process.exit(6)"
  kill "$(cat /tmp/s04-checks/serve.pid)"; echo T010-OK
  ```
- **Evidence:** `evidence/T010-screenshot-{mobile,desktop}-{light,dark}-{imploded,exploded}.png` (8), `T010-screenshot-desktop-b-exploded.png` (from the probe), `T010-engine-probe.json`, `T010-meta-*.json`, `T010-evidence.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The 8 screenshots: slabs readable on both themes, components visibly gridded, exploded clearly separated (default: accept if the probe passes and the images match the description).
  2. `engine-probe.json` reduced-motion block: initial `exploded`, one-frame switch, `framesIn1s ≤ 2` (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T011 [P] [US4] FPS evidence on `/dev/engine` (fixture A)
- **Seam:** S3 `measureFps` ↔ fixture export with continuous explode ⇄ implode (`cycle=1`).
- **Files:** evidence only.
- **Check:**
  ```sh
  set -uo pipefail; pnpm fps:engine --out /tmp/s04-checks/t011 2>&1 | tee /tmp/s04-checks/t011.txt; echo "exit=${PIPESTATUS[0]}" | tee -a /tmp/s04-checks/t011.txt; set -e   # exit 6 = r1 fail, recorded, not aborted
  node -e "const r=require('/tmp/s04-checks/t011/fps.json');console.log(JSON.stringify({fps:r.fps,frames:r.frames,windowMs:r.windowMs,droppedFrames:r.droppedFrames,rafFps:r.rafFps,p95:r.intervalsMs.p95,verdicts:r.verdicts}))" | tee -a /tmp/s04-checks/t011.txt
  echo T011-MEASURED
  ```
  **Verdict rule:** the AC4 verdict is written into the report under the rule in force: Merlin's revised brief if merged (⚑ merge from `main`, guard base moved), else the literal reading `verdicts.literal60`. A literal-reading FAIL with `droppedFrames = 0` is reported as **AC4 blocked (E1)**, not as an engine defect. An `r1` FAIL (dropped frames or out of band) is an engine defect and goes up the escalation ladder.
- **Evidence:** `evidence/T011-fps.json`, `T011-fps.txt`, `T011-screenshot-desktop.png`, `T011-meta.json`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The raw numbers (fps, droppedFrames, p95) and which rule the verdict was judged under (default: accept the report).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Merlin's E1 decision, if it exists by then (default: the literal reading stays in force and AC4 is reported blocked with this run as evidence).

**G3 STOP:** report T009–T011; next group in a fresh 5h window.

---

## Phase G4: Ship (US4) → STOP + AC self-check

### T012 [US4] PR ready, full CI, AC1–AC6 self-check ⚑
- **Seam:** slice branch ↔ GitHub PR checks ↔ evidence table.
- **Files:** `evidence/AC-selfcheck.md` (one row per AC: verdict, evidence files, CI run URLs; AC1 prod-404 row marked *post-merge*; AC4 row per the E1 status). ⚑ Orchestrator pushes, marks the PR ready for review, and collects the checks.
- **Check:**
  ```sh
  set -euo pipefail; pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build 2>&1 | tail -5 | tee /tmp/s04-checks/t012.txt
  gh pr checks 2>&1 | tee -a /tmp/s04-checks/t012.txt
  test "$(gh pr checks --json name,bucket --jq '[.[] | select(.bucket != "pass")] | length')" = 0 && echo T012-OK   # every check (the six AC6 checks + Vercel) passes
  ```
- **Evidence:** `evidence/T012-ci.txt`, `T012-ci.png` (PR checks page), `AC-selfcheck.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation per your runbook; eyeball `/dev/engine` in Orca's browser (default: the evidence table).
  2. After merging: the `perf: fixture exclusion` main-push run shows `/dev/engine` 404 on production (default: the agent attaches that log in one follow-up).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. The merge, when you're satisfied (default: you merge after final validation).
  2. The E1 outcome, if AC4 is still blocked at this point (default: S4 can't be signed off on AC4 until Merlin decides).

**G4 STOP:** end-contract per `KICKOFF-S04.md` Stage 3.
