# T001 noise-floor diagnosis (orchestrator)

**Base:** `021c1ff` export, served locally on 127.0.0.1 · Chromium 156.0.8078.4 · the same machine for every run.

**The result being diagnosed:**
- `T001-log-parity-noise.md`: base vs base (4 workers), `parity: FAIL (2040 cells, 323141 px)`;
- 218 cells have pixel differences;
- 1,763 cells have DOM (number) differences.

## Breakdown of the 218 pixel-noisy cells (from `T001-log-parity-noise.md`)

| scroll class | cells | px |
|---|---:|---:|
| `middle` (settled while scrolled) | 168 | 220,422 |
| `n-a` (zoom 1, no scroll) | 28 | 85,660 |
| `imploded` | 9 | 9,705 |
| `bottom` | 11 | 6,293 |
| `top` | 2 | 1,061 |

## Probes (scripts and raw output in `/tmp/s16-checks/probe/`, not committed)

1. **Same page, serial, run twice** (`--only websocket-inspector-390-light --workers 1`):
   - every zoom-1 cell is identical (0 px, DOM equal);
   - zoomed cells after a turn have DOM number drift at about 1e-14 px (e.g. `66.51596096416387` vs `66.51596096416388`) with 0 px;
   - scrolled `middle` cells after a turn have 95–3,122 px of difference.
   The diff masks show slab edges plus a few label glyphs: the whole scene shifted sub-pixel.
2. **Same page, serial, run twice** (`--only jev-toolkit-1440-light --workers 1`):
   - zoom-1 cells (`n-a`) are now 0 px, so their noise in the 4-worker run was load-induced;
   - zoomed cells still drift in DOM numbers;
   - one scrolled cell differs by 189 px.
3. **Fresh load, 4 turns, repeated 4 times** (jev-toolkit 1440, zoom 1): the label DOM hash is identical in every run and after every turn. The label pipeline itself is deterministic.
4. **Scroll after a turn** (websocket-inspector 390, zoom 2, scrollTop set to 139, then a turn): after each settle the stage's `scrollTop` was 137, 138 or 139, and the `data-xploder-scroll-extent` value changed in the last ulp (`278.2065234375` / `…5001` / `…49987`). The values differ between runs.
5. **The same with Playwright's fake clock** (fixed 16 ms frames, stepped one frame at a time): it is still non-deterministic (137/138/139 and ulp extents). Frame timing is therefore not the only source. The scroll clamp and the extent feedback interleave with real browser layout and scroll events.
6. **Viewer size** (jev 1440, three loads): the wrapper box `177, 383.25, 1086×628` and the canvas `1086×628` are identical every time. Size and fonts are not the cause.

## Cause

- A turn or zoom while the viewer is zoomed changes the scene's vertical extent frame by frame.
- The scroll-extent feedback (the S5 view scroll and the S4 camera view offset) iterates over those frames. It ends on:
  - an extent value that differs in the last bits, which moves every projected point by about 1e-14 px;
  - when the stage is scrolled, a `scrollTop` clamped to a slightly different value, which moves the scene and the settle offset by 1–2 px.
- Both depend on how real browser scroll and layout events interleave with frames, so neither a fake clock nor serial runs remove them.
- The label pass receives this input and is deterministic for a given input (probe 3).
- Parallel workers add load-induced noise on top: the zoom-1 cells are clean when run serially.

**Code involved:** `src/react/scene/ViewScroll.tsx` and `src/interaction/scroll.ts` (S5), and the camera view offset (S4 `CameraRig.tsx`, `layout/view.ts`). These surfaces must stay empty in S16 (AC6), so the agent cannot change this.

## Consequence for AC2 (hard STOP: tasks.md T001)

- Base vs base is not 0 px in every cell. So for the cells that are noisy in the base itself, 0 px against S15 cannot be proved by any build, including S15 against itself.
- No tolerance was introduced. The decision is escalated to Murphy.
