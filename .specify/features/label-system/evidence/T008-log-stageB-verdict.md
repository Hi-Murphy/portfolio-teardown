# T008 — Stage B switch verdict (orchestrator)

**Head:** `916c82b` (fix) + `bd55abf` (S6 re-seal). Exports: `/tmp/s16-checks/b-out`, `b-out-fixtures`.
**Base:** `021c1ff` (`sbase1..3`). Stage A runs (`stageA..4`) are the R12-accepted S15 equivalents.
**Runs:** three serial matrix runs of the head (`stageB`, `stageB2`, `stageB3`), 2,052 cells each, 0 settle timeouts.

## AC1 — sweep

- `T008-log-sweep-matrix.{md,json}`: **`sweep: PASS (0 intersections in 2052 cells)`**. Every rectangle and every pair test is in the JSON plus `cells.jsonl`.
- `stageB2` and `stageB3` also give `sweep: PASS (0 intersections in 2052 cells)` (`T008-log-sweep-reruns.md`).
- Seeded controls on the head: 3/3 `seed detected`, and 0 pairs after the seed is removed (`T008-log-sweep-control.txt`).
- Model sweep (`T008-log-green.txt`):
  - before the gate (Stage A), 1,152 matrix cases at the real canvas sizes have 5 cases with 7 pairs;
  - after the gate, 0 pairs and `guarded 0`;
  - the 2,272-case random parity corpus also gives 0 pairs and `guarded 0`, including its 9 cases with 13 S15 pairs.

## AC2 — the six S15 overlap cells (`T008-log-clusters.md`, screenshots `T008-screenshot-*`)

A label is listed if **every** Stage B run differs from **every** S15 / Stage A run, so the listing is robust to run noise.

| cell | S15 overlap | change | reason (RFC §3.3) |
|---|---|---|---|
| `home-768-{light,dark}-hero-explode` | footprint note × part number `5.3` (`stream-adapter`, mark) | footprint note moves 48 px left | P6 note yields to the P5 mark: re-placed with the visible marks/faces/plates as obstacles |
| `fixture-c-390-{light,dark}` turn 1 | `slot-planner` mark × `retry-scheduler` face; × `audit-trail` face | `slot-planner` mark hidden | P5 mark yields to P3 faces; none of its 4 candidates is clear → hidden (fallback) |
| `fixture-c-390-{light,dark}` turn 3 | `retry-scheduler` mark × `notifier` face; × `slot-planner` | `retry-scheduler` mark hidden | the same rule |

No other label changes in these cells: every other painted label equals some S15 run.

## AC2 — every other cell: 0 px (R11 + R12)

- Gated cells are those that are pixel-stable (or DOM-stable) in the S15 runs **and** have no overlap in any S15 run: **1,733** cells.
- `T008-log-reproduce-s15-only.md`: 1,723 cells have a Stage B run byte-identical to an S15 run.
- `T008-log-reproduce.md` (Stage A runs added to the pool, R12): **1,728 / 1,733**. The other 5:
  - three cells (`websocket-inspector-1440-dark z4 top t0`, `fixture-c-768-light z3 bottom t3`, `fixture-c-390-dark z1 top t0`) are **0 px in all three Stage B runs**. Only the DOM text differs: 1e-13 float drift in a dimension stroke, or a different inline-style property order from React's render history. AC2 is a pixel criterion, so these pass;
  - `websocket-inspector-1440-light z1 middle t2`: the footprint note sits 0.45 px lower in all three Stage B runs. The cell is in columns mode, where the gate cannot run on the note (a node replay at settle offsets 0, 0.06, 0.0667, 0.5, 0.513 and 0.52 shows the gated pass equal to the S15 oracle, with `guarded 0`). The note is viewport-clamped, so its position is `602.52 + settleOffset` in content space. The 0.45 px therefore equals a different settle offset after the turn: the T001 upstream scroll-extent noise, which the longer settle task makes land differently;
  - `jev-toolkit-1440-light z1 middle t1`: the footprint note again, also viewport-clamped. It moves by 1 px in S15-equivalent Stage A runs as well (`stageA..3`) and by 1–2 px in Stage B runs. The same noise class.
- **Verdict:** no gated cell differs because of a placement decision.

## Cost so far

Gzip `472,002 → 473,754 B` (**+1,752 B**; `T008-log-gzip.txt`).

## Process notes

- The tier-1 run implemented the gate in about 300 lines, at +2,041 B gzip, with a test-only `extraLabels` input hook shipped in product code.
- The orchestrator rewrote the gate and the label list compactly (−289 B) and removed the hook. The seeded-gate test became "every Stage A overlap is resolved by moving or hiding the lower-priority label" plus "AC1 on the random corpus".
- The orchestrator also rebuilt the commit history (red → one fix → re-seal) with the attribution footer. The executor's evidence from the superseded code was discarded, and every browser run above is on the final head.
