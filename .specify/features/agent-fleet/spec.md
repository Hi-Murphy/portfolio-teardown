# Feature Specification: S18 Agent-fleet teardown (third project)

**Feature dir:** `.specify/features/agent-fleet/` · **Slice:** S18-agent-fleet · **Created:** 2026-11-17 · **Status:** Draft (Stage 2)
**Scope source:** `.specify/slices/slice-18-agent-fleet.md` (frozen brief v1; **revision 1 of 2** recorded in `rfc.md` §12 and `evidence/REV1-revision-note.md`) · **Design:** `rfc.md` (approved 2026-11-17: all defaults, E1/E2 → revision 1, E3 → ruling C3, refinements R-A–R-F)

> **Rule:** functional requirements map **1:1** to brief AC1–AC7, and their text is quoted verbatim. Where brief revision 1 changes a number or a definition, the revised reading is quoted **beneath** the original, marked **REV1**. This spec invents **no** acceptance criteria. Scope items appear as supporting requirements (SR) under the FR they serve; they get task-level checks, not criteria of their own.
>
> **Evidence doctrine (kickoff Hard Rule 9):** every claim has a machine artifact per `.specify/EVIDENCE.md` in `evidence/`, and no artefact contains a secret (each is scanned before commit, R-C).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — A reader opens the third teardown (Priority: P1)

From `/projects` or the home page I open "Agent fleet". I see an exploded view of four layers, can open any of the fourteen components, and can play each of the three flows.

**Why this priority:** the slice's first scope item ("Convert + register").

**Independent Test:** fidelity + content-model tests; `route-probe.mjs` on the export (4/14/3, 14 panels, 3 flows); `site-probe` teardown counts.

**Acceptance Scenarios:**

1. **Given** the production export, **When** `/projects/agent-fleet` loads, **Then** it renders 4 layers, 14 components and 3 flows, whose ids equal the canonical JSON one-for-one. _(AC1)_
2. **Given** the live route, **When** each component is opened and each flow is played, **Then** 14/14 panels open and 3/3 flows play. _(AC1)_
3. **Given** the converted module, **Then** the fidelity test is deep-equal to the JSON and its negative controls fail on a mutated copy. _(AC1)_

---

### User Story 2 — The site lists the fleet everywhere a project is listed (Priority: P1)

The fleet shows up on `/projects`, in the home projects section, in the sitemap, as its own share card, and as structured data, and an unknown project URL still returns 404.

**Independent Test:** `site-probe` cards, `sitemap.xml`, OG PNG dimensions and hashes over two clean builds, `seo-probe` JSON-LD, a 404 request.

**Acceptance Scenarios:**

1. **Given** the export, **Then** `/projects` and `/` each show one agent-fleet card. _(AC2)_
2. **Given** two clean builds, **Then** `sitemap.xml` has 5 `<loc>` (REV1) and there are 5 OG PNGs (REV1), each 1200×630, ≤ 300 KB, with equal sha256 across the builds. _(AC2)_
3. **Given** the three project routes, **Then** each carries one `SoftwareApplication` JSON-LD entry, and `/projects/no-such-project` is a 404. _(AC2)_

---

### User Story 3 — Empty reads as a design (Priority: P1)

The fleet has no tech stack and no outbound links by design. Its card simply ends after the tagline (and summary), and its panels end after the description (or metrics). I see no empty chip row, no bare "Source" heading, no divider and no placeholder.

**Independent Test:** `empty-render-probe.mjs` counts (with positive controls on the existing projects); screenshots at 390/1440 × light/dark; OG PNGs.

**Acceptance Scenarios:**

1. **Given** the agent-fleet card on `/`, `/projects` and `404`, **Then** there are 0 `ul[aria-label="Tech"]`, 0 chip `li` and 0 "Source" links, while the controls show chips on the existing cards. _(AC3)_
2. **Given** each of the 14 panels, **Then** there are 0 chip nodes, 0 "Tech"/"Links" headings, 0 external links and 0 `hr`. _(AC3)_
3. **Given** the route header, **Then** there is no "Project links" list and no Connections strip. _(AC3)_

---

### User Story 4 — Nothing operational leaks (Priority: P1)

As the operator, I need proof that no address, token, private repository, account id, path or reproducible-setup detail reached the content or the build, and that the proof would have caught one if it had.

**Independent Test:** `redaction-scan.test.ts` (canary red → green, ledger negatives, G1); the `build` script's G2 step; `source-map.md`; the signed G5 table.

**Acceptance Scenarios:**

