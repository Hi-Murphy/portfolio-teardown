# S13 — AC1–AC7 self-check (orchestrator, 2026-11-14)

Branch `task/s13-jev-content`, draft PR #24. Local matrix on the T010 commit (`T010-*`); binding Lighthouse / weight / axe / SEO from CI on the Vercel preview (`T010-G18-ci.md`). Every row links its evidence. Murphy validates and signals "S13 done".

| AC | Verdict | Evidence (all under `evidence/`) |
|---|---|---|
| **AC1 — it renders** | **MET** | `/projects/jev-toolkit` 200 (`T010-site-probe/routes.*`). Live workbench and no-JS outline from the content module: **5 layers / 20 components / 2 flows** (outline lists layers + parts by S10 design; flows checked live). Panel opens; both tours (`arm-run` 8 steps, `judge-path` 4) reach `ended`; phone (412 px) compact parts column shown with 20 rows, no overflow; desktop/mobile × light/dark — `teardown` 30/30 in 3 consecutive runs (`T005-log-teardown-3runs.txt`, `T005-teardown/`) and again in `T010-site-probe/`. Screenshots: `T005-evidence-jev-{light,dark}/`, `T005-teardown/*.png`. The tour's last-step stall (pre-existing S5 race) was fixed under revision 1 of 2: 64/64 tours ended after the fix (`T005a-log-stall-after.txt`, `T005-log-tour-stall-rootcause.md`). |
| **AC2 — fidelity** | **MET** | `content-fidelity.test.ts`, one row per project, identical to the websocket-inspector test: strict equality, parsed equality, `content:convert --check`, SHA-256 header stamp, negative control (+ a nested negative control) and a completeness guard. Red before conversion, green after (`T002-log-fidelity-{red,green}.txt`), drift proof (`T002-log-drift-proof.txt`), 13/13 on the final commit (`T010-G2-fidelity.txt`). |
| **AC3 — discoverability** | **MET** | `cards` 34/34 (`T006-cards/`, `T010-site-probe/cards.*`): a card on `/` and on `/projects` with `meta.name`, `meta.tagline`, 1 chip (Node.js; ≤ 4), href `/projects/jev-toolkit` → 200; order websocket-inspector → jev-toolkit; home section order unchanged (`T006-home/structure.json`, 52/52; `home-sections.test.ts`); `scrollWidth = clientWidth = 390` at 390 px on both surfaces. Screenshots `T006-cards/*.png`. |
| **AC4 — machine-readable** | **MET** | `/og/projects/jev-toolkit.png` 1200×630, 76,330 B, SHA-256 `2231a0eb…` identical across two clean builds (`T007-log-og-{hashes-build-1,hashes-build-2,dims}.txt`, image `T007-screenshot-og-jev-toolkit.png`); canonical, `og:url`, `og:image`, `twitter:image` absolute and correct (`T007-log-head-tags.txt`); sitemap lists the route (`T007-log-sitemap.txt`); JSON-LD `SoftwareApplication` (+ `SoftwareSourceCode`) with every field traced to content (`T007-log-json-ld-trace.txt`); `seo:probe` PASS on both builds and CI `seo: meta + og` green. |
| **AC5 — no regression** | **MET** | **CI on the preview** (`T010-G18-ci.md`): mobile Lighthouse perf / a11y **1.00 / 1.00** on `/`, `/projects`, `/projects/jev-toolkit` (and the WSI route); CLS 0; weight 462,679 / 208,777 / 203,987 B mobile (< 3 MB). Axe **0 serious / 0 critical** on all routes incl. both projects' 6 states (`T010-G11-axe/`, CI axe jobs). **2 draw calls** on `/projects/jev-toolkit` (and WSI, hero) (`T004-probe/draws.json`, `T010-site-probe/draws.*`). Eager hero reveals with zero interaction, 2/2 (`T010-G13-eager/`). `/projects/websocket-inspector`: behaviour unchanged (all probes green on it); its `<main>` differs from base only by the authorised content sentence `fe73c52` (`T010-G14-main-diff.txt`, `T010-G14-diffs/`); E1: its lazily loaded workbench chunk carries both projects, +2,849 B gzip (`T010-log-e1-delta.txt`; RFC Q4 accepted). |
| **AC6 — nothing invented** | **MET** | Per-project hand-copy scan over app/components/content/seo with negative controls; the third-party framing sentence present verbatim in the generated source and the exported page; deny-list (`built JEV`, `JEV built by`, `my/our JEV`, `I built/created/made/wrote JEV`) **0 hits** in source and export; home copy probe PASS (`T008-log-nothing-invented.txt` 33/33, `T008-home-copy/`). The one hit found ("my JEV decision-hook research" in canonical WSI copy) was resolved by Murphy's content decision (option B, `fe73c52`; `T008-log-possessive-hit.md`). |
| **AC7 — CI and surfaces** | **MET** | All required checks green on PR #24 (`T010-G18-ci.md`). On `5ec52d3` the first attempt of `a11y: axe (production routes)` failed in its site-probe step on a home-hero timing flake (drill reverse walk + CLS 0.0000735 in 1 of 16 cells); the re-run was green, 0/5 locally, hero code unchanged by S13 → backlog I-10 (`T010-G18-ci-flake-attempt1.txt`). Frozen surfaces: S2–S4, S6, S7, S8 byte-identical to the `3aee8fc` seal; S5 re-sealed at `51d3fa7` under the authorised revision 1 of 2 (tour-clock fix only; `R1-revision-note.md`) — `SURFACES-S2S8-OK`, xploder 635/635 (`T010-G16-frozen.txt`, `T010-log-guard.txt`). Dev routes 404 in production (`T010-site-probe/routes.*`, CI fixture exclusion). |

