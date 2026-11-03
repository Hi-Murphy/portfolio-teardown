# T009 — AC4 ready/reveal sequence

Attributed startup runs retain the first `drawElementsInstanced`, the `data-xploder-ready` flip, and every `data-site-live-state` change. The comparison target is the T004 §5 sequence. Times are milliseconds after engagement; `raf` is the frame index from the attribution script.

## T004 baselines and T009 final

| State | Path | Run | firstInstancedDraw t / raf | ready t / raf | Same rAF | Draw before ready | liveStates |
|---|---|---:|---:|---:|---|---|---|
| T004 | home-move | r1 | 2611.700 / 12 | 2612.000 / 12 | yes | none before ready | idle → loading → revealed |
| T004 | home-move | r2 | 2487.100 / 11 | 2487.900 / 11 | yes | none before ready | idle → loading → revealed |
| T009 | home-move | r1 | 2609.000 / 12 | 2610.100 / 12 | yes | none before ready | idle → loading → revealed |
| T009 | home-move | r2 | 2590.900 / 12 | 2591.900 / 12 | yes | none before ready | idle → loading → revealed |
| T004 | project-move | r1 | 2555.400 / 14 | 2556.600 / 14 | yes | none before ready | loading → revealed |
| T004 | project-move | r2 | 2517.100 / 14 | 2518.000 / 14 | yes | none before ready | loading → revealed |
| T009 | project-move | r1 | 2551.400 / 14 | 2552.000 / 14 | yes | none before ready | loading → revealed |
| T009 | project-move | r2 | 2530.900 / 14 | 2531.900 / 14 | yes | none before ready | loading → revealed |
| T004 | project-click | r1 | 2700.000 / 15 | 2700.900 / 15 | yes | none before ready | loading → revealed |
| T004 | project-click | r2 | 2571.600 / 14 | 2572.600 / 14 | yes | none before ready | loading → revealed |
| T009 | project-click | r1 | 2713.100 / 16 | 2713.700 / 16 | yes | none before ready | loading → revealed |
| T009 | project-click | r2 | 2586.500 / 15 | 2587.700 / 15 | yes | none before ready | loading → revealed |

### Assertions

- **home-move:** `ready.raf === firstInstancedDraw.raf` in both runs: yes; no draw precedes ready; liveStates `idle>loading>revealed` matches T004 (`idle>loading>revealed`).
- **project-move:** `ready.raf === firstInstancedDraw.raf` in both runs: yes; no draw precedes ready; liveStates `loading>revealed` matches T004 (`loading>revealed`).
- **project-click:** `ready.raf === firstInstancedDraw.raf` in both runs: yes; no draw precedes ready; liveStates `loading>revealed` matches T004 (`loading>revealed`).

**AC4 verdict: PASS.** Both routes and both engagement paths keep the first content frame's ready flip and the T004 live-state order.

## Hero probe

```text
$ pnpm site:probe --serve apps/web/out --group hero --out /tmp/s116-checks/t009/site-hero
$ node tools/perf/src/cli/site-probe.ts --serve apps/web/out --group hero --out /tmp/s116-checks/t009/site-hero
PASS hero-ssr-poster: expected true actual true
PASS hero-first-paint-is-poster: expected {"liveStateNot":"revealed","hasFcp":true} actual {"fcpAt":60,"loadAt":57.700000047683716,"liveStateAtFcp":"idle","liveStateAtLoad":"idle"}
PASS hero-poster-no-interaction: expected {"liveState":"idle","canvases":0,"posterWidthPositive":true} actual {"liveState":"idle","canvases":0,"posterWidth":570,"posterOpacity":"1"}
PASS hero-revealed-after-load: expected {"afterLoad":true,"liveState":"revealed"} actual {"fcpAt":60,"loadAt":57.700000047683716,"liveStateAtFcp":"idle","liveStateAtLoad":"idle","liveStateAfterInteraction":"revealed"}
PASS hero-idle-exploded: expected {"state":"exploded","tweening":"false"} actual {"state":"exploded","tweening":"false","canvases":1}
PASS hero-one-canvas-max: expected 1 actual 1
PASS hero-project-poster: expected {"canvases":0,"poster":true,"staticExplore":true,"exploreControl":true} actual {"canvases":0,"posterWidth":1086,"staticExploreVisible":true,"controlVisible":true}
hero: PASS (7 checks)
site-probe: PASS
artifacts: /tmp/s116-checks/t009/site-hero
```
