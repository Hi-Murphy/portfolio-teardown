# S18 T007 — AC7 byte report

Base export: `<base-out>` · Head export: `<head-out>`.
Masking: `/_next/static/chunks/<name>.js` and `static/chunks/<name>.js` → `CHUNK.js`.
RSC normalisation: `$L<hex>` → `$L#`, `$@<hex>` → `$@#`, bare JSON row reference `$<hex>` → `$#`, and line-prefix `<hex>:` → `#:`.

## Existing project pages

| file | raw-identical | M-identical (C3) | rendered DOM | payload | E5-A |
|---|---|---|---|---|---|
| `projects/websocket-inspector.html` | no | no | yes | yes | yes |
| `projects/websocket-inspector.txt` | no | no | — | yes | yes |
| `projects/websocket-inspector/__next.!KHNpdGUp.projects.$d$slug.__PAGE__.txt` | no | yes | — | yes | yes |
| `projects/websocket-inspector/__next.!KHNpdGUp.txt` | no | no | — | yes | yes |
| `projects/websocket-inspector/__next._full.txt` | no | no | — | yes | yes |
| `projects/websocket-inspector/__next._index.txt` | no | no | — | yes | yes |
| `projects/websocket-inspector/__next._tree.txt` | yes | yes | — | yes | yes |
| `projects/jev-toolkit.html` | no | no | yes | yes | yes |
| `projects/jev-toolkit.txt` | no | no | — | yes | yes |
| `projects/jev-toolkit/__next.!KHNpdGUp.projects.$d$slug.__PAGE__.txt` | no | yes | — | yes | yes |
| `projects/jev-toolkit/__next.!KHNpdGUp.txt` | no | no | — | yes | yes |
| `projects/jev-toolkit/__next._full.txt` | no | no | — | yes | yes |
| `projects/jev-toolkit/__next._index.txt` | no | no | — | yes | yes |
| `projects/jev-toolkit/__next._tree.txt` | yes | yes | — | yes | yes |

- View (ii), all files M-identical: **FAIL**.
- View (iii), all files E5-A: **PASS**.

- `projects/websocket-inspector.html`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `projects/websocket-inspector.txt`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `projects/websocket-inspector/__next.!KHNpdGUp.projects.$d$slug.__PAGE__.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS
- `projects/websocket-inspector/__next.!KHNpdGUp.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `projects/websocket-inspector/__next._full.txt`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `projects/websocket-inspector/__next._index.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `projects/websocket-inspector/__next._tree.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS
- `projects/jev-toolkit.html`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `projects/jev-toolkit.txt`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `projects/jev-toolkit/__next.!KHNpdGUp.projects.$d$slug.__PAGE__.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS
- `projects/jev-toolkit/__next.!KHNpdGUp.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `projects/jev-toolkit/__next._full.txt`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `projects/jev-toolkit/__next._index.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `projects/jev-toolkit/__next._tree.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS

### `data-site-connections` markup

- `projects/websocket-inspector.html`: 1/1 section(s), byte-equal yes.
- `projects/jev-toolkit.html`: 1/1 section(s), byte-equal yes.
- Markup gate: **PASS**.

## `/`, `/projects`, `/404`

| route | DOM after card removal + scripts | script src after masking | RSC payloads | gate |
|---|---|---|---|---|
| `/` | yes | yes (9) | yes | PASS |
| `/projects` | yes | yes (8) | yes | PASS |
| `/404` | yes | yes (8) | yes | PASS |

### `/`

- `__next.!KHNpdGUp.__PAGE__.txt`: lines -1/+3; moved 0; insert-only 0 (0 reference); restructured 1; agent-fleet hunks 2; literals -0/+34 (0 unexpected); PASS
- `__next.!KHNpdGUp.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `__next._full.txt`: lines -3/+7; moved 0; insert-only 2 (2 reference); restructured 1; agent-fleet hunks 4; literals -0/+100 (0 unexpected); PASS
- `__next._index.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `__next._tree.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS
- `index.html`: lines -3/+7; moved 0; insert-only 2 (2 reference); restructured 1; agent-fleet hunks 4; literals -0/+100 (0 unexpected); PASS
- `index.txt`: lines -3/+7; moved 0; insert-only 2 (2 reference); restructured 1; agent-fleet hunks 4; literals -0/+100 (0 unexpected); PASS

### `/projects`

- `projects.html`: lines -3/+23; moved 0; insert-only 3 (3 reference); restructured 0; agent-fleet hunks 4; literals -0/+785 (0 unexpected); PASS
- `projects.txt`: lines -3/+23; moved 0; insert-only 3 (3 reference); restructured 0; agent-fleet hunks 4; literals -0/+785 (0 unexpected); PASS
- `projects/__next.!KHNpdGUp.projects.__PAGE__.txt`: lines -1/+19; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 2; literals -0/+719 (0 unexpected); PASS
- `projects/__next.!KHNpdGUp.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `projects/__next._full.txt`: lines -3/+23; moved 0; insert-only 3 (3 reference); restructured 0; agent-fleet hunks 4; literals -0/+785 (0 unexpected); PASS
- `projects/__next._index.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `projects/__next._tree.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS

