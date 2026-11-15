# Engine improvement backlog from S14 (for Merlin's vault)

**Source:** Murphy asked at the end of S14 (2026-11-15, before the merge) for engine improvements with their effect, and asked to do the top 3 inside S14 if possible. The status column records what was done here and why the rest was not. Ids continue the I-numbering style as E-items.

| # | Improvement | Why (seen in S14) | Effect | Cost / surfaces | Status |
|---|---|---|---|---|---|
| E1 | One engine clock (engine-owned, injectable) for every animation | Time is read in `Scene`, `useTeardownViewer`, `CameraRig` and the hero, each separately; R3F had its own `Clock` (I-04 patch) | Deterministic tests; prerequisite for E2; less dependence on R3F's clock | Medium · S2 (`engine/explode.ts`, `scene/CameraRig.tsx`), S5, S6 | **Not done in S14.** Needs S2 changes, and AC7 requires the S2 diff to be empty |
| E2 | True pause for the explode and zoom tweens | I-03: Pause lets an in-flight explode finish, then the labels fade in once | Pause freezes the model instantly; Play continues from the exact frame | Medium · needs E1; S2 + S6 | **Not done in S14.** It conflicts with AC3 as written ("exactly one settle transition" while paused; a true freeze gives 0) and needs S2 (AC7). A new slice needs a new AC |
| E3 | One label-layout pass for overlay notes and plate lettering | I-05: two placement systems (S6 overlay, S7 lettering) did not see each other | Overlaps impossible by construction; one place to change | High · S6 + S7 merged | Not started. Biggest refactor; its own slice (S7 must stay empty in S14) |
| E4 | Settle detection from tween state, not frame-signature equality | `OverlayProjector` calls a frame "settled" when its signature repeats, which could misfire mid-tween on slow phones | No mid-animation label flicker on mid-range Android | Low–medium · S6 `react/scene/OverlayProjector.tsx` | **Not done in S14.** The defect has never been observed (settle count was 1 in every measured cell), so there is no honest red test (kickoff Hard Rule 3), and the file is outside the approved re-seal list. Next engine slice, starting with a phone-class repro |
| E5 | Public readiness events (ready / settled / tour-ended) | Probes compose several data attributes to infer "hero settled" (I-10) | Simpler, less flaky probes; no DOM scraping in app code | Low · additive API, S8/S5 | Not started |
| E6 | Two-slot name emphasis in lettering and overlay | I-09 lights both tiles, but only one name is emphasised at a time | Both names emphasised while B is hovered with A's panel open | Low–medium · S6 overlay model + S8 `PartLettering` | Not started |
| E7 | Seal bases that survive squash merges without kept branches | Seal bases lived only on slice branches; deleting a branch would break the next re-seal | No "never delete this branch" rule; safe re-seals | Low · repo metadata only | **DONE in S14 (T014).** Annotated tags for every active base, pushed to origin: `seal/s2-s4-3aee8fc`, `seal/s5-s8-edde9d0`, `seal/s6-b5a4713`, `seal/s7-5b22987`. Proof: `evidence/T014-log-seal-tags.txt` (a main-only clone can read all bases through the tags; hashes equal the manifests). No sealed file changed |
| E8 | Measure label-placement cost on a phone, then cache it | Not measured in S14 | Shorter label delay after each zoom or turn on mid-range Android (if the measurement shows a cost) | Unknown · S6 | Not started (measure first) |
| E9 | Drop the R3F patch when react-three-fiber ships `Timer` | We carry `patches/@react-three__fiber@9.8.2.patch` | Less maintenance; xploder consumers stop seeing the warning | Tiny · dependency bump | Waiting on an R3F release (pnpm fails loudly on the unused patch at the next bump) |

## Rule change from E7 (for future slices)

- A re-seal tags its new base as `seal/<surfaces>-<sha>` and pushes the tag in the same session.
- Slice branches may then be deleted after merge.
- A fresh clone must run `git fetch origin 'refs/tags/seal/*:refs/tags/seal/*'` (a normal full clone already includes the tags) before running `frozen-surface.generate*.sh`.

## Recommended next engine slice

- E1 + E2 with a new AC that defines Pause as an immediate freeze, replacing the S14 AC3 wording.
- E4, with a slow-phone repro as its red test.
- E3 as its own slice later.
