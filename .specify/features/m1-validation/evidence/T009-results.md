# T009 — final local run (run-checks.sh --preview), head 5621f3f (product = e35e7de = ffda3a2 + I-01 fix)

| Id | Check | Exit | Result | Artifact |
| --- | --- | ---: | --- | --- |
| G1 | build, types, lint, tests | 0 | PASS | /tmp/s12-checks/T009-run/G1 |
| G3 | SEO meta + OG | 0 | PASS | /tmp/s12-checks/T009-run/G3 |
| G4 | Lighthouse mobile performance + accessibility | 0 | PASS | /tmp/s12-checks/T009-run/G4 |
| G5 | CLS 0 | 0 | PASS | /tmp/s12-checks/T009-run/G5 |
| G6 | weight below 3 MB | 0 | PASS | /tmp/s12-checks/T009-run/G6 |
| G7 | axe serious + critical + site:probe --ci (as CI a11y job) | 0 | PASS | /tmp/s12-checks/T009-run/G7 |
| G8 | fixture exclusion + route surface | 0 | PASS | /tmp/s12-checks/T009-run/G8 |
| G10 | two draw calls | 0 | PASS | /tmp/s12-checks/T009-run/G10 |
| G11 | projects main byte-identical | 0 | PASS | /tmp/s12-checks/T009-run/G11 |
| G12 | frozen surfaces + xploder tests | 0 | PASS | /tmp/s12-checks/T009-run/G12 |
| G13 | hero contract + eager loop | 0 | PASS | /tmp/s12-checks/T009-run/G13 |
| C1 | visible copy tests + home copy probe | 0 | PASS | /tmp/s12-checks/T009-run/C1 |
| C2-C4 | content integrity C2-C4 | 6 | FAIL | /tmp/s12-checks/T009-run/C2-C4 |
| AC5 | degraded modes + keyboard walk | 0 | PASS | /tmp/s12-checks/T009-run/AC5 |
| D3 | desktop Chromium M1-M7 | 0 | PASS | /tmp/s12-checks/T009-run/D3 |
| D5 | desktop Firefox M1-M7 | 0 | PASS | /tmp/s12-checks/T009-run/D5 |
| guards | slice guards | 0 | PASS | /tmp/s12-checks/T009-run/guards |

## FAIL lines
FAIL C4-external {"records":[{"href":"https://github.com/TimurHaryo","host":"https://github.com","status":200,"finalUrl":"https://github.com/TimurHaryo"},{"href":"https://id.linkedin.com/in/timurharyo","host":"https://id.linkedin.com","…

C4-external: LinkedIn 999 to automated Chromium only; closed by Murphy browser evidence (document 200 via authwall), RFC §11 P1 decisions, triage I-02.

## guards --final
OK frozen
OK product
OK surfaces
OK workflows
OK touch
