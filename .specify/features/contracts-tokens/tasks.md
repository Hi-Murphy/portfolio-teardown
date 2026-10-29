# Tasks: S02 Contracts & Tokens

**Input:** `rfc.md` (approved), `spec.md`, `plan.md` in `.specify/features/contracts-tokens/`
**Executor:** DeepSeek Flash seat (tier 1). **Escalation (RFC §9.4):** tier 2 (OpenRouter) is **skipped** for S02. If tier 1 fails a task twice, the orchestrator **pauses and reports to Murphy** with the current 5h/7d usage and waits for "go". It never takes over automatically. Each report states the finishing tier and any skip.

## Format & rules (apply to every task)

- `[ID] [P?] [Story] Title`. `[P]` = can run in parallel with the previous task (different files, no dependency). Stories: **US1** site consumer · **US2** lib consumer · **US3** Murphy as content author.
- **One task = one integration seam + one executable check.** A task is done only when the check exits 0 and its output is pasted into the report and saved to `evidence/`.
- **Worktree:** each task runs in a fresh worktree branched from the slice branch `task/s02-contracts-tokens`, on a branch named `task/s02-t0NN-<slug>`. After the check passes it merges back into the slice branch without squashing. Commit message: `S02/T0NN: <title>`. Remove the worktree only after the merge.
- **Frozen-file guard (every task):** `git diff --quiet HEAD -- .specify/KICKOFF-S02.md .specify/KICKOFF.md .specify/slices && echo FROZEN-OK` must print `FROZEN-OK`.
- **Every check also runs:** `pnpm typecheck && pnpm lint` (lint includes the Prettier check).
- **Never:** add deps other than `zod` (xploder) and `vitest` (xploder, web) · add rendering/3D/layout/GSAP code, UI components, real project content, OG images, `vercel.json` or DNS changes · put secrets, IPs, hostnames, ports or private repo names anywhere (fixtures use `https://example.com/...` only) · write motion literals outside `packages/xploder/src/motion/` · run `specify init` · use bare `git stash` · run `vitest -u` (snapshots are updated only in T005).
- **zod v4 pitfall:** `.default(v)` returns `v` without parsing it. For object defaults with nested defaults use `.prefault({})` (plan.md "Schema rules").
- **`noUncheckedIndexedAccess` is on:** in tests, guard indexed access (`expect(x).toBeDefined()` or optional chaining) before using it.
- **Evidence** goes to `.specify/features/contracts-tokens/evidence/T0NN-*.{txt,png}`. Throwaway scripts (Playwright, probes) live in `/tmp/s02-checks/`, outside the repo. Run `mkdir -p /tmp/s02-checks .specify/features/contracts-tokens/evidence` before the first check of every task, and run every check under `set -euo pipefail` (otherwise `cmd | tee file && …` hides a failing `cmd`).

---

## Phase G1: Contract (US2, US3) → STOP for Murphy after T006

### T001 [US2] Test harness + zod dependency
- **Seam:** vitest ↔ pnpm workspace scripts ↔ xploder tsconfig.
- **Files:**
  - root `package.json`: add script `"test": "pnpm -r --if-present test"`.
  - `packages/xploder/package.json`: `dependencies: { "zod": "^4.6.7" }`, `devDependencies` + `"vitest": "^5.0.5"`, script `"test": "vitest run"`.
  - `packages/xploder/tsconfig.json`: `"include": ["src", "test"]`.
  - `packages/xploder/test/smoke.test.ts`: imports `XPLODER_VERSION` from `../src/index` and asserts `'0.0.0'`.
- **Check:**
  ```sh
  pnpm install && pnpm test 2>&1 | tee /tmp/s02-checks/t001.txt && pnpm typecheck && pnpm lint && \
  grep -q '"zod"' packages/xploder/package.json && echo T001-OK
  ```
