# Slice 05 — Engine Core B: Hover · Layer Focus · Guided Tour · FROZEN BRIEF v1

**slice:** S05-engine-core-b · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s05-engine-core-b` · **depends on:** S4 ✅ (layout/explode/camera) · S2 ✅ · S3 ✅

## Mission
Build the interaction layer on top of Engine Core A: **component hover highlight, layer focus, and the guided data-flow tour** — the comprehension weapon that makes an architecture *readable in motion*. All motion from S2 tokens; all claims with S3 evidence.

## Context (self-contained — the orchestrator reads ONLY this brief)
- Live from S4: layout engine + instanced renderer + explode⇄implode + camera rig (locked 45°, 90° snaps, bounded zoom) in `packages/xploder`; dev playground `/dev/engine` (prod-excluded, renders fixtures A and B); 2 draw calls on fixture A.
- Live from S2: schema includes **`flows[]`** — ordered steps referencing component ids with captions; multiple flows per project allowed. Motion tokens are the ONLY source of easings/durations/staggers (grep-enforced). Theme tokens light+dark.
- Live from S3: perf gates + FPS harness + `pnpm evidence` + `.specify/EVIDENCE.md` contract. **Measurement doctrine (from the S04 v2 revision, binding here):** animation perf gates are written in dropped-frames style — *0 dropped frames over a ≥N-second headless window*, fps band as liveness check, raw fps informational. Never a literal fps threshold.
- The guided tour is capability #9 from the PRD — the "easy to understand" goal weaponized: a request walks through the architecture step by step, slabs lighting in sequence with caption beats.
- Design-target device: mid-range Android over 4G. Touch matters: hover has no cursor on touch — tap is the hover equivalent.

## Deliverables
1. **Hover/tap highlight:** pointer raycast → component slab highlights (lift per motion token `hover`, token-fed emissive/outline — no hardcoded colors), cursor affordance on desktop; **tap = highlight on touch**; highlight clears on leave/second tap; zero layout shift; works in exploded AND imploded states.
2. **Layer focus:** activate a layer → all other layers fade to the token-defined dim level; deactivate via toggle or `Esc`; state survives explode/implode and camera snaps; one layer focused at a time.
3. **Guided tour player:** plays a `flows[]` entry step-by-step: highlight target component, caption beat on motion token `tour`, camera stays put (no auto-fly in v1 — keep it calm); controls: play / pause / stop / step; caption renders as **HTML overlay** (selectable text, theme-token styled, never baked into WebGL); multi-flow selector appears when a project has >1 flow; tour coexists with layer focus (focus yields to tour highlight, restores after).
4. **Fixture C (data-only):** new fictional project fixture with **two flows** (happy path + error path) proving the multi-flow selector; validates through the frozen S2 schema with **zero schema/parse/token changes** (additive fixture file only — another generality data point for the lib).
5. **Reduced-motion twins:** hover/focus/tour all render as instant state changes (no tweens, caption stepping preserved) under `prefers-reduced-motion`.
6. **Tests + evidence:** interaction state unit tests (highlight/focus/tour step machine are pure logic in `packages/xploder`); FPS gate in dropped-frames style **during an actively playing tour**; screenshots (light+dark × hover/focus/tour states) via the evidence CLI.

## Non-goals (hard)
- No detail/case-study panels, no tech chips UI (S7) · no blueprint materials/edge lines/dimension annotations (S6) · no full keyboard-navigation drill or screen-reader pass (S8 — S5 only keeps controls keyboard-reachable) · no site shell changes (S10) · no real project content (S9) · no cross-project links (S14) · no camera auto-fly/choreography (v2 candidate) · no pixel shader (v1.5) · **no changes to S2 public API or S4 layout/camera behavior** (extend with new modules only).

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** hover (desktop) and tap (touch emulation) highlight a component slab in both exploded and imploded states; highlight visuals trace to tokens only (exclusivity greps green: motion + hex); zero CLS contribution.
- **AC2:** layer focus dims non-focused layers to the token level; `Esc` and toggle both release; state survives explode/implode and 90° camera snaps; unit tests green.
- **AC3:** tour plays fixture A's flow step-order-exactly (asserted by test); play/pause/stop/step all work; captions are selectable HTML overlay text styled from theme tokens; fixture C shows the multi-flow selector and both flows play; fixture C validates via the frozen schema with zero package-API changes (diff-verified).
- **AC4:** with `prefers-reduced-motion` emulated: hover/focus/tour produce instant state changes, no tweens (verified via emulation + evidence artifact).
- **AC5:** perf gate, dropped-frames style: **0 dropped frames over a ≥5s headless window while the tour is actively playing** on fixture A (`/dev/engine`), fps within the 60 ±10% liveness band, raw fps/intervals reported as information; draw-call count documented and not regressed vs S4 baseline; evidence artifact attached per EVIDENCE.md.
- **AC6:** all engine logic in `packages/xploder` (apps/web thin-consumer test still green); full CI green on the PR (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); `/dev/engine` still 404s on production; screenshots attached (light+dark × hover/focus/tour).

## Executor rules (binding)
- Tasks sized for DeepSeek Flash: one integration seam + one executable check each. **Every visual/motion/touch claim attaches machine-made evidence** per `.specify/EVIDENCE.md` — screenshots for states, harness output for motion perf, touch-emulation traces for tap behavior.
- Escalation ladder: Flash stuck ×2 → Sol/Gemini (OpenRouter) → ×2 → orchestrator executes. Report which tier finished each task.
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets; gitleaks green.

## Murphy dependencies
- None new. (Post-merge: play the tour in Orca's browser — first time the product *explains something*.)

## Freeze protocol
Frozen at commit; work only on `task/s05-engine-core-b`; integration via PR after Murphy's final validation. Scope/AC changes = revision, logged in the vault revision log with reason code (counter: S05 starts at 0 of 2; >2 = split, don't re-plan). Design decisions (raycast strategy, tour state machine, caption overlay mechanics, dim-level token values) live in `.specify/features/engine-core-b/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution.
