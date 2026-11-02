# Q16 revision note — S6 tour trail

## Context

Murphy's G2 feedback asked the guided tour to keep the part name for every visited step on the
right, joined by its leader line, with no tile lettering. The S6 sealed overlay model deliberately
returned an empty overlay whenever the tour was not idle, so this could not be delivered without an
authorised revision of a frozen surface.

## Decision

Murphy chose **option A** on 2026-11-02: change the S6 model now and re-seal it, with this note for
Merlin. This is **S10 revision 1 of 2**, pending Merlin's vault log.

## Exact behaviour change

`OverlayProject` now accepts optional flow routes (`{ id, path }`). `overlayStateModel` and the
`overlayModel` input accept an optional `flowId` and `step` alongside the existing tour status.

When the tour is not idle, the model now enters a tour-trail mode only if all of these are true:

- the base model is in `columns` callout mode;
- `project.flows` contains the active `flowId`;
- `step` is a finite integer greater than or equal to zero.

In that case the model keeps the positioned part labels for `flow.path.slice(0, step + 1)` in path
order, marks only the label at `flow.path[step]` as emphasised, and draws one three-point leader for
each kept label that has an anchor. The current leader uses the callout emphasis role; earlier leaders
use the existing annotation leader role. Layer labels, dimensions, other part callouts, the trace,
lettering and the title block are absent. Every other tour state keeps the previous empty-overlay
behaviour.

`BlueprintOverlay.tsx` did not need a change: it already passes the project flow data and the
`{ flowId, status, step }` tour state to the model and renders labels and leader strokes from the
returned model.

## Files touched

- `packages/xploder/src/overlay/model.ts` — the additive trail implementation.
- `packages/xploder/test/overlay-tour-trail.test.ts` — new focused regression coverage.

No production app component, tour reducer, trace/dot, lettering component or other xploder source
file was edited. `packages/xploder/test/overlay-model.test.ts` remains byte-identical.

## Re-seal (done)

The source change was committed as `f65b13c` and used as the new S6 manifest base. `frozen-surface.s6.manifest.json` was regenerated; its diff covers only the base, the note and the `src/overlay/model.ts` hash. The S6 block in `frozen-surface.test.ts` and the `SURFACE-S6-OK` guard use `f65b13c`, and the manifest note records this Q16 revision. `XPLODER-SRC-OK` allows only `src/overlay/model.ts` relative to `99a94f2`. The S6 negative control is red, and the guard script exits 1 on any failed guard (commit `cfef420`).

## AC7 interpretation

AC7's requirement that the frozen-surface checks remain empty is read as empty **except for this
single Murphy-authorised, re-sealed S6 change**. The acceptance criterion is not reworded or
relaxed; the exception and its reason are recorded here and in the S6 manifest note.

## Evidence

- Unit behaviour: `packages/xploder/test/overlay-tour-trail.test.ts`.
- Browser trail, light: `evidence/T012e-screenshot-tour-trail-desktop-light.png`.
- Browser trail, dark: `evidence/T012e-screenshot-tour-trail-desktop-dark.png`.
- Browser/check log and metadata: `evidence/T012e-log-tour-trail.txt`, `evidence/T012e-meta.json`.

## Other Murphy-directed changes in S10 (for the vault)

1. **Résumé removed (brief Deliverable 2 + the erratum's résumé line; not an AC).** At G2, Murphy said "no need to add my CV". The nav and footer Résumé links were removed, and `apps/web/public/resume.pdf` was deleted on the slice branch, so the export no longer serves `/resume.pdf` (404, asserted by the site probe and the T018 route checks). The file remains in git history. `site.json` `identity.resume` is canonical and stays unused. RFC §9.7.5.
2. **3D hydration on first interaction (AC2/AC5 path; no AC reworded).** CI Lighthouse on the PR preview failed the perf budget twice: home 0.89, then the project route 0.87. Both times the cause was 3D initialisation landing in the Total Blocking Time window on the slower CI CPU. Murphy chose:
   - **(A)** the home hero hydrates on the visitor's first interaction (pointer/touch/scroll/key/focus);
   - **(P1)** the project route's workbench mounts on first interaction or an explicit centred "Explore in 3D" button.
   The poster is still the first paint, CLS stays 0, and reduced motion never mounts the hero 3D. Final CI: home 0.99–1.0 and project 1.0 performance, a11y 1.0, LCP ~0.9 s. RFC §9.15–9.18.
3. **UI refinements from G2 feedback rounds 1–5 (no AC impact).** These are recorded in RFC §9.7–9.12:
   - a control dock;
   - an Explore card with a **Layers | Flows** switch;
   - a guided-tour panel: routes labelled "first → last component · N steps", a centred transport, a clickable step rail, a "Now" line;
   - pause-on-implode, explode-before-step, Flows locks Implode;
   - a header/footer redesign.
4. **New required CI check.** `a11y: axe (production routes)` was added to the `main` ruleset "main: required checks" (RFC §9.19). The deliberate-break proof is in `evidence/T017-ci-regression-proof.txt`.

## Suggested follow-up slice (not implemented in S10)

**Engine startup performance.** Today the 3D passes Lighthouse because it waits for the first interaction, but visitors still pay its initialisation cost (chunk parse + scene/shader setup, about 0.4–0.6 s of main-thread time on a mid-range Android CPU) at the moment they engage. Making it cheaper would help real users and every future teardown page (S13/S15). Candidate scope (engine surfaces S4/S6, so a brief of its own):
- split scene/material/shader initialisation across frames, or warm it in idle slices;
- precompile or cache the blueprint material variants;
- audit the three.js import surface (tree-shaking / a smaller build);
- measure with the dropped-frames style on a throttled mobile profile, plus TBT on the project route with eager hydration as the stretch goal.
Origin: RFC §9.15 (option B) and §9.17 (P2).
