# Implementation Plan: S17 Cross-project relationships

**Feature dir:** `.specify/features/cross-project/` · **Branch:** `task/s17-cross-project` · **Date:** 2026-11-17 · **Inputs:** `spec.md`, `rfc.md` (approved; §11 Gate 1: all defaults + U1 + R1–R6)

## Summary

Order (brief + kickoff Hard Rule 4, after the authorised upgrade): **upgrade → content → schema → UI → a11y/layout → gates.** Each step lands green and carries its own test.

| # | Step | Task | Product paths | Test |
|---|---|---|---|---|
| 0 | Next 16.4.3 → 16.4.6 (U1) + every baseline on `B1` | T001 | `apps/web/package.json`, `pnpm-lock.yaml` (+ `apps/web/AGENTS.md` if `next dev` rewrites it) | full suite + gates on `B1`; 3 builds without the notice |
| 1 | relationship content files + conversion (brief revision 1) | T002 | two new `.specify/content/relationships/*.json`, converter rows, `relationships.ts` (types only), generated `<slug>.relationships.ts` | fidelity red → green |
| 2 | schema + errors + resolver | T003 | `relationships.ts` (schema, error, resolver), `connections.ts` | `relationships.test.ts` red → green; build failures |
| 3 | `Connections` + mount | T004 | `components/connections.tsx`, the project route | removal render test, R4 class test, `/` bytes |
| 4 | a11y + layout proof | T005 | none (probe + evidence) | `connections-probe.mjs`, axe, CLS, sweep |
| 5 | gates + self-check | T006 | none | G1, G12–G17, `AC-selfcheck.md` |

No sealed surface is touched and no re-seal is planned. Any need for one is a STOP (kickoff Hard Rule 3).

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16.4.3 → **16.4.6** static export, Tailwind v4, Node 24, pnpm 12.15 |
| New deps | none (U1 bumps two existing direct dependencies; R2) |
| Tests | vitest (`apps/web/test`, `packages/xploder/test`, `tools/perf/test`); `site:probe`, `eager:probe`, `a11y:axe:site` on `apps/web/out`; S16 `label-matrix.mjs` (read-only reuse); feature scripts in this dir; `guards.sh` |
| Base | `f0c2d37` (S16 merge `cec65ea` + S17 freeze). **Byte/JS base `B1`** = the T001 upgrade commit (R1) |
| Seal bases | S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `c8794b2`, S7 `cc663f7`, S8 `c8794b2` (pushed `seal/*` tags) |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, all three `.specify/content/*.json` (brief revision 1); all of `packages/xploder`; all of `tools/perf`; `.github/workflows/**` |
| Allowed product paths | `.specify/content/relationships/*.json` (new, brief revision 1), `apps/web/content/projects/**`, `apps/web/scripts/convert-content.ts`, `apps/web/components/connections.tsx`, `apps/web/app/(site)/projects/[slug]/page.tsx`, `apps/web/test/**`; T001 only: `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/AGENTS.md` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR-001…FR-006 quote AC1–AC6 verbatim. U1 is Murphy-authorised and recorded (RFC §11). `ALLOWED-PATHS-OK` fences drive-bys |
| II. Static-only | Server components at prerender; no runtime, no route |
| III. Performance is a feature | Schema/resolver server-only; client JS Δ ≤ 1,536 B gzip (spike +101 B); `/` byte-identical; Lighthouse, weight, draw-call and eager-hero gates re-run |
| IV. Single motion source | No motion or transition class; `no-motion-literals` lists gain the new files |
| V. Theme integrity | Existing theme utilities only (R0); `no-color-literals` lists gain the new files |
| VI. Evidence over assertion | Every AC has a machine artifact (RFC §7) |
| VII. No secrets | gitleaks in CI; `gitleaks dir` on new prose/evidence before each commit; `apps/web/AGENTS.md` diff reviewed (R6) |

## Project Structure

### Documentation and feature tooling (this feature)

```
.specify/features/cross-project/
  rfc.md · spec.md · plan.md · tasks.md
  guards.sh               the block below (T001)
  build-fixed.sh          pnpm build with VERCEL_GIT_COMMIT_SHA=s17-fixed-build-id; copies out → <dest>;
                          --retry-on-notice only for the f0c2d37 reference build (R3) (T001)
  bundle-gzip.mjs         copy of ../label-system/bundle-gzip.mjs, BUDGET = 1536, S17 header (T001)
  home-bytes.sh           <baseOut> <headOut>: sha256 + cmp of / files and every /_next/static file / fetches
                          (Playwright network log to the hero reveal), stylesheet, sitemap, robots, og (T001)
  content-patch-check.mjs JSON minus relationships deep-equals f0c2d37; bytes = 2-space round-trip;
                          notes equal the brief strings (T002)
  connections-probe.mjs   <baseUrl> --out <dir>: both routes × 390/1440 × light/dark (T005)
  evidence/               T<NNN>-* per EVIDENCE.md, AC-selfcheck.md
```

### Source code (changes only)

