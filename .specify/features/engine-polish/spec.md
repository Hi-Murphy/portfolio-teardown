# Feature Specification: S14 Engine & Hero Polish (six parked defects)

**Feature dir:** `.specify/features/engine-polish/` · **Slice:** S14-engine-polish · **Created:** 2026-11-14 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-14-engine-polish.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-14: all §13 defaults, refinements R1–R5 in §14)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. The six items appear as supporting requirements (SR) under the FR they serve and get task-level checks, not criteria of their own. Values such as file names, selectors, viewports and tolerances come from the RFC and are referenced, not promoted to criteria.
>
> **Evidence doctrine (kickoff Hard Rule 8):** every claim attaches machine-made evidence per `.specify/EVIDENCE.md`. That means failing-then-passing test output, screenshots (light/dark, desktop/phone), geometric rectangles for I-05, event counts for I-03, the five-run CLS table for I-10 and the coordinate table for the corner marks.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A visitor keeps their place while exploring (Priority: P1) — I-09

I click a part and its detail panel opens. While I read it, I move the mouse over other parts to compare them. The part whose panel is open stays highlighted the whole time, and the part under my mouse lights up too. When I close the panel, the part goes back to normal unless my mouse or keyboard focus is still on it.

**Why this priority:** Murphy found it on every project (S13 G2); the brief lists it first.

**Independent Test:** `packages/xploder/test/emphasis-selected.test.ts` + `apps/web/test/xploder-dom/viewer-selected.dom.test.tsx` (red → green; RFC C4), plus browser screenshots on `/projects/websocket-inspector` (RFC §3).

**Acceptance Scenarios:**

1. **Given** A's panel open, **When** B is hovered, **Then** both A and B are emphasised. _(AC1)_
2. **Given** A's panel open and B hovered, **When** the pointer leaves B, **Then** A is still emphasised. _(AC1)_
3. **Given** A's panel open, **When** the panel closes, **Then** A is no longer emphasised, unless A is hovered (or keyboard-focused). _(AC1)_
4. **Given** A's panel open, **When** keyboard focus is on A, **Then** A stays emphasised. _(AC1)_

---

### User Story 2 — The home hero never jumps, and CI never flakes on it (Priority: P1) — I-10

On a phone I open the home page. The blueprint frame's corner marks stay exactly where they are drawn, from the first paint to the live animation. The CI site probe gives the same verdict every run.

**Why this priority:** a flaky required check erodes trust in every gate.

**Independent Test:** the `site-probe` `cls` check `hero-marks-stable-*` (stalled HTML, red → green), the drill and CLS groups 5× locally and 5× on CI (RFC §4).

**Acceptance Scenarios:**

1. **Given** five consecutive probe runs, **Then** CLS is 0 in every cell and the reverse drill passes every time. _(AC2)_
2. **Given** a 390 px viewport, **Then** the hero corner-mark boxes are identical before and after reveal, with the coordinates listed. _(AC2)_
3. **Given** the probe diff, **Then** no timeout was merely increased; the probe waits on the hero's settled signal. _(AC2)_

---

### User Story 3 — Pause means pause (Priority: P2) — I-03

I press Pause while the hero is exploding. The model finishes the motion it was in, the labels settle once and the hero then stays still. When I press Play, the story carries on from where it was, with no jump and no long dead wait. With reduced motion I see the still poster as before.

**Why this priority:** WCAG 2.2.2 is already met; this is polish.

**Independent Test:** `apps/web/test/home-hero-loop.test.tsx` resume case (red → green), plus `pause-events.mjs` (event count per cell, frame equality) and the `reduced-motion` probe group (RFC §5, R5).

**Acceptance Scenarios:**

1. **Given** the hero exploding, **When** Pause is pressed, **Then** exactly one settle transition occurs (event count = 1). _(AC3)_
2. **Given** the paused hero, **When** Play is pressed, **Then** there is no position jump and the storyboard continues. _(AC3)_
3. **Given** reduced motion, **Then** the hero behaves exactly as before. _(AC3)_

---

### User Story 4 — Notes never cover names (Priority: P2) — I-05

I zoom into a teardown. The "5 layers" note never sits on top of a layer's name, in either palette, on a phone or a desktop.

**Why this priority:** a visible overlap at the zoom the hero uses.

