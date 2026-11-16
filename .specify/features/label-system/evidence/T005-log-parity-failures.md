# T005 parity failures

`parity: FAIL (2040 cells, 288107 px)`

- 60 stable-gated cells fail: 53 have a non-zero pixel diff on a pixel-stable base; 11 have a normalised DOM diff on a DOM-stable base.
- Of the 60 failures, 11 are fully stable and 49 are pixel-stable but DOM-unstable on the base. All 12 home sweep-only rows are excluded.
- `DOM first differing number` uses the same React-id normalisation as `parity-compare.mjs`; the quoted context is from the normalised base/head serialisation.
- `Label keys differing` compares quads with the matrix 1e-6 px tolerance and includes missing, newly added, repainted and moved keys.
- Cross-base result: Stage A also fails against `sbase2` (`60` gated failures, `293144` px) and `sbase3` (`60`, `298925` px). It matches neither base.

The six largest failing cells have `T005-screenshot-<cellId>-{base,head,diff}.png` copies in this
directory:

- `jev-toolkit-390-light-exploded-z0-n-a-t3` — 9,627 px
- `fixture-c-768-dark-exploded-z0-n-a-t3` — 8,753 px
- `fixture-c-768-dark-exploded-z0-n-a-t0` — 8,477 px
- `websocket-inspector-1440-dark-exploded-z4-middle-t3` — 4,047 px
- `websocket-inspector-768-dark-exploded-z1-middle-t3` — 3,792 px
- `websocket-inspector-1440-light-exploded-z5-middle-t1` — 3,719 px

