# Implementation Plan: S02 Contracts & Tokens

**Feature dir:** `.specify/features/contracts-tokens/` · **Date:** 2026-10-29 · **Spec:** `spec.md` · **Design:** `rfc.md` (approved; §6 defaults accepted; §9 decisions)

## Summary

Turn `packages/xploder` from a stub into the contract layer:
- a strict, geometry-free zod v4 schema (`Project`, `Layer`, `Component`, `Flow`, `TechRegistry`) with inferred types
- `parseProject` / `defineProject` boundaries, with a registry seam for tech-id normalisation
- a fully seeded `xploder/motion` token module (GSAP + CSS easings, reduced-motion static twin, CSS-variable emitter)
- a new `xploder/theme` module holding the blueprint light/dark palettes and their CSS-variable emitter

Wire `apps/web` to consume them:
- token CSS is generated inline in `<head>`
- Tailwind semantic colours map onto `--bp-*`
- a grid background and palette strip make the theme flip visible

Prove generality with two JSON fixtures, where fixture B lands with zero schema diff. Enforce the motion-literal ban with a scanner test that has negative controls. Add vitest and a `pnpm test` CI step. No renderer, layout, UI components or real content.

## Technical Context

**Language/Version:** TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), Node.js 24 LTS
**Primary Dependencies (new):** `zod@^4.6` (xploder `dependencies`); `vitest@^5` (xploder + web `devDependencies`). Existing: Next 16.4, React 19, Tailwind 4.3, ESLint 9, Prettier 3.
**Package manager:** pnpm 12.15 (unchanged)
**Storage:** none
**Testing:** vitest 5, `node` environment, no DOM, in `packages/xploder` and `apps/web`. Playwright and Lighthouse run as throwaway scripts in `/tmp/s02-checks/` (not repo deps, same as S01).
**Target Platform:** static export (unchanged). Design target is a mid-range Android on 4G.
**Project Type:** web monorepo (site app + library package)
**Performance Goals:** no client-JS growth from S02. Tokens are consumed only by server components. zod never reaches the client bundle.
**Constraints:** static-only, no analytics, no secrets, no DNS/Vercel changes, no geometry in the schema, no motion literals outside `packages/xploder/src/motion/`.
**Scale/Scope:** 4 schema modules, 2 token modules, 2 fixtures + 1 registry fixture, about 10 test files, 1 page update.

## Constitution Check

Against `.specify/memory/constitution.md` v1.0.0:

| Principle | Gate | Status |
|---|---|---|
| I. Brief Is Scope | FR-001…007 quote AC1–AC7 verbatim; no new criteria; non-goals untouched | ✅ |
| II. Static-Only Shell | Token CSS generated at build time into static HTML. No runtime, API routes or DB. | ✅ |
| III. Performance Is a Feature | No new client JS. zod excluded from token entry points (tested). One Lighthouse sanity run in T011. | ✅ |
| IV. Single Motion Source | All timings live in `xploder/motion`. The AC4 scanner covers `apps/web` and `xploder/src` except `motion/`. Tailwind default transition and eases are bound to tokens. | ✅ |
| V. Theme Integrity | S1 head script and toggle unchanged. The palette CSS mirrors S1's three blocks (`:root`, `.dark`, `prefers-color-scheme` fallback). S1 checks (a)–(f) re-run. | ✅ |
| VI. Evidence Over Assertion | Every task writes `evidence/T0NN-*`. Visual claims get screenshots. | ✅ |
| VII. No Secrets | Fictional fixtures, `example.com` links only, gitleaks local + CI | ✅ |
| Constraints: locked stack | zod is in the stack. **vitest is an addition**, approved by Murphy 2026-10-29 (RFC §9.2). | ✅ (recorded) |

## Project Structure

### Documentation (this feature)

```text
.specify/features/contracts-tokens/
├── rfc.md        # Stage 1 design (approved)
├── spec.md       # Stage 2: stories + FR↔AC
├── plan.md       # this file
├── tasks.md      # Stage 2: ordered executor tasks
└── evidence/     # Stage 3: logs, screenshots
```

