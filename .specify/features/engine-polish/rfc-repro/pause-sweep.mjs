import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/tools/perf/package.json');
const { chromium } = require('playwright');
const b = await chromium.launch();
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) for (const off of [50, 300, 600, 850]) for (const cpu of [1, 4]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  if (cpu > 1) { const s = await ctx.newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  await p.goto('http://127.0.0.1:4614/');
  await p.waitForSelector('[data-hero-phase="explode"]', { timeout: 60000 });
  await p.evaluate(() => {
    const root = document.querySelector('[data-site-hero]'); window.__m = [];
    new MutationObserver((list) => { const t = Math.round(performance.now()); let add = 0, rem = 0; for (const r of list) { if (r.type === 'attributes') window.__m.push([t, r.attributeName.replace('data-', ''), r.target.getAttribute(r.attributeName)]); for (const n of r.addedNodes) if (n instanceof Element && n.matches('[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]')) add++; for (const n of r.removedNodes) if (n instanceof Element && n.matches('[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]')) rem++; } if (add || rem) window.__m.push([t, 'labels', `+${add}-${rem}`]); }).observe(root, { subtree: true, attributes: true, childList: true, attributeFilter: ['data-xploder-state', 'data-hero-phase', 'data-hero-loop', 'data-xploder-zoom'] });
  });
  await p.waitForTimeout(off);
  const tp = await p.evaluate(() => performance.now());
  await p.getByRole('button', { name: /pause/i }).click();
  await p.waitForTimeout(5000);
  const tr = await p.evaluate(() => performance.now());
  await p.getByRole('button', { name: /play/i }).click();
  await p.waitForSelector('[data-hero-phase="capture"]', { timeout: 30000 });
  await p.waitForTimeout(300);
  const m = await p.evaluate(() => window.__m);
  const during = m.filter(([t]) => t > tp && t < tr); const after = m.filter(([t]) => t >= tr);
  const fmt = (xs, t0) => xs.map(([t, k, v]) => `${Math.round(t - t0)}:${k}=${v}`).join(' ');
  console.log(`${w} off=${off} cpu=${cpu} | paused: ${fmt(during, tp)} | resumed: ${fmt(after, tr)}`);
  await ctx.close();
}
await b.close();
