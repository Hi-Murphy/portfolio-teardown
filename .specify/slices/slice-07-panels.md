# Slice 07 — Panels: Component Detail · Case Study · Tech Chips · FROZEN BRIEF v1

**slice:** S07-panels · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s07-panels` · **depends on:** S6 ✅ (PR #10 + fix #11 → `0b2c6785`) · **revision counter:** 0 of 2

## Mission
Give the teardown its **reading layer**: an HTML detail panel on component click/tap, a case-study panel per project, and tech chips from the registry. This is the first slice where the product becomes *informative* rather than merely explorable — and the first that consumes the story/data fields Murphy will fill in S9.

## Context (self-contained — the orchestrator reads ONLY this brief)
- **Live from S6:** blueprint theme applied — materials/edges from tokens, dimension lines + part-number callout columns (light+dark), circuit-trace tour, **product `explodedGap` = 2.0 at the viewer level** (S4 `LAYOUT_DEFAULTS` 1.1 untouched), 2 draw calls sustained at rest/mid-tour, zero CLS from overlays.
- **Live from S5:** `viewer.highlight` + `actions.highlight(id)`; tour player with caption beats; `TourCaption` palette-styled HTML overlay with a persistent `aria-live` region; pointer picks by `clientX/clientY` (not `event.target`); viewer DOM = wrapper (`tabIndex 0`) → stage (`overflow-y: auto`, pointer listeners) → sticky canvas viewport + scroll spacer; tour caption is a sibling of the stage.
- **Live from S2 schema (field contract for this slice):** `component {name, role?, tech?[] (registry ids), metrics?[{label,value}], links?[{label,url}], kind?, status?}` · `story {problem?, approach?, decisions?[], outcome?, metrics?[{label,value}]}` · tech registry `{id, label, category, color?}`. Fixtures A/B/C carry `name`/`role`/`metrics`; fixture C exists for multi-flow.
- **Motion tokens already include `panelEnter` / `panelExit`** — consume them; never invent values.
- **Carry-over from Murphy's S5-G4 gate (binding):** click/tap a component slab → show its details in an HTML panel; close via same-slab tap, `Esc`, or tapping elsewhere; **the panel never covers the selected slab**; zero CLS; reduced-motion twin.
- **Open question to settle in the RFC (default recommended):** click during an active tour → **if the component is in the active flow, jump the tour to that step** (highlight + caption sync, tour keeps playing); **if not, open the detail panel and pause the tour**. Rationale: direct manipulation beats modal lock-out; the tour is a guide, not a jail. Murphy confirms at Gate 1.

## Deliverables
1. **Component detail panel (HTML):** opens on slab click/tap; shows name, role/summary, tech chips (registry labels, category accents), metrics list, source links (`rel="noopener"`, external). Closes via same-slab tap, `Esc`, outside tap, and a visible close control. Focus returns to the viewer wrapper on close. Panel is a positioned overlay — **never reflows the stage**.
2. **Placement logic:** panel anchors to the viewport side opposite the selected slab's on-screen position so it never covers the selected slab; handles top/bottom/left/right slab positions, exploded and imploded states, and both zoom bands; unit tests for the placement function + screenshot evidence.
3. **Case-study panel:** opens from a viewer-chrome control ("Case study"); renders `story` (problem → approach → decisions → outcome) + project metrics; scrollable, palette-styled, closable; never blocks the canvas permanently; both palettes.
4. **Tech chips:** display-only in this slice (cross-project links are S14) — registry label + category accent from tokens; accessible markup (list semantics), no hex literals.
5. **Tour interaction:** implement the RFC-decided click behavior (default above) with tests: jump-to-step keeps highlight + caption in sync; not-in-flow opens the panel and pauses the tour; resuming continues from the current step.
6. **Motion + reduced-motion:** `panelEnter`/`panelExit` tokens; reduced-motion → instant show/hide; no layout animation on the stage.
7. **Evidence:** screenshots light+dark × (detail panel at 4 slab positions, case-study panel, chips, tour-jump state); zero-CLS measurement; interaction/keyboard log; tests for open/close and placement.

## Non-goals (hard)
- No cross-project chip links or "also used in" (S14) · no annotation/callout changes (S6 frozen) · no full a11y drill / screen-reader pass (S8) · no site shell, landing, routes (S10) · no real project content (S9 — fixtures only) · no schema/API changes · no camera/layout/explode changes (S4/S5 frozen) · no pixel/papercraft theme.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** detail panel opens on click/tap with complete schema-driven content (name, role, chips with registry labels, metrics, links); closes via same-slab tap, `Esc`, outside tap, close control; state-machine tests green; focus returns to the viewer.
- **AC2:** panel never covers the selected slab — placement tests green for top/bottom/left/right slab positions × exploded/imploded × both palettes; screenshot evidence attached.
- **AC3:** case-study panel renders story sections + project metrics from schema, is scrollable, closes, and works in both palettes (screenshots).
- **AC4:** tech chips render from the registry with token-derived category accents; hex exclusivity grep green; chips are display-only (no navigation yet).
- **AC5:** tour-click behavior implemented exactly as decided in the RFC (recommended default: jump-to-step when in the active flow, else pause + panel); tests cover both branches; caption + highlight stay in sync after a jump.
- **AC6:** zero CLS from panel/chip overlays (measured); panel motion tokens only; reduced-motion instant twin; full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); frozen-surface checks for S2/S4/S5/S6 remain empty; 2 draw calls unchanged.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash 4.1: one integration seam + one executable check each. Every visual/interaction claim attaches machine-made evidence per `.specify/EVIDENCE.md`.
- Escalation ladder: Flash stuck ×2 → orchestrator executes personally. **Tier 1.5 dormant** — skip-with-record unless `OPENROUTER_API_KEY` is present (Murphy decision 2026-10-30).
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets; gitleaks green.

## Murphy dependencies
- None new. Post-merge: click through a component and a case study in Orca's browser — first time the portfolio *tells* you something.

## Freeze protocol
Frozen at commit; work only on `task/s07-panels`; integration via PR after Murphy's final validation. Scope/AC changes = revision, logged in vault (counter 0 of 2). Design decisions (placement algorithm, focus management, tour-jump mechanics, panel layout) live in `.specify/features/panels/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution. Viewport reachability remains mandatory wherever zoom is involved.