### Source Code (changes only)

```text
.
├── package.json                         # + "test": "pnpm -r --if-present test"
├── .github/workflows/ci.yml             # build job: + pnpm test (after lint, before build)
├── AGENTS.md  README.md                 # + xploder/theme, pnpm test, literal rule wording
├── packages/xploder/
│   ├── package.json                     # + exports "./theme"; + dep zod; + devDep vitest; + script test
│   ├── tsconfig.json                    # include ["src", "test"]
│   ├── src/
│   │   ├── index.ts                     # public barrel (see API surface); XploderPlaceholder removed
│   │   ├── errors.ts                    # XploderValidationError, ProjectValidationError, TechRegistryValidationError
│   │   ├── parse.ts                     # parseProject, safeParseProject, defineProject, parseTechRegistry, defineTechRegistry
│   │   ├── schema/
│   │   │   ├── constants.ts             # SCHEMA_VERSION, COMPONENT_KINDS, COMPONENT_STATUSES, TECH_CATEGORIES, TECH_COLOR_REFS (zod-free)
│   │   │   ├── primitives.ts            # IdSchema, LabelSchema, TextSchema, LinkSchema, MetricSchema
│   │   │   ├── tech.ts                  # TechSchema, TechRegistrySchema
│   │   │   └── project.ts               # MetaSchema, StorySchema, ComponentSchema, LayerSchema, FlowSchema, createProjectSchema, ProjectSchema
│   │   ├── motion/index.ts              # durations, easings, staggers, distances, reducedMotion, motion, resolveMotion, motionCss (zod-free)
│   │   └── theme/
│   │       ├── blueprint.ts             # palette values (hex)
│   │       └── index.ts                 # blueprint, paletteCss, techColor, types (zod-free)
│   └── test/
│       ├── fixtures/
│       │   ├── tech-registry.json       # 12 techs (RFC D4)
│       │   ├── project-a-ui-app.json    # "Tidewatch" (T005)
│       │   └── project-b-pipeline.json  # "Ledgerline" (T006)
│       ├── __snapshots__/generality.test.ts.snap   # schema fingerprint (created in T005, frozen from then on)
│       ├── helpers.ts                   # loadJson(), minimalProject()
│       ├── smoke.test.ts  registry.test.ts  schema.test.ts  parse.test.ts
│       ├── geometry-free.test.ts  fixtures.test.ts  generality.test.ts
│       └── motion.test.ts  theme.test.ts
└── apps/web/
    ├── package.json                     # + devDep vitest; + script test
    ├── app/layout.tsx                   # + <style> paletteCss() + motionCss() after the theme script
    ├── app/globals.css                  # S1 hexes removed; @theme inline → var(--bp-*), motion bindings
    ├── app/page.tsx                     # + grid background, palette strip, import type from xploder
    ├── app/motion.ts                    # comment updated (values now live)
    └── test/
        ├── motion-literal-scanner.ts    # scanner rules (RFC D10)
        └── no-motion-literals.test.ts   # scans apps/web + packages/xploder/src (minus motion/); negative controls
```

**Plan refinements of the RFC** (implementation detail, no scope change):
1. **Error classes.** Registry errors shouldn't be called "Project…", so `errors.ts` defines a base `XploderValidationError` with two subclasses, `ProjectValidationError` and `TechRegistryValidationError`. The RFC D3 contract (prettified `message`, `issues`, `cause = ZodError`) holds for both.
2. **Scanner location.** The scanner lives once in `apps/web/test/` and scans two roots: `apps/web` (AC4) and `packages/xploder/src` minus `motion/` (the RFC D10 extension). This keeps xploder free of repo-relative test code ahead of its OSS extraction.
3. **`defineProject` gains `source?: string`.** The file name is included in build errors, for the content author (US3).

## Public API surface

### `xploder` (`src/index.ts`)

