# Pause behaviour probe (orchestrator, T004 review), preview 89db889, Playwright Chromium 156 / Firefox 157, 1440x900

## pause-settle (pause 1.5 s after loop start; frame equality vs previous sample)
chromium 156.0.8078.4 loop= paused 250ms 500ms= 1000ms= 1500ms= 2000ms= 3000ms= 4000ms= 5000ms= 7000ms= 10000ms=
firefox 157.0 loop= paused 250ms 500ms= 1000ms= 1500ms= 2000ms= 3000ms= 4000ms= 5000ms= 7000ms= 10000ms=

## pause-points (pause at +N ms after loop start; samples at +0.5/1.5/3.5/6 s after pause)
pause at +500ms phase=implode changes after pause at: none
pause at +2500ms phase=explode changes after pause at: 1500
pause at +4500ms phase=capture changes after pause at: none
pause at +6500ms phase=capture changes after pause at: none
pause at +8500ms phase=capture changes after pause at: none
pause at +10500ms phase=capture changes after pause at: none
pause at +12500ms phase=capture changes after pause at: none
pause at +14500ms phase=capture changes after pause at: none
pause at +16500ms phase=inspect changes after pause at: none
pause at +18500ms phase=inspect changes after pause at: none
pause at +20500ms phase=inspect changes after pause at: none
pause at +22500ms phase=inspect changes after pause at: none
