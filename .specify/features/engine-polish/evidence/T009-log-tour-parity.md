# T009 tour parity — node .specify/features/engine-polish/tour-timing.mjs --compare .specify/features/engine-polish/evidence/T001-log-tour-timing-base.txt /tmp/s14-checks/t009-tour.txt — commit a070122
| project | boundary | base median (ms) | after median (ms) | delta (ms) | verdict |
|---|---:|---:|---:|---:|---|
| jev-toolkit | 1 | 2.60 | 2.70 | 0.10 | PASS |
| jev-toolkit | 2 | 1606.00 | 1606.10 | 0.10 | PASS |
| jev-toolkit | 3 | 3205.70 | 3206.00 | 0.30 | PASS |
| jev-toolkit | 4 | 4804.90 | 4805.60 | 0.70 | PASS |
| jev-toolkit | 5 | 6405.80 | 6405.90 | 0.10 | PASS |
| jev-toolkit | 6 | 8005.70 | 8005.20 | -0.50 | PASS |
| jev-toolkit | 7 | 9605.40 | 9605.30 | -0.10 | PASS |
| jev-toolkit | 8 | 11205.30 | 11204.50 | -0.80 | PASS |
| websocket-inspector | 1 | 2.60 | 2.60 | 0.00 | PASS |
| websocket-inspector | 2 | 1605.60 | 1605.90 | 0.30 | PASS |
| websocket-inspector | 3 | 3205.90 | 3206.10 | 0.20 | PASS |
| websocket-inspector | 4 | 4805.70 | 4806.00 | 0.30 | PASS |
| websocket-inspector | 5 | 6404.60 | 6406.30 | 1.70 | PASS |
| websocket-inspector | 6 | 8004.80 | 8005.80 | 1.00 | PASS |
| websocket-inspector | 7 | 9605.20 | 9605.40 | 0.20 | PASS |
VERDICT PASS

# exit 0

# total duration supplement (median of 5 runs; tolerance 16.7 ms)
| project | base median total (ms) | after median total (ms) | delta (ms) | verdict |
|---|---:|---:|---:|---|
| jev-toolkit | 12804.40 | 12804.50 | 0.10 | PASS |
| websocket-inspector | 11204.80 | 11205.90 | 1.10 | PASS |
TOTAL VERDICT PASS