```ts
// constants (re-exported from schema/constants.ts)
export const SCHEMA_VERSION: 1;
export const COMPONENT_KINDS: readonly ['module', 'service', 'store', 'external', 'actor'];
export const COMPONENT_STATUSES: readonly ['shipped', 'wip', 'planned'];
export const TECH_CATEGORIES: readonly ['language', 'platform', 'framework', 'library', 'storage', 'network', 'tooling', 'ai'];
export const TECH_COLOR_REFS: readonly ['tech-language', …, 'tech-ai', 'accent'];
export const XPLODER_VERSION = '0.0.0';

// schemas
export { IdSchema, LinkSchema, MetricSchema, TechSchema, TechRegistrySchema,
         MetaSchema, StorySchema, ComponentSchema, LayerSchema, FlowSchema,
         ProjectSchema, createProjectSchema };

// types: output (defaults applied) and input (what authors write)
export type Project = z.output<typeof ProjectSchema>;      export type ProjectInput = z.input<typeof ProjectSchema>;
export type Meta, Story, Layer, Component, Flow, Link, Metric;
export type Tech = z.output<typeof TechSchema>;            export type TechRegistry = z.output<typeof TechRegistrySchema>;
export type TechRegistryInput = z.input<typeof TechRegistrySchema>;
export type TechCategory = (typeof TECH_CATEGORIES)[number];
export type ComponentKind, ComponentStatus, TechColorRef;

// boundaries
export function parseProject(json: unknown, options?: { registry?: TechRegistry }): Project;          // throws ProjectValidationError
export function safeParseProject(json: unknown, options?: { registry?: TechRegistry }): z.ZodSafeParseResult<Project>;
export function defineProject(input: ProjectInput, options: { registry: TechRegistry; source?: string }): Project;
export function parseTechRegistry(json: unknown): TechRegistry;                                        // throws TechRegistryValidationError
export function defineTechRegistry(input: TechRegistryInput): TechRegistry;
export function createProjectSchema(registry?: TechRegistry): typeof ProjectSchema;                    // same shape, + registry check

// errors
export class XploderValidationError extends Error { readonly issues: z.core.$ZodIssue[]; readonly cause: z.ZodError }
export class ProjectValidationError extends XploderValidationError {}
export class TechRegistryValidationError extends XploderValidationError {}
```

Error `message` format: `Invalid project${source ? ` (${source})` : ''}:\n${z.prettifyError(err)}` (and `Invalid tech registry: …`).

### `xploder/motion` (`src/motion/index.ts`, zod-free)

```ts
export const durations: { explode: 0.9; implode: 0.6; hoverLift: 0.18; hoverSettle: 0.24;
                          tourPulse: 0.5; tourBeat: 1.6; panelEnter: 0.32; panelExit: 0.2 };          // seconds
export const easings: { explode, implode, hover, tourPulse, panelEnter, panelExit: { gsap: string; css: string } };
export const staggers: { explodeLayer: 0.06; explodeComponent: 0.02; implodeLayer: 0.04; tourStep: 0.15 }; // seconds
export const distances: { hoverLift: 4; panelOffset: 16 };                                           // px
export const reducedMotion: { policy: 'static-twin'; query: '(prefers-reduced-motion: reduce)' };
export const motion: { durations, easings, staggers, distances, reducedMotion };
export type MotionTokens = typeof motion;
export function resolveMotion(prefersReduced: boolean): MotionTokens;   // reduced → every duration/stagger/distance = 0
export function motionCss(): string;                                     // :root{--motion-*} + @media (prefers-reduced-motion: reduce){:root{…0}}
```

Values and easing pairs are exactly RFC D9.

### `xploder/theme` (`src/theme/index.ts`, zod-free; imports only `../schema/constants`)

