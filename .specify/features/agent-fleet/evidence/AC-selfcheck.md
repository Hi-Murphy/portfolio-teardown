# S18 AC self-check: agent-fleet teardown

**Brief:** `.specify/slices/slice-18-agent-fleet.md` (frozen v1; **revision 1 of 2**: counts 4 → 5, G2 = 0 unexempted hits; `evidence/REV1-revision-note.md`) · **Rulings:** C3 (chunk-name masking) extended by E5-A; E4-A (canvas-fallback Tab stop fix) · **RFC:** `rfc.md` §12 · **Ledger:** `tasks.md` · **Content:** `agent-fleet.json` at `eda5c82` (Merlin amendment, R-K)

| AC | Verdict | Evidence | Numbers |
|---|---|---|---|
| **AC1** the route | **MET** | `T002-log-green.txt`, `T004-log-route-probe.{txt,json}`, `T004-log-site-probe.txt` | Route renders **4 layers / 14 components / 3 flows**. Panels open **14/14**, flows play **3/3** (full step sequences 0–4, 0–4, 0–2). Longest component name 13 chars (≤ 14); longest layer name 13 (≤ 16). Layer, component and flow ids equal the canonical JSON one-for-one (content-model test). Fidelity (a)–(e2) deep-equal for all 3 converted modules |
| **AC2** registration everywhere | **MET** (REV1 counts) | `T004-log-{sitemap,og,seo-probe,404,cards}.txt`, `T004-og-*.png` | On `/projects` and the home section (site-probe cards 43/43). Sitemap **5** `<loc>`. **5** OG cards, each 1200×630, ≤ 91,277 B, sha256 equal across two clean builds; `agent-fleet.png` 71,217 B. JSON-LD: 1 `SoftwareApplication` per project page = **3**. `/projects/no-such-project` → **404** |
| **AC3** empty is a design | **MET** | `T003-log-empty-counts.{txt,json}`, `T003-screenshot-*.png` (16), `T004-og-agent-fleet.png` | **0 chip nodes, 0 source nodes**: 72/72 agent-fleet cells (card on `/`, `/projects`, `404`; route header; all 14 panels) at 390/1440 × light/dark, with 20/20 positive controls on the existing projects. No empty container, no divider, no placeholder. CSS byte-identical. The OG card has no chip field (light-only by design) |
| **AC4** sanitization | **MET** (REV1 G2) | `T001-log-{red,canary-green,g1,g2-base,g2-seeded}.txt`, `T005-log-{g1,g2,g2-diff,g2-seeded}.txt`, `source-map.md`, `T005-log-g5-read.md` | **G1 0 hits** (no exemptions). **G2 0 unexempted** on all 5 routes, run inside `pnpm build`; vs. the S17 build, the only new distinct strings are 6 geometry floats (X1). **G3** red (stub, 23 failed) → green; canary **3/3** in content, build and prose modes; seeded export → exit 6. **G4** every number (9) and fact (22) SOURCED. **G5** 53 strings read end to end, 0 open flags; signed below |
| **AC5** accessibility | **MET** | `T006-log-axe.{txt,json}`, `T006b-log-axe.txt`, `T006-log-keyboard.{txt,json}`, `T006-log-tap-targets.json`, `T006-screenshot-focus-*.png`, `T006b-log-outline-tabstop.txt` | axe **0 serious / 0 critical** in every state (incl. panel open, flows step 1, no-WebGL), light and dark, desktop and mobile. Keyboard: panels **14/14**, flows **3/3** in 4 cells. Visible focus **102/102** stops after E4-A removed the invisible canvas-fallback stop. Tap targets **43/43** ≥ 44×44. Contrast covered by axe |
| **AC6** gates | **MET** | `T007-lighthouse-summary-*.json`, `T007-log-{lighthouse,cls-draws,weight,eager,guards,suite}.txt`, `T007-ci.md` | Lighthouse (mobile, median of 3) **1.00 / 1.00** on `/`, `/projects` and the 3 project routes (REV1: five). CLS **0**. Weight: home 462,906 B, projects 212,584 B, agent-fleet 202,364 B (mobile) — all < 3 MB. Draw calls **2** (incl. agent-fleet). Eager hero reveal **2/2**. **S2–S8 empty** (guards 12/12; `packages/xploder` untouched). CI on PR #29: **11/11 green, 7/7 required** (`T007-ci.md`); Vercel preview Lighthouse ≥ 0.99 perf / 1 a11y on all 5 routes |
| **AC7** the other two untouched | **MET** (C3 + E5-A) | `T007-log-bytes.md`, `T007-log-sweep.{md,json}`, `T007-log-sweep-control.txt` | `/`, `/projects`, `404` change only by the added card/entry. Existing project pages: rendered DOM identical; payload differs only by the added 404 card entry and RSC row-id renumbering (C3-only view: FAIL; C3 + E5-A view: **PASS**). Existing OG cards byte-identical. `measured-on` strips byte-equal. S16 sweep **2,052 cells, 0 hits**, control 3/3. JS +2,712 B gzip, all in the lazy workbench chunk (agent-fleet data + the E4 fix) |

## Report-only (not gates)

- Agent-fleet label sweep (Q7): 408 cells, 0 hits (`T007-log-sweep-agent-fleet.md`).
- Executor tiers: Flash completed every task. The stops were spec gaps fixed by the orchestrator (R-G–R-M), not Flash failures. Tier 1.5 dormant; skip recorded per task.

## Corrections and rulings during Stage 3 (all in `rfc.md` §12)

R-G, R-H (ledger), R-I (prose-guard scope), R-J (no local paths in evidence), R-K (Merlin's content amendment), R-L (prose scan mode), R-M (probe focus rule), E4 → A (canvas-fallback Tab stop), E5 → A (C3 extended), T000 spike-log correction.

## G5 signature

I read every `summary`, `description`, `tagline` and `story.*` string of `.specify/content/agent-fleet.json` at `eda5c82` end to end (53 strings; `T005-log-g5-read.md`). None contains a quoted prompt or schema, an identifier, a vendor or product name, an uptime or cost figure, a region, or anything that would let a reader reproduce the setup.

**Signed:** orchestrator (Opus 5.5), S18, 2026-11-17. **Murphy reads the rendered page at the gate.**

## Needs Murphy's hands

1. Read `/projects/agent-fleet` on the Vercel preview (brief G5).
2. Say "merge" when satisfied (brief "Murphy dependencies").
