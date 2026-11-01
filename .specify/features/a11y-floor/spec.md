# Feature Specification: S08 A11y Floor (Keyboard · Screen Reader · Contrast · No-JS)

**Feature dir:** `.specify/features/a11y-floor/` · **Slice:** S08-a11y-floor · **Created:** 2026-11-01 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-08-a11y-floor.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-01: §6 defaults, refinements R1–R9 in §9)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. The supporting work is:
> - the S7 seal and the presentation guard;
> - the pure a11y modules (navigator order and keys, announcements, contrast inventory, reveal);
> - the DOM pieces (component navigator, live region, panel focus hook, WebGL gate, engine fallback);
> - the axe gate, the a11y probe and the CI job.
>
> Each piece sits under the FR it serves and gets task-level checks, not criteria of its own. Documented values (key map, message wording, matrix rows, axe state list, tag set) come from the RFC and are referenced, not promoted to criteria.
>
> **Perf doctrine (binding):** perf evidence uses the dropped-frames style only: 0 dropped frames over a ≥ 5 s window, the 60 ±10% band as liveness, raw fps as information. No task check anywhere in this feature may contain a literal fps threshold (kickoff Hard Rule 4).
>
> **Evidence doctrine (binding, kickoff Hard Rule 5):** every a11y claim is backed by machine evidence: AX-tree / ARIA snapshots, measured contrast ratios, axe JSON, keyboard drill logs. Murphy's VoiceOver pass at final validation completes it. "Feels accessible" is not a report.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Keyboard visitor explores the parts (Priority: P1)

I tab into the drawing, then once more onto its parts. The arrow keys walk me through every part in number order, and each one lights up with an outline. Enter opens its details; Esc brings me back to the same part. Left/Right still turn the model and +/− still zoom. I never get stuck anywhere on the page.

**Why this priority:** S7 carry-overs (a) and (b). Without it nothing in the teardown is operable without a mouse.

**Independent Test:**
- `a11y-navigator.test.ts` covers order, wrap, Home/End, and the key map, which consumes no S4 key.
- `a11y-navigator.dom.test.tsx` covers roving tabindex, Enter → panel, and Esc → focus on the proxy.
- The probe's **keyboard drill** runs over fixtures A and B (`T016-log-keyboard-drill-{a,b}.txt`), locally and in the CI a11y job.

**Acceptance Scenarios:**

1. **Given** `/dev/engine` fixture A, **When** the visitor presses Tab from the page top, **Then** focus visits the skip link, the viewer group (`"Tidewatch architecture view"`), then **one** Components stop, then the playground controls in visual order. The walk reaches the last control, and Shift+Tab walks back in the same sequence (no trap). _(AC1)_
2. **Given** focus on the Components stop, **When** the visitor presses ArrowDown repeatedly, **Then** focus moves `1.1 → 1.2 → … → 4.1 → 1.1`. Each focused part gets the program highlight (`data-xploder-highlight=<id>`) and, under `:focus-visible`, a hull outline. Home/End jump to the first/last part. _(AC1)_
3. **Given** focus on `tide-repository`, **When** the visitor presses Enter (or Space), **Then** a `dialog "Tide Repository"` opens and focus is on its heading. **When** they press Esc, **Then** the panel closes and `document.activeElement` is the `tide-repository` proxy. This holds for every component of A and of B. _(AC1)_
4. **Given** focus on a part, **When** the visitor presses ArrowLeft / `+`, **Then** the model rotates / zooms exactly as from the wrapper (S4 unchanged). _(AC1)_
5. **Given** max zoom on fixture C and focus on the wrapper, **When** the visitor presses ArrowDown/PageDown, **Then** the stage scrolls, and the stage itself is never a Tab stop (R1). **When** they focus a part outside the canvas, **Then** the stage scrolls so that the part is visible (Q12). _(AC1)_

---

### User Story 2 — The focus story is sane, whatever opened the panel (Priority: P1)

