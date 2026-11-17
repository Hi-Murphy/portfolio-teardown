# Feature Specification: S16 Label System (E3, E6)

**Feature dir:** `.specify/features/label-system/` · **Slice:** S16-label-system · **Created:** 2026-11-16 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-16-label-system.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-16: all §12 defaults; refinements R1–R8 in §13)

> **Rule:** the functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** acceptance criteria. The two brief items (E3, E6) appear as supporting requirements (SR) under the FR they serve. They get task-level checks, not criteria of their own. File names, selectors, matrices and predicates come from the RFC and are referenced, not promoted to criteria.
>
> **Evidence doctrine (kickoff Hard Rule 9):** every claim attaches machine-made evidence per `.specify/EVIDENCE.md`:
> - rectangles for the sweep;
> - the pixel-diff matrix, with every changed cluster explained;
> - emphasis assertions;
> - placement-pass counts;
> - the timing table;
> - the re-seal tags.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Labels never sit on top of each other (Priority: P1) — E3

I open a teardown on my phone or my laptop, zoom in, turn it and scroll it. Whatever I do, no name, number or note is ever printed over another one.

**Why this priority:** it is the slice's mission. Today overlaps are avoided by luck and per-feature rules (RFC C2).

**Independent Test:** `label-matrix.mjs` + `label-sweep.mjs` over the RFC §5.2 matrix, the seeded control (§5.4) and `test/label-sweep.test.ts` (model sweep).

**Acceptance Scenarios:**

1. **Given** the RFC §5.2 matrix (both projects, the fixtures, 390/768/1440, both palettes, zoom 1×/2×/3×, four snaps, scroll top/middle/bottom), **When** every pair of painted labels is tested, **Then** there are 0 intersections and every rectangle is attached. _(AC1)_
2. **Given** a seeded copy of a label offset by 1 px, **When** the sweep runs, **Then** it reports the seeded pair. This is the negative control that shows the sweep can fail. _(AC1)_

---

### User Story 2 — Nothing else changes (Priority: P1) — E3, Stage A gate

A returning visitor sees exactly the same picture as before wherever nothing overlapped. Only labels that used to collide have moved, and each move is accounted for.

**Why this priority:** it is the brief's hard stop. The model merge must land at 0 px before any behaviour change.

**Independent Test:** `test/label-pass-parity.test.ts` (oracle, exact equality); the Stage A pixel and DOM matrix; the Stage B cluster report (RFC §6).

**Acceptance Scenarios:**

1. **Given** the unified model with today's decisions (Stage A), **When** the full matrix is compared with the S15 baseline, **Then** every cell is 0 px and the label DOM is identical. Then STOP for Murphy's word. _(AC2, STOP 1)_
2. **Given** the Stage B placement, **When** a cell had no overlap in the baseline, **Then** it differs by 0 px. _(AC2)_
3. **Given** a cell that had an overlap, **When** its pixels change, **Then** each changed cluster is listed with the old overlap and the label's new position. _(AC2)_

---

### User Story 3 — Two parts emphasised at once (Priority: P1) — E6

I click a part and its panel opens. While I read, I hover another part to compare. Both parts' names stay emphasised, not just the one under my mouse. When I move away, the open one stays emphasised. When I close the panel, it clears. With the keyboard, the part I have focused counts as selected.

**Why this priority:** it extends S14 AC1 from the tiles to the labels (RFC C6).

**Independent Test:** `apps/web/test/xploder-dom/label-emphasis.dom.test.tsx` (the six rows of RFC §7.1) and the browser emphasis assertions with screenshots.

**Acceptance Scenarios:**

1. **Given** A's panel open, **When** B is hovered, **Then** both A's and B's names are emphasised. _(AC3)_
2. **Given** that state, **When** the pointer leaves B, **Then** A stays emphasised. _(AC3)_
3. **Given** A's panel open, **When** the panel closes (pointer elsewhere), **Then** A's emphasis clears. _(AC3)_
4. **Given** keyboard focus on A, **Then** A is emphasised as selected, including while B is hovered. _(AC3)_

---

### User Story 4 — Labels are placed once and then hold still (Priority: P1) — E3

After a motion ends, the labels appear once and do not shift, jitter or re-arrange while I look at them, hover, scroll or open a panel.

**Independent Test:** `label-passes.mjs` (counter vs `xploder:settled`, 60-frame quad samples) and `apps/web/test/xploder-dom/label-pass.dom.test.tsx`.

**Acceptance Scenarios:**

