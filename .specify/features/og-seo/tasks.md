# Tasks: S11 OG Cards & SEO

**Input:** `rfc.md` (approved, §9 Gate 1: all defaults, Q1 confirmed), `spec.md`, `plan.md` in `.specify/features/og-seo/`

**Executor:** DeepSeek Flash 4.1 seat (tier 1: `codex exec -p deepseek`). The **sandbox is off** for every task here: each check runs `next build`/Turbopack or vitest with loopback, which the Codex sandbox blocks (S10 lesson). Writes are limited to the task worktree and `/tmp/s11-checks`. A DeepSeek 402 means the executor is *unavailable*, not that it failed: probe it, report, and do not count it as a tier-1 failure.

**Escalation (kickoff Hard Rule 8):**
- Tier 1.5 (OpenRouter) is **DORMANT**, so it is skipped and recorded per task.
- If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h usage, then executes the task personally on Murphy's go.
- Each report states the finishing tier and any skip.

**Usage pacing:**
- Murphy states "5h: N%" at gates (Gate 1: 84%).
- At ≥ 85% of the 5h window no new task starts: finish and commit the current task, tick the ledger, report, STOP.

**Worktrees:** each task runs in a fresh worktree off `task/s11-og-seo` on branch `task/s11-og-seo-tNNN`. The orchestrator reviews it and merges it back into `task/s11-og-seo` with `--no-ff`. The worktree is removed only after its merge (global rule).

**Evidence doctrine (kickoff Hard Rule 7):** every claim attaches a machine artifact per `.specify/EVIDENCE.md` (`evidence/T<NNN>-<kind>[-<variant>].<ext>`). Perf claims use the dropped-frames style only. Budgets come from `tools/perf/src/budgets.ts` and are never changed.

**Format & rules (every task):**
- Every check starts with `set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence`.
- Every check ends with `bash .specify/features/og-seo/guards.sh` (from T001 on) and `pnpm typecheck && pnpm lint && pnpm test`. Tasks that touch `apps/web` routes also run `pnpm build`.
- There are no product strings in code outside `apps/web/content/*`. There are no colour literals: palette roles only, via `xploder/theme`. There are no motion literals.
- Never touch `packages/xploder/**`, `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`, dev/fixture routes, or the existing CI jobs.
- Commit message prefix: `S11/TNNN:`, ending with the attribution lines. Run `gitleaks dir` on new prose before committing (Stage 1 false-positive lesson).

## Ledger (resume point: update at every task boundary)

