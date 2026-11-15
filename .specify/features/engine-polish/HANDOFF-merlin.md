# Handoff to Merlin — S14 Engine & Hero Polish, and the next two engine slices

**For:** Merlin's vault (brief owner) · **From:** orchestrator (Opus 5.5) · **Approved by:** Murphy, who answers for Merlin (2026-11-15: "ok i agree" to two slices) · **Branch / PR:** `task/s14-engine-polish` / #25 · **Brief:** `.specify/slices/slice-14-engine-polish.md` (frozen v1, unedited)

## Part 1 — S14 record

### Outcome

- All six items (I-09, I-10, I-03, I-05, I-04, I-08) were closed test-first. The AC1–AC7 self-check is MET (`evidence/AC-selfcheck.md`). CI was 11/11 green, and the AC2 site probe was clean in 5 of 5 CI attempts.
- Re-seals:
  - S5 + S8 at `edde9d0` (I-09);
  - S6 at `b5a4713` (I-05).
- S2/S3/S4/S7 are empty.

### Revision 1 of 2 used

| # | What | Approved | Evidence |
|---|---|---|---|
| R1 (T013) | Hero storyboard holds: the labelled exploded view 0.19 → 3.40 s, the zoomed view 0.14 → 1.75 s, and each tour end 0 → 1.61 s. Existing motion tokens only; `hero-loop.ts` only | Murphy, after testing the preview: "it shows so fast… pause a little bit on each section", option "Medium" | `evidence/R1-revision-note.md`, `T013-*` |

### Corrections to the brief's assumptions (none changes an AC)

- **C1:** the `THREE.Clock` warning came from `@react-three/fiber` 9.8.2's store, not xploder. It was fixed by a pnpm patch with a `THREE.Timer`-backed clock (no new dependency).
- **C2:** I-03's settle count was already 1. The real defect was resume re-waiting the whole step, a 1.43 s dead wait, which is now fixed.
- **C3:** I-09 also needed S5 `react/scene/Emphasis.tsx`. Murphy approved it at G1.
- **C4:** the I-09 viewer test lives under `apps/web` jsdom, unsealed, because xploder has no DOM test environment.
- **I-10 root cause:** a partial-parse first paint while the mobile hero is content-bound on CI's Linux fonts. It was not the loop controls. It was reproduced locally with a stalled HTML stream, and that check is now permanent in `site-probe`.

### Process change (please record)

- **Seal bases are now kept by pushed tags, not kept branches (E7):** `seal/s2-s4-3aee8fc`, `seal/s5-s8-edde9d0`, `seal/s6-b5a4713`, `seal/s7-5b22987`. Proof: `evidence/T014-log-seal-tags.txt`.
- Rule: every future re-seal tags its base as `seal/<surfaces>-<sha>` and pushes the tag.
- Slice branches may then be deleted after merge.

## Part 2 — next engine work (from `engine-improvements.md`, E1–E9)

Murphy agreed to **two slices** rather than one: smaller risk per slice, a clear cause if something breaks, and smaller validation rounds.

### Proposed S15 — Engine timing & events (E1, E2, E4, E5, E8)

**Mission (draft):** the engine owns time. Every animation reads one engine clock, Pause freezes the scene immediately and resumes from the same frame, "settled" comes from the animation's own state, and the engine announces its phases as public events.

| Item | Change | Surfaces it would touch (re-seal) |
|---|---|---|
| E1 | One engine clock, injectable and pausable, used by the explode timeline, the camera tweens, emphasis, the tour clock and the overlay | S2 `engine/explode.ts`, `engine/camera.ts`, `react/scene/CameraRig.tsx`; S5 `useTeardownViewer.ts`, `useTourClock.ts`; S6 `react/scene/Scene.tsx`, `Slabs.tsx` |
| E2 | `viewer.actions.pause()/resume()` freeze and resume the whole scene (explode, zoom, emphasis, tour); the hero uses it | as E1 + `apps/web/components/hero/hero-loop.ts` |
| E4 | `OverlayProjector` settles from the tween state, not frame-signature equality | S6 `react/scene/OverlayProjector.tsx` |
| E5 | Public events: `onReady`, `onSettled(phase)`, `onTourEnded`. The `data-xploder-*` attributes stay; probes move to the events where simpler | S8 `TeardownViewer.tsx`, S5 `useTeardownViewer.ts` (additive API) |
| E8 | Measure label placement and settle cost on a mid-range Android profile (CPU ×4/×6). Cache only if the measurement shows a cost | S6 `overlay/place.ts` (only if needed) |

