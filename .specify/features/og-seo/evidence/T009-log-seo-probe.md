# SEO probe

Site URL: https://hi-murphy.me
Export: /private/tmp/s11-wt/T009/apps/web/out
Expectation: /private/tmp/s11-wt/T009/apps/web/out-seo-expect.json
Result: PASS

## Per-route steps

| Route | 1 meta | 2 unfurl | 3 card | 4 sitemap | 5 JSON-LD | 6 hosts | Result |
|---|---|---|---|---|---|---|---|
| / | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects/websocket-inspector | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## Unfurl view

| Route | Title | Description | Image | Dimensions | Card | Result |
|---|---|---|---|---|---|---|
| / | Timur Haryo — Software Engineer · Android & Developer Tools | Android engineer at Stockbit & Bibit.id. Portfolio rendered as exploded architecture: real layers, real components, real numbers. | https://hi-murphy.me/og/home.png | 1200x630 | summary_large_image | PASS |
| /projects | Projects · Timur Haryo | Android engineer at Stockbit & Bibit.id. Portfolio rendered as exploded architecture: real layers, real components, real numbers. | https://hi-murphy.me/og/projects.png | 1200x630 | summary_large_image | PASS |
| /projects/websocket-inspector | Scarlet Inspector · Timur Haryo | Every WebSocket frame, captured and inspectable. | https://hi-murphy.me/og/projects/websocket-inspector.png | 1200x630 | summary_large_image | PASS |

## Cards and SHA-256

| Route | Image | Bytes | SHA-256 |
|---|---|---:|---|
| / | /og/home.png | 74310 | 56ae1db92d7d0affd771961ea6adfd5bec24b33140d8af945c38c126ecadc669 |
| /projects | /og/projects.png | 69640 | 53c61f75d8e14a30afac818daac98d429c016a96dd65f7b6bc6bd028fca91d22 |
| /projects/websocket-inspector | /og/projects/websocket-inspector.png | 79743 | 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3 |

## Build comparison

Compared with /tmp/s11-checks/seo-1/og-hashes.json: PASS

| Image | Build 1 | Build 2 | Result |
|---|---|---|---|
| /og/home.png | 56ae1db92d7d0affd771961ea6adfd5bec24b33140d8af945c38c126ecadc669 | 56ae1db92d7d0affd771961ea6adfd5bec24b33140d8af945c38c126ecadc669 | PASS |
| /og/projects.png | 53c61f75d8e14a30afac818daac98d429c016a96dd65f7b6bc6bd028fca91d22 | 53c61f75d8e14a30afac818daac98d429c016a96dd65f7b6bc6bd028fca91d22 | PASS |
| /og/projects/websocket-inspector.png | 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3 | 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3 | PASS |

## Every HTML file

| HTML | Route | Checks | Result |
|---|---|---:|---|
| /private/tmp/s11-wt/T009/apps/web/out/404.html | /404 | 9/9 | PASS |
| /private/tmp/s11-wt/T009/apps/web/out/_not-found.html | /_not-found | 9/9 | PASS |
| /private/tmp/s11-wt/T009/apps/web/out/index.html | / | 9/9 | PASS |
| /private/tmp/s11-wt/T009/apps/web/out/projects.html | /projects | 9/9 | PASS |
| /private/tmp/s11-wt/T009/apps/web/out/projects/websocket-inspector.html | /projects/websocket-inspector | 9/9 | PASS |

## Failures

None.