| Task | Status | Tier | Evidence | Merge SHA |
|---|---|---|---|---|
| T001 | ☑ (13 guards; negative control FAIL XPLODER + S2S4; baseline 17 JS / 1 771 865 B) | 1 (Flash, sandbox off) + orchestrator review fix (build-id path normalization + test) | evidence/T001-log-{guard.txt,bundle-before.json} | 677eda0 |
| T002 | ☑ (next/og, no fallback; double render identical, 1200×630, 27 921 B; Plex Sans 1.1.0 / Mono 2.5.0, OFL) | 1 (Flash, sandbox off) | evidence/T002-log-render.txt | fce9af1 |
| T003 | ☑ (11-case D2 matrix incl. guards) | 1 (Flash, sandbox off); check re-run by orchestrator after T001 merge (guards.sh absent at dispatch) | evidence/T003-log-site-url.txt | 18c0be7 |
| T004 | ☑ (D3 table on 4 routes; 404 no canonical/og:url + noindex; not-found metadata accepted) | 1 (Flash, sandbox off) + orchestrator review fix R1 (home URL = bare origin) | evidence/T004-log-metadata.txt | baf3ef6 |
| T005 | ☑ (3 cards 1200×630: 74 310 / 69 640 / 79 743 B; build-1 = build-2 SHA-256; 5 slabs) | 1 (Flash, sandbox off) + orchestrator review fix (title line-height 0.98 → 1.1, descenders clipped) | evidence/T005-{log-og-cards.txt,screenshot-og-*.png} | f6bca8e |
| T006 | ☑ (sitemap = 3 indexable URLs; robots Allow / · Disallow /dev/ · Sitemap) | 1 (Flash, sandbox off) | evidence/T006-log-{sitemap-robots.txt,sitemap.xml,robots.txt} | cd61728 |
| T007 | ☑ (Person + SoftwareApplication/SoftwareSourceCode; schema-dts 2.1.0) | 1 (Flash, sandbox off) | evidence/T007-log-json-ld.txt | b0e6c63 |
| T008 | ☑ (icon.svg light+dark, apple 180×180 opaque; 4/4 tags on all 5 HTML routes) | 1 (Flash, sandbox off) + orchestrator fixes for 2 plan defects (seo-metadata expectation outside file list; grep -c on one-line HTML) | evidence/T008-{log-icons.txt,log-icon.svg,screenshot-apple-touch-icon.png} | 6427a64 |
| T009 | ☑ (6 steps PASS on 3 routes; 9/9 on all 5 HTML files; build-1 = build-2; neg control exit 6; vocab = schema.org V30.1) | 1 (Flash, sandbox off) + orchestrator vocab verification vs live schema.org | evidence/T009-log-{seo-probe.txt,seo-probe.json,seo-probe.md,schema-vocab-verify.txt} | ba8e204 |
| T010 | ☑ (PR #15: 11/11 checks green incl. seo: meta + og; red proof PR #16 exit 6 then closed; CI x64 card hashes = local arm64) | 1 (Flash, sandbox off) for the job; orchestrator: push, PRs, red proof, eslint scope fix | evidence/T010-{ci-run.txt,ci-regression-proof.txt} | 3c2ca4e |
| T011 | ☐ | | | |

---

## Phase G1 — Foundations (STOP after T004)

### T001 [US5] Guards + bundle-manifest tool + baseline manifest

- **Seam:** branch ↔ frozen surfaces; base export ↔ the AC6 "before" snapshot.
- **Files:**
  - `.specify/features/og-seo/guards.sh`: the plan.md "Guards" block in S10's `guard NAME cmd` style. It prints `FAIL <name>` and exits 1 on any failure.
  - `tools/perf/src/bundle-manifest.ts` + `tools/perf/src/cli/bundle-manifest.ts` (plan.md "Tools"), `tools/perf/test/bundle-manifest.test.ts` (added/removed/grown verdicts on synthetic manifests), root script `"bundle:manifest": "node tools/perf/src/cli/bundle-manifest.ts"`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  bash .specify/features/og-seo/guards.sh | tee /tmp/s11-checks/t001.txt
  printf ' ' >> packages/xploder/src/index.ts
  if bash .specify/features/og-seo/guards.sh >/tmp/s11-checks/t001-neg.txt 2>&1; then echo NEG-CONTROL-FAILED; exit 1; fi
  git checkout -- packages/xploder/src/index.ts; grep FAIL /tmp/s11-checks/t001-neg.txt | tee -a /tmp/s11-checks/t001.txt
  pnpm --filter perf-tools exec vitest run test/bundle-manifest.test.ts 2>&1 | tee -a /tmp/s11-checks/t001.txt
  git worktree add /tmp/s11-base 3ba4c3b && (cd /tmp/s11-base && pnpm install --frozen-lockfile && pnpm build)
  pnpm bundle:manifest --out-dir /tmp/s11-base/apps/web/out --write .specify/features/og-seo/evidence/T001-log-bundle-before.json | tee -a /tmp/s11-checks/t001.txt
  git worktree remove --force /tmp/s11-base
  pnpm typecheck && pnpm lint && pnpm test && echo T001-OK
  ```
- **Evidence:** `evidence/T001-log-guard.txt` (all guards OK + the negative control's `FAIL XPLODER`) · `evidence/T001-log-bundle-before.json`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the agent log; the negative control shows the guard bites).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: base = `3ba4c3b`, S10's code on `main`).

### T002 [US1] Renderer proof: `seo/og/render.ts` + vendored fonts

- **Seam:** `next/og` (satori + resvg wasm) ↔ app code, outside the page bundle.
- **Files:**
  - `apps/web/seo/og/fonts/IBMPlexSans-SemiBold.ttf`, `IBMPlexMono-Regular.ttf`, `OFL.txt` (from the official IBM Plex GitHub release `IBM/plex`, TTF assets), `SOURCE.md` (release tag, asset URLs, SHA-256 per file, licence).
  - `apps/web/seo/og/fonts.ts` (`loadFonts()`: `fs.readFile` relative to `apps/web`, cached) and `apps/web/seo/og/render.ts` (`renderPng(element, { width, height })`).
  - `apps/web/test/seo-render.test.ts`: renders a minimal tokens-only element (palette `paper` ground + one line of mono text) twice → identical SHA-256. It checks the IHDR is 1200×630 and the size is ≤ 307 200 bytes. A negative control renders a different string → different hash.
- **Decision gate:** if `next/og` cannot render under vitest or in a `force-static` handler (RFC R1), switch to the RFC Q4 fallback (pinned `satori` 0.63.2 + `@resvg/resvg-wasm` 2.6.2, wasm init from the package file) inside `render.ts` only, and record it in `SOURCE.md` + the ledger. The `renderPng` signature does not change.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks
  (cd apps/web/seo/og/fonts && shasum -a 256 *.ttf) | tee /tmp/s11-checks/t002.txt
  pnpm --filter web exec vitest run test/seo-render.test.ts --reporter verbose 2>&1 | tee -a /tmp/s11-checks/t002.txt
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t002.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm build && echo T002-OK
  ! find apps/web/out \( -name '*.ttf' -o -name '*.woff*' \) | grep . && echo NO-FONTS-IN-OUT | tee -a /tmp/s11-checks/t002.txt
  ```
- **Evidence:** `evidence/T002-log-render.txt` (font hashes, double-render hashes, dimensions, bytes, renderer chosen).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log). The card design is reviewed at G2.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: IBM Plex, RFC Q5; the fallback renderer only if `next/og` fails, recorded).

