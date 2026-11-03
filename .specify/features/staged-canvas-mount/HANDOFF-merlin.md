# Handoff to Merlin — S11.6 Staged Canvas Mount (out-of-band slice)

**From:** orchestrator (Opus 5.5, orca) · **for:** Merlin (brief owner) · **via:** Murphy · **date:** 2026-11-03
**Status:** merged, `main` = `2fd19f0` (PR #18, squash). CI and perf workflows on `main` are green.

> **Why you are getting this:** Murphy wrote and froze S11.6 outside your slice queue. The brief header says "author: Merlin (via Murphy)" (`.specify/slices/slice-11.6-staged-canvas-mount.md`, frozen at `05e4e16`), but you did not author it. This note brings your roadmap up to date and lists what needs your decision. The full evidence is in `.specify/features/staged-canvas-mount/`; start with `evidence/AC-selfcheck.md`.

## 1. What S11.6 was

S11.6 follows S11.5. One synchronous `<Canvas>` mount task of 56–69 ms was the last long task on every startup path, and it was also the reason D-19's interaction gate was kept. S11.6 allowed surgical changes in S8 `TeardownViewer.tsx` / `a11y/webgl.ts`, S6 `Scene.tsx` / `Slabs.tsx` and S4 `Stats.tsx`, in order to stage that mount and then re-run the eager-hydration verdict.

## 2. Outcome per AC

| AC | Result |
|---|---|
| AC1 re-baseline first | **Met.** No drift vs S11.5 (identical pixels and bytes) |
| AC2 0 dropped frames + no task > 50 ms | **Long-task half met:** 57.7 / 56.9 / 54.2 → **0 ms** on hero, project move and project click. **Dropped-frame half not met:** 2 / 5.5 / 5.5. Escalated and accepted by Murphy at G2 |
| AC3 parity, 2 draws, CLS 0, bytes ≤ S11.5 | Parity 0 px on 8/8 shots, draws 2, CLS 0. **Byte clause missed:** +289 B raw / +136 B gzip in the lazy 3D chunk, and +2 B gzip in project initial (chunk-hash names). Escalated and accepted at G2 |
| AC4 ready + reveal unchanged | **Met** |
| AC5 eager verdict on the CI runner | **Verdict: keep D-19's gate.** Fast runners pass both routes (2/2). The slow runner (S11.5's host class) fails: project 0.87 / TBT 506 ms |
| AC6 CI, frozen surfaces, re-seal | **Met.** Only `TeardownViewer.tsx` changed (S8 re-sealed). S2/S4/S5/S6/S7 are untouched |

## 3. What changed in the product

- **`TeardownViewer.tsx` (S8):** `<Canvas gl>` is now an async factory. The `WebGLRenderer` is built in its own task, and R3F configures the root in the next task. A default-lane re-render fires when the factory settles, to avoid React's 300 ms Suspense retry throttle. Constructor arguments are unchanged.
- **The S8 manifest** is re-sealed with a cumulative S11.6 note.
- **`tools/perf` gained:** a dropped-frame timeline (`fps:engine --scenario startup`), `perf:startup --cpu-profile` (per-task chunk/function attribution), a ready/reveal sequence probe, and Lighthouse long-task lists in summaries (`eager-verdict` prints them).
- **The levers' fate:** L1 + L4 kept. L5 (transitions) measured and reverted. L2 (precompile) and L3 (probe) skipped on evidence.

## 4. Facts that affect future briefs (please read before writing the next one)

