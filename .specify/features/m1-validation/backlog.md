# S12 → vault backlog (import into the vault; RFC Q13)

Items found during M1 validation that ship open. The format is one block per item, for the vault's backlog. Source: `triage-log.md`.

---

### I-03 — Pause mid-explode lets the step settle once
- **Severity:** Sev-3 · **Owner:** orchestrator · **Area:** home hero (storyboard loop)
- **What:** pressing Pause during the explode step lets the in-flight step finish; the engine's labels fade in within ~1.5 s, then the hero is still. Other phases freeze at once.
- **Why it ships:** Murphy accepted it as designed (S12 R6); WCAG 2.2.2 is met (motion stops).
- **Next step (optional):** keep the overlay labels hidden while paused, or stop the in-flight tween on pause.
- **Evidence:** `.specify/features/m1-validation/evidence/T004-log-pause.md`

### I-05 — "5 layers" note overlaps a layer name during zoom
- **Severity:** Sev-3 · **Owner:** orchestrator · **Area:** home hero / engine overlay placement
- **What:** at 1324 px (Safari 26, dark) the engine's "5 layers" note sits on top of the "CAPTURE" layer label for a moment while zoomed.
- **Next step:** check overlay placement under hero zoom; an engine change (S6 surface) needs its own slice.
- **Evidence:** `.specify/features/m1-validation/evidence/T005-screenshot-D4-i05-overlap.png`

### I-04 — `THREE.Clock` deprecation warning in the console
- **Severity:** Sev-4 · **Owner:** orchestrator · **Area:** `xploder` engine (frozen S5 surface)
- **What:** three.js warns that `THREE.Clock` is deprecated (use `THREE.Timer`). This is a warning, not an error.
- **Next step:** migrate to `THREE.Timer` in a slice that may re-seal the engine.
- **Evidence:** `.specify/features/m1-validation/evidence/T004-log-console-D3.txt`

### I-08 — Stale measurement workflows
- **Severity:** Sev-4 · **Owner:** orchestrator · **Area:** CI
- **What:** `eager-3d.yml` still runs a measurement job on every PR; `eager-load.yml` and `hero-eager.yml` are gated to finished branches (S11.8 RFC Q7 housekeeping).
- **Next step:** remove all three in one housekeeping commit.

### I-06 — Phone cells not tested (AC4 evidence gap)
- **Type:** evidence gap, not a product defect · **Owner:** Murphy · **Blocks:** AC4
- **What:** iOS Safari 17+ (D1) and Android Chrome mid-range (D2) were not run; there was no cable or adapter.
- **To close:** Android: `adb pair` over Wi-Fi (Developer options › Wireless debugging) or a cable, then `node .specify/features/m1-validation/site-checks.mjs --part devices --cell D2 --base-url <preview>` after `adb forward tcp:9222 localabstract:chrome_devtools_remote`. iPhone: a cable once, then the D4 procedure through the Mac's Safari Web Inspector.

### I-07 — 15-second human test not run (AC1 evidence gap)
- **Type:** evidence gap, not a product defect · **Owner:** Murphy · **Blocks:** AC1
- **What:** the five sessions were not run (S12 R8). Earlier informal viewings by friends are not AC1 evidence.
- **To close:** run P1–P5 exactly per `.specify/features/m1-validation/protocol.md` (frozen, unchanged).
