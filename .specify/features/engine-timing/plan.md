# Implementation Plan: S15 Engine Timing & Events

**Feature dir:** `.specify/features/engine-timing/` · **Branch:** `task/s15-engine-timing` · **Date:** 2026-11-15 · **Inputs:** `spec.md`, `rfc.md` (approved; §13 Gate 1: all defaults + R1–R10)

## Summary

The work runs in the kickoff's order: **clock first, then consumers, then pause, then settle state, then events, then measurement, then gates.** Every behaviour change goes test-first:

**red test commit → fix commit (green) → re-seal commit (only if a sealed file changed) → annotated `seal/<surfaces>-<fix sha>` tag, pushed in the same session → evidence.**

| # | Step | Sealed surface | Tag |
|---|---|---|---|
| 1 | clock module | S5 | `seal/s5-…` |
| 2 | Scene: explode → camera → emphasis | S6 | `seal/s6-…` |
| 3 | tour + viewer owns the clock | S5 | `seal/s5-…` |
| 4 | overlay on the clock | S6 | `seal/s6-…` |
| 5 | viewer plumbing + `hostNow` + AC1 scanners | S5 + S8 | `seal/s5-s8-…` |
| 6 | pause/resume API + every caller (R2) | S5 + S8 | `seal/s5-s8-…` |
| 7 | frame gate | S6 | `seal/s6-…` |
| 8 | DOM freeze + `data-xploder-clock` | S8 | `seal/s8-…` |
| 9 | settle state + phase (R10) | S6 | `seal/s6-…` |
| 10 | events emitter + DOM mirror | S8 | `seal/s8-…` |
| 11 | *only if E8 > 50 ms* placement cache | S6 | `seal/s6-…` |

S2/S4 (combined manifest), S3 and S7 stay byte-identical (RFC C2, Q1).

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5.9 strict, React 19.3, Next 16 static export, three 0.186.1, @react-three/fiber 9.8.2 (S14 Timer patch), Node 24, pnpm 12.15 |
| New deps | none |
| Tests | vitest (`packages/xploder/test`, `apps/web/test` incl. `xploder-dom` jsdom, `tools/perf/test`); `site:probe`, `eager:probe`, `engine:probe` on `apps/web/out` / `out-fixtures`; feature scripts in this dir; `guards.sh` |
| Base | `8c410f3`. Seal bases at start: S2/S4 `3aee8fc`, S5 `edde9d0`, S6 `b5a4713`, S7 `5b22987`, S8 `edde9d0` |
| Frozen | `.specify/slices/**`, `.specify/KICKOFF*.md`, `.specify/content/**`; every S2/S4 and S7 manifest path; the 21 S3 tool files; every S5/S6/S8 path not on `approved-xploder-src.txt` |
| Approved sealed edits | S5: `src/time/**` (new), `src/react/useTeardownViewer.ts`, `src/react/useTourClock.ts`. S6: `src/react/scene/Scene.tsx`, `src/react/scene/OverlayProjector.tsx`, `src/overlay/place.ts` (conditional). S8: `src/react/TeardownViewer.tsx`, `src/react/panel/PanelLayer.tsx`, `src/react/events.ts` (new). Plus their new and changed tests, `.paths`, manifests, generators and `frozen-surface.test.ts` |

## Constitution Check

| Principle | Status |
|---|---|
| I. Brief is scope | FR1–FR6 quote AC1–AC6 verbatim; E1, E2, E4, E5, E8 only. `ALLOWED-PATHS-OK` fences drive-bys |
| II. Static-only | No runtime. The clock and the events are client code inside the existing viewer |
| III. Performance is a feature | No new dependency; the paused hero draws no frames; Lighthouse, weight, draw-call and eager-hero gates re-run on the final head; E8 measures before any cache |
| IV. Single motion source | No duration, easing or stagger is added. Timers take token-derived delays only; `no-motion-literals` stays green |
| V. Theme integrity | No colour or UI change |
| VI. Evidence over assertion | Every AC has a machine artifact (RFC §10) |
| VII. No secrets | gitleaks in CI, and `gitleaks dir` on new prose and evidence before each commit |

## Project Structure

### Documentation (this feature)

