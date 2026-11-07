# T013b — retire the home hero gate

Date: 2026-11-08
Worktree: .
Result: T013b-OK

## Default and gated behaviour

Default build (`pnpm build`, no environment override):

```text
$ pnpm eager:probe --serve apps/web/out --route / --runs 2 --out <local-path>/s118-checks/t013b-home
eager-probe: home/normal r1 PASS
eager-probe: home/normal r2 PASS
eager-probe: PASS (2 runs)

$ pnpm eager:probe --serve apps/web/out --route /projects/websocket-inspector --expect gated --runs 2 --out <local-path>/s118-checks/t013b-project
eager-probe: project/normal r1 PASS
eager-probe: project/normal r2 PASS
eager-probe: PASS (2 runs)
```

Gated build (`pnpm build:gated-hero`, with `NEXT_PUBLIC_GATED_HERO=1`):

```text
$ NEXT_PUBLIC_GATED_HERO=1 pnpm --filter web build
✓ Compiled successfully
```

## Site probe

Default build:

```text
$ pnpm site:probe --serve apps/web/out --ci --out <local-path>/s118-checks/t013b-site
PASS hero-ssr-poster: expected true actual true
PASS hero-first-paint-is-poster: expected {"liveStateNot":"revealed","hasFcp":true} actual {"fcpAt":52,"loadAt":46,"liveStateAtFcp":"loading","liveStateAtLoad":"idle"}
PASS hero-eager-no-interaction: expected {"liveState":"revealed","canvases":1,"ready":true} actual {"liveState":"revealed","canvases":1,"ready":true}
PASS hero-revealed-after-load: expected {"afterLoad":true,"liveState":"revealed"} actual {"fcpAt":52,"loadAt":46,"liveStateAtFcp":"loading","liveStateAtLoad":"idle","liveStateAfterInteraction":"revealed"}
PASS hero-idle-exploded: expected {"state":"exploded","tweening":"false"} actual {"state":"exploded","tweening":"false","canvases":1}
PASS hero-one-canvas-max: expected 1 actual 1
PASS hero-project-poster: expected {"canvases":0,"poster":true,"staticExplore":true,"exploreControl":true} actual {"canvases":0,"posterWidth":1086,"staticExploreVisible":true,"controlVisible":true}
hero: PASS (7 checks)
site-probe: PASS
```

Gated build:

```text
$ pnpm site:probe --serve apps/web/out --ci --out <local-path>/s118-checks/t013b-site-gated
PASS hero-ssr-poster: expected true actual true
PASS hero-first-paint-is-poster: expected {"liveStateNot":"revealed","hasFcp":true} actual {"fcpAt":40,"loadAt":41.799999952316284,"liveStateAtFcp":"idle","liveStateAtLoad":"idle"}
PASS hero-poster-no-interaction: expected {"liveState":"idle","canvases":0,"posterWidthPositive":true} actual {"liveState":"idle","canvases":0,"posterWidth":570,"posterOpacity":"1"}
PASS hero-revealed-after-load: expected {"afterLoad":true,"liveState":"revealed"} actual {"fcpAt":40,"loadAt":41.799999952316284,"liveStateAtFcp":"idle","liveStateAtLoad":"idle","liveStateAfterInteraction":"revealed"}
PASS hero-idle-exploded: expected {"state":"exploded","tweening":"false"} actual {"state":"exploded","tweening":"false","canvases":1}
PASS hero-one-canvas-max: expected 1 actual 1
PASS hero-project-poster: expected {"canvases":0,"poster":true,"staticExplore":true,"exploreControl":true} actual {"canvases":0,"posterWidth":1086,"staticExploreVisible":true,"controlVisible":true}
hero: PASS (7 checks)
site-probe: PASS
```

## Lighthouse — default build, local

```text
$ node tools/perf/src/cli/lighthouse-gate.ts http://127.0.0.1:PORT/ --out <local-path>/s118-checks/t013b-lh-r1
performance: 1 >= 0.95 (median) pass
lcp: 902.9969000000001 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass

$ node tools/perf/src/cli/lighthouse-gate.ts http://127.0.0.1:PORT/ --out <local-path>/s118-checks/t013b-lh-r2
performance: 0.99 >= 0.95 (median) pass
lcp: 2157.2759 < 2500 (median) pass
cls: 0, 0, 0 === 0 (every-run) pass
```

