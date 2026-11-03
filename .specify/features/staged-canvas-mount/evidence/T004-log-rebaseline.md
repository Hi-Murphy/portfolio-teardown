# T004 — AC1 re-baseline of S11.5 final

Date: 2026-11-03  
Product: `ec3e1b6`, product tree `66a021f` (`git diff --quiet 66a021f -- apps/web packages` passed).  
Protocol: Next.js 16.4.3 static export, Playwright Chromium 156.0.8078.4, mobile profile, 4× CPU, quiet host, one measurement at a time.  
Clean startup medians are the mean of two runs. The `home-move` clean pair was repeated after a 20.76% cost spread; all four raws are retained and r3/r4 is the accepted repeat.  
Raw artifacts are the `T004-*` files in this directory. Every trace is run 1 of its path/kind.

## 1. Per-path measurements

Cells are median (raw r1, raw r2). `n/a` means the source does not record that metric.

### home-move

| Source | Max long task (ms) | Long tasks | Dropped frames | Blocking (ms) | Main-thread cost (ms) |
|---|---:|---:|---:|---:|---:|
| perf:startup clean r1/r2 | 65.052 (69.130, 60.975) | 1 (1, 1) | n/a | 15.052 (19.130, 10.975) | 300.387 (331.567, 269.207) |
| perf:startup clean repeat r3/r4 | 58.785 (59.237, 58.332) | 1 (1, 1) | n/a | 8.785 (9.237, 8.332) | 268.433 (271.233, 265.633) |
| fps-engine startup r1/r2 | 57.724 (58.108, 57.341) | 1 (1, 1) | 1.0 (1.0, 1.0) | n/a | n/a |

The first `home-move` clean pair had a 20.76% main-thread-cost spread and was repeated; the repeat spread was 2.09%.

### project-move

| Source | Max long task (ms) | Long tasks | Dropped frames | Blocking (ms) | Main-thread cost (ms) |
|---|---:|---:|---:|---:|---:|
| perf:startup clean r1/r2 | 56.939 (56.639, 57.238) | 1 (1, 1) | n/a | 6.939 (6.639, 7.238) | 317.084 (322.927, 311.240) |
| fps-engine startup r1/r2 | 56.922 (57.335, 56.510) | 1 (1, 1) | 6.0 (6.0, 6.0) | n/a | n/a |

### project-click

| Source | Max long task (ms) | Long tasks | Dropped frames | Blocking (ms) | Main-thread cost (ms) |
|---|---:|---:|---:|---:|---:|
| perf:startup clean r1/r2 | 54.538 (53.610, 55.466) | 1 (1, 1) | n/a | 4.538 (3.610, 5.466) | 327.881 (335.000, 320.762) |
| fps-engine startup r1/r2 | 54.188 (54.388, 53.987) | 1 (1, 1) | 6.5 (6.0, 7.0) | n/a | n/a |

## 2. Drift vs S11.5 T013/T014

Baseline clean values use T013 clean r1/r2; baseline FPS values use T014 FPS r1/r2. T004 `home-move` clean uses the accepted repeat r3/r4. A delta above 20% in either direction is flagged.

| Path | Metric | T004 | S11.5 | Δ | Flag |
|---|---|---:|---:|---:|---|
| home-move | startup clean main-thread cost | 268.433 | 311.931 | -13.94% | no |
| home-move | startup clean max long task | 58.785 | 64.982 | -9.54% | no |
| home-move | startup clean blocking | 8.785 | 14.982 | -41.36% | FLAG >20% |
| home-move | startup clean long tasks | 1.000 | 1.000 | +0.00% | no |
| home-move | fps dropped frames | 1.000 | 2.000 | -50.00% | FLAG >20% |
| home-move | fps max long task | 57.724 | 69.029 | -16.38% | no |
| home-move | fps long tasks | 1.000 | 1.000 | +0.00% | no |
| project-move | startup clean main-thread cost | 317.084 | 325.607 | -2.62% | no |
| project-move | startup clean max long task | 56.939 | 57.453 | -0.89% | no |
| project-move | startup clean blocking | 6.939 | 7.453 | -6.90% | no |
| project-move | startup clean long tasks | 1.000 | 1.000 | +0.00% | no |
| project-move | fps dropped frames | 6.000 | 6.000 | +0.00% | no |
| project-move | fps max long task | 56.922 | 56.394 | +0.94% | no |
| project-move | fps long tasks | 1.000 | 1.000 | +0.00% | no |
| project-click | startup clean main-thread cost | 327.881 | 339.608 | -3.45% | no |
| project-click | startup clean max long task | 54.538 | 56.982 | -4.29% | no |
| project-click | startup clean blocking | 4.538 | 6.982 | -35.00% | FLAG >20% |
| project-click | startup clean long tasks | 1.000 | 1.000 | +0.00% | no |
| project-click | fps dropped frames | 6.500 | 6.500 | +0.00% | no |
| project-click | fps max long task | 54.188 | 58.904 | -8.01% | no |
| project-click | fps long tasks | 1.000 | 1.000 | +0.00% | no |

The two blocking flags are derived from `max long task − 50 ms` and are below 3 ms in absolute terms. The home dropped-frame drift remains >20% against either T014 pair (2) and against all four T014 runs (2.5).

## 3. Long-task anatomy

### Chunk → stage map

The 12 non-initial scripts total 995,971 bytes. Profile self time is the sum over all 46 profiled tasks above 16.7 ms; `0.00` means no sample in those tasks.