1. **Given** any motion (explode, zoom, turn, resize, implode, project switch), **When** it settles, **Then** the pass counter rises by exactly one. _(AC4)_
2. **Given** an unchanged scene (hover, panel, scroll, palette, focus, idle), **When** frames pass, **Then** label positions are identical on every frame and the counter does not move. _(AC4)_

---

### User Story 5 — It costs nothing noticeable (Priority: P2)

On a mid-range phone, labels appear as fast as before, the page downloads about the same amount of code, and the 3D scene draws as before.

**Independent Test:** the S15 `settle-timing.mjs` method at CPU ×1/×4, the Node pass benchmark, `bundle-gzip.mjs` (R5), and the draw-call probe.

**Acceptance Scenarios:**

1. **Given** both projects at CPU ×1/×4, **Then** placement time is within +10 % of the S15 baseline or inside the measured run spread. _(AC5)_
2. **Given** the final export, **Then** there are 2 draw calls and the client JS grows by at most 2 KB gzip. _(AC5)_

---

### User Story 6 — The site stays fast, accessible and sealed (Priority: P1)

The site is as fast and accessible as before, and the hero still comes alive by itself. Sealed engine code changes only where E3/E6 need it, each with a written reason and a pushed tag.

**Independent Test:** the RFC §10 gate matrix, `guards.sh`, the frozen-surface tests, and CI.

**Acceptance Scenarios:**

1. **Given** the PR head, **Then** full CI is green with the 7 required contexts, and the gates hold (Lighthouse ≥ 95/95 on the three routes, CLS 0, axe 0/0, weight < 3 MB, eager hero reveal with zero interaction). Every touched S6/S7/S8 file is re-sealed with a reason and a pushed tag, and the S2/S3/S4/S5 diffs are empty. _(AC6)_

---

### Edge Cases

- **Settled while scrolled** (RFC C4, Q4): the overlay places in viewport space and the lettering in content space. Stage A reuses work only at `offsetY === 0`; Stage B keeps both evaluations. A scroll after a settle only translates labels: no new pass.
- **No camera at event time** (R2): no lettering update, exactly as today; the overlay still updates.
- **Imploded** (R4): only the title block is painted. The lettering is still computed for its data attributes.
- **Tour playing:** the lettering is hidden and the overlay shows the tour trail (columns mode) or nothing. The tour trail ignores both emphasis slots, as today.
- **A label with no free spot on conflict** (§3.3): it falls back in this order: plate name → S6 callout; face → mark; mark → hidden; S6 label → hidden, counted in `data-xploder-overlay-hidden`. The guarantee step's count must be 0.
- **Ghost S6 part tags** (C5): they stay reservations, are never painted and are not in the sweep.
- **Both slots on the same part:** one emphasis, identical to today's.
- **Touch:** there is no hover, so the selected slot alone applies. A tap opens the panel as before.
- **Reduced motion:** the poster hero has no viewer and no labels. On project pages the fades are 0 ms and the placement is unchanged.
- **No WebGL:** the fallback has no labels, and its sweep rows are recorded as `n/a`.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR1 (= AC1):** "**AC1 — no overlaps, by sweep.** A geometric sweep over **every pair of labels** finds **0 intersections** across: zoom steps 1×/2×/3×, the four rotation snaps, widths 390/768/1440, and scroll positions top/middle/bottom, in both palettes, for both projects and for the fixtures. Rectangles attached."
  - SR1.1 (E3): the conflict-gated priority pass of RFC §3.3 (P0–P6, fallbacks, guarantee step), switched on only after SR1.2 lands.
  - SR1.2 (test-first, kickoff Hard Rule 4): the browser sweep (§5.1–§5.3), the model sweep and the seeded controls (§5.4). They are red on the seed and run on Stage A code before the switch.
  - SR1.3: S7 entry points that avoid obstacles (R6) and S6 `tagsModel` extra obstacles. Without them, the output is identical.
- **FR2 (= AC2):** "**AC2 — pixel parity where nothing overlapped.** Against the S15 baseline, every state that had no overlap must render **0 px difference**. Every changed pixel cluster in states that did overlap is listed with its reason (the old overlap, the new position). A blanket "looks better" is not evidence."
  - SR2.1 (E3, Stage A): one model and one pass, `labelPass` (§3.2), composing the unchanged placers. The parity argument (§4.2) is proved by the oracle, DOM identity and pixels. **[STOP 1]** follows.
  - SR2.2: the noise floor: two base runs at 0 px before any change.
  - SR2.3: the automatic cluster attribution of RFC §6.
