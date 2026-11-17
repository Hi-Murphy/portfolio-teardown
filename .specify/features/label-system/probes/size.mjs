import { createRequire } from 'node:module';
const require = createRequire('<repo>/tools/perf/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (let r = 0; r < 3; r++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4616/projects/jev-toolkit');
  await page.locator('[data-site-control="explore-3d"]').click();
  await page.locator('[data-xploder-ready="true"]').waitFor();
  const probe = () => page.evaluate(() => { const w = document.querySelector('[data-xploder-lettering-on]'); const c = w.querySelector('canvas'); const r = w.getBoundingClientRect(); const cr = c.getBoundingClientRect(); return { fonts: document.fonts.status, w: [r.x, r.y, r.width, r.height], c: [cr.width, cr.height, c.width, c.height], sy: scrollY }; });
  const samples = [await probe()];
  await page.waitForTimeout(500); samples.push(await probe());
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(3000); samples.push(await probe());
  console.log(JSON.stringify(samples));
  await ctx.close();
}
await browser.close();
