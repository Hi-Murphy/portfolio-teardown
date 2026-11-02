# Slice 11.5 — Engine Startup Performance — FROZEN BRIEF v1

**slice:** S11.5-engine-startup · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s11.5-engine-startup` · **depends on:** S4 ✅ S6 ✅ S10 ✅ (interaction gate live) · **revision counter:** 0 of 2

## Mission
The teardown currently starts **after** the visitor's first interaction (D-19) because load-time initialisation broke the perf budget. That is a correct performance decision and a product compromise: a visitor who never interacts never sees the teardown. This slice makes startup cheap enough to earn the 3D back — first by measuring where the time actually goes, then by splitting, warming and precompiling it.

## Context (self-contained — the orchestrator reads ONLY this brief)
- 3D lives in `packages/xploder/src/react/scene/*` (R3F `<Canvas>`, `Slabs`, `CameraRig`, `Emphasis`, `OverlayProjector`) and is mounted by:
  - hero: `apps/web/components/hero/hero-live.tsx` → dynamic import of `hero-stage.tsx`, gated by `apps/web/components/interaction-gate.ts`;
  - project route: `apps/web/components/workbench/workbench-loader.tsx` → `workbench.tsx`.
- Materials/tokens: `packages/xploder/src/look/{fills,product,tokens}.ts`; lettering: `src/lettering/*`; layout: `src/layout/*`.
- Measurement already exists: `tools/perf/src/cli/fps-engine.ts` (dropped frames), `engine-probe.ts` (draw calls), Lighthouse + weight gates in CI.
- Measured cost today (S10 note): **≈0.4–0.6 s of main-thread time on a mid-range Android CPU**, paid at first interaction.
- **This slice touches frozen surfaces S4 (engine) and S6 (materials).** Changes are allowed only under this brief, must be additive or surgical, and every touched file is re-sealed with a manifest note (protocol identical to S10's `f65b13c`).
- S11 landed OG cards + metadata at zero client cost — the client bundle is a budget, not a blank cheque.

## Deliverables
1. **Baseline profile before any optimisation** — a written breakdown of where startup time goes on a throttled mobile profile (4× CPU): JS parse/eval of the 3D chunk, R3F mount, geometry build, shader compile, texture/font creation, first paint of the canvas. Evidence: trace summary + per-phase timings. Numbers first, fixes second.
2. **Cheaper init** — implement the levers the profile justifies, in order of measured payoff: split scene/material/shader setup across frames or idle slices; precompile/cache blueprint material variants (`renderer.compileAsync` or equivalent); warm the heaviest modules during idle **without** delaying first paint; audit the three.js import surface for dead weight. No new runtime dependency without a written justification and a bundle delta.
3. **Re-measurement** — same protocol, before/after table, two runs each; dropped frames + long tasks + TBT.
4. **Eager-hydration experiment (flag-gated)** — a build/runtime flag that hydrates at load instead of on interaction; measured on both routes (mobile Lighthouse, TBT, CLS). Outcome recorded either way.
5. **Re-seal** — S4/S6 manifest updates with reason notes for every touched engine/theme file.

## Non-goals (hard)
- No visual redesign: rest-state frames must be pixel-identical in both palettes.
- No theme/behaviour changes (tour, panels, lettering, a11y), no content changes, no new assets.
- No `three` major upgrade; patch bumps only with a written reason.
- No new client-side library for the page bundle.
- No lowering of any perf budget to manufacture a pass.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** a baseline profile exists **before** any optimisation commit, covering parse/eval, mount, geometry, shader compile and texture creation on the 4× CPU profile, with per-phase numbers and the trace artifact attached.
- **AC2:** during the first 5 s after engagement, the project route records **0 dropped frames** (existing `fps-engine` harness) and **no single long task above 50 ms**; the same holds for the hero's first 5 s.
- **AC3:** measured startup main-thread cost drops **≥ 40 %** against the AC1 baseline on the same profile and protocol (two runs each, median reported). If 40 % proves physically unreachable, the shortfall is documented with the ceiling and the reason — numbers, not adjectives.
- **AC4:** visual parity: rest-state screenshots pixel-identical in light and dark; **2 draw calls** on the teardown unchanged; CLS 0; client JS bundle ≤ baseline (byte count reported).
- **AC5:** at least one startup lever is proven by measurement to be the dominant win (split init, precompiled materials, or import trimming), with the evidence showing its individual contribution — no shotgun changes.
- **AC6:** the eager-hydration flag is measured on `/` and `/projects/websocket-inspector` under the mobile profile with a verdict: **≥ 95 perf and TBT within budget** → recommend retiring D-19's gate; otherwise publish the numbers and **keep the gate**. Either verdict is acceptable; an unmeasured opinion is not.
- **AC7:** CI green (all required checks incl. `seo: meta + og`, fps calibration, both axe jobs); frozen surfaces S2/S5/S7/S8 remain empty; every touched S4/S6 file is re-sealed with a reason note, and `XPLODER-SRC-OK` lists exactly those files.

## Executor rules (binding)
- Profile first — a commit that optimises before AC1's baseline exists is a protocol violation.
- Perf claims in dropped-frames/long-task style only; every number carries its artifact.
- One integration seam + one executable check per task; evidence per `.specify/EVIDENCE.md`; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator executes personally; tier 1.5 dormant.

## Murphy dependencies
- **None blocking.** At G2 he reviews the AC1 profile, the before/after table and the AC6 verdict; defaults ship if he says nothing.
- He decides whether to retire the interaction gate (D-19) after seeing AC6's numbers — Merlin's recommendation follows the data.

## Freeze protocol
Frozen at commit; work only on `task/s11.5-engine-startup`; integration via PR after Murphy's final validation. Scope/AC changes = revision (counter 0 of 2). RFC (`.specify/features/engine-startup/rfc.md`) is orchestrator-authored and Murphy-reviewed before spec/plan/tasks and again before execution.
