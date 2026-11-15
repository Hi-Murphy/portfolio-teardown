# Slice 16 — Label System (one layout pass) — FROZEN BRIEF v1

**slice:** S16-label-system · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M2 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S15 ✅ (`fae4ac6`; S5 `5d3abdb`, S6 `8506837`, S8 `8f27462`) · **branch:** `task/s16-label-system` · **frozen:** 2026-11-15 · **revision counter:** 0 of 2

## Mission
**One placement pass for every label.** Today the overlay's annotations and the lettering's part/layer names are placed by two separate models that do not know about each other — so overlaps are prevented by luck and per-feature rules. Merge them into one model and one pass, so overlap is impossible by construction, and make multi-target emphasis native (hover + selected at once).

This is the largest engine refactor so far. It runs **in two stages with a hard validation stop between them**: (1) the unified model with **zero visual change**, (2) the behaviour/placement change on top.

## Scope (E3, E6 — nothing else)

### E3 — one label-layout pass
Merge the S6 overlay placement (`overlay/place.ts`, overlay model) and the S7 lettering placement (`lettering/place.ts`, faces/layers) into **one model and one placement pass** that sees every label at once: overlay tags, dimension notes, title block, plate layer names, face names.
**Surfaces:** **S6 + S7** (S7 frozen since S08), S8 `PartLettering.tsx`, `BlueprintOverlay.tsx`.

### E6 — two-slot emphasis
Hover and selected become **two independent emphasis slots** on the unified model, so A's open panel and B's hover can both be emphasised — extending S14 AC1 (which introduced `selected`) from the tile to the label.

## Constraints (binding)
- **S2/S3/S4/S5 must stay empty** (S5 was just re-sealed at `5d3abdb` for E1/E2; this slice does not reopen it).
- **S6/S7/S8 may be touched and re-sealed**, each with a written reason and a pushed `seal/<surfaces>-<sha>` tag.
- **Stage gate:** the unified model must land with **0 px visual difference** before any placement/behaviour change. STOP there and get Murphy's word.
- No typography changes (no font, size, weight or colour change) — placement and emphasis only.
- No content changes, no new features beyond E3/E6, no new dependencies.
- Gates unchanged: Lighthouse ≥ 95/95 on three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero intact.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — no overlaps, by sweep.** A geometric sweep over **every pair of labels** finds **0 intersections** across: zoom steps 1×/2×/3×, the four rotation snaps, widths 390/768/1440, and scroll positions top/middle/bottom, in both palettes, for both projects and for the fixtures. Rectangles attached.
- **AC2 — pixel parity where nothing overlapped.** Against the S15 baseline, every state that had no overlap must render **0 px difference**. Every changed pixel cluster in states that did overlap is listed with its reason (the old overlap, the new position). A blanket "looks better" is not evidence.
- **AC3 — two-slot emphasis.** With A's panel open and B hovered, **both** A's and B's names are emphasised simultaneously; leaving B keeps A; closing the panel clears A; keyboard focus on A behaves as selected. Extends S14 AC1 to the labels. Evidence: emphasis assertions + screenshots.
- **AC4 — one pass, no churn.** Exactly **one** placement pass per settle (event/log count), and label positions are stable across frames where the scene state is unchanged (no jitter, no re-placement loop).
- **AC5 — cost.** Placement time at CPU ×1/×4 within **+10 %** of the S15 baseline (or inside the measured run spread), 2 draw calls, and **no more than +2 KB gzip** of client JS for the whole slice.
- **AC6 — gates and seals.** Full CI green (7 required contexts); Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; eager hero reveal with zero interaction; every touched S6/S7/S8 file re-sealed with a reason and a pushed tag; **S2/S3/S4/S5 diffs empty**.

## Executor rules (binding)
- **[STOP 1] Model merge, zero visual change.** Prove 0 px parity on the full screenshot matrix, then STOP for Murphy's word before touching placement behaviour.
- **Test-first:** the geometric sweep is written **before** the unified placement is switched on; it must fail on a seeded overlap and pass after.
- One surface family per task; re-seal commits pair with the change that needed them; no batched re-seals.
- No drive-by refactors; a behaviour change outside E3/E6 is a protocol violation.
- Evidence per `.specify/EVIDENCE.md`; every rectangle, count and byte attached; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Decisions set at freeze (defaults — Murphy may override at G1)
1. **Rotation sweep:** the **four snaps** the site actually offers (0/90/180/270). *(Recommendation: sweep only what ships; a hidden angle is not a user state.)*
2. **Diff budget (AC2):** changed pixel clusters allowed **only** where the baseline had an overlap; no cap on cluster count, but every cluster must be explained. *(Recommendation: correctness over a pixel quota — a quota invites hiding changes.)*
3. **Emphasis visual:** two slots reuse the existing emphasis rendering (same weight/token as `selected` today); **no new visual style**. *(Recommendation: the label system is a layout refactor, not a restyle.)*

## Murphy dependencies
- The **[STOP 1]** review: look at the parity matrix and say "continue" before placement behaviour changes.
- Approve the S6/S7/S8 re-seal file list at G1.

## Freeze protocol
Frozen at commit; work only on `task/s16-label-system`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/label-system/rfc.md`.
