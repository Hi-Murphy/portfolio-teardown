# T000 — RFC spike log (throwaway, reverted)

**What:** a pre-RFC measurement, not an implementation. On branch `task/s18-agent-fleet` at `33e2ba1`, the
orchestrator temporarily wired a minimal registration into the working tree (converter entry, generated
`agent-fleet.source.ts`, an `agent-fleet.ts` module, `PROJECTS` entry), built it, measured it, and then
reverted it. Afterwards `git status --short` was empty.

**Builds:** both used a fixed build id (`VERCEL_GIT_COMMIT_SHA=s18-fixed-build-id pnpm build`), with `SITE_URL`
unset (local build, `http://localhost:3000`). "base" = `33e2ba1` as committed (S17 product code). "spike" =
base + the minimal registration. Exports were copied to a temp directory outside the repo. The throwaway
scan scripts also lived outside the repo.

## 1. Build and route set

| Check | Result |
|---|---|
| spike `pnpm build` | exit 0; `/projects/agent-fleet` prerendered (SSG) next to the two existing routes |
| `sitemap.xml` `<loc>` | base **4** → spike **5** (`/`, `/projects`, `/projects/websocket-inspector`, `/projects/jev-toolkit`, `/projects/agent-fleet`) |
| OG PNGs | base **4** → spike **5** |
| `og/projects/agent-fleet.png` | 1200×630, 71,217 B, sha256 `d6fe5cc89009…` |
| `og/home.png` (changed: third title-block row) | 1200×630, 75,635 B, sha256 `e135605e8c40…` |
| `og/projects.png` (changed: third name + third silhouette) | 1200×630, 91,277 B, sha256 `62c830e31fde…` |
| `og/projects/websocket-inspector.png`, `og/projects/jev-toolkit.png` | **byte-identical** to base |
| CSS (`_next/static/**/*.css`) | **byte-identical** to base (no new utility class) |

## 2. What changed in the export (`diff -rq base spike`)

- **Added:** `projects/agent-fleet.html`, `projects/agent-fleet.txt`, `projects/agent-fleet/` (RSC payloads),
  `og/projects/agent-fleet.png`.
- **Changed, expected (the list gained an entry):** `index.html` + `index.txt` + root RSC payloads,
  `projects.html` + `projects.txt` + `projects/__next.*.txt`, `404.html` + `_not-found*` (the 404 page lists the
  project cards), `sitemap.xml`, `og/home.png`, `og/projects.png`.
- **Changed, NOT expected by AC7:** `projects/websocket-inspector.html` and `projects/jev-toolkit.html` (plus their
  `.txt`/RSC payloads). The **only** difference in each HTML is one chunk filename, repeated 3 times:
  `/_next/static/chunks/18o_7-7eq6i8z.js` → `/_next/static/chunks/3mk0h__x4wnnu.js`.
- **Chunks:** 3 removed, 3 added. They form one hash cascade:

| base chunk | size | role | spike chunk |
|---|---:|---|---|
| `0ex_cgonf0mx6.js` | 154,682 B (43,000 B gzip) | lazy workbench client; imports `getProject` → bundles **every** project's content (20 × `jev-toolkit`, 19 × `websocket-inspector` strings) | `3e4idlbvq0_1s.js` 163,001 B (45,686 B gzip) |
| `3-e0pq-vkwdqo.js` | 1,278 B | loader map; contains the workbench chunk's filename | `1mqw3u0vh6npd.js` |
| `18o_7-7eq6i8z.js` | 2,394 B | page chunk (interaction gate + lazy loader); contains the loader chunk's filename; referenced from both project HTML files | `3mk0h__x4wnnu.js` |

- **Client JS total** (gzip -9, every `_next/**/*.js`): base 474,021 B → spike 476,706 B = **+2,685 B**, all of
  it the agent-fleet content in the lazy workbench chunk.

## 3. Empty rendering in the spike (no fix applied)

