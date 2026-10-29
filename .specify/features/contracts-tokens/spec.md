# Feature Specification: S02 Contracts & Tokens

**Feature dir:** `.specify/features/contracts-tokens/` · **Slice:** S02-contracts-tokens · **Created:** 2026-10-29 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-02-contracts-tokens.md` (frozen brief v1) · **Design:** `rfc.md` (approved 2026-10-29; all §6 defaults accepted; decisions in §9)

> Rule: functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. This spec invents **no** new acceptance criteria. Brief deliverables 3 (tech registry) and 5 (palette) are supporting work under the FRs they serve. They get task-level checks, not criteria of their own.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Site consumer (Priority: P1)

As the portfolio site (`apps/web`), I import project types and the motion and palette token modules from `xploder`. I validate data files at build time so invalid content fails the build. The placeholder page renders the blueprint palette, light by default with a dark alternate and no flash on load. My source contains no motion literals, and CI proves all of this on the PR.

**Why this priority:** every later site slice (S4 renderer wiring, S7 panels, S9 content) builds on these imports and on the token-only motion rule. If the site can't consume the contract cleanly now, every later slice pays for it.

**Independent Test:** `pnpm build` at the root is green. `apps/web` source has `import type` from `xploder` and imports from `xploder/motion` / `xploder/theme`. The motion-literal scanner passes. Playwright shows the light ⇄ dark palette flip with no flash. The PR checks are green.

**Acceptance Scenarios:**
1. **Given** the workspace, **When** `pnpm build` runs at the root, **Then** it exits 0, with `apps/web` importing at least one type from `xploder` and at least one token module (`xploder/motion`, `xploder/theme`). *(AC1)*
2. **Given** the `apps/web` source tree, **When** the motion-literal scanner test runs, **Then** it reports zero duration/easing literals. Its negative controls prove that it does catch planted literals. *(AC4)*
3. **Given** a fresh visit with no stored theme and a light (or no) OS preference, **When** the placeholder loads, **Then** the blueprint light palette (paper `#F6F3EA`) is shown. *(AC5)*
4. **Given** the page is open, **When** I press the theme toggle, **Then** the blueprint dark palette (navy `#0B1A2E`) is applied, including the tech-category accents. Pressing it again flips back. *(AC5)*
5. **Given** a dark OS preference, **When** the page loads (including before hydration and with JS disabled), **Then** there is no light flash. The S1 checks (a)–(f) still pass. *(AC5)*
6. **Given** the S02 PR, **When** CI runs, **Then** the build (typecheck, lint, test, build) and secrets (gitleaks) jobs are green. *(AC6)*

---

### User Story 2 — Lib consumer (Priority: P2)

As a future OSS user of `xploder`, I pass plain JSON to `parseProject` and get back either a typed `Project` with documented defaults applied or a descriptive error. The schema has no geometry, and it describes UI apps and pipelines alike without changes.

**Why this priority:** the schema is the lib's product (brief). It has to be correct and general before a renderer (S4) depends on it. It ranks after US1 only because nothing external consumes it yet.

**Independent Test:** `pnpm --filter xploder test` is green. Fixtures A and B (both `.json`) parse. The geometry-free test passes, with its negative controls. Fixture B was added with an empty diff to `packages/xploder/src` and to the schema fingerprint snapshot.

**Acceptance Scenarios:**
1. **Given** fixture A (UI app) and fixture B (pipeline) as JSON files plus the seed registry, **When** each goes through `parseProject(json, { registry })`, **Then** both return a `Project`. *(AC2)*
2. **Given** a project missing a required field (e.g. `meta.name`), **When** it's parsed, **Then** it's rejected with an error naming the path. *(AC2, negative)*
3. **Given** a component whose `techs` contains an id that isn't in the registry, **When** it's parsed with that registry, **Then** it's rejected with an error naming the path and the id. *(AC2, negative)*
4. **Given** the Project schema, **When** the geometry-free test walks its JSON Schema, **Then** it finds no position/coordinate/size/layout property and no open object that could carry one. *(AC3)*
5. **Given** fixture A and the schema fingerprint are committed, **When** fixture B is added, **Then** it validates with zero changes under `packages/xploder/src` and to the fingerprint snapshot. *(AC7)*

