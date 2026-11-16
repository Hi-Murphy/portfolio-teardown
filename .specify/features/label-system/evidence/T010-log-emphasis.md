# command: node label-emphasis.mjs <repo> <baseUrl> --shots <dir> | target: http://127.0.0.1:4622/projects/jev-toolkit | chromium: 156.0.8078.4 | commit: c8794b2
# parts: A=bench-cli, B=jev-client; zoom 1; light/dark x 390x844 touch and 1440x900; CPU throttling n/a

| scheme | width | touch | step | A expected | A actual | B expected | B actual | highlight / selected | verdict |
|---|---:|---|---|---|---|---|---|---|---|
| light | 390 | yes | open A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| light | 390 | yes | hover B | — | — | — | — | — | n/a (touch) |
| light | 390 | yes | leave B | — | — | — | — | — | n/a (touch) |
| light | 390 | yes | close via Escape | — | — | — | — | null / null | PASS |
| light | 390 | yes | focus A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| light | 390 | yes | hover B after focus | — | — | — | — | — | n/a (touch) |
| light | 1440 | no | open A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| light | 1440 | no | hover B | selected | selected | hover | hover | jev-client / bench-cli | PASS |
| light | 1440 | no | leave B | selected | selected | — | — | null / bench-cli | PASS |
| light | 1440 | no | close via Escape | — | — | — | — | null / null | PASS |
| light | 1440 | no | focus A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| light | 1440 | no | focus A + hover B | selected | selected | hover | hover | jev-client / bench-cli | PASS |
| dark | 390 | yes | open A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| dark | 390 | yes | hover B | — | — | — | — | — | n/a (touch) |
| dark | 390 | yes | leave B | — | — | — | — | — | n/a (touch) |
| dark | 390 | yes | close via Escape | — | — | — | — | null / null | PASS |
| dark | 390 | yes | focus A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| dark | 390 | yes | hover B after focus | — | — | — | — | — | n/a (touch) |
| dark | 1440 | no | open A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| dark | 1440 | no | hover B | selected | selected | hover | hover | jev-client / bench-cli | PASS |
| dark | 1440 | no | leave B | selected | selected | — | — | null / bench-cli | PASS |
| dark | 1440 | no | close via Escape | — | — | — | — | null / null | PASS |
| dark | 1440 | no | focus A | hover selected | hover selected | — | — | bench-cli / bench-cli | PASS |
| dark | 1440 | no | focus A + hover B | selected | selected | hover | hover | jev-client / bench-cli | PASS |

emphasis: PASS