1. **Given** `agent-fleet.json`, **Then** G1 reports 0 hits. _(AC4)_
2. **Given** the production export, **Then** G2 reports 0 unexempted hits on all five routes (REV1), with the per-rule accounting. _(AC4)_
3. **Given** a seeded fake IP, a `ghp_` token and a private repo name, **Then** both scanner surfaces report 3/3, and the test was red against a stub first. _(AC4)_
4. **Given** every number and factual sentence, **Then** `source-map.md` names its source; the orchestrator's read of every `summary`/`description`/`story.*` string is signed. _(AC4)_

---

### User Story 5 — A keyboard and screen-reader user can use the route (Priority: P1)

I can reach every panel and flow control by keyboard, always see where focus is, tap every control comfortably on a phone, and read everything in both palettes.

**Independent Test:** `a11y:axe:site` (+ panel-open and flow-playing runs), the keyboard walk in `route-probe.mjs`, focus screenshots, the tap-target scan.

**Acceptance Scenarios:**

1. **Given** `/projects/agent-fleet` in light and dark, **Then** axe reports 0 serious / 0 critical, including contrast. _(AC5)_
2. **Given** keyboard only, **Then** all 14 panels open, focus their heading, close with Esc and return focus; all 3 flows start, pause and step. _(AC5)_
3. **Given** 390 px, **Then** every interactive element is ≥ 44×44 and shows a visible focus ring. _(AC5)_

---

### User Story 6 — The rest of the site is unchanged and every gate holds (Priority: P1)

The existing two teardowns, the home hero and the performance budgets are as they were. CI is green and no sealed engine surface moved.

**Independent Test:** CI 7/7; Lighthouse ×5; `site-probe` CLS/draws; `perf:weight`; `eager:probe`; `guards.sh`; `bytes-report.mjs` (C3); the S16 sweep.

**Acceptance Scenarios:**

1. **Given** the PR head, **Then** CI shows 7/7 required contexts green; Lighthouse ≥ 95/95 on five routes (REV1); CLS 0; weight < 3 MB; 2 draw calls; the eager hero reveals with zero interaction; S2–S8 are empty. _(AC6)_
2. **Given** base and head exports with a fixed build id, **Then** `/` and `/projects` differ only by the added card/entry; both existing project pages' own files are identical after chunk-name masking (C3); their `measured-on` strips are unchanged; the S16 sweep reports 0 intersections. _(AC7)_

---

### Edge Cases

- **A component with metrics but no techs/links** (`approval-gate`, `cron`): the Metrics section shows; Tech and Links do not.
- **Components on no flow** (`chat-surface`, `workstation`): they open a panel like any other; no flow highlights them.
- **No-JS:** the `<noscript>` outline lists layers and components; there is no tech or link row to collapse.
- **OG card:** it has no chip field, so empty techs change nothing; it is light-only by design (RFC §4.4).
- **A dependency update adds a vendor string to the build:** G2 fails closed; the fix is one reviewed ledger line (RFC R2).
- **A G4 row with no source:** STOP; Murphy or Merlin amends the canonical JSON; the orchestrator never edits it (Q3).

## Requirements _(mandatory)_

### Functional Requirements (1:1 with the brief's acceptance criteria, verbatim)

- **FR-001 (AC1) — the route.** "`/projects/agent-fleet` renders 4 layers / 14 components / 3 flows; every component opens a panel; every flow plays; every component name ≤ 14 chars and layer name ≤ 16; ids match the canonical JSON one-for-one; the fidelity test is deep-equal for the converted module."
  - SR-001a: conversion and registration per RFC §2 (converter row, generated source, module, `PROJECTS` append-last, `PROJECT_SOURCES`), with no relationship file and no registry entry.
  - SR-001b: the two-project assumptions in RFC §3 rows 3–7 updated; the e2 fix (R-E).
- **FR-002 (AC2) — registration everywhere.** "The project appears on `/projects` and in the home projects section; sitemap has **4** `<loc>`; **4** OG cards, each 1200×630, ≤ 300 KB, byte-identical across two builds; JSON-LD carries three `SoftwareApplication` entries; unknown routes still 404."
  - **REV1:** "sitemap has **5** `<loc>`; **5** OG cards" (the rest unchanged).
  - SR-002a: `perf.yml` gains the agent-fleet Lighthouse and weight steps (Q6).
- **FR-003 (AC3) — empty is a design, not a hole.** "With zero techs the card shows **no chip row** and no empty container; with zero links the panel shows **no Source section**, no divider, no placeholder. Evidence: card, panel and OG card screenshots at 390/1440, both palettes — plus the computed element counts (0 chip nodes, 0 source nodes)."
  - SR-003a: `TechChipList` returns `null` for zero chips; no new utility class (RFC §4.1).
  - SR-003b: the `site-probe` chip rule derives the expected count from the source's techs (RFC §3 row 7).
