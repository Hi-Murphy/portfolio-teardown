# Slice 11.6 — Staged Canvas Mount — FROZEN BRIEF v1

**slice:** S11.6-staged-canvas-mount · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (via Murphy) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s11.6-staged-canvas-mount` · **depends on:** S11.5 ✅ (#17, `66a021f`) · **revision counter:** 0 of 2

## Mission
S11.5 made the 3D startup cheaper: −13 % main-thread time on the project route, and the longest task fell from 134 to 57 ms. One long task is left on every path, a **56–69 ms** synchronous `<Canvas>` mount. That task is the only reason S11.5's AC2 failed, and it is the main TBT cost that kept D-19's interaction gate (S11.5 AC6: keep). This slice may touch the Canvas owner (S8) to stage that mount across frames. The goal is a startup without any long task, and then a re-run of the eager-hydration verdict.

## Context (self-contained — the orchestrator reads ONLY this brief)
- **S11.5 evidence** (`.specify/features/engine-startup/evidence/`):
  - The remaining task sits between the viewer canvas's `getContext` and the first `createProgram`. A sampled CPU profile splits it into **three.js `WebGLRenderer` construction/setup 37–46 %**, **R3F root creation + first scene render 22–31 %** and **xploder scene components 17–27 %**. WebGL context creation itself is only 2.8 ms (`T010-log-longtask-profile.txt`).
  - `hasWebgl()` (`src/react/a11y/webgl.ts`, S8) creates a **second, detached WebGL2 context** on every start (≈ 5 ms).
  - Final S11.5 numbers (4× CPU, mobile profile, 2 runs, median): max long task 56–69 ms, 1–7 dropped frames, startup cost 326 / 340 / 284–312 ms (project move / project click / home; `T013`, `T014`).
  - CI-runner eager Lighthouse: `/` 0.955–0.96 perf / TBT 233–249 ms; project 0.89–0.905 / TBT 398–442 ms (`T017`).
- **Code:**
  - `<Canvas orthographic frameloop="demand" dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>` is rendered by `src/react/TeardownViewer.tsx` (**S8**). Its children go through `scene/Scene.tsx` (**S6**).
  - `Stats.tsx` (**S4**) owns rendering at `useFrame` priority 1 and drives `data-xploder-ready`, which in turn drives the hero/workbench reveal.
  - The app side (`apps/web/components/{boot-3d.ts,hero/hero-boot.ts,workbench/workbench-boot.ts}`, `apps/web/build/{three-surface.ts,stage-3d.ts}`) stages the 3D module evaluation (S11.5 L3/L4).
- **Measurement that already exists:**
  - `pnpm perf:startup` (phase model; `--attribute` for GL and module spans), `pnpm fps:engine --scenario startup --route <path> --engage move|click`, `pnpm perf:parity` (8 rest-state shots, RGBA compare), `pnpm bundle:manifest`.
  - The `eager-3d.yml` measurement workflow and the `eager-verdict` CLI, and the `NEXT_PUBLIC_EAGER_3D` / `pnpm build:eager` flag.
  - Guards and the S2/S4 path split live in `.specify/features/engine-startup/` (`guards.sh`, `s2.paths`, `s4.paths`).
- **This slice touches frozen surfaces S8, S6 and S4,** only in these files: `src/react/TeardownViewer.tsx`, `src/react/a11y/webgl.ts` (S8), `src/react/scene/Scene.tsx`, `src/react/scene/Slabs.tsx` (S6), `src/react/scene/Stats.tsx` (S4). Changes must be surgical, and every touched file is re-sealed with a manifest reason note (protocol identical to S10's `f65b13c`/`cfef420`).

## Deliverables
1. **Re-baseline.** Re-measure S11.5's final state with the same protocol before any change, because host or Chromium may have drifted. Numbers first, fixes second.
2. **Staged mount.** Split the Canvas mount so no single main-thread task exceeds 50 ms. Implement the levers the re-baseline justifies, in order of measured payoff:
   - construct the renderer in its own idle slice before mount and hand it to `<Canvas gl={…}>`;
   - mount only what the first content frame needs (Slabs, Lights, CameraRig, Stats), and mount OverlayProjector, ViewScroll, PickBridge and the Emphasis driver after it;
   - reuse or avoid the `hasWebgl()` probe's second context;
   - split R3F root creation and the first scene render into separate tasks.
3. **Re-measurement.** Same protocol: a before/after table, two runs each, with dropped frames, long tasks and TBT.
4. **Eager-hydration re-run.** The `eager-3d` workflow on `/` and `/projects/websocket-inspector` on the CI runner, with a verdict on retiring D-19.
5. **Re-seal.** S4/S6/S8 manifest updates with a reason note for every touched file.

## Non-goals (hard)
- No visual redesign: rest-state frames must be pixel-identical in both palettes.
- No change to the first-content-frame meaning of `data-xploder-ready` or to the reveal sequence.
- No theme, behaviour, content, a11y or tour changes. No new assets.
- No `three` / `@react-three/fiber` major upgrade; patch bumps only with a written reason.
- No new client-side library for the page bundle.
- No lowering of any perf budget to manufacture a pass.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** a re-baseline of S11.5's final state exists **before** any change commit, on the same 4× CPU protocol, with per-path numbers and the trace artifact attached.
- **AC2:** during the first 5 s after engagement, the project route records **0 dropped frames** (existing `fps-engine` startup scenario) and **no single long task above 50 ms**, on every engagement path (pointer move and the "Explore 3D" click); the same holds for the hero's first 5 s.
- **AC3:** visual parity: rest-state screenshots pixel-identical in light and dark; **2 draw calls** on the teardown unchanged; CLS 0; client JS ≤ the S11.5 final bytes per scope (byte count reported).
- **AC4:** `data-xploder-ready` still fires on the first content frame, and the hero and workbench reveal sequence is unchanged (probe evidence on both routes).
- **AC5:** the eager-hydration flag is re-measured on `/` and `/projects/websocket-inspector` on the CI runner under the mobile profile with a verdict: **≥ 95 perf and TBT ≤ 200 ms** on both → recommend retiring D-19's gate; otherwise publish the numbers and **keep the gate**. Either verdict is acceptable; an unmeasured opinion is not.
- **AC6:** CI green (all required checks incl. `seo: meta + og`, fps calibration, both axe jobs); frozen surfaces S2/S5/S7 remain empty; every touched S4/S6/S8 file is re-sealed with a reason note, and `XPLODER-SRC-OK` lists exactly those files.

## Executor rules (binding)
- Re-baseline first: a commit that changes the mount before AC1's re-baseline exists is a protocol violation.
- Perf claims in dropped-frames/long-task style only; every number carries its artifact.
- One integration seam + one executable check per task; evidence per `.specify/EVIDENCE.md`; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → pause and report to Murphy with usage, then the orchestrator executes on "go"; tier 1.5 dormant.

## Murphy dependencies
- **None blocking.** At G2 he reviews the re-baseline, the before/after table and the AC5 verdict; defaults ship if he says nothing.
- He decides whether to retire D-19 after seeing AC5's numbers.

## Freeze protocol
Frozen at commit; work only on `task/s11.6-staged-canvas-mount`; integration via PR after Murphy's final validation. Scope/AC changes = revision (counter 0 of 2). RFC (`.specify/features/staged-canvas-mount/rfc.md`) is orchestrator-authored and Murphy-reviewed before spec/plan/tasks and again before execution.
