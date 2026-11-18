# SEO probe

Site URL: https://hi-murphy.me
Export: <repo>/apps/web/out
Expectation: <repo>/apps/web/out-seo-expect.json
Result: PASS

## Per-route steps

| Route | 1 meta | 2 unfurl | 3 card | 4 sitemap | 5 JSON-LD | 6 hosts | Result |
|---|---|---|---|---|---|---|---|
| / | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects/websocket-inspector | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects/jev-toolkit | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects/agent-fleet | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## Unfurl view

| Route | Title | Description | Image | Dimensions | Card | Result |
|---|---|---|---|---|---|---|
| / | Timur Haryo — Software Engineer · Android & Developer Tools | Software engineer working on Android — trading, community, architecture, automation, and the performance work behind them. Every project, taken apart. | https://hi-murphy.me/og/home.png | 1200x630 | summary_large_image | PASS |
| /projects | Projects · Timur Haryo | Software engineer working on Android — trading, community, architecture, automation, and the performance work behind them. Every project, taken apart. | https://hi-murphy.me/og/projects.png | 1200x630 | summary_large_image | PASS |
| /projects/websocket-inspector | Scarlet Inspector · Timur Haryo | Every WebSocket frame, captured and inspectable. | https://hi-murphy.me/og/projects/websocket-inspector.png | 1200x630 | summary_large_image | PASS |
| /projects/jev-toolkit | JEV Benchmark · Timur Haryo | Measuring what an AI reads before it codes. | https://hi-murphy.me/og/projects/jev-toolkit.png | 1200x630 | summary_large_image | PASS |
| /projects/agent-fleet | Agent fleet · Timur Haryo | Two hosts, two human words. | https://hi-murphy.me/og/projects/agent-fleet.png | 1200x630 | summary_large_image | PASS |

## Cards and SHA-256

| Route | Image | Bytes | SHA-256 |
|---|---|---:|---|
| / | /og/home.png | 76058 | abc84e863be81f8a5ae51df0f5c09a34e07b954f68ce512c30be0f4f280b7d8d |
| /projects | /og/projects.png | 91496 | 141547c1c33751e43045f9e08ed1afd0b3aedced7fdabd4e9fdf684de61c3b8d |
| /projects/websocket-inspector | /og/projects/websocket-inspector.png | 79988 | 04dbd97c63eb96e26d8d0c946997ce34b26b628ce831248d8afd9f88726cd346 |
| /projects/jev-toolkit | /og/projects/jev-toolkit.png | 76530 | 94f9947d6cd48bb4eb29aa988602c8a297ad01b32af2b2687c251ec493b13abe |
| /projects/agent-fleet | /og/projects/agent-fleet.png | 71408 | c4e718dd447617af52853aab0d186441c60e2663a781ad19542b255a591d5924 |

## Build comparison

Compared with <repo>/.evidence/s19/seo/build-1/og-hashes.json: PASS

| Image | Build 1 | Build 2 | Result |
|---|---|---|---|
| /og/home.png | abc84e863be81f8a5ae51df0f5c09a34e07b954f68ce512c30be0f4f280b7d8d | abc84e863be81f8a5ae51df0f5c09a34e07b954f68ce512c30be0f4f280b7d8d | PASS |
| /og/projects.png | 141547c1c33751e43045f9e08ed1afd0b3aedced7fdabd4e9fdf684de61c3b8d | 141547c1c33751e43045f9e08ed1afd0b3aedced7fdabd4e9fdf684de61c3b8d | PASS |
| /og/projects/websocket-inspector.png | 04dbd97c63eb96e26d8d0c946997ce34b26b628ce831248d8afd9f88726cd346 | 04dbd97c63eb96e26d8d0c946997ce34b26b628ce831248d8afd9f88726cd346 | PASS |
| /og/projects/jev-toolkit.png | 94f9947d6cd48bb4eb29aa988602c8a297ad01b32af2b2687c251ec493b13abe | 94f9947d6cd48bb4eb29aa988602c8a297ad01b32af2b2687c251ec493b13abe | PASS |
| /og/projects/agent-fleet.png | c4e718dd447617af52853aab0d186441c60e2663a781ad19542b255a591d5924 | c4e718dd447617af52853aab0d186441c60e2663a781ad19542b255a591d5924 | PASS |

## Every HTML file

| HTML | Route | Checks | Result |
|---|---|---:|---|
| <repo>/apps/web/out/404.html | /404 | 9/9 | PASS |
| <repo>/apps/web/out/_not-found.html | /_not-found | 9/9 | PASS |
| <repo>/apps/web/out/index.html | / | 9/9 | PASS |
| <repo>/apps/web/out/projects.html | /projects | 9/9 | PASS |
| <repo>/apps/web/out/projects/agent-fleet.html | /projects/agent-fleet | 9/9 | PASS |
| <repo>/apps/web/out/projects/jev-toolkit.html | /projects/jev-toolkit | 9/9 | PASS |
| <repo>/apps/web/out/projects/websocket-inspector.html | /projects/websocket-inspector | 9/9 | PASS |

## Failures

None.
