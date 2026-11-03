# KICKOFF PROTOCOL — Slice S11.6 · Staged Canvas Mount

**Audience: the orchestrator seat (Opus, orca).** Machine-layer kickoff protocol. The human runbook lives in Murphy's vault; you neither need nor may look for it.

## Invocation contract

- Murphy sends exactly one kickoff message: `Read .specify/KICKOFF-S11.6.md and execute Stage 1 on branch task/s11.6-staged-canvas-mount. Then STOP and wait for my message.`
- ALL slice work happens on branch **`task/s11.6-staged-canvas-mount`**. Never commit to `main`; integration is a PR merged only after Murphy's final validation.
- Thereafter: **exactly ONE stage per Murphy message.** A stage ends with its end-contract below, then STOP. The next stage begins only on a new Murphy message (`approved`, or feedback).
- Feedback instead of approval → address it **within the current stage**, re-present the end-contract, STOP again.
- Never chain two stages in one turn.

## Hard rules

1. Never edit, rename, or delete: `.specify/slices/slice-11.6-staged-canvas-mount.md` (frozen brief), this file, or `.specify/content/*.json`.
2. The brief is the only scope source. AC1–AC6 are inviolable. A blocked AC = STOP + escalate with evidence.
3. **Re-baseline first (AC1).** No commit that changes the mount may land before the re-baseline of S11.5's final state exists, with its artifact committed. If the executor starts "fixing" before measuring, stop it and reset to AC1.
4. **Frozen surfaces:** this slice may touch only `src/react/TeardownViewer.tsx`, `src/react/a11y/webgl.ts` (**S8**), `src/react/scene/Scene.tsx`, `src/react/scene/Slabs.tsx` (**S6**) and `src/react/scene/Stats.tsx` (**S4**), and only surgically. Every touched file is re-sealed in its manifest with a reason note, and `XPLODER-SRC-OK` must list exactly those files. S2, S5 and S7 must show **empty** diffs.
5. Visual parity is an acceptance criterion: rest-state screenshots pixel-identical in light and dark; 2 draw calls; CLS 0. Any visible change = STOP.
6. No new client library on the page bundle; patch-level `three` bumps only with a written reason; no budget may be lowered to pass.
7. Evidence: every number (ms, dropped frames, long tasks, TBT, bytes) attaches its artifact per `.specify/EVIDENCE.md`; two runs per measurement, median reported.
8. Escalation: executor (DeepSeek Flash 4.1) stuck ×2 → pause and report to Murphy with current usage; the orchestrator executes personally on Murphy's "go". Tier 1.5 dormant (skip-with-record). Report which tier finished each task.
9. Every decomposition ends with: **WHAT MURPHY SHOULD TEST/VALIDATE** + **WHAT THE AGENT NEEDS FROM MURPHY** (numbered, with defaults).
10. Commit at each stage boundary with message prefix `S11.6/stage-N:`.

## Stage 1 — RFC

Read `.specify/slices/slice-11.6-staged-canvas-mount.md` — the FROZEN brief and your only scope source; you may not edit it. Produce `.specify/features/staged-canvas-mount/rfc.md`: the re-baseline and measurement plan (S11.5's 4× CPU protocol and harnesses: `perf:startup`, `fps:engine --scenario startup`, `perf:parity`, `bundle:manifest`, `eager-3d`); a static read of the `<Canvas>` mount task (three.js `WebGLRenderer` construction, R3F root creation and first render, xploder scene components, the `hasWebgl()` second context); candidate staging levers ranked by expected payoff vs risk against the frozen surfaces; how `data-xploder-ready` and the reveal stay first-content-frame; the re-seal strategy for S4/S6/S8; the eager-hydration re-run; how each AC is proven. Every open question carries your recommendation as default. Do NOT implement, and do NOT profile on the branch yet — the re-baseline is Stage 3's first task by design.

**End-contract:** RFC committed to the branch; decision summary + open questions presented. STOP.

## Stage 2 — Spec Kit

Generate `.specify/features/staged-canvas-mount/`: `spec.md` (FRs mapping 1:1 to AC1–AC6 — invent no acceptance criteria), `plan.md` (task order with the AC1 re-baseline first, harness reuse, re-seal procedure), `tasks.md` (granular ordered tasks, one seam + one executable check each, each ending with WHAT MURPHY SHOULD TEST/VALIDATE and WHAT THE AGENT NEEDS FROM MURPHY, numbered with defaults).

**End-contract:** spec/plan/tasks committed; FR↔AC mapping table presented; task-list summary. STOP.

## Stage 3 — Execute

Execute tasks.md in order, **AC1's re-baseline first**. Per task: fresh worktree off the slice branch; executor = DeepSeek Flash 4.1; evidence per Hard Rule 7; escalation per Hard Rule 8. STOP at each phase-group boundary (re-baseline → staging levers → eager-hydration re-run → re-seal/CI).

**End-contract:** all tasks complete with evidence; AC1–AC6 self-check table (re-baseline, before/after table, dropped-frame + long-task logs, pixel-parity screenshots, draw calls, ready/reveal probe, bundle bytes, eager-hydration verdict, CI run, re-seal manifest diffs, frozen-surface diffs); anything needing Murphy's hands listed. STOP. Murphy validates and signals "S11.6 done" outside your view.
