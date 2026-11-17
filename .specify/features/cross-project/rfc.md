# RFC — S17 Cross-project relationships

**slice:** S17-cross-project · **status:** APPROVED at Gate 1 (2026-11-17): all §10 defaults + U1 Next upgrade (§11) · **author:** orchestrator (Opus 5.5) · **scope source:** `.specify/slices/slice-17-cross-project.md` (frozen brief v1) · **branch:** `task/s17-cross-project` · **base:** `f0c2d37` (product code = S16 merge `cec65ea`) · **date:** 2026-11-17

> This RFC holds design decisions only. It does not change scope. If anything here seems to conflict with the brief, the brief wins, and the conflict is raised as an open question (§10). Nothing here is implemented yet.

---

## 1. Context (from the brief)

- **Mission:** make the two projects read as one body of work. Each teardown gets a content-driven `Connections` strip that links to the other project, in both directions. **No chip links:** the two projects share zero techs.
- **Scope:** an additive `relationships` field in each project JSON; one entry per file (verbatim notes below); a strip on the project route after the story and before the footer. Out of scope: tech-chip links, a tech index, home changes, engine code.
- **Binding:** app + content only, **S2–S8 empty diffs**, no new dependency, no new route, no invented copy, and the same gates as before.

### Acceptance criteria (verbatim, inviolable)

- **AC1 — data-driven both ways.** Both strips render from JSON alone; deleting one entry removes exactly that strip (test); an unknown `to` slug fails the build with a named error; a relationship to the same project is rejected by the schema.
- **AC2 — accessible.** The strip is a labelled list of links, keyboard reachable in order, visible focus, tap targets ≥ 44×44, link text names the destination project (not "here"). axe 0 serious / 0 critical.
- **AC3 — no layout damage.** CLS 0 on all four routes; the strip sits between story and footer; 390 px shows no horizontal scroll and no overlap with the label system's footprint notes (the S16 sweep is re-run and must stay at 0 intersections).
- **AC4 — home untouched.** `/` is byte-identical except for no change at all; the eager hero's reveal is re-measured and unchanged.
- **AC5 — weight.** Total client JS **+ ≤ 1.5 KB gzip**; 2 draw calls; no new route in the sitemap beyond the existing three.
- **AC6 — gates and seals.** CI 7/7 required contexts green; the fidelity test passes for both converted modules; **S2–S8 empty**.

### Starting point (checked on this branch at `f0c2d37`)

