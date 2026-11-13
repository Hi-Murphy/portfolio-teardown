# Slice 12 — M1 Validation (MVP gate) — FROZEN BRIEF v1

**slice:** S12-m1-validation · **project:** portfolio-teardown · **repo:** Hi-Murphy/portfolio-teardown · **milestone:** M1 (last slice) · **author:** Merlin (project layer) · **orchestrator:** Opus 5.5 (orca) · **depends on:** S1–S11.9 ✅ (final hero: animated storyboard) · **branch:** `task/s12-m1-validation` · **frozen:** 2026-11-13 · **revision counter:** 0 of 2

## Mission
Prove the MVP with evidence, not opinion: the real deploy, the real gates, and **five real humans** giving the homepage 15 seconds. Then ship the preview and close M1. This slice adds **no features** — it measures, triages and fixes defects only.

## What is being validated
The final hero is an **animated storyboard** (S11.9, R6–R10): imploded → explode → zoom → camera follows the project's real flows → zoom out → turns → implode, looping, with a 44×44 pause/play control (WCAG 2.2.2); full-screen blueprint sheet + CSS scroll snap between hero and Projects on `/` only; reduced motion / Save-Data / no-JS get a **poster with the numbered frame path**. Projects route keeps its interaction gate. Employer name is redacted to `████████`.

## Scope
1. The validation protocol (script, scoring sheet, device matrix, triage rubric) — designed before anything is measured.
2. Gate matrix on the final commit.
3. The 15-second human test, ×5, run by Murphy with materials the slice prepares.
4. Defect triage: fix Sev-1/Sev-2 defects that are small and in-scope; file everything else.
5. The MVP report and the preview ship.

## Non-goals (hard)
- No new features, no new sections, no copy inventions, no theme/engine changes beyond defect fixes.
- No performance re-engineering; the S11.8/S11.9 budgets stand.
- No analytics, no A/B tests, no DNS/domain work (S16).
- No silent acceptance of a failed AC — a failed AC is a failed MVP gate, recorded as such.

## Acceptance criteria (inviolable — no rewording, no relaxing)
- **AC1 — the 15-second test, 5 participants.** Protocol: each participant sees `/` on a phone-sized viewport for **15 seconds** with no guidance, then answers three questions — (a) what does this person do? (b) name one project you saw; (c) how would you contact them? **Pass: ≥ 4 of 5 correct on all three.** One participant may be a non-technical reader. Evidence: per-participant sheet (answers verbatim, time, device) + the script used.
- **AC2 — gate matrix green on the final commit.** Lighthouse mobile **≥ 95 perf / ≥ 95 a11y** on `/` and `/projects/websocket-inspector`; **CLS 0**; weight **< 3 MB**; axe **0 serious / 0 critical**; `seo: meta + og` green; fixture exclusion green (dev routes 404 in production); eager hero reveal **≤ 2.5 s** with zero interaction on the slow class; **2 draw calls**; `/projects*` `<main>` byte-identical to `ffda3a2` unless a defect fix is justified and recorded.
- **AC3 — content integrity.** Every visible string resolves from content modules (no hand-typed copy); zero `TODO`/placeholder/lorem; employer redaction (`████████`) intact everywhere it appears; every link resolves — GitHub and LinkedIn 200, `mailto:vibing.murphy@gmail.com` correct, `/projects` and the project route 200, unknown slug 404.
- **AC4 — device and browser matrix.** iOS Safari 17+, Android Chrome on a mid-range device, desktop Chrome / Safari / Firefox: the hero plays, the pause control pauses and resumes, scroll snap behaves (and is off under reduced motion), a component panel opens and closes, **no console errors**, no horizontal scroll. Evidence: screenshots + console logs per device.
- **AC5 — degraded modes.** No-JS, `prefers-reduced-motion`, and Save-Data each render the **poster with the numbered frame path**, no canvas, no animation, no layout break; keyboard-only pass reaches every control in visual order.
- **AC6 — triage log.** Every issue found in AC1–AC5 is either fixed in this slice with evidence, or filed in the vault backlog with severity and owner. **Zero Sev-1/Sev-2 open at close.** Sev-3/Sev-4 may ship.
- **AC7 — CI and close.** All required checks green on the final commit; frozen surfaces S2–S8 empty (post-S11.9 re-seal baseline `3aee8fc`); the MVP report committed with every AC verdict, the metric table, the participant sheets (anonymised as P1–P5) and the open-issue list.

## Executor rules (binding)
- **The protocol is designed and frozen before any measurement.** Changing the script or the pass line after seeing results is a protocol violation.
- The human test is **Murphy's hands**: the slice prepares the script, the sheet and the capture method; it cannot run participants. Results arrive as raw notes and are processed verbatim.
- Defect fixes are allowed only for Sev-1/Sev-2, one defect per task, each with a before/after proof and a regression run of the gate matrix.
- Every number attaches its artifact per `.specify/EVIDENCE.md`; no secrets; anonymise participants.
- Every task ends with WHAT MURPHY SHOULD TEST/VALIDATE + WHAT THE AGENT NEEDS FROM MURPHY (numbered, defaults).
- Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant.

## Murphy dependencies
- **Five participants** (mix: 2 recruiters/hiring-adjacent, 2 developers, 1 non-technical) — the slice cannot close without them.
- His own device pass on iOS Safari + a real Android mid-range phone (AC4).
- Final sign-off: "M1 passed" or "M1 failed, here's why".

## Freeze protocol
Frozen at commit; work only on `task/s12-m1-validation`; integration via PR after Murphy's final validation. Revision counter 0 of 2. RFC at `.specify/features/m1-validation/rfc.md`.
