# T016 — contrast evidence

Sources: `T011-log-contrast-token-after.txt` (post-R2 token inventory), `T016-log-contrast-browser.json` (in-browser computed/pixel measurements), and the four `T016-axe-<palette>-<viewport>.json` cells. Token measurements use the named palette roles; browser measurements use rendered pixels/computed styles; axe is the independent gate.

**Verdict: all non-exception text/UI rows ≥ AA in both palettes.**

## Token inventory (one row per inventory surface × palette)

The 86 inventory rows are repeated for both palettes. `inactive-dim` rows are computed and listed, but are excluded from the pass verdict by RFC R3; they are not silently dropped.

| Palette | Inventory row | State | Size | FG role | Background | Ratio | Threshold | Token verdict | Exception |
|---|---|---|---|---|---|---:|---:|---|---|
| light | `panel-body` | rest | body | ink | surface | 14.58 | 4.5 | PASS | — |
| light | `panel-label` | rest | body | label | surface | 7.79 | 4.5 | PASS | — |
| light | `panel-link` | rest | body | accent | surface | 5.60 | 4.5 | PASS | — |
| light | `panel-border` | rest | ui | line | surface | 8.06 | 3.0 | PASS | — |
| light | `chip-label` | rest | body | ink | surface | 14.58 | 4.5 | PASS | — |
| light | `chip-border` | rest | ui | lineMuted | surface | 3.43 | 3.0 | PASS | — |
| light | `chip-tech-library-accent` | rest | ui | tech.library | surface | 5.24 | 3.0 | PASS | — |
| light | `tech-library-on-paper` | rest | ui | tech.library | paper | 4.93 | 3.0 | PASS | — |
| light | `caption-heading` | rest | body | label | surface | 7.79 | 4.5 | PASS | — |
| light | `caption-body` | rest | body | ink | surface | 14.58 | 4.5 | PASS | — |
| light | `caption-border` | rest | ui | line | surface | 8.06 | 3.0 | PASS | — |
| light | `callout-label` | rest | body | label | paper | 7.33 | 4.5 | PASS | — |
| light | `balloon-label` | rest | body | ink | surface | 14.58 | 4.5 | PASS | — |
| light | `balloon-border` | rest | ui | line | surface | 8.06 | 3.0 | PASS | — |
| light | `dimension-label` | rest | body | steel | paper | 5.23 | 4.5 | PASS | — |
| light | `leader-line` | rest | ui | lineMuted | paper | 3.23 | 3.0 | PASS | — |
| light | `title-title` | rest | body | ink | paper | 13.71 | 4.5 | PASS | — |
| light | `title-meta` | rest | body | steel | paper | 5.23 | 4.5 | PASS | — |
| light | `title-row` | rest | body | label | paper | 7.33 | 4.5 | PASS | — |
| light | `title-border` | rest | ui | line | paper | 7.58 | 3.0 | PASS | — |
| light | `lettering-face-number-rest-module` | rest | body | ink | kindFill:module | 10.88 | 4.5 | PASS | — |
| light | `lettering-face-name-rest-module` | rest | body | label | kindFill:module | 5.81 | 4.5 | PASS | — |
| light | `lettering-face-number-rest-service` | rest | body | ink | kindFill:service | 11.07 | 4.5 | PASS | — |
| light | `lettering-face-name-rest-service` | rest | body | label | kindFill:service | 5.91 | 4.5 | PASS | — |
| light | `lettering-face-number-rest-store` | rest | body | ink | kindFill:store | 11.30 | 4.5 | PASS | — |
| light | `lettering-face-name-rest-store` | rest | body | label | kindFill:store | 6.04 | 4.5 | PASS | — |
| light | `lettering-face-number-rest-external` | rest | body | ink | kindFill:external | 11.46 | 4.5 | PASS | — |
| light | `lettering-face-name-rest-external` | rest | body | label | kindFill:external | 6.13 | 4.5 | PASS | — |
| light | `lettering-face-number-rest-actor` | rest | body | ink | kindFill:actor | 11.36 | 4.5 | PASS | — |
| light | `lettering-face-name-rest-actor` | rest | body | label | kindFill:actor | 6.07 | 4.5 | PASS | — |
| light | `lettering-face-number-highlight` | highlight | body | ink | highlightFill | 7.93 | 4.5 | PASS | — |
| light | `lettering-face-name-highlight` | highlight | body | ink | highlightFill | 7.93 | 4.5 | PASS | — |
| light | `lettering-column-number` | rest | body | accent | paper | 5.27 | 4.5 | PASS | — |
| light | `lettering-column-name` | rest | body | label | paper | 7.33 | 4.5 | PASS | — |
| light | `lettering-column-number-highlight` | highlight | body | accent | paper | 5.27 | 4.5 | PASS | — |
| light | `lettering-column-name-highlight` | highlight | body | accent | paper | 5.27 | 4.5 | PASS | — |
| light | `lettering-layer-face-label` | rest | body | label | layerFill | 7.05 | 4.5 | PASS | — |
| light | `lettering-layer-plain-label` | rest | body | label | paper | 7.33 | 4.5 | PASS | — |
| light | `focus-ring-paper` | rest | ui | accent | paper | 5.27 | 3.0 | PASS | — |
| light | `focus-ring-surface` | rest | ui | accent | surface | 5.60 | 3.0 | PASS | — |
| light | `focus-ring-kind-fill` | rest | ui | accent | kindFill:module | 4.18 | 3.0 | PASS | — |
| light | `playground-button-text-on-paper` | rest | body | ink | paper | 13.71 | 4.5 | PASS | — |
| light | `playground-meta-on-paper` | rest | body | label | paper | 7.33 | 4.5 | PASS | — |
| light | `playground-button-text-on-surface` | rest | body | ink | surface | 14.58 | 4.5 | PASS | — |
| light | `playground-meta-on-surface` | rest | body | label | surface | 7.79 | 4.5 | PASS | — |
| light | `playground-button-text-hover` | rest | body | ink | {"over":"paper","mix":"ink","t":0.1} | 11.33 | 4.5 | PASS | — |
| light | `playground-meta-hover` | rest | body | label | {"over":"paper","mix":"ink","t":0.1} | 6.05 | 4.5 | PASS | — |
| light | `playground-button-selected-text` | rest | body | paper | ink | 13.71 | 4.5 | PASS | — |
| light | `playground-button-border` | rest | ui | line | paper | 7.58 | 3.0 | PASS | — |
| light | `panel-body-dim` | dim | body | ink | surface | 1.96 | 4.5 | **FAIL** | **inactive-dim** |
| light | `panel-label-dim` | dim | body | label | surface | 1.71 | 4.5 | **FAIL** | **inactive-dim** |
| light | `panel-link-dim` | dim | body | accent | surface | 1.64 | 4.5 | **FAIL** | **inactive-dim** |
| light | `chip-label-dim` | dim | body | ink | surface | 1.96 | 4.5 | **FAIL** | **inactive-dim** |
| light | `caption-heading-dim` | dim | body | label | surface | 1.71 | 4.5 | **FAIL** | **inactive-dim** |
| light | `caption-body-dim` | dim | body | ink | surface | 1.96 | 4.5 | **FAIL** | **inactive-dim** |
| light | `callout-label-dim` | dim | body | label | paper | 1.61 | 4.5 | **FAIL** | **inactive-dim** |
| light | `balloon-label-dim` | dim | body | ink | surface | 1.96 | 4.5 | **FAIL** | **inactive-dim** |
| light | `dimension-label-dim` | dim | body | steel | paper | 1.50 | 4.5 | **FAIL** | **inactive-dim** |
| light | `title-title-dim` | dim | body | ink | paper | 1.84 | 4.5 | **FAIL** | **inactive-dim** |
| light | `title-meta-dim` | dim | body | steel | paper | 1.50 | 4.5 | **FAIL** | **inactive-dim** |
| light | `title-row-dim` | dim | body | label | paper | 1.61 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-number-rest-module-dim` | dim | body | ink | kindFill:module | 1.46 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-name-rest-module-dim` | dim | body | label | kindFill:module | 1.28 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-number-rest-service-dim` | dim | body | ink | kindFill:service | 1.49 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-name-rest-service-dim` | dim | body | label | kindFill:service | 1.30 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-number-rest-store-dim` | dim | body | ink | kindFill:store | 1.52 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-name-rest-store-dim` | dim | body | label | kindFill:store | 1.32 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-number-rest-external-dim` | dim | body | ink | kindFill:external | 1.54 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-name-rest-external-dim` | dim | body | label | kindFill:external | 1.34 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-number-rest-actor-dim` | dim | body | ink | kindFill:actor | 1.53 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-name-rest-actor-dim` | dim | body | label | kindFill:actor | 1.33 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-number-highlight-dim` | dim | body | ink | highlightFill | 1.06 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-face-name-highlight-dim` | dim | body | ink | highlightFill | 1.06 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-column-number-dim` | dim | body | accent | paper | 1.54 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-column-name-dim` | dim | body | label | paper | 1.61 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-column-number-highlight-dim` | dim | body | accent | paper | 1.54 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-column-name-highlight-dim` | dim | body | accent | paper | 1.54 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-layer-face-label-dim` | dim | body | label | layerFill | 1.55 | 4.5 | **FAIL** | **inactive-dim** |
| light | `lettering-layer-plain-label-dim` | dim | body | label | paper | 1.61 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-button-text-on-paper-dim` | dim | body | ink | paper | 1.84 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-meta-on-paper-dim` | dim | body | label | paper | 1.61 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-button-text-on-surface-dim` | dim | body | ink | surface | 1.96 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-meta-on-surface-dim` | dim | body | label | surface | 1.71 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-button-text-hover-dim` | dim | body | ink | {"over":"paper","mix":"ink","t":0.1} | 1.52 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-meta-hover-dim` | dim | body | label | {"over":"paper","mix":"ink","t":0.1} | 1.33 | 4.5 | **FAIL** | **inactive-dim** |
| light | `playground-button-selected-text-dim` | dim | body | paper | ink | 13.71 | 4.5 | PASS | **inactive-dim** |
| dark | `panel-body` | rest | body | ink | surface | 13.06 | 4.5 | PASS | — |
| dark | `panel-label` | rest | body | label | surface | 7.60 | 4.5 | PASS | — |
| dark | `panel-link` | rest | body | accent | surface | 8.44 | 4.5 | PASS | — |
| dark | `panel-border` | rest | ui | line | surface | 8.25 | 3.0 | PASS | — |
| dark | `chip-label` | rest | body | ink | surface | 13.06 | 4.5 | PASS | — |
| dark | `chip-border` | rest | ui | lineMuted | surface | 3.33 | 3.0 | PASS | — |
| dark | `chip-tech-library-accent` | rest | ui | tech.library | surface | 8.50 | 3.0 | PASS | — |
| dark | `tech-library-on-paper` | rest | ui | tech.library | paper | 9.64 | 3.0 | PASS | — |
| dark | `caption-heading` | rest | body | label | surface | 7.60 | 4.5 | PASS | — |
| dark | `caption-body` | rest | body | ink | surface | 13.06 | 4.5 | PASS | — |
| dark | `caption-border` | rest | ui | line | surface | 8.25 | 3.0 | PASS | — |
| dark | `callout-label` | rest | body | label | paper | 8.62 | 4.5 | PASS | — |
| dark | `balloon-label` | rest | body | ink | surface | 13.06 | 4.5 | PASS | — |
| dark | `balloon-border` | rest | ui | line | surface | 8.25 | 3.0 | PASS | — |
| dark | `dimension-label` | rest | body | steel | paper | 6.74 | 4.5 | PASS | — |
| dark | `leader-line` | rest | ui | lineMuted | paper | 3.78 | 3.0 | PASS | — |
| dark | `title-title` | rest | body | ink | paper | 14.81 | 4.5 | PASS | — |
| dark | `title-meta` | rest | body | steel | paper | 6.74 | 4.5 | PASS | — |
| dark | `title-row` | rest | body | label | paper | 8.62 | 4.5 | PASS | — |
| dark | `title-border` | rest | ui | line | paper | 9.36 | 3.0 | PASS | — |
| dark | `lettering-face-number-rest-module` | rest | body | ink | kindFill:module | 8.76 | 4.5 | PASS | — |
| dark | `lettering-face-name-rest-module` | rest | body | label | kindFill:module | 5.10 | 4.5 | PASS | — |
| dark | `lettering-face-number-rest-service` | rest | body | ink | kindFill:service | 9.16 | 4.5 | PASS | — |
| dark | `lettering-face-name-rest-service` | rest | body | label | kindFill:service | 5.33 | 4.5 | PASS | — |
| dark | `lettering-face-number-rest-store` | rest | body | ink | kindFill:store | 9.02 | 4.5 | PASS | — |
| dark | `lettering-face-name-rest-store` | rest | body | label | kindFill:store | 5.25 | 4.5 | PASS | — |
| dark | `lettering-face-number-rest-external` | rest | body | ink | kindFill:external | 9.51 | 4.5 | PASS | — |
| dark | `lettering-face-name-rest-external` | rest | body | label | kindFill:external | 5.54 | 4.5 | PASS | — |
| dark | `lettering-face-number-rest-actor` | rest | body | ink | kindFill:actor | 8.65 | 4.5 | PASS | — |
| dark | `lettering-face-name-rest-actor` | rest | body | label | kindFill:actor | 5.04 | 4.5 | PASS | — |
| dark | `lettering-face-number-highlight` | highlight | body | ink | highlightFill | 5.17 | 4.5 | PASS | — |
| dark | `lettering-face-name-highlight` | highlight | body | ink | highlightFill | 5.17 | 4.5 | PASS | — |
| dark | `lettering-column-number` | rest | body | accent | paper | 9.57 | 4.5 | PASS | — |
| dark | `lettering-column-name` | rest | body | label | paper | 8.62 | 4.5 | PASS | — |
| dark | `lettering-column-number-highlight` | highlight | body | accent | paper | 9.57 | 4.5 | PASS | — |
| dark | `lettering-column-name-highlight` | highlight | body | accent | paper | 9.57 | 4.5 | PASS | — |
| dark | `lettering-layer-face-label` | rest | body | label | layerFill | 6.86 | 4.5 | PASS | — |
| dark | `lettering-layer-plain-label` | rest | body | label | paper | 8.62 | 4.5 | PASS | — |
| dark | `focus-ring-paper` | rest | ui | accent | paper | 9.57 | 3.0 | PASS | — |
| dark | `focus-ring-surface` | rest | ui | accent | surface | 8.44 | 3.0 | PASS | — |
| dark | `focus-ring-kind-fill` | rest | ui | accent | kindFill:module | 5.66 | 3.0 | PASS | — |
| dark | `playground-button-text-on-paper` | rest | body | ink | paper | 14.81 | 4.5 | PASS | — |
| dark | `playground-meta-on-paper` | rest | body | label | paper | 8.62 | 4.5 | PASS | — |
| dark | `playground-button-text-on-surface` | rest | body | ink | surface | 13.06 | 4.5 | PASS | — |
| dark | `playground-meta-on-surface` | rest | body | label | surface | 7.60 | 4.5 | PASS | — |
| dark | `playground-button-text-hover` | rest | body | ink | {"over":"paper","mix":"ink","t":0.1} | 11.48 | 4.5 | PASS | — |
| dark | `playground-meta-hover` | rest | body | label | {"over":"paper","mix":"ink","t":0.1} | 6.69 | 4.5 | PASS | — |
| dark | `playground-button-selected-text` | rest | body | paper | ink | 14.81 | 4.5 | PASS | — |
| dark | `playground-button-border` | rest | ui | line | paper | 9.36 | 3.0 | PASS | — |
| dark | `panel-body-dim` | dim | body | ink | surface | 2.17 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `panel-label-dim` | dim | body | label | surface | 1.69 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `panel-link-dim` | dim | body | accent | surface | 1.77 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `chip-label-dim` | dim | body | ink | surface | 2.17 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `caption-heading-dim` | dim | body | label | surface | 1.69 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `caption-body-dim` | dim | body | ink | surface | 2.17 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `callout-label-dim` | dim | body | label | paper | 1.91 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `balloon-label-dim` | dim | body | ink | surface | 2.17 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `dimension-label-dim` | dim | body | steel | paper | 1.73 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `title-title-dim` | dim | body | ink | paper | 2.46 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `title-meta-dim` | dim | body | steel | paper | 1.73 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `title-row-dim` | dim | body | label | paper | 1.91 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-number-rest-module-dim` | dim | body | ink | kindFill:module | 1.46 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-name-rest-module-dim` | dim | body | label | kindFill:module | 1.13 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-number-rest-service-dim` | dim | body | ink | kindFill:service | 1.52 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-name-rest-service-dim` | dim | body | label | kindFill:service | 1.18 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-number-rest-store-dim` | dim | body | ink | kindFill:store | 1.50 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-name-rest-store-dim` | dim | body | label | kindFill:store | 1.17 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-number-rest-external-dim` | dim | body | ink | kindFill:external | 1.58 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-name-rest-external-dim` | dim | body | label | kindFill:external | 1.23 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-number-rest-actor-dim` | dim | body | ink | kindFill:actor | 1.44 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-name-rest-actor-dim` | dim | body | label | kindFill:actor | 1.12 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-number-highlight-dim` | dim | body | ink | highlightFill | 1.16 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-face-name-highlight-dim` | dim | body | ink | highlightFill | 1.16 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-column-number-dim` | dim | body | accent | paper | 2.01 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-column-name-dim` | dim | body | label | paper | 1.91 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-column-number-highlight-dim` | dim | body | accent | paper | 2.01 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-column-name-highlight-dim` | dim | body | accent | paper | 2.01 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-layer-face-label-dim` | dim | body | label | layerFill | 1.52 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `lettering-layer-plain-label-dim` | dim | body | label | paper | 1.91 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-button-text-on-paper-dim` | dim | body | ink | paper | 2.46 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-meta-on-paper-dim` | dim | body | label | paper | 1.91 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-button-text-on-surface-dim` | dim | body | ink | surface | 2.17 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-meta-on-surface-dim` | dim | body | label | surface | 1.69 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-button-text-hover-dim` | dim | body | ink | {"over":"paper","mix":"ink","t":0.1} | 1.91 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-meta-hover-dim` | dim | body | label | {"over":"paper","mix":"ink","t":0.1} | 1.48 | 4.5 | **FAIL** | **inactive-dim** |
| dark | `playground-button-selected-text-dim` | dim | body | paper | ink | 14.81 | 4.5 | PASS | **inactive-dim** |