- **The library schema is strict and sealed.** `packages/xploder/src/schema/project.ts` builds the project root with `z.strictObject`, so an unknown top-level key such as `relationships` makes `defineProject`/`parseProject` throw. The file is part of the S2 seal (`frozen-surface.paths`: `src/schema`, `src/parse.ts`, `src/errors.ts`, `src/index.ts`). **So the relationship schema cannot live in xploder.** It lives in the app, and the field is removed before the project reaches `defineProject` (§3).
- **zod is not a direct dependency of `apps/web`** (only of xploder). xploder does export zod schema instances (`IdSchema`, `LinkSchema`, `MetaSchema`, …). The app schema is built from those instances, so `package.json` and the lockfile do not change (§3.1, Q3).
- **Content pipeline (S9/S13):** `apps/web/scripts/convert-content.ts` writes `content/projects/<slug>.source.ts` (`export const … = <JSON> satisfies ProjectInput`, with the JSON's SHA-256 in the header). `content/projects/<slug>.ts` calls `defineProject(source, { registry, source: slug })`. `content/projects/index.ts` exports `PROJECTS`. `test/content-fidelity.test.ts` is table-driven over both projects (assertions a–e2 + a completeness guard).
- **Project route:** `app/(site)/projects/[slug]/page.tsx` renders `<header>` and then `<Workbench project>`. The story lives inside the workbench: the dock's "Case study" panel (live) and `ProjectOutline` in the `<noscript>` row (no JS). `<SiteFooter>` comes from `app/(site)/layout.tsx`, after `<main>`.
- **Client bundling:** the only client component that imports content is `components/workbench/workbench-client.tsx` (lazy workbench chunk, project routes only). `/` and `/projects` import project data only in server components.
- **Seal bases (all diff-clean at `f0c2d37`):** S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `c8794b2`, S7 `cc663f7`, S8 `c8794b2` (pushed `seal/*` tags). S3 = the `tools/perf` file list in the S16 `guards.sh`.

### Pre-RFC spike (throwaway, reverted; `git status` clean afterwards)

The orchestrator wired a minimal version of §2–§4 into the working tree, built it, and compared it with two builds of the base. Every build used a **fixed build id** (`VERCEL_GIT_COMMIT_SHA=<constant>`, which `next.config.ts` passes to `generateBuildId`).

| Probe | Result |
|---|---|
| Two base builds, fixed build id | the whole `out/` is **byte-identical** (`index.html` sha256 `b6844ad0…`). Without a fixed id, the random build id changes every page |
| Spike, first try (strip used `pt-6`, a class no other page uses) | `/` **changed**: Tailwind added one rule to the **single shared stylesheet**, so the CSS file name changed on every page |
| Spike, strip using only classes already in the base stylesheet | `/` `index.html` **byte-identical** (`b6844ad0…`); `/projects`, `sitemap.xml`, `404`, all root `__next.*.txt` and the CSS byte-identical. Only 3 JS chunks changed, all referenced only from the two project routes |
| Client JS (S16 `bundle-gzip.mjs`, every `_next/static/**/*.js`) | 473,774 → 473,875 B gzip = **+101 B** (budget 1,536 B) |
| Project route HTML | jev-toolkit 18,920 → 19,307 B gzip; websocket-inspector 18,071 → 18,323 B gzip (strip markup + RSC payload; this is HTML, not JS) |
| Schema built from xploder instances | strict object works: unknown key → `unrecognized_keys`, bad kind → custom issue, missing field → `[]` |
| `tsc --noEmit` (web) | clean |

**Design rule from the spike (R0):** the strip may use **only utility classes that already exist in the base stylesheet**. Then the stylesheet stays identical, and so does `/`. A test enforces this (§6.2).

---

## 2. Content patch (AC1, AC6) — exact bytes

Both JSON files are exactly `JSON.stringify(data, null, 2) + "\n"` today (checked: the round-trip is byte-equal). The patch appends one top-level key, `relationships`, as the **last** key, in the same format. The notes are verbatim from the brief (ASCII apostrophe U+0027, as in the brief and in the existing content).

**`.specify/content/jev-toolkit.json`** (15,751 → 15,938 B, +187 B; sha256 `8a1eff72…` → `a1746fae…`):

```diff
@@ -457,5 +457,12 @@
         "accuracy-cli"
       ]
     }
+  ],
+  "relationships": [
+    {
+      "to": "websocket-inspector",
+      "kind": "measured-on",
+      "note": "Every arm in this harness was measured against this app's real code."
+    }
   ]
 }
```

**`.specify/content/websocket-inspector.json`** (15,607 → 15,782 B, +175 B; sha256 `30434425…` → `40a9cdf6…`):

```diff
         "inspector-database"
       ]
     }
+  ],
+  "relationships": [
+    {
+      "to": "jev-toolkit",
+      "kind": "measured-on",
+      "note": "This app is the benchmark target for the harness in jev-toolkit."
+    }
   ]
 }
```

Nothing else in either file changes. A guard checks that each file, with `relationships` removed, deep-equals its `f0c2d37` version, and that the bytes equal the 2-space round-trip (§7, G15). `site.json` is not touched. Both entries are written explicitly; nothing is mirrored (brief decision 2).

After the patch, `pnpm --filter web content:convert` regenerates both `.source.ts` files (new SHA-256 headers). They are never hand-edited.

---

## 3. Schema (AC1, AC6)

### 3.1 Where it lives and its shape

New app module **`apps/web/content/projects/relationships.ts`** (content model only, no UI):

```ts
import { IdSchema, LinkSchema, MetaSchema, type ProjectInput } from 'xploder';

export const RELATIONSHIP_KINDS = ['measured-on', 'shares-stack', 'same-engine'] as const;
export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

// Built from xploder's exported zod instances, so apps/web needs no direct zod dependency.
const RelationshipSchema = LinkSchema.omit({ label: true, url: true }).extend({  // strict, no extra keys
  to: IdSchema,                                   // same slug rule as meta.slug
  kind: IdSchema.refine(isRelationshipKind, …),   // one of RELATIONSHIP_KINDS
  note: MetaSchema.shape.summary.unwrap(),        // TextSchema: trimmed, 1–2000 chars
});

export function createRelationshipsSchema(context: { self: string; projects: ReadonlyMap<string, string> }) {
  return RelationshipSchema.array().default([]).superRefine(/* self, unknown, duplicate */);
}

/** What the converter's `satisfies` checks: the xploder input plus the site-level field. */
export type ProjectSource = ProjectInput & { readonly relationships?: readonly RelationshipInput[] };

/** Removes the site-level field before the project reaches the strict xploder schema. */
export function projectInput(source: ProjectSource): ProjectInput;

export class RelationshipValidationError extends Error { override name = 'RelationshipValidationError'; … }

export function resolveConnections(sources, projects): ReadonlyMap<string, readonly Connection[]>;
```

`Connection = { slug, name, kind, note }`. `name` is the target's `meta.name`, read from the parsed target project, never typed in code.

- `ProjectSource` makes `satisfies` reject an unknown `kind` at **typecheck** too (a literal union). `to` can only be checked at runtime, because the slug set comes from content.
- The field is optional, and a missing field parses to `[]` (no strip). An empty array is valid too.

### 3.2 Errors (named, build-failing)

`createRelationshipsSchema({ self, projects })` adds these custom issues. `resolveConnections` collects every issue and throws one **`RelationshipValidationError`**. The class sets `name` explicitly (minifiers rename classes; this follows the xploder `errors.ts` precedent).

| Case | Message (path) |
|---|---|
| unknown `to` | `Unknown relationship target "<to>" in project "<self>". Known projects: websocket-inspector, jev-toolkit.` (`relationships[i].to`) |
| self-reference | `Project "<self>" cannot have a relationship to itself.` (`relationships[i].to`) |
| duplicate target (Q4) | `Duplicate relationship to "<to>" in project "<self>".` (`relationships[i].to`) |
| bad kind / extra key / empty note / bad slug | the zod issue, prefixed with the same header |

Thrown text: `Invalid relationships (<self>):\n✖ <message>\n  → at relationships[<i>].to`, one block per issue.

**Why it fails the build:** `resolveConnections` runs at **module load** in `content/projects/connections.ts` (§4.2). The project route imports that module, so `next build` evaluates it while it prerenders `/projects/[slug]`, and the throw fails the build. This is the same mechanism that makes a `defineProject` error fail the build today. `og:build` and every test that imports the module fail the same way.

### 3.3 Converter and project modules (no per-project branch)

| File | Change |
|---|---|
| `scripts/convert-content.ts` | the two project rows change `typeImport` to `{ typeName: 'ProjectSource', moduleSpecifier: './relationships' }`. The converter logic is unchanged; `site.json` is unchanged |
| `content/projects/{jev-toolkit,websocket-inspector}.ts` | the same one-token edit in both: `defineProject(projectInput(<x>Source), …)` |
| `content/projects/*.source.ts` | regenerated |

### 3.4 How the fidelity test covers it (AC6)

`test/content-fidelity.test.ts` keeps its rows and the completeness guard.

- **(a)** generated module `toStrictEqual` the canonical JSON: unchanged, and it now covers `relationships` byte-for-byte.
- **(b)** parsed project `toStrictEqual parseProject(<JSON without relationships>)`. The test removes the key itself and does not use the app's `projectInput`, so the two stay independent. This is the only changed assertion, and it is needed because the strict xploder schema rejects the extra key by design.
- **(c)/(d)/(e)/(e2)** unchanged (`--check`, header SHA-256 of the new bytes, negative controls).
- **(f) new:** `connectionsFor(slug)` deep-equals the JSON's `relationships`, mapped to `{ slug: to, kind, note }` plus the target's `meta.name`.
- **(e3) new negative control:** a JSON copy with a mutated `note` is not strictly equal.
- **Completeness:** the connection sources' slugs equal `PROJECT_SLUGS`, in the same order (no half-wired project).

### 3.5 Schema tests (new `test/relationships.test.ts`, written red first)

1. Unknown `to` → throws `RelationshipValidationError`, `name === 'RelationshipValidationError'`, and the message contains the unknown slug and the source project.
2. Self-reference → rejected by the schema, with its message.
3. Duplicate target, bad kind, extra key, empty note, non-slug `to` → rejected.
4. Missing field and `[]` → no connections.
5. **Removal test (AC1):** a structured clone of the real sources with jev-toolkit's entry deleted → `resolveConnections` gives jev-toolkit `[]` and websocket-inspector one entry. The `Connections` component rendered with `react-dom/server` for both slugs gives **0** `[data-site-connections]` for jev-toolkit and **1** for websocket-inspector (and the mirror case).
6. Content scan: `no-hand-copied-content.test.ts` adds `relationships[].note` to the per-project string set, so a note pasted into app code fails the scan. The `MIN_COPY_LENGTH` of 12 applies; both notes are longer.

---

## 4. The `Connections` component (AC1–AC3)

### 4.1 Mount point

In `app/(site)/projects/[slug]/page.tsx`, directly after `<Workbench project={project} />`, inside the page container:

```tsx
<Workbench project={project} />
<Connections connections={connectionsFor(slug)} />
```

DOM order on both routes: `header` → `[data-site-workbench]` (stage + dock + tour, which hold the live Case study, and the `<noscript>` outline with the story) → **`[data-site-connections]`** → `</main>` → `<footer>`. So the strip sits "after the story, before the footer" with JS and without JS. A probe asserts the order with `compareDocumentPosition` (G6).

### 4.2 Data path (no per-project branch)

- `content/projects/connections.ts` (imported by the route only, a server component) holds `CONNECTION_SOURCES = [websocketInspectorSource, jevToolkitSource]` (guarded against `PROJECT_SLUGS`, §3.4). It computes `resolveConnections(CONNECTION_SOURCES, PROJECTS)` once at module load and exports `connectionsFor(slug)`.
- The page passes `connectionsFor(slug)` and has no `if (slug === …)`. A third project with a relationship needs only the JSON entry plus the usual one-line source registration.
- `components/connections.tsx` is a **server component** (no `'use client'`). It returns `null` for an empty list, so removing the JSON entry removes the strip.
- **Client bundles never import `connections.ts` or the schema.** The workbench chunk grows only by the `relationships` JSON inside the two `.source.ts` modules (spike: +101 B gzip in total).

### 4.3 Markup and existing tokens

```html
<section aria-labelledby="site-connections-title" data-site-connections="" class="… border-t border-line/30 …">
  <h2 id="site-connections-title" class="font-mono text-xs uppercase tracking-[0.16em] text-muted">Connections</h2>
  <ul aria-labelledby="site-connections-title" class="… flex flex-col …">
    <li data-relationship-kind="measured-on">
      <a href="/projects/websocket-inspector" class="inline-flex min-h-11 min-w-11 items-center … text-fg underline decoration-line underline-offset-4 hover:decoration-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Scarlet Inspector</a>
      <p class="max-w-[62ch] text-sm leading-relaxed text-muted">Every arm in this harness was measured against this app's real code.</p>
    </li>
  </ul>
</section>
```

- **Tokens:** only the existing theme utilities (`text-fg`, `text-muted`, `border-line/30`, `decoration-line`, `outline-accent`), which are wired to `xploder/theme` CSS variables. No colour literal, no motion and no transition class (`no-motion-literals` and `no-color-literals` gain the new files). The heading and link classes copy the outline's "Metrics" eyebrow and the header's "Project links" links.
- **R0:** every class must already be in the base stylesheet (§6.2).
- **Strings:** target name = target `meta.name`; note = JSON. The heading "Connections" is the only chrome string (Q2). The `kind` is carried as `data-relationship-kind` and is not shown (the brief's strip is "project name, the note, one link").
- **Link:** `next/link`, the same as "← All projects", with default prefetch (Q6).

---

## 5. Accessibility contract (AC2)

| Item | Contract | Proof |
|---|---|---|
| Landmark | `<section aria-labelledby>` → a `region` named "Connections" | axe + `getByRole('region', { name: 'Connections' })` |
| List semantics | one `<ul aria-labelledby>` (named "Connections"), one `<li>` per relationship, one link per `<li>` | `getByRole('list', { name: 'Connections' })`; `li` count = JSON entries |
| Heading | `h2`, under the page's only `h1` (project name); the workbench has no headings | heading-order audit in axe/Lighthouse |
| Link text | exactly the destination's `meta.name`; never "here", "link" or "read more"; the note is plain text after the link, not inside it | probe: `textContent === target meta.name`, deny `/\b(here|click|link|more)\b/i` |
| Keyboard order | DOM order: last workbench control → strip link(s) → first footer link; no `tabindex` | probe: Tab walk from the last workbench focusable |
| Visible focus | `focus-visible:outline-2 outline-offset-2 outline-accent` (the site's focus ring) | probe: computed `outline-style: solid`, `outline-width ≥ 2px` on `:focus-visible`; screenshots light/dark |
| Tap target | `min-h-11 min-w-11` (44×44 CSS px) on the `<a>` | probe: `getBoundingClientRect()` ≥ 44×44 at 390 and 1440 |
| axe | 0 serious / 0 critical | CI `a11y: axe (production routes)` (the six project states already include the full page) + local `a11y:axe:site` |

---

## 6. Weight plan and frozen surfaces (AC4, AC5, AC6)

### 6.1 What ships

| Item | Ships to | Expected |
|---|---|---|
| `relationships` JSON (2 × ~180 B raw) | the lazy workbench chunk (it holds every project's source, S13 E1) | part of the +101 B gzip measured in the spike |
| `projectInput` helper (destructuring) | same chunk | a few bytes |
| schema, resolver, `Connections` | **server only** (prerender) | 0 B client JS |
| strip markup + RSC payload | the two project routes' HTML/`.txt` | ~+390 / +250 B gzip HTML (spike); counted by the weight gate, far under 3 MB |

**Budget check:** total client JS gzip, base export vs head export, both with a fixed build id, using a feature-local copy of the S16 `bundle-gzip.mjs` with `BUDGET = 1536`. Expected ≈ +0.1 KB, against a limit of 1.5 KB.

### 6.2 `/` untouched (AC4)

1. Build `f0c2d37` and head with the same fixed build id.
2. `cmp`: `index.html`, `index.txt`, every root `__next.*.txt`, `sitemap.xml`, `robots.txt`, `og/home.png`, and **every `/_next/static/**` file that `/` fetches** (Playwright network log, from load to the hero reveal). Each is byte-identical, with sha256 listed for both.
3. **R0 guard:** the only stylesheet is byte-identical (same file name and sha256). A failing class shows up here first; the fix is to use an existing class (no CSS edit).
4. Eager hero re-measured: `pnpm eager:probe --serve <out> --route / --runs 2 --expect live-loop` + `site:probe --group hero` on base and head. Both pass with 0 input events; reveal timings are reported side by side. With identical bytes, a difference can only be run noise.

### 6.3 S2–S8 stay empty (AC6)

The whole `packages/xploder` tree must equal `f0c2d37` (stronger than the seal lists). Also `guards.sh` (feature-local, after the S13/S16 pattern):

- `XPLODER-OK`: `git diff --quiet f0c2d37 -- packages/xploder`;
- `SURFACES-S2S8-OK`: each seal list against its base (S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `c8794b2`, S7 `cc663f7`, S8 `c8794b2`) + `pnpm --filter xploder exec vitest run test/frozen-surface.test.ts`;
- `S3-TOOLS-OK`: the S3 `tools/perf` list unchanged (in fact `tools/perf` is not touched at all, Q7);
- `NO-DEP-OK`: no change to any `package.json` or `pnpm-lock.yaml`;
- `ALLOWED-PATHS-OK`: changes only in the two JSON files, `apps/web/content/projects/**`, `apps/web/scripts/convert-content.ts`, `apps/web/components/connections.tsx`, `apps/web/app/(site)/projects/[slug]/page.tsx`, `apps/web/test/**` and `.specify/features/cross-project/**`;
- `FROZEN-OK`: brief + `KICKOFF-S17.md` unchanged; `CONTENT-PATCH-OK` (G15); `CONVERT-CHECK-OK`; `GITLEAKS-OK`.

No re-seal is planned. Any need for one means engine work, which is out of scope → STOP and report.

---

## 7. Gate matrix and evidence per AC

Local setup: `pnpm install --frozen-lockfile && pnpm --filter perf-tools exec playwright install chromium`; builds with a fixed build id; `pnpm serve:out --port 4173`. Evidence goes to `.specify/features/cross-project/evidence/T<NNN>-<kind>-<what>.<ext>` per `.specify/EVIDENCE.md`, with `meta.json` for each visual/perf artifact. Browser steps run unsandboxed.

| Id | Gate (AC) | Command(s) | Pass |
|---|---|---|---|
| G1 | build, types, lint, tests (AC6) | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | exit 0 |
| G2 | fidelity (AC6) | `vitest run test/content-fidelity.test.ts` red (after the JSON patch, before conversion) → green; `content:convert --check` | 2 rows × (a–f) + guard green |
| G3 | schema (AC1) | `vitest run test/relationships.test.ts` red → green | all §3.5 cases |
| G4 | removal (AC1) | §3.5 #5 in CI + one-off build: delete jev-toolkit's entry, convert, build, count `data-site-connections` in both HTML files, restore | jev 0 / wsi 1 (and the mirror); restore makes `git status` clean |
| G5 | unknown slug fails the build (AC1) | one-off: `to: "no-such-project"`, convert, `pnpm build` (log kept), restore; same for a self-reference | build exit ≠ 0; log shows `RelationshipValidationError` + the message; restore clean |
| G6 | strip place, a11y, 390 (AC2, AC3) | feature-local `connections-probe.mjs` on both routes × 390/1440 × light/dark: order, roles/names, link text, Tab walk, focus ring, 44×44, `scrollWidth ≤ clientWidth`, strip rect vs every visible label/note rect | every check passes; 0 intersections |
| G7 | screenshots (AC1, AC2) | element + viewport shots of the strip, both routes × 390/1440 × light/dark, plus a focus-visible shot | 8 + 8 + focus shots, `meta.json` |
| G8 | axe (AC2) | CI `a11y: axe (production routes)`; local `pnpm a11y:axe:site --serve apps/web/out` | 0 serious / 0 critical |
| G9 | CLS (AC3) | `site:probe --serve apps/web/out --group cls` (all four routes) + Lighthouse CLS audits | 0 in every cell; table |
| G10 | S16 sweep re-run (AC3) | `.specify/features/label-system/label-sweep.mjs` full matrix on head (read-only reuse) + its seeded control | 0 intersections; control detected |
| G11 | `/` byte-identical + eager hero (AC4) | §6.2 | all `cmp` equal; hero PASS ×2 base and head |
| G12 | client JS (AC5) | `bundle-gzip.mjs` (budget 1536) base vs head | delta ≤ 1,536 B |
| G13 | draw calls + sitemap (AC5) | `site:probe --group draws`; `cmp` of `sitemap.xml` base vs head | 2 on both project routes; sitemap byte-identical (Q5) |
| G14 | Lighthouse + weight | CI perf gates (already cover `/`, `/projects`, both project routes); supplementary local `perf:lighthouse` / `perf:weight` | ≥ 95/95; < 3 MB |
| G15 | content patch exact (AC1, AC6) | script: JSON minus `relationships` deep-equals the `f0c2d37` JSON, the bytes equal the round-trip, the notes equal the brief strings | pass |
| G16 | seals + guards (AC6) | `guards.sh` (§6.3) | every guard OK |
| G17 | CI (AC6) | 7 required contexts on the PR head | 7/7 green; run URLs |

**Evidence list per AC:**

- **AC1:** `T00x-log-relationships-{red,green}.txt`, `T00x-log-removal-build.txt`, `T00x-log-unknown-slug-build.txt`, `T00x-log-self-ref-build.txt`, strip screenshots.
- **AC2:** `connections-probe` JSON/MD (roles, names, Tab walk, focus, 44×44), axe summary, focus screenshots.
- **AC3:** CLS table (4 routes, light/dark, probe + Lighthouse), 390 scroll-width log, the strip-vs-label rectangles, the sweep re-run summary + control.
- **AC4:** `T00x-log-home-bytes.md` (sha256 table, base vs head), eager-probe outputs for base and head.
- **AC5:** `T00x-log-gzip.txt` (per-file diff + total), draws JSON, sitemap `cmp`.
- **AC6:** `T00x-log-fidelity-{red,green}.txt`, `guards` output, CI run URLs + required-contexts JSON.
- **Closing:** `AC-selfcheck.md` (one row per AC: verdict + evidence links) and an execution-tier table.

---

## 8. Stage 3 task outline (for Stage 2 to formalise)

Order per the brief: content → schema → UI → gates. Each step ends green and carries its own test.

1. **T001 baseline:** fixed-id base export of `f0c2d37`, gzip manifest, `/` network list + sha256s, eager probe on base. No product change.
2. **T002 content:** the JSON patch (§2) → fidelity test (a) red → `ProjectSource` type + `projectInput` + converter `typeImport` + convert → fidelity (a–e2, b adjusted) green. *Note:* the type and pass-through are the minimum that lets the patched content build at all (the strict xploder schema rejects the key). Validation is T003. Gates: G2, G15.
3. **T003 schema:** `relationships.test.ts` red → schema + errors + `resolveConnections` + `connections.ts` → green; fidelity (f)/(e3); hand-copy scan; one-off build failures. Gates: G3, G4 (unit part), G5.
4. **T004 UI:** `Connections` + mount; R0 class check; removal render test; one-off removal build; screenshots. Gates: G4, G7, G11 (bytes).
5. **T005 a11y / layout:** `connections-probe.mjs`, axe, CLS, sweep re-run. Gates: G6, G8, G9, G10.
6. **T006 gates:** G1, G12–G14, G16, G17; `AC-selfcheck.md`.

Executor: DeepSeek Flash 4.1, one fresh worktree per task off the slice branch (probe for a 402 before each dispatch wave). Stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record).

---

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A new Tailwind class changes the shared stylesheet, so `/` changes (seen in the spike) | high if unguarded | R0 + the stylesheet `cmp` in G11; fix by reusing an existing class |
| The workbench's `auto` tour row changes height between static and live, shifting the strip inside the viewport (CLS) | low (the strip sits below the fold at 390×844 and 1440×900) | G9 on all four routes; if > 0, escalate with the shift sources. A fix in the workbench would be out of scope |
| Next prefetch of the target route changes the weight measured at load | low (below the fold) | G14 reports; Q6 |
| The `next build` "security vulnerability" notice stops a build at random (seen twice in the spike: exit 1, passes on retry) | medium | tooling retries once **only** on that exact notice; a Next upgrade is out of scope (reported to Murphy) |
| The full S16 sweep takes ~50 min | certain | run once on the final head; the result is logged |

---

## 10. Open questions (each with a default)

1. **Q1 — The two notes (Murphy dependency).** **Default:** approve verbatim. Observation, no change proposed: on websocket-inspector the link reads **"JEV Benchmark"** (jev-toolkit's `meta.name`), while the note says "the harness in **jev-toolkit**". Both names are true (project name vs repository), but a reader sees two names for one project. Changing the note is Murphy's call (it is content).
2. **Q2 — Strip label.** The list needs an accessible name. **Default:** a visible eyebrow `h2` "Connections" (the component name from the brief), styled like the outline's "Metrics". It also names the region and the list. It is UI chrome, like "Case study", "Metrics" and the "Project links" label, not project prose. Alternatives: (a) the same word as `aria-label` only, with no visible heading; (b) put it in `site.json` (a content edit beyond the brief; not recommended).
3. **Q3 — zod without a new dependency.** **Default:** build the schema from xploder's exported instances (§3.1). There is no `package.json` or lockfile change, and the slug and text rules are the site's own. Alternative: declare `zod@^4.6.7` in `apps/web` (the same resolved package, but a new direct dependency on paper, which the brief forbids).
4. **Q4 — Duplicate targets.** **Default:** reject (`Duplicate relationship to …`). One link per project keeps list keys unique and the strip honest. This is not an AC; it is a schema robustness rule.
5. **Q5 — "existing three" in AC5.** The sitemap has **four** URLs today (`/`, `/projects`, two project routes). The AC is not reworded. **Default proof:** `sitemap.xml` is byte-identical, base vs head (no route is added at all). That satisfies the AC under any reading.
6. **Q6 — Link prefetch.** **Default:** `next/link` with default prefetch, the same as every other in-site link. Alternative: `prefetch={false}`, which saves a background fetch if the strip scrolls into view (not measured at load).
7. **Q7 — Tooling home.** **Default:** feature-local scripts (`guards.sh`, `connections-probe.mjs`, `bundle-gzip.mjs` copy at 1536, `home-bytes.sh`). The S16 sweep is reused read-only. **No `tools/perf` or CI workflow change**: the existing CI already gates all four routes and runs axe on full pages. Alternative: a permanent `connections` group in `site-probe.ts` (more CI coverage, more diff).
8. **Q8 — JSON-LD / OG.** **Default:** unchanged. No `isRelatedTo` and no OG mention; both are out of the brief's scope. Proof: OG PNG hashes, the JSON-LD block and the meta tags of both project routes are identical to base.

---

## 11. Gate 1 record

**Gate 1 (Murphy, 2026-11-17): "all defaults. you can upgrade it as well on this s17".** Every §10 question resolves to its default:

| Q | Decision |
|---|---|
| Q1 | both notes approved verbatim (the "JEV Benchmark" vs "jev-toolkit" naming stays as written) |
| Q2 | visible eyebrow `h2` "Connections"; it names the region and the list |
| Q3 | schema built from xploder's exported zod instances; no `zod` in `apps/web` |
| Q4 | duplicate targets rejected |
| Q5 | `sitemap.xml` byte-identical, base vs head |
| Q6 | `next/link` with default prefetch |
| Q7 | feature-local tooling; no `tools/perf` or workflow change |
| Q8 | JSON-LD and OG unchanged |

**Murphy-authorised addition U1: the Next.js security upgrade, done in S17.**

- `next` and `eslint-config-next` go from `16.4.3` to `16.4.6`, the latest patch. This fixes GHSA-mfr8-8qww-v76h (moderate, `>=16.3.0 <=16.4.4`). That is the advisory behind the `SecurityFatalError` notice that stopped two spike builds.
- This is not a brief revision: no AC or scope line changes, and the revision counter stays at 0 of 2. It is not a new dependency either, since both packages are already direct dependencies.
- `pnpm audit` also lists `glob` (via lighthouse in `tools/perf`) and `minimatch` (via eslint). Both are dev-tool transitive dependencies outside the Next upgrade. They are reported, not changed.

**Refinements (orchestrator, Stage 2 re-check against the code; none changes an AC):**

- **R1 — the upgrade lands first, and the byte baselines move to it.** U1 is task T001: its own commit, with gates run on it. A framework bump changes framework chunk bytes on every page, `/` included. So the **AC4 byte comparison and the AC5 JS delta measure the S17 feature against the upgrade commit `B1`**, not `f0c2d37`. The upgrade's own effect (`f0c2d37` → `B1`: `/` files that change, JS gzip Δ, Lighthouse) is measured and reported separately, so nothing is hidden. **If Murphy instead wants AC4 to hold against `f0c2d37`, the upgrade must ship as its own PR to `main` first (`bug/next-16-4-6`), and S17 rebases on it.** That is the only way both can hold literally. Default: R1, as authorised.
- **R2 — `NO-DEP-OK` made exact.** `package.json` may differ only in the two `next` / `eslint-config-next` version strings. In `pnpm-lock.yaml`, the set of package **names** must be unchanged; only `next`, `@next/*` and `eslint-config-next` versions may move.
- **R3 — fixed build id for every byte comparison.** `build-fixed.sh` sets `VERCEL_GIT_COMMIT_SHA=s17-fixed-build-id`. After T001 the build must run three times without the security notice, which proves the upgrade. The retry-on-notice is kept only for the `f0c2d37` reference build.
- **R4 — R0 also checked in CI.** A new `test/connections-classes.test.ts` asserts that every class token in `components/connections.tsx` also appears in another file under `app/` or `components/`. It is a cheap proxy for "already in the stylesheet" that runs without a build. The stylesheet `cmp` (G11) stays the binding proof.
- **R5 — sweep re-run = the S16 final matrix.** `label-matrix.mjs` with `--routes projects,home` on `out` and `--routes fixtures` on `out-fixtures`, plus `--control`: the same 2,052 cells as S16 T012.
- **R6 — `next dev` may rewrite `apps/web/AGENTS.md` after the upgrade.** If it does, the diff is reviewed for secrets and committed with T001 (the S04 rule). It is the only extra path `ALLOWED-PATHS-OK` admits for T001.

**Stage 2 gate (Murphy, 2026-11-17): "1. r1 2. go".** R1 confirmed: the upgrade lands in S17 as T001, and AC4/AC5 measure the feature against `B1`. Stage 3 started.

**Corrections during Stage 3:**

- **C1 (orchestrator, before T003):** the one-off "unknown slug / self-reference fails the build" runs move from T003 to T004. In T003 no page imports `connections.ts` yet, so a build could not fail there. T003 proves the throw in unit tests; T004 proves it at build level once the route mounts the strip. No AC changes.
