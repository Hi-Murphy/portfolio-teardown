# Slice 08 — A11y Floor: Keyboard · Screen Reader · Contrast · No-JS · FROZEN BRIEF v1

**slice:** S08-a11y-floor · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s08-a11y-floor` · **depends on:** S7 ✅ (PR #12 → `10c10037`) · **revision counter:** 0 of 2

## Mission
Make the teardown **usable without a mouse, without sight, and without JavaScript**: complete keyboard operation, screen-reader announcements, AA contrast, and a no-JS/WebGL fallback. Presentation is frozen — this slice adds affordances, not design.

## Context (self-contained — the orchestrator reads ONLY this brief)
- Live from S7: detail panel (click/tap, close via same-slab/Esc/outside/close control, focus returns to viewer **after** closing — but a pointer-opened panel does not move focus on open), case-study panel, tech chips, tour with click-to-jump (in-flow = jump keeping play state; not-in-flow = pause + panel; Play resumes same step, no auto-resume).
- Live from S7 revision 1: isometric part/layer lettering on slab faces + compact phone parts column. **Lettering is decorative** — accessible names must come from component/layer names, not from the visual labels.
- Live from S5: tour caption overlay with a persistent `aria-live` region — but it **mounts when a tour starts**, so some screen readers may skip step 1's announcement (S5 carry-over, fix here).
- Live from S6/S7: blueprint palettes (light default, dark alternate), dimension lines/callouts, 2 draw calls, zero CLS, reduced-motion twins for existing animations.
- **S7 carry-overs (binding):** (a) pointer-opened detail panel doesn't move focus — fix the focus story; (b) no keyboard component selection yet; (c) screen-reader pass over panels, chips, and lettering.
- Prior gates: Lighthouse a11y ≥95 runs on the **production placeholder page only** (`/dev/engine` is dev-only). This slice must bring real a11y testing to the engine surface (axe on `/dev/engine` in CI + a documented manual AT pass).

## Deliverables
1. **Keyboard navigation:** keyboard-reachable component selection (arrow-key cycle or equivalent list, visible focus indication on the focused slab and in the DOM), `Enter`/`Space` opens the detail panel, `Esc` closes and returns focus; tab order covers viewer controls → components → panels → case study; skip-link where appropriate; no keyboard traps.
2. **Focus management:** pointer-opened panel moves focus into the panel (or to a documented, tested equivalent) without breaking the S7 "focus returns to viewer on close" contract; tour-jump keeps focus sane.
3. **Screen reader announcements:** live region mounted at viewer mount (not tour start) so step 1 announces; panel open/close announces component name + role; chips announce label + category; **lettering is `aria-hidden`** with accessible names provided elsewhere; tour click-to-jump announces the jump.
4. **Contrast:** AA (4.5:1 body text, 3:1 large text/UI) verified by measurement in **both palettes** for labels, chips, captions, panel text, and callouts; fix any token-level offenders at the CSS-variable layer only.
5. **No-JS / WebGL-fail fallback:** with JS disabled, the page renders a static poster + accessible project list (links/names); when WebGL is unavailable, a message + the same list (no blank canvas, no crash).
6. **Automated a11y gate:** axe-core scan on `/dev/engine` (both palettes, mobile + desktop viewports) in CI — **zero serious/critical** violations; fail the check otherwise.
7. **Reduced-motion coverage matrix:** every animation listed with its reduced-motion twin, verified (0 animations under emulation), including S7 additions.

## Non-goals (hard)
- No visual redesign (S6/S7 sealed) · no new interaction features beyond a11y affordances · no site shell, landing, routes (S10) · no real content (S9) · no schema/API changes · no camera/layout changes · no cross-project chip links (S14) · no pixel/papercraft theme.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** keyboard-only drill passes for fixtures A and B: every component selectable via keyboard, panel opens from the keyboard, `Esc` closes it, focus returns to the triggering element, no traps, tab order logical; automated drill script + log attached.
- **AC2:** screen-reader evidence: live region mounts at viewer mount and announces step 1 (asserted in the DOM test), panel open/close announcements assertable in the accessibility tree, chips carry label+category, **lettering nodes are `aria-hidden`** and expose no duplicate accessible text; ARIA snapshot evidence attached.
- **AC3:** axe-core on `/dev/engine` light+dark × desktop+mobile in CI: **0 serious, 0 critical** violations; the gate fails on regression (proven with a deliberately broken state, reverted).
- **AC4:** measured contrast ratios meet AA for all text/UI surfaces in both palettes; offending tokens fixed at the CSS-variable layer; evidence table attached.
- **AC5:** reduced-motion coverage matrix complete for all animations (including S7 lettering/panel additions) — 0 animations under emulation, with a twin for each; evidence attached.
- **AC6:** JS-disabled render shows poster + accessible project list (screenshot + DOM evidence); no-WebGL path shows the same list plus a message (evidence).
- **AC7:** full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion) + the new axe gate; frozen-surface checks for S2–S7 remain empty; 2 draw calls unchanged; zero CLS.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash 4.1: one integration seam + one executable check each. Every a11y claim attaches machine-made evidence per `.specify/EVIDENCE.md` (AX-tree dumps, measured ratios, axe JSON, drill logs, screenshots).
- Escalation ladder: Flash stuck ×2 → orchestrator executes personally. **Tier 1.5 dormant** — skip-with-record unless `OPENROUTER_API_KEY` is present (Murphy decision 2026-10-30).
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets; gitleaks green.

## Murphy dependencies
- **Required (15 min):** one manual screen-reader pass with macOS VoiceOver on `/dev/engine` following the evidence checklist (axe cannot prove SR behavior). This is the only slice where a human AT pass is an acceptance dependency.

## Freeze protocol
Frozen at commit; work only on `task/s08-a11y-floor`; integration via PR after Murphy's final validation. Scope/AC changes = revision, logged in vault (counter 0 of 2). Design decisions (keyboard model, focus strategy, aria structure, axe integration, contrast token fixes) live in `.specify/features/a11y-floor/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution.