## Browser aggregation (surface × scheme)

`Rows` are all emitted browser observations; `measured` excludes zero-pixel samples; `pass` is the non-exception pass count. A measured row with an `exception` is reported separately and does not fail the gate.

| Palette | Browser surface | Rows | Measured | Pass | Exception rows | Unmeasured | Min non-exception ratio (method) | Exception minimum (type) |
|---|---|---:|---:|---:|---:|---:|---|---|
| light | panel | 14 | 14 | 14/14 | 0 | 0 | 5.60 (computed) | — |
| light | overlay | 31 | 31 | 23/23 | 8 | 0 | 5.23 (computed) | 1.61 (inactive-dim) |
| light | lettering | 94 | 50 | 50/50 | 0 | 44 | 5.81 (pixel) | — |
| light | playground | 220 | 220 | 216/216 | 4 | 0 | 7.33 (computed) | 2.33 (disabled-control) |
| dark | panel | 14 | 14 | 14/14 | 0 | 0 | 7.60 (computed) | — |
| dark | overlay | 31 | 31 | 23/23 | 8 | 0 | 6.74 (computed) | 1.91 (inactive-dim) |
| dark | lettering | 94 | 50 | 50/50 | 0 | 44 | 5.04 (pixel) | — |
| dark | playground | 220 | 220 | 216/216 | 4 | 0 | 7.60 (computed) | 3.38 (disabled-control) |

