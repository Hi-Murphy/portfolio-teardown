# RFC — S02 Contracts & Tokens

**slice:** S02-contracts-tokens · **status:** REVIEWED 2026-10-29, decisions recorded in §9 (Stage 1 gate) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-02-contracts-tokens.md` (frozen brief v1) · **branch:** `task/s02-contracts-tokens` · **date:** 2026-10-29

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins and the conflict should be raised as an open question.

---

## 1. Context (from the brief)

- **Mission:** define the data contract and design tokens that every later slice consumes: schema v1 (zod), the tech registry, the motion-token module, blueprint palette tokens, and fixture projects that prove the schema is general. **No rendering engine, no site UI, no real project content.**
- **The schema is the lib's product.** `packages/xploder` will be extracted as an OSS lib. The lib accepts plain JSON at runtime and validates it at the boundary. Site data files are TS modules validated at build time.
- **Locked decisions (binding):**
  - zod is the contract. TS types are inferred with `z.infer`.
  - Minimal required fields are only what a renderer cannot default: `schemaVersion`, `meta.slug`, `meta.name`, `layers[].id/name`, `components[].id/name`. Everything else is optional with documented defaults.
  - **No coordinates.** Zero position, geometry or layout fields. Auto-layout (S4) derives everything from layer order and the component list.
  - `schemaVersion: 1` on every project file.
  - Component amendments: `links?: [{label,url}]`, `kind?: module|service|store|external|actor` (default `module`), `status?: shipped|wip|planned` (default `shipped`), `metrics?: [{label,value}]` (same shape as `story.metrics`).
  - Global tech registry. Projects reference techs by stable id only.
  - Motion: one central module is the only source of easings, durations and staggers. Signature: mechanical `ease-out-expo` explode, 4px hover lift, sequential tour pulse, reduced-motion static twin. Seed values are decided here. The contract is frozen in the brief.
  - Theme: blueprint drafting-table system. Light (default) is warm paper-white, ink-blue lines, steel/cyan accents and charcoal mono labels. Dark is light/cyan lines on deep navy. Both are CSS-variable token sets wired to the S1 toggle.
- **Generality target:** the schema must describe a UI-centric app (websocket-inspector, S9), a pipeline harness (jev-toolkit, S13) and a non-code agent system (agent-fleet, S15). S13 and S15 must later land data-only.
- **Non-goals (hard):** 3D, rendering or auto-layout code · tour player · panels or UI components · real project content · OG cards · DNS or Vercel changes · pixel theme.

### Acceptance criteria (verbatim, inviolable)

| ID | Criterion |
|---|---|
| AC1 | `packages/xploder` exports schema, inferred types, `parseProject`, motion tokens; `apps/web` imports ≥1 type and ≥1 token module; `pnpm build` green at workspace root. |
| AC2 | both fixtures parse; `pnpm test` in `packages/xploder` green including ≥2 negative tests (missing required field rejected; unknown tech id rejected). |
| AC3 | geometry-free schema enforced by a test (schema shape contains no position/coordinate/size/layout fields). |
| AC4 | motion-token exclusivity enforced (grep/lint test: zero duration/easing literals in `apps/web` source). |
| AC5 | theme toggle flips blueprint light ⇄ dark palettes on the placeholder page; light is default; no flash on load (S1 behavior preserved). |
| AC6 | CI green on the PR (build + tests + gitleaks). |
| AC7 | **generality smoke:** fixture B (pipeline shape) validates with zero schema changes after fixture A exists — the S13 data-only claim proven early. |

### Starting point (S01, checked on this branch)

| Item | State |
|---|---|
| `packages/xploder` | Source-only TS. `exports`: `.` → `src/index.ts` (`XPLODER_VERSION`, placeholder type), `./motion` → `src/motion/index.ts` (empty `durations`/`easings`/`staggers`). No deps, no tests. |
| `apps/web` | Next 16.4 static export, Tailwind 4.3 CSS-first. `globals.css` has neutral placeholder colours (`--color-bg/fg/muted/accent`), a `.dark` override and a `prefers-color-scheme` fallback. `theme-script.ts` sets `dark`/`light` on `<html>` before paint. `app/motion.ts` re-exports `motion`. |
| CI | `build` job (typecheck, lint, build) + `secrets` job (gitleaks CLI). **No test step.** |
| Root scripts | `build`, `typecheck`, `lint` (+ `format:check`) fan out with `pnpm -r --if-present`. **No `test` script.** |

### Environment facts checked 2026-10-29

| Item | Fact | Source |
|---|---|---|
| zod | 4.6.7 (v4 line). `z.strictObject`, `z.toJSONSchema(schema, { io: 'input' })` and `z.prettifyError` all available. Probed in a scratch dir: strict objects emit `additionalProperties: false`, defaults appear in JSON Schema, `superRefine` doesn't break conversion, and an unknown key prints as `✖ Unrecognized key: "x" → at layers[0].components[0]`. | npm, local probe |
| vitest | 5.0.5. Node `^24.0.0` supported. Needs `vite` 6–8 as a peer (pulled in automatically). | npm |
| gsap | 3.15.0. **Not installed in S02.** Ease strings are plain data until S4 brings GSAP. | npm |
| Node / pnpm | v24.19.0 / 12.15.0 locally, unchanged from S01. | local |

---

## 2. Technical decisions

Each decision gives a recommendation (**R**), the reason, and what was rejected.

### D1 — Schema organisation (`packages/xploder/src/schema/`)

- **R:** split by concept. Each schema file exports its zod schema plus the inferred types.

  ```
  src/schema/
    constants.ts   SCHEMA_VERSION, COMPONENT_KINDS, COMPONENT_STATUSES, TECH_CATEGORIES
                   (plain `as const` arrays, zod-free so client code and the theme module can import them)
    primitives.ts  IdSchema (kebab slug), LabelSchema (trimmed, non-empty), LinkSchema, MetricSchema
    tech.ts        TechSchema, TechRegistrySchema (+ unique-id refinement)
    project.ts     MetaSchema, StorySchema, ComponentSchema, LayerSchema, FlowSchema,
                   ProjectSchema, createProjectSchema(registry?)
  src/parse.ts     parseProject, safeParseProject, defineProject,
                   parseTechRegistry, defineTechRegistry, ProjectValidationError
  ```

- **Shapes (✱ = required, everything else optional, defaults in brackets):**

  | Schema | Fields |
  |---|---|
  | `Project` | ✱`schemaVersion: 1` · ✱`meta` · `story` [`{}`] · ✱`layers: Layer[]` (≥1) · `flows: Flow[]` [`[]`] |
  | `Meta` | ✱`slug: Id` · ✱`name` · `tagline?` · `summary?` · `year?` (int) · `role?` · `tags?: string[]` · `links: Link[]` [`[]`] |
  | `Story` | `headline?` · `problem?` · `approach?` · `outcome?` · `metrics: Metric[]` [`[]`] |
  | `Layer` | ✱`id: Id` · ✱`name` · `description?` · `components: Component[]` [`[]`] |
  | `Component` | ✱`id: Id` · ✱`name` · `summary?` · `description?` · `kind` [`module`] · `status` [`shipped`] · `techs: TechId[]` [`[]`] · `links: Link[]` [`[]`] · `metrics: Metric[]` [`[]`] |
  | `Flow` | `id?: Id` [`flow-<index+1>`] · `label?` · `description?` · ✱`path: ComponentId[]` (≥2) |
  | `Link` | ✱`label` · ✱`url` (`http`/`https` only) |
  | `Metric` | ✱`label` · ✱`value: string` (e.g. `"3×"`, `"120 ms"`; renderers display it as text and never parse it) |
  | `Tech` | ✱`id: Id` · ✱`label` · ✱`category: TechCategory` · `color?: TechColorRef` [`tech-<category>`] |
  | `TechRegistry` | ✱`schemaVersion: 1` · ✱`techs: Tech[]` (unique ids) |

- **Components nest inside layers.** The brief's `Project {schemaVersion, meta, story, layers[], flows[]}` has no top-level `components[]`, and layer membership is exactly what auto-layout needs. Nesting also removes a `component.layer` reference that could dangle. Layer order in the array is the visual order (top → bottom). Component order within a layer is the in-layer order. These are the only "layout" inputs, and both are implicit.
- **Flows are paths, not edges.** A `path` of 2 or more component ids covers a plain edge (`[a, b]`), a pipeline (`[ingest, parse, validate, report]`) and the S5 "sequential tour pulse" (pulse each hop in order) with one shape. `from`/`to` pairs would force pipelines into N−1 flows and lose the sequence.
- **Strict objects everywhere** (`z.strictObject`). Unknown keys are rejected. That catches content typos and makes the geometry ban enforceable at runtime as well as in the schema (D6). Forward compatibility goes through `schemaVersion`, not tolerance for unknown keys.
- **Integrity refinements on `Project`** (one `superRefine`, issues reported at exact paths):
  1. Layer ids are unique. Component ids are unique across the whole project, because flows reference them globally. Flow ids are unique after defaults are applied.
  2. Every `flows[i].path[j]` resolves to an existing component id.
  3. When a registry is supplied, every `components[*].techs[*]` resolves to a registry id (D3).
- **Ids:** `IdSchema` = `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (kebab slug, max 64). Applies to `meta.slug`, layer, component, flow and tech ids. Stable, URL-safe ids are what S14 cross-links and S5 tours key on.
- **Types:** for each schema, export the output type (defaults applied, e.g. `Project`) and the input type (`ProjectInput = z.input<…>`, what authors write). Renderers consume `Project`. Content authors type against `ProjectInput`.
- **Rejected:** top-level `components[]` with a `layer` ref (dangling refs, and it contradicts the brief's shape) · `from`/`to` flows (see above) · `.passthrough()`/loose objects (geometry could be smuggled in, typos go unnoticed) · `zod/mini` (smaller, but the lib's selling point is good error messages and JSON Schema export. Zod stays out of the client bundle anyway, see D2).

