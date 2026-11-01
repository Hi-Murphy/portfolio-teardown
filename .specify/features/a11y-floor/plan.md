# Implementation Plan: S08 A11y Floor (Keyboard · Screen Reader · Contrast · No-JS)

**Feature dir:** `.specify/features/a11y-floor/` · **Branch:** `task/s08-a11y-floor` · **Date:** 2026-11-01 · **Inputs:** `spec.md`, `rfc.md` (approved; refinements R1–R9 in §9)

## Summary

`packages/xploder` gains an a11y layer as **new modules**:
- **Pure logic in `src/a11y/`:** navigator order + key map, reveal scroll, the announcement model, the contrast inventory.
- **Thin DOM in `src/react/a11y/`:**
  - `ComponentNavigator` (proxies, roving tabindex, hull ring, highlight, reveal);
  - `LiveRegion` (always mounted);
  - `usePanelFocus` (open → heading, remount/visibility restore);
  - `webgl.ts` + `CanvasBoundary` (no-WebGL gate).

`TeardownViewer.tsx` (the composition root, unsealed) wires these in **additively**:
- the navigator after the stage, with the existing overlay fan-out extended;
- the live region from the first render, instead of S5's tour-only region;
- stage `tabIndex -1` + focus redirect (R1) and the wrapper pan keys (Q11);
- the S6 overlay wrapped in an unpositioned `aria-hidden` div (Q6);
- detail opener tracking and close-to-trigger;
- the WebGL gate in front of `<Canvas>`.

Five S7 files get **Tier-B a11y edits** (RFC D1), guarded by a presentation-snapshot diff. Everything else S7 is **sealed by T001** (Tier A, base `5b22987`). S2/S4, S5 and S6 seals stay byte-identical.

The other packages change as follows:
- `apps/web`: the playground gets a skip link, `EngineFallback` (SVG poster + project list) in `<noscript>` and as the viewer `fallback`.
- `tools/perf`: gains `a11y:axe` (gate) and `a11y:probe` (drill, AX, contrast, reduced motion, fallbacks, presentation diff).
- `perf.yml`: gains the `a11y` job.