### Exception rows

| Palette | Surface | State | Text | Ratio | Threshold | Exception |
|---|---|---|---|---:|---:|---|
| light | playground | detail-open | "Zoom out" | 2.33 | 4.5 | **disabled-control** |
| light | playground | detail-open | "Reset zoom" | 2.33 | 4.5 | **disabled-control** |
| light | overlay | layer-focus | "2 View state" | 1.61 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "3 Tide data" | 1.61 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "4 External boundary" | 1.61 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "2.1 Tide View Model" | 1.86 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "3.1 Tide Repository" | 1.86 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "3.2 Live Tide Client" | 1.86 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "3.3 Tide Cache" | 1.86 | 4.5 | **inactive-dim** |
| light | overlay | layer-focus | "4.1 Tide Feed" | 1.86 | 4.5 | **inactive-dim** |
| light | lettering | layer-focus | "2.1" | — | 4.5 | **inactive-dim** |
| light | lettering | layer-focus | "3.1" | — | 4.5 | **inactive-dim** |
| light | lettering | layer-focus | "3.2" | — | 4.5 | **inactive-dim** |
| light | lettering | layer-focus | "3.3" | — | 4.5 | **inactive-dim** |
| light | lettering | layer-focus | "4.1" | — | 4.5 | **inactive-dim** |
| light | playground | layer-focus | "Zoom out" | 2.33 | 4.5 | **disabled-control** |
| light | playground | layer-focus | "Reset zoom" | 2.33 | 4.5 | **disabled-control** |
| dark | playground | detail-open | "Zoom out" | 3.38 | 4.5 | **disabled-control** |
| dark | playground | detail-open | "Reset zoom" | 3.38 | 4.5 | **disabled-control** |
| dark | overlay | layer-focus | "2 View state" | 1.91 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "3 Tide data" | 1.91 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "4 External boundary" | 1.91 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "2.1 Tide View Model" | 2.44 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "3.1 Tide Repository" | 2.44 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "3.2 Live Tide Client" | 2.44 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "3.3 Tide Cache" | 2.44 | 4.5 | **inactive-dim** |
| dark | overlay | layer-focus | "4.1 Tide Feed" | 2.44 | 4.5 | **inactive-dim** |
| dark | lettering | layer-focus | "2.1" | — | 4.5 | **inactive-dim** |
| dark | lettering | layer-focus | "3.1" | — | 4.5 | **inactive-dim** |
| dark | lettering | layer-focus | "3.2" | — | 4.5 | **inactive-dim** |
| dark | lettering | layer-focus | "3.3" | — | 4.5 | **inactive-dim** |
| dark | lettering | layer-focus | "4.1" | — | 4.5 | **inactive-dim** |
| dark | playground | layer-focus | "Zoom out" | 3.38 | 4.5 | **disabled-control** |
| dark | playground | layer-focus | "Reset zoom" | 3.38 | 4.5 | **disabled-control** |

