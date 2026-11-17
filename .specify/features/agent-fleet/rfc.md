# RFC — S18 Agent-fleet teardown (third project)

**slice:** S18-agent-fleet · **status:** APPROVED at Gate 1 (2026-11-17): all §11 defaults; brief revision 1 of 2 (E1, E2); ruling C3 (E3); refinements R-A–R-F (§12) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-18-agent-fleet.md` (frozen brief v1, revision counter **1 of 2** after Gate 1) · **branch:** `task/s18-agent-fleet` · **base:** `33e2ba1` (product code = S17 merge `d5c7756`) · **date:** 2026-11-17

> This RFC records design decisions only. It does not change scope. Where it seems to conflict with the brief, the brief wins and the conflict is raised in §11. Nothing here is implemented. The one throwaway spike was reverted (`evidence/T000-log-rfc-spike.md`).

---

## 1. Context (from the brief)

- **Mission:** wire the third teardown, the agent fleet that built this site, through the existing pipeline under a **redaction contract**. Prove three things: it renders, no secret reaches the build, and the two existing projects are undisturbed.
- **Scope (four things):** (1) convert + register; (2) render with nothing to render (zero techs, zero links); (3) fleet-wide surfaces (`/projects`, home section, sitemap, OG, JSON-LD, the route); (4) sanitization proof (G1–G5 + canary + source map).
- **Binding:** no content edits, no tech-registry additions, no relationship file, no engine work (**S2–S8 empty**), no new dependency, no new route beyond the project route, no home redesign. Gates unchanged.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — the route.** `/projects/agent-fleet` renders 4 layers / 14 components / 3 flows; every component opens a panel; every flow plays; every component name ≤ 14 chars and layer name ≤ 16; ids match the canonical JSON one-for-one; the fidelity test is deep-equal for the converted module.
- **AC2 — registration everywhere.** The project appears on `/projects` and in the home projects section; sitemap has **4** `<loc>`; **4** OG cards, each 1200×630, ≤ 300 KB, byte-identical across two builds; JSON-LD carries three `SoftwareApplication` entries; unknown routes still 404.
- **AC3 — empty is a design, not a hole.** With zero techs the card shows **no chip row** and no empty container; with zero links the panel shows **no Source section**, no divider, no placeholder. Evidence: card, panel and OG card screenshots at 390/1440, both palettes — plus the computed element counts (0 chip nodes, 0 source nodes).
- **AC4 — sanitization.** G1/G2 **0 hits**, G3 canary **3/3**, G4 source map complete (every number has a source), G5 manual read signed. The scanner is committed as a repo script with a test that feeds it a seeded string and expects a failure.
- **AC5 — accessibility.** axe 0 serious / 0 critical on the new route in both palettes; full keyboard pass through the panel and the flow controls; visible focus; tap targets ≥ 44×44; contrast AA.
- **AC6 — gates.** Full CI green (7 required contexts); Lighthouse ≥ 95/95 on all four routes; CLS 0; weight < 3 MB; 2 draw calls; eager hero reveal intact; **S2–S8 empty**.
- **AC7 — the other two projects are untouched.** `/` and `/projects` change only by the added card/list entry; both existing project pages are byte-identical **in their own files** (prefetched payloads listed separately, per the S17 ruling); the `measured-on` strips are unchanged; the S16 label sweep still reports 0 intersections.

### Starting point (checked on this branch at `33e2ba1`)

- **Canonical content:** `.specify/content/agent-fleet.json`, sha256 `813487c9…`. Measured: 4 layers, 14 components, 3 flows, 14 unique ids, every flow step a known id. The longest component name is 13 chars ("Approval gate", "Review thread"); the longest layer name is 13 ("Human surface"). 0 techs, 0 component links, 0 `meta.links`. 146 string leaves, 52 of them in `summary`/`description`/`story.*`. Two components sit on no flow (`chat-surface`, `workstation`). That is allowed: AC1 asks that every component opens a panel and every flow plays.
- **The branch is red right now.** The JSON was committed before registration. Four completeness tests fail: `content-fidelity` › completeness, `no-hand-copied-content` › "every canonical project has a generated source module" and "agent-fleet … carries every collected project string", and `tools/perf` `project-sources` › "matches the content set". All four turn green with registration (§2). Nothing else fails: web 344 passed / 3 failed, perf 2 passed / 1 failed.
- **The panel already collapses empty sections.** In `packages/xploder/src/react/panel/DetailPanel.tsx` (sealed), the Tech section (`model.chips.length === 0 ? null`), Metrics and Links sections each render nothing when empty: no heading, no divider, no placeholder. `CaseStudyPanel` has no links section. **No library change is needed, or allowed.**
- **The card does not collapse.** `apps/web/components/tech-chip-list.tsx:21-39` always renders `<ul aria-label="Tech">`, even for zero chips. The spike shows an empty labelled list on `/`, `/projects` and `404` (§4).
- **The project route already collapses.** `app/(site)/projects/[slug]/page.tsx:71` skips the "Project links" list when `meta.links` is empty. `components/connections.tsx` returns `null` for zero connections. `seo/json-ld.ts:49` omits `codeRepository` when there is no Source link. The OG card never renders chips.
- **Seal bases** (unchanged since S16/S17): S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `c8794b2`, S7 `cc663f7`, S8 `c8794b2` (the `frozen-surface*.paths` lists). S3 is the `tools/perf` file list in `label-system/guards.sh:49-51`. `project-sources.ts` and `site-probe.ts` are **not** on it.

### Pre-RFC spike (throwaway, reverted; full log `evidence/T000-log-rfc-spike.md`)

The orchestrator wired the minimal registration (converter entry, generated source, module, `PROJECTS` entry), built it, and compared it with a base build. Both builds used a fixed build id.

| Probe | Result |
|---|---|
| Build | exit 0, `/projects/agent-fleet` prerendered |
| Sitemap / OG | **5** `<loc>`, **5** PNGs, each 1200×630; `agent-fleet.png` 71,217 B; the two existing project PNGs byte-identical |
| Stylesheet | byte-identical |
| Existing project HTML | **differs by one chunk filename** (×3 occurrences per file); details in §7 |
| Client JS | +2,685 B gzip, all of it in the lazy workbench chunk (it bundles every project) |
| Empty `<ul aria-label="Tech">` | present on the agent-fleet card on `/`, `/projects` and `404` |
| Brief regexes on the raw export | **3,046 hits on the base before any agent-fleet byte**; 3,910 on the spike. The only *new distinct* strings are 6 float fractions from the new poster geometry (§5.3) |
| G1 on the JSON | **0 hits** |

---

## 2. Conversion and registration path (AC1)

Five edits, in this order, with nothing per-project except the new rows:

1. **`apps/web/scripts/convert-content.ts:23-54`** (`CONTENT_FILES`): add one entry after the jev-toolkit project entry (line 35):
   `{ source: '.specify/content/agent-fleet.json', target: 'content/projects/agent-fleet.source.ts', exportName: 'agentFleetSource', typeImport: { typeName: 'ProjectInput', moduleSpecifier: 'xploder' } }`.
2. **Run** `pnpm --filter web content:convert`. That writes `apps/web/content/projects/agent-fleet.source.ts` (`export const agentFleetSource = <JSON> satisfies ProjectInput`, with header sha256 `813487c9…`). The other generated files are rewritten byte-identically (the spike confirmed it: `git status` showed only the new file).
3. **New `apps/web/content/projects/agent-fleet.ts`**, a copy of the `jev-toolkit.ts` shape: `defineProject(agentFleetSource, { registry: SITE_REGISTRY, source: 'agent-fleet' })`. With `techs: []` everywhere, the registry is never consulted, and no registry entry is added (D-44).
4. **`apps/web/content/projects/index.ts:4-5,18`**: import `agentFleet`; `PROJECTS = [websocketInspector, jevToolkit, agentFleet] as const`. The order is **append-last**, so `PROJECTS[0]` stays websocket-inspector. Hero, home OG silhouette, `seo-card`/`seo-json-ld`/`seo-metadata` tests and the `site-probe` drill card all key on `PROJECTS[0]`.
5. **`tools/perf/src/project-sources.ts:1-4`**: import `agentFleetSource` and append it to `PROJECT_SOURCES`. The perf probes (`site-axe`, `site-probe`, `seo-probe`) then cover the new route with no other edit.

**No relationship file** (D-45): `content/projects/connections.ts:6-9` gets no entry. `connectionsFor('agent-fleet')` returns `[]` and the strip renders `null`. The relationship completeness test (`content-fidelity.test.ts:199-222`) is driven by `.specify/content/relationships/`, which stays untouched, so it stays green.

### What the fidelity test compares (`apps/web/test/content-fidelity.test.ts`, one new row in `rows`, lines 26-47)

| Assertion | Compares | Proves |
|---|---|---|
| (a) | `agentFleetSource` `toStrictEqual` `JSON.parse(agent-fleet.json)` | the converted module is deep-equal to the canonical JSON (AC1 "fidelity test is deep-equal") |
| (b) | `agentFleet` `toStrictEqual` `parseProject(json, { registry })` | the module the site uses is the library parse of the canonical JSON: same 4/14/3 and ids, one-for-one |
| (c) | `convert-content.ts --check` exits 0 | the generated file is not stale |
| (d) | first line of `agent-fleet.source.ts` = header with the JSON's sha256 | provenance |
| (e) | a mutated `meta.tagline` copy is **not** equal | the comparison can fail |
| (e2) | a mutated nested `summary` copy is **not** equal | nested comparison can fail. **Needs an edit:** line 119 hard-codes `layers[4]!.components[2]!`, but agent-fleet has 4 layers, so `layers[4]` is `undefined` and the test throws. The fix is to address the last layer's first component (`layers.at(-1)!.components[0]!`) for every row, which keeps the existing rows' intent. |
| completeness (176-197) | content dir slugs = fidelity rows = converter entries = `PROJECT_SLUGS` | registration is complete everywhere at once |

AC1's id check also runs a dedicated assertion in `content-model.test.ts`: the set of layer, component and flow ids in `agentFleet` equals the set in the JSON, with counts 4/14/3, max name lengths ≤ 14 / ≤ 16, and every `flow.path` id resolves. "Renders 4/14/3" in the DOM is measured by the existing `site-probe` teardown counts (`expectedTeardownCounts`, `site-probe.ts:531`) on the exported route. "Every component opens a panel / every flow plays" is a Playwright pass over the live route: 14 component opens and 3 flow plays, reusing the `panel-probe`/`engine-probe` helpers. The output is in §8.

---

## 3. Every place that assumes two projects

**Edit** = must change in S18. **Auto** = derives from `PROJECTS`/`INDEXABLE_ROUTES`/`PROJECT_SOURCES` and needs no edit (verified in the spike or by reading the code).

| # | File:line | Assumption | S18 action |
|---|---|---|---|
| 1 | `apps/web/scripts/convert-content.ts:23-54` | two project entries | **Edit**: add the agent-fleet entry (§2.1) |
| 2 | `apps/web/content/projects/index.ts:4-5, 18` | `PROJECTS = [websocketInspector, jevToolkit]` | **Edit**: import + append (§2.4) |
| 3 | `apps/web/test/content-model.test.ts:5-6, 134-138, 140-143` | `PROJECTS` toEqual two; `PROJECT_SLUGS` toEqual two slugs; `getProject` for two | **Edit**: three-element expectations; add an agent-fleet card-model case (`chips: []`, `tagline` from JSON) and the AC1 id/count/length case |
| 4 | `apps/web/test/content-fidelity.test.ts:12-17, 26-47, 119` | two rows; `layers[4]` | **Edit**: import + row; e2 index fix (§2) |
| 5 | `tools/perf/src/project-sources.ts:1-4` | two sources | **Edit** (§2.5) |
| 6 | `tools/perf/test/project-sources.test.ts:6-7, 55-58, 66-70` | `sourcesBySlug` has two; the negative control does a literal `replace` of `'PROJECTS = [websocketInspector, jevToolkit] as const'` | **Edit**: add the slug; update the replace target to the three-element text, or the control silently stops mutating |
| 7 | `tools/perf/src/site-probe.ts:277-278, 420-432, 2813` | `CARD_CHIP_MIN = 1`: every card must show ≥ 1 chip | **Edit** (§4.3): the expected chip count derives from the source's techs (0 for agent-fleet); a 0-tech card must have **no** `ul[aria-label="Tech"]` |
| 8 | `.github/workflows/perf.yml:53-64` (Lighthouse), `:104-115` (weight) | one hard-coded step per project route | **Edit**: add `projects/agent-fleet` steps, mirroring the S13 jev-toolkit steps (Q6) |
| 9 | `app/(site)/projects/page.tsx:21` | maps `PROJECTS` | Auto (list card, `variant="list"`) |
| 10 | `components/home/projects-section.tsx:17-23` | maps `PROJECTS` + one empty-note tile, `md:grid-cols-2` | Auto: 3 cards + note = a 2×2 grid at ≥ md; one more stacked card at 390. Visual check in T004 |
| 11 | `app/not-found.tsx:18, 40` | maps `PROJECTS` (the 404 lists cards) | Auto: the 404 gains the card. Reported under AC7 as "added entry" |
| 12 | `app/sitemap.ts:9` ← `seo/routes.ts:26-37` | `INDEXABLE_ROUTES` = home + projects + one per project | Auto: **5** `<loc>` (§11 E1) |
| 13 | `scripts/build-og.ts:28` ← `INDEXABLE_ROUTES`; `seo/og/card-model.ts:60-111`; `seo/og/card.tsx:288-289` | one card per route; home/projects title-block rows = all names (limit 6); projects card = one silhouette per project, width split by count | Auto: **5** PNGs; `home.png` and `projects.png` change (third row / third silhouette) |
| 14 | `seo/json-ld.ts:34-51` ← `app/(site)/projects/[slug]/page.tsx:51` | one `SoftwareApplication` per project page | Auto: the third entry, on `/projects/agent-fleet`; `description` = `meta.summary`; no `codeRepository` |
| 15 | `app/(site)/projects/[slug]/page.tsx:18-22` | `generateStaticParams` from `PROJECT_SLUGS`, `dynamicParams = false` | Auto: route prerendered, unknown slugs still 404 |
| 16 | `test/no-hand-copied-content.test.ts:15` | enumerates `.specify/content/*.json` | Auto: green once `agent-fleet.source.ts` exists |
| 17 | `test/seo-card.test.ts:314-319` | "the project silhouette contains its five layer slabs" for the **first** project route | Auto (first = websocket-inspector). Lines 296-311 loop over every route and use each project's own layer count |
| 18 | `test/seo-routes.test.ts`, `seo-sitemap.test.ts`, `seo-expect.write.test.ts` | derive from `PROJECTS`/`INDEXABLE_ROUTES` | Auto |
| 19 | `packages/xploder/test/label-sweep.test.ts:92-109`, `label-pass-parity.test.ts:79-80`, `lettering-obstacles.test.ts:79-80` | hard-code the two projects | **Do not touch** (sealed S6/S7). AC7's sweep = these tests unchanged → still 0 |
| 20 | `content/site.json` `about` copy: "…an inspector for WebSocket traffic, and a benchmark … **Both** started as side projects…" | prose about two projects | **No edit** (no content edits). Reported to Murphy as a content note (Q9) |

---

## 4. Empty rendering (AC3)

### 4.1 Card: no chip row, no empty container

**Change (one file, app-level, not sealed):** `TechChipList` returns `null` when `chips.length === 0`.

```tsx
export function TechChipList({ chips, className }: TechChipListProps) {
  if (chips.length === 0) return null;
  return (<ul aria-label="Tech" …>…</ul>);
}
```

- **Why here and not in the card:** the compact card (home, 404) and the list card (`/projects`) both use it. One guard covers all three surfaces, and the same pattern already exists in `Connections` (`connections.length === 0 → null`) and in `DetailPanel`.
- **Layout:** the chip list sits in a `flex flex-col gap-3` column. An empty `ul` is still a flex item and adds one `gap-3` (0.75 rem) of blank space under the tagline (list card: under the summary). Returning `null` removes both the node and the gap. The card then ends at the tagline/summary, which is the intended "nothing to list" look. **No new class:** the stylesheet stays byte-identical (S17 rule R0; the spike confirms the CSS is unchanged).
- **Existing cards:** both have ≥ 1 chip, so their markup is byte-identical. The guard only changes output for 0 chips.
- **a11y win:** an empty labelled list is announced as "Tech, list, 0 items". Removing it removes a confusing landmark.

### 4.2 Panel: no Source section, no divider, no placeholder

Already true in the sealed library (§1). For every agent-fleet component, `DetailPanel` renders the h2 name, the `kind · status` meta line, summary and description. It adds **Metrics** only for `approval-gate` ("Gates per slice 2") and `cron` ("Scheduled jobs 12"). It never renders the Tech or Links heading. There is no `<hr>` and no border element between sections (sections are spaced by `margin` only). **No code change.**

"Source section" covers three surfaces, all checked:
- **Panel:** the Links section (`PANEL_SECTION_TITLES.links` = "Links"; it lists component links).
- **Route header:** `ul[aria-label="Project links"]` (it lists `meta.links`, e.g. jev-toolkit's "Source").
- **List card:** the `Source` anchor in `project-card.tsx:98-105`.

### 4.3 Computed element counts (the AC3 numbers)

An evidence probe (`.specify/features/agent-fleet/empty-render-probe.mjs`, Playwright from `tools/perf`'s dependencies) runs on `pnpm serve:out`, at 390 and 1440, in light and dark, and reports:

| Surface | Selector (counted) | Expected agent-fleet | Control (must be > 0) |
|---|---|---|---|
| `/` card | `[data-site-card="agent-fleet"] ul[aria-label="Tech"]`, `… li` | 0, 0 | websocket-inspector card: 1 ul, 4 li |
| `/projects` card | same + `[data-site-card="agent-fleet"] a` with text `Source` | 0, 0, 0 | jev-toolkit: 1 ul, 1 li, 1 Source |
| `404` card | same as `/` | 0, 0 | websocket-inspector: 1 ul |
| Route header | `ul[aria-label="Project links"]` | 0 | `/projects/jev-toolkit`: 1 |
| Route | `[data-site-connections]` | 0 | `/projects/jev-toolkit`: 1 |
| Panel, opened for **each of 14** components | `[data-xploder-panel-surface] [data-xploder-chip]`; `h3` with text `Tech`; `h3` with text `Links`; `a[target]` inside the surface; `hr` | all 0 for each of 14 | jev-toolkit component with techs/links: chips > 0, Links h3 = 1 |
| Empty-node sweep | inside each agent-fleet card and panel: any `ul`/`ol`/`dl`/`div` with no element children and empty text | 0 | — |

Every row has a positive control on an existing project. A probe that cannot see chips would fail the control instead of passing silently. The counts are written to `evidence/T003-log-empty-counts.json`. `site-probe` (§3 row 7) applies the same rule permanently: for a source with zero techs the expected chip count is 0 and `ul[aria-label="Tech"]` must be absent; for others it stays 1–4.

### 4.4 OG card

The OG card model (`seo/og/card-model.ts`) has no chip field. An agent-fleet card is eyebrow + name + tagline + silhouette + title block of its four layer names. There is nothing empty to hide. Evidence: `og/projects/agent-fleet.png` plus `og/projects.png` (three silhouettes) and `og/home.png` (three rows), committed as screenshots. The OG card is light-only by design (S11 test "uses only light blueprint colours"), so "both palettes" for the OG card means the one palette it has. Recorded, not a gap.

### 4.5 Screenshots (AC3)

`pnpm evidence` captures: card on `/` and `/projects`, and the panel open on `approval-gate` (has metrics) and on `orchestrator` (no metrics), at 390 and 1440, light and dark. The OG PNGs are added as files. Naming follows `.specify/EVIDENCE.md`, e.g. `T003-screenshot-card-mobile-dark.png`.

---

## 5. Sanitization (AC4)

### 5.1 Patterns as data

One module, `apps/web/scripts/redaction-patterns.ts`, holds the F-table. Each entry has `{ id, class, regex, note }`. The brief's regexes are copied **verbatim**. Where the brief names a class in words, the RFC fixes one regex and marks it **[RFC]** for Gate 1:

| Class | Regex(es) | Source |
|---|---|---|
| F1 | `\b\d{1,3}(\.\d{1,3}){3}\b`, `\b[0-9a-f]{2,}(?::[0-9a-f]{0,4}){2,}\b` (case-insensitive for hex) | brief |
| F2 | `\b[a-z0-9-]+\.(local\|internal\|lan)\b`, `ssh [a-z]` | brief |
| F3 | `ghp_`, `github_pat_`, `sk-[A-Za-z0-9]`, `AKIA`, `xox[bp]-`, `-----BEGIN`, `eyJ`, `Bearer [A-Za-z0-9._~+/-]+=*` | brief (Bearer token body **[RFC]**) |
| F4 | `github\.com[/:][\w.-]+/[\w.-]+` (any surface), plus bare `\b[\w-]+/[\w.-]+\b` (**content only**), minus the allowlist `{Hi-Murphy/portfolio-teardown, TimurHaryo/websocket-inspector, TimurHaryo/jev-toolkit}` | **[RFC]**: on the build, bare `owner/repo` matches 3,830 times (`image/png`, `static/chunks`) |
| F5 | `\b\d{17,19}\b`; bot tokens `\b[MNO][\w-]{23,25}\.[\w-]{6}\.[\w-]{27,}\b`, `\b\d{8,10}:[\w-]{35}\b` | brief + **[RFC]** (bot-token shapes) |
| F6 | `/home/\w+/`, `/Users/\w+/`, `~/[A-Za-z]` | brief |
| F7 | manual read (G5) | brief |
| F8 | `\b(?:org\|proj\|prj\|team\|acct\|cus\|sub)[-_][A-Za-z0-9]{8,}\b` | **[RFC]**: 0 hits on base and spike |
| F9 | email `[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}`; phone `(?:\+\d{1,3}[ .-]?)?\(?\d{2,4}\)?[ .-]\d{3,4}[ .-]\d{3,4}\b`; postal addresses = manual (G5) | **[RFC]** |

### 5.2 G1: content scan (0 hits, no exemptions)

`node apps/web/scripts/redaction-scan.ts content .specify/content/agent-fleet.json` walks every string leaf of the JSON, including keys' values in `meta`, `story`, `layers`, `flows`. It applies **every** pattern (F4 in bare form too) and has **no exemption mechanism at all**. It reports `path → class → match`. Measured today: **0 hits** (spike). Exit code 0 = clean, 6 = hits (the repo's perf exit-code contract: "budget violated").

### 5.3 G2: build scan, and why "0 hits" cannot be literal (escalation E2)

**Evidence:** applied verbatim to the raw bytes of the export, the brief's patterns produce **3,046 hits on the S17 site**, before agent-fleet exists. None of them is a secret (`evidence/T000-log-rfc-spike.md` §4):

- **F1/F5:** float fractions and compact SVG path data (`0.19999999999999996`, `-.27.38.01.53`).
- **F1 ipv6:** minified ternaries (`?27:5:26`).
- **F2:** the R3F store member `a.internal`.
- **F3 `sk-`:** `mask-image`, `mask-type`, the jev-toolkit id `task-model`.
- **F4:** MIME types, chunk paths, public dependency repos.
- **F5:** zod's int64 bounds and a tweet id in a three.js comment.
- **F6 `~/`:** zod's JSON-pointer escape.
- **F9:** the site's own public contact address (from `site.json`).

So AC4's "G2 0 hits" is **blocked as written**. Rewording it is not the orchestrator's call; §11 E2 escalates it.

**Recommended design (default, needs the E2 ruling):** G2 = **0 unexempted hits**. Every pattern stays verbatim and is applied to every byte of every text file in `out/` (`.html`, RSC `.txt`, `.js`, `.css`, `.xml`, `.json`). Each raw hit must then match one rule in a committed **exemption ledger** (`apps/web/scripts/redaction-ledger.ts`), or the build fails. The ledger has two kinds of rule, and no rule ever names agent-fleet content:

*Structural rules* (decided on the match and its immediate context, never on the string):

| Rule | Classes | Exempt when | Must NOT exempt (negative test) |
|---|---|---|---|
| X1 number-run | F1 ipv4, F5 | the match is glued to a longer decimal run: preceded by `.`/digit, or followed by `.` + digit (float fraction, compact SVG path) | `server 198.51.100.12.`, `id 123456789012345678 ` |
| X2 js-ternary | F1 ipv6 | in `.js`; the match is decimal digits and `:` only, and preceded by `?` or `:` | `fe80::1`, `2001:db8::1` |
| X3 mid-word `sk-` | F3 `sk-` | preceded by a letter (`mask-`, `task-`, `disk-`) | ` sk-abc`, `"sk-proj…`, `=sk-…` |
| X4 js-member | F2 host | in `.js`; `<identifier>.internal` preceded by a non-quote, non-`/`, non-`@` char and followed by `.`, `&`, `)`, `,`, `;`, `}` or `?` | `"db.internal"`, `http://db.internal`, `@host.lan` |

*Exact-string rules* (each one listed with where it comes from):

| Rule | Classes | Exempt strings |
|---|---|---|
| X5 public contact | F9 | exactly the email in `site.json` `identity.links` (read at run time, not hand-copied). Murphy published it deliberately |
| X6 numeric constants | F5 | int64/uint64 bounds `9223372036854775807`, `9223372036854775808`, `18446744073709551615` (zod) |
| X7 vendor references | F4 URL, F5, F6 `~/` | the measured third-party strings in dependency JS: public `github.com/<owner>/<repo>` URLs of libraries (react-spring, core-js, …), the three.js comment tweet id, zod's `~/` escape. **`.js` only** and listed one by one, so a dependency update that adds a new one fails the build and needs a reviewed ledger line |
| X8 bare paths | F4 bare | not applied to the build. F4 bare runs in G1 only (§5.1) |

Properties that keep this a gate:

- **Patterns are untouched.** The report prints raw hits, exempted hits per rule and **unexempted hits (must be 0)** for each of the five routes. AC4's evidence shows the full accounting, not just a zero.
- **Every structural rule has a negative test.** A realistic secret of its class is not exempted. A ledger edit that weakens a rule turns that test red.
- **Differential cross-check:** the T000 measurement shows the agent-fleet route adds no new *distinct* textual match. The only new strings are 6 geometry floats, all covered by X1. G2 evidence repeats this diff (base vs. head), so "nothing came from the fleet" is shown twice: by rule and by diff.

**Alternatives** (not recommended): (b) scan only the rendered text and attributes of the five routes (jsdom). This misses build-machine leaks into JS (env, paths), which is the main thing G2 is for. (c) Differential only (0 *new distinct* hits vs. S17). This is simple, but its baseline is "whatever was there", which is a weaker statement.

### 5.4 G3 canary, wired red then green

- **Fixture:** `apps/web/test/redaction-scan.test.ts` builds the seeded string **at run time**, so no committed file contains a token-shaped literal:
  - a fake IP from the documentation range `192.0.2.44` (RFC 5737 TEST-NET-1, not routable);
  - a `ghp_` token assembled as `'gh' + 'p_' + 'CANARY0canary0'`, deliberately shorter than gitleaks' 36-char GitHub-PAT rule, so CI's gitleaks job stays green while F3's `ghp_` prefix still fires;
  - a fake private repo URL `github.com/canary-owner/canary-private-repo`.
- **Same scanners, both surfaces:**
  - **G1 path:** the string is placed in a temp JSON's `description` → `scanContent` must report exactly **3** hits (F1, F3, F4).
  - **G2 path:** the string is written into a temp copy of a real exported HTML, `.txt` and `.js` file → `scanBuild` must report **3/3 unexempted** (the ledger must not swallow any of them).
  - **Ledger negatives:** the X1–X4 must-not lists above.
- **Red then green (executor rule):** commit A lands the test plus a scanner stub that returns `[]` → the test is **red** (0/3), log `evidence/T001-log-canary-red.txt`. Commit B lands the real scanner → **green** (3/3), log `T001-log-canary-green.txt`. Then a mutation control: deleting the F3 `ghp_` entry from the pattern table makes the canary red again (logged, then reverted). Both commits stay on the branch history; the squash merge keeps the logs.

### 5.5 Where it runs (a hit fails the build)

- `apps/web/package.json` `build`: `pnpm og:build && next build && node scripts/redaction-scan.ts build out`. G2 runs over the fresh export, and a non-zero exit fails `pnpm build`. That covers the CI `build` and `seo` jobs and the Vercel preview, so the perf gates never see a leaking build. The scan is pure Node, with no dependency, and takes well under a second on about 4 MB.
- `pnpm test` (CI `build` job): the canary test, ledger negatives and **G1** (`scanContent(agent-fleet.json)` must be 0).
- No `.github` change for the scanner itself (the perf.yml route steps in §3 row 8 are separate).
- The scanner never prints a full match in CI logs for F3/F5-token classes: it prints `class`, file and offset, plus a 4-char prefix. A real secret would not be republished in a public log.

### 5.6 G4 source map format (`evidence/source-map.md`)

One row per **number** and per **factual sentence** in every string of the JSON (story, summaries, descriptions, metrics, tagline):

| # | JSON path | Claim (verbatim) | Kind | Source type | Source pointer | Value at source | Status |
|---|---|---|---|---|---|---|---|
| 1 | `story.metrics[2]` | Required CI contexts: 7 | number | ruleset | GitHub ruleset on `main` → `required_status_checks` (read with `gh api …/rules/branches/main`, 2026-11-17) | 7 | SOURCED |
| 2 | `story.approach` | "…escalates after two failures…" | fact | repo | `.specify/KICKOFF-S18.md` hard rule 10 ("stuck ×2") | 2 | SOURCED |

Rules:

- **Source types:** `repo` (path, plus line where useful), `ruleset` (GitHub setting, read-only), `vault` and `config`. For the last two, Murphy supplies the pointer, written without hostnames, paths, account ids or vendor names (e.g. "vault: revision log, entry count"). The map itself passes G1-style scanning: the scanner runs on `source-map.md` too.
- **Rhetorical or design sentences** ("A decision that only exists in a chat log is a rumour") get Kind `design`, with the repo artefact that embodies the design where one exists. A `design` row cannot carry a number.
- **UNSOURCED rows:** the brief says delete the sentence, but the orchestrator **may not edit the JSON** (kickoff rule 1; brief "No content edits"). So an UNSOURCED row is a **STOP + report**: Murphy (or Merlin) amends the canonical JSON in a separate commit, the converter re-runs, and fidelity follows (§11 Q3).

**Preliminary G4 read (to be completed in Stage 3):**

| Claim | Status today |
|---|---|
| 7 CI contexts | SOURCED (ruleset, verified) |
| 2 approval gates | SOURCED (repo: kickoff stages + brief "Murphy dependencies": G1 + final merge word) |
| "escalates after two failures" | SOURCED (kickoff rule 10) |
| **22 slice units shipped** | **AT RISK**: the repo has **22** briefs in `.specify/slices/`, but `main` has **21** slices merged (S01–S17, with no S09; S11.5–S11.9 are separate). 22 is true only once S18 merges, or it counts something in the vault (Q4) |
| 15 revisions, 12 scheduled jobs, 2 hosts | need a vault/config pointer from Murphy (Q5) |

### 5.7 G5 manual read

In Stage 3 the orchestrator reads all 52 `summary`/`description`/`story.*` strings (plus `tagline`, `meta.summary`, flow descriptions and layer descriptions) end to end. It signs the self-check with a row per string (path → "clean" / "flag: reason"). It checks F7 (no quoted prompt or schema text) and the implication ban (vendors, uptime/cost, regions, reproducible setup).

**Preliminary flags from the RFC read** (no hits; judgement calls for Murphy):

- **P1** `story.outcome`: "The fleet runs for weeks without attention." This is an availability claim, close to the "uptime figures" ban, and it has no source. **Default:** treat as UNSOURCED → report (Q3).
- **P2** `cron.description`: "…capacity watchdogs." It reveals that quota watchdogs exist, with no vendor or number. **Default:** clean.
- **P3** `edge-host.description`: "…can be rebuilt from the vault and the queue." Generic recovery design. **Default:** clean.

No vendor, region, cost, hostname, path or identifier appears anywhere in the 146 strings.

---

## 6. Accessibility plan (AC5): a route with no tech row and no source section

What changes compared with the existing routes:

- The header has h1 + tagline + meta line, and **no** "Project links" list.
- There is no Connections section.
- Panels never have Tech/Links headings.

The heading outline stays valid: h1 (page) → workbench h2s; panel h2 (component) → h3 only for Metrics on two components. There is no orphan h3 and no skipped level, because skipped sections take their heading with them (§4.2).

| Check | Tool / method | Pass bar |
|---|---|---|
| axe on `/projects/agent-fleet`, light + dark | `pnpm a11y:axe:site` (route auto-added through `PROJECT_SOURCES`), plus a run with **a panel open** (`approval-gate`) and **a flow playing** | 0 serious / 0 critical, both palettes |
| Contrast AA | axe `color-contrast` (same runs) + the panel palette, already sealed S8 | 0 violations |
| Keyboard: panel | Playwright (`a11y:probe` pattern): Tab from skip link → workbench; open each of the 14 components through the keyboard pick path; focus lands on the panel h2; Tab reaches the close button; Esc closes; focus returns to the trigger | 14/14 |
| Keyboard: flow controls | Flows tab (arrow keys in the tablist), each of the 3 flows started, paused and stepped by keyboard | 3/3 |
| Visible focus | screenshot of each focus stop (outline present, ≥ 2 px, `outline-accent`) | every stop |
| Tap targets ≥ 44×44 | bounding boxes of every interactive element on the route at 390 (close button is 2.75 rem = 44 px; links use `min-h-11`) | 0 below 44×44 |
| Cards | the agent-fleet card has a single interactive element (the stretched link), and after §4.1 no empty labelled list | axe clean on `/`, `/projects` |

---

## 7. Frozen surfaces and AC7 (byte checks)

- **S2–S8:** reuse the S17 `guards.sh` pattern: `seal_list_ok` per manifest at the seal bases (§1), plus `frozen-surface.test.ts`, plus `xploder` paths unchanged since `33e2ba1`. S18 touches no xploder file.
- **S3:** `label-system/guards.sh` `s3_tools_ok` list stays unchanged. `project-sources.ts` and `site-probe.ts` are not on it.
- **AC7 byte report** (fixed build id, `build-fixed.sh` pattern, base `33e2ba1` vs. head):
  - `/`, `/projects`, `404`: the diff must consist only of the added card (normalised diff = one `<article data-site-card="agent-fleet">` block plus its RSC copy).
  - `og/home.png` and `og/projects.png`: changed, as expected; listed.
  - The two existing project OG PNGs: byte-identical (spike: yes).
- **Existing project pages: blocked as written (escalation E3).** The spike shows that `projects/websocket-inspector.html` and `projects/jev-toolkit.html` each differ by **one chunk filename** (3 occurrences). Cause: the lazy workbench client chunk imports `getProject`, so it bundles **every** project's content. Adding a project changes that chunk's hash, and the new hash cascades through the 1.2 KB loader chunk into the 2.4 KB page chunk that both pages reference. This is S13's architecture, not something S18 introduces, and no S18-scoped change can avoid it:
  - Passing the project to the client as a prop would itself change both pages once.
  - Per-project dynamic imports still need a map chunk that names every project.
  - **Default:** a ruling in the spirit of S17's C2. "Own files byte-identical" is checked **after masking `/_next/static/chunks/<hash>.js` names**. Separately, the report proves the three changed chunks differ only by the agent-fleet data and the renamed references. The masked diff must be empty.
- **`measured-on` strips:** both relationship files and modules are unchanged; the `data-site-connections` markup on both pages is equal after masking.
- **S16 sweep:** the sealed sweep test (two projects) is re-run unchanged → 0 intersections, and its control turns red.

---

## 8. Gate matrix and evidence per AC

| AC | Gate / measurement | Evidence file(s) |
|---|---|---|
| AC1 | fidelity (a)–(e2) green for 3 rows; id/count/name-length test; `site-probe` teardown counts on `/projects/agent-fleet` = 4/14/3; Playwright 14/14 panels open + 3/3 flows play | `T002-log-fidelity.txt`, `T002-log-content-model.txt`, `T004-log-route-probe.json` |
| AC2 | `/projects` + home show the card (`site-probe` cards, chip rule §4.3); `sitemap.xml` `<loc>` count; 5 (E1) OG PNGs: dimensions, bytes ≤ 300 KB, sha256 equal across two clean builds (CI `seo` job compares `og-hashes.json`); JSON-LD: one `SoftwareApplication` on each of 3 project routes (seo-probe); unknown slug → 404 | `T004-log-sitemap.txt`, `T004-log-og.txt` (dims + hashes, build 1 vs 2), `T004-log-seo-probe.json`, `T004-log-404.txt` |
| AC3 | §4.3 counts (0 chip / 0 source nodes, with positive controls); screenshots at 390/1440 × light/dark (card, panel); OG PNGs | `T003-log-empty-counts.json`, `T003-screenshot-*.png`, `T004-og-*.png` |
| AC4 | G1 0; G2 0 unexempted (E2) + per-rule accounting + base/head differential; G3 red → green 3/3 + mutation control; G4 `source-map.md` with 0 UNSOURCED; G5 signed table | `T001-log-canary-red.txt`, `T001-log-canary-green.txt`, `T005-log-g1.txt`, `T005-log-g2.txt`, `evidence/source-map.md`, `T005-log-g5-read.md` |
| AC5 | axe both palettes (route, panel open, flow playing); keyboard 14/14 + 3/3; focus screenshots; tap-target scan; contrast | `T006-log-axe.json`, `T006-log-keyboard.txt`, `T006-screenshot-focus-*.png`, `T006-log-tap-targets.json` |
| AC6 | CI 7/7 required contexts (PR run URL); Lighthouse median-of-3 ≥ 95/95 on `/`, `/projects` and 3 project routes (E1); CLS 0 (`site-probe` cls group); weight < 3 MB (`perf:weight`, 5 routes); 2 draw calls on the new route (`site-probe` draws); eager hero reveal (`eager:probe` on `/`, unchanged vs. S17); S2–S8 guards | `T007-ci.md`, `T007-lighthouse-summary-*.json`, `T007-log-cls.json`, `T007-weight-*.json`, `T007-log-draws.json`, `T007-log-eager.txt`, `T007-log-guards.txt` |
| AC7 | byte report §7 (masked per E3); OG of existing projects identical; Connections markup equal; S16 sweep 0 + control | `T007-log-bytes.md`, `T007-log-sweep.txt` |

---

## 9. Stage 3 task outline (for Stage 2 to formalise)

Order follows the **brief's** executor rule: "the sanitization scanner lands **before** the route is wired". It differs from the kickoff's Stage 3 order (scanner after the surfaces); the brief is the scope source, so the brief wins (R1).

| T | Work | Gate |
|---|---|---|
| T001 | `redaction-patterns.ts`, `redaction-scan.ts` (content + build modes), `redaction-ledger.ts`; canary test **red (stub) → green**; mutation control; G1 on the JSON | canary 3/3, G1 0 |
| T002 | converter entry + generated source + module + `PROJECTS` + `PROJECT_SOURCES`; test edits §3 rows 3, 4, 6; fidelity + content-model (AC1 ids/counts/lengths) | `pnpm test` all green (the 4 baseline reds turn green) |
| T003 | `TechChipList` guard; `site-probe` chip rule; empty-render probe + screenshots | §4.3 counts |
| T004 | route probe (4/14/3, 14 panels, 3 flows); `/`, `/projects`, 404, sitemap, OG, JSON-LD checks; `perf.yml` route steps | AC1, AC2 |
| T005 | `build` script runs G2; G2 report (5 routes, per rule, differential); `source-map.md`; G5 signed read | AC4 |
| T006 | axe ×2 palettes, keyboard, focus, tap targets | AC5 |
| T007 | Lighthouse ×5, CLS, weight, draws, eager hero, guards (S2–S8, S3), AC7 byte report, S16 sweep; PR + CI 7/7; AC self-check | AC6, AC7 |

The executor is DeepSeek Flash 4.1 per task. Stuck ×2 → the orchestrator takes over (tier 1.5 dormant, skip recorded).

---

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Brief vs. kickoff order (scanner first vs. after the surfaces) | the brief wins (§9); noted for Merlin |
| R2 | A dependency bump adds a vendor string (X7) or changes minifier output (X2/X4) → the build fails | intended (fail closed). The fix is one reviewed ledger line with the dependency named. Each rule's negative test guards against over-wide edits |
| R3 | The G2 scanner fails a Vercel preview → perf gates can't run | intended. CI `build` runs it first, so a local `pnpm build` reproduces it |
| R4 | The canary token trips gitleaks | the token is built at run time and is shorter than gitleaks' 36-char rule; the T001 evidence includes a local gitleaks run |
| R5 | Home section at 390 grows by one card; OG `projects.png` splits width three ways | T004 screenshots and OG review. Layout code is unchanged (grid and silhouette width both derive from count) |
| R6 | G4 numbers from the vault/config depend on Murphy's pointers | asked at Gate 1 (Q5), so Stage 3 doesn't stall at T005 |
| R7 | Parity/sweep noise (S16 memory: viewer not frame-stable) | S16's serial-run + 3-run stable-set rule for any sweep re-run |
| R8 | +2.7 KB gzip in the lazy workbench chunk is downloaded by all three project routes (it bundles every project) | well under 3 MB; recorded. Per-project chunks would be their own slice (§11 Q8) |

---

## 11. Escalations and open questions (each with a default)

### Escalations: AC text that cannot be met as written (evidence attached)

| # | AC | Problem (evidence) | Recommended resolution (default) |
|---|---|---|---|
| **E1** | AC2 ("sitemap has **4** `<loc>`; **4** OG cards"), AC6 ("Lighthouse … all **four** routes"), and kickoff "G2 … all **four** routes" | The site **already** has 4 `<loc>` and 4 OG cards (S13 `jev-content/evidence/T007-log-sitemap.txt`; S17 self-check "4 `<loc>`"). Registering a third project yields **5** of each (spike). The brief's own Constraints line lists five routes: "`/`, `/projects`, and all three project routes" | **Brief revision 1 of 2**: AC2 → **5** `<loc>`, **5** OG cards; AC6 and G2 → all **five** routes. No other change to the intent. The orchestrator drafts the Merlin note (`evidence/REV1-revision-note.md`) |
| **E2** | AC4 "G2 **0 hits**" | The verbatim patterns hit **3,046** times on the S17 build, all non-secrets (§5.3; `T000` §4) | Same revision: G2 = "**0 unexempted hits**; every raw hit accounted for by a committed exemption ledger whose rules each carry a negative test". Patterns unchanged. Alternative: Murphy picks §5.3 (b) or (c) |
| **E3** | AC7 "existing project pages byte-identical in their own files" | Both pages' HTML differs by one chunk filename, because the shared lazy chunk bundles all projects (§7; `T000` §2) | **Ruling C3** (like S17's C2): compare own files after masking hashed chunk names, and prove separately that the changed chunks differ only by agent-fleet data. Alternative: no ruling → AC7 stays NOT MET and is reported |

### Open questions (the default applies if Murphy says nothing)

| # | Question | Default |
|---|---|---|
| Q1 | Gate 1 (brief "Murphy dependencies"): does "empty" read as intentional? (card ends at the tagline/summary; panel has name, meta, summary, description, and Metrics on two components) | **Yes**, judged on the T003 screenshots |
| Q2 | F4/F5-bot/F8/F9 regexes and the Bearer token body marked **[RFC]** in §5.1 | approve as written |
| Q3 | G4 says "delete unsourced sentences" but the orchestrator may not edit the JSON. Who deletes? | Orchestrator reports UNSOURCED rows and STOPs; **Murphy** (or Merlin) amends `agent-fleet.json` in a separate commit; converter re-run. P1 ("runs for weeks without attention") is the first candidate |
| Q4 | "22 slice units shipped": the repo shows 21 merged + S18. What does 22 count? | It counts S18 and is true at merge; source = `.specify/slices/` (22 briefs) + the S18 merge commit |
| Q5 | Source pointers for "15 revisions", "12 scheduled jobs", "2 hosts" (vault/config, written without private detail) | Murphy gives a one-line pointer + count for each at Gate 1 |
| Q6 | Add `projects/agent-fleet` Lighthouse + weight steps to `.github/workflows/perf.yml` (like S13 did for jev-toolkit)? | **Yes** |
| Q7 | Run the S16 label sweep on agent-fleet too (evidence only, out-of-tree copy; the sealed test stays untouched)? | **Yes, report-only** (not a gate; AC1's name-length limits are the gate) |
| Q8 | Per-project lazy chunks so a future project never changes the existing pages' bytes | **Not in S18**; backlog item for Merlin |
| Q9 | `site.json` about copy says "Both started as side projects" (written for two projects) | **No edit in S18** (no content edits); flagged to Murphy and Merlin |
| Q10 | G1 scope: only `agent-fleet.json` (brief) or all content files? | **Brief scope only**; the scanner can take any path later |

---

## 12. Gate 1 record

**Gate 1 (Murphy, 2026-11-17): "all defaults. go".** Every escalation and question resolves to its default:

| # | Decision |
|---|---|
| E1 | **Brief revision 1 of 2.** AC2 reads **5** `<loc>` and **5** OG cards. AC6's Lighthouse gate and G2 cover all **five** routes (`/`, `/projects`, three project routes) |
| E2 | **Same revision.** G2 = **0 unexempted hits**: patterns verbatim, every raw hit accounted for by the committed exemption ledger (§5.3: structural X1–X4, exact-string X5–X7), each structural rule with a negative test. The report shows raw / exempted-per-rule / unexempted per route, plus the base-vs-head differential |
| E3 | **Ruling C3.** AC7 "own files byte-identical" for the two existing project pages is checked after masking `/_next/static/chunks/<hash>.js` names. A separate proof shows the renamed chunks differ only by the agent-fleet data and the cascaded names |
| Q1 | "Empty" reads as intentional; confirmed on the T003 screenshots |
| Q2 | §5.1 **[RFC]** regexes approved |
| Q3 | UNSOURCED rows → STOP + report; Murphy or Merlin amends `agent-fleet.json` in a separate commit; the orchestrator never edits it |
| Q4 | "22 slice units" counts S18; SOURCED at merge (`.specify/slices/` 22 briefs + the S18 merge commit) |
| Q5 | **No default existed.** Murphy's pointers for "15 revisions", "12 scheduled jobs" and "2 hosts" are still needed **before T005** (G4). Until then those rows are PENDING, not UNSOURCED |
| Q6 | `perf.yml` gains the `projects/agent-fleet` Lighthouse and weight steps |
| Q7 | S16 sweep on agent-fleet: evidence-only, report-only |
| Q8 | per-project lazy chunks → backlog for Merlin, not S18 |
| Q9 | the "Both started as side projects" about copy stays; flagged to Merlin |
| Q10 | G1 scope = `agent-fleet.json` only |
| P1 | "The fleet runs for weeks without attention" (`story.outcome`) → UNSOURCED candidate; Murphy/Merlin decide at T005 (Q3 path) |

Note for Merlin: `evidence/REV1-revision-note.md`.

**Refinements (orchestrator, Stage 2 re-check against the code; none changes an AC):**

- **R-A: one scanner module.** `apps/web/tsconfig.json` has no `allowImportingTsExtensions`, so `node scripts/x.ts` cannot import a sibling `.ts` file without a tsconfig change. Patterns, ledger, scan functions and CLI therefore live in **one** file, `apps/web/scripts/redaction-scan.ts`, with named exports for the test and a `main` guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`. This supersedes the three-file layout in §5.1/§5.3/§9.
- **R-B: G2 runs on the production export only.** `PERF_FIXTURES=1` builds write to `out-fixtures` and are never deployed (EVIDENCE.md §2). The `build` step scans `out` only when `PERF_FIXTURES !== '1'`; otherwise it logs `G2 skipped: fixture build`. "The four (now five) routes" are production routes.
- **R-C: the scanner also covers the evidence prose.** `redaction-scan.ts content <file>` accepts JSON (string leaves) or text (whole file). T005 runs it on `evidence/source-map.md` and the G5 table, with no exemptions. The only allowed IP is the RFC 5737 canary range, which is never written to a committed file (it is assembled at run time).
- **R-D: brief order wins over kickoff order.** The scanner + canary (T001) land before registration (T002), as the brief's executor rule requires (§9 R1).
- **R-E: the e2 fidelity fix.** `layers.at(-1)!.components[0]!` replaces `layers[4]!.components[2]!` for every row (§2). The existing rows still mutate a nested summary.
- **R-F: feature tooling, not product.** `guards.sh`, `build-fixed.sh` (S18 build id), `empty-render-probe.mjs`, `route-probe.mjs`, `bytes-report.mjs` and `g2-diff.mjs` live in `.specify/features/agent-fleet/`. Product changes stay inside plan.md's allowed paths.