| Chunk | Bytes | Code observed in the chunk | Profile self ms |
|---|---:|---|---:|
| `_next/static/<build-id>/_buildManifest.js` | 219 | Next build manifest metadata | 0.00 |
| `_next/static/<build-id>/_clientMiddlewareManifest.js` | 96 | Next client middleware manifest metadata | 0.00 |
| `_next/static/<build-id>/_ssgManifest.js` | 108 | Next SSG manifest metadata | 0.00 |
| `0dagpsll3o5r2.js` | 1,278 | `bootWorkbench` dynamic loader | 0.00 |
| `0eluqspu0_yh9.js` | 1,273 | `bootHeroStage` dynamic loader | 0.00 |
| `1d5kkip1hlg-o.js` | 181,183 | R3F / `@react-three/fiber` + reconciler | 178.29 |
| `1i-prr2ae20oj.js` | 119,309 | xploder React/viewer DOM (`data-xploder-*`) | 256.82 |
| `1y81jgf1iz4ib.js` | 144,243 | Zod/schema plus app and project marker strings | 85.39 |
| `22g2-bd2w2wpe.js` | 334 | `HeroStage` glue | 0.00 |
| `2ynxs-3jzdgtz.js` | 1,425 | motion token exports | 0.00 |
| `3vnmkhfgdnq2d.js` | 545,967 | three.js / `WebGLRenderer` | 330.10 |
| `4388rdi57woly.js` | 536 | R3F export facade | 0.00 |

Initial chunks sampled in the same tasks:

| Chunk | Bytes | Code observed in the chunk | Profile self ms |
|---|---:|---|---:|
| `turbopack-3-ry682tkyiqk.js` | 10,030 | Turbopack runtime / module factory dispatch | 179.51 |
| `1kgrt2f4mrm63.js` | 229,819 | react-dom plus Next app bootstrap | 109.42 |
| `1jr83020c6cbx.js` | 32,732 | Next app-router/client runtime | 8.87 |
| `10o1tabqbip1o.js` | 3,792 | route-specific initial chunk | 0.60 |
| `2luf6vc8lnwv0.js` | 2,244 | route-specific initial chunk | 0.06 |

The remaining profile self time is `(native)` = 851.14 ms across the same 46 tasks.

### Profiled tasks above 16.7 ms

Top chunks and functions are self time in ms. The complete arrays, including every function beyond the top eight, are in `T004-cpuprofile-summary-*.json`.

#### home-move

| Run | # | start (ms) | dur (ms) | Top chunks, self ms (top 5) | Top functions, self ms (top 8) |
|---|---:|---:|---:|---|---|
| r1 | 1 | 2322.40 | 101.83 | (native) 101.59 | (program) [(native)] 101.59 |
| r1 | 2 | 2447.89 | 27.69 | turbopack-3-ry682tkyiqk.js 19.81; 3vnmkhfgdnq2d.js 5.43; (native) 2.38 | I [turbopack-3-ry682tkyiqk.js] 19.32; (program) [(native)] 2.38; (anonymous) [3vnmkhfgdnq2d.js] 2.25; u [3vnmkhfgdnq2d.js] 1.27; g [3vnmkhfgdnq2d.js] 0.97; c [3vnmkhfgdnq2d.js] 0.50; d [turbopack-3-ry682tkyiqk.js] 0.45; d [3vnmkhfgdnq2d.js] 0.16 |
| r1 | 3 | 2569.55 | 19.16 | (native) 18.68 | (program) [(native)] 18.68 |
| r1 | 4 | 2603.64 | 64.94 | 3vnmkhfgdnq2d.js 30.08; 1d5kkip1hlg-o.js 23.30; 1i-prr2ae20oj.js 4.72; 1kgrt2f4mrm63.js 4.36; (native) 1.44 | setSize [3vnmkhfgdnq2d.js] 5.49; (anonymous) [1d5kkip1hlg-o.js] 4.93; tr [3vnmkhfgdnq2d.js] 4.45; ti [3vnmkhfgdnq2d.js] 4.06; (anonymous) [3vnmkhfgdnq2d.js] 3.61; (anonymous) [1i-prr2ae20oj.js] 3.47; i [3vnmkhfgdnq2d.js] 3.45; f [1d5kkip1hlg-o.js] 2.17 |
| r1 | 5 | 2668.58 | 32.54 | 3vnmkhfgdnq2d.js 20.50; 1i-prr2ae20oj.js 8.44; (native) 2.67; 1d5kkip1hlg-o.js 0.92 | (anonymous) [1i-prr2ae20oj.js] 5.85; R [3vnmkhfgdnq2d.js] 3.52; (program) [(native)] 2.29; (anonymous) [3vnmkhfgdnq2d.js] 1.46; tx [3vnmkhfgdnq2d.js] 1.41; tf [3vnmkhfgdnq2d.js] 1.33; acquireProgram [3vnmkhfgdnq2d.js] 1.22; render [3vnmkhfgdnq2d.js] 1.08 |
| r1 | 6 | 2702.92 | 32.32 | 1i-prr2ae20oj.js 24.14; 1kgrt2f4mrm63.js 5.70; (native) 0.88; 1d5kkip1hlg-o.js 0.83; 1jr83020c6cbx.js 0.77 | H [1i-prr2ae20oj.js] 13.33; (anonymous) [1i-prr2ae20oj.js] 4.51; G [1i-prr2ae20oj.js] 2.83; tN [1kgrt2f4mrm63.js] 2.22; O [1i-prr2ae20oj.js] 1.38; rx [1kgrt2f4mrm63.js] 1.05; i [1kgrt2f4mrm63.js] 0.93; q [1i-prr2ae20oj.js] 0.83 |
| r2 | 1 | 2299.28 | 116.91 | (native) 116.79 | (program) [(native)] 116.79 |
| r2 | 2 | 2417.11 | 21.36 | (native) 19.76; 1kgrt2f4mrm63.js 1.47; 10o1tabqbip1o.js 0.13 | (program) [(native)] 19.70; (anonymous) [1kgrt2f4mrm63.js] 1.47; o [10o1tabqbip1o.js] 0.13; requestIdleCallback [(native)] 0.06 |
| r2 | 3 | 2460.14 | 27.65 | turbopack-3-ry682tkyiqk.js 18.56; 3vnmkhfgdnq2d.js 6.58; (native) 2.31 | I [turbopack-3-ry682tkyiqk.js] 18.41; (anonymous) [3vnmkhfgdnq2d.js] 3.18; (program) [(native)] 2.31; z [3vnmkhfgdnq2d.js] 0.92; u [3vnmkhfgdnq2d.js] 0.78; c [3vnmkhfgdnq2d.js] 0.78; clone [3vnmkhfgdnq2d.js] 0.52; w [3vnmkhfgdnq2d.js] 0.15 |
| r2 | 4 | 2610.45 | 66.30 | 3vnmkhfgdnq2d.js 30.47; 1d5kkip1hlg-o.js 25.40; 1i-prr2ae20oj.js 5.61; 1kgrt2f4mrm63.js 2.79; 1jr83020c6cbx.js 1.06 | (anonymous) [3vnmkhfgdnq2d.js] 5.50; setSize [3vnmkhfgdnq2d.js] 5.24; (anonymous) [1d5kkip1hlg-o.js] 4.95; (anonymous) [1i-prr2ae20oj.js] 4.78; i [3vnmkhfgdnq2d.js] 3.79; ti [3vnmkhfgdnq2d.js] 3.72; tr [3vnmkhfgdnq2d.js] 3.18; f [1d5kkip1hlg-o.js] 2.45 |
| r2 | 5 | 2676.75 | 31.34 | 3vnmkhfgdnq2d.js 20.13; 1i-prr2ae20oj.js 7.22; 1d5kkip1hlg-o.js 2.72; (native) 1.28 | (anonymous) [1i-prr2ae20oj.js] 4.60; R [3vnmkhfgdnq2d.js] 2.80; setup [3vnmkhfgdnq2d.js] 1.73; (program) [(native)] 1.28; tu [1d5kkip1hlg-o.js] 1.22; (anonymous) [3vnmkhfgdnq2d.js] 1.10; te [3vnmkhfgdnq2d.js] 1.07; render [3vnmkhfgdnq2d.js] 1.06 |
| r2 | 6 | 2710.27 | 33.48 | 1i-prr2ae20oj.js 22.38; 1kgrt2f4mrm63.js 5.32; (native) 3.58; 1d5kkip1hlg-o.js 2.20 | H [1i-prr2ae20oj.js] 9.38; (anonymous) [1i-prr2ae20oj.js] 4.47; G [1i-prr2ae20oj.js] 3.89; (garbage collector) [(native)] 3.02; O [1i-prr2ae20oj.js] 1.65; tN [1kgrt2f4mrm63.js] 1.51; Y [1i-prr2ae20oj.js] 1.21; $ [1d5kkip1hlg-o.js] 0.85 |