Rendering stays at **2 draw calls**: everything new is DOM.

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict (`noUncheckedIndexedAccess`), React 19.3, Next 16.4 static export, Node 24 |
| New deps (dev/tooling only) | `apps/web` devDependency `jsdom` (current major, pinned by the lockfile; see the S2 note). `tools/perf` dependency `axe-core@4.14.0` (already in the lockfile via Lighthouse). `packages/xploder/package.json` is untouched. No runtime dependency changes; no bundle impact |
| Tests | vitest (Node) for pure modules; vitest + jsdom per file in `apps/web/test/xploder-dom/` (`// @vitest-environment jsdom`, files `*.dom.test.tsx`) for the live region, navigator and panel focus; `@react-three/test-renderer` unchanged; real browser: `a11y:probe`, `a11y:axe`, `engine:probe` (S4–S7 rerun), `fps:engine`, `evidence` (Playwright 1.64.1) |
| Targets | AC1 drill all-pass A/B; AX checks all-pass; axe 0 serious / 0 critical in every cell (dim ledger per R3); contrast table all-pass both palettes; 0 animations under reduced motion per matrix row; fallbacks with 0 page errors; 2 draw calls; strict CLS 0; 0 dropped frames over ≥ 5 s (tour scenario, band liveness) |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`; the S2/S4, S5, S6 and (from T001) S7 Tier-A surfaces under "Guards"; `tools/perf/src/panel-probe.ts` and `engine-probe.ts` (read-only, diff-guarded) |
| Time base | S5 `now()` (`performance.now()/1000`); announcement repeats use `requestAnimationFrame`, no timers |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-007 quote AC1–AC7 verbatim. The supporting work maps to brief deliverables 1–7 + the Murphy dependency only. No redesign: the R2 contrast fix is the one presentation change, approved at Gate 1. No new interaction beyond a11y affordances. |
| II. Static-only shell | No server code. `EngineFallback` is a server component rendered into the static export. `<noscript>` works on static hosting. |
| III. Performance is a feature | DOM only (≤ 13 proxy buttons, one SVG ring, one live region); no WebGL objects; repositioning only on settle/scroll through the existing fan-out (no per-frame DOM writes); the WebGL probe runs once and releases its context (R7); `/` unchanged. |
| IV. Single motion source | No new animation. The ring and reveal are instant by construction. The announcement repeat uses a frame callback (no duration literal). The motion matrix + scanner prove completeness (AC5). The motion-literal scanner covers every new file. |
| V. Theme integrity | The ring, poster and fallback use palette roles / `--bp-*` variables only. Contrast fixes go only through `blueprint.ts` values (none expected). R2 switches a role reference, not a colour. The no-colour-literal scanner covers every new file. |
| VI. Evidence over assertion | Every a11y claim has a machine artifact (D10), plus Murphy's VoiceOver pass on the T017 checklist. |
| VII. No secrets | Evidence uses `127.0.0.1` and `example.com` only; gitleaks in CI. |

## Project Structure

### Documentation (this feature)

```
.specify/features/a11y-floor/
├── rfc.md · spec.md · plan.md · tasks.md
└── evidence/   RFC-log-*, T0NN-*, AC-selfcheck.md, voiceover-checklist.md
```

### Source code (changes only)

```
packages/xploder/
├── package.json                         UNCHANGED (S2-sealed; see "S2 note" below)
├── src/a11y/                            NEW (pure)
│   ├── navigator.ts   navigatorItems, navigatorKey
│   ├── reveal.ts      revealScrollTop
│   ├── announce.ts    announce, ANNOUNCE flags, AnnounceEvent
│   └── contrast.ts    CONTRAST_SURFACES, contrastTable, compositeOver
├── src/react/a11y/                      NEW (DOM)
│   ├── ComponentNavigator.tsx  (forwardRef handle: update(event), setScroll(offsetY))
│   ├── LiveRegion.tsx
│   ├── usePanelFocus.ts
│   ├── webgl.ts       hasWebgl(doc) memoised
│   └── CanvasBoundary.tsx
├── src/react/TeardownViewer.tsx         EDIT (composition root, additive)
├── src/react/index.ts                   EDIT only if a type export is needed (none planned)
├── src/react/panel/PanelLayer.tsx       TIER B (usePanelFocus call; aria-describedby)
├── src/react/panel/DetailPanel.tsx      TIER B (h2 tabIndex -1; ids on meta/summary)
├── src/react/panel/TechChips.tsx        TIER B (visually hidden ", <category>")
├── src/react/panel/useViewerPanels.ts   TIER B (opener recorded on openDetail; `recordOpener` exposed via metadata)
├── src/react/lettering/PartLettering.tsx TIER B (root aria-hidden; R2 highlighted face → ink)
└── test/
    ├── frozen-surface.s7.{paths,manifest.json} · frozen-surface.generate-s7.sh   NEW
    ├── frozen-surface.test.ts           EDIT (append `frozen S7 surface`)
    ├── a11y-{navigator,reveal,announce,contrast,motion-matrix}.test.ts           NEW
    ├── a11y-motion-matrix.json          NEW
