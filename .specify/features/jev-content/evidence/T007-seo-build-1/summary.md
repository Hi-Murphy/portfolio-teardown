# SEO probe

Site URL: https://hi-murphy.me
Export: ./apps/web/out
Expectation: ./apps/web/out-seo-expect.json
Result: PASS

## Per-route steps

| Route | 1 meta | 2 unfurl | 3 card | 4 sitemap | 5 JSON-LD | 6 hosts | Result |
|---|---|---|---|---|---|---|---|
| / | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects/websocket-inspector | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /projects/jev-toolkit | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## Unfurl view

| Route | Title | Description | Image | Dimensions | Card | Result |
|---|---|---|---|---|---|---|
| / | Timur Haryo — Software Engineer · Android & Developer Tools | Android engineer building community features and the performance work behind them. Every project, taken apart — layer by layer. | https://hi-murphy.me/og/home.png | 1200x630 | summary_large_image | PASS |
| /projects | Projects · Timur Haryo | Android engineer building community features and the performance work behind them. Every project, taken apart — layer by layer. | https://hi-murphy.me/og/projects.png | 1200x630 | summary_large_image | PASS |
| /projects/websocket-inspector | Scarlet Inspector · Timur Haryo | Every WebSocket frame, captured and inspectable. | https://hi-murphy.me/og/projects/websocket-inspector.png | 1200x630 | summary_large_image | PASS |
| /projects/jev-toolkit | JEV Benchmark · Timur Haryo | Measuring what an AI reads before it codes. | https://hi-murphy.me/og/projects/jev-toolkit.png | 1200x630 | summary_large_image | PASS |

## Cards and SHA-256

| Route | Image | Bytes | SHA-256 |
|---|---|---:|---|
| / | /og/home.png | 75554 | 312bead39820255a3b659b985a2c0aa20cc5f398670fc20575dfc617bb2f3a97 |
| /projects | /og/projects.png | 93278 | a5bd1ef656317599d07f90d19ff1acad0c8969fa219c7b4a84795c76a079baef |
| /projects/websocket-inspector | /og/projects/websocket-inspector.png | 79743 | 74e0a6099a11e544829d121cedf5175f980f2f44d0d87e6e39470eae4bed9cd3 |
| /projects/jev-toolkit | /og/projects/jev-toolkit.png | 76330 | 2231a0eb01e7553bc49472af4366dbf0cb4bb70ed2bfee489a1a9e4ec0f419c9 |

## Build comparison

First build; no comparison requested.

## Every HTML file

| HTML | Route | Checks | Result |
|---|---|---:|---|
| ./apps/web/out/404.html | /404 | 9/9 | PASS |
| ./apps/web/out/_not-found.html | /_not-found | 9/9 | PASS |
| ./apps/web/out/index.html | / | 9/9 | PASS |
| ./apps/web/out/projects.html | /projects | 9/9 | PASS |
| ./apps/web/out/projects/jev-toolkit.html | /projects/jev-toolkit | 9/9 | PASS |
| ./apps/web/out/projects/websocket-inspector.html | /projects/websocket-inspector | 9/9 | PASS |

## Failures

None.