#### project-move

| Run | # | start (ms) | dur (ms) | Top chunks, self ms (top 5) | Top functions, self ms (top 8) |
|---|---:|---:|---:|---|---|
| r1 | 1 | 2232.49 | 96.70 | (native) 96.59 | (program) [(native)] 96.59 |
| r1 | 2 | 2330.29 | 23.04 | (native) 20.82; 1kgrt2f4mrm63.js 2.22 | (program) [(native)] 20.82; (anonymous) [1kgrt2f4mrm63.js] 0.78; fq [1kgrt2f4mrm63.js] 0.71; tT [1kgrt2f4mrm63.js] 0.71; t [1kgrt2f4mrm63.js] 0.02 |
| r1 | 3 | 2372.97 | 27.58 | turbopack-3-ry682tkyiqk.js 18.30; 3vnmkhfgdnq2d.js 7.01; (native) 2.27 | I [turbopack-3-ry682tkyiqk.js] 16.84; (anonymous) [3vnmkhfgdnq2d.js] 3.02; (program) [(native)] 2.27; convert [3vnmkhfgdnq2d.js] 1.07; i [3vnmkhfgdnq2d.js] 0.88; H [3vnmkhfgdnq2d.js] 0.80; p [turbopack-3-ry682tkyiqk.js] 0.75; c [turbopack-3-ry682tkyiqk.js] 0.70 |
| r1 | 4 | 2434.54 | 36.09 | 1y81jgf1iz4ib.js 19.57; turbopack-3-ry682tkyiqk.js 14.40; (native) 1.51; 10o1tabqbip1o.js 0.47 | I [turbopack-3-ry682tkyiqk.js] 14.40; e._zod.parse [1y81jgf1iz4ib.js] 4.33; (anonymous) [1y81jgf1iz4ib.js] 3.86; s [1y81jgf1iz4ib.js] 3.21; (native) [(native)] 1.50; oG [1y81jgf1iz4ib.js] 0.98; e [1y81jgf1iz4ib.js] 0.95; i [1y81jgf1iz4ib.js] 0.90 |
| r1 | 5 | 2493.16 | 20.42 | 1kgrt2f4mrm63.js 15.53; 1d5kkip1hlg-o.js 3.29; 1i-prr2ae20oj.js 1.01; (native) 0.36; 1y81jgf1iz4ib.js 0.23 | ax [1kgrt2f4mrm63.js] 2.37; iE [1kgrt2f4mrm63.js] 2.24; e [1d5kkip1hlg-o.js] 2.04; cw [1kgrt2f4mrm63.js] 1.17; nk [1i-prr2ae20oj.js] 1.01; iI [1kgrt2f4mrm63.js] 1.00; oi [1kgrt2f4mrm63.js] 0.99; T [1kgrt2f4mrm63.js] 0.97 |
| r1 | 6 | 2568.13 | 61.80 | 3vnmkhfgdnq2d.js 28.50; 1d5kkip1hlg-o.js 22.98; 1i-prr2ae20oj.js 4.40; 1jr83020c6cbx.js 2.65; 1kgrt2f4mrm63.js 2.04 | setSize [3vnmkhfgdnq2d.js] 5.62; (anonymous) [1d5kkip1hlg-o.js] 4.74; (anonymous) [3vnmkhfgdnq2d.js] 4.43; tr [3vnmkhfgdnq2d.js] 4.05; (anonymous) [1i-prr2ae20oj.js] 3.85; i [3vnmkhfgdnq2d.js] 3.66; ti [3vnmkhfgdnq2d.js] 3.03; f [1d5kkip1hlg-o.js] 2.44 |
| r1 | 7 | 2629.93 | 34.46 | 3vnmkhfgdnq2d.js 20.41; 1i-prr2ae20oj.js 10.52; (native) 2.77; 1d5kkip1hlg-o.js 0.76 | (anonymous) [1i-prr2ae20oj.js] 7.23; R [3vnmkhfgdnq2d.js] 3.40; (program) [(native)] 2.54; render [3vnmkhfgdnq2d.js] 1.72; (anonymous) [3vnmkhfgdnq2d.js] 1.45; tr [3vnmkhfgdnq2d.js] 1.14; renderBufferDirect [3vnmkhfgdnq2d.js] 1.12; tx [3vnmkhfgdnq2d.js] 1.09 |
| r1 | 8 | 2666.33 | 38.30 | 1i-prr2ae20oj.js 25.70; (native) 6.98; 1kgrt2f4mrm63.js 3.01; 1d5kkip1hlg-o.js 1.52; 1y81jgf1iz4ib.js 1.08 | H [1i-prr2ae20oj.js] 9.00; (anonymous) [1i-prr2ae20oj.js] 5.32; O [1i-prr2ae20oj.js] 3.81; (garbage collector) [(native)] 3.10; G [1i-prr2ae20oj.js] 3.06; Y [1i-prr2ae20oj.js] 1.60; tC [1kgrt2f4mrm63.js] 1.06; D [1i-prr2ae20oj.js] 0.95 |
| r2 | 1 | 2208.62 | 107.77 | (native) 107.17 | (program) [(native)] 107.17 |
| r2 | 2 | 2316.99 | 23.56 | (native) 22.12; 1kgrt2f4mrm63.js 1.38; 2luf6vc8lnwv0.js 0.06 | (program) [(native)] 22.12; t [1kgrt2f4mrm63.js] 0.92; (anonymous) [1kgrt2f4mrm63.js] 0.46; (anonymous) [2luf6vc8lnwv0.js] 0.06 |
| r2 | 3 | 2360.01 | 27.35 | turbopack-3-ry682tkyiqk.js 21.00; 3vnmkhfgdnq2d.js 4.18; (native) 2.17 | I [turbopack-3-ry682tkyiqk.js] 20.35; (anonymous) [3vnmkhfgdnq2d.js] 1.60; (program) [(native)] 1.43; b [3vnmkhfgdnq2d.js] 0.92; fromArray [3vnmkhfgdnq2d.js] 0.90; set webkitSpeechRecognitionEvent [(native)] 0.74; c [turbopack-3-ry682tkyiqk.js] 0.60; d [3vnmkhfgdnq2d.js] 0.41 |
| r2 | 4 | 2421.52 | 35.78 | 1y81jgf1iz4ib.js 19.16; turbopack-3-ry682tkyiqk.js 15.77; (native) 0.65 | I [turbopack-3-ry682tkyiqk.js] 14.95; (anonymous) [1y81jgf1iz4ib.js] 7.06; e._zod.run [1y81jgf1iz4ib.js] 2.50; s [1y81jgf1iz4ib.js] 1.61; e._zod.parse [1y81jgf1iz4ib.js] 1.52; compile [1y81jgf1iz4ib.js] 1.31; sk [1y81jgf1iz4ib.js] 1.03; u [1y81jgf1iz4ib.js] 0.93 |
| r2 | 5 | 2480.03 | 20.97 | 1kgrt2f4mrm63.js 14.82; 1d5kkip1hlg-o.js 3.98; 1jr83020c6cbx.js 0.77; 1y81jgf1iz4ib.js 0.68; 1i-prr2ae20oj.js 0.59 | ax [1kgrt2f4mrm63.js] 4.49; e [1d5kkip1hlg-o.js] 2.03; (anonymous) [1kgrt2f4mrm63.js] 1.80; i [1kgrt2f4mrm63.js] 1.59; iE [1kgrt2f4mrm63.js] 1.13; y [1d5kkip1hlg-o.js] 1.04; (anonymous) [1d5kkip1hlg-o.js] 0.91; ih [1kgrt2f4mrm63.js] 0.80 |
| r2 | 6 | 2556.35 | 63.78 | 3vnmkhfgdnq2d.js 27.89; 1d5kkip1hlg-o.js 27.43; 1i-prr2ae20oj.js 5.64; 1kgrt2f4mrm63.js 1.64; 1jr83020c6cbx.js 0.71 | (anonymous) [1d5kkip1hlg-o.js] 5.72; setSize [3vnmkhfgdnq2d.js] 5.14; i [3vnmkhfgdnq2d.js] 4.41; (anonymous) [3vnmkhfgdnq2d.js] 4.37; tr [3vnmkhfgdnq2d.js] 4.27; (anonymous) [1i-prr2ae20oj.js] 4.23; ti [3vnmkhfgdnq2d.js] 3.46; f [1d5kkip1hlg-o.js] 2.23 |
| r2 | 7 | 2620.14 | 34.20 | 3vnmkhfgdnq2d.js 19.99; 1i-prr2ae20oj.js 9.87; (native) 3.41; 1d5kkip1hlg-o.js 0.79; 1kgrt2f4mrm63.js 0.15 | (anonymous) [1i-prr2ae20oj.js] 6.58; (program) [(native)] 3.41; R [3vnmkhfgdnq2d.js] 2.44; (anonymous) [3vnmkhfgdnq2d.js] 2.02; tf [3vnmkhfgdnq2d.js] 1.82; eC [1i-prr2ae20oj.js] 1.36; update [3vnmkhfgdnq2d.js] 1.26; renderBufferDirect [3vnmkhfgdnq2d.js] 1.18 |
| r2 | 8 | 2656.05 | 38.48 | 1i-prr2ae20oj.js 26.41; 1kgrt2f4mrm63.js 6.55; (native) 3.68; 1y81jgf1iz4ib.js 1.57; 1d5kkip1hlg-o.js 0.27 | H [1i-prr2ae20oj.js] 9.86; (anonymous) [1i-prr2ae20oj.js] 4.88; O [1i-prr2ae20oj.js] 4.75; (garbage collector) [(native)] 2.24; tN [1kgrt2f4mrm63.js] 1.94; G [1i-prr2ae20oj.js] 1.62; q [1i-prr2ae20oj.js] 1.51; D [1i-prr2ae20oj.js] 1.08 |