### T003 [US3] `seo/site-url.ts`: `resolveSiteUrl` + `absoluteUrl`

- **Seam:** build environment ↔ every absolute URL.
- **Files:** `apps/web/seo/site-url.ts` (plan.md "Metadata layer"); `apps/web/test/seo-site-url.test.ts` with the RFC D2 matrix:
  - `SITE_URL` wins, normalized (`https://hi-murphy.me/`, `https://hi-murphy.me/x` → `https://hi-murphy.me`). `http://` with a non-localhost host throws.
  - production → `https://${VERCEL_PROJECT_PRODUCTION_URL}`; preview/development → `https://${VERCEL_URL}`; nothing set → `http://localhost:3000` + a warning.
  - Guards: `VERCEL=1` with a localhost result throws. `VERCEL_ENV=production` with the result equal to `https://${VERCEL_URL}` throws.
  - `absoluteUrl('/')` = `<origin>/`, `absoluteUrl('/projects')` = `<origin>/projects`, and a path without a leading `/` throws.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks
  pnpm --filter web exec vitest run test/seo-site-url.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t003.txt
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t003.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T003-OK
  ```
- **Evidence:** `evidence/T003-log-site-url.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the matrix log).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: no Vercel env change in S11; S16 sets `SITE_URL`).

### T004 [US1] Route registry + `routeMetadata` wired into the layout, pages and 404