Whether I click a part or press Enter on it, focus goes into the panel, and closing puts me back where I started. A tour jump never yanks my focus.

**Why this priority:** S7 carry-over (a), and brief deliverable 2.

**Independent Test:** DOM tests (open → heading, close → trigger, a surface remount keeps focus) + the probe drill's pointer and tour variants.

**Acceptance Scenarios:**

1. **Given** fixture A, **When** the visitor clicks `tide-repository` with the mouse, **Then** focus is on the panel heading with no focus ring and no page/stage scroll. **When** they press Esc, **Then** focus is on the viewer wrapper (the S7 contract). _(AC1)_
2. **Given** a detail panel with focus inside, **When** the surface re-docks (scroll at max zoom) or the geometry moves (explode toggle), **Then** focus stays inside the panel, on the new surface's heading after a remount, and never falls to `<body>` (D3). _(AC1)_
3. **Given** tour `live-update` playing, **When** the visitor presses Enter on the in-flow `tide-repository` proxy, **Then** the tour jumps to step 4 and keeps playing, focus stays on the proxy, and the jump is announced. **When** they press Enter on the not-in-flow `forecast-details-panel` proxy, **Then** the tour pauses, the panel opens with focus on its heading, and Esc returns focus to that proxy. _(AC1, AC2)_

---

### User Story 3 — Screen-reader visitor hears what happens (Priority: P1)

The tour reads out its first step. Opening a part tells me its name and what it does, closing it says so, chips tell me what kind of tech they are, and the drawing's lettering is never read on top of the part names.

**Why this priority:** S7 carry-over (c) and the S5 live-region carry-over, brief deliverable 3.

**Independent Test:**
- `a11y-announce.test.ts` covers every message row.
- `a11y-live-region.dom.test.tsx` asserts the **same node** is empty at mount and holds step 1 after `play()`.
- The probe captures the AX tree (CDP) + `ariaSnapshot()` per state (`T016-log-aria-*.txt`).

**Acceptance Scenarios:**

1. **Given** the viewer has just mounted with no tour, **Then** exactly one `aria-live="polite"` node exists inside the viewer, and it is empty. **When** a tour starts, **Then** that same node's text is `"Live update · Step 1 of 6. Beachgoer. A person checking the next high tide.. A new tide reading travels from the public feed to the chart."` (the S5 copy). _(AC2)_
2. **Given** the visitor opens `tide-repository`, **Then** the AX tree has a `dialog` named `"Tide Repository"` with a description containing `"module · shipped"` and the summary (R4), focus on its heading, and live text `"Tide Repository, module. Chooses between a live reading and the saved forecast."`. **When** it closes, **Then** the live text is `"Tide Repository details closed."` (D5). _(AC2)_
3. **Given** that panel, **Then** each chip's AX name is `"<label>, <category>"`, for example `"Kotlin, language"`. _(AC2)_
4. **Given** any state, **Then** every node under `[data-xploder-lettering-layer]` is ignored in the AX tree (`aria-hidden` root). No AX text node equals a lettering string such as `"1.1"` or `"Tide Repository"` outside the navigator, dialog, live region and caption. The S6 overlay is hidden from AT too (Q6). _(AC2)_
5. **Given** a tour jump, **Then** the live text starts with `"Jumped to "`. **Given** a not-in-flow click, **Then** it starts with `"Tour paused. "`. _(AC2)_

---

### User Story 4 — Reviewer trusts the floor (Priority: P1)

Every pull request scans the engine page with axe in both palettes on desktop and mobile. A real regression turns the check red.

**Why this priority:** this is the brief's main new gate. Before this slice, a11y was gated only on the placeholder `/`.

**Independent Test:** `tools/perf` unit tests (gate verdicts, exit codes, recorded-violation fixture → 6) · the CI job `a11y: axe (engine fixture export)` · the regression proof (red URL, then green URL).

**Acceptance Scenarios:**