- **Evidence:** `evidence/T001-harness.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `pnpm test` at the repo root prints one passing test (default: agent log is sufficient).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed; deps approved in RFC §9.2).

### T002 [US2] Constants, primitives, tech registry schema + seed registry
- **Seam:** registry JSON ↔ `TechRegistrySchema` ↔ `parseTechRegistry` / `defineTechRegistry`.
- **Files:**
  - `src/schema/constants.ts`: zod-free `as const` arrays `SCHEMA_VERSION = 1`, `COMPONENT_KINDS`, `COMPONENT_STATUSES`, `TECH_CATEGORIES`, `TECH_COLOR_REFS` (list all 9 literally) + their union types.
  - `src/schema/primitives.ts`: `IdSchema`, `LabelSchema`, `TextSchema`, `LinkSchema`, `MetricSchema` exactly per plan.md "Schema rules".
  - `src/schema/tech.ts`: `TechSchema` (strict; `id`, `label`, `category`, `color?` + transform default `tech-<category>`), `TechRegistrySchema` (strict `{ schemaVersion: z.literal(1), techs: z.array(TechSchema) }` + `superRefine` duplicate id → issue at `techs[i].id`, message `Duplicate tech id "<id>".`).
  - `src/errors.ts`: `XploderValidationError`, `ProjectValidationError`, `TechRegistryValidationError` (plan.md API surface).
  - `src/parse.ts`: `parseTechRegistry`, `defineTechRegistry` (throw `TechRegistryValidationError`, message `Invalid tech registry:\n` + `z.prettifyError`).
  - `src/index.ts`: export the above plus their types. Keep `XPLODER_VERSION`.
  - `test/fixtures/tech-registry.json`: exactly the 12 rows in RFC D4.
  - `test/helpers.ts`: `loadJson(relPath)` (via `readFileSync(new URL(relPath, import.meta.url))`).
  - `test/registry.test.ts`: (1) seed parses, 12 techs, `okhttp.color === 'tech-network'`; (2) duplicate id rejected at `techs[1].id`; (3) unknown category rejected; (4) `color: '#ff0000'` rejected; (5) `defineTechRegistry` throws `TechRegistryValidationError` whose message contains the path.
- **Check:**
  ```sh
  pnpm --filter xploder exec vitest run registry 2>&1 | tee /tmp/s02-checks/t002.txt && pnpm typecheck && pnpm lint && echo T002-OK
  ```
- **Evidence:** `evidence/T002-registry.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Skim `test/fixtures/tech-registry.json`. These 12 techs and categories match what websocket-inspector uses (default: accept RFC D4).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T003 [US2] [US3] Project schema + parse boundaries + public barrel
- **Seam:** JSON / TS input ↔ `createProjectSchema(registry?)` ↔ `parseProject` / `safeParseProject` / `defineProject`.
- **Files:**
  - `src/schema/project.ts`: `MetaSchema`, `StorySchema`, `ComponentSchema`, `LayerSchema`, `FlowSchema`, `createProjectSchema(registry?)`, `ProjectSchema = createProjectSchema()`. Shapes exactly RFC D1 table. Refinements and transform exactly plan.md "Schema rules". `story` uses `.prefault({})`. `layers` uses `.min(1)`.
  - `src/parse.ts`: add `parseProject`, `safeParseProject`, `defineProject` (`source` in message).
  - `src/index.ts`: full barrel per plan.md "Public API surface". **Remove `XploderPlaceholder`.**
  - `test/helpers.ts`: add `minimalProject()` returning `{ schemaVersion: 1, meta: { slug: 'demo', name: 'Demo' }, layers: [{ id: 'core', name: 'Core', components: [{ id: 'app', name: 'App' }] }] }`.
  - `test/schema.test.ts`: (1) minimal parses and the output equals the documented defaults (`kind 'module'`, `status 'shipped'`, `techs/links/metrics []`, `flows []`, `story { metrics: [] }`); (2) **NEGATIVE: missing `meta.name` rejected**, issue path `['meta','name']`; (3) missing `schemaVersion` rejected; (4) `schemaVersion: 2` rejected; (5) `layers: []` rejected; (6) duplicate component id across two layers rejected; (7) flow `path` with 1 entry rejected; (8) flow path naming a missing component rejected at `flows[0].path[1]`; (9) unknown key on a layer rejected; (10) flow id defaults to `flow-1`.
  - `test/parse.test.ts`: (1) **NEGATIVE: unknown tech id rejected** with the seed registry, issue path `['layers',0,'components',0,'techs',0]`, message contains `okhtp`; (2) the same input is accepted when no registry is passed; (3) `parseProject` throws `ProjectValidationError` (`instanceof XploderValidationError`, `cause instanceof ZodError`, `issues.length > 0`); (4) `safeParseProject` returns `success: false` without throwing; (5) `defineProject(bad, { registry, source: 'content/demo.ts' })` message contains `content/demo.ts` and the path.