## Parity

Default build, home only, no engagement, against the T004 eager-home baseline:

```text
$ pnpm perf:parity --serve apps/web/out --no-engage --route home --compare <T004-eager-home> --out <local-path>/s118-checks/t013b/parity-eager-home
home-mobile-light: 0 px
home-mobile-dark: 0 px
home-desktop-light: 0 px
home-desktop-dark: 0 px
parity: PASS (4 shots, 0 px)
```

Gated build, both routes engaged, against the T004 gated baseline:

```text
$ pnpm perf:parity --serve apps/web/out --compare <T004-gated> --out <local-path>/s118-checks/t013b/parity-gated
home-mobile-light: 0 px
home-mobile-dark: 0 px
home-desktop-light: 0 px
home-desktop-dark: 0 px
project-mobile-light: 0 px
project-mobile-dark: 0 px
project-desktop-light: 0 px
project-desktop-dark: 0 px
parity: PASS (8 shots, 0 px)
```

## Bytes against 0fcd243

Default hero-eager build versus `main` `build:eager` at `0fcd243`:

```text
Metric                        Before       After       Delta       Limit Result
home initial raw              582949      583386         437           - INFO
home initial gzip             180481      180628         147      2000 B PASS
project initial raw           583043      581945       -1098           - INFO
project initial gzip          180482      180096        -386      2000 B PASS
total raw                    1581749     1582962        1213           - INFO
total gzip                    459158      459680         522        0.5% PASS
non-initial 3D raw            995308      997182        1874           - INFO
non-initial 3D gzip           277162      277923         761           - INFO
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 0.5% of before)
```

Gated hero build versus `main` gated at `0fcd243`:

```text
Metric                        Before       After       Delta       Limit Result
home initial raw              583374      583404          30           - INFO
home initial gzip             180622      180633          11      2000 B PASS
project initial raw           581945      581945           0           - INFO
project initial gzip          180096      180096           0      2000 B PASS
total raw                    1582126     1582980         854           - INFO
total gzip                    459309      459685         376        0.5% PASS
non-initial 3D raw            996358      997182         824           - INFO
non-initial 3D gzip           277558      277923         365           - INFO
RESULT: PASS (initial gzip delta <= 2000 B; total delta <= 0.5% of before)
```

## D-19 amendment

D-19 amended (S11.8, Murphy 2026-11-08): home / eager - the live teardown boots with zero interaction after load + idle; project routes keep the interaction gate; reduced motion and Save-Data keep the poster; NEXT_PUBLIC_GATED_HERO=1 restores the home gate.

## T013b Check tail

```text
draws: PASS (2 checks)
site-probe: PASS
FROZEN-OK
BRIEF-HISTORY-OK
G1-LIST-OK
XPLODER-SRC-OK
XPLODER-TEST-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
BASELINE-FIRST-OK
APP-TOUCH-OK
DEV-ROUTES-OK
CI-JOBS-OK
FLAG-DEFAULT-OK
VERSIONS-OK
BUDGETS-OK
GITLEAKS-OK
tools/perf: 30 files, 248 tests passed
packages/xploder: 62 files, 625 tests passed
apps/web: 35 passed | 1 skipped files, 197 passed | 2 skipped tests
prettier --check .: all matched files use Prettier code style
T013b-OK
```

## Orchestrator review (T013b)

- Reverted the executor's addition of `hero` to `SITE_PROBE_CI_GROUPS`: the required `site:probe --ci` job never ran the hero group (CI groups at `0fcd243`: `drill`, `cls`, `routes`, `nojs`, `reduced-motion`), so adding it would widen a required job beyond the retirement. RFC §11.5 R9 is corrected accordingly.
- Hero group re-run after that change (local, `--group hero`):
  - default build (`pnpm build`, hero eager): **PASS 7/7**, incl. `hero-eager-no-interaction` (revealed, 1 canvas, ready, no input) and `hero-project-poster` (project route still poster, 0 canvases);
  - `pnpm build:gated-hero`: **PASS 7/7**, incl. the original `hero-poster-no-interaction`.
- `pnpm typecheck && pnpm lint && pnpm test`: exit 0. `FLAG-DEFAULT-OK` now pins `NEXT_PUBLIC_GATED_HERO !== '1'` and the opt-in `NEXT_PUBLIC_EAGER_3D === '1'`.
