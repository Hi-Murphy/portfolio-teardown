import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/tools/perf/package.json');
const { chromium } = require('playwright');
const b = await chromium.launch();
const geom = () => {
  const vis = (e) => { const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.01 && e.getClientRects().length > 0; };
  const quad = (e) => { // exact screen polygon for transformed elements
    const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
    if (st.transform === 'none') return [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]];
    const m = new DOMMatrix(st.transform); const w = e.offsetWidth, h = e.offsetHeight; const parent = e.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const ox = parent.left + e.offsetLeft, oy = parent.top + e.offsetTop;
    return [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => { const p = m.transformPoint(new DOMPoint(x, y)); return [ox + p.x, oy + p.y]; });
  };
  const note = [...document.querySelectorAll('[data-xploder-label="dimension:stack"]')].filter(vis)[0];
  const names = [...document.querySelectorAll('[data-xploder-lettering-layer-label],[data-xploder-label^="layer:"],[data-xploder-column-layer]')].filter(vis);
  const sat = (a, b) => { for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; const ax = y1 - y2, ay = x2 - x1; const pa = a.map(([x, y]) => x * ax + y * ay), pb = b.map(([x, y]) => x * ax + y * ay); if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false; } return true; };
  if (!note) return { note: null, names: names.length };
  const nq = quad(note); const hits = names.filter((e) => sat(nq, quad(e))).map((e) => ({ id: e.getAttribute('data-xploder-lettering-layer-label') ?? e.getAttribute('data-xploder-label') ?? e.getAttribute('data-xploder-column-layer'), text: e.textContent, quad: quad(e).map((p) => p.map(Math.round)) }));
  return { note: nq.map((p) => p.map(Math.round)), text: note.textContent, names: names.length, hits };
};
const out = [];
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) for (const scheme of ['light', 'dark']) for (const slug of ['websocket-inspector', 'jev-toolkit']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, colorScheme: scheme });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:4614/projects/${slug}`);
  await p.locator('[data-site-control="explore-3d"]').click();
  await p.waitForSelector('[data-xploder-ready="true"]');
  await p.waitForTimeout(2500);
  for (const [band, presses] of [['1x', 0], ['2x', 3], ['3x', 2]]) {
    for (let i = 0; i < presses; i++) { await p.locator('[data-xploder-state]').first().focus(); await p.keyboard.press('='); await p.waitForTimeout(150); }
    await p.waitForTimeout(1800);
    const zoom = await p.locator('[data-xploder-zoom]').first().getAttribute('data-xploder-zoom');
    const g = await p.evaluate(geom);
    out.push({ slug, w, scheme, band, zoom, ...g });
    console.log(slug, w, scheme, band, 'zoom', zoom, 'note', g.note ? JSON.stringify(g.note) : null, 'names', g.names, 'HITS', JSON.stringify(g.hits ?? []));
    if (g.hits?.length) await p.screenshot({ path: `${process.argv[2]}/.specify/features/engine-polish/evidence/RFC-screenshot-i05-${slug}-${w}-${scheme}-${band}.png` });
  }
  await ctx.close();
}
await b.close();
