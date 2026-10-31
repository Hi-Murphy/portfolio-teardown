# Slice 06 — Blueprint Theme Applied · FROZEN BRIEF v1

**slice:** S06-blueprint-theme · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s06-blueprint-theme` · **depends on:** S5 ✅ (AC1–AC7; PR #8 + prod evidence PR #9) · **revision counter:** 0 of 2

## Mission
Turn the token-fed base materials into the portfolio's **blueprint drafting-table visual language**: light default + dark alternate, edge lines, dimension/callout language, and circuit-trace tour highlight. Preserve S4/S5 behavior, performance, and accessibility. No new interaction capabilities, panels, or site shell.

## Context (self-contained — the orchestrator reads ONLY this brief)
- S4/S5 shipped the renderer in `packages/xploder`: auto-layout, explode/implode, orthographic camera, snap rotate, bounded zoom + vertical scroll when zoomed, hover/tap highlight, layer focus, guided tours, reduced-motion states, HTML tour captions. S5 v2 AC7 is the zoom-reachability fix; do not regress it.
- S2 shipped palette/theme tokens and motion tokens. **No hardcoded hex, duration, or easing literals.** S3 shipped evidence gates. S5 confirms 2 draw calls and full PR gates green.
- **Theme:** blueprint drafting-table. Light default = warm paper-white background, ink-blue lines, steel/cyan accents, charcoal mono labels. Dark alternate = deep navy background, light/cyan lines, same semantic accents. Theme toggle/OS preference/no-flash from S1 remains intact. Blueprint is the only theme with two palettes; future themes are single-palette.
- **S5 carry-over:** default `explodedGap: 1.1` hides some lower-layer components at the default angle (fixture A tide-repository; fixture C booking-service/notifier). S5 playground uses `explodedGap: 2` via layout options. Decide and document the product default in this slice; visual evidence must show all required components at the chosen default.
- **S5 carry-over:** click/tap details are intentionally deferred to S7 because S5's hard non-goals excluded panels. Do not add a detail panel here.
- **S5 carry-over:** tour live-region first-step announcement polish is S8, not this slice.

## Deliverables
1. Blueprint slab materials and semantic category colors using S2 tokens only; light/dark parity.
2. Crisp slab edges/outline treatment appropriate to the low-poly geometry; no texture asset pipeline.
3. Dimension lines, part-number callouts, and layer labels as HTML/SVG overlays (selectable/crawlable; never baked into WebGL); responsive at 360px+.
4. Guided-tour circuit trace/pulse between component anchors, reusing S5 tour state and S2 motion tokens; reduced-motion instant/static twin.
5. Product default `explodedGap` decision (default may become 2 if evidence supports it), documented in RFC and tested; all fixture A/C required components reachable/visible at default angle.
6. Evidence screenshots: light/dark × imploded/exploded × tour highlight; at least one max-zoom top/bottom reachability check proving S5 AC7 remains green.
7. No regressions: S2/S4 frozen-surface checks, 2 draw calls, zero CLS contribution, full CI/perf gates.

## Non-goals (hard)
- No new detail/case-study/tech panels (S7) · no new hover/tap behavior (S5 is frozen) · no a11y live-region polish (S8) · no site shell/landing routes (S10) · no real project content (S9) · no pixel/papercraft theme · no schema/API changes · no camera-rig changes · no replacing the token system.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** light default and dark alternate render the blueprint palette with toggle + OS preference/no-flash preserved; palette colors come only from tokens (hex exclusivity green).
- **AC2:** slabs have crisp blueprint edge/outline treatment and semantic category accents; no texture assets; 2 draw calls on fixture A remain.
- **AC3:** layer labels, part numbers, and dimension/callout overlays are selectable HTML/SVG, readable at 360px+, and do not contribute CLS; screenshots prove light+dark readability.
- **AC4:** tour circuit trace/pulse follows actual flow component order; reduced-motion produces an instant/static equivalent; motion exclusivity green.
- **AC5:** product `explodedGap` is explicitly decided in RFC; default-angle evidence shows all required fixture A/C components reachable/visible; S5 zoom-scroll AC7 remains green (top+bottom max-zoom evidence).
- **AC6:** full CI green on PR (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion); S2/S4/S5 frozen-surface checks remain empty; zero CLS contribution from theme overlays.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash: one integration seam + one executable check each. Every visual claim attaches evidence per `.specify/EVIDENCE.md`; no “looks right” reports.
- Escalation ladder: Flash stuck ×2 → orchestrator executes personally. Tier 1.5 Sol/Gemini via OpenRouter is **DORMANT** — skip-with-record unless `OPENROUTER_API_KEY` is present (Murphy decision 2026-10-30).
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets; gitleaks green.

## Murphy dependencies
- None new. Post-merge: inspect both palettes and the callout readability in Orca's browser.

## Freeze protocol
Frozen at commit; work only on `task/s06-blueprint-theme`; integration via PR after Murphy's final validation. Scope/AC changes = revision, logged in vault. Design decisions (materials, overlay layout, circuit-trace geometry, default gap) live in `.specify/features/blueprint-theme/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution. Viewport reachability is mandatory wherever zoom is involved.
