import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire('<repo>/tools/perf/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch();
async function run() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  const step = async (n) => { for (let k = 0; k < n; k++) { await page.clock.runFor(16); await page.evaluate(() => 0); } };
  await page.goto('http://127.0.0.1:4616/projects/websocket-inspector');
  const advanceUntil = async (pred, max = 400) => { for (let i = 0; i < max; i++) { if (await page.evaluate(pred)) return i; await page.clock.runFor(50); } throw new Error('advance timeout'); };
  await advanceUntil(() => !!document.querySelector('[data-site-control="explore-3d"]'));
  await page.locator('[data-site-control="explore-3d"]').click();
  await advanceUntil(() => !!document.querySelector('[data-xploder-ready="true"]'));
  await step(190);
  const ext = () => page.evaluate(() => { const s = document.querySelector('[data-xploder-stage]'); return [s.getAttribute('data-xploder-scroll-extent'), s.scrollTop]; });
  const dom = () => page.evaluate(() => { const w = document.querySelector('[data-xploder-lettering-on]'); return (w.querySelector('[data-xploder-overlay]')?.outerHTML ?? '') + (w.querySelector('[data-xploder-lettering-layer]')?.outerHTML ?? ''); });
  for (let i = 0; i < 2; i++) { await page.locator('[data-site-control="zoom-in"]').click(); await step(125); }
  await page.evaluate(() => { const s = document.querySelector('[data-xploder-stage]'); s.scrollTop = 139; s.dispatchEvent(new Event('scroll')); });
  await step(63);
  const out = [];
  for (let t = 0; t < 3; t++) {
    await page.locator('[data-site-control="rotate-right"]').click(); await step(125);
    await page.waitForTimeout(500);
    const png = await page.locator('[data-xploder-lettering-on]').first().screenshot();
    out.push([...(await ext()), createHash('sha1').update(await dom()).digest('hex').slice(0, 10), createHash('sha1').update(png).digest('hex').slice(0, 10)]);
  }
  await ctx.close();
  return out;
}
const a = await run(); const b = await run();
console.log(JSON.stringify(a)); console.log(JSON.stringify(b));
await browser.close();