1. **Given** a PR, **When** CI runs, **Then** the a11y job builds the fixture export on the runner, scans `/dev/engine` in {light, dark} × {desktop, mobile} × the RFC D7/R9 states, and passes with **0 serious, 0 critical**. It uploads `axe-<scheme>-<viewport>.json` + `axe-summary.json`. _(AC3)_
2. **Given** the deliberately broken commit (R6: `aria-hidden` on the controls section), **When** CI runs, **Then** the a11y job fails with `aria-hidden-focus` (serious). **Given** the revert commit, **Then** it is green again. Both run URLs are recorded. _(AC3)_
3. **Given** the layer-focus state, **When** axe reports `color-contrast` on dimmed-layer nodes, **Then** those nodes go to the exception ledger with their measured ratios. Any other violation in that state fails the gate (R3). _(AC3, AC4)_

---

### User Story 5 — Low-vision visitor can read everything (Priority: P2)

Every text and control meets AA in light and dark, and that is measured, not eyeballed.

**Independent Test:** `a11y-contrast.test.ts` (inventory table, both palettes, thresholds) + the probe's browser measurement (computed styles + pixel sampling over the canvas) + axe `color-contrast`, merged into `T016-log-contrast-table.md`.

**Acceptance Scenarios:**

1. **Given** each surface in the D6 inventory, in both palettes, **Then** body text is ≥ 4.5:1, large text ≥ 3:1, and UI parts (focus ring, chip border where meaningful) ≥ 3:1, computed from tokens **and** measured in the browser. _(AC4)_
2. **Given** a highlighted part, **Then** its face lettering (number and name) is drawn in `ink` and measures ≥ 4.5:1 in both palettes (R2; before: 3.05 / 3.34 and 4.24 / 3.01). _(AC4)_
3. **Given** a token-level offender, **Then** it is fixed in `blueprint.ts` values only (the `--bp-*` source), with the S2 manifest regenerated for that one file and the reason logged. None is known at base (RFC §1). _(AC4)_

---

### User Story 6 — Motion-sensitive visitor sees no motion (Priority: P2)

With reduced motion on, nothing animates anywhere in the teardown. Every animation has a static twin, and a new animation cannot slip in unlisted.

**Independent Test:** `a11y-motion-matrix.test.ts` (completeness scanner + negative control) + the probe's reduced-motion run (`T016-log-reduced-motion.txt`, one row per matrix row).

**Acceptance Scenarios:**

1. **Given** the matrix JSON, **When** the scanner lists every animation site in `packages/xploder/src/**` and `apps/web/app/**`, **Then** each site is in the matrix. A temp file with an unlisted `.animate(` makes the test red. _(AC5)_
2. **Given** a `reducedMotion:'reduce'` context, **When** each matrix row's trigger runs (explode, rotate, zoom, hover, tour play/step, caption, trace, overlay, panel open/close/switch, case study, lettering, focus ring/reveal), **Then** `document.getAnimations().length` is 0 in every frame sample for 1 s, `data-xploder-tweening` never reads `true`, and the R3F frame delta is ≤ 2 per 3D trigger. _(AC5)_

---

### User Story 7 — Visitor without JS or WebGL still learns what is here (Priority: P2)

Without JavaScript I see a poster of the architecture and a list of the projects. Without WebGL I see a message and the same list, never a blank box.

**Independent Test:** the probe's no-JS context (`javaScriptEnabled:false`) and its no-WebGL contexts (init-script stub + `--disable-3d-apis`): screenshots, DOM dumps, AX tree, 0 page errors.

**Acceptance Scenarios:**

1. **Given** JS disabled, **When** `/dev/engine` loads, **Then** the page shows an `img`-role SVG poster named `"Tidewatch architecture: 4 layers, 8 components"` and a `navigation "Projects"` list with links `Tidewatch`, `Ledgerline`, `Lockerbay` (`?fixture=a|b|c`). The "Loading engine…" placeholder is hidden. This holds in light and dark (CSS `prefers-color-scheme`). _(AC6)_
2. **Given** WebGL unavailable, **When** `/dev/engine` loads with JS, **Then** no `<canvas>` is mounted. The page shows the message `"WebGL is unavailable…"` + the same project list, with 0 `pageerror` events and 0 console errors. The chrome controls still render. _(AC6)_

