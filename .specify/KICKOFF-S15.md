# KICKOFF PROTOCOL — Slice S15 · Engine Timing & Events

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S15.md and execute Stage 1 on branch task/s15-engine-timing. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s15-engine-timing`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract, then STOP.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-15-engine-timing.md` (frozen brief), this file, `.specify/content/*.json`.
2. The brief is the only scope source: **E1, E2, E4, E5, E8 and nothing else.** AC1–AC6 are inviolable; a blocked AC = STOP + escalate with evidence.
3. **Clock first.** The clock module lands before any consumer is rewired, and it lands with a fake-clock test suite. Zero real timers in animation tests (AC1 proves it).
4. **Pause semantics override S14 AC3:** Pause = **immediate freeze, zero settles while paused**. S14's "exactly one settle transition" wording is retired for this contract — do not carry both.
5. **Seal discipline:** S2/S5/S6/S8 may be touched; **S3/S4/S7 must stay empty**. Every re-seal: written reason in the manifest **and** a pushed tag `seal/<surfaces>-<sha>`. No batched re-seals at the end — the tag pairs with the commit that needed it.
6. **Behaviour re-proof:** the S13 tour-clock last-step fix and the S14 I-03 resume-from-remaining-time must both pass their original tests on the new clock. If either regresses, STOP.
7. **Hero holds:** S14 R1 timings stand (labelled 0.19–3.40 s, zoomed 0.14–1.75 s, tour end 0–1.61 s); a boundary may shift by **≤ 1 frame**. Larger = revision.
8. **E8 is measure-then-decide:** at median settle ≤ 50 ms (CPU ×4) **no cache is added** — the timing table is the deliverable. Above it, the cache must be output-identical (0 differing coordinates).
9. Gates unchanged: Lighthouse ≥ 95/95 on three routes, CLS 0, axe 0/0, weight < 3 MB, 2 draw calls, eager hero reveal with zero interaction.
10. Evidence per `.specify/EVIDENCE.md`; every number attached; no secrets.
11. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → orchestrator personally; tier 1.5 dormant (skip-with-record). Report which tier finished each task.
12. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
13. Commit at each stage boundary with prefix `S15/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-15-engine-timing.md` — the FROZEN brief and only scope source. Produce `.specify/features/engine-timing/rfc.md`:
- the clock module design (injectable, pausable, one source; how a fake clock replaces real timers in tests);
- the consumer migration order for E1 (explode → camera → emphasis → tour → overlay), each with the test that proves it uses the clock;
- the pause/resume design for E2, including how a paused scene proves pixel-identical frames at +0.5 s and +3 s, and how the hero's own storyboard waits move onto the clock;
- the E4 settle-state design (what exactly replaces frame-signature equality);
- the E5 event contract: names, order, once-per-transition semantics, and which probes switch to events;
- the E8 measurement plan and the decision rule at the 50 ms threshold;
- the per-file re-seal list with reasons and the tag name for each;
- the gate matrix and evidence list per AC.
Every open question carries your recommendation as default. Do NOT implement.

**End-contract:** RFC committed; clock design + migration order + re-seal/tag list + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/engine-timing/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no criteria), `plan.md` (clock first, then consumers, then pause, then events, then measurement; re-seal commits paired), `tasks.md` (granular tasks; each ends with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table; task-list summary. STOP.

## Stage 3 — Execute

Execute in order: clock module → consumers → pause/resume → settle state → events → phone measurement → gates/seals. STOP at each phase-group boundary.

**End-contract:** all items complete with evidence; AC1–AC6 self-check (clock scan + fake-clock suite, pause frame-identity at +0.5 s/+3 s with zero settles, settle-once logs, event order/frequency, timing table ×3 CPU profiles with the cache decision, gate matrix, re-seal tags listed); S3/S4/S7 diffs empty; anything needing Murphy's hands listed. STOP. Murphy validates and signals "S15 done" outside your view.
