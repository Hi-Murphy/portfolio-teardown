import { readFileSync } from 'node:fs';
const load = (d) => new Map(readFileSync(`${d}/cells.jsonl`, 'utf8').trim().split('\n').map((l) => { const c = JSON.parse(l); return [c.cellId, c]; }));
const runs = ['sbase1', 'sbase2', 'sbase3', 'stageA'].map((r) => [r, load(`/tmp/s16-checks/${r}`)]);
for (const id of process.argv.slice(2)) {
  console.log('==', id);
  const keyset = new Set();
  for (const [, m] of runs) for (const q of m.get(id).quads) if (q.painted) keyset.add(q.marker + '|' + q.key);
  for (const k of keyset) {
    const vals = runs.map(([r, m]) => { const q = m.get(id).quads.find((x) => x.painted && x.marker + '|' + x.key === k); return q ? q.quad[0].map((v) => v.toFixed(4)).join(',') : '—'; });
    if (new Set(vals).size > 1) console.log(k, vals.join('  |  '));
  }
}
