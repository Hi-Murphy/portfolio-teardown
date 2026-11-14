# Slice 13 — Project Data #2: jev-toolkit (wiring) — FROZEN BRIEF v1

**slice:** S13-jev-content · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M2 · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S9 ✅ S10 ✅ S11 ✅ S11.9 ✅ · **branch:** `task/s13-jev-content` · **frozen:** 2026-11-14 · **revision counter:** 0 of 2

## Mission
Add **jev-toolkit** as the second project — data-only. The content is canonical and already approved: `.specify/content/jev-toolkit.json` (20 components / 5 layers / 2 flows). Wire it in, prove it renders, prove nothing regressed. **No new UI patterns, no engine work, no copy invented.**

## Context (self-contained — the orchestrator reads ONLY this brief)
- S9 established the pattern: canonical JSON in `.specify/content/` → converted to a TS module in `apps/web/content/projects/` → zod-validated at build time → a **fidelity test** asserts module ≡ JSON.
- S10 made `/projects/[slug]` render any project in the content module; the home page's Projects section renders cards from the same content (S11.9 composition, data-driven section order).
- S11 built the OG pipeline: `apps/web/scripts/build-og.ts` renders cards before `next build`, `apps/web/seo/*` derives metadata/sitemap/JSON-LD from content. Adding a project must extend all of it automatically — if it doesn't, that is the defect to fix, not to special-case.
- Content facts the site must show as-is: JEV is a **third-party decision model**; the work is the harness. Metrics: 21,448 vs 28,721 input tokens, $0.0093 vs $0.0112, recall 0.79 vs 1.00, 45/45 compile, 277 tests / 0 deps. Do not editorialise these.

## Deliverables
1. Convert `.specify/content/jev-toolkit.json` into the site's content module (same mechanism as websocket-inspector; no hand-copied fields).
2. Route `/projects/jev-toolkit` renders the full teardown: 5 layers, 20 components, 2 flows, panels, tour.
3. Cards on `/projects` and in the home Projects section: name, tagline, ≤ 4 tech chips, working links.
4. OG card for the new route, sitemap entry, JSON-LD `SoftwareApplication`, per-route metadata — all through the existing pipeline.
5. Verification: fidelity test, route/panel/tour probes, OG dimension/size/determinism checks, gate matrix.

## Non-goals (hard)
- No engine, theme, motion or panel behaviour changes; no new UI patterns; no redesign of the Projects section.
- No content edits: the JSON is canonical (an error in it is reported, not silently fixed).
- No third project; no route changes outside the new slug; no analytics; no DNS work.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — it renders.** `/projects/jev-toolkit` returns 200 and renders 5 layers, 20 components and 2 flows from the content module; a panel opens for a component; the guided tour runs to completion; the phone layout shows the compact parts column. Evidence: screenshots (mobile/desktop × light/dark) + probe output.
- **AC2 — fidelity.** A test asserts the converted module deep-equals `.specify/content/jev-toolkit.json` (strict equality + sha stamp, with a negative control), exactly as the websocket-inspector fidelity test does.
- **AC3 — discoverability.** The project appears as a card on `/projects` **and** in the home Projects section with name, tagline and ≤ 4 chips; both link to the route; the home section's DOM order is unchanged by the addition; no horizontal scroll at 390 px.
- **AC4 — machine-readable.** `/og/projects/jev-toolkit.png` exists at exactly 1200×630, ≤ 300 KB, deterministic across two clean builds (identical SHA-256); canonical, `og:url`, `og:image`, `twitter:image` are absolute and correct; the route appears in `sitemap.xml`; JSON-LD `SoftwareApplication` validates with every field traced to content.
- **AC5 — no regression.** Mobile Lighthouse ≥ 95 perf and ≥ 95 a11y on `/`, `/projects` and the new route; CLS 0; weight < 3 MB per route; axe 0 serious/0 critical on all three; **2 draw calls** on the new teardown; the home eager hero still reveals with zero interaction (D-28 behaviour intact); `/projects/websocket-inspector` unchanged in behaviour.
- **AC6 — nothing invented.** Every string on the new route and its card resolves from the content JSON; a scan finds no hand-typed project copy; the JEV third-party framing is rendered exactly as written (no "built JEV" claim anywhere).
- **AC7 — CI and surfaces.** All required checks green (incl. `seo: meta + og`, both axe jobs, perf gates, fixture exclusion); frozen surfaces S2–S8 empty; dev routes still 404 in production.

## Executor rules (binding)
- One integration seam + one executable check per task; the fidelity test lands **before** the route work.
- No special-casing: if adding a project requires touching shared code, that change must be additive and justified in the RFC.
- Evidence per `.specify/EVIDENCE.md`; every claim attached; no secrets.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: DeepSeek Flash 4.1 stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Murphy dependencies
- **None blocking.** One follow-up after merge: when `docs/benchmark-summary.md` lands in the jev-toolkit repo, Merlin adds the link to that project's Reports component (a content-only commit).

## Freeze protocol
Frozen at commit; work only on `task/s13-jev-content`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/jev-content/rfc.md`.