```ts
export type PaletteRole = 'paper' | 'surface' | 'grid' | 'line' | 'lineMuted' | 'ink' | 'label' | 'accent' | 'steel';
export type Palette = Record<PaletteRole, string> & { tech: Record<TechCategory, string> };
export const blueprint: { light: Palette; dark: Palette };              // hex values exactly RFC D8
export function paletteCss(): string;                                   // 3 blocks: :root{light}  .dark{dark}  @media (prefers-color-scheme: dark){html:not(.light){dark; color-scheme:dark}}
export function techColor(ref: TechColorRef, palette: Palette): string; // 'tech-network' → palette.tech.network; 'accent' → palette.accent
```

## Contracts

### Schema rules (RFC D1)

- Every object is `z.strictObject`. Unknown keys are rejected.
- **zod v4 default semantics:** `.default(v)` returns `v` **without parsing it**. Use `.default([])` for arrays. For objects with nested defaults use **`.prefault({})`** (e.g. `story: StorySchema.prefault({})`), so nested defaults like `metrics: []` are applied.
- `IdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64)`. `LabelSchema = z.string().trim().min(1).max(120)`. `TextSchema = z.string().trim().min(1).max(2000)`. `LinkSchema = { label: LabelSchema, url: z.url({ protocol: /^https?$/ }) }`. `MetricSchema = { label: LabelSchema, value: LabelSchema }`.
- `TechSchema.color`: optional `z.enum(TECH_COLOR_REFS)`. A `.transform` fills in `tech-<category>`, so the output `color` is always set.
- `FlowSchema.path`: `z.array(IdSchema).min(2)`. Project-level `.transform` fills `flows[i].id ??= \`flow-${i + 1}\``.
- Project `superRefine` (runs before the transform; uses effective flow ids): unique layer ids · unique component ids across layers · unique effective flow ids · every `path` entry resolves · (with a registry) every `techs` entry resolves. Each issue uses `code: 'custom'`, with the exact `path` array and messages like `Unknown tech id "okhtp". Not in the registry.` / `Unknown component id "x" in flow path.` / `Duplicate component id "x".`
- JSON Schema introspection always uses `z.toJSONSchema(schema, { io: 'input' })`, because transforms can't be represented in output mode.

### CSS variable contract (generated, inlined in `<head>`)

| Prefix | Source | Example |
|---|---|---|
| `--bp-<role-kebab>` | `blueprint.{light,dark}` | `--bp-paper:#F6F3EA` · `--bp-line-muted:#6F89AE` |
| `--bp-tech-<category>` | `blueprint.*.tech` | `--bp-tech-network:#0A6E87` |
| `--motion-duration-<kebab>` | `durations` (s → ms, integer) | `--motion-duration-explode:900ms` |
| `--motion-ease-<kebab>` | `easings.*.css` | `--motion-ease-explode:cubic-bezier(0.16, 1, 0.3, 1)` |
| `--motion-stagger-<kebab>` | `staggers` (s → ms) | `--motion-stagger-explode-layer:60ms` |
| `--motion-distance-<kebab>` | `distances` (px) | `--motion-distance-hover-lift:4px` |

`globals.css` (Tailwind) maps them with `@theme inline`:

```css
@theme inline {
  --color-bg: var(--bp-paper);   --color-surface: var(--bp-surface); --color-fg: var(--bp-ink);
  --color-muted: var(--bp-label); --color-accent: var(--bp-accent);  --color-line: var(--bp-line);
  --color-line-muted: var(--bp-line-muted); --color-grid: var(--bp-grid); --color-steel: var(--bp-steel);
  --color-tech-language: var(--bp-tech-language); /* … one per category … */
  --default-transition-duration: var(--motion-duration-hover-lift);
  --default-transition-timing-function: var(--motion-ease-hover);
  --ease-*: initial; --animate-*: initial;
  --ease-explode: var(--motion-ease-explode); --ease-hover: var(--motion-ease-hover); /* … per easing … */
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

The S1 classes `bg-bg`, `text-fg`, `text-muted`, `outline-accent` keep working unchanged.

## Data flow

```text
CONTENT (lib path)        JSON ──▶ parseProject(json, {registry?}) ──┐
CONTENT (site path, S9+)  TS module ──▶ defineProject(input, {registry, source}) ──┤  (evaluated during `next build`)
                                                                    ▼
                createProjectSchema(registry) = strict shape ─▶ superRefine (ids, paths, techs) ─▶ transform (flow ids)
                                                                    ▼
                         Project (defaults applied)  ──▶  (S4 renderer: auto-layout from layer/component order)
                         or ProjectValidationError (prettified paths) ──▶ build fails / caller handles