#### project-click

| Run | # | start (ms) | dur (ms) | Top chunks, self ms (top 5) | Top functions, self ms (top 8) |
|---|---:|---:|---:|---|---|
| r1 | 1 | 2344.05 | 118.69 | (native) 118.58 | (program) [(native)] 118.58 |
| r1 | 2 | 2502.06 | 21.76 | (native) 21.51 | (program) [(native)] 21.51 |
| r1 | 3 | 2540.23 | 28.44 | turbopack-3-ry682tkyiqk.js 21.05; 3vnmkhfgdnq2d.js 5.14; (native) 2.05 | I [turbopack-3-ry682tkyiqk.js] 20.40; (anonymous) [3vnmkhfgdnq2d.js] 3.03; (program) [(native)] 2.05; b [3vnmkhfgdnq2d.js] 0.63; w [turbopack-3-ry682tkyiqk.js] 0.49; d [3vnmkhfgdnq2d.js] 0.46; x [3vnmkhfgdnq2d.js] 0.33; set [3vnmkhfgdnq2d.js] 0.24 |
| r1 | 4 | 2600.99 | 35.33 | 1y81jgf1iz4ib.js 18.91; turbopack-3-ry682tkyiqk.js 13.84; (native) 2.17 | I [turbopack-3-ry682tkyiqk.js] 13.84; (anonymous) [1y81jgf1iz4ib.js] 6.64; s [1y81jgf1iz4ib.js] 2.77; compile [1y81jgf1iz4ib.js] 2.19; e._zod.parse [1y81jgf1iz4ib.js] 1.78; (program) [(native)] 1.41; e [1y81jgf1iz4ib.js] 1.03; eW [1y81jgf1iz4ib.js] 0.95 |
| r1 | 5 | 2636.87 | 17.80 | 1i-prr2ae20oj.js 11.57; 1kgrt2f4mrm63.js 4.93; (native) 1.30 | (anonymous) [1i-prr2ae20oj.js] 11.57; ax [1kgrt2f4mrm63.js] 2.28; useMemo [1kgrt2f4mrm63.js] 1.48; rx [1kgrt2f4mrm63.js] 0.86; matchMedia [(native)] 0.65; (program) [(native)] 0.62; rS [1kgrt2f4mrm63.js] 0.25; oC [1kgrt2f4mrm63.js] 0.07 |
| r1 | 6 | 2665.27 | 17.90 | 1kgrt2f4mrm63.js 11.01; 1d5kkip1hlg-o.js 2.88; 1i-prr2ae20oj.js 1.41; 1y81jgf1iz4ib.js 0.98; 1jr83020c6cbx.js 0.90 | ax [1kgrt2f4mrm63.js] 4.20; e [1d5kkip1hlg-o.js] 2.59; iE [1kgrt2f4mrm63.js] 2.10; up [1kgrt2f4mrm63.js] 1.17; (anonymous) [1y81jgf1iz4ib.js] 0.98; cf [1kgrt2f4mrm63.js] 0.96; (anonymous) [1i-prr2ae20oj.js] 0.77; tS [1i-prr2ae20oj.js] 0.65 |
| r1 | 7 | 2738.86 | 63.45 | 3vnmkhfgdnq2d.js 28.85; 1d5kkip1hlg-o.js 25.39; 1i-prr2ae20oj.js 6.15; 1kgrt2f4mrm63.js 2.70; (native) 0.24 | (anonymous) [1d5kkip1hlg-o.js] 5.73; setSize [3vnmkhfgdnq2d.js] 4.73; tr [3vnmkhfgdnq2d.js] 4.64; (anonymous) [1i-prr2ae20oj.js] 4.52; (anonymous) [3vnmkhfgdnq2d.js] 4.47; i [3vnmkhfgdnq2d.js] 3.82; ti [3vnmkhfgdnq2d.js] 3.61; e7 [1d5kkip1hlg-o.js] 2.66 |
| r1 | 8 | 2802.32 | 33.93 | 3vnmkhfgdnq2d.js 20.78; 1i-prr2ae20oj.js 9.99; (native) 1.61; 1d5kkip1hlg-o.js 1.53; 1kgrt2f4mrm63.js 0.00 | (anonymous) [1i-prr2ae20oj.js] 5.84; R [3vnmkhfgdnq2d.js] 3.63; render [3vnmkhfgdnq2d.js] 2.49; (anonymous) [3vnmkhfgdnq2d.js] 2.14; eR [1i-prr2ae20oj.js] 1.63; (program) [(native)] 1.47; setup [3vnmkhfgdnq2d.js] 1.32; tu [1d5kkip1hlg-o.js] 0.97 |
| r1 | 9 | 2838.28 | 37.10 | 1i-prr2ae20oj.js 27.57; 1kgrt2f4mrm63.js 5.33; (native) 2.42; 1y81jgf1iz4ib.js 0.89; 1d5kkip1hlg-o.js 0.87 | (anonymous) [1i-prr2ae20oj.js] 7.93; H [1i-prr2ae20oj.js] 7.83; O [1i-prr2ae20oj.js] 4.80; Y [1i-prr2ae20oj.js] 2.99; (garbage collector) [(native)] 2.20; q [1i-prr2ae20oj.js] 1.50; tN [1kgrt2f4mrm63.js] 1.27; tC [1kgrt2f4mrm63.js] 1.05 |
| r1 | 10 | 7341.56 | 22.53 | (native) 0.01 | (program) [(native)] 0.01 |
| r2 | 1 | 2221.61 | 123.12 | (native) 123.07 | (program) [(native)] 123.07; evaluate [(native)] 0.00 |
| r2 | 2 | 2372.53 | 19.97 | (native) 19.78 | (program) [(native)] 19.78 |
| r2 | 3 | 2407.80 | 28.14 | turbopack-3-ry682tkyiqk.js 21.77; 3vnmkhfgdnq2d.js 4.05; (native) 2.11 | I [turbopack-3-ry682tkyiqk.js] 19.82; (program) [(native)] 2.11; d [3vnmkhfgdnq2d.js] 1.66; (anonymous) [3vnmkhfgdnq2d.js] 1.16; c [turbopack-3-ry682tkyiqk.js] 1.02; u.S [turbopack-3-ry682tkyiqk.js] 0.92; updateProjectionMatrix [3vnmkhfgdnq2d.js] 0.67; u [3vnmkhfgdnq2d.js] 0.43 |
| r2 | 4 | 2472.26 | 37.24 | 1y81jgf1iz4ib.js 21.13; turbopack-3-ry682tkyiqk.js 14.95; (native) 1.17 | I [turbopack-3-ry682tkyiqk.js] 14.95; (anonymous) [1y81jgf1iz4ib.js] 7.59; e._zod.parse [1y81jgf1iz4ib.js] 2.79; write [1y81jgf1iz4ib.js] 2.08; u [1y81jgf1iz4ib.js] 1.62; t [1y81jgf1iz4ib.js] 1.31; ol [1y81jgf1iz4ib.js] 0.97; s [1y81jgf1iz4ib.js] 0.97 |
| r2 | 5 | 2534.15 | 20.48 | 1kgrt2f4mrm63.js 12.88; 1d5kkip1hlg-o.js 3.33; (native) 2.09; 1y81jgf1iz4ib.js 1.18; 1i-prr2ae20oj.js 0.95 | ax [1kgrt2f4mrm63.js] 3.04; e [1d5kkip1hlg-o.js] 2.46; iE [1kgrt2f4mrm63.js] 1.82; cf [1kgrt2f4mrm63.js] 1.27; lt [1kgrt2f4mrm63.js] 1.01; f [1kgrt2f4mrm63.js] 0.99; (anonymous) [1i-prr2ae20oj.js] 0.95; rx [1kgrt2f4mrm63.js] 0.94 |
| r2 | 6 | 2609.66 | 63.70 | 3vnmkhfgdnq2d.js 29.82; 1d5kkip1hlg-o.js 24.04; 1i-prr2ae20oj.js 5.63; (native) 1.72; 1kgrt2f4mrm63.js 1.71 | setSize [3vnmkhfgdnq2d.js] 6.56; (anonymous) [1d5kkip1hlg-o.js] 5.94; ti [3vnmkhfgdnq2d.js] 4.17; tr [3vnmkhfgdnq2d.js] 3.73; i [3vnmkhfgdnq2d.js] 3.34; (anonymous) [3vnmkhfgdnq2d.js] 3.07; (anonymous) [1i-prr2ae20oj.js] 2.65; e7 [1d5kkip1hlg-o.js] 1.94 |
| r2 | 7 | 2673.37 | 34.85 | 3vnmkhfgdnq2d.js 20.30; 1i-prr2ae20oj.js 11.11; 1d5kkip1hlg-o.js 1.83; (native) 1.61 | (anonymous) [1i-prr2ae20oj.js] 6.06; R [3vnmkhfgdnq2d.js] 3.23; ez [1i-prr2ae20oj.js] 2.48; render [3vnmkhfgdnq2d.js] 1.73; (program) [(native)] 1.41; e1 [3vnmkhfgdnq2d.js] 1.38; tu [1d5kkip1hlg-o.js] 1.18; getParameters [3vnmkhfgdnq2d.js] 1.08 |
| r2 | 8 | 2710.26 | 36.12 | 1i-prr2ae20oj.js 25.80; (native) 4.41; 1kgrt2f4mrm63.js 3.87; 1d5kkip1hlg-o.js 2.03; 1y81jgf1iz4ib.js 0.01 | H [1i-prr2ae20oj.js] 7.26; (anonymous) [1i-prr2ae20oj.js] 4.66; G [1i-prr2ae20oj.js] 3.54; O [1i-prr2ae20oj.js] 3.14; (garbage collector) [(native)] 2.76; D [1i-prr2ae20oj.js] 1.93; (anonymous) [1kgrt2f4mrm63.js] 1.43; tN [1kgrt2f4mrm63.js] 1.26 |