---

### User Story 3 — Murphy as content author (Priority: P3)

As Murphy writing a project file, I fill in only `schemaVersion`, `meta.slug`, `meta.name`, layers and components. I reference techs by registry id. Typos, unknown techs, dangling flow references and stray geometry fields fail with precise, readable error paths, at build time for site data and at parse time for JSON.

**Why this priority:** content arrives in S9/S13/S15, so authoring ergonomics matter but aren't exercised with real content in this slice. Its guarantees are covered by the AC2/AC3/AC7 tests.

**Independent Test:** a minimal project with only required fields parses, and the output shows every documented default. Each class of authoring mistake produces an error whose message contains the exact path. A throwaway invalid site data module makes `pnpm build` fail with that message.

**Acceptance Scenarios:**
1. **Given** a project with only the required fields, **When** it's parsed, **Then** defaults are applied: `kind: module`, `status: shipped`, `techs/links/metrics: []`, `flows: []`, `story: { metrics: [] }`. *(AC2, defaults coverage)*
2. **Given** a component with an extra key such as `"x": 12`, **When** it's parsed, **Then** it's rejected as an unrecognised key at that component's path. *(AC3, runtime side)*
3. **Given** fixture B, written using only fields from the S02 schema, **When** it's parsed, **Then** it's accepted. This is the S13 "add project = add data" claim. *(AC7)*

### Edge Cases

- `parseProject(json)` **without** a registry: tech ids are format-checked only. Unknown ids aren't detected (documented in RFC D3). `defineProject` requires a registry, so site content can't skip the check.
- Duplicate ids: a duplicate layer id, a component id repeated in different layers, or a duplicate flow id after defaults are applied → rejected at the duplicate's path.
- A flow `path` with fewer than 2 entries, or an entry naming a non-existent component → rejected.
- A registry with a duplicate tech id → rejected. JSON objects would silently drop duplicate keys, which is why the registry is an array (RFC D4).
- A `color` ref on a tech that isn't `tech-<category>` or `accent` → rejected. Hex colours are never accepted in data.
- `schemaVersion` missing or `!== 1` → rejected (the migration seam).
- Links: only `http`/`https` URLs are accepted. Fixtures use `example.com` only.
- `prefers-reduced-motion: reduce`: every `--motion-*` duration, stagger and distance resolves to 0 (static twin). `resolveMotion(true)` returns zeros.
- Dark OS + JS disabled: the CSS fallback from `paletteCss()` paints navy (S1 behaviour preserved).
- Future content like `"the 1990s"` or a metric `"120 ms"`: the motion scanner must **not** flag it, because its rules are tied to transition/animation declarations, motion keys and utilities.
- Importing `xploder/motion` or `xploder/theme` from a client component must not pull zod into the bundle (the import-graph test enforces this).

## Requirements *(mandatory)*

### Functional Requirements (1:1 with brief ACs; text verbatim)

- **FR-001 (↔ AC1):** `packages/xploder` exports schema, inferred types, `parseProject`, motion tokens; `apps/web` imports ≥1 type and ≥1 token module; `pnpm build` green at workspace root.
- **FR-002 (↔ AC2):** both fixtures parse; `pnpm test` in `packages/xploder` green including ≥2 negative tests (missing required field rejected; unknown tech id rejected).
- **FR-003 (↔ AC3):** geometry-free schema enforced by a test (schema shape contains no position/coordinate/size/layout fields).
- **FR-004 (↔ AC4):** motion-token exclusivity enforced (grep/lint test: zero duration/easing literals in `apps/web` source).
- **FR-005 (↔ AC5):** theme toggle flips blueprint light ⇄ dark palettes on the placeholder page; light is default; no flash on load (S1 behavior preserved).
- **FR-006 (↔ AC6):** CI green on the PR (build + tests + gitleaks).
- **FR-007 (↔ AC7):** **generality smoke:** fixture B (pipeline shape) validates with zero schema changes after fixture A exists — the S13 data-only claim proven early.