TOKENS   blueprint.ts ─▶ paletteCss() ─┐
         motion/index.ts ─▶ motionCss() ┴▶ <style> in layout.tsx <head> (after THEME_SCRIPT) ─▶ --bp-* / --motion-*
                                           ─▶ @theme inline (globals.css) ─▶ Tailwind utilities ─▶ paint
THEME    THEME_SCRIPT (S1, unchanged) sets .dark/.light on <html> before paint ─▶ selects the :root / .dark / @media block
```

## Test map

| Test file (package) | Proves | AC |
|---|---|---|
| `smoke.test.ts` (xploder) | harness runs | — |
| `registry.test.ts` | seed registry parses; duplicate id, bad category, hex `color` rejected; `color` default | AC2 (support) |
| `schema.test.ts` | minimal project parses with all defaults; **missing `meta.name` rejected**; missing/wrong `schemaVersion`; duplicate ids; bad flow path; unknown key | AC2 |
| `parse.test.ts` | **unknown tech id rejected** (with registry); accepted without a registry; error class/message/path shape; `defineProject` throws with `source` in the message | AC2 |
| `geometry-free.test.ts` | banned-name walk + `additionalProperties:false` everywhere + no untyped nodes; negative controls; `"x": 12` rejected at runtime | AC3 |
| `fixtures.test.ts` | fixture A parses; shape floors (≥3 layers, ≥6 components, ≥1 flow, ≥6 registry ids, every amendment used) | AC2 |
| `generality.test.ts` | schema fingerprint snapshot (T005); fixture B parses and is pipeline-shaped (T006) | AC7, AC2 |
| `motion.test.ts` | values = RFC D9; `resolveMotion(true)` all zero; `motionCss()` units + reduced block | AC1 (support) |
| `theme.test.ts` | 8 categories × 2 themes; AA ≥ 4.5:1 for text roles and accents on paper and surface; `line-muted` ≥ 3:1; `paletteCss()` has 3 blocks; motion/theme import graph has no `zod` | AC5 (support) |
| `no-motion-literals.test.ts` (web) | zero hits in `apps/web` (+ xploder minus motion); each rule catches its bad sample; good samples pass | AC4 |
| `/tmp/s02-checks/t011.mjs` (Playwright, not in repo) | S1 (a)–(f) + palette (g)–(i) | AC5 |

## Phase groups (Stage 3 STOP points)

| Group | Tasks | Exit condition |
|---|---|---|
| **G1: contract** | T001–T006 | AC2, AC3, AC7 proven in `packages/xploder` with evidence → STOP for Murphy |
| **G2: tokens & site** | T007–T011 | AC1, AC4, AC5 proven locally with evidence + screenshots → STOP |
| **G3: ship** | T012–T013 | AC6 proven on the PR; docs; AC1–AC7 self-check table → STOP |

## Complexity Tracking

No constitution violations. Deliberate choices (each revisitable):

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| Palette in TS + generated CSS | renderer needs raw values; contrast and category coverage are testable | hand-written CSS can't be read by three.js or unit-tested for contrast |
| Integrity `superRefine` | dangling ids would only surface in S4/S5 as renderer bugs | schema-only typing can't express cross-references |
| Fingerprint snapshot + git-diff proof for AC7 | makes "zero schema changes" mechanically checkable | a reviewer's eyeball isn't evidence (constitution VI) |
| No lint rule for motion (scanner test only) | ESLint can't see CSS or Tailwind class strings; one mechanism is enough | ESLint + scanner would duplicate the rule set |
