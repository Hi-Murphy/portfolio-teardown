# S14 revision 1 of 2 — hero storyboard holds (Murphy, 2026-11-15)

**Trigger:** Murphy's validation of PR #25 on the landing page: the labelled exploded view "shows so fast. can you pause a little bit on each section? so user actually can see what shows there before move to next animation" (screenshot of the exploded hero with layer names and part callouts).

**Measured before (T001, base a9edbfc):** labels visible ≈ 0.2 s after the explode settles before the zoom starts; ≈ 0.12 s after the zoom settles before the capture tour; the next flow / the turn starts immediately when a tour ends.

**Decision (Murphy, option "Medium"):** hold the exploded + labelled view ≈ 3.2 s, the zoomed view ≈ 1.6 s, and 1.6 s at the end of each flow tour. Values reuse existing motion tokens only (`tourBeat`, `tourPulse`, `explode`, `implode`, `tourStep`); no new token (`packages/xploder/src/motion` is S2-frozen and stays untouched).

**Scope:** `apps/web/components/hero/hero-loop.ts` (`HERO_STORYBOARD_MS` + the tour-end hold) and `apps/web/test/home-hero-loop.test.tsx`; both already on the S14 allowed-paths list, so no guard changes. Not one of the six brief items — recorded as revision 1 of 2 at Murphy's request, outside the brief's AC list (no AC reworded). Task T013.
