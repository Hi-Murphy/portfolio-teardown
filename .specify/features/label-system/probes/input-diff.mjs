import { readFileSync } from 'node:fs';
const load = (d) => new Map(readFileSync(`${d}/cells.jsonl`, 'utf8').trim().split('\n').map((l) => { const c = JSON.parse(l); return [c.cellId, c]; }));
const base = ['sbase1', 'sbase2', 'sbase3'].map((r) => load(`/tmp/s16-checks/${r}`));
const head = load('/tmp/s16-checks/stageA');
const failing = [...readFileSync(process.argv[2], 'utf8').matchAll(/^\| `([^`]+)` \| (\d+) \| (stable|base-unstable[^|]*) \| `([^`]+)`/gm)].map((m) => ({ id: m[1], px: +m[2], stab: m[3].trim() }));
const offsets = (dom) => [...dom.matchAll(/translateY\((-?[\d.e-]+)px\)/g)].map((m) => +m[1]);
let sameInput = 0;
for (const f of failing) {
  const h = head.get(f.id);
  const b = base[0].get(f.id);
  const ho = offsets(h.dom), bo = offsets(b.dom);
  const inputSame = JSON.stringify(ho) === JSON.stringify(bo) && h.extent === b.extent && h.scrollTop === b.scrollTop;
  if (inputSame) sameInput++;
  console.log(`${inputSame ? 'SAME-INPUT ' : 'input-diff '} ${f.id} px=${f.px} ${f.stab} | offset base ${bo.join(',')} head ${ho.join(',')} | extent ${b.extent} vs ${h.extent} | scrollTop ${b.scrollTop} vs ${h.scrollTop}`);
}
console.log(`failing ${failing.length}, same-input ${sameInput}`);