---

### User Story 8 — Nothing else breaks (Priority: P2)

Full CI is green, frozen surfaces are untouched, 2 draw calls hold, and nothing shifts.

**Independent Test:** frozen-surface tests (S2/S4, S5, S6, **S7**) + guard lines · the presentation-snapshot diff · `engine:probe` S4–S7 rerun · `fps.json` + draw calls + CLS · `gh pr checks`.

**Acceptance Scenarios:**

1. **Given** the PR head, **Then** build/typecheck/lint/test, gitleaks, Lighthouse, weight, fps calibration, fixture exclusion **and** the a11y job are all green. _(AC7)_
2. **Given** the sealed lists, **Then** `git diff` against each base is empty. The Tier-B diff touches only the RFC D1 a11y edits, and the presentation snapshot diff is empty except for the R2 lettering colour. _(AC7)_
3. **Given** idle, panel-open and component-focused states, **Then** `drawCalls = 2`. Over the keyboard drill, the strict CLS total is 0 with sources inside the viewer. The S5 tour FPS scenario shows 0 dropped frames over ≥ 5 s. _(AC7)_

---

### Edge Cases

- **Keyboard Enter before the first settled frame:** works (the click decision by id); there is no ring yet and the reveal is a no-op (R5).
- **A component focused while the geometry moves:** the proxy keeps focus; the ring is hidden until settle (D2).
- **Hover elsewhere while a part is focused:** the last highlight writer wins; on blur the proxy clears only its own id (RFC §5).
- **Identical consecutive announcement** (re-open the same part): the region is cleared, then set on the next frame, so it is re-announced (D5).
- **Tech missing from the registry:** the chip name is the label only; reported in evidence (none in the fixtures).
- **Project switch with a part focused:** the navigator re-renders for the new project, and focus moves to the new Components stop's first proxy (never `<body>`).
- **Esc with no panel open:** untouched, so S5's tour stop / layer release works (D2 table).
- **WebGL context creation throws after the probe passed:** `CanvasBoundary` shows the same fallback (D8).
- **Layer focus active:** dimmed text is measured and ledgered per node (R3); all other rules still gate.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** keyboard-only drill passes for fixtures A and B: every component selectable via keyboard, panel opens from the keyboard, `Esc` closes it, focus returns to the triggering element, no traps, tab order logical; automated drill script + log attached.
- **FR-002 (↔ AC2):** screen-reader evidence: live region mounts at viewer mount and announces step 1 (asserted in the DOM test), panel open/close announcements assertable in the accessibility tree, chips carry label+category, **lettering nodes are `aria-hidden`** and expose no duplicate accessible text; ARIA snapshot evidence attached.
- **FR-003 (↔ AC3):** axe-core on `/dev/engine` light+dark × desktop+mobile in CI: **0 serious, 0 critical** violations; the gate fails on regression (proven with a deliberately broken state, reverted).
- **FR-004 (↔ AC4):** measured contrast ratios meet AA for all text/UI surfaces in both palettes; offending tokens fixed at the CSS-variable layer; evidence table attached.
- **FR-005 (↔ AC5):** reduced-motion coverage matrix complete for all animations (including S7 lettering/panel additions) — 0 animations under emulation, with a twin for each; evidence attached.
- **FR-006 (↔ AC6):** JS-disabled render shows poster + accessible project list (screenshot + DOM evidence); no-WebGL path shows the same list plus a message (evidence).
- **FR-007 (↔ AC7):** full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion) + the new axe gate; frozen-surface checks for S2–S7 remain empty; 2 draw calls unchanged; zero CLS.

### FR ↔ AC mapping

