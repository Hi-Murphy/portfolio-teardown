# G5 manual read: agent-fleet teardown

**Read by:** orchestrator (Opus 5.5) · **date:** 2026-11-17 · **content:** `.specify/content/agent-fleet.json` at `eda5c82` (Merlin amendment) · **branch head when signed:** `6bdbfbe`

**Method:** every string below was read end to end in full. Each was checked against:
- F7: no quoted agent or system instructions, prompts or tool schemas.
- F8/F9: no account identifiers, emails, phone numbers or postal addresses.
- The implication ban: no vendor or product names chosen for operational reasons, no uptime or cost figures, no region names, nothing that would let a reader reproduce the setup (no tool, version, host, path or provider).

The machine scans G1 (0 hits) and G2 cover F1–F6/F8/F9 by regex; this read covers what regex cannot.

| # | JSON path | Verdict |
|---|---|---|
| 1 | `meta.tagline` | clean. Counts sourced N4, N6 |
| 2 | `meta.summary` | clean |
| 3 | `story.headline` | clean |
| 4 | `story.problem` | clean. "1am" is illustrative, not a figure |
| 5 | `story.approach` | clean |
| 6 | `story.outcome` | clean after `eda5c82` (P1 availability sentence deleted; B1 corrected). Counts sourced N1–N3, F9 |
| 7 | `story.metrics[0].label` | clean |
| 8 | `story.metrics[0].value` | clean |
| 9 | `story.metrics[1].label` | clean |
| 10 | `story.metrics[1].value` | clean |
| 11 | `story.metrics[2].label` | clean |
| 12 | `story.metrics[2].value` | clean |
| 13 | `story.metrics[3].label` | clean |
| 14 | `story.metrics[3].value` | clean |
| 15 | `story.metrics[4].label` | clean |
| 16 | `story.metrics[4].value` | clean |
| 17 | `story.metrics[5].label` | clean |
| 18 | `story.metrics[5].value` | clean |
| 19 | `layers[0].description` | clean |
| 20 | `layers[0].components[0].summary` | clean |
| 21 | `layers[0].components[0].description` | clean. "weeks later" is a consequence of persistent threads, not an availability figure |
| 22 | `layers[0].components[1].summary` | clean |
| 23 | `layers[0].components[1].description` | clean |
| 24 | `layers[0].components[2].summary` | clean |
| 25 | `layers[0].components[2].description` | clean after `eda5c82` (evidence is linked, not stored) |
| 26 | `layers[1].description` | clean |
| 27 | `layers[1].components[0].summary` | clean |
| 28 | `layers[1].components[0].description` | clean. "a change of model behind the seat" names no model or vendor |
| 29 | `layers[1].components[1].summary` | clean |
| 30 | `layers[1].components[1].description` | clean |
| 31 | `layers[1].components[2].summary` | clean |
| 32 | `layers[1].components[2].description` | clean |
| 33 | `layers[2].description` | clean |
| 34 | `layers[2].components[0].summary` | clean |
| 35 | `layers[2].components[0].description` | clean |
| 36 | `layers[2].components[1].summary` | clean |
| 37 | `layers[2].components[1].description` | clean |
| 38 | `layers[2].components[2].summary` | clean |
| 39 | `layers[2].components[2].description` | clean |
| 40 | `layers[2].components[3].summary` | clean |
| 41 | `layers[2].components[3].description` | clean |
| 42 | `layers[2].components[4].summary` | clean |
| 43 | `layers[2].components[4].description` | clean |
| 44 | `layers[3].description` | clean |
| 45 | `layers[3].components[0].summary` | clean |
| 46 | `layers[3].components[0].description` | clean after `eda5c82` (untested capability claim removed). Role list is generic: no host, OS, provider or region |
| 47 | `layers[3].components[1].summary` | clean |
| 48 | `layers[3].components[1].description` | clean |
| 49 | `layers[3].components[2].summary` | clean |
| 50 | `layers[3].components[2].description` | clean. "capacity watchdogs" (P2) names no provider, quota or figure |
| 51 | `flows[0].description` | clean |
| 52 | `flows[1].description` | clean |
| 53 | `flows[2].description` | clean |

**Strings read:** 53 (every `summary`, `description`, `tagline` and `story.*` string, including metric labels and values). **Flags open:** 0. **Earlier flags:** P1 deleted by Merlin (`eda5c82`); P2 and P3 cleared (P3's sentence was rewritten in `eda5c82`).

**Signed:** orchestrator (Opus 5.5), S18 T005, 2026-11-17. Murphy reads the rendered page at the gate (brief G5).
