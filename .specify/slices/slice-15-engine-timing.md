# Slice 15 — Engine Timing & Events — FROZEN BRIEF v1

**slice:** S15-engine-timing · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M2 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S14 ✅ (`7865770`, re-seals S5+S8 `edde9d0`, S6 `b5a4713`) · **branch:** `task/s15-engine-timing` · **frozen:** 2026-11-15 · **revision counter:** 0 of 2

## Mission
**The engine owns time.** Every animation reads one injectable, pausable clock; Pause freezes the scene immediately and resumes from the same frame; "settled" comes from the animation's own state rather than frame-signature equality; and the engine announces its phases as public events so probes stop guessing from DOM attributes. Measured on a mid-range phone profile before any cache is added.

## Scope (E1, E2, E4, E5, E8 — nothing else)

### E1 — one engine clock
A single clock module, injectable and pausable, used by: the explode timeline, the camera tweens, emphasis, the tour clock, the overlay's settle detection. **Surfaces:** S2 `engine/explode.ts`, `engine/camera.ts`, `react/scene/CameraRig.tsx`; S5 `useTeardownViewer.ts`, `useTourClock.ts`; S6 `react/scene/Scene.tsx`, `Slabs.tsx`.

### E2 — true pause/resume
`viewer.actions.pause()` / `resume()` freeze and continue **the whole scene** — explode, zoom, emphasis, tour — not just the hero's loop. The hero uses it. **Surfaces:** as E1 plus `apps/web/components/hero/hero-loop.ts`.

**This supersedes S14 AC3's "exactly one settle transition on pause".** The new contract is: **Pause = immediate freeze, zero settles while paused.**

### E4 — settle from the tween state
`OverlayProjector` decides "settled" from the tween's own state, not from frame-signature equality. **Surface:** S6 `react/scene/OverlayProjector.tsx`.

### E5 — public events
`onReady`, `onSettled(phase)`, `onTourEnded` — documented, fired once per transition, in a documented order. The `data-xploder-*` attributes stay (existing a11y/probe contracts); probes may move to events where that is simpler. **Surfaces:** S8 `TeardownViewer.tsx`, S5 `useTeardownViewer.ts` (additive API only).

### E8 — phone-profile measurement
Measure label placement + settle cost at CPU ×1/×4/×6 on both projects. **A cache lands only if the measured median settle delay exceeds the threshold set at G1 (default 50 ms)**, and then with output-identical placement. **Surface:** S6 `overlay/place.ts` (only if the number justifies it).

## Constraints (binding)
- **S2, S5, S6, S8 may be touched and re-sealed; S3, S4, S7 must stay empty.** Every re-seal carries a written reason and its own pushed tag `seal/<surfaces>-<sha>`.
- **No content changes, no UI redesign, no new features beyond the listed API/events.** Hero storyboard timings from S14 R1 hold (labelled 0.19–3.40 s, zoomed 0.14–1.75 s, tour end 0–1.61 s); moving hero waits onto the engine clock may shift a boundary by at most one frame.
- The S13 tour-clock fix and the S14 I-03 resume logic must be re-proven on the new clock — they are the two behaviours most likely to regress.
- Gates unchanged: Lighthouse ≥ 95/95 on three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero reveal with zero interaction.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — one clock source.** A scan finds **no** `performance.now()` / `Date.now()` timing reads inside `packages/xploder/src` outside the clock module. Tests drive every animation with a fake clock and use **zero real timers**; the suite proves it (no `setTimeout`-driven waits in the animation tests).
- **AC2 — pause is a freeze.** Pressing Pause at any point (implode, explode, zoom, tour) freezes the hero **within one frame**. Frames captured 0.5 s and 3 s after Pause are **pixel-identical**, there are **zero** settle transitions while paused, and Play continues from the same frame — no jump, no restart. Reduced motion unchanged. *(Replaces S14 AC3.)*
- **AC3 — settle is state, not signatures.** With forced duplicate frames mid-tween (test) and at CPU ×4/×6 (browser), labels appear **exactly once per settle**, with no mid-animation flicker. Evidence: event log + frame captures.
- **AC4 — events.** `onReady`, `onSettled(phase)`, `onTourEnded` fire **once per transition, in the documented order**; `site-probe` / `eager-probe` use them for "hero settled"; all S14 checks stay green.
- **AC5 — phone measurement, cache only by number.** A placement/settle timing table at CPU ×1/×4/×6 for both projects. If the median settle delay is **≤ the G1 threshold (default 50 ms)**, **no cache is added** and the table is the deliverable. If it is above, the cache must be output-identical (placement compared, 0 differing coordinates).
- **AC6 — gates and seals.** Full CI green; Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; 2 draw calls; eager hero intact; every touched S2/S5/S6/S8 file re-sealed with a written reason and a pushed `seal/*` tag; **S3/S4/S7 diffs empty**.

## Executor rules (binding)
- Test-first where a behaviour changes; the clock module lands **before** any consumer is rewired.
- One surface family per task; a re-seal commit pairs with the change that needed it (no batched re-seals at the end).
- No drive-by refactors; a behaviour change outside E1–E5/E8 is a protocol violation.
- Evidence per `.specify/EVIDENCE.md`; every number attached; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Decisions set at freeze (defaults — Murphy may override at G1)
1. **Cache threshold:** median settle delay **> 50 ms** at CPU ×4 triggers the cache; at or below, no cache. *(Recommendation: 50 ms — below that, a cache is complexity without a user-visible win.)*
2. **Hero hold tolerance:** moving hero waits onto the engine clock may shift a boundary by **≤ 1 frame (16.7 ms)**; anything larger is a revision, not a refinement.
3. **Event naming/order:** `onReady` → `onSettled(phase)` → `onTourEnded`; phases named for the actual motion (`imploded`, `exploded`, `zoomed`, `turned`). *(Recommendation: keep the phase vocabulary already used by the probe.)*

## Murphy dependencies
- Approve the re-seal file list at G1 (S2/S5/S6/S8, per file, with reasons).
- Confirm or override the three defaults above.

## Freeze protocol
Frozen at commit; work only on `task/s15-engine-timing`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/engine-timing/rfc.md`.