- **FR-004 (AC4) — sanitization.** "G1/G2 **0 hits**, G3 canary **3/3**, G4 source map complete (every number has a source), G5 manual read signed. The scanner is committed as a repo script with a test that feeds it a seeded string and expects a failure."
  - **REV1:** "G2 = **0 unexempted hits** on all five routes; every raw hit accounted for by the committed exemption ledger whose structural rules each carry a negative test."
  - SR-004a: `apps/web/scripts/redaction-scan.ts` (one module, R-A); `build` runs G2 on the production export (R-B); `pnpm test` runs G1, G3 and the ledger negatives.
  - SR-004b: the canary is assembled at run time; it stays gitleaks-clean (RFC §5.4).
  - SR-004c: `source-map.md` in the RFC §5.6 format; Murphy's pointers for the vault/config numbers (Q5).
- **FR-005 (AC5) — accessibility.** "axe 0 serious / 0 critical on the new route in both palettes; full keyboard pass through the panel and the flow controls; visible focus; tap targets ≥ 44×44; contrast AA."
- **FR-006 (AC6) — gates.** "Full CI green (7 required contexts); Lighthouse ≥ 95/95 on all four routes; CLS 0; weight < 3 MB; 2 draw calls; eager hero reveal intact; **S2–S8 empty**."
  - **REV1:** "Lighthouse ≥ 95/95 on all **five** routes" (`/`, `/projects`, three project routes; the brief's Constraints line).
  - SR-006a: `guards.sh` (S2–S8 seal lists, S3 tools list, frozen files, allowed paths, no new dependency).
- **FR-007 (AC7) — the other two projects are untouched.** "`/` and `/projects` change only by the added card/list entry; both existing project pages are byte-identical **in their own files** (prefetched payloads listed separately, per the S17 ruling); the `measured-on` strips are unchanged; the S16 label sweep still reports 0 intersections."
  - SR-007a: ruling **C3**: own-file comparison with hashed chunk names masked, plus a proof that the renamed chunks differ only by agent-fleet data and the cascaded names.
  - SR-007b: the 404 page also gains the card; reported with `/projects` as an "added entry" change.

### FR ↔ AC mapping

| FR | AC | RFC gates (§8) | Tasks |
|---|---|---|---|
| FR-001 | AC1 | fidelity (a)–(e2), content-model ids/counts/lengths, route probe 4/14/3 + 14 panels + 3 flows | T002, T004 |
| FR-002 | AC2 | `site-probe` cards, sitemap 5 (REV1), OG 5 × dims/bytes/hash ×2 builds (REV1), JSON-LD ×3, 404 | T004 |
| FR-003 | AC3 | empty-render counts with controls, screenshots 390/1440 × light/dark, OG PNGs | T003 |
| FR-004 | AC4 | G1 0, G2 0 unexempted (REV1), G3 red → green 3/3, G4 map, G5 signed | T001, T005 |
| FR-005 | AC5 | axe ×2 palettes (+ panel open, flow playing), keyboard 14/14 + 3/3, focus, tap targets, contrast | T006 |
| FR-006 | AC6 | CI 7/7, Lighthouse ×5 (REV1), CLS, weight, draws, eager hero, S2–S8 | T007 (all tasks run the suite + guards) |
| FR-007 | AC7 | bytes report (C3), existing OG identical, Connections markup, S16 sweep 0 + control | T007 |

### Key Entities

- **Canonical content:** `.specify/content/agent-fleet.json` (sha256 `813487c9…`), read-only.
- **Converted module:** `apps/web/content/projects/agent-fleet.source.ts` (`agentFleetSource`, generated) and `agent-fleet.ts` (`agentFleet: Project`).
- **Redaction hit:** `{ classId, ruleId?, file, offset, prefix }`; a hit is *exempted* when a ledger rule matches it, *unexempted* otherwise.
- **Exemption ledger:** structural rules X1–X4 and exact-string rules X5–X7 (RFC §5.3), in `redaction-scan.ts`.
- **Source-map row:** `{ #, JSON path, claim, kind, source type, pointer, value, status }` (RFC §5.6).

## Success Criteria _(mandatory)_

The success criteria are AC1–AC7 as quoted in FR-001…FR-007, read with the REV1 lines. None is added.

## Assumptions

- The seven required CI contexts are the ones in the `main` ruleset (read 2026-11-17): build, secrets (gitleaks), perf-gate lighthouse, perf-gate weight, a11y axe, perf fixture exclusion, seo meta + og.
- "Source section" means the panel's Links section, the route header's "Project links" list and the list card's "Source" link (RFC §4.2).
- Seal bases are unchanged since S16/S17 (RFC §1).