### Supporting requirements (brief deliverables; no new criteria)

| Deliverable (brief) | Serves | Design |
|---|---|---|
| 1. zod schema + inferred types + stable public API | FR-001, FR-002 | RFC D1, D2 |
| 2. `parseProject` runtime path + build-time validation path | FR-001, FR-002 | RFC D3 |
| 3. Tech registry format, validation, seed fixture | FR-002 | RFC D4 |
| 4. Motion token module + documented no-literal rule | FR-001, FR-004 | RFC D9, D10 |
| 5. Blueprint palette token sets wired to the toggle; category accents from the registry | FR-005 | RFC D8 |
| 6. Fixtures A and B + unit tests | FR-002, FR-003, FR-007 | RFC D5, D6, D7 |
| 7. CI stays green | FR-006 | RFC D11 |

Non-goals stay hard: no 3D/rendering/auto-layout code, no tour player, no panels or UI components, no real project content, no OG cards, no DNS/Vercel changes, no pixel theme.

### Key Entities

- **Project** `{ schemaVersion: 1, meta, story, layers[], flows[] }`: one teardown. No geometry. Layer order is the visual order.
- **Layer** `{ id, name, description?, components[] }`: one horizontal slice of the exploded view.
- **Component** `{ id, name, summary?, description?, kind, status, techs[], links[], metrics[] }`: one part. `kind ∈ module|service|store|external|actor` (default `module`), `status ∈ shipped|wip|planned` (default `shipped`).
- **Flow** `{ id?, label?, description?, path: ComponentId[≥2] }`: an ordered route through components (edge, pipeline or tour sequence).
- **Tech / TechRegistry** `{ schemaVersion: 1, techs: [{ id, label, category, color? }] }`: global and normalised. Projects reference techs by id only. 8 closed categories.
- **Motion tokens** `{ durations, easings{gsap,css}, staggers, distances, reducedMotion }`: the only source of animation numbers.
- **Blueprint palette** `{ light, dark }`, each with 9 roles plus 8 tech-category accents, emitted as `--bp-*` CSS variables.

## Success Criteria *(mandatory)*

Success = AC1–AC7 each pass with evidence (test output, terminal log, CI run, screenshots) recorded in `evidence/` and the per-task reports. No additional success criteria are defined.

| FR | AC | Evidence type |
|---|---|---|
| FR-001 | AC1 | root `pnpm build` log + `grep` of the `xploder` imports in `apps/web` + built `out/index.html` containing `--bp-*` / `--motion-*` variables |
| FR-002 | AC2 | `pnpm --filter xploder test` output listing the fixture-parse tests and the named negative tests |
| FR-003 | AC3 | geometry-free test output (positive run + negative controls) |
| FR-004 | AC4 | scanner test output + planted-literal failure log (reverted) |
| FR-005 | AC5 | Playwright check log (a)–(i) + screenshots: light, dark-toggled, dark-OS no-hydration, dark-OS no-JS |
| FR-006 | AC6 | PR checks URL + screenshot (build incl. test step, secrets) |
| FR-007 | AC7 | fixture-B test output + empty `git diff --stat` on `packages/xploder/src` and `__snapshots__` between the T005 and T006 merges |

## Assumptions

- All RFC §6 defaults are accepted. zod `^4.6` and vitest `^5` are approved (Murphy, 2026-10-29).
- Push and a draft PR to `main` are granted for T012. The merge happens only after Murphy's final S02 validation.
- Escalation: tier 2 (OpenRouter) is skipped. If tier 1 fails twice, the orchestrator pauses and reports to Murphy with current 5h/7d usage (RFC §9.4).
- The S1 theme mechanics (inline head script, `.dark`/`.light` classes, toggle semantics) are unchanged. S02 changes only which variables are painted.