| FR | AC | Design (RFC) | User story |
| --- | --- | --- | --- |
| FR-001 | AC1 | D2, D3, D10; R1, R5, R8 | US1, US2 |
| FR-002 | AC2 | D4, D5, D10; R4 | US3 (US2 sc. 3) |
| FR-003 | AC3 | D7; R3, R6, R9 | US4 |
| FR-004 | AC4 | D6; R2, R3 | US5 |
| FR-005 | AC5 | D9 | US6 |
| FR-006 | AC6 | D8; R7 | US7 |
| FR-007 | AC7 | D1, D10, D11, D12 | US8 |

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
| --- | --- | --- |
| 1. Keyboard navigation: component selection, visible focus on slab + DOM, Enter/Space opens, Esc closes + returns focus, tab order, skip link, no traps | FR-001 | RFC D2, D3, Q3, R1, R5 |
| 2. Focus management: pointer-open focus, S7 return contract kept, tour-jump focus | FR-001 | RFC D3, Q4, R8 |
| 3. Screen-reader announcements: live region at mount, panel open/close, chips label+category, lettering `aria-hidden`, jump announcement | FR-002 | RFC D4, D5, Q5, Q6, R4 |
| 4. Contrast: AA in both palettes for labels, chips, captions, panel text, callouts; token fixes at the CSS-variable layer | FR-004 | RFC D6, Q7, R2, R3 |
| 5. No-JS / WebGL-fail fallback: poster + project list / message + list | FR-006 | RFC D8, Q8, R7 |
| 6. Automated a11y gate: axe on `/dev/engine`, both palettes, mobile + desktop, in CI | FR-003 | RFC D7, Q10, R6, R9 |
| 7. Reduced-motion coverage matrix incl. S7 additions | FR-005 | RFC D9 |
| Murphy dependency: manual VoiceOver pass (15 min) with the evidence checklist | FR-002 (human leg) | RFC §8.5, T017 |

