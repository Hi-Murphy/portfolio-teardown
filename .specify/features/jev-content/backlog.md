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