- **FR3 (= AC3):** "**AC3 — two-slot emphasis.** With A's panel open and B hovered, **both** A's and B's names are emphasised simultaneously; leaving B keeps A; closing the panel clears A; keyboard focus on A behaves as selected. Extends S14 AC1 to the labels. Evidence: emphasis assertions + screenshots."
  - SR3.1 (E6): the hover and selected slots of RFC §7.1. Selected is the open panel, else the keyboard-focused proxy. The same slots feed the tile input (Q8).
  - SR3.2: the existing emphasis rendering only; `data-xploder-emphasis-slot` as the observable (Q10); no new announcement (Q9).
- **FR4 (= AC4):** "**AC4 — one pass, no churn.** Exactly **one** placement pass per settle (event/log count), and label positions are stable across frames where the scene state is unchanged (no jitter, no re-placement loop)."
  - SR4.1: the pass runs in `TeardownViewer.onOverlay`, memoised (§3.2). It exposes `data-xploder-label-passes` (Q12); the R3 re-runs are counted.
  - SR4.2: the RFC §8 probe and jsdom test.
- **FR5 (= AC5):** "**AC5 — cost.** Placement time at CPU ×1/×4 within **+10 %** of the S15 baseline (or inside the measured run spread), 2 draw calls, and **no more than +2 KB gzip** of client JS for the whole slice."
  - SR5.1: the Q11 metric: S15 settle task time and settle delay, base vs head on the same machine, plus the Node bench.
  - SR5.2: the R5 gzip measure at every task; going over +2 KB is a STOP.
- **FR6 (= AC6):** "**AC6 — gates and seals.** Full CI green (7 required contexts); Lighthouse ≥ 95/95 on `/`, `/projects`, `/projects/jev-toolkit`; CLS 0; axe 0/0; weight < 3 MB; eager hero reveal with zero interaction; every touched S6/S7/S8 file re-sealed with a reason and a pushed tag; **S2/S3/S4/S5 diffs empty**."
  - SR6.1: the re-seal list of RFC §9 (as refined by R1), one tag each, pushed in the same session.
  - SR6.2: `guards.sh` proves the frozen files, the S2/S3/S4/S5 empty diffs, the approved list and the tags.

### FR ↔ AC mapping

| FR | AC | Brief item | Verified by |
|---|---|---|---|
| FR1 | AC1 | E3 | `label-sweep.mjs` on the §5.2 matrix (0 hits) + seeded controls + `test/label-sweep.test.ts` |
| FR2 | AC2 | E3 | `test/label-pass-parity.test.ts`; Stage A matrix 0 px + DOM identical; Stage B cluster report |
| FR3 | AC3 | E6 | `label-emphasis.dom.test.tsx` + browser assertions + screenshots |
| FR4 | AC4 | E3 | `label-passes.mjs` + `label-pass.dom.test.tsx` |
| FR5 | AC5 | E3, E6 | `settle-timing.mjs` ×1/×4, the bench, `bundle-gzip.mjs`, the draw-call probe |
| FR6 | AC6 | — | CI, Lighthouse, weight, axe, eager probe, `guards.sh`, frozen-surface tests, seal tags |

### Key Entities

- **`LabelItem`:** `{ key, kind, quad, priority, visible, source }`, one per label on screen (RFC §3.1).
- **`labelPass(input) → LabelPassResult`:** `{ overlay, lettering, labels, pass }`, one per settle (RFC §3.2).
- **Priority families P0–P6:** title block, columns, plate names, faces, compact column, marks, then S6 callouts and notes (RFC §3.1).
- **Emphasis slots:** `hover` and `selected` (RFC §7.1).
- **Matrix cell:** `route × width × palette × state × zoom × snap × scroll` (RFC §5.2).
- **Seal tags:** `seal/<surface>-<fix sha>`, one per re-seal.

## Success Criteria _(mandatory)_

AC1–AC6 above are the success criteria. Verdicts go in `evidence/AC-selfcheck.md`, with links to each gate's evidence (RFC §10). No other criteria exist.

## Assumptions

- **Base** for every before/after comparison: `021c1ff` (S16 freeze; product code = S15 merge `fae4ac6`).
- **Seal bases at the start:** S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `8506837`, S7 `5b22987`, S8 `8f27462`. All are reachable through `seal/*` tags.
- **Executor:** DeepSeek Flash 4.1 with the sandbox off for every task that builds, runs vitest on loopback or launches Chromium. Writes are limited to its task worktree and `/tmp/s16-checks`.
- **Machine:** every pixel, quad and timing comparison runs on the same machine with the same Chromium (156.0.8078.4 at S15). Lighthouse and weight come from CI on the Vercel preview of the slice PR.
- **Murphy's role:** Murphy reviews at STOP 1 and validates hands-on at the end. No other step blocks on a human test (the standing S12 preference).