| Surface | Result |
|---|---|
| `/` card `data-site-card="agent-fleet"` | `<ul aria-label="Tech" class="flex flex-wrap gap-2"></ul>` **present, empty** (0 `li`) |
| `/projects` card | same empty `<ul aria-label="Tech">`; 0 "Source" links |
| `404` card | same empty `<ul aria-label="Tech">` |
| `/projects/agent-fleet` header | 0 `aria-label="Project links"`, 0 `data-site-connections`, 0 `aria-label="Tech"` |

So `TechChipList` renders an empty labelled list when it gets zero chips. Everything else already collapses.

## 4. Redaction patterns on the built export (raw substring hits, brief patterns verbatim)

G1 on `.specify/content/agent-fleet.json` with the same patterns: **0 hits**. The JSON contains no `/`, so F4
cannot match.

Scan surface for G2: every `.html`, `.txt` (RSC), `.js`, `.css`, `.xml` file in the export. F4 and F9 rows use
the candidate regexes from RFC §5.1, since the brief describes those classes in words.

| Pattern | base (S17 code) | spike (+agent-fleet) | where (spike) |
|---|---:|---:|---|
| F1 ipv4 | 399 | 477 | .html 162, .txt 315 |
| F1 ipv6 | 3 | 3 | .js 3 |
| F2 host | 25 | 25 | .js 25 |
| F2 ssh | 0 | 0 | — |
| F3 ghp_ | 0 | 0 | — |
| F3 github_pat_ | 0 | 0 | — |
| F3 sk- | 17 | 17 | .js 3, .html 5, .txt 9 |
| F3 AKIA | 0 | 0 | — |
| F3 xox | 0 | 0 | — |
| F3 BEGIN | 0 | 0 | — |
| F3 eyJ | 0 | 0 | — |
| F3 Bearer | 0 | 0 | — |
| F4 bare owner/repo | 3242 | 3830 | .html 1094, .txt 1984, .js 744, .css 2, .xml 6 |
| F4 github.com URL | 150 | 150 | .txt 75, .js 44, .html 31 |
| F5 17-19 digits | 2314 | 3074 | .txt 1839, .js 9, .html 1226 |
| F6 /home/ | 0 | 0 | — |
| F6 /Users/ | 0 | 0 | — |
| F6 ~/x | 1 | 1 | .js 1 |
| F9 email | 138 | 164 | .html 56, .txt 108 |

**What the hits are (sampled by hand):**

- **F1 ipv4:** compact SVG path data in the posters, e.g. `-.27.38.01.53.34.19` (`0.27 0.38 …` with the leading
  zeros dropped).
- **F1 ipv6:** minified JS ternary chains, e.g. `?27:5:26` (decimal digits and colons).
- **F2 host:** `a.internal.interaction…`, the R3F store's `internal` member access in the three/R3F chunk.
- **F3 sk-:** `mask-image` (inline style on `/`), `mask-type` (React DOM attribute table), and the jev-toolkit component
  id `task-model`.
- **F4 bare:** `image/png`, `static/chunks`, `width/2`, `sitemap/0.9`, route paths. **F4 URL:** the two allowlisted
  project repos, plus public third-party repos quoted in dependency code (`react-spring/react-use-measure`,
  `zloirock/core-js`, …).
- **F5:** float fractions in SVG geometry and RSC payloads (`0.19999999999999996`), int64 bounds in zod
  (`9223372036854775807`), and one tweet id inside a three.js shader comment URL.
- **F6 `~/`:** a JSON-pointer escape in zod (`replace(/~/g,"~0")`).
- **F9:** the public contact address from `site.json` identity (footer `mailto:`), on every page.

**Differential (distinct matched strings, spike minus base):** 85 → 91 distinct. The **only** new distinct
strings are **6 F5 float fractions** from the new 4-layer poster geometry (e.g. `25999999999999995`). The
agent-fleet route adds no new distinct textual match in any class.

**Conclusion recorded for the RFC:** with the brief's patterns applied literally to raw build bytes, G2 cannot
reach "0 hits". The S17 site already produces 3,046 raw hits before a single agent-fleet byte exists, and none of
them is a secret. RFC §5.3 and escalation E2 cover it.
