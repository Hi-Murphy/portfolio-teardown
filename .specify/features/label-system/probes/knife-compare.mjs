import { readFileSync, existsSync } from 'node:fs';
const load = (d) => existsSync(`${d}/cells.jsonl`) ? new Map(readFileSync(`${d}/cells.jsonl`, 'utf8').trim().split('\n').map((l) => { const c = JSON.parse(l); return [c.cellId, c]; })) : new Map();
const ids = ['jev-toolkit-768-dark-exploded-z4-bottom-t1', 'websocket-inspector-390-light-exploded-z1-bottom-t0', 'fixture-c-390-dark-exploded-z1-bottom-t0', 'fixture-c-768-light-exploded-z4-bottom-t1'];
const keyFor = { 'jev-toolkit-768-dark-exploded-z4-bottom-t1': 'dimension:stack', 'websocket-inspector-390-light-exploded-z1-bottom-t0': 'dimension:footprint', 'fixture-c-390-dark-exploded-z1-bottom-t0': 'dimension:footprint', 'fixture-c-768-light-exploded-z4-bottom-t1': 'dimension:stack' };
const runs = [['sbase1'], ['sbase2'], ['sbase3'], ...[1,2,3,4,5].map((i) => [`knife-base-${i}`]), ['stageA'], ...[1,2,3,4,5].map((i) => [`knife-head-${i}`])];
for (const id of ids) {
  const out = runs.map(([r]) => { const c = load(`/tmp/s16-checks/${r}`).get(id); if (!c) return `${r}:—`; const q = c.quads.find((x) => x.painted && x.key === keyFor[id]); return `${r.replace('knife-','k')}:${q ? q.quad[0].map((v) => v.toFixed(2)).join(',') : 'hidden'}`; });
  console.log('==', id, keyFor[id]); console.log(out.join('\n'));
}