**Draft acceptance criteria (for Merlin to edit and freeze):**

- **AC1 (E1):** one clock source. A scan finds no `performance.now()` / `Date.now()` timing reads in `packages/xploder/src` outside the clock module. Tests drive every animation with a fake clock, with no real timers.
- **AC2 (E2):** pressing Pause at any point (implode, explode, zoom, tour) freezes the hero within one frame. Frames 0.5 s and 3 s after Pause are pixel-identical, there are **zero** settle transitions while paused, and Play continues from the same frame (no jump, no restart). This intentionally **replaces S14 AC3's "exactly one settle transition"**. Reduced motion is unchanged.
- **AC3 (E4):** with forced duplicate frames mid-tween (test) and at CPU ×4/×6 (browser), labels appear exactly once per settle, with no mid-animation flicker (event log + frame captures).
- **AC4 (E5):** the documented events fire once per transition in the documented order. `site-probe` / `eager-probe` use them for "hero settled", and the S14 checks stay green.
- **AC5 (E8):** a placement/settle timing table at CPU ×1/×4/×6 for both projects. A cache lands only if the median settle delay is above a stated threshold, and then with output-identical placement.
- **AC6 (gates):** the usual gates (Lighthouse ≥ 95/95 on three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero intact). S2/S5/S6/S8 re-sealed with reasons and tags; **S3/S4/S7 empty**.

**Risks:**
- E1 touches S2 for the first time since S11.9.
- The S13 tour-clock fix and the S14 I-03 resume logic must be re-proven on the new clock.
- The hero's own timers (storyboard waits) must move onto the engine clock, or Pause semantics split again.

### Proposed S16 — Label system (E3, E6)

**Mission (draft):** one layout pass places every label (overlay tags, dimension notes, title block, plate layer names, face names), so overlaps are impossible by construction and multi-target emphasis is native.

| Item | Change | Surfaces |
|---|---|---|
| E3 | Merge the S6 overlay placement and the S7 lettering placement into one model and one placement pass | **S6 + S7** (S7 has been frozen since S08), S8 `PartLettering.tsx`, `BlueprintOverlay.tsx` |
| E6 | Two-slot name emphasis (hover + selected) on top of the unified model | same |

**Draft acceptance criteria:**

- **AC1:** a geometric sweep (the S14 `overlay-note-clear` approach, extended) across every label pair finds 0 intersections over all zoom steps, rotations, widths and scroll positions, for fixtures and both projects.
- **AC2:** a pixel-parity baseline against S14 is shown for every state where no overlap existed. Every changed pixel is listed with its reason.
- **AC3:** with A's panel open and B hovered, both names are emphasised, extending S14 AC1.
- **AC4:** the usual gates, and S2/S3/S4/S5 empty.

**Risk:** the largest engine refactor so far. It should run only after S15 is merged, and it should have a validation stop after the model merge before any visual change.

### Not a slice

- **E9:** drop `patches/@react-three__fiber@9.8.2.patch` once react-three-fiber ships `Timer`. pnpm fails loudly on the unused patch at the next R3F bump, so it can't be forgotten. It is a small chore task, not a slice.

## Suggested vault entries

1. S14 closed with revision 1 of 2 (R1, storyboard holds); C1–C4 as above.
2. Process: seal bases are protected by `seal/*` tags; the kept-branch rule is retired.
3. Backlog: S15 (E1, E2, E4, E5, E8) and S16 (E3, E6), in that order; E9 waits on R3F.
4. S15's brief must replace S14 AC3's pause wording (see the S15 draft AC2).
