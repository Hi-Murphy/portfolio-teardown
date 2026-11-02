# VoiceOver checklist: S08 A11y Floor (Murphy, about 15 min)

This is the brief's one human acceptance dependency (AC2's human leg): axe cannot prove screen-reader behaviour. Tick ✅ or ❌ in each box and add a note next to any ❌. The agent fixes every ❌ inside Stage 3, before the merge.

## Setup (2 min)

1. In the repo worktree, run `pnpm dev` (the agent can start it for you).
2. In **Safari**, open `http://localhost:3000/dev/engine?fixture=a`. Use `localhost`, not `127.0.0.1`.
3. Turn VoiceOver on with **⌘F5**.
4. VO = Control + Option. Useful keys:
   - VO + → / ← read next / previous;
   - Tab / Shift+Tab move between focusable items;
   - VO + U opens the rotor;
   - VO + Space presses the current item.
5. Leave reduced motion off unless step 13 says otherwise.

## Steps

| # | Do | Expect to hear (roughly) | ✅/❌ |
|---|---|---|---|
| 1 | Press Tab once from the top of the page | "Skip to engine controls, link". The link becomes visible top-left | ☐ |
| 2 | Tab again | "Tidewatch architecture view, group", then the help text: "4 layers, 8 components. Use Left and Right Arrow to rotate …" | ☐ |
| 3 | Press Left Arrow, then + | The drawing turns, then zooms. There is no speech flood | ☐ |
| 4 | Tab once | "Beachgoer, button". Then "Item 1.1, Interface layer, actor" (or similar), possibly with list context "Interface, list". An accent outline appears on the slab | ☐ |
| 5 | Press Down Arrow three times | Each part is read by **name** ("Tide Chart Screen …", "Forecast Details Panel …", "Tide View Model …"). Numbers like "1.2" are **not** read as stray text | ☐ |
| 6 | Press Enter | "Tide View Model" + "web dialog" (or "dialog"), then its description "store · shipped …"; its summary is read once or twice. **Verbosity check:** is the open announcement said twice in a way that annoys? Note it (step 14) | ☐ |
| 7 | Inside the panel, press VO + → until you reach the Tech list (open a part with tech, e.g. Down to "Tide Repository" first) | Chips read as "Kotlin, language", "Kotlin Coroutines, library", … | ☐ |
| 8 | Press Esc | "Tide Repository details closed" (or the part you opened). Focus is back on the **same part** (VO cursor on that button) | ☐ |
| 9 | Click a part with the **mouse** (VO on) | Focus goes into the panel (the heading is read). Esc → back to the drawing ("architecture view, group") | ☐ |
| 10 | Tab to the "Play" tour button (in the controls below), press VO + Space | "Live update · Step 1 of 6. Beachgoer. A person checking the next high tide …". **Step 1 must be heard** (S5 carry-over) | ☐ |
| 11 | While it plays, Shift+Tab back to Components, arrow to "Tide Repository", press Enter | "Jumped to Live update · Step 4 of 6. Tide Repository …". The tour keeps playing | ☐ |
| 12 | Arrow to "Forecast Details Panel" (not on the tour route), press Enter | "Tour paused. Forecast Details Panel, …" and the panel opens. Esc → back on that part | ☐ |
| 13 | Open the rotor (VO + U), look at Headings and Form Controls / Buttons | No lettering numbers ("1.1", "3.2") and no S6 callout text as separate items. Parts are listed by name | ☐ |
| 14 | Verbosity verdict (from step 6) | Keep both the focus announcement and the live "opened" message, **or** drop the live open message (`ANNOUNCE.detailOpen = false`, a one-line change) | ☐ keep / ☐ drop |
| 15 | Press the theme toggle (moon icon), then repeat steps 4–8 quickly in **dark** | Same speech; the outline and text stay readable | ☐ |
| 16 | Optional: System Settings → Accessibility → Display → **Reduce motion** on, reload, toggle Explode | Nothing animates; every change is instant | ☐ |

## Result

- Overall: ☑ **pass** (Murphy, 2026-11-02: "VoiceOver pass"), Safari + VoiceOver on `pnpm dev` `/dev/engine?fixture=a`
- Notes: none reported. Step 14 verbosity: keep (no change requested).

Turn VoiceOver off with ⌘F5. Tell the agent the result. "VoiceOver pass" plus any notes is enough.
