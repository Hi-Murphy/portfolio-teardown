# Slice 02 — Contracts & Tokens · FROZEN BRIEF v1

**slice:** S02-contracts-tokens · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S1 (done, merged `c7895bdf`)

## Mission
Define the data contract and design tokens that every later slice consumes: **schema v1 (zod), tech registry, motion-token module, blueprint palette tokens, and fixture projects proving generality.** No rendering engine, no site UI, no real project content.

## Context (self-contained — the orchestrator reads ONLY this brief)
- Product: data-driven "teardown" portfolio — each project rendered later as an exploded architecture view from a validated data file. The renderer package (`packages/xploder`) will be extracted as an OSS lib; **the schema is the lib's product.**
- S1 shipped: pnpm monorepo, `apps/web` (Next.js static export, Tailwind, theme toggle light-default), `packages/xploder` stub, CI (build + gitleaks), Vercel deploy.
- Locked decisions binding this slice:
  - **zod is the contract.** TS types inferred (`z.infer`). The lib accepts plain JSON at runtime (validated at the boundary); site data files are TS modules validated at build time.
  - **Minimal required fields** = only what a renderer cannot default: `schemaVersion`, `meta.slug`, `meta.name`, `layers[].id/name`, `components[].id/name`. Everything else optional with documented defaults.
  - **No coordinates.** Schema must contain zero position/geometry/layout fields — auto-layout (S4) derives everything from layer order + component list. This protects the "add project = add data" guarantee.
  - **`schemaVersion: 1`** on every project file (migration seam for the future lib).
  - **Component amendments (locked):** `links?: [{label,url}]` · `kind?: module|service|store|external|actor` (default `module`) · `status?: shipped|wip|planned` (default `shipped`) · `metrics?: [{label,value}]` (same shape as `story.metrics`).
  - **Global tech registry**, projects reference techs by stable id only (no free-text tech strings) — cross-project links (S14) and category colors depend on normalization.
  - **Motion tokens:** one central module is the ONLY source of easings/durations/staggers. Signature (locked): mechanical `ease-out-expo` explode, 4px hover lift, sequential tour pulse, reduced-motion static twin. Seed values are design-stage decisions (RFC), but the *contract* (single module, no literals elsewhere) is frozen here.
  - **Theme:** blueprint drafting-table system. **Light palette = default** (warm paper-white bg, ink-blue lines, steel/cyan accents, charcoal mono labels); **dark navy alternate** (light/cyan lines on deep navy). Both as CSS-variable token sets wired to the S1 toggle. Single-palette rule applies to *future* themes, not to blueprint (the one light/dark pair).
- Generality requirement: the schema must describe three very different shapes — a UI-centric app (websocket-inspector, S9), a pipeline harness (jev-toolkit, S13), and a non-code agent system (agent-fleet, S15). S13/S15 must later land **data-only**; AC7 below is the early proof.

## Deliverables
1. `packages/xploder`: zod schema — `Project {schemaVersion, meta, story, layers[], flows[]}` + `Component` + `Layer` + `Flow` + `TechRegistry` — with inferred exported TS types and a stable public API surface (index exports).
2. Runtime JSON acceptance: `parseProject(json: unknown)` → validated `Project` or descriptive zod error; build-time validation path for site data files.
3. Tech registry module: format + validation (unique ids, label, category, optional color-token ref) + seed fixture (~10 real Android/web techs the websocket-inspector will use, e.g. kotlin, coroutines, okhttp, room).
4. `motion` token module: explode/implode (duration, easing, stagger), hover lift, tour beat, panel transitions, reduced-motion policy flag. Documented rule: *no animation number literal may exist outside this module.*
5. Blueprint palette token sets (light default + dark) as CSS variables, wired to the existing theme toggle; tech-category accent colors sourced from registry categories.
6. Fixture projects (fictional, in `packages/xploder` test data): **fixture A** = UI-app shape (≥3 layers, ≥6 components, ≥1 flow, uses registry ids); **fixture B** = pipeline shape (linear stages as layers, non-UI). Both parse; unit tests cover required-field enforcement, amendment defaults, unknown-tech-id rejection, and ≥2 negative cases.
7. CI stays green (typecheck, lint, build, tests, gitleaks).

## Non-goals (hard)
- No 3D/rendering/auto-layout code (S4+) · no guided-tour player (S5) · no panels/UI components (S7) · no real project content (S9 = Murphy) · no OG cards · no DNS/Vercel changes · no pixel theme (v1.5).

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** `packages/xploder` exports schema, inferred types, `parseProject`, motion tokens; `apps/web` imports ≥1 type and ≥1 token module; `pnpm build` green at workspace root.
- **AC2:** both fixtures parse; `pnpm test` in `packages/xploder` green including ≥2 negative tests (missing required field rejected; unknown tech id rejected).
- **AC3:** geometry-free schema enforced by a test (schema shape contains no position/coordinate/size/layout fields).
- **AC4:** motion-token exclusivity enforced (grep/lint test: zero duration/easing literals in `apps/web` source).
- **AC5:** theme toggle flips blueprint light ⇄ dark palettes on the placeholder page; light is default; no flash on load (S1 behavior preserved).
- **AC6:** CI green on the PR (build + tests + gitleaks).
- **AC7:** **generality smoke:** fixture B (pipeline shape) validates with zero schema changes after fixture A exists — the S13 data-only claim proven early.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash: one integration seam + one executable check each.
- Evidence (terminal output/test results/screenshots) attached per task report; escalation ladder: Flash stuck ×2 → Sol/Gemini (OpenRouter) → ×2 → orchestrator executes.
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets in repo; nothing infra-flavored in fixtures.

## Murphy dependencies
- None new. No content debt in this slice (fixtures are fictional; real websocket-inspector content = S9).

## Freeze protocol
Frozen at commit. Scope/AC changes = revision, logged in the vault revision log with reason code. Design decisions (seed token values, palette hexes, file layout) live in `.specify/features/contracts-tokens/rfc.md` — authored by the orchestrator, Murphy-reviewed before spec/plan/tasks and again before execution.
