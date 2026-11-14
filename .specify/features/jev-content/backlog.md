# S13 → vault backlog (import into the vault)

Items found during S13 that ship open. Same format as `.specify/features/m1-validation/backlog.md`; ids continue its numbering.

---

### I-09 — Hovering another tile clears the open panel's highlight
- **Severity:** Sev-3 · **Owner:** orchestrator · **Area:** `xploder` engine (frozen S5/S8 surfaces) · **Found by:** Murphy, S13 G2 check (2026-11-14), `/projects/jev-toolkit`; same code path on every project (websocket-inspector included)
- **What:** clicking tile 2.4 opens its detail panel and highlights 2.4. Hovering another tile moves the highlight to that tile; moving off clears it, so 2.4 is no longer highlighted while its panel is still open.
- **Why:** the engine keeps one highlight slot (`src/interaction/pointer.ts`, `PointerState.highlight`). Opening a panel writes a `program` highlight once (`src/react/TeardownViewer.tsx`, the detail-panel `useLayoutEffect`, S7 RFC D4); a mouse `move` replaces it (`source: 'mouse'`) and `leave` clears it. `src/interaction/emphasis.ts` `emphasisTargets` lights only that one id.
- **Wanted (Murphy):** the tile whose panel is open stays highlighted for as long as the panel is shown; hover may light another tile at the same time.
- **Next step:** an engine-polish slice: give the open panel's component its own emphasis input (e.g. `selected` in `EmphasisInput`, lit alongside `highlight`), test-first, then re-seal S5/S8. Bundle with I-03, I-04, I-05.
- **Decision:** Murphy, 2026-11-14: "write it down on backlog. we will do this later" (not in S13; revision 2 of 2 kept unused).

### I-10 — Home hero timing flake in the CI site probe (drill + tiny CLS)
- **Severity:** Sev-3 (flaky; re-run green) · **Owner:** orchestrator · **Area:** home hero (S11.9) ↔ `tools/perf` site-probe `drill` / `cls` · **Found:** S13 T010, PR #24, run `43586127421` attempt 1 on `5ec52d3` (attempt 2 green; previous run on `f4a53e2` green; 0/5 locally)
- **What:** (1) `drill-shift-tab-reverses` / `drill-no-trap`: the hero's loop pause button (`hero:pause`) appeared between the forward and the backward tab walk, so the reversed list did not match. S11.9 already treats `hero:pause` as optional, but only within one walk, not across the two. (2) `cls-/-mobile-dark` 0.0000735: two 18 px hero corner marks near the viewport bottom (x 10 / 384, y 793 → 818) moved down ~25 px once, i.e. the hero grew slightly when the live loop's controls appeared.
- **Not S13 code:** `apps/web/components` and `app` are byte-identical to base (`UI-UNCHANGED-OK`); not yet proven on base (would need repeated CI runs).
- **Next step:** in an engine/hero-polish slice: wait for the hero's settled state (live-loop button present or gated) before the drill's forward walk; check whether the hero's reserved height covers the caption controls on mobile so the corner marks never move. Bundle with I-03/I-05/I-09.
- **Evidence:** `.specify/features/jev-content/evidence/T010-G18-ci-flake-attempt1.txt`
