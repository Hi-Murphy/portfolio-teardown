# RFC — S08 A11y Floor: Keyboard · Screen Reader · Contrast · No-JS

**slice:** S08-a11y-floor · **status:** APPROVED at Gate 1 (2026-11-01): defaults accepted, refinements R1–R9 applied (§9) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-08-a11y-floor.md` (frozen brief v1) · **branch:** `task/s08-a11y-floor` · **base:** `5b22987` (brief freeze; S7 shipped at `10c1003` + brief revision `3dcc16d`) · **date:** 2026-11-01

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§6).

---

## 1. Context (from the brief)

- **Mission:** make the teardown usable **without a mouse, without sight, and without JavaScript**: complete keyboard operation, screen-reader announcements, AA contrast, and a no-JS / no-WebGL fallback. Presentation is frozen. This slice adds affordances, not design.
- **Live from S7:** detail panel (click/tap; close via same-slab / `Esc` / outside / close control; focus returns to the viewer **after** close, but a pointer open does not move focus), case-study panel, tech chips, tour click-to-jump (in flow = jump and keep the play state; not in flow = pause + panel; Play resumes, no auto-resume). **Revision 1:** isometric part/layer lettering on slab faces + the compact phone parts column. **Lettering is decorative.** Accessible names come from component/layer names.
- **Live from S5:** tour caption with an `aria-live` region that **mounts when a tour starts**, so step 1 can be missed (carry-over, fixed here).
- **Live from S6/S7:** light (default) and dark blueprint palettes, dimension lines/callouts, 2 draw calls, zero CLS, reduced-motion twins.
- **Binding S7 carry-overs:** (a) the focus story for a pointer-opened panel, (b) keyboard component selection, (c) a screen-reader pass over panels, chips and lettering.
- **Prior gates:** Lighthouse a11y ≥ 95 runs on the production placeholder `/` only. `/dev/engine` is dev-only. This slice brings axe on `/dev/engine` into CI, plus a documented manual AT pass (Murphy, VoiceOver, 15 min).
- **Non-goals (hard):** visual redesign (S6/S7 sealed) · new interaction features beyond a11y affordances · site shell/landing/routes (S10) · real content (S9) · schema/API changes · camera/layout changes · cross-project chip links (S14) · pixel/papercraft theme.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | keyboard-only drill passes for fixtures A and B: every component selectable via keyboard, panel opens from the keyboard, `Esc` closes it, focus returns to the triggering element, no traps, tab order logical; automated drill script + log attached. |
| AC2 | screen-reader evidence: live region mounts at viewer mount and announces step 1 (asserted in the DOM test), panel open/close announcements assertable in the accessibility tree, chips carry label+category, **lettering nodes are `aria-hidden`** and expose no duplicate accessible text; ARIA snapshot evidence attached. |
| AC3 | axe-core on `/dev/engine` light+dark × desktop+mobile in CI: **0 serious, 0 critical** violations; the gate fails on regression (proven with a deliberately broken state, reverted). |
| AC4 | measured contrast ratios meet AA for all text/UI surfaces in both palettes; offending tokens fixed at the CSS-variable layer; evidence table attached. |
| AC5 | reduced-motion coverage matrix complete for all animations (including S7 lettering/panel additions) — 0 animations under emulation, with a twin for each; evidence attached. |
| AC6 | JS-disabled render shows poster + accessible project list (screenshot + DOM evidence); no-WebGL path shows the same list plus a message (evidence). |
| AC7 | full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion) + the new axe gate; frozen-surface checks for S2–S7 remain empty; 2 draw calls unchanged; zero CLS. |

### Starting point (checked on this branch at `5b22987`)

| Item | State |
|---|---|
| Viewer DOM (S4/S5/S7) | `wrapper` (`tabIndex 0`, `role=group`, `aria-label "<name> architecture view"`, `aria-keyshortcuts "ArrowLeft ArrowRight + - 0"`, React `onKeyDown` = S4 keys) → `stage` (`overflow-y:auto`, S5 pointer + S7 click listeners) → sticky canvas viewport (`<Canvas>` + `BlueprintOverlay` + `PartLettering`) + scroll spacer. Siblings of the stage: `TourCaptionLiveRegion` + `TourCaption` (**only while a tour is active**), then `PanelLayer`. All in `react/TeardownViewer.tsx` (composition root, **not sealed**). |
| Keys | S4 `keyToAction`: `ArrowLeft/ArrowRight` rotate, `+/-/0` zoom; `preventDefault` only for those keys. S5: a `window` keydown listener (only while a tour is active or a layer is focused) runs `Esc` → stop tour / release focus and skips `defaultPrevented`. S7: `PanelLayer` listens for `Esc` on `document` (before S5's `window` listener). The panel surface stops propagation of every key except `Esc`. |
| Focus (S7) | Pointer-opened detail: focus stays on the wrapper. Case study: focus moves to its heading (`tabIndex -1`). Close: case study → opener button if still connected, else the wrapper; detail → the wrapper. `useViewerPanels` records the opener **only** for the case study (`openDetail` records nothing). The detail `<h2>` has no `tabIndex`. |
| ARIA | Panel surface `role=dialog aria-modal=false aria-labelledby=<heading>`. Chips: `<ul aria-label="Tech">`, `<li>` = label only (**no category**; `ChipModel.category` exists). S6 overlay: `<svg aria-hidden>` + HTML labels with visually hidden `srText`. S7 lettering: `<svg aria-hidden>`, but the HTML lettering text and the parts column are **exposed**. |
| Palette (S2, sealed) | `blueprint.light/dark` in `src/theme/blueprint.ts` is the single source. `paletteCss()` generates the `--bp-*` CSS variables from it, **and** xploder renderers read the same values as JS (`palette.ink` inline styles). A CSS-only override would not reach the inline styles (→ D6, Q7). |
| Motion (S2) | `resolveMotion(true)` = static twin: every duration, stagger and distance is 0, so `tourBeat 0` means a reduced-motion tour advances only by Step. |
| Seals | `frozen-surface.manifest.json` (S2+S4), `.s5`, `.s6` with generators and a negative control. **There is no S7 seal** (F1). |
| Test env | xploder: vitest + `@react-three/test-renderer`, **no `react-dom` / jsdom** (S6 note 7.1). `react-dom@19.3.1` is in the store; jsdom is not. `axe-core@4.14.0` is already in the lockfile (via Lighthouse). |
| Production | The viewer is mounted only on `/dev/engine` (fixture export `out-fixtures/`, 404 on Vercel, asserted by the fixture-exclusion job). `/dev/engine` is client-only (`dynamic(..., { ssr:false })`, placeholder "Loading engine…"). |
| CI | `ci.yml`: typecheck, lint, test, build, fixture exclusion, gitleaks. `perf.yml`: Lighthouse + weight against the Vercel preview, fps calibration (builds the fixture export **on the runner**), fixture exclusion. `engine:probe` is a local evidence tool, not a CI job. |

### Environment facts checked 2026-11-01

| Item | Fact | Source |
|---|---|---|
| Node | v24.19.0 (`.nvmrc` 24) | local |
| Tier-1 executor | `codex` at `/opt/homebrew/bin/codex` (DeepSeek Flash 4.1 profile, as in S6/S7) | local |
| Tier 1.5 | `OPENROUTER_API_KEY` **unset** → DORMANT, skip-with-record | local env |
| axe baseline (fixture A, exploded, idle) | **0 violations** in all 4 palette × viewport combos. `color-contrast` **incomplete** on 22 (desktop) / 37 (mobile) nodes: text over the canvas, where axe cannot see the background | `evidence/RFC-log-baseline.txt` |
| axe, other states (light desktop) | detail panel A/B, case study, tour step 1: **0 violations** | same |
| Live region | **0** `aria-live` nodes at idle; 1 once a tour starts (the carry-over is confirmed) | same |
| ARIA snapshot | the viewer group exposes one flat text run: S6 callouts `1 Interface … 4.1 Tide Feed`, the dimension `4 layers 2 × 2`, then the **lettering numbers `1.1 1.2 … 4.1` again** (duplicate). Chips: `listitem: Kotlin` (no category). During a tour the caption text is exposed twice (live region + visible caption) | same |
| Tab walk (desktop + mobile) | wrapper → 18 playground controls → body. **No component is reachable.** Disabled zoom buttons are skipped. At **max zoom** the stage becomes an extra, **unnamed** Tab stop (Chromium "keyboard-focusable scrollers") | same |
| Contrast, token pairs | ink / label / accent / line / steel / all 8 tech colours ≥ 4.5:1 on paper **and** surface in both palettes (lowest: light `tech.library` on paper 4.93, then light `storage` 5.18, `steel` 5.23). `lineMuted` 3.2–3.8 (used only for non-text chip borders and leaders, ≥ 3:1) | `evidence/RFC-log-contrast.txt` |
| Contrast, offenders found | **(1)** the highlighted part's lettering number (`accent` on the accent-washed face): **3.05 light / 3.34 dark**. A token-only fix exists for light (`accent` → `#074959`, a big visual change) but **none for dark** (best 4.24 along the lightness axis). **(2)** Layer-focus dimming (`dim.level 0.3`, S5 token, applied by S6/S7 renderers) puts dimmed labels at **1.5–2.5:1** | same |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Module tree, seals, frozen-surface guard (AC7)

