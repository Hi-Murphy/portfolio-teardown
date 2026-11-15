import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/tools/perf/package.json');
const { chromium } = require('playwright');
const url = process.argv[3];
const b = await chromium.launch();
for (const [w, h] of [[360, 740], [390, 740], [390, 844], [412, 823]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { window.__s = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__s.push({ t: Math.round(e.startTime), v: e.value, input: e.hadRecentInput, src: e.sources.map((s) => `${JSON.stringify(s.previousRect.toJSON())}->${JSON.stringify(s.currentRect.toJSON())}`) }); }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(url); await p.waitForTimeout(2500);
  console.log(w, h, JSON.stringify(await p.evaluate(() => window.__s)));
  await ctx.close();
}
await b.close();
