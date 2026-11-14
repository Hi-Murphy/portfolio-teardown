import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/tools/perf/package.json');
const { chromium, firefox } = require('playwright');
const url = process.argv[2];
for (const [name, bt] of [['chromium', chromium], ['firefox', firefox]]) {
  const b = await bt.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url); await p.waitForSelector('[data-hero-loop="running"]', { timeout: 30000 }); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Pause animation', exact: true }).click();
  const t0 = Date.now(); const hero = p.locator('[data-home-section="hero"]'); const frames = [];
  for (const at of [250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 10000]) {
    await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    frames.push([at, await hero.screenshot()]);
  }
  const out = frames.map(([at, f], i) => `${at}ms${i ? (f.equals(frames[i - 1][1]) ? '=' : '≠') : ''}`).join(' ');
  console.log(name, b.version(), 'loop=', await p.locator('[data-hero-loop]').getAttribute('data-hero-loop'), out);
  await b.close();
}