**Independent Test:** `test/overlay-note-clear.test.ts` (red → green) + the equivalence test for every other label + the browser SAT matrix (RFC §6, R3).

**Acceptance Scenarios:**

1. **Given** zoom 1× / 2× / 3×, light and dark, 390 px and 1440 px, **Then** the layer-count note's box never intersects a layer-name box, and every rectangle is attached. _(AC4)_

---

### User Story 5 — A clean console (Priority: P3) — I-04

I open the browser console on any page with the 3D model. There is no `THREE.Clock` deprecation warning, and the animations run exactly as before.

**Independent Test:** `packages/xploder/test/no-clock-warning.test.tsx` (red → green), the console capture on 3 routes, tour step timing against the T001 baseline, `perf:parity --compare` (RFC §7).

**Acceptance Scenarios:**

1. **Given** `/`, `/projects/websocket-inspector` and `/projects/jev-toolkit`, **Then** zero `THREE.Clock` deprecation warnings appear. _(AC5)_
2. **Given** the tour, **Then** its duration and step boundaries are within ±1 frame of the pre-slice baseline. _(AC5)_
3. **Given** the parity screenshots, **Then** they differ by 0 px. _(AC5)_

---

### User Story 6 — CI shows only live checks (Priority: P3) — I-08

On a PR I see only the checks that matter: no stale measurement jobs, and every required check reports a real run.

**Independent Test:** the deletion commit, the PR's check list, `ls-tree origin/main` after the merge (RFC §8).

**Acceptance Scenarios:**

1. **Given** `main` after the merge, **Then** the three workflow files are gone. _(AC6)_
2. **Given** a PR, **Then** all seven required contexts report a run, and none is "expected" without one. _(AC6)_

---

### User Story 7 — Nothing else moves (Priority: P1)

The site is as fast and accessible as before, the hero still comes alive by itself, and the engine's sealed code changes only where an item needs it, each change with a written reason.

**Independent Test:** the RFC §10 gate matrix, `guards.sh`, frozen-surface tests, CI.

**Acceptance Scenarios:**

1. **Given** the PR head, **Then** full CI is green and the gates hold (2 draw calls, eager hero intact). Every touched S5/S6/S8 file is re-sealed with a written reason, and the S2/S3/S4/S7 diffs are empty. _(AC7)_

---

### Edge Cases

- **I-09:** a click on A while hovering A closes the panel and A stays lit (still hovered). Escape returns focus to A's proxy and A stays lit (focused). A touch tap on A while it is open closes the panel and clears A (S5's tap toggle, unchanged). A slug change resets everything (unchanged).
- **I-09:** a tour step lights its component through the separate `tour` channel. `selected` does not interact with it, and focus dim (`dim`) is unchanged.
- **I-10:** the gated build (`NEXT_PUBLIC_GATED_HERO=1`) is settled at `idle`; reduced motion, Save-Data and no-WebGL are settled at `skipped`. A slow Linux runner (content-bound hero) is reproduced locally by the stalled-HTML proxy at 740 px tall.
- **I-03:** Pause during a tour phase already freezes through the tour clock (unchanged). Pause and resume in implode, turn or zoom use the same remaining-time helper. Pause during the last 50 ms of a step resumes with ≥ 0 ms (clamped).
- **I-05:** no free spot for the note means the note is hidden (existing S6 rule). A hit in `columns` mode is a STOP (R3).
- **I-04:** an R3F version bump makes `pnpm install` fail on the unused patch (the patch is keyed to `9.8.2`), loudly.
- **I-08:** if the deletion push is rejected for scope, STOP and hand it to Murphy with the exact command.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** "**AC1 (I-09):** with A's panel open and B hovered, both A and B are emphasised; leaving B keeps A emphasised; closing the panel clears A unless hovered; keyboard focus on A keeps it emphasised. Evidence: emphasis-target assertions + screenshots (light/dark, desktop/phone)."
  - SR1.1: an optional `selected` emphasis input (S5 `emphasis.ts`), forwarded by S5 `Emphasis.tsx` and fed from the open detail panel by S8 `TeardownViewer.tsx` (RFC §3.1). `pointer.ts` is unchanged.
  - SR1.2: S5 and S8 are re-sealed with written reasons (RFC §9).
