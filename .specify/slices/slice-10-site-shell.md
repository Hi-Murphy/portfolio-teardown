# Slice 10 — Site Shell: Landing · Project Routes · Recruiter Mode · FROZEN BRIEF v1

**slice:** S10-site-shell · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **branch:** `task/s10-site-shell` · **depends on:** S5 ✅ S6 ✅ S7 ✅ S8 ✅ S9 content ✅ · **revision counter:** 0 of 2

## Mission
Turn the placeholder into the **actual portfolio**: a home page with a poster-first live hero, project cards, about strip and contact footer; a real `/projects/[slug]` route rendering the teardown with panels; and a recruiter path that needs no 3D at all. Wire the finalized websocket-inspector content. Production routes get the same gates the dev playground has had.

## Context (self-contained — the orchestrator reads ONLY this brief)
- Live: engine (S4/S5), blueprint theme (S6), panels/chips/tour (S7), a11y floor incl. axe gate on the engine fixture export (S8), lockfile-gated CI (S3).
- `apps/web/app/page.tsx` is still the S1 placeholder; dev routes (`/dev/engine`, `/fixtures/fps-calibration`) are prod-excluded and must stay so (404 in production).
- **Content (S9, finalized):** canonical JSON at `.specify/content/websocket-inspector.json` — schema v1 exact (`schemaVersion`, `meta`, `story`, `layers[5]`, `components[16]`, `flows[2]`). Source repo is now public: https://github.com/TimurHaryo/websocket-inspector (per-component `links` populated). Convert it to a TS module validated by zod at build time (authoring rule D-06), not a hand-copied object.
- **Site copy (S10, FINAL):** identity, hero, about, footer and per-route metadata are canonical at `.specify/content/site.json` — wire it, do not invent copy. Public contact: `vibing.murphy@gmail.com`. Résumé PDF is present at `apps/web/public/resume.pdf` (served as `/resume.pdf`, published as-is; do not restyle or redact it).
- **S10 carry-over (from S5):** `/dev/engine` control row has a page-load CLS ≈ 0.0006 (pre-existing since S4). S10 owns it — fix it (or prove it cannot affect production routes) before closing.
- Design-target device: mid-range Android over 4G. Landing budgets are unchanged: LCP < 2.5 s, CLS = 0, mobile Lighthouse perf/a11y ≥ 95, first load < 3 MB.

## Deliverables
1. **Content module:** `apps/web` data module for websocket-inspector converted 1:1 from the canonical JSON, zod-validated at build time; a test asserting the module deep-equals the JSON (content fidelity).
2. **`/` landing:** poster-first hero (static poster paints first, live teardown hydrates over it with ambient idle — no autoplay explosion), project cards (name, tagline, tech chips → 4 max), short about strip, contact footer; single-line nav: name · projects · about · contact · **Résumé** · GitHub/LinkedIn · theme toggle.
3. **`/projects/[slug]` route:** full teardown (engine + theme + panels + tour) for the websocket-inspector slug; deep-linked; unknown slugs 404; case-study panel reachable from the page.
4. **Recruiter mode:** a plain `/projects` list (no WebGL required) reachable in ≤ 1 click from home; cards link to the project route; no-JS fallback (poster + list) mirrors the S8 pattern.
5. **Metadata:** per-route `<title>`/description from project meta (OG *images* are S11 — do not build them here).
6. **Route a11y gate extension:** axe runs on `/` and `/projects/websocket-inspector` in CI (light + dark), 0 serious/critical; keyboard drill from S8 extended to the landing page.
7. **CLS carry-over:** fix or formally bound the playground control-row shift; evidence attached.
8. **Perf:** lighthouse mobile ≥ 95 perf and a11y on both routes, LCP < 2.5 s, CLS = 0, home weight < 3 MB.

## Non-goals (hard)
- No OG image generation (S11) · no analytics · no DNS/domain/cutover (S16) · no content for jev-toolkit or agent-fleet (S13/S15) · no cross-project chip links (S14) · no theme/engine/panel behavior changes (frozen surfaces) · no pixel/papercraft theme · no résumé redesign (link an existing PDF).

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1:** `/` and `/projects/websocket-inspector` render entirely from the converted content module; the fidelity test (`module ≡ .specify/content/websocket-inspector.json`) is green; project cards show name, tagline, and ≤ 4 tech chips.
- **AC2:** poster-first hero: first paint is the static poster; the 3D hydrates after without layout shift (CLS 0); ambient idle only; `prefers-reduced-motion` → static poster, no animation; no autoplay explosion.
- **AC3:** recruiter path works without WebGL: `/projects` list reachable in ≤ 1 click from home; every card deep-links; unknown slug → 404; with JS disabled, home and project route show poster + readable list (evidence screenshots + DOM).
- **AC4:** axe on both production routes, light + dark: 0 serious, 0 critical; landing keyboard drill passes (nav → cards → project route → back); reduced-motion matrix extended to the new surfaces.
- **AC5:** mobile Lighthouse ≥ 95 perf / ≥ 95 a11y on both routes; LCP < 2.5 s; CLS = 0; home first load < 3 MB; evidence artifacts attached.
- **AC6:** the dev-only routes remain production-excluded (404 on the prod URL); the S10 CLS carry-over is fixed or bounded with evidence.
- **AC7:** full CI green (build/typecheck/lint/test, gitleaks, lighthouse, weight, fps calibration, fixture exclusion, axe gate extended); frozen-surface checks S2–S8 remain empty; 2 draw calls unchanged on the teardown.

## Executor rules (binding)
- Tasks sized for DeepSeek Flash 4.1: one integration seam + one executable check each. Every visual/perf/a11y claim attaches machine-made evidence per `.specify/EVIDENCE.md`.
- Perf criteria in dropped-frames style only. Tier 1.5 dormant — skip-with-record.
- Each task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- No secrets; gitleaks green.

## Murphy dependencies (resolved 2026-11-02)
- **Résumé PDF:** ✅ done — the real file is committed at `apps/web/public/resume.pdf` (published as-is by Murphy's decision; phone number intentionally kept). The nav button links to `/resume.pdf`; S10 validation includes a file-exists check. Do not restyle or redact it.
- **Contact:** ✅ `mailto:vibing.murphy@gmail.com` + GitHub/LinkedIn links. No form in MVP.

## Freeze protocol
Frozen at commit; work only on `task/s10-site-shell`; integration via PR after Murphy's final validation. Scope/AC changes = revision, logged in vault (counter 0 of 2). Design decisions (hero hydration strategy, card layout, route structure, list page design) live in `.specify/features/site-shell/rfc.md` — orchestrator-authored, Murphy-reviewed before spec/plan/tasks and again before execution.
