# S17 — AC self-check (orchestrator)

**Branch:** `task/s17-cross-project` · **base:** `f0c2d37` · **byte/JS base `B1`:** `e17375b` (Next 16.4.6, R1) · **RFC:** Gate 1 all defaults + U1 + R1–R6; corrections C1–C3; **brief revision 1 of 2** (relationships in sibling files, `REV1-revision-note.md`).

| AC | Verdict | Evidence | Notes |
|---|---|---|---|
| **AC1** data-driven both ways | **MET** | `T002-log-{red,green,content-patch,content-diff}.*`, `T003-log-{red,green}.txt`, `T004-log-{red,green,strips,removal-build,unknown-build,self-build}.txt`, `T004-screenshot-*` | Both strips render from `.specify/content/relationships/<slug>.json` alone (fidelity rows a/c/d/e/f). Removal test: unit (`relationships.test.ts` case 5) + a one-off build gives jev-toolkit 0 / websocket-inspector 1. An unknown `to` fails `next build` with `RelationshipValidationError: … Unknown relationship target "no-such-project" in project "jev-toolkit"`. A self-reference is rejected by the schema (unit) and fails the build. |
| **AC2** accessible | **MET** | `T005-log-connections-probe.{md,json}`, `T005-screenshot-{strip,focus}-*`, `T005-log-axe.txt`, `T006-log-perf.txt` | Probe on 8 cells (both routes × 390/1440 × light/dark): region + list named "Connections"; link text = the target `meta.name`, no "here"; Tab goes workbench → strip link → footer; focus outline solid ≥ 2 px; link box ≥ 44×44. axe: 0 serious / 0 critical. Lighthouse accessibility 1.00 on all four routes. |
| **AC3** no layout damage | **MET** | `T005-log-site-probe.txt`, `T006-log-site-probe.txt`, `T005-log-connections-probe.*`, `T005-log-sweep.{md,json}`, `T005-log-sweep-control.txt` | CLS 0.000000 in all 16 route × viewport × palette cells (and in every Lighthouse run). DOM order workbench < strip < footer, with JS and without. 390 px: `scrollWidth ≤ clientWidth`; strip vs every painted label = 0 intersections. S16 sweep re-run: 2,052 cells, 37,012 labels, **0 hit pairs**; 3/3 seeded controls detected. |
| **AC4** home untouched | **MET under C2** | `T006-log-home-bytes.md`, `T002v1-log-home-prefetch-diagnosis.md`, `T001-log-eager-base.txt`, `T006-log-eager.txt` | `HOME-BYTES IDENTICAL 25/25` vs `B1`: `index.html`, `index.txt`, root `__next.*.txt`, the stylesheet, every `/_next/static` file `/` loads, sitemap, robots, `og/home.png`. Per C2 (Murphy), files prefetched for other routes are listed separately and not gated; after revision 1 they are identical too. Eager hero: 2/2 PASS on `B1` and on head. |
| **AC5** weight | **MET** | `T006-log-gzip.txt`, `T006-log-site-probe.txt`, `T006-log-home-bytes.md`, `T006-log-perf.txt` | Client JS gzip 473,625 → 473,625 B (**+0 B**, budget 1,536). Draw calls: 2 on both projects and the hero. `sitemap.xml` byte-identical (4 `<loc>`; no route added). Weight ≤ 0.47 MB per route. |
| **AC6** gates and seals | **MET locally; CI pending** | `T006-log-{suite,guards}.txt`, `T006-ci.txt` | Fidelity passes for both project modules (unchanged) and both relationship modules. **S2–S8 empty**: all of `packages/xploder` is identical to `f0c2d37`, and each seal list matches its base. No new dependency (U1 bumps two existing ones; NO-DEP-OK). Suite: xploder 727, web 347 (+2 skipped), perf 309. CI: see `T006-ci.txt`. |

**Also recorded (RFC §11):**
- U1: Next.js 16.4.3 → 16.4.6 (GHSA-mfr8-8qww-v76h), done in S17 at Murphy's request. All gates were green on `B1` too.
- Brief revision 1 of 2: relationships live in sibling files because sealed xploder tests parse the project JSON strictly.
- C1: build-failure checks moved to T004. C2: home bytes = `/`'s own files. C3: strip count = the rendered attribute.

**Executor tiers:**

| Task | Tier | Notes |
|---|---|---|
| T001 | 1 (Flash, sandbox off, 1 dispatch) | — |
| T002 | 1 (Flash, 2 dispatches) | v1 stopped correctly (C2 + the sealed-test conflict → revision 1); orchestrator wrote the C2 tool change; v2 redone on revision 1. The v1 branch is kept as `task/s17-cross-project-t002-v1` |
| T003 | 1 (Flash, 1 dispatch) | — |
| T004 | 1 (Flash, 2 dispatches) | first run stopped correctly on a check defect (C3); continued; orchestrator removed one unused constant |
| T005 | 1 (Flash, 1 dispatch) | — |
| T006 | orchestrator | — |

Tier 1.5 stayed dormant (skipped). No task failed twice.
