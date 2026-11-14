# Local run (preview + local export), run-checks.sh, head 89db889

## First run
| Id | Check | Exit | Result | Artifact |
| --- | --- | ---: | --- | --- |
| G1 | build, types, lint, tests | 0 | PASS | /tmp/s12-checks/T004-run/G1 |
| G3 | SEO meta + OG | 6 | FAIL | /tmp/s12-checks/T004-run/G3 |
| G4 | Lighthouse mobile performance + accessibility | 0 | PASS | /tmp/s12-checks/T004-run/G4 |
| G5 | CLS 0 | 0 | PASS | /tmp/s12-checks/T004-run/G5 |
| G6 | weight below 3 MB | 0 | PASS | /tmp/s12-checks/T004-run/G6 |
| G7 | axe serious + critical | 0 | PASS | /tmp/s12-checks/T004-run/G7 |
| G8 | fixture exclusion + route surface | 0 | PASS | /tmp/s12-checks/T004-run/G8 |
| G10 | two draw calls | 0 | PASS | /tmp/s12-checks/T004-run/G10 |
| G11 | projects main byte-identical | 0 | PASS | /tmp/s12-checks/T004-run/G11 |
| G12 | frozen surfaces + xploder tests | 0 | PASS | /tmp/s12-checks/T004-run/G12 |
| G13 | hero contract + eager loop | 0 | PASS | /tmp/s12-checks/T004-run/G13 |
| C1 | visible copy tests + home copy probe | 0 | PASS | /tmp/s12-checks/T004-run/C1 |
| C2-C4 | content integrity C2-C4 | 6 | FAIL | /tmp/s12-checks/T004-run/C2-C4 |
| AC5 | degraded modes + keyboard walk | 6 | FAIL | /tmp/s12-checks/T004-run/AC5 |
| D3 | desktop Chromium M1-M7 | 6 | FAIL | /tmp/s12-checks/T004-run/D3 |
| D5 | desktop Firefox M1-M7 | 6 | FAIL | /tmp/s12-checks/T004-run/D5 |
| guards | slice guards | 0 | PASS | /tmp/s12-checks/T004-run/guards |

## Re-run of harness-affected rows after T004 review fixes (G3 SITE_URL, C4 fragments, Save-Data Tab walk)
| Id | Check | Exit | Result | Artifact |
| --- | --- | ---: | --- | --- |
| G3 | SEO meta + OG | 0 | PASS | /tmp/s12-checks/T004-rerun/G3 |
| C2-C4 | content integrity C2-C4 | 6 | FAIL | /tmp/s12-checks/T004-rerun/C2-C4 |
| AC5 | degraded modes + keyboard walk | 6 | FAIL | /tmp/s12-checks/T004-rerun/AC5 |

