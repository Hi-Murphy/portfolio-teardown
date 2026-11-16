import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire('<repo>/tools/perf/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (let r = 0; r < 4; r++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4616/projects/jev-toolkit');
  await page.locator('[data-site-control="explore-3d"]').click();
  await page.locator('[data-xploder-ready="true"]').waitFor();
  await page.waitForTimeout(2500);
  const dom = () => page.evaluate(() => { const w = document.querySelector('[data-xploder-lettering-on]'); return (w.querySelector('[data-xploder-overlay]')?.outerHTML ?? '') + (w.querySelector('[data-xploder-lettering-layer]')?.outerHTML ?? ''); });
  const h = async () => createHash('sha1').update(await dom()).digest('hex').slice(0, 8);
  const seq = [await h()];
  for (let t = 0; t < 4; t++) { await page.locator('[data-site-control="rotate-right"]').click(); await page.waitForTimeout(1800); seq.push(await h()); }
  const first = await dom(); 
  console.log(seq.join(' '), (first.match(/translate\([^)]*\)/) ?? [''])[0]);
  await ctx.close();
}
await browser.close();
