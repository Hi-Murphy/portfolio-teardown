# Slice 04 — Engine Core A: Layout · Explode · Camera · FROZEN BRIEF v1

**slice:** S04-engine-core-a · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s04-engine-core-a` · **depends on:** S2 ✅ (contracts/tokens) · S3 ✅ (gates/evidence)

## Mission
Build the spatial foundation of the teardown engine: given a validated `Project`, **auto-layout slabs in 3D, animate explode ⇄ implode, and rig the camera.** First Three.js/R3F code in the repo. No interactions beyond the toggle/rotate/zoom controls, no visual theming beyond token-fed base materials.

## Context (self-contained — the orchestrator reads ONLY this brief)
- Product: data-driven "teardown" portfolio — each project rendered as an exploded architecture view from a validated data file. `packages/xploder` is the future OSS lib; **the engine belongs in the lib package**, the site is a thin consumer.
- Live from S2: zod schema + `parseProject`, tech registry, **motion tokens (the ONLY source of easings/durations/staggers)**, blueprint palette tokens (light default + dark). Fixtures exist: **A = UI-app shape** (≥3 layers, ≥6 components, flow) and **B = pipeline shape** — both must render (layout generality is the lib's core promise).
- Live from S3: CI perf gates (Lighthouse mobile ≥95 / LCP <2.5s / CLS =0 on previews; <3MB weight), **FPS harness + calibration fixture pattern**, `pnpm evidence` CLI and the `.specify/EVIDENCE.md` contract — every visual/perf claim in this slice attaches machine-made evidence through that contract.
- Locked design decisions binding this slice:
  - **Auto-layout only — zero coordinates.** Geometry derives from layer order + component list: layers stack vertically in data order; components grid within their layer; deterministic (same input → same positions). The schema is geometry-free and stays geometry-free (S2 test enforces).
  - **Explode ⇄ implode** on motion tokens: mechanical ease-out-expo signature. `prefers-reduced-motion` → instant static separated state (no animation), per the a11y floor.
  - **Camera rig:** orthographic projection; **locked 45° default azimuth**; rotation only in **90° snaps** (UI button + keyboard); zoom within bounded limits; **free-orbit NEVER enabled** (it was explicitly cut — mobile scroll conflict + legibility).
  - **Design-target device: mid-range Android over 4G.** 60fps floor. Slabs are boxes → use **instanced meshes**; keep draw calls minimal; document the budget in the RFC.
  - **Theme neutrality:** S6 applies the full blueprint visual system (materials, edge lines, annotations). S4 uses simple base materials but **must source every color from the S2 theme tokens** — zero hardcoded hex values (grep-enforced like motion literals).
- Dev-playground pattern (established by S3's calibration fixture): engine development happens on a **dev-only route excluded from the production build** (404 on prod, CI-checked).

## Deliverables
1. **Layout engine in `packages/xploder`:** pure function(s) `Project → layout structure` (layer slabs, component slab placements, explode offsets). Deterministic, unit-tested, handles fixtures A and B, degrades sanely for 1–12+ components per layer.
2. **R3F renderer in `packages/xploder`:** React components (peer deps: react, three, @react-three/fiber) consuming the layout + motion tokens; instanced slab rendering; explode ⇄ implode animation (both directions, interruptible-safe); reduced-motion instant twin.
3. **Camera rig:** orthographic camera, locked 45° default, 90° snap-rotate (button + keyboard), bounded zoom, no free-orbit path in code.
4. **Dev playground route in `apps/web`** (e.g. `/dev/engine`): renders fixture A with toggle + rotate + zoom controls; fixture B switchable (query param or control); **excluded from production build** (404 on prod like the S3 fixture).
5. **Base materials token-fed:** colors from S2 theme tokens only; light/dark toggle respected (S1 mechanism); no hardcoded hex (grep test).
6. **Perf proof:** playground holds ≥60fps headless (S3 FPS harness) on fixture A desktop; draw-call/instance budget documented; evidence artifacts attached.
7. **Tests:** layout determinism · no-free-orbit assertion · reduced-motion behavior · motion-literal + hex-literal exclusivity extended over engine code · fixture-exclusion check extended to the new route.

## Non-goals (hard)
- No hover highlight / layer focus / guided tour (S5) · no blueprint materials, edge lines, dimension lines, annotations (S6) · no panels, chips, case-study UI (S7) · no keyboard-nav a11y drill beyond rotate control (S8) · no site shell/landing changes (S10) · no real project content (S9) · no pixel shader (v1.5) · no schema changes (S2 contract frozen — extend the lib with NEW modules only; no breaking changes to schema/parse/tokens public API).

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** `/dev/engine` renders fixture A as stacked layer slabs with component slabs gridded inside; fixture B renders via the switch; layout determinism unit test green; route 404s on the production URL (CI-checked like the S3 fixture).
- **AC2:** explode ⇄ implode works both directions from the toggle; every duration/easing traces to the S2 motion module (exclusivity grep green over engine + playground); with `prefers-reduced-motion`, the exploded state appears instantly with no animation.
- **AC3:** camera defaults to locked 45° azimuth; rotate happens only in 90° snaps via button AND keyboard; zoom stays within documented bounds; a code-level test asserts no free-orbit control exists.
- **AC4:** FPS harness on `/dev/engine` with fixture A runs headless for a window of at least 5s and reports **0 dropped frames** over that window, with trace fps inside the 60 ±10% band as a liveness check. fps, rafFps and p50/p95/max frame interval are reported in the artifact as information, not gated. Evidence artifact attached per EVIDENCE.md.
- **AC5:** layout + renderer live in `packages/xploder`; `apps/web` imports them as a package consumer (no engine logic in the app); schema geometry-free test still green.
- **AC6:** full CI green on the PR — build/typecheck/lint/test, gitleaks, lighthouse gate, weight gate, fps calibration, fixture exclusion — plus screenshots (light + dark, imploded + exploded) attached as evidence.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash: one integration seam + one executable check each. **Every visual/perf task attaches evidence** (S3 CLI; screenshots for visual, harness output for motion/perf) — no exceptions, this is the first slice where "looks right" is a trap.
- Escalation ladder: Flash stuck ×2 → Sol/Gemini (OpenRouter) → ×2 → orchestrator executes. Report which tier finished each task.
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets; gitleaks green.

## Murphy dependencies
- None new. (After merge: eyeball the playground in Orca's browser — first time the product *moves*.)

## Freeze protocol
Frozen at commit; work only on `task/s04-engine-core-a`; integration via PR after Murphy's final validation. Scope/AC changes = revision, logged in the vault revision log with reason code. Design decisions (instancing strategy, layout algorithm details, zoom bounds, GSAP-vs-tween mechanics, draw-call budget) live in `.specify/features/engine-core-a/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution. **This slice is the Large-effort split candidate: if it accrues 2 revisions, split it (layout vs animation vs camera), don't re-plan it.**