### D2 — Public API surface (package `exports`)

- **R:** three subpaths, each with one job.

  | Subpath | Source | Exports | Depends on zod? |
  |---|---|---|---|
  | `xploder` | `src/index.ts` | All schemas from D1 · types `Project`, `ProjectInput`, `Meta`, `Story`, `Layer`, `Component`, `Flow`, `Link`, `Metric`, `Tech`, `TechRegistry`, `TechRegistryInput`, `TechCategory`, `ComponentKind`, `ComponentStatus`, `TechColorRef` · `parseProject`, `safeParseProject`, `defineProject`, `parseTechRegistry`, `defineTechRegistry`, `createProjectSchema`, `ProjectValidationError` · constants `SCHEMA_VERSION`, `TECH_CATEGORIES`, `COMPONENT_KINDS`, `COMPONENT_STATUSES`, `XPLODER_VERSION` | yes |
  | `xploder/motion` | `src/motion/index.ts` | `durations`, `easings`, `staggers`, `distances`, `reducedMotion`, `motion`, `resolveMotion()`, `motionCss()`, type `MotionTokens` | **no** |
  | `xploder/theme` | `src/theme/index.ts` | `blueprint` (`{ light, dark }` palettes), `paletteCss()`, `techColor()`, types `Palette`, `PaletteRole` | **no** (imports only `schema/constants.ts`) |