**R:** New behaviour lives in **new modules**. Sealed files stay byte-identical. S7 is sealed first.

```
packages/xploder/src/a11y/               (new, pure, Node-tested)
  navigator.ts   component order (item-number order), roving index, key → action    AC1
  announce.ts    live-region message model (tour step/jump/pause, panel open/close)  AC2
  contrast.ts    text/UI surface inventory × palette → composited ratios (reuses look/fills.ts read-only)  AC4
  reveal.ts      scrollTop needed to bring a hull into the canvas (pure, from overlay frames)  AC1
packages/xploder/src/react/a11y/         (new, thin DOM)
  ComponentNavigator.tsx  focus proxies + hull focus ring, roving tabindex       AC1 AC2
  LiveRegion.tsx          always-mounted polite region + message sequencing      AC2
  usePanelFocus.ts        open → heading, re-focus after surface remount/hide    AC1
  webgl.ts + CanvasBoundary.tsx   capability probe + error boundary → fallback   AC6
apps/web/app/dev/engine/
  engine-fallback.tsx     server-safe poster (SVG from layoutProject) + project list   AC6
tools/perf/src/
  a11y-axe.ts + cli/a11y-axe.ts       axe gate (exit 6 on serious/critical)      AC3
  a11y-probe.ts + cli/a11y-probe.ts   keyboard drill, AX tree, announcements, reduced motion, fallbacks, in-browser contrast   AC1 AC2 AC4 AC5 AC6
```

- **S7 seal first (T001), at base `5b22987`, in two tiers:**
  - **Tier A, byte-sealed** (`frozen-surface.s7.paths` + manifest + generator + negative control, like S5/S6): `src/panel/**`, `src/lettering/**`, `react/panel/{CaseStudyPanel.tsx, executeTourCommand.ts, pickAt.ts, useSlabClick.ts}`, the S7 tests and snapshots, and `tools/perf/src/panel-probe.ts`.
  - **Tier B, a11y-attribute edits only:** `react/panel/PanelLayer.tsx` (call `usePanelFocus`), `react/panel/DetailPanel.tsx` (`tabIndex={-1}` on the `<h2>`), `react/panel/TechChips.tsx` (visually hidden category), `react/panel/useViewerPanels.ts` (record the detail opener), `react/lettering/PartLettering.tsx` (`aria-hidden` on the root). The brief requires each of these (carry-overs a–c, deliverable 3). **Presentation guard:** the probe records a *presentation snapshot* (tag, rect, and computed `color`, `background-color`, `font-*`, `border-*`, `opacity`, `transform`, `visibility` for every node under the panel layer and lettering layer, over a fixed state list in both palettes) on the base build and on the branch. The diff must be empty, apart from changes Murphy approves in Q7. The Tier-B `git diff` is logged in the frozen-surface evidence.
- **Edited (not sealed):** `react/TeardownViewer.tsx` (composition root), `react/index.ts` (additive exports), the playground (skip link, `fallback` prop, `<noscript>`), the `apps/web/test/*` scanners (S8 file lists), `tools/perf`, `.github/workflows/perf.yml`.
- **Rejected:** wrapping S7 renderers from the outside to avoid Tier B (focus inside the panel and chip category text cannot be reached from the composition root) · a new package subpath (`package.json` is S2-sealed) · putting a11y modules into S5's `src/interaction/`.

### D2 — Keyboard interaction model (AC1)

**R: one roving "Components" tab stop** inside the viewer, after the wrapper:

| Key (focus on a component) | Action |
|---|---|
| `ArrowDown` / `ArrowUp` | next / previous component in **item-number order** (`1.1, 1.2, …, 4.1`, the S6/S7 part numbers), wrapping at the ends |
| `Home` / `End` | first / last component |
| `Enter` / `Space` | the **same decision as a pointer click** (`resolveSlabClick`): open/switch/close the detail panel, or jump the tour / pause + panel |
| `ArrowLeft` / `ArrowRight`, `+` `-` `0` | **not handled**: they bubble to the wrapper, so S4 rotate/zoom work while a component is focused |
| `Esc` | unchanged layering: panel open → close (S7 `document` listener); otherwise S5 stops the tour / releases layer focus |
| `Tab` / `Shift+Tab` | leave the group (wrapper ← components → panel) |