```
.specify/features/engine-timing/
  rfc.md · spec.md · plan.md · tasks.md · guards.sh · approved-xploder-src.txt
  rfc-repro/dup-frame.test.tsx            (Stage 1 repro; promoted to overlay-settle-state.test.tsx)
  pause-freeze.mjs · settle-once.mjs · event-log.mjs · settle-timing.mjs · holds-compare.mjs · seal-tag.sh
  evidence/   T<NNN>-* per EVIDENCE.md, AC-selfcheck.md
```

The S14 scripts `../engine-polish/{storyboard-timing,tour-timing,pause-events}.mjs` are reused in place.

### Source code (changes only)

```
packages/xploder/
  src/time/clock.ts                      NEW   EngineClock, clockFromNow, browserHost, hostNow (R1)          [E1, S5]
  src/time/fake.ts                       NEW   createFakeClock (manual host)                                 [E1, S5]
  src/react/useTeardownViewer.ts         EDIT  owns the clock; viewer.clock/paused; pause/resume/pauseTour    [E1/E2, S5]
  src/react/useTourClock.ts              EDIT  clock.schedule(delay, tick, timestamp) instead of setTimeout   [E1, S5]
  src/react/scene/Scene.tsx              EDIT  clock prop → Slabs/CameraRig/emphasis; ClockGate; rest inputs  [E1/E2/E4, S6]
  src/react/scene/OverlayProjector.tsx   EDIT  clock-stamped events; silent while paused; rest-state settle; phase [E1/E4, S6]
  src/react/TeardownViewer.tsx           EDIT  passes clock; tour adapter; DOM sweep; data-xploder-clock; events [E1/E2/E5, S8]
  src/react/panel/PanelLayer.tsx         EDIT  hostNow() for the event cutoff                                [E1, S8]
  src/react/events.ts                    NEW   pure ready/settled/tourEnded emitter                           [E5, S8]
  src/overlay/place.ts                   EDIT? only if E8 > 50 ms                                             [E8, S6]
  src/react/index.ts, test/fixtures/index.ts   EDIT  exports (unsealed)
  test/clock.test.ts, scene-clock.test.tsx, tour-clock-engine.test.tsx, overlay-clock.test.tsx,
       no-time-reads.test.ts, no-real-timers.test.ts, viewer-pause.test.tsx, scene-pause.test.tsx,
       overlay-settle-state.test.tsx, viewer-events.test.ts                  NEW (sealed per RFC §9.1)
  test/overlay-projector.test.tsx        EDIT  turn test: settled in the rest frame (§6.2)                    [E4, S6]
  test/frozen-surface.{s5,s6,s8}.paths, .sN.manifest.json, generate-sN.sh, frozen-surface.test.ts   RE-SEAL
apps/web/
  components/hero/hero-stage.tsx         EDIT  storyboard on viewer.clock; freeze-first pause; pauseTour; figure sweep [E2]
  components/hero/hero-leader.tsx        EDIT  label controller schedule on the hero's engine clock (shared via the showcase context) [E2]
  components/workbench/workbench-client.tsx, app/dev/engine/engine-playground.tsx   EDIT  pause → pauseTour [E2, R2]
  test/home-hero-loop.test.tsx           EDIT  stage mocks gain pause/resume/pauseTour/clock; fake-clock twins [E2]
  test/xploder-dom/viewer-clock.dom.test.tsx, viewer-pause.dom.test.tsx, viewer-events.dom.test.tsx   NEW
tools/perf/
  src/site-probe.ts                      EDIT  waitForHeroSettled via xploder:ready + first xploder:settled   [E5]
  src/eager-probe.ts                     EDIT  readyAtMs from xploder:ready (cross-checked); settledAtMs; rest wait = max(…) [E5]
  test/site-probe.test.ts, test/eager-probe.test.ts   EDIT  unit cases for the event-based waits
```

`hero-loop.ts` and `hero-follow.ts` are **not** edited (RFC C6, Q10).

## Guards (every task)

`guards.sh` (T001) prints one line per guard and exits 1 on any failure (`guard NAME cmd` style, as in S14):