### `/404`

- `404.html`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `_not-found.html`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `_not-found.txt`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `_not-found/__next._full.txt`: lines -2/+4; moved 0; insert-only 2 (2 reference); restructured 0; agent-fleet hunks 2; literals -0/+66 (0 unexpected); PASS
- `_not-found/__next._index.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `_not-found/__next._not-found.__PAGE__.txt`: lines -1/+2; moved 0; insert-only 1 (1 reference); restructured 0; agent-fleet hunks 1; literals -0/+33 (0 unexpected); PASS
- `_not-found/__next._tree.txt`: lines -0/+0; moved 0; insert-only 0 (0 reference); restructured 0; agent-fleet hunks 0; literals -0/+0 (0 unexpected); PASS

## Changed chunks

### Only in one export

- base only: `0ex_cgonf0mx6.js` — 154,682 B
- base only: `18o_7-7eq6i8z.js` — 2,394 B
- base only: `3-e0pq-vkwdqo.js` — 1,278 B
- head only: `06nuu-kxpyoim.js` — 1,278 B
- head only: `115wyxtifq4bk.js` — 2,394 B
- head only: `19ixmtp4yubm2.js` — 162,991 B

### Renamed only (M-identical)

- `3-e0pq-vkwdqo.js` → `06nuu-kxpyoim.js`: renamed only.

### Remaining changed pairs

- `0ex_cgonf0mx6.js` → `19ixmtp4yubm2.js` (154,682 → 162,991 B): literals -0/+148; non-chunk removals 0; unexpected additions 0; E4 delta 1; PASS.
- `18o_7-7eq6i8z.js` → `115wyxtifq4bk.js` (2,394 → 2,394 B): literals -1/+1; non-chunk removals 0; unexpected additions 0; E4 delta 0; PASS.

### E4 delta

The canvas-fallback change is the approved E4-A code delta. The actual T006b implementation uses `closest('canvas')`, which adds the double-quoted literal `"canvas"` to the workbench chunk; it is recorded here for orchestrator judgment and is not an agent-fleet content literal.
- E4 delta literals: `"canvas"`.
- No other non-agent-fleet, non-chunk literal is added or removed.
- Chunk literal gate: **PASS**.

## Other files

- `sitemap.xml`: 4 → 5 `<loc>`; added `http://localhost:3000/projects/agent-fleet`; removed 0; **PASS**.
- `robots.txt`: identical **PASS**.

| OG file | base bytes | head bytes | base sha256 | head sha256 | state |
|---|---|---|---|---|---|
| `og/home.png` | 75,554 | 75,635 | 312bead39820255a | e135605e8c4091a1 | changed |
| `og/projects.png` | 93,278 | 91,277 | a5bd1ef656317599 | 62c830e31fdef658 | changed |
| `og/projects/agent-fleet.png` | — | 71,217 | — | d6fe5cc890094a52 | new |
| `og/projects/jev-toolkit.png` | 76,330 | 76,330 | 2231a0eb01e7553b | 2231a0eb01e7553b | identical |
| `og/projects/websocket-inspector.png` | 79,743 | 79,743 | 74e0a6099a11e544 | 74e0a6099a11e544 | identical |

- Existing project OG cards identical: **PASS**.
- Changed: `og/home.png`, `og/projects.png`. New: `og/projects/agent-fleet.png`.
- OG gate: **PASS**.

- CSS: 1 file(s), byte-identical **PASS**.

## Gzip Δ

- `_next/**/*.js` gzip -9: base 473,625 B, head 476,337 B, Δ +2,712 B.

AC7 bytes (C3): FAIL
AC7 bytes (C3+E5-A): PASS