apps/web/
├── package.json                         EDIT (devDependency: jsdom)
├── test/xploder-dom/a11y-{live-region,navigator,panel-focus}.dom.test.tsx   NEW (S2 note)
├── app/dev/engine/engine-fallback.tsx   NEW (server-safe: poster SVG + project list)
├── app/dev/engine/page.fixture.tsx      EDIT (skip link, <noscript> fallback + placeholder hide)
├── app/dev/engine/engine-playground-loader.tsx  EDIT (data attribute on the loading placeholder)
├── app/dev/engine/engine-playground.tsx EDIT (fallback prop, controls section id for the skip link)
└── test/{no-color-literals,no-motion-literals,package-consumer}.test.ts   EDIT (S8 file lists)
tools/perf/
├── package.json                         EDIT (axe-core dep; scripts unchanged)
├── src/a11y-axe.ts · src/cli/a11y-axe.ts          NEW
├── src/a11y-probe.ts · src/cli/a11y-probe.ts      NEW
├── src/presentation-snapshot.ts                   NEW
└── test/{a11y-axe,a11y-probe,presentation-snapshot}.test.ts   NEW (+ test/fixtures/axe-*.json)
package.json                             EDIT (scripts: a11y:axe, a11y:probe)
.github/workflows/perf.yml               EDIT (new `a11y` job)
```

**S2 note (`package.json` is S2-sealed).** `packages/xploder/package.json` is in the S2/S4 manifest, so a devDependency edit would break the S2 seal. **Resolution:** the jsdom DOM tests live in **`apps/web/test/xploder-dom/`**. `apps/web` already depends on `react-dom` and consumes `xploder` via `workspace:*`; only `jsdom` is added to `apps/web` devDependencies. The tests import `xploder/react` through the package (no deep import) and run under `apps/web`'s vitest with `// @vitest-environment jsdom`. `packages/xploder/package.json` stays byte-identical, and `react-dom` is not added anywhere new.

Test paths change accordingly: `apps/web/test/xploder-dom/a11y-{live-region,navigator,panel-focus}.dom.test.tsx`. This is recorded in tasks.md as Stage-2 correction C1.

## Guards (every task)

```sh
git diff --quiet 5b22987 -- .specify/slices .specify/KICKOFF-S08.md && echo FROZEN-OK
git diff --quiet 53b2b2b -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.paths) && echo SURFACE-S2S4-OK
git diff --quiet f31600e -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s5.paths) && echo SURFACE-S5-OK
git diff --quiet 0b2c678 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s6.paths) && echo SURFACE-S6-OK
git diff --quiet 5b22987 -- $(sed 's#^#packages/xploder/#' packages/xploder/test/frozen-surface.s7.paths) && echo SURFACE-S7-OK   # from T001 on
git diff --quiet 5b22987 -- tools/perf/src/engine-probe.ts tools/perf/src/cli/engine-probe.ts && echo PROBES-OK   # panel-probe.ts: C3 chip-label edit only (logged)
test -z "$(git log --oneline 5b22987..HEAD -- .specify/slices .specify/KICKOFF-S08.md)" && echo BRIEF-HISTORY-OK
```

**S7 Tier A** (`frozen-surface.s7.paths`, base `5b22987`; directories expand at generation time):
- sources: `src/panel/` · `src/lettering/` · `src/react/panel/CaseStudyPanel.tsx` · `src/react/panel/executeTourCommand.ts` · `src/react/panel/pickAt.ts` · `src/react/panel/useSlabClick.ts`
- tests: `test/panel-{content,motion,place,state,tour-click}.test.ts` · `test/viewer-panels.test.tsx` · `test/lettering.test.ts` · `test/lettering-column.test.ts`

**S7 Tier B** (edits allowed, a11y only; each listed with its permitted change in "Tier-B edits" below): `PanelLayer.tsx`, `DetailPanel.tsx`, `TechChips.tsx`, `useViewerPanels.ts`, `PartLettering.tsx`. Excluded mount points: `TeardownViewer.tsx`, `react/index.ts`, `test/frozen-surface.*`.

Before every gate, the orchestrator runs all guard lines and expects every OK.

## Navigator (`src/a11y/navigator.ts`, `src/react/a11y/ComponentNavigator.tsx`) — RFC D2, R5

