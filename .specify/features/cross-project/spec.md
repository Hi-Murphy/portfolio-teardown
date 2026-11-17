# Feature Specification: S17 Cross-project relationships

**Feature dir:** `.specify/features/cross-project/` · **Slice:** S17-cross-project · **Created:** 2026-11-17 · **Status:** Draft (Stage 2 gate)
**Scope source:** `.specify/slices/slice-17-cross-project.md` (frozen brief v1, revision counter 0 of 2) · **Design:** `rfc.md` (approved 2026-11-17: all §10 defaults + U1 Next upgrade + R1–R6, §11)

> **Rule:** functional requirements map **1:1** to brief AC1–AC6, and their text is quoted verbatim. This spec invents **no** acceptance criteria. Scope items and the Murphy-authorised upgrade (U1) appear as supporting requirements (SR) under the FR they serve. They get task-level checks, not criteria of their own. Documented values (messages, classes, gate ids) come from the RFC and are referenced, not promoted to criteria.
>
> **Evidence doctrine (kickoff Hard Rule 8):** both strips (light/dark × 390/1440), removal test, unknown-slug build failure, axe output, CLS table, byte delta and sweep re-run, each as a machine artifact per `.specify/EVIDENCE.md`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A reader finds the other project (Priority: P1)

I finish reading one teardown. Below the story, before the footer, a short "Connections" strip names the other project, says in one sentence how the two relate, and links to it. It works from either page.

**Why this priority:** the slice's mission ("one body of work").

**Independent Test:** the strip on both exported project routes (`connections-probe.mjs`, screenshots), plus `test/relationships.test.ts` (RFC G3, G6, G7).

**Acceptance Scenarios:**

1. **Given** the production export, **When** `/projects/jev-toolkit` loads, **Then** the strip shows "Scarlet Inspector", the jev-toolkit note and one link to `/projects/websocket-inspector`. The mirror holds on `/projects/websocket-inspector`. _(AC1)_
2. **Given** either route, **Then** the strip comes after the workbench (story) and before the footer, with and without JS. _(AC3)_

---

### User Story 2 — The maintainer changes relationships in content only (Priority: P1)

I add, edit or delete a relationship in a project JSON. The site follows and nothing else needs editing. A typo in a slug or a self-link stops the build with a clear, named error.

**Independent Test:** removal test (unit + one-off build), unknown-slug and self-reference build failures, fidelity test (RFC G2–G5, G15).

**Acceptance Scenarios:**

1. **Given** the jev-toolkit entry deleted, **Then** jev-toolkit has no strip and websocket-inspector still has one (and the mirror). _(AC1)_
2. **Given** `to: "no-such-project"`, **When** `pnpm build` runs, **Then** it fails with `RelationshipValidationError` naming the slug and the project. _(AC1)_
3. **Given** a relationship whose `to` is its own slug, **Then** the schema rejects it. _(AC1)_
4. **Given** the converted modules, **Then** the fidelity test passes for both. _(AC6)_

---

### User Story 3 — A keyboard or screen-reader user uses the strip (Priority: P1)

I tab past the workbench controls and land on the strip's link, with a visible focus ring. Then I tab on into the footer. My screen reader announces a "Connections" region and list. The link reads as the destination project's name. On a phone the link is easy to tap.

**Independent Test:** `connections-probe.mjs` (roles, names, Tab walk, focus style, 44×44), axe (RFC G6, G8).

**Acceptance Scenarios:**

1. **Given** either route, **Then** the strip is a list named "Connections" whose links read as the target `meta.name`, never "here". _(AC2)_
2. **Given** keyboard use, **Then** Tab order is last workbench control → strip link → first footer link, and the focused link shows the site focus ring. _(AC2)_
3. **Given** 390 and 1440 px, **Then** each link box is ≥ 44×44. axe: 0 serious / 0 critical. _(AC2)_

---

### User Story 4 — Nothing else moves (Priority: P1)

The home page is the same, byte for byte, and its hero still comes alive by itself. Project pages do not jump while loading, have no sideways scroll on a phone, and the labels inside the teardown never cover or get covered by the strip.

**Independent Test:** `home-bytes.sh`, `eager:probe`, `site:probe --group cls`, the S16 sweep re-run (RFC G9–G11).

**Acceptance Scenarios:**

1. **Given** all four routes, **Then** CLS is 0. **Given** 390 px, **Then** `scrollWidth ≤ clientWidth` and the strip intersects no label or footprint note. The S16 sweep stays at 0. _(AC3)_
2. **Given** the head export and the base export (RFC R1: base = the upgrade commit `B1`), **Then** `/` and every file it loads are byte-identical, and the eager hero reveal is re-measured and passes. _(AC4)_

---

### User Story 5 — It costs almost nothing and seals hold (Priority: P1)

The page ships almost no extra code, the 3D scene draws as before, no route is added, CI is green, and no sealed engine code changes.

