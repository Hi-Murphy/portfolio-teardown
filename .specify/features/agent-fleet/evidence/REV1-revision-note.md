# S18 — brief revision 1 of 2 (note for Merlin)

**Date:** 2026-11-17 · **Decided by:** Murphy at Gate 1 ("all defaults. go") · **Counter:** 1 of 2 used · **Brief file:** unchanged (frozen); this note and `rfc.md` §12 carry the revision

## What conflicted

1. **Counts (E1).** AC2 says "sitemap has **4** `<loc>`; **4** OG cards". AC6 and the kickoff say "all **four** routes". The site already had 4 `<loc>` and 4 OG cards before S18 (`/`, `/projects`, two project routes; S13 `jev-content/evidence/T007-log-sitemap.txt`). Registering a third project yields **5** of each (`T000-log-rfc-spike.md` §1). The brief's own Constraints line already lists five routes.
2. **G2 "0 hits" (E2).** Applied verbatim to the raw bytes of the export, the F-patterns hit **3,046** times on the S17 site, before any agent-fleet byte exists. None of them is a secret: SVG path numbers, float fractions, minified ternaries, `mask-image`, the R3F `a.internal` member, MIME types, zod's int64 bounds, and the site's own public contact address (`T000-log-rfc-spike.md` §4).

## Decision

- **AC2:** **5** `<loc>`, **5** OG cards (each 1200×630, ≤ 300 KB, byte-identical across two builds). **AC6 / G2:** all **five** routes.
- **G2:** **0 unexempted hits**. The F-patterns are unchanged. Every raw hit must match a rule in a committed exemption ledger (`rfc.md` §5.3: structural rules X1–X4, each with a negative test that a realistic secret of its class is not exempted; exact-string rules X5–X7 with their origin named). The G2 report shows the full accounting per route and a base-vs-head differential.

## What did not change

- AC1, AC3, AC5 and AC7, word for word. AC2, AC4 and AC6 apart from the two points above.
- The redaction contract table F1–F9, the implication ban, G1 (0 hits, no exemptions), G3 (3/3), G4 and G5.
- Zero techs (D-44), no relationship file (D-45), the six metrics.

## Also recorded (not a revision)

- **C3 (ruling):** AC7's "own files byte-identical" for the two existing project pages is checked with hashed chunk names masked. The lazy workbench chunk bundles every project since S13, so adding any project renames it and the two small chunks that reference it (`rfc.md` §7).
- **Backlog suggestions:** per-project lazy chunks (so a future project leaves existing pages byte-identical); the `site.json` about copy still says "Both started as side projects".

## Addendum (Stage 3, not a revision)

- **C3 extended by E5-A (Murphy):** the existing project pages also carry the 404's project-card list in their embedded RSC payload. AC7's own-file check therefore allows that added entry (plus RSC row-id renumbering), with the rendered DOM identical.
- **E4-A (Murphy):** a pre-existing invisible Tab stop (the canvas-fallback copy of the project outline) was fixed on all three project routes; the visible no-WebGL fallback keeps its Tab stop.
- **Content amendment:** your `eda5c82`, recorded as R-K.
- **Backlog suggestions, added:** the 404 page's project list makes every new project touch every page's payload; consider whether the 404 should list projects at all.