| cell | px | stability | DOM | changed label keys |
|---|---:|---|---|---:|
| `jev-toolkit-390-light-exploded-z0-n-a-t3` | 9627 | stable | `FAIL / FAIL` | 49 |
| `fixture-c-768-dark-exploded-z0-n-a-t3` | 8753 | stable | `FAIL / FAIL` | 36 |
| `fixture-c-768-dark-exploded-z0-n-a-t0` | 8477 | stable | `FAIL / FAIL` | 37 |
| `websocket-inspector-1440-dark-exploded-z4-middle-t3` | 4047 | base-unstable (px ok, dom) | `FAIL / FAIL` | 33 |
| `websocket-inspector-768-dark-exploded-z1-middle-t3` | 3792 | base-unstable (px ok, dom) | `FAIL / FAIL` | 44 |
| `websocket-inspector-1440-light-exploded-z5-middle-t1` | 3719 | base-unstable (px ok, dom) | `FAIL / FAIL` | 31 |
| `fixture-a-768-light-exploded-z1-middle-t2` | 3532 | base-unstable (px ok, dom) | `FAIL / FAIL` | 26 |
| `fixture-a-768-dark-exploded-z4-middle-t2` | 2794 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `fixture-a-1440-light-exploded-z1-middle-t1` | 2654 | base-unstable (px ok, dom) | `FAIL / FAIL` | 26 |
| `fixture-a-390-dark-exploded-z1-middle-t2` | 2501 | base-unstable (px ok, dom) | `FAIL / FAIL` | 26 |
| `fixture-a-390-light-exploded-z1-middle-t1` | 2064 | base-unstable (px ok, dom) | `FAIL / FAIL` | 26 |
| `websocket-inspector-768-light-exploded-z2-middle-t1` | 1982 | base-unstable (px ok, dom) | `FAIL / FAIL` | 38 |
| `fixture-c-768-dark-imploded-z0-n-a-t3` | 1915 | stable | `FAIL / FAIL` | 14 |
| `jev-toolkit-768-light-exploded-z3-middle-t2` | 1768 | base-unstable (px ok, dom) | `FAIL / FAIL` | 42 |
| `websocket-inspector-768-light-exploded-z4-middle-t2` | 1521 | base-unstable (px ok, dom) | `FAIL / FAIL` | 33 |
| `jev-toolkit-768-dark-exploded-z4-bottom-t1` | 1227 | base-unstable (px ok, dom) | `FAIL / FAIL` | 39 |
| `jev-toolkit-768-dark-exploded-z4-bottom-t3` | 1227 | base-unstable (px ok, dom) | `FAIL / FAIL` | 39 |
| `fixture-a-768-dark-exploded-z5-middle-t1` | 1047 | base-unstable (px ok, dom) | `FAIL / FAIL` | 16 |
| `websocket-inspector-390-dark-exploded-z4-middle-t1` | 1031 | base-unstable (px ok, dom) | `FAIL / FAIL` | 30 |
| `jev-toolkit-1440-light-exploded-z1-middle-t2` | 1029 | base-unstable (px ok, dom) | `FAIL / FAIL` | 52 |
| `jev-toolkit-768-dark-exploded-z3-middle-t3` | 935 | base-unstable (px ok, dom) | `FAIL / FAIL` | 42 |
| `fixture-b-390-light-exploded-z5-middle-t2` | 777 | base-unstable (px ok, dom) | `FAIL / FAIL` | 11 |
| `fixture-c-390-dark-exploded-z1-bottom-t0` | 668 | base-unstable (px ok, dom) | `FAIL / FAIL` | 1 |
| `fixture-c-768-light-exploded-z4-bottom-t1` | 658 | base-unstable (px ok, dom) | `FAIL / FAIL` | 2 |
| `fixture-c-768-light-exploded-z4-bottom-t3` | 658 | base-unstable (px ok, dom) | `FAIL / FAIL` | 3 |
| `fixture-a-390-dark-exploded-z4-middle-t3` | 428 | base-unstable (px ok, dom) | `FAIL / FAIL` | 16 |
| `jev-toolkit-1440-light-exploded-z1-middle-t1` | 347 | base-unstable (px ok, dom) | `FAIL / FAIL` | 52 |
| `websocket-inspector-390-light-exploded-z1-bottom-t0` | 331 | base-unstable (px ok, dom) | `FAIL / FAIL` | 1 |
| `websocket-inspector-768-light-exploded-z1-middle-t1` | 325 | base-unstable (px ok, dom) | `FAIL / FAIL` | 44 |
| `fixture-a-1440-dark-exploded-z4-middle-t3` | 278 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `websocket-inspector-768-light-exploded-z3-middle-t1` | 266 | base-unstable (px ok, dom) | `FAIL / FAIL` | 34 |
| `websocket-inspector-768-light-exploded-z3-middle-t2` | 265 | base-unstable (px ok, dom) | `FAIL / FAIL` | 34 |
| `fixture-a-1440-light-exploded-z4-middle-t1` | 254 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `fixture-a-1440-dark-exploded-z4-middle-t2` | 251 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `jev-toolkit-390-dark-exploded-z4-middle-t1` | 234 | base-unstable (px ok, dom) | `FAIL / FAIL` | 38 |
| `fixture-b-390-dark-exploded-z1-middle-t2` | 200 | base-unstable (px ok, dom) | `FAIL / FAIL` | 20 |
| `fixture-c-1440-light-exploded-z3-middle-t2` | 170 | base-unstable (px ok, dom) | `FAIL / FAIL` | 31 |
| `fixture-c-390-light-exploded-z3-middle-t1` | 163 | base-unstable (px ok, dom) | `FAIL / FAIL` | 27 |
| `fixture-c-768-light-exploded-z1-middle-t2` | 124 | base-unstable (px ok, dom) | `FAIL / FAIL` | 38 |
| `fixture-c-1440-dark-exploded-z2-middle-t2` | 97 | base-unstable (px ok, dom) | `FAIL / FAIL` | 36 |
| `fixture-a-768-light-exploded-z3-middle-t1` | 82 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `fixture-a-768-dark-exploded-z3-middle-t2` | 77 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `fixture-b-768-light-exploded-z5-middle-t2` | 71 | base-unstable (px ok, dom) | `FAIL / FAIL` | 14 |
| `fixture-b-1440-dark-exploded-z3-middle-t2` | 67 | base-unstable (px ok, dom) | `FAIL / FAIL` | 14 |
| `websocket-inspector-390-light-exploded-z3-middle-t3` | 33 | base-unstable (px ok, dom) | `FAIL / FAIL` | 30 |
| `fixture-b-1440-dark-exploded-z5-middle-t1` | 21 | base-unstable (px ok, dom) | `FAIL / FAIL` | 14 |
| `fixture-a-1440-light-exploded-z3-middle-t2` | 11 | base-unstable (px ok, dom) | `FAIL / FAIL` | 19 |
| `jev-toolkit-1440-light-exploded-z2-middle-t1` | 11 | base-unstable (px ok, dom) | `FAIL / FAIL` | 48 |
| `jev-toolkit-1440-light-exploded-z2-middle-t3` | 11 | base-unstable (px ok, dom) | `FAIL / FAIL` | 49 |
| `jev-toolkit-390-light-exploded-z3-middle-t3` | 9 | base-unstable (px ok, dom) | `FAIL / FAIL` | 39 |
| `fixture-c-1440-light-exploded-z4-middle-t2` | 8 | base-unstable (px ok, dom) | `FAIL / FAIL` | 31 |
| `fixture-c-390-dark-exploded-z5-middle-t2` | 1 | base-unstable (px ok, dom) | `FAIL / FAIL` | 26 |
| `jev-toolkit-768-dark-exploded-z5-middle-t1` | 1 | base-unstable (px ok, dom) | `FAIL / FAIL` | 36 |
| `fixture-a-768-light-exploded-z5-top-t0` | 0 | stable | `FAIL / FAIL` | 0 |
| `fixture-b-390-dark-exploded-z3-top-t0` | 0 | stable | `FAIL / FAIL` | 1 |
| `fixture-c-1440-light-exploded-z1-top-t0` | 0 | stable | `FAIL / FAIL` | 0 |
| `fixture-c-768-light-exploded-z3-bottom-t3` | 0 | stable | `FAIL / FAIL` | 1 |
| `jev-toolkit-390-light-exploded-z1-top-t0` | 0 | stable | `FAIL / FAIL` | 0 |
| `websocket-inspector-1440-dark-exploded-z2-top-t0` | 0 | stable | `FAIL / FAIL` | 0 |
| `websocket-inspector-1440-dark-exploded-z4-top-t0` | 0 | stable | `FAIL / FAIL` | 0 |