- **FR2 (= AC2):** "**AC2 (I-10):** five consecutive probe runs: **0 CLS in every cell**, reverse drill passes every time; hero corner-mark boxes are **identical** before and after reveal on a 390 px viewport (coordinates listed). No probe timeout was merely increased — the probe waits on a settled signal."
  - SR2.1: `waitForHeroSettled` in `site-probe.ts`, used by the drill and the `/` CLS cell (RFC §4.2).
  - SR2.2: `BlueprintSheet` comes after the hero content in `hero-section.tsx` (RFC §4.3, Q7).
  - SR2.3: the `hero-marks-stable-*` check in the `cls` group (stalled HTML; 390×844, 390×740, 360×740).
- **FR3 (= AC3):** "**AC3 (I-03):** pausing mid-explode yields **exactly one** settle transition (event count = 1); no position jump; resume continues; reduced motion unchanged. Evidence: event log + frame captures."
  - SR3.1: `hero-loop.ts` resumes a paused non-tour step with its remaining time (RFC §5, Q3).
  - SR3.2: if a second settle is ever observed, STOP and ask Murphy (S6 `OverlayProjector` is outside the re-seal list).
- **FR4 (= AC4):** "**AC4 (I-05):** at 1× / 2× / 3×, both palettes, 390 px and 1440 px, the layer-count note's box never intersects a layer-name box — geometric assertion with the measured rectangles attached."
  - SR4.1: the dimension notes in S6 `overlay/model.ts` `tagsModel` avoid the plate layer-name quads, and every other placement is output-identical (RFC §6).
  - SR4.2: S6 is re-sealed with a written reason.
- **FR5 (= AC5):** "**AC5 (I-04):** zero `THREE.Clock` deprecation warnings; tour duration and step boundaries within ±1 frame of the pre-slice baseline; parity screenshots 0 px difference."
  - SR5.1: a pnpm patch of `@react-three/fiber@9.8.2`: a `THREE.Timer`-backed store clock, no new dependency, no xploder change (RFC §7, Q4).
- **FR6 (= AC6):** "**AC6 (I-08):** the three workflow files are gone from `main`; a PR still reports all **seven** required contexts; no required check becomes "expected" without a run."
- **FR7 (= AC7):** "**AC7 (gates):** full CI green (build, gitleaks, `seo: meta + og`, Lighthouse, weight, axe production routes, fixture exclusion); 2 draw calls; eager hero intact; every touched S5/S6/S8 file re-sealed with a written reason; S2/S3/S4/S7 diffs empty."

### Key Entities

- **`EmphasisInput.selected`:** the component whose detail panel is open (optional; `null`/absent = none).
- **Hero settled state:** a derived reading of `[data-site-live]` mode/state, `[data-hero-loop-slot] button` and `[data-hero-loop]` (RFC §4.2 table).
- **Plate layer-name quad:** `layerLetteringModel(...)[i].screen` (S7, read-only), used by S6 as an obstacle for dimension notes only.
- **Store clock adapter:** a `THREE.Timer`-backed object with the `Clock` surface R3F uses (RFC §7).
- **Seal bases:** the S5, S6 and S8 manifests move to S14 fix commits. They stay reachable on the kept `task/s14-engine-polish` branch.

## Success Criteria _(mandatory)_

AC1–AC7 above are the success criteria. Verdicts are recorded in `evidence/AC-selfcheck.md`, with links to each gate's evidence (RFC §10). No additional criteria exist.

## Assumptions

- **Base** for every before/after comparison: `a9edbfc` (S14 freeze; product code = S13 merge `34bf654`). Frozen-surface bases at the start: S2/S4 `3aee8fc`, S5 `51d3fa7`, S6 `057d89a`, S7 `5b22987`, S8 `470acd8`.
- **Executor:** DeepSeek Flash 4.1 runs with the sandbox off for every task that builds or launches Chromium, with writes limited to its task worktree and `/tmp/s14-checks`.
- **Binding numbers:** Lighthouse and weight come from CI on the Vercel preview of the slice PR. The five CI probe attempts are an AC2 measurement and are all reported (RFC Q8).
- **Murphy's role:** Murphy validates hands-on later ("i will give feedback when i can test it later"). No step blocks on a human test.