## FAIL lines (first run)
FAIL C4-internal {"records":16,"failures":[{"href":"#main","path":"/_not-found.html","host":"https://portfolio-teardown-git-task-s12-m1-validation-murphy-3c4d.vercel.app","status":404,"expected":200},{"href":"#main","path":"/404.html","…
FAIL C4-external {"records":[{"href":"https://github.com/TimurHaryo","host":"https://github.com","status":200,"finalUrl":"https://github.com/TimurHaryo"},{"href":"https://id.linkedin.com/in/timurharyo","host":"https://id.linkedin.com","…
FAIL M2 {"pausedLoop":"paused","pausedIdentical":false,"playLabelVisible":true,"resumedLoop":"running","resumed":{"changed":true,"afterMs":1000}}
FAIL degraded-nojs-390-light-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-390-light-steps []
FAIL degraded-nojs-390-dark-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-390-dark-steps []
FAIL degraded-nojs-1440-light-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-1440-light-steps []
FAIL degraded-nojs-1440-dark-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-1440-dark-steps []
FAIL degraded-tab-savedata-390-home {"reached":15,"expected":16,"missing":["tab:15:button:Pause animation"],"repeated":null,"backwards":[],"invisibleFocus":[],"returnedToBody":true,"steps":[{"key":"tab:0:a:Skip to content","tag":"a","name":"Skip to conten…
FAIL / sitemap-robots: robots.txt contains "Sitemap: https://hi-murphy.me/sitemap.xml": lines=["User-Agent: *","Allow: /","Disallow: /dev/","","Sitemap: http://localhost:PORT/sitemap.xml"]
FAIL / host-leak: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT","source":"canonical","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT","source":"canonical","reason":"self URL origin http://localhost:PORT != https://hi-murphy.me"},{"value":"http://localhost:PORT","source":"og:url","reason":"blacklisted host local
FAIL /projects sitemap-robots: robots.txt contains "Sitemap: https://hi-murphy.me/sitemap.xml": lines=["User-Agent: *","Allow: /","Disallow: /dev/","","Sitemap: http://localhost:PORT/sitemap.xml"]
FAIL /projects host-leak: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT/projects","source":"canonical","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT/projects","source":"canonical","reason":"self URL origin http://localhost:PORT != https://hi-murphy.me"},{"value":"http://localhost:PORT/projects","source":"og:ur
FAIL /projects/websocket-inspector sitemap-robots: robots.txt contains "Sitemap: https://hi-murphy.me/sitemap.xml": lines=["User-Agent: *","Allow: /","Disallow: /dev/","","Sitemap: http://localhost:PORT/sitemap.xml"]
FAIL /projects/websocket-inspector host-leak: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT/projects/websocket-inspector","source":"canonical","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT/projects/websocket-inspector","source":"canonical","reason":"self URL origin http://localhost:PORT != https://hi-murphy.me
FAIL <local-path>/orca/workspaces/portfolio-teardown/task-s12-m1-validation/apps/web/out/404.html coverage: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT/og/home.png","source":"og:image","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT/og/home.png","source":"og:image","reason":"self URL origin http://localhost:PORT
FAIL <local-path>/orca/workspaces/portfolio-teardown/task-s12-m1-validation/apps/web/out/_not-found.html coverage: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT/og/home.png","source":"og:image","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT/og/home.png","source":"og:image","reason":"self URL origin http://loca
FAIL <local-path>/orca/workspaces/portfolio-teardown/task-s12-m1-validation/apps/web/out/index.html coverage: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT","source":"canonical","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT","source":"canonical","reason":"self URL origin http://localhost:PORT != https://hi-mu
FAIL <local-path>/orca/workspaces/portfolio-teardown/task-s12-m1-validation/apps/web/out/projects.html coverage: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT/projects","source":"canonical","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT/projects","source":"canonical","reason":"self URL origin http://localhost:
FAIL <local-path>/orca/workspaces/portfolio-teardown/task-s12-m1-validation/apps/web/out/projects/websocket-inspector.html coverage: every self URL uses the configured origin and all content URLs are verbatim: [{"value":"http://localhost:PORT/projects/websocket-inspector","source":"canonical","reason":"blacklisted host localhost"},{"value":"http://localhost:PORT/projects/websocket-inspector","sou
FAIL M2 {"pausedLoop":"paused","pausedIdentical":false,"playLabelVisible":true,"resumedLoop":"running","resumed":{"changed":true,"afterMs":1000}}

## FAIL lines (re-run)
FAIL C4-external {"records":[{"href":"https://github.com/TimurHaryo","host":"https://github.com","status":200,"finalUrl":"https://github.com/TimurHaryo"},{"href":"https://id.linkedin.com/in/timurharyo","host":"https://id.linkedin.com","…
FAIL degraded-nojs-390-light-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-390-light-steps []
FAIL degraded-nojs-390-dark-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-390-dark-steps []
FAIL degraded-nojs-1440-light-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-1440-light-steps []
FAIL degraded-nojs-1440-dark-poster {"poster":true,"flow":false,"lines":0}
FAIL degraded-nojs-1440-dark-steps []
