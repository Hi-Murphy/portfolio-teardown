import { readFileSync } from 'node:fs';
const load = (d) => new Map(readFileSync(`/tmp/s16-checks/${d}/cells.jsonl`, 'utf8').trim().split('\n').map((l) => { const c = JSON.parse(l); return [c.cellId, c]; }));
const names = ['sbase1', 'sbase2', 'sbase3', 'stageA', 'stageA2', 'stageA3', 'stageA4', 'stageB', 'stageB2', 'stageB3'];
const runs = names.map((r) => [r, load(r)]);
for (const id of process.argv.slice(2)) {
  console.log('==', id);
  const ref = runs[0][1].get(id);
  for (const [r, m] of runs) {
    const c = m.get(id); let max = 0, big = []; const refq = new Map(ref.quads.filter((q) => q.painted).map((q) => [q.marker + '|' + q.key, q]));
    const keys = new Set([...refq.keys(), ...c.quads.filter((q) => q.painted).map((q) => q.marker + '|' + q.key)]);
    for (const k of keys) { const a = refq.get(k), b = c.quads.find((q) => q.painted && q.marker + '|' + q.key === k);
      if (!a || !b) { big.push(`${k}:${a ? 'gone' : 'new'}`); continue; }
      const d = Math.max(...a.quad.flat().map((v, i) => Math.abs(v - b.quad.flat()[i]))); max = Math.max(max, d); if (d > 0.5) big.push(`${k}:${d.toFixed(1)}`); }
    console.log(`  ${r.padEnd(8)} offset ${(c.dom.match(/translateY\(([^)]*)\)/) || [])[1]} maxΔ ${max.toExponential(1)} ${big.join(' ')}`);
  }
}