- `XploderPlaceholder` (the S1 placeholder type) is **removed** now that real types exist. Nothing outside the package imports it today.
- `zod` becomes a **`dependency`** of `xploder` (not a peer). The lib owns its validator version, and pnpm hoists one copy.
- **Bundle hygiene:** `xploder/motion` and `xploder/theme` must never import zod, so a client component can use tokens without pulling a validator into the bundle. A unit test checks that their module graph has no `zod` import (a source grep over the two entry files and their relative imports).
- **Deep imports stay blocked** by `exports`, as set up in S01. The AGENTS.md import convention gains `xploder/theme`.
- **Rejected:** re-exporting motion and theme from `.` (couples the token bundle to zod) · a separate `xploder/schema` subpath (one more path with no user. `.` *is* the schema surface).

### D3 — Runtime parsing, build-time validation, and the registry seam

- **R:**
  ```ts
  parseProject(json: unknown, options?: { registry?: TechRegistry }): Project       // throws ProjectValidationError
  safeParseProject(json: unknown, options?): ZodSafeParseResult<Project>            // never throws
  defineProject(input: ProjectInput, options: { registry: TechRegistry }): Project   // build-time path for site TS modules
  parseTechRegistry(json: unknown): TechRegistry
  defineTechRegistry(input: TechRegistryInput): TechRegistry
  ```
- **Unknown-tech-id rejection needs a registry.** `parseProject(json)` keeps the brief's signature exactly. The registry arrives through an optional second argument. With a registry, unknown ids are rejected: `components[2].techs[0]: Unknown tech id "okhtp". Not in the registry.` Without one, tech ids are only format-checked. That's the right default for an OSS consumer with no registry. `defineProject` (the site path) **requires** the registry, so site content can never skip the check.
- **Errors:** `ProjectValidationError extends Error`. `message` = `z.prettifyError(...)` (human-readable, path per issue). `issues` = the zod issues. `cause` = the original `ZodError`. That satisfies "descriptive zod error" while keeping the zod object reachable.
- **Build-time path:** site data files are TS modules (`export default defineProject({...}, { registry })`). They evaluate during `next build` static generation, so invalid data fails the build with the prettified message. S02 has no real content, so this is proven by unit tests and by a **throwaway build probe** (T9): an invalid data module wired into the page makes `pnpm build` exit non-zero, then it's reverted and not committed.
- **Rejected:** a mandatory registry on `parseProject` (changes the locked signature, hostile to OSS users) · a module-level registry singleton (hidden global state, order-dependent tests) · storing tech labels in project files (breaks the normalisation the brief locks).

### D4 — Tech registry format

- **R:** `{ schemaVersion: 1, techs: Tech[] }`. An array plus a unique-id refinement, not an id-keyed object, because `JSON.parse` silently drops duplicate object keys and the brief requires that duplicates are *detected*.
- **`TECH_CATEGORIES` (closed enum, 8):** `language`, `platform`, `framework`, `library`, `storage`, `network`, `tooling`, `ai`. That covers the Android/web app (S9), a pipeline harness (S13) and an agent system (S15: `ai` for models and agents, `tooling` for orchestration). The enum is closed because every category must have a palette accent in both themes (D8). Adding one later is a deliberate, typed change: the compiler forces a colour.
- **`color?`** is a *token ref*, never a hex: one of `tech-<category>` or `accent`. The default is the tech's own category token. Hex values live only in the palette (D8), so themes can recolour everything.
- **Seed fixture** (`packages/xploder/test/fixtures/tech-registry.json`, 12 entries, real techs, fictional usage):

  | id | label | category |
  |---|---|---|
  | `kotlin` | Kotlin | language |
  | `typescript` | TypeScript | language |
  | `android` | Android | platform |
  | `nodejs` | Node.js | platform |
  | `jetpack-compose` | Jetpack Compose | framework |
  | `coroutines` | Kotlin Coroutines | library |
  | `kotlinx-serialization` | kotlinx.serialization | library |
  | `hilt` | Hilt | library |
  | `okhttp` | OkHttp | network |
  | `websocket` | WebSocket | network |
  | `room` | Room | storage |
  | `gradle` | Gradle | tooling |

  `nodejs` and `typescript` exist so fixture B (a non-Android pipeline) also resolves registry ids. **The seed stays a test fixture in S02.** S9 promotes it to the site's real registry (`apps/web/content/`) along with real content.

### D5 — Fixture layout (AC2, AC7)

- **R:** fixtures are **`.json` files**, loaded with `JSON.parse(readFileSync(...))` in tests. That proves the "plain JSON at runtime" path end to end. A TS-module round trip through `defineProject` is covered separately in unit tests.

  ```
  packages/xploder/test/fixtures/
    tech-registry.json
    project-a-ui-app.json      fixture A
    project-b-pipeline.json    fixture B
  ```

