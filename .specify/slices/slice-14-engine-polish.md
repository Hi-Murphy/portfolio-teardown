# Slice 14 — Engine & Hero Polish (parked defects) — FROZEN BRIEF v1

**slice:** S14-engine-polish · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M2 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S7 ✅ S8 ✅ S11.9 ✅ S13 ✅ (`34bf654`) · **branch:** `task/s14-engine-polish` · **frozen:** 2026-11-14 · **revision counter:** 0 of 2

## Mission
Close six parked defects — five in the engine/hero, one in CI — with test-first fixes, touching only the frozen surfaces each item requires, and re-sealing every one with a written reason. **No content changes, no UI redesign, no new features.**

## Items (each is a named defect, not an invitation to refactor)

### I-09 — an open panel's tile loses its highlight on hover (Sev-3, S5+S8)
Clicking tile A opens its panel and emphasises A. Hovering B moves the single highlight slot to B; leaving B clears it, so **A is unhighlighted while its panel is open** (`src/interaction/pointer.ts`, `PointerState.highlight`; `src/react/TeardownViewer.tsx` panel `useLayoutEffect`; `src/interaction/emphasis.ts` `emphasisTargets`).
**Wanted:** A stays emphasised for as long as its panel is open; hover may light B **at the same time**. Suggested shape: a separate `selected` input in `EmphasisInput`, lit alongside `highlight`.

### I-10 — home-hero CI probe flake + unstable corner marks (Sev-3, S11.9 ↔ tools/perf)
One cell showed a tiny CLS and the drill's reverse walk failed intermittently (green on re-run).
**Wanted:** probes wait for the hero's **settled state** instead of sleeping; the hero's **reserved height** on mobile is stable so its corner marks never move between poster and live.

### I-03 — pausing mid-explode settles labels more than once (Sev-3, S5/S6 motion)
**Wanted:** pausing mid-explode produces **exactly one** label-settle transition, no jitter; resuming continues from the same position; reduced motion unaffected.

### I-05 — the "N layers" note can overlap a layer name while zoomed (Sev-3, S6 overlay placement)
**Wanted:** at every zoom band (1× / 2× / 3×), both palettes, desktop and mobile, the layer-count note's box **never intersects** any layer-name box. Geometric assertion, not eyeballing.

### I-04 — `THREE.Clock` deprecation (Sev-3, S5)
Migrate to `THREE.Timer`. Behaviour identical: tour/animation timing within one frame of baseline, parity screenshots unchanged, no deprecation warnings in the console.

### I-08 — stale measurement workflows (Sev-3, CI housekeeping)
Remove `eager-3d.yml`, `eager-load.yml`, `hero-eager.yml`. None is a required check; verify the **seven** required contexts still report on a PR afterwards.

## Constraints (binding)
- **Allowed to touch and re-seal S5, S6 and S8** — only the files each item names, each with a written reason note in the manifest, in the S11.9 manner (`3aee8fc`). S2/S3/S4/S7 stay empty.
- **Test-first:** every fix lands with a red test first, then green. No fix without a failing test that reproduces the defect.
- No content changes (`site.json`, project JSON), no UI redesign, no new features, no new dependencies beyond `three`'s own `Timer` (already in the package).
- I-06 and I-07 (S12's unrun phone checks and human test) are **out of scope** — Murphy's call, still open.
- Same gates: mobile Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; **2 draw calls**; eager hero reveal with zero interaction intact.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 (I-09):** with A's panel open and B hovered, both A and B are emphasised; leaving B keeps A emphasised; closing the panel clears A unless hovered; keyboard focus on A keeps it emphasised. Evidence: emphasis-target assertions + screenshots (light/dark, desktop/phone).
- **AC2 (I-10):** five consecutive probe runs: **0 CLS in every cell**, reverse drill passes every time; hero corner-mark boxes are **identical** before and after reveal on a 390 px viewport (coordinates listed). No probe timeout was merely increased — the probe waits on a settled signal.
- **AC3 (I-03):** pausing mid-explode yields **exactly one** settle transition (event count = 1); no position jump; resume continues; reduced motion unchanged. Evidence: event log + frame captures.
- **AC4 (I-05):** at 1× / 2× / 3×, both palettes, 390 px and 1440 px, the layer-count note's box never intersects a layer-name box — geometric assertion with the measured rectangles attached.
- **AC5 (I-04):** zero `THREE.Clock` deprecation warnings; tour duration and step boundaries within ±1 frame of the pre-slice baseline; parity screenshots 0 px difference.
- **AC6 (I-08):** the three workflow files are gone from `main`; a PR still reports all **seven** required contexts; no required check becomes "expected" without a run.
- **AC7 (gates):** full CI green (build, gitleaks, `seo: meta + og`, Lighthouse, weight, axe production routes, fixture exclusion); 2 draw calls; eager hero intact; every touched S5/S6/S8 file re-sealed with a written reason; S2/S3/S4/S7 diffs empty.

## Executor rules (binding)
- One defect per task, each with: failing test → fix → green test → re-seal (if a frozen file) → evidence.
- No drive-by refactors. A fix that changes behaviour outside its item is a protocol violation.
- Evidence per `.specify/EVIDENCE.md`; every number attached; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Murphy dependencies
- Approve the re-seal list at G1 (files per item, with reasons). Nothing else blocking.

## Freeze protocol
Frozen at commit; work only on `task/s14-engine-polish`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/engine-polish/rfc.md`.