## 4. Dropped-frame timeline

| Run | droppedFrameTimes (ms) | tasksOver16ms: start+dur→end (ms) |
|---|---|---|
| home-move r1 | 270.405 | #1 20.471+23.467→43.938; #2 52.012+26.815→78.827; #3 172.814+58.108→230.922; #4 230.927+29.584→260.511; #5 263.147+30.352→293.499 |
| home-move r2 | 235.641 | #1 6.052+26.461→32.513; #2 138.513+57.341→195.854; #3 196.646+29.655→226.301; #4 227.514+29.439→256.953 |
| project-move r1 | 184.740, 201.406, 218.072, 234.738, 268.070, 284.736 | #1 7.172+26.598→33.770; #2 41.203+31.515→72.718; #3 171.466+57.335→228.801; #4 228.805+32.261→261.066; #5 262.527+33.637→296.164 |
| project-move r2 | 185.798, 202.464, 219.130, 235.796, 269.128, 285.794 | #1 6.886+27.038→33.924; #2 41.300+31.941→73.241; #3 73.967+17.016→90.983; #4 96.884+22.029→118.913; #5 174.236+56.510→230.746; #6 230.751+33.036→263.787; #7 265.044+34.265→299.309 |
| project-click r1 | 226.737, 243.403, 260.069, 276.735, 310.067, 326.733 | #1 15.042+24.252→39.294; #2 47.758+27.452→75.210; #3 83.733+33.273→117.006; #4 139.000+20.298→159.298; #5 213.602+54.388→267.990; #6 268.549+31.919→300.468; #7 301.779+33.287→335.066 |
| project-click r2 | 209.888, 226.554, 243.220, 259.886, 276.552, 309.884, 326.550 | #1 15.407+23.805→39.212; #2 47.389+26.492→73.881; #3 82.100+33.368→115.468; #4 135.160+20.224→155.384; #5 210.881+53.987→264.868; #6 264.872+32.140→297.012; #7 298.558+33.707→332.265 |

