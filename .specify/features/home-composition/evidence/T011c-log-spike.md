# T011c — hero tour feasibility spike

Date: 2026-11-08
Branch: `task/s11.9-home-composition-t011c` (throwaway; not merged)
Worktree: `.`
Export: local static `apps/web/out` on `127.0.0.1:PORT`
Motion: normal (no reduced-motion emulation unless stated)

## Answer

**YES — the existing tour runs in the hero with the public `xploder/react` API only, with no
`packages/xploder` change and no panels.**

The public handle and project data are sufficient to sequence both flows, read the current step,
derive the current component, pause/play the animation, and continue the existing T011b turn. The
hero rendered the travelling pulse, the engine generated no console/page errors, and the WebGL draw
count stayed at 2.

There is one gate conflict: `eager:probe --expect live-loop` fails only because its `restIdle`
condition still requires `tour: idle`. A running tour is the feature under test, so that check and
the R8 behaviour cannot both be true without a later probe change. Details are under **Risks**.

## Minimal wiring

Two hero-only files changed: `apps/web/components/hero/hero-stage.tsx` and
`apps/web/components/hero/hero-loop.ts`. `packages/xploder/**`, `components/viewer/**`, and panels
were not touched.

The core public-API sequence is:

```ts
if (phaseRef.current !== 'turn') {
  const flowId = phaseRef.current === 'capture' ? 'capture-path' : 'inspect-path';

  loop?.pause();

  if (tour?.flowId !== flowId) {
    viewer.actions.selectFlow(flowId);
    viewer.actions.play();
    return;
  }

  if (tour.status === 'ended') {
    if (phaseRef.current === 'capture') {
      phaseRef.current = 'inspect';
      viewer.actions.selectFlow('inspect-path');
      viewer.actions.play();
      return;
    }

    phaseRef.current = 'turn';
    turnStepsRef.current = 0;
    viewer.actions.stop();
    loop?.resume();
    return;
  }

  if (tour.status === 'idle' || tour.status === 'paused') viewer.actions.play();
  return;
}

if (tour?.status !== 'idle') viewer.actions.stop();
loop?.resume();
```

The existing T011b loop gained an optional `onStep` callback. After its two steps (`implode`, then
`explode`), the hero pauses that loop, selects `capture-path`, and starts the cycle again:

```ts
turnStepsRef.current += 1;
if (turnStepsRef.current < 2) return;

turnStepsRef.current = 0;
phaseRef.current = 'capture';
loopRef.current?.pause();
viewer.actions.selectFlow('capture-path');
viewer.actions.play();
```

The pause button now toggles the same suspension state used by the tour sequence. Suspension calls
`viewer.actions.pause()` when the tour is playing and pauses the T011b loop. Resume calls
`viewer.actions.play()` for a paused tour (or resumes the loop during the turn phase). Hidden tabs and
off-screen hero state use the same path.

## Public per-step data

`TeardownViewerHandle.tour` publicly exposes:

| Field | Meaning |
|---|---|
| `flows` | `{ id, label }[]` for the project |
| `flowId` | Current flow id (`capture-path`, `inspect-path`, or `null`) |
| `status` | `idle`, `playing`, `paused`, or `ended` |
| `step` | Zero-based step index; `-1` when idle |
| `total` | Number of steps in the selected flow |
| `showFlowSelector` | Whether more than one flow exists |

**A component id is not directly exposed on the public handle.** `viewerMetadataOf(handle).position`
contains it internally, but `viewerMetadataOf` is not exported from the public `xploder/react` entry
point. Narration can derive it from public project data without touching internals:

```ts
const flow = project.flows?.find((candidate) => candidate.id === viewer.tour.flowId);
const componentId = flow?.path[viewer.tour.step] ?? null;
const component = project.layers
  .flatMap((layer) => layer.components)
  .find((candidate) => candidate.id === componentId);
// component?.name, component?.summary
```

At runtime the engine also renders `data-xploder-tour-flow`, `data-xploder-tour-step`,
`data-xploder-trace`, and `data-xploder-caption`; these were used only for browser observation, not
as an app API.

## Live observations

Playwright Chromium, light theme, normal motion, viewports `1440x900` and `390x844`:

- Capture path ran first and inspect path followed automatically.
- The pulse rendered and travelled. `data-xploder-pulse="true"` held during each playing step, and
  `data-xploder-trace` grew from one component to the full seven-component path.
- The four screenshots show different capture steps at 1440:

| Screenshot | Flow | Step (zero-based) | Caption component | Caption summary |
|---|---:|---:|---|---|
| `T011c-screenshot-tour-1.png` | `capture-path` | 0 | MainActivity | The thin host that proves the library. |
| `T011c-screenshot-tour-2.png` | `capture-path` | 2 | Factory wrap | Wraps Scarlet's WebSocketFactory. |
| `T011c-screenshot-tour-3.png` | `capture-path` | 4 | Session tags | Gives every connection an identity. |
| `T011c-screenshot-tour-4.png` | `capture-path` | 6 | Room store | Sessions and frames that survive process death. |

- **Tour UI without panels: yes.** `TourCaption` appeared automatically with the flow label, step
  count, component name, summary, and (on step 1) the flow description. No flow selector or panel was
  rendered. The caption is an absolute overlay inside the viewer and visibly covers part of the
  figure; this is the main T011d presentation risk.
- No browser console errors or page errors in either viewport.
- Figure geometry: 1440 was `624x389` at `(640, 101)`; 390 was `350x326.5` at `(20, 485.53125)`.
  `scrollWidth == clientWidth` at both widths (no horizontal overflow).
