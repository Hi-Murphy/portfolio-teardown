import { createRequire } from 'node:module';
const require = createRequire(new URL("../../../tools/perf/package.json", import.meta.url));
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (const slug of ['jev-toolkit', 'websocket-inspector', 'agent-fleet']) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`http://localhost:4319/projects/${slug}`);
  await page.locator('button[aria-label^="Switch to "]').waitFor({ state: 'visible', timeout: 60000 });
  await page.keyboard.press('Tab');
  await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60000 });
  const info = await page.evaluate(() => [...document.querySelectorAll('[data-site-outline]')].map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { inCanvas: !!el.closest('canvas'), noscript: !!el.closest('noscript'), tabIndex: el.tabIndex, w: Math.round(r.width), h: Math.round(r.height), vis: cs.visibility, parentTag: el.parentElement?.tagName };
  }));
  const hits = [];
  for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); const a = await page.evaluate(() => { const el = document.activeElement; if (!el?.matches('[data-site-outline]')) return null; const r = el.getBoundingClientRect(); return { inCanvas: !!el.closest('canvas'), w: Math.round(r.width), h: Math.round(r.height) }; }); if (a) hits.push({ i, ...a }); }
  console.log(slug, 'outlines:', JSON.stringify(info), '| tab stops on outline:', JSON.stringify(hits));
}
await browser.close();