- **Check:**
  ```sh
  pnpm --filter xploder exec vitest run schema parse 2>&1 | tee /tmp/s02-checks/t003.txt && pnpm typecheck && pnpm lint && \
  ! grep -rq XploderPlaceholder packages apps --include='*.ts' --include='*.tsx' && echo T003-OK
  ```
- **Evidence:** `evidence/T003-schema.txt` (the test list must show both named NEGATIVE tests)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read one error message in the log (e.g. the unknown tech id). It should be clear enough for you as an author (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T004 [P] [US2] Geometry-free schema test (AC3)
- **Seam:** `ProjectSchema` ↔ JSON Schema introspection.
- **Files:** `test/geometry-free.test.ts` only. The walker covers `properties`, `items`, `prefixItems`, `anyOf`/`oneOf`/`allOf`, `$defs`, `additionalProperties`. Rules and banned name lists are **exactly** RFC D6. Tests:
  - (1) `z.toJSONSchema(ProjectSchema, { io: 'input' })` has no banned property name (exact or substring);
  - (2) every node with `type: 'object'` has `additionalProperties === false`;
  - (3) no untyped node: every node has `type`, `const`, `enum`, `anyOf`/`oneOf`/`allOf` or `$ref`;
  - (4) NEGATIVE CONTROL: the walker flags `z.strictObject({ position: z.strictObject({ x: z.number(), y: z.number() }) })`;
  - (5) NEGATIVE CONTROL: the walker flags `z.object({ a: z.string() })` (open object);
  - (6) runtime: `minimalProject()` with `x: 12` added to the component is rejected by `parseProject` with an unrecognised-key issue.
- **Check:**
  ```sh
  pnpm --filter xploder exec vitest run geometry 2>&1 | tee /tmp/s02-checks/t004.txt && pnpm lint && echo T004-OK
  ```
- **Evidence:** `evidence/T004-geometry.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The banned-name list in RFC D6 covers what you'd consider "layout" (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T005 [P] [US2] Fixture A ("Tidewatch") + schema fingerprint
- **Seam:** UI-app-shaped JSON ↔ `parseProject` + seed registry; schema ↔ committed snapshot.
- **Files:**
  - `test/fixtures/project-a-ui-app.json`: fictional Android tide-chart app per RFC D5. 4 layers `ui`, `state`, `data`, `platform`. 8 components including one `actor` (user) and one `external` (tide feed). 2 flows (live update path ≥ 4 hops; offline read path). ≥ 6 distinct registry ids. Every amendment used at least once: component `links` (example.com), `kind` (≥ 3 distinct), `status` (`wip` and `planned` at least once each), component `metrics`. `story.metrics` present. No geometry, no infra-flavoured strings.
  - `test/fixtures.test.ts`: fixture A parses with the registry; asserts ≥ 3 layers, ≥ 6 components, ≥ 1 flow, ≥ 6 distinct tech ids, presence of each amendment.
  - `test/generality.test.ts` (part 1): `expect(z.toJSONSchema(ProjectSchema, { io: 'input' })).toMatchSnapshot('project-schema-v1')`. This is the **only** task allowed to create `test/__snapshots__/generality.test.ts.snap`.
- **Check:**
  ```sh
  pnpm --filter xploder exec vitest run fixtures generality 2>&1 | tee /tmp/s02-checks/t005.txt && \
  test -f packages/xploder/test/__snapshots__/generality.test.ts.snap && \
  CI=1 pnpm --filter xploder test && pnpm lint && echo T005-OK
  ```
- **Evidence:** `evidence/T005-fixture-a.txt` (+ record the merge commit SHA in the report; T006 needs it)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `project-a-ui-app.json`. It should feel like how you'd describe websocket-inspector-type apps (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T006 [US2] [US3] Fixture B ("Ledgerline"): zero-schema-change generality proof (AC7)
- **Seam:** pipeline-shaped JSON ↔ the **unchanged** schema.
- **Allowed files (only these):** `test/fixtures/project-b-pipeline.json`, `test/generality.test.ts` (append tests; **no new snapshots**), `test/fixtures.test.ts` (optional).
- **Fixture B:** fictional CSV reconciliation pipeline harness per RFC D5. Layers exactly `ingest` → `normalize` → `validate` → `report`. 1–2 components per layer (`external` file drop, `service` stages, `store` output, `actor` operator). One flow whose `path` visits one component in every layer, in layer order. Techs `typescript`, `nodejs`. No component whose id/name/kind suggests UI (`screen`, `view`, `ui`, `page`).
- **Tests (generality part 2):** (1) fixture B parses with the registry; (2) pipeline shape: layer ids equal `['ingest','normalize','validate','report']`, the flow path's layer indices are strictly increasing and cover all 4 layers, no component id matches `/screen|view|ui|page/`.
- **If fixture B cannot be expressed without a schema change: STOP.** Report it as **blocked AC7** with the failing parse output. Do not touch `src/` (KICKOFF Hard Rule 2).
- **Check:**
  ```sh
  CI=1 pnpm --filter xploder test 2>&1 | tee /tmp/s02-checks/t006.txt && \
  test -z "$(git diff --stat <T005-merge-sha>..HEAD -- packages/xploder/src packages/xploder/test/__snapshots__)" && \
  pnpm typecheck && pnpm lint && echo AC7-OK
  ```
- **Evidence:** `evidence/T006-generality.txt` (test output + the literal `git diff --stat` command and its empty output + both SHAs)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Read `project-b-pipeline.json` next to fixture A. Is it convincingly a *different* shape, the way jev-toolkit would be (default: accept)?
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

**⛔ G1 STOP:** report AC2, AC3, AC7 evidence. Wait for Murphy's validation.

---

## Phase G2: Tokens & site (US1) → STOP for Murphy after T011

### T007 [US1] Motion tokens: seed values, reduced-motion twin, CSS emitter
- **Seam:** `xploder/motion` ↔ consumers (TS objects + CSS variables).
- **Files:** `src/motion/index.ts` (replace the S1 stub; keep the header JSDoc and extend it with: *"No animation number literal may exist outside this module."*, units, the transform/opacity-only note, and the static-twin policy), `test/motion.test.ts`. Values and easing pairs **exactly** RFC D9 / plan.md. `motionCss()` per plan.md CSS contract (seconds → integer ms; px for distances; reduced block zeroes durations, staggers and distances).
- **Tests:** (1) every value equals the RFC table; (2) `resolveMotion(true)` → every duration/stagger/distance is `0` and easings are unchanged; `resolveMotion(false)` deep-equals `motion`; (3) `motionCss()` contains `--motion-duration-explode:900ms`, `--motion-ease-explode:cubic-bezier(0.16, 1, 0.3, 1)`, `--motion-stagger-explode-layer:60ms`, `--motion-distance-hover-lift:4px`, and a `@media (prefers-reduced-motion: reduce)` block with `--motion-duration-explode:0ms`.
- **Check:**
  ```sh
  pnpm --filter xploder exec vitest run motion 2>&1 | tee /tmp/s02-checks/t007.txt && pnpm typecheck && pnpm lint && \
  pnpm build && echo T007-OK
  ```
  (`pnpm build` proves the existing `apps/web/app/motion.ts` still compiles against the new shape.)
- **Evidence:** `evidence/T007-motion.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing visual yet. Values are reviewed against RFC D9 (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T008 [P] [US1] Blueprint palette module (`xploder/theme`)
- **Seam:** palette values ↔ `xploder/theme` export ↔ CSS emitter.
- **Files:** `src/theme/blueprint.ts` (hex values **exactly** RFC D8; `tech` typed `Record<TechCategory, string>` via `satisfies`), `src/theme/index.ts` (`blueprint`, `paletteCss`, `techColor`, types; imports only `../schema/constants`), `packages/xploder/package.json` exports `"./theme": "./src/theme/index.ts"`, `test/theme.test.ts`.
- **Tests:** (1) both themes define all 9 roles and all 8 `TECH_CATEGORIES`; (2) WCAG contrast (implement the relative-luminance formula in the test): `ink`, `label`, `accent`, `steel`, `line` and every tech colour ≥ 4.5 against `paper` **and** `surface`; `lineMuted` ≥ 3.0; (3) `paletteCss()` contains `:root{`, `.dark{`, `@media (prefers-color-scheme: dark)`, `html:not(.light)`, `color-scheme:dark`, `--bp-paper:#F6F3EA`, `--bp-paper:#0B1A2E`, `--bp-tech-network:`; (4) `techColor('tech-ai', blueprint.dark) === '#F08BB4'`, `techColor('accent', blueprint.light) === '#0A6E87'`; (5) **zod-free graph:** read `src/motion/index.ts`, `src/theme/*.ts` and the relative files they import (recursively); none contains `from 'zod'`.
- **Check:**
  ```sh
  pnpm --filter xploder exec vitest run theme 2>&1 | tee /tmp/s02-checks/t008.txt && pnpm typecheck && pnpm lint && echo T008-OK
  ```
- **Evidence:** `evidence/T008-theme.txt` (includes the printed contrast table)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Nothing visual yet. The visual check is T011 (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T009 [US1] Web wiring: token CSS, Tailwind mapping, blueprint placeholder
- **Seam:** `xploder/theme` + `xploder/motion` ↔ `layout.tsx` `<head>` ↔ `globals.css` `@theme inline` ↔ page.
- **Files:**
  - `apps/web/app/layout.tsx`: after the theme `<script>`, add `<style dangerouslySetInnerHTML={{ __html: paletteCss() + motionCss() }} />`. Imports from `xploder/theme` and `xploder/motion`. The script stays first in `<head>`.
  - `apps/web/app/globals.css`: delete the S1 hex `@theme`, `.dark` and media blocks. Add `@theme inline` exactly per plan.md CSS contract. Keep `@custom-variant dark` and the `html { background; color }` rule (now via vars).
  - `apps/web/app/page.tsx`: decorative blueprint grid background (CSS gradients on `var(--color-grid)`, `aria-hidden`, no motion); a "palette" strip (role swatches + 8 tech-category chips labelled in `font-mono`, from `TECH_CATEGORIES`); `import type { TechCategory } from 'xploder'`. Keep the h1, sub-line, toggle and footer.
  - `apps/web/app/motion.ts`: update the comment (values are now live).
- **Check:**
  ```sh
  pnpm typecheck && pnpm lint && pnpm build 2>&1 | tee /tmp/s02-checks/t009-build.txt && \
  grep -q -- '--bp-paper:#F6F3EA' apps/web/out/index.html && grep -q -- '--motion-duration-explode:900ms' apps/web/out/index.html && \
  grep -Eq "import type .* from 'xploder'" apps/web/app/page.tsx && grep -q "from 'xploder/theme'" apps/web/app/layout.tsx && \
  echo T009-OK
  ```
  **Plus the build-time validation probe (US3):** in `/tmp/s02-checks/`, write a script that copies the worktree, adds `apps/web/app/_probe.ts` exporting `defineProject({ schemaVersion: 1, meta: { slug: 'probe', name: 'Probe' }, layers: [] }, { registry: defineTechRegistry({ schemaVersion: 1, techs: [] }), source: 'app/_probe.ts' })`, imports it from `page.tsx`, and runs `pnpm build`. Expected: non-zero exit and a message containing `Invalid project (app/_probe.ts)` and `layers`. Nothing from the probe is committed.
- **Evidence:** `evidence/T009-build.txt`, `evidence/T009-probe.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. `pnpm dev` and look at `/`: blueprint paper, grid and palette strip in light. Toggle to see navy (default: you do this at the G2 STOP with the T011 screenshots).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Preferred label for the palette strip (default: "palette · blueprint v1").

### T010 [US1] Motion-literal scanner (AC4)
- **Seam:** repo source ↔ scanner rules ↔ test runner.
- **Files:**
  - `apps/web/package.json`: devDep `"vitest": "^5.0.5"`, script `"test": "vitest run"`.
  - `apps/web/test/motion-literal-scanner.ts`: rules exactly RFC D10 (`css-time`, `css-easing`, `gsap-ease`, `motion-key`, `tw-utility`, `timer`). Exports `scanText(text, file) → Hit[]` and `scanDir(root, { exclude }) → Hit[]`. Files `*.{ts,tsx,js,mjs,css}`. Excludes `node_modules`, `.next`, `out`, `next-env.d.ts`, `test/`.
  - `apps/web/test/no-motion-literals.test.ts`: (1) `scanDir(apps/web)` → `[]`; (2) `scanDir(packages/xploder/src, { exclude: ['motion/'] })` → `[]`; (3) for **each** rule, a bad sample is flagged with that rule id; (4) good samples produce no hits: `motion.durations.explode`, `transition-duration: var(--motion-duration-hover-lift)`, `className="ease-explode transition-colors"`, `<p>the 1990s</p>`, `{ label: 'p95', value: '120 ms' }`. A failure message lists `file:line rule snippet`.
- **Check:**
  ```sh
  pnpm test 2>&1 | tee /tmp/s02-checks/t010.txt && pnpm typecheck && pnpm lint && echo T010-OK
  ```
  **Plus the planted-literal proof:** append `a{transition: color 200ms ease-in}` to `apps/web/app/globals.css`, run `pnpm --filter web test` (must **fail**, naming `globals.css` with `css-time` and `css-easing`), then `git checkout -- apps/web/app/globals.css`.
- **Evidence:** `evidence/T010-scanner.txt` (green run + the planted-failure output + the revert)
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. The rule list in the test reads as "strict but sane" (default: accept).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: proceed).

### T011 [US1] Theme flip + no-flash verification (AC5)
- **Seam:** built static page ↔ real browser (pre-hydration, no-JS, toggle).
- **Files:** none in the repo. `/tmp/s02-checks/t011.mjs` (Playwright via `npx`, not a repo dep) against `npx serve apps/web/out`.
- **Check:** after `pnpm build`, the script prints PASS for each of:
  - (a)–(f) S1 checks, unchanged: dark OS with hydration blocked → `html.dark` and body bg not white · dark OS with JS disabled → html bg not white · light OS → no `dark` class · toggle persists against the OS and clears when it matches the OS · dark OS honoured on hard reload · no console errors or hydration warnings.
  - (g) light OS, fresh context: computed `body` background = `rgb(246, 243, 234)`.
  - (h) click the toggle: body background = `rgb(11, 26, 46)`, and the `network` chip colour changes from `rgb(10, 110, 135)` to `rgb(94, 211, 238)`. Click again: back to (g).
  - (i) dark OS with JS disabled: html background = `rgb(11, 26, 46)` (CSS fallback).

  It ends by printing `T011-OK`. Also one Lighthouse mobile run on the served `out/` (sanity only, not an AC): record Performance and Accessibility.
- **Evidence:** `evidence/T011-check.txt`, `T011-light.png`, `T011-dark-toggled.png`, `T011-dark-nohydrate.png`, `T011-dark-nojs.png`, `T011-lighthouse.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Look at the four screenshots. Does the palette match your "blueprint drafting table" picture in both modes (default: accept)?
  2. In a real browser on `pnpm dev`, set macOS to Dark and hard-reload: no light flash (default: you do this at the G2 STOP).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Any hex tweaks after seeing the screenshots (default: none; tweaks are one-line changes in `blueprint.ts`, and the contrast tests guard them).

**⛔ G2 STOP:** report AC1, AC4, AC5 evidence + screenshots. Wait for Murphy's validation.

---

## Phase G3: Ship (US1) → STOP (Stage 3 end-contract) after T013

### T012 [US1] CI test step, docs, push, draft PR (AC6)
- **Seam:** repo ↔ GitHub Actions on a PR.
- **Files:**
  - `.github/workflows/ci.yml`: in the `build` job add `- run: pnpm test` after `pnpm lint`, before `pnpm build`. Rename the job display name to `build (typecheck, lint, test, build)`. The `secrets` job is unchanged.
  - `AGENTS.md`: §2 exports gain `./theme`; §3 adds `pnpm test`; §5 adds the sentence *"No animation number literal may exist outside `packages/xploder/src/motion/`; `apps/web/test/no-motion-literals.test.ts` enforces it."* and allows importing `xploder/theme`.
  - `README.md`: add `pnpm test` to the commands.
- **Check:**
  ```sh
  gitleaks git --redact --verbose 2>&1 | tee /tmp/s02-checks/t012-gitleaks.txt && \
  git push -u origin task/s02-contracts-tokens && \
  gh pr create --draft --base main --title "S02: contracts & tokens" --body-file /tmp/s02-checks/pr-body.md && \
  gh pr checks --watch 2>&1 | tee /tmp/s02-checks/t012-ci.txt
  ```
  All checks must be green: build (typecheck, lint, test, build) and secrets (gitleaks). The PR body ends with the Claude Code attribution line and contains no internal paths or secrets.
- **Evidence:** `evidence/T012-ci.txt` (PR URL + checks), `evidence/T012-ci.png` (checks list), `evidence/T012-gitleaks.txt`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Open the PR. The checks are green and the Vercel preview (automatic, no config change) renders the blueprint page (default: you check at the G3 STOP).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. Nothing (default: push and draft PR already granted, RFC §9.3).

### T013 [US1] [US2] [US3] AC1–AC7 self-check
- **Seam:** evidence ↔ acceptance criteria.
- **Files:** `evidence/AC-selfcheck.md`: one row per AC (verbatim text, PASS/FAIL, evidence file links, task IDs), an executor-tier table per task (incl. tier-2 skips and any pause events), and a "needs Murphy's hands" list.
- **Check:**
  ```sh
  for ac in AC1 AC2 AC3 AC4 AC5 AC6 AC7; do grep -q "| $ac |" .specify/features/contracts-tokens/evidence/AC-selfcheck.md || exit 1; done && \
  git diff --quiet HEAD -- .specify/KICKOFF-S02.md .specify/slices && echo T013-OK
  ```
- **Evidence:** `evidence/AC-selfcheck.md`
- **WHAT MURPHY SHOULD TEST/VALIDATE:**
  1. Final S02 validation from the self-check table, then signal "S2 done" and merge the PR (default: your call, outside the agent's view).
- **WHAT THE AGENT NEEDS FROM MURPHY:**
  1. The merge decision (default: you merge after validation; the agent never merges to `main`).

**⛔ G3 STOP (Stage 3 end-contract):** AC1–AC7 self-check table + list of anything needing Murphy's hands.

---

## Dependencies & execution order

```text
T001 ─▶ T002 ─▶ T003 ─┬─▶ T004 [P] ─┬─▶ T006 ─⛔G1
                      └─▶ T005 [P] ─┘
T001 ─▶ T007 ─┬─▶ T009 ─▶ T010 ─▶ T011 ─⛔G2          (G2 starts after Murphy's G1 validation)
T001 ─▶ T008 ─┘   (T007 ∥ T008)
T011 ─▶ T012 ─▶ T013 ─⛔G3
```

T006 depends on T005 (fingerprint + merge SHA). T004 only needs T003.

## Task ↔ AC coverage

| AC | Proven by | Supporting |
|---|---|---|
| AC1 | T009 (+ root `pnpm build` in T012 CI) | T003, T007, T008 |
| AC2 | T003 (both named negatives), T005, T006 | T001, T002 |
| AC3 | T004 | T003 (strict objects) |
| AC4 | T010 | T007 (token CSS), T009 (Tailwind bindings) |
| AC5 | T011 | T008, T009 |
| AC6 | T012 | T001, T010 (test scripts) |
| AC7 | T006 | T005 (fingerprint + SHA) |