| Run | Dropped at (ms) | Association | Task interval (ms) | Offset (ms) |
|---|---:|---|---|---:|
| home-move r1 | 270.405 | inside task #5 | 263.147–293.499 | 7.258 |
| home-move r2 | 235.641 | inside task #4 | 227.514–256.953 | 8.127 |
| project-move r1 | 184.740 | inside task #3 | 171.466–228.801 | 13.274 |
| project-move r1 | 201.406 | inside task #3 | 171.466–228.801 | 29.940 |
| project-move r1 | 218.072 | inside task #3 | 171.466–228.801 | 46.606 |
| project-move r1 | 234.738 | inside task #4 | 228.805–261.066 | 5.933 |
| project-move r1 | 268.070 | inside task #5 | 262.527–296.164 | 5.543 |
| project-move r1 | 284.736 | inside task #5 | 262.527–296.164 | 22.209 |
| project-move r2 | 185.798 | inside task #5 | 174.236–230.746 | 11.562 |
| project-move r2 | 202.464 | inside task #5 | 174.236–230.746 | 28.228 |
| project-move r2 | 219.130 | inside task #5 | 174.236–230.746 | 44.894 |
| project-move r2 | 235.796 | inside task #6 | 230.751–263.787 | 5.045 |
| project-move r2 | 269.128 | inside task #7 | 265.044–299.309 | 4.084 |
| project-move r2 | 285.794 | inside task #7 | 265.044–299.309 | 20.750 |
| project-click r1 | 226.737 | inside task #5 | 213.602–267.990 | 13.135 |
| project-click r1 | 243.403 | inside task #5 | 213.602–267.990 | 29.801 |
| project-click r1 | 260.069 | inside task #5 | 213.602–267.990 | 46.467 |
| project-click r1 | 276.735 | inside task #6 | 268.549–300.468 | 8.186 |
| project-click r1 | 310.067 | inside task #7 | 301.779–335.066 | 8.288 |
| project-click r1 | 326.733 | inside task #7 | 301.779–335.066 | 24.954 |
| project-click r2 | 209.888 | follows task #4 by | 135.160–155.384 | 54.504 |
| project-click r2 | 226.554 | inside task #5 | 210.881–264.868 | 15.673 |
| project-click r2 | 243.220 | inside task #5 | 210.881–264.868 | 32.339 |
| project-click r2 | 259.886 | inside task #5 | 210.881–264.868 | 49.005 |
| project-click r2 | 276.552 | inside task #6 | 264.872–297.012 | 11.680 |
| project-click r2 | 309.884 | inside task #7 | 298.558–332.265 | 11.326 |
| project-click r2 | 326.550 | inside task #7 | 298.558–332.265 | 27.992 |

