// Diagnostic (not evidence): which label elements become visible during the hero zoomin tween at CPU x4.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const [, , repo, base, cpuArg = '4', phaseArg = 'zoomin'] = process.argv;
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(cpuArg) });
await page.addInitScript(() => {
  const vis = (el) => {
    if (el.getClientRects().length === 0) return false;
    let o = 1;
    for (let n = el; n instanceof Element; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility !== 'visible') return false;
      o *= Number(s.opacity);
    }
    return o > 0;
  };
  const cats = { label: '[data-xploder-label]', lettering: '[data-xploder-lettering]', layer: '[data-xploder-lettering-layer-label]' };
  window.__diag = { frames: [], phase: [] };
  const tick = (raf) => { const t = performance.now();
    const out = { t };
    for (const [k, sel] of Object.entries(cats)) {
      const els = [...document.querySelectorAll(sel)].filter(vis);
      out[k] = els.length;
      if (k === 'label') out.labelKinds = [...new Set(els.map((e) => (e.getAttribute('data-xploder-label') ?? '').split(':')[0]))].join(',');
    }
    const v = document.querySelector('[data-xploder-ready="true"]');
    out.zoom = v?.getAttribute('data-xploder-camera-zoom') ?? v?.querySelector('canvas')?.dataset?.xploderCameraZoom ?? null;
    const c = document.querySelector('[data-xploder-ready="true"] canvas');
    out.camZoom = c?.dataset?.xploderCameraZoom ?? null;
    out.lettering = v?.getAttribute('data-xploder-lettering') ?? null;
    out.phase = document.querySelector('[data-hero-phase]')?.getAttribute('data-hero-phase');
    window.__diag.frames.push(out);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.goto(`${base}/`);
await page.waitForFunction((p) => document.querySelector('[data-hero-phase]')?.getAttribute('data-hero-phase') === p, phaseArg, { timeout: 90000 });
await page.waitForTimeout(1500);
const d = await page.evaluate(() => window.__diag.frames);
const i0 = d.findIndex((f) => f.phase === phaseArg);
const t0 = d[i0].t;
for (const f of d.slice(Math.max(0, i0 - 2), i0 + 60)) console.log(`${(f.t - t0).toFixed(1).padStart(7)} ${f.phase.padEnd(7)} label=${String(f.label).padStart(3)} [${f.labelKinds}] lettering=${String(f.lettering)} letter=${f.lettering_count ?? ''}${f.lettering} layer=${f.layer} camZoom=${f.camZoom}`);
await browser.close();