```
.specify/content/relationships/jev-toolkit.json          NEW  → websocket-inspector (RFC §11 rev 1) [T002]
.specify/content/relationships/websocket-inspector.json  NEW  → jev-toolkit (RFC §11 rev 1)         [T002]
apps/web/
  package.json                               next, eslint-config-next ^16.4.6 (U1)                [T001]
  scripts/convert-content.ts                 + 2 rows: relationships/<slug>.json → <slug>.relationships.ts [T002]
  content/projects/relationships.ts    NEW   RelationshipsSource types (T002); schema, error,
                                             resolveConnections (T003)
  content/projects/<slug>.relationships.ts   NEW, generated                                       [T002]
  content/projects/connections.ts      NEW   RELATIONSHIP_SOURCES, connectionsFor(slug) (server only) [T003]
  components/connections.tsx           NEW   server component (RFC §4.3)                           [T004]
  app/(site)/projects/[slug]/page.tsx        + <Connections connections={connectionsFor(slug)} />  [T004]
  test/content-fidelity.test.ts              relationship rows (a,c,d,e), completeness (T002); (f) (T003)
  test/relationships.test.ts           NEW   RFC §3.5 cases 1–5                                    [T003, T004]
  test/connections-classes.test.ts     NEW   R4                                                    [T004]
  test/no-hand-copied-content.test.ts        + relationships[].note                                [T003]
  test/no-{motion,color}-literals.test.ts    + the new files                                       [T003, T004]
pnpm-lock.yaml                               next / @next/* / eslint-config-next versions (U1)    [T001]
```

## Guards (`guards.sh`, from T001 on)

One line per guard, exit 1 if any fails (S13/S16 shape). `BASE=f0c2d37`.

| Guard | Check |
|---|---|
| `FROZEN-OK` | `git diff --quiet $BASE -- .specify/slices .specify/KICKOFF-S17.md .specify/content/site.json` |
| `XPLODER-OK` | `git diff --quiet $BASE -- packages/xploder` |
| `SURFACES-S2S8-OK` | each seal list vs its base (S2/S4 `3aee8fc`, S5 `5d3abdb`, S6 `c8794b2`, S7 `cc663f7`, S8 `c8794b2`) + `pnpm --filter xploder exec vitest run test/frozen-surface.test.ts` |
| `S3-TOOLS-OK` / `TOOLS-OK` | `git diff --quiet $BASE -- tools/perf` (covers the S3 list) |
| `CI-OK` | `git diff --quiet $BASE -- .github` |
| `NO-DEP-OK` | R2: the `package.json` diff is only the two version strings; lockfile package-name set unchanged; only `next`, `@next/*`, `eslint-config-next` versions move; no other `package.json` changes |
| `ALLOWED-PATHS-OK` | changed + untracked files ⊆ plan "Allowed product paths" ∪ `.specify/features/cross-project/**` |
| `CONTENT-PATCH-OK` | `node content-patch-check.mjs` (from T002) |
| `CONVERT-CHECK-OK` | `pnpm --filter web content:convert --check` |
| `GITLEAKS-OK` | `gitleaks git --log-opts="$BASE..HEAD"` + `gitleaks dir .specify/features/cross-project` |

A failing guard is never "fixed" by widening it. It is a STOP and an escalation with evidence.

## Phases

### G1 — Upgrade and baselines (T001)

1. Reference export of `f0c2d37` (`build-fixed.sh --retry-on-notice`) → `/tmp/s17-checks/ref-out`.
2. U1: `pnpm --filter web add next@^16.4.6 && pnpm --filter web add -D eslint-config-next@^16.4.6`, then `pnpm install --frozen-lockfile` from clean (the pnpm 12 `allowBuilds` gotcha). `pnpm dev` once (R6) and review `apps/web/AGENTS.md`.
3. Gates on the upgrade: typecheck, lint, test, 3 × `build-fixed.sh` without the notice, `pnpm audit` (next advisory gone), Lighthouse/weight/axe/draws/eager on `B1`.
4. Commit = `B1`. Then baselines on `B1`: `base-out`, `base-gzip.json`, the `/` network list + sha256s, eager probe. Upgrade deltas `ref` → `B1` reported (gzip, the `/` file list, Lighthouse).

### G2 — Content (T002)

Revision 1: two new relationship files → fidelity rows red (modules missing) → types + converter rows + convert → green. Project JSON, modules and sources untouched; the site builds and renders as before. `content-patch-check.mjs` passes.

### G3 — Schema (T003)

`relationships.test.ts` cases 1–4 red (exports missing) → schema, error, resolver, `connections.ts` → green; fidelity (f)/(e3)/completeness; hand-copy scan + literal lists. One-off builds: unknown slug → fail; self-reference → fail; restore → clean.

### G4 — UI (T004)

Removal render test (case 5) red → `Connections` + mount → green; R4 class test; `home-bytes.sh` (`/` identical to `B1`); one-off removal build; screenshots.

### G5 — A11y and layout (T005)

`connections-probe.mjs`, `a11y:axe:site`, `site:probe --group cls,draws`, the S16 sweep re-run + control (R5, about 50 min).

### G6 — Gates (T006)

G1, G12–G14 on the final head; draft PR; CI 7/7; `guards.sh`; `AC-selfcheck.md`; then STOP for Murphy.

## Build and serve conventions

- Every byte comparison uses `build-fixed.sh` (R3). Exports are copied to `/tmp/s17-checks/<name>-out`. The fixture export for the sweep comes from `pnpm build:fixtures` → `/tmp/s17-checks/<name>-out-fixtures`.
- Serve with `pnpm serve:out --dir <out> --port <p>`; browser steps run unsandboxed.
- Every task that changes client code ends with `node $F/bundle-gzip.mjs --diff /tmp/s17-checks/base-gzip.json apps/web/out` (cumulative Δ, against `B1`).