- Mobile pause/play: clicking `Pause animation` produced `tour: paused`, `data-hero-loop: paused`,
  and pulse off; after 1.8 s the step was still 0. Clicking `Play animation` resumed `tour: playing`
  and `data-hero-loop: running`.

### Observed cycle timing

One polled run on the desktop viewport recorded:

| Time | State |
|---:|---|
| 0.302 s | `capture-path` playing, step 0 |
| 11.537 s | `inspect-path` playing, step 0 |
| 22.776 s | `inspect-path` idle (tour ended) |
| 25.243 s | loop `imploding` |
| 26.012 s | loop `imploded` |
| 27.709 s | `capture-path` playing, step 0 again |

Steps advanced every ~1.6 s. The complete cycle is therefore roughly 27.4 s: 7 x 1.6 s per flow,
plus the two-step T011b turn.

## Measurements

### Build and static checks

```text
$ pnpm build
Compiled successfully
Finished TypeScript
Generating static pages (8/8)

$ pnpm --filter web typecheck
Types generated successfully

$ pnpm --filter web lint
$ eslint .

$ pnpm exec prettier --check apps/web/components/hero/hero-stage.tsx apps/web/components/hero/hero-loop.ts
All matched files use Prettier code style!

$ pnpm --filter web test
Test Files  40 passed | 1 skipped (41)
Tests       214 passed | 2 skipped (216)
```

### Draw calls and CLS

```text
$ pnpm site:probe --serve apps/web/out --group draws,cls
draws project: mode=2 rendered=32 total=32 PASS
draws hero: mode=2 rendered=106 total=106 PASS
PASS draws-project: expected 2 actual {"pass":true,"mode":2,...}
PASS draws-hero: expected 2 actual {"pass":true,"mode":2,...}
draws: PASS (2 checks)
cls / desktop light total=0.000000 PASS
cls /projects desktop light total=0.000000 PASS
cls /projects/websocket-inspector desktop light total=0.000000 PASS
cls / desktop dark total=0.000000 PASS
... (all 12 route/viewport/palette cells 0.000000) ...
cls: PASS (12 checks)
site-probe: PASS
```

No extra draw calls: the tour stays at 2 draws and all 106 sampled hero frames were in mode 2.

### Lighthouse

One invocation (`Lighthouse 13.6.0`, Chromium `156.0.0.0`, mobile simulated throttling). The tool's
default is three internal runs; median run is shown by the gate summary.

```text
$ pnpm perf:lighthouse http://127.0.0.1:PORT/ --categories performance,accessibility
performance: 1 >= 0.95 (median) pass
lcp: 905.9545 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
accessibility: 1 >= 0.95 (median) pass
```

Runs: performance/accessibility `1/1` on all three; LCP `905.9545`, `906.787`, `904.4463` ms; CLS
`0` on all three; TBT `1.5`, `0`, `0.5` ms; total byte weight `439713` on all three.

### Eager probe

```text
$ pnpm eager:probe --serve apps/web/out --route / --expect live-loop --runs 2
eager-probe: home/normal r1 FAIL
  loop-running: {"heroLoop":"running","tour":"playing","liveStates":[...]} (expected true)
eager-probe: home/normal r2 FAIL
  loop-running: {"heroLoop":"running","tour":"playing","liveStates":[...]} (expected true)
eager-probe: FAIL (2 runs)
```

Command exit: `6` (budget/verdict failure).

All other eager checks passed in both runs, including canvas-present, ready/revealed by the 2.5 s
deadline, live opacity, poster hidden, zero trusted events, and non-blank canvas. The failing
`loop-running` check requires `restIdle`, and `restIdle` explicitly rejects a non-idle tour. Actual
state was `heroLoop: running` and `tour: playing`.

### Guards

```text
$ bash .specify/features/home-composition/guards.sh
OK app-touch
OK site-json
OK frozen-surfaces
OK workflows
OK routes
OK g1-sha
OK home-use-client
OK dependencies
OK interim-list
guards exit: 0
```

## Risks

1. **`eager:probe --expect live-loop` semantics conflict with R8.** It treats a playing tour as a
   failed idle state. T011d cannot keep this gate green while the tour is running unless the probe is
   amended to accept an active tour under `live-loop` (for example, require `heroLoop: running` and a
   valid playing/paused/ended tour rather than `tour: idle`). This task did not edit `tools/perf`.
2. **The engine's automatic `TourCaption` overlays the figure.** It is useful for this spike and
   confirms narration data is available, but it covers a large part of a 624 x 389 hero figure. R8
   calls for a caption row, so T011d will need to hide/replace the engine caption without an engine
   change (CSS is the likely lever) and render the narration in the existing caption row.
3. **No public `componentId` field.** Deriving it from `project.flows[].path[step]` is simple and
   fully public, but the mapping must remain in app code. Do not rely on non-exported
   `viewerMetadataOf`.
4. **The next capture cycle starts while the turn's explode animation is beginning.** The T011b loop
   callback fires when `explode()` is dispatched, so the tour resumes during the exploding phase
   rather than after it settles. The first cycle and all screenshots start fully exploded; this is
   acceptable for the spike but should be decided explicitly in T011d if the transition must wait for
   a settled frame.
5. **Cycle length is ~27 s.** Seven 1.6 s beats per flow plus a five-second turn. The proof-strip
   highlight mapping in T011e will need this cadence, and Murphy should confirm it does not feel too
   slow for the landing hero.

## Evidence files

- `T011c-screenshot-tour-1.png` — capture step 1, MainActivity, 1440 light.
- `T011c-screenshot-tour-2.png` — capture step 3, Factory wrap, 1440 light.
- `T011c-screenshot-tour-3.png` — capture step 5, Session tags, 1440 light.
- `T011c-screenshot-tour-4.png` — capture step 7, Room store, 1440 light.

T011c-OK