- **Seam:** content modules ↔ `<head>` of every route.
- **Files:**
  - `apps/web/seo/routes.ts`, `apps/web/seo/metadata.ts` (plan.md "Metadata layer"; RFC D3 table).
  - Edits: `app/layout.tsx` (`metadata = baseMetadata()`, `viewport = SITE_VIEWPORT`), `app/(site)/page.tsx`, `app/(site)/projects/page.tsx`, `app/(site)/projects/[slug]/page.tsx`, `app/not-found.tsx`. If Next rejects `metadata` in `not-found.tsx`, drop it there and rely on the base (record it).
  - Tests: `test/seo-routes.test.ts`, `test/seo-metadata.test.ts` (every D3 cell recomputed from `SITE`/`PROJECTS`), updated `test/site-metadata.test.ts`. Add `seo/` to the roots of `no-color-literals`, `no-hand-copied-content` and `prod-imports`. New `test/seo-server-only.test.ts`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks
  pnpm --filter web exec vitest run test/seo-routes.test.ts test/seo-metadata.test.ts test/site-metadata.test.ts test/seo-server-only.test.ts test/no-color-literals.test.ts test/no-hand-copied-content.test.ts test/prod-imports.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t004.txt
  SITE_URL=https://hi-murphy.me pnpm build
  for f in index projects projects/websocket-inspector 404; do echo "== $f"; grep -oE '<(meta|link)[^>]*(og:|twitter:|canonical|description|theme-color)[^>]*>|<title>[^<]*</title>' "apps/web/out/$f.html"; done | tee -a /tmp/s11-checks/t004.txt
  ! grep -lE 'localhost|vercel\.app' apps/web/out/{index,projects,404}.html apps/web/out/projects/websocket-inspector.html && echo NO-FOREIGN-HOST | tee -a /tmp/s11-checks/t004.txt
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t004.txt
  pnpm typecheck && pnpm lint && pnpm test && pnpm --filter web exec vitest run test/fixture-exclusion.test.ts && echo T004-OK
  ```
- **Evidence:** `evidence/T004-log-metadata.txt` (unit log + rendered head tags for 4 routes). The `og:image` URLs point at `/og/*.png`, which T005 creates (a probe 404 is expected until then).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Optional: the head-tag excerpt in the evidence log (titles/descriptions are S10's visible strings). Default: the log.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: the RFC D3 table).

**G1 STOP:** report the ledger, evidence links, tiers and usage; wait for Murphy.

---

## Phase G2 — Artifacts (STOP after T008; Murphy reviews the PNGs + icon)

### T005 [US1] Card model + card element + `app/og/[...card]/route.ts`

- **Seam:** content + tokens + poster geometry ↔ `out/og/*.png`.
- **Files:**
  - `apps/web/seo/og/card-model.ts`, `apps/web/seo/og/card.tsx` (RFC D5; plan.md "OG pipeline"), `apps/web/app/og/[...card]/route.ts`.
  - `apps/web/test/seo-card.test.ts`: per indexable route, the model strings equal the content fields from the D5 table. The silhouette layer-slab count is `project.layers.length` (5 for websocket-inspector). Every colour in the element tree is a `blueprint.light` value. The fonts cover every glyph of every string used (font cmap check). Clamp/cap logic is tested on a synthetic long-name project.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  pnpm --filter web exec vitest run test/seo-card.test.ts test/seo-render.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t005.txt
  rm -rf apps/web/.next apps/web/out; SITE_URL=https://hi-murphy.me pnpm build
  (cd apps/web/out/og && find . -name '*.png' | sort | xargs shasum -a 256) > /tmp/s11-checks/t005-h1.txt
  rm -rf apps/web/.next apps/web/out; SITE_URL=https://hi-murphy.me pnpm build
  (cd apps/web/out/og && find . -name '*.png' | sort | xargs shasum -a 256) > /tmp/s11-checks/t005-h2.txt
  diff /tmp/s11-checks/t005-h1.txt /tmp/s11-checks/t005-h2.txt && echo HASHES-IDENTICAL | tee -a /tmp/s11-checks/t005.txt
  cat /tmp/s11-checks/t005-h1.txt | tee -a /tmp/s11-checks/t005.txt
  for f in $(cd apps/web/out/og && find . -name '*.png' | sort); do printf '%s ' "$f"; file "apps/web/out/og/$f" | grep -o '[0-9]* x [0-9]*' | tr '\n' ' '; stat -f %z "apps/web/out/og/$f"; done | tee -a /tmp/s11-checks/t005.txt
  cp apps/web/out/og/home.png .specify/features/og-seo/evidence/T005-screenshot-og-home.png
  cp apps/web/out/og/projects.png .specify/features/og-seo/evidence/T005-screenshot-og-projects.png
  cp apps/web/out/og/projects/websocket-inspector.png .specify/features/og-seo/evidence/T005-screenshot-og-websocket-inspector.png
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t005.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T005-OK
  ```
- **Evidence:** `evidence/T005-log-og-cards.txt` (unit log, build-1 vs build-2 hashes, dims, bytes) · the three `T005-screenshot-og-*.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. **At G2:** open the three PNGs. Each shows the route's name, the layer silhouette (5 slabs for Scarlet Inspector) and the title block, in the light blueprint palette. Default: approve if nothing is said.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Card feedback at G2, if any (default: the RFC D5 layout ships).

### T006 [US2] `app/sitemap.ts` + `app/robots.ts`

- **Seam:** route registry ↔ `out/sitemap.xml`, `out/robots.txt`.
- **Files:** `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts` (plan.md); `apps/web/test/seo-sitemap.test.ts`: the sitemap entries equal `INDEXABLE_ROUTES.map(absoluteUrl)`; the robots rules and sitemap URL match; neither contains `/dev/engine`, `fixtures` or `fps-calibration`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  pnpm --filter web exec vitest run test/seo-sitemap.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t006.txt
  SITE_URL=https://hi-murphy.me pnpm build
  cp apps/web/out/sitemap.xml .specify/features/og-seo/evidence/T006-log-sitemap.xml
  cp apps/web/out/robots.txt .specify/features/og-seo/evidence/T006-log-robots.txt
  ! grep -E 'dev/engine|fixtures|fps-calibration' apps/web/out/sitemap.xml apps/web/out/robots.txt && echo NO-DEV-ROUTES | tee -a /tmp/s11-checks/t006.txt
  pnpm --filter web exec vitest run test/fixture-exclusion.test.ts 2>&1 | tail -3 | tee -a /tmp/s11-checks/t006.txt
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t006.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T006-OK
  ```
- **Evidence:** `evidence/T006-log-sitemap-robots.txt` · `T006-log-sitemap.xml` · `T006-log-robots.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the committed files).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: no `lastmod`, RFC D6).

### T007 [US2] JSON-LD: `seo/json-ld.ts` + `<JsonLd>` on home and project routes

- **Seam:** content ↔ `<script type="application/ld+json">`.
- **Files:**
  - `apps/web/seo/json-ld.ts`, `apps/web/components/json-ld.tsx`; edits to `app/(site)/page.tsx` and `app/(site)/projects/[slug]/page.tsx`; `apps/web/package.json` devDep `schema-dts` (exact version, lockfile updated).
  - `apps/web/test/seo-json-ld.test.ts`: the RFC D7 tables. Every leaf equals a content field or `absoluteUrl(...)`. `sameAs` skips null URLs. No `Source` link → no `codeRepository` (synthetic project). Escaping: a `</script>` in a synthetic string is emitted as `\u003c/script>`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks
  pnpm --filter web exec vitest run test/seo-json-ld.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t007.txt
  SITE_URL=https://hi-murphy.me pnpm build
  for f in index projects/websocket-inspector; do echo "== $f"; grep -oE '<script type="application/ld\+json">[^<]*</script>' "apps/web/out/$f.html"; done | tee -a /tmp/s11-checks/t007.txt
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t007.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T007-OK
  ```
- **Evidence:** `evidence/T007-log-json-ld.txt` (unit log + the rendered JSON-LD for both routes).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; every field traces to `site.json` / `websocket-inspector.json`).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC Q8/Q9).

### T008 [US5] Icons + theme-color

- **Seam:** tokens + title-block motif ↔ `out/icon.svg`, `out/apple-touch-icon.png`, `<link rel=icon|apple-touch-icon>`, `<meta name=theme-color>`.
- **Files:** `apps/web/seo/icon.ts`, `apps/web/app/icon.svg/route.ts`, `apps/web/app/apple-touch-icon.png/route.ts`; `icons` in `baseMetadata()`, which T004 already exports as `viewport`. `apps/web/test/seo-icon.test.ts`: the SVG parses (jsdom), its colours ⊂ `blueprint.light ∪ blueprint.dark`, and it has a dark media block. The apple icon is 180×180 PNG with an opaque ground.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  pnpm --filter web exec vitest run test/seo-icon.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t008.txt
  SITE_URL=https://hi-murphy.me pnpm build
  file apps/web/out/apple-touch-icon.png | tee -a /tmp/s11-checks/t008.txt
  for f in $(cd apps/web/out && find . -name '*.html' | sort); do printf '%s ' "$f"; grep -c -E 'rel="icon" href="/icon.svg"|rel="apple-touch-icon" href="/apple-touch-icon.png"|name="theme-color"' "apps/web/out/$f"; done | tee -a /tmp/s11-checks/t008.txt
  cp apps/web/out/icon.svg .specify/features/og-seo/evidence/T008-log-icon.svg
  cp apps/web/out/apple-touch-icon.png .specify/features/og-seo/evidence/T008-screenshot-apple-touch-icon.png
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t008.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T008-OK
  ```
  (Every HTML file must report 4 matches: icon, apple-touch-icon, and the two theme-color metas. T009 asserts this precisely.)
- **Evidence:** `evidence/T008-log-icons.txt` · `T008-log-icon.svg` · `T008-screenshot-apple-touch-icon.png`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. **At G2:** the tab icon in Orca's browser (`pnpm dev`, light and dark OS scheme), and the committed `apple-touch-icon` PNG. Default: approve if nothing is said.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Icon feedback at G2, if any (default: the RFC D8 motif).

**G2 STOP:** present the three OG PNGs, the icon and the head tags; the orchestrator runs `pnpm dev` + an Orca browser tab for `/og/*.png`; wait for Murphy.

---

## Phase G3 — Verification + CI (STOP after T010)

### T009 [US1–US5] `seo:probe` (RFC D9 steps 1–6) + expectation writer + vocabulary subset

- **Seam:** `apps/web/out` ↔ machine verdict for AC1–AC5 + the AC7 icon/theme-color rule.
- **Files:**
  - `tools/perf/src/seo-probe.ts`, `tools/perf/src/cli/seo-probe.ts`, `tools/perf/src/schema-vocab.json` (plan.md "Tools"; version + source URL in-file).
  - `tools/perf/package.json` devDeps `jsdom`, `open-graph-scraper` (exact versions); root script `"seo:probe": "node tools/perf/src/cli/seo-probe.ts"`.
  - `apps/web/test/seo-expect.write.test.ts` + `apps/web/package.json` script `seo:expect`; `.gitignore` gets `apps/web/out-seo-expect.json`.
  - `tools/perf/test/seo-probe.test.ts`: the IHDR parser; the vocab check (a valid doc passes; an unknown property or a wrong domain fails); the leak classifier (`localhost`, `127.0.0.1`, a `*.vercel.app` preview host and `https://evil.example` each fail; a content-verbatim `sameAs` passes; a `sameAs` not in content fails); sitemap set equality; a missing or relative `og:image` fails.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  pnpm --filter perf-tools exec vitest run test/seo-probe.test.ts --reporter verbose 2>&1 | tee /tmp/s11-checks/t009.txt
  export SITE_URL=https://hi-murphy.me
  rm -rf apps/web/.next apps/web/out; pnpm build; pnpm --filter web seo:expect
  pnpm seo:probe --out-dir apps/web/out --site-url "$SITE_URL" --expect apps/web/out-seo-expect.json --out /tmp/s11-checks/seo-1 | tee -a /tmp/s11-checks/t009.txt
  rm -rf apps/web/.next apps/web/out; pnpm build; pnpm --filter web seo:expect
  pnpm seo:probe --out-dir apps/web/out --site-url "$SITE_URL" --expect apps/web/out-seo-expect.json --compare /tmp/s11-checks/seo-1/og-hashes.json --out /tmp/s11-checks/seo-2 | tee -a /tmp/s11-checks/t009.txt
  # negative control: rebuild with the current production origin while the probe still expects $SITE_URL (hi-murphy.me) → host leak → exit 6
  set +e; SITE_URL=https://portfolio-teardown.vercel.app pnpm build >/dev/null 2>&1
  pnpm seo:probe --out-dir apps/web/out --site-url "$SITE_URL" --expect apps/web/out-seo-expect.json >/tmp/s11-checks/t009-neg.txt 2>&1; code=$?; set -e
  test "$code" = 6 && echo "NEG-CONTROL host leak: exit 6 as expected" | tee -a /tmp/s11-checks/t009.txt
  cp /tmp/s11-checks/seo-2/seo-probe.json .specify/features/og-seo/evidence/T009-log-seo-probe.json
  cp /tmp/s11-checks/seo-2/summary.md .specify/features/og-seo/evidence/T009-log-seo-probe.md
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t009.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T009-OK
  ```
- **Evidence:** `evidence/T009-log-seo-probe.{txt,json,md}` (all six steps per route, hashes build-1 = build-2, the unfurl view, the negative control).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: `T009-log-seo-probe.md`, a per-route pass table).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: schema.org vocabulary subset from the current release, version recorded).

### T010 [US5] CI job `seo: meta + og` + draft PR + regression proof

- **Seam:** repo ↔ GitHub Actions.
- **Files:** `.github/workflows/ci.yml`: append the job from plan.md "CI", with every other job byte-identical. Open a **draft PR** `task/s11-og-seo` → `main`.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  git diff 53a1f2e -- .github/workflows/ci.yml | tee /tmp/s11-checks/t010.txt   # only the new job is added
  git push -u origin task/s11-og-seo
  gh pr create --draft --base main --head task/s11-og-seo --title "S11: OG cards & SEO" --body-file /tmp/s11-checks/pr-body.md
  gh pr checks --watch | tee -a /tmp/s11-checks/t010.txt
  # regression proof on a throwaway branch: a relative og:url must turn the job red
  git switch -c test/s11-seo-red && sed -i '' "s#url: absoluteUrl(route.path)#url: route.path#" apps/web/seo/metadata.ts  # or the equivalent one-line break making og:url relative && git commit -qam "test: S11 seo job red proof (do not merge)" && git push -u origin test/s11-seo-red
  # watch only the seo job on that branch's push run → expect failure; then delete the remote and local branch
  ```
- **Evidence:** `evidence/T010-ci-run.txt` (run URLs, every job green incl. `seo: meta + og`, log excerpt of the probe step) · `evidence/T010-ci-regression-proof.txt` (the red run URL + failing assertion, then branch deleted).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The draft PR checks page: all green including `seo: meta + og`. Default: the evidence file.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing now. After merge, add `seo: meta + og` to the required checks (RFC Q14; default: the agent changes no protection).

**G3 STOP:** report CI URLs, regression proof, ledger and usage; wait for Murphy.

---

## Phase G4 — Evidence (STOP after T011)

### T011 [US4, all] AC6 cost proof + validator + AC1–AC7 self-check table

- **Seam:** branch head ↔ the AC6 "before" snapshot (T001) and the deployed preview.
- **Files:** evidence only, plus the RFC §9 gate log entry.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  rm -rf apps/web/.next apps/web/out; pnpm build
  pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s11-checks/bundle-after.json
  pnpm bundle:manifest --diff .specify/features/og-seo/evidence/T001-log-bundle-before.json /tmp/s11-checks/bundle-after.json | tee .specify/features/og-seo/evidence/T011-log-bundle-diff.txt
  ! find apps/web/out \( -name '*.ttf' -o -name '*.woff*' \) | grep . && ! find apps/web/out -name '*.css' -exec grep -l '@font-face' {} + && echo NO-NEW-FONTS | tee -a .specify/features/og-seo/evidence/T011-log-bundle-diff.txt
  P=$(gh pr view --json comments -q '.comments[].body' | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)/   # or resolve-preview.ts
  pnpm perf:lighthouse "$P" --categories performance,accessibility,seo --out .evidence/s11/lh-home
  pnpm perf:lighthouse "${P}projects/websocket-inspector" --categories performance,accessibility,seo --out .evidence/s11/lh-project
  pnpm perf:weight "$P" --out .evidence/s11/weight-home
  # before = production (53a1f2e content): the same three commands against https://portfolio-teardown.vercel.app/
  ```
  - If `--categories seo` isn't accepted by the S10 flag, run perf+a11y only and record the SEO score from a separate Lighthouse run (not gated; RFC Q15).
  - Then: one validator.schema.org submission of the rendered JSON-LD of `/` and the project route (Gate 1 approved), with the response saved. Then `guards.sh`, `pnpm typecheck && pnpm lint && pnpm test`.
- **Evidence:** `T011-log-bundle-diff.txt` · `T011-lighthouse-summary-{home,project}[-before].json` · `T011-weight-{home,project}[-before].json` · `T011-log-schema-validator.json` · `T011-log-guards.txt` · `T011-log-self-check.md` (the AC1–AC7 table: tag probe per route, PNG files + hashes + sizes, sitemap/robots, JSON-LD validation, host-leak, bundle/weight/Lighthouse, CI incl. the new job, frozen diffs empty, items needing Murphy).
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final validation: paste the preview's project URL into a share target (or the platforms' inspectors) and check the card appears. Default: the probe + unfurl evidence.
  2. Review `T011-log-self-check.md`, then mark the PR ready and say "merge" when satisfied.
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. "merge" (the orchestrator merges only on Murphy's word).
  2. After merge: add `seo: meta + og` to the required checks; and in S16, set `SITE_URL=https://hi-murphy.me` on Vercel.

### T011a [US4] AC6 fix: OG PNGs + apple-touch-icon generated outside the Next module graph (RFC §9 R3)

- **Why:** T011 found +1 251 B client JS (`evidence/T011-log-bundle-finding.txt`). Any `next/og` import inside the Next module graph makes Turbopack add its async-module helper to the shared browser runtime (+1 225 B on every route), and the `/og/[...card]` route adds +26 B to `_ssgManifest.js`. Bisect: removing `next/og` from the graph restores the base runtime chunk byte-for-byte.
- **Seam:** build pipeline ↔ `out/og/*.png`, `out/apple-touch-icon.png` (same URLs, same bytes; the renderer is unchanged).
- **Files:**
  - DELETE `apps/web/app/og/[...card]/route.ts` and `apps/web/app/apple-touch-icon.png/route.ts` (`app/icon.svg/route.ts` stays: it does not import `next/og`).
  - NEW `apps/web/scripts/build-og.ts`: removes `public/og/` and `public/apple-touch-icon.png`, then for every `INDEXABLE_ROUTES` entry writes `renderPng(cardElement(cardModel(route)), { width: 1200, height: 630 })` to `public${route.ogImagePath}`, and `renderPng(appleIconElement(), { width: 180, height: 180 })` to `public/apple-touch-icon.png`. It prints one line per file: path, bytes, sha256. It exits non-zero on any error. It runs with cwd = `apps/web` (`seo/og/fonts.ts` resolves fonts from `process.cwd()`). The 1200/630/180 sizes move here from the deleted routes (named consts).
  - NEW `apps/web/scripts/tsconfig.og.json`: `{ "extends": "../tsconfig.json", "compilerOptions": { "jsx": "react-jsx" } }`. The app tsconfig has `"jsx": "preserve"`, which `tsx` would leave untransformed.
  - `apps/web/package.json`: devDep `tsx` exact (`pnpm add -D --save-exact tsx --filter web`); scripts `"og:build": "tsx --tsconfig scripts/tsconfig.og.json scripts/build-og.ts"`, `"build": "pnpm og:build && next build"`, `"dev": "pnpm og:build && next dev"`.
  - `.gitignore`: `apps/web/public/og/` and `apps/web/public/apple-touch-icon.png`.
  - Tests: no test may import the deleted routes. Keep `seo-render`/`seo-card`/`seo-icon` as they are (they call `renderPng` directly). Update `tools/perf` or app tests only if they reference the deleted route files.
- **Check:**
  ```sh
  set -euo pipefail; mkdir -p /tmp/s11-checks .specify/features/og-seo/evidence
  export SITE_URL=https://hi-murphy.me
  rm -rf apps/web/.next apps/web/out apps/web/public/og apps/web/public/apple-touch-icon.png; pnpm build 2>&1 | tail -30 | tee /tmp/s11-checks/t011a.txt
  ls apps/web/out/_next/static/chunks/turbopack-* | tee -a /tmp/s11-checks/t011a.txt   # expect the base runtime turbopack-3-ry682tkyiqk.js
  ! grep -l "turbopack queues" apps/web/out/_next/static/chunks/*.js && echo NO-ASYNC-RUNTIME | tee -a /tmp/s11-checks/t011a.txt
  cat apps/web/out/_next/static/*/_ssgManifest.js | tee -a /tmp/s11-checks/t011a.txt; echo | tee -a /tmp/s11-checks/t011a.txt
  pnpm bundle:manifest --out-dir apps/web/out --write /tmp/s11-checks/bundle-t011a.json
  set +e; pnpm bundle:manifest --diff .specify/features/og-seo/evidence/T001-log-bundle-before.json /tmp/s11-checks/bundle-t011a.json 2>&1 | tee -a /tmp/s11-checks/t011a.txt; set -e
  (cd apps/web/out && shasum -a 256 og/home.png og/projects.png og/projects/websocket-inspector.png apple-touch-icon.png) | tee -a /tmp/s11-checks/t011a.txt
  # card bytes must be unchanged vs T010 CI: 56ae1db9…, 53c61f75…, 74e0a609…
  pnpm --filter web seo:expect
  pnpm seo:probe --out-dir apps/web/out --site-url "$SITE_URL" --expect apps/web/out-seo-expect.json --out /tmp/s11-checks/seo-t011a | tail -3 | tee -a /tmp/s11-checks/t011a.txt
  pnpm --filter web exec vitest run test/fixture-exclusion.test.ts 2>&1 | tail -3 | tee -a /tmp/s11-checks/t011a.txt
  bash .specify/features/og-seo/guards.sh | tee -a /tmp/s11-checks/t011a.txt
  pnpm typecheck && pnpm lint && pnpm test && echo T011a-OK | tee -a /tmp/s11-checks/t011a.txt
  ```
  The bundle diff may still show one renamed same-size chunk (a module-id renumber, see the finding). Record the diff output as is. Do not change `tools/perf/src/bundle-manifest.ts`.
- **Evidence:** `evidence/T011a-log-og-prebuild.txt`.
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing hands-on (default: the log; same URLs, same card bytes, base runtime restored).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: RFC §9 R3).

**G4 STOP:** end-contract per KICKOFF-S11 Stage 3; Murphy signals "S11 done".