## `jev-toolkit-390-light-exploded-z0-n-a-t3`
- Pixels: **9627** (212 diff clusters); base stability: `stable`.
- DOM first differing number (token 6): `0` -> `0.0097361`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 588.796875`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0097361px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 58`
- Label keys differing (49): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `dimension:footprint`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `layer:evidence`, `layer:surface`, `model-router`, `part:accuracy-cli`, `part:bench-cli`, `part:comment-policy`, `part:dyn-context`, `part:fixtures`, `part:gold`, `part:handback`, `part:installer`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:report-cli`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `target-guard`, `task-model`, `token-budget`

## `fixture-c-768-dark-exploded-z0-n-a-t3`
- Pixels: **8753** (204 diff clusters); base stability: `stable`.
- DOM first differing number (token 6): `0` -> `0.0095972`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612.390625`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0095972px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 61`
- Label keys differing (36): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `dimension:footprint`, `dimension:stack`, `edge`, `layer:client`, `layer:edge`, `layer:external`, `layer:services`, `layer:storage`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-hardware`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:pickup-app`, `part:push-gateway`, `part:recipient`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `session-gate`, `slot-planner`, `storage`

## `fixture-c-768-dark-exploded-z0-n-a-t0`
- Pixels: **8477** (189 diff clusters); base stability: `stable`.
- DOM first differing number (token 6): `0` -> `0.0099129`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612.390625`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0099129px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 61`
- Label keys differing (37): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `dimension:footprint`, `dimension:stack`, `edge`, `external`, `layer:client`, `layer:edge`, `layer:external`, `layer:services`, `layer:storage`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-hardware`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:pickup-app`, `part:push-gateway`, `part:recipient`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `session-gate`, `slot-planner`, `storage`

## `websocket-inspector-1440-dark-exploded-z4-middle-t3`
- Pixels: **4047** (112 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.185313` -> `0.180502`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.185313px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" sty`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.180502px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" sty`
- Label keys differing (33): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:scarlet-inspector`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `websocket-inspector-768-dark-exploded-z1-middle-t3`
- Pixels: **3792** (111 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.29` -> `-0.297175`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.29px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" style="p`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.297175px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (44): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:footprint`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:host`, `layer:inspection-ui`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:detail-screen`, `part:financial-api`, `part:frame-row`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:inspector-ui`, `part:list-screen`, `part:main-activity`, `part:scarlet-inspector`, `part:session-tracker`, `part:stream-adapter`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `websocket-inspector-1440-light-exploded-z5-middle-t1`
- Pixels: **3719** (115 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.48` -> `-0.484913`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.48px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" style=`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.484913px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" st`
- Label keys differing (31): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-service`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `fixture-a-768-light-exploded-z1-middle-t2`
- Pixels: **3532** (43 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.301016` -> `0.29316`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.301016px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.29316px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612.`
- Label keys differing (26): `beachgoer`, `data`, `dimension:footprint`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:platform`, `layer:state`, `layer:ui`, `live-tide-client`, `part:beachgoer`, `part:forecast-details-panel`, `part:live-tide-client`, `part:tide-cache`, `part:tide-chart-screen`, `part:tide-feed`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-a-768-dark-exploded-z4-middle-t2`
- Pixels: **2794** (113 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.264457` -> `-0.270605`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.264457px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 61`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.270605px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 61`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-a-1440-light-exploded-z1-middle-t1`
- Pixels: **2654** (85 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.49` -> `0.482921`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.49px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" style="`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.482921px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
- Label keys differing (26): `beachgoer`, `data`, `dimension:footprint`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:platform`, `layer:state`, `layer:ui`, `live-tide-client`, `part:beachgoer`, `part:forecast-details-panel`, `part:live-tide-client`, `part:tide-cache`, `part:tide-chart-screen`, `part:tide-feed`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-a-390-dark-exploded-z1-middle-t2`
- Pixels: **2501** (54 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0389843` -> `-0.0466972`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0389843px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0466972px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
- Label keys differing (26): `beachgoer`, `data`, `dimension:footprint`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:platform`, `layer:state`, `layer:ui`, `live-tide-client`, `part:beachgoer`, `part:forecast-details-panel`, `part:live-tide-client`, `part:tide-cache`, `part:tide-chart-screen`, `part:tide-feed`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-a-390-light-exploded-z1-middle-t1`
- Pixels: **2064** (38 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0389843` -> `-0.0462788`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0389843px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0462788px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
- Label keys differing (26): `beachgoer`, `data`, `dimension:footprint`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:platform`, `layer:state`, `layer:ui`, `live-tide-client`, `part:beachgoer`, `part:forecast-details-panel`, `part:live-tide-client`, `part:tide-cache`, `part:tide-chart-screen`, `part:tide-feed`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `websocket-inspector-768-light-exploded-z2-middle-t1`
- Pixels: **1982** (66 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.1525` -> `-0.161412`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.1525px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" style=`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.161412px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (38): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:inspection-ui`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:list-screen`, `part:main-activity`, `part:scarlet-inspector`, `part:session-tracker`, `part:stream-adapter`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `fixture-c-768-dark-imploded-z0-n-a-t3`
- Pixels: **1915** (91 diff clusters); base stability: `stable`.
- DOM first differing number (token 6): `0` -> `0.0099129`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612.390625`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0099129px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 61`
- Label keys differing (14): `audit-trail`, `booking-service`, `dead-letter-store`, `locker-hardware`, `locker-registry`, `notifier`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `session-gate`, `slot-planner`, `titleblock`

## `jev-toolkit-768-light-exploded-z3-middle-t2`
- Pixels: **1768** (38 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.0193749` -> `0.0188012`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0193749px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0188012px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (42): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `model-router`, `part:comment-policy`, `part:dyn-context`, `part:handback`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `websocket-inspector-768-light-exploded-z4-middle-t2`
- Pixels: **1521** (82 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0157812` -> `-0.021033`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0157812px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" sty`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.021033px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (33): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-notification`, `part:inspector-service`, `part:scarlet-inspector`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `jev-toolkit-768-dark-exploded-z4-bottom-t1`
- Pixels: **1227** (2 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 15): `-128.4901097074466` -> `-128.49010970744678`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="22.715747126016545,-128.4901097074466 22.715747126016545,908.245262632979" fill="none" stroke="#8FA3B8" strok`
  - head: `<polyline data-xploder-stroke="stack-rail" points="22.715747126016545,-128.49010970744678 22.715747126016545,908.245262632979" fill="none" stroke="#8FA3B8" stro`
- Label keys differing (39): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:footprint`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:core`, `layer:decision`, `layer:evidence`, `model-router`, `part:fixtures`, `part:gold`, `part:judge`, `part:pricing`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `jev-toolkit-768-dark-exploded-z4-bottom-t3`
- Pixels: **1227** (2 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 15): `-128.49010970744712` -> `-128.49010970744683`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="22.715747126016545,-128.49010970744712 22.715747126016545,908.2452626329787" fill="none" stroke="#8FA3B8" str`
  - head: `<polyline data-xploder-stroke="stack-rail" points="22.715747126016545,-128.49010970744683 22.715747126016545,908.2452626329789" fill="none" stroke="#8FA3B8" str`
- Label keys differing (39): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:footprint`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:core`, `layer:decision`, `layer:evidence`, `model-router`, `part:fixtures`, `part:gold`, `part:judge`, `part:path-guard`, `part:pricing`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `fixture-a-768-dark-exploded-z5-middle-t1`
- Pixels: **1047** (52 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.408125` -> `0.400392`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.408125px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.400392px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
- Label keys differing (16): `beachgoer`, `data`, `forecast-details-panel`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `websocket-inspector-390-dark-exploded-z4-middle-t1`
- Pixels: **1031** (27 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.452108` -> `0.45119`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.452108px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 588`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.45119px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 588.`
- Label keys differing (30): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:scarlet-inspector`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `jev-toolkit-1440-light-exploded-z1-middle-t2`
- Pixels: **1029** (13 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0601504` -> `-0.0600275`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0601504px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" s`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0600275px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" s`
- Label keys differing (52): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:footprint`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `layer:evidence`, `layer:surface`, `model-router`, `part:accuracy-cli`, `part:bench-cli`, `part:comment-policy`, `part:dyn-context`, `part:fixtures`, `part:gold`, `part:handback`, `part:installer`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:report-cli`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `jev-toolkit-768-dark-exploded-z3-middle-t3`
- Pixels: **935** (20 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.0193749` -> `0.0198768`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0193749px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0198768px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (42): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `model-router`, `part:comment-policy`, `part:dyn-context`, `part:handback`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `fixture-b-390-light-exploded-z5-middle-t2`
- Pixels: **777** (20 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.311875` -> `-0.314026`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.311875px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 50`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.314026px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 50`
- Label keys differing (11): `column-normalizer`, `ingest`, `ledger-validator`, `normalize`, `part:column-normalizer`, `part:ledger-validator`, `partner-csv-drop`, `reconciliation-ledger`, `report`, `settlement-operator`, `validate`

## `fixture-c-390-dark-exploded-z1-bottom-t0`
- Pixels: **668** (5 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 15): `54.13324915609646` -> `54.13324915609643`.
  - base: `><polyline data-xploder-stroke="stack-rail" points="49.64704311082521,54.13324915609646 49.64704311082521,435.52190504807686" fill="none" stroke="#8FA3B8" strok`
  - head: `><polyline data-xploder-stroke="stack-rail" points="49.64704311082521,54.13324915609643 49.64704311082521,435.5219050480768" fill="none" stroke="#8FA3B8" stroke`
- Label keys differing (1): `dimension:footprint`

## `fixture-c-768-light-exploded-z4-bottom-t1`
- Pixels: **658** (4 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 15): `-112.08851651005943` -> `-112.08851651005949`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="63.089015249064474,-112.08851651005943 63.089015249064474,792.3089516197992" fill="none" stroke="#56677A" str`
  - head: `<polyline data-xploder-stroke="stack-rail" points="63.089015249064474,-112.08851651005949 63.089015249064474,792.3089516197992" fill="none" stroke="#56677A" str`
- Label keys differing (2): `dimension:stack`, `layer:services`

## `fixture-c-768-light-exploded-z4-bottom-t3`
- Pixels: **658** (4 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 15): `-112.08851651005972` -> `-112.08851651005966`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="63.089015249064474,-112.08851651005972 63.089015249064474,792.308951619799" fill="none" stroke="#56677A" stro`
  - head: `<polyline data-xploder-stroke="stack-rail" points="63.089015249064474,-112.08851651005966 63.089015249064474,792.308951619799" fill="none" stroke="#56677A" stro`
- Label keys differing (3): `dimension:stack`, `layer:services`, `part:slot-planner`

## `fixture-a-390-dark-exploded-z4-middle-t3`
- Pixels: **428** (4 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.353356` -> `0.352472`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.353356px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 504`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.352472px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 504`
- Label keys differing (16): `beachgoer`, `data`, `forecast-details-panel`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `jev-toolkit-1440-light-exploded-z1-middle-t1`
- Pixels: **347** (6 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.06` -> `-0.0598495`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.06px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" style=`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0598495px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" s`
- Label keys differing (52): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:footprint`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `layer:evidence`, `layer:surface`, `model-router`, `part:accuracy-cli`, `part:bench-cli`, `part:comment-policy`, `part:dyn-context`, `part:fixtures`, `part:gold`, `part:handback`, `part:installer`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:report-cli`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `websocket-inspector-390-light-exploded-z1-bottom-t0`
- Pixels: **331** (5 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 51): `295.7900562370285` -> `295.7900562370286`.
  - base: `><polyline data-xploder-stroke="stack-tick" points="46.05175217819532,295.7900562370285 40.39489792870294,301.44691048652095" fill="none" stroke="#56677A" strok`
  - head: `><polyline data-xploder-stroke="stack-tick" points="46.05175217819532,295.7900562370286 40.39489792870294,301.446910486521" fill="none" stroke="#56677A" stroke-`
- Label keys differing (1): `dimension:footprint`

## `websocket-inspector-768-light-exploded-z1-middle-t1`
- Pixels: **325** (11 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.298043` -> `-0.298773`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.298043px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.298773px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (44): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:footprint`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:host`, `layer:inspection-ui`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:detail-screen`, `part:financial-api`, `part:frame-row`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:inspector-ui`, `part:list-screen`, `part:main-activity`, `part:scarlet-inspector`, `part:session-tracker`, `part:stream-adapter`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `fixture-a-1440-dark-exploded-z4-middle-t3`
- Pixels: **278** (11 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.299844` -> `-0.300692`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.299844px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.300692px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `websocket-inspector-768-light-exploded-z3-middle-t1`
- Pixels: **266** (18 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.0186208` -> `0.0193749`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0186208px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0193749px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (34): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:scarlet-inspector`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `websocket-inspector-768-light-exploded-z3-middle-t2`
- Pixels: **265** (19 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.0193749` -> `0.0187288`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0193749px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.0187288px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (34): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `dimension:stack`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `layer:capture`, `layer:delivery`, `layer:persistence`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:scarlet-inspector`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `fixture-a-1440-light-exploded-z4-middle-t1`
- Pixels: **254** (9 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.299844` -> `-0.300597`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.299844px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.300597px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-a-1440-dark-exploded-z4-middle-t2`
- Pixels: **251** (9 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.299844` -> `-0.300682`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.299844px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.300682px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `jev-toolkit-390-dark-exploded-z4-middle-t1`
- Pixels: **234** (15 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.452108` -> `0.453436`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.452108px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 588`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.453436px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 588`
- Label keys differing (38): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `model-router`, `part:comment-policy`, `part:dyn-context`, `part:handback`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `fixture-b-390-dark-exploded-z1-middle-t2`
- Pixels: **200** (13 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0389843` -> `-0.0401566`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0389843px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0401566px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
- Label keys differing (20): `column-normalizer`, `dimension:footprint`, `dimension:stack`, `ingest`, `layer:ingest`, `layer:normalize`, `layer:report`, `layer:validate`, `ledger-validator`, `normalize`, `part:column-normalizer`, `part:ledger-validator`, `part:partner-csv-drop`, `part:reconciliation-ledger`, `part:settlement-operator`, `partner-csv-drop`, `reconciliation-ledger`, `report`, `settlement-operator`, `validate`

## `fixture-c-1440-light-exploded-z3-middle-t2`
- Pixels: **170** (4 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.368125` -> `0.367904`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.368125px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.367904px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
- Label keys differing (31): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `dimension:stack`, `edge`, `external`, `layer:edge`, `layer:services`, `layer:storage`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `services`, `session-gate`, `slot-planner`, `storage`

## `fixture-c-390-light-exploded-z3-middle-t1`
- Pixels: **163** (13 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0861279` -> `-0.0852954`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0861279px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0852954px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 5`
- Label keys differing (27): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `edge`, `external`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `services`, `session-gate`, `slot-planner`, `storage`

## `fixture-c-768-light-exploded-z1-middle-t2`
- Pixels: **124** (5 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.300773` -> `0.301016`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.300773px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.301016px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
- Label keys differing (38): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `dimension:footprint`, `dimension:stack`, `edge`, `external`, `layer:client`, `layer:edge`, `layer:external`, `layer:services`, `layer:storage`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-hardware`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:pickup-app`, `part:push-gateway`, `part:recipient`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `services`, `session-gate`, `slot-planner`, `storage`

## `fixture-c-1440-dark-exploded-z2-middle-t2`
- Pixels: **97** (5 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.1025` -> `0.102407`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.1025px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" style`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.102407px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
- Label keys differing (36): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `dimension:stack`, `edge`, `external`, `layer:client`, `layer:edge`, `layer:external`, `layer:services`, `layer:storage`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-hardware`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:push-gateway`, `part:recipient`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `services`, `session-gate`, `slot-planner`, `storage`

## `fixture-a-768-light-exploded-z3-middle-t1`
- Pixels: **82** (2 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.147622` -> `0.146724`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.147622px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.146724px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-a-768-dark-exploded-z3-middle-t2`
- Pixels: **77** (3 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.147622` -> `0.146936`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.147622px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.146936px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `fixture-b-768-light-exploded-z5-middle-t2`
- Pixels: **71** (4 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.408125` -> `0.407393`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.408125px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.407393px);"><svg aria-hidden="true" width="702" height="612.390625" viewBox="0 0 702 612`
- Label keys differing (14): `column-normalizer`, `dimension:stack`, `ingest`, `layer:normalize`, `layer:validate`, `ledger-validator`, `normalize`, `part:column-normalizer`, `part:ledger-validator`, `partner-csv-drop`, `reconciliation-ledger`, `report`, `settlement-operator`, `validate`

## `fixture-b-1440-dark-exploded-z3-middle-t2`
- Pixels: **67** (5 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.367826` -> `0.367673`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.367826px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.367673px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
- Label keys differing (14): `column-normalizer`, `dimension:stack`, `ingest`, `layer:normalize`, `layer:validate`, `ledger-validator`, `normalize`, `part:column-normalizer`, `part:ledger-validator`, `partner-csv-drop`, `reconciliation-ledger`, `report`, `settlement-operator`, `validate`

## `websocket-inspector-390-light-exploded-z3-middle-t3`
- Pixels: **33** (1 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.297251` -> `-0.298019`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.297251px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 58`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.298019px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 58`
- Label keys differing (30): `capture`, `chucker-factory`, `chucker-socket`, `delivery`, `detail-screen`, `financial-api`, `frame-row`, `host`, `inspection-ui`, `inspector-dao`, `inspector-database`, `inspector-launcher`, `inspector-notification`, `inspector-service`, `inspector-ui`, `list-screen`, `main-activity`, `part:chucker-factory`, `part:chucker-socket`, `part:inspector-dao`, `part:inspector-database`, `part:inspector-launcher`, `part:inspector-notification`, `part:inspector-service`, `part:scarlet-inspector`, `part:session-tracker`, `persistence`, `scarlet-inspector`, `session-tracker`, `stream-adapter`

## `fixture-b-1440-dark-exploded-z5-middle-t1`
- Pixels: **21** (21 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.0799999` -> `-0.07954`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.0799999px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" s`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.07954px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
- Label keys differing (14): `column-normalizer`, `dimension:stack`, `ingest`, `layer:normalize`, `layer:validate`, `ledger-validator`, `normalize`, `part:column-normalizer`, `part:ledger-validator`, `partner-csv-drop`, `reconciliation-ledger`, `report`, `settlement-operator`, `validate`

## `fixture-a-1440-light-exploded-z3-middle-t2`
- Pixels: **11** (2 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.368125` -> `0.367438`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.368125px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.367438px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" sty`
- Label keys differing (19): `beachgoer`, `data`, `dimension:stack`, `forecast-details-panel`, `layer:data`, `layer:state`, `live-tide-client`, `part:live-tide-client`, `part:tide-cache`, `part:tide-repository`, `part:tide-view-model`, `platform`, `state`, `tide-cache`, `tide-chart-screen`, `tide-feed`, `tide-repository`, `tide-view-model`, `ui`

## `jev-toolkit-1440-light-exploded-z2-middle-t1`
- Pixels: **11** (1 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.365` -> `0.365359`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.365px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" style=`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.365359px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" sty`
- Label keys differing (48): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `layer:surface`, `model-router`, `part:bench-cli`, `part:comment-policy`, `part:dyn-context`, `part:fixtures`, `part:handback`, `part:installer`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:report-cli`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `jev-toolkit-1440-light-exploded-z2-middle-t3`
- Pixels: **11** (1 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `0.365206` -> `0.365`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.365206px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" sty`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(0.365px);"><svg aria-hidden="true" width="1086" height="628" viewBox="0 0 1086 628" style=`
- Label keys differing (49): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dimension:stack`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `layer:arms`, `layer:core`, `layer:decision`, `layer:surface`, `model-router`, `part:accuracy-cli`, `part:bench-cli`, `part:comment-policy`, `part:dyn-context`, `part:fixtures`, `part:gold`, `part:handback`, `part:installer`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:reports`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `jev-toolkit-390-light-exploded-z3-middle-t3`
- Pixels: **9** (9 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.296488` -> `-0.297251`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.296488px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 58`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.297251px);"><svg aria-hidden="true" width="348" height="588.796875" viewBox="0 0 348 58`
- Label keys differing (39): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `model-router`, `part:comment-policy`, `part:dyn-context`, `part:gold`, `part:handback`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:runner`, `part:target-guard`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `fixture-c-1440-light-exploded-z4-middle-t2`
- Pixels: **8** (2 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.299844` -> `-0.300292`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.299844px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.300292px);"><svg aria-hidden="true" width="1150" height="538" viewBox="0 0 1150 538" st`
- Label keys differing (31): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `dimension:stack`, `edge`, `external`, `layer:edge`, `layer:services`, `layer:storage`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:retry-scheduler`, `part:session-gate`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `services`, `session-gate`, `slot-planner`, `storage`

## `fixture-c-390-dark-exploded-z5-middle-t2`
- Pixels: **1** (1 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.311875` -> `-0.312828`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.311875px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 50`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.312828px);"><svg aria-hidden="true" width="356" height="504.390625" viewBox="0 0 356 50`
- Label keys differing (26): `audit-trail`, `booking-service`, `client`, `dead-letter-store`, `edge`, `external`, `locker-hardware`, `locker-registry`, `notifier`, `part:audit-trail`, `part:booking-service`, `part:dead-letter-store`, `part:locker-registry`, `part:notifier`, `part:pickup-api`, `part:retry-scheduler`, `part:slot-planner`, `pickup-api`, `pickup-app`, `push-gateway`, `recipient`, `retry-scheduler`, `services`, `session-gate`, `slot-planner`, `storage`

## `jev-toolkit-768-dark-exploded-z5-middle-t1`
- Pixels: **1** (1 diff clusters); base stability: `base-unstable (px ok, dom)`.
- DOM first differing number (token 6): `-0.32` -> `-0.319821`.
  - base: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.32px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" style="p`
  - head: `bsolute; inset: 0px; transform-origin: 0px 0px; transform: translateY(-0.319821px);"><svg aria-hidden="true" width="702" height="702" viewBox="0 0 702 702" styl`
- Label keys differing (36): `accuracy-cli`, `arms`, `bench-cli`, `comment-policy`, `core`, `decision`, `dyn-context`, `evidence`, `fixtures`, `gold`, `handback`, `installer`, `jev-client`, `judge`, `model-router`, `part:dyn-context`, `part:handback`, `part:jev-client`, `part:judge`, `part:model-router`, `part:path-guard`, `part:pricing`, `part:recorder`, `part:runner`, `part:task-model`, `part:token-budget`, `path-guard`, `pricing`, `recorder`, `report-cli`, `reports`, `runner`, `surface`, `target-guard`, `task-model`, `token-budget`

## `fixture-a-768-light-exploded-z5-top-t0`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 15): `-215.77763786764535` -> `-215.77763786764513`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="-26.00272399919625,-215.77763786764535 -26.00272399919625,854.1048069852956" fill="none" stroke="#56677A" str`
  - head: `<polyline data-xploder-stroke="stack-rail" points="-26.00272399919625,-215.77763786764513 -26.00272399919625,854.1048069852956" fill="none" stroke="#56677A" str`
- Label keys differing (0): (none)

## `fixture-b-390-dark-exploded-z3-top-t0`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 15): `-66.15059281241315` -> `-66.15059281241312`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="-0.847506196467565,-66.15059281241315 -0.847506196467565,539.3488236319466" fill="none" stroke="#8FA3B8" stro`
  - head: `<polyline data-xploder-stroke="stack-rail" points="-0.847506196467565,-66.15059281241312 -0.847506196467565,539.3488236319467" fill="none" stroke="#8FA3B8" stro`
- Label keys differing (1): `part:settlement-operator`

## `fixture-c-1440-light-exploded-z1-top-t0`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 63): `360.01338956919807` -> `360.0133895691981`.
  - base: `<polyline data-xploder-stroke="stack-tick" points="441.72245111384024,360.01338956919807 436.0655968643478,365.6702438186905" fill="none" stroke="#56677A" strok`
  - head: `<polyline data-xploder-stroke="stack-tick" points="441.72245111384024,360.0133895691981 436.0655968643478,365.67024381869055" fill="none" stroke="#56677A" strok`
- Label keys differing (0): (none)

## `fixture-c-768-light-exploded-z3-bottom-t3`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 15): `-28.431750708047048` -> `-28.43175070804699`.
  - base: `><polyline data-xploder-stroke="stack-rail" points="118.2712121992518,-28.431750708047048 118.2712121992518,695.0862237958399" fill="none" stroke="#56677A" stro`
  - head: `><polyline data-xploder-stroke="stack-rail" points="118.2712121992518,-28.43175070804699 118.2712121992518,695.0862237958402" fill="none" stroke="#56677A" strok`
- Label keys differing (1): `part:retry-scheduler`

## `jev-toolkit-390-light-exploded-z1-top-t0`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 15): `63.19207050429615` -> `63.19207050429613`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="26.176188022218575,63.19207050429615 26.176188022218575,508.40345552884605" fill="none" stroke="#56677A" stro`
  - head: `<polyline data-xploder-stroke="stack-rail" points="26.176188022218575,63.19207050429613 26.176188022218575,508.403455528846" fill="none" stroke="#56677A" stroke`
- Label keys differing (0): (none)

## `websocket-inspector-1440-dark-exploded-z2-top-t0`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 15): `10.18088737201382` -> `10.18088737201375`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="372.64370805629363,10.18088737201382 372.64370805629363,629.071672354949" fill="none" stroke="#8FA3B8" stroke`
  - head: `<polyline data-xploder-stroke="stack-rail" points="372.64370805629363,10.18088737201375 372.64370805629363,629.0716723549489" fill="none" stroke="#8FA3B8" strok`
- Label keys differing (0): (none)

## `websocket-inspector-1440-dark-exploded-z4-top-t0`
- Pixels: **0** (0 diff clusters); base stability: `stable`.
- DOM first differing number (token 15): `-160.7173634812271` -> `-160.71736348122704`.
  - base: `<polyline data-xploder-stroke="stack-rail" points="283.56829383795815,-160.7173634812271 283.56829383795815,806.2994880546094" fill="none" stroke="#8FA3B8" stro`
  - head: `<polyline data-xploder-stroke="stack-rail" points="283.56829383795815,-160.71736348122704 283.56829383795815,806.2994880546094" fill="none" stroke="#8FA3B8" str`
- Label keys differing (0): (none)
