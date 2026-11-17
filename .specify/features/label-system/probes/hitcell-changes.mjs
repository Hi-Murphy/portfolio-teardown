import { readFileSync } from 'node:fs';
const load = (d) => new Map(readFileSync(`/tmp/s16-checks/${d}/cells.jsonl`, 'utf8').trim().split('\n').map((l) => { const c = JSON.parse(l); return [c.cellId, c]; }));
const bases = ['sbase1', 'sbase2', 'sbase3', 'stageA', 'stageA2', 'stageA3', 'stageA4'].map(load);
const heads = ['stageB', 'stageB2', 'stageB3'].map(load);
const census = JSON.parse(readFileSync(process.argv[2], 'utf8')).cells;
const r = (q) => q.map((p) => p.map((v) => +v.toFixed(2)));
const painted = (cell) => new Map(cell.quads.filter((q) => q.painted).map((q) => [`${q.marker.replace('data-xploder-', '')}|${q.key}`, q.quad]));
const near = (a, b) => (a === undefined && b === undefined) || (a && b && a.every((p, i) => Math.abs(p[0] - b[i][0]) < 0.6 && Math.abs(p[1] - b[i][1]) < 0.6));
console.log('| cell | S15 overlap pairs | label | S15 quad (sbase1) | Stage B quad (all 3 runs) |');
console.log('|---|---|---|---|---|');
for (const [id, c] of Object.entries(census)) {
  if (!c.hits) continue;
  const bs = bases.map((m) => painted(m.get(id))); const hs = heads.map((m) => painted(m.get(id)));
  const keys = new Set([...bs, ...hs].flatMap((m) => [...m.keys()]));
  const pairs = c.pairs.map((p) => `${p.a.key} × ${p.b.key}`).join('; ');
  for (const k of keys) {
    // changed by Stage B: every head run differs from every base run
    const changed = hs.every((h) => bs.every((b) => !near(h.get(k), b.get(k))));
    if (!changed) continue;
    const hv = hs.map((h) => h.get(k)); const same = hv.every((q) => near(q, hv[0]));
    console.log(`| \`${id}\` | ${pairs} | \`${k}\` | ${bs[0].get(k) ? JSON.stringify(r(bs[0].get(k))) : 'absent'} | ${hv[0] ? JSON.stringify(r(hv[0])) : 'hidden'}${same ? '' : ' (varies)'} |`);
  }
}