```sh
B=8c410f3; F=.specify/features/engine-timing; X=packages/xploder
FROZEN-OK               git diff --quiet $B -- .specify/slices .specify/KICKOFF-S15.md .specify/content
SURFACES-S2S4S7-OK      combined S2/S4 + S7 manifests, .paths, generators and every listed path byte-identical to $B
S3-TOOLS-OK             the 21 S3 tool files byte-identical
RESEAL-LIST-OK          every changed path under an S5/S6/S8 sealed path (or src/time) is on approved-xploder-src.txt
ALLOWED-PATHS-OK        every changed path matches the plan's file list (the no-drive-by fence)
NO-NEW-DEPS-OK          the four package.json files byte-identical
AC1-SCAN-OK             grep -rnE 'performance\.now\(|Date\.now\(' $X/src | grep -v "^$X/src/time/" → empty   (expected FAIL until T006)
SEAL-TAG-OK             each manifest base B_n has refs/tags/seal/*-B_n on origin (git ls-remote)
TIMEOUT-NOT-RAISED-OK   no existing *_MS / timeout constant changes value in site-probe.ts or eager-probe.ts
GITLEAKS-OK             gitleaks git --log-opts="$B..HEAD" + gitleaks dir $F
```

- `AC1-SCAN-OK` is reported as `PENDING` (not FAIL) before T006. From T006 on it is a hard guard.
- A failing `RESEAL-LIST-OK`, `ALLOWED-PATHS-OK` or `SURFACES-S2S4S7-OK` is never fixed by widening the guard. It is a STOP and an escalation with evidence (kickoff Hard Rules 1, 2 and 5).

## Re-seal procedure (RFC §9.1)

1. The fix commit is green apart from `frozen-surface.test.ts`.
2. **Re-seal commit**, in one diff:
   - `frozen-surface.generate-sN.sh` `base=<fix sha>`;
   - the note gains ` Re-sealed in S15 at <sha>: <file> — <reason>; see .specify/features/engine-timing/evidence/<T-file>.`;
   - `.paths` gets the new tests (and `src/time` at step 1);
   - run the generator;
   - update `frozen-surface.test.ts` (`base`, `note`).
3. `pnpm --filter xploder exec vitest run test/frozen-surface.test.ts` must be green.
4. **Tag:** `bash $F/seal-tag.sh <surfaces> <fix sha>` creates the annotated tag `seal/<surfaces>-<sha7>` (message: the note line) and runs `git push origin refs/tags/seal/<surfaces>-<sha7>`. It then verifies the tag with `git ls-remote`.
   - If the push is rejected: STOP and hand it to Murphy with the exact command.
5. Merge the task branch back with `--no-ff`. The tag keeps the fix SHA reachable after the squash merge.

## Key implementation notes

- **Clock (T002, RFC §3, R1):**
  - `pausedTotal` and `pausedAt` are in host seconds; host timers in ms.
  - `schedule` returns a cancel function.
  - The fake host's `advance` fires due timers in order, each at its due time. React tests wrap `advance` in `act`.
- **Scene (T003):**
  - `clock?: ClockReader` takes precedence over `now?`. A `now` prop builds `clockFromNow` held in a ref, so `scene.test.tsx` (S4) runs as is.
  - `now` handed to children is `clock.now`, a stable bound function, so effects do not re-run each render.
- **Tour (T004):**
  - `useTourClock(state, flows, clock, dispatch)` keeps the same read pattern: `timestamp = clock.now()`, then `clock.schedule(delay, () => dispatch({ type: 'tick', now: clock.now() }), timestamp)`.
  - `useTeardownViewer` keeps the clock in `useState` (created once) and stores the legacy `now` in a ref (R1).
- **Overlay (T005):** `OverlayProjector` gains `clock: ClockReader`. Events gain `at: number`. While `clock.paused` the frame returns before any emit.
- **Pause API (T007, R2):**
  - `pause`, `resume` and `pauseTour` sit in `TeardownViewerInteractionActions`; `paused` is on the handle.
  - `TeardownViewer` builds `tourCommandActions = { stop, step, play, pause: pauseTour }` for `executeTourCommand`. The case-study auto-pause calls `pauseTour()`.
- **ClockGate (T008, RFC §5.2, R4):**
  - It lives in `Scene.tsx`, subscribes to the clock and uses `useThree(s => s.setFrameloop / invalidate / advance)`.
  - A `useLayoutEffect` keyed on `[paused, size, dpr, palette, look, layout, kinds]` calls `advance(clock.now())` once while paused.
- **DOM sweep (T009, R6):**
  - On a pause notification: `getAnimations({ subtree: true }).filter(a => a.playState === 'running')` → `pause()` each, kept in a ref, plus one more sweep on the next rAF.
  - On resume: `play()` the kept set and clear it.
  - It also writes `data-xploder-clock`.