## Decisions and deviations on record

- **Revision 1 of 2** (Murphy, "go A"): S5 `useTourClock` last-step fix + re-seal. Keep `task/s13-jev-content` on origin after the squash merge (`51d3fa7` must stay reachable).
- **Content decision** (Murphy, option B): `fe73c52` rewords one websocket-inspector sentence.
- **Probe scope fix:** the no-JS outline lists layers and parts only (S10 design); flows are asserted on the live workbench.
- **Axe states:** project states are emitted per project with `id` kept as the state kind and `path` distinguishing projects (plan said renamed ids; simpler, same coverage).
- **Backlog:** I-09 (open panel's tile loses highlight on hover) — Murphy: later engine slice; I-10 (home-hero timing flake in the CI site probe, re-run green) (`backlog.md`).

## Execution tiers

| Task | Finished by | Notes |
|---|---|---|
| T001 | tier 1 (Flash) | orchestrator re-ran guards + self-diff |
| T002 | tier 1 (Flash) | orchestrator added the drift proof |
| T003 | tier 1 (Flash) | — |
| T004 | tier 1 (Flash) | — |
| T005 | tier 1 (Flash) + orchestrator | orchestrator: outline scope fix, tour-stall root cause, settled screenshots |
| T005a | tier 1 (Flash) + orchestrator | Flash: test + fix; orchestrator: S5 re-seal |
| T006 | tier 1 (Flash) | — |
| T007 | tier 1 (Flash) | — |
| T008 | tier 1 (Flash) + orchestrator | orchestrator: content commit at Murphy's request, guards, re-run |
| T009 | tier 1 (Flash) | orchestrator: push + draft PR |
| T010 | tier 1 (Flash) + orchestrator | Flash: local matrix; orchestrator: CI results, this self-check |

Tier 1.5 (OpenRouter) was dormant and skipped for every task. No task needed a second tier-1 attempt.

## What needs Murphy's hands

1. Final validation (optional: the Vercel preview of PR #24 — `/`, `/projects`, `/projects/jev-toolkit`, `/projects/websocket-inspector`), then "S13 done" / "merge".
2. After merge: keep `task/s13-jev-content` on origin; Merlin logs revision 1 of 2 and the content decision in the vault; Merlin's planned Reports-link follow-up (brief, "Murphy dependencies").