- **Fixture A, "Tidewatch"** (fictional Android tide-chart app, UI-centric): 4 layers (`ui` → `state` → `data` → `platform`) · 8 components (Compose screens, a view-model, a repository, an OkHttp/WebSocket client, a Room cache, an `actor` user, an `external` tide feed) · 2 flows (live update path, offline read path) · uses ≥6 registry ids · exercises every amendment (`links`, `kind`, `status` incl. a `wip` and a `planned`, `metrics`) · `story.metrics` present. Satisfies "≥3 layers, ≥6 components, ≥1 flow, uses registry ids".
- **Fixture B, "Ledgerline"** (fictional CSV reconciliation pipeline harness, **non-UI**): layers are linear stages `ingest` → `normalize` → `validate` → `report`. Each layer holds 1–2 components (`external` file drop, `service` stages, `store` for output, `actor` operator). One flow whose `path` walks the stages in order. Uses `typescript`, `nodejs` from the registry. No Compose, no screens.
- **Sanitisation:** fictional names only. Links use `https://example.com/...` (reserved by RFC 2606). No hostnames, IPs, ports, paths or anything infra-flavoured. gitleaks covers fixtures as usual.
- **Rejected:** TS fixtures (they wouldn't prove the JSON path) · a fixture C for the agent-system shape (not in the deliverables. Offered as open question 14).

### D6 — AC3: geometry-free schema test

- **R:** `test/geometry-free.test.ts` walks `z.toJSONSchema(ProjectSchema, { io: 'input' })` recursively (`properties`, `items`, `anyOf`/`oneOf`/`allOf`, `$defs`) and asserts:
  1. **No banned property name.** Exact names (case-insensitive): `x`, `y`, `z`, `w`, `h`, `top`, `left`, `right`, `bottom`, `row`, `col`, `column`, `span`, `order`, `index`, `zindex`, `depth`. Substrings (case-insensitive): `pos`, `coord`, `geom`, `layout`, `width`, `height`, `size`, `offset`, `rotat`, `scale`, `transform`, `anchor`, `align`, `grid`, `bounds`, `rect`, `margin`, `padding`.
  2. **Every object node has `additionalProperties: false`.** Otherwise geometry could be smuggled in through an open object, and the name check would be vacuous.
  3. **No `z.record`/`z.any`/`z.unknown`** anywhere (no `additionalProperties` schema, no untyped node).
- **Negative controls in the same file** keep it honest. (a) The walker flags a deliberately bad schema (`{ position: { x, y } }`), and an open object fails rule 2. (b) Runtime check: fixture A plus `"x": 12` on a component is **rejected** by `parseProject` (strict objects).
- **Why JSON Schema:** it's zod's public, stable introspection format. Walking `_zod.def` internals would break on zod upgrades.

### D7 — AC7: generality proof (fixture B, zero schema changes)

- **R:** two mechanisms.
  1. **Schema fingerprint snapshot.** `test/generality.test.ts` snapshots `z.toJSONSchema(ProjectSchema)` (vitest `toMatchSnapshot`). The snapshot is created in the fixture-A task (T5). The fixture-B task (T6) **must not** update it. Vitest fails on any schema drift unless `-u` is passed, and a `-u` shows up in the diff.
  2. **Git proof.** T6's evidence includes `git diff --stat <T5-merge>..<T6-merge> -- packages/xploder/src packages/xploder/test/__snapshots__`, which must be **empty**. T6 may touch only `test/fixtures/project-b-pipeline.json` and test files.
- The T6 test also asserts that fixture B *is* pipeline-shaped (no component named or kinded as UI; flow path visits every layer in order). AC7 can't be met by a disguised copy of fixture A.
- **Escalation rule:** if fixture B can't be expressed without a schema change, that's a **blocked AC7**. STOP and escalate with the failing parse output. Never patch the schema inside T6.

### D8 — Blueprint palette (`xploder/theme`) and CSS wiring (AC5)

- **R (source of truth):** palettes are typed TS in `packages/xploder/src/theme/blueprint.ts` (hex strings). `paletteCss()` turns them into CSS custom properties. Reasons: the S4 renderer needs raw values for three.js materials without DOM reads · contrast is unit-testable · `Record<TechCategory, string>` makes the compiler enforce a colour for every registry category, which is what "accent colours sourced from registry categories" means in practice.
- **Roles and values** (WCAG contrast vs `paper`, computed 2026-10-29):

  | Role (`--bp-*`) | Use | Light (default) | CR | Dark (navy) | CR |
  |---|---|---|---|---|---|
  | `paper` | page background | `#F6F3EA` warm paper | — | `#0B1A2E` deep navy | — |
  | `surface` | raised sheet | `#FCFAF4` | 1.06 | `#112540` | 1.13 |
  | `grid` | faint drafting grid (decorative) | `#D9E1EA` | 1.19 | `#1B3354` | 1.37 |
  | `line` | primary ink lines | `#1E4D8C` ink-blue | 7.58 | `#8CC4EE` light blue | 9.36 |
  | `line-muted` | secondary lines | `#6F89AE` | 3.23 | `#4E78A3` | 3.78 |
  | `ink` | body text | `#22262B` charcoal | 13.71 | `#E6EDF5` | 14.81 |
  | `label` | mono labels, muted text | `#4A5059` charcoal | 7.33 | `#A7B8CB` | 8.62 |
  | `accent` | focus, links, highlights | `#0A6E87` cyan | 5.27 | `#4FD0E6` cyan | 9.57 |
  | `steel` | neutral accent | `#56677A` | 5.23 | `#8FA3B8` | 6.74 |

  | Tech category (`--bp-tech-*`) | Light | CR | Dark | CR |
  |---|---|---|---|---|
  | `language` | `#1F5FAD` | 5.74 | `#7FB2F0` | 7.93 |
  | `platform` | `#4A5D73` | 6.10 | `#A3B5C9` | 8.33 |
  | `framework` | `#7A3E9D` | 6.30 | `#C9A2E8` | 8.17 |
  | `library` | `#0F766E` | 4.93 | `#5FD3C2` | 9.64 |
  | `storage` | `#97560F` | 5.18 | `#E8B36A` | 9.23 |
  | `network` | `#0A6E87` (= accent: wires are the accent colour) | 5.27 | `#5ED3EE` | 10.01 |
  | `tooling` | `#5A691C` | 5.45 | `#C2CF7A` | 10.40 |
  | `ai` | `#B0336A` | 5.37 | `#F08BB4` | 7.54 |

  Every text-capable colour clears **4.5:1 (AA)** on both `paper` and `surface`. `line-muted` clears 3:1 (non-text UI). `grid` and `surface` are decorative by design.
- **CSS wiring (no change to the S1 no-flash mechanism):**
  - `app/layout.tsx` renders `<style dangerouslySetInnerHTML={{ __html: paletteCss() + motionCss() }} />` in `<head>`, right after the theme script. It's generated at build time (static export) and inline, so there's no extra request and no flash. `paletteCss()` emits three blocks that mirror S1 exactly: `:root{light}`, `.dark{dark}` and `@media (prefers-color-scheme: dark){html:not(.light){dark; color-scheme:dark}}`.
  - `globals.css` maps Tailwind semantic tokens onto them with `@theme inline { --color-bg: var(--bp-paper); --color-fg: var(--bp-ink); --color-muted: var(--bp-label); --color-accent: var(--bp-accent); --color-line: var(--bp-line); … --color-tech-<category>: var(--bp-tech-<category>) }`. Existing classes (`bg-bg`, `text-fg`, `text-muted`, `outline-accent`) keep working. The hard-coded S1 hexes and the duplicated dark block are deleted.
  - Mono labels use the system mono stack (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`). No webfonts, same as S01.
- **Placeholder page (AC5 visibility):** the S1 page gains (a) a blueprint grid background (CSS gradients on `--bp-grid`, decorative, `aria-hidden`) and (b) a small "palette" strip: role swatches plus 8 tech-category chips labelled in mono. That way the light ⇄ dark flip is visible in screenshots, not just in a background colour. This is token preview markup, not an S7 UI component, and it goes when real UI lands.
- **Rejected:** hand-written CSS as the source (renderer can't read it without the DOM, contrast untestable, categories can drift) · a generated `.css` file written by a prebuild script (extra moving part. An inline `<style>` does the same with zero tooling) · `@theme` with literal hexes (two sources of truth).

### D9 — Motion tokens (`xploder/motion`): seed values

- **Shape:** units are **seconds** for time (GSAP-native. `motionCss()` converts to `ms`) and **px** for distance. Each easing carries both forms, because S4 uses GSAP while CSS hover/panel transitions need `cubic-bezier`:
  ```ts
  easings.explode = { gsap: 'expo.out', css: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  ```
- **Seed values:**

  | Token | Value | Rationale |
  |---|---|---|
  | `durations.explode` | **0.9 s** | With `expo.out`, about 87% of travel is done by 30% of the time (≈ 270 ms). It reads as a mechanical snap with a long, precise settle. Under 1 s keeps it below the "waiting" threshold. |
  | `easings.explode` | **`expo.out`** · `cubic-bezier(0.16, 1, 0.3, 1)` | Locked by the brief ("mechanical ease-out-expo explode"). |
  | `staggers.explodeLayer` | **0.06 s** | 5 layers → 0.24 s cascade. Total explode ≈ 1.15 s worst case. Layer order reads top-to-bottom. |
  | `staggers.explodeComponent` | **0.02 s** | Within a layer. 8 components add 0.14 s, a ripple rather than a queue. |
  | `durations.implode` | **0.6 s** | Re-assembly is a "return" and should be quicker than the reveal. |
  | `easings.implode` | **`power3.inOut`** · `cubic-bezier(0.76, 0, 0.24, 1)` | Parts accelerate together and seat firmly. A pure ease-in would "slam". |
  | `staggers.implodeLayer` | **0.04 s** (reverse layer order) | Tighter than explode, so the collapse feels decisive. |
  | `distances.hoverLift` | **4 px** | Locked by the brief. |
  | `durations.hoverLift` / `hoverSettle` | **0.18 s / 0.24 s** | Fast lift for responsiveness. A slower settle avoids flicker when the cursor skims across parts. |
  | `easings.hover` | **`power3.out`** · `cubic-bezier(0.25, 1, 0.5, 1)` | Quick start, soft stop. Same family as explode without its long tail. |
  | `durations.tourPulse` | **0.5 s** | One in-out pulse per hop. Visible on a phone without feeling sluggish. |
  | `easings.tourPulse` | **`sine.inOut`** · `cubic-bezier(0.37, 0, 0.63, 1)` | Symmetric "breath" for the pulse. |
  | `staggers.tourStep` | **0.15 s** | Gap between consecutive hops of a flow `path`. This *is* the "sequential tour pulse": a travelling signal along the path. |
  | `durations.tourBeat` | **1.6 s** | Dwell per tour step before auto-advance, enough to read one label. S5 may tune it. |
  | `durations.panelEnter` / `panelExit` | **0.32 s / 0.2 s** | Exits faster than entries (standard UI asymmetry). |
  | `easings.panelEnter` / `panelExit` | `expo.out` · `cubic-bezier(0.16, 1, 0.3, 1)` / `power2.in` · `cubic-bezier(0.32, 0, 0.67, 0)` | Enter matches the explode family. Exit gets out of the way. |
  | `distances.panelOffset` | **16 px** | Slide-in offset for panels. |

- **Reduced-motion policy flag:** `reducedMotion = { policy: 'static-twin', query: '(prefers-reduced-motion: reduce)' } as const`. `resolveMotion(prefersReduced)` returns the same token shape with every duration, stagger and distance set to **0** (easings unchanged). The renderer then shows the final exploded state directly ("static twin") and tour steps change state without movement. `motionCss()` emits `--motion-*` variables plus a `@media (prefers-reduced-motion: reduce)` block that zeroes them. CSS consumers get the policy for free.
- **Tailwind binding:** `globals.css` `@theme inline` sets `--default-transition-duration: var(--motion-duration-hover-lift)` and `--default-transition-timing-function: var(--motion-ease-hover)`. It resets `--ease-*: initial` and `--animate-*: initial`, then re-adds only token-backed `ease-explode`, `ease-hover`, etc. Bare `transition-colors` is then token-driven, and Tailwind's built-in literal eases and animations can't be used.
- **Performance note for S4:** tokens assume transform/opacity-only animation (compositor-friendly on mid-range Android). That's documented in the module's JSDoc, not enforced here.
- **Documented rule (Deliverable 4):** the module JSDoc and AGENTS.md §5 say *"No animation number literal may exist outside this module."* AC4 enforces it (D10).

### D10 — AC4: motion-literal scanner

- **R:** a vitest test in **`apps/web/test/no-motion-literals.test.ts`** (adds `vitest` + `test` script to `apps/web`). It scans every `*.{ts,tsx,js,mjs,css}` under `apps/web` (excluding `node_modules`, `.next`, `out`, `next-env.d.ts`, and the test file's own fixture strings) and fails with `file:line: rule — snippet` on any of:

  | Rule | Pattern (sketch) | Catches |
  |---|---|---|
  | `css-time` | inside `transition*`/`animation*` declarations: `\d*\.?\d+m?s\b` | `transition: color 200ms` |
  | `css-easing` | `cubic-bezier(` · `steps(` · `\bease(-in|-out|-in-out)?\b` / `\blinear\b` in transition/animation declarations | literal CSS easings |
  | `gsap-ease` | `\b(power[0-4]|expo|sine|circ|back|elastic|bounce|quad|cubic|quart|quint|strong)\.(in|out|inOut)\b` | `ease: 'power2.out'` |
  | `motion-key` | object key `duration|delay|ease|easing|stagger|repeatDelay|transition|animation|animationDuration|transitionDuration` with a numeric or string literal value | `{ duration: 0.3 }`, `style={{ transitionDuration: '1s' }}` |
  | `tw-utility` | `\b(duration|delay)-(\d+|\[)` · `\bease-(in|out|in-out|linear|\[)` · `\banimate-(spin|ping|pulse|bounce|\[)` | Tailwind literal timing utilities |
  | `timer` | `set(Timeout|Interval)\([^,]+,\s*\d` | animation timing via timers |

- **Negative controls (same file):** each rule must flag a known-bad snippet and must pass known-good ones (`motion.durations.explode`, `var(--motion-duration-explode)`, `ease-explode`, JSX copy like `"the 1990s"`, a metric value `"120 ms"` under key `value`). That proves the scanner isn't vacuous and that content strings aren't false positives.
- **Scope extension (not a new AC):** the same scanner also runs over `packages/xploder/src/**` **excluding `src/motion/`**, as an xploder test. AGENTS.md binds library code too. Default: on (open question 11).
- **Rejected:** an ESLint `no-restricted-syntax` rule alone (can't see CSS or Tailwind class strings) · a shell `grep` in CI (no negative controls, harder to read failures).

### D11 — Test tooling and CI (AC2, AC6)

- **R:** **vitest 5** in `packages/xploder` and `apps/web` (`"test": "vitest run"`). Node environment, no DOM. Root `package.json` adds `"test": "pnpm -r --if-present test"`. `packages/xploder/tsconfig.json` includes `test` so fixtures and tests are typechecked.
- **xploder test files:** `schema.test.ts` (required fields, defaults, integrity refinements, unknown keys) · `registry.test.ts` · `parse.test.ts` (`parseProject`/`safeParseProject`/`defineProject`, error message shape) · `geometry-free.test.ts` (AC3) · `fixtures.test.ts` (AC2 fixture A) · `generality.test.ts` (AC7 + fingerprint) · `motion.test.ts` (shape, `resolveMotion`, `motionCss`, units) · `theme.test.ts` (category completeness, AA contrast in both themes, `paletteCss` blocks, zod-free import graph) · `no-motion-literals.test.ts` (D10 extension).
- **Minimum negative tests for AC2:** (1) missing `meta.name` rejected · (2) `layers[0].components[0].techs` contains an id not in the registry → rejected · plus missing `schemaVersion`, wrong `schemaVersion` (`2`), duplicate component id, flow path to unknown component, unknown key, duplicate tech id in registry, invalid category. That's well over the "≥2" floor.
- **CI:** the `build` job gains `pnpm test` after `lint`, before `build`. The gitleaks job is unchanged. AC6 = green run on the S02 PR.
- **AC5 check:** Playwright script against the served `out/`, reusing S01's T005 checks (a)–(f) unchanged (no-flash regression), plus (g) light default: computed `body` background = `rgb(246, 243, 234)` (`#F6F3EA`) · (h) after toggle: `rgb(11, 26, 46)` (`#0B1A2E`) and a tech chip's colour flips · (i) dark OS with JS disabled: navy via the CSS fallback. Screenshots of light, dark, dark-no-JS and dark-no-hydration. One Lighthouse mobile run as a **sanity check** (not an AC in S02; constitution §III baseline).
- **Rejected:** `node:test` (no snapshots, weaker DX for budget executors) · Jest (ESM friction) · a Playwright test runner in CI (S03 owns the perf/visual harness).

---

## 3. Design brief for the spec kit (input to Stage 2)

**User stories (P1–P3 as the kickoff prescribes):**
- **P1 — Site consumer.** As the portfolio site (`apps/web`), I import project types and token modules from `xploder`. I validate data files at build time so invalid content fails the build. The page renders the blueprint palette in light (default) and dark with no flash, and contains no motion literals. → AC1, AC4, AC5, AC6
- **P2 — Lib consumer.** As a future OSS user of `xploder`, I hand `parseProject` plain JSON and get back a typed `Project` with defaults applied, or a descriptive error. The schema is geometry-free and expresses UI apps and pipelines alike. → AC2, AC3, AC7
- **P3 — Murphy as content author.** As Murphy writing a project file, I fill in only `schemaVersion`, `meta.slug`, `meta.name`, layers and components. I reference techs by registry id and get precise error paths for typos, unknown techs, dangling flow refs and stray geometry. → AC2 (negative tests), AC3, AC7

**FR mapping rule:** FR-001 ↔ AC1 … FR-007 ↔ AC7, one-to-one. Deliverables 3 (registry) and 5 (palette) are supporting requirements under FR-001/FR-002 and FR-005. **No new acceptance criteria are invented.**

**plan.md inputs:** D1–D11. Module tree from D1/D2. Data flow:
`JSON | TS module` → `parseProject`/`defineProject` (+ registry) → zod strict schema → integrity `superRefine` → `Project` (defaults applied) → *(S4 renderer)*.
`blueprint.ts` + `motion/index.ts` → `paletteCss()` + `motionCss()` → inline `<style>` in `layout.tsx` → `--bp-*` / `--motion-*` → Tailwind `@theme inline` → utilities. The theme script toggles `.dark`/`.light` on `<html>` as in S1.

---

## 4. Implementation checklist (becomes `tasks.md` in Stage 2)

| # | Seam | Executable check | AC |
|---|---|---|---|
| T1 | Test harness: vitest in `xploder`, root `test` script, xploder tsconfig includes `test/`, zod dependency added | `pnpm install && pnpm test` exits 0 with one smoke test | AC2 (part) |
| T2 | `schema/constants.ts`, `primitives.ts`, `tech.ts` + `parseTechRegistry`/`defineTechRegistry` + seed `tech-registry.json` | `pnpm --filter xploder test registry` green: seed parses, duplicate id rejected, bad category rejected, `color` defaults to `tech-<category>` | AC2 (part) |
| T3 | `schema/project.ts` + `parse.ts` + `index.ts` exports | `pnpm --filter xploder test schema parse` green: missing `meta.name` rejected, unknown tech id rejected, defaults applied, dangling flow ref / duplicate id / unknown key rejected; `pnpm typecheck` | AC1 (part), AC2 |
| T4 | Geometry-free test (D6) | `pnpm --filter xploder test geometry` green, including negative controls | AC3 |
| T5 | Fixture A + `fixtures.test.ts` + schema fingerprint snapshot | `pnpm --filter xploder test fixtures generality` green; snapshot file committed | AC2, AC7 (setup) |
| T6 | Fixture B (**fixtures/tests only**) | `pnpm --filter xploder test generality` green; `git diff --stat <T5>..<T6> -- packages/xploder/src packages/xploder/test/__snapshots__` is empty | AC7, AC2 |
| T7 | `xploder/motion` seed tokens, `resolveMotion`, `motionCss` | `pnpm --filter xploder test motion` green (values match RFC table, reduced → all zero, CSS emits ms + reduced-motion block) | AC1 (part) |
| T8 | `xploder/theme`: `blueprint` palettes, `paletteCss`, `techColor`, new `./theme` export | `pnpm --filter xploder test theme` green (all 8 categories × 2 themes, AA contrast, 3 CSS blocks, no zod in import graph) | AC5 (part) |
| T9 | Web wiring: inline token `<style>`, `@theme inline` mapping, grid background + palette strip, `import type` from `xploder`, Tailwind default transition bound to tokens | `pnpm typecheck && pnpm build` green; `grep` in `out/index.html` finds `--bp-paper:#F6F3EA` and `--motion-duration-explode:900ms`; throwaway invalid-data probe makes `pnpm build` fail (log kept, probe reverted) | AC1 |
| T10 | AC4 scanner in `apps/web` (+ xploder extension) | `pnpm test` green; negative controls pass; planting `transition: color 200ms` in `globals.css` makes it fail (log kept, reverted) | AC4 |
| T11 | Theme flip check (Playwright (a)–(i)) + screenshots + 1 Lighthouse sanity run | script prints all PASS; screenshots in `evidence/` | AC5 |
| T12 | CI `pnpm test` step; AGENTS.md (`xploder/theme`, test command, literal rule), README commands; local gitleaks; draft PR | PR checks green: build (typecheck, lint, test, build) + secrets | AC6 |
| T13 | AC1–AC7 self-check table | `evidence/AC-selfcheck.md` links every AC to evidence | all |

**Order and parallelism:** T1 → T2 → T3 → (T4 ∥ T5) → T6 · T7 ∥ T8 (both only need T1) → T9 → T10 → T11 → T12 → T13.

**Phase groups (Stage 3 STOP points):** **G1 contract** T1–T6 → STOP · **G2 tokens & site** T7–T11 → STOP · **G3 ship** T12–T13 → STOP + AC self-check table.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Fixture B needs a schema change | AC7 blocked | D7 escalation rule. Flows-as-paths and nested layers were chosen with the pipeline shape in mind. Fixture B is drafted mentally against D1 already (stages = layers, one path flow). |
| Executor "fixes" T6 by touching the schema or running `vitest -u` | AC7 silently invalid | T6 file allow-list plus empty-diff check on `src/` and `__snapshots__/` in its evidence |
| AC4 scanner false positives on future content (S9 copy like "1990s", metric `"120 ms"`) | noisy CI, pressure to weaken | rules are context-bound (declarations, keys, utilities), not bare `\d+ms`. Known-good controls lock that in. |
| Zod pulled into client JS via a token import | perf regression on target device | D2: motion/theme are zod-free, with a test. Tokens are consumed from server components in S02. |
| Inline `<style>` order vs S1 no-flash | flash regression | S1 checks (a)–(f) re-run unchanged in T11. Variables are in `<head>` before body paint. |
| Tailwind `@theme inline` + namespace reset behaves differently in 4.3 | build or utility drift | T9 asserts generated utilities resolve to `var(--bp-*)` in built CSS. Fallback: plain `@theme` with `var()` values. |
| `noUncheckedIndexedAccess` friction in tests | executor churn | task text tells executors to guard indexed access in tests (optional chaining or an explicit `expect(x).toBeDefined()` before use) |
| zod 4.x minor changes JSON Schema output | fingerprint snapshot churn on upgrade | lockfile pins it. Upgrades re-snapshot deliberately, never during T6. |

---

## 6. Open questions (each with recommended default)

1. **Components nested inside layers** (vs a top-level `components[]` with a `layer` ref)? → **Default: nested** (D1). It matches the brief's `Project` shape and can't dangle.
2. **Flow shape: `path: ComponentId[]` (≥2)** vs `from`/`to` edges? → **Default: `path`** (D1). One shape covers edges, pipelines and the sequential tour pulse.
3. **Strict objects (unknown keys rejected)?** → **Default: yes.** Typos and smuggled geometry fail loudly. Evolution goes through `schemaVersion`.
4. **Registry seam: `parseProject(json, { registry? })`**, with `defineProject` requiring a registry? → **Default: yes** (D3). The brief's signature is unchanged and the site path can't skip the tech check.
5. **`parseProject` throws `ProjectValidationError`** (prettified message, `cause` = `ZodError`), plus a non-throwing `safeParseProject`? → **Default: yes.**
6. **Fixtures as `.json`** (proves the runtime-JSON path)? → **Default: yes.**
7. **Seed registry location:** xploder test fixture in S02, promoted to `apps/web/content/` in S9? → **Default: yes.**
8. **Tech categories:** `language, platform, framework, library, storage, network, tooling, ai` (closed enum)? → **Default: these 8.**
9. **Palette source of truth in TS (`xploder/theme`), emitted as inline CSS variables?** → **Default: yes** (D8). Alternative: hand-written CSS plus a consistency test.
10. **Palette hexes and motion seed values** as tabled in D8/D9? → **Default: accept.** Tweaks are one-line changes later, and the AC5 screenshots at G2 are your visual review point.
11. **AC4 scanner also covers `packages/xploder/src` (excluding `src/motion/`)?** → **Default: yes.** Stronger than AC4 requires, not a new AC.
12. **Placeholder page gets a blueprint grid background and a palette swatch strip?** → **Default: yes** (D8), so the AC5 flip is visible. Removed when real UI lands.
13. **Remove the S1 `XploderPlaceholder` type?** → **Default: yes.** Nothing imports it.
14. **Add a fixture C (agent-system shape, S15 preview)?** → **Default: no.** Not in the deliverables. S15 proves it data-only.
15. **Export a JSON Schema file (`project.schema.json`) for editor autocomplete?** → **Default: no.** It's trivial later via `z.toJSONSchema` and belongs to OSS extraction.
16. **Branch/PR flow:** branch renamed to `task/s02-contracts-tokens` (your convention). Draft PR to `main` at T12, merge only after your final S02 validation? → **Default: yes.**
17. **Executor tiers** per kickoff Hard Rule 4 (DeepSeek Flash → Sol/Gemini via OpenRouter → orchestrator)? → **Default: as written.** Tier reported per task.

---

## 7. WHAT MURPHY SHOULD TEST/VALIDATE (Stage 1)

1. The schema shapes in D1 (especially nested components and path-flows) fit how you think about websocket-inspector, jev-toolkit and agent-fleet (default: accept).
2. The palette in D8 matches your "blueprint drafting table" picture. Hexes are tabled here and get a visual check at G2 via screenshots (default: accept now, review screenshots at G2).
3. The motion seed values in D9 feel right on paper (default: accept. S4/S5 can tune numbers inside the module without contract changes).
4. The AC4 rule list in D10 is strict enough without blocking content (default: accept).
5. The phase grouping G1/G2/G3 in §4 gives you the validation points you want (default: accept).

## 8. WHAT THE AGENT NEEDS FROM MURPHY

1. Answers to the open questions in §6 (default: all recommendations accepted).
2. Approval to add dependencies `zod@^4.6` (xploder runtime) and `vitest@^5` (xploder + web dev). zod is in the constitution's locked stack. vitest is test tooling (default: approved).
3. Permission to push `task/s02-contracts-tokens` and open a draft PR at T12 (default: granted when you approve G3).
4. OpenRouter access for escalation tier 2 is already configured from S01 (default: yes. If not, tier 2 is skipped and logged).

---

## 9. Decisions recorded (Murphy, 2026-10-29)

1. §6 open questions 1–17: **all recommended defaults accepted.**
2. Dependencies `zod@^4.6` (xploder runtime) and `vitest@^5` (xploder + web dev): **approved.**
3. Push `task/s02-contracts-tokens` and open a draft PR at T12: **granted.**
4. Escalation tier 2 (Sol/Gemini via OpenRouter): **skipped for S02 (option A).** OpenRouter is not configured on the Mac (checked 2026-10-29). If tier 1 (Flash) fails a task twice, the orchestrator does **not** take over automatically: it **pauses and reports to Murphy** and waits for "go". Every report includes the current 5h/7d usage, read from the local status-line usage capture outside the repo. If either window is reported at ≥ 90% used, the report says so explicitly. Each skip is logged in the task report.
5. Fixture loading (G1 review, 2026-10-29): Murphy chose **option C**. Tests load fixtures through JSON `import`s, re-exported as `unknown` from `test/fixtures/index.ts`, instead of `JSON.parse(readFileSync(...))` (D5). The data still reaches the parsers as plain untyped JSON. This removes the `node-fs.d.ts` type shim without adding `@types/node`, so Node APIs still fail to typecheck in `src/`, which must stay browser-safe.
