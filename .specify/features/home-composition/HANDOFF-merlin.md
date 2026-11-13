# Handoff to Merlin — S11.9 Home Composition

**For:** Merlin's vault (brief owner) · **From:** orchestrator (Opus 5.5) · **Approved by:** Murphy, who answers for Merlin · **Branch:** `task/s11.9-home-composition` · **Brief:** `.specify/slices/slice-11.9-home-composition.md` (frozen v1, unedited)

The frozen brief scoped S11.9 as **composition only**: no new features, no motion or engine change, and frozen surfaces S2–S8 empty. During Stage 3, Murphy widened the hero on purpose. Each change was approved in chat, recorded as an R-refinement in `rfc.md` §13, and proven with evidence in `evidence/`. Treat this note as the record of the brief revision (1 of 2) that those decisions amount to.

## Deviations from the frozen brief

| # | What changed | Brief text it departs from | Approved | Evidence |
|---|---|---|---|---|
| R1 / R1a | The employer name in About is redacted to `████████` (8 × U+2588) | "no new copy claims" (this removes a claim, adds none) | Murphy, G1 + 2026-11-08 | `T001-log-content.txt` |
| R2 | `meta.description` no longer names the employer (later rewritten in the content pass, T011g) | — (content) | Murphy | `T001-*`, `T011g-log-content.txt` |
| R3 | New content key `contact.title` for the new Contact section | "no sections that need new content" (the heading is the only new string) | Murphy, G1 | `T009-log-contact.txt` |
| R6 | The hero animates: a looping teardown with a pause control | "no new features", "no motion changes" | Murphy | `T011b-log-loop.txt` |
| R7 | Pause/play button (WCAG 2.2.2) + content keys `hero.loopPause` / `hero.loopPlay` | as R6 | Murphy | `T011b-*` |
| R8 / R8b | Narrated "frame travel" tour of the project's real flows; the proof strip was tried, then removed; the secondary CTA was removed; the primary CTA became a text link | as R6; the brief's hero listed two CTAs | Murphy | `T011c-*`, `T011d-*`, `T011e2-*` |
| R9 | Full-screen "blueprint sheet" hero (from mockups A–D) + CSS scroll snap between the hero and Projects on `/` only (off under reduced motion) | "composition only" | Murphy | `R9-mockup-blueprint-v2.html`, `T011i-*`, `T011j-*` |
| R10.1 | Step labels float next to the active component, with token fades | as R6 | Murphy | `T011k-*` |
| **R10.2** | **Engine change: an opt-in smooth camera zoom** (`useTeardownViewer({ smoothZoom })`, default off and unchanged) | **AC7 "frozen surfaces S2–S8 empty"** | **Murphy: "do B … make a handoff so Merlin adds it to his vault"** | `T011l-log-zoom.md` |
| T011f | The home poster shows the numbered frame path for reduced motion / Save-Data (an opt-in poster prop; other routes identical) | as R6 | Murphy | `T011f-*` |
| T011g | Content pass: hero role line, description, CTA label, meta description | — (content) | Murphy | `T011g-log-content.txt` |

## The AC7 exception, precisely

- **Files:**
  - `packages/xploder/src/engine/camera.ts` (`createZoomTween`);
  - `packages/xploder/src/react/scene/CameraRig.tsx` (tween applied only when `rig.smoothZoom`);
  - `packages/xploder/src/react/useTeardownViewer.ts` (`smoothZoom?: boolean`).
- **Re-sealed** per the S11.8 procedure at lever commit `3aee8fc`:
  - S2/S4 and S5 generators carry `Re-sealed in S11.9 at 3aee8fc …` notes;
  - manifests regenerated, `frozen-surface.test.ts` updated;
  - list in `approved-xploder-src.txt`.
- **Default behaviour is unchanged.** The project route's zoom stays instant. Reduced motion is instant. No new motion token.
- AC7's wording is **not** reworded. The self-check reports it as "exception approved by Murphy".

## Cross-route effects (other routes), all ledgered

L1 footer `id="contact"` moved · L2 nav targets 44×44 · L3 footer brand link 44 px · L4 compact card tagline 16 px (`/` and 404) · L5 labels from content (renders identically) · L6 footer contact block hidden on `/` only (CSS `:has()`) · L7 description meta. `/projects*` `<main>` is byte-identical (`cross-route.sh`).

## Tooling added (reusable)

- `home:probe` (order, fold, responsive, structure, copy);
- `eager:probe --save-data` and `--expect live-loop`;
- mode-aware `site:probe` hero/drill;
- `regress-hero.sh`, `cross-route.sh`, `guards.sh`.

## Suggested vault entries

1. **D-19 / D-28 amendment:** the home hero is now an **animated storyboard** (explode → zoom → follow the real flows → zoom out → turns → implode). Reduced motion / Save-Data / no JS: the poster with the numbered path.
2. **xploder:** opt-in `smoothZoom` exists, and the open-source API should mention it. The hero's camera follow relies on the engine-rendered DOM markers `[data-xploder-stage]` and `[data-xploder-trace-pad]` (one module, `components/hero/hero-dom.ts`, with a contract test). A typed anchor on the handle would be a cleaner future API.
3. **Engine robustness:** the engine's `useTourClock` advances on a single `setTimeout`. In a throttled embedded browser it fired late, and the hero now self-heals with a watchdog (T011n). An engine-side re-sync on visibility/focus would remove the need for it.
4. **S12:** the 15-second validation should measure this final hero.
