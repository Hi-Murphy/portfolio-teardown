import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/tools/perf/package.json');
const { chromium } = require('playwright');
const b = await chromium.launch();
for (const [w, h] of [[390, 844], [412, 823], [360, 740]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4614/'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const s = document.querySelector('[data-site-hero]'); const inner = s.querySelector(':scope > div.relative.z-10');
    const minH = getComputedStyle(s).minHeight; const secH = s.getBoundingClientRect().height;
    s.style.minHeight = '0px'; const natural = s.getBoundingClientRect().height; s.style.minHeight = '';
    const kids = [...inner.children].map((c) => Math.round(c.getBoundingClientRect().height));
    const fonts = [...document.fonts].map((f) => `${f.family}:${f.status}`).join(',');
    const lines = [...inner.querySelectorAll('h1, p')].map((e) => `${e.tagName}:${Math.round(e.getBoundingClientRect().height)}`).join(' ');
    return { minH, secH, natural, kids, lines, fonts };
  });
  console.log(w, h, JSON.stringify(r)); await ctx.close();
}
await b.close();