- **Items:** layers in data order, components in data order, `itemNumber = "${layerIndex+1}.${componentIndex+1}"` (the S6/S7 numbering; cross-checked against the S6 parts model in the unit test).
- **Keys:** `ArrowDown` +1, `ArrowUp` −1 (both wrapping), `Home` 0, `End` last → `{type:'move'}`. `Enter`/`' '` → `{type:'activate'}`. Anything else → `null` (bubbles; the unit test enumerates `ArrowLeft, ArrowRight, '+', '-', '0', 'Escape', 'Tab'` → null). For `move`/`activate`, the DOM handler calls `preventDefault` + `stopPropagation`; for `null` it does nothing. `activate` is handled by the button's native `click` (Enter/Space), so `navigatorKey` returning `activate` only prevents the stage scroll for Space.
- **DOM:**
  ```
  <div data-xploder-navigator role="group" aria-label="Components" style="position:absolute; inset:0; pointer-events:none">
    <ul aria-label="<layer name>" style="list-style:none; margin:0; padding:0">
      <li><button data-xploder-proxy="<id>" tabIndex={active?0:-1}
                  aria-haspopup="dialog" aria-expanded={open} aria-controls={open?detailId:undefined}
                  aria-describedby="<id>-desc" style="position:absolute; left/top/width/height = hull bbox; opacity:0; pointer-events:none">
            <name></button><span id="<id>-desc" hidden>Item 3.1, <layer> layer, <kind></span></li>
  ```
  `opacity:0` on the proxy keeps it in the AX tree and in the Tab sequence. The ring is a separate always-visible SVG (`aria-hidden`), drawn only while a proxy matches `:focus-visible` (tracked by `focus`/`blur` + `element.matches(':focus-visible')`) **and** a settled frame exists. The polygon is `frame.components[i].hull` minus `offsetY`, with `stroke = palette[look.callouts.emphasisRole]` (`accent`), width 2, `fill:none`, `vector-effect:non-scaling-stroke`.
- **Rects:** at settle, `bbox(hull)` in canvas px, translated by `-offsetY` on scroll (the same fan-out as `PanelLayer`). Before the first settle, proxies get `left:0; top:0; width:1px; height:1px` (still focusable, R5).
- **Highlight:** on focus → `viewer.actions.highlight(id)`. On blur → `highlight(null)` only if `viewer.highlight === id` and no detail panel is open for `id`.
- **Activate:** the button's `onClick` → `TeardownViewer.onSlabClick(id)` (the existing S7 path: `resolveSlabClick` → tour command + panel event). The opener is recorded as the proxy before the dispatch.
- **Reveal:** on focus, if a settled frame exists, `revealScrollTop(...)` → `stage.scrollTop = value` (instant) + `stage.dispatchEvent(new Event('scroll'))`, as `TeardownViewer` already does for extent changes. Margin = `PANEL_LOOK.insetPx` (a layout constant, not motion).
- **Project switch:** `items` recompute; the active index resets to 0. If focus was inside the navigator, focus moves to the new first proxy in a layout effect.

## Reveal (`src/a11y/reveal.ts`) — RFC D2, Q12

`revealScrollTop({hull, offsetY, canvasHeight, scrollTop, extent, marginPx})`:
- If the hull's content-space `[minY, maxY]` already lies within `[offsetY + margin, offsetY + canvasHeight − margin]`, return `null`.
- Otherwise return `clamp(scrollTop + delta, 0, extent)`, with `delta` the smallest shift that brings `[minY, maxY]` inside (a hull taller than the canvas aligns its top).
- Tests: above, below, inside, taller than the canvas, clamped at 0/extent.

The mapping from scrollTop to `offsetY` is S5's (`offsetFor`, read-only import), so the test also asserts `offsetFor(result) ≈ intended offset`.

## Live region + announcements (`src/a11y/announce.ts`, `src/react/a11y/LiveRegion.tsx`) — RFC D5, R4