1. **The AC2 harness cannot reach "0 dropped frames" on this host.** `measureFps()` runs its own continuous rAF recorder, so a frame is always due. Every main-thread task over about 16.7 ms then drops frames, including three's single-call `WebGLRenderer` constructor (≈ 25 ms at 4× CPU) and the first content frame (≈ 30 ms, which AC4 needs as one frame). Without the recorder the same build drops 1 frame. Evidence: `evidence/T005-log-frame-diagnosis.md`. **Suggestion:** phrase future frame criteria as "no task > 50 ms" plus a dropped-frame bound measured on an explicitly named harness mode, or as "no task > 16.7 ms except named unsplittable dependency calls".
2. **"Client JS ≤ previous bytes per scope" fails on any added code**, and also on hash-name noise: initial gzip moved +1/+2 B without any initial-code change. **Suggestion:** give a byte tolerance or an explicit offset budget whenever a slice must add code.
3. **CI runner speed varies about 1.8× between attempts of the same run:** Lighthouse benchmarkIndex was ≈ 2,200 on one attempt and ≈ 3,900 on another. Eager verdicts flip with it (fast: pass, slow: fail). **Suggestion:** AC5-style runner criteria should name the host class (benchmarkIndex range) or judge eager − gated TBT on the same attempt.
4. **The remaining blocker for retiring D-19 is on the eager *load* path, not the mount.** On the slow runner, react-dom tasks of ≈ 200 ms (simulated) at ≈ 4 s dominate eager TBT. Eager − gated TBT is +169 ms on home and +423 ms on project. Nothing that large appears in the local engagement-path profile. Evidence: `evidence/T011-log-eager-verdict.md` §4.
5. **Two design gotchas** for anyone touching the Canvas again:
   - **Suspense retry throttle:** an async R3F `gl` factory triggers React's 300 ms throttle unless a non-retry re-render follows (`tasks.md` D-P3).
   - **Sealed scene tests:** the sealed S4/S5/S6 scene tests render `<Scene>` with the R3F test renderer and expect a frame after `advanceFrames(1)`, so any staged scene mount must be opt-in (RFC §9 R1).
6. **Re-seal bases are squashed away.** After the squash merge, the S8 manifest base `470acd8`, like S10's S6 base `f65b13c`, exists only on the remote slice branch, not on `main`. `frozen-surface.test.ts` passes on `main` because it checks hashes only. Regenerating a manifest from its generator needs that commit. **Keep `origin/task/s11.6-staged-canvas-mount` (and `task/s10-site-shell`)**, or re-base the generators to a `main` SHA in a future slice.

## 5. What you should do

1. **Record S11.6 as done** (M1, merged `2fd19f0`) in your slice ledger. Note that AC2's dropped-frame half and AC3's byte clause were escalated and accepted by Murphy (rfc.md §9 items 6–7), and that the slice was authored by Murphy, not you.
2. **Decide on a follow-up brief to retire D-19.** Murphy wants the live 3D for non-interacting visitors.
   - **Suggested scope:** profile and split the eager load path on a slow-runner-class host (the ≈ 200 ms react-dom tasks: hydration and the viewer render coinciding at load), app-side first.
   - **Suggested AC:** eager ≥ 0.95 perf and TBT ≤ 200 ms on both routes on **two slow-class runner attempts** (or a benchmarkIndex-normalised rule).
   - Murphy confirms before any retirement work starts.
3. **Apply §4.1–4.3 when writing frame/byte/runner criteria** in the next briefs, so AC wording doesn't pre-commit to an unreachable bar.
4. **Housekeeping decisions for Murphy/you:**
   - keep `eager-3d.yml` until the D-19 decision;
   - keep the two remote slice branches (§4.6) or schedule a generator re-base;
   - the local worktree `task-s11.6-staged-canvas-mount` can be removed (the branch is merged and pushed).

## 6. Where everything is

- **Design and gate log:** `.specify/features/staged-canvas-mount/rfc.md` (§9 = every decision).
- **Spec, plan, tasks:** `spec.md`, `plan.md`, `tasks.md` (ledger + amendments D-P1–D-P3).
- **Evidence:**
  - `AC-selfcheck.md`
  - `T004-log-rebaseline.md` (AC1)
  - `T009-log-before-after.md`, `T009-log-ac2.md`, `T009-log-bytes.txt`, `T009-log-ready-reveal.md`
  - `T011-log-eager-verdict.md` (AC5, three runner runs)
  - `T012-log-reseal.txt`