### Unmeasured rows

The probe emitted 44 zero-pixel lettering observations per palette. They are marked `unmeasured: true` and `coveredElsewhere: true`; the same glyphs are measured at another scroll position. They are not treated as passes.

| Palette | Surface | Unmeasured rows | States | Text boxes |
|---|---|---:|---|---|
| light | lettering | 44 | highlight-2.44x, highlight-2.44x-top, highlight-2.44x-bottom, layer-focus | "1.1", "Beachgoer", "1.2", "Tide Chart", "Screen", "1.3", "Forecast", "Details", "Panel", "4.1", "Tide Feed", "1 INTERFACE", "4 EXTERNAL BOUNDARY", "3.1", "Tide", "Repository", "3.2", "Live Tide", "Client", "3.3", "Tide Cache", "3 TIDE DATA", "2.1", "Tide View", "Model", "2 VIEW STATE" |
| dark | lettering | 44 | highlight-2.44x, highlight-2.44x-top, highlight-2.44x-bottom, layer-focus | "1.1", "Beachgoer", "1.2", "Tide Chart", "Screen", "1.3", "Forecast", "Details", "Panel", "4.1", "Tide Feed", "1 INTERFACE", "4 EXTERNAL BOUNDARY", "3.1", "Tide", "Repository", "3.2", "Live Tide", "Client", "3.3", "Tide Cache", "3 TIDE DATA", "2.1", "Tide View", "Model", "2 VIEW STATE" |

## Axe color-contrast verdicts

`CC ledger` uses the same R3 rule as the gate: only nodes composited below full opacity are ledgered. `CC incomplete` is color-contrast-specific after removing ledgered nodes; `all-rule incomplete` is the cell summary count.

| Cell | CC violations | CC ledger | CC incomplete (excl. ledger) | All-rule incomplete | Layers in ledger | Verdict |
|---|---:|---:|---:|---:|---|---|
| light/desktop | 0 | 13 | 204 | 209 | data, platform, state | PASS |
| light/mobile | 0 | 23 | 335 | 340 | data, platform, state, unknown | PASS |
| dark/desktop | 0 | 13 | 204 | 209 | data, platform, state | PASS |
| dark/mobile | 0 | 23 | 335 | 340 | data, platform, state, unknown | PASS |

All four axe cells report 0 serious and 0 critical findings. The only color-contrast exceptions are the R3 dimmed-layer ledger entries in `a-layer-focus` at 0.3 opacity; all other axe rules also pass.

## Verdict

**all non-exception text/UI rows ≥ AA in both palettes** — token rows: 0 non-exception failures; browser: 0 non-exception failures among measured rows; axe: 0 color-contrast violations.