- `announce(event, project)` builds the strings of the RFC D5 table. The tour copy is reproduced from S5 `TourCaption` (`${flow.label ?? flow.id} · Step ${step+1} of ${total}`, component name/id, summary, flow description on step 0, joined by `'. '`). The unit test pins the output to literal strings captured from the S5 live region in `RFC-log-baseline.txt` (S5's `captionCopy` is private in a sealed file, so it can't be imported).
- `ANNOUNCE = { detailOpen: true } as const`.
- `LiveRegion` renders `<div data-xploder-live aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN}>{text}</div>` from the **first render**. It is imperative (`ref.say(message)`): the same text as the current → set `''`, then the text in the next `requestAnimationFrame`; otherwise set the text directly.
- `TeardownViewer` derives events from state transitions in layout effects:
  - tour step change (status ≠ idle, `step`/`flowId` changed) → `tourStep`, or `tourJump` when the change came from a click decision of type `jump` (a ref set in `onSlabClick` and consumed by the next step change);
  - panel `closed → detail` → `detailOpen`, or `tourPausedOpen` if the decision paused;
  - `detail → closed` → `detailClose`;
  - case study open/close.
  - `TourCaptionLiveRegion` is no longer rendered; `TourCaption` (visible) is unchanged.

## Focus (`src/react/a11y/usePanelFocus.ts` + Tier B + `TeardownViewer`) — RFC D3, R1, R8

- `usePanelFocus({surfaceRef, surfaceKey, headingRef, visible, kind})`, called by `PanelLayer`:
  - **open:** when the surface key changes from `null` to a key (an open or a switch), focus the heading (`preventScroll`). The case study keeps its own S7 focus code; the hook skips `kind === 'caseStudy'` on open, so it is not focused twice.
  - **remount:** on `surfaceKey` change while a focusin/focusout tracker says "focus was inside", focus the new heading.
  - **visibility:** when `visible` turns true and focus was inside before hiding (or is now on `<body>`), focus the heading.
- **Close → trigger** (`TeardownViewer.onPanelClose` + the `onSlabClick` close branch): `opener` = metadata opener. If it is a connected `[data-xploder-proxy]` or (case study) a connected chrome control, focus it; else apply the existing S7 rule (wrapper, or the outside-tap rule).
- **Stage (R1):** `tabIndex={-1}` + `onFocus={() => wrapperRef.current?.focus({preventScroll:true})}`.
- **Wrapper pan keys (Q11):** the wrapper `onKeyDown` = `(e) => { viewer.onKeyDown(e); if (!e.defaultPrevented && e.target === e.currentTarget) panKey(e) }`. `panKey` maps `ArrowUp/Down` → ±`PAN_STEP_PX`, `PageUp/Down` → ±`canvasHeight × 0.9`, `Home/End` → 0/extent (constants in a new `src/a11y/look.ts`: layout values, not motion), sets `scrollTop` instantly and dispatches `scroll`. `aria-keyshortcuts` becomes `"ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End + - 0"`. `aria-describedby` points to a visually hidden help text.

## ARIA wiring (`TeardownViewer` + Tier B) — RFC D4, Q6, R4

- `<div aria-hidden="true">` (no style) around `<BlueprintOverlay>`; `PartLettering` root `aria-hidden="true"` (Tier B).
- The group description (visually hidden) is `"<N> layers, <M> components. Arrow keys …"`.
- The detail surface `aria-describedby="<detailId>-meta <detailId>-summary"` (ids rendered by `DetailPanel`; the summary id only when present).
- Chips: `<span>{label}</span><span style={VISUALLY_HIDDEN}>, {category}</span>` when `category` is defined.

## Tier-B edits (exact permitted changes; anything else is out of scope)