**Independent Test:** `bundle-gzip.mjs` (budget 1,536), `site:probe --group draws`, sitemap `cmp`, `guards.sh`, CI (RFC G12–G17).

**Acceptance Scenarios:**

1. **Given** base and head exports, **Then** client JS grows by ≤ 1.5 KB gzip, there are 2 draw calls, and the sitemap gains no route. _(AC5)_
2. **Given** the PR head, **Then** CI shows 7/7 required contexts green, the fidelity test passes for both modules, and S2–S8 are empty. _(AC6)_

---

### Edge Cases

- **No `relationships` key, or `[]`:** parses to no connections; no strip, no heading, no empty list (RFC §3.1).
- **Duplicate target:** rejected (Q4).
- **Unknown `kind`, extra key, empty note, non-slug `to`:** rejected by the strict schema; an unknown `kind` also fails typecheck (`ProjectSource`).
- **No JS:** the strip is server-rendered HTML after the `<noscript>` outline, so the order holds without JS.
- **Several relationships:** one `<li>` each, in content order (the brief has one per file).
- **Upgrade side effects (U1):** framework chunks change on every page. The AC4/AC5 base is therefore `B1` (R1). The upgrade's own deltas are reported separately.

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR-001 (AC1) — data-driven both ways.** "Both strips render from JSON alone; deleting one entry removes exactly that strip (test); an unknown `to` slug fails the build with a named error; a relationship to the same project is rejected by the schema."
  - SR-001a: content patch per RFC §2 (exact bytes, notes verbatim, explicit in both files).
  - SR-001b: app-level schema + `RelationshipValidationError` per RFC §3.1–§3.2; validation at module load of `content/projects/connections.ts`.
  - SR-001c: `Connections` server component, empty list → `null`; mounted after `<Workbench>` (RFC §4).
- **FR-002 (AC2) — accessible.** "The strip is a labelled list of links, keyboard reachable in order, visible focus, tap targets ≥ 44×44, link text names the destination project (not "here"). axe 0 serious / 0 critical."
  - SR-002a: the RFC §5 contract (region + `h2` + named `ul`, `min-h-11 min-w-11`, the site focus ring).
- **FR-003 (AC3) — no layout damage.** "CLS 0 on all four routes; the strip sits between story and footer; 390 px shows no horizontal scroll and no overlap with the label system's footprint notes (the S16 sweep is re-run and must stay at 0 intersections)."
  - SR-003a: sweep re-run = the S16 final matrix (R5).
- **FR-004 (AC4) — home untouched.** "`/` is byte-identical except for no change at all; the eager hero's reveal is re-measured and unchanged."
  - SR-004a: R0 (existing classes only) + R4 CI proxy test; fixed build id (R3); base `B1` (R1).
- **FR-005 (AC5) — weight.** "Total client JS **+ ≤ 1.5 KB gzip**; 2 draw calls; no new route in the sitemap beyond the existing three."
  - SR-005a: schema and resolver stay server-only (RFC §4.2); sitemap byte-identical (Q5).
- **FR-006 (AC6) — gates and seals.** "CI 7/7 required contexts green; the fidelity test passes for both converted modules; **S2–S8 empty**."
  - SR-006a: fidelity changes per RFC §3.4; `guards.sh` per RFC §6.3 + R2.
  - SR-006b (U1): `next` / `eslint-config-next` 16.4.3 → 16.4.6, its own commit, with all gates green on it and three builds without the security notice (R1, R3).

### FR ↔ AC mapping

| FR | AC | Gates (RFC §7) | Tasks |
|---|---|---|---|
| FR-001 | AC1 | G3, G4, G5, G7, G15 | T002, T003, T004 |
| FR-002 | AC2 | G6, G7, G8 | T004, T005 |
| FR-003 | AC3 | G6, G9, G10 | T005 |
| FR-004 | AC4 | G11 | T001 (base), T004, T006 |
| FR-005 | AC5 | G12, G13, G14 | T001 (base), T006 |
| FR-006 | AC6 | G1, G2, G16, G17 | T001–T006 |

### Key Entities

- **Relationship** (content): `{ to: slug, kind: 'measured-on' | 'shares-stack' | 'same-engine', note: string }`, under the top-level `relationships` of a project JSON.
- **ProjectSource** (type): `ProjectInput & { relationships? }`, what the generated `.source.ts` satisfies.
- **Connection** (resolved): `{ slug, name, kind, note }`; `name` = the target's `meta.name`.
- **B1**: the T001 upgrade commit, the byte and JS baseline for AC4/AC5.

## Success Criteria _(mandatory)_

The success criteria are AC1–AC6 as quoted in FR-001…FR-006. None is added.

## Assumptions

- The strip label "Connections" is UI chrome (Q2), like "Case study" and "Metrics".
- The S16 tooling (`label-matrix.mjs`, `bundle-gzip.mjs`) is reused read-only or copied into this feature dir.
- The CI required contexts are the seven listed in S16 `T012-ci-required-contexts.json`.