- **DOM:** `ComponentNavigator` is a **sibling of the stage** (like `PanelLayer`), so browser focus scrolling never scrolls the stage (stage scroll is the S5 camera pan). One `<button>` proxy per component, grouped per layer (`<ul aria-label="<layer name>">`), `tabIndex 0` on the active proxy only. A proxy is absolutely positioned over its slab's hull bounding box, from the same `onOverlay` / `onOverlayScroll` fan-out the panel uses. It has `pointer-events:none`, so S5/S7 picks are untouched. The positioning also lets VoiceOver's cursor and iOS touch exploration land on the slab.
- **Visible focus, both places the brief names:** (1) **on the slab**: focus calls `viewer.actions.highlight(id)` (the existing S5 program highlight, the same path S7 uses); blur clears it unless that component's panel is open. (2) **in the DOM**: under `:focus-visible`, an SVG outline traces the slab's **hull polygon** (2 px, `accent` role; ≥ 3:1 against paper and surface in both palettes, see D6). There is no ring while the geometry is moving (no settled frame). The proxy itself is never hidden, so focus is never lost.
- **Reveal:** focusing a component whose hull is outside the canvas (max zoom) sets `stage.scrollTop` (instant) to the value from `a11y/reveal.ts`. This is S5's own pan mechanism, used through the public DOM, with no camera or layout change.
- **Wrapper pan keys (Q11):** on the wrapper, `ArrowUp/ArrowDown/PageUp/PageDown/Home/End` scroll the stage when it is scrollable, and the stage gets `tabIndex={-1}`. This removes the unnamed focusable scroller seen at max zoom and keeps keyboard pan reachable from the single viewer stop. `aria-keyshortcuts` is extended and a visually hidden description (`aria-describedby`) lists the keys.
- **Rejected:** one Tab stop per component (13 stops on fixture C) · Left/Right also cycling components (this would shadow S4 rotate while a component is focused) · a `tree`/`listbox` role (option/treeitem semantics fit badly with "opens a dialog") · visually hidden proxies with a separate ring (VoiceOver's cursor would point at a 1 px box).

### D3 — Focus management (AC1, carry-over a)

**R:** one rule for every opener: **open → focus moves to the panel heading; close → focus returns to the trigger.**

| Open path | Focus on open | Trigger (focus target on close) |
|---|---|---|
| pointer click/tap on a slab | panel `<h2>` (`tabIndex -1`, `preventScroll`) | the wrapper (the S7 "focus returns to the viewer" contract) |
| `Enter`/`Space` on a component proxy | panel `<h2>` | that proxy |
| case-study chrome button | case-study heading (unchanged S7) | the opener button if connected, else the wrapper (unchanged) |
| tour click/Enter **in flow** (jump) | **unchanged**: no panel, focus stays put (wrapper or proxy) | n/a |
| tour click/Enter **not in flow** (pause + panel) | panel `<h2>` | as the row above it |

- `useViewerPanels` records the opener for detail opens too, and the close path in `TeardownViewer.onPanelClose` uses it when it is a connected proxy. **Outside-tap rule (S7 Q5) unchanged:** never steal focus from a control the user just pressed.
- **Pointer focus without a ring:** a programmatic focus after a mouse click does not match `:focus-visible` in Chromium/WebKit, so the heading gets no ring and no scroll jump (the S7 objection to moving focus). The heading is `tabIndex -1`, so it is never a Tab stop.
- **Focus is never lost (`usePanelFocus`):** a surface **remounts** when its dock or size changes (S7 R1). Before this fix, focus inside the old surface fell to `<body>`. If focus was inside the panel, the hook re-focuses the new surface's heading. The panel layer is `visibility:hidden` while the geometry moves, so the hook also restores focus when the layer becomes visible again. The probe asserts `activeElement` across an explode toggle and a re-dock scroll with focus inside the panel.
- **Tour jump keeps focus sane:** the jump never moves focus. It is announced (D5). If the jumped-to component's proxy holds focus, the ring follows the highlight.

### D4 — ARIA structure (AC2, carry-over c)

```
main
├─ a.skip-link "Skip to engine controls"   (visible on focus; dev page only)
├─ wrapper  role=group  aria-label="<project> architecture view"  aria-describedby=<keys help>
│  ├─ stage (tabIndex -1)
│  │  └─ canvas viewport
│  │     ├─ <canvas>                       (no AT content)
│  │     ├─ [aria-hidden wrapper] BlueprintOverlay   (S6 bytes unchanged; Q6)
│  │     └─ PartLettering root  aria-hidden="true"  (S7 Tier B, incl. phone parts column)
│  ├─ ComponentNavigator  role=group aria-label="Components"
│  │  └─ ul aria-label="<layer>" › li › button "<component name>"
│  │        aria-describedby → "Item 3.1, <layer> layer, <kind>"
│  │        aria-haspopup="dialog" aria-expanded aria-controls=<detail id when open>
│  ├─ LiveRegion  aria-live=polite aria-atomic=true  (visually hidden, mounted at viewer mount)
│  ├─ TourCaption  (S5, visible; its S5 live region is no longer rendered, D5)
│  └─ PanelLayer › section role=dialog aria-modal=false aria-labelledby=<h2>
│        └─ … TechChips: li = "Kotlin" + visually hidden ", language"
```

- **Lettering:** the `aria-hidden` root covers the face lettering, the plate lettering and the compact parts column. Accessible names come from the navigator (component names) and the layer group labels, so there is **no duplicate accessible text**. Proof: the CDP `Accessibility.getFullAXTree` shows every node under `[data-xploder-lettering-layer]` as ignored, and no AX node text equals a lettering string such as `1.1`.
- **Chips:** `"<label>, <category>"` uses the registry category from `ChipModel.category`. A tech that is missing from the registry has no category; that case is reported in the evidence (none in the fixtures).
- **S6 overlay (Q6, default: hide from AT):** the baseline snapshot shows the S6 callouts, dimension and title block as one flat text run, which duplicates the navigator. A plain `<div aria-hidden="true">` around `<BlueprintOverlay>` in the composition root hides it with **no S6 byte change**. That div is unpositioned, so the overlay's containing block stays the canvas viewport and there is no layout change (the presentation snapshot proves it). The project name stays in the group label. The layer and component counts move into the group description.
- **Rejected:** `aria-modal=true` / a focus trap (S7: the panel is non-modal by design) · naming chips with `aria-label` on `<li>` (VoiceOver ignores names on generic list items more often than it reads visually hidden text).

### D5 — Live region and announcements (AC2)

**R:** one **always-mounted** polite, atomic region, rendered by `TeardownViewer` from the first render, empty at mount. Text comes from the pure `a11y/announce.ts`. `TeardownViewer` stops rendering S5's `TourCaptionLiveRegion`; the S5 file stays byte-identical and unused (no probe reads it, checked).

| Event | Message (default wording, Q5) |
|---|---|
| tour start / each step | the S5 copy, unchanged: `"<flow> · Step n of N. <component>. <summary>[. <flow description on step 1>]"` |
| tour jump (click/Enter in flow) | `"Jumped to " +` the step copy |
| not-in-flow click (pause + panel) | `"Tour paused. "` + the panel-open message |
| detail open / switch | `"<name>, <kind>. <summary>"` (brief "name + role": S7 F1 mapped `role` → `summary`; `kind` covers the other reading) |
| detail close | `"<name> details closed."` |
| case study open / close | `"Case study: <project name>."` / `"Case study closed."` |

- **Step 1 is announced:** the region exists before the tour starts, so the first text change is announced. The DOM test asserts **node identity**: the same element is present at mount, empty, and holds the step-1 text after `play()`.
- **Repeats:** an identical consecutive message is re-announced by clearing the region and setting the text on the next animation frame. This is a frame callback, not a timer, so there is no motion literal.
- **Panel open "assertable in the accessibility tree":** on open, the AX tree has (1) the focused node = heading inside `dialog "<name>"` and (2) the live-region node text = the open message. On close, it has the close message and focus on the trigger. Both are read through CDP after each drill step.

### D6 — Contrast: measurement method and fix policy (AC4)

**Method (two independent measurements, merged into one evidence table):**
1. **Token level, Node (committed test):** `a11y/contrast.ts` declares the **surface inventory**: every text and UI element type × its foreground role × its real background. It covers panel text (ink, label, accent links) on surface; chips (ink on surface; border lineMuted, non-text); caption (label/ink on surface); callout labels (label on the paper label fill); part balloons (ink on surface); dimension (steel on paper); title block; lettering on top faces (ink on `kindFill`, and highlighted: accent on `highlightFill`); the focus ring (accent vs paper/surface/kind fills, 3:1); playground chrome text (ink/label on paper/surface, and on the hover mix `fg/10`). It also covers dimmed states (opacity composited toward paper). The ratios use the S6 `look/fills.ts` helpers (read-only import). The test enforces 4.5:1 for body text and 3:1 for large text and UI, per row, in both palettes.
2. **In the browser (probe):** for DOM text on opaque backgrounds, it reads computed `color` and walks ancestors for the composited background (incl. opacity). For text **over the canvas** (lettering, overlay labels without a fill: the 22/37 axe "incomplete" nodes), it uses **pixel sampling**: screenshot with the text layer `visibility:hidden` to get the true background pixels under each glyph box, then pair them with the text's computed colour (worst pixel and median). axe `color-contrast` results (pass, violation, incomplete) are attached as the third column.

**Fix policy:** token-level offenders are fixed in **`blueprint.ts` values only** (Q7a). That file generates the `--bp-*` CSS variables, and the inline renderers read the same object, so it is the CSS-variable layer's single source. A CSS-only override in `globals.css` would leave every inline-styled xploder surface unfixed. The S2 manifest is then regenerated for that one file, with the exception logged. **No token-level offender is known today** (§1 facts). The two measured offenders are **not** token-level (Q7).

### D7 — axe-core gate in CI for a dev-only route (AC3)

- **Runner, not Vercel:** `/dev/engine` is excluded from previews and production (asserted). The job builds the fixture export **on the CI runner** (`pnpm build:fixtures`, the same pattern as the fps-calibration job), serves `out-fixtures/` with `pnpm serve:out --dir out-fixtures` in the background, and waits for HTTP 200.
- **Tool:** `axe-core@4.14.0` becomes an explicit `tools/perf` dependency. It is already in the lockfile through Lighthouse, so nothing new is downloaded. The probe injects `axe.source` with `page.addScriptTag`, so `@axe-core/playwright` is not needed. Tags: `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` + `best-practice`.
- **Matrix:** {light, dark} × {desktop 1280×800, mobile 390×844 touch} × states {A idle exploded, A detail open (`?select=`), A case study (`?panel=case-study`), A tour step 1 (`?tour=paused&step=0`), A component focused (keyboard), B idle, B detail open, no-WebGL fallback}. The wait condition is `[data-xploder-ready="true"]` + `[data-xploder-panel-ready="true"]` where relevant.
- **Gate:** exit **6** if any violation with impact `serious` or `critical` appears in any cell. `moderate`/`minor` and `incomplete` are reported in the JSON summary and do not fail. Exit codes follow EVIDENCE.md §2. Output: `.evidence/ci/axe-<scheme>-<viewport>.json` + `axe-summary.json`, uploaded as an artifact.
- **CI job:** `a11y: axe (engine fixture export)` in `perf.yml`, on `pull_request` and `push: main`. The same job then runs the keyboard drill + AX checks (`pnpm a11y:probe --ci`), so AC1/AC2 are CI-gated, not only local evidence.
- **Regression proof (AC3):** a deliberately broken commit on the PR (default: remove the panel close button's `aria-label` → `button-name`, critical). The CI run must go red; its run URL and the log excerpt are recorded. Then a revert commit, and the green run URL. A unit test also feeds a recorded axe result with one serious violation to the gate function → exit 6.

### D8 — No-JS / no-WebGL fallback architecture (AC6)

- **No-JS:** `/dev/engine` is statically pre-rendered, so its HTML exists without JS. The page renders `<noscript>` with **`EngineFallback`** (a server component, no hooks), plus a `<noscript><style>` that hides the "Loading engine…" placeholder.
  - **Poster:** an inline SVG of fixture A's exploded stack, drawn from `layoutProject` (public `xploder/layout`) with a fixed isometric projection of the slab boxes. It has `role="img"` and `aria-label "<project> architecture: N layers, M components"`. Strokes and fills use `var(--bp-line)` / `var(--bp-surface)`, so it follows light/dark through the CSS `prefers-color-scheme` fallback without JS and passes the no-colour-literal scanner. No binary asset.
  - **Project list:** `<nav aria-label="Projects">` › `<ul>` › `<a href="?fixture=a">Tidewatch</a>` + tagline, for A/B/C. With JS on, the same links open that fixture.
- **No-WebGL:** before `<Canvas>` mounts, `TeardownViewer` runs a capability probe (`webgl2` → `webgl` context on a detached canvas). If none is available, it renders the `fallback` prop (already in the API) instead of the stage: the playground passes `<EngineFallback message="WebGL is unavailable…" />`, giving the **same list** plus the message. A `CanvasBoundary` error boundary around `<Canvas>` catches context-creation errors at runtime and shows the same fallback, so there is **no blank canvas and no crash**. The live region and wrapper stay mounted.
- **Evidence:** a Playwright context with `javaScriptEnabled:false` (screenshot light + dark, DOM dump, CDP AX tree). The no-WebGL run uses an init script that makes `getContext('webgl'|'webgl2')` return `null`, plus a second run with Chromium `--disable-3d-apis`. Both record a screenshot, the DOM, `pageerror` count = 0 and console errors = 0.
- **Rejected:** a screenshot PNG poster (a binary asset that goes stale with the data) · a fallback on `/` (the viewer is not on `/`; S10 owns routes, and `EngineFallback` is the reusable seed).

### D9 — Reduced-motion coverage matrix (AC5)

**R:** the matrix is **data**, `packages/xploder/test/a11y-motion-matrix.json`, rendered as the evidence table. Each row has: id, slice, source site, trigger, tokens, twin behaviour, browser check.

| # | Animation (site) | Twin under `resolveMotion(true)` |
|---|---|---|
| 1 | explode/implode tween + staggers (S4 `Slabs` `useFrame`) | durations/staggers 0 → one-frame snap |
| 2 | camera turn (S4 `CameraRig` `createTurnTween`) | instant |
| 3 | zoom change (S4 `CameraRig`) | instant |
| 4 | hover lift/settle + dim channels (S5 `Emphasis`) | 0 duration, 0 lift |
| 5 | tour pulse (S5 `Emphasis`) | 0; **tour auto-advance off** (`tourBeat 0`, Step only) |
| 6 | tour caption fade (S5 `TourCaption` WAAPI) | skipped (`duration ≤ 0`) |
| 7 | circuit trace draw (S6 `CircuitTrace` rAF) | static trace |
| 8 | overlay + title-block fade (S6 `BlueprintOverlay` CSS transition) | no transition |
| 9 | panel enter/exit (S7 `PanelLayer` WAAPI) | `panelMotion` → null |
| 10 | lettering + parts column fade (S7 `PartLettering` WAAPI + transition) | none |
| 11 | Tailwind default transition var (`globals.css`) | duration token 0 |
| 12 | S8 focus ring / reveal scroll | none by construction (instant) |

- **Completeness is executable:** a scanner test lists every animation site in `packages/xploder/src/**` and `apps/web/app/**` (`.animate(`, CSS `transition`, `@keyframes`, `requestAnimationFrame`, tween factories in `useFrame`) and **fails if a site is missing from the matrix** (negative control: an unlisted `.animate(` in a temp file → red).
- **"0 animations under emulation":** a `reducedMotion:'reduce'` context drives each row's trigger. It samples `document.getAnimations().length` every animation frame for 1 s after the trigger (must be 0 in every sample), checks that `data-xploder-tweening` never reads `true`, and requires the R3F frame delta ≤ 2 per 3D trigger (the existing S4 `framesIn1s ≤ 2` style). The result is one log row per matrix row.

### D10 — Test and evidence strategy (AC1–AC7)

**Node (vitest):** `a11y-navigator.test.ts` (order, wrap, Home/End, key map: no S4 key consumed) · `a11y-announce.test.ts` (every message row, repeat handling) · `a11y-contrast.test.ts` (the inventory table, both palettes, thresholds; prints the table) · `a11y-reveal.test.ts` · `a11y-motion-matrix.test.ts` (completeness scanner + negative control) · frozen-surface (S2/S4/S5/S6/**S7**) · scanners extended to the S8 files.

**DOM (vitest + jsdom, Q9):** `a11y-live-region.dom.test.tsx`: the real `useTeardownViewer` + `TeardownViewer`. Under jsdom there is no WebGL, so the D8 fallback path renders, while the wrapper and live region still mount. It asserts the region is present and empty at mount, holds the step-1 text after `play()`, and is the **same node** (AC2 "asserted in the DOM test"). `a11y-navigator.dom.test.tsx`: roving tabindex, `Enter` → panel state, `Esc` → focus back on the proxy, with the navigator mounted standalone on a synthetic overlay frame.

**Browser (`pnpm a11y:probe`, new; the S4–S7 `engine:probe` groups must stay all-pass):**
- **Keyboard drill (AC1), fixtures A and B:** a full Tab walk from the page top to the end (no trap: the walk reaches the last control, and `Shift+Tab` walks back to the top in the same sequence) · order check `skip link → … → wrapper → Components → (panel) → playground controls` · for **every** component: ArrowDown to it → `Enter` → dialog named after it + focus on its heading → `Esc` → closed + `activeElement` = that proxy · `Space` variant on one component · pointer-open variant: click → focus on the heading → `Esc` → wrapper · tour: Enter on an in-flow proxy → jump, focus unchanged, and the announcement. Log: `T0xx-log-keyboard-drill-{a,b}.txt` (each step: key, active element role + name, panel state, pass/fail).
- **AX / ARIA (AC2):** `locator.ariaSnapshot()` of the viewer group per state (idle, focused, panel open, case study, tour step 1, jump) + the CDP full AX tree for the lettering-ignored and no-duplicate checks. Files: `T0xx-log-aria-*.txt`.
- **Contrast (AC4):** D6 step 2 → `T0xx-log-contrast-browser.json`.
- **Reduced motion (AC5):** D9 → `T0xx-log-reduced-motion.txt`.
- **Fallbacks (AC6):** D8 → screenshots + `T0xx-log-nojs-dom.txt` / `-nowebgl-dom.txt`.
- **Presentation snapshot (D1):** `T0xx-log-presentation-diff.txt` (must be empty or list only Q7-approved properties).

**AC7 evidence:** the CI run URL with every check green + the new axe job · frozen-surface diff log (S2–S7 empty; the Tier-B diff listed) · `drawCalls = 2` in the idle, panel-open and component-focused states · CLS through the S7 observer over the keyboard drill: **strict total 0** with sources inside the viewer · `fps.json` for the unchanged S5 tour scenario: **0 dropped frames over ≥ 5 s** (dropped-frames style; **no fps threshold anywhere**, Hard Rule 4).

### D11 — Performance and CLS (AC7)

Everything new is DOM: ≤ 13 proxy buttons, one SVG ring, one live region. No meshes, materials or textures, so 2 draw calls holds by construction (asserted anyway). Proxies and the ring are absolutely positioned inside the wrapper, and the live region is visually hidden and absolute, so none of them can create a layout shift. Repositioning happens only at settle/scroll, through the existing fan-out (no per-frame work). The bundle cost is confined to `/dev/engine`; `/` does not change, so the Lighthouse/weight gates on `/` are unaffected by construction and still run.

### D12 — Execution ladder (Hard Rule 6)

Tier 1 = DeepSeek Flash 4.1 via `codex` (browser tasks run with the sandbox off, per the S3 note). If Flash is stuck ×2 on a task → **pause + report usage to Murphy**, then the orchestrator executes personally on Murphy's go (standing S6/S7 reading). Tier 1.5 is dormant (no `OPENROUTER_API_KEY`), skip-with-record. Each task records the tier that finished it.

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories:**
- **P1 — Keyboard visitor explores the parts.** Tab into the drawing, arrow through the parts (each one lights up and gets an outline), press Enter to read about it, press Esc to come back to the same part. Left/Right still turn the model, +/− still zoom. → AC1
- **P1 — Screen-reader visitor hears what happens.** The tour announces its first step, opening a part announces its name and role, chips say what kind of tech they are, and the drawing's lettering is not read twice. → AC2
- **P1 — Reviewer trusts the floor.** Every PR runs axe on the engine page in both themes and both form factors, and a regression turns the check red. → AC3
- **P2 — Low-vision visitor can read everything.** Every text and control meets AA in light and dark, measured. → AC4
- **P2 — Motion-sensitive visitor sees no motion.** With reduced motion on, nothing animates, and every animation has a static twin. → AC5
- **P2 — Visitor without JS or WebGL still learns what is here.** A poster and a list of projects instead of a blank box. → AC6
- **P2 — Nothing else breaks.** Full CI green, frozen surfaces untouched, 2 draw calls, zero CLS. → AC7

**FR mapping rule:** FR-001 ↔ AC1 … FR-007 ↔ AC7, one to one. D1–D12 are supporting requirements under the FR whose AC they serve. **No new acceptance criteria are invented.** Key maps, message wording and matrix rows are documented values, not new ACs.

**plan.md inputs:** D1–D11. Data flow:
- `OverlayProjector` settled/scroll events (existing fan-out) → `ComponentNavigator` (proxy rects, ring polygon) + `PanelLayer`
- proxy `keydown` → `a11y/navigator.ts` → roving focus / `onSlabClick(id)` (the S7 decision path) / bubbling to the S4 keys
- viewer + panel state transitions (`TeardownViewer` layout effects) → `a11y/announce.ts` → `LiveRegion`
- panel surface key/visibility → `usePanelFocus` → heading focus
- `webgl.ts` / `CanvasBoundary` → `fallback` prop → `EngineFallback`

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Task (one integration seam) | Executable check | AC |
|---|---|---|---|
| T1 | S7 seal Tier A: paths + manifest + generator (base `5b22987`) + `frozen S7 surface` test + negative control | `pnpm --filter xploder test frozen-surface` green; a one-byte touch of a Tier-A file → red (log) | AC7 |
| T2 | Presentation-snapshot capture in `tools/perf` + the **base** baseline (built from `5b22987`) committed | baseline JSON committed; a re-run on base gives an empty diff | AC7 |
| T3 | `a11y/navigator.ts` + `a11y/reveal.ts` + tests | `pnpm --filter xploder test a11y-navigator a11y-reveal` green | AC1 |
| T4 | `a11y/announce.ts` + tests | `… test a11y-announce` green (every message row) | AC2 |
| T5 | `a11y/contrast.ts` inventory + table test (both palettes) | `… test a11y-contrast` prints the table; it fails exactly on the known offenders until Q7 is applied (log) | AC4 |
| T6 | Motion matrix JSON + completeness scanner + negative control | `… test a11y-motion-matrix` green; unlisted site → red (log) | AC5 |
| T7 | jsdom DOM env (devDeps) + `LiveRegion` mounted in `TeardownViewer` (S5 region no longer rendered) + DOM test | `… test a11y-live-region.dom` green (same node, step 1) | AC2 |
| T8 | `ComponentNavigator` (proxies, roving, ring, highlight, reveal) in `TeardownViewer` + stage `tabIndex -1` + wrapper pan keys + DOM test | `… test a11y-navigator.dom` green; S4/S5/S7 suites green | AC1 |
| T9 | Focus: `usePanelFocus` + Tier-B edits (`DetailPanel` heading, `PanelLayer`, `useViewerPanels` opener) + close-to-trigger in `TeardownViewer` | DOM test: Enter → heading focus, Esc → proxy; remount keeps focus | AC1 |
| T10 | ARIA: lettering `aria-hidden` (Tier B), chip category text (Tier B), S6 overlay AT-hide (Q6), group description, announcements wired | `pnpm dev` smoke AX snapshot (CDP) + typecheck/lint/test green | AC2 |
| T11 | Contrast fixes per Q7 (+ S2 manifest regen only if a token changes) | `a11y-contrast` green; presentation diff lists only approved properties | AC4 |
| T12 | No-WebGL: `webgl.ts` + `CanvasBoundary` + `fallback`; `EngineFallback` (poster + list) + `<noscript>` + skip link on `/dev/engine` | typecheck/lint/test green; `pnpm dev` smoke screenshots (JS off, WebGL off) | AC6 |
| T13 | `tools/perf` axe gate (`a11y-axe.ts` + CLI + unit tests incl. the recorded-violation → exit 6 case) | `tools/perf` tests green; `pnpm a11y:axe --help` exits 0 | AC3 |
| T14 | `tools/perf` a11y probe (drill A/B, AX, announcements, contrast pixels, reduced motion, fallbacks, presentation diff) + unit tests | `tools/perf` tests green; `pnpm a11y:probe --help` exits 0 | AC1 AC2 AC4 AC5 AC6 |
| T15 | CI job `a11y: axe (engine fixture export)` + drill in CI; regression proof (broken commit → red URL, revert → green URL) | the PR shows the job red on the broken commit and green after the revert | AC3 AC7 |
| T16 | Evidence run: axe JSON ×4 combos, drill logs A/B, ARIA snapshots, contrast table (Node + browser + axe), motion matrix log, fallback screenshots + DOM, S4–S7 `engine:probe` rerun, presentation diff, `fps.json` + draw calls + CLS | all files committed per the naming rule; probes exit 0 | AC1–AC7 |
| T17 | VoiceOver checklist for Murphy + AC1–AC7 self-check table + full CI green on the PR | `evidence/AC-selfcheck.md`; `evidence/voiceover-checklist.md`; all checks green | AC1–AC7 |

**Order:** T1 → T2 → (T3 ∥ T4 ∥ T5 ∥ T6) → T7 → T8 → T9 → T10 → T11 → T12 → (T13 ∥ T14) → T15 → T16 → T17.

**Phase groups (Stage 3 STOP points):**
- **G1 seals + pure core:** T1–T6 → STOP
- **G2 DOM wiring:** T7–T12 → STOP (Murphy keyboard click-through on `pnpm dev` in Orca's browser; contrast fix seen in both palettes)
- **G3 gates:** T13–T15 → STOP (draft PR, CI axe job + regression proof)
- **G4 evidence + ship:** T16–T17 → STOP + AC self-check + VoiceOver checklist

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Chromium blurs a focused element when the panel layer goes `visibility:hidden` during geometry motion, or when the surface remounts | `usePanelFocus` re-focuses the heading on remount/visible; the probe asserts `activeElement` across an explode toggle and a re-dock scroll |
| Roving proxies inside the wrapper eat S4 keys | the navigator handles only Up/Down/Home/End/Enter/Space, everything else bubbles; the unit test asserts that no `keyToAction` key is consumed; S4 probe checks rerun |
| A keyboard highlight fights a mouse hover highlight | both go through `actions.highlight`, last writer wins; blur clears only its own id; probe step: hover elsewhere while a proxy is focused → no stuck highlight after blur |
| VoiceOver reads both the focus move and the live message on open (verbose) | accepted by default; Murphy's VoiceOver pass judges it; Q5 has the trimmed alternative |
| Importing `xploder/layout` in a server component pulls in client code | `layout` is pure TS with no React/three; the fallback lives in the app; build + typecheck prove it at T12 |
| jsdom + React 19 + R3F quirks | jsdom is used only for the fallback/no-WebGL path and the standalone navigator; Canvas is never mounted in jsdom |
| The CI axe job is slow or flaky (fixture build + browser) | one build per job, Playwright cache as in perf.yml, one rerun allowed only for infra exits 3/4 (EVIDENCE.md §6) |
| Flash executor touches sealed files | T1 seals S7 first; every task brief lists the Tier-A/sealed paths and the Tier-B allowed edits; the frozen-surface test runs in every task check |
| An off-canvas slab horizontally at max zoom (the stage scrolls only vertically) | the reveal is vertical, like S5 reachability; the probe logs any proxy whose hull stays clipped after reveal (expected 0 for A/B/C, as in S5 AC7) |

---

## 6. Findings and open questions (each with a recommended default)

**Findings (facts, no decision needed):**
- **F1:** There is no S7 seal. → T1 seals Tier A. Tier B is the exact list of S7 files the brief forces us to touch, guarded by the presentation snapshot (D1).
- **F2:** S5's live region mounts with the tour; there are 0 live nodes at idle (measured). → D5.
- **F3:** Lettering text is exposed to AT and duplicates the S6 callouts (measured). → D4.
- **F4:** No component is keyboard-reachable; at max zoom the stage is an unnamed Tab stop (measured). → D2.
- **F5:** The palette is one JS object feeding both the CSS variables and inline styles; a CSS-only fix cannot reach the xploder renderers. → D6.
- **F6:** Baseline axe is clean (0 violations, 4 combos + 4 states). The real risk is the text over the canvas that axe cannot judge (`incomplete`). → D6 pixel sampling.

**Open questions:**

**Q1 — S7 seal tiers.** Tier A byte-sealed. Tier B = five S7 renderer/hook files receive a11y-only edits (attributes, visually hidden text, focus calls), proved by an empty presentation-snapshot diff. → **Default: accept.**

**Q2 — Keyboard model.** One roving "Components" stop. Up/Down/Home/End cycle in item-number order, Enter/Space = click decision, Left/Right/+/−/0 keep S4 rotate/zoom, Esc as today. → **Default: accept.** Alternatives: one Tab stop per component; Left/Right also cycling.

**Q3 — Tab order.** `skip link → page header → wrapper (viewer: rotate/zoom/pan keys) → Components → open panel → playground controls (… Case study …) → focus/tour controls`. This keeps DOM order = visual order (WCAG 2.4.3). I read the brief's "viewer controls → components → panels → case study" as: the viewer's own controls (the wrapper keys) first, then components, panels, and the case-study control. The playground layout is unchanged; one skip link "Skip to engine controls". → **Default: accept.** Alternative: move the playground control bar above the viewer (a layout change on the dev page; it pushes the viewer down on phones).

**Q4 — Pointer-open focus.** Move focus to the panel heading on **every** open, pointer included. There is no ring for pointer users (`:focus-visible`) and no scroll (`preventScroll`). Close still returns to the viewer, so the S7 contract holds. → **Default: accept.** Alternative ("documented equivalent"): keep focus on the wrapper, rely on the live announcement, and make the panel the next Tab stop.

**Q5 — Announcement wording** (D5 table). "Role" = the component's `summary` (as S7 F1 mapped it), with its `kind` added. Open is announced both by the focus move and by the live region. → **Default: accept**, and Murphy judges verbosity in the VoiceOver pass. Alternative: open announced only by the focus/dialog (live region on close/jump/pause only).

**Q6 — S6 overlay text for AT.** Today it is one flat run (`1 Interface … 4 layers 2 × 2 …`) that duplicates the navigator. → **Default: hide it from AT** with an unpositioned `aria-hidden` wrapper in the composition root (no S6 byte change; the presentation diff proves no visual change); counts go into the group description. Alternative: leave it exposed.

**Q7 — Contrast offenders that are not token-level** (measured, `RFC-log-contrast.txt`):
- **(a) Highlighted lettering number** (`accent` on the accent-washed face): 3.05 / 3.34. A token fix is infeasible in dark (best 4.24), and in light it needs `accent #0A6E87 → #074959` (a brand-level change everywhere). → **Default:** the highlighted part's number uses `ink` (7.93 / 5.17). The highlight is still carried by the face wash, the 3D emphasis and the focus ring. This is a one-role change in S7 lettering (`PartLettering.tsx`, Tier B): a sanctioned a11y fix, but a presentation change, so **Murphy decides and may log it as revision 1 of 2.** Alternative: escalate AC4 as blocked.
- **(b) Layer-focus dimming** (opacity 0.3, S5 token, S6/S7 renderers): dimmed labels at 1.5–2.5:1. → **Default:** measure and report them in the table, and classify them as WCAG 1.4.3's "inactive user interface component" exception. The user has made those layers inactive with layer focus, `Esc` restores full contrast, and the navigator exposes the same names. **This reading is arguable**, which is why it goes to Murphy. Under this default the axe matrix does not include the layer-focus state (axe would flag the dimmed labels). Alternative: raise `dim.level` (an S5-sealed token, weakens the spotlight look) → a revision.

**Q8 — Fallback shape** (D8). SVG poster from layout data + an A/B/C list with `?fixture=` links, on `/dev/engine` (the fixture export); `/` is unchanged. → **Default: accept.** Alternative: a PNG poster.

**Q9 — DOM test env.** Add `jsdom` + `react-dom` as **xploder devDependencies** (test-only, no bundle or runtime impact) for the "DOM test" in AC2 and the navigator/focus tests. → **Default: accept.** Alternative: browser-only proof (the probe), so the AC2 DOM assertion lives in Playwright.

**Q10 — axe gate shape** (D7). The runner-built fixture export, the 4 combos × the state list, serious/critical fail, the drill in the same job, and the regression proof as a broken commit + revert on the PR. → **Default: accept.** Alternative: the proof on a separate throwaway `test/s08-axe-regression` PR.

**Q11 — Wrapper pan keys + stage `tabIndex -1`.** This removes the unnamed focusable scroller at zoom; ArrowUp/Down/PageUp/PageDown/Home/End on the wrapper pan the stage (an a11y affordance for S5 zoom reachability, no camera change). → **Default: accept.** Alternative: keep the stage as a Tab stop and give it `aria-label "Scroll the drawing"`.

**Q12 — Reveal on focus.** Focusing an off-screen component scrolls the stage (instantly) to bring it into view (WCAG 2.4.11, focus not obscured). → **Default: accept.**

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. The keyboard model in D2 + Q2 (one Components stop, Up/Down/Home/End, Enter/Space, Left/Right still rotate) — default: accept; judged hands-on at G2 in Orca's browser.
2. Q4: focus moves into the panel on every open, pointer included (no ring for mouse users) — default: accept.
3. **Q7a:** the highlighted part's lettering number changes from accent to ink, and whether you log it as S8 revision 1 of 2 — default: accept the change; your call on the revision log.
4. **Q7b:** layer-focus dimmed labels treated as the WCAG "inactive component" exception, reported but not fixed — default: accept; this is the one reading I'd most like you to check.
5. Q6: the S6 callout/dimension text is hidden from screen readers in favour of the Components list — default: accept.
6. The phase groups in §4, with G2 as the keyboard click-through gate — default: accept.

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to Q1–Q12, or "defaults" (default: all defaults).
2. The ladder reading in D12: pause + usage report after two Flash failures, then the orchestrator executes personally on your go (default: as in S6/S7).
3. Push permission: push `task/s08-a11y-floor` and open a **draft PR at the start of G3**. The axe job and the regression proof need CI. Nothing is pushed in Stages 1–2 (default: granted at G3).
4. Merge: the orchestrator merges only after you say "merge" (default: as before).
5. The VoiceOver pass at final validation, about 15 min, on `pnpm dev` `/dev/engine` (or the fixture export) with the checklist from T17 (default: Safari + VoiceOver on macOS).
6. Usage pacing: start each Stage 3 group in a fresh 5h window and stop at ≥ 85% (default; please keep stating "5h: N%" in gate messages).

---

## 9. Decisions recorded (Murphy, 2026-11-01, Gate 1)

1. **Q1–Q12: defaults.** Murphy asked the orchestrator to improve on the defaults where it can, and agreed to the improvements in advance. The self-review while writing `plan.md` against the code produced the refinements in §9.6. **None changes an AC or reverses a default answer.**
2. **Ladder (D12):** as in S6/S7. After two Flash failures: pause + usage report, then the orchestrator executes personally on Murphy's go.
3. **Push + draft PR: granted.** It is used at the start of G3 (the axe job and the regression proof need CI). Nothing is pushed before then.
4. **Merge:** only on Murphy's command.
5. **Q7a** is accepted as an a11y fix (widened by R2). Whether it counts as S8 revision 1 of 2 is Murphy's vault entry; it does not block execution.
6. **Refinements (orchestrator self-review, approved in advance):**
   1. **R1 — Stage focus redirect** (replaces the stage line of Q11). With only `tabIndex={-1}`, a mouse click on the canvas would focus the **stage** instead of the wrapper. That breaks the S7 pointer contract, which `panel-probe.ts` asserts (`readFocus().wrapper` after the Esc / close / outside-blank / empty-canvas routes). The stage gets `tabIndex={-1}` **and** `onFocus → wrapper.focus({preventScroll:true})`. Tab can never land on a `-1` element, so the redirect fires only for pointer or programmatic focus and cannot trap. The unnamed Tab stop at max zoom disappears, and the wrapper pan keys (Q11) keep keyboard pan.
   2. **R2 — Q7a widened to the whole highlighted face.** Measured: on a highlighted face, the **name** lettering (`label`) is also an offender, at 4.24 light / 3.01 dark, next to the number (`accent`, 3.05 / 3.34). Rule: on the highlighted part's face, number **and** name use `ink` (7.93 / 5.17). The parts column, plate lettering and the B-style marks are unchanged (accent on paper 5.27 / 9.57; label on the plate fill ≥ 5.36). Pixel sampling (T016) confirms every lettering case. If a further face/shade case fails (the model flags light `module` label on a shaded side face at ≈ 4.47), the same `ink` rule extends to exactly that case, with its measurement.
   3. **R3 — Q7b scoped per node, not per state.** The axe matrix **includes** a layer-focus state. In that state, only `color-contrast` nodes that belong to a dimmed layer go to an **exception ledger**: nodes whose composited opacity is < 1 while `data-xploder-focus` is set, each recorded with its measured ratio and layer. They are listed, not failed. **Every other violation in that state fails the gate as usual**, so the focus state stays gated for all other rules and for every full-opacity text node. The contrast evidence table carries one row per dimmed surface type.
   4. **R4 — Dialog description.** The detail surface gets `aria-describedby` → the meta line (`kind · status`) and the summary paragraph (ids from `DetailPanel`, Tier B). The AX tree's dialog node then carries **name + role + description** on one node: assertable, and spoken by the focus move even if a screen reader drops the live message. The live open message stays (Q5). If the VoiceOver pass finds it verbose, it can be dropped with one flag in `announce.ts` (`ANNOUNCE.detailOpen`).
   5. **R5 — Stable Tab sequence.** Proxies render from the first viewer mount, in item-number order, before the first settled frame. They get rects and the ring once a frame settles, so the Tab sequence never changes after load (no stop appearing late). Before the first settle, Enter still works (it is the click decision by id) and the reveal is a no-op.
   6. **R6 — Regression proof in app code only.** The deliberately broken commit adds `aria-hidden="true"` to the playground's "Engine playground controls" `<section>` (focusable buttons inside → `aria-hidden-focus`, serious). It touches no xploder or Tier-B file, and the next commit reverts it. The unit test (a recorded violation → exit 6) stays.
   7. **R7 — WebGL probe hygiene.** The capability probe runs once per page load (module memo) and releases its test context with `WEBGL_lose_context`, so it never holds a second live GPU context next to R3F's.
   8. **R8 — Pointer + keyboard consequence of Q4, made explicit.** After a pointer open, focus is inside the panel. Arrow keys therefore stay in the panel (S7 key isolation) instead of rotating. `Esc` or a click on the stage returns focus to the wrapper, and rotate works again. The S7 `s7-keys-isolated` check is unaffected.
   9. **R9 — Densest navigator in the axe matrix.** Fixture C (13 components) idle + component-focused is added to the axe states. It is cheap and covers the most proxies.
7. **S7 probe compatibility checked:** the S7 close-route focus expectations (wrapper after Esc / close control / outside blank / empty canvas; the pressed control after an outside control click; opener or wrapper for the case study) are unchanged by Q4 + R1. The `engine:probe` S4–S7 rerun at T016 proves it.
8. **Stage-2 correction C1 (Q9 placement):** `packages/xploder/package.json` is in the **S2 seal**, so the Q9 devDependencies cannot go there. The jsdom DOM tests live in `apps/web/test/xploder-dom/`: `apps/web` already has `react-dom` and consumes `xploder/react` through the package (no deep import), and only `jsdom` is added to `apps/web` devDependencies. Same tests, same assertions, and the S2 seal is untouched.
9. **G2 feedback (Murphy, 2026-11-01, 5h 0%):** all G2 checks good. Lettering change requested: face part names only at zoom ≥ 2× (default and one zoom-in → index only), all-or-nothing across faces (fixes names appearing on only some faces). → T012a (Tier B `PartLettering` + new pure `react/lettering/faceNames.ts`; no seal change). This is a presentation change outside the brief's ACs, made on Murphy's direction; whether it is an S8 revision is Murphy's vault call. Murphy pre-approved G3 once T012a is done. C3 accepted by default.
10. **Final validation (Murphy, 2026-11-02):** G3 clarification: "2× zoom" = two zoom-in clicks → T012b (literal rules kept). G4: keyboard walkthrough as G2, AC self-check accepted, **VoiceOver pass**. Revision logging (R2 ink lettering, T012a/b names rule) is Murphy's call. Merge on Murphy's command: given.
