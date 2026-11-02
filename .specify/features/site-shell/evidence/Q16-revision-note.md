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

## Re-seal plan

The orchestrator will commit this source change, use that commit as the new S6 manifest base, and
regenerate `frozen-surface.s6.manifest.json`. The S6 block in `frozen-surface.test.ts` and the
`SURFACE-S6-OK` guard will then use the new base, with its note recording this Q16 revision.
`XPLODER-SRC-OK` will allow only this `src/overlay/model.ts` change relative to `99a94f2`.

## AC7 interpretation

AC7's requirement that the frozen-surface checks remain empty is read as empty **except for this
single Murphy-authorised, re-sealed S6 change**. The acceptance criterion is not reworded or
relaxed; the exception and its reason are recorded here and in the S6 manifest note.

## Evidence

- Unit behaviour: `packages/xploder/test/overlay-tour-trail.test.ts`.
- Browser trail, light: `evidence/T012e-screenshot-tour-trail-desktop-light.png`.
- Browser trail, dark: `evidence/T012e-screenshot-tour-trail-desktop-dark.png`.
- Browser/check log and metadata: `evidence/T012e-log-tour-trail.txt`, `evidence/T012e-meta.json`.