Non-goals stay hard:
- no visual redesign (S6/S7 sealed). The one presentation change is the R2 contrast fix, approved at Gate 1.
- no new interaction features beyond a11y affordances (navigator, pan keys, reveal and skip link are a11y affordances, Q2/Q11/Q12);
- no site shell, landing or routes (S10); no real content (S9);
- no schema changes and no change to an existing API (additive exports and props only);
- no camera/layout changes (the reveal uses S5's existing stage scroll); no cross-project chip links (S14);
- no pixel/papercraft theme, no DNS/Vercel changes, no analytics, no secrets.

### Key Entities

- **Navigator model** (`src/a11y/navigator.ts`):
  - `navigatorItems(project) → {id, name, layerId, layerName, kind, itemNumber: '3.1'}[]` in item-number order;
  - `navigatorKey(key, index, count) → {type:'move', index} | {type:'activate'} | null`. `null` means "let it bubble"; never for `ArrowLeft/ArrowRight/+/-/0`.
- **Reveal** (`src/a11y/reveal.ts`): `revealScrollTop({hull, offsetY, canvasHeight, scrollTop, extent, marginPx}) → number | null` (null = already visible).
- **Announcement model** (`src/a11y/announce.ts`):
  - `announce(event, project) → string`;
  - events: `tourStep{flowId, position}`, `tourJump{flowId, position}`, `tourPausedOpen{componentId}`, `detailOpen{componentId}`, `detailClose{componentId}`, `caseStudyOpen`, `caseStudyClose`;
  - the `ANNOUNCE` flags (R4).
- **Contrast inventory** (`src/a11y/contrast.ts`): `CONTRAST_SURFACES: {id, slice, fg: RoleRef, bg: BgRef, size:'body'|'large'|'ui', state:'rest'|'highlight'|'dim'}[]` and `contrastTable(palette) → {id, ratio, threshold, pass, exception?: 'inactive-dim'}[]`.
- **Motion matrix** (`test/a11y-motion-matrix.json`): `{id, slice, site, trigger, tokens, twin, check}[]`.
- **New exports** (`xploder/react`, additive): none required for the app beyond the existing `fallback` prop. The app-side `EngineFallback` lives in `apps/web`.
- **Viewer DOM contract additions:**
  - `[data-xploder-navigator]` › `button[data-xploder-proxy="<componentId>"]` (+ `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `aria-describedby`);
  - `[data-xploder-focus-ring]` (an SVG polygon, present only while a proxy is focus-visible and a frame is settled);
  - `[data-xploder-live]` (always-mounted polite region);
  - `[data-xploder-fallback]` (no-WebGL);
  - `data-xploder-webgl="ok|unavailable"` on the wrapper.
- **Frozen manifests:** S2/S4 (`53b2b2b`), S5 (`f31600e`), S6 (`0b2c678`) unchanged; **S7 `frozen-surface.s7.manifest.json` (base `5b22987`, new in T001)**.
- **Evidence artifacts:**
  - `RFC-log-*`;
  - `T0NN-log-*` (drill, aria, contrast, reduced motion, nojs/nowebgl DOM, presentation diff, surface diff);
  - `T0NN-axe-*.json`, `T0NN-screenshot-*`, `T016-fps.json`;
  - `AC-selfcheck.md`, `voiceover-checklist.md`.

## Success Criteria _(mandatory)_

Success = AC1–AC7 each pass, with evidence recorded in `evidence/` and in the per-task reports, **plus** Murphy's VoiceOver pass on the T017 checklist (the brief's Murphy dependency). No additional success criteria are defined.

| FR | AC | Evidence type |
| --- | --- | --- |
| FR-001 | AC1 | navigator unit + DOM test logs · keyboard drill logs A/B (Tab walk forward/back, every component Enter→Esc→focus-on-trigger, Space variant, pointer variant, tour jump) · the same drill green in the CI a11y job |
| FR-002 | AC2 | announce + live-region DOM test logs (same node, step 1) · AX-tree (CDP) + `ariaSnapshot` per state (dialog name/description, live text, chip names, lettering ignored, no duplicate text) |
| FR-003 | AC3 | `axe-*.json` ×4 combos + `axe-summary.json` (0 serious, 0 critical; exception ledger) · CI run URLs: red on the broken commit, green after the revert · gate unit-test log |
| FR-004 | AC4 | contrast table: Node token table + browser computed/pixel measurement + axe column, both palettes, every inventory row; R2 before/after; token-fix log (expected: none) |
| FR-005 | AC5 | matrix table + scanner log (with negative control) + reduced-motion probe log (0 animations per row) |
| FR-006 | AC6 | no-JS screenshots light/dark + DOM + AX tree · no-WebGL screenshots (stub + flag) + DOM + 0 errors |
| FR-007 | AC7 | `gh pr checks` (all + a11y) · frozen-surface log (4 manifests + S7 negative control) + Tier-B diff + presentation diff · `engine:probe` S4–S7 all pass · `fps.json` (0 dropped, band liveness, `drawCalls = 2`) · strict CLS 0 |

## Assumptions

- All RFC §6 defaults are accepted, and refinements R1–R9 apply (RFC §9).
- New dev dependencies, both test/tooling only, with no bundle or runtime impact:
  - `jsdom` in `apps/web` (Q9, placed per RFC §9.8 C1: `packages/xploder/package.json` is S2-sealed, and `apps/web` already has `react-dom`);
  - `axe-core@4.14.0` in `tools/perf` (already in the lockfile).
- `/dev/engine` is the only route that mounts the viewer. The evidence and the CI axe job run on the fixture export built on the runner. Lighthouse and weight on `/` remain no-regression gates.
- Push and draft PR are granted and used at the start of G3 (RFC §9.3). Merge happens only on Murphy's command (§9.4).
- Escalation: tier 1.5 (OpenRouter) is DORMANT and skipped with a record. After two tier-1 failures, the orchestrator pauses and reports with 5h usage, then executes personally on Murphy's go (RFC D12). Each phase group starts in a fresh 5h window; no new task starts at ≥ 85% of the 5h window.
- Q7a/R2 is an approved a11y fix. Whether it counts as S8 revision 1 of 2 is Murphy's vault call.
