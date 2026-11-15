# T016 gate matrix | head 3b721fe | CI runs 43721368881 / 43721368882 (Vercel preview of PR #26) + local production export

## Lighthouse (mobile, median of 3, CI perf-gate job)
```
Lighthouse gate | performance: 0.99 >= 0.95 (median) pass
Lighthouse gate | lcp: 945.5360000000001 < 2500 (median) pass
Lighthouse gate | cls: 0, 0, 0 === 0 (every-run) pass
Lighthouse gate | accessibility: 1 >= 0.95 (median) pass
Lighthouse gate (project route) | performance: 1 >= 0.95 (median) pass
Lighthouse gate (project route) | lcp: 908.338 < 2500 (median) pass
Lighthouse gate (project route) | cls: 0, 0, 0 === 0 (every-run) pass
Lighthouse gate (project route) | accessibility: 1 >= 0.95 (median) pass
Lighthouse gate (projects) | performance: 1 >= 0.95 (median) pass
Lighthouse gate (projects) | lcp: 907.846 < 2500 (median) pass
Lighthouse gate (projects) | cls: 0, 0, 0 === 0 (every-run) pass
Lighthouse gate (projects) | accessibility: 1 >= 0.95 (median) pass
Lighthouse gate (project route: jev-toolkit) | performance: 1 >= 0.95 (median) pass
Lighthouse gate (project route: jev-toolkit) | lcp: 938.245 < 2500 (median) pass
Lighthouse gate (project route: jev-toolkit) | cls: 0, 0, 0 === 0 (every-run) pass
Lighthouse gate (project route: jev-toolkit) | accessibility: 1 >= 0.95 (median) pass
```
order of blocks: / , /projects/websocket-inspector (project route), /projects, /projects/jev-toolkit

## Weight (CI perf-gate weight)
mobile: 465689 bytes, 30 requests, PASS
desktop: 497675 bytes, 36 requests, PASS
mobile: 203328 bytes, 21 requests, PASS
desktop: 226892 bytes, 24 requests, PASS
mobile: 208907 bytes, 24 requests, PASS
desktop: 240908 bytes, 30 requests, PASS
mobile: 204137 bytes, 21 requests, PASS
desktop: 227697 bytes, 24 requests, PASS

## axe (CI a11y production routes)
axe-site home/light/desktop [/]: 3 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 32
axe-site home/light/mobile [/]: 3 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 32
axe-site home/dark/desktop [/]: 3 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 32
axe-site home/dark/mobile [/]: 3 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 32
axe-site projects/light/desktop [/projects]: 1 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 0
axe-site projects/light/mobile [/projects]: 1 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 0
axe-site projects/dark/desktop [/projects]: 1 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 0
axe-site projects/dark/mobile [/projects]: 1 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 0
axe-site project/light/desktop [/projects/websocket-inspector, /projects/jev-toolkit]: 12 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 362
axe-site project/light/mobile [/projects/websocket-inspector, /projects/jev-toolkit]: 12 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 513
axe-site project/dark/desktop [/projects/websocket-inspector, /projects/jev-toolkit]: 12 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 325
axe-site project/dark/mobile [/projects/websocket-inspector, /projects/jev-toolkit]: 12 states | serious 0 critical 0 moderate 0 minor 0 | incomplete 463
axe-site total: serious 0 critical 0 moderate 0 minor 0 | incomplete 1791

## local site-probe (production export): draws (2 draw calls), hero (eager reveal, zero interaction), reduced-motion, cls
draws project websocket-inspector: mode=2 rendered=32 total=32 PASS
draws project jev-toolkit: mode=2 rendered=32 total=32 PASS
draws hero: mode=2 rendered=40 total=40 PASS
PASS draws-project-websocket-inspector: expected 2 actual {"pass":true,"mode":2,"modeCount":32,"renderedFrames":32,"totalFrames":32,"counts":{"2":32}}
PASS draws-project-jev-toolkit: expected 2 actual {"pass":true,"mode":2,"modeCount":32,"renderedFrames":32,"totalFrames":32,"counts":{"2":32}}
PASS draws-hero: expected 2 actual {"pass":true,"mode":2,"modeCount":40,"renderedFrames":40,"totalFrames":40,"counts":{"2":40}}
draws: PASS (3 checks)
PASS hero-eager-no-interaction: expected {"liveState":"revealed","canvases":1,"ready":true} actual {"liveState":"revealed","canvases":1,"ready":true}
hero: PASS (8 checks)
reduced-motion: PASS (8 checks)
cls: PASS (19 checks)
site-probe: PASS
