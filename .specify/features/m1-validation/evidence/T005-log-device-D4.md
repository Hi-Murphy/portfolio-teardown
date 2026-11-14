# T005 — D4 desktop Safari (agent via Orca computer-use), 2026-11-14

**Browser:** Safari 26.6.2 (`Version/26.6.2 Safari/605.1.15`), macOS 26.6.2, Apple M4 · **Window:** 1324×940, viewport 1324×888, dark OS theme · **Target:** preview at `89db889` (product = `ffda3a2`) · **Method:** Safari driven through Orca computer-use (accessibility clicks, keys, window screenshots). Web Inspector detached; JS probes run in its console with `copy()` → clipboard. Murphy's Safari setting "Show features for web developers" was turned on by the agent for this (R1/R2).

| Check | Pass condition (RFC §4.2 + R5/R6) | Measured | Result | Shots |
|---|---|---|---|---|
| M1 hero plays | `data-hero-loop="running"`, canvas present, hero changes within 8 s | loop `running`, 1 canvas; 3 of 3 window shots 2 s apart differ in the hero box | PASS | `m1-0`, `m1-2` |
| M2 pause / resume | Pause (real click on the 44×44 button) → after 2 s settle (R6) loop `paused`, frames 3 s apart identical, Play label; Play → loop `running`, hero changes | paused: identical, `paused`, label "Play animation"; resumed: `running`, differs at +2 s | PASS | `m2-paused-a/b`, `m2-resumed-2` |
| M3 scroll snap | one page down lands on Projects; back up returns to the hero | Page Down → y 888, Projects top 0; Page Up → y 0. Snap `y mandatory`. (Wheel input was refused by the window manager in the background, so keyboard paging = S11.9 T011i check 6 was used) | PASS | `m3-down`, `m3-up` |
| M4 snap off under reduced motion | reduced motion → no snap, poster, no canvas | Web Inspector "Override user preferences → Reduce motion: On" + reload: `prefers-reduced-motion` matches, `scroll-snap-type: none`, 0 canvas, live state `skipped`, visible poster with steps 1–7, 0 running animations; 4× ArrowDown → y 160 (no snap, Projects top 728). Override reset to System afterwards | PASS | `m4-poster`, `m4-scrolled` |
| M5 component panel | gate → select a component → panel visible → close → gone | "Explore in 3D" → "Socket wrap": panel 320×325 ("Socket wrap × module · shipped …"); "Close details" → 0 visible panels | PASS | `m5-open`, `m5-closed` |
| M6 no console errors | 0 errors over load, hero, pause/play, project route, gate, panel | clean pass after clearing: `/` reload + 15 s + pause/play → 0 errors, 1 warning; client navigation to the project route + gate + panel open/close → 0 errors, 2 warnings (both `THREE.Clock` deprecation, I-04) | PASS | `m6-console-home`, `m6-console-project` |
| M7 no horizontal scroll | `scrollWidth ≤ clientWidth`, `scrollTo(500, y)` keeps `scrollX` 0 | `/`: 1307 ≤ 1307, scrollX 0; project: 1307 ≤ 1307, scrollX 0 | PASS | — |

**Harness note:** earlier probing used `copy()` inside timers and produced 7 `ReferenceError: Can't find variable: copy` entries. These came from the agent's console input, not the site (`T005-screenshot-D4-console-harness-errors.png`), so the console was cleared and M6 re-run cleanly as above.

**Observation (→ triage):** during the zoomed storyboard the engine note "5 layers" briefly overlaps a layer name ("CAPTURE") at 1324 px (I-05, visual; `T005-screenshot-D4-i05-overlap.png`).
