import { createRequire } from 'node:module';
const require = createRequire('<repo>/tools/perf/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (const [url, w, h, mobile] of [['http://127.0.0.1:4619/dev/engine?fixture=c&state=exploded', 390, 844, true], ['http://127.0.0.1:4618/', 768, 1024, false], ['http://127.0.0.1:4618/', 1440, 900, false], ['http://127.0.0.1:4618/', 390, 844, true], ['http://127.0.0.1:4618/projects/jev-toolkit', 390, 844, true], ['http://127.0.0.1:4619/dev/engine?fixture=a&state=exploded', 768, 1024, false], ['http://127.0.0.1:4619/dev/engine?fixture=a&state=exploded', 1440, 900, false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); await page.goto(url);
  if (url.includes('/projects/')) await page.locator('[data-site-control="explore-3d"]').click();
  await page.locator('[data-xploder-ready="true"]').first().waitFor({ timeout: 30000 });
  const size = await page.evaluate(() => { const c = document.querySelector('[data-xploder-lettering-on] canvas'); const r = c.getBoundingClientRect(); return [r.width, r.height]; });
  console.log(url.replace(/http:\/\/127.0.0.1:\d+/, ''), `${w}x${h}`, '→ canvas', size.join('x'));
  await ctx.close();
}
await browser.close();