| File | Permitted change |
|---|---|
| `PanelLayer.tsx` | import + call `usePanelFocus`; a `ref` on the surface/heading; the `aria-describedby` attribute on the surface |
| `DetailPanel.tsx` | `tabIndex={-1}` + `ref` on the `<h2>`; `id`s on the meta `<p>` and the summary `<p>` |
| `TechChips.tsx` | one visually hidden `<span>` per chip (style object as in `DetailPanel`) |
| `useViewerPanels.ts` | `openDetail` records the opener; the metadata gains `recordOpener(element)` for `TeardownViewer` |
| `PartLettering.tsx` | `aria-hidden="true"` on the root; **R2:** `numberColor` and the face-name colour return `palette.ink` when `highlight === id` |

## No-WebGL gate + fallback (`webgl.ts`, `CanvasBoundary.tsx`, `engine-fallback.tsx`) — RFC D8, R7

- `hasWebgl(doc = document)`: the module memo first. Create a canvas, try `getContext('webgl2') ?? getContext('webgl')`, call `getExtension('WEBGL_lose_context')?.loseContext()`, and wrap everything in `try/catch` → boolean. In jsdom it returns false: `getContext` is not implemented, and the jsdom virtual-console noise is silenced in the DOM tests.
- In `TeardownViewer`: `const [webgl] = useState(() => hasWebgl())`, and `data-xploder-webgl` on the wrapper. Unavailable → render `fallback ?? <p>WebGL is unavailable for this architecture view.</p>` **in place of the stage**. The wrapper, live region and panel layer stay mounted (PanelLayer renders nothing without a settled frame). Available → `<CanvasBoundary fallback={…}><Canvas …/></CanvasBoundary>` (a class component with `getDerivedStateFromError`).
- `EngineFallback({ projects, message? })` (no hooks, no client directive):
  - `message` → `<p role="status">`;
  - poster: `<svg role="img" aria-label="<name> architecture: N layers, M components" viewBox=…>`, one `<polygon>` per slab top face + side faces. The projection is a fixed isometric `(x, y, z) → ((x − z)·cos30°, (x + z)·sin30° − y)` over `layoutProject(project).components[i].{center,size}` (exploded). Stroke `var(--bp-line)`, fill `var(--bp-surface)`, side faces `var(--bp-paper)`;
  - `<nav aria-label="Projects"><ul>` with one `<li><a href="?fixture=<id>">{meta.name}</a> — {meta.tagline}</li>` per project.
  The isometric constants live in the fallback file as named geometry constants, not motion.
- `page.fixture.tsx`: a skip link `<a href="#engine-controls" class="sr-only focus:not-sr-only …">Skip to engine controls</a>` before the header, and `<noscript><style>{'[data-engine-loading]{display:none}'}</style><EngineFallback projects={[A,B,C]} /></noscript>` after the loader. The projects are parsed at build time with `parseProject` + the registry from `xploder/fixtures` (dev-only route, as today).

## Contrast (`src/a11y/contrast.ts`) — RFC D6, R2, R3

- `BgRef = RoleRef | 'kindFill:<kind>' | 'highlightFill' | 'layerFill' | {over: BgRef, mix: RoleRef, t}`. `compositeOver(fg, bg, opacity)` resolves dimmed rows toward the actual background (paper). It uses the S6 `look/fills.ts` exports `hexToLinear`, `mixSrgb`, `kindFill`, `highlightFill`, `layerFill` (read-only) and its own WCAG `ratio()` (the S6 `contrastRatio` is private).
- The inventory rows (≈ 40) cover each surface in RFC D6 × state `rest | highlight | dim`. `dim` rows carry `exception: 'inactive-dim'` (R3): they are computed and printed, and excluded from the pass verdict only by that explicit field.
- The test prints the table for both palettes and asserts `pass` for every non-exception row. Before T011 it is expected to fail exactly on the `lettering-face-*-highlight` rows. T005 records that red run as the "before" evidence, with the R2 rows marked `todo` by a `test.fails` wrapper, so CI stays green until T011 flips them.

## Motion matrix (`test/a11y-motion-matrix.json` + `test/a11y-motion-matrix.test.ts`) — RFC D9