## 5. AC4 sequence

| Path | Run | firstInstancedDraw t / raf | ready t / raf | Same rAF | liveStates | Draw before ready |
|---|---|---|---|---|---|---|
| home-move | r1 | 2611.700 / 12 | 2612.000 / 12 | yes | idle → loading → revealed | no |
| home-move | r2 | 2487.100 / 11 | 2487.900 / 11 | yes | idle → loading → revealed | no |
| project-move | r1 | 2555.400 / 14 | 2556.600 / 14 | yes | loading → revealed | no |
| project-move | r2 | 2517.100 / 14 | 2518.000 / 14 | yes | loading → revealed | no |
| project-click | r1 | 2700.000 / 15 | 2700.900 / 15 | yes | loading → revealed | no |
| project-click | r2 | 2571.600 / 14 | 2572.600 / 14 | yes | loading → revealed | no |

Every run has `ready.raf === firstInstancedDraw.raf`, no instanced draw before ready, and identical `liveStates` values for both runs of each path. These are the T004 baselines.

## 6. Bytes, draws, CLS, Lighthouse and hero probe

### Client JS bytes

| Scope | Files | Raw bytes | Gzip bytes |
|---|---:|---:|---:|
| home initial | 9 | 583,343 | 180,606 |
| project initial | 9 | 581,795 | 180,044 |
| total emitted JS | 22 | 1,581,558 | 459,097 |
| non-initial 3D JS | 12 | 995,971 | 277,414 |

These equal the S11.5 T014 final scopes. Source: `T004-log-bytes.txt`, `T004-log-bundle.json`.

### Draw calls

| Probe | Expected | Observed | Result |
|---|---:|---|---|
| site draws, project | 2 | mode 2 on 32/32 rendered frames | pass |
| site draws, hero | 2 | mode 2 on 40/40 rendered frames | pass |
| engine fixture a | 2 | 2 | pass |
| engine fixture b | 2 | 2 | pass |
| engine fixture c | 2 | 2 | pass |

### CLS

| Path | Clean runs raw / filtered |
|---|---|
| home-move | 0.0/0.0, 0.0/0.0 |
| project-move | 0.0/0.0, 0.0/0.0 |
| project-click | 0.0/0.0, 0.0/0.0 |

All four gated Lighthouse summaries also report CLS 0 in every internal run.

### Gated Lighthouse

| Route | Run | Performance | LCP median (ms) | CLS runs | TBT runs (ms) |
|---|---|---:|---:|---|---|
| home | r1 | 1.00 | 903.3 | 0.0, 0.0, 0.0 | 0.5, 0.0, 0.5 |
| home | r2 | 1.00 | 903.4 | 0.0, 0.0, 0.0 | 0.5, 0.5, 0.5 |
| project | r1 | 1.00 | 902.8 | 0.0, 0.0, 0.0 | 0.0, 0.0, 0.0 |
| project | r2 | 1.00 | 902.9 | 0.0, 0.0, 0.0 | 0.0, 0.5, 0.5 |

### Parity drift vs S11.5

`perf:parity --compare` against S11.5 `T014-screenshot-*` (single-set dir with `T006-log-parity-baseline.json`): **0 differing pixels on all 8 shots**, `pass: true` (`T004-log-parity-drift.json`).

### Hero probe

| Check | Actual | Result |
|---|---|---|
| hero-ssr-poster | true | pass |
| hero-first-paint-is-poster | FCP 64 ms, load 55 ms; live state idle at both | pass |
| hero-poster-no-interaction | idle; 0 canvases; poster width 570; opacity 1 | pass |
| hero-revealed-after-load | idle at load; revealed after interaction | pass |
| hero-idle-exploded | exploded; not tweening; 1 canvas | pass |
| hero-one-canvas-max | 1 | pass |
| hero-project-poster | 0 canvases; poster 1086; static Explore and control visible | pass |

## 7. Interpretation and confirmed lever order (orchestrator, G1)

### 7.1 Re-baseline vs S11.5: no material drift

