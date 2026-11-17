import { createRequire } from 'node:module';
const require = createRequire('<repo>/tools/perf/package.json');
const { chromium } = require('playwright');
const { decodePng, compareRgba } = await import('<repo>/tools/perf/src/png.ts');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4616/projects/websocket-inspector');
await page.locator('[data-site-control="explore-3d"]').click();
await page.locator('[data-xploder-ready="true"]').waitFor();
await page.waitForTimeout(2500);
const shot = () => page.locator('[data-xploder-lettering-on]').first().screenshot();
const ext = () => page.evaluate(() => { const s = document.querySelector('[data-xploder-stage]'); return [s.getAttribute('data-xploder-scroll-extent'), s.scrollTop, s.scrollHeight, s.clientHeight]; });
for (let i = 0; i < 2; i++) { await page.locator('[data-site-control="zoom-in"]').click(); await page.waitForTimeout(1500); }
console.log('z2', await ext());
await page.evaluate(() => { const s = document.querySelector('[data-xploder-stage]'); s.scrollTop = 139; s.dispatchEvent(new Event('scroll')); });
await page.waitForTimeout(1000);
for (let t = 0; t < 3; t++) {
  await page.locator('[data-site-control="rotate-right"]').click(); await page.waitForTimeout(1500);
  const a = decodePng(await shot()); await page.waitForTimeout(1000); const b = decodePng(await shot());
  console.log('turn', t + 1, await ext(), 'same-state diff px', compareRgba(a, b).differingPixels ?? compareRgba(a, b));
}
await browser.close();