- **Settle state (T011, RFC §6.1, R10):**
  - The rest key and the at-rest predicate are a pure exported function, `restState(...)`, so they are unit-testable without frames.
  - `Scene` records the last azimuth from `onAzimuth` in a ref passed to the projector, and still forwards the caller's `onAzimuth`.
- **Events (T012, RFC §7.1):**
  - `createViewerEvents({ onReady, onSettled, onTourEnded, target })` buffers a settle until `ready` and fires `onTourEnded` after any same-frame settle (a microtask-free order: same call stack).
  - The DOM mirror uses `new CustomEvent(name, { bubbles: true, detail })` on the wrapper.

## Test map

| Check | Where | FR |
|---|---|---|
| clock semantics (8 cases, RFC §3.3) | `packages/xploder/test/clock.test.ts` | FR1 |
| explode/camera/emphasis on the clock | `test/scene-clock.test.tsx` | FR1 |
| tour on the clock + S13 cases without Vitest timers | `test/tour-clock-engine.test.tsx`; originals `tour-clock-boundary`, `tour-clock` unchanged | FR1, FR2 |
| overlay stamped/silent | `test/overlay-clock.test.tsx` | FR1, FR2 |
| scene receives the viewer clock | `apps/web/test/xploder-dom/viewer-clock.dom.test.tsx` (R5) | FR1 |
| AC1 scan / no real timers (+ negative controls) | `test/no-time-reads.test.ts`, `test/no-real-timers.test.ts`, `guards.sh AC1-SCAN-OK` | FR1 |
| freeze at +0.5 s / +3 s, zero settles, resume continuity | `test/scene-pause.test.tsx`, `test/viewer-pause.test.tsx`, `xploder-dom/viewer-pause.dom.test.tsx` | FR2 |
| I-03 re-proof | `apps/web/test/home-hero-loop.test.tsx` (8 originals + 4 fake-clock twins) | FR2 |
| browser freeze matrix | `pause-freeze.mjs` | FR2 |
| reduced motion | `site:probe --group reduced-motion` | FR2 |
| duplicate frames → one settle | `test/overlay-settle-state.test.tsx` | FR3 |
| settle once at CPU ×4/×6 | `settle-once.mjs` | FR3 |
| emitter order/once | `test/viewer-events.test.ts`, `xploder-dom/viewer-events.dom.test.tsx` | FR4 |
| event order in the browser | `event-log.mjs` | FR4 |
| probes on events | `tools/perf/test/{site,eager}-probe.test.ts`; `site:probe --ci`, `eager:probe --expect live-loop`, `engine:probe` | FR4, FR6 |
| timing table + decision | `settle-timing.mjs` | FR5 |
| holds | `storyboard-timing.mjs` + `tour-timing.mjs` vs T001 | FR6 |
| surfaces, re-seals, tags, gitleaks | `guards.sh`, frozen-surface tests | FR6 |
| gates | CI (7 required) + `site:probe --group draws,hero` + `eager:probe` | FR6 |

## Phase groups (Stage 3 STOP points)

- **G1 — baselines + clock:** T001–T002 → STOP.
- **G2 — consumers:** T003–T006 → STOP.
- **G3 — pause/resume:** T007–T010 → STOP.
- **G4 — settle state:** T011 → STOP.
- **G5 — events:** T012–T013 → STOP.
- **G6 — phone measurement:** T014 (+ T015 only if triggered) → STOP.
- **G7 — gates/seals:** T016–T017 → STOP (final). Murphy validates; "S15 done" happens outside the agent's view.

## Complexity Tracking

| Choice | Why not simpler |
|---|---|
| A frame gate via `setFrameloop` instead of per-loop `invalidate` gating | Per-loop gating needs `CameraRig.tsx` (S4). The gate stops every loop in one place, and proves "no frames while paused" by construction |
| A DOM animation sweep | The tour trace dot and the fades run on document time, so freezing the canvas alone fails AC2 in tour phases (RFC C5) |
| Camera rest read from the tweens' outputs | Reading the tween objects needs `CameraRig.tsx` (S4). The outputs equal the targets exactly when the tweens are settled (RFC §6.1, Q4) |
| A `seal-tag.sh` helper | Ten tags, each paired with its commit and pushed in the same session (Hard Rule 5). One script prevents a mistyped name or a forgotten push |