- **Parity:** 0 differing pixels on 8/8 shots vs S11.5 `T014-screenshot-*` (`T004-log-parity-drift.json`).
- **Bytes:** byte-identical to T014 in all four scopes.
- **Unchanged:** draws 2, CLS 0, gated Lighthouse 1.00. benchmarkIndex 4,196–4,253 (S11.5: ≈ 4,200).
- **Within noise:** cost −14 … −3 %, max long task −16 … +1 %.
- **The three flags** sit on small absolutes: blocking < 3 ms absolute, and home dropped frames 1 vs 2.
- **"Before" for every comparison** in this slice = this T004 set (RFC Q2).

### 7.2 What the long task and the dropped frames are

Source: `T004-log-task-identity.txt` (clean traces) + §3 (profiles) + §4 (timeline).

After engagement, every path runs the same chain of main-thread tasks:

| # | Task | Dur (home / project-move / project-click) | Content | Frame pending? |
|---|---|---|---|---|
| a | staged module eval ×2–3 (S11.5) | 24–34 ms each | three / R3F / viewer + Zod evaluation | no: 0 drops |
| b | TeardownViewer transition render | 29 / 19 / 20 ms | React render of the viewer DOM; contains the `hasWebgl()` probe | no: 0 drops |
| c | **`<Canvas>` mount** (React scheduler → R3F layout effect) | **69 / 57 / 54 ms** | three ≈ 28–30 ms (`setSize`, renderer/state init), R3F ≈ 23–27 ms, xploder ≈ 4–6 ms | **yes, from the first `invalidate()`** |
| d | **first frame** (rAF) | **33 / 31 / 30 ms** | three render + program setup (`acquireProgram`, `setup`, `getParameters`) ≈ 20 ms; xploder `useFrame` (overlay projection etc.) ≈ 8–11 ms | yes |
| e | **post-frame commit** (React scheduler, default lane) | **33 / 35 / 36 ms** | the React re-render triggered by state set during the first frame (`setPhase`, `setScrollExtentPx` in TeardownViewer, and the app's reveal); xploder viewer DOM ≈ 22–27 ms, react-dom ≈ 4–7 ms, GC ≈ 2–3 ms | yes |

**Dropped frames:**
- Project route: all 6–7 per run fall inside c → d → e (3 in c, 1 in d, 2 in e; §4).
- Hero: its single drop falls in d/e.
- None falls in a or b, because no frame is pending before the scene mount calls `invalidate()`.

**Rule this shows:** from the first `invalidate()` until the post-frame commit ends, *any* task above one frame (16.7 ms) drops frames. AC2's "0 dropped frames" therefore needs c, d and e each under ≈ 16.7 ms, or no frame pending while they run. Getting every task under 50 ms is not enough.

### 7.3 Consequences for the levers

1. **L1 + L4 (T005, T006): confirmed, first.** They take renderer construction (≈ 28–30 ms three) and root configuration (`setSize`) out of task c and run them *before* the scene mounts, when no frame is pending. Expected: c drops below 50 ms on every path (the AC2 long-task half), and the mount-phase drops fall from 3 to about 0–1.
2. **L2 (T007): confirmed as conditional, refined.** The scene mount itself is small (xploder 4–6 ms), so staging it buys little. Its useful step for AC2 is a **precompile step** inside the staged mount: one `gl.compile(scene, camera)` task before Stats mounts. It takes program setup out of the first frame d. This is part of "split … the first scene render into separate tasks" (brief lever 4), not a new lever. It runs if T006 still shows a drop in d.
3. **L3 (T008): pre-skipped with evidence.** The probe sits in task b, under 50 ms, with no frame pending and no drop on any path.
4. **Task e (post-frame commit) is not covered by the brief's four named levers.** It is a non-time-sliced React re-render of the viewer DOM, caused by the frame-driven state updates in `TeardownViewer.tsx` (an allowed S8 file).
   - **Candidate L5 (proposed, needs Murphy at G1):** wrap those state updates (`setPhase`, `setScrollExtentPx`) in `startTransition`. React then slices the re-render into ≈ 5 ms chunks.
   - Same discipline as every lever: one commit, A/B, parity, AC4 sequence probe, S8 re-seal.
   - Without it, the ≈ 2 drops in e stay, and AC2 is escalated.
5. **Honest forecast.**
   - AC2's long-task half: likely met after L1 + L4.
   - AC2's 0-dropped-frames half: uncertain even with L2-precompile + L5. Task d keeps ≈ 8–11 ms of overlay projection plus the draw itself, which must stay in the first frame (AC4), so 1 drop per path may remain. If so, AC2 is escalated with the timeline (RFC Q10).
6. **AC5 note (F8).** Tasks a and b (19–34 ms here) also cost TBT on the runner (≈ 1.85× → 35–63 ms simulated). They are S11.5 app-side module evaluation and are untouched by this brief's levers (RFC Q14). Expect them to dominate any remaining runner TBT.

### 7.4 Confirmed lever order

**T005 L1 → T006 L4 → T007 L2 (precompile step + render hold; only if T006 shows drops in d) → T007b L5 (only if Murphy approves; only if T006/T007 still show drops in e) → T008 L3 ⊘ skipped (evidence: §4 + task b).**

## Check output

`/tmp/s116-checks/t004.txt`:

```text
PRODUCT-IS-S11.5-FINAL
       6
ARTIFACTS-OK
SHOTS-OK
FROZEN-OK
BRIEF-HISTORY-OK
XPLODER-SRC-OK
SURFACE-S2-OK
SURFACE-S4-OK
SURFACE-S5-OK
SURFACE-S6-OK
SURFACE-S7-OK
SURFACE-S8-OK
SEALED-TESTS-OK
RESEAL-NOTE-OK
REBASELINE-FIRST-OK
DEV-ROUTES-OK
S8-TOOLS-OK
CI-JOBS-OK
VERSIONS-OK
GITLEAKS-OK
```

The final command chain then completed:

```text
$ pnpm typecheck && pnpm lint && pnpm test && echo T004-OK
...
tools/perf test:  Test Files  26 passed (26)
tools/perf test:       Tests  191 passed (191)
packages/xploder test:  Test Files  60 passed (60)
packages/xploder test:       Tests  617 passed (617)
apps/web test:  Test Files  32 passed | 1 skipped (33)
apps/web test:       Tests  183 passed | 1 skipped (184)
T004-OK
```