- Rows as in the RFC D9 table (12 rows), each with `site` = the repo-relative file path(s) + a symbol.
- The scanner (reusing `apps/web/test/source-scan.ts`'s approach locally: read the files, strip comments) finds sites matching `/\.animate\(/`, `/\btransition\s*:/`, `` /`[^`]*transition [^`]*`/ ``, `/@keyframes/`, `/requestAnimationFrame\(/`, `/create\w*Tween\(/` and `useFrame(` in files that also import a motion token. Each `(file)` must appear in some row's `site`.
- Negative control (inside the test): scan a synthetic in-memory file `src/react/__unlisted__.tsx` containing `el.animate(` → expect a "missing row" hit.

## Tools (`tools/perf`) — RFC D7, D10, R3, R6, R9

- `a11y-axe.ts`:
  - `runAxe(page, {tags})` injects `axe.source` (the `axe-core` package) and calls `axe.run(document, {runOnly:{type:'tag', values:TAGS}, resultTypes:['violations','incomplete']})`.
  - `axeVerdict(results, {dimLedger})` is pure. It returns `{failing: Violation[], ledger: LedgerEntry[], incomplete: …}`: a violation fails when its impact ∈ {serious, critical}; `color-contrast` nodes classified as dimmed (the probe tags them `data-a11y-dimmed` before the scan, from computed opacity < 1 under `[data-xploder-focus]`) go to the ledger.
  - The CLI: `pnpm a11y:axe <url> | --serve <dir> [--out .evidence/axe] [--states all|<list>]`. The exit codes follow EVIDENCE.md (0 / 1 / 2 / 3 / 4 / **6** on failing).
- `a11y-probe.ts`: groups `drill`, `aria`, `announce`, `contrast`, `reduced-motion`, `fallbacks`, `presentation`, `metrics` (draw calls + CLS, reusing the S7 observer approach); the CLI is `pnpm a11y:probe <url> | --serve <dir> [--group …] [--ci] [--out]`. `--ci` runs only `drill`, `aria` and `announce` (fast, the CI subset). Each group writes its log + a JSON verdict; exit 6 on any failed check.
- `presentation-snapshot.ts`: `snapshotPresentation(page, states)` → JSON of `{state, path, tag, rect, styles{…}}` for every node under `[data-xploder-panel-layer]` and `[data-xploder-lettering-layer]` (RFC D1 property list). `diffPresentation(a, b)` is pure. The baseline is produced at T002 from a `5b22987` worktree build.
- The page drivers use the existing playground URL params (`?fixture`, `?state`, `?select`, `?panel`, `?tour`, `?step`, `?focus`) and the `data-engine-control` attributes. No new playground params are needed.

## CI (`.github/workflows/perf.yml`) — RFC D7

```yaml
  a11y:
    name: 'a11y: axe (engine fixture export)'
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps: checkout · pnpm · node (.nvmrc, cache pnpm) · pnpm install --frozen-lockfile
      · cache + install Playwright Chromium (same key as the other jobs)
      · run: pnpm build:fixtures
      · run: pnpm a11y:axe --serve out-fixtures --out .evidence/ci/axe
      · run: pnpm a11y:probe --serve out-fixtures --ci --out .evidence/ci/a11y
      · upload-artifact (if: always()) name a11y path .evidence/ci/
```
It runs on `pull_request` and `push: main` (no Vercel dependency). It does not set `PERF_FIXTURES` outside the build step; the guard in `next.config.ts` still forbids it on Vercel.

## Data flow

- `OverlayProjector` settled/scroll → `onOverlay` / `onOverlayScroll` fan-out → `BlueprintOverlay` · `PartLettering` · `PanelLayer` · **`ComponentNavigator`**
- proxy focus → `actions.highlight` + ring + reveal (`stage.scrollTop`)
- proxy click (Enter/Space/pointer-free) → `onSlabClick(id)` → `resolveSlabClick` → tour command + `panelReducer` (+ opener, + jump/pause ref for the announcement)
- panel state / tour position transitions → `announce()` → `LiveRegion.say()`
- surface key / visibility → `usePanelFocus` → heading focus; close → opener / wrapper
- mount → `hasWebgl()` → Canvas or `fallback`

## Test map

| Suite | Proves | AC |
|---|---|---|
| `a11y-navigator.test.ts` | order = item numbers (A/B/C), wrap, Home/End, bubbling keys | AC1 |
| `a11y-reveal.test.ts` | reveal math + `offsetFor` round trip | AC1 |
| `a11y-announce.test.ts` | every D5 row; S5 copy equality with the baseline strings | AC2 |
| `a11y-contrast.test.ts` | the inventory table, both palettes, thresholds, exceptions explicit | AC4 |
| `a11y-motion-matrix.test.ts` | completeness + negative control | AC5 |
| `apps/web/test/xploder-dom/a11y-live-region.dom.test.tsx` | same node empty at mount → step-1 text after `play()` (no-WebGL path in jsdom) | AC2 |
| `…/a11y-navigator.dom.test.tsx` | roving tabindex, Enter → `detail`, Esc → proxy focused, ArrowLeft not consumed | AC1 |
| `…/a11y-panel-focus.dom.test.tsx` | open → heading; key change → the new heading; close → trigger | AC1 |
| `frozen-surface.test.ts` | S2/S4/S5/S6/**S7** hashes | AC7 |
| scanners (`apps/web/test`) | colour + motion literals over the S8 files (non-vacuity) | AC4 AC5 AC7 |
| `tools/perf/test/a11y-axe.test.ts` | verdict: serious/critical fail, ledger only for dimmed `color-contrast`, exit 6 on the recorded fixture | AC3 |
| `tools/perf/test/a11y-probe.test.ts` · `presentation-snapshot.test.ts` | pure evaluators (Tab-walk trap detection, order match, AX duplicate check, diff) | AC1 AC2 AC7 |

## Phase groups (Stage 3 STOP points)

- **G1 seals + pure core:** T001–T006 → STOP
- **G2 DOM wiring:** T007–T012 → STOP (Murphy keyboard click-through on `pnpm dev`, `http://localhost:3000/dev/engine`, in Orca's browser)
- **G3 gates:** T013–T015 → STOP (draft PR; CI a11y job; regression proof URLs)
- **G4 evidence + ship:** T016–T017 → STOP (AC self-check + VoiceOver checklist; waits for "merge")

## Complexity Tracking

| Choice | Why the simpler alternative was rejected |
|---|---|
| Positioned, transparent proxies + a separate hull ring | Visually hidden proxies leave VoiceOver's cursor and iOS touch exploration pointing at a 1 px box; a CSS outline on a bbox misdraws an isometric diamond. |
| Navigator as a stage **sibling** | Inside the scroll container, the browser's focus scrolling would pan the camera (S5 scroll = view offset) without our control. |
| Stage `tabIndex -1` **plus** a focus redirect (R1) | `-1` alone moves pointer focus to the stage and breaks the S7 wrapper contract asserted by `panel-probe.ts`. |
| jsdom tests in `apps/web` (S2 note) | Adding devDeps to `packages/xploder/package.json` breaks the S2 seal; `apps/web` already has `react-dom` and consumes xploder through the package. |
| S7 Tier A/B + presentation snapshot | A full S7 byte seal is impossible (the brief requires edits in five files); no seal at all would let presentation drift. |
| Pixel sampling for text over the canvas | axe reports these 22/37 nodes as `incomplete`; computed styles cannot see the WebGL background. |
| Per-node dim ledger (R3) instead of excluding the layer-focus state | It keeps that state gated for every other rule and every full-opacity node. |
| Announcement copy pinned to the baseline strings | S5's `captionCopy` is private in a sealed file; exporting it would break the seal. |
